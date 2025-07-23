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

	useEffect(() => {
		setCurrentTitlePage('Quản lý kỹ thuật viên');
		fetchAllEmployees();
	}, [setCurrentTitlePage]);

	const fetchAllEmployees = async () => {
		setLoading(true);
		try {
			const response = await apiGet('https://pink.irdop.org/db/get/techinician');
			if (response.data && Array.isArray(response.data)) {
				setAllEmployees(response.data);
				organizeTechnicians(response.data);
			}
		} catch (error) {
			console.error('Error fetching employees:', error);
			toast.error('Có lỗi khi tải danh sách kỹ thuật viên');
		} finally {
			setLoading(false);
		}
	};

	const organizeTechnicians = (employees) => {
		const technicianData = [];
		
		for (let i = 1; i <= 12; i++) {
			const techCode = `K${i.toString().padStart(2, '0')}`;
			const assignedEmployee = employees.find(emp => emp.alias === techCode);
			
			if (assignedEmployee) {
				technicianData.push({
					techCode: techCode,
					identity_uid: assignedEmployee.identity_uid,
					identity_name: assignedEmployee.identity_name,
					email: assignedEmployee.email,
					hasData: true
				});
			} else {
				technicianData.push({
					techCode: techCode,
					identity_uid: '',
					identity_name: '',
					email: '',
					hasData: false
				});
			}
		}
		
		setTechnicians(technicianData);
	};

	const handleOpenDropdown = (techCode) => {
		if (openDropdown === techCode) {
			setOpenDropdown(null);
		} else {
			setOpenDropdown(techCode);
		}
	};

	const handleTechnicianChange = async (alias, selectedEmployeeUid) => {
		if (!selectedEmployeeUid) {
			return;
		}

		setUpdating(prev => ({ ...prev, [alias]: true }));
		setOpenDropdown(null);

		try {
			const response = await apiPost('https://pink.irdop.org/v1/update/technician/alias', {
				alias: alias,
				identity_uid: selectedEmployeeUid
			});

			if (response.status === 200) {
				toast.success(`Cập nhật kỹ thuật viên ${alias} thành công`);
				
				const selectedEmployee = allEmployees.find(emp => emp.identity_uid === selectedEmployeeUid);
				setTechnicians(prev => prev.map(tech => 
					tech.techCode === alias 
						? {
							...tech,
							identity_uid: selectedEmployeeUid,
							identity_name: selectedEmployee?.identity_name || '',
							email: selectedEmployee?.email || '',
							hasData: true
						}
						: tech
				));

				setAllEmployees(prev => prev.map(emp => 
					emp.identity_uid === selectedEmployeeUid 
						? { ...emp, alias: alias }
						: emp.alias === alias && emp.identity_uid !== selectedEmployeeUid
						? { ...emp, alias: '' }
						: emp
				));
			} else {
				toast.error(`Cập nhật kỹ thuật viên ${alias} thất bại`);
			}
		} catch (error) {
			console.error('Error updating technician:', error);
			toast.error(`Có lỗi khi cập nhật kỹ thuật viên ${alias}`);
		} finally {
			setUpdating(prev => ({ ...prev, [alias]: false }));
		}
	};

	const handleRemoveAssignment = async (alias) => {
		setUpdating(prev => ({ ...prev, [alias]: true }));
		setOpenDropdown(null);

		try {
			const response = await apiPost('https://pink.irdop.org/v1/update/technician/alias', {
				alias: '',
				identity_uid: technicians.find(t => t.techCode === alias)?.identity_uid
			});

			if (response.status === 200) {
				toast.success(`Xóa phân công ${alias} thành công`);
				
				setTechnicians(prev => prev.map(tech => 
					tech.techCode === alias 
						? {
							...tech,
							identity_uid: '',
							identity_name: '',
							email: '',
							hasData: false
						}
						: tech
				));

				setAllEmployees(prev => prev.map(emp => 
					emp.alias === alias ? { ...emp, alias: '' } : emp
				));
			} else {
				toast.error(`Xóa phân công ${alias} thất bại`);
			}
		} catch (error) {
			console.error('Error removing assignment:', error);
			toast.error(`Có lỗi khi xóa phân công ${alias}`);
		} finally {
			setUpdating(prev => ({ ...prev, [alias]: false }));
		}
	};

	const getAvailableEmployees = () => {
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
						<span className="text-gray-500 text-sm">
							Cập nhật: {new Date().toLocaleString('vi-VN')}
						</span>
					</div>
					<button
						className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
						onClick={handleRefresh}
					>
						Làm mới
					</button>
				</div>

				{/* Statistics */}
				<div className="grid grid-cols-3 gap-4 mb-6">
					<div className="bg-green-50 border border-green-200 rounded-lg p-4">
						<div className="text-green-800 text-lg font-semibold">
							{technicians.filter(t => t.hasData).length}
						</div>
						<div className="text-green-600 text-sm">Vị trí có kỹ thuật viên</div>
					</div>
					<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
						<div className="text-gray-800 text-lg font-semibold">
							{technicians.filter(t => !t.hasData).length}
						</div>
						<div className="text-gray-600 text-sm">Vị trí trống</div>
					</div>
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div className="text-blue-800 text-lg font-semibold">12</div>
						<div className="text-blue-600 text-sm">Tổng vị trí</div>
					</div>
				</div>

				{/* Table */}
				<div className="rounded-lg border overflow-hidden shadow-sm">
					<table className="w-full bg-white">
						<thead className="bg-gray-50 border-b-2 border-gray-200">
							<tr>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-16">
									STT
								</th>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-36">
									Mã kỹ thuật viên
								</th>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-40">
									Mã nhân viên
								</th>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 flex-1">
									Họ tên
								</th>
								<th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-40">
									Trạng thái
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{technicians.map((technician, index) => (
								<tr 
									key={technician.techCode}
									className={`hover:bg-gray-50 transition-colors ${
										!technician.hasData ? 'bg-red-50' : ''
									}`}
								>
									<td className="py-3 px-4 text-left text-sm text-gray-900">
										{index + 1}
									</td>
									<td className="py-3 px-4 text-left">
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
											{technician.techCode}
										</span>
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

										{/* Dropdown Portal - Áp dụng theo pattern của bạn */}
										{openDropdown === technician.techCode && 
											createPortal(
												<div
													className="dropdown-portal absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: document.getElementById(`select-${technician.techCode}`)?.offsetWidth + 'px',
														top: document.getElementById(`select-${technician.techCode}`)?.getBoundingClientRect().bottom + window.scrollY,
														left: document.getElementById(`select-${technician.techCode}`)?.getBoundingClientRect().left + window.scrollX,
													}}
												>
													{technician.hasData && (
														<div
															className="px-3 py-2 hover:bg-red-50 cursor-pointer text-red-600 border-b"
															onClick={() => handleRemoveAssignment(technician.techCode)}
														>
															Xóa phân công
														</div>
													)}
													{getAvailableEmployees().map((employee) => (
														<div
															key={employee.identity_uid}
															className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
															onClick={() => handleTechnicianChange(technician.techCode, employee.identity_uid)}
														>
															<div className="text-sm font-medium text-gray-900">
																{employee.identity_name}
															</div>
															<div className="text-xs text-gray-500">
																{employee.identity_uid} • {employee.email}
															</div>
														</div>
													))}
													{getAvailableEmployees().length === 0 && !technician.hasData && (
														<div className="px-3 py-2 text-gray-400 text-sm">
															Không có nhân viên khả dụng
														</div>
													)}
												</div>,
												document.body
											)
										}
									</td>
									<td className="py-3 px-4 text-left">
										{technician.hasData ? (
											<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
												Có dữ liệu
											</span>
										) : (
											<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
												Trống
											</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Footer info */}
				<div className="mt-4 text-sm text-gray-500 text-center">
					Hiển thị tất cả {technicians.length} vị trí kỹ thuật viên (K01 - K12) • 
					Tổng {allEmployees.length} nhân viên trong hệ thống
				</div>
			</div>
		</div>
	);
};

export default TechnicianManagement;