import React, { useEffect, useState, useContext } from 'react';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../contexts/GlobalContext';
import { ToastContainer, toast } from 'react-toastify';
import { FaTrashAlt } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';

const AccountInfor = () => {
	const [accountData, setAccountData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [columns, setColumns] = useState([]);
	const [newColumnName, setNewColumnName] = useState('');
	const [newRowData, setNewRowData] = useState({});
	const [editingCell, setEditingCell] = useState(null);
	const [editValue, setEditValue] = useState('');
	const [validationErrors, setValidationErrors] = useState({});

	const { setCurrentTitlePage } = useContext(GlobalContext);

	useEffect(() => {
		setCurrentTitlePage('Tài khoản');
		fetchAccountData();
	}, [setCurrentTitlePage]);

	const fetchAccountData = async () => {
		try {
			setLoading(true);
			const url = 'https://pink.irdop.org/ab4dg2/get/all/iden';
			const response = await apiGet(url);
			const data = response.data || [];

			// Process data to extract roles from columns 5+
			const processedData = data.map((row) => {
				const basicFields = {};
				const roles = {};

				Object.keys(row).forEach((key, index) => {
					if (index <= 4 && key !== 'technician_alias') {
						basicFields[key] = row[key];
					} else {
						roles[key] = row[key];
					}
				});

				return { ...basicFields, roles };
			});

			setAccountData(processedData);

			// Extract column names from the first object if data exists
			if (data.length > 0) {
				setColumns(Object.keys(data[0]));
			}

			setLoading(false);
		} catch (err) {
			console.error('Error fetching account data:', err);
			setError('Không thể tải dữ liệu tài khoản.');
			setLoading(false);
		}
	};

	// Helper function to safely display cell values with inline editing
	const renderCellValue = (row, columnName, colIndex, rowIndex) => {
		// Don't allow editing identity_uid column
		if (columnName === 'identity_uid') {
			const value = row[columnName];
			return value === null || value === undefined ? '-' : String(value);
		}

		// If this cell is currently being edited, show input
		if (editingCell && editingCell.row === rowIndex && editingCell.column === columnName) {
			// Use regular text input for all editable fields
			return (
				<input
					type="text"
					className="w-full p-1 border rounded bg-white"
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onKeyPress={handleEditKeyPress}
					onBlur={handleEditBlur}
					autoFocus
				/>
			);
		}

		// Handle cases based on column index and name
		if (colIndex <= 4 && columnName !== 'technician_alias') {
			const value = row[columnName];

			if (value === null || value === undefined) {
				return (
					<div className="w-full h-full cursor-pointer" onClick={() => handleCellClick(row, columnName, '', rowIndex)}>
						-
					</div>
				);
			}

			// Mask pw field with 6 asterisks
			if (columnName.toLowerCase() === 'password' || columnName.toLowerCase() === 'pw') {
				return (
					<div className="w-full h-full cursor-pointer" onClick={() => handleCellClick(row, columnName, '', rowIndex)}>
						******
					</div>
				);
			}

			// Handle relation_id (default to 4 if not set)
			if (columnName === 'relation_id') {
				return (
					<div
						className="w-full h-full cursor-pointer"
						onClick={() => handleCellClick(row, columnName, value || 4, rowIndex)}
					>
						{value || 4}
					</div>
				);
			}

			return (
				<div className="w-full h-full cursor-pointer" onClick={() => handleCellClick(row, columnName, value, rowIndex)}>
					{String(value)}
				</div>
			);
		} else {
			// This is a role column, get value from roles object
			const value = row.roles && row.roles[columnName];

			if (columnName === 'technician_alias') {
				return (
					<div
						className="w-full h-full cursor-pointer"
						onClick={() => handleCellClick(row, columnName, value || '', rowIndex)}
					>
						{value || '-'}
					</div>
				);
			}

			// Convert to boolean and display as checkbox
			return (
				<div className="flex justify-center">
					<input
						type="checkbox"
						className="w-6 h-6 cursor-pointer"
						checked={Boolean(value === 'true' || value === true)}
						onChange={(e) => handleRoleChange(row, columnName, e.target.checked)}
					/>
				</div>
			);
		}
	};

	// Handle cell click to enable editing
	const handleCellClick = (row, columnName, value, rowIndex) => {
		// Don't allow editing identity_uid
		if (columnName === 'identity_uid') {
			return;
		}

		setEditingCell({ row: rowIndex, column: columnName });

		// For password fields, start with empty value
		if (columnName.toLowerCase() === 'pw' || columnName.toLowerCase() === 'password') {
			setEditValue('');
		} else {
			setEditValue(value);
		}
	};

	// Handle key press in edit mode
	const handleEditKeyPress = (e) => {
		if (e.key === 'Enter') {
			handleEditSave();
		}
	};

	// Handle blur event in edit mode
	const handleEditBlur = () => {
		handleEditSave();
	};
	// Save edited value
	const handleEditSave = async () => {
		if (!editingCell) return;

		const { row: rowIndex, column: columnName } = editingCell;
		const row = accountData[rowIndex];

		// Don't update if value is empty (for any field including pw)
		if (editValue === '') {
			setEditingCell(null);
			return;
		}

		// Create updated row
		let updatedRow;

		if (columnName === 'technician_alias' || (columnName !== 'technician_alias' && columns.indexOf(columnName) > 4)) {
			// Update value in roles object
			updatedRow = {
				...row,
				roles: {
					...row.roles,
					[columnName]: editValue,
				},
			};
		} else {
			// Update value in basic fields
			updatedRow = {
				...row,
				[columnName]: columnName === 'relation_id' && editValue === '' ? 4 : editValue,
			};
		}

		// Create the log object in the required format
		const logObject = {
			identity_uid: row.identity_uid,
		};

		// If it's a role field, log the non-null role values
		if (columnName === 'technician_alias' || (columnName !== 'technician_alias' && columns.indexOf(columnName) > 4)) {
			// Filter non-null values from roles
			const nonNullRoles = {};
			Object.keys(updatedRow.roles).forEach((key) => {
				if (updatedRow.roles[key] !== null && updatedRow.roles[key] !== undefined) {
					nonNullRoles[key] = updatedRow.roles[key];
				}
			});
			logObject.roles = nonNullRoles;
		} else {
			// For basic fields, log the updated field
			logObject[columnName] = editValue;
		}

		// Log the formatted data
		console.log('updated_data:', logObject);

		try {
			// Send update to API
			const url = 'https://pink.irdop.org/ab4dg2/update/iden';
			let payload;

			// For role fields, send all role keys
			if (columnName === 'technician_alias' || (columnName !== 'technician_alias' && columns.indexOf(columnName) > 4)) {
				// Process roles object - convert null values to false
				const processedRoles = {};
				Object.keys(updatedRow.roles).forEach((key) => {
					if (key === 'technician_alias') {
						processedRoles[key] = updatedRow.roles[key] || '';
					} else {
						// Convert string 'true'/'false' to actual boolean values
						const value = updatedRow.roles[key];
						if (value === 'true' || value === 'false') {
							processedRoles[key] = value === 'true';
						} else {
							processedRoles[key] = value === null || value === undefined ? false : value;
						}
					}
				});

				payload = {
					identity: {
						identity_uid: row.identity_uid,
						roles: processedRoles, // Send processed roles with correct boolean values
					},
				};
			} else {
				// For basic fields
				payload = {
					identity: {
						identity_uid: row.identity_uid,
						[columnName]: editValue,
					},
				};
			}

			await apiPost(url, payload);
			toast.success('Cập nhật thành công!');

			// Update data locally without refetching
			const updatedData = accountData.map((item, index) => (index === rowIndex ? updatedRow : item));
			setAccountData(updatedData);
		} catch (err) {
			console.error('Error updating account data:', err);
			toast.error('Cập nhật không thành công.');
		}

		// Clear editing state
		setEditingCell(null);
		setEditValue('');
	};
	// New function to handle role checkbox changes
	const handleRoleChange = async (row, columnName, checked) => {
		// Update the row's role value
		const updatedRow = {
			...row,
			roles: {
				...row.roles,
				[columnName]: checked,
			},
		};

		// Create log object in the required format
		const logObject = {
			identity_uid: row.identity_uid,
			roles: {},
		};

		// Filter non-null values from roles
		Object.keys(updatedRow.roles).forEach((key) => {
			if (updatedRow.roles[key] !== null && updatedRow.roles[key] !== undefined) {
				logObject.roles[key] = updatedRow.roles[key];
			}
		});

		// Log the formatted data
		console.log('updated_data:', logObject);

		try {
			// Send update to API
			const url = 'https://pink.irdop.org/ab4dg2/update/iden';

			// Process roles object - convert null values to false and ensure booleans are actual booleans
			const processedRoles = {};
			Object.keys(updatedRow.roles).forEach((key) => {
				if (key === 'technician_alias') {
					processedRoles[key] = updatedRow.roles[key] || '';
				} else {
					// Convert any string 'true'/'false' to actual boolean values
					let value = updatedRow.roles[key];
					if (value === 'true') {
						value = true;
					} else if (value === 'false') {
						value = false;
					} else if (value === null || value === undefined) {
						value = false;
					}
					// Ensure value is boolean type for role properties
					processedRoles[key] = Boolean(value);
				}
			});

			const payload = {
				identity: {
					identity_uid: row.identity_uid,
					roles: processedRoles,
				},
			};

			await apiPost(url, payload);
			toast.success('Cập nhật quyền thành công!');

			// Update the account data array without refetching
			const updatedData = accountData.map((item) => {
				// Compare rows to find the one that needs updating
				// Since we don't have a reliable unique ID, we'll do a simple comparison
				if (item === row) {
					return updatedRow;
				}
				return item;
			});

			setAccountData(updatedData);
		} catch (err) {
			console.error('Error updating role data:', err);
			toast.error('Cập nhật quyền không thành công.');
		}
	};

	const handleAddColumn = () => {
		if (!newColumnName.trim()) return;

		// Add the new column to columns list
		setColumns([...columns, newColumnName]);

		// Determine default value based on column position
		const isBoolean = columns.length > 4 && newColumnName !== 'technician_alias';
		const defaultValue = isBoolean ? false : '';

		// Add the new column with appropriate default values to all existing rows
		const updatedData = accountData.map((row) => ({
			...row,
			[newColumnName]: defaultValue,
		}));

		setAccountData(updatedData);
		setNewColumnName('');

		// Update newRowData to include the new column
		setNewRowData((prev) => ({ ...prev, [newColumnName]: defaultValue }));
	};

	const handleColumnInputKeyPress = (e) => {
		if (e.key === 'Enter') {
			handleAddColumn();
		}
	};
	const handleAddRow = async () => {
		// Create new row with roles object
		const basicFields = {};
		const roles = {};

		columns.forEach((col, index) => {
			if (index <= 4 && col !== 'technician_alias') {
				// For basic fields
				if (col === 'relation_id') {
					basicFields[col] = newRowData[col] || 4;
				} else {
					basicFields[col] = newRowData[col] || '';
				}
			} else {
				// For role fields (including technician_alias)
				roles[col] = newRowData[col] || (col !== 'technician_alias' ? false : '');
			}
		});

		const newRow = { ...basicFields, roles };

		// Log the new row
		console.log('Adding new row:', newRow);

		try {
			// Send new row data to API
			const url = 'https://pink.irdop.org/ab4dg2/insert/iden';
			const payload = {
				identity: {
					...basicFields,
					roles,
				},
			};

			const response = await apiPost(url, payload);
			toast.success('Thêm tài khoản thành công!');

			// If we received an identity_uid from the API response, add it to our new row
			if (response && response.data && response.data.identity_uid) {
				newRow.identity_uid = response.data.identity_uid;
			}

			// Add the new row to the accountData state without refetching
			setAccountData([...accountData, newRow]);

			// Reset new row data
			const emptyRow = {};
			columns.forEach((col) => {
				if (col === 'relation_id') {
					emptyRow[col] = 4;
				} else if (col !== 'relation_id' && columns.indexOf(col) > 4 && col !== 'technician_alias') {
					emptyRow[col] = false;
				} else {
					emptyRow[col] = '';
				}
			});
			setNewRowData(emptyRow);
		} catch (err) {
			console.error('Error adding new account:', err);
			toast.error('Thêm tài khoản không thành công.');
		}
	};

	const handleNewRowChange = (column, value, colIndex) => {
		// Handle relation_id default value
		if (column === 'relation_id' && !value) {
			value = 4;
		}

		// Handle checkbox values for columns after the 4th column
		if (colIndex > 4 && column !== 'technician_alias') {
			value = value === true || value === 'true';
		}

		setNewRowData((prev) => {
			const newData = {
				...prev,
				[column]: value,
			};

			// Clear validation error for this field if it has a value now
			if (value && validationErrors[column]) {
				setValidationErrors((prev) => ({
					...prev,
					[column]: false,
				}));
			}

			// Log changes if this is a role column
			if (colIndex > 4 && column !== 'technician_alias') {
				console.log('Role updated:', column, value);

				// Extract and log all roles
				const roles = {};
				columns.forEach((col, idx) => {
					if (idx > 4 && col !== 'technician_alias') {
						roles[col] = col === column ? value : newData[col] || false;
					}
				});
				console.log('Current roles:', roles);
			}

			return newData;
		});
	};

	const handleNewRowKeyPress = (e, columnIndex) => {
		if (e.key === 'Enter') {
			// Check all required fields and mark them as errors if empty
			const errors = {};
			let hasErrors = false;

			requiredFields.forEach((field) => {
				// Special case for relation_id which has a default value of 4
				if (field === 'relation_id') {
					if (!newRowData[field] && newRowData[field] !== 4 && newRowData[field] !== '4') {
						errors[field] = true;
						hasErrors = true;
					}
				} else if (!newRowData[field] || newRowData[field] === '') {
					errors[field] = true;
					hasErrors = true;
				}
			});

			setValidationErrors(errors);

			// Only attempt to add row if no validation errors
			if (!hasErrors) {
				handleAddRow(); // Directly call handleAddRow instead of checkAndAddRow
			}
		}
	};

	// Remove the checkAndAddRow function and update handleNewRowBlur
	const handleNewRowBlur = (columnName) => {
		// Check if this is a required field and is empty
		if (requiredFields.includes(columnName)) {
			// Special case for relation_id
			if (columnName === 'relation_id') {
				if (!newRowData[columnName] && newRowData[columnName] !== 4 && newRowData[columnName] !== '4') {
					setValidationErrors((prev) => ({
						...prev,
						[columnName]: true,
					}));
				}
			} else if (!newRowData[columnName] || newRowData[columnName] === '') {
				setValidationErrors((prev) => ({
					...prev,
					[columnName]: true,
				}));
			}
		}

		// We don't automatically add rows on blur anymore
	};

	// Function to handle column deletion
	const handleDeleteColumn = (columnName, colIndex) => {
		// Only allow deletion for columns that are part of roles (index > 4)
		if (colIndex <= 4) {
			return;
		}

		// Confirm before deleting
		if (window.confirm(`Bạn có chắc chắn muốn xóa cột "${columnName}" không?`)) {
			// Find all rows with this key in their roles object and log them before deletion
			const rowsWithKey = accountData.filter((row) => row.roles && row.roles[columnName] !== undefined);

			console.log(`Deleting column "${columnName}" from roles object in these rows:`, rowsWithKey);

			// Remove the column from the columns list
			const updatedColumns = columns.filter((col) => col !== columnName);
			setColumns(updatedColumns);

			// Remove the key from all roles objects
			const updatedData = accountData.map((row) => {
				if (row.roles && row.roles[columnName] !== undefined) {
					const { [columnName]: removed, ...updatedRoles } = row.roles;
					return { ...row, roles: updatedRoles };
				}
				return row;
			});

			setAccountData(updatedData);

			// Remove from newRowData if exists
			if (newRowData[columnName]) {
				const { [columnName]: removed, ...updatedNewRowData } = newRowData;
				setNewRowData(updatedNewRowData);
			}

			toast.success(`Đã xóa cột "${columnName}"`);
		}
	};
	// Function to handle row deletion
	const handleDeleteRow = async (rowIndex, row) => {
		if (window.confirm('Bạn có chắc chắn muốn xóa hàng này không?')) {
			console.log('Deleting row:', row);

			try {
				// Here you would add the API call to delete the row
				// const url = 'https://pink.irdop.org/ab4dg2/delete/iden';
				// const payload = { identity_uid: row.identity_uid };
				// await apiPost(url, payload);

				// Remove the row from accountData only if API call succeeds
				const updatedData = accountData.filter((_, index) => index !== rowIndex);
				setAccountData(updatedData);

				toast.success('Đã xóa hàng thành công');
			} catch (err) {
				console.error('Error deleting row:', err);
				toast.error('Xóa hàng không thành công');
			}
		}
	};

	// Required field names
	const requiredFields = ['identity_name', 'email', 'password'];

	return (
		<div className="w-full h-full relative">
			<ToastContainer />

			<div className="rounded-lg w-full p-4 bg-white flex flex-col h-full">
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-2xl font-bold text-primary text-start">Danh sách tài khoản</h1>
				</div>

				{loading ? (
					<div className="flex justify-center items-center h-64">
						<p className="text-lg">Đang tải dữ liệu...</p>
					</div>
				) : error ? (
					<div className="flex justify-center items-center h-64">
						<p className="text-red-500 text-lg">{error}</p>
					</div>
				) : (
					<div className="overflow-auto mt-1">
						<table className="w-full mt-1">
							<thead>
								<tr className="bg-gray-100">
									{columns.map((column, index) => (
										<th
											key={index}
											className={`border text-start p-2 relative ${
												index > 4 || column === 'technician_alias' ? 'group' : ''
											}`}
										>
											{/* Column header with original case */}
											{column}

											{/* Show delete icon for role columns (including technician_alias) */}
											{(index > 4 || column === 'technician_alias') && (
												<span
													className="hidden group-hover:flex absolute bottom-1 right-1 
																cursor-pointer"
													onClick={() => handleDeleteColumn(column, index)}
													title={`Xóa cột ${column}`}
												>
													<FaTrashAlt className="text-red-500 hover:text-red-700 transition-colors" size={14} />
												</span>
											)}
										</th>
									))}
									<th className="border text-start p-2">
										<input
											type="text"
											className="w-full p-1 border rounded bg-white min-w-[100px]"
											placeholder="New role..."
											value={newColumnName}
											onChange={(e) => setNewColumnName(e.target.value)}
											onBlur={handleAddColumn}
											onKeyPress={handleColumnInputKeyPress}
										/>
									</th>
								</tr>
							</thead>
							<tbody>
								{accountData.length > 0 ? (
									accountData.map((row, rowIndex) => (
										<tr key={rowIndex} className="group">
											{columns.map((column, colIndex) => (
												<td key={`${rowIndex}-${colIndex}`} className="border text-start p-2 relative">
													{colIndex === 0 && (
														<span
															className="hidden group-hover:block absolute top-1 right-1 
																	cursor-pointer z-10"
															onClick={() => handleDeleteRow(rowIndex, row)}
															title="Xóa hàng"
														>
															<FaTrashAlt className="text-red-500 hover:text-red-700 transition-colors" size={14} />
														</span>
													)}
													{renderCellValue(row, column, colIndex, rowIndex)}
												</td>
											))}
											<td className="border p-2"></td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={columns.length + 1} className="border text-center p-4">
											Không có dữ liệu tài khoản
										</td>
									</tr>
								)}

								{/* Row for adding new data */}
								<tr>
									{columns.map((column, index) => (
										<td key={`new-${index}`} className="border p-2">
											{index > 4 && column !== 'technician_alias' ? (
												<div className="flex justify-center">
													<input
														type="checkbox"
														className="w-6 h-6 cursor-pointer"
														checked={newRowData[column] === true}
														onChange={(e) => handleNewRowChange(column, e.target.checked, index)}
													/>
												</div>
											) : (
												<input
													type={column === 'relation_id' ? 'number' : 'text'}
													className={`w-full p-1 border rounded bg-white ${
														validationErrors[column] ? 'border-red-500' : ''
													}`}
													value={column === 'relation_id' ? newRowData[column] || 4 : newRowData[column] || ''}
													onChange={(e) => handleNewRowChange(column, e.target.value, index)}
													onKeyPress={(e) => handleNewRowKeyPress(e, index)}
													onBlur={() => handleNewRowBlur(column)}
													disabled={column === 'identity_uid'}
													placeholder={column === 'identity_uid' ? 'Auto-generated' : ''}
												/>
											)}
										</td>
									))}
									<td className="border p-2"></td>
								</tr>
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Add some CSS for hover effects */}
			<style jsx>{`
				.group:hover {
					background-color: #f3f4f6;
				}
			`}</style>
		</div>
	);
};

export default AccountInfor;
