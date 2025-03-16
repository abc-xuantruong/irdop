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
import { FaTrashAlt, FaEdit, FaCheck, FaMoneyBillWave } from 'react-icons/fa'; // Keep FaMoneyBillWave for the revenue section icon
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import CreateReceipt from './CreateReceipt';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2';

const ReceiptInfor = ({ receipt }) => {
	const { setCurrentTitlePage, currentUser, technicians, status, purposes, formatDate, getIdenByUid, identityCache } =
		useContext(GlobalContext);
	const [listAnalytes, setListAnalytes] = useState([]);
	const [currentReceipt, setCurrentReceipt] = useState(null);
	const [editingField, setEditingField] = useState(null);
	const [inputValue, setInputValue] = useState('');
	const [isEditorVisible, setIsEditorVisible] = useState(false);
	const [viewMode, setViewMode] = useState('sample'); // 'analyte' or 'sample'
	const [isAddingSample, setIsAddingSample] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false); // Add edit mode state

	// Keep editingRevenueField state but remove showRevenueSection
	const [editingRevenueField, setEditingRevenueField] = useState(null);

	const [newSample, setNewSample] = useState({
		sample_name: '',
		matrix: '',
		sample_description: '',
		sample_volume: '',
		purpose: '',
		additional_request: '',
	});
	const [sampleInformation, setSampleInformation] = useState([
		{ fname: 'Số lô / LOT no.', fvalue: '' },
		{ fname: 'Ngày sản xuất / mfg.', fvalue: '' },
		{ fname: 'Hạn sử dụng / exp.', fvalue: '' },
		{ fname: 'Nơi sản / mfr.', fvalue: '' },
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
				handleInputChange({ target: { name: 'receipt_date', value: parsedDate } });
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
			handleInputChange({ target: { name: 'receipt_date', value: tempReceiptDate } });
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
					handleInputChange({ target: { name: 'deadline', value: parsedDate } });
					// Update API with the new date
					handleReceiptApiUpdate('deadline', parsedDate);
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: 'Định dạng ngày không hợp lệ. Sử dụng định dạng DD/MM/YYYY hoặc DDMMYYYY',
					});
					// Restore previous value
					handleInputChange({ target: { name: 'deadline', value: tempDeadline } });
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
			handleInputChange({ target: { name: 'deadline', value: tempDeadline } });
			if (document.activeElement) {
				document.activeElement.blur();
			}
			setIsDeadlineFocused(false);
		}
	};

	useEffect(() => {
		setCurrentTitlePage('Tiếp nhận mẫu');
	}, []);

	const fetchReceipt = async () => {
		try {
			const response = await apiGet(`https://black.irdop.org/khsi19me/db/get/receipt_full/${receipt_uid}`);
			console.log(response.status);
			if (response.status === 200) {
				setCurrentReceipt(response.data);
				setListAnalytes(response.data.samples.flatMap((sample) => sample.analysis));

				// Fetch user information for created_by_uid and modified_by_uid
				if (response.data.created_by_uid) {
					fetchUserIdentity(response.data.created_by_uid);
				}
				if (response.data.modified_by_uid) {
					fetchUserIdentity(response.data.modified_by_uid);
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
			const payload = {
				sample: {
					id: sampleId,
					[field]: newValue,
					modified_by_uid: currentUser.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', payload);

			if (response.status === 200) {
				showToast(`Cập nhật thông tin thành công!`);
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

	// Handle select change - immediately update both UI and API
	const handleSelectChange = (e, sampleId, field) => {
		const newValue = e.target.value;
		handleSampleChange(sampleId, field, newValue);
		handleSampleApiUpdate(sampleId, field, newValue);
	};

	const handleResultValueClick = (order) => {
		setEditingField(`result_value-${order.sample_id}-${order.id}`);

		setInputValue(order.result_value ? String(order.result_value) : ''); // Đảm bảo giá trị là chuỗi
		setIsEditorVisible(true);
	};

	const handleResultUnitClick = (order) => {
		setEditingField(`result_unit-${order.sample_id}-${order.id}`);
		setInputValue(order.result_unit ? String(order.result_unit) : ''); // Đảm bảo giá trị là chuỗi
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
				analysis: { ...analysis, modified_by_uid: currentUser.identity_uid },
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

	// Replace the existing handleSaveContent function
	const handleSaveContent = async (newValue) => {
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
		const requiredFields = ['sample_name', 'matrix', 'sample_description', 'sample_volume', 'purpose'];
		const isValid = requiredFields.every((field) => newSample[field].trim() !== '');

		if (!isValid) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Vui lòng nhập đầy đủ thông tin bắt buộc',
			});
			return;
		}

		const newSampleData = {
			receipt_id: currentReceipt.id,
			...newSample,
			sample_information: JSON.stringify([
				{ fname: 'Tên mẫu / name.', fvalue: newSample?.sample_name || '' },
				...sampleInformation,
				{ fname: 'Ngày tiếp nhận / Receipt date.', fvalue: formatDate(currentReceipt.receipt_date) || '' },
				{ fname: 'Mô tả / desc.', fvalue: newSample?.sample_description || '' },
			]),
			created_by_uid: currentUser.identity_uid,
			modified_by_uid: currentUser.identity_uid,
		};
		console.log(newSampleData);
		try {
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/insert/sample', { sample: newSampleData });
			if (response.status === 200) {
				showToast('Thêm mẫu mới thành công!', {
					autoClose: 1000,
				});
				setNewSample({
					sample_name: '',
					matrix: '',
					sample_description: '',
					sample_volume: '',
					purpose: '',
					additional_request: '',
				});
				setSampleInformation((informations) => {
					return informations.map((info) => {
						return { ...info, fvalue: '' };
					});
				});
				setCheckConfirm(false);
				fetchReceipt(); // Fetch updated data
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Thêm mẫu mới thất bại. Vui lòng thử lại',
				});
			}
		} catch (error) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra. Vui lòng thử lại',
			});
		}

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

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		const keys = name.split('.');
		if (keys.length > 1) {
			setCurrentReceipt((prev) => {
				const updatedReceipt = { ...prev };
				let nestedObject = updatedReceipt;
				for (let i = 0; i < keys.length - 1; i++) {
					nestedObject = nestedObject[keys[i]];
				}
				nestedObject[keys[keys.length - 1]] = value;
				return updatedReceipt;
			});
		} else {
			setCurrentReceipt((prev) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	const handleCustomerSearch = (e) => {
		const { value } = e.target;
		setCurrentReceipt((prev) => ({
			...prev,
			client: {
				...prev.client,
				client_uid: value,
			},
		}));

		if (value.length >= 5) {
			// Implement search logic here
		}
	};

	const handleContactSearch = (e) => {
		const { value } = e.target;
		setCurrentReceipt((prev) => ({
			...prev,
			contact: {
				name: value,
			},
		}));

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
			// Copy sample data to the form
			setNewSample({
				sample_name: sampleToCopy.sample_name || '',
				matrix: sampleToCopy.matrix || '',
				sample_description: sampleToCopy.sample_description || '',
				sample_volume: sampleToCopy.sample_volume || '',
				purpose: sampleToCopy.purpose || '',
				additional_request: sampleToCopy.additional_request || '',
			});

			// Try to parse sample_information if it exists
			try {
				if (sampleToCopy.sample_information) {
					const parsedInfo =
						typeof sampleToCopy.sample_information === 'string'
							? JSON.parse(sampleToCopy.sample_information)
							: sampleToCopy.sample_information;

					// Filter out entries we're already copying elsewhere
					const filteredInfo = parsedInfo.filter(
						(item) =>
							item.fname !== 'Tên mẫu / name.' &&
							item.fname !== 'Ngày tiếp nhận / Receipt date.' &&
							item.fname !== 'Mô tả / desc.',
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
				</div>
				<div className="flex justify-end mt-4">
					<div className="flex-1">
						<select
							className="bg-white border rounded p-1 mr-2"
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
			console.log(deleteItemId);
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
		console.log(deleteItemId);
		try {
			const response = await axios.post('https://black.irdop.org/trelw82ki/db/delete/analysis', {
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
			const excelMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

			// Using apiGet function with correct headers and responseType
			const response = await fetch(`https://black.irdop.org/xlsx/download/${receipt_uid}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.getItem('token')}`, // Ensure authentication if needed
				},
				// Don't set responseType here as fetch handles this differently
			});

			if (response.ok) {
				// Get the blob directly from the response
				const blob = await response.blob();

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
				console.error('Error downloading file:', response.status, response.statusText);
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
			return <span className="text-start block">--</span>;
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
			const payload = {
				receipt: {
					id: currentReceipt.id,
					[field]: value,
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

	if (!currentReceipt) {
		return <div>Loading...</div>;
	}

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
			`}</style>

			<Breadcrumb
				paths={[
					{ name: 'Danh sách', link: '/' },
					{
						name: `${currentReceipt?.receipt_uid}`,
						link: `/dashboard/receipt?receipt_uid=${currentReceipt?.receipt_uid}`,
					},
				]}
			/>
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
			<div className="rounded-lg w-full p-4 bg-white ">
				{/* Payment status indicator - keep at top right */}
				<div className="flex items-center cursor-pointer justify-end" onClick={handlePayStatusToggle}>
					<div
						className={`w-2 h-2 rounded-full mr-2 ${currentReceipt?.pay_status === 1 ? 'bg-green-600' : 'bg-red-500'}`}
					></div>
					<span
						className={`font-medium text-sm ${currentReceipt?.pay_status === 1 ? 'text-green-600' : 'text-red-500'}`}
					>
						{currentReceipt?.pay_status === 1 ? 'Đã thanh toán' : 'Chưa thanh toán'}
					</span>
				</div>

				{/* Revenue Recognition Section - Modified styling with increased text size */}
				<div className="w-full mb-2 border-b pb-2">
					<div className="flex justify-start items-center mb-1">
						<FaMoneyBillWave size={14} className="text-blue-600 mr-1.5" />
						<h3 className="text-sm font-medium text-blue-600">Ghi nhận doanh số</h3>
					</div>

					{/* Responsive grid with 2 columns on small screens */}
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
						<div className="col-span-1">
							<label className="block text-sm font-medium text-gray-700 mb-0.5 text-left">Mã đơn hàng</label>
							<div className="py-0.5 px-2 border rounded-md bg-gray-50 min-h-[32px] text-sm flex items-center">
								{currentReceipt?.order_code || '--'}
							</div>
						</div>

						<div className="col-span-1">
							<label className="block text-sm font-medium text-gray-700 mb-0.5 text-left">Mã báo giá</label>
							<div className="py-0.5 px-2 border rounded-md bg-gray-50 min-h-[32px] text-sm flex items-center">
								{currentReceipt?.quote_code || '--'}
							</div>
						</div>

						<div className="col-span-1">
							<label className="block text-sm font-medium text-gray-700 mb-0.5 text-left">Người ghi nhận</label>
							<div className="py-0.5 px-2 border rounded-md bg-gray-50 min-h-[32px] text-sm flex items-center">
								{currentReceipt?.sale_recorder || '--'}
							</div>
						</div>

						<div className="col-span-1">
							<label className="block text-sm font-medium text-gray-700 mb-0.5 text-left">Tổng doanh số</label>
							<div
								className={`py-0.5 px-2 border rounded-md bg-gray-50 min-h-[32px] text-sm flex items-center ${
									currentReceipt?.pay_status === 1 ? 'text-green-600 font-medium' : ''
								}`}
							>
								{currentReceipt?.total_amount ? `${parseInt(currentReceipt.total_amount).toLocaleString()} ₫` : '--'}
							</div>
						</div>
					</div>
				</div>

				<div className="flex flex-col md:flex-row">
					<div className={`flex justify-between items-start p-0 rounded-md border flex-col md:flex-row w-full`}>
						{/* Receipt Information Section - Added padding and increased text size */}
						<div className="w-full md:w-1/2 flex flex-col items-start px-2">
							{/* Receipt Information Section Header */}
							<div className="flex justify-center items-center w-full py-1">
								<CgFileDocument size={16} className="text-primary" />
								<h2 className="text-md font-semibold w-fit text-primary px-1">THÔNG TIN TIẾP NHẬN</h2>
							</div>

							{/* Receipt Information Fields - Increased text size */}
							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Số yêu cầu đến:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="number"
										name="request_number"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={currentReceipt?.request_number}
										onChange={handleInputChange}
										onKeyDown={(e) => handleReceiptInputKeyDown(e, 'request_number', currentReceipt?.request_number)}
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Mã tiếp nhận:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="text"
										name="receipt_uid"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={currentReceipt?.receipt_uid}
										onChange={handleInputChange}
										disabled
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Ngày tiếp nhận:</div>
								<div className="text-sm w-full flex item-start rounded-lg border">
									<DatePicker
										selected={currentReceipt?.receipt_date}
										onChange={handleReceiptDateChange}
										onBlur={handleReceiptDateBlur}
										onFocus={handleReceiptDateFocus}
										onKeyDown={handleReceiptDateKeyDown}
										onChangeRaw={handleReceiptDateInputChange}
										dateFormat="dd/MM/yyyy"
										className="bg-white px-1 py-0.5 rounded-lg focus:outline-none w-full text-sm"
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Người tiếp nhận:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="text"
										name="created_by_uid"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={getUserName(currentReceipt?.created_by_uid)}
										onChange={handleInputChange}
										disabled
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Hạn trả kết quả:</div>
								<div className="text-sm w-full flex item-start rounded-lg border">
									<DatePicker
										selected={currentReceipt?.deadline}
										onChange={handleDeadlineChange}
										onBlur={handleDeadlineBlur}
										onFocus={handleDeadlineFocus}
										onKeyDown={handleDeadlineKeyDown}
										dateFormat="dd/MM/yyyy"
										className="bg-white px-1 py-0.5 rounded-lg focus:outline-none w-full text-sm"
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Số lượng mẫu:</div>
								<div className="text-sm w-full flex items-center">
									<p className="flex items-center w-12 font-medium text-sm">{currentReceipt?.samples.length}</p>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Ghi chú</div>
								<div className="text-sm w-full flex item-start">
									<textarea
										name="note"
										className="w-full px-1 py-0.5 border bg-white rounded-lg resize-none text-sm"
										rows="3"
										value={currentReceipt?.note}
										onChange={handleInputChange}
										onKeyDown={(e) => handleReceiptInputKeyDown(e, 'note', currentReceipt?.note)}
									/>
								</div>
							</div>
						</div>

						{/* Customer and Contact Information - Added padding, adjusted min-width, increased text size */}
						<div className="w-full md:w-1/2 flex flex-col items-start px-2">
							<div className="flex justify-center items-center w-full py-1">
								<div className="flex items-center pl-2">
									<TiBusinessCard size={16} className="text-primary mr-1" />
									<h2 className="text-md font-semibold w-full text-primary">THÔNG TIN KHÁCH HÀNG</h2>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Mã khách hàng:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="text"
										name="client.client_uid"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={currentReceipt?.client?.client_uid}
										onChange={handleCustomerSearch}
										onKeyDown={(e) => handleClientInputKeyDown(e, 'client_uid', currentReceipt?.client?.client_uid)}
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Công ty/cá nhân:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="text"
										name="client.client_name"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={currentReceipt?.client?.client_name}
										onChange={handleInputChange}
										onKeyDown={(e) => handleClientInputKeyDown(e, 'client_name', currentReceipt?.client?.client_name)}
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Địa chỉ:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="text"
										name="client.client_address"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={currentReceipt?.client?.client_address}
										onChange={handleInputChange}
										onKeyDown={(e) =>
											handleClientInputKeyDown(e, 'client_address', currentReceipt?.client?.client_address)
										}
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Mã số thuế/CCCD:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="text"
										name="legal_id"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={currentReceipt?.client?.legal_id}
										onChange={handleInputChange}
										onKeyDown={(e) => handleClientInputKeyDown(e, 'legal_id', currentReceipt?.client?.legal_id)}
									/>
								</div>
							</div>

							{/* Contact Information Section Header */}
							<div className="flex justify-center items-center w-full py-1 mt-1">
								<div className="flex items-center pl-2">
									<MdOutlineContactPhone size={16} className="text-primary mr-1" />
									<h2 className="text-md font-semibold w-fit text-primary">THÔNG TIN LIÊN HỆ</h2>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Họ tên:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="text"
										name="contact.name"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={currentReceipt?.contact?.name}
										onChange={handleContactSearch}
										onKeyDown={(e) => handleContactInputKeyDown(e, 'name', currentReceipt?.contact?.name)}
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Email:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="text"
										name="contact.email"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={currentReceipt?.contact?.email}
										onChange={handleInputChange}
										onKeyDown={(e) => handleContactInputKeyDown(e, 'email', currentReceipt?.contact?.email)}
									/>
								</div>
							</div>

							<div className="flex justify-start w-full py-1">
								<div className="text-sm font-semibold w-1/4 flex item-start py-0.5 px-1 min-w-32">Điện thoại:</div>
								<div className="text-sm w-full flex item-start">
									<input
										type="text"
										name="contact.phone"
										className="bg-white border px-1 py-0.5 w-full rounded-lg text-sm"
										value={currentReceipt?.contact?.phone}
										onChange={handleInputChange}
										onKeyDown={(e) => handleContactInputKeyDown(e, 'phone', currentReceipt?.contact?.phone)}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{/* Rest of the component remains unchanged */}
			<div className="bg-white rounded-lg w-full my-4 p-4">
				<div className="flex justify-between items-start sm:h-10 sm:flex-row flex-col h-[76px] ">
					<div className="w-full flex justify-start overflow-auto mr-1">
						<button
							className={`px-2 py-1 rounded-lg focus:outline-none h-fit min-w-40  ${
								viewMode === 'sample' ? 'bg-blue-200' : 'bg-gray-200'
							}`}
							onClick={() => setViewMode('sample')}
						>
							Danh sách mẫu thử
						</button>
						<button
							className={`ml-2 px-2 py-1 rounded-lg focus:outline-none h-fit min-w-40 ${
								viewMode === 'analyte' ? 'bg-blue-200' : 'bg-gray-200'
							}`}
							onClick={() => setViewMode('analyte')}
						>
							Danh sách chỉ tiêu
						</button>
					</div>

					{viewMode === 'analyte' ? (
						<FilterBar
							source={currentReceipt.samples.flatMap((sample) => sample.analysis)}
							setCurrentList={setListAnalytes}
							typeSearch={'analysis'}
							className="absolute right-0"
						/>
					) : (
						<div className="flex items-center space-x-2">
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
														<div dangerouslySetInnerHTML={{ __html: order.result_value || '--' }} />
													)}
												</td>
												<td className="p-1 border relative" onClick={() => handleResultUnitClick(order)}>
													{editingField === `result_unit-${order.sample_id}-${order.id}` && isEditorVisible ? (
														<TinyMceInput value={inputValue} onUpdate={handleSaveContent} onKey={handleKeyDown} />
													) : (
														<div className="min-h-6" dangerouslySetInnerHTML={{ __html: order.result_unit || '--' }} />
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
										const completedTests = sample.analysis.filter((order) => order.result_value !== '').length;
										const pendingTests = totalTests - completedTests;

										return (
											<tr key={sample.id}>
												<td className="p-2 border text-start text-text-secondary">
													<NavLink
														to={`/dashboard/sample?receipt_uid=${receipt_uid}&sample_uid=${sample.sample_uid}`}
														className="text-primary font-semibold hover:text-[#103667]"
													>
														{sample.sample_uid}
													</NavLink>
												</td>
												<td className="p-2 border text-start">
													{isEditMode ? (
														<textarea
															value={sample?.sample_name || ''}
															onChange={(e) => handleSampleChange(sample.id, 'sample_name', e.target.value)}
															onKeyDown={(e) => handleTextareaKeyDown(e, sample.id, 'sample_name', e.target.value)}
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
			{isPaymentConfirmVisible && renderPayStatusConfirm()}
			{isDeleteConfirmVisible &&
				renderDeleteConfirm(
					'Bạn có chắc chắn muốn xóa mục này?',
					deleteType === 'sample' ? handleDeleteSampleConfirmAction : handleDeleteAnalysisConfirmAction,
				)}
		</div>
	);
};

export default ReceiptInfor;
