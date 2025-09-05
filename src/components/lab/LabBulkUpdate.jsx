import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import TinyMceInput from '../Input';
import { apiPost } from '../../contexts/helperFunctionCallAPI';

const LabBulkUpdate = ({
	isOpen,
	onClose,
	selectedRows,
	selectedData,
	technicians,
	onUpdateComplete,
	updating,
	setUpdating,
}) => {
	const [bulkEditCell, setBulkEditCell] = useState({ column: null, receiptId: null });
	const [bulkEditValues, setBulkEditValues] = useState({});

	// Handle bulk edit value changes
	const handleBulkEditChange = (field, value) => {
		setBulkEditValues((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	// Handle bulk edit cell click
	const handleBulkEditCellClick = (column, receiptId) => {
		setBulkEditCell({ column, receiptId });
	};

	// Format date
	const formatDate = (dateString) => {
		if (!dateString) return '--';
		return new Date(dateString).toLocaleDateString('vi-VN');
	};

	// Helper function to check if a field has changes
	const hasFieldChanged = (field, currentValue, newValue) => {
		if (!newValue && newValue !== 0) return false; // No new value provided

		let normalizedCurrentValue = currentValue || '';
		let normalizedNewValue = newValue || '';

		// Special handling for HTML content fields
		if (field === 'result_value' || field === 'result_unit') {
			// Remove HTML tags and normalize whitespace for comparison
			const cleanCurrent = normalizedCurrentValue.replace(/<[^>]*>/g, '').trim();
			const cleanNew = normalizedNewValue.replace(/<[^>]*>/g, '').trim();
			normalizedCurrentValue = cleanCurrent;
			normalizedNewValue = cleanNew;
		}

		return normalizedNewValue !== normalizedCurrentValue;
	};

	// Get technician name by UID
	const getTechnicianName = (technician_uid) => {
		if (!technician_uid || !technicians) return '--';
		const technician = technicians.find((tech) => tech.identity_uid === technician_uid);
		return technician ? `${technician.identity_name} (${technician.alias})` : '--';
	};

	// Handle bulk update submission
	const handleBulkUpdate = async () => {
		const updates = [];

		// Prepare updates for all selected analyses
		const selectedIds = Array.isArray(selectedRows) ? selectedRows : Array.from(selectedRows);
		selectedIds.forEach((analysisId) => {
			const currentAnalysis = selectedData.find((item) => item.id === analysisId);

			if (!currentAnalysis) return;

			const updateData = { id: analysisId };
			let hasChanges = false;

			// Check each field for actual changes
			Object.keys(bulkEditValues).forEach((field) => {
				const newValue = bulkEditValues[field];
				const currentValue = currentAnalysis[field];

				// Skip if no new value provided
				if (newValue === '' || newValue === null || newValue === undefined) {
					return;
				}

				// Special handling for HTML content fields
				let normalizedCurrentValue = currentValue || '';
				let normalizedNewValue = newValue || '';

				if (field === 'result_value' || field === 'result_unit') {
					// Remove HTML tags and normalize whitespace for comparison
					const cleanCurrent = normalizedCurrentValue.replace(/<[^>]*>/g, '').trim();
					const cleanNew = normalizedNewValue.replace(/<[^>]*>/g, '').trim();
					normalizedCurrentValue = cleanCurrent;
					normalizedNewValue = cleanNew;
				}

				// Compare normalized values
				if (normalizedNewValue !== normalizedCurrentValue) {
					// For HTML fields, keep original HTML content
					if (field === 'result_value' || field === 'result_unit') {
						updateData[field] = newValue;
					} else {
						updateData[field] = newValue;
					}
					hasChanges = true;
				}
			});

			if (hasChanges && Object.keys(updateData).length > 1) {
				updates.push(updateData);
			}
		});

		if (updates.length === 0) {
			toast.warning('Không có thay đổi nào để cập nhật. Tất cả giá trị đã giống với dữ liệu hiện tại.');
			return;
		}

		try {
			setUpdating(true);
			// Update each analysis
			for (const update of updates) {
				const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
					analysis: update,
				});

				if (response?.status !== 200) {
					throw new Error(`Failed to update analysis ${update.id}`);
				}
			}

			toast.success(`Đã cập nhật ${updates.length} chỉ tiêu thành công`);

			// Clear selections and close modal
			setBulkEditValues({});
			setBulkEditCell({ column: null, receiptId: null });
			onUpdateComplete?.();
			onClose();
		} catch (error) {
			console.error('Error in bulk update:', error);
			toast.error('Lỗi khi cập nhật hàng loạt');
		} finally {
			setUpdating(false);
		}
	};

	const handleClose = () => {
		setBulkEditValues({});
		setBulkEditCell({ column: null, receiptId: null });
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
			<div className="bg-white p-6 rounded-lg shadow-lg min-w-[600px] w-5/6 max-h-[90vh] overflow-auto">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">
						Chỉnh sửa hàng loạt
						<span className="text-sm font-normal text-gray-600 ml-2">
							({Array.isArray(selectedRows) ? selectedRows.length : selectedRows.size} chỉ tiêu được chọn)
						</span>
					</h2>
					<button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-xl">
						<FaTimes />
					</button>
				</div>

				{/* Input Fields Section */}
				<div className="mb-6">
					<h3 className="text-md font-semibold mb-3">Thông tin cập nhật</h3>
					<div className="flex flex-wrap gap-4 items-end">
						{/* Protocol Source */}
						<div className="flex-shrink-0" style={{ minWidth: '120px', maxWidth: '140px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Nguồn</label>
							<select
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								value={bulkEditValues.protocol_source || ''}
								onChange={(e) => handleBulkEditChange('protocol_source', e.target.value)}
							>
								<option value="">-- Không thay đổi --</option>
								<option value="IRDOP">IRDOP</option>
								<option value="IRDOP VS">IRDOP VS</option>
								<option value="EX">EX</option>
							</select>
						</div>

						{/* Protocol Code */}
						<div className="flex-grow" style={{ minWidth: '150px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Phương pháp</label>
							<input
								type="text"
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								placeholder="Nhập mã phương pháp..."
								value={bulkEditValues.protocol_code || ''}
								onChange={(e) => handleBulkEditChange('protocol_code', e.target.value)}
							/>
						</div>

						{/* Result Value */}
						<div className="flex-grow" style={{ minWidth: '150px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Kết quả</label>
							<div
								className="w-full p-2 border border-gray-300 rounded-md min-h-[38px] cursor-text hover:border-blue-500 flex items-center bg-white"
								onClick={() => handleBulkEditCellClick('result_value', 'global')}
							>
								{bulkEditCell.column === 'result_value' && bulkEditCell.receiptId === 'global' ? (
									<TinyMceInput
										value={bulkEditValues.result_value || ''}
										onUpdate={(content) => handleBulkEditChange('result_value', content)}
										onKey={(e) => {
											if (e.key === 'Enter') {
												setBulkEditCell({ column: null, receiptId: null });
											}
										}}
									/>
								) : (
									<div
										className="text-sm"
										dangerouslySetInnerHTML={{
											__html: bulkEditValues.result_value || 'Nhấp để nhập kết quả...',
										}}
									/>
								)}
							</div>
						</div>

						{/* Result Unit */}
						<div className="flex-grow" style={{ minWidth: '120px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
							<div
								className="w-full p-2 border border-gray-300 rounded-md min-h-[38px] cursor-text hover:border-blue-500 flex items-center bg-white"
								onClick={() => handleBulkEditCellClick('result_unit', 'global')}
							>
								{bulkEditCell.column === 'result_unit' && bulkEditCell.receiptId === 'global' ? (
									<TinyMceInput
										value={bulkEditValues.result_unit || ''}
										onUpdate={(content) => handleBulkEditChange('result_unit', content)}
										onKey={(e) => {
											if (e.key === 'Enter') {
												setBulkEditCell({ column: null, receiptId: null });
											}
										}}
									/>
								) : (
									<div
										className="text-sm"
										dangerouslySetInnerHTML={{
											__html: bulkEditValues.result_unit || 'Nhấp để nhập đơn vị...',
										}}
									/>
								)}
							</div>
						</div>

						{/* Technician */}
						<div className="flex-grow" style={{ minWidth: '180px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
							<select
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								value={bulkEditValues.technician_uid || ''}
								onChange={(e) => handleBulkEditChange('technician_uid', e.target.value)}
							>
								<option value="">-- Không thay đổi --</option>
								{technicians?.map((tech) => (
									<option key={tech.identity_uid} value={tech.identity_uid}>
										{tech.identity_name} ({tech.alias})
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{/* Preview table showing all selected analyses */}
				<div className="mb-6">
					<h3 className="text-md font-semibold mb-3">
						Xem trước thay đổi ({Array.isArray(selectedRows) ? selectedRows.length : selectedRows.size} mục)
					</h3>
					<div className="max-h-[300px] overflow-auto border border-gray-300 rounded-md">
						<table className="w-full border-collapse">
							<thead className="bg-gray-100 sticky top-0">
								<tr>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Mẫu thử</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Chỉ tiêu</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Nguồn</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Phương pháp</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Kết quả</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Đơn vị</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Hạn trả</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Người thực hiện</th>
								</tr>
							</thead>
							<tbody>
								{selectedData.map((foundAnalysis) => (
									<tr key={foundAnalysis.id} className="hover:bg-gray-50">
										<td className="border border-gray-300 p-2 text-sm text-start">{foundAnalysis.sample_uid}</td>
										<td className="border border-gray-300 p-2 text-sm text-start">{foundAnalysis.parameter_name}</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged(
														'protocol_source',
														foundAnalysis.protocol_source,
														bulkEditValues.protocol_source,
													)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.protocol_source || foundAnalysis.protocol_source || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('protocol_code', foundAnalysis.protocol_code, bulkEditValues.protocol_code)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.protocol_code || foundAnalysis.protocol_code || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<div
												className={
													hasFieldChanged('result_value', foundAnalysis.result_value, bulkEditValues.result_value)
														? 'font-semibold text-blue-600'
														: ''
												}
												dangerouslySetInnerHTML={{
													__html: bulkEditValues.result_value || foundAnalysis.result_value || '--',
												}}
											/>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<div
												className={
													hasFieldChanged('result_unit', foundAnalysis.result_unit, bulkEditValues.result_unit)
														? 'font-semibold text-blue-600'
														: ''
												}
												dangerouslySetInnerHTML={{
													__html: bulkEditValues.result_unit || foundAnalysis.result_unit || '--',
												}}
											/>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											{formatDate(foundAnalysis.deadline)}
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('technician_uid', foundAnalysis.technician_uid, bulkEditValues.technician_uid)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.technician_uid
													? getTechnicianName(bulkEditValues.technician_uid)
													: getTechnicianName(foundAnalysis.technician_uid)}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Action buttons */}
				<div className="flex justify-end space-x-3">
					<button
						onClick={handleClose}
						className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
					>
						Hủy
					</button>
					<button
						onClick={handleBulkUpdate}
						className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
						disabled={Object.keys(bulkEditValues).length === 0 || updating}
					>
						{updating
							? 'Đang cập nhật...'
							: `Cập nhật (${Array.isArray(selectedRows) ? selectedRows.length : selectedRows.size} mục)`}
					</button>
				</div>

				<div className="mt-4 text-xs text-gray-500">
					<strong>Lưu ý:</strong> Chỉ những trường có giá trị mới và khác với giá trị hiện tại sẽ được cập nhật. Các
					trường màu xanh dương trong bảng xem trước cho biết sẽ có thay đổi. Trường để trống hoặc giống với giá trị
					hiện tại sẽ không được gửi yêu cầu cập nhật.
				</div>
			</div>
		</div>
	);
};

export default LabBulkUpdate;
