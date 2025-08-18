import React, { useState, useContext, useEffect, useRef } from 'react';
import parse from 'html-react-parser';
import { GlobalContext } from '../../contexts/GlobalContext';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import TinyMceInput from '../Input';
import { toast, ToastContainer } from 'react-toastify';
import { FaSearch } from 'react-icons/fa';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import LabBulkUpdate from './LabBulkUpdate';

// Custom CSS for enhanced UI - optimized with Tailwind
const customStyles = `
/* Essential scrollbar styling */
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

/* Enhanced editing styles like ProcessingAnalysis - optimized for performance */
.editable-cell {
	transition: background-color 0.15s ease;
	will-change: background-color;
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

/* Protocol source select styling like ProcessingAnalysis */
.protocol-source-select {
	position: relative;
	z-index: 1;
	overflow: visible !important;
}

.protocol-source-select select {
	appearance: none;
	-webkit-appearance: none;
	-moz-appearance: none;
	background-image: none;
	cursor: pointer;
	background-color: white !important;
	position: relative;
	z-index: 10;
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

.result-cell {
	transition: background-color 0.15s ease;
	min-height: 32px;
	min-width: 32px;
	display: flex;
	align-items: center;
	will-change: background-color;
}

.result-cell:hover {
	background-color: #f0f8ff !important;
	border-color: #3b82f6 !important;
	box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.unit-cell {
	transition: background-color 0.15s ease;
	min-height: 32px;
	min-width: 32px;
	display: flex;
	align-items: center;
	will-change: background-color;
}
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
	transition: box-shadow 0.2s ease, border-color 0.2s ease;
	will-change: box-shadow, border-color;
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
	transition: border-color 0.15s ease, box-shadow 0.15s ease;
	will-change: border-color, box-shadow;
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
	transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
	box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
	will-change: background, box-shadow, transform;
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
	transition: background 0.15s ease, transform 0.15s ease;
	will-change: background, transform;
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
	transition: border-color 0.15s ease, box-shadow 0.15s ease;
	font-size: 0.875rem;
	will-change: border-color, box-shadow;
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
	transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
	cursor: pointer;
	will-change: background, border-color, transform;
}
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

/* Performance optimizations for table */
.processing-table {
	table-layout: fixed;
	width: 100%;
}

.processing-table td {
	contain: layout style paint;
}

.processing-table tr:hover {
	background-color: #f9fafb;
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

/* Performance optimized table */
.processing-table {
	table-layout: fixed;
	width: 100%;
}

.processing-table td {
	contain: layout style paint;
}

/* Thin scrollbar for overflow elements */
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

/* Document preview modal styles */
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

const ProcessingSample = ({ onNavigateToLab }) => {
	const { setCurrentTitlePage, status, currentUser, technicians, formatDate } = useContext(GlobalContext);
	const location = useLocation();
	const navigate = useNavigate();

	// State management - updated to match ProcessingAnalysis structure
	const [processingSample, setProcessingSample] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(20);
	const [totalItems, setTotalItems] = useState(0);
	const [totalPages, setTotalPages] = useState(1);

	// Selection states
	const [selectedAnalysisIds, setSelectedAnalysisIds] = useState(new Set());
	const [showBulkEdit, setShowBulkEdit] = useState(false);

	// Drag selection states
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartId, setDragStartId] = useState(null);

	// Loading and scroll states
	const [scrollPosition, setScrollPosition] = useState(0);
	const [isInitialLoad, setIsInitialLoad] = useState(true);

	// Editing states - enhanced to match ProcessingAnalysis
	const [editableCell, setEditableCell] = useState({ analysisId: null, column: null });
	const [inputValue, setInputValue] = useState('');
	const [editingProtocolSource, setEditingProtocolSource] = useState(null);
	const [editingProtocolCode, setEditingProtocolCode] = useState(null);
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
	const [isLoadingFilter, setIsLoadingFilter] = useState(false);

	// Enhanced editing states like ProcessingAnalysis
	const [editingCell, setEditingCell] = useState(null);
	const [editValue, setEditValue] = useState('');

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

	// Document preview states
	const [documentPreview, setDocumentPreview] = useState({
		visible: false,
		content: '',
		loading: false,
		docId: null,
	});

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

	// Function to fetch matrix options from API - removed unused function

	// Fetch sample data with new API endpoint
	const fetchSampleData = async (preserveScroll = false, overrideFilters = null) => {
		if (isApiCallInProgress) return;

		// Reduce rate limiting for pagination and filter changes
		const currentTime = Date.now();
		const lastCallTime = window._lastFetchTime || 0;
		// Only apply rate limiting for auto-refresh calls, not for user interactions
		if (!preserveScroll && !overrideFilters && currentTime - lastCallTime < 500) return;
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

			// Use override filters if provided, otherwise use current filters
			const currentFilters = overrideFilters || filters;

			// Prepare request body based on new API structure
			const requestBody = {
				itemsPerPage: itemsPerPage || 100,
				page: currentPage || 1,
				columnSort: currentFilters.columnSort || queryParams.get('ps_columnSort') || 'sample_uid',
				sortBy: currentFilters.sortBy || queryParams.get('ps_sortBy') || 'ASC',
			};

			// Add filters from current filters first
			if (currentFilters.parameters && currentFilters.parameters.length > 0) {
				requestBody.parameter_name = [...currentFilters.parameters];
			}

			if (currentFilters.protocols && currentFilters.protocols.length > 0) {
				requestBody.protocol_code = [...currentFilters.protocols];
			}

			// Only read from query params if overrideFilters is not provided
			if (!overrideFilters) {
				// Read directly from query params to ensure we have latest data
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

				if (queryParams.has('ps_doc_id')) {
					const docIds = queryParams
						.get('ps_doc_id')
						.split(',')
						.filter((s) => s.trim());
					if (docIds.length > 0) {
						requestBody.doc_id = docIds;
					}
				}
			}

			// Add header filters from current filters (fallback) - exclude status as it's handled separately
			Object.keys(currentFilters.headerFilters || {}).forEach((column) => {
				// Skip status column as it's handled separately
				if (column === 'status') return;

				const filterValue = currentFilters.headerFilters[column];

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
				} else if (column === 'doc_id' && filterValue) {
					// Handle doc_id filter
					if (!requestBody.doc_id) {
						requestBody.doc_id = [];
						const values = Array.isArray(filterValue)
							? filterValue
							: filterValue
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s);
						requestBody.doc_id = values;
					}
				}
			});

			// Handle urgent filter - prioritize override filters when available
			// This ensures we get the most current filter state and avoid race conditions
			const hasUrgentFromFilters = currentFilters.headerFilters && currentFilters.headerFilters.status === 1;
			const hasUrgentFromQuery = queryParams.has('ps_urgent') || queryParams.has('ps_status');

			if (overrideFilters) {
				// When overrideFilters provided, use ONLY that source (most reliable)
				if (hasUrgentFromFilters) {
					requestBody.status = 1;
					console.log('✅ Setting requestBody.status = 1 (from override filters)');
				} else {
					console.log('🔄 No urgent status in override filters, not setting status');
				}
			} else {
				// Fallback to reading from filters + query params (for initial loads)
				if (hasUrgentFromFilters) {
					requestBody.status = 1;
					console.log('✅ Setting requestBody.status = 1 (from current filters)');
				} else if (hasUrgentFromQuery) {
					const urgentValue = queryParams.get('ps_urgent') || queryParams.get('ps_status');
					console.log('🚨 Found urgent status in query params:', urgentValue);
					if (urgentValue === '1') {
						requestBody.status = 1;
						console.log('✅ Setting requestBody.status = 1 (from query params)');
					}
				} else {
					console.log('🔄 No urgent status found, not setting status in request body');
				}
			}

			// Handle done filter (đủ kết quả)
			const hasDoneFromFilters = currentFilters.headerFilters && currentFilters.headerFilters.done === true;
			const hasDoneFromQuery = queryParams.has('ps_done');

			if (overrideFilters) {
				if (hasDoneFromFilters) {
					requestBody.done = true;
					console.log('✅ Setting requestBody.done = true (from override filters)');
				}
			} else {
				if (hasDoneFromFilters) {
					requestBody.done = true;
					console.log('✅ Setting requestBody.done = true (from current filters)');
				} else if (hasDoneFromQuery) {
					const doneValue = queryParams.get('ps_done');
					if (doneValue === 'true') {
						requestBody.done = true;
						console.log('✅ Setting requestBody.done = true (from query params)');
					}
				}
			}

			// Handle overdue filter (trong ngày)
			const hasOverdueFromFilters = currentFilters.headerFilters && currentFilters.headerFilters.overdue === true;
			const hasOverdueFromQuery = queryParams.has('ps_overdue');

			if (overrideFilters) {
				if (hasOverdueFromFilters) {
					requestBody.overdue = true;
					console.log('✅ Setting requestBody.overdue = true (from override filters)');
				}
			} else {
				if (hasOverdueFromFilters) {
					requestBody.overdue = true;
					console.log('✅ Setting requestBody.overdue = true (from current filters)');
				} else if (hasOverdueFromQuery) {
					const overdueValue = queryParams.get('ps_overdue');
					if (overdueValue === 'true') {
						requestBody.overdue = true;
						console.log('✅ Setting requestBody.overdue = true (from query params)');
					}
				}
			}

			// Debug log to verify request body
			console.log('🔍 API Request Body:', requestBody);

			const response = await apiPost('https://black.irdop.org/v1/sample/processing/list', requestBody);

			if (response?.status < 300 && response?.data) {
				const result = response.data;

				if (result.result && Array.isArray(result.result)) {
					setProcessingSample(result.result);

					// Update pagination from API response only if different to avoid loops
					if (result.pagination) {
						// Only update totalItems and totalPages, don't override user-set currentPage/itemsPerPage
						if (result.pagination.totalItems !== totalItems) {
							setTotalItems(result.pagination.totalItems);
						}
						if (result.pagination.totalPages !== totalPages) {
							setTotalPages(result.pagination.totalPages);
						}
						// Only update currentPage if we're on initial load or if API returned a different page
						if (isInitialLoad && result.pagination.currentPage !== currentPage) {
							setCurrentPage(result.pagination.currentPage);
						}
						// Only update itemsPerPage if we're on initial load or if API returned a different value
						if (isInitialLoad && result.pagination.itemsPerPage !== itemsPerPage) {
							setItemsPerPage(result.pagination.itemsPerPage);
						}
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

			// Only set isInitialLoad to false after the first successful load
			if (isInitialLoad) {
				setIsInitialLoad(false);
			}

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

	// Get grouped data for display - fixed to use all data since API handles pagination
	const groupedSampleData = getGroupedSampleData();

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
	};

	// Pagination calculations - API handles pagination, so use API response data directly
	const totalReceipts = totalItems > 0 ? totalItems : processingSample ? processingSample.length : 0;
	const startReceiptIndex = (currentPage - 1) * itemsPerPage + 1;
	const endReceiptIndex = Math.min(currentPage * itemsPerPage, totalReceipts);

	// Use all data from API response since API already handles pagination
	const groupedSampleDataForPage = groupedSampleData;

	// Enhanced cell editing like ProcessingAnalysis with auto-save
	const openEditorWithAutoSave = async (analysisId, column, currentValue) => {
		// Auto-save current editing cell if exists
		if (editableCell.analysisId && editableCell.analysisId !== analysisId) {
			try {
				await handleSaveContentV3(inputValue, editableCell.column, editableCell.analysisId);
			} catch (error) {
				console.error('Error auto-saving previous cell:', error);
			}
		}

		// Set new editing cell
		setEditableCell({ analysisId, column });
		setInputValue(currentValue || '');
	};

	const handleCellClickV3 = (analysisId, column, currentValue) => {
		openEditorWithAutoSave(analysisId, column, currentValue);
	};

	// Enhanced save content with better feedback like ProcessingAnalysis
	const handleSaveContentV3 = async (content, column, analysisId) => {
		if (!editableCell.analysisId || editableCell.column !== column) return;

		try {
			// Helper function to remove <p> tags
			const cleanContent = (str) => {
				if (!str) return str;
				return str.replace(/^<p>/, '').replace(/<\/p>$/, '');
			};

			// Helper function to normalize content for comparison
			const normalizeContent = (content) => {
				if (!content) return '';
				return content.toString().trim().replace(/\s+/g, ' ');
			};

			// Get original value for comparison from grouped data for current page
			let originalValue = '';
			groupedSampleDataForPage.forEach((group) => {
				const currentAnalysis = group.analyses.find((item) => item.id === analysisId);
				if (currentAnalysis) {
					originalValue = currentAnalysis[column] || '';
				}
			});

			// Clean and normalize both values for comparison
			let cleanedContent = content;
			let cleanedOriginal = originalValue;

			if (column === 'result_value' || column === 'result_unit') {
				cleanedContent = cleanContent(content);
				cleanedOriginal = cleanContent(originalValue);
			}

			// Normalize for final comparison
			const normalizedNew = normalizeContent(cleanedContent);
			const normalizedOriginal = normalizeContent(cleanedOriginal);

			// Only proceed if there's actual change
			if (normalizedNew === normalizedOriginal) {
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

			// Show saving indicator
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', body);

			if (response?.status === 200) {
				// Success notification like ProcessingAnalysis
				showSuccessNotification('Cập nhật thành công');

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
				showErrorNotification('Cập nhật thất bại');
			}
		} catch (error) {
			console.error('Error updating analysis:', error);
			showErrorNotification('Lỗi khi cập nhật');
		} finally {
			setEditableCell({ analysisId: null, column: null });
		}
	};

	// Enhanced notification functions like ProcessingAnalysis
	const showSuccessNotification = (message) => {
		toast.success(message, {
			position: 'top-right',
			autoClose: 1000,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: true,
			draggable: true,
		});
	};

	const showErrorNotification = (message) => {
		toast.error(message, {
			position: 'top-right',
			autoClose: 3000,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: true,
			draggable: true,
		});
	};

	const handleKeyDownV3 = (e) => {
		if (e.key === 'Enter') {
			setEditableCell({ analysisId: null, column: null });
		}
	};

	// Enhanced protocol source handling like ProcessingAnalysis
	const handleProtocolSourceChange = async (value, analysisId) => {
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

			if (response?.status === 200) {
				showSuccessNotification('Cập nhật nguồn thành công');
				// Background refresh
				setTimeout(() => {
					fetchSampleData(true);
				}, 1000);
			} else {
				throw new Error('Failed to update protocol source');
			}
		} catch (error) {
			console.error('Error updating protocol source:', error);
			showErrorNotification('Lỗi khi cập nhật nguồn');
		}
	};

	// Handle protocol source click to edit - enhanced like ProcessingAnalysis
	const handleProtocolSourceClick = (analysisId, currentValue) => {
		// Auto-save current editing cell if exists
		if (editableCell.analysisId && editableCell.analysisId !== analysisId) {
			handleSaveContentV3(inputValue, editableCell.column, editableCell.analysisId);
		}

		setEditingProtocolSource(analysisId);
		setInputValue(currentValue || '');
	};

	// Handle protocol source blur - enhanced like ProcessingAnalysis
	const handleProtocolSourceBlur = async (analysisId, newValue, originalValue) => {
		setEditingProtocolSource(null);
		if (newValue !== originalValue) {
			await handleProtocolSourceChange(newValue, analysisId);
		}
	};

	// Handle protocol code click to edit - enhanced like ProcessingAnalysis
	const handleProtocolCodeClick = (analysisId, currentValue) => {
		// Auto-save current editing cell if exists
		if (editableCell.analysisId && editableCell.analysisId !== analysisId) {
			handleSaveContentV3(inputValue, editableCell.column, editableCell.analysisId);
		}

		setEditingProtocolCode(analysisId);
		setInputValue(currentValue || '');
	};

	// Handle protocol code blur - enhanced like ProcessingAnalysis
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

				if (response?.status === 200) {
					showSuccessNotification('Cập nhật phương pháp thành công');
					// Background refresh
					setTimeout(() => {
						fetchSampleData(true);
					}, 1000);
				} else {
					throw new Error('Failed to update protocol code');
				}
			} catch (error) {
				console.error('Error updating protocol_code:', error);
				showErrorNotification('Có lỗi xảy ra khi cập nhật phương pháp');
			}
		}
	};

	// Handle checkbox selections - removed unused handlers

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
			setSelectedAnalysisIds(new Set());
			setShowBulkEdit(false);
		});
	};

	const clearSelection = () => {
		setSelectedAnalysisIds(new Set());
		setShowBulkEdit(false);
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
			console.log('🔄 Current filters.headerFilters.status:', newFilters.headerFilters.status);

			if (newFilters.headerFilters.status === 1) {
				// Remove urgent filter
				delete newFilters.headerFilters.status;
				console.log('❌ Removing urgent filter from state');
				toast.info('Đã tắt bộ lọc mẫu khẩn');
			} else {
				// Add urgent filter
				newFilters.headerFilters.status = 1;
				console.log('✅ Adding urgent filter to state');
				toast.info('Đã bật bộ lọc mẫu khẩn');
			}

			console.log('📝 New filters.headerFilters:', newFilters.headerFilters);
			setFilters(newFilters);
			updateQueryParams(newFilters);
		} else if (filterType === 'done') {
			const newFilters = { ...filters };

			if (newFilters.headerFilters.done === true) {
				// Remove done filter
				delete newFilters.headerFilters.done;
				toast.info('Đã tắt bộ lọc đủ kết quả');
			} else {
				// Add done filter
				newFilters.headerFilters.done = true;
				toast.info('Đã bật bộ lọc đủ kết quả');
			}

			setFilters(newFilters);
			updateQueryParams(newFilters);
		} else if (filterType === 'today') {
			const newFilters = { ...filters };

			if (newFilters.headerFilters.overdue === true) {
				// Remove today filter (overdue=true means today)
				delete newFilters.headerFilters.overdue;
				toast.info('Đã tắt bộ lọc trong ngày');
			} else {
				// Add today filter
				newFilters.headerFilters.overdue = true;
				toast.info('Đã bật bộ lọc trong ngày');
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
			columnSort: '',
			sortBy: '',
		};
		setFilters(newFilters);
		setIsFilterCreationMode(false);
		setActiveFilterColumn(null);
		setFilterResults([]);

		// Xóa tất cả query params processing sample
		const queryParams = new URLSearchParams(location.search);
		[
			'ps_sample_uid',
			'ps_parameter_name',
			'ps_protocol_source',
			'ps_protocol_code',
			'ps_matrix',
			'ps_status',
			'ps_deadline',
			'ps_technician_uid',
			'ps_result_value',
			'ps_done',
			'ps_overdue',
			'ps_columnSort',
			'ps_sortBy',
			'ps_filter',
			'ps_page',
			'ps_itemsPerPage',
			'ps_doc_id',
		].forEach((param) => {
			queryParams.delete(param);
		});

		// Update URL without any processing sample params
		const newUrl = queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname;
		navigate(newUrl, { replace: true });

		// Reset pagination to first page
		setCurrentPage(1);

		// Gọi lại API với filters đã được reset
		fetchSampleData(false, newFilters);

		toast.info('Đã xóa tất cả bộ lọc');
	};

	const cancelSelection = () => {
		setSelectedAnalysisIds(new Set());
		setShowBulkEdit(false);
	};

	const handleBulkEditClick = () => {
		setShowBulkEdit(true);
	};

	// Check if there are selected samples
	const hasSelectedSamples = selectedAnalysisIds.size > 0;

	// Document preview handler
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

	// Column filter handlers
	const handleColumnFilter = async (columnName) => {
		setActiveFilterColumn(columnName);
		setIsLoadingFilter(true);
		setFilterResults([]);
		setSelectedFilterValues([]);
		setFilterSearchTerm('');

		try {
			// Prepare request body with current filters
			const requestBody = {
				filterColumn: columnName,
				searchTerm: '',
				itemsPerPage: 50,
				page: 1,
			};

			// Add current filters to request body
			const queryParams = new URLSearchParams(location.search);

			// Add sample_uid filter if exists
			if (queryParams.has('ps_sample_uid')) {
				const sampleUids = queryParams
					.get('ps_sample_uid')
					.split(',')
					.filter((s) => s.trim());
				if (sampleUids.length > 0) {
					requestBody.sample_uid = sampleUids;
				}
			}

			// Add parameter_name filter if exists
			if (queryParams.has('ps_parameter_name')) {
				const paramNames = queryParams
					.get('ps_parameter_name')
					.split(',')
					.filter((s) => s.trim());
				if (paramNames.length > 0) {
					requestBody.parameter_name = paramNames;
				}
			}

			// Add protocol_source filter if exists
			if (queryParams.has('ps_protocol_source')) {
				const protocolSources = queryParams
					.get('ps_protocol_source')
					.split(',')
					.filter((s) => s.trim());
				if (protocolSources.length > 0) {
					requestBody.protocol_source = protocolSources;
				}
			}

			// Add protocol_code filter if exists
			if (queryParams.has('ps_protocol_code')) {
				const protocolCodes = queryParams
					.get('ps_protocol_code')
					.split(',')
					.filter((s) => s.trim());
				if (protocolCodes.length > 0) {
					requestBody.protocol_code = protocolCodes;
				}
			}

			// Add matrix filter if exists
			if (queryParams.has('ps_matrix')) {
				const matrices = queryParams
					.get('ps_matrix')
					.split(',')
					.filter((s) => s.trim());
				if (matrices.length > 0) {
					requestBody.matrix = matrices;
				}
			}

			// Add technician_uid filter if exists
			if (queryParams.has('ps_technician_uid')) {
				const technicianUids = queryParams
					.get('ps_technician_uid')
					.split(',')
					.filter((s) => s.trim());
				if (technicianUids.length > 0) {
					requestBody.technician_uid = technicianUids;
				}
			}

			// Add status filter if exists
			if (queryParams.has('ps_status')) {
				const status = queryParams.get('ps_status');
				if (status === '1') {
					requestBody.status = 1;
				}
			}

			// Add done filter if exists
			if (queryParams.has('ps_done')) {
				const doneValue = queryParams.get('ps_done');
				if (doneValue === 'true') {
					requestBody.done = true;
				}
			}

			// Add overdue filter if exists
			if (queryParams.has('ps_overdue')) {
				const overdueValue = queryParams.get('ps_overdue');
				if (overdueValue === 'true') {
					requestBody.overdue = true;
				}
			}

			// Add deadline filter if exists
			if (queryParams.has('ps_deadline')) {
				const deadline = queryParams.get('ps_deadline');
				if (deadline) {
					requestBody.deadline = deadline;
				}
			}

			// Add doc_id filter if exists
			if (queryParams.has('ps_doc_id')) {
				const docIds = queryParams
					.get('ps_doc_id')
					.split(',')
					.filter((s) => s.trim());
				if (docIds.length > 0) {
					requestBody.doc_id = docIds;
				}
			}

			const response = await apiPost('https://black.irdop.org/v1/processing/search_filter_column', requestBody);

			if (response?.status < 300 && response?.data?.result) {
				let formattedResults = [];

				if (columnName === 'doc_id') {
					// Special handling for doc_id column - predefined options
					formattedResults = [
						{ value: 'none', count: 0, label: 'none' },
						{ value: 'pending', count: 0, label: 'pending' },
						{ value: 'published', count: 0, label: 'published' }
					];
				} else if (columnName === 'technician_uid') {
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
			// Prepare request body with current filters
			const requestBody = {
				filterColumn: activeFilterColumn,
				searchTerm: searchTerm,
				itemsPerPage: 50,
				page: 1,
			};

			// Add current filters to request body
			const queryParams = new URLSearchParams(location.search);

			// Add sample_uid filter if exists
			if (queryParams.has('ps_sample_uid')) {
				const sampleUids = queryParams
					.get('ps_sample_uid')
					.split(',')
					.filter((s) => s.trim());
				if (sampleUids.length > 0) {
					requestBody.sample_uid = sampleUids;
				}
			}

			// Add parameter_name filter if exists
			if (queryParams.has('ps_parameter_name')) {
				const paramNames = queryParams
					.get('ps_parameter_name')
					.split(',')
					.filter((s) => s.trim());
				if (paramNames.length > 0) {
					requestBody.parameter_name = paramNames;
				}
			}

			// Add protocol_source filter if exists
			if (queryParams.has('ps_protocol_source')) {
				const protocolSources = queryParams
					.get('ps_protocol_source')
					.split(',')
					.filter((s) => s.trim());
				if (protocolSources.length > 0) {
					requestBody.protocol_source = protocolSources;
				}
			}

			// Add protocol_code filter if exists
			if (queryParams.has('ps_protocol_code')) {
				const protocolCodes = queryParams
					.get('ps_protocol_code')
					.split(',')
					.filter((s) => s.trim());
				if (protocolCodes.length > 0) {
					requestBody.protocol_code = protocolCodes;
				}
			}

			// Add matrix filter if exists
			if (queryParams.has('ps_matrix')) {
				const matrices = queryParams
					.get('ps_matrix')
					.split(',')
					.filter((s) => s.trim());
				if (matrices.length > 0) {
					requestBody.matrix = matrices;
				}
			}

			// Add technician_uid filter if exists
			if (queryParams.has('ps_technician_uid')) {
				const technicianUids = queryParams
					.get('ps_technician_uid')
					.split(',')
					.filter((s) => s.trim());
				if (technicianUids.length > 0) {
					requestBody.technician_uid = technicianUids;
				}
			}

			// Add status filter if exists
			if (queryParams.has('ps_status')) {
				const status = queryParams.get('ps_status');
				if (status === '1') {
					requestBody.status = 1;
				}
			}

			// Add done filter if exists
			if (queryParams.has('ps_done')) {
				const doneValue = queryParams.get('ps_done');
				if (doneValue === 'true') {
					requestBody.done = true;
				}
			}

			// Add overdue filter if exists
			if (queryParams.has('ps_overdue')) {
				const overdueValue = queryParams.get('ps_overdue');
				if (overdueValue === 'true') {
					requestBody.overdue = true;
				}
			}

			// Add deadline filter if exists
			if (queryParams.has('ps_deadline')) {
				const deadline = queryParams.get('ps_deadline');
				if (deadline) {
					requestBody.deadline = deadline;
				}
			}

			// Add doc_id filter if exists
			if (queryParams.has('ps_doc_id')) {
				const docIds = queryParams
					.get('ps_doc_id')
					.split(',')
					.filter((s) => s.trim());
				if (docIds.length > 0) {
					requestBody.doc_id = docIds;
				}
			}

			const response = await apiPost('https://black.irdop.org/v1/processing/search_filter_column', requestBody);

			if (response?.status < 300 && response?.data?.result) {
				let formattedResults = [];

				if (activeFilterColumn === 'doc_id') {
					// Special handling for doc_id column - predefined options, no search needed
					formattedResults = [
						{ value: 'none', count: 0, label: 'none' },
						{ value: 'pending', count: 0, label: 'pending' },
						{ value: 'published', count: 0, label: 'published' }
					];
				} else if (activeFilterColumn === 'technician_uid') {
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

	// Update URL query params when filters change - add/replace only processing sample params
	const updateQueryParams = (newFilters) => {
		const queryParams = new URLSearchParams(location.search);

		// Remove only existing processing sample filter params (to replace them)
		[
			'ps_sample_uid',
			'ps_parameter_name',
			'ps_protocol_source',
			'ps_protocol_code',
			'ps_matrix',
			'ps_status',
			'ps_deadline',
			'ps_technician_uid',
			'ps_result_value',
			'ps_done',
			'ps_overdue',
			'ps_columnSort',
			'ps_sortBy',
			'ps_filter',
			'ps_page',
			'ps_itemsPerPage',
			'ps_doc_id',
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
				console.log('🔗 Setting ps_status=1 in query params');
				queryParams.set('ps_status', '1');
			} else if (column === 'done' && value === true) {
				console.log('🔗 Setting ps_done=true in query params');
				queryParams.set('ps_done', 'true');
			} else if (column === 'overdue' && value === true) {
				console.log('🔗 Setting ps_overdue=true in query params');
				queryParams.set('ps_overdue', 'true');
			} else if (Array.isArray(value) && value.length > 0) {
				queryParams.set(`ps_${column}`, value.join(','));
			} else if (value && !Array.isArray(value)) {
				queryParams.set(`ps_${column}`, value);
			}
		});

		// Log if status was NOT found in headerFilters
		if (!newFilters.headerFilters.hasOwnProperty('status')) {
			console.log('🗑️ Status not found in headerFilters, ps_status should be removed from URL');
		}

		// Add sorting parameters
		if (newFilters.columnSort) {
			queryParams.set('ps_columnSort', newFilters.columnSort);
		}
		if (newFilters.sortBy) {
			queryParams.set('ps_sortBy', newFilters.sortBy);
		}

		// Add pagination parameters
		if (currentPage > 1) {
			queryParams.set('ps_page', currentPage.toString());
		}
		if (itemsPerPage !== 100) {
			queryParams.set('ps_itemsPerPage', itemsPerPage.toString());
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
						: activeFilterColumn === 'doc_id'
						? 'Doc'
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

	// Pagination handlers - improved to ensure data loads correctly
	const handleItemsPerPageChange = (newItemsPerPage) => {
		setItemsPerPage(newItemsPerPage);
		setCurrentPage(1); // Reset to first page when changing items per page
		// Force API call after state update
		setTimeout(() => {
			fetchSampleData(false, filters);
		}, 50);
	};

	const handlePreviousPage = () => {
		if (currentPage > 1) {
			const newPage = currentPage - 1;
			setCurrentPage(newPage);
			// Force API call after state update
			setTimeout(() => {
				fetchSampleData(false, filters);
			}, 50);
		}
	};

	const handleNextPage = () => {
		if (currentPage < totalPages) {
			const newPage = currentPage + 1;
			setCurrentPage(newPage);
			// Force API call after state update
			setTimeout(() => {
				fetchSampleData(false, filters);
			}, 50);
		}
	};

	// Initial data load on component mount
	useEffect(() => {
		setCurrentTitlePage('Mẫu đang xử lý');

		// 1. Check query params first
		const queryParams = new URLSearchParams(location.search);
		const newFilters = { ...filters };
		let hasFilterParams = false;

		// Read filter parameters from URL with namespace prefix 'ps_'
		if (queryParams.has('ps_sample_uid')) {
			newFilters.headerFilters.sample_uid = queryParams
				.get('ps_sample_uid')
				.split(',')
				.filter((s) => s.trim());
			hasFilterParams = true;
		}
		if (queryParams.has('ps_parameter_name')) {
			newFilters.headerFilters.parameter_name = queryParams
				.get('ps_parameter_name')
				.split(',')
				.filter((s) => s.trim());
			hasFilterParams = true;
		}
		if (queryParams.has('ps_protocol_source')) {
			newFilters.headerFilters.protocol_source = queryParams
				.get('ps_protocol_source')
				.split(',')
				.filter((s) => s.trim());
			hasFilterParams = true;
		}
		if (queryParams.has('ps_protocol_code')) {
			newFilters.headerFilters.protocol_code = queryParams
				.get('ps_protocol_code')
				.split(',')
				.filter((s) => s.trim());
			hasFilterParams = true;
		}
		if (queryParams.has('ps_matrix')) {
			newFilters.headerFilters.matrix = queryParams
				.get('ps_matrix')
				.split(',')
				.filter((s) => s.trim());
			hasFilterParams = true;
		}
		if (queryParams.has('ps_deadline')) {
			newFilters.headerFilters.deadline = queryParams.get('ps_deadline');
			hasFilterParams = true;
		}
		if (queryParams.has('ps_technician_uid')) {
			newFilters.headerFilters.technician_uid = queryParams
				.get('ps_technician_uid')
				.split(',')
				.filter((s) => s.trim());
			hasFilterParams = true;
		}
		if (queryParams.has('ps_doc_id')) {
			newFilters.headerFilters.doc_id = queryParams
				.get('ps_doc_id')
				.split(',')
				.filter((s) => s.trim());
			hasFilterParams = true;
		}
		// Handle both ps_urgent and ps_status for urgent samples
		if (queryParams.has('ps_urgent') || queryParams.has('ps_status')) {
			const urgentValue = queryParams.get('ps_urgent') || queryParams.get('ps_status');
			if (urgentValue === '1') {
				newFilters.headerFilters.status = 1;
				hasFilterParams = true;
			}
		}
		// Handle result_value filter (đủ kết quả)
		if (queryParams.has('ps_result_value')) {
			const resultValue = queryParams.get('ps_result_value');
			if (resultValue === 'has_result' || resultValue === 'no_result') {
				newFilters.headerFilters.result_value = resultValue;
				hasFilterParams = true;
			}
		}
		// Handle done filter (đủ kết quả)
		if (queryParams.has('ps_done')) {
			const doneValue = queryParams.get('ps_done');
			if (doneValue === 'true') {
				newFilters.headerFilters.done = true;
				hasFilterParams = true;
			}
		}
		// Handle overdue filter (trong ngày)
		if (queryParams.has('ps_overdue')) {
			const overdueValue = queryParams.get('ps_overdue');
			if (overdueValue === 'true') {
				newFilters.headerFilters.overdue = true;
				hasFilterParams = true;
			}
		}
		// Handle deadline filter (quá hạn, trong ngày, etc.)
		if (queryParams.has('ps_deadline')) {
			const deadlineValue = queryParams.get('ps_deadline');
			if (deadlineValue) {
				newFilters.headerFilters.deadline = deadlineValue;
				hasFilterParams = true;
			}
		}

		// Read pagination and sorting parameters (but don't count as filter params)
		const pageParam = queryParams.get('ps_page');
		const itemsPerPageParam = queryParams.get('ps_itemsPerPage');
		const columnSortParam = queryParams.get('ps_columnSort');
		const sortByParam = queryParams.get('ps_sortBy');
		const filterModeParam = queryParams.get('ps_filter');

		// Update states if query params exist, otherwise keep defaults (don't write defaults to URL)
		if (hasFilterParams) {
			setFilters(newFilters);
		}

		if (pageParam) {
			setCurrentPage(parseInt(pageParam, 10) || 1);
		}

		if (itemsPerPageParam) {
			setItemsPerPage(parseInt(itemsPerPageParam, 10) || 100);
		}

		if (columnSortParam || sortByParam) {
			setFilters((prev) => ({
				...prev,
				columnSort: columnSortParam || 'sample_uid',
				sortBy: sortByParam || 'ASC',
			}));
		}

		if (filterModeParam) {
			setIsFilterCreationMode(filterModeParam === 'true');
		}

		// 2. Send API to load data for table (only once on initial load)
		setIsFetch(true);
		fetchSampleData();
	}, []); // Empty dependency array for initial load only

	// Handle filter changes after initial load - write to query params and reload data
	useEffect(() => {
		// Skip on initial load
		if (isInitialLoad) return;

		// 1. Update query params with current filter state (add/replace, don't remove other params)
		updateQueryParams(filters);

		// 2. Send API with current filters (don't wait for URL update)
		fetchSampleData(false, filters);
	}, [filters, currentPage, itemsPerPage, isInitialLoad]); // Added isInitialLoad to dependency array

	// Auto-refresh every 60 seconds - enhanced like ProcessingAnalysis
	useEffect(() => {
		const interval = setInterval(() => {
			if (
				!isApiCallInProgress &&
				isFetch &&
				!editableCell.analysisId &&
				!editingProtocolSource &&
				!editingProtocolCode &&
				!isFilterCreationMode &&
				!activeFilterColumn
			) {
				fetchSampleData(true); // Preserve scroll position during auto-refresh
			}
		}, 60000);

		return () => clearInterval(interval);
	}, [
		isApiCallInProgress,
		isFetch,
		editableCell.analysisId,
		editingProtocolSource,
		editingProtocolCode,
		isFilterCreationMode,
		activeFilterColumn,
	]);

	// Keyboard shortcuts like ProcessingAnalysis
	useEffect(() => {
		const handleKeyDown = (e) => {
			// ESC to cancel editing
			if (e.key === 'Escape') {
				if (editableCell.analysisId) {
					setEditableCell({ analysisId: null, column: null });
					setInputValue('');
				}
				if (editingProtocolSource) {
					setEditingProtocolSource(null);
					setInputValue('');
				}
				if (editingProtocolCode) {
					setEditingProtocolCode(null);
					setInputValue('');
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [editableCell.analysisId, editingProtocolSource, editingProtocolCode]);

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
			<ToastContainer
				position="top-right"
				autoClose={1000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="light"
			/>

			{/* Breadcrumb */}
			<div className="bg-white p-4 text-sm">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2 font-bold text-sm text-gray-500 cursor-pointer min-w-fit mr-2">
						<span className="hover:underline" onClick={() => onNavigateToLab && onNavigateToLab('samples')}>
							PHÒNG THỬ NGHIỆM
						</span>
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
									onClick={() => handleFilterToggle('done')}
									className={`px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap focus:outline-none ${
										filters.headerFilters.done === true
											? 'bg-green-600 text-white hover:bg-green-700'
											: 'border border-green-600 text-green-600 hover:bg-green-50'
									}`}
								>
									Đủ kết quả
								</button>

								<button
									onClick={() => handleFilterToggle('today')}
									className={`px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap focus:outline-none ${
										filters.headerFilters.overdue === true
											? 'bg-blue-600 text-white hover:bg-blue-700'
											: 'border border-blue-600 text-blue-600 hover:bg-blue-50'
									}`}
								>
									Trong ngày
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
				) : (
					<div className="custom-scrollbar overflow-auto max-h-[calc(100vh-100px)]">
						{/* Table with grouped samples - Always show table */}
						<table className="w-full border-collapse processing-table min-w-[1000px]">
							<thead className="sticky top-0 z-20 border-b-2 border-gray-300 bg-sky-400">
								<tr>
									<th
										className={`bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold w-1/6 max-w-[16.666667%] min-w-[140px] ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-sky-100 text-blue-600 underline' : 'cursor-pointer hover:bg-gray-100 text-gray-800'
										} ${isColumnFiltered('sample_uid') ? 'text-blue-600 underline' : ''}`}
										onClick={() =>
											isFilterCreationMode ? handleColumnFilter('sample_uid') : handleColumnSort('sample_uid')
										}
									>
										<div className="flex items-center justify-between overflow-hidden">
											<span className="truncate">Mẫu thử</span>
											{isColumnFiltered('sample_uid') && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														const newFilters = { ...filters };
														delete newFilters.headerFilters.sample_uid;
														setFilters(newFilters);
														updateQueryParams(newFilters);
													}}
													className="ml-1 text-red-500 hover:text-red-700 text-xs w-3 h-3 flex items-center justify-center flex-shrink-0"
													title="Xóa bộ lọc"
												>
													✕
												</button>
											)}
										{!isFilterCreationMode && filters.columnSort === 'sample_uid' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
										</div>
									</th>
									<th
										className={`bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold min-w-[120px] ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100 text-blue-600 underline' : 'text-gray-800'
										} ${isColumnFiltered('parameter_name') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('parameter_name')}
									>
										<div className="flex items-center justify-between overflow-hidden">
											<span className="truncate">Chỉ tiêu</span>
											{isColumnFiltered('parameter_name') && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														const newFilters = { ...filters };
														delete newFilters.headerFilters.parameter_name;
														setFilters(newFilters);
														updateQueryParams(newFilters);
													}}
													className="ml-1 text-red-500 hover:text-red-700 text-xs w-3 h-3 flex items-center justify-center flex-shrink-0"
													title="Xóa bộ lọc"
												>
													✕
												</button>
											)}
										</div>
									</th>
									<th
										className={`bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold min-w-[100px] ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100 text-blue-600 underline' : 'text-gray-800'
										} ${isColumnFiltered('protocol_source') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('protocol_source')}
									>
										<div className="flex items-center justify-between overflow-hidden">
											<span className="truncate">Nguồn</span>
											{isColumnFiltered('protocol_source') && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														const newFilters = { ...filters };
														delete newFilters.headerFilters.protocol_source;
														setFilters(newFilters);
														updateQueryParams(newFilters);
													}}
													className="ml-1 text-red-500 hover:text-red-700 text-xs w-3 h-3 flex items-center justify-center flex-shrink-0"
													title="Xóa bộ lọc"
												>
													✕
												</button>
											)}
										</div>
									</th>
									<th
										className={`bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold min-w-[160px] ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100 text-blue-600 underline' : 'text-gray-800'
										} ${isColumnFiltered('protocol_code') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('protocol_code')}
									>
										<div className="flex items-center justify-between overflow-hidden">
											<span className="truncate">Phương pháp</span>
											{isColumnFiltered('protocol_code') && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														const newFilters = { ...filters };
														delete newFilters.headerFilters.protocol_code;
														setFilters(newFilters);
														updateQueryParams(newFilters);
													}}
													className="ml-1 text-red-500 hover:text-red-700 text-xs w-3 h-3 flex items-center justify-center flex-shrink-0"
													title="Xóa bộ lọc"
												>
													✕
												</button>
											)}
										</div>
									</th>
									<th
										className={`bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 min-w-[140px] ${
											!isFilterCreationMode ? 'cursor-pointer hover:bg-gray-100' : ''
										}`}
										onClick={() => !isFilterCreationMode && handleColumnSort('result_value')}
									>
										Kết quả
										{!isFilterCreationMode && filters.columnSort === 'result_value' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
									</th>
									<th className="bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 min-w-[100px]">
										Đơn vị
									</th>
									<th
										className={`bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold min-w-[100px] ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100 text-blue-600 underline' : 'cursor-pointer hover:bg-gray-100 text-gray-800'
										} ${isColumnFiltered('deadline') ? 'text-blue-600 underline' : ''}`}
										onClick={() =>
											isFilterCreationMode ? handleColumnFilter('deadline') : handleColumnSort('deadline')
										}
									>
										<div className="flex items-center justify-between overflow-hidden">
											<span className="truncate">Hạn trả</span>
											{isColumnFiltered('deadline') && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														const newFilters = { ...filters };
														delete newFilters.headerFilters.deadline;
														setFilters(newFilters);
														updateQueryParams(newFilters);
													}}
													className="ml-1 text-red-500 hover:text-red-700 text-xs w-3 h-3 flex items-center justify-center flex-shrink-0"
													title="Xóa bộ lọc"
												>
													✕
												</button>
											)}
										{!isFilterCreationMode && filters.columnSort === 'deadline' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
										</div>
									</th>
									<th
										className={`bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold min-w-[150px] ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100 text-blue-600 underline' : 'text-gray-800'
										} ${isColumnFiltered('technician_uid') ? 'text-blue-600 underline' : ''}`}
										onClick={() => isFilterCreationMode && handleColumnFilter('technician_uid')}
									>
										<div className="flex items-center justify-between overflow-hidden">
											<span className="truncate">Người thực hiện</span>
											{isColumnFiltered('technician_uid') && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														const newFilters = { ...filters };
														delete newFilters.headerFilters.technician_uid;
														setFilters(newFilters);
														updateQueryParams(newFilters);
													}}
													className="ml-1 text-red-500 hover:text-red-700 text-xs w-3 h-3 flex items-center justify-center flex-shrink-0"
													title="Xóa bộ lọc"
												>
													✕
												</button>
											)}
										</div>
									</th>
									<th
										className={`bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-center font-bold w-16 ${
											isFilterCreationMode ? 'cursor-pointer hover:bg-blue-100 text-blue-600 underline' : 'cursor-pointer hover:bg-gray-100 text-gray-800'
										} ${isColumnFiltered('doc_id') ? 'text-blue-600 underline' : ''}`}
										onClick={() =>
											isFilterCreationMode ? handleColumnFilter('doc_id') : handleColumnSort('doc_id')
										}
									>
										<div className="flex items-center justify-center overflow-hidden">
											<span className="truncate">Doc</span>
											{isColumnFiltered('doc_id') && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														const newFilters = { ...filters };
														delete newFilters.headerFilters.doc_id;
														setFilters(newFilters);
														updateQueryParams(newFilters);
													}}
													className="ml-1 text-red-500 hover:text-red-700 text-xs w-3 h-3 flex items-center justify-center flex-shrink-0"
													title="Xóa bộ lọc"
												>
													✕
												</button>
											)}
										{!isFilterCreationMode && filters.columnSort === 'doc_id' && (
											<span className="ml-2 text-gray-600 text-xs">{filters.sortBy === 'ASC' ? '↑' : '↓'}</span>
										)}
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								{Array.isArray(groupedSampleDataForPage) && groupedSampleDataForPage.length > 0 ? (
									groupedSampleDataForPage.map((group, groupIndex) =>
										group.analyses.map((item, analysisIndex) => (
											<tr
												key={`${group.sample.sample_uid}-${item.id}`}
												className={`
													${selectedAnalysisIds.has(item.id) ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}
													${groupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}
													border-b border-gray-200 cursor-pointer user-select-none
												`}
												onMouseDown={(e) => handleMouseDown(item.id, e)}
												onMouseEnter={() => handleMouseEnter(item.id)}
											>
												{/* Mẫu thử - Only show for first analysis of each sample */}
												{analysisIndex === 0 ? (
													<td
														className={`
															border border-gray-300 px-3 py-2 text-left align-top w-1/6 max-w-[16.666667%]
															bg-gradient-to-br from-slate-50 to-slate-100 relative
															${group.sample.status === 1 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-blue-500'}
														`}
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

												{/* Nguồn - enhanced styling like ProcessingAnalysis */}
												<td className="border border-gray-300 px-3 py-2 text-left protocol-source-select">
													{editingProtocolSource === item.id ? (
														<select
															className="w-full text-sm font-semibold border border-blue-500 rounded p-1 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
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
															className="text-sm font-medium cursor-pointer hover:bg-blue-50 p-1 rounded editable-cell"
															onClick={() => handleProtocolSourceClick(item.id, item.protocol_source)}
														>
															{item.protocol_source || '--'}
														</div>
													)}
												</td>

												{/* Phương pháp - enhanced styling like ProcessingAnalysis */}
												<td className="border border-gray-300 px-3 py-2 text-left">
													{editingProtocolCode === item.id ? (
														<input
															type="text"
															className="w-full text-sm border border-blue-500 rounded p-1 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
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
															className="text-sm cursor-pointer hover:bg-blue-50 p-1 rounded editable-cell"
															onClick={() => handleProtocolCodeClick(item.id, item.protocol_code)}
														>
															{item.protocol_code || '--'}
														</div>
													)}
												</td>

												{/* Kết quả - enhanced styling like ProcessingAnalysis */}
												<td
													className={`border border-gray-300 px-3 py-2 text-left cursor-pointer editable-cell min-w-[32px] ${
														editableCell.analysisId === item.id && editableCell.column === 'result_value'
															? 'editing-active'
															: 'hover:bg-blue-50'
													}`}
													onClick={() => handleCellClickV3(item.id, 'result_value', item.result_value)}
												>
													{editableCell.analysisId === item.id && editableCell.column === 'result_value' ? (
														<TinyMceInput
															value={inputValue}
															onUpdate={(content) => handleSaveContentV3(content, 'result_value', item.id)}
															onKey={handleKeyDownV3}
														/>
													) : (
														<div className={`text-sm ${!item.result_value ? 'result-cell-placeholder' : ''}`}>
															{item.result_value ? parse(item.result_value) : 'Nhập kết quả...'}
														</div>
													)}
												</td>

												{/* Đơn vị - enhanced styling like ProcessingAnalysis */}
												<td
													className={`border border-gray-300 px-3 py-2 text-left cursor-pointer editable-cell min-w-[32px] ${
														editableCell.analysisId === item.id && editableCell.column === 'result_unit'
															? 'editing-active'
															: 'hover:bg-blue-50'
													}`}
													onClick={() => handleCellClickV3(item.id, 'result_unit', item.result_unit)}
												>
													{editableCell.analysisId === item.id && editableCell.column === 'result_unit' ? (
														<TinyMceInput
															value={inputValue}
															onUpdate={(content) => handleSaveContentV3(content, 'result_unit', item.id)}
															onKey={handleKeyDownV3}
														/>
													) : (
														<div className={`text-sm ${!item.result_unit ? 'result-cell-placeholder' : ''}`}>
															{item.result_unit ? parse(item.result_unit) : 'Nhập đơn vị...'}
														</div>
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

												{/* Doc - Combined filter and view functionality */}
												<td className="border border-gray-300 px-3 py-2 text-center">
													{item.doc_id ? (
														<div className="flex justify-center">
															<button
																onClick={() => handleDocumentPreview(item.doc_id)}
																className={`
																	w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer
																	transition-all duration-200 hover:scale-110
																	${
																		item.doc_id.includes('edit')
																			? 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
																			: item.doc_id.includes('Doc')
																			? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
																			: 'border-gray-300 bg-gray-50 hover:bg-gray-100'
																	}
																`}
																title={`Xem tài liệu: ${item.doc_id}`}
															>
																<svg
																	className={`
																		w-4 h-4 
																		${item.doc_id.includes('edit') ? 'text-yellow-600' : item.doc_id.includes('Doc') ? 'text-blue-600' : 'text-gray-600'}
																	`}
																	fill="currentColor"
																	viewBox="0 0 20 20"
																>
																	<path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
																	<path d="M9 12a1 1 0 102 0V8a1 1 0 10-2 0v4z" />
																	<path d="M10 15a1 1 0 100-2 1 1 0 000 2z" />
																</svg>
															</button>
														</div>
													) : (
														<span className="text-gray-400">--</span>
													)}
												</td>
											</tr>
										)),
									)
								) : (
									<tr>
										<td colSpan="9" className="border border-gray-300 px-3 py-12 text-center">
											<div className="flex flex-col items-center justify-center">
												<FaSearch size={32} className="mb-2 opacity-50 text-gray-400" />
												<p className="text-base text-gray-500">Không có dữ liệu mẫu thử</p>
											</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>

						{/* Pagination - Always show */}
						{Array.isArray(groupedSampleDataForPage) && groupedSampleDataForPage.length > 0 && (
							<div className="p-4 pt-2 bg-white border-t border-gray-200">
								<div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
									<div className="flex items-center space-x-2">
										<label className="text-sm text-gray-700 font-medium">Số biên bản bàn giao mỗi trang:</label>
										<select
											value={itemsPerPage}
											onChange={(e) => {
												const newItemsPerPage = Number(e.target.value);
												handleItemsPerPageChange(newItemsPerPage);
											}}
											className="border border-gray-300 rounded-md p-2 bg-white text-black focus:border-blue-500"
										>
											<option value={10}>10</option>
											<option value={20}>20</option>
											<option value={50}>50</option>
											<option value={100}>100</option>
										</select>
										<span className="text-sm text-gray-600 ml-4">
											Hiển thị {Math.min((currentPage - 1) * itemsPerPage + 1, totalReceipts)} -{' '}
											{Math.min(currentPage * itemsPerPage, totalReceipts)} trong tổng số {totalItems} biên bản bàn giao
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<button
											onClick={handlePreviousPage}
											disabled={currentPage === 1}
											className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
										>
											Trước
										</button>
										<span className="px-4 py-2 text-sm text-gray-700 font-medium cursor-pointer hover:bg-blue-100 rounded">
											Trang {currentPage} / {totalPages}
										</span>
										<button
											onClick={handleNextPage}
											disabled={currentPage === totalPages}
											className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
										>
											Sau
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Bulk Update Component - only show when explicitly requested */}
			<LabBulkUpdate
				isOpen={showBulkEdit && selectedAnalysisIds.size > 0}
				onClose={() => {
					setShowBulkEdit(false);
					setSelectedAnalysisIds(new Set());
				}}
				selectedRows={Array.from(selectedAnalysisIds)}
				selectedData={Array.from(selectedAnalysisIds)
					.map((analysisId) => {
						let foundAnalysis = null;
						groupedSampleDataForPage.forEach((group) => {
							const analysis = group.analyses.find((a) => a.id === analysisId);
							if (analysis) foundAnalysis = analysis;
						});
						return foundAnalysis;
					})
					.filter(Boolean)}
				technicians={technicians}
				onUpdateComplete={() => {
					setShowBulkEdit(false);
					setTimeout(() => {
						fetchSampleData(true);
					}, 1000);
				}}
				updating={updating}
				setUpdating={setUpdating}
			/>

			{/* Filter Modal */}
			{activeFilterColumn && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
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
									: activeFilterColumn === 'technician_uid'
									? 'Người thực hiện'
									: activeFilterColumn === 'doc_id'
									? 'Doc'
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
								{/* Search input - hide for doc_id column */}
								{activeFilterColumn !== 'doc_id' && (
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
								)}

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
														className="flex items-center space-x-2 p-1 rounded cursor-pointer transition-colors"
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

			{/* Technician Dropdown */}
			{technicianDropdownVisible !== null && (
				<div
					className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-[70] max-h-60 overflow-y-auto"
					style={{
						top: dropdownPosition.top,
						left: dropdownPosition.left,
						minWidth: '200px',
					}}
				>
					<div className="p-2">
						<div className="text-xs text-gray-500 mb-2">Chọn người thực hiện:</div>
						{technicians?.map((tech) => (
							<button
								key={tech.identity_uid}
								onClick={() => handleTechnicianChange(technicianDropdownVisible, tech.identity_uid)}
								className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
							>
								{tech.identity_name} {tech.alias && `(${tech.alias})`}
							</button>
						))}
						<button
							onClick={() => handleTechnicianChange(technicianDropdownVisible, null)}
							className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-gray-500"
						>
							-- Không chỉ định --
						</button>
					</div>
				</div>
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

export default ProcessingSample;
