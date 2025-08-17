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
	const { currentUser, setCurrentUser, fetchUser } = useContext(GlobalContext);

	// Utility functions
	const isAdmin = () => {
		return currentUser?.role?.staff_admin === true;
	};

	const [selectedDocument, setSelectedDocument] = useState(null);
	const [previewContent, setPreviewContent] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [mode, setMode] = useState('personal'); // 'personal' or 'all'

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

	// Load documents from API
	const loadDocuments = async (searchTerm = '', page = 1, currentMode = mode, status = documentStatus) => {
		try {
			setIsLoading(true);

			// Nếu không phải admin, luôn dùng mode 'personal'
			const finalMode = isAdmin() ? currentMode : 'personal';

			// Choose API endpoint based on status
			const apiEndpoint = status === 'published' ? PUBLISHED_DOCS_API_ENDPOINT : DRAFT_DOCS_API_ENDPOINT;

			const requestBody = {
				searchTerm: searchTerm,
				page: page,
				mode: finalMode, // Use finalMode instead of currentMode
				status: 'submitted', // Add status: 'submitted' to request body
			};

			// Add status-specific fields
			if (status === 'published') {
				requestBody.sended = status; // For published documents
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
					status: status, // Use the status parameter to set document status
					// Preserve all original data for preview
					createdAt: doc.createdAt,
					modifiedAt: doc.modifiedAt,
					authorName: doc.metadata?.authorName,
					modifiedBy: doc.metadata?.modifiedBy,
					metadata: doc.metadata || {},
					fileId: doc.fileId, // Extract fileId from document level
					originalData: doc, // Keep original data for navigation
				}));

				setDocuments(transformedDocuments);
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

	// File preview functionality
	const handleFilePreview = async (fileId) => {
		try {
			// Get download link directly using fileId
			const response = await apiPostLocal('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10, // 10 minutes
				mode: 'view',
				fileId: fileId, // Use fileId directly
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

		try {
			showAutoHideMessage('Đang tạo preview...', 'info');

			const metadata = document.metadata;
			const header = metadata.header || {};
			const content = metadata.content || '';
			const analysisIds = metadata.analysisIds || [];
			const sampleUIDs = metadata.sampleUIDs || [];

			// Prepare report data with exact structure similar to Editor.jsx
			const reportData = {
				header: header,
				content: content,
				footer: document.id,
				analysisIds: analysisIds,
				sampleUIDs: sampleUIDs,
			};

			// Call the same API endpoint as in Editor.jsx
			const response = await apiPostLocal(
				'https://black.irdop.org/khsi19me/convert/lab_result_report_html',
				reportData,
			);

			if (response.status === 200 && response.data) {
				showAutoHideMessage('Đã tạo preview thành công!', 'success');

				// Show preview popup similar to Editor.jsx
				const htmlResponse = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
				showPreviewPopup(htmlResponse, {
					editId: document.id,
					metadata: {
						templateId: metadata.templateId,
						templateName: metadata.templateName,
						header: header,
						content: content,
						footer: document.id,
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

		// Create iframe for content
		const iframe = document.createElement('iframe');
		iframe.style.cssText = `
			width: 100%;
			height: 100%;
			border: none;
			flex: 1;
		`;

		// Set iframe content
		iframe.onload = function () {
			iframe.contentDocument.open();
			iframe.contentDocument.write(htmlContent);
			iframe.contentDocument.close();
		};

		popup.appendChild(header);
		popup.appendChild(iframe);
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

	// Show Analysis Extract Popup - using AnalysesExtract component logic
	const showAnalysisExtractPopup = async (doc) => {
		if (!doc || !doc.metadata || !doc.metadata.extractData || !doc.metadata.extractData.analyses) {
			showAutoHideMessage('Không có dữ liệu chỉ tiêu để hiển thị', 'warning');
			return;
		}

		// 1. Lấy dữ liệu trích xuất
		const extractedAnalyses = doc.metadata.extractData.analyses;
		const analysisIds = extractedAnalyses.map(a => a.id).filter(id => id);

		// 2. Gọi API lấy matchAnalysis
		let matchAnalysis = [];
		try {
			showAutoHideMessage('Đang tải dữ liệu đối chiếu...', 'info');
			const res = await apiPost('https://red.irdop.org/v1/lab/analysis/match/by_id', { ids: analysisIds });
			if (res.status === 200 && res.data) {
				if (Array.isArray(res.data)) {
					matchAnalysis = res.data;
				} else if (res.data.result && Array.isArray(res.data.result)) {
					matchAnalysis = res.data.result;
					console.log('Match analysis loaded:', matchAnalysis);
				}
			}
			showAutoHideMessage('Tải dữ liệu đối chiếu thành công!', 'success');
		} catch (err) {
			console.error('Error loading match analysis:', err);
			showAutoHideMessage('Lỗi khi tải dữ liệu đối chiếu: ' + err.message, 'error');
		}

		// 3. Hàm xác định khác biệt, gán các key ...Diff
		function getAnalysisDifferences(extracted, matched) {
			if (!matched) return extracted;
			const diffObj = { ...extracted };
			
			// Chỉ so sánh parameterName và protocolCode
			const fieldsToCompare = ['parameterName', 'protocolCode'];
			fieldsToCompare.forEach(field => {
				if (extracted[field] !== matched[field]) {
					diffObj[field + 'Diff'] = matched[field];
				}
			});
			
			return diffObj;
		}

		// 4. Gộp dữ liệu trích xuất với các trường ...Diff nếu có
		const mergedAnalyses = extractedAnalyses.map(extract => {
			const matched = matchAnalysis.find(m => m.id === parseInt(extract.id));
			console.log('matched:', matched);
			console.log('extract:', extract);
			return getAnalysisDifferences(extract, matched);
		});

		// 5. State hiển thị khác biệt
		let showDifferences = false;

		// 6. Tạo popup
		const existingPopup = document.getElementById('analysisDataPopupOverlay');
		if (existingPopup) existingPopup.remove();

		const overlay = document.createElement('div');
		overlay.id = 'analysisDataPopupOverlay';
		overlay.className = 'fixed inset-0 bg-black bg-opacity-80 z-[10000] flex items-center justify-center';

		const popup = document.createElement('div');
		popup.className = 'bg-white rounded-lg w-[80vw] h-[90vh] flex flex-col shadow-2xl overflow-hidden';

		// Header
		const header = document.createElement('div');
		header.className = 'p-2 border-b border-gray-200 flex justify-between items-center bg-gray-50';

		const title = document.createElement('h3');
		title.textContent = 'Dữ liệu trích xuất từ báo cáo';
		title.className = 'm-0 text-lg font-semibold text-gray-700';

		const closeBtn = document.createElement('button');
		closeBtn.textContent = '✕';
		closeBtn.className =
			'px-3 py-2 bg-red-500 hover:bg-red-600 text-white border-0 rounded-md cursor-pointer font-bold text-base transition-colors duration-200';
		closeBtn.onclick = () => overlay.remove();

		// Nút hiển thị khác biệt
		const showDiffBtn = document.createElement('button');
		showDiffBtn.textContent = 'Hiển thị dữ liệu khác biệt';
		showDiffBtn.className = 'px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white border-0 rounded-md cursor-pointer font-bold text-xs transition-colors duration-200';

		// CSS cho difference indicators
		const style = document.createElement('style');
		style.textContent = `
			.difference-indicator {
				color: #ff6b6b;
				font-weight: bold;
				cursor: pointer;
				margin-right: 6px;
				background-color: #fff3cd;
				border: 1px solid #ffc107;
				padding: 2px 4px;
				border-radius: 3px;
				display: inline-block;
				position: relative;
			}
			
			.difference-indicator:hover {
				background-color: #ffecb3;
				border-color: #ff9800;
			}
			
			.difference-indicator .tooltip {
				visibility: hidden;
				background-color: #fff3cd;
				border: 2px solid #ffc107;
				color: #856404;
				text-align: left;
				border-radius: 6px;
				padding: 8px 12px;
				position: absolute;
				z-index: 10001;
				bottom: 125%;
				left: 50%;
				margin-left: -100px;
				width: 200px;
				box-shadow: 0 4px 8px rgba(0,0,0,0.2);
				font-size: 11px;
				line-height: 1.3;
			}
			
			.difference-indicator .tooltip::after {
				content: "";
				position: absolute;
				top: 100%;
				left: 50%;
				margin-left: -5px;
				border-width: 5px;
				border-style: solid;
				border-color: #ffc107 transparent transparent transparent;
			}
			
			.difference-indicator:hover .tooltip {
				visibility: visible;
			}
			
			.difference-tag {
				background-color: #fff3cd;
				border: 2px solid #ffc107;
				border-radius: 4px;
				padding: 4px 8px;
				margin-top: 4px;
				font-size: 0.75rem;
				color: #856404;
				display: block;
				width: 100%;
				box-sizing: border-box;
				word-wrap: break-word;
				white-space: normal;
				overflow-wrap: break-word;
				hyphens: auto;
			}
		`;
		document.head.appendChild(style);

		// Main content
		const mainContent = document.createElement('div');
		mainContent.className = 'flex-1 overflow-auto p-4';

		// Hàm render bảng
		function renderTable() {
			mainContent.innerHTML = `
				<div class="overflow-auto">
					<table class="w-full border-collapse border border-gray-300 text-xs">
						<thead>
							<tr class="bg-gray-100">
								<th class="border border-gray-300 p-2">ID</th>
								<th class="border border-gray-300 p-2">Mã mẫu</th>
								<th class="border border-gray-300 p-2">Tên mẫu</th>
								<th class="border border-gray-300 p-2">Chỉ tiêu</th>
								<th class="border border-gray-300 p-2">Mã phương pháp</th>
								<th class="border border-gray-300 p-2">Kết quả</th>
								<th class="border border-gray-300 p-2">Đơn vị</th>
							</tr>
						</thead>
						<tbody>
							${mergedAnalyses.map(a => `
								<tr>
									<td class="border border-gray-300 p-2">${a.id || ''}</td>
									<td class="border border-gray-300 p-2">${a.sampleUID || ''}</td>
									<td class="border border-gray-300 p-2">${a.sampleName || ''}</td>
									<td class="border border-gray-300 p-2">
										${a.parameterNameDiff !== undefined ? (!showDifferences
											? `<div><span class="difference-indicator">⚠️<span class="tooltip">Giá trị trong app: <div style="margin-top:4px; font-weight:bold;">${a.parameterNameDiff || 'Không có'}</div></span></span>${a.parameterName || ''}</div>`
											: `<div style="width: 100%;">${a.parameterName || ''}<div class="difference-tag">Giá trị gốc: ${a.parameterNameDiff || 'Không có'}</div></div>`
										) : `<div>${a.parameterName || ''}</div>`}
									</td>
									<td class="border border-gray-300 p-2">
										${a.protocolCodeDiff !== undefined ? (!showDifferences
											? `<div><span class="difference-indicator">⚠️<span class="tooltip">Giá trị trong app: <div style="margin-top:4px; font-weight:bold;">${a.protocolCodeDiff || 'Không có'}</div></span></span>${a.protocolCode || ''}</div>`
											: `<div style="width: 100%;">${a.protocolCode || ''}<div class="difference-tag">Giá trị gốc: ${a.protocolCodeDiff || 'Không có'}</div></div>`
										) : `<div>${a.protocolCode || ''}</div>`}
									</td>
									<td class="border border-gray-300 p-2">
										<div style="width: 100%;">${a.resultValue || ''}</div>
									</td>
									<td class="border border-gray-300 p-2">
										<div style="width: 100%;">${a.resultUnit || ''}</div>
									</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
				</div>
			`;
		}

		// Sự kiện click nút hiển thị khác biệt
		showDiffBtn.onclick = () => {
			showDifferences = !showDifferences;
			showDiffBtn.textContent = showDifferences ? 'Ẩn dữ liệu khác biệt' : 'Hiển thị dữ liệu khác biệt';
			showDiffBtn.className = showDifferences
				? 'px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white border-0 rounded-md cursor-pointer font-bold text-xs transition-colors duration-200'
				: 'px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white border-0 rounded-md cursor-pointer font-bold text-xs transition-colors duration-200';
			renderTable();
			showAutoHideMessage(showDifferences ? 'Đang hiển thị dữ liệu khác biệt' : 'Đã ẩn dữ liệu khác biệt', 'info');
		};

		// Assemble header
		const headerLeft = document.createElement('div');
		headerLeft.className = 'flex items-center gap-3';
		headerLeft.appendChild(title);
		headerLeft.appendChild(showDiffBtn);

		header.appendChild(headerLeft);
		header.appendChild(closeBtn);

		// Footer với nút xác nhận cập nhật
		const footer = document.createElement('div');
		footer.className = 'border-t border-gray-200 p-4 bg-gray-50 flex justify-center';

		const confirmBtn = document.createElement('button');
		confirmBtn.textContent = 'Xác nhận cập nhật';
		confirmBtn.className = 'px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg cursor-pointer font-semibold text-sm transition-colors duration-200 shadow-sm hover:shadow-md';

		// Hàm xử lý xác nhận cập nhật
		confirmBtn.onclick = async () => {
			try {
				// Kiểm tra xem có dữ liệu để cập nhật không
				if (!mergedAnalyses || mergedAnalyses.length === 0) {
					showAutoHideMessage('Không có dữ liệu để cập nhật', 'warning');
					return;
				}

				// Kiểm tra xem có khác biệt về protocolCode không
				const hasProtocolDifference = mergedAnalyses.some(a => a.protocolCodeDiff !== undefined);

				if (hasProtocolDifference) {
					// Hiển thị dialog xác nhận với select option
					const confirmDialog = document.createElement('div');
					confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center';
					
					const dialogContent = document.createElement('div');
					dialogContent.className = 'bg-yellow-50 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl border-2 border-yellow-200';
					
					dialogContent.innerHTML = `
						<div class="flex items-center mb-4">
							<span class="text-2xl mr-3">⚠️</span>
							<h3 class="text-lg font-semibold text-gray-900">Cảnh báo: Phát hiện khác biệt về phương pháp</h3>
						</div>
						<p class="text-gray-700 mb-4">Một số chỉ tiêu có phương pháp khác với dữ liệu trong app. Bạn muốn áp dụng phương pháp nào?</p>
						
						<div class="mb-6">
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Chọn phương pháp áp dụng:
							</label>
							<select id="methodChoice" class="w-full p-3 bg-white border-2 border-yellow-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-900 font-medium shadow-sm">
								<option value="delivered">Áp dụng phương pháp được bàn giao (mặc định)</option>
								<option value="report">Áp dụng phương pháp trong biên bản</option>
							</select>
						</div>
						
						<div class="flex justify-end gap-3">
							<button id="cancelConfirm" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors">Hủy bỏ</button>
							<button id="proceedConfirm" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">Xác nhận</button>
						</div>
					`;
					
					confirmDialog.appendChild(dialogContent);
					document.body.appendChild(confirmDialog);
					
					// Xử lý sự kiện dialog
					const cancelBtn = dialogContent.querySelector('#cancelConfirm');
					const proceedBtn = dialogContent.querySelector('#proceedConfirm');
					const methodSelect = dialogContent.querySelector('#methodChoice');
					
					cancelBtn.onclick = () => {
						confirmDialog.remove();
					};
					
					proceedBtn.onclick = async () => {
						const methodChoice = methodSelect.value;
						confirmDialog.remove();
						await performUpdate(methodChoice);
					};
					
					// Đóng dialog khi click outside
					confirmDialog.addEventListener('click', (e) => {
						if (e.target === confirmDialog) {
							confirmDialog.remove();
						}
					});
				} else {
					// Không có khác biệt về protocol, thực hiện update trực tiếp
					await performUpdate('delivered');
				}
			} catch (error) {
				console.error('Error in confirm update:', error);
				showAutoHideMessage('Lỗi khi xử lý cập nhật: ' + error.message, 'error');
			}
		};

		// Hàm thực hiện cập nhật
		const performUpdate = async (methodChoice) => {
			try {
				showAutoHideMessage('Đang xử lý cập nhật...', 'info');
				
				// Chuẩn bị dữ liệu analyses
				const analysesData = mergedAnalyses.map(a => {
					const baseData = {
						id: parseInt(a.id),
						resultValue: a.resultValue,
						resultUnit: a.resultUnit
					};
					
					// Nếu chọn áp dụng phương pháp trong biên bản
					if (methodChoice === 'report') {
						// Sử dụng protocolCode từ extractData.analyses (giá trị hiện tại trong biên bản)
						baseData.protocolCode = a.protocolCode;
					}
					// Nếu chọn mặc định (delivered) thì không thêm protocolCode
					
					return baseData;
				}).filter(a => a.id); // Chỉ lấy những item có ID

				console.log('Sending update request:', { analyses: analysesData });

				const response = await apiPost('https://red.irdop.org/v1/analysis/update_bulk', {
					analyses: analysesData
				});

				if (response.status === 200) {
					showAutoHideMessage('Cập nhật thành công!', 'success');
					overlay.remove(); // Đóng popup sau khi cập nhật thành công
				} else {
					showAutoHideMessage('Lỗi khi cập nhật: ' + (response.message || 'Unknown error'), 'error');
				}
			} catch (error) {
				console.error('Error in performUpdate:', error);
				showAutoHideMessage('Lỗi khi cập nhật: ' + error.message, 'error');
			}
		};

		footer.appendChild(confirmBtn);

		// Assemble popup
		popup.appendChild(header);
		popup.appendChild(mainContent);
		popup.appendChild(footer);
		overlay.appendChild(popup);
		document.body.appendChild(overlay);

		// Render bảng ban đầu
		renderTable();

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

	// Keep isDraft in sync with documentStatus
	useEffect(() => {
		setIsDraft(documentStatus === 'draft');
	}, [documentStatus]);

	// Refresh data
	const refreshData = async () => {
		setIsLoading(true);
		try {
			await loadDocuments(searchTerm, pagination.currentPage, mode, documentStatus);
		} catch (error) {
			console.error('Error refreshing data:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle document status change
	const handleDocumentStatusChange = async (newStatus) => {
		if (newStatus === documentStatus) return; // No change needed

		setDocumentStatus(newStatus);
		setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page
		setSelectedDocument(null); // Clear selection when switching status
		setPreviewContent(''); // Clear preview content
		await loadDocuments(searchTerm, 1, mode, newStatus);
	};

	// Handle toggle switch change
	const handleToggleChange = () => {
		const newIsDraft = !isDraft;
		setIsDraft(newIsDraft);
		const newStatus = newIsDraft ? 'draft' : 'published';
		handleDocumentStatusChange(newStatus);
	};

	// Handle mode change - chỉ admin mới được thay đổi mode
	const handleModeChange = async (newMode) => {
		// Nếu không phải admin, luôn dùng mode 'personal'
		if (!isAdmin()) {
			return;
		}

		if (newMode === mode) return; // No change needed

		setMode(newMode);
		setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page
		setSelectedDocument(null); // Clear selection when switching modes
		setPreviewContent(''); // Clear preview content
		await loadDocuments(searchTerm, 1, newMode, documentStatus);
	};

	// Handle search
	const handleSearch = () => {
		loadDocuments(searchTerm, 1, mode, documentStatus);
	};

	// Search on Enter key
	const handleSearchKeyPress = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSearch();
		}
	};

	// Handle document click for preview
	const handleDocumentClick = (doc) => {
		setSelectedDocument(doc);

		// Create preview content từ document metadata - chỉ hiển thị mã mẫu thử
		const metadata = doc.metadata || {};
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
	};

	// Generate report frame HTML with API call
	const generateReportFrame = (document) => {
		const metadata = document.metadata;
		const header = metadata.header || {};
		const content = metadata.content || '';
		const analysisIds = metadata.analysisIds || [];
		const sampleUIDs = metadata.sampleUIDs || [];

		// Prepare report data
		const reportData = {
			header: header,
			content: content,
			footer: document.id,
			analysisIds: analysisIds,
			sampleUIDs: sampleUIDs,
		};

		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Lab Result Report</title>
	<style>
		body {
			margin: 0;
			padding: 20px;
			font-family: 'Times New Roman', serif;
			line-height: 1.6;
		}
		.loading {
			text-align: center;
			padding: 50px;
			color: #666;
		}
		.error {
			text-align: center;
			padding: 50px;
			color: #dc2626;
			background: #fee2e2;
			border-radius: 6px;
			margin: 20px;
		}
		.spinner {
			display: inline-block;
			width: 20px;
			height: 20px;
			border: 3px solid #f3f3f3;
			border-top: 3px solid #3498db;
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}
		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
	</style>
</head>
<body>
	<div id="content">
		<div class="loading">
			<div class="spinner"></div>
			<p>Đang tải báo cáo...</p>
		</div>
	</div>

	<script>
		async function loadReport() {
			try {
				const reportData = ${JSON.stringify(reportData)};
				
				const response = await fetch('https://black.irdop.org/khsi19me/convert/lab_result_report_html', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(reportData)
				});

				if (!response.ok) {
					throw new Error('Network response was not ok: ' + response.statusText);
				}

				const result = await response.text();
				document.getElementById('content').innerHTML = result;
			} catch (error) {
				console.error('Error loading report:', error);
				document.getElementById('content').innerHTML = 
					'<div class="error">' +
					'<h3>Lỗi khi tải báo cáo</h3>' +
					'<p>Không thể tải nội dung báo cáo từ server.</p>' +
					'<p><strong>Chi tiết lỗi:</strong> ' + error.message + '</p>' +
					'</div>';
			}
		}

		// Load report when page loads
		loadReport();
	</script>
</body>
</html>
		`;
	};

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

	// Page change handler
	const handlePageChange = async (newPage) => {
		setPagination((prev) => ({ ...prev, currentPage: newPage }));
		await loadDocuments(searchTerm, newPage, mode, documentStatus);
	};

	const filteredDocuments = documents.filter((doc) => doc.title.toLowerCase().includes(searchTerm.toLowerCase()));

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
								<div className="w-40 h-10 bg-gray-200 rounded-full transition-all duration-300 ease-in-out relative border border-gray-300 overflow-hidden">
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
											DRAFT
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
									placeholder="Tìm tài liệu..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
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
							) : filteredDocuments.length === 0 ? (
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
									{searchTerm && <div className="text-xs mt-1">Thử tìm kiếm với từ khóa khác</div>}
								</div>
							) : (
								<div className="space-y-3">
									{filteredDocuments.map((doc) => (
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
													<div className="text-gray-500">{doc.metadata?.submittedByUID}</div>
													<div className="text-gray-500">{doc.lastModified}</div>
												</div>

												{/* Title Section */}
												<div className="flex items-center gap-2 mb-2">
													<FaFileAlt className="text-gray-500 flex-shrink-0" />
													<span className="font-medium text-gray-900 text-sm leading-tight text-start">
														{doc.metadata?.header?.title || doc.title}
													</span>
													{doc.metadata?.extractData?.analyses && (
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
								{selectedDocument && selectedDocument.metadata?.extractData?.analyses && (
									<button
										onClick={() => showAnalysisExtractPopup(selectedDocument)}
										className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
										title="Xem dữ liệu chỉ tiêu"
									>
										<FaTable className="w-3 h-3" />
										Dữ liệu chỉ tiêu
									</button>
								)}
								{selectedDocument && (
									<button
										onClick={() => previewDocumentReport(selectedDocument)}
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
							{selectedDocument || previewContent ? (
								<div className="bg-gray-50 rounded-lg p-4 h-full">
									<div className="bg-white rounded-lg shadow-sm h-full overflow-auto custom-scrollbar space-y-6">
										{/* Hiển thị preview mã mẫu thử */}
										<div dangerouslySetInnerHTML={{ __html: previewContent }} />

										{/* Frame hiển thị báo cáo từ API */}
										{selectedDocument && (
											<div className="border-t border-gray-200 pt-6">
												<h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
													<FaPlay className="text-green-600" />
													Báo cáo chi tiết
												</h4>
												<div className="border border-gray-300 rounded-lg overflow-hidden h-fit">
													<iframe
														src={`data:text/html;charset=utf-8,${encodeURIComponent(
															generateReportFrame(selectedDocument),
														)}`}
														className="w-full h-[794px] border-0"
														title="Lab Result Report"
													/>
												</div>
											</div>
										)}
									</div>
								</div>
							) : (
								<div className="flex items-center justify-center h-full text-gray-500">
									<div className="text-center">
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
		</>
	);
};

export default LabDocument;
