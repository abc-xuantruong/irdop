import React, { useState, useContext, useEffect, useRef } from 'react';
import parse from 'html-react-parser';
import { GlobalContext } from '../../contexts/GlobalContext';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import TinyMceInput from '../Input';
import { toast, ToastContainer } from 'react-toastify';
import { FaTimes, FaSearch } from 'react-icons/fa';
import { useLocation, useNavigate, Link } from 'react-router-dom';

// Custom CSS for enhanced UI
const customStyles = `
.custom-scrollbar::-webkit-scrollbar {
	width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
	background: #f1f5f9;
	border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
	background: #cbd5e1;
	border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
	background: #94a3b8;
}

.user-select-none {
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}

.selected-row {
	background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
}

.selected-row:hover {
	background: linear-gradient(135deg, #bfdbfe, #93c5fd) !important;
}

.selected-row td:not(.merged-sample-cell) {
	border-bottom: 2px solid #3b82f6 !important;
}

.merged-sample-cell {
	background: linear-gradient(135deg, #f8fafc, #f1f5f9);
	border: 1px solid #d1d5db;
	vertical-align: top;
	position: relative;
}

.merged-sample-cell::after {
	content: '';
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 3px;
	background: linear-gradient(135deg, #3b82f6, #1d4ed8);
	border-radius: 0 2px 2px 0;
}

.merged-sample-cell.urgent::after {
	background: linear-gradient(135deg, #dc2626, #b91c1c);
}

.merged-sample-cell.no-border {
	border: none !important;
	background: linear-gradient(135deg, #f8fafc, #f1f5f9);
}

.editable-cell {
	transition: all 0.2s ease-in-out;
	min-height: 32px;
	display: flex;
	align-items: center;
}

.editable-cell:hover {
	background-color: #f0f8ff !important;
	border-color: #3b82f6 !important;
	box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.result-cell {
	transition: all 0.2s ease-in-out;
	min-height: 32px;
	min-width: 32px;
	display: flex;
	align-items: center;
}

.result-cell:hover {
	background-color: #f0f8ff !important;
	border-color: #3b82f6 !important;
	box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.unit-cell {
	transition: all 0.2s ease-in-out;
	min-height: 32px;
	min-width: 32px;
	display: flex;
	align-items: center;
}

.unit-cell:hover {
	background-color: #f0f8ff !important;
	border-color: #3b82f6 !important;
	box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.editing-active {
	background-color: #ffffff !important;
	border-color: #3b82f6 !important;
	box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.filter-badge {
	background: linear-gradient(135deg, #3b82f6, #1d4ed8);
	color: white;
	padding: 4px 8px;
	border-radius: 12px;
	font-size: 0.75rem;
	font-weight: 600;
	display: inline-flex;
	align-items: center;
	gap: 4px;
	box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.receipt-card {
	background: linear-gradient(135deg, #ffffff, #f8fafc);
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	transition: all 0.3s ease;
}

.receipt-card:hover {
	box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	border-color: #3b82f6;
}

.sample-section {
	background: linear-gradient(135deg, #f8fafc, #f1f5f9);
	border-left: 4px solid #3b82f6;
	border-radius: 8px;
	padding: 16px;
	margin: 8px 0;
}

.protocol-select {
	background: linear-gradient(135deg, #ffffff, #f8fafc);
	border: 1px solid #d1d5db;
	border-radius: 6px;
	padding: 4px 8px;
	font-size: 0.875rem;
	transition: all 0.2s ease;
}

.protocol-select:hover {
	border-color: #3b82f6;
	box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.protocol-select:focus {
	outline: none;
	border-color: #3b82f6;
	box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.btn-primary {
	background: linear-gradient(135deg, #3b82f6, #1d4ed8);
	color: white;
	border: none;
	border-radius: 8px;
	padding: 8px 16px;
	font-weight: 600;
	transition: all 0.2s ease;
	box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
	background: linear-gradient(135deg, #1d4ed8, #1e40af);
	box-shadow: 0 4px 6px rgba(59, 130, 246, 0.4);
	transform: translateY(-1px);
}

.btn-secondary {
	background: linear-gradient(135deg, #6b7280, #4b5563);
	color: white;
	border: none;
	border-radius: 8px;
	padding: 8px 16px;
	font-weight: 600;
	transition: all 0.2s ease;
}

.btn-secondary:hover {
	background: linear-gradient(135deg, #4b5563, #374151);
	transform: translateY(-1px);
}

.search-input {
	background: white;
	border: 2px solid #e5e7eb;
	border-radius: 8px;
	padding: 8px 12px;
	transition: all 0.2s ease;
	font-size: 0.875rem;
}

.search-input:focus {
	outline: none;
	border-color: #3b82f6;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-button {
	background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
	border: 2px solid #d1d5db;
	border-radius: 8px;
	padding: 6px 12px;
	font-size: 0.875rem;
	font-weight: 600;
	transition: all 0.2s ease;
	cursor: pointer;
}

.filter-button:hover {
	background: linear-gradient(135deg, #e5e7eb, #d1d5db);
	border-color: #9ca3af;
}

.filter-button.active {
	background: linear-gradient(135deg, #dbeafe, #bfdbfe);
	border-color: #3b82f6;
	color: #1e40af;
}

.bulk-edit-modal {
	background: white;
	border-radius: 16px;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	max-width: 90vw;
	max-height: 90vh;
	overflow: auto;
}

.ex-info-section {
	background: linear-gradient(135deg, #fef3c7, #fed7aa);
	border: 1px solid #f59e0b;
	border-radius: 8px;
	padding: 12px;
	margin-top: 8px;
}

/* Scrollbar styles for breadcrumb buttons */
.scrollbar-thin::-webkit-scrollbar {
	height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
	background: #f1f5f9;
	border-radius: 6px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
	background: #cbd5e1;
	border-radius: 6px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
	background: #94a3b8;
}

/* Firefox scrollbar */
.scrollbar-thin {
	scrollbar-width: thin;
	scrollbar-color: #cbd5e1 #f1f5f9;
}

/* Remove all focus outlines */
button:focus,
input:focus,
select:focus,
textarea:focus {
	outline: none !important;
}
`;

const ProcessingSample = () => {
	const { setCurrentTitlePage, status, currentUser, technicians, formatDate } = useContext(GlobalContext);
	const location = useLocation();
	const navigate = useNavigate();

	// State management - updated to match ProcessingAnalysis structure
	const [processingSample, setProcessingSample] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(20);
	const [totalItems, setTotalItems] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [sortConfig, setSortConfig] = useState({ column: 'sample_uid', direction: 'ASC' });

	// Selection states
	const [selectedRows, setSelectedRows] = useState(new Set());
	const [selectedRowsData, setSelectedRowsData] = useState(new Map());
	const [selectedAnalysisIds, setSelectedAnalysisIds] = useState(new Set());
	const [selectedCheckboxesV3, setSelectedCheckboxesV3] = useState([]);
	const [selectedCheckboxesByReceipt, setSelectedCheckboxesByReceipt] = useState({});

	// Drag selection states
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartId, setDragStartId] = useState(null);

	// Loading and scroll states
	const [scrollPosition, setScrollPosition] = useState(0);
	const [isInitialLoad, setIsInitialLoad] = useState(true);

	// Editing states
	const [editableCell, setEditableCell] = useState({ analysisId: null, column: null });
	const [inputValue, setInputValue] = useState('');
	const [editingProtocolSource, setEditingProtocolSource] = useState(null);
	const [editingProtocolCode, setEditingProtocolCode] = useState(null);
	const [showBulkEditBox, setShowBulkEditBox] = useState(false);
	const [bulkEditCell, setBulkEditCell] = useState({ column: null, receiptId: null }); // Track which bulk edit cell is being edited
	const [bulkEditValues, setBulkEditValues] = useState({}); // Add state to track bulk edit values
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
	const [isLoadingFilter, setIsLoadingFilter] = useState(false);

	// Filter states - match ProcessingAnalysis
	const [filters, setFilters] = useState({
		columns: [
			'id',
			'sample_uid',
			'sample_name',
			'parameter_name',
			'matrix',
			'protocol_source',
			'protocol_code',
			'result_value',
			'result_unit',
			'deadline',
		],
		parameters: [],
		protocols: [],
		headerFilters: {},
		columnSort: 'sample_uid',
		sortBy: 'ASC',
	});

	// Filter creation states
	const [isFilterCreationMode, setIsFilterCreationMode] = useState(false);
	const [activeFilterColumn, setActiveFilterColumn] = useState(null);
	const [filterSearchTerm, setFilterSearchTerm] = useState('');
	const [filterResults, setFilterResults] = useState([]);
	const [filterLoading, setFilterLoading] = useState(false);
	const [selectedFilterValues, setSelectedFilterValues] = useState([]);
	const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });

	// Loading and API states
	const [isFetch, setIsFetch] = useState(false);
	const [isApiCallInProgress, setIsApiCallInProgress] = useState(false);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);

	// Inject custom styles
	useEffect(() => {
		const styleElement = document.createElement('style');
		styleElement.textContent = customStyles;
		document.head.appendChild(styleElement);

		// Add global mouse event listeners for drag selection
		document.addEventListener('mouseup', handleMouseUp);
		document.addEventListener('mouseleave', handleMouseUp);

		return () => {
			document.head.removeChild(styleElement);
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('mouseleave', handleMouseUp);
		};
	}, []);

	// Function to fetch matrix options from API
	const fetchMatrixOptions = async () => {
		try {
			const response = await apiPost('https://black.irdop.org/v1/sample/processing/search_filter_column', {
				filterColumn: 'matrix',
				searchTerm: '',
			});
			if (response?.data?.result && Array.isArray(response.data.result)) {
				const matrixOptions = response.data.result.map((item) => item.matrix || item.value || '');
				// Set matrix options if needed for autocomplete or suggestions
			}
		} catch (error) {
			console.error('Error fetching matrix options:', error);
		}
	};

	// Fetch sample data with new API endpoint
	const fetchSampleData = async (preserveScroll = false) => {
		if (isApiCallInProgress) return;

		const currentTime = Date.now();
		const lastCallTime = window._lastFetchTime || 0;
		if (currentTime - lastCallTime < 1000) return;
		window._lastFetchTime = currentTime;

		setIsApiCallInProgress(true);

		// Save current scroll position if preserving scroll
		if (preserveScroll && !isInitialLoad) {
			const scrollElement = document.querySelector('.custom-scrollbar');
			if (scrollElement) {
				setScrollPosition(scrollElement.scrollTop);
			}
		}

		// Only show loading on initial load
		if (isInitialLoad) {
			setLoading(true);
		}

		try {
			// Read filters from query params to ensure API has latest filter data
			const queryParams = new URLSearchParams(location.search);

			// Prepare request body based on new API structure
			const requestBody = {
				itemsPerPage: itemsPerPage || 20,
				page: currentPage || 1,
				columnSort: filters.columnSort || queryParams.get('ps_columnSort') || 'sample_uid',
				sortBy: filters.sortBy || queryParams.get('ps_sortBy') || 'ASC',
			};

			// Add filters from filters state first
			if (filters.parameters.length > 0) {
				requestBody.parameter_name = [...filters.parameters];
			}

			if (filters.protocols.length > 0) {
				requestBody.protocol_code = [...filters.protocols];
			}

			// Also read directly from query params to ensure we have latest data
			if (queryParams.has('ps_sample_uid')) {
				const sampleUids = queryParams
					.get('ps_sample_uid')
					.split(',')
					.filter((s) => s.trim());
				if (sampleUids.length > 0) {
					requestBody.sample_uid = sampleUids;
				}
			}

			if (queryParams.has('ps_parameter_name')) {
				const paramNames = queryParams
					.get('ps_parameter_name')
					.split(',')
					.filter((s) => s.trim());
				if (paramNames.length > 0) {
					requestBody.parameter_name = paramNames;
				}
			}

			if (queryParams.has('ps_protocol_source')) {
				const protocolSources = queryParams
					.get('ps_protocol_source')
					.split(',')
					.filter((s) => s.trim());
				if (protocolSources.length > 0) {
					requestBody.protocol_source = protocolSources;
				}
			}

			if (queryParams.has('ps_protocol_code')) {
				const protocolCodes = queryParams
					.get('ps_protocol_code')
					.split(',')
					.filter((s) => s.trim());
				if (protocolCodes.length > 0) {
					requestBody.protocol_code = protocolCodes;
				}
			}

			if (queryParams.has('ps_matrix')) {
				const matrices = queryParams
					.get('ps_matrix')
					.split(',')
					.filter((s) => s.trim());
				if (matrices.length > 0) {
					requestBody.matrix = matrices;
				}
			}

			if (queryParams.has('ps_deadline')) {
				const deadline = queryParams.get('ps_deadline');
				if (deadline) {
					requestBody.deadline = deadline;
				}
			}

			if (queryParams.has('ps_technician_uid')) {
				const technicianUids = queryParams
					.get('ps_technician_uid')
					.split(',')
					.filter((s) => s.trim());
				if (technicianUids.length > 0) {
					requestBody.technician_uid = technicianUids;
				}
			}

			// Handle urgent status from query params
			if (queryParams.has('ps_urgent') || queryParams.has('ps_status')) {
				const urgentValue = queryParams.get('ps_urgent') || queryParams.get('ps_status');
				if (urgentValue === '1') {
					requestBody.status = 1;
				}
			}

			// Add header filters from state (fallback)
			Object.keys(filters.headerFilters).forEach((column) => {
				const filterValue = filters.headerFilters[column];

				if (column === 'sample_uid' && filterValue) {
					if (!requestBody.sample_uid) requestBody.sample_uid = [];
					const values = Array.isArray(filterValue)
						? filterValue
						: filterValue
								.split(',')
								.map((s) => s.trim())
								.filter((s) => s);
					requestBody.sample_uid = requestBody.sample_uid.concat(values);
				} else if (column === 'parameter_name' && filterValue) {
					if (!requestBody.parameter_name) {
						requestBody.parameter_name = [];
						const values = Array.isArray(filterValue)
							? filterValue
							: filterValue
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s);
						requestBody.parameter_name = values;
					}
				} else if (column === 'matrix' && filterValue) {
					requestBody.matrix = filterValue;
				} else if (column === 'protocol_source' && filterValue) {
					requestBody.protocol_source = filterValue;
				} else if (column === 'protocol_code' && filterValue) {
					if (!requestBody.protocol_code) {
						requestBody.protocol_code = [];
						const values = Array.isArray(filterValue)
							? filterValue
							: filterValue
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s);
						requestBody.protocol_code = values;
					}
				} else if (column === 'deadline' && filterValue) {
					if (Array.isArray(filterValue)) {
						// Handle multiple deadline values
						requestBody.deadline = filterValue;
					} else if (filterValue === 'today') {
						requestBody.deadline = 'today';
					} else if (filterValue === 'overdue') {
						requestBody.deadline = 'overdue';
					} else if (filterValue === '3days') {
						requestBody.deadline = '3days';
					} else if (filterValue === 'week') {
						requestBody.deadline = 'week';
					} else if (filterValue === 'future') {
						requestBody.deadline = 'future';
					} else if (typeof filterValue === 'object' && filterValue.start) {
						requestBody.deadline = filterValue;
					}
				} else if (column === 'technician_uid' && filterValue) {
					if (!requestBody.technician_uid) {
						requestBody.technician_uid = [];
						const values = Array.isArray(filterValue)
							? filterValue
							: filterValue
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s);
						requestBody.technician_uid = values;
					}
				} else if (column === 'result_value' && filterValue) {
					if (filterValue === 'has_result') {
						requestBody.isSubmitResult = true;
					} else if (filterValue === 'no_result') {
						requestBody.isSubmitResult = false;
					}
				} else if (column === 'handover_by' && filterValue) {
					// Handle handover by user filter
					requestBody.handover_by = filterValue;
				} else if (column === 'handover_date' && filterValue) {
					// Handle handover date filter
					requestBody.handover_date = filterValue;
				}
			});

			// Handle urgent filter
			if (filters.headerFilters.status === 1) {
				requestBody.status = 1; // Urgent status
			}

			// Debug log to verify request body
			console.log('🔍 API Request Body:', requestBody);

			const response = await apiPost('https://black.irdop.org/v1/sample/processing/list', requestBody);

			if (response?.status < 300 && response?.data) {
				const result = response.data;

				if (result.result && Array.isArray(result.result)) {
					setProcessingSample(result.result);

					// Update pagination from API response
					if (result.pagination) {
						setCurrentPage(result.pagination.currentPage);
						setItemsPerPage(result.pagination.itemsPerPage);
						setTotalItems(result.pagination.totalItems);
						setTotalPages(result.pagination.totalPages);
					}
				} else {
					setProcessingSample([]);
				}
			} else {
				throw new Error(`API request failed with status: ${response?.status || 'unknown'}`);
			}
		} catch (error) {
			console.error('❌ Error fetching sample data:', error);
			setProcessingSample([]);
			if (isInitialLoad) {
				toast.error('Lỗi khi tải dữ liệu: ' + error.message);
			}
		} finally {
			setIsApiCallInProgress(false);
			setLoading(false);
			setIsInitialLoad(false);

			// Restore scroll position after data update
			if (preserveScroll && scrollPosition > 0) {
				setTimeout(() => {
					const scrollElement = document.querySelector('.custom-scrollbar');
					if (scrollElement) {
						scrollElement.scrollTop = scrollPosition;
					}
				}, 100);
			}
		}
	};

	// Helper function to check if a column is filtered
	const isColumnFiltered = (columnName) => {
		return filters.headerFilters[columnName] && filters.headerFilters[columnName].length > 0;
	};

	// Helper function to get deadline color based on date
	const getDeadlineColor = (deadlineString) => {
		if (!deadlineString) return '';

		const deadline = new Date(deadlineString);
		const today = new Date();

		// Reset time to start of day for accurate comparison
		deadline.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);

		if (deadline < today) {
			return 'text-red-600 font-semibold'; // Overdue - red
		} else if (deadline.getTime() === today.getTime()) {
			return 'text-yellow-600 font-semibold'; // Today - yellow (darker for white background)
		}
		return ''; // Future dates - normal color
	};

	// Helper function to get column filter display text
	const getColumnFilterText = (columnName) => {
		const filterValue = filters.headerFilters[columnName];
		if (!filterValue) return '';
		if (Array.isArray(filterValue)) {
			return filterValue.length === 1 ? filterValue[0] : `${filterValue.length} mục`;
		}
		return filterValue;
	};

	// Helper function to group samples by sample_uid
	const getGroupedSampleData = () => {
		if (!processingSample || !Array.isArray(processingSample)) return [];

		const sampleGroups = new Map();

		processingSample.forEach((receipt) => {
			receipt.samples?.forEach((sample) => {
				const sampleKey = sample.sample_uid;
				if (!sampleGroups.has(sampleKey)) {
					sampleGroups.set(sampleKey, {
						sample: sample,
						receipt: receipt,
						analyses: [],
					});
				}

				// Add all analyses for this sample
				sample.analysis?.forEach((analysis) => {
					sampleGroups.get(sampleKey).analyses.push({
						...analysis,
						sample_uid: sample.sample_uid,
						sample_name: sample.sample_name,
						matrix: sample.matrix,
						sample_description: sample.sample_description,
						additional_request: sample.additional_request,
						sample_status: sample.status,
						handover_info: sample.handover_info,
						receipt_uid: receipt.receipt_uid,
						receipt_id: receipt.id,
					});
				});
			});
		});

		return Array.from(sampleGroups.values());
	};

	// Get grouped data for display
	const groupedSampleData = getGroupedSampleData();

	// Handle search input changes
	const handleSearchChange = (e) => setSearchTerm(e.target.value);
	const handleSampleSearchChange = (e) => setSampleSearchTerm(e.target.value);
	const handleParameterSearchChange = (e) => setParameterSearchTerm(e.target.value);
	const handleMatrixSearchChange = (e) => setMatrixSearchTerm(e.target.value);

	// Handle column sorting with ASC → DESC → no sort cycle
	const handleColumnSort = (columnName) => {
		if (isFilterCreationMode) return; // Don't sort in filter creation mode

		const currentColumn = filters.columnSort;
		const currentSort = filters.sortBy;

		let newColumnSort = columnName;
		let newSortBy = 'ASC';

		if (currentColumn === columnName) {
			// Same column clicked - cycle through ASC → DESC → no sort
			if (currentSort === 'ASC') {
				newSortBy = 'DESC';
			} else if (currentSort === 'DESC') {
				// Remove sorting
				newColumnSort = null;
				newSortBy = null;
			}
		}

		// Update filters with new sort settings
		const newFilters = {
			...filters,
			columnSort: newColumnSort,
			sortBy: newSortBy,
		};

		setFilters(newFilters);
		updateQueryParams(newFilters);
	};

	// Pagination calculations - use receipts count, not analyses
	const totalReceipts = processingSample ? processingSample.length : 0;
	const totalReceiptsForPagination = totalItems > 0 ? Math.ceil(totalItems / itemsPerPage) : totalReceipts;
	const startReceiptIndex = (currentPage - 1) * itemsPerPage + 1;
	const endReceiptIndex = Math.min(currentPage * itemsPerPage, totalReceipts);

	// Get the receipts for current page
	const receiptsForCurrentPage = processingSample
		? processingSample.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
		: [];

	// Get grouped data only from receipts on current page
	const getGroupedSampleDataForPage = () => {
		if (!receiptsForCurrentPage || !Array.isArray(receiptsForCurrentPage)) return [];

		const sampleGroups = new Map();

		receiptsForCurrentPage.forEach((receipt) => {
			receipt.samples?.forEach((sample) => {
				const sampleKey = sample.sample_uid;
				if (!sampleGroups.has(sampleKey)) {
					sampleGroups.set(sampleKey, {
						sample: sample,
						receipt: receipt,
						analyses: [],
					});
				}

				// Add all analyses for this sample
				sample.analysis?.forEach((analysis) => {
					sampleGroups.get(sampleKey).analyses.push({
						...analysis,
						sample_uid: sample.sample_uid,
						sample_name: sample.sample_name,
						matrix: sample.matrix,
						sample_description: sample.sample_description,
						additional_request: sample.additional_request,
						sample_status: sample.status,
						handover_info: sample.handover_info,
						receipt_uid: receipt.receipt_uid,
						receipt_id: receipt.id,
					});
				});
			});
		});

		return Array.from(sampleGroups.values());
	};

	// Get grouped data for current page
	const groupedSampleDataForPage = getGroupedSampleDataForPage();

	// Handle cell editing like ProcessingSampleV3
	const handleCellClickV3 = (analysisId, column, currentValue) => {
		setEditableCell({ analysisId, column });
		setInputValue(currentValue || '');
	};

	const handleSaveContentV3 = async (content, column, analysisId) => {
		if (!editableCell.analysisId || editableCell.column !== column) return;

		try {
			// Helper function to remove <p> tags
			const cleanContent = (str) => {
				if (!str) return str;
				return str.replace(/^<p>/, '').replace(/<\/p>$/, '');
			};

			// Get original value for comparison from grouped data for current page
			let originalValue = '';
			groupedSampleDataForPage.forEach((group) => {
				const currentAnalysis = group.analyses.find((item) => item.id === analysisId);
				if (currentAnalysis) {
					originalValue = currentAnalysis[column] || '';
				}
			}); // Clean both values for comparison if it's result_value or result_unit
			let cleanedContent = content;
			let cleanedOriginal = originalValue;

			if (column === 'result_value' || column === 'result_unit') {
				cleanedContent = cleanContent(content);
				cleanedOriginal = cleanContent(originalValue);
			}

			// Only proceed if there's actual change
			if (cleanedContent === cleanedOriginal) {
				setEditableCell({ analysisId: null, column: null });
				return;
			}

			const body = {
				analysis: {
					id: analysisId,
					[column]: content,
				},
			};

			if (column === 'result_value') {
				body.analysis.submit_result_by = currentUser.identity_name;
			}

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', body);

			if (response?.status === 200) {
				toast.success('Cập nhật thành công');

				// Update both processingSample data for consistency
				setProcessingSample((prevData) => {
					if (!prevData) return prevData;
					return prevData.map((receipt) => ({
						...receipt,
						samples: receipt.samples?.map((sample) => ({
							...sample,
							analysis: sample.analysis?.map((analysis) => {
								if (analysis.id === analysisId) {
									return { ...analysis, [column]: content };
								}
								return analysis;
							}),
						})),
					}));
				});

				// Trigger a background refresh to ensure data consistency
				setTimeout(() => {
					fetchSampleData(true);
				}, 1000);
			} else {
				toast.error('Cập nhật thất bại');
			}
		} catch (error) {
			console.error('Error updating analysis:', error);
			toast.error('Lỗi khi cập nhật');
		} finally {
			setEditableCell({ analysisId: null, column: null });
		}
	};

	const handleKeyDownV3 = (e) => {
		if (e.key === 'Enter') {
			setEditableCell({ analysisId: null, column: null });
		}
	};

	// Handle protocol source changes
	const handleProtocolSourceChange = async (analysisId, value) => {
		try {
			// Update local data immediately
			setProcessingSample((prevData) => {
				if (!prevData) return prevData;
				return prevData.map((receipt) => ({
					...receipt,
					samples: receipt.samples?.map((sample) => ({
						...sample,
						analysis: sample.analysis?.map((analysis) => {
							if (analysis.id === analysisId) {
								return { ...analysis, protocol_source: value };
							}
							return analysis;
						}),
					})),
				}));
			});

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: { id: analysisId, protocol_source: value },
			});

			if (response?.status !== 200) {
				throw new Error('Failed to update protocol source');
			}
			toast.success('Cập nhật thành công');

			// Background refresh
			setTimeout(() => {
				fetchSampleData(true);
			}, 1000);
		} catch (error) {
			console.error('Error updating protocol source:', error);
			toast.error('Lỗi khi cập nhật');
		}
	};

	// Handle protocol source click to edit
	const handleProtocolSourceClick = (analysisId, currentValue) => {
		setEditingProtocolSource(analysisId);
		setInputValue(currentValue || '');
	};

	// Handle protocol source blur
	const handleProtocolSourceBlur = async (analysisId, newValue, originalValue) => {
		setEditingProtocolSource(null);
		if (newValue !== originalValue && newValue !== '') {
			await handleProtocolSourceChange(analysisId, newValue);
		}
	};

	// Handle protocol code click to edit
	const handleProtocolCodeClick = (analysisId, currentValue) => {
		setEditingProtocolCode(analysisId);
		setInputValue(currentValue || '');
	};

	// Handle protocol code blur
	const handleProtocolCodeBlur = async (analysisId, newValue, originalValue) => {
		setEditingProtocolCode(null);

		if (newValue !== originalValue) {
			try {
				// Update local data immediately
				setProcessingSample((prevData) => {
					if (!prevData) return prevData;
					return prevData.map((receipt) => ({
						...receipt,
						samples: receipt.samples?.map((sample) => ({
							...sample,
							analysis: sample.analysis?.map((analysis) => {
								if (analysis.id === analysisId) {
									return { ...analysis, protocol_code: newValue };
								}
								return analysis;
							}),
						})),
					}));
				});

				const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
					analysis: { id: analysisId, protocol_code: newValue },
				});

				if (response?.status !== 200) {
					throw new Error('Failed to update protocol code');
				}
				toast.success('Cập nhật thành công!');

				// Background refresh
				setTimeout(() => {
					fetchSampleData(true);
				}, 1000);
			} catch (error) {
				console.error('Error updating protocol_code:', error);
				toast.error('Có lỗi xảy ra khi cập nhật!');
			}
		}
	};

	// Handle checkbox selections
	const handleAnalysisCheckboxChange = (e, receiptId, analysisId) => {
		const isChecked = e.target.checked;

		setSelectedCheckboxesV3((prev) => {
			if (isChecked) {
				return [...prev, analysisId];
			} else {
				return prev.filter((id) => id !== analysisId);
			}
		});

		setSelectedCheckboxesByReceipt((prev) => {
			const current = { ...prev };
			if (!current[receiptId]) current[receiptId] = [];

			if (isChecked) {
				current[receiptId] = [...current[receiptId], analysisId];
			} else {
				current[receiptId] = current[receiptId].filter((id) => id !== analysisId);
			}

			if (current[receiptId].length === 0) {
				delete current[receiptId];
			}

			return current;
		});
	};

	// Handle technician changes
	const handleTechnicianChange = async (analysisId, technicianUid) => {
		try {
			// Update local data immediately
			setProcessingSample((prevData) => {
				if (!prevData) return prevData;
				return prevData.map((receipt) => ({
					...receipt,
					samples: receipt.samples?.map((sample) => ({
						...sample,
						analysis: sample.analysis?.map((analysis) => {
							if (analysis.id === analysisId) {
								return { ...analysis, technician_uid: technicianUid };
							}
							return analysis;
						}),
					})),
				}));
			});

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: {
					id: analysisId,
					technician_uid: technicianUid,
					modified_by_uid: currentUser?.identity_uid,
				},
			});

			if (response?.status === 200) {
				toast.success('Cập nhật người thực hiện thành công');

				// Background refresh
				setTimeout(() => {
					fetchSampleData(true);
				}, 1000);
			} else {
				throw new Error('Failed to update technician');
			}
		} catch (error) {
			console.error('Error updating technician:', error);
			toast.error('Lỗi khi cập nhật người thực hiện');
		} finally {
			setTechnicianDropdownVisible(null);
		}
	};

	const toggleTechnicianDropdown = (index, event) => {
		const buttonRect = event.target.getBoundingClientRect();
		setDropdownPosition({
			top: buttonRect.bottom + window.scrollY + 5,
			left: buttonRect.left + window.scrollX,
		});
		setTechnicianDropdownVisible(technicianDropdownVisible === index ? null : index);
	};

	const getTechnicianName = (technician_uid) => {
		if (!technician_uid) return '--';
		const technician = technicians?.find((tech) => tech.identity_uid === technician_uid);
		return technician ? technician.identity_name : '--';
	};

	// Drag selection handlers
	const handleMouseDown = (analysisId, event) => {
		if (event.target.tagName === 'SELECT' || event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') {
			return; // Don't start drag on interactive elements
		}

		setIsDragging(true);
		setDragStartId(analysisId);

		if (event.ctrlKey || event.metaKey) {
			// Ctrl+click to toggle selection
			const newSelection = new Set(selectedAnalysisIds);
			if (newSelection.has(analysisId)) {
				newSelection.delete(analysisId);
			} else {
				newSelection.add(analysisId);
			}
			setSelectedAnalysisIds(newSelection);
		} else {
			// Check if clicking on already selected item to toggle
			if (selectedAnalysisIds.has(analysisId) && selectedAnalysisIds.size === 1) {
				// If only this item is selected, deselect it
				setSelectedAnalysisIds(new Set());
			} else {
				// Start new selection
				setSelectedAnalysisIds(new Set([analysisId]));
			}
		}

		event.preventDefault();
	};

	const handleMouseEnter = (analysisId) => {
		if (isDragging && dragStartId) {
			// Get all analysis IDs in order from grouped data for current page
			const allAnalysisIds = [];
			groupedSampleDataForPage.forEach((group) => {
				group.analyses.forEach((analysis) => {
					allAnalysisIds.push(analysis.id);
				});
			});

			const startIndex = allAnalysisIds.indexOf(dragStartId);
			const currentIndex = allAnalysisIds.indexOf(analysisId);

			if (startIndex !== -1 && currentIndex !== -1) {
				const minIndex = Math.min(startIndex, currentIndex);
				const maxIndex = Math.max(startIndex, currentIndex);
				const selectedRange = allAnalysisIds.slice(minIndex, maxIndex + 1);
				setSelectedAnalysisIds(new Set(selectedRange));
			}
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
		setDragStartId(null);
	};

	// Bulk edit handlers
	const handleBulkEdit = (field, value) => {
		const promises = Array.from(selectedAnalysisIds).map((analysisId) => {
			return handleSaveContentV3(value, field, analysisId);
		});

		Promise.all(promises).then(() => {
			setShowBulkEditBox(false);
			setSelectedAnalysisIds(new Set());
		});
	};

	// Add function to handle bulk edit value changes
	const handleBulkEditChange = (field, value) => {
		setBulkEditValues((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	// Add function to handle bulk edit cell click
	const handleBulkEditCellClick = (column, receiptId) => {
		setBulkEditCell({ column, receiptId });
	};

	// Add function to handle bulk update submission
	const handleBulkUpdate = async () => {
		const updates = [];

		// Prepare updates for all selected analyses
		Array.from(selectedAnalysisIds).forEach((analysisId) => {
			const updateData = { id: analysisId };

			// Add fields that have values in bulkEditValues
			Object.keys(bulkEditValues).forEach((field) => {
				if (bulkEditValues[field] !== '' && bulkEditValues[field] !== null && bulkEditValues[field] !== undefined) {
					updateData[field] = bulkEditValues[field];
				}
			});

			if (Object.keys(updateData).length > 1) {
				// More than just id
				updates.push(updateData);
			}
		});

		if (updates.length === 0) {
			toast.warning('Không có thay đổi nào để cập nhật');
			return;
		}

		try {
			// Update each analysis
			for (const update of updates) {
				const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
					analysis: update,
				});

				if (response?.status !== 200) {
					throw new Error(`Failed to update analysis ${update.id}`);
				}
			}

			toast.success(`Đã cập nhật ${updates.length} chỉ tiêu thành công`);

			// Clear selections and close modal
			setSelectedAnalysisIds(new Set());
			setShowBulkEditBox(false);
			setBulkEditValues({});

			// Refresh data
			setTimeout(() => {
				fetchSampleData(true);
			}, 1000);
		} catch (error) {
			console.error('Error in bulk update:', error);
			toast.error('Lỗi khi cập nhật hàng loạt');
		}
	};

	const clearSelection = () => {
		setSelectedAnalysisIds(new Set());
		setShowBulkEditBox(false);
	};

	// Filter mode toggle handler
	const handleFilterModeToggle = () => {
		const newFilterMode = !isFilterCreationMode;
		setIsFilterCreationMode(newFilterMode);
		// Update query params to reflect filter mode state
		updateQueryParams(filters);
	};

	// Filter handlers
	const handleFilterToggle = (filterType) => {
		if (filterType === 'urgent') {
			const newFilters = { ...filters };
			if (newFilters.headerFilters.status === 1) {
				// Remove urgent filter
				delete newFilters.headerFilters.status;
				toast.info('Đã tắt bộ lọc mẫu khẩn');
			} else {
				// Add urgent filter
				newFilters.headerFilters.status = 1;
				toast.info('Đã bật bộ lọc mẫu khẩn');
			}
			setFilters(newFilters);
			updateQueryParams(newFilters);
		}
	};

	const clearAllFilters = () => {
		const newFilters = {
			...filters,
			headerFilters: {},
			parameters: [],
			protocols: [],
		};
		setFilters(newFilters);
		setIsFilterCreationMode(false);
		setActiveFilterColumn(null);
		setFilterResults([]);
		// Update query params after setting filter mode to false
		setTimeout(() => {
			updateQueryParams(newFilters);
		}, 0);
		toast.info('Đã xóa tất cả bộ lọc');
	};

	const cancelSelection = () => {
		setSelectedAnalysisIds(new Set());
	};

	const handleBulkEditClick = () => {
		setShowBulkEditBox(true);
	};

	// Check if there are selected samples
	const hasSelectedSamples = selectedAnalysisIds.size > 0;

	// Column filter handlers
	const handleColumnFilter = async (columnName) => {
		setActiveFilterColumn(columnName);
		setIsLoadingFilter(true);
		setFilterResults([]);
		setSelectedFilterValues([]);
		setFilterSearchTerm('');

		try {
			const response = await apiPost('https://black.irdop.org/v1/processing/search_filter_column', {
				filterColumn: columnName,
				searchTerm: '',
				itemsPerPage: 50,
				page: 1,
			});

			if (response?.status < 300 && response?.data?.result) {
				let formattedResults = [];

				if (columnName === 'technician_uid') {
					// For technician filter, convert identity_uid to display name with alias
					formattedResults = response.data.result.map((item) => {
						// API returns technician_uid field, not value
						const technicianUid = item.technician_uid || item.value;
						const technician = technicians?.find((tech) => tech.identity_uid === technicianUid);
						const displayName = technician
							? `${technician.identity_name}${technician.alias ? ` (${technician.alias})` : ''}`
							: technicianUid || 'Không có người thực hiện';

						return {
							value: technicianUid, // Keep original identity_uid as value
							count: item.total || item.count || 0,
							label: displayName, // Display name with alias
						};
					});
				} else if (columnName === 'deadline') {
					// For deadline filter, convert deadline values to Vietnamese labels
					const deadlineLabels = {
						overdue: 'Quá hạn',
						today: 'Hôm nay',
						'3days': '3 ngày tới',
						week: 'Tuần này',
						future: 'Tương lai',
					};

					formattedResults = response.data.result.map((item) => ({
						value: item.deadline,
						count: item.total || item.count || 0,
						label: deadlineLabels[item.deadline] || item.deadline,
					}));
				} else {
					// For other columns, use standard formatting
					formattedResults = response.data.result.map((item) => ({
						value: item[columnName] || item.parameter_name || item.value,
						count: item.total || item.count || 0,
						label: item[columnName] || item.parameter_name || item.value,
					}));
				}

				setFilterResults(formattedResults);

				// Auto-select values based on current filters
				const currentFilter = filters.headerFilters[columnName];
				if (currentFilter) {
					if (Array.isArray(currentFilter)) {
						setSelectedFilterValues(currentFilter);
					} else {
						setSelectedFilterValues([currentFilter]);
					}
				}
			} else {
				setFilterResults([]);
			}
		} catch (error) {
			console.error('Error fetching filter options:', error);
			setFilterResults([]);
			toast.error('Lỗi khi tải dữ liệu lọc');
		} finally {
			setIsLoadingFilter(false);
		}
	};

	// Search filter values with debounce
	const searchFilterValues = async (searchTerm) => {
		if (!activeFilterColumn) return;

		try {
			const response = await apiPost('https://black.irdop.org/v1/processing/search_filter_column', {
				filterColumn: activeFilterColumn,
				searchTerm: searchTerm,
				itemsPerPage: 50,
				page: 1,
			});

			if (response?.status < 300 && response?.data?.result) {
				let formattedResults = [];

				if (activeFilterColumn === 'technician_uid') {
					// For technician filter, convert identity_uid to display name with alias
					formattedResults = response.data.result.map((item) => {
						// API returns technician_uid field, not value
						const technicianUid = item.technician_uid || item.value;
						const technician = technicians?.find((tech) => tech.identity_uid === technicianUid);
						const displayName = technician
							? `${technician.identity_name}${technician.alias ? ` (${technician.alias})` : ''}`
							: technicianUid || 'Không có người thực hiện';

						return {
							value: technicianUid, // Keep original identity_uid as value
							count: item.total || item.count || 0,
							label: displayName, // Display name with alias
						};
					});
				} else if (activeFilterColumn === 'deadline') {
					// For deadline filter, convert deadline values to Vietnamese labels
					const deadlineLabels = {
						overdue: 'Quá hạn',
						today: 'Hôm nay',
						'3days': '3 ngày tới',
						week: 'Tuần này',
						future: 'Chưa đến hạn',
					};

					formattedResults = response.data.result.map((item) => ({
						value: item.deadline,
						count: item.total || item.count || 0,
						label: deadlineLabels[item.deadline] || item.deadline,
					}));
				} else {
					// For other columns, use standard formatting
					formattedResults = response.data.result.map((item) => ({
						value: item[activeFilterColumn] || item.parameter_name || item.value,
						count: item.total || item.count || 0,
						label: item[activeFilterColumn] || item.parameter_name || item.value,
					}));
				}

				setFilterResults(formattedResults);
			} else {
				setFilterResults([]);
			}
		} catch (error) {
			console.error('Error searching filter options:', error);
		}
	};

	// Update URL query params when filters change - using namespace to avoid conflicts
	const updateQueryParams = (newFilters) => {
		const queryParams = new URLSearchParams(location.search);

		// Remove all existing processing sample filter params
		[
			'ps_sample_uid',
			'ps_parameter_name',
			'ps_protocol_source',
			'ps_protocol_code',
			'ps_matrix',
			'ps_status',
			'ps_deadline',
			'ps_technician_uid',
			'ps_columnSort',
			'ps_sortBy',
			'ps_filter',
		].forEach((param) => {
			queryParams.delete(param);
		});

		// Add filter creation mode state to query params
		if (isFilterCreationMode) {
			queryParams.set('ps_filter', 'true');
		}

		// Add filters to query params with namespace prefix 'ps_' (processing sample)
		Object.keys(newFilters.headerFilters).forEach((column) => {
			const value = newFilters.headerFilters[column];
			if (column === 'status' && value === 1) {
				queryParams.set('ps_status', '1');
			} else if (Array.isArray(value) && value.length > 0) {
				queryParams.set(`ps_${column}`, value.join(','));
			} else if (value && !Array.isArray(value)) {
				queryParams.set(`ps_${column}`, value);
			}
		});

		// Add sorting parameters
		if (newFilters.columnSort) {
			queryParams.set('ps_columnSort', newFilters.columnSort);
		}
		if (newFilters.sortBy) {
			queryParams.set('ps_sortBy', newFilters.sortBy);
		}

		// Update URL without causing a page reload
		const newUrl = queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname;
		navigate(newUrl, { replace: true });
	};

	const applyColumnFilter = (columnName, selectedValues) => {
		const newFilters = { ...filters };
		if (selectedValues.length > 0) {
			newFilters.headerFilters[columnName] = selectedValues;
		} else {
			delete newFilters.headerFilters[columnName];
		}
		setFilters(newFilters);
		updateQueryParams(newFilters);
		setActiveFilterColumn(null);
		setFilterResults([]);
		setSelectedFilterValues([]);
		// Keep filter creation mode active - don't disable it
		// setIsFilterCreationMode(false);
	};

	const closeFilterModal = () => {
		setActiveFilterColumn(null);
		setFilterResults([]);
		setSelectedFilterValues([]);
		setIsLoadingFilter(false);
	};

	// Filter value selection handlers
	const handleFilterValueSelect = (value) => {
		setSelectedFilterValues((prev) => {
			if (prev.includes(value)) {
				return prev.filter((v) => v !== value);
			} else {
				return [...prev, value];
			}
		});
	};

	const selectAllFilterValues = () => {
		setSelectedFilterValues(filterResults.map((result) => result.value));
	};

	const unselectAllFilterValues = () => {
		setSelectedFilterValues([]);
	};

	const clearColumnFilter = () => {
		if (activeFilterColumn) {
			const newFilters = { ...filters };
			delete newFilters.headerFilters[activeFilterColumn];
			setFilters(newFilters);
			updateQueryParams(newFilters);
			setActiveFilterColumn(null);
			setFilterResults([]);
			setSelectedFilterValues([]);
			toast.info(
				`Đã xóa bộ lọc ${
					activeFilterColumn === 'sample_uid'
						? 'Mẫu thử'
						: activeFilterColumn === 'parameter_name'
						? 'Chỉ tiêu'
						: activeFilterColumn === 'protocol_source'
						? 'Nguồn'
						: activeFilterColumn === 'protocol_code'
						? 'Phương pháp'
						: activeFilterColumn === 'deadline'
						? 'Hạn trả'
						: activeFilterColumn === 'technician_uid'
						? 'Người thực hiện'
						: activeFilterColumn
				}`,
			);
		}
	};

	const applyFilter = () => {
		if (activeFilterColumn && selectedFilterValues.length > 0) {
			applyColumnFilter(activeFilterColumn, selectedFilterValues);
		}
	};

	const cancelFilter = () => {
		closeFilterModal();
	};

	// Pagination handlers
	const handleItemsPerPageChange = (newItemsPerPage) => {
		setItemsPerPage(newItemsPerPage);
		setCurrentPage(1); // Reset to first page when changing items per page
	};

	// Read query params on component mount to set initial filter state
	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const newFilters = { ...filters };
		let hasFilters = false;

		// Read filter parameters from URL with namespace prefix 'ps_'
		if (queryParams.has('ps_sample_uid')) {
			newFilters.headerFilters.sample_uid = queryParams.get('ps_sample_uid').split(',');
			hasFilters = true;
		}
		if (queryParams.has('ps_parameter_name')) {
			newFilters.headerFilters.parameter_name = queryParams.get('ps_parameter_name').split(',');
			hasFilters = true;
		}
		if (queryParams.has('ps_protocol_source')) {
			newFilters.headerFilters.protocol_source = queryParams.get('ps_protocol_source').split(',');
			hasFilters = true;
		}
		if (queryParams.has('ps_protocol_code')) {
			newFilters.headerFilters.protocol_code = queryParams.get('ps_protocol_code').split(',');
			hasFilters = true;
		}
		if (queryParams.has('ps_matrix')) {
			newFilters.headerFilters.matrix = queryParams.get('ps_matrix').split(',');
			hasFilters = true;
		}
		if (queryParams.has('ps_deadline')) {
			newFilters.headerFilters.deadline = queryParams.get('ps_deadline');
			hasFilters = true;
		}
		if (queryParams.has('ps_technician_uid')) {
			newFilters.headerFilters.technician_uid = queryParams.get('ps_technician_uid').split(',');
			hasFilters = true;
		}
		// Handle both ps_urgent and ps_status for urgent samples
		if (queryParams.has('ps_urgent') || queryParams.has('ps_status')) {
			const urgentValue = queryParams.get('ps_urgent') || queryParams.get('ps_status');
			if (urgentValue === '1') {
				newFilters.headerFilters.status = 1;
				hasFilters = true;
			}
		}
		// Handle custom handover parameters (if implemented)
		if (queryParams.has('ps_handover_by')) {
			newFilters.headerFilters.handover_by = queryParams.get('ps_handover_by');
			hasFilters = true;
		}
		if (queryParams.has('ps_handover_date')) {
			newFilters.headerFilters.handover_date = queryParams.get('ps_handover_date');
			hasFilters = true;
		}

		// Read sorting parameters
		if (queryParams.has('ps_columnSort')) {
			newFilters.columnSort = queryParams.get('ps_columnSort');
			hasFilters = true;
		}
		if (queryParams.has('ps_sortBy')) {
			newFilters.sortBy = queryParams.get('ps_sortBy');
			hasFilters = true;
		}

		// Read filter creation mode state from URL
		if (queryParams.has('ps_filter')) {
			const filterMode = queryParams.get('ps_filter');
			if (filterMode === 'true') {
				setIsFilterCreationMode(true);
				hasFilters = true;
			}
		}

		if (hasFilters) {
			setFilters(newFilters);
			// Enable filter creation mode if any filters are active or ps_filter=true
			if (!queryParams.has('ps_filter') && hasFilters) {
				setIsFilterCreationMode(true);
			}
		}
	}, []);

	// Initial load and effects
	useEffect(() => {
		setCurrentTitlePage('Mẫu đang xử lý');
		fetchSampleData();
		setIsFetch(true);
	}, [location.search, currentPage, itemsPerPage, filters]);

	// Auto-refresh every 60 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			if (
				!isApiCallInProgress &&
				isFetch &&
				!editableCell.analysisId &&
				!editingProtocolSource &&
				!editingProtocolCode
			) {
				fetchSampleData(true); // Preserve scroll position during auto-refresh
			}
		}, 60000);

		return () => clearInterval(interval);
	}, [isApiCallInProgress, isFetch, editableCell.analysisId, editingProtocolSource, editingProtocolCode]);

	// Scroll to top when page changes
	useEffect(() => {
		const scrollElement = document.querySelector('.custom-scrollbar');
		if (scrollElement) {
			scrollElement.scrollTop = 0;
		}
	}, [currentPage]);

	// Search filter values with debounce - improved to handle all key events
	useEffect(() => {
		if (!activeFilterColumn) return;

		// Don't call API immediately when modal opens (filterSearchTerm is empty initially)
		// Only call when user actually types something or clears the search
		const timeoutId = setTimeout(() => {
			// Skip the initial empty search call since handleColumnFilter already loads data
			if (filterSearchTerm !== '' || filterResults.length > 0) {
				searchFilterValues(filterSearchTerm);
			}
		}, 300); // Minimum 300ms delay

		return () => clearTimeout(timeoutId);
	}, [filterSearchTerm, activeFilterColumn]);

	// Add click outside handler for filter modal
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (activeFilterColumn) {
				// Check if the click is outside the filter modal
				const filterModal = document.querySelector('[data-filter-modal]');
				if (filterModal && !filterModal.contains(event.target)) {
					closeFilterModal();
				}
			}
		};

		if (activeFilterColumn) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [activeFilterColumn]);

	return (
		<div className="w-full h-full relative bg-gray-50">
			<ToastContainer position="top-right" autoClose={500} />

			{/* Breadcrumb */}
			<div className="bg-white p-4 text-sm">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2 font-bold text-sm text-gray-500 cursor-pointer min-w-fit mr-2">
						<span className="hover:underline">PHÒNG THỬ NGHIỆM</span>
						<span>/</span>
						<span className="text-gray-900 font-bold hover:underline">DANH SÁCH PHÉP THỬ</span>
					</div>
					<div className="flex items-center space-x-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
						{/* Action buttons */}
						<div className="flex items-center space-x-2 flex-shrink-0">
							{hasSelectedSamples && (
								<>
									<button
										onClick={cancelSelection}
										className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors whitespace-nowrap focus:outline-none"
									>
										Hủy chọn
									</button>
									<button
										onClick={handleBulkEditClick}
										className="px-3 py-1.5 text-sm text-blue-600 rounded border-blue-600 transition-colors whitespace-nowrap focus:outline-none"
									>
										Sửa hàng loạt
									</button>
								</>
							)}

							{/* Filter buttons */}
							<div className="flex items-center space-x-2 pl-3">
								<button
									onClick={() => handleFilterToggle('urgent')}
									className={`px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap focus:outline-none ${
										filters.headerFilters.status === 1
											? 'bg-red-600 text-white hover:bg-red-700'
											: 'border border-red-600 text-red-600 hover:bg-red-50'
									}`}
								>
									Mẫu khẩn
								</button>

								<button
									onClick={handleFilterModeToggle}
									className={`px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap focus:outline-none ${
										isFilterCreationMode
											? 'bg-blue-600 text-white hover:bg-blue-700'
											: 'border border-blue-600 text-blue-600 hover:bg-blue-50'
									}`}
								>
									{isFilterCreationMode ? 'Hủy lọc' : 'Tạo bộ lọc'}
								</button>

								{Object.keys(filters.headerFilters).length > 0 && (
									<button
										onClick={clearAllFilters}
										className="px-3 py-1.5 text-sm border border-gray-600 text-gray-600 rounded hover:bg-gray-50 transition-colors whitespace-nowrap focus:outline-none"
									>
										Xóa bộ lọc
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden mx-4 mb-4">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						<span className="ml-2 text-gray-600">Đang tải dữ liệu...</span>
					</div>
				) : Array.isArray(groupedSampleDataForPage) && groupedSampleDataForPage.length > 0 ? (
					<div className="custom-scrollbar overflow-auto max-h-[calc(100vh-120px)]">
						{/* Table with grouped samples */}
						<table className="w-full border-collapse" style={{ minWidth: '1000px' }}>
							<thead className="sticky top-0 z-20 border-b-2 border-gray-300 bg-sky-400">
								<tr>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 w-1/6 max-w-[16.666667%] ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : 'cursor-pointer hover:bg-gray-100'
										} ${isColumnFiltered('sample_uid') ? 'text-blue-600 underline' : ''}`}
										onClick={() =>
											isFilterCreationMode ? handleColumnFilter('sample_uid') : handleColumnSort('sample_uid')
										}
										style={{ minWidth: '140px' }}
									>
										Mẫu thử
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
										{!isFilterCreationMode && filters.columnSort === 'sample_uid' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : ''
										} ${isColumnFiltered('parameter_name') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('parameter_name')}
										style={{ minWidth: '120px' }}
									>
										Chỉ tiêu
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : ''
										} ${isColumnFiltered('protocol_source') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('protocol_source')}
										style={{ minWidth: '100px' }}
									>
										Nguồn
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : ''
										} ${isColumnFiltered('protocol_code') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('protocol_code')}
										style={{ minWidth: '160px' }}
									>
										Phương pháp
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 min-w-36 ${
											!isFilterCreationMode ? 'cursor-pointer hover:bg-gray-100' : ''
										}`}
										onClick={() => !isFilterCreationMode && handleColumnSort('result_value')}
										style={{ minWidth: '140px' }}
									>
										Kết quả
										{!isFilterCreationMode && filters.columnSort === 'result_value' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
									</th>
									<th
										className="border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 min-w-32"
										style={{ minWidth: '100px' }}
									>
										Đơn vị
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : 'cursor-pointer hover:bg-gray-100'
										} ${isColumnFiltered('deadline') ? 'text-blue-600 underline' : ''}`}
										onClick={() =>
											isFilterCreationMode ? handleColumnFilter('deadline') : handleColumnSort('deadline')
										}
										style={{ minWidth: '100px' }}
									>
										Hạn trả
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
										{!isFilterCreationMode && filters.columnSort === 'deadline' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : ''
										} ${isColumnFiltered('technician_uid') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('technician_uid')}
										style={{ minWidth: '150px' }}
									>
										Người thực hiện
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
									</th>
								</tr>
							</thead>
							<tbody>
								{groupedSampleDataForPage.map((group, groupIndex) =>
									group.analyses.map((item, analysisIndex) => (
										<tr
											key={`${group.sample.sample_uid}-${item.id}`}
											className={`
												${selectedAnalysisIds.has(item.id) ? 'selected-row' : 'hover:bg-gray-50'}
												${groupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}
												transition-colors border-b border-gray-200 cursor-pointer user-select-none
											`}
											onMouseDown={(e) => handleMouseDown(item.id, e)}
											onMouseEnter={() => handleMouseEnter(item.id)}
											style={{ userSelect: 'none' }}
										>
											{/* Mẫu thử - Only show for first analysis of each sample */}
											{analysisIndex === 0 ? (
												<td
													className={`border border-gray-300 px-3 py-2 text-left align-top w-1/6 max-w-[16.666667%] merged-sample-cell ${
														group.sample.status === 1 ? 'urgent' : ''
													}`}
													rowSpan={group.analyses.length}
												>
													<div className="text-sm">
														<div className="font-semibold text-blue-800">{item.sample_uid}</div>
														<div className="text-gray-700">{item.sample_name || 'N/A'}</div>
														<div className="text-xs text-gray-600">
															<span className="font-medium">Nền mẫu:</span> {item.matrix || 'N/A'}
														</div>
														{item.sample_description && (
															<div className="text-xs text-gray-600">
																<span className="font-medium">Mô tả:</span> {item.sample_description}
															</div>
														)}
														{/* Handover information */}
														{group.sample.handover_info && group.sample.handover_info.length > 0 && (
															<div className="text-xs text-gray-600 mt-2 border-t border-gray-200 pt-2">
																<div className="font-medium mb-1">Bàn giao:</div>
																{group.sample.handover_info.map((info, index) => (
																	<p key={index} className="mb-1 last:mb-0">
																		- <span className="font-semibold">{info.handover_by_name}</span> nhận bàn giao
																		{info.volume && info.volume !== '' && (
																			<span className="font-semibold"> {info.volume} mẫu</span>
																		)}{' '}
																		vào lúc{' '}
																		<span className="font-semibold">
																			{new Date(
																				new Date(info.handover_at).getTime() + 7 * 60 * 60 * 1000,
																			).toLocaleString('vi-VN', {
																				day: '2-digit',
																				month: '2-digit',
																				year: 'numeric',
																				hour: '2-digit',
																				minute: '2-digit',
																			})}
																		</span>
																	</p>
																))}
															</div>
														)}
													</div>
												</td>
											) : null}

											{/* Chỉ tiêu */}
											<td className="border border-gray-300 px-3 py-2 text-left">
												<span className="text-sm font-medium">{item.parameter_name || 'N/A'}</span>
											</td>

											{/* Nguồn */}
											<td className="border border-gray-300 px-3 py-2 text-left">
												{editingProtocolSource === item.id ? (
													<select
														className="protocol-select text-sm font-semibold w-full"
														value={inputValue}
														onChange={(e) => setInputValue(e.target.value)}
														onBlur={(e) => handleProtocolSourceBlur(item.id, e.target.value, item.protocol_source)}
														autoFocus
													>
														<option value="">--</option>
														<option value="IRDOP">IRDOP</option>
														<option value="IRDOP VS">IRDOP VS</option>
														<option value="EX">EX</option>
													</select>
												) : (
													<div
														className="text-sm font-medium cursor-pointer hover:bg-blue-50 p-1 rounded"
														onClick={() => handleProtocolSourceClick(item.id, item.protocol_source)}
													>
														{item.protocol_source || '--'}
													</div>
												)}
											</td>

											{/* Phương pháp */}
											<td className="border border-gray-300 px-3 py-2 text-left">
												{editingProtocolCode === item.id ? (
													<input
														type="text"
														className="w-full text-sm border border-blue-500 rounded p-1 bg-white"
														value={inputValue}
														onChange={(e) => setInputValue(e.target.value)}
														onBlur={(e) => handleProtocolCodeBlur(item.id, e.target.value, item.protocol_code)}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.target.blur();
															}
														}}
														autoFocus
													/>
												) : (
													<div
														className="text-sm cursor-pointer hover:bg-blue-50 p-1 rounded"
														onClick={() => handleProtocolCodeClick(item.id, item.protocol_code)}
													>
														{item.protocol_code || '--'}
													</div>
												)}
											</td>

											{/* Kết quả */}
											<td
												className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-blue-50"
												style={{ minWidth: '32px' }}
												onClick={() => handleCellClickV3(item.id, 'result_value', item.result_value)}
											>
												{editableCell.analysisId === item.id && editableCell.column === 'result_value' ? (
													<TinyMceInput
														value={inputValue}
														onUpdate={(content) => handleSaveContentV3(content, 'result_value', item.id)}
														onKey={handleKeyDownV3}
													/>
												) : (
													<div className="text-sm">{item.result_value ? parse(item.result_value) : '--'}</div>
												)}
											</td>

											{/* Đơn vị */}
											<td
												className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-blue-50"
												style={{ minWidth: '32px' }}
												onClick={() => handleCellClickV3(item.id, 'result_unit', item.result_unit)}
											>
												{editableCell.analysisId === item.id && editableCell.column === 'result_unit' ? (
													<TinyMceInput
														value={inputValue}
														onUpdate={(content) => handleSaveContentV3(content, 'result_unit', item.id)}
														onKey={handleKeyDownV3}
													/>
												) : (
													<div className="text-sm">{item.result_unit ? parse(item.result_unit) : '--'}</div>
												)}
											</td>

											{/* Hạn trả */}
											<td className="border border-gray-300 px-3 py-2 text-left">
												<span className={`text-sm ${getDeadlineColor(item.deadline)}`}>
													{item.deadline ? formatDate(item.deadline) : 'N/A'}
												</span>
											</td>

											{/* Người thực hiện */}
											<td className="border border-gray-300 px-3 py-2 text-left">
												<div className="text-sm">{getTechnicianName(item.technician_uid)}</div>
											</td>
										</tr>
									)),
								)}
							</tbody>
						</table>

						{/* Pagination */}
						<div className="p-4 pt-2 bg-white border-t border-gray-200">
							<div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
								<div className="flex items-center space-x-2">
									<label className="text-sm text-gray-700 font-medium">Số biên bản bàn giao mỗi trang:</label>
									<select
										value={itemsPerPage}
										onChange={(e) => {
											const newItemsPerPage = Number(e.target.value);
											setItemsPerPage(newItemsPerPage);
											setCurrentPage(1); // Reset to first page when changing items per page
										}}
										className="border border-gray-300 rounded-md p-2 bg-white text-black focus:border-blue-500"
									>
										<option value={20}>20</option>
										<option value={50}>50</option>
										<option value={100}>100</option>
										<option value={200}>200</option>
									</select>
									<span className="text-sm text-gray-600 ml-4">
										Hiển thị {Math.min((currentPage - 1) * itemsPerPage + 1, totalReceipts)} -{' '}
										{Math.min(currentPage * itemsPerPage, totalReceipts)} trong tổng số {totalItems} biên bản bàn giao
									</span>
								</div>
								<div className="flex items-center space-x-2">
									<button
										onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
										disabled={currentPage === 1}
										className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
									>
										Trước
									</button>
									<span className="px-4 py-2 text-sm text-gray-700 font-medium cursor-pointer hover:bg-blue-100 rounded">
										Trang {currentPage} / {totalPages}
									</span>
									<button
										onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
										disabled={currentPage === totalPages}
										className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
									>
										Sau
									</button>
								</div>
							</div>
						</div>
					</div>
				) : (
					<div className="custom-scrollbar overflow-auto max-h-[calc(100vh-120px)]">
						{/* Table with headers always visible */}
						<table className="w-full border-collapse" style={{ minWidth: '1000px' }}>
							<thead className="sticky top-0 z-20 border-b-2 border-gray-300 bg-sky-400">
								<tr>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 w-1/6 max-w-[16.666667%] ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : 'cursor-pointer hover:bg-gray-100'
										} ${isColumnFiltered('sample_uid') ? 'text-blue-600 underline' : ''}`}
										onClick={() =>
											isFilterCreationMode ? handleColumnFilter('sample_uid') : handleColumnSort('sample_uid')
										}
										style={{ minWidth: '140px' }}
									>
										Mẫu thử
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
										{!isFilterCreationMode && filters.columnSort === 'sample_uid' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : ''
										} ${isColumnFiltered('parameter_name') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('parameter_name')}
										style={{ minWidth: '120px' }}
									>
										Chỉ tiêu
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : ''
										} ${isColumnFiltered('protocol_source') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('protocol_source')}
										style={{ minWidth: '100px' }}
									>
										Nguồn
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : ''
										} ${isColumnFiltered('protocol_code') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('protocol_code')}
										style={{ minWidth: '120px' }}
									>
										Phương pháp
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 min-w-36 ${
											!isFilterCreationMode ? 'cursor-pointer hover:bg-gray-100' : ''
										}`}
										onClick={() => !isFilterCreationMode && handleColumnSort('result_value')}
										style={{ minWidth: '140px' }}
									>
										Kết quả
										{!isFilterCreationMode && filters.columnSort === 'result_value' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
									</th>
									<th
										className="border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 min-w-32"
										style={{ minWidth: '100px' }}
									>
										Đơn vị
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : 'cursor-pointer hover:bg-gray-100'
										} ${isColumnFiltered('deadline') ? 'text-blue-600 underline' : ''}`}
										onClick={() =>
											isFilterCreationMode ? handleColumnFilter('deadline') : handleColumnSort('deadline')
										}
										style={{ minWidth: '100px' }}
									>
										Hạn trả
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
										{!isFilterCreationMode && filters.columnSort === 'deadline' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
									</th>
									<th
										className={`border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100' : ''
										} ${isColumnFiltered('technician_uid') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('technician_uid')}
										style={{ minWidth: '150px' }}
									>
										Người thực hiện
										{isFilterCreationMode && <span className="ml-2 text-blue-600 text-xs">→ Click để lọc</span>}
									</th>
								</tr>
							</thead>
							<tbody>
								{Array.isArray(groupedSampleDataForPage) && groupedSampleDataForPage.length > 0 ? (
									groupedSampleDataForPage.map((group, groupIndex) =>
										group.analyses.map((item, analysisIndex) => (
											<tr
												key={`${group.sample.sample_uid}-${item.id}`}
												className={`${
													urgentAnalysisIds.has(item.id) ? 'border-red-500 border-2' : ''
												} hover:bg-gray-50 ${selectedAnalysisIds.has(item.id) ? 'bg-blue-100' : ''}`}
												onMouseDown={(e) => handleMouseDown(e, item.id)}
												onMouseEnter={(e) => handleMouseEnter(e, item.id)}
												onMouseUp={handleMouseUp}
											>
												{/* Sample UID with merged cells */}
												{analysisIndex === 0 && (
													<td className="border border-gray-300 px-3 py-2 text-left" rowSpan={group.analyses.length}>
														<div className="font-medium text-sm mb-1">{group.sample.sample_uid}</div>
														{group.receipt.handover_info && (
															<div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
																{parse(group.receipt.handover_info)}
															</div>
														)}
													</td>
												)}

												{/* Chỉ tiêu */}
												<td className="border border-gray-300 px-3 py-2 text-left">
													<div className="text-sm">{item.parameter_name}</div>
												</td>

												{/* Nguồn */}
												<td className="border border-gray-300 px-3 py-2 text-left">
													<div className="text-sm">{item.protocol_source || '--'}</div>
												</td>

												{/* Phương pháp */}
												<td className="border border-gray-300 px-3 py-2 text-left">
													<div className="text-sm">{item.protocol_code || '--'}</div>
												</td>

												{/* Kết quả */}
												<td
													className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-blue-50"
													onClick={(e) => {
														e.stopPropagation();
														handleCellClick(item.id, 'result_value', item.result_value);
													}}
												>
													{editingCell?.analysisId === item.id && editingCell?.column === 'result_value' ? (
														<TinyMceInput
															value={inputValue}
															onUpdate={(content) => handleSaveContent(content, 'result_value', item.id)}
															onKey={handleKeyDown}
															placeholder="Nhập kết quả..."
														/>
													) : (
														<div className="text-sm">{item.result_value ? parse(item.result_value) : '--'}</div>
													)}
												</td>

												{/* Đơn vị */}
												<td
													className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-blue-50"
													onClick={(e) => {
														e.stopPropagation();
														handleCellClick(item.id, 'result_unit', item.result_unit);
													}}
												>
													{editingCell?.analysisId === item.id && editingCell?.column === 'result_unit' ? (
														<TinyMceInput
															value={inputValue}
															onUpdate={(content) => handleSaveContent(content, 'result_unit', item.id)}
															onKey={handleKeyDown}
															placeholder="Nhập đơn vị..."
														/>
													) : (
														<div className="text-sm">{item.result_unit ? parse(item.result_unit) : '--'}</div>
													)}
												</td>

												{/* Hạn trả */}
												<td className="border border-gray-300 px-3 py-2 text-left">
													<span className={`text-sm ${getDeadlineColor(item.deadline)}`}>
														{item.deadline ? formatDate(item.deadline) : 'N/A'}
													</span>
												</td>

												{/* Người thực hiện */}
												<td className="border border-gray-300 px-3 py-2 text-left">
													<div className="text-sm">{getTechnicianName(item.technician_uid)}</div>
												</td>
											</tr>
										)),
									)
								) : (
									<tr>
										<td colSpan="8" className="border border-gray-300 px-3 py-12 text-center text-gray-500">
											<FaSearch size={32} className="mx-auto mb-2 opacity-50" />
											<p className="text-base">Không có dữ liệu mẫu thử</p>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Enhanced Bulk Edit Box */}
			{showBulkEditBox && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
					<div className="bg-white p-6 rounded-lg shadow-lg min-w-[600px] w-5/6 max-h-[90vh] overflow-auto">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-bold">
								Chỉnh sửa hàng loạt
								<span className="text-sm font-normal text-gray-600 ml-2">
									({selectedAnalysisIds.size} chỉ tiêu được chọn)
								</span>
							</h2>
							<button onClick={() => setShowBulkEditBox(false)} className="text-gray-500 hover:text-gray-700 text-xl">
								<FaTimes />
							</button>
						</div>

						{/* Input Fields Section */}
						<div className="mb-6">
							<h3 className="text-md font-semibold mb-3">Thông tin cập nhật</h3>
							<div className="flex flex-wrap gap-4 items-end">
								{/* Protocol Source */}
								<div className="flex-shrink-0" style={{ minWidth: '120px', maxWidth: '140px' }}>
									<label className="block text-sm font-medium text-gray-700 mb-1">Nguồn</label>
									<select
										className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
										value={bulkEditValues.protocol_source || ''}
										onChange={(e) => handleBulkEditChange('protocol_source', e.target.value)}
									>
										<option value="">-- Không thay đổi --</option>
										<option value="IRDOP">IRDOP</option>
										<option value="IRDOP VS">IRDOP VS</option>
										<option value="EX">EX</option>
									</select>
								</div>

								{/* Protocol Code */}
								<div className="flex-grow" style={{ minWidth: '150px' }}>
									<label className="block text-sm font-medium text-gray-700 mb-1">Phương pháp</label>
									<input
										type="text"
										className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
										placeholder="Nhập mã phương pháp..."
										value={bulkEditValues.protocol_code || ''}
										onChange={(e) => handleBulkEditChange('protocol_code', e.target.value)}
									/>
								</div>

								{/* Result Value */}
								<div className="flex-grow" style={{ minWidth: '150px' }}>
									<label className="block text-sm font-medium text-gray-700 mb-1">Kết quả</label>
									<div
										className="w-full p-2 border border-gray-300 rounded-md min-h-[38px] cursor-text hover:border-blue-500 flex items-center bg-white"
										onClick={() => handleBulkEditCellClick('result_value', 'global')}
									>
										{bulkEditCell.column === 'result_value' && bulkEditCell.receiptId === 'global' ? (
											<TinyMceInput
												value={bulkEditValues.result_value || ''}
												onUpdate={(content) => handleBulkEditChange('result_value', content)}
												onKey={(e) => {
													if (e.key === 'Enter') {
														setBulkEditCell({ column: null, receiptId: null });
													}
												}}
											/>
										) : (
											<div
												className="text-sm"
												dangerouslySetInnerHTML={{
													__html: bulkEditValues.result_value || 'Nhấp để nhập kết quả...',
												}}
											/>
										)}
									</div>
								</div>

								{/* Result Unit */}
								<div className="flex-grow" style={{ minWidth: '120px' }}>
									<label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
									<div
										className="w-full p-2 border border-gray-300 rounded-md min-h-[38px] cursor-text hover:border-blue-500 flex items-center bg-white"
										onClick={() => handleBulkEditCellClick('result_unit', 'global')}
									>
										{bulkEditCell.column === 'result_unit' && bulkEditCell.receiptId === 'global' ? (
											<TinyMceInput
												value={bulkEditValues.result_unit || ''}
												onUpdate={(content) => handleBulkEditChange('result_unit', content)}
												onKey={(e) => {
													if (e.key === 'Enter') {
														setBulkEditCell({ column: null, receiptId: null });
													}
												}}
											/>
										) : (
											<div
												className="text-sm"
												dangerouslySetInnerHTML={{
													__html: bulkEditValues.result_unit || 'Nhấp để nhập đơn vị...',
												}}
											/>
										)}
									</div>
								</div>

								{/* Technician */}
								<div className="flex-grow" style={{ minWidth: '180px' }}>
									<label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
									<select
										className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
										value={bulkEditValues.technician_uid || ''}
										onChange={(e) => handleBulkEditChange('technician_uid', e.target.value)}
									>
										<option value="">-- Không thay đổi --</option>
										{technicians?.map((tech) => (
											<option key={tech.identity_uid} value={tech.identity_uid}>
												{tech.identity_name} ({tech.alias})
											</option>
										))}
									</select>
								</div>
							</div>
						</div>

						{/* Preview table showing all selected analyses */}
						<div className="mb-6">
							<h3 className="text-md font-semibold mb-3">Xem trước thay đổi ({selectedAnalysisIds.size} mục)</h3>
							<div className="max-h-[300px] overflow-auto border border-gray-300 rounded-md">
								<table className="w-full border-collapse">
									<thead className="bg-gray-100 sticky top-0">
										<tr>
											<th className="border border-gray-300 p-2 text-left text-sm font-medium">Mẫu thử</th>
											<th className="border border-gray-300 p-2 text-left text-sm font-medium">Chỉ tiêu</th>
											<th className="border border-gray-300 p-2 text-left text-sm font-medium">Nguồn</th>
											<th className="border border-gray-300 p-2 text-left text-sm font-medium">Phương pháp</th>
											<th className="border border-gray-300 p-2 text-left text-sm font-medium">Kết quả</th>
											<th className="border border-gray-300 p-2 text-left text-sm font-medium">Đơn vị</th>
											<th className="border border-gray-300 p-2 text-left text-sm font-medium">Hạn trả</th>
											<th className="border border-gray-300 p-2 text-left text-sm font-medium">Người thực hiện</th>
										</tr>
									</thead>
									<tbody>
										{Array.from(selectedAnalysisIds).map((analysisId) => {
											// Find the analysis in grouped data
											let foundAnalysis = null;
											let foundSample = null;

											groupedSampleDataForPage.forEach((group) => {
												const analysis = group.analyses.find((a) => a.id === analysisId);
												if (analysis) {
													foundAnalysis = analysis;
													foundSample = group.sample;
												}
											});

											return foundAnalysis ? (
												<tr key={analysisId} className="hover:bg-gray-50">
													<td className="border border-gray-300 p-2 text-sm">{foundAnalysis.sample_uid}</td>
													<td className="border border-gray-300 p-2 text-sm">{foundAnalysis.parameter_name}</td>
													<td className="border border-gray-300 p-2 text-sm">
														<span className={bulkEditValues.protocol_source ? 'font-semibold text-blue-600' : ''}>
															{bulkEditValues.protocol_source || foundAnalysis.protocol_source || '--'}
														</span>
													</td>
													<td className="border border-gray-300 p-2 text-sm">
														<span className={bulkEditValues.protocol_code ? 'font-semibold text-blue-600' : ''}>
															{bulkEditValues.protocol_code || foundAnalysis.protocol_code || '--'}
														</span>
													</td>
													<td className="border border-gray-300 p-2 text-sm">
														<div
															className={bulkEditValues.result_value ? 'font-semibold text-blue-600' : ''}
															dangerouslySetInnerHTML={{
																__html: bulkEditValues.result_value || foundAnalysis.result_value || '--',
															}}
														/>
													</td>
													<td className="border border-gray-300 p-2 text-sm">
														<div
															className={bulkEditValues.result_unit ? 'font-semibold text-blue-600' : ''}
															dangerouslySetInnerHTML={{
																__html: bulkEditValues.result_unit || foundAnalysis.result_unit || '--',
															}}
														/>
													</td>
													<td className="border border-gray-300 p-2 text-sm text-left">
														<span className={getDeadlineColor(foundAnalysis.deadline)}>
															{foundAnalysis.deadline ? formatDate(foundAnalysis.deadline) : 'N/A'}
														</span>
													</td>
													<td className="border border-gray-300 p-2 text-sm">
														<span className={bulkEditValues.technician_uid ? 'font-semibold text-blue-600' : ''}>
															{bulkEditValues.technician_uid
																? getTechnicianName(bulkEditValues.technician_uid)
																: getTechnicianName(foundAnalysis.technician_uid)}
														</span>
													</td>
												</tr>
											) : null;
										})}
									</tbody>
								</table>
							</div>
						</div>

						{/* Action buttons */}
						<div className="flex justify-end space-x-3">
							<button
								onClick={() => setShowBulkEditBox(false)}
								className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
							>
								Hủy
							</button>
							<button
								onClick={handleBulkUpdate}
								className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
								disabled={Object.keys(bulkEditValues).length === 0}
							>
								Cập nhật ({selectedAnalysisIds.size} mục)
							</button>
						</div>

						<div className="mt-4 text-xs text-gray-500">
							<strong>Lưu ý:</strong> Chỉ những trường có giá trị mới sẽ được cập nhật. Trường để trống sẽ không thay
							đổi giá trị hiện tại.
						</div>
					</div>
				</div>
			)}

			{/* Filter Modal */}
			{activeFilterColumn && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div data-filter-modal className="bg-white rounded-lg p-6 w-[500px] h-[600px] overflow-hidden flex flex-col">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">
								Lọc theo{' '}
								{activeFilterColumn === 'sample_uid'
									? 'Mẫu thử'
									: activeFilterColumn === 'parameter_name'
									? 'Chỉ tiêu'
									: activeFilterColumn === 'protocol_source'
									? 'Nguồn'
									: activeFilterColumn === 'protocol_code'
									? 'Phương pháp'
									: activeFilterColumn === 'deadline'
									? 'Hạn trả'
									: activeFilterColumn}
							</h3>
							<button onClick={closeFilterModal} className="text-gray-500 hover:text-gray-700">
								✕
							</button>
						</div>

						{isLoadingFilter ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
								<span className="ml-2 text-gray-600">Đang tải...</span>
							</div>
						) : (
							<>
								{/* Search input */}
								<div className="flex items-center space-x-2 mb-3">
									<input
										type="text"
										placeholder={`Tìm kiếm trong ${
											activeFilterColumn === 'sample_uid'
												? 'Mẫu thử'
												: activeFilterColumn === 'parameter_name'
												? 'Chỉ tiêu'
												: activeFilterColumn === 'protocol_source'
												? 'Nguồn'
												: activeFilterColumn === 'protocol_code'
												? 'Phương pháp'
												: activeFilterColumn === 'deadline'
												? 'Hạn trả'
												: activeFilterColumn === 'technician_uid'
												? 'Người thực hiện'
												: activeFilterColumn
										}...`}
										value={filterSearchTerm}
										onChange={(e) => setFilterSearchTerm(e.target.value)}
										onKeyDown={(e) => {
											// Handle backspace and delete keys to trigger search
											if (e.key === 'Backspace' || e.key === 'Delete') {
												// The onChange will handle the value change
												// The useEffect will trigger the API call with delay
											}
										}}
										className="flex-1 p-2 border border-gray-300 rounded text-sm focus:border-blue-500 bg-white text-black"
										autoFocus
									/>
								</div>

								{/* Select/Unselect all buttons */}
								{filterResults.length > 0 && (
									<div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-200">
										<button
											onClick={selectAllFilterValues}
											className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
										>
											Chọn tất cả
										</button>
										<button
											onClick={unselectAllFilterValues}
											className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
										>
											Bỏ chọn tất cả
										</button>
										<span className="text-xs text-gray-500">
											({selectedFilterValues.length}/{filterResults.length})
										</span>
									</div>
								)}

								{/* Filter results */}
								<div className="flex-1 overflow-auto mb-4">
									<div className="max-h-80 overflow-y-auto">
										{filterResults.length === 0 ? (
											<div className="p-4 text-center text-gray-500">Không có dữ liệu</div>
										) : (
											<div className="space-y-1">
												{filterResults.map((result, index) => (
													<label
														key={index}
														className="flex items-center space-x-2 p-1 rounded cursor-pointer transition-colors hover:bg-gray-100"
													>
														<input
															type="checkbox"
															checked={selectedFilterValues.includes(result.value)}
															onChange={() => handleFilterValueSelect(result.value)}
															className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
														/>
														<span className="flex-1 text-sm text-black text-left">
															{result.label || result.value || '(Trống)'}
														</span>
														<span className="text-xs text-gray-500 flex-shrink-0">({result.count})</span>
													</label>
												))}
											</div>
										)}
									</div>
								</div>

								<div className="flex justify-end space-x-2">
									<button
										onClick={cancelFilter}
										className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
									>
										Hủy
									</button>
									{/* Clear filter button - only show if this column currently has a filter */}
									{filters.headerFilters[activeFilterColumn] && (
										<button
											onClick={clearColumnFilter}
											className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
										>
											Hủy lọc
										</button>
									)}
									<button
										onClick={applyFilter}
										disabled={selectedFilterValues.length === 0}
										className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Xác nhận ({selectedFilterValues.length})
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default ProcessingSample;
