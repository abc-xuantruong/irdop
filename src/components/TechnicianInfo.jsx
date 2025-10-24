import * as React from 'react';
const { useState, useEffect, useContext, useRef } = React;
import { createPortal } from 'react-dom';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../contexts/GlobalContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TechnicianManagement = () => {
	const { setCurrentTitlePage } = useContext(GlobalContext);
	const [technicians, setTechnicians] = useState([]);
	const [allEmployees, setAllEmployees] = useState([]);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState({});
	const [openDropdown, setOpenDropdown] = useState(null);
	const [expandedPositions, setExpandedPositions] = useState({});
	const [showGroupInfo, setShowGroupInfo] = useState({});

	// State để lưu trữ dữ liệu nhóm kỹ thuật viên từ API
	const [technicianGroups, setTechnicianGroups] = useState([]);

	useEffect(() => {
		setCurrentTitlePage('Quản lý kỹ thuật viên');
		fetchAllEmployees();
	}, [setCurrentTitlePage]);

	const fetchAllEmployees = async () => {
		setLoading(true);
		try {
			const response = await apiGet('https://pink.irdop.org/db/get/techinician');
			if (response.data && Array.isArray(response.data)) {
				// Xử lý dữ liệu mới từ API
				const allEmployeesData = [];
				const groupsData = response.data;

				// Trích xuất tất cả employees từ related_technicians của mỗi group
				groupsData.forEach((group) => {
					if (group.related_technicians && Array.isArray(group.related_technicians)) {
						allEmployeesData.push(...group.related_technicians);
					}
				});

				setAllEmployees(allEmployeesData);
				organizeTechnicians(groupsData, allEmployeesData);
			}
		} catch (error) {
			console.error('Error fetching employees:', error);
			toast.error('Có lỗi khi tải danh sách kỹ thuật viên');
		} finally {
			setLoading(false);
		}
	};

	const organizeTechnicians = (groupsData, employees) => {
		const technicianData = [];

		// Cập nhật technicianGroups từ API data
		const updatedGroups = groupsData.map((apiGroup) => ({
			groupName: apiGroup.groupName || `NHÓM ${apiGroup.alias?.replace('K0', '').replace('K', '')}`,
			technicianAlias: apiGroup.alias,
			parameters: apiGroup.parameters || [],
		}));

		// Cập nhật technicianGroups state
		setTechnicianGroups(updatedGroups);

		for (let i = 1; i <= 12; i++) {
			const mainTechCode = `K${i.toString().padStart(2, '0')}`;

			// Tìm group tương ứng
			const groupData = groupsData.find((g) => g.alias === mainTechCode);
			const relatedTechnicians = groupData?.related_technicians || [];

			// Find all employees with this main position code (including sub-positions)
			const relatedEmployees = relatedTechnicians.filter((emp) => emp.alias && emp.alias.startsWith(mainTechCode));

			// Separate main position and sub-positions
			const mainEmployee = relatedEmployees.find((emp) => emp.alias === mainTechCode);
			const subEmployees = relatedEmployees
				.filter((emp) => emp.alias !== mainTechCode && emp.alias.includes('-'))
				.sort((a, b) => {
					const aNum = parseInt(a.alias.split('-')[1]);
					const bNum = parseInt(b.alias.split('-')[1]);
					return aNum - bNum;
				});

			// Create main position entry
			const mainPosition = {
				techCode: mainTechCode,
				identity_uid: mainEmployee?.identity_uid || '',
				identity_name: mainEmployee?.identity_name || '',
				email: mainEmployee?.email || '',
				hasData: !!mainEmployee,
				isMainPosition: true,
				subPositions: [],
				groupInfo: groupData
					? {
							groupName: groupData.groupName,
							parameters: groupData.parameters || [],
					  }
					: null,
			};

			// Create sub-positions
			subEmployees.forEach((emp, index) => {
				const expectedAlias = `${mainTechCode}-${(index + 1).toString().padStart(2, '0')}`;
				mainPosition.subPositions.push({
					techCode: expectedAlias,
					actualAlias: emp.alias, // Keep track of the actual alias in case it needs correction
					identity_uid: emp.identity_uid,
					identity_name: emp.identity_name,
					email: emp.email,
					hasData: true,
					isMainPosition: false,
				});
			});

			technicianData.push(mainPosition);
		}

		setTechnicians(technicianData);
	};

	const getGroupInfo = (technicianAlias) => {
		const technician = technicians.find((t) => t.techCode === technicianAlias);
		if (technician && technician.groupInfo) {
			return {
				groupName: technician.groupInfo.groupName,
				technicianAlias: technicianAlias,
				parameters: technician.groupInfo.parameters,
			};
		}
		// Fallback to static data if no dynamic data
		return technicianGroups.find((group) => group.technicianAlias === technicianAlias);
	};

	const getRelatedTechnicians = (mainTechCode) => {
		const mainTech = technicians.find((t) => t.techCode === mainTechCode);
		if (!mainTech) return [];

		const related = [];

		// Thêm người phụ trách chính
		if (mainTech.hasData) {
			related.push({
				role: 'Người phụ trách chính',
				techCode: mainTech.techCode,
				name: mainTech.identity_name,
				uid: mainTech.identity_uid,
				email: mainTech.email,
			});
		}

		// Thêm những người liên quan (sub-positions)
		mainTech.subPositions.forEach((subPos, index) => {
			if (subPos.hasData) {
				related.push({
					role: `Người liên quan ${index + 1}`,
					techCode: subPos.techCode,
					name: subPos.identity_name,
					uid: subPos.identity_uid,
					email: subPos.email,
				});
			}
		});

		return related;
	};

	const toggleGroupInfo = (techCode) => {
		setShowGroupInfo((prev) => ({
			...prev,
			[techCode]: !prev[techCode],
		}));
	};

	const handleOpenDropdown = (techCode) => {
		if (openDropdown === techCode) {
			setOpenDropdown(null);
		} else {
			setOpenDropdown(techCode);
		}
	};

	const toggleExpanded = (mainTechCode) => {
		setExpandedPositions((prev) => ({
			...prev,
			[mainTechCode]: !prev[mainTechCode],
		}));
	};

	const addSubPosition = async (mainTechCode) => {
		const mainPosition = technicians.find((t) => t.techCode === mainTechCode);
		if (!mainPosition) return;

		const nextSubNumber = (mainPosition.subPositions.length + 1).toString().padStart(2, '0');
		const newAlias = `${mainTechCode}-${nextSubNumber}`;

		// Update local state immediately
		setTechnicians((prev) =>
			prev.map((tech) =>
				tech.techCode === mainTechCode
					? {
							...tech,
							subPositions: [
								...tech.subPositions,
								{
									techCode: newAlias,
									actualAlias: newAlias,
									identity_uid: '',
									identity_name: '',
									email: '',
									hasData: false,
									isMainPosition: false,
								},
							],
					  }
					: tech,
			),
		);

		// Expand the section to show the new position
		setExpandedPositions((prev) => ({
			...prev,
			[mainTechCode]: true,
		}));

		toast.info(`Đã thêm vị trí phụ ${newAlias}`);
	};

	const removeSubPosition = async (mainTechCode, subIndex) => {
		const mainPosition = technicians.find((t) => t.techCode === mainTechCode);
		if (!mainPosition || !mainPosition.subPositions[subIndex]) return;

		const subPosition = mainPosition.subPositions[subIndex];

		// If the sub-position has an assigned employee, remove the assignment first
		if (subPosition.hasData) {
			try {
				await apiPost('https://pink.irdop.org/v1/update/technician/alias', {
					alias: '',
					identity_uid: subPosition.identity_uid,
				});
			} catch (error) {
				console.error('Error removing assignment:', error);
				toast.error('Có lỗi khi xóa phân công');
				return;
			}
		}

		// Remove the sub-position and renumber the remaining ones
		setTechnicians((prev) =>
			prev.map((tech) =>
				tech.techCode === mainTechCode
					? {
							...tech,
							subPositions: tech.subPositions
								.filter((_, index) => index !== subIndex)
								.map((subPos, newIndex) => ({
									...subPos,
									techCode: `${mainTechCode}-${(newIndex + 1).toString().padStart(2, '0')}`,
									actualAlias: subPos.hasData
										? `${mainTechCode}-${(newIndex + 1).toString().padStart(2, '0')}`
										: subPos.actualAlias,
								})),
					  }
					: tech,
			),
		);

		// Update API for renumbered positions that have data
		const updatedMainPosition = technicians.find((t) => t.techCode === mainTechCode);
		if (updatedMainPosition) {
			const positionsToUpdate = updatedMainPosition.subPositions.filter(
				(_, index) => index > subIndex && updatedMainPosition.subPositions[index]?.hasData,
			);

			for (let i = 0; i < positionsToUpdate.length; i++) {
				const posToUpdate = positionsToUpdate[i];
				const newAlias = `${mainTechCode}-${(subIndex + i + 1).toString().padStart(2, '0')}`;

				try {
					await apiPost('https://pink.irdop.org/v1/update/technician/alias', {
						alias: newAlias,
						identity_uid: posToUpdate.identity_uid,
					});
				} catch (error) {
					console.error('Error updating position alias:', error);
				}
			}
		}

		// Update allEmployees state to reflect the changes
		setAllEmployees((prev) =>
			prev.map((emp) => {
				if (emp.identity_uid === subPosition.identity_uid) {
					return { ...emp, alias: '' };
				}
				// Update aliases for renumbered positions
				const updatedPos = updatedMainPosition?.subPositions.find((sp) => sp.identity_uid === emp.identity_uid);
				if (updatedPos && emp.alias !== updatedPos.techCode) {
					return { ...emp, alias: updatedPos.techCode };
				}
				return emp;
			}),
		);

		toast.success(`Đã xóa vị trí phụ và cập nhật lại thứ tự`);
	};

	const handleTechnicianChange = async (alias, selectedEmployeeUid, isMainPosition = true, mainTechCode = null) => {
		if (!selectedEmployeeUid) {
			return;
		}

		setUpdating((prev) => ({ ...prev, [alias]: true }));
		setOpenDropdown(null);

		try {
			const response = await apiPost('https://pink.irdop.org/v1/update/technician/alias', {
				alias: alias,
				identity_uid: selectedEmployeeUid,
			});

			if (response.status === 200) {
				toast.success(`Cập nhật kỹ thuật viên ${alias} thành công`);

				const selectedEmployee = allEmployees.find((emp) => emp.identity_uid === selectedEmployeeUid);

				if (isMainPosition) {
					// Update main position
					setTechnicians((prev) =>
						prev.map((tech) =>
							tech.techCode === alias
								? {
										...tech,
										identity_uid: selectedEmployeeUid,
										identity_name: selectedEmployee?.identity_name || '',
										email: selectedEmployee?.email || '',
										hasData: true,
								  }
								: tech,
						),
					);
				} else {
					// Update sub-position
					setTechnicians((prev) =>
						prev.map((tech) =>
							tech.techCode === mainTechCode
								? {
										...tech,
										subPositions: tech.subPositions.map((subPos) =>
											subPos.techCode === alias
												? {
														...subPos,
														identity_uid: selectedEmployeeUid,
														identity_name: selectedEmployee?.identity_name || '',
														email: selectedEmployee?.email || '',
														hasData: true,
														actualAlias: alias,
												  }
												: subPos,
										),
								  }
								: tech,
						),
					);
				}

				setAllEmployees((prev) =>
					prev.map((emp) =>
						emp.identity_uid === selectedEmployeeUid
							? { ...emp, alias: alias }
							: emp.alias === alias && emp.identity_uid !== selectedEmployeeUid
							? { ...emp, alias: '' }
							: emp,
					),
				);
			} else {
				toast.error(`Cập nhật kỹ thuật viên ${alias} thất bại`);
			}
		} catch (error) {
			console.error('Error updating technician:', error);
			toast.error(`Có lỗi khi cập nhật kỹ thuật viên ${alias}`);
		} finally {
			setUpdating((prev) => ({ ...prev, [alias]: false }));
		}
	};

	const handleRemoveAssignment = async (alias, isMainPosition = true, mainTechCode = null) => {
		setUpdating((prev) => ({ ...prev, [alias]: true }));
		setOpenDropdown(null);

		try {
			let currentUid = '';

			if (isMainPosition) {
				const tech = technicians.find((t) => t.techCode === alias);
				currentUid = tech?.identity_uid;
			} else {
				const mainTech = technicians.find((t) => t.techCode === mainTechCode);
				const subPos = mainTech?.subPositions.find((sp) => sp.techCode === alias);
				currentUid = subPos?.identity_uid;
			}

			const response = await apiPost('https://pink.irdop.org/v1/update/technician/alias', {
				alias: '',
				identity_uid: currentUid,
			});

			if (response.status === 200) {
				toast.success(`Xóa phân công ${alias} thành công`);

				if (isMainPosition) {
					// Remove assignment from main position
					setTechnicians((prev) =>
						prev.map((tech) =>
							tech.techCode === alias
								? {
										...tech,
										identity_uid: '',
										identity_name: '',
										email: '',
										hasData: false,
								  }
								: tech,
						),
					);
				} else {
					// Remove assignment from sub-position
					setTechnicians((prev) =>
						prev.map((tech) =>
							tech.techCode === mainTechCode
								? {
										...tech,
										subPositions: tech.subPositions.map((subPos) =>
											subPos.techCode === alias
												? {
														...subPos,
														identity_uid: '',
														identity_name: '',
														email: '',
														hasData: false,
												  }
												: subPos,
										),
								  }
								: tech,
						),
					);
				}

				setAllEmployees((prev) => prev.map((emp) => (emp.alias === alias ? { ...emp, alias: '' } : emp)));
			} else {
				toast.error(`Xóa phân công ${alias} thất bại`);
			}
		} catch (error) {
			console.error('Error removing assignment:', error);
			toast.error(`Có lỗi khi xóa phân công ${alias}`);
		} finally {
			setUpdating((prev) => ({ ...prev, [alias]: false }));
		}
	};

	const getAvailableEmployees = () => {
		// Trả về tất cả nhân viên để có thể thay đổi phân công
		return allEmployees;
	};

	const handleRefresh = () => {
		fetchAllEmployees();
		toast.info('Đang tải lại danh sách...');
	};

	const handleClickOutside = (e) => {
		if (!e.target.closest('.dropdown-container') && !e.target.closest('.dropdown-portal')) {
			setOpenDropdown(null);
		}
	};

	useEffect(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, []);

	if (loading) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<p className="text-gray-600">Đang tải danh sách kỹ thuật viên...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			<div className="w-full h-full rounded-lg bg-white p-4">
				{/* Header */}
				<div className="flex justify-between items-center mb-6">
					<div className="flex items-center space-x-4">
						<h2 className="text-4xl text-primary font-semibold">Danh sách kỹ thuật viên</h2>
						<span className="text-gray-500 text-sm">Cập nhật: {new Date().toLocaleString('vi-VN')}</span>
					</div>
					<button
						className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
						onClick={handleRefresh}
					>
						Làm mới
					</button>
				</div>

				{/* Statistics */}
				<div className="grid grid-cols-4 gap-4 mb-6">
					<div className="bg-green-50 border border-green-200 rounded-lg p-4">
						<div className="text-green-800 text-lg font-semibold">
							{technicians.filter((t) => t.hasData).length +
								technicians.reduce((sum, t) => sum + t.subPositions.filter((sp) => sp.hasData).length, 0)}
						</div>
						<div className="text-green-600 text-sm">Vị trí có kỹ thuật viên</div>
					</div>
					<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
						<div className="text-gray-800 text-lg font-semibold">
							{technicians.filter((t) => !t.hasData).length +
								technicians.reduce((sum, t) => sum + t.subPositions.filter((sp) => !sp.hasData).length, 0)}
						</div>
						<div className="text-gray-600 text-sm">Vị trí trống</div>
					</div>
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div className="text-blue-800 text-lg font-semibold">
							{12 + technicians.reduce((sum, t) => sum + t.subPositions.length, 0)}
						</div>
						<div className="text-blue-600 text-sm">Tổng vị trí</div>
					</div>
					<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
						<div className="text-purple-800 text-lg font-semibold">{technicianGroups.length}</div>
						<div className="text-purple-600 text-sm">Nhóm chuyên môn</div>
					</div>
				</div>

				{/* Table */}
				<div className="rounded-lg border overflow-hidden shadow-sm">
					<table className="w-full bg-white">
						<thead className="bg-gray-50 border-b-2 border-gray-200">
							<tr>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-16">STT</th>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-36">Mã kỹ thuật viên</th>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-48">Nhóm chuyên môn</th>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-40">Mã nhân viên</th>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 flex-1">Họ tên</th>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-32">Thao tác</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{technicians.map((technician, index) => (
								<React.Fragment key={technician.techCode}>
									{/* Main position row */}
									<tr className={`hover:bg-gray-50 transition-colors ${!technician.hasData ? 'bg-red-50' : ''}`}>
										<td className="py-3 px-4 text-left text-sm text-gray-900">{index + 1}</td>
										<td className="py-3 px-4 text-left">
											<div className="flex items-center space-x-2">
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
													{technician.techCode}
												</span>
												{technician.subPositions.length > 0 && (
													<button
														onClick={() => toggleExpanded(technician.techCode)}
														className="text-gray-400 hover:text-gray-600 p-1"
														title={expandedPositions[technician.techCode] ? 'Thu gọn' : 'Mở rộng'}
													>
														<svg
															className={`w-4 h-4 transform transition-transform ${
																expandedPositions[technician.techCode] ? 'rotate-90' : ''
															}`}
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
														</svg>
													</button>
												)}
											</div>
										</td>
										<td className="py-3 px-4 text-left">
											{(() => {
												const groupInfo = getGroupInfo(technician.techCode);
												if (!groupInfo) return <span className="text-gray-400 italic text-sm">Chưa xác định</span>;

												return (
													<div className="space-y-1">
														<div className="flex items-center space-x-2">
															<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
																{groupInfo.groupName}
															</span>
															<button
																onClick={() => toggleGroupInfo(technician.techCode)}
																className="text-blue-500 hover:text-blue-700 text-xs"
																title="Xem tham số"
															>
																<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
																	/>
																</svg>
															</button>
														</div>
														{showGroupInfo[technician.techCode] && (
															<div className="text-xs text-gray-600 bg-gray-50 p-3 rounded mt-2 max-h-32 overflow-y-auto">
																<div className="font-medium mb-2 text-left">Tham số chịu trách nhiệm:</div>
																<ul className="list-none space-y-1 text-left">
																	{groupInfo.parameters.map((param, idx) => (
																		<li key={idx} className="text-xs flex items-start">
																			<span className="flex w-4 h-4 bg-blue-100 text-blue-800 rounded-full text-xs font-medium items-center justify-center mt-0.5 mr-2 flex-shrink-0">
																				{idx + 1}
																			</span>
																			<span>{param}</span>
																		</li>
																	))}
																</ul>
															</div>
														)}
													</div>
												);
											})()}
										</td>
										<td className="py-3 px-4 text-left text-sm text-gray-900">
											{technician.identity_uid ? (
												<span className="font-medium">{technician.identity_uid}</span>
											) : (
												<span className="text-gray-400 italic">Chưa có dữ liệu</span>
											)}
										</td>
										<td className="py-3 px-4 text-left relative dropdown-container">
											<div
												id={`select-${technician.techCode}`}
												className="cursor-pointer p-2 rounded border border-gray-300 hover:bg-gray-50 min-h-[40px] flex items-center justify-between"
												onClick={() => handleOpenDropdown(technician.techCode)}
											>
												<span className={technician.identity_name ? 'text-gray-900' : 'text-gray-400 italic'}>
													{technician.identity_name || 'Chưa phân công'}
												</span>
												<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
												</svg>
											</div>

											{updating[technician.techCode] && (
												<div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10">
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
												</div>
											)}

											{openDropdown === technician.techCode &&
												createPortal(
													<div
														className="dropdown-portal absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
														style={{
															width: document.getElementById(`select-${technician.techCode}`)?.offsetWidth + 'px',
															top:
																document.getElementById(`select-${technician.techCode}`)?.getBoundingClientRect()
																	.bottom + window.scrollY,
															left:
																document.getElementById(`select-${technician.techCode}`)?.getBoundingClientRect().left +
																window.scrollX,
														}}
													>
														{technician.hasData && (
															<div
																className="px-3 py-2 hover:bg-red-50 cursor-pointer text-red-600 border-b"
																onClick={() => handleRemoveAssignment(technician.techCode, true)}
															>
																Xóa phân công
															</div>
														)}
														{getAvailableEmployees().map((employee) => (
															<div
																key={employee.identity_uid}
																className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
																onClick={() => handleTechnicianChange(technician.techCode, employee.identity_uid, true)}
															>
																<div className="text-sm font-medium text-gray-900">{employee.identity_name}</div>
																<div className="text-xs text-gray-500">
																	{employee.identity_uid} • {employee.email}
																</div>
															</div>
														))}
														{getAvailableEmployees().length === 0 && !technician.hasData && (
															<div className="px-3 py-2 text-gray-400 text-sm">Không có nhân viên khả dụng</div>
														)}
													</div>,
													document.body,
												)}
										</td>
										<td className="py-3 px-4 text-left">
											<button
												onClick={() => addSubPosition(technician.techCode)}
												className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
												title="Thêm vị trí phụ"
											>
												+ Thêm
											</button>
										</td>
									</tr>

									{/* Sub-positions rows */}
									{expandedPositions[technician.techCode] &&
										technician.subPositions.map((subPosition, subIndex) => (
											<tr
												key={subPosition.techCode}
												className={`hover:bg-gray-50 transition-colors ${
													!subPosition.hasData ? 'bg-red-50' : 'bg-blue-50'
												}`}
											>
												<td className="py-2 px-4 text-left text-sm text-gray-900">
													<div className="ml-4 text-xs text-gray-500">
														└ {index + 1}.{subIndex + 1}
													</div>
												</td>
												<td className="py-2 px-4 text-left">
													<div className="ml-4">
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
															{subPosition.techCode}
														</span>
													</div>
												</td>
												<td className="py-2 px-4 text-left">
													<div className="ml-4">
														<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
															Người liên quan
														</span>
													</div>
												</td>
												<td className="py-2 px-4 text-left text-sm text-gray-900">
													<div className="ml-4">
														{subPosition.identity_uid ? (
															<span className="font-medium text-sm">{subPosition.identity_uid}</span>
														) : (
															<span className="text-gray-400 italic text-sm">Chưa có dữ liệu</span>
														)}
													</div>
												</td>
												<td className="py-2 px-4 text-left relative dropdown-container">
													<div className="ml-4">
														<div
															id={`select-${subPosition.techCode}`}
															className="cursor-pointer p-2 rounded border border-gray-300 hover:bg-gray-50 min-h-[36px] flex items-center justify-between text-sm"
															onClick={() => handleOpenDropdown(subPosition.techCode)}
														>
															<span className={subPosition.identity_name ? 'text-gray-900' : 'text-gray-400 italic'}>
																{subPosition.identity_name || 'Chưa phân công'}
															</span>
															<svg
																className="w-3 h-3 text-gray-400"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
															</svg>
														</div>

														{updating[subPosition.techCode] && (
															<div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10">
																<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
															</div>
														)}

														{openDropdown === subPosition.techCode &&
															createPortal(
																<div
																	className="dropdown-portal absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
																	style={{
																		width:
																			document.getElementById(`select-${subPosition.techCode}`)?.offsetWidth + 'px',
																		top:
																			document.getElementById(`select-${subPosition.techCode}`)?.getBoundingClientRect()
																				.bottom + window.scrollY,
																		left:
																			document.getElementById(`select-${subPosition.techCode}`)?.getBoundingClientRect()
																				.left + window.scrollX,
																	}}
																>
																	{subPosition.hasData && (
																		<div
																			className="px-3 py-2 hover:bg-red-50 cursor-pointer text-red-600 border-b"
																			onClick={() =>
																				handleRemoveAssignment(subPosition.techCode, false, technician.techCode)
																			}
																		>
																			Xóa phân công
																		</div>
																	)}
																	{getAvailableEmployees().map((employee) => (
																		<div
																			key={employee.identity_uid}
																			className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
																			onClick={() =>
																				handleTechnicianChange(
																					subPosition.techCode,
																					employee.identity_uid,
																					false,
																					technician.techCode,
																				)
																			}
																		>
																			<div className="text-sm font-medium text-gray-900">{employee.identity_name}</div>
																			<div className="text-xs text-gray-500">
																				{employee.identity_uid} • {employee.email}
																			</div>
																		</div>
																	))}
																	{getAvailableEmployees().length === 0 && !subPosition.hasData && (
																		<div className="px-3 py-2 text-gray-400 text-sm">Không có nhân viên khả dụng</div>
																	)}
																</div>,
																document.body,
															)}
													</div>
												</td>
												<td className="py-2 px-4 text-left">
													<div className="ml-4">
														<button
															onClick={() => removeSubPosition(technician.techCode, subIndex)}
															className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
															title="Xóa vị trí phụ"
														>
															Xóa
														</button>
													</div>
												</td>
											</tr>
										))}
								</React.Fragment>
							))}
						</tbody>
					</table>
				</div>

				{/* Group Overview Section */}
				<div className="mt-8 space-y-6">
					<h3 className="text-2xl font-semibold text-gray-800">Tổng quan các nhóm chuyên môn</h3>
					<div className="space-y-6">
						{technicians
							.filter((t) => t.groupInfo)
							.map((technician, groupIndex) => {
								const group = technician.groupInfo;
								const relatedTechs = getRelatedTechnicians(technician.techCode);

								return (
									<div key={technician.techCode} className="bg-white border rounded-lg shadow-sm p-6">
										{/* Header */}
										<div className="flex items-start justify-between mb-4 pb-4 border-b">
											<div>
												<h4 className="text-xl font-semibold text-gray-900">{group.groupName}</h4>
												<p className="text-sm text-gray-600 mt-1">Mã: {technician.techCode}</p>
											</div>
											<span
												className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
													relatedTechs.length > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
												}`}
											>
												{relatedTechs.length} người
											</span>
										</div>

										{/* Content - 2 columns layout */}
										<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
											{/* Left side - Người phụ trách */}
											<div className="space-y-4">
												<h5 className="text-lg font-medium text-gray-800 text-left">Người phụ trách</h5>

												{relatedTechs.length > 0 ? (
													<div className="space-y-3">
														{relatedTechs.map((tech, techIndex) => (
															<div key={techIndex} className="bg-gray-50 rounded-lg p-4">
																<div className="flex flex-col space-y-2">
																	<div className="flex items-center space-x-2">
																		<span
																			className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
																				tech.role === 'Người phụ trách chính'
																					? 'bg-blue-100 text-blue-800'
																					: 'bg-green-100 text-green-800'
																			}`}
																		>
																			{tech.role}
																		</span>
																		<span className="font-semibold text-gray-900">{tech.name}</span>
																	</div>
																	<div className="text-sm text-gray-600 text-left">
																		<div>
																			<strong>Mã vị trí:</strong> {tech.techCode}
																		</div>
																		<div>
																			<strong>Mã nhân viên:</strong> {tech.uid}
																		</div>
																		<div>
																			<strong>Email:</strong> {tech.email}
																		</div>
																	</div>
																</div>
															</div>
														))}
													</div>
												) : (
													<div className="bg-red-50 border border-red-200 rounded-lg p-4">
														<div className="text-sm text-red-700 text-left">
															<strong>Chưa có người được phân công</strong>
														</div>
														<div className="text-xs text-red-600 mt-1 text-left">
															Vui lòng phân công kỹ thuật viên cho vị trí {technician.techCode}
														</div>
													</div>
												)}
											</div>

											{/* Right side - Các phép thử */}
											<div className="space-y-4">
												<div className="flex items-center justify-between">
													<h5 className="text-lg font-medium text-gray-800 text-left">Các phép thử chịu trách nhiệm</h5>
													<span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full">
														{group.parameters.length} phép thử
													</span>
												</div>

												<div className="bg-blue-50 rounded-lg p-4 max-h-80 overflow-y-auto">
													<ul className="space-y-2">
														{group.parameters.map((param, paramIndex) => (
															<li key={paramIndex} className="flex items-start text-left">
																<span className="flex w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-medium items-center justify-center mt-0.5 mr-3 flex-shrink-0">
																	{paramIndex + 1}
																</span>
																<span className="text-sm text-gray-800 leading-relaxed">{param}</span>
															</li>
														))}
													</ul>
												</div>
											</div>
										</div>
									</div>
								);
							})}
					</div>
				</div>

				{/* Footer info */}
				<div className="mt-4 text-sm text-gray-500 text-center">
					Hiển thị {12} vị trí chính (K01 - K12) + {technicians.reduce((sum, t) => sum + t.subPositions.length, 0)} vị
					trí phụ • Tổng {allEmployees.length} nhân viên trong hệ thống
				</div>
			</div>
		</div>
	);
};

export default TechnicianManagement;
