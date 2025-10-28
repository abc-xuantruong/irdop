import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GlobalContext } from '../contexts/GlobalContext';
import { FiRefreshCcw } from 'react-icons/fi';
import Breadcrumb from '../components/Breadcrumb';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import CreateReceipt from '../components/CreateReceipt';
import CreateReceiptFromCRM from '../components/CreateReceiptFromCRM';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import axios from 'axios';
import ShipmentForm from '../components/ShipmentForm';

import { FaCalendarDay, FaFileAlt, FaExternalLinkAlt, FaRegStickyNote, FaStickyNote, FaTimes } from 'react-icons/fa';

const Dashboard = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { setCurrentTitlePage, status, purposes, formatDate, getIdenByUid, identityCache, currentUser } =
		useContext(GlobalContext);
	const [currentList, setCurrentList] = useState([]);
	const [originalList, setOriginalList] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [isFilter, setIsFilter] = useState(false); // State to track if filtering is active
	const [searchTerm, setSearchTerm] = useState('');
	const datePickerRef = useRef(null);
	const [showDateRangePicker, setShowDateRangePicker] = useState(false);

	// Add state to store original values for comparison
	const [originalValues, setOriginalValues] = useState({});

	// Add state for user information
	const [userInfo, setUserInfo] = useState({});

	// Add state for shipment form
	const [showShipmentForm, setShowShipmentForm] = useState(false);
	const [selectedReceipt, setSelectedReceipt] = useState(null);

	const [showRelativeTime, setShowRelativeTime] = useState(true); // Toggle between date format and relative time

	// Pagination state
	const [receiptsPerPage, setReceiptsPerPage] = useState(50);
	const [totalItems, setTotalItems] = useState(0);
	const [totalPages, setTotalPages] = useState(0);

	const [hoveredReceiptId, setHoveredReceiptId] = useState(null);
	const [hoveredSampleId, setHoveredSampleId] = useState(null);

	// Date input state
	const [dateInputValues, setDateInputValues] = useState({});
	const [isDatePickerFocused, setIsDatePickerFocused] = useState(false);
	const [tempDateValues, setTempDateValues] = useState({});

	// Add new state to track today's deadline filter
	const [showTodayDeadlines, setShowTodayDeadlines] = useState(false);

	// Add new state to track overdue filter
	const [showOverdueFilter, setShowOverdueFilter] = useState(false);

	// Add state to track selected report IDs for each sample
	const [selectedReportIds, setSelectedReportIds] = useState({});

	// Add state to track tooltip position and visibility
	const [tooltipState, setTooltipState] = useState({
		visible: false,
		content: '',
		position: { top: 0, left: 0 },
		sourceElement: null,
	});

	// Replace date range picker state with a single state for start and end dates
	const [dateRange, setDateRange] = useState([new Date(), new Date()]);
	const [startDate, endDate] = dateRange;

	// Add state to control DatePicker visibility
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);

	// Add a new state to track filter information
	const [filterInfo, setFilterInfo] = useState({
		isFilterActive: false,
		count: 0,
		startDate: null,
		endDate: null,
	});

	// Add new state for status filtering
	const [statusFilter, setStatusFilter] = useState(null);
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const statusDropdownRef = useRef(null);

	// Add new state for sorting by record code (HSL)
	const [recordCodeSort, setRecordCodeSort] = useState(0); // Changed from boolean to numeric (0, 1, 2)

	// Add new state for sorting by request number (SYC)
	const [requestNumberSort, setRequestNumberSort] = useState(0); // 0: no sorting, 1: descending, 2: show empty

	// Add state for tracking which field is being edited
	const [editingField, setEditingField] = useState({ receiptId: null, sampleId: null, field: null });

	// Add state to track which sample's analysis grid is expanded
	const [expandedAnalysisSampleId, setExpandedAnalysisSampleId] = useState(null);

	// Add state to track analysis history tooltip
	const [analysisHistoryTooltip, setAnalysisHistoryTooltip] = useState({
		visible: false,
		histories: [],
		position: { top: 0, left: 0 },
	});

	// Add state to track analysis summary tooltip (X/Y/Z format)
	const [analysisSummaryTooltip, setAnalysisSummaryTooltip] = useState({
		visible: false,
		analyses: [],
		position: { top: 0, left: 0 },
	});

	// Note modal states
	const [showNoteModal, setShowNoteModal] = useState(false);
	const [selectedAnalysisForNote, setSelectedAnalysisForNote] = useState(null);
	const [newNoteText, setNewNoteText] = useState('');
	const [isUpdatingNote, setIsUpdatingNote] = useState(false);

	// Tooltip state for notes
	const [noteTooltip, setNoteTooltip] = useState({
		visible: false,
		content: '',
		x: 0,
		y: 0,
		position: 'above',
	});

	// Add state for tracking which transaction field is being edited
	const [editingTransaction, setEditingTransaction] = useState({
		receiptId: null,
		transactionIndex: null,
		field: null,
	});

	// Add new state for tracking dropdown visibility
	const [showRecordCodeDropdown, setShowRecordCodeDropdown] = useState(false);
	const [showRequestNumberDropdown, setShowRequestNumberDropdown] = useState(false);
	const [showSalesRecorderDropdown, setShowSalesRecorderDropdown] = useState(false);
	// Add refs for the dropdown menus
	const recordCodeDropdownRef = useRef(null);
	const requestNumberDropdownRef = useRef(null);
	const salesRecorderDropdownRef = useRef(null);

	const handleCopyToClipboard = (text) => {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				Swal.fire({
					position: 'top-end',
					icon: 'success',
					title: 'Copied to clipboard',
					showConfirmButton: false,
					timer: 1000,
					toast: true,
				});
			})
			.catch((err) => {
				Swal.fire({
					position: 'top-end',
					icon: 'error',
					title: 'Failed to copy',
					showConfirmButton: false,
					timer: 1000,
					toast: true,
				});
				console.error('Failed to copy text: ', err);
			});
	};
	const formatDateString = (dateStr) => {
		// Remove any existing separators to normalize
		const normalized = dateStr.replace(/[^0-9]/g, '');

		if (normalized.length === 8) {
			// Format as DD/MM/YYYY if 8 digits
			return `${normalized.substring(0, 2)}/${normalized.substring(2, 4)}/${normalized.substring(4)}`;
		} else if (dateStr.length === 10) {
			// Replace the 3rd and 6th characters with "/" for 10-char strings
			return `${dateStr.substring(0, 2)}/${dateStr.substring(3, 5)}/${dateStr.substring(6)}`;
		}

		// Return original if it doesn't match our patterns
		return dateStr;
	};

	// Function to convert DD/MM/YYYY string to Date object
	const parseDateString = (dateStr) => {
		if (!dateStr) return null;

		// Handle formatted date strings
		const parts = dateStr.split('/');
		if (parts.length === 3) {
			const day = parseInt(parts[0], 10);
			const month = parseInt(parts[1], 10) - 1; // Month is 0-based in JS Date
			const year = parseInt(parts[2], 10);

			if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
				return new Date(year, month, day);
			}
		}

		// Fallback to standard parsing
		const parsedDate = new Date(dateStr);
		return isNaN(parsedDate.getTime()) ? null : parsedDate;
	};

	// Handle raw date input change
	const handleDateInputChange = (receiptId, e) => {
		setDateInputValues({
			...dateInputValues,
			[receiptId]: e.target.value,
		});
	};

	// Handle date picker focus
	const handleDatePickerFocus = (receiptId, currentDate) => {
		setIsDatePickerFocused(true);
		setTempDateValues({
			...tempDateValues,
			[receiptId]: currentDate,
		});
	};

	// Handle temporary date change without API call
	const handleTempDateChange = (receiptId, date) => {
		// Just update the component state without API call
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					return { ...receipt, deadline: date };
				}
				return receipt;
			});
		});
	};

	// Handle deadline key down for date validation and submission
	const handleDeadlineKeyDown = (e, receiptId) => {
		if (e.key === 'Enter') {
			e.preventDefault();

			// Check if there's a manual input
			if (dateInputValues[receiptId]) {
				const formattedDate = formatDateString(dateInputValues[receiptId]);
				const parsedDate = parseDateString(formattedDate);

				if (parsedDate) {
					handleDeadlineChangeAPI(receiptId, parsedDate);
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi định dạng',
						text: 'Định dạng ngày không hợp lệ. Sử dụng định dạng DD/MM/YYYY hoặc DDMMYYYY',
						confirmButtonColor: '#3085d6',
					});

					// Restore original value
					if (tempDateValues[receiptId]) {
						handleTempDateChange(receiptId, tempDateValues[receiptId]);
					}
				}
			} else {
				// If using the date picker directly
				const receipt = currentList.find((r) => r.id === receiptId);
				if (receipt && receipt.deadline) {
					handleDeadlineChangeAPI(receiptId, receipt.deadline);
				}
			}

			// Reset state and remove focus
			setDateInputValues({
				...dateInputValues,
				[receiptId]: undefined,
			});
			setEditingField({ receiptId: null, sampleId: null, field: null });
			if (document.activeElement) {
				document.activeElement.blur();
			}
		} else if (e.key === 'Escape') {
			// Revert to original value
			if (tempDateValues[receiptId]) {
				handleTempDateChange(receiptId, tempDateValues[receiptId]);
			}

			setDateInputValues({
				...dateInputValues,
				[receiptId]: undefined,
			});
			setEditingField({ receiptId: null, sampleId: null, field: null });
			if (document.activeElement) {
				document.activeElement.blur();
			}
		}
	};

	const handleClearSearch = async () => {
		// Reset search term and all filters
		setSearchTerm('');
		setStatusFilter(null); // Clear status filter as well
		// Reset all filters and states
		setIsFilter(false);
		setShowTodayDeadlines(false);
		setShowOverdueFilter(false);

		// Always navigate to the clean path without query parameters
		// This will remove any search parameters from the URL including page, status, etc.
		navigate(location.pathname);

		// Fetch fresh data and ensure both lists are updated
		try {
			// Use the same POST structure as fetchReceipt
			const requestBody = {
				columns: ['*'],
				columnSort: 'receiptDate',
				sortBy: 'DESC',
				itemsPerPage: 100,
				page: 1,
			};

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', requestBody);
			if (response.status === 200) {
				const receipts = response.data?.result || [];
				setOriginalList(receipts);
				setCurrentList(receipts);
			}
		} catch (error) {
			console.error('Error fetching receipts:', error);
		}
	};

	// Split date handling into two functions:
	// 1. UI update function - modified to close the picker immediately after selection
	const handleDeadlineChange = (receiptId, date) => {
		// Update the date in the UI
		handleTempDateChange(receiptId, date);
		setEditingField({ receiptId: null, sampleId: null, field: null });

		// If we have a valid date, trigger the API update
		if (date) {
			handleDeadlineChangeAPI(receiptId, date);
		}
	};

	// 2. API update function - only called on explicit confirmation
	const handleDeadlineChangeAPI = async (receiptId, newDeadline) => {
		// Prevent technicians from updating deadline
		if (isTechnician()) {
			showToast('Bạn không có quyền cập nhật hạn trả', 'error');
			return;
		}

		try {
			// If we have a date, adjust it for GMT+7 timezone
			let formattedDate = null;
			if (newDeadline) {
				// Add 7 hours to account for GMT+7
				const adjustedDate = new Date(newDeadline);
				adjustedDate.setHours(adjustedDate.getHours() + 7);
				formattedDate = adjustedDate.toISOString().split('T')[0];
			}
			const payload = {
				receipt: {
					id: receiptId,
					receiptId: getReceiptUidById(receiptId), // Helper function to get receiptId by id
					deadline: formattedDate,
				},
			};

			const response = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

			if (response.status === 200) {
				showToast('Cập nhật hạn trả thành công!');
				fetchReceipt(); // Fetch new data to update the list
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật hạn trả',
				});
			}
		} catch (error) {
			console.error('Error updating receipt deadline:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật hạn trả',
			});
		} finally {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	// New function to check if a date is today or past due
	const isDeadlineToday = (deadline) => {
		if (!deadline) return false;

		const deadlineDate = new Date(deadline);
		const today = new Date();

		// Reset time part for comparison
		const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
		const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

		return deadlineDay <= todayDay;
	};

	// Format the date with appropriate styling - Updated with purple for overdue
	const formatDeadlineWithStyle = (deadline, receipt) => {
		if (!deadline) return <span className="text-start block">--</span>;

		// If all samples are completed, show in dark green regardless of deadline date
		if (areAllSamplesCompleted(receipt)) {
			return <span className="text-green-800">{formatDate(deadline)}</span>;
		}

		// Otherwise use the existing logic for today/past due dates
		if (isDeadlineToday(deadline)) {
			return <span className="text-red-600">{formatDate(deadline)}</span>;
		}

		const deadlineDate = new Date(deadline);
		const today = new Date();
		const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
		const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

		if (deadlineDay < todayDay) {
			return <span className="text-purple-800">{formatDate(deadline)}</span>;
		}

		return formatDate(deadline);
	};

	// Toggle between date format and relative time
	const toggleDeadlineFormat = () => {
		setShowRelativeTime(!showRelativeTime);
	}; // Add a new function to fetch receipts filtered by deadline
	const fetchReceiptsByDeadline = async (start, end) => {
		try {
			// Format dates properly to avoid timezone issues
			const formattedStartDate = start
				? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(
						2,
						'0',
				  )}`
				: null;
			const formattedEndDate = end
				? `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(
						2,
						'0',
				  )}`
				: null;

			if (!formattedStartDate || !formattedEndDate) {
				showToast('Vui lòng chọn khoảng thời gian', 'error');
				return;
			}

			const payload = {
				page: 1,
				itemsPerPage: receiptsPerPage,
				deadlineStartAt: formattedStartDate,
				deadlineEndAt: formattedEndDate,
			};

			// Add status filter if present in URL
			const queryParams = new URLSearchParams(location.search);
			const statusParam = queryParams.get('status');
			if (statusParam !== null) {
				payload.status = parseInt(statusParam, 10);
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', payload);

			if (response.status === 200) {
				if (response.data && response.data.result && Array.isArray(response.data.result)) {
					// Update the current list with filtered data
					setCurrentList(response.data.result);
					setOriginalList(response.data.result);
					setIsFilter(true);
					setCurrentPage(1); // Reset to first page

					// Update pagination info using API response
					const pagination = response.data.pagination || {};
					setTotalItems(pagination.totalItems || response.data.result.length);
					setTotalPages(
						pagination.totalPages ||
							Math.ceil((pagination.totalItems || response.data.result.length) / receiptsPerPage),
					);

					// Reset search term since we're now filtering by date
					setSearchTerm('');

					// Store filter information
					setFilterInfo({
						isFilterActive: true,
						count: response.data.result.length,
						totalItems: pagination.totalItems || response.data.result.length,
						startDate: start,
						endDate: end,
					});

					// Add deadline filter to URL params
					const queryParams = new URLSearchParams(location.search);
					queryParams.set('deadlineStart', formattedStartDate);
					queryParams.set('deadlineEnd', formattedEndDate);
					// Remove search, overdue and page params if they exist
					queryParams.delete('searchTerm');
					queryParams.delete('overdue');
					queryParams.delete('page'); // Reset to page 1
					navigate(`${location.pathname}?${queryParams.toString()}`);

					// Show toast with count - updated text format
					const displayCount = response.data.result.length;
					const totalCount = pagination.totalItems || response.data.result.length;
					showToast(
						`Hiển thị ${displayCount} trong số ${totalCount} tiếp nhận có hạn trả kết quả từ ${formatDate(
							start,
						)} đến ${formatDate(end)}`,
						'info',
					);
				} else {
					// Handle case where API returns empty array or no data
					setCurrentList([]);
					setIsFilter(true);
					setCurrentPage(1);

					// Update pagination info for empty result
					setTotalItems(0);
					setTotalPages(1);

					// Update filter info for empty result
					setFilterInfo({
						isFilterActive: true,
						count: 0,
						totalItems: 0,
						startDate: start,
						endDate: end,
					});

					// Add deadline filter to URL params even for empty results
					const queryParams = new URLSearchParams(location.search);
					queryParams.set('deadlineStart', formattedStartDate);
					queryParams.set('deadlineEnd', formattedEndDate);
					// Remove search, overdue and page params if they exist
					queryParams.delete('searchTerm');
					queryParams.delete('overdue');
					queryParams.delete('page'); // Reset to page 1
					navigate(`${location.pathname}?${queryParams.toString()}`);

					showToast('Không tìm thấy tiếp nhận nào trong khoảng thời gian này', 'info');
				}
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi lọc dữ liệu theo hạn trả',
				});
			}
		} catch (error) {
			console.error('Error fetching receipts by deadline:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi lọc dữ liệu theo hạn trả',
			});
		}
	};

	// Add function to handle Apply button click
	const handleApplyDateFilter = () => {
		if (!startDate || !endDate) {
			showToast('Vui lòng chọn khoảng thời gian', 'error');
			return;
		}
		fetchReceiptsByDeadline(startDate, endDate);
	};

	// Updated filterTodayDeadlines function to respond to a single click
	const filterTodayDeadlines = (e) => {
		// If deadline filter is already active and the click didn't come from inside the datepicker container
		if (showTodayDeadlines && !e.target.closest('.datepicker-container')) {
			// Turn off deadline filter
			setShowTodayDeadlines(false);
			setShowDateRangePicker(false);
			setIsCalendarOpen(false);

			// Reset to original list if no other filters are active
			if (!searchTerm) {
				setCurrentList(originalList);
				setIsFilter(false);

				// Reset filter info
				setFilterInfo({
					isFilterActive: false,
					count: 0,
					startDate: null,
					endDate: null,
				});
			}

			return;
		}

		// When clicking the deadline button and not already showing the date picker
		if (!showTodayDeadlines) {
			// Turn off overdue filter if active
			if (showOverdueFilter) {
				setShowOverdueFilter(false);
			}

			// Reset date range to today's date for both start and end
			const today = new Date();
			setDateRange([today, today]);

			// Show the date picker
			setShowTodayDeadlines(true);
			setShowDateRangePicker(true);
			setIsCalendarOpen(true);
		}
	};
	// Modify the handleDateRangeChange function to properly handle date selection and maintain focus on today's date
	const handleDateRangeChange = (update) => {
		setDateRange(update);

		// Only close calendar and send API request when both dates are selected
		if (update[0] && update[1]) {
			// Use a shorter delay and ensure state is properly updated
			setTimeout(() => {
				// Close the calendar
				setIsCalendarOpen(false);

				// Send API request with selected date range - ensure we're using the update values
				fetchReceiptsByDeadline(update[0], update[1]);
			}, 100); // Reduced timeout for better responsiveness
		}
	};

	// Add this function to handle resetting the date filter to today
	const handleResetDateFilter = () => {
		// Turn off deadline filter
		setShowTodayDeadlines(false);
		setShowDateRangePicker(false);
		setIsCalendarOpen(false);

		// Reset date range to today
		const today = new Date();
		setDateRange([today, today]);

		// Reset filter info
		setFilterInfo({
			isFilterActive: false,
			count: 0,
			startDate: null,
			endDate: null,
		});

		// Remove deadline params from URL and reload data
		const queryParams = new URLSearchParams(location.search);
		queryParams.delete('deadlineStart');
		queryParams.delete('deadlineEnd');
		queryParams.delete('page'); // Reset to page 1
		navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);

		// Reset to original view and reload data
		setCurrentList(originalList);
		setIsFilter(false);
		fetchReceipt(); // Reload original data
	};

	// Add function to fetch overdue receipts
	const fetchOverdueReceipts = async () => {
		try {
			const today = new Date();
			const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
				today.getDate(),
			).padStart(2, '0')}`;

			const payload = {
				page: 1,
				itemsPerPage: receiptsPerPage,
				deadlineEndAt: formattedToday,
			};

			// Add status filter if present in URL
			const queryParams = new URLSearchParams(location.search);
			const statusParam = queryParams.get('status');
			if (statusParam !== null) {
				payload.status = parseInt(statusParam, 10);
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', payload);

			if (response.status === 200) {
				if (response.data && response.data.result && Array.isArray(response.data.result)) {
					// Update the current list with overdue data
					setCurrentList(response.data.result);
					setOriginalList(response.data.result);
					setIsFilter(true);
					setCurrentPage(1); // Reset to first page

					// Update pagination info using API response
					const pagination = response.data.pagination || {};
					setTotalItems(pagination.totalItems || response.data.result.length);
					setTotalPages(
						pagination.totalPages ||
							Math.ceil((pagination.totalItems || response.data.result.length) / receiptsPerPage),
					);

					// Reset search term
					setSearchTerm('');

					// Add overdue filter to URL params
					const queryParams = new URLSearchParams(location.search);
					queryParams.set('overdue', 'true');
					// Remove search, deadline and page params if they exist
					queryParams.delete('searchTerm');
					queryParams.delete('deadlineStart');
					queryParams.delete('deadlineEnd');
					queryParams.delete('page'); // Reset to page 1
					navigate(`${location.pathname}?${queryParams.toString()}`);

					// Show toast with count and total
					const displayCount = response.data.result.length;
					const totalCount = pagination.totalItems || response.data.result.length;
					showToast(`Hiển thị ${displayCount} trong số ${totalCount} tiếp nhận đã quá hạn`, 'info');
				} else {
					// Handle empty result
					setCurrentList([]);
					setIsFilter(true);
					setCurrentPage(1);
					setTotalItems(0);
					setTotalPages(1);

					// Add overdue filter to URL params even for empty results
					const queryParams = new URLSearchParams(location.search);
					queryParams.set('overdue', 'true');
					// Remove search, deadline and page params if they exist
					queryParams.delete('searchTerm');
					queryParams.delete('deadlineStart');
					queryParams.delete('deadlineEnd');
					queryParams.delete('page'); // Reset to page 1
					navigate(`${location.pathname}?${queryParams.toString()}`);

					showToast('Không tìm thấy tiếp nhận nào quá hạn', 'info');
				}
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi lấy danh sách tiếp nhận quá hạn',
				});
			}
		} catch (error) {
			console.error('Error fetching overdue receipts:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi lấy danh sách tiếp nhận quá hạn',
			});
		}
	};

	// Function to fetch deadline filtered receipts with specific page
	const fetchReceiptsByDeadlineWithPage = async (start, end, page) => {
		try {
			const formattedStartDate = start
				? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(
						2,
						'0',
				  )}`
				: null;
			const formattedEndDate = end
				? `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(
						2,
						'0',
				  )}`
				: null;

			if (!formattedStartDate || !formattedEndDate) return;

			const payload = {
				page: page,
				itemsPerPage: receiptsPerPage,
				deadlineStartAt: formattedStartDate,
				deadlineEndAt: formattedEndDate,
			};

			// Add status filter if present in URL
			const queryParams = new URLSearchParams(location.search);
			const statusParam = queryParams.get('status');
			if (statusParam !== null) {
				payload.status = parseInt(statusParam, 10);
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', payload);

			if (response.status === 200 && response.data && response.data.result && Array.isArray(response.data.result)) {
				setCurrentList(response.data.result);
				setCurrentPage(page);

				// Update pagination info
				const pagination = response.data.pagination || {};
				setTotalItems(pagination.totalItems || response.data.result.length);
				setTotalPages(
					pagination.totalPages || Math.ceil((pagination.totalItems || response.data.result.length) / receiptsPerPage),
				);
			}
		} catch (error) {
			console.error('Error fetching deadline filtered receipts:', error);
		}
	};

	// Function to fetch overdue receipts with specific page
	const fetchOverdueReceiptsWithPage = async (page) => {
		try {
			const today = new Date();
			const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
				today.getDate(),
			).padStart(2, '0')}`;

			const payload = {
				page: page,
				itemsPerPage: receiptsPerPage,
				deadlineEndAt: formattedToday,
			};

			// Add status filter if present in URL
			const queryParams = new URLSearchParams(location.search);
			const statusParam = queryParams.get('status');
			if (statusParam !== null) {
				payload.status = parseInt(statusParam, 10);
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', payload);

			if (response.status === 200 && response.data && response.data.result && Array.isArray(response.data.result)) {
				setCurrentList(response.data.result);
				setCurrentPage(page);

				// Update pagination info
				const pagination = response.data.pagination || {};
				setTotalItems(pagination.totalItems || response.data.result.length);
				setTotalPages(
					pagination.totalPages || Math.ceil((pagination.totalItems || response.data.result.length) / receiptsPerPage),
				);
			}
		} catch (error) {
			console.error('Error fetching overdue receipts:', error);
		}
	};

	// Add function to toggle overdue filter
	const toggleOverdueFilter = () => {
		const queryParams = new URLSearchParams(location.search);

		if (showOverdueFilter) {
			// If currently showing overdue, remove overdue param - let useEffect handle the rest
			queryParams.delete('overdue');
			queryParams.delete('page'); // Reset to page 1
		} else {
			// Turn on overdue filter - add param and let useEffect handle API call
			queryParams.set('overdue', 'true');
			queryParams.delete('page'); // Reset to page 1
			// Remove conflicting filters
			queryParams.delete('deadlineStart');
			queryParams.delete('deadlineEnd');
			queryParams.delete('searchTerm');
		}

		navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
	};
	// Clear status filter when changing views or applying other filters
	useEffect(() => {
		if (searchTerm) {
			setStatusFilter(null);
		}
	}, [searchTerm]);

	useEffect(() => {
		setCurrentTitlePage('Danh sách tiếp nhận mẫu');
	}, [setCurrentTitlePage]);
	const fetchReceipt = async (page = null, itemsPerPage = receiptsPerPage) => {
		console.log('fetchReceipt called with page:', page, 'itemsPerPage:', itemsPerPage);
		console.trace('fetchReceipt call stack'); // This will show us where it was called from

		// Get page from URL params if not explicitly provided
		if (page === null) {
			const queryParams = new URLSearchParams(location.search);
			const pageParam = queryParams.get('page');
			page = pageParam ? parseInt(pageParam, 10) : 1;
		}

		try {
			// Get status filter from URL params
			const queryParams = new URLSearchParams(location.search);
			const statusParam = queryParams.get('status');

			// Prepare body for POST request according to API specification
			const requestBody = {
				columns: ['*'], // Get all columns
				columnSort: 'receiptDate', // Sort by receipt date
				sortBy: 'DESC', // Descending order
				itemsPerPage: itemsPerPage, // Use dynamic items per page
				page: page, // Use dynamic page
				searchTerm: searchTerm || undefined, // Include search term if available
				// Add other filters if needed
			};

			// Add status filter to request body if present
			if (statusParam !== null) {
				requestBody.status = parseInt(statusParam, 10);
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', requestBody);
			if (response.status === 200) {
				console.log('fetchReceipt success, data length:', response.data?.result?.length || 0);

				// Handle the new API response structure with pagination
				const receipts = response.data?.result || [];
				const pagination = response.data?.pagination || {};

				console.log('Pagination info:', pagination);

				// Update pagination state
				setTotalItems(pagination.totalItems || 0);
				setTotalPages(pagination.totalPages || 0);
				setCurrentPage(pagination.currentPage || page);

				// Store the original fetched data
				setOriginalList(receipts);

				// Always update currentList when calling fetchReceipt with specific parameters
				// Or when there's no active filter
				const hasActiveStatusFilter = location.search.includes('status=');
				const hasActiveDeadlineFilter = location.search.includes('deadlineStart=');
				const hasActiveOverdueFilter = location.search.includes('overdue=');
				const hasActiveSearchFilter = location.search.includes('searchTerm=');

				if (!hasActiveStatusFilter && !hasActiveDeadlineFilter && !hasActiveOverdueFilter && !hasActiveSearchFilter) {
					console.log('No filters active, updating current list');
					setCurrentList(receipts);
					setIsFilter(false);

					// Turn off deadline filter when refreshing data
					if (showTodayDeadlines) {
						setShowTodayDeadlines(false);
					}
				} else {
					console.log('Filters active, this is filtered data');
					setCurrentList(receipts);
					setIsFilter(true);
				}
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi tải dữ liệu',
				});
			}
		} catch (error) {
			console.error('Error fetching receipts:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi tải dữ liệu',
			});
		}
	};
	const fetchSearchResults = async (query, page = 1) => {
		try {
			// Get status filter from URL params
			const queryParams = new URLSearchParams(location.search);
			const statusParam = queryParams.get('status');

			const requestBody = {
				columns: ['*'],
				columnSort: 'receiptDate',
				sortBy: 'DESC',
				itemsPerPage: receiptsPerPage,
				page: page,
				searchTerm: query,
			};

			// Add status filter to request body if present
			if (statusParam !== null) {
				requestBody.status = parseInt(statusParam, 10);
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', requestBody);
			if (response.status === 200) {
				// Store search results in current list using new API response structure
				const receipts = response.data?.result || [];
				const pagination = response.data?.pagination || {};

				setCurrentList(receipts);
				setIsFilter(true);

				// Update pagination info
				setTotalItems(pagination.totalItems || receipts.length);
				setTotalPages(pagination.totalPages || Math.ceil((pagination.totalItems || receipts.length) / receiptsPerPage));
				setCurrentPage(page);

				// Also store in originalList if we don't have original data yet
				if (originalList.length === 0) {
					setOriginalList(receipts);
				}
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi tìm kiếm',
				});
			}
		} catch (error) {
			console.error('Error searching receipts:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi tìm kiếm',
			});
		}
	};

	// Function to fetch search results with specific page
	const fetchSearchResultsWithPage = async (query, page) => {
		try {
			// Get status filter from URL params
			const queryParams = new URLSearchParams(location.search);
			const statusParam = queryParams.get('status');

			const requestBody = {
				columns: ['*'],
				columnSort: 'receiptDate',
				sortBy: 'DESC',
				itemsPerPage: receiptsPerPage,
				page: page,
				searchTerm: query,
			};

			// Add status filter to request body if present
			if (statusParam !== null) {
				requestBody.status = parseInt(statusParam, 10);
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', requestBody);

			if (response.status === 200 && response.data && response.data.result && Array.isArray(response.data.result)) {
				setCurrentList(response.data.result);
				setCurrentPage(page);

				// Update pagination info
				const pagination = response.data.pagination || {};
				setTotalItems(pagination.totalItems || response.data.result.length);
				setTotalPages(
					pagination.totalPages || Math.ceil((pagination.totalItems || response.data.result.length) / receiptsPerPage),
				);
			}
		} catch (error) {
			console.error('Error fetching search results:', error);
		}
	};
	// Main useEffect to handle all query params changes and call appropriate APIs
	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const overdueParam = queryParams.get('overdue');
		const deadlineStartParam = queryParams.get('deadlineStart');
		const deadlineEndParam = queryParams.get('deadlineEnd');
		const statusParam = queryParams.get('status');
		const searchTermParam = queryParams.get('searchTerm');
		const pageParam = queryParams.get('page');
		const itemsPerPageParam = queryParams.get('itemsPerPage');

		console.log('Query params changed:', {
			overdue: overdueParam,
			deadlineStart: deadlineStartParam,
			deadlineEnd: deadlineEndParam,
			status: statusParam,
			searchTerm: searchTermParam,
			page: pageParam,
			itemsPerPage: itemsPerPageParam,
		});

		// Extract values from URL params
		const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;
		const itemsPerPage = itemsPerPageParam ? parseInt(itemsPerPageParam, 10) : receiptsPerPage;

		// Update all states first before making API calls
		setCurrentPage(pageNumber);

		if (itemsPerPageParam) {
			setReceiptsPerPage(itemsPerPage);
		}

		// Determine which API to call based on active filters
		if (searchTermParam) {
			// Search is active - call search API
			setSearchTerm(searchTermParam);
			setIsFilter(true);
			setShowOverdueFilter(false);
			setShowTodayDeadlines(false);
			setStatusFilter(statusParam ? parseInt(statusParam, 10) : null);

			if (pageNumber > 1) {
				fetchSearchResultsWithPage(searchTermParam, pageNumber);
			} else {
				fetchSearchResults(searchTermParam, pageNumber);
			}
		} else if (overdueParam === 'true') {
			// Overdue filter is active
			setShowOverdueFilter(true);
			setShowTodayDeadlines(false);
			setStatusFilter(statusParam ? parseInt(statusParam, 10) : null);
			setIsFilter(true);
			setSearchTerm('');

			if (pageNumber > 1) {
				fetchOverdueReceiptsWithPage(pageNumber);
			} else {
				fetchOverdueReceipts();
			}
		} else if (deadlineStartParam && deadlineEndParam) {
			// Deadline filter is active
			const startDate = new Date(deadlineStartParam);
			const endDate = new Date(deadlineEndParam);

			setDateRange([startDate, endDate]);
			setShowTodayDeadlines(true);
			setShowOverdueFilter(false);
			setStatusFilter(statusParam ? parseInt(statusParam, 10) : null);
			setIsFilter(true);
			setSearchTerm('');

			setFilterInfo({
				isFilterActive: true,
				count: 0,
				startDate: startDate,
				endDate: endDate,
			});

			if (pageNumber > 1) {
				fetchReceiptsByDeadlineWithPage(startDate, endDate, pageNumber);
			} else {
				fetchReceiptsByDeadline(startDate, endDate);
			}
		} else if (statusParam !== null) {
			// Only status filter is active
			const statusValue = parseInt(statusParam, 10);
			setStatusFilter(statusValue);
			setShowOverdueFilter(false);
			setShowTodayDeadlines(false);
			setIsFilter(true);
			setSearchTerm('');

			fetchReceipt(pageNumber, itemsPerPage);
		} else {
			// No filters active - fetch normal data
			setShowOverdueFilter(false);
			setShowTodayDeadlines(false);
			setStatusFilter(null);
			setIsFilter(false);
			setSearchTerm('');

			setFilterInfo({
				isFilterActive: false,
				count: 0,
				startDate: null,
				endDate: null,
			});

			fetchReceipt(pageNumber, itemsPerPage);
		}
	}, [location.search]); // Only depend on URL search params

	useEffect(() => {
		const intervalId = setInterval(() => {
			// Always fetch data to update originalList
			// The currentList will only be updated if no filter is active
			// Only fetch if we're not actively filtering to avoid disrupting user's filtering experience
			if (!isFilter && !searchTerm && !statusFilter && !recordCodeSort && !requestNumberSort) {
				// Get current query params from URL to preserve all filters
				const queryParams = new URLSearchParams(location.search);
				const overdueParam = queryParams.get('overdue');
				const deadlineStartParam = queryParams.get('deadlineStart');
				const deadlineEndParam = queryParams.get('deadlineEnd');
				const statusParam = queryParams.get('status');
				const searchTermParam = queryParams.get('searchTerm');
				const pageParam = queryParams.get('page');

				const pageNumber = pageParam ? parseInt(pageParam, 10) : currentPage;

				// Call appropriate fetch function based on active filters
				if (searchTermParam) {
					fetchSearchResultsWithPage(searchTermParam, pageNumber);
				} else if (overdueParam === 'true') {
					fetchOverdueReceiptsWithPage(pageNumber);
				} else if (deadlineStartParam && deadlineEndParam) {
					const startDate = new Date(deadlineStartParam);
					const endDate = new Date(deadlineEndParam);
					fetchReceiptsByDeadlineWithPage(startDate, endDate, pageNumber);
				} else {
					// No special filters, use normal fetch with status if present
					fetchReceipt(pageNumber, receiptsPerPage);
				}
			}
		}, 60000); // Fetch every 60 seconds

		return () => clearInterval(intervalId); // Cleanup interval on component unmount or when filtering state changes
	}, [
		isFilter,
		searchTerm,
		statusFilter,
		recordCodeSort,
		requestNumberSort,
		currentPage,
		receiptsPerPage,
		location.search,
	]); // Re-run effect when any filter state changes

	const handlePageChange = (pageNumber) => {
		if (pageNumber >= 1 && pageNumber <= totalPages) {
			// Update URL with page parameter - let useEffect handle the API call
			const queryParams = new URLSearchParams(location.search);
			queryParams.set('page', pageNumber.toString());
			navigate(`${location.pathname}?${queryParams.toString()}`);
		}
	};

	// Handle items per page change
	const handleItemsPerPageChange = (newItemsPerPage) => {
		setReceiptsPerPage(newItemsPerPage);

		// Reset to page 1 and update URL with itemsPerPage parameter
		const queryParams = new URLSearchParams(location.search);
		queryParams.delete('page'); // Remove page param to reset to page 1
		queryParams.set('itemsPerPage', newItemsPerPage.toString()); // Add itemsPerPage to URL
		navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
	};

	// Since we're using server-side pagination, we don't need to slice the data
	const paginatedReceipts = currentList;

	const handleReceiptMouseEnter = (receiptId) => {
		// Don't update state if we're editing a date
		if (editingField.field === 'deadline') return;
		setHoveredReceiptId(receiptId);
	}; // Handle sales recorder filter selection

	const handleReceiptMouseLeave = () => {
		// Don't update state if we're editing a date
		if (editingField.field === 'deadline') return;
		setHoveredReceiptId(null);
	};

	const handleSampleMouseEnter = (receiptId, sampleId) => {
		// Don't update state if we're editing a date
		if (editingField.field === 'deadline') return;
		setHoveredReceiptId(receiptId);
		setHoveredSampleId(sampleId);
	};

	const handleSampleMouseLeave = () => {
		// Don't update state if we're editing a date
		if (editingField.field === 'deadline') return;
		setHoveredSampleId(null);
	};
	// Handle clicking on a field to make it editable - this should be specific to a row
	const handleFieldClick = (receiptId, sampleId, field) => {
		// Prevent technicians from editing fields except for sample status
		if (isTechnician() && !(sampleId && field === 'status')) {
			return;
		}

		// Store original value when starting to edit
		const originalKey = `${receiptId}_${sampleId || 'null'}_${field}`;
		let originalValue = '';

		if (sampleId) {
			// For sample fields
			const receipt = currentList.find((r) => r.id === receiptId);
			const sample = receipt?.samples?.find((s) => s.id === sampleId);
			originalValue = sample?.[field] || '';
		} else {
			// For receipt fields
			const receipt = currentList.find((r) => r.id === receiptId);
			originalValue = receipt?.[field] || '';
		}

		setOriginalValues((prev) => ({
			...prev,
			[originalKey]: originalValue,
		}));

		setEditingField({ receiptId, sampleId, field });
	};
	// Update this function to properly handle input changes
	const handleInputChange = (e, receiptId, sampleId, field) => {
		const { value } = e.target;

		// Update the sample directly in the current list to reflect changes immediately
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					return {
						...receipt,
						samples: receipt.samples.map((sample) => {
							if (sample.id === sampleId) {
								return { ...sample, [field]: value };
							}
							return sample;
						}),
					};
				}
				return receipt;
			});
		});
	};
	// Handle sample field updates (status, sample_volume, purpose)
	const handleSampleChange = async (receiptId, sampleId, field, newValue) => {
		// Prevent technicians from updating data
		if (isTechnician()) {
			showToast('Bạn không có quyền cập nhật thông tin này', 'error');
			return;
		}

		// Check if value has actually changed
		const originalKey = `${receiptId}_${sampleId}_${field}`;
		const originalValue = originalValues[originalKey];

		if (newValue === originalValue) {
			// No change, just clear editing state
			setEditingField({ receiptId: null, sampleId: null, field: null });
			return;
		}

		try {
			const payload = {
				sample: {
					id: sampleId,
					sampleId: getSampleUidById(sampleId), // Helper function to get sampleId by id
					[field]: newValue,
				},
			};

			const response = await apiPost('https://red.irdop.org/v1/sample/edit', payload);

			if (response.status === 200) {
				showToast('Cập nhật thông tin thành công!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật thông tin mẫu',
				});
			}
			fetchReceipt(); // Fetch new data to update the list
		} catch (error) {
			console.error('Error updating sample information:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin mẫu',
			});
		} finally {
			// Clear the editing state and original value
			setEditingField({ receiptId: null, sampleId: null, field: null });
			setOriginalValues((prev) => {
				const newValues = { ...prev };
				delete newValues[originalKey];
				return newValues;
			});
		}
	};
	// Handle key down event for inputs
	const handleInputKeyDown = (e, receiptId, sampleId, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault(); // Prevent form submission
			handleSampleChange(receiptId, sampleId, field, value);
		} else if (e.key === 'Escape') {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};
	// Handle select change - immediately update API
	const handleSelectChange = (e, receiptId, sampleId, field) => {
		const newValue = e.target.value;
		handleSampleChange(receiptId, sampleId, field, newValue);
	};

	// Handle select blur - reset editing state without API call
	const handleSelectBlur = () => {
		setEditingField({ receiptId: null, sampleId: null, field: null });
	};

	// Add this function to handle input changes for order code, quote code, and sales recorder
	const handleReceiptInputChange = (e, receiptId, field) => {
		const { value } = e.target;

		// Update the receipt directly in the current list to reflect changes immediately
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					return { ...receipt, [field]: value };
				}
				return receipt;
			});
		});
	};
	// Add this function to handle receipt field updates
	const handleReceiptChange = async (receiptId, field, newValue) => {
		// Prevent technicians from updating data
		if (isTechnician()) {
			showToast('Bạn không có quyền cập nhật thông tin này', 'error');
			return;
		}

		// Check if value has actually changed
		const originalKey = `${receiptId}_null_${field}`;
		const originalValue = originalValues[originalKey];

		if (newValue === originalValue) {
			// No change, just clear editing state
			setEditingField({ receiptId: null, sampleId: null, field: null });
			return;
		}

		try {
			const payload = {
				receipt: {
					id: receiptId,
					receiptId: getReceiptUidById(receiptId),
					[field]: newValue,
				},
			};

			const response = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

			if (response.status === 200) {
				showToast('Cập nhật thông tin thành công!');
				fetchReceipt(); // Fetch new data to update the list
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật thông tin',
				});
			}
		} catch (error) {
			console.error('Error updating receipt information:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin',
			});
		} finally {
			// Clear the editing state and original value
			setEditingField({ receiptId: null, sampleId: null, field: null });
			setOriginalValues((prev) => {
				const newValues = { ...prev };
				delete newValues[originalKey];
				return newValues;
			});
		}
	};

	// Add this function to handle key down event for receipt inputs
	const handleReceiptInputKeyDown = (e, receiptId, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleReceiptChange(receiptId, field, value);
		} else if (e.key === 'Escape') {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	// Calculate what elements to hide based on the current URL
	const hideElements = () => {
		// If we're on the dashboard page and searching for receipts, hide the search in FilterBar
		if (location.pathname.includes('dashboard') || location.pathname === '/') {
			return ['search'];
		}
		return [];
	};
	// New function to check if all samples in a receipt are completed (status >= 4)
	const areAllSamplesCompleted = (receipt) => {
		// If there are no samples, return false
		if (!receipt.samples || receipt.samples.length === 0) return false;

		// Check if all samples have status >= 4 (Hoàn thành)
		return receipt.samples.every((sample) => sample.status >= 4);
	};

	// Format deadline as relative time - updated with new formats
	const formatDeadlineAsRelative = (deadline, receipt) => {
		if (!deadline) return <span className="text-start block">--</span>;

		// If all samples are completed, show in dark green regardless of deadline
		if (areAllSamplesCompleted(receipt)) {
			return <span className="text-green-800">Hoàn thành</span>;
		}

		const deadlineDate = new Date(deadline);
		const today = new Date();

		// Reset time part for date comparison
		const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
		const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

		// Calculate difference in days
		const diffTime = deadlineDay - todayDay;
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		// For same day
		if (diffDays === 0) {
			return <span className="text-red-600">Hôm nay</span>;
		}
		// For tomorrow or yesterday
		else if (diffDays === 1) {
			return <span className="text-green-600">Ngày mai</span>;
		} else if (diffDays === -1) {
			return <span className="text-purple-800">Hôm qua</span>;
		}
		// For days (2-6 days)
		else if (diffDays > 1 && diffDays < 7) {
			return <span className="text-green-600">{diffDays} ngày sau</span>;
		} else if (diffDays < -1 && diffDays > -7) {
			return <span className="text-purple-800">{Math.abs(diffDays)} ngày trước</span>;
		}
		// For weeks (7-30 days)
		else if (diffDays >= 7 && diffDays < 30) {
			const weeks = Math.floor(diffDays / 7);
			return <span className="text-green-600">{weeks} tuần sau</span>;
		} else if (diffDays <= -7 && diffDays > -30) {
			const weeks = Math.floor(Math.abs(diffDays) / 7);
			return <span className="text-purple-800">{weeks} tuần trước</span>;
		}
		// For months (30+ days)
		else if (diffDays >= 30) {
			const months = Math.floor(diffDays / 30);
			return <span className="text-green-600">{months} tháng sau</span>;
		} else {
			const months = Math.floor(Math.abs(diffDays) / 30);
			return <span className="text-purple-800">{months} tháng trước</span>;
		}
	};

	// Add custom toast notification function
	const showToast = (message, type = 'success') => {
		const Toast = Swal.mixin({
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 2000,
			timerProgressBar: true,
			didOpen: (toast) => {
				toast.addEventListener('mouseenter', Swal.stopTimer);
				toast.addEventListener('mouseleave', Swal.resumeTimer);
			},
			width: 'auto',
			padding: '0.5em',
			customClass: {
				popup: 'colored-toast',
			},
		});

		Toast.fire({
			icon: type,
			title: message,
		});
	};
	// Add this function to check if user is a technician
	const isTechnician = () => {
		// Admin users bypass technician restrictions
		return currentUser?.role?.staff_technician && !currentUser?.role?.staff_admin;
	};

	// Add this function to check if user is an accountant
	const isAccountant = () => {
		// Admin users have accountant permissions, accountants have permissions
		return currentUser?.role?.staff_admin || currentUser?.role?.staff_accountant;
	};

	// Add this function to check if user can see deadline information
	const canViewDeadline = () => {
		// Admin users can always see deadline
		if (currentUser?.role?.staff_admin) return true;
		// Sample managers can see deadline
		if (currentUser?.role?.sample_manager) return true;
		// Technicians who are not sample managers cannot see deadline
		if (currentUser?.role?.staff_technician && !currentUser?.role?.sample_manager) return false;
		// Other roles can see deadline
		return true;
	};

	// Add function to toggle analysis grid expansion
	const handleToggleAnalysisGrid = (sampleId) => {
		if (expandedAnalysisSampleId === sampleId) {
			// If clicking the same sample, collapse it
			setExpandedAnalysisSampleId(null);
		} else {
			// Expand the clicked sample
			setExpandedAnalysisSampleId(sampleId);
		}
	};

	// Add function to handle analysis history tooltip
	const handleAnalysisHistoryEnter = (e, analysis) => {
		if (analysis?.histories && analysis.histories.length > 0) {
			const element = e.currentTarget;
			const rect = element.getBoundingClientRect();

			setAnalysisHistoryTooltip({
				visible: true,
				histories: analysis.histories,
				position: {
					top: rect.bottom + window.scrollY + 5,
					left: rect.left + window.scrollX,
				},
			});
		}
	};

	const handleAnalysisHistoryLeave = () => {
		setAnalysisHistoryTooltip({
			visible: false,
			histories: [],
			position: { top: 0, left: 0 },
		});
	};

	// Add function to handle analysis summary tooltip (X/Y/Z format)
	const handleAnalysisSummaryEnter = (e, sample) => {
		if (sample?.analyses && sample.analyses.length > 0) {
			const element = e.currentTarget;
			const rect = element.getBoundingClientRect();

			// Position tooltip to the left of the cell
			// Using fixed positioning, so we don't need to add window.scrollY/scrollX
			setAnalysisSummaryTooltip({
				visible: true,
				analyses: sample.analyses,
				position: {
					top: rect.top, // Use rect.top directly for fixed positioning
					left: rect.left - 410, // 400px width + 10px gap
				},
			});
		}
	};

	const handleAnalysisSummaryLeave = () => {
		setAnalysisSummaryTooltip({
			visible: false,
			analyses: [],
			position: { top: 0, left: 0 },
		});
	};

	// Tooltip functions for notes
	const showNoteTooltip = (event, content, customPosition = null) => {
		const rect = event.target.getBoundingClientRect();
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

		let x, y, position;

		if (customPosition === 'left') {
			x = rect.left + scrollLeft - 10;
			y = rect.top + scrollTop + rect.height / 2;
			position = 'left';
		} else if (customPosition === 'right') {
			x = rect.right + scrollLeft + 10;
			y = rect.top + scrollTop + rect.height / 2;
			position = 'right';
		} else {
			const spaceAbove = rect.top;
			const tooltipHeight = 40;
			const shouldShowBelow = spaceAbove < tooltipHeight + 20;

			x = rect.left + scrollLeft + rect.width / 2;
			y = shouldShowBelow ? rect.bottom + scrollTop + 10 : rect.top + scrollTop - 10;
			position = shouldShowBelow ? 'below' : 'above';
		}

		setNoteTooltip({
			visible: true,
			content,
			x,
			y,
			position,
		});
	};

	const hideNoteTooltip = () => {
		setNoteTooltip({
			visible: false,
			content: '',
			x: 0,
			y: 0,
			position: 'above',
		});
	};

	// Handle note icon click for analysis
	const handleAnalysisNoteClick = (analysis, e) => {
		e.stopPropagation();
		setSelectedAnalysisForNote(analysis);
		setNewNoteText('');
		setShowNoteModal(true);
	};

	// Handle note update for analysis
	const handleAnalysisNoteUpdate = async () => {
		if (!selectedAnalysisForNote || !newNoteText.trim()) {
			showToast('Vui lòng nhập nội dung ghi chú', 'warning');
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
				showToast('Cập nhật ghi chú thành công!');

				// Update local data
				setCurrentList((prevList) =>
					prevList.map((receipt) => ({
						...receipt,
						samples: receipt.samples?.map((sample) => ({
							...sample,
							analyses: sample.analyses?.map((analysis) =>
								analysis.id === selectedAnalysisForNote.id ? { ...analysis, note: newNote } : analysis,
							),
						})),
					})),
				);

				// Close modal
				setShowNoteModal(false);
				setSelectedAnalysisForNote(null);
				setNewNoteText('');
			} else {
				showToast('Lỗi khi cập nhật ghi chú', 'error');
			}
		} catch (error) {
			console.error('Error updating note:', error);
			showToast('Lỗi khi cập nhật ghi chú: ' + error.message, 'error');
		} finally {
			setIsUpdatingNote(false);
		}
	};

	// Add function to handle note icon click
	const handleNoteClick = (receipt) => {
		// Open a dialog with the current note content
		Swal.fire({
			title: 'Ghi chú',
			input: 'textarea',
			inputValue: receipt.note || '',
			showCancelButton: true,
			confirmButtonText: 'Lưu',
			cancelButtonText: 'Hủy',
			inputAttributes: {
				'aria-label': 'Nhập ghi chú cho phiếu tiếp nhận',
				rows: 6,
			},
			customClass: {
				popup: 'custom-note-popup',
				input: 'text-lg', // Đã có
				validationMessage: 'text-sm', // Đã có
				title: 'text-lg', // Thêm class để làm chữ "Ghi chú" nhỏ hơn
				padding: 'p-1', // Thêm padding cho popup
			},
			preConfirm: (note) => {
				return handleNoteUpdate(receipt.receiptId || receipt.id, note);
			},
		});
	};

	// Add function to handle transaction deletion
	const handleDeleteTransaction = async (receiptId, transactionIndex) => {
		const result = await Swal.fire({
			title: 'Xác nhận xóa',
			text: 'Bạn có chắc chắn muốn xóa giao dịch này?',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#d33',
			cancelButtonColor: '#3085d6',
			confirmButtonText: 'Xóa',
			cancelButtonText: 'Hủy',
		});

		if (result.isConfirmed) {
			try {
				// Find the receipt and remove the transaction
				const receipt = currentList.find((r) => r.id === receiptId);
				if (!receipt || !receipt.transactions) return;

				const updatedTransactions = receipt.transactions.filter((_, index) => index !== transactionIndex);

				const payload = {
					receipt: {
						id: receiptId,
						receiptId: getReceiptUidById(receiptId),
						transactions: updatedTransactions,
					},
				};

				const response = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);
				if (response.status === 200) {
					showToast('Đã xóa giao dịch thành công!');
					fetchReceipt();
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: response.data?.message || 'Lỗi khi xóa giao dịch',
					});
				}
			} catch (error) {
				console.error('Error deleting transaction:', error);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: error.message || 'Có lỗi xảy ra khi xóa giao dịch',
				});
			}
		}
	};
	// Add function to handle note update
	const handleNoteUpdate = async (receiptId, noteContent) => {
		try {
			const payload = {
				receipt: {
					id: receiptId,
					receiptId: getReceiptUidById(receiptId),
					note: noteContent,
				},
			};

			const response = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

			if (response.status === 200) {
				showToast('Cập nhật ghi chú thành công!');
				fetchReceipt(); // Fetch new data to update the list
				return true;
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật ghi chú',
				});
				return false;
			}
		} catch (error) {
			console.error('Error updating receipt note:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật ghi chú',
			});
			return false;
		}
	};

	// Add function to handle mouse enter for tooltip display
	const handleTooltipEnter = (e, receipt) => {
		// Don't show tooltip if we're editing a date
		if (editingField.field === 'deadline') return;

		// Only show tooltip if receipt has a note
		if (receipt?.note && receipt.note.trim() !== '') {
			const iconElement = e.currentTarget;
			const rect = iconElement.getBoundingClientRect();

			setTooltipState({
				visible: true,
				content: receipt.note,
				position: {
					top: rect.top,
					left: rect.right + 5, // Position tooltip 5px to the right of the icon
				},
				sourceElement: iconElement,
			});
		}
	};

	// Remove the handleMouseMove function to prevent tooltip from following the mouse

	// Add function to handle mouse leave for tooltip

	const handleTooltipLeave = () => {
		setTooltipState({
			...tooltipState,
			visible: false,
		});
	};
	// Modified toggleRecordCodeSort function
	const toggleRecordCodeSort = () => {
		// If already sorting, clear the sort
		if (recordCodeSort !== 0) {
			setRecordCodeSort(0);

			// Reset to original list or maintain other filters without calling API
			if (searchTerm || filterInfo.isFilterActive) {
				// Re-apply existing filters using existing data
				if (searchTerm) {
					const queryParams = new URLSearchParams(location.search);
					const searchParam = queryParams.get('searchTerm');
					if (searchParam) {
						// Re-search with existing term using originalList
						const filtered = originalList.filter(
							(receipt) =>
								(receipt.receiptId || '').includes(searchParam) ||
								(receipt.client?.client_name || '').toLowerCase().includes(searchParam.toLowerCase()) ||
								receipt.samples?.some(
									(sample) =>
										(sample.sampleId || '').includes(searchParam) ||
										(sample.sampleName || '').toLowerCase().includes(searchParam.toLowerCase()),
								),
						);
						setCurrentList(filtered);
					}
				} else if (filterInfo.isFilterActive) {
					// Re-apply date filter using existing data
					const filtered = originalList.filter((receipt) => {
						if (!receipt.samples || receipt.samples.length === 0) return false;

						return receipt.samples.some((sample) => {
							if (!sample.deadline) return false;
							const deadlineDate = new Date(sample.deadline);
							return deadlineDate >= filterInfo.startDate && deadlineDate <= filterInfo.endDate;
						});
					});
					setCurrentList(filtered);
				} else {
					setCurrentList(originalList);
				}
			} else {
				// No filters active, just restore original list
				setCurrentList(originalList);
			}
			showToast('Đã hủy lọc HSL', 'info');
		} else {
			// Show dropdown
			setShowRecordCodeDropdown(!showRecordCodeDropdown);
			// Close the other dropdown if open
			setShowRequestNumberDropdown(false);
		}
	};
	// Modified toggleRequestNumberSort function
	const toggleRequestNumberSort = () => {
		// If already sorting, clear the sort
		if (requestNumberSort !== 0) {
			setRequestNumberSort(0);

			// Reset to original list or maintain other filters without calling API
			if (searchTerm || filterInfo.isFilterActive) {
				// Re-apply existing filters using existing data
				if (searchTerm) {
					const queryParams = new URLSearchParams(location.search);
					const searchParam = queryParams.get('searchTerm');
					if (searchParam) {
						// Re-search with existing term using originalList
						const filtered = originalList.filter(
							(receipt) =>
								(receipt.receiptId || '').includes(searchParam) ||
								(receipt.client?.client_name || '').toLowerCase().includes(searchParam.toLowerCase()) ||
								receipt.samples?.some(
									(sample) =>
										(sample.sampleId || '').includes(searchParam) ||
										(sample.sampleName || '').toLowerCase().includes(searchParam.toLowerCase()),
								),
						);
						setCurrentList(filtered);
					}
				} else if (filterInfo.isFilterActive) {
					// Re-apply date filter using existing data
					const filtered = originalList.filter((receipt) => {
						if (!receipt.samples || receipt.samples.length === 0) return false;

						return receipt.samples.some((sample) => {
							if (!sample.deadline) return false;
							const deadlineDate = new Date(sample.deadline);
							return deadlineDate >= filterInfo.startDate && deadlineDate <= filterInfo.endDate;
						});
					});
					setCurrentList(filtered);
				} else {
					setCurrentList(originalList);
				}
			} else {
				// No filters active, just restore original list
				setCurrentList(originalList);
			}
			showToast('Đã hủy lọc SYC', 'info');
		} else {
			// Show dropdown
			setShowRequestNumberDropdown(!showRequestNumberDropdown);
			// Close the other dropdown if open
			setShowRecordCodeDropdown(false);
		}
	};

	// Add functions to handle dropdown selections
	const handleRecordCodeFilter = (option) => {
		// Reset requestNumberSort when activating HSL sorting
		setRequestNumberSort(0);
		setShowRecordCodeDropdown(false);

		if (option === 'descending') {
			// Filter for non-empty _deprecated_recordCode and sort in descending order
			setRecordCodeSort(1);
			const filteredList = [...currentList].filter((receipt) => receipt._deprecated_recordCode); // Keep only non-empty values
			const sortedList = filteredList.sort((a, b) => {
				return b._deprecated_recordCode.localeCompare(a._deprecated_recordCode);
			});
			setCurrentList(sortedList);
			showToast(`Hiển thị ${sortedList.length} tiếp nhận có HSL (giảm dần)`, 'info');
		} else if (option === 'empty') {
			// Show only empty/null _deprecated_recordCode
			setRecordCodeSort(2);
			const filteredList = [...originalList].filter((receipt) => !receipt._deprecated_recordCode);
			const sortedList = filteredList.sort((a, b) => {
				return (b.receiptId || '').localeCompare(a.receiptId || '');
			});
			setCurrentList(sortedList);
			showToast(`Hiển thị ${sortedList.length} tiếp nhận không có HSL`, 'info');
		}
	};

	const handleRequestNumberFilter = (option) => {
		// Reset recordCodeSort when activating SYC sorting
		setRecordCodeSort(0);
		setShowRequestNumberDropdown(false);

		if (option === 'descending') {
			// Filter for non-empty request_number and sort in descending order
			setRequestNumberSort(1);
			const filteredList = [...currentList].filter((receipt) => receipt.request_number); // Keep only non-empty values
			const sortedList = filteredList.sort((a, b) => {
				return b.request_number.localeCompare(a.request_number);
			});
			setCurrentList(sortedList);
			showToast(`Hiển thị ${sortedList.length} tiếp nhận có SYC (giảm dần)`, 'info');
		} else if (option === 'empty') {
			// Show only empty/null request_number
			setRequestNumberSort(2);
			const filteredList = [...originalList].filter((receipt) => !receipt.request_number);
			const sortedList = filteredList.sort((a, b) => {
				return (b.receiptId || '').localeCompare(a.receiptId || '');
			});
			setCurrentList(sortedList);
			showToast(`Hiển thị ${sortedList.length} tiếp nhận không có SYC`, 'info');
		}
	};

	// Status filter functions
	const toggleStatusDropdown = () => {
		setShowStatusDropdown(!showStatusDropdown);
	};

	const handleStatusFilter = (selectedStatusIndex) => {
		setShowStatusDropdown(false);

		// Update URL with status parameter - let useEffect handle the API call
		const queryParams = new URLSearchParams(location.search);
		if (selectedStatusIndex !== null) {
			queryParams.set('status', selectedStatusIndex.toString());
		} else {
			queryParams.delete('status');
		}
		queryParams.delete('page'); // Reset to page 1
		navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);

		showToast(`Hiển thị tiếp nhận có trạng thái "${status[selectedStatusIndex]}"`, 'info');
	};

	// Payment functions removed - moved to AccountantDashboard.jsx

	// Add effect to handle clicking outside of dropdowns
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (recordCodeDropdownRef.current && !recordCodeDropdownRef.current.contains(event.target)) {
				setShowRecordCodeDropdown(false);
			}
			if (requestNumberDropdownRef.current && !requestNumberDropdownRef.current.contains(event.target)) {
				setShowRequestNumberDropdown(false);
			}
			if (salesRecorderDropdownRef.current && !salesRecorderDropdownRef.current.contains(event.target)) {
				setShowSalesRecorderDropdown(false);
			}
			if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
				setShowStatusDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Calculate if a view mode is currently active

	// Add this helper function if it doesn't already exist
	const isToday = (date) => {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	};

	// Modified function to handle draft send date click when no date is present
	const handleDraftSendCheckbox = (receiptId) => {
		// Confirm before setting the date
		Swal.fire({
			title: 'Xác nhận',
			text: 'Bạn có muốn cập nhật trạng thái gửi sơ bộ không?',
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Xác nhận',
			cancelButtonText: 'Hủy',
		}).then((result) => {
			if (result.isConfirmed) {
				// If confirmed, set today's date and submit
				const today = new Date();
				handleDraftSendChangeAPI(receiptId, today);

				// Update local state immediately for better UI feedback
				setCurrentList((prevList) => {
					return prevList.map((receipt) => {
						if (receipt.id === receiptId) {
							return { ...receipt, draft_send_at: today };
						}
						return receipt;
					});
				});
			}
		});
	}; // Modified function to handle PPT send date click when no date is present
	const handlePptSendCheckbox = (receiptId) => {
		// Confirm before setting the date
		Swal.fire({
			title: 'Xác nhận',
			text: 'Bạn có muốn cập nhật trạng thái gửi PPT không?',
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Xác nhận',
			cancelButtonText: 'Hủy',
		}).then((result) => {
			if (result.isConfirmed) {
				// If confirmed, set today's date and submit
				const today = new Date().toISOString();
				handlePptSendChangeAPI(receiptId, today);

				// Update local state immediately for better UI feedback
				setCurrentList((prevList) => {
					return prevList.map((receipt) => {
						if (receipt.id === receiptId) {
							return {
								...receipt,
								_deprecated_postalOrderCreatedAt: today,
								_deprecated_postalOrderCreatedById: currentUser?.identity_uid,
							};
						}
						return receipt;
					});
				});
			}
		});
	};

	// Get array of unique sales recorder names from the current list
	const getUniqueSalesRecorders = () => {
		const recorders = currentList
			.filter((receipt) => receipt.salePerson) // Only include receipts with a sales recorder
			.map((receipt) => receipt.salePerson);

		// Get unique values and sort them alphabetically
		return [...new Set(recorders)].sort((a, b) => a.localeCompare(b));
	};

	// Helper functions to get receiptId and sampleId by ID
	const getReceiptUidById = (receiptId) => {
		const receipt = currentList.find((r) => r.id === receiptId);
		return receipt?.receiptId || '';
	};

	const getSampleUidById = (sampleId) => {
		let sampleUid = '';
		currentList.forEach((receipt) => {
			if (receipt.samples) {
				const sample = receipt.samples.find((s) => s.id === sampleId);
				if (sample) {
					sampleUid = sample.sampleId || '';
				}
			}
		});
		return sampleUid;
	};

	return (
		// Remove onMouseMove from the container div
		<div className="flex flex-col justify-between items-center w-full">
			{/* Add CSS for custom toast and tooltip */}
			<style jsx>{`
				.colored-toast.swal2-icon-success {
					background-color: #2bae66 !important;
				}
				.colored-toast.swal2-icon-error {
					background-color: #f27474 !important;
				}
				.colored-toast.swal2-icon-warning {
					background-color: #f8bb86 !important;
				}
				.colored-toast.swal2-icon-info {
					background-color: #1976d2 !important; /* Darker blue background for better contrast */
				}
				.colored-toast.swal2-icon-question {
					background-color: #87adbd !important;
				}
				.colored-toast .swal2-title {
					color: white;
					font-size: 0.85rem !important;
				}
				.colored-toast .swal2-close {
					color: white;
				}
				.colored-toast .swal2-html-container {
					color: white;
				}
				/* Add specific styling for info icon */
				.colored-toast.swal2-icon-info .swal2-icon.swal2-info {
					border-color: white;
					color: white;
				}
				/* Tooltip styling */
				.note-tooltip {
					position: fixed;
					background-color: white;
					color: #333;
					border: 2px solid #0d9488;
					border-radius: 6px;
					padding: 10px;
					max-width: 300px;
					z-index: 1000;
					box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
					font-size: 14px;
					white-space: pre-wrap;
					word-break: break-word;
					pointer-events: none; /* Prevents the tooltip from blocking mouse events */
				}
				/* Add custom styling for the note popup */
				:global(.custom-note-popup) {
					font-size: 0.875rem !important;
				}
				:global(.custom-note-popup textarea) {
					font-size: 0.875rem !important;
				}
			`}</style>
			{/* Add tooltip element that shows when hovering */}
			{tooltipState.visible && (
				<div
					className="note-tooltip border-2 border-[#d5b31c] p-2 rounded-lg fixed bg-[#ffd632] z-50 max-w-80 text-start shadow-md shadow-slate-400"
					style={{
						top: `${tooltipState.position.top}px`,
						left: `${tooltipState.position.left}px`,
					}}
				>
					<p className="font-semibold mb-1">Ghi chú:</p>
					<p>{tooltipState.content}</p>
				</div>
			)}
			{/* Add analysis history tooltip */}
			{analysisHistoryTooltip.visible && analysisHistoryTooltip.histories.length > 0 && (
				<div
					className="fixed bg-white border-2 border-blue-500 rounded-lg shadow-lg z-[9999] p-3 text-xs"
					style={{
						top: `${analysisHistoryTooltip.position.top}px`,
						left: `${analysisHistoryTooltip.position.left}px`,
						maxWidth: '800px',
					}}
				>
					<p className="font-semibold mb-2 text-sm">Lịch sử phân tích:</p>
					<div className="grid grid-cols-5 gap-2 font-semibold mb-2 pb-2 border-b">
						<div>Tên chỉ tiêu</div>
						<div>Mã phương pháp</div>
						<div>Kết quả</div>
						<div>Đơn vị</div>
						<div>Hạn trả</div>
					</div>
					<div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto">
						{analysisHistoryTooltip.histories.map((history, idx) => (
							<React.Fragment key={`history-${idx}`}>
								<div className="truncate" title={history.parameterName || '--'}>
									{history.parameterName || '--'}
								</div>
								<div className="truncate" title={history.protocolCode || '--'}>
									{history.protocolCode || '--'}
								</div>
								<div className="truncate" title={history.resultValue || '--'}>
									{history.resultValue && history.resultValue !== '<p></p>'
										? history.resultValue.replace(/<[^>]*>/g, '').substring(0, 30)
										: '--'}
								</div>
								<div className="truncate" title={history.resultUnit || '--'}>
									{history.resultUnit || '--'}
								</div>
								<div className="truncate" title={history.deadline ? formatDate(history.deadline) : '--'}>
									{history.deadline ? formatDate(history.deadline) : '--'}
								</div>
							</React.Fragment>
						))}
					</div>
				</div>
			)}
			{/* Add analysis summary tooltip (X/Y/Z format) */}
			{analysisSummaryTooltip.visible && analysisSummaryTooltip.analyses.length > 0 && (
				<div
					className="fixed bg-white border-2 border-green-500 rounded-lg shadow-lg z-[9999] p-3 text-xs"
					style={{
						top: `${analysisSummaryTooltip.position.top}px`,
						left: `${analysisSummaryTooltip.position.left}px`,
						width: '400px',
					}}
				>
					<p className="font-semibold mb-2 text-sm">Danh sách chỉ tiêu:</p>
					<div className="grid grid-cols-3 gap-2 font-semibold mb-2 pb-2 border-b">
						<div>Tên chỉ tiêu</div>
						<div>Kết quả</div>
						<div>Hạn trả</div>
					</div>
					<div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
						{analysisSummaryTooltip.analyses.map((analysis, idx) => (
							<React.Fragment key={`summary-${idx}`}>
								<div
									className="truncate whitespace-nowrap overflow-hidden text-ellipsis"
									title={analysis.parameterName || '--'}
								>
									{analysis.parameterName || '--'}
								</div>
								<div
									className="truncate whitespace-nowrap overflow-hidden text-ellipsis"
									title={analysis.resultValue || '--'}
								>
									{analysis.resultValue && analysis.resultValue !== '<p></p>'
										? analysis.resultValue.replace(/<[^>]*>/g, '')
										: '--'}
								</div>
								<div
									className="truncate whitespace-nowrap overflow-hidden text-ellipsis"
									title={analysis.deadline ? formatDate(analysis.deadline) : '--'}
								>
									{analysis.deadline ? formatDate(analysis.deadline) : '--'}
								</div>
							</React.Fragment>
						))}
					</div>
				</div>
			)}{' '}
			<Breadcrumb
				paths={[{}]}
				source={originalList}
				setCurrentList={setCurrentList}
				setIsFilter={setIsFilter}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
			/>
			<div className="justify-between items-center w-full mb-1 hidden md:flex">
				<div className="px-2 mb-1 mt-1">
					<div className="flex width-fit space-x-2">{/* Create buttons section */}</div>
				</div>
				<div className="flex space-x-2 items-center overflow-auto">
					<CreateReceiptFromCRM />
					<CreateReceipt />
				</div>
			</div>{' '}
			<div className="bg-white rounded-lg w-full pb-4 pt-2">
				{/* Updated layout - buttons row with horizontal scrolling */}
				<div className="w-full overflow-x-auto px-4 py-2">
					<div className="flex justify-between items-center min-w-fit">
						{/* Left side - Navigation button */}
						<div className="flex items-center space-x-2 flex-shrink-0">
							<button
								className="p-2 rounded-lg border border-gray-300 flex items-center justify-center focus:outline-none gap-2 py-1 text-black hover:bg-gray-100"
								onClick={() => navigate(`/progress${location.search}`)}
								title="Chuyển sang trang Tiến độ"
							>
								<span className="font-normal">Tiến độ →</span>
							</button>
						</div>

						{/* Right side - Deadline and Overdue buttons */}
						<div className="flex items-center space-x-2 flex-shrink-0">
							<button
								className={`p-2 rounded-lg border-gray-400 flex items-center justify-center focus:outline-none gap-2 py-1 ${
									showTodayDeadlines ? 'text-white bg-blue-600' : 'text-black'
								}`}
								onClick={(e) => filterTodayDeadlines(e)}
								title={
									showTodayDeadlines
										? 'Click outside the date picker to cancel'
										: 'Chọn khoảng thời gian để lọc theo deadline'
								}
							>
								<FaCalendarDay size={18} />
								<span className="font-normal">Deadline</span>
								{showTodayDeadlines && (
									<div
										className="relative z-1000 text-black datepicker-container flex"
										onClick={(e) => e.stopPropagation()}
									>
										<DatePicker
											ref={datePickerRef}
											selected={startDate}
											onChange={handleDateRangeChange}
											startDate={startDate}
											endDate={endDate}
											selectsRange
											dateFormat="dd/MM/yyyy"
											placeholderText="Chọn khoảng thời gian"
											className="p-2 py-0 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-52 cursor-pointer"
											open={isCalendarOpen}
											onInputClick={() => setIsCalendarOpen(true)}
											onClickOutside={() => {
												// If both dates are selected, close calendar and update URL params
												if (startDate && endDate) {
													setIsCalendarOpen(false);
													// Update URL parameters to trigger API call via useEffect
													const queryParams = new URLSearchParams(location.search);
													queryParams.set('deadlineStart', startDate.toISOString().split('T')[0]);
													queryParams.set('deadlineEnd', endDate.toISOString().split('T')[0]);
													queryParams.delete('page'); // Reset to page 1
													// Remove conflicting filters
													queryParams.delete('overdue');
													queryParams.delete('searchTerm');
													navigate(`${location.pathname}?${queryParams.toString()}`);
												}
											}}
											// Remove the onBlur handler that causes premature closing
											shouldCloseOnSelect={false} // Don't close automatically on selection
											popperContainer={({ children }) => createPortal(children, document.body)}
											popperProps={{
												positionFixed: true,
											}}
											popperModifiers={{
												preventOverflow: {
													enabled: true,
													boundariesElement: 'viewport',
												},
												flip: {
													enabled: true,
												},
												offset: {
													enabled: true,
													offset: '0, 5',
												},
											}}
										/>
										<button
											className="ml-1 p-1 rounded bg-gray-200 hover:bg-gray-300 focus:outline-none"
											onClick={(e) => {
												e.stopPropagation();
												// Close the deadline filter
												setShowTodayDeadlines(false);
												setShowDateRangePicker(false);
												setIsCalendarOpen(false);

												// Reset filter info
												setFilterInfo({
													isFilterActive: false,
													count: 0,
													startDate: null,
													endDate: null,
												});

												// Remove deadline params from URL - let useEffect handle the reload
												const queryParams = new URLSearchParams(location.search);
												queryParams.delete('deadlineStart');
												queryParams.delete('deadlineEnd');
												queryParams.delete('page'); // Reset to page 1
												navigate(
													queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname,
												);

												// Reset to original view - API call will be triggered by useEffect
												setCurrentList(originalList);
												setIsFilter(false);
											}}
											title="Đóng bộ lọc deadline"
										>
											<FaTimes size={14} />
										</button>
									</div>
								)}
							</button>
							{/* Overdue button */}
							<button
								className={`p-2 rounded-lg border-gray-400 flex items-center justify-center focus:outline-none gap-2 py-1 ${
									showOverdueFilter ? 'text-white bg-blue-600' : 'text-black'
								}`}
								onClick={toggleOverdueFilter}
								title={showOverdueFilter ? 'Hiển thị danh sách bình thường' : 'Hiển thị danh sách quá hạn'}
							>
								<FaCalendarDay size={18} />
								<span className="font-normal">Overdue</span>
							</button>
						</div>
					</div>
				</div>

				{/* Move filter information to row below with left alignment */}
				<div className="px-4 mb-2 text-left">
					{location.search.includes('searchTerm=') && searchTerm && (
						<div className="text-sm text-gray-500">
							Tìm thấy <span className="font-medium">{currentList.length}</span> tiếp nhận có từ khoá{' '}
							<span className="font-medium">{searchTerm}</span>
							<button
								onClick={handleClearSearch}
								className="ml-2 text-blue-600 px-2 py-0.5 bg-background border-2 border-gray-400"
							>
								Hủy
							</button>
						</div>
					)}

					{/* Add filter info display - now hidden when there's a search query */}
					{filterInfo.isFilterActive &&
						filterInfo.startDate &&
						filterInfo.endDate &&
						!location.search.includes('searchTerm=') && (
							<div className="text-sm text-gray-500 mt-1">
								Hiển thị <span className="font-medium">{currentList.length}</span> trong số{' '}
								<span className="font-medium">{filterInfo.totalItems || totalItems}</span> tiếp nhận có hạn trả kết quả
								từ <span className="font-medium">{formatDate(filterInfo.startDate)}</span> đến{' '}
								<span className="font-medium">{formatDate(filterInfo.endDate)}</span>
								{totalPages > 1 && (
									<span>
										{' '}
										- Trang {currentPage}/{totalPages}
									</span>
								)}
								<button
									onClick={handleResetDateFilter}
									className="ml-2 text-blue-600 px-2 py-0.5 bg-background border-2 border-gray-400"
								>
									Hủy
								</button>
							</div>
						)}

					{/* Add status filter info display */}
					{statusFilter !== null &&
						!location.search.includes('searchTerm=') &&
						!showOverdueFilter &&
						!filterInfo.isFilterActive && (
							<div className="text-sm text-gray-500 mt-1">
								Hiển thị <span className="font-medium">{currentList.length}</span> trong số{' '}
								<span className="font-medium">{totalItems}</span> tiếp nhận có trạng thái{' '}
								<span className="font-medium">"{status[statusFilter]}"</span>
								{totalPages > 1 && (
									<span>
										{' '}
										- Trang {currentPage}/{totalPages}
									</span>
								)}
								<button
									onClick={() => {
										setStatusFilter(null);
										setIsFilter(false);
										setCurrentPage(1);

										// Remove status params from URL and reload data
										const queryParams = new URLSearchParams(location.search);
										queryParams.delete('status');
										queryParams.delete('page'); // Reset to page 1
										navigate(
											queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname,
										);

										// Call API without status filter - use setTimeout to ensure URL is updated
										setTimeout(() => {
											fetchReceipt(1, receiptsPerPage);
										}, 100);
									}}
									className="ml-2 text-blue-600 px-2 py-0.5 bg-background border-2 border-gray-400"
								>
									Hủy
								</button>
							</div>
						)}

					{/* Add overdue filter info display */}
					{showOverdueFilter && !location.search.includes('searchTerm=') && (
						<div className="text-sm text-gray-500 mt-1">
							Hiển thị <span className="font-medium">{currentList.length}</span> trong số{' '}
							<span className="font-medium">{totalItems}</span> tiếp nhận đã quá hạn
							{totalPages > 1 && (
								<span>
									{' '}
									- Trang {currentPage}/{totalPages}
								</span>
							)}
							<button
								onClick={() => {
									setShowOverdueFilter(false);
									setCurrentList(originalList);
									setIsFilter(false);
									setCurrentPage(1);

									// Remove overdue params from URL and reload data
									const queryParams = new URLSearchParams(location.search);
									queryParams.delete('overdue');
									queryParams.delete('page'); // Reset to page 1
									navigate(
										queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname,
									);

									// Reload original data
									fetchReceipt();
								}}
								className="ml-2 text-blue-600 px-2 py-0.5 bg-background border-2 border-gray-400"
							>
								Hủy
							</button>
						</div>
					)}
				</div>

				<div className="overflow-x-auto px-1 py-2">
					<table className="w-full text-black">
						<thead>
							<tr className="border-b-2">
								{/* Common columns - always displayed */}
								<th className="p-1 border-b text-start min-w-[300px]">Mã tiếp nhận mẫu</th>

								{/* Show Hạn trả KQ for normal view */}
								<th
									className="p-1 border-b text-start max-w-28 min-w-28 cursor-pointer hover:text-[#103667] underline text-blue-700"
									onClick={toggleDeadlineFormat}
								>
									Hạn trả KQ
								</th>

								{/* Show Thông tin mẫu thử for normal view */}
								<th className="p-1 border-b text-start min-w-[100px] w-[10%]">Mã mẫu</th>
								<th className="p-1 border-b text-start w-full min-w-72">Thông tin mẫu thử</th>

								{/* Normal view specific columns */}
								<th className="p-1 border-b text-start w-[10%] min-w-28">Số lượng</th>
								<th className="p-1 border-b text-start w-[6%] min-w-24">Mục đích</th>
								<th
									className="p-1 border-b text-start w-[6%] min-w-[100px] cursor-pointer hover:text-[#103667] underline text-blue-700 relative"
									onClick={() => {
										// If status filter is active, clear it
										if (statusFilter !== null) {
											setStatusFilter(null);
											setIsFilter(false);
											setCurrentPage(1);

											// Remove status params from URL and reload data
											const queryParams = new URLSearchParams(location.search);
											queryParams.delete('status');
											queryParams.delete('page'); // Reset to page 1
											navigate(
												queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname,
											);

											// Call API without status filter - use setTimeout to ensure URL is updated
											setTimeout(() => {
												fetchReceipt(1, receiptsPerPage);
											}, 100);
										} else {
											// Show dropdown if no filter is active
											toggleStatusDropdown();
										}
									}}
								>
									{statusFilter !== null ? status[statusFilter] : 'Trạng thái'}
									{showStatusDropdown && (
										<div
											ref={statusDropdownRef}
											className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 max-h-80 overflow-y-auto"
											style={{ top: '100%', left: 0, minWidth: '200px' }}
										>
											{status.map((statusName, index) => (
												<div
													key={index}
													className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
														statusFilter === index ? 'bg-blue-100 text-blue-700 font-medium' : ''
													}`}
													onClick={(e) => {
														e.stopPropagation();
														handleStatusFilter(index);
													}}
												>
													{statusName}
												</div>
											))}
										</div>
									)}
								</th>
								<th
									className={`p-1 border-b text-start transition-all duration-300 ${
										expandedAnalysisSampleId ? 'min-w-[600px]' : 'w-[6%] min-w-24'
									}`}
								>
									Chỉ tiêu
								</th>
							</tr>
						</thead>
						<tbody>
							{paginatedReceipts.map((receipt) => {
								const samplesToShow = receipt.samples || [];

								return (
									<React.Fragment key={`fragment-${receipt.receiptId || receipt.id}`}>
										{/* Display for receipts with no samples */}
										{samplesToShow.length === 0 ? (
											<tr
												key={`row-${receipt.receiptId || receipt.id}`}
												className={`border-t border-b ${hoveredReceiptId === receipt.receiptId ? 'bg-gray-50' : ''}`}
												onMouseEnter={() => handleReceiptMouseEnter(receipt.receiptId)}
												onMouseLeave={handleReceiptMouseLeave}
											>
												{' '}
												{/* Common columns for empty receipt */}
												<td className="p-1 text-start align-top">
													<div className="flex justify-between items-center">
														<NavLink
															className="text-primary font-semibold hover:text-[#103667]"
															to={`/dashboard/receipt?receiptId=${receipt.receiptId || receipt.id}`}
														>
															{receipt.receiptId || receipt.id}
														</NavLink>
														{receipt?.note && receipt?.note?.trim() !== '' ? (
															<FaStickyNote
																size={16}
																className="text-[#d5b31c] cursor-pointer"
																onClick={() => handleNoteClick(receipt)}
																onMouseEnter={(e) => handleTooltipEnter(e, receipt)}
																onMouseLeave={handleTooltipLeave}
															/>
														) : (
															<FaRegStickyNote
																size={16}
																className="text-gray-500 hover:text-[#d5b31c] cursor-pointer opacity-50"
																onClick={() => handleNoteClick(receipt)}
															/>
														)}
													</div>
													<div className="flex flex-col">
														<p
															className="text-sm cursor-pointer"
															onClick={() =>
																handleCopyToClipboard(
																	!isTechnician() ? receipt.client?.clientName || '--' : '[Thông tin bị ẩn]',
																)
															}
														>
															{!isTechnician() ? receipt.client?.clientName || '--' : '[Thông tin bị ẩn]'}
														</p>
														{/* Order ID */}
														{receipt.orderId && !isTechnician() && (
															<p className="text-xs text-blue-600">ĐH: {receipt.orderId}</p>
														)}
														{/* Receipt Date and Created By */}
														<p className="text-xs text-gray-500">
															{receipt.receiptDate && formatDate(receipt.receiptDate)}{' '}
															{receipt?.createdBy?.identityName || '--'}
														</p>
													</div>{' '}
												</td>
												{/* Add deadline column for empty receipts */}
												<td className="p-1 text-start text-gray-500">{canViewDeadline() ? '--' : '--'}</td>
												{/* Sample information columns - empty state */}
											</tr>
										) : (
											/* Display for receipts with samples */
											samplesToShow.map((sample, sampleIndex) => {
												// Calculate completed tests count
												const totalTests = sample?.analyses?.length || 0;
												const completedTests =
													sample?.analyses?.filter(
														(analysis) => analysis?.resultValue !== null && analysis?.resultValue !== '<p></p>',
													)?.length || 0;

												// Calculate assigned tests count (chỉ tiêu được phân công)
												const assignedTests =
													sample?.analyses?.filter(
														(analysis) => analysis?.technicianId !== null && analysis?.technicianId !== '',
													)?.length || 0;

												// Get sample id or uid for lookup
												const sampleKey = sample.id || sample.sampleId;

												// Get reports for this sample (for PPT view)
												const reports = sample.report || [];

												return (
													<tr
														key={`${receipt?.receiptId || 'unknown'}-${sample?.sampleId || 'unknown'}-${sampleIndex}`}
														className={`${sampleIndex === 0 ? 'border-t' : ''} 
																	${sampleIndex === samplesToShow.length - 1 ? 'border-b' : ''} 
																	${hoveredSampleId === sample?.sampleId ? 'bg-gray-100' : hoveredReceiptId === receipt?.receiptId ? 'bg-gray-50' : ''}`}
														onMouseEnter={() => handleSampleMouseEnter(receipt?.receiptId, sample?.sampleId)}
														onMouseLeave={() => {
															setHoveredSampleId(null);
															setHoveredReceiptId(null);
														}}
													>
														{/* Common columns for the first sample in receipt */}
														{sampleIndex === 0 && (
															<>
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt?.receiptId ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																>
																	<div className="flex justify-between items-center">
																		<NavLink
																			className="text-primary font-semibold hover:text-[#103667]"
																			to={`/dashboard/receipt?receiptId=${receipt.receiptId || receipt.id}`}
																		>
																			{receipt.receiptId || receipt.id}
																		</NavLink>
																		{receipt?.note && receipt?.note?.trim() !== '' ? (
																			<FaStickyNote
																				size={16}
																				className="text-[#d5b31c] cursor-pointer"
																				onClick={() => handleNoteClick(receipt)}
																				onMouseEnter={(e) => handleTooltipEnter(e, receipt)}
																				onMouseLeave={handleTooltipLeave}
																			/>
																		) : (
																			<FaRegStickyNote
																				size={16}
																				className="text-gray-500 hover:text-[#d5b31c] cursor-pointer opacity-50"
																				onClick={() => handleNoteClick(receipt)}
																			/>
																		)}
																	</div>
																	<div className="flex flex-col">
																		<p
																			className="text-sm cursor-pointer"
																			onClick={() => handleCopyToClipboard(receipt.client?.clientName || '--')}
																		>
																			{!isTechnician() ? receipt.client?.clientName || '--' : '[Thông tin bị ẩn]'}
																		</p>
																		{/* Order ID */}
																		{receipt.orderId && !isTechnician() && (
																			<p className="text-xs text-blue-600">ĐH: {receipt.orderId}</p>
																		)}
																		{/* Receipt Date and Created By */}
																		<p className="text-xs text-gray-500">
																			{receipt.receiptDate && formatDate(receipt.receiptDate)}{' '}
																			{receipt?.createdBy?.identityName || '--'}
																		</p>
																	</div>{' '}
																</td>{' '}
																{/* Show deadline column */}
																<td
																	className={`p-1 text-start cursor-pointer align-top ${
																		hoveredReceiptId === receipt.receiptId ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																	onClick={() => canViewDeadline() && handleFieldClick(receipt.id, null, 'deadline')}
																>
																	{editingField.receiptId === receipt.id &&
																	editingField.sampleId === null &&
																	editingField.field === 'deadline' &&
																	canViewDeadline() ? (
																		<div
																			onClick={(e) => e.stopPropagation()}
																			onMouseEnter={(e) => e.stopPropagation()}
																			onMouseLeave={(e) => e.stopPropagation()}
																		>
																			<DatePicker
																				selected={receipt.deadline ? new Date(receipt.deadline) : null}
																				onChange={(date) => handleDeadlineChange(receipt.id, date)}
																				onFocus={() => handleDatePickerFocus(receipt.id, receipt.deadline)}
																				onChangeRaw={(e) => handleDateInputChange(receipt.id, e)}
																				onKeyDown={(e) => handleDeadlineKeyDown(e, receipt.id)}
																				dateFormat="dd/MM/yyyy"
																				className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
																				calendarClassName="text-black"
																				placeholderText="Chọn hạn trả"
																				autoFocus
																				shouldCloseOnSelect={true}
																				popperModifiers={{
																					preventOverflow: {
																						enabled: true,
																					},
																					hide: {
																						enabled: true,
																					},
																				}}
																			/>
																		</div>
																	) : (
																		<div className="w-full h-full p-1 py-0 rounded">
																			{canViewDeadline() ? (
																				showRelativeTime ? (
																					formatDeadlineAsRelative(receipt.deadline, receipt)
																				) : (
																					formatDeadlineWithStyle(receipt.deadline, receipt)
																				)
																			) : (
																				<span className="text-start block">--</span>
																			)}
																		</div>
																	)}
																</td>
															</>
														)}

														{/* Sample-specific columns */}
														{/* Mã mẫu column */}
														<td className="p-1 text-start align-top">
															<div className="text-sm max-w-40 truncate">
																{sample.sampleId ? (
																	<NavLink
																		to={`/dashboard/sample?receiptId=${receipt.receiptId}&sampleId=${sample.sampleId}`}
																		className="text-primary hover:text-[#103667] font-medium"
																	>
																		{sample.sampleId}
																	</NavLink>
																) : (
																	'--'
																)}
															</div>
														</td>

														{/* Thông tin mẫu thử column */}
														<td className="p-1 text-start align-top">
															<div
																className="text-sm w-full line-clamp-2"
																title={sample.sampleName || '--'}
																style={{
																	display: '-webkit-box',
																	WebkitLineClamp: 2,
																	WebkitBoxOrient: 'vertical',
																	overflow: 'hidden',
																}}
															>
																{sample.sampleName || '--'}
															</div>
														</td>

														{/* Số lượng column */}
														<td
															className="p-1 text-start align-top cursor-pointer hover:bg-gray-100"
															onClick={() => handleFieldClick(receipt.id, sample.id, 'sampleVolume')}
														>
															{editingField.receiptId === receipt.id &&
															editingField.sampleId === sample.id &&
															editingField.field === 'sampleVolume' ? (
																<textarea
																	value={sample.sampleVolume || ''}
																	onChange={(e) => handleInputChange(e, receipt.id, sample.id, 'sampleVolume')}
																	onBlur={(e) =>
																		handleSampleChange(receipt.id, sample.id, 'sampleVolume', e.target.value)
																	}
																	className="p-1 border rounded-md w-full text-sm bg-white"
																	autoFocus
																/>
															) : (
																<div className="text-sm">
																	{sample.sampleVolume ? (
																		<span className="font-medium">{sample.sampleVolume}</span>
																	) : (
																		<span className="text-gray-500">--</span>
																	)}
																</div>
															)}
														</td>

														{/* Mục đích column */}
														<td
															className="p-1 text-start align-top cursor-pointer hover:bg-gray-100"
															onClick={() => handleFieldClick(receipt.id, sample.id, 'purpose')}
														>
															{editingField.receiptId === receipt.id &&
															editingField.sampleId === sample.id &&
															editingField.field === 'purpose' ? (
																<select
																	value={sample.purpose || ''}
																	onChange={(e) => handleSelectChange(e, receipt.id, sample.id, 'purpose')}
																	onBlur={handleSelectBlur}
																	className="p-1 border rounded-md w-full text-sm bg-white"
																	autoFocus
																>
																	<option value="">-- Chọn --</option>
																	<option value="Chất lượng">Chất lượng</option>
																	<option value="Dự án">Dự án</option>
																	<option value="Đề tài">Đề tài</option>
																	<option value="Công bố">Công bố</option>
																	<option value="Thầu phụ">Thầu phụ</option>
																</select>
															) : (
																<div className="text-sm max-w-32 truncate" title={sample.purpose || '--'}>
																	{sample.purpose || '--'}
																</div>
															)}
														</td>

														{/* Trạng thái column */}
														<td
															className="p-1 text-start align-top cursor-pointer hover:bg-gray-100 whitespace-nowrap"
															onClick={() => handleFieldClick(receipt.id, sample.id, 'status')}
														>
															{editingField.receiptId === receipt.id &&
															editingField.sampleId === sample.id &&
															editingField.field === 'status' ? (
																<select
																	value={sample.status || 0}
																	onChange={(e) => handleSelectChange(e, receipt.id, sample.id, 'status')}
																	onBlur={handleSelectBlur}
																	className="p-1 border rounded-md w-full text-sm bg-white"
																	autoFocus
																>
																	<option value={0}>Đang chờ</option>
																	<option value={1}>Khẩn</option>
																	<option value={2}>Đang thực hiện</option>
																	<option value={3}>Đủ kết quả</option>
																	<option value={4}>Hoàn thành</option>
																	<option value={5}>Hủy bỏ</option>
																</select>
															) : (
																<div className="text-sm">
																	<span
																		className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
																			sample.status === 4
																				? 'bg-green-100 text-green-800'
																				: sample.status === 3
																				? 'bg-emerald-100 text-emerald-800'
																				: sample.status === 2
																				? 'bg-blue-100 text-blue-800'
																				: sample.status === 1
																				? 'bg-yellow-200 text-yellow-800'
																				: sample.status === 0
																				? 'bg-gray-100 text-gray-800'
																				: sample.status === 5
																				? 'bg-red-100 text-red-800'
																				: 'bg-gray-100 text-gray-800'
																		}`}
																	>
																		{sample.status === 4
																			? 'Hoàn thành'
																			: sample.status === 3
																			? 'Đủ kết quả'
																			: sample.status === 2
																			? 'Đang thực hiện'
																			: sample.status === 1
																			? 'Khẩn'
																			: sample.status === 0
																			? 'Đang chờ'
																			: sample.status === 5
																			? 'Hủy bỏ'
																			: 'Chưa xác định'}
																	</span>
																</div>
															)}
														</td>

														{/* Chỉ tiêu column */}
														<td
															className={`p-1 text-start align-top cursor-pointer hover:bg-gray-100 transition-all duration-300 ${
																expandedAnalysisSampleId === sample.id ? 'min-w-[600px]' : ''
															}`}
														>
															{expandedAnalysisSampleId === sample.id ? (
																/* Show detailed grid */
																<div className="relative">
																	<button
																		onClick={() => handleToggleAnalysisGrid(sample.id)}
																		className="absolute top-0 right-0 text-red-600 hover:text-red-800 font-bold text-lg px-2 py-1 rounded hover:bg-red-50"
																		title="Đóng"
																	>
																		×
																	</button>
																	<div className="grid grid-cols-6 gap-2 text-xs pr-8">
																		{sample?.analyses?.map((analysis, idx) => (
																			<React.Fragment key={`analysis-${analysis.id || idx}`}>
																				<div
																					className="truncate cursor-help hover:bg-blue-50 p-1 rounded"
																					title={analysis.parameterName || '--'}
																					onMouseEnter={(e) => handleAnalysisHistoryEnter(e, analysis)}
																					onMouseLeave={handleAnalysisHistoryLeave}
																				>
																					{analysis.parameterName || '--'}
																				</div>
																				<div className="truncate" title={analysis.resultValue || '--'}>
																					{analysis.resultValue && analysis.resultValue !== '<p></p>'
																						? analysis.resultValue.replace(/<[^>]*>/g, '').substring(0, 30)
																						: '--'}
																				</div>
																				<div className="truncate" title={analysis.resultUnit || '--'}>
																					{analysis.resultUnit || '--'}
																				</div>
																				<div
																					className="truncate"
																					title={analysis.deadline ? formatDate(analysis.deadline) : '--'}
																				>
																					{analysis.deadline ? formatDate(analysis.deadline) : '--'}
																				</div>
																				<div className="truncate" title={analysis.technician?.identityName || '--'}>
																					{analysis.technician?.identityName || '--'}
																				</div>
																				<div className="flex items-center justify-center">
																					<div
																						className="cursor-pointer hover:scale-110 transition-transform"
																						onClick={(e) => handleAnalysisNoteClick(analysis, e)}
																						onMouseEnter={(e) => {
																							if (analysis.note) {
																								showNoteTooltip(e, analysis.note, 'left');
																							}
																						}}
																						onMouseLeave={hideNoteTooltip}
																						title={
																							analysis.note ? 'Click để xem/thêm ghi chú' : 'Click để thêm ghi chú'
																						}
																					>
																						{analysis.note ? (
																							<span className="text-xl">📝</span>
																						) : (
																							<span className="text-xl text-gray-400">📋</span>
																						)}
																					</div>
																				</div>
																			</React.Fragment>
																		))}
																	</div>
																</div>
															) : (
																/* Show summary */
																<div
																	className="text-sm"
																	onClick={() => handleToggleAnalysisGrid(sample.id)}
																	onMouseEnter={(e) => handleAnalysisSummaryEnter(e, sample)}
																	onMouseLeave={handleAnalysisSummaryLeave}
																>
																	{totalTests > 0 ? (
																		<span
																			className={`font-medium ${
																				assignedTests === totalTests
																					? 'text-green-800'
																					: assignedTests < totalTests
																					? 'text-yellow-600'
																					: 'text-gray-600'
																			}`}
																		>
																			{completedTests}/{assignedTests}/{totalTests}
																		</span>
																	) : (
																		<span className="text-gray-500">0/0/0</span>
																	)}
																</div>
															)}
														</td>
													</tr>
												);
											})
										)}
									</React.Fragment>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Pagination - show for all views */}
				<div className="flex justify-between items-center mt-4">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2 px-2">
							<label className="block text-sm font-medium mb-1">Số mục mỗi trang</label>
							<select
								value={receiptsPerPage}
								onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
								className="px-3 py-2 border rounded bg-white"
							>
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
						</div>
						<div className="text-sm text-gray-600">Tổng: {totalItems} tiếp nhận</div>
					</div>
					{totalPages > 1 && (
						<div className="pagination flex items-center gap-2">
							<button
								onClick={() => handlePageChange(currentPage - 1)}
								disabled={currentPage <= 1}
								className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
							>
								Trước
							</button>

							<div className="flex items-center gap-1">
								{(() => {
									const pages = [];
									const totalPagesNum = totalPages;
									const current = currentPage;

									if (totalPagesNum <= 5) {
										// If total pages <= 5, show all pages
										for (let i = 1; i <= totalPagesNum; i++) {
											pages.push(i);
										}
									} else {
										// Always show first page
										pages.push(1);

										// Determine the range around current page
										let startRange, endRange;

										if (current <= 3) {
											// Current page is near the beginning
											startRange = 2;
											endRange = 4;
										} else if (current >= totalPagesNum - 2) {
											// Current page is near the end
											startRange = totalPagesNum - 3;
											endRange = totalPagesNum - 1;
										} else {
											// Current page is in the middle
											startRange = current - 1;
											endRange = current + 1;
										}

										// Add ellipsis after first page if needed
										if (startRange > 2) {
											pages.push('...');
										}

										// Add pages in the range
										for (let i = startRange; i <= endRange; i++) {
											if (i > 1 && i < totalPagesNum) {
												pages.push(i);
											}
										}

										// Add ellipsis before last page if needed
										if (endRange < totalPagesNum - 1) {
											pages.push('...');
										}

										// Always show last page if there's more than 1 page
										if (totalPagesNum > 1) {
											pages.push(totalPagesNum);
										}
									}

									return pages.map((page, index) => {
										if (page === '...') {
											return (
												<span key={index} className="px-2 text-gray-400">
													...
												</span>
											);
										}
										return (
											<button
												key={page}
												onClick={() => handlePageChange(page)}
												className={`px-3 py-2 border rounded hover:bg-gray-100 ${
													page === current ? 'bg-blue-500 text-white' : ''
												}`}
											>
												{page}
											</button>
										);
									});
								})()}
							</div>

							<button
								onClick={() => handlePageChange(currentPage + 1)}
								disabled={currentPage >= totalPages}
								className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
							>
								Sau
							</button>
						</div>
					)}
				</div>
			</div>{' '}
			{/* Shipment form - added at the end of the component */}
			{showShipmentForm && selectedReceipt && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
					{(() => {
						// Check if this is a direct pickup - but only for existing tracking numbers, not new shipments
						const isDirectPickup =
							selectedReceipt?.mode !== 'new' &&
							selectedReceipt?._deprecated_trackingNumber &&
							selectedReceipt._deprecated_trackingNumber.split(',').some((tn) => tn.trim().startsWith('TT'));

						return (
							<div className="bg-white rounded-lg shadow-lg w-fit mx-4 overflow-y-auto relative">
								{/* Fixed header */}
								<div className="absolute top-0 left-0 right-0 flex justify-between items-center p-2 bg-white border-b border-gray-200 rounded-t-lg z-10">
									<h2 className="text-xl font-semibold text-gray-800">
										{selectedReceipt?.mode === 'new'
											? 'Tạo vận đơn mới'
											: selectedReceipt._deprecated_trackingNumber
											? `Thông tin vận đơn ${selectedReceipt._deprecated_trackingNumber}${
													selectedReceipt._deprecated_postalOrderCreatedAt
														? ` - Ngày ${formatDate(selectedReceipt._deprecated_postalOrderCreatedAt)}`
														: ''
											  }`
											: 'Tạo vận đơn'}
									</h2>
									<button
										onClick={() => {
											setShowShipmentForm(false);
											setSelectedReceipt(null);
										}}
										className="text-gray-500 hover:text-gray-700 text-xl"
									>
										<FaTimes />
									</button>
								</div>
								{/* Content with dynamic width based on pickup type */}
								<div
									className={`${
										isDirectPickup ? 'max-w-[50vw] min-w-[360px]' : 'max-w-[80vw]'
									} max-h-[90vh] overflow-y-auto p-0`}
								>
									<ShipmentForm
										receipt={selectedReceipt}
										mode={selectedReceipt?.mode || 'auto'}
										onClose={() => {
											setShowShipmentForm(false);
											setSelectedReceipt(null);
										}}
										onOrderUpdate={(updatedReceipt) => {
											// Update currentList with new receipt data
											setCurrentList((prevList) =>
												prevList.map((receipt) => (receipt.id === updatedReceipt.id ? updatedReceipt : receipt)),
											);
											// Refresh the data to get latest tracking numbers
											fetchReceipt();
										}}
									/>
								</div>
							</div>
						);
					})()}
				</div>
			)}
			{/* Tooltip Portal for Notes */}
			{noteTooltip.visible &&
				createPortal(
					<div
						className="custom-note-tooltip"
						style={{
							position: 'absolute',
							left: `${noteTooltip.x}px`,
							top: `${noteTooltip.y}px`,
							transform:
								noteTooltip.position === 'left'
									? 'translateX(-100%) translateY(-50%)'
									: noteTooltip.position === 'right'
									? 'translateX(0) translateY(-50%)'
									: noteTooltip.position === 'above'
									? 'translateX(-50%) translateY(-100%)'
									: 'translateX(-50%) translateY(0)',
							background: 'rgba(0, 0, 0, 0.9)',
							color: 'white',
							padding: '10px 14px',
							borderRadius: '6px',
							fontSize: '13px',
							fontWeight: '500',
							whiteSpace: 'pre-wrap',
							pointerEvents: 'none',
							zIndex: 10000,
							boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
							maxWidth: '350px',
							minWidth: '200px',
							wordWrap: 'break-word',
						}}
					>
						{noteTooltip.content}
					</div>,
					document.body,
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
								onClick={handleAnalysisNoteUpdate}
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
};

export default Dashboard;
