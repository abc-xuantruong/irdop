import React, { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GlobalContext } from '../../contexts/GlobalContext';
import { apiGet, apiPost } from '../../contexts/helperFunctionCallAPI';
import { useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import TinyMceInput from '../Input';
import LabBulkUpdate from './LabBulkUpdate';

// Custom CSS for thin scrollbars and enhanced editing experience
const customScrollbarStyle = `
.custom-scrollbar::-webkit-scrollbar {
	width: 3px;
}

.custom-scrollbar::-webkit-scrollbar-track {
	background: #F6F6F6;
	border-radius: 2px;
	margin-right: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
	background: #c1c1c1;
	border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
	background: #a8a8a8;
}

/* Firefox */
.custom-scrollbar {
	scrollbar-width: thin;
	scrollbar-color: #c1c1c1 #F6F6F6;
}

/* Table cell overflow for dropdowns */
table td {
	overflow: visible !important;
}

.bulk-edit-modal {
	background: white;
	border-radius: 16px;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	max-width: 90vw;
	max-height: 90vh;
	overflow: auto;
}

.protocol-source-select {
	overflow: visible !important;
	position: relative !important;
}

/* Enhanced editing styles */
.editable-cell {
	transition: all 0.2s ease-in-out;
}

.editable-cell:hover {
	background-color: #f0f8ff !important;
	border-color: #7c3aed !important;
	box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.2);
}

.editing-active {
	background-color: #ffffff !important;
	border-color: #7c3aed !important;
	box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3);
}

.result-cell-placeholder {
	color: #9ca3af;
	font-style: italic;
}

.save-indicator {
	animation: pulse 1s infinite;
}

.sidebar-section-header {
	transition: all 0.05s ease-in-out;
}

.sidebar-section-header:hover {
	color: #2563eb !important;
	border-bottom: 2px solid #94a3b8 !important;
}

.sidebar-section-header:hover h3 {
	color: #2563eb !important;
}

.sidebar-section-header.active {
	color: #2563eb !important;
	border-bottom: 2px solid #2563eb !important;
}

.sidebar-subtitle {
	padding-right: 8px;
	font-size: 0.75rem;
	font-weight: 600;
	transition: all 0.2s ease-in-out;
	cursor: pointer;
}

.sidebar-subtitle:hover {
	color: #2563eb !important;
	border-bottom: 1px solid #2563eb !important;
	padding-bottom: 1px;
	background-color: rgba(37, 99, 235, 0.1) !important;
}

/* Specific hover styles to override Tailwind classes */
.sidebar-subtitle.text-blue-800:hover,
.sidebar-subtitle.text-green-800:hover,
.sidebar-subtitle.text-orange-800:hover {
	color: #2563eb !important;
	border-bottom: 1px solid #2563eb !important;
	padding-bottom: 1px;
	background-color: rgba(37, 99, 235, 0.1) !important;
}

/* Sidebar item hover effects */
.sidebar-item {
	transition: all 0.2s ease-in-out;
}

.sidebar-item:hover {
	background-color: rgba(37, 99, 235, 0.1) !important;
	border-left: 3px solid #2563eb !important;
	padding-left: 8px !important;
	color: #2563eb !important;
}

.sidebar-item:hover .item-count {
	color: #2563eb !important;
	font-weight: 700 !important;
}

/* Protocol source select styling */
.protocol-source-select {
	position: relative;
	z-index: 100;
}

.protocol-source-select select {
	appearance: none;
	-webkit-appearance: none;
	-moz-appearance: none;
	background-image: none;
	cursor: pointer;
	background-color: white !important;
}

.protocol-source-select select:focus {
	outline: none;
	box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
	border-color: #2563eb !important;
}

.protocol-source-select select:hover {
	border-color: #2563eb !important;
	background-color: #f8fafc !important;
}

/* Ensure dropdown appears above other elements */
.protocol-source-select select {
	position: relative;
	z-index: 999;
}

/* Make sure the table cell doesn't interfere */
.protocol-source-select {
	overflow: visible !important;
}

/* Custom Tooltip Styles */
.custom-tooltip {
	position: absolute;
	background: rgba(0, 0, 0, 0.9);
	color: white;
	padding: 8px 12px;
	border-radius: 6px;
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	pointer-events: none;
	z-index: 10000;
	transform: translateX(-50%) translateY(-100%);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	opacity: 0;
	transition: opacity 0.2s ease-in-out;
}

.custom-tooltip.visible {
	opacity: 1;
}

.custom-tooltip::after {
	content: '';
	position: absolute;
	top: 100%;
	left: 50%;
	transform: translateX(-50%);
	border: 5px solid transparent;
	border-top-color: rgba(0, 0, 0, 0.9);
}

/* Sample Tooltip Styles */
.sample-tooltip {
	position: absolute;
	background: white;
	border: 1px solid #d1d5db;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	border-radius: 8px;
	padding: 12px;
	font-size: 12px;
	white-space: nowrap;
	pointer-events: none;
	z-index: 10001;
	transform: translateX(-50%) translateY(-100%);
	opacity: 0;
	transition: opacity 0.2s ease-in-out;
	min-width: 200px;
}

.sample-tooltip.visible {
	opacity: 1;
}

.sample-tooltip::after {
	content: '';
	position: absolute;
	top: 100%;
	left: 50%;
	transform: translateX(-50%);
	border: 6px solid transparent;
	border-top-color: white;
}

.sample-tooltip::before {
	content: '';
	position: absolute;
	top: 100%;
	left: 50%;
	transform: translateX(-50%);
	border: 7px solid transparent;
	border-top-color: #d1d5db;
	margin-top: 1px;
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
`;

// Document preview modal CSS
const documentPreviewStyles = `
.document-preview-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10000;
}

.document-preview-content {
	background: white;
	border-radius: 12px;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	max-width: 95vw;
	max-height: 95vh;
	width: 1200px;
	height: 800px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.document-preview-header {
	background: linear-gradient(135deg, #3b82f6, #1d4ed8);
	color: white;
	padding: 16px 24px;
	display: flex;
	align-items: center;
	justify-content: between;
	border-radius: 12px 12px 0 0;
}

.document-preview-body {
	flex: 1;
	overflow: auto;
	padding: 0;
}

.document-preview-iframe {
	width: 100%;
	height: 100%;
	border: none;
	background: white;
}

.close-button {
	background: rgba(255, 255, 255, 0.2);
	border: none;
	color: white;
	border-radius: 6px;
	padding: 8px 12px;
	cursor: pointer;
	transition: background 0.2s ease;
	font-weight: 600;
}

.close-button:hover {
	background: rgba(255, 255, 255, 0.3);
}

.loading-spinner {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
	font-size: 16px;
	color: #6b7280;
}

.spinner {
	width: 24px;
	height: 24px;
	border: 3px solid #e5e7eb;
	border-top: 3px solid #3b82f6;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin-right: 12px;
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}
`;

const ProcessingAnalysis = ({ onNavigateToLab }) => {
	const { technicians } = useContext(GlobalContext);
	const location = useLocation();

	/*
	FILTERING AND URL MANAGEMENT LOGIC:
	
	1. Initial Load:
	   - Check for filter-related query params on first load
	   - If params exist: parse them into state and load data accordingly
	   - If no params: use default values without writing defaults to URL
	   - Load both sidebar and table data in single API call
	
	2. After Initial Load:
	   - Any filter changes (sidebar selections, table filters, sorting) update URL params
	   - URL params trigger new API calls for both sidebar and table data
	   - Search box input does NOT update URL (uses debounced API calls only)
	   - Default values (page=1, itemsPerPage=100, etc.) are not written to URL
	*/

	// State management
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState([]);
	const [totalItems, setTotalItems] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(100);
	const [totalPages, setTotalPages] = useState(1);
	const [updating, setUpdating] = useState(false);
	const [error, setError] = useState(null);

	// Sidebar state
	const [parameterSearchTerm, setParameterSearchTerm] = useState('');
	const [parametersData, setParametersData] = useState({
		analysis: [],
		sample: [],
		matrix: [],
		pagination: {},
	});
	const [selectedParameter, setSelectedParameter] = useState('');
	const [sidebarExpandedSections, setSidebarExpandedSections] = useState({
		analysis: true, // Default expanded
		sample: false,
		matrix: false,
	});
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	// Table state
	const [selectedRows, setSelectedRows] = useState(new Set());
	const [selectedRowsData, setSelectedRowsData] = useState(new Map());
	const [sortConfig, setSortConfig] = useState({ column: 'sample_uid', direction: 'ASC' });

	// Editing state - Updated to match ProcessingSampleV3 approach
	const [editingCell, setEditingCell] = useState(null);
	const [editValue, setEditValue] = useState('');

	// New state for improved editing like ProcessingSampleV3
	const [editableCell, setEditableCell] = useState({ analysisId: null, column: null });
	const [inputValue, setInputValue] = useState('');

	// State for protocol_source editing
	const [editingProtocolSource, setEditingProtocolSource] = useState(null);

	// Bulk edit states
	const [showBulkEditBox, setShowBulkEditBox] = useState(false);

	// Filter states
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
			'doc_id',
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

	// Drag selection state
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState(null);

	// Scroll position state for maintaining position during updates
	const [scrollPosition, setScrollPosition] = useState(0);
	const scrollContainerRef = useRef(null);

	// State to track if this is the initial load
	const [isInitialLoad, setIsInitialLoad] = useState(true);

	// Tooltip state
	const [tooltip, setTooltip] = useState({
		visible: false,
		content: '',
		x: 0,
		y: 0,
	});

	// Sample info tooltip state
	const [sampleTooltip, setSampleTooltip] = useState({
		visible: false,
		content: null,
		x: 0,
		y: 0,
	});

	// Document preview states
	const [documentPreview, setDocumentPreview] = useState({
		visible: false,
		content: '',
		loading: false,
		docId: null,
	});

	// Handle drag selection
	const handleMouseDown = (e, index, rowId, item) => {
		e.preventDefault();
		setDragStart({ index, rowId, item, y: e.clientY });
		setIsDragging(false);
	};

	const handleMouseEnter = (e, index, rowId, item) => {
		if (dragStart && Math.abs(e.clientY - dragStart.y) > 5) {
			setIsDragging(true);

			// Select range
			const startIndex = Math.min(dragStart.index, index);
			const endIndex = Math.max(dragStart.index, index);

			const newSelectedRows = new Set(selectedRows);
			const newSelectedRowsData = new Map(selectedRowsData);

			for (let i = startIndex; i <= endIndex && i < data.length; i++) {
				const currentRowId = String(data[i].id);
				newSelectedRows.add(currentRowId);
				newSelectedRowsData.set(currentRowId, data[i]);
			}

			setSelectedRows(newSelectedRows);
			setSelectedRowsData(newSelectedRowsData);
		}
	};

	const handleMouseUp = () => {
		setDragStart(null);
		setIsDragging(false);
		document.body.style.userSelect = '';
	};

	// Global mouse up listener
	useEffect(() => {
		document.addEventListener('mouseup', handleMouseUp);
		document.addEventListener('mouseleave', handleMouseUp);

		return () => {
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('mouseleave', handleMouseUp);
		};
	}, []);

	// Click outside to close filter
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				activeFilterColumn &&
				!event.target.closest('.filter-box') &&
				!event.target.closest('.filter-dropdown') &&
				!event.target.closest('[data-filter-column]')
			) {
				cancelFilter();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [activeFilterColumn]);

	// Handle drag styling
	useEffect(() => {
		if (isDragging) {
			document.body.style.userSelect = 'none';
		} else {
			document.body.style.userSelect = '';
		}
	}, [isDragging]);

	// Load initial data function
	const loadInitialData = async () => {
		const searchParams = new URLSearchParams(location.search);

		// Check if there are any filter-related query params
		const hasFilterParams = Array.from(searchParams.keys()).some((key) =>
			[
				'parameters',
				'protocols',
				'columnSort',
				'sortBy',
				'sample_uid',
				'parameter_name',
				'protocol_code',
				'matrix',
				'deadline',
				'doc_id',
				'result_value',
			].includes(key),
		);

		let newFilters = { ...filters };
		let newCurrentPage = currentPage;
		let newItemsPerPage = itemsPerPage;
		let newSortConfig = { ...sortConfig };

		if (hasFilterParams) {
			// Parse query parameters if they exist
			searchParams.forEach((value, key) => {
				if (key === 'itemsPerPage') {
					newItemsPerPage = parseInt(value) || 100;
				} else if (key === 'page') {
					newCurrentPage = parseInt(value) || 1;
				} else if (key === 'parameters') {
					try {
						const parsedParameters = JSON.parse(value);
						newFilters.parameters = Array.isArray(parsedParameters) ? parsedParameters : [];
					} catch (e) {
						newFilters.parameters = [];
					}
				} else if (key === 'protocols') {
					try {
						const parsedProtocols = JSON.parse(value);
						newFilters.protocols = Array.isArray(parsedProtocols) ? parsedProtocols : [];
					} catch (e) {
						newFilters.protocols = [];
					}
				} else if (key === 'columnSort') {
					newFilters.columnSort = value;
					newSortConfig.column = value;
				} else if (key === 'sortBy') {
					newFilters.sortBy = value;
					newSortConfig.direction = value;
				} else if (key !== 'mode') {
					// Handle header filters
					try {
						const parsedValue = JSON.parse(value);
						newFilters.headerFilters = newFilters.headerFilters || {};
						newFilters.headerFilters[key] = parsedValue;
					} catch (e) {
						newFilters.headerFilters = newFilters.headerFilters || {};
						newFilters.headerFilters[key] = value;
					}
				}
			});
		}

		// Load data FIRST before updating states to avoid triggering other useEffects
		await Promise.all([
			fetchParameters('', newFilters),
			fetchAnalysisData(false, newFilters, newCurrentPage, newItemsPerPage),
		]);

		// Update states AFTER data is loaded
		if (newCurrentPage !== currentPage) setCurrentPage(newCurrentPage);
		if (newItemsPerPage !== itemsPerPage) setItemsPerPage(newItemsPerPage);
		if (JSON.stringify(newSortConfig) !== JSON.stringify(sortConfig)) setSortConfig(newSortConfig);
		if (JSON.stringify(newFilters) !== JSON.stringify(filters)) setFilters(newFilters);
	};

	// Update URL parameters when filters change
	const updateUrlParams = (newFilters, newPage = currentPage, newItemsPerPage = itemsPerPage) => {
		// Start with existing URL parameters; only modify controlled keys
		const searchParams = new URLSearchParams(location.search);

		// Only set pagination params if they differ from defaults
		if (newItemsPerPage !== 100) {
			searchParams.set('itemsPerPage', newItemsPerPage.toString());
		} else {
			searchParams.delete('itemsPerPage');
		}

		if (newPage !== 1) {
			searchParams.set('page', newPage.toString());
		} else {
			searchParams.delete('page');
		}

		// Controlled filter params (arrays serialized as JSON)
		if (newFilters.parameters && newFilters.parameters.length > 0) {
			searchParams.set('parameters', JSON.stringify(newFilters.parameters));
		} else {
			searchParams.delete('parameters');
		}

		if (newFilters.protocols && newFilters.protocols.length > 0) {
			searchParams.set('protocols', JSON.stringify(newFilters.protocols));
		} else {
			searchParams.delete('protocols');
		}

		// Only set sort params if they differ from defaults
		if (newFilters.columnSort && newFilters.columnSort !== 'sample_uid') {
			searchParams.set('columnSort', newFilters.columnSort);
		} else {
			searchParams.delete('columnSort');
		}

		if (newFilters.sortBy && newFilters.sortBy !== 'ASC') {
			searchParams.set('sortBy', newFilters.sortBy);
		} else {
			searchParams.delete('sortBy');
		}

		// Header filter keys we manage (include existing + known set)
		const managedHeaderKeys = new Set([
			'sample_uid',
			'parameter_name',
			'protocol_code',
			'matrix',
			'deadline',
			'doc_id',
			'result_value',
			...Object.keys(newFilters.headerFilters || {}),
		]);

		managedHeaderKeys.forEach((key) => {
			const value = newFilters.headerFilters ? newFilters.headerFilters[key] : undefined;
			if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === '') {
				// Remove only if we control it
				searchParams.delete(key);
			} else {
				if (Array.isArray(value)) {
					searchParams.set(key, JSON.stringify(value));
				} else if (typeof value === 'object') {
					searchParams.set(key, JSON.stringify(value));
				} else {
					searchParams.set(key, value);
				}
			}
		});

		// Push updated state without clearing unrelated params
		const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
		window.history.replaceState({}, '', newUrl);
	};

	// Fetch analysis data
	const fetchAnalysisData = async (
		preserveScroll = false,
		customFilters = null,
		customCurrentPage = null,
		customItemsPerPage = null,
	) => {
		// Save current scroll position if preserving scroll
		if (preserveScroll && scrollContainerRef.current) {
			setScrollPosition(scrollContainerRef.current.scrollTop);
		}

		setLoading(true);
		try {
			// Use custom parameters if provided, otherwise use current state
			const useFilters = customFilters || filters;
			const useCurrentPage = customCurrentPage || currentPage;
			const useItemsPerPage = customItemsPerPage || itemsPerPage;

			// Prepare columns for API
			const apiColumns = [...useFilters.columns];
			if (!apiColumns.includes('id')) {
				apiColumns.push('id');
			}

			// Prepare request body
			const requestBody = {
				itemsPerPage: useItemsPerPage,
				page: useCurrentPage,
				columns: apiColumns,
				columnSort: useFilters.columnSort,
				sortBy: useFilters.sortBy,
			};

			// Add filters
			if (useFilters.parameters.length > 0) {
				requestBody.parameters = [...useFilters.parameters];
			}

			if (useFilters.protocols.length > 0) {
				requestBody.protocols = [...useFilters.protocols];
			}

			// Add header filters
			Object.keys(useFilters.headerFilters).forEach((column) => {
				const filterValue = useFilters.headerFilters[column];

				if (column === 'sample_uid' && filterValue) {
					if (!requestBody.sampleUIDs) requestBody.sampleUIDs = [];
					const values = Array.isArray(filterValue)
						? filterValue
						: filterValue
								.split(',')
								.map((s) => s.trim())
								.filter((s) => s);
					requestBody.sampleUIDs = requestBody.sampleUIDs.concat(values);
				} else if (column === 'parameter_name' && filterValue) {
					if (!requestBody.parameters) {
						requestBody.parameters = [];
						const values = Array.isArray(filterValue)
							? filterValue
							: filterValue
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s);
						requestBody.parameters = values;
					}
				} else if (column === 'matrix' && filterValue) {
					requestBody.matrix = filterValue;
				} else if (column === 'protocol_code' && filterValue) {
					if (!requestBody.protocols) {
						requestBody.protocols = [];
						const values = Array.isArray(filterValue)
							? filterValue
							: filterValue
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s);
						requestBody.protocols = values;
					}
				} else if (column === 'deadline' && filterValue) {
					// Use the same deadline filter values as sidebar
					requestBody.deadline = filterValue;
				} else if (column === 'doc_id' && filterValue) {
					if (filterValue === 'has_file') {
						requestBody.hasDocument = true;
					} else if (filterValue === 'no_file') {
						requestBody.hasDocument = false;
					}
				} else if (column === 'result_value' && filterValue) {
					if (filterValue === 'hasResult') {
						requestBody.hasResult = true;
					} else if (filterValue === 'noResult') {
						requestBody.hasResult = false;
					}
				} else if (column === 'protocol_source' && filterValue) {
					requestBody.sources = Array.isArray(filterValue) ? filterValue : [filterValue];
				}
			});

			// Debug log to check if sources filter is added
			if (requestBody.sources) {
				console.log('Protocol source filter applied:', requestBody.sources);
			}

			const response = await apiPost(API_ENDPOINT, requestBody);

			if (response?.status < 300) {
				const result = response.data;

				if (result.result) {
					setData(result.result);

					// Update pagination from API response
					if (result.pagination) {
						setCurrentPage(result.pagination.currentPage);
						setItemsPerPage(result.pagination.itemsPerPage);
						setTotalItems(result.pagination.totalItems);
						setTotalPages(result.pagination.totalPages);
					} else {
						// Fallback for backward compatibility
						setTotalItems(result.total || 0);
						setTotalPages(Math.ceil((result.total || 0) / itemsPerPage));
					}
				}
			} else {
				throw new Error(`API request failed with status: ${response.status}`);
			}
		} catch (error) {
			console.error('Error fetching analysis data:', error);
			setError('Lỗi khi tải dữ liệu: ' + error.message);
		} finally {
			setLoading(false);

			// Restore scroll position if preserving scroll
			if (preserveScroll && scrollContainerRef.current && scrollPosition > 0) {
				setTimeout(() => {
					scrollContainerRef.current.scrollTop = scrollPosition;
				}, 50);
			}
		}
	};

	// Fetch parameters list
	const fetchParameters = async (searchTerm = '', customFilters = null) => {
		try {
			const useFilters = customFilters || filters;
			const requestBody = { searchTerm: searchTerm };

			// Add deadline filter if active
			if (useFilters.headerFilters.deadline) {
				requestBody.deadline = useFilters.headerFilters.deadline;
			}

			const response = await apiPost(PARAMETER_API_ENDPOINT, requestBody);

			if (response.status < 300 && response.data) {
				setParametersData({
					analysis: response.data.analysis || [],
					sample: response.data.sample || [],
					matrix: response.data.matrix || [],
					pagination: response.data.pagination || {},
				});
			}
		} catch (error) {
			console.error('Error fetching parameters:', error);
			setError('Lỗi khi tải danh sách chỉ tiêu: ' + error.message);
		}
	};

	// Fetch filter values for column
	const fetchFilterValues = async (column, searchTerm = '') => {
		setFilterLoading(true);
		try {
			const response = await apiPost('https://black.irdop.org/v1/analysis/search_filter_column', {
				filterColumn: column,
				searchTerm: searchTerm,
			});

			if (response.status < 300 && response.data) {
				if (response.data.result && Array.isArray(response.data.result)) {
					// Transform the API response to the expected format
					const transformedResults = response.data.result.map((item) => {
						// Handle different column types
						if (column === 'protocol_code' && item.protocol_code !== undefined) {
							return {
								value: item.protocol_code,
								count: item.total || 1,
							};
						} else if (column === 'parameter_name' && item.parameter_name !== undefined) {
							return {
								value: item.parameter_name,
								count: item.total || 1,
							};
						} else if (column === 'sample_uid' && item.sample_uid !== undefined) {
							return {
								value: item.sample_uid,
								count: item.total || 1,
							};
						} else if (column === 'matrix' && item.matrix !== undefined) {
							return {
								value: item.matrix,
								count: item.total || 1,
							};
						} else if (column === 'result_unit' && item.result_unit !== undefined) {
							return {
								value: item.result_unit,
								count: item.total || 1,
							};
						} else {
							// Fallback for other column types or if the item is just a string
							return {
								value: typeof item === 'string' ? item : item.value || item[column] || '',
								count: item.total || item.count || 1,
							};
						}
					});
					setFilterResults(transformedResults);
				} else {
					setFilterResults([]);
				}
			} else {
				setFilterResults([]);
			}
		} catch (error) {
			console.error('Error fetching filter values:', error);
			setError('Lỗi khi tải giá trị lọc: ' + error.message);
			setFilterResults([]);
		} finally {
			setFilterLoading(false);
		}
	};

	// Initial data load (inject custom scrollbar styles)
	useEffect(() => {
		// Inject custom scrollbar styles
		const styleSheet = document.createElement('style');
		styleSheet.textContent = customScrollbarStyle;
		document.head.appendChild(styleSheet);

		// Inject document preview modal styles
		const documentStyleSheet = document.createElement('style');
		documentStyleSheet.textContent = documentPreviewStyles;
		document.head.appendChild(documentStyleSheet);

		return () => {
			// Clean up the style sheets on unmount
			if (document.head.contains(styleSheet)) {
				document.head.removeChild(styleSheet);
			}
			if (document.head.contains(documentStyleSheet)) {
				document.head.removeChild(documentStyleSheet);
			}
		};
	}, []);

	// API Constants
	const API_ENDPOINT = 'https://black.irdop.org/v1/analysis/processing/list';
	const PARAMETER_API_ENDPOINT = 'https://black.irdop.org/v1/lab/get/analysis/by_parameter';

	// Parse URL parameters and load initial data
	useEffect(() => {
		if (isInitialLoad) {
			loadInitialData();
			setIsInitialLoad(false);
		}
	}, []);

	// Handle filter changes after initial load (update URL and fetch data)
	useEffect(() => {
		if (!isInitialLoad) {
			// Update URL parameters
			updateUrlParams(filters, currentPage, itemsPerPage);

			// Fetch both sidebar and table data - keep current search term for sidebar
			fetchParameters(parameterSearchTerm);
			fetchAnalysisData();
		}
	}, [
		currentPage,
		itemsPerPage,
		filters.parameters,
		filters.protocols,
		filters.headerFilters,
		sortConfig,
		// isInitialLoad,
	]);

	// Search parameters with debounce (only for search box, doesn't update URL)
	useEffect(() => {
		// Don't fetch during initial load, but allow empty search to fetch default data
		if (!isInitialLoad) {
			const timeoutId = setTimeout(() => {
				fetchParameters(parameterSearchTerm);
			}, 300);

			return () => clearTimeout(timeoutId);
		}
	}, [parameterSearchTerm, isInitialLoad]);

	// Search filter values with debounce
	useEffect(() => {
		if (activeFilterColumn) {
			// For special filter columns, don't fetch from API
			if (
				activeFilterColumn === 'result_value' ||
				activeFilterColumn === 'deadline' ||
				activeFilterColumn === 'doc_id'
			) {
				return;
			}

			const timeoutId = setTimeout(() => {
				fetchFilterValues(activeFilterColumn, filterSearchTerm);
			}, 300);

			return () => clearTimeout(timeoutId);
		}
	}, [activeFilterColumn, filterSearchTerm]);

	// Auto-refresh data every 60 seconds
	useEffect(() => {
		if (!isInitialLoad) {
			const autoRefreshInterval = setInterval(() => {
				// Only prevent auto-refresh when actively editing a cell
				if (!updating && !editingCell && !editableCell.analysisId && !editingProtocolSource) {
					// Use current state instead of parsing URL to maintain filters
					fetchAnalysisData(true, filters, currentPage, itemsPerPage);
				}
			}, 60000); // 60 seconds

			return () => clearInterval(autoRefreshInterval);
		}
	}, [updating, editingCell, editableCell.analysisId, editingProtocolSource, isInitialLoad, filters, currentPage, itemsPerPage]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e) => {
			// Escape key to cancel editing (all systems)
			if (e.key === 'Escape') {
				if (editingCell) {
					handleCancelEdit();
				}
				if (editableCell.analysisId) {
					setEditableCell({ analysisId: null, column: null });
				}
				if (editingProtocolSource) {
					cancelProtocolSourceEdit();
				}
			}
			// Enter key to save editing (legacy system only, TinyMce handles its own)
			// Skip if target is textarea (protocol_code field handles its own Enter)
			if (e.key === 'Enter' && editingCell && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
				e.preventDefault();
				handleSaveEdit();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [editingCell, editableCell.analysisId, editingProtocolSource]);

	// Handle sidebar section toggle
	const toggleSidebarSection = (section) => {
		setSidebarExpandedSections((prev) => ({
			analysis: section === 'analysis' ? !prev.analysis : false,
			sample: section === 'sample' ? !prev.sample : false,
			matrix: section === 'matrix' ? !prev.matrix : false,
		}));
	};

	// Handle sidebar collapse toggle
	const toggleSidebarCollapse = () => {
		setSidebarCollapsed(!sidebarCollapsed);
	};

	// Select parameter/sample/matrix
	const selectItem = (type, itemName, protocolCode = null, sampleName = null) => {
		let itemKey = '';

		if (type === 'analysis') {
			const normalizedProtocolCode = protocolCode && protocolCode.trim() ? protocolCode : 'null';
			itemKey = `${type}|${itemName}|${normalizedProtocolCode}`;
		} else if (type === 'sample') {
			itemKey = `${type}|${itemName}|${sampleName || ''}`;
		} else if (type === 'matrix') {
			itemKey = `${type}|${itemName}`;
		}

		// If same item is selected, clear it
		if (selectedParameter === itemKey) {
			setSelectedParameter('');
			setFilters((prev) => ({
				...prev,
				parameters: [],
				protocols: [],
				headerFilters: {
					...prev.headerFilters,
					parameter_name: undefined,
					protocol_code: undefined,
					sample_uid: undefined,
					matrix: undefined,
				},
			}));
		} else {
			// Select new item
			setSelectedParameter(itemKey);

			let newFilters = {
				parameters: [],
				protocols: [],
				headerFilters: { ...filters.headerFilters },
			};

			if (type === 'analysis') {
				const normalizedProtocolCode = protocolCode && protocolCode.trim() ? protocolCode : 'null';
				// Only use headerFilters for analysis selection to avoid duplicates
				newFilters.headerFilters.parameter_name = [itemName];
				newFilters.headerFilters.protocol_code = [normalizedProtocolCode];
				// Clear other filters
				newFilters.headerFilters.sample_uid = undefined;
				newFilters.headerFilters.matrix = undefined;
			} else if (type === 'sample') {
				newFilters.headerFilters.sample_uid = [itemName];
				// Clear other filters
				newFilters.headerFilters.parameter_name = undefined;
				newFilters.headerFilters.protocol_code = undefined;
				newFilters.headerFilters.matrix = undefined;
			} else if (type === 'matrix') {
				newFilters.headerFilters.matrix = itemName;
				// Clear other filters
				newFilters.headerFilters.parameter_name = undefined;
				newFilters.headerFilters.protocol_code = undefined;
				newFilters.headerFilters.sample_uid = undefined;
			}

			setFilters((prev) => ({
				...prev,
				...newFilters,
			}));
		}
	};

	// Clear parameter
	const clearParameter = () => {
		const newFilters = {
			...filters,
			parameters: [],
			protocols: [],
			headerFilters: {},
		};
		setFilters(newFilters);
		setSelectedParameter('');
	};

	// Select deadline filter
	const selectDeadlineFilter = (deadlineType) => {
		// Clear table filter state when switching to sidebar filtering
		setIsFilterCreationMode(false);
		setActiveFilterColumn(null);
		setFilterSearchTerm('');
		setFilterResults([]);
		setSelectedFilterValues([]);

		// If same deadline filter is selected, clear it
		if (filters.headerFilters.deadline === deadlineType) {
			const newFilters = {
				...filters,
				headerFilters: {
					deadline: undefined,
				},
			};
			setFilters(newFilters);
		} else {
			// Select new deadline filter and clear only table header filters (keep sidebar filters)
			const newFilters = {
				...filters,
				headerFilters: {
					deadline: deadlineType,
				},
			};
			setFilters(newFilters);
		}
	};

	// Clear all filters (for selected items indicator)
	const clearAllFilters = () => {
		const newFilters = {
			...filters,
			parameters: [],
			protocols: [],
			headerFilters: {},
		};
		setFilters(newFilters);
		setSelectedParameter('');
		clearAllSelections();
	};

	// Helper function to normalize content for comparison (especially for TinyMCE)
	const normalizeContent = (content) => {
		if (!content || typeof content !== 'string') return '';

		// Remove leading <p> and trailing </p> tags for TinyMCE content
		let normalized = content.trim();
		if (normalized.startsWith('<p>') && normalized.endsWith('</p>')) {
			normalized = normalized.slice(3, -4);
		}

		// Remove other common HTML artifacts that TinyMCE might add
		normalized = normalized.replace(/&nbsp;/g, ' ').trim();

		return normalized;
	};

	// Helper function to check if content has actually changed
	const hasContentChanged = (newContent, currentData, analysisId, column) => {
		const currentItem = currentData.find((item) => item.id === analysisId);
		if (!currentItem) return true; // If item not found, assume it changed

		const currentValue = currentItem[column] || '';
		const normalizedNew = normalizeContent(newContent);
		const normalizedCurrent = normalizeContent(currentValue);

		return normalizedNew !== normalizedCurrent;
	};

	// Update analysis field
	const updateAnalysisField = async (rowId, column, value) => {
		// Check if content has actually changed
		if (!hasContentChanged(value, data, parseInt(rowId), column)) {
			console.log(`No changes detected for ${column}, skipping API call`);
			// Still clear editing state
			setEditingCell(null);
			setEditValue('');
			return;
		}

		setUpdating(true);
		try {
			const body = {
				analysis: {
					id: parseInt(rowId),
					[column]: value,
				},
			};

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', body);

			if (response && response.status >= 200 && response.status < 300) {
				// Update local data
				setData((prevData) =>
					prevData.map((item) => (item.id === parseInt(rowId) ? { ...item, [column]: value } : item)),
				);

				// Show success notification
				showSuccessNotification('Cập nhật thành công');
			} else {
				throw new Error(`API update failed with status: ${response.status}`);
			}
		} catch (error) {
			console.error('Error updating analysis field:', error);
			showErrorNotification('Cập nhật thất bại: ' + error.message);
		} finally {
			setUpdating(false);
		}
	};

	// Handle cell edit
	const handleCellEdit = (rowId, column, value) => {
		setEditingCell({ rowId, column });
		setEditValue(value || '');
	};

	// Save cell edit
	const handleSaveEdit = async () => {
		if (!editingCell) return;

		const { rowId, column } = editingCell;

		// Check if content has actually changed
		if (!hasContentChanged(editValue, data, parseInt(rowId), column)) {
			console.log(`No changes detected for ${column}, skipping API call`);
			// Still clear editing state
			setEditingCell(null);
			setEditValue('');
			return;
		}

		try {
			await updateAnalysisField(rowId, column, editValue);
		} catch (error) {
			console.error('Error updating:', error);
		} finally {
			setEditingCell(null);
			setEditValue('');
		}
	};

	// Cancel edit
	const handleCancelEdit = () => {
		setEditingCell(null);
		setEditValue('');
	};

	// New improved editing functions inspired by ProcessingSampleV3
	const handleCellClickV3 = (analysisId, column, currentValue) => {
		openEditorWithAutoSave(analysisId, column, currentValue);
	};

	const handleKeyDownV3 = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			setEditableCell({ analysisId: null, column: null });
		} else if (e.key === 'Escape') {
			setEditableCell({ analysisId: null, column: null });
		}
	};

	const handleSaveContentV3 = async (content, column, analysisId) => {
		// Bỏ guard để vẫn lưu được ô cũ khi đã click sang ô mới
		// if (!editableCell.analysisId || editableCell.column !== column) { return; }

		// Check if content has actually changed
		if (!hasContentChanged(content, data, analysisId, column)) {
			console.log(`No changes detected for ${column}, skipping API call`);
			// Chỉ reset nếu ô hiện tại vẫn là ô này
			setEditableCell((prev) => {
				if (prev.analysisId === analysisId && prev.column === column) {
					return { analysisId: null, column: null };
				}
				return prev;
			});
			return;
		}

		try {
			setUpdating(true);

			// Validate content for specific columns
			if (column === 'result_value' && content && content.length > 1000) {
				toast.error('Kết quả quá dài (tối đa 1000 ký tự)', {
					position: 'top-right',
					autoClose: 500,
					hideProgressBar: true,
					closeOnClick: true,
					pauseOnHover: false,
					draggable: false,
				});
				return;
			}

			if (column === 'result_unit' && content && content.length > 50) {
				toast.error('Đơn vị quá dài (tối đa 50 ký tự)', {
					position: 'top-right',
					autoClose: 500,
					hideProgressBar: true,
					closeOnClick: true,
					pauseOnHover: false,
					draggable: false,
				});
				return;
			}

			const body = {
				analysis: {
					id: analysisId,
					[column]: content,
				},
			};

			// Add submit_result_by for result_value updates
			if (column === 'result_value' && technicians.length > 0) {
				const currentUser = technicians[0];
				body.analysis.submit_result_by = currentUser?.identity_name || 'System';
			}

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', body);

			if (response?.status === 200) {
				toast.success(`Cập nhật ${column === 'result_value' ? 'kết quả' : 'đơn vị'} thành công`, {
					position: 'top-right',
					autoClose: 500,
					hideProgressBar: true,
					closeOnClick: true,
					pauseOnHover: false,
					draggable: false,
				});

				setData((prevData) =>
					prevData.map((item) => {
						if (item.id === analysisId) {
							const updatedItem = { ...item, [column]: content };
							if (column === 'result_value') {
								updatedItem.last_updated = new Date().toISOString();
							}
							return updatedItem;
						}
						return item;
					}),
				);

				setTimeout(() => {
					fetchAnalysisData(true);
				}, 1000);
			} else {
				toast.error(`Cập nhật ${column === 'result_value' ? 'kết quả' : 'đơn vị'} thất bại`, {
					position: 'top-right',
					autoClose: 500,
					hideProgressBar: true,
					closeOnClick: true,
					pauseOnHover: false,
					draggable: false,
				});
			}
		} catch (error) {
			console.error('Error updating analysis:', error);
			const isNetworkError = !error.response;
			toast.error(isNetworkError ? 'Lỗi mạng, vui lòng kiểm tra kết nối' : 'Lỗi khi cập nhật dữ liệu', {
				position: 'top-right',
				autoClose: 500,
				hideProgressBar: true,
				closeOnClick: true,
				pauseOnHover: false,
				draggable: false,
			});
		} finally {
			setUpdating(false);
			// Chỉ reset nếu vẫn đang ở ô đó
			setEditableCell((prev) => {
				if (prev.analysisId === analysisId && prev.column === column) {
					return { analysisId: null, column: null };
				}
				return prev;
			});
		}
	};

	// Hàm mở editor với auto-save ô cũ
	const openEditorWithAutoSave = async (analysisId, column, currentValue) => {
		if (editableCell.analysisId && (editableCell.analysisId !== analysisId || editableCell.column !== column)) {
			try {
				// Lấy content hiện tại từ TinyMCE active editor (nếu có)
				const activeEditor = window.tinymce?.activeEditor;
				if (activeEditor) {
					const prevContent = activeEditor.getContent();
					await handleSaveContentV3(prevContent, editableCell.column, editableCell.analysisId);
				}
			} catch (e) {
				console.warn('Auto-save previous cell failed or not needed:', e);
			}
		}

		// Mở ô mới
		setEditableCell({ analysisId, column });
		setInputValue(currentValue || '');

		setTimeout(() => {
			const editor = document.querySelector(`[data-edit-id="${analysisId}-${column}"] .tox-edit-area__iframe`);
			if (editor) editor.focus();
		}, 100);
	};

	// Handle select dropdown changes for protocol_source
	const handleProtocolSourceChange = async (value, analysisId) => {
		// Check if value has actually changed
		if (!hasContentChanged(value, data, analysisId, 'protocol_source')) {
			console.log(`No changes detected for protocol_source, skipping API call`);
			// Still close editing state without showing notification
			setEditingProtocolSource(null);
			return;
		}

		try {
			setUpdating(true);

			const body = {
				analysis: {
					id: analysisId,
					protocol_source: value,
				},
			};

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', body);

			if (response?.status === 200) {
				toast.success('Cập nhật nguồn protocal thành công', {
					position: 'top-right',
					autoClose: 500,
					hideProgressBar: true,
					closeOnClick: true,
					pauseOnHover: false,
					draggable: false,
				});

				// Update local data immediately
				setData((prevData) =>
					prevData.map((item) => {
						if (item.id === analysisId) {
							return { ...item, protocol_source: value };
						}
						return item;
					}),
				);

				// Background refresh
				setTimeout(() => {
					fetchAnalysisData(true);
				}, 1000);
			} else {
				toast.error('Cập nhật nguồn protocal thất bại', {
					position: 'top-right',
					autoClose: 500,
					hideProgressBar: true,
					closeOnClick: true,
					pauseOnHover: false,
					draggable: false,
				});
			}
		} catch (error) {
			console.error('Error updating protocol_source:', error);
			const isNetworkError = !error.response;
			toast.error(isNetworkError ? 'Lỗi mạng, vui lòng kiểm tra kết nối' : 'Lỗi khi cập nhật nguồn protocal', {
				position: 'top-right',
				autoClose: 500,
				hideProgressBar: true,
				closeOnClick: true,
				pauseOnHover: false,
				draggable: false,
			});
		} finally {
			setUpdating(false);
			setEditingProtocolSource(null); // Close editing state
		}
	};

	// Handle protocol source click to enter edit mode
	const handleProtocolSourceClick = (analysisId, currentValue) => {
		setEditingProtocolSource(analysisId);
	};

	// Cancel protocol source editing
	const cancelProtocolSourceEdit = () => {
		setEditingProtocolSource(null);
	};

	const handleBulkEditClick = () => {
		setShowBulkEditBox(true);
	};

	// Handle bulk update completion
	const handleBulkUpdateComplete = () => {
		clearAllSelections();
		setTimeout(() => {
			fetchAnalysisData(true);
		}, 1000);
	};

	// Show notifications
	const showSuccessNotification = (message) => {
		toast.success(message, {
			position: 'top-right',
			autoClose: 500,
			hideProgressBar: true,
			closeOnClick: true,
			pauseOnHover: false,
			draggable: false,
		});
	};

	const showErrorNotification = (message) => {
		toast.error(message, {
			position: 'top-right',
			autoClose: 500,
			hideProgressBar: true,
			closeOnClick: true,
			pauseOnHover: false,
			draggable: false,
		});
	};

	// Format date
	const formatDate = (dateString) => {
		if (!dateString) return '--';
		return new Date(dateString).toLocaleDateString('vi-VN');
	};

	// Get technician name by UID
	const getTechnicianName = (technician_uid) => {
		if (!technician_uid || !technicians) return '--';
		const technician = technicians.find((tech) => tech.identity_uid === technician_uid);
		return technician ? `${technician.identity_name} (${technician.alias})` : '--';
	};

	// Handle cell click
	const handleCellClick = (rowId, column, value) => {
		setEditingCell({ rowId, column });
		setEditValue(value || '');
	};

	// Toggle row selection
	const toggleRowSelection = (rowId, item) => {
		const newSelectedRows = new Set(selectedRows);
		const newSelectedRowsData = new Map(selectedRowsData);

		if (newSelectedRows.has(rowId)) {
			newSelectedRows.delete(rowId);
			newSelectedRowsData.delete(rowId);
		} else {
			newSelectedRows.add(rowId);
			newSelectedRowsData.set(rowId, item);
		}

		setSelectedRows(newSelectedRows);
		setSelectedRowsData(newSelectedRowsData);
	};

	// Clear all selections
	const clearAllSelections = () => {
		setSelectedRows(new Set());
		setSelectedRowsData(new Map());
	};

	// Open editor
	const openEditor = () => {
		const selectedData = Array.from(selectedRows)
			.map((rowId) => selectedRowsData.get(rowId))
			.filter(Boolean);

		// Check if any selected items have doc_id
		const itemsWithDocId = selectedData.filter((item) => item.doc_id);

		if (itemsWithDocId.length > 0) {
			const itemDescriptions = itemsWithDocId.map((item) => {
				const sampleUid = item.sample_uid || 'N/A';
				const parameterName = item.parameter_name || 'N/A';
				return `${sampleUid} - ${parameterName}`;
			});

			const message = `${itemDescriptions.join(', ')} đã được lập biên bản, vẫn tiếp tục lập biên bản?`;

			if (!window.confirm(message)) {
				return;
			}
		}

		// Create form data for editor
		const editorData = {
			selectedItems: selectedData,
			count: selectedData.length,
		};

		// Store in localStorage for editor to access
		localStorage.setItem('editorData', JSON.stringify(editorData));

		// Get analysis IDs for URL query
		const analysisIds = selectedData.map((item) => item.id).filter((id) => id);

		// Build editor URL with query parameters
		let editorUrl = '/editor';
		if (analysisIds.length > 0) {
			const queryParams = new URLSearchParams();
			queryParams.set('analysisIds', analysisIds.join(','));
			editorUrl += '?' + queryParams.toString();
		}

		// open in new tab to editor page
		window.open(editorUrl, '_blank');
	};

	// Open document
	const openDocument = async (docId) => {
	
			// Use the new modal preview for all document types
			handleDocumentPreview(docId);
		
	};

	// Handle sorting
	const handleSort = (column, event) => {
		// If in filter creation mode, show filter instead of sorting
		if (isFilterCreationMode) {
			// If the same filter column is already active, close it
			if (activeFilterColumn === column) {
				cancelFilter();
				return;
			}

			// Calculate filter position from the clicked header
			const headerElement = event.currentTarget;
			const rect = headerElement.getBoundingClientRect();
			setFilterPosition({
				top: rect.bottom + window.scrollY,
				left: rect.left + window.scrollX,
			});

			setActiveFilterColumn(column);
			setFilterSearchTerm('');
			setFilterResults([]);

			// Load existing filter values for this column
			const existingFilterValues = filters.headerFilters[column];
			if (existingFilterValues && Array.isArray(existingFilterValues)) {
				setSelectedFilterValues([...existingFilterValues]);
			} else {
				setSelectedFilterValues([]);
			}

			// For special filter columns, don't fetch from API
			// The useEffect will handle fetchFilterValues for regular columns
			return;
		}

		setSortConfig((prev) => ({
			column,
			direction: prev.column === column && prev.direction === 'ASC' ? 'DESC' : 'ASC',
		}));

		const newFilters = {
			...filters,
			columnSort: column,
			sortBy: sortConfig.column === column && sortConfig.direction === 'ASC' ? 'DESC' : 'ASC',
		};
		setFilters(newFilters);
	};

	// Toggle filter creation mode
	const toggleFilterCreationMode = () => {
		setIsFilterCreationMode(!isFilterCreationMode);
		setActiveFilterColumn(null);
		setFilterSearchTerm('');
		setFilterResults([]);
		setSelectedFilterValues([]);
	};

	// Handle filter value selection
	const handleFilterValueSelect = (value) => {
		setSelectedFilterValues((prev) => {
			if (prev.includes(value)) {
				return prev.filter((v) => v !== value);
			} else {
				return [...prev, value];
			}
		});
	};

	// Select all filter values
	const selectAllFilterValues = () => {
		const allValues = filterResults.map((result) => result.value);
		setSelectedFilterValues(allValues);
	};

	// Unselect all filter values
	const unselectAllFilterValues = () => {
		setSelectedFilterValues([]);
	};

	// Apply filter
	const applyFilter = () => {
		if (activeFilterColumn && selectedFilterValues.length > 0) {
			const newFilters = {
				...filters,
				headerFilters: {
					...filters.headerFilters,
					[activeFilterColumn]: selectedFilterValues,
				},
			};
			setFilters(newFilters);
		}
		setActiveFilterColumn(null);
		setFilterSearchTerm('');
		setFilterResults([]);
		setSelectedFilterValues([]);
	};

	// Apply special filter (for result_value, deadline, doc_id)
	const applySpecialFilter = (column, value) => {
		const newFilters = {
			...filters,
			headerFilters: {
				...filters.headerFilters,
				[column]: value,
			},
		};
		setFilters(newFilters);
		setActiveFilterColumn(null);
		setFilterSearchTerm('');
		setFilterResults([]);
		setSelectedFilterValues([]);
	};

	// Cancel filter
	const cancelFilter = () => {
		setActiveFilterColumn(null);
		setFilterSearchTerm('');
		setFilterResults([]);
		setSelectedFilterValues([]);
	};

	// Remove filter for specific column
	const removeColumnFilter = (column) => {
		const newFilters = {
			...filters,
			headerFilters: {
				...filters.headerFilters,
			},
		};
		
		// Remove the specific column filter
		delete newFilters.headerFilters[column];
		
		// Also clear related sidebar filters if needed
		if (column === 'parameter_name') {
			newFilters.parameters = [];
		} else if (column === 'protocol_code') {
			newFilters.protocols = [];
		} else if (column === 'deadline') {
			// Clear deadline filter completely
			delete newFilters.headerFilters.deadline;
		} else if (column === 'matrix' || column === 'sample_uid') {
			// Clear the selected parameter if it's related to matrix or sample
			if (selectedParameter && 
				((column === 'matrix' && selectedParameter.includes('matrix|')) ||
				 (column === 'sample_uid' && selectedParameter.includes('sample|')))) {
				setSelectedParameter('');
			}
		}
		
		setFilters(newFilters);
		
		// Clear selected parameter if all filters are cleared
		if (Object.keys(newFilters.headerFilters).length === 0 && 
			newFilters.parameters.length === 0 && 
			newFilters.protocols.length === 0) {
			setSelectedParameter('');
		}
	};

	// Available columns
	const availableColumns = {
		sample_uid: 'Mã mẫu',
		parameter_name: 'Tên chỉ tiêu',
		matrix: 'Nền mẫu',
		protocol_source: 'Nguồn',
		protocol_code: 'Phương pháp',
		result_value: 'Kết quả',
		result_unit: 'Đơn vị',
		deadline: 'Hạn trả',
		doc_id: 'Doc',
		document: 'Tài liệu',
		id: 'ID',
		lodq: 'LOD/LOQ',
		reviewed_by: 'Người duyệt',
	};

	// Pagination calculations
	const startIndex = (currentPage - 1) * itemsPerPage + 1;
	const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

	// Tooltip functions
	const showTooltip = (event, content) => {
		const rect = event.target.getBoundingClientRect();
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
		
		setTooltip({
			visible: true,
			content,
			x: rect.left + scrollLeft + rect.width / 2,
			y: rect.top + scrollTop - 10,
		});
	};

	const hideTooltip = () => {
		setTooltip({
			visible: false,
			content: '',
			x: 0,
			y: 0,
		});
	};

	// Sample tooltip functions
	const showSampleTooltip = (event, sampleData) => {
		const rect = event.target.getBoundingClientRect();
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
		
		setSampleTooltip({
			visible: true,
			content: sampleData,
			x: rect.left + scrollLeft + rect.width / 2,
			y: rect.top + scrollTop - 10,
		});
	};

	const hideSampleTooltip = () => {
		setSampleTooltip({
			visible: false,
			content: null,
			x: 0,
			y: 0,
		});
	};

	// Document preview handlers
	const handleDocumentPreview = async (docId) => {
		if (!docId) return;

		setDocumentPreview({
			visible: true,
			content: '',
			loading: true,
			docId: docId,
		});

		try {
			const response = await apiPost('https://red.irdop.org/v1/document/preview_doc', {
				id: docId,
			});

			if (response?.status < 300 && response?.data) {
				setDocumentPreview({
					visible: true,
					content: response.data,
					loading: false,
					docId: docId,
				});
			} else {
				throw new Error('Failed to load document');
			}
		} catch (error) {
			console.error('Error loading document:', error);
			setDocumentPreview({
				visible: true,
				content: '<div class="text-red-600 p-4">Lỗi khi tải tài liệu: ' + error.message + '</div>',
				loading: false,
				docId: docId,
			});
			showErrorNotification('Lỗi khi tải tài liệu');
		}
	};

	// Close document preview
	const closeDocumentPreview = () => {
		setDocumentPreview({
			visible: false,
			content: '',
			loading: false,
			docId: null,
		});
	};

	return (
		<div className="flex h-full bg-gray-100 relative">
			{/* Loading overlay when updating */}
			{updating && (
				<div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-4 shadow-lg flex items-center space-x-3">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
						<span className="text-gray-700">Đang cập nhật...</span>
					</div>
				</div>
			)}

			{/* Sidebar */}
			<div
				className={`left-0 h-lvh bg-gray-100 border-gray-300 z-40 flex flex-col box-border transition-all duration-300 ${
					sidebarCollapsed ? 'min-w-0 max-w-0 overflow-hidden' : 'min-w-72 max-w-80'
				}`}
			>
				<div className="flex-1 flex flex-col overflow-hidden">
					{/* Parameter search with title */}
					<div className="p-3 border-b border-gray-300 bg-gray-50 sticky top-0 z-10">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-base font-bold text-gray-800 text-left">DANH SÁCH CHỈ TIÊU</h2>
							<button
								onClick={toggleSidebarCollapse}
								className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
								onMouseEnter={(e) => showTooltip(e, 'Thu gọn sidebar')}
								onMouseLeave={hideTooltip}
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
								</svg>
							</button>
						</div>
						<div className="relative">
							<input
								type="text"
								placeholder="Tìm kiếm chỉ tiêu..."
								className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black text-left"
								value={parameterSearchTerm}
								onChange={(e) => setParameterSearchTerm(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										// Immediately fetch parameters when Enter is pressed, even with empty value
										fetchParameters(parameterSearchTerm);
									}
								}}
							/>
						</div>
						{/* Summary text */}
						<div className="mt-2 text-xs text-gray-600 text-left">
							{parameterSearchTerm ? (
								<span className="text-left">
									Tìm thấy{' '}
									<strong>
										{parametersData.analysis.length + parametersData.sample.length + parametersData.matrix.length}
									</strong>{' '}
									kết quả theo từ khóa <strong>{parameterSearchTerm}</strong>.
									<span
										className="text-yellow-600 font-bold underline cursor-pointer ml-1"
										onClick={() => setParameterSearchTerm('')}
									>
										Hủy
									</span>
								</span>
							) : (
								<span className="text-left">
									<strong>{parametersData.analysis.length}</strong> chỉ tiêu,{' '}
									<strong>{parametersData.sample.length}</strong> mẫu, <strong>{parametersData.matrix.length}</strong>{' '}
									nền mẫu
								</span>
							)}
						</div>

						{/* Deadline filter buttons */}
						<div className="pt-3 border-gray-300">
							<div className="grid grid-cols-3 gap-2">
								<button
									onClick={() => selectDeadlineFilter('overdue')}
									className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
										filters.headerFilters.deadline === 'overdue'
											? 'bg-red-600 text-white'
											: 'bg-gray-100 text-black hover:bg-gray-200'
									}`}
								>
									Hôm nay
								</button>
								<button
									onClick={() => selectDeadlineFilter('3days')}
									className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
										filters.headerFilters.deadline === '3days'
											? 'bg-yellow-600 text-white'
											: 'bg-gray-100 text-black hover:bg-gray-200'
									}`}
								>
									3 Ngày
								</button>
								<button
									onClick={() => selectDeadlineFilter('week')}
									className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
										filters.headerFilters.deadline === 'week'
											? 'bg-blue-600 text-white'
											: 'bg-gray-100 text-black hover:bg-gray-200'
									}`}
								>
									1 Tuần
								</button>
							</div>
						</div>
					</div>

					{/* Parameters list */}
					<div className="flex-1 overflow-y-auto p-3 bg-gray-50 pr-0">
						<div className="space-y-2">
							{/* Analysis Section */}
							<div className="mb-1">
								<div
									className={`sidebar-section-header flex items-center justify-between py-2 cursor-pointer ${
										sidebarExpandedSections.analysis ? 'active' : ''
									}`}
									onClick={() => toggleSidebarSection('analysis')}
								>
									<h3 className="text-sm font-bold text-gray-800">CHỈ TIÊU</h3>
									<div className="flex items-center space-x-2 pr-2">
										<span className="sidebar-subtitle text-blue-800">{parametersData.analysis.length}</span>
										<span className="text-gray-500">{sidebarExpandedSections.analysis ? '▼' : '▶'}</span>
									</div>
								</div>
								{sidebarExpandedSections.analysis && (
									<div className="ml-2  pr-2 space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto overflow-x-hidden custom-scrollbar">
										{parametersData.analysis.map((param) => {
											const protocolCode = param.protocol_code || '';
											const normalizedProtocolCode = protocolCode && protocolCode.trim() ? protocolCode : 'null';
											const itemKey = `analysis|${param.parameter_name}|${normalizedProtocolCode}`;
											const isSelected = selectedParameter === itemKey;

											return (
												<div
													key={`${param.parameter_name}-${protocolCode}`}
													className={`sidebar-item py-1 cursor-pointer transition-all duration-200 flex items-center justify-between ${
														isSelected ? 'text-blue-600 font-bold underline' : 'text-gray-700'
													}`}
													onClick={() => selectItem('analysis', param.parameter_name, protocolCode)}
												>
													<div className="flex-1 min-w-0 text-left">
														<p className="text-xs font-medium text-left">
															<span className="text-left">{param.parameter_name}</span>
															{protocolCode && <span className="ml-1 text-left text-gray-500">{protocolCode}</span>}
														</p>
													</div>
													<div className="item-count text-xs font-semibold text-gray-600">{param.total}</div>
												</div>
											);
										})}
										{parametersData.analysis.length === 0 && (
											<div className="text-center py-4 text-gray-500 text-xs">Không có dữ liệu chỉ tiêu</div>
										)}
									</div>
								)}
							</div>

							{/* Sample Section */}
							<div className="mb-1">
								<div
									className={`sidebar-section-header flex items-center justify-between py-2 cursor-pointer ${
										sidebarExpandedSections.sample ? 'active' : ''
									}`}
									onClick={() => toggleSidebarSection('sample')}
								>
									<h3 className="text-sm font-bold text-gray-800">MẪU THỬ</h3>
									<div className="flex items-center space-x-2 pr-2">
										<span className="sidebar-subtitle text-green-800">{parametersData.sample.length}</span>
										<span className="text-gray-500">{sidebarExpandedSections.sample ? '▼' : '▶'}</span>
									</div>
								</div>
								{sidebarExpandedSections.sample && (
									<div className="ml-2 pr-2 space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto overflow-x-hidden custom-scrollbar">
										{parametersData.sample.map((sample) => {
											const itemKey = `sample|${sample.sample_uid}|${sample.sample_name || ''}`;
											const isSelected = selectedParameter === itemKey;

											return (
												<div
													key={sample.sample_uid}
													className={`sidebar-item py-1 cursor-pointer transition-all duration-200 flex items-center justify-between ${
														isSelected ? 'text-green-600 font-bold underline' : 'text-gray-700'
													}`}
													onClick={() => selectItem('sample', sample.sample_uid, null, sample.sample_name)}
												>
													<div className="flex-1 min-w-0 text-left">
														<p className="text-xs font-medium text-left">
															<span className="text-left">{sample.sample_uid}</span>
															{sample.sample_name && (
																<span className="ml-1 text-left text-gray-500">{sample.sample_name}</span>
															)}
														</p>
													</div>
													<div className="item-count text-xs font-semibold text-gray-600">{sample.total}</div>
												</div>
											);
										})}
										{parametersData.sample.length === 0 && (
											<div className="text-center py-4 text-gray-500 text-xs">Không có dữ liệu mẫu thử</div>
										)}
									</div>
								)}
							</div>

							{/* Matrix Section */}
							<div className="mb-1">
								<div
									className={`sidebar-section-header flex items-center justify-between py-2 cursor-pointer ${
										sidebarExpandedSections.matrix ? 'active' : ''
									}`}
									onClick={() => toggleSidebarSection('matrix')}
								>
									<h3 className="text-sm font-bold text-gray-800">NỀN MẪU</h3>
									<div className="flex items-center space-x-2 pr-2">
										<span className="sidebar-subtitle text-orange-800">{parametersData.matrix.length}</span>
										<span className="text-gray-500">{sidebarExpandedSections.matrix ? '▼' : '▶'}</span>
									</div>
								</div>
								{sidebarExpandedSections.matrix && (
									<div className="ml-2 pr-2 space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto overflow-x-hidden custom-scrollbar">
										{parametersData.matrix.map((matrix) => {
											const itemKey = `matrix|${matrix.matrix}`;
											const isSelected = selectedParameter === itemKey;

											return (
												<div
													key={matrix.matrix}
													className={`sidebar-item py-1 cursor-pointer transition-all duration-200 flex items-center justify-between ${
														isSelected ? 'text-orange-600 font-bold underline' : 'text-gray-700'
													}`}
													onClick={() => selectItem('matrix', matrix.matrix)}
												>
													<div className="flex-1 min-w-0 text-left">
														<p className="text-xs font-medium text-left">
															<span className="text-left">{matrix.matrix}</span>
														</p>
													</div>
													<div className="item-count text-xs font-semibold text-gray-600">{matrix.total}</div>
												</div>
											);
										})}
										{parametersData.matrix.length === 0 && (
											<div className="text-center py-4 text-gray-500 text-xs">Không có dữ liệu nền mẫu</div>
										)}
									</div>
								)}
							</div>

							{parametersData.analysis.length === 0 &&
								parametersData.sample.length === 0 &&
								parametersData.matrix.length === 0 &&
								!loading && (
									<div className="text-center py-8 text-gray-500">
										<div className="text-4xl mb-2">🔍</div>
										<p>Không có dữ liệu</p>
									</div>
								)}
						</div>
					</div>
				</div>
			</div>
			{/* Main content */}
			<div className="transition-all w-full min-h-screen bg-white relative flex flex-col">
				{/* Fixed Header with breadcrumb and action buttons */}
				<div className="sticky top-0 z-30 bg-white p-4 shadow-sm">
					<div className="flex justify-between items-center">
						{/* Breadcrumb */}
						<div className="flex items-center space-x-2 font-bold text-sm text-gray-500 cursor-pointer min-w-fit mr-2">
							{sidebarCollapsed && (
								<button
									onClick={toggleSidebarCollapse}
									className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors mr-2"
									onMouseEnter={(e) => showTooltip(e, 'Mở rộng sidebar')}
									onMouseLeave={hideTooltip}
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
							)}
							<span className="hover:underline" onClick={() => onNavigateToLab && onNavigateToLab('analysis')}>
								PHÒNG THỬ NGHIỆM
							</span>
							<span>/</span>
							<span className="text-blue-700 font-bold hover:underline">DANH SÁCH PHÉP THỬ</span>
						</div>

						<div className="flex items-center space-x-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
							{/* Action buttons */}
							<div className="flex items-center space-x-2 flex-shrink-0">
								{/* Selected items indicator */}
								{selectedRows.size > 0 && (
									<div
										className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium border border-yellow-200 cursor-pointer hover:bg-yellow-200 transition-colors"
										onClick={clearAllFilters}
										onMouseEnter={(e) => showTooltip(e, 'Click để xóa tất cả bộ lọc và bỏ chọn')}
										onMouseLeave={hideTooltip}
									>
										<span>{selectedRows.size} mục đã chọn</span>
									</div>
								)}
								{(filters.parameters.length > 0 || Object.keys(filters.headerFilters).length > 0) && (
									<button
										className="px-3 py-2 bg-white border-2 border-gray-400 text-gray-700 rounded-md text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm"
										onClick={clearParameter}
									>
										<span>Xóa bộ lọc</span>
									</button>
								)}

								<button
									className={`px-3 py-2 border-2 rounded-md text-sm font-bold transition-colors shadow-sm ${
										isFilterCreationMode
											? 'bg-blue-500 border-blue-700 text-white hover:bg-blue-600'
											: 'bg-white border-gray-400 text-gray-700 hover:bg-gray-50'
									}`}
									onClick={toggleFilterCreationMode}
								>
									<span>Tạo bộ lọc</span>
								</button>

								<button
									className="px-3 py-2 bg-white border-2 border-gray-400 text-gray-700 rounded-md text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm"
									onClick={openEditor}
								>
									<span>Lập biên bản</span>
								</button>

								{selectedRows.size > 0 && (
									<button
										className="px-3 py-2 bg-green-500 border-2 border-green-700 text-white rounded-md text-sm font-bold hover:bg-green-600 transition-colors shadow-sm"
										onClick={handleBulkEditClick}
									>
										<span>Cập nhật hàng loạt ({selectedRows.size})</span>
									</button>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Scrollable content area */}
				<div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar" ref={scrollContainerRef}>
					<div className="flex-1 p-4 max-h-[calc(100vh-100px)] overflow-auto custom-scrollbar">
						{/* Table container without stretching rows */}
						<div className="w-full">
							<table className="w-full bg-white border-collapse min-w-[1050px] border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
								<thead className="bg-blue-100">
									<tr>
										{filters.columns
											.filter((col) => col !== 'id' && col !== 'sample_name')
											.map((column) => (
												<th
													key={column}
													className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider border-b-2 border-blue-700 hover:bg-blue-200 relative ${
														isFilterCreationMode ? 'cursor-pointer text-blue-600' : 'cursor-pointer text-black'
													}`}
													data-filter-column={column}
													onClick={(e) => handleSort(column, e)}
												>
													<div className="flex items-center justify-between text-left">
														<span
															className={`text-left ${
																isFilterCreationMode
																	? activeFilterColumn === column
																		? 'underline font-bold'
																		: filters.headerFilters[column] ||
																		  (column === 'parameter_name' && filters.parameters.length > 0) ||
																		  (column === 'protocol_code' && filters.protocols.length > 0) ||
																		  (column === 'matrix' && filters.parameters.some((p) => p.includes('matrix|'))) ||
																		  (column === 'sample_uid' && filters.parameters.some((p) => p.includes('sample|'))) ||
																		  (column === 'deadline' && filters.headerFilters.deadline)
																		? 'underline font-black'
																		: 'underline'
																	: filters.headerFilters[column] ||
																	  (column === 'parameter_name' && filters.parameters.length > 0) ||
																	  (column === 'protocol_code' && filters.protocols.length > 0) ||
																	  (column === 'matrix' && filters.parameters.some((p) => p.includes('matrix|'))) ||
																	  (column === 'sample_uid' && filters.parameters.some((p) => p.includes('sample|'))) ||
																	  (column === 'deadline' && filters.headerFilters.deadline)
																	? 'text-blue-600 font-bold underline'
																	: ''
															}`}
														>
															{availableColumns[column] || column}
														</span>
														<div className="flex items-center space-x-1">
															{/* Clear filter button - only show if filter is active */}
															{(filters.headerFilters[column] ||
																(column === 'parameter_name' && filters.parameters.length > 0) ||
																(column === 'protocol_code' && filters.protocols.length > 0) ||
																(column === 'matrix' && filters.parameters.some((p) => p.includes('matrix|'))) ||
																(column === 'sample_uid' && filters.parameters.some((p) => p.includes('sample|'))) ||
																(column === 'deadline' && filters.headerFilters.deadline)) && (
																<button
																	className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full p-1 text-xs leading-none"
																	onClick={(e) => {
																		e.stopPropagation();
																		removeColumnFilter(column);
																	}}
																	title={`Xóa bộ lọc ${availableColumns[column] || column}`}
																>
																	✕
																</button>
															)}
															{!isFilterCreationMode && sortConfig.column === column && (
																<span className="text-blue-600">{sortConfig.direction === 'ASC' ? '↑' : '↓'}</span>
															)}
														</div>
													</div>
													{/* Filter box */}
													{activeFilterColumn === column && <div className="relative" />}
												</th>
											))}
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{data.length === 0 && !loading ? (
										<tr>
											<td colSpan="100" className="text-center py-12 text-gray-500">
												<div className="text-4xl mb-4">📊</div>
												<h3 className="text-lg font-semibold mb-2">Không có dữ liệu</h3>
												<p>Không tìm thấy chỉ tiêu nào với tiêu chí tìm kiếm hiện tại</p>
											</td>
										</tr>
									) : (
										data.map((row, index) => {
											const rowId = String(row.id);
											const isSelected = selectedRows.has(rowId);

											return (
												<tr
													key={row.id}
													className={`cursor-pointer transition-colors ${
														isSelected
															? 'selected-row bg-blue-100 border-l-4 border-blue-500'
															: index % 2 === 0
															? 'bg-white hover:bg-blue-50'
															: 'bg-gray-50 hover:bg-blue-50'
													}`}
													onClick={() => toggleRowSelection(rowId, row)}
													onMouseDown={(e) => handleMouseDown(e, index, rowId, row)}
													onMouseEnter={(e) => handleMouseEnter(e, index, rowId, row)}
													style={{ userSelect: 'none' }}
												>
													{filters.columns
														.filter((col) => col !== 'id' && col !== 'sample_name')
														.map((column) => (
															<td key={column} className="px-2 py-1 text-sm text-gray-900 align-top text-left">
																{column === 'sample_uid' ? (
																	<div className="relative text-left w-full">
																		<span className="text-left">{row.sample_uid || ''}</span>
																		{row.sample_uid && (
																			<span 
																				className="ml-1 inline-flex items-center justify-center w-4 h-4 text-blue-800 border border-gray-400 rounded-full text-xs cursor-help font-bold"
																				onMouseEnter={(e) => showSampleTooltip(e, {
																					sample_uid: row.sample_uid,
																					sample_name: row.sample_name,
																					sample_description: row.sample_description
																				})}
																				onMouseLeave={hideSampleTooltip}
																			>
																				i
																			</span>
																		)}
																	</div>
																) : column === 'protocol_source' ? (
																	<div
																		className="protocol-source-container w-full h-full min-h-[30px] relative"
																		onClick={(e) => e.stopPropagation()}
																	>
																		{editingProtocolSource === row.id ? (
																			<>
																				<select
																					value={row.protocol_source || ''}
																					onChange={(e) => {
																						e.stopPropagation();
																						handleProtocolSourceChange(e.target.value, row.id);
																					}}
																					onMouseDown={(e) => e.stopPropagation()}
																					onFocus={(e) => e.stopPropagation()}
																					onBlur={cancelProtocolSourceEdit}
																					className="w-full h-full text-xs border border-blue-500 rounded px-2 py-1 bg-white text-black text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none relative z-[1000]"
																					onClick={(e) => e.stopPropagation()}
																					autoFocus
																					style={{
																						minHeight: '30px',
																						position: 'relative',
																						zIndex: 1000,
																					}}
																				>
																					<option value="">-- Chọn nguồn --</option>
																					<option value="IRDOP">IRDOP</option>
																					<option value="IRDOP VS">IRDOP VS</option>
																					<option value="EX">EX</option>
																				</select>
																				{/* Custom dropdown arrow */}
																				<div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none z-[999]">
																					<svg
																						className="w-3 h-3 text-gray-400"
																						fill="none"
																						stroke="currentColor"
																						viewBox="0 0 24 24"
																					>
																						<path
																							strokeLinecap="round"
																							strokeLinejoin="round"
																							strokeWidth="2"
																							d="M19 9l-7 7-7-7"
																						/>
																					</svg>
																				</div>
																			</>
																		) : (
																			<div
																				className="w-full h-full min-h-[30px] cursor-pointer hover:bg-blue-50 p-1 rounded text-xs text-black text-left border border-transparent hover:border-blue-200 flex items-center"
																				onClick={(e) => {
																					e.stopPropagation();
																					handleProtocolSourceClick(row.id, row.protocol_source);
																				}}
																				onMouseEnter={(e) => showTooltip(e, 'Nhấp để chỉnh sửa nguồn')}
																				onMouseLeave={hideTooltip}
																			>
																				{row.protocol_source || '--'}
																			</div>
																		)}
																	</div>
																) : column === 'protocol_code' ? (
																	editingCell?.rowId === row.id && editingCell?.column === 'protocol_code' ? (
																		<textarea
																			ref={(el) => {
																				if (el) {
																					// Đặt cursor ở cuối khi textarea được focus
																					setTimeout(() => {
																						el.selectionStart = el.selectionEnd = el.value.length;
																					}, 0);
																				}
																			}}
																			value={editValue}
																			onChange={(e) => setEditValue(e.target.value)}
																			className="w-full h-full min-h-[20px] p-1 border border-blue-500 rounded text-xs bg-white text-black text-left resize-none"
																			autoFocus
																			placeholder="Mã Phương pháp thử"
																			onClick={(e) => e.stopPropagation()}
																			onKeyDown={(e) => {
																				if (e.key === 'Enter' && !e.shiftKey) {
																					e.preventDefault();
																					e.target.blur(); // Chỉ blur, để onBlur xử lý save
																				} else if (e.key === 'Escape') {
																					handleCancelEdit();
																				}
																			}}
																			onBlur={handleSaveEdit}
																		/>
																	) : (
																		<div
																			className="w-full h-full min-h-[30px] cursor-pointer hover:bg-blue-50 p-1 rounded text-xs text-black text-left border border-transparent hover:border-blue-200"
																			onClick={(e) => {
																				e.stopPropagation();
																				handleCellEdit(row.id, 'protocol_code', row.protocol_code);
																			}}
																		>
																			{row.protocol_code || '--'}
																		</div>
																	)
																) : column === 'result_value' ? (
																	<div className="w-full h-full min-h-[30px]" onClick={(e) => e.stopPropagation()}>
																		<div
																			className={`editable-cell border rounded transition-all duration-200 cursor-pointer h-full ${
																				editableCell.analysisId === row.id && editableCell.column === 'result_value'
																					? 'editing-active border-purple-500'
																					: 'border-transparent hover:border-purple-300'
																			}`}
																		>
																			{editableCell.analysisId === row.id && editableCell.column === 'result_value' ? (
																				<div className="relative" data-edit-id={`${row.id}-result_value`}>
																					<TinyMceInput
																						value={inputValue}
																						onUpdate={(content) => handleSaveContentV3(content, 'result_value', row.id)}
																						onKey={handleKeyDownV3}
																						placeholder="Nhập kết quả..."
																					/>
																					{updating && (
																						<div className="absolute top-1 right-1 text-purple-600 save-indicator">
																							<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
																								<path
																									fillRule="evenodd"
																									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																									clipRule="evenodd"
																								/>
																							</svg>
																						</div>
																					)}
																				</div>
																			) : (
																				<div
																					className="w-full h-full p-1 text-xs text-black text-left cursor-pointer hover:bg-blue-50 rounded min-h-[30px] flex items-center group"
																					onClick={(e) => {
																						e.stopPropagation();
																						handleCellClickV3(row.id, 'result_value', row.result_value);
																					}}
																					onMouseEnter={(e) => showTooltip(e, 'Nhấp để chỉnh sửa kết quả')}
																					onMouseLeave={hideTooltip}
																				>
																					{row.result_value ? (
																						<div dangerouslySetInnerHTML={{ __html: row.result_value }} />
																					) : (
																						<span className="result-cell-placeholder group-hover:text-gray-600">
																							Nhấp để nhập kết quả...
																						</span>
																					)}
																					<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
																						<svg
																							className="w-3 h-3 text-purple-500"
																							fill="none"
																							stroke="currentColor"
																							viewBox="0 0 24 24"
																						>
																							<path
																								strokeLinecap="round"
																								strokeLinejoin="round"
																								strokeWidth="2"
																								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
																							/>
																						</svg>
																					</div>
																				</div>
																			)}
																		</div>
																	</div>
																) : column === 'result_unit' ? (
																	<div className="w-full h-full min-h-[30px]" onClick={(e) => e.stopPropagation()}>
																		<div
																			className={`editable-cell border rounded transition-all duration-200 cursor-pointer h-full ${
																				editableCell.analysisId === row.id && editableCell.column === 'result_unit'
																					? 'editing-active border-purple-500'
																					: 'border-transparent hover:border-purple-300'
																			}`}
																		>
																			{editableCell.analysisId === row.id && editableCell.column === 'result_unit' ? (
																				<div className="relative" data-edit-id={`${row.id}-result_unit`}>
																					<TinyMceInput
																						value={inputValue}
																						onUpdate={(content) => handleSaveContentV3(content, 'result_unit', row.id)}
																						onKey={handleKeyDownV3}
																						placeholder="Nhập đơn vị..."
																					/>
																					{updating && (
																						<div className="absolute top-1 right-1 text-purple-600 save-indicator">
																							<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
																								<path
																									fillRule="evenodd"
																									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																									clipRule="evenodd"
																								/>
																							</svg>
																						</div>
																					)}
																				</div>
																			) : (
																				<div
																					className="w-full h-full p-1 text-xs text-black text-left cursor-pointer hover:bg-blue-50 rounded min-h-[30px] flex items-center group"
																					onClick={(e) => {
																						e.stopPropagation();
																						handleCellClickV3(row.id, 'result_unit', row.result_unit);
																					}}
																					onMouseEnter={(e) => showTooltip(e, 'Nhấp để chỉnh sửa đơn vị')}
																					onMouseLeave={hideTooltip}
																				>
																					{row.result_unit ? (
																						<div dangerouslySetInnerHTML={{ __html: row.result_unit }} />
																					) : (
																						<span className="result-cell-placeholder group-hover:text-gray-600">
																							Nhấp để nhập đơn vị...
																						</span>
																					)}
																					<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
																						<svg
																							className="w-3 h-3 text-purple-500"
																							fill="none"
																							stroke="currentColor"
																							viewBox="0 0 24 24"
																						>
																							<path
																								strokeLinecap="round"
																								strokeLinejoin="round"
																								strokeWidth="2"
																								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
																							/>
																						</svg>
																					</div>
																				</div>
																			)}
																		</div>
																	</div>
																) : column === 'doc_id' ? (
																	row.doc_id ? (
																		<span
																			className="text-blue-500 text-lg cursor-pointer p-1 rounded hover:text-blue-700 hover:bg-blue-50"
																			onClick={(e) => {
																				e.stopPropagation();
																				openDocument(row.doc_id);
																			}}
																		>
																			📄
																		</span>
																	) : null
																) : column === 'deadline' ? (
																	formatDate(row.deadline)
																) : (
																	row[column] || ''
																)}
															</td>
														))}
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Pagination */}
					<div className="p-4 pt-2 bg-white border-t border-gray-200 mb-0">
						<div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
							<div className="flex items-center space-x-2">
								<label className="text-sm text-gray-700 font-medium">Số dòng hiển thị:</label>
								<select
									value={itemsPerPage}
									onChange={(e) => {
										const newItemsPerPage = Number(e.target.value);
										setItemsPerPage(newItemsPerPage);
										setCurrentPage(1); // Reset to first page when changing items per page
									}}
									className="border border-gray-300 rounded-md p-2 bg-white text-black focus:ring-2 focus:ring-blue-500"
								>
									<option value={20}>20</option>
									<option value={50}>50</option>
									<option value={100}>100</option>
									<option value={200}>200</option>
									<option value={500}>500</option>
								</select>
								<span className="text-sm text-gray-600 ml-4">
									Hiển thị {startIndex}-{endIndex} / {totalItems} mục
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
			</div>

			{/* Filter Box Portal */}
			{activeFilterColumn &&
				createPortal(
					<div
						className="fixed z-[9999] w-80 bg-white border border-gray-300 rounded-lg shadow-lg filter-dropdown"
						style={{
							top: `${filterPosition.top}px`,
							left: `${filterPosition.left}px`,
						}}
						data-filter-column={activeFilterColumn}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-3">
							{/* Special filters for result_value, deadline, doc_id */}
							{activeFilterColumn === 'result_value' ? (
								<div className="space-y-2">
									<h4 className="text-sm font-semibold text-gray-700 mb-3">Lọc theo kết quả</h4>
									<div className="space-y-2">
										<button
											onClick={() => applySpecialFilter('result_value', 'hasResult')}
											className="w-full text-left p-2 rounded hover:bg-blue-50 border border-gray-200 text-sm"
										>
											Đã có kết quả
										</button>
										<button
											onClick={() => applySpecialFilter('result_value', 'noResult')}
											className="w-full text-left p-2 rounded hover:bg-blue-50 border border-gray-200 text-sm"
										>
											Chưa có kết quả
										</button>
									</div>
									<div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
										<button
											onClick={cancelFilter}
											className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
										>
											Hủy
										</button>
									</div>
								</div>
							) : activeFilterColumn === 'deadline' ? (
								<div className="space-y-2">
									<h4 className="text-sm font-semibold text-gray-700 mb-3">Lọc theo hạn trả</h4>
									<div className="space-y-2">
										<button
											onClick={() => applySpecialFilter('deadline', 'overdue')}
											className="w-full text-left p-2 rounded hover:bg-red-50 border border-gray-200 text-sm text-red-700"
										>
											Quá hạn
										</button>
										<button
											onClick={() => applySpecialFilter('deadline', '3days')}
											className="w-full text-left p-2 rounded hover:bg-yellow-50 border border-gray-200 text-sm text-yellow-700"
										>
											3 ngày
										</button>
										<button
											onClick={() => applySpecialFilter('deadline', 'week')}
											className="w-full text-left p-2 rounded hover:bg-blue-50 border border-gray-200 text-sm text-blue-700"
										>
											7 ngày
										</button>
									</div>
									<div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
										<button
											onClick={cancelFilter}
											className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
										>
											Hủy
										</button>
									</div>
								</div>
							) : activeFilterColumn === 'doc_id' ? (
								<div className="space-y-2">
									<h4 className="text-sm font-semibold text-gray-700 mb-3">Lọc theo tài liệu</h4>
									<div className="space-y-2">
										<button
											onClick={() => applySpecialFilter('doc_id', 'has_file')}
											className="w-full text-left p-2 rounded hover:bg-green-50 border border-gray-200 text-sm text-green-700"
										>
											Đã có tài liệu
										</button>
										<button
											onClick={() => applySpecialFilter('doc_id', 'no_file')}
											className="w-full text-left p-2 rounded hover:bg-red-50 border border-gray-200 text-sm text-red-700"
										>
											Chưa có tài liệu
										</button>
									</div>
									<div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
										<button
											onClick={cancelFilter}
											className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
										>
											Hủy
										</button>
									</div>
								</div>
							) : (
								<>
									{/* Regular filter UI for other columns */}
									<div className="flex items-center space-x-2 mb-3">
										<input
											type="text"
											placeholder={`Tìm kiếm trong ${availableColumns[activeFilterColumn] || activeFilterColumn}...`}
											value={filterSearchTerm}
											onChange={(e) => setFilterSearchTerm(e.target.value)}
											className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
											autoFocus
										/>
									</div>

									{/* Select All / Unselect All */}
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
									<div className="max-h-60 overflow-y-auto">
										{filterLoading ? (
											<div className="p-4 text-center text-gray-500">
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
												Đang tải...
											</div>
										) : filterResults.length === 0 ? (
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
														<span className="flex-1 text-sm text-black">{result.value || '(Trống)'}</span>
														<span className="text-xs text-gray-500 flex-shrink-0">({result.count})</span>
													</label>
												))}
											</div>
										)}
									</div>

									{/* Action buttons */}
									<div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
										<button
											onClick={cancelFilter}
											className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
										>
											Hủy
										</button>
										<button
											onClick={applyFilter}
											disabled={selectedFilterValues.length === 0}
											className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Xác nhận ({selectedFilterValues.length})
										</button>
									</div>
								</>
							)}
						</div>
					</div>,
					document.body,
				)}

			{/* Toast Container */}
			<ToastContainer
				position="top-right"
				autoClose={500}
				hideProgressBar={true}
				newestOnTop={true}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss={false}
				draggable={false}
				pauseOnHover={false}
				style={{ zIndex: 9999 }}
			/>

			{/* LabBulkUpdate Component */}
			<LabBulkUpdate
				isOpen={showBulkEditBox}
				onClose={() => setShowBulkEditBox(false)}
				selectedRows={selectedRows}
				selectedData={Array.from(selectedRows)
					.map((rowId) => selectedRowsData.get(rowId))
					.filter(Boolean)}
				technicians={technicians}
				onUpdateComplete={handleBulkUpdateComplete}
				updating={updating}
				setUpdating={setUpdating}
			/>

			{/* Custom Tooltip Portal */}
			{tooltip.visible &&
				createPortal(
					<div
						className={`custom-tooltip ${tooltip.visible ? 'visible' : ''}`}
						style={{
							left: `${tooltip.x}px`,
							top: `${tooltip.y}px`,
						}}
					>
						{tooltip.content}
					</div>,
					document.body,
				)}

			{/* Sample Tooltip Portal */}
			{sampleTooltip.visible &&
				createPortal(
					<div
						className={`sample-tooltip ${sampleTooltip.visible ? 'visible' : ''}`}
						style={{
							left: `${sampleTooltip.x}px`,
							top: `${sampleTooltip.y}px`,
						}}
					>
						{sampleTooltip.content && (
							<div className="text-left">
								<div><strong>Mã mẫu:</strong> {sampleTooltip.content.sample_uid}</div>
								<div><strong>Tên mẫu:</strong> {sampleTooltip.content.sample_name || 'Không có'}</div>
								<div><strong>Mô tả:</strong> {sampleTooltip.content.sample_description || 'Không có'}</div>
							</div>
						)}
					</div>,
					document.body,
				)}

			{/* Document Preview Modal */}
			{documentPreview.visible && (
				<div className="document-preview-modal" onClick={(e) => {
					if (e.target === e.currentTarget) {
						closeDocumentPreview();
					}
				}}>
					<div className="document-preview-content" onClick={(e) => e.stopPropagation()}>
						<div className="document-preview-header">
							<h3 className="text-lg font-semibold flex-1">
								Xem tài liệu {documentPreview.docId && `- ${documentPreview.docId}`}
							</h3>
							<button 
								onClick={closeDocumentPreview}
								className="close-button"
							>
								✕ Đóng
							</button>
						</div>
						<div className="document-preview-body">
							{documentPreview.loading ? (
								<div className="loading-spinner">
									<div className="spinner"></div>
									Đang tải tài liệu...
								</div>
							) : (
								<iframe
									className="document-preview-iframe"
									srcDoc={documentPreview.content}
									title="Document Preview"
									sandbox="allow-same-origin allow-scripts"
								/>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProcessingAnalysis;
