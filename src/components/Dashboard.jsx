import React, { useContext, useEffect, useState, useRef } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import { FiRefreshCcw } from 'react-icons/fi';
import Breadcrumb from './Breadcrumb';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import CreateReceipt from './CreateReceipt';
import CreateReceiptFromCRM from './CreateReceiptFromCRM';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';

import {
	FaMoneyBillWave,
	FaCalendarDay,
	FaFileAlt,
	FaExternalLinkAlt,
	FaRegStickyNote,
	FaStickyNote,
	FaTimes,
} from 'react-icons/fa';

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

	// Extract search term from URL query params
	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const searchParam = queryParams.get('search');
		if (searchParam) {
			setSearchTerm(searchParam);
		}
	}, [location.search]);

	// Add state for preliminary results view
	const [preliminaryData, setPreliminaryData] = useState({
		not_sent_preliminary: [],
		sent_preliminary: [],
		sent_report: [],
	});
	const [selectedPreliminaryType, setSelectedPreliminaryType] = useState('not_sent_preliminary');

	// Remove isEditMode state
	// Add state to track which field is being edited
	const [editingField, setEditingField] = useState({ receiptId: null, sampleId: null, field: null });

	// Add state for user information
	const [userInfo, setUserInfo] = useState({});

	const [showRelativeTime, setShowRelativeTime] = useState(true); // Toggle between date format and relative time
	// Add new states for draft and PPT send date format toggles
	const [showRelativeDraftTime, setShowRelativeDraftTime] = useState(true);
	const [showRelativePptTime, setShowRelativePptTime] = useState(true);
	const receiptsPerPage = 50;
	const [hoveredReceiptId, setHoveredReceiptId] = useState(null);
	const [hoveredSampleId, setHoveredSampleId] = useState(null);
	let isFetch = false;

	// Date input state
	const [dateInputValues, setDateInputValues] = useState({});
	const [isDatePickerFocused, setIsDatePickerFocused] = useState(false);
	const [tempDateValues, setTempDateValues] = useState({});

	// Add new state to track today's deadline filter
	const [showTodayDeadlines, setShowTodayDeadlines] = useState(false);

	// Add state to track selected report IDs for each sample
	const [selectedReportIds, setSelectedReportIds] = useState({});

	// Replace separate view state with a single viewMode state
	const [viewMode, setViewMode] = useState('normal'); // 'normal', 'payment', 'preliminary'

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

	// Add new state for tracking dropdown visibility
	const [showRecordCodeDropdown, setShowRecordCodeDropdown] = useState(false);
	const [showRequestNumberDropdown, setShowRequestNumberDropdown] = useState(false);
	// Add refs for the dropdown menus
	const recordCodeDropdownRef = useRef(null);
	const requestNumberDropdownRef = useRef(null);

	// Add new state for payment status filtering
	const [paymentStatusFilter, setPaymentStatusFilter] = useState(null);
	const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
	const paymentDropdownRef = useRef(null);

	// Function to format date strings entered manually
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

	// Function to get the most recent report for a sample
	const getMostRecentReport = (sample) => {
		if (!sample.report || !Array.isArray(sample.report) || sample.report.length === 0) {
			return null;
		}

		// Return the last report in the array (most recent PPT)
		return sample.report[sample.report.length - 1];
	};

	// Function to handle report selection change
	const handleReportSelection = (sampleId, reportId) => {
		setSelectedReportIds((prev) => ({
			...prev,
			[sampleId]: reportId,
		}));
	};

	// Function to initialize selected report IDs on data load
	useEffect(() => {
		if (preliminaryData && selectedPreliminaryType) {
			const newSelectedReports = {};

			preliminaryData[selectedPreliminaryType]?.forEach((receipt) => {
				if (receipt.samples && Array.isArray(receipt.samples)) {
					receipt.samples.forEach((sample) => {
						const mostRecentReport = getMostRecentReport(sample);
						if (mostRecentReport) {
							newSelectedReports[sample.id || sample.sample_uid] = mostRecentReport.ppt_uid;
						}
					});
				}
			});

			setSelectedReportIds(newSelectedReports);
		}
	}, [preliminaryData, selectedPreliminaryType]);

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

	const handleClearSearch = () => {
		// Reset search term
		setSearchTerm('');
		// Reset all filters and states
		setIsFilter(false);
		setShowTodayDeadlines(false);
		setViewMode('normal');

		// Always navigate to the clean path without query parameters
		// This will remove any search parameters from the URL
		navigate(location.pathname);

		// Fetch fresh data only once
		fetchReceipt().then(() => {
			// Fetch a new set of receipts and update the UI
			apiGet('https://black.irdop.org/khsi19me/db/get/recent_receipt').then((response) => {
				if (response.status === 200) {
					setOriginalList(response.data);
					setCurrentList(response.data);
				}
			});
		});
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
					deadline: formattedDate,
					modified_by_uid: currentUser?.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

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

	// Add handlers for draft_send_at (Gửi sơ bộ) and ppt_send_at (Gửi PPT)
	const handleDraftSendChange = (receiptId, date) => {
		// Update the date in the UI
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					return { ...receipt, draft_send_at: date };
				}
				return receipt;
			});
		});
		setEditingField({ receiptId: null, sampleId: null, field: null });

		// If we have a valid date, trigger the API update
		if (date) {
			handleDraftSendChangeAPI(receiptId, date);
		}
	};

	const handlePptSendChange = (receiptId, date) => {
		// Update the date in the UI
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					return { ...receipt, ppt_send_at: date, ppt_send_by: currentUser?.identity_uid };
				}
				return receipt;
			});
		});
		setEditingField({ receiptId: null, sampleId: null, field: null });

		// If we have a valid date, trigger the API update
		if (date) {
			handlePptSendChangeAPI(receiptId, date);
		}
	};

	// API handlers for updating draft_send_at and ppt_send_at
	const handleDraftSendChangeAPI = async (receiptId, newDate) => {
		try {
			// If we have a date, adjust it for GMT+7 timezone
			let formattedDate = null;
			if (newDate) {
				// Add 7 hours to account for GMT+7
				const adjustedDate = new Date(newDate);
				adjustedDate.setHours(adjustedDate.getHours() + 7);
				formattedDate = adjustedDate.toISOString().split('T')[0];
			}

			const payload = {
				receipt: {
					id: receiptId,
					draft_send_at: formattedDate,
					ppt_send_by: currentUser?.identity_uid, // Add this line to include the sender
					modified_by_uid: currentUser?.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				showToast('Cập nhật ngày gửi sơ bộ thành công!');
				fetchReceipt(); // Fetch new data to update the list
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật ngày gửi sơ bộ',
				});
			}
		} catch (error) {
			console.error('Error updating draft send date:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật ngày gửi sơ bộ',
			});
		} finally {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	const handlePptSendChangeAPI = async (receiptId, newDate) => {
		try {
			// If we have a date, adjust it for GMT+7 timezone
			let formattedDate = null;
			if (newDate) {
				// Add 7 hours to account for GMT+7
				const adjustedDate = new Date(newDate);
				adjustedDate.setHours(adjustedDate.getHours() + 7);
				formattedDate = adjustedDate.toISOString().split('T')[0];
			}

			const payload = {
				receipt: {
					id: receiptId,
					ppt_send_at: formattedDate,
					ppt_send_by: currentUser?.identity_uid, // Set current user as the sender
					modified_by_uid: currentUser?.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				showToast('Cập nhật ngày gửi PPT thành công!');
				fetchReceipt(); // Fetch new data to update the list
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật ngày gửi PPT',
				});
			}
		} catch (error) {
			console.error('Error updating PPT send date:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật ngày gửi PPT',
			});
		} finally {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	// Handle draft_send_at key down for date validation and submission
	const handleDraftSendKeyDown = (e, receiptId) => {
		if (e.key === 'Enter') {
			e.preventDefault();

			// Check if there's a manual input
			if (dateInputValues[receiptId]) {
				const formattedDate = formatDateString(dateInputValues[receiptId]);
				const parsedDate = parseDateString(formattedDate);

				if (parsedDate) {
					handleDraftSendChangeAPI(receiptId, parsedDate);
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi định dạng',
						text: 'Định dạng ngày không hợp lệ. Sử dụng định dạng DD/MM/YYYY hoặc DDMMYYYY',
						confirmButtonColor: '#3085d6',
					});
				}
			} else {
				// If using the date picker directly
				const receipt = currentList.find((r) => r.id === receiptId);
				if (receipt && receipt.draft_send_at) {
					handleDraftSendChangeAPI(receiptId, receipt.draft_send_at);
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

	// Handle ppt_send_at key down for date validation and submission
	const handlePptSendKeyDown = (e, receiptId) => {
		if (e.key === 'Enter') {
			e.preventDefault();

			// Check if there's a manual input
			if (dateInputValues[receiptId]) {
				const formattedDate = formatDateString(dateInputValues[receiptId]);
				const parsedDate = parseDateString(formattedDate);

				if (parsedDate) {
					handlePptSendChangeAPI(receiptId, parsedDate);
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi định dạng',
						text: 'Định dạng ngày không hợp lệ. Sử dụng định dạng DD/MM/YYYY hoặc DDMMYYYY',
						confirmButtonColor: '#3085d6',
					});
				}
			} else {
				// If using the date picker directly
				const receipt = currentList.find((r) => r.id === receiptId);
				if (receipt && receipt.ppt_send_at) {
					handlePptSendChangeAPI(receiptId, receipt.ppt_send_at);
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

	// Function to fetch user identity information
	const fetchUserIdentity = async (uid) => {
		if (identityCache[uid]) {
			setUserInfo((prev) => ({ ...prev, [uid]: identityCache[uid] }));
			return;
		}

		try {
			const userData = await getIdenByUid(uid);
			if (userData) {
				setUserInfo((prev) => ({ ...prev, [uid]: userData }));
			}
		} catch (error) {
			console.error(`Error fetching user info for ${uid}:`, error);
		}
	};

	// Function to get user name from identity
	const getUserName = (uid) => {
		if (!uid) return '';
		if (userInfo[uid]?.identity_name) {
			return userInfo[uid].identity_name;
		}
		if (uid === currentUser?.identity_uid) {
			return currentUser.identity_name;
		}
		return uid; // Fallback to UID if name not found
	};

	// Helper function to check if value is empty or invalid
	const displayValue = (value) => {
		if (value === null || value === undefined || value === '') {
			return <span className="text-start block">--</span>;
		}
		return value;
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
	};

	// Toggle between date format and relative time for draft send
	const toggleDraftFormat = () => {
		setShowRelativeDraftTime(!showRelativeDraftTime);
	};

	// Toggle between date format and relative time for PPT send
	const togglePptFormat = () => {
		setShowRelativePptTime(!showRelativePptTime);
	};

	// Format draft send date as relative time
	const formatDraftSendAsRelative = (sendDate) => {
		if (!sendDate) return <span className="text-start block">--</span>;

		const sendDateTime = new Date(sendDate);
		const today = new Date();

		// Reset time part for date comparison
		const sendDay = new Date(sendDateTime.getFullYear(), sendDateTime.getMonth(), sendDateTime.getDate());
		const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

		// Calculate difference in days
		const diffTime = todayDay - sendDay;
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		// For same day
		if (diffDays === 0) {
			return <span className="text-green-600">Hôm nay</span>;
		}
		// For yesterday
		else if (diffDays === 1) {
			return <span className="text-blue-600">Hôm qua</span>;
		}
		// For days (2-6 days)
		else if (diffDays > 1 && diffDays < 7) {
			return <span className="text-blue-600">{diffDays} ngày trước</span>;
		}
		// For weeks (7-30 days)
		else if (diffDays >= 7 && diffDays < 30) {
			const weeks = Math.floor(diffDays / 7);
			return <span className="text-blue-600">{weeks} tuần trước</span>;
		}
		// For months (30+ days)
		else if (diffDays >= 30) {
			const months = Math.floor(diffDays / 30);
			return <span className="text-blue-600">{months} tháng trước</span>;
		}
		// For future dates
		else if (diffDays < 0) {
			const absDiff = Math.abs(diffDays);
			if (absDiff === 1) {
				return <span className="text-orange-500">Ngày mai</span>;
			} else if (absDiff < 7) {
				return <span className="text-orange-500">{absDiff} ngày sau</span>;
			} else if (absDiff < 30) {
				const weeks = Math.floor(absDiff / 7);
				return <span className="text-orange-500">{weeks} tuần sau</span>;
			} else {
				const months = Math.floor(absDiff / 30);
				return <span className="text-orange-500">{months} tháng sau</span>;
			}
		}
	};

	// Format PPT send date as relative time - similar logic as draft send
	const formatPptSendAsRelative = (sendDate) => {
		if (!sendDate) return <span className="text-start block">--</span>;

		const sendDateTime = new Date(sendDate);
		const today = new Date();

		// Reset time part for date comparison
		const sendDay = new Date(sendDateTime.getFullYear(), sendDateTime.getMonth(), sendDateTime.getDate());
		const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

		// Calculate difference in days
		const diffTime = todayDay - sendDay;
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		// For same day
		if (diffDays === 0) {
			return <span className="text-green-600">Hôm nay</span>;
		}
		// For yesterday
		else if (diffDays === 1) {
			return <span className="text-blue-600">Hôm qua</span>;
		}
		// For days (2-6 days)
		else if (diffDays > 1 && diffDays < 7) {
			return <span className="text-blue-600">{diffDays} ngày trước</span>;
		}
		// For weeks (7-30 days)
		else if (diffDays >= 7 && diffDays < 30) {
			const weeks = Math.floor(diffDays / 7);
			return <span className="text-blue-600">{weeks} tuần trước</span>;
		}
		// For months (30+ days)
		else if (diffDays >= 30) {
			const months = Math.floor(diffDays / 30);
			return <span className="text-blue-600">{months} tháng trước</span>;
		}
		// For future dates
		else if (diffDays < 0) {
			const absDiff = Math.abs(diffDays);
			if (absDiff === 1) {
				return <span className="text-orange-500">Ngày mai</span>;
			} else if (absDiff < 7) {
				return <span className="text-orange-500">{absDiff} ngày sau</span>;
			} else if (absDiff < 30) {
				const weeks = Math.floor(absDiff / 7);
				return <span className="text-orange-500">{weeks} tuần sau</span>;
			} else {
				const months = Math.floor(absDiff / 30);
				return <span className="text-orange-500">{months} tháng sau</span>;
			}
		}
	};

	// Updated togglePreliminaryView function to preserve deadline filter state
	const togglePreliminaryView = () => {
		if (viewMode === 'preliminary') {
			// If already in preliminary view, switch back to normal
			setViewMode('normal');
		} else {
			// Switch to preliminary view and automatically select current
			setViewMode('preliminary');
			// Set to current directly without showing selection buttons
			setSelectedPreliminaryType('current');
		}

		// Remove the code that turns off deadline filter
		// No longer resetting showTodayDeadlines
	};

	// Updated togglePaymentColumn function to preserve deadline filter state
	const togglePaymentColumn = () => {
		// Prevent technicians from accessing payment view
		if (isTechnician()) {
			showToast('Bạn không có quyền xem thông tin thanh toán', 'error');
			return;
		}

		if (viewMode === 'payment') {
			// If already in payment view, switch back to normal
			setViewMode('normal');
		} else {
			// Switch to payment view
			setViewMode('payment');
			// Remove the code that turns off deadline filter
			// No longer resetting showTodayDeadlines
		}
	};

	// Add a new function to fetch receipts filtered by deadline
	const fetchReceiptsByDeadline = async (start, end) => {
		try {
			const formattedStartDate = start ? start.toISOString().split('T')[0] : null;
			const formattedEndDate = end ? end.toISOString().split('T')[0] : null;

			if (!formattedStartDate || !formattedEndDate) {
				showToast('Vui lòng chọn khoảng thời gian', 'error');
				return;
			}

			const payload = {
				start_date: formattedStartDate,
				end_date: formattedEndDate,
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/filter/deadline/receipt', payload);

			if (response.status === 200) {
				if (response.data && Array.isArray(response.data)) {
					// Update the current list with filtered data
					setCurrentList(response.data);
					setIsFilter(true);
					setCurrentPage(1); // Reset to first page

					// Reset search term since we're now filtering by date
					setSearchTerm('');

					// Store filter information
					setFilterInfo({
						isFilterActive: true,
						count: response.data.length,
						startDate: start,
						endDate: end,
					});

					// Remove search query from URL if it exists
					const queryParams = new URLSearchParams(location.search);
					if (queryParams.has('search')) {
						// Navigate to the current path but without search parameters
						navigate(location.pathname);
					}

					// Show toast with count - updated text format
					showToast(
						`Hiển thị ${response.data.length} tiếp nhận có hạn trả kết quả từ ${formatDate(start)} đến ${formatDate(
							end,
						)}`,
						'info',
					);
				} else {
					showToast('Không tìm thấy dữ liệu', 'info');

					// Also update filter info in this case
					setFilterInfo({
						isFilterActive: true,
						count: 0,
						startDate: start,
						endDate: end,
					});

					// Still remove search query from URL if it exists
					const queryParams = new URLSearchParams(location.search);
					if (queryParams.has('search')) {
						navigate(location.pathname);
					}
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
			// Give a longer delay to allow the UI to update before sending API request
			setTimeout(() => {
				// Close the calendar after a sufficient delay to ensure the selection is registered
				setIsCalendarOpen(false);

				// Send API request with selected date range
				fetchReceiptsByDeadline(update[0], update[1]);
			}, 300); // Increased timeout for better UI experience
		}
	};

	// Add this function to handle resetting the date filter to today
	const handleResetDateFilter = () => {
		// Reset date range to today
		const today = new Date();
		setDateRange([today, today]);

		// Close the calendar if open
		setIsCalendarOpen(false);

		// Reset filter info
		setFilterInfo({
			isFilterActive: false,
			count: 0,
			startDate: null,
			endDate: null,
		});

		// Filter for today's deadlines
		const todayStr = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format

		if (viewMode === 'preliminary') {
			const sourceData = [...preliminaryData[selectedPreliminaryType]];
			const filteredData = sourceData.filter((receipt) => {
				if (!receipt.deadline) return false;

				const deadlineDate = new Date(receipt.deadline);
				const deadlineStr = deadlineDate.toISOString().split('T')[0];
				return deadlineStr === todayStr;
			});

			const newPreliminaryData = {
				...preliminaryData,
				[selectedPreliminaryType]: filteredData,
			};

			setPreliminaryData(newPreliminaryData);
			showToast(`Hiển thị ${filteredData.length} tiếp nhận có hạn trả là hôm nay`, 'info');
		} else {
			const filteredReceipts = originalList.filter((receipt) => {
				if (!receipt.deadline) return false;

				const deadlineDate = new Date(receipt.deadline);
				const deadlineStr = deadlineDate.toISOString().split('T')[0];
				return deadlineStr === todayStr;
			});

			setCurrentList(filteredReceipts);
			setIsFilter(true);
			setCurrentPage(1); // Reset to first page
			showToast(`Hiển thị ${filteredReceipts.length} tiếp nhận có hạn trả là hôm nay`, 'info');
		}
	};

	// Handle status filter application
	const handleStatusFilter = (statusIndex) => {
		// If clicking the same status filter that's already active, clear the filter
		if (statusFilter === statusIndex) {
			setStatusFilter(null);
			// Reset to original list or maintain other filters
			if (viewMode === 'preliminary') {
				// For preliminary view, reload the preliminary data
				fetchPreliminaryData();
			} else {
				// Reset to appropriate list based on other active filters
				if (isFilter && !searchTerm) {
					// Keep other filters like date range
					const filteredList = originalList.filter((receipt) => {
						// Apply any other active filters here
						return true;
					});
					setCurrentList(filteredList);
				} else if (!isFilter) {
					// No other filters, just restore original list
					setCurrentList(originalList);
				}
				// If search is active, we don't reset the list
			}
		} else {
			// Apply the new status filter
			setStatusFilter(statusIndex);

			if (viewMode === 'preliminary') {
				// Filter preliminary data
				const sourceData = [...preliminaryData[selectedPreliminaryType]];
				const filteredData = sourceData.filter((receipt) => {
					// Check if any sample in the receipt has the selected status
					return receipt.samples?.some((sample) => sample.status === statusIndex);
				});

				const newPreliminaryData = {
					...preliminaryData,
					[selectedPreliminaryType]: filteredData,
				};

				setPreliminaryData(newPreliminaryData);
				showToast(`Hiển thị ${filteredData.length} tiếp nhận có trạng thái "${status[statusIndex]}"`, 'info');
			} else {
				// Filter current list (which may already be filtered by search or date)
				const filteredReceipts = currentList.filter((receipt) => {
					// Check if any sample in the receipt has the selected status
					return receipt.samples?.some((sample) => sample.status === statusIndex);
				});

				setCurrentList(filteredReceipts);
				setCurrentPage(1); // Reset to first page
				showToast(`Hiển thị ${filteredReceipts.length} tiếp nhận có trạng thái "${status[statusIndex]}"`, 'info');
			}
		}
		// Close the dropdown after selection
		setShowStatusDropdown(false);
	};

	// Toggle status dropdown
	const toggleStatusDropdown = () => {
		if (statusFilter !== null) {
			// If filter is active, clear it
			handleStatusFilter(statusFilter);
		} else {
			// Toggle dropdown visibility
			setShowStatusDropdown(!showStatusDropdown);
		}
	};

	// Close status dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
				setShowStatusDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Clear status filter when changing views or applying other filters
	useEffect(() => {
		setStatusFilter(null);
	}, [viewMode, selectedPreliminaryType]);

	useEffect(() => {
		if (searchTerm) {
			setStatusFilter(null);
		}
	}, [searchTerm]);

	useEffect(() => {
		setCurrentTitlePage('Danh sách tiếp nhận mẫu');
	}, [setCurrentTitlePage]);

	// Add effect to reset deadline filter when search term changes
	useEffect(() => {
		if (searchTerm && showTodayDeadlines) {
			setShowTodayDeadlines(false);
		}
	}, [searchTerm]);

	const fetchReceipt = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/khsi19me/db/get/recent_receipt');
			if (response.status === 200) {
				// Store the original fetched data
				setOriginalList(response.data);
				// If there's no active filter, update the current list as well
				if (!isFilter) {
					setCurrentList(response.data);

					// Turn off deadline filter when refreshing data
					if (showTodayDeadlines) {
						setShowTodayDeadlines(false);
					}
				}

				// Fetch user information for all receipts
				response.data.forEach((receipt) => {
					if (receipt.created_by_uid) {
						fetchUserIdentity(receipt.created_by_uid);
					}
				});
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

	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		if (!isFetch && !queryParams.has('search')) {
			fetchReceipt();
			isFetch = true;
		}
	}, []);

	useEffect(() => {
		const intervalId = setInterval(() => {
			// Always fetch data to update originalList
			// The currentList will only be updated if no filter is active
			fetchReceipt();
		}, 60000); // Fetch every 60 seconds

		return () => clearInterval(intervalId); // Cleanup interval on component unmount or when isFilter changes
	}, [isFilter]); // Re-run effect when isFilter changes

	const handlePageChange = (pageNumber) => {
		setCurrentPage(pageNumber);
	};

	const paginatedReceipts = currentList.slice((currentPage - 1) * receiptsPerPage, currentPage * receiptsPerPage);

	const handleReceiptMouseEnter = (receiptId) => {
		// Don't update state if we're editing a date
		if (editingField.field === 'deadline') return;
		setHoveredReceiptId(receiptId);
	};

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
		setEditingField({ receiptId, sampleId, field });
	};

	// Update this function to properly handle input changes
	const handleInputChange = (e, receiptId, sampleId, field) => {
		const { value } = e.target;

		// Update the sample directly in the current list to reflect changes immediately
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.receipt_id === receiptId) {
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

		try {
			const payload = {
				sample: {
					receipt_id: receiptId,
					id: sampleId,
					[field]: newValue,
				},
			};

			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', payload);

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
			// Clear the editing state
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	// Handle key down event for inputs
	const handleInputKeyDown = (e, receiptId, sampleId, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault(); // Prevent form submission
			handleSampleChange(receiptId, sampleId, field, value);
		}
	};

	// Handle select change - immediately update API
	const handleSelectChange = (e, receiptId, sampleId, field) => {
		const newValue = e.target.value;
		handleSampleChange(receiptId, sampleId, field, newValue);
	};

	// Handle payment status update
	const handlePaymentStatusChange = async (receiptId, newStatus) => {
		// Prevent technicians from updating payment status
		if (isTechnician()) {
			showToast('Bạn không có quyền cập nhật thông tin thanh toán', 'error');
			return;
		}

		try {
			const payload = {
				receipt: {
					id: receiptId,
					pay_status: newStatus,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				showToast('Cập nhật trạng thái thanh toán thành công!');
				fetchReceipt(); // Fetch new data to update the list
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật trạng thái thanh toán',
				});
			}
		} catch (error) {
			console.error('Error updating payment status:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật trạng thái thanh toán',
			});
		} finally {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
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

		try {
			const payload = {
				receipt: {
					id: receiptId,
					[field]: newValue,
					modified_by_uid: currentUser?.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

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
			setEditingField({ receiptId: null, sampleId: null, field: null });
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

	// Update this function to handle payment confirmation with multiple options
	const handlePaymentConfirmation = (receiptId) => {
		// Prevent technicians from confirming payments
		if (isTechnician()) {
			showToast('Bạn không có quyền cập nhật thông tin thanh toán', 'error');
			return;
		}

		const receipt = currentList.find((r) => r.id === receiptId);
		if (!receipt) return;

		const currentStatus = receipt.pay_status || 0;

		Swal.fire({
			title: 'Cập nhật trạng thái thanh toán',
			html: `
				<div class="flex flex-col space-y-3 text-left mt-4">
					<label class="inline-flex items-center">
						<input type="radio" name="pay_status" value="0" class="form-radio" ${currentStatus === 0 ? 'checked' : ''}>
						<span class="ml-2 text-gray-500 font-medium">Chưa thanh toán</span>
					</label>
					<label class="inline-flex items-center">
						<input type="radio" name="pay_status" value="1" class="form-radio" ${currentStatus === 1 ? 'checked' : ''}>
						<span class="ml-2 text-green-600 font-medium">Đã thanh toán</span>
					</label>
					<label class="inline-flex items-center">
						<input type="radio" name="pay_status" value="2" class="form-radio" ${currentStatus === 2 ? 'checked' : ''}>
						<span class="ml-2 text-black font-medium">Khách hàng công nợ</span>
					</label>
				</div>
			`,
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Cập nhật',
			cancelButtonText: 'Hủy',
			preConfirm: () => {
				const selectedStatus = document.querySelector('input[name="pay_status"]:checked').value;
				return parseInt(selectedStatus, 10);
			},
		}).then((result) => {
			if (result.isConfirmed) {
				const newStatus = result.value;
				handlePaymentStatusChange(receiptId, newStatus);
			}
		});
	};

	// Calculate what elements to hide based on the current URL
	const hideElements = () => {
		// If we're on the dashboard page and searching for receipts, hide the search in FilterBar
		if (location.pathname.includes('dashboard') || location.pathname === '/') {
			return ['search'];
		}
		return [];
	};

	// New function to check if all samples in a receipt are completed (status >= 3)
	const areAllSamplesCompleted = (receipt) => {
		// If there are no samples, return false
		if (!receipt.samples || receipt.samples.length === 0) return false;

		// Check if all samples have status >= 3
		return receipt.samples.every((sample) => sample.status >= 3);
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
		return currentUser?.role?.staff_technician;
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
				return handleNoteUpdate(receipt.id || receipt.receipt_uid, note);
			},
		});
	};

	// Add function to handle note update
	const handleNoteUpdate = async (receiptId, noteContent) => {
		try {
			const payload = {
				receipt: {
					id: receiptId,
					note: noteContent,
					modified_by_uid: currentUser?.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

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

			// Reset to original list or maintain other filters
			if (searchTerm || filterInfo.isFilterActive) {
				// If we have active filters, restore the filtered list
				fetchReceipt().then(() => {
					// Re-apply existing filters
					if (searchTerm) {
						const queryParams = new URLSearchParams(location.search);
						const searchParam = queryParams.get('search');
						if (searchParam) {
							// Re-search with existing term
							const filtered = originalList.filter(
								(receipt) =>
									(receipt.receipt_uid || '').includes(searchParam) ||
									(receipt.client?.client_name || '').toLowerCase().includes(searchParam.toLowerCase()) ||
									receipt.samples?.some(
										(sample) =>
											(sample.sample_uid || '').includes(searchParam) ||
											(sample.sample_name || '').toLowerCase().includes(searchParam.toLowerCase()),
									),
							);
							setCurrentList(filtered);
						}
					} else if (filterInfo.isFilterActive) {
						// Re-apply date filter
						fetchReceiptsByDeadline(filterInfo.startDate, filterInfo.endDate);
					} else {
						setCurrentList(originalList);
					}
				});
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

			// Reset to original list or maintain other filters
			if (searchTerm || filterInfo.isFilterActive) {
				// If we have active filters, restore the filtered list
				fetchReceipt().then(() => {
					// Re-apply existing filters
					if (searchTerm) {
						const queryParams = new URLSearchParams(location.search);
						const searchParam = queryParams.get('search');
						if (searchParam) {
							// Re-search with existing term
							const filtered = originalList.filter(
								(receipt) =>
									(receipt.receipt_uid || '').includes(searchParam) ||
									(receipt.client?.client_name || '').toLowerCase().includes(searchParam.toLowerCase()) ||
									receipt.samples?.some(
										(sample) =>
											(sample.sample_uid || '').includes(searchParam) ||
											(sample.sample_name || '').toLowerCase().includes(searchParam.toLowerCase()),
									),
							);
							setCurrentList(filtered);
						}
					} else if (filterInfo.isFilterActive) {
						// Re-apply date filter
						fetchReceiptsByDeadline(filterInfo.startDate, filterInfo.endDate);
					} else {
						setCurrentList(originalList);
					}
				});
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
			// Filter for non-empty record_code and sort in descending order
			setRecordCodeSort(1);
			const filteredList = [...currentList].filter((receipt) => receipt.record_code); // Keep only non-empty values
			const sortedList = filteredList.sort((a, b) => {
				return b.record_code.localeCompare(a.record_code);
			});
			setCurrentList(sortedList);
			showToast(`Hiển thị ${sortedList.length} tiếp nhận có HSL (giảm dần)`, 'info');
		} else if (option === 'empty') {
			// Show only empty/null record_code
			setRecordCodeSort(2);
			const filteredList = [...originalList].filter((receipt) => !receipt.record_code);
			const sortedList = filteredList.sort((a, b) => {
				return (b.receipt_uid || '').localeCompare(a.receipt_uid || '');
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
				return (b.receipt_uid || '').localeCompare(a.receipt_uid || '');
			});
			setCurrentList(sortedList);
			showToast(`Hiển thị ${sortedList.length} tiếp nhận không có SYC`, 'info');
		}
	};

	// Add function to handle payment status filtering
	const handlePaymentFilter = (status) => {
		// If clicking the same filter that's already active, clear the filter
		if (paymentStatusFilter === status) {
			setPaymentStatusFilter(null);
			// Reset to original list or maintain other filters
			if (searchTerm || filterInfo.isFilterActive) {
				// If we have active filters, restore the filtered list
				fetchReceipt().then(() => {
					// Re-apply existing filters
					if (searchTerm) {
						const queryParams = new URLSearchParams(location.search);
						const searchParam = queryParams.get('search');
						if (searchParam) {
							// Re-search with existing term
							const filtered = originalList.filter(
								(receipt) =>
									(receipt.receipt_uid || '').includes(searchParam) ||
									(receipt.client?.client_name || '').toLowerCase().includes(searchParam.toLowerCase()) ||
									receipt.samples?.some(
										(sample) =>
											(sample.sample_uid || '').includes(searchParam) ||
											(sample.sample_name || '').toLowerCase().includes(searchParam.toLowerCase()),
									),
							);
							setCurrentList(filtered);
						}
					} else if (filterInfo.isFilterActive) {
						// Re-apply date filter
						fetchReceiptsByDeadline(filterInfo.startDate, filterInfo.endDate);
					} else {
						setCurrentList(originalList);
					}
				});
			} else {
				// No filters active, just restore original list
				setCurrentList(originalList);
			}
			showToast('Đã hủy lọc thanh toán', 'info');
		} else {
			// Apply the new payment filter
			setPaymentStatusFilter(status);

			// Filter current list based on payment status
			const filteredList = [...currentList].filter((receipt) => receipt.pay_status === status);
			setCurrentList(filteredList);

			// Show toast with appropriate message
			let statusText = '';
			if (status === 0) statusText = 'chưa thanh toán';
			else if (status === 1) statusText = 'đã thanh toán';
			else if (status === 2) statusText = 'công nợ';

			showToast(`Hiển thị ${filteredList.length} tiếp nhận ${statusText}`, 'info');
		}
		// Close the dropdown after selection
		setShowPaymentDropdown(false);
	};

	// Toggle payment dropdown
	const togglePaymentDropdown = () => {
		if (paymentStatusFilter !== null) {
			// If filter is active, clear it
			handlePaymentFilter(paymentStatusFilter);
		} else {
			// Toggle dropdown visibility
			setShowPaymentDropdown(!showPaymentDropdown);
			// Close other dropdowns
			setShowRecordCodeDropdown(false);
			setShowRequestNumberDropdown(false);
		}
	};

	// Add effect to handle clicking outside of dropdowns
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (recordCodeDropdownRef.current && !recordCodeDropdownRef.current.contains(event.target)) {
				setShowRecordCodeDropdown(false);
			}
			if (requestNumberDropdownRef.current && !requestNumberDropdownRef.current.contains(event.target)) {
				setShowRequestNumberDropdown(false);
			}
			if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target)) {
				setShowPaymentDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Calculate if a view mode is currently active
	const isPreliminaryActive = viewMode === 'preliminary';
	const isPaymentActive = viewMode === 'payment';

	// Add this helper function if it doesn't already exist
	const isToday = (date) => {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
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
				.colored-toast .swal2-title {
					color: white;
					font-size: 0.85rem !important;
				}
				.colored-toast .swal2-close {
					color: white;
				}
				.colored-toast .swal2-html-container {
					color: white;
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

			<Breadcrumb
				paths={[{ name: 'Danh sách', link: '/' }]}
				source={originalList}
				setCurrentList={(newList) => {
					setCurrentList(newList);
					// Turn off deadline filter when changing the list through breadcrumb
					if (showTodayDeadlines) {
						setShowTodayDeadlines(false);
					}
				}}
				setIsFilter={setIsFilter}
			/>
			<div className="justify-between items-center w-full mb-1 hidden md:flex">
				<div className="px-2 mb-1 mt-1">
					<div className="flex width-fit space-x-2">
						{/* Remove the preliminary buttons, they will no longer be shown */}
					</div>
				</div>
				<div className="flex space-x-2 items-center">
					<CreateReceiptFromCRM />
					<CreateReceipt />
				</div>
			</div>
			<div className="bg-white rounded-lg w-full pb-4 pt-2">
				{/* Updated layout - buttons row */}
				<div className="w-full flex justify-between items-center px-4 py-2">
					{/* Left side - PPT and Payment buttons */}
					<div className="flex items-center space-x-2">
						{/* PPT button */}
						<button
							className={`p-1 rounded-lg border-gray-400 flex items-center justify-center focus:outline-none gap-2 ${
								isPreliminaryActive ? 'text-white bg-blue-600' : 'text-black'
							}`}
							onClick={togglePreliminaryView}
							title={isPreliminaryActive ? 'Hiển thị chế độ bình thường' : 'Hiển thị danh sách kết quả sơ bộ'}
						>
							<FaFileAlt size={18} />
							<span className="font-normal">PPT</span>
						</button>

						{/* Payment button - hide for technicians */}
						{!isTechnician() && (
							<button
								className={`p-1 rounded-lg border-gray-400 flex items-center justify-center focus:outline-none gap-2  ${
									isPaymentActive ? 'text-white bg-blue-600' : 'text-black'
								}`}
								onClick={togglePaymentColumn}
								title={isPaymentActive ? 'Ẩn cột ghi nhận doanh số' : 'Hiển thị cột ghi nhận doanh số'}
							>
								<FaMoneyBillWave size={18} />
								<span className="font-normal">HC-KT</span>
							</button>
						)}
					</div>

					{/* Right side - Deadline button */}
					<div className="flex items-center">
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
											// Only close if both dates are selected or clicked outside the calendar
											if (startDate && endDate) {
												setIsCalendarOpen(false);
											}
										}}
										// Remove the onBlur handler that causes premature closing
										shouldCloseOnSelect={false} // Don't close automatically on selection
										dayClassName={(date) => (isToday(date) ? 'bg-blue-100 font-bold rounded-full' : undefined)}
									/>
									<button
										className="ml-1 p-1 rounded bg-gray-200 hover:bg-gray-300 focus:outline-none"
										onClick={(e) => {
											e.stopPropagation();
											// Close the deadline filter
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
										}}
										title="Đóng bộ lọc deadline"
									>
										<FaTimes size={14} />
									</button>
								</div>
							)}
						</button>
					</div>
				</div>

				{/* Move filter information to row below with left alignment */}
				<div className="px-4 mb-2 text-left">
					{location.search.includes('search=') && searchTerm && (
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
						!location.search.includes('search=') && (
							<div className="text-sm text-gray-500 mt-1">
								Hiển thị <span className="font-medium">{filterInfo.count}</span> tiếp nhận có hạn trả kết quả từ{' '}
								<span className="font-medium">{formatDate(filterInfo.startDate)}</span> đến{' '}
								<span className="font-medium">{formatDate(filterInfo.endDate)}</span>
								<button
									onClick={handleResetDateFilter}
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
								<th
									className="p-1 border-b text-start max-w-28 min-w-28 cursor-pointer hover:text-[#103667] underline text-blue-700"
									onClick={toggleDeadlineFormat}
								>
									Hạn trả KQ
								</th>

								{/* New columns for Preliminary view to be added right after Hạn trả KQ */}
								{isPreliminaryActive && (
									<>
										<th
											className="p-1 border-b text-start max-w-28 min-w-[100px] cursor-pointer hover:text-[#103667] underline text-blue-700"
											onClick={toggleDraftFormat}
										>
											Gửi sơ bộ
										</th>
										<th
											className="p-1 border-b text-start max-w-28 min-w-[100px] cursor-pointer hover:text-[#103667] underline text-blue-700"
											onClick={togglePptFormat}
										>
											Gửi PPT
										</th>
										<th className="p-1 border-b text-start min-w-[110px]">Người gửi</th>
									</>
								)}

								{/* Payment view specific columns - reordered */}
								{isPaymentActive && (
									<>
										<th
											className={`p-1 border-b text-start w-[6%] min-w-20 cursor-pointer hover:text-[#103667] underline text-blue-700 relative`}
											onClick={toggleRequestNumberSort}
										>
											SYC {requestNumberSort === 1 ? '↓' : requestNumberSort === 2 ? '∅' : ''}
											{showRequestNumberDropdown && (
												<div
													ref={requestNumberDropdownRef}
													className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 w-32"
													style={{ top: '100%', right: 0 }}
												>
													<div
														className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															handleRequestNumberFilter('descending');
														}}
													>
														Giảm dần
													</div>
													<div
														className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															handleRequestNumberFilter('empty');
														}}
													>
														Chưa điền
													</div>
												</div>
											)}
										</th>
										<th
											className={`p-1 border-b text-start w-[6%] min-w-20 cursor-pointer hover:text-[#103667] underline text-blue-700 relative`}
											onClick={toggleRecordCodeSort}
										>
											HSL {recordCodeSort === 1 ? '↓' : recordCodeSort === 2 ? '∅' : ''}
											{showRecordCodeDropdown && (
												<div
													ref={recordCodeDropdownRef}
													className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 w-32"
													style={{ top: '100%', right: 0 }}
												>
													<div
														className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															handleRecordCodeFilter('descending');
														}}
													>
														Giảm dần
													</div>
													<div
														className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															handleRecordCodeFilter('empty');
														}}
													>
														Chưa điền
													</div>
												</div>
											)}
										</th>
									</>
								)}

								<th className="p-1 border-b text-start w-36 min-w-36">Mã mẫu thử</th>
								<th className="p-1 border-b text-start w-full min-w-72">Thông tin mẫu thử</th>

								{/* Normal view specific columns */}
								{!isPaymentActive && !isPreliminaryActive && (
									<>
										<th className="p-1 border-b text-start w-[10%] min-w-28">Số lượng</th>
										<th className="p-1 border-b text-start w-[6%] min-w-24">Mục đích</th>
										<th
											className="p-1 border-b text-start w-[6%] min-w-[100px] cursor-pointer hover:text-[#103667] underline text-blue-700 relative"
											onClick={toggleStatusDropdown}
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
										<th className="p-1 border-b text-start w-[6%] min-w-24">Chỉ tiêu</th>
									</>
								)}

								{/* PPT view specific columns */}
								{isPreliminaryActive && (
									<>
										<th className="p-1 border-b text-start w-[6%] min-w-24">Chỉ tiêu</th>
										<th
											className="p-1 border-b text-start w-[6%] min-w-[100px] cursor-pointer hover:text-[#103667] underline text-blue-700 relative"
											onClick={toggleStatusDropdown}
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
										<th className="p-1 border-b text-start w-[15%] min-w-40">Mã PPT</th>
									</>
								)}

								{/* Payment view specific columns - remaining columns */}
								{isPaymentActive && (
									<>
										<th className="p-1 border-b text-start w-[10%] min-w-28">Mã đơn hàng</th>
										<th className="p-1 border-b text-start w-[10%] min-w-28">Mã báo giá</th>
										<th
											className="p-1 border-b text-start w-[10%] min-w-28 cursor-pointer hover:text-[#103667] underline text-blue-700 relative"
											onClick={togglePaymentDropdown}
										>
											{paymentStatusFilter === null
												? 'Giá trị'
												: paymentStatusFilter === 0
												? ' Chưa TT'
												: paymentStatusFilter === 1
												? ' Đã TT'
												: ' Công nợ'}
											{showPaymentDropdown && (
												<div
													ref={paymentDropdownRef}
													className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 w-40"
													style={{ top: '100%', left: 0 }}
												>
													<div
														className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
															paymentStatusFilter === 0 ? 'bg-blue-100 text-blue-700 font-medium' : ''
														}`}
														onClick={(e) => {
															e.stopPropagation();
															handlePaymentFilter(0);
														}}
													>
														Chưa thanh toán
													</div>
													<div
														className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
															paymentStatusFilter === 1 ? 'bg-blue-100 text-blue-700 font-medium' : ''
														}`}
														onClick={(e) => {
															e.stopPropagation();
															handlePaymentFilter(1);
														}}
													>
														Đã thanh toán
													</div>
													<div
														className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
															paymentStatusFilter === 2 ? 'bg-blue-100 text-blue-700 font-medium' : ''
														}`}
														onClick={(e) => {
															e.stopPropagation();
															handlePaymentFilter(2);
														}}
													>
														Công nợ
													</div>
												</div>
											)}
										</th>
										<th className="p-1 border-b text-start w-[15%] min-w-36">Người ghi nhận</th>
									</>
								)}
							</tr>
						</thead>
						<tbody>
							{paginatedReceipts.map((receipt) => {
								const samplesToShow = receipt.samples || [];

								return (
									<React.Fragment key={receipt.receipt_uid || receipt.id}>
										{/* Display for receipts with no samples */}
										{samplesToShow.length === 0 ? (
											<tr
												key={receipt.receipt_uid || receipt.id}
												className={`border-t border-b ${hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''}`}
												onMouseEnter={() => handleReceiptMouseEnter(receipt.receipt_uid)}
												onMouseLeave={handleReceiptMouseLeave}
											>
												{/* Common columns for empty receipt */}
												<td className="p-1 text-start align-top">
													<div className="flex justify-between items-center">
														<NavLink
															className="text-primary font-semibold hover:text-[#103667]"
															to={`/dashboard/receipt?receipt_uid=${receipt.receipt_uid || receipt.id}`}
														>
															{receipt.receipt_uid || receipt.id}
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
														<p className="text-sm">
															{!isTechnician() ? receipt.client?.client_name || '--' : '[Thông tin bị ẩn]'}
														</p>
														{receipt.record_code && !isTechnician() && (
															<p className="text-xs text-slate-700">HSL: {receipt.record_code}</p>
														)}
														<p className="text-xs text-gray-500">
															{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
															{getUserName(receipt.created_by_uid)}
														</p>
													</div>
												</td>
												<td className="p-1 text-start">
													{receipt.deadline ? formatDeadlineWithStyle(receipt.deadline, receipt) : '--'}
												</td>

												{/* Add the new columns for Preliminary view for empty receipts */}
												{isPreliminaryActive && (
													<>
														<td
															className="p-1 text-start cursor-pointer"
															onClick={() => handleFieldClick(receipt.id, null, 'draft_send_at')}
														>
															{editingField.receiptId === receipt.id &&
															editingField.sampleId === null &&
															editingField.field === 'draft_send_at' ? (
																<div
																	onClick={(e) => e.stopPropagation()}
																	onMouseEnter={(e) => e.stopPropagation()}
																	onMouseLeave={(e) => e.stopPropagation()}
																>
																	<DatePicker
																		selected={receipt.draft_send_at ? new Date(receipt.draft_send_at) : null}
																		onChange={(date) => handleDraftSendChange(receipt.id, date)}
																		onFocus={() => handleDatePickerFocus(receipt.id, receipt.draft_send_at)}
																		onChangeRaw={(e) => handleDateInputChange(receipt.id, e)}
																		onKeyDown={(e) => handleDraftSendKeyDown(e, receipt.id)}
																		dateFormat="dd/MM/yyyy"
																		className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
																		calendarClassName="text-black"
																		placeholderText="Chọn ngày gửi"
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
															) : receipt.draft_send_at ? (
																showRelativeDraftTime ? (
																	formatDraftSendAsRelative(receipt.draft_send_at)
																) : (
																	formatDate(receipt.draft_send_at)
																)
															) : (
																'--'
															)}
														</td>
														<td
															className="p-1 text-start cursor-pointer"
															onClick={() => handleFieldClick(receipt.id, null, 'ppt_send_at')}
														>
															{editingField.receiptId === receipt.id &&
															editingField.sampleId === null &&
															editingField.field === 'ppt_send_at' ? (
																<div
																	onClick={(e) => e.stopPropagation()}
																	onMouseEnter={(e) => e.stopPropagation()}
																	onMouseLeave={(e) => e.stopPropagation()}
																>
																	<DatePicker
																		selected={receipt.ppt_send_at ? new Date(receipt.ppt_send_at) : null}
																		onChange={(date) => handlePptSendChange(receipt.id, date)}
																		onFocus={() => handleDatePickerFocus(receipt.id, receipt.ppt_send_at)}
																		onChangeRaw={(e) => handleDateInputChange(receipt.id, e)}
																		onKeyDown={(e) => handlePptSendKeyDown(e, receipt.id)}
																		dateFormat="dd/MM/yyyy"
																		className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
																		calendarClassName="text-black"
																		placeholderText="Chọn ngày gửi"
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
															) : receipt.ppt_send_at ? (
																showRelativePptTime ? (
																	formatPptSendAsRelative(receipt.ppt_send_at)
																) : (
																	formatDate(receipt.ppt_send_at)
																)
															) : (
																'--'
															)}
														</td>
														<td className="p-1 text-start">
															{receipt.ppt_send_by ? getUserName(receipt.ppt_send_by) : '--'}
														</td>
													</>
												)}

												{/* Additional empty columns for payment view */}
												{isPaymentActive && (
													<>
														<td className="p-1 text-center text-gray-500">{receipt.request_number || '--'}</td>
														<td className="p-1 text-center text-gray-500">{receipt.record_code || '--'}</td>
													</>
												)}

												<td
													colSpan={isPreliminaryActive ? '5' : isPaymentActive ? '7' : '6'}
													className="p-1 text-center text-gray-500"
												>
													Chưa có thông tin mẫu thử . . .
												</td>
											</tr>
										) : (
											/* Display for receipts with samples */
											samplesToShow.map((sample, sampleIndex) => {
												// Calculate completed tests count
												const totalTests = sample?.analysis?.length || 0;
												const completedTests =
													sample?.analysis?.filter(
														(order) => order?.result_value !== null && order?.result_value !== '<p></p>',
													)?.length || 0;

												// Get sample id or uid for lookup
												const sampleKey = sample.id || sample.sample_uid;

												// Get reports for this sample (for PPT view)
												const reports = sample.report || [];

												return (
													<tr
														key={`${receipt?.receipt_uid || 'unknown'}-${
															sample?.sample_uid || 'unknown'
														}-${sampleIndex}`}
														className={`${sampleIndex === 0 ? 'border-t' : ''} 
																	${sampleIndex === samplesToShow.length - 1 ? 'border-b' : ''} 
																	${
																		hoveredSampleId === sample?.sample_uid
																			? 'bg-gray-100'
																			: hoveredReceiptId === receipt?.receipt_uid
																			? 'bg-gray-50'
																			: ''
																	}`}
														onMouseEnter={() => handleSampleMouseEnter(receipt?.receipt_uid, sample?.sample_uid)}
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
																		hoveredReceiptId === receipt?.receipt_uid ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																>
																	<div className="flex justify-between items-center">
																		<NavLink
																			className="text-primary font-semibold hover:text-[#103667]"
																			to={`/dashboard/receipt?receipt_uid=${receipt.receipt_uid || receipt.id}`}
																		>
																			{receipt.receipt_uid || receipt.id}
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
																		<p className="text-sm">
																			{!isTechnician() ? receipt.client?.client_name || '--' : '[Thông tin bị ẩn]'}
																		</p>
																		{receipt.record_code && !isTechnician() && (
																			<p className="text-xs text-slate-700">HSL: {receipt.record_code}</p>
																		)}
																		<p className="text-xs text-gray-500">
																			{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
																			{getUserName(receipt.created_by_uid)}
																		</p>
																	</div>
																</td>

																<td
																	className={`p-1 text-start cursor-pointer align-top ${
																		hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																	onClick={() => handleFieldClick(receipt.id, null, 'deadline')}
																>
																	{editingField.receiptId === receipt.id &&
																	editingField.sampleId === null &&
																	editingField.field === 'deadline' ? (
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
																			{showRelativeTime
																				? formatDeadlineAsRelative(receipt.deadline, receipt)
																				: formatDeadlineWithStyle(receipt.deadline, receipt)}
																		</div>
																	)}
																</td>

																{/* Add the new columns for receipts with samples in Preliminary view */}
																{isPreliminaryActive && (
																	<>
																		<td
																			className={`p-1 text-start cursor-pointer align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																			onClick={() => handleFieldClick(receipt.id, null, 'draft_send_at')}
																		>
																			{editingField.receiptId === receipt.id &&
																			editingField.sampleId === null &&
																			editingField.field === 'draft_send_at' ? (
																				<div
																					onClick={(e) => e.stopPropagation()}
																					onMouseEnter={(e) => e.stopPropagation()}
																					onMouseLeave={(e) => e.stopPropagation()}
																				>
																					<DatePicker
																						selected={receipt.draft_send_at ? new Date(receipt.draft_send_at) : null}
																						onChange={(date) => handleDraftSendChange(receipt.id, date)}
																						onFocus={() => handleDatePickerFocus(receipt.id, receipt.draft_send_at)}
																						onChangeRaw={(e) => handleDateInputChange(receipt.id, e)}
																						onKeyDown={(e) => handleDraftSendKeyDown(e, receipt.id)}
																						dateFormat="dd/MM/yyyy"
																						className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
																						calendarClassName="text-black"
																						placeholderText="Chọn ngày gửi"
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
																				<div className="w-full h-full p-1 py-0 rounded cursor-pointer hover:bg-gray-100">
																					{receipt.draft_send_at
																						? showRelativeDraftTime
																							? formatDraftSendAsRelative(receipt.draft_send_at)
																							: formatDate(receipt.draft_send_at)
																						: '--'}
																				</div>
																			)}
																		</td>
																		<td
																			className={`p-1 text-start cursor-pointer align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																			onClick={() => handleFieldClick(receipt.id, null, 'ppt_send_at')}
																		>
																			{editingField.receiptId === receipt.id &&
																			editingField.sampleId === null &&
																			editingField.field === 'ppt_send_at' ? (
																				<div
																					onClick={(e) => e.stopPropagation()}
																					onMouseEnter={(e) => e.stopPropagation()}
																					onMouseLeave={(e) => e.stopPropagation()}
																				>
																					<DatePicker
																						selected={receipt.ppt_send_at ? new Date(receipt.ppt_send_at) : null}
																						onChange={(date) => handlePptSendChange(receipt.id, date)}
																						onFocus={() => handleDatePickerFocus(receipt.id, receipt.ppt_send_at)}
																						onChangeRaw={(e) => handleDateInputChange(receipt.id, e)}
																						onKeyDown={(e) => handlePptSendKeyDown(e, receipt.id)}
																						dateFormat="dd/MM/yyyy"
																						className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
																						calendarClassName="text-black"
																						placeholderText="Chọn ngày gửi"
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
																				<div className="w-full h-full p-1 py-0 rounded cursor-pointer hover:bg-gray-100">
																					{receipt.ppt_send_at
																						? showRelativePptTime
																							? formatPptSendAsRelative(receipt.ppt_send_at)
																							: formatDate(receipt.ppt_send_at)
																						: '--'}
																				</div>
																			)}
																		</td>
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																		>
																			{receipt.ppt_send_by ? getUserName(receipt.ppt_send_by) : '--'}
																		</td>
																	</>
																)}

																{/* Payment view specific columns - SYC & HSL moved up */}
																{isPaymentActive && (
																	<>
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																			onClick={() => handleFieldClick(receipt.id, null, 'request_number')}
																		>
																			{editingField.receiptId === receipt.id &&
																			editingField.sampleId === null &&
																			editingField.field === 'request_number' ? (
																				<input
																					type="text"
																					value={receipt.request_number || ''}
																					onChange={(e) => handleReceiptInputChange(e, receipt.id, 'request_number')}
																					onKeyDown={(e) =>
																						handleReceiptInputKeyDown(e, receipt.id, 'request_number', e.target.value)
																					}
																					onBlur={() =>
																						setEditingField({ receiptId: null, sampleId: null, field: null })
																					}
																					className="p-1 border rounded-md w-full text-sm bg-white"
																					autoFocus
																				/>
																			) : (
																				<p className="cursor-pointer hover:bg-gray-100 p-1 rounded">
																					{receipt.request_number || '--'}
																				</p>
																			)}
																		</td>
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																			onClick={() => handleFieldClick(receipt.id, null, 'record_code')}
																		>
																			{editingField.receiptId === receipt.id &&
																			editingField.sampleId === null &&
																			editingField.field === 'record_code' ? (
																				<input
																					type="text"
																					value={receipt.record_code || ''}
																					onChange={(e) => handleReceiptInputChange(e, receipt.id, 'record_code')}
																					onKeyDown={(e) =>
																						handleReceiptInputKeyDown(e, receipt.id, 'record_code', e.target.value)
																					}
																					onBlur={() =>
																						setEditingField({ receiptId: null, sampleId: null, field: null })
																					}
																					className="p-1 border rounded-md w-full text-sm bg-white"
																					autoFocus
																				/>
																			) : (
																				<p className="cursor-pointer hover:bg-gray-100 p-1 rounded">
																					{receipt.record_code || '--'}
																				</p>
																			)}
																		</td>
																	</>
																)}
															</>
														)}

														{/* Common sample columns */}
														<td className="p-1 text-start align-top">
															<NavLink
																className="text-primary font-normal hover:text-[#103667]"
																to={`/dashboard/sample?receipt_uid=${receipt.receipt_uid || receipt.id}&sample_uid=${
																	sample.sample_uid || sample.id
																}`}
															>
																{sample.sample_uid || sample.id}
															</NavLink>
														</td>
														<td className="p-1 text-start align-top">{displayValue(sample.sample_name)}</td>

														{/* Normal view specific columns */}
														{!isPaymentActive && !isPreliminaryActive && (
															<>
																<td
																	className="p-1 text-start cursor-text align-top"
																	onClick={() => handleFieldClick(receipt.receipt_id, sample.id, 'sample_volume')}
																>
																	{editingField.receiptId === receipt.receipt_id &&
																	editingField.sampleId === sample.id &&
																	editingField.field === 'sample_volume' ? (
																		<input
																			type="text"
																			value={sample.sample_volume || ''}
																			onChange={(e) =>
																				handleInputChange(e, receipt.receipt_id, sample.id, 'sample_volume')
																			}
																			onKeyDown={(e) =>
																				handleInputKeyDown(
																					e,
																					receipt.receipt_id,
																					sample.id,
																					'sample_volume',
																					e.target.value,
																				)
																			}
																			onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																			className="p-1 border rounded-md w-full text-sm bg-white"
																			autoFocus
																		/>
																	) : (
																		<div className="w-full h-full rounded">{displayValue(sample.sample_volume)}</div>
																	)}
																</td>
																<td
																	className="p-1 text-start cursor-pointer align-top"
																	onClick={() => handleFieldClick(receipt.receipt_id, sample.id, 'purpose')}
																>
																	{editingField.receiptId === receipt.receipt_id &&
																	editingField.sampleId === sample.id &&
																	editingField.field === 'purpose' ? (
																		<select
																			value={sample.purpose || ''}
																			onChange={(e) => handleSelectChange(e, receipt.receipt_id, sample.id, 'purpose')}
																			onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																			className="p-1 border rounded-md w-full text-sm bg-white"
																			autoFocus
																		>
																			<option value="">--</option>
																			{purposes.map((purpose, index) => (
																				<option key={index} value={purpose}>
																					{purpose}
																				</option>
																			))}
																		</select>
																	) : (
																		<div className="w-full h-full rounded">{displayValue(sample.purpose)}</div>
																	)}{' '}
																</td>
																<td
																	className="p-1 text-start cursor-pointer align-top"
																	onClick={() => handleFieldClick(receipt.receipt_id, sample.id, 'status')}
																>
																	{editingField.receiptId === receipt.receipt_id &&
																	editingField.sampleId === sample.id &&
																	editingField.field === 'status' ? (
																		<select
																			value={sample.status}
																			onChange={(e) => handleSelectChange(e, receipt.receipt_id, sample.id, 'status')}
																			onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																			className="p-1 border rounded-md w-full text-sm bg-white"
																			autoFocus
																		>
																			{status.map((statusName, index) => (
																				<option key={index} value={index}>
																					{statusName}
																				</option>
																			))}
																		</select>
																	) : (
																		<div className="w-full h-full rounded">
																			{status[sample.status] ? (
																				status[sample.status]
																			) : (
																				<span className="text-start block">--</span>
																			)}
																		</div>
																	)}
																</td>
																<td className="p-1 text-start align-top">
																	{completedTests} / {totalTests}
																</td>
															</>
														)}

														{/* PPT view specific columns */}
														{isPreliminaryActive && (
															<>
																<td className="p-1 text-start align-top">
																	{completedTests} / {totalTests}
																</td>
																<td className="p-1 text-start align-top">
																	{status[sample.status] ? status[sample.status] : '--'}
																</td>
																<td className="p-1 text-start align-top">
																	<div className="flex items-center justify-start space-x-2">
																		<select
																			className="p-0.5 border rounded flex-grow text-sm bg-white"
																			value={
																				selectedReportIds[sampleKey] ||
																				(reports.length > 0 ? reports[reports.length - 1].ppt_uid : '')
																			}
																			onChange={(e) => handleReportSelection(sampleKey, e.target.value)}
																		>
																			{reports.length > 0 ? (
																				reports.map((report) => (
																					<option key={report.ppt_uid} value={report.ppt_uid}>
																						{report.ppt_uid}
																					</option>
																				))
																			) : (
																				<option value="">Chưa tạo PPT</option>
																			)}
																		</select>
																		<button
																			className="p-1 text-blue-500 hover:text-blue-700 focus:outline-none"
																			onClick={() => {
																				const url = `${window.location.origin}/report?sample_uid=${
																					sample.sample_uid || sample.id
																				}${
																					selectedReportIds[sampleKey]
																						? `&ppt_uid=${selectedReportIds[sampleKey]}`
																						: reports.length > 0
																						? `&ppt_uid=${reports[reports.length - 1].ppt_uid}`
																						: ''
																				}`;
																				window.open(url, '_blank');
																			}}
																			title="Xem báo cáo"
																		>
																			<FaExternalLinkAlt />
																		</button>
																	</div>
																</td>
															</>
														)}

														{/* Payment view specific columns - reordered */}
														{sampleIndex === 0 && isPaymentActive && (
															<>
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																	onClick={() => handleFieldClick(receipt.id, null, 'order_code')}
																>
																	{editingField.receiptId === receipt.id &&
																	editingField.sampleId === null &&
																	editingField.field === 'order_code' ? (
																		<input
																			type="text"
																			value={receipt.order_code || ''}
																			onChange={(e) => handleReceiptInputChange(e, receipt.id, 'order_code')}
																			onKeyDown={(e) =>
																				handleReceiptInputKeyDown(e, receipt.id, 'order_code', e.target.value)
																			}
																			onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																			className="p-1 border rounded-md w-full text-sm bg-white"
																			autoFocus
																		/>
																	) : (
																		<p className="cursor-pointer hover:bg-gray-100 p-1 rounded">
																			{receipt.order_code || '--'}
																		</p>
																	)}
																</td>
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																	onClick={() => handleFieldClick(receipt.id, null, 'quote_code')}
																>
																	{editingField.receiptId === receipt.id &&
																	editingField.sampleId === null &&
																	editingField.field === 'quote_code' ? (
																		<input
																			type="text"
																			value={receipt.quote_code || ''}
																			onChange={(e) => handleReceiptInputChange(e, receipt.id, 'quote_code')}
																			onKeyDown={(e) =>
																				handleReceiptInputKeyDown(e, receipt.id, 'quote_code', e.target.value)
																			}
																			onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																			className="p-1 border rounded-md w-full text-sm bg-white"
																			autoFocus
																		/>
																	) : (
																		<p className="cursor-pointer hover:bg-gray-100 p-1 rounded">
																			{receipt.quote_code || '--'}
																		</p>
																	)}
																</td>
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																	onClick={() => handlePaymentConfirmation(receipt.id)}
																>
																	<p
																		className={`cursor-pointer hover:bg-gray-100 p-1 rounded font-medium ${
																			receipt.pay_status === 1
																				? 'text-green-600'
																				: receipt.pay_status === 2
																				? 'text-black'
																				: 'text-gray-500'
																		}`}
																	>
																		{receipt.total_amount ? `${receipt.total_amount.toLocaleString()} ₫` : '--'}
																	</p>
																</td>
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																	onClick={() => handleFieldClick(receipt.id, null, 'sale_recorder')}
																>
																	{editingField.receiptId === receipt.id &&
																	editingField.sampleId === null &&
																	editingField.field === 'sale_recorder' ? (
																		<input
																			type="text"
																			value={receipt.sale_recorder || ''}
																			onChange={(e) => handleReceiptInputChange(e, receipt.id, 'sale_recorder')}
																			onKeyDown={(e) =>
																				handleReceiptInputKeyDown(e, receipt.id, 'sale_recorder', e.target.value)
																			}
																			onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																			className="p-1 border rounded-md w-full text-sm bg-white"
																			autoFocus
																		/>
																	) : (
																		<p className="cursor-pointer hover:bg-gray-100 p-1 rounded">
																			{receipt.sale_recorder || '--'}
																		</p>
																	)}
																</td>
															</>
														)}
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
				<div
					className="flex justify-center mt-4 overflow-x-auto max-w-full"
					style={{ scrollbarWidth: 'thin', scrollbarColor: '#cccccc transparent' }}
				>
					<div className="flex">
						{Array.from({ length: Math.ceil(currentList.length / receiptsPerPage) }, (_, index) => (
							<button
								key={index + 1}
								className={`px-4 py-2 mx-1 ${currentPage === index + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'} `}
								onClick={() => handlePageChange(index + 1)}
							>
								{index + 1}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
