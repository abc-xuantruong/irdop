import React, { useState, useEffect, useContext, useCallback, memo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FaFileAlt, FaSearch, FaClock, FaDownload, FaTimes } from 'react-icons/fa';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../../contexts/GlobalContext';
import TinyMceInput from '../Input';
import ExperimentDetail from './ExperimentDetail';

const ExperimentLog = () => {
	const { currentUser, getIdenByUid } = useContext(GlobalContext);

	// Utility functions
	const isAdmin = () => {
		return currentUser?.role?.staff_admin === true;
	};

	// Helper function to get identity name from document
	const getIdentityName = (doc) => {
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

		for (const uid of possibleUIDs) {
			if (uid && identityNames[uid]) {
				return identityNames[uid];
			}
		}

		const firstUID = possibleUIDs.find((uid) => uid);
		return firstUID || 'N/A';
	};

	// Fetch identity name by UID
	const fetchIdentityName = async (identityUID) => {
		if (!identityUID || identityNames[identityUID]) {
			return identityNames[identityUID] || identityUID;
		}

		try {
			const identity = await getIdenByUid(identityUID);
			if (identity && identity.identity_name) {
				setIdentityNames((prev) => ({
					...prev,
					[identityUID]: identity.identity_name,
				}));
				return identity.identity_name;
			}
		} catch (error) {
			console.error('Error fetching identity:', error);
		}

		return identityUID;
	};

	// States
	const [selectedDocumentForPreview, setSelectedDocumentForPreview] = useState(null);
	const [selectedDocument, setSelectedDocument] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [lastSearchTerm, setLastSearchTerm] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [mode, setMode] = useState('all');
	const [identityNames, setIdentityNames] = useState({});
	const [documents, setDocuments] = useState([]);
	const [status, setStatus] = useState('all'); // 'all', 'pending', 'approved'
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [pagination, setPagination] = useState({
		currentPage: 1,
		itemsPerPage: 10,
		totalItems: 0,
		totalPages: 1,
	});
	const [showDetailModal, setShowDetailModal] = useState(false);
	const [selectedDetailDocument, setSelectedDetailDocument] = useState(null);

	// Preview file states
	const [previewFile, setPreviewFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState('');

	// Debounce timeout for search
	const [searchTimeout, setSearchTimeout] = useState(null);

	// Ref for status dropdown positioning
	const statusButtonRef = useRef(null);
	const statusDropdownRef = useRef(null);

	// Refs for column width calculation
	const titleHeaderRef = useRef(null);
	const samplesHeaderRef = useRef(null);
	const [actualColumnWidths, setActualColumnWidths] = useState({
		title: null,
		samples: null,
	});

	const [hideSamplesColumn, setHideSamplesColumn] = useState(false);

	// Tooltip states
	const [showTooltip, setShowTooltip] = useState(null); // 'analyses' | 'samples' | null
	const [tooltipData, setTooltipData] = useState(null);
	const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
	const tooltipRef = useRef(null);

	// URL Query Params management
	const updateUrlParams = (params) => {
		const url = new URL(window.location);
		Object.keys(params).forEach((key) => {
			if (params[key] && params[key] !== 'all' && params[key] !== '') {
				url.searchParams.set(key, params[key]);
			} else {
				url.searchParams.delete(key);
			}
		});
		window.history.pushState({}, '', url);
	};

	const getUrlParams = () => {
		const url = new URL(window.location);
		return {
			searchTerm: url.searchParams.get('search') || '',
			page: parseInt(url.searchParams.get('page')) || 1,
			status: url.searchParams.get('status') || 'all',
		};
	};

	// API constants - sử dụng classifierCode cho nhật ký Thử nghiệm
	const DRAFT_DOCS_API_ENDPOINT = 'https://red.irdop.org/v1/editor/lab_result_report/get_editor';
	const PUBLISHED_DOCS_API_ENDPOINT = 'https://red.irdop.org/v1/document/get_doc';

	// Show auto-hide message function
	const showAutoHideMessage = (message, type = 'info') => {
		const existingMessage = document.getElementById('autoHideMessage');
		if (existingMessage) {
			existingMessage.remove();
		}

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

		setTimeout(() => {
			messageDiv.style.opacity = '1';
			messageDiv.style.transform = 'translateX(0)';
		}, 100);

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

	// Load documents from API - chỉ load nhật ký Thử nghiệm
	const loadDocuments = async (searchTermToUse = '', page = 1, currentMode = mode, currentStatus = status) => {
		try {
			setIsLoading(true);

			console.log('📚 Loading experiment logs:', {
				searchTermToUse,
				page,
				currentMode,
				status,
			});

			const finalMode = 'all';

			let apiEndpoint, requestBody;

			apiEndpoint = PUBLISHED_DOCS_API_ENDPOINT;
			requestBody = {
				searchTerm: searchTermToUse,
				page: page,
				mode: finalMode,
				classifierCode: ['NHAT_KY_THU_NGHIEM', 'BIEN_BAN_THU_NGHIEM'], // Lấy nhật ký Thử nghiệm và biên bản thử nghiệm
			};

			// Only add status if not 'all'
			if (currentStatus !== 'all') {
				requestBody.status = currentStatus;
			}

			const response = await apiPostLocal(apiEndpoint, requestBody);

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}

				const transformedDocuments = (result.result || []).map((doc) => ({
					id: doc.id,
					title:
						doc.jsonContent?.header?.title ||
						doc.metadata?.header?.title ||
						doc.metadata?.templateName ||
						'Nhật ký Thử nghiệm không có tên',
					templateCode: doc.metadata?.templateId || 'N/A',
					lastModified: formatDateTimeGMT7(doc.modifiedAt),
					identityUID: doc.identityUID || 'N/A',
					author: doc.metadata?.modifiedBy || doc.metadata?.authorName || 'N/A',
					status: currentStatus,
					createdAt: doc.createdAt,
					modifiedAt: doc.modifiedAt,
					authorName: doc.metadata?.authorName,
					modifiedBy: doc.metadata?.modifiedBy,
					metadata: doc.metadata || {},
					jsonContent: doc.jsonContent || {},
					fileId: doc.fileId,
					originalData: doc,
				}));

				// Update documents incrementally instead of replacing all
				setDocuments((prevDocuments) => {
					const updatedDocuments = [...prevDocuments];
					const newDocuments = [];
					const existingIds = new Set(prevDocuments.map((doc) => doc.id));

					transformedDocuments.forEach((newDoc) => {
						const existingIndex = updatedDocuments.findIndex((doc) => doc.id === newDoc.id);
						if (existingIndex !== -1) {
							// Update existing document
							updatedDocuments[existingIndex] = newDoc;
						} else {
							// Add new document
							newDocuments.push(newDoc);
						}
					});

					// Remove documents that are no longer in the result
					const newIds = new Set(transformedDocuments.map((doc) => doc.id));
					const filteredDocuments = updatedDocuments.filter((doc) => newIds.has(doc.id));

					// Add new documents at the end
					return [...filteredDocuments, ...newDocuments];
				});

				setLastSearchTerm(searchTermToUse);

				if (selectedDocument) {
					const foundDoc = transformedDocuments.find((doc) => doc.id === selectedDocument.id);
					if (foundDoc) {
						setSelectedDocument(foundDoc);
					} else {
						setSelectedDocument(null);
					}
				}

				if (selectedDocumentForPreview) {
					const foundPreviewDoc = transformedDocuments.find((doc) => doc.id === selectedDocumentForPreview.id);
					if (foundPreviewDoc) {
						const hasMetadataChanges =
							JSON.stringify(foundPreviewDoc.metadata) !== JSON.stringify(selectedDocumentForPreview.metadata) ||
							foundPreviewDoc.fileId !== selectedDocumentForPreview.fileId;
						if (hasMetadataChanges) {
							setSelectedDocumentForPreview(foundPreviewDoc);
						}
					}
				}

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

				if (uniqueUIDs.length > 0) {
					uniqueUIDs.forEach(async (uid) => {
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

	// Load data on component mount
	useEffect(() => {
		const urlParams = getUrlParams();
		setSearchTerm(urlParams.searchTerm);
		setLastSearchTerm(urlParams.searchTerm);
		setStatus(urlParams.status);
		setPagination((prev) => ({ ...prev, currentPage: urlParams.page }));

		loadDocuments(urlParams.searchTerm, urlParams.page, 'all', urlParams.status);

		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		};
	}, [currentUser]);

	// Reset modal states on component mount
	useEffect(() => {
		setShowDetailModal(false);
		setSelectedDetailDocument(null);
		setIsCreateModalOpen(false);
		setSelectedDocument(null);
		setSelectedDocumentForPreview(null);
		setPreviewFile(null);
		setPreviewUrl('');
	}, []);

	// Debug modal state changes
	useEffect(() => {}, [isCreateModalOpen]);

	useEffect(() => {}, [showDetailModal]);

	// Handle click outside for status dropdown
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				showStatusDropdown &&
				statusButtonRef.current &&
				statusDropdownRef.current &&
				!statusButtonRef.current.contains(event.target) &&
				!statusDropdownRef.current.contains(event.target)
			) {
				setShowStatusDropdown(false);
			}
		};

		if (showStatusDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showStatusDropdown]);

	// Silent refresh function for auto-refresh (no loading indicator)
	const silentRefreshDocuments = async (searchTermToUse = '', page = 1, currentMode = mode, currentStatus = status) => {
		try {
			console.log('📚 Silent refresh experiment logs:', {
				searchTermToUse,
				page,
				currentMode,
				currentStatus,
			});

			const finalMode = 'all';

			let apiEndpoint, requestBody;

			apiEndpoint = PUBLISHED_DOCS_API_ENDPOINT;
			requestBody = {
				searchTerm: searchTermToUse,
				page: page,
				mode: finalMode,
				classifierCode: ['NHAT_KY_THU_NGHIEM', 'BIEN_BAN_THU_NGHIEM'],
			};

			// Only add status if not 'all'
			if (currentStatus !== 'all') {
				requestBody.status = currentStatus;
			}

			const response = await apiPostLocal(apiEndpoint, requestBody);

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}

				const transformedDocuments = (result.result || []).map((doc) => ({
					id: doc.id,
					title:
						doc.jsonContent?.header?.title ||
						doc.metadata?.header?.title ||
						doc.metadata?.templateName ||
						'Nhật ký Thử nghiệm không có tên',
					templateCode: doc.metadata?.templateId || 'N/A',
					lastModified: formatDateTimeGMT7(doc.modifiedAt),
					identityUID: doc.identityUID || 'N/A',
					author: doc.metadata?.modifiedBy || doc.metadata?.authorName || 'N/A',
					status: currentStatus,
					createdAt: doc.createdAt,
					modifiedAt: doc.modifiedAt,
					authorName: doc.metadata?.authorName,
					modifiedBy: doc.metadata?.modifiedBy,
					metadata: doc.metadata || {},
					jsonContent: doc.jsonContent || {},
					fileId: doc.fileId,
					originalData: doc,
				}));

				// Update documents silently
				setDocuments(transformedDocuments);

				// Update pagination if needed
				setPagination((prevPagination) => ({
					...prevPagination,
					totalItems: result.pagination?.totalItems || transformedDocuments.length,
					totalPages: result.pagination?.totalPages || Math.ceil(transformedDocuments.length / 10),
				}));

				// Update identity names for new UIDs
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

				if (uniqueUIDs.length > 0) {
					uniqueUIDs.forEach(async (uid) => {
						await fetchIdentityName(uid);
					});
				}
			}
		} catch (error) {
			console.error('Error during silent refresh:', error);
			// Don't show error to user during silent refresh
		}
	};

	// Auto-refresh data every minute
	useEffect(() => {
		const interval = setInterval(() => {
			// Get current URL params for silent refresh
			const urlParams = getUrlParams();
			silentRefreshDocuments(urlParams.searchTerm, urlParams.page, mode, urlParams.status);
		}, 60000); // 60 seconds

		return () => clearInterval(interval);
	}, [mode, status, lastSearchTerm, pagination.currentPage]);

	// Calculate actual column widths
	useEffect(() => {
		const calculateColumnWidths = () => {
			if (titleHeaderRef.current && samplesHeaderRef.current) {
				const titleWidth = titleHeaderRef.current.getBoundingClientRect().width;
				const samplesWidth = samplesHeaderRef.current.getBoundingClientRect().width;

				setActualColumnWidths({
					title: titleWidth,
					samples: samplesWidth,
				});
			}
		};

		// Calculate on mount and when window resizes
		calculateColumnWidths();

		const handleResize = () => {
			calculateColumnWidths();
		};

		window.addEventListener('resize', handleResize);

		// Also recalculate when documents change (layout might change)
		const timeoutId = setTimeout(calculateColumnWidths, 100);

		return () => {
			window.removeEventListener('resize', handleResize);
			clearTimeout(timeoutId);
		};
	}, [documents]);

	// Refresh data
	const refreshData = async () => {
		setIsLoading(true);
		try {
			await loadDocuments(lastSearchTerm, pagination.currentPage, mode, status);
		} catch (error) {
			console.error('Error refreshing data:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle status change
	const handleStatusChange = async (newStatus) => {
		if (newStatus === status) return;

		setStatus(newStatus);
		setPagination((prev) => ({ ...prev, currentPage: 1 }));

		// Update URL params
		updateUrlParams({
			search: lastSearchTerm,
			page: 1,
			status: newStatus,
		});

		await loadDocuments(lastSearchTerm, 1, mode, newStatus);
	};

	// Handle search input changes
	const handleSearchInputChange = (value) => {
		setSearchTerm(value);

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		const timeout = setTimeout(() => {}, 300);

		setSearchTimeout(timeout);
	};

	// Execute search
	const executeSearch = async () => {
		if (searchTerm !== lastSearchTerm) {
			setPagination((prev) => ({ ...prev, currentPage: 1 }));

			// Update URL params
			updateUrlParams({
				search: searchTerm,
				page: 1,
				status: status,
			});

			await loadDocuments(searchTerm, 1, mode, status);
		}
	};

	// Search on Enter key
	const handleSearchKeyPress = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			executeSearch();
		}
	};

	// Handle document click for preview
	const handleDocumentClick = async (doc) => {
		if (selectedDocument?.id !== doc?.id) {
			setSelectedDocument(doc);
		}

		if (selectedDocumentForPreview?.id !== doc?.id) {
			setSelectedDocumentForPreview(doc);
		}
	};

	// Handle document click for detail modal
	const handleDocumentClickForDetail = async (doc) => {
		setSelectedDetailDocument(doc);
		setShowDetailModal(true);
	};

	// Handle close detail modal
	const handleCloseDetailModal = () => {
		setShowDetailModal(false);
		setSelectedDetailDocument(null);

		// Clear all selection states to ensure fresh start
		setSelectedDocument(null);
		setSelectedDocumentForPreview(null);

		// Silent refresh to update data after closing modal
		const urlParams = getUrlParams();
		silentRefreshDocuments(urlParams.searchTerm, urlParams.page, mode, urlParams.status);
	};

	// Handle tooltip show
	const handleTooltipShow = (event, type, data) => {
		event.stopPropagation();
		const rect = event.target.getBoundingClientRect();
		setTooltipPosition({
			x: rect.left + window.scrollX,
			y: rect.bottom + window.scrollY + 5,
		});
		setTooltipData(data);
		setShowTooltip(type);
	};

	// Handle tooltip hide
	const handleTooltipHide = () => {
		setShowTooltip(null);
		setTooltipData(null);
	};

	// Format tooltip content
	const formatTooltipContent = (data, type, isDocData = false) => {
		let analysesData = [];
		let samplesData = [];

		if (type === 'analyses' && typeof data === 'object' && !Array.isArray(data)) {
			analysesData = data.analyses || [];
			samplesData = data.samples || [];
		} else if (Array.isArray(data)) {
			if (type === 'analyses') {
				analysesData = data;
			} else {
				samplesData = data;
			}
		}

		if (!analysesData.length && !samplesData.length) return <div className="text-sm">Không có dữ liệu</div>;

		// Define column widths
		const columnWidths = {
			sampleId: '90px',
			testId: '100px',
			testName: '200px',
			testprotocolCode: '160px',
			testResult: '150px',
			testUnit: '120px',
		};

		// Define column order and labels
		const columnConfig = {
			analyses: {
				title: isDocData ? null : 'Thông tin phép thử',
				order: ['sampleId', 'testId', 'testName', 'testprotocolCode', 'testResult', 'testUnit'],
				labels: {
					sampleId: 'Mã mẫu',
					testId: 'Mã chỉ tiêu',
					testName: 'Tên chỉ tiêu',
					testprotocolCode: 'Phương pháp thử',
					testResult: 'Kết quả',
					testUnit: 'Đơn vị',
				},
			},
			samples: {
				title: 'Thông tin mẫu thử',
				order: ['sampleId', 'sampleName', 'sampleDescription'],
				labels: {
					sampleId: 'Mã mẫu thử',
					sampleName: 'Tên mẫu thử',
					sampleDescription: 'Mô tả mẫu',
				},
			},
		};

		const config = columnConfig[type];
		if (!config) return <div className="text-sm">Không có dữ liệu</div>;

		const displayData = type === 'analyses' ? analysesData : samplesData;

		return (
			<table className="w-full text-sm">
				<tbody>
					{displayData.map((item, rowIndex) => {
						const sampleId = type === 'analyses' ? samplesData[rowIndex]?.sampleId || '--' : item.sampleId;
						const isFirstRow = rowIndex === 0;
						const isLastRow = rowIndex === displayData.length - 1;
						return (
							<tr key={rowIndex} className={`border-b border-gray-700 ${isLastRow ? 'last:border-b-0' : ''}`}>
								{config.order.map((key, colIndex) => {
									let value = '--';
									if (key === 'sampleId') {
										value = sampleId || '--';
									} else if (key === 'testResult' || key === 'testUnit') {
										// Strip HTML tags and get plain text for fixed width display
										const plainText = item[key] ? item[key].replace(/<[^>]*>/g, '') : '--';
										value = plainText;
									} else {
										value = item[key] || '--';
									}
									return (
										<td
											key={colIndex}
											className="text-gray-100 truncate"
											style={{
												width: columnWidths[key] || 'auto',
												minWidth: columnWidths[key] || 'auto',
												maxWidth: columnWidths[key] || 'auto',
												whiteSpace: 'nowrap',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												padding:
													isFirstRow && colIndex === 0
														? '0 8px 4px 8px'
														: isLastRow && colIndex === config.order.length - 1
														? '4px 8px 0 8px'
														: '4px 8px',
											}}
											title={typeof value === 'string' ? value : ''}
										>
											{value}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		);
	};

	// Handle close create modal
	const handleCloseCreateModal = () => {
		setIsCreateModalOpen(false);

		// Clear all selection states to ensure fresh start
		setSelectedDetailDocument(null);
		setSelectedDocument(null);
		setSelectedDocumentForPreview(null);

		// Silent refresh to update data after closing modal
		const urlParams = getUrlParams();
		silentRefreshDocuments(urlParams.searchTerm, urlParams.page, mode, urlParams.status);

		// Force re-render check
		setTimeout(() => {}, 100);
	};

	// Handle file preview
	const handleFileAction = async (fileRecord, mode) => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: mode,
				fileRecord: fileRecord,
			});

			if (response.status === 200 && response.data) {
				if (mode === 'view') {
					// Hiển thị preview trong popup
					setPreviewFile(fileRecord);
					setPreviewUrl(response.data);
				} else if (mode === 'download') {
					// Download file using blob
					const downloadResponse = await fetch(response.data);
					const blob = await downloadResponse.blob();
					const url = window.URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = fileRecord.originInfo?.fileName || 'download';
					document.body.appendChild(a);
					a.click();
					window.URL.revokeObjectURL(url);
					document.body.removeChild(a);
				}
			}
		} catch (error) {
			console.error(`${mode} failed:`, error);
		}
	};

	// Handle close preview
	const handleClosePreview = () => {
		setPreviewFile(null);
		setPreviewUrl('');
	};

	// ExtractedDataView Component - No longer used, replaced with modal
	const ExtractedDataView = ({ document }) => {
		return null;
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

		// Update URL params
		updateUrlParams({
			search: lastSearchTerm,
			page: newPage,
			status: status,
		});

		await loadDocuments(lastSearchTerm, newPage, mode, status);
	};

	// FilePreview Component
	const FilePreview = ({ url, fileName, onClose, isVisible }) => {
		const getFileExtension = (filename) => {
			return filename?.split('.').pop()?.toLowerCase() || '';
		};

		const isImage = (filename) => {
			const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
			return imageExtensions.includes(getFileExtension(filename));
		};

		const isPdf = (filename) => {
			return getFileExtension(filename) === 'pdf';
		};

		const isVideo = (filename) => {
			const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
			return videoExtensions.includes(getFileExtension(filename));
		};

		const isAudio = (filename) => {
			const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
			return audioExtensions.includes(getFileExtension(filename));
		};

		const isText = (filename) => {
			const textExtensions = ['txt', 'csv', 'json', 'xml', 'log'];
			return textExtensions.includes(getFileExtension(filename));
		};

		if (!isVisible || !url) return null;

		return (
			<div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60]" onClick={onClose}>
				<div
					className="bg-white rounded-lg max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] overflow-hidden flex flex-col"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex justify-between items-center p-4 border-b bg-gray-50">
						<h3 className="text-lg font-semibold text-black truncate max-w-[80%]">{fileName}</h3>
						<button
							onClick={onClose}
							className="text-gray-500 hover:text-gray-700 text-xl font-bold min-w-[24px] h-6 flex items-center justify-center"
						>
							<FaTimes />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-hidden bg-gray-100">
						<iframe src={url} className="w-full h-full border-0" title={fileName} style={{ minHeight: '100%' }} />
					</div>

					{/* Footer */}
					<div className="p-4 border-t bg-gray-50 flex justify-end">
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2 inline-flex items-center gap-2"
						>
							<FaDownload /> Tải xuống
						</a>
						<button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
							Đóng
						</button>
					</div>
				</div>
			</div>
		);
	};

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

					/* Difference indicators styles */
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
				`}
			</style>

			{/* Debug Info */}
			{console.log('🔍 ExperimentLog render - Modal states:', {
				showDetailModal,
				selectedDetailDocument: selectedDetailDocument?.id,
				isCreateModalOpen,
				documentsCount: documents.length,
			})}

			{/* Detail Modal */}
			<ExperimentDetail docCopy={selectedDetailDocument} isOpen={showDetailModal} onClose={handleCloseDetailModal} />

			{/* File Preview Popup */}
			<FilePreview
				url={previewUrl}
				fileName={previewFile?.originInfo?.fileName}
				isVisible={!!previewFile}
				onClose={handleClosePreview}
			/>

			<div className="w-full flex flex-col">
				{/* Header */}
				<div className="rounded-xl p-2 mb-4 flex-shrink-0">
					<div className="flex items-center justify-between">
						<h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
							Dữ liệu thử nghiệm
							{isLoading && (
								<div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
							)}
						</h2>

						{/* Search */}
						<div className="relative flex-1 max-w-2xl">
							<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
							<input
								type="text"
								placeholder="Tìm dữ liệu thử nghiệm... (Nhấn Enter để tìm kiếm)"
								value={searchTerm}
								onChange={(e) => handleSearchInputChange(e.target.value)}
								onKeyPress={handleSearchKeyPress}
								className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
							/>
						</div>
					</div>

					{/* Search and Pagination */}
					<div className="mt-4 flex items-center justify-between">
						{/* Pagination - Bên trái */}
						<div className="flex items-center gap-1">
							{pagination.totalPages > 1 && (
								<>
									<button
										onClick={() => handlePageChange(pagination.currentPage - 1)}
										disabled={pagination.currentPage === 1}
										className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Trước
									</button>
									{getSmartPaginationNumbers(pagination.currentPage, pagination.totalPages).map((page, index) => (
										<span key={index}>
											{page === '...' ? (
												<span className="px-2 py-1 text-sm text-gray-500">...</span>
											) : (
												<button
													onClick={() => handlePageChange(page)}
													className={`px-3 py-1 text-sm border rounded ${
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
										className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Sau
									</button>
								</>
							)}
						</div>

						{/* Add New Experiment Log Button - luôn hiển thị bên phải */}
						<button
							onClick={() => {
								setIsCreateModalOpen(true);
							}}
							className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
							disabled={isLoading}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 6v6m0 0v6m0-6h6m-6 0H6"
								></path>
							</svg>
							Thêm dữ liệu thử nghiệm
						</button>
					</div>
				</div>

				{/* Grid Layout */}
				<div className="flex-1 overflow-auto custom-scrollbar">
					{/* Header Row - Always visible */}
					<div className="w-full" style={{ minWidth: '1100px' }}>
						<div
							className="grid mb-2 p-2 bg-white border-b-2 border-gray-300"
							style={{
								gridTemplateColumns: hideSamplesColumn
									? '165px minmax(200px, 17%) minmax(300px, 1fr) 120px 130px'
									: '165px minmax(200px, 17%) 100px minmax(200px, 1fr) 120px 130px',
								gap: '16px',
							}}
						>
							<div id="col-code-time" className="p-3 text-left font-semibold text-gray-700" style={{ width: '165px' }}>
								Mã & Thời gian
							</div>
							<div
								id="col-title"
								ref={titleHeaderRef}
								className="p-3 text-left font-semibold text-gray-700"
								style={{ minWidth: '200px', maxWidth: '400px' }}
							>
								Tiêu đề
							</div>
							<div
								id="col-tests"
								className="p-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 rounded"
								style={{ width: '110px' }}
								onClick={() => setHideSamplesColumn(!hideSamplesColumn)}
							>
								Phép thử {hideSamplesColumn ? '▼' : '▶'}
							</div>
							{!hideSamplesColumn && (
								<div
									id="col-samples"
									ref={samplesHeaderRef}
									className="p-3 text-left font-semibold text-gray-700"
									style={{ minWidth: '200px' }}
								>
									Mã mẫu thử
								</div>
							)}
							<div id="col-file" className="p-3 text-left font-semibold text-gray-700" style={{ width: '120px' }}>
								File
							</div>
							<div
								id="col-status"
								className="p-3 text-left font-semibold text-gray-700 relative"
								style={{ width: '140px' }}
							>
								<button
									ref={statusButtonRef}
									className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded"
									onClick={() => setShowStatusDropdown(!showStatusDropdown)}
								>
									{status === 'all' ? 'Trạng thái' : status === 'pending' ? 'Chưa duyệt' : 'Đã duyệt'}
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
									</svg>
								</button>

								{/* Status Dropdown */}
								{showStatusDropdown &&
									ReactDOM.createPortal(
										<div
											ref={statusDropdownRef}
											className="absolute bg-white border border-gray-300 rounded-md shadow-lg z-[9999] w-32"
											style={{
												top: statusButtonRef.current
													? statusButtonRef.current.getBoundingClientRect().bottom + window.scrollY
													: 'auto',
												left: statusButtonRef.current
													? statusButtonRef.current.getBoundingClientRect().left + window.scrollX
													: 'auto',
											}}
										>
											<button
												className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
													status === 'all' ? 'bg-blue-100 font-medium' : ''
												}`}
												onClick={() => {
													handleStatusChange('all');
													setShowStatusDropdown(false);
												}}
											>
												Tất cả
											</button>
											<button
												className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
													status === 'pending' ? 'bg-blue-100 font-medium' : ''
												}`}
												onClick={() => {
													handleStatusChange('pending');
													setShowStatusDropdown(false);
												}}
											>
												Chưa duyệt
											</button>
											<button
												className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
													status === 'approved' ? 'bg-blue-100 font-medium' : ''
												}`}
												onClick={() => {
													handleStatusChange('approved');
													setShowStatusDropdown(false);
												}}
											>
												Đã duyệt
											</button>
										</div>,
										document.body,
									)}
							</div>
						</div>
					</div>

					{isLoading ? (
						<div className="flex justify-center items-center h-64">
							<div className="text-gray-500">Đang tải...</div>
						</div>
					) : documents.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-64 text-gray-500">
							<FaFileAlt className="w-12 h-12 mb-4 text-gray-300" />
							<div className="text-lg font-medium mb-2">
								{status === 'approved' ? 'Không có nhật ký đã duyệt nào' : 'Không có nhật ký nháp nào'}
							</div>
							<div className="text-sm">Nhấn Enter để tìm kiếm với từ khóa mới</div>
						</div>
					) : (
						<div className="">
							{/* Data Rows */}
							<div className="w-full" style={{ minWidth: '1100px' }}>
								{documents.map((doc) => {
									const analyses = doc.metadata?.qualifiedAnalyses || doc.jsonContent?.analyses || [];
									const samples = doc.jsonContent?.samples || doc.metadata?.samples || [];
									const sampleUIDs = samples.map((s) => s.sampleId);
									const identityUID = doc.metadata?.submitBy || doc.identityUID || 'N/A';

									return (
										<div
											key={doc.id}
											className="p-2 mb-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
											onClick={(e) => {
												handleDocumentClickForDetail(doc);
											}}
										>
											<div className="flex" style={{ gap: '16px' }}>
												{/* Column 1: Mã & Thời gian */}
												<div
													className="p-3 flex flex-col items-start justify-start text-left"
													data-col="col-code-time"
													style={{ width: '165px', flexShrink: 0 }}
												>
													<div className="font-semibold text-blue-600 text-sm mb-1">{doc.id}</div>
													<div className="text-xs text-gray-500 mb-1">{doc.lastModified}</div>
													<div className="text-xs text-gray-400">Người tạo: {getIdentityName(doc)}</div>
												</div>

												{/* Column 2: Tiêu đề */}
												<div
													className="p-3 flex items-start justify-start text-left overflow-hidden"
													data-col="col-title"
													style={{
														width: actualColumnWidths.title ? `${actualColumnWidths.title}px` : 'auto',
														minWidth: '200px',
														maxWidth: '400px',
														flexShrink: 0,
													}}
												>
													<span className="font-medium text-gray-900 text-sm leading-tight truncate">
														{doc.jsonContent?.header?.title || doc.metadata?.header?.title || doc.title}
													</span>
												</div>

												{/* Column 3: Phép thử - hiển thị bảng analyses trực tiếp */}
												<div
													className="p-3 flex items-start justify-start text-left relative"
													data-col="col-tests"
													style={{
														width: hideSamplesColumn ? 'auto' : '100px',
														flexShrink: 0,
														flex: hideSamplesColumn ? 1 : 'none',
													}}
													onMouseEnter={(e) =>
														!hideSamplesColumn &&
														analyses.length > 0 &&
														handleTooltipShow(e, 'analyses', { analyses, samples })
													}
													onMouseLeave={handleTooltipHide}
												>
													{hideSamplesColumn ? (
														// Hiển thị bảng analyses trực tiếp khi ẩn cột samples
														<div className="w-full">
															{analyses.length > 0 ? (
																<table className="w-full text-xs ">
																	<tbody>
																		{analyses.map((item, rowIndex) => {
																			const isFirstRow = rowIndex === 0;
																			const isLastRow = rowIndex === analyses.length - 1;
																			return (
																				<tr key={rowIndex}>
																					<td
																						className="text-gray-700 truncate"
																						style={{
																							maxWidth: '80px',
																							whiteSpace: 'nowrap',
																							overflow: 'hidden',
																							textOverflow: 'ellipsis',
																							padding: isFirstRow
																								? '0 8px 4px 8px'
																								: isLastRow
																								? '4px 8px 0 8px'
																								: '4px 8px',
																						}}
																						title={samples[rowIndex]?.sampleId || '--'}
																					>
																						{samples[rowIndex]?.sampleId || '--'}
																					</td>
																					<td
																						className="text-gray-700 truncate"
																						style={{
																							maxWidth: '110px',
																							whiteSpace: 'nowrap',
																							overflow: 'hidden',
																							textOverflow: 'ellipsis',
																							padding: isFirstRow
																								? '0 8px 4px 8px'
																								: isLastRow
																								? '4px 8px 0 8px'
																								: '4px 8px',
																						}}
																						title={item.testId || '--'}
																					>
																						{item.testId || '--'}
																					</td>
																					<td
																						className="text-gray-600 truncate"
																						style={{
																							maxWidth: '140px',
																							whiteSpace: 'nowrap',
																							overflow: 'hidden',
																							textOverflow: 'ellipsis',
																							padding: isFirstRow
																								? '0 8px 4px 8px'
																								: isLastRow
																								? '4px 8px 0 8px'
																								: '4px 8px',
																						}}
																						title={item.testName || '--'}
																					>
																						{item.testName || '--'}
																					</td>
																					<td
																						className="text-gray-600 truncate"
																						style={{
																							maxWidth: '160px',
																							whiteSpace: 'nowrap',
																							overflow: 'hidden',
																							textOverflow: 'ellipsis',
																							padding: isFirstRow
																								? '0 8px 4px 8px'
																								: isLastRow
																								? '4px 8px 0 8px'
																								: '4px 8px',
																						}}
																						title={item.testprotocolCode || '--'}
																					>
																						{item.testprotocolCode || '--'}
																					</td>
																					<td
																						className="text-gray-800 truncate"
																						style={{
																							width: '130px',
																							maxWidth: '130px',
																							whiteSpace: 'nowrap',
																							overflow: 'hidden',
																							textOverflow: 'ellipsis',
																							padding: isFirstRow
																								? '0 8px 4px 8px'
																								: isLastRow
																								? '4px 8px 0 8px'
																								: '4px 8px',
																						}}
																						title={item.testResult ? item.testResult.replace(/<[^>]*>/g, '') : '--'}
																					>
																						{item.testResult ? item.testResult.replace(/<[^>]*>/g, '') : '--'}
																					</td>
																					<td
																						className="text-gray-600 truncate"
																						style={{
																							maxWidth: '100px',
																							whiteSpace: 'nowrap',
																							overflow: 'hidden',
																							textOverflow: 'ellipsis',
																							padding: isFirstRow
																								? '0 8px 4px 8px'
																								: isLastRow
																								? '4px 8px 0 8px'
																								: '4px 8px',
																						}}
																						title={item.testUnit ? item.testUnit.replace(/<[^>]*>/g, '') : '--'}
																					>
																						{item.testUnit ? item.testUnit.replace(/<[^>]*>/g, '') : '--'}
																					</td>
																				</tr>
																			);
																		})}
																	</tbody>
																</table>
															) : (
																<span className="text-gray-400 text-sm">Không có dữ liệu</span>
															)}
														</div>
													) : (
														// Hiển thị số lượng khi không ẩn cột samples
														<span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
															{analyses.length}
														</span>
													)}
												</div>

												{/* Column 4: Sample UIDs - only show if not hidden */}
												{!hideSamplesColumn && (
													<div
														className="p-3 flex flex-wrap gap-1 justify-start items-start text-left overflow-hidden"
														data-col="col-samples"
														style={{
															width: actualColumnWidths.samples ? `${actualColumnWidths.samples}px` : 'auto',
															minWidth: '200px',
															flexShrink: 0,
														}}
														onMouseEnter={(e) => samples.length > 0 && handleTooltipShow(e, 'samples', samples)}
														onMouseLeave={handleTooltipHide}
													>
														{sampleUIDs.slice(0, 5).map((uid, index) => (
															<span
																key={index}
																className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs cursor-help"
															>
																{uid}
															</span>
														))}
														{sampleUIDs.length > 5 && (
															<span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs cursor-help">
																+{sampleUIDs.length - 5}
															</span>
														)}
													</div>
												)}

												{/* Column 5: File */}
												<div
													className="p-3 flex items-start justify-start text-left"
													data-col="col-file"
													style={{ width: '120px', flexShrink: 0 }}
												>
													{doc.fileId ? (
														<button
															onClick={(e) => {
																e.stopPropagation();
																handleFileAction({ id: doc.fileId }, 'view');
															}}
															className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
														>
															Xem
														</button>
													) : (
														<span className="text-gray-400 text-sm">N/A</span>
													)}
												</div>

												{/* Column 6: Trạng thái */}
												<div
													className="p-3 flex items-start justify-start text-left"
													data-col="col-status"
													style={{ width: '140px', flexShrink: 0 }}
												>
													<span
														className={`px-3 py-1 rounded-full text-sm font-medium ${
															doc.metadata?.status === 'approved'
																? 'bg-green-100 text-green-800'
																: 'bg-yellow-100 text-yellow-800'
														}`}
													>
														{doc.metadata?.status === 'approved' ? 'Đã duyệt' : 'Chưa xử lý'}
													</span>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Tooltips */}
			{showTooltip &&
				tooltipData &&
				!(hideSamplesColumn && showTooltip === 'analyses') &&
				ReactDOM.createPortal(
					<div
						ref={tooltipRef}
						className="absolute bg-gray-800 text-white p-4 rounded-lg shadow-lg z-[9999] min-w-96 max-w-2xl"
						style={{
							top: tooltipPosition.y,
							left: tooltipPosition.x,
						}}
					>
						<div className="text-sm font-semibold mb-3">
							{showTooltip === 'analyses' ? 'Thông tin phép thử:' : 'Thông tin mẫu thử:'}
						</div>
						<div className="max-h-80 overflow-y-auto overflow-x-auto">
							{formatTooltipContent(tooltipData, showTooltip, showTooltip === 'analyses')}
						</div>
					</div>,
					document.body,
				)}

			{/* Create Modal */}
			<ExperimentDetail docCopy={null} isOpen={isCreateModalOpen} onClose={handleCloseCreateModal} />
		</>
	);
};

export default ExperimentLog;
