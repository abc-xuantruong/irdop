import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { GlobalContext } from "../../contexts/GlobalContext";
import { apiGet, apiPost } from "../../contexts/helperFunctionCallAPI";
import { convertValueToHTML, convertHTMLToValue } from "../../contexts/formatHelpers";
import { useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { IoIosArrowDown } from "react-icons/io";
import { MdAttachFile } from "react-icons/md";
import { FaFilter, FaSort, FaSortUp, FaSortDown, FaCalendarAlt, FaTimes } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LabBulkUpdate from "./LabBulkUpdate";
import LoginPopup from "./LoginPopup";
import ConfirmLabResult from "../noti box/confirmLabResult";
import Cookies from "js-cookie";
import axios from "axios";
import Swal from "sweetalert2";

// Custom CSS for thin scrollbars and display experience
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

/* Ensure non-selected rows don't interfere with selected rows */
tr:not(.row-selected):hover {
	background-color: #eff6ff !important;
}

tr:not(.row-selected):hover td {
	background-color: inherit !important;
}

.user-select-none {
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}

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

/* Sample Tooltip Styles */
.sample-tooltip {
	position: absolute;
	background: white;
	border: 1px solid #d1d5db;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	border-radius: 8px;
	padding: 12px;
	font-size: 12px;
	white-space: normal;
	word-wrap: break-word;
	pointer-events: none;
	z-index: 10001;
	opacity: 0;
	transition: opacity 0.2s ease-in-out;
	min-width: 200px;
	max-width: 300px;
}

.sample-tooltip.visible {
	opacity: 1;
}

.sample-tooltip::after,
.sample-tooltip::before {
	content: '';
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	border: 6px solid transparent;
}

.sample-tooltip.above::after {
	top: 100%;
	border-top-color: white;
}

.sample-tooltip.above::before {
	top: 100%;
	border-top-color: #d1d5db;
	margin-top: 1px;
}

.sample-tooltip.below::after {
	bottom: 100%;
	border-bottom-color: white;
}

.sample-tooltip.below::before {
	bottom: 100%;
	border-bottom-color: #d1d5db;
	margin-bottom: 1px;
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
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

// HeaderCell component to manage filter and sort functionality
const HeaderCell = ({ columnName, displayName, isFilterable = true, isSortable = true, isFiltered, sortDirection, onFilter, onSort, onClearFilter, className = "", width = "auto" }) => {
    const handleHeaderClick = (e) => {
        // If clicking on filter icon, open filter
        if (e.target.closest(".filter-icon")) {
            e.stopPropagation();
            if (isFilterable && onFilter) {
                onFilter(columnName, e);
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

        if (sortDirection === "ASC") {
            return <FaSortUp className="text-blue-600" />;
        } else if (sortDirection === "DESC") {
            return <FaSortDown className="text-blue-600" />;
        } else {
            return <FaSort className="text-gray-400" />;
        }
    };

    return (
        <th
            className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider border-b-2 border-blue-700 hover:bg-blue-200 bg-blue-100 relative cursor-pointer ${className}`}
            style={{ width }}
            onClick={handleHeaderClick}
        >
            <div className="flex items-center justify-between gap-2 overflow-hidden">
                <span className="truncate cursor-pointer hover:text-gray-600 flex-1">{displayName}</span>

                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Filter icon - only show if filterable */}
                    {isFilterable && (
                        <button
                            className={`filter-icon p-1 rounded hover:bg-blue-300 transition-colors ${isFiltered ? "text-blue-600" : "text-gray-500"}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFilter(columnName, e);
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

const ProcessingAnalysis = ({ onNavigateToLab, viewMode = "admin" }) => {
    const { technicians, currentUser } = useContext(GlobalContext);
    const location = useLocation();
    const navigate = useNavigate();

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
    const [error, setError] = useState(null);

    // Selection states
    const [selectedAnalysisIds, setSelectedAnalysisIds] = useState(new Set());
    const [selectedRowsData, setSelectedRowsData] = useState(new Map());
    const [showBulkEdit, setShowBulkEdit] = useState(false);

    // Drag selection states
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartId, setDragStartId] = useState(null);

    // Sidebar state
    const [parameterSearchTerm, setParameterSearchTerm] = useState("");
    const [parametersData, setParametersData] = useState({
        analysis: [],
        sample: [],
        matrix: [],
        technician: [],
        pagination: {},
    });
    const [selectedParameter, setSelectedParameter] = useState("");
    const [sidebarExpandedSections, setSidebarExpandedSections] = useState({
        analysis: true, // Default expanded
    });
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Table state
    const [sortConfig, setSortConfig] = useState({ column: "sampleId", direction: "ASC" });

    // Bulk edit states - REMOVED

    // Filter states
    const [filters, setFilters] = useState({
        columns: ["id", "sampleId", "sampleName", "parameterName", "matrix", "protocolSource", "protocolCode", "resultValue", "resultUnit", "deadline", "technicianId", "docId", "note"],
        parameters: [],
        protocols: [],
        headerFilters: {},
        columnSort: "sampleId",
        sortBy: "ASC",
    }); // Filter creation states
    const [isFilterCreationMode, setIsFilterCreationMode] = useState(false);
    const [activeFilterColumn, setActiveFilterColumn] = useState(null);
    const [filterSearchTerm, setFilterSearchTerm] = useState("");
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
    const [editValue, setEditValue] = useState("");

    // Unit suggestions states
    const [uniqueUnits, setUniqueUnits] = useState([]);
    const [unitInput, setUnitInput] = useState("");
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const [unitPage, setUnitPage] = useState(1);
    const unitItemsPerPage = 6;
    const unitInputRef = useRef(null);

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
    const SESSION_STORAGE_KEY = "processingAnalysis_pendingChanges";

    // Store original analyses before editing for comparison
    const [originalAnalyses, setOriginalAnalyses] = useState(new Map());

    // Note modal states
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedAnalysisForNote, setSelectedAnalysisForNote] = useState(null);
    const [newNoteText, setNewNoteText] = useState("");
    const [isUpdatingNote, setIsUpdatingNote] = useState(false);

    // Drag selection state - REMOVED

    // Scroll position state for maintaining position during updates
    const [scrollPosition, setScrollPosition] = useState(0);
    const scrollContainerRef = useRef(null);

    // State to track if this is the initial load
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // State to prevent debounce useEffect from running during initial load
    const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);

    // Technician dropdown state for sidebar header
    const [technicianDropdownOpen, setTechnicianDropdownOpen] = useState(false);
    const [selectedTechnicianName, setSelectedTechnicianName] = useState("TOÀN BỘ");

    // Tooltip state
    const [tooltip, setTooltip] = useState({
        visible: false,
        content: "",
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
        content: "",
        loading: false,
        docId: null,
    });

    // File preview states (similar to ExperimentLog)
    const [previewFile, setPreviewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");

    // Ref to prevent unnecessary API calls and track request sequence
    const lastSearchTermRef = useRef("");
    const isCurrentlyFetchingRef = useRef(false);
    const requestSequenceRef = useRef(0);
    const prevLocationSearchRef = useRef("");

    // Handle drag selection
    // Mouse event handlers - REMOVED

    // Mouse event listeners - REMOVED

    // Click outside to close filter
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeFilterColumn && !event.target.closest(".filter-box") && !event.target.closest(".filter-dropdown") && !event.target.closest("[data-filter-column]")) {
                cancelFilter();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeFilterColumn]);

    // Enforce technician filter if viewMode is user
    useEffect(() => {
        if (viewMode === "user" && currentUser?.identity_uid) {
            const queryParams = new URLSearchParams(location.search);
            const currentTechId = queryParams.get("technicianId");
            const myId = JSON.stringify([currentUser.identity_uid]);

            if (currentTechId !== myId) {
                queryParams.set("technicianId", myId);
                queryParams.delete("page");
                navigate(`${location.pathname}?${queryParams.toString()}`, { replace: true });
            }
        }
    }, [viewMode, currentUser, location.search, navigate]);

    // Initial data loading
    const loadInitialData = async () => {
        setIsInitialDataLoading(true);
        const searchParams = new URLSearchParams(location.search);

        const hasFilterParams = Array.from(searchParams.keys()).some((key) =>
            [
                "parameters",
                "protocols",
                "columnSort",
                "sortBy",
                "sampleId",
                "parameterName",
                "protocolCode",
                "matrix",
                "deadline",
                "docId",
                "resultValue",
                "technicianId",
                "protocolSource",
                "deadlineStartAt",
                "deadlineEndAt",
                "deadlineType",
            ].includes(key),
        );

        let newFilters = { ...filters };
        let newCurrentPage = currentPage;
        let newItemsPerPage = itemsPerPage;
        let newSortConfig = { ...sortConfig };

        // Always parse query parameters (not just when hasFilterParams is true)
        searchParams.forEach((value, key) => {
            if (key === "itemsPerPage") {
                newItemsPerPage = parseInt(value) || 100;
            } else if (key === "page") {
                newCurrentPage = parseInt(value) || 1;
            } else if (key === "parameters") {
                try {
                    const parsedParameters = JSON.parse(value);
                    newFilters.parameters = Array.isArray(parsedParameters) ? parsedParameters : [];
                } catch (e) {
                    newFilters.parameters = [];
                }
            } else if (key === "protocols") {
                try {
                    const parsedProtocols = JSON.parse(value);
                    newFilters.protocols = Array.isArray(parsedProtocols) ? parsedProtocols : [];
                } catch (e) {
                    newFilters.protocols = [];
                }
            } else if (key === "columnSort") {
                newFilters.columnSort = value;
                newSortConfig.column = value;
            } else if (key === "sortBy") {
                newFilters.sortBy = value;
                newSortConfig.direction = value;
            } else if (key !== "mode") {
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

        // Load data FIRST before updating states to avoid triggering other useEffects
        await Promise.all([fetchParameters("", newFilters), fetchAnalysisData(false, newFilters, newCurrentPage, newItemsPerPage)]);

        // Update states AFTER data is loaded
        if (newCurrentPage !== currentPage) setCurrentPage(newCurrentPage);
        if (newItemsPerPage !== itemsPerPage) setItemsPerPage(newItemsPerPage);
        if (JSON.stringify(newSortConfig) !== JSON.stringify(sortConfig)) setSortConfig(newSortConfig);
        if (JSON.stringify(newFilters) !== JSON.stringify(filters)) setFilters(newFilters);

        setIsInitialDataLoading(false);
    };

    // Fetch analysis data
    const fetchAnalysisData = async (preserveScroll = false, customFilters = null, customCurrentPage = null, customItemsPerPage = null) => {
        // Save current scroll position if preserving scroll
        if (preserveScroll && scrollContainerRef.current) {
            setScrollPosition(scrollContainerRef.current.scrollTop);
        }

        setLoading(true);
        setError(null); // Clear any previous errors

        // Don't clear data immediately - keep old data while loading to prevent flickering
        // Only clear on error or when new data arrives

        try {
            // Use custom parameters if provided, otherwise use current state
            const useFilters = customFilters || filters;
            const useCurrentPage = customCurrentPage || currentPage;
            const useItemsPerPage = customItemsPerPage || itemsPerPage;

            // Increment request sequence to track this request
            const currentRequestId = ++requestSequenceRef.current;

            // Prepare columns for API
            const apiColumns = [...useFilters.columns, "technician"];
            if (!apiColumns.includes("id")) {
                apiColumns.push("id");
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
                requestBody.parameterName = [...useFilters.parameters];
            }

            if (useFilters.protocols.length > 0) {
                requestBody.protocolCode = [...useFilters.protocols];
            }

            // Add header filters
            Object.keys(useFilters.headerFilters).forEach((column) => {
                const filterValue = useFilters.headerFilters[column];

                if (column === "sampleId" && filterValue) {
                    requestBody.sampleId = Array.isArray(filterValue) ? filterValue : [filterValue];
                } else if (column === "parameterName" && filterValue) {
                    requestBody.parameterName = Array.isArray(filterValue) ? filterValue : [filterValue];
                } else if (column === "matrix" && filterValue) {
                    requestBody.matrix = Array.isArray(filterValue) ? filterValue : [filterValue];
                } else if (column === "protocolCode" && filterValue) {
                    requestBody.protocolCode = Array.isArray(filterValue) ? filterValue : [filterValue];
                } else if (column === "protocolSource" && filterValue) {
                    requestBody.protocolSource = Array.isArray(filterValue) ? filterValue : [filterValue];
                } else if (column === "technicianId" && filterValue) {
                    requestBody.technicianId = Array.isArray(filterValue) ? filterValue : [filterValue];
                } else if (column === "status" && filterValue === 1) {
                    // Handle urgent filter (status = 1)
                    requestBody.status = 1;
                } else if (column === "done" && filterValue === true) {
                    // Handle done filter (sufficient results)
                    requestBody.done = true;
                } else if (column === "overdue" && filterValue === true) {
                    // Handle overdue filter (today's deadline)
                    requestBody.overdue = true;
                } else if (column === "deadline" && filterValue) {
                    // Separate handling for date range and checkbox values
                    let hasDateRange = false;
                    let checkboxValues = [];

                    if (Array.isArray(filterValue)) {
                        // Process array to separate date range objects from regular values
                        filterValue.forEach((item) => {
                            if (typeof item === "object" && item !== null && (item.start || item.end)) {
                                // This is a date range object
                                if (!hasDateRange) {
                                    if (item.start) requestBody.deadlineStartAt = item.start;
                                    if (item.end) requestBody.deadlineEndAt = item.end;
                                    hasDateRange = true;
                                }
                            } else if (item && typeof item === "string") {
                                // This is a checkbox value
                                checkboxValues.push(item);
                            }
                        });
                    } else if (typeof filterValue === "object" && filterValue !== null && (filterValue.start || filterValue.end)) {
                        // Single date range object
                        if (filterValue.start) requestBody.deadlineStartAt = filterValue.start;
                        if (filterValue.end) requestBody.deadlineEndAt = filterValue.end;
                        hasDateRange = true;
                    } else if (filterValue && typeof filterValue === "string") {
                        // Single checkbox value
                        checkboxValues.push(filterValue);
                    }

                    // Add checkbox values to deadline array if any exist
                    if (checkboxValues.length > 0) {
                        requestBody.deadline = checkboxValues;
                    }
                } else if (column === "docId" && filterValue) {
                    // Convert docId to array format and handle special values
                    const docValues = Array.isArray(filterValue) ? filterValue : [filterValue];
                    docValues.forEach((value) => {
                        if (value === "none") {
                            requestBody.hasDocument = false;
                        } else if (value === "pending") {
                            requestBody.docStatus = "pending";
                        } else if (value === "published") {
                            requestBody.docStatus = "published";
                        } else if (value === "has_file") {
                            requestBody.hasDocument = true;
                        } else if (value === "no_file") {
                            requestBody.hasDocument = false;
                        }
                    });
                } else if (column === "resultValue" && filterValue) {
                    // Convert resultValue to array format for special values
                    const resultValues = Array.isArray(filterValue) ? filterValue : [filterValue];
                    resultValues.forEach((value) => {
                        if (value === "submitted") {
                            requestBody.hasResult = true;
                        } else if (value === "not submitted") {
                            requestBody.hasResult = false;
                        } else {
                            // Handle custom resultValue filtering
                            if (!requestBody.resultValue) requestBody.resultValue = [];
                            requestBody.resultValue = requestBody.resultValue.concat(value);
                        }
                    });
                }
            });

            // Handle sidebar deadline filtering (different from header filters)
            const queryParams = new URLSearchParams(location.search);
            const deadlineStartAt = queryParams.get("deadlineStartAt");
            const deadlineEndAt = queryParams.get("deadlineEndAt");
            const sidebarDeadline = queryParams.get("deadline");

            // Priority: sidebar range filtering > sidebar specific date > header filtering
            if (deadlineStartAt && deadlineEndAt) {
                // Sidebar range filtering (3days, week)
                requestBody.deadlineStartAt = deadlineStartAt;
                requestBody.deadlineEndAt = deadlineEndAt;
                // Remove header deadline if present to avoid conflict
                delete requestBody.deadline;
            } else if (deadlineEndAt && !deadlineStartAt) {
                // Sidebar overdue filtering (today)
                requestBody.deadlineEndAt = deadlineEndAt;
                // Remove header deadline if present to avoid conflict
                delete requestBody.deadline;
            } else if (sidebarDeadline && !useFilters.headerFilters.deadline) {
                // Sidebar specific date (only if no header filter is active)
                requestBody.deadline = [sidebarDeadline];
            }

            // Debug log to check if protocolSource filter is added
            if (requestBody.protocolSource) {
            }

            // Add search term if present
            if (parameterSearchTerm) {
                requestBody.searchTerm = parameterSearchTerm;
            }

            const response = await apiPost(API_ENDPOINT, requestBody);

            // Check if this is still the most recent request
            if (currentRequestId !== requestSequenceRef.current) {
                return; // Discard this response as a newer request has been made
            }

            if (response?.status < 300) {
                const result = response.data;

                // Always update data with API response result, even if empty
                const apiResults = result?.result || [];

                // Force a clean update by using functional update
                setData(() => apiResults);

                // Update pagination from API response
                if (result?.pagination) {
                    setCurrentPage(result.pagination.currentPage);
                    setItemsPerPage(result.pagination.itemsPerPage);
                    setTotalItems(result.pagination.totalItems);
                    setTotalPages(result.pagination.totalPages);
                } else {
                    // Fallback for backward compatibility
                    const totalCount = result?.total || apiResults.length || 0;
                    setTotalItems(totalCount);
                    setTotalPages(Math.ceil(totalCount / itemsPerPage));
                }
            } else {
                throw new Error(`API request failed with status: ${response.status}`);
            }
        } catch (error) {
            setError("Lỗi khi tải dữ liệu: " + error.message);
            // Clear data on error to prevent showing stale data
            setData([]);
            setTotalItems(0);
            setTotalPages(0);
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
    const fetchParameters = async (searchTerm = "", customFilters = null) => {
        try {
            const useFilters = customFilters || filters;
            const queryParams = new URLSearchParams(location.search);

            const requestBody = {
                searchTerm: searchTerm,
                technicianIds: useFilters.headerFilters.technicianId || null,
            };

            // Handle deadline filtering - priority to specific deadline params from sidebar
            const deadlineStartAt = queryParams.get("deadlineStartAt");
            const deadlineEndAt = queryParams.get("deadlineEndAt");
            let deadline = queryParams.get("deadline") || useFilters.headerFilters.deadline;

            // Parse deadline if it's a JSON string from query params
            if (typeof deadline === "string" && deadline.startsWith("[")) {
                try {
                    deadline = JSON.parse(deadline);
                } catch (e) {
                    // If parsing fails, keep as string
                }
            }

            if (deadlineStartAt && deadlineEndAt) {
                // Sidebar range filtering (3days, week)
                requestBody.deadlineStartAt = deadlineStartAt;
                requestBody.deadlineEndAt = deadlineEndAt;
            } else if (deadlineEndAt) {
                // Sidebar overdue filtering (today)
                requestBody.deadlineEndAt = deadlineEndAt;
            } else if (deadline) {
                // Header filtering or sidebar specific date - separate date range from checkbox values
                let hasDateRange = false;
                let checkboxValues = [];

                if (Array.isArray(deadline)) {
                    // Process array to separate date range objects from regular values
                    deadline.forEach((item) => {
                        if (typeof item === "object" && item !== null && (item.start || item.end)) {
                            // This is a date range object
                            if (!hasDateRange) {
                                if (item.start) requestBody.deadlineStartAt = item.start;
                                if (item.end) requestBody.deadlineEndAt = item.end;
                                hasDateRange = true;
                            }
                        } else if (item && typeof item === "string") {
                            // This is a checkbox value
                            checkboxValues.push(item);
                        }
                    });
                } else if (typeof deadline === "object" && deadline !== null && (deadline.start || deadline.end)) {
                    // Single date range object
                    if (deadline.start) requestBody.deadlineStartAt = deadline.start;
                    if (deadline.end) requestBody.deadlineEndAt = deadline.end;
                    hasDateRange = true;
                } else if (deadline && typeof deadline === "string") {
                    // Single checkbox value
                    checkboxValues.push(deadline);
                }

                // Add checkbox values to deadline array if any exist
                if (checkboxValues.length > 0) {
                    requestBody.deadline = checkboxValues;
                }
            }
            const response = await apiPost(PARAMETER_API_ENDPOINT, requestBody);

            if (response.status < 300 && response.data) {
                setParametersData({
                    analysis: response.data.result || [],
                    sample: [], // Removed as per requirement
                    matrix: [], // Removed as per requirement
                    technician: [], // Removed as per requirement
                    pagination: response.data.pagination || {},
                });
            }
        } catch (error) {
            setError("Lỗi khi tải danh sách chỉ tiêu: " + error.message);
        }
    };

    // Fetch filter values for column
    const fetchFilterValues = async (column, searchTerm = "") => {
        setFilterLoading(true);
        try {
            const requestBody = {
                filterColumn: column,
                searchTerm: searchTerm,
                itemsPerPage: 50,
                page: 1,
            };

            // Add current filters to request body directly from filters state
            if (filters.headerFilters.sampleId) {
                requestBody.sampleId = filters.headerFilters.sampleId;
            }

            if (filters.headerFilters.parameterName) {
                requestBody.parameterName = filters.headerFilters.parameterName;
            }

            if (filters.headerFilters.protocolSource) {
                requestBody.protocolSource = filters.headerFilters.protocolSource;
            }

            if (filters.headerFilters.protocolCode) {
                requestBody.protocolCode = filters.headerFilters.protocolCode;
            }

            if (filters.headerFilters.matrix) {
                requestBody.matrix = filters.headerFilters.matrix;
            }

            if (filters.headerFilters.technicianId) {
                requestBody.technicianId = filters.headerFilters.technicianId;
            }

            if (filters.headerFilters.status === 1) {
                requestBody.status = 1;
            }

            if (filters.headerFilters.done === true) {
                requestBody.done = true;
            }

            if (filters.headerFilters.overdue === true) {
                requestBody.overdue = true;
            }

            if (filters.headerFilters.deadline) {
                requestBody.deadline = filters.headerFilters.deadline;
            }

            if (filters.headerFilters.docId) {
                requestBody.docId = filters.headerFilters.docId;
            }

            if (filters.headerFilters.resultValue) {
                requestBody.resultValue = filters.headerFilters.resultValue;
            }

            const response = await apiPost("https://red.irdop.org/v1/analysis/get/filter_column", requestBody);

            if (response.status < 300 && response.data) {
                // Handle the new API response format with filterValue and analysisCount
                let responseData = response.data;
                if (Array.isArray(responseData)) {
                    // Direct array response
                    responseData = responseData;
                } else if (responseData.result && Array.isArray(responseData.result)) {
                    // Wrapped in result property
                    responseData = responseData.result;
                } else if (Array.isArray(response.data)) {
                    // Fallback to data array
                    responseData = response.data;
                } else {
                    responseData = [];
                }

                if (Array.isArray(responseData)) {
                    let formattedResults = [];

                    if (column === "docId") {
                        // Special handling for docId column - predefined options
                        formattedResults = [
                            { value: "none", count: 0, label: "none" },
                            { value: "pending", count: 0, label: "pending" },
                            { value: "published", count: 0, label: "published" },
                        ];
                    } else if (column === "technicianId") {
                        // For technician filter, use filterDisplay if available
                        formattedResults = responseData.map((item) => {
                            // Use filterDisplay if available, otherwise fall back to filterValue
                            const displayName = item.filterDisplay || item.filterValue || "Không có người thực hiện";

                            return {
                                value: item.filterValue, // Keep original identity_uid as value
                                count: item.analysisCount || 0,
                                label: displayName, // Display name from API
                            };
                        });
                    } else if (column === "deadline") {
                        // For deadline filter, convert deadline values to Vietnamese labels
                        const deadlineLabels = {
                            overdue: "Quá hạn",
                            today: "Hôm nay",
                            "3days": "3 ngày tới",
                            week: "Tuần này",
                            future: "Tương lai",
                        };

                        formattedResults = responseData.map((item) => ({
                            value: item.filterValue,
                            count: item.analysisCount || 0,
                            label: deadlineLabels[item.filterValue] || item.filterValue,
                        }));
                    } else {
                        // For other columns, use the new standard format with filterValue and analysisCount
                        formattedResults = responseData.map((item) => ({
                            value: item.filterValue,
                            count: item.analysisCount || 0,
                            label: item.filterDisplay || item.filterValue || "(Trống)", // Use filterDisplay if available
                        }));
                    }

                    setFilterResults(formattedResults);
                } else {
                    setFilterResults([]);
                }
            } else {
                setFilterResults([]);
            }
        } catch (error) {
            setError("Lỗi khi tải giá trị lọc: " + error.message);
            setFilterResults([]);
        } finally {
            setFilterLoading(false);
        }
    };

    // Initial data load (inject custom scrollbar styles)
    useEffect(() => {
        // Inject custom scrollbar styles
        const styleSheet = document.createElement("style");
        styleSheet.textContent = customScrollbarStyle;
        document.head.appendChild(styleSheet);

        // Inject document preview modal styles
        const documentStyleSheet = document.createElement("style");
        documentStyleSheet.textContent = documentPreviewStyles;
        document.head.appendChild(documentStyleSheet);

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
            console.error("Error restoring pending changes from session storage:", error);
        }

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
    const API_ENDPOINT = "https://red.irdop.org/v1/analysis/get/processing";
    const PARAMETER_API_ENDPOINT = "https://red.irdop.org/v1/analysis/get/parameter/current";

    // Parse URL parameters and load initial data
    useEffect(() => {
        if (isInitialLoad) {
            loadInitialData();
            setIsInitialLoad(false);
        }
    }, []);

    // Main useEffect to handle all query params changes and call appropriate APIs
    useEffect(() => {
        // Don't run during initial load or initial data loading
        if (isInitialLoad || isInitialDataLoading) {
            return;
        }

        const searchParams = new URLSearchParams(location.search);

        // Extract all relevant query parameters
        const pageParam = searchParams.get("page");
        const itemsPerPageParam = searchParams.get("itemsPerPage");
        const parametersParam = searchParams.get("parameters");
        const protocolsParam = searchParams.get("protocols");
        const columnSortParam = searchParams.get("columnSort");
        const sortByParam = searchParams.get("sortBy");

        // Header filter parameters
        const sampleIdParam = searchParams.get("sampleId");
        const parameterNameParam = searchParams.get("parameterName");
        const protocolCodeParam = searchParams.get("protocolCode");
        const matrixParam = searchParams.get("matrix");
        const deadlineParam = searchParams.get("deadline");
        const deadlineStartAtParam = searchParams.get("deadlineStartAt");
        const deadlineEndAtParam = searchParams.get("deadlineEndAt");
        const deadlineTypeParam = searchParams.get("deadlineType");
        const docIdParam = searchParams.get("docId");
        const resultValueParam = searchParams.get("resultValue");
        const protocolSourceParam = searchParams.get("protocolSource");
        const technicianIdParam = searchParams.get("technicianId");

        // Update component states based on URL params
        const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;
        const itemsPerPageValue = itemsPerPageParam ? parseInt(itemsPerPageParam, 10) : itemsPerPage;

        // Build new filters object from URL parameters
        let newFilters = { ...filters };
        let needsUpdate = false;

        // Update pagination if different
        if (pageNumber !== currentPage) {
            setCurrentPage(pageNumber);
            needsUpdate = true;
        }

        if (itemsPerPageValue !== itemsPerPage) {
            setItemsPerPage(itemsPerPageValue);
            needsUpdate = true;
        }

        // Parse and update filter arrays
        if (parametersParam) {
            try {
                const parsedParameters = JSON.parse(parametersParam);
                if (JSON.stringify(parsedParameters) !== JSON.stringify(newFilters.parameters)) {
                    newFilters.parameters = Array.isArray(parsedParameters) ? parsedParameters : [];
                    needsUpdate = true;
                }
            } catch (e) {
                newFilters.parameters = [];
                needsUpdate = true;
            }
        } else if (newFilters.parameters.length > 0) {
            newFilters.parameters = [];
            needsUpdate = true;
        }

        if (protocolsParam) {
            try {
                const parsedProtocols = JSON.parse(protocolsParam);
                if (JSON.stringify(parsedProtocols) !== JSON.stringify(newFilters.protocols)) {
                    newFilters.protocols = Array.isArray(parsedProtocols) ? parsedProtocols : [];
                    needsUpdate = true;
                }
            } catch (e) {
                newFilters.protocols = [];
                needsUpdate = true;
            }
        } else if (newFilters.protocols.length > 0) {
            newFilters.protocols = [];
            needsUpdate = true;
        }

        // Update sort parameters
        if (columnSortParam && columnSortParam !== newFilters.columnSort) {
            newFilters.columnSort = columnSortParam;
            setSortConfig((prev) => ({ ...prev, column: columnSortParam }));
            needsUpdate = true;
        }

        if (sortByParam && sortByParam !== newFilters.sortBy) {
            newFilters.sortBy = sortByParam;
            setSortConfig((prev) => ({ ...prev, direction: sortByParam }));
            needsUpdate = true;
        }

        // Update header filters
        const newHeaderFilters = { ...newFilters.headerFilters };

        // Helper function to parse and update header filter
        const updateHeaderFilter = (paramValue, filterKey) => {
            if (paramValue) {
                try {
                    const parsedValue = JSON.parse(paramValue);
                    if (JSON.stringify(parsedValue) !== JSON.stringify(newHeaderFilters[filterKey])) {
                        newHeaderFilters[filterKey] = parsedValue;
                        return true;
                    }
                } catch (e) {
                    if (paramValue !== newHeaderFilters[filterKey]) {
                        newHeaderFilters[filterKey] = paramValue;
                        return true;
                    }
                }
            } else if (newHeaderFilters[filterKey] !== undefined) {
                delete newHeaderFilters[filterKey];
                return true;
            }
            return false;
        };

        // Update all header filters
        if (updateHeaderFilter(sampleIdParam, "sampleId")) needsUpdate = true;
        if (updateHeaderFilter(parameterNameParam, "parameterName")) needsUpdate = true;
        if (updateHeaderFilter(protocolCodeParam, "protocolCode")) needsUpdate = true;
        if (updateHeaderFilter(matrixParam, "matrix")) needsUpdate = true;
        if (updateHeaderFilter(deadlineParam, "deadline")) needsUpdate = true;
        if (updateHeaderFilter(docIdParam, "docId")) needsUpdate = true;
        if (updateHeaderFilter(resultValueParam, "resultValue")) needsUpdate = true;
        if (updateHeaderFilter(protocolSourceParam, "protocolSource")) needsUpdate = true;
        if (updateHeaderFilter(technicianIdParam, "technicianId")) needsUpdate = true;

        // Check for sidebar deadline params changes (these are handled separately in fetchAnalysisData)
        // We need to trigger fetch if these change even though they're not in headerFilters
        const prevSearchParams = new URLSearchParams(prevLocationSearchRef.current || "");
        const prevDeadlineStartAt = prevSearchParams.get("deadlineStartAt");
        const prevDeadlineEndAt = prevSearchParams.get("deadlineEndAt");
        const prevDeadlineType = prevSearchParams.get("deadlineType");

        if (deadlineStartAtParam !== prevDeadlineStartAt || deadlineEndAtParam !== prevDeadlineEndAt || deadlineTypeParam !== prevDeadlineType) {
            needsUpdate = true;
        }

        // Store current search params for next comparison
        prevLocationSearchRef.current = location.search;

        newFilters.headerFilters = newHeaderFilters;

        // If any filters changed, update state and fetch data
        if (needsUpdate) {
            if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
                setFilters(newFilters);
            }

            // Debounce API calls to prevent rapid successive calls
            const timeoutId = setTimeout(() => {
                if (!isCurrentlyFetchingRef.current) {
                    isCurrentlyFetchingRef.current = true;

                    // Fetch data with new filters
                    Promise.all([fetchParameters(parameterSearchTerm, newFilters), fetchAnalysisData(false, newFilters, pageNumber, itemsPerPageValue)]).finally(() => {
                        isCurrentlyFetchingRef.current = false;
                    });
                }
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [location.search]); // Only depend on URL search params

    // Search parameters with debounce (only for search box, doesn't update URL)
    useEffect(() => {
        // Don't fetch during initial load or initial data loading
        if (!isInitialLoad && !isInitialDataLoading && lastSearchTermRef.current !== parameterSearchTerm) {
            lastSearchTermRef.current = parameterSearchTerm;

            const timeoutId = setTimeout(() => {
                if (!isCurrentlyFetchingRef.current) {
                    fetchParameters(parameterSearchTerm);
                }
            }, 300);

            return () => clearTimeout(timeoutId);
        }
    }, [parameterSearchTerm, isInitialLoad, isInitialDataLoading]); // Add isInitialDataLoading dependency
    useEffect(() => {
        if (activeFilterColumn) {
            // For special filter columns (except deadline), don't fetch from API
            if (activeFilterColumn === "resultValue" || activeFilterColumn === "docId") {
                return;
            }

            const timeoutId = setTimeout(() => {
                fetchFilterValues(activeFilterColumn, filterSearchTerm);
            }, 300);

            return () => clearTimeout(timeoutId);
        }
    }, [activeFilterColumn, filterSearchTerm]);

    // Helper function to check if any filters are active
    const hasActiveFilters = useMemo(() => {
        const hasParameterFilters = filters.parameters && filters.parameters.length > 0;
        const hasProtocolFilters = filters.protocols && filters.protocols.length > 0;
        const hasHeaderFilters = filters.headerFilters && Object.keys(filters.headerFilters).length > 0;
        const hasSearchTerm = parameterSearchTerm && parameterSearchTerm.trim().length > 0;

        return hasParameterFilters || hasProtocolFilters || hasHeaderFilters || hasSearchTerm;
    }, [filters.parameters, filters.protocols, filters.headerFilters, parameterSearchTerm]);

    // Auto-refresh data every 60 seconds
    useEffect(() => {
        if (!isInitialLoad && !isInitialDataLoading) {
            const autoRefreshInterval = setInterval(() => {
                // Only auto-refresh when not fetching, no filters are active, and NOT in result entry session
                if (
                    !isCurrentlyFetchingRef.current &&
                    !hasActiveFilters && // Only refresh when no filters are active
                    !isResultEntrySession // Don't refresh during result entry session
                ) {
                    // Use current state instead of parsing URL to maintain filters
                    fetchAnalysisData(true, filters, currentPage, itemsPerPage);
                }
            }, 60000); // 60 seconds

            return () => clearInterval(autoRefreshInterval);
        }
    }, [
        isInitialLoad, // Only depend on isInitialLoad to avoid unnecessary re-creation of interval
        isInitialDataLoading, // Add isInitialDataLoading dependency
        hasActiveFilters, // Add hasActiveFilters as dependency to update interval behavior
        isResultEntrySession, // Add to prevent refresh during session
    ]);

    // Close technician dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if dropdown is open and click is outside the dropdown container
            if (technicianDropdownOpen && !event.target.closest("[data-technician-dropdown]")) {
                // Add a small delay to ensure selection events can complete first
                setTimeout(() => {
                    setTechnicianDropdownOpen(false);
                }, 100);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [technicianDropdownOpen]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Keyboard shortcuts for non-editing functions can be added here if needed
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [
        isInitialLoad, // Only depend on isInitialLoad to avoid unnecessary re-creation of interval
        isInitialDataLoading, // Add isInitialDataLoading dependency
        hasActiveFilters, // Add hasActiveFilters as dependency to update interval behavior
    ]);

    // Mouse event listeners for drag selection
    useEffect(() => {
        // Add global mouse event listeners for drag selection
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("mouseleave", handleMouseUp);

        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mouseleave", handleMouseUp);
        };
    }, []);

    // Handle sidebar section toggle
    const toggleSidebarSection = (section) => {
        setSidebarExpandedSections((prev) => ({
            analysis: section === "analysis" ? !prev.analysis : false,
        }));
    };

    // Handle sidebar collapse toggle
    const toggleSidebarCollapse = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    // Select parameter/sample/matrix
    const selectItem = (type, itemName, protocolCode = null, sampleName = null) => {
        let itemKey = "";

        if (type === "analysis") {
            const normalizedProtocolCode = protocolCode && protocolCode.trim() ? protocolCode : "null";
            itemKey = `${type}|${itemName}|${normalizedProtocolCode}`;
        }

        // If same item is selected, clear it
        if (selectedParameter === itemKey) {
            setSelectedParameter("");
            // Clear all related filters in URL
            const queryParams = new URLSearchParams(location.search);
            queryParams.delete("parameters");
            queryParams.delete("protocols");
            queryParams.delete("parameterName");
            queryParams.delete("protocolCode");
            queryParams.delete("page");
            navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
        } else {
            // Select new item
            setSelectedParameter(itemKey);

            // Update URL parameters instead of directly setting filters
            const queryParams = new URLSearchParams(location.search);

            // Clear all existing sidebar filters first
            queryParams.delete("parameters");
            queryParams.delete("protocols");
            queryParams.delete("parameterName");
            queryParams.delete("protocolCode");
            queryParams.delete("page");

            if (type === "analysis") {
                const normalizedProtocolCode = protocolCode && protocolCode.trim() ? protocolCode : "null";
                // Set new filters for analysis selection
                queryParams.set("parameterName", JSON.stringify([itemName]));
                queryParams.set("protocolCode", JSON.stringify([normalizedProtocolCode]));
            }

            navigate(`${location.pathname}?${queryParams.toString()}`);
        }
    };

    // Clear parameter
    const clearParameter = () => {
        // Clear all filter parameters from URL
        const queryParams = new URLSearchParams(location.search);
        queryParams.delete("parameters");
        queryParams.delete("protocols");
        queryParams.delete("parameterName");
        queryParams.delete("protocolCode");
        queryParams.delete("deadline");
        queryParams.delete("docId");
        queryParams.delete("resultValue");
        queryParams.delete("protocolSource");
        queryParams.delete("page");

        navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
        setSelectedParameter("");
    };

    // Select deadline filter (sidebar version)
    const selectDeadlineFilter = (deadlineType) => {
        // Clear table filter state when switching to sidebar filtering
        setIsFilterCreationMode(false);
        setActiveFilterColumn(null);
        setFilterSearchTerm("");
        setFilterResults([]);
        setSelectedFilterValues([]);

        // Update URL parameters instead of directly setting filters
        const queryParams = new URLSearchParams(location.search);

        // Clear any existing deadline-related query params
        queryParams.delete("deadline");
        queryParams.delete("deadlineStartAt");
        queryParams.delete("deadlineEndAt");

        // Check if same deadline filter is selected, clear it
        const currentDeadlineType = queryParams.get("deadlineType");
        if (currentDeadlineType === deadlineType) {
            queryParams.delete("deadlineType");
        } else {
            queryParams.set("deadlineType", deadlineType);

            const today = new Date();
            const formatDate = (date) => {
                return date.toISOString().split("T")[0]; // YYYY-MM-DD format
            };

            // Handle different deadline types with specific query params
            switch (deadlineType) {
                case "overdue":
                    // Today's date for overdue items
                    queryParams.set("deadlineEndAt", formatDate(today));
                    break;
                case "3days":
                    // From today to 3 days later
                    const threeDaysLater = new Date(today);
                    threeDaysLater.setDate(today.getDate() + 3);
                    queryParams.set("deadlineStartAt", formatDate(today));
                    queryParams.set("deadlineEndAt", formatDate(threeDaysLater));
                    break;
                case "week":
                    // From today to 1 week later
                    const oneWeekLater = new Date(today);
                    oneWeekLater.setDate(today.getDate() + 7);
                    queryParams.set("deadlineStartAt", formatDate(today));
                    queryParams.set("deadlineEndAt", formatDate(oneWeekLater));
                    break;
                default:
                    // For specific date selection, will be handled by date picker
                    break;
            }
        }

        queryParams.delete("page"); // Reset to page 1
        navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
    };

    // Select my tasks filter
    const selectMyTasksFilter = () => {
        // Clear table filter state when switching to sidebar filtering
        setIsFilterCreationMode(false);
        setActiveFilterColumn(null);
        setFilterSearchTerm("");
        setFilterResults([]);
        setSelectedFilterValues([]);

        // Check if my tasks filter is already active
        const queryParams = new URLSearchParams(location.search);
        const currentTechnicianId = queryParams.get("technicianId");
        let isMyTasksActive = false;

        if (currentTechnicianId) {
            try {
                const technicianIds = JSON.parse(currentTechnicianId);
                isMyTasksActive = Array.isArray(technicianIds) && technicianIds.includes(currentUser?.identity_uid);
            } catch (e) {
                isMyTasksActive = currentTechnicianId === currentUser?.identity_uid;
            }
        }

        if (isMyTasksActive) {
            // Clear my tasks filter
            queryParams.delete("technicianId");
            toast.info("Đã tắt bộ lọc chỉ tiêu của bản thân");
        } else {
            // Apply my tasks filter
            queryParams.set("technicianId", JSON.stringify([currentUser?.identity_uid]));
            toast.info("Đã bật bộ lọc chỉ tiêu của bản thân");
        }

        queryParams.delete("page"); // Reset to page 1
        navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
    };

    // State for date picker visibility
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [datePickerMode, setDatePickerMode] = useState("sidebar"); // 'sidebar' or 'filter'

    // Open date picker for specific date filter
    const openDatePicker = (mode = "sidebar") => {
        setDatePickerMode(mode);
        setShowDatePicker(true);
        setSelectedDate(filters.headerFilters.deadline || "");
    };

    // Handle date selection
    const handleDateSelection = (date) => {
        if (date) {
            if (datePickerMode === "filter") {
                // Header filter: Use deadline query param (existing behavior)
                applySpecialFilter("deadline", date);
            } else {
                // Sidebar filter: Use deadline query param for specific date
                const queryParams = new URLSearchParams(location.search);

                // Clear any existing deadline-related query params
                queryParams.delete("deadline");
                queryParams.delete("deadlineStartAt");
                queryParams.delete("deadlineEndAt");
                queryParams.delete("deadlineType");

                // Set specific date in deadline param for sidebar
                queryParams.set("deadline", date);
                queryParams.delete("page"); // Reset to page 1
                navigate(`${location.pathname}?${queryParams.toString()}`);
            }
        }
        setShowDatePicker(false);
        setSelectedDate("");
        setDatePickerMode("sidebar");
    };

    // Cancel date picker
    const cancelDatePicker = () => {
        setShowDatePicker(false);
        setSelectedDate("");
        setDatePickerMode("sidebar");
    };

    // Handle technician dropdown in sidebar header
    const handleTechnicianDropdownToggle = () => {
        setTechnicianDropdownOpen(!technicianDropdownOpen);
    };

    const handleTechnicianSelection = (technicianUid) => {
        const queryParams = new URLSearchParams(location.search);

        if (technicianUid === null) {
            // Remove technician filter
            queryParams.delete("technicianId");
            setSelectedTechnicianName("TOÀN BỘ");
        } else {
            // Apply technician filter
            const technician = technicians?.find((tech) => tech.identity_uid === technicianUid);
            const technicianName = technician ? technician.identity_name : "TOÀN BỘ";

            queryParams.set("technicianId", JSON.stringify([technicianUid]));
            setSelectedTechnicianName(technicianName);
        }

        queryParams.delete("page"); // Reset to page 1
        navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
        setTechnicianDropdownOpen(false);
    };

    // Get current selected technician name for display
    const getCurrentTechnicianName = () => {
        const queryParams = new URLSearchParams(location.search);
        const technicianIdParam = queryParams.get("technicianId");

        if (!technicianIdParam) {
            return "TOÀN BỘ";
        }

        try {
            const technicianIds = JSON.parse(technicianIdParam);
            if (Array.isArray(technicianIds) && technicianIds.length > 0) {
                const selectedUid = technicianIds[0];
                const technician = technicians?.find((tech) => tech.identity_uid === selectedUid);
                return technician ? technician.identity_name : "TOÀN BỘ";
            }
        } catch (e) {
            // If parsing fails, treat as single value
            const technician = technicians?.find((tech) => tech.identity_uid === technicianIdParam);
            return technician ? technician.identity_name : "TOÀN BỘ";
        }

        return "TOÀN BỘ";
    };

    // Sync selectedTechnicianName with current URL params when they change
    useEffect(() => {
        setSelectedTechnicianName(getCurrentTechnicianName());
    }, [location.search, technicians]);

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
            console.error("Error saving pending changes to session storage:", error);
        }
    }, [pendingChanges]);

    // Fetch unit suggestions from API
    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const unitsResponse = await apiGet("https://black.irdop.org/get/list_enum/unit");
                if (unitsResponse.data && Array.isArray(unitsResponse.data)) {
                    setUniqueUnits(unitsResponse.data.filter(Boolean));
                }
            } catch (error) {
                console.error("Error fetching units:", error);
            }
        };

        fetchUnits();
    }, []);

    // Filter and paginate units
    const filterUnits = (input) => {
        if (!input || input.trim() === "") return [];
        return uniqueUnits.filter((unit) => unit && unit.toLowerCase().includes((input || "").toLowerCase()));
    };

    const getPaginatedUnits = (input) => {
        const filtered = filterUnits(input);
        return filtered.slice((unitPage - 1) * unitItemsPerPage, unitPage * unitItemsPerPage);
    };

    const handleUnitPageChange = (pageNumber) => {
        setUnitPage(pageNumber);
    };

    // Clear all filters (for selected items indicator)
    const clearAllFilters = () => {
        // Navigate to clean URL without any filter parameters
        navigate(location.pathname);
        setSelectedParameter("");
    };

    // Result entry session handlers
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
        // Store original analyses data before starting session
        const originalData = new Map();
        data.forEach((analysis) => {
            originalData.set(analysis.id, { ...analysis });
        });
        setOriginalAnalyses(originalData);

        // Simply start the session without authentication check
        setIsResultEntrySession(true);
        toast.success("Đã bắt đầu phiên nhập kết quả");
    };

    const endResultEntrySession = async () => {
        if (pendingChanges.size === 0) {
            toast.info("Không có thay đổi nào để lưu");
            setIsResultEntrySession(false);
            return;
        }

        // Show loading state
        setIsSessionUpdating(true);

        try {
            // Prepare analyses array with id, resultValue, resultUnit, protocolCode, and protocolSource
            const analyses = Array.from(pendingChanges.values()).map((change) => ({
                id: change.id,
                resultValue: change.resultValue,
                resultUnit: change.resultUnit,
                protocolCode: change.protocolCode,
                protocolSource: change.protocolSource,
            }));

            // Send batch update API
            const response = await apiPost("https://red.irdop.org/v1/analysis/update", {
                analyses: analyses,
            });

            if (response?.status < 300) {
                const responseData = response?.data;

                // Response data is array of updated analysis records
                if (Array.isArray(responseData) && responseData.length > 0) {
                    // Update data state with new analysis records
                    setData((prevData) => {
                        // Create a map of updated records by ID for quick lookup
                        const updatedRecordsMap = new Map(responseData.map((record) => [record.id, record]));

                        // Update each record in prevData with the corresponding updated record
                        return prevData.map((item) => {
                            const updatedRecord = updatedRecordsMap.get(item.id);
                            return updatedRecord ? { ...item, ...updatedRecord } : item;
                        });
                    });

                    toast.success(`Đã cập nhật ${analyses.length} kết quả thành công`);
                } else {
                    // No data or not array, show normal success message
                    toast.success(`Đã cập nhật ${analyses.length} kết quả thành công`);
                }

                // Set lastEditResultAt in localStorage (now + 2 minutes)
                const now = new Date().getTime();
                const lastEditAt = now + 2 * 60 * 1000; // 2 minutes
                localStorage.setItem("lastEditResultAt", lastEditAt.toString());

                // Clear pending changes
                setPendingChanges(new Map());

                // End session
                setIsResultEntrySession(false);
            } else {
                toast.error("Lỗi khi cập nhật kết quả");
            }
        } catch (error) {
            console.error("Error batch updating analyses:", error);
            toast.error("Lỗi khi cập nhật: " + error.message);
        } finally {
            // Hide loading state
            setIsSessionUpdating(false);
        }
    };

    // Handle cancel all pending changes
    const handleCancelAllChanges = () => {
        // Clear all pending changes
        setPendingChanges(new Map());

        // End session
        setIsResultEntrySession(false);

        // Close dialogs
        setShowEndSessionDialog(false);
        setShowCancelConfirm(false);

        toast.info("Đã hủy tất cả thay đổi");
    };

    // Show notifications
    const showSuccessNotification = (message) => {
        toast.success(message, {
            position: "top-right",
            autoClose: 500,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
        });
    };

    // Pagination handlers
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            const queryParams = new URLSearchParams(location.search);
            queryParams.set("page", newPage.toString());
            navigate(`${location.pathname}?${queryParams.toString()}`);
        }
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        const queryParams = new URLSearchParams(location.search);
        queryParams.set("itemsPerPage", newItemsPerPage.toString());
        queryParams.delete("page"); // Reset to page 1
        navigate(`${location.pathname}?${queryParams.toString()}`);
    };

    // Bulk edit functions - REMOVED

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "--";
        return new Date(dateString).toLocaleDateString("vi-VN");
    };

    // Get technician name by UID
    const getTechnicianName = (analysis) => {
        // Use analysis.technician.identityName if available
        if (analysis?.technician?.identityName) {
            return analysis.technician.identityName;
        }
        // Fallback to technicianId if no technician object
        if (analysis?.technicianId) {
            return analysis.technicianId;
        }
        return "--";
    };

    // Helper function to get analysis data by ID
    const getAnalysisDataById = (analysisId) => {
        return data.find((item) => item.id === analysisId) || null;
    };

    // Drag selection handlers
    const handleMouseDown = (analysisId, event) => {
        if (event.target.tagName === "SELECT" || event.target.tagName === "INPUT" || event.target.tagName === "BUTTON") {
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
        } else {
            // Check if clicking on already selected item to toggle
            if (selectedAnalysisIds.has(analysisId) && selectedAnalysisIds.size === 1) {
                // If only this item is selected, deselect it
                setSelectedAnalysisIds(new Set());
                setSelectedRowsData(new Map());
            } else {
                // Start new selection
                const analysisData = getAnalysisDataById(analysisId);
                setSelectedAnalysisIds(new Set([analysisId]));
                if (analysisData) {
                    setSelectedRowsData(new Map([[analysisId, analysisData]]));
                }
            }
        }

        event.preventDefault();
    };

    const handleMouseEnter = (analysisId) => {
        if (isDragging && dragStartId) {
            // Get all analysis IDs in order from data
            const allAnalysisIds = data.map((item) => item.id);

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
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragStartId(null);
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

        // Get identityId from cookie
        const identityId = Cookies.get("identityId");

        // Auto-add technician filter after login
        if (identityId) {
            const queryParams = new URLSearchParams(location.search);

            // Add or update technicianId filter
            const existingTechnicianIds = queryParams.get("technicianId");
            let technicianIds = [];

            if (existingTechnicianIds) {
                try {
                    technicianIds = JSON.parse(existingTechnicianIds);
                    if (!Array.isArray(technicianIds)) {
                        technicianIds = [existingTechnicianIds];
                    }
                } catch {
                    technicianIds = [existingTechnicianIds];
                }
            }

            // Add identityId if not already in the list
            if (!technicianIds.includes(identityId)) {
                technicianIds = [identityId]; // Replace with logged-in user
                queryParams.set("technicianId", JSON.stringify(technicianIds));

                // Navigate to update URL with new filter
                navigate(`${location.pathname}?${queryParams.toString()}`, { replace: true });
            }
        }

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
        const editableValue = convertHTMLToValue(currentValue || "");
        setEditValue(editableValue);
    };

    const handleCellClick = async (analysisId, column, currentValue) => {
        // Don't edit if cell is already being edited
        if (editingCell?.analysisId === analysisId && editingCell?.column === column) {
            return;
        }

        // Close unit dropdown when switching cells
        setShowUnitDropdown(false);

        // Only apply session logic for result, unit, protocolCode, and protocolSource columns
        if (column === "resultValue" || column === "resultUnit" || column === "protocolCode" || column === "protocolSource") {
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
        } else if (column === "note") {
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
        const originalAnalysis = data.find((item) => item.id === analysisId);
        const originalValue = originalAnalysis?.[column] || "";
        const strippedOriginal = originalValue.replace(/<[^>]*>/g, "");

        // Only update if value changed
        if (editValue !== strippedOriginal) {
            // If in result entry session and editing result/unit/protocolCode/protocolSource columns, save to pending changes
            if (isResultEntrySession && (column === "resultValue" || column === "resultUnit" || column === "protocolCode" || column === "protocolSource")) {
                // Get existing pending changes for this analysis or create new with full record data
                const existingChanges = pendingChanges.get(analysisId) || {
                    ...originalAnalysis, // Include full record data
                    id: analysisId,
                };

                // Update the changed column
                if (column === "protocolCode") {
                    // For protocolCode, save directly without HTML conversion
                    existingChanges.protocolCode = editValue;
                } else if (column === "protocolSource") {
                    // For protocolSource, save directly without HTML conversion
                    existingChanges.protocolSource = editValue;
                } else {
                    // For resultValue and resultUnit, convert to HTML
                    const convertedValue = convertValueToHTML(editValue);
                    if (column === "resultValue") {
                        existingChanges.resultValue = convertedValue;
                    } else if (column === "resultUnit") {
                        existingChanges.resultUnit = convertedValue;
                    }
                }

                // Update pending changes
                setPendingChanges(new Map(pendingChanges.set(analysisId, existingChanges)));

                // Update local data display immediately
                setData((prevData) =>
                    prevData.map((item) => {
                        if (item.id === analysisId) {
                            // For protocolCode and protocolSource, use editValue directly; for others, use convertedValue
                            const newValue = column === "protocolCode" || column === "protocolSource" ? editValue : convertValueToHTML(editValue);
                            return { ...item, [column]: newValue };
                        }
                        return item;
                    }),
                );

                toast.info("Thay đổi đã được lưu tạm thời");
            } else {
                // Normal edit flow - send API immediately
                try {
                    const updateData = {
                        analysis: {
                            id: analysisId,
                        },
                    };

                    // Set the appropriate field based on column
                    if (column === "protocolCode") {
                        // For protocolCode, send directly without HTML conversion
                        updateData.analysis.protocolCode = editValue;
                    } else if (column === "protocolSource") {
                        // For protocolSource, send directly without HTML conversion
                        updateData.analysis.protocolSource = editValue;
                    } else {
                        // For resultValue and resultUnit, convert to HTML format before sending
                        const convertedValue = convertValueToHTML(editValue);
                        if (column === "resultValue") {
                            updateData.analysis.resultValue = convertedValue;
                        } else if (column === "resultUnit") {
                            updateData.analysis.resultUnit = convertedValue;
                        }
                    }

                    const response = await apiPost("https://red.irdop.org/v1/analysis/update", updateData);

                    if (response?.status < 300) {
                        toast.success("Cập nhật thành công");

                        // Set lastEditResultAt in localStorage (now + 2 minutes)
                        const now = new Date().getTime();
                        const lastEditAt = now + 2 * 60 * 1000; // 2 minutes
                        localStorage.setItem("lastEditResultAt", lastEditAt.toString());

                        // Refresh data to get updated values
                        fetchAnalysisData(true);
                    } else {
                        toast.error("Lỗi khi cập nhật");
                    }
                } catch (error) {
                    console.error("Error updating cell:", error);
                    toast.error("Lỗi khi cập nhật: " + error.message);
                }
            }
        }

        setEditingCell(null);
        setEditValue("");
        setShowUnitSuggestions(false);
        setUnitSuggestions([]);
        setSelectedSuggestionIndex(-1);
    };

    // Fetch unit suggestions from API
    // Handle unit input change
    const handleUnitInputChange = (e) => {
        const value = e.target.value;
        setEditValue(value);
        setUnitInput(value);
        setUnitPage(1);
        setShowUnitDropdown(value.length >= 1);
    };

    // Handle suggestion selection
    const handleSuggestionClick = (suggestion) => {
        setEditValue(suggestion);
        setShowUnitDropdown(false);
        // Keep focus on input
        if (unitInputRef.current) {
            unitInputRef.current.focus();
        }
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showUnitDropdown && unitInputRef.current && !unitInputRef.current.contains(e.target) && !e.target.closest(".unit-suggestions-dropdown")) {
                setShowUnitDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showUnitDropdown]);

    const handleKeyDown = (e) => {
        // Normal key handling for all cells
        if (e.key === "Enter") {
            e.preventDefault();
            e.target.blur(); // This will trigger handleCellBlur
        } else if (e.key === "Escape") {
            setEditingCell(null);
            setEditValue("");
            setShowUnitDropdown(false);
        }
    };

    // Bulk edit handlers
    const handleBulkEdit = (field, value) => {
        // This function will be called by the LabBulkUpdate component
        toast.success(`Cập nhật ${selectedAnalysisIds.size} mục thành công`);
        setSelectedAnalysisIds(new Set());
        setSelectedRowsData(new Map());
        setShowBulkEdit(false);
    };

    const clearSelection = () => {
        setSelectedAnalysisIds(new Set());
        setSelectedRowsData(new Map());
        setShowBulkEdit(false);
    };

    const handleBulkEditClick = () => {
        setShowBulkEdit(true);
    };

    // Check if there are selected samples
    const hasSelectedSamples = selectedAnalysisIds.size > 0;

    // Toggle row selection
    // Row selection and editor functions - REMOVED

    // Open document
    const openDocument = async (docId) => {
        // Use the new modal preview for all document types
        handleDocumentPreview(docId);
    };

    // Handle sorting
    const handleSort = (column) => {
        // Calculate new sort direction
        const newDirection = sortConfig.column === column && sortConfig.direction === "ASC" ? "DESC" : "ASC";

        // Update local sortConfig state immediately
        setSortConfig({
            column,
            direction: newDirection,
        });

        // Update URL parameters
        const queryParams = new URLSearchParams(location.search);
        queryParams.set("columnSort", column);
        queryParams.set("sortBy", newDirection);
        queryParams.delete("page"); // Reset to page 1 when sorting changes

        navigate(`${location.pathname}?${queryParams.toString()}`);
    };

    // Toggle filter creation mode
    const toggleFilterCreationMode = () => {
        setIsFilterCreationMode(!isFilterCreationMode);
        setActiveFilterColumn(null);
        setFilterSearchTerm("");
        setFilterResults([]);
        setSelectedFilterValues([]);
    };

    // Open filter modal for specific column
    const openFilterModal = async (column) => {
        // Set filter creation mode if not already active
        if (!isFilterCreationMode) {
            setIsFilterCreationMode(true);
        }

        // If the same filter column is already active, close it
        if (activeFilterColumn === column) {
            setActiveFilterColumn(null);
            setFilterSearchTerm("");
            setFilterResults([]);
            setSelectedFilterValues([]);
            return;
        }

        // Set active filter column and loading state
        setActiveFilterColumn(column);
        setFilterLoading(true);
        setFilterResults([]);
        setSelectedFilterValues([]);
        setFilterSearchTerm("");

        try {
            // Prepare request body with current filters
            const requestBody = {
                filterColumn: column,
                searchTerm: "",
                itemsPerPage: 50,
                page: 1,
            };

            // Add current filters to request body directly from filters state
            if (filters.headerFilters.sampleId) {
                requestBody.sampleId = filters.headerFilters.sampleId;
            }

            if (filters.headerFilters.parameterName) {
                requestBody.parameterName = filters.headerFilters.parameterName;
            }

            if (filters.headerFilters.protocolSource) {
                requestBody.protocolSource = filters.headerFilters.protocolSource;
            }

            if (filters.headerFilters.protocolCode) {
                requestBody.protocolCode = filters.headerFilters.protocolCode;
            }

            if (filters.headerFilters.matrix) {
                requestBody.matrix = filters.headerFilters.matrix;
            }

            if (filters.headerFilters.technicianId) {
                requestBody.technicianId = filters.headerFilters.technicianId;
            }

            if (filters.headerFilters.status === 1) {
                requestBody.status = 1;
            }

            if (filters.headerFilters.done === true) {
                requestBody.done = true;
            }

            if (filters.headerFilters.overdue === true) {
                requestBody.overdue = true;
            }

            if (filters.headerFilters.deadline) {
                requestBody.deadline = filters.headerFilters.deadline;
            }

            if (filters.headerFilters.docId) {
                requestBody.docId = filters.headerFilters.docId;
            }

            if (filters.headerFilters.resultValue) {
                requestBody.resultValue = filters.headerFilters.resultValue;
            }

            const response = await apiPost("https://red.irdop.org/v1/analysis/get/filter_column", requestBody);

            if (response?.status < 300 && response?.data?.result) {
                let formattedResults = [];

                if (column === "docId") {
                    // Special handling for docId column - predefined options
                    formattedResults = [
                        { value: "none", count: 0, label: "none" },
                        { value: "pending", count: 0, label: "pending" },
                        { value: "published", count: 0, label: "published" },
                    ];
                } else if (column === "technicianId") {
                    // For technician filter, convert identity_uid to display name with alias
                    formattedResults = response.data.result.map((item) => {
                        // API returns technicianId field, not value
                        const technicianUid = item.technicianId || item.value;
                        const technician = technicians?.find((tech) => tech.identity_uid === technicianUid);
                        const displayName = technician ? `${technician.identity_name}${technician.alias ? ` (${technician.alias})` : ""}` : technicianUid || "Không có người thực hiện";

                        return {
                            value: technicianUid, // Keep original identity_uid as value
                            count: item.total || item.count || 0,
                            label: displayName, // Display name with alias
                        };
                    });
                } else if (column === "deadline") {
                    // For deadline filter, convert deadline values to Vietnamese labels
                    const deadlineLabels = {
                        overdue: "Quá hạn",
                        today: "Hôm nay",
                        "3days": "3 ngày tới",
                        week: "Tuần này",
                        future: "Tương lai",
                    };

                    formattedResults = response.data.result.map((item) => ({
                        value: item.deadline,
                        count: item.total || item.count || 0,
                        label: deadlineLabels[item.deadline] || item.deadline,
                    }));
                } else {
                    // For other columns, use standard formatting
                    formattedResults = response.data.result.map((item) => ({
                        value: item[column] || item.parameterName || item.value,
                        count: item.total || item.count || 0,
                        label: item[column] || item.parameterName || item.value,
                    }));
                }

                setFilterResults(formattedResults);

                // Auto-select values based on current filters
                const currentFilter = filters.headerFilters[column];
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
            setFilterResults([]);
            toast.error("Lỗi khi tải dữ liệu lọc");
        } finally {
            setFilterLoading(false);
        }

        // Set default center position for non-technician filters
        if (column !== "technicianId") {
            setFilterPosition({
                top: window.scrollY + 100,
                left: window.innerWidth / 2 - 160, // Center the modal
            });
        }
        // technicianId position is set directly in the button click handler
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
        // Special handling for deadline with date range
        if (activeFilterColumn === "deadline" && (startDate || endDate || selectedFilterValues.length > 0)) {
            const queryParams = new URLSearchParams(location.search);
            let filterValue = [];

            if (selectedFilterValues.length > 0) {
                filterValue = [...selectedFilterValues];
            }

            if (startDate || endDate) {
                const dateRange = {};
                if (startDate) {
                    dateRange.start = startDate.toISOString().split("T")[0];
                }
                if (endDate) {
                    dateRange.end = endDate.toISOString().split("T")[0];
                }
                filterValue.push(dateRange);
            }

            if (filterValue.length > 0) {
                queryParams.set("deadline", JSON.stringify(filterValue));
            } else {
                queryParams.delete("deadline");
            }
            queryParams.delete("page"); // Reset to page 1 when filter changes

            navigate(`${location.pathname}?${queryParams.toString()}`);

            setActiveFilterColumn(null);
            setFilterResults([]);
            setSelectedFilterValues([]);
            setStartDate(null);
            setEndDate(null);
            setShowDateRange(false);
            setFilterSearchTerm("");
        } else if (activeFilterColumn && selectedFilterValues.length > 0) {
            // Regular filter handling
            const queryParams = new URLSearchParams(location.search);
            queryParams.set(activeFilterColumn, JSON.stringify(selectedFilterValues));
            queryParams.delete("page"); // Reset to page 1 when filter changes

            navigate(`${location.pathname}?${queryParams.toString()}`);

            setActiveFilterColumn(null);
            setFilterSearchTerm("");
            setFilterResults([]);
            setSelectedFilterValues([]);
        }
    };

    // Apply special filter (for resultValue, deadline, docId)
    const applySpecialFilter = (column, value) => {
        // Update URL parameters instead of directly setting filters
        const queryParams = new URLSearchParams(location.search);
        if (value !== null && value !== undefined && value !== "") {
            queryParams.set(column, typeof value === "object" ? JSON.stringify(value) : value);
        } else {
            queryParams.delete(column);
        }
        queryParams.delete("page"); // Reset to page 1 when filter changes

        navigate(`${location.pathname}?${queryParams.toString()}`);

        setActiveFilterColumn(null);
        setFilterSearchTerm("");
        setFilterResults([]);
        setSelectedFilterValues([]);
    };

    // Cancel filter
    const cancelFilter = () => {
        setActiveFilterColumn(null);
        setFilterSearchTerm("");
        setFilterResults([]);
        setSelectedFilterValues([]);
        setStartDate(null);
        setEndDate(null);
        setShowDateRange(false);
    };

    // Remove filter for specific column
    const removeColumnFilter = (column) => {
        // Update URL parameters instead of directly setting filters
        const queryParams = new URLSearchParams(location.search);
        queryParams.delete(column);

        // Handle deadline-specific cleanup
        if (column === "deadline") {
            // Clear all deadline-related params (both header and sidebar)
            queryParams.delete("deadline");
            queryParams.delete("deadlineStartAt");
            queryParams.delete("deadlineEndAt");
            queryParams.delete("deadlineType");
        }

        // Also clear related sidebar filters if needed
        if (column === "parameterName") {
            queryParams.delete("parameters");
        } else if (column === "protocolCode") {
            queryParams.delete("protocols");
        }

        queryParams.delete("page"); // Reset to page 1 when filter changes
        navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);

        // Clear selected parameter if all related filters are cleared
        const hasParameterFilters = queryParams.get("parameters") || queryParams.get("parameterName");
        const hasProtocolFilters = queryParams.get("protocols") || queryParams.get("protocolCode");
        const hasDeadlineFilters = queryParams.get("deadline") || queryParams.get("deadlineStartAt") || queryParams.get("deadlineEndAt") || queryParams.get("deadlineType");

        if (!hasParameterFilters && !hasProtocolFilters && !hasDeadlineFilters) {
            setSelectedParameter("");
        }
    };

    // HeaderCell handlers
    const handleHeaderFilter = (columnName, event) => {
        if (activeFilterColumn === columnName) {
            setActiveFilterColumn(null);
        } else {
            // Calculate filter position from the clicked header
            const headerElement = event ? event.currentTarget.closest("th") : null;
            if (headerElement) {
                const rect = headerElement.getBoundingClientRect();

                // For docId and technicianId columns, position dropdown to the left to prevent cutoff
                const dropdownWidth = 320; // Approximate width of filter dropdown
                let leftPosition = rect.left + window.scrollX;

                if (columnName === "docId" || columnName === "technicianId") {
                    // Position dropdown to the left of the column
                    leftPosition = rect.right + window.scrollX - dropdownWidth;

                    // Ensure it doesn't go off the left side of the screen
                    if (leftPosition < 10) {
                        leftPosition = 10;
                    }
                }

                setFilterPosition({
                    top: rect.bottom + window.scrollY,
                    left: leftPosition,
                });
            }

            setActiveFilterColumn(columnName);
            setFilterSearchTerm("");
            setFilterResults([]);

            // Load existing filter values for this column
            const existingFilterValues = filters.headerFilters[columnName];
            if (existingFilterValues && Array.isArray(existingFilterValues)) {
                setSelectedFilterValues([...existingFilterValues]);
            } else {
                setSelectedFilterValues([]);
            }
        }
    };

    const handleClearColumnFilter = (columnName) => {
        removeColumnFilter(columnName);
    };

    // Check if column is filtered
    const isColumnFiltered = (column) => {
        const queryParams = new URLSearchParams(location.search);

        if (column === "deadline") {
            // Check both header and sidebar deadline filters
            return filters.headerFilters[column] || queryParams.get("deadline") || queryParams.get("deadlineStartAt") || queryParams.get("deadlineEndAt") || queryParams.get("deadlineType");
        }

        return filters.headerFilters[column] || (column === "parameterName" && filters.parameters.length > 0) || (column === "protocolCode" && filters.protocols.length > 0);
    };

    // Get sort direction for column
    const getSortDirection = (column) => {
        if (sortConfig.column === column) {
            return sortConfig.direction;
        }
        return null;
    };

    // Available columns
    const availableColumns = {
        sampleId: "Mã mẫu",
        parameterName: "Tên chỉ tiêu",
        matrix: "Nền mẫu",
        protocolSource: "Nguồn",
        protocolCode: "Phương pháp",
        resultValue: "Kết quả",
        resultUnit: "Đơn vị",
        deadline: "Hạn trả",
        technicianId: "Người thực hiện",
        docId: "Doc",
        document: "Tài liệu",
        id: "ID",
        lodq: "LOD/LOQ",
        reviewed_by: "Người duyệt",
    };

    // Pagination calculations
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    // Tooltip functions
    const showTooltip = (event, content, customPosition = null) => {
        const rect = event.target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        let x, y, position;

        if (customPosition === "left") {
            // Position tooltip completely to the left of the element
            x = rect.left + scrollLeft - 10; // 10px padding from element
            y = rect.top + scrollTop + rect.height / 2;
            position = "left";
        } else if (customPosition === "right") {
            // Position tooltip completely to the right of the element
            x = rect.right + scrollLeft + 10; // 10px padding from element
            y = rect.top + scrollTop + rect.height / 2;
            position = "right";
        } else {
            // Default behavior: above or below (center aligned)
            const spaceAbove = rect.top;
            const tooltipHeight = 40; // Approximate tooltip height
            const shouldShowBelow = spaceAbove < tooltipHeight + 20; // 20px buffer

            x = rect.left + scrollLeft + rect.width / 2;
            y = shouldShowBelow
                ? rect.bottom + scrollTop + 10 // Show below
                : rect.top + scrollTop - 10; // Show above
            position = shouldShowBelow ? "below" : "above";
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
            content: "",
            x: 0,
            y: 0,
            position: "above",
        });
    };

    // Sample tooltip functions
    const showSampleTooltip = (event, sampleData) => {
        const rect = event.target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        // Check if there's enough space above the element (at least 120px for sample tooltip)
        const spaceAbove = rect.top;
        const tooltipHeight = 80; // Approximate sample tooltip height
        const shouldShowBelow = spaceAbove < tooltipHeight + 20; // 20px buffer

        setSampleTooltip({
            visible: true,
            content: sampleData,
            x: rect.right + scrollLeft + 5, // Position to the right of the element
            y: shouldShowBelow
                ? rect.bottom + scrollTop + 10 // Show below
                : rect.top + scrollTop - 10, // Show above
            position: shouldShowBelow ? "below" : "above",
        });
    };

    const hideSampleTooltip = () => {
        setSampleTooltip({
            visible: false,
            content: null,
            x: 0,
            y: 0,
            position: "above",
        });
    };

    // Document preview handlers
    const handleDocumentPreview = async (docId) => {
        if (!docId) return;

        // Show loading state
        setDocumentPreview({
            visible: true,
            content: "",
            loading: true,
            docId: docId,
        });

        try {
            const response = await apiPost("https://red.irdop.org/v1/document/preview_doc", {
                id: docId,
            });

            if (response?.status < 300) {
                const data = response?.data;

                // Check if data is an array of URLs (Google Docs links)
                if (Array.isArray(data) && data.length > 0) {
                    // Close the modal
                    setDocumentPreview({
                        visible: false,
                        content: "",
                        loading: false,
                        docId: null,
                    });

                    // Open each URL in a new tab
                    data.forEach((url, index) => {
                        // Add small delay between opening tabs to avoid browser blocking
                        setTimeout(() => {
                            window.open(url, "_blank", "noopener,noreferrer");
                        }, index * 100); // 100ms delay between each tab
                    });

                    // Show success notification
                    toast.success(`Đã mở ${data.length} tài liệu Google Docs`);
                }
                // If data is a single URL string
                else if (typeof data === "string" && (data.includes("docs.google.com") || data.includes("drive.google.com"))) {
                    // Close the modal
                    setDocumentPreview({
                        visible: false,
                        content: "",
                        loading: false,
                        docId: null,
                    });

                    // Open the URL in a new tab
                    window.open(data, "_blank", "noopener,noreferrer");
                    toast.success("Đã mở tài liệu Google Docs");
                }
                // If data is HTML content (original behavior)
                else if (data) {
                    setDocumentPreview({
                        visible: true,
                        content: data,
                        loading: false,
                        docId: docId,
                    });
                } else {
                    throw new Error("Không có dữ liệu tài liệu");
                }
            } else {
                throw new Error("Failed to load document");
            }
        } catch (error) {
            setDocumentPreview({
                visible: true,
                content: '<div class="text-red-600 p-4">Lỗi khi tải tài liệu: ' + error.message + "</div>",
                loading: false,
                docId: docId,
            });
            toast.error("Lỗi khi tải tài liệu: " + error.message);
        }
    };

    // Close document preview
    const closeDocumentPreview = () => {
        setDocumentPreview({
            visible: false,
            content: "",
            loading: false,
            docId: null,
        });
    };

    // FilePreview Component (from ExperimentLog)
    const FilePreview = ({ url, fileName, onClose, isVisible }) => {
        const getFileExtension = (filename) => {
            return filename?.split(".").pop()?.toLowerCase() || "";
        };

        const isImage = (filename) => {
            const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
            return imageExtensions.includes(getFileExtension(filename));
        };

        const isPdf = (filename) => {
            return getFileExtension(filename) === "pdf";
        };

        const isVideo = (filename) => {
            const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"];
            return videoExtensions.includes(getFileExtension(filename));
        };

        const isAudio = (filename) => {
            const audioExtensions = ["mp3", "wav", "ogg", "aac", "flac"];
            return audioExtensions.includes(getFileExtension(filename));
        };

        const isText = (filename) => {
            const textExtensions = ["txt", "csv", "json", "xml", "log"];
            return textExtensions.includes(getFileExtension(filename));
        };

        if (!isVisible || !url) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60]" onClick={onClose}>
                <div className="bg-white rounded-lg max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                        <h3 className="text-lg font-semibold text-black truncate max-w-[80%]">{fileName}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold min-w-[24px] h-6 flex items-center justify-center">
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden bg-gray-100">
                        <iframe src={url} className="w-full h-full border-0" title={fileName} style={{ minHeight: "100%" }} />
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2 inline-flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            Tải xuống
                        </a>
                        <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Handle file preview (similar to ExperimentLog)
    const handleFileAction = async (docRecord, mode) => {
        try {
            // First, get the document details to obtain the fileId
            const docResponse = await apiPost("https://red.irdop.org/v1/document/get_doc", {
                docId: docRecord.docId,
            });

            if (docResponse.status === 200 && docResponse.data && docResponse.data.fileId) {
                const fileId = docResponse.data.fileId;

                // Now get the download link using the actual fileId
                const response = await apiPost("https://red.irdop.org/v1/file/get/download_link", {
                    expiry: 60 * 10,
                    mode: mode,
                    fileRecord: { id: fileId },
                });

                if (response.status === 200 && response.data) {
                    if (mode === "view") {
                        // Display preview in popup
                        setPreviewFile({ id: fileId, originInfo: { fileName: `Document-${fileId}` } });
                        setPreviewUrl(response.data);
                    } else if (mode === "download") {
                        // Download file using blob
                        const downloadResponse = await fetch(response.data);
                        const blob = await downloadResponse.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `Document-${fileId}`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                    }
                } else {
                    throw new Error("Failed to get download link");
                }
            } else {
                throw new Error("Failed to get document details");
            }
        } catch (error) {
            showErrorNotification(`Lỗi khi ${mode === "view" ? "xem" : "tải"} file: ${error.message}`);
        }
    };

    // Handle click on docId to open Google Docs
    const handleDocIdClick = async (docId) => {
        if (!docId) return;

        try {
            // Call API to get Google Docs URL
            const response = await apiPost("https://red.irdop.org/v1/option/get/url", {
                urlType: "googleDoc",
                urlId: docId,
            });

            if (response?.status < 300 && response?.data) {
                // Open the URL in a new tab
                window.open(response.data, "_blank", "noopener,noreferrer");
                toast.success("Đã mở tài liệu Google Docs");
            } else {
                throw new Error("Không thể lấy URL tài liệu");
            }
        } catch (error) {
            toast.error("Lỗi khi mở tài liệu: " + error.message);
        }
    };

    // Handle note icon click
    const handleNoteClick = (analysis, e) => {
        e.stopPropagation();
        setSelectedAnalysisForNote(analysis);
        setNewNoteText("");
        setShowNoteModal(true);
    };

    // Handle note update
    const handleUpdateNote = async () => {
        if (!selectedAnalysisForNote || !newNoteText.trim()) {
            toast.warning("Vui lòng nhập nội dung ghi chú");
            return;
        }

        setIsUpdatingNote(true);
        try {
            const currentNote = selectedAnalysisForNote.note || "";
            const userName = currentUser?.identity_name || "Unknown User";
            const timestamp = new Date().toLocaleString("vi-VN");
            const newNote = currentNote ? `${currentNote}\n[${timestamp}] ${userName}: ${newNoteText.trim()}` : `[${timestamp}] ${userName}: ${newNoteText.trim()}`;

            const response = await apiPost("https://red.irdop.org/v1/analysis/update", {
                analysis: {
                    id: selectedAnalysisForNote.id,
                    note: newNote,
                },
            });

            if (response?.status < 300) {
                toast.success("Cập nhật ghi chú thành công");

                // Update local data
                setData((prevData) => prevData.map((analysis) => (analysis.id === selectedAnalysisForNote.id ? { ...analysis, note: newNote } : analysis)));

                // Close modal
                setShowNoteModal(false);
                setSelectedAnalysisForNote(null);
                setNewNoteText("");

                // Reload data to get fresh data
                fetchAnalysisData(true);
            } else {
                toast.error("Lỗi khi cập nhật ghi chú");
            }
        } catch (error) {
            console.error("Error updating note:", error);
            toast.error("Lỗi khi cập nhật ghi chú: " + error.message);
        } finally {
            setIsUpdatingNote(false);
        }
    };

    // Handle close file preview
    const handleClosePreview = () => {
        setPreviewFile(null);
        setPreviewUrl("");
    };

    return (
        <div className="flex h-full bg-gray-100 relative overflow-y-hidden">
            {/* Fixed Header with breadcrumb - đè lên toàn bộ chiều rộng */}
            <div className="fixed top-0 left-16 right-0 z-40 bg-white p-2 shadow-md">
                <div className="flex justify-between items-center w-full">
                    {/* Extended Breadcrumb with Technician Dropdown - chiếm hết chiều rộng */}
                    <div className="flex items-center space-x-2 font-bold text-sm text-gray-500 flex-1">
                        {sidebarCollapsed && (
                            <button
                                onClick={toggleSidebarCollapse}
                                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors mr-2 flex-shrink-0"
                                onMouseEnter={(e) => showTooltip(e, "Mở rộng sidebar")}
                                onMouseLeave={hideTooltip}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                        <span className="hover:underline flex-shrink-0" onClick={() => onNavigateToLab && onNavigateToLab("analysis")}>
                            LAB
                        </span>
                        <span className="flex-shrink-0">/</span>
                        <span className="hover:underline flex-shrink-0">PHÉP THỬ</span>
                        <span className="flex-shrink-0">/</span>
                        <div className="relative flex-shrink-0" data-technician-dropdown>
                            {viewMode === "admin" ? (
                                <>
                                    <button
                                        className="text-blue-600 font-bold underline hover:text-blue-800 transition-colors px-1 py-0.5 flex gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTechnicianDropdownToggle();
                                        }}
                                    >
                                        {getCurrentTechnicianName() === "TOÀN BỘ" ? "TẤT CẢ KNV" : getCurrentTechnicianName()} <IoIosArrowDown size={20} />
                                    </button>
                                    {technicianDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-48">
                                            <div className="max-h-60 overflow-y-auto">
                                                <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => handleTechnicianSelection(null)}>
                                                    Tất cả kiểm nghiệm viên
                                                </button>
                                                {/* Remove duplicates by using unique identity_uid */}
                                                {technicians
                                                    ?.filter((tech, index, arr) => arr.findIndex((t) => t.identity_uid === tech.identity_uid) === index)
                                                    .map((tech) => (
                                                        <button
                                                            key={tech.identity_uid}
                                                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                                                            onClick={() => handleTechnicianSelection(tech.identity_uid)}
                                                        >
                                                            {tech.identity_name} ({tech.alias})
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span className="text-blue-600 font-bold px-1 py-0.5">{currentUser?.identity_name || "CÁ NHÂN"}</span>
                            )}
                        </div>
                    </div>

                    {/* Action buttons - flex-shrink-0 để không bị thu nhỏ */}
                    <div className="flex items-center space-x-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-shrink-0">
                        {/* Action buttons */}
                        <div className="flex items-center space-x-2 flex-shrink-0">
                            {/* Selection actions */}
                            {hasSelectedSamples && (
                                <>
                                    <button
                                        onClick={clearSelection}
                                        className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors whitespace-nowrap focus:outline-none"
                                    >
                                        Hủy chọn ({selectedAnalysisIds.size})
                                    </button>
                                    <button
                                        onClick={handleBulkEditClick}
                                        className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap focus:outline-none"
                                    >
                                        Sửa hàng loạt
                                    </button>
                                </>
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
                                onClick={handleRelogin}
                                className="px-3 py-2 border-2 rounded-md text-sm font-bold transition-colors shadow-sm my-tasks-btn bg-white border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                                <span>Đổi tài khoản</span>
                            </button>

                            {/* Result Entry Session Button */}
                            <button
                                onClick={handleResultEntryToggle}
                                disabled={isSessionUpdating}
                                className={`px-3 py-2 border-2 rounded-md text-sm font-bold transition-colors shadow-sm flex items-center gap-2 ${
                                    isResultEntrySession
                                        ? "bg-green-600 text-white border-green-600 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed"
                                        : "bg-white border-purple-600 text-purple-600 hover:bg-purple-50 disabled:opacity-70 disabled:cursor-not-allowed"
                                }`}
                            >
                                {isSessionUpdating ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : isResultEntrySession ? (
                                    <span>Kết thúc nhập ({pendingChanges.size})</span>
                                ) : (
                                    <span>Bắt đầu nhập KQ</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>{" "}
            {/* Session Active Banner using Portal - doesn't affect layout */}
            {isResultEntrySession &&
                createPortal(
                    <div className="fixed top-0 left-0 z-[9999] bg-yellow-400 border-b-2 border-r-2 border-yellow-600 shadow-lg rounded-br-lg" style={{ maxWidth: "500px" }}>
                        <div className="flex items-center gap-3 px-4 py-2">
                            <svg className="w-5 h-5 text-yellow-800 animate-pulse flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-sm font-semibold text-yellow-900 whitespace-nowrap">🔬 Phiên nhập kết quả ({pendingChanges.size})</span>
                                <span className="text-xs text-yellow-800 truncate">{currentUser?.identity_name || "Không xác định"}</span>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
            {/* Sidebar - nằm dưới breadcrumb */}
            <div
                className={`bg-gray-100 border-gray-300 z-30 flex flex-col box-border transition-all duration-300 ${sidebarCollapsed ? "min-w-0 max-w-0 overflow-hidden" : "min-w-72 max-w-80"}`}
                style={{ height: "calc(100% - 50px)", marginTop: "50px" }}
            >
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Parameter search */}
                    <div className="p-3 border-b border-gray-300 bg-gray-50">
                        <div className="flex items-center gap-2 mb-3">
                            <button
                                onClick={toggleSidebarCollapse}
                                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                onMouseEnter={(e) => showTooltip(e, "Thu gọn sidebar")}
                                onMouseLeave={hideTooltip}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm chỉ tiêu..."
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black text-left"
                                    value={parameterSearchTerm}
                                    onChange={(e) => setParameterSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            // Immediately fetch parameters when Enter is pressed, even with empty value
                                            fetchParameters(parameterSearchTerm);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Deadline filter buttons */}
                        <div className="pt-3 border-gray-300">
                            <div className="grid grid-cols-4 gap-1">
                                <button
                                    onClick={() => selectDeadlineFilter("overdue")}
                                    className={`px-1 py-1 text-xs rounded-md font-medium transition-colors ${
                                        new URLSearchParams(location.search).get("deadlineType") === "overdue" ? "bg-red-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"
                                    }`}
                                >
                                    Hôm nay
                                </button>
                                <button
                                    onClick={() => selectDeadlineFilter("3days")}
                                    className={`px-1 py-1 text-xs rounded-md font-medium transition-colors ${
                                        new URLSearchParams(location.search).get("deadlineType") === "3days" ? "bg-yellow-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"
                                    }`}
                                >
                                    3 Ngày
                                </button>
                                <button
                                    onClick={() => selectDeadlineFilter("week")}
                                    className={`px-1 py-1 text-xs rounded-md font-medium transition-colors ${
                                        new URLSearchParams(location.search).get("deadlineType") === "week" ? "bg-blue-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"
                                    }`}
                                >
                                    1 Tuần
                                </button>
                                <button
                                    onClick={openDatePicker}
                                    className={`px-1 py-1 text-xs rounded-md font-medium transition-colors ${(() => {
                                        const queryParams = new URLSearchParams(location.search);
                                        const deadline = queryParams.get("deadline");
                                        const deadlineType = queryParams.get("deadlineType");
                                        return deadline && !deadlineType && !filters.headerFilters.deadline ? "bg-purple-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200";
                                    })()}`}
                                >
                                    Chọn
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
                                    className={`sidebar-section-header flex items-center justify-between py-2 cursor-pointer ${sidebarExpandedSections.analysis ? "active" : ""}`}
                                    onClick={() => toggleSidebarSection("analysis")}
                                >
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-sm font-bold text-gray-800">CHỈ TIÊU</h3>
                                    </div>
                                    <div className="flex items-center space-x-2 pr-2">
                                        <span className="sidebar-subtitle text-blue-800">{parametersData.analysis.length}</span>
                                        <span className="text-gray-500">{sidebarExpandedSections.analysis ? "▼" : "▶"}</span>
                                    </div>
                                </div>
                                {sidebarExpandedSections.analysis && (
                                    <div className="ml-2  pr-2 space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto overflow-x-hidden custom-scrollbar">
                                        {parametersData.analysis.map((param, index) => {
                                            const protocolCode = param.protocolCode || "";
                                            const normalizedProtocolCode = protocolCode && protocolCode.trim() ? protocolCode : "null";
                                            const itemKey = `analysis|${param.parameterName}|${normalizedProtocolCode}`;
                                            const isSelected = selectedParameter === itemKey;

                                            return (
                                                <div
                                                    key={`${param.parameterName}-${normalizedProtocolCode}-${index}`}
                                                    className={`sidebar-item py-1 cursor-pointer transition-all duration-200 flex items-center justify-between ${
                                                        isSelected ? "text-blue-600 font-bold underline" : "text-gray-700"
                                                    }`}
                                                    onClick={() => selectItem("analysis", param.parameterName, protocolCode)}
                                                >
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className="text-xs font-medium text-left">
                                                            <span className="text-left">{param.parameterName}</span>
                                                            {protocolCode && <span className="ml-1 text-left text-gray-500">{protocolCode}</span>}
                                                        </p>
                                                    </div>
                                                    <div className="item-count text-xs font-semibold text-gray-600">{param.total}</div>
                                                </div>
                                            );
                                        })}
                                        {parametersData.analysis.length === 0 && <div className="text-center py-4 text-gray-500 text-xs">Không có dữ liệu chỉ tiêu</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Main content */}
            <div
                className="transition-all w-full min-h-screen bg-white relative flex flex-col"
                style={{
                    paddingTop: "55px",
                }}
            >
                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar" ref={scrollContainerRef}>
                    <div className="flex-1 p-4 overflow-auto custom-scrollbar relative">
                        {/* Loading indicator - small, non-intrusive */}
                        {loading && data.length > 0 && (
                            <div className="absolute top-6 right-6 z-50 bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-2 border border-gray-200">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-gray-600">Đang tải...</span>
                            </div>
                        )}

                        {/* Table container without stretching rows */}
                        <div className="w-full">
                            <table className="w-full bg-white border-collapse min-w-[1050px] border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                <thead className="bg-blue-100">
                                    <tr>
                                        {filters.columns
                                            .filter((col) => col !== "id" && col !== "sampleName")
                                            .map((column) => (
                                                <HeaderCell
                                                    key={column}
                                                    columnName={column}
                                                    displayName={availableColumns[column] || column}
                                                    isFilterable={true}
                                                    isSortable={true}
                                                    isFiltered={isColumnFiltered(column)}
                                                    sortDirection={getSortDirection(column)}
                                                    onFilter={handleHeaderFilter}
                                                    onSort={handleSort}
                                                    onClearFilter={handleClearColumnFilter}
                                                    className="text-black"
                                                />
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
                                            const isHighPriority = row.status === 1;
                                            const isSelected = selectedAnalysisIds.has(row.id);
                                            const hasPendingChanges = pendingChanges.has(row.id);

                                            return (
                                                <tr
                                                    key={`${row.id}-${row.sampleId || "unknown"}-${row.parameterName || "unknown"}-${index}`}
                                                    className={`transition-colors cursor-pointer user-select-none ${
                                                        isSelected
                                                            ? "row-selected"
                                                            : hasPendingChanges
                                                            ? "bg-yellow-50 border-l-4 border-yellow-500"
                                                            : `${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`
                                                    } ${isHighPriority ? "font-bold text-red-600" : ""}`}
                                                    onMouseDown={(e) => handleMouseDown(row.id, e)}
                                                    onMouseEnter={() => handleMouseEnter(row.id)}
                                                >
                                                    {filters.columns
                                                        .filter((col) => col !== "id" && col !== "sampleName" && col !== "technician")
                                                        .map((column) => (
                                                            <td key={column} className={`px-2 py-1 text-sm align-top text-left ${isHighPriority ? "text-red-600 font-bold" : "text-gray-900"}`}>
                                                                {column === "sampleId" ? (
                                                                    <div
                                                                        className="relative text-left w-full cursor-pointer hover:bg-blue-50 p-1 rounded"
                                                                        onMouseEnter={(e) => {
                                                                            if (row.sampleId) {
                                                                                showSampleTooltip(e, {
                                                                                    sampleId: row.sampleId,
                                                                                    sampleName: row.sampleName,
                                                                                    sample_description: row.sample_description,
                                                                                });
                                                                            }
                                                                        }}
                                                                        onMouseLeave={hideSampleTooltip}
                                                                    >
                                                                        <span className="text-left">{row.sampleId || ""}</span>
                                                                    </div>
                                                                ) : column === "parameterName" ? (
                                                                    <div className="relative text-left w-full p-1 rounded">
                                                                        <span className="text-left">{row.parameterName || ""}</span>
                                                                    </div>
                                                                ) : column === "matrix" ? (
                                                                    <div className="relative text-left w-full p-1 rounded">
                                                                        <span className="text-left">{row.matrix || ""}</span>
                                                                    </div>
                                                                ) : column === "protocolSource" ? (
                                                                    editingCell && editingCell.analysisId === row.id && editingCell.column === "protocolSource" ? (
                                                                        <select
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            onBlur={() => handleCellBlur(row)}
                                                                            onKeyDown={handleKeyDown}
                                                                            autoFocus
                                                                            className="w-full px-2 py-1 border rounded bg-white"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <option value="">-- Chọn nguồn --</option>
                                                                            <option value="IRDOP">IRDOP</option>
                                                                            <option value="IRDOP VS">IRDOP VS</option>
                                                                            <option value="EX">EX</option>
                                                                        </select>
                                                                    ) : (
                                                                        <div
                                                                            className="relative text-left w-full p-1 rounded cursor-pointer hover:bg-blue-50"
                                                                            onClick={() => handleCellClick(row.id, "protocolSource", row.protocolSource || "")}
                                                                        >
                                                                            <span className="text-left">{row.protocolSource || "--"}</span>
                                                                        </div>
                                                                    )
                                                                ) : column === "protocolCode" ? (
                                                                    editingCell && editingCell.analysisId === row.id && editingCell.column === "protocolCode" ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            onBlur={() => handleCellBlur(row)}
                                                                            onKeyDown={handleKeyDown}
                                                                            autoFocus
                                                                            className="w-full px-2 py-1 border rounded bg-white"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="relative text-left w-full p-1 rounded cursor-pointer hover:bg-blue-50"
                                                                            onClick={() => handleCellClick(row.id, "protocolCode", row.protocolCode || "")}
                                                                        >
                                                                            <span className="text-left">{row.protocolCode || "--"}</span>
                                                                        </div>
                                                                    )
                                                                ) : column === "resultValue" ? (
                                                                    editingCell && editingCell.analysisId === row.id && editingCell.column === "resultValue" ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            onBlur={() => handleCellBlur(row)}
                                                                            onKeyDown={handleKeyDown}
                                                                            autoFocus
                                                                            className="w-full px-2 py-1 border rounded bg-white"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="relative text-left w-full p-1 rounded cursor-pointer hover:bg-blue-50"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleCellClick(row.id, "resultValue", row.resultValue || "");
                                                                            }}
                                                                        >
                                                                            {row.resultValue ? (
                                                                                <div dangerouslySetInnerHTML={{ __html: row.resultValue }} />
                                                                            ) : (
                                                                                <span className="text-gray-400">--</span>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                ) : column === "resultUnit" ? (
                                                                    editingCell && editingCell.analysisId === row.id && editingCell.column === "resultUnit" ? (
                                                                        <input
                                                                            ref={unitInputRef}
                                                                            type="text"
                                                                            value={editValue}
                                                                            onChange={handleUnitInputChange}
                                                                            onBlur={() => handleCellBlur(row)}
                                                                            onKeyDown={handleKeyDown}
                                                                            autoFocus
                                                                            className="w-full px-2 py-1 border rounded bg-white"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="relative text-left w-full p-1 rounded cursor-pointer hover:bg-blue-50"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleCellClick(row.id, "resultUnit", row.resultUnit || "");
                                                                            }}
                                                                        >
                                                                            {row.resultUnit ? <div dangerouslySetInnerHTML={{ __html: row.resultUnit }} /> : <span className="text-gray-400">--</span>}
                                                                        </div>
                                                                    )
                                                                ) : column === "docId" ? (
                                                                    row.docId ? (
                                                                        <div
                                                                            className="flex items-center justify-center cursor-pointer hover:bg-blue-50 p-1 rounded"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDocIdClick(row.docId);
                                                                            }}
                                                                            onMouseEnter={(e) => showTooltip(e, row.docId, "left")}
                                                                            onMouseLeave={hideTooltip}
                                                                        >
                                                                            <MdAttachFile className="w-5 h-5 text-blue-600" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center p-1">
                                                                            <span className="text-gray-300">--</span>
                                                                        </div>
                                                                    )
                                                                ) : column === "note" ? (
                                                                    <div
                                                                        className="flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                                                        onClick={(e) => handleNoteClick(row, e)}
                                                                        onMouseEnter={(e) => {
                                                                            if (row.note) {
                                                                                showTooltip(e, row.note, "left");
                                                                            }
                                                                        }}
                                                                        onMouseLeave={hideTooltip}
                                                                        title={row.note ? "Click để xem/thêm ghi chú" : "Click để thêm ghi chú"}
                                                                    >
                                                                        {row.note ? <span className="text-2xl">📝</span> : <span className="text-2xl text-gray-400">📋</span>}
                                                                    </div>
                                                                ) : column === "technicianId" ? (
                                                                    <div className="text-xs text-gray-900 p-1">{getTechnicianName(row)}</div>
                                                                ) : column === "deadline" ? (
                                                                    <div className="relative text-left w-full p-1 rounded">
                                                                        <span className="text-left">{formatDate(row.deadline) || ""}</span>
                                                                    </div>
                                                                ) : (
                                                                    row[column] || ""
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
                                        handleItemsPerPageChange(newItemsPerPage);
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
                                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
                                >
                                    Trước
                                </button>
                                <span className="px-4 py-2 text-sm text-gray-700 font-medium cursor-pointer hover:bg-blue-100 rounded">
                                    Trang {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
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
                            {/* Special filters for resultValue, deadline, docId */}
                            {activeFilterColumn === "resultValue" ? (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Lọc theo kết quả</h4>
                                    <div className="space-y-2">
                                        <button onClick={() => applySpecialFilter("resultValue", "submitted")} className="w-full text-left p-2 rounded hover:bg-blue-50 border border-gray-200 text-sm">
                                            Đã có kết quả
                                        </button>
                                        <button
                                            onClick={() => applySpecialFilter("resultValue", "not submitted")}
                                            className="w-full text-left p-2 rounded hover:bg-blue-50 border border-gray-200 text-sm"
                                        >
                                            Chưa có kết quả
                                        </button>
                                    </div>
                                    <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
                                        <button onClick={cancelFilter} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50">
                                            Hủy
                                        </button>
                                        {/* Clear filter button - only show if filter is applied */}
                                        {isColumnFiltered(activeFilterColumn) && (
                                            <button
                                                onClick={() => {
                                                    handleClearColumnFilter(activeFilterColumn);
                                                    setActiveFilterColumn(null);
                                                }}
                                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                                            >
                                                Hủy lọc
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : activeFilterColumn === "deadline" ? (
                                <>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Lọc theo hạn trả</h4>

                                    {/* Date Range Picker */}
                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Chọn khoảng thời gian</span>
                                            <button onClick={() => setShowDateRange(!showDateRange)} className="text-sm text-blue-600 hover:text-blue-800">
                                                <FaCalendarAlt className="inline mr-1" />
                                                {showDateRange ? "Ẩn" : "Hiện"} chọn ngày
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
                                                        ? `Từ ${startDate.toLocaleDateString("vi-VN")} đến ${endDate.toLocaleDateString("vi-VN")}`
                                                        : startDate
                                                        ? `Từ ${startDate.toLocaleDateString("vi-VN")}`
                                                        : endDate
                                                        ? `Đến ${endDate.toLocaleDateString("vi-VN")}`
                                                        : ""}
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

                                    {/* Search input */}
                                    <div className="flex items-center space-x-2 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm trong Hạn trả..."
                                            value={filterSearchTerm}
                                            onChange={(e) => setFilterSearchTerm(e.target.value)}
                                            className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Select All / Unselect All */}
                                    {filterResults.length > 0 && (
                                        <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-200">
                                            <button onClick={selectAllFilterValues} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                                                Chọn tất cả
                                            </button>
                                            <button onClick={unselectAllFilterValues} className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">
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
                                                        key={`${activeFilterColumn}-${result.value || "empty"}-${index}`}
                                                        className="flex items-center space-x-2 p-1 rounded cursor-pointer transition-colors hover:bg-gray-100"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFilterValues.includes(result.value)}
                                                            onChange={() => handleFilterValueSelect(result.value)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                                        />
                                                        <span className="flex-1 text-sm text-black">{result.label || result.value || "(Trống)"}</span>
                                                        <span className="text-xs text-gray-500 flex-shrink-0">({result.count})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
                                        <button onClick={cancelFilter} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50">
                                            Hủy
                                        </button>
                                        {/* Clear filter button - only show if filter is applied */}
                                        {isColumnFiltered(activeFilterColumn) && (
                                            <button
                                                onClick={() => {
                                                    handleClearColumnFilter(activeFilterColumn);
                                                    setActiveFilterColumn(null);
                                                }}
                                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                                            >
                                                Hủy lọc
                                            </button>
                                        )}
                                        <button
                                            onClick={applyFilter}
                                            disabled={selectedFilterValues.length === 0 && !startDate && !endDate}
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Xác nhận ({selectedFilterValues.length})
                                        </button>
                                    </div>
                                </>
                            ) : activeFilterColumn === "docId" ? (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Lọc theo tài liệu</h4>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => applySpecialFilter("docId", "has_file")}
                                            className="w-full text-left p-2 rounded hover:bg-green-50 border border-gray-200 text-sm text-green-700"
                                        >
                                            Đã có tài liệu
                                        </button>
                                        <button
                                            onClick={() => applySpecialFilter("docId", "no_file")}
                                            className="w-full text-left p-2 rounded hover:bg-red-50 border border-gray-200 text-sm text-red-700"
                                        >
                                            Chưa có tài liệu
                                        </button>
                                    </div>
                                    <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
                                        <button onClick={cancelFilter} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50">
                                            Hủy
                                        </button>
                                        {/* Clear filter button - only show if filter is applied */}
                                        {isColumnFiltered(activeFilterColumn) && (
                                            <button
                                                onClick={() => {
                                                    handleClearColumnFilter(activeFilterColumn);
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
                                            <button onClick={selectAllFilterValues} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                                                Chọn tất cả
                                            </button>
                                            <button onClick={unselectAllFilterValues} className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">
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
                                                        key={`${activeFilterColumn}-${result.value || "empty"}-${index}`}
                                                        className="flex items-center space-x-2 p-1 rounded cursor-pointer transition-colors hover:bg-gray-100"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFilterValues.includes(result.value)}
                                                            onChange={() => handleFilterValueSelect(result.value)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                                        />
                                                        <span className="flex-1 text-sm text-black">{result.label || result.value || "(Trống)"}</span>
                                                        <span className="text-xs text-gray-500 flex-shrink-0">({result.count})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
                                        <button onClick={cancelFilter} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50">
                                            Hủy
                                        </button>
                                        {/* Clear filter button - only show if filter is applied */}
                                        {isColumnFiltered(activeFilterColumn) && (
                                            <button
                                                onClick={() => {
                                                    handleClearColumnFilter(activeFilterColumn);
                                                    setActiveFilterColumn(null);
                                                }}
                                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                                            >
                                                Hủy lọc
                                            </button>
                                        )}
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
            {/* Custom Tooltip Portal */}
            {tooltip.visible &&
                createPortal(
                    <div
                        className={`custom-tooltip ${tooltip.visible ? "visible" : ""} ${tooltip.position || "above"}`}
                        style={{
                            left: `${tooltip.x}px`,
                            top: `${tooltip.y}px`,
                            whiteSpace: "pre-wrap",
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
                        className={`sample-tooltip ${sampleTooltip.visible ? "visible" : ""} ${sampleTooltip.position || "above"}`}
                        style={{
                            left: `${sampleTooltip.x}px`,
                            top: `${sampleTooltip.y}px`,
                        }}
                    >
                        {sampleTooltip.content && (
                            <div className="text-left">
                                <div>
                                    <strong>Mã mẫu:</strong> {sampleTooltip.content.sampleId}
                                </div>
                                <div>
                                    <strong>Tên mẫu:</strong> {sampleTooltip.content.sampleName || "Không có"}
                                </div>
                                <div>
                                    <strong>Mô tả:</strong> {sampleTooltip.content.sample_description || "Không có"}
                                </div>
                            </div>
                        )}
                    </div>,
                    document.body,
                )}
            {/* Document Preview Modal */}
            {documentPreview.visible && (
                <div
                    className="document-preview-modal"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            closeDocumentPreview();
                        }
                    }}
                >
                    <div className="document-preview-content" onClick={(e) => e.stopPropagation()}>
                        <div className="document-preview-header">
                            <h3 className="text-lg font-semibold flex-1">Xem tài liệu {documentPreview.docId && `- ${documentPreview.docId}`}</h3>
                            <button onClick={closeDocumentPreview} className="close-button">
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
                                <iframe className="document-preview-iframe" srcDoc={documentPreview.content} title="Document Preview" sandbox="allow-same-origin allow-scripts" />
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* File Preview Popup */}
            <FilePreview url={previewUrl} fileName={previewFile?.originInfo?.fileName || `Document-${previewFile?.id}`} isVisible={!!previewFile} onClose={handleClosePreview} />
            {/* Date Picker Modal */}
            {showDatePicker && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-80 max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Chọn ngày cụ thể</h3>
                        <div className="mb-4">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className=" text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-200"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button onClick={cancelDatePicker} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50">
                                Hủy
                            </button>
                            <button
                                onClick={() => handleDateSelection(selectedDate)}
                                disabled={!selectedDate}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Áp dụng
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Bulk Update Component */}
            <LabBulkUpdate
                isOpen={showBulkEdit && selectedAnalysisIds.size > 0}
                onClose={() => {
                    setShowBulkEdit(false);
                    setSelectedAnalysisIds(new Set());
                    setSelectedRowsData(new Map());
                }}
                selectedRows={Array.from(selectedAnalysisIds)}
                selectedData={Array.from(selectedRowsData.values())}
                technicians={technicians}
                onStartSession={() => {
                    // Start result entry session
                    if (!isResultEntrySession) {
                        setIsResultEntrySession(true);
                        // Load saved session if available
                        const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
                        if (savedSession) {
                            try {
                                const savedChanges = JSON.parse(savedSession);
                                const changesMap = new Map(Object.entries(savedChanges));
                                setPendingChanges(changesMap);
                            } catch (error) {
                                console.error("Error loading session:", error);
                            }
                        }
                    }
                }}
                onApplyBulkChanges={(bulkChanges) => {
                    // Apply bulk changes to pendingChanges Map (for session)
                    setPendingChanges((prev) => {
                        const newChanges = new Map(prev);
                        bulkChanges.forEach((change) => {
                            newChanges.set(change.id, change);
                        });
                        return newChanges;
                    });
                }}
                onUpdateTableData={(bulkChanges) => {
                    // Update table display data immediately
                    setData((prevData) => {
                        const updatedData = prevData.map((row) => {
                            const change = bulkChanges.find((c) => c.id === row.id);
                            if (change) {
                                return { ...row, ...change };
                            }
                            return row;
                        });
                        return updatedData;
                    });

                    // Close bulk edit modal and clear selections
                    setShowBulkEdit(false);
                    setSelectedAnalysisIds(new Set());
                    setSelectedRowsData(new Map());
                }}
            />
            {/* Login Popup */}
            <LoginPopup isOpen={showLoginPopup} onClose={closeLoginPopup} onLoginSuccess={handleLoginSuccess} />
            {/* Relogin Confirmation Dialog */}
            {/* Result Entry Session Confirmation Dialog */}
            {showSessionConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Xác nhận người nhập kết quả</h2>
                        <p className="text-sm text-gray-600 mb-2">Bạn đang nhập kết quả với tài khoản:</p>
                        <p className="text-base font-semibold text-blue-600 mb-4">{currentUser?.identity_name || "Không xác định"}</p>
                        <p className="text-xs text-gray-500 mb-4 italic">💡 Các thay đổi sẽ được lưu tạm thời và gửi cùng lúc khi kết thúc phiên nhập.</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowSessionConfirm(false);
                                    setPendingEditCell(null);
                                }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
                            >
                                Hủy bỏ
                            </button>
                            <button onClick={handleRelogin} className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">
                                Đăng nhập lại
                            </button>
                            <button onClick={handleConfirmUser} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
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
                    setShowEndSessionDialog(false);
                    // TODO: Use experimentData if needed for logging (including editorContent)
                    await endResultEntrySession();
                }}
                onCancel={() => setShowCancelConfirm(true)}
                analyses={Array.from(pendingChanges.values()).map((change) => {
                    // Merge pending changes with original analysis data to get full information
                    const original = originalAnalyses.get(change.id) || {};
                    return { ...original, ...change };
                })}
                originalAnalyses={Array.from(originalAnalyses.values())}
                isLoading={isSessionUpdating}
            />
            {/* Cancel Confirmation Dialog */}
            {showCancelConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                        <h2 className="text-xl font-bold mb-4 text-red-600">Xác nhận hủy</h2>
                        <p className="text-sm text-gray-700 mb-2">Bạn có chắc chắn muốn hủy tất cả {pendingChanges.size} thay đổi?</p>
                        <p className="text-sm text-red-600 font-semibold mb-6">⚠️ Kết quả sẽ không được lưu!</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setShowCancelConfirm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50">
                                Quay lại
                            </button>
                            <button onClick={handleCancelAllChanges} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
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
                                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">{selectedAnalysisForNote.note}</div>
                                </div>
                            )}

                            {/* Thêm ghi chú mới */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{selectedAnalysisForNote.note ? "Thêm ghi chú mới:" : "Ghi chú:"}</label>
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
                                    setNewNoteText("");
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
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                    </>
                                ) : (
                                    "Cập nhật"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Unit Autocomplete Dropdown Portal */}
            {showUnitDropdown &&
                unitInputRef.current &&
                getPaginatedUnits(unitInput).length > 0 &&
                createPortal(
                    <div
                        className="unit-suggestions-dropdown absolute bg-white border border-gray-300 rounded-md shadow-lg z-[9999]"
                        style={{
                            top: `${unitInputRef.current.getBoundingClientRect().bottom + window.scrollY}px`,
                            left: `${unitInputRef.current.getBoundingClientRect().left + window.scrollX}px`,
                            width: `${unitInputRef.current.offsetWidth}px`,
                            minWidth: "150px",
                        }}
                    >
                        {getPaginatedUnits(unitInput).map((unit, index) => (
                            <div
                                key={index}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-sm border-b border-gray-100"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setEditValue(unit);
                                    setShowUnitDropdown(false);
                                    // Trigger blur to save
                                    setTimeout(() => {
                                        if (unitInputRef.current) {
                                            unitInputRef.current.blur();
                                        }
                                    }, 100);
                                }}
                            >
                                {unit}
                            </div>
                        ))}
                        {filterUnits(unitInput).length > unitItemsPerPage && (
                            <div className="flex justify-between p-2 bg-gray-100">
                                <button className="px-2 py-1 border rounded disabled:opacity-50 text-sm" onClick={() => handleUnitPageChange(unitPage - 1)} disabled={unitPage === 1}>
                                    Prev
                                </button>
                                <span className="text-sm">
                                    {unitPage}/{Math.ceil(filterUnits(unitInput).length / unitItemsPerPage)}
                                </span>
                                <button
                                    className="px-2 py-1 border rounded disabled:opacity-50 text-sm"
                                    onClick={() => handleUnitPageChange(unitPage + 1)}
                                    disabled={unitPage >= Math.ceil(filterUnits(unitInput).length / unitItemsPerPage)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>,
                    document.body,
                )}
        </div>
    );
};

export default ProcessingAnalysis;
