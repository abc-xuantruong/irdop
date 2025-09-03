import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import {
	FaFileAlt,
	FaEye,
	FaSearch,
	FaSync,
	FaUser,
	FaUsers,
	FaPlay,
	FaClock,
	FaTable,
	FaPrint,
	FaDatabase,
} from 'react-icons/fa';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../../contexts/GlobalContext';
import AnalysesExtract from './AnalysesExtract';

const LabDocument = () => {
	const { currentUser, getIdenByUid } = useContext(GlobalContext);

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

	// STATES TÁCH BIỆT HOÀN TOÀN:
	// - selectedDocument: CHỈ để highlight UI trong danh sách (có thể bị clear khi search)
	// - selectedDocumentForPreview: CHỈ để preview, KHÔNG BAO GIỜ bị ảnh hưởng bởi search
	const [selectedDocumentForPreview, setSelectedDocumentForPreview] = useState(null); // PREVIEW STATE - TÁCH BIỆT
	const [selectedDocument, setSelectedDocument] = useState(null); // UI SELECTION STATE - có thể thay đổi theo search
	const [previewContent, setPreviewContent] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [lastSearchTerm, setLastSearchTerm] = useState(''); // Lưu search term đã được thực hiện
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingPreview, setIsLoadingPreview] = useState(false);
	const [mode, setMode] = useState('all'); // 'personal' or 'all'
	const [showAnalysisExtract, setShowAnalysisExtract] = useState(false);
	const [analysisExtractDocument, setAnalysisExtractDocument] = useState(null); // Separate state for analysis modal
	const [identityNames, setIdentityNames] = useState({}); // Cache for identity names
	const [reportCache, setReportCache] = useState({}); // Cache for loaded reports
	const [pendingDocumentType, setPendingDocumentType] = useState('lab_reports'); // 'lab_reports' or 'documents'
	const [showDocumentTypeDropdown, setShowDocumentTypeDropdown] = useState(false); // State cho dropdown
	const [showExtractedData, setShowExtractedData] = useState(false); // State cho hiển thị dữ liệu trích xuất

	// Debounce timeout for search
	const [searchTimeout, setSearchTimeout] = useState(null);

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

	// Load documents from API - TÁCH BIỆT HOÀN TOÀN VỚI PREVIEW LOGIC
	const loadDocuments = async (
		searchTermToUse = '',
		page = 1,
		currentMode = mode,
		status = documentStatus,
		docType = pendingDocumentType,
	) => {
		try {
			setIsLoading(true);

			console.log('📚 Loading documents:', {
				searchTermToUse,
				page,
				currentMode,
				status,
				docType,
				currentSelectedDocumentForPreview: selectedDocumentForPreview?.id,
			});

			// Close analysis extract modal when loading new documents
			if (showAnalysisExtract) {
				setShowAnalysisExtract(false);
				setAnalysisExtractDocument(null);
			}

			// Nếu không phải admin, luôn dùng mode 'personal'
			const finalMode = isAdmin() ? currentMode : 'personal';

			// Choose API endpoint and parameters based on status and document type
			let apiEndpoint, requestBody;

			if (status === 'published') {
				apiEndpoint = PUBLISHED_DOCS_API_ENDPOINT;
				requestBody = {
					searchTerm: searchTermToUse,
					page: page,
					mode: finalMode,
					sended: status,
					classifierCode: ['NHAT_KY_THU_NGHIEM', 'BIEN_BAN_THU_NGHIEM'],
				};
			} else {
				// For draft status, check document type
				if (docType === 'documents') {
					// Use get_doc API for documents with pendingApproval status
					apiEndpoint = PUBLISHED_DOCS_API_ENDPOINT;
					requestBody = {
						searchTerm: searchTermToUse,
						page: page,
						mode: finalMode,
						status: 'pendingApproval',
						classifierCode: ['NHAT_KY_THU_NGHIEM', 'BIEN_BAN_THU_NGHIEM'],
					};
				} else {
					// Use get_editor API for lab reports with submitted status
					apiEndpoint = DRAFT_DOCS_API_ENDPOINT;
					requestBody = {
						searchTerm: searchTermToUse,
						page: page,
						mode: finalMode,
						status: 'submitted',
						classifierCode: ['NHAT_KY_THU_NGHIEM', 'BIEN_BAN_THU_NGHIEM'],
					};
				}
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
					const foundDoc = transformedDocuments.find((doc) => doc.id === selectedDocument.id);
					if (foundDoc) {
						setSelectedDocument(foundDoc); // Update UI selection với data mới
					} else {
						setSelectedDocument(null); // Clear UI selection nếu không tìm thấy
					}
				}

				// KHÔNG BAO GIỜ CLEAR selectedDocumentForPreview khi search
				// Preview document sẽ được giữ nguyên bất kể search thế nào
				// Chỉ update selectedDocumentForPreview nếu cùng document vẫn tồn tại và có thay đổi metadata
				if (selectedDocumentForPreview) {
					const foundPreviewDoc = transformedDocuments.find((doc) => doc.id === selectedDocumentForPreview.id);
					if (foundPreviewDoc) {
						// CHỈ update nếu có sự khác biệt thực sự trong metadata để tránh re-render preview
						const hasMetadataChanges =
							JSON.stringify(foundPreviewDoc.metadata) !== JSON.stringify(selectedDocumentForPreview.metadata) ||
							foundPreviewDoc.fileId !== selectedDocumentForPreview.fileId;
						if (hasMetadataChanges) {
							console.log('📝 Updating selectedDocumentForPreview due to metadata changes');
							setSelectedDocumentForPreview(foundPreviewDoc); // Update preview document khi có thay đổi thực sự
						} else {
							console.log('✅ selectedDocumentForPreview unchanged - no metadata changes');
						}
					} else {
						console.log('ℹ️ selectedDocumentForPreview not found in new search results, but keeping it');
						// KHÔNG CLEAR - giữ nguyên selectedDocumentForPreview ngay cả khi không tìm thấy trong kết quả search
						// User có thể đang xem document từ trang khác hoặc từ search term khác
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
		if (!doc) {
			showAutoHideMessage('Không có tài liệu để xử lý', 'warning');
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

		loadDocuments('', 1, initialMode, documentStatus, pendingDocumentType);
		console.log('Component mounted, loading documents with mode:', initialMode);
		// Cleanup function
		return () => {
			// Clean up global function
			if (window.handleFilePreviewFromDocument) {
				delete window.handleFilePreviewFromDocument;
			}
			// Cleanup timeout khi component unmount
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		};
	}, [currentUser]); // Add currentUser as dependency to re-run when user changes

	// Cleanup timeout khi component unmount
	useEffect(() => {
		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		};
	}, [searchTimeout]);

	// Effect riêng để load preview - HOÀN TOÀN TÁCH BIỆT VỚI SEARCH
	useEffect(() => {
		console.log('🎯 Preview useEffect triggered:', {
			selectedDocumentId: selectedDocumentForPreview?.id,
			hasPreviewContent: Boolean(previewContent),
			currentSearchTerm: searchTerm,
			lastSearchTerm,
		});

		if (selectedDocumentForPreview && selectedDocumentForPreview.id) {
			// Kiểm tra xem có thực sự cần load preview mới không
			const needsReload =
				!previewContent ||
				previewContent.includes('Không có mã mẫu thử nào') ||
				!previewContent.includes(selectedDocumentForPreview.id);

			console.log('🔍 Preview reload check:', {
				needsReload,
				hasPreviewContent: Boolean(previewContent),
				previewContainsDocId: previewContent.includes(selectedDocumentForPreview.id),
			});

			if (needsReload) {
				console.log('🔄 Loading preview content for document:', selectedDocumentForPreview.id);
				loadPreviewContent(selectedDocumentForPreview);
			} else {
				console.log('✅ Preview content already loaded for document:', selectedDocumentForPreview.id);
			}
		} else {
			console.log('❌ No selectedDocumentForPreview, clearing preview content');
			setPreviewContent('');
		}
	}, [selectedDocumentForPreview?.id]); // CHỈ phụ thuộc vào ID của document - KHÔNG phụ thuộc vào search

	// Keep isDraft in sync with documentStatus
	useEffect(() => {
		setIsDraft(documentStatus === 'draft');
	}, [documentStatus]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showDocumentTypeDropdown && !event.target.closest('.relative')) {
				setShowDocumentTypeDropdown(false);
			}
		};

		if (showDocumentTypeDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showDocumentTypeDropdown]);

	// Refresh data - SIMPLE VERSION
	const refreshData = async () => {
		setIsLoading(true);
		try {
			await loadDocuments(lastSearchTerm, pagination.currentPage, mode, documentStatus, pendingDocumentType);
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
		await loadDocuments(lastSearchTerm, 1, mode, newStatus, pendingDocumentType);
	};

	// Handle pending document type change
	const handlePendingDocumentTypeChange = async (newType) => {
		if (newType === pendingDocumentType) return; // No change needed

		setPendingDocumentType(newType);
		setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page
		await loadDocuments(lastSearchTerm, 1, mode, documentStatus, newType);
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
		await loadDocuments(lastSearchTerm, 1, newMode, documentStatus, pendingDocumentType);
	};

	// Handle search input changes - DEBOUNCED VERSION
	const handleSearchInputChange = (value) => {
		setSearchTerm(value);

		// Clear existing timeout
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Set new timeout để tránh re-render liên tục
		const timeout = setTimeout(() => {
			// Có thể thêm logic preview optimization ở đây nếu cần
			console.log('Search term stabilized:', value);
		}, 300); // 300ms debounce

		setSearchTimeout(timeout);
	};

	// Execute search - TÁCH BIỆT HOÀN TOÀN VỚI PREVIEW
	const executeSearch = async () => {
		console.log('🔍 Execute search triggered:', {
			searchTerm,
			lastSearchTerm,
			currentSelectedDocumentForPreview: selectedDocumentForPreview?.id,
		});

		// Chỉ thực hiện search khi nhấn Enter và khác với search term hiện tại
		if (searchTerm !== lastSearchTerm) {
			console.log('🚀 Performing search with term:', searchTerm);
			console.log('📌 Preview document before search:', selectedDocumentForPreview?.id);

			await loadDocuments(searchTerm, 1, mode, documentStatus, pendingDocumentType);

			console.log('📌 Preview document after search (should be unchanged):', selectedDocumentForPreview?.id);
		} else {
			console.log('⏭️ Search term unchanged, skipping search');
		}
	};

	// Search on Enter key - UPDATED
	const handleSearchKeyPress = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			executeSearch();
		}
	};

	// Handle document click for preview - TÁCH BIỆT HOÀN TOÀN VỚI SEARCH
	const handleDocumentClick = async (doc) => {
		console.log('🖱️ Document clicked:', doc.id);

		// Close analysis extract modal when selecting a different document
		if (showAnalysisExtract && analysisExtractDocument?.id !== doc?.id) {
			setShowAnalysisExtract(false);
			setAnalysisExtractDocument(null);
		}

		// Update UI selection only if different
		if (selectedDocument?.id !== doc?.id) {
			console.log('🎯 Updating selectedDocument to:', doc.id);
			setSelectedDocument(doc);
		} else {
			console.log('✅ selectedDocument already selected:', doc.id);
		}

		// CHỈ cập nhật selectedDocumentForPreview và load preview khi chọn document KHÁC
		if (selectedDocumentForPreview?.id !== doc?.id) {
			console.log('🔄 Changing selectedDocumentForPreview from:', selectedDocumentForPreview?.id, 'to:', doc.id);
			setSelectedDocumentForPreview(doc);
		} else {
			console.log('✅ selectedDocumentForPreview already selected:', doc.id);
		}
	};

	// Load preview content - OPTIMIZED VERSION
	const loadPreviewContent = async (document) => {
		try {
			setIsLoadingPreview(true);
			console.log('Loading preview content for document:', document.id);

			// Kiểm tra xem đã có preview content cho document này chưa
			const currentDocumentId = document.id;
			if (previewContent && previewContent.includes(currentDocumentId)) {
				// Đã có preview cho document này, không cần load lại
				console.log('Preview content already loaded for document:', currentDocumentId);
				setIsLoadingPreview(false);
				return;
			}

			// Bỏ documentPreviewContent - chỉ hiển thị nút và title
			const documentPreviewContent = `
				<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; text-align: left;">
					<div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6; text-align: center;">
						<h4 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">${document.title || 'Tài liệu không có tên'}</h4>
						<button 
							onclick="window.toggleExtractedData && window.toggleExtractedData('${document.id}')"
							style="
								background: #059669; 
								color: white; 
								border: none; 
								padding: 12px 24px; 
								border-radius: 6px; 
								cursor: pointer; 
								font-size: 14px; 
								font-weight: 600;
								transition: background-color 0.2s ease;
								box-shadow: 0 2px 4px rgba(0,0,0,0.1);
							"
							onmouseover="this.style.background='#047857'"
							onmouseout="this.style.background='#059669'"
						>
							📊 Xem dữ liệu trích xuất
						</button>
						<div id="extracted-data-container-${document.id}" style="display: none; margin-top: 20px; text-align: left;">
							<div id="extracted-data-content-${document.id}"></div>
						</div>
					</div>
				</div>
			`;

			setPreviewContent(documentPreviewContent);
			console.log('Preview content generated for document:', currentDocumentId);

			// Expose functions to window for use in HTML content
			window.handleFilePreviewFromDocument = (fileId) => {
				handleFilePreview(fileId);
			};

			// Expose toggle function for extracted data
			window.toggleExtractedData = (docId) => {
				const container = document.getElementById(`extracted-data-container-${docId}`);
				const contentDiv = document.getElementById(`extracted-data-content-${docId}`);

				if (container) {
					const isHidden = container.style.display === 'none';
					container.style.display = isHidden ? 'block' : 'none';

					if (isHidden && contentDiv && !contentDiv.innerHTML.trim()) {
						// Load extracted data when first opened
						loadExtractedDataContent(docId, contentDiv);
					}
				}
			};
		} catch (error) {
			console.error('Error loading preview:', error);
			setPreviewContent('<p>Lỗi khi tải nội dung xem trước.</p>');
		} finally {
			setIsLoadingPreview(false);
		}
	};

	// Load and display extracted data content
	const loadExtractedDataContent = (docId, contentDiv) => {
		const document = selectedDocumentForPreview;
		if (!document || !contentDiv) return;

		const metadata = document.metadata || {};
		const extractData = metadata.extractData || metadata; // Có thể nằm trong extractData hoặc trực tiếp trong metadata
		const sampleUIDs = metadata.sampleUIDs || [];

		// Helper function to render a value safely
		const renderValue = (value, fallback = '') => {
			if (value === null || value === undefined || value === '') return fallback;
			if (typeof value === 'object') return JSON.stringify(value, null, 2);
			return String(value);
		};

		// Helper function to check if data has meaningful content
		const hasContent = (value) => {
			if (!value) return false;
			if (Array.isArray(value)) return value.length > 0;
			if (typeof value === 'object') return Object.keys(value).length > 0;
			return String(value).trim() !== '' && String(value) !== 'Không có dữ liệu';
		};

		// Helper function to render unmatched tests table (analyses without testId - ưu tiên hiển thị trên đầu)
		const renderUnmatchedTestsTable = (analyses) => {
			if (!Array.isArray(analyses) || analyses.length === 0) return '';

			// Filter analyses that don't have testId
			const unmatchedTests = analyses.filter((analysis) => !hasContent(analysis.testId));
			if (unmatchedTests.length === 0) return '';

			return `
				<div style="margin-bottom: 20px;">
					<h4 style="color: #dc2626; margin-bottom: 12px; text-align: left;">⚠️ Các phép thử không khớp được</h4>
					<p style="color: #6b7280; font-size: 12px; margin-bottom: 8px; text-align: left;">Các phân tích không có mã chỉ tiêu (testId):</p>
					<table style="width: 100%; border-collapse: collapse; font-size: 13px;">
						<thead>
							<tr style="background: #fef2f2;">
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">STT</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Mã mẫu</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Tên chỉ tiêu</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Mã phương pháp</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Kết quả</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Đơn vị</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Tham chiếu</th>
							</tr>
						</thead>
						<tbody>
							${unmatchedTests
								.map(
									(analysis, index) => `
								<tr style="${index % 2 === 0 ? 'background: #ffffff;' : 'background: #fef2f2;'}">
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${index + 1}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 500;">${
										renderValue(analysis.sampleId) || '--'
									}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${renderValue(analysis.testName) || '--'}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${
										renderValue(analysis.testProtocolCode) || '--'
									}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 500;">${
										renderValue(analysis.testResult) || '--'
									}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${renderValue(analysis.testUnit) || '--'}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${
										renderValue(analysis.testReference) || '--'
									}</td>
								</tr>
							`,
								)
								.join('')}
						</tbody>
					</table>
				</div>
			`;
		};

		// Helper function to render samples table
		const renderSamplesTable = (samples) => {
			if (!Array.isArray(samples) || samples.length === 0) return '';

			return `
				<div style="margin-bottom: 20px;">
					<h4 style="color: #059669; margin-bottom: 12px; text-align: left;">🧪 Mẫu thử</h4>
					<table style="width: 100%; border-collapse: collapse; font-size: 13px;">
						<thead>
							<tr style="background: #f0fdf4;">
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">STT</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Mã mẫu</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Tên mẫu</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Mô tả</th>
							</tr>
						</thead>
						<tbody>
							${samples
								.map(
									(sample, index) => `
								<tr style="${index % 2 === 0 ? 'background: #ffffff;' : 'background: #f9fafb;'}">
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${index + 1}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 500;">${
										renderValue(sample.sampleId) || '--'
									}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${renderValue(sample.sampleName) || '--'}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${
										renderValue(sample.sampleDescription) || '--'
									}</td>
								</tr>
							`,
								)
								.join('')}
						</tbody>
					</table>
				</div>
			`;
		};

		// Helper function to render analyses table (only analyses with testId)
		const renderAnalysesTable = (analyses) => {
			if (!Array.isArray(analyses) || analyses.length === 0) return '';

			// Filter analyses that have testId
			const matchedAnalyses = analyses.filter((analysis) => hasContent(analysis.testId));
			if (matchedAnalyses.length === 0) return '';

			return `
				<div style="margin-bottom: 20px;">
					<h4 style="color: #dc2626; margin-bottom: 12px; text-align: left;">📊 Phân tích & Kết quả</h4>
					<table style="width: 100%; border-collapse: collapse; font-size: 13px;">
						<thead>
							<tr style="background: #fef3f2;">
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">STT</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Mã chỉ tiêu</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Mã mẫu</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Tên chỉ tiêu</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Mã phương pháp</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Kết quả</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Đơn vị</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Tham chiếu</th>
								<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Kết luận</th>
							</tr>
						</thead>
						<tbody>
							${matchedAnalyses
								.map(
									(analysis, index) => `
								<tr style="${index % 2 === 0 ? 'background: #ffffff;' : 'background: #f9fafb;'}">
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${index + 1}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 500; color: #dc2626;">${
										renderValue(analysis.testId) || '--'
									}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 500;">${
										renderValue(analysis.sampleId) || '--'
									}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${renderValue(analysis.testName) || '--'}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${
										renderValue(analysis.testProtocolCode) || '--'
									}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 500;">${
										renderValue(analysis.testResult) || '--'
									}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${renderValue(analysis.testUnit) || '--'}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${
										renderValue(analysis.testReference) || '--'
									}</td>
									<td style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${
										renderValue(analysis.testConclusion) || '--'
									}</td>
								</tr>
							`,
								)
								.join('')}
						</tbody>
					</table>
				</div>
			`;
		};

		// Helper function to build additional metadata sections (ẩn mặc định)
		const buildAdditionalSections = () => {
			let additionalSections = [];

			// Document Reference Number
			if (hasContent(extractData.documentRefNumber)) {
				additionalSections.push(`
					<div style="margin-bottom: 16px; padding: 12px; background: #f1f5f9; border-radius: 6px;">
						<div style="text-align: left;">
							<strong style="color: #1e40af;">📄 Mã số văn bản:</strong>
							<span style="margin-left: 8px;">${renderValue(extractData.documentRefNumber)}</span>
						</div>
					</div>
				`);
			}

			// Document Fingerprint
			if (hasContent(extractData.documentFingerprint)) {
				additionalSections.push(`
					<div style="margin-bottom: 16px; padding: 12px; background: #f1f5f9; border-radius: 6px;">
						<div style="text-align: left;">
							<strong style="color: #1e40af;">🔖 Document Fingerprint:</strong>
							<span style="margin-left: 8px;">${renderValue(extractData.documentFingerprint)}</span>
						</div>
					</div>
				`);
			}

			// Sample UIDs (nếu có)
			if (hasContent(sampleUIDs)) {
				additionalSections.push(`
					<div style="margin-bottom: 16px; padding: 12px; background: #f0f9ff; border-radius: 6px;">
						<div style="text-align: left;">
							<strong style="color: #1e40af;">🧪 Sample UIDs:</strong>
							<div style="margin-top: 8px;">
								${sampleUIDs
									.map(
										(uid) =>
											`<span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; margin: 2px; display: inline-block; font-size: 12px;">${uid}</span>`,
									)
									.join('')}
							</div>
						</div>
					</div>
				`);
			}

			// Operation Info
			if (hasContent(extractData.operationInfo)) {
				additionalSections.push(`
					<div style="margin-bottom: 16px; padding: 12px; background: #f0fdf4; border-radius: 6px;">
						<div style="text-align: left;">
							<strong style="color: #059669;">⚙️ Thông tin thực hiện:</strong>
							<div style="margin-top: 8px;">
								${
									hasContent(extractData.operationInfo?.startTime)
										? `<div><strong>Thời gian bắt đầu:</strong> ${renderValue(
												extractData.operationInfo.startTime,
										  )}</div>`
										: ''
								}
								${
									hasContent(extractData.operationInfo?.endTime)
										? `<div><strong>Thời gian kết thúc:</strong> ${renderValue(
												extractData.operationInfo.endTime,
										  )}</div>`
										: ''
								}
								${
									hasContent(extractData.operationInfo?.technicanName)
										? `<div><strong>Tên kỹ thuật viên:</strong> ${renderValue(
												extractData.operationInfo.technicanName,
										  )}</div>`
										: ''
								}
								${
									hasContent(extractData.operationInfo?.technicanTitle)
										? `<div><strong>Chức danh kỹ thuật viên:</strong> ${renderValue(
												extractData.operationInfo.technicanTitle,
										  )}</div>`
										: ''
								}
							</div>
						</div>
					</div>
				`);
			}

			// Header Info
			if (hasContent(extractData.header)) {
				additionalSections.push(`
					<div style="margin-bottom: 16px; padding: 12px; background: #fef3f2; border-radius: 6px;">
						<div style="text-align: left;">
							<strong style="color: #dc2626;">📋 Thông tin header:</strong>
							<div style="margin-top: 8px;">
								${
									hasContent(extractData.header?.code)
										? `<div><strong>Code:</strong> ${renderValue(extractData.header.code)}</div>`
										: ''
								}
								${
									hasContent(extractData.header?.title)
										? `<div><strong>Title:</strong> ${renderValue(extractData.header.title)}</div>`
										: ''
								}
								${
									hasContent(extractData.header?.publishNo)
										? `<div><strong>Publish No:</strong> ${renderValue(extractData.header.publishNo)}</div>`
										: ''
								}
								${
									hasContent(extractData.header?.publishDate)
										? `<div><strong>Publish Date:</strong> ${renderValue(extractData.header.publishDate)}</div>`
										: ''
								}
							</div>
						</div>
					</div>
				`);
			}

			// Lab Equipments
			if (hasContent(extractData.labEquipments)) {
				additionalSections.push(`
					<div style="margin-bottom: 16px; padding: 12px; background: #fffbeb; border-radius: 6px;">
						<div style="text-align: left;">
							<strong style="color: #d97706;">🔧 Thiết bị thí nghiệm:</strong>
							<div style="margin-top: 8px;">
								${extractData.labEquipments
									.map(
										(equipment, index) => `
									<div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; margin: 4px 0; background: white;">
										<div style="font-weight: 600; color: #374151; text-align: left;">Thiết bị #${index + 1}</div>
										${
											hasContent(equipment.equipmentCode)
												? `<div><strong>Mã thiết bị:</strong> ${renderValue(equipment.equipmentCode)}</div>`
												: ''
										}
										${
											hasContent(equipment.equipmentName)
												? `<div><strong>Tên thiết bị:</strong> ${renderValue(equipment.equipmentName)}</div>`
												: ''
										}
										${
											hasContent(equipment.usageQuantity)
												? `<div><strong>Số lượng sử dụng:</strong> ${renderValue(equipment.usageQuantity)}</div>`
												: ''
										}
										${
											hasContent(equipment.calibrationInfo)
												? `<div><strong>Thông tin hiệu chuẩn:</strong> ${renderValue(equipment.calibrationInfo)}</div>`
												: ''
										}
									</div>
								`,
									)
									.join('')}
							</div>
						</div>
					</div>
				`);
			}

			// Chemicals
			if (hasContent(extractData.chemicals)) {
				additionalSections.push(`
					<div style="margin-bottom: 16px; padding: 12px; background: #f0f9ff; border-radius: 6px;">
						<div style="text-align: left;">
							<strong style="color: #3730a3;">🧪 Hóa chất:</strong>
							<div style="margin-top: 8px;">
								${extractData.chemicals
									.map(
										(chemical, index) => `
									<div style="border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; margin: 4px 0; background: white;">
										<div style="font-weight: 600; color: #374151; text-align: left;">
											Hóa chất #${index + 1} 
											${
												chemical.isStandard
													? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 8px;">CHUẨN</span>'
													: ''
											}
										</div>
										${
											hasContent(chemical.chemicalCode)
												? `<div><strong>Mã hóa chất:</strong> ${renderValue(chemical.chemicalCode)}</div>`
												: ''
										}
										${
											hasContent(chemical.chemicalName)
												? `<div><strong>Tên hóa chất:</strong> ${renderValue(chemical.chemicalName)}</div>`
												: ''
										}
										${
											hasContent(chemical.quantityUsedValue)
												? `<div><strong>Số lượng sử dụng:</strong> ${renderValue(
														chemical.quantityUsedValue,
												  )} ${renderValue(chemical.quantityUsedUnit, '')}</div>`
												: ''
										}
										${
											hasContent(chemical.dilutionValue)
												? `<div><strong>Độ pha loãng:</strong> ${renderValue(chemical.dilutionValue)} ${renderValue(
														chemical.dilutionUnit,
														'',
												  )} (${renderValue(chemical.dilutionType)})</div>`
												: ''
										}
										${
											chemical.supplier && hasContent(chemical.supplier)
												? `
											<div style="margin-top: 4px; padding: 4px; background: #f9fafb; border-radius: 3px;">
												${
													hasContent(chemical.supplier.supplierName)
														? `<strong>Nhà cung cấp:</strong> ${renderValue(chemical.supplier.supplierName)}<br>`
														: ''
												}
												${hasContent(chemical.supplier.lotNumber) ? `<strong>Lô:</strong> ${renderValue(chemical.supplier.lotNumber)}<br>` : ''}
												${
													hasContent(chemical.supplier.lastCheckDate)
														? `<strong>Ngày kiểm tra cuối:</strong> ${renderValue(chemical.supplier.lastCheckDate)}`
														: ''
												}
											</div>
										`
												: ''
										}
									</div>
								`,
									)
									.join('')}
							</div>
						</div>
					</div>
				`);
			}

			// Legibility
			if (hasContent(extractData.legibility)) {
				additionalSections.push(`
					<div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 6px;">
						<div style="text-align: left;">
							<strong style="color: #64748b;">👁️ Đánh giá độ rõ ràng chữ viết:</strong>
							<div style="margin-top: 8px;">
								${
									hasContent(extractData.legibility?.legibilityScore)
										? `<div><strong>Điểm số:</strong> ${renderValue(extractData.legibility.legibilityScore)}/5.0</div>`
										: ''
								}
								${
									hasContent(extractData.legibility?.legibilityComment)
										? `<div><strong>Nhận xét:</strong> ${renderValue(extractData.legibility.legibilityComment)}</div>`
										: ''
								}
							</div>
						</div>
					</div>
				`);
			}

			return additionalSections;
		};

		// Build main content sections (hiển thị mặc định)
		let mainSections = [];

		// 1. Unmatched tests (ưu tiên hiển thị trên đầu)
		const unmatchedTestsSection = renderUnmatchedTestsTable(extractData.analyses);
		if (unmatchedTestsSection) {
			mainSections.push(unmatchedTestsSection);
		}

		// 2. Samples (as table)
		const samplesSection = renderSamplesTable(extractData.samples);
		if (samplesSection) {
			mainSections.push(samplesSection);
		}

		// 3. Analyses (as table) - chỉ những analyses có testId
		const analysesSection = renderAnalysesTable(extractData.analyses);
		if (analysesSection) {
			mainSections.push(analysesSection);
		}

		// Build additional sections (ẩn mặc định)
		const additionalSections = buildAdditionalSections();

		// Generate unique ID for this document's additional content
		const additionalContentId = `additional-content-${docId}`;

		// Final content
		const content = `
			<div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; text-align: left;">
				${
					mainSections.length > 0
						? mainSections.join('')
						: '<p style="text-align: center; color: #6b7280; font-style: italic; margin: 40px 0;">Không có dữ liệu trích xuất để hiển thị</p>'
				}
				
				<!-- Additional content (hidden by default) -->
				<div id="${additionalContentId}" style="display: none;">
					${additionalSections.join('')}
				</div>
				
				<!-- Show more button -->
				${
					additionalSections.length > 0
						? `
					<div style="text-align: center; margin: 20px 0;">
						<button 
							onclick="toggleAdditionalContent('${additionalContentId}', this)"
							style="
								background: #3b82f6; 
								color: white; 
								border: none; 
								padding: 10px 20px; 
								border-radius: 6px; 
								cursor: pointer; 
								font-size: 14px; 
								font-weight: 500;
								transition: background-color 0.2s ease;
							"
							onmouseover="this.style.background='#2563eb'"
							onmouseout="this.style.background='#3b82f6'"
						>
							📊 Hiển thị thêm metadata
						</button>
					</div>
				`
						: ''
				}
			</div>
		`;

		contentDiv.innerHTML = content;

		// Expose toggle function to window
		window.toggleAdditionalContent = (contentId, button) => {
			const content = document.getElementById(contentId);
			if (content) {
				const isHidden = content.style.display === 'none';
				content.style.display = isHidden ? 'block' : 'none';
				button.textContent = isHidden ? '📊 Ẩn metadata' : '📊 Hiển thị thêm metadata';
			}
		};
	};

	// Component ReportDetail - VERSION TỐI ƯU VỚI MEMO VÀ CHECK LOGIC
	const ReportDetail = memo(
		({ document }) => {
			const [isLoadingDetail, setIsLoadingDetail] = useState(false);
			const [detailError, setDetailError] = useState(null);
			const [filePreviewUrl, setFilePreviewUrl] = useState(null);
			const [isFilePreview, setIsFilePreview] = useState(false);
			const [hasLoadedOnce, setHasLoadedOnce] = useState(new Set()); // Track loaded documents

			// Kiểm tra xem có báo cáo trong cache không
			const reportHtml = reportCache[document?.id] || '';
			const hasReportInCache = Boolean(reportHtml);

			// Kiểm tra xem document có đủ dữ liệu để tạo HTML report không
			const hasValidMetadata = useCallback(() => {
				if (!document || !document.metadata) return false;
				const metadata = document.metadata;
				const content = metadata.content || '';
				return content.trim() !== '';
			}, [document?.metadata]);

			// Load file preview function - OPTIMIZED
			const loadFilePreview = useCallback(async () => {
				if (!document || !document.fileId) {
					setDetailError('Không có fileId để tải file preview');
					return;
				}

				// CHECK: Nếu đã load rồi thì không load lại
				if (hasLoadedOnce.has(`file_${document.id}`) && filePreviewUrl) {
					console.log('✅ File preview already loaded, skipping');
					return;
				}

				console.log('🔄 Loading file preview for document:', document.id);
				setIsLoadingDetail(true);
				setDetailError(null);
				setIsFilePreview(true);

				try {
					const response = await apiPostLocal('https://red.irdop.org/v1/file/get/download_link', {
						expiry: 60 * 10,
						mode: 'view',
						fileRecord: { id: document.fileId },
					});

					if (response.status === 200 && response.data) {
						setFilePreviewUrl(response.data);
						setHasLoadedOnce((prev) => new Set([...prev, `file_${document.id}`]));
						console.log('✅ File preview loaded successfully for document:', document.id);
					} else {
						throw new Error('Không thể lấy link preview file');
					}
				} catch (error) {
					console.error('❌ File preview failed:', error);
					setDetailError('Lỗi khi tải file preview: ' + error.message);
				} finally {
					setIsLoadingDetail(false);
				}
			}, [document?.id, document?.fileId, hasLoadedOnce, filePreviewUrl]);

			// Load HTML report function - OPTIMIZED
			const loadHtmlReport = useCallback(async () => {
				if (!document) {
					setDetailError('Không có dữ liệu tài liệu');
					return;
				}

				// CHECK: Nếu đã load rồi thì không load lại
				if (hasLoadedOnce.has(`html_${document.id}`) && reportHtml) {
					console.log('✅ HTML report already loaded, skipping');
					return;
				}

				console.log('🔍 Checking conditions before loading report for document:', document.id);

				// 1. Kiểm tra cache trước
				if (reportCache[document.id]) {
					console.log('💾 Report already in cache for document:', document.id);
					setHasLoadedOnce((prev) => new Set([...prev, `html_${document.id}`]));
					return;
				}

				// 2. Kiểm tra metadata
				if (!hasValidMetadata()) {
					console.log('⚠️ No valid metadata, switching to file preview for document:', document.id);
					await loadFilePreview();
					return;
				}

				console.log('🚀 Starting API call for document:', document.id);
				setIsLoadingDetail(true);
				setDetailError(null);
				setIsFilePreview(false);

				try {
					const metadata = document.metadata;
					const header = metadata.header || {};
					const content = metadata.content || '';

					const reportData = {
						header: header,
						content: content,
						footer: metadata.footer || document.id,
						analysisIds: metadata.analysisIds || [],
						sampleUIDs: metadata.sampleUIDs || [],
						classifierCode: metadata.classifierCode || 'BIEN_BAN_THU_NGHIEM',
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

						setHasLoadedOnce((prev) => new Set([...prev, `html_${document.id}`]));
						console.log('✅ Report API call completed and cached for document:', document.id);
					} else {
						throw new Error('Không thể tải báo cáo từ server');
					}
				} catch (error) {
					console.error('❌ Error loading report:', error);
					setDetailError('Lỗi khi tải báo cáo: ' + error.message);
				} finally {
					setIsLoadingDetail(false);
				}
			}, [document?.id, document?.metadata, hasValidMetadata, loadFilePreview, reportHtml, hasLoadedOnce]);

			// Effect chạy khi document thay đổi - TỐI ƯU HÓA
			useEffect(() => {
				if (!document || !document.id) {
					console.log('❌ No document or document ID');
					return;
				}

				console.log('📄 ReportDetail useEffect triggered for document:', document.id);

				// CHECK QUAN TRỌNG: Nếu đã load document này rồi thì không load lại
				const cacheKey = hasValidMetadata() ? `html_${document.id}` : `file_${document.id}`;
				if (hasLoadedOnce.has(cacheKey)) {
					console.log('✅ Document already loaded, skipping reload');
					return;
				}

				// Reset states chỉ khi thực sự cần
				setFilePreviewUrl(null);
				setIsFilePreview(false);
				setDetailError(null);

				// Kiểm tra cache và metadata trước khi quyết định load gì
				const hasCache = Boolean(reportCache[document.id]);
				const hasValidMeta = hasValidMetadata();

				console.log('📊 Document analysis:', {
					documentId: document.id,
					hasCache,
					hasValidMeta,
					hasFileId: Boolean(document.fileId),
					alreadyLoaded: hasLoadedOnce.has(cacheKey),
				});

				if (hasCache) {
					console.log('✅ Using cached report for document:', document.id);
					setHasLoadedOnce((prev) => new Set([...prev, `html_${document.id}`]));
					return;
				}

				if (hasValidMeta) {
					console.log('🔄 No cache but has valid metadata, loading HTML report...');
					loadHtmlReport();
				} else if (document.fileId) {
					console.log('🔄 No valid metadata, loading file preview...');
					loadFilePreview();
				} else {
					console.log('❌ No valid metadata and no fileId');
					setDetailError('Không có dữ liệu để hiển thị');
				}
			}, [document?.id, hasValidMetadata, loadHtmlReport, loadFilePreview, hasLoadedOnce]);

			// Render loading state
			if (isLoadingDetail) {
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

			// Render error state
			if (detailError) {
				return (
					<div className="border-t border-gray-200 pt-6">
						<h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<FaPlay className="text-green-600" />
							Báo cáo chi tiết
						</h4>
						<div className="border border-red-300 rounded-lg p-8 text-center bg-red-50">
							<p className="text-red-600 mb-4">❌ {detailError}</p>
							<div className="flex gap-2 justify-center">
								{document?.fileId && (
									<button
										onClick={() => handleFilePreview(document.fileId)}
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
									>
										Xem file gốc
									</button>
								)}
								<button
									onClick={() => (hasValidMetadata() ? loadHtmlReport() : loadFilePreview())}
									className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
								>
									Thử lại
								</button>
							</div>
						</div>
					</div>
				);
			}

			// Render content
			return (
				<div className="border-t border-gray-200">
					{/* Ẩn tiêu đề "báo cáo chi tiết" - chỉ hiển thị nội dung */}
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
			// Custom comparison function for React.memo
			return (
				prevProps.document?.id === nextProps.document?.id &&
				JSON.stringify(prevProps.document?.metadata) === JSON.stringify(nextProps.document?.metadata) &&
				prevProps.document?.fileId === nextProps.document?.fileId
			);
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
		await loadDocuments(lastSearchTerm, newPage, mode, documentStatus, pendingDocumentType);
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
					<div className="flex items-center gap-4">
						{/* Mode Toggle Section - Chỉ hiển thị cho admin */}
						{isAdmin() && (
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium text-gray-700">Phạm vi:</span>
								{/* Mode Toggle Switch */}
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={mode === 'all'}
										onChange={() => handleModeChange(mode === 'all' ? 'personal' : 'all')}
										className="sr-only"
										disabled={isLoading}
									/>
									<div className="w-32 h-8 bg-gray-200 rounded-full transition-all duration-300 ease-in-out relative border border-gray-300 overflow-hidden">
										{/* Sliding background */}
										<div
											className={`absolute top-0 h-full w-1/2 bg-blue-500 rounded-full transition-all duration-300 ease-in-out
												${mode === 'personal' ? 'left-0' : 'left-1/2'}`}
										></div>

										{/* PERSONAL text */}
										<div className="absolute left-0 w-1/2 h-full flex items-center justify-center">
											<span
												className={`text-xs font-medium transition-all duration-300 ease-in-out
													${mode === 'personal' ? 'text-white' : 'text-gray-600'}`}
											>
												CÁ NHÂN
											</span>
										</div>

										{/* ALL text */}
										<div className="absolute right-0 w-1/2 h-full flex items-center justify-center">
											<span
												className={`text-xs font-medium transition-all duration-300 ease-in-out
													${mode === 'all' ? 'text-white' : 'text-gray-600'}`}
											>
												TOÀN BỘ
											</span>
										</div>
									</div>
								</label>
							</div>
						)}

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
			</div>

			<div className="w-full flex gap-6" style={{ height: 'calc(100vh - 140px)', minHeight: '600px' }}>
				{/* Cột trái: Danh sách tài liệu đã phát hành */}
				<div className="w-1/3 flex flex-col gap-4 h-full min-w-[400px]">
					<div className="bg-white rounded-xl shadow-sm border p-6 flex-1 flex flex-col min-h-0">
						<div className="flex items-center justify-between mb-4 flex-shrink-0">
							{/* Title với dropdown cho chọn loại tài liệu khi ở trạng thái draft */}
							{documentStatus === 'draft' ? (
								<div className="relative">
									<h3
										className="text-lg font-semibold text-gray-900 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
										onClick={() => setShowDocumentTypeDropdown(!showDocumentTypeDropdown)}
									>
										<FaClock className="text-blue-600" />
										{pendingDocumentType === 'lab_reports' ? 'Biên bản chờ duyệt' : 'Tài liệu chờ duyệt'}
										<span className="text-sm text-gray-500">▼</span>
										{isLoading && (
											<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
										)}
									</h3>

									{/* Dropdown menu */}
									{showDocumentTypeDropdown && (
										<div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
											<button
												onClick={() => {
													handlePendingDocumentTypeChange('lab_reports');
													setShowDocumentTypeDropdown(false);
												}}
												className={`w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg ${
													pendingDocumentType === 'lab_reports' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
												}`}
											>
												<FaClock className="inline mr-2 text-blue-600" />
												Biên bản chờ duyệt
											</button>
											<button
												onClick={() => {
													handlePendingDocumentTypeChange('documents');
													setShowDocumentTypeDropdown(false);
												}}
												className={`w-full text-left px-4 py-3 hover:bg-gray-50 last:rounded-b-lg ${
													pendingDocumentType === 'documents' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
												}`}
											>
												<FaFileAlt className="inline mr-2 text-green-600" />
												Tài liệu chờ duyệt
											</button>
										</div>
									)}
								</div>
							) : (
								<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
									<FaClock className="text-blue-600" />
									Tài liệu đã phát hành
									{isLoading && (
										<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
									)}
								</h3>
							)}

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

						{/* Pending Document Type Selection đã được chuyển lên title - XÓA PHẦN NÀY */}

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
											: documentStatus === 'draft' && pendingDocumentType === 'lab_reports'
											? mode === 'personal'
												? 'Không có biên bản chờ duyệt cá nhân nào'
												: 'Không có biên bản chờ duyệt nào'
											: mode === 'personal'
											? 'Không có tài liệu chờ duyệt cá nhân nào'
											: 'Không có tài liệu chờ duyệt nào'}
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
													<FaTable className="text-blue-500 w-3 h-3 flex-shrink-0" title="Có thể duyệt kết quả" />
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
								{selectedDocumentForPreview && (
									<button
										onClick={() => setShowExtractedData(!showExtractedData)}
										className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
										title="Xem dữ liệu trích xuất từ metadata"
									>
										<FaDatabase className="w-3 h-3" />
										Dữ liệu trích xuất
									</button>
								)}
								{selectedDocumentForPreview && (
									<button
										onClick={() => handleShowAnalysisExtract(selectedDocumentForPreview)}
										className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
										title="Duyệt kết quả hoặc chỉnh sửa tài liệu"
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
									<div className="bg-white rounded-lg shadow-sm h-full overflow-auto custom-scrollbar">
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
												<strong>Loại tài liệu:</strong>{' '}
												{documentStatus === 'published'
													? 'Đã phát hành'
													: documentStatus === 'draft' && pendingDocumentType === 'lab_reports'
													? 'Biên bản chờ duyệt'
													: 'Tài liệu chờ duyệt'}
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

			{/* Extracted Data Modal */}
			{showExtractedData && selectedDocumentForPreview && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden">
						{/* Modal Header */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaDatabase className="text-purple-600" />
								Dữ liệu trích xuất - {selectedDocumentForPreview.title}
							</h3>
							<button
								onClick={() => setShowExtractedData(false)}
								className="text-gray-400 hover:text-gray-600 transition-colors"
							>
								<span className="text-2xl">&times;</span>
							</button>
						</div>

						{/* Modal Content */}
						<div className="p-6 overflow-y-auto max-h-[calc(95vh-80px)]">
							<div
								dangerouslySetInnerHTML={{
									__html: (() => {
										const tempDiv = document.createElement('div');
										loadExtractedDataContent(selectedDocumentForPreview.id, tempDiv);
										return tempDiv.innerHTML;
									})(),
								}}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default LabDocument;
