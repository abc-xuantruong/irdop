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
	const [showPendingFilter, setShowPendingFilter] = useState(false);

	// Add state for preliminary results view
	const [preliminaryData, setPreliminaryData] = useState({
		not_sent_preliminary: [],
		sent_preliminary: [],
		sent_report: [],
	});
	const [selectedPreliminaryType, setSelectedPreliminaryType] = useState('not_sent_preliminary');

	// Remove isEditMode state	// Add state to track which field is being edited
	const [editingField, setEditingField] = useState({ receiptId: null, sampleId: null, field: null }); // Add state to track which transaction field is being edited
	const [editingTransaction, setEditingTransaction] = useState({
		receiptId: null,
		transactionIndex: null,
		field: null,
	});

	// Add state to store original values for comparison
	const [originalValues, setOriginalValues] = useState({});

	// Add state for transaction modal
	const [showTransactionModal, setShowTransactionModal] = useState(false);
	const [transactionForm, setTransactionForm] = useState({
		receiptId: null,
		transactionDate: new Date(),
		transactionType: 'TK viện',
		amount: '',
		invoiceNumber: '',
	});
	const [transactionErrors, setTransactionErrors] = useState({}); // Add state variables for quick payment form functionality
	const [showQuickPaymentForm, setShowQuickPaymentForm] = useState(false);
	const [quickPaymentForm, setQuickPaymentForm] = useState({
		order_code: '',
		invoice_number: '', // Main invoice number for the payment
		sale_recorder: '', // Sales recorder field
		transactions: [
			{
				transactionDate: new Date(),
				transactionType: 'TK viện',
				amount: '',
				note: '', // Changed from invoiceNumber to note
			},
		],
	});
	const [quickPaymentErrors, setQuickPaymentErrors] = useState({});
	const [paymentsList, setPaymentsList] = useState([]);
	const [loadingPayments, setLoadingPayments] = useState(false);
	// Add state for user information
	const [userInfo, setUserInfo] = useState({});

	// Add state for shipment form
	const [showShipmentForm, setShowShipmentForm] = useState(false);
	const [selectedReceipt, setSelectedReceipt] = useState(null);

	const [showRelativeTime, setShowRelativeTime] = useState(true); // Toggle between date format and relative time
	const receiptsPerPage = 50;
	const [hoveredReceiptId, setHoveredReceiptId] = useState(null);
	const [hoveredSampleId, setHoveredSampleId] = useState(null);
	const [isFetch, setIsFetch] = useState(false);

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
	// Add state for sales recorder filtering
	const [salesRecorderFilter, setSalesRecorderFilter] = useState(null);
	const [showSalesRecorderDropdown, setShowSalesRecorderDropdown] = useState(false);
	const salesRecorderDropdownRef = useRef(null);

	// Function to open transaction modal

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

	const handleOpenTransactionModal = (receiptId) => {
		setTransactionForm({
			receiptId: receiptId,
			transactionDate: new Date(),
			transactionType: 'TK viện',
			amount: '',
			invoiceNumber: '',
		});
		setTransactionErrors({});
		setShowTransactionModal(true);
	};

	// Function to handle transaction form changes
	const handleTransactionFormChange = (field, value) => {
		setTransactionForm((prev) => ({
			...prev,
			[field]: value,
		}));

		// Clear error for this field when user makes changes
		if (transactionErrors[field]) {
			setTransactionErrors((prev) => ({
				...prev,
				[field]: null,
			}));
		}
	};

	// Function to validate transaction form
	const validateTransactionForm = () => {
		const errors = {};

		if (!transactionForm.transactionDate) {
			errors.transactionDate = 'Vui lòng chọn ngày thanh toán';
		}

		if (!transactionForm.transactionType) {
			errors.transactionType = 'Vui lòng chọn hình thức thanh toán';
		}

		if (!transactionForm.amount || transactionForm.amount <= 0) {
			errors.amount = 'Vui lòng nhập số tiền hợp lệ';
		}

		return errors;
	}; // Function to handle transaction form submission
	const handleTransactionFormSubmit = async () => {
		const errors = validateTransactionForm();

		if (Object.keys(errors).length > 0) {
			setTransactionErrors(errors);
			return;
		}

		try {
			// Find the receipt to get current transactions
			const receipt = currentList.find((r) => r.id === transactionForm.receiptId);
			if (!receipt) return; // Create new transaction
			const newTransaction = {
				transactionDate: transactionForm.transactionDate,
				transactionType: transactionForm.transactionType,
				amount: Number(transactionForm.amount),
				invoiceNumber: transactionForm.invoiceNumber || '',
			};

			// Add to transactions array
			const updatedTransactions = [...(receipt.transactions || []), newTransaction]; // Update via API
			const payload = {
				receipt: {
					id: transactionForm.receiptId,
					receipt_uid: getReceiptUidById(transactionForm.receiptId),
					transactions: updatedTransactions,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				showToast('Thêm giao dịch thành công!');
				fetchReceipt(); // Refresh data
				setShowTransactionModal(false);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi thêm giao dịch',
				});
			}
		} catch (error) {
			console.error('Error adding transaction:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi thêm giao dịch',
			});
		}
	};
	// Function to fetch all payments
	const fetchAllPayments = async () => {
		setLoadingPayments(true);
		try {
			const response = await apiGet('https://black.irdop.org/temporary/get/all_payment');

			if (response.status === 200) {
				setPaymentsList(response.data || []);
			} else {
				console.error('Error fetching payments:', response.data?.message);
				setPaymentsList([]);
			}
		} catch (error) {
			console.error('Error fetching payments:', error);
			setPaymentsList([]);
		} finally {
			setLoadingPayments(false);
		}
	};

	// Function to handle quick payment form changes
	const handleQuickPaymentFormChange = (field, value) => {
		setQuickPaymentForm((prev) => ({
			...prev,
			[field]: value,
		}));

		// Clear error for this field when user makes changes
		if (quickPaymentErrors[field]) {
			setQuickPaymentErrors((prev) => ({
				...prev,
				[field]: null,
			}));
		}
	};
	// Function to handle quick payment transaction changes
	const handleQuickPaymentTransactionChange = (index, field, value) => {
		setQuickPaymentForm((prev) => ({
			...prev,
			transactions: prev.transactions.map((transaction, i) =>
				i === index ? { ...transaction, [field]: value } : transaction,
			),
		}));

		// Clear transaction errors for this field
		if (quickPaymentErrors[`transaction_${index}_${field}`]) {
			setQuickPaymentErrors((prev) => ({
				...prev,
				[`transaction_${index}_${field}`]: null,
			}));
		}
	};
	// Function to add new transaction to quick payment form
	const addQuickPaymentTransaction = () => {
		setQuickPaymentForm((prev) => ({
			...prev,
			transactions: [
				...prev.transactions,
				{
					transactionDate: new Date(),
					transactionType: 'TK viện',
					amount: '',
					note: '',
				},
			],
		}));
	};

	// Function to remove transaction from quick payment form
	const removeQuickPaymentTransaction = (index) => {
		if (quickPaymentForm.transactions.length > 1) {
			setQuickPaymentForm((prev) => ({
				...prev,
				transactions: prev.transactions.filter((_, i) => i !== index),
			}));
		}
	};
	// Function to validate quick payment form
	const validateQuickPaymentForm = () => {
		const errors = {};

		if (!quickPaymentForm.order_code || quickPaymentForm.order_code.trim() === '') {
			errors.order_code = 'Vui lòng nhập mã đơn hàng';
		}

		// Validate each transaction
		quickPaymentForm.transactions.forEach((transaction, index) => {
			if (!transaction.transactionDate) {
				errors[`transaction_${index}_transactionDate`] = 'Vui lòng chọn ngày thanh toán';
			}

			if (!transaction.transactionType) {
				errors[`transaction_${index}_transactionType`] = 'Vui lòng chọn hình thức thanh toán';
			}

			if (!transaction.amount || transaction.amount <= 0) {
				errors[`transaction_${index}_amount`] = 'Vui lòng nhập số tiền hợp lệ';
			}
		});

		return errors;
	};
	// Function to handle quick payment form submission
	const handleQuickPaymentFormSubmit = async () => {
		const errors = validateQuickPaymentForm();

		if (Object.keys(errors).length > 0) {
			setQuickPaymentErrors(errors);
			return;
		}
		try {
			// Format transactions for API
			const formattedTransactions = quickPaymentForm.transactions.map((transaction) => ({
				transactionDate:
					transaction.transactionDate instanceof Date
						? transaction.transactionDate.toISOString().split('T')[0]
						: transaction.transactionDate,
				transactionType: transaction.transactionType,
				amount: Number(transaction.amount),
				note: transaction.note || '',
			})); // Prepare payload
			const payload = {
				payment: {
					order_code: quickPaymentForm.order_code,
					invoice_number: quickPaymentForm.invoice_number,
					transactions: formattedTransactions,
				},
			};

			// Add sale_recorder only if it's not empty
			if (quickPaymentForm.sale_recorder && quickPaymentForm.sale_recorder.trim() !== '') {
				payload.payment.sale_recorder = quickPaymentForm.sale_recorder.trim();
			}

			const response = await apiPost('https://black.irdop.org/temporary/create/payment', payload);

			if (response.status === 200) {
				showToast('Tạo thanh toán nhanh thành công!');
				setShowQuickPaymentForm(false); // Close form				// Reset form
				setQuickPaymentForm({
					order_code: '',
					invoice_number: '',
					sale_recorder: '',
					transactions: [
						{
							transactionDate: new Date(),
							transactionType: 'TK viện',
							amount: '',
							note: '',
						},
					],
				});
				setQuickPaymentErrors({});
				// Optionally refresh the receipt list
				fetchReceipt();
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi tạo thanh toán nhanh',
				});
			}
		} catch (error) {
			console.error('Error creating quick payment:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi tạo thanh toán nhanh',
			});
		}
	};
	// Add function to handle transaction field update
	const handleTransactionChange = async (receiptId, transactionIndex, field, newValue) => {
		// Prevent technicians from updating transaction data
		if (isTechnician()) {
			showToast('Bạn không có quyền cập nhật thông tin thanh toán', 'error');
			return;
		}

		try {
			// Find the receipt to get current transactions
			const receipt = currentList.find((r) => r.id === receiptId);
			if (!receipt) return;

			// Create a copy of transactions array
			let updatedTransactions = [...(receipt.transactions || [])];

			// If transaction index doesn't exist, create new transaction
			if (transactionIndex >= updatedTransactions.length) {
				updatedTransactions[transactionIndex] = {
					transactionDate: null,
					transactionType: 'TK viện',
					amount: null,
				};
			}

			// Update the specific field
			updatedTransactions[transactionIndex] = {
				...updatedTransactions[transactionIndex],
				[field]: newValue,
			};

			// Format date if it's a date field
			if (field === 'transactionDate' && newValue) {
				const adjustedDate = new Date(newValue);
				adjustedDate.setHours(adjustedDate.getHours() + 7);
				updatedTransactions[transactionIndex].transactionDate = adjustedDate.toISOString().split('T')[0];
			}

			const payload = {
				receipt: {
					id: receiptId,
					receipt_uid: getReceiptUidById(receiptId),
					transactions: updatedTransactions,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				showToast('Cập nhật thông tin giao dịch thành công!');
				fetchReceipt(); // Fetch new data to update the list
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật thông tin giao dịch',
				});
			}
		} catch (error) {
			console.error('Error updating transaction:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin giao dịch',
			});
		} finally {
			setEditingTransaction({ receiptId: null, transactionIndex: null, field: null });
		}
	};

	// Handle transaction input change for local state update
	const handleTransactionInputChange = (e, receiptId, transactionIndex, field) => {
		const { value } = e.target;

		// Update the transaction directly in the current list to reflect changes immediately
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					const updatedTransactions = [...(receipt.transactions || [])];

					// If transaction index doesn't exist, create new transaction
					if (transactionIndex >= updatedTransactions.length) {
						updatedTransactions[transactionIndex] = {
							transactionDate: null,
							transactionType: 'TK viện',
							amount: null,
						};
					}

					updatedTransactions[transactionIndex] = {
						...updatedTransactions[transactionIndex],
						[field]: value,
					};

					return { ...receipt, transactions: updatedTransactions };
				}
				return receipt;
			});
		});
	};

	// Handle transaction key down event
	const handleTransactionKeyDown = (e, receiptId, transactionIndex, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleTransactionChange(receiptId, transactionIndex, field, value);
		} else if (e.key === 'Escape') {
			setEditingTransaction({ receiptId: null, transactionIndex: null, field: null });
		}
	};

	// Handle transaction select change
	const handleTransactionSelectChange = (e, receiptId, transactionIndex, field) => {
		const newValue = e.target.value;
		handleTransactionChange(receiptId, transactionIndex, field, newValue);
	};

	// Handle transaction date change
	const handleTransactionDateChange = (receiptId, transactionIndex, date) => {
		// Update the date in the UI
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					const updatedTransactions = [...(receipt.transactions || [])];

					if (transactionIndex >= updatedTransactions.length) {
						updatedTransactions[transactionIndex] = {
							transactionDate: null,
							transactionType: 'TK viện',
							amount: null,
						};
					}

					updatedTransactions[transactionIndex] = {
						...updatedTransactions[transactionIndex],
						transactionDate: date,
					};

					return { ...receipt, transactions: updatedTransactions };
				}
				return receipt;
			});
		});
		setEditingTransaction({ receiptId: null, transactionIndex: null, field: null });

		// If we have a valid date, trigger the API update
		if (date) {
			handleTransactionChange(receiptId, transactionIndex, 'transactionDate', date);
		}
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
	const [isClearing, setIsClearing] = useState(false);
	const searchExecutedRef = useRef(false);
	const handleClearSearch = async () => {
		// Set flag to prevent useEffects from interfering
		setIsClearing(true);
		// Reset search ref
		searchExecutedRef.current = false;

		// Reset search term
		setSearchTerm('');
		// Reset all filters and states
		setIsFilter(false);
		setShowTodayDeadlines(false);
		setShowOverdueFilter(false);
		// Keep current viewMode instead of resetting to 'normal'

		// Always navigate to the clean path without query parameters
		// This will remove any search parameters from the URL
		navigate(location.pathname);

		// Fetch fresh data and ensure both lists are updated
		try {
			const response = await apiGet('https://black.irdop.org/khsi19me/db/get/recent_receipt');
			if (response.status === 200) {
				setOriginalList(response.data);
				setCurrentList(response.data);
			}
		} catch (error) {
			console.error('Error fetching receipts:', error);
		} finally {
			// Reset flag after clearing is complete
			setIsClearing(false);
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
					receipt_uid: getReceiptUidById(receiptId), // Helper function to get receipt_uid by id
					deadline: formattedDate,
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
					receipt_uid: getReceiptUidById(receiptId),
					draft_send_at: formattedDate,
					ppt_send_by: currentUser?.identity_uid, // Still need to set the sender
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
					receipt_uid: getReceiptUidById(receiptId),
					ppt_send_at: formattedDate,
					ppt_send_by: currentUser?.identity_uid, // Still need to set the sender
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
					// Handle case where API returns empty array or no data
					setCurrentList([]);
					setIsFilter(true);
					setCurrentPage(1);

					showToast('Không tìm thấy tiếp nhận nào trong khoảng thời gian này', 'info');

					// Update filter info for empty result
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

	const filterPendingReceipts = () => {
		const filteredReceipts = currentList.filter((receipt) => {
			if (!receipt.samples || receipt.samples.length === 0) return false;

			return receipt.samples.some((sample) => {
				// Check if tests are completed
				const totalTests = sample?.analysis?.length || 0;
				const completedTests =
					sample?.analysis?.filter(
						(order) => order?.result_value !== null && order?.result_value !== '<p></p>' && order?.result_value !== '',
					)?.length || 0;

				if (totalTests === 0 || totalTests !== completedTests) return false;

				// Check if report has no non-DRAFT ppt_uid
				const reports = sample.report || [];
				const hasNonDraftPPT = reports.some((report) => report.ppt_uid && report.ppt_uid !== 'DRAFT');

				return !hasNonDraftPPT;
			});
		});

		setCurrentList(filteredReceipts);
		setIsFilter(true);
		setCurrentPage(1);
		showToast(`Hiển thị ${filteredReceipts.length} tiếp nhận có mẫu hoàn thành chờ PPT`, 'info');
	};

	const togglePendingFilter = () => {
		if (showPendingFilter) {
			// Turn off pending filter
			setShowPendingFilter(false);
			if (!searchTerm) {
				setCurrentList(originalList);
				setIsFilter(false);
			}
		} else {
			// Turn on pending filter
			setShowPendingFilter(true);
			// Turn off other filters if active
			if (showTodayDeadlines) {
				setShowTodayDeadlines(false);
				setShowDateRangePicker(false);
				setIsCalendarOpen(false);
			}
			if (showOverdueFilter) {
				setShowOverdueFilter(false);
			}
			filterPendingReceipts();
		}
	};

	// Add function to fetch overdue receipts
	const fetchOverdueReceipts = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/khsi19me/db/get/receipt/overdue');

			if (response.status === 200) {
				if (response.data && Array.isArray(response.data)) {
					// Update the current list with overdue data
					setCurrentList(response.data);
					setIsFilter(true);
					setCurrentPage(1); // Reset to first page

					// Reset search term
					setSearchTerm('');

					// Show toast with count
					showToast(`Hiển thị ${response.data.length} tiếp nhận đã quá hạn`, 'info');
				} else {
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

	// Add function to toggle overdue filter
	const toggleOverdueFilter = () => {
		if (showOverdueFilter) {
			// If currently showing overdue, reset to normal view
			setShowOverdueFilter(false);
			if (!searchTerm) {
				setCurrentList(originalList);
				setIsFilter(false);
			}
		} else {
			// Turn on overdue filter
			setShowOverdueFilter(true);
			// Turn off deadline filter if active
			if (showTodayDeadlines) {
				setShowTodayDeadlines(false);
				setShowDateRangePicker(false);
				setIsCalendarOpen(false);
			}
			// Fetch overdue data
			fetchOverdueReceipts();
		}
	};
	// Handle status filter application
	const handleStatusFilter = (statusIndex) => {
		// If clicking the same status filter that's already active, clear the filter
		if (statusFilter === statusIndex) {
			setStatusFilter(null);
			// Reset to original list or maintain other filters
			if (viewMode === 'preliminary') {
				// For preliminary view, restore original preliminary data without calling API
				// Reset to the original preliminary data state
				if (searchTerm || filterInfo.isFilterActive) {
					// Re-apply existing filters using existing data
					if (searchTerm) {
						const queryParams = new URLSearchParams(location.search);
						const searchParam = queryParams.get('search');
						if (searchParam) {
							// Re-search with existing term in preliminary data
							const sourceData = [...preliminaryData[selectedPreliminaryType]];
							const filtered = sourceData.filter(
								(receipt) =>
									(receipt.receipt_uid || '').includes(searchParam) ||
									(receipt.client?.client_name || '').toLowerCase().includes(searchParam.toLowerCase()) ||
									receipt.samples?.some(
										(sample) =>
											(sample.sample_uid || '').includes(searchParam) ||
											(sample.sample_name || '').toLowerCase().includes(searchParam.toLowerCase()),
									),
							);
							const newPreliminaryData = {
								...preliminaryData,
								[selectedPreliminaryType]: filtered,
							};
							setPreliminaryData(newPreliminaryData);
						}
					}
					showToast('Đã hủy lọc trạng thái', 'info');
				} else {
					// Just clear the filter, keep current data
					showToast('Đã hủy lọc trạng thái', 'info');
				}
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
	const fetchReceipt = async () => {
		console.log('fetchReceipt called');
		console.trace('fetchReceipt call stack'); // This will show us where it was called from
		try {
			const response = await apiGet('https://black.irdop.org/khsi19me/db/get/recent_receipt');
			if (response.status === 200) {
				console.log('fetchReceipt success, data length:', response.data.length);
				// Store the original fetched data
				setOriginalList(response.data);
				// If there's no active filter, update the current list as well
				if (!isFilter) {
					console.log('No filter active, updating current list too');
					setCurrentList(response.data);

					// Turn off deadline filter when refreshing data
					if (showTodayDeadlines) {
						setShowTodayDeadlines(false);
					}
				} else {
					console.log('Filter is active, keeping current list unchanged');
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
	const fetchSearchResults = async (query) => {
		try {
			const response = await apiPost('https://black.irdop.org/khsi19me/db/search/receipt', {
				query: query,
			});
			if (response.status === 200) {
				// Store search results in current list
				setCurrentList(response.data);
				setIsFilter(true);

				// Also store in originalList if we don't have original data yet
				if (originalList.length === 0) {
					setOriginalList(response.data);
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
	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const searchParam = queryParams.get('search');

		if (!isFetch) {
			if (!searchParam) {
				// Only fetch all receipts if there's no search param
				// If there is a search param, let the other useEffect handle it
				fetchReceipt();
			}
			setIsFetch(true);
		}
	}, []); // Handle search term from URL on component mount and URL changes
	useEffect(() => {
		// Don't run if we're in the middle of clearing search
		if (isClearing) return;

		const queryParams = new URLSearchParams(location.search);
		const searchParam = queryParams.get('search');

		// Only set searchTerm if it's different from current value
		if (searchParam && searchParam !== searchTerm) {
			setSearchTerm(searchParam);
		} else if (!searchParam && searchTerm) {
			// Clear searchTerm if no search param in URL but we have searchTerm
			setSearchTerm('');
		}
	}, [location.search, isClearing]); // Add useEffect to handle search term changes - chỉ gọi API một lần ở đây
	useEffect(() => {
		// Don't run if we're in the middle of clearing search
		if (isClearing) return;

		if (searchTerm) {
			// Only call API if we haven't already searched for this term
			if (!searchExecutedRef.current) {
				searchExecutedRef.current = true;
				fetchSearchResults(searchTerm);
				// Reset flag after a short delay
				setTimeout(() => {
					searchExecutedRef.current = false;
				}, 1000);
			}
		} else if (!searchTerm && isFilter) {
			// If search term is cleared, reset to original data
			setCurrentList(originalList);
			setIsFilter(false);
		}
	}, [searchTerm, isClearing]);
	useEffect(() => {
		const intervalId = setInterval(() => {
			// Always fetch data to update originalList
			// The currentList will only be updated if no filter is active
			// Only fetch if we're not actively filtering to avoid disrupting user's filtering experience
			if (
				!isFilter &&
				!searchTerm &&
				!salesRecorderFilter &&
				!statusFilter &&
				!recordCodeSort &&
				!requestNumberSort &&
				!paymentStatusFilter
			) {
				fetchReceipt();
			}
		}, 60000); // Fetch every 60 seconds

		return () => clearInterval(intervalId); // Cleanup interval on component unmount or when filtering state changes
	}, [isFilter, searchTerm, salesRecorderFilter, statusFilter, recordCodeSort, requestNumberSort, paymentStatusFilter]); // Re-run effect when any filter state changes

	const handlePageChange = (pageNumber) => {
		setCurrentPage(pageNumber);
	};

	const paginatedReceipts = currentList.slice((currentPage - 1) * receiptsPerPage, currentPage * receiptsPerPage);

	const handleReceiptMouseEnter = (receiptId) => {
		// Don't update state if we're editing a date
		if (editingField.field === 'deadline') return;
		setHoveredReceiptId(receiptId);
	}; // Handle sales recorder filter selection
	const handleSalesRecorderFilter = (recorder) => {
		console.log('handleSalesRecorderFilter called with:', recorder);
		console.log('Current state - salesRecorderFilter:', salesRecorderFilter);
		console.log('Current state - searchTerm:', searchTerm);
		console.log('Current state - filterInfo.isFilterActive:', filterInfo.isFilterActive);

		// If clicking the same filter that's already active, clear the filter
		if (salesRecorderFilter === recorder) {
			console.log('Clearing sales recorder filter...');
			setSalesRecorderFilter(null);

			// Reset to original list or maintain other filters without calling API
			if (searchTerm || filterInfo.isFilterActive) {
				console.log('Re-applying existing filters using existing data...');
				// Re-apply existing filters using existing data
				if (searchTerm) {
					const queryParams = new URLSearchParams(location.search);
					const searchParam = queryParams.get('search');
					if (searchParam) {
						console.log('Re-applying search filter for:', searchParam);
						// Re-search with existing term using originalList
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
					console.log('Re-applying date filter using existing data...');
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
					console.log('Setting to original list...');
					setCurrentList(originalList);
				}
			} else {
				console.log('No filters active, restoring original list...');
				// No filters active, just restore original list
				setCurrentList(originalList);
			}
			showToast('Đã hủy lọc người ghi nhận', 'info');
		} else {
			console.log('Applying new sales recorder filter:', recorder);
			// Apply the new sales recorder filter
			setSalesRecorderFilter(recorder);

			// Filter current list based on sales recorder
			const filteredList = [...currentList].filter((receipt) => receipt.sale_recorder === recorder);
			console.log('Filtered list length:', filteredList.length);
			setCurrentList(filteredList);

			showToast(`Hiển thị ${filteredList.length} tiếp nhận có người ghi nhận là "${recorder}"`, 'info');
		}
		// Close the dropdown after selection
		setShowSalesRecorderDropdown(false);
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
					sample_uid: getSampleUidById(sampleId), // Helper function to get sample_uid by id
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
					receipt_uid: getReceiptUidById(receiptId),
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
					receipt_uid: getReceiptUidById(receiptId),
					[field]: newValue,
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
	// New function to check if all samples in a receipt are completed (status >= 4)
	const areAllSamplesCompleted = (receipt) => {
		// If there are no samples, return false
		if (!receipt.samples || receipt.samples.length === 0) return false;

		// Check if all samples have status >= 4 (Hoàn thành)
		return receipt.samples.every((sample) => sample.status >= 4);
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
	}; // Add function to handle note icon click
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
						receipt_uid: getReceiptUidById(receiptId),
						transactions: updatedTransactions,
					},
				};

				const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

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
					receipt_uid: getReceiptUidById(receiptId),
					note: noteContent,
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

			// Reset to original list or maintain other filters without calling API
			if (searchTerm || filterInfo.isFilterActive) {
				// Re-apply existing filters using existing data
				if (searchTerm) {
					const queryParams = new URLSearchParams(location.search);
					const searchParam = queryParams.get('search');
					if (searchParam) {
						// Re-search with existing term using originalList
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
					const searchParam = queryParams.get('search');
					if (searchParam) {
						// Re-search with existing term using originalList
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
			// Reset to original list or maintain other filters without calling API
			if (searchTerm || filterInfo.isFilterActive) {
				// Re-apply existing filters using existing data
				if (searchTerm) {
					const queryParams = new URLSearchParams(location.search);
					const searchParam = queryParams.get('search');
					if (searchParam) {
						// Re-search with existing term using originalList
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
				if (salesRecorderDropdownRef.current && !salesRecorderDropdownRef.current.contains(event.target)) {
					setShowSalesRecorderDropdown(false);
				}
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
				const today = new Date();
				handlePptSendChangeAPI(receiptId, today);

				// Update local state immediately for better UI feedback
				setCurrentList((prevList) => {
					return prevList.map((receipt) => {
						if (receipt.id === receiptId) {
							return { ...receipt, ppt_send_at: today, ppt_send_by: currentUser?.identity_uid };
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
			.filter((receipt) => receipt.sale_recorder) // Only include receipts with a sales recorder
			.map((receipt) => receipt.sale_recorder);

		// Get unique values and sort them alphabetically
		return [...new Set(recorders)].sort((a, b) => a.localeCompare(b));
	};

	// Helper functions to get receipt_uid and sample_uid by ID
	const getReceiptUidById = (receiptId) => {
		const receipt = currentList.find((r) => r.id === receiptId);
		return receipt?.receipt_uid || '';
	};

	const getSampleUidById = (sampleId) => {
		let sampleUid = '';
		currentList.forEach((receipt) => {
			if (receipt.samples) {
				const sample = receipt.samples.find((s) => s.id === sampleId);
				if (sample) {
					sampleUid = sample.sample_uid || '';
				}
			}
		});
		return sampleUid;
	};

	// Render transaction modal
	const renderTransactionModal = () => {
		if (!showTransactionModal) return null;

		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
				<div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold text-gray-800">Thêm giao dịch</h2>
						<button
							onClick={() => setShowTransactionModal(false)}
							className="text-gray-500 hover:text-gray-700 text-xl"
						>
							<FaTimes />
						</button>
					</div>

					<div className="space-y-4">
						{/* Ngày thanh toán */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Ngày thanh toán <span className="text-red-500">*</span>
							</label>
							<DatePicker
								selected={transactionForm.transactionDate}
								onChange={(date) => handleTransactionFormChange('transactionDate', date)}
								dateFormat="dd/MM/yyyy"
								className={`w-full p-2 border rounded-md text-sm bg-white ${
									transactionErrors.transactionDate ? 'border-red-500' : 'border-gray-300'
								}`}
								placeholderText="Chọn ngày thanh toán"
								calendarStartDay={1}
							/>
							{transactionErrors.transactionDate && (
								<p className="text-red-500 text-xs mt-1">{transactionErrors.transactionDate}</p>
							)}
						</div>

						{/* Hình thức thanh toán */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Hình thức thanh toán <span className="text-red-500">*</span>
							</label>
							<select
								value={transactionForm.transactionType}
								onChange={(e) => handleTransactionFormChange('transactionType', e.target.value)}
								className={`w-full p-2 border rounded-md text-sm bg-white ${
									transactionErrors.transactionType ? 'border-red-500' : 'border-gray-300'
								}`}
							>
								<option value="TK viện">TK viện</option>
								<option value="TK cá nhân">TK cá nhân</option>
								<option value="Tiền mặt">Tiền mặt</option>
								<option value="Hoàn trả">Hoàn trả</option>
							</select>
							{transactionErrors.transactionType && (
								<p className="text-red-500 text-xs mt-1">{transactionErrors.transactionType}</p>
							)}
						</div>

						{/* Số tiền thanh toán */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Số tiền thanh toán <span className="text-red-500">*</span>
							</label>
							<input
								type="number"
								value={transactionForm.amount}
								onChange={(e) => handleTransactionFormChange('amount', e.target.value)}
								className={`w-full p-2 border rounded-md text-sm bg-white ${
									transactionErrors.amount ? 'border-red-500' : 'border-gray-300'
								}`}
								placeholder="Nhập số tiền (VNĐ)"
								min="0"
								step="1000"
							/>{' '}
							{transactionErrors.amount && <p className="text-red-500 text-xs mt-1">{transactionErrors.amount}</p>}
							{transactionForm.amount && !transactionErrors.amount && (
								<p className="text-gray-600 text-xs mt-1">
									{Number(transactionForm.amount).toLocaleString('vi-VN')} VNĐ
								</p>
							)}
						</div>

						{/* Số hóa đơn */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Số hóa đơn</label>
							<input
								type="text"
								value={transactionForm.invoiceNumber}
								onChange={(e) => handleTransactionFormChange('invoiceNumber', e.target.value)}
								className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
								placeholder="Nhập số hóa đơn (tùy chọn)"
							/>
						</div>
					</div>

					{/* Action buttons */}
					<div className="flex justify-end space-x-3 mt-6">
						<button
							onClick={() => setShowTransactionModal(false)}
							className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
						>
							Hủy
						</button>
						<button
							onClick={handleTransactionFormSubmit}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
						>
							<FaMoneyBillWave className="mr-2" />
							Xác nhận
						</button>
					</div>
				</div>
			</div>
		);
	}; // Render quick payment form
	const renderQuickPaymentForm = () => {
		if (!showQuickPaymentForm) return null;

		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
				<div className="bg-white p-6 rounded-lg shadow-lg max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold text-gray-800">Thanh toán nhanh</h2>
						<button
							onClick={() => setShowQuickPaymentForm(false)}
							className="text-gray-500 hover:text-gray-700 text-xl"
						>
							<FaTimes />
						</button>
					</div>{' '}
					<div className="space-y-4">
						{/* Payment Information Row - All fields in one row */}
						<div className="flex gap-2">
							{/* Mã đơn hàng */}
							<div className="w-1/6">
								<label className="block  text-sm font-medium text-gray-700 mb-1">
									Mã đơn hàng <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={quickPaymentForm.order_code}
									onChange={(e) => handleQuickPaymentFormChange('order_code', e.target.value)}
									className={`w-full p-2 border rounded-md text-sm bg-white ${
										quickPaymentErrors.order_code ? 'border-red-500' : 'border-gray-300'
									}`}
									placeholder="Nhập mã đơn hàng"
								/>
								{quickPaymentErrors.order_code && (
									<p className="text-red-500 text-xs mt-1">{quickPaymentErrors.order_code}</p>
								)}
							</div>

							{/* Số hóa đơn chính */}
							<div className="w-1/6">
								<label className="block text-sm font-medium text-gray-700 mb-1">Số hóa đơn</label>
								<input
									type="text"
									value={quickPaymentForm.invoice_number}
									onChange={(e) => handleQuickPaymentFormChange('invoice_number', e.target.value)}
									className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
									placeholder="Nhập số hóa đơn"
								/>
							</div>

							{/* Ghi nhận doanh số */}
							<div className="w-1/5">
								<label className="block text-sm font-medium text-gray-700 mb-1">Ghi nhận DS</label>
								<input
									type="text"
									value={quickPaymentForm.sale_recorder}
									onChange={(e) => handleQuickPaymentFormChange('sale_recorder', e.target.value)}
									className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
									placeholder="Người ghi nhận"
								/>
							</div>

							{/* Transaction Information - All fields in one row */}
							<div className="flex-1">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Thông tin giao dịch <span className="text-red-500">*</span>
								</label>
								<div className="space-y-2 ">
									{quickPaymentForm.transactions.map((transaction, index) => (
										<div key={index} className="border border-gray-200 rounded-md p-3 bg-gray-50 flex">
											<div className="flex justify-between items-center">
												<span className="text-sm font-medium text-gray-700 w-20">Giao dịch {index + 1}</span>
												{quickPaymentForm.transactions.length > 1 && (
													<button
														onClick={() => removeQuickPaymentTransaction(index)}
														className="text-red-500 hover:text-red-700 text-sm"
														type="button"
													>
														<FaTimes />
													</button>
												)}
											</div>

											{/* All transaction fields in one row */}
											<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
												{/* Ngày thanh toán */}
												<div>
													<label className="block text-xs font-medium text-gray-600 mb-1">
														Ngày TT <span className="text-red-500">*</span>
													</label>
													<DatePicker
														selected={transaction.transactionDate}
														onChange={(date) => handleQuickPaymentTransactionChange(index, 'transactionDate', date)}
														dateFormat="dd/MM/yyyy"
														className={`w-full p-2 border rounded-md text-sm bg-white ${
															quickPaymentErrors[`transaction_${index}_transactionDate`]
																? 'border-red-500'
																: 'border-gray-300'
														}`}
														placeholderText="Chọn ngày"
														calendarStartDay={1}
													/>
													{quickPaymentErrors[`transaction_${index}_transactionDate`] && (
														<p className="text-red-500 text-xs mt-1">
															{quickPaymentErrors[`transaction_${index}_transactionDate`]}
														</p>
													)}
												</div>

												{/* Hình thức thanh toán */}
												<div>
													<label className="block text-xs font-medium text-gray-600 mb-1">
														Hình thức TT <span className="text-red-500">*</span>
													</label>
													<select
														value={transaction.transactionType}
														onChange={(e) =>
															handleQuickPaymentTransactionChange(index, 'transactionType', e.target.value)
														}
														className={`w-full p-2 border rounded-md text-sm bg-white ${
															quickPaymentErrors[`transaction_${index}_transactionType`]
																? 'border-red-500'
																: 'border-gray-300'
														}`}
													>
														<option value="TK viện">TK viện</option>
														<option value="TK cá nhân">TK cá nhân</option>
														<option value="Tiền mặt">Tiền mặt</option>
														<option value="Hoàn trả">Hoàn trả</option>
													</select>
													{quickPaymentErrors[`transaction_${index}_transactionType`] && (
														<p className="text-red-500 text-xs mt-1">
															{quickPaymentErrors[`transaction_${index}_transactionType`]}
														</p>
													)}
												</div>

												{/* Số tiền thanh toán */}
												<div>
													<label className="block text-xs font-medium text-gray-600 mb-1">
														Số tiền <span className="text-red-500">*</span>
													</label>
													<input
														type="number"
														value={transaction.amount}
														onChange={(e) => handleQuickPaymentTransactionChange(index, 'amount', e.target.value)}
														className={`w-full p-2 border rounded-md text-sm bg-white ${
															quickPaymentErrors[`transaction_${index}_amount`] ? 'border-red-500' : 'border-gray-300'
														}`}
														placeholder="Số tiền (VNĐ)"
														min="0"
														step="1000"
													/>
													{quickPaymentErrors[`transaction_${index}_amount`] && (
														<p className="text-red-500 text-xs mt-1">
															{quickPaymentErrors[`transaction_${index}_amount`]}
														</p>
													)}
													{transaction.amount && !quickPaymentErrors[`transaction_${index}_amount`] && (
														<p className="text-gray-600 text-xs mt-1">
															{Number(transaction.amount).toLocaleString('vi-VN')} ₫
														</p>
													)}
												</div>

												{/* Ghi chú giao dịch */}
												<div>
													<label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
													<input
														type="text"
														value={transaction.note}
														onChange={(e) => handleQuickPaymentTransactionChange(index, 'note', e.target.value)}
														className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
														placeholder="Ghi chú (tùy chọn)"
													/>
												</div>
											</div>
										</div>
									))}

									{/* Nút thêm giao dịch */}
									<button
										type="button"
										onClick={addQuickPaymentTransaction}
										className="w-full p-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
									>
										<FaMoneyBillWave className="mr-2" />
										Thêm giao dịch
									</button>
								</div>
							</div>
						</div>
					</div>{' '}
					{/* Payments List Section */}
					{paymentsList.length > 0 && (
						<div className="mt-6">
							<div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
								<div className="space-y-2 p-3">
									{paymentsList.map((payment, index) => (
										<div key={index} className="border border-gray-300 rounded-lg p-3 bg-gray-50">
											{/* Payment display - single row with all info */}
											<div className="flex items-center gap-6">
												{/* Mã đơn hàng */}
												<div className="flex items-center gap-2">
													<span className="font-medium text-gray-800 text-sm">Mã đơn hàng:</span>
													<span className="text-blue-600 font-semibold">{payment.order_code || '--'}</span>
												</div>
												{/* Transactions info */}
												<div className="flex items-center gap-2 flex-1">
													<span className="font-medium text-gray-700 text-sm">Giao dịch:</span>
													<div className="flex flex-wrap gap-2">
														{' '}
														{payment.transactions && payment.transactions.length > 0 ? (
															payment.transactions.map((transaction, transIndex) => (
																<div
																	key={transIndex}
																	className="bg-white rounded px-2 py-1 border border-gray-200 text-xs"
																>
																	<span className="text-gray-600">
																		{transaction.transactionDate
																			? new Date(transaction.transactionDate).toLocaleDateString('vi-VN', {
																					day: '2-digit',
																					month: '2-digit',
																			  })
																			: '--'}
																	</span>
																	<span className="mx-1 text-gray-400">|</span>
																	<span className="text-gray-700">{transaction.transactionType || '--'}</span>
																	<span className="mx-1 text-gray-400">|</span>
																	<span className="font-medium text-green-600">
																		{transaction.amount
																			? `${Number(transaction.amount).toLocaleString('vi-VN')} ₫`
																			: '--'}
																	</span>
																	{transaction.note && (
																		<>
																			<span className="mx-1 text-gray-400">|</span>
																			<span className="text-blue-600">Ghi chú: {transaction.note}</span>
																		</>
																	)}
																</div>
															))
														) : (
															<span className="text-gray-500 text-sm">Chưa có giao dịch</span>
														)}
													</div>
													{/* Total amount */}
													{payment.transactions && payment.transactions.length > 0 && (
														<div className="flex items-center gap-1">
															<span className="text-gray-600 text-sm">Tổng:</span>
															<span className="text-green-600 font-semibold">
																{`${payment.transactions
																	.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
																	.toLocaleString('vi-VN')} ₫`}
															</span>
														</div>
													)}
												</div>{' '}
												{/* Số hóa đơn chính */}
												<div className="flex items-center gap-2">
													<span className="font-medium text-gray-700 text-sm">Số HĐ:</span>
													<span className="text-gray-600">{payment.invoice_number || '--'}</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
					{/* Loading indicator for payments */}
					{loadingPayments && (
						<div className="mt-6 text-center">
							<div className="inline-flex items-center">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
								<span className="text-gray-600">Đang tải danh sách thanh toán...</span>
							</div>
						</div>
					)}
					{/* Action buttons */}
					<div className="flex justify-end space-x-3 mt-6">
						<button
							onClick={() => setShowQuickPaymentForm(false)}
							className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
						>
							Hủy
						</button>
						<button
							onClick={handleQuickPaymentFormSubmit}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
						>
							<FaMoneyBillWave className="mr-2" />
							Xác nhận
						</button>
					</div>
				</div>
			</div>
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
						top: `${tooltipState.position.top}px`,
						left: `${tooltipState.position.left}px`,
					}}
				>
					<p className="font-semibold mb-1">Ghi chú:</p>
					<p>{tooltipState.content}</p>
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
					<div className="flex width-fit space-x-2">
						{/* Remove the preliminary buttons, they will no longer be shown */}
					</div>
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
						{/* Left side - PPT and Payment buttons */}{' '}
						<div className="flex items-center space-x-2 flex-shrink-0">
							{/* PPT button */}{' '}
							<button
								className={`p-1 rounded-lg border-gray-400 flex items-center justify-center focus:outline-none gap-2 ${
									isPreliminaryActive ? 'text-white bg-blue-600' : 'text-black'
								}`}
								onClick={togglePreliminaryView}
								title={isPreliminaryActive ? 'Hiển thị chế độ bình thường' : 'Hiển thị danh sách kết quả sơ bộ'}
							>
								<FaFileAlt size={18} />
								<span className="font-normal">Tiến độ</span>
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
									<span className="font-normal">KT</span>
								</button>
							)}{' '}
							{/* Quick Payment button - hide for technicians and non-accountants */}
							{!isTechnician() && isAccountant() && (
								<button
									className={`p-1 rounded-lg border-gray-400 flex items-center justify-center focus:outline-none gap-2 text-black`}
									onClick={() => {
										setShowQuickPaymentForm(!showQuickPaymentForm);
										if (!showQuickPaymentForm) {
											fetchAllPayments(); // Fetch payments when opening the form
										}
									}}
									title="Tạo thanh toán nhanh"
								>
									<FaMoneyBillWave size={18} />
									<span className="font-normal">TT</span>
								</button>
							)}
						</div>{' '}
						{/* Right side - Deadline and Overdue buttons */}
						<div className="flex items-center space-x-2 flex-shrink-0">
							{/* Pending button */}
							<button
								className={`p-2 rounded-lg border-gray-400 flex items-center justify-center focus:outline-none gap-2 py-1 ${
									showPendingFilter ? 'text-white bg-blue-600' : 'text-black'
								}`}
								onClick={togglePendingFilter}
								title={showPendingFilter ? 'Hiển thị danh sách bình thường' : 'Hiển thị mẫu đã hoàn thành chờ PPT'}
							>
								<FaFileAlt size={18} />
								<span className="font-normal">Pending</span>
							</button>
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
												// If both dates are selected, close calendar and fetch data
												if (startDate && endDate) {
													setIsCalendarOpen(false);
													// Ensure we fetch the data when closing
													fetchReceiptsByDeadline(startDate, endDate);
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
							{' '}
							<tr className="border-b-2">
								{/* Common columns - always displayed */}
								<th className="p-1 border-b text-start min-w-[300px]">Mã tiếp nhận mẫu</th>{' '}
								{/* For PPT view - only show the remaining columns after removing some */}{' '}
								{isPreliminaryActive ? (
									<>
										{/* The remaining columns for PPT view */}
										<th
											className="p-1 border-b text-start max-w-28 min-w-28 cursor-pointer hover:text-[#103667] underline text-blue-700"
											onClick={toggleDeadlineFormat}
										>
											Hạn trả KQ
										</th>
										<th className="p-1 border-b text-start min-w-[100px]">Tiếp nhận</th>
										<th className="p-1 border-b text-start min-w-[100px]">Gửi sơ bộ</th>
										<th className="p-1 border-b text-start min-w-[100px]">Gửi kết quả</th>
										<th className="p-1 border-b text-start min-w-[120px]">Mã vận đơn</th>
										<th className="p-1 border-b text-start min-w-[100px] w-[10%]">Mã mẫu</th>
										<th className="p-1 border-b text-start min-w-[100px]">Chỉ tiêu</th>
										<th className="p-1 border-b text-start w-[15%] min-w-40">Mã PPT</th>
									</>
								) : (
									<>
										{/* Non-PPT view columns */}
										{/* Show Hạn trả KQ only for non-payment views */}
										{!isPaymentActive && (
											<th
												className="p-1 border-b text-start max-w-28 min-w-28 cursor-pointer hover:text-[#103667] underline text-blue-700"
												onClick={toggleDeadlineFormat}
											>
												Hạn trả KQ
											</th>
										)}

										{/* Payment view specific columns - removed SYC column */}
										{isPaymentActive && (
											<>
												<th
													className={`p-1 border-b text-start w-[6%] min-w-20 cursor-pointer hover:text-[#103667] underline text-blue-700 relative`}
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
												</th>{' '}
											</>
										)}

										{/* Show Thông tin mẫu thử only for non-payment views */}
										{!isPaymentActive && (
											<>
												<th className="p-1 border-b text-start min-w-[100px] w-[10%]">Mã mẫu</th>
												<th className="p-1 border-b text-start w-full min-w-72">Thông tin mẫu thử</th>
											</>
										)}

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
									</>
								)}{' '}
								{/* Payment view specific columns - remaining columns */}{' '}
								{isPaymentActive && (
									<>
										<th className="p-1 border-b text-start w-[10%] min-w-28">MST/CCCD</th>
										<th className="p-1 border-b text-start w-[10%] min-w-28">Mã đơn hàng</th>
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
										</th>{' '}
										<th
											className="p-1 border-b text-start w-[15%] min-w-36 cursor-pointer hover:text-[#103667] underline text-blue-700 relative"
											onClick={() => {
												if (salesRecorderFilter !== null) {
													// If filter is active, clear it
													handleSalesRecorderFilter(salesRecorderFilter);
												} else {
													// Toggle dropdown visibility
													setShowSalesRecorderDropdown(!showSalesRecorderDropdown);
												}
											}}
										>
											{salesRecorderFilter !== null ? salesRecorderFilter : 'Người ghi nhận'}
											{showSalesRecorderDropdown && (
												<div
													ref={salesRecorderDropdownRef}
													className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 max-h-80 overflow-y-auto"
													style={{ top: '100%', left: 0, minWidth: '200px' }}
												>
													{getUniqueSalesRecorders().map((recorder, index) => (
														<div
															key={index}
															className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
																salesRecorderFilter === recorder ? 'bg-blue-100 text-blue-700 font-medium' : ''
															}`}
															onClick={(e) => {
																e.stopPropagation();
																handleSalesRecorderFilter(recorder);
															}}
														>
															{recorder}
														</div>
													))}
												</div>
											)}
										</th>{' '}
										<th className="p-1 border-b text-start w-[18%] min-w-[330px]">Thông tin thanh toán</th>
										<th className="p-1 border-b text-start w-[12%] min-w-32">Số hóa đơn</th>
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
												{' '}
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
														<p
															className="text-sm cursor-pointer"
															onClick={() =>
																handleCopyToClipboard(
																	!isTechnician() ? receipt.client?.client_name || '--' : '[Thông tin bị ẩn]',
																)
															}
														>
															{!isTechnician() ? receipt.client?.client_name || '--' : '[Thông tin bị ẩn]'}
														</p>
														{receipt.record_code && !isTechnician() && (
															<p className="text-xs text-slate-700">HSL: {receipt.record_code}</p>
														)}
														<p className="text-xs text-gray-500">
															{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
															{receipt.created_by_name || getUserName(receipt.created_by_uid)}
														</p>
													</div>{' '}
												</td>
												{/* Add deadline column for empty receipts in non-payment views */}
												{!isPaymentActive && (
													<td className="p-1 text-start text-gray-500">{canViewDeadline() ? '--' : '--'}</td>
												)}{' '}
												{/* Additional empty columns for payment view - removed SYC column */}{' '}
												{isPaymentActive && (
													<>
														{' '}
														<td className="p-1 text-start text-gray-500">{receipt.record_code || '--'}</td>
														<td
															className="p-1 text-start text-gray-500 cursor-pointer hover:bg-gray-100"
															onClick={() =>
																handleCopyToClipboard(
																	!isTechnician() ? receipt.client?.legal_id || '--' : '[Thông tin bị ẩn]',
																)
															}
														>
															{!isTechnician() ? receipt.client?.legal_id || '--' : '[Thông tin bị ẩn]'}
														</td>
														<td className="p-1 text-start text-gray-500">{receipt.order_code || '--'}</td>
														<td className="p-1 text-start text-gray-500">
															{receipt.total_amount ? `${receipt.total_amount.toLocaleString()} ₫` : '--'}
														</td>
														<td className="p-1 text-start text-gray-500">{receipt.sale_recorder || '--'}</td>{' '}
														{/* Transaction columns for empty receipts */}{' '}
														<td className="p-1 text-start text-gray-500">
															{receipt.transactions && receipt.transactions.length > 0 ? (
																<div className="space-y-1">
																	{receipt.transactions.map((transaction, index) => (
																		<div key={index} className="text-sm border border-gray-200 rounded p-2">
																			<div className="flex items-center justify-between mb-1">
																				<span className="text-xs text-gray-600">
																					{transaction.transactionDate ? formatDate(transaction.transactionDate) : '--'}
																				</span>
																				<span
																					className="text-red-500 hover:text-red-700 cursor-pointer text-xs"
																					title="Xóa giao dịch"
																				>
																					✕
																				</span>
																			</div>
																			<div className="flex items-center justify-between mb-1">
																				<span className="text-xs">{transaction.transactionType || '--'}</span>
																			</div>
																			<div className="flex items-center">
																				<span className="text-xs font-medium">
																					{transaction.amount
																						? `${Number(transaction.amount).toLocaleString('vi-VN')} ₫`
																						: '--'}
																				</span>
																			</div>
																		</div>
																	))}
																</div>
															) : (
																'--'
															)}
														</td>
													</>
												)}{' '}
												{/* Sample information columns - empty state */}
												{!isPaymentActive &&
													(isPreliminaryActive ? (
														<>
															{/* For PPT view - empty sample columns (2 columns for empty receipts) */}
															<td className="p-1 text-start text-gray-500">--</td>
															<td className="p-1 text-start text-gray-500">--</td>
														</>
													) : (
														<>
															{/* For normal view - empty sample columns (6 columns for empty receipts) */}
															<td className="p-1 text-start text-gray-500">--</td>
															<td className="p-1 text-start text-gray-500">--</td>
															<td className="p-1 text-start text-gray-500">--</td>
															<td className="p-1 text-start text-gray-500">--</td>
															<td className="p-1 text-start text-gray-500">--</td>
															<td className="p-1 text-start text-gray-500">--</td>
														</>
													))}
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
																		<p
																			className="text-sm cursor-pointer"
																			onClick={() => handleCopyToClipboard(receipt.client?.client_name || '--')}
																		>
																			{!isTechnician() ? receipt.client?.client_name || '--' : '[Thông tin bị ẩn]'}
																		</p>
																		{receipt.record_code && !isTechnician() && (
																			<p className="text-xs text-slate-700">HSL: {receipt.record_code}</p>
																		)}
																		<p className="text-xs text-gray-500">
																			{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
																			{receipt.created_by_name || getUserName(receipt.created_by_uid)}
																		</p>
																	</div>{' '}
																</td>{' '}
																{/* Show deadline column only for non-payment views */}
																{!isPaymentActive && (
																	<td
																		className={`p-1 text-start cursor-pointer align-top ${
																			hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
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
																)}{' '}
																{/* Add the remaining columns for Preliminary view for empty receipts */}
																{isPreliminaryActive && (
																	<>
																		{' '}
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																		>
																			{' '}
																			<div className="text-sm">
																				<span
																					className={`px-2 py-1 rounded text-xs font-medium ${
																						receipt.status && receipt.status !== 'Chưa xác định'
																							? 'bg-green-100 text-green-800'
																							: 'bg-gray-100 text-gray-600'
																					}`}
																				>
																					{receipt.status || 'Chưa xác định'}
																				</span>
																			</div>
																		</td>
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																		>
																			{receipt.draft_send_at ? formatDate(receipt.draft_send_at) : '--'}
																		</td>
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																		>
																			{receipt.ppt_send_at ? formatDate(receipt.ppt_send_at) : '--'}
																		</td>
																		<td
																			className={`p-1 text-start align-top hover:bg-gray-100 ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																		>
																			{receipt.tracking_number ? (
																				<div className="flex flex-col items-start space-y-1">
																					{' '}
																					{/* Display existing tracking numbers */}
																					{receipt.tracking_number.split(',').map((trackingNum, index) => {
																						const trimmedNum = trackingNum.trim();
																						if (!trimmedNum) return null;

																						// Check if this is a direct pickup tracking number (starts with TT)
																						const isDirectPickup = trimmedNum.startsWith('TT');

																						return (
																							<div key={index} className="flex items-center space-x-2">
																								{' '}
																								<span
																									className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
																									onClick={() => {
																										setSelectedReceipt({
																											...receipt,
																											tracking_number: trimmedNum,
																											original_tracking_number: receipt.tracking_number,
																											mode: 'auto',
																										});
																										setShowShipmentForm(true);
																									}}
																								>
																									{trimmedNum}
																								</span>
																								{!isDirectPickup && (
																									<a
																										href={`https://viettelpost.vn/thong-tin-don-hang?peopleTracking=sender&orderNumber=${trimmedNum}&orderType=1`}
																										target="_blank"
																										rel="noopener noreferrer"
																										className="text-green-600 hover:text-green-800 flex items-center text-xs"
																										onClick={(e) => e.stopPropagation()}
																										title="Theo dõi đơn hàng trên Viettel Post"
																									>
																										<FaExternalLinkAlt size={10} className="mr-1" /> Track
																									</a>
																								)}
																							</div>
																						);
																					})}
																					{/* Always show "Add shipment" button at the bottom */}
																					<div
																						className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs border border-blue-300 rounded px-2 py-1 hover:bg-blue-50"
																						onClick={() => {
																							setSelectedReceipt({ ...receipt, mode: 'new' });
																							setShowShipmentForm(true);
																						}}
																					>
																						+ Thêm vận đơn
																					</div>
																				</div>
																			) : (
																				<div
																					className="cursor-pointer text-gray-500 hover:text-blue-600 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
																					onClick={() => {
																						setSelectedReceipt({ ...receipt, mode: 'new' });
																						setShowShipmentForm(true);
																					}}
																				>
																					Tạo vận đơn
																				</div>
																			)}
																		</td>
																	</>
																)}{' '}
																{/* Payment view specific columns - removed SYC column, keeping only HSL */}
																{isPaymentActive && (
																	<>
																		{/* HSL column - first payment column */}{' '}
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																		>
																			{receipt.record_code || '--'}
																		</td>
																		<td
																			className={`p-1 text-start align-top cursor-pointer hover:bg-gray-100 ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																			onClick={() =>
																				handleCopyToClipboard(
																					!isTechnician() ? receipt.client?.legal_id || '--' : '[Thông tin bị ẩn]',
																				)
																			}
																		>
																			{!isTechnician() ? receipt.client?.legal_id || '--' : '[Thông tin bị ẩn]'}
																		</td>
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
																					onBlur={() =>
																						setEditingField({ receiptId: null, sampleId: null, field: null })
																					}
																					className="p-1 border rounded-md w-full text-sm bg-white"
																					placeholder="Mã đơn hàng"
																					autoFocus
																				/>
																			) : (
																				<p className="cursor-pointer hover:bg-gray-100 p-1 rounded">
																					{receipt.order_code || '--'}
																				</p>
																			)}
																		</td>
																		<td
																			className={`p-1 border-b text-start align-top ${
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
																		</td>{' '}
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																			onClick={() =>
																				isAccountant() && handleFieldClick(receipt.id, null, 'sale_recorder')
																			}
																		>
																			{editingField.receiptId === receipt.id &&
																			editingField.sampleId === null &&
																			editingField.field === 'sale_recorder' &&
																			isAccountant() ? (
																				<input
																					type="text"
																					value={receipt.sale_recorder || ''}
																					onChange={(e) => handleReceiptInputChange(e, receipt.id, 'sale_recorder')}
																					onKeyDown={(e) =>
																						handleReceiptInputKeyDown(e, receipt.id, 'sale_recorder', e.target.value)
																					}
																					onBlur={() =>
																						setEditingField({ receiptId: null, sampleId: null, field: null })
																					}
																					className="p-1 border rounded-md w-full text-sm bg-white"
																					autoFocus
																				/>
																			) : (
																				<p
																					className={`p-1 rounded ${
																						isAccountant() ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'
																					}`}
																				>
																					{receipt.sale_recorder || '--'}
																				</p>
																			)}
																		</td>{' '}
																		{/* Transaction columns for payment view */}
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																		>
																			{receipt.transactions && receipt.transactions.length > 0 ? (
																				<div className="space-y-1">
																					{' '}
																					{receipt.transactions.map((transaction, index) => (
																						<div
																							key={index}
																							className="text-xs border border-gray-200 rounded p-1 bg-gray-50"
																						>
																							<div className="flex items-center justify-between space-x-1">
																								{/* All transaction info on one line with separators */}
																								<div className="flex items-center space-x-1 text-xs flex-1">
																									{' '}
																									<span
																										className={`${
																											isAccountant()
																												? 'cursor-pointer hover:bg-gray-100'
																												: 'cursor-default'
																										} p-1 rounded`}
																										onClick={() =>
																											isAccountant() &&
																											setEditingTransaction({
																												receiptId: receipt.id,
																												transactionIndex: index,
																												field: 'transactionDate',
																											})
																										}
																									>
																										{editingTransaction.receiptId === receipt.id &&
																										editingTransaction.transactionIndex === index &&
																										editingTransaction.field === 'transactionDate' &&
																										isAccountant() ? (
																											<div onClick={(e) => e.stopPropagation()}>
																												<DatePicker
																													selected={
																														transaction.transactionDate
																															? new Date(transaction.transactionDate)
																															: null
																													}
																													onChange={(date) =>
																														handleTransactionDateChange(receipt.id, index, date)
																													}
																													dateFormat="dd/MM/yyyy"
																													className="p-1 border rounded-md text-xs bg-white w-20"
																													placeholderText="Chọn ngày"
																													autoFocus
																													shouldCloseOnSelect={true}
																												/>
																											</div>
																										) : transaction.transactionDate ? (
																											formatDate(transaction.transactionDate)
																										) : (
																											'--'
																										)}
																									</span>
																									<span className="text-gray-400">|</span>{' '}
																									<span
																										className={`${
																											isAccountant()
																												? 'cursor-pointer hover:bg-gray-100'
																												: 'cursor-default'
																										} p-1 rounded`}
																										onClick={() =>
																											isAccountant() &&
																											setEditingTransaction({
																												receiptId: receipt.id,
																												transactionIndex: index,
																												field: 'transactionType',
																											})
																										}
																									>
																										{editingTransaction.receiptId === receipt.id &&
																										editingTransaction.transactionIndex === index &&
																										editingTransaction.field === 'transactionType' &&
																										isAccountant() ? (
																											<select
																												value={transaction.transactionType || 'TK viện'}
																												onChange={(e) =>
																													handleTransactionSelectChange(
																														e,
																														receipt.id,
																														index,
																														'transactionType',
																													)
																												}
																												onBlur={() =>
																													setEditingTransaction({
																														receiptId: null,
																														transactionIndex: null,
																														field: null,
																													})
																												}
																												className="p-1 border rounded-md text-xs bg-white w-20"
																												autoFocus
																												onClick={(e) => e.stopPropagation()}
																											>
																												<option value="TK viện">TK viện</option>
																												<option value="TK cá nhân">TK cá nhân</option>
																												<option value="Tiền mặt">Tiền mặt</option>
																												<option value="Hoàn trả">Hoàn trả</option>
																											</select>
																										) : (
																											transaction.transactionType || 'TK viện'
																										)}
																									</span>
																									<span className="text-gray-400">|</span>{' '}
																									<span
																										className={`${
																											isAccountant()
																												? 'cursor-pointer hover:bg-gray-100'
																												: 'cursor-default'
																										} p-1 rounded font-medium text-green-600`}
																										onClick={() =>
																											isAccountant() &&
																											setEditingTransaction({
																												receiptId: receipt.id,
																												transactionIndex: index,
																												field: 'amount',
																											})
																										}
																									>
																										{editingTransaction.receiptId === receipt.id &&
																										editingTransaction.transactionIndex === index &&
																										editingTransaction.field === 'amount' &&
																										isAccountant() ? (
																											<input
																												type="number"
																												value={transaction.amount || ''}
																												onChange={(e) =>
																													handleTransactionInputChange(e, receipt.id, index, 'amount')
																												}
																												onKeyDown={(e) =>
																													handleTransactionKeyDown(
																														e,
																														receipt.id,
																														index,
																														'amount',
																														e.target.value,
																													)
																												}
																												onBlur={() =>
																													setEditingTransaction({
																														receiptId: null,
																														transactionIndex: null,
																														field: null,
																													})
																												}
																												className="p-1 border rounded-md text-xs bg-white w-20"
																												placeholder="Số tiền"
																												autoFocus
																												onClick={(e) => e.stopPropagation()}
																											/>
																										) : transaction.amount ? (
																											`${Number(transaction.amount).toLocaleString('vi-VN')} ₫`
																										) : (
																											'--'
																										)}
																									</span>{' '}
																									{/* Note */}
																									{(transaction.note ||
																										(editingTransaction.receiptId === receipt.id &&
																											editingTransaction.transactionIndex === index &&
																											editingTransaction.field === 'note')) && (
																										<>
																											<span className="text-gray-400">|</span>{' '}
																											<span
																												className={`${
																													isAccountant()
																														? 'cursor-pointer hover:bg-gray-100'
																														: 'cursor-default'
																												} p-1 rounded text-blue-600`}
																												onClick={() =>
																													isAccountant() &&
																													setEditingTransaction({
																														receiptId: receipt.id,
																														transactionIndex: index,
																														field: 'note',
																													})
																												}
																											>
																												{editingTransaction.receiptId === receipt.id &&
																												editingTransaction.transactionIndex === index &&
																												editingTransaction.field === 'note' &&
																												isAccountant() ? (
																													<input
																														type="text"
																														value={transaction.note || ''}
																														onChange={(e) =>
																															handleTransactionInputChange(e, receipt.id, index, 'note')
																														}
																														onKeyDown={(e) =>
																															handleTransactionKeyDown(
																																e,
																																receipt.id,
																																index,
																																'note',
																																e.target.value,
																															)
																														}
																														onBlur={() =>
																															setEditingTransaction({
																																receiptId: null,
																																transactionIndex: null,
																																field: null,
																															})
																														}
																														className="p-1 border rounded-md text-xs bg-white w-16"
																														placeholder="Ghi chú"
																														autoFocus
																														onClick={(e) => e.stopPropagation()}
																													/>
																												) : (
																													`Ghi chú: ${transaction.note}`
																												)}
																											</span>
																										</>
																									)}
																									{/* Add note button when no note exists */}
																									{!transaction.note &&
																										!(
																											editingTransaction.receiptId === receipt.id &&
																											editingTransaction.transactionIndex === index &&
																											editingTransaction.field === 'note'
																										) && (
																											<>
																												<span className="text-gray-400">|</span>{' '}
																												<span
																													className={`${
																														isAccountant()
																															? 'cursor-pointer hover:bg-gray-100'
																															: 'cursor-default'
																													} p-1 rounded text-gray-500 text-xs`}
																													onClick={() =>
																														isAccountant() &&
																														setEditingTransaction({
																															receiptId: receipt.id,
																															transactionIndex: index,
																															field: 'note',
																														})
																													}
																												>
																													+ Ghi chú
																												</span>
																											</>
																										)}
																								</div>

																								{/* Delete button */}
																								<span
																									className="text-red-500 hover:text-red-700 cursor-pointer text-sm flex-shrink-0"
																									title="Xóa giao dịch"
																									onClick={() => handleDeleteTransaction(receipt.id, index)}
																								>
																									✕
																								</span>
																							</div>
																						</div>
																					))}{' '}
																					{/* Add new transaction button */}
																					{isAccountant() && (
																						<div
																							className="text-xs text-blue-600 cursor-pointer hover:underline mt-1"
																							onClick={() => handleOpenTransactionModal(receipt.id)}
																						>
																							+ Thêm giao dịch
																						</div>
																					)}
																				</div>
																			) : (
																				isAccountant() && (
																					<div
																						className="cursor-pointer text-gray-500 hover:text-blue-600 text-sm"
																						onClick={() => handleOpenTransactionModal(receipt.id)}
																					>
																						+ Thêm giao dịch
																					</div>
																				)
																			)}
																		</td>{' '}
																		<td
																			className={`p-1 text-start align-top ${
																				hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																			}`}
																			rowSpan={samplesToShow.length}
																			onClick={() =>
																				isAccountant() && handleFieldClick(receipt.id, null, 'invoice_number')
																			}
																		>
																			{editingField.receiptId === receipt.id &&
																			editingField.sampleId === null &&
																			editingField.field === 'invoice_number' &&
																			isAccountant() ? (
																				<input
																					type="text"
																					value={receipt.invoice_number || ''}
																					onChange={(e) => handleReceiptInputChange(e, receipt.id, 'invoice_number')}
																					onKeyDown={(e) =>
																						handleReceiptInputKeyDown(e, receipt.id, 'invoice_number', e.target.value)
																					}
																					onBlur={() =>
																						setEditingField({ receiptId: null, sampleId: null, field: null })
																					}
																					className="p-1 border rounded-md w-full text-sm bg-white"
																					placeholder="Nhập số hóa đơn"
																					autoFocus
																				/>
																			) : (
																				<p
																					className={`p-1 rounded ${
																						isAccountant() ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'
																					}`}
																				>
																					{receipt.invoice_number || '--'}
																				</p>
																			)}
																		</td>{' '}
																	</>
																)}
															</>
														)}{' '}
														{/* Sample-specific columns */}{' '}
														{!isPaymentActive &&
															(isPreliminaryActive ? (
																<>
																	{/* PPT view - show only sample-specific columns */} {/* Mã mẫu column */}
																	<td className="p-1 text-start align-top">
																		<div className="text-sm max-w-40 truncate">
																			{sample.sample_uid ? (
																				<NavLink
																					to={`/dashboard/sample?receipt_uid=${receipt.receipt_uid}&sample_uid=${sample.sample_uid}`}
																					className="text-primary hover:text-[#103667] font-medium"
																				>
																					{sample.sample_uid}
																				</NavLink>
																			) : (
																				'--'
																			)}
																		</div>
																	</td>{' '}
																	{/* Chỉ tiêu column */}
																	<td className="p-1 text-start align-top">
																		<div className="text-sm">
																			{totalTests > 0 ? (
																				<span
																					className={`font-medium ${
																						completedTests === totalTests
																							? 'text-green-600'
																							: completedTests > 0
																							? 'text-yellow-600'
																							: 'text-gray-600'
																					}`}
																				>
																					{completedTests}/{totalTests}
																				</span>
																			) : (
																				<span className="text-gray-500">0/0</span>
																			)}
																		</div>
																	</td>
																	{/* Mã PPT column - display ppt_uid from first report object if it exists */}
																	<td className="p-1 text-start align-top">
																		<div className="text-sm">
																			{reports && reports.length > 0 && reports[0].ppt_uid ? (
																				<button
																					onClick={() => {
																						const url = `/report?sample_uid=${sample.sample_uid}&ppt_uid=${reports[0].ppt_uid}`;
																						window.open(url, '_blank');
																					}}
																					className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none p-0"
																					title="Click để mở báo cáo trong tab mới"
																				>
																					{reports[0].ppt_uid}
																				</button>
																			) : (
																				'--'
																			)}
																		</div>
																	</td>
																</>
															) : (
																<>
																	{/* Regular non-PPT view */}{' '}
																	<td className="p-1 text-start align-top">
																		<div className="text-sm max-w-40 truncate">
																			{sample.sample_uid ? (
																				<NavLink
																					to={`/dashboard/sample?receipt_uid=${receipt.receipt_uid}&sample_uid=${sample.sample_uid}`}
																					className="text-primary hover:text-[#103667] font-medium"
																				>
																					{sample.sample_uid}
																				</NavLink>
																			) : (
																				'--'
																			)}
																		</div>
																	</td>
																	<td className="p-1 text-start align-top">
																		<div
																			className="text-sm w-full line-clamp-2"
																			title={sample.sample_name || '--'}
																			style={{
																				display: '-webkit-box',
																				WebkitLineClamp: 2,
																				WebkitBoxOrient: 'vertical',
																				overflow: 'hidden',
																			}}
																		>
																			{sample.sample_name || '--'}
																		</div>
																	</td>{' '}
																	<td
																		className="p-1 text-start align-top cursor-pointer hover:bg-gray-100"
																		onClick={() => handleFieldClick(receipt.id, sample.id, 'sample_volume')}
																	>
																		{editingField.receiptId === receipt.id &&
																		editingField.sampleId === sample.id &&
																		editingField.field === 'sample_volume' ? (
																			<textarea
																				value={sample.sample_volume || ''}
																				onChange={(e) => handleInputChange(e, receipt.id, sample.id, 'sample_volume')}
																				onBlur={(e) =>
																					handleSampleChange(receipt.id, sample.id, 'sample_volume', e.target.value)
																				}
																				className="p-1 border rounded-md w-full text-sm bg-white"
																				autoFocus
																			/>
																		) : (
																			<div className="text-sm">
																				{sample.sample_volume ? (
																					<span className="font-medium">{sample.sample_volume}</span>
																				) : (
																					<span className="text-gray-500">--</span>
																				)}
																			</div>
																		)}
																	</td>{' '}
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
																	</td>{' '}
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
																				{' '}
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
																	<td className="p-1 text-start align-top">
																		<div className="text-sm">
																			{totalTests > 0 ? (
																				<span
																					className={`font-medium ${
																						completedTests === totalTests
																							? 'text-green-600'
																							: completedTests > 0
																							? 'text-yellow-600'
																							: 'text-gray-600'
																					}`}
																				>
																					{completedTests}/{totalTests}
																				</span>
																			) : (
																				<span className="text-gray-500">0/0</span>
																			)}
																		</div>
																	</td>
																</>
															))}
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
			</div>{' '}
			{/* Transaction modal - added at the end of the component */}
			{renderTransactionModal()}
			{/* Quick payment form - added at the end of the component */}
			{renderQuickPaymentForm()} {/* Shipment form - added at the end of the component */}
			{showShipmentForm && selectedReceipt && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
					{(() => {
						// Check if this is a direct pickup - but only for existing tracking numbers, not new shipments
						const isDirectPickup =
							selectedReceipt?.mode !== 'new' &&
							selectedReceipt?.tracking_number &&
							selectedReceipt.tracking_number.split(',').some((tn) => tn.trim().startsWith('TT'));

						return (
							<div className="bg-white rounded-lg shadow-lg w-fit mx-4 overflow-y-auto relative">
								{/* Fixed header */}
								<div className="absolute top-0 left-0 right-0 flex justify-between items-center p-2 bg-white border-b border-gray-200 rounded-t-lg z-10">
									<h2 className="text-xl font-semibold text-gray-800">
										{selectedReceipt?.mode === 'new'
											? 'Tạo vận đơn mới'
											: selectedReceipt.tracking_number
											? `Thông tin vận đơn ${selectedReceipt.tracking_number}${
													selectedReceipt.ppt_send_at ? ` - Ngày ${formatDate(selectedReceipt.ppt_send_at)}` : ''
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
		</div>
	);
};

export default Dashboard;
