import React, { useState, useContext, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { GlobalContext } from '../../contexts/GlobalContext';
import { apiPost, apiGet } from '../../contexts/helperFunctionCallAPI';
import { convertValueToHTML, convertHTMLToValue } from '../../contexts/formatHelpers';
import { FaSearch, FaFilter, FaSort, FaSortUp, FaSortDown, FaCalendarAlt, FaTimes } from 'react-icons/fa';
import { MdAttachFile } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast, ToastContainer } from 'react-toastify';
import LoginPopup from '../lab/LoginPopup';
import ConfirmLabResult from '../noti box/confirmLabResult';
import Cookies from 'js-cookie';
import axios from 'axios';
import Swal from 'sweetalert2';
import { createPortal } from 'react-dom';

/**
 * FilterableSample - Component hiển thị danh sách mẫu thử với khả năng lọc và sắp xếp
 * Dựa trên ProcessingSample nhưng chỉ có chức năng xem, lọc, sắp xếp, không có chỉnh sửa
 */

const FilterableSample = forwardRef(
	(
		{ blocked = [], selected = [], onSelect, onDoubleClick, onCancelSelection, onSessionStateChange, filter = {} },
		ref,
	) => {
		const { setCurrentTitlePage, status, currentUser, technicians, formatDate } = useContext(GlobalContext);
		const location = useLocation();
		const navigate = useNavigate();

		// Ref to prevent infinite loops in API calls
		const lastApiCallRef = useRef({ filters: null, currentPage: null, itemsPerPage: null, timestamp: 0 });

		// State management
		const [processingSample, setProcessingSample] = useState([]);
		const [currentPage, setCurrentPage] = useState(1);
		const [itemsPerPage, setItemsPerPage] = useState(50);
		const [totalItems, setTotalItems] = useState(0);
		const [totalPages, setTotalPages] = useState(1);

		// Selection states for drag-and-drop selection
		const [selectedAnalysisIds, setSelectedAnalysisIds] = useState(new Set());
		const [selectedRowsData, setSelectedRowsData] = useState(new Map());
		const [isDragging, setIsDragging] = useState(false);
		const [dragStartId, setDragStartId] = useState(null);

		// Loading and API states
		const [isFetch, setIsFetch] = useState(false);
		const [isApiCallInProgress, setIsApiCallInProgress] = useState(false);
		const [loading, setLoading] = useState(true);
		const [isInitialLoad, setIsInitialLoad] = useState(true);

		// Filter states - match ProcessingSample structure
		const [filters, setFilters] = useState({
			columns: [
				'id',
				'sampleId',
				'sampleName',
				'sampleDescription',
				'matrix',
				'status',
				'additionalRequest',
				'handoverAt',
				'volume',
				'parameterName',
				'protocolSource',
				'protocolCode',
				'resultValue',
				'resultUnit',
				'deadline',
				'technicianId',
				'technicianIds',
				'docId',
				'metadata',
				'note',
			],
			parameters: [],
			protocols: [],
			headerFilters: {},
			columnSort: 'sampleId',
			sortBy: 'ASC',
		}); // Filter creation states
		const [activeFilterColumn, setActiveFilterColumn] = useState(null);
		const [filterSearchTerm, setFilterSearchTerm] = useState('');
		const [filterResults, setFilterResults] = useState([]);
		const [filterLoading, setFilterLoading] = useState(false);
		const [selectedFilterValues, setSelectedFilterValues] = useState([]);
		const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });

		// Date filter states for deadline
		const [startDate, setStartDate] = useState(null);
		const [endDate, setEndDate] = useState(null);
		const [showDateRange, setShowDateRange] = useState(false);

		// Inline editing states
		const [editingCell, setEditingCell] = useState(null); // { analysisId, column }
		const [editValue, setEditValue] = useState('');

		// Unit suggestions states
		const [uniqueUnits, setUniqueUnits] = useState([]);
		const [unitInput, setUnitInput] = useState('');
		const [showUnitDropdown, setShowUnitDropdown] = useState(false);
		const [unitPage, setUnitPage] = useState(1);
		const unitItemsPerPage = 6;

		// Login popup states
		const [showLoginPopup, setShowLoginPopup] = useState(false);
		const [pendingEditCell, setPendingEditCell] = useState(null); // Store pending edit until login

		// Result entry session states
		const [isResultEntrySession, setIsResultEntrySession] = useState(false);
		const [pendingChanges, setPendingChanges] = useState(new Map()); // Map<analysisId, {resultValue, resultUnit, ...full record}>
		const [showSessionConfirm, setShowSessionConfirm] = useState(false);
		const [isSessionUpdating, setIsSessionUpdating] = useState(false); // Loading state for session update
		const [showEndSessionDialog, setShowEndSessionDialog] = useState(false); // Dialog for confirming end session
		const [showCancelConfirm, setShowCancelConfirm] = useState(false); // Dialog for confirming cancel changes

		// Session storage key for pending changes
		const SESSION_STORAGE_KEY = 'filterableSample_pendingChanges'; // Tooltip state
		const [tooltip, setTooltip] = useState({
			visible: false,
			content: '',
			x: 0,
			y: 0,
			position: 'above',
		});

		// Note modal states
		const [showNoteModal, setShowNoteModal] = useState(false);
		const [selectedAnalysisForNote, setSelectedAnalysisForNote] = useState(null);
		const [newNoteText, setNewNoteText] = useState('');
		const [isUpdatingNote, setIsUpdatingNote] = useState(false); // Handle filter prop changes
		useEffect(() => {
			if (filter && Object.keys(filter).length > 0) {
				setFilters((prevFilters) => ({
					...prevFilters,
					headerFilters: {
						...prevFilters.headerFilters,
						...filter,
					},
				}));
			}
		}, [filter]);

		// Sync selected prop with internal state
		useEffect(() => {
			if (selected && Array.isArray(selected)) {
				const selectedIds = new Set(selected.map((item) => item.id));
				const selectedData = new Map(selected.map((item) => [item.id, item]));
				setSelectedAnalysisIds(selectedIds);
				setSelectedRowsData(selectedData);
			} else {
				setSelectedAnalysisIds(new Set());
				setSelectedRowsData(new Map());
			}
		}, [selected]);

		// Expose session methods via ref
		useImperativeHandle(ref, () => ({
			startSession: () => {
				setShowSessionConfirm(true);
			},
			endSession: () => {
				setShowEndSessionDialog(true);
			},
			applyBulkChanges: (bulkChanges) => {
				// Apply bulk changes to pendingChanges Map
				setPendingChanges((prev) => {
					const newChanges = new Map(prev);
					bulkChanges.forEach((change) => {
						newChanges.set(change.id, change);
					});
					return newChanges;
				});
			},
		}));

		// Notify parent when session state changes
		useEffect(() => {
			if (onSessionStateChange) {
				onSessionStateChange({
					isActive: isResultEntrySession,
					pendingCount: pendingChanges.size,
				});
			}
		}, [isResultEntrySession, pendingChanges, onSessionStateChange]);

		// Save pending changes to session storage whenever they change
		useEffect(() => {
			try {
				if (pendingChanges.size > 0) {
					// Convert Map to plain object for storage
					const changesObject = Object.fromEntries(pendingChanges);
					sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(changesObject));
				} else {
					// Clear session storage if no pending changes
					sessionStorage.removeItem(SESSION_STORAGE_KEY);
				}
			} catch (error) {
				console.error('Error saving pending changes to session storage:', error);
			}
		}, [pendingChanges]);

		// Fetch unit suggestions from API
		useEffect(() => {
			const fetchUnits = async () => {
				try {
					const unitsResponse = await apiGet('https://black.irdop.org/get/list_enum/unit');
					if (unitsResponse.data && Array.isArray(unitsResponse.data)) {
						setUniqueUnits(unitsResponse.data.filter(Boolean));
					}
				} catch (error) {
					console.error('Error fetching units:', error);
				}
			};

			fetchUnits();
		}, []);

		// Filter and paginate units
		const filterUnits = (input) => {
			if (!input || input.trim() === '') return [];
			return uniqueUnits.filter((unit) => unit && unit.toLowerCase().includes((input || '').toLowerCase()));
		};

		const getPaginatedUnits = (input) => {
			const filtered = filterUnits(input);
			return filtered.slice((unitPage - 1) * unitItemsPerPage, unitPage * unitItemsPerPage);
		};

		const handleUnitPageChange = (pageNumber) => {
			setUnitPage(pageNumber);
		};

		useEffect(() => {
			const styleElement = document.createElement('style');
			styleElement.textContent = `
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
			/* Selected row styles */
			.row-selected {
				background-color: #dbeafe !important;
				border-left: 4px solid #3b82f6 !important;
				box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2);
			}
			.row-selected:hover {
				background-color: #bfdbfe !important;
			}
			.row-selected td {
				background-color: inherit !important;
			}
			/* Blocked row styles */
			.row-blocked {
				background-color: #f9fafb !important;
				opacity: 0.6;
				pointer-events: none;
			}
			.row-blocked:hover {
				background-color: #f9fafb !important;
			}
			.row-blocked td {
				background-color: inherit !important;
			}
			/* Filter button styles */
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
			.filter-button:hover {
				background: linear-gradient(135deg, #e5e7eb, #d1d5db);
				border-color: #9ca3af;
			}
			.filter-button.active {
				background: linear-gradient(135deg, #dbeafe, #bfdbfe);
				border-color: #3b82f6;
				color: #1e40af;
			}
			/* My tasks button styles */
			.my-tasks-btn {
				background: white;
				color: #10b981;
				border: 2px solid #10b981;
				border-radius: 8px;
				padding: 6px 12px;
				font-size: 0.875rem;
				font-weight: 600;
				transition: all 0.15s ease;
				box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
				will-change: background, transform, color;
			}
			.my-tasks-btn:hover {
				background: #f0fdf4;
				transform: translateY(-1px);
				box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
			}
			.my-tasks-btn.active {
				background: linear-gradient(135deg, #10b981, #059669);
				color: white;
				border-color: #059669;
				box-shadow: 0 4px 6px rgba(16, 185, 129, 0.4);
			}
			/* Custom Tooltip Styles */
			.custom-tooltip {
				position: absolute;
				background: rgba(0, 0, 0, 0.9);
				color: white;
				padding: 10px 14px;
				border-radius: 6px;
				font-size: 13px;
				font-weight: 500;
				white-space: pre-wrap;
				pointer-events: none;
				z-index: 10000;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
				opacity: 0;
				transition: opacity 0.2s ease-in-out;
				max-width: 500px;
				min-width: 350px;
				word-wrap: break-word;
			}
			.custom-tooltip.visible {
				opacity: 1;
			}
			.custom-tooltip::after {
				content: '';
				position: absolute;
				border: 5px solid transparent;
			}
			.custom-tooltip.above::after {
				top: 100%;
				left: 50%;
				transform: translateX(-50%);
				border-top-color: rgba(0, 0, 0, 0.9);
			}
			.custom-tooltip.below::after {
				bottom: 100%;
				left: 50%;
				transform: translateX(-50%);
				border-bottom-color: rgba(0, 0, 0, 0.9);
			}
			.custom-tooltip.left {
				transform: translate(-100%, -50%);
			}
			.custom-tooltip.left::after {
				left: 100%;
				top: 50%;
				transform: translateY(-50%);
				border-left-color: rgba(0, 0, 0, 0.9);
			}
			.custom-tooltip.right {
				transform: translateY(-50%);
			}
			.custom-tooltip.right::after {
				right: 100%;
				top: 50%;
				transform: translateY(-50%);
				border-right-color: rgba(0, 0, 0, 0.9);
			}
		`;
			document.head.appendChild(styleElement);

			// Add global mouse event listeners for drag selection
			document.addEventListener('mouseup', handleMouseUp);
			document.addEventListener('mouseleave', handleMouseUp);

			// Restore pending changes from session storage
			try {
				const storedChanges = sessionStorage.getItem(SESSION_STORAGE_KEY);
				if (storedChanges) {
					const parsedChanges = JSON.parse(storedChanges);
					const restoredMap = new Map(Object.entries(parsedChanges));
					setPendingChanges(restoredMap);

					// If there were pending changes, restore session state
					if (restoredMap.size > 0) {
						setIsResultEntrySession(true);
					}
				}
			} catch (error) {
				console.error('Error restoring pending changes from session storage:', error);
			}

			return () => {
				document.head.removeChild(styleElement);
				document.removeEventListener('mouseup', handleMouseUp);
				document.removeEventListener('mouseleave', handleMouseUp);
			};
		}, []);

		// HeaderCell component to manage filter and sort functionality
		const HeaderCell = ({
			columnName,
			displayName,
			isFilterable = true,
			isSortable = true,
			isFiltered,
			sortDirection,
			onFilter,
			onSort,
			onClearFilter,
			className = '',
			width = 'auto',
		}) => {
			const handleHeaderClick = (e) => {
				// If clicking on filter icon, open filter
				if (e.target.closest('.filter-icon')) {
					e.stopPropagation();
					if (isFilterable && onFilter) {
						onFilter(columnName);
					}
					return;
				}

				// Otherwise, handle sort
				if (isSortable && onSort) {
					onSort(columnName);
				}
			};

			const handleClearFilter = (e) => {
				e.stopPropagation();
				if (onClearFilter) {
					onClearFilter(columnName);
				}
			};

			const getSortIcon = () => {
				if (!isSortable) return null;

				if (sortDirection === 'ASC') {
					return <FaSortUp className="text-blue-600" />;
				} else if (sortDirection === 'DESC') {
					return <FaSortDown className="text-blue-600" />;
				} else {
					return <FaSort className="text-gray-400" />;
				}
			};

			return (
				<th
					className={`bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 ${className}`}
					style={{ width }}
					onClick={handleHeaderClick}
				>
					<div className="flex items-center justify-between gap-2 overflow-hidden">
						<span className="truncate cursor-pointer hover:text-gray-600 flex-1">{displayName}</span>

						<div className="flex items-center gap-1 flex-shrink-0">
							{/* Filter icon - only show if filterable */}
							{isFilterable && (
								<button
									className={`filter-icon p-1 rounded hover:bg-sky-500 transition-colors ${
										isFiltered ? 'text-blue-600' : 'text-gray-500'
									}`}
									onClick={(e) => {
										e.stopPropagation();
										onFilter(columnName);
									}}
									title="Lọc dữ liệu"
								>
									<FaFilter className="w-3 h-3" />
								</button>
							)}

							{/* Sort icon - only show if sortable */}
							{isSortable && (
								<div className="text-xs cursor-pointer" title="Sắp xếp">
									{getSortIcon()}
								</div>
							)}
						</div>
					</div>
				</th>
			);
		};

		// Fetch sample data with new API endpoint
		const fetchSampleData = async (preserveScroll = false, overrideFilters = null) => {
			if (isApiCallInProgress) {
				return;
			}

			// Enhanced rate limiting to prevent duplicate calls
			const currentTime = Date.now();
			const lastCallTime = window._lastFetchTime || 0;
			const timeDiff = currentTime - lastCallTime;

			// Apply stricter rate limiting for pagination/filter changes
			if (timeDiff < 300) {
				return;
			}

			window._lastFetchTime = currentTime;

			setIsApiCallInProgress(true);

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
					columns: filters.columns,
					columnSort: currentFilters.columnSort || queryParams.get('ps_columnSort') || 'createdAt',
					sortBy: currentFilters.sortBy || queryParams.get('ps_sortBy') || 'ASC',
					itemsPerPage: itemsPerPage || 30,
					page: currentPage || 1,
				};

				// Add searchTerm if available
				const searchTerm = queryParams.get('ps_searchTerm');
				if (searchTerm) {
					requestBody.searchTerm = searchTerm;
				}

				// Add filters from current filters first
				if (currentFilters.parameters && currentFilters.parameters.length > 0) {
					requestBody.parameterName = currentFilters.parameters;
				}

				if (currentFilters.protocols && currentFilters.protocols.length > 0) {
					requestBody.protocolCode = currentFilters.protocols;
				}

				// Apply filter prop directly to request body
				if (filter && Object.keys(filter).length > 0) {
					Object.keys(filter).forEach((key) => {
						const value = filter[key];
						if (key === 'status' && value === 1) {
							requestBody.status = 1;
						} else if (key === 'done' && value === true) {
							requestBody.done = true;
						} else if (key === 'overdue' && value === true) {
							requestBody.overdue = true;
						} else if (Array.isArray(value) && value.length > 0) {
							requestBody[key] = value;
						} else if (value && !Array.isArray(value)) {
							requestBody[key] = value;
						}
					});
				}

				// Only read from query params if overrideFilters is not provided
				if (!overrideFilters) {
					// Read directly from query params to ensure we have latest data
					if (queryParams.has('ps_sampleId')) {
						const sampleUids = queryParams
							.get('ps_sampleId')
							.split(',')
							.filter((s) => s.trim());
						if (sampleUids.length > 0) {
							requestBody.sampleId = sampleUids;
						}
					}

					if (queryParams.has('ps_parameterName')) {
						const paramNames = queryParams
							.get('ps_parameterName')
							.split(',')
							.filter((s) => s.trim());
						if (paramNames.length > 0) {
							requestBody.parameterName = paramNames;
						}
					}

					if (queryParams.has('ps_protocolSource')) {
						const protocolSources = queryParams
							.get('ps_protocolSource')
							.split(',')
							.filter((s) => s.trim());
						if (protocolSources.length > 0) {
							requestBody.protocolSource = protocolSources;
						}
					}

					if (queryParams.has('ps_protocolCode')) {
						const protocolCodes = queryParams
							.get('ps_protocolCode')
							.split(',')
							.filter((s) => s.trim());
						if (protocolCodes.length > 0) {
							requestBody.protocolCode = protocolCodes;
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

					if (queryParams.has('ps_technicianId')) {
						const technicianIds = queryParams
							.get('ps_technicianId')
							.split(',')
							.filter((s) => s.trim());
						if (technicianIds.length > 0) {
							requestBody.technicianId = technicianIds;
						}
					}

					if (queryParams.has('ps_docId')) {
						const docIds = queryParams
							.get('ps_docId')
							.split(',')
							.filter((s) => s.trim());
						if (docIds.length > 0) {
							requestBody.docId = docIds;
						}
					}
				}

				// Add header filters from current filters (fallback) - exclude status as it's handled separately
				Object.keys(currentFilters.headerFilters || {}).forEach((column) => {
					// Skip status column as it's handled separately
					if (column === 'status') return;

					const filterValue = currentFilters.headerFilters[column];

					if (column === 'sampleId' && filterValue) {
						if (!requestBody.sampleId) requestBody.sampleId = [];
						const values = Array.isArray(filterValue)
							? filterValue
							: filterValue
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s);
						requestBody.sampleId = requestBody.sampleId.concat(values);
					} else if (column === 'parameterName' && filterValue) {
						if (!requestBody.parameterName) {
							requestBody.parameterName = [];
							const values = Array.isArray(filterValue)
								? filterValue
								: filterValue
										.split(',')
										.map((s) => s.trim())
										.filter((s) => s);
							requestBody.parameterName = values;
						}
					} else if (column === 'matrix' && filterValue) {
						requestBody.matrix = filterValue;
					} else if (column === 'protocolSource' && filterValue) {
						requestBody.protocolSource = filterValue;
					} else if (column === 'protocolCode' && filterValue) {
						if (!requestBody.protocolCode) {
							requestBody.protocolCode = [];
							const values = Array.isArray(filterValue)
								? filterValue
								: filterValue
										.split(',')
										.map((s) => s.trim())
										.filter((s) => s);
							requestBody.protocolCode = values;
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
					} else if (column === 'technicianId' && filterValue) {
						if (!requestBody.technicianId) {
							requestBody.technicianId = [];
							const values = Array.isArray(filterValue)
								? filterValue
								: filterValue
										.split(',')
										.map((s) => s.trim())
										.filter((s) => s);
							requestBody.technicianId = values;
						}
					} else if (column === 'technicianIds' && filterValue) {
						if (!requestBody.technicianIds) {
							requestBody.technicianIds = [];
							const values = Array.isArray(filterValue)
								? filterValue
								: filterValue
										.split(',')
										.map((s) => s.trim())
										.filter((s) => s);
							requestBody.technicianIds = values;
						}
					} else if (column === 'resultValue' && filterValue) {
						if (filterValue === 'submitted') {
							requestBody.isSubmitResult = true;
						} else if (filterValue === 'not submitted') {
							requestBody.isSubmitResult = false;
						}
					} else if (column === 'resultUnit' && filterValue) {
						if (filterValue === 'submitted') {
							requestBody.isSubmitUnit = true;
						} else if (filterValue === 'not submitted') {
							requestBody.isSubmitUnit = false;
						}
					} else if (column === 'handover_by' && filterValue) {
						// Handle handover by user filter
						requestBody.handover_by = filterValue;
					} else if (column === 'handover_date' && filterValue) {
						// Handle handover date filter
						requestBody.handover_date = filterValue;
					} else if (column === 'docId' && filterValue) {
						// Handle docId filter
						if (!requestBody.docId) {
							requestBody.docId = [];
							const values = Array.isArray(filterValue)
								? filterValue
								: filterValue
										.split(',')
										.map((s) => s.trim())
										.filter((s) => s);
							requestBody.docId = values;
						}
					}
				});

				// Handle urgent filter - prioritize override filters when available
				const hasUrgentFromFilters = currentFilters.headerFilters && currentFilters.headerFilters.status === 1;
				const hasUrgentFromQuery = queryParams.has('ps_urgent') || queryParams.has('ps_status');

				if (overrideFilters) {
					if (hasUrgentFromFilters) {
						requestBody.status = 1;
					}
				} else {
					if (hasUrgentFromFilters) {
						requestBody.status = 1;
					} else if (hasUrgentFromQuery) {
						const urgentValue = queryParams.get('ps_urgent') || queryParams.get('ps_status');
						if (urgentValue === '1') {
							requestBody.status = 1;
						}
					}
				}

				// Handle done filter (đủ kết quả)
				const hasDoneFromFilters = currentFilters.headerFilters && currentFilters.headerFilters.done === true;
				const hasDoneFromQuery = queryParams.has('ps_done');

				if (overrideFilters) {
					if (hasDoneFromFilters) {
						requestBody.done = true;
					}
				} else {
					if (hasDoneFromFilters) {
						requestBody.done = true;
					} else if (hasDoneFromQuery) {
						const doneValue = queryParams.get('ps_done');
						if (doneValue === 'true') {
							requestBody.done = true;
						}
					}
				}

				// Handle overdue filter (trong ngày)
				const hasOverdueFromFilters = currentFilters.headerFilters && currentFilters.headerFilters.overdue === true;
				const hasOverdueFromQuery = queryParams.has('ps_overdue');

				if (overrideFilters) {
					if (hasOverdueFromFilters) {
						requestBody.overdue = true;
					}
				} else {
					if (hasOverdueFromFilters) {
						requestBody.overdue = true;
					} else if (hasOverdueFromQuery) {
						const overdueValue = queryParams.get('ps_overdue');
						if (overdueValue === 'true') {
							requestBody.overdue = true;
						}
					}
				}

				const response = await apiPost('https://red.irdop.org/v1/sample/get/processing', requestBody);

				if (response?.status < 300 && response?.data) {
					const result = response.data;

					if (result.result && Array.isArray(result.result)) {
						setProcessingSample(result.result);

						// Update pagination from API response only if different to avoid loops
						if (result.pagination) {
							if (result.pagination.totalItems !== totalItems) {
								setTotalItems(result.pagination.totalItems);
							}
							if (result.pagination.totalPages !== totalPages) {
								setTotalPages(result.pagination.totalPages);
							}
							if (isInitialLoad && result.pagination.currentPage !== currentPage) {
								setCurrentPage(result.pagination.currentPage);
							}
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

				if (isInitialLoad) {
					setIsInitialLoad(false);
				}
			}
		};

		// Helper function to check if a column is filtered
		const isColumnFiltered = (columnName) => {
			return filters.headerFilters[columnName] && filters.headerFilters[columnName].length > 0;
		};

		// Helper function to check if an analysis is blocked
		const isAnalysisBlocked = (analysisId) => {
			return blocked.some((blockedAnalysis) => blockedAnalysis.id === analysisId);
		};

		// Helper function to get deadline color based on date
		const getDeadlineColor = (deadlineString) => {
			if (!deadlineString) return '';

			const deadline = new Date(deadlineString);
			const today = new Date();

			deadline.setHours(0, 0, 0, 0);
			today.setHours(0, 0, 0, 0);

			if (deadline < today) {
				return 'text-red-600 font-semibold';
			} else if (deadline.getTime() === today.getTime()) {
				return 'text-yellow-600 font-semibold';
			}
			return '';
		};

		// Helper function to get technician name
		const getTechnicianName = (analysis) => {
			// Use analysis.technician.identityName if available
			if (analysis?.technician?.identityName) {
				return analysis.technician.identityName;
			}
			// Fallback to technicianId if no technician object
			if (analysis?.technicianId) {
				return analysis.technicianId;
			}
			return '--';
		};

		// Tooltip functions
		const showTooltip = (event, content, customPosition = null) => {
			const rect = event.target.getBoundingClientRect();
			const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
			const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

			let x, y, position;

			if (customPosition === 'left') {
				// Position tooltip completely to the left of the element
				x = rect.left + scrollLeft - 10; // 10px padding from element
				y = rect.top + scrollTop + rect.height / 2;
				position = 'left';
			} else if (customPosition === 'right') {
				// Position tooltip completely to the right of the element
				x = rect.right + scrollLeft + 10; // 10px padding from element
				y = rect.top + scrollTop + rect.height / 2;
				position = 'right';
			} else {
				// Default behavior: above or below (center aligned)
				const spaceAbove = rect.top;
				const tooltipHeight = 40; // Approximate tooltip height
				const shouldShowBelow = spaceAbove < tooltipHeight + 20; // 20px buffer

				x = rect.left + scrollLeft + rect.width / 2;
				y = shouldShowBelow
					? rect.bottom + scrollTop + 10 // Show below
					: rect.top + scrollTop - 10; // Show above
				position = shouldShowBelow ? 'below' : 'above';
			}

			setTooltip({
				visible: true,
				content,
				x,
				y,
				position,
			});
		};

		const hideTooltip = () => {
			setTooltip({
				visible: false,
				content: '',
				x: 0,
				y: 0,
				position: 'above',
			});
		};

		// Handle docId click - fetch and open document URL
		const handleDocIdClick = async (docId) => {
			try {
				const response = await apiPost('/api/analysis/getDocument', { docId });
				if (response && response.url) {
					window.open(response.url, '_blank');
				} else {
					toast.error('Không tìm thấy URL của tài liệu');
				}
			} catch (error) {
				console.error('Error fetching document:', error);
				toast.error('Lỗi khi lấy tài liệu');
			}
		};

		// Handle note icon click
		const handleNoteClick = (analysis, e) => {
			e.stopPropagation();
			setSelectedAnalysisForNote(analysis);
			setNewNoteText('');
			setShowNoteModal(true);
		};

		// Handle note update
		const handleUpdateNote = async () => {
			if (!selectedAnalysisForNote || !newNoteText.trim()) {
				toast.warning('Vui lòng nhập nội dung ghi chú');
				return;
			}

			setIsUpdatingNote(true);
			try {
				const currentNote = selectedAnalysisForNote.note || '';
				const userName = currentUser?.identity_name || 'Unknown User';
				const timestamp = new Date().toLocaleString('vi-VN');
				const newNote = currentNote
					? `${currentNote}\n[${timestamp}] ${userName}: ${newNoteText.trim()}`
					: `[${timestamp}] ${userName}: ${newNoteText.trim()}`;

				const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
					analysis: {
						id: selectedAnalysisForNote.id,
						note: newNote,
					},
				});

				if (response?.status < 300) {
					toast.success('Cập nhật ghi chú thành công');

					// Update local data
					setProcessingSample((prevData) =>
						prevData.map((group) => ({
							...group,
							analyses: group.analyses.map((analysis) =>
								analysis.id === selectedAnalysisForNote.id ? { ...analysis, note: newNote } : analysis,
							),
						})),
					);

					// Close modal
					setShowNoteModal(false);
					setSelectedAnalysisForNote(null);
					setNewNoteText('');
				} else {
					toast.error('Lỗi khi cập nhật ghi chú');
				}
			} catch (error) {
				console.error('Error updating note:', error);
				toast.error('Lỗi khi cập nhật ghi chú: ' + error.message);
			} finally {
				setIsUpdatingNote(false);
			}
		}; // Session-based result entry handlers
		const handleResultEntryToggle = async () => {
			if (isResultEntrySession) {
				// End session - show confirmation dialog with pending changes
				setShowEndSessionDialog(true);
			} else {
				// Start session - check authentication first
				await startResultEntrySession();
			}
		};

		const startResultEntrySession = async () => {
			// Simply start the session without authentication check
			setIsResultEntrySession(true);
			toast.success('Đã bắt đầu phiên nhập kết quả');
		};

		const handleSaveChange = (analysisId, field, value) => {
			setPendingChanges((prev) => {
				const newMap = new Map(prev);
				const existing = newMap.get(analysisId) || {};
				newMap.set(analysisId, { ...existing, [field]: value });
				return newMap;
			});
		};

		const handleEndSession = async (shouldSave) => {
			if (shouldSave && pendingChanges.size > 0) {
				setIsSessionUpdating(true);
				try {
					// Prepare analyses array with only id, resultValue, resultUnit
					const analyses = Array.from(pendingChanges.values()).map((change) => ({
						id: change.id,
						resultValue: change.resultValue,
						resultUnit: change.resultUnit,
					}));

					// Send batch update API
					const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
						analyses: analyses,
					});

					if (response?.status < 300) {
						const responseData = response?.data;

						// Response data is array of updated analysis records
						if (Array.isArray(responseData) && responseData.length > 0) {
							// Update processingSample state with new analysis records
							setProcessingSample((prevData) => {
								// Create a map of updated records by ID for quick lookup
								const updatedRecordsMap = new Map(responseData.map((record) => [record.id, record]));

								// Update each analysis in each group
								return prevData.map((group) => ({
									...group,
									analyses: group.analyses.map((analysis) => {
										const updatedRecord = updatedRecordsMap.get(analysis.id);
										return updatedRecord ? { ...analysis, ...updatedRecord } : analysis;
									}),
								}));
							});

							toast.success(`Đã cập nhật ${analyses.length} kết quả thành công`);
						} else {
							// No data or not array, show normal success message
							toast.success(`Đã cập nhật ${analyses.length} kết quả thành công`);
						}

						// Set lastEditResultAt in localStorage (now + 2 minutes)
						const now = new Date().getTime();
						const lastEditAt = now + 2 * 60 * 1000; // 2 minutes
						localStorage.setItem('lastEditResultAt', lastEditAt.toString());

						// Clear pending changes
						setPendingChanges(new Map());

						// End session
						setIsResultEntrySession(false);
						setShowEndSessionDialog(false);
					} else {
						toast.error('Lỗi khi cập nhật kết quả');
					}
				} catch (error) {
					console.error('Error batch updating analyses:', error);
					toast.error('Lỗi khi cập nhật: ' + error.message);
				} finally {
					setIsSessionUpdating(false);
				}
			} else {
				// Just close session without saving
				setIsResultEntrySession(false);
				setPendingChanges(new Map());
				setShowEndSessionDialog(false);
				toast.info('Đã kết thúc phiên nhập kết quả');
			}
		};

		const handleEndSessionWithExperiment = async (experimentData) => {
			if (pendingChanges.size === 0) {
				toast.info('Không có thay đổi nào để lưu');
				setIsResultEntrySession(false);
				setShowEndSessionDialog(false);
				return;
			}

			setIsSessionUpdating(true);
			try {
				// Prepare analyses array with id, resultValue, resultUnit
				const analyses = Array.from(pendingChanges.values()).map((change) => ({
					id: change.id,
					resultValue: change.resultValue,
					resultUnit: change.resultUnit,
				}));

				// Send batch update API with experiment data
				const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
					analyses: analyses,
					experimentLogCode: experimentData.experimentLogCode,
					experimentStartDate: experimentData.experimentStartDate,
					experimentEndDate: experimentData.experimentEndDate,
					editorContent: experimentData.editorContent,
				});

				if (response?.status < 300) {
					const responseData = response?.data;

					// Response data is array of updated analysis records
					if (Array.isArray(responseData) && responseData.length > 0) {
						// Update processingSample state with new analysis records
						setProcessingSample((prevData) => {
							// Create a map of updated records by ID for quick lookup
							const updatedRecordsMap = new Map(responseData.map((record) => [record.id, record]));

							// Update each analysis in each group
							return prevData.map((group) => ({
								...group,
								analyses: group.analyses.map((analysis) => {
									const updatedRecord = updatedRecordsMap.get(analysis.id);
									return updatedRecord ? { ...analysis, ...updatedRecord } : analysis;
								}),
							}));
						});

						toast.success(`Đã cập nhật ${analyses.length} kết quả thành công`);
					} else {
						// No data or not array, show normal success message
						toast.success(`Đã cập nhật ${analyses.length} kết quả thành công`);
					}

					// Set lastEditResultAt in localStorage (now + 2 minutes)
					const now = new Date().getTime();
					const lastEditAt = now + 2 * 60 * 1000; // 2 minutes
					localStorage.setItem('lastEditResultAt', lastEditAt.toString());

					// Clear pending changes
					setPendingChanges(new Map());

					// End session
					setIsResultEntrySession(false);
					setShowEndSessionDialog(false);
				} else {
					toast.error('Lỗi khi cập nhật kết quả');
				}
			} catch (error) {
				console.error('Error batch updating analyses:', error);
				toast.error('Lỗi khi cập nhật: ' + error.message);
			} finally {
				setIsSessionUpdating(false);
			}
		};

		const handleCancelAllChanges = () => {
			setShowCancelConfirm(true);
		};

		const confirmCancelChanges = () => {
			setPendingChanges(new Map());
			setShowCancelConfirm(false);
			toast.info('Đã hủy tất cả thay đổi chưa lưu');
		};

		// Handle column sorting with ASC → DESC → no sort cycle
		const handleColumnSort = (columnName) => {
			const currentColumn = filters.columnSort;
			const currentSort = filters.sortBy;

			let newColumnSort = columnName;
			let newSortBy = 'ASC';

			if (currentColumn === columnName) {
				if (currentSort === 'ASC') {
					newSortBy = 'DESC';
				} else if (currentSort === 'DESC') {
					newColumnSort = null;
					newSortBy = null;
				}
			}

			const newFilters = {
				...filters,
				columnSort: newColumnSort,
				sortBy: newSortBy,
			};

			setFilters(newFilters);
		};

		// Update URL query params when filters change
		const updateQueryParams = (newFilters) => {
			const queryParams = new URLSearchParams(location.search);

			[
				'ps_sampleId',
				'ps_parameterName',
				'ps_protocolSource',
				'ps_protocolCode',
				'ps_matrix',
				'ps_status',
				'ps_deadline',
				'ps_technicianId',
				'ps_technicianIds',
				'ps_resultValue',
				'ps_done',
				'ps_overdue',
				'ps_columnSort',
				'ps_sortBy',
				'ps_page',
				'ps_itemsPerPage',
				'ps_docId',
			].forEach((param) => {
				queryParams.delete(param);
			});

			Object.keys(newFilters.headerFilters).forEach((column) => {
				const value = newFilters.headerFilters[column];
				if (column === 'status' && value === 1) {
					queryParams.set('ps_status', '1');
				} else if (column === 'done' && value === true) {
					queryParams.set('ps_done', 'true');
				} else if (column === 'overdue' && value === true) {
					queryParams.set('ps_overdue', 'true');
				} else if (Array.isArray(value) && value.length > 0) {
					let paramName = `ps_${column}`;
					if (column === 'parameterName') paramName = 'ps_parameterName';
					else if (column === 'protocolSource') paramName = 'ps_protocolSource';
					else if (column === 'protocolCode') paramName = 'ps_protocolCode';
					else if (column === 'technicianId') paramName = 'ps_technicianId';
					else if (column === 'technicianIds') paramName = 'ps_technicianIds';
					else if (column === 'docId') paramName = 'ps_docId';
					queryParams.set(paramName, value.join(','));
				} else if (value && !Array.isArray(value)) {
					let paramName = `ps_${column}`;
					if (column === 'parameterName') paramName = 'ps_parameterName';
					else if (column === 'protocolSource') paramName = 'ps_protocolSource';
					else if (column === 'protocolCode') paramName = 'ps_protocolCode';
					else if (column === 'technicianId') paramName = 'ps_technicianId';
					else if (column === 'technicianIds') paramName = 'ps_technicianIds';
					else if (column === 'docId') paramName = 'ps_docId';
					queryParams.set(paramName, value);
				}
			});

			if (newFilters.columnSort) {
				queryParams.set('ps_columnSort', newFilters.columnSort);
			}
			if (newFilters.sortBy) {
				queryParams.set('ps_sortBy', newFilters.sortBy);
			}

			if (currentPage > 1) {
				queryParams.set('ps_page', currentPage.toString());
			}
			if (itemsPerPage !== 100) {
				queryParams.set('ps_itemsPerPage', itemsPerPage.toString());
			}

			const newUrl = queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname;
			navigate(newUrl, { replace: true });
		};

		// Column filter handlers
		const handleColumnFilter = async (columnName) => {
			setActiveFilterColumn(columnName);
			setFilterLoading(true);
			setFilterResults([]);
			setSelectedFilterValues([]);
			setFilterSearchTerm('');

			try {
				// Build request body for new API
				const requestBody = {
					filterColumn: columnName,
					filterValue: '',
				};

				// Add other filters from current filters (excluding the column being filtered)
				const otherFilters = { ...filters.headerFilters };
				delete otherFilters[columnName]; // Remove the current column from other filters

				// Add otherFilters as an object in request body
				if (Object.keys(otherFilters).length > 0) {
					requestBody.otherFilters = otherFilters;
				}

				const response = await apiPost('https://red.irdop.org/v1/sample/filter_column/get', requestBody);

				if (response?.status < 300 && response?.data) {
					let formattedResults = [];

					if (columnName === 'docId') {
						formattedResults = [
							{ value: 'none', count: 0, label: 'none' },
							{ value: 'pending', count: 0, label: 'pending' },
							{ value: 'published', count: 0, label: 'published' },
						];
					} else if (columnName === 'technicianId') {
						formattedResults = response.data.map((item) => {
							// Use filterDisplay if available, otherwise fall back to filterValue
							const displayName = item.filterDisplay || item.filterValue || 'Không có người thực hiện';

							return {
								value: item.filterValue,
								count: item.analysisCount || 0,
								label: displayName,
							};
						});
					} else if (columnName === 'technicianIds') {
						formattedResults = response.data.map((item) => {
							// Use filterDisplay if available, otherwise fall back to filterValue
							const displayName = item.filterDisplay || item.filterValue || 'Không có người thực hiện';

							return {
								value: item.filterValue,
								count: item.analysisCount || 0,
								label: displayName,
							};
						});
					} else if (columnName === 'deadline') {
						const deadlineLabels = {
							overdue: 'Quá hạn',
							today: 'Hôm nay',
							'3days': '3 ngày tới',
							week: 'Tuần này',
							future: 'Tương lai',
						};

						formattedResults = response.data.map((item) => ({
							value: item.filterValue,
							count: item.analysisCount || 0,
							label: deadlineLabels[item.filterValue] || item.filterValue,
						}));
					} else {
						formattedResults = response.data.map((item) => ({
							value: item.filterValue,
							count: item.analysisCount || 0,
							label: item.filterDisplay || item.filterValue, // Use filterDisplay if available
						}));
					}

					setFilterResults(formattedResults);

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
				setFilterLoading(false);
			}
		};

		const searchFilterValues = async (searchTerm) => {
			if (!activeFilterColumn) return;

			try {
				// Build request body for new API
				const requestBody = {
					filterColumn: activeFilterColumn,
					filterValue: searchTerm || '',
				};

				// Add other filters from current filters (excluding the column being filtered)
				const otherFilters = { ...filters.headerFilters };
				delete otherFilters[activeFilterColumn]; // Remove the current column from other filters

				// Add otherFilters as an object in request body
				if (Object.keys(otherFilters).length > 0) {
					requestBody.otherFilters = otherFilters;
				}

				const response = await apiPost('https://red.irdop.org/v1/sample/filter_column/get', requestBody);

				if (response?.status < 300 && response?.data) {
					let formattedResults = [];

					if (activeFilterColumn === 'docId') {
						formattedResults = [
							{ value: 'none', count: 0, label: 'none' },
							{ value: 'pending', count: 0, label: 'pending' },
							{ value: 'published', count: 0, label: 'published' },
						];
					} else if (activeFilterColumn === 'technicianId') {
						formattedResults = response.data.map((item) => {
							// Use filterDisplay if available, otherwise fall back to filterValue
							const displayName = item.filterDisplay || item.filterValue || 'Không có người thực hiện';

							return {
								value: item.filterValue,
								count: item.analysisCount || 0,
								label: displayName,
							};
						});
					} else if (activeFilterColumn === 'technicianIds') {
						formattedResults = response.data.map((item) => {
							// Use filterDisplay if available, otherwise fall back to filterValue
							const displayName = item.filterDisplay || item.filterValue || 'Không có người thực hiện';

							return {
								value: item.filterValue,
								count: item.analysisCount || 0,
								label: displayName,
							};
						});
					} else if (activeFilterColumn === 'deadline') {
						const deadlineLabels = {
							overdue: 'Quá hạn',
							today: 'Hôm nay',
							'3days': '3 ngày tới',
							week: 'Tuần này',
							future: 'Tương lai',
						};

						formattedResults = response.data.map((item) => ({
							value: item.filterValue,
							count: item.analysisCount || 0,
							label: deadlineLabels[item.filterValue] || item.filterValue,
						}));
					} else {
						formattedResults = response.data.map((item) => ({
							value: item.filterValue,
							count: item.analysisCount || 0,
							label: item.filterDisplay || item.filterValue, // Use filterDisplay if available
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
		};

		const closeFilterModal = () => {
			setActiveFilterColumn(null);
			setFilterResults([]);
			setSelectedFilterValues([]);
			setFilterLoading(false);
			setStartDate(null);
			setEndDate(null);
			setShowDateRange(false);
		};

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
						activeFilterColumn === 'sampleId'
							? 'Mẫu thử'
							: activeFilterColumn === 'parameterName'
							? 'Chỉ tiêu'
							: activeFilterColumn === 'protocolSource'
							? 'Nguồn'
							: activeFilterColumn === 'protocolCode'
							? 'Phương pháp'
							: activeFilterColumn === 'resultValue'
							? 'Kết quả'
							: activeFilterColumn === 'resultUnit'
							? 'Đơn vị'
							: activeFilterColumn === 'deadline'
							? 'Hạn trả'
							: activeFilterColumn === 'technicianId'
							? 'Người phụ trách'
							: activeFilterColumn === 'technicianIds'
							? 'Người thực hiện'
							: activeFilterColumn === 'docId'
							? 'Doc'
							: activeFilterColumn
					}`,
				);
			}
		};

		const applyFilter = () => {
			// Special filters are handled by applySpecialFilter function
			if (activeFilterColumn === 'resultValue' || activeFilterColumn === 'resultUnit') {
				// These are handled by the special filter buttons
				return;
			}

			if (activeFilterColumn === 'deadline' && (startDate || endDate || selectedFilterValues.length > 0)) {
				const newFilters = { ...filters };
				let filterValue = [];

				if (selectedFilterValues.length > 0) {
					filterValue = [...selectedFilterValues];
				}

				if (startDate || endDate) {
					const dateRange = {};
					if (startDate) {
						dateRange.start = startDate.toISOString().split('T')[0];
					}
					if (endDate) {
						dateRange.end = endDate.toISOString().split('T')[0];
					}
					filterValue.push(dateRange);
				}

				if (filterValue.length > 0) {
					newFilters.headerFilters[activeFilterColumn] = filterValue;
				} else {
					delete newFilters.headerFilters[activeFilterColumn];
				}

				setFilters(newFilters);
				updateQueryParams(newFilters);
				setActiveFilterColumn(null);
				setFilterResults([]);
				setSelectedFilterValues([]);
				setStartDate(null);
				setEndDate(null);
				setShowDateRange(false);
			} else if (activeFilterColumn && selectedFilterValues.length > 0) {
				applyColumnFilter(activeFilterColumn, selectedFilterValues);
			}
		};

		const cancelFilter = () => {
			setStartDate(null);
			setEndDate(null);
			setShowDateRange(false);
			closeFilterModal();
		};

		// Apply special filter (for resultValue, resultUnit, deadline, docId)
		const applySpecialFilter = (column, value) => {
			const newFilters = { ...filters };
			if (value !== null && value !== undefined && value !== '') {
				newFilters.headerFilters[column] = value;
			} else {
				delete newFilters.headerFilters[column];
			}

			setFilters(newFilters);
			updateQueryParams(newFilters);
			setActiveFilterColumn(null);
			setFilterSearchTerm('');
			setFilterResults([]);
			setSelectedFilterValues([]);
		};

		// Helper function to get analysis data by ID
		const getAnalysisDataById = (analysisId) => {
			for (const group of processingSample) {
				const analysis = group.analyses.find((item) => item.id === analysisId);
				if (analysis) return analysis;
			}
			return null;
		};

		// Selection handlers for drag-and-drop
		const handleMouseDown = (analysisId, event) => {
			// Check if analysis is blocked
			if (isAnalysisBlocked(analysisId)) {
				return;
			}

			if (event.target.tagName === 'SELECT' || event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') {
				return; // Don't start drag on interactive elements
			}

			setIsDragging(true);
			setDragStartId(analysisId);

			if (event.ctrlKey || event.metaKey) {
				// Ctrl+click to toggle selection
				const newSelection = new Set(selectedAnalysisIds);
				const newSelectedRowsData = new Map(selectedRowsData);

				if (newSelection.has(analysisId)) {
					newSelection.delete(analysisId);
					newSelectedRowsData.delete(analysisId);
				} else {
					newSelection.add(analysisId);
					const analysisData = getAnalysisDataById(analysisId);
					if (analysisData) {
						newSelectedRowsData.set(analysisId, analysisData);
					}
				}
				setSelectedAnalysisIds(newSelection);
				setSelectedRowsData(newSelectedRowsData);

				// Call onSelect callback
				if (onSelect) {
					const selectedAnalyses = Array.from(newSelectedRowsData.values());
					onSelect({ analyses: selectedAnalyses });
				}
			} else {
				// Check if clicking on already selected item to toggle
				if (selectedAnalysisIds.has(analysisId) && selectedAnalysisIds.size === 1) {
					// If only this item is selected, deselect it
					setSelectedAnalysisIds(new Set());
					setSelectedRowsData(new Map());

					// Call onSelect callback
					if (onSelect) {
						onSelect({ analyses: [] });
					}
				} else {
					// Start new selection
					const analysisData = getAnalysisDataById(analysisId);
					setSelectedAnalysisIds(new Set([analysisId]));
					if (analysisData) {
						setSelectedRowsData(new Map([[analysisId, analysisData]]));
					}

					// Call onSelect callback
					if (onSelect && analysisData) {
						onSelect({ analyses: [analysisData] });
					}
				}
			}

			event.preventDefault();
		};

		const handleMouseEnter = (analysisId) => {
			// Check if analysis is blocked
			if (isAnalysisBlocked(analysisId)) {
				return;
			}

			if (isDragging && dragStartId) {
				// Get all analysis IDs in order from grouped data
				const allAnalysisIds = [];
				processingSample.forEach((group) => {
					group.analyses.forEach((analysis) => {
						// Skip blocked analyses
						if (!isAnalysisBlocked(analysis.id)) {
							allAnalysisIds.push(analysis.id);
						}
					});
				});

				const startIndex = allAnalysisIds.indexOf(dragStartId);
				const currentIndex = allAnalysisIds.indexOf(analysisId);

				if (startIndex !== -1 && currentIndex !== -1) {
					const minIndex = Math.min(startIndex, currentIndex);
					const maxIndex = Math.max(startIndex, currentIndex);
					const selectedRange = allAnalysisIds.slice(minIndex, maxIndex + 1);

					// Update both selectedAnalysisIds and selectedRowsData
					const newSelectedRowsData = new Map();
					selectedRange.forEach((id) => {
						const analysisData = getAnalysisDataById(id);
						if (analysisData) {
							newSelectedRowsData.set(id, analysisData);
						}
					});

					setSelectedAnalysisIds(new Set(selectedRange));
					setSelectedRowsData(newSelectedRowsData);

					// Call onSelect callback
					if (onSelect) {
						const selectedAnalyses = Array.from(newSelectedRowsData.values());
						onSelect({ analyses: selectedAnalyses });
					}
				}
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			setDragStartId(null);
		};

		const handlePreviousPage = () => {
			if (currentPage > 1) {
				const newPage = currentPage - 1;
				setCurrentPage(newPage);
			}
		};

		const handleNextPage = () => {
			if (currentPage < totalPages) {
				const newPage = currentPage + 1;
				setCurrentPage(newPage);
			}
		};

		const handleItemsPerPageChange = (newItemsPerPage) => {
			setItemsPerPage(newItemsPerPage);
			setCurrentPage(1);
		};

		const cancelSelection = () => {
			setSelectedAnalysisIds(new Set());
			setSelectedRowsData(new Map());

			// Call onSelect callback
			if (onSelect) {
				onSelect({ analyses: [] });
			}

			// Call onCancelSelection callback if provided
			if (onCancelSelection) {
				onCancelSelection();
			}
		};

		// Inline editing handlers
		// Show confirmation dialog for user before editing
		const confirmUserBeforeEdit = (analysisId, column, currentValue) => {
			// Show confirmation popup with user info and option to re-login
			setPendingEditCell({ analysisId, column, currentValue });
			setShowSessionConfirm(true);
		};

		// Handle user confirmation (continue as current user)
		const handleConfirmUser = () => {
			if (pendingEditCell) {
				const { analysisId, column, currentValue } = pendingEditCell;
				proceedWithEdit(analysisId, column, currentValue);
				setPendingEditCell(null);
			}
			setShowSessionConfirm(false);
		};

		// Handle re-login option
		const handleRelogin = () => {
			setShowSessionConfirm(false);
			setShowLoginPopup(true);
		};

		// Handle login success callback
		const handleLoginSuccess = () => {
			setShowLoginPopup(false);

			// Proceed with the pending edit
			if (pendingEditCell) {
				const { analysisId, column, currentValue } = pendingEditCell;
				proceedWithEdit(analysisId, column, currentValue);
				setPendingEditCell(null);
			}
		};

		// Close login popup
		const closeLoginPopup = () => {
			setShowLoginPopup(false);
			setPendingEditCell(null);
		};

		// Proceed with edit after confirmation
		const proceedWithEdit = (analysisId, column, currentValue) => {
			setEditingCell({ analysisId, column });
			// Convert HTML tags back to special characters for editing
			const editableValue = convertHTMLToValue(currentValue || '');
			setEditValue(editableValue);
		};

		const handleCellClick = async (analysisId, column, currentValue) => {
			// Don't edit if cell is already being edited
			if (editingCell?.analysisId === analysisId && editingCell?.column === column) {
				return;
			}

			// Close unit dropdown when switching cells
			setShowUnitDropdown(false);

			// Only apply session logic for result and unit columns
			if (column === 'resultValue' || column === 'resultUnit') {
				// If not in session, start session first
				if (!isResultEntrySession) {
					await startResultEntrySession();
				}

				// If already in session, proceed directly without confirmation
				if (isResultEntrySession) {
					proceedWithEdit(analysisId, column, currentValue);
				} else {
					// Show confirmation dialog only when starting new session
					confirmUserBeforeEdit(analysisId, column, currentValue);
				}
			} else if (column === 'note') {
				// For note column, edit directly without confirmation
				proceedWithEdit(analysisId, column, currentValue);
			}
		};

		const handleCellBlur = async () => {
			if (!editingCell) return;

			const { analysisId, column } = editingCell;

			// Close unit dropdown
			setTimeout(() => {
				setShowUnitDropdown(false);
			}, 200);

			// Find the original value to compare
			const originalAnalysis = getAnalysisDataById(analysisId);
			const originalValue = originalAnalysis?.[column] || '';
			const strippedOriginal = originalValue.replace(/<[^>]*>/g, '');

			// Only update if value changed
			if (editValue !== strippedOriginal) {
				// If in result entry session and editing result/unit columns, save to pending changes
				if (isResultEntrySession && (column === 'resultValue' || column === 'resultUnit')) {
					// Get existing pending changes for this analysis or create new with full record data
					const existingChanges = pendingChanges.get(analysisId) || {
						...originalAnalysis, // Include full record data
						id: analysisId,
					};

					// Update the changed column
					const convertedValue = convertValueToHTML(editValue);
					if (column === 'resultValue') {
						existingChanges.resultValue = convertedValue;
					} else if (column === 'resultUnit') {
						existingChanges.resultUnit = convertedValue;
					}

					// Update pending changes
					setPendingChanges(new Map(pendingChanges.set(analysisId, existingChanges)));

					// Update local display immediately
					setProcessingSample((prevData) =>
						prevData.map((group) => ({
							...group,
							analyses: group.analyses.map((analysis) =>
								analysis.id === analysisId ? { ...analysis, [column]: convertedValue } : analysis,
							),
						})),
					);

					toast.info('Thay đổi đã được lưu tạm thời');
				} else {
					// Normal edit flow - send API immediately (for non-result/unit columns)
					try {
						// Convert value to HTML format before sending
						const convertedValue = convertValueToHTML(editValue);

						const updateData = {
							analysis: {
								id: analysisId,
							},
						};

						// Set the appropriate field based on column
						if (column === 'resultValue') {
							updateData.analysis.resultValue = convertedValue;
						} else if (column === 'resultUnit') {
							updateData.analysis.resultUnit = convertedValue;
						}

						const response = await apiPost('https://red.irdop.org/v1/analysis/update', updateData);

						if (response?.status < 300) {
							toast.success('Cập nhật thành công');

							// Set lastEditResultAt in localStorage (now + 2 minutes)
							const now = new Date().getTime();
							const lastEditAt = now + 2 * 60 * 1000; // 2 minutes
							localStorage.setItem('lastEditResultAt', lastEditAt.toString());

							// Refresh data to get updated values
							fetchSampleData(true);
						} else {
							toast.error('Lỗi khi cập nhật');
						}
					} catch (error) {
						console.error('Error updating cell:', error);
						toast.error('Lỗi khi cập nhật: ' + error.message);
					}
				}
			}

			setEditingCell(null);
			setEditValue('');
		};

		const handleKeyDown = (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				e.target.blur(); // This will trigger handleCellBlur
			} else if (e.key === 'Escape') {
				setEditingCell(null);
				setEditValue('');
			}
		};

		// Check if there are selected samples
		const hasSelectedSamples = selectedAnalysisIds.size > 0;

		// Initial data load on component mount
		useEffect(() => {
			setCurrentTitlePage('Danh sách mẫu thử');

			const queryParams = new URLSearchParams(location.search);
			const newFilters = { ...filters };
			let hasFilterParams = false;

			if (queryParams.has('ps_sampleId')) {
				newFilters.headerFilters.sampleId = queryParams
					.get('ps_sampleId')
					.split(',')
					.filter((s) => s.trim());
				hasFilterParams = true;
			}
			if (queryParams.has('ps_parameterName')) {
				newFilters.headerFilters.parameterName = queryParams
					.get('ps_parameterName')
					.split(',')
					.filter((s) => s.trim());
				hasFilterParams = true;
			}
			if (queryParams.has('ps_protocolSource')) {
				newFilters.headerFilters.protocolSource = queryParams
					.get('ps_protocolSource')
					.split(',')
					.filter((s) => s.trim());
				hasFilterParams = true;
			}
			if (queryParams.has('ps_protocolCode')) {
				newFilters.headerFilters.protocolCode = queryParams
					.get('ps_protocolCode')
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
			if (queryParams.has('ps_technicianId')) {
				newFilters.headerFilters.technicianId = queryParams
					.get('ps_technicianId')
					.split(',')
					.filter((s) => s.trim());
				hasFilterParams = true;
			}
			if (queryParams.has('ps_technicianIds')) {
				newFilters.headerFilters.technicianIds = queryParams
					.get('ps_technicianIds')
					.split(',')
					.filter((s) => s.trim());
				hasFilterParams = true;
			}
			if (queryParams.has('ps_docId')) {
				newFilters.headerFilters.docId = queryParams
					.get('ps_docId')
					.split(',')
					.filter((s) => s.trim());
				hasFilterParams = true;
			}

			if (queryParams.has('ps_urgent') || queryParams.has('ps_status')) {
				const urgentValue = queryParams.get('ps_urgent') || queryParams.get('ps_status');
				if (urgentValue === '1') {
					newFilters.headerFilters.status = 1;
					hasFilterParams = true;
				}
			}

			if (queryParams.has('ps_resultValue')) {
				const resultValue = queryParams.get('ps_resultValue');
				if (resultValue === 'hasResult' || resultValue === 'noResult') {
					newFilters.headerFilters.resultValue = resultValue;
					hasFilterParams = true;
				}
			}

			if (queryParams.has('ps_done')) {
				const doneValue = queryParams.get('ps_done');
				if (doneValue === 'true') {
					newFilters.headerFilters.done = true;
					hasFilterParams = true;
				}
			}

			if (queryParams.has('ps_overdue')) {
				const overdueValue = queryParams.get('ps_overdue');
				if (overdueValue === 'true') {
					newFilters.headerFilters.overdue = true;
					hasFilterParams = true;
				}
			}

			if (queryParams.has('ps_deadline')) {
				const deadlineValue = queryParams.get('ps_deadline');
				if (deadlineValue) {
					newFilters.headerFilters.deadline = deadlineValue;
					hasFilterParams = true;
				}
			}

			const pageParam = queryParams.get('ps_page');
			const itemsPerPageParam = queryParams.get('ps_itemsPerPage');
			const columnSortParam = queryParams.get('ps_columnSort');
			const sortByParam = queryParams.get('ps_sortBy');

			let finalFilters = newFilters;

			if (columnSortParam || sortByParam) {
				finalFilters = {
					...finalFilters,
					columnSort: columnSortParam || 'sampleId',
					sortBy: sortByParam || 'ASC',
				};
			}

			// Apply filter prop if provided
			if (filter && Object.keys(filter).length > 0) {
				finalFilters.headerFilters = {
					...finalFilters.headerFilters,
					...filter,
				};
				hasFilterParams = true;
			}

			if (hasFilterParams || columnSortParam || sortByParam) {
				setFilters(finalFilters);
			}

			if (pageParam) {
				setCurrentPage(parseInt(pageParam, 10) || 1);
			}

			if (itemsPerPageParam) {
				setItemsPerPage(parseInt(itemsPerPageParam, 10) || 100);
			}

			setIsFetch(true);
			fetchSampleData();
		}, []);

		// Handle filter changes after initial load
		useEffect(() => {
			if (isInitialLoad) return;

			const currentSignature = JSON.stringify({
				filters: filters.headerFilters,
				columnSort: filters.columnSort,
				sortBy: filters.sortBy,
				currentPage,
				itemsPerPage,
			});

			const now = Date.now();
			if (lastApiCallRef.current.signature === currentSignature && now - lastApiCallRef.current.timestamp < 500) {
				return;
			}

			lastApiCallRef.current = {
				signature: currentSignature,
				timestamp: now,
			};

			updateQueryParams(filters);
			fetchSampleData(false, filters);
		}, [filters, currentPage, itemsPerPage, isInitialLoad]);

		// Auto-refresh every 60 seconds
		useEffect(() => {
			const interval = setInterval(() => {
				// Don't auto-refresh if in result entry session, API call in progress, or filter modal is open
				if (!isApiCallInProgress && isFetch && !activeFilterColumn && !isResultEntrySession) {
					fetchSampleData(true);
				}
			}, 60000);

			return () => clearInterval(interval);
		}, [isApiCallInProgress, isFetch, activeFilterColumn, isResultEntrySession]);

		// Search filter values with debounce
		useEffect(() => {
			if (!activeFilterColumn) return;

			const timeoutId = setTimeout(() => {
				if (filterSearchTerm !== '' || filterResults.length > 0) {
					searchFilterValues(filterSearchTerm);
				}
			}, 300);

			return () => clearTimeout(timeoutId);
		}, [filterSearchTerm, activeFilterColumn]);

		// Add click outside handler for filter modal
		useEffect(() => {
			const handleClickOutside = (event) => {
				if (activeFilterColumn) {
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
			<div className="w-full h-full relative bg-gray-50 overflow-auto">
				<style>
					{`
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
	left: 50%;
	transform: translateX(-50%);
	border: 5px solid transparent;
}

.custom-tooltip.above::after {
	top: 100%;
	border-top-color: rgba(0, 0, 0, 0.9);
}

.custom-tooltip.below::after {
	bottom: 100%;
	border-bottom-color: rgba(0, 0, 0, 0.9);
}

.custom-tooltip.left {
	transform: translate(-100%, -50%);
}

.custom-tooltip.left::after {
	left: 100%;
	top: 50%;
	transform: translateY(-50%);
	border-left-color: rgba(0, 0, 0, 0.9);
}

.custom-tooltip.right {
	transform: translateY(-50%);
}

.custom-tooltip.right::after {
	right: 100%;
	top: 50%;
	transform: translateY(-50%);
	border-right-color: rgba(0, 0, 0, 0.9);
}
				`}
				</style>
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
				{/* Session Active Banner using Portal - doesn't affect layout */}
				{isResultEntrySession &&
					createPortal(
						<div
							className="fixed top-0 left-0 z-[9999] bg-yellow-400 border-b-2 border-r-2 border-yellow-600 shadow-lg rounded-br-lg"
							style={{ maxWidth: '500px' }}
						>
							<div className="flex items-center gap-3 px-4 py-2">
								<svg
									className="w-5 h-5 text-yellow-800 animate-pulse flex-shrink-0"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
										clipRule="evenodd"
									/>
								</svg>
								<div className="flex flex-col gap-1 min-w-0">
									<span className="text-sm font-semibold text-yellow-900 whitespace-nowrap">
										🔬 Phiên nhập kết quả ({pendingChanges.size})
									</span>
									<span className="text-xs text-yellow-800 truncate">
										{currentUser?.identity_name || 'Không xác định'}
									</span>
								</div>
							</div>
						</div>,
						document.body,
					)}
				{/* Main content */}
				<div className="flex-1 overflow-auto custom-scrollbar min-w-[1200px]">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
							<span className="ml-2 text-gray-600">Đang tải dữ liệu...</span>
						</div>
					) : (
						<div className="p-4">
							{/* Table */}
							<div className="bg-white rounded-lg shadow-sm overflow-hidden">
								<div className="overflow-x-auto custom-scrollbar">
									<table className="w-full text-sm">
										<thead>
											<tr>
												<HeaderCell
													columnName="sampleId"
													displayName="Mẫu thử"
													isFilterable={true}
													isSortable={true}
													isFiltered={isColumnFiltered('sampleId')}
													sortDirection={filters.columnSort === 'sampleId' ? filters.sortBy : null}
													onFilter={handleColumnFilter}
													onSort={handleColumnSort}
													className="min-w-[140px]"
												/>
												<HeaderCell
													columnName="parameterName"
													displayName="Chỉ tiêu"
													isFilterable={true}
													isSortable={false}
													isFiltered={isColumnFiltered('parameterName')}
													onFilter={handleColumnFilter}
													className="min-w-[120px]"
												/>
												<HeaderCell
													columnName="protocolSource"
													displayName="Nguồn"
													isFilterable={true}
													isSortable={false}
													isFiltered={isColumnFiltered('protocolSource')}
													onFilter={handleColumnFilter}
													className="min-w-[100px]"
												/>
												<HeaderCell
													columnName="protocolCode"
													displayName="Phương pháp"
													isFilterable={true}
													isSortable={false}
													isFiltered={isColumnFiltered('protocolCode')}
													onFilter={handleColumnFilter}
													className="min-w-[160px]"
												/>
												<HeaderCell
													columnName="resultValue"
													displayName="Kết quả"
													isFilterable={false}
													isSortable={true}
													sortDirection={filters.columnSort === 'resultValue' ? filters.sortBy : null}
													onSort={handleColumnSort}
													className="min-w-[140px]"
												/>
												<HeaderCell
													columnName="resultUnit"
													displayName="Đơn vị"
													isFilterable={false}
													isSortable={false}
													className="min-w-[100px]"
												/>
												<HeaderCell
													columnName="deadline"
													displayName="Hạn trả"
													isFilterable={true}
													isSortable={true}
													isFiltered={isColumnFiltered('deadline')}
													sortDirection={filters.columnSort === 'deadline' ? filters.sortBy : null}
													onFilter={handleColumnFilter}
													onSort={handleColumnSort}
													className="min-w-[100px]"
												/>
												<HeaderCell
													columnName="technicianId"
													displayName="Người phụ trách"
													isFilterable={true}
													isSortable={false}
													isFiltered={isColumnFiltered('technicianId')}
													onFilter={handleColumnFilter}
													className="min-w-[150px]"
												/>
												<HeaderCell
													columnName="docId"
													displayName="Doc"
													isFilterable={true}
													isSortable={false}
													isFiltered={isColumnFiltered('docId')}
													onFilter={handleColumnFilter}
													className="min-w-[80px]"
												/>
												<th className="bg-sky-400 border border-b-2 border-gray-300 px-3 py-2 text-left font-bold text-gray-800 min-w-[75px]">
													Ghi chú
												</th>
											</tr>
										</thead>
										<tbody>
											{Array.isArray(processingSample) && processingSample.length > 0 ? (
												processingSample.map((group, groupIndex) =>
													group.analyses.map((item, analysisIndex) => (
														<tr
															key={`${group.sampleId}-${item.id}`}
															className={`border border-gray-300 hover:bg-gray-50 ${
																selectedAnalysisIds.has(item.id) ? 'row-selected' : ''
															} ${isAnalysisBlocked(item.id) ? 'row-blocked' : ''}`}
															onMouseDown={(e) => handleMouseDown(item.id, e)}
															onMouseEnter={() => handleMouseEnter(item.id)}
															onDoubleClick={() => {
																if (onDoubleClick && !isAnalysisBlocked(item.id)) {
																	onDoubleClick({ analysis: item });
																}
															}}
														>
															{/* Mẫu thử - Only show for first analysis of each sample */}
															{analysisIndex === 0 ? (
																<td
																	className={`border border-gray-300 px-3 py-2 text-left align-top w-1/6 max-w-[16.666667%] min-w-[140px] bg-gradient-to-br from-slate-50 to-slate-100 relative ${
																		group.status === 1 ? 'border-l-4 border-l-red-500 ' : 'border-l-4 border-l-blue-500'
																	}`}
																	rowSpan={group.analyses.length}
																>
																	<div className="text-sm">
																		<div
																			className={`font-semibold ${
																				group.status === 1 ? 'text-red-600' : 'text-blue-800'
																			}`}
																		>
																			{item.sampleId}
																		</div>
																		<div className="text-gray-700">{group.sampleName || 'N/A'}</div>
																		<div className="text-xs text-gray-600">
																			<span className="font-medium">Nền mẫu:</span> {group.matrix || 'N/A'}
																		</div>
																		{group.sampleDescription && (
																			<div className="text-xs text-gray-600">
																				<span className="font-medium">Mô tả:</span> {group.sampleDescription}
																			</div>
																		)}
																	</div>
																</td>
															) : null}

															{/* Chỉ tiêu */}
															<td className="border border-gray-300 px-3 py-2 text-left">
																<span className="text-sm font-medium">{item.parameterName || 'N/A'}</span>
															</td>

															{/* Nguồn */}
															<td className="border border-gray-300 px-3 py-2 text-left">
																<span className="text-sm font-medium">{item.protocolSource || '--'}</span>
															</td>

															{/* Phương pháp */}
															<td className="border border-gray-300 px-3 py-2 text-left">
																<span className="text-sm">{item.protocolCode || '--'}</span>
															</td>

															{/* Kết quả */}
															<td
																className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-blue-50"
																onClick={(e) => {
																	e.stopPropagation();
																	handleCellClick(item.id, 'resultValue', item.resultValue);
																}}
															>
																{editingCell?.analysisId === item.id && editingCell?.column === 'resultValue' ? (
																	<input
																		type="text"
																		value={editValue}
																		onChange={(e) => setEditValue(e.target.value)}
																		onBlur={handleCellBlur}
																		onKeyDown={handleKeyDown}
																		onClick={(e) => e.stopPropagation()}
																		onMouseDown={(e) => e.stopPropagation()}
																		className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
																		autoFocus
																	/>
																) : (
																	<span
																		className="text-sm"
																		dangerouslySetInnerHTML={{ __html: item.resultValue || '--' }}
																	></span>
																)}
															</td>

															{/* Đơn vị */}
															<td
																className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-blue-50"
																onClick={(e) => {
																	e.stopPropagation();
																	handleCellClick(item.id, 'resultUnit', item.resultUnit);
																}}
															>
																{editingCell?.analysisId === item.id && editingCell?.column === 'resultUnit' ? (
																	<>
																		<input
																			id={`unit-input-${item.id}`}
																			type="text"
																			value={editValue}
																			onChange={(e) => {
																				const newValue = e.target.value;
																				setEditValue(newValue);
																				setUnitInput(newValue);
																				setUnitPage(1);
																				setShowUnitDropdown(newValue.length >= 1);
																			}}
																			onBlur={handleCellBlur}
																			onKeyDown={handleKeyDown}
																			onClick={(e) => e.stopPropagation()}
																			onMouseDown={(e) => e.stopPropagation()}
																			className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
																			autoFocus
																		/>
																		{showUnitDropdown &&
																			getPaginatedUnits(unitInput).length > 0 &&
																			createPortal(
																				<div
																					className="absolute bg-white border rounded shadow-lg z-[9999]"
																					style={{
																						width: document.getElementById(`unit-input-${item.id}`)?.offsetWidth + 'px',
																						top:
																							document.getElementById(`unit-input-${item.id}`)?.getBoundingClientRect()
																								.bottom + window.scrollY,
																						left:
																							document.getElementById(`unit-input-${item.id}`)?.getBoundingClientRect()
																								.left + window.scrollX,
																					}}
																				>
																					{getPaginatedUnits(unitInput).map((unit, index) => (
																						<div
																							key={index}
																							className="p-2 text-sm cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																							onMouseDown={(e) => {
																								e.preventDefault();
																								setEditValue(unit);
																								setShowUnitDropdown(false);
																								// Trigger blur to save
																								setTimeout(() => {
																									handleCellBlur();
																								}, 100);
																							}}
																						>
																							<p>{unit}</p>
																						</div>
																					))}
																					{filterUnits(unitInput).length > unitItemsPerPage && (
																						<div className="flex justify-between p-2 bg-gray-100">
																							<button
																								className="px-2 py-1 border rounded disabled:opacity-50"
																								onClick={() => handleUnitPageChange(unitPage - 1)}
																								disabled={unitPage === 1}
																							>
																								Prev
																							</button>
																							<span className="text-sm">
																								{unitPage}/{Math.ceil(filterUnits(unitInput).length / unitItemsPerPage)}
																							</span>
																							<button
																								className="px-2 py-1 border rounded disabled:opacity-50"
																								onClick={() => handleUnitPageChange(unitPage + 1)}
																								disabled={
																									unitPage >=
																									Math.ceil(filterUnits(unitInput).length / unitItemsPerPage)
																								}
																							>
																								Next
																							</button>
																						</div>
																					)}
																				</div>,
																				document.body,
																			)}
																	</>
																) : (
																	<span
																		className="text-sm"
																		dangerouslySetInnerHTML={{ __html: item.resultUnit || '--' }}
																	></span>
																)}
															</td>

															{/* Hạn trả */}
															<td className="border border-gray-300 px-3 py-2 text-left">
																<span className={`text-sm ${getDeadlineColor(item.deadline)}`}>
																	{item.deadline ? formatDate(item.deadline) : 'N/A'}
																</span>
															</td>

															{/* Người phụ trách */}
															<td className="border border-gray-300 px-3 py-2 text-left">
																<span className="text-sm">{getTechnicianName(item)}</span>
															</td>

															{/* Doc */}
															<td className="border border-gray-300 px-3 py-2 text-center">
																{item.docId ? (
																	<div
																		className="flex items-center justify-center cursor-pointer hover:bg-blue-50 p-1 rounded"
																		onClick={(e) => {
																			e.stopPropagation();
																			handleDocIdClick(item.docId);
																		}}
																		onMouseEnter={(e) => showTooltip(e, item.docId, 'left')}
																		onMouseLeave={hideTooltip}
																	>
																		<MdAttachFile className="w-5 h-5 text-blue-600" />
																	</div>
																) : (
																	<div className="flex items-center justify-center p-1">
																		<span className="text-gray-300">--</span>
																	</div>
																)}
															</td>

															{/* Ghi chú */}
															<td className="border border-gray-300 px-3 py-2 text-center">
																<div
																	className="flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
																	onClick={(e) => handleNoteClick(item, e)}
																	onMouseEnter={(e) => {
																		if (item.note) {
																			showTooltip(e, item.note, 'left');
																		}
																	}}
																	onMouseLeave={hideTooltip}
																	title={item.note ? 'Click để xem/thêm ghi chú' : 'Click để thêm ghi chú'}
																>
																	{item.note ? (
																		<span className="text-2xl">📝</span>
																	) : (
																		<span className="text-2xl text-gray-400">📋</span>
																	)}
																</div>
															</td>
														</tr>
													)),
												)
											) : (
												<tr>
													<td colSpan="10" className="border border-gray-300 px-3 py-12 text-center">
														<div className="flex flex-col items-center justify-center">
															<FaSearch size={32} className="mb-2 opacity-50 text-gray-400" />
															<p className="text-base text-gray-500">Không có dữ liệu mẫu thử</p>
														</div>
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>

								{/* Pagination */}
								{Array.isArray(processingSample) && processingSample.length > 0 && (
									<div className="p-4 pt-2 bg-white border-t border-gray-200">
										<div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
											<div className="flex items-center space-x-2">
												<label className="text-sm text-gray-700 font-medium">Số mẫu mỗi trang:</label>
												<select
													value={itemsPerPage}
													onChange={(e) => {
														const newItemsPerPage = Number(e.target.value);
														handleItemsPerPageChange(newItemsPerPage);
													}}
													className="border border-gray-300 rounded-md p-2 bg-white text-black focus:border-blue-500"
												>
													<option value={30}>30</option>
													<option value={50}>50</option>
													<option value={100}>100</option>
													<option value={200}>200</option>
												</select>
												<span className="text-sm text-gray-600 ml-4">
													Hiển thị {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} -{' '}
													{Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems} biên bản bàn
													giao
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
						</div>
					)}

					{/* Filter Modal */}
					{activeFilterColumn && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
							<div
								data-filter-modal
								className="bg-white rounded-lg p-6 w-[500px] h-[600px] overflow-hidden flex flex-col"
							>
								<div className="flex justify-between items-center mb-4">
									<h3 className="text-lg font-semibold">
										Lọc theo{' '}
										{activeFilterColumn === 'sampleId'
											? 'Mẫu thử'
											: activeFilterColumn === 'parameterName'
											? 'Chỉ tiêu'
											: activeFilterColumn === 'protocolSource'
											? 'Nguồn'
											: activeFilterColumn === 'protocolCode'
											? 'Phương pháp'
											: activeFilterColumn === 'deadline'
											? 'Hạn trả'
											: activeFilterColumn === 'technicianId'
											? 'Người phụ trách'
											: activeFilterColumn === 'technicianIds'
											? 'Người thực hiện'
											: activeFilterColumn === 'docId'
											? 'Doc'
											: activeFilterColumn}
									</h3>
									<button onClick={closeFilterModal} className="text-gray-500 hover:text-gray-700">
										✕
									</button>
								</div>

								{filterLoading ? (
									<div className="flex items-center justify-center py-8">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
										<span className="ml-2 text-gray-600">Đang tải...</span>
									</div>
								) : (
									<>
										{/* Special filters for resultValue, resultUnit, deadline, docId */}
										{activeFilterColumn === 'resultValue' ? (
											<div className="space-y-2">
												<h4 className="text-sm font-semibold text-gray-700 mb-3">Lọc theo kết quả</h4>
												<div className="space-y-2">
													<button
														onClick={() => applySpecialFilter('resultValue', 'submitted')}
														className="w-full text-left p-2 rounded hover:bg-blue-50 border border-gray-200 text-sm"
													>
														Đã có kết quả
													</button>
													<button
														onClick={() => applySpecialFilter('resultValue', 'not submitted')}
														className="w-full text-left p-2 rounded hover:bg-blue-50 border border-gray-200 text-sm"
													>
														Chưa có kết quả
													</button>
												</div>
												<div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
													<button
														onClick={cancelFilter}
														className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
													>
														Hủy
													</button>
													{/* Clear filter button - only show if filter is applied */}
													{filters.headerFilters[activeFilterColumn] && (
														<button
															onClick={() => {
																clearColumnFilter();
																setActiveFilterColumn(null);
															}}
															className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
														>
															Hủy lọc
														</button>
													)}
												</div>
											</div>
										) : activeFilterColumn === 'resultUnit' ? (
											<div className="space-y-2">
												<h4 className="text-sm font-semibold text-gray-700 mb-3">Lọc theo đơn vị</h4>
												<div className="space-y-2">
													<button
														onClick={() => applySpecialFilter('resultUnit', 'submitted')}
														className="w-full text-left p-2 rounded hover:bg-blue-50 border border-gray-200 text-sm"
													>
														Đã có đơn vị
													</button>
													<button
														onClick={() => applySpecialFilter('resultUnit', 'not submitted')}
														className="w-full text-left p-2 rounded hover:bg-blue-50 border border-gray-200 text-sm"
													>
														Chưa có đơn vị
													</button>
												</div>
												<div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
													<button
														onClick={cancelFilter}
														className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
													>
														Hủy
													</button>
													{/* Clear filter button - only show if filter is applied */}
													{filters.headerFilters[activeFilterColumn] && (
														<button
															onClick={() => {
																clearColumnFilter();
																setActiveFilterColumn(null);
															}}
															className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
														>
															Hủy lọc
														</button>
													)}
												</div>
											</div>
										) : (
											activeFilterColumn === 'deadline' && (
												<div className="mb-4 p-3 bg-gray-50 rounded-lg">
													<div className="flex items-center justify-between mb-2">
														<span className="text-sm font-medium text-gray-700">Chọn khoảng thời gian</span>
														<button
															onClick={() => setShowDateRange(!showDateRange)}
															className="text-sm text-blue-600 hover:text-blue-800"
														>
															<FaCalendarAlt className="inline mr-1" />
															{showDateRange ? 'Ẩn' : 'Hiện'} chọn ngày
														</button>
													</div>

													{showDateRange && (
														<div className="grid grid-cols-2 gap-2">
															<div>
																<label className="text-xs text-gray-600 mb-1 block">Từ ngày:</label>
																<DatePicker
																	selected={startDate}
																	onChange={(date) => setStartDate(date)}
																	selectsStart
																	startDate={startDate}
																	endDate={endDate}
																	placeholderText="Chọn ngày bắt đầu"
																	className="w-full p-2 bg-white border border-gray-300 rounded text-sm focus:border-blue-500"
																	dateFormat="dd/MM/yyyy"
																/>
															</div>
															<div>
																<label className="text-xs text-gray-600 mb-1 block">Đến ngày:</label>
																<DatePicker
																	selected={endDate}
																	onChange={(date) => setEndDate(date)}
																	selectsEnd
																	startDate={startDate}
																	endDate={endDate}
																	minDate={startDate}
																	placeholderText="Chọn ngày kết thúc"
																	className="w-full p-2 bg-white border border-gray-300 rounded text-sm focus:border-blue-500"
																	dateFormat="dd/MM/yyyy"
																/>
															</div>
														</div>
													)}

													{(startDate || endDate) && (
														<div className="mt-2 flex justify-between">
															<span className="text-xs text-gray-600">
																{startDate && endDate
																	? `Từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString(
																			'vi-VN',
																	  )}`
																	: startDate
																	? `Từ ${startDate.toLocaleDateString('vi-VN')}`
																	: endDate
																	? `Đến ${endDate.toLocaleDateString('vi-VN')}`
																	: ''}
															</span>
															<button
																onClick={() => {
																	setStartDate(null);
																	setEndDate(null);
																}}
																className="text-xs text-red-600 hover:text-red-800"
															>
																Xóa ngày
															</button>
														</div>
													)}
												</div>
											)
										)}

										{/* Search input - hide for docId column */}
										{activeFilterColumn !== 'docId' && (
											<div className="flex items-center space-x-2 mb-3">
												<input
													type="text"
													placeholder={`Tìm kiếm trong ${
														activeFilterColumn === 'sampleId'
															? 'Mẫu thử'
															: activeFilterColumn === 'parameterName'
															? 'Chỉ tiêu'
															: activeFilterColumn === 'protocolSource'
															? 'Nguồn'
															: activeFilterColumn === 'protocolCode'
															? 'Phương pháp'
															: activeFilterColumn === 'deadline'
															? 'Hạn trả'
															: activeFilterColumn === 'technicianId'
															? 'Người phụ trách'
															: activeFilterColumn === 'technicianIds'
															? 'Người thực hiện'
															: activeFilterColumn
													}...`}
													value={filterSearchTerm}
													onChange={(e) => setFilterSearchTerm(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === 'Backspace' || e.key === 'Delete') {
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
												disabled={
													activeFilterColumn === 'resultValue' || activeFilterColumn === 'resultUnit'
														? false // Special filters don't need selection
														: activeFilterColumn === 'deadline'
														? selectedFilterValues.length === 0 && !startDate && !endDate
														: selectedFilterValues.length === 0
												}
												className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												Xác nhận (
												{activeFilterColumn === 'resultValue' || activeFilterColumn === 'resultUnit'
													? '1'
													: activeFilterColumn === 'deadline'
													? selectedFilterValues.length + (startDate || endDate ? 1 : 0)
													: selectedFilterValues.length}
												)
											</button>
										</div>
									</>
								)}
							</div>
						</div>
					)}
				</div>
				{/* Login Popup */}
				<LoginPopup isOpen={showLoginPopup} onClose={closeLoginPopup} onLoginSuccess={handleLoginSuccess} />
				{/* Tooltip Portal */}
				{tooltip.visible &&
					createPortal(
						<div
							className={`custom-tooltip ${tooltip.visible ? 'visible' : ''} ${tooltip.position || 'above'}`}
							style={{
								left: `${tooltip.x}px`,
								top: `${tooltip.y}px`,
								whiteSpace: 'pre-wrap',
							}}
						>
							{tooltip.content}
						</div>,
						document.body,
					)}
				{/* Relogin Confirmation Modal */}
				{/* Session Confirmation Dialog */}
				{showSessionConfirm && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
						<div className="bg-white rounded-lg p-6 w-[450px] relative shadow-xl">
							<h2 className="text-xl font-semibold mb-4 text-gray-800">Xác nhận người cập nhật</h2>
							<p className="text-gray-700 mb-4">
								Người cập nhật: <span className="font-semibold">{currentUser?.identityName || 'N/A'}</span>
							</p>
							<p className="text-gray-600 text-sm mb-6">Vui lòng xác nhận để bắt đầu phiên nhập kết quả.</p>

							<div className="flex justify-end space-x-3">
								<button
									onClick={() => setShowSessionConfirm(false)}
									className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
								>
									Hủy bỏ
								</button>
								<button
									onClick={handleRelogin}
									className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
								>
									Đăng nhập lại
								</button>
								<button
									onClick={handleConfirmUser}
									className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
								>
									Xác nhận
								</button>
							</div>
						</div>
					</div>
				)}
				{/* End Session Confirmation Dialog - Using Component */}
				<ConfirmLabResult
					isOpen={showEndSessionDialog}
					onClose={() => setShowEndSessionDialog(false)}
					onConfirm={async (experimentData) => {
						// Update handleEndSession to accept experiment data
						await handleEndSessionWithExperiment(experimentData);
					}}
					onCancel={handleCancelAllChanges}
					analyses={Array.from(pendingChanges.values())}
					isLoading={isSessionUpdating}
				/>{' '}
				{/* Cancel Confirmation Dialog */}
				{showCancelConfirm && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
						<div className="bg-white rounded-lg p-6 w-[450px] relative shadow-xl">
							<h2 className="text-xl font-semibold mb-4 text-red-600">⚠ Cảnh báo</h2>
							<p className="text-gray-700 mb-6">
								Bạn có chắc chắn muốn hủy tất cả <span className="font-semibold">{pendingChanges.size}</span> thay đổi
								chưa lưu?
							</p>

							<div className="flex justify-end space-x-3">
								<button
									onClick={() => setShowCancelConfirm(false)}
									className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
								>
									Quay lại
								</button>
								<button
									onClick={confirmCancelChanges}
									className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
								>
									Xác nhận hủy
								</button>
							</div>
						</div>
					</div>
				)}
				{/* Modal Ghi chú */}
				{showNoteModal && selectedAnalysisForNote && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
							<div className="px-6 py-4 border-b border-gray-200">
								<h3 className="text-lg font-semibold text-blue-600">Ghi chú</h3>
								<p className="text-sm text-gray-600 mt-1">
									Mẫu: {selectedAnalysisForNote.sampleId} - Chỉ tiêu: {selectedAnalysisForNote.parameterName}
								</p>
							</div>

							<div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
								{/* Ghi chú cũ - chỉ xem */}
								{selectedAnalysisForNote.note && (
									<div className="mb-4">
										<label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú hiện tại:</label>
										<div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">
											{selectedAnalysisForNote.note}
										</div>
									</div>
								)}

								{/* Thêm ghi chú mới */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										{selectedAnalysisForNote.note ? 'Thêm ghi chú mới:' : 'Ghi chú:'}
									</label>
									<textarea
										value={newNoteText}
										onChange={(e) => setNewNoteText(e.target.value)}
										placeholder="Nhập nội dung ghi chú..."
										className="w-full bg-white border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										rows={4}
									/>
								</div>
							</div>

							<div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
								<button
									onClick={() => {
										setShowNoteModal(false);
										setSelectedAnalysisForNote(null);
										setNewNoteText('');
									}}
									className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
									disabled={isUpdatingNote}
								>
									Hủy
								</button>
								<button
									onClick={handleUpdateNote}
									disabled={isUpdatingNote || !newNoteText.trim()}
									className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
								>
									{isUpdatingNote ? (
										<>
											<span className="mr-2">Đang cập nhật...</span>
											<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
													fill="none"
												/>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												/>
											</svg>
										</>
									) : (
										'Cập nhật'
									)}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	},
);

FilterableSample.displayName = 'FilterableSample';

export default FilterableSample;
