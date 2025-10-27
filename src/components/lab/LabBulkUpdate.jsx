import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { convertValueToHTML, convertHTMLToValue } from '../../contexts/formatHelpers';
import { apiGet } from '../../contexts/helperFunctionCallAPI';

// Session storage key for bulk update pending changes
const BULK_UPDATE_SESSION_KEY = 'labBulkUpdate_pendingChanges';

// Object key mapping from snake_case to camelCase
const keyMapping = {
	receipt_id: 'receiptId',
	sample_id: 'sampleId',
	parameter_id: 'parameterId',
	parameter_name: 'parameterName',
	protocol_source: 'protocolSource',
	protocol_code: 'protocolCode',
	receipt_uid: '_deprecated_receiptUid',
	doc_id: 'docId',
	display_style: 'displayStyle',
	client_uid: 'clientId',
	client_name: 'clientName',
	client_address: 'clientAddress',
	internal_memo: 'internalMemo',
	legal_id: 'legalId',
	client_email: 'clientEmail',
	client_phone: 'clientPhone',
	invoice_email: 'invoiceEmail',
	invoice_info: 'invoiceInfo',
	client_id: 'clientId',
	receipt_date: 'receiptDate',
	request_number: '_deprecated_requestNumber',
	pay_status: 'paymentStatus',
	order_code: 'orderId',
	quote_code: 'quoteId',
	sale_recorder: 'salePerson',
	total_amount: 'totalFeeBeforeTax',
	record_code: '_deprecated_recordCode',
	ppt_send_at: '_deprecated_postalOrderCreatedAt',
	ppt_send_by: '_deprecated_postalOrderCreatedById',
	created_by: '_deprecated_createdBy',
	transactions: '_deprecated_transactions',
	invoice_number: '_deprecated_invoiceNumber',
	tracking_number: '_deprecated_trackingNumber',
	sample_img_uid: '_deprecated_sampleImageId',
	gmail_thread_id: '_deprecated_gmailThreadId',
	contact: 'contactPerson',
	receiver: 'reportRecipient',
	result_value: 'resultValue',
	result_unit: 'resultUnit',
	technician_uid: 'technicianId',
	sample_uid: 'sampleId',
	technician_id: 'technicianId',
};

// Function to convert object keys from snake_case to camelCase
const convertObjectKeys = (obj) => {
	if (!obj || typeof obj !== 'object') return obj;

	const converted = {};
	Object.keys(obj).forEach((key) => {
		const newKey = keyMapping[key] || key;
		converted[newKey] = obj[key];
	});
	return converted;
};

const LabBulkUpdate = ({
	isOpen,
	onClose,
	selectedRows,
	selectedData,
	technicians,
	onApplyBulkChanges, // Callback to apply bulk changes to parent's pendingChanges
}) => {
	const [bulkEditValues, setBulkEditValues] = useState({});
	const [editingField, setEditingField] = useState(null); // Track which field is being edited

	// Unit suggestions states
	const [uniqueUnits, setUniqueUnits] = useState([]);
	const [unitInput, setUnitInput] = useState('');
	const [showUnitDropdown, setShowUnitDropdown] = useState(false);
	const [unitPage, setUnitPage] = useState(1);
	const itemsPerPage = 6;

	// Fetch unit suggestions from API
	useEffect(() => {
		const fetchUnits = async () => {
			try {
				const unitsResponse = await apiGet('https://black.irdop.org/get/list_enum/unit');
				if (unitsResponse.data && Array.isArray(unitsResponse.data)) {
					setUniqueUnits(unitsResponse.data.filter(Boolean));
				}
			} catch (error) {
				console.error('Error fetching units:', error);
			}
		};

		if (isOpen) {
			fetchUnits();
		}
	}, [isOpen]);

	// Filter and paginate units
	const filterUnits = (input) => {
		if (!input || input.trim() === '') return [];
		return uniqueUnits.filter((unit) => unit && unit.toLowerCase().includes((input || '').toLowerCase()));
	};

	const getPaginatedUnits = (input) => {
		const filtered = filterUnits(input);
		return filtered.slice((unitPage - 1) * itemsPerPage, unitPage * itemsPerPage);
	};

	const handleUnitPageChange = (pageNumber) => {
		setUnitPage(pageNumber);
	};

	// Load pending changes from session storage on mount
	useEffect(() => {
		if (isOpen) {
			const savedChanges = sessionStorage.getItem(BULK_UPDATE_SESSION_KEY);
			if (savedChanges) {
				try {
					const parsed = JSON.parse(savedChanges);
					setBulkEditValues(parsed);
				} catch (error) {
					console.error('Error loading session data:', error);
				}
			}
		}
	}, [isOpen]);

	// Save pending changes to session storage whenever they change
	useEffect(() => {
		if (Object.keys(bulkEditValues).length > 0) {
			sessionStorage.setItem(BULK_UPDATE_SESSION_KEY, JSON.stringify(bulkEditValues));
		} else {
			sessionStorage.removeItem(BULK_UPDATE_SESSION_KEY);
		}
	}, [bulkEditValues]);

	// Convert selectedData to use camelCase keys
	const normalizedSelectedData = selectedData.map((item) => convertObjectKeys(item));

	// Handle bulk edit value changes
	const handleBulkEditChange = (field, value) => {
		// For result/unit fields during editing, store as plain text temporarily
		if ((field === 'resultValue' || field === 'resultUnit') && editingField === field) {
			setBulkEditValues((prev) => ({
				...prev,
				[field]: value, // Store plain text during editing
			}));
		} else {
			setBulkEditValues((prev) => ({
				...prev,
				[field]: value,
			}));
		}
	};

	// Handle input field focus for result/unit fields
	const handleFieldFocus = (field) => {
		setEditingField(field);
		// Convert HTML to plain text for editing
		if (field === 'resultValue' || field === 'resultUnit') {
			const currentValue = bulkEditValues[field] || '';
			const editableValue = convertHTMLToValue(currentValue);
			setBulkEditValues((prev) => ({
				...prev,
				[field]: editableValue,
			}));
			if (field === 'resultUnit') {
				setUnitInput(editableValue);
				setUnitPage(1);
				setShowUnitDropdown(editableValue.length >= 1);
			}
		}
	};

	// Handle input field blur for result/unit fields
	const handleFieldBlur = (field, value) => {
		// Convert value to HTML format when saving
		if (field === 'resultValue' || field === 'resultUnit') {
			const htmlValue = convertValueToHTML(value);
			setBulkEditValues((prev) => ({
				...prev,
				[field]: htmlValue,
			}));
		}
		setEditingField(null);
		if (field === 'resultUnit') {
			// Delay hiding dropdown to allow click on dropdown items
			setTimeout(() => {
				setShowUnitDropdown(false);
			}, 200);
		}
	};

	// Handle key press in input fields
	const handleKeyDown = (e, field) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			e.target.blur(); // Trigger blur to save
		} else if (e.key === 'Escape') {
			e.preventDefault();
			setEditingField(null);
			// Restore previous value
			setBulkEditValues((prev) => ({
				...prev,
				[field]: prev[field] || '',
			}));
		}
	};

	// Handle bulk edit cell click
	const handleBulkEditCellClick = (column, receiptId) => {
		// Deprecated - no longer needed with input fields
	};

	// Get display value for input fields
	const getInputValue = (field) => {
		const value = bulkEditValues[field];
		if (!value) return '';

		// If currently editing, show plain text
		if (editingField === field) {
			return value;
		}

		// If not editing, convert HTML to plain text for display
		return convertHTMLToValue(value);
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
		if (field === 'resultValue' || field === 'resultUnit') {
			// Remove HTML tags and normalize whitespace for comparison
			const cleanCurrent = normalizedCurrentValue.replace(/<[^>]*>/g, '').trim();
			const cleanNew = normalizedNewValue.replace(/<[^>]*>/g, '').trim();
			normalizedCurrentValue = cleanCurrent;
			normalizedNewValue = cleanNew;
		}

		return normalizedNewValue !== normalizedCurrentValue;
	};

	// Get technician name by UID
	const getTechnicianName = (technicianId) => {
		if (!technicianId || !technicians) return '--';
		const technician = technicians.find((tech) => tech.identity_uid === technicianId);
		return technician ? `${technician.identity_name} (${technician.alias})` : '--';
	};

	// Handle bulk update submission - Just apply changes to session, don't send API
	const handleBulkUpdate = () => {
		const bulkChanges = [];

		// Prepare bulk changes for all selected analyses
		const selectedIds = Array.isArray(selectedRows) ? selectedRows : Array.from(selectedRows);
		selectedIds.forEach((analysisId) => {
			const currentAnalysis = normalizedSelectedData.find((item) => item.id === analysisId);

			if (!currentAnalysis) return;

			const changeData = {
				id: analysisId,
				...currentAnalysis, // Include full record
			};
			let hasChanges = false;

			// Apply each bulk edit value to this analysis
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

				if (field === 'resultValue' || field === 'resultUnit') {
					// Remove HTML tags and normalize whitespace for comparison
					const cleanCurrent = normalizedCurrentValue.replace(/<[^>]*>/g, '').trim();
					const cleanNew = normalizedNewValue.replace(/<[^>]*>/g, '').trim();
					normalizedCurrentValue = cleanCurrent;
					normalizedNewValue = cleanNew;
				}

				// Compare normalized values
				if (normalizedNewValue !== normalizedCurrentValue) {
					changeData[field] = newValue;
					hasChanges = true;
				}
			});

			if (hasChanges) {
				bulkChanges.push(changeData);
			}
		});

		if (bulkChanges.length === 0) {
			toast.warning('Không có thay đổi nào để áp dụng. Tất cả giá trị đã giống với dữ liệu hiện tại.');
			return;
		}

		// Apply bulk changes to parent component's pending changes
		if (onApplyBulkChanges) {
			onApplyBulkChanges(bulkChanges);
		}

		toast.success(
			`Đã áp dụng thay đổi hàng loạt cho ${bulkChanges.length} chỉ tiêu. Thay đổi sẽ được lưu khi kết thúc phiên nhập liệu.`,
		);

		// Clear session storage after applying changes
		sessionStorage.removeItem(BULK_UPDATE_SESSION_KEY);

		// Clear selections and close modal
		setBulkEditValues({});
		onClose();
	};

	const handleClose = () => {
		// Keep session storage intact when closing - only clear on successful update
		setBulkEditValues({});
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
								value={bulkEditValues.protocolSource || ''}
								onChange={(e) => handleBulkEditChange('protocolSource', e.target.value)}
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
								value={bulkEditValues.protocolCode || ''}
								onChange={(e) => handleBulkEditChange('protocolCode', e.target.value)}
							/>
						</div>

						{/* Result Value */}
						<div className="flex-grow" style={{ minWidth: '150px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Kết quả</label>
							<input
								type="text"
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								placeholder="Nhập kết quả..."
								value={getInputValue('resultValue')}
								onChange={(e) => handleBulkEditChange('resultValue', e.target.value)}
								onFocus={() => handleFieldFocus('resultValue')}
								onBlur={(e) => handleFieldBlur('resultValue', e.target.value)}
								onKeyDown={(e) => handleKeyDown(e, 'resultValue')}
							/>
							{!editingField && bulkEditValues.resultValue && (
								<div
									className="text-xs text-gray-500 mt-1 p-1 bg-gray-50 rounded"
									dangerouslySetInnerHTML={{ __html: bulkEditValues.resultValue }}
								/>
							)}
						</div>

						{/* Result Unit */}
						<div className="flex-grow relative" style={{ minWidth: '120px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
							<input
								id="bulk-unit-input"
								type="text"
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								placeholder="Nhập đơn vị..."
								value={getInputValue('resultUnit')}
								onChange={(e) => {
									const newValue = e.target.value;
									handleBulkEditChange('resultUnit', newValue);
									setUnitInput(newValue);
									setUnitPage(1);
									setShowUnitDropdown(newValue.length >= 1);
								}}
								onFocus={() => handleFieldFocus('resultUnit')}
								onBlur={(e) => handleFieldBlur('resultUnit', e.target.value)}
								onKeyDown={(e) => handleKeyDown(e, 'resultUnit')}
							/>
							{!editingField && bulkEditValues.resultUnit && (
								<div
									className="text-xs text-gray-500 mt-1 p-1 bg-gray-50 rounded"
									dangerouslySetInnerHTML={{ __html: bulkEditValues.resultUnit }}
								/>
							)}
							{showUnitDropdown &&
								getPaginatedUnits(unitInput).length > 0 &&
								createPortal(
									<div
										className="absolute bg-white border rounded shadow-lg z-[9999]"
										style={{
											width: document.getElementById('bulk-unit-input')?.offsetWidth + 'px',
											top: document.getElementById('bulk-unit-input')?.getBoundingClientRect().bottom + window.scrollY,
											left: document.getElementById('bulk-unit-input')?.getBoundingClientRect().left + window.scrollX,
										}}
									>
										{getPaginatedUnits(unitInput).map((unit, index) => (
											<div
												key={index}
												className="p-2 text-sm cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
												onMouseDown={(e) => {
													e.preventDefault(); // Prevent blur event
													handleBulkEditChange('resultUnit', unit);
													setUnitInput(unit);
													setShowUnitDropdown(false);
													// Trigger blur manually to save the value
													setTimeout(() => {
														handleFieldBlur('resultUnit', unit);
													}, 100);
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
												<span className="text-sm">
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
						</div>

						{/* Technician */}
						<div className="flex-grow" style={{ minWidth: '180px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
							<select
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								value={bulkEditValues.technicianId || ''}
								onChange={(e) => handleBulkEditChange('technicianId', e.target.value)}
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
								{normalizedSelectedData.map((foundAnalysis) => (
									<tr key={foundAnalysis.id} className="hover:bg-gray-50">
										<td className="border border-gray-300 p-2 text-sm text-start">{foundAnalysis.sampleId}</td>
										<td className="border border-gray-300 p-2 text-sm text-start">{foundAnalysis.parameterName}</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('protocolSource', foundAnalysis.protocolSource, bulkEditValues.protocolSource)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.protocolSource || foundAnalysis.protocolSource || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('protocolCode', foundAnalysis.protocolCode, bulkEditValues.protocolCode)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.protocolCode || foundAnalysis.protocolCode || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<div
												className={
													hasFieldChanged('resultValue', foundAnalysis.resultValue, bulkEditValues.resultValue)
														? 'font-semibold text-blue-600'
														: ''
												}
												dangerouslySetInnerHTML={{
													__html: bulkEditValues.resultValue || foundAnalysis.resultValue || '--',
												}}
											/>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<div
												className={
													hasFieldChanged('resultUnit', foundAnalysis.resultUnit, bulkEditValues.resultUnit)
														? 'font-semibold text-blue-600'
														: ''
												}
												dangerouslySetInnerHTML={{
													__html: bulkEditValues.resultUnit || foundAnalysis.resultUnit || '--',
												}}
											/>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											{formatDate(foundAnalysis.deadline)}
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('technicianId', foundAnalysis.technicianId, bulkEditValues.technicianId)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.technicianId
													? getTechnicianName(bulkEditValues.technicianId)
													: getTechnicianName(foundAnalysis.technicianId)}
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
						disabled={Object.keys(bulkEditValues).length === 0}
					>
						Áp dụng ({Array.isArray(selectedRows) ? selectedRows.length : selectedRows.size} mục)
					</button>
				</div>

				<div className="mt-4 text-xs text-gray-500">
					<strong>Lưu ý:</strong> Các thay đổi sẽ được lưu tạm thời vào phiên nhập liệu. Bạn cần{' '}
					<strong>kết thúc phiên nhập</strong> để lưu các thay đổi vào cơ sở dữ liệu. Các trường màu xanh dương trong
					bảng xem trước cho biết sẽ có thay đổi.
				</div>
			</div>
		</div>
	);
};

export default LabBulkUpdate;
