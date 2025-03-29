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
import { MdLibraryAdd, MdChevronLeft, MdChevronRight } from 'react-icons/md';
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
	const [reports, setReports] = useState([]);
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
	const [updateParameterMode, setUpdateParameterMode] = useState(false); // Add state to track parameter update mode
	const [isParameterWarningVisible, setIsParameterWarningVisible] = useState(false); // Add state for parameter warning modal
	const [sampleDropdownVisible, setSampleDropdownVisible] = useState(false);
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

	// Add a new function to handle saving individual field changes
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
				// Update the "Nền mẫu / matrix." field in receiptInfo
				const updatedReceiptInfo = receiptInfo.map((item) => {
					if (item.fname.includes('Nền mẫu') || item.fname.includes('matrix')) {
						return { ...item, fvalue: value };
					}
					return item;
				});
				updatedSample.sample_information = [...customerInfo, ...updatedReceiptInfo];
				setReceiptInfo(updatedReceiptInfo);
			}

			// Send the update to the server
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', {
				sample: updatedSample,
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
			handleSaveField(field, value);
			// Remove focus from the element
			e.target.blur();
		}
	};

	// New handler for field blur events
	const handleFieldBlur = (field, value, originalValue) => {
		// Only save if value has changed
		if (value !== originalValue) {
			handleSaveField(field, value);
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
		let analyses = receiptFull.samples.find((sample) => sample.sample_uid === sampleUid).analysis;
		analyses = analyses.map((analysis) => analysis.parameter_id);
		try {
			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/get/bulk/parameter', { ids: analyses });
			setSelectedParameters(response.data);

			setIsDropdownVisible(false);
		} catch (error) {
			console.error('Error fetching parameters:', error);
		}
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
			const parameters = selectedParameters.map((parameter) => ({
				receipt_id: currentSample.receipt_id,
				sample_id: currentSample.id,
				parameter_id: parameter.id,
				parameter_name: parameter.parameter_name,
				parameter_uid: parameter.parameter_uid || '', // Ensure parameter_uid is included
				accrenditation: parameter.accrenditation,
				protocol_id: parameter.protocol_id,
				technician_uid: parameter.technician_uid,
				deadline: new Date(Date.now() + parameter?.tat_expected?.days * 24 * 60 * 60 * 1000 || 0),
				protocol_code: parameter.protocol_code,
				result_unit: parameter.default_unit,
				protocol_source: parameter.protocol_source,
				created_by_uid: currentUser.identity_uid,
				modified_by_uid: currentUser.identity_uid,
			}));

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/insert/bulk/analysis', {
				analyses: parameters,
			});

			if (response.status === 200) {
				showToast('Parameters added successfully!');
				setIsAddingParameter(false);
				setSelectedParameters([]);
				setListAnalytes([...currentSample.analysis, ...response.data]);
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

	// Function to toggle parameter update mode with warning
	const toggleParameterUpdateMode = () => {
		if (updateParameterMode) {
			setUpdateParameterMode(false);
		} else {
			setIsParameterWarningVisible(true);
		}
	};

	// Function to handle confirmation of parameter update mode
	const confirmParameterUpdateMode = () => {
		setUpdateParameterMode(true);
		setIsParameterWarningVisible(false);
		showToast('Đã bật chế độ cập nhật thư viện chỉ tiêu', 'info');
	};

	// Function to handle cancellation of parameter update mode
	const cancelParameterUpdateMode = () => {
		setUpdateParameterMode(false);
		setIsParameterWarningVisible(false);
	};

	// Helper function to update parameter first, then analysis
	const updateParameterAndAnalysis = async (analysis) => {
		try {
			// First, update the parameter if updateParameterMode is true
			if (
				updateParameterMode &&
				(analysis.parameter_name || analysis.matrix || analysis.protocol_code || analysis.protocol_source)
			) {
				const parameterResponse = await apiPost('https://black.irdop.org/ha8i0uw2/db/upsert/parameter', {
					parameter: {
						parameter_uid: analysis.parameter_uid || '',
						parameter_name: analysis.parameter_name,
						matrix: analysis.matrix,
						protocol_code: analysis.protocol_code,
						protocol_source: analysis.protocol_source,
					},
				});

				// Update the parameter_id in the analysis object
				if (parameterResponse.status === 200) {
					const updatedAnalysis = {
						...analysis,
						parameter_id: parameterResponse.data.id,
						modified_by_uid: currentUser.identity_uid,
					};

					// Now update the analysis with the new parameter_id
					const analysisResponse = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
						analysis: updatedAnalysis,
					});

					if (analysisResponse.status === 200) {
						showToast('Chỉ tiêu và thư viện đã được cập nhật!');
						return updatedAnalysis;
					} else {
						Swal.fire({
							icon: 'error',
							title: 'Lỗi',
							text: analysisResponse.data?.message || 'Lỗi khi cập nhật chỉ tiêu.',
						});
						return analysis;
					}
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: parameterResponse.data?.message || 'Lỗi khi cập nhật thư viện chỉ tiêu.',
					});
					return analysis;
				}
			} else {
				// Standard analysis update without parameter changes
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
						text: response.data?.message || 'Lỗi khi cập nhật chỉ tiêu.',
					});
				}
				return analysis;
			}
		} catch (error) {
			console.error('Error updating parameter and analysis:', error);
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
			// Check if the analysis has parameter data changes that need to be updated
			if (
				updateParameterMode &&
				(analysis.parameter_name || analysis.matrix || analysis.protocol_code || analysis.protocol_source)
			) {
				return await updateParameterAndAnalysis(analysis);
			} else {
				// Standard analysis update without parameter changes
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
						text: response.data?.message || 'Lỗi khi cập nhật chỉ tiêu.',
					});
				}
				return analysis;
			}
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
			}

			// First upsert the parameter to get a parameter_id if updateParameterMode is true
			if (updateParameterMode) {
				const parameterResponse = await apiPost('https://black.irdop.org/ha8i0uw2/db/upsert/parameter', {
					parameter: {
						parameter_uid: newParameter.parameter_uid,
						parameter_name: newParameter.parameter_name,
						matrix: newParameter.matrix,
						protocol_code: newParameter.protocol_code,
						protocol_source: newParameter.protocol_source,
					},
				});

				if (parameterResponse.status !== 200) {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: parameterResponse.data?.message || 'Lỗi khi tạo chỉ tiêu trong thư viện.',
					});
					return;
				}

				var parameter_id = parameterResponse.data.id;
			} else {
				var parameter_id = 0; // No parameter_id if not updating parameter library
			}

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
	}, []);

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
					// The last two items are receipt info, the rest are customer info
					const sampleInfo = response.data.sample_information || [];
					const index = sampleInfo.findIndex((item) => item.fname.includes('Ngày tiếp nhận'));
					const receiptInfoItems = sampleInfo.slice(index, sampleInfo.length);
					const customerInfoItems = sampleInfo.slice(0, index);

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
		// if (key !== 'Enter') {
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
			await onUpdateAnalysis(analysis);
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating analysis.',
			});
		}
		// }
	};

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
					...sample,
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

		// If changing value of "Tên mẫu thử / name", update the main sample name field
		if (
			field === 'fvalue' &&
			(updatedCustomerInfo[index].fname.includes('Tên mẫu thử') || updatedCustomerInfo[index].fname.includes('name'))
		) {
			setSample((prevSample) => ({ ...prevSample, sample_name: value }));
		}
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

		// If changing value of "Mô tả / desc", update the main sample description field
		if (
			field === 'fvalue' &&
			(updatedReceiptInfo[index].fname.includes('Mô tả') || updatedReceiptInfo[index].fname.includes('desc'))
		) {
			setSample((prevSample) => ({
				...prevSample,
				sample_description: value,
			}));
		}

		// If changing value of "Nền mẫu / matrix", update the main matrix field
		if (
			field === 'fvalue' &&
			(updatedReceiptInfo[index].fname.includes('Nền mẫu') || updatedReceiptInfo[index].fname.includes('matrix'))
		) {
			setSample((prevSample) => ({ ...prevSample, matrix: value }));
		}
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
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', {
				sample: {
					...sample,
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
		return currentUser?.role?.staff_technician;
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
									const receiptInfoItems = sampleInfo.filter(
										(item) =>
											item.fname === 'Ngày tiếp nhận / Receipt date.' || item.fname === 'Mã phiếu / Receipt code.',
									);
									const customerInfoItems = sampleInfo.filter(
										(item) =>
											item.fname !== 'Ngày tiếp nhận / Receipt date.' && item.fname !== 'Mã phiếu / Receipt code.',
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
			top: buttonRect.top + window.scrollY - 204, // Display above the button with 4px gap
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
			// Send the update to the server
			await onUpdateAnalysis(analysis);
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật người thực hiện',
			});
		}
	};

	const toggleDeadlineDropdown = (index, event) => {
		const buttonRect = event.target.getBoundingClientRect();

		setDropdownPosition({
			top: buttonRect.top + window.scrollY - 264,
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

	const handleDeadlineChange = async (index, date) => {
		// Update the selected date
		setSelectedDate(date);

		// Convert date to ISO string for API
		const newDeadline = date.toISOString();

		// Create a copy of the analytes with the updated deadline
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, deadline: newDeadline };
			}
			return item;
		});

		// Update the state
		setListAnalytes(updatedAnalytes);

		// Close the dropdown after a small delay to ensure the change is processed
		setTimeout(() => {
			setDeadlineDropdownVisible(null);
		}, 50);

		// Find the updated analysis item
		const analysis = updatedAnalytes.find((item) => item.id === index);

		try {
			// Send the update to the server
			await onUpdateAnalysis(analysis);
		} catch (error) {
			console.error('Error updating deadline:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật hạn trả',
			});
		}
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

	const handleParameterNameClick = (id) => {
		setEditingParameterField(id);
	};

	const handleMatrixClick = (id) => {
		setEditingMatrixField(id);
	};

	const handleParameterNameChange = (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, parameter_name: newValue, parameter_id: 0 };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};

	const handleMatrixChange = (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, matrix: newValue };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};

	const handleParameterBlur = async (index) => {
		setEditingParameterField(null);
		const analysis = listAnalytes.find((item) => item.id === index);
		const updatedAnalysis = await updateParameterAndAnalysis(analysis);

		// Update the list with the returned analysis that has the new parameter_id
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return updatedAnalysis;
			}
			return item;
		});

		setListAnalytes(updatedAnalytes);
	};

	const handleMatrixBlur = async (index) => {
		setEditingMatrixField(null);
		const analysis = listAnalytes.find((item) => item.id === index);
		const updatedAnalysis = await updateParameterAndAnalysis(analysis);

		// Update the list with the returned analysis that has the new parameter_id
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return updatedAnalysis;
			}
			return item;
		});

		setListAnalytes(updatedAnalytes);
	};

	const handleParameterKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			await handleParameterBlur(index);
		}
	};

	const handleMatrixKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			await handleMatrixBlur(index);
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
		const updatedAnalysis = await updateParameterAndAnalysis(analysis);

		// Update the list with the returned analysis
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return updatedAnalysis;
			}
			return item;
		});

		setListAnalytes(updatedAnalytes);
	};

	const handleProtocolKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			await handleProtocolBlur(index);
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
			const updatedAnalysis = await updateParameterAndAnalysis(analysis);

			// Update the list with the returned analysis that has the new parameter_id
			const finalAnalytes = updatedAnalytes.map((item) => {
				if (item.id === index) {
					return updatedAnalysis;
				}
				return item;
			});

			setListAnalytes(finalAnalytes);
		} catch (error) {
			console.error('Error updating protocol source:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating protocol source.',
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

			// Update each analyte with the new technician
			const updatedAnalytes = selectedItems.map((analyte) => ({
				...analyte,
				technician_uid: selectedTechnician,
				modified_by_uid: currentUser.identity_uid,
			}));

			let successCount = 0;
			let failCount = 0;

			// Make API calls for each analyte separately
			for (const analyte of updatedAnalytes) {
				try {
					await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', { analysis: analyte });
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

	// Render parameter warning modal
	const renderParameterWarningModal = () => {
		return (
			<div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
				<div className="bg-white p-4 rounded-lg w-[400px] max-w-90vw">
					<h2 className="text-xl font-semibold mb-4 text-yellow-600">Cảnh báo!</h2>
					<p className="mb-6">Mọi thay đổi của bạn sẽ thay đổi dữ liệu của thư viện chỉ tiêu.</p>
					<div className="flex justify-end space-x-2">
						<button className="bg-gray-500 text-white px-4 py-2 rounded-lg" onClick={cancelParameterUpdateMode}>
							Hủy bỏ
						</button>
						<button className="bg-yellow-500 text-white px-4 py-2 rounded-lg" onClick={confirmParameterUpdateMode}>
							Xác nhận
						</button>
					</div>
				</div>
			</div>
		);
	};

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
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium  text-gray-500">
											<span>Nền mẫu:</span>
										</td>
										<td className="w-full text-start p-1">
											<input
												type="text"
												value={sample?.matrix || ''}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={(e) =>
													setSample({
														...sample,
														matrix: e.target.value,
													})
												}
												onKeyDown={(e) => handleFieldKeyDown(e, 'matrix', e.target.value)}
												onBlur={(e) => handleFieldBlur('matrix', e.target.value, sample?.matrix)}
											/>
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

							{/* Add the new review button here */}
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

							<button
								className={`border-gray-400 text-sm rounded-lg p-1.5 mr-2 flex-shrink-0 flex items-center ${
									updateParameterMode ? 'bg-yellow-500 text-white' : 'text-gray-400'
								}`}
								onClick={toggleParameterUpdateMode}
								title={updateParameterMode ? 'Đang cập nhật thư viện chỉ tiêu' : 'Cập nhật thư viện chỉ tiêu'}
							>
								<FaDatabase size={20} />
							</button>

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
								<th className="p-2 border-x w-[22%] min-w-60 text-left">Chỉ tiêu</th>
								<th className="p-2 border-x w-32 min-w-32 text-left">Nền mẫu</th>
								<th className="p-2 border-x w-[20%] min-w-44 text-left">Phương pháp</th>
								<th className="p-2 border-x w-1/12 min-w-20 text-left">Kết quả</th>
								<th className="p-2 border-x w-1/12 min-w-20 text-left">Đơn vị</th>
								<th className="p-2 border-x w-1/12 min-w-28 text-left">Hạn trả</th>
								{/* <th className="p-2 border-2 w-[12%] min-w-36 text-left ">Thực hiện</th> */}
								<th className="p-2 border-x w-[12%] min-w-32 text-left">Review</th>
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
									</td>
									<td className="p-1 border relative">
										{/* Người thực hiện - không nhập */}
										<div className="p-1 text-gray-400 italic text-center">--</div>
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
									<td className="p-1 border relative align-top">
										<div className="relative w-full">
											<input
												type="text"
												className={`w-full font-normal bg-white border-none p-1 hover:cursor-pointer hover:outline hover:outline-1 rounded hover:outline-indigo-500 text-left ${
													order.parameter_id ? 'text-gray-700' : 'text-gray-400'
												}`}
												value={order.parameter_uid || ''}
												readOnly
											/>
											{order.reviewed_by && (
												<div className="absolute right-1 top-1" title="Đã được kiểm tra">
													<FaStar className="text-yellow-400" size={14} />
												</div>
											)}
										</div>
									</td>
									<td className="p-1 border relative align-top">
										{editingParameterField === order.id ? (
											<input
												type="text"
												className="w-full bg-white border rounded p-1 text-left"
												placeholder="Tên chỉ tiêu"
												value={order.parameter_name || ''}
												onChange={(e) => handleParameterNameChange(order.id, e.target.value)}
												onBlur={() => handleParameterBlur(order.id)}
												onKeyDown={(e) => handleParameterKeyDown(e, order.id)}
												autoFocus
											/>
										) : (
											<div
												className={`p-1 cursor-pointer hover:border-indigo-500 border border-white rounded overflow-y-auto 
												${order.parameter_name && order.parameter_name.trim() !== '' ? 'text-left' : 'center'}
												`}
												onClick={() => handleParameterNameClick(order.id)}
											>
												<span>
													{order.parameter_name && order.parameter_name.trim() !== '' ? order.parameter_name : '--'}
												</span>
											</div>
										)}
									</td>
									<td className="p-1 border relative align-top">
										{editingMatrixField === order.id ? (
											<input
												type="text"
												className="w-full bg-white border rounded p-1 text-left"
												placeholder="Nền mẫu"
												value={order.matrix || ''}
												onChange={(e) => handleMatrixChange(order.id, e.target.value)}
												onBlur={() => handleMatrixBlur(order.id)}
												onKeyDown={(e) => handleMatrixKeyDown(e, order.id)}
												autoFocus
											/>
										) : (
											<div
												className={`p-1 cursor-pointer hover:border-indigo-500 border border-white rounded overflow-y-auto 
												${order.matrix && order.matrix.trim() !== '' ? 'text-left' : 'center'}
												`}
												onClick={() => handleMatrixClick(order.id)}
											>
												<span>{order.matrix && order.matrix.trim() !== '' ? order.matrix : '--'}</span>
											</div>
										)}
									</td>
									<td className="p-1 border relative">
										<div className="flex items-center gap-0.5">
											<select
												className="w-fit min-w-24 cursor-pointer p-1 py-[5px] font-semibold text-slate-500 bg-white  border rounded text-sm hover:border-indigo-500 hover:border focus:outline-none text-left"
												onChange={(e) => handleProtocolSourceChange(order.id, e.target.value)}
												value={order.protocol_source || '--'}
											>
												<option value={''}>{'--'}</option>
												<option value={'IRDOP'}>{'IRDOP'}</option>
												<option value={'IRDOP VS'}>{'IRDOP VS'}</option>
												<option value={'EX'}>{'EX'}</option>
											</select>
											{editingProtocolField === order.id ? (
												<input
													type="text"
													className="w-full bg-white border rounded p-1 text-left"
													placeholder="Mã phương pháp"
													value={order.protocol_code || ''}
													onChange={(e) => handleProtocolChange(order.id, e.target.value)}
													onBlur={() => handleProtocolBlur(order.id)}
													onKeyDown={(e) => handleProtocolKeyDown(e, order.id)}
													autoFocus
												/>
											) : (
												<div
													className={`w-full p-1 cursor-pointer hover:border-indigo-500 border rounded overflow-y-auto 
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
									</td>
									<td className="p-1 border relative" onClick={() => handleResultValueClick(order)}>
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
									</td>
									<td className="p-1 border relative" onClick={() => handleResultUnitClick(order)}>
										<div className="hover:border-purple-500 hover:border rounded ">
											{editingField === `result_unit-${order.sample_id}-${order.id}` && isEditorVisible ? (
												<TinyMceInput value={inputValue || ''} onUpdate={handleSaveContent} onKey={handleKeyDown} />
											) : (
												<div
													dangerouslySetInnerHTML={{
														__html: order?.result_unit ? order.result_unit : '--',
													}}
													className="p-1"
												/>
											)}
										</div>
									</td>
									<td className="p-1 border relative">
										<div className="relative">
											<button
												className={`w-full dropdown-button font-normal ${
													deadlineDropdownVisible === order.id && 'border border-slate-200'
												} p-1 rounded bg-white text-left h-fit`}
												onClick={(event) => toggleDeadlineDropdown(order.id, event)}
											>
												{formatDate(order.deadline) || 'Chọn hạn trả'}
											</button>
										</div>
										{deadlineDropdownVisible === order.id &&
											createPortal(
												<div
													className="fixed bg-white border rounded shadow-lg z-[9999] p-2"
													style={{
														top: dropdownPosition.top + 'px',
														left: dropdownPosition.left + 'px',
														position: 'absolute',
													}}
												>
													<DatePicker
														selected={selectedDate}
														onChange={(date) => handleDeadlineChange(order.id, date)}
														inline
													/>
												</div>,
												document.body,
											)}
									</td>
									{/* <td className="p-1 border relative ">
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
									</td> */}
									<td className="p-1 border relative text-left">
										{order.reviewed_by ? (
											<span className="font-medium">
												{order.reviewerName || 'Unknown'} {/* Use the pre-resolved name */}
											</span>
										) : (
											<span className="text-gray-400 italic">Chưa duyệt</span>
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
			{isParameterWarningVisible && renderParameterWarningModal()}
		</div>
	);
};

export default SampleInfor;
