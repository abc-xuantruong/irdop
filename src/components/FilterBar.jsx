import * as React from 'react';
const { useContext, useState, useEffect, useRef } = React;
import { GlobalContext } from '../contexts/GlobalContext';
import axios from 'axios';
import { FiFilter } from 'react-icons/fi';
import { FaSortAlphaDown, FaPlus, FaTrash } from 'react-icons/fa';

const FilterBar = ({ source, setCurrentList, typeSearch, setIsFilter }) => {
	const {
		setCurrentSort,
		setCurrentFilter,
		currentKey,
		searchProtocol,
		searchAnalyte,
		technicians,
		setCurrentKey,
		searchClient,
		searchAnalysis,
	} = useContext(GlobalContext);
	const [searchTerm, setSearchTerm] = useState('');
	const [currentList, setCurrentListState] = useState(source);

	const [showSortOptions, setShowSortOptions] = useState(false);
	const [showFilterOptions, setShowFilterOptions] = useState(false);
	const [activeFilters, setActiveFilters] = useState(false);
	const [activeSorts, setActiveSorts] = useState(false);

	const [sortRows, setSortRows] = useState([{ field: '', order: 'asc' }]);
	const [filterRows, setFilterRows] = useState([]);

	const sortRef = useRef(null);
	const filterRef = useRef(null);
	const sortButtonRef = useRef(null);
	const filterButtonRef = useRef(null);

	// Handle clicks outside of dropdown menus
	useEffect(() => {
		function handleClickOutside(event) {
			// For sort dropdown: close only if click is outside both the dropdown AND the toggle button
			if (
				sortRef.current &&
				!sortRef.current.contains(event.target) &&
				sortButtonRef.current &&
				!sortButtonRef.current.contains(event.target)
			) {
				setShowSortOptions(false);
			}

			// For filter dropdown: close only if click is outside both the dropdown AND the toggle button
			if (
				filterRef.current &&
				!filterRef.current.contains(event.target) &&
				filterButtonRef.current &&
				!filterButtonRef.current.contains(event.target)
			) {
				setShowFilterOptions(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	useEffect(() => {
		setCurrentListState(source);

		switch (typeSearch) {
			case 'protocol':
				setCurrentKey([
					{ key: 'protocol_name', value: 'Tên phương pháp' },
					{ key: 'protocol_code', value: 'Mã phương pháp' },
					{ key: 'protocol_description', value: 'Mô tả' },
				]);
				break;
			case 'parameter':
				setCurrentKey([
					{ key: 'parameter_name', value: 'Tên chỉ tiêu' },
					{ key: 'matrix', value: 'Nền mẫu' },
					{ key: 'alias', value: 'Mã KTV' },
					{ key: 'accreditation', value: 'Chứng nhận' },
					{ key: 'protocol_source', value: 'Nguồn' },
					{ key: 'protocol_code', value: 'Mã phương pháp' },
				]);
				break;
			case 'receipt':
				setCurrentKey([
					{ key: 'receipt_uid', value: 'Mã tiếp nhận' },
					{ key: 'created_at', value: 'Ngày tiếp nhận' },
					{ key: 'deadline', value: 'Hạn trả' },
				]);
				break;
			case 'analysis':
				setCurrentKey([
					{ key: 'parameter_name', value: 'Tên chỉ tiêu' },
					{ key: 'accreditation', value: 'Chứng nhận' },
					{ key: 'protocol_code', value: 'Mã phương pháp' },
					{ key: 'result_unit', value: 'Đơn vị kết quả' },
					{ key: 'deadline', value: 'Hạn trả' },
					{ key: 'technician_uid', value: 'Người thực hiện' },
				]);
				break;
			case 'client':
				setCurrentKey([
					{ key: 'client_uid', value: 'Mã KH' },
					{ key: 'client_name', value: 'Tên KH' },
					{ key: 'client_address', value: 'Địa chỉ' },
					{ key: 'legal_id', value: 'MST/CCCD' },
				]);
				break;
			case 'processing_v1':
				setCurrentKey([
					{ key: 'parameter_name', value: 'Tên chỉ tiêu' },
					{ key: 'matrix', value: 'Nền mẫu' },
					{ key: 'protocol_code', value: 'Mã phương pháp' },
					{ key: 'sample_uid', value: 'Mã mẫu thử' },
					{ key: 'technician_uid', value: 'Người thực hiện' },
				]);
				break;
		}
	}, []);

	useEffect(() => {
		// Initialize filter rows when currentKey changes with one row per key
		if (currentKey && currentKey.length > 0) {
			const initialFilterRows = currentKey.map((key) => ({
				key: key.key,
				operator: 'include',
				value: '',
				logic: 'AND',
			}));

			setFilterRows(initialFilterRows);

			// Initialize sort rows too
			setSortRows([{ field: currentKey[0]?.key || '', order: 'asc' }]);
		}
	}, [currentKey]);

	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
		if (typeSearch === 'protocol') {
			setCurrentList(searchProtocol(e.target.value, source));
		} else if (typeSearch === 'parameter') {
			setCurrentList(searchAnalyte(e.target.value, source));
		} else if (typeSearch === 'analysis') {
			setCurrentList(searchAnalysis(e.target.value, source));
		} else if (typeSearch === 'client') {
			setCurrentList(searchClient(e.target.value, source));
		}

		// Set isFilter to true if search term is not empty
		if (e.target.value.trim() !== '') {
			setIsFilter && setIsFilter(true);
		}
	};

	const handleSearchKeyPress = async (e) => {
		console.log(e.key);
		if (e.key === 'Enter') {
			// If search term is empty, reset to source data
			if (searchTerm.trim() === '') {
				setCurrentList(source);
				setIsFilter && setIsFilter(false);
				return;
			}

			setIsFilter && setIsFilter(true);

			if (typeSearch === 'receipt') {
				try {
					const response = await axios.post('https://black.irdop.org/khsi19me/db/search/receipt', {
						query: searchTerm,
					});
					setCurrentList(response.data);
				} catch (error) {
					console.error('Error searching receipts:', error);
				}
			} else if (typeSearch === 'processing_v1') {
				try {
					const response = await axios.post('https://black.irdop.org/to82oe92i/sample/processing/search/v1', {
						query: searchTerm,
					});
					setCurrentList(response.data);
				} catch (error) {
					console.error('Error searching processing_v1:', error);
				}
			} else if (typeSearch === 'processing_v2') {
				try {
					const response = await axios.post('https://black.irdop.org/to82oe92i/sample/processing/search/v2', {
						query: searchTerm,
					});
					setCurrentList(response.data);
				} catch (error) {
					console.error('Error searching processing_v2:', error);
				}
			}
		}
	};

	// Toggle filter dropdown
	const toggleFilterOptions = () => {
		if (showSortOptions) {
			setShowSortOptions(false);
		}
		setShowFilterOptions(!showFilterOptions);
	};

	// Toggle sort dropdown
	const toggleSortOptions = () => {
		if (showFilterOptions) {
			setShowFilterOptions(false);
		}
		setShowSortOptions(!showSortOptions);
	};

	// Update filter row values
	const updateFilterRow = (index, field, value) => {
		const newRows = [...filterRows];
		newRows[index][field] = value;
		setFilterRows(newRows);
	};

	// Add new sort row
	const addSortRow = () => {
		setSortRows([...sortRows, { field: currentKey[0]?.key || '', order: 'asc' }]);
	};

	// Remove sort row
	const removeSortRow = (index) => {
		const newSortRows = [...sortRows];
		newSortRows.splice(index, 1);
		setSortRows(newSortRows.length > 0 ? newSortRows : [{ field: currentKey[0]?.key || '', order: 'asc' }]);
	};

	// Update sort row
	const updateSortRow = (index, field, value) => {
		const newSortRows = [...sortRows];
		newSortRows[index][field] = value;
		setSortRows(newSortRows);
	};

	// Add new filter row
	const addFilterRow = () => {
		setFilterRows([
			...filterRows,
			{
				key: currentKey[0]?.key || '',
				operator: 'include',
				value: '',
				logic: 'AND',
			},
		]);
	};

	// Remove filter row
	const removeFilterRow = (index) => {
		const newFilterRows = [...filterRows];
		newFilterRows.splice(index, 1);
		setFilterRows(
			newFilterRows.length > 0
				? newFilterRows
				: [
						{
							key: currentKey[0]?.key || '',
							operator: 'include',
							value: '',
							logic: 'AND',
						},
				  ],
		);
	};

	// Helper function to get technician alias by technician_uid
	const getTechnicianAlias = (technician_uid) => {
		if (!technician_uid) return '';
		const technician = technicians.find((tech) => tech.identity_uid === technician_uid);
		return technician ? technician.alias : '';
	};

	// Helper function to find technician_uid by alias
	const findTechnicianUidByAlias = (alias) => {
		if (!alias) return '';
		const technician = technicians.find((tech) => tech.alias && tech.alias.toLowerCase().includes(alias.toLowerCase()));
		return technician ? technician.identity_uid : '';
	};

	// Apply filters
	const applyFilters = () => {
		// Only consider filter rows with non-empty values
		const validFilters = filterRows.filter((row) => row.value && row.value.trim() !== '');
		console.log(validFilters);
		console.log(source);

		// If no valid filters, return the original source
		if (validFilters.length === 0) {
			setCurrentList(source);
			setCurrentFilter([]);
			setActiveFilters(false);
			setShowFilterOptions(false);
			// Set isFilter state to false since no filters are applied
			setIsFilter && setIsFilter(false);
			return;
		}

		// Apply the valid filters
		let filteredList = [...source];

		validFilters.forEach((filter, index) => {
			if (filter.logic === 'AND' || index === 0) {
				filteredList = filteredList.filter((item) => {
					// Special handling for technician_uid
					if (filter.key === 'technician_uid') {
						const techAlias = getTechnicianAlias(item.technician_uid);
						return applyOperator(techAlias, filter.operator, filter.value);
					}
					return applyOperator(item[filter.key], filter.operator, filter.value);
				});
			} else if (filter.logic === 'OR') {
				const additionalItems = source.filter((item) => {
					// Special handling for technician_uid
					if (filter.key === 'technician_uid') {
						const techAlias = getTechnicianAlias(item.technician_uid);
						return applyOperator(techAlias, filter.operator, filter.value);
					}
					return applyOperator(item[filter.key], filter.operator, filter.value);
				});

				// Add unique items from additionalItems to filteredList
				additionalItems.forEach((item) => {
					if (!filteredList.some((existing) => JSON.stringify(existing) === JSON.stringify(item))) {
						filteredList.push(item);
					}
				});
			}
		});

		setCurrentList(filteredList);
		setCurrentFilter(validFilters);
		setActiveFilters(true);
		setShowFilterOptions(false);

		// Set isFilter state to true since filters are applied
		setIsFilter && setIsFilter(true);
	};

	// Apply sort with updated logic
	const applySort = () => {
		// Filter out rows with empty fields
		const validSortRows = sortRows.filter((row) => row.field);

		if (validSortRows.length > 0) {
			// Clone the source array to avoid modifying the original
			let sortedList = [...source];

			// Apply each sort in sequence
			sortedList.sort((a, b) => {
				// Loop through each sort configuration
				for (const sortConfig of validSortRows) {
					let valA, valB;

					// Special handling for technician_uid
					if (sortConfig.field === 'technician_uid') {
						valA = getTechnicianAlias(a.technician_uid || '').toLowerCase();
						valB = getTechnicianAlias(b.technician_uid || '').toLowerCase();
					} else {
						// Regular field handling
						valA = a[sortConfig.field];
						valB = b[sortConfig.field];

						// Ensure values are defined
						if (valA === undefined) valA = '';
						if (valB === undefined) valB = '';

						// Convert to lowercase for string comparison
						if (typeof valA === 'string') valA = valA.toLowerCase();
						if (typeof valB === 'string') valB = valB.toLowerCase();
					}

					// Compare the values
					if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
					if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
				}

				// If all sort configs yield equality
				return 0;
			});

			setCurrentList(sortedList);
			setCurrentSort(validSortRows);
			setActiveSorts(true);
			// Set isFilter state to true since sorts are applied
			setIsFilter && setIsFilter(true);
		} else {
			// If no valid sorts, reset to source
			setCurrentList(source);
			setActiveSorts(false);
			// Set isFilter state to false since no sorts are applied
			setIsFilter && setIsFilter(false);
		}
		setShowSortOptions(false);
	};

	// Helper function to apply different operators
	const applyOperator = (itemValue, operator, filterValue) => {
		// Convert values to strings to ensure string comparison
		const strItemValue = String(itemValue || '').toLowerCase();
		const strFilterValue = String(filterValue || '').toLowerCase();

		switch (operator) {
			case 'include':
				return strItemValue.includes(strFilterValue);
			case 'not in':
				return !strItemValue.includes(strFilterValue);
			case '>':
				// Compare as strings, not as numbers
				return strItemValue > strFilterValue;
			case '>=':
				return strItemValue >= strFilterValue;
			case '<':
				return strItemValue < strFilterValue;
			case '<=':
				return strItemValue <= strFilterValue;
			case '===':
				return strItemValue === strFilterValue;
			default:
				return true;
		}
	};

	// Reset all filter values
	const resetFilters = () => {
		const resetRows = filterRows.map((row) => ({
			...row,
			value: '',
		}));
		setFilterRows(resetRows);

		// Don't reset isFilter state here - only after applying the reset
		// with applyFilters
	};

	// Reset sort
	const resetSort = () => {
		const resetRows = sortRows.map((row) => ({
			...row,
			field: '',
			order: 'asc',
		}));
		setSortRows(resetRows);
		setActiveSorts(false);

		// Don't reset isFilter state here - only after applying the reset
	};

	const closeFilters = () => {
		setShowFilterOptions(false);
	};

	const closeSort = () => {
		setShowSortOptions(false);
	};

	const filterConditions = [
		{ key: 'include', value: '⊃' },
		{ key: 'not in', value: '⊄' },
		{ key: '>', value: '>' },
		{ key: '>=', value: '≥' },
		{ key: '<', value: '<' },
		{ key: '<=', value: '≤' },
		{ key: '===', value: '≡' },
	];

	return (
		<div className="relative flex flex-col md:flex-row items-center justify-end text-black w-full bg-white rounded-lg leading-none">
			<div className="flex flex-col md:flex-row items-center w-full justify-end">
				<div className="flex items-center">
					<button
						ref={sortButtonRef}
						onClick={toggleSortOptions}
						className={`p-2 border border-gray-400 rounded-lg ${
							activeSorts ? 'bg-blue-500 text-white' : 'bg-white'
						} flex items-center justify-center mr-2`}
						title="Sắp xếp"
					>
						<FaSortAlphaDown />
					</button>
					<button
						ref={filterButtonRef}
						onClick={toggleFilterOptions}
						className={`p-2 border border-gray-400 rounded-lg ${
							activeFilters ? 'bg-blue-500 text-white' : 'bg-white'
						} flex items-center justify-center mr-2`}
						title="Lọc"
					>
						<FiFilter />
					</button>
					<input
						type="text"
						value={searchTerm}
						onChange={handleSearchChange}
						onKeyPress={handleSearchKeyPress}
						className="p-1.5 border text-md border-gray-400 rounded-lg bg-white w-60 md:w-auto min-w-60"
						placeholder="Search..."
					/>
				</div>

				{/* Sort dropdown */}
				{showSortOptions && (
					<div
						ref={sortRef}
						className="absolute right-0 top-full mt-2 p-4 border rounded bg-white shadow-lg z-20 w-96 max-h-80 overflow-y-auto"
					>
						<h3 className="font-bold mb-3 border-b pb-2">Sắp xếp theo</h3>

						{sortRows.map((row, index) => (
							<div key={index} className="mb-4 pb-1 border-b">
								<div className="flex items-center mb-1">
									<select
										value={row.field}
										onChange={(e) => updateSortRow(index, 'field', e.target.value)}
										className="p-1.5 border border-gray-300 rounded bg-white flex-grow mr-1"
									>
										<option value="">-- Chọn trường --</option>
										{currentKey.map((key) => (
											<option key={key.key} value={key.key}>
												{key.value}
											</option>
										))}
									</select>
									<select
										value={row.order}
										onChange={(e) => updateSortRow(index, 'order', e.target.value)}
										className="p-1.5 border border-gray-300 rounded bg-white w-28"
									>
										<option value="asc">Tăng dần</option>
										<option value="desc">Giảm dần</option>
									</select>

									<button
										onClick={() => removeSortRow(index)}
										className="ml-1 p-1.5 border border-gray-300 rounded hover:bg-red-100 text-red-500"
										title="Xóa"
									>
										<FaTrash size={14} />
									</button>
								</div>
							</div>
						))}

						<div className="flex justify-between">
							<div className="flex">
								<button
									onClick={resetSort}
									className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 bg-white mr-2"
								>
									Reset
								</button>
								<button
									onClick={addSortRow}
									className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 bg-white items-center"
								>
									Thêm
								</button>
							</div>
							<div>
								<button
									onClick={closeSort}
									className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 mr-2 bg-white"
								>
									Đóng
								</button>
								<button onClick={applySort} className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600">
									Áp dụng
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Filter dropdown */}
				{showFilterOptions && (
					<div
						ref={filterRef}
						className="absolute right-0 top-full mt-2 p-4 border rounded bg-white shadow-lg z-20 w-96 max-h-80 overflow-y-auto"
					>
						<h3 className="font-bold mb-3 border-b pb-2">Lọc dữ liệu</h3>

						{filterRows.map((row, index) => (
							<div key={index} className="mb-2 pb-1 border-b">
								{index > 0 && (
									<div className="flex">
										<select
											value={row.logic}
											onChange={(e) => updateFilterRow(index, 'logic', e.target.value)}
											className="p-0.5 text-xs font-medium border border-gray-300 rounded bg-white w-fit"
										>
											<option value="AND">Và</option>
											<option value="OR">Hoặc</option>
										</select>
									</div>
								)}

								<div className="flex items-center mb-1">
									<select
										value={row.key}
										onChange={(e) => updateFilterRow(index, 'key', e.target.value)}
										className="px-0.5 py-1 border border-gray-300 rounded bg-white mr-1 flex-1 max-w-36"
									>
										{currentKey.map((key) => (
											<option key={key.key} value={key.key}>
												{key.value}
											</option>
										))}
									</select>

									<select
										value={row.operator}
										onChange={(e) => updateFilterRow(index, 'operator', e.target.value)}
										className="p-[1px] border border-gray-300 rounded bg-white mr-1 w-fit text-xl"
									>
										{filterConditions.map((condition) => (
											<option key={condition.key} value={condition.key}>
												{condition.value}
											</option>
										))}
									</select>

									<input
										type="text"
										value={row.value}
										onChange={(e) => updateFilterRow(index, 'value', e.target.value)}
										className="px-0.5 py-[5px]  border border-gray-300 rounded bg-white w-full"
										placeholder="Giá trị"
									/>
									<button
										onClick={() => removeFilterRow(index)}
										className="px-0.5 py-2.5 ml-0.5 border border-white rounded hover:border-red-100 text-red-500"
										title="Xóa"
									>
										<FaTrash size={14} />
									</button>
								</div>
							</div>
						))}

						<div className="flex justify-between mt-3">
							<div className="flex">
								<button
									onClick={resetFilters}
									className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 bg-white mr-2"
								>
									Reset
								</button>
								<button
									onClick={addFilterRow}
									className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 bg-white items-center"
								>
									Thêm
								</button>
							</div>
							<div>
								<button
									onClick={closeFilters}
									className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 mr-2 bg-white"
								>
									Đóng
								</button>
								<button onClick={applyFilters} className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600">
									Áp dụng
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default FilterBar;
