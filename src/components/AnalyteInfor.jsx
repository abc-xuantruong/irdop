import * as React from 'react';
const { useContext, useState, useEffect } = React;
import FilterBar from './FilterBar';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import { RiEdit2Line } from 'react-icons/ri';
import { GiConfirmed, GiCancel, GiTrashCan } from 'react-icons/gi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AnalyteInfor = () => {
	const { setCurrentTitlePage, currentUser, technicians } = useContext(GlobalContext);
	const [analytes, setAnalytes] = useState([]);

	const [editingRow, setEditingRow] = useState(null);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [newAnalyte, setNewAnalyte] = useState({
		parameter_name: '',
		field: 'Hóa lý',
		matrix: '',
		product_type: '',
		tat_expected: '1 day',
		default_unit: '',
		accreditation: '',
		technician_uid: '',
		protocol_code: '',
		parameter_uid: '',
		protocol_source: 'IRDOP',
		threshold_limit: '',
		price: 0, // Added price field
	});
	const [protocolSearch, setProtocolSearch] = useState('');

	const [isProtocolDropdownVisible, setIsProtocolDropdownVisible] = useState(false);
	const [originalAnalytes, setOriginalAnalytes] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [protocolPage, setProtocolPage] = useState(1);
	const [listProtocol, setListProtocol] = useState([]);
	const [protocols, setProtocols] = useState([]); // Added missing protocols state
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const [expandedRow, setExpandedRow] = useState(null);
	const [selectedAnalyteId, setSelectedAnalyteId] = useState(null);

	// Add new state variables for unique lists and dropdowns
	const [uniqueParameterNames, setUniqueParameterNames] = useState([]);
	const [uniqueMatrices, setUniqueMatrices] = useState([]);
	const [uniqueProtocolCodes, setUniqueProtocolCodes] = useState([]);
	const [uniqueUnits, setUniqueUnits] = useState([]); // Added for default_unit
	const [protocolSources, setProtocolSources] = useState([]);
	const [parameterNameInput, setParameterNameInput] = useState('');
	const [matrixInput, setMatrixInput] = useState('');
	const [protocolCodeInput, setProtocolCodeInput] = useState('');
	const [unitInput, setUnitInput] = useState(''); // Added for default_unit
	const [showParameterNameDropdown, setShowParameterNameDropdown] = useState(false);
	const [showMatrixDropdown, setShowMatrixDropdown] = useState(false);
	const [showProtocolCodeDropdown, setShowProtocolCodeDropdown] = useState(false);
	const [showUnitDropdown, setShowUnitDropdown] = useState(false); // Added for default_unit
	const [editingParameterName, setEditingParameterName] = useState(null);
	const [editingMatrix, setEditingMatrix] = useState(null);
	const [editingProtocolCode, setEditingProtocolCode] = useState(null);
	const [editingUnit, setEditingUnit] = useState(null); // Added for default_unit

	const protocolsPerPage = 5;
	const analytesPerPage = 100; // Changed to show 10 rows per page
	let isFetch = false;

	// Add new state variables for pagination in dropdowns
	const [parameterNamePage, setParameterNamePage] = useState(1);
	const [matrixPage, setMatrixPage] = useState(1);
	const [protocolCodePage, setProtocolCodePage] = useState(1);
	const [unitPage, setUnitPage] = useState(1); // Added for default_unit
	const itemsPerPage = 10; // 10 items per page for all dropdowns

	useEffect(() => {
		setCurrentTitlePage('Chỉ tiêu');
	}, [setCurrentTitlePage]);

	useEffect(() => {
		if (technicians.length > 0 && !isFetch) {
			isFetch = true;
			fetchAnalytes();
			fetchMatricesList();
			fetchProtocolSourcesList();
			fetchUnitsList();
		}
	}, [technicians]);

	const fetchAnalytes = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/ha8i0uw2/db/get/parameter');
			const data = response.data.map((analyte) => ({
				...analyte,
				tat_expected: analyte?.tat_expected?.days
					? `${analyte.tat_expected.days} ${analyte.tat_expected.days > 1 ? 'days' : 'day'}`
					: '',
			}));
			setAnalytes(data);
			setOriginalAnalytes(data);

			// Extract unique lists
			extractUniqueLists(data);
		} catch (error) {
			console.error('Error fetching analytes:', error);
		}
	};

	const fetchMatricesList = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/get/list_enum/matrix');
			if (response.data && Array.isArray(response.data)) {
				setUniqueMatrices(response.data.filter(Boolean));
			}
		} catch (error) {
			console.error('Error fetching matrices list:', error);
		}
	};

	const fetchProtocolSourcesList = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/get/list_enum/protocol_source');
			if (response.data && Array.isArray(response.data)) {
				setProtocolSources(['--Chọn--', ...response.data.filter(Boolean)]);
			}
		} catch (error) {
			console.error('Error fetching protocol sources list:', error);
		}
	};

	const fetchUnitsList = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/get/list_enum/unit');
			if (response.data && Array.isArray(response.data)) {
				setUniqueUnits(response.data.filter(Boolean));
			}
		} catch (error) {
			console.error('Error fetching units list:', error);
		}
	};

	// Function to extract unique lists from data
	const extractUniqueLists = (data) => {
		const parameterNames = [...new Set(data.map((item) => item.parameter_name || '').filter(Boolean))];
		const protocolCodes = [...new Set(data.map((item) => item.protocol_code || '').filter(Boolean))];

		setUniqueParameterNames(parameterNames);
		setUniqueProtocolCodes(protocolCodes);
		// Note: uniqueMatrices and uniqueUnits are now fetched from API
	};

	// Modified filter functions with minimum character requirement
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

	// Filter for units - shows suggestions from first character but only when at least one character is entered
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

	// Handle selection from dropdowns
	const handleParameterNameSelect = (name) => {
		if (editingRow !== null) {
			handleInputChange(editingRow, 'parameter_name', name);
		} else if (isAddingNew) {
			handleNewAnalyteChange('parameter_name', name);
		}
		setShowParameterNameDropdown(false);
	};

	const handleMatrixSelect = (matrix) => {
		if (editingRow !== null) {
			handleInputChange(editingRow, 'matrix', matrix);
		} else if (isAddingNew) {
			handleNewAnalyteChange('matrix', matrix);
		}
		setShowMatrixDropdown(false);
	};

	const handleProtocolCodeSelect = (code) => {
		if (editingRow !== null) {
			handleInputChange(editingRow, 'protocol_code', code);
		} else if (isAddingNew) {
			handleNewAnalyteChange('protocol_code', code);
		}
		setShowProtocolCodeDropdown(false);
	};

	const handleUnitSelect = (unit) => {
		if (editingRow !== null) {
			handleInputChange(editingRow, 'default_unit', unit);
		} else if (isAddingNew) {
			handleNewAnalyteChange('default_unit', unit);
		}
		setShowUnitDropdown(false);
	};

	// Modified input change handlers
	const handleParameterNameInput = (id, value) => {
		setParameterNameInput(value);
		setParameterNamePage(1); // Reset to first page when typing
		if (editingRow !== null) {
			handleInputChange(id, 'parameter_name', value);
			setEditingParameterName(id);
		} else {
			handleNewAnalyteChange('parameter_name', value);
		}
		setShowParameterNameDropdown(true);
	};

	const handleMatrixInput = (id, value) => {
		setMatrixInput(value);
		setMatrixPage(1); // Reset to first page when typing
		if (editingRow !== null) {
			handleInputChange(id, 'matrix', value);
			setEditingMatrix(id);
		} else {
			handleNewAnalyteChange('matrix', value);
		}
		setShowMatrixDropdown(true);
	};

	const handleProtocolCodeInputChange = (id, value) => {
		setProtocolCodeInput(value);
		setProtocolCodePage(1); // Reset to first page when typing
		if (editingRow !== null) {
			handleInputChange(id, 'protocol_code', value);
			setEditingProtocolCode(id);
		} else {
			handleNewAnalyteChange('protocol_code', value);
		}
		setShowProtocolCodeDropdown(true);
	};

	const handleUnitInput = (id, value) => {
		setUnitInput(value);
		setUnitPage(1); // Reset to first page when typing
		if (editingRow !== null) {
			handleInputChange(id, 'default_unit', value);
			setEditingUnit(id);
		} else {
			handleNewAnalyteChange('default_unit', value);
		}
		// Only show dropdown if there are filtered units to display
		const filteredUnits = filterUnits(value);
		setShowUnitDropdown(filteredUnits.length > 0);
	};

	const technician = (param) => {
		const iden = technicians.find((identity) => identity.identity_uid === param.technician_uid);
		const ktv = iden ? iden.identity_name + ' (' + iden.alias + ')' : null;
		return ktv;
	};

	const fetchProtocols = async (searchTerm) => {
		try {
			if (listProtocol.length === 0) {
				const response = await apiGet('https://black.irdop.org/el9k24zah/db/get/protocol');
				setListProtocol(response.data || []);
			}
			const filteredProtocols = listProtocol.filter(
				(protocol) => protocol && protocol.protocol_code && protocol.protocol_code.includes(searchTerm || ''),
			);
			setProtocols(filteredProtocols || []);
		} catch (error) {
			console.error('Error fetching protocols:', error);
			setProtocols([]);
		}
	};

	const handleEditClick = (id) => {
		// Cancel add new state if active
		if (isAddingNew) {
			handleCancelNewAnalyte();
		}
		setEditingRow(id);
		setSelectedAnalyteId(id);
	};

	const handleSaveClick = async (id) => {
		const updatedAnalyte = analytes.find((analyte) => analyte.id === id);
		const days = parseInt(updatedAnalyte?.tat_expected.split(' ')[0]);
		if (isNaN(days)) {
			delete updatedAnalyte.tat_expected;
		} else {
			updatedAnalyte.tat_expected = `${days} ${days > 1 ? 'days' : 'day'}`;
		}
		updatedAnalyte.matrix = updatedAnalyte.matrix === 'Khác' ? customMatrix[id] : updatedAnalyte.matrix;

		try {
			// Add modified_by_uid to the parameter object
			updatedAnalyte.modified_by_uid = currentUser.identity_uid;

			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/update/parameter', {
				parameter: updatedAnalyte,
			});
			setEditingRow(null);
			if (response.status === 200) {
				toast.success('Analyte updated successfully');
				setOriginalAnalytes(analytes);
				await fetchAnalytes(); // Refresh data
			} else {
				toast.error('Analyte update failed');
			}
		} catch (error) {
			console.error('Error updating analyte:', error);
			toast.error('Analyte update failed');
		}
	};

	const handleCancelClick = () => {
		setAnalytes(originalAnalytes);
		setEditingRow(null);
	};

	const handleInputChange = (id, field, value) => {
		const updatedAnalytes = analytes.map((analyte) => {
			if (analyte.id === id) {
				return { ...analyte, [field]: value };
			}
			return analyte;
		});
		setAnalytes(updatedAnalytes);
	};

	const handleDeleteClick = async (id) => {
		const analyte = analytes.find((analyte) => analyte.id === id);
		setSelectedAnalyteId(analyte.id);
		const confirmed = window.confirm(`Bạn chắc chắn muốn xóa chỉ tiêu: ${analyte.parameter_name} (ID: ${analyte.id})?`);
		if (confirmed) {
			try {
				const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/delete/parameter', {
					id: analyte.id,
					modified_by_uid: currentUser.identity_uid,
				});
				if (response.status === 200) {
					toast.success('Analyte deleted successfully');
					setAnalytes(analytes.filter((analyte) => analyte.id !== id));
				} else {
					toast.error('Analyte deletion failed');
				}
			} catch (error) {
				console.error('Error deleting analyte:', error);
				toast.error('Analyte deletion failed');
			}
		}
	};

	const handleAddNewClick = () => {
		// Cancel editing state if active
		if (editingRow !== null) {
			handleCancelClick();
		}
		setIsAddingNew(true);
	};

	const handleNewAnalyteChange = (field, value) => {
		setNewAnalyte({ ...newAnalyte, [field]: value });
		if (field === 'protocol_code' && value.length >= 5) {
			fetchProtocols(value);
			setIsProtocolDropdownVisible(true);
		} else {
			setIsProtocolDropdownVisible(false);
		}
	};

	const handleSaveNewAnalyte = async () => {
		const days = parseInt(newAnalyte?.tat_expected.split(' ')[0]);
		if (isNaN(days)) {
			delete newAnalyte.tat_expected;
		} else {
			newAnalyte.tat_expected = `${days} ${days > 1 ? 'days' : 'day'}`;
		}
		newAnalyte.matrix = newAnalyte.matrix === 'Khác' ? customMatrix['new'] : newAnalyte.matrix;

		// Add created_by_uid and modified_by_uid to the newAnalyte object
		newAnalyte.created_by_uid = currentUser.identity_uid;
		newAnalyte.modified_by_uid = currentUser.identity_uid;

		try {
			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/insert/bulk/parameter', {
				parameters: [newAnalyte],
			});
			if (response.status === 200) {
				toast.success('New analyte added successfully');
				setAnalytes([...analytes, newAnalyte]);
				setIsAddingNew(false);
				setNewAnalyte({
					parameter_name: '',
					field: 'Hóa lý',
					matrix: 'Đất',
					product_type: '',
					tat_expected: '1 day',
					default_unit: '',
					accreditation: '',
					technician_uid: technicians[0].identity_uid,
					protocol_code: '',
					parameter_uid: '',
					protocol_source: 'IRDOP',
					threshold_limit: '',
					price: '', // Added price field
				});
				await fetchAnalytes(); // Refresh data
			} else {
				toast.error('Failed to add new analyte');
			}
		} catch (error) {
			console.error('Error adding new analyte:', error);
			toast.error('Failed to add new analyte');
		}
	};

	const handleCancelNewAnalyte = () => {
		setIsAddingNew(false);
		setNewAnalyte({
			parameter_name: '',
			field: 'Hóa lý',
			matrix: 'Đất',
			product_type: '',
			tat_expected: '1 day',
			default_unit: '',
			accreditation: '',
			technician_uid: technicians[0].identity_uid,
			protocol_code: '',
			parameter_uid: '',
			protocol_source: 'IRDOP',
			threshold_limit: '',
			price: '', // Added price field
		});
	};

	const handleAccreditationChange = (id, value) => {
		const updatedAnalytes = analytes.map((analyte) => {
			if (analyte.id === id) {
				const accreditations = analyte.accreditation ? analyte.accreditation.split(', ') : [];
				if (accreditations?.includes(value)) {
					return {
						...analyte,
						accreditation: accreditations.filter((acc) => acc !== value).join(', '),
					};
				} else {
					return {
						...analyte,
						accreditation: [...accreditations, value].join(', '),
					};
				}
			}
			return analyte;
		});
		setAnalytes(updatedAnalytes);
	};

	const handleNewAccreditationChange = (value) => {
		const accreditations = newAnalyte.accreditation ? newAnalyte.accreditation.split(', ') : [];
		if (accreditations?.includes(value)) {
			setNewAnalyte({
				...newAnalyte,
				accreditation: accreditations.filter((acc) => acc !== value).join(', '),
			});
		} else {
			setNewAnalyte({
				...newAnalyte,
				accreditation: [...accreditations, value].join(', '),
			});
		}
	};

	const handleProtocolSearchChange = (id, value) => {
		setProtocolSearch(value);
		handleInputChange(id, 'protocol_code', value);
		if (value.length >= 5) {
			fetchProtocols(value);
			setIsProtocolDropdownVisible(true);
			setProtocolPage(1);
		} else {
			setIsProtocolDropdownVisible(false);
		}
	};

	const handleProtocolSelect = (id, protocol) => {
		const updatedAnalytes = analytes.map((analyte) => {
			if (analyte.id === id) {
				return { ...analyte, protocol_id: protocol.id, protocol_code: protocol.protocol_code };
			}
			return analyte;
		});

		setAnalytes(updatedAnalytes);
		setIsProtocolDropdownVisible(false);
	};

	const handleNewProtocolSelect = (protocol) => {
		setNewAnalyte({ ...newAnalyte, protocol_code: protocol.protocol_code, protocol_id: protocol.id });
		setIsProtocolDropdownVisible(false);
	};

	const handleProtocolSourceChange = (id, value) => {
		const updatedAnalytes = analytes.map((analyte) => {
			if (analyte.id === id) {
				return { ...analyte, protocol_source: value };
			}
			return analyte;
		});
		setAnalytes(updatedAnalytes);
	};

	const handleNewProtocolSourceChange = (value) => {
		setNewAnalyte({ ...newAnalyte, protocol_source: value });
	};

	const handlePageChange = (pageNumber) => {
		setCurrentPage(pageNumber);
	};

	const handleProtocolPageChange = (pageNumber) => {
		setProtocolPage(pageNumber);
	};

	const handleTechnicianChange = (id, value) => {
		const updatedAnalytes = analytes.map((analyte) => {
			if (analyte.id === id) {
				return { ...analyte, technician_uid: value };
			}
			return analyte;
		});
		setAnalytes(updatedAnalytes);
		setTechnicianDropdownVisible(null); // Close dropdown after selection
	};

	const handleTatExpectedChange = (id, value) => {
		const updatedAnalytes = analytes.map((analyte) => {
			if (analyte.id === id) {
				return { ...analyte, tat_expected: value };
			}
			return analyte;
		});
		setAnalytes(updatedAnalytes);
	};

	const toggleTechnicianDropdown = (index) => {
		setTechnicianDropdownVisible((prevState) => (prevState === index ? null : index));
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

	const handleRowClick = (id) => {
		setExpandedRow(expandedRow === id ? null : id);
	};

	const totalPages = Math.ceil(analytes.length / analytesPerPage);
	const totalProtocolPages = Math.ceil(protocols.length / protocolsPerPage);
	const paginatedAnalytes = analytes.slice((currentPage - 1) * analytesPerPage, currentPage * analytesPerPage);
	const paginatedProtocols = protocols.slice((protocolPage - 1) * protocolsPerPage, protocolPage * protocolsPerPage);

	const renderPageNumbers = (totalPages, currentPage, handlePageChange) => {
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

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			<div className="w-full h-full rounded-lg bg-white p-2">
				<div className="flex justify-between items-center">
					<div className="relative"></div>
					<h2 className="text-4xl text-primary font-semibold py-2">Danh sách chỉ tiêu</h2>
					<div className="relative z-10">
						<button
							className="bg-blue-500 text-white px-4 py-0 w-44 rounded-lg font-medium focus:outline-none focus:border-none"
							onClick={handleAddNewClick}
						>
							Thêm mới
						</button>
					</div>
				</div>
				<div className=" w-full mb-2">
					<FilterBar source={originalAnalytes} setCurrentList={setAnalytes} typeSearch="parameter" />
				</div>

				<div className="rounded-lg border p-0.5 pb-0 relative z-0 overflow-x-auto" onMouseDown={handleTableMouseDown}>
					<table className="min-w-screen-xl bg-white text-sm">
						<thead className="border-b-2">
							<tr>
								<th className="py-2 text-start pl-2 min-w-24 w-24">UID</th>
								<th className="py-2 text-start pl-2 min-w-48 w-1/5 ">Tên chỉ tiêu</th>
								<th className="py-2 text-start pl-2 min-w-32 w-32">Lĩnh vực</th>
								<th className="py-2 text-start pl-2 min-w-44 w-1/5 ">Nền mẫu</th>
								<th className="py-2 text-start pl-2 min-w-24 w-24">Nguồn </th>
								<th className="py-2 text-start pl-2 min-w-44 w-44">Code</th>
								<th className="py-2 text-start pl-2 min-w-20 w-20">Đơn vị</th>
								<th className="py-2 text-start pl-2 min-w-40 w-40">Ngưỡng giới hạn</th>
								<th className="py-2 text-start pl-2 min-w-32 w-32">Giá thành</th>
								<th className="py-2 text-start pl-2 min-w-32 w-32">Chứng nhận</th>
							</tr>
						</thead>
						<tbody>
							{isAddingNew && (
								<tr className="border-t bg-blue-50">
									<td className="p-1 text-start">
										<p className="font-medium text-primary">{newAnalyte.parameter_uid}</p>
									</td>
									<td className="p-1 text-start relative">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.parameter_name}
											onChange={(e) => handleParameterNameInput('new', e.target.value)}
										/>
										{showParameterNameDropdown && (
											<div className="absolute w-full bg-white border rounded shadow-lg z-10">
												{getPaginatedParameterNames(parameterNameInput).map((name, index) => (
													<div
														key={index}
														className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
														onClick={() => handleParameterNameSelect(name)}
													>
														<p>{name}</p>
													</div>
												))}
												{/* Pagination controls for parameter name */}
												{filterParameterNames(parameterNameInput).length > itemsPerPage && (
													<div className="flex justify-between p-2 bg-gray-100">
														<button
															className="px-2 py-1 border rounded disabled:opacity-50"
															onClick={() => handleParameterNamePageChange(parameterNamePage - 1)}
															disabled={parameterNamePage === 1}
														>
															Prev
														</button>
														<span>
															{parameterNamePage}/
															{Math.ceil(filterParameterNames(parameterNameInput).length / itemsPerPage)}
														</span>
														<button
															className="px-2 py-1 border rounded disabled:opacity-50"
															onClick={() => handleParameterNamePageChange(parameterNamePage + 1)}
															disabled={
																parameterNamePage >=
																Math.ceil(filterParameterNames(parameterNameInput).length / itemsPerPage)
															}
														>
															Next
														</button>
													</div>
												)}
											</div>
										)}
									</td>
									<td className="p-1 text-start">
										<select
											className="w-full border p-2 rounded bg-white"
											value={newAnalyte.field || 'Hóa lý'}
											onChange={(e) => handleNewAnalyteChange('field', e.target.value)}
										>
											<option value="Hóa lý">Hóa lý</option>
											<option value="Vi sinh">Vi sinh</option>
										</select>
									</td>
									<td className="p-1 text-start relative">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.matrix}
											onChange={(e) => handleMatrixInput('new', e.target.value)}
										/>
										{showMatrixDropdown && (
											<div className="absolute w-full bg-white border rounded shadow-lg z-10">
												{getPaginatedMatrices(matrixInput).map((matrix, index) => (
													<div
														key={index}
														className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
														onClick={() => handleMatrixSelect(matrix)}
													>
														<p>{matrix}</p>
													</div>
												))}
												{/* Pagination controls for matrix */}
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
											</div>
										)}
									</td>
									<td className="p-1 text-start">
										<select
											className="w-full border p-2 px-0.5 rounded bg-white"
											value={newAnalyte.protocol_source}
											onChange={(e) => handleNewProtocolSourceChange(e.target.value)}
										>
											{protocolSources.map((source, index) => (
												<option key={index} value={source}>
													{source}
												</option>
											))}
										</select>
									</td>
									<td className="p-1 text-start relative">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.protocol_code}
											onChange={(e) => handleProtocolCodeInputChange('new', e.target.value)}
										/>
										{showProtocolCodeDropdown && (
											<div className="absolute w-full bg-white border rounded shadow-lg z-10">
												{getPaginatedProtocolCodes(protocolCodeInput).map((code, index) => (
													<div
														key={index}
														className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
														onClick={() => handleProtocolCodeSelect(code)}
													>
														<p>{code}</p>
													</div>
												))}
												{/* Pagination controls for protocol code */}
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
											</div>
										)}
										{isProtocolDropdownVisible && (
											<div className="absolute w-80 bg-white border rounded shadow-lg z-10">
												{paginatedProtocols.map((protocol, index) => (
													<div
														key={index}
														className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
														onClick={() => handleNewProtocolSelect(protocol)}
													>
														<p>{protocol.protocol_name}</p>
														<p className="text-sm text-gray-500">{protocol.protocol_code}</p>
													</div>
												))}
												{protocols.filter((protocol) => protocol.protocol_code?.includes(protocolSearch)).length >
													protocolsPerPage && (
													<div className="flex justify-between p-2">
														<button
															className="px-2 py-1 border rounded"
															onClick={() => handleProtocolPageChange(protocolPage - 1)}
															disabled={protocolPage === 1}
														>
															Previous
														</button>
														<button
															className="px-2 py-1 border rounded"
															onClick={() => (window.location.href = '/library/protocol')}
														>
															Thêm mới
														</button>
														<button
															className="px-2 py-1 border rounded"
															onClick={() => handleProtocolPageChange(protocolPage + 1)}
															disabled={protocolPage * protocolsPerPage >= protocols.length}
														>
															Next
														</button>
													</div>
												)}
											</div>
										)}
									</td>
									<td className="p-1 text-center relative">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.default_unit || ''}
											onChange={(e) => handleUnitInput('new', e.target.value)}
										/>
										{showUnitDropdown && (
											<div className="absolute w-full bg-white border rounded shadow-lg z-10">
												{getPaginatedUnits(unitInput).map((unit, index) => (
													<div
														key={index}
														className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
														onClick={() => handleUnitSelect(unit)}
													>
														<p>{unit}</p>
													</div>
												))}
												{/* Pagination controls for unit */}
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
											</div>
										)}
									</td>
									<td className="p-1 text-start">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.threshold_limit || ''}
											onChange={(e) => handleNewAnalyteChange('threshold_limit', e.target.value)}
										/>
									</td>
									<td className="p-1 text-start">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.price || ''}
											onChange={(e) => handleNewAnalyteChange('price', e.target.value)}
										/>
									</td>
									<td className="p-1 text-start">
										<div className="flex flex-col gap-1">
											<label className="flex items-center">
												<input
													type="checkbox"
													className="mr-2"
													checked={newAnalyte.accreditation?.includes('107')}
													onChange={() => handleNewAccreditationChange('107')}
												/>
												<span>107</span>
											</label>
											<label className="flex items-center">
												<input
													type="checkbox"
													className="mr-2"
													checked={newAnalyte.accreditation?.includes('VILAS 997')}
													onChange={() => handleNewAccreditationChange('VILAS 997')}
												/>
												<span>VILAS 997</span>
											</label>
										</div>
									</td>
									<td className="p-1 text-center  ">
										<button
											className="text-blue-500 px-2 py-1 focus:outline-none focus:border-none mb-0.5"
											onClick={handleSaveNewAnalyte}
										>
											<GiConfirmed size={20} />
										</button>
										<button
											className="text-red-500 px-2 py-1 focus:outline-none focus:border-none"
											onClick={handleCancelNewAnalyte}
										>
											<GiCancel size={20} />
										</button>
									</td>
								</tr>
							)}
							{paginatedAnalytes.map((analyte, index) => (
								<tr
									key={index}
									className={`border-t ${editingRow === analyte.id ? 'bg-blue-50' : ''} ${
										expandedRow === analyte.id ? '' : 'hover:bg-gray-100'
									}`}
									onClick={() => handleRowClick(analyte.id)}
								>
									<td className="p-1 text-start">
										<span
											className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
											style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
										>
											{analyte.parameter_uid}
										</span>
									</td>
									<td className="p-1 text-start relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.parameter_name}
													onChange={(e) => handleParameterNameInput(analyte.id, e.target.value)}
												/>
												{showParameterNameDropdown && editingParameterName === analyte.id && (
													<div className="absolute w-full bg-white border rounded shadow-lg z-10">
														{getPaginatedParameterNames(parameterNameInput).map((name, index) => (
															<div
																key={index}
																className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																onClick={() => handleParameterNameSelect(name)}
															>
																<p>{name}</p>
															</div>
														))}
														{/* Pagination controls for parameter name */}
														{filterParameterNames(parameterNameInput).length > itemsPerPage && (
															<div className="flex justify-between p-2 bg-gray-100">
																<button
																	className="px-2 py-1 border rounded disabled:opacity-50"
																	onClick={() => handleParameterNamePageChange(parameterNamePage - 1)}
																	disabled={parameterNamePage === 1}
																>
																	Prev
																</button>
																<span>
																	{parameterNamePage}/
																	{Math.ceil(filterParameterNames(parameterNameInput).length / itemsPerPage)}
																</span>
																<button
																	className="px-2 py-1 border rounded disabled:opacity-50"
																	onClick={() => handleParameterNamePageChange(parameterNamePage + 1)}
																	disabled={
																		parameterNamePage >=
																		Math.ceil(filterParameterNames(parameterNameInput).length / itemsPerPage)
																	}
																>
																	Next
																</button>
															</div>
														)}
													</div>
												)}
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.parameter_name}
											</span>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<select
												className="w-full border p-2 rounded bg-white"
												value={analyte.field || 'Hóa lý'}
												onChange={(e) => handleInputChange(analyte.id, 'field', e.target.value)}
											>
												<option value="Hóa lý">Hóa lý</option>
												<option value="Vi sinh">Vi sinh</option>
											</select>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.field || 'Hóa lý'}
											</span>
										)}
									</td>
									<td className="p-1 text-start relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.matrix}
													onChange={(e) => handleMatrixInput(analyte.id, e.target.value)}
												/>
												{showMatrixDropdown && editingMatrix === analyte.id && (
													<div className="absolute w-full bg-white border rounded shadow-lg z-10">
														{getPaginatedMatrices(matrixInput).map((matrix, index) => (
															<div
																key={index}
																className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																onClick={() => handleMatrixSelect(matrix)}
															>
																<p>{matrix}</p>
															</div>
														))}
														{/* Pagination controls for matrix */}
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
													</div>
												)}
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.matrix}
											</span>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<select
												className="w-full border p-2 px-0.5 rounded bg-white"
												value={analyte.protocol_source || ''}
												onChange={(e) => handleProtocolSourceChange(analyte.id, e.target.value)}
											>
												{protocolSources.map((source, index) => (
													<option key={index} value={source}>
														{source}
													</option>
												))}
											</select>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.protocol_source || ''}
											</span>
										)}
									</td>
									<td className="p-1 text-start relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.protocol_code}
													onChange={(e) => handleProtocolCodeInputChange(analyte.id, e.target.value)}
												/>
												{showProtocolCodeDropdown && editingProtocolCode === analyte.id && (
													<div className="absolute w-full bg-white border rounded shadow-lg z-10">
														{getPaginatedProtocolCodes(protocolCodeInput).map((code, index) => (
															<div
																key={index}
																className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																onClick={() => handleProtocolCodeSelect(code)}
															>
																<p>{code}</p>
															</div>
														))}
														{/* Pagination controls for protocol code */}
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
													</div>
												)}
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.protocol_code}
											</span>
										)}
										{isProtocolDropdownVisible && editingRow === analyte.id && (
											<div className="absolute w-80 bg-white border rounded shadow-lg z-10">
												{paginatedProtocols.map((protocol, index) => (
													<div
														key={index}
														className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
														onClick={() => handleProtocolSelect(analyte.id, protocol)}
													>
														<p>{protocol.protocol_name}</p>
														<p className="text-sm text-gray-500">{protocol.protocol_code}</p>
													</div>
												))}
												{protocols.filter((protocol) => protocol.protocol_code?.includes(protocolSearch)).length >
													protocolsPerPage && (
													<div className="flex justify-between p-2">
														<button
															className="px-2 py-1 border rounded"
															onClick={() => handleProtocolPageChange(protocolPage - 1)}
															disabled={protocolPage === 1}
														>
															Previous
														</button>
														<button
															className="px-2 py-1 border rounded"
															onClick={() => (window.location.href = '/library/protocol')}
														>
															Thêm mới
														</button>
														<button
															className="px-2 py-1 border rounded"
															onClick={() => handleProtocolPageChange(protocolPage + 1)}
															disabled={protocolPage * protocolsPerPage >= protocols.length}
														>
															Next
														</button>
													</div>
												)}
											</div>
										)}
									</td>
									<td className="p-1 text-center relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.default_unit || ''}
													onChange={(e) => handleUnitInput(analyte.id, e.target.value)}
												/>
												{showUnitDropdown && editingUnit === analyte.id && (
													<div className="absolute w-full bg-white border rounded shadow-lg z-10">
														{getPaginatedUnits(unitInput).map((unit, index) => (
															<div
																key={index}
																className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																onClick={() => handleUnitSelect(unit)}
															>
																<p>{unit}</p>
															</div>
														))}
														{/* Pagination controls for unit */}
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
													</div>
												)}
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.default_unit}
											</span>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<textarea
												className="w-full border px-2 py-1 rounded bg-white resize-none"
												rows={2}
												value={analyte.threshold_limit || ''}
												onChange={(e) => handleInputChange(analyte.id, 'threshold_limit', e.target.value)}
											/>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.threshold_limit || ''}
											</span>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<textarea
												className="w-full border px-2 py-1 rounded bg-white resize-none"
												rows={2}
												value={analyte.price || ''}
												onChange={(e) => handleInputChange(analyte.id, 'price', e.target.value)}
											/>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.price || ''}
											</span>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<div className="flex flex-col gap-1">
												<label className="flex items-center">
													<input
														type="checkbox"
														className="mr-2"
														checked={analyte.accreditation?.includes('107')}
														onChange={() => handleAccreditationChange(analyte.id, '107')}
													/>
													<span>107</span>
												</label>
												<label className="flex items-center">
													<input
														type="checkbox"
														className="mr-2"
														checked={analyte.accreditation?.includes('VILAS 997')}
														onChange={() => handleAccreditationChange(analyte.id, 'VILAS 997')}
													/>
													<span>VILAS 997</span>
												</label>
											</div>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.accreditation || ''}
											</span>
										)}
									</td>
									<td className="p-1 text-center ">
										{editingRow === analyte.id ? (
											<>
												<button
													className="text-blue-500 px-2 py-1 focus:outline-none focus:border-none mb-0.5"
													onClick={() => handleSaveClick(analyte.id)}
												>
													<GiConfirmed size={20} />
												</button>
												<button
													className="text-red-500 px-2 py-1 focus:outline-none focus:border-none"
													onClick={handleCancelClick}
												>
													<GiCancel size={20} />
												</button>
											</>
										) : (
											<>
												<button
													className="text-blue-500 px-2 py-1 focus:outline-none focus:border-none"
													onClick={() => handleEditClick(analyte.id)}
												>
													<RiEdit2Line size={20} />
												</button>
												<button
													className="text-red-500 px-2 py-1 focus:outline-none focus:border-none"
													onClick={() => handleDeleteClick(analyte.id)}
												>
													<GiTrashCan size={20} />
												</button>
											</>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="flex justify-center mt-4">{renderPageNumbers(totalPages, currentPage, handlePageChange)}</div>
			</div>
		</div>
	);
};

export default AnalyteInfor;
