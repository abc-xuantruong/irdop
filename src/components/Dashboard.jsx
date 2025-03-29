import React, { useContext, useEffect, useState, useRef } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import FilterBar from './FilterBar';
import Breadcrumb from './Breadcrumb';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import CreateReceipt from './CreateReceipt';
import CreateReceiptFromCRM from './CreateReceiptFromCRM';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createPortal } from 'react-dom';

import {
	FaAngleRight,
	FaMoneyBillWave,
	FaCalendarDay,
	FaFileAlt,
	FaExternalLinkAlt,
	FaRegStickyNote,
	FaStickyNote,
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
	const receiptsPerPage = 15;
	const [hoveredReceiptId, setHoveredReceiptId] = useState(null);
	const [hoveredSampleId, setHoveredSampleId] = useState(null);
	let isFetch = false;

	// Date input state
	const [dateInputValues, setDateInputValues] = useState({});
	const [isDatePickerFocused, setIsDatePickerFocused] = useState(false);
	const [tempDateValues, setTempDateValues] = useState({});

	// Add new state to track payment column visibility (default is hidden)
	const [showPaymentColumn, setShowPaymentColumn] = useState(false);

	// Add new state to track today's deadline filter
	const [showTodayDeadlines, setShowTodayDeadlines] = useState(false);

	// Add state to track selected report IDs for each sample
	const [selectedReportIds, setSelectedReportIds] = useState({});

	// Replace separate view state with a single viewMode state
	const [viewMode, setViewMode] = useState('normal'); // 'normal', 'payment', 'preliminary'

	// Add a new state for tracking whether we're showing the current list or fetched preliminary data
	const [isPreliminaryDataFetched, setIsPreliminaryDataFetched] = useState(false);

	// Add state to track which note is being edited
	const [noteEditing, setNoteEditing] = useState({ receiptId: null, content: '' });

	// Add state to track tooltip position and visibility
	const [tooltipState, setTooltipState] = useState({
		visible: false,
		content: '',
		x: 0,
		y: 0,
	});

	// Add state for date range picker
	const [showDateRangePicker, setShowDateRangePicker] = useState(false);

	const [dateRange, setDateRange] = useState([
		{
			startDate: startOfMonth(new Date()),
			endDate: endOfMonth(new Date()),
			key: 'selection',
		},
	]);
	const [isOpen, setIsOpen] = useState(false);
	const [isSelectingStart, setIsSelectingStart] = useState(true); // Theo dõi trạng thái chọn startDate hay endDate
	const containerRef = useRef(null);

	const handleOnChange = (ranges) => {
		const { selection } = ranges;

		if (isSelectingStart) {
			// Chỉ cập nhật startDate
			setDateRange([
				{
					...dateRange[0], // Giữ nguyên các thuộc tính khác
					startDate: selection.startDate, // Cập nhật startDate
					endDate: dateRange[0].endDate, // Giữ nguyên endDate
					key: 'selection',
				},
			]);
			setIsSelectingStart(false); // Chuyển sang trạng thái chọn endDate
		} else {
			// Cập nhật endDate
			setDateRange([
				{
					...dateRange[0],
					startDate: dateRange[0].startDate, // Giữ nguyên startDate
					endDate: selection.endDate, // Cập nhật endDate
					key: 'selection',
				},
			]);
			setIsSelectingStart(true); // Reset trạng thái để chọn startDate lần tiếp theo
			setIsOpen(false); // Đóng calendar sau khi chọn xong
		}
	};

	const toggleCalendar = () => {
		setIsOpen(!isOpen);
		setIsSelectingStart(true); // Reset trạng thái khi mở calendar
	};

	const CalendarWrapper = () => {
		if (!isOpen) return null;

		return createPortal(
			<div
				className="absolute z-[9999] shadow-lg rounded-lg border border-gray-300 bg-white"
				style={{
					top: containerRef.current?.getBoundingClientRect().bottom + window.scrollY,
					left: containerRef.current?.getBoundingClientRect().left + window.scrollX,
				}}
			>
				<DateRangePicker
					onChange={handleOnChange}
					ranges={dateRange}
					direction="horizontal"
					showDateDisplay={true}
					months={1}
					inputRanges={[]}
					staticRanges={[]}
					moveRangeOnFirstSelection={false} // Ngăn không cho tự động di chuyển range
				/>
			</div>,
			document.body,
		);
	};

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

		// Sort reports by publish_date in descending order (most recent first)
		const sortedReports = [...sample.report].sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date));

		return sortedReports[0];
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

	// Handle date picker blur - only update if value has changed
	const handleDatePickerBlur = (receiptId, currentDate) => {
		if (isDatePickerFocused) {
			// Compare with original value and update if different
			if (currentDate !== tempDateValues[receiptId]) {
				handleDeadlineChangeAPI(receiptId, currentDate);
			}
			setIsDatePickerFocused(false);
		}
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

	// Split date handling into two functions:
	// 1. UI update function
	const handleDeadlineChange = (receiptId, date) => {
		handleTempDateChange(receiptId, date);
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

	// Format deadline as relative time - updated with purple color for overdue
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

		if (diffDays === 0) {
			return <span className="text-red-600">Hôm nay</span>;
		} else if (diffDays > 0) {
			// For future dates, just show days without hours
			return <span className="text-green-600">{diffDays} ngày</span>;
		} else {
			return <span className="text-purple-800">Quá {Math.abs(diffDays)} ngày</span>;
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

	// Updated togglePreliminaryView function to reset to showing current data
	const togglePreliminaryView = () => {
		if (viewMode === 'preliminary') {
			// If already in preliminary view, switch back to normal
			setViewMode('normal');
		} else {
			// Switch to preliminary view but don't fetch data yet
			setViewMode('preliminary');
			// Reset to showing current list when switching to preliminary view
			setIsPreliminaryDataFetched(false);
			setSelectedPreliminaryType('current');
		}

		// Turn off other filters when switching views
		if (showTodayDeadlines) {
			setShowTodayDeadlines(false);
		}
	};

	// Updated togglePaymentColumn function
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
			// Turn off other filters
			setShowTodayDeadlines(false);
		}
	};

	// Add a new function to fetch receipts filtered by deadline
	const fetchReceiptsByDeadline = async (startDate, endDate) => {
		try {
			// Format dates to YYYY-MM-DD format for the API
			const formattedStartDate = startDate ? startDate.toISOString().split('T')[0] : null;
			const formattedEndDate = endDate ? endDate.toISOString().split('T')[0] : null;

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

					// Show toast with count
					showToast(`Hiển thị ${response.data.length} tiếp nhận trong khoảng thời gian đã chọn`, 'info');
				} else {
					showToast('Không tìm thấy dữ liệu', 'info');
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

	// Add function to handle Apply buttonSP2513x2604-01 click
	const handleApplyDateFilter = () => {
		// Call the API with selected date range
		fetchReceiptsByDeadline(dateRange[0].startDate, dateRange[0].endDate);
		setIsOpen(false); // Close the date picker
	};

	// Updated filterTodayDeadlines function that properly filters preliminary data
	const filterTodayDeadlines = () => {
		// Toggle date range picker
		setShowDateRangePicker(!showDateRangePicker);

		// If turning off the date picker, reset the filter
		if (showDateRangePicker) {
			// Reset date range
			setDateRange({
				startDate: null,
				endDate: null,
			});

			// Reset to the original list
			if (viewMode === 'preliminary') {
				// For preliminary view, reload the preliminary data
				fetchPreliminaryData();
			} else {
				// For normal and payment views, reset to the original list
				setCurrentList(originalList);
				setIsFilter(false);
			}

			// Turn off today's deadlines filter if it was active
			if (showTodayDeadlines) {
				setShowTodayDeadlines(false);
			}
		} else if (!showDateRangePicker && !showTodayDeadlines) {
			// If turning on the date picker and today filter is off,
			// we'll keep the current behavior of showing today's deadlines
			setShowTodayDeadlines(true);

			// Logic for filtering today's deadlines (keep existing code)
			const today = new Date();
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
				const filteredReceipts = currentList.filter((receipt) => {
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
		}
	};

	// Function to fetch preliminary results data
	const fetchPreliminaryData = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/to82oe92i/db/sample/get/send_result');
			if (response.status === 200) {
				setPreliminaryData(response.data);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi tải dữ liệu kết quả sơ bộ',
				});
			}
		} catch (error) {
			console.error('Error fetching preliminary results:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi tải dữ liệu kết quả sơ bộ',
			});
		}
	};

	// Update the handlePreliminaryTypeChange function to fetch data only for non-current tabs
	const handlePreliminaryTypeChange = (type) => {
		// Turn off deadline filter when changing preliminary list type
		if (showTodayDeadlines) {
			setShowTodayDeadlines(false);
		}

		// Set the selected type
		setSelectedPreliminaryType(type);

		// Only fetch data if it's not the "current" tab
		if (type !== 'current') {
			fetchPreliminaryData(type);
			setIsPreliminaryDataFetched(true);
		} else {
			setIsPreliminaryDataFetched(false);
		}
	};

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
		if (!isFetch) {
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
		setHoveredReceiptId(receiptId);
	};

	const handleReceiptMouseLeave = () => {
		setHoveredReceiptId(null);
	};

	const handleSampleMouseEnter = (receiptId, sampleId) => {
		setHoveredReceiptId(receiptId);
		setHoveredSampleId(sampleId);
	};

	const handleSampleMouseLeave = () => {
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
						<input type="radio" name="pay_status" value="1" class="form-radio" ${currentStatus === 1 ? 'checked' : ''}>
						<span class="ml-2 text-green-600 font-medium">Đã thanh toán</span>
					</label>
					<label class="inline-flex items-center">
						<input type="radio" name="pay_status" value="0" class="form-radio" ${currentStatus === 0 ? 'checked' : ''}>
						<span class="ml-2 text-gray-500 font-medium">Chưa thanh toán</span>
					</label>
					<label class="inline-flex items-center">
						<input type="radio" name="pay_status" value="2" class="form-radio" ${currentStatus === 2 ? 'checked' : ''}>
						<span class="ml-2 text-black font-medium">Công nợ</span>
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
		// Only show tooltip if receipt has a note
		if (receipt?.note && receipt.note.trim() !== '') {
			setTooltipState({
				visible: true,
				content: receipt.note,
				x: e.clientX + 10, // Offset by 10px to right of cursor
				y: e.clientY + 10, // Offset by 10px below cursor
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

	// Calculate if a view mode is currently active
	const isPreliminaryActive = viewMode === 'preliminary';
	const isPaymentActive = viewMode === 'payment';

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
						left: `${tooltipState.x}px`,
						top: `${tooltipState.y}px`,
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
						{isPreliminaryActive && (
							<>
								{/* Add the "Current" button */}
								<button
									className={`px-2 py-1 rounded focus:outline-none ${
										selectedPreliminaryType === 'current' ? 'bg-blue-600 text-white' : 'bg-gray-200'
									}`}
									onClick={() => handlePreliminaryTypeChange('current')}
								>
									Hiện tại
								</button>
								<button
									className={`px-2 py-1 rounded focus:outline-none ${
										selectedPreliminaryType === 'not_sent_preliminary' ? 'bg-blue-600 text-white' : 'bg-gray-200'
									}`}
									onClick={() => handlePreliminaryTypeChange('not_sent_preliminary')}
								>
									Chưa gửi kết quả ({preliminaryData.not_sent_preliminary?.length || 0})
								</button>
								<button
									className={`px-2 py-1 rounded focus:outline-none ${
										selectedPreliminaryType === 'sent_preliminary' ? 'bg-blue-600 text-white' : 'bg-gray-200'
									}`}
									onClick={() => handlePreliminaryTypeChange('sent_preliminary')}
								>
									Đã gửi sơ bộ({preliminaryData.sent_preliminary?.length || 0})
								</button>
								{/* <button
									className={`px-2 py-1 rounded focus:outline-none ${
										selectedPreliminaryType === 'sent_report' ? 'bg-blue-600 text-white' : 'bg-gray-200'
									}`}
									onClick={() => handlePreliminaryTypeChange('sent_report')}
								>
									Đã gửi phiếu ({preliminaryData.sent_report?.length || 0})
								</button> */}
							</>
						)}
					</div>
				</div>
				<div className="flex space-x-2 items-center">
					<CreateReceiptFromCRM />
					<CreateReceipt />
				</div>
			</div>
			<div className="bg-white rounded-lg w-full pb-4 pt-2">
				<div className="bg-white rounded-lg w-full pb-4 pt-2 flex justify-between items-center flex-wrap">
					{/* Preliminary Results View */}
					<div>
						{searchTerm && (
							<div className="text-sm text-gray-600">
								Kết quả tìm kiếm cho: <span className="font-medium">{searchTerm}</span>
								<button
									onClick={() => {
										// Reset search term
										setSearchTerm('');
										// Reset all filters and states
										setIsFilter(false);
										setShowTodayDeadlines(false);
										setViewMode('normal');
										setIsPreliminaryDataFetched(false);

										// Navigate to dashboard root
										navigate('/dashboard');

										// Explicitly fetch fresh data and then update the currentList with that fresh data
										fetchReceipt().then(() => {
											// Fetch a new set of receipts and update the UI
											apiGet('https://black.irdop.org/khsi19me/db/get/recent_receipt').then((response) => {
												if (response.status === 200) {
													setOriginalList(response.data);
													setCurrentList(response.data);
												}
											});
										});
									}}
									className="ml-2 text-blue-600 px-2 py-1 bg-background border-2 border-gray-400"
								>
									Hủy
								</button>
							</div>
						)}
					</div>
					<div className="w-fit px-4 flex justify-end">
						<div className="flex gap-2 items-center">
							{showDateRangePicker && (
								<div className="flex gap-1">
									<div ref={containerRef} className="relative">
										{/* Input để trigger calendar */}
										<input
											type="text"
											readOnly
											value={`${format(dateRange[0]?.startDate || startOfMonth(new Date()), 'MM/dd/yyyy')} - ${format(
												dateRange[0]?.endDate || endOfMonth(new Date()),
												'MM/dd/yyyy',
											)}`}
											onClick={toggleCalendar}
											className="w-full p-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
										/>
										{/* Render calendar */}
										<CalendarWrapper />
									</div>
									<button
										onClick={handleApplyDateFilter}
										className="border-gray-500 py-1 px-2 rounded hover:bg-blue-200 flex items-center "
									>
										<FaAngleRight size={18} />
									</button>
								</div>
							)}
							<button
								className={`p-2 rounded-lg border-gray-400 mr-2 flex items-center justify-center focus:outline-none gap-2 py-1 ${
									showTodayDeadlines || showDateRangePicker ? 'text-white bg-blue-600' : 'text-black'
								}`}
								onClick={filterTodayDeadlines}
								title={showTodayDeadlines ? 'Hiển thị tất cả' : 'Hiển thị các phiếu hạn trả hôm nay'}
							>
								<FaCalendarDay size={18} />
								<span className="font-normal">Deadline</span>
							</button>
						</div>

						{/* Change icon to document icon for preliminary results */}
						<button
							className={`p-2 rounded-lg border-gray-400 mr-2 flex items-center justify-center focus:outline-none gap-2 py-0 ${
								isPreliminaryActive ? 'text-white bg-blue-600' : 'text-black'
							}`}
							onClick={togglePreliminaryView}
							title={isPreliminaryActive ? 'Hiển thị chế độ bình thường' : 'Hiển thị danh sách kết quả sơ bộ'}
						>
							<FaFileAlt size={18} />
							<span className="font-normal">PPT</span>
						</button>

						{/* Add payment toggle button - hide for technicians */}
						{!isTechnician() && (
							<button
								className={`p-2 rounded-lg border-gray-400 mr-2 flex items-center justify-center focus:outline-none gap-2 py-0 ${
									isPaymentActive ? 'text-white bg-blue-600' : 'text-black'
								}`}
								onClick={togglePaymentColumn}
								title={isPaymentActive ? 'Ẩn cột ghi nhận doanh số' : 'Hiển thị cột ghi nhận doanh số'}
							>
								<FaMoneyBillWave size={18} />
								<span className="font-normal">Thanh toán</span>
							</button>
						)}

						<div className="w-fit">
							<FilterBar
								source={originalList} // Pass the original list to FilterBar
								setCurrentList={setCurrentList}
								typeSearch="receipt"
								setIsFilter={setIsFilter} // Pass the setIsFilter function
								hide={hideElements()} // Conditionally hide search
							/>
						</div>
					</div>
				</div>

				{isPreliminaryActive ? (
					<>
						<div className="overflow-x-auto px-1 py-2">
							<table className="w-full text-black">
								<thead>
									<tr className="border-b-2">
										<th className="p-1 border-b text-start min-w-[250px]">Mã tiếp nhận mẫu</th>
										<th className="p-1 border-b text-start max-w-28 min-w-28">Hạn trả KQ</th>
										<th className="p-1 border-b text-start w-36 min-w-36">Mã mẫu thử</th>
										<th className="p-1 border-b text-start w-full min-w-72">Thông tin mẫu thử</th>
										<th className="p-1 border-b text-start w-[6%] min-w-24">Chỉ tiêu</th>
										<th className="p-1 border-b text-start w-[10%] min-w-36">Trạng thái</th>
										<th className="p-1 border-b text-start w-[15%] min-w-40">Mã PPT</th>
									</tr>
								</thead>
								<tbody>
									{selectedPreliminaryType === 'current' ? (
										// Show current list when "Current" is selected
										paginatedReceipts.length > 0 ? (
											paginatedReceipts.map((receipt) => {
												const samplesToShow = receipt.samples || [];

												return (
													<React.Fragment key={receipt.receipt_uid || receipt.id}>
														{samplesToShow.length === 0 ? (
															<tr key={`empty-${receipt.receipt_uid || receipt.id}`}>
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
																				className={` text-[#d5b31c] cursor-pointer`}
																				onClick={() => handleNoteClick(receipt)}
																				onMouseEnter={(e) => handleTooltipEnter(e, receipt)}
																				onMouseLeave={handleTooltipLeave}
																				title="Thêm ghi chú"
																			/>
																		) : (
																			<FaRegStickyNote
																				size={16}
																				className={` text-gray-500 hover:text-[#d5b31c] cursor-pointer opacity-50`}
																				onClick={() => handleNoteClick(receipt)}
																				title="Xem/Cập nhật ghi chú"
																			/>
																		)}
																	</div>
																	<div className="flex flex-col">
																		<p className="text-sm">
																			{!isTechnician() ? receipt.client?.client_name || '--' : '[Thông tin bị ẩn]'}
																		</p>
																		<p className="text-xs text-gray-500">
																			{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
																			{getUserName(receipt.created_by_uid)}
																		</p>
																	</div>
																</td>
																<td className="p-1 text-start">
																	{receipt.deadline ? formatDeadlineWithStyle(receipt.deadline, receipt) : '--'}
																</td>
																<td colSpan="5" className="p-1 text-center text-gray-500">
																	Chưa có thông tin mẫu thử . . .
																</td>
															</tr>
														) : (
															samplesToShow.map((sample, sampleIndex) => {
																// Calculate completed tests count
																const totalTests = sample?.analysis?.length || 0;
																const completedTests =
																	sample?.analysis?.filter(
																		(order) => order?.result_value !== null && order?.result_value !== '<p></p>',
																	)?.length || 0;

																// Get sample id or uid for lookup
																const sampleKey = sample.id || sample.sample_uid;

																// Get reports for this sample
																const reports = sample.report || [];

																return (
																	<tr
																		key={`${receipt.receipt_uid || receipt.id}-${
																			sample.sample_uid || sample.id
																		}-${sampleIndex}`}
																	>
																		{sampleIndex === 0 && (
																			<>
																				<td className="p-1 text-start align-top" rowSpan={samplesToShow.length}>
																					{/* Replace button with direct icon and conditional styling */}
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
																								className={` text-[#d5b31c] cursor-pointer`}
																								onClick={() => handleNoteClick(receipt)}
																								onMouseEnter={(e) => handleTooltipEnter(e, receipt)}
																								onMouseLeave={handleTooltipLeave}
																								title="Xem/Cập nhật ghi chú"
																							/>
																						) : (
																							<FaRegStickyNote
																								size={16}
																								className={` text-gray-500 hover:text-[#d5b31c] cursor-pointer opacity-50`}
																								onClick={() => handleNoteClick(receipt)}
																								title="Thêm ghi chú"
																							/>
																						)}
																					</div>
																					<div className="flex flex-col">
																						<p className="text-sm">
																							{!isTechnician()
																								? receipt.client?.client_name || '--'
																								: '[Thông tin bị ẩn]'}
																						</p>
																						<p className="text-xs text-gray-500">
																							{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
																							{getUserName(receipt.created_by_uid)}
																						</p>
																					</div>
																				</td>
																				<td className="p-1 text-start align-top" rowSpan={samplesToShow.length}>
																					{receipt.deadline ? formatDeadlineWithStyle(receipt.deadline, receipt) : '--'}
																				</td>
																			</>
																		)}
																		<td className="p-1 text-start align-top">
																			<NavLink
																				className="text-primary font-normal hover:text-[#103667]"
																				to={`/dashboard/sample?receipt_uid=${
																					receipt.receipt_uid || receipt.id
																				}&sample_uid=${sample.sample_uid || sample.id}`}
																			>
																				{sample.sample_uid || sample.id}
																			</NavLink>
																		</td>
																		<td className="p-1 text-start align-top">{displayValue(sample.sample_name)}</td>
																		<td className="p-1 text-start align-top">
																			{completedTests} / {totalTests}
																		</td>
																		{/* Show regular status when viewing current list */}
																		<td className="p-1 text-start align-top">
																			{status[sample.status] ? status[sample.status] : '--'}
																		</td>
																		<td className="p-1 text-start flex items-center space-x-2 align-top">
																			<select
																				className="p-1 border rounded flex-grow text-sm bg-white"
																				value={selectedReportIds[sampleKey] || ''}
																				onChange={(e) => handleReportSelection(sampleKey, e.target.value)}
																			>
																				{reports.length > 0 ? (
																					<>
																						{reports.map((report) => (
																							<option key={report.ppt_uid} value={report.ppt_uid}>
																								{report.ppt_uid}
																							</option>
																						))}
																					</>
																				) : (
																					<option value="">Chưa tạo PPT</option>
																				)}
																			</select>
																			<button
																				className="p-2 text-blue-500 hover:text-blue-700 focus:outline-none"
																				onClick={() => {
																					const url = `${window.location.origin}/report?sample_uid=${
																						sample.sample_uid || sample.id
																					}${
																						selectedReportIds[sampleKey]
																							? `&ppt_uid=${selectedReportIds[sampleKey]}`
																							: ''
																					}`;
																					window.open(url, '_blank');
																				}}
																				title="Xem báo cáo"
																			>
																				<FaExternalLinkAlt />
																			</button>
																		</td>
																	</tr>
																);
															})
														)}
													</React.Fragment>
												);
											})
										) : (
											<tr>
												<td colSpan="7" className="p-4 text-center text-gray-500">
													Không có dữ liệu để hiển thị
												</td>
											</tr>
										)
									) : // Show fetched preliminary data for specific filters
									preliminaryData[selectedPreliminaryType]?.length > 0 ? (
										preliminaryData[selectedPreliminaryType].map((receipt) => {
											const samplesToShow = receipt.samples || [];

											return (
												<React.Fragment key={receipt.receipt_uid || receipt.id}>
													{samplesToShow.length === 0 ? (
														<tr key={`empty-${receipt.receipt_uid || receipt.id}`}>
															<td className="p-1 text-start align-top">
																{/* Replace button with direct icon and conditional styling */}
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
																			className={` text-[#d5b31c] cursor-pointer`}
																			onClick={() => handleNoteClick(receipt)}
																			onMouseEnter={(e) => handleTooltipEnter(e, receipt)}
																			onMouseLeave={handleTooltipLeave}
																			title="Xem/Cập nhật ghi chú"
																		/>
																	) : (
																		<FaRegStickyNote
																			size={16}
																			className={` text-gray-500 hover:text-[#d5b31c] cursor-pointer opacity-50`}
																			onClick={() => handleNoteClick(receipt)}
																			title="Thêm ghi chú"
																		/>
																	)}
																</div>
																<div className="flex flex-col">
																	<p className="text-sm">
																		{!isTechnician() ? receipt.client?.client_name || '--' : '[Thông tin bị ẩn]'}
																	</p>
																	<p className="text-xs text-gray-500">
																		{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
																		{getUserName(receipt.created_by_uid)}
																	</p>
																</div>
															</td>
															<td className="p-1 text-start">
																{receipt.deadline ? formatDeadlineWithStyle(receipt.deadline, receipt) : '--'}
															</td>
															<td colSpan="5" className="p-1 text-center text-gray-500">
																Chưa có thông tin mẫu thử . . .
															</td>
														</tr>
													) : (
														samplesToShow.map((sample, sampleIndex) => {
															// Calculate completed tests count
															const totalTests = sample?.analysis?.length || 0;
															const completedTests =
																sample?.analysis?.filter(
																	(order) => order?.result_value !== null && order?.result_value !== '<p></p>',
																)?.length || 0;

															// Get sample id or uid for lookup
															const sampleKey = sample.id || sample.sample_uid;

															// Get reports for this sample
															const reports = sample.report || [];

															return (
																<tr
																	key={`${receipt.receipt_uid || receipt.id}-${
																		sample.sample_uid || sample.id
																	}-${sampleIndex}`}
																>
																	{sampleIndex === 0 && (
																		<>
																			<td className="p-1 text-start align-top" rowSpan={samplesToShow.length}>
																				{/* Replace button with direct icon and conditional styling */}
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
																							className={` text-[#d5b31c] cursor-pointer`}
																							onClick={() => handleNoteClick(receipt)}
																							onMouseEnter={(e) => handleTooltipEnter(e, receipt)}
																							onMouseLeave={handleTooltipLeave}
																							title="Xem/Cập nhật ghi chú"
																						/>
																					) : (
																						<FaRegStickyNote
																							size={16}
																							className={` text-gray-500 hover:text-[#d5b31c] cursor-pointer opacity-50`}
																							onClick={() => handleNoteClick(receipt)}
																							title="Thêm ghi chú"
																						/>
																					)}
																				</div>
																				<div className="flex flex-col">
																					<p className="text-sm">
																						{!isTechnician()
																							? receipt.client?.client_name || '--'
																							: '[Thông tin bị ẩn]'}
																					</p>
																					<p className="text-xs text-gray-500">
																						{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
																						{getUserName(receipt.created_by_uid)}
																					</p>
																				</div>
																			</td>
																			<td className="p-1 text-start align-top" rowSpan={samplesToShow.length}>
																				{receipt.deadline ? formatDeadlineWithStyle(receipt.deadline, receipt) : '--'}
																			</td>
																		</>
																	)}
																	<td className="p-1 text-start align-top">
																		<NavLink
																			className="text-primary font-normal hover:text-[#103667]"
																			to={`/dashboard/sample?receipt_uid=${
																				receipt.receipt_uid || receipt.id
																			}&sample_uid=${sample.sample_uid || sample.id}`}
																		>
																			{sample.sample_uid || sample.id}
																		</NavLink>
																	</td>
																	<td className="p-1 text-start align-top">{displayValue(sample.sample_name)}</td>
																	<td className="p-1 text-start align-top">
																		{completedTests} / {totalTests}
																	</td>
																	{/* Show status_ppt when viewing fetched preliminary data */}
																	<td className="p-1 text-start align-top">
																		{sample.status_ppt !== undefined && sample.status_ppt !== null
																			? sample.status_ppt
																			: '--'}
																	</td>
																	<td className="p-1 text-start flex items-center space-x-2 align-top">
																		<select
																			className="p-1 border rounded flex-grow text-sm bg-white"
																			value={selectedReportIds[sampleKey] || ''}
																			onChange={(e) => handleReportSelection(sampleKey, e.target.value)}
																		>
																			{reports.length > 0 ? (
																				<>
																					{reports.map((report) => (
																						<option key={report.ppt_uid} value={report.ppt_uid}>
																							{report.ppt_uid}
																						</option>
																					))}
																				</>
																			) : (
																				<option value="">Chưa tạo PPT</option>
																			)}
																		</select>
																		<button
																			className="p-2 text-blue-500 hover:text-blue-700 focus:outline-none"
																			onClick={() => {
																				const url = `${window.location.origin}/report?sample_uid=${
																					sample.sample_uid || sample.id
																				}${
																					selectedReportIds[sampleKey] ? `&ppt_uid=${selectedReportIds[sampleKey]}` : ''
																				}`;
																				window.open(url, '_blank');
																			}}
																			title="Xem báo cáo"
																		>
																			<FaExternalLinkAlt />
																		</button>
																	</td>
																</tr>
															);
														})
													)}
												</React.Fragment>
											);
										})
									) : (
										<tr>
											<td colSpan="7" className="p-4 text-center text-gray-500">
												Không có dữ liệu để hiển thị
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</>
				) : (
					<div className="overflow-x-auto px-1 py-2">
						<table className="w-full text-black ">
							{/* Normal view table head and body */}
							<thead>
								<tr className="border-b-2">
									<th className="p-1 border-b text-start  min-w-[300px]">Mã tiếp nhận mẫu</th>
									<th
										className="p-1 border-b text-start max-w-28 min-w-28 cursor-pointer hover:text-[#103667] underline text-blue-700
										"
										onClick={toggleDeadlineFormat}
									>
										Hạn trả KQ
									</th>
									<th className="p-1 border-b text-start w-36 min-w-36">Mã mẫu thử</th>

									{isPaymentActive ? (
										<th className="p-1 border-b text-start w-[25%] min-w-72">Thông tin mẫu thử</th>
									) : (
										<>
											<th className="p-1 border-b text-start w-full min-w-72">Thông tin mẫu thử</th>
											<th className="p-1 border-b text-start w-[10%] min-w-28">Số lượng</th>
											<th className="p-1 border-b text-start w-[6%] min-w-24">Mục đích</th>
											<th className="p-1 border-b text-start w-[6%] min-w-24">Trạng thái</th>
											<th className="p-1 border-b text-start w-[6%] min-w-24">Chỉ tiêu</th>
										</>
									)}

									{/* Display the payment information columns when showPaymentColumn is true */}
									{isPaymentActive && (
										<>
											<th className="p-1 border-b text-start min-w-32">Mã đơn hàng</th>
											<th className="p-1 border-b text-start min-w-32">Mã báo giá</th>
											<th className="p-1 border-b text-start min-w-32">Người ghi nhận</th>
											<th className="p-1 border-b text-start min-w-32">Doanh số</th>
											<th className="p-1 border-b text-start min-w-32">Số hồ sơ lưu</th>
										</>
									)}
								</tr>
							</thead>
							<tbody>
								{paginatedReceipts.map((receipt) => {
									const samplesToShow = receipt.samples;

									return (
										<React.Fragment key={receipt.receipt_uid}>
											{samplesToShow.length === 0 ? (
												<tr
													key={receipt.receipt_uid}
													className={`border-t border-b ${
														hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
													}`}
													onMouseEnter={() => handleReceiptMouseEnter(receipt.receipt_uid)}
													onMouseLeave={handleReceiptMouseLeave}
												>
													<td className="p-1 text-start align-top">
														{/* Replace button with direct icon and conditional styling */}
														<div className="flex justify-between items-center">
															<NavLink
																className="text-primary font-semibold hover:text-[#103667]"
																to={`/dashboard/receipt?receipt_uid=${receipt.receipt_uid}`}
															>
																{receipt.receipt_uid}
															</NavLink>
															{receipt?.note && receipt?.note?.trim() !== '' ? (
																<FaStickyNote
																	size={16}
																	className={` text-[#d5b31c] cursor-pointer`}
																	onClick={() => handleNoteClick(receipt)}
																	onMouseEnter={(e) => handleTooltipEnter(e, receipt)}
																	onMouseLeave={handleTooltipLeave}
																	title="Xem/Cập nhật ghi chú"
																/>
															) : (
																<FaRegStickyNote
																	size={16}
																	className={` text-gray-500 hover:text-[#d5b31c] cursor-pointer opacity-50`}
																	onClick={() => handleNoteClick(receipt)}
																	title="Thêm ghi chú"
																/>
															)}
														</div>
														<div className="flex flex-col">
															<p className="text-sm">
																{!isTechnician() ? receipt.client.client_name : '[Thông tin bị ẩn]'}
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

													<td colSpan={isPaymentActive ? '1' : '6'} className="p-1 text-center text-gray-500">
														Chưa có thông tin mẫu thử . . .
													</td>

													{/* Show sample information column when payment columns are visible */}
													{isPaymentActive && <td className="p-1 text-center text-gray-500">--</td>}

													{/* Display payment columns instead of a single one */}
													{isPaymentActive && (
														<>
															<td
																className="p-1 text-start cursor-pointer hover:bg-gray-100"
																onClick={() => handleFieldClick(receipt.id, null, 'order_code')}
															>
																{editingField.receiptId === receipt.id && editingField.field === 'order_code' ? (
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
																	<div className="w-full h-full p-1 py-0 rounded">{receipt.order_code || '--'}</div>
																)}
															</td>
															<td
																className="p-1 text-start cursor-pointer hover:bg-gray-100"
																onClick={() => handleFieldClick(receipt.id, null, 'quote_code')}
															>
																{editingField.receiptId === receipt.id && editingField.field === 'quote_code' ? (
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
																	<div className="w-full h-full p-1 py-0 rounded">{receipt.quote_code || '--'}</div>
																)}
															</td>
															<td
																className="p-1 text-start cursor-pointer hover:bg-gray-100"
																onClick={() => handleFieldClick(receipt.id, null, 'sale_recorder')}
															>
																{editingField.receiptId === receipt.id && editingField.field === 'sale_recorder' ? (
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
																	<div className="w-full h-full p-1 py-0 rounded">{receipt.sale_recorder || '--'}</div>
																)}
															</td>
															<td
																className="p-1 text-start cursor-pointer hover:bg-gray-100"
																onClick={() => handlePaymentConfirmation(receipt.id)}
															>
																<div
																	className={`w-full h-full p-1 rounded font-medium ${
																		receipt.pay_status === 1
																			? 'text-green-600'
																			: receipt.pay_status === 2
																			? 'text-black'
																			: 'text-gray-500'
																	}`}
																>
																	{receipt.total_amount ? `${receipt.total_amount.toLocaleString()} ₫` : '--'}
																</div>
															</td>
															<td
																className="p-1 text-start cursor-pointer hover:bg-gray-100"
																onClick={() => handleFieldClick(receipt.id, null, 'record_code')}
															>
																{editingField.receiptId === receipt.id && editingField.field === 'record_code' ? (
																	<input
																		type="text"
																		value={receipt.record_code || ''}
																		onChange={(e) => handleReceiptInputChange(e, receipt.id, 'record_code')}
																		onKeyDown={(e) =>
																			handleReceiptInputKeyDown(e, receipt.id, 'record_code', e.target.value)
																		}
																		onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																		className="p-1 border rounded-md w-full text-sm bg-white"
																		autoFocus
																	/>
																) : (
																	<div className="w-full h-full p-1 py-0 rounded">{receipt.record_code || '--'}</div>
																)}
															</td>
														</>
													)}
												</tr>
											) : (
												samplesToShow.map((sample, sampleIndex) => {
													// Add null check for sample.analysis
													const totalTests = sample?.analysis?.length || 0;
													const completedTests =
														sample?.analysis?.filter(
															(order) => order?.result_value !== null && order?.result_value !== '<p></p>',
														)?.length || 0;

													return (
														<tr
															key={`${receipt?.receipt_uid || 'unknown'}-${sample?.sample_uid || 'unknown'}`}
															className={` ${sampleIndex === 0 ? 'border-t' : ''} ${
																sampleIndex === samplesToShow.length - 1 ? 'border-b' : ''
															} ${
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
															{sampleIndex === 0 && (
																<>
																	<td
																		className={`p-1   text-start align-top ${
																			hoveredReceiptId === receipt?.receipt_uid ? 'bg-gray-50' : ''
																		}`}
																		rowSpan={samplesToShow.length}
																	>
																		{/* Replace button with direct icon and conditional styling */}
																		<div className="flex justify-between items-center">
																			<NavLink
																				className="font-semibold text-primary hover:text-[#103667]"
																				to={`/dashboard/receipt?receipt_uid=${receipt.receipt_uid}`}
																			>
																				{receipt.receipt_uid}
																			</NavLink>
																			{receipt?.note && receipt?.note?.trim() !== '' ? (
																				<FaStickyNote
																					size={16}
																					className={` text-[#d5b31c] cursor-pointer`}
																					onClick={() => handleNoteClick(receipt)}
																					onMouseEnter={(e) => handleTooltipEnter(e, receipt)}
																					onMouseLeave={handleTooltipLeave}
																					title="Xem/Cập nhật ghi chú"
																				/>
																			) : (
																				<FaRegStickyNote
																					size={16}
																					className={` text-gray-500 hover:text-[#d5b31c] cursor-pointer opacity-50`}
																					onClick={() => handleNoteClick(receipt)}
																					title="Thêm ghi chú"
																				/>
																			)}
																		</div>
																		<div className="flex flex-col">
																			<p className="text-sm">
																				{!isTechnician() ? receipt.client.client_name : '[Thông tin bị ẩn]'}
																			</p>
																			{receipt.record_code && !isTechnician() && (
																				<p className="text-xs text-slate-700">HSL: {receipt.record_code}</p>
																			)}
																			<p className="text-xs text-gray-500 mb-2">
																				{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
																				{getUserName(receipt.created_by_uid)}
																			</p>
																		</div>
																	</td>

																	{sampleIndex === 0 && (
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
																				<DatePicker
																					selected={receipt.deadline ? new Date(receipt.deadline) : null}
																					onChange={(date) => handleDeadlineChange(receipt.id, date)}
																					onBlur={() => handleDatePickerBlur(receipt.id, receipt.deadline)}
																					onFocus={() => handleDatePickerFocus(receipt.id, receipt.deadline)}
																					onChangeRaw={(e) => handleDateInputChange(receipt.id, e)}
																					onKeyDown={(e) => handleDeadlineKeyDown(e, receipt.id)}
																					dateFormat="dd/MM/yyyy"
																					className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
																					calendarClassName="text-black"
																					placeholderText="Chọn hạn trả"
																					autoFocus
																				/>
																			) : (
																				<div className="w-full h-full p-1 py-0 rounded">
																					{showRelativeTime
																						? formatDeadlineAsRelative(receipt.deadline, receipt)
																						: formatDeadlineWithStyle(receipt.deadline, receipt)}
																				</div>
																			)}
																		</td>
																	)}
																</>
															)}

															<td
																className="p-1 text-start align-top"
																onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
																onMouseLeave={handleSampleMouseLeave}
															>
																<NavLink
																	className="text-primary font-normal hover:text-[#103667]"
																	to={`/dashboard/sample?receipt_uid=${receipt.receipt_uid}&sample_uid=${sample.sample_uid}`}
																>
																	{sample.sample_uid}
																</NavLink>
															</td>

															{/* Conditionally show either sample information or purpose/status columns */}
															{isPaymentActive ? (
																<td
																	className="p-1 text-start align-top line-clamp-2"
																	onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
																	onMouseLeave={handleSampleMouseLeave}
																>
																	{displayValue(sample.sample_name)}
																</td>
															) : (
																<>
																	<td
																		className="p-1 text-start align-top line-clamp-2"
																		onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
																		onMouseLeave={handleSampleMouseLeave}
																	>
																		{displayValue(sample.sample_name)}
																	</td>
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
																				onChange={(e) =>
																					handleSelectChange(e, receipt.receipt_id, sample.id, 'purpose')
																				}
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

																	{/* Status column - always shown */}
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
																	<td
																		className="p-1 text-start align-top"
																		onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
																		onMouseLeave={handleSampleMouseLeave}
																	>
																		{completedTests} / {totalTests}
																	</td>
																</>
															)}

															{/* Show payment columns for the first sample in each receipt */}
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
																				onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
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

															{/* <td className="p-1 text-start">
																{receipt?.deadline ? (
																	isDeadlineToday(receipt.deadline) ? (
																		<span className="text-purple-600">{formatDate(receipt.deadline)}</span>
																	) : (
																		formatDate(receipt.deadline)
																	)
																) : (
																	<span className="text-start block">--</span>
																)}
															</td> */}
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
				)}

				{/* Pagination - show only for normal view */}
				{!isPreliminaryActive || (isPreliminaryActive && selectedPreliminaryType === 'current') ? (
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
				) : null}
			</div>
		</div>
	);
};

export default Dashboard;
