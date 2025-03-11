import * as React from 'react';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
const { useContext, useState, useEffect } = React;
import FilterBar from './FilterBar';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import axios from 'axios';
import { RiEdit2Line } from 'react-icons/ri';
import { GiConfirmed, GiCancel, GiTrashCan, GiSave } from 'react-icons/gi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LiaInfoSolid } from 'react-icons/lia';
import { is } from 'date-fns/locale';

const ProtocolInfor = () => {
	const { setCurrentTitlePage, currentUser, technicians } = useContext(GlobalContext);
	const [protocols, setProtocols] = useState([]);
	const [source, setSource] = useState([]);
	const [isUploadBoxVisible, setIsUploadBoxVisible] = useState(false);
	const [files, setFiles] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [receivedData, setReceivedData] = useState(null);
	const [editingRow, setEditingRow] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [instance, setInstance] = useState(null);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [editTool, setEditTool] = useState(false);
	const [newProtocol, setNewProtocol] = useState({
		protocol_name: '',
		protocol_code: '',
		protocol_description: '',
		protocol_content: '',
		author_name: '',
		publisher: '',
		parameters: [],
	});
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const protocolsPerPage = 20;
	const [isEditing, setIsEditing] = useState(false);
	const [hoveredProtocolId, setHoveredProtocolId] = useState(null);
	const [hoveredParameterId, setHoveredParameterId] = useState(null);
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
		if (technicians.length > 0 && !isFetch) {
			isFetch = true;
			console.log(isFetch);
			fetchProtocols();
		}
	}, [technicians]);

	const fetchProtocols = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/el9k24zah/db/get/protocol');
			const data = response.data.map((protocol) => ({
				...protocol,
				parameters: protocol.parameters || [],
			}));
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

	/** Note: Handle */
	const handleSaveClick = async (id) => {
		const updatedProtocol = protocols.find((protocol) => protocol.id === id);
		try {
			const response = await apiPost('https://black.irdop.org/el9k24zah/db/update/protocol', {
				protocol: updatedProtocol,
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
		const updatedParameter = updatedProtocol.parameters[paramIndex];

		if (Number.isNaN(parseInt(updatedParameter.tat_expected))) {
			delete updatedParameter.tat_expected;
		} else {
			const days = parseInt(updatedParameter?.tat_expected?.split(' ')[0]);
			updatedParameter.tat_expected = `${days} ${days > 1 ? 'days' : 'day'}`;
		}
		try {
			const response = updatedParameter.id
				? await apiPost('https://black.irdop.org/ha8i0uw2/db/update/parameter', { parameter: updatedParameter })
				: await apiPost('https://black.irdop.org/ha8i0uw2/db/insert/bulk/parameter', {
						parameters: [updatedParameter],
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
		const content = await axios.post('https://black.irdop.org/db/set_content/protocol', {
			file_id: instance,
			protocol_id: protocol_id,
		});
		if (content.status === 200) {
			toast.success('Data confirmed successfully');
		}
		setInstance(null);
	};

	const handleFileDrop = (event) => {
		event.preventDefault();
		const newFiles = Array.from(event.dataTransfer.files);
		const validExtensions = ['doc', 'docx', 'pdf', 'csv', 'xls', 'xlsx'];
		const invalidFiles = newFiles.filter((file) => !validExtensions.includes(file.name.split('.').pop().toLowerCase()));

		if (invalidFiles.length > 0) {
			alert('Chỉ chấp nhận các file có định dạng DOC, DOCX, PDF, CSV, hoặc EXCEL.');
		} else {
			setFiles((prevFiles) => [...prevFiles, ...newFiles]);
		}
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
		const protocol = receivedData;
		let parameters = receivedData.parameters;
		delete protocol.parameters;
		// Handle the confirmation of received data
		try {
			const protocolResponse = await apiPost('https://black.irdop.org/el9k24zah/db/insert/protocol', {
				protocol: protocol,
			});

			const updatedParameters = parameters.map((param) => ({
				...param,
				protocol_id: protocolResponse.data.id,
				protocol_code: receivedData.protocol_code,
				matrix: param.matrix === 'Khác' ? customMatrix[param.parameter_name] : param.matrix,
			}));

			parameters = updatedParameters;
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

	const handleSaveNewProtocol = async () => {
		if (!newProtocol.protocol_name || !newProtocol.protocol_code || !newProtocol.protocol_description) {
			toast.error('Các trường Tên phương pháp, Mã phương pháp và Mô tả là bắt buộc');
			return;
		}
		try {
			const response = await apiPost('https://black.irdop.org/el9k24zah/db/insert/protocol', {
				protocol: newProtocol,
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
					author_name: '',
					publisher: '',
					parameters: [],
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

	const handleAddNewProtocolClick = () => {
		setIsUploadBoxVisible(false);
		setReceivedData(newProtocol);
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
		setHoveredParameterId(null);
	};

	const handleMouseEnterParameter = (protocolId, parameterId) => {
		setHoveredProtocolId(protocolId);
		setHoveredParameterId(parameterId);
	};

	const handleMouseLeave = () => {
		setHoveredProtocolId(null);
		setHoveredParameterId(null);
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
			let parameters = receivedData.parameters;
			delete protocol.parameters;

			try {
				const protocolResponse = protocol.id
					? await apiPost('https://black.irdop.org/el9k24zah/db/update/protocol', { protocol: protocol })
					: await apiPost('https://black.irdop.org/el9k24zah/db/insert/protocol', { protocol: protocol });

				const updatedParameters = parameters.map((param) => {
					if (Number.isNaN(parseInt(param.tat_expected))) {
						delete param.tat_expected;
					} else {
						const days = parseInt(param.tat_expected);
						param.tat_expected = `${days} ${days > 1 ? 'days' : 'day'}`;
					}
					return {
						...param,
						protocol_id: protocol.id || protocolResponse.data.id,
						protocol_code: protocol.protocol_code,
						matrix: param.matrix,
					};
				});

				parameters = updatedParameters;
				const parameterResponses = await Promise.all(
					parameters.map((param) =>
						param.id
							? apiPost('https://black.irdop.org/ha8i0uw2/db/update/parameter', { parameter: param })
							: apiPost('https://black.irdop.org/ha8i0uw2/db/insert/bulk/parameter', { parameters: [param] }),
					),
				);

				const response = await apiGet('https://black.irdop.org/el9k24zah/db/get/protocol');
				const data = response.data;
				setProtocols(data);

				setReceivedData(null);
				setIsUploadBoxVisible(false);
				setFiles([]);
				setIsLoading(false);

				if (protocolResponse.status === 200 && parameterResponses.every((res) => res.status === 200)) {
					toast.success('Cập nhật phương pháp thành công');
				} else {
					toast.error('Cập nhật phương pháp thất bại, vui lòng kiểm tra lại');
				}
			} catch (error) {
				console.error('Error saving protocol:', error);
			}
		};

		const handleDeleteParameter = async (index) => {
			const param = receivedData.parameters[index];
			if (param.id) {
				const confirmed = window.confirm(`Bạn chắc chắn muốn xóa chỉ tiêu: ${param.parameter_name}?`);
				if (confirmed) {
					try {
						const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/delete/parameter', { id: param.id });
						if (response.status === 200 && response.data) {
							toast.success('Parameter deleted successfully');
							const updatedParameters = receivedData.parameters.filter((_, paramIndex) => paramIndex !== index);
							setReceivedData({ ...receivedData, parameters: updatedParameters });
						} else {
							toast.error('Parameter deletion failed');
						}
					} catch (error) {
						console.error('Error deleting parameter:', error);
					}
				}
			} else {
				const updatedParameters = receivedData.parameters.filter((_, paramIndex) => paramIndex !== index);
				setReceivedData({ ...receivedData, parameters: updatedParameters });
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
									<td className="p-1 text-start font-semibold">Nội dung:</td>
									<td className="p-1 text-start flex items-center">
										<div
											className="max-h-32 overflow-hidden hover:overflow-y-auto"
											dangerouslySetInnerHTML={{ __html: receivedData.protocol_content }}
										/>
									</td>
								</tr>
								<tr className="border-b">
									<td className="p-1 text-start font-semibold">Tác giả:</td>
									<td className="p-1 text-start flex items-center">
										<textarea
											className={`w-full resize-none border px-2 py-1 rounded bg-white ${
												isViewMode && !isEditing ? 'border-none' : ''
											}`}
											rows={1}
											value={receivedData.author_name || ''}
											onChange={(e) => setReceivedData({ ...receivedData, author_name: e.target.value })}
											disabled={isViewMode && !isEditing}
										/>
									</td>
								</tr>
								<tr className="border-b">
									<td className="p-1 text-start font-semibold">Người phát hành:</td>
									<td className="p-1 text-start flex items-center">
										<textarea
											className={`w-full resize-none border px-2 py-1 rounded bg-white ${
												isViewMode && !isEditing ? 'border-none' : ''
											}`}
											rows={1}
											value={receivedData.publisher || ''}
											onChange={(e) => setReceivedData({ ...receivedData, publisher: e.target.value })}
											disabled={isViewMode && !isEditing}
										/>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<table className="min-w-full bg-white">
						<thead className="border-b-2">
							<tr>
								<th className="py-2 text-start pl-3 w-1/3">Phép thử / chỉ tiêu</th>
								<th className="py-2 text-start pl-3 w-1/4">Nền mẫu</th>
								<th className="py-2 text-center min-w-44">Người thực hiện</th>
								<th className="py-2 text-center min-w-16">Đơn vị</th>
								<th className="py-2 text-center min-w-20">TAT</th>
								<th className="py-2 text-center min-w-28">Chứng nhận</th>
								<th className="py-2 text-center min-w-12">Xóa</th>
							</tr>
						</thead>
						<tbody>
							{receivedData.parameters &&
								receivedData.parameters.map((param, index) => (
									<tr key={index} className="border-b hover:bg-gray-100">
										<td className="pt-2 px-1 text-start">
											<textarea
												className={`w-full resize-none font-medium border px-2 py-1 rounded bg-white ${
													isViewMode && !isEditing ? 'border-none' : ''
												}`}
												value={param.parameter_name || ''}
												onChange={(e) => handleParameterChange(index, 'parameter_name', e.target.value)}
												disabled={isViewMode && !isEditing}
												rows={2}
											/>
										</td>
										<td className="pt-2 px-1 text-start">
											{isEditing ? (
												<textarea
													className="w-full font-medium resize-none border px-2 py-1 rounded bg-white"
													value={param.matrix || ''}
													onChange={(e) => handleParameterChange(index, 'matrix', e.target.value)}
												/>
											) : (
												<textarea
													className="w-full font-medium resize-none px-2 py-1 rounded bg-white overflow-hidden hover:overflow-y-auto"
													value={param.matrix || ''}
													rows={2}
													disabled
												/>
											)}
										</td>
										<td className="p-1 text-start">
											{isViewMode && !isEditing ? (
												<textarea
													className="w-full resize-none px-2 py-1 rounded bg-white overflow-hidden border-none"
													value={technician(param) || ''}
													rows={2}
													disabled
												/>
											) : (
												<div className="relative">
													<button
														className="w-full border px-2 py-1 rounded bg-white text-left h-[58px] border-slate-200 mt-0.5"
														onClick={() => toggleTechnicianDropdown(receivedData.id, index)}
													>
														{technician(param) || 'Chọn KTV'}
													</button>
													{technicianDropdownVisible &&
														technicianDropdownVisible.protocolId === receivedData.id &&
														technicianDropdownVisible.paramIndex === index && (
															<ul className="absolute w-full bg-white border rounded shadow-lg z-10">
																{technicians.map((identity) => (
																	<li
																		key={identity.alias}
																		className="p-1 text-md cursor-pointer hover:bg-gray-200"
																		onClick={() =>
																			handleParameterChange(index, 'technician_uid', identity.identity_uid)
																		}
																	>
																		<p className="font-bold text-primary text-sm">{identity.alias}</p>
																		<p>{identity.identity_name}</p>
																	</li>
																))}
															</ul>
														)}
												</div>
											)}
										</td>
										<td className="pt-2 px-1 text-start ">
											<textarea
												className={`w-full resize-none border px-2 py-1 rounded bg-white ${
													isViewMode && !isEditing ? 'border-none' : ''
												}`}
												value={param.default_unit || ''}
												onChange={(e) => handleParameterChange(index, 'default_unit', e.target.value)}
												disabled={isViewMode && !isEditing}
												rows={2}
											/>
										</td>
										<td className="pt-2 px-1 text-center">
											<input
												type="number"
												min="0"
												className={`w-14 mr-1 border p-1 rounded bg-white ${
													isViewMode && !isEditing ? 'border-none' : ''
												}`}
												value={param?.tat_expected?.days}
												onChange={(e) => handleParameterChange(index, 'tat_expected', e.target.value)}
												disabled={isViewMode && !isEditing}
											/>
											<p className=" px-2 w-full text-start">{'ngày'}</p>
										</td>
										<td className="pt-3 px-1 text-center flex flex-col items-start">
											<label>
												<input
													type="checkbox"
													checked={param.accreditation?.includes('VILAS 997')}
													onChange={() => handleAccreditationChange(index, 'VILAS 997')}
													disabled={isViewMode && !isEditing}
												/>
												{' VILAS 997'}
											</label>
											<label className="">
												<input
													type="checkbox"
													checked={param.accreditation?.includes('107')}
													onChange={() => handleAccreditationChange(index, '107')}
													disabled={isViewMode && !isEditing}
												/>
												{' 107'}
											</label>
										</td>
										<td className="p-1 text-center">
											{!isViewMode || isEditing ? (
												<button
													className="text-red-500 px-2 py-1 focus:outline-none focus:border-none"
													onClick={() => handleDeleteParameter(index)}
												>
													X
												</button>
											) : (
												<span>-</span>
											)}
										</td>
									</tr>
								))}
						</tbody>
					</table>
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
								<button className="bg-gray-500 text-white font-bold py-2 px-4 rounded" onClick={handleAddParameter}>
									Thêm Chỉ tiêu
								</button>
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

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			{/* Remove the Breadcrumb component as it's now handled by the parent Library component */}
			<div className={`w-full h-full mt-2 rounded-lg bg-white p-2 ${receivedData ? 'blur-sm' : ''}`}>
				<div className="flex justify-between items-center">
					<div className="relative"></div>
					<h2 className="text-4xl text-primary font-semibold py-2">Danh sách phương pháp</h2>
					<div className="relative z-10">
						<button
							className="bg-blue-500 text-white px-4 py-0 w-44 rounded-lg font-medium "
							onClick={() => setIsUploadBoxVisible(!isUploadBoxVisible)}
						>
							Thêm mới
						</button>
						{isUploadBoxVisible && (
							<div
								className="w-96 border-dashed border-2 border-gray-400 rounded-lg p-4 mt-8 absolute top-0 right-0 z-10 bg-white"
								onDrop={handleFileDrop}
								onDragOver={(e) => e.preventDefault()}
							>
								<input type="file" multiple className="hidden" id="fileInput" onChange={handleFileChange} />
								<label htmlFor="fileInput" className="cursor-pointer text-blue-500">
									Kéo thả file vào đây hoặc nhấn để chọn file <br></br>
									<p className="text-sm text-red-500">(* .docx, .doc, .xlsx, .pdf)</p>
								</label>
								<div className="mt-4">
									{files.map((file) => (
										<div key={file.name} className="flex justify-between items-center border pl-2 w-full rounded-lg">
											{/* Thêm lớp `break-words` hoặc `break-all` để nội dung xuống dòng */}
											<span className="w-72 break-words text-start">{file.name}</span>

											<button className="text-red-500 py-2 px-4" onClick={() => handleFileDelete(file.name)}>
												X
											</button>
										</div>
									))}
								</div>
								<div className="flex justify-end mt-8">
									<button
										className="bg-gray-500 text-white font-bold py-2 px-4 rounded mr-2"
										onClick={handleCancelUpload}
									>
										Hủy bỏ
									</button>
									<button className="bg-blue-500 text-white font-bold py-2 px-4 rounded" onClick={handleConfirmUpload}>
										Xác nhận
									</button>
									<button
										className="bg-green-500 text-white font-bold py-2 px-4 rounded ml-2"
										onClick={handleAddNewProtocolClick}
									>
										Nhập mới
									</button>
								</div>
							</div>
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
									<th className="py-2 text-start pl-1 min-w-56 w-[22%]">Mô tả</th>
									<th className="py-2 text-start pl-1 min-w-44 w-[16%]">Chỉ tiêu</th>
									<th className="py-2 text-start pl-1 min-w-40 w-[14%]">Nền mẫu</th>
									<th className="py-2 text-start pl-1 min-w-36 w-36">Người thực hiện</th>
									<th className="py-2 text-start pl-1 min-w-16 w-16">TAT</th>
									<th className="py-2 text-center min-w-10 w-10"></th>
									<th
										className="py-2 text-center min-w-24 w-24 cursor-pointer font-bold text-primary"
										onClick={() => {
											setEditTool(!editTool);
										}}
									>
										Thao tác
									</th>
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
											<textarea
												className="w-full border px-2 py-1 rounded bg-white max-h-20 overflow-y-auto"
												value={newProtocol.protocol_description}
												rows={3}
												onChange={(e) => handleNewProtocolChange('protocol_description', e.target.value)}
											/>
										</td>
										<td className="p-1 text-start">{/* Empty cell for new protocol */}</td>
										<td className="p-1 text-start">
											<input
												type="text"
												className="w-full border px-2 py-1 rounded bg-white"
												value={newProtocol.author_name}
												onChange={(e) => handleNewProtocolChange('author_name', e.target.value)}
											/>
										</td>
										<td className="p-1 text-start">
											<input
												type="text"
												className="w-full border px-2 py-1 rounded bg-white"
												value={newProtocol.publisher}
												onChange={(e) => handleNewProtocolChange('publisher', e.target.value)}
											/>
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
												onClick={() => setIsAddingNew(false)}
											>
												<GiCancel size={20} />
											</button>
										</td>
									</tr>
								)}
								{paginatedProtocols.map((protocol) => (
									<React.Fragment key={protocol.id}>
										<tr
											className={`border-b relative ${hoveredProtocolId === protocol.id ? 'bg-gray-100' : ''}`}
											onMouseEnter={() => handleMouseEnterProtocol(protocol.id)}
											onMouseLeave={handleMouseLeave}
										>
											<td className="p-1 text-start" rowSpan={protocol.parameters.length || 1}>
												{editingRow === protocol.id ? (
													<textarea
														className="w-full font-medium text-primary resize-none  border px-2 py-1 rounded bg-white"
														value={protocol.protocol_code}
														rows={protocol.parameters.length < 2 ? 3 : 3 + (protocol.parameters.length - 1) * 3}
														onChange={(e) => handleInputChange(protocol.id, 'protocol_code', e.target.value)}
													/>
												) : (
													<span
														className="block overflow-hidden font-medium hover:font-bold hover:cursor-pointer text-primary hover:overflow-y-auto"
														style={{
															height:
																protocol.parameters.length > 1
																	? `calc(60px + 40px * ${protocol.parameters.length - 1})`
																	: '60px',
														}}
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
														{protocol.protocol_code}
													</span>
												)}
											</td>
											<td className="p-1 text-start" rowSpan={protocol.parameters.length || 1}>
												{editingRow === protocol.id ? (
													<textarea
														className="w-full font-medium text-primary resize-none  border px-2 py-1 rounded bg-white"
														value={protocol.protocol_name}
														rows={protocol.parameters.length < 2 ? 3 : 3 + (protocol.parameters.length - 1) * 3}
														onChange={(e) => handleInputChange(protocol.id, 'protocol_name', e.target.value)}
													/>
												) : (
													<span
														className="block overflow-hidden text-primary hover:overflow-y-auto"
														style={{
															height:
																protocol.parameters.length > 1
																	? `calc(60px + 40px * ${protocol.parameters.length - 1})`
																	: '60px',
														}}
													>
														{protocol.protocol_name}
													</span>
												)}
											</td>

											<td className="p-1 text-start" rowSpan={protocol.parameters.length || 1}>
												{editingRow === protocol.id ? (
													<textarea
														className="w-full resize-none border px-2 py-1 rounded bg-white overflow-y-auto"
														value={protocol.protocol_description}
														rows={protocol.parameters.length < 2 ? 3 : 3 + (protocol.parameters.length - 1) * 3}
														onChange={(e) => handleInputChange(protocol.id, 'protocol_description', e.target.value)}
													/>
												) : (
													<span
														className="block overflow-hidden hover:overflow-y-auto"
														style={{
															height:
																protocol.parameters.length > 1
																	? `calc(60px + 40px * ${protocol.parameters.length - 1})`
																	: '60px',
														}}
													>
														{protocol.protocol_description}
													</span>
												)}
											</td>
											{protocol.parameters.length > 0 ? (
												<React.Fragment>
													<td
														className={`p-1 text-start ${
															hoveredParameterId === protocol.parameters[0].id
																? 'bg-gray-300'
																: hoveredProtocolId === protocol.id
																? 'bg-gray-100'
																: ''
														}`}
														onMouseEnter={() => handleMouseEnterParameter(protocol.id, protocol.parameters[0].id)}
														onMouseLeave={handleMouseLeave}
													>
														{editingRow === protocol.id ? (
															<textarea
																className="w-full font-medium text-text-secondary resize-none border px-2 py-1 rounded bg-white"
																value={protocol.parameters[0].parameter_name}
																onChange={(e) =>
																	handleParameterInputChange(protocol.id, 0, 'parameter_name', e.target.value)
																}
															/>
														) : (
															<span
																className="block font-medium overflow-hidden text-text-secondary hover:overflow-y-auto"
																style={{
																	height: '40px',
																}}
															>
																{protocol.parameters[0].parameter_name}
															</span>
														)}
													</td>
													<td
														className={`p-1 text-start ${
															hoveredParameterId === protocol.parameters[0].id
																? 'bg-gray-300'
																: hoveredProtocolId === protocol.id
																? 'bg-gray-100'
																: ''
														}`}
														onMouseEnter={() => handleMouseEnterParameter(protocol.id, protocol.parameters[0].id)}
														onMouseLeave={handleMouseLeave}
													>
														{editingRow === protocol.id ? (
															<textarea
																className="w-full font-medium text-text-secondary resize-none border px-2 py-1 rounded bg-white"
																value={protocol.parameters[0].matrix}
																onChange={(e) => handleParameterInputChange(protocol.id, 0, 'matrix', e.target.value)}
															/>
														) : (
															<span
																className="block overflow-hidden text-text-secondary hover:overflow-y-auto"
																style={{
																	height: '40px',
																}}
															>
																{protocol.parameters[0].matrix}
															</span>
														)}
													</td>
													<td
														className={`p-1 text-start ${
															hoveredParameterId === protocol.parameters[0].id
																? 'bg-gray-300'
																: hoveredProtocolId === protocol.id
																? 'bg-gray-100'
																: ''
														}`}
														onMouseEnter={() => handleMouseEnterParameter(protocol.id, protocol.parameters[0].id)}
														onMouseLeave={handleMouseLeave}
													>
														{editingRow === protocol.id ? (
															<div className="relative">
																<button
																	className="w-full border px-2 py-1 rounded bg-white text-left"
																	onClick={() => toggleTechnicianDropdown(protocol.id, 0)}
																>
																	{technician(protocol.parameters[0]) || 'Chọn KTV'}
																</button>
																{technicianDropdownVisible &&
																	technicianDropdownVisible.protocolId === protocol.id &&
																	technicianDropdownVisible.paramIndex === 0 && (
																		<ul className="absolute w-full bg-white border rounded shadow-lg z-10">
																			{technicians.map((identity) => (
																				<li
																					key={identity.alias}
																					className="p-1 text-md cursor-pointer hover:bg-gray-200"
																					onClick={() =>
																						handleParameterInputChange(
																							protocol.id,
																							0,
																							'technician_uid',
																							identity.identity_uid,
																						)
																					}
																				>
																					<p className="font-bold text-primary text-sm">{identity.alias}</p>
																					<p>{identity.identity_name}</p>
																				</li>
																			))}
																		</ul>
																	)}
															</div>
														) : (
															<span
																className="block overflow-hidden hover:overflow-y-auto"
																style={{
																	height: '40px',
																}}
															>
																{technician(protocol.parameters[0]) || ''}
															</span>
														)}
													</td>
													<td
														className={`p-1 text-start ${
															hoveredParameterId === protocol.parameters[0].id
																? 'bg-gray-300'
																: hoveredProtocolId === protocol.id
																? 'bg-gray-100'
																: ''
														}`}
														onMouseEnter={() => handleMouseEnterParameter(protocol.id, protocol.parameters[0].id)}
														onMouseLeave={handleMouseLeave}
													>
														{editingRow === protocol.id ? (
															<React.Fragment>
																<input
																	type="number"
																	min="0"
																	className="w-14 border px-2 py-1 rounded bg-white"
																	value={protocol.parameters[0]?.tat_expected?.days}
																	onChange={(e) =>
																		handleParameterInputChange(protocol.id, 0, 'tat_expected', e.target.value)
																	}
																/>
																Ngày
															</React.Fragment>
														) : (
															<span
																className="block overflow-hidden hover:overflow-y-auto"
																style={{
																	height: '40px',
																}}
															>
																{protocol.parameters[0]?.tat_expected?.days
																	? protocol.parameters[0]?.tat_expected?.days + ' ngày'
																	: ''}
															</span>
														)}
													</td>
													<td
														className={`p-1 text-center ${
															hoveredParameterId === protocol.parameters[0].id
																? 'bg-gray-300'
																: hoveredProtocolId === protocol.id
																? 'bg-gray-100'
																: ''
														}`}
														onMouseEnter={() => handleMouseEnterParameter(protocol.id, protocol.parameters[0].id)}
														onMouseLeave={handleMouseLeave}
													>
														{editingRow === protocol.id ? (
															<React.Fragment>
																<button
																	className="text-blue-500 px-2 py-1 mr-1 focus:outline-none focus:border-none"
																	onClick={() => handleSaveParameterClick(protocol.id, 0)}
																>
																	<GiSave size={20} />
																</button>
																<button
																	className="text-red-500 px-2 py-1 focus:outline-none focus:border-none"
																	onClick={() => handleDeleteParameterClick(protocol.id, 0)}
																>
																	<GiTrashCan size={20} />
																</button>
															</React.Fragment>
														) : (
															<span className="block overflow-hidden"> </span>
														)}
													</td>
												</React.Fragment>
											) : (
												<td className="p-1 text-start text-" colSpan={5}>
													<span className="block overflow-hidden">Chưa có chỉ tiêu</span>
												</td>
											)}
											<td className="p-0 text-center" rowSpan={protocol.parameters.length || 1}>
												{editingRow === protocol.id ? (
													<React.Fragment>
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
														<button
															className="text-green-500 px-2 py-1 mt-1 focus:outline-none focus:border-none"
															onClick={() => handleAddParameterClick(protocol.id)}
														>
															Thêm mới
														</button>
													</React.Fragment>
												) : (
													<React.Fragment>
														<button
															className={`text-teal-500  p-1 focus:outline-none focus:border-none w-14' + ${
																!editTool && 'h-16 px-4'
															}`}
															onClick={() => handleRowDoubleClick(protocol)}
														>
															<LiaInfoSolid size={20} />
														</button>
														{editTool && (
															<React.Fragment>
																<button
																	className="text-blue-500 p-1 focus:outline-none focus:border-none "
																	onClick={() => setEditingRow(protocol.id)}
																>
																	<RiEdit2Line size={20} />
																</button>
																<button
																	className="text-red-500 p-1 focus:outline-none focus:border-none "
																	onClick={() => handleDeleteClick(protocol.id)}
																>
																	<GiTrashCan size={20} />
																</button>
															</React.Fragment>
														)}
													</React.Fragment>
												)}
											</td>
										</tr>
										{protocol.parameters.slice(1).map((param, paramIndex) => (
											<tr
												key={paramIndex}
												className={`border-b ${
													hoveredParameterId === param.id
														? 'bg-gray-300'
														: hoveredProtocolId === protocol.id
														? 'bg-gray-100'
														: ''
												}`}
												onMouseEnter={() => handleMouseEnterParameter(protocol.id, param.id)}
												onMouseLeave={handleMouseLeave}
											>
												<td className="p-1 text-start">
													{editingRow === protocol.id ? (
														<textarea
															className="w-full font-medium text-text-secondary resize-none border px-2 py-1 rounded bg-white"
															value={param.parameter_name}
															onChange={(e) =>
																handleParameterInputChange(
																	protocol.id,
																	paramIndex + 1,
																	'parameter_name',
																	e.target.value,
																)
															}
														/>
													) : (
														<span
															className="block font-medium overflow-hidden text-text-secondary hover:overflow-y-auto"
															style={{
																height: '40px',
															}}
														>
															{param.parameter_name}
														</span>
													)}
												</td>
												<td className="p-1 text-start">
													{editingRow === protocol.id ? (
														<textarea
															className="w-full font-medium text-text-secondary resize-none border px-2 py-1 rounded bg-white"
															value={param.matrix}
															onChange={(e) =>
																handleParameterInputChange(protocol.id, paramIndex + 1, 'matrix', e.target.value)
															}
														/>
													) : (
														<span
															className="block overflow-hidden text-text-secondary hover:overflow-y-auto"
															style={{
																height: '40px',
															}}
														>
															{param.matrix}
														</span>
													)}
												</td>
												<td className="p-1 text-start">
													{editingRow === protocol.id ? (
														<div className="relative">
															<button
																className="w-full border px-2 py-1 rounded bg-white text-left"
																onClick={() => toggleTechnicianDropdown(protocol.id, paramIndex + 1)}
															>
																{technician(param) || 'Chọn KTV'}
															</button>
															{technicianDropdownVisible &&
																technicianDropdownVisible.protocolId === protocol.id &&
																technicianDropdownVisible.paramIndex === paramIndex + 1 && (
																	<ul className="absolute w-full bg-white border rounded shadow-lg z-10">
																		{technicians.map((identity) => (
																			<li
																				key={identity.alias}
																				className="p-1 text-md cursor-pointer hover:bg-gray-200"
																				onClick={() =>
																					handleParameterInputChange(
																						protocol.id,
																						paramIndex + 1,
																						'technician_uid',
																						identity.identity_uid,
																					)
																				}
																			>
																				<p className="font-bold text-primary text-sm">{identity.alias}</p>
																				<p>{identity.identity_name}</p>
																			</li>
																		))}
																	</ul>
																)}
														</div>
													) : (
														<span
															className="block overflow-hidden hover:overflow-y-auto"
															style={{
																height: '40px',
															}}
														>
															{technician(param) || ''}
														</span>
													)}
												</td>
												<td className="p-1 text-start">
													{editingRow === protocol.id ? (
														<React.Fragment>
															<input
																type="number"
																min="0"
																className="w-14 border px-2 py-1 rounded bg-white"
																value={param?.tat_expected?.days}
																onChange={(e) =>
																	handleParameterInputChange(
																		protocol.id,
																		paramIndex + 1,
																		'tat_expected',
																		e.target.value,
																	)
																}
															/>
															Ngày
														</React.Fragment>
													) : (
														<span
															className="block overflow-hidden hover:overflow-y-auto"
															style={{
																height: '40px',
															}}
														>
															{param?.tat_expected?.days ? param.tat_expected.days + ' ngày' : ''}
														</span>
													)}
												</td>
												<td className="p-1 text-center">
													{editingRow === protocol.id && (
														<React.Fragment>
															<button
																className="text-blue-500 px-2 py-1 mr-1 focus:outline-none focus:border-none"
																onClick={() => handleSaveParameterClick(protocol.id, paramIndex + 1)}
															>
																<GiSave size={20} />
															</button>
															<button
																className="text-red-500 px-2 py-1 focus:outline-none focus:border-none"
																onClick={() => handleDeleteParameterClick(protocol.id, paramIndex + 1)}
															>
																<GiTrashCan size={20} />
															</button>
														</React.Fragment>
													)}
												</td>
											</tr>
										))}
									</React.Fragment>
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
