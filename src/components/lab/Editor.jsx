import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../../contexts/GlobalContext';
import Cookies from 'js-cookie';
import AnalysesExtract from './AnalysesExtract';

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
	const { currentUser, getIdenByUid } = useContext(GlobalContext);

	const [headerData, setHeaderData] = useState({
		title: '',
		code: '',
		publishNo: '',
		publishDate: '',
	});

	const [currentTemplate, setCurrentTemplate] = useState(null);
	const [templates, setTemplates] = useState([]);
	const [currentEditId, setCurrentEditId] = useState(null);
	const [analysisIds, setAnalysisIds] = useState([]);
	const [tableInfoContent, setTableInfoContent] = useState('Chưa có thông tin mẫu thử - chỉ tiêu đã chọn...');
	const [sampleUIDs, setSampleUIDs] = useState([]);

	// Component state for template search
	const [showTemplateSearchForm, setShowTemplateSearchForm] = useState(false);
	const [templateSearchLoading, setTemplateSearchLoading] = useState(false);

	// Component state for icon insertion
	const [showIconPicker, setShowIconPicker] = useState(false);

	// Submit loading and result states
	const [isSubmitLoading, setIsSubmitLoading] = useState(false);
	const [showSubmitResult, setShowSubmitResult] = useState(false);
	const [submitResultData, setSubmitResultData] = useState({ analyses: [], nonconformityAnalyses: [] });
	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [previewExtractData, setPreviewExtractData] = useState(null);
	const [lastSubmitResponse, setLastSubmitResponse] = useState(null); // Store full API response
	const [documentMetadata, setDocumentMetadata] = useState({}); // Store document metadata
	const [documentStatus, setDocumentStatus] = useState('draft'); // 'draft' | 'submitted' - from query params

	// AnalysesExtract component state
	const [showAnalysesExtract, setShowAnalysesExtract] = useState(false);
	const [analysesExtractDocument, setAnalysesExtractDocument] = useState(null);

	// Document information state
	const [lastModified, setLastModified] = useState('');
	const [lastModifiedAt, setLastModifiedAt] = useState('');
	const [author, setAuthor] = useState('');
	const [authorAt, setAuthorAt] = useState('');
	const [submittedAt, setSubmittedAt] = useState('');
	const [submittedBy, setSubmittedBy] = useState('');
	const [classifierCode, setClassifierCode] = useState('BIEN_BAN_KET_QUA_THU_NGHIEM'); // Default to test result report
	const [fileId, setFileId] = useState(''); // Store fileId from published document metadata
	const [lockedByUID, setLockedByUID] = useState(''); // Store lockedByUID when document is submitted
	const [lockedByName, setLockedByName] = useState(''); // Store locked by user name
	const [isDocumentLocked, setIsDocumentLocked] = useState(false); // Track if document is locked
	const [documentFooter, setDocumentFooter] = useState(''); // Store document footer from metadata

	const [editorContent, setEditorContent] = useState('');
	const [autoSaveStarted, setAutoSaveStarted] = useState(false); // Track if auto-save has been started

	// Refs
	const editorRef = useRef(null);
	const autoSaveIntervalRef = useRef(null);
	const loadTableInfoTimeoutRef = useRef(null);
	const isLoadingTableInfo = useRef(false);
	const lastAnalysisIdsRef = useRef(null);

	// New unified auto-save system
	const startAutoSave = () => {
		// Only start if not already started and document is in draft status
		if (!autoSaveStarted && documentStatus !== 'submitted') {
			console.log('Starting auto-save system');
			setAutoSaveStarted(true);

			// Immediate auto-save
			autoSaveLabResultReport();

			// Start 10-second interval
			autoSaveIntervalRef.current = setInterval(() => {
				// Stop auto-save if document becomes submitted
				if (documentStatus === 'submitted') {
					console.log('Document submitted - stopping auto-save');
					clearInterval(autoSaveIntervalRef.current);
					autoSaveIntervalRef.current = null;
					setAutoSaveStarted(false);
					return;
				}

				console.log('Auto-save interval triggered');
				autoSaveLabResultReport();
			}, 10000); // Every 10 seconds
		}
	};
	const getUserName = async (uid) => {
		if (!uid) return '';

		try {
			const idenRecord = await getIdenByUid(uid);
			return idenRecord?.identity_name || uid; // Fallback to UID if name not found
		} catch (error) {
			console.error('Error getting user name for UID:', uid, error);
			return uid; // Fallback to UID on error
		}
	};

	useEffect(() => {
		// Update current date
		updateCurrentDate();

		// Xử lý dữ liệu khi load trang lần đầu
		handleInitialPageLoad();

		// Set up interval to update date every 10 seconds
		const dateInterval = setInterval(updateCurrentDate, 10000);

		return () => {
			// Cleanup
			if (autoSaveIntervalRef.current) {
				clearInterval(autoSaveIntervalRef.current);
			}
			if (loadTableInfoTimeoutRef.current) {
				clearTimeout(loadTableInfoTimeoutRef.current);
			}
			clearInterval(dateInterval);
		};
	}, []);

	// Separate useEffect to reload table info when analysisIds change
	useEffect(() => {
		if (analysisIds && analysisIds.length > 0) {
			// Check if analysisIds actually changed to prevent unnecessary calls
			const analysisIdsString = JSON.stringify(analysisIds.sort());
			if (lastAnalysisIdsRef.current === analysisIdsString) {
				console.log('analysisIds unchanged, skipping loadTableInfo');
				return;
			}

			console.log('analysisIds changed from', lastAnalysisIdsRef.current, 'to', analysisIdsString);
			lastAnalysisIdsRef.current = analysisIdsString;

			// Clear any existing timeout
			if (loadTableInfoTimeoutRef.current) {
				clearTimeout(loadTableInfoTimeoutRef.current);
			}

			// Use longer delay to avoid rapid successive calls during popup operations
			const delay = 500;

			// Add a delay to prevent multiple calls during popup selection
			loadTableInfoTimeoutRef.current = setTimeout(() => {
				// Only load if there's no popup open to prevent flickering
				const popupExists = document.getElementById('parameterSelectionOverlay');
				if (!popupExists) {
					loadTableInfo();
				} else {
					console.log('Popup is open, deferring loadTableInfo');
					// Schedule another check after popup might be closed
					setTimeout(() => {
						const popupStillExists = document.getElementById('parameterSelectionOverlay');
						if (!popupStillExists) {
							loadTableInfo();
						}
					}, 1000);
				}
			}, delay);

			return () => {
				if (loadTableInfoTimeoutRef.current) {
					clearTimeout(loadTableInfoTimeoutRef.current);
				}
			};
		} else {
			// Reset cache when no analysisIds
			lastAnalysisIdsRef.current = null;
		}
	}, [analysisIds]);

	// Auto-save useEffect - cleanup when status changes
	useEffect(() => {
		console.log('Auto-save useEffect triggered:', {
			documentStatus,
			autoSaveStarted,
			isPreviewMode,
			timestamp: new Date().toISOString(),
		});

		// Stop auto-save if document becomes submitted or in preview mode
		if (documentStatus === 'submitted' || isPreviewMode) {
			console.log('Stopping auto-save due to status change or preview mode');
			if (autoSaveIntervalRef.current) {
				clearInterval(autoSaveIntervalRef.current);
				autoSaveIntervalRef.current = null;
			}
			setAutoSaveStarted(false);
		}

		// Cleanup on unmount or dependency change
		return () => {
			if (autoSaveIntervalRef.current) {
				clearInterval(autoSaveIntervalRef.current);
				autoSaveIntervalRef.current = null;
			}
		};
	}, [documentStatus, isPreviewMode]);

	// Update document status and query params
	const updateDocumentStatus = (status) => {
		console.log('Updating document status to:', status);
		setDocumentStatus(status);

		// Update URL query params
		const url = new URL(window.location);
		url.searchParams.set('status', status);
		window.history.replaceState({}, '', url);
	};

	// Get status from query params or default to 'draft'
	const getStatusFromURL = () => {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get('status') || 'draft';
	};

	// Hàm xử lý dữ liệu khi load trang lần đầu
	const handleInitialPageLoad = async () => {
		console.log('=== handleInitialPageLoad started ===');

		// Reset template state at the beginning
		setCurrentTemplate(null);

		const urlParams = new URLSearchParams(window.location.search);
		const docId = urlParams.get('docId');
		const editId = urlParams.get('editId');
		const templateId = urlParams.get('templateId');
		const analysisIdsParam = urlParams.get('analysisIds');
		const classifierCodeParam = urlParams.get('classifierCode');

		console.log('URL params:', { docId, editId, templateId, analysisIdsParam, classifierCodeParam });

		// Initialize status from URL or default to 'draft'
		const initialStatus = getStatusFromURL();
		setDocumentStatus(initialStatus);
		console.log('Initial document status:', initialStatus);

		try {
			// Parse analysisIds if available
			let analysisIds = [];
			if (analysisIdsParam) {
				analysisIds = analysisIdsParam.split(',').filter((id) => id.trim());
			}

			let finalDocumentStatus = initialStatus;

			// Xử lý theo thứ tự ưu tiên
			if (docId) {
				// 1. Nếu có docId: load metadata của document đã publish
				finalDocumentStatus = await handleDocIdLoad(docId);
			} else if (editId) {
				// 2. Nếu có editId: load metadata của document draft
				finalDocumentStatus = await handleEditIdLoad(editId);
			} else if (templateId) {
				// 3. Nếu có templateId: load template data
				finalDocumentStatus = await handleTemplateIdLoad(templateId, analysisIds, classifierCodeParam);
			} else if (analysisIds.length > 0 || classifierCodeParam) {
				// 4. Nếu có analysisIds + classifierCode
				finalDocumentStatus = await handleAnalysisIdsAndClassifierCode(analysisIds, classifierCodeParam);
			} else {
				// 5. Không có params nào - đảm bảo template được reset
				setCurrentTemplate(null);
			}

			// Sau khi xử lý, gọi auto_save và cập nhật URL với status cuối cùng
			await performAutoSaveAndCleanURL(finalDocumentStatus || 'draft');
		} catch (error) {
			console.error('Error in handleInitialPageLoad:', error);
			showAutoHideMessage('Lỗi khi tải dữ liệu trang: ' + error.message, 'error');
		}

		console.log('=== handleInitialPageLoad completed ===');
	};

	// Xử lý khi có docId
	const handleDocIdLoad = async (docId) => {
		console.log('Loading published document by docId:', docId);

		// Reset states when loading new document
		setFileId('');

		const response = await apiPost('https://red.irdop.org/v1/document/get_doc', {
			docId: docId,
		});

		if (response.status === 200 && response.data && response.data.metadata) {
			const metadata = response.data.metadata;

			console.log('handleDocIdLoad response.data:', response.data);
			console.log('Available fileId locations:', {
				'response.data.fileId': response.data.fileId,
				'metadata.fileId': metadata.fileId,
			});

			// Gán header data
			if (metadata.header) {
				setHeaderData({
					title: metadata.header.title || '',
					code: metadata.header.code || '',
					publishNo: metadata.header.publishNo || '',
					publishDate: metadata.header.publishDate || '',
				});
			}

			// Gán content vào editor
			if (metadata.content) {
				setEditorContent(metadata.content);
				// Set content to editor when it's ready
				const setContentWhenReady = () => {
					if (editorRef.current && editorRef.current.initialized) {
						editorRef.current.setContent(metadata.content);
					} else {
						setTimeout(setContentWhenReady, 200);
					}
				};
				setTimeout(setContentWhenReady, 500);
			}

			// Gán thông tin publish
			if (metadata.submittedAt) {
				setSubmittedAt(metadata.submittedAt);
				setDocumentStatus('Published');
			}
			if (metadata.submittedByUID) {
				// Get user name from UID
				getUserName(metadata.submittedByUID)
					.then((name) => {
						setSubmittedBy(name);
					})
					.catch((error) => {
						console.error('Error getting submitted by name:', error);
						setSubmittedBy(metadata.submittedByUID); // Fallback to UID
					});
			}

			// Gán fileId từ docrecord (for file preview) - chỉ lấy fileId thực sự
			const docFileId = response.data.fileId || metadata.fileId;
			if (docFileId) {
				console.log('Setting fileId to:', docFileId);
				setFileId(docFileId);
			} else {
				console.log('No fileId found in response');
			}

			// Gán template info - chỉ set khi có đầy đủ thông tin template
			if (metadata.templateId && (metadata.templateName || metadata.templateCode)) {
				setCurrentTemplate({
					id: metadata.templateId,
					templateName: metadata.templateName || '',
					name: metadata.templateName || '',
				});
			} else {
				// Reset template nếu không có thông tin đầy đủ
				setCurrentTemplate(null);
			}

			// Gán classifier code
			if (metadata.classifierCode) {
				setClassifierCode(metadata.classifierCode);
			}

			// Load table info với analysisIds
			if (metadata.analysisIds && metadata.analysisIds.length > 0) {
				setAnalysisIds(metadata.analysisIds);
				if (typeof window !== 'undefined') {
					window.analysisIds = metadata.analysisIds;
				}
			}

			// Gán sample UIDs
			if (metadata.sampleUIDs) {
				setSampleUIDs(metadata.sampleUIDs);
			}

			// Set document footer state
			if (metadata.footer) {
				setDocumentFooter(metadata.footer);
			}

			showAutoHideMessage(`Đã tải tài liệu đã xuất bản: ${metadata.header?.title || 'Tài liệu'}`, 'success');

			// Published documents are considered as 'submitted'
			return 'submitted';
		} else {
			throw new Error('Không tìm thấy tài liệu với docId: ' + docId);
		}
	};

	// Xử lý khi có editId
	const handleEditIdLoad = async (editId) => {
		console.log('Loading draft document by editId:', editId);

		// Reset states when loading new document
		setFileId('');

		const response = await apiPost('https://red.irdop.org/v1/editor/lab_result_report/get_editor', {
			id: editId,
			searchTerm: '',
			page: 1,
		});

		if (response.status === 200 && response.data) {
			// The API returns the document data directly
			const document = response.data;

			if (document && document.metadata) {
				const metadata = document.metadata;
				setDocumentMetadata(metadata);

				// Gán header data
				if (metadata.header) {
					setHeaderData({
						title: metadata.header.title || '',
						code: metadata.header.code || '',
						publishNo: metadata.header.publishNo || '',
						publishDate: metadata.header.publishDate || '',
					});
				}

				// Gán content vào editor
				if (metadata.content) {
					setEditorContent(metadata.content);
					const setContentWhenReady = () => {
						if (editorRef.current && editorRef.current.initialized) {
							editorRef.current.setContent(metadata.content);
						} else {
							setTimeout(setContentWhenReady, 200);
						}
					};
					setTimeout(setContentWhenReady, 500);
				}

				// Gán template info - chỉ set khi có đầy đủ thông tin template
				if (metadata.templateId && (metadata.templateName || metadata.templateCode)) {
					setCurrentTemplate({
						id: metadata.templateId,
						templateName: metadata.templateName || '',
						name: metadata.templateName || '',
					});
				} else {
					// Reset template nếu không có thông tin đầy đủ
					setCurrentTemplate(null);
				}

				// Gán classifier code
				if (metadata.classifierCode) {
					setClassifierCode(metadata.classifierCode);
				}

				// Load table info với analysisIds
				if (metadata.analysisIds && metadata.analysisIds.length > 0) {
					setAnalysisIds(metadata.analysisIds);
					if (typeof window !== 'undefined') {
						window.analysisIds = metadata.analysisIds;
					}
				}

				// Set current editId - prioritize metadata.footer, fallback to editId
				const documentId = metadata.footer || editId;
				setCurrentEditId(documentId);

				// Set document footer state
				if (metadata.footer) {
					setDocumentFooter(metadata.footer);
				}

				// Update document info
				console.log('Document data for updateDocumentInfo:', {
					id: document.id,
					createdAt: document.createdAt,
					modifiedAt: document.modifiedAt,
					identityUID: document.identityUID,
					modifiedByUID: document.modifiedByUID,
				});
				updateDocumentInfo(
					document.id,
					document.createdAt,
					document.modifiedAt,
					document.identityUID, // Author UID
					document.modifiedByUID, // Modified by UID
				);

				// Check if document is locked
				let documentStatus = 'draft';
				if (document.lockedByUID) {
					setLockedByUID(document.lockedByUID);
					// Get locked by user name
					getUserName(document.lockedByUID)
						.then((name) => {
							setLockedByName(name);
						})
						.catch((error) => {
							console.error('Error getting locked by name:', error);
							setLockedByName(document.lockedByUID); // Fallback to UID
						});
					setIsDocumentLocked(true);
					updateDocumentStatus('submitted');
					documentStatus = 'submitted';

					// Note: Editor remains editable, only auto-save is disabled for submitted documents
				} else {
					// Document is not locked, set status to draft
					updateDocumentStatus('draft');
					documentStatus = 'draft';
				}

				showAutoHideMessage(
					`Đã tải tài liệu: ${metadata.templateName || metadata.header?.title || 'Tài liệu'}`,
					'success',
				);

				return documentStatus;
			} else {
				throw new Error('Không tìm thấy tài liệu với editId: ' + editId);
			}
		} else {
			throw new Error('Lỗi API khi tải tài liệu draft');
		}
	};

	// Xử lý khi có templateId
	const handleTemplateIdLoad = async (templateId, analysisIds, classifierCodeParam) => {
		console.log('Loading template by templateId:', templateId);

		// Reset fileId state trước khi load mới (templates thường không có fileId)
		setFileId('');

		const response = await apiPost('https://black.irdop.org/v1/lab/test_report/get_template', {
			id: templateId,
			searchTerm: '',
			page: 1,
		});

		if (response.status === 200 && response.data && response.data.result && response.data.result.length > 0) {
			const template = response.data.result[0];

			// Chỉ gán template info khi template thực sự tồn tại và có dữ liệu hợp lệ
			if (template && template.id && (template.templateName || template.name)) {
				setCurrentTemplate({
					id: template.id,
					templateName: template.templateName || template.name || '',
					name: template.templateName || template.name || '',
				});
			} else {
				// Reset template nếu không có thông tin hợp lệ
				setCurrentTemplate(null);
			}

			// Gán header data từ template
			if (template.header) {
				setHeaderData({
					title: template.header.title || '',
					code: template.header.code || '',
					publishNo: template.header.publishNo || '',
					publishDate: template.header.publishDate || '',
				});
			}

			// Gán content vào editor
			if (template.content) {
				setEditorContent(template.content);
				const setContentWhenReady = () => {
					if (editorRef.current && editorRef.current.initialized) {
						editorRef.current.setContent(template.content);
					} else {
						setTimeout(setContentWhenReady, 200);
					}
				};
				setTimeout(setContentWhenReady, 500);
			}

			// Load table info với analysisIds nếu có
			if (analysisIds && analysisIds.length > 0) {
				setAnalysisIds(analysisIds);
				if (typeof window !== 'undefined') {
					window.analysisIds = analysisIds;
				}
			}

			// Gán classifier code nếu có
			if (classifierCodeParam) {
				setClassifierCode(classifierCodeParam);
			}

			showAutoHideMessage(`Đã tải mẫu: ${template.templateName || template.name}`, 'success');

			// New templates are always draft
			return 'draft';
		} else {
			throw new Error('Không tìm thấy template với templateId: ' + templateId);
		}
	};

	// Xử lý khi chỉ có analysisIds + classifierCode
	const handleAnalysisIdsAndClassifierCode = async (analysisIds, classifierCodeParam) => {
		console.log('Loading with analysisIds and classifierCode:', { analysisIds, classifierCodeParam });

		// Reset fileId state trước khi load mới (không có document nào được load)
		setFileId('');

		// Load table info với analysisIds nếu có
		if (analysisIds && analysisIds.length > 0) {
			setAnalysisIds(analysisIds);
			if (typeof window !== 'undefined') {
				window.analysisIds = analysisIds;
			}
		}

		// Gán classifier code nếu có
		if (classifierCodeParam) {
			setClassifierCode(classifierCodeParam);
		}

		// New analysis selection is always draft
		return 'draft';
	};

	// Thực hiện auto_save và clean URL
	const performAutoSaveAndCleanURL = async (documentStatus = 'draft') => {
		console.log('Performing auto save and cleaning URL with status:', documentStatus);

		try {
			// Gọi auto_save
			const urlParams = new URLSearchParams(window.location.search);
			const originalEditId = urlParams.get('editId');
			const docId = urlParams.get('docId');

			// Chỉ auto save nếu không có docId (vì docId là published document)
			// VÀ document status là 'draft' (không auto-save cho submitted documents)
			if (!docId && documentStatus === 'draft') {
				console.log('Auto-saving for draft document...');
				await autoSaveLabResultReport();
			} else {
				console.log('Skipping auto-save:', { docId: !!docId, documentStatus });
			}

			// Lấy editId hiện tại (có thể được tạo mới từ autoSave)
			const finalEditId = currentEditId || originalEditId;

			// Clean URL - chỉ giữ lại editId và status
			const newUrl = new URL(window.location);
			newUrl.search = ''; // Clear all params

			// Thêm editId nếu có
			if (finalEditId) {
				newUrl.searchParams.set('editId', finalEditId);
				console.log('Document ID set to:', finalEditId);

				// Đảm bảo currentEditId được set
				if (!currentEditId && originalEditId) {
					setCurrentEditId(originalEditId);
				}
			}

			// Thêm status vào URL
			newUrl.searchParams.set('status', documentStatus);

			window.history.replaceState({}, '', newUrl);
			console.log('URL cleaned, editId and status updated');
		} catch (error) {
			console.error('Error in performAutoSaveAndCleanURL:', error);
		}
	};

	const loadTableInfo = async () => {
		try {
			// Prevent multiple simultaneous calls
			if (isLoadingTableInfo.current) {
				console.log('loadTableInfo already running, skipping...');
				return;
			}

			if (!analysisIds || analysisIds.length === 0) {
				setTableInfoContent('Không có ID chỉ tiêu để hiển thị thông tin bảng.');
				return;
			}

			// Check if popup is open, if so, defer the call
			const popupExists = document.getElementById('parameterSelectionOverlay');
			if (popupExists) {
				console.log('Popup is open, deferring loadTableInfo call');
				return;
			}

			isLoadingTableInfo.current = true;
			const analysisIdsString = JSON.stringify(analysisIds.sort());
			console.log('Loading table info for analysisIds:', analysisIds, 'cache key:', analysisIdsString);

			// Show loading state in the UI
			setTableInfoContent('<div style="color: #6b7280;">Đang tải thông tin...</div>');

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

			// Extract and store sample UIDs
			const extractedSampleUIDs = tableSampleInfo?.map((sample) => sample.sample_uid).filter((uid) => uid) || [];
			setSampleUIDs(extractedSampleUIDs);

			let tableInfoHtml = ''; // Display sample info
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
			console.log('loadTableInfo completed successfully');
		} catch (error) {
			console.error('Error loading table info:', error);
			setTableInfoContent(`<div style="color: #ef4444;">Lỗi khi tải thông tin bảng: ${error.message}</div>`);
		} finally {
			isLoadingTableInfo.current = false;
		}
	};

	const previewReport = async () => {
		const shouldFormat = window.confirm('Bạn có muốn định dạng lại tài liệu để phù hợp với trang in không?');

		if (shouldFormat) {
			formatReset();
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		try {
			if (!currentEditId) {
				await autoSaveLabResultReport();
				// if (!currentEditId) {
				// 	throw new Error('Không thể tạo mã tài liệu. Vui lòng thử lại.');
				// }
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
				setCurrentEditId(null);
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
			console.log('Auto-save executing...');

			const content =
				editorRef.current && editorRef.current.getContent ? editorRef.current.getContent() : editorContent;

			// // Validation: Don't auto-save if critical data is missing
			// if (!content || content.trim() === '' || content === '<p><br></p>') {
			// 	console.log('Auto-save skipped: No meaningful content');
			// 	return;
			// }

			// Bỏ kiểm tra headerData và template để auto-save luôn hoạt động khi có content
			// Đã comment out để auto-save hoạt động ngay cả khi không có template hoặc header data
			// const hasHeaderData = headerData && (headerData.title || headerData.code || headerData.publishNo);
			// if (!hasHeaderData && (!currentTemplate || !currentTemplate.id)) {
			// 	console.log('Auto-save skipped: No header data or template');
			// 	return;
			// }

			// Check if we have editId from URL, but only if we're not loading from docId
			const urlParams = new URLSearchParams(window.location.search);
			const urlEditId = urlParams.get('editId');
			const urlDocId = urlParams.get('docId');

			const requestBody = {
				metadata: {
					templateId: currentTemplate?.id || null,
					templateName: currentTemplate?.templateName || currentTemplate?.name || null,
					header: headerData, // Now this is a JSONB object
					content: content,
					footer: documentFooter || currentEditId,
					analysisIds: analysisIds || [],
					sampleUIDs: sampleUIDs || [],
					classifierCode: classifierCode || null,
				},
			};

			// Add editorId only if we have a valid editId AND we're not loading from docId
			// When loading from docId, we want to create a NEW document, not update existing one
			let editId = null;
			if (!urlDocId) {
				// Only use editId if we're not loading from docId
				editId = currentEditId || urlEditId;
			}
			// If loading from docId, editId stays null to create new document

			if (editId) {
				requestBody.editorId = editId;
				console.log('Auto-save with existing editId:', editId);
			} else {
				console.log('Auto-save creating new document (no editId)');
			}

			console.log('Auto-save request body:', requestBody);
			const response = await apiPost('https://red.irdop.org/v1/editor/auto_save/lab_result_report', requestBody);

			if (response.status === 200 && response.data && response.data.id) {
				const responseEditId = response.data.id;

				// Always update URL with editId from response
				const newUrl = new URL(window.location);
				newUrl.searchParams.set('editId', responseEditId);
				window.history.replaceState({}, '', newUrl);
				console.log('Updated URL with editId:', responseEditId);

				// If this is the first save (no editId in request), update state and show message
				if (!editId) {
					// This was a new document creation (no editId in request body)
					setCurrentEditId(responseEditId);

					// Show success message ONLY for new document creation
					showAutoHideMessage(`Đã tạo mã tài liệu: ${responseEditId}`, 'success');
				} else {
					// Update current editId state to match response
					setCurrentEditId(responseEditId);
				}

				// Update document info with auto-save data
				updateDocumentInfo(
					response.data.id,
					response.data.createdAt,
					response.data.modifiedAt || new Date().toISOString(),
					response.data.identityUID, // Author UID
					response.data.modifiedByUID, // Modified by UID
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
			// Prepare report data with exact structure: {header, content, footer, analysisIds, sampleUIDs, classifierCode}
			const reportData = {
				header: headerData,
				content: editorContent,
				footer: documentFooter || currentEditId,
				analysisIds: analysisIds || [],
				sampleUIDs: sampleUIDs || [],
				classifierCode: classifierCode || 'BIEN_BAN_KET_QUA_THU_NGHIEM', // Always include classifierCode
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/convert/lab_result_report_html', reportData);

			if (response.status === 200 && response.data) {
				showAutoHideMessage('Đã tạo preview thành công!', 'success');
				console.log(documentMetadata);
				// Show popup instead of new tab
				const htmlResponse = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
				showPreviewPopup(htmlResponse, {
					editId: currentEditId,
					metadata: {
						templateId: currentTemplate?.id,
						templateName: currentTemplate?.templateName || currentTemplate?.name,
						header: headerData,
						content: editorContent,
						footer: reportData.footer,
						analysisIds: analysisIds || [],
						sampleUIDs: sampleUIDs || [],
						classifierCode: classifierCode,
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

	const updateDocumentInfo = async (
		editId = null,
		createdAt = null,
		modifiedAt = null,
		identityUID = null, // Author UID (for createdAt)
		modifiedByUID = null, // Modified by UID (for modifiedAt)
	) => {
		if (!modifiedByUID && identityUID) {
			modifiedByUID = identityUID; // Use identityUID as modifiedByUID if not provided
		}
		if (editId && editId !== currentEditId) {
			setCurrentEditId(editId);
		}

		// Update document information state - Author info
		if (createdAt) {
			const date = new Date(createdAt).toLocaleDateString('vi-VN');
			console.log('Processing author info:', { createdAt, identityUID, date });
			if (identityUID) {
				try {
					const author = await getUserName(identityUID);
					console.log('Got author name:', author);
					setAuthor(author);
				} catch (error) {
					console.error('Error getting author name:', error);
					setAuthor('-');
				}
			} else {
				console.log('No identityUID, setting author to -');
				setAuthor('-'); // Default value if no identityUID
			}
			setAuthorAt(date);
		}

		// Update document information state - Modifier info
		if (modifiedAt) {
			const date = new Date(modifiedAt).toLocaleDateString('vi-VN');
			console.log('Processing modifier info:', { modifiedAt, modifiedByUID, date });
			if (modifiedByUID) {
				try {
					const modifier = await getUserName(modifiedByUID);
					console.log('Got modifier name:', modifier);
					setLastModified(modifier);
				} catch (error) {
					console.error('Error getting modifier name:', error);
					setLastModified('-');
				}
			} else {
				console.log('No modifiedByUID, setting lastModified to -');
				setLastModified('-'); // Default value if no modifiedByUID
			}
			setLastModifiedAt(date);
		}
	};

	const openParameterSelectionPopup = () => {
		// Check if popup already exists to prevent multiple instances
		const existingOverlay = document.getElementById('parameterSelectionOverlay');
		if (existingOverlay) {
			console.log('Popup already exists, not creating new one');
			return;
		}

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

		// Store reference to current analysisIds to prevent unnecessary updates
		const currentAnalysisIds = [...(analysisIds || [])];

		// Handle iframe load to pass current analysis IDs
		iframe.onload = function () {
			try {
				const iframeWindow = iframe.contentWindow;
				if (iframeWindow) {
					// Pass current analysis IDs to the popup
					iframeWindow.postMessage(
						{
							type: 'INIT_SELECTION',
							analysisIds: currentAnalysisIds,
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
				// Update analysis IDs only if they actually changed
				const newAnalysisIds = event.data.analysisIds || [];
				const newAnalysisIdsString = JSON.stringify(newAnalysisIds.sort());
				const currentAnalysisIdsString = JSON.stringify(currentAnalysisIds.sort());

				if (newAnalysisIdsString !== currentAnalysisIdsString) {
					console.log('Analysis IDs changed, updating...');
					setAnalysisIds(newAnalysisIds);

					// Also update global for backward compatibility
					if (typeof window !== 'undefined') {
						window.analysisIds = newAnalysisIds;
					}

					// Update URL with new analysis IDs (keep only editId and analysisIds)
					const newUrl = new URL(window.location);
					const currentEditId = newUrl.searchParams.get('editId');
					newUrl.search = '';
					if (currentEditId) {
						newUrl.searchParams.set('editId', currentEditId);
					}
					if (newAnalysisIds.length > 0) {
						newUrl.searchParams.set('analysisIds', newAnalysisIds.join(','));
					}
					window.history.replaceState({}, '', newUrl);

					// Trigger auto-save when analysis selection changes
					startAutoSave();
				} else {
					console.log('Analysis IDs unchanged, no update needed');
				}

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
			// After popup is closed, check if we need to load table info
			setTimeout(() => {
				if (analysisIds && analysisIds.length > 0 && !isLoadingTableInfo.current) {
					console.log('Popup closed, loading table info if needed');
					loadTableInfo();
				}
			}, 200);
		}
	};

	const handleScanData = async () => {
		try {
			// Kiểm tra xem có editId không
			if (!currentEditId) {
				showAutoHideMessage('Không có editId để quét dữ liệu', 'warning');
				return;
			}

			showAutoHideMessage('Đang quét dữ liệu...', 'info');

			// Chuẩn bị metadata hiện tại
			const currentMetadata = {
				templateId: currentTemplate?.id || null,
				templateName: currentTemplate?.templateName || currentTemplate?.name || null,
				header: headerData,
				content: editorContent,
				footer: documentFooter || currentEditId,
				analysisIds: analysisIds || [],
				sampleUIDs: sampleUIDs || [],
				classifierCode: classifierCode || null,
			};

			// Gửi API request
			const response = await apiPost('https://red.irdop.org/v1/edit/scan', {
				id: currentEditId,
				metadata: currentMetadata,
			});

			if (response.status === 200 && response.data) {
				const editData = response.data;
				console.log('Scan response data:', editData);

				// Cập nhật các giá trị từ dữ liệu quét được
				if (editData.metadata) {
					const metadata = editData.metadata;

					// Cập nhật header data
					if (metadata.header) {
						setHeaderData({
							title: metadata.header.title || headerData.title,
							code: metadata.header.code || headerData.code,
							publishNo: metadata.header.publishNo || headerData.publishNo,
							publishDate: metadata.header.publishDate || headerData.publishDate,
						});
					}

					// Cập nhật content vào editor
					if (metadata.content) {
						setEditorContent(metadata.content);
						const setContentWhenReady = () => {
							if (editorRef.current && editorRef.current.initialized) {
								editorRef.current.setContent(metadata.content);
							} else {
								setTimeout(setContentWhenReady, 200);
							}
						};
						setTimeout(setContentWhenReady, 500);
					}

					// Cập nhật template info - chỉ set khi có đầy đủ thông tin template
					if (metadata.templateId && (metadata.templateName || metadata.templateCode)) {
						setCurrentTemplate({
							id: metadata.templateId,
							templateName: metadata.templateName || '',
							name: metadata.templateName || '',
						});
					}

					// Cập nhật classifier code
					if (metadata.classifierCode) {
						setClassifierCode(metadata.classifierCode);
					}

					// Cập nhật analysisIds
					if (metadata.analysisIds && metadata.analysisIds.length > 0) {
						setAnalysisIds(metadata.analysisIds);
						if (typeof window !== 'undefined') {
							window.analysisIds = metadata.analysisIds;
						}
					}

					// Cập nhật sample UIDs
					if (metadata.sampleUIDs) {
						setSampleUIDs(metadata.sampleUIDs);
					}

					// Cập nhật document footer
					if (metadata.footer) {
						setDocumentFooter(metadata.footer);
					}
				}

				// Cập nhật document info nếu có
				if (editData.id || editData.createdAt || editData.modifiedAt) {
					updateDocumentInfo(
						editData.id || currentEditId,
						editData.createdAt,
						editData.modifiedAt,
						editData.identityUID, // Author UID
						editData.modifiedByUID, // Modified by UID
					);
				}

				showAutoHideMessage('Quét dữ liệu thành công!', 'success');
			} else {
				throw new Error('Lỗi khi quét dữ liệu: ' + (response.message || 'Unknown error'));
			}
		} catch (error) {
			console.error('Error in handleScanData:', error);
			showAutoHideMessage('Lỗi khi quét dữ liệu: ' + error.message, 'error');
		}
	};

	const insertTableInfo = async () => {
		// This function inserts table 1 at the beginning and table 2 at the end of the editor
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
			if (typeof editor.getContent !== 'function' || typeof editor.setContent !== 'function') {
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

			// Extract and update sample UIDs
			const extractedSampleUIDs = tableSampleInfo?.map((sample) => sample.sample_uid).filter((uid) => uid) || [];
			setSampleUIDs(extractedSampleUIDs);

			let table1HTML = '';
			let table2HTML = '';

			// Bảng 1: Thông tin mẫu thử (Mã mẫu, Tên mẫu, Mô tả mẫu)
			if (tableSampleInfo && tableSampleInfo.length > 0) {
				const sampleRows = tableSampleInfo
					.map(
						(sample, index) =>
							`<tr>
								<td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${sample.sample_uid || 'N/A'}</td>
								<td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${sample.sample_name || 'N/A'}</td>
								<td style="border: 1px solid #000; padding: 8px; font-size: 11px;"></td>
							</tr>`,
					)
					.join('');

				table1HTML = `
					<table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 16px;">
						<thead>
							<tr>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Mã mẫu</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Tên mẫu</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Mô tả mẫu</th>
							</tr>
						</thead>
						<tbody>
							${sampleRows}
						</tbody>
					</table>
				`;
			}

			// Bảng 2: Thông tin chỉ tiêu kiểm nghiệm (Mã mẫu, Mã chỉ tiêu, Chỉ tiêu, Kết quả, Đơn vị)
			if (tableAnalysisInfo && tableAnalysisInfo.length > 0) {
				const analysisRows = tableAnalysisInfo
					.map(
						(analysis, index) =>
							`<tr>
								<td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${analysis.sample_uid || 'N/A'}</td>
								<td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${analysis.id || 'N/A'}</td>
								<td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${analysis.parameter_name || 'N/A'}</td>
								<td style="border: 1px solid #000; padding: 8px; font-size: 11px;"></td>
								<td style="border: 1px solid #000; padding: 8px; font-size: 11px;"></td>
							</tr>`,
					)
					.join('');

				table2HTML = `
					<table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: 16px;">
						<thead>
							<tr>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Mã mẫu</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Mã chỉ tiêu</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Chỉ tiêu</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Kết quả</th>
								<th style="border: 1px solid #000; padding: 8px; background-color: #f9f9f9; font-size: 11px;">Đơn vị</th>
							</tr>
						</thead>
						<tbody>
							${analysisRows}
						</tbody>
					</table>
				`;
			}

			if (table1HTML || table2HTML) {
				// Get current editor content
				const currentContent = editor.getContent();

				// Combine: Table 1 + Current Content + Table 2
				const newContent = table1HTML + currentContent + table2HTML;

				// Set the new content (Table 1 at beginning, current content in middle, Table 2 at end)
				editor.setContent(newContent);
				setEditorContent(newContent);

				showAutoHideMessage('Đã chèn bảng thông tin (Bảng 1 ở đầu, Bảng 2 ở cuối) thành công', 'success');
			} else {
				showAutoHideMessage('Không có dữ liệu để tạo bảng', 'warning');
			}
		} catch (error) {
			console.error('Error inserting table info:', error);
			showAutoHideMessage('Lỗi khi chèn bảng: ' + error.message, 'error');
		}
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

			// Update URL with template ID (keep only editId and templateId)
			const newUrl = new URL(window.location);
			const currentEditId = newUrl.searchParams.get('editId');
			newUrl.search = '';
			if (currentEditId) {
				newUrl.searchParams.set('editId', currentEditId);
			}
			newUrl.searchParams.set('templateId', template.id);
			window.history.replaceState({}, '', newUrl);

			setShowTemplateSearchForm(false);
			showAutoHideMessage(`Đã chọn mẫu: ${template.templateName || template.name}`, 'success');

			// Trigger auto-save when template is selected
			startAutoSave();
		} catch (error) {
			console.error('Error selecting template:', error);
			showAutoHideMessage('Lỗi khi chọn mẫu biên bản', 'error');
		}
	};

	// Preview Popup Function
	const showPreviewPopup = (htmlContent, documentData) => {
		// Enter preview mode
		setIsPreviewMode(true);

		// Store extract data for potential use
		if (documentData.metadata && documentData.metadata.extractData) {
			setPreviewExtractData(documentData.metadata.extractData);
		} else {
			setPreviewExtractData(null);
		}

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

		// Submit report button (combined publish + PDF) - only show for BIEN_BAN_KET_QUA_THU_NGHIEM
		let submitBtn = null;
		if (classifierCode === 'BIEN_BAN_KET_QUA_THU_NGHIEM') {
			submitBtn = document.createElement('button');
			submitBtn.textContent = 'Nộp biên bản';
			submitBtn.style.cssText = `
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
			submitBtn.onmouseover = () => (submitBtn.style.background = '#059669');
			submitBtn.onmouseout = () => (submitBtn.style.background = '#10b981');
			submitBtn.onclick = () => handleSubmitReport(documentData, htmlContent);
		}

		// Extract data button (only show if extractData exists)
		let extractDataBtn = null;
		if (
			(documentData.metadata && documentData.metadata.extractData) ||
			(documentMetadata && documentMetadata.extractData)
		) {
			extractDataBtn = document.createElement('button');
			extractDataBtn.textContent = 'Dữ liệu trích xuất';
			extractDataBtn.style.cssText = `
				padding: 8px 16px;
				background: #f59e0b;
				color: white;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-weight: 500;
				font-size: 14px;
				transition: background-color 0.2s;
			`;
			extractDataBtn.onmouseover = () => (extractDataBtn.style.background = '#d97706');
			extractDataBtn.onmouseout = () => (extractDataBtn.style.background = '#f59e0b');
			extractDataBtn.onclick = () => {
				const extractData =
					(documentData.metadata && documentData.metadata.extractData) ||
					(documentMetadata && documentMetadata.extractData);
				const { analyses = [] } = extractData || {};

				// Tạo document object cho AnalysesExtract
				const documentForExtract = {
					id: currentEditId,
					metadata: {
						header: headerData,
						content: editorContent,
						extractData: {
							analyses: analyses || [],
						},
						analysisIds: analysisIds,
						sampleUIDs: sampleUIDs,
					},
				};

				// Gọi hàm helper để hiển thị popup
				showAnalysisExtractPopupInEditor(documentForExtract);
			};
		}

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
		printBtn.onclick = () => printDocument(htmlContent);

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
		closeBtn.onclick = () => {
			// Resume auto-save when closing preview
			setIsPreviewMode(false);
			setPreviewExtractData(null);
			overlay.remove();
		};

		if (submitBtn) {
			buttonGroup.appendChild(submitBtn);
		}
		if (extractDataBtn) {
			buttonGroup.appendChild(extractDataBtn);
		}
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
				// Exit preview mode
				setIsPreviewMode(false);
				setPreviewExtractData(null);
				overlay.remove();
			}
		});

		// Close on Escape key
		const handleEscape = (e) => {
			if (e.key === 'Escape') {
				// Exit preview mode
				setIsPreviewMode(false);
				setPreviewExtractData(null);
				overlay.remove();
				document.removeEventListener('keydown', handleEscape);
			}
		};
		document.addEventListener('keydown', handleEscape);
	};

	// Handle submit report (combined publish + PDF + lock)
	const handleSubmitReport = async (documentData, htmlContent) => {
		try {
			if (!documentData.editId) {
				showAutoHideMessage('Không có ID tài liệu để nộp', 'error');
				return;
			}

			// Skip lock check to allow multiple submissions

			// Confirm submit action
			const confirmSubmit = window.confirm(
				`Bạn có chắc chắn muốn nộp biên bản "${documentData.metadata.header.title || 'Lab Result Report'}"?`,
			);

			if (!confirmSubmit) {
				return;
			}

			// Show loading spinner
			showSubmitLoading(true);

			const currentDateTime = new Date()
				.toLocaleString('vi-VN', {
					timeZone: 'Asia/Ho_Chi_Minh',
					hour: '2-digit',
					minute: '2-digit',
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
					hour12: false,
				})
				.replace(/(\d{2}):(\d{2}), (\d{2})\/(\d{2})\/(\d{4})/, '$1:$2 $3/$4/$5');

			const currentUserUID = Cookies.get('identityUID') || '';

			// Call submit API to lock document and export
			const submitResponse = await apiPost('https://red.irdop.org/v1/edit/submit', {
				editId: documentData.editId,
				metadata: {
					...documentData.metadata,
					classifierCode: classifierCode || null,
					submittedAt: currentDateTime,
					submittedByUID: currentUserUID,
					lockedByUID: currentUserUID,
					status: 'SENDED',
				},
			});

			if (submitResponse.status === 200 && submitResponse.data) {
				showAutoHideMessage('Nộp biên bản thành công!', 'success');

				const responseData = submitResponse.data;
				const metadata = responseData.metadata;

				// Store full response for later use
				setLastSubmitResponse(responseData);

				// Update document status and lock from API response
				updateDocumentStatus('submitted');
				const lockUID = responseData.lockedByUID || currentUserUID;
				setLockedByUID(lockUID);
				// Get locked by user name
				getUserName(lockUID)
					.then((name) => {
						setLockedByName(name);
					})
					.catch((error) => {
						console.error('Error getting locked by name:', error);
						setLockedByName(lockUID); // Fallback to UID
					});
				setIsDocumentLocked(true);
				setDocumentFooter(metadata.footer || '');

				// Update submission info from API response
				if (metadata && metadata.submittedAt) {
					setSubmittedAt(metadata.submittedAt);
				} else {
					setSubmittedAt(currentDateTime);
				}

				if (metadata && metadata.submittedByUID) {
					// Get user name from UID
					getUserName(metadata.submittedByUID)
						.then((name) => {
							setSubmittedBy(name);
						})
						.catch((error) => {
							console.error('Error getting submitted by name:', error);
							setSubmittedBy(metadata.submittedByUID); // Fallback to UID
						});
				} else {
					// Get current user name
					const currentUserUID = Cookies.get('identityUID') || '';
					if (currentUserUID) {
						getUserName(currentUserUID)
							.then((name) => {
								setSubmittedBy(name);
							})
							.catch((error) => {
								console.error('Error getting current user name:', error);
								setSubmittedBy('Current User'); // Fallback
							});
					} else {
						setSubmittedBy('Current User');
					}
				}

				// Process extracted data from API response
				if (metadata && metadata.extractData) {
					const { analyses = [] } = metadata.extractData;
					console.log('Extracted data:', { analyses });
					showSubmitResultModal(analyses, []);
				} else {
					console.log('No extractData found in metadata:', metadata);
					// Show modal with empty data for testing
					showSubmitResultModal([], []);
				}

				// Log response for debugging
				console.log('Submit response:', responseData);

				// Note: Editor remains editable after submission, only auto-save is disabled for submitted documents
			} else {
				throw new Error('Failed to submit report');
			}
		} catch (error) {
			console.error('Submit error:', error);
			showAutoHideMessage('Lỗi khi nộp biên bản: ' + error.message, 'error');
		} finally {
			// Hide loading spinner
			showSubmitLoading(false);
		}
	};

	// Check document lock status from API
	const checkDocumentLockStatus = async () => {
		if (!currentEditId) return;

		try {
			const response = await apiPost('https://red.irdop.org/v1/editor/lab_result_report/get_editor', {
				id: currentEditId,
				searchTerm: '',
				page: 1,
			});

			if (response.status === 200 && response.data && response.data.result && response.data.result.length > 0) {
				const document = response.data.result[0];

				if (document.lockedByUID) {
					setLockedByUID(document.lockedByUID);
					// Get locked by user name
					getUserName(document.lockedByUID)
						.then((name) => {
							setLockedByName(name);
						})
						.catch((error) => {
							console.error('Error getting locked by name:', error);
							setLockedByName(document.lockedByUID); // Fallback to UID
						});
					setIsDocumentLocked(true);
					setDocumentStatus('SENDED');

					// Note: Editor remains editable, only auto-save is disabled for submitted documents
				}
			}
		} catch (error) {
			console.error('Error checking document lock status:', error);
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

	// Show submit loading overlay
	const showSubmitLoading = (show) => {
		setIsSubmitLoading(show);

		if (show) {
			// Create loading overlay
			const overlay = document.createElement('div');
			overlay.id = 'submitLoadingOverlay';
			overlay.style.cssText = `
				position: fixed;
				top: 0;
				left: 0;
				width: 100vw;
				height: 100vh;
				background: rgba(0, 0, 0, 0.7);
				z-index: 15000;
				display: flex;
				align-items: center;
				justify-content: center;
			`;

			const loadingContainer = document.createElement('div');
			loadingContainer.style.cssText = `
				background: white;
				border-radius: 12px;
				padding: 40px;
				text-align: center;
				box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
				min-width: 300px;
			`;

			const spinner = document.createElement('div');
			spinner.style.cssText = `
				width: 50px;
				height: 50px;
				border: 4px solid #f3f4f6;
				border-top: 4px solid #3b82f6;
				border-radius: 50%;
				animation: spin 1s linear infinite;
				margin: 0 auto 20px auto;
			`;

			const text = document.createElement('div');
			text.textContent = 'Đang nộp biên bản...';
			text.style.cssText = `
				font-size: 16px;
				font-weight: 600;
				color: #374151;
			`;

			// Add CSS animation for spinner
			const style = document.createElement('style');
			style.textContent = `
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`;
			document.head.appendChild(style);

			loadingContainer.appendChild(spinner);
			loadingContainer.appendChild(text);
			overlay.appendChild(loadingContainer);
			document.body.appendChild(overlay);
		} else {
			// Remove loading overlay
			const overlay = document.getElementById('submitLoadingOverlay');
			if (overlay) {
				overlay.remove();
			}
		}
	};

	// Helper function to show analysis extract popup using AnalysesExtract component
	const showAnalysisExtractPopupInEditor = async (doc) => {
		if (!doc || !doc.metadata || !doc.metadata.extractData || !doc.metadata.extractData.analyses) {
			showAutoHideMessage('Không có dữ liệu chỉ tiêu để hiển thị', 'warning');
			return;
		}

		// Set the document data and show the AnalysesExtract component
		setAnalysesExtractDocument(doc);
		setShowAnalysesExtract(true);
	};

	// Show submit result modal with analyses and nonconformity data - with editing capability
	const showSubmitResultModal = (analyses, nonconformityAnalyses) => {
		console.log('showSubmitResultModal called with:', { analyses, nonconformityAnalyses });

		// Create a document-like object for the analysis data popup
		const documentData = {
			id: currentEditId,
			metadata: {
				header: headerData,
				content: editorContent,
				extractData: {
					analyses: analyses || [],
				},
				analysisIds: analysisIds,
				sampleUIDs: sampleUIDs,
			},
		};

		// Use the simplified function to show AnalysesExtract component
		showAnalysisExtractPopupInEditor(documentData);
	};

	// Reload editor data from server
	const reloadEditorData = async () => {
		if (!currentEditId) {
			console.log('No editId available for reloading');
			return false;
		}

		try {
			console.log('Reloading editor data for editId:', currentEditId);

			const response = await apiPost('https://red.irdop.org/v1/editor/lab_result_report/get_editor', {
				id: currentEditId,
				searchTerm: '',
				page: 1,
			});

			if (response.status === 200 && response.data) {
				const document = response.data;
				console.log('Reloaded document data:', document);

				if (document && document.metadata) {
					const metadata = document.metadata;

					// Update header data
					if (metadata.header) {
						setHeaderData({
							title: metadata.header.title || '',
							code: metadata.header.code || '',
							publishNo: metadata.header.publishNo || '',
							publishDate: metadata.header.publishDate || '',
						});
					}

					// Update analysis IDs
					if (metadata.analysisIds) {
						setAnalysisIds(metadata.analysisIds);
					}

					// Update classifier code
					if (metadata.classifierCode) {
						setClassifierCode(metadata.classifierCode);
					}

					// Update metadata
					setDocumentMetadata(metadata);

					// Update editor content
					if (document.content && editorRef.current) {
						console.log('Reloading editor content, documentStatus:', documentStatus);
						editorRef.current.setContent(document.content);
						setEditorContent(document.content);
					}

					// Update document info with reloaded data
					console.log('Document data for reloadEditorData updateDocumentInfo:', {
						id: document.id,
						createdAt: document.createdAt,
						modifiedAt: document.modifiedAt,
						identityUID: document.identityUID,
						modifiedByUID: document.modifiedByUID,
					});
					updateDocumentInfo(
						document.id,
						document.createdAt,
						document.modifiedAt,
						document.identityUID, // Author UID
						document.modifiedByUID, // Modified by UID
					);

					console.log('Successfully reloaded editor data');
					return true;
				}
			}

			console.error('Failed to reload editor data:', response);
			return false;
		} catch (error) {
			console.error('Error reloading editor data:', error);
			return false;
		}
	};

	// Handle bulk update confirmation
	const handleBulkUpdateConfirm = async () => {
		try {
			console.log('Confirming bulk update with analyses:', submitResultData.analyses);

			const response = await apiPost('https://red.irdop.org/v1/analysis/update_bulk', {
				analyses: submitResultData.analyses,
			});

			if (response.status === 200) {
				showAutoHideMessage('Cập nhật dữ liệu thành công!', 'success');
				closeSubmitResultModal();
			} else {
				showAutoHideMessage('Lỗi khi cập nhật dữ liệu: ' + (response.message || 'Unknown error'), 'error');
			}
		} catch (error) {
			console.error('Error in bulk update:', error);
			showAutoHideMessage('Lỗi khi cập nhật dữ liệu: ' + error.message, 'error');
		}
	};

	// Close submit result modal
	const closeSubmitResultModal = async () => {
		setShowSubmitResult(false);
		setSubmitResultData({ analyses: [], nonconformityAnalyses: [] });

		// Load data from last submit response into current state
		if (lastSubmitResponse) {
			try {
				console.log('Loading data from submit response:', lastSubmitResponse);

				// Reload the latest data from server to get the updated metadata
				const reloadSuccess = await reloadEditorData();

				if (reloadSuccess) {
					console.log('Data reloaded successfully');
					showAutoHideMessage('Đã cập nhật dữ liệu từ kết quả submit', 'success');
				} else {
					showAutoHideMessage('Lỗi khi tải lại dữ liệu từ server', 'error');
				}
			} catch (error) {
				console.error('Error in closeSubmitResultModal:', error);
				showAutoHideMessage('Lỗi khi cập nhật dữ liệu: ' + error.message, 'error');
			}
		}

		// Clear the stored response
		setLastSubmitResponse(null);
	};

	// Print document
	const printDocument = (htmlContent) => {
		try {
			// Create a new window for printing
			const printWindow = window.open('', '_blank', 'width=800,height=600');

			// Write the HTML content to the new window
			printWindow.document.open();
			printWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Print - ${headerData.title || 'Lab Result Report'}</title>
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
				// Close the window after printing (optional)
				printWindow.onafterprint = function () {
					printWindow.close();
				};
			};

			showAutoHideMessage('Mở hộp thoại in thành công!', 'success');
		} catch (error) {
			console.error('Print error:', error);
			showAutoHideMessage('Lỗi khi in: ' + error.message, 'error');
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

	const getEditIdFromURL = () => {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get('editId');
	};

	// Handle editor content changes - trigger auto-save on any change
	const handleEditorChange = (content) => {
		setEditorContent(content);

		// Start auto-save on any content change (only once)
		startAutoSave();
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

	const handleClassifierCodeChange = (e) => {
		const newClassifierCode = e.target.value;
		setClassifierCode(newClassifierCode);

		// Update URL with new classifierCode
		const url = new URL(window.location);
		url.searchParams.set('classifierCode', newClassifierCode);
		window.history.replaceState({}, '', url);

		// Trigger auto-save when classifier code changes
		startAutoSave();
	};

	// File preview functionality (similar to DocumentEditor)
	const handleFilePreview = async (fileId) => {
		try {
			// Get download link directly using fileId
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10, // 10 minutes
				mode: 'view',
				fileId: fileId, // Use fileId directly instead of fileRecord
			});

			if (response.status === 200 && response.data) {
				// Open file directly in new tab instead of popup window
				window.open(response.data, '_blank');
			} else {
				throw new Error('Không thể lấy link download');
			}
		} catch (error) {
			console.error('File preview failed:', error);
			alert('Không thể xem file. Vui lòng thử lại.');
		}
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
			showAutoHideMessage(`Đã copy ${icon.name} vào clipboard!`, 'success');
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
			showAutoHideMessage(`Đã copy ${icon.name} vào clipboard!`, 'success');
			setShowIconPicker(false);
		}
	};

	const insertIconIntoEditor = (icon) => {
		if (editorRef.current && editorRef.current.initialized) {
			editorRef.current.insertContent(icon.html);
			showAutoHideMessage(`Đã chèn ${icon.name} vào editor!`, 'success');
			setShowIconPicker(false);
		} else {
			showAutoHideMessage('Editor chưa sẵn sàng', 'warning');
		}
	};

	// // Initialize document info on component mount
	// useEffect(() => {
	// 	const now = new Date();
	// 	const dateTimeString = now.toLocaleString('vi-VN');
	// 	setAuthor('Người dùng hiện tại');
	// 	setAuthorAt(dateTimeString);
	// 	setLastModified('Người dùng hiện tại');
	// 	setLastModifiedAt(dateTimeString);
	// }, []);

	// Handle header data changes - trigger auto-save on any change
	const handleHeaderDataChange = (field, value) => {
		// Update header data state
		setHeaderData((prev) => ({ ...prev, [field]: value }));

		// Start auto-save on any header change (only once)
		startAutoSave();
	};

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

        /* Icon Picker Modal Styles */
        .icon-preview {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Times New Roman', serif;
        }

        .icon-preview span {
          font-family: 'Times New Roman', serif;
        }

        .fraction-style {
          display: inline-block;
          text-align: center;
          vertical-align: middle;
          font-family: 'Times New Roman', serif;
        }

        .fraction-numerator {
          display: block;
          border-bottom: 1px solid black;
          font-size: 0.8em;
          line-height: 1;
          padding-bottom: 1px;
        }

        .fraction-denominator {
          display: block;
          font-size: 0.8em;
          line-height: 1;
          padding-top: 1px;
        }

        .sigma-style {
          position: relative;
          display: inline-block;
          font-size: 1.2em;
          vertical-align: middle;
          font-family: 'Times New Roman', serif;
        }

        .sigma-superscript {
          position: absolute;
          top: -0.5em;
          right: -0.8em;
          font-size: 0.6em;
        }

        .sigma-subscript {
          position: absolute;
          bottom: -0.3em;
          right: -0.8em;
          font-size: 0.6em;
        }

        /* Submit result modal styling */
        .bg-red-25 {
          background-color: #fef2f2;
        }

        /* Comparison indicator styling */
        .comparison-indicator {
          display: inline-block;
          margin-left: 4px;
          font-size: 14px;
          cursor: help;
          position: relative;
          color: #ef4444;
          animation: pulse 2s infinite;
        }

        .comparison-indicator:hover::after {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #374151;
        }

        .comparison-indicator:hover::before {
          content: '';
          position: absolute;
          bottom: 92%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: #1f2937;
          z-index: 1000;
        }

        /* Difference indicator styling for left table */
        .difference-indicator {
          display: inline-block;
          margin-left: 4px;
          font-size: 14px;
          cursor: help;
          position: relative;
          color: #ef4444;
          animation: pulse 2s infinite;
        }


        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        /* Enhanced table cell styling for comparison mode */
        .comparison-cell {
          position: relative;
        }

        .comparison-cell.has-difference {
          background-color: #fef3c7 !important;
          border-left: 3px solid #f59e0b !important;
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
										onChange={(e) => handleHeaderDataChange('title', e.target.value)}
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
										onChange={(e) => handleHeaderDataChange('code', e.target.value)}
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
										onChange={(e) => handleHeaderDataChange('publishNo', e.target.value)}
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
										onChange={(e) => handleHeaderDataChange('publishDate', e.target.value)}
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
										title="Chèn bảng thông tin chỉ tiêu"
										onClick={insertTableInfo}
									>
										Insert Table
									</button>
									<button
										className="py-1 px-3 text-xs font-semibold bg-white text-black border-2 border-gray-500 rounded hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
										title="Chèn biểu tượng và ký hiệu"
										onClick={showIconPickerModal}
									>
										Insert Icon
									</button>
								</div>

								<div className="flex gap-2">
									<button
										id="clearFormattingBtn"
										className="py-1 px-3 text-xs font-semibold bg-white text-black border-2 border-gray-500 rounded hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
										title="Xóa toàn bộ định dạng"
										onClick={clearFormatting}
									>
										Auto Format
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
									onEditorChange={handleEditorChange}
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
												// Initial data loading is handled in useEffect, no need to call here
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
											id="footerEditIdInput"
											type="text"
											readOnly
											placeholder="Chưa có mã"
											className="px-3 py-1 text-sm font-semibold bg-white text-black min-w-32 border-2 border-gray-500 rounded-md focus:border-gray-700 shadow-sm"
											style={{ fontFamily: "'Times New Roman', serif" }}
											value={documentFooter || currentEditId || ''}
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
										{isDocumentLocked || lockedByUID ? (
											<span className="text-red-600 font-semibold">
												🔒 SUBMITTED
												{lockedByName && <span className="text-sm text-gray-500 ml-1">- {lockedByName}</span>}
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
											name="classifierCode"
											value="BIEN_BAN_KET_QUA_THU_NGHIEM"
											checked={classifierCode === 'BIEN_BAN_KET_QUA_THU_NGHIEM'}
											onChange={handleClassifierCodeChange}
											className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
										/>
										<label
											htmlFor="bien_ban"
											className={`ml-3 text-sm font-semibold cursor-pointer transition-colors duration-200 ${
												classifierCode === 'BIEN_BAN_KET_QUA_THU_NGHIEM' ? 'text-blue-600' : 'text-gray-700'
											}`}
										>
											Biên bản kiểm nghiệm
										</label>
									</div>

									<div className="flex items-center">
										<input
											type="radio"
											id="nhat_ky"
											name="classifierCode"
											value="NHAT_KY_THU_NGHIEM"
											checked={classifierCode === 'NHAT_KY_THU_NGHIEM'}
											onChange={handleClassifierCodeChange}
											className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
										/>
										<label
											htmlFor="nhat_ky"
											className={`ml-3 text-sm font-semibold cursor-pointer transition-colors duration-200 ${
												classifierCode === 'NHAT_KY_THU_NGHIEM' ? 'text-blue-600' : 'text-gray-700'
											}`}
										>
											Nhật ký thử nghiệm
										</label>
									</div>

									<div className="flex items-center">
										<input
											type="radio"
											id="tai_lieu"
											name="classifierCode"
											value="TAI_LIEU_KHAC"
											checked={classifierCode === 'TAI_LIEU_KHAC'}
											onChange={handleClassifierCodeChange}
											className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
										/>
										<label
											htmlFor="tai_lieu"
											className={`ml-3 text-sm font-semibold cursor-pointer transition-colors duration-200 ${
												classifierCode === 'TAI_LIEU_KHAC' ? 'text-blue-600' : 'text-gray-700'
											}`}
										>
											Tài liệu khác
										</label>
									</div>
								</div>

								{/* Thông tin mẫu văn bản (hiển thị cho tất cả loại văn bản) */}
								<div className="mt-4">
									<div className="text-sm font-semibold text-gray-700 mb-2 text-left ml-2">Thông tin mẫu văn bản</div>
									<div className="">
										{currentTemplate ? (
											<div className="space-y-2">
												<div className="ml-4 -3 bg-gray-50 rounded-lg">
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
													Chưa chọn mẫu văn bản
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
							</div>
						</div>

						{/* Box 3: Thông tin liên quan */}
						<div className="bg-white rounded-box border-2 border-gray-500 shadow-sm hover:border-gray-700 hover:shadow-md transition-all flex-1 min-h-fit">
							<div className="bg-white text-gray-800 px-4 py-3 border-b-2 border-gray-500 font-semibold text-sm text-left rounded-box-header flex items-center justify-between">
								<span>Thông tin liên quan</span>
								{/* Nút quét chỉ hiện khi chọn biên bản kiểm nghiệm */}
								{classifierCode === 'BIEN_BAN_KET_QUA_THU_NGHIEM' && (
									<button
										className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold border-0 transition-all duration-200 shadow-md"
										title="Quét dữ liệu"
										onClick={handleScanData}
									>
										Quét
									</button>
								)}
							</div>
							<div className="p-4 bg-white rounded-box-content min-h-fit">
								{/* Chỉ tiêu đã chọn (chỉ hiện khi chọn biên bản kiểm nghiệm) */}
								{classifierCode === 'BIEN_BAN_KET_QUA_THU_NGHIEM' && (
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
								{/* Thông báo khi không phải biên bản kiểm nghiệm */}
								{classifierCode !== 'BIEN_BAN_KET_QUA_THU_NGHIEM' && (
									<div className="text-center py-8 text-gray-500">
										<p className="text-sm">Thông tin liên quan chỉ hiển thị cho Biên bản kiểm nghiệm</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Template Search Modal */}
			{showTemplateSearchForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-800">
								{classifierCode === 'BIEN_BAN_KET_QUA_THU_NGHIEM'
									? 'Tìm kiếm mẫu biên bản'
									: classifierCode === 'NHAT_KY_THU_NGHIEM'
									? 'Tìm kiếm mẫu nhật ký thử nghiệm'
									: 'Tìm kiếm mẫu tài liệu'}
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
										{classifierCode === 'BIEN_BAN_KET_QUA_THU_NGHIEM'
											? 'Không tìm thấy mẫu biên bản nào'
											: classifierCode === 'NHAT_KY_THU_NGHIEM'
											? 'Không tìm thấy mẫu nhật ký thử nghiệm nào'
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

			{/* Icon Picker Modal */}
			{showIconPicker && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-auto">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-800">Chọn biểu tượng để chèn</h3>
							<button
								onClick={() => setShowIconPicker(false)}
								className="text-gray-500 hover:text-gray-700 text-xl font-bold"
							>
								×
							</button>
						</div>

						<div className="grid grid-cols-2 gap-4">
							{iconList.map((icon, index) => (
								<div
									key={index}
									className="border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
								>
									<div className="flex items-center justify-between mb-2">
										<span className="font-medium text-sm text-gray-700">{icon.name}</span>
									</div>

									<div
										className="icon-preview text-2xl mb-3 p-2 bg-gray-50 rounded text-center"
										dangerouslySetInnerHTML={{ __html: icon.html }}
									/>

									<div className="flex gap-2">
										<button
											onClick={() => copyIconToClipboard(icon)}
											className="flex-1 py-1 px-2 text-xs font-semibold bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
											title="Copy vào clipboard"
										>
											Copy
										</button>
										<button
											onClick={() => insertIconIntoEditor(icon)}
											className="flex-1 py-1 px-2 text-xs font-semibold bg-green-500 text-white rounded hover:bg-green-600 transition-all"
											title="Chèn vào editor"
										>
											Insert
										</button>
									</div>
								</div>
							))}
						</div>

						<div className="mt-4 flex justify-end">
							<button
								onClick={() => setShowIconPicker(false)}
								className="px-4 py-2 text-sm font-semibold bg-white text-black border-2 border-gray-500 rounded-md hover:bg-gray-50 hover:border-gray-700 transition-all shadow-sm"
							>
								Đóng
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Submit Result Modal */}
			{showSubmitResult && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-[60000] flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-auto">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-xl font-semibold text-gray-800">Kết quả nộp biên bản</h3>
							<button onClick={closeSubmitResultModal} className="text-gray-500 hover:text-gray-700 text-xl font-bold">
								×
							</button>
						</div>

						<div className="space-y-6">
							{/* Analyses Table */}
							<div>
								<h4 className="text-lg font-semibold text-gray-700 mb-3">Thông tin các chỉ tiêu</h4>
								{submitResultData.analyses && submitResultData.analyses.length > 0 ? (
									<div className="overflow-x-auto">
										<table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
											<thead className="bg-gray-50">
												<tr>
													<th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">
														ID
													</th>
													<th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">
														Sample UID
													</th>
													<th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">
														Parameter Name
													</th>
													<th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">
														Protocol Code
													</th>
													<th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">
														Result Value
													</th>
													<th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">
														Result Unit
													</th>
												</tr>
											</thead>
											<tbody>
												{submitResultData.analyses.map((analysis, index) => (
													<tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
														<td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200">
															{analysis.id || '-'}
														</td>
														<td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200">
															{analysis.sampleUID || '-'}
														</td>
														<td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200">
															{analysis.parameterName || '-'}
														</td>
														<td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200">
															{analysis.protocolCode || '-'}
														</td>
														<td
															className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200"
															dangerouslySetInnerHTML={{ __html: analysis.resultValue || '-' }}
														/>
														<td
															className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200"
															dangerouslySetInnerHTML={{ __html: analysis.resultUnit || '-' }}
														/>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<div className="text-center py-8 text-gray-500">Không có dữ liệu analyses</div>
								)}
							</div>
						</div>

						<div className="mt-6 flex justify-end gap-3">
							<button
								onClick={closeSubmitResultModal}
								className="px-6 py-2 text-sm font-semibold bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all shadow-sm"
							>
								Hủy bỏ
							</button>
							<button
								onClick={handleBulkUpdateConfirm}
								className="px-6 py-2 text-sm font-semibold bg-green-500 text-white rounded-md hover:bg-green-600 transition-all shadow-sm"
							>
								Xác nhận
							</button>
						</div>
					</div>
				</div>
			)}

			{/* AnalysesExtract Component */}
			{showAnalysesExtract && analysesExtractDocument && (
				<AnalysesExtract
					document={analysesExtractDocument}
					showAnalysisExtractInstead={true}
					editId={currentEditId}
					onClose={() => setShowAnalysesExtract(false)}
				/>
			)}
		</>
	);
};

export default Editor;
