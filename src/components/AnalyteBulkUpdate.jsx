import React, { useState, useRef, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { apiPost } from '../contexts/helperFunctionCallAPI';

const AnalyteBulkUpdate = ({
	isOpen,
	onClose,
	selectedRows,
	selectedData,
	onUpdateComplete,
	updating,
	setUpdating,
}) => {
	const [bulkEditValues, setBulkEditValues] = useState({});
	const defaultEditorRef = useRef(null);
	const engEditorRef = useRef(null);
	const [selectedAnalytes, setSelectedAnalytes] = useState(selectedRows);

	// Helper functions for display_style array management
	const getDisplayStyleValue = (displayStyleArray, label) => {
		if (!Array.isArray(displayStyleArray)) return '';
		const item = displayStyleArray.find((item) => item.label === label);
		return item ? item.value : '';
	};

	const setDisplayStyleValue = (displayStyleArray, label, value) => {
		if (!Array.isArray(displayStyleArray)) {
			return [{ label, value }];
		}

		const updated = [...displayStyleArray];
		const existingIndex = updated.findIndex((item) => item.label === label);

		if (existingIndex >= 0) {
			updated[existingIndex] = { label, value };
		} else {
			updated.push({ label, value });
		}

		return updated;
	};

	const initializeDisplayStyle = (existingDisplayStyle) => {
		const defaultLabels = ['default', 'eng'];
		const result = [];

		if (Array.isArray(existingDisplayStyle)) {
			// If it's already an array, use it but ensure all required labels exist
			defaultLabels.forEach((label) => {
				const existing = existingDisplayStyle.find((item) => item.label === label);
				result.push(existing || { label, value: '' });
			});
		} else if (typeof existingDisplayStyle === 'string') {
			// If it's a string, put it in the default label
			result.push({ label: 'default', value: existingDisplayStyle });
			result.push({ label: 'eng', value: '' });
		} else {
			// If it's null/undefined, create empty array
			defaultLabels.forEach((label) => {
				result.push({ label, value: '' });
			});
		}

		return result;
	};

	// TinyMCE initialization function
	const initTinyMCE = (selector, initialValue = '', onChange) => {
		if (typeof window !== 'undefined' && window.tinymce) {
			const element = document.getElementById(selector);

			if (!element) {
				console.error('Element not found for selector:', selector);
				return;
			}

			// Remove existing editor if it exists
			if (window.tinymce.get(selector)) {
				console.log('Removing existing editor for:', selector);
				window.tinymce.get(selector).remove();
			}

			window.tinymce
				.init({
					selector: `#${selector}`,
					plugins: '',
					toolbar: false,
					menubar: false,
					height: '60px',
					width: '100%',
					statusbar: false,
					resize: false,
					border_width: 0,
					content_style: `
						body { 
							margin: 4px !important; 
							padding: 4px !important; 
							border: none !important;
							line-height: 1.2 !important;
							font-family: Arial, sans-serif; 
							font-size: 12px;
							border-radius: 0 !important;
						}
						p{
							margin: 0 !important;
							line-height: 1.2 !important;
						}
					`,
					setup: function (editor) {
						editor.on('init', function () {
							editor.setContent(initialValue || '');
						});

						editor.on('change input keyup', function () {
							const content = editor.getContent();
							if (onChange) {
								onChange(content);
							}
						});

						// Keyboard shortcuts cho sub/sup
						editor.on('keydown', function (e) {
							if ((e.shiftKey && e.keyCode === 54) || e.key === '^') {
								e.preventDefault();
								const selectedText = editor.selection.getContent();
								if (selectedText) {
									editor.selection.setContent(`<sup>${selectedText}</sup>`);
								} else {
									editor.insertContent('<sup>&nbsp;</sup>');
								}
								return false;
							}

							if ((e.shiftKey && e.keyCode === 189) || e.key === '_') {
								e.preventDefault();
								const selectedText = editor.selection.getContent();
								if (selectedText) {
									editor.selection.setContent(`<sub>${selectedText}</sub>`);
								} else {
									editor.insertContent('<sub>&nbsp;</sub>');
								}
								return false;
							}
						});

						// Replace * với ×
						editor.on('input', function (e) {
							setTimeout(() => {
								const content = editor.getContent();
								if (content.includes('*')) {
									const newContent = content.replace(/\*/g, '×');
									const bookmark = editor.selection.getBookmark();
									editor.setContent(newContent);
									editor.selection.moveToBookmark(bookmark);
								}
							}, 0);
						});
					},
				})
				.then((editors) => {
					console.log('TinyMCE initialized successfully for:', selector, editors);
				})
				.catch((error) => {
					console.error('TinyMCE initialization failed for:', selector, error);
				});
		} else {
			console.error('TinyMCE not available');
		}
	};

	// Clean up TinyMCE editors
	const cleanupTinyMCE = (selector) => {
		if (typeof window !== 'undefined' && window.tinymce && window.tinymce.get(selector)) {
			window.tinymce.get(selector).destroy();
		}
	};

	// Initialize TinyMCE when modal opens
	useEffect(() => {
		if (isOpen) {
			// Clear previous editors first
			cleanupTinyMCE('bulk-tinymce-default');
			cleanupTinyMCE('bulk-tinymce-eng');

			setTimeout(() => {
				const defaultElement = document.getElementById('bulk-tinymce-default');
				const engElement = document.getElementById('bulk-tinymce-eng');

				if (defaultElement && window.tinymce) {
					const defaultValue = getDisplayStyleValue(initializeDisplayStyle(bulkEditValues.display_style), 'default');
					initTinyMCE('bulk-tinymce-default', defaultValue, (content) => {
						handleDisplayStyleChange('default', content);
					});
				}

				if (engElement && window.tinymce) {
					const engValue = getDisplayStyleValue(initializeDisplayStyle(bulkEditValues.display_style), 'eng');
					initTinyMCE('bulk-tinymce-eng', engValue, (content) => {
						handleDisplayStyleChange('eng', content);
					});
				}
			}, 200);
		}

		// Cleanup when modal closes
		return () => {
			if (!isOpen) {
				cleanupTinyMCE('bulk-tinymce-default');
				cleanupTinyMCE('bulk-tinymce-eng');
			}
		};
	}, [isOpen]);

	// Reset editors when selectedAnalytes changes
	useEffect(() => {
		if (isOpen && selectedRows.size > 0) {
			// Reset bulk edit values to empty state (undefined means not set)
			setBulkEditValues({
				field: undefined,
				accreditation: undefined,
				protocol_source: undefined,
				protocol_code: undefined,
				default_unit: undefined,
				price: undefined,
				technician_alias: undefined,
				display_style: undefined,
			});

			// Update TinyMCE content if editors are available
			setTimeout(() => {
				if (window.tinymce && window.tinymce.get('bulk-tinymce-default')) {
					window.tinymce.get('bulk-tinymce-default').setContent('');
				}
				if (window.tinymce && window.tinymce.get('bulk-tinymce-eng')) {
					window.tinymce.get('bulk-tinymce-eng').setContent('');
				}
			}, 100);
		}
	}, [selectedRows, isOpen]);

	// Handle bulk edit value changes
	const handleBulkEditChange = (field, value) => {
		// If user selects "-- Không thay đổi --", set to undefined
		const processedValue = value === '' ? undefined : value;

		setBulkEditValues((prev) => ({
			...prev,
			[field]: processedValue,
		}));
	};

	// Handle display style changes
	const handleDisplayStyleChange = (label, content) => {
		// Normalize to check if effectively empty
		const plainText = content
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, '')
			.trim();
		if (plainText === '') {
			// Remove if empty
			setBulkEditValues((prev) => ({
				...prev,
				display_style: (prev.display_style || []).filter((item) => item.label !== label),
			}));
		} else {
			// Set or add if not empty
			setBulkEditValues((prev) => ({
				...prev,
				display_style: setDisplayStyleValue(prev.display_style || [], label, content),
			}));
		}
	};

	// Helper function to check if a field has changes
	const hasFieldChanged = (formField, currentValue, newValue) => {
		if (newValue === undefined) return false; // No new value provided

		// Map form fields to data fields
		const fieldMapping = {
			field: 'scientificField',
			accreditation: 'accreditation',
			protocol_source: 'protocolSource',
			protocol_code: 'protocolCode',
			default_unit: 'defaultUnit',
			price: 'fee',
			technician_alias: 'technicianAlias',
			display_style: 'displayStyle',
		};

		// Special handling for display_style
		if (formField === 'display_style') {
			if (!Array.isArray(newValue)) return false;

			const currentDisplayStyle = initializeDisplayStyle(currentValue);
			const newDisplayStyle = newValue;

			// Check if any value has changed
			return newDisplayStyle.some((newItem) => {
				const currentItem = currentDisplayStyle.find((item) => item.label === newItem.label);
				return currentItem?.value !== newItem.value;
			});
		}

		const normalizedCurrentValue = currentValue ?? '';
		const normalizedNewValue = newValue ?? '';
		return normalizedNewValue !== normalizedCurrentValue;
	};

	// Generate technician options K01-K12
	const getTechnicianOptions = () => {
		const technicianTitles = {
			K01: 'Hóa lý 1',
			K02: 'Hóa lý 2',
			K03: 'Hóa lý 3',
			K04: 'Hóa dược',
			K05: 'UV-VIS',
			K06: 'HPLC',
			K07: 'GCMS',
			K08: 'AAS',
			K09: 'Sinh học',
			K10: 'Kỹ thuật viên',
			K11: 'Kỹ thuật viên',
			K12: 'Kỹ thuật viên',
		};

		const options = [];
		for (let i = 1; i <= 12; i++) {
			const alias = `K${i.toString().padStart(2, '0')}`;
			options.push({
				alias: alias,
				title: technicianTitles[alias],
			});
		}
		return options;
	};

	// Get technician display name
	const getTechnicianDisplayName = (alias) => {
		const techOptions = getTechnicianOptions();
		const option = techOptions.find((opt) => opt.alias === alias);
		return option ? `${option.alias}: ${option.title}` : alias || '';
	};

	// Handle bulk update submission
	const handleBulkUpdate = async () => {
		const updates = [];

		// Debug logging
		console.log('Bulk edit values:', bulkEditValues);
		console.log('Selected rows:', Array.from(selectedRows));
		console.log('Selected data:', selectedData);
		console.log(
			'Selected data IDs:',
			selectedData.map((item) => item.id),
		);

		// Prepare updates for all selected analytes
		Array.from(selectedRows).forEach((rowId) => {
			// Handle both string and number rowIds
			let analyteId;
			if (typeof rowId === 'string') {
				// If it's a string ID like "HL0965", use it directly
				analyteId = rowId;
			} else if (typeof rowId === 'number') {
				analyteId = rowId;
			} else {
				console.warn(`Invalid rowId type: ${typeof rowId}, value: ${rowId}`);
				return;
			}

			const currentAnalyte = selectedData.find((item) => item.id === analyteId);

			if (!currentAnalyte) {
				console.warn(
					`Analyte with id ${analyteId} not found in selectedData. Available IDs:`,
					selectedData.map((item) => item.id),
				);
				return;
			}

			const updateData = { id: analyteId };
			let hasChanges = false;

			// Map form fields to data fields
			const fieldMapping = {
				field: 'scientificField',
				accreditation: 'accreditation',
				protocol_source: 'protocolSource',
				protocol_code: 'protocolCode',
				default_unit: 'defaultUnit',
				price: 'fee',
				technician_alias: 'technicianAlias',
				display_style: 'displayStyle',
			};

			// Check each field for actual changes
			Object.keys(bulkEditValues).forEach((formField) => {
				const newValue = bulkEditValues[formField];
				const dataField = fieldMapping[formField] || formField;
				const currentValue = currentAnalyte[dataField];

				// Only include fields that have been explicitly set (including empty strings)
				if (newValue !== undefined) {
					// Special handling for display_style
					if (formField === 'display_style') {
						const newValueArr = Array.isArray(newValue) ? newValue : [];
						const currentDisplayStyle = initializeDisplayStyle(currentValue);
						const hasStyleChanges = newValueArr.some((newItem) => {
							const currentItem = currentDisplayStyle.find((item) => item.label === newItem.label);
							return currentItem?.value !== newItem.value;
						});

						if (hasStyleChanges) {
							let updatedDisplayStyle = [...currentDisplayStyle];
							newValueArr.forEach((item) => {
								updatedDisplayStyle = setDisplayStyleValue(updatedDisplayStyle, item.label, item.value);
							});
							updateData[dataField] = updatedDisplayStyle;
							hasChanges = true;
							console.log(`Display style change for analyte ${analyteId}:`, updatedDisplayStyle);
						}
					} else {
						// Regular field comparison - allow empty strings and null values
						const normalizedCurrentValue = currentValue ?? '';
						const normalizedNewValue = newValue ?? '';

						if (normalizedNewValue !== normalizedCurrentValue) {
							updateData[dataField] = newValue;
							hasChanges = true;
							console.log(
								`Field ${dataField} change for analyte ${analyteId}: "${normalizedCurrentValue}" -> "${normalizedNewValue}"`,
							);
						}
					}
				}
			});

			if (hasChanges && Object.keys(updateData).length > 1) {
				// More than just id and has actual changes
				updates.push(updateData);
				console.log(`Update data for analyte ${analyteId}:`, updateData);
			}
		});

		console.log('Final updates array:', updates);

		if (updates.length === 0) {
			toast.warning('Không có thay đổi nào để cập nhật. Tất cả giá trị đã giống với dữ liệu hiện tại.');
			return;
		}

		try {
			setUpdating(true);
			// Update each analyte
			for (const update of updates) {
				const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/update/parameter', {
					parameter: update,
				});

				if (response?.status !== 200) {
					throw new Error(`Failed to update analyte ${update.id}`);
				}
			}

			toast.success(`Đã cập nhật ${updates.length} chỉ tiêu thành công`);

			// Clear selections and close modal
			setBulkEditValues({});
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
		setBulkEditValues({
			field: undefined,
			accreditation: undefined,
			protocol_source: undefined,
			protocol_code: undefined,
			default_unit: undefined,
			price: undefined,
			technician_alias: undefined,
			display_style: undefined,
		});
		cleanupTinyMCE('bulk-tinymce-default');
		cleanupTinyMCE('bulk-tinymce-eng');
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
			<div className="bg-white p-6 rounded-lg shadow-lg min-w-[600px] w-5/6 max-h-[90vh] overflow-auto">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">
						Chỉnh sửa hàng loạt
						<span className="text-sm font-normal text-gray-600 ml-2">({selectedRows.size} chỉ tiêu được chọn)</span>
					</h2>
					<button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-xl">
						<FaTimes />
					</button>
				</div>

				{/* Input Fields Section */}
				<div className="mb-6">
					<h3 className="text-md font-semibold mb-3">Thông tin cập nhật</h3>
					<div className="flex flex-wrap gap-4 items-end">
						{/* Field */}
						<div className="flex-shrink-0" style={{ minWidth: '120px', maxWidth: '140px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Lĩnh vực</label>
							<select
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								value={bulkEditValues.field || ''}
								onChange={(e) => handleBulkEditChange('field', e.target.value)}
							>
								<option value="">-- Không thay đổi --</option>
								<option value="Hóa lý">Hóa lý</option>
								<option value="Vi sinh">Vi sinh</option>
								<option value="Sinh học phân tử">Sinh học phân tử</option>
								<option value="Khác">Khác</option>
							</select>
						</div>

						{/* Accreditation */}
						<div className="flex-shrink-0" style={{ minWidth: '120px', maxWidth: '140px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Chứng nhận</label>
							<select
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								value={bulkEditValues.accreditation || ''}
								onChange={(e) => handleBulkEditChange('accreditation', e.target.value)}
							>
								<option value="">-- Không thay đổi --</option>
								<option value="Có">Có</option>
								<option value="Không">Không</option>
							</select>
						</div>

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

						{/* Default Unit */}
						<div className="flex-grow" style={{ minWidth: '120px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
							<input
								type="text"
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								placeholder="Nhập đơn vị..."
								value={bulkEditValues.default_unit || ''}
								onChange={(e) => handleBulkEditChange('default_unit', e.target.value)}
							/>
						</div>

						{/* Price */}
						<div className="flex-grow" style={{ minWidth: '120px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Giá</label>
							<input
								type="number"
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								placeholder="Nhập giá..."
								value={bulkEditValues.price || ''}
								onChange={(e) => handleBulkEditChange('price', e.target.value)}
							/>
						</div>

						{/* Technician */}
						<div className="flex-grow" style={{ minWidth: '180px' }}>
							<label className="block text-sm font-medium text-gray-700 mb-1">Kỹ thuật viên</label>
							<select
								className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 bg-white"
								value={bulkEditValues.technician_alias || ''}
								onChange={(e) => handleBulkEditChange('technician_alias', e.target.value)}
							>
								<option value="">-- Không thay đổi --</option>
								{getTechnicianOptions().map((tech) => (
									<option key={tech.alias} value={tech.alias}>
										{tech.alias}: {tech.title}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Display Style Section - Separate row */}
					<div className="mt-4">
						<label className="block text-sm font-medium text-gray-700 mb-2">Định dạng hiển thị</label>
						<div className="grid grid-cols-2 gap-4">
							{/* Default Display Style */}
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Mặc định</label>
								<div className="border border-gray-300 rounded-md overflow-hidden" style={{ height: '60px' }}>
									<textarea
										id="bulk-tinymce-default"
										ref={defaultEditorRef}
										className="w-full h-full border-0 rounded-md text-sm focus:border-blue-500 bg-white resize-none"
										placeholder="Nhập định dạng mặc định..."
									/>
								</div>
							</div>

							{/* English Display Style */}
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Tiếng Anh</label>
								<div className="border border-gray-300 rounded-md overflow-hidden" style={{ height: '60px' }}>
									<textarea
										id="bulk-tinymce-eng"
										ref={engEditorRef}
										className="w-full h-full border-0 rounded-md text-sm focus:border-blue-500 bg-white resize-none"
										placeholder="Nhập định dạng tiếng Anh..."
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Preview table showing all selected analytes */}
				<div className="mb-6">
					<h3 className="text-md font-semibold mb-3">Xem trước thay đổi ({selectedRows.size} mục)</h3>
					<div className="max-h-[300px] overflow-auto border border-gray-300 rounded-md">
						<table className="w-full border-collapse">
							<thead className="bg-gray-100 sticky top-0">
								<tr>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Tên chỉ tiêu</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Lĩnh vực</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Chứng nhận</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Định dạng</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Nguồn</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Phương pháp</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Đơn vị</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">Giá</th>
									<th className="border border-gray-300 p-2 text-start text-sm font-medium">KTV</th>
								</tr>
							</thead>
							<tbody>
								{selectedData.map((analyte) => (
									<tr key={analyte.id} className="hover:bg-gray-50">
										<td className="border border-gray-300 p-2 text-sm text-start">{analyte.parameterName}</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('field', analyte.scientificField, bulkEditValues.field)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.field || analyte.scientificField || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('accreditation', analyte.accreditation, bulkEditValues.accreditation)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.accreditation || analyte.accreditation || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<div
												className={
													hasFieldChanged('display_style', analyte.displayStyle, bulkEditValues.display_style)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{/* Default display */}
												<div
													dangerouslySetInnerHTML={{
														__html:
															getDisplayStyleValue(bulkEditValues.display_style, 'default') ||
															getDisplayStyleValue(initializeDisplayStyle(analyte.displayStyle), 'default') ||
															'--',
													}}
												/>
												{/* English display */}
												{(getDisplayStyleValue(bulkEditValues.display_style, 'eng') ||
													getDisplayStyleValue(initializeDisplayStyle(analyte.displayStyle), 'eng')) && (
													<div
														className="mt-1 text-gray-600 text-xs"
														dangerouslySetInnerHTML={{
															__html:
																getDisplayStyleValue(bulkEditValues.display_style, 'eng') ||
																getDisplayStyleValue(initializeDisplayStyle(analyte.displayStyle), 'eng'),
														}}
													/>
												)}
											</div>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('protocol_source', analyte.protocolSource, bulkEditValues.protocol_source)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.protocol_source || analyte.protocolSource || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('protocol_code', analyte.protocolCode, bulkEditValues.protocol_code)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.protocol_code || analyte.protocolCode || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('default_unit', analyte.defaultUnit, bulkEditValues.default_unit)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.default_unit || analyte.defaultUnit || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('price', analyte.fee, bulkEditValues.price)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.price || analyte.fee || '--'}
											</span>
										</td>
										<td className="border border-gray-300 p-2 text-sm text-start">
											<span
												className={
													hasFieldChanged('technician_alias', analyte.technicianAlias, bulkEditValues.technician_alias)
														? 'font-semibold text-blue-600'
														: ''
												}
											>
												{bulkEditValues.technician_alias
													? getTechnicianDisplayName(bulkEditValues.technician_alias)
													: getTechnicianDisplayName(analyte.technicianAlias)}
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
						disabled={Object.values(bulkEditValues).every((value) => value === undefined) || updating}
					>
						{updating ? 'Đang cập nhật...' : `Cập nhật (${selectedRows.size} mục)`}
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

export default AnalyteBulkUpdate;
