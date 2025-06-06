import * as React from 'react';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
const { useContext, useState, useEffect } = React;
import FilterBar from './FilterBar';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import { RiEdit2Line } from 'react-icons/ri';
import { GiConfirmed, GiCancel, GiTrashCan, GiSave } from 'react-icons/gi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaUpload, FaEye, FaDownload } from 'react-icons/fa'; // Added for file upload icon
import { FaPlus, FaTrash } from 'react-icons/fa';
import { is } from 'date-fns/locale';

// Utility function to clean objects before API calls
const cleanObject = (obj) => {
	if (!obj || typeof obj !== 'object') return obj;

	const cleanedObj = { ...obj };

	Object.keys(cleanedObj).forEach((key) => {
		const value = cleanedObj[key];

		// Check for empty strings, null, undefined
		if (value === '' || value === null || value === undefined) {
			delete cleanedObj[key];
		} else if (Array.isArray(value) && value.length === 0) {
			// Remove empty arrays
			delete cleanedObj[key];
		} else if (typeof value === 'object' && !Array.isArray(value)) {
			// Recursively clean nested objects
			const cleaned = cleanObject(value);
			if (Object.keys(cleaned).length === 0) {
				delete cleanedObj[key];
			} else {
				cleanedObj[key] = cleaned;
			}
		}
	});

	return cleanedObj;
};

const ProtocolInfor = () => {
	const { setCurrentTitlePage, currentUser, technicians } = useContext(GlobalContext);
	const [protocols, setProtocols] = useState([]);
	const [source, setSource] = useState([]);
	const [editingRow, setEditingRow] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [instance, setInstance] = useState(null);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [editTool, setEditTool] = useState(true); // Changed to true by default to show edit/delete buttons
	const [sourceOptions, setSourceOptions] = useState(['IRDOP', 'IRDOP VS', 'EX']);
	const [equipmentOptions, setEquipmentOptions] = useState([]);
	const [newProtocol, setNewProtocol] = useState({
		protocol_name: '',
		protocol_code: '',
		protocol_description: '',
		protocol_content: '',
		protocol_source: 'IRDOP',
		equipment: [],
		protocol_file_id: '',
		report_file_id: '',
	});
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const protocolsPerPage = 20;
	const [isEditing, setIsEditing] = useState(false);
	const [hoveredProtocolId, setHoveredProtocolId] = useState(null);
	const [fileUploading, setFileUploading] = useState({ type: null, id: null }); // To track which file is being uploaded
	const [pendingFiles, setPendingFiles] = useState({}); // Store temporarily uploaded files
	const [receivedData, setReceivedData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	let isFetch = false;

	const technician = (param) => {
		const iden = technicians.find((identity) => identity.identity_uid === param.technician_uid);
		const ktv = iden ? iden.identity_name + ' (' + iden.alias + ')' : null;
		return ktv;
	};

	const handlePageChange = (pageNumber) => {
		setCurrentPage(pageNumber);
	};

	const totalPages = Math.ceil(protocols.length / protocolsPerPage);
	const paginatedProtocols = protocols.slice((currentPage - 1) * protocolsPerPage, currentPage * protocolsPerPage);

	/** Note: Page */
	const renderPageNumbers = () => {
		const pageNumbers = [];
		const maxPagesToShow = 5;
		let startPage = Math.max(1, currentPage - 2);
		let endPage = Math.min(totalPages, currentPage + 2);

		if (currentPage <= 3) {
			endPage = Math.min(5, totalPages);
		} else if (currentPage + 2 >= totalPages) {
			startPage = Math.max(1, totalPages - 4);
		}

		for (let i = startPage; i <= endPage; i++) {
			pageNumbers.push(
				<button
					key={i}
					className={`px-2 py-1 border rounded ${i === currentPage ? 'bg-blue-500 text-white' : ''}`}
					onClick={() => handlePageChange(i)}
				>
					{i}
				</button>,
			);
		}

		return (
			<div className="flex space-x-1">
				{currentPage > 3 && (
					<>
						<button className="px-2 py-1 border rounded" onClick={() => handlePageChange(1)}>
							First
						</button>
						<span>...</span>
					</>
				)}
				{pageNumbers}
				{currentPage + 2 < totalPages && (
					<>
						<span>...</span>
						<button className="px-2 py-1 border rounded" onClick={() => handlePageChange(totalPages)}>
							Last
						</button>
					</>
				)}
			</div>
		);
	};

	useEffect(() => {
		setCurrentTitlePage('Phương pháp');
	}, [setCurrentTitlePage]);

	useEffect(() => {
		fetchSourceOptions();
		fetchEquipmentOptions();
	}, []);

	useEffect(() => {
		if (technicians.length > 0 && !isFetch) {
			isFetch = true;
			console.log(isFetch);
			fetchProtocols();
		}
	}, [technicians]);

	const fetchSourceOptions = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/get/list_enum/protocol_source');
			if (response.data && Array.isArray(response.data)) {
				// Add "--Chọn--" as first option in the source dropdown and trim whitespace
				const trimmedOptions = response.data.map((option) => option.trim());
				setSourceOptions(['--Chọn--', ...trimmedOptions]);
			}
		} catch (error) {
			console.error('Error fetching source options:', error);
		}
	};

	const fetchEquipmentOptions = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/get/list_enum/equipment');
			if (response.data && Array.isArray(response.data)) {
				// Add "--Chọn--" as first option in the equipment dropdown
				setEquipmentOptions(['--Chọn--', ...response.data]);
			}
		} catch (error) {
			console.error('Error fetching equipment options:', error);
		}
	};
	const fetchProtocols = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/el9k24zah/db/get/protocol');
			const data = response.data.map((protocol) => {
				// Process equipment if it exists
				let equipment = [];
				if (protocol.equipment) {
					try {
						if (typeof protocol.equipment === 'string') {
							// Try to parse string as JSON
							const parsedEquipment = JSON.parse(protocol.equipment);
							// If it's already an array, use it directly
							if (Array.isArray(parsedEquipment)) {
								// Handle both formats - objects with name property or plain strings
								equipment = parsedEquipment.map((eq) => {
									if (typeof eq === 'object' && eq.name) {
										return eq.name; // Extract just the name
									}
									return eq; // Already a string
								});
							}
						} else if (Array.isArray(protocol.equipment)) {
							// Convert all elements to strings
							equipment = protocol.equipment.map((eq) => {
								if (typeof eq === 'object' && eq.name) {
									return eq.name; // Extract just the name
								}
								return eq; // Already a string
							});
						}
					} catch (e) {
						console.error('Error parsing equipment:', e);
					}
				}

				return {
					...protocol,
					protocol_source: protocol.protocol_source || '',
					equipment: equipment || [],
					protocol_file_id: protocol.protocol_file_id || '',
					report_file_id: protocol.report_file_id || '',
					parameters: protocol.parameters || [],
				};
			});
			console.log(data);
			setProtocols(data);
			setSource(data);
		} catch (error) {
			console.error('Error fetching protocols:', error);
		}
	};

	const formatDate = (dateString) => {
		const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
		return new Date(dateString).toLocaleDateString('en-GB', options);
	};

	/** Note: Handle */ const handleSaveClick = async (id) => {
		const updatedProtocol = protocols.find((protocol) => protocol.id === id);

		// Trim protocol_source to remove extra whitespace
		if (updatedProtocol.protocol_source) {
			updatedProtocol.protocol_source = updatedProtocol.protocol_source.trim();
		}

		// Check for pending file uploads and complete them
		const protocolKey = `${id}_protocol`;
		const reportKey = `${id}_report`;
		try {
			// Complete pending protocol file upload if exists
			if (pendingFiles[protocolKey]) {
				const uploadCompletePayload = {
					fileInfo: pendingFiles[protocolKey].fileInfo,
					...pendingFiles[protocolKey].uploadInfo,
					fileCategory: ['Protocol'],
				};

				const completeResponse = await apiPost(
					'https://red.irdop.org/v1/file/uplink/upload_complete',
					uploadCompletePayload,
				);
				if (completeResponse.status === 200) {
					updatedProtocol.protocol_file_id = {
						objectName: completeResponse.data.objectName,
						fileName: completeResponse.data.fileInfo.fileName,
					};
				}

				// Remove from pending files
				const newPendingFiles = { ...pendingFiles };
				delete newPendingFiles[protocolKey];
				setPendingFiles(newPendingFiles);
			}

			// Complete pending report file upload if exists
			if (pendingFiles[reportKey]) {
				const uploadCompletePayload = {
					fileInfo: pendingFiles[reportKey].fileInfo,
					...pendingFiles[reportKey].uploadInfo,
					fileCategory: ['MinutesTemplate'],
				};

				const completeResponse = await apiPost(
					'https://red.irdop.org/v1/file/uplink/upload_complete',
					uploadCompletePayload,
				);

				if (completeResponse.status === 200) {
					updatedProtocol.report_file_id = {
						objectName: completeResponse.data.objectName,
						fileName: completeResponse.data.fileInfo.fileName,
					};
				}

				// Remove from pending files
				const newPendingFiles = { ...pendingFiles };
				delete newPendingFiles[reportKey];
				setPendingFiles(newPendingFiles);
			}

			const cleanedProtocol = cleanObject(updatedProtocol);
			const response = await apiPost('https://black.irdop.org/el9k24zah/db/update/protocol', {
				protocol: cleanedProtocol,
			});
			setEditingRow(null);
			if (response.status === 200) {
				toast.success('Protocol updated successfully');
			} else {
				toast.error('Protocol update failed');
			}
			fetchProtocols();
		} catch (error) {
			console.error('Error saving protocol:', error);
		}
	};
	const handleSaveParameterClick = async (protocolId, paramIndex) => {
		const updatedProtocol = protocols.find((protocol) => protocol.id === protocolId);
		const updatedParameter = { ...updatedProtocol.parameters[paramIndex] };

		if (Number.isNaN(parseInt(updatedParameter.tat_expected))) {
			delete updatedParameter.tat_expected;
		} else {
			const days = parseInt(updatedParameter?.tat_expected?.split(' ')[0]);
			updatedParameter.tat_expected = `${days} ${days > 1 ? 'days' : 'day'}`;
		}
		try {
			const cleanedParameter = cleanObject(updatedParameter);
			const response = cleanedParameter.id
				? await apiPost('https://black.irdop.org/ha8i0uw2/db/update/parameter', { parameter: cleanedParameter })
				: await apiPost('https://black.irdop.org/ha8i0uw2/db/insert/bulk/parameter', {
						parameters: [cleanedParameter],
				  });
			if (response.status === 200) {
				toast.success('Parameter saved successfully');
			} else {
				toast.error('Parameter save failed');
			}
		} catch (error) {
			console.error('Error saving parameter:', error);
		}
	};

	const handleParameterInputChange = (protocolId, paramIndex, field, value) => {
		const updatedProtocols = protocols.map((protocol) => {
			if (protocol.id === protocolId) {
				const updatedParameters = protocol.parameters.map((param, j) => {
					if (j === paramIndex) {
						return { ...param, [field]: value };
					}
					return param;
				});
				return { ...protocol, parameters: updatedParameters };
			}
			return protocol;
		});
		setProtocols(updatedProtocols);
		setTechnicianDropdownVisible(null); // Close dropdown after selection
	};

	const handleCancelClick = () => {
		setEditingRow(null);
		fetchProtocols();
	};

	const handleDeleteClick = async (id) => {
		const protocol = protocols.find((protocol) => protocol.id === id);
		const confirmed = window.confirm(`Bạn chắc chắn muốn xóa phương pháp: ${protocol.protocol_name}?`);
		if (confirmed) {
			try {
				const response = await apiPost('https://black.irdop.org/el9k24zah/db/delete/protocol', { id: protocol.id });
				console.log(response);
				if (response.status === 200 && response.data) {
					toast.success('Protocol deleted successfully');
					setProtocols(protocols.filter((protocol) => protocol.id !== id));
				} else {
					toast.error('Protocol deletion failed');
				}
			} catch (error) {
				console.error('Error deleting protocol:', error);
			}
		}
	};

	const handleInputChange = (id, field, value) => {
		const updatedProtocols = protocols.map((protocol) => {
			if (protocol.id === id) {
				return { ...protocol, [field]: value };
			}
			return protocol;
		});
		setProtocols(updatedProtocols);
	};
	const handleEquipmentChange = (id, index, selectedEquipment) => {
		const updatedProtocols = protocols.map((protocol) => {
			if (protocol.id === id) {
				const updatedEquipment = [...(protocol.equipment || [])];

				if (selectedEquipment) {
					// Store as plain string, not object
					// If equipment already exists at this index, replace it
					if (index < updatedEquipment.length) {
						updatedEquipment[index] = selectedEquipment;
					} else {
						// Otherwise add the new equipment
						updatedEquipment.push(selectedEquipment);
					}
				} else {
					// If empty selection and not the last equipment, remove this entry
					if (index < updatedEquipment.length) {
						updatedEquipment.splice(index, 1);
					}
				}

				return { ...protocol, equipment: updatedEquipment };
			}
			return protocol;
		});
		setProtocols(updatedProtocols);
	};

	const handleAddEquipment = (id) => {
		const updatedProtocols = protocols.map((protocol) => {
			if (protocol.id === id) {
				return { ...protocol, equipment: [...(protocol.equipment || []), ''] };
			}
			return protocol;
		});
		setProtocols(updatedProtocols);
	};

	const handleRemoveEquipment = (id, index) => {
		const updatedProtocols = protocols.map((protocol) => {
			if (protocol.id === id) {
				const updatedEquipment = [...(protocol.equipment || [])];
				updatedEquipment.splice(index, 1);
				return { ...protocol, equipment: updatedEquipment };
			}
			return protocol;
		});
		setProtocols(updatedProtocols);
	};

	const handleFileChange = (event) => {
		const newFiles = Array.from(event.target.files);
		const validExtensions = ['doc', 'docx', 'pdf', 'csv', 'xls', 'xlsx'];
		const invalidFiles = newFiles.filter((file) => !validExtensions.includes(file.name.split('.').pop().toLowerCase()));

		if (invalidFiles.length > 0) {
			alert('Chỉ chấp nhận các file có định dạng DOC, DOCX, PDF, hoặc EXCEL.');
		} else {
			setFiles((prevFiles) => [...prevFiles, ...newFiles]);
		}
	};
	const setContent = async (protocol_id, instance) => {
		const content = await apiPost('https://black.irdop.org/db/set_content/protocol', {
			file_id: instance,
			protocol_id: protocol_id,
		});
		if (content.status === 200) {
			toast.success('Data confirmed successfully');
		}
		setInstance(null);
	};

	const handleFileDelete = (fileName) => {
		setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
	};

	const handleConfirmUpload = async () => {
		// Kiểm tra nếu không có file nào được chọn
		if (!files || files.length === 0) {
			console.error('No files selected');
			return;
		}

		setIsLoading(true);

		try {
			let lisMes = [];

			// Tạo hàm đọc file sử dụng FileReader
			const readFile = (file) => {
				return new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve(reader.result); // Trả về buffer của file
					reader.onerror = reject; // Bắt lỗi
					reader.readAsArrayBuffer(file); // Đọc file dưới dạng ArrayBuffer
				});
			};

			// Duyệt qua từng file và đọc buffer
			for (const file of files) {
				const fileBuffer = await readFile(file); // Lấy buffer của file
				const fileBase64 = btoa(
					new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
				);
				const media = {
					file_name: file.name,
					file_mime: file.type,
					file_buffer: fileBase64, // ArrayBuffer của file
				};
				lisMes.push({ media: media });
			}

			// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

			// for (const [index, message] of lisMes.entries()) {
			// 	try {
			// 		await delay(index * 3000); // Delay 6s giữa mỗi lần gửi

			// 		const response = axios.post(
			// 			'https://black.irdop.org/bulk/protocol',
			// 			{ messages: [message] },
			// 			{
			// 				headers: {
			// 					'Content-Type': 'application/json',
			// 				},
			// 			}
			// 		);

			// 		console.log(`Message ${index + 1} sent successfully:`, response.data);
			// 	} catch (error) {
			// 		console.error(`Error sending message ${index + 1}:`, error.message);
			// 	}
			// 	toast.success(`Data ${index + 1} inserted successfully`);
			// }
			// setIsLoading(false);

			// Gửi dữ liệu tới API sử dụng axios
			const response = await apiPost('https://black.irdop.org/generate_protocol', { messages: lisMes });

			// Kiểm tra định dạng của dữ liệu trả về
			if (!response.data) {
				throw new Error('Invalid response format');
			}

			setInstance(response.data.file_id);

			// Bổ sung thuộc tính accreditation và tat_expected cho mỗi parameter
			const updatedData = {
				...response.data.protocolRecord,
				parameters: response.data.protocolRecord.parameters.map((param) => ({
					...param,
					accreditation: '', // Giá trị mặc định
					tat_expected: null, // Giá trị mặc định
				})),
			};

			setReceivedData(updatedData);
		} catch (error) {
			console.error('Error during upload:', error.message);
			alert('Error during upload: ' + error.message);
			setIsLoading(false);
		}
	};

	const handleCancelUpload = () => {
		setFiles([]);
		setIsUploadBoxVisible(false);
		setReceivedData(null);
		setIsLoading(false);
	};
	const handleConfirmReceivedData = async () => {
		if (!receivedData) {
			toast.error('No data received');
			return;
		}
		const protocol = { ...receivedData };
		let parameters = [...receivedData.parameters];
		delete protocol.parameters;
		// Handle the confirmation of received data
		try {
			const cleanedProtocol = cleanObject(protocol);
			const protocolResponse = await apiPost('https://black.irdop.org/el9k24zah/db/insert/protocol', {
				protocol: cleanedProtocol,
			});

			const updatedParameters = parameters.map((param) => ({
				...param,
				protocol_id: protocolResponse.data.id,
				protocol_code: receivedData.protocol_code,
				matrix: param.matrix === 'Khác' ? customMatrix[param.parameter_name] : param.matrix,
			}));
			parameters = updatedParameters.map((param) => cleanObject(param));
			const parameterResponse = await apiPost('https://black.irdop.org/ha8i0uw2/db/insert/bulk/parameter', {
				parameters: parameters,
			});

			const response = await apiGet('https://black.irdop.org/el9k24zah/db/get/protocol');
			const data = response.data;
			setProtocols(data);

			setContent(protocolResponse.data.id, instance);

			setReceivedData(null);
			setIsUploadBoxVisible(false);
			setFiles([]);
			setIsLoading(false);

			if (protocolResponse.status === 200 && parameterResponse.status === 200) {
				toast.success('Thêm mới phương pháp thành công');
			} else {
				toast.error('Thêm mới phương pháp thất bại, vui lòng kiểm tra lại');
			}
		} catch (error) {
			console.error('Error confirming received data:', error);
		}
	};

	const handleAccreditationChange = (index, value) => {
		const updatedParameters = receivedData.parameters.map((param, paramIndex) => {
			if (paramIndex === index) {
				const accreditations = param.accreditation ? param.accreditation.split(', ') : [];
				if (accreditations.includes(value)) {
					return {
						...param,
						accreditation: accreditations.filter((acc) => acc !== value).join(', '),
					};
				} else {
					return {
						...param,
						accreditation: [...accreditations, value].join(', '),
					};
				}
			}
			return param;
		});
		setReceivedData({ ...receivedData, parameters: updatedParameters });
	};

	const handleParameterChange = (index, field, value) => {
		const updatedParameters = receivedData.parameters.map((param, paramIndex) => {
			if (paramIndex === index) {
				return {
					...param,
					[field]: value,
				};
			}
			return param;
		});
		setReceivedData({ ...receivedData, parameters: updatedParameters });
		setTechnicianDropdownVisible(null); // Close dropdown after selection
	};

	const handleAddParameter = () => {
		const newParameter = {
			parameter_name: '',
			matrix: '',
			equipments: '',
			default_unit: '',
			accreditation: '',
			tat_expected: '',
		};
		setReceivedData({ ...receivedData, parameters: [...receivedData.parameters, newParameter] });
	};

	const handleNewProtocolChange = (field, value) => {
		setNewProtocol({ ...newProtocol, [field]: value });
	};
	const handleNewProtocolEquipmentChange = (index, selectedEquipment) => {
		const updatedEquipment = [...(newProtocol.equipment || [])];

		if (selectedEquipment) {
			// Store equipment as string directly
			// If equipment already exists at this index, replace it
			if (index < updatedEquipment.length) {
				updatedEquipment[index] = selectedEquipment;
			} else {
				// Otherwise add the new equipment
				updatedEquipment.push(selectedEquipment);
			}
		} else {
			// If empty selection and not the last equipment, remove this entry
			if (index < updatedEquipment.length) {
				updatedEquipment.splice(index, 1);
			}
		}

		setNewProtocol({ ...newProtocol, equipment: updatedEquipment });
	};

	const handleAddNewEquipment = () => {
		setNewProtocol({ ...newProtocol, equipment: [...(newProtocol.equipment || []), ''] });
	};

	const handleRemoveNewEquipment = (index) => {
		const updatedEquipment = [...(newProtocol.equipment || [])];
		updatedEquipment.splice(index, 1);
		setNewProtocol({ ...newProtocol, equipment: updatedEquipment });
	};
	const handleSaveNewProtocol = async () => {
		if (!newProtocol.protocol_name || !newProtocol.protocol_code) {
			toast.error('Các trường Tên phương pháp, Mã phương pháp là bắt buộc');
			return;
		}
		try {
			// Prepare the protocol object for saving
			let protocolToSave = { ...newProtocol };

			// Complete file uploads if they exist
			if (
				newProtocol.protocol_file_id &&
				typeof newProtocol.protocol_file_id === 'object' &&
				newProtocol.protocol_file_id.uploadInfo
			) {
				const uploadCompletePayload = {
					fileInfo: newProtocol.protocol_file_id.fileInfo,
					...newProtocol.protocol_file_id.uploadInfo,
					fileCategory: ['Protocol'],
				};

				const completeResponse = await apiPost(
					'https://red.irdop.org/v1/file/uplink/upload_complete',
					uploadCompletePayload,
				);
				if (completeResponse.status === 200) {
					protocolToSave.protocol_file_id = {
						objectName: completeResponse.data.objectName,
						fileName: completeResponse.data.fileInfo.fileName,
					};
				}
			}

			if (
				newProtocol.report_file_id &&
				typeof newProtocol.report_file_id === 'object' &&
				newProtocol.report_file_id.uploadInfo
			) {
				const uploadCompletePayload = {
					fileInfo: newProtocol.report_file_id.fileInfo,
					...newProtocol.report_file_id.uploadInfo,
					fileCategory: ['MinutesTemplate'],
				};

				const completeResponse = await apiPost(
					'https://red.irdop.org/v1/file/uplink/upload_complete',
					uploadCompletePayload,
				);

				if (completeResponse.status === 200) {
					protocolToSave.report_file_id = {
						objectName: completeResponse.data.objectName,
						fileName: completeResponse.data.fileInfo.fileName,
					};
				}
			}

			const cleanedProtocol = cleanObject(protocolToSave);
			const response = await apiPost('https://black.irdop.org/el9k24zah/db/insert/protocol', {
				protocol: cleanedProtocol,
			});
			if (response.status === 200) {
				toast.success('New protocol added successfully');
				setProtocols([...protocols, newProtocol]);
				setIsAddingNew(false);
				setNewProtocol({
					protocol_name: '',
					protocol_code: '',
					protocol_description: '',
					protocol_content: '',
					protocol_source: 'IRDOP',
					equipment: [],
					protocol_file_id: '',
					report_file_id: '',
				});
				fetchProtocols();
			} else {
				toast.error('Failed to add new protocol');
			}
		} catch (error) {
			console.error('Error adding new protocol:', error);
			toast.error('Failed to add new protocol');
		}
	};

	const handleAddParameterClick = (protocolId) => {
		const newParameter = {
			parameter_name: '',
			matrix: '',
			technician_uid: '',
			tat_expected: '',
			protocol_id: protocolId,
			protocol_code: protocols.find((protocol) => protocol.id === protocolId).protocol_code,
		};
		const updatedProtocols = protocols.map((protocol) => {
			if (protocol.id === protocolId) {
				return { ...protocol, parameters: [...protocol.parameters, newParameter] };
			}
			return protocol;
		});
		setProtocols(updatedProtocols);
	};

	const toggleTechnicianDropdown = (protocolId, paramIndex) => {
		setTechnicianDropdownVisible((prevState) => {
			if (prevState && prevState.protocolId === protocolId && prevState.paramIndex === paramIndex) {
				return null;
			}
			return { protocolId, paramIndex };
		});
	};

	const handleDeleteParameterClick = async (protocolId, paramIndex) => {
		const protocol = protocols.find((protocol) => protocol.id === protocolId);
		const parameter = protocol.parameters[paramIndex];
		const confirmed = window.confirm(`Bạn chắc chắn muốn xóa chỉ tiêu: ${parameter.parameter_name}?`);
		if (confirmed) {
			try {
				const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/delete/parameter', { id: parameter.id });
				if (response.status === 200 && response.data) {
					toast.success('Parameter deleted successfully');
					const updatedProtocols = protocols.map((protocol) => {
						if (protocol.id === protocolId) {
							const updatedParameters = protocol.parameters.filter((_, index) => index !== paramIndex);
							return { ...protocol, parameters: updatedParameters };
						}
						return protocol;
					});
					setProtocols(updatedProtocols);
				} else if (response.statusCode === 400) {
					toast.error('Parameter deletion failed');
				}
			} catch (error) {
				console.error('Error deleting parameter:', error);
			}
		}
	};

	const handleRowDoubleClick = (protocol) => {
		setReceivedData(protocol);
	};

	const handleTableMouseDown = (e) => {
		const table = e.currentTarget;
		const startX = e.pageX - table.offsetLeft;
		const startY = e.pageY - table.offsetTop;
		const scrollLeft = table.scrollLeft;
		const scrollTop = table.scrollTop;

		const onMouseMove = (e) => {
			const x = e.pageX - table.offsetLeft;
			const y = e.pageY - table.offsetTop;
			const walkX = (x - startX) * -1; // Scroll opposite direction
			const walkY = (y - startY) * -1; // Scroll opposite direction
			table.scrollLeft = scrollLeft + walkX;
			table.scrollTop = scrollTop + walkY;
		};

		const onMouseUp = () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	};

	const handleMouseEnterProtocol = (protocolId) => {
		setHoveredProtocolId(protocolId);
	};

	const handleMouseLeave = () => {
		setHoveredProtocolId(null);
	};
	// Handle file view
	const handleFileView = async (fileInfo) => {
		try {
			let objectName = null;

			// Extract objectName from different formats
			if (typeof fileInfo === 'string') {
				try {
					const parsed = JSON.parse(fileInfo);
					objectName = parsed.objectName;
				} catch (e) {
					// If not valid JSON, treat as objectName directly
					objectName = fileInfo;
				}
			} else if (typeof fileInfo === 'object' && fileInfo.objectName) {
				objectName = fileInfo.objectName;
			}

			if (!objectName) {
				toast.error('Không tìm thấy thông tin file để xem', {
					autoClose: 1000,
				});
				return;
			}

			// Get the download URL from the API
			const linkResponse = await apiPost('https://red.irdop.org/v1/file/downlink', {
				objectName: objectName,
			});

			if (linkResponse.status !== 200) {
				console.error('Failed to get view link:', linkResponse.data?.message || 'Unknown error');
				toast.error(`Lỗi khi lấy link xem: ${linkResponse.data?.message || 'Unknown error'}`, {
					autoClose: 1000,
				});
				return;
			}

			// Open the file URL in a new tab
			window.open(linkResponse.data.url, '_blank');

			toast.success('Đã mở file trong tab mới', {
				autoClose: 1000,
			});
		} catch (error) {
			console.error('Error viewing file:', error);
			toast.error('Lỗi kết nối khi xem file', {
				autoClose: 1000,
			});
		}
	};

	// Handle file download
	const handleFileDownload = async (fileInfo) => {
		try {
			let objectName = null;
			let fileName = 'downloaded-file';

			// Extract objectName and fileName from different formats
			if (typeof fileInfo === 'string') {
				try {
					const parsed = JSON.parse(fileInfo);
					objectName = parsed.objectName;
					fileName = parsed.fileName || fileName;
				} catch (e) {
					// If not valid JSON, treat as objectName directly
					objectName = fileInfo;
				}
			} else if (typeof fileInfo === 'object' && fileInfo.objectName) {
				objectName = fileInfo.objectName;
				fileName = fileInfo.fileName || fileName;
			}

			if (!objectName) {
				toast.error('Không tìm thấy thông tin file để tải xuống', {
					autoClose: 1000,
				});
				return;
			}

			// First get the download URL from the API
			const linkResponse = await apiPost('https://red.irdop.org/v1/file/downlink', {
				objectName: objectName,
			});

			if (linkResponse.status !== 200) {
				console.error('Failed to get download link:', linkResponse.data?.message || 'Unknown error');
				toast.error(`Lỗi khi lấy link tải: ${linkResponse.data?.message || 'Unknown error'}`, {
					autoClose: 1000,
				});
				return;
			}

			// Using fetch function with correct headers and responseType
			const response = await fetch(linkResponse.data.url, {
				method: 'GET',
				headers: {},
			});

			if (response.ok) {
				// Get the blob directly from the response
				const blob = await response.blob();

				// Create a new blob with explicit type to ensure correct handling
				const fileBlob = new Blob([blob], { type: 'application/octet-stream' });

				// Create a URL for the blob
				const url = window.URL.createObjectURL(fileBlob);

				// For IE/Edge browsers
				if (window.navigator && window.navigator.msSaveOrOpenBlob) {
					window.navigator.msSaveOrOpenBlob(fileBlob, fileName);
				} else {
					// For modern browsers
					const link = document.createElement('a');
					link.href = url;
					link.setAttribute('download', fileName);
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

				toast.success('Tải file thành công', {
					autoClose: 1000,
				});
			} else {
				console.error('Failed to download file:', response.statusText);
				toast.error(`Lỗi khi tải file: ${response.statusText}`, {
					autoClose: 1000,
				});
			}
		} catch (error) {
			console.error('Error downloading file:', error);
			toast.error('Lỗi kết nối khi tải file', {
				autoClose: 1000,
			});
		}
	};

	// Handle file upload for new protocol
	const handleNewProtocolFileChange = async (event, fileType) => {
		const file = event.target.files[0];
		if (!file) return;

		const fileExtension = file.name.split('.').pop().toLowerCase();
		const validExtensions = ['pdf', 'xlsx', 'csv', 'docx', 'doc'];

		if (!validExtensions.includes(fileExtension)) {
			toast.error('Chỉ chấp nhận các file .pdf, .xlsx, .csv, .docx, .doc');
			return;
		}

		try {
			// Step 1: Get upload link from red.irdop.org
			const linkResponse = await apiPost('https://red.irdop.org/v1/file/uplink/SOP/protocol');

			if (linkResponse.status !== 200) {
				throw new Error(`Failed to get upload link: ${linkResponse.data?.message || 'Unknown error'}`);
			}

			const uploadInfo = linkResponse.data;

			if (!uploadInfo || !uploadInfo.url) {
				throw new Error('Không nhận được URL upload từ API');
			}

			// Step 2: Convert file to buffer and upload to S3
			const fileBuffer = await file.arrayBuffer();

			const uploadResponse = await axios.put(uploadInfo.url, fileBuffer, {
				headers: {
					'Content-Type': file.type || 'application/octet-stream',
				},
			});

			if (uploadResponse.status !== 200) {
				throw new Error(`Failed to upload file: ${uploadResponse.data?.message || 'Unknown error'}`);
			} // Step 3: Store file info in newProtocol for completion later
			const fileInfo = {
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
			};

			// Store upload info for completion when user clicks save
			const fileUploadData = {
				fileInfo: fileInfo,
				uploadInfo: uploadInfo,
			};

			// Update the newProtocol state with the upload data
			if (fileType === 'protocol') {
				setNewProtocol((prevState) => ({
					...prevState,
					protocol_file_id: fileUploadData,
				}));
			} else if (fileType === 'report') {
				setNewProtocol((prevState) => ({
					...prevState,
					report_file_id: fileUploadData,
				}));
			}

			toast.success(`File ${file.name} đã được tải lên. Nhấn 'Xác nhận' để lưu.`);
		} catch (error) {
			console.error('Error uploading file:', error);
			toast.error(`Có lỗi khi tải file lên: ${error.message}`);
		}
	};

	const renderProtocolDetails = (type) => {
		if (!receivedData) return null;
		console.log(receivedData);

		const isViewMode = type === 'view';

		const handleEditClick = () => {
			setIsEditing(true);
		};
		const handleSaveClick = async () => {
			const protocol = receivedData;
			try {
				const cleanedProtocol = cleanObject(protocol);
				const protocolResponse = protocol.id
					? await apiPost('https://black.irdop.org/el9k24zah/db/update/protocol', { protocol: cleanedProtocol })
					: await apiPost('https://black.irdop.org/el9k24zah/db/insert/protocol', { protocol: cleanedProtocol });

				const response = await apiGet('https://black.irdop.org/el9k24zah/db/get/protocol');
				const data = response.data;
				setProtocols(data);

				setReceivedData(null);
				setIsUploadBoxVisible(false);
				setFiles([]);
				setIsLoading(false);

				if (protocolResponse.status === 200) {
					toast.success('Cập nhật phương pháp thành công');
				} else {
					toast.error('Cập nhật phương pháp thất bại, vui lòng kiểm tra lại');
				}
			} catch (error) {
				console.error('Error saving protocol:', error);
			}
		};

		const handleCancelEditClick = () => {
			setIsEditing(false);
		};

		return (
			<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
				<div className="bg-white p-4 rounded-lg h-5/6 w-3/4 overflow-auto">
					<h2 className="text-xl font-bold mb-1">PHƯƠNG PHÁP</h2>
					<div className="mb-4">
						<table className="min-w-full bg-white">
							<thead className="border-b-2">
								<tr>
									<th className="py-2 text-start pl-2 w-40">Đặc điểm</th>
									<th className="py-2 text-center">Thông tin</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b">
									<td className="p-1 text-start font-semibold">Tên phương pháp:</td>
									<td className="p-1 text-start items-center flex">
										<textarea
											className={`w-full border resize-none px-2 py-1 rounded bg-white ${
												isViewMode && !isEditing ? 'border-none' : ''
											}`}
											rows={1}
											value={receivedData.protocol_name || ''}
											onChange={(e) => setReceivedData({ ...receivedData, protocol_name: e.target.value })}
											disabled={isViewMode && !isEditing}
										/>
									</td>
								</tr>
								<tr className="border-b">
									<td className="p-1 text-start font-semibold">Mã phương pháp:</td>
									<td className="p-1 text-start flex items-center">
										<textarea
											className={`w-full resize-none border px-2 py-1 rounded bg-white ${
												isViewMode && !isEditing ? 'border-none' : ''
											}`}
											rows={1}
											value={receivedData.protocol_code || ''}
											onChange={(e) => setReceivedData({ ...receivedData, protocol_code: e.target.value })}
											disabled={isViewMode && !isEditing}
										/>
									</td>
								</tr>
								<tr className="border-b">
									<td className="p-1 text-start font-semibold">Nguồn:</td>
									<td className="p-1 text-start flex items-center">
										<select
											className={`w-full border px-2 py-1 rounded bg-white ${
												isViewMode && !isEditing ? 'border-none' : ''
											}`}
											value={receivedData.protocol_source || 'IRDOP'}
											onChange={(e) => setReceivedData({ ...receivedData, protocol_source: e.target.value })}
											disabled={isViewMode && !isEditing}
										>
											{sourceOptions.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</td>
								</tr>
								<tr className="border-b">
									<td className="p-1 text-start font-semibold">Mô tả:</td>
									<td className="p-1 text-start flex items-center">
										<textarea
											className={`w-full resize-none border px-2 py-1 rounded bg-white ${
												isViewMode && !isEditing ? 'border-none' : ''
											}`}
											value={receivedData.protocol_description || ''}
											onChange={(e) => setReceivedData({ ...receivedData, protocol_description: e.target.value })}
											disabled={isViewMode && !isEditing}
										/>
									</td>
								</tr>
								<tr className="border-b">
									<td className="p-1 text-start font-semibold">Thiết bị:</td>
									<td className="p-1 text-start flex items-center">
										<div className="flex flex-col gap-2 w-full">
											{(receivedData.equipment || []).map((item, idx) => (
												<div key={idx} className="flex items-center gap-1">
													{' '}
													<select
														className={`w-full border px-2 py-1 rounded bg-white ${
															isViewMode && !isEditing ? 'border-none' : ''
														}`}
														value={typeof item === 'object' && item.name ? item.name : item}
														onChange={(e) => {
															const updatedEquipment = [...receivedData.equipment];
															updatedEquipment[idx] = e.target.value; // Store as plain string
															setReceivedData({ ...receivedData, equipment: updatedEquipment });
														}}
														disabled={isViewMode && !isEditing}
													>
														<option value="">Chọn thiết bị</option>
														{equipmentOptions.map((option) => (
															<option key={option} value={option}>
																{option}
															</option>
														))}
													</select>
													{!isViewMode && isEditing && (
														<button
															className="text-red-500 p-1"
															onClick={() => {
																const updatedEquipment = [...receivedData.equipment];
																updatedEquipment.splice(idx, 1);
																setReceivedData({ ...receivedData, equipment: updatedEquipment });
															}}
														>
															<FaTrash size={14} />
														</button>
													)}
												</div>
											))}
											{!isViewMode && isEditing && (
												<button
													className="flex items-center justify-center bg-blue-100 border border-blue-300 px-2 py-1 rounded text-blue-600 text-sm"
													onClick={() => {
														const updatedEquipment = [...receivedData.equipment, '']; // Add empty string instead of object
														setReceivedData({ ...receivedData, equipment: updatedEquipment });
													}}
												>
													<FaPlus size={12} className="mr-1" /> Thêm thiết bị
												</button>
											)}
										</div>
									</td>
								</tr>{' '}
								<tr className="border-b">
									<td className="p-1 text-start font-semibold">File phương pháp ID:</td>
									<td className="p-1 text-start flex items-center">
										<textarea
											className={`w-full resize-none border px-2 py-1 rounded bg-white ${
												isViewMode && !isEditing ? 'border-none' : ''
											}`}
											rows={1}
											value={
												typeof receivedData.protocol_file_id === 'object'
													? JSON.stringify(receivedData.protocol_file_id)
													: receivedData.protocol_file_id || ''
											}
											onChange={(e) => setReceivedData({ ...receivedData, protocol_file_id: e.target.value })}
											disabled={isViewMode && !isEditing}
										/>
									</td>
								</tr>
								<tr className="border-b">
									<td className="p-1 text-start font-semibold">File biên bản ID:</td>
									<td className="p-1 text-start flex items-center">
										<textarea
											className={`w-full resize-none border px-2 py-1 rounded bg-white ${
												isViewMode && !isEditing ? 'border-none' : ''
											}`}
											rows={1}
											value={
												typeof receivedData.report_file_id === 'object'
													? JSON.stringify(receivedData.report_file_id)
													: receivedData.report_file_id || ''
											}
											onChange={(e) => setReceivedData({ ...receivedData, report_file_id: e.target.value })}
											disabled={isViewMode && !isEditing}
										/>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="flex justify-between mt-4">
						<button
							className="bg-gray-500 text-white font-bold py-2 px-4 rounded"
							onClick={() => {
								setReceivedData(null);
								setIsLoading(false);
							}}
						>
							Đóng
						</button>
						{isViewMode && !isEditing ? (
							<>
								<button className="bg-blue-500 text-white font-bold py-2 px-4 rounded" onClick={handleEditClick}>
									Chỉnh sửa
								</button>
								<button className="bg-blue-500 text-white font-bold py-2 px-4 rounded" onClick={handleSaveClick}>
									Xác nhận
								</button>
							</>
						) : (
							<>
								<button className="bg-gray-500 text-white font-bold py-2 px-4 rounded" onClick={handleCancelEditClick}>
									Hủy bỏ
								</button>
								<button className="bg-blue-500 text-white font-bold py-2 px-4 rounded" onClick={handleSaveClick}>
									Xác nhận
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		);
	};

	// Add new functions for file handling
	const handleFileColumnClick = (protocol, fileType) => {
		setFileUploading({ type: fileType, id: protocol.id });
	};
	const handleProtocolFileChange = async (event, protocol, fileType) => {
		const file = event.target.files[0];
		if (!file) return;

		const fileExtension = file.name.split('.').pop().toLowerCase();
		const validExtensions = ['pdf', 'xlsx', 'csv', 'docx', 'doc'];

		if (!validExtensions.includes(fileExtension)) {
			toast.error('Chỉ chấp nhận các file .pdf, .xlsx, .csv, .docx, .doc');
			return;
		}

		setFileUploading({ type: fileType, id: protocol.id });

		try {
			// Step 1: Get upload link from red.irdop.org
			const linkResponse = await apiPost('https://red.irdop.org/v1/file/uplink/SOP/protocol');

			if (linkResponse.status !== 200) {
				throw new Error(`Failed to get upload link: ${linkResponse.data?.message || 'Unknown error'}`);
			}

			const uploadInfo = linkResponse.data;
			console.log('Received upload info:', uploadInfo);

			if (!uploadInfo || !uploadInfo.url) {
				throw new Error('Không nhận được URL upload từ API');
			}

			// Step 2: Convert file to buffer and upload to S3
			const fileBuffer = await file.arrayBuffer();

			const uploadResponse = await axios.put(uploadInfo.url, fileBuffer, {
				headers: {
					'Content-Type': file.type || 'application/octet-stream',
				},
			});

			if (uploadResponse.status !== 200) {
				throw new Error(`Failed to upload file: ${uploadResponse.data?.message || 'Unknown error'}`);
			}

			// Step 3: Store pending file info (don't complete upload yet)
			const fileKey = `${protocol.id}_${fileType}`;
			const fileInfo = {
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
			};

			setPendingFiles((prev) => ({
				...prev,
				[fileKey]: {
					fileInfo,
					uploadInfo,
					tempFileName: file.name,
				},
			}));

			toast.success(`File ${file.name} đã được tải lên. Nhấn 'Xác nhận' để lưu.`);
		} catch (error) {
			console.error('Error uploading file:', error);
			toast.error(`Có lỗi khi tải file lên: ${error.message}`);
		} finally {
			setFileUploading({ type: null, id: null });
		}
	};

	const handleFileDrop = async (e, protocol, fileType) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (!file) return;

		const fileExtension = file.name.split('.').pop().toLowerCase();
		const validExtensions = ['pdf', 'xlsx', 'csv', 'docx', 'doc'];

		if (!validExtensions.includes(fileExtension)) {
			toast.error('Chỉ chấp nhận các file .pdf, .xlsx, .csv, .docx, .doc');
			return;
		}

		// Create a synthetic event object to pass to the existing handler
		const syntheticEvent = {
			target: {
				files: [file],
			},
		};
		handleProtocolFileChange(syntheticEvent, protocol, fileType);
	};

	// Format the equipment list for display
	const formatEquipmentList = (equipment) => {
		if (!equipment || !Array.isArray(equipment) || equipment.length === 0) {
			return '';
		}

		// Normalize equipment items: could be strings or objects with name property
		return equipment
			.map((item) => {
				if (typeof item === 'object' && item.name) {
					return item.name;
				} else if (typeof item === 'string') {
					return item;
				}
				return '';
			})
			.filter((item) => item) // Filter out empty items
			.join(', ');
	};
	// Format file info for display
	const formatFileDisplay = (fileInfo, protocolId, fileType, isEditing = false) => {
		// Check if there's a pending file for this protocol and file type
		const fileKey = `${protocolId}_${fileType}`;
		const pendingFile = pendingFiles[fileKey];

		if (pendingFile) {
			return (
				<div className="flex flex-col gap-1">
					<div
						className="text-xs text-green-600 font-medium break-words"
						style={{ maxHeight: '2.5em', overflow: 'hidden' }}
					>
						{pendingFile.tempFileName}
					</div>
				</div>
			);
		}

		// Check if fileInfo is empty, null, or doesn't have fileName
		if (
			!fileInfo ||
			(typeof fileInfo === 'object' && !fileInfo.fileName) ||
			(typeof fileInfo === 'string' && fileInfo.trim() === '')
		) {
			return (
				<div className="flex flex-col gap-1">
					<div className="text-xs text-gray-500">Chưa có file</div>
				</div>
			);
		}

		// Parse file info to get display name and check if file exists
		let displayName = '';
		let hasValidFile = false;

		// If it's a string, try to parse as JSON
		if (typeof fileInfo === 'string') {
			try {
				const parsed = JSON.parse(fileInfo);
				displayName = parsed.fileName || 'Chưa có file';
				hasValidFile = !!parsed.objectName;
			} catch (e) {
				// If not valid JSON, return the string itself or default message
				displayName = fileInfo || 'Chưa có file';
				hasValidFile = !!fileInfo;
			}
		} else if (typeof fileInfo === 'object' && fileInfo.fileName) {
			// If it's already an object
			displayName = fileInfo.fileName;
			hasValidFile = !!fileInfo.objectName;
		} else {
			displayName = 'Chưa có file';
			hasValidFile = false;
		}

		return (
			<div className="flex flex-col gap-1">
				<div className="text-xs break-words" style={{ maxHeight: '2.5em', overflow: 'hidden' }}>
					{displayName}
				</div>
				{hasValidFile && !isEditing && (
					<div className="flex gap-1 mt-1">
						<button
							className="text-blue-500 hover:text-blue-700 cursor-pointer p-1"
							title="Xem"
							onClick={(e) => {
								e.stopPropagation();
								handleFileView(fileInfo);
							}}
						>
							<FaEye size={12} />
						</button>
						<button
							className="text-green-500 hover:text-green-700 cursor-pointer p-1"
							title="Tải xuống"
							onClick={(e) => {
								e.stopPropagation();
								handleFileDownload(fileInfo);
							}}
						>
							<FaDownload size={12} />
						</button>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			{/* Remove the Breadcrumb component as it's now handled by the parent Library component */}
			<div className={`w-full h-full mt-2 rounded-lg bg-white p-2 ${receivedData ? 'blur-sm' : ''}`}>
				<div className="flex justify-between items-center">
					<div className="relative"></div>
					<h2 className="text-4xl text-primary font-semibold py-2">Danh sách phương pháp</h2>{' '}
					<div className="relative z-10">
						{currentUser?.role?.staff_admin && (
							<button
								className="bg-blue-500 text-white px-4 py-0 w-44 rounded-lg font-medium "
								onClick={() => setIsAddingNew(true)}
							>
								Thêm mới
							</button>
						)}
					</div>
				</div>

				<div className="rounded-lg border p-0.5 relative z-0">
					<FilterBar source={source} setCurrentList={setProtocols} typeSearch="protocol" />
					<div className="w-full overflow-y-auto" onMouseDown={handleTableMouseDown}>
						<table className="min-w-full bg-white text-sm" style={{ userSelect: 'text' }}>
							<thead className="border-b-2">
								<tr>
									<th className="py-2 text-start pl-1 min-w-36 w-36">Mã phương pháp</th>
									<th className="py-2 text-start pl-1 min-w-48 w-[16%]">Phương pháp</th>
									<th className="py-2 text-start pl-1 min-w-36 w-36">Nguồn</th>
									<th className="py-2 text-start pl-1 min-w-56 w-[22%]">Mô tả</th>
									<th className="py-2 text-start pl-1 min-w-40 w-[14%]">Thiết bị</th>
									<th className="py-2 text-start pl-1 min-w-36 w-36">File phương pháp</th>
									<th className="py-2 text-start pl-1 min-w-36 w-36">File biên bản</th>
									<th className="py-2 text-center min-w-24 w-24">Thao tác</th>
								</tr>
							</thead>
							<tbody>
								{isAddingNew && (
									<tr className="border-t bg-blue-50">
										<td className="p-1 text-start">
											<input
												type="text"
												className="w-full border px-2 py-1 rounded bg-white"
												value={newProtocol.protocol_code}
												onChange={(e) => handleNewProtocolChange('protocol_code', e.target.value)}
											/>
										</td>
										<td className="p-1 text-start">
											<input
												type="text"
												className="w-full border px-2 py-1 rounded bg-white"
												value={newProtocol.protocol_name}
												onChange={(e) => handleNewProtocolChange('protocol_name', e.target.value)}
											/>
										</td>
										<td className="p-1 text-start">
											<select
												className="w-full border px-2 py-1 rounded bg-white"
												value={newProtocol.protocol_source}
												onChange={(e) => handleNewProtocolChange('protocol_source', e.target.value)}
											>
												{sourceOptions.map((option) => (
													<option key={option} value={option}>
														{option}
													</option>
												))}
											</select>
										</td>
										<td className="p-1 text-start">
											<textarea
												className="w-full border px-2 py-1 rounded bg-white max-h-20 overflow-y-auto"
												value={newProtocol.protocol_description}
												rows={3}
												onChange={(e) => handleNewProtocolChange('protocol_description', e.target.value)}
											/>
										</td>
										<td className="p-1 text-start">
											<div className="flex flex-col gap-2">
												{(newProtocol.equipment || []).map((item, idx) => (
													<div key={idx} className="flex items-center gap-1">
														<select
															className="w-full border px-2 py-1 rounded bg-white"
															value={item}
															onChange={(e) => handleNewProtocolEquipmentChange(idx, e.target.value)}
														>
															{equipmentOptions.map((option) => (
																<option key={option} value={option}>
																	{option || 'Chọn thiết bị'}
																</option>
															))}
														</select>
														<button className="text-red-500 p-1" onClick={() => handleRemoveNewEquipment(idx)}>
															<FaTrash size={14} />
														</button>
													</div>
												))}
												{/* Always show at least one equipment row */}
												{(newProtocol.equipment || []).length === 0 && (
													<select
														className="w-full border px-2 py-1 rounded bg-white"
														value=""
														onChange={(e) => handleNewProtocolEquipmentChange(0, e.target.value)}
													>
														{equipmentOptions.map((option) => (
															<option key={option} value={option}>
																{option || 'Chọn thiết bị'}
															</option>
														))}
													</select>
												)}
												{/* Show add button if the last equipment is not empty */}
												{(newProtocol.equipment || []).length > 0 &&
													newProtocol.equipment[newProtocol.equipment.length - 1] && (
														<button
															className="flex items-center justify-center bg-blue-100 border border-blue-300 px-2 py-1 rounded text-blue-600 text-sm"
															onClick={handleAddNewEquipment}
														>
															<FaPlus size={12} className="mr-1" /> Thêm thiết bị
														</button>
													)}
											</div>
										</td>{' '}
										<td className="p-1 text-start">
											<div className="flex flex-col gap-0.5 h-[70px]">
												<div className="flex-1 flex items-center">
													{newProtocol.protocol_file_id ? (
														<div
															className="text-xs text-green-600 font-medium break-words"
															style={{ maxHeight: '2.5em', overflow: 'hidden' }}
														>
															{typeof newProtocol.protocol_file_id === 'object'
																? newProtocol.protocol_file_id.fileName
																: 'File đã tải'}
														</div>
													) : (
														<div className="text-xs text-gray-500">Chưa có file</div>
													)}
												</div>
												<div
													className="w-full border-2 border-dashed border-blue-400 rounded flex flex-col items-center justify-center cursor-pointer bg-blue-50 py-1"
													onClick={() => document.getElementById('new-protocol-file').click()}
													onDragOver={(e) => e.preventDefault()}
													onDrop={(e) => {
														e.preventDefault();
														const file = e.dataTransfer.files[0];
														if (file) {
															const syntheticEvent = { target: { files: [file] } };
															handleNewProtocolFileChange(syntheticEvent, 'protocol');
														}
													}}
												>
													<input
														type="file"
														id="new-protocol-file"
														className="hidden"
														accept=".pdf,.xlsx,.csv,.docx,.doc"
														onChange={(e) => handleNewProtocolFileChange(e, 'protocol')}
													/>
													<FaUpload className="text-blue-500 text-lg" />
													<span className="text-xs text-blue-600">Tải file phương pháp</span>
												</div>
											</div>
										</td>
										<td className="p-1 text-start">
											<div className="flex flex-col gap-0.5 h-[70px]">
												<div className="flex-1 flex items-center">
													{newProtocol.report_file_id ? (
														<div
															className="text-xs text-green-600 font-medium break-words"
															style={{ maxHeight: '2.5em', overflow: 'hidden' }}
														>
															{typeof newProtocol.report_file_id === 'object'
																? newProtocol.report_file_id.fileName
																: 'File đã tải'}
														</div>
													) : (
														<div className="text-xs text-gray-500">Chưa có file</div>
													)}
												</div>
												<div
													className="w-full border-2 border-dashed border-blue-400 rounded flex flex-col items-center justify-center cursor-pointer bg-blue-50 py-1"
													onClick={() => document.getElementById('new-report-file').click()}
													onDragOver={(e) => e.preventDefault()}
													onDrop={(e) => {
														e.preventDefault();
														const file = e.dataTransfer.files[0];
														if (file) {
															const syntheticEvent = { target: { files: [file] } };
															handleNewProtocolFileChange(syntheticEvent, 'report');
														}
													}}
												>
													<input
														type="file"
														id="new-report-file"
														className="hidden"
														accept=".pdf,.xlsx,.csv,.docx,.doc"
														onChange={(e) => handleNewProtocolFileChange(e, 'report')}
													/>
													<FaUpload className="text-blue-500 text-lg" />
													<span className="text-xs text-blue-600">Tải file biên bản</span>
												</div>
											</div>
										</td>
										<td className="p-1 text-center">
											<button
												className="text-blue-500 px-2 py-1 mr-1 focus:outline-none focus:border-none"
												onClick={handleSaveNewProtocol}
											>
												<GiConfirmed size={20} />
											</button>
											<button
												className="text-red-500 px-2 ml-1 py-1 focus:outline-none focus:border-none"
												onClick={() => {
													setIsAddingNew(false);
													setNewProtocol({
														protocol_name: '',
														protocol_code: '',
														protocol_description: '',
														protocol_content: '',
														protocol_source: 'IRDOP',
														equipment: [],
														protocol_file_id: '',
														report_file_id: '',
													});
												}}
											>
												<GiCancel size={20} />
											</button>
										</td>
									</tr>
								)}
								{paginatedProtocols.map((protocol) => (
									<tr
										key={protocol.id}
										className={`border-b relative ${hoveredProtocolId === protocol.id ? 'bg-gray-100' : ''}`}
										onMouseEnter={() => handleMouseEnterProtocol(protocol.id)}
										onMouseLeave={handleMouseLeave}
									>
										<td className="p-1 text-start">
											{editingRow === protocol.id ? (
												<input
													type="text"
													className="w-full font-medium text-primary border px-2 py-1 rounded bg-white"
													value={protocol.protocol_code || ''}
													onChange={(e) => handleInputChange(protocol.id, 'protocol_code', e.target.value)}
												/>
											) : (
												<span
													className="block overflow-hidden font-medium hover:font-bold hover:cursor-pointer text-primary"
													onDoubleClick={async () => {
														try {
															if (navigator.clipboard) {
																await navigator.clipboard.writeText(protocol.protocol_code);
															} else {
																const textArea = document.createElement('textarea');
																textArea.value = protocol.protocol_code;
																document.body.appendChild(textArea);
																textArea.select();
																document.execCommand('copy');
																document.body.removeChild(textArea);
															}
															toast.success('✅ Đã copy mã phương pháp');
														} catch (error) {
															console.error('Clipboard Error:', error);
															toast.error('❌ Copy mã phương pháp thất bại, kiểm tra lại!');
														}
													}}
												>
													{protocol.protocol_code || ''}
												</span>
											)}
										</td>
										<td className="p-1 text-start">
											{editingRow === protocol.id ? (
												<textarea
													className="w-full font-medium text-primary resize-none border px-2 py-1 rounded bg-white"
													value={protocol.protocol_name || ''}
													rows={3}
													onChange={(e) => handleInputChange(protocol.id, 'protocol_name', e.target.value)}
												/>
											) : (
												<span className="block overflow-hidden text-primary" style={{ height: '60px' }}>
													{protocol.protocol_name || ''}
												</span>
											)}
										</td>
										<td className="p-1 text-start">
											{editingRow === protocol.id ? (
												<select
													className="w-full border px-2 py-1 rounded bg-white"
													value={protocol.protocol_source.trim()}
													onChange={(e) => handleInputChange(protocol.id, 'protocol_source', e.target.value)}
												>
													{sourceOptions.map((option) => (
														<option key={option} value={option}>
															{option}
														</option>
													))}
												</select>
											) : (
												<span className="block overflow-hidden" style={{ height: '60px' }}>
													{protocol.protocol_source || ''}
												</span>
											)}
										</td>
										<td className="p-1 text-start">
											{editingRow === protocol.id ? (
												<textarea
													className="w-full resize-none border px-2 py-1 rounded bg-white overflow-y-auto"
													value={protocol.protocol_description || ''}
													rows={3}
													onChange={(e) => handleInputChange(protocol.id, 'protocol_description', e.target.value)}
												/>
											) : (
												<span className="block overflow-hidden" style={{ height: '60px' }}>
													{protocol.protocol_description || ''}
												</span>
											)}
										</td>
										<td className="p-1 text-start">
											{editingRow === protocol.id ? (
												<div className="flex flex-col gap-2">
													{(protocol.equipment || []).map((item, idx) => (
														<div key={idx} className="flex items-center gap-1">
															<select
																className="w-full border px-2 py-1 rounded bg-white"
																value={typeof item === 'object' && item.name ? item.name : item}
																onChange={(e) => handleEquipmentChange(protocol.id, idx, e.target.value)}
															>
																{equipmentOptions.map((option) => (
																	<option key={option} value={option}>
																		{option || 'Chọn thiết bị'}
																	</option>
																))}
															</select>
															<button
																className="text-red-500 p-1"
																onClick={() => handleRemoveEquipment(protocol.id, idx)}
															>
																<FaTrash size={14} />
															</button>
														</div>
													))}
													{/* Always show at least one equipment row */}
													{(protocol.equipment || []).length === 0 && (
														<select
															className="w-full border px-2 py-1 rounded bg-white"
															value=""
															onChange={(e) => handleEquipmentChange(protocol.id, 0, e.target.value)}
														>
															{equipmentOptions.map((option) => (
																<option key={option} value={option}>
																	{option || 'Chọn thiết bị'}
																</option>
															))}
														</select>
													)}
													{/* Show add button if the last equipment is not empty */}
													{(protocol.equipment || []).length > 0 &&
														protocol.equipment[protocol.equipment.length - 1] && (
															<button
																className="flex items-center justify-center bg-blue-100 border border-blue-300 px-2 py-1 rounded text-blue-600 text-sm"
																onClick={() => handleAddEquipment(protocol.id)}
															>
																<FaPlus size={12} className="mr-1" /> Thêm thiết bị
															</button>
														)}
												</div>
											) : (
												<span className="block overflow-hidden" style={{ height: '60px' }}>
													{formatEquipmentList(protocol.equipment)}
												</span>
											)}
										</td>{' '}
										<td className="p-1 text-start">
											{editingRow === protocol.id ? (
												<div className="flex flex-col gap-0.5 h-[70px]">
													{formatFileDisplay(
														protocol.protocol_file_id,
														protocol.id,
														'protocol',
														editingRow === protocol.id,
													)}
													<div
														className="w-full flex-1 border-2 border-dashed border-blue-400 rounded flex flex-col items-center justify-center cursor-pointer bg-blue-50"
														onClick={() => handleFileColumnClick(protocol, 'protocol')}
														onDragOver={(e) => e.preventDefault()}
														onDrop={(e) => handleFileDrop(e, protocol, 'protocol')}
													>
														<input
															type="file"
															id={`protocol-file-${protocol.id}`}
															className="hidden"
															accept=".pdf,.xlsx,.csv,.docx,.doc"
															onChange={(e) => handleProtocolFileChange(e, protocol, 'protocol')}
														/>
														<label
															htmlFor={`protocol-file-${protocol.id}`}
															className="cursor-pointer text-center flex flex-col items-center justify-center"
														>
															<FaUpload className="text-blue-500 text-xl mb-1" />
															<span className="text-xs text-blue-600">Tải file phương pháp</span>
														</label>
													</div>
												</div>
											) : (
												<span className="block overflow-hidden" style={{ height: '60px' }}>
													{formatFileDisplay(
														protocol.protocol_file_id,
														protocol.id,
														'protocol',
														editingRow === protocol.id,
													)}
												</span>
											)}
										</td>{' '}
										<td className="p-1 text-start">
											{editingRow === protocol.id ? (
												<div className="flex flex-col gap-0.5 h-[70px]">
													{formatFileDisplay(
														protocol.report_file_id,
														protocol.id,
														'report',
														editingRow === protocol.id,
													)}
													<div
														className="w-full flex-1 border-2 border-dashed border-blue-400 rounded flex flex-col items-center justify-center cursor-pointer bg-blue-50"
														onClick={() => handleFileColumnClick(protocol, 'report')}
														onDragOver={(e) => e.preventDefault()}
														onDrop={(e) => handleFileDrop(e, protocol, 'report')}
													>
														<input
															type="file"
															id={`report-file-${protocol.id}`}
															className="hidden"
															accept=".pdf,.xlsx,.csv,.docx,.doc"
															onChange={(e) => handleProtocolFileChange(e, protocol, 'report')}
														/>
														<label
															htmlFor={`report-file-${protocol.id}`}
															className="cursor-pointer text-center flex flex-col items-center justify-center"
														>
															<FaUpload className="text-blue-500 text-xl mb-1" />
															<span className="text-xs text-blue-600">Tải file biên bản</span>
														</label>
													</div>
												</div>
											) : (
												<span className="block overflow-hidden" style={{ height: '60px' }}>
													{formatFileDisplay(
														protocol.report_file_id,
														protocol.id,
														'report',
														editingRow === protocol.id,
													)}
												</span>
											)}
										</td>{' '}
										<td className="p-0 text-center">
											{currentUser?.role?.staff_admin || currentUser?.role?.staff_superAdmin ? (
												editingRow === protocol.id ? (
													<div>
														<button
															className="text-blue-500 px-2 py-1 mr-1 focus:outline-none focus:border-none"
															onClick={() => handleSaveClick(protocol.id)}
														>
															<GiConfirmed size={20} />
														</button>
														<button
															className="text-red-500 px-2 ml-1 py-1 focus:outline-none focus:border-none"
															onClick={handleCancelClick}
														>
															<GiCancel size={20} />
														</button>
													</div>
												) : (
													<div>
														<button
															className="text-blue-500 p-1 focus:outline-none focus:border-none"
															onClick={() => setEditingRow(protocol.id)}
														>
															<RiEdit2Line size={20} />
														</button>
														<button
															className="text-red-500 p-1 focus:outline-none focus:border-none"
															onClick={() => handleDeleteClick(protocol.id)}
														>
															<GiTrashCan size={20} />
														</button>
													</div>
												)
											) : (
												<div className="text-gray-400 text-sm">-</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="flex justify-center mt-4">{renderPageNumbers()}</div>
				</div>
			</div>

			{isLoading && (
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
					<div className="flex flex-col items-center justify-center min-h-screen">
						<div className="flex space-x-1 pl-5 text-4xl font-bold text-teritary">
							<span className="bounce">L</span>
							<span className="bounce">o</span>
							<span className="bounce">a</span>
							<span className="bounce">d</span>
							<span className="bounce">i</span>
							<span className="bounce">n</span>
							<span className="bounce">g</span>
							<span className="bounce">.</span>
							<span className="bounce">.</span>
							<span className="bounce">.</span>
						</div>
						<button
							className="bg-red-500 text-white font-bold py-2 px-4 mt-6 rounded ml-4"
							onClick={handleCancelUpload}
						>
							Hủy
						</button>
					</div>
				</div>
			)}

			{renderProtocolDetails('view')}
		</div>
	);
};

export default ProtocolInfor;
