import * as React from 'react';
const { useContext, useState, useEffect } = React;
import TinyMceInput from './Input';
import { GlobalContext } from '../contexts/GlobalContext';
import Breadcrumb from './Breadcrumb';
import FilterBar from './FilterBar';
import { NavLink, useSearchParams, useNavigate } from 'react-router-dom';
import { PiDownloadSimpleBold } from 'react-icons/pi';
import { CgFileDocument } from 'react-icons/cg';
import { TiBusinessCard } from 'react-icons/ti';
import { MdOutlineContactPhone } from 'react-icons/md';
import { FaTrashAlt, FaEdit, FaCheck, FaMoneyBillWave, FaFilePdf, FaTag } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import CreateReceipt from './CreateReceipt';
import { apiGet, apiPost, apiGetBlob } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2';
import axios from 'axios'; // Add axios import
import EmailForm from './EmailForm';
// Import the generateReportToHTML function

const ReceiptInfor = ({ receipt }) => {
	const { setCurrentTitlePage, currentUser, technicians, status, purposes, formatDate, getIdenByUid, identityCache } =
		useContext(GlobalContext);
	const [listAnalytes, setListAnalytes] = useState([]);
	const [currentReceipt, setCurrentReceipt] = useState(null);
	const [editingField, setEditingField] = useState(null);
	const [inputValue, setInputValue] = useState('');
	const [isEditorVisible, setIsEditorVisible] = useState(false);
	const [viewMode, setViewMode] = useState('sample'); // 'analyte' or 'sample' or 'ppt'
	const [isAddingSample, setIsAddingSample] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false); // Add edit mode state
	const [selectedReports, setSelectedReports] = useState({});
	const [selectAllChecked, setSelectAllChecked] = useState(false);

	// Keep editingRevenueField state but remove showRevenueSection
	const [editingRevenueField, setEditingRevenueField] = useState(null);
	const [newSample, setNewSample] = useState({
		sample_name: '',
		matrix: '',
		sample_description: '',
		sample_volume: '',
		purpose: '',
		additional_request: '',
		copiedFromSampleUid: '',
	});
	const [copyCount, setCopyCount] = useState(1);
	const [sampleInformation, setSampleInformation] = useState([
		{ fname: 'Số lô / LOT no.', fvalue: '' },
		{ fname: 'Ngày sản xuất / mfg.', fvalue: '' },
		{ fname: 'Hạn sử dụng / exp.', fvalue: '' },
		{ fname: 'Nơi sản xuất / mfr.', fvalue: '' },
	]);
	const [checkConfirm, setCheckConfirm] = useState(false);
	const defaultFields = sampleInformation;
	let key,
		isfetch = false;
	const [searchParams] = useSearchParams(); // Changed to useSearchParams
	const receipt_uid = searchParams.get('receipt_uid');
	const navigate = useNavigate();
	const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
	const [deleteItemId, setDeleteItemId] = useState(null);
	const [deleteType, setDeleteType] = useState(null);
	// State to store user information fetched from API
	const [userInfo, setUserInfo] = useState({});
	const [isPaymentConfirmVisible, setIsPaymentConfirmVisible] = useState(false);

	// Add state to track if deadline DatePicker is focused
	const [isDeadlineFocused, setIsDeadlineFocused] = useState(false);
	const [tempDeadline, setTempDeadline] = useState(null);

	// Add state to track receipt date focus
	const [isReceiptDateFocused, setIsReceiptDateFocused] = useState(false);
	const [tempReceiptDate, setTempReceiptDate] = useState(null);
	const [receiptDateInput, setReceiptDateInput] = useState('');
	// Add state to track which field is currently being edited
	const [editingGeneralField, setEditingGeneralField] = useState(null);

	// Add state to store original values for comparison
	const [originalValues, setOriginalValues] = useState({});
	// State to track report generation progress
	const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
	const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
	const [isGeneratingPublish, setIsGeneratingPublish] = useState(false);
	const [generationProgress, setGenerationProgress] = useState(0);

	// State for EmailForm visibility
	const [isEmailFormVisible, setIsEmailFormVisible] = useState(false);

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

	// Handle receipt date input change
	const handleReceiptDateInputChange = (e) => {
		setReceiptDateInput(e.target.value);
	};

	// Handle date picker select for receipt date
	const handleReceiptDateChange = (date) => {
		// Just update the component state without API call
		setTempReceiptDate(date);
		handleInputChange({ target: { name: 'receipt_date', value: date } });
	};

	// Handle the receipt DatePicker blur event
	const handleReceiptDateBlur = () => {
		if (isReceiptDateFocused && currentReceipt?.receipt_date) {
			// Only make API call when focus is lost and there's a value
			handleReceiptApiUpdate('receipt_date', currentReceipt.receipt_date);
			setIsReceiptDateFocused(false);
		}
	};

	// Handle receipt DatePicker focus
	const handleReceiptDateFocus = () => {
		setIsReceiptDateFocused(true);
		setTempReceiptDate(currentReceipt?.receipt_date);
	};

	// Handle keydown events on the receipt DatePicker
	const handleReceiptDateKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();

			// Format and validate the date
			const formattedDate = formatDateString(receiptDateInput);
			const parsedDate = parseDateString(formattedDate);

			if (parsedDate) {
				handleInputChange({
					target: { name: 'receipt_date', value: parsedDate },
				});
				// Update API with the new date
				handleReceiptApiUpdate('receipt_date', parsedDate);

				// Clear the input and blur
				setReceiptDateInput('');
				if (document.activeElement) {
					document.activeElement.blur();
				}
				setIsReceiptDateFocused(false);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: 'Định dạng ngày không hợp lệ. Sử dụng định dạng DD/MM/YYYY hoặc DDMMYYYY',
				});
			}
		} else if (e.key === 'Escape') {
			// Revert to original value and blur
			handleInputChange({
				target: { name: 'receipt_date', value: tempReceiptDate },
			});
			setReceiptDateInput('');
			if (document.activeElement) {
				document.activeElement.blur();
			}
			setIsReceiptDateFocused(false);
		}
	};

	// Handle date change for deadline - only update local state
	const handleDeadlineChange = (date) => {
		// Just update the component state without API call
		setTempDeadline(date);
		handleInputChange({ target: { name: 'deadline', value: date } });
	};

	// Handle the DatePicker blur event to update API
	const handleDeadlineBlur = () => {
		if (isDeadlineFocused && currentReceipt?.deadline) {
			// Only make API call when focus is lost and there's a value
			handleReceiptApiUpdate('deadline', currentReceipt.deadline);
			setIsDeadlineFocused(false);
		}
	};

	// Handle DatePicker focus
	const handleDeadlineFocus = () => {
		setIsDeadlineFocused(true);
		setTempDeadline(currentReceipt?.deadline);
	};

	// Handle keydown events on the DatePicker
	const handleDeadlineKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();

			// Check if user is typing a date string manually
			if (e.target.value && typeof e.target.value === 'string') {
				const formattedDate = formatDateString(e.target.value);
				const parsedDate = parseDateString(formattedDate);

				if (parsedDate) {
					handleInputChange({
						target: { name: 'deadline', value: parsedDate },
					});
					// Update API with the new date
					handleReceiptApiUpdate('deadline', parsedDate);
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: 'Định dạng ngày không hợp lệ. Sử dụng định dạng DD/MM/YYYY hoặc DDMMYYYY',
					});
					// Restore previous value
					handleInputChange({
						target: { name: 'deadline', value: tempDeadline },
					});
				}
			} else {
				// Regular date picker handling
				handleReceiptApiUpdate('deadline', currentReceipt.deadline);
			}

			if (document.activeElement) {
				document.activeElement.blur();
			}
			setIsDeadlineFocused(false);
		} else if (e.key === 'Escape') {
			// Revert to original value and blur
			handleInputChange({
				target: { name: 'deadline', value: tempDeadline },
			});
			if (document.activeElement) {
				document.activeElement.blur();
			}
			setIsDeadlineFocused(false);
		}
	};

	useEffect(() => {
		setCurrentTitlePage('Tiếp nhận mẫu');
	}, []);

	// Function to adjust received dates for timezone (+7 hours for Vietnam)
	const adjustTimezoneDate = (dateValue) => {
		if (!dateValue) return null;

		// Create a new date from the value, which was stored in UTC
		const date = new Date(dateValue);
		if (isNaN(date.getTime())) return dateValue;

		// Add 7 hours to convert from UTC to Vietnam time
		date.setHours(date.getHours() + 7);
		return date;
	};

	// NEW FUNCTION: Adjust dates for API submission (subtract 7 hours)
	const adjustDateForApiSubmission = (dateValue) => {
		if (!dateValue) return null;

		// Create a copy of the date to avoid modifying the original
		const date = new Date(dateValue);
		if (isNaN(date.getTime())) return dateValue;

		// Subtract 7 hours to convert from Vietnam time to UTC for storage
		date.setHours(date.getHours() + 7);
		return date;
	};

	const fetchReceipt = async () => {
		try {
			const response = await apiGet(`https://black.irdop.org/khsi19me/db/get/receipt_full/${receipt_uid}`);
			if (response.status === 200) {
				// Adjust timezone for dates before setting state
				const receiptData = response.data;
				if (receiptData.receipt_date) {
					receiptData.receipt_date = adjustTimezoneDate(receiptData.receipt_date);
				}
				if (receiptData.deadline) {
					receiptData.deadline = adjustTimezoneDate(receiptData.deadline);
				}

				// Adjust timezone for all sample deadlines
				if (receiptData.samples) {
					receiptData.samples.forEach((sample) => {
						if (sample.analysis) {
							sample.analysis.forEach((analysis) => {
								if (analysis.deadline) {
									analysis.deadline = adjustTimezoneDate(analysis.deadline);
								}
							});
						}
					});
				}

				setCurrentReceipt(receiptData);
				setListAnalytes(receiptData.samples.flatMap((sample) => sample.analysis));

				// Store original values for comparison
				setOriginalValues({
					record_code: receiptData.record_code || '',
					request_number: receiptData.request_number || '',
					receipt_uid: receiptData.receipt_uid || '',
					receipt_date: receiptData.receipt_date || null,
					deadline: receiptData.deadline || null,
					note: receiptData.note || '',
					quote_code: receiptData.quote_code || '',
					order_code: receiptData.order_code || '',
					total_amount: receiptData.total_amount || '',
					sale_recorder: receiptData.sale_recorder || '',
					'client.client_name': receiptData.client?.client_name || '',
					'client.client_uid': receiptData.client?.client_uid || '',
					'client.client_address': receiptData.client?.client_address || '',
					'client.legal_id': receiptData.client?.legal_id || '',
					'contact.name': receiptData.contact?.name || '',
					'contact.phone': receiptData.contact?.phone || '',
					'contact.email': receiptData.contact?.email || '',
				});

				// Fetch user information for created_by_uid and modified_by_uid
				if (receiptData.created_by_uid) {
					fetchUserIdentity(receiptData.created_by_uid);
				}
				if (receiptData.modified_by_uid) {
					fetchUserIdentity(receiptData.modified_by_uid);
				}
			} else if (response.status === 401) {
				navigate('/login');
			}
		} catch (error) {
			console.error('Error fetching receipt:', error);
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

	useEffect(() => {
		if (receipt_uid && isfetch === false) {
			isfetch = true;
			fetchReceipt();
		}
	}, []);

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

	// Toggle edit mode
	const toggleEditMode = () => {
		setIsEditMode(!isEditMode);
	};

	// Handle sample field updates - split into UI update and API call
	const handleSampleChange = (sampleId, field, newValue) => {
		// Only update local state for UI responsiveness
		setCurrentReceipt((prev) => ({
			...prev,
			samples: prev.samples.map((sample) => (sample.id === sampleId ? { ...sample, [field]: newValue } : sample)),
		}));
	};

	// Function to handle API update after confirmation
	const handleSampleApiUpdate = async (sampleId, field, newValue) => {
		try {
			// Find the sample in the current state
			const sample = currentReceipt.samples.find((s) => s.id === sampleId);
			if (!sample) {
				throw new Error('Sample not found');
			}

			// Create the initial payload
			const payload = {
				sample: {
					id: sampleId,
					[field]: newValue,
					modified_by_uid: currentUser.identity_uid,
				},
			};

			// For sample_name or sample_description, update sample_information
			if (field === 'sample_name' || field === 'sample_description') {
				// Parse sample_information (could be string or object)
				let sampleInfo = [];
				try {
					if (sample.sample_information) {
						sampleInfo =
							typeof sample.sample_information === 'string'
								? JSON.parse(sample.sample_information)
								: sample.sample_information;
					}
				} catch (error) {
					console.error('Error parsing sample information:', error);
					sampleInfo = [];
				}

				// Make sure it's an array
				if (!Array.isArray(sampleInfo)) {
					sampleInfo = [];
				}

				// Define search keywords based on the field being edited
				const searchKeywords = field === 'sample_name' ? ['Tên mẫu', 'name'] : ['Mô tả', 'desc'];

				// Look for matching entry
				let found = false;
				const updatedSampleInfo = sampleInfo.map((item) => {
					// Check if this item matches our search keywords
					if (
						item.fname &&
						searchKeywords.some((keyword) => item.fname.toLowerCase().includes(keyword.toLowerCase()))
					) {
						found = true;
						return { ...item, fvalue: newValue };
					}
					return item;
				});

				// If no matching entry found, add a new one
				if (!found) {
					const newEntry = {
						fname: field === 'sample_name' ? 'Tên mẫu thử / name.' : 'Mô tả / desc.',
						fvalue: newValue,
					};
					updatedSampleInfo.push(newEntry);
				}

				// Add the updated sample_information to the payload
				payload.sample.sample_information = updatedSampleInfo;
			}

			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', payload);

			if (response.status === 200) {
				showToast(`Cập nhật thông tin thành công!`);

				// If we updated sample_information, update the local state too
				if (field === 'sample_name' || field === 'sample_description') {
					setCurrentReceipt((prev) => ({
						...prev,
						samples: prev.samples.map((s) => {
							if (s.id === sampleId) {
								// Get the updated sample_information from the payload
								const updatedSampleInfo = payload.sample.sample_information;
								return { ...s, sample_information: updatedSampleInfo };
							}
							return s;
						}),
					}));
				}
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật thông tin mẫu',
				});
				fetchReceipt(); // Refresh data on error
			}
		} catch (error) {
			console.error('Error updating sample information:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin mẫu',
			});
			fetchReceipt(); // Refresh data on error
		}
	};

	// Handle key down event for textareas
	const handleTextareaKeyDown = (e, sampleId, field, value) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault(); // Prevent new line
			handleSampleApiUpdate(sampleId, field, value);

			// Remove focus from the textarea
			if (document.activeElement) {
				document.activeElement.blur();
			}
		}
	};
	// Add handleTextareaBlur function to handle blur events
	const handleTextareaBlur = (sampleId, field, value) => {
		// Get original value for comparison
		const sample = currentReceipt?.samples.find((s) => s.id === sampleId);
		const originalValue = sample?.[field] || '';

		// Check if value has changed
		if (value === originalValue) {
			// No change, just return without API call
			return;
		}

		// Call API update when field loses focus and value has changed
		handleSampleApiUpdate(sampleId, field, value);
	};

	// Handle select change - immediately update both UI and API
	const handleSelectChange = (e, sampleId, field) => {
		const newValue = e.target.value;
		handleSampleChange(sampleId, field, newValue);
		handleSampleApiUpdate(sampleId, field, newValue);
	};
	const handleResultValueClick = (order) => {
		const fieldKey = `result_value-${order.sample_id}-${order.id}`;
		setEditingField(fieldKey);
		const originalValue = order.result_value ? String(order.result_value) : '';
		setInputValue(originalValue);
		setIsEditorVisible(true);
	};

	const handleResultUnitClick = (order) => {
		const fieldKey = `result_unit-${order.sample_id}-${order.id}`;
		setEditingField(fieldKey);
		const originalValue = order.result_unit ? String(order.result_unit) : '';
		setInputValue(originalValue);
		setIsEditorVisible(true);
	};

	// Kiểm tra phím nhập vào, nếu là enter thì log ra giá trị vừa nhập
	const handleKeyDown = async (e, newValue) => {
		key = e.key;
		if (key === 'Enter') {
			e.preventDefault(); // Prevent default to avoid potential form submissions
			setInputValue(newValue);
			setIsEditorVisible(false);
			setEditingField(null);

			// Just blur the element without updating
			if (document.activeElement) {
				document.activeElement.blur();
			}
		}
	};

	// Add this new function to handle API updates for analysis
	const onUpdateAnalysis = async (analysis) => {
		try {
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: {
					...analysis,
					modified_by_uid: currentUser.identity_uid,
				},
			});

			if (response.status === 200) {
				showToast('Chỉ tiêu đã được cập nhật!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật chỉ tiêu',
				});
			}
			return analysis;
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật',
			});
			return analysis;
		}
	};
	// Add this new function to handle API updates for analysis with value comparison
	const handleSaveContent = async (newValue) => {
		const currentField = editingField;
		const fieldParts = currentField.split('-');
		const fieldType = fieldParts[0];
		const sampleId = fieldParts[1];
		const analysisId = parseInt(fieldParts[2]);

		// Get original value for comparison
		const analysis = listAnalytes.find((item) => item.id === analysisId && item.sample_id.toString() === sampleId);
		let originalValue;

		if (fieldType === 'result_value') {
			originalValue = analysis?.result_value || '';
		} else if (fieldType === 'result_unit') {
			originalValue = analysis?.result_unit || '';
		}

		// Check if value has changed
		if (newValue === originalValue) {
			// No change, just close editor without API call
			setInputValue(newValue);
			setIsEditorVisible(false);
			setEditingField(null);
			return;
		}

		setInputValue(newValue);
		const updatedAnalytes = listAnalytes.map((item) => {
			if (
				item.id === parseInt(editingField.split('-')[2]) &&
				item.sample_id.toString() === editingField.split('-')[1]
			) {
				if (editingField.startsWith('result_value')) {
					return { ...item, result_value: newValue };
				} else if (editingField.startsWith('result_unit')) {
					return { ...item, result_unit: newValue };
				}
			}
			return item;
		});

		setListAnalytes(updatedAnalytes);
		setIsEditorVisible(false);
		setEditingField(null);

		try {
			const analysis = updatedAnalytes.find(
				(item) =>
					item.id === parseInt(editingField.split('-')[2]) && item.sample_id.toString() === editingField.split('-')[1],
			);

			if (analysis) {
				await onUpdateAnalysis(analysis);
			}
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật kết quả',
			});
		}
	};

	const processHtmlString = (htmlString) => {
		return htmlString
			.replace(/<p>/g, '') // Bỏ thẻ mở <p>
			.replace(/<\/p>/g, '') // Bỏ thẻ đóng </p>
			.replace(/<sub>(.*?)<\/sub>/g, '_$1_') // Thay <sub>...</sub> bằng _..._
			.replace(/<sup>(.*?)<\/sup>/g, '^$1^'); // Thay <sup>...</sup> bằng ^...^
	};

	const handleNotify = (data) => {
		showToast(`Kết quả vừa nhập: ${processHtmlString(data)}`, {
			autoClose: 1000, // Tự động đóng sau 3 giây
		});
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
		});

		Toast.fire({
			icon: type,
			title: message,
			background: type === 'success' ? '#2bae66' : type === 'info' ? '#2196F3' : '#333333',
			color: '#FFFFFF',
			iconColor: '#FFFFFF',
		});
	};
	const getSampleUid = (sample_id) => {
		const sample = currentReceipt.samples.find((sample) => sample.id === sample_id);
		return sample ? sample.sample_uid : '';
	};

	const getTechnicianName = (technician_uid) => {
		const technician = technicians.find((tech) => tech.identity_uid === technician_uid);
		return technician ? `${technician.identity_name} (${technician.alias})` : '';
	};

	const handleAddSample = () => {
		setIsAddingSample(true);
	};
	const handleSaveNewSample = async () => {
		setCheckConfirm(true);

		// Check if any required field is empty (but only check if they have been modified/touched)
		const requiredFields = ['sample_name', 'matrix', 'sample_description', 'sample_volume', 'purpose'];
		const hasAnyContent = requiredFields.some((field) => newSample[field].trim() !== '');

		if (!hasAnyContent) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Vui lòng nhập ít nhất một thông tin cơ bản',
			});
			return;
		}

		// Create samples sequentially based on copyCount
		for (let i = 0; i < copyCount; i++) {
			const sampleNameSuffix = copyCount > 1 ? ` - Bản sao ${i + 1}` : '';
			const newSampleData = {
				receipt_id: currentReceipt.id,
				...newSample,
				sample_name: (newSample.sample_name || '') + sampleNameSuffix,
				sample_information: JSON.stringify([
					{
						fname: 'Tên mẫu thử / name.',
						fvalue: (newSample?.sample_name || '') + sampleNameSuffix,
					},
					...sampleInformation,
					{
						fname: 'Ngày tiếp nhận / receipt date.',
						fvalue: formatDate(currentReceipt.receipt_date) || '',
					},
					{ fname: 'Ngày thử nghiệm / test date.', fvalue: '' },
					{
						fname: 'Mô tả / desc.',
						fvalue: newSample?.sample_description || '',
					},
				]),
				created_by_uid: currentUser.identity_uid,
				modified_by_uid: currentUser.identity_uid,
			};

			try {
				const response = await apiPost('https://black.irdop.org/to82oe92i/db/insert/sample', { sample: newSampleData });
				if (response.status === 200) {
					const newSampleId = response.data.id; // Use 'id' field from the response

					// Check if we have a copied sample UID to copy analyses from
					const copiedSampleUid = newSample.copiedFromSampleUid;
					if (copiedSampleUid) {
						// Find the sample that was copied from
						const sampleToCopy = currentReceipt.samples.find((sample) => sample.sample_uid === copiedSampleUid);

						if (sampleToCopy && sampleToCopy.analysis && sampleToCopy.analysis.length > 0) {
							// Create analyses based on the copied sample
							const analysesToCopy = sampleToCopy.analysis.map((analysis) => {
								// Create the analysis object
								const analysisData = {
									receipt_id: currentReceipt.id,
									sample_id: newSampleId,
									parameter_id: analysis.parameter_id || 0,
									parameter_name: analysis.parameter_name,
									parameter_uid: analysis.parameter_uid || '',
									accreditation: analysis.accreditation,
									protocol_id: analysis.protocol_id,
									technician_uid: analysis.technician_uid,
									deadline: analysis.deadline
										? analysis.deadline
										: new Date(Date.now() + (analysis?.tat_expected?.days * 24 * 60 * 60 * 1000 || 0)),
									protocol_code: analysis.protocol_code,
									result_unit: analysis.result_unit || '',
									protocol_source: analysis.protocol_source,
									matrix: newSample.matrix || analysis.matrix,
									field: analysis.field,
									created_by_uid: currentUser.identity_uid,
									modified_by_uid: currentUser.identity_uid,
								};
								// Add result_value if it exists and is not null, empty string, or '<p><p>'
								if (analysis.result_value && analysis.result_value !== '' && analysis.result_value !== '<p><p>') {
									analysisData.result_value = analysis.result_value;
								}
								// Remove keys with empty string values
								return Object.fromEntries(Object.entries(analysisData).filter(([key, value]) => value !== ''));
							});

							// Add analyses in bulk
							try {
								const analysisResponse = await apiPost('https://black.irdop.org/trelw82ki/db/insert/bulk/analysis', {
									analyses: analysesToCopy,
								});

								if (analysisResponse.status !== 200) {
									console.error(`Error copying analyses for sample ${i + 1}:`, analysisResponse);
								}
							} catch (analysisError) {
								console.error(`Error copying analyses for sample ${i + 1}:`, analysisError);
							}
						}
					}
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: response.data?.message || `Thêm mẫu ${i + 1} thất bại. Vui lòng thử lại`,
					});
					return; // Stop creating more samples if one fails
				}
			} catch (error) {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: error.message || `Có lỗi xảy ra khi tạo mẫu ${i + 1}. Vui lòng thử lại`,
				});
				return; // Stop creating more samples if one fails
			}
		}

		// Show success message after all samples are created
		const copiedSampleUid = newSample.copiedFromSampleUid;
		const hasAnalyses =
			copiedSampleUid &&
			currentReceipt.samples.find((sample) => sample.sample_uid === copiedSampleUid)?.analysis?.length > 0;

		if (copyCount > 1) {
			showToast(
				hasAnalyses
					? `Đã tạo thành công ${copyCount} mẫu và sao chép chỉ tiêu!`
					: `Đã tạo thành công ${copyCount} mẫu!`,
			);
		} else {
			showToast(hasAnalyses ? 'Thêm mẫu mới và sao chép chỉ tiêu thành công!' : 'Thêm mẫu mới thành công!');
		}

		setNewSample({
			sample_name: '',
			matrix: '',
			sample_description: '',
			sample_volume: '',
			purpose: '',
			additional_request: '',
			copiedFromSampleUid: '', // Reset copied sample UID
		});
		setCopyCount(1); // Reset copy count
		setSampleInformation((informations) => {
			return informations.map((info) => {
				return { ...info, fvalue: '' };
			});
		});
		setCheckConfirm(false);
		fetchReceipt(); // Fetch updated data
		setIsAddingSample(false);
	};
	const handleCancelAddSample = () => {
		setIsAddingSample(false);
		setNewSample({
			sample_name: '',
			matrix: '',
			sample_description: '',
			sample_volume: '',
			purpose: '',
			additional_request: '',
			copiedFromSampleUid: '',
		});
		setSampleInformation((informations) => {
			return informations.map((info) => {
				return { ...info, fvalue: '' };
			});
		});
		setCheckConfirm(false);
	};

	const handleNewSampleChange = (e) => {
		const { name, value } = e.target;
		setNewSample((prev) => ({ ...prev, [name]: value }));
	};

	const handleAdditionalFieldChange = (index, field, value) => {
		const updatedFields = [...sampleInformation];
		if (field === 'fname') {
			const selectedField = defaultFields.find((item) => item.fname === value);
			if (selectedField) {
				updatedFields[index]['fvalue'] = selectedField.fvalue;
			} else if (value === 'Khác') {
				updatedFields[index]['fvalue'] = '';
			}
		}
		if (field === 'other') {
			updatedFields[index]['other'] = value;
		}
		updatedFields[index][field] = value;
		setSampleInformation(updatedFields);
	};

	const handleDeleteAdditionalField = (index) => {
		const updatedFields = sampleInformation.filter((_, i) => i !== index);
		setSampleInformation(updatedFields);
	};

	const handleAddAdditionalField = () => {
		setSampleInformation([...sampleInformation, { fname: '', fvalue: '' }]);
	};

	const handleDeleteSample = async (sampleId) => {
		try {
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/delete/sample', {
				id: sampleId,
				modified_by_uid: currentUser.identity_uid,
			});
			if (response.status === 200) {
				showToast('Xóa mẫu thành công!');
				fetchReceipt(); // Fetch updated data
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Xóa mẫu thất bại. Vui lòng thử lại',
				});
			}
		} catch (error) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra. Vui lòng thử lại',
			});
		}
	};

	const handleDeleteReceipt = async () => {
		try {
			const response = await apiPost('https://black.irdop.org/khsi19me/db/delete/receipt', {
				id: currentReceipt.id,
				receipt_uid: currentReceipt.receipt_uid,
				modified_by_uid: currentUser.identity_uid,
			});
			if (response.status === 200) {
				showToast('Xóa tiếp nhận mẫu thành công!', {
					autoClose: 1000,
				});
				// Redirect to dashboard after successful deletion
				navigate('/dashboard');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Xóa tiếp nhận mẫu thất bại. Vui lòng thử lại',
				});
			}
		} catch (error) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra. Vui lòng thử lại',
			});
		}
	};

	// Fixed handleInputChange function to avoid null object errors
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		const keys = name.split('.');
		if (keys.length > 1) {
			setCurrentReceipt((prev) => {
				if (!prev) return prev; // Guard against null receipt

				const updatedReceipt = { ...prev };
				let nestedObject = updatedReceipt;

				// Create nested objects if they don't exist
				for (let i = 0; i < keys.length - 1; i++) {
					if (!nestedObject[keys[i]]) {
						nestedObject[keys[i]] = {};
					}
					nestedObject = nestedObject[keys[i]];
				}

				// Set the final property
				nestedObject[keys[keys.length - 1]] = value;
				return updatedReceipt;
			});
		} else {
			setCurrentReceipt((prev) => {
				if (!prev) return prev; // Guard against null receipt
				return {
					...prev,
					[name]: value,
				};
			});
		}
	};

	// Fixed handleContactSearch function
	const handleContactSearch = (e) => {
		const { value } = e.target;
		setCurrentReceipt((prev) => {
			if (!prev) return prev; // Guard against null receipt

			return {
				...prev,
				contact: {
					...(prev.contact || {}), // Keep existing contact properties if any
					name: value,
				},
			};
		});

		if (value.length >= 5) {
			// Implement search logic here
		}
	};

	// Also fix handleCustomerSearch function for consistency
	const handleCustomerSearch = (e) => {
		const { value } = e.target;
		setCurrentReceipt((prev) => {
			if (!prev) return prev; // Guard against null receipt

			return {
				...prev,
				client: {
					...(prev.client || {}), // Keep existing client properties
					client_uid: value,
				},
			};
		});

		if (value.length >= 5) {
			// Implement search logic here
		}
	};
	// Add this new handler function before renderAddSampleForm
	const handleCopySample = (sampleUid) => {
		// If default option ("Sao chép") is selected, do nothing
		if (!sampleUid || sampleUid === 'copy') return;

		// Find the sample with the matching UID
		const sampleToCopy = currentReceipt.samples.find((sample) => sample.sample_uid === sampleUid);

		if (sampleToCopy) {
			// Copy sample data to the form and store the source sample UID
			setNewSample({
				sample_name: sampleToCopy.sample_name || '',
				matrix: sampleToCopy.matrix || '',
				sample_description: sampleToCopy.sample_description || '',
				sample_volume: sampleToCopy.sample_volume || '',
				purpose: sampleToCopy.purpose || '',
				additional_request: sampleToCopy.additional_request || '',
				copiedFromSampleUid: sampleUid, // Store the source sample UID
			});
			// Try to parse sample_information if it exists
			try {
				if (sampleToCopy.sample_information) {
					const parsedInfo =
						typeof sampleToCopy.sample_information === 'string'
							? JSON.parse(sampleToCopy.sample_information)
							: sampleToCopy.sample_information;

					const filteredInfo = parsedInfo.filter(
						(item) =>
							!item.fname.toLowerCase().includes('tên mẫu') &&
							!item.fname.toLowerCase().includes('name.') &&
							!item.fname.toLowerCase().includes('ngày tiếp nhận / receipt date') &&
							!item.fname.toLowerCase().includes('ngày thử nghiệm / test date') &&
							!item.fname.toLowerCase().includes('mô tả / desc'),
					);

					setSampleInformation(filteredInfo);
				}
			} catch (error) {
				console.error('Error parsing sample information:', error);
			}
		}
	};

	const renderAddSampleForm = () => (
		<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
			<div className="bg-white p-4 rounded-lg w-1/2">
				<h2 className="text-2xl font-semibold mb-4">Thêm mẫu mới</h2>
				<div className="flex">
					<div className="w-1/2 pr-2">
						<div className="mb-4">
							<label className="block text-sm font-medium mb-1 text-start">Tên mẫu</label>
							<input
								type="text"
								name="sample_name"
								value={newSample.sample_name}
								onChange={handleNewSampleChange}
								className={`w-full border rounded p-1 bg-white ${
									checkConfirm && newSample.sample_name.trim() === '' ? 'border-red-500' : ''
								}`}
							/>
						</div>
						<div className="mb-4">
							<label className="block text-sm font-medium mb-1 text-start">Nền mẫu</label>
							<input
								type="text"
								name="matrix"
								value={newSample.matrix}
								onChange={handleNewSampleChange}
								className={`w-full border rounded p-1 bg-white ${
									checkConfirm && newSample.matrix.trim() === '' ? 'border-red-500' : ''
								}`}
							/>
						</div>
						<div className="mb-4">
							<label className="block text-sm font-medium mb-1 text-start">Mô tả</label>
							<textarea
								name="sample_description"
								value={newSample.sample_description}
								onChange={handleNewSampleChange}
								className={`w-full border rounded p-1 bg-white resize-none ${
									checkConfirm && newSample.sample_description.trim() === '' ? 'border-red-500' : ''
								}`}
								rows={2}
							/>
						</div>
					</div>
					<div className="w-1/2 pl-2">
						<div className="mb-4">
							<label className="block text-sm font-medium mb-1 text-start">Số lượng</label>
							<input
								type="text"
								name="sample_volume"
								value={newSample.sample_volume}
								onChange={handleNewSampleChange}
								className={`w-full border rounded p-1 bg-white ${
									checkConfirm && newSample.sample_volume.trim() === '' ? 'border-red-500' : ''
								}`}
							/>
						</div>
						<div className="mb-4">
							<label className="block text-sm font-medium mb-1 text-start">Mục đích kiểm nghiệm</label>
							<select
								name="purpose"
								value={newSample.purpose}
								onChange={handleNewSampleChange}
								className={`w-full border rounded p-1 bg-white ${
									checkConfirm && newSample.purpose.trim() === '' ? 'border-red-500' : ''
								}`}
							>
								<option value="">Chọn mục đích kiểm nghiệm</option>
								{purposes.map((purpose) => (
									<option key={purpose} value={purpose}>
										{purpose}
									</option>
								))}
							</select>
						</div>
						<div className="mb-4">
							<label className="block text-sm font-medium mb-1 text-start">Yêu cầu</label>
							<textarea
								name="additional_request"
								value={newSample.additional_request}
								onChange={handleNewSampleChange}
								className="w-full border rounded p-1 bg-white resize-none"
								rows={2}
							/>
						</div>
					</div>
				</div>
				<div className="mb-4 flex flex-col">
					<label className="block text-sm font-medium mb-1 text-start">Thông tin bổ sung</label>
					{sampleInformation.map((field, index) => (
						<div key={index} className="flex mb-2">
							<input
								value={field.fname}
								onChange={(e) => handleAdditionalFieldChange(index, 'fname', e.target.value)}
								className="w-1/3 min-w-36 border rounded p-1 bg-white mr-2"
							/>
							<input
								type="text"
								value={field.fvalue}
								onChange={(e) => handleAdditionalFieldChange(index, 'fvalue', e.target.value)}
								className="w-full border rounded p-1 bg-white"
							/>
							<button
								className="text-red-500 bg-white text-sm rounded-lg p-1 px-4 focus:outline-none text-center ml-2"
								onClick={() => handleDeleteAdditionalField(index)}
							>
								<FaTrashAlt size={20} />
							</button>
						</div>
					))}
					<button
						className="bg-sky-500 text-white text-sm rounded-lg p-1 active:bg-sky-600 focus:outline-none w-32"
						onClick={handleAddAdditionalField}
					>
						Thêm thông tin
					</button>
				</div>{' '}
				<div className="flex justify-end mt-4">
					<div className="flex-1 flex items-center space-x-2">
						<select
							className="bg-white border rounded p-1"
							onChange={(e) => handleCopySample(e.target.value)}
							defaultValue="copy"
						>
							<option value="copy">Sao chép</option>
							{currentReceipt?.samples.map((sample) => (
								<option key={sample.sample_uid} value={sample.sample_uid}>
									{sample.sample_uid}
								</option>
							))}
						</select>
						<div className="flex items-center">
							<label className="text-sm font-medium mr-2">Số lượng:</label>
							<input
								type="number"
								min="1"
								max="10"
								value={copyCount}
								onChange={(e) => {
									const value = parseInt(e.target.value);
									if (value >= 1 && value <= 10) {
										setCopyCount(value);
									}
								}}
								className="bg-white border rounded p-1 w-16 text-center"
							/>
						</div>
					</div>
					<button className="bg-gray-500 text-white text-sm rounded-lg p-1 mr-2 w-20" onClick={handleCancelAddSample}>
						Hủy bỏ
					</button>
					<button className="bg-green-500 text-white text-sm rounded-lg p-1 w-20" onClick={handleSaveNewSample}>
						Lưu
					</button>
				</div>
			</div>
		</div>
	);

	const handleDeleteConfirm = (id, type) => {
		setDeleteItemId(id);
		setIsDeleteConfirmVisible(true);
		setDeleteType(type);
	};

	const handleDeleteCancel = () => {
		setIsDeleteConfirmVisible(false);
		setDeleteItemId(null);
	};

	const handleDeleteSampleConfirmAction = async () => {
		try {
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/delete/sample', {
				id: deleteItemId,
				modified_by_uid: currentUser.identity_uid,
			});
			if (response.status === 200) {
				showToast('Xóa mẫu thành công!');
				fetchReceipt(); // Fetch updated data
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Xóa mẫu thất bại. Vui lòng thử lại',
				});
			}
		} catch (error) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra. Vui lòng thử lại',
			});
		} finally {
			setIsDeleteConfirmVisible(false);
			setDeleteItemId(null);
		}
	};
	const handleDeleteAnalysisConfirmAction = async () => {
		try {
			// Replace axios.post with apiPost to match the rest of the codebase
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/delete/analysis', {
				id: deleteItemId,
			});
			if (response.status === 200) {
				showToast('Xóa chỉ tiêu thành công!');
				fetchReceipt(); // Fetch updated data
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Xóa chỉ tiêu thất bại. Vui lòng thử lại',
				});
			}
		} catch (error) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra. Vui lòng thử lại',
			});
		} finally {
			setIsDeleteConfirmVisible(false);
			setDeleteItemId(null);
		}
	};

	const renderDeleteConfirm = (message, onConfirm) => (
		<div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
			<div className="bg-white p-4 rounded-lg w-[400px] h-[200px] relative flex flex-col justify-between">
				<h2 className="text-2xl font-semibold mb-4">Xác nhận xóa</h2>
				<p>{message}</p>
				<div className="flex justify-end mt-4">
					<button className="bg-gray-500 text-white p-2 rounded mr-2 w-1/4" onClick={handleDeleteCancel}>
						Hủy bỏ
					</button>
					<button className="bg-red-500 text-white p-2 rounded w-1/4" onClick={onConfirm}>
						Xóa
					</button>
				</div>
			</div>
		</div>
	);

	// Function to ensure a date is valid, returning current date as fallback
	const ensureValidDate = (dateString) => {
		if (!dateString) return new Date();

		const date = new Date(dateString);
		return isNaN(date.getTime()) ? new Date() : date;
	};

	// Function to handle Excel download
	const handleExcelDownload = async () => {
		try {
			// Show loading toast
			showToast('Đang tải xuống file Excel...', 'info');

			// Specify Excel MIME type explicitly
			const excelMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; // Using apiGetBlob function with correct headers and responseType
			const response = await apiGetBlob(`https://black.irdop.org/xlsx/download/${receipt_uid}`);

			if (response.status === 200) {
				// Get the blob directly from the response
				const blob = response.data;

				// Create a new blob with explicit type to ensure correct handling
				const excelBlob = new Blob([blob], { type: excelMimeType });

				// Create a URL for the blob
				const url = window.URL.createObjectURL(excelBlob);

				// For IE/Edge browsers
				if (window.navigator && window.navigator.msSaveOrOpenBlob) {
					window.navigator.msSaveOrOpenBlob(excelBlob, `Receipt_${receipt_uid}.xlsx`);
				} else {
					// For modern browsers
					const link = document.createElement('a');
					link.href = url;
					link.setAttribute('download', `Receipt_${receipt_uid}.xlsx`);
					link.style.display = 'none';

					// Append to body, click and remove
					document.body.appendChild(link);
					link.click();

					// Clean up after a short delay to ensure download starts
					setTimeout(() => {
						document.body.removeChild(link);
						window.URL.revokeObjectURL(url);
					}, 200);
				}

				// Show success toast
				showToast('Tải xuống file Excel thành công!');
			} else {
				// Handle HTTP errors
				console.error('Error downloading file:', response.status, response.data?.message || 'Unknown error');
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: `Không thể tải file Excel (${response.status}). Vui lòng thử lại`,
				});
			}
		} catch (error) {
			console.error('Error downloading Excel file:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi tải file Excel. Vui lòng thử lại',
			});
		}
	};

	// Helper function to check if value is empty or invalid for display
	const displayValue = (value) => {
		if (value === null || value === undefined || value === '') {
			return '--';
		}
		return value;
	};

	const handlePayStatusToggle = () => {
		setIsPaymentConfirmVisible(true);
	};

	const handlePayStatusChange = async () => {
		try {
			const newPayStatus = currentReceipt.pay_status === 1 ? 0 : 1;
			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', {
				receipt: {
					id: currentReceipt.id,
					receipt_uid: currentReceipt.receipt_uid,
					pay_status: newPayStatus,
					modified_by_uid: currentUser.identity_uid,
				},
			});

			if (response.status === 200) {
				setCurrentReceipt((prev) => ({
					...prev,
					pay_status: newPayStatus,
				}));
				showToast(
					`Đã cập nhật trạng thái thanh toán thành ${newPayStatus === 1 ? 'đã thanh toán' : 'chưa thanh toán'}!`,
				);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Cập nhật trạng thái thanh toán thất bại',
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
			setIsPaymentConfirmVisible(false);
		}
	};

	const handlePayStatusCancel = () => {
		setIsPaymentConfirmVisible(false);
	};

	const renderPayStatusConfirm = () => (
		<div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
			<div className="bg-white p-4 rounded-lg w-[400px] h-[200px] relative flex flex-col justify-between">
				<h2 className="text-2xl font-semibold mb-4">Xác nhận thay đổi</h2>
				<p>
					{currentReceipt?.pay_status === 1
						? 'Bạn muốn thay đổi trạng thái thanh toán sang Chưa thanh toán?'
						: 'Bạn muốn thay đổi trạng thái thanh toán sang Đã thanh toán?'}
				</p>
				<div className="flex justify-end mt-4">
					<button className="bg-gray-500 text-white p-2 rounded mr-2 w-1/4" onClick={handlePayStatusCancel}>
						Hủy bỏ
					</button>
					<button className="bg-blue-500 text-white p-2 rounded w-1/4" onClick={handlePayStatusChange}>
						Xác nhận
					</button>
				</div>
			</div>
		</div>
	);
	// Function to handle API update for receipt fields
	const handleReceiptApiUpdate = async (field, value) => {
		try {
			// Apply timezone adjustment for date fields before sending to API
			let adjustedValue = value;
			if (field === 'deadline' || field === 'receipt_date') {
				adjustedValue = adjustDateForApiSubmission(value);
			}

			const payload = {
				receipt: {
					id: currentReceipt.id,
					receipt_uid: currentReceipt.receipt_uid,
					[field]: adjustedValue,
					modified_by_uid: currentUser.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				showToast(`Cập nhật thành công!`);
				return true;
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật thông tin',
				});
				fetchReceipt(); // Refresh data on error
				return false;
			}
		} catch (error) {
			console.error('Error updating receipt information:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin',
			});
			fetchReceipt(); // Refresh data on error
			return false;
		}
	};
	// Handle client information update
	const handleClientApiUpdate = async (field, value) => {
		try {
			// Create an updated client object with just the changed field
			const updatedClient = {
				...currentReceipt.client,
				[field]: value,
			};

			delete updatedClient.created_by_uid;

			// Update through receipt endpoint with client as a nested property
			const payload = {
				receipt: {
					id: currentReceipt.id,
					receipt_uid: currentReceipt.receipt_uid,
					client: updatedClient,
					modified_by_uid: currentUser.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				showToast(`Cập nhật thông tin khách hàng thành công!`);
				return true;
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật thông tin khách hàng',
				});
				fetchReceipt(); // Refresh data on error
				return false;
			}
		} catch (error) {
			console.error('Error updating client information:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin khách hàng',
			});
			fetchReceipt(); // Refresh data on error
			return false;
		}
	};
	// Handle contact information update
	const handleContactApiUpdate = async (field, value) => {
		try {
			// Create an updated contact object with just the changed field
			const updatedContact = {
				...currentReceipt.contact,
				[field]: value,
			};

			delete updatedContact.created_by_uid;
			delete updatedContact.search;

			// Update through receipt endpoint with contact as a nested property
			const payload = {
				receipt: {
					id: currentReceipt.id,
					receipt_uid: currentReceipt.receipt_uid,
					contact: updatedContact,
					modified_by_uid: currentUser.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				showToast(`Cập nhật thông tin liên hệ thành công!`);
				return true;
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật thông tin liên hệ',
				});
				fetchReceipt(); // Refresh data on error
				return false;
			}
		} catch (error) {
			console.error('Error updating contact information:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin liên hệ',
			});
			fetchReceipt(); // Refresh data on error
			return false;
		}
	};

	// Handle key down for receipt fields
	const handleReceiptInputKeyDown = (e, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleReceiptApiUpdate(field, value);

			// Remove focus
			if (document.activeElement) {
				document.activeElement.blur();
			}
		}
	};

	// Handle key down for client fields
	const handleClientInputKeyDown = (e, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleClientApiUpdate(field, value);

			// Remove focus
			if (document.activeElement) {
				document.activeElement.blur();
			}
		}
	};

	// Handle key down for contact fields
	const handleContactInputKeyDown = (e, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleContactApiUpdate(field, value);

			// Remove focus
			if (document.activeElement) {
				document.activeElement.blur();
			}
		}
	};

	// Add this function before the return statement
	// Function to check if ALL client and contact information fields are filled
	const hasAllClientAndContactFields = () => {
		if (!currentReceipt) return false;

		// Check if client information exists
		if (!currentReceipt.client) return false;

		// Check client information
		const clientFields = ['client_name', 'client_address', 'legal_id', 'client_uid'];
		for (const field of clientFields) {
			if (!currentReceipt.client[field] || currentReceipt.client[field].trim() === '') {
				return false; // Return false if ANY field is empty
			}
		}

		// Check if contact information exists
		if (!currentReceipt.contact) return false;

		// Check contact information
		const contactFields = ['name', 'phone', 'email'];
		for (const field of contactFields) {
			if (!currentReceipt.contact[field] || currentReceipt.contact[field].trim() === '') {
				return false; // Return false if ANY field is empty
			}
		}

		return true; // All fields have values
	};

	// Initialize customer details visibility state with default value of false
	const [isCustomerDetailsVisible, setIsCustomerDetailsVisible] = useState(false);
	// Add this ref to track if we've already set the visibility
	const initialVisibilitySet = React.useRef(false);

	const toggleCustomerDetails = () => {
		setIsCustomerDetailsVisible(!isCustomerDetailsVisible);
	};

	// Replace the existing useEffect for visibility with this one
	// that runs only once when data is first loaded
	useEffect(() => {
		if (currentReceipt && !initialVisibilitySet.current) {
			// Set visibility based on whether all fields are filled
			setIsCustomerDetailsVisible(!hasAllClientAndContactFields());
			// Mark that we've set the initial visibility
			initialVisibilitySet.current = true;
		}
	}, [currentReceipt]);

	// Remove the existing useEffect with [currentReceipt] dependency that was
	// causing the panel to auto-hide during form edits

	// Handle field click to switch to edit mode
	const handleFieldClick = (fieldName) => {
		setEditingGeneralField(fieldName);
	};
	// Handle field blur to save changes and exit edit mode
	const handleFieldBlur = (field, value) => {
		// Get original value for comparison
		const originalValue = originalValues[field];

		// Check if value has changed
		if (value === originalValue) {
			// No change, just exit edit mode without API call
			setEditingGeneralField(null);
			return;
		}

		// Value has changed, proceed with API update
		if (field.startsWith('client.')) {
			const actualField = field.split('.')[1];
			handleClientApiUpdate(actualField, value);
		} else if (field.startsWith('contact.')) {
			const actualField = field.split('.')[1];
			handleContactApiUpdate(actualField, value);
		} else {
			handleReceiptApiUpdate(field, value);
		}
		setEditingGeneralField(null);
	};

	// Handle key press in input fields
	const handleFieldKeyDown = (e, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleFieldBlur(field, value);
		} else if (e.key === 'Escape') {
			setEditingGeneralField(null);
			// Revert to original value by not saving
		}
	};

	// Format currency for display
	const formatCurrency = (value) => {
		if (!value) return '--';
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND',
		}).format(value);
	};

	// Render field - either as display div or input
	const renderField = (fieldName, value, disabled = false, type = 'text', isCurrency = false) => {
		const isEditing = editingGeneralField === fieldName;
		const displayText = isCurrency ? formatCurrency(value) : displayValue(value);

		if (disabled) {
			return <div className="w-2/3 px-2 py-0 text-sm text-left border border-white">{displayText}</div>;
		}

		if (isEditing) {
			return (
				<input
					type={type}
					name={fieldName}
					className="w-full bg-white border border-blue-500 px-2 py-0 rounded-lg text-sm focus:outline-none align-top"
					value={value || ''}
					onChange={handleInputChange}
					onBlur={() => handleFieldBlur(fieldName, value)}
					onKeyDown={(e) => handleFieldKeyDown(e, fieldName, value)}
					autoFocus
				/>
			);
		}

		return (
			<div
				className="w-full px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg align-top"
				onClick={() => handleFieldClick(fieldName)}
			>
				{displayText}
			</div>
		);
	};

	// Render textarea field
	const renderTextareaField = (fieldName, value, disabled = false) => {
		const isEditing = editingGeneralField === fieldName;

		if (disabled) {
			return <div className="w-2/3 px-2 py-0 text-sm text-left border border-white">{displayValue(value)}</div>;
		}

		if (isEditing) {
			return (
				<textarea
					name={fieldName}
					className="w-2/3 bg-white border border-blue-500 px-2 py-0 rounded-lg text-sm focus:outline-none resize-none align-top"
					rows="3"
					value={value || ''}
					onChange={handleInputChange}
					onBlur={() => handleFieldBlur(fieldName, value)}
					onKeyDown={(e) => handleFieldKeyDown(e, fieldName, value)}
					autoFocus
				/>
			);
		}

		return (
			<div
				className="w-2/3 px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg h-fit align-top"
				onClick={() => handleFieldClick(fieldName)}
			>
				{displayValue(value)}
			</div>
		);
	};

	// Function to find the draft report from sample.report array
	const getDraftReport = (reports) => {
		if (!reports || !Array.isArray(reports)) return null;
		return reports.find((report) => report.ppt_uid && report.ppt_uid.includes('DRAFT'));
	};

	// Function to get published reports (non-draft)
	const getPublishedReports = (reports) => {
		if (!reports || !Array.isArray(reports)) return [];
		return reports
			.filter((report) => report.ppt_uid && !report.ppt_uid.includes('DRAFT'))
			.sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date));
	};

	// Function to handle report selection change - preserve checkbox state
	const handleReportSelection = (sampleId, reportId) => {
		setSelectedReports((prev) => {
			const isCurrentlyChecked = prev[sampleId]?.isChecked || false;
			return {
				...prev,
				[sampleId]: {
					ppt_uid: reportId,
					isChecked: isCurrentlyChecked,
				},
			};
		});
	};

	// Function to handle checkbox toggle - refactored to preserve ppt_uid selection
	const handleCheckboxToggle = (sampleId, explicitState) => {
		setSelectedReports((prev) => {
			const prevValue = prev[sampleId];
			const newIsChecked = explicitState !== undefined ? explicitState : !prevValue?.isChecked;

			// Get the current selected report ID
			let currentPptUid = null;

			// If prevValue is a string (ppt_uid), use it
			if (typeof prevValue === 'string') {
				currentPptUid = prevValue;
			}
			// If it's an object with ppt_uid, use that
			else if (prevValue?.ppt_uid) {
				currentPptUid = prevValue.ppt_uid;
			}
			// Otherwise check if there's a default selection possible
			else {
				const sample = currentReceipt?.samples.find((s) => s.id === sampleId);
				if (sample?.report?.length > 0) {
					const newestReport = getNewestReport(sample.report);
					if (newestReport) {
						currentPptUid = newestReport.ppt_uid;
					}
				}
			}

			return {
				...prev,
				[sampleId]: {
					ppt_uid: currentPptUid,
					isChecked: newIsChecked,
				},
			};
		});
	};

	// Function to handle "select all" checkbox toggle
	const handleSelectAllToggle = () => {
		const newSelectAllState = !selectAllChecked;
		setSelectAllChecked(newSelectAllState);

		// Update all checkboxes to match the select all state
		currentReceipt?.samples.forEach((sample) => {
			handleCheckboxToggle(sample.id, newSelectAllState);
		});
	};

	// Function to handle generating draft reports for selected samples
	const handleGenerateDraftReports = async () => {
		// Get all checked samples
		const selectedItems = [];

		// Find all samples with checked reports
		currentReceipt?.samples.forEach((sample) => {
			const value = selectedReports[sample.id];
			if (value?.isChecked) {
				// Get the sample_uid
				const sampleUid = sample.sample_uid;
				// Get ppt_uid if available, otherwise empty string
				let pptUid = '';

				if (typeof value === 'string') {
					pptUid = value;
				} else if (value.ppt_uid) {
					pptUid = value.ppt_uid;
				}

				// Add to selected items
				selectedItems.push({
					sample_uid: sampleUid,
					ppt_uid: pptUid,
				});
			}
		});

		// Check if we have any selected samples
		if (selectedItems.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Không có mẫu nào được chọn',
				text: 'Vui lòng chọn ít nhất một mẫu để tạo báo cáo sơ bộ.',
			});
			return;
		}

		setIsGeneratingDraft(true);
		setGenerationProgress(0);

		try {
			// Show loading toast
			showToast(`Đang tạo báo cáo sơ bộ cho ${selectedItems.length} mẫu...`, 'info');

			// Prepare the request body
			const requestBody = {
				list_uids: selectedItems,
				is_save: true,
				is_publish: false,
			};

			// Call the API
			const response = await axios.post('https://black.irdop.org/khsi19me/convert/report_html', requestBody, {
				headers: {
					'Content-Type': 'application/json',
					Accept: '*/*',
				},
			});

			// Process response - assuming it's HTML content
			const htmlContent = response.data;

			// Open the HTML content in a new tab
			const newTab = window.open();
			newTab.document.write(htmlContent);
			// newTab.document.close();

			// Fetch updated data to refresh the report list
			await fetchReceipt();

			showToast(`Đã tạo báo cáo sơ bộ cho ${selectedItems.length} mẫu thành công!`, 'success');
		} catch (error) {
			console.error('Error generating draft reports:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: `Không thể tạo báo cáo sơ bộ: ${error.message || 'Lỗi không xác định'}`,
			});
		} finally {
			setIsGeneratingDraft(false);
			setGenerationProgress(0);
		}
	};

	// Function to handle publishing reports for selected samples
	const handlePublishReports = async () => {
		// Get all checked samples
		const selectedItems = [];

		// Find all samples with checked reports
		currentReceipt?.samples.forEach((sample) => {
			const value = selectedReports[sample.id];
			if (value?.isChecked) {
				// Get the sample_uid
				const sampleUid = sample.sample_uid;
				// Get ppt_uid if available, otherwise empty string
				let pptUid = '';

				if (typeof value === 'string') {
					pptUid = value;
				} else if (value.ppt_uid) {
					pptUid = value.ppt_uid;
				}

				// Add to selected items
				selectedItems.push({
					sample_uid: sampleUid,
					ppt_uid: pptUid,
				});
			}
		});

		// Check if we have any selected samples
		if (selectedItems.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Không có mẫu nào được chọn',
				text: 'Vui lòng chọn ít nhất một mẫu để phát hành báo cáo.',
			});
			return;
		}

		setIsGeneratingPublish(true);

		try {
			// Show loading toast
			showToast(`Đang phát hành báo cáo cho ${selectedItems.length} mẫu...`, 'info');

			// Prepare the request body
			const requestBody = {
				list_uids: selectedItems,
				is_save: false,
				is_publish: true,
			};

			// Call the API
			const response = await axios.post('https://black.irdop.org/khsi19me/convert/report_html', requestBody, {
				headers: {
					'Content-Type': 'application/json',
					Accept: '*/*',
				},
			});

			// Process response - assuming it's HTML content
			const htmlContent = response.data;

			// Open the HTML content in a new tab
			const newTab = window.open();
			newTab.document.write(htmlContent);
			newTab.document.close();

			// Fetch updated data to refresh the report list
			await fetchReceipt();

			showToast(`Đã phát hành báo cáo cho ${selectedItems.length} mẫu thành công!`, 'success');
		} catch (error) {
			console.error('Error publishing reports:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: `Không thể phát hành báo cáo: ${error.message || 'Lỗi không xác định'}`,
			});
		} finally {
			setIsGeneratingPublish(false);
		}
	};

	// Function to handle previewing reports for selected samples
	const handlePreviewReports = async () => {
		// Get all checked samples
		const selectedItems = [];

		// Find all samples with checked reports
		currentReceipt?.samples.forEach((sample) => {
			const value = selectedReports[sample.id];
			if (value?.isChecked) {
				// Get the sample_uid
				const sampleUid = sample.sample_uid;
				// Get ppt_uid if available, otherwise empty string
				let pptUid = '';

				if (typeof value === 'string') {
					pptUid = value;
				} else if (value.ppt_uid) {
					pptUid = value.ppt_uid;
				}

				// Add to selected items
				selectedItems.push({
					sample_uid: sampleUid,
					ppt_uid: pptUid,
				});
			}
		});

		// Check if we have any selected samples
		if (selectedItems.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Không có mẫu nào được chọn',
				text: 'Vui lòng chọn ít nhất một mẫu để xem trước báo cáo.',
			});
			return;
		}

		setIsGeneratingPreview(true);

		try {
			// Show loading toast
			showToast(`Đang xem trước báo cáo cho ${selectedItems.length} mẫu...`, 'info');

			// Prepare the request body
			const requestBody = {
				list_uids: selectedItems,
				is_save: false,
				is_publish: false,
			};

			// Use apiPost instead of axios directly or form submission
			const response = await axios.post('https://black.irdop.org/khsi19me/convert/report_html', requestBody, {
				headers: {
					'Content-Type': 'application/json',
				},
				responseType: 'text', // Ensure we get the HTML as text
			});

			// Get the HTML content from the response
			const htmlContent = response.data;

			// Create a new blob with the HTML content
			const blob = new Blob([htmlContent], { type: 'text/html' });
			const url = URL.createObjectURL(blob);

			// Open in a new window
			const newWindow = window.open();
			if (newWindow) {
				// If window opened successfully
				newWindow.document.write(htmlContent);
				newWindow.document.close();
			} else {
				// If popup was blocked, provide a direct link
				Swal.fire({
					icon: 'info',
					title: 'Popup bị chặn',
					text: 'Trình duyệt đã chặn popup. Nhấn vào liên kết dưới đây để mở báo cáo.',
					footer: `<a href="${url}" target="_blank" class="text-blue-500 underline">Nhấn vào đây để xem báo cáo</a>`,
				});
			}

			// Fetch updated data to refresh the report list
			await fetchReceipt();

			showToast(`Đã mở xem trước báo cáo cho ${selectedItems.length} mẫu!`, 'success');
		} catch (error) {
			console.error('Error previewing reports:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: `Không thể xem trước báo cáo: ${error.message || 'Lỗi không xác định'}`,
			});
		} finally {
			setIsGeneratingPreview(false);
		}
	};

	// Function to get all reports (including drafts and published)
	const getAllReports = (reports) => {
		if (!reports || !Array.isArray(reports)) return [];
		// Sort by publish date, newest first
		return [...reports].sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date));
	};

	// Function to get the newest report (draft or published)
	const getNewestReport = (reports) => {
		const allReports = getAllReports(reports);
		return allReports.length > 0 ? allReports[0] : null;
	};
	// Helper function to check if all analyses in a sample have been reviewed
	const allAnalysesReviewed = (sample) => {
		if (!sample.analysis || sample.analysis.length === 0) return false;
		const allReviewed = sample.analysis.every((analysis) => analysis.reviewed_by);
		return allReviewed ? true : false;
	};

	// Modify renderPPTTable to include the review indicator
	const renderPPTTable = () => {
		return (
			<div className="overflow-x-auto overflow-hidden">
				<table className="min-w-full text-black">
					<thead>
						<tr>
							<th className="py-2 border-2 text-start pl-2 w-36 min-w-36">Mã mẫu thử</th>
							<th className="py-2 border-2 text-start pl-2 w-[18%] min-w-44">Chỉ tiêu</th>
							<th className="py-2 border-2 text-start pl-2 w-[12%] min-w-32">Lần cuối cập nhật</th>
							<th className="py-2 border-2 text-start pl-2 w-[24%] min-w-52">Mã phiếu phân tích</th>
							<th className="py-2 border-2 text-start pl-2 w-32 min-w-32">Ngày phát hành</th>
							<th className="py-2 border-2 text-center w-14 min-w-14">
								<input
									type="checkbox"
									className="w-4 h-4"
									checked={selectAllChecked}
									onChange={handleSelectAllToggle}
								/>
							</th>
						</tr>
					</thead>
					<tbody className="border-2">
						{currentReceipt?.samples.map((sample) => {
							const reports = sample.report || [];
							const draftReport = getDraftReport(reports);
							const allReports = getAllReports(reports);
							const newestReport = getNewestReport(reports);

							// Calculate analysis statistics - similar to sample view
							const totalTests = sample.analysis.length;
							const completedTests = sample.analysis.filter((order) => order.result_value !== '').length;
							const pendingTests = totalTests - completedTests;

							// Use ppt_uid from the object structure if available, otherwise fall back to string or newest report
							const selectedReportObj = selectedReports[sample.id];
							let selectedReportId = '';

							if (typeof selectedReportObj === 'string') {
								selectedReportId = selectedReportObj;
							} else if (selectedReportObj?.ppt_uid) {
								selectedReportId = selectedReportObj.ppt_uid;
							} else if (newestReport) {
								selectedReportId = newestReport.ppt_uid;
							}

							// Find the selected report object
							const selectedReport = reports.find((r) => r.ppt_uid === selectedReportId);

							return (
								<tr key={sample.id}>
									<td className="p-2 border text-start text-text-secondary relative">
										<NavLink
											to={`/dashboard/sample?receipt_uid=${receipt_uid}&sample_uid=${sample.sample_uid}`}
											className="text-primary font-semibold hover:text-[#103667]"
										>
											{sample.sample_uid}
										</NavLink>
										{allAnalysesReviewed(sample) === true && (
											<span className="absolute top-1 right-2 text-yellow-500 font-bold">*</span>
										)}
										<span
											className="absolute top-1 right-1 text-blue-500 cursor-pointer"
											onClick={(e) => {
												e.stopPropagation();
												window.open(
													`/dashboard/receipt/print_sp?receipt_uid=${currentReceipt?.receipt_uid}&sample_uid=${sample.sample_uid}`,
													'_blank',
												);
											}}
										>
											<FaTag size={14} />
										</span>
									</td>
									<td className="p-2 border text-start">
										{/* Show completed/pending/total analysis counts */}
										{completedTests} / {pendingTests} / {totalTests}
									</td>
									<td className="p-2 border text-start">{draftReport ? formatDate(draftReport.publish_date) : '--'}</td>
									<td className="p-2 border text-start">
										<div className="flex items-center space-x-2">
											{allReports.length > 0 ? (
												<>
													<select
														className="p-1 border rounded-md flex-grow text-sm bg-white"
														value={selectedReportId}
														onChange={(e) => handleReportSelection(sample.id, e.target.value)}
													>
														<option value="">-- Chọn phiếu phân tích --</option>
														{allReports.map((report, index) => (
															<option key={index} value={report.ppt_uid}>
																{report.ppt_uid}
															</option>
														))}
													</select>
													{/* Add forward button to navigate to report */}
													{selectedReportId && (
														<button
															className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
															onClick={() =>
																window.open(
																	`${window.location.origin}/report?sample_uid=${sample.sample_uid}&ppt_uid=${selectedReportId}`,
																	'_blank',
																)
															}
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																fill="none"
																viewBox="0 0 24 24"
																strokeWidth={1.5}
																stroke="currentColor"
																className="w-5 h-5"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
																/>
															</svg>
														</button>
													)}
												</>
											) : (
												'--'
											)}
										</div>
									</td>
									<td className="p-2 border text-start">
										{selectedReport && selectedReport.publish_date ? formatDate(selectedReport.publish_date) : '--'}
									</td>
									<td className="p-2 border text-center">
										<input
											type="checkbox"
											className="w-4 h-4"
											checked={!!selectedReports[sample.id]?.isChecked}
											onChange={() => handleCheckboxToggle(sample.id)}
										/>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		);
	};

	if (!currentReceipt) {
		return <div>Loading...</div>;
	}

	const isTechnician = () => {
		// Admin users bypass technician restrictions
		return currentUser?.role?.staff_technician && !currentUser?.role?.staff_admin;
	};

	// Add this function before the return statement, near other helper functions
	const isToday = (date) => {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	};

	return (
		<div className="w-full">
			{/* Add custom styling for SweetAlert toasts */}
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
					background-color: #3fc3ee !important;
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
			`}</style>{' '}
			<Breadcrumb
				paths={[
					{ name: 'Danh sách', link: '/' },
					{
						name: `${currentReceipt?.receipt_uid}`,
						link: `/dashboard/receipt?receipt_uid=${currentReceipt?.receipt_uid}`,
					},
				]}
				showSearch={true}
			/>
			{/* Only show action buttons for non-technicians */}
			{!isTechnician() && (
				<div className="w-full flex justify-end md:justify-between items-center max-h-20 mb-1">
					<div className=""></div>
					<div className="flex items-center flex-wrap ">
						<button
							className="bg-background border-gray-300 text-primary font-medium py-0 px-2 rounded-lg w-20"
							onClick={handleExcelDownload}
						>
							<div className="flex items-center ">
								{'Excel'} <PiDownloadSimpleBold size={20} className="ml-1" />
							</div>
						</button>{' '}
						<button
							className="bg-background border-gray-300 text-primary font-medium py-0 px-2 rounded-lg w-20 ml-2"
							onClick={() =>
								window.open(`/dashboard/receipt/print_sp?receipt_uid=${currentReceipt?.receipt_uid}`, '_blank')
							}
						>
							<div className="flex items-center ">
								{'PRINT'} <FaTag size={20} className="ml-1" />
							</div>
						</button>
						<button
							className="bg-background border-gray-300 text-primary font-medium py-0 px-2 rounded-lg w-20 ml-2"
							onClick={() => setIsEmailFormVisible(true)}
						>
							<div className="flex items-center ">
								{'Email'} <MdOutlineContactPhone size={20} className="ml-1" />
							</div>
						</button>
						<CreateReceipt receipt={currentReceipt} setUpdatedReceipt={setCurrentReceipt} />
						<button
							className="bg-background border-gray-300 text-red-500 font-medium py-0 px-2 rounded-lg w-20"
							onClick={handleDeleteReceipt}
						>
							<div className="flex items-center justify-between ">
								{'Xóa'} <FaTrashAlt size={15} className="mr-1.5" />
							</div>
						</button>
					</div>
				</div>
			)}
			{/* Only show general and order information sections for non-technicians */}
			{!isTechnician() && (
				<div className="rounded-lg w-full p-4 bg-white ">
					<div className="flex flex-col md:flex-row">
						{/* Thông tin chung Section - now 2/5 width and includes contact info */}
						<div className="w-full md:w-2/5 flex flex-col items-start px-2">
							<div className="flex justify-start items-center mb-1">
								<CgFileDocument size={16} className="text-primary" />
								<h2 className="text-md font-semibold w-fit text-primary px-1">THÔNG TIN CHUNG</h2>
							</div>
							<div className="w-full">
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Số hồ sơ lưu</label>
									{renderField('record_code', currentReceipt?.record_code)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Số yêu cầu đến</label>
									{renderField('request_number', currentReceipt?.request_number, false, 'number')}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Mã tiếp nhận</label>
									{renderField('receipt_uid', currentReceipt?.receipt_uid, true)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Ngày tiếp nhận</label>
									{editingGeneralField === 'receipt_date' ? (
										<DatePicker
											selected={currentReceipt?.receipt_date}
											onChange={handleReceiptDateChange}
											onBlur={() => {
												handleReceiptApiUpdate('receipt_date', currentReceipt?.receipt_date);
												setEditingGeneralField(null);
											}}
											onKeyDown={handleReceiptDateKeyDown}
											dateFormat="dd/MM/yyyy"
											className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
											calendarClassName="text-black"
											placeholderText="Chọn hạn trả"
											autoFocus
											dayClassName={(date) => (isToday(date) ? 'bg-blue-100 font-bold rounded-full' : undefined)}
										/>
									) : (
										<div
											className="w-2/3 px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg"
											onClick={() => setEditingGeneralField('receipt_date')}
										>
											{currentReceipt?.receipt_date ? formatDate(currentReceipt.receipt_date) : '--'} bởi{' '}
											<span className="font-semibold"> {getUserName(currentReceipt?.created_by_uid)}</span>
										</div>
									)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Hạn trả</label>
									{editingGeneralField === 'deadline' ? (
										<DatePicker
											selected={currentReceipt?.deadline}
											onChange={handleDeadlineChange}
											onBlur={() => {
												handleReceiptApiUpdate('deadline', currentReceipt?.deadline);
												setEditingGeneralField(null);
											}}
											onKeyDown={handleDeadlineKeyDown}
											dateFormat="dd/MM/yyyy"
											className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
											calendarClassName="text-black"
											placeholderText="Chọn hạn trả"
											autoFocus
											dayClassName={(date) => (isToday(date) ? 'bg-blue-100 font-bold rounded-full' : undefined)}
										/>
									) : (
										<div
											className="w-2/3 px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg"
											onClick={() => setEditingGeneralField('deadline')}
										>
											{currentReceipt?.deadline ? formatDate(currentReceipt.deadline) : '--'}
										</div>
									)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Ghi chú</label>
									{renderTextareaField('note', currentReceipt?.note)}
								</div>
							</div>
						</div>

						{/* Thông tin đơn hàng Section - now 3/5 width */}
						<div className="w-full md:w-3/5 flex flex-col items-start px-2">
							<div className="flex justify-start items-center mb-1">
								<TiBusinessCard size={16} className="text-primary" />
								<h2 className="text-md font-semibold w-fit text-primary px-1">THÔNG TIN ĐƠN HÀNG</h2>
							</div>
							<div className="w-full">
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Tên khách hàng</label>
									<div
										className="w-full px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg flex items-center justify-between"
										onClick={toggleCustomerDetails}
									>
										{currentReceipt?.client?.client_name || '--'}
										<span
											className={`text-xs ${
												!hasAllClientAndContactFields() ? 'text-red-600' : 'text-blue-600'
											} font-bold`}
										>
											{isCustomerDetailsVisible ? 'Ẩn' : ' Xem Chi tiết'}
										</span>
									</div>
								</div>

								{/* Customer details in the same layout as other fields */}
								{isCustomerDetailsVisible && (
									<div className="rounded-lg px-1 border-l-4 border-teritary">
										<div className="flex justify-start items-start mb-1">
											<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">
												Tổ chức / Cá nhân
											</label>
											{renderField('client.client_name', currentReceipt?.client?.client_name)}
										</div>
										<div className="flex justify-start items-start mb-1 ">
											<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">
												Mã khách hàng
											</label>
											{renderField('client.client_uid', currentReceipt?.client?.client_uid)}
										</div>
										<div className="flex justify-start items-start mb-1">
											<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Địa chỉ</label>
											{renderField('client.client_address', currentReceipt?.client?.client_address)}
										</div>
										<div className="flex justify-start items-start mb-1">
											<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">
												Mã số thuế/CCCD
											</label>
											{renderField('client.legal_id', currentReceipt?.client?.legal_id)}
										</div>
										<div className="flex justify-start items-start mb-1">
											<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">
												Người liên hệ
											</label>
											{renderField('contact.name', currentReceipt?.contact?.name)}
										</div>
										<div className="flex justify-start items-start mb-1">
											<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Điện thoại</label>
											{renderField('contact.phone', currentReceipt?.contact?.phone)}
										</div>
										<div className="flex justify-start items-start mb-1">
											<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Email</label>
											{renderField('contact.email', currentReceipt?.contact?.email)}
										</div>
									</div>
								)}

								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Số báo giá</label>
									{renderField('quote_code', currentReceipt?.quote_code)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Mã đơn hàng</label>
									{renderField('order_code', currentReceipt?.order_code)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Giá trị</label>
									<div className="flex items-center w-1/3">
										{renderField('total_amount', currentReceipt?.total_amount, false, 'number', true)}
										<div className="flex items-center ml-2 cursor-pointer" onClick={handlePayStatusToggle}>
											<div
												className={`min-w-2 h-2 rounded-full mr-1 ${
													currentReceipt?.pay_status === 1 ? 'bg-green-600' : 'bg-red-500'
												}`}
											></div>
											<span
												className={`font-medium text-xs min-w-28 ${
													currentReceipt?.pay_status === 1 ? 'text-green-600' : 'text-red-500'
												}`}
											>
												{currentReceipt?.pay_status === 1 ? 'Đã thanh toán' : 'Chưa thanh toán'}
											</span>
										</div>
									</div>
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Người thực hiện</label>
									{renderField('sale_recorder', currentReceipt?.sale_recorder)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* Always show view mode selector for all users */}
			<div className="flex justify-between items-start sm:h-10 sm:flex-row flex-col h-[76px] mt-4">
				<div className="w-full flex justify-start overflow-auto mr-1">
					<button
						className={`px-2 py-1 rounded-lg focus:outline-none h-fit min-w-40  ${
							viewMode === 'sample' ? 'bg-blue-200' : 'bg-gray-200'
						}`}
						onClick={() => setViewMode('sample')}
					>
						Mẫu thử
					</button>
					<button
						className={`ml-2 px-2 py-1 rounded-lg focus:outline-none h-fit min-w-40 ${
							viewMode === 'analyte' ? 'bg-blue-200' : 'bg-gray-200'
						}`}
						onClick={() => setViewMode('analyte')}
					>
						Chỉ tiêu
					</button>
					<button
						className={`ml-2 px-2 py-1 rounded-lg focus:outline-none h-fit min-w-40 ${
							viewMode === 'ppt' ? 'bg-blue-200' : 'bg-gray-200'
						}`}
						onClick={() => setViewMode('ppt')}
					>
						Phiếu kết quả
					</button>
				</div>
			</div>
			{/* Rest of the component remains unchanged */}
			<div className="bg-white rounded-lg w-full mb-4 p-4">
				<div className="flex justify-end items-start sm:h-10 sm:flex-row flex-col h-[76px] ">
					{viewMode === 'analyte' ? (
						<FilterBar
							source={currentReceipt.samples.flatMap((sample) => sample.analysis)}
							setCurrentList={setListAnalytes}
							typeSearch={'analysis'}
							className="absolute right-0"
						/>
					) : viewMode === 'ppt' ? (
						<div className="flex items-center space-x-2">
							{/* Only show these buttons for non-technicians */}
							{!isTechnician() && (
								<>
									<button
										className="bg-background border-gray-300 text-primary font-medium py-1 px-1 rounded-lg w-28"
										onClick={handlePreviewReports}
										disabled={isGeneratingPreview}
									>
										{isGeneratingPreview ? (
											<span className="flex items-center justify-center">
												<svg
													className="animate-spin h-5 w-5 text-primary"
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="4"
													></circle>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
											</span>
										) : (
											<div className="flex items-center justify-between">
												{'Xem trước'} <FaFilePdf size={20} className="ml-1" />
											</div>
										)}
									</button>
									<button
										className="bg-background border-gray-300 text-primary font-medium py-1 px-1 rounded-lg w-28"
										onClick={handleGenerateDraftReports}
										disabled={isGeneratingDraft}
									>
										{isGeneratingDraft ? (
											<span className="flex items-center justify-center">
												<svg
													className="animate-spin h-5 w-5 text-primary"
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="4"
													></circle>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
											</span>
										) : (
											<div className="flex items-center justify-between">
												{'Tạo sơ bộ'} <FaFilePdf size={20} className="ml-1" />
											</div>
										)}
									</button>
									<button
										className="bg-background border-gray-300 text-primary font-medium py-1 px-1 rounded-lg w-28"
										onClick={handlePublishReports}
										disabled={isGeneratingPublish}
									>
										{isGeneratingPublish ? (
											<span className="flex items-center justify-center">
												<svg
													className="animate-spin h-5 w-5 text-primary"
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="4"
													></circle>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
											</span>
										) : (
											<div className="flex items-center justify-between">
												{'Phát hành'} <FaFilePdf size={20} className="ml-1" />
											</div>
										)}
									</button>
								</>
							)}
						</div>
					) : (
						<div className="flex items-center space-x-2">
							{/* Only show edit and add sample buttons for non-technicians */}
							{!isTechnician() && (
								<>
									<button
										className={`w-[34px] h-[34px] p-2 rounded-lg transition-colors duration-200 border border-gray-400 focus:outline-none ${
											isEditMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-black'
										}`}
										onClick={toggleEditMode}
									>
										{isEditMode ? <FaCheck /> : <FaEdit />}
									</button>
									<button className="bg-blue-500 text-white px-1 py-1 rounded-lg w-36" onClick={handleAddSample}>
										Thêm mẫu mới
									</button>
								</>
							)}
							{isAddingSample && renderAddSampleForm()}
						</div>
					)}
				</div>
				<div className="overflow-x-auto mt-1">
					{viewMode === 'analyte' ? (
						<>
							<div className="overflow-x-auto">
								<table className="text-black w-full relative z-0">
									<thead>
										<tr className="border-y-2">
											<th className="py-2 border-x w-36 min-w-36">Mã mẫu thử</th>
											<th className="py-2 border-x w-[22%] min-w-60">Chỉ tiêu</th>
											<th className="py-2 border-x w-[20%] min-w-44">Phương pháp</th>
											<th className="py-2 border-x w-1/12 min-w-20">Kết quả</th>
											<th className="py-2 border-x w-1/12 min-w-20">Đơn vị</th>
											<th className="py-2 border-x w-1/12 min-w-28">Hạn trả</th>
											<th className="py-2 border-x w-[12%] min-w-36">Người thực hiện</th>
											<th className="py-2 border-2 text-center w-14 min-w-14">Xóa</th>
										</tr>
									</thead>
									<tbody>
										{listAnalytes.map((order) => (
											<tr key={`${getSampleUid(order.sample_id)}-${order.id}`}>
												<td className="p-1 border">{getSampleUid(order.sample_id)}</td>
												<td className="p-1 border text-start">{order.parameter_name}</td>
												<td className="p-1 border text-start">
													<span>
														<p>{order.protocol_code}</p>
														<p className="text-slate-300 text-sm">{order.protocol_source} </p>
													</span>
												</td>
												<td className="p-1 border relative" onClick={() => handleResultValueClick(order)}>
													{editingField === `result_value-${order.sample_id}-${order.id}` && isEditorVisible ? (
														<TinyMceInput value={inputValue} onUpdate={handleSaveContent} onKey={handleKeyDown} />
													) : (
														<div
															dangerouslySetInnerHTML={{
																__html: order.result_value || '--',
															}}
														/>
													)}
												</td>
												<td className="p-1 border relative" onClick={() => handleResultUnitClick(order)}>
													{editingField === `result_unit-${order.sample_id}-${order.id}` && isEditorVisible ? (
														<TinyMceInput value={inputValue} onUpdate={handleSaveContent} onKey={handleKeyDown} />
													) : (
														<div
															className="min-h-6"
															dangerouslySetInnerHTML={{
																__html: order.result_unit || '--',
															}}
														/>
													)}
												</td>
												<td className="p-1 border text-start">{formatDate(order.deadline)}</td>
												<td className="p-1 border text-start">{getTechnicianName(order.technician_uid)}</td>
												<td className="p-1 border text-center text-red-500">
													<button
														className="text-red-500 bg-white text-sm rounded-lg p-1.5 focus:outline-none text-center"
														onClick={() => handleDeleteConfirm(order.id, 'analysis')}
													>
														<FaTrashAlt size={20} />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</>
					) : viewMode === 'ppt' ? (
						renderPPTTable()
					) : (
						<div className="overflow-x-auto overflow-hidden">
							<table className="min-w-full text-black">
								<thead>
									<tr className="">
										<th className="py-2 border-2 text-start pl-2 w-36 min-w-36">Mã mẫu thử</th>
										<th className="py-2 border-2 text-start pl-2 w-[18%] min-w-44">Tên mẫu thử</th>
										<th className="py-2 border-2 text-start pl-2 w-[12%] min-w-32">Nền mẫu</th>
										<th className="py-2 border-2 text-start pl-2 w-[20%] min-w-48">Mô tả</th>
										<th className="py-2 border-2 text-start pl-2 w-32 min-w-32">Số lượng</th>
										<th className="py-2 border-2 text-start pl-2 w-32 min-w-32">Trạng thái</th>
										<th className="py-2 border-2 text-start pl-2 w-28 min-w-28">Mục đích</th>
										<th className="py-2 border-2 text-start pl-2 w-28 min-w-28">Chỉ tiêu</th>
										<th className="py-2 border-2 text-start pl-2 w-[14%] min-w-36">Yêu cầu</th>
										<th className="py-2 border-2 text-center  w-14 min-w-14">Xóa</th>
									</tr>
								</thead>
								<tbody className="border-2">
									{currentReceipt?.samples.map((sample, sampleIndex) => {
										const totalTests = sample.analysis.length;
										const completedTests =
											sample?.analysis?.filter(
												(order) => order?.result_value !== null && order?.result_value !== '<p></p>',
											)?.length || 0;
										const pendingTests = totalTests - completedTests;

										return (
											<tr key={sample.id}>
												<td className="p-2 px-1 border text-start text-text-secondary relative">
													<NavLink
														to={`/dashboard/sample?receipt_uid=${receipt_uid}&sample_uid=${sample.sample_uid}`}
														className="text-primary font-semibold hover:text-[#103667]"
													>
														{sample.sample_uid}
													</NavLink>
													{allAnalysesReviewed(sample) && (
														<span className="absolute top-1 right-2 text-yellow-500 font-bold">*</span>
													)}
													<span
														className="absolute top-1 right-1 text-blue-500 cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															window.open(
																`/dashboard/receipt/print_sp?receipt_uid=${currentReceipt?.receipt_uid}&sample_uid=${sample.sample_uid}`,
																'_blank',
															);
														}}
													>
														<FaTag size={14} />
													</span>
												</td>
												<td className="p-2 border text-start">
													{isEditMode ? (
														<textarea
															value={sample?.sample_name || ''}
															onChange={(e) => handleSampleChange(sample.id, 'sample_name', e.target.value)}
															onKeyDown={(e) => handleTextareaKeyDown(e, sample.id, 'sample_name', e.target.value)}
															onBlur={(e) => handleTextareaBlur(sample.id, 'sample_name', e.target.value)}
															className="p-1 border rounded-md w-full text-sm bg-white resize-none"
															rows={2}
														/>
													) : (
														displayValue(sample.sample_name)
													)}
												</td>
												<td className="p-2 border text-start">
													{isEditMode ? (
														<textarea
															value={sample.matrix || ''}
															onChange={(e) => handleSampleChange(sample.id, 'matrix', e.target.value)}
															onKeyDown={(e) => handleTextareaKeyDown(e, sample.id, 'matrix', e.target.value)}
															onBlur={(e) => handleTextareaBlur(sample.id, 'matrix', e.target.value)}
															className="p-1 border rounded-md w-full text-sm bg-white resize-none"
															rows={2}
														/>
													) : (
														displayValue(sample.matrix)
													)}
												</td>
												<td className="p-2 border text-start">
													{isEditMode ? (
														<textarea
															value={sample.sample_description || ''}
															onChange={(e) => handleSampleChange(sample.id, 'sample_description', e.target.value)}
															onKeyDown={(e) =>
																handleTextareaKeyDown(e, sample.id, 'sample_description', e.target.value)
															}
															onBlur={(e) => handleTextareaBlur(sample.id, 'sample_description', e.target.value)}
															className="p-1 border rounded-md w-full text-sm bg-white resize-none"
															rows={2}
														/>
													) : (
														displayValue(sample.sample_description)
													)}
												</td>
												<td className="p-2 border text-start">
													{isEditMode ? (
														<textarea
															value={sample.sample_volume || ''}
															onChange={(e) => handleSampleChange(sample.id, 'sample_volume', e.target.value)}
															onKeyDown={(e) => handleTextareaKeyDown(e, sample.id, 'sample_volume', e.target.value)}
															onBlur={(e) => handleTextareaBlur(sample.id, 'sample_volume', e.target.value)}
															className="p-1 border rounded-md w-full text-sm bg-white resize-none"
															rows={2}
														/>
													) : (
														displayValue(sample.sample_volume)
													)}
												</td>
												<td className="p-2 border text-start">
													{isEditMode ? (
														<select
															value={sample.status}
															onChange={(e) => handleSelectChange(e, sample.id, 'status')}
															className="p-1 border rounded-md w-full text-sm bg-white"
														>
															{status.map((statusName, index) => (
																<option key={index} value={index}>
																	{statusName}
																</option>
															))}
														</select>
													) : (
														status[sample.status] || <span className="text-start block">--</span>
													)}
												</td>
												<td className="p-2 border text-start">
													{isEditMode ? (
														<select
															value={sample.purpose || ''}
															onChange={(e) => handleSelectChange(e, sample.id, 'purpose')}
															className="p-1 border rounded-md w-full text-sm bg-white"
														>
															<option value="">--</option>
															{purposes.map((purpose, index) => (
																<option key={index} value={purpose}>
																	{purpose}
																</option>
															))}
														</select>
													) : (
														displayValue(sample.purpose)
													)}
												</td>
												<td className="p-2 border text-start">
													{completedTests} / {pendingTests} / {totalTests}
												</td>
												<td className="p-2 border text-start">
													{isEditMode ? (
														<textarea
															value={sample.additional_request || ''}
															onChange={(e) => handleSampleChange(sample.id, 'additional_request', e.target.value)}
															onKeyDown={(e) =>
																handleTextareaKeyDown(e, sample.id, 'additional_request', e.target.value)
															}
															onBlur={(e) => handleTextareaBlur(sample.id, 'additional_request', e.target.value)}
															className="p-1 border rounded-md w-full text-sm bg-white resize-none"
															rows={2}
														/>
													) : (
														displayValue(sample.additional_request)
													)}
												</td>
												<td className=" border text-center text-red-500">
													<button
														className="text-red-500 bg-white text-sm rounded-lg p-1.5 focus:outline-none text-center"
														onClick={() => handleDeleteConfirm(sample.id, 'sample')}
													>
														<FaTrashAlt size={20} />
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
			{/* Only show payment confirmation and delete confirmation dialogs for non-technicians */}{' '}
			{!isTechnician() && isPaymentConfirmVisible && renderPayStatusConfirm()}
			{isDeleteConfirmVisible &&
				renderDeleteConfirm(
					'Bạn có chắc chắn muốn xóa mục này?',
					deleteType === 'sample' ? handleDeleteSampleConfirmAction : handleDeleteAnalysisConfirmAction,
				)}
			{/* EmailForm */}
			<EmailForm receipt={currentReceipt} isVisible={isEmailFormVisible} onClose={() => setIsEmailFormVisible(false)} />
		</div>
	);
};

export default ReceiptInfor;
