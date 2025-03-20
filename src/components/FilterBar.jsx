import * as React from 'react';
const { useContext, useState, useEffect, useRef } = React;
import { GlobalContext } from '../contexts/GlobalContext';
import axios from 'axios';
import { FiFilter } from 'react-icons/fi';
import { FaSortAlphaDown, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const FilterBar = ({ source, setCurrentList, typeSearch, setIsFilter, hide = [] }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();
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
	const [activeQuickFilters, setActiveQuickFilters] = useState({
		deadline: null, // 'today', 'twoDays'
		status: null, // 0, 1, 2
	});

	const [sortRows, setSortRows] = useState([{ field: '', order: 'asc' }]);
	const [filterRows, setFilterRows] = useState([]);
	const [specialFilters, setSpecialFilters] = useState({
		deadline: '',
		status: '',
		dateRange: { startDate: null, endDate: null },
	});

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
			case 'processing_v2':
				setCurrentKey([
					{ key: 'sample_uid', value: 'Mã mẫu thử' },
					{ key: 'matrix', value: 'Nền mẫu' },
					{ key: 'result_value', value: 'Kết quả' },
					{ key: 'result_unit', value: 'Đơn vị' },
				]);
				break;
		}
	}, [typeSearch]);

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
			// Reset special filters when type changes
			setSpecialFilters({
				deadline: '',
				status: '',
				dateRange: { startDate: null, endDate: null },
			});
		}
	}, [currentKey]);

	// Add this useEffect to handle URL parameter changes
	useEffect(() => {
		// Parse URL parameters and apply them
		const handleUrlParameters = async () => {
			const searchQuery = searchParams.get('search') || '';
			const filterQuery = searchParams.get('filter') || '';
			const sortQuery = searchParams.get('sort') || '';

			let processedData = [...source];

			// Priority 1: Apply search if exists
			if (searchQuery) {
				setSearchTerm(searchQuery);
				try {
					if (typeSearch === 'protocol') {
						processedData = searchProtocol(searchQuery, source);
					} else if (typeSearch === 'parameter') {
						processedData = searchAnalyte(searchQuery, source);
					} else if (typeSearch === 'analysis') {
						processedData = searchAnalysis(searchQuery, source);
					} else if (typeSearch === 'client') {
						processedData = searchClient(searchQuery, source);
					} else if (typeSearch === 'receipt') {
						const response = await axios.post('https://black.irdop.org/khsi19me/db/search/receipt', {
							query: searchQuery,
						});
						processedData = response.data;
					} else if (typeSearch === 'processing_v1') {
						const response = await axios.post('https://black.irdop.org/to82oe92i/sample/processing/search/v1', {
							query: searchQuery,
						});
						processedData = response.data;
					} else if (typeSearch === 'processing_v2') {
						const response = await axios.post('https://black.irdop.org/to82oe92i/sample/processing/search/v2', {
							query: searchQuery,
						});
						processedData = response.data;
					}
				} catch (error) {
					console.error('Error searching:', error);
				}
			}

			// Priority 2: Apply filters if exist
			if (filterQuery) {
				const parsedFilters = parseFilterQuery(filterQuery);
				if (parsedFilters.length > 0) {
					setFilterRows(parsedFilters);
					setActiveFilters(true);

					// Apply filters to the already searched data
					if (typeSearch === 'processing_v2') {
						// Special handling for processing_v2
						// ...existing processing_v2 filtering logic...
					} else {
						parsedFilters.forEach((filter, index) => {
							if (filter.logic === 'AND' || index === 0) {
								processedData = processedData.filter((item) => {
									if (filter.key === 'technician_uid') {
										const techAlias = getTechnicianAlias(item.technician_uid);
										return applyOperator(techAlias, filter.operator, filter.value);
									}
									return applyOperator(item[filter.key], filter.operator, filter.value);
								});
							} else if (filter.logic === 'OR') {
								const additionalItems = (searchQuery ? processedData : source).filter((item) => {
									if (filter.key === 'technician_uid') {
										const techAlias = getTechnicianAlias(item.technician_uid);
										return applyOperator(techAlias, filter.operator, filter.value);
									}
									return applyOperator(item[filter.key], filter.operator, filter.value);
								});

								// Add unique items
								additionalItems.forEach((item) => {
									if (!processedData.some((existing) => JSON.stringify(existing) === JSON.stringify(item))) {
										processedData.push(item);
									}
								});
							}
						});
					}
				}
			}

			// Priority 3: Apply sorts if exist
			if (sortQuery) {
				const parsedSorts = parseSortQuery(sortQuery);
				if (parsedSorts.length > 0) {
					setSortRows(parsedSorts);
					setActiveSorts(true);

					// Apply sorting to the filtered data
					processedData.sort((a, b) => {
						for (const sortConfig of parsedSorts) {
							let valA, valB;

							if (sortConfig.field === 'technician_uid') {
								valA = getTechnicianAlias(a.technician_uid || '').toLowerCase();
								valB = getTechnicianAlias(b.technician_uid || '').toLowerCase();
							} else {
								valA = a[sortConfig.field];
								valB = b[sortConfig.field];

								if (valA === undefined) valA = '';
								if (valB === undefined) valB = '';

								if (typeof valA === 'string') valA = valA.toLowerCase();
								if (typeof valB === 'string') valB = valB.toLowerCase();
							}

							if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
							if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
						}
						return 0;
					});
				}
			}

			// Set the processed data as the current list
			if (searchQuery || filterQuery || sortQuery) {
				setCurrentList(processedData);
				setIsFilter && setIsFilter(true);
			}
		};

		handleUrlParameters();
	}, [searchParams, typeSearch, source]);

	// Convert filter rows to URL query format
	const filterRowsToQuery = (filters) => {
		return filters
			.filter((filter) => filter.value && filter.value.trim() !== '')
			.map((filter) => `${filter.logic || 'AND'}-${filter.key}-${filter.operator}-${encodeURIComponent(filter.value)}`)
			.join(',');
	};

	// Parse filter query back to filter rows
	const parseFilterQuery = (query) => {
		if (!query) return [];

		const filterArray = [];

		// Split the query into individual filter strings
		const filterStrings = query.split(',');

		for (const filterStr of filterStrings) {
			const parts = filterStr.split('-');

			// Regular filter parsing
			const [logic, key, operator, ...valueParts] = parts;
			// Join value parts in case the value itself contained hyphens
			const value = decodeURIComponent(valueParts.join('-'));

			// Add to filter rows
			filterArray.push({
				logic: logic,
				key: key,
				operator: operator,
				value: value,
			});

			// If this is a date range filter for deadline, also update the UI date pickers
			if (key === 'deadline' && typeSearch === 'receipt') {
				if (operator === '>=') {
					// Parse date in local timezone
					setSpecialFilters((prev) => ({
						...prev,
						dateRange: {
							...prev.dateRange,
							startDate: new Date(value),
						},
					}));
				} else if (operator === '<=') {
					// Parse date in local timezone
					setSpecialFilters((prev) => ({
						...prev,
						dateRange: {
							...prev.dateRange,
							endDate: new Date(value),
						},
					}));
				}
			}
		}

		return filterArray;
	};

	// Convert sort rows to URL query format
	const sortRowsToQuery = (sorts) => {
		return sorts
			.filter((sort) => sort.field)
			.map((sort) => `${sort.field}-${sort.order}`)
			.join(',');
	};

	// Parse sort query back to sort rows
	const parseSortQuery = (query) => {
		if (!query) return [];

		return query.split(',').map((sortStr) => {
			const [field, order] = sortStr.split('-');
			return {
				field: field,
				order: order || 'asc',
			};
		});
	};

	// Apply search from URL
	const applySearchFromUrl = async (searchTerm) => {
		if (searchTerm.trim() === '') {
			setCurrentList(source);
			setIsFilter && setIsFilter(false);
			return;
		}

		setIsFilter && setIsFilter(true);

		if (typeSearch === 'protocol') {
			setCurrentList(searchProtocol(searchTerm, source));
		} else if (typeSearch === 'parameter') {
			setCurrentList(searchAnalyte(searchTerm, source));
		} else if (typeSearch === 'client') {
			setCurrentList(searchClient(searchTerm, source));
		} else if (typeSearch === 'analysis') {
			setCurrentList(searchAnalysis(searchTerm, source));
		} else if (typeSearch === 'receipt') {
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
	};

	// Apply filters from URL
	const applyFiltersFromUrl = (filters) => {
		// Reuse existing filter logic but with the provided filters
		let filteredList = [...source];

		if (typeSearch === 'processing_v2') {
			// Handle processing_v2 special case using existing logic
			// ...existing special processing_v2 filter logic...
			// This would be a copy of the processing_v2 specific logic from the applyFilters function

			// For brevity, calling the existing function
			setFilterRows(filters);
			applyFilters();
		} else {
			// Regular filtering for other types
			filters.forEach((filter, index) => {
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
			setCurrentFilter(filters);
			setActiveFilters(true);
			setIsFilter && setIsFilter(true);
		}
	};

	// Apply sorts from URL
	const applySortsFromUrl = (sorts) => {
		if (sorts.length > 0) {
			let sortedList = [...source];

			sortedList.sort((a, b) => {
				for (const sortConfig of sorts) {
					let valA, valB;

					if (sortConfig.field === 'technician_uid') {
						valA = getTechnicianAlias(a.technician_uid || '').toLowerCase();
						valB = getTechnicianAlias(b.technician_uid || '').toLowerCase();
					} else {
						valA = a[sortConfig.field];
						valB = b[sortConfig.field];

						if (valA === undefined) valA = '';
						if (valB === undefined) valB = '';

						if (typeof valA === 'string') valA = valA.toLowerCase();
						if (typeof valB === 'string') valB = valB.toLowerCase();
					}

					if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
					if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
				}
				return 0;
			});

			setCurrentList(sortedList);
			setCurrentSort(sorts);
			setActiveSorts(true);
			setIsFilter && setIsFilter(true);
		}
	};

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
			// No longer update URL here - only update on Enter
		} else {
			setIsFilter && setIsFilter(false);
			// No longer update URL here - only update on Enter
		}
	};

	const handleSearchKeyPress = async (e) => {
		if (e.key === 'Enter') {
			// If search term is empty, reset to source data and clear search param
			if (searchTerm.trim() === '') {
				setCurrentList(source);
				setIsFilter && setIsFilter(false);
				updateUrlParams('search', null);
				return;
			}

			setIsFilter && setIsFilter(true);

			// For receipt type, always redirect to dashboard with search parameter
			if (typeSearch === 'receipt') {
				// Redirect to dashboard with search query
				navigate(`/dashboard?search=${encodeURIComponent(searchTerm)}`);
				return;
			}

			// Update URL with search parameter
			updateUrlParams('search', searchTerm);

			// Apply search first (priority 1)
			let searchResults = source;

			if (typeSearch === 'processing_v1') {
				try {
					const response = await axios.post('https://black.irdop.org/to82oe92i/sample/processing/search/v1', {
						query: searchTerm,
					});
					searchResults = response.data;
					setCurrentList(searchResults);
				} catch (error) {
					console.error('Error searching processing_v1:', error);
				}
			} else if (typeSearch === 'processing_v2') {
				try {
					const response = await axios.post('https://black.irdop.org/to82oe92i/sample/processing/search/v2', {
						query: searchTerm,
					});
					searchResults = response.data;
					setCurrentList(searchResults);
				} catch (error) {
					console.error('Error searching processing_v2:', error);
				}
			} else if (typeSearch === 'protocol') {
				searchResults = searchProtocol(searchTerm, source);
				setCurrentList(searchResults);
			} else if (typeSearch === 'parameter') {
				searchResults = searchAnalyte(searchTerm, source);
				setCurrentList(searchResults);
			} else if (typeSearch === 'analysis') {
				searchResults = searchAnalysis(searchTerm, source);
				setCurrentList(searchResults);
			} else if (typeSearch === 'client') {
				searchResults = searchClient(searchTerm, source);
				setCurrentList(searchResults);
			}

			// If there are active filters, apply them to search results (priority 2)
			if (activeFilters) {
				const validFilters = filterRows.filter((row) => row.value && row.value.trim() !== '');
				if (validFilters.length > 0) {
					// Apply filters to the search results
					let filteredResults = searchResults;

					if (typeSearch === 'processing_v2') {
						// Apply special processing for processing_v2
						// This would need to replicate the processing_v2 specific logic
						// from the applyFilters function
					} else {
						// Regular filtering for other types
						validFilters.forEach((filter, index) => {
							if (filter.logic === 'AND' || index === 0) {
								filteredResults = filteredResults.filter((item) => {
									// Special handling for technician_uid
									if (filter.key === 'technician_uid') {
										const techAlias = getTechnicianAlias(item.technician_uid);
										return applyOperator(techAlias, filter.operator, filter.value);
									}
									return applyOperator(item[filter.key], filter.operator, filter.value);
								});
							} else if (filter.logic === 'OR') {
								const additionalItems = searchResults.filter((item) => {
									// Special handling for technician_uid
									if (filter.key === 'technician_uid') {
										const techAlias = getTechnicianAlias(item.technician_uid);
										return applyOperator(techAlias, filter.operator, filter.value);
									}
									return applyOperator(item[filter.key], filter.operator, filter.value);
								});

								// Add unique items
								additionalItems.forEach((item) => {
									if (!filteredResults.some((existing) => JSON.stringify(existing) === JSON.stringify(item))) {
										filteredResults.push(item);
									}
								});
							}
						});
					}

					setCurrentList(filteredResults);

					// Update filter parameter in URL if it doesn't exist yet
					const filterQuery = filterRowsToQuery(validFilters);
					if (!searchParams.has('filter')) {
						updateUrlParams('filter', filterQuery);
					}
				}
			}

			// If there are active sorts, apply them to the filtered results (priority 3)
			if (activeSorts) {
				const validSortRows = sortRows.filter((row) => row.field);
				if (validSortRows.length > 0) {
					// Get current list to apply sorting
					let listToSort = [...currentList];

					// Apply sorting
					listToSort.sort((a, b) => {
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
						return 0;
					});

					setCurrentList(listToSort);

					// Update sort parameter in URL if it doesn't exist yet
					const sortQuery = sortRowsToQuery(validSortRows);
					if (!searchParams.has('sort')) {
						updateUrlParams('sort', sortQuery);
					}
				}
			}
		}
	};

	// Helper function to update URL parameters
	const updateUrlParams = (paramName, value) => {
		const newSearchParams = new URLSearchParams(searchParams);

		if (value === null || value === '') {
			newSearchParams.delete(paramName);
		} else {
			newSearchParams.set(paramName, value);
		}

		setSearchParams(newSearchParams);
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

	// Apply filters - updated to handle processing_v2 and receipt special cases
	const applyFilters = () => {
		// Filter out existing deadline filters to avoid duplicates
		let baseFilters = filterRows.filter(
			(row) =>
				row.value &&
				row.value.trim() !== '' &&
				!(typeSearch === 'receipt' && row.key === 'deadline' && (row.operator === '>=' || row.operator === '<=')),
		);

		// Create a copy of filtered rows
		let allFilters = [...baseFilters];

		// For receipt type, add date range filters to regular filter rows
		if (typeSearch === 'receipt') {
			// Add start date filter if it exists
			if (specialFilters.dateRange.startDate) {
				// Format date with GMT+7 timezone
				const date = new Date(specialFilters.dateRange.startDate);
				// Format YYYY-MM-DD in local timezone
				const startDateStr =
					date.getFullYear() +
					'-' +
					String(date.getMonth() + 1).padStart(2, '0') +
					'-' +
					String(date.getDate()).padStart(2, '0');

				allFilters.push({
					logic: 'AND',
					key: 'deadline',
					operator: '>=',
					value: startDateStr,
				});
			}

			// Add end date filter if it exists
			if (specialFilters.dateRange.endDate) {
				// Format date with GMT+7 timezone
				const date = new Date(specialFilters.dateRange.endDate);
				// Format YYYY-MM-DD in local timezone
				const endDateStr =
					date.getFullYear() +
					'-' +
					String(date.getMonth() + 1).padStart(2, '0') +
					'-' +
					String(date.getDate()).padStart(2, '0');

				allFilters.push({
					logic: 'AND',
					key: 'deadline',
					operator: '<=',
					value: endDateStr,
				});
			}
		}

		// Check if there are any valid filters or special filters for processing_v2
		const hasSpecialProcessingFilters =
			typeSearch === 'processing_v2' && (specialFilters.deadline !== '' || specialFilters.status !== '');

		// If no valid filters and no special filters, return the original source
		if (allFilters.length === 0 && !hasSpecialProcessingFilters) {
			setCurrentList(source);
			setCurrentFilter([]);
			setActiveFilters(false);
			setShowFilterOptions(false);
			// Set isFilter state to false since no filters are applied
			setIsFilter && setIsFilter(false);
			// Remove filter parameter from URL
			updateUrlParams('filter', null);
			return;
		}

		// Update URL with all filter parameters
		if (allFilters.length > 0) {
			const filterQuery = filterRowsToQuery(allFilters);
			updateUrlParams('filter', filterQuery);
		} else {
			updateUrlParams('filter', null);
		}

		// Special handling for receipt data type
		if (typeSearch === 'receipt') {
			let filteredList = [...source];

			// Apply all filters
			allFilters.forEach((filter, index) => {
				if (filter.logic === 'AND' || index === 0) {
					filteredList = filteredList.filter((item) => applyOperator(item[filter.key], filter.operator, filter.value));
				} else if (filter.logic === 'OR') {
					const additionalItems = source.filter((item) =>
						applyOperator(item[filter.key], filter.operator, filter.value),
					);

					// Add unique items
					additionalItems.forEach((item) => {
						if (!filteredList.some((existing) => JSON.stringify(existing) === JSON.stringify(item))) {
							filteredList.push(item);
						}
					});
				}
			});

			setCurrentList(filteredList);
			setCurrentFilter(allFilters);
			setActiveFilters(true);
			setShowFilterOptions(false);
			setIsFilter && setIsFilter(true);
			return;
		}

		// Special handling for processing_v2 data type
		if (typeSearch === 'processing_v2') {
			let filteredList = [...source];

			// Apply sample-level filters first (sample_uid, matrix)
			const sampleLevelFilters = allFilters.filter((filter) => filter.key === 'sample_uid' || filter.key === 'matrix');

			if (sampleLevelFilters.length > 0) {
				sampleLevelFilters.forEach((filter, index) => {
					if (filter.logic === 'AND' || index === 0) {
						filteredList = filteredList.filter((sample) =>
							applyOperator(sample[filter.key], filter.operator, filter.value),
						);
					} else if (filter.logic === 'OR') {
						const additionalItems = source.filter((sample) =>
							applyOperator(sample[filter.key], filter.operator, filter.value),
						);

						// Add unique items
						additionalItems.forEach((item) => {
							if (!filteredList.some((existing) => existing.sample_uid === item.sample_uid)) {
								filteredList.push(item);
							}
						});
					}
				});
			}

			// Apply analysis-level filters (result_value, result_unit)
			const analysisLevelFilters = allFilters.filter(
				(filter) => filter.key === 'result_value' || filter.key === 'result_unit',
			);

			if (analysisLevelFilters.length > 0) {
				filteredList = filteredList.map((sample) => {
					// Clone the sample to avoid modifying the original
					const filteredSample = { ...sample };

					if (!filteredSample.analysis || !Array.isArray(filteredSample.analysis)) {
						return filteredSample;
					}

					// Filter the analysis array
					filteredSample.analysis = filteredSample.analysis.filter((analysis) => {
						let shouldKeep = true;

						analysisLevelFilters.forEach((filter, index) => {
							const matches = applyOperator(analysis[filter.key], filter.operator, filter.value);

							if (index === 0) {
								shouldKeep = matches;
							} else if (filter.logic === 'AND') {
								shouldKeep = shouldKeep && matches;
							} else if (filter.logic === 'OR') {
								shouldKeep = shouldKeep || matches;
							}
						});

						return shouldKeep;
					});

					return filteredSample;
				});

				// Remove samples with empty analysis arrays after filtering
				filteredList = filteredList.filter(
					(sample) => sample.analysis && Array.isArray(sample.analysis) && sample.analysis.length > 0,
				);
			}

			// Apply status filter if selected
			if (specialFilters.status) {
				if (specialFilters.status === 'incomplete') {
					// For incomplete status:
					// 1. Keep samples that have at least one incomplete analysis
					// 2. Filter each sample's analysis array to only keep incomplete analyses
					filteredList = filteredList.filter((sample) => {
						if (!sample.analysis || !Array.isArray(sample.analysis) || sample.analysis.length === 0) {
							return false;
						}

						// Check if any analysis has empty result_value
						const hasIncompleteAnalysis = sample.analysis.some(
							(analysis) =>
								analysis.result_value === '' || analysis.result_value === null || analysis.result_value === undefined,
						);

						if (hasIncompleteAnalysis) {
							// Keep only incomplete analyses in this sample
							sample.analysis = sample.analysis.filter(
								(analysis) =>
									analysis.result_value === '' || analysis.result_value === null || analysis.result_value === undefined,
							);
							return true;
						}

						return false;
					});
				} else {
					// For other statuses, use the status code mapping as before
					const statusMap = {
						waiting: 0,
						urgent: 1,
					};

					filteredList = filteredList.filter((sample) => sample.status === statusMap[specialFilters.status]);
				}
			}

			// Apply deadline filter if selected
			if (specialFilters.deadline) {
				filteredList = filteredList.filter((sample) => {
					// Check if sample has analysis array
					if (!sample.analysis || !Array.isArray(sample.analysis) || sample.analysis.length === 0) {
						return false;
					}

					// Get all valid deadlines from analyses
					const deadlines = sample.analysis
						.map((a) => (a.deadline ? new Date(a.deadline) : null))
						.filter((d) => d !== null);

					if (deadlines.length === 0) return false;

					const currentDate = new Date();
					currentDate.setHours(0, 0, 0, 0); // Start of today

					if (specialFilters.deadline === 'today') {
						// Check if any deadline is today or past
						return deadlines.some((deadline) => {
							const deadlineDate = new Date(deadline);
							deadlineDate.setHours(0, 0, 0, 0); // Start of deadline day
							return deadlineDate <= currentDate;
						});
					} else if (specialFilters.deadline === 'twoDays') {
						// Check if any deadline is within next 2 days (not including today)
						const twoDaysFromNow = new Date();
						twoDaysFromNow.setDate(currentDate.getDate() + 2);
						twoDaysFromNow.setHours(23, 59, 59, 999); // End of the second day

						return deadlines.some((deadline) => {
							const deadlineDate = new Date(deadline);
							return deadlineDate > currentDate && deadlineDate <= twoDaysFromNow;
						});
					}

					return true;
				});
			}

			setCurrentList(filteredList);
			setCurrentFilter(allFilters);
			setActiveFilters(true);
			setShowFilterOptions(false);
			setIsFilter && setIsFilter(true);
			return;
		}

		// Regular filtering for other types
		let filteredList = [...source];

		allFilters.forEach((filter, index) => {
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
		setCurrentFilter(allFilters);
		setActiveFilters(true);
		setShowFilterOptions(false);
		setIsFilter && setIsFilter(true);
	};

	// Apply sort with updated logic
	const applySort = () => {
		// Filter out rows with empty fields
		const validSortRows = sortRows.filter((row) => row.field);

		if (validSortRows.length > 0) {
			// Update URL with sort parameters only when Apply is clicked
			const sortQuery = sortRowsToQuery(validSortRows);
			updateUrlParams('sort', sortQuery);

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
			// Remove sort parameter from URL
			updateUrlParams('sort', null);
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

		// Reset special filters for processing_v2 and receipt
		setSpecialFilters({
			deadline: '',
			status: '',
			dateRange: { startDate: null, endDate: null },
		});

		// Remove filter parameter from URL
		updateUrlParams('filter', null);
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

		// Remove sort parameter from URL
		updateUrlParams('sort', null);
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

	// Apply quick filters for processing_v2
	const applyQuickFilter = (filterType, value) => {
		// Toggle filter if the same value is selected again
		if (activeQuickFilters[filterType] === value) {
			setActiveQuickFilters((prev) => ({
				...prev,
				[filterType]: null,
			}));
		} else {
			setActiveQuickFilters((prev) => ({
				...prev,
				[filterType]: value,
			}));
		}

		// Apply filters
		applyProcessingV2Filters();
	};

	// Reset quick filters
	const resetQuickFilters = () => {
		setActiveQuickFilters({
			deadline: null,
			status: null,
		});
		setCurrentList(source);
		setIsFilter && setIsFilter(false);
	};

	// Apply filters for processing_v2 data
	const applyProcessingV2Filters = () => {
		if (!source || !Array.isArray(source)) return;

		// Start with all samples
		let filteredList = [...source];
		let filterApplied = false;

		// Filter by status if selected
		if (activeQuickFilters.status !== null) {
			filteredList = filteredList.filter((sample) => sample.status === activeQuickFilters.status);
			filterApplied = true;
		}

		// Filter by deadline
		if (activeQuickFilters.deadline !== null) {
			filteredList = filteredList.filter((sample) => {
				// Check if sample has analysis array
				if (!sample.analysis || !Array.isArray(sample.analysis) || sample.analysis.length === 0) {
					return false;
				}

				// Get all valid deadlines from analyses
				const deadlines = sample.analysis
					.map((a) => (a.deadline ? new Date(a.deadline) : null))
					.filter((d) => d !== null);

				if (deadlines.length === 0) return false;

				const currentDate = new Date();
				currentDate.setHours(0, 0, 0, 0); // Start of today

				if (activeQuickFilters.deadline === 'today') {
					// Check if any deadline is today or past
					return deadlines.some((deadline) => {
						const deadlineDate = new Date(deadline);
						deadlineDate.setHours(0, 0, 0, 0); // Start of deadline day
						return deadlineDate <= currentDate;
					});
				} else if (activeQuickFilters.deadline === 'twoDays') {
					// Check if any deadline is within next 2 days (not including today)
					const twoDaysFromNow = new Date();
					twoDaysFromNow.setDate(currentDate.getDate() + 2);
					twoDaysFromNow.setHours(23, 59, 59, 999); // End of the second day

					const tomorrow = new Date();
					tomorrow.setDate(currentDate.getDate() + 1);
					tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow

					return deadlines.some((deadline) => {
						const deadlineDate = new Date(deadline);
						return deadlineDate > currentDate && deadlineDate <= twoDaysFromNow;
					});
				}
				return true;
			});
			filterApplied = true;
		}

		setCurrentList(filteredList);
		setIsFilter && setIsFilter(filterApplied);
	};

	// Handle special filter change
	const handleSpecialFilterChange = (filterType, value) => {
		setSpecialFilters((prev) => ({ ...prev, [filterType]: value }));
	};

	// Handle date range change for receipt filtering
	const handleDateRangeChange = (type, date) => {
		setSpecialFilters((prev) => ({
			...prev,
			dateRange: {
				...prev.dateRange,
				[type]: date,
			},
		}));
	};

	return (
		<div className="relative flex flex-col md:flex-row items-center justify-end text-black w-full bg-white rounded-lg leading-none">
			{/* Remove the quick filters that were here before */}

			<div className="flex flex-col md:flex-row items-center w-full justify-end">
				<div className="flex items-center">
					{!hide.includes('sort') && (
						<button
							ref={sortButtonRef}
							onClick={toggleSortOptions}
							className={`p-2 border border-gray-400 rounded-lg ${
								activeSorts ? 'bg-blue-600 text-white' : 'bg-white'
							} flex items-center justify-center mr-2 focus:outline-none`}
							title="Sắp xếp"
						>
							<FaSortAlphaDown />
						</button>
					)}

					{!hide.includes('filter') && (
						<button
							ref={filterButtonRef}
							onClick={toggleFilterOptions}
							className={`p-2 border border-gray-400 rounded-lg ${
								activeFilters ? 'bg-blue-600 text-white' : 'bg-white'
							} flex items-center justify-center mr-2 focus:outline-none`}
							title="Lọc"
						>
							<FiFilter />
						</button>
					)}

					{!hide.includes('search') && (
						<input
							type="text"
							value={searchTerm}
							onChange={handleSearchChange}
							onKeyPress={handleSearchKeyPress}
							className="p-1.5 border text-md border-gray-400 rounded-lg bg-white w-60 md:w-auto min-w-60"
							placeholder="Search..."
						/>
					)}
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
										className="ml-1 p-1.5 border border-gray-300 rounded hover:bg-red-100 text-red-500 "
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
								<button onClick={applySort} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-600">
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

						{/* Special date range filter for receipt */}
						{typeSearch === 'receipt' && (
							<div className="mb-3 pb-2 border-b">
								<div className="flex gap-2 items-center">
									<div className="text-sm font-medium">Hạn trả:</div>
									<div className="flex items-center gap-2">
										<span className="text-sm">Từ:</span>
										<DatePicker
											selected={specialFilters.dateRange.startDate}
											onChange={(date) => handleDateRangeChange('startDate', date)}
											selectsStart
											startDate={specialFilters.dateRange.startDate}
											endDate={specialFilters.dateRange.endDate}
											dateFormat="dd/MM/yyyy"
											placeholderText="Từ ngày"
											className="p-1.5 border border-gray-300 rounded bg-white w-24"
										/>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-sm">Đến:</span>
										<DatePicker
											selected={specialFilters.dateRange.endDate}
											onChange={(date) => handleDateRangeChange('endDate', date)}
											selectsEnd
											startDate={specialFilters.dateRange.startDate}
											endDate={specialFilters.dateRange.endDate}
											minDate={specialFilters.dateRange.startDate}
											dateFormat="dd/MM/yyyy"
											placeholderText="Đến ngày"
											className="p-1.5 border border-gray-300 rounded bg-white w-24"
										/>
									</div>
								</div>
							</div>
						)}

						{/* Special filters for processing_v2 */}
						{typeSearch === 'processing_v2' && (
							<>
								<div className="mb-3 pb-2 border-b">
									<div className="flex flex-col gap-2">
										{/* Deadline filter */}
										<div className="flex items-center">
											<label className="w-24 text-sm font-medium text-start">Hạn trả:</label>
											<select
												value={specialFilters.deadline}
												onChange={(e) => handleSpecialFilterChange('deadline', e.target.value)}
												className="p-1.5 border border-gray-300 rounded bg-white flex-1"
											>
												<option value="">-- Tất cả --</option>
												<option value="today">Hết hạn hôm nay</option>
												<option value="twoDays">Hết hạn trong 2 ngày</option>
											</select>
										</div>

										{/* Status filter */}
										<div className="flex items-center">
											<label className="w-24 text-sm font-medium text-start">Trạng thái:</label>
											<select
												value={specialFilters.status}
												onChange={(e) => handleSpecialFilterChange('status', e.target.value)}
												className="p-1.5 border border-gray-300 rounded bg-white flex-1"
											>
												<option value="">-- Tất cả --</option>
												<option value="waiting">Đang chờ</option>
												<option value="urgent">Mẫu khẩn</option>
												<option value="incomplete">Chưa hoàn thành</option>
											</select>
										</div>
									</div>
								</div>
							</>
						)}

						{/* Regular filter rows */}
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
								<button onClick={applyFilters} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-600">
									Áp dụng
								</button>
							</div>
						</div>
					</div>
				)}

				{/* ...existing sorting dropdown... */}
			</div>
		</div>
	);
};

export default FilterBar;
