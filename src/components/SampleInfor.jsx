import * as React from 'react';
import { AiOutlinePlus } from 'react-icons/ai';
const { useContext, useState, useEffect, useRef } = React;
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { GlobalContext } from '../contexts/GlobalContext';
import Breadcrumb from './Breadcrumb';
import TinyMceInput from './Input';
import { RiEdit2Line } from 'react-icons/ri';
import { GrDocumentText, GrPrint } from 'react-icons/gr';
import { MdLibraryAdd, MdChevronLeft, MdChevronRight, MdCalendarMonth } from 'react-icons/md';
import FilterBar from './FilterBar';
import Swal from 'sweetalert2';

import {
	FaTrashAlt,
	FaCopy,
	FaUserCog,
	FaSave,
	FaTimes,
	FaRegTimesCircle,
	FaDatabase,
	FaStar,
	FaRegCopy,
	FaCheck,
	FaSync,
	FaLayerGroup,
} from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
// Replace axios import with our helper functions
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';

const SampleInfor = () => {
	const [searchParams] = useSearchParams();
	const receipt_uid = searchParams.get('receipt_uid');
	const sample_uid = searchParams.get('sample_uid');
	const { setCurrentTitlePage, technicians, formatDate, status, purposes, currentUser, getIdenByUid } =
		useContext(GlobalContext);
	const [currentSample, setCurrentSample] = useState(null);
	const [sample, setSample] = useState(null);
	const [listAnalytes, setListAnalytes] = useState([]);
	const [editingField, setEditingField] = useState(null);
	const [inputValue, setInputValue] = useState('');
	const [isEditorVisible, setIsEditorVisible] = useState(false);
	const [isEditingSample, setIsEditingSample] = useState(false);
	const [listSampleByReceipt, setListSampleByReceipt] = useState([]);
	// Replace single newReport with separate states for customer and receipt info
	const [customerInfo, setCustomerInfo] = useState([]);
	const [receiptInfo, setReceiptInfo] = useState([]);
	const [newField, setNewField] = useState({ fname: '', fvalue: '' });
	const [isAddingParameter, setIsAddingParameter] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [parameterList, setParameterList] = useState([]);
	const [selectedParameters, setSelectedParameters] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const [dropdownPosition, setDropdownPosition] = useState({
		top: 0,
		left: 0,
	});
	const [deadlineDropdownVisible, setDeadlineDropdownVisible] = useState(null);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [originalSample, setOriginalSample] = useState(null); // Store original sample data
	const [isReportChanged, setIsReportChanged] = useState(false); // Track if report has changed
	const [typingTimeout, setTypingTimeout] = useState(null);
	const [receiptFull, setReceiptFull] = useState({}); // Add state to store receipt samples
	const [isDropdownVisible, setIsDropdownVisible] = useState(false);
	const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
	const [deleteItemId, setDeleteItemId] = useState(null);
	const [deleteType, setDeleteType] = useState(''); // Add state to track delete type
	const [selectedAnalytes, setSelectedAnalytes] = useState([]); // Add state to track selected analytes
	const [selectAll, setSelectAll] = useState(false); // Add state for select all checkbox
	const [isTransferMultipleVisible, setIsTransferMultipleVisible] = useState(false);
	const [selectedTechnician, setSelectedTechnician] = useState(null);
	const [scrollPosition, setScrollPosition] = useState(0);
	const [showScrollButtons, setShowScrollButtons] = useState(false);
	const statusContainerRef = useRef(null);
	const [isAddingNewParameter, setIsAddingNewParameter] = useState(false);
	const [newParameter, setNewParameter] = useState({
		parameter_name: '',
		parameter_uid: '',
		matrix: '',
		protocol_code: '',
		protocol_source: 'IRDOP',
		result_value: '',
		result_unit: '',
		deadline: new Date().toISOString(),
		technician_uid: '',
		sample_id: 0,
	});
	const [editingParameterField, setEditingParameterField] = useState(null); // Add state to track which parameter field is being edited
	const [editingMatrixField, setEditingMatrixField] = useState(null); // Add state to track which matrix field is being edited
	const [editingProtocolField, setEditingProtocolField] = useState(null); // Add state to track which protocol field is being edited
	const [sampleDropdownVisible, setSampleDropdownVisible] = useState(false);
	const [isBulkDeadlineVisible, setIsBulkDeadlineVisible] = useState(false);
	const [bulkDeadlineDate, setBulkDeadlineDate] = useState(new Date());

	// Add new state variables for unique lists and dropdowns
	const [uniqueParameterNames, setUniqueParameterNames] = useState([]);
	const [uniqueMatrices, setUniqueMatrices] = useState([]);
	const [uniqueProtocolCodes, setUniqueProtocolCodes] = useState([]);
	const [uniqueUnits, setUniqueUnits] = useState([]);
	const [matrixInput, setMatrixInput] = useState('');
	const [protocolCodeInput, setProtocolCodeInput] = useState('');
	const [unitInput, setUnitInput] = useState('');
	const [showMatrixDropdown, setShowMatrixDropdown] = useState(false);
	const [showProtocolCodeDropdown, setShowProtocolCodeDropdown] = useState(false);
	const [showUnitDropdown, setShowUnitDropdown] = useState(false);
	// Add state variables for pagination in dropdowns
	const [parameterNamePage, setParameterNamePage] = useState(1);
	const [matrixPage, setMatrixPage] = useState(1);
	const [protocolCodePage, setProtocolCodePage] = useState(1);
	const [unitPage, setUnitPage] = useState(1);
	const itemsPerPage = 6; // 6 items per page for all dropdowns

	let isFetch = false;
	const [copied, setCopied] = useState(false);

	function CopyButton({ textToCopy }) {
		// Accept text as a prop

		const copyToClipboard = (text) => {
			navigator.clipboard.writeText(text); // Use the parameter 'text'
			setCopied(true);
			showToast(`Đã copy mã mẫu`);
		};

		return (
			<div>
				<FaRegCopy
					className="absolute right-2 top-0 translate-y-3 cursor-pointer text-gray-500"
					size={16}
					onClick={() => copyToClipboard(textToCopy)} // Pass the text to copy
					title={copied ? 'Copied!' : 'Copy to Clipboard'}
				/>
			</div>
		);
	}

	// Check if scroll buttons should be shown
	useEffect(() => {
		const checkOverflow = () => {
			if (statusContainerRef.current) {
				const isOverflowing = statusContainerRef.current.scrollWidth > statusContainerRef.current.clientWidth;
				setShowScrollButtons(isOverflowing);
			}
		};

		checkOverflow();
		// Add event listener for window resize to recheck overflow
		window.addEventListener('resize', checkOverflow);

		return () => {
			window.removeEventListener('resize', checkOverflow);
		};
	}, [sample, statusContainerRef.current]);

	// Functions to handle status scrolling
	const scrollLeft = () => {
		if (statusContainerRef.current) {
			statusContainerRef.current.scrollBy({
				left: -100,
				behavior: 'smooth',
			});
			setScrollPosition(statusContainerRef.current.scrollLeft - 100);
		}
	};

	const scrollRight = () => {
		if (statusContainerRef.current) {
			statusContainerRef.current.scrollBy({
				left: 100,
				behavior: 'smooth',
			});
			setScrollPosition(statusContainerRef.current.scrollLeft + 100);
		}
	};

	// Add function to handle accreditation toggle
	const handleAccreditationToggle = async (analysisId) => {
		try {
			// Find the analysis
			const analysis = listAnalytes.find((item) => item.id === analysisId);
			if (!analysis) return;

			// Determine new accreditation value
			const newAccreditation = !analysis.accreditation || analysis.accreditation.trim() === '' ? '107' : '';

			// Update UI immediately
			const updatedAnalytes = listAnalytes.map((item) => {
				if (item.id === analysisId) {
					return { ...item, accreditation: newAccreditation };
				}
				return item;
			});
			setListAnalytes(updatedAnalytes);

			// Create minimal update object
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				accreditation: newAccreditation,
				modified_by_uid: currentUser.identity_uid,
			};

			// Send the update to the server
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast(newAccreditation ? 'Đã thêm chứng nhận' : 'Đã bỏ chứng nhận');
			} else {
				// Revert UI on error
				setListAnalytes(listAnalytes);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật chứng nhận',
				});
			}
		} catch (error) {
			console.error('Error updating accreditation:', error);
			// Revert UI on error
			setListAnalytes(listAnalytes);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật chứng nhận',
			});
		}
	};

	// Add function to handle saving individual field changes
	const handleSaveField = async (field, value) => {
		try {
			// Create a copy of the sample with just the updated field
			const updatedSample = {
				...sample,
				[field]: value,
				modified_by_uid: currentUser.identity_uid,
			};

			// Update corresponding values in sample_information arrays if needed
			if (field === 'sample_name') {
				// Update the "Tên mẫu thử / name." field in customerInfo
				const updatedCustomerInfo = customerInfo.map((item) => {
					if (item.fname.includes('Tên mẫu thử') || item.fname.includes('name')) {
						return { ...item, fvalue: value };
					}
					return item;
				});
				updatedSample.sample_information = [...updatedCustomerInfo, ...receiptInfo];
				setCustomerInfo(updatedCustomerInfo);
			}

			if (field === 'sample_description') {
				// Update the "Mô tả / desc." field in receiptInfo
				const updatedReceiptInfo = receiptInfo.map((item) => {
					if (item.fname.includes('Mô tả') || item.fname.includes('desc')) {
						return { ...item, fvalue: value };
					}
					return item;
				});
				updatedSample.sample_information = [...customerInfo, ...updatedReceiptInfo];
				setReceiptInfo(updatedReceiptInfo);
			}
			if (field === 'matrix') {
				// Update the "Nền mẫu / matrix." field in receiptInfo only locally
				const updatedReceiptInfo = receiptInfo.map((item) => {
					if (item.fname.includes('Nền mẫu') || item.fname.includes('matrix')) {
						return { ...item, fvalue: value };
					}
					return item;
				});
				setReceiptInfo(updatedReceiptInfo);
				// Don't include sample_information in matrix updates
			} // Send the update to the server using the required structure
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', {
				sample: {
					id: sample.id,
					sample_uid: sample.sample_uid,
					[field]: value,
					modified_by_uid: currentUser.identity_uid,
					...(field === 'sample_name' && { sample_information: [...customerInfo, ...receiptInfo] }),
					...(field === 'sample_description' && { sample_information: [...customerInfo, ...receiptInfo] }),
				},
			});

			if (response.status === 200) {
				showToast(`${field} updated successfully!`);
				// Update local state
				setSample((prev) => ({ ...prev, [field]: value }));
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || `Failed to update ${field}.`,
				});
			}
		} catch (error) {
			console.error(`Error updating ${field}:`, error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || `An error occurred while updating ${field}.`,
			});
		}
	};

	// New handler for field keydown events
	const handleFieldKeyDown = (e, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			// Just blur the field - the blur handler will save the data
			e.target.blur();
		}
	};

	// Update the function to properly update all analyses matrices
	const updateAllAnalysesMatrices = async (newMatrixValue) => {
		try {
			// Update all analyses with the new matrix value
			const updatedAnalyses = [];

			for (const analysis of listAnalytes) {
				// Create minimal update object with only required fields
				const updateData = {
					id: analysis.id,
					sample_id: analysis.sample_id,
					receipt_id: analysis.receipt_id,
					matrix: newMatrixValue,
					modified_by_uid: currentUser.identity_uid,
				};

				updatedAnalyses.push(updateData);
			}

			// Update UI first
			const newAnalytesList = listAnalytes.map((analyte) => ({
				...analyte,
				matrix: newMatrixValue,
			}));
			setListAnalytes(newAnalytesList);

			// Call API for each analysis
			for (const analysis of updatedAnalyses) {
				await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
					analysis: analysis,
				});
			}

			showToast(`Đã cập nhật nền mẫu cho ${updatedAnalyses.length} chỉ tiêu`);
		} catch (error) {
			console.error('Error updating analyses matrices:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật nền mẫu cho chỉ tiêu.',
			});
		}
	};

	// Modified to update all analyses matrices when sample matrix changes
	const handleFieldBlur = (field, value, originalValue) => {
		// If matrix field is changing, update all analyses too
		if (field === 'matrix') {
			updateAllAnalysesMatrices(value);
		}

		// Always save on blur, without checking if value changed
		handleSaveField(field, value);
	};

	// Add handler for field column editing
	const handleFieldColumnChange = async (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, field: newValue };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);

		try {
			const analysis = updatedAnalytes.find((item) => item.id === index);

			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				field: newValue,
				modified_by_uid: currentUser.identity_uid,
			};

			// Send the update to the server
			await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});

			showToast('Đã cập nhật lĩnh vực thành công!');
		} catch (error) {
			console.error('Error updating field:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật lĩnh vực',
			});
		}
	};

	// Modified status change handler
	const handleStatusChange = (statusIndex) => {
		handleSaveField('status', statusIndex);
	};

	// Modified purpose change handler
	const handlePurposeChange = (e) => {
		handleSaveField('purpose', e.target.value);
	};

	// Function to open PPT in new window
	const openPPTWindow = () => {
		// Don't allow technicians to open PPT window
		if (isTechnician()) {
			showToast('Bạn không có quyền tạo phiếu kết quả', 'error');
			return;
		}

		if (sample?.report?.length > 0) {
			// Lấy object có publish_date lớn nhất
			const latestReport = sample.report.reduce((prev, current) =>
				new Date(prev.publish_date) > new Date(current.publish_date) ? prev : current,
			);
			// Mở trang với ppt_uid từ report
			window.open(
				`${window.location.origin}/report?sample_uid=${sample_uid}&ppt_uid=${latestReport.ppt_uid}`,
				'_blank',
			);
		} else {
			// Nếu không có report, mở trang mặc định
			window.open(`${window.location.origin}/report?sample_uid=${sample_uid}`, '_blank');
		}
	};

	// Add new function to navigate to result page
	const openPKQWindow = () => {
		// Navigate to the result page with the current sample_uid
		navigate(`/result?sample_uid=${sample_uid}`);
	};

	const fetchReceiptFull = async () => {
		try {
			const response = await apiGet(`https://black.irdop.org/khsi19me/db/get/receipt_full/${receipt_uid}`);
			setReceiptFull(response.data);
			// Update listSampleByReceipt with samples from receiptFull
			if (response.data && response.data.samples) {
				setListSampleByReceipt(response.data.samples);
			}
		} catch (error) {
			console.error('Error fetching receipt full:', error);
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

	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
		if (typingTimeout) clearTimeout(typingTimeout);
		if (e.target.value.length > 4) {
			const timeout = setTimeout(() => {
				if (e.target.value.trim() !== '') {
					searchParameters(e.target.value);
				}
			}, 500);

			setTypingTimeout(timeout);
		}
	};

	const handleSampleSelectFromDropdown = async (sampleUid) => {
		// Find the sample in receiptFull with the matching sample_uid
		let analyses = receiptFull.samples.find((sample) => sample.sample_uid === sampleUid).analysis;

		// Create a clone of the analyses without result values and review info
		analyses = analyses.map((analysis) => {
			// Create a new object without the specific fields we want to exclude
			const { id, result_value, reviewed_by, ...cleanAnalysis } = analysis;
			// Return the cleaned analysis with a temporary id for UI rendering
			return {
				...cleanAnalysis,
				temp_id: Math.random().toString(36).substr(2, 9),
			};
		});

		// Check for duplicate parameters that already exist in the current sample
		const existingParameterNames = listAnalytes.map((a) => a.parameter_name.toLowerCase().trim());
		const filteredAnalyses = analyses.filter(
			(analysis) => !existingParameterNames.includes(analysis.parameter_name.toLowerCase().trim()),
		);

		setSelectedParameters(filteredAnalyses);
		setIsDropdownVisible(false);
	};

	const handleSearchKeyDown = (e) => {
		if (e.key === 'Enter' && searchTerm.length >= 2) {
			if (typingTimeout) clearTimeout(typingTimeout);
			searchParameters(searchTerm);
		}
	};

	const searchParameters = async (query) => {
		try {
			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/search/parameter', {
				query,
				matrix: currentSample.matrix,
			});
			setParameterList(response.data);
		} catch (error) {
			console.error('Error searching parameters:', error);
		}
	};

	const handleParameterSelect = (parameter) => {
		if (!selectedParameters.some((p) => p.id === parameter.id)) {
			// Make sure parameter_uid is included when adding parameters
			setSelectedParameters([
				...selectedParameters,
				{
					...parameter,
					parameter_uid: parameter.parameter_uid || '',
				},
			]);
		}
		setSearchTerm(''); // Clear the search input field
	};

	const handleRemoveParameter = (index) => {
		const updatedParameters = selectedParameters.filter((_, i) => i !== index);
		setSelectedParameters(updatedParameters);
	};

	const handleConfirmAddParameter = async () => {
		try {
			if (selectedParameters.length === 0) {
				showToast('Không có chỉ tiêu nào được chọn', 'warning');
				return;
			}

			// Filter out any parameters that have the same name as existing ones
			const existingParameterNames = listAnalytes.map((a) => a.parameter_name.toLowerCase().trim());
			const filteredParameters = selectedParameters.filter(
				(param) => !existingParameterNames.includes(param.parameter_name.toLowerCase().trim()),
			);

			if (filteredParameters.length === 0) {
				showToast('Tất cả chỉ tiêu đã tồn tại trong mẫu này', 'warning');
				setIsAddingParameter(false);
				setSelectedParameters([]);
				return;
			}

			const parameters = filteredParameters.map((parameter) => ({
				receipt_id: currentSample.receipt_id,
				sample_id: currentSample.id,
				parameter_id: parameter.parameter_id || 0,
				parameter_name: parameter.parameter_name,
				parameter_uid: parameter.parameter_uid || '', // Ensure parameter_uid is included
				accrenditation: parameter.accrenditation,
				protocol_id: parameter.protocol_id,
				technician_uid: parameter.technician_uid,
				deadline: parameter.deadline
					? parameter.deadline
					: new Date(Date.now() + parameter?.tat_expected?.days * 24 * 60 * 60 * 1000 || 0),
				protocol_code: parameter.protocol_code,
				result_unit: parameter.default_unit || parameter.result_unit,
				protocol_source: parameter.protocol_source,
				created_by_uid: currentUser.identity_uid,
				modified_by_uid: currentUser.identity_uid,
			}));

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/insert/bulk/analysis', {
				analyses: parameters,
			});

			if (response.status === 200) {
				showToast(`${response.data.length} chỉ tiêu được thêm thành công!`);
				setIsAddingParameter(false);
				setSelectedParameters([]);

				// Update listAnalytes with the new analyses from the API response
				setListAnalytes([...listAnalytes, ...response.data]);

				// Also update currentSample to maintain consistency
				setCurrentSample({
					...currentSample,
					analysis: [...currentSample.analysis, ...response.data],
				});
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to add parameters.',
				});
			}
		} catch (error) {
			console.error('Error adding parameters:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while adding parameters.',
			});
		}
	};

	const handleCancelAddParameter = () => {
		setIsAddingParameter(false);
		setSelectedParameters([]);
	};

	const handleAddNewParameter = () => {
		setIsAddingParameter(false);
		setIsAddingNewParameter(true);
		// Set the sample_id from the current sample
		setNewParameter({
			...newParameter,
			sample_id: currentSample?.id,
			matrix: currentSample?.matrix || '',
		});
		// Scroll to the top of the table
		window.scrollTo({
			top: document.querySelector('.analytes-table').offsetTop - 100,
			behavior: 'smooth',
		});
	};

	const handleCancelNewParameter = () => {
		setIsAddingNewParameter(false);
	};
	// These functions have been removed as they were related to updateParameterMode	// Helper function for updating analysis
	const updateAnalysis = async (analysis) => {
		try {
			// Determine which fields need to be updated
			const changedFields = {};

			// Identify which fields need to be updated
			if (analysis.parameter_name !== undefined) changedFields.parameter_name = analysis.parameter_name;
			if (analysis.result_value !== undefined) changedFields.result_value = analysis.result_value;
			if (analysis.matrix !== undefined) changedFields.matrix = analysis.matrix;
			if (analysis.result_unit !== undefined) changedFields.result_unit = analysis.result_unit;
			if (analysis.protocol_code !== undefined) changedFields.protocol_code = analysis.protocol_code;
			if (analysis.protocol_source !== undefined) changedFields.protocol_source = analysis.protocol_source;
			if (analysis.deadline !== undefined) changedFields.deadline = analysis.deadline;
			if (analysis.field !== undefined) changedFields.field = analysis.field;

			// Create minimal update object
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				modified_by_uid: currentUser.identity_uid,
				...changedFields,
			};

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Chỉ tiêu đã được cập nhật!');
				// Return the analysis data from the response instead of the original analysis
				return response.data || analysis;
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật chỉ tiêu.',
				});
			}
			return analysis;
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật.',
			});
			return analysis;
		}
	};
	const onUpdateAnalysis = async (analysis) => {
		try {
			// Determine which field is being updated
			const fieldBeingUpdated = {};

			// Check each field that might have been updated
			if (analysis.parameter_name !== undefined) fieldBeingUpdated.parameter_name = analysis.parameter_name;
			if (analysis.result_value !== undefined) fieldBeingUpdated.result_value = analysis.result_value;
			if (analysis.result_unit !== undefined) fieldBeingUpdated.result_unit = analysis.result_unit;
			if (analysis.protocol_code !== undefined) fieldBeingUpdated.protocol_code = analysis.protocol_code;
			if (analysis.protocol_source !== undefined) fieldBeingUpdated.protocol_source = analysis.protocol_source;
			if (analysis.technician_uid !== undefined) fieldBeingUpdated.technician_uid = analysis.technician_uid;
			if (analysis.deadline !== undefined) fieldBeingUpdated.deadline = analysis.deadline;

			// Create minimal update object
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				modified_by_uid: currentUser.identity_uid,
				...fieldBeingUpdated,
			};

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Chỉ tiêu đã được cập nhật!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật chỉ tiêu.',
				});
			}
			return analysis;
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật chỉ tiêu.',
			});
			return analysis;
		}
	};

	const handleSaveNewParameter = async () => {
		try {
			// Make sure required fields are filled
			if (!newParameter.parameter_name) {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: 'Tên chỉ tiêu không được để trống',
				});
				return;
			} // We don't update the parameter library anymore
			var parameter_id = 0;

			// Now create the analysis with the parameter_id
			const analysisToAdd = {
				...newParameter,
				parameter_id: parameter_id,
				receipt_id: currentSample.receipt_id,
				sample_id: currentSample.id,
				created_by_uid: currentUser.identity_uid,
				modified_by_uid: currentUser.identity_uid,
			};

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/insert/analysis', {
				analysis: analysisToAdd,
			});

			if (response.status === 200) {
				showToast('Chỉ tiêu đã được thêm thành công!');
				// Add the new parameter to the list
				setListAnalytes([response.data, ...listAnalytes]);
				setIsAddingNewParameter(false);
				// Reset the new parameter object
				setNewParameter({
					parameter_name: '',
					parameter_uid: '',
					matrix: currentSample?.matrix || '',
					protocol_code: '',
					protocol_source: 'IRDOP',
					result_value: '',
					result_unit: '',
					deadline: new Date().toISOString(),
					technician_uid: '',
					sample_id: currentSample?.id || 0,
				});
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Không thể thêm chỉ tiêu.',
				});
			}
		} catch (error) {
			console.error('Error adding new parameter:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi thêm chỉ tiêu.',
			});
		}
	};

	const handleNewParameterChange = (field, value) => {
		setNewParameter({
			...newParameter,
			[field]: value,
		});
	};

	const renderNewParameter = () => {
		const paginatedParameters = parameterList.slice((currentPage - 1) * 5, currentPage * 5);

		const handlePageChange = (page) => {
			setCurrentPage(page);
		};

		const renderPageButtons = () => {
			const totalPages = Math.ceil(parameterList.length / 5);
			const pageButtons = [];

			if (totalPages <= 5) {
				for (let i = 1; i <= totalPages; i++) {
					pageButtons.push(
						<button
							key={i}
							className={`p-2 ${currentPage === i ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(i)}
						>
							{i}
						</button>,
					);
				}
			} else {
				if (currentPage > 2) {
					pageButtons.push(
						<button
							key={1}
							className={`p-2 ${currentPage === 1 ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(1)}
						>
							1
						</button>,
					);
					if (currentPage > 3) {
						pageButtons.push(<span key="dots1">...</span>);
					}
				}

				const startPage = Math.max(2, currentPage - 1);
				const endPage = Math.min(totalPages - 1, currentPage + 1);

				for (let i = startPage; i <= endPage; i++) {
					pageButtons.push(
						<button
							key={i}
							className={`p-2 ${currentPage === i ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(i)}
						>
							{i}
						</button>,
					);
				}

				if (currentPage < totalPages - 2) {
					if (currentPage < totalPages - 3) {
						pageButtons.push(<span key="dots2">...</span>);
					}
					pageButtons.push(
						<button
							key={totalPages}
							className={`p-2 ${currentPage === totalPages ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(totalPages)}
						>
							{totalPages}
						</button>,
					);
				}
			}

			return pageButtons;
		};

		return (
			<div
				className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50"
				onClick={() => setIsAddingParameter(false)} // Close when clicking the overlay
			>
				<div
					className="bg-white p-4 rounded-lg w-[90%] md:w-[70%] xl:w-[50%] h-3/5 max-w-[700px] min-h-[400px] max-h-[700px] relative"
					onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it
				>
					{/* Rest of the modal content stays the same */}
					<div className="w-full h-full relative flex flex-col justify-between overflow-auto">
						<div>
							<h2 className="text-2xl font-semibold mb-4">Thêm chỉ tiêu kiểm nghiệm</h2>
							<input
								type="text"
								value={searchTerm}
								onChange={handleSearchChange}
								onKeyDown={handleSearchKeyDown}
								className="w-full p-2 border rounded mb-4 bg-white focus:outline-none focus:border-purple-500"
								placeholder="Tìm kiếm chỉ tiêu..."
							/>

							{searchTerm.length > 1 && (
								<div className="absolute bg-white border rounded w-full max-h-72 overflow-y-auto mb-4 z-10">
									<ul>
										{paginatedParameters.map((parameter, index) => (
											<li
												key={index}
												className="p-2 border-b cursor-pointer hover:bg-gray-200"
												onClick={() => handleParameterSelect(parameter)}
											>
												<div>
													<p className="text-start text-xs font-medium w-full line-clamp-1">
														Nền mẫu: {parameter.matrix}
													</p>
													<p className="text-start text-primary font-medium w-full line-clamp-1">
														{parameter.parameter_name}
													</p>
													<p className="text-start text-text-secondary w-full line-clamp-1">
														{parameter.protocol_code}
														{parameter?.accreditation && <b>{` (${parameter.accreditation})`}</b>}
													</p>
												</div>
											</li>
										))}
									</ul>
									<div className="flex justify-center mt-2">{renderPageButtons()}</div>
								</div>
							)}
						</div>
						<div className="mb-4 h-full flex overflow-y-auto text-sm flex-wrap content-start">
							{selectedParameters.map((parameter, index) => (
								<div
									key={index}
									className="p-1 border rounded mb-2 flex text-start items-center w-fit h-fit mr-1 max-w-68"
								>
									<div>
										<p className="text-xs font-medium w-full line-clamp-1">Nền mẫu: {parameter.matrix}</p>
										<p className="text-primary font-medium w-full line-clamp-1">{parameter.parameter_name}</p>
										<p className="text-start text-text-secondary w-full line-clamp-1">
											{parameter.protocol_code}
											{parameter?.accreditation && <b>{` (${parameter.accreditation})`}</b>}
										</p>
									</div>

									<button className="text-red-500 px-2 py-3 ml-1" onClick={() => handleRemoveParameter(index)}>
										<FaTrashAlt />
									</button>
								</div>
							))}
						</div>
						<div className="flex justify-between items-center">
							<div className="relative flex">
								<button
									className="bg-white border-gray-300 p-2 rounded"
									onClick={() => setIsDropdownVisible(!isDropdownVisible)}
								>
									Sao chép chỉ tiêu
								</button>
								<button className="bg-white border-gray-300 p-2 rounded ml-2" onClick={handleAddNewParameter}>
									Thêm chỉ tiêu mới
								</button>
								{isDropdownVisible && (
									<div className="absolute bg-white border rounded w-full max-h-72 overflow-y-auto mt-2 z-10 bottom-10">
										<ul>
											{receiptFull.samples.map((sample) => (
												<li
													key={sample.sample_uid}
													className="p-2 border-b cursor-pointer hover:bg-gray-200"
													onClick={() => handleSampleSelectFromDropdown(sample.sample_uid)}
												>
													{sample.sample_uid}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>

							<div className="flex justify-end">
								<button className="bg-gray-500 text-white p-2 rounded mr-2" onClick={handleCancelAddParameter}>
									Hủy bỏ
								</button>
								<button className="bg-green-500 text-white p-2 rounded" onClick={handleConfirmAddParameter}>
									Xác nhận
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	};

	let defaultCustomerFields = [
		{
			fname: 'Tên mẫu thử / name.',
			fvalue: currentSample?.sample_name || '',
		},
		{ fname: 'Số lô / LOT no.', fvalue: '' },
		{ fname: 'Hạn sử dụng / exp.', fvalue: '' },
		{ fname: 'Ngày sản xuất / mfg.', fvalue: '' },
		{ fname: 'Nơi sản xuất / mfr.', favlue: '' },
	];
	let defaultReceiptFields = [
		{
			fname: 'Ngày tiếp nhận / receipt date.',
			fvalue: formatDate(receiptFull?.receipt_date) || '',
		},
		{ fname: 'Ngày thử nghiệm / test date.', fvalue: '' },
		{
			fname: 'Mô tả / desc.',
			fvalue: currentSample?.sample_description || '',
		},
		{ fname: 'Mã tiếp nhận / receipt code.', fvalue: receipt_uid || '' },
		{
			fname: 'Ngày hoàn thành / deadline.',
			fvalue: formatDate(receiptFull?.deadline) || '',
		},
		{ fname: 'Nền mẫu / matrix.', fvalue: currentSample?.matrix || '' },
	];

	const navigate = useNavigate();
	let key;

	useEffect(() => {
		fetchReceiptFull();
		setCurrentTitlePage('Mẫu kiểm nghiệm');

		// Fetch lists for dropdowns
		if (!isFetch) {
			isFetch = true;
			fetchDropdownLists();
		}
	}, []);

	// Add function to fetch dropdown lists
	const fetchDropdownLists = async () => {
		try {
			// Fetch matrices from API
			const matricesResponse = await apiGet('https://black.irdop.org/get/list_enum/matrix');
			if (matricesResponse.data && Array.isArray(matricesResponse.data)) {
				setUniqueMatrices(matricesResponse.data.filter(Boolean));
			}

			// Fetch units from API
			const unitsResponse = await apiGet('https://black.irdop.org/get/list_enum/unit');
			if (unitsResponse.data && Array.isArray(unitsResponse.data)) {
				setUniqueUnits(unitsResponse.data.filter(Boolean));
			}

			// Fetch parameter names and protocol codes from available analyses
			const parametersResponse = await apiGet('https://black.irdop.org/ha8i0uw2/db/get/parameter');
			if (parametersResponse.data && Array.isArray(parametersResponse.data)) {
				const parameterNames = [
					...new Set(parametersResponse.data.map((item) => item.parameter_name || '').filter(Boolean)),
				];
				const protocolCodes = [
					...new Set(parametersResponse.data.map((item) => item.protocol_code || '').filter(Boolean)),
				];

				setUniqueParameterNames(parameterNames);
				setUniqueProtocolCodes(protocolCodes);
			}
		} catch (error) {
			console.error('Error fetching dropdown lists:', error);
		}
	};

	// Filter functions with minimum character requirements
	const filterParameterNames = (input) => {
		if (!input || input.length < 2) return []; // Only show suggestions with 2+ characters
		return uniqueParameterNames.filter((name) => name && name.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterMatrices = (input) => {
		if (!input || input.length < 2) return []; // Only show suggestions with 2+ characters
		return uniqueMatrices.filter((matrix) => matrix && matrix.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterProtocolCodes = (input) => {
		if (!input || input.length < 2) return []; // Only show suggestions with 2+ characters
		return uniqueProtocolCodes.filter((code) => code && code.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterUnits = (input) => {
		if (!input || input.trim() === '') return []; // Only show suggestions if at least one character is typed
		return uniqueUnits.filter((unit) => unit && unit.toLowerCase().includes((input || '').toLowerCase()));
	};

	// Get paginated results for dropdowns
	const getPaginatedParameterNames = (input) => {
		const filtered = filterParameterNames(input);
		return filtered.slice((parameterNamePage - 1) * itemsPerPage, parameterNamePage * itemsPerPage);
	};

	const getPaginatedMatrices = (input) => {
		const filtered = filterMatrices(input);
		return filtered.slice((matrixPage - 1) * itemsPerPage, matrixPage * itemsPerPage);
	};

	const getPaginatedProtocolCodes = (input) => {
		const filtered = filterProtocolCodes(input);
		return filtered.slice((protocolCodePage - 1) * itemsPerPage, protocolCodePage * itemsPerPage);
	};

	const getPaginatedUnits = (input) => {
		const filtered = filterUnits(input);
		return filtered.slice((unitPage - 1) * itemsPerPage, unitPage * itemsPerPage);
	};

	// Pagination handlers for dropdowns
	const handleParameterNamePageChange = (pageNumber) => {
		setParameterNamePage(pageNumber);
	};

	const handleMatrixPageChange = (pageNumber) => {
		setMatrixPage(pageNumber);
	};

	const handleProtocolCodePageChange = (pageNumber) => {
		setProtocolCodePage(pageNumber);
	};

	const handleUnitPageChange = (pageNumber) => {
		setUnitPage(pageNumber);
	};

	useEffect(() => {
		const fetchSample = async () => {
			try {
				const response = await apiGet(`https://black.irdop.org/to82oe92i/db/get/sample_full/${sample_uid}`);

				// Process reviewer names for all analyses before setting state
				if (response.data && response.data.analysis) {
					for (const analysis of response.data.analysis) {
						if (analysis.reviewed_by) {
							// Call getIdenByUid and store the result directly in the analysis object
							const reviewerData = await getIdenByUid(analysis.reviewed_by);
							analysis.reviewerName = reviewerData ? reviewerData.identity_name : 'Unknown';
						}
					}
				}

				setSample(response.data);
				setCurrentSample(response.data);
				setListAnalytes(response.data.analysis);

				// Split sample_information into customer and receipt info
				if (response.data.sample_information && response.data.sample_information.length > 0) {
					// Fix: Properly separate receipt and customer info
					const sampleInfo = response.data.sample_information || [];

					// Look for receipt info markers in the fname field
					const receiptInfoItems = sampleInfo.filter(
						(item) =>
							item.fname.includes('Ngày tiếp nhận') ||
							item.fname.includes('receipt date') ||
							item.fname.includes('Mô tả') ||
							item.fname.includes('desc') ||
							item.fname.includes('Mã tiếp nhận') ||
							item.fname.includes('receipt code') ||
							item.fname.includes('Ngày hoàn thành') ||
							item.fname.includes('deadline') ||
							item.fname.includes('Nền mẫu') ||
							item.fname.includes('matrix'),
					);

					// All other items are customer info
					const customerInfoItems = sampleInfo.filter(
						(item) =>
							!item.fname.includes('Ngày tiếp nhận') &&
							!item.fname.includes('receipt date') &&
							!item.fname.includes('Mô tả') &&
							!item.fname.includes('desc') &&
							!item.fname.includes('Mã tiếp nhận') &&
							!item.fname.includes('receipt code') &&
							!item.fname.includes('Ngày hoàn thành') &&
							!item.fname.includes('deadline') &&
							!item.fname.includes('Nền mẫu') &&
							!item.fname.includes('matrix'),
					);

					setCustomerInfo(customerInfoItems);
					setReceiptInfo(receiptInfoItems);
				} else {
					// Initialize with empty arrays if no information is available
					setCustomerInfo([]);
					setReceiptInfo([]);
				}
			} catch (error) {
				console.error('Error fetching sample:', error);
			}
		};
		if (sample_uid) {
			fetchSample();
		}
	}, [sample_uid]);

	const handleSampleSelect = (sampleUid) => {
		navigate(`/dashboard/sample?receipt_uid=${receipt_uid}&sample_uid=${sampleUid}`);
	};

	const handleResultValueClick = (order) => {
		setEditingField(`result_value-${order.sample_id}-${order.id}`);
		setInputValue(order.result_value ? String(order.result_value) : '');
		setIsEditorVisible(true);
	};

	const handleResultUnitClick = (order) => {
		setEditingField(`result_unit-${order.sample_id}-${order.id}`);
		setInputValue(order.result_unit ? String(order.result_unit) : '');
		setIsEditorVisible(true);
	};

	const handleSaveContent = async (newValue) => {
		setInputValue(newValue);
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === parseInt(editingField.split('-')[2])) {
				if (editingField.startsWith('result_value')) {
					return { ...item, result_value: newValue };
				} else if (editingField.startsWith('result_unit')) {
					return { ...item, result_unit: newValue };
				} else if (editingField.startsWith('technician_uid')) {
					return { ...item, technician_uid: newValue };
				}
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
		setIsEditorVisible(false);
		setEditingField(null);

		try {
			const analysis = updatedAnalytes.find((item) => item.id === parseInt(editingField.split('-')[2]));

			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				modified_by_uid: currentUser.identity_uid,
			};

			// Add only the field being updated
			if (editingField.startsWith('result_value')) {
				updateData.result_value = newValue;
				// Add submission information when updating result value
				updateData.submit_result_by = currentUser?.identity_name;
				updateData.submit_result_at = new Date().toISOString();
			} else if (editingField.startsWith('result_unit')) {
				updateData.result_unit = newValue;
			} else if (editingField.startsWith('technician_uid')) {
				updateData.technician_uid = newValue;
			}

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});

			if (response.status === 200) {
				// Show more specific toast message based on what was updated
				if (editingField.startsWith('result_value')) {
					showToast(`Đã cập nhật kết quả thành công!`);
				} else if (editingField.startsWith('result_unit')) {
					showToast(`Đã cập nhật đơn vị thành công!`);
				} else {
					showToast(`Đã cập nhật thông tin thành công!`);
				}
			}
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating analysis.',
			});
		}
	};

	const handleKeyDown = async (e, newValue) => {
		key = e.key;
		if (key === 'Enter') {
			e.preventDefault();
			// Call handleSaveContent directly instead of just closing the editor
			handleSaveContent(newValue);
		}
	};

	const handleEditSample = () => {
		setIsEditingSample(true);
		setOriginalSample({ ...sample }); // Store original sample data
	};

	const handleCancelEdit = () => {
		setIsEditingSample(false);
		setSample(originalSample); // Revert to original sample data
		setIsReportChanged(false); // Hide the cancel and save buttons
	};

	const handleConfirmEdit = async () => {
		try {
			// Combine customerInfo and receiptInfo for saving
			const combinedInfo = [...customerInfo, ...receiptInfo];

			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', {
				sample: {
					id: sample.id,
					sample_uid: sample.sample_uid,
					sample_name: sample.sample_name,
					sample_description: sample.sample_description,
					matrix: sample.matrix,
					sample_information: combinedInfo,
					modified_by_uid: currentUser.identity_uid,
				},
			});

			if (response.status === 200) {
				showToast('Sample updated successfully!');
				setIsEditingSample(false);
				fetchReceiptFull(); // Fetch updated data
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to update sample.',
				});
			}
		} catch (error) {
			console.error('Error updating sample:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating sample.',
			});
		}
	};

	const handleInputChange = (field, value) => {
		setSample({ ...sample, [field]: value });

		// Update corresponding values in sample_information arrays
		if (field === 'sample_name') {
			// Update the "Tên mẫu thử / name." field in customerInfo
			const updatedCustomerInfo = customerInfo.map((item) => {
				if (item.fname.includes('Tên mẫu thử') || item.fname.includes('name')) {
					return { ...item, fvalue: value };
				}
				return item;
			});
			setCustomerInfo(updatedCustomerInfo);
			setIsReportChanged(true);
		}

		if (field === 'sample_description') {
			// Update the "Mô tả / desc." field in receiptInfo
			const updatedReceiptInfo = receiptInfo.map((item) => {
				if (item.fname.includes('Mô tả') || item.fname.includes('desc')) {
					return { ...item, fvalue: value };
				}
				return item;
			});
			setReceiptInfo(updatedReceiptInfo);
			setIsReportChanged(true);
		}

		if (field === 'matrix') {
			// Update the "Nền mẫu / matrix." field in receiptInfo
			const updatedReceiptInfo = receiptInfo.map((item) => {
				if (item.fname.includes('Nền mẫu') || item.fname.includes('matrix')) {
					return { ...item, fvalue: value };
				}
				return item;
			});
			setReceiptInfo(updatedReceiptInfo);
			setIsReportChanged(true);
		}
	};

	const handleAddCustomerField = () => {
		setCustomerInfo([...customerInfo, { ...newField }]);
		setNewField({ fname: '', fvalue: '' });
		setIsReportChanged(true); // Mark report as changed
	};

	const handleAddReceiptField = () => {
		// If there are no receipt fields yet, add one with the receipt date as the default
		if (receiptInfo.length === 0) {
			setReceiptInfo([
				{
					fname: 'Ngày tiếp nhận / receipt date.',
					fvalue: formatDate(receiptFull?.receipt_date) || '',
				},
			]);
		} else {
			// Otherwise, add an empty field
			setReceiptInfo([...receiptInfo, { ...newField }]);
		}
		setNewField({ fname: '', fvalue: '' });
		setIsReportChanged(true); // Mark report as changed
	};
	const handleCustomerFieldChange = (index, field, value) => {
		const updatedCustomerInfo = [...customerInfo];
		if (field === 'fname') {
			const selectedField = defaultCustomerFields.find((item) => item.fname === value);
			if (selectedField) {
				updatedCustomerInfo[index]['fvalue'] = selectedField.fvalue;
			} else if (value === 'Khác') {
				updatedCustomerInfo[index]['fvalue'] = '';
			}
		}
		if (field === 'other') {
			updatedCustomerInfo[index]['other'] = value;
		}
		updatedCustomerInfo[index][field] = value;
		setCustomerInfo(updatedCustomerInfo);
		setIsReportChanged(true); // Mark report as changed

		// We don't update sample_name when changing sample_information fields
	};
	const handleReceiptFieldChange = (index, field, value) => {
		const updatedReceiptInfo = [...receiptInfo];
		if (field === 'fname') {
			const selectedField = defaultReceiptFields.find((item) => item.fname === value);
			if (selectedField) {
				updatedReceiptInfo[index]['fvalue'] = selectedField.fvalue;
			} else if (value === 'Khác') {
				updatedReceiptInfo[index]['fvalue'] = '';
			}
		}
		if (field === 'other') {
			updatedReceiptInfo[index]['other'] = value;
		}
		updatedReceiptInfo[index][field] = value;
		setReceiptInfo(updatedReceiptInfo);
		setIsReportChanged(true); // Mark report as changed

		// We don't update sample_description or matrix when changing sample_information fields
	};

	const handleDeleteCustomerField = (index) => {
		const updatedCustomerInfo = customerInfo.filter((_, i) => i !== index);
		setCustomerInfo(updatedCustomerInfo);
		setIsReportChanged(true); // Mark report as changed
	};

	const handleDeleteReceiptField = (index) => {
		const updatedReceiptInfo = receiptInfo.filter((_, i) => i !== index);
		setReceiptInfo(updatedReceiptInfo);
		setIsReportChanged(true); // Mark report as changed
	};

	const handleSaveNewReport = async () => {
		if (!isReportChanged) return; // Do nothing if no changes

		// Validate that the first receipt info item contains 'Ngày tiếp nhận' or 'Receipt date'
		if (receiptInfo.length > 0) {
			const firstReceiptField = receiptInfo[0];
			if (!firstReceiptField.fname.includes('Ngày tiếp nhận') && !firstReceiptField.fname.includes('receipt date')) {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: 'Thông tin đầu tiên trong "Thông tin tiếp nhận" phải là ngày tiếp nhận',
				});
				return;
			}
		}

		// Process customer info fields
		const updatedCustomerInfo = customerInfo.map((field) => {
			if (field.fname === 'Khác') {
				return { fname: field.other, fvalue: field.fvalue };
			}
			return field;
		});

		// Process receipt info fields
		const updatedReceiptInfo = receiptInfo.map((field) => {
			if (field.fname === 'Khác') {
				return { fname: field.other, fvalue: field.fvalue };
			}
			return field;
		});

		// Combine both arrays into a single sample_information array
		const combinedInfo = [...updatedCustomerInfo, ...updatedReceiptInfo];
		try {
			// Only update the sample_information without changing sample_name and sample_description
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', {
				sample: {
					id: sample.id,
					sample_uid: sample.sample_uid,
					sample_information: combinedInfo,
					modified_by_uid: currentUser.identity_uid,
				},
			});

			if (response.status === 200) {
				showToast('Report updated successfully!');
				setIsReportChanged(false); // Reset change tracker
				fetchReceiptFull(); // Fetch updated data
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to update report.',
				});
			}
		} catch (error) {
			console.error('Error updating report:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating report.',
			});
		}
	};

	const handleCopySampleInfo = (sampleUid) => {
		// Find the selected sample from listSampleByReceipt
		const selectedSample = listSampleByReceipt.find((s) => s.sample_uid === sampleUid);

		if (selectedSample && selectedSample.sample_information) {
			// Split into customer and receipt info
			const sampleInfo = selectedSample.sample_information || [];
			const receiptInfoItems = sampleInfo.filter(
				(item) =>
					item.fname.includes('Ngày tiếp nhận') ||
					item.fname.includes('receipt date') ||
					item.fname.includes('Mô tả') ||
					item.fname.includes('desc'),
			);
			const customerInfoItems = sampleInfo.filter(
				(item) =>
					!item.fname.includes('Ngày tiếp nhận') &&
					!item.fname.includes('receipt date') &&
					!item.fname.includes('Mô tả') &&
					!item.fname.includes('desc'),
			);

			// Set the customer and receipt info
			setCustomerInfo(customerInfoItems);
			setReceiptInfo(receiptInfoItems);

			// Mark as changed to enable the save button
			setIsReportChanged(true);

			showToast(`Đã sao chép thông tin từ mẫu ${sampleUid}`);
		} else {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: `Không tìm thấy thông tin từ mẫu ${sampleUid}`,
			});
		}

		// Close the dropdown
		setSampleDropdownVisible(false);
	};

	// Add a helper function to check if user is a technician
	const isTechnician = () => {
		// Admin users bypass technician restrictions
		return currentUser?.role?.staff_technician && !currentUser?.role?.staff_admin;
	};

	// Add a helper function to check if user is an admin
	const isAdmin = () => {
		return currentUser?.role?.staff_admin;
	};

	const renderNewReport = () => {
		return (
			<div className="border py-2 mt-1 rounded-lg">
				{/* Container for both sections with flex row on md+ screens */}
				<div className="flex flex-col md:flex-row md:overflow-auto">
					{/* Customer Information Section */}
					<div className="w-full border-b md:border-b-0 md:border-r pb-2 ">
						<div className="flex justify-between items-center px-4 mb-2">
							<h3 className="font-medium text-lg">Thông tin khách hàng cung cấp</h3>
							<button
								className="bg-white text-sky-500 rounded-full p-1"
								onClick={handleAddCustomerField}
								title="Thêm thông tin khách hàng"
							>
								<AiOutlinePlus size={18} />
							</button>
						</div>
						<div className="w-full overflow-hidden hover:overflow-auto md:pb-2 lg:pb-0 pb-0 hover:pb-0 mb-1">
							{customerInfo?.length > 0 && (
								<div className="flex flex-wrap md:min-w-[450px]">
									{customerInfo.map((field, index) => (
										<div key={index} className="mb-1 w-full  px-2">
											<table className=" w-full">
												<tbody>
													<tr>
														<td className=" w-1/5 text-start p-1 font-medium min-w-40 flex justify-between items-center">
															<select
																value={field?.fname || ''}
																onChange={(e) => handleCustomerFieldChange(index, 'fname', e.target.value)}
																className={`p-1 ${
																	field.fname === 'Khác' ? 'w-1/3 mr-1' : 'w-full'
																} border min-w-16 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm `}
															>
																<option value={field.fname}>{field.fname || 'Chọn thông tin'}</option>
																{defaultCustomerFields.map((selectField) => (
																	<option key={selectField.fname} value={selectField.fname}>
																		{selectField.fname}
																	</option>
																))}
																<option value="Khác">Khác</option>
															</select>
															{field.fname === 'Khác' && (
																<input
																	type="text"
																	value={field?.other || ''}
																	onChange={(e) => handleCustomerFieldChange(index, 'other', e.target.value)}
																	className="p-1 w-full border rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
																	placeholder="Nhập tên khác"
																/>
															)}
														</td>
														<td className=" w-full text-start p-1 min-w-64">
															<input
																type="text"
																value={field?.fvalue || ''}
																onChange={(e) => handleCustomerFieldChange(index, 'fvalue', e.target.value)}
																className="p-1 w-full border rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
															/>
														</td>
														<td>
															<button
																className="text-red-500 bg-white text-sm rounded-lg py-1 px-1 focus:outline-none text-center"
																onClick={() => handleDeleteCustomerField(index)}
															>
																<FaRegTimesCircle size={20} />
															</button>
														</td>
													</tr>
												</tbody>
											</table>
										</div>
									))}
								</div>
							)}
							{customerInfo?.length === 0 && (
								<div className="text-center text-gray-500 italic py-2">
									Chưa có thông tin khách hàng. Nhấn nút + để thêm thông tin.
								</div>
							)}
						</div>
					</div>

					{/* Receipt Information Section */}
					<div className="w-full pt-2 md:pt-0">
						<div className="flex justify-between items-center px-4 mb-2">
							<h3 className="font-medium text-lg">Thông tin tiếp nhận</h3>
							<button
								className="bg-white text-sky-500 rounded-full p-1"
								onClick={handleAddReceiptField}
								title="Thêm thông tin tiếp nhận"
							>
								<AiOutlinePlus size={18} />
							</button>
						</div>
						<div className="w-full overflow-hidden hover:overflow-auto md:pb-2 lg:pb-0 pb-0 hover:pb-0 mb-1">
							{receiptInfo?.length > 0 && (
								<div className="flex flex-wrap md:min-w-[450px]">
									{receiptInfo.map((field, index) => (
										<div key={index} className="mb-1 w-full px-2">
											<table className=" w-full">
												<tbody>
													<tr>
														<td className=" w-1/5 text-start p-1 font-medium min-w-40 flex justify-between items-center">
															<select
																value={field?.fname || ''}
																onChange={(e) => handleReceiptFieldChange(index, 'fname', e.target.value)}
																className={`p-1 ${
																	field.fname === 'Khác' ? 'w-1/3 mr-1' : 'w-full'
																} border min-w-16 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm `}
															>
																<option value={field.fname}>{field.fname || 'Chọn thông tin'}</option>
																{defaultReceiptFields.map((selectField) => (
																	<option key={selectField.fname} value={selectField.fname}>
																		{selectField.fname}
																	</option>
																))}
																<option value="Khác">Khác</option>
															</select>
															{field.fname === 'Khác' && (
																<input
																	type="text"
																	value={field?.other || ''}
																	onChange={(e) => handleReceiptFieldChange(index, 'other', e.target.value)}
																	className="p-1 w-full border rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
																	placeholder="Nhập tên khác"
																/>
															)}
														</td>
														<td className=" w-full text-start p-1 min-w-64">
															<input
																type="text"
																value={field?.fvalue || ''}
																onChange={(e) => handleReceiptFieldChange(index, 'fvalue', e.target.value)}
																className="p-1 w-full border rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
															/>
														</td>
														<td>
															<button
																className="text-red-500 bg-white text-sm rounded-lg py-1 px-1 focus:outline-none text-center"
																onClick={() => handleDeleteReceiptField(index)}
															>
																<FaRegTimesCircle size={20} />
															</button>
														</td>
													</tr>
												</tbody>
											</table>
										</div>
									))}
								</div>
							)}
							{receiptInfo?.length === 0 && (
								<div className="text-center text-gray-500 italic py-2">
									Chưa có thông tin tiếp nhận. Nhấn nút + để thêm thông tin.
								</div>
							)}
						</div>
					</div>
				</div>

				{isReportChanged && (
					<div className="flex justify-between px-4 mt-4 pt-2 border-t">
						<button
							className="bg-gray-500 text-white text-sm rounded-lg p-1 active:bg-gray-600 focus:outline-none w-40"
							onClick={() => {
								setIsReportChanged(false); // Reset change tracker
								// Reset to original values from current sample
								if (currentSample && currentSample.sample_information) {
									const sampleInfo = currentSample.sample_information || [];

									// Fix: Properly separate receipt and customer info
									// Look for receipt info markers in the fname field
									const receiptInfoItems = sampleInfo.filter(
										(item) =>
											item.fname.includes('Ngày tiếp nhận') ||
											item.fname.includes('receipt date') ||
											item.fname.includes('Mô tả') ||
											item.fname.includes('desc') ||
											item.fname.includes('Mã tiếp nhận') ||
											item.fname.includes('receipt code') ||
											item.fname.includes('Ngày hoàn thành') ||
											item.fname.includes('deadline') ||
											item.fname.includes('Nền mẫu') ||
											item.fname.includes('matrix'),
									);

									// All other items are customer info
									const customerInfoItems = sampleInfo.filter(
										(item) =>
											!item.fname.includes('Ngày tiếp nhận') &&
											!item.fname.includes('receipt date') &&
											!item.fname.includes('Mô tả') &&
											!item.fname.includes('desc') &&
											!item.fname.includes('Mã tiếp nhận') &&
											!item.fname.includes('receipt code') &&
											!item.fname.includes('Ngày hoàn thành') &&
											!item.fname.includes('deadline') &&
											!item.fname.includes('Nền mẫu') &&
											!item.fname.includes('matrix'),
									);

									setCustomerInfo(customerInfoItems);
									setReceiptInfo(receiptInfoItems);
								}
							}}
						>
							Hủy bỏ
						</button>
						<button
							className={`text-white text-sm rounded-lg p-1 focus:outline-none w-40 ${
								isReportChanged ? 'bg-green-500 cursor-pointer' : 'bg-gray-500 cursor-default'
							}`}
							onClick={handleSaveNewReport}
						>
							Lưu
						</button>
					</div>
				)}
			</div>
		);
	};

	const handleRemoveAnalyte = async (id) => {
		try {
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/delete/analysis', {
				id,
				modified_by_uid: currentUser.identity_uid,
			});

			if (response.status === 200) {
				showToast('Analysis deleted successfully!');
				setListAnalytes(listAnalytes.filter((analyte) => analyte.id !== id));
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to delete analysis.',
				});
			}
		} catch (error) {
			console.error('Error deleting analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while deleting analysis.',
			});
		}
	};

	const technician = (param) => {
		const iden = technicians.find((identity) => identity.identity_uid === param.technician_uid);
		const ktv = iden ? iden.identity_name + ' (' + iden.alias + ')' : null;
		return ktv;
	};

	const handleTechnicianClick = (order) => {
		setEditingField(`technician_uid-${order.sample_id}-${order.id}`);
		setInputValue(order.technician_uid || '');
		setIsEditorVisible(true);
	};

	const toggleTechnicianDropdown = (index, event) => {
		const buttonRect = event.target.getBoundingClientRect(); // Lấy vị trí button trên màn hình
		onUpdateAnalysis;
		setDropdownPosition({
			top: buttonRect.bottom + window.scrollY + 4, // Display below the button with 4px gap
			left: buttonRect.left + window.scrollX, // Căn theo button
		});

		setTechnicianDropdownVisible(technicianDropdownVisible === index ? null : index);
		setDeadlineDropdownVisible(null); // Close deadline dropdown if open
	};

	const handleTechnicianChange = async (index, identity_uid) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, technician_uid: identity_uid };
			}
			return item;
		});

		// Update the state
		setListAnalytes(updatedAnalytes);

		// Close the dropdown after a small delay to ensure the change is processed
		setTimeout(() => {
			setTechnicianDropdownVisible(null);
		}, 50);

		// Find the updated analysis item
		const analysis = updatedAnalytes.find((item) => item.id === index);

		try {
			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				technician_uid: identity_uid,
				modified_by_uid: currentUser.identity_uid,
			};

			// Send the update to the server
			await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật người thực hiện',
			});
		}
	};

	const handleDateInputChange = (id, e) => {
		const value = e.target.value;
		if (value) {
			const parts = value.split('/');
			if (parts.length === 3) {
				const day = parseInt(parts[0], 10);
				const month = parseInt(parts[1], 10) - 1;
				const year = parseInt(parts[2], 10);
				if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
					const date = new Date(year, month, day);
					if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
						setSelectedDate(date);
					}
				}
			}
		}
	};

	const handleDeadlineFocus = (id, deadline) => {
		if (deadline) {
			setSelectedDate(new Date(deadline));
		} else {
			setSelectedDate(new Date());
		}
	};

	const handleDeadlineKeyDown = (e, id) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveDeadlineToAPI(id, selectedDate);
		}
	};

	// Update the toggle function to properly position the dropdown
	const toggleDeadlineDropdown = (index, event) => {
		const buttonRect = event.target.getBoundingClientRect();

		setDropdownPosition({
			top: buttonRect.bottom + window.scrollY + 5,
			left: buttonRect.left + window.scrollX,
		});

		setDeadlineDropdownVisible(deadlineDropdownVisible === index ? null : index);
		setTechnicianDropdownVisible(null); // Close technician dropdown if open

		// Set the selected date to the current deadline of the analyte
		const analyte = listAnalytes.find((item) => item.id === index);
		if (analyte && analyte.deadline) {
			setSelectedDate(new Date(analyte.deadline));
		} else {
			setSelectedDate(new Date());
		}
	};

	// Update handleDeadlineChange to only update UI without API call
	const handleDeadlineChange = (index, date) => {
		// Update the selected date
		setSelectedDate(date);

		// Update UI only - we'll make the API call separately
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, deadline: date.toISOString() };
			}
			return item;
		});

		// Update the state
		setListAnalytes(updatedAnalytes);
	};

	// New function to send API update for deadline
	const saveDeadlineToAPI = async (index, date) => {
		try {
			// Close the dropdown
			setDeadlineDropdownVisible(null);

			// Convert date to ISO string for API
			const newDeadline = date.toISOString();

			// Find the analysis item
			const analysis = listAnalytes.find((item) => item.id === index);

			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				deadline: newDeadline,
				modified_by_uid: currentUser.identity_uid,
			};

			// Send the update to the server
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Đã cập nhật hạn trả thành công!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật hạn trả',
				});
			}
		} catch (error) {
			console.error('Error updating deadline:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật hạn trả',
			});
		}
	};

	// Update the date selection handler to trigger API update
	const handleDateSelect = (index, date) => {
		handleDeadlineChange(index, date);
		saveDeadlineToAPI(index, date);
	};

	// Add a handler for when the input loses focus
	const handleDeadlineBlur = (id) => {
		saveDeadlineToAPI(id, selectedDate);
	};

	// Modified handleClickOutside function to use requestAnimationFrame for delayed closing
	const handleClickOutside = (event) => {
		// Skip if clicking on a dropdown element or selection element
		if (
			event.target.closest('.dropdown-button') ||
			event.target.closest('.dropdown-item') ||
			event.target.closest('.react-datepicker')
		) {
			return;
		}

		// Use requestAnimationFrame to delay closing the dropdown
		// This ensures onChange events complete before the dropdown closes
		requestAnimationFrame(() => {
			setTechnicianDropdownVisible(null);
			setDeadlineDropdownVisible(null);
		});
	};

	const handleClickOutsideParameterForm = (event) => {
		if (!event.target.closest('.parameter-form')) {
			setIsAddingParameter(false);
		}
	};

	useEffect(() => {
		if (isAddingParameter) {
			// We don't need this document-level event listener anymore
			// document.addEventListener('mousedown', handleClickOutsideParameterForm);
		} else {
			// document.removeEventListener('mousedown', handleClickOutsideParameterForm);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutsideParameterForm);
		};
	}, [isAddingParameter]);

	useEffect(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Add click outside handler for sample dropdown
	const handleClickOutsideSampleDropdown = (event) => {
		if (!event.target.closest('.sample-dropdown-container') && !event.target.closest('.copy-button')) {
			setSampleDropdownVisible(false);
		}
	};

	useEffect(() => {
		if (sampleDropdownVisible) {
			document.addEventListener('mousedown', handleClickOutsideSampleDropdown);
		} else {
			document.removeEventListener('mousedown', handleClickOutsideSampleDropdown);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutsideSampleDropdown);
		};
	}, [sampleDropdownVisible]);
	// Handler for selecting an item from the dropdown - no longer used for parameter name
	const handleParameterNameSelect = (name) => {
		if (editingParameterField !== null) {
			handleParameterNameChange(editingParameterField, name);
		}
	};

	const handleMatrixSelect = (matrix) => {
		if (editingMatrixField !== null) {
			handleMatrixChange(editingMatrixField, matrix);
		}
		setShowMatrixDropdown(false);
	};

	const handleProtocolCodeSelect = (code) => {
		if (editingProtocolField !== null) {
			handleProtocolChange(editingProtocolField, code);
		}
		setShowProtocolCodeDropdown(false);
	};

	const handleUnitSelect = (unit) => {
		if (editingField && editingField.startsWith('result_unit')) {
			setInputValue(unit);
			handleSaveContent(unit);
		}
		setShowUnitDropdown(false);
	};

	const handleParameterNameClick = (id) => {
		setEditingParameterField(id);
	};

	const handleMatrixClick = (id) => {
		setEditingMatrixField(id);
	};
	const handleParameterNameChange = (index, newValue) => {
		// Remove dropdown functionality
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, parameter_name: newValue, parameter_id: 0 };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};

	const handleMatrixChange = (index, newValue) => {
		setMatrixInput(newValue);
		setMatrixPage(1); // Reset to first page when typing
		setShowMatrixDropdown(newValue.length >= 2); // Show dropdown once at least 2 chars entered

		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, matrix: newValue };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};
	const handleMatrixBlur = async (index) => {
		setEditingMatrixField(null);
		const analysis = listAnalytes.find((item) => item.id === index);
		const updatedAnalysis = await updateAnalysis(analysis);

		// Update the list with the returned analysis
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return updatedAnalysis;
			}
			return item;
		});

		setListAnalytes(updatedAnalytes);
	};

	const handleParameterBlur = async (index) => {
		setEditingParameterField(null);
		const analysis = listAnalytes.find((item) => item.id === index);
		const updatedAnalysis = await updateAnalysis(analysis);

		// Update the list with the returned analysis
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return updatedAnalysis;
			}
			return item;
		});

		setListAnalytes(updatedAnalytes);
	};

	const handleMatrixKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			// Just blur the element to trigger the blur handler
			e.target.blur();
		}
	};

	const handleParameterKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			// Just blur the element to trigger the blur handler
			e.target.blur();
		}
	};

	const handleProtocolClick = (id) => {
		setEditingProtocolField(id);
	};

	const handleProtocolChange = (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, protocol_code: newValue };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};
	const handleProtocolBlur = async (index) => {
		setEditingProtocolField(null);
		const analysis = listAnalytes.find((item) => item.id === index);

		try {
			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				protocol_code: analysis.protocol_code || '',
				modified_by_uid: currentUser.identity_uid,
			};

			// Send the update directly to the analysis API
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Đã cập nhật phương pháp thành công!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật phương pháp',
				});
			}
		} catch (error) {
			console.error('Error updating protocol code:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật phương pháp',
			});
		}
	};

	const handleProtocolKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			// Just blur the element to trigger the blur handler
			e.target.blur();
		}
	};
	const handleProtocolSourceChange = async (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, protocol_source: newValue };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);

		try {
			const analysis = updatedAnalytes.find((item) => item.id === index);

			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				protocol_source: newValue,
				modified_by_uid: currentUser.identity_uid,
			};

			// Send the update to the server
			await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});
		} catch (error) {
			console.error('Error updating protocol source:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating protocol source.',
			});
		}
	};

	// Add handlers for external lab info
	const [editingExNameField, setEditingExNameField] = useState(null);
	const [editingExDateField, setEditingExDateField] = useState(null);
	const [exDateSelected, setExDateSelected] = useState(new Date());

	const handleExNameClick = (id) => {
		setEditingExNameField(id);
	};

	const handleExNameChange = (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				const exInfo = item.ex_info || {};
				return {
					...item,
					ex_info: {
						...exInfo,
						ex_name: newValue,
					},
				};
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};

	const handleExNameBlur = async (index) => {
		setEditingExNameField(null);
		const analysis = listAnalytes.find((item) => item.id === index);
		await updateExInfo(analysis);
	};

	const handleExNameKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			e.target.blur();
		}
	};

	const handleExDateClick = (id, existingDate) => {
		setEditingExDateField(id);
		if (existingDate) {
			setExDateSelected(new Date(existingDate));
		} else {
			setExDateSelected(new Date());
		}
	};

	const handleExDateSelect = (index, date) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				const exInfo = item.ex_info || {};
				return {
					...item,
					ex_info: {
						...exInfo,
						send_at: date.toISOString(),
					},
				};
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
		setExDateSelected(date);
		updateExInfo(updatedAnalytes.find((item) => item.id === index));
		setEditingExDateField(null);
	};

	const handleExDateBlur = async (index) => {
		const analysis = listAnalytes.find((item) => item.id === index);
		await updateExInfo(analysis);
		setEditingExDateField(null);
	};

	const updateExInfo = async (analysis) => {
		try {
			const exInfo = analysis.ex_info || { ex_name: '', send_at: null };

			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sample_id: analysis.sample_id,
				receipt_id: analysis.receipt_id,
				ex_info: exInfo,
				modified_by_uid: currentUser.identity_uid,
			};

			// Send the update to the server
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Đã cập nhật thông tin thầu phụ thành công!');
			}
		} catch (error) {
			console.error('Error updating external lab info:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin thầu phụ',
			});
		}
	};

	const handleDeleteConfirm = (id) => {
		setDeleteItemId(id);
		setIsDeleteConfirmVisible(true);
		setDeleteType('analysis');
	};

	const handleDeleteCancel = () => {
		setIsDeleteConfirmVisible(false);
		setDeleteItemId(null);
	};

	const handleDeleteSampleConfirmAction = async () => {
		try {
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/delete/sample', {
				id: deleteItemId,
				sample_uid: sample.sample_uid,
				modified_by_uid: currentUser.identity_uid,
			});

			if (response.status === 200) {
				showToast('Sample deleted successfully!');
				navigate(`/dashboard/receipt?receipt_uid=${receipt_uid}`);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to delete sample.',
				});
			}
		} catch (error) {
			console.error('Error deleting sample:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while deleting sample.',
			});
		} finally {
			setIsDeleteConfirmVisible(false);
			setDeleteItemId(null);
		}
	};

	const handleDeleteAnalysisConfirmAction = async () => {
		try {
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/delete/analysis', {
				id: deleteItemId,
				modified_by_uid: currentUser.identity_uid,
			});

			if (response.status === 200) {
				showToast('Analysis deleted successfully!');
				setListAnalytes(listAnalytes.filter((analyte) => analyte.id !== deleteItemId));
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to delete analysis.',
				});
			}
		} catch (error) {
			console.error('Error deleting analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while deleting analysis.',
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

	const handleDeleteSample = () => {
		setDeleteItemId(currentSample.id);
		setIsDeleteConfirmVisible(true);
		setDeleteType('sample');
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
	const handleSelectAll = () => {
		if (selectAll) {
			setSelectedAnalytes([]);
		} else {
			setSelectedAnalytes(listAnalytes.map((analyte) => analyte.id));
		}
		setSelectAll(!selectAll);
	};

	// Modify delete handler to handle multiple selections
	const handleDeleteSelected = () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Please select at least one item to delete',
			});
			return;
		}
		setIsDeleteConfirmVisible(true);
		setDeleteType('multiple');
	};

	const handleDeleteMultipleConfirmAction = async () => {
		try {
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/delete/analysis', {
				ids: selectedAnalytes,
				modified_by_uid: currentUser.identity_uid,
			});

			if (response.status === 200) {
				showToast(`${selectedAnalytes.length} analyses deleted successfully!`);
				setListAnalytes(listAnalytes.filter((analyte) => !selectedAnalytes.includes(analyte.id)));
				setSelectedAnalytes([]);
				setSelectAll(false);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to delete analyses.',
				});
			}
		} catch (error) {
			console.error('Error deleting analyses:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while deleting analyses.',
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
				text: 'Please select at least one item to transfer',
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
				text: 'Please select a technician',
			});
			return;
		}

		try {
			// Get the selected analytes
			const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));

			let successCount = 0;
			let failCount = 0;

			// Make API calls for each analyte separately with minimal data
			for (const analyte of selectedItems) {
				try {
					// Create minimal update object
					const updateData = {
						id: analyte.id,
						sample_id: analyte.sample_id,
						receipt_id: analyte.receipt_id,
						technician_uid: selectedTechnician,
						modified_by_uid: currentUser.identity_uid,
					};

					await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
						analysis: updateData,
					});
					successCount++;
				} catch (error) {
					console.error(`Error updating analysis ID ${analyte.id}:`, error);
					failCount++;
				}
			}

			// Update the UI
			const newAnalytesList = listAnalytes.map((analyte) => {
				if (selectedAnalytes.includes(analyte.id)) {
					return { ...analyte, technician_uid: selectedTechnician };
				}
				return analyte;
			});
			setListAnalytes(newAnalytesList);

			if (failCount > 0) {
				Swal.fire({
					icon: 'warning',
					title: 'Kết quả',
					text: `${successCount} analyses updated successfully, ${failCount} failed`,
				});
			} else {
				showToast(
					`Successfully transferred ${selectedAnalytes.length} analyses to ${
						technicians.find((tech) => tech.identity_uid === selectedTechnician)?.identity_name
					}`,
				);
			}

			setIsTransferMultipleVisible(false);
			setSelectedTechnician(null);
		} catch (error) {
			console.error('Error transferring analyses:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while transferring analyses',
			});
		}
	};

	const renderBulkTransferForm = () => (
		<div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
			<div className="bg-white p-4 rounded-lg w-[400px] h-[400px] relative flex flex-col justify-between">
				<h2 className="text-2xl font-semibold mb-4">Bàn giao {selectedAnalytes.length} chỉ tiêu</h2>
				<div className="overflow-auto mb-4 flex-1">
					<p className="font-medium mb-2">Chọn người thực hiện:</p>
					<div className="max-h-[240px] overflow-y-auto border rounded p-2">
						{technicians.map((tech) => (
							<div
								key={tech.identity_uid}
								className={`p-2 mb-2 cursor-pointer border rounded ${
									selectedTechnician === tech.identity_uid ? 'border-primary bg-blue-50' : 'border-gray-300'
								}`}
								onClick={() => setSelectedTechnician(tech.identity_uid)}
							>
								<p className="font-bold text-primary">{tech.alias || ''}</p>
								<p>{tech.identity_name || ''}</p>
							</div>
						))}
					</div>
				</div>
				<div className="flex justify-end">
					<button
						className="bg-gray-500 text-white p-2 rounded mr-2"
						onClick={() => setIsTransferMultipleVisible(false)}
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

	// Add a new function to handle the review action
	const handleReviewAnalyses = async () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn ít nhất một chỉ tiêu để duyệt',
			});
			return;
		}

		try {
			// Create array of objects with just id and reviewed_by fields
			const analysesToConfirm = selectedAnalytes.map((id) => ({
				id,
				reviewed_by: currentUser.identity_uid,
			}));

			// Make a single API call with the array
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/confirm/analysis', analysesToConfirm);

			if (response.status === 200) {
				// Update the UI
				const currentUserName = await getIdenByUid(currentUser.identity_uid);
				const newAnalytesList = listAnalytes.map((analyte) => {
					if (selectedAnalytes.includes(analyte.id)) {
						return {
							...analyte,
							reviewed_by: currentUser.identity_uid,
							reviewerName: currentUserName ? currentUserName.identity_name : 'Unknown',
						};
					}
					return analyte;
				});
				setListAnalytes(newAnalytesList);

				showToast(`Đã duyệt thành công ${selectedAnalytes.length} chỉ tiêu`, 'success');

				// Clear selection after successful review
				setSelectedAnalytes([]);
				setSelectAll(false);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi duyệt chỉ tiêu',
				});
			}
		} catch (error) {
			console.error('Error reviewing analyses:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi duyệt chỉ tiêu',
			});
		}
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

	// Add function to handle bulk field updates
	const handleBulkFieldUpdate = async () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn ít nhất một chỉ tiêu để cập nhật lĩnh vực',
			});
			return;
		}

		// Prompt for the field value
		const { value: field } = await Swal.fire({
			title: 'Chọn lĩnh vực',
			input: 'select',
			inputOptions: {
				'Hóa lý': 'Hóa lý',
				'Vi sinh': 'Vi sinh',
			},
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

				let successCount = 0;
				let failCount = 0;

				// Make API calls for each analyte separately with minimal data
				for (const analyte of selectedItems) {
					try {
						// Create minimal update object
						const updateData = {
							id: analyte.id,
							sample_id: analyte.sample_id,
							receipt_id: analyte.receipt_id,
							field: field,
							modified_by_uid: currentUser.identity_uid,
						};

						await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
							analysis: updateData,
						});
						successCount++;
					} catch (error) {
						console.error(`Error updating analysis ID ${analyte.id}:`, error);
						failCount++;
					}
				}

				// Update the UI
				const newAnalytesList = listAnalytes.map((analyte) => {
					if (selectedAnalytes.includes(analyte.id)) {
						return { ...analyte, field: field };
					}
					return analyte;
				});
				setListAnalytes(newAnalytesList);

				if (failCount > 0) {
					Swal.fire({
						icon: 'warning',
						title: 'Kết quả',
						text: `${successCount} chỉ tiêu cập nhật thành công, ${failCount} thất bại`,
					});
				} else {
					showToast(`Đã cập nhật lĩnh vực "${field}" cho ${selectedAnalytes.length} chỉ tiêu`);
				}
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

	// Function to apply the new deadline to all selected analyses
	const handleConfirmBulkDeadline = async () => {
		try {
			// Get the selected analytes
			const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));
			const newDeadline = bulkDeadlineDate.toISOString();

			let successCount = 0;
			let failCount = 0;

			// Make API calls for each analyte separately with minimal data
			for (const analyte of selectedItems) {
				try {
					// Create minimal update object
					const updateData = {
						id: analyte.id,
						sample_id: analyte.sample_id,
						receipt_id: analyte.receipt_id,
						deadline: newDeadline,
						modified_by_uid: currentUser.identity_uid,
					};

					await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
						analysis: updateData,
					});
					successCount++;
				} catch (error) {
					console.error(`Error updating analysis ID ${analyte.id}:`, error);
					failCount++;
				}
			}

			// Update the UI
			const newAnalytesList = listAnalytes.map((analyte) => {
				if (selectedAnalytes.includes(analyte.id)) {
					return { ...analyte, deadline: newDeadline };
				}
				return analyte;
			});
			setListAnalytes(newAnalytesList);

			if (failCount > 0) {
				Swal.fire({
					icon: 'warning',
					title: 'Kết quả',
					text: `${successCount} analyses updated successfully, ${failCount} failed`,
				});
			} else {
				showToast(`Đã cập nhật hạn trả cho ${selectedAnalytes.length} chỉ tiêu thành ${formatDate(bulkDeadlineDate)}`);
			}

			setIsBulkDeadlineVisible(false);
		} catch (error) {
			console.error('Error updating deadlines:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating deadlines',
			});
		}
	};

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

	// Modify the DatePicker styling to ensure it appears above all content
	useEffect(() => {
		// Add a global style to ensure DatePicker appears above all elements
		const style = document.createElement('style');
		style.innerHTML = `
		.react-datepicker-popper {
			z-index: 99999 !important;
		}
		.react-datepicker-wrapper {
			width: 100%;
		}
		.react-datepicker__input-container {
			width: 100%;
		}
		`;
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, []);
	// Add these functions before the return statement
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

			// Format the data as required by the API: {analysis: parameter_name, matrix: matrix}
			const formattedData = selectedItems.map((item) => ({
				analysis: item.parameter_name,
				matrix: item.matrix,
			}));

			// Call API to match parameters
			const response = await apiPost('https://black.irdop.org/trelw82ki/match/analysis/matrix', {
				listAnalysis: formattedData,
			});

			let updatedAnalytes = [];
			if (response.status === 200) {
				// Update UI with matched parameters
				updatedAnalytes = listAnalytes.map((analyte) => {
					if (selectedAnalytes.includes(analyte.id)) {
						const matchedAnalysis = response.data.find(
							(item) => item.parameter_name === analyte.parameter_name && item.matrix === analyte.matrix,
						);
						if (matchedAnalysis) {
							return {
								...analyte, // Keep all original properties
								parameter_name: matchedAnalysis.parameter_name,
								parameter_uid: matchedAnalysis.parameter_uid || analyte.parameter_uid,
								parameter_id: matchedAnalysis.parameter_id || analyte.parameter_id,
								protocol_code: matchedAnalysis.protocol_code || analyte.protocol_code,
								protocol_source: matchedAnalysis.protocol_source || analyte.protocol_source,
								field: matchedAnalysis.field || analyte.field,
							};
						}
					}
					return analyte;
				});

				console.log('Updated Analytes:', updatedAnalytes);

				// Update the UI first for better UX
				setListAnalytes(updatedAnalytes);

				// Now update each analysis in the database
				let successCount = 0;
				let failCount = 0;
				for (const analyte of updatedAnalytes.filter((a) => selectedAnalytes.includes(a.id))) {
					try {
						if (analyte.parameter_uid || analyte.parameter_id) {
							// Create minimal update object with only required fields
							const updateData = {
								id: analyte.id,
								sample_id: analyte.sample_id,
								receipt_id: analyte.receipt_id,
								parameter_name: analyte.parameter_name,
								parameter_uid: analyte.parameter_uid || '',
								parameter_id: analyte.parameter_id || 0,
								protocol_code: analyte.protocol_code || '',
								protocol_source: analyte.protocol_source || '',
								field: analyte.field || '',
								matrix: analyte.matrix || '',
								modified_by_uid: currentUser.identity_uid,
							};

							// Update the analysis in the database
							await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
								analysis: updateData,
							});

							successCount++;
						}
					} catch (error) {
						console.error(`Error updating analysis ID ${analyte.id}:`, error);
						failCount++;
					}
				}

				if (failCount > 0) {
					Swal.fire({
						icon: 'warning',
						title: 'Kết quả',
						text: `${successCount} chỉ tiêu đồng bộ thành công, ${failCount} thất bại`,
					});
				} else {
					showToast(`Đã đồng bộ và cập nhật thành công ${successCount} chỉ tiêu`);
				}

				// Clear selection
				setSelectedAnalytes([]);
				setSelectAll(false);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi đồng bộ dữ liệu',
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
	const handleUpdateDatabase = async () => {
		try {
			// Use selected analyses if any are selected, otherwise find analyses that need database updates
			let analysesToUpdate;

			if (selectedAnalytes.length > 0) {
				// Use selected analyses for update
				analysesToUpdate = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));
			} else {
				// Find analyses that need database updates (missing parameter_uid but have other required fields)
				analysesToUpdate = listAnalytes.filter(
					(analysis) =>
						!analysis.parameter_uid &&
						analysis.matrix &&
						((analysis.protocol_source !== 'EX' && analysis.protocol_code) || analysis.protocol_source === 'EX') &&
						analysis.protocol_source &&
						analysis.field,
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

			// Process each analysis one by one
			let successCount = 0;
			let failCount = 0;
			let updatedAnalytes = [...listAnalytes];

			for (const analysis of analysesToUpdate) {
				try {
					// First update the parameter database with the analysis information
					if (
						analysis.parameter_name ||
						analysis.matrix ||
						analysis.protocol_code ||
						analysis.protocol_source ||
						analysis.field
					) {
						// Ensure matrix is not null or undefined before sending
						const matrixToUse = analysis.matrix || sample.matrix || '';

						const parameterResponse = await apiPost('https://black.irdop.org/ha8i0uw2/db/upsert/parameter', {
							parameter: {
								parameter_uid: analysis.parameter_uid || '',
								parameter_name: analysis.parameter_name,
								matrix: matrixToUse, // Use the guaranteed non-null value
								protocol_code: analysis.protocol_code,
								protocol_source: analysis.protocol_source,
								field: analysis.field,
							},
						});

						if (parameterResponse.status === 200 && parameterResponse.data) {
							// Update the analysis with the returned parameter data
							const updatedAnalysisData = {
								...analysis,
								parameter_uid: parameterResponse.data.parameter_uid || analysis.parameter_uid,
								parameter_id: parameterResponse.data.id || analysis.parameter_id,
								parameter_name: parameterResponse.data.parameter_name || analysis.parameter_name,
								protocol_code: parameterResponse.data.protocol_code || analysis.protocol_code,
								protocol_source: parameterResponse.data.protocol_source || analysis.protocol_source,
								field: parameterResponse.data.field || analysis.field,
								modified_by_uid: currentUser.identity_uid,
							};

							// Update the analysis in the database with the new parameter info
							const analysisResponse = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
								analysis: updatedAnalysisData,
							});

							if (analysisResponse.status === 200) {
								// Update the list with the returned analysis
								updatedAnalytes = updatedAnalytes.map((item) => {
									if (item.id === analysis.id) {
										return {
											...item,
											parameter_uid: parameterResponse.data.parameter_uid || item.parameter_uid,
											parameter_id: parameterResponse.data.id || item.parameter_id,
											parameter_name: parameterResponse.data.parameter_name || item.parameter_name,
											protocol_code: parameterResponse.data.protocol_code || item.protocol_code,
											protocol_source: parameterResponse.data.protocol_source || item.protocol_source,
											field: parameterResponse.data.field || item.field,
										};
									}
									return item;
								});
								successCount++;
							}
						}
					} else {
						// Fallback to original update method if required fields are missing
						const updatedAnalysis = await updateAnalysis(analysis);

						updatedAnalytes = updatedAnalytes.map((item) => {
							if (item.id === analysis.id) {
								return updatedAnalysis;
							}
							return item;
						});
						successCount++;
					}
				} catch (error) {
					console.error(`Error updating analysis ID ${analysis.id}:`, error);
					failCount++;
				}
			}

			// Update UI
			setListAnalytes(updatedAnalytes);

			if (failCount > 0) {
				Swal.fire({
					icon: 'warning',
					title: 'Kết quả',
					text: `${successCount} chỉ tiêu cập nhật thành công, ${failCount} thất bại`,
				});
			} else {
				showToast(`Đã cập nhật thành công ${successCount} chỉ tiêu vào CSDL`);
			}

			// If we were using selections, clear them after updating
			if (selectedAnalytes.length > 0) {
				setSelectedAnalytes([]);
				setSelectAll(false);
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

	if (!sample) {
		return <div>Loading...</div>;
	}

	return (
		<div className="w-full relative">
			{/* Add CSS for custom toast */}
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

				.editable-field {
					transition: all 0.2s;
				}

				.editable-field:hover {
					border-color: #6366f1 !important;
					box-shadow: 0 0 0 1px #6366f1;
				}
			`}</style>
			<Breadcrumb
				paths={[
					{ name: 'Danh sách', link: '/' },
					{
						name: `${receipt_uid}`,
						link: `/dashboard/receipt?receipt_uid=${receipt_uid}`,
					},
					{
						name: `${sample.sample_uid}`,
						link: `/dashboard/sample?receipt_uid=${receipt_uid}&sample_uid=${sample.sample_uid}`,
					},
				]}
				sample_uids={listSampleByReceipt.map((sample) => sample.sample_uid)}
			/>
			<div className="flex justify-end mb-1">
				<button
					className="text-primary border-gray-300 bg-background text-sm rounded-lg p-1 w-fit self-start active:bg-sky-100 focus:outline-none mr-2"
					onClick={openPKQWindow}
				>
					<div className="flex items-center justify-between">
						{'PKQ'} <GrDocumentText size={15} className="ml-1.5" />
					</div>
				</button>
				<button
					className="text-primary border-gray-300 bg-background text-sm rounded-lg p-1 w-fit self-start active:bg-sky-100 focus:outline-none mr-2"
					onClick={openPPTWindow}
				>
					<div className="flex items-center justify-between">
						{'PPT'} <GrDocumentText size={15} className="ml-1.5" />
					</div>
				</button>
				<button
					className="text-primary border-gray-300 bg-background text-sm rounded-lg p-1 w-fit self-start active:bg-sky-100 focus:outline-none  mr-2"
					onClick={handleEditSample}
				>
					<div className="flex items-center justify-between">
						{'Sửa'} <RiEdit2Line size={15} className="ml-1.5" />
					</div>
				</button>
				<button
					className="text-primary border-gray-300 bg-background text-sm rounded-lg p-1 w-fit self-start active:bg-red-100 focus:outline-none "
					onClick={handleDeleteSample}
				>
					<div className="flex items-center justify-between text-red-500 font-semibold">
						{'Xóa'} <FaTrashAlt size={15} className="ml-1.5" />
					</div>
				</button>
			</div>
			<div className="rounded-lg max-w-full p-4 bg-white">
				<div className="flex justify-start">
					{/* {listSampleByReceipt && listSampleByReceipt.length > 0 && (
						<>
							<button
								className="text-primary border-gray-300 rounded-lg px-2 py-0.5 mr-2"
								onClick={() => navigate(`/dashboard/receipt?receipt_uid=${receipt_uid}`)}
							>
								{receipt_uid}
							</button>
							<select
								className="bg-sky-400 hover:border-purple-500 hover:cursor-pointer border rounded-lg p-1 w-fit self-start focus:outline-none"
								onChange={(e) => handleSampleSelect(e.target.value)}
								defaultValue={sample.sample_uid}
							>
								{listSampleByReceipt.map((sample) => (
									<option className="bg-white" key={sample.sample_uid} value={sample.sample_uid}>
										{sample.sample_uid}
									</option>
								))}
							</select>
						</>
					)} */}
				</div>
				<div className="hover:overflow-auto overflow-hidden lg:pb-0 md:pb-2 hover:pb-0 flex flex-wrap border rounded-lg mt-2">
					<div className="flex md:flex-row flex-col md:justify-between items-center justify-center w-full">
						<div className="w-full p-2 md:pr-4">
							<table className="w-full border-none">
								<tbody>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium md:min-w-32 min-w-24 text-gray-500">Mã mẫu:</td>
										<td className="w-full text-start p-1 md:min-w-80 min-m-w-40 relative">
											<input
												type="text"
												value={sample?.sample_uid || ''}
												className="w-full bg-white border rounded p-1"
												disabled
											/>
											<CopyButton
												textToCopy={sample?.sample_uid || ''}
												className="absolute right-2 top-1/2 transform -translate-y-1/2"
											/>
										</td>
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium  text-gray-500">Tên mẫu:</td>
										<td className="w-full text-start p-1">
											<input
												type="text"
												value={sample?.sample_name || ''}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={(e) =>
													setSample({
														...sample,
														sample_name: e.target.value,
													})
												}
												onKeyDown={(e) => handleFieldKeyDown(e, 'sample_name', e.target.value)}
												onBlur={(e) => handleFieldBlur('sample_name', e.target.value, sample?.sample_name)}
											/>
										</td>
									</tr>{' '}
									<tr>
										<td className="w-1/5 text-start p-1 font-medium  text-gray-500">
											<span>Nền mẫu:</span>
										</td>
										<td className="w-full text-start p-1 relative">
											{' '}
											<input
												type="text"
												id="sample-matrix-input"
												value={sample?.matrix || ''}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={(e) => {
													const newValue = e.target.value;
													setSample({
														...sample,
														matrix: newValue,
													});
													// Show matrix suggestions when typing
													setMatrixInput(newValue);
													setMatrixPage(1); // Reset to first page when typing
													setShowMatrixDropdown(newValue.length >= 2); // Show dropdown once at least 2 chars entered
												}}
												onKeyDown={(e) => handleFieldKeyDown(e, 'matrix', e.target.value)}
												onBlur={(e) => {
													setTimeout(() => {
														setShowMatrixDropdown(false);
														handleFieldBlur('matrix', e.target.value, sample?.matrix);
													}, 200);
												}}
											/>
											{showMatrixDropdown &&
												getPaginatedMatrices(matrixInput).length > 0 &&
												createPortal(
													<div
														className="absolute bg-white border rounded shadow-lg z-50"
														style={{
															width: document.getElementById('sample-matrix-input').offsetWidth + 'px',
															top:
																document.getElementById('sample-matrix-input').getBoundingClientRect().bottom +
																window.scrollY,
															left:
																document.getElementById('sample-matrix-input').getBoundingClientRect().left +
																window.scrollX,
														}}
													>
														{getPaginatedMatrices(matrixInput).map((matrix, index) => (
															<div
																key={index}
																className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																onClick={() => {
																	setSample({
																		...sample,
																		matrix: matrix,
																	});
																	handleFieldBlur('matrix', matrix, sample?.matrix);
																	setShowMatrixDropdown(false);
																}}
															>
																<p>{matrix}</p>
															</div>
														))}
														{filterMatrices(matrixInput).length > itemsPerPage && (
															<div className="flex justify-between p-2 bg-gray-100">
																<button
																	className="px-2 py-1 border rounded disabled:opacity-50"
																	onClick={() => handleMatrixPageChange(matrixPage - 1)}
																	disabled={matrixPage === 1}
																>
																	Prev
																</button>
																<span>
																	{matrixPage}/{Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)}
																</span>
																<button
																	className="px-2 py-1 border rounded disabled:opacity-50"
																	onClick={() => handleMatrixPageChange(matrixPage + 1)}
																	disabled={matrixPage >= Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)}
																>
																	Next
																</button>
															</div>
														)}
													</div>,
													document.body,
												)}
										</td>
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium align-top text-gray-500">
											<span className="">Mô tả:</span>
										</td>
										<td className="w-full text-start p-1 flex">
											<textarea
												value={sample?.sample_description || ''}
												className="w-full resize-none bg-white border rounded p-1 overflow-hidden hover:overflow-y-auto editable-field"
												rows={2}
												onChange={(e) =>
													setSample({
														...sample,
														sample_description: e.target.value,
													})
												}
												onKeyDown={(e) => handleFieldKeyDown(e, 'sample_description', e.target.value)}
												onBlur={(e) =>
													handleFieldBlur('sample_description', e.target.value, sample?.sample_description)
												}
											/>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div className="w-full p-2 md:pl-4">
							<table className="w-full border-none">
								<tbody>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium md:min-w-32 min-w-24  text-gray-500">Số lượng:</td>
										<td className="w-full text-start p-1 md:min-w-80 min-w-40">
											<input
												type="text"
												value={sample?.sample_volume || ''}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={(e) =>
													setSample({
														...sample,
														sample_volume: e.target.value,
													})
												}
												onKeyDown={(e) => handleFieldKeyDown(e, 'sample_volume', e.target.value)}
												onBlur={(e) => handleFieldBlur('sample_volume', e.target.value, sample?.sample_volume)}
											/>
										</td>
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium  text-gray-500">Mục đích:</td>
										<td className="w-full text-start p-1">
											<select
												value={sample?.purpose || ''}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={handlePurposeChange}
											>
												<option value="">-- Mục đích kiểm nghiệm --</option>
												{purposes.map((item, index) => (
													<option key={index} value={item}>
														{item}
													</option>
												))}
											</select>
										</td>
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium align-top text-gray-500">
											<span>Trạng thái:</span>
										</td>
										<td className="w-full text-start p-1 md:max-w-80 max-w-60">
											<select
												value={sample?.status || 0}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={(e) => handleStatusChange(parseInt(e.target.value))}
											>
												{status.map((stat, index) => (
													<option key={index} value={index}>
														{stat}
													</option>
												))}
											</select>
										</td>
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium align-top text-gray-500">
											<span className="">Yêu cầu:</span>
										</td>
										<td className="w-full text-start p-1 flex">
											<textarea
												value={sample?.additional_request || ''}
												className="w-full resize-none bg-white border rounded p-1 overflow-hidden hover:overflow-y-auto editable-field h-full"
												rows={2}
												onChange={(e) =>
													setSample({
														...sample,
														additional_request: e.target.value,
													})
												}
												onKeyDown={(e) => handleFieldKeyDown(e, 'additional_request', e.target.value)}
												onBlur={(e) =>
													handleFieldBlur('additional_request', e.target.value, sample?.additional_request)
												}
											/>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
				{/* Remove the edit buttons since we now have inline editing */}
				{isEditingSample && (
					<div className="flex justify-end mt-4">
						<button
							className="bg-gray-500 text-white text-sm rounded-lg p-1 active:bg-gray-600 focus:outline-none mr-2"
							onClick={handleCancelEdit}
						>
							Hủy bỏ
						</button>
						<button
							className="bg-green-500 text-white text-sm rounded-lg p-1 active:bg-green-600 focus:outline-none"
							onClick={handleConfirmEdit}
						>
							Xác nhận
						</button>
					</div>
				)}
				<div className="mt-2 flex flex-col">
					{!isTechnician() && (
						<div className="flex justify-between items-center">
							<h3 className="font-medium text-lg">Thông tin in phiếu</h3>
							<div className="relative sample-dropdown-container">
								<button
									className="bg-white text-sky-500 border-gray-300 text-sm rounded-lg p-1 active:bg-teritary focus:outline-none ml-2 w-fit copy-button"
									onClick={() => setSampleDropdownVisible(!sampleDropdownVisible)}
								>
									<FaCopy size={20} />
								</button>
								{sampleDropdownVisible && (
									<div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-10 min-w-40 sample-dropdown-container">
										<div className="p-2 bg-gray-100 font-medium">Chọn mẫu để sao chép thông tin:</div>
										<ul>
											{listSampleByReceipt.map((sample) => (
												<li
													key={sample.sample_uid}
													className={`p-2 cursor-pointer hover:bg-gray-100 ${
														sample.sample_uid === sample_uid ? 'bg-gray-200' : ''
													}`}
													onClick={() => handleCopySampleInfo(sample.sample_uid)}
												>
													{sample.sample_uid}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						</div>
					)}

					{!isTechnician() && renderNewReport()}
				</div>
			</div>

			<div className="bg-white rounded-lg w-full mt-4 p-4 pt-2 border overflow-auto ">
				<div className="mb-1 flex justify-end">
					<div className="min-w-80 whitespace-nowrap flex items-center flex-wrap py-1 pt-12 md:pt-0 md:pr-80 mr-0.5">
						<div className="flex -translate-y-10 md:translate-y-0 md:pt-0 w-full justify-end">
							{' '}
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									selectedAnalytes.length > 0 ? 'bg-green-500' : 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={selectedAnalytes.length > 0 ? handleSyncData : undefined}
								title="Đồng bộ dữ liệu"
							>
								<FaSync className="mr-1" />
								{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
							</button>{' '}
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									selectedAnalytes.length > 0 ||
									listAnalytes.filter(
										(analysis) =>
											!analysis.parameter_uid &&
											analysis.matrix &&
											((analysis.protocol_source !== 'EX' && analysis.protocol_code) ||
												analysis.protocol_source === 'EX') &&
											analysis.protocol_source &&
											analysis.field,
									).length > 0
										? 'bg-blue-500'
										: 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={handleUpdateDatabase}
								title="Cập nhật CSDL"
							>
								<FaDatabase className="mr-1" />
								{selectedAnalytes.length > 0
									? selectedAnalytes.length
									: listAnalytes.filter(
											(analysis) =>
												!analysis.parameter_uid &&
												analysis.matrix &&
												((analysis.protocol_source !== 'EX' && analysis.protocol_code) ||
													analysis.protocol_source === 'EX') &&
												analysis.protocol_source &&
												analysis.field,
									  ).length || '0'}
							</button>
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									selectedAnalytes.length > 0 ? 'bg-red-500' : 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={selectedAnalytes.length > 0 ? handleDeleteSelected : undefined}
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
							{/* Add the bulk deadline update button */}{' '}
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									selectedAnalytes.length > 0 ? 'bg-orange-500' : 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={selectedAnalytes.length > 0 ? handleBulkDeadlineUpdate : undefined}
								title="Cập nhật hạn trả"
							>
								<MdCalendarMonth className="mr-1" size={16} />
								{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
							</button>{' '}
							{/* Add button to update field in bulk with a different icon */}
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
							{/* Modify the review button to check for admin role */}
							{/* {isAdmin() && (
								<button
									className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
										selectedAnalytes.length > 0 ? 'bg-green-500' : 'bg-gray-300 cursor-not-allowed'
									} mr-2`}
									onClick={selectedAnalytes.length > 0 ? handleReviewAnalyses : undefined}
									title="Duyệt kết quả"
								>
									<FaCheck className="mr-1" />
									{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
								</button>
							)} */}
							{/* If not admin, show disabled review button with tooltip */}
							{!isAdmin() && (
								<button
									className="text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center bg-gray-300 cursor-not-allowed mr-2"
									title="Chỉ admin mới có quyền duyệt kết quả"
								>
									<FaCheck className="mr-1" />0
								</button>
							)}
							<button
								className="bg-white text-sky-500 border-gray-400 text-sm rounded-lg p-1 active:bg-teritary focus:outline-none flex-shrink-0 mr-2"
								onClick={() => {
									setIsAddingParameter(true);
								}}
							>
								<MdLibraryAdd size={24} />
							</button>
						</div>
						<div className="absolute right-4">
							<FilterBar
								source={currentSample.analysis || []}
								setCurrentList={setListAnalytes}
								typeSearch={'analysis'}
							/>
						</div>
					</div>
					{isAddingParameter && renderNewParameter()}
				</div>

				<div className="hover:overflow-auto overflow-hidden xl:pb-0 md:pb-2 hover:pb-0 pb-2 border-x xl:border-x-0">
					<table className="text-black w-full border-2 analytes-table">
						<thead>
							<tr className="border-y-2">
								<th className="p-2 border-x w-[100px] min-w-[100px] text-left">Mã chỉ tiêu </th>
								<th className="p-2 border-x w-[24%] min-w-60 text-left">Chỉ tiêu</th>
								<th className="p-2 border-x w-32 min-w-32 text-left">Nền mẫu</th>
								<th className="p-2 border-x w-[25%] min-w-44 text-left">Phương pháp</th>
								<th className="p-2 border-x w-[12%] min-w-28 text-left">Kết quả</th>
								<th className="p-2 border-x w-1/12 min-w-24 text-left">Đơn vị</th>
								<th className="p-2 border-x w-1/12 min-w-28 text-left">Hạn trả</th>{' '}
								<th className="p-2 border-x w-[5%] min-w-24 text-left ">Lĩnh vực</th>
								<th className="p-2 border-x w-[10%] min-w-32 text-left">Thực hiện</th>
								<th className="py-2 border-x w-10 min-w-10">
									<input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="w-4 h-4" />
								</th>
							</tr>
						</thead>
						<tbody>
							{isAddingNewParameter && (
								<tr className="border bg-blue-50">
									<td className="p-1 border relative">
										<input
											type="text"
											className="w-full bg-white border rounded p-1 text-left text-gray-500"
											placeholder="Mã chỉ tiêu"
											value={newParameter.parameter_uid || ''}
											onChange={(e) => handleNewParameterChange('parameter_uid', e.target.value)}
										/>
									</td>
									<td className="p-1 border relative">
										<input
											type="text"
											className="w-full bg-white border rounded p-1 text-left"
											placeholder="Tên chỉ tiêu"
											value={newParameter.parameter_name || ''}
											onChange={(e) => handleNewParameterChange('parameter_name', e.target.value)}
										/>
									</td>
									<td className="p-1 border relative">
										<input
											type="text"
											className="w-full bg-white border rounded p-1 text-left"
											placeholder="Nền mẫu"
											value={newParameter.matrix || ''}
											onChange={(e) => handleNewParameterChange('matrix', e.target.value)}
										/>
									</td>
									<td className="p-1 border relative">
										<div className="flex items-center gap-0.5">
											<select
												className="min-w-24 max-w-fit p-1 py-[5px] max-h-fit font-semibold text-slate-500 bg-white border rounded text-sm focus:outline-none text-left"
												onChange={(e) => handleNewParameterChange('protocol_source', e.target.value)}
												value={newParameter.protocol_source || '--'}
											>
												<option value={'IRDOP'}>{'IRDOP'}</option>
												<option value={'IRDOP VS'}>{'IRDOP VS'}</option>
												<option value={'EX'}>{'EX'}</option>
											</select>
											<input
												type="text"
												className="w-full bg-white border rounded p-1 text-left"
												placeholder="Mã phương pháp"
												value={newParameter.protocol_code || ''}
												onChange={(e) => handleNewParameterChange('protocol_code', e.target.value)}
											/>
										</div>
									</td>
									<td className="p-1 border relative">
										{/* Kết quả - không nhập */}
										<div className="p-1 text-gray-400 italic text-center">--</div>
									</td>
									<td className="p-1 border relative">
										{/* Đơn vị - không nhập */}
										<div className="p-1 text-gray-400 italic text-center">--</div>
									</td>
									<td className="p-1 border relative">
										{/* Hạn trả - không nhập */}
										<div className="p-1 text-gray-400 italic text-center">--</div>
									</td>{' '}
									<td className="p-1 border relative">
										<select
											className="w-full bg-white border rounded p-1 text-left"
											value={newParameter.field || ''}
											onChange={(e) => handleNewParameterChange('field', e.target.value)}
										>
											<option value="">-- Chọn --</option>
											<option value="Hóa lý">Hóa lý</option>
											<option value="Vi sinh">Vi sinh</option>
										</select>
									</td>
									<td className="p-1 border relative">
										<div className="p-1 text-gray-400 italic text-center">Chưa xác định</div>
									</td>
									<td className="pt-[5px] pb-0 border align-top text-center">
										<div className="flex flex-col gap-0.5 items-center">
											<button
												onClick={handleSaveNewParameter}
												className="border-2 rounded-md p-0.5 text-xs w-fit text-primary"
												title="Lưu chỉ tiêu"
											>
												<FaSave size={15} />
											</button>
											<button
												onClick={handleCancelNewParameter}
												className="border-2 rounded-md p-0.5 text-xs w-fit text-gray-500"
												title="Hủy"
											>
												<FaTimes size={15} />
											</button>
										</div>
									</td>
								</tr>
							)}
							{listAnalytes?.map((order) => (
								<tr key={order.id} className="border">
									{' '}
									<td className="p-1 border relative align-top">
										<div className="relative w-full">
											{order.accreditation && (
												<div
													className="absolute right-0.5 top-0.5 z-10 bg-cyan-600 text-white text-xs px-1 rounded cursor-default"
													title="Accreditation"
												>
													{order.accreditation}
												</div>
											)}
											<input
												type="text"
												className={`w-full font-normal bg-white border-none p-1 hover:cursor-pointer hover:outline hover:outline-1 rounded hover:outline-indigo-500 text-left ${
													order.parameter_id ? 'text-gray-700' : 'text-gray-400'
												}`}
												value={order.parameter_uid || ''}
												readOnly
												onDoubleClick={() => handleAccreditationToggle(order.id)}
											/>
											{order.reviewed_by && (
												<div className="absolute right-1 top-1" title="Đã được kiểm tra">
													<FaStar className="text-yellow-400" size={14} />
												</div>
											)}
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top">
										{editingParameterField === order.id ? (
											<>
												<input
													type="text"
													id={`parameter-name-${order.id}`}
													className="w-full bg-white border rounded py-0 px-1 text-left"
													placeholder="Tên chỉ tiêu"
													value={order.parameter_name || ''}
													onChange={(e) => handleParameterNameChange(order.id, e.target.value)}
													onBlur={() => handleParameterBlur(order.id)}
													onKeyDown={(e) => handleParameterKeyDown(e, order.id)}
													autoFocus
												/>
											</>
										) : (
											<div
												className={`py-0 px-1 cursor-pointer hover:border-indigo-500 border 
												${!order.parameter_name || order.parameter_name.trim() === '' ? 'border-yellow-400' : 'border-white'} 
												rounded overflow-y-auto 
												${order.parameter_name && order.parameter_name.trim() !== '' ? 'text-left' : 'center'}
												`}
												onClick={() => handleParameterNameClick(order.id)}
											>
												<span>
													{order.parameter_name && order.parameter_name.trim() !== '' ? order.parameter_name : '--'}
												</span>
											</div>
										)}
									</td>{' '}
									<td className="p-1 border relative align-top">
										<div
											className={`py-0 px-1 text-left border rounded overflow-y-auto
											${
												(!order.matrix || order.matrix.trim() === '') &&
												(!sample?.matrix || sample.matrix.trim() === '')
													? 'border-yellow-400'
													: 'border-white'
											}
										`}
										>
											<span>{order.matrix && order.matrix.trim() !== '' ? order.matrix : sample?.matrix || '--'}</span>
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top">
										<div className="flex flex-col">
											<div className="flex items-center gap-0.5">
												{' '}
												<select
													className={`w-fit min-w-24 cursor-pointer p-1 py-[5px] font-semibold text-slate-500 bg-white border rounded text-sm hover:border-indigo-500 hover:border focus:outline-none text-left ${
														!order.protocol_source || order.protocol_source.trim() === '' ? 'border-yellow-400' : ''
													}`}
													onChange={(e) => handleProtocolSourceChange(order.id, e.target.value)}
													value={order.protocol_source || '--'}
												>
													<option value={''}>{'--'}</option>
													<option value={'IRDOP'}>{'IRDOP'}</option>
													<option value={'IRDOP VS'}>{'IRDOP VS'}</option>
													<option value={'EX'}>{'EX'}</option>
												</select>{' '}
												{editingProtocolField === order.id ? (
													<>
														{' '}
														<input
															type="text"
															id={`protocol-code-${order.id}`}
															className="w-full bg-white border rounded py-0 px-1 text-left"
															placeholder="Mã phương pháp"
															value={order.protocol_code || ''}
															onChange={(e) => {
																const newValue = e.target.value;
																setProtocolCodeInput(newValue);
																setProtocolCodePage(1);
																setShowProtocolCodeDropdown(newValue.length >= 2);
																handleProtocolChange(order.id, newValue);
															}}
															onBlur={() => {
																setTimeout(() => {
																	setShowProtocolCodeDropdown(false);
																	handleProtocolBlur(order.id);
																}, 200);
															}}
															onKeyDown={(e) => handleProtocolKeyDown(e, order.id)}
															autoFocus
														/>{' '}
														{showProtocolCodeDropdown &&
															getPaginatedProtocolCodes(protocolCodeInput).length > 0 &&
															createPortal(
																<div
																	className="absolute bg-white border rounded shadow-lg z-[9999]"
																	style={{
																		width: document.getElementById(`protocol-code-${order.id}`)?.offsetWidth + 'px',
																		top:
																			document.getElementById(`protocol-code-${order.id}`)?.getBoundingClientRect()
																				.bottom + window.scrollY,
																		left:
																			document.getElementById(`protocol-code-${order.id}`)?.getBoundingClientRect()
																				.left + window.scrollX,
																	}}
																>
																	{getPaginatedProtocolCodes(protocolCodeInput).map((code, index) => (
																		<div
																			key={index}
																			className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																			onClick={() => {
																				handleProtocolChange(order.id, code);
																				handleProtocolBlur(order.id);
																				setShowProtocolCodeDropdown(false);
																			}}
																		>
																			<p>{code}</p>
																		</div>
																	))}
																	{filterProtocolCodes(protocolCodeInput).length > itemsPerPage && (
																		<div className="flex justify-between p-2 bg-gray-100">
																			<button
																				className="px-2 py-1 border rounded disabled:opacity-50"
																				onClick={() => handleProtocolCodePageChange(protocolCodePage - 1)}
																				disabled={protocolCodePage === 1}
																			>
																				Prev
																			</button>
																			<span>
																				{protocolCodePage}/
																				{Math.ceil(filterProtocolCodes(protocolCodeInput).length / itemsPerPage)}
																			</span>
																			<button
																				className="px-2 py-1 border rounded disabled:opacity-50"
																				onClick={() => handleProtocolCodePageChange(protocolCodePage + 1)}
																				disabled={
																					protocolCodePage >=
																					Math.ceil(filterProtocolCodes(protocolCodeInput).length / itemsPerPage)
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
													<div
														className={`w-full py-0 px-1 cursor-pointer hover:border-indigo-500 border rounded overflow-y-auto 
														${!order.protocol_code || order.protocol_code.trim() === '' ? 'border-yellow-400' : ''}
														${order.protocol_code && order.protocol_code.trim() !== '' ? 'text-left' : 'center'}
													`}
														onClick={() => handleProtocolClick(order.id)}
													>
														<span>
															{order.protocol_code && order.protocol_code.trim() !== '' ? order.protocol_code : '--'}
														</span>
													</div>
												)}
											</div>

											{order.protocol_source === 'EX' && (
												<>
													<div className="mt-1">
														{editingExNameField === order.id ? (
															<input
																type="text"
																className="w-full bg-white border rounded p-1 text-left"
																placeholder="Tên thầu phụ"
																value={order.ex_info?.ex_name || ''}
																onChange={(e) => handleExNameChange(order.id, e.target.value)}
																onBlur={() => handleExNameBlur(order.id)}
																onKeyDown={(e) => handleExNameKeyDown(e, order.id)}
																autoFocus
															/>
														) : (
															<div
																className="w-full p-1 cursor-pointer hover:border-indigo-500 border rounded text-left text-sm"
																onClick={() => handleExNameClick(order.id)}
															>
																{order.ex_info?.ex_name ? order.ex_info.ex_name : 'Thầu phụ...'}
															</div>
														)}
													</div>
													<div className="mt-1">
														{editingExDateField === order.id ? (
															<DatePicker
																selected={exDateSelected}
																onChange={(date) => handleExDateSelect(order.id, date)}
																dateFormat="dd/MM/yyyy"
																className="p-1 border rounded-md w-full text-sm bg-white"
																placeholderText="Ngày gửi mẫu"
																autoFocus
																shouldCloseOnSelect={true}
															/>
														) : (
															<div
																className="w-full p-1 cursor-pointer hover:border-indigo-500 border rounded text-left text-sm"
																onClick={() => handleExDateClick(order.id, order.ex_info?.send_at)}
															>
																{order.ex_info?.send_at ? formatDate(order.ex_info.send_at) : 'Ngày gửi mẫu...'}
															</div>
														)}
													</div>
												</>
											)}
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top" onClick={() => handleResultValueClick(order)}>
										<div className="hover:border-purple-500 hover:border rounded text-center">
											{editingField === `result_value-${order.sample_id}-${order.id}` && isEditorVisible ? (
												<TinyMceInput value={inputValue || ''} onUpdate={handleSaveContent} onKey={handleKeyDown} />
											) : (
												<div
													dangerouslySetInnerHTML={{
														__html: order?.result_value ? order.result_value : '--',
													}}
													className="p-1"
												/>
											)}
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top">
										{editingField === `result_unit-${order.sample_id}-${order.id}` ? (
											<>
												<input
													type="text"
													id={`result-unit-${order.id}`}
													className="w-full bg-white border rounded py-0 px-1 text-left"
													placeholder="Đơn vị"
													value={inputValue || ''}
													onChange={(e) => {
														const newValue = e.target.value;
														setInputValue(newValue);
														setUnitInput(newValue);
														setUnitPage(1);
														setShowUnitDropdown(newValue.length >= 1); // Show dropdown with at least 1 character for units
													}}
													onBlur={() => {
														// Use a global variable to store the timeout, so we can clear it if needed
														window.unitBlurTimeout = setTimeout(() => {
															setShowUnitDropdown(false);
															// Only save if we haven't already saved from dropdown selection
															if (!window.unitSavedFromDropdown) {
																handleSaveContent(inputValue);
															}
															window.unitSavedFromDropdown = false;
														}, 200);
													}}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															handleSaveContent(inputValue);
														}
													}}
													autoFocus
												/>{' '}
												{showUnitDropdown &&
													getPaginatedUnits(unitInput).length > 0 &&
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999]"
															style={{
																width: document.getElementById(`result-unit-${order.id}`)?.offsetWidth + 'px',
																top:
																	document.getElementById(`result-unit-${order.id}`)?.getBoundingClientRect().bottom +
																	window.scrollY,
																left:
																	document.getElementById(`result-unit-${order.id}`)?.getBoundingClientRect().left +
																	window.scrollX,
															}}
														>
															{getPaginatedUnits(unitInput).map((unit, index) => (
																<div
																	key={index}
																	className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																	onClick={() => {
																		// Stop the blur timeout to prevent double API calls
																		clearTimeout(window.unitBlurTimeout);
																		setInputValue(unit);
																		handleSaveContent(unit);
																		setShowUnitDropdown(false);
																	}}
																>
																	<p>{unit}</p>
																</div>
															))}
															{filterUnits(unitInput).length > itemsPerPage && (
																<div className="flex justify-between p-2 bg-gray-100">
																	<button
																		className="px-2 py-1 border rounded disabled:opacity-50"
																		onClick={() => handleUnitPageChange(unitPage - 1)}
																		disabled={unitPage === 1}
																	>
																		Prev
																	</button>
																	<span>
																		{unitPage}/{Math.ceil(filterUnits(unitInput).length / itemsPerPage)}
																	</span>
																	<button
																		className="px-2 py-1 border rounded disabled:opacity-50"
																		onClick={() => handleUnitPageChange(unitPage + 1)}
																		disabled={unitPage >= Math.ceil(filterUnits(unitInput).length / itemsPerPage)}
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
											<div
												className="hover:border-purple-500 hover:border rounded"
												onClick={() => {
													setEditingField(`result_unit-${order.sample_id}-${order.id}`);
													setInputValue(order.result_unit || '');
												}}
											>
												<div
													dangerouslySetInnerHTML={{
														__html: order?.result_unit ? order.result_unit : '--',
													}}
													className="py-0 px-1 cursor-pointer"
												/>
											</div>
										)}
									</td>{' '}
									<td className="p-1 border relative align-top">
										<div className="relative">
											{deadlineDropdownVisible === order.id ? (
												<div className="relative">
													<DatePicker
														selected={selectedDate}
														onChange={(date) => handleDateSelect(order.id, date)}
														onFocus={() => handleDeadlineFocus(order.id, order.deadline)}
														onChangeRaw={(e) => handleDateInputChange(order.id, e)}
														onBlur={() => handleDeadlineBlur(order.id)}
														onKeyDown={(e) => handleDeadlineKeyDown(e, order.id)}
														dateFormat="dd/MM/yyyy"
														className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
														calendarClassName="text-black"
														placeholderText="Chọn hạn trả"
														autoFocus
														shouldCloseOnSelect={true}
														popperContainer={({ children }) => createPortal(children, document.body)}
														popperProps={{
															positionFixed: true,
														}}
														popperModifiers={{
															preventOverflow: {
																enabled: true,
																escapeWithReference: true,
																boundariesElement: 'viewport',
															},
															hide: {
																enabled: false,
															},
															zIndex: {
																enabled: true,
																value: 99999,
															},
														}}
													/>
												</div>
											) : (
												<button
													className={`w-full dropdown-button font-normal ${
														deadlineDropdownVisible === order.id && 'border border-slate-200'
													} p-1 rounded bg-white text-left h-fit`}
													onClick={(event) => toggleDeadlineDropdown(order.id, event)}
												>
													{formatDate(order.deadline) || 'Chọn hạn trả'}
												</button>
											)}
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top">
										<select
											className={`w-full bg-white border rounded p-1 text-left ${
												!order.field || order.field.trim() === '' ? 'border-yellow-400' : ''
											}`}
											value={order.field || ''}
											onChange={(e) => handleFieldColumnChange(order.id, e.target.value)}
										>
											<option value="">-- Chọn --</option>
											<option value="Hóa lý">Hóa lý</option>
											<option value="Vi sinh">Vi sinh</option>
										</select>
									</td>{' '}
									<td className="p-1 border relative align-top">
										<div className="relative">
											<button
												className={`w-full dropdown-button font-normal ${
													technicianDropdownVisible === order.id && 'border border-slate-200'
												} p-1 rounded bg-white text-left h-fit`}
												onClick={(event) => toggleTechnicianDropdown(order.id, event)}
											>
												{technician(order) || 'Chọn KTV'}
											</button>
										</div>

										{technicianDropdownVisible === order.id &&
											createPortal(
												<ul
													className="fixed w-max min-w-[150px] bg-white border rounded shadow-lg z-[99]"
													style={{
														top: dropdownPosition.top + 'px',
														left: dropdownPosition.left + 'px',
														position: 'absolute',
														maxHeight: '200px',
														overflowY: 'auto',
													}}
												>
													{technicians.map((identity) => (
														<li
															key={identity.alias}
															className="p-1 text-md cursor-pointer hover:bg-gray-200 dropdown-item"
															onClick={() => handleTechnicianChange(order.id, identity.identity_uid)}
														>
															<p className="font-bold text-primary text-sm text-start">{identity.alias || ''}</p>
															<p className="text-start">{identity.identity_name || ''}</p>
														</li>
													))}
												</ul>,
												document.body,
											)}
									</td>
									<td className="pt-[5px] pb-0 border align-top text-center">
										<input
											type="checkbox"
											checked={selectedAnalytes.includes(order.id)}
											onChange={() => handleAnalyteSelect(order.id)}
											className="w-4 h-4 mt-2"
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
			{isTransferMultipleVisible && renderBulkTransferForm()}
			{isDeleteConfirmVisible &&
				renderDeleteConfirm(
					deleteType === 'sample'
						? 'Bạn có chắc chắn muốn xóa mẫu này?'
						: deleteType === 'multiple'
						? `Bạn có chắc chắn muốn xóa ${selectedAnalytes.length} chỉ tiêu đã chọn?`
						: 'Bạn có chắc chắn muốn xóa chỉ tiêu này?',
					deleteType === 'sample'
						? handleDeleteSampleConfirmAction
						: deleteType === 'multiple'
						? handleDeleteMultipleConfirmAction
						: handleDeleteAnalysisConfirmAction,
				)}

			{isBulkDeadlineVisible && renderBulkDeadlinePicker()}
		</div>
	);
};

export default SampleInfor;
