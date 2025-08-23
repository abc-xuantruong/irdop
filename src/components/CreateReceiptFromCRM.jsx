import React, { useState, useContext, useEffect, useRef } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { MdLibraryAdd } from 'react-icons/md';
import { FaTrashAlt } from 'react-icons/fa';
import { AiOutlinePlus } from 'react-icons/ai';

const CreateReceiptFromCRM = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [code, setCode] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [crmData, setCrmData] = useState(null);
	const [error, setError] = useState(null);
	const [isCreating, setIsCreating] = useState(false);
	const [urgentSamples, setUrgentSamples] = useState({});
	const [allUrgent, setAllUrgent] = useState(false);
	const [selectedPurpose, setSelectedPurpose] = useState(''); // Default purpose
	const [deadline, setDeadline] = useState(''); // Add state for deadline
	// Add new states for parameter selection
	const [isAddingParameter, setIsAddingParameter] = useState(false);
	const [currentSampleIndex, setCurrentSampleIndex] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [parameterList, setParameterList] = useState([]);
	const [selectedParameters, setSelectedParameters] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [typingTimeout, setTypingTimeout] = useState(null);

	// Add states for partner link
	const [isCreatingLink, setIsCreatingLink] = useState(false);
	const [partnerLink, setPartnerLink] = useState('');
	const [linkError, setLinkError] = useState('');

	// Add new states for inline editing
	const [editingField, setEditingField] = useState({
		type: null, // 'client' or 'sample'
		field: null, // field name being edited
		index: null, // index for sample editing
	});
	const [editValue, setEditValue] = useState('');

	// Add state for tracking which analysis cell is being edited
	const [editingAnalysis, setEditingAnalysis] = useState({
		sampleIndex: null,
		analysisIndex: null,
		field: null,
	});
	const [editAnalysisValue, setEditAnalysisValue] = useState('');
	// Define options for select fields
	const sourceOptions = ['--', 'IRDOP', 'IRDOP VS', 'EX'];
	const fieldOptions = ['--', 'Hóa Lý', 'Vi sinh']; // Add states for sample information editing
	const [editingSampleInfo, setEditingSampleInfo] = useState({
		sampleIndex: null,
		isEditing: false,
	});
	const [customerInfo, setCustomerInfo] = useState({});
	const [newField, setNewField] = useState({ fname: '', fvalue: '' });
	const [defaultSampleInformation, setDefaultSampleInformation] = useState(false);

	// States for direct input editing
	const [clientInfo, setClientInfo] = useState({
		client_name: '',
		client_address: '',
		legal_id: '',
		client_phone: '',
		invoice_email: '',
		invoice_info: '',
	});
	const [contactInfo, setContactInfo] = useState({
		name: '',
		phone: '',
		email: '',
		id: '',
		id_date: '',
		id_place: '',
	});
	const [receiverInfo, setReceiverInfo] = useState({
		name: '',
		address: '',
		email: '',
		other: '',
	});

	const { formatDate, currentUser, purposes, hasAuthCookies } = useContext(GlobalContext);
	const navigate = useNavigate();
	// Default customer and receipt fields
	const defaultCustomerFields = [
		{ fname: 'Tên mẫu thử / name.', fvalue: '' },
		{ fname: 'Số lô / LOT no.', fvalue: '' },
		{ fname: 'Ngày sản xuất / mfg.', fvalue: '' },
		{ fname: 'Hạn sử dụng / exp.', fvalue: '' },
		{ fname: 'Nơi sản xuất / mfr.', fvalue: '' },
	];

	const defaultReceiptFields = [
		{ fname: 'Ngày tiếp nhận / receipt date.', fvalue: '' },
		{ fname: 'Ngày thử nghiệm / test date.', fvalue: '' },
		{ fname: 'Mô tả / desc.', fvalue: '' },
		{ fname: 'Mã tiếp nhận / receipt code.', fvalue: '' },
		{ fname: 'Ngày hoàn thành / deadline.', fvalue: '' },
		{ fname: 'Nền mẫu / matrix.', fvalue: '' },
	];

	// Add function to handle global matrix change
	const handleGlobalMatrixChange = (value) => {
		if (!crmData) return;

		const updatedSamples = crmData.samples.map((sample) => ({
			...sample,
			matrix: value,
		}));

		setCrmData({
			...crmData,
			samples: updatedSamples,
		});
	};

	// Apply matrix to all samples and update analyses
	const applyGlobalMatrix = async (matrix) => {
		if (!crmData || !matrix) return;

		// First update all sample matrices
		const updatedSamples = crmData.samples.map((sample) => ({
			...sample,
			matrix: matrix,
		}));

		setCrmData({
			...crmData,
			samples: updatedSamples,
		});
		// Then update analyses for each sample
		for (let index = 0; index < updatedSamples.length; index++) {
			try {
				// Check auth cookies before making API call
				if (!hasAuthCookies()) {
					return; // hasAuthCookies will handle redirect
				}

				const sample = updatedSamples[index];
				// Create list of analyses with their parameter names and the new matrix
				const listAnalysis = sample.analysis.map((item) => ({
					analysis: item.parameter_name,
					matrix: matrix,
				}));

				// Send API request to match analyses with matrix
				const response = await apiPost('https://black.irdop.org/trelw82ki/match/analysis/matrix', {
					listAnalysis,
				});

				// Update the sample with the response data
				if (response && response.data) {
					updatedSamples[index] = {
						...updatedSamples[index],
						analysis: response.data,
					};

					setCrmData({
						...crmData,
						samples: updatedSamples,
					});
				}
			} catch (error) {
				console.error('Error updating analyses based on matrix:', error);
			}
		}
	};

	const openModal = () => {
		setIsModalOpen(true);
		setCode('');
		setCrmData(null);
		setError(null);
		setUrgentSamples({});
		setAllUrgent(false);
		setSelectedPurpose(''); // Reset to default purpose
		setDeadline(''); // Reset deadline
		setPartnerLink(''); // Reset partner link
		setLinkError(''); // Reset link error
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};
	// Function to auto-fill code format
	const formatCode = (inputCode) => {
		if (!inputCode) return inputCode;

		// Remove any existing 'DH' prefix and leading zeros for processing
		let cleanCode = inputCode.replace(/^DH*/i, '');

		// If the clean code is less than 9 characters (after removing DH prefix)
		if (cleanCode.length < 9) {
			// Calculate how many zeros we need
			const zerosNeeded = 9 - cleanCode.length;
			const prefix = 'DH' + '0'.repeat(zerosNeeded - 2);
			return prefix + cleanCode;
		}

		// If already 9 or more characters, just add DH prefix if not present
		if (!inputCode.toUpperCase().startsWith('DH')) {
			return 'DH' + inputCode;
		}

		return inputCode.toUpperCase();
	};

	// Handle code input change with auto-formatting
	const handleCodeChange = (e) => {
		const inputValue = e.target.value;
		setCode(inputValue);
	};

	// Handle code input blur to apply formatting
	const handleCodeBlur = (e) => {
		const inputValue = e.target.value;
		if (inputValue.trim()) {
			const formattedCode = formatCode(inputValue);
			setCode(formattedCode);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		// Reset all states to default values
		setCrmData(null);
		setUrgentSamples({});
		setAllUrgent(false);
		setSelectedPurpose('');
		setDeadline('');
		setCustomerInfo({});
		setDefaultSampleInformation(false);
		setEditingField({ type: null, field: null, index: null });
		setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
		setEditingSampleInfo({ sampleIndex: null, isEditing: false });
		setMatrixInput('');
		setShowMatrixDropdown(false);
		setMatrixPage(1);
		setCurrentEditingMatrixIndex(null);
		setClientInfo({
			client_name: '',
			client_address: '',
			legal_id: '',
			client_phone: '',
			invoice_email: '',
			invoice_info: '',
		});
		setContactInfo({
			name: '',
			phone: '',
			email: '',
			id: '',
			id_date: '',
			id_place: '',
		});
		setReceiverInfo({
			name: '',
			address: '',
			email: '',
			other: '',
		});
		setPartnerLink(''); // Reset partner link
		setLinkError(''); // Reset link error

		try {
			// Check auth cookies before making API call
			if (!hasAuthCookies()) {
				setIsLoading(false);
				return; // hasAuthCookies will handle redirect
			}

			// Format the code before sending to API
			const formattedCode = formatCode(code);

			// Convert code to uppercase before sending to API
			let response;
			let dataFound = false;

			// First try the database API
			try {
				response = await apiPost('https://black.irdop.org/db/generate_receipt', { code: formattedCode });

				// Check if the response contains data
				if (
					response &&
					response.data &&
					!response.data.error &&
					response.data.samples &&
					response.data.samples.length > 0
				) {
					dataFound = true;
					setCrmData(response.data);
					setError(null);

					// Set deadline if it exists in the response
					if (response.data.deadline) {
						setDeadline(response.data.deadline);
					}

					// Set defaultSampleInformation based on response
					if (response.data.default_information !== undefined) {
						setDefaultSampleInformation(response.data.default_information);
					}

					// Load existing sample information if default_information is false
					if (response.data.default_information === false && response.data.samples) {
						const loadedCustomerInfo = {};
						response.data.samples.forEach((sample, index) => {
							if (sample.sample_information && Array.isArray(sample.sample_information)) {
								loadedCustomerInfo[index] = sample.sample_information.map((info) => ({
									fname: info.fname || '',
									fvalue: info.fvalue || '',
								}));
							}
						});
						setCustomerInfo(loadedCustomerInfo);
					}

					// Initialize urgent samples state
					const initialUrgentState = {};
					response.data.samples.forEach((_, index) => {
						initialUrgentState[index] = false;
					});
					setUrgentSamples(initialUrgentState);
				}
			} catch (dbError) {
				console.log('Database API failed, trying CRM API:', dbError);
			}

			// If no data found from database API, try CRM API
			if (!dataFound) {
				response = await apiPost('https://black.irdop.org/crm/generate_receipt', { code: formattedCode });

				// Check if the response contains an error
				if (response && response.data && response.data.error) {
					setError(response.data.message || 'Đã xảy ra lỗi khi lấy dữ liệu từ CRM.');
					setCrmData(null);
				} else if (response && response.data) {
					setCrmData(response.data);
					setError(null);

					// Initialize urgent samples state
					const initialUrgentState = {};
					response.data.samples.forEach((_, index) => {
						initialUrgentState[index] = false;
					});
					setUrgentSamples(initialUrgentState);
				}
			}
		} catch (error) {
			console.error('Error fetching data:', error);
			setError(error.response?.data?.message || 'Không thể lấy dữ liệu. Vui lòng kiểm tra mã đơn hàng.');
			setCrmData(null);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle the "all samples urgent" checkbox
	const handleAllUrgentChange = (e) => {
		const checked = e.target.checked;
		setAllUrgent(checked);

		// Create a new object with all samples set to the checked value
		const newUrgentSamples = {};
		if (crmData && crmData.samples) {
			crmData.samples.forEach((_, index) => {
				newUrgentSamples[index] = checked;
			});
		}
		setUrgentSamples(newUrgentSamples);
	};

	// Handle individual sample urgent checkbox
	const handleUrgentChange = (index, checked) => {
		setUrgentSamples((prev) => ({
			...prev,
			[index]: checked,
		}));
	};

	// Handle deleting a sample
	const handleDeleteSample = (index) => {
		if (!crmData) return;

		const updatedSamples = [...crmData.samples];
		updatedSamples.splice(index, 1);

		// Update crmData with the modified samples array
		setCrmData({
			...crmData,
			samples: updatedSamples,
		});

		// Update the urgentSamples state to reflect the deletion
		const newUrgentSamples = {};
		updatedSamples.forEach((_, idx) => {
			// If index is less than deleted index, keep value
			// If index is >= deleted index, take value from original index + 1
			if (idx < index) {
				newUrgentSamples[idx] = urgentSamples[idx];
			} else {
				newUrgentSamples[idx] = urgentSamples[idx + 1] || false;
			}
		});

		setUrgentSamples(newUrgentSamples);
	};

	// Handle deleting an analysis item
	const handleDeleteAnalysis = (sampleIndex, analysisIndex) => {
		if (!crmData) return;

		const updatedSamples = [...crmData.samples];
		const updatedAnalysis = [...updatedSamples[sampleIndex].analysis];

		updatedAnalysis.splice(analysisIndex, 1);

		updatedSamples[sampleIndex] = {
			...updatedSamples[sampleIndex],
			analysis: updatedAnalysis,
		};

		setCrmData({
			...crmData,
			samples: updatedSamples,
		});
	};
	const handleCreateReceipt = async () => {
		if (!crmData) return;

		// Check if deadline is selected
		if (!deadline) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Vui lòng chọn Hạn trả kết quả!',
			});
			return;
		}

		setIsCreating(true); // Add status property to samples based on urgentSamples state and ensure all analysis items have required properties
		const samplesWithStatus = crmData.samples.map((sample, index) => {
			// Make sure each analysis has all required properties
			const updatedAnalysis = sample.analysis.map((item) => ({
				parameter_uid: item.parameter_uid || '',
				parameter_name: item.parameter_name || '',
				protocol_source: item.protocol_source || '',
				protocol_code: item.protocol_code || '',
				matrix: item.matrix || sample.matrix || '',
				field: item.field || '',
				// Keep any other properties that might be present
				...item,
			}));

			// Prepare sample information by combining custom customer and receipt info
			let sampleInformation = [];

			// Add customer information if exists
			if (customerInfo[index] && customerInfo[index].length > 0) {
				const processedCustomerInfo = customerInfo[index].map((field) => ({
					fname: field.fname === 'Khác' ? field.other || '' : field.fname,
					fvalue: field.fvalue || '',
				}));
				sampleInformation = [...sampleInformation, ...processedCustomerInfo];
			} else {
				// Default customer information if none provided
				sampleInformation.push({
					fname: 'Tên mẫu thử / name.',
					fvalue: sample?.sample_name || '',
				});
			}

			// Always add default receipt information
			sampleInformation.push(
				{
					fname: 'Ngày tiếp nhận / receipt date.',
					fvalue: new Date().toLocaleDateString('vi-VN'),
				},
				{ fname: 'Ngày thử nghiệm / test date.', fvalue: '' },
				{
					fname: 'Mô tả / desc.',
					fvalue: sample?.sample_description || '',
				},
			);

			return {
				...sample,
				// Update the analysis array with the complete objects
				analysis: updatedAnalysis,
				// Add sample_information to each sample
				sample_information: sampleInformation,
				status: urgentSamples[index] ? 1 : 0,
				purpose: selectedPurpose, // Add purpose to each sample
			};
		});
		try {
			// Check auth cookies before making API call
			if (!hasAuthCookies()) {
				setIsCreating(false);
				return; // hasAuthCookies will handle redirect
			}
			const payload = {
				client: crmData.client,
				contact: crmData.contact,
				receiver: receiverInfo,
				samples: samplesWithStatus,
				created_by_uid: currentUser.identity_uid,
				modified_by_uid: currentUser.identity_uid,
				order_code: crmData.order_code,
				quote_code: crmData.quote_code,
				sale_recorder: crmData.sale_recorder,
				total_amount: crmData.total_amount,
				discount_summary: crmData.discount_summary,
				deadline: deadline, // Add deadline to payload
			};

			// Add file_id if it exists in the loaded data
			if (crmData.file_id) {
				payload.fileId = crmData.file_id;
			}

			const response = await apiPost('https://black.irdop.org/crm/create_receipt', payload); // Check if the response contains an error
			if (response && response.data && response.data.error) {
				setError(response.data.message || 'Đã xảy ra lỗi khi tạo tiếp nhận mẫu.');
			} else if (response && response.data) {
				// Close modal and show notification before navigation
				closeModal();

				// Reset customer info after successful creation
				setCustomerInfo({});
				setEditingSampleInfo({ sampleIndex: null, isEditing: false });

				// Show brief notification and navigate after delay
				await showBriefNotification('Tạo tiếp nhận mẫu thành công!');
				navigate(`/dashboard/receipt?receipt_uid=${response.data.receipt_uid}`);
			}
		} catch (error) {
			console.error('Error creating receipt:', error);
			setError(error.response?.data?.message || 'Không thể tạo tiếp nhận mẫu. Vui lòng thử lại sau.');
		} finally {
			setIsCreating(false);
		}
	}; // Function to handle creating and downloading request form with timeout
	const handleCreateRequestForm = async () => {
		if (!crmData) return;

		try {
			setIsCreating(true);

			// Show loading notification
			showBriefNotification('Đang tạo phiếu yêu cầu...', 'info');
			// Prepare request data with sample_information included in each sample
			const samplesWithInfo = crmData.samples.map((sample, index) => {
				// Prepare sample information by combining custom customer and receipt info
				let sampleInformation = [];

				// Add customer information if exists
				if (customerInfo[index] && customerInfo[index].length > 0) {
					const processedCustomerInfo = customerInfo[index].map((field) => ({
						fname: field.fname === 'Khác' ? field.other || '' : field.fname,
						fvalue: field.fvalue || '',
					}));
					sampleInformation = [...sampleInformation, ...processedCustomerInfo];
				} else {
					// Default customer information if none provided
					sampleInformation.push({
						fname: 'Tên mẫu thử / name.',
						fvalue: sample?.sample_name || '',
					});
				}

				// Always add default receipt information
				sampleInformation.push(
					{
						fname: 'Ngày tiếp nhận / receipt date.',
						fvalue: new Date().toLocaleDateString('vi-VN'),
					},
					{ fname: 'Ngày thử nghiệm / test date.', fvalue: '' },
					{
						fname: 'Mô tả / desc.',
						fvalue: sample?.sample_description || '',
					},
				);

				return {
					...sample,
					sample_information: sampleInformation,
				};
			});
			const requestData = {
				...crmData,
				samples: samplesWithInfo,
				created_at: new Date().toISOString(),
				created_by_uid: currentUser.identity_uid,
				...(deadline && { deadline: deadline }), // Add deadline if selected
			};

			// Create a promise that will be rejected after timeout
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
			});

			// Specify Excel MIME type explicitly
			const excelMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

			// Race between the actual request and the timeout
			const response = await Promise.race([
				fetch('https://black.irdop.org/xlsx/download/request_form', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${localStorage.getItem('token')}`,
					},
					body: JSON.stringify(requestData),
				}),
				timeoutPromise,
			]);

			if (response.ok) {
				// Get the blob directly from the response
				const blob = await response.blob();

				// Create a new blob with explicit type to ensure correct handling
				const excelBlob = new Blob([blob], { type: excelMimeType });

				// Create a URL for the blob
				const url = window.URL.createObjectURL(excelBlob);

				// For IE/Edge browsers
				if (window.navigator && window.navigator.msSaveOrOpenBlob) {
					window.navigator.msSaveOrOpenBlob(excelBlob, `Phieu_Yeu_Cau_${crmData.order_code || 'CRM'}.xlsx`);
				} else {
					// For modern browsers
					const link = document.createElement('a');
					link.href = url;
					link.setAttribute('download', `Phieu_Yeu_Cau_${crmData.order_code || 'CRM'}.xlsx`);
					link.style.display = 'none';

					// Append to body, click and remove
					document.body.appendChild(link);
					link.click();

					// Clean up after a short delay to ensure download starts
					setTimeout(() => {
						document.body.removeChild(link);
						window.URL.revokeObjectURL(url);
					}, 200);
				} // Show success message and close modal
				await showBriefNotification('Đã tạo phiếu yêu cầu thành công!');

				// Reset customer info after successful creation
				setCustomerInfo({});
				setEditingSampleInfo({ sampleIndex: null, isEditing: false });

				closeModal();
			} else {
				// Handle HTTP errors
				console.error('Error downloading file:', response.status, response.statusText);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: `Không thể tạo phiếu yêu cầu (${response.status}). Vui lòng thử lại`,
				});
			}
		} catch (error) {
			console.error('Error creating request form:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text:
					error.message === 'Request timed out after 10 seconds'
						? 'Yêu cầu đã quá thời gian chờ. Vui lòng thử lại sau!'
						: 'Không thể tạo phiếu yêu cầu. Vui lòng thử lại sau!',
			});
		} finally {
			setIsCreating(false);
		}
	};

	// New function to show brief notification before navigation
	const showBriefNotification = (message, icon = 'success') => {
		return new Promise((resolve) => {
			const Toast = Swal.mixin({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 500, // Show for 0.5 seconds
				timerProgressBar: true,
				didOpen: (toast) => {
					toast.addEventListener('mouseenter', Swal.stopTimer);
					toast.addEventListener('mouseleave', Swal.resumeTimer);
				},
				customClass: {
					popup: `colored-toast swal2-icon-${icon}`,
				},
			});

			Toast.fire({
				icon: icon,
				title: message,
			}).then(() => {
				resolve();
			});
		});
	};

	// Open parameter selection modal
	const handleOpenAddParameter = (sampleIndex) => {
		setCurrentSampleIndex(sampleIndex);
		setIsAddingParameter(true);
		setSelectedParameters([]);
		setSearchTerm('');
		setParameterList([]);
		setCurrentPage(1);
	};

	// Handle search input
	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
		if (typingTimeout) clearTimeout(typingTimeout);
		if (e.target.value.length > 2) {
			const timeout = setTimeout(() => {
				if (e.target.value.trim() !== '') {
					searchParameters(e.target.value);
				}
			}, 500);

			setTypingTimeout(timeout);
		}
	};

	const handleSearchKeyDown = (e) => {
		if (e.key === 'Enter' && searchTerm.length >= 2) {
			if (typingTimeout) clearTimeout(typingTimeout);
			searchParameters(searchTerm);
		}
	};

	// Select a parameter
	const handleParameterSelect = (parameter) => {
		if (!selectedParameters.some((p) => p.id === parameter.id)) {
			setSelectedParameters([
				...selectedParameters,
				{
					...parameter,
					parameter_uid: parameter.parameter_uid || '',
				},
			]);
		}
		setSearchTerm(''); // Clear the search input
	};

	// Remove a selected parameter
	const handleRemoveParameter = (index) => {
		const updatedParameters = selectedParameters.filter((_, i) => i !== index);
		setSelectedParameters(updatedParameters);
	};

	// Confirm and add parameters to the sample
	const handleConfirmAddParameter = () => {
		if (currentSampleIndex === null || selectedParameters.length === 0) {
			return;
		}

		// Create a copy of the samples array
		const updatedSamples = [...crmData.samples];

		// Add the selected parameters to the current sample's analysis
		updatedSamples[currentSampleIndex] = {
			...updatedSamples[currentSampleIndex],
			analysis: [
				...updatedSamples[currentSampleIndex].analysis,
				...selectedParameters.map((param) => ({
					parameter_id: param.id,
					parameter_name: param.parameter_name,
					parameter_uid: param.parameter_uid || '',
					matrix: param.matrix || updatedSamples[currentSampleIndex].matrix,
					protocol_code: param.protocol_code,
					protocol_source: param.protocol_source || 'IRDOP',
				})),
			],
		};

		// Update the crmData state
		setCrmData({
			...crmData,
			samples: updatedSamples,
		});

		// Close the modal
		setIsAddingParameter(false);
		setSelectedParameters([]);
	};

	// Cancel adding parameters
	const handleCancelAddParameter = () => {
		setIsAddingParameter(false);
		setSelectedParameters([]);
	};

	// Add this function for rendering the parameter selection modal
	const renderAddParameterModal = () => {
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
				onClick={() => setIsAddingParameter(false)}
			>
				<div
					className="bg-white p-4 rounded-lg w-[90%] md:w-[70%] xl:w-[50%] h-3/5 max-w-[700px] min-h-[400px] max-h-[700px] relative"
					onClick={(e) => e.stopPropagation()}
				>
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
						<div className="flex justify-end">
							<button className="bg-gray-500 text-white p-2 rounded mr-2" onClick={handleCancelAddParameter}>
								Hủy bỏ
							</button>
							<button
								className="bg-green-500 text-white p-2 rounded"
								onClick={handleConfirmAddParameter}
								disabled={selectedParameters.length === 0}
							>
								Xác nhận
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	};

	// Add new functions for inline editing
	const startEditing = (type, field, value, index = null) => {
		setEditingField({ type, field, index });
		setEditValue(value);
	};

	const handleEditChange = (e) => {
		setEditValue(e.target.value);
	};
	const saveEdit = () => {
		if (editingField.type === 'client') {
			// Handle contact fields
			if (
				editingField.field === 'contact_name' ||
				editingField.field === 'contact_phone' ||
				editingField.field === 'contact_email'
			) {
				const contactField = editingField.field.replace('contact_', ''); // Remove 'contact_' prefix
				setCrmData({
					...crmData,
					contact: {
						...crmData.contact,
						[contactField]: editValue,
					},
				});
			} else {
				// Update client information
				setCrmData({
					...crmData,
					client: {
						...crmData.client,
						[editingField.field]: editValue,
					},
				});
			}
		} else if (editingField.type === 'sample') {
			// Update sample name
			const updatedSamples = [...crmData.samples];
			updatedSamples[editingField.index] = {
				...updatedSamples[editingField.index],
				sample_name: editValue,
			};
			setCrmData({
				...crmData,
				samples: updatedSamples,
			});
		}
		// Reset editing state
		setEditingField({ type: null, field: null, index: null });
	};

	const cancelEdit = () => {
		setEditingField({ type: null, field: null, index: null });
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			saveEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	};

	// Handle the matrix change for a specific sample
	const handleMatrixChange = (index, value) => {
		if (!crmData) return;

		const updatedSamples = [...crmData.samples];
		updatedSamples[index] = {
			...updatedSamples[index],
			matrix: value,
		};

		setCrmData({
			...crmData,
			samples: updatedSamples,
		});
	}; // Handle matrix input completion (on Enter key or blur)
	const handleMatrixComplete = async (index, matrixParam) => {
		if (!crmData) return;

		const sample = crmData.samples[index];
		const matrix = matrixParam !== undefined ? matrixParam : sample.matrix;

		if (!matrix) return;
		try {
			// Check auth cookies before making API call
			if (!hasAuthCookies()) {
				return; // hasAuthCookies will handle redirect
			}

			// First ensure the sample matrix is correctly set in state
			const updatedSamples = [...crmData.samples];
			updatedSamples[index] = {
				...updatedSamples[index],
				matrix: matrix,
			};

			// Update the sample matrix value first before any API call
			setCrmData({
				...crmData,
				samples: updatedSamples,
			});

			// Also make sure the input field displays the correct value
			const inputField = document.getElementById(`matrix-${index}`);
			if (inputField && inputField.value !== matrix) {
				inputField.value = matrix;
			}

			// Create list of analyses with their parameter names and the new matrix
			const listAnalysis = sample.analysis.map((item) => ({
				analysis: item.parameter_name,
				matrix: matrix,
			}));

			// Send API request to match analyses with matrix
			const response = await apiPost('https://black.irdop.org/trelw82ki/match/analysis/matrix', {
				listAnalysis,
			});

			// Update the sample with the response data
			if (response && response.data) {
				updatedSamples[index] = {
					...updatedSamples[index],
					matrix: matrix, // Ensure matrix value is preserved
					analysis: response.data,
				};

				setCrmData({
					...crmData,
					samples: updatedSamples,
				});
			}
		} catch (error) {
			console.error('Error updating analyses based on matrix:', error);
		}
	};
	// Search parameters
	const searchParameters = async (query) => {
		try {
			// Check auth cookies before making API call
			if (!hasAuthCookies()) {
				return; // hasAuthCookies will handle redirect
			}

			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/search/parameter', {
				query,
				matrix: crmData.samples[currentSampleIndex]?.matrix || '',
			});
			if (response && response.data) {
				setParameterList(response.data);
			}
		} catch (error) {
			console.error('Error searching parameters:', error);
		}
	};

	// Function to start editing analysis cell
	const startEditingAnalysis = (sampleIndex, analysisIndex, field, value) => {
		setEditingAnalysis({ sampleIndex, analysisIndex, field });
		setEditAnalysisValue(value || '');
	};

	// Function to handle analysis edit change
	const handleAnalysisEditChange = (e) => {
		setEditAnalysisValue(e.target.value);
	};
	// Function to save analysis edit
	const saveAnalysisEdit = () => {
		const { sampleIndex, analysisIndex, field } = editingAnalysis;
		if (sampleIndex === null || analysisIndex === null || !field) return;

		// Don't set the value if it's '--'
		if (editAnalysisValue !== '--') {
			const updatedSamples = [...crmData.samples];

			// Handle special case for ex_info fields
			if (field === 'ex_name' || field === 'send_at') {
				const currentAnalysis = updatedSamples[sampleIndex].analysis[analysisIndex];
				const currentExInfo = currentAnalysis.ex_info || {};

				updatedSamples[sampleIndex].analysis[analysisIndex] = {
					...currentAnalysis,
					ex_info: {
						...currentExInfo,
						[field]: editAnalysisValue,
					},
				};
			} else {
				// Regular field updates
				updatedSamples[sampleIndex].analysis[analysisIndex] = {
					...updatedSamples[sampleIndex].analysis[analysisIndex],
					[field]: editAnalysisValue,
				};
			}

			setCrmData({
				...crmData,
				samples: updatedSamples,
			});
		}

		// Reset editing state
		setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
	};

	// Function to cancel analysis edit
	const cancelAnalysisEdit = () => {
		setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
	};

	// Function to handle key events for analysis edit
	const handleAnalysisKeyDown = (e) => {
		if (e.key === 'Enter') {
			saveAnalysisEdit();
		} else if (e.key === 'Escape') {
			cancelAnalysisEdit();
		}
	};

	// Add state for matrix dropdown
	const [uniqueMatrices, setUniqueMatrices] = useState([]);
	const [matrixInput, setMatrixInput] = useState('');
	const [showMatrixDropdown, setShowMatrixDropdown] = useState(false);
	const [matrixPage, setMatrixPage] = useState(1);
	const itemsPerPage = 10;
	const [currentEditingMatrixIndex, setCurrentEditingMatrixIndex] = useState(null);
	const skipBlurRef = useRef(false);
	// Fetch matrices for dropdown
	useEffect(() => {
		const fetchMatrices = async () => {
			try {
				// Check auth cookies before making API call
				if (!hasAuthCookies()) {
					return; // hasAuthCookies will handle redirect
				}

				// Fetch matrices from API
				const matricesResponse = await apiGet('https://black.irdop.org/get/list_enum/matrix');
				if (matricesResponse && matricesResponse.data && Array.isArray(matricesResponse.data)) {
					setUniqueMatrices(matricesResponse.data.filter(Boolean));
				}
			} catch (error) {
				console.error('Error fetching matrix list:', error);
			}
		};

		fetchMatrices();
	}, []);

	// Sync crmData to input states
	useEffect(() => {
		if (crmData) {
			setClientInfo({
				client_name: crmData.client?.client_name || '',
				client_address: crmData.client?.client_address || '',
				legal_id: crmData.client?.legal_id || '',
				client_phone: crmData.client?.client_phone || '',
				invoice_email: crmData.client?.invoice_email || '',
				invoice_info: crmData.client?.invoice_info || '',
			});
			setContactInfo({
				name: crmData.contact?.name || '',
				phone: crmData.contact?.phone || '',
				email: crmData.contact?.email || '',
				id: crmData.contact?.id || '',
				id_date: crmData.contact?.id_date || '',
				id_place: crmData.contact?.id_place || '',
			});
			setReceiverInfo({
				name: crmData.receiver?.name || '',
				address: crmData.receiver?.address || '',
				email: crmData.receiver?.email || '',
				other: crmData.receiver?.other || '',
			});
		}
	}, [crmData]);

	// Handle client info input changes
	const handleClientInfoChange = (field, value) => {
		const updatedClientInfo = { ...clientInfo, [field]: value };
		setClientInfo(updatedClientInfo);

		// Update crmData immediately
		setCrmData((prev) => ({
			...prev,
			client: {
				...prev.client,
				[field]: value,
			},
		}));
	};

	// Handle contact info input changes
	const handleContactInfoChange = (field, value) => {
		const updatedContactInfo = { ...contactInfo, [field]: value };
		setContactInfo(updatedContactInfo);

		// Update crmData immediately
		setCrmData((prev) => ({
			...prev,
			contact: {
				...prev.contact,
				[field]: value,
			},
		}));
	};

	// Handle receiver info input changes
	const handleReceiverInfoChange = (field, value) => {
		const updatedReceiverInfo = { ...receiverInfo, [field]: value };
		setReceiverInfo(updatedReceiverInfo);

		// Update crmData immediately
		setCrmData((prev) => ({
			...prev,
			receiver: {
				...prev.receiver,
				[field]: value,
			},
		}));
	};

	// Handle deadline change - convert to GMT+7 at 7 AM
	const handleDeadlineChange = (dateValue) => {
		if (!dateValue) {
			setDeadline('');
			return;
		}

		// Create a date object with the selected date at 7 AM GMT+7
		const selectedDate = new Date(dateValue);
		selectedDate.setHours(7, 0, 0, 0); // Set to 7:00:00 AM

		// Convert to ISO string for GMT+7 timezone
		const vietnamOffset = 7 * 60; // GMT+7 in minutes
		const localOffset = selectedDate.getTimezoneOffset(); // Local timezone offset in minutes
		const totalOffset = vietnamOffset + localOffset; // Total offset to add

		const gmtPlus7Date = new Date(selectedDate.getTime() + totalOffset * 60000);
		const isoString = gmtPlus7Date.toISOString();

		setDeadline(isoString);
	};

	// Filter matrices based on input
	const filterMatrices = (input) => {
		if (!input || input.length < 2) return []; // Only show suggestions with 2+ characters
		return uniqueMatrices.filter((matrix) => matrix && matrix.toLowerCase().includes((input || '').toLowerCase()));
	};

	// Get paginated results for dropdown
	const getPaginatedMatrices = (input) => {
		const filtered = filterMatrices(input);
		return filtered.slice((matrixPage - 1) * itemsPerPage, matrixPage * itemsPerPage);
	};
	// Pagination handler
	const handleMatrixPageChange = (pageNumber) => {
		setMatrixPage(pageNumber);
	};

	// Functions to handle sample information editing
	const handleAddCustomerField = (sampleIndex) => {
		const updatedCustomerInfo = { ...customerInfo };
		if (!updatedCustomerInfo[sampleIndex]) {
			if (!defaultSampleInformation && crmData?.samples[sampleIndex]) {
				// Initialize with default fields if defaultSampleInformation is false
				updatedCustomerInfo[sampleIndex] = defaultCustomerFields.map((field) => ({
					...field,
					fvalue: field.fname === 'Tên mẫu thử / name.' ? crmData.samples[sampleIndex].sample_name || '' : field.fvalue,
				}));
			} else {
				updatedCustomerInfo[sampleIndex] = [
					{
						fname: 'Tên mẫu thử / name.',
						fvalue: crmData?.samples[sampleIndex]?.sample_name || '',
					},
				];
			}
		}
		updatedCustomerInfo[sampleIndex] = [...updatedCustomerInfo[sampleIndex], { fname: '', fvalue: '' }];
		setCustomerInfo(updatedCustomerInfo);
	};
	const handleCustomerFieldChange = (sampleIndex, fieldIndex, field, value) => {
		const updatedCustomerInfo = { ...customerInfo };

		// Initialize with default fields if not exists and defaultSampleInformation is false
		if (!updatedCustomerInfo[sampleIndex]) {
			if (!defaultSampleInformation && crmData?.samples[sampleIndex]) {
				updatedCustomerInfo[sampleIndex] = defaultCustomerFields.map((defaultField) => ({
					...defaultField,
					fvalue:
						defaultField.fname === 'Tên mẫu thử / name.'
							? crmData.samples[sampleIndex].sample_name || ''
							: defaultField.fvalue,
				}));
			} else {
				updatedCustomerInfo[sampleIndex] = [];
			}
		}

		if (field === 'fname') {
			const selectedField = defaultCustomerFields.find((item) => item.fname === value);
			if (selectedField) {
				// When user selects a predefined field, use that field and clear any 'other' value
				updatedCustomerInfo[sampleIndex][fieldIndex] = {
					...selectedField,
					other: undefined, // Clear other field when selecting predefined option
				};
			} else if (value === 'Khác') {
				// When user selects "Khác", initialize with empty other field
				updatedCustomerInfo[sampleIndex][fieldIndex] = {
					...updatedCustomerInfo[sampleIndex][fieldIndex],
					fname: 'Khác',
					other: '', // Initialize empty other field
				};
			} else {
				updatedCustomerInfo[sampleIndex][fieldIndex] = {
					...updatedCustomerInfo[sampleIndex][fieldIndex],
					fname: value,
					other: undefined, // Clear other field for any other custom value
				};
			}
		} else if (field === 'other') {
			// When user types in the "other" input, update both 'other' and 'fname' fields
			updatedCustomerInfo[sampleIndex][fieldIndex] = {
				...updatedCustomerInfo[sampleIndex][fieldIndex],
				other: value,
				fname: value, // Set fname to the custom value entered by user
			};
		} else {
			updatedCustomerInfo[sampleIndex][fieldIndex] = {
				...updatedCustomerInfo[sampleIndex][fieldIndex],
				[field]: value,
			};
		}
		setCustomerInfo(updatedCustomerInfo);
	};
	const handleDeleteCustomerField = (sampleIndex, fieldIndex) => {
		const updatedCustomerInfo = { ...customerInfo };
		if (updatedCustomerInfo[sampleIndex]) {
			updatedCustomerInfo[sampleIndex] = updatedCustomerInfo[sampleIndex].filter((_, i) => i !== fieldIndex);
		}
		setCustomerInfo(updatedCustomerInfo);
	}; // Function to toggle sample information mode
	const handleAddSampleInfoToAll = () => {
		if (!crmData || !crmData.samples) return;

		if (!defaultSampleInformation) {
			// Switch to full sample information mode
			const updatedCustomerInfo = { ...customerInfo };

			crmData.samples.forEach((sample, index) => {
				const defaultFields = defaultCustomerFields.map((field) => ({
					...field,
					fvalue: field.fname === 'Tên mẫu thử / name.' ? sample.sample_name || '' : field.fvalue,
				}));
				updatedCustomerInfo[index] = [...defaultFields];
			});
			setCustomerInfo(updatedCustomerInfo);
			setDefaultSampleInformation(true);
			showBriefNotification('Đã bật chế độ thông tin mẫu đầy đủ!', 'success');
		} else {
			// Switch back to default mode (sample info shown by default)
			setCustomerInfo({});
			setDefaultSampleInformation(false);
			showBriefNotification('Đã tắt chế độ thông tin mẫu đầy đủ!', 'success');
		}
	};

	// Function to handle loading from CRM
	const handleLoadFromCRM = async () => {
		if (!code.trim()) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Vui lòng nhập mã đơn hàng!',
			});
			return;
		}

		setIsLoading(true);
		setError(null);

		// Reset all states to default values
		setCrmData(null);
		setUrgentSamples({});
		setAllUrgent(false);
		setSelectedPurpose('');
		setDeadline('');
		setCustomerInfo({});
		setDefaultSampleInformation(false);
		setEditingField({ type: null, field: null, index: null });
		setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
		setEditingSampleInfo({ sampleIndex: null, isEditing: false });
		setMatrixInput('');
		setShowMatrixDropdown(false);
		setMatrixPage(1);
		setCurrentEditingMatrixIndex(null);
		setClientInfo({
			client_name: '',
			client_address: '',
			legal_id: '',
			client_phone: '',
			invoice_email: '',
			invoice_info: '',
		});
		setContactInfo({
			name: '',
			phone: '',
			email: '',
			id: '',
			id_date: '',
			id_place: '',
		});
		setReceiverInfo({
			name: '',
			address: '',
			email: '',
			other: '',
		});
		setPartnerLink(''); // Reset partner link
		setLinkError(''); // Reset link error

		try {
			// Check auth cookies before making API call
			if (!hasAuthCookies()) {
				setIsLoading(false);
				return; // hasAuthCookies will handle redirect
			}

			// Format the code before sending to API
			const formattedCode = formatCode(code);

			// Load data from CRM API
			const response = await apiPost('https://black.irdop.org/crm/generate_receipt', { code: formattedCode });

			// Check if the response contains an error
			if (response && response.data && response.data.error) {
				setError(response.data.message || 'Đã xảy ra lỗi khi lấy dữ liệu từ CRM.');
				setCrmData(null);
			} else if (response && response.data) {
				setCrmData(response.data);
				setError(null);

				// Initialize urgent samples state
				const initialUrgentState = {};
				response.data.samples.forEach((_, index) => {
					initialUrgentState[index] = false;
				});
				setUrgentSamples(initialUrgentState);

				showBriefNotification('Load từ CRM thành công!', 'success');
			}
		} catch (error) {
			console.error('Error loading CRM data:', error);
			setError(error.response?.data?.message || 'Không thể lấy dữ liệu từ CRM. Vui lòng kiểm tra mã đơn hàng.');
			setCrmData(null);
		} finally {
			setIsLoading(false);
		}
	};

	// Function to handle test save
	const handleTestSave = async () => {
		if (!crmData) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Không có dữ liệu để lưu!',
			});
			return;
		}

		setIsCreating(true);
		try {
			// Check auth cookies before making API call
			if (!hasAuthCookies()) {
				setIsCreating(false);
				return; // hasAuthCookies will handle redirect
			}

			// Prepare the order data
			const orderData = {
				order_code: crmData.order_code || '',
				quote_code: crmData.quote_code || '',
				sale_recorder: crmData.sale_recorder || '',
				client: crmData.client,
				contact: crmData.contact,
				receiver: receiverInfo,
				total_amount: crmData.total_amount || 0,
				samples: crmData.samples.map((sample, index) => {
					// Include sample_information if it exists for this sample
					const sampleData = { ...sample };
					if (customerInfo[index] && customerInfo[index].length > 0) {
						sampleData.sample_information = customerInfo[index];
					}
					return sampleData;
				}),
				...(deadline && { deadline: deadline }),
				default_information: defaultSampleInformation,
			};

			const response = await apiPost('https://black.irdop.org/db/save/order', { order: orderData });

			// Check if the response contains an error
			if (response && response.data && response.data.error) {
				setError(response.data.message || 'Đã xảy ra lỗi khi lưu dữ liệu.');
			} else if (response && response.data) {
				showBriefNotification('Lưu thử nghiệm thành công!', 'success');
			}
		} catch (error) {
			console.error('Error saving test data:', error);
			setError(error.response?.data?.message || 'Không thể lưu dữ liệu. Vui lòng thử lại sau.');
		} finally {
			setIsCreating(false);
		}
	};
	// Function to handle creating partner link
	const handleCreatePartnerLink = async () => {
		if (!crmData) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Không có dữ liệu đơn hàng!',
			});
			return;
		}

		const orderCode = crmData.order_code;
		if (!orderCode) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Không tìm thấy mã đơn hàng!',
			});
			return;
		}

		setIsCreatingLink(true);
		setLinkError('');

		try {
			const res = await apiGet(`https://black.irdop.org/db/order/create_uri/${orderCode}`);
			const result = res.data;
			if (result.order_code && result.partner_uri) {
				const domain = window.location.origin;

				const fullLink = `${domain}/partner_request_form.html?orderCode=${encodeURIComponent(
					result.order_code,
				)}&uri=${encodeURIComponent(result.partner_uri)}`;
				console.log('Generated partner link:', fullLink);
				setPartnerLink(fullLink);
				Swal.fire({
					icon: 'success',
					title: 'Thành công',
					text: 'Đã tạo link điền phiếu thành công!',
					timer: 2000,
					showConfirmButton: false,
				});
			} else {
				console.error('API response:', result);
				setLinkError('Phản hồi API không hợp lệ: ' + JSON.stringify(result));
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: 'API trả về không đúng định dạng. Xem console để biết chi tiết!',
				});
			}
		} catch (error) {
			console.error('Error creating partner link:', error);
			setLinkError('Không thể tạo link điền phiếu!');
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Không thể tạo link điền phiếu!',
			});
		} finally {
			setIsCreatingLink(false);
		}
	};

	// Function to copy link to clipboard
	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(partnerLink);
			Swal.fire({
				icon: 'success',
				title: 'Đã sao chép',
				text: 'Link đã được sao chép vào clipboard!',
				timer: 1500,
				showConfirmButton: false,
			});
		} catch (error) {
			console.error('Error copying to clipboard:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Không thể sao chép link!',
			});
		}
	};

	return (
		<>
			<button
				onClick={openModal}
				className="border-gray-300 font-medium py-0 px-2 rounded-lg w-fit bg-background text-primary"
			>
				<div>Tạo TNM từ CRM</div>
			</button>{' '}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
					<div className="absolute inset-0 bg-black bg-opacity-50 " onClick={closeModal}></div>
					<div className="bg-white rounded-lg p-6 w-[90vw] h-[95vh] z-10 relative flex flex-col justify-between">
						<div>
							<h2 className="text-xl font-bold mb-4">Tạo tiếp nhận mẫu từ CRM</h2>
							<form onSubmit={handleSubmit} className="mb-4">
								{' '}
								<div className="flex items-center gap-2">
									<input
										type="text"
										value={code}
										onChange={handleCodeChange}
										onBlur={handleCodeBlur}
										placeholder="Nhập mã đơn hàng (VD: 2222 sẽ tự động thành DH0002222)"
										className="border p-2 rounded flex-grow bg-white"
										required
									/>
									<button
										type="submit"
										className="bg-primary text-white p-2 rounded hover:bg-blue-700"
										disabled={isLoading}
									>
										{isLoading ? 'Đang tìm...' : 'Tìm'}
									</button>
								</div>
							</form>{' '}
							{error && (
								<div className="text-red-500 mb-4 p-3 bg-red-50 border border-red-200 rounded">
									<p className="font-medium">Lỗi:</p>
									<p>{error}</p>
								</div>
							)}
							{crmData && (
								<div className="flex flex-col lg:flex-row gap-4 overflow-y-auto max-h-[calc(95vh-200px)]">
									{/* Left Column: Order and Customer Information */}
									<div className="lg:w-1/3 space-y-4">
										<div className="border rounded-lg p-4 text-start w-full h-fit">
											<h3 className="font-semibold text-lg mb-2">Thông tin đơn hàng</h3>
											<p>
												<span className="font-medium text-gray-500">Mã đơn hàng: </span>
												{crmData.order_code || '--'}
											</p>
											<p>
												<span className="font-medium text-gray-500">Mã báo giá: </span>
												{crmData.quote_code || '--'}
											</p>
											<p>
												<span className="font-medium text-gray-500">Ghi nhận doanh số: </span>
												{crmData.sale_recorder || '--'}
											</p>

											<p>
												<span className="font-medium text-gray-500">Tổng tiền: </span>
												{crmData.total_amount
													? new Intl.NumberFormat('vi-VN', {
															style: 'currency',
															currency: 'VND',
													  }).format(crmData.total_amount)
													: '--'}
											</p>
										</div>

										<div className="border rounded-lg p-4 text-start w-full h-fit">
											<h3 className="font-semibold text-lg mb-2">Thông tin khách hàng</h3>
											<p className="mb-2">
												<span className="font-medium text-gray-500">Mã khách hàng: </span>
												{crmData.client.client_uid || '--'}
											</p>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">Tên cá nhân / tổ chức</label>
												<input
													type="text"
													value={clientInfo.client_name}
													onChange={(e) => handleClientInfoChange('client_name', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập tên cá nhân / tổ chức"
												/>
											</div>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">Địa chỉ</label>
												<input
													type="text"
													value={clientInfo.client_address}
													onChange={(e) => handleClientInfoChange('client_address', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập địa chỉ"
												/>
											</div>

											<div className="mb-1">
												<label className="font-medium text-gray-500 block mb-1">Mã số thuế / CCCD</label>
												<input
													type="text"
													value={clientInfo.legal_id}
													onChange={(e) => handleClientInfoChange('legal_id', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập mã số thuế / CCCD"
												/>
											</div>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">Điện thoại</label>
												<input
													type="tel"
													value={clientInfo.client_phone}
													onChange={(e) => handleClientInfoChange('client_phone', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập số điện thoại"
												/>
											</div>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">Email hóa đơn</label>
												<input
													type="email"
													value={clientInfo.invoice_email}
													onChange={(e) => handleClientInfoChange('invoice_email', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập email hóa đơn"
												/>
											</div>

											<div className="mb-1">
												<label className="font-medium text-gray-500 block mb-1">TT hóa đơn (khác)</label>
												<input
													type="text"
													value={clientInfo.invoice_info}
													onChange={(e) => handleClientInfoChange('invoice_info', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập thông tin hóa đơn khác"
												/>
											</div>
										</div>

										{/* Contact Information Section */}
										<div className="border rounded-lg p-4 text-start w-full h-fit">
											<h3 className="font-semibold text-lg mb-2">Thông tin liên hệ</h3>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">Người liên hệ</label>
												<input
													type="text"
													value={contactInfo.name}
													onChange={(e) => handleContactInfoChange('name', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập tên người liên hệ"
												/>
											</div>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">Điện thoại</label>
												<input
													type="tel"
													value={contactInfo.phone}
													onChange={(e) => handleContactInfoChange('phone', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập số điện thoại"
												/>
											</div>

											<div className="mb-1">
												<label className="font-medium text-gray-500 block mb-1">Email</label>
												<input
													type="email"
													value={contactInfo.email}
													onChange={(e) => handleContactInfoChange('email', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập địa chỉ email"
												/>
											</div>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">CCCD</label>
												<input
													type="text"
													value={contactInfo.id}
													onChange={(e) => handleContactInfoChange('id', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập số CCCD"
												/>
											</div>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">Ngày cấp</label>
												<input
													type="date"
													value={contactInfo.id_date}
													onChange={(e) => handleContactInfoChange('id_date', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
											</div>

											<div className="mb-1">
												<label className="font-medium text-gray-500 block mb-1">Nơi cấp</label>
												<input
													type="text"
													value={contactInfo.id_place}
													onChange={(e) => handleContactInfoChange('id_place', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập nơi cấp CCCD"
												/>
											</div>
										</div>

										{/* Receiver Information Section */}
										<div className="border rounded-lg p-4 text-start w-full h-fit">
											<h3 className="font-semibold text-lg mb-2">Thông tin người nhận</h3>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">Tên người nhận</label>
												<input
													type="text"
													value={receiverInfo.name}
													onChange={(e) => handleReceiverInfoChange('name', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập tên người nhận (nếu khác với người liên hệ)"
												/>
											</div>

											<div className="mb-1">
												<label className="font-medium text-gray-500 block mb-1">Địa chỉ người nhận</label>
												<input
													type="text"
													value={receiverInfo.address}
													onChange={(e) => handleReceiverInfoChange('address', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập địa chỉ người nhận (nếu khác với địa chỉ khách hàng)"
												/>
											</div>

											<div className="mb-2">
												<label className="font-medium text-gray-500 block mb-1">Email KQ</label>
												<input
													type="email"
													value={receiverInfo.email}
													onChange={(e) => handleReceiverInfoChange('email', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập email nhận kết quả"
												/>
											</div>

											<div className="mb-1">
												<label className="font-medium text-gray-500 block mb-1">Khác</label>
												<input
													type="text"
													value={receiverInfo.other}
													onChange={(e) => handleReceiverInfoChange('other', e.target.value)}
													className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
													placeholder="Nhập thông tin khác"
												/>
											</div>
										</div>
									</div>

									{/* Right Column: Sample List */}
									<div className="lg:w-2/3">
										<div className="w-full">
											{' '}
											<div className="flex justify-between items-center mb-2">
												<h3 className="font-semibold text-lg">Danh sách mẫu</h3>{' '}
												<div className="flex items-center gap-4">
													<div className="flex items-center gap-2">
														<button
															onClick={handleAddSampleInfoToAll}
															className={`text-white text-sm rounded-lg px-3 py-1 ${
																defaultSampleInformation
																	? 'bg-sky-500 hover:bg-sky-600'
																	: 'bg-gray-400 hover:bg-gray-500'
															}`}
															title="Bật/tắt thông tin đầy đủ cho tất cả mẫu"
														>
															{defaultSampleInformation ? 'Tắt thông tin mẫu' : 'Đầy đủ thông tin mẫu'}
														</button>
														<button
															type="button"
															onClick={handleLoadFromCRM}
															className="bg-orange-500 text-white text-sm rounded-lg px-3 py-1 hover:bg-orange-600"
															disabled={isLoading}
														>
															Load từ CRM
														</button>
													</div>
													<div className="flex items-center">
														<input
															type="checkbox"
															id="allUrgent"
															checked={allUrgent}
															onChange={handleAllUrgentChange}
															className="mr-2"
														/>
														<label htmlFor="allUrgent" className="text-sm font-medium">
															Mẫu khẩn
														</label>
													</div>
													<div className="flex items-center">
														<label htmlFor="purpose" className="text-sm font-medium mr-2">
															Mục đích:
														</label>
														<select
															id="purpose"
															value={selectedPurpose}
															onChange={(e) => setSelectedPurpose(e.target.value)}
															className="border rounded p-1 bg-white text-sm py-0.5 border-gray-400 "
														>
															<option value="">--</option>
															{purposes.map((purpose, idx) => (
																<option key={idx} value={purpose}>
																	{purpose}
																</option>
															))}
														</select>
													</div>
												</div>{' '}
											</div>{' '}
											<div className="flex items-center justify-between mb-4">
												<div className="flex items-center">
													<label htmlFor="global-matrix" className="text-sm font-medium mr-2">
														Nền mẫu cho tất cả:
													</label>
													<div className="relative inline-block">
														<input
															type="text"
															id="global-matrix"
															placeholder="Nhập nền mẫu"
															className="border p-1 rounded bg-white w-60"
															onChange={(e) => {
																const newValue = e.target.value;
																handleGlobalMatrixChange(newValue);
																// Show matrix suggestions when typing
																setMatrixInput(newValue);
																setMatrixPage(1); // Reset to first page when typing
																setShowMatrixDropdown(newValue.length >= 2); // Show dropdown once at least 2 chars entered
																setCurrentEditingMatrixIndex(null); // Not editing a specific sample matrix
															}}
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	setShowMatrixDropdown(false);
																	applyGlobalMatrix(e.target.value);
																}
															}}
															onBlur={(e) => {
																setTimeout(() => {
																	setShowMatrixDropdown(false);
																	applyGlobalMatrix(e.target.value);
																}, 200);
															}}
														/>
														{showMatrixDropdown &&
															currentEditingMatrixIndex === null &&
															getPaginatedMatrices(matrixInput).length > 0 &&
															createPortal(
																<div
																	className="absolute bg-white border rounded shadow-lg z-[9999]"
																	style={{
																		width: '300px',
																		top:
																			document.getElementById('global-matrix').getBoundingClientRect().bottom +
																			window.scrollY,
																		left:
																			document.getElementById('global-matrix').getBoundingClientRect().left +
																			window.scrollX,
																	}}
																>
																	{getPaginatedMatrices(matrixInput).map((matrix, idx) => (
																		<div
																			key={idx}
																			className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																			onClick={() => {
																				// First update the matrix input state
																				setMatrixInput(matrix);

																				// Update all samples with the new matrix
																				handleGlobalMatrixChange(matrix);

																				// Also update the input field directly
																				const globalMatrixInput = document.getElementById('global-matrix');
																				if (globalMatrixInput) {
																					globalMatrixInput.value = matrix;
																				}

																				// Apply matrix and update analyses after a small delay to ensure state is updated
																				setTimeout(() => {
																					applyGlobalMatrix(matrix);
																				}, 100);

																				// Hide dropdown
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
																				disabled={
																					matrixPage >= Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)
																				}
																			>
																				Next
																			</button>
																		</div>
																	)}
																</div>,
																document.body,
															)}
													</div>
												</div>

												<div className="flex items-center">
													<label htmlFor="deadline" className="text-sm font-medium mr-2">
														Hạn trả kết quả:
													</label>
													<input
														type="date"
														id="deadline"
														value={deadline ? new Date(deadline).toISOString().split('T')[0] : ''}
														onChange={(e) => handleDeadlineChange(e.target.value)}
														className="border p-1 rounded bg-white"
														required
													/>
												</div>
											</div>
											<div className="overflow-y-auto max-h-fit pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mb-10">
												{crmData.samples.map((sample, index) => (
													<div key={index} className="mb-4 p-2 border rounded w-full">
														<div className="flex justify-between items-center">
															{editingField.type === 'sample' && editingField.index === index ? (
																<div className="flex-1 mr-2">
																	<input
																		type="text"
																		value={editValue}
																		onChange={handleEditChange}
																		onKeyDown={handleKeyDown}
																		onBlur={saveEdit}
																		autoFocus
																		className="w-full border p-1 rounded bg-white font-medium text-lg"
																	/>
																</div>
															) : (
																<h2
																	className="font-medium text-start text-lg cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded"
																	onClick={() => startEditing('sample', 'sample_name', sample.sample_name, index)}
																	title="Nhấn để chỉnh sửa tên mẫu"
																>
																	{sample.sample_name}
																</h2>
															)}
															<button
																onClick={() => handleDeleteSample(index)}
																className="text-red-500 hover:border hover:border-red-500 rounded-full w-5 h-5 flex items-center justify-center"
																title="Xóa mẫu"
															>
																✕
															</button>
														</div>
														<div className="mb-2 flex items-center justify-between">
															<div className="relative">
																<label htmlFor={`matrix-${index}`} className="text-sm font-medium w-20 mr-2">
																	Nền mẫu:
																</label>
																<div className="relative inline-block">
																	<input
																		type="text"
																		id={`matrix-${index}`}
																		value={sample.matrix || ''}
																		onChange={(e) => {
																			const newValue = e.target.value;
																			handleMatrixChange(index, newValue);
																			// Show matrix suggestions when typing
																			setMatrixInput(newValue);
																			setMatrixPage(1); // Reset to first page when typing
																			setShowMatrixDropdown(newValue.length >= 2); // Show dropdown once at least 2 chars entered
																			setCurrentEditingMatrixIndex(index); // Track which matrix field is being edited
																		}}
																		onBlur={() => {
																			setTimeout(() => {
																				if (!showMatrixDropdown && !skipBlurRef.current) {
																					handleMatrixComplete(index);
																				}
																				setShowMatrixDropdown(false);
																			}, 200);
																		}}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter') {
																				setShowMatrixDropdown(false);
																				handleMatrixComplete(index);
																			}
																		}}
																		className="border p-1 rounded bg-white w-60"
																	/>
																	{showMatrixDropdown &&
																		currentEditingMatrixIndex === index &&
																		getPaginatedMatrices(matrixInput).length > 0 &&
																		createPortal(
																			<div
																				className="absolute bg-white border rounded shadow-lg z-[9999]"
																				style={{
																					width: '300px',
																					top:
																						document.getElementById(`matrix-${index}`).getBoundingClientRect().bottom +
																						window.scrollY,
																					left:
																						document.getElementById(`matrix-${index}`).getBoundingClientRect().left +
																						window.scrollX,
																				}}
																			>
																				{getPaginatedMatrices(matrixInput).map((matrix, matrixIndex) => (
																					<div
																						key={matrixIndex}
																						className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																						onClick={() => {
																							// mirror global matrix apply behavior
																							skipBlurRef.current = true; // prevent blur-based API
																							setTimeout(() => {
																								skipBlurRef.current = false;
																							}, 300);
																							setMatrixInput(matrix);
																							handleMatrixChange(index, matrix);
																							const inputField = document.getElementById(`matrix-${index}`);
																							if (inputField) inputField.value = matrix;
																							setTimeout(() => handleMatrixComplete(index, matrix), 100);
																							setShowMatrixDropdown(false);
																							setCurrentEditingMatrixIndex(null);
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
																							{matrixPage}/
																							{Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)}
																						</span>
																						<button
																							className="px-2 py-1 border rounded disabled:opacity-50"
																							onClick={() => handleMatrixPageChange(matrixPage + 1)}
																							disabled={
																								matrixPage >=
																								Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)
																							}
																						>
																							Next
																						</button>
																					</div>
																				)}
																			</div>,
																			document.body,
																		)}
																</div>
															</div>
															<div className="flex items-center my-1">
																<input
																	type="checkbox"
																	id={`urgent-${index}`}
																	checked={urgentSamples[index] || false}
																	onChange={(e) => handleUrgentChange(index, e.target.checked)}
																	className="mr-2"
																/>
																<label htmlFor={`urgent-${index}`} className="text-sm font-medium">
																	Mẫu khẩn
																</label>
															</div>{' '}
														</div>{' '}
														{/* Sample Information Section - Moved above analysis table */}
														{(customerInfo[index]?.length > 0 || !defaultSampleInformation) && (
															<div className="mb-4 border-t pt-4">
																<div className="border py-2 mt-2 rounded-lg">
																	{/* Customer Information Section */}
																	<div className="w-full">
																		<div className="flex justify-between items-center px-4 mb-2">
																			<h5 className="font-medium text-sm">Thông tin khách hàng cung cấp</h5>
																			<button
																				className="bg-white text-sky-500 rounded-full p-1"
																				onClick={() => handleAddCustomerField(index)}
																				title="Thêm thông tin khách hàng"
																			>
																				<AiOutlinePlus size={16} />
																			</button>
																		</div>
																		<div className="w-full overflow-hidden hover:overflow-auto mb-1">
																			<div className="flex flex-wrap">
																				{(
																					customerInfo[index] ||
																					(!defaultSampleInformation
																						? defaultCustomerFields.map((field) => ({
																								...field,
																								fvalue:
																									field.fname === 'Tên mẫu thử / name.'
																										? sample.sample_name || ''
																										: field.fvalue,
																						  }))
																						: [])
																				).map((field, fieldIndex) => (
																					<div key={fieldIndex} className="mb-1 w-full px-2">
																						<table className="w-full">
																							<tbody>
																								<tr>
																									<td className="w-1/3 text-start p-1 font-medium min-w-32 flex justify-between items-center">
																										{' '}
																										<select
																											value={
																												defaultCustomerFields.some(
																													(item) => item.fname === field?.fname,
																												)
																													? field.fname
																													: field?.other
																													? 'Khác'
																													: field?.fname || ''
																											}
																											onChange={(e) =>
																												handleCustomerFieldChange(
																													index,
																													fieldIndex,
																													'fname',
																													e.target.value,
																												)
																											}
																											className={`p-1 ${
																												field.fname === 'Khác' ||
																												(field?.other &&
																													!defaultCustomerFields.some(
																														(item) => item.fname === field?.fname,
																													))
																													? 'w-1/2 mr-1'
																													: 'w-full'
																											} border min-w-16 rounded-md bg-white text-xs`}
																										>
																											<option value="">Chọn thông tin</option>
																											{defaultCustomerFields.map((selectField) => (
																												<option key={selectField.fname} value={selectField.fname}>
																													{selectField.fname}
																												</option>
																											))}
																											<option value="Khác">Khác</option>
																										</select>
																										{(field.fname === 'Khác' ||
																											(field?.other &&
																												!defaultCustomerFields.some(
																													(item) => item.fname === field?.fname,
																												))) && (
																											<input
																												type="text"
																												value={field?.other || ''}
																												onChange={(e) =>
																													handleCustomerFieldChange(
																														index,
																														fieldIndex,
																														'other',
																														e.target.value,
																													)
																												}
																												className="p-1 w-full border rounded-md bg-white text-xs"
																												placeholder="Nhập tên khác"
																											/>
																										)}
																									</td>
																									<td className="w-full text-start p-1">
																										<input
																											type="text"
																											value={field?.fvalue || ''}
																											onChange={(e) =>
																												handleCustomerFieldChange(
																													index,
																													fieldIndex,
																													'fvalue',
																													e.target.value,
																												)
																											}
																											className="p-1 w-full border rounded-md bg-white text-xs"
																										/>
																									</td>
																									<td>
																										<button
																											className="text-red-200 hover:text-red-500 bg-white text-sm rounded-lg py-0 px-1 focus:outline-none"
																											onClick={() => handleDeleteCustomerField(index, fieldIndex)}
																										>
																											✕
																										</button>
																									</td>
																								</tr>
																							</tbody>
																						</table>
																					</div>
																				))}
																			</div>
																		</div>
																	</div>
																</div>
															</div>
														)}
														<div className="overflow-x-auto">
															<table className="w-full">
																<thead>
																	<tr className="border-b-2 text-gray-500">
																		<th className="p-1 text-start">Mã</th>
																		<th className="p-1 text-start">Chỉ tiêu</th>
																		<th className="p-1 text-start">Nguồn</th>
																		<th className="p-1 text-start">Mã Phương pháp</th>
																		<th className="p-1 text-start">Lĩnh vực</th>
																		<th className="p-1 text-start w-10">Xóa</th>
																	</tr>
																</thead>
																<tbody>
																	{sample.analysis.map((item, idx) => (
																		<tr key={idx} className="border-b">
																			<td className="p-1 text-start">{item.parameter_uid}</td>
																			<td className="p-1 text-start">{item.parameter_name}</td>{' '}
																			<td className="p-1 text-start w-28">
																				{editingAnalysis.sampleIndex === index &&
																				editingAnalysis.analysisIndex === idx &&
																				editingAnalysis.field === 'protocol_source' ? (
																					<select
																						value={editAnalysisValue}
																						onChange={handleAnalysisEditChange}
																						onBlur={saveAnalysisEdit}
																						autoFocus
																						className="w-24 border p-0.5 rounded bg-white"
																					>
																						{sourceOptions.map((option, i) => (
																							<option key={i} value={option === '--' ? '' : option}>
																								{option}
																							</option>
																						))}
																					</select>
																				) : (
																					<span
																						className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full"
																						onClick={() =>
																							startEditingAnalysis(index, idx, 'protocol_source', item.protocol_source)
																						}
																						title="Nhấn để chỉnh sửa"
																					>
																						{item.protocol_source || '--'}
																					</span>
																				)}
																			</td>
																			<td className="p-1 text-start">
																				{editingAnalysis.sampleIndex === index &&
																				editingAnalysis.analysisIndex === idx &&
																				editingAnalysis.field === 'protocol_code' ? (
																					<input
																						type="text"
																						value={editAnalysisValue}
																						onChange={handleAnalysisEditChange}
																						onKeyDown={handleAnalysisKeyDown}
																						onBlur={saveAnalysisEdit}
																						autoFocus
																						className="w-full border p-1 rounded bg-white"
																					/>
																				) : (
																					<span
																						className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full"
																						onClick={() =>
																							startEditingAnalysis(index, idx, 'protocol_code', item.protocol_code)
																						}
																						title="Nhấn để chỉnh sửa"
																					>
																						{item.protocol_code || '--'}
																					</span>
																				)}
																				{/* Add the EX info fields if protocol_source is EX */}
																				{item.protocol_source === 'EX' && (
																					<>
																						<div className="mt-1">
																							{editingAnalysis.sampleIndex === index &&
																							editingAnalysis.analysisIndex === idx &&
																							editingAnalysis.field === 'ex_name' ? (
																								<input
																									type="text"
																									value={editAnalysisValue}
																									onChange={handleAnalysisEditChange}
																									onKeyDown={handleAnalysisKeyDown}
																									onBlur={saveAnalysisEdit}
																									autoFocus
																									className="w-full border p-1 rounded bg-white"
																									placeholder="Tên thầu phụ"
																								/>
																							) : (
																								<span
																									className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full text-sm"
																									onClick={() =>
																										startEditingAnalysis(index, idx, 'ex_name', item.ex_info?.ex_name)
																									}
																									title="Nhấn để chỉnh sửa tên thầu phụ"
																								>
																									{item.ex_info?.ex_name || 'Thầu phụ...'}
																								</span>
																							)}
																						</div>
																						<div className="mt-1">
																							{editingAnalysis.sampleIndex === index &&
																							editingAnalysis.analysisIndex === idx &&
																							editingAnalysis.field === 'send_at' ? (
																								<input
																									type="date"
																									value={
																										editAnalysisValue
																											? new Date(editAnalysisValue).toISOString().split('T')[0]
																											: ''
																									}
																									onChange={handleAnalysisEditChange}
																									onKeyDown={handleAnalysisKeyDown}
																									onBlur={saveAnalysisEdit}
																									autoFocus
																									className="w-full border p-1 rounded bg-white"
																								/>
																							) : (
																								<span
																									className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full text-sm"
																									onClick={() =>
																										startEditingAnalysis(index, idx, 'send_at', item.ex_info?.send_at)
																									}
																									title="Nhấn để chọn ngày gửi mẫu"
																								>
																									{item.ex_info?.send_at
																										? new Date(item.ex_info.send_at).toLocaleDateString('vi-VN')
																										: 'Ngày gửi mẫu...'}
																								</span>
																							)}
																						</div>
																					</>
																				)}
																			</td>
																			<td className="p-1 text-start w-24">
																				{editingAnalysis.sampleIndex === index &&
																				editingAnalysis.analysisIndex === idx &&
																				editingAnalysis.field === 'field' ? (
																					<select
																						value={editAnalysisValue}
																						onChange={handleAnalysisEditChange}
																						onBlur={saveAnalysisEdit}
																						autoFocus
																						className="max-w-20 border p-0.5 rounded bg-white"
																					>
																						{fieldOptions.map((option, i) => (
																							<option key={i} value={option === '--' ? '' : option}>
																								{option}
																							</option>
																						))}
																					</select>
																				) : (
																					<span
																						className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full"
																						onClick={() => startEditingAnalysis(index, idx, 'field', item.field)}
																						title="Nhấn để chỉnh sửa"
																					>
																						{item.field || '--'}
																					</span>
																				)}
																			</td>
																			<td className="p-1 text-center">
																				<button
																					onClick={() => handleDeleteAnalysis(index, idx)}
																					className="text-red-500 hover:border hover:border-red-500 rounded-full w-5 h-5 flex items-center justify-center mx-auto"
																					title="Xóa chỉ tiêu"
																				>
																					✕
																				</button>
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>{' '}
														</div>
														<div className="mt-2 flex justify-end">
															<button
																onClick={() => handleOpenAddParameter(index)}
																className="border border-primary text-primary text-sm rounded-lg p-1 flex items-center"
																title="Thêm chỉ tiêu"
															>
																<MdLibraryAdd size={16} className="mr-1" /> Thêm chỉ tiêu
															</button>
														</div>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							)}
						</div>{' '}
						{/* Close button (X) at top right */}
						<button
							onClick={closeModal}
							className="absolute top-2 right-2 w-8 h-8 border border-red-500 rounded-lg  flex items-center justify-center bg-white text-red-500 hover:bg-gray-100 hover:border-red-700 "
							title="Đóng"
							disabled={isCreating}
						>
							✕
						</button>{' '}
						{/* Action buttons at bottom */}
						<div className="flex justify-between mt-4 gap-3 absolute bottom-6 left-6 right-6">
							{crmData && (
								<>
									{' '}
									{/* Left side buttons */}
									<div className="flex gap-3 items-center">
										<button
											onClick={handleTestSave}
											disabled={isCreating}
											className="bg-gray-500 border border-gray-500 text-white font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-gray-600 hover:border-gray-600 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed"
										>
											Lưu phiếu
										</button>
										<button
											onClick={handleCreatePartnerLink}
											disabled={isCreatingLink || isCreating}
											className="bg-orange-500 border border-orange-500 text-white font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-orange-600 hover:border-orange-600 disabled:bg-orange-300 disabled:border-orange-300 disabled:cursor-not-allowed"
										>
											{isCreatingLink ? 'Đang tạo link...' : 'Tạo link điền phiếu'}
										</button>
										{partnerLink && (
											<div className="flex items-center gap-2">
												<span className="text-sm text-gray-600">Link:</span>
												<button
													onClick={handleCopyLink}
													className="bg-green-500 text-white text-sm rounded-md py-1 px-3 cursor-pointer hover:bg-green-600 flex items-center gap-1"
													title="Click để sao chép link"
												>
													<span className="max-w-xs truncate">{partnerLink}</span>
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
														/>
													</svg>
												</button>
											</div>
										)}
									</div>
									{/* Right side buttons */}
									<div className="flex gap-3">
										<button
											onClick={handleCreateRequestForm}
											disabled={isCreating}
											className="bg-primary text-white font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
										>
											Tạo phiếu gửi mẫu
										</button>
										<button
											onClick={handleCreateReceipt}
											disabled={isCreating}
											className="bg-primary text-white font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
										>
											{isCreating ? 'Đang tạo...' : 'Tạo tiếp nhận mẫu'}
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			)}
			{/* Add the parameter selection modal */}
			{isAddingParameter && currentSampleIndex !== null && renderAddParameterModal()}
		</>
	);
};

export default CreateReceiptFromCRM;
