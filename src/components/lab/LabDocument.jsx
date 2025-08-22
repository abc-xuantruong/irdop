import React, { useState, useEffect, useContext } from 'react';
import {
	FaFileAlt,
	FaEye,
	FaSearch,
	FaSync,
	FaExternalLinkAlt,
	FaUser,
	FaUsers,
	FaPlay,
	FaClock,
	FaTable,
	FaPrint,
} from 'react-icons/fa';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../../contexts/GlobalContext';
import AnalysesExtract from './AnalysesExtract';

const LabDocument = () => {
	const { currentUser, setCurrentUser, fetchUser, getIdenByUid } = useContext(GlobalContext);

	// Utility functions
	const isAdmin = () => {
		return currentUser?.role?.staff_admin === true;
	};

	// Helper function to get identity name from document
	const getIdentityName = (doc) => {
		// List of possible UID fields to check
		const possibleUIDs = [
			doc.metadata?.submittedByUID,
			doc.metadata?.identityUID,
			doc.metadata?.authorUID,
			doc.metadata?.createdByUID,
			doc.metadata?.modifiedByUID,
			doc.identityUID,
			doc.authorUID,
			doc.createdByUID,
			doc.modifiedByUID,
		];

		// Find the first UID that has a corresponding identity name
		for (const uid of possibleUIDs) {
			if (uid && identityNames[uid]) {
				return identityNames[uid];
			}
		}

		// If no identity name found, return the first available UID or 'N/A'
		const firstUID = possibleUIDs.find((uid) => uid);
		return firstUID || 'N/A';
	};

	// Fetch identity name by UID
	const fetchIdentityName = async (identityUID) => {
		if (!identityUID || identityNames[identityUID]) {
			return identityNames[identityUID] || identityUID;
		}

		try {
			console.log('Calling getIdenByUid for:', identityUID);
			const identity = await getIdenByUid(identityUID);
			console.log('getIdenByUid response:', identity);
			if (identity && identity.identity_name) {
				setIdentityNames((prev) => ({
					...prev,
					[identityUID]: identity.identity_name,
				}));
				console.log('Successfully cached identity name:', identity.identity_name);
				return identity.identity_name;
			}
		} catch (error) {
			console.error('Error fetching identity:', error);
		}

		return identityUID; // Fallback to UID if failed
	};

	// State riêng cho document được chọn - CHỈ thay đổi khi user click chọn document khác
	const [selectedDocumentForPreview, setSelectedDocumentForPreview] = useState(null);
	const [selectedDocument, setSelectedDocument] = useState(null); // State hiển thị UI selection
	const [previewContent, setPreviewContent] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [lastSearchTerm, setLastSearchTerm] = useState(''); // Lưu search term đã được thực hiện
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingPreview, setIsLoadingPreview] = useState(false);
	const [mode, setMode] = useState('personal'); // 'personal' or 'all'
	const [showAnalysisExtract, setShowAnalysisExtract] = useState(false);
	const [analysisExtractDocument, setAnalysisExtractDocument] = useState(null); // Separate state for analysis modal
	const [identityNames, setIdentityNames] = useState({}); // Cache for identity names
	const [reportCache, setReportCache] = useState({}); // Cache for loaded reports

	// Load TinyMCE if not already loaded
	useEffect(() => {
		if (!window.tinymce) {
			const script = document.createElement('script');
			script.src = '/tinymce/tinymce.min.js';
			script.async = true;
			document.head.appendChild(script);
		}
	}, []);
	const [documents, setDocuments] = useState([]);
	const [documentStatus, setDocumentStatus] = useState('draft'); // 'draft' or 'published'
	const [isDraft, setIsDraft] = useState(true); // Toggle state for draft/published
	const [pagination, setPagination] = useState({
		currentPage: 1,
		itemsPerPage: 10,
		totalItems: 0,
		totalPages: 1,
	});

	// API constants
	const DRAFT_DOCS_API_ENDPOINT = 'https://red.irdop.org/v1/editor/lab_result_report/get_editor';
	const PUBLISHED_DOCS_API_ENDPOINT = 'https://red.irdop.org/v1/document/get_doc';

	// Show auto-hide message function
	const showAutoHideMessage = (message, type = 'info') => {
		// Remove existing message if any
		const existingMessage = document.getElementById('autoHideMessage');
		if (existingMessage) {
			existingMessage.remove();
		}

		// Create message element
		const messageDiv = document.createElement('div');
		messageDiv.id = 'autoHideMessage';
		messageDiv.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 12px 20px;
			border-radius: 6px;
			color: white;
			font-weight: 500;
			z-index: 10000;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			opacity: 0;
			transform: translateX(100%);
			transition: all 0.3s ease;
		`;

		// Set background color based on type
		switch (type) {
			case 'success':
				messageDiv.style.background = '#10b981';
				break;
			case 'error':
				messageDiv.style.background = '#ef4444';
				break;
			case 'warning':
				messageDiv.style.background = '#f59e0b';
				break;
			default:
				messageDiv.style.background = '#3b82f6';
		}

		messageDiv.textContent = message;
		document.body.appendChild(messageDiv);

		// Animate in
		setTimeout(() => {
			messageDiv.style.opacity = '1';
			messageDiv.style.transform = 'translateX(0)';
		}, 100);

		// Auto hide after 3 seconds
		setTimeout(() => {
			messageDiv.style.opacity = '0';
			messageDiv.style.transform = 'translateX(100%)';
			setTimeout(() => {
				if (messageDiv.parentNode) {
					messageDiv.remove();
				}
			}, 300);
		}, 3000);
	};

	// API helper functions
	const getCookie = (name) => {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(';').shift();
		return '';
	};

	// Use the imported apiPost function instead of custom implementation
	const apiPostLocal = async (url, body) => {
		try {
			const response = await apiPost(url, body);
			return {
				status: response.status,
				data: response.data,
			};
		} catch (error) {
			console.error('API Error:', error);
			throw error;
		}
	};

	// Format datetime to GMT+7
	const formatDateTimeGMT7 = (dateString) => {
		if (!dateString) return 'N/A';

		try {
			const date = new Date(dateString);
			const utc = date.getTime() + date.getTimezoneOffset() * 60000;
			const gmt7 = new Date(utc + 7 * 3600000);

			const hours = gmt7.getHours().toString().padStart(2, '0');
			const minutes = gmt7.getMinutes().toString().padStart(2, '0');
			const day = gmt7.getDate().toString().padStart(2, '0');
			const month = (gmt7.getMonth() + 1).toString().padStart(2, '0');
			const year = gmt7.getFullYear();

			return `${hours}:${minutes} ${day}/${month}/${year}`;
		} catch (error) {
			console.error('Error formatting date:', error);
			return 'N/A';
		}
	};

	// Helper function to preserve selected document after search - LOẠI BỎ
	// const preserveSelectedDocument = (newDocuments) => {
	// 	if (selectedDocument) {
	// 		// Find the document with the same ID in the new list
	// 		const foundDoc = newDocuments.find(doc => doc.id === selectedDocument.id);
	// 		if (foundDoc) {
	// 			// Chỉ update nếu có sự khác biệt thực sự để tránh re-render không cần thiết
	// 			const hasChanges = JSON.stringify(foundDoc.metadata) !== JSON.stringify(selectedDocument.metadata) ||
	// 							   foundDoc.fileId !== selectedDocument.fileId;
	// 			if (hasChanges) {
	// 				setSelectedDocument(foundDoc);
	// 			}
	// 		}
	// 		// If not found, keep the current selectedDocument (it might be from a different page/filter)
	// 	}
	// };

	// Load documents from API - CLEAN VERSION WITHOUT SELECTION LOGIC
	const loadDocuments = async (searchTermToUse = '', page = 1, currentMode = mode, status = documentStatus) => {
		try {
			setIsLoading(true);

			// Close analysis extract modal when loading new documents
			if (showAnalysisExtract) {
				setShowAnalysisExtract(false);
				setAnalysisExtractDocument(null);
			}

			// Nếu không phải admin, luôn dùng mode 'personal'
			const finalMode = isAdmin() ? currentMode : 'personal';

			// Choose API endpoint based on status
			const apiEndpoint = status === 'published' ? PUBLISHED_DOCS_API_ENDPOINT : DRAFT_DOCS_API_ENDPOINT;

			const requestBody = {
				searchTerm: searchTermToUse,
				page: page,
				mode: finalMode,
				status: 'submitted',
				classifierCode: ['NHAT_KY_THU_NGHIEM', 'BIEN_BAN_THU_NGHIEM'],
			};

			// Add status-specific fields
			if (status === 'published') {
				requestBody.sended = status;
			}

			const response = await apiPostLocal(apiEndpoint, requestBody);

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}

				// Transform API response to match our component structure
				const transformedDocuments = (result.result || []).map((doc) => ({
					id: doc.id,
					title: doc.metadata?.header?.title || doc.metadata?.templateName || 'Tài liệu không có tên',
					templateCode: doc.metadata?.templateId || 'N/A',
					lastModified: formatDateTimeGMT7(doc.modifiedAt),
					author: doc.metadata?.modifiedBy || doc.metadata?.authorName || 'N/A',
					status: status,
					createdAt: doc.createdAt,
					modifiedAt: doc.modifiedAt,
					authorName: doc.metadata?.authorName,
					modifiedBy: doc.metadata?.modifiedBy,
					metadata: doc.metadata || {},
					fileId: doc.fileId,
					originalData: doc,
				}));

				setDocuments(transformedDocuments);

				// Lưu search term đã thực hiện
				setLastSearchTerm(searchTermToUse);

				// Update selectedDocument for UI highlighting if same document exists in new results
				if (selectedDocument) {
					const foundDoc = transformedDocuments.find(doc => doc.id === selectedDocument.id);
					if (foundDoc) {
						setSelectedDocument(foundDoc); // Update UI selection với data mới
					} else {
						setSelectedDocument(null); // Clear UI selection nếu không tìm thấy
					}
				}

				// Update selectedDocumentForPreview nếu cùng document tồn tại trong kết quả mới
				if (selectedDocumentForPreview) {
					const foundPreviewDoc = transformedDocuments.find(doc => doc.id === selectedDocumentForPreview.id);
					if (foundPreviewDoc) {
						setSelectedDocumentForPreview(foundPreviewDoc); // Update preview document với data mới
					} else if (searchTermToUse !== lastSearchTerm) {
						// Chỉ clear khi search thay đổi, không clear khi chuyển mode/status
						setSelectedDocumentForPreview(null); // Clear preview selection nếu không tìm thấy
					}
				}

				// Fetch identity names for all possible identity UID fields
				const uniqueUIDs = [
					...new Set(
						transformedDocuments
							.flatMap((doc) => [
								doc.metadata?.submittedByUID,
								doc.metadata?.identityUID,
								doc.metadata?.authorUID,
								doc.metadata?.createdByUID,
								doc.metadata?.modifiedByUID,
								doc.identityUID,
								doc.authorUID,
								doc.createdByUID,
								doc.modifiedByUID,
							])
							.filter((uid) => uid && !identityNames[uid]),
					),
				];

				console.log('Found unique UIDs to fetch:', uniqueUIDs);
				console.log('Sample document metadata:', transformedDocuments[0]?.metadata);

				// Fetch identity names asynchronously
				if (uniqueUIDs.length > 0) {
					uniqueUIDs.forEach(async (uid) => {
						console.log('Fetching identity for UID:', uid);
						await fetchIdentityName(uid);
					});
				}
				setPagination({
					currentPage: page,
					itemsPerPage: result.pagination?.itemsPerPage || 10,
					totalItems: result.pagination?.totalItems || transformedDocuments.length,
					totalPages: result.pagination?.totalPages || Math.ceil(transformedDocuments.length / 10),
				});
			}
		} catch (error) {
			console.error('Error loading documents:', error);
			setDocuments([]);
		} finally {
			setIsLoading(false);
		}
	};

	// File preview functionality with metadata checking
	const handleFilePreview = async (fileRecord) => {
		try {
			// Nếu fileRecord là string (fileId), chuyển thành object
			let requestFileRecord = fileRecord;
			if (typeof fileRecord === 'string') {
				requestFileRecord = { id: fileRecord };
			}

			// Kiểm tra metadata của bản ghi trước
			const hasCompleteMetadata =
				requestFileRecord.originInfo?.fileName &&
				requestFileRecord.originInfo?.mimeType &&
				requestFileRecord.originInfo?.fileSize;

			// Nếu không có đủ metadata, kiểm tra fileId và tạo fileRecord mới
			if (!hasCompleteMetadata && (requestFileRecord.id || requestFileRecord.fileId)) {
				const fileId = requestFileRecord.id || requestFileRecord.fileId;
				console.log('Metadata không đầy đủ, sử dụng fileId để preview:', fileId);
				requestFileRecord = { id: fileId };
			}

			// Get download link using fileRecord
			const response = await apiPostLocal('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10, // 10 minutes
				mode: 'view',
				fileRecord: requestFileRecord,
			});

			if (response.status === 200 && response.data) {
				// Open file directly in new tab
				window.open(response.data, '_blank');
			} else {
				throw new Error('Không thể lấy link download');
			}
		} catch (error) {
			console.error('File preview failed:', error);
			alert('Không thể xem file. Vui lòng thử lại.');
		}
	};

	// Preview document functionality similar to Editor.jsx
	const previewDocumentReport = async (document) => {
		if (!document || !document.metadata) {
			showAutoHideMessage('Không có tài liệu để xem trước', 'warning');
			return;
		}

		const metadata = document.metadata;
		const header = metadata.header || {};
		const content = metadata.content || '';
		const footer = metadata.footer || '';

		// Kiểm tra xem có đủ dữ liệu để tạo HTML report không
		const hasHeaderContent = header && Object.keys(header).length > 0;
		const hasContent = content && content.trim() !== '';
		const hasFooter = footer && footer.trim() !== '';
		console.log('Document metadata:', { hasHeaderContent, hasContent, hasFooter });

		// Nếu không có đủ header và content, sử dụng file preview thay thế
		if (!hasHeaderContent && !hasContent) {
			showAutoHideMessage('Tài liệu không có đủ dữ liệu để tạo HTML preview, chuyển sang file preview...', 'info');

			// Kiểm tra xem có fileId không
			if (document.fileId) {
				await handleFilePreview(document.fileId);
				return;
			} else {
				showAutoHideMessage('Không có fileId để preview file', 'error');
				return;
			}
		}

		// Kiểm tra nếu đã có cache cho document này
		const cachedReport = reportCache[document.id];
		if (cachedReport) {
			showAutoHideMessage('Sử dụng preview đã có sẵn!', 'success');
			showPreviewPopup(cachedReport, {
				editId: document.id,
				metadata: {
					templateId: document.metadata.templateId,
					templateName: document.metadata.templateName,
					header: header,
					content: content,
					footer: metadata.footer || document.id,
					analysisIds: document.metadata.analysisIds || [],
					sampleUIDs: document.metadata.sampleUIDs || [],
					documentHTML: cachedReport,
				},
			});
			return;
		}

		try {
			showAutoHideMessage('Đang tạo HTML preview...', 'info');

			const analysisIds = metadata.analysisIds || [];
			const sampleUIDs = metadata.sampleUIDs || [];

			// Prepare report data with exact structure similar to Editor.jsx
			const reportData = {
				header: header,
				content: content,
				footer: metadata.footer || document.id, // Use metadata.footer if available
				analysisIds: analysisIds,
				sampleUIDs: sampleUIDs,
				classifierCode: metadata.classifierCode || 'BIEN_BAN_THU_NGHIEM', // Always include classifierCode
			};

			// Call the same API endpoint as in Editor.jsx
			const response = await apiPostLocal(
				'https://black.irdop.org/khsi19me/convert/lab_result_report_html',
				reportData,
			);

			if (response.status === 200 && response.data) {
				showAutoHideMessage('Đã tạo preview thành công!', 'success');

				// Save to cache
				const htmlResponse = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
				setReportCache((prev) => ({
					...prev,
					[document.id]: htmlResponse,
				}));

				// Show preview popup similar to Editor.jsx
				showPreviewPopup(htmlResponse, {
					editId: document.id,
					metadata: {
						templateId: metadata.templateId,
						templateName: metadata.templateName,
						header: header,
						content: content,
						footer: metadata.footer || document.id,
						analysisIds: analysisIds,
						sampleUIDs: sampleUIDs,
						documentHTML: htmlResponse,
					},
				});
			} else {
				throw new Error('Failed to create lab result report preview');
			}
		} catch (error) {
			console.error('Error creating preview:', error);
			showAutoHideMessage('Lỗi khi tạo preview: ' + error.message, 'error');
		}
	};

	// Preview Popup Function (similar to Editor.jsx)
	const showPreviewPopup = (htmlContent, documentData) => {
		// Remove existing popup if any
		const existingPopup = document.getElementById('previewPopupOverlay');
		if (existingPopup) {
			existingPopup.remove();
		}

		// Create popup overlay
		const overlay = document.createElement('div');
		overlay.id = 'previewPopupOverlay';
		overlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			background: rgba(0, 0, 0, 0.8);
			z-index: 10000;
			display: flex;
			align-items: center;
			justify-content: center;
		`;

		// Create popup container
		const popup = document.createElement('div');
		popup.style.cssText = `
			background: white;
			border-radius: 0;
			width: 100vw;
			height: 100vh;
			display: flex;
			flex-direction: column;
			box-shadow: none;
			overflow: hidden;
		`;

		// Create header with buttons
		const header = document.createElement('div');
		header.style.cssText = `
			padding: 16px 20px;
			border-bottom: 1px solid #e5e7eb;
			display: flex;
			justify-content: space-between;
			align-items: center;
			background: #f9fafb;
		`;

		const title = document.createElement('h3');
		title.textContent = 'Preview - ' + (documentData.metadata.header.title || 'Lab Result Report');
		title.style.cssText = `
			margin: 0;
			font-size: 18px;
			font-weight: 600;
			color: #374151;
		`;

		const buttonGroup = document.createElement('div');
		buttonGroup.style.cssText = `
			display: flex;
			gap: 12px;
		`;

		// Download button
		const downloadBtn = document.createElement('button');
		downloadBtn.textContent = 'Download HTML';
		downloadBtn.style.cssText = `
			padding: 8px 16px;
			background: #3b82f6;
			color: white;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			font-weight: 500;
			font-size: 14px;
			transition: background-color 0.2s;
		`;
		downloadBtn.onmouseover = () => (downloadBtn.style.background = '#2563eb');
		downloadBtn.onmouseout = () => (downloadBtn.style.background = '#3b82f6');
		downloadBtn.onclick = () => downloadDocumentHTML(htmlContent, documentData);

		// Print button
		const printBtn = document.createElement('button');
		printBtn.textContent = 'Print';
		printBtn.style.cssText = `
			padding: 8px 16px;
			background: #8b5cf6;
			color: white;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			font-weight: 500;
			font-size: 14px;
			transition: background-color 0.2s;
		`;
		printBtn.onmouseover = () => (printBtn.style.background = '#7c3aed');
		printBtn.onmouseout = () => (printBtn.style.background = '#8b5cf6');
		printBtn.onclick = () => printDocument(htmlContent, documentData);

		// Close button
		const closeBtn = document.createElement('button');
		closeBtn.textContent = '✕';
		closeBtn.style.cssText = `
			padding: 8px 12px;
			background: #ef4444;
			color: white;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			font-weight: bold;
			font-size: 16px;
			transition: background-color 0.2s;
		`;
		closeBtn.onmouseover = () => (closeBtn.style.background = '#dc2626');
		closeBtn.onmouseout = () => (closeBtn.style.background = '#ef4444');
		closeBtn.onclick = () => overlay.remove();

		buttonGroup.appendChild(downloadBtn);
		buttonGroup.appendChild(printBtn);
		buttonGroup.appendChild(closeBtn);

		header.appendChild(title);
		header.appendChild(buttonGroup);

		// Create content container for HTML
		const contentContainer = document.createElement('div');
		contentContainer.style.cssText = `
			width: 100%;
			height: 100%;
			border: none;
			flex: 1;
			overflow: auto;
			padding: 20px;
			font-family: 'Times New Roman', serif;
			font-size: 11px;
			line-height: 1.4;
			background: white;
		`;

		// Set content directly
		contentContainer.innerHTML = htmlContent;

		popup.appendChild(header);
		popup.appendChild(contentContainer);
		overlay.appendChild(popup);
		document.body.appendChild(overlay);

		// Close on overlay click
		overlay.addEventListener('click', function (e) {
			if (e.target === overlay) {
				overlay.remove();
			}
		});

		// Close on Escape key
		const handleEscape = (e) => {
			if (e.key === 'Escape') {
				overlay.remove();
				document.removeEventListener('keydown', handleEscape);
			}
		};
		document.addEventListener('keydown', handleEscape);
	};

	// Download document as HTML
	const downloadDocumentHTML = async (htmlContent, documentData) => {
		try {
			// Convert HTML to file and trigger download
			const blob = new Blob([htmlContent], { type: 'text/html' });
			const url = URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = `${documentData.metadata.header.title || 'Lab_Result_Report'}_${new Date().toLocaleDateString(
				'vi-VN',
			)}.html`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			showAutoHideMessage('Tải xuống thành công!', 'success');
		} catch (error) {
			console.error('Download error:', error);
			showAutoHideMessage('Lỗi khi tải xuống: ' + error.message, 'error');
		}
	};

	// Print document
	const printDocument = (htmlContent, documentData) => {
		try {
			// Create a new window for printing
			const printWindow = window.open('', '_blank', 'width=800,height=600');

			// Write the HTML content to the new window
			printWindow.document.open();
			printWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Print - ${documentData.metadata.header.title || 'Lab Result Report'}</title>
					<style>
						@media print {
							body { margin: 0; }
							@page { margin: 20mm; }
						}
						body {
							font-family: 'Times New Roman', serif;
							font-size: 11px;
							line-height: 1.4;
						}
					</style>
				</head>
				<body>
					${htmlContent}
				</body>
				</html>
			`);
			printWindow.document.close();

			// Wait for content to load then open print dialog
			printWindow.onload = function () {
				printWindow.focus();
				printWindow.print();
			};

			showAutoHideMessage('Mở hộp thoại in thành công!', 'success');
		} catch (error) {
			console.error('Print error:', error);
			showAutoHideMessage('Lỗi khi in: ' + error.message, 'error');
		}
	};

	// Analysis Match Table Component
	const AnalysisMatchTable = ({ data, onClose }) => {
		if (!data || data.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center h-64 text-gray-500">
					<FaTable className="w-16 h-16 mb-4 text-gray-300" />
					<p className="text-lg font-medium mb-2">Không có dữ liệu</p>
					<p className="text-sm">Không có kết quả phân tích khớp để hiển thị</p>
				</div>
			);
		}

		return (
			<div className="h-full flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
					<div className="flex items-center gap-2">
						<FaTable className="text-blue-600" />
						<h4 className="text-lg font-semibold text-gray-900">Dữ liệu chỉ tiêu trong app</h4>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
							<FaTable className="w-4 h-4" />
							<span className="font-medium">Tổng cộng: {data.length} kết quả</span>
						</div>
						<button
							onClick={onClose}
							className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white border-0 rounded-md cursor-pointer font-bold text-base transition-colors duration-200"
						>
							✕
						</button>
					</div>
				</div>

				{/* Table Container */}
				<div className="flex-1 overflow-auto p-4">
					<div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
						<table className="w-full border-collapse">
							<thead>
								<tr className="bg-gray-100 border-b border-gray-300">
									<th className="border-r border-gray-300 p-3 text-left font-semibold text-gray-700 text-sm">ID</th>
									<th className="border-r border-gray-300 p-3 text-left font-semibold text-gray-700 text-sm">Mã mẫu</th>
									<th className="border-r border-gray-300 p-3 text-left font-semibold text-gray-700 text-sm">
										Tên chỉ tiêu
									</th>
									<th className="border-r border-gray-300 p-3 text-left font-semibold text-gray-700 text-sm">
										Mã phương pháp
									</th>
									<th className="border-r border-gray-300 p-3 text-left font-semibold text-gray-700 text-sm">
										Kết quả
									</th>
									<th className="border-r border-gray-300 p-3 text-left font-semibold text-gray-700 text-sm">Đơn vị</th>
									<th className="p-3 text-left font-semibold text-gray-700 text-sm">Tham chiếu</th>
								</tr>
							</thead>
							<tbody>
								{data.map((item, index) => (
									<tr key={item.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
										<td className="border-r border-gray-200 p-3 text-sm text-gray-900">{item.id || '--'}</td>
										<td className="border-r border-gray-200 p-3 text-sm text-gray-900">{item.sampleUID || '--'}</td>
										<td className="border-r border-gray-200 p-3 text-sm text-gray-900">{item.parameterName || '--'}</td>
										<td className="border-r border-gray-200 p-3 text-sm text-gray-900">{item.protocolCode || '--'}</td>
										<td className="border-r border-gray-200 p-3 text-sm text-gray-900 font-medium">
											{item.resultValue || '--'}
										</td>
										<td className="border-r border-gray-200 p-3 text-sm text-gray-900">{item.resultUnit || '--'}</td>
										<td className="p-3 text-sm text-gray-900">{item.reference || '--'}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	};

	// Handle showing analysis extract component
	const handleShowAnalysisExtract = (doc) => {
		// Check both extractData.analyses and direct analyses property
		const hasExtractAnalyses = doc?.metadata?.extractData?.analyses;
		const hasDirectAnalyses = doc?.metadata?.analyses;

		if (!doc || (!hasExtractAnalyses && !hasDirectAnalyses)) {
			showAutoHideMessage('Không có dữ liệu chỉ tiêu để hiển thị', 'warning');
			return;
		}

		// Set the specific document for analysis extract
		setAnalysisExtractDocument(doc);
		setShowAnalysisExtract(true);
	};

	// Handle closing analysis extract
	const handleCloseAnalysisExtract = () => {
		setShowAnalysisExtract(false);
		setAnalysisExtractDocument(null);
	};

	// Load data on component mount
	useEffect(() => {
		// Đảm bảo mode là 'personal' nếu không phải admin
		const initialMode = isAdmin() ? mode : 'personal';
		if (initialMode !== mode) {
			setMode(initialMode);
		}

		loadDocuments('', 1, initialMode, documentStatus);

		// Cleanup function
		return () => {
			// Clean up global function
			if (window.handleFilePreviewFromDocument) {
				delete window.handleFilePreviewFromDocument;
			}
		};
	}, [currentUser]); // Add currentUser as dependency to re-run when user changes

	// Effect riêng để load preview CHỈ KHI selectedDocumentForPreview thay đổi
	useEffect(() => {
		if (selectedDocumentForPreview && selectedDocumentForPreview.id) {
			loadPreviewContent(selectedDocumentForPreview);
		} else {
			setPreviewContent('');
		}
	}, [selectedDocumentForPreview]); // CHỈ phụ thuộc vào selectedDocumentForPreview

	// Keep isDraft in sync with documentStatus
	useEffect(() => {
		setIsDraft(documentStatus === 'draft');
	}, [documentStatus]);

	// Refresh data - SIMPLE VERSION
	const refreshData = async () => {
		setIsLoading(true);
		try {
			await loadDocuments(lastSearchTerm, pagination.currentPage, mode, documentStatus);
		} catch (error) {
			console.error('Error refreshing data:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle document status change - SIMPLE VERSION
	const handleDocumentStatusChange = async (newStatus) => {
		if (newStatus === documentStatus) return; // No change needed

		setDocumentStatus(newStatus);
		setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page
		await loadDocuments(lastSearchTerm, 1, mode, newStatus);
	};

	// Handle toggle switch change
	const handleToggleChange = () => {
		const newIsDraft = !isDraft;
		setIsDraft(newIsDraft);
		const newStatus = newIsDraft ? 'draft' : 'published';
		handleDocumentStatusChange(newStatus);
	};

	// Handle mode change - SIMPLE VERSION
	const handleModeChange = async (newMode) => {
		// Nếu không phải admin, luôn dùng mode 'personal'
		if (!isAdmin()) {
			return;
		}

		if (newMode === mode) return; // No change needed

		setMode(newMode);
		setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page
		await loadDocuments(lastSearchTerm, 1, newMode, documentStatus);
	};

	// Handle search input changes - ISOLATED VERSION
	const handleSearchInputChange = (value) => {
		setSearchTerm(value);
		// Chỉ lưu giá trị, không load documents
	};

	// Execute search - SIMPLE VERSION
	const executeSearch = async () => {
		// Chỉ thực hiện search khi nhấn Enter và khác với search term hiện tại
		if (searchTerm !== lastSearchTerm) {
			await loadDocuments(searchTerm, 1);
		}
	};

	// Search on Enter key - UPDATED
	const handleSearchKeyPress = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			executeSearch();
		}
	};

	// Handle document click for preview - SIMPLE VERSION CHỈ CẬP NHẬT KHI KHÁC NHAU
	const handleDocumentClick = async (doc) => {
		// Close analysis extract modal when selecting a different document
		if (showAnalysisExtract && analysisExtractDocument?.id !== doc?.id) {
			setShowAnalysisExtract(false);
			setAnalysisExtractDocument(null);
		}

		// Update UI selection
		setSelectedDocument(doc);

		// CHỈ cập nhật selectedDocumentForPreview và load preview khi chọn document KHÁC
		if (selectedDocumentForPreview?.id !== doc?.id) {
			setSelectedDocumentForPreview(doc);
		}
	};

	// Load preview content - SEPARATED FUNCTION
	const loadPreviewContent = async (document) => {
		try {
			setIsLoadingPreview(true);

			// Create preview content từ document metadata - chỉ hiển thị mã mẫu thử
			const metadata = document.metadata || {};
			const sampleUIDs = metadata.sampleUIDs || [];

			// Generate document preview content - chỉ hiển thị mã mẫu thử
			const documentPreviewContent = `
				<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.6;">
					<!-- SAMPLE UIDs SECTION - Chỉ hiển thị mã mẫu thử -->
					${
						sampleUIDs.length > 0
							? `
					<div style="margin-bottom: 30px;">
						<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">DANH SÁCH MÃ MẪU THỬ</h4>
						<div style="margin-top: 10px; padding: 15px; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
							<div style="display: flex; flex-wrap: wrap; gap: 8px;">
								${sampleUIDs
									.map(
										(uid) => `
									<span style="background: #1e40af; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
										${uid}
									</span>
								`,
									)
									.join('')}
							</div>
							<p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
								Tổng số mẫu thử: <strong>${sampleUIDs.length}</strong>
							</p>
						</div>
					</div>
					`
							: `
					<div style="margin-bottom: 30px;">
						<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">DANH SÁCH MÃ MẪU THỬ</h4>
						<div style="margin-top: 10px; padding: 15px; background: #f9f9ff; border-radius: 6px; border-left: 4px solid #f59e0b; text-align: center;">
							<p style="margin: 0; color: #6b7280; font-style: italic;">Không có mã mẫu thử nào</p>
						</div>
					</div>
					`
					}
				</div>
			`;

			setPreviewContent(documentPreviewContent);

			// Expose file preview function to window for use in HTML content
			window.handleFilePreviewFromDocument = (fileId) => {
				handleFilePreview(fileId);
			};
		} catch (error) {
			console.error('Error loading preview:', error);
			setPreviewContent('<p>Lỗi khi tải nội dung xem trước.</p>');
		} finally {
			setIsLoadingPreview(false);
		}
	};

	// Component ReportDetail để thay thế iframe - sử dụng React.memo để tránh re-render không cần thiết
	const ReportDetail = React.memo(
		({ document }) => {
			const [isLoading, setIsLoading] = useState(false);
			const [error, setError] = useState(null);
			const [filePreviewUrl, setFilePreviewUrl] = useState(null);
			const [isFilePreview, setIsFilePreview] = useState(false);

			// Lấy báo cáo từ cache hoặc state
			const reportHtml = reportCache[document?.id] || '';

			const loadFilePreview = async () => {
				if (!document || !document.fileId) {
					setError('Không có fileId để tải file preview');
					return;
				}

				setIsLoading(true);
				setError(null);
				setIsFilePreview(true);

				try {
					// Sử dụng API file preview thay vì HTML generation
					const response = await apiPostLocal('https://red.irdop.org/v1/file/get/download_link', {
						expiry: 60 * 10, // 10 minutes
						mode: 'view',
						fileRecord: { id: document.fileId },
					});

					if (response.status === 200 && response.data) {
						setFilePreviewUrl(response.data);
					} else {
						throw new Error('Không thể lấy link preview file');
					}
				} catch (error) {
					console.error('File preview failed:', error);
					setError('Lỗi khi tải file preview: ' + error.message);
				} finally {
					setIsLoading(false);
				}
			};

			const loadReport = async () => {
				if (!document || !document.metadata) {
					setError('Không có dữ liệu tài liệu');
					return;
				}

				// Kiểm tra nếu báo cáo cho document này đã được tải rồi
				if (reportCache[document.id]) {
					return; // Không tải lại nếu đã có dữ liệu cho document này
				}

				const metadata = document.metadata;
				const header = metadata.header || {};
				const content = metadata.content || '';
				const footer = metadata.footer || '';

				// Kiểm tra xem có đủ dữ liệu để tạo HTML report không
				const hasHeaderContent = header && Object.keys(header).length > 0;
				const hasContent = content && content.trim() !== '';
				const hasFooter = footer && footer.trim() !== '';

				// Nếu không có đủ header và content, chuyển sang file preview
				if (!hasContent) {
					console.log('Không có đủ metadata, chuyển sang file preview cho document:', document.id);
					await loadFilePreview();
					return;
				}

				setIsLoading(true);
				setError(null);
				setIsFilePreview(false);

				try {
					const analysisIds = metadata.analysisIds || [];
					const sampleUIDs = metadata.sampleUIDs || [];

					// Prepare report data
					const reportData = {
						header: header,
						content: content,
						footer: metadata.footer || document.id,
						analysisIds: analysisIds,
						sampleUIDs: sampleUIDs,
						classifierCode: metadata.classifierCode || 'BIEN_BAN_THU_NGHIEM', // Always include classifierCode
					};

					const response = await apiPostLocal(
						'https://black.irdop.org/khsi19me/convert/lab_result_report_html',
						reportData,
					);

					if (response.status === 200 && response.data) {
						const htmlResponse = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
						// Lưu vào cache
						setReportCache((prev) => ({
							...prev,
							[document.id]: htmlResponse,
						}));
					} else {
						throw new Error('Không thể tải báo cáo từ server');
					}
				} catch (error) {
					console.error('Error loading report:', error);
					setError('Lỗi khi tải báo cáo: ' + error.message);
				} finally {
					setIsLoading(false);
				}
			};

			useEffect(() => {
				// Reset states khi document thay đổi
				setFilePreviewUrl(null);
				setIsFilePreview(false);
				setError(null);

				// Chỉ tải nếu document tồn tại, có ID, và chưa có trong cache
				if (document && document.id && !reportCache[document.id]) {
					loadReport();
				}
			}, [document?.id]); // Chỉ theo dõi document.id, không theo dõi reportCache để tránh re-render không cần thiết

			if (isLoading) {
				return (
					<div className="border-t border-gray-200 pt-6">
						<h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<FaPlay className="text-green-600" />
							{isFilePreview ? 'File Preview' : 'Báo cáo chi tiết'}
						</h4>
						<div className="border border-gray-300 rounded-lg p-8 text-center">
							<div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
							<p className="text-gray-600">{isFilePreview ? 'Đang tải file preview...' : 'Đang tải báo cáo...'}</p>
						</div>
					</div>
				);
			}

			if (error) {
				const isMetadataError = error.includes('không có đủ dữ liệu để tạo HTML preview');
				return (
					<div className="border-t border-gray-200 pt-6">
						<h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<FaPlay className="text-green-600" />
							Báo cáo chi tiết
						</h4>
						<div className="border border-red-300 rounded-lg p-8 text-center bg-red-50">
							<p className="text-red-600 mb-4">❌ {error}</p>
							<div className="flex gap-2 justify-center">
								{isMetadataError && document.fileId && (
									<button
										onClick={() => handleFilePreview(document.fileId)}
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
									>
										Xem file gốc
									</button>
								)}
								{!isMetadataError && (
									<button
										onClick={loadReport}
										className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
									>
										Thử lại
									</button>
								)}
							</div>
						</div>
					</div>
				);
			}

			return (
				<div className="border-t border-gray-200 pt-6">
					<h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<FaPlay className="text-green-600" />
						{isFilePreview ? 'File Preview' : 'Báo cáo chi tiết'}
					</h4>
					<div className="border border-gray-300 rounded-lg overflow-hidden">
						{isFilePreview && filePreviewUrl ? (
							<iframe
								src={filePreviewUrl}
								className="w-full min-h-[500px] border-0"
								title="File Preview"
								style={{ height: '70vh' }}
							/>
						) : (
							<div
								className="w-full min-h-[500px] p-4 bg-white overflow-auto custom-scrollbar text-start"
								style={{
									fontFamily: "'Times New Roman', serif",
									fontSize: '11px',
									lineHeight: '1.4',
								}}
								dangerouslySetInnerHTML={{ __html: reportHtml }}
							/>
						)}
					</div>
				</div>
			);
		},
		(prevProps, nextProps) => {
			// Chỉ re-render nếu document.id thay đổi
			return prevProps.document?.id === nextProps.document?.id;
		},
	);

	// Generate smart pagination numbers
	const getSmartPaginationNumbers = (currentPage, totalPages) => {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const pages = [];
		pages.push(1);

		if (currentPage > 4) {
			pages.push('...');
		}

		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);

		for (let i = start; i <= end; i++) {
			if (!pages.includes(i)) {
				pages.push(i);
			}
		}

		if (currentPage < totalPages - 3) {
			pages.push('...');
		}

		if (!pages.includes(totalPages) && totalPages > 1) {
			pages.push(totalPages);
		}

		return pages;
	};

	// Page change handler - SIMPLE VERSION
	const handlePageChange = async (newPage) => {
		setPagination((prev) => ({ ...prev, currentPage: newPage }));
		await loadDocuments(lastSearchTerm, newPage, mode, documentStatus);
	};

	// Remove client-side filtering since we now search via API
	// const filteredDocuments = documents;

	return (
		<>
			<style>
				{`
					/* Custom Scrollbar */
					.custom-scrollbar::-webkit-scrollbar {
						width: 6px;
					}
					.custom-scrollbar::-webkit-scrollbar-track {
						background: #f1f5f9;
						border-radius: 6px;
					}
					.custom-scrollbar::-webkit-scrollbar-thumb {
						background: #cbd5e1;
						border-radius: 6px;
					}
					.custom-scrollbar::-webkit-scrollbar-thumb:hover {
						background: #94a3b8;
					}
				`}
			</style>

			{/* Page Header */}
			<div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
						<FaFileAlt className="text-blue-600" />
						Tài liệu - Văn bản
					</h1>
					<button
						onClick={refreshData}
						disabled={isLoading}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						title="Làm mới dữ liệu"
					>
						<FaSync className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
						Làm mới
					</button>
				</div>
			</div>

			<div className="w-full flex gap-6" style={{ height: 'calc(100vh - 140px)', minHeight: '600px' }}>
				{/* Cột trái: Danh sách tài liệu đã phát hành */}
				<div className="w-1/3 flex flex-col gap-4 h-full min-w-[400px]">
					<div className="bg-white rounded-xl shadow-sm border p-6 flex-1 flex flex-col min-h-0">
						<div className="flex items-center justify-between mb-4 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaClock className="text-blue-600" />
								{documentStatus === 'published' ? 'Tài liệu đã phát hành' : 'Tài liệu chưa duyệt'}
								{isLoading && (
									<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
								)}
							</h3>

							{/* Document Status Toggle */}
							<label className="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									checked={isDraft}
									onChange={handleToggleChange}
									className="sr-only"
									disabled={isLoading}
								/>
								<div className="w-40 h-8 bg-gray-200 rounded-full transition-all duration-300 ease-in-out relative border border-gray-300 overflow-hidden">
									{/* Sliding background */}
									<div
										className={`absolute top-0 h-full w-1/2 bg-blue-500 rounded-full transition-all duration-300 ease-in-out
											${isDraft ? 'left-0' : 'left-1/2'}`}
									></div>

									{/* DRAFT text */}
									<div className="absolute left-0 w-1/2 h-full flex items-center justify-center">
										<span
											className={`text-xs font-medium transition-all duration-300 ease-in-out
												${isDraft ? 'text-white' : 'text-gray-600'}`}
										>
											PENDING
										</span>
									</div>

									{/* PUBLISHED text */}
									<div className="absolute right-0 w-1/2 h-full flex items-center justify-center">
										<span
											className={`text-xs font-medium transition-all duration-300 ease-in-out
												${!isDraft ? 'text-white' : 'text-gray-600'}`}
										>
											PUBLISHED
										</span>
									</div>
								</div>
							</label>
						</div>

						{/* Mode Toggle Section - Chỉ hiển thị cho admin */}
						{isAdmin() && (
							<div className="flex items-center justify-between mb-4 flex-shrink-0">
								<span className="text-sm font-medium text-gray-700">Phạm vi hiển thị:</span>
								<div className="flex items-center gap-2">
									<button
										onClick={() => handleModeChange('personal')}
										disabled={isLoading}
										className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
											mode === 'personal' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
										}`}
										title="Chế độ cá nhân - chỉ hiển thị tài liệu của bạn"
									>
										<FaUser className="w-3 h-3" />
										Cá nhân
									</button>
									<button
										onClick={() => handleModeChange('all')}
										disabled={isLoading}
										className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
											mode === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
										}`}
										title="Chế độ toàn bộ - hiển thị tất cả tài liệu"
									>
										<FaUsers className="w-3 h-3" />
										Toàn bộ
									</button>
								</div>
							</div>
						)}

						<div className="flex-shrink-0">
							<div className="relative mb-3">
								<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Tìm tài liệu... (Nhấn Enter để tìm kiếm)"
									value={searchTerm}
									onChange={(e) => handleSearchInputChange(e.target.value)}
									onKeyPress={handleSearchKeyPress}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
								/>
							</div>

							{/* Pagination */}
							{pagination.totalPages > 1 && (
								<div className="flex items-center justify-center pb-2">
									<div className="flex items-center gap-1 flex-wrap justify-center">
										<button
											onClick={() => handlePageChange(pagination.currentPage - 1)}
											disabled={pagination.currentPage === 1}
											className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Trước
										</button>
										{getSmartPaginationNumbers(pagination.currentPage, pagination.totalPages).map((page, index) => (
											<span key={index}>
												{page === '...' ? (
													<span className="px-2 py-1 text-xs text-gray-500">...</span>
												) : (
													<button
														onClick={() => handlePageChange(page)}
														className={`px-2 py-1 text-xs border rounded ${
															page === pagination.currentPage
																? 'bg-blue-500 text-white border-blue-500'
																: 'border-gray-300 hover:bg-gray-50'
														}`}
													>
														{page}
													</button>
												)}
											</span>
										))}
										<button
											onClick={() => handlePageChange(pagination.currentPage + 1)}
											disabled={pagination.currentPage === pagination.totalPages}
											className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Sau
										</button>
									</div>
								</div>
							)}
						</div>

						<div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
							{isLoading ? (
								<div className="flex justify-center items-center h-32">
									<div className="text-gray-500">Đang tải...</div>
								</div>
							) : documents.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-32 text-gray-500">
									<FaFileAlt className="w-8 h-8 mb-2 text-gray-300" />
									<div className="text-sm">
										{documentStatus === 'published'
											? mode === 'personal'
												? 'Không có tài liệu đã phát hành cá nhân nào'
												: 'Không có tài liệu đã phát hành nào'
											: mode === 'personal'
											? 'Không có tài liệu nháp cá nhân nào'
											: 'Không có tài liệu nháp nào'}
									</div>
									<div className="text-xs mt-1">Nhấn Enter để tìm kiếm với từ khóa mới</div>
								</div>
							) : (
								<div className="space-y-3">
									{documents.map((doc) => (
										<div
											key={doc.id}
											onClick={() => handleDocumentClick(doc)}
											className={`p-4 pb-3 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-green-300 ${
												selectedDocument?.id === doc.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
											}`}
										>
											<div className="relative">
												{/* Header info section with code, identity, date */}
												<div className="flex items-center justify-between text-xs text-start mb-2">
													<div className="text-gray-600 px-2 py-1 rounded">Mã tài liệu: {doc.id}</div>
													<div className="text-gray-500">{getIdentityName(doc)}</div>
													<div className="text-gray-500">{doc.lastModified}</div>
												</div>{' '}
												{/* Title Section */}
												<div className="flex items-center gap-2 mb-2">
													<FaFileAlt className="text-gray-500 flex-shrink-0" />
													<span className="font-medium text-gray-900 text-sm leading-tight text-start">
														{doc.metadata?.header?.title || doc.title}
													</span>
													{(doc.metadata?.extractData?.analyses || doc.metadata?.analyses) && (
														<FaTable className="text-blue-500 w-3 h-3 flex-shrink-0" title="Có dữ liệu chỉ tiêu" />
													)}
												</div>
												{/* Sample UIDs Section - Display up to 5 */}
												{doc.metadata?.sampleUIDs && doc.metadata.sampleUIDs.length > 0 && (
													<div className="mb-0">
														<div className="flex flex-wrap gap-1">
															{doc.metadata.sampleUIDs.slice(0, 5).map((uid, index) => (
																<span
																	key={index}
																	className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
																>
																	{uid}
																</span>
															))}
															{doc.metadata.sampleUIDs.length > 5 && (
																<span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
																	+{doc.metadata.sampleUIDs.length - 5}
																</span>
															)}
														</div>
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Cột phải: Preview */}
				<div className="flex-1 flex flex-col h-full min-h-0" style={{ minWidth: '500px' }}>
					<div className="bg-white rounded-xl shadow-sm border h-full flex flex-col min-h-0">
						{/* Header với tiêu đề và nút */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaEye className="text-purple-600" />
								Xem trước
							</h3>
							<div className="flex gap-3">
								{selectedDocumentForPreview &&
									(selectedDocumentForPreview.metadata?.extractData?.analyses || selectedDocumentForPreview.metadata?.analyses) && (
										<button
											onClick={() => handleShowAnalysisExtract(selectedDocumentForPreview)}
											className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
											title="Xem dữ liệu chỉ tiêu"
										>
											<FaTable className="w-3 h-3" />
											Duyệt kết quả
										</button>
									)}
								{selectedDocumentForPreview && (
									<button
										onClick={() => previewDocumentReport(selectedDocumentForPreview)}
										className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
										title="In báo cáo"
									>
										<FaPrint className="w-3 h-3" />
										Print
									</button>
								)}
								{/* Removed View File Button */}
							</div>
						</div>

						{/* Nội dung xem trước */}
						<div className="flex-1 p-4 overflow-auto custom-scrollbar min-h-0">
							{selectedDocumentForPreview || previewContent ? (
								<div className="bg-gray-50 rounded-lg p-4 h-full">
									<div className="bg-white rounded-lg shadow-sm h-full overflow-auto custom-scrollbar space-y-6">
										{/* Hiển thị preview mã mẫu thử */}
										<div dangerouslySetInnerHTML={{ __html: previewContent }} />

										{/* Hiển thị báo cáo chi tiết từ API */}
										{selectedDocumentForPreview && <ReportDetail document={selectedDocumentForPreview} />}
									</div>
								</div>
							) : (
								<div className="flex items-center justify-center h-full text-gray-500">
									<div className="text-start">
										<FaFileAlt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
										<p className="text-lg font-medium mb-2">Chưa chọn tài liệu</p>
										<p className="text-sm">Vui lòng chọn một tài liệu từ danh sách bên trái để xem trước</p>
										<div className="mt-4 p-3 bg-blue-50 rounded-lg">
											<p className="text-sm text-blue-700">
												<strong>Chế độ hiện tại:</strong>{' '}
												{isAdmin() ? (mode === 'personal' ? 'Cá nhân' : 'Toàn bộ') : 'Cá nhân'}
											</p>
											<p className="text-sm text-blue-700 mt-1">
												<strong>Loại tài liệu:</strong> {documentStatus === 'published' ? 'Đã phát hành' : 'Nháp'}
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Analysis Extract Modal */}
			{showAnalysisExtract && analysisExtractDocument && (
				<AnalysesExtract
					key={analysisExtractDocument.id} // Add key to force re-render
					document={analysisExtractDocument}
					showAnalysisExtractInstead={true}
					editId={analysisExtractDocument.id}
					onClose={handleCloseAnalysisExtract}
				/>
			)}
		</>
	);
};

export default LabDocument;
