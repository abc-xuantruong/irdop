import * as React from 'react';
const { useContext, useState, useEffect } = React;
import FilterBar from './FilterBar';
import { GlobalContext } from '../contexts/GlobalContext';
import axios from 'axios';
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
		matrix: 'Đất',
		product_type: '',
		tat_expected: '1 day',
		default_unit: '',
		accreditation: '',
		technician_uid: '',
		protocol_code: '',
		parameter_uid: '',
		protocol_source: 'IRDOP',
	});
	const [protocols, setProtocols] = useState([]);
	const [protocolSearch, setProtocolSearch] = useState('');
	const [isProtocolDropdownVisible, setIsProtocolDropdownVisible] = useState(false);
	const [originalAnalytes, setOriginalAnalytes] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [protocolPage, setProtocolPage] = useState(1);
	const [listProtocol, setListProtocol] = useState([]);
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const [expandedRow, setExpandedRow] = useState(null);
	const [selectedAnalyteId, setSelectedAnalyteId] = useState(null);
	const protocolsPerPage = 5;
	const analytesPerPage = 20;
	let isFetch = false;

	useEffect(() => {
		setCurrentTitlePage('Chỉ tiêu');
	}, [setCurrentTitlePage]);

	useEffect(() => {
		if (technicians.length > 0 && !isFetch) {
			isFetch = true;
			fetchAnalytes();
		}
	}, [technicians]);

	const fetchAnalytes = async () => {
		try {
			const response = await axios.get('https://black.irdop.org/ha8i0uw2/db/get/parameter');
			const data = response.data.map((analyte) => ({
				...analyte,
				tat_expected: analyte?.tat_expected?.days
					? `${analyte.tat_expected.days} ${analyte.tat_expected.days > 1 ? 'days' : 'day'}`
					: '',
			}));
			setAnalytes(data);
			setOriginalAnalytes(data);
		} catch (error) {
			console.error('Error fetching analytes:', error);
		}
	};

	const technician = (param) => {
		const iden = technicians.find((identity) => identity.identity_uid === param.technician_uid);
		const ktv = iden ? iden.identity_name + ' (' + iden.alias + ')' : null;
		return ktv;
	};

	const fetchProtocols = async (searchTerm) => {
		try {
			if (listProtocol.length === 0) {
				const response = await axios.get('https://black.irdop.org/el9k24zah/db/get/protocol');
				setListProtocol(response.data);
			}
			const filteredProtocols = listProtocol.filter((protocol) => protocol.protocol_code?.includes(searchTerm));
			setProtocols(filteredProtocols);
		} catch (error) {
			console.error('Error fetching protocols:', error);
		}
	};

	const handleEditClick = (id) => {
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

			const response = await axios.post('https://black.irdop.org/ha8i0uw2/db/update/parameter', {
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
				const response = await axios.post('https://black.irdop.org/ha8i0uw2/db/delete/parameter', {
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
			const response = await axios.post('https://black.irdop.org/ha8i0uw2/db/insert/bulk/parameter', {
				parameters: [newAnalyte],
			});
			if (response.status === 200) {
				toast.success('New analyte added successfully');
				setAnalytes([...analytes, newAnalyte]);
				setIsAddingNew(false);
				setNewAnalyte({
					parameter_name: '',
					matrix: 'Đất',
					product_type: '',
					tat_expected: '1 day',
					default_unit: '',
					accreditation: '',
					technician_uid: technicians[0].identity_uid,
					protocol_code: '',
					parameter_uid: '',
					protocol_source: 'IRDOP',
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
			matrix: 'Đất',
			product_type: '',
			tat_expected: '1 day',
			default_unit: '',
			accreditation: '',
			technician_uid: technicians[0].identity_uid,
			protocol_code: '',
			parameter_uid: '',
			protocol_source: 'IRDOP',
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
								<th className="py-2 text-start pl-2 min-w-44 w-1/5 ">Nền mẫu</th>
								<th className="py-2 text-start pl-2 min-w-40 w-40">Loại sản phẩm</th>
								<th className="py-2 text-start pl-2 min-w-44 w-44">Code</th>
								<th className="py-2 text-start pl-2 min-w-24 w-24">Nguồn </th>
								<th className="py-2 text-start pl-2 min-w-16 w-20 ">TAT</th>
								<th className="py-2 text-start pl-2 min-w-16 w-16">Đơn vị</th>
								<th className="py-2 text-start pl-2 min-w-28 w-32">Công nhận</th>
								<th className="py-2 text-start pl-3 min-w-36 w-40">KTV</th>
								<th className="py-2 text-start pl-2 min-w-24 w-24">Thao tác</th>
							</tr>
						</thead>
						<tbody>
							{isAddingNew && (
								<tr className="border-t bg-blue-50">
									<td className="p-1 text-start">
										<p className="font-medium text-primary">{newAnalyte.parameter_uid}</p>
									</td>
									<td className="p-1 text-start">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.parameter_name}
											onChange={(e) => handleNewAnalyteChange('parameter_name', e.target.value)}
										/>
									</td>
									<td className="p-1 text-start">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.matrix}
											onChange={(e) => handleNewAnalyteChange('matrix', e.target.value)}
										/>
									</td>
									<td className="p-1 text-start">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.product_type || ''}
											onChange={(e) => handleNewAnalyteChange('product_type', e.target.value)}
										/>
									</td>
									<td className="p-1 text-start relative">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.protocol_code}
											onChange={(e) => handleNewAnalyteChange('protocol_code', e.target.value)}
										/>
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
									<td className="p-1 text-start">
										<select
											className="w-full border pb-1 rounded bg-white h-[50px] mb-1.5"
											value={newAnalyte.protocol_source}
											onChange={(e) => handleNewProtocolSourceChange(e.target.value)}
										>
											<option value="IRDOP">IRDOP</option>
											<option value="IRDOP VS">IRDOP VS</option>
										</select>
									</td>
									<td className="p-1 text-start">
										<div className=" bg-white border p-1 rounded  flex items-center h-[50px] mb-1.5">
											<input
												type="number"
												min="0"
												className="w-10 border px-0.5 py-1 rounded bg-white"
												value={newAnalyte.tat_expected}
												onChange={(e) => handleNewAnalyteChange('tat_expected', e.target.value)}
											/>
											<span className="ml-2">Ngày</span>
										</div>
									</td>
									<td className="p-1 text-center">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.default_unit || ''}
											onChange={(e) => handleNewAnalyteChange('default_unit', e.target.value)}
										/>
									</td>
									<td className="p-1 text-center flex flex-col items-start ">
										<label className="mt-1 flex items-center">
											<input
												type="checkbox"
												className="w-4 h-4"
												checked={newAnalyte.accreditation?.includes('VILAS 997')}
												onChange={() => handleNewAccreditationChange('VILAS 997')}
											/>
											<p className="ml-1">{'VILAS 997'}</p>
										</label>

										<label className="mt-1 flex items-center">
											<input
												type="checkbox"
												className="w-4 h-4"
												checked={newAnalyte.accreditation?.includes('107')}
												onChange={() => handleNewAccreditationChange('107')}
											/>
											<p className="ml-1">{'107'}</p>
										</label>
									</td>
									<td className="p-1 text-start">
										<div className="relative">
											<button
												className="w-full border border-slate-200 px-2 py-1 rounded bg-white text-left h-[50px] mb-1.5"
												onClick={() => toggleTechnicianDropdown('new')}
											>
												{technician({ technician_uid: newAnalyte.technician_uid }) || 'Chọn KTV'}
											</button>
											{technicianDropdownVisible === 'new' && (
												<ul className="absolute w-full bg-white border rounded shadow-lg z-10">
													{technicians.map((identity) => (
														<li
															key={identity.alias}
															className="p-1 text-md cursor-pointer hover:bg-gray-200"
															onClick={() => handleNewAnalyteChange('technician_uid', identity.identity_uid)}
														>
															<p className="font-bold text-primary text-sm">{identity.alias}</p>
															<p>{identity.identity_name}</p>
														</li>
													))}
												</ul>
											)}
										</div>
									</td>

									<td className="p-1 text-center ">
										<button
											className="text-blue-500 px-2 py-1 mr-1 focus:outline-none focus:border-none"
											onClick={handleSaveNewAnalyte}
										>
											<GiConfirmed size={20} />
										</button>
										<button
											className="text-red-500 px-2 ml-1 py-1 focus:outline-none focus:border-none"
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
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<textarea
												className="w-full border px-2 py-1 rounded bg-white resize-none"
												rows={2}
												value={analyte.parameter_name}
												onChange={(e) => handleInputChange(analyte.id, 'parameter_name', e.target.value)}
											/>
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
											<textarea
												className="w-full border px-2 py-1 rounded bg-white resize-none"
												rows={2}
												value={analyte.matrix}
												onChange={(e) => handleInputChange(analyte.id, 'matrix', e.target.value)}
											/>
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
											<textarea
												className="w-full border px-2 py-1 rounded bg-white resize-none"
												rows={2}
												value={analyte.product_type || ''}
												onChange={(e) => handleInputChange(analyte.id, 'product_type', e.target.value)}
											/>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.product_type}
											</span>
										)}
									</td>
									<td className="p-1 text-start relative">
										{editingRow === analyte.id ? (
											<textarea
												className="w-full border px-2 py-1 rounded bg-white resize-none"
												rows={2}
												value={analyte.protocol_code}
												onChange={(e) => handleProtocolSearchChange(analyte.id, e.target.value)}
											/>
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
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<select
												className="w-full border pb-1 rounded bg-white h-[50px] mb-1.5"
												value={analyte.protocol_source || ''}
												onChange={(e) => handleProtocolSourceChange(analyte.id, e.target.value)}
											>
												<option>Chọn</option>
												<option value="IRDOP">IRDOP</option>
												<option value="IRDOP VS">IRDOP VS</option>
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
									<td className="p-1 text-start ">
										{editingRow === analyte.id ? (
											<div className=" bg-white border p-1 rounded  flex items-center h-[50px] mb-1.5">
												<input
													type="number"
													min="0"
													className="w-10 border px-0.5 py-1 rounded bg-white"
													value={analyte.tat_expected}
													onChange={(e) => handleTatExpectedChange(analyte.id, e.target.value)}
												/>
												<span className="ml-2">Ngày</span>
											</div>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.tat_expected && analyte.tat_expected.slice(' ')[0] + ' ngày'}
											</span>
										)}
									</td>
									<td className="p-1 text-center">
										{editingRow === analyte.id ? (
											<textarea
												className="w-full border px-2 py-1 rounded bg-white resize-none"
												rows={2}
												value={analyte.default_unit || ''}
												onChange={(e) => handleInputChange(analyte.id, 'default_unit', e.target.value)}
											/>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.default_unit}
											</span>
										)}
									</td>
									<td className="p-1 text-start flex flex-col items-start">
										{editingRow === analyte.id ? (
											<>
												<label className="mt-1 flex items-center">
													<input
														type="checkbox"
														className="w-4 h-4"
														checked={analyte.accreditation?.includes('VILAS 997')}
														onChange={() => handleAccreditationChange(analyte.id, 'VILAS 997')}
													/>
													<p className="ml-1">{'VILAS 997'}</p>
												</label>
												<label className="mt-1 flex items-center">
													<input
														type="checkbox"
														className="w-4 h-4"
														checked={analyte.accreditation?.includes('107')}
														onChange={() => handleAccreditationChange(analyte.id, '107')}
													/>
													<p className="ml-1">{'107'}</p>
												</label>
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.accreditation}
											</span>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<div className="relative">
												<button
													className="w-full border border-slate-200 px-2 py-1 rounded bg-white text-left h-[50px] mb-1.5"
													onClick={() => toggleTechnicianDropdown(analyte.id)}
												>
													{technician(analyte) || 'Chọn KTV'}
												</button>
												{technicianDropdownVisible === analyte.id && (
													<ul className="absolute w-full bg-white border rounded shadow-lg z-10">
														{technicians.map((identity) => (
															<li
																key={identity.alias}
																className="p-1 text-md cursor-pointer hover:bg-gray-200"
																onClick={() => handleTechnicianChange(analyte.id, identity.identity_uid)}
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
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{technician(analyte)}
											</span>
										)}
									</td>

									<td className="p-1 text-center ">
										{editingRow === analyte.id ? (
											<>
												<button
													className="text-blue-500 px-2 py-1 mr-1 focus:outline-none focus:border-none"
													onClick={() => handleSaveClick(analyte.id)}
												>
													<GiConfirmed size={20} />
												</button>
												<button
													className="text-red-500 px-2 ml-1 py-1 focus:outline-none focus:border-none"
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
