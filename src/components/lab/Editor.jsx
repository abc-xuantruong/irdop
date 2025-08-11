import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react';
import DiagramEditor from './DiagramEditor';
import { apiPost } from '../../contexts/helperFunctionCallAPI';

// Helper function to extract specific CSS property from style string
const extractStyleProperty = (styleString, property) => {
	if (!styleString) return null;

	const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
	const match = styleString.match(regex);
	return match ? match[1].trim() : null;
};

// Helper function to apply format logic to HTML content
const applyFormatToHTML = (htmlContent) => {
	const tempContainer = document.createElement('div');
	tempContainer.innerHTML = htmlContent;

	// Process p tags - remove style but keep padding
	const pTags = tempContainer.querySelectorAll('p');
	pTags.forEach((p) => {
		const currentStyle = p.getAttribute('style') || '';
		const padding = extractStyleProperty(currentStyle, 'padding');
		const paddingTop = extractStyleProperty(currentStyle, 'padding-top');
		const paddingBottom = extractStyleProperty(currentStyle, 'padding-bottom');
		const paddingLeft = extractStyleProperty(currentStyle, 'padding-left');
		const paddingRight = extractStyleProperty(currentStyle, 'padding-right');

		p.removeAttribute('style');
		p.removeAttribute('class');
		p.removeAttribute('data-mce-style');

		const styleString = [];
		if (padding) styleString.push(`padding: ${padding}`);
		else {
			if (paddingTop) styleString.push(`padding-top: ${paddingTop}`);
			if (paddingBottom) styleString.push(`padding-bottom: ${paddingBottom}`);
			if (paddingLeft) styleString.push(`padding-left: ${paddingLeft}`);
			if (paddingRight) styleString.push(`padding-right: ${paddingRight}`);
		}

		if (styleString.length > 0) {
			p.setAttribute('style', styleString.join('; ') + '; font-size: 11px');
		} else {
			p.setAttribute('style', 'font-size: 11px');
		}
	});

	// Process td/th tags - remove style but keep padding and set default border
	const tdTags = tempContainer.querySelectorAll('td, th');
	tdTags.forEach((td) => {
		const currentStyle = td.getAttribute('style') || '';
		const padding = extractStyleProperty(currentStyle, 'padding');
		const paddingTop = extractStyleProperty(currentStyle, 'padding-top');
		const paddingBottom = extractStyleProperty(currentStyle, 'padding-bottom');
		const paddingLeft = extractStyleProperty(currentStyle, 'padding-left');
		const paddingRight = extractStyleProperty(currentStyle, 'padding-right');

		td.removeAttribute('style');
		td.removeAttribute('class');
		td.removeAttribute('width');
		td.removeAttribute('data-mce-style');

		const styleString = ['border: 1px solid #000', 'font-size: 11px'];
		if (padding) styleString.push(`padding: ${padding}`);
		else {
			if (paddingTop) styleString.push(`padding-top: ${paddingTop}`);
			if (paddingBottom) styleString.push(`padding-bottom: ${paddingBottom}`);
			if (paddingLeft) styleString.push(`padding-left: ${paddingLeft}`);
			if (paddingRight) styleString.push(`padding-right: ${paddingRight}`);
		}

		td.setAttribute('style', styleString.join('; '));
	});

	// Process tr tags - remove all styling
	const trTags = tempContainer.querySelectorAll('tr');
	trTags.forEach((tr) => {
		tr.removeAttribute('style');
		tr.removeAttribute('class');
		tr.removeAttribute('data-mce-style');
	});

	// Process table tags - set standard styling
	const tableTags = tempContainer.querySelectorAll('table');
	tableTags.forEach((table) => {
		table.removeAttribute('class');
		table.removeAttribute('data-mce-style');
		table.removeAttribute('border');
		table.removeAttribute('cellpadding');
		table.removeAttribute('cellspacing');
		table.removeAttribute('width');

		table.setAttribute('style', 'width: 100%; max-width: 100%; border-collapse: collapse;');
	});

	// Set font-size 11px for all elements except headings
	const allTags = tempContainer.querySelectorAll('*:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)');
	allTags.forEach((element) => {
		const currentStyle = element.getAttribute('style') || '';
		const styleWithFontSize = currentStyle + (currentStyle ? '; ' : '') + 'font-size: 11px';
		element.setAttribute('style', styleWithFontSize);
	});

	return tempContainer.innerHTML;
};

const Editor = () => {
	const [headerData, setHeaderData] = useState({
		title: '',
		code: '',
		publishNo: '',
		publishDate: '',
	});

	const [selectedData, setSelectedData] = useState([]);
	const [currentTemplate, setCurrentTemplate] = useState(null);
	const [currentFileId, setCurrentFileId] = useState(null);
	const [templates, setTemplates] = useState([]);
	const [currentDocId, setCurrentDocId] = useState(null);
	const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
	const [analysisIds, setAnalysisIds] = useState([]);
	const [tableInfoContent, setTableInfoContent] = useState('Đang tải thông tin bảng...');

	// Component state
	const [showTemplateSearchForm, setShowTemplateSearchForm] = useState(false);
	const [showEditSavedReportForm, setShowEditSavedReportForm] = useState(false);
	const [templateMinimized, setTemplateMinimized] = useState(true);
	const [documentReportsMinimized, setDocumentReportsMinimized] = useState(true);

	// New states for enhanced functionality
	const [savedReports, setSavedReports] = useState([]);
	const [savedReportsLoading, setSavedReportsLoading] = useState(false);
	const [templateSearchLoading, setTemplateSearchLoading] = useState(false);

	// Document information state
	const [documentStatus, setDocumentStatus] = useState('Draft'); // 'Draft' | 'Published'
	const [publishedBy, setPublishedBy] = useState('');
	const [publishedAt, setPublishedAt] = useState('');
	const [lastModified, setLastModified] = useState('');
	const [lastModifiedAt, setLastModifiedAt] = useState('');
	const [author, setAuthor] = useState('');
	const [authorAt, setAuthorAt] = useState('');
	const [documentType, setDocumentType] = useState('BIEN_BAN_KET_QUA_THU_NGHIEM'); // Default to test result report

	const [editorContent, setEditorContent] = useState('');

	// Popup states
	const [showDiagramPopup, setShowDiagramPopup] = useState(false);
	const [showMathPopup, setShowMathPopup] = useState(false);

	// Refs
	const editorRef = useRef(null);
	const autoSaveIntervalRef = useRef(null);

	// Available columns
	const availableColumns = {
		sample_uid: 'Mã mẫu',
		id: 'Mã chỉ tiêu',
		parameter_name: 'Chỉ tiêu',
	};

	useEffect(() => {
		// Load MathLive dynamically
		const loadMathLive = async () => {
			if (!window.MathLive) {
				try {
					const { convertLatexToMarkup } = await import('https://unpkg.com/mathlive/dist/mathlive.min.mjs');
					window.convertLatexToMarkup = convertLatexToMarkup;
				} catch (error) {
					console.warn('MathLive could not be loaded:', error);
				}
			}
		};

		loadMathLive();

		// Update current date
		updateCurrentDate();

		// Load data from URL if available
		loadDataFromURL();

		// Set up interval to update date every 10 seconds
		const dateInterval = setInterval(updateCurrentDate, 10000);

		return () => {
			// Cleanup
			if (autoSaveIntervalRef.current) {
				clearInterval(autoSaveIntervalRef.current);
			}
			clearInterval(dateInterval);
		};
	}, []);

	// Separate useEffect to reload table info when analysisIds change
	useEffect(() => {
		if (analysisIds && analysisIds.length > 0) {
			loadTableInfo();
		}
	}, [analysisIds]);

	// Auto start auto-save when template is selected or content exists
	useEffect(() => {
		if (currentTemplate || editorContent) {
			if (!isAutoSaveEnabled) {
				startAutoSave();
			}
		}
	}, [currentTemplate, editorContent]);

	const initializeTinyMCE = () => {
		// This function is no longer needed as we use TinyMCEEditor component
		return;
	};

	const loadDataFromURL = async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const analysisIdsParam = urlParams.get('analysisIds');
		const docIdParam = urlParams.get('docId');
		const templateIdParam = urlParams.get('templateId');
		const docTypeCodeParam = urlParams.get('docTypeCode');

		// Store analysisIds
		if (analysisIdsParam) {
			const ids = analysisIdsParam.split(',').filter((id) => id.trim());
			setAnalysisIds(ids);
			// Also set global for backward compatibility
			if (typeof window !== 'undefined') {
				window.analysisIds = ids;
			}
		} else {
			setAnalysisIds([]);
			if (typeof window !== 'undefined') {
				window.analysisIds = [];
			}
		}

		// Store docId
		if (docIdParam) {
			setCurrentDocId(docIdParam);
		}

		// Handle docTypeCode
		if (docTypeCodeParam) {
			setDocumentType(docTypeCodeParam);
		}

		// Load template if templateId exists
		if (templateIdParam) {
			try {
				await loadTemplateById(templateIdParam);
			} catch (error) {
				console.error('Failed to load template:', error);
			}
		}

		// Load table info if we have analysisIds
		if (analysisIdsParam) {
			await loadTableInfo();
		}

		// Initialize default content for header and footer after all data is loaded
		setTimeout(initializeDefaultContent, 1000);
	};

	const loadTemplateById = async (templateId) => {
		try {
			const response = await apiPost('https://black.irdop.org/v1/lab/test_report/get_template', {
				id: templateId,
				searchTerm: '',
				page: 1,
			});

			if (response.status === 200 && response.data && response.data.result && response.data.result.length > 0) {
				const template = response.data.result[0];
				setCurrentTemplate(template);

				// Apply template content to editor if available
				if (template.content && editorRef.current) {
					editorRef.current.setContent(template.content);
					setEditorContent(template.content);
				}

				// Apply template header data if available
				if (template.header) {
					setHeaderData({
						title: template.header.title || '',
						code: template.header.code || '',
						publishNo: template.header.publishNo || '',
						publishDate: template.header.publishDate || '',
					});
				}

				showAutoHideMessage(`Đã tải mẫu: ${template.templateName || template.name}`, 'success');
			}
		} catch (error) {
			console.error('Error loading template:', error);
			showAutoHideMessage('Lỗi khi tải mẫu biên bản', 'error');
		}
	};

	const loadTableInfo = async () => {
		try {
			if (!analysisIds || analysisIds.length === 0) {
				setTableInfoContent('Không có ID phân tích để hiển thị thông tin bảng.');
				return;
			}

			const response = await apiPost('https://black.irdop.org/v1/template/get_table', {
				listIds: analysisIds,
			});

			if (response.status !== 200) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = response.data;

			if (result.error) {
				throw new Error(result.error);
			}

			const { tableAnalysisInfo, tableSampleInfo } = result;

			let tableInfoHtml = '';

			// Display sample info
			if (tableSampleInfo && tableSampleInfo.length > 0) {
				tableInfoHtml += '<div style="margin-bottom: 12px;"><strong>Thông tin mẫu thử:</strong></div>';
				tableInfoHtml += '<div style="margin-bottom: 8px;">';
				tableSampleInfo.forEach((sample, index) => {
					if (sample.sample_uid) {
						tableInfoHtml += `<div style="margin-bottom: 4px; padding: 4px; background: white; border-radius: 3px;">
							<span style="font-weight: 500;">${sample.sample_uid}</span> - ${sample.sample_name || 'N/A'}
						</div>`;
					}
				});
				tableInfoHtml += '</div>';
			}

			// Display analysis info
			if (tableAnalysisInfo && tableAnalysisInfo.length > 0) {
				tableInfoHtml += '<div style="margin-bottom: 8px;"><strong>Thông tin chỉ tiêu kiểm nghiệm:</strong></div>';
				tableInfoHtml += '<div>';
				tableAnalysisInfo.forEach((analysis, index) => {
					tableInfoHtml += `<div style="margin-bottom: 4px; padding: 4px; background: white; border-radius: 3px;">
						<span style="font-weight: 500;">${analysis.sample_uid || 'N/A'}</span> - 
						${analysis.parameter_name || 'N/A'}
					</div>`;
				});
				tableInfoHtml += '</div>';
			}

			if (!tableInfoHtml) {
				tableInfoHtml = 'Không có thông tin bảng để hiển thị.';
			}

			setTableInfoContent(tableInfoHtml);
		} catch (error) {
			console.error('Error loading table info:', error);
			setTableInfoContent(`<div style="color: #ef4444;">Lỗi khi tải thông tin bảng: ${error.message}</div>`);
		}
	};

	const initializeDefaultContent = () => {
		// Only set default content if no docId exists and header fields are empty
		if (!currentDocId) {
			// Don't auto-fill any values for header fields
			// Just keep current values if they exist
			const currentHeader = headerData;
			setHeaderData({
				title: currentHeader.title || '',
				code: currentHeader.code || '',
				publishNo: currentHeader.publishNo || '',
				publishDate: currentHeader.publishDate || '',
			});
		}
	};

	const previewReport = async () => {
		const shouldFormat = window.confirm('Bạn có muốn định dạng lại tài liệu để phù hợp với trang in không?');

		if (shouldFormat) {
			formatReset();
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		try {
			if (!currentDocId) {
				await autoSaveLabResultReport();
				if (!currentDocId) {
					throw new Error('Không thể tạo mã tài liệu. Vui lòng thử lại.');
				}
			}
			await createLabResultReport();
		} catch (error) {
			console.error('Error in preview:', error);
			alert('Lỗi khi tạo preview: ' + error.message);
		}
	};

	const clearFormatting = () => {
		if (editorRef.current) {
			formatReset();
		}
	};

	const clearAllContent = () => {
		if (editorRef.current) {
			if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ nội dung? Hành động này không thể hoàn tác.')) {
				setEditorContent('');
				setHeaderData({
					title: '',
					code: '',
					publishNo: '',
					publishDate: '',
				});
				setCurrentDocId(null);
				setCurrentTemplate(null);
				setCurrentFileId(null);
			}
		}
	};

	const formatReset = () => {
		// Check if editor is available and initialized
		if (!editorRef.current) {
			showAutoHideMessage('Editor chưa được khởi tạo, vui lòng chờ một chút...', 'warning');
			setTimeout(() => formatReset(), 500);
			return;
		}

		// Wait for TinyMCE to be fully initialized
		const editor = editorRef.current;
		if (!editor.initialized) {
			showAutoHideMessage('Editor đang được khởi tạo, vui lòng chờ một chút...', 'warning');
			setTimeout(() => formatReset(), 500);
			return;
		}

		try {
			// Double check that methods exist
			if (typeof editor.getContent !== 'function' || typeof editor.setContent !== 'function') {
				showAutoHideMessage('Editor chưa sẵn sàng, vui lòng thử lại...', 'warning');
				return;
			}

			const content = editor.getContent();
			if (!content) {
				showAutoHideMessage('Không có nội dung để định dạng', 'warning');
				return;
			}

			const cleanedContent = applyFormatToHTML(content);
			editor.setContent(cleanedContent);
			setEditorContent(cleanedContent);

			showAutoHideMessage('Đã định dạng lại các elements thành công!', 'success');
		} catch (error) {
			console.error('Error in formatReset:', error);
			showAutoHideMessage('Lỗi khi định dạng: ' + error.message, 'error');
		}
	};

	const autoSaveLabResultReport = async () => {
		try {
			const content =
				editorRef.current && editorRef.current.getContent ? editorRef.current.getContent() : editorContent;
			const footerContent = currentDocId || '';

			const requestBody = {
				metadata: {
					templateId: currentTemplate?.id || null,
					templateName: currentTemplate?.templateName || currentTemplate?.name || null,
					header: headerData, // Now this is a JSONB object
					content: content,
					footer: footerContent,
					analysisIds: analysisIds || [],
				},
			};

			// Add editorId if we have docId
			if (currentDocId) {
				requestBody.editorId = currentDocId;
			}

			const response = await apiPost('https://red.irdop.org/v1/editor/auto_save/lab_result_report', requestBody);

			if (response.status === 200 && response.data && response.data.id) {
				// If this is the first save (no docId yet), update URL and footer
				if (!currentDocId) {
					const newDocId = response.data.id;
					setCurrentDocId(newDocId);
					updateURLWithDocId(newDocId);

					// Show success message for first save
					showAutoHideMessage(`Đã tạo mã tài liệu: ${newDocId}`, 'success');
				}

				// Update document info with auto-save data
				updateDocumentInfo(
					response.data.id,
					response.data.createdAt,
					response.data.modifiedAt || new Date().toISOString(),
					response.data.authorName,
					response.data.modifiedBy,
				);
			} else {
				console.warn('Auto-save response did not contain expected data:', response);
			}
		} catch (error) {
			console.error('Auto-save error:', error);
		}
	};

	const createLabResultReport = async () => {
		try {
			// Prepare report data with exact structure: {header, content, footer, analysisIds}
			const reportData = {
				header: headerData,
				content: editorContent,
				footer: currentDocId
					? `Document fingerprint: ${currentDocId} - ${new Date().toLocaleDateString('vi-VN')}`
					: 'Document fingerprint: - -',
				analysisIds: analysisIds || [],
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/convert/lab_result_report_html', reportData);

			if (response.status === 200 && response.data) {
				showAutoHideMessage('Đã tạo preview thành công!', 'success');

				// Show popup instead of new tab
				const htmlResponse = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
				showPreviewPopup(htmlResponse, {
					docId: currentDocId,
					metadata: {
						templateId: currentTemplate?.id,
						templateName: currentTemplate?.templateName || currentTemplate?.name,
						header: headerData,
						content: editorContent,
						footer: reportData.footer,
						analysisIds: analysisIds || [],
						documentHTML: htmlResponse,
					},
				});
			} else {
				throw new Error('Failed to create lab result report');
			}
		} catch (error) {
			console.error('Error creating lab result report:', error);
			showAutoHideMessage('Lỗi khi tạo báo cáo: ' + error.message, 'error');
		}
	};

	const updateDocumentInfo = (
		docId = null,
		createdAt = null,
		modifiedAt = null,
		authorName = null,
		modifiedBy = null,
	) => {
		if (docId && docId !== currentDocId) {
			setCurrentDocId(docId);
		}

		// Update document information state
		if (createdAt) {
			const date = new Date(createdAt).toLocaleDateString('vi-VN');
			let author = '-';
			if (authorName && authorName.includes(':')) {
				author = authorName.split(':')[1] || '-';
			}
			setAuthor(author);
			setAuthorAt(date);
		}

		if (modifiedAt) {
			const date = new Date(modifiedAt).toLocaleDateString('vi-VN');
			let modifier = '-';
			if (modifiedBy && modifiedBy.includes(':')) {
				modifier = modifiedBy.split(':')[1] || '-';
			}
			setLastModified(modifier);
			setLastModifiedAt(date);
		}
	};

	const openParameterSelectionPopup = () => {
		// Create popup overlay
		const overlay = document.createElement('div');
		overlay.id = 'parameterSelectionOverlay';
		overlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			background: rgba(0, 0, 0, 0.5);
			z-index: 10000;
			display: flex;
			align-items: center;
			justify-content: center;
		`;

		// Create popup container
		const popup = document.createElement('div');
		popup.style.cssText = `
			background: white;
			border-radius: 8px;
			width: 90vw;
			max-width: 1200px;
			height: 80vh;
			display: flex;
			flex-direction: column;
			box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
		`;

		// Create iframe to load SelectAnalysis.html
		const iframe = document.createElement('iframe');
		iframe.src = 'SelectAnalysis.html';
		iframe.style.cssText = `
			width: 100%;
			height: 100%;
			border: none;
			border-radius: 8px;
		`;

		// Handle iframe load to pass current analysis IDs
		iframe.onload = function () {
			try {
				const iframeWindow = iframe.contentWindow;
				if (iframeWindow && analysisIds) {
					// Pass current analysis IDs to the popup
					iframeWindow.postMessage(
						{
							type: 'INIT_SELECTION',
							analysisIds: analysisIds || [],
						},
						'*',
					);
				}
			} catch (error) {
				console.error('Could not communicate with iframe:', error);
			}
		};

		popup.appendChild(iframe);
		overlay.appendChild(popup);
		document.body.appendChild(overlay);

		// Handle messages from iframe
		const messageHandler = function (event) {
			if (event.data && event.data.type === 'SELECTION_CONFIRMED') {
				// Update analysis IDs and reload table info
				const newAnalysisIds = event.data.analysisIds || [];
				setAnalysisIds(newAnalysisIds);

				// Also update global for backward compatibility
				if (typeof window !== 'undefined') {
					window.analysisIds = newAnalysisIds;
				}

				// Update URL with new analysis IDs
				updateURLWithAnalysisIds(newAnalysisIds);

				// Reload table information
				loadTableInfo();

				// Auto-insert/replace table data when selection changes
				setTimeout(() => {
					insertTableInfo();
				}, 500);

				// Close popup
				closeParameterSelectionPopup();

				// Remove event listener
				window.removeEventListener('message', messageHandler);
			} else if (event.data && event.data.type === 'SELECTION_CANCELLED') {
				// Close popup without changes
				closeParameterSelectionPopup();

				// Remove event listener
				window.removeEventListener('message', messageHandler);
			}
		};

		// Listen for messages from iframe
		window.addEventListener('message', messageHandler);

		// Close on overlay click
		overlay.addEventListener('click', function (e) {
			if (e.target === overlay) {
				closeParameterSelectionPopup();
				window.removeEventListener('message', messageHandler);
			}
		});
	};

	const closeParameterSelectionPopup = () => {
		const overlay = document.getElementById('parameterSelectionOverlay');
		if (overlay) {
			overlay.remove();
		}
	};

	const insertTableInfo = async () => {
		// This function inserts the current analysis data as a table in the editor
		if (!analysisIds || analysisIds.length === 0) {
			showAutoHideMessage('Không có chỉ tiêu nào được chọn để chèn bảng', 'warning');
			return;
		}

		// Check if editor is available and initialized
		if (!editorRef.current) {
			showAutoHideMessage('Editor chưa được khởi tạo, vui lòng chờ một chút...', 'warning');
			setTimeout(() => insertTableInfo(), 500);
			return;
		}

		// Wait for TinyMCE to be fully initialized
		const editor = editorRef.current;
		if (!editor.initialized) {
			showAutoHideMessage('Editor đang được khởi tạo, vui lòng chờ một chút...', 'warning');
			setTimeout(() => insertTableInfo(), 500);
			return;
		}

		try {
			// Double check that methods exist
			if (typeof editor.insertContent !== 'function') {
				showAutoHideMessage('Editor chưa sẵn sàng, vui lòng thử lại...', 'warning');
				return;
			}

			// Get fresh table data from API
			const response = await apiPost('https://black.irdop.org/v1/template/get_table', {
				listIds: analysisIds,
			});

			if (response.status !== 200) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = response.data;
			if (result.error) {
				throw new Error(result.error);
			}

			const { tableAnalysisInfo, tableSampleInfo } = result;

			let tableHTML = '';

			// Create sample info table if available
			if (tableSampleInfo && tableSampleInfo.length > 0) {
				const sampleRows = tableSampleInfo
					.map(
						(sample, index) =>
							`<tr><td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${
								index + 1
							}</td><td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${
								sample.sample_uid || 'N/A'
							}</td><td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${
								sample.sample_name || 'N/A'
							}</td></tr>`,
					)
					.join('');

				tableHTML += `
					<h4>Thông tin mẫu thử</h4>
					<table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 16px;">
						<thead>
							<tr>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">STT</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Mã mẫu</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Tên mẫu</th>
							</tr>
						</thead>
						<tbody>
							${sampleRows}
						</tbody>
					</table>
				`;
			}

			// Create analysis info table if available
			if (tableAnalysisInfo && tableAnalysisInfo.length > 0) {
				const analysisRows = tableAnalysisInfo
					.map(
						(analysis, index) =>
							`<tr><td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${
								index + 1
							}</td><td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${
								analysis.sample_uid || 'N/A'
							}</td><td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${
								analysis.parameter_name || 'N/A'
							}</td></tr>`,
					)
					.join('');

				tableHTML += `
					<h4>Thông tin chỉ tiêu kiểm nghiệm</h4>
					<table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
						<thead>
							<tr>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">STT</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Mã mẫu</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Tên chỉ tiêu</th>
							</tr>
						</thead>
						<tbody>
							${analysisRows}
						</tbody>
					</table>
				`;
			}

			if (tableHTML) {
				// Insert the table at the current cursor position
				editor.insertContent(tableHTML);
				showAutoHideMessage('Đã chèn bảng thông tin chỉ tiêu thành công', 'success');
			} else {
				showAutoHideMessage('Không có dữ liệu để tạo bảng', 'warning');
			}
		} catch (error) {
			console.error('Error inserting table info:', error);
			showAutoHideMessage('Lỗi khi chèn bảng: ' + error.message, 'error');
		}
	};

	const toggleTemplateSection = (minimize) => {
		setTemplateMinimized(minimize);
	};

	const toggleDocumentReportsSection = (minimize) => {
		setDocumentReportsMinimized(minimize);
	};

	const showTemplateSearchModal = () => {
		setShowTemplateSearchForm(true);
		// Load available templates when modal opens
		searchTemplatesInModal('');
	};

	const searchTemplatesInModal = async (searchTerm = '') => {
		setTemplateSearchLoading(true);
		try {
			const response = await apiPost('https://black.irdop.org/v1/lab/test_report/get_template', {
				search: searchTerm,
				page: 1,
				size: 20,
			});

			if (response.status === 200 && response.data && response.data.result) {
				setTemplates(response.data.result || []);
			} else {
				setTemplates([]);
				showAutoHideMessage('Không tìm thấy mẫu nào', 'warning');
			}
		} catch (error) {
			console.error('Error searching templates:', error);
			setTemplates([]);
			showAutoHideMessage('Lỗi khi tìm kiếm mẫu', 'error');
		}
		setTemplateSearchLoading(false);
	};

	const selectTemplateFromModal = async (template) => {
		try {
			setCurrentTemplate(template);

			// Apply template content to editor if available
			if (template.content && editorRef.current) {
				editorRef.current.setContent(template.content);
				setEditorContent(template.content);
			}

			// Apply template header data if available
			if (template.header) {
				setHeaderData({
					title: template.header.title || '',
					code: template.header.code || '',
					publishNo: template.header.publishNo || '',
					publishDate: template.header.publishDate || '',
				});
			}

			// Update URL with template ID
			updateURLWithTemplateId(template.id);

			setShowTemplateSearchForm(false);
			showAutoHideMessage(`Đã chọn mẫu: ${template.templateName || template.name}`, 'success');
		} catch (error) {
			console.error('Error selecting template:', error);
			showAutoHideMessage('Lỗi khi chọn mẫu biên bản', 'error');
		}
	};

	const showCreateTemplateModal = () => {
		// Implementation for create template modal
		console.log('Show create template modal');
	};

	// New API functions added from EditorTemplate.html
	const loadSavedReports = async (searchTerm = '') => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/editor/lab_result_report/get_editor', {
				searchTerm: searchTerm,
			});

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}
				return result.result || [];
			} else {
				throw new Error('API response error');
			}
		} catch (error) {
			console.error('Error loading saved reports:', error);
			showAutoHideMessage('Lỗi khi tải danh sách biên bản đã lưu: ' + error.message, 'error');
			return [];
		}
	};

	const createTemplate = async (templateData) => {
		try {
			const requestBody = {
				templateName: templateData.templateName,
				templateDescription: templateData.templateDescription,
				columns: templateData.columns || [
					{ columnName: 'Mã mẫu', valueColumn: 'sample_uid', width: '30%', resizable: true },
					{ columnName: 'Mã chỉ tiêu', valueColumn: 'id', width: '30%', resizable: true },
					{ columnName: 'Chỉ tiêu', valueColumn: 'parameter_name', width: '40%', resizable: true },
				],
				customRows: [],
				header: templateData.header || headerData,
				content: templateData.content || editorContent,
				footer:
					templateData.footer ||
					`Document fingerprint: ${currentDocId || ''} - ${new Date().toLocaleDateString('vi-VN')}`,
			};

			// Add fileId if available
			if (templateData.fileId) {
				requestBody.fileId = templateData.fileId;
			}

			const response = await apiPost('https://black.irdop.org/v1/lab/test_report/create_template', requestBody);

			if (response.status < 300 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}
				showAutoHideMessage('Tạo mẫu thành công!', 'success');
				return result;
			} else {
				throw new Error('Lỗi API: ' + (response.data?.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Lỗi khi tạo template:', error);
			showAutoHideMessage('Có lỗi xảy ra khi tạo mẫu: ' + error.message, 'error');
			throw error;
		}
	};

	const updateTemplate = async (templateId, templateData) => {
		try {
			const requestBody = {
				id: templateId,
				templateName: templateData.templateName,
				templateDescription: templateData.templateDescription,
				columns: templateData.columns || [
					{ columnName: 'Mã mẫu', valueColumn: 'sample_uid', width: '30%', resizable: true },
					{ columnName: 'Mã chỉ tiêu', valueColumn: 'id', width: '30%', resizable: true },
					{ columnName: 'Chỉ tiêu', valueColumn: 'parameter_name', width: '40%', resizable: true },
				],
				customRows: [],
				header: templateData.header || headerData,
				content: templateData.content || editorContent,
				footer:
					templateData.footer ||
					`Document fingerprint: ${currentDocId || ''} - ${new Date().toLocaleDateString('vi-VN')}`,
			};

			// Add fileId if available
			if (templateData.fileId) {
				requestBody.fileId = templateData.fileId;
			}

			const response = await apiPost('https://black.irdop.org/v1/lab/test_report/update_template', requestBody);

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}
				showAutoHideMessage('Cập nhật mẫu thành công!', 'success');
				return result;
			} else {
				throw new Error('Lỗi API: ' + (response.data?.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Lỗi khi cập nhật template:', error);
			showAutoHideMessage('Có lỗi xảy ra khi cập nhật mẫu: ' + error.message, 'error');
			throw error;
		}
	};

	const deleteTemplate = async (templateId) => {
		try {
			const response = await apiPost('https://black.irdop.org/v1/lab/test_report/delete_template', {
				id: templateId,
			});

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}
				showAutoHideMessage('Xóa mẫu thành công!', 'success');
				return result;
			} else {
				throw new Error('Lỗi API: ' + (response.data?.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Error deleting template:', error);
			showAutoHideMessage('Lỗi khi xóa mẫu: ' + error.message, 'error');
			throw error;
		}
	};

	const uploadFile = async (file) => {
		try {
			const uploadPayload = {
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			};

			const uploadResponse = await apiPost('https://red.irdop.org/v1/file/upload', uploadPayload);

			if (uploadResponse.status !== 200 || !uploadResponse.data.result) {
				throw new Error('Failed to upload file');
			}

			const { fileId } = uploadResponse.data.result;
			showAutoHideMessage('Upload file thành công!', 'success');
			return fileId;
		} catch (error) {
			console.error('File upload error:', error);
			showAutoHideMessage('Lỗi khi upload file: ' + error.message, 'error');
			throw error;
		}
	};

	const exportDocument = async () => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/document/export', {
				docId: currentDocId,
				format: 'pdf', // or 'docx', 'html'
				metadata: {
					templateId: currentTemplate?.id || null,
					templateName: currentTemplate?.templateName || null,
					analysisIds: analysisIds || [],
					title: headerData.title || 'Lab Result Report',
				},
			});

			if (response.status === 200 && response.data) {
				// Handle blob response for file download
				const blob = response.data;
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.style.display = 'none';
				a.href = url;
				a.download = `${headerData.title || 'document'}_${currentDocId || 'new'}.pdf`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				showAutoHideMessage('Xuất file thành công!', 'success');
			} else {
				throw new Error('Failed to export document');
			}
		} catch (error) {
			console.error('Export error:', error);
			showAutoHideMessage('Lỗi khi xuất file: ' + error.message, 'error');
		}
	};

	// Preview Popup Function
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
			border-radius: 8px;
			width: 95vw;
			height: 90vh;
			display: flex;
			flex-direction: column;
			box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
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

		// Publish button
		const publishBtn = document.createElement('button');
		publishBtn.textContent = 'Publish';
		publishBtn.style.cssText = `
			padding: 8px 16px;
			background: #10b981;
			color: white;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			font-weight: 500;
			font-size: 14px;
			transition: background-color 0.2s;
		`;
		publishBtn.onmouseover = () => (publishBtn.style.background = '#059669');
		publishBtn.onmouseout = () => (publishBtn.style.background = '#10b981');
		publishBtn.onclick = () => handlePublishDocument(documentData);

		// Download button
		const downloadBtn = document.createElement('button');
		downloadBtn.textContent = 'Download PDF';
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
		downloadBtn.onclick = () => downloadDocumentPDF(htmlContent);

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

		buttonGroup.appendChild(publishBtn);
		buttonGroup.appendChild(downloadBtn);
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

	// Handle document publish
	const handlePublishDocument = async (documentData) => {
		try {
			if (!documentData.docId) {
				showAutoHideMessage('Không có ID tài liệu để publish', 'error');
				return;
			}

			// Confirm publish action
			const confirmPublish = window.confirm(
				`Bạn có chắc chắn muốn publish tài liệu "${documentData.metadata.header.title || 'Lab Result Report'}"?`,
			);

			if (!confirmPublish) {
				return;
			}

			// Call publish API (similar to EditorTemplate.html logic)
			const publishResponse = await apiPost('https://red.irdop.org/v1/document/publish', {
				docId: documentData.docId,
				metadata: documentData.metadata,
			});

			if (publishResponse.status === 200 && publishResponse.data) {
				showAutoHideMessage('Publish thành công!', 'success');

				// Update document status
				setDocumentStatus('Published');
				setPublishedAt(new Date().toLocaleDateString('vi-VN'));
				setPublishedBy('Current User'); // You might want to get this from auth context

				// Close popup
				const popup = document.getElementById('previewPopupOverlay');
				if (popup) {
					popup.remove();
				}
			} else {
				throw new Error('Lỗi API: ' + (publishResponse.data?.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Publish error:', error);
			showAutoHideMessage('Lỗi khi publish: ' + error.message, 'error');
		}
	};

	// Download document as PDF
	const downloadDocumentPDF = async (htmlContent) => {
		try {
			// Convert HTML to PDF and trigger download
			const blob = new Blob([htmlContent], { type: 'text/html' });
			const url = URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = `${headerData.title || 'Lab_Result_Report'}_${new Date().toLocaleDateString('vi-VN')}.html`;
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

	// Utility functions
	const updateCurrentDate = () => {
		const currentDateDisplay = document.getElementById('currentDateDisplay');
		if (currentDateDisplay) {
			const now = new Date();
			const dateString = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN');
			currentDateDisplay.textContent = dateString;
		}
	};

	const getDocIdFromURL = () => {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get('docId');
	};

	const updateURLWithAnalysisIds = (analysisIds) => {
		const url = new URL(window.location);
		if (analysisIds && analysisIds.length > 0) {
			url.searchParams.set('analysisIds', analysisIds.join(','));
		} else {
			url.searchParams.delete('analysisIds');
		}
		// Add current docTypeCode
		url.searchParams.set('docTypeCode', documentType);
		window.history.replaceState({}, '', url);
	};

	const updateURLWithDocId = (docId) => {
		const url = new URL(window.location);
		if (docId) {
			url.searchParams.set('docId', docId);
		} else {
			url.searchParams.delete('docId');
		}
		// Ensure current docTypeCode is set
		url.searchParams.set('docTypeCode', documentType);
		window.history.replaceState({}, '', url);
	};

	const updateURLWithTemplateId = (templateId) => {
		const url = new URL(window.location);
		if (templateId) {
			url.searchParams.set('templateId', templateId);
		} else {
			url.searchParams.delete('templateId');
		}
		// Ensure current docTypeCode is set
		url.searchParams.set('docTypeCode', documentType);
		window.history.replaceState({}, '', url);
	};

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
				messageDiv.style.backgroundColor = '#10B981';
				break;
			case 'error':
				messageDiv.style.backgroundColor = '#EF4444';
				break;
			case 'warning':
				messageDiv.style.backgroundColor = '#F59E0B';
				break;
			default:
				messageDiv.style.backgroundColor = '#3B82F6';
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

	const startAutoSave = () => {
		if (autoSaveIntervalRef.current) {
			clearInterval(autoSaveIntervalRef.current);
		}

		setIsAutoSaveEnabled(true);
		// Save immediately first, then every 30 seconds
		autoSaveLabResultReport();
		autoSaveIntervalRef.current = setInterval(() => {
			autoSaveLabResultReport();
		}, 30000);
	};

	const stopAutoSave = () => {
		if (autoSaveIntervalRef.current) {
			clearInterval(autoSaveIntervalRef.current);
			autoSaveIntervalRef.current = null;
		}
		setIsAutoSaveEnabled(false);
	};

	const showEditSavedReportModal = () => {
		setShowEditSavedReportForm(true);
	};

	const handleMathClick = () => {
		setShowMathPopup(true);
	};

	const handleDiagramClick = () => {
		setShowDiagramPopup(true);
	};

	const closeMathPopup = () => {
		setShowMathPopup(false);
	};

	const closeDiagramPopup = () => {
		setShowDiagramPopup(false);
	};

	const handleDocumentTypeChange = (e) => {
		const newDocType = e.target.value;
		setDocumentType(newDocType);

		// Update URL with new docTypeCode
		const url = new URL(window.location);
		url.searchParams.set('docTypeCode', newDocType);
		window.history.replaceState({}, '', url);
	};

	// Initialize document info on component mount
	useEffect(() => {
		const now = new Date();
		const dateTimeString = now.toLocaleString('vi-VN');
		setAuthor('Người dùng hiện tại');
		setAuthorAt(dateTimeString);
		setLastModified('Người dùng hiện tại');
		setLastModifiedAt(dateTimeString);
	}, []);

	return (
		<>
			{/* MathLive CSS and Scripts */}
			<link rel="stylesheet" href="https://unpkg.com/mathlive/dist/mathlive-static.css" />
			<style>
				{`
        /* MathLive Styles */
        .draggable-math { 
          cursor: move; 
          display: inline-block; 
          padding: 8px 12px; 
          margin: 4px; 
          border: 2px solid #6b7280; 
          background: white; 
          border-radius: 6px;
          font-size: 12px;
          user-select: none;
          transition: all 0.2s ease;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .draggable-math:hover {
          background: #f9fafb;
          border-color: #4b5563;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        math-field {
          border: 2px solid #6b7280;
          border-radius: 8px;
          padding: 12px;
          min-height: 60px;
          width: 100%;
          display: block;
          margin: 12px 0;
          background: white;
          color: black;
        }
        math-field:focus {
          border-color: #374151;
          outline: none;
          box-shadow: 0 0 0 3px rgba(75, 85, 99, 0.1);
        }

        /* Modern TinyMCE Custom Styles */
        .tox-tinymce {
          border: 2px solid #6b7280 !important;
          border-radius: 4px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
          overflow: hidden !important;
        }

        .tox-toolbar-overlord {
          background: white !important;
          border-bottom: 2px solid #6b7280 !important;
          border-radius: 0 !important;
          padding: 8px !important;
        }

        .tox .tox-toolbar__group:not(:last-of-type) {
          border-right: 2px solid #e5e7eb !important;
        }

        /* Reset TinyMCE buttons to default styling - don't apply custom styles */
        .tox .tox-tbtn {
          margin: 2px !important;
          border-radius: 4px !important;
          transition: all 0.2s ease !important;
          background: transparent !important;
          border: none !important;
          font-weight: normal !important;
          color: #222f3e !important;
          box-shadow: none !important;
          padding: 4px 8px !important;
        }

        .tox .tox-tbtn:hover {
          background: #e2e8f0 !important;
          border: none !important;
          box-shadow: none !important;
        }

        .tox .tox-tbtn--enabled,
        .tox .tox-tbtn[aria-pressed="true"] {
          background: #cbd5e0 !important;
          border: none !important;
          color: #222f3e !important;
          box-shadow: none !important;
        }

        .tox-edit-area {
          border: none !important;
        }

        .tox-edit-area iframe {
          border-radius: 0 0 6px 6px !important;
        }

        /* Fix bottom border issue */
        .tox-statusbar {
          display: none !important;
        }

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        ::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 6px;
        }

        ::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
          background-clip: content-box;
        }

        /* Hide scrollbar for sidebar */
        .sidebar-container {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* Internet Explorer 10+ */
        }

        .sidebar-container::-webkit-scrollbar {
          display: none; /* WebKit */
        }

        /* Fix for rounded corners in boxes */
        .rounded-box {
          border-radius: 4px;
          overflow: hidden;
        }

        .rounded-box-header {
          border-radius: 0;
        }

        .rounded-box-content {
          border-radius: 0;
        }

        /* Insert table link styling */
        .insert-table-link {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-block;
          margin-left: 4px;
        }

        .insert-table-link:hover {
          font-weight: 700;
          color: #2563eb;
        }

        /* Radio button custom styling */
        input[type="radio"] {
          appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid #6b7280;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
        }

        input[type="radio"]:checked {
          border-color: #3b82f6;
          background-color: #3b82f6;
        }

        input[type="radio"]:checked::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: white;
        }

        input[type="radio"]:hover {
          border-color: #4b5563;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        `}
			</style>
			<div
				className="m-0 p-0 font-sans h-screen w-lvw overflow-hidden flex gap-5"
				style={{
					padding: '20px',
				}}
			>
				<div
					className="flex gap-4 animate-fadeInUp"
					style={{
						height: 'calc(100vh - 20px)',
						width: '100%',
					}}
				>
					{/* Main Content Area */}
					<div className="flex flex-col flex-1 gap-2 h-full min-w-0 rounded-lg overflow-auto">
						{/* Header Section */}
						<div className="flex-shrink-0">
							<h2 className="text-lg font-semibold text-gray-800 mb-4 text-left">TIÊU ĐỀ VĂN BẢN</h2>
							<div className="grid grid-cols-5 gap-4">
								<div className="col-span-2 flex flex-col">
									<input
										type="text"
										id="headerTitle"
										name="headerTitle"
										placeholder="Nhập tiêu đề..."
										className="w-full px-3 py-2 text-sm font-semibold outline-none transition-all duration-200 bg-white text-black border-2 border-gray-500 rounded-md focus:border-gray-700 shadow-sm"
										value={headerData.title}
										onChange={(e) => setHeaderData({ ...headerData, title: e.target.value })}
									/>
								</div>
								<div className="flex flex-col">
									<input
										type="text"
										id="headerCode"
										name="headerCode"
										placeholder="Nhập mã hiệu..."
										className="w-full px-3 py-2 text-sm font-semibold outline-none transition-all duration-200 bg-white text-black border-2 border-gray-500 rounded-md focus:border-gray-700 shadow-sm"
										value={headerData.code}
										onChange={(e) => setHeaderData({ ...headerData, code: e.target.value })}
									/>
								</div>
								<div className="flex flex-col">
									<input
										type="text"
										id="publishNo"
										name="publishNo"
										placeholder="Nhập lần ban hành..."
										className="w-full px-3 py-2 text-sm font-semibold outline-none transition-all duration-200 bg-white text-black border-2 border-gray-500 rounded-md focus:border-gray-700 shadow-sm"
										value={headerData.publishNo}
										onChange={(e) => setHeaderData({ ...headerData, publishNo: e.target.value })}
									/>
								</div>
								<div className="flex flex-col">
									<input
										type="text"
										id="publishDate"
										name="publishDate"
										placeholder="Nhập ngày ban hành..."
										className="w-full px-3 py-2 text-sm font-semibold outline-none transition-all duration-200 bg-white text-black border-2 border-gray-500 rounded-md focus:border-gray-700 shadow-sm"
										value={headerData.publishDate}
										onChange={(e) => setHeaderData({ ...headerData, publishDate: e.target.value })}
									/>
								</div>
							</div>
						</div>

						{/* Editor Section */}
						<div
							className="flex-1 hover:shadow-md transition-all flex flex-col"
							style={{ margin: '16px 0', minHeight: '0', maxHeight: 'calc(100vh - 230px)' }}
						>
							{/* Editor Tools */}
							<div className="flex gap-2 mb-1 flex-shrink-0 justify-between">
								<div className="flex gap-2">
									<button
										className="py-1 px-3 text-xs font-semibold bg-white text-black border-2 border-gray-500 rounded hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
										title="Chèn công thức toán học"
										onClick={handleMathClick}
									>
										Math
									</button>

									<button
										className="py-1 px-3 text-xs font-semibold bg-white text-black border-2 border-gray-500 rounded hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
										title="Chèn sơ đồ"
										onClick={handleDiagramClick}
									>
										Diagram
									</button>
								</div>

								<div className="flex gap-2">
									<button
										id="clearFormattingBtn"
										className="py-1 px-3 text-xs font-semibold bg-white text-black border-2 border-gray-500 rounded hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
										title="Xóa toàn bộ định dạng"
										onClick={clearFormatting}
									>
										Format
									</button>
									<button
										id="clearAllBtn"
										className="py-1 px-3 text-xs font-semibold bg-white text-black border-2 border-gray-500 rounded hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
										title="Xóa toàn bộ nội dung"
										onClick={clearAllContent}
									>
										Clear
									</button>
								</div>
							</div>
							<div
								className="w-full flex-1 overflow-hidden"
								style={{
									minHeight: '300px',
									display: 'flex',
									flexDirection: 'column',
									borderRadius: '4px',
								}}
							>
								<TinyMCEEditor
									ref={editorRef}
									value={editorContent}
									onEditorChange={(content) => setEditorContent(content)}
									onInit={(evt, editor) => {
										editorRef.current = editor;
										editor.initialized = true;
									}}
									init={{
										height: '100%',
										min_height: 300,
										max_height: 500,
										width: '100%',
										statusbar: false,
										promotion: false,
										menubar: false,
										quickbars_selection_toolbar: false,
										quickbars_insert_toolbar: false,
										contextmenu: false,
										inline_boundaries: false,
										toolbar_mode: 'wrap',
										resize: 'both',
										autoresize_max_height: 500,
										autoresize_min_height: 300,
										plugins: [
											'advlist',
											'autolink',
											'lists',
											'link',
											'image',
											'charmap',
											'preview',
											'anchor',
											'searchreplace',
											'visualblocks',
											'code',
											'fullscreen',
											'insertdatetime',
											'media',
											'table',
											'help',
											'wordcount',
											'emoticons',
											'codesample',
											'pagebreak',
											'nonbreaking',
											'quickbars',
										],
										toolbar:
											'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight checklist numlist bullist indent outdent anchor table tabledelete tableprops tablerowprops tablecellprops tableinsertrowbefore tableinsertrowafter tabledeleterow tableinsertcolbefore tableinsertcolafter tabledeletecol',
										content_style: `
                    * {
                      box-sizing: border-box !important;
                    }
                    body { 
                      font-family: 'Times New Roman', Times, serif; 
                      font-size: 16px; 
                      line-height: 1.6;
                      margin: 0;
                      background: white;
                      box-sizing: border-box;
                      padding: 10mm;
                      padding-top: 2mm;
                      width: 100%;
                    }
                    p {
                      margin: 2px 0;
                      box-sizing: border-box;
                    }
                    table {
                      border-collapse: collapse;
                      border: 1px solid #ccc;
                      box-sizing: border-box;
                      width: 100%;
                      max-width: 100%;
                    }
                    table th, table td {
                      border: 1px solid #ccc;
                      padding: 8px;
                      vertical-align: top;
                      box-sizing: border-box;
                    }
                    table th {
                      background-color: #f9f9f9;
                      font-weight: bold;
                      box-sizing: border-box;
                    }
                  `,
										table_default_attributes: {
											border: '1',
											cellpadding: '8',
											cellspacing: '0',
										},
										table_default_styles: {
											'border-collapse': 'collapse',
											border: '1px solid #ccc',
										},
										table_cell_default_styles: {
											border: '1px solid #ccc',
											padding: '8px',
											'vertical-align': 'top',
										},
										table_header_default_styles: {
											'background-color': '#f9f9f9',
											'font-weight': 'bold',
											border: '1px solid #ccc',
											padding: '8px',
										},
										table_resize_bars: true,
										table_grid: true,
										table_tab_navigation: true,
										table_class_list: [
											{ title: 'Không border', value: 'no-border' },
											{ title: 'Border mỏng', value: 'thin-border' },
											{ title: 'Border đậm', value: 'border-strong' },
											{ title: 'Bảng dữ liệu', value: 'data-table' },
										],
										table_cell_class_list: [
											{ title: 'Căn trái', value: 'text-left' },
											{ title: 'Căn giữa', value: 'text-center' },
											{ title: 'Căn phải', value: 'text-right' },
										],
										table_row_class_list: [
											{ title: 'Hàng header', value: 'header-row' },
											{ title: 'Hàng chẵn', value: 'even-row' },
											{ title: 'Hàng lẻ', value: 'odd-row' },
										],
										setup: function (editor) {
											editor.on('init', async function () {
												// Mark editor as initialized
												if (editorRef.current) {
													editorRef.current.initialized = true;
												}
												await loadDataFromURL();
											});
										},
									}}
								/>
							</div>
						</div>

						{/* Footer Section */}
						<div
							className="bg-white border-2 border-gray-500 shadow-sm hover:border-gray-700 hover:shadow-md transition-all overflow-hidden flex-shrink-0"
							style={{ borderRadius: '4px' }}
						>
							<div className="p-4 text-sm bg-white" style={{ fontFamily: "'Times New Roman', serif" }}>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<label className="font-semibold text-gray-700 text-left">Mã tài liệu:</label>
										<input
											id="footerDocIdInput"
											type="text"
											readOnly
											placeholder="Chưa có mã"
											className="px-3 py-1 text-sm font-semibold bg-white text-black min-w-32 border-2 border-gray-500 rounded-md focus:border-gray-700 shadow-sm"
											style={{ fontFamily: "'Times New Roman', serif" }}
											value={currentDocId || ''}
										/>
									</div>
									<span
										id="currentDateDisplay"
										className="text-gray-600 font-semibold"
										style={{ fontFamily: "'Times New Roman', serif" }}
									></span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Sidebar */}
				<div
					className="overflow-y-auto box-border flex flex-col relative sidebar-container"
					style={{
						flex: '0 0 max(17vw, 300px)',
						width: 'max(20vw, 350px)',
						height: '100%',
						maxHeight: 'calc(100vh - 20px)',
					}}
				>
					<div className="flex flex-col gap-4" style={{ height: '100%' }}>
						{/* Box 1: Thông tin */}
						<div className="bg-white rounded-box border-2 border-gray-500 shadow-sm hover:border-gray-700 hover:shadow-md transition-all min-h-fit">
							<div className="bg-white text-gray-800 px-4 py-3 border-b-2 border-gray-500 font-semibold text-sm text-left rounded-box-header">
								Thông tin
							</div>
							<div className="p-4 bg-white rounded-box-content min-h-fit">
								<div className="space-y-3 text-sm text-left">
									<div className="text-left">
										<span className="font-semibold text-gray-700">Trạng thái: </span>
										{documentStatus === 'Published' ? (
											<span className="text-gray-600 font-semibold">
												Publish {publishedBy && `by ${publishedBy}`} {publishedAt && `at ${publishedAt}`}
											</span>
										) : (
											<span className="text-gray-600 font-semibold">Draft</span>
										)}
									</div>
									<div className="text-left">
										<span className="font-semibold text-gray-700">Sửa đổi lần cuối: </span>
										<span className="text-gray-600 font-semibold">
											{lastModified} at {lastModifiedAt}
										</span>
									</div>
									<div className="text-left">
										<span className="font-semibold text-gray-700">Tác giả: </span>
										<span className="text-gray-600 font-semibold">
											{author} at {authorAt}
										</span>
									</div>
									<div className="mt-4 pt-3 border-t border-gray-200">
										<button
											id="previewBtn"
											className="w-full py-2 px-3 text-sm font-semibold transition-all duration-300 text-center bg-white text-black border-2 border-gray-500 rounded-md hover:bg-gray-50 hover:border-gray-700 shadow-sm"
											title="Preview biên bản"
											onClick={previewReport}
										>
											Preview
										</button>
									</div>
								</div>
							</div>
						</div>

						{/* Box 2: Loại văn bản */}
						<div className="bg-white rounded-box border-2 border-gray-500 shadow-sm hover:border-gray-700 hover:shadow-md transition-all min-h-fit">
							<div className="bg-white text-gray-800 px-4 py-3 border-b-2 border-gray-500 font-semibold text-sm text-left rounded-box-header">
								Loại văn bản
							</div>
							<div className="p-4 bg-white rounded-box-content min-h-fit">
								<div className="space-y-3">
									<div className="flex items-center">
										<input
											type="radio"
											id="bien_ban"
											name="documentType"
											value="BIEN_BAN_KET_QUA_THU_NGHIEM"
											checked={documentType === 'BIEN_BAN_KET_QUA_THU_NGHIEM'}
											onChange={handleDocumentTypeChange}
											className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
										/>
										<label
											htmlFor="bien_ban"
											className={`ml-3 text-sm font-semibold cursor-pointer transition-colors duration-200 ${
												documentType === 'BIEN_BAN_KET_QUA_THU_NGHIEM' ? 'text-blue-600' : 'text-gray-700'
											}`}
										>
											Biên bản kiểm nghiệm
										</label>
									</div>

									<div className="flex items-center">
										<input
											type="radio"
											id="tai_lieu"
											name="documentType"
											value="TAI_LIEU_KHAC"
											checked={documentType === 'TAI_LIEU_KHAC'}
											onChange={handleDocumentTypeChange}
											className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
										/>
										<label
											htmlFor="tai_lieu"
											className={`ml-3 text-sm font-semibold cursor-pointer transition-colors duration-200 ${
												documentType === 'TAI_LIEU_KHAC' ? 'text-blue-600' : 'text-gray-700'
											}`}
										>
											Tài liệu khác
										</label>
									</div>
								</div>

								{/* Thông tin mẫu biên bản (chỉ hiện khi chọn biên bản kiểm nghiệm) */}
								{documentType === 'BIEN_BAN_KET_QUA_THU_NGHIEM' && (
									<div className="mt-4">
										<div className="text-sm font-semibold text-gray-700 mb-2 text-left ml-2">
											Thông tin mẫu biên bản
										</div>
										<div className="">
											{currentTemplate ? (
												<div className="space-y-2">
													<div className="ml-4 -3 bg-gray-50 rounded-lg border-2 border-gray-400">
														<div className="text-sm font-semibold text-gray-800 text-left">
															{currentTemplate.templateName || 'Mẫu đã chọn'}
														</div>
														<div className="text-xs text-gray-600 text-left">Mã: {currentTemplate.id || '-'}</div>
													</div>
													<button
														className="w-full py-2 px-3 text-sm font-semibold bg-white text-black border-2 border-gray-500 rounded-md hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
														onClick={showTemplateSearchModal}
													>
														Thay đổi mẫu
													</button>
												</div>
											) : (
												<div className="space-y-2">
													<div className="ml-4 text-sm text-gray-600 mb-2 font-semibold text-left">
														Chưa chọn mẫu biên bản
													</div>
													<button
														className="w-full py-2 px-3 text-sm font-semibold bg-white text-black border-2 border-gray-500 rounded-md hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
														onClick={showTemplateSearchModal}
													>
														Tìm kiếm mẫu
													</button>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Box 3: Thông tin liên quan */}
						<div className="bg-white rounded-box border-2 border-gray-500 shadow-sm hover:border-gray-700 hover:shadow-md transition-all flex-1 min-h-fit">
							<div className="bg-white text-gray-800 px-4 py-3 border-b-2 border-gray-500 font-semibold text-sm text-left rounded-box-header">
								Thông tin liên quan
							</div>
							<div className="p-4 bg-white rounded-box-content min-h-fit">
								{/* Chỉ tiêu đã chọn (chỉ hiện khi là biên bản kiểm nghiệm) */}
								{documentType === 'BIEN_BAN_KET_QUA_THU_NGHIEM' && (
									<div>
										<div className="flex items-center justify-between mb-3">
											<p className="text-sm font-semibold text-gray-700 text-left">
												Chỉ tiêu đã chọn
												{/* Insert table link - only show when we have analysis IDs */}
												{analysisIds && analysisIds.length > 0 && (
													<span className="insert-table-link" title="Chèn bảng vào editor" onClick={insertTableInfo}>
														Chèn bảng
													</span>
												)}
											</p>
											<button
												id="selectParametersBtn"
												className="bg-white text-black px-3 py-1 rounded text-xs font-semibold border-2 border-gray-500 hover:bg-gray-50 hover:border-gray-700 transition-all duration-200 shadow-sm"
												title="Chọn chỉ tiêu"
												onClick={openParameterSelectionPopup}
											>
												Chọn chỉ tiêu
											</button>
										</div>
										<div
											className="text-sm text-gray-600 font-semibold text-left min-h-fit"
											style={{ minHeight: 'auto', height: 'auto' }}
										>
											<div dangerouslySetInnerHTML={{ __html: tableInfoContent }}></div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* DiagramEditor Component */}
			<DiagramEditor
				showMathPopup={showMathPopup}
				closeMathPopup={closeMathPopup}
				showDiagramPopup={showDiagramPopup}
				closeDiagramPopup={closeDiagramPopup}
				editorRef={editorRef}
			/>

			{/* Template Search Modal */}
			{showTemplateSearchForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-800">
								{documentType === 'BIEN_BAN_KET_QUA_THU_NGHIEM' ? 'Tìm kiếm mẫu biên bản' : 'Tìm kiếm mẫu tài liệu'}
							</h3>
							<button onClick={() => setShowTemplateSearchForm(false)} className="text-gray-500 hover:text-gray-700">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						{/* Search Input */}
						<div className="mb-4">
							<input
								type="text"
								placeholder="Nhập từ khóa tìm kiếm..."
								className="w-full px-3 py-2 text-sm border-2 bg-white border-gray-300 rounded-md focus:border-gray-500 outline-none"
								onChange={(e) => searchTemplatesInModal(e.target.value)}
							/>
						</div>

						{/* Template List */}
						<div className="space-y-2 max-h-96 overflow-y-auto">
							{templateSearchLoading ? (
								<div className="text-center py-8">
									<div className="text-gray-600">Đang tìm kiếm...</div>
								</div>
							) : templates.length > 0 ? (
								templates.map((template, index) => (
									<div
										key={template.id || index}
										className="p-3 border-2 border-gray-300 rounded-lg hover:border-gray-500 cursor-pointer transition-all"
										onClick={() => selectTemplateFromModal(template)}
									>
										<div className="font-semibold text-gray-800">{template.templateName || template.name}</div>
										<div className="text-sm text-gray-600">Mã: {template.id || '-'}</div>
										{template.description && <div className="text-xs text-gray-500 mt-1">{template.description}</div>}
									</div>
								))
							) : (
								<div className="text-center py-8">
									<div className="text-gray-600">
										{documentType === 'BIEN_BAN_KET_QUA_THU_NGHIEM'
											? 'Không tìm thấy mẫu biên bản nào'
											: 'Không tìm thấy mẫu tài liệu nào'}
									</div>
								</div>
							)}
						</div>

						{/* Close Button */}
						<div className="mt-4 flex justify-end">
							<button
								onClick={() => setShowTemplateSearchForm(false)}
								className="px-4 py-2 text-sm font-semibold bg-white text-black border-2 border-gray-500 rounded-md hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
							>
								Đóng
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default Editor;
