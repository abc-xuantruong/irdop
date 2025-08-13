import React, { useState, useRef, useEffect } from 'react';
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react';
import {
	FaFileAlt,
	FaEdit,
	FaEye,
	FaPlus,
	FaUser,
	FaCalendarAlt,
	FaClock,
	FaSearch,
	FaFilter,
	FaChevronDown,
	FaTimes,
	FaSave,
	FaEraser,
	FaSync,
	FaSquare,
	FaExternalLinkAlt,
} from 'react-icons/fa';

const DocumentEditor = () => {
	const [selectedDocument, setSelectedDocument] = useState(null);
	const [previewContent, setPreviewContent] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [templateSearchTerm, setTemplateSearchTerm] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [documentStatus, setDocumentStatus] = useState('draft'); // 'draft' or 'published'
	const [isDraft, setIsDraft] = useState(true); // Toggle state for draft/published

	// Data states from EditorTemplate.html
	const [recentDocuments, setRecentDocuments] = useState([]);
	const [documentTemplates, setDocumentTemplates] = useState([]);
	const [recentDocumentsPagination, setRecentDocumentsPagination] = useState({
		currentPage: 1,
		itemsPerPage: 10,
		totalItems: 0,
		totalPages: 1,
	});
	const [templatesPagination, setTemplatesPagination] = useState({
		currentPage: 1,
		itemsPerPage: 10,
		totalItems: 0,
		totalPages: 1,
	});

	// Template creation/editing popup state
	const [showTemplatePopup, setShowTemplatePopup] = useState(false);
	const [editingTemplate, setEditingTemplate] = useState(null);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [templateForm, setTemplateForm] = useState({
		name: '',
		description: '',
		headerData: {
			title: '',
			code: '',
			publishNo: '',
			publishDate: '',
		},
		content: '',
	});

	// Pagination state
	const [recentDocumentsPage, setRecentDocumentsPage] = useState(1);
	const [templatesPage, setTemplatesPage] = useState(1);

	// Current previewed template state
	const [currentPreviewedTemplate, setCurrentPreviewedTemplate] = useState(null);

	// Editor ref for template content
	const templateEditorRef = useRef(null);

	// File preview states
	const [previewFile, setPreviewFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState('');
	const [showFilePreview, setShowFilePreview] = useState(false);

	// API constants and helper functions from EditorTemplate.html
	const API_ENDPOINT = 'https://black.irdop.org/v1/analysis/processing/list';
	const TEMPLATE_API_ENDPOINT = 'https://black.irdop.org/v1/lab/test_report/get_template';
	const RECENT_DOCS_API_ENDPOINT = 'https://red.irdop.org/v1/editor/lab_result_report/get_editor';
	const PUBLISHED_DOCS_API_ENDPOINT = 'https://red.irdop.org/v1/document/get_doc';

	// API helper functions
	const getCookie = (name) => {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(';').shift();
		return '';
	};

	const apiPost = async (url, body) => {
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${getCookie('auth')}`,
					'x-fh-app-uid': 'LIMS-IRDOP-PRD',
					'x-fh-access-key': 'lELlAk8o5fmUgvJRYhvf',
				},
				body: JSON.stringify(body),
			});

			const contentType = response.headers.get('content-type');
			let data;

			if (contentType && contentType.includes('application/json')) {
				data = await response.json();
			} else {
				data = await response.text();
			}

			return {
				status: response.status,
				data: data,
			};
		} catch (error) {
			console.error('API Error:', error);
			throw error;
		}
	};

	// File preview functionality
	const handleFilePreview = async (fileId) => {
		try {
			// Get download link directly using fileId
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10, // 10 minutes
				mode: 'view',
				fileId: fileId, // Use fileId directly instead of fileRecord
			});

			if (response.status === 200 && response.data) {
				// Create a simple file record for display
				const fileRecord = {
					id: fileId,
					originInfo: {
						fileName: `File_${fileId}`,
					},
				};
				handleOpenInPopupWindow(fileRecord, response.data);
			} else {
				throw new Error('Không thể lấy link download');
			}
		} catch (error) {
			console.error('File preview failed:', error);
			alert('Không thể xem file. Vui lòng thử lại.');
		}
	};

	const handleOpenInPopupWindow = async (fileRecord, downloadUrl) => {
		try {
			// Open file directly in new tab instead of popup window
			window.open(downloadUrl, '_blank');
		} catch (error) {
			console.error('Failed to open file in new tab:', error);
			alert('Không thể mở file. Vui lòng thử lại.');
		}
	};

	// Format datetime to GMT+7 in HH:MM DD/MM/YYYY format
	const formatDateTimeGMT7 = (dateString) => {
		if (!dateString) return 'N/A';

		try {
			const date = new Date(dateString);
			// Convert to GMT+7 (Vietnam timezone)
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

	// Load recent documents from API
	const loadRecentDocuments = async (searchTerm = '', page = 1, status = 'draft') => {
		try {
			setIsLoading(true);

			// Choose API endpoint based on status
			const apiEndpoint = status === 'published' ? PUBLISHED_DOCS_API_ENDPOINT : RECENT_DOCS_API_ENDPOINT;

			const response = await apiPost(apiEndpoint, {
				searchTerm: searchTerm,
				page: page,
			});

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}

				// Transform API response to match our component structure
				const documents = (result.result || []).map((doc) => ({
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
					fileId: doc.fileId, // Extract fileId from docrecord level
					originalData: doc, // Keep original data for navigation
				}));

				setRecentDocuments(documents);
				setRecentDocumentsPagination({
					currentPage: page,
					itemsPerPage: result.pagination?.itemsPerPage || 10,
					totalItems: result.pagination?.totalItems || documents.length,
					totalPages: result.pagination?.totalPages || Math.ceil(documents.length / 10),
				});
			}
		} catch (error) {
			console.error('Error loading recent documents:', error);
			setRecentDocuments([]);
		} finally {
			setIsLoading(false);
		}
	};

	// Load templates from API
	const loadTemplates = async (searchTerm = '', page = 1) => {
		try {
			setIsLoading(true);
			const response = await apiPost(TEMPLATE_API_ENDPOINT, {
				id: '',
				searchTerm: searchTerm,
				page: page,
			});

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}

				// Transform API response to match our component structure
				const templates = (result.result || []).map((template) => ({
					id: template.id,
					name: template.templateName || template.name,
					title: template.templateName || template.name,
					description: template.templateDescription || template.description || 'Chưa có mô tả',
					author: template.author || template.authorName || 'Hệ thống',
					authorName: template.authorName || template.author || 'Hệ thống',
					createdDate: template.createdAt ? new Date(template.createdAt).toLocaleDateString('vi-VN') : 'N/A',
					createdAt: template.createdAt,
					modifiedAt: template.modifiedAt,
					modifiedBy: template.modifiedBy,
					category: template.category || 'general',
					// Preserve original data structure for preview
					templateName: template.templateName,
					templateDescription: template.templateDescription,
					header: template.header || {},
					content: template.content || '',
					columns: template.columns || [],
					customRows: template.customRows || [],
				}));

				setDocumentTemplates(templates);
				setTemplatesPagination({
					currentPage: page,
					itemsPerPage: result.pagination?.itemsPerPage || 10,
					totalItems: result.pagination?.totalItems || templates.length,
					totalPages: result.pagination?.totalPages || Math.ceil(templates.length / 10),
				});
			}
		} catch (error) {
			console.error('Error loading templates:', error);
			setDocumentTemplates([]);
		} finally {
			setIsLoading(false);
		}
	};

	// Load data on component mount (only once)
	useEffect(() => {
		loadRecentDocuments('', 1, 'draft'); // Use hardcoded initial status
		loadTemplates();

		// Cleanup function
		return () => {
			// Clean up global function
			if (window.handleFilePreviewFromDocument) {
				delete window.handleFilePreviewFromDocument;
			}
		};
	}, []); // Empty dependency array - only run once on mount

	// Keep isDraft in sync with documentStatus
	useEffect(() => {
		setIsDraft(documentStatus === 'draft');
	}, [documentStatus]);

	// Refresh all data
	const refreshData = async () => {
		setIsLoading(true);
		try {
			await Promise.all([
				loadRecentDocuments(searchTerm, recentDocumentsPage, documentStatus),
				loadTemplates(templateSearchTerm, templatesPage),
			]);
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
		setRecentDocumentsPage(1); // Reset to first page
		setSelectedDocument(null); // Clear selection when switching tabs
		setPreviewContent(''); // Clear preview content
		setCurrentPreviewedTemplate(null); // Clear previewed template
		await loadRecentDocuments(searchTerm, 1, newStatus);
	};

	// Handle toggle switch change
	const handleToggleChange = () => {
		const newIsDraft = !isDraft;
		setIsDraft(newIsDraft);
		const newStatus = newIsDraft ? 'draft' : 'published';
		handleDocumentStatusChange(newStatus);
	};

	// Search handlers
	const handleSearchRecentDocuments = () => {
		loadRecentDocuments(searchTerm, 1, documentStatus);
	};

	const handleSearchTemplates = () => {
		loadTemplates(templateSearchTerm, 1);
	};

	// Search on Enter key
	const handleSearchKeyPress = (e, isTemplate = false) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (isTemplate) {
				handleSearchTemplates();
			} else {
				handleSearchRecentDocuments();
			}
		}
	};

	// Helper function to extract specific CSS property from style string
	const extractStyleProperty = (styleString, property) => {
		if (!styleString) return null;

		const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
		const match = styleString.match(regex);
		return match ? match[1].trim() : null;
	};

	// Helper function to apply format logic to HTML content with 16px font size
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
				p.setAttribute('style', styleString.join('; ') + '; font-size: 16px');
			} else {
				p.setAttribute('style', 'font-size: 16px');
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

			const styleString = ['border: 1px solid #000', 'font-size: 16px'];
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

		// Set font-size 16px for all elements except headings
		const allTags = tempContainer.querySelectorAll('*:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)');
		allTags.forEach((element) => {
			const currentStyle = element.getAttribute('style') || '';
			const styleWithFontSize = currentStyle + (currentStyle ? '; ' : '') + 'font-size: 16px';
			element.setAttribute('style', styleWithFontSize);
		});

		return tempContainer.innerHTML;
	};

	// Format function for template editor
	const formatTemplateContent = () => {
		if (!templateEditorRef.current) {
			alert('Editor chưa được khởi tạo');
			return;
		}

		try {
			const content = templateEditorRef.current.getContent();
			if (!content) {
				alert('Không có nội dung để định dạng');
				return;
			}

			const cleanedContent = applyFormatToHTML(content);
			templateEditorRef.current.setContent(cleanedContent);
			setTemplateForm((prev) => ({
				...prev,
				content: cleanedContent,
			}));

			alert('Đã định dạng lại nội dung thành công!');
		} catch (error) {
			console.error('Error in formatTemplateContent:', error);
			alert('Lỗi khi định dạng: ' + error.message);
		}
	};

	// Template API functions from EditorTemplate.html
	const createTemplate = async (templateData) => {
		try {
			const requestBody = {
				templateName: templateData.name,
				templateDescription: templateData.description,
				columns: [
					{ columnName: 'Mã mẫu', valueColumn: 'sample_uid', width: '30%', resizable: true },
					{ columnName: 'Mã chỉ tiêu', valueColumn: 'id', width: '30%', resizable: true },
					{ columnName: 'Chỉ tiêu', valueColumn: 'parameter_name', width: '40%', resizable: true },
				],
				customRows: [],
				header: templateData.headerData,
				content: templateData.content,
				footer: '', // Auto-generated footer
			};

			const response = await apiPost('https://black.irdop.org/v1/lab/test_report/create_template', requestBody);

			if (response.status < 300 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}
				return result;
			} else {
				throw new Error('Lỗi API: ' + (response.data?.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Error creating template:', error);
			throw error;
		}
	};

	const updateTemplate = async (templateData) => {
		try {
			const requestBody = {
				id: editingTemplate.id,
				templateName: templateData.name,
				templateDescription: templateData.description,
				columns: [
					{ columnName: 'Mã mẫu', valueColumn: 'sample_uid', width: '30%', resizable: true },
					{ columnName: 'Mã chỉ tiêu', valueColumn: 'id', width: '30%', resizable: true },
					{ columnName: 'Chỉ tiêu', valueColumn: 'parameter_name', width: '40%', resizable: true },
				],
				customRows: [],
				header: templateData.headerData,
				content: templateData.content,
				footer: '', // Auto-generated footer
			};

			const response = await apiPost('https://black.irdop.org/v1/lab/test_report/update_template', requestBody);

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}
				return result;
			} else {
				throw new Error('Lỗi API: ' + (response.data?.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Error updating template:', error);
			throw error;
		}
	};

	// API-driven data objects
	const getRecentDocumentsData = () => ({
		result: recentDocuments,
		pagination: recentDocumentsPagination,
	});

	const getDocumentTemplatesData = () => ({
		result: documentTemplates,
		pagination: templatesPagination,
	});

	// Mock HTML content for preview
	const mockPreviewContent = `
		<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.6;">
			<div style="text-align: center; margin-bottom: 30px;">
				<h2 style="margin: 0; color: #2563eb;">VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN</h2>
				<h3 style="margin: 10px 0; color: #1e40af;">BIÊN BẢN KIỂM NGHIỆM CHẤT LƯỢNG NƯỚC</h3>
				<p style="margin: 5px 0;"><strong>Số:</strong> 001/2024/IRDOP</p>
				<p style="margin: 5px 0;"><strong>Ngày:</strong> 20/12/2024</p>
			</div>
			
			<div style="margin-bottom: 20px;">
				<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">I. THÔNG TIN MẪU THỬ</h4>
				<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;">
					<tr>
						<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Mã mẫu:</td>
						<td style="border: 1px solid #ccc; padding: 8px;">W-2024-001</td>
						<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Ngày lấy mẫu:</td>
						<td style="border: 1px solid #ccc; padding: 8px;">15/12/2024</td>
					</tr>
					<tr>
						<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Tên mẫu:</td>
						<td style="border: 1px solid #ccc; padding: 8px;" colspan="3">Nước sinh hoạt - Khu vực A</td>
					</tr>
				</table>
			</div>
			
			<div style="margin-bottom: 20px;">
				<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">II. KỂT QUẢ KIỂM NGHIỆM</h4>
				<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;">
					<thead>
						<tr style="background: #f9f9f9;">
							<th style="border: 1px solid #ccc; padding: 8px;">STT</th>
							<th style="border: 1px solid #ccc; padding: 8px;">Chỉ tiêu</th>
							<th style="border: 1px solid #ccc; padding: 8px;">Đơn vị</th>
							<th style="border: 1px solid #ccc; padding: 8px;">Kết quả</th>
							<th style="border: 1px solid #ccc; padding: 8px;">Giới hạn cho phép</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">1</td>
							<td style="border: 1px solid #ccc; padding: 8px;">pH</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">-</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">7.2</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">6.0 - 8.5</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">2</td>
							<td style="border: 1px solid #ccc; padding: 8px;">Độ đục</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">NTU</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">0.8</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">≤ 4</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">3</td>
							<td style="border: 1px solid #ccc; padding: 8px;">Coliform</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">MPN/100ml</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">&lt; 3</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">≤ 3</td>
						</tr>
					</tbody>
				</table>
			</div>
			
			<div style="margin-top: 30px;">
				<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">III. KẾT LUẬN</h4>
				<p>Mẫu nước kiểm nghiệm đạt tiêu chuẩn chất lượng nước sinh hoạt theo QCVN 01:2009/BYT.</p>
			</div>
			
			<div style="margin-top: 40px; display: flex; justify-content: space-between;">
				<div style="text-align: center;">
					<p style="margin: 0; font-weight: bold;">NGƯỜI LẬP</p>
					<p style="margin: 20px 0 0 0;">[Ký tên]</p>
				</div>
				<div style="text-align: center;">
					<p style="margin: 0; font-weight: bold;">TRƯỞNG PHÒNG</p>
					<p style="margin: 20px 0 0 0;">[Ký tên]</p>
				</div>
			</div>
		</div>
	`;

	const handleNewDocument = () => {
		console.log('Creating new document...');
		// Navigate to Editor for new document
		const baseUrl = window.location.origin;

		// Build query parameters
		const params = new URLSearchParams();
		params.set('classifierCode', 'BIEN_BAN_KET_QUA_THU_NGHIEM');

		// If a template is currently previewed, include its ID
		if (currentPreviewedTemplate && currentPreviewedTemplate.id) {
			params.set('templateId', currentPreviewedTemplate.id);
		}
		// If preview is from get_editor API (has selectedDocument), use metadata.templateId
		else if (selectedDocument && selectedDocument.metadata?.templateId) {
			params.set('templateId', selectedDocument.metadata.templateId);
		}

		const editorUrl = `${baseUrl}/editor?${params.toString()}`;

		// Open in new tab or navigate to editor
		window.open(editorUrl, '_blank');
	};

	const handleContinueEdit = () => {
		if (selectedDocument) {
			console.log('Continue editing document:', selectedDocument.id);
			// Navigate to Editor with the selected document ID
			const baseUrl = window.location.origin;

			// Build query parameters based on document status
			const params = new URLSearchParams();

			// Use editId for draft documents, docId for published documents
			if (selectedDocument.status === 'published') {
				params.set('docId', selectedDocument.id);
			} else {
				params.set('editId', selectedDocument.id);
			}

			// Add template ID if available and not null/empty
			if (
				selectedDocument.metadata?.templateId &&
				selectedDocument.metadata.templateId !== null &&
				selectedDocument.metadata.templateId !== ''
			) {
				params.set('templateId', selectedDocument.metadata.templateId);
			}

			// Add classifierCode if available and not null/empty
			if (
				selectedDocument.metadata?.classifierCode &&
				selectedDocument.metadata.classifierCode !== null &&
				selectedDocument.metadata.classifierCode !== ''
			) {
				params.set('classifierCode', selectedDocument.metadata.classifierCode);
			} else {
				// Default classifierCode
				params.set('classifierCode', 'BIEN_BAN_KET_QUA_THU_NGHIEM');
			}

			const editorUrl = `${baseUrl}/editor?${params.toString()}`;

			// Open in new tab or navigate to editor
			window.open(editorUrl, '_blank');
		} else {
			alert('Vui lòng chọn một tài liệu để chỉnh sửa');
		}
	};

	const handleContinueFromTemplate = () => {
		if (currentPreviewedTemplate) {
			console.log('Creating new document from template:', currentPreviewedTemplate.id);
			// Navigate to Editor for new document from template
			const baseUrl = window.location.origin;

			// Build query parameters
			const params = new URLSearchParams();
			params.set('templateId', currentPreviewedTemplate.id);
			params.set('classifierCode', 'BIEN_BAN_KET_QUA_THU_NGHIEM');

			const editorUrl = `${baseUrl}/editor?${params.toString()}`;

			// Open in new tab or navigate to editor
			window.open(editorUrl, '_blank');
		} else {
			alert('Không có mẫu nào được chọn');
		}
	};

	const handleDocumentClick = (doc) => {
		setSelectedDocument(doc);

		// Create preview content from document metadata
		const metadata = doc.metadata || {};
		const header = metadata.header || {};
		const content = metadata.content || '<p>Không có nội dung</p>';
		const sampleUIDs = metadata.sampleUIDs || [];
		const analysisIds = metadata.analysisIds || [];

		// Generate document preview content
		const documentPreviewContent = `
			<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.6;">
				<!-- HEADER SECTION -->
				<div style="text-align: start; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 15px; ">
					${
						header.title
							? `<h3 style="margin: 10px 0; color: #1e40af; text-transform: uppercase; font-weight: bold;">Tiêu đề: ${header.title}</h3>`
							: ''
					}
					${header.code ? `<p style="margin: 5px 0;"><strong>Mã hiệu:</strong> ${header.code}</p>` : ''}
					${header.publishNo ? `<p style="margin: 5px 0;"><strong>Lần phát hành:</strong> ${header.publishNo}</p>` : ''}
					${header.publishDate ? `<p style="margin: 5px 0;"><strong>Ngày phát hành:</strong> ${header.publishDate}</p>` : ''}
					<p style="margin: 5px 0;"><strong>Mã tài liệu:</strong> ${doc.id}</p>
					<p style="margin: 5px 0;"><strong>Ngày tạo:</strong> ${new Date(doc.createdAt).toLocaleDateString('vi-VN')}</p>
					<p style="margin: 5px 0;"><strong>Cập nhật lần cuối:</strong> ${new Date(doc.modifiedAt).toLocaleDateString(
						'vi-VN',
					)}</p>
				</div>
				
				<!-- CONTENT SECTION -->
				<div style="margin-bottom: 30px;">
					<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">NỘI DUNG TÀI LIỆU</h4>
					<div style="border: 1px solid #ddd; border-radius: 4px; padding: 15px; background: white; min-height: 200px; text-align: initial;">
						${content}
					</div>
				</div>
				
				<!-- DOCUMENT INFO SECTION -->
				<div style="margin-top: 30px;">
					<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">THÔNG TIN TÀI LIỆU</h4>
					<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc; margin-top: 10px; text-align: left;">
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold; width: 25%;">Mã tài liệu:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${doc.id}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Mẫu được sử dụng:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${metadata.templateName || 'Không sử dụng mẫu'}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Mã mẫu:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${metadata.templateId || 'N/A'}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Trạng thái:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">
								${getStatusText(doc.status)}
								${
									doc.status === 'published' && doc.fileId
										? ` - <button onclick="window.parent.handleFilePreviewFromDocument('${doc.fileId}')" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 8px;">📎 XEM</button>`
										: ''
								}
							</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Người tạo:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${doc.authorName || doc.author || 'N/A'}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Ngày tạo:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${new Date(doc.createdAt).toLocaleDateString('vi-VN')} ${new Date(
			doc.createdAt,
		).toLocaleTimeString('vi-VN')}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Lần cập nhật cuối:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${new Date(doc.modifiedAt).toLocaleDateString('vi-VN')} ${new Date(
			doc.modifiedAt,
		).toLocaleTimeString('vi-VN')}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Người cập nhật:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${doc.modifiedBy || doc.author || 'N/A'}</td>
						</tr>
						${
							doc.status === 'published' && doc.fileId
								? `
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">File đính kèm:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${doc.fileId} (có file đính kèm)</td>
						</tr>
						`
								: ''
						}
					</table>
				</div>
				
				<!-- ANALYSIS DATA SECTION -->
				${
					sampleUIDs.length > 0 || analysisIds.length > 0
						? `
				<div style="margin-top: 30px;">
					<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">DỮ LIỆU PHÉP THỬ</h4>
					<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc; margin-top: 10px; text-align: left;">
						${
							sampleUIDs.length > 0
								? `
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold; width: 25%;">Mã mẫu:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${sampleUIDs.join(', ')}</td>
						</tr>
						`
								: ''
						}
						${
							analysisIds.length > 0
								? `
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">ID phép thử:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${analysisIds.join(', ')}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Số chỉ tiêu:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${analysisIds.length} chỉ tiêu</td>
						</tr>
						`
								: ''
						}
					</table>
				</div>
				`
						: ''
				}
			</div>
		`;

		setPreviewContent(documentPreviewContent);
		setCurrentPreviewedTemplate(null); // Clear previewed template when document is selected

		// Expose file preview function to window for use in HTML content
		window.handleFilePreviewFromDocument = (fileId) => {
			handleFilePreview(fileId);
		};
	};

	const handleTemplateClick = (template) => {
		console.log('Template selected:', template);

		// Extract header information
		const headerInfo = template.header || {};
		const headerTitle = headerInfo.title || template.templateName || template.name || 'Không có tiêu đề';
		const headerCode = headerInfo.code || '';
		const publishNo = headerInfo.publishNo || '';
		const publishDate = headerInfo.publishDate || '';

		// Extract content
		const templateContent = template.content || '<p>Không có nội dung</p>';

		// Set preview content for template with header first, then content, then basic info
		const templatePreviewContent = `
			<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.6;">
				<!-- HEADER SECTION -->
				<div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 15px;">
					<h3 style="margin: 10px 0; color: #1e40af; text-transform: uppercase;">${headerTitle}</h3>
					${headerCode ? `<p style="margin: 5px 0;"><strong>Mã hiệu:</strong> ${headerCode}</p>` : ''}
					${publishNo ? `<p style="margin: 5px 0;"><strong>Lần phát hành:</strong> ${publishNo}</p>` : ''}
					${publishDate ? `<p style="margin: 5px 0;"><strong>Ngày phát hành:</strong> ${publishDate}</p>` : ''}
				</div>
				
				<!-- CONTENT SECTION -->
				<div style="margin-bottom: 30px;">
					<div style="border: 1px solid #ddd; border-radius: 4px; padding: 15px; background: white; min-height: 200px; text-align: initial;">
						${templateContent}
					</div>
				</div>
				
				<!-- BASIC INFO SECTION -->
				<div style="margin-top: 30px;">
					<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">THÔNG TIN CƠ BẢN</h4>
					<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc; margin-top: 10px; text-align: left;">
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold; width: 25%;">Mã tài liệu mẫu:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${template.id}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Tên mẫu:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${template.templateName || template.name}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Mô tả:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${
								template.templateDescription || template.description || 'Chưa có mô tả'
							}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Người tạo:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${template.author || template.authorName || 'Hệ thống'}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Ngày tạo:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${
								template.createdDate ||
								(template.createdAt ? new Date(template.createdAt).toLocaleDateString('vi-VN') : 'N/A')
							}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Lần cập nhật cuối:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${
								template.modifiedAt ? new Date(template.modifiedAt).toLocaleDateString('vi-VN') : 'N/A'
							}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Người cập nhật:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${template.modifiedBy || template.authorName || 'N/A'}</td>
						</tr>
					</table>
				</div>
				
				<!-- USAGE INSTRUCTIONS -->
				<div style="margin-top: 30px;">
					<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">HƯỚNG DẪN SỬ DỤNG</h4>
					<ol style="padding-left: 20px; margin-top: 10px;">
						<li style="margin: 8px 0;">Click vào nút "Tiếp tục" để tạo tài liệu mới từ mẫu này</li>
						<li style="margin: 8px 0;">Hoặc click vào nút "Soạn thảo mới" để tạo tài liệu từ mẫu này</li>
						<li style="margin: 8px 0;">Điền các thông tin cụ thể vào các trường tương ứng</li>
						<li style="margin: 8px 0;">Chỉnh sửa nội dung theo yêu cầu thực tế</li>
						<li style="margin: 8px 0;">Lưu tài liệu sau khi hoàn thành</li>
					</ol>
				</div>
			</div>
		`;
		setPreviewContent(templatePreviewContent);
		setSelectedDocument(null); // Clear selected document when template is selected
		setCurrentPreviewedTemplate(template); // Set current previewed template
	};

	const getCategoryName = (category) => {
		const categoryMap = {
			water: 'Nước',
			soil: 'Đất',
			microbiology: 'Vi sinh',
			chemistry: 'Hóa chất',
			equipment: 'Thiết bị',
			material: 'Vật liệu',
		};
		return categoryMap[category] || 'Khác';
	};

	const handleCreateNewTemplate = () => {
		console.log('Creating new template...');
		// Reset form for new template
		setEditingTemplate(null);
		setTemplateForm({
			name: '',
			description: '',
			headerData: {
				title: '',
				code: '',
				publishNo: '',
				publishDate: '',
			},
			content: '',
		});
		setShowTemplatePopup(true);
	};

	const handleEditTemplate = (template) => {
		// Set form data for editing
		setEditingTemplate(template);
		setTemplateForm({
			name: template.templateName || template.name,
			description: template.templateDescription || template.description,
			headerData: {
				title: template.header?.title || template.templateName || template.name,
				code: template.header?.code || '',
				publishNo: template.header?.publishNo || '',
				publishDate: template.header?.publishDate || '',
			},
			content:
				template.content ||
				`<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.6;">
				<p>Nội dung mẫu tài liệu sẽ được viết tại đây...</p>
				<p>Đây là nội dung demo cho mẫu: ${template.templateName || template.name}</p>
			</div>`,
		});
		setShowTemplatePopup(true);
	};

	const handleCloseTemplatePopup = () => {
		setShowTemplatePopup(false);
		setEditingTemplate(null);
		setTemplateForm({
			name: '',
			description: '',
			headerData: {
				title: '',
				code: '',
				publishNo: '',
				publishDate: '',
			},
			content: '',
		});
	};

	const handleTemplateFormChange = (field, value) => {
		if (field.startsWith('headerData.')) {
			const headerField = field.replace('headerData.', '');
			setTemplateForm((prev) => ({
				...prev,
				headerData: {
					...prev.headerData,
					[headerField]: value,
				},
			}));
		} else {
			setTemplateForm((prev) => ({
				...prev,
				[field]: value,
			}));
		}
	};

	const handleSaveTemplate = async () => {
		// Get content from TinyMCE editor if available
		if (templateEditorRef.current) {
			templateForm.content = templateEditorRef.current.getContent();
		}

		if (!templateForm.name.trim()) {
			alert('Vui lòng nhập tên mẫu biên bản');
			return;
		}

		try {
			setIsLoading(true);

			if (editingTemplate) {
				// Update existing template
				await updateTemplate(templateForm);
				alert('Cập nhật mẫu thành công!');
			} else {
				// Create new template
				await createTemplate(templateForm);
				alert('Tạo mẫu thành công!');
			}

			// Refresh templates list
			await loadTemplates(templateSearchTerm, templatesPage);
			handleCloseTemplatePopup();
		} catch (error) {
			console.error('Error saving template:', error);
			alert('Có lỗi xảy ra khi lưu mẫu: ' + error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'published':
				return 'bg-green-100 text-green-800';
			case 'draft':
				return 'bg-yellow-100 text-yellow-800';
			case 'review':
				return 'bg-blue-100 text-blue-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const getStatusText = (status) => {
		switch (status) {
			case 'published':
				return 'Đã xuất bản';
			case 'draft':
				return 'Bản nháp';
			case 'review':
				return 'Đang duyệt';
			default:
				return 'Không rõ';
		}
	};

	// Function to generate smart pagination numbers
	const getSmartPaginationNumbers = (currentPage, totalPages) => {
		if (totalPages <= 7) {
			// If total pages <= 7, show all pages
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const pages = [];

		// Always show first page
		pages.push(1);

		// Show ellipsis after first page if there's a gap
		if (currentPage > 4) {
			pages.push('...');
		}

		// Show pages around current page
		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);

		for (let i = start; i <= end; i++) {
			if (!pages.includes(i)) {
				pages.push(i);
			}
		}

		// Show ellipsis before last page if there's a gap
		if (currentPage < totalPages - 3) {
			pages.push('...');
		}

		// Always show last page (if not already included and totalPages > 1)
		if (!pages.includes(totalPages) && totalPages > 1) {
			pages.push(totalPages);
		}

		return pages;
	};

	// Page change handlers with API integration
	const handleRecentDocumentsPageChange = async (newPage) => {
		setRecentDocumentsPage(newPage);
		await loadRecentDocuments(searchTerm, newPage, documentStatus);
	};

	const handleTemplatesPageChange = async (newPage) => {
		setTemplatesPage(newPage);
		await loadTemplates(templateSearchTerm, newPage);
	};

	// Icon insertion functionality
	const iconList = [
		{
			name: 'Checkbox trống',
			html: '☐',
			unicode: '&#9744;',
		},
		{
			name: 'Checkbox có tick',
			html: '☑',
			unicode: '&#9745;',
		},
		{
			name: 'Dấu tick',
			html: '✓',
			unicode: '&#10003;',
		},
		{
			name: 'Phân số (a/b)',
			html: '<span style="display: inline-block; text-align: center; vertical-align: middle; font-family: \'Times New Roman\', serif;"><span style="display: block; border-bottom: 1px solid black; font-size: 0.8em; line-height: 1; padding-bottom: 1px;">a</span><span style="display: block; font-size: 0.8em; line-height: 1; padding-top: 1px;">b</span></span>',
			unicode: null,
		},
		{
			name: 'Tổng xích ma (Σ)',
			html: '<span style="position: relative; display: inline-block; font-size: 1.2em; vertical-align: middle; font-family: \'Times New Roman\', serif;">Σ<sup style="position: absolute; top: -0.5em; right: -0.8em; font-size: 0.6em;">n</sup><sub style="position: absolute; bottom: -0.3em; right: -0.8em; font-size: 0.6em;">i=1</sub></span>',
			unicode: null,
		},
		{
			name: 'Tổng xích ma tùy chỉnh',
			html: '<span style="position: relative; display: inline-block; font-size: 1.2em; vertical-align: middle; font-family: \'Times New Roman\', serif;">Σ<sup style="position: absolute; top: -0.5em; right: -0.8em; font-size: 0.6em;">top</sup><sub style="position: absolute; bottom: -0.3em; right: -0.8em; font-size: 0.6em;">bottom</sub></span>',
			unicode: null,
		},
	];

	const showIconPickerModal = () => {
		setShowIconPicker(true);
	};

	const copyIconToClipboard = async (icon) => {
		try {
			const textToCopy = icon.unicode || icon.html;
			await navigator.clipboard.writeText(textToCopy);
			alert(`Đã copy ${icon.name} vào clipboard!`);
			setShowIconPicker(false);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			// Fallback: create a temporary textarea and copy
			const textarea = document.createElement('textarea');
			textarea.value = icon.unicode || icon.html;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			alert(`Đã copy ${icon.name} vào clipboard!`);
			setShowIconPicker(false);
		}
	};

	const insertIconIntoEditor = (icon) => {
		if (templateEditorRef.current && templateEditorRef.current.initialized) {
			templateEditorRef.current.insertContent(icon.html);
			alert(`Đã chèn ${icon.name} vào editor!`);
			setShowIconPicker(false);
		} else {
			alert('Editor chưa sẵn sàng');
		}
	};

	// Get API data instead of mock data
	const recentDocumentsData = getRecentDocumentsData();
	const documentTemplatesData = getDocumentTemplatesData();

	const filteredDocuments = recentDocumentsData.result.filter((doc) =>
		doc.title.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const filteredTemplates = documentTemplatesData.result.filter((template) => {
		const searchTerm = templateSearchTerm.toLowerCase();
		const matchesSearch =
			(template.templateName || template.name || '').toLowerCase().includes(searchTerm) ||
			(template.templateDescription || template.description || '').toLowerCase().includes(searchTerm) ||
			(template.header?.title || '').toLowerCase().includes(searchTerm);

		return matchesSearch;
	});

	return (
		<>
			<style>
				{`
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

					/* Fix container overlapping */
					.document-editor-container {
						box-sizing: border-box;
					}

					.document-editor-container * {
						box-sizing: border-box;
					}

					/* Ensure proper flex behavior */
					.document-editor-sidebar {
						flex-shrink: 0;
						overflow: hidden;
					}

					.document-editor-main {
						min-width: 0;
						overflow: hidden;
					}
				`}
			</style>
			{/* Page Header */}
			<div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
						<FaFileAlt className="text-blue-600" />
						Soạn thảo tài liệu
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
			<div
				className="w-full flex gap-6 document-editor-container"
				style={{ height: 'calc(100vh - 140px)', minHeight: '600px' }}
			>
				<style jsx>{`
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
				`}</style>

				{/* Cột 1: Hoạt động gần đây và Mẫu tài liệu */}
				<div className="w-1/3 flex flex-col gap-4 h-full min-w-[400px] document-editor-sidebar">
					{/* Hoạt động gần đây */}
					<div className="bg-white rounded-xl shadow-sm border p-6 flex-1 flex flex-col min-h-0">
						<div className="flex items-center justify-between mb-4 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaClock className="text-blue-600" />
								{documentStatus === 'published' ? 'Tài liệu đã phát hành' : 'Hoạt động gần đây'}
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
										className={`absolute top-0 w-1/2 h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out transform
											${isDraft ? 'translate-x-0' : 'translate-x-full'}`}
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
						<div className="flex-shrink-0">
							<div className="relative mb-3">
								<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Tìm tài liệu..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									onKeyPress={(e) => handleSearchKeyPress(e, false)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
								/>
							</div>
							{/* Pagination for Recent Documents */}
							{recentDocumentsData.pagination.totalPages > 1 && (
								<div className="flex items-center justify-center pb-2">
									<div className="flex items-center gap-1 flex-wrap justify-center">
										<button
											onClick={() => handleRecentDocumentsPageChange(recentDocumentsData.pagination.currentPage - 1)}
											disabled={recentDocumentsData.pagination.currentPage === 1}
											className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Trước
										</button>
										{getSmartPaginationNumbers(
											recentDocumentsData.pagination.currentPage,
											recentDocumentsData.pagination.totalPages,
										).map((page, index) => (
											<span key={index}>
												{page === '...' ? (
													<span className="px-2 py-1 text-xs text-gray-500">...</span>
												) : (
													<button
														onClick={() => handleRecentDocumentsPageChange(page)}
														className={`px-2 py-1 text-xs border rounded ${
															page === recentDocumentsData.pagination.currentPage
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
											onClick={() => handleRecentDocumentsPageChange(recentDocumentsData.pagination.currentPage + 1)}
											disabled={
												recentDocumentsData.pagination.currentPage === recentDocumentsData.pagination.totalPages
											}
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
										{documentStatus === 'published' ? 'Không có tài liệu đã phát hành' : 'Không có bản nháp nào'}
									</div>
									{searchTerm && <div className="text-xs mt-1">Thử tìm kiếm với từ khóa khác</div>}
								</div>
							) : (
								<div className="space-y-3">
									{filteredDocuments.map((doc) => (
										<div
											key={doc.id}
											onClick={() => handleDocumentClick(doc)}
											className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-blue-300 ${
												selectedDocument?.id === doc.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
											}`}
										>
											<div className="flex items-start justify-between mb-2">
												<div className="flex items-center gap-2">
													<FaFileAlt className="text-gray-500 flex-shrink-0" />
													<span className="font-medium text-gray-900 text-sm leading-tight">
														{doc.metadata?.header?.title || doc.title}
													</span>
												</div>
												<span className="text-xs text-gray-500">{doc.lastModified}</span>
											</div>
											<div className="text-xs text-gray-500 text-start">
												<span className="font-mono">
													{doc.status === 'published'
														? `Document Fingerprint: ${doc.metadata?.footer || doc.id}`
														: `Mã tài liệu sửa đổi: ${doc.metadata?.footer || doc.id}`}
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Mẫu tài liệu */}
					<div className="bg-white rounded-xl shadow-sm border p-6 flex-1 flex flex-col min-h-0">
						<div className="flex items-center justify-between mb-4 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaEdit className="text-green-600" />
								Mẫu tài liệu
							</h3>
							<button
								onClick={handleCreateNewTemplate}
								disabled={isLoading}
								className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<FaPlus className="w-3 h-3" />
								{isLoading ? 'Đang tải...' : 'Tạo mẫu mới'}
							</button>
						</div>
						<div className="flex-shrink-0">
							<div className="relative mb-3">
								<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Tìm mẫu tài liệu..."
									value={templateSearchTerm}
									onChange={(e) => setTemplateSearchTerm(e.target.value)}
									onKeyPress={(e) => handleSearchKeyPress(e, true)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
								/>
							</div>
							{/* Pagination for Templates */}
							{documentTemplatesData.pagination.totalPages > 1 && (
								<div className="flex items-center justify-center pb-2">
									<div className="flex items-center gap-1 flex-wrap justify-center">
										<button
											onClick={() => handleTemplatesPageChange(documentTemplatesData.pagination.currentPage - 1)}
											disabled={documentTemplatesData.pagination.currentPage === 1}
											className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Trước
										</button>
										{getSmartPaginationNumbers(
											documentTemplatesData.pagination.currentPage,
											documentTemplatesData.pagination.totalPages,
										).map((page, index) => (
											<span key={index}>
												{page === '...' ? (
													<span className="px-2 py-1 text-xs text-gray-500">...</span>
												) : (
													<button
														onClick={() => handleTemplatesPageChange(page)}
														className={`px-2 py-1 text-xs border rounded ${
															page === documentTemplatesData.pagination.currentPage
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
											onClick={() => handleTemplatesPageChange(documentTemplatesData.pagination.currentPage + 1)}
											disabled={
												documentTemplatesData.pagination.currentPage === documentTemplatesData.pagination.totalPages
											}
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
							) : (
								<div className="space-y-3">
									{filteredTemplates.map((template) => (
										<div
											key={template.id}
											onClick={() => handleTemplateClick(template)}
											className="p-4 border border-gray-200 rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-green-300 group relative"
										>
											<div className="flex items-start justify-between mb-2">
												<h4 className="font-medium text-gray-900 text-sm leading-tight text-left pr-20">
													{template.templateName || template.name}
												</h4>
												<div className="absolute top-2 right-2 flex items-center gap-2">
													<button
														onClick={(e) => {
															e.stopPropagation();
															handleEditTemplate(template);
														}}
														className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all p-1"
														title="Chỉnh sửa mẫu"
													>
														<FaEdit className="w-4 h-4" />
													</button>
													<FaEye className="text-green-500 flex-shrink-0" />
												</div>
											</div>
											<div className="text-xs text-gray-500 space-y-1 text-left">
												<div>Tiêu đề: {template.header?.title || template.templateName || template.name}</div>
												<div>Mô tả: {template.templateDescription || template.description}</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Cột 2: Xem trước và các nút hành động */}
				<div className="flex-1 flex flex-col h-full min-h-0 document-editor-main" style={{ minWidth: '500px' }}>
					<div className="bg-white rounded-xl shadow-sm border h-full flex flex-col min-h-0">
						{/* Header với tiêu đề và nút */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaEye className="text-purple-600" />
								Xem trước
							</h3>
							<div className="flex gap-3">
								{/* View File Button for published documents with fileId */}
								{selectedDocument?.status === 'published' && selectedDocument?.fileId && (
									<button
										onClick={() => handleFilePreview(selectedDocument.fileId)}
										className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
										title="Xem file đính kèm"
									>
										<FaExternalLinkAlt className="w-4 h-4" />
										Xem file
									</button>
								)}
								<button
									onClick={selectedDocument ? handleContinueEdit : handleContinueFromTemplate}
									disabled={!selectedDocument && !currentPreviewedTemplate}
									className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
										selectedDocument || currentPreviewedTemplate
											? 'bg-blue-600 text-white hover:bg-blue-700'
											: 'bg-gray-300 text-gray-500 cursor-not-allowed'
									}`}
									title={
										selectedDocument
											? 'Tiếp tục chỉnh sửa tài liệu'
											: currentPreviewedTemplate
											? 'Tạo tài liệu mới từ mẫu này'
											: 'Chọn tài liệu hoặc mẫu để tiếp tục'
									}
								>
									<FaEdit className="w-4 h-4" />
									Tiếp tục
								</button>
								<button
									onClick={handleNewDocument}
									className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
								>
									<FaPlus className="w-4 h-4" />
									Soạn thảo mới
								</button>
							</div>
						</div>

						{/* Nội dung xem trước */}
						<div className="flex-1 p-4 overflow-auto custom-scrollbar min-h-0">
							{selectedDocument || previewContent ? (
								<div className="bg-gray-50 rounded-lg p-4 h-full">
									<div className="bg-white rounded-lg shadow-sm h-full overflow-auto custom-scrollbar">
										<div dangerouslySetInnerHTML={{ __html: previewContent }} />
									</div>
								</div>
							) : (
								<div className="flex items-center justify-center h-full text-gray-500">
									<div className="text-center">
										<FaFileAlt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
										<p className="text-lg font-medium mb-2">Chưa chọn tài liệu hoặc mẫu</p>
										<p className="text-sm">Vui lòng chọn một tài liệu hoặc mẫu từ danh sách bên trái để xem trước</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Template Creation/Edit Popup */}
			{showTemplatePopup && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
					<div className="bg-white rounded-xl shadow-2xl min-w-5xl w-[70vw] max-h-[90vh] overflow-hidden my-auto">
						{/* Header */}
						<div className="bg-blue-600 text-white p-4">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-bold flex items-center gap-2">
									{editingTemplate ? 'Chỉnh sửa mẫu tài liệu' : 'Tạo mẫu tài liệu mới'}
								</h2>
								<button onClick={handleCloseTemplatePopup} className="transition-colors text-red-500">
									<FaTimes className="w-6 h-6" />
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-hidden">
							<div className="p-6 h-full">
								<div className="flex gap-6 h-full">
									{/* Left Column - Form Fields */}
									<div className="flex-shrink-0 overflow-y-auto" style={{ width: 'max(25%, 300px)' }}>
										{/* Mục 1: Thông tin mẫu biên bản */}
										<div className="mb-6">
											<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">
												1. Thông tin mẫu biên bản
											</h3>
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
														Tên mẫu biên bản <span className="text-red-500">*</span>
													</label>
													<input
														type="text"
														value={templateForm.name}
														onChange={(e) => handleTemplateFormChange('name', e.target.value)}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
														placeholder="Nhập tên mẫu biên bản"
													/>
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Mô tả</label>
													<textarea
														value={templateForm.description}
														onChange={(e) => handleTemplateFormChange('description', e.target.value)}
														rows={3}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
														placeholder="Nhập mô tả cho mẫu biên bản"
													/>
												</div>
											</div>
										</div>

										{/* Mục 2: Thông tin tiêu đề */}
										<div className="mb-6">
											<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">
												2. Thông tin tiêu đề
											</h3>
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
														Tiêu đề tài liệu
													</label>
													<textarea
														value={templateForm.headerData.title}
														onChange={(e) => handleTemplateFormChange('headerData.title', e.target.value)}
														rows={2}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
														placeholder="Nhập tiêu đề tài liệu"
													/>
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Mã hiệu</label>
													<input
														type="text"
														value={templateForm.headerData.code}
														onChange={(e) => handleTemplateFormChange('headerData.code', e.target.value)}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
														placeholder="Nhập mã hiệu tài liệu"
													/>
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
														Lần phát hành
													</label>
													<input
														type="text"
														value={templateForm.headerData.publishNo}
														onChange={(e) => handleTemplateFormChange('headerData.publishNo', e.target.value)}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
														placeholder="Nhập lần phát hành"
													/>
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
														Ngày phát hành
													</label>
													<input
														type="text"
														value={templateForm.headerData.publishDate}
														onChange={(e) => handleTemplateFormChange('headerData.publishDate', e.target.value)}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
													/>
												</div>
											</div>
										</div>
									</div>

									{/* Right Column - Editor */}
									<div className="flex-1 flex flex-col">
										<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">
											3. Nội dung mẫu
										</h3>
										<div
											className="flex-1 overflow-hidden"
											style={{
												minHeight: '400px',
												display: 'flex',
												flexDirection: 'column',
												borderRadius: '4px',
											}}
										>
											<TinyMCEEditor
												ref={templateEditorRef}
												value={templateForm.content}
												onEditorChange={(content) => handleTemplateFormChange('content', content)}
												onInit={(evt, editor) => {
													templateEditorRef.current = editor;
													editor.initialized = true;
												}}
												init={{
													height: '100%',
													min_height: 400,
													max_height: 600,
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
													autoresize_max_height: 600,
													autoresize_min_height: 400,
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
														editor.on('init', function () {
															// Mark editor as initialized
															if (templateEditorRef.current) {
																templateEditorRef.current.initialized = true;
															}
														});

														// Add keyboard shortcuts
														editor.on('keydown', function (e) {
															// Replace '*' with multiplication sign
															if (e.key === '*') {
																e.preventDefault();
																editor.execCommand('mceInsertContent', false, '×');
																return;
															}
															// '^' toggles superscript
															if (e.key === '^') {
																e.preventDefault();
																// TinyMCE command name for superscript
																editor.execCommand('Superscript');
																return;
															}
															// '_' toggles subscript
															if (e.key === '_') {
																e.preventDefault();
																editor.execCommand('Subscript');
																return;
															}
														});
													},
												}}
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Footer */}
							<div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
								<button
									onClick={handleCloseTemplatePopup}
									className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Hủy
								</button>
								<button
									onClick={showIconPickerModal}
									className="px-4 py-2 text-purple-700 bg-purple-50 border border-purple-300 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2"
									title="Chèn biểu tượng đặc biệt"
								>
									<FaSquare className="w-4 h-4" />
									Chèn Icon
								</button>
								<button
									onClick={formatTemplateContent}
									className="px-4 py-2 text-orange-700 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-2"
									title="Định dạng lại nội dung với font-size 16px"
								>
									<FaEraser className="w-4 h-4" />
									Format
								</button>
								<button
									onClick={handleSaveTemplate}
									disabled={isLoading}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<FaSave className="w-4 h-4" />
									{isLoading ? 'Đang lưu...' : editingTemplate ? 'Cập nhật' : 'Tạo mẫu'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Icon Picker Modal */}
			{showIconPicker && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
						{/* Header */}
						<div className="bg-purple-600 text-white p-4">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-bold">Chèn biểu tượng đặc biệt</h2>
								<button
									onClick={() => setShowIconPicker(false)}
									className="text-white hover:text-red-300 transition-colors"
								>
									<FaTimes className="w-6 h-6" />
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="p-6 overflow-y-auto max-h-[60vh]">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{iconList.map((icon, index) => (
									<div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
										<div className="flex items-center justify-between mb-3">
											<span className="font-medium text-gray-900">{icon.name}</span>
											<div className="text-2xl" dangerouslySetInnerHTML={{ __html: icon.html }} />
										</div>
										<div className="flex gap-2">
											<button
												onClick={() => insertIconIntoEditor(icon)}
												className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
											>
												Chèn vào Editor
											</button>
											<button
												onClick={() => copyIconToClipboard(icon)}
												className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
											>
												Copy
											</button>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
							<button
								onClick={() => setShowIconPicker(false)}
								className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

export default DocumentEditor;
