import * as React from 'react';
const { useContext, useState, useEffect, useRef } = React;
import TinyMceInput from '../components/Input';
import { GlobalContext } from '../contexts/GlobalContext';
import Breadcrumb from '../components/Breadcrumb';
import FilterBar from '../components/FilterBar';
import { NavLink, useSearchParams, useNavigate } from 'react-router-dom';
import { PiDownloadSimpleBold } from 'react-icons/pi';
import { CgFileDocument } from 'react-icons/cg';
import { TiBusinessCard } from 'react-icons/ti';
import { MdOutlineContactPhone, MdCalendarMonth } from 'react-icons/md';
import {
	FaTrashAlt,
	FaEdit,
	FaCheck,
	FaMoneyBillWave,
	FaFilePdf,
	FaTag,
	FaImage,
	FaUpload,
	FaFile,
	FaFolder,
	FaQrcode,
	FaCamera,
	FaUserCog,
	FaSync,
	FaDatabase,
	FaLayerGroup,
	FaStar,
} from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import CreateReceipt from '../components/CreateReceipt';
import { apiGet, apiPost, apiGetBlob, apiPostBlob } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2';
import axios from 'axios'; // Add axios import
import FileForm from '../components/FileForm';
import EmailForm from '../components/EmailForm';
import SampleImageUpload from '../components/SampleImageUpload';
import { Html5QrcodeScanner } from 'html5-qrcode';

const ReceiptInfor = ({ receipt }) => {
	const { setCurrentTitlePage, currentUser, technicians, status, purposes, formatDate, getIdenByUid, identityCache } =
		useContext(GlobalContext);
	const [listAnalytes, setListAnalytes] = useState([]);
	const [currentReceipt, setCurrentReceipt] = useState(null);
	const [editingField, setEditingField] = useState(null);
	const [inputValue, setInputValue] = useState('');
	const [isEditorVisible, setIsEditorVisible] = useState(false);
	const [viewMode, setViewMode] = useState('analyte'); // 'analyte' or 'sample'
	const [isAddingSample, setIsAddingSample] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false); // Add edit mode state

	// Keep editingRevenueField state but remove showRevenueSection
	const [editingRevenueField, setEditingRevenueField] = useState(null);

	// Add states for bulk analysis operations
	const [selectedAnalytes, setSelectedAnalytes] = useState([]); // Add state to track selected analytes
	const [selectAllAnalytes, setSelectAllAnalytes] = useState(false); // Add state for select all checkbox
	const [isTransferMultipleVisible, setIsTransferMultipleVisible] = useState(false);
	const [selectedTechnician, setSelectedTechnician] = useState(null);
	const [isBulkDeadlineVisible, setIsBulkDeadlineVisible] = useState(false);
	const [bulkDeadlineDate, setBulkDeadlineDate] = useState(new Date());
	const [newSample, setNewSample] = useState({
		sampleName: '',
		matrix: '',
		sample_description: '',
		sample_volume: '',
		purpose: '',
		additionalRequest: '',
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
	const receiptId = searchParams.get('receiptId') || searchParams.get('receiptId');
	const navigate = useNavigate();
	const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
	const [scientificFields, setScientificFields] = useState([]);
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

	// State for EmailForm visibility
	const [isEmailFormVisible, setIsEmailFormVisible] = useState(false);
	const [emailFormData, setEmailFormData] = useState({
		from: '',
		to: '',
		subject: '',
		body: '',
		attachments: [],
	});
	const [isLoadingEmailData, setIsLoadingEmailData] = useState(false);
	const [isFileFormVisible, setIsFileFormVisible] = useState(false);

	// Add state for sample image
	const [sampleImageUrl, setSampleImageUrl] = useState('');
	const [isLoadingImage, setIsLoadingImage] = useState(false);
	const [imageError, setImageError] = useState(false);

	// QR Code states
	const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
	const [currentUrl, setCurrentUrl] = useState('');
	const [cameraPermission, setCameraPermission] = useState(null); // null, 'granted', 'denied'
	const [isRequestingPermission, setIsRequestingPermission] = useState(false);
	const qrScannerRef = useRef(null);

	// Note modal states
	const [showNoteModal, setShowNoteModal] = useState(false);
	const [selectedAnalysisForNote, setSelectedAnalysisForNote] = useState(null);
	const [newNoteText, setNewNoteText] = useState('');
	const [isUpdatingNote, setIsUpdatingNote] = useState(false);

	// Tooltip state
	const [tooltip, setTooltip] = useState({
		visible: false,
		content: '',
		x: 0,
		y: 0,
		position: 'above',
	});

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
		handleInputChange({ target: { name: 'receiptDate', value: date } });
	};

	// Handle the receipt DatePicker blur event
	const handleReceiptDateBlur = () => {
		if (isReceiptDateFocused && currentReceipt?.receiptDate) {
			// Only make API call when focus is lost and there's a value
			handleReceiptApiUpdate('receiptDate', currentReceipt.receiptDate);
			setIsReceiptDateFocused(false);
		}
	};

	// Handle receipt DatePicker focus
	const handleReceiptDateFocus = () => {
		setIsReceiptDateFocused(true);
		setTempReceiptDate(currentReceipt?.receiptDate);
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
					target: { name: 'receiptDate', value: parsedDate },
				});
				// Update API with the new date
				handleReceiptApiUpdate('receiptDate', parsedDate);

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
				target: { name: 'receiptDate', value: tempReceiptDate },
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

	// Add tooltip CSS
	useEffect(() => {
		const style = document.createElement('style');
		style.innerHTML = `
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
			max-width: 350px;
			min-width: 200px;
			word-wrap: break-word;
		}
		.custom-tooltip.visible {
			opacity: 1;
		}
		.custom-tooltip.left {
			transform: translateX(-100%) translateY(-50%);
		}
		.custom-tooltip.right {
			transform: translateX(0) translateY(-50%);
		}
		.custom-tooltip.above {
			transform: translateX(-50%) translateY(-100%);
		}
		.custom-tooltip.below {
			transform: translateX(-50%) translateY(0);
		}
		`;
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, []);

	// Get current URL for QR code
	useEffect(() => {
		setCurrentUrl(window.location.href);
	}, [window.location.href]);

	// Check camera permission on component mount
	useEffect(() => {
		const checkCameraPermission = async () => {
			try {
				// Chỉ kiểm tra nếu trình duyệt hỗ trợ
				if (
					navigator.permissions &&
					navigator.permissions.query &&
					navigator.mediaDevices &&
					navigator.mediaDevices.getUserMedia
				) {
					const permission = await navigator.permissions.query({ name: 'camera' });
					setCameraPermission(permission.state);

					// Listen for permission changes
					permission.onchange = () => {
						setCameraPermission(permission.state);
					};
				} else {
					// Trình duyệt không hỗ trợ, để null
					setCameraPermission(null);
				}
			} catch (error) {
				console.log('Cannot check camera permission:', error);
				setCameraPermission(null);
			}
		};

		checkCameraPermission();
	}, []);

	// Cleanup QR scanner when component unmounts
	useEffect(() => {
		return () => {
			if (qrScannerRef.current) {
				qrScannerRef.current.clear().catch((error) => {
					console.error('Failed to clear QR scanner on cleanup:', error);
				});
			}
		};
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

	// Function to adjust dates for API submission - convert to GMT+7 at 7 AM
	const adjustDateForApiSubmission = (dateValue) => {
		if (!dateValue) return null;

		// Create a date object with the selected date at 7 AM GMT+7
		const selectedDate = new Date(dateValue);
		selectedDate.setHours(7, 0, 0, 0); // Set to 7:00:00 AM

		// Convert to ISO string for GMT+7 timezone
		const vietnamOffset = 7 * 60; // GMT+7 in minutes
		const localOffset = selectedDate.getTimezoneOffset(); // Local timezone offset in minutes
		const totalOffset = vietnamOffset + localOffset; // Total offset to add

		const gmtPlus7Date = new Date(selectedDate.getTime() + totalOffset * 60000);
		return gmtPlus7Date.toISOString();
	};

	// Function to fetch sample image if _deprecated_sampleImageId exists
	const fetchSampleImage = async (sampleImgUid) => {
		if (!sampleImgUid) {
			console.log('No sampleImgUid provided');
			return;
		}

		console.log('Fetching sample image for UID:', sampleImgUid);
		setIsLoadingImage(true);
		setImageError(false);

		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: 'view',
				fileRecord: { id: sampleImgUid },
			});

			console.log('Image fetch response:', response);

			if (response.status === 200 && response.data) {
				console.log('Setting sample image URL:', response.data);
				setSampleImageUrl(response.data);
			} else {
				console.log('Error: Invalid response status or no data');
				setImageError(true);
			}
		} catch (error) {
			console.error('Error fetching sample image:', error);
			setImageError(true);
		} finally {
			setIsLoadingImage(false);
		}
	};

	const fetchReceipt = async () => {
		try {
			// Use new API endpoint with proper request body
			const response = await apiPost('https://red.irdop.org/v1/receipt/get/full', {
				receiptId: receiptId,
			});

			if (response.status === 200) {
				console.log('Receipt API Response:', response.data); // Debug log

				// Process data with new camelCase structure and adjust timezone for dates
				const receiptData = response.data;

				// Handle both camelCase and snake_case for backward compatibility
				if (receiptData.receiptDate) {
					receiptData.receiptDate = adjustTimezoneDate(receiptData.receiptDate);
				}
				if (receiptData.deadline) {
					receiptData.deadline = adjustTimezoneDate(receiptData.deadline);
				}

				// Transform client object fields to camelCase if they exist in snake_case
				if (receiptData.client) {
					const client = receiptData.client;
					// API now returns proper camelCase, no transformation needed
					// Keep for backward compatibility if needed
				}

				// Adjust timezone for all sample deadlines and map camelCase
				if (receiptData.samples) {
					receiptData.samples.forEach((sample) => {
						// Map sample properties to camelCase
						sample.sampleId = sample.sampleId;
						sample.sampleName = sample.sampleName || sample.sampleName;
						sample.sampleDescription = sample.sampleDescription || sample.sample_description;
						sample.sampleInformation = sample.sampleInformation || sample.sample_information;
						sample.sampleVolume = sample.sampleVolume || sample.sample_volume;
						sample.additionalRequest = sample.additionalRequest || sample.additionalRequest;
						// Map new API fields
						sample.matrix = sample.matrix; // Already in camelCase
						sample.status = sample.status; // Already in camelCase
						sample.purpose = sample.purpose; // Already in camelCase
						sample.refNumber = sample.refNumber; // Already in camelCase
						sample.modifiedAt = sample.modifiedAt; // Already in camelCase

						// Handle both old 'analysis' and new 'analyses' structure
						const analyses = sample.analyses || sample.analysis;
						if (analyses) {
							analyses.forEach((analysis) => {
								// Map analysis properties to camelCase
								analysis.sampleId = analysis.sampleId;
								analysis.parameterId = analysis.parameterId;
								analysis.parameterName = analysis.parameterName || analysis.parameterName;
								analysis.parameterUid = analysis.parameterUid || analysis.parameterUid;
								analysis.resultValue = analysis.resultValue || analysis.resultValue;
								analysis.resultUnit = analysis.resultUnit || analysis.resultUnit;
								analysis.protocolCode = analysis.protocolCode || analysis.protocolCode;
								analysis.protocolSource = analysis.protocolSource || analysis.protocolSource;
								analysis.technicianId = analysis.technicianId || analysis.technician_id;
								analysis.technicianAlias = analysis.technicianAlias || analysis.technician_alias;
								analysis.technicianIds = analysis.technicianIds || analysis.technician_ids;
								analysis.displayStyle = analysis.displayStyle || analysis.display_style;
								analysis.docId = analysis.docId || analysis.docId;
								analysis.scientificField = analysis.scientificField || analysis.scientific_field;
								analysis.protocolSource = analysis.protocolSource || analysis.protocolSource;
								analysis.technicianUid = analysis.technicianUid || analysis.technicianUid;
								analysis.createdByUid = analysis.createdByUid;
								analysis.modifiedByUid = analysis.modifiedByUid || analysis.modified_by_uid;

								if (analysis.deadline) {
									analysis.deadline = adjustTimezoneDate(analysis.deadline);
								}
							});
							// Ensure sample has analyses field for new API structure
							sample.analyses = analyses;
						}
					});
				}

				setCurrentReceipt(receiptData);
				setListAnalytes(receiptData.samples?.flatMap((sample) => sample.analyses || sample.analysis || []) || []);

				// Store original values for comparison with new camelCase structure
				setOriginalValues({
					_deprecated_recordCode: receiptData._deprecated_recordCode || '',
					_deprecated_requestNumber: receiptData._deprecated_requestNumber || '',
					_deprecated_trackingNumber: receiptData._deprecated_trackingNumber || '',
					receiptId: receiptData.receiptId || '',
					receiptDate: receiptData.receiptDate || null,
					deadline: receiptData.deadline || null,
					note: receiptData.note || '',
					quoteId: receiptData.quoteId || '',
					orderId: receiptData.orderId || '',
					totalFeeBeforeTax: receiptData.totalFeeBeforeTax || '',
					salePerson: receiptData.salePerson || '',
					'client.clientName': receiptData.client?.clientName || '',
					'client.clientUID': receiptData.client?.clientUID || '',
					'client.clientPhone': receiptData.client?.clientPhone || '',
					'client.invoiceEmail': receiptData.client?.invoiceEmail || '',
					'client.clientAddress': receiptData.client?.clientAddress || '',
					'client.legalId': receiptData.client?.legalId || '',
					'contact.name': receiptData.contactPerson?.name || '',
					'contact.phone': receiptData.contactPerson?.phone || '',
					'contact.email': receiptData.contactPerson?.email || '',
					'contact.id': receiptData.contactPerson?.id || '',
					'contact.id_date': receiptData.contactPerson?.id_date || '',
					'contact.id_place': receiptData.contactPerson?.id_place || '',
					'receiver.address': receiptData.reportRecipient?.address || '',
					'receiver.name': receiptData.reportRecipient?.name || '',
					'reportRecipient.email': receiptData.reportRecipient?.email || '',
					'reportRecipient.other': receiptData.reportRecipient?.other || '',
				}); // Fetch user information for createdByUid and modifiedByUid
				if (receiptData.createdById) {
					fetchUserIdentity(receiptData.createdById);
				}
				if (receiptData.modifiedByUid) {
					fetchUserIdentity(receiptData.modifiedByUid);
				}

				// Fetch sample image if _deprecated_sampleImageId exists
				console.log('Receipt data _deprecated_sampleImageId:', receiptData._deprecated_sampleImageId);
				if (receiptData._deprecated_sampleImageId) {
					fetchSampleImage(receiptData._deprecated_sampleImageId);
				} else {
					// Reset image state if no _deprecated_sampleImageId
					console.log('No _deprecated_sampleImageId found, resetting image state');
					setSampleImageUrl('');
					setImageError(false);
					setIsLoadingImage(false);
				}
			} else if (response.status === 401) {
				navigate('/login');
			} else {
				console.error('API returned non-200 status:', response.status);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: `Lỗi khi tải thông tin phiếu: ${response.status}`,
				});
			}
		} catch (error) {
			console.error('Error fetching receipt:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi tải thông tin phiếu',
			});
		}

		// Fetch scientific fields for bulk field update options
		try {
			const scientificFieldsResponse = await apiPost('https://red.irdop.org/v1/option/get/list', {
				listType: 'scientificFields',
			});
			console.log('Scientific fields response:', scientificFieldsResponse);
			if (scientificFieldsResponse.data && Array.isArray(scientificFieldsResponse.data)) {
				setScientificFields(scientificFieldsResponse.data.filter(Boolean));
			}
		} catch (error) {
			console.error('Error fetching scientific fields:', error);
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
		if (receiptId && isfetch === false) {
			isfetch = true;
			fetchReceipt();
		}
	}, [receiptId]);

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

	// Add this helper for super admin
	const isSuperAdmin = () => currentUser?.role?.staff_superAdmin;

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
					modifiedById: currentUser.identity_uid,
				},
			};

			// For sampleName or sampleDescription, update sampleInformation
			if (field === 'sampleName' || field === 'sampleDescription') {
				// Get sampleInformation (new API returns array directly)
				let sampleInfo = sample.sampleInformation || sample.sample_information || [];

				// Handle backward compatibility - if it's a string, parse it
				if (typeof sampleInfo === 'string') {
					try {
						sampleInfo = JSON.parse(sampleInfo);
					} catch (error) {
						console.error('Error parsing sample information:', error);
						sampleInfo = [];
					}
				}

				// Make sure it's an array
				if (!Array.isArray(sampleInfo)) {
					sampleInfo = [];
				}

				// Define search keywords based on the field being edited
				const searchKeywords = field === 'sampleName' ? ['Tên mẫu', 'name'] : ['Mô tả', 'desc'];

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
						fname: field === 'sampleName' ? 'Tên mẫu thử / name.' : 'Mô tả / desc.',
						fvalue: newValue,
					};
					updatedSampleInfo.push(newEntry);
				}

				// Add the updated sampleInformation to the payload
				payload.sample.sampleInformation = updatedSampleInfo;
			}

			const response = await apiPost('https://red.irdop.org/v1/sample/edit', payload);

			if (response.status === 200) {
				showToast(`Cập nhật thông tin thành công!`);

				// If we updated sampleInformation, update the local state too
				if (field === 'sampleName' || field === 'sampleDescription') {
					setCurrentReceipt((prev) => ({
						...prev,
						samples: prev.samples.map((s) => {
							if (s.id === sampleId) {
								// Get the updated sampleInformation from the payload
								const updatedSampleInfo = payload.sample.sampleInformation;
								return { ...s, sampleInformation: updatedSampleInfo };
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
		const fieldKey = `resultValue-${order.sampleId}-${order.id}`;
		setEditingField(fieldKey);
		const originalValue = order.resultValue ? String(order.resultValue) : '';
		setInputValue(originalValue);
		setIsEditorVisible(true);
	};

	const handleResultUnitClick = (order) => {
		const fieldKey = `resultUnit-${order.sampleId}-${order.id}`;
		setEditingField(fieldKey);
		const originalValue = order.resultUnit ? String(order.resultUnit) : '';
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
			// Create minimal update object with proper structure
			const updateData = {
				id: analysis.id,
				sampleId: analysis.sampleId,
				receiptId: analysis.receiptId,
				...analysis,
				modifiedByUid: currentUser.identityUid,
				displayStyle: analysis.displayStyle || [
					{ label: 'default', value: '' },
					{ label: 'eng', value: '' },
				],
			};

			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
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
			throw error;
		}
	};

	// Add function to handle individual field updates for analysis
	const handleAnalysisFieldUpdate = async (analysisId, field, newValue) => {
		try {
			// Store original state for rollback
			const originalAnalytes = [...listAnalytes];

			// Update local state immediately for better UX
			const updatedAnalytes = listAnalytes.map((item) => {
				if (item.id === analysisId) {
					return { ...item, [field]: newValue };
				}
				return item;
			});
			setListAnalytes(updatedAnalytes);

			// Find the analysis being updated
			const analysis = updatedAnalytes.find((item) => item.id === analysisId);

			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sampleId: analysis.sampleId,
				receiptId: analysis.receiptId,
				[field]: newValue,
				modifiedByUid: currentUser.identityUid,
				displayStyle: analysis.displayStyle || [
					{ label: 'default', value: '' },
					{ label: 'eng', value: '' },
				],
			};

			// Send the update to the server
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast(`Đã cập nhật ${field === 'scientificField' ? 'lĩnh vực' : field} thành công!`);
			} else {
				// Rollback the state on error
				setListAnalytes(originalAnalytes);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || `Lỗi khi cập nhật ${field === 'scientificField' ? 'lĩnh vực' : field}`,
				});
			}
		} catch (error) {
			console.error('Error updating analysis field:', error);
			// Rollback the state on error
			const originalAnalytes = listAnalytes.filter((item) => item.id !== analysisId || item[field] !== newValue);
			setListAnalytes(originalAnalytes);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || `Có lỗi xảy ra khi cập nhật ${field === 'scientificField' ? 'lĩnh vực' : field}`,
			});
		}
	};

	// Add function to handle technician assignment for individual analysis
	const handleTechnicianAssignment = async (analysisId, technicianId, selectedTechnician) => {
		try {
			// Store original state for rollback
			const originalAnalytes = [...listAnalytes];

			// Update local state immediately for better UX
			const updatedAnalytes = listAnalytes.map((item) => {
				if (item.id === analysisId) {
					return {
						...item,
						technicianId: technicianId,
						technicianUid: technicianId,
						technician: {
							identityId: technicianId,
							identityName: selectedTechnician.identityName,
						},
					};
				}
				return item;
			});
			setListAnalytes(updatedAnalytes);

			// Find the updated analysis
			const analysis = updatedAnalytes.find((item) => item.id === analysisId);

			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sampleId: analysis.sampleId,
				receiptId: analysis.receiptId,
				technicianId: technicianId,
				technicianUid: technicianId,
				technician: {
					identityId: technicianId,
					identityName: selectedTechnician.identityName,
				},
				modifiedByUid: currentUser.identityUid,
				displayStyle: analysis.displayStyle || [
					{ label: 'default', value: '' },
					{ label: 'eng', value: '' },
				],
			};

			// Send the update to the server
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast(`Đã gán ${selectedTechnician.identityName} thực hiện`);
			} else {
				// Rollback the state on error
				setListAnalytes(originalAnalytes);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật người thực hiện',
				});
			}
		} catch (error) {
			console.error('Error updating technician:', error);
			// Rollback the state on error
			setListAnalytes(originalAnalytes);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật người thực hiện',
			});
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
		const analysis = listAnalytes.find((item) => item.id === analysisId && item.sampleId.toString() === sampleId);
		let originalValue;

		if (fieldType === 'resultValue') {
			originalValue = analysis?.resultValue || '';
		} else if (fieldType === 'resultUnit') {
			originalValue = analysis?.resultUnit || '';
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
			if (item.id === parseInt(editingField.split('-')[2]) && item.sampleId.toString() === editingField.split('-')[1]) {
				if (editingField.startsWith('resultValue')) {
					return { ...item, resultValue: newValue };
				} else if (editingField.startsWith('resultUnit')) {
					return { ...item, resultUnit: newValue };
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
					item.id === parseInt(editingField.split('-')[2]) && item.sampleId.toString() === editingField.split('-')[1],
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
	const getSampleUid = (sampleId) => {
		const sample = currentReceipt.samples.find((sample) => sample.id === sampleId);
		return sample ? sample.sampleId : '';
	};

	const getTechnicianName = (technicianId) => {
		const technician = technicians.find((tech) => tech.identity_uid === technicianId);
		return technician ? `${technician.identity_name} (${technician.alias})` : '';
	};

	const handleAddSample = () => {
		setIsAddingSample(true);
	};
	const handleSaveNewSample = async () => {
		setCheckConfirm(true);

		// Check if any required field is empty (but only check if they have been modified/touched)
		const requiredFields = ['sampleName', 'matrix', 'sample_description', 'sample_volume', 'purpose'];
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
				receiptId: currentReceipt.receiptId,
				sampleName: (newSample.sampleName || newSample.sampleName || '') + sampleNameSuffix,
				sampleDescription: newSample?.sampleDescription || newSample?.sample_description || '',
				sampleVolume: newSample?.sampleVolume || newSample?.sample_volume || '',
				matrix: newSample?.matrix || '',
				status: newSample?.status || 0,
				purpose: newSample?.purpose || '',
				additionalRequest: newSample?.additionalRequest || newSample?.additionalRequest || '',
				sampleInformation: [
					{
						fname: 'Tên mẫu thử / name.',
						fvalue: (newSample?.sampleName || newSample?.sampleName || '') + sampleNameSuffix,
					},
					...sampleInformation,
					{
						fname: 'Ngày tiếp nhận / receipt date.',
						fvalue: formatDate(currentReceipt.receiptDate) || '',
					},
					{ fname: 'Ngày thử nghiệm / test date.', fvalue: '' },
					{
						fname: 'Mô tả / desc.',
						fvalue: newSample?.sampleDescription || newSample?.sample_description || '',
					},
				],
				createdById: currentUser.identity_uid,
				modifiedById: currentUser.identity_uid,
			};

			try {
				const response = await apiPost('https://red.irdop.org/v1/sample/create', { sample: newSampleData });
				if (response.status === 200) {
					const newSampleId = response.data.id; // Use 'id' field from the response

					// Check if we have a copied sample UID to copy analyses from
					const copiedSampleUid = newSample.copiedFromSampleUid;
					if (copiedSampleUid) {
						// Find the sample that was copied from
						const sampleToCopy = currentReceipt.samples.find((sample) => sample.sampleId === copiedSampleUid);

						const analysesToCopy = sampleToCopy?.analyses || sampleToCopy?.analysis || [];
						if (sampleToCopy && analysesToCopy.length > 0) {
							// Create analyses based on the copied sample
							const analysesToCopyData = analysesToCopy.map((analysis) => {
								// Create the analysis object
								const analysisData = {
									receiptId: currentReceipt.receiptId,
									sampleId: newSampleId,
									parameterId: analysis.parameterId || 0,
									parameterName: analysis.parameterName,
									parameterUid: analysis.parameterUid || '',
									accreditation: analysis.accreditation,
									protocolId: analysis.protocolId,
									technicianId: analysis.technicianId,
									deadline: analysis.deadline
										? adjustDateForApiSubmission(new Date(analysis.deadline))
										: adjustDateForApiSubmission(
												new Date(Date.now() + (analysis?.tat_expected?.days * 24 * 60 * 60 * 1000 || 0)),
										  ),
									protocolCode: analysis.protocolCode,
									resultUnit: analysis.resultUnit || '',
									protocolSource: analysis.protocolSource,
									matrix: newSample.matrix || analysis.matrix,
									field: analysis.field,
									createdById: currentUser.identity_uid,
									modifiedById: currentUser.identity_uid,
								};
								// Add resultValue if it exists and is not null, empty string, or '<p><p>'
								if (analysis.resultValue && analysis.resultValue !== '' && analysis.resultValue !== '<p><p>') {
									analysisData.resultValue = analysis.resultValue;
								}
								// Remove keys with empty string values
								return Object.fromEntries(Object.entries(analysisData).filter(([key, value]) => value !== ''));
							});

							// Add analyses in bulk using new API
							try {
								const analysisResponse = await apiPost('https://red.irdop.org/v1/analysis/create', {
									analyses: analysesToCopyData,
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
			currentReceipt.samples.find((sample) => sample.sampleId === copiedSampleUid)?.analysis?.length > 0;

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
			sampleName: '',
			matrix: '',
			sample_description: '',
			sample_volume: '',
			purpose: '',
			additionalRequest: '',
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
			// Use the correct API body format with sampleId
			const response = await apiPost('https://red.irdop.org/v1/sample/delete', {
				sampleId: sampleId,
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
		// Receipt deletion is blocked - show notification
		Swal.fire({
			icon: 'info',
			title: 'Không thể xóa',
			text: 'Thông báo xóa tới bộ phận ITC để xử lý!',
			confirmButtonText: 'Đã hiểu',
		});
	};

	// Add handler for checkbox selection
	const handleAnalyteSelect = (id) => {
		if (selectedAnalytes.includes(id)) {
			setSelectedAnalytes(selectedAnalytes.filter((item) => item !== id));
		} else {
			setSelectedAnalytes([...selectedAnalytes, id]);
		}
	};

	// Add handler for select all checkbox
	const handleSelectAllAnalytes = () => {
		if (selectAllAnalytes) {
			setSelectedAnalytes([]);
		} else {
			setSelectedAnalytes(listAnalytes.map((analyte) => analyte.id));
		}
		setSelectAllAnalytes(!selectAllAnalytes);
	};

	// Modify delete handler to handle multiple selections
	const handleDeleteSelected = () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn ít nhất một chỉ tiêu để xóa',
			});
			return;
		}
		setIsDeleteConfirmVisible(true);
		setDeleteType('multiple');
	};

	const handleDeleteMultipleConfirmAction = async () => {
		try {
			// Get the array of selected analysis IDs
			const analysisIds = selectedAnalytes;

			// Use the correct API endpoint with analysisIds array
			const response = await apiPost('https://red.irdop.org/v1/analysis/delete', {
				analysisIds: analysisIds,
			});

			if (response.status === 200) {
				showToast(`${selectedAnalytes.length} chỉ tiêu đã được xóa thành công!`);
				// Update listAnalytes by removing deleted items
				setListAnalytes(listAnalytes.filter((analyte) => !selectedAnalytes.includes(analyte.id)));
				setSelectedAnalytes([]);
				setSelectAllAnalytes(false);
				// Refresh receipt data
				fetchReceipt();
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Xóa chỉ tiêu thất bại',
				});
			}
		} catch (error) {
			console.error('Error deleting analyses:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi xóa chỉ tiêu',
			});
		} finally {
			setIsDeleteConfirmVisible(false);
		}
	};

	const handleBulkTransfer = () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn ít nhất một chỉ tiêu để bàn giao',
			});
			return;
		}
		setIsTransferMultipleVisible(true);
	};

	const handleBulkTransferConfirm = async () => {
		if (!selectedTechnician) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn người thực hiện',
			});
			return;
		}

		try {
			// Get the selected analytes
			const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));

			// Find technician information
			const technicianInfo = technicians.find((tech) => tech.identity_uid === selectedTechnician);

			// Prepare bulk update data with proper structure
			const analysesToUpdate = selectedItems.map((analyte) => ({
				id: analyte.id,
				sampleId: analyte.sampleId,
				receiptId: analyte.receiptId || analyte.receipt_id,
				technicianId: selectedTechnician,
				technicianUid: selectedTechnician,
				technician: {
					identityId: selectedTechnician,
					identityName: technicianInfo?.identityName || 'Unknown',
				},
				modifiedByUid: currentUser.identityUid,
				displayStyle: analyte.displayStyle || [
					{ label: 'default', value: '' },
					{ label: 'eng', value: '' },
				],
			}));

			// Send bulk update request
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analyses: analysesToUpdate,
			});

			if (response.status === 200) {
				// Update the UI
				const newAnalytesList = listAnalytes.map((analyte) => {
					if (selectedAnalytes.includes(analyte.id)) {
						return {
							...analyte,
							technicianUid: selectedTechnician,
							technicianId: selectedTechnician,
							technician: {
								identityId: selectedTechnician,
								identityName: technicianInfo?.identityName || 'Unknown',
							},
						};
					}
					return analyte;
				});

				setListAnalytes(newAnalytesList);
				setSelectedAnalytes([]);
				setBulkAction(false);

				showToast(`Đã cập nhật kỹ thuật viên cho ${analysesToUpdate.length} phân tích thành công!`);
			} else {
				throw new Error(`Lỗi ${response.status}: ${response.statusText || 'Không thể cập nhật phân tích'}`);
			}
		} catch (error) {
			console.error('Lỗi khi cập nhật phân tích:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật kỹ thuật viên',
			});
		}

		setIsTransferMultipleVisible(false);
		setSelectedTechnician(null);
		setSelectedAnalytes([]);
		setSelectAllAnalytes(false);
	};

	// Add function to handle bulk deadline updates
	const handleBulkDeadlineUpdate = async () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn ít nhất một chỉ tiêu để cập nhật hạn trả',
			});
			return;
		}

		setIsBulkDeadlineVisible(true);
	};

	// Function to apply the new deadline to all selected analyses
	const handleConfirmBulkDeadline = async () => {
		try {
			// Get the selected analytes
			const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));
			const newDeadline = adjustDateForApiSubmission(bulkDeadlineDate);

			// Prepare bulk update data with proper structure
			const analysesToUpdate = selectedItems.map((analyte) => ({
				id: analyte.id,
				sampleId: analyte.sampleId,
				receiptId: analyte.receiptId || analyte.receipt_id,
				deadline: newDeadline,
				modifiedByUid: currentUser.identityUid,
				displayStyle: analyte.displayStyle || [
					{ label: 'default', value: '' },
					{ label: 'eng', value: '' },
				],
			}));

			// Send bulk update request
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analyses: analysesToUpdate,
			});

			if (response.status === 200) {
				// Update the UI
				const newAnalytesList = listAnalytes.map((analyte) => {
					if (selectedAnalytes.includes(analyte.id)) {
						return { ...analyte, deadline: newDeadline };
					}
					return analyte;
				});

				setListAnalytes(newAnalytesList);
				setSelectedAnalytes([]);
				setSelectAllAnalytes(false);
				setIsBulkDeadlineVisible(false);

				showToast(`Đã cập nhật hạn trả cho ${analysesToUpdate.length} chỉ tiêu thành ${formatDate(bulkDeadlineDate)}`);
			} else {
				throw new Error(`Lỗi ${response.status}: ${response.statusText || 'Không thể cập nhật hạn trả'}`);
			}
		} catch (error) {
			console.error('Lỗi khi cập nhật hạn trả:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật hạn trả',
			});
		}
	};

	// Add function to handle bulk field updates (improved version based on SampleInfor.jsx)
	const handleBulkFieldUpdate = async () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn ít nhất một chỉ tiêu để cập nhật lĩnh vực',
			});
			return;
		}

		// Create inputOptions dynamically from scientificFields
		const inputOptions = scientificFields.reduce((acc, field) => {
			acc[field] = field;
			return acc;
		}, {});

		// Prompt for the field value
		const { value: field } = await Swal.fire({
			title: 'Chọn lĩnh vực',
			input: 'select',
			inputOptions: inputOptions,
			inputPlaceholder: 'Chọn lĩnh vực',
			showCancelButton: true,
			cancelButtonText: 'Hủy bỏ',
			confirmButtonText: 'Cập nhật',
			inputValidator: (value) => {
				if (!value) {
					return 'Bạn cần chọn một lĩnh vực!';
				}
			},
		});

		if (field) {
			try {
				// Get the selected analytes
				const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));

				// Prepare bulk update array with proper structure
				const updateDataArray = selectedItems.map((analyte) => ({
					id: analyte.id,
					sampleId: analyte.sampleId,
					receiptId: analyte.receiptId || analyte.receipt_id,
					scientificField: field,
					modifiedByUid: currentUser.identityUid,
					displayStyle: analyte.displayStyle || [
						{ label: 'default', value: '' },
						{ label: 'eng', value: '' },
					],
				}));

				// Make a single API call with the analyses array
				const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
					analyses: updateDataArray,
				});

				if (response.status === 200) {
					// Update the UI
					const newAnalytesList = listAnalytes.map((analyte) => {
						if (selectedAnalytes.includes(analyte.id)) {
							return { ...analyte, scientificField: field };
						}
						return analyte;
					});
					setListAnalytes(newAnalytesList);

					showToast(`Đã cập nhật lĩnh vực "${field}" cho ${selectedAnalytes.length} chỉ tiêu`);
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: response.data?.message || 'Có lỗi xảy ra khi cập nhật lĩnh vực',
					});
				}

				setSelectedAnalytes([]);
				setSelectAllAnalytes(false);
			} catch (error) {
				console.error('Error updating fields:', error);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: error.message || 'Đã xảy ra lỗi khi cập nhật lĩnh vực',
				});
			}
		}
	};

	// // Delete selected analytes
	// const handleDeleteSelected = () => {
	// 	if (selectedAnalytes.length === 0) return;

	// 	Swal.fire({
	// 		title: `Xóa ${selectedAnalytes.length} chỉ tiêu?`,
	// 		text: 'Bạn có chắc chắn muốn xóa các chỉ tiêu đã chọn không?',
	// 		icon: 'warning',
	// 		showCancelButton: true,
	// 		confirmButtonColor: '#d33',
	// 		cancelButtonColor: '#3085d6',
	// 		confirmButtonText: 'Xóa',
	// 		cancelButtonText: 'Hủy',
	// 	}).then(async (result) => {
	// 		if (result.isConfirmed) {
	// 			try {
	// 				const promises = selectedAnalytes.map(id =>
	// 					apiPost('/api/delete/analysis', { analysis_id: id }, token)
	// 				);

	// 				await Promise.all(promises);

	// 				setSelectedAnalytes([]);
	// 				setSelectAllAnalytes(false);

	// 				Swal.fire({
	// 					position: 'top-end',
	// 					icon: 'success',
	// 					title: `Đã xóa ${selectedAnalytes.length} chỉ tiêu`,
	// 					showConfirmButton: false,
	// 					timer: 1500,
	// 				});

	// 				// Refresh data
	// 				getReceiptData(receiptId);
	// 			} catch (error) {
	// 				console.error('Error deleting analyses:', error);
	// 				Swal.fire({
	// 					icon: 'error',
	// 					title: 'Lỗi',
	// 					text: 'Có lỗi xảy ra khi xóa chỉ tiêu',
	// 				});
	// 			}
	// 		}
	// 	});
	// };

	// Add handleSyncData function (based on SampleInfor.jsx)
	const handleSyncData = async () => {
		try {
			if (selectedAnalytes.length === 0) {
				Swal.fire({
					icon: 'warning',
					title: 'Cảnh báo',
					text: 'Vui lòng chọn ít nhất một chỉ tiêu để đồng bộ',
				});
				return;
			}

			// Get the selected analytes
			const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));

			// Check if any item is missing matrix
			const missingMatrixItems = selectedItems.filter((item) => !item.matrix || item.matrix.trim() === '');
			if (missingMatrixItems.length > 0) {
				const result = await Swal.fire({
					icon: 'warning',
					title: 'Cảnh báo',
					text: `Có ${missingMatrixItems.length} chỉ tiêu thiếu thông tin nền mẫu. Vui lòng bổ sung thông tin nền mẫu trước khi đối soát.`,
					showCancelButton: true,
					confirmButtonText: 'Tiếp tục đối soát',
					cancelButtonText: 'Hủy bỏ',
				});

				if (!result.isConfirmed) {
					return;
				}
			}

			// Call match API to get updated parameter information
			const matchData = selectedItems.map((item) => ({
				parameterName: item.parameterName || item.parameter_name,
				matrix: item.matrix || '',
			}));

			const matchResponse = await apiPost('https://red.irdop.org/v1/analysis/match/parameter', {
				analyses: matchData,
			});

			if (matchResponse.status === 200) {
				// Create array of update objects for bulk update using matched data
				const updateDataArray = selectedItems.map((analyte) => {
					// Find the corresponding matched data
					const matchedData = matchResponse.data.find((item) => {
						const apiParamName = (item.parameterName || '').toLowerCase().trim();
						const analyteParamName = (analyte.parameterName || analyte.parameter_name || '').toLowerCase().trim();
						const apiMatrix = (item.matrix || '').toLowerCase().trim();
						const analyteMatrix = (analyte.matrix || '').toLowerCase().trim();
						return apiParamName === analyteParamName && (apiMatrix === analyteMatrix || (!apiMatrix && !analyteMatrix));
					});

					// Create update object with matched data or original data
					return {
						id: analyte.id,
						sampleId: analyte.sampleId,
						receiptId: analyte.receiptId || analyte.receipt_id,
						parameterName: matchedData?.parameterName || analyte.parameterName,
						parameterId: matchedData?.parameterId || analyte.parameterId,
						parameterUid: matchedData?.parameterUid || analyte.parameterUid || analyte.parameter_uid || '',
						protocolCode: matchedData?.protocolCode || analyte.protocolCode,
						protocolSource: matchedData?.protocolSource || analyte.protocolSource,
						matrix: matchedData?.matrix || analyte.matrix,
						scientificField: matchedData?.scientificField || analyte.scientificField,
						technicianAlias: matchedData?.technicianAlias || analyte.technicianAlias,
						modifiedByUid: currentUser.identityUid,
						displayStyle: analyte.displayStyle || [
							{
								label: 'default',
								value: '',
							},
							{
								label: 'eng',
								value: '',
							},
						],
					};
				});

				// Make bulk update API call
				const updateResponse = await apiPost('https://red.irdop.org/v1/analysis/update', {
					analyses: updateDataArray,
				});

				if (updateResponse.status === 200) {
					// Update the UI
					const newAnalytesList = listAnalytes.map((analyte) => {
						if (selectedAnalytes.includes(analyte.id)) {
							const updateData = updateDataArray.find((item) => item.id === analyte.id);
							return {
								...analyte,
								...updateData,
							};
						}
						return analyte;
					});
					setListAnalytes(newAnalytesList);

					showToast(`Đã đồng bộ dữ liệu cho ${selectedAnalytes.length} chỉ tiêu`);
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: updateResponse.data?.message || 'Có lỗi xảy ra khi cập nhật dữ liệu',
					});
				}
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: matchResponse.data?.message || 'Có lỗi xảy ra khi đối soát thông số',
				});
			}
		} catch (error) {
			console.error('Error syncing data:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi đồng bộ dữ liệu',
			});
		}
	};

	// Add handleUpdateDatabase function (based on SampleInfor.jsx)
	const handleUpdateDatabase = async () => {
		try {
			// Use selected analyses if any are selected, otherwise find analyses that need database updates
			let analysesToUpdate;

			if (selectedAnalytes.length > 0) {
				// Use selected analyses for update
				analysesToUpdate = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));
			} else {
				// Find analyses that need database updates (missing parameterUid but have other required fields)
				analysesToUpdate = listAnalytes.filter(
					(analysis) =>
						((!analysis.parameterUid && !analysis.parameter_uid) ||
							analysis.parameterUid === '' ||
							analysis.parameter_uid === '') &&
						analysis.matrix &&
						((analysis.protocolSource !== 'EX' && analysis.protocolCode) ||
							(analysis.protocol_source !== 'EX' && analysis.protocol_code) ||
							analysis.protocolSource === 'EX' ||
							analysis.protocol_source === 'EX') &&
						(analysis.protocolSource || analysis.protocol_source) &&
						analysis.scientificField,
				);
			}

			if (analysesToUpdate.length === 0) {
				showToast('Không có chỉ tiêu nào cần cập nhật CSDL', 'info');
				return;
			}

			// Show confirmation dialog
			const confirmResult = await Swal.fire({
				title: 'Cập nhật CSDL',
				text: `Có ${analysesToUpdate.length} chỉ tiêu cần cập nhật vào CSDL. Bạn có muốn tiếp tục?`,
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: 'Có',
				cancelButtonText: 'Không',
			});

			if (!confirmResult.isConfirmed) return;

			// Create array of update objects for bulk update
			const updateDataArray = analysesToUpdate.map((analyte) => ({
				id: analyte.id,
				sampleId: analyte.sampleId,
				receiptId: analyte.receiptId || analyte.receipt_id,
				parameterName: analyte.parameter_name || analyte.parameterName,
				parameterUid: analyte.parameter_uid || analyte.parameterUid || '',
				parameterId: analyte.parameterId,
				protocolCode: analyte.protocol_code || analyte.protocolCode,
				protocolSource: analyte.protocol_source || analyte.protocolSource,
				matrix: analyte.matrix || '',
				scientificField: analyte.scientificField || analyte.field,
				modifiedByUid: currentUser.identityUid,
				displayStyle: analyte.displayStyle || [
					{
						label: 'default',
						value: '',
					},
					{
						label: 'eng',
						value: '',
					},
				],
			}));

			// Make a single API call with the analyses array
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analyses: updateDataArray,
			});

			if (response.status === 200) {
				// Update the UI
				const newAnalytesList = listAnalytes.map((analyte) => {
					const updateData = updateDataArray.find((item) => item.id === analyte.id);
					if (updateData) {
						return {
							...analyte,
							...updateData,
						};
					}
					return analyte;
				});
				setListAnalytes(newAnalytesList);

				showToast(`Đã cập nhật CSDL cho ${analysesToUpdate.length} chỉ tiêu`);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật CSDL',
				});
			}
		} catch (error) {
			console.error('Error updating database:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật CSDL',
			});
		}
	};

	const renderBulkTransferForm = () => (
		<div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
			<div className="bg-white p-4 rounded-lg w-[800px] max-w-[90vw] max-h-[90vh] relative flex flex-col justify-between">
				<h2 className="text-2xl font-semibold mb-4">Bàn giao {selectedAnalytes.length} chỉ tiêu</h2>
				<div className="overflow-auto mb-4 flex-1">
					<p className="font-medium mb-2">Chọn người thực hiện:</p>
					<div className="grid grid-cols-4 gap-3">
						{technicians.map((tech) => (
							<div
								key={tech.identity_uid}
								className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration-200 text-center ${
									selectedTechnician === tech.identity_uid ? 'border-primary bg-blue-50' : 'border-gray-300'
								}`}
								onClick={() => setSelectedTechnician(tech.identity_uid)}
							>
								<p className="font-bold text-primary text-sm mb-1">{tech.alias || ''}</p>
								<p className="text-xs text-gray-600 leading-tight">{tech.identity_name || ''}</p>
							</div>
						))}
					</div>
				</div>
				<div className="flex justify-end">
					<button
						className="bg-gray-500 text-white p-2 rounded mr-2"
						onClick={() => {
							setIsTransferMultipleVisible(false);
							setSelectedTechnician(null);
						}}
					>
						Hủy bỏ
					</button>
					<button
						className={`${selectedTechnician ? 'bg-green-500' : 'bg-gray-400'} text-white p-2 rounded`}
						onClick={handleBulkTransferConfirm}
						disabled={!selectedTechnician}
					>
						Xác nhận
					</button>
				</div>
			</div>
		</div>
	);

	// Add the bulk deadline picker modal
	const renderBulkDeadlinePicker = () => (
		<div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
			<div className="bg-white p-4 rounded-lg w-[320px] relative">
				<h2 className="text-xl font-semibold mb-4">Cập nhật hạn trả cho {selectedAnalytes.length} chỉ tiêu</h2>
				<div className="mb-4 flex justify-center">
					<DatePicker selected={bulkDeadlineDate} onChange={(date) => setBulkDeadlineDate(date)} inline />
				</div>
				<div className="flex justify-end">
					<button className="bg-gray-500 text-white p-2 rounded mr-2" onClick={() => setIsBulkDeadlineVisible(false)}>
						Hủy bỏ
					</button>
					<button className="bg-green-500 text-white p-2 rounded" onClick={handleConfirmBulkDeadline}>
						Xác nhận
					</button>
				</div>
			</div>
		</div>
	);

	// Fixed handleInputChange function to avoid null object errors
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		const keys = name.split('.');
		if (keys.length > 1) {
			setCurrentReceipt((prev) => {
				if (!prev) return prev; // Guard against null receipt

				const updatedReceipt = { ...prev };
				let nestedObject = updatedReceipt;

				// Map 'contact' to 'contactPerson' and 'receiver' to 'reportRecipient'
				const mappedKeys = [...keys];
				if (mappedKeys[0] === 'contact') {
					mappedKeys[0] = 'contactPerson';
				} else if (mappedKeys[0] === 'receiver') {
					mappedKeys[0] = 'reportRecipient';
				}

				// Create nested objects if they don't exist
				for (let i = 0; i < mappedKeys.length - 1; i++) {
					if (!nestedObject[mappedKeys[i]]) {
						nestedObject[mappedKeys[i]] = {};
					}
					nestedObject = nestedObject[mappedKeys[i]];
				}

				// Set the final property
				nestedObject[mappedKeys[mappedKeys.length - 1]] = value;
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
		const sampleToCopy = currentReceipt.samples.find((sample) => sample.sampleId === sampleUid);

		if (sampleToCopy) {
			// Copy sample data to the form and store the source sample UID
			setNewSample({
				sampleName: sampleToCopy.sampleName || sampleToCopy.sample_name || '',
				matrix: sampleToCopy.matrix || '',
				sampleDescription: sampleToCopy.sampleDescription || sampleToCopy.sample_description || '',
				sampleVolume: sampleToCopy.sampleVolume || sampleToCopy.sample_volume || '',
				status: sampleToCopy.status || 0,
				purpose: sampleToCopy.purpose || '',
				additionalRequest: sampleToCopy.additionalRequest || sampleToCopy.additional_request || '',
				copiedFromSampleUid: sampleUid, // Store the source sample UID
			});
			// Handle sample information from new API structure
			try {
				const sampleInfo = sampleToCopy.sampleInformation || sampleToCopy.sample_information;
				if (sampleInfo) {
					// New API returns array directly, old API might be string
					const parsedInfo = Array.isArray(sampleInfo)
						? sampleInfo
						: typeof sampleInfo === 'string'
						? JSON.parse(sampleInfo)
						: sampleInfo;

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
								name="sampleName"
								value={newSample.sampleName || newSample.sample_name || ''}
								onChange={handleNewSampleChange}
								className={`w-full border rounded p-1 bg-white ${
									checkConfirm && (newSample.sampleName || newSample.sample_name || '').trim() === ''
										? 'border-red-500'
										: ''
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
								name="sampleDescription"
								value={newSample.sampleDescription || newSample.sample_description || ''}
								onChange={handleNewSampleChange}
								className={`w-full border rounded p-1 bg-white resize-none ${
									checkConfirm && (newSample.sampleDescription || newSample.sample_description || '').trim() === ''
										? 'border-red-500'
										: ''
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
								name="sampleVolume"
								value={newSample.sampleVolume || newSample.sample_volume || ''}
								onChange={handleNewSampleChange}
								className={`w-full border rounded p-1 bg-white ${
									checkConfirm && (newSample.sampleVolume || newSample.sample_volume || '').trim() === ''
										? 'border-red-500'
										: ''
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
								<option key={sample.sampleId} value={sample.sampleId}>
									{sample.sampleId}
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
			const response = await apiPost('https://red.irdop.org/v1/sample/delete', {
				sampleId: deleteItemId,
				modifiedByUid: currentUser.identityUid,
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
			// Use the correct API body format with analysisId
			const response = await apiPost('https://red.irdop.org/v1/analysis/delete', {
				analysisId: deleteItemId,
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

	// QR Code functions
	const generateQRCode = (url) => {
		const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
		return qrUrl;
	};

	const requestCameraPermission = async () => {
		setIsRequestingPermission(true);

		// Kiểm tra xem trình duyệt có hỗ trợ getUserMedia không
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			setIsRequestingPermission(false);
			setCameraPermission('denied');

			Swal.fire({
				icon: 'error',
				title: 'Trình duyệt không hỗ trợ',
				html: `
					<p>Trình duyệt của bạn không hỗ trợ chức năng camera hoặc trang web cần chạy qua HTTPS.</p>
					<p><strong>Giải pháp:</strong></p>
					<ul style="text-align: left; margin: 10px 0;">
						<li>Đảm bảo trang web chạy qua HTTPS</li>
						<li>Sử dụng trình duyệt hiện đại (Chrome, Firefox, Safari)</li>
						<li>Kiểm tra cài đặt camera của trình duyệt</li>
					</ul>
				`,
				confirmButtonText: 'Đã hiểu',
			});
			return false;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			// Đóng stream ngay lập tức vì chúng ta chỉ cần kiểm tra quyền
			stream.getTracks().forEach((track) => track.stop());
			setCameraPermission('granted');
			return true;
		} catch (error) {
			console.log('Camera permission denied:', error);
			setCameraPermission('denied');

			// Hiển thị thông báo hướng dẫn người dùng
			Swal.fire({
				icon: 'warning',
				title: 'Cần quyền truy cập camera',
				html: `
					<p>Để sử dụng chức năng quét mã QR, vui lòng:</p>
					<ol style="text-align: left; margin: 10px 0;">
						<li>Nhấp vào biểu tượng camera trong thanh địa chỉ</li>
						<li>Chọn "Cho phép" để cấp quyền camera</li>
						<li>Làm mới trang và thử lại</li>
					</ol>
					<p><strong>Lỗi:</strong> ${error.message}</p>
				`,
				confirmButtonText: 'Đã hiểu',
			});
			return false;
		} finally {
			setIsRequestingPermission(false);
		}
	};

	const handleQRScan = async () => {
		// Luôn mở modal và hiển thị yêu cầu quyền camera
		setIsQRScannerOpen(true);

		// Yêu cầu quyền camera ngay lập tức
		setTimeout(async () => {
			const hasPermission = await requestCameraPermission();
			if (hasPermission) {
				// Khởi tạo QR scanner nếu có quyền
				setTimeout(() => {
					initQRScanner();
				}, 100);
			}
		}, 100);
	};

	const initQRScanner = () => {
		// Kiểm tra xem có quyền camera không
		if (cameraPermission !== 'granted') {
			console.log('Camera permission not granted');
			return;
		}

		if (qrScannerRef.current) {
			qrScannerRef.current.clear();
		}

		try {
			qrScannerRef.current = new Html5QrcodeScanner(
				'qr-reader',
				{
					fps: 10,
					qrbox: { width: 250, height: 250 },
					aspectRatio: 1.0,
				},
				false,
			);

			qrScannerRef.current.render(handleQRScanSuccess, handleQRScanError);
		} catch (error) {
			console.error('Failed to initialize QR scanner:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi khởi tạo scanner',
				text: 'Không thể khởi tạo QR scanner. Vui lòng thử lại.',
			});
		}
	};

	const closeQRScanner = () => {
		if (qrScannerRef.current) {
			qrScannerRef.current
				.clear()
				.then(() => {
					qrScannerRef.current = null;
				})
				.catch((error) => {
					console.error('Failed to clear QR scanner:', error);
				});
		}
		setIsQRScannerOpen(false);
	};

	const handleQRScanSuccess = (decodedText) => {
		// Dừng scanner trước
		if (qrScannerRef.current) {
			qrScannerRef.current
				.clear()
				.then(() => {
					qrScannerRef.current = null;
				})
				.catch((error) => {
					console.error('Failed to clear QR scanner:', error);
				});
		}

		try {
			// Validate if the decoded text is a valid URL
			new URL(decodedText);
			setIsQRScannerOpen(false);

			// Show confirmation before navigating
			Swal.fire({
				icon: 'question',
				title: 'Xác nhận điều hướng',
				text: `Bạn có muốn chuyển đến: ${decodedText}?`,
				showCancelButton: true,
				confirmButtonText: 'Có',
				cancelButtonText: 'Không',
			}).then((result) => {
				if (result.isConfirmed) {
					window.location.href = decodedText;
				}
			});
		} catch (error) {
			setIsQRScannerOpen(false);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Mã QR không chứa URL hợp lệ',
			});
		}
	};

	const handleQRScanError = (error) => {
		console.log('QR Scan Error:', error);
	};

	// Function to handle Excel download
	const handleExcelDownload = async () => {
		// Check if receipt status is undefined or empty
		if (!currentReceipt?.status || currentReceipt.status.trim() === '' || currentReceipt.status === 'Chưa xác định') {
			// Show error dialog
			Swal.fire({
				icon: 'error',
				title: 'Không thể tải xuống',
				text: 'Bạn cần gửi email tiếp nhận cho khách hàng trước khi tải xuống file Excel.',
				confirmButtonText: 'Đã hiểu',
				confirmButtonColor: '#3085d6',
			});
			return;
		}

		try {
			// Show loading toast
			showToast('Đang tải xuống file Excel...', 'info');

			// Specify Excel MIME type explicitly
			const excelMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; // Using apiGetBlob function with correct headers and responseType
			const response = await apiGetBlob(`https://red.irdop.org/v1/excel/handover?receiptId=${receiptId}`);

			if (response.status === 200) {
				// Get the blob directly from the response
				const blob = response.data;

				// Create a new blob with explicit type to ensure correct handling
				const excelBlob = new Blob([blob], { type: excelMimeType });

				// Create a URL for the blob
				const url = window.URL.createObjectURL(excelBlob);

				// For IE/Edge browsers
				if (window.navigator && window.navigator.msSaveOrOpenBlob) {
					window.navigator.msSaveOrOpenBlob(excelBlob, `Receipt_${receiptId}.xlsx`);
				} else {
					// For modern browsers
					const link = document.createElement('a');
					link.href = url;
					link.setAttribute('download', `Receipt_${receiptId}.xlsx`);
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

	// Add function to handle quick draft generation
	const handleQuickDraft = async () => {
		try {
			// Show loading toast
			showToast('Đang tạo bản thảo...', 'info');

			// Prepare request body with samples from current receipt
			const requestBody = {
				samples: currentReceipt?.samples || [],
			};

			// Call API to generate draft HTML - returns HTML string directly
			const response = await apiPost('https://red.irdop.org/v1/report/gen/draft', requestBody);

			if (response.status === 200 && response.data) {
				// Response.data is HTML string, open in new tab
				const htmlContent = response.data;
				const newWindow = window.open('', '_blank');
				if (newWindow) {
					newWindow.document.write(htmlContent);
					newWindow.document.close();
					showToast('Đã mở bản thảo trong tab mới!', 'success');
				} else {
					showToast('Không thể mở tab mới. Vui lòng kiểm tra popup blocker.', 'error');
				}
			} else {
				showToast('Không thể tạo bản thảo', 'error');
			}
		} catch (error) {
			console.error('Error generating quick draft:', error);
			showToast('Lỗi khi tạo bản thảo: ' + (error.message || 'Unknown error'), 'error');
		}
	};

	const handlePayStatusToggle = () => {
		setIsPaymentConfirmVisible(true);
	};

	const handlePayStatusChange = async () => {
		try {
			const newPayStatus = currentReceipt.pay_status === 1 ? 0 : 1;
			const response = await apiPost('https://red.irdop.org/v1/receipt/edit', {
				receipt: {
					id: currentReceipt.id,
					receiptId: currentReceipt.receiptId,
					paymentStatus: newPayStatus,
					modifiedByUid: currentUser.identityUid,
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
			if (field === 'deadline' || field === 'receiptDate') {
				adjustedValue = adjustDateForApiSubmission(value);
			}

			const payload = {
				receipt: {
					id: currentReceipt.id,
					receiptId: currentReceipt.receiptId,
					[field]: adjustedValue,
					modifiedByUid: currentUser.identityUid,
				},
			};

			const response = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);
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

	// Handle status change
	const handleStatusChange = (newStatus) => {
		setCurrentReceipt((prev) => ({
			...prev,
			status: newStatus,
		}));
		handleReceiptApiUpdate('status', newStatus);
		setEditingGeneralField(null);
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
				const updatedAnalytes = listAnalytes.map((item) =>
					item.id === selectedAnalysisForNote.id ? { ...item, note: newNote } : item,
				);
				setListAnalytes(updatedAnalytes);

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

	// Function to update receipt status from EmailForm
	const updateReceiptStatus = (newStatus) => {
		setCurrentReceipt((prev) => ({
			...prev,
			status: newStatus,
		}));
	};

	// Function to fetch email form data from API
	const fetchEmailFormData = async () => {
		if (!currentReceipt?.receiptId) return;

		// Check if receipt status is already "Đã tiếp nhận"
		if (currentReceipt?.status === 'Đã tiếp nhận') {
			// Show confirmation dialog asking to resend email
			const result = await Swal.fire({
				icon: 'warning',
				title: 'Xác nhận gửi lại email',
				html: 'Phiếu tiếp nhận này đã gửi email thông báo rồi.<br/>Bạn có muốn gửi lại email không?',
				showCancelButton: true,
				confirmButtonText: 'Gửi lại',
				cancelButtonText: 'Hủy',
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
			});

			// If user cancels, return without proceeding
			if (!result.isConfirmed) {
				return;
			}
		}

		setIsLoadingEmailData(true);
		try {
			showToast('Đang tải dữ liệu email...', 'info');

			const response = await apiGet(
				`https://red.irdop.org/v1/get/email/receipt_form?receiptId=${currentReceipt.receiptId}`,
			);

			if (response.status === 200) {
				const { from, to, subject, body, attachments } = response.data;
				setEmailFormData({
					from: from || 'kiemnghiem@irdop.org',
					to: to || 'trungkien912@gmail.com',
					subject: subject || '',
					body: body || '',
					attachments: [currentReceipt?._deprecated_sampleImageId] || [],
				});
				setIsEmailFormVisible(true);
			} else {
				throw new Error(response.data?.message || 'Không thể tải dữ liệu email');
			}
		} catch (error) {
			console.error('Error fetching email form data:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: `Không thể tải dữ liệu email: ${error.message || 'Lỗi không xác định'}`,
			});
		} finally {
			setIsLoadingEmailData(false);
		}
	};

	// Function to handle email submission
	const handleEmailSubmit = async (emailData) => {
		try {
			console.log('Sending receipt notification email:', emailData);

			const response = await apiPost('https://red.irdop.org/v1/mail/send/receipt', emailData);

			if (response.status === 200) {
				// Update receipt status to "Đã tiếp nhận" after successful email sending
				try {
					const updatePayload = {
						receipt: {
							id: currentReceipt.id,
							receiptId: currentReceipt.receiptId,
							status: 'Đã tiếp nhận',
							modifiedById: currentUser.identity_uid,
						},
					};

					const updateResponse = await apiPost('https://red.irdop.org/v1/receipt/edit', updatePayload);
					if (updateResponse.status === 200) {
						console.log('Receipt status updated successfully to "Đã tiếp nhận"');
						updateReceiptStatus('Đã tiếp nhận');
					} else {
						console.warn('Failed to update receipt status:', updateResponse.data?.message);
					}
				} catch (updateError) {
					console.error('Error updating receipt status:', updateError);
				}

				Swal.fire({
					icon: 'success',
					title: 'Thành công',
					text: 'Email thông báo tiếp nhận đã được gửi thành công!',
				});
				setIsEmailFormVisible(false);
			} else {
				throw new Error(response.data?.message || 'Không thể gửi email');
			}
		} catch (error) {
			console.error('Error sending email:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: `Không thể gửi email: ${error.message || 'Lỗi không xác định'}`,
			});
		}
	};

	// Handle client information update
	const handleClientApiUpdate = async (field, value) => {
		try {
			// Create a complete client object with all fields
			const updatedClient = {
				clientName: currentReceipt.client?.clientName || '',
				clientUID: currentReceipt.client?.clientUID || '',
				clientPhone: currentReceipt.client?.clientPhone || '',
				invoiceEmail: currentReceipt.client?.invoiceEmail || '',
				clientAddress: currentReceipt.client?.clientAddress || '',
				legalId: currentReceipt.client?.legalId || '',
				// Update the specific field
				[field]: value,
			};

			// Update through receipt endpoint with client as a nested property
			const payload = {
				receipt: {
					id: currentReceipt.id,
					receiptId: currentReceipt.receiptId,
					client: updatedClient,
					modifiedById: currentUser.identity_uid,
				},
			};

			const response = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

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
			// Create a complete contact object with all fields
			const updatedContact = {
				name: currentReceipt.contactPerson?.name || '',
				phone: currentReceipt.contactPerson?.phone || '',
				email: currentReceipt.contactPerson?.email || '',
				id: currentReceipt.contactPerson?.id || '',
				id_date: currentReceipt.contactPerson?.id_date || '',
				id_place: currentReceipt.contactPerson?.id_place || '',
				// Update the specific field
				[field]: value,
			};

			// Update through receipt endpoint with contact as a nested property
			const payload = {
				receipt: {
					id: currentReceipt.id,
					receiptId: currentReceipt.receiptId,
					contactPerson: updatedContact,
					modifiedById: currentUser.identity_uid,
				},
			};

			const response = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

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

	// Handle receiver information update
	const handleReceiverApiUpdate = async (field, value) => {
		try {
			// Create a complete receiver object with all fields
			const updatedReceiver = {
				name: currentReceipt.reportRecipient?.name || '',
				address: currentReceipt.reportRecipient?.address || '',
				email: currentReceipt.reportRecipient?.email || '',
				other: currentReceipt.reportRecipient?.other || '',
				// Update the specific field
				[field]: value,
			};

			// Update through receipt endpoint with receiver as a nested property
			const payload = {
				receipt: {
					id: currentReceipt.id,
					receiptId: currentReceipt.receiptId,
					reportRecipient: updatedReceiver,
					modifiedById: currentUser.identity_uid,
				},
			};

			const response = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

			if (response.status === 200) {
				showToast(`Cập nhật thông tin người nhận thành công!`);
				return true;
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật thông tin người nhận',
				});
				fetchReceipt(); // Refresh data on error
				return false;
			}
		} catch (error) {
			console.error('Error updating receiver information:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin người nhận',
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

	// Handle key down for receiver fields
	const handleReceiverInputKeyDown = (e, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleReceiverApiUpdate(field, value);

			// Remove focus
			if (document.activeElement) {
				document.activeElement.blur();
			}
		}
	};

	// Removed customer details visibility management - details are always shown

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
		} else if (field.startsWith('receiver.')) {
			const actualField = field.split('.')[1];
			handleReceiverApiUpdate(actualField, value);
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
			return (
				<div className="w-2/3 px-2 py-0 text-sm text-left border border-white break-words overflow-hidden">
					<span className="block truncate" title={displayText}>
						{displayText}
					</span>
				</div>
			);
		}

		if (isEditing) {
			// Get current value from state based on field name
			let currentValue = value;
			const keys = fieldName.split('.');
			if (keys.length > 1) {
				// Map 'contact' to 'contactPerson' and 'receiver' to 'reportRecipient'
				const mappedKeys = [...keys];
				if (mappedKeys[0] === 'contact') {
					mappedKeys[0] = 'contactPerson';
				} else if (mappedKeys[0] === 'receiver') {
					mappedKeys[0] = 'reportRecipient';
				}

				let nestedValue = currentReceipt;
				for (const key of mappedKeys) {
					nestedValue = nestedValue?.[key];
				}
				currentValue = nestedValue;
			} else {
				currentValue = currentReceipt?.[fieldName];
			}

			return (
				<input
					type={type}
					name={fieldName}
					className="w-full bg-white border border-blue-500 px-2 py-0 rounded-lg text-sm focus:outline-none align-top"
					value={currentValue || ''}
					onChange={handleInputChange}
					onBlur={() => handleFieldBlur(fieldName, currentValue)}
					onKeyDown={(e) => handleFieldKeyDown(e, fieldName, currentValue)}
					autoFocus
				/>
			);
		}

		return (
			<div
				className="w-full px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg align-top break-words overflow-hidden"
				onClick={() => {
					handleFieldClick(fieldName);
					// Store original value when starting to edit
					setOriginalValues((prev) => ({
						...prev,
						[fieldName]: value,
					}));
				}}
				title={displayText}
			>
				<span className="block truncate">{displayText}</span>
			</div>
		);
	};

	// Render textarea field
	const renderTextareaField = (fieldName, value, disabled = false) => {
		const isEditing = editingGeneralField === fieldName;

		if (disabled) {
			return (
				<div className="w-2/3 px-2 py-0 text-sm text-left border border-white break-words overflow-hidden">
					<span className="block" title={displayValue(value)}>
						{displayValue(value)}
					</span>
				</div>
			);
		}

		if (isEditing) {
			// Get current value from state based on field name
			let currentValue = value;
			const keys = fieldName.split('.');
			if (keys.length > 1) {
				// Map 'contact' to 'contactPerson' and 'receiver' to 'reportRecipient'
				const mappedKeys = [...keys];
				if (mappedKeys[0] === 'contact') {
					mappedKeys[0] = 'contactPerson';
				} else if (mappedKeys[0] === 'receiver') {
					mappedKeys[0] = 'reportRecipient';
				}

				let nestedValue = currentReceipt;
				for (const key of mappedKeys) {
					nestedValue = nestedValue?.[key];
				}
				currentValue = nestedValue;
			} else {
				currentValue = currentReceipt?.[fieldName];
			}

			return (
				<textarea
					name={fieldName}
					className="w-2/3 bg-white border border-blue-500 px-2 py-0 rounded-lg text-sm focus:outline-none resize-none align-top"
					rows="3"
					value={currentValue || ''}
					onChange={handleInputChange}
					onBlur={() => handleFieldBlur(fieldName, currentValue)}
					onKeyDown={(e) => handleFieldKeyDown(e, fieldName, currentValue)}
					autoFocus
				/>
			);
		}

		return (
			<div
				className="w-2/3 px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg h-fit align-top break-words overflow-hidden"
				onClick={() => {
					handleFieldClick(fieldName);
					// Store original value when starting to edit
					setOriginalValues((prev) => ({
						...prev,
						[fieldName]: value,
					}));
				}}
				title={displayValue(value)}
			>
				<span className="block">{displayValue(value)}</span>
			</div>
		);
	};

	// Helper function to check if all analyses in a sample have been reviewed
	const allAnalysesReviewed = (sample) => {
		const analyses = sample.analyses || sample.analysis || [];
		if (!analyses || analyses.length === 0) return false;
		const allReviewed = analyses.every((analysis) => analysis.reviewed_by);
		return allReviewed ? true : false;
	};

	// PPT Table function removed - report functionality no longer available
	const renderPPTTable = () => {
		return (
			<div className="p-4 text-center text-gray-500">Report functionality has been removed from this component.</div>
		);
	};

	if (!currentReceipt) {
		return <div>Loading...</div>;
	}

	const isTechnician = () => {
		// Admin users bypass technician restrictions
		return currentUser?.role?.staff_technician && !currentUser?.role?.staff_admin;
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

	// Add this function before the return statement, near other helper functions
	const isToday = (date) => {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	};

	// Custom EmailForm Component using HTML from API
	const EmailFormFromAPI = () => {
		if (!isEmailFormVisible || !emailFormHtml) return null;

		return (
			<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
				<div className="bg-white p-6 rounded-lg w-4/5 max-w-4xl max-h-[90vh] overflow-y-auto relative">
					<button
						className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
						onClick={() => {
							setIsEmailFormVisible(false);
							setEmailFormHtml('');
						}}
					>
						×
					</button>
					<div dangerouslySetInnerHTML={{ __html: emailFormHtml }} />
				</div>
			</div>
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

				/* QR Scanner custom styles */
				#qr-reader {
					position: relative !important;
				}

				#qr-reader video {
					width: 100% !important;
					height: 100% !important;
					object-fit: cover !important;
					border-radius: 8px !important;
				}

				#qr-reader canvas {
					display: none !important;
				}

				#qr-reader__dashboard {
					position: absolute !important;
					bottom: 0 !important;
					left: 0 !important;
					right: 0 !important;
					background: rgba(0, 0, 0, 0.8) !important;
					padding: 10px !important;
					border-radius: 0 0 8px 8px !important;
				}

				#qr-reader__dashboard_section {
					margin: 0 !important;
				}

				#qr-reader__dashboard_section_info {
					color: white !important;
					font-size: 12px !important;
					text-align: center !important;
				}

				#qr-reader__camera_selection {
					background: white !important;
					border: 1px solid #ccc !important;
					border-radius: 4px !important;
					padding: 5px !important;
					margin: 5px 0 !important;
					width: 100% !important;
				}

				#qr-reader__start_button,
				#qr-reader__stop_button {
					background: #3b82f6 !important;
					color: white !important;
					border: none !important;
					padding: 8px 16px !important;
					border-radius: 4px !important;
					cursor: pointer !important;
					font-size: 14px !important;
					margin: 2px !important;
				}

				#qr-reader__start_button:hover,
				#qr-reader__stop_button:hover {
					background: #2563eb !important;
				}
			`}</style>{' '}
			<Breadcrumb
				paths={[
					{ name: 'Danh sách', link: '/' },
					{
						name: `${currentReceipt?.receiptId}`,
						link: `/dashboard/receipt?receiptId=${currentReceipt?.receiptId}`,
					},
				]}
				showSearch={true}
			/>
			{/* Only show action buttons for non-technicians */}
			{!isTechnician() && (
				<div className="w-full flex flex-col sm:flex-row justify-end sm:justify-between items-start sm:items-center mb-1">
					<div className="hidden sm:block"></div>
					{!isTechnician() && (
						<div className="w-full flex flex-col sm:flex-row justify-end sm:justify-between items-start sm:items-center mb-1">
							<div className="hidden sm:block"></div>
							<div className="flex flex-row items-center gap-2 w-full sm:w-auto justify-start">
								<button
									className="bg-background border-gray-300 text-primary font-medium py-1 px-2 rounded-lg text-sm whitespace-nowrap max-w-[80px]"
									onClick={handleExcelDownload}
								>
									<div className="flex items-center justify-center gap-1">
										Excel <PiDownloadSimpleBold size={16} />
									</div>
								</button>
								<button
									className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-1 px-2 rounded-lg text-sm whitespace-nowrap"
									onClick={handleQuickDraft}
									disabled={!currentReceipt?.samples || currentReceipt.samples.length === 0}
									title="Tạo bản thảo PDF nhanh"
								>
									<div className="flex items-center justify-center gap-1">
										<FaFilePdf size={14} />
										<span>DRAFT</span>
									</div>
								</button>
								<button
									className="bg-background border-gray-300 text-primary font-medium py-1 px-2 rounded-lg text-sm whitespace-nowrap max-w-[80px]"
									onClick={() =>
										window.open(`/dashboard/receipt/print_sp?receiptId=${currentReceipt?.receiptId}`, '_blank')
									}
								>
									<div className="flex items-center justify-center gap-1">
										Tag <FaTag size={16} />
									</div>
								</button>
								<button
									className="bg-background border-gray-300 text-primary font-medium py-1 px-2 rounded-lg text-sm whitespace-nowrap max-w-[80px]"
									onClick={fetchEmailFormData}
									disabled={isLoadingEmailData}
								>
									<div className="flex items-center justify-center gap-1">
										{isLoadingEmailData ? (
											<>
												<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
														d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
												Loading
											</>
										) : (
											<>
												Email <MdOutlineContactPhone size={16} />
											</>
										)}
									</div>
								</button>
								<button
									className="bg-background border-gray-300 text-primary font-medium py-1 px-2 rounded-lg text-sm whitespace-nowrap max-w-[80px]"
									onClick={() => setIsFileFormVisible(true)}
								>
									<div className="flex items-center justify-center gap-1">
										File <FaFolder size={14} />
									</div>
								</button>
								<button
									className="bg-background border-gray-300 text-red-500 font-medium py-1 px-2 rounded-lg text-sm whitespace-nowrap max-w-[80px]"
									onClick={handleDeleteReceipt}
									title="Thông báo xóa tới bộ phận ITC để xử lý!"
								>
									<div className="flex items-center justify-center gap-1">
										Xóa <FaTrashAlt size={14} />
									</div>
								</button>
							</div>
						</div>
					)}
				</div>
			)}{' '}
			{/* Only show general and order information sections for non-technicians */}
			{!isTechnician() && (
				<div className="rounded-lg w-full p-4 bg-white ">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* THÔNG TIN CHUNG Section */}
						<div className="flex flex-col items-start">
							<div className="flex justify-start items-center mb-1">
								<CgFileDocument size={16} className="text-primary" />
								<h2 className="text-md font-semibold w-fit text-primary px-1">THÔNG TIN CHUNG</h2>
							</div>
							<div className="w-full">
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Số hồ sơ lưu</label>
									{renderField('_deprecated_recordCode', currentReceipt?._deprecated_recordCode)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Trạng thái</label>
									{editingGeneralField === 'status' ? (
										<select
											value={currentReceipt?.status || 'Chưa xác định'}
											onChange={(e) => handleStatusChange(e.target.value)}
											onBlur={() => setEditingGeneralField(null)}
											className="w-2/3 px-2 py-1 text-sm border rounded-md bg-white"
											autoFocus
										>
											<option value="Chưa xác định">Chưa xác định</option>
											<option value="Đã tiếp nhận">Đã tiếp nhận</option>
											<option value="Bàn giao lab">Bàn giao lab</option>
											<option value="Đã gửi kết quả">Đã gửi kết quả</option>
										</select>
									) : (
										<div
											className="w-2/3 px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg"
											onClick={() => setEditingGeneralField('status')}
										>
											{currentReceipt?.status || 'Chưa xác định'}
										</div>
									)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Ngày tiếp nhận</label>
									{editingGeneralField === 'receiptDate' ? (
										<DatePicker
											selected={currentReceipt?.receiptDate}
											onChange={handleReceiptDateChange}
											onBlur={() => {
												handleReceiptApiUpdate('receiptDate', currentReceipt?.receiptDate);
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
											onClick={() => setEditingGeneralField('receiptDate')}
										>
											{currentReceipt?.receiptDate ? formatDate(currentReceipt.receiptDate) : '--'} bởi{' '}
											<span className="font-semibold"> {currentReceipt?.createdBy?.identityName}</span>
										</div>
									)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Hạn trả</label>
									{canViewDeadline() ? (
										editingGeneralField === 'deadline' ? (
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
										)
									) : (
										<div className="w-2/3 px-2 py-0 text-sm text-left border border-white rounded-lg">--</div>
									)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Mã vận đơn</label>
									<div className="w-2/3 px-2 py-0 text-sm text-left border border-white rounded-lg">
										{currentReceipt?._deprecated_trackingNumber || '--'}
									</div>
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Ghi chú</label>
									{renderTextareaField('note', currentReceipt?.note)}
								</div>

								{/* Add sample image section below note */}
								<div className="flex justify-start items-start mb-1">
									<div>
										<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Hình ảnh mẫu</label>
										{/* Sample Image Upload Button */}
										{currentReceipt?.receiptId && (
											<SampleImageUpload
												receiptUid={currentReceipt.receiptId}
												receiptID={currentReceipt.id}
												onUploadSuccess={(fileUid) => {
													// Handle successful upload, e.g., by fetching the receipt again
													fetchReceipt();
												}}
											/>
										)}
									</div>
									<div className="w-2/3">
										{/* Sample Image Display */}
										{currentReceipt?._deprecated_sampleImageId && (
											<div className="mb-2 w-fit h-fit">
												{isLoadingImage ? (
													<div className="flex items-center justify-center p-4 border border-gray-300 rounded-lg">
														<svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
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
																d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
															></path>
														</svg>
														<span className="ml-2 text-gray-500">Đang tải hình ảnh...</span>
													</div>
												) : imageError ? (
													<div className="flex items-center justify-center p-4 border border-red-300 rounded-lg bg-red-50">
														<FaImage className="text-red-400 mr-2" size={20} />
														<span className="text-red-600">Không thể tải hình ảnh</span>
													</div>
												) : sampleImageUrl ? (
													<div className="border border-gray-300 rounded-lg overflow-hidden">
														<img
															src={sampleImageUrl}
															alt="Hình ảnh mẫu"
															className="w-full h-auto max-h-48 object-contain"
															onError={() => setImageError(true)}
														/>
													</div>
												) : null}
											</div>
										)}
									</div>
								</div>

								{/* QR Code Section */}
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Truy cập nhanh</label>
									<div className="w-2/3">
										{/* Show QR Code on medium screens and larger */}
										<div className="hidden md:block">
											{currentUrl && (
												<div className="border border-gray-300 rounded-lg p-2 w-fit">
													<img src={generateQRCode(currentUrl)} alt="QR Code" className="w-24 h-24" />
													<p className="text-xs text-gray-600 mt-1 text-center">Quét để truy cập</p>
												</div>
											)}
										</div>

										{/* Show Scan Button on small screens */}
										<div className="block md:hidden">
											<button
												onClick={handleQRScan}
												className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors"
											>
												<FaCamera size={16} />
												<span>Quét mã QR</span>
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* THÔNG TIN ĐƠN HÀNG Section */}
						<div className="flex flex-col items-start">
							<div className="flex justify-start items-center mb-1">
								<TiBusinessCard size={16} className="text-primary" />
								<h2 className="text-md font-semibold w-fit text-primary px-1">THÔNG TIN ĐƠN HÀNG</h2>
							</div>
							<div className="w-full">
								{/* Customer details - always visible */}
								<div className="rounded-lg mb-2">
									<div className="flex justify-start items-start mb-1">
										<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Mã khách hàng</label>
										{renderField('client.clientUID', currentReceipt?.client?.clientUID)}
									</div>
									<div className="flex justify-start items-start mb-1">
										<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">
											Tổ chức/cá nhân
										</label>
										{renderField('client.clientName', currentReceipt?.client?.clientName)}
									</div>
									<div className="flex justify-start items-start mb-1">
										<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Địa chỉ</label>
										{renderField('client.clientAddress', currentReceipt?.client?.clientAddress)}
									</div>
									<div className="flex justify-start items-start mb-1">
										<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">
											Mã số thuế/CCCD
										</label>
										{renderField('client.legalId', currentReceipt?.client?.legalId)}
									</div>
									<div className="flex justify-start items-start mb-1">
										<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Điện thoại</label>
										{renderField('client.clientPhone', currentReceipt?.client?.clientPhone)}
									</div>
									<div className="flex justify-start items-start mb-1">
										<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Email hóa đơn</label>
										{renderField('client.invoiceEmail', currentReceipt?.client?.invoiceEmail)}
									</div>
									<div className="flex justify-start items-start mb-1">
										<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Hóa đơn (khác)</label>
										{editingGeneralField === 'client.invoiceInfo' ? (
											<textarea
												name="client.invoiceInfo"
												className="w-2/3 bg-white border border-blue-500 px-2 py-0 rounded-lg text-sm focus:outline-none resize-none align-top"
												rows="2"
												value={currentReceipt?.client?.invoiceInfo || ''}
												onChange={handleInputChange}
												onBlur={() => handleFieldBlur('client.invoiceInfo', currentReceipt?.client?.invoiceInfo)}
												onKeyDown={(e) =>
													handleFieldKeyDown(e, 'client.invoiceInfo', currentReceipt?.client?.invoiceInfo)
												}
												autoFocus
											/>
										) : (
											<div
												className="w-2/3 px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg h-fit align-top"
												onClick={() => handleFieldClick('client.invoiceInfo')}
											>
												{displayValue(currentReceipt?.client?.invoiceInfo)}
											</div>
										)}
									</div>
								</div>

								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Số báo giá</label>
									{renderField('quoteId', currentReceipt?.quoteId)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Mã đơn hàng</label>
									{renderField('orderId', currentReceipt?.orderId)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Giá trị</label>
									<div className="flex items-center">
										{renderField('totalFeeBeforeTax', currentReceipt?.totalFeeBeforeTax, false, 'number', true)}
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
									{renderField('salePerson', currentReceipt?.salePerson)}
								</div>
							</div>
						</div>

						{/* THÔNG TIN LIÊN HỆ Section */}
						<div className="flex flex-col items-start">
							<div className="flex justify-start items-center mb-1">
								<MdOutlineContactPhone size={16} className="text-primary" />
								<h2 className="text-md font-semibold w-fit text-primary px-1">THÔNG TIN LIÊN HỆ</h2>
							</div>
							<div className="w-full">
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Người liên hệ</label>
									{renderField('contact.name', currentReceipt?.contactPerson?.name)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Điện thoại</label>
									{renderField('contact.phone', currentReceipt?.contactPerson?.phone)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Email</label>
									{renderField('contact.email', currentReceipt?.contactPerson?.email)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">CCCD</label>
									{renderField('contact.id', currentReceipt?.contactPerson?.id)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Ngày cấp</label>
									{renderField('contact.id_date', currentReceipt?.contactPerson?.id_date)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Nơi cấp</label>
									{renderField('contact.id_place', currentReceipt?.contactPerson?.id_place)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Địa chỉ nhận KQ</label>
									{renderField('receiver.address', currentReceipt?.reportRecipient?.address)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">
										Người nhận (khác)
									</label>
									{renderField('receiver.name', currentReceipt?.reportRecipient?.name)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Email KQ</label>
									{renderField('reportRecipient.email', currentReceipt?.reportRecipient?.email)}
								</div>
								<div className="flex justify-start items-start mb-1">
									<label className="block text-sm font-medium text-gray-700 min-w-32 text-left">Khác</label>
									{editingGeneralField === 'reportRecipient.other' ? (
										<textarea
											name="reportRecipient.other"
											className="w-2/3 bg-white border border-blue-500 px-2 py-0 rounded-lg text-sm focus:outline-none resize-none align-top"
											rows="2"
											value={currentReceipt?.reportRecipient?.other || ''}
											onChange={handleInputChange}
											onBlur={() => handleFieldBlur('reportRecipient.other', currentReceipt?.reportRecipient?.other)}
											onKeyDown={(e) =>
												handleFieldKeyDown(e, 'reportRecipient.other', currentReceipt?.reportRecipient?.other)
											}
											autoFocus
										/>
									) : (
										<div
											className="w-2/3 px-2 py-0 text-sm text-left cursor-pointer border border-white hover:border-gray-300 rounded-lg h-fit align-top break-words overflow-hidden"
											onClick={() => handleFieldClick('reportRecipient.other')}
											title={displayValue(currentReceipt?.reportRecipient?.other)}
										>
											<span className="block">{displayValue(currentReceipt?.reportRecipient?.other)}</span>
										</div>
									)}
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
				</div>
			</div>
			{/* Rest of the component remains unchanged */}
			<div className="bg-white rounded-lg w-full mb-4 p-4">
				<div className="flex justify-end items-start sm:h-10 sm:flex-row flex-col h-[76px] ">
					{viewMode === 'analyte' ? (
						<FilterBar
							source={currentReceipt.samples.flatMap((sample) => sample.analyses || sample.analysis || [])}
							setCurrentList={setListAnalytes}
							typeSearch={'analysis'}
							className="absolute right-0"
						/>
					) : (
						<div className="flex items-center space-x-2">
							{/* Report button */}
							<button
								className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600"
								onClick={() => window.open(`/dashboard/receipt/report?receiptId=${receiptId}`, '_blank')}
							>
								Report
							</button>
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
							{/* Add toolbar for bulk operations */}
							<div className="mb-1 flex justify-end">
								<div className="w-fit flex items-center flex-wrap py-1 mr-0.5">
									<div className="flex -translate-y-0 md:translate-y-0 md:pt-0 w-full justify-end">
										{/* Sync Data button */}
										<button
											className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
												selectedAnalytes.length > 0 ? 'bg-green-500' : 'bg-gray-300 cursor-not-allowed'
											} mr-2`}
											onClick={selectedAnalytes.length > 0 ? handleSyncData : undefined}
											title="Đồng bộ dữ liệu"
										>
											<FaSync className="mr-1" />
											{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
										</button>
										{/* Update Database button */}
										<button
											className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
												(selectedAnalytes.length > 0 &&
													listAnalytes
														.filter((a) => selectedAnalytes.includes(a.id))
														.every(
															(a) =>
																(!a.parameterUid || a.parameterUid === '') &&
																a.parameterName &&
																a.matrix &&
																((a.protocolSource !== 'EX' && a.protocolCode) || a.protocolSource === 'EX') &&
																a.protocolSource &&
																a.scientificField,
														)) ||
												(selectedAnalytes.length === 0 &&
													listAnalytes.some(
														(a) =>
															(!a.parameterUid || a.parameterUid === '') &&
															a.parameterName &&
															a.matrix &&
															((a.protocolSource !== 'EX' && a.protocolCode) || a.protocolSource === 'EX') &&
															a.protocolSource &&
															a.scientificField,
													))
													? 'bg-blue-500'
													: 'bg-gray-300 cursor-not-allowed'
											} mr-2`}
											onClick={
												(selectedAnalytes.length > 0 &&
													listAnalytes
														.filter((a) => selectedAnalytes.includes(a.id))
														.every(
															(a) =>
																(!a.parameterUid || a.parameterUid === '') &&
																a.parameterName &&
																a.matrix &&
																((a.protocolSource !== 'EX' && a.protocolCode) || a.protocolSource === 'EX') &&
																a.protocolSource &&
																a.scientificField,
														)) ||
												(selectedAnalytes.length === 0 &&
													listAnalytes.some(
														(a) =>
															(!a.parameterUid || a.parameterUid === '') &&
															a.parameterName &&
															a.matrix &&
															((a.protocolSource !== 'EX' && a.protocolCode) || a.protocolSource === 'EX') &&
															a.protocolSource &&
															a.scientificField,
													))
													? handleUpdateDatabase
													: undefined
											}
											title="Cập nhật CSDL"
										>
											<FaDatabase className="mr-1" />
											{selectedAnalytes.length > 0
												? selectedAnalytes.length
												: listAnalytes.filter(
														(a) =>
															(!a.parameterUid || a.parameterUid === '') &&
															a.parameterName &&
															a.matrix &&
															((a.protocolSource !== 'EX' && a.protocolCode) || a.protocolSource === 'EX') &&
															a.protocolSource &&
															a.scientificField,
												  ).length || '0'}
										</button>
										<button
											className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
												selectedAnalytes.length > 0 ? 'bg-red-500' : 'bg-gray-300 cursor-not-allowed'
											} mr-2`}
											onClick={selectedAnalytes.length > 0 ? handleDeleteSelected : undefined}
											title="Xóa hàng loạt"
										>
											<FaTrashAlt className="mr-1" />
											{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
										</button>
										<button
											className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
												selectedAnalytes.length > 0 ? 'bg-blue-500' : 'bg-gray-300 cursor-not-allowed'
											} mr-2`}
											onClick={selectedAnalytes.length > 0 ? handleBulkTransfer : undefined}
										>
											<FaUserCog className="mr-1" />
											{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
										</button>
										{/* Add the bulk deadline update button */}
										<button
											className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
												selectedAnalytes.length > 0 ? 'bg-orange-500' : 'bg-gray-300 cursor-not-allowed'
											} mr-2`}
											onClick={selectedAnalytes.length > 0 ? handleBulkDeadlineUpdate : undefined}
											title="Cập nhật hạn trả"
										>
											<MdCalendarMonth className="mr-1" size={16} />
											{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
										</button>
										{/* Add button to update field in bulk */}
										<button
											className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
												selectedAnalytes.length > 0 ? 'bg-purple-500' : 'bg-gray-300 cursor-not-allowed'
											} mr-2`}
											onClick={selectedAnalytes.length > 0 ? handleBulkFieldUpdate : undefined}
											title="Cập nhật lĩnh vực"
										>
											<FaLayerGroup className="mr-1" size={14} />
											{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
										</button>
									</div>
								</div>
							</div>
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
											<th className="py-2 border-x w-20 min-w-20">Ghi chú</th>
											<th className="py-2 border-x w-10 min-w-10 cursor-pointer" onClick={handleSelectAllAnalytes}>
												<input
													type="checkbox"
													checked={selectAllAnalytes}
													onChange={handleSelectAllAnalytes}
													className="w-4 h-4 pointer-events-none"
												/>
											</th>
										</tr>
									</thead>
									<tbody>
										{listAnalytes.map((order) => (
											<tr key={`${getSampleUid(order.sampleId || order.sample_id)}-${order.id}`}>
												<td className="p-1 border">
													<NavLink
														to={`/dashboard/sample?receiptId=${receiptId}&sampleId=${getSampleUid(
															order.sampleId || order.sample_id,
														)}`}
														className="text-primary font-semibold hover:text-[#103667]"
													>
														{getSampleUid(order.sampleId || order.sample_id)}
													</NavLink>
												</td>
												<td className="p-1 border text-start">{order.parameterName}</td>
												<td className="p-1 border text-start">
													<span>
														<p>{order.protocolCode}</p>
														<p className="text-slate-300 text-sm">{order.protocolSource} </p>
													</span>
												</td>
												<td className="p-1 border relative" onClick={() => handleResultValueClick(order)}>
													{editingField === `resultValue-${order.sampleId}-${order.id}` && isEditorVisible ? (
														<TinyMceInput value={inputValue} onUpdate={handleSaveContent} onKey={handleKeyDown} />
													) : (
														<div
															dangerouslySetInnerHTML={{
																__html: order.resultValue || '--',
															}}
														/>
													)}
												</td>
												<td className="p-1 border relative" onClick={() => handleResultUnitClick(order)}>
													{editingField === `resultUnit-${order.sampleId}-${order.id}` && isEditorVisible ? (
														<TinyMceInput value={inputValue} onUpdate={handleSaveContent} onKey={handleKeyDown} />
													) : (
														<div
															className="min-h-6"
															dangerouslySetInnerHTML={{
																__html: order.resultUnit || '--',
															}}
														/>
													)}
												</td>
												<td className="p-1 border text-start">
													{canViewDeadline() ? formatDate(order.deadline) : '--'}
												</td>
												<td className="p-1 border text-start">{getTechnicianName(order.technicianId)}</td>
												<td className="p-1 border text-center">
													<div
														className="flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
														onClick={(e) => handleNoteClick(order, e)}
														onMouseEnter={(e) => {
															if (order.note) {
																showTooltip(e, order.note, 'left');
															}
														}}
														onMouseLeave={hideTooltip}
														title={order.note ? 'Click để xem/thêm ghi chú' : 'Click để thêm ghi chú'}
													>
														{order.note ? (
															<span className="text-2xl">📝</span>
														) : (
															<span className="text-2xl text-gray-400">📋</span>
														)}
													</div>
												</td>
												<td
													className="pt-[5px] pb-0 border align-top text-center cursor-pointer"
													onClick={() => handleAnalyteSelect(order.id)}
												>
													<input
														type="checkbox"
														checked={selectedAnalytes.includes(order.id)}
														onChange={() => handleAnalyteSelect(order.id)}
														className="w-4 h-4 mt-2 pointer-events-none"
													/>
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
										const analyses = sample.analyses || sample.analysis || [];
										const totalTests = analyses.length;
										const completedTests =
											analyses.filter((order) => order?.resultValue !== null && order?.resultValue !== '<p></p>')
												?.length || 0;
										const pendingTests = totalTests - completedTests;

										return (
											<tr key={sample.id}>
												<td className="p-2 px-1 border text-start text-text-secondary relative">
													<NavLink
														to={`/dashboard/sample?receiptId=${receiptId}&sampleId=${sample.sampleId}`}
														className="text-primary font-semibold hover:text-[#103667]"
													>
														{sample.sampleId}
													</NavLink>
													{allAnalysesReviewed(sample) && (
														<span className="absolute top-1 right-2 text-yellow-500 font-bold">*</span>
													)}
													<span
														className="absolute top-1 right-1 text-blue-500 cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															window.open(
																`/dashboard/receipt/print_sp?receiptId=${currentReceipt?.receiptId}&sampleId=${sample.sampleId}`,
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
															value={sample?.sampleName || sample?.sample_name || ''}
															onChange={(e) => handleSampleChange(sample.id, 'sampleName', e.target.value)}
															onKeyDown={(e) => handleTextareaKeyDown(e, sample.id, 'sampleName', e.target.value)}
															onBlur={(e) => handleTextareaBlur(sample.id, 'sampleName', e.target.value)}
															className="p-1 border rounded-md w-full text-sm bg-white resize-none"
															rows={2}
														/>
													) : (
														displayValue(sample.sampleName || sample.sample_name)
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
															value={sample.sampleDescription || sample.sample_description || ''}
															onChange={(e) => handleSampleChange(sample.id, 'sampleDescription', e.target.value)}
															onKeyDown={(e) =>
																handleTextareaKeyDown(e, sample.id, 'sampleDescription', e.target.value)
															}
															onBlur={(e) => handleTextareaBlur(sample.id, 'sampleDescription', e.target.value)}
															className="p-1 border rounded-md w-full text-sm bg-white resize-none"
															rows={2}
														/>
													) : (
														displayValue(sample.sampleDescription || sample.sample_description)
													)}
												</td>
												<td className="p-2 border text-start">
													{isEditMode ? (
														<textarea
															value={sample.sampleVolume || sample.sample_volume || ''}
															onChange={(e) => handleSampleChange(sample.id, 'sampleVolume', e.target.value)}
															onKeyDown={(e) => handleTextareaKeyDown(e, sample.id, 'sampleVolume', e.target.value)}
															onBlur={(e) => handleTextareaBlur(sample.id, 'sampleVolume', e.target.value)}
															className="p-1 border rounded-md w-full text-sm bg-white resize-none"
															rows={2}
														/>
													) : (
														displayValue(sample.sampleVolume || sample.sample_volume)
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
					deleteType === 'multiple'
						? `Bạn có chắc chắn muốn xóa ${selectedAnalytes.length} chỉ tiêu đã chọn?`
						: 'Bạn có chắc chắn muốn xóa mục này?',
					deleteType === 'multiple'
						? handleDeleteMultipleConfirmAction
						: deleteType === 'sample'
						? handleDeleteSampleConfirmAction
						: handleDeleteAnalysisConfirmAction,
				)}{' '}
			{/* EmailForm */}
			<EmailForm
				from={emailFormData.from}
				to={emailFormData.to}
				subject={emailFormData.subject}
				body={emailFormData.body}
				attachments={emailFormData.attachments}
				foreignKeyUIDs={[currentReceipt?._deprecated_recordCode, currentReceipt?.orderId]}
				isVisible={isEmailFormVisible}
				onClose={() => setIsEmailFormVisible(false)}
				onSubmit={handleEmailSubmit}
			/>
			{/* FileForm */}
			<FileForm
				foreignKeyUIDs={[currentReceipt?._deprecated_recordCode, currentReceipt?.orderId]}
				// localPath="activities/LAB"
				objectPath="activities/LAB"
				isVisible={isFileFormVisible}
				onClose={() => setIsFileFormVisible(false)}
			/>
			{/* QR Scanner Modal */}
			{isQRScannerOpen && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
					<div className="bg-white p-4 rounded-lg w-[90%] max-w-2xl h-[80vh] max-h-[600px] relative flex flex-col">
						<button
							className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold z-10"
							onClick={closeQRScanner}
						>
							×
						</button>
						<h3 className="text-lg font-semibold mb-3 flex items-center">
							<FaCamera className="mr-2 text-blue-500" />
							Quét mã QR
						</h3>

						{/* Camera view area - takes most of the space */}
						<div className="flex-1 flex flex-col">
							<p className="text-gray-600 mb-3 text-center text-sm">Hướng camera vào mã QR để quét và điều hướng</p>

							{/* QR Scanner area - maximized */}
							<div className="flex-1 relative">
								<div
									id="qr-reader"
									className="w-full h-full min-h-[300px] border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
								>
									{/* Placeholder content when scanner is not active */}
									{cameraPermission !== 'granted' && (
										<div className="w-full h-full flex items-center justify-center text-gray-400">
											<div className="text-center">
												<FaQrcode size={48} className="mx-auto mb-3" />
												<p className="text-sm">Cấp quyền camera để bắt đầu quét</p>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Control buttons area */}
						<div className="mt-4 border-t pt-4">
							{/* Camera permission status */}
							{(cameraPermission === 'denied' || cameraPermission === null) && (
								<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
									<div className="flex items-center justify-center mb-2">
										<FaCamera className="text-yellow-600 mr-2" />
										<p className="text-sm text-yellow-800">
											{cameraPermission === null
												? 'Cần kiểm tra và cấp quyền camera'
												: 'Cần cấp quyền camera để sử dụng chức năng này'}
										</p>
									</div>
									<div className="text-center">
										<button
											onClick={requestCameraPermission}
											disabled={isRequestingPermission}
											className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 disabled:opacity-50 font-medium"
										>
											{isRequestingPermission ? 'Đang yêu cầu...' : 'Cấp quyền camera'}
										</button>
									</div>
								</div>
							)}

							{/* Success message when camera is granted */}
							{cameraPermission === 'granted' && (
								<div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
									<div className="flex items-center justify-center">
										<FaCamera className="text-green-600 mr-2" />
										<p className="text-sm text-green-800">Camera đã sẵn sàng - Hướng vào mã QR để quét</p>
									</div>
								</div>
							)}

							{/* Help text */}
							<div className="text-xs text-gray-500 space-y-1 text-center">
								<p>💡 Đảm bảo mã QR chứa URL hợp lệ</p>
								<p>🔒 Quyền camera chỉ được sử dụng để quét mã QR</p>
								<p>📱 Hướng camera về phía mã QR và giữ ổn định</p>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* Bulk Transfer Modal */}
			{isTransferMultipleVisible && renderBulkTransferForm()}
			{/* Bulk Deadline Update Modal */}
			{isBulkDeadlineVisible && renderBulkDeadlinePicker()}
			{/* Tooltip Portal */}
			{tooltip.visible &&
				createPortal(
					<div
						className={`custom-tooltip ${tooltip.visible ? 'visible' : ''} ${tooltip.position}`}
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
};

export default ReceiptInfor;
