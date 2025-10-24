import * as React from 'react';
const { useContext, useState, useEffect, useRef } = React;
import { createPortal } from 'react-dom';
import FilterBar from './FilterBar';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import { RiEdit2Line } from 'react-icons/ri';
import { GiConfirmed, GiCancel, GiTrashCan } from 'react-icons/gi';
import { FaSort, FaSortUp, FaSortDown, FaFilter, FaEdit, FaCheck, FaUndo } from 'react-icons/fa';
import { MdFilterAlt, MdFilterAltOff } from 'react-icons/md';
import { toast, ToastContainer } from 'react-toastify';
import AnalyteBulkUpdate from './AnalyteBulkUpdate';
import 'react-toastify/dist/ReactToastify.css';

const AnalyteInfor = () => {
	const { setCurrentTitlePage, currentUser, technicians } = useContext(GlobalContext);
	const [analytes, setAnalytes] = useState([]);

	const [editingRow, setEditingRow] = useState(null);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [newAnalyte, setNewAnalyte] = useState({
		parameterName: '',
		scientificField: 'Hóa lý',
		matrix: '',
		_deprecated_productType: '',
		tat_expected: '1 day',
		defaultUnit: '',
		accreditation: '',
		technicianAlias: 'K01',
		protocolCode: '',
		parameterId: '',
		protocolSource: 'IRDOP',
		displayStyle: [
			{ label: 'default', value: '' },
			{ label: 'eng', value: '' },
		],
		fee: 0,
	});
	const [protocolSearch, setProtocolSearch] = useState('');

	const [isProtocolDropdownVisible, setIsProtocolDropdownVisible] = useState(false);
	const [originalAnalytes, setOriginalAnalytes] = useState([]);
	const [protocolPage, setProtocolPage] = useState(1);
	const [listProtocol, setListProtocol] = useState([]);
	const [protocols, setProtocols] = useState([]);
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const [expandedRow, setExpandedRow] = useState(null);
	const [selectedAnalyteId, setSelectedAnalyteId] = useState(null);

	// Add new state variables for unique lists and dropdowns
	const [uniqueParameterNames, setUniqueParameterNames] = useState([]);
	const [uniqueMatrices, setUniqueMatrices] = useState([]);
	const [uniqueProtocolCodes, setUniqueProtocolCodes] = useState([]);
	const [uniqueUnits, setUniqueUnits] = useState([]);
	const [protocolSources, setProtocolSources] = useState([]);
	const [parameterNameInput, setParameterNameInput] = useState('');
	const [matrixInput, setMatrixInput] = useState('');
	const [protocolCodeInput, setProtocolCodeInput] = useState('');
	const [unitInput, setUnitInput] = useState('');
	const [showParameterNameDropdown, setShowParameterNameDropdown] = useState(false);
	const [showMatrixDropdown, setShowMatrixDropdown] = useState(false);
	const [showProtocolCodeDropdown, setShowProtocolCodeDropdown] = useState(false);
	const [showUnitDropdown, setShowUnitDropdown] = useState(false);
	const [editingParameterName, setEditingParameterName] = useState(null);
	const [editingMatrix, setEditingMatrix] = useState(null);
	const [editingProtocolCode, setEditingProtocolCode] = useState(null);
	const [editingUnit, setEditingUnit] = useState(null);

	// Add filter states
	const [fieldFilter, setFieldFilter] = useState('');
	const [matrixFilter, setMatrixFilter] = useState('');
	const [sourceFilter, setSourceFilter] = useState('');
	const [technicianFilter, setTechnicianFilter] = useState('');
	const [showFieldDropdown, setShowFieldDropdown] = useState(false);
	const [showMatrixFilterDropdown, setShowMatrixFilterDropdown] = useState(false);
	const [showSourceDropdown, setShowSourceDropdown] = useState(false);
	const [showTechnicianFilterDropdown, setShowTechnicianFilterDropdown] = useState(false);
	const [filteredAnalytes, setFilteredAnalytes] = useState([]);

	// Add new API search states
	const [searchTerm, setSearchTerm] = useState('');
	const [pagination, setPagination] = useState({
		currentPage: 1,
		itemsPerPage: 100,
		totalItems: 0,
		totalPages: 0,
	});
	const [loading, setLoading] = useState(false);
	const [columnSort, setColumnSort] = useState('parameterName');
	const [sortBy, setSortBy] = useState('ASC');
	const [columnFilters, setColumnFilters] = useState({});

	// Add column filter input states
	const [columnFilterInputs, setColumnFilterInputs] = useState({});
	const [showColumnFilters, setShowColumnFilters] = useState({});

	// Add technician states
	const [techniciansList, setTechniciansList] = useState([]);
	const [technicianDropdowns, setTechnicianDropdowns] = useState({});

	// Add row selection states
	const [selectedRows, setSelectedRows] = useState(new Set());
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartRow, setDragStartRow] = useState(null);
	const [showBulkUpdate, setShowBulkUpdate] = useState(false);
	const [bulkUpdating, setBulkUpdating] = useState(false);

	const protocolsPerPage = 5;
	const analytesPerPage = 100;
	let isFetch = false;

	// Add new state variables for pagination in dropdowns
	const [parameterNamePage, setParameterNamePage] = useState(1);
	const [matrixPage, setMatrixPage] = useState(1);
	const [protocolCodePage, setProtocolCodePage] = useState(1);
	const [unitPage, setUnitPage] = useState(1);
	const itemsPerPage = 10;

	useEffect(() => {
		setCurrentTitlePage('Chỉ tiêu');
	}, [setCurrentTitlePage]);

	// Add effect to handle clicks outside dropdowns
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (!event.target.closest('.filter-dropdown')) {
				setShowFieldDropdown(false);
				setShowMatrixFilterDropdown(false);
				setShowSourceDropdown(false);
				setShowTechnicianFilterDropdown(false);
			}
			// Close technician dropdowns when clicking outside
			if (!event.target.closest('.technician-dropdown') && !event.target.closest('.technician-portal')) {
				setTechnicianDropdowns({});
			}
			// Close search dropdowns when clicking outside
			if (!event.target.closest('.search-dropdown')) {
				setShowParameterNameDropdown(false);
				setShowMatrixDropdown(false);
				setShowProtocolCodeDropdown(false);
				setShowUnitDropdown(false);
			}
			// Close column filter dropdowns when clicking outside
			if (!event.target.closest('th') && !event.target.closest('.column-filter-dropdown')) {
				setShowColumnFilters({});
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	useEffect(() => {
		if (technicians.length > 0 && !isFetch) {
			isFetch = true;
			fetchAnalytes(1, 100, '', {}, 'parameterName', 'ASC');
			fetchMatricesList();
			fetchProtocolSourcesList();
			fetchUnitsList();
			fetchTechnicians();
		}
	}, [technicians]);

	// Add mouse up event listener for drag selection
	useEffect(() => {
		document.addEventListener('mouseup', handleMouseUp);
		return () => {
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, []);

	// Add effect to apply filters
	useEffect(() => {
		let filtered = analytes;

		if (fieldFilter) {
			filtered = filtered.filter((analyte) => analyte.scientificField === fieldFilter);
		}

		if (matrixFilter) {
			filtered = filtered.filter((analyte) => analyte.matrix === matrixFilter);
		}

		if (sourceFilter) {
			filtered = filtered.filter((analyte) => analyte.protocolSource === sourceFilter);
		}

		// Technician filter is now handled by API, so no local filtering needed
		// if (technicianFilter) {
		//     filtered = filtered.filter((analyte) => analyte.technicianAlias === technicianFilter);
		// }

		setFilteredAnalytes(filtered);
	}, [analytes, fieldFilter, matrixFilter, sourceFilter]);

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
					plugins: '', // Không sử dụng plugins
					toolbar: false, // Ẩn hoàn toàn toolbar
					menubar: false,
					height: '24px', // Reduced height to match our h-6 class
					width: '100%',
					statusbar: false,
					resize: false,
					border_width: 0, // Loại bỏ viền
					content_style: `
				body { 
					margin: 0 !important; 
					padding: 0 !important; 
					border: none !important;
					line-height: 1.2 !important;
					font-family: Arial, sans-serif; 
					font-size: 12px;
					overflow: hidden !important;
					border-radius: 0 !important;
				}
				body::-webkit-scrollbar {
					display: none !important;
				}
				body {
					-ms-overflow-style: none !important;
					scrollbar-width: none !important;
				}
					p{
					margin: 0 !important;
					line-height: 1.2 !important;
					}
			`,
					body_class: 'no-scroll',
					setup: function (editor) {
						editor.on('init', function () {
							editor.setContent(initialValue || '');

							// Điều chỉnh container và iframe
							const container = editor.getContainer();
							const iframe = container.querySelector('iframe');

							if (container) {
								container.style.height = '100%';
								container.style.width = '100%';
								container.style.border = 'none';
								container.style.padding = '0';
								container.style.margin = '0';
								container.style.borderRadius = '0';

								// Loại bỏ border radius của table container
								const tableContainer = container.querySelector('.mce-container');
								if (tableContainer) {
									tableContainer.style.borderRadius = '0';
								}

								// Loại bỏ border radius của tất cả elements con
								const allElements = container.querySelectorAll('*');
								allElements.forEach((el) => {
									el.style.borderRadius = '0';
								});
							}

							if (iframe) {
								iframe.style.border = 'none';
								iframe.style.padding = '0';
								iframe.style.margin = '0';
								iframe.style.borderRadius = '0';

								// Điều chỉnh body bên trong iframe
								const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
								if (iframeDoc && iframeDoc.body) {
									iframeDoc.body.style.margin = '0';
									iframeDoc.body.style.padding = '0';
									iframeDoc.body.style.border = 'none';
									iframeDoc.body.style.lineHeight = '1.2';
									iframeDoc.body.style.overflow = 'hidden';
									iframeDoc.body.style.borderRadius = '0';

									// Loại bỏ scrollbar
									const style = iframeDoc.createElement('style');
									style.textContent = `
								body::-webkit-scrollbar { display: none !important; }
								body { -ms-overflow-style: none !important; scrollbar-width: none !important; }
								html { overflow: hidden !important; }
								* { border-radius: 0 !important; }
							`;
									iframeDoc.head.appendChild(style);
								}
							}
						});

						editor.on('change input keyup', function () {
							const content = editor.getContent();
							if (onChange) {
								onChange(content);
							}
						});

						// Xử lý keyboard shortcuts cho sub/sup và replace *
						editor.on('keydown', function (e) {
							// Handle ^ key for superscript (Shift + 6 hoặc caret key)
							if ((e.shiftKey && e.keyCode === 54) || e.key === '^') {
								e.preventDefault();

								const selectedText = editor.selection.getContent();
								if (selectedText) {
									// Nếu có text được chọn, wrap với sup
									editor.selection.setContent(`<sup>${selectedText}</sup>`);
								} else {
									// Nếu không có text được chọn, chèn empty sup tag và đặt cursor vào
									editor.insertContent('<sup>&nbsp;</sup>');
									// Di chuyển cursor vào trong sup tag
									const range = editor.selection.getRng();
									const supElement = editor.dom.select('sup')[editor.dom.select('sup').length - 1];
									if (supElement) {
										range.selectNodeContents(supElement);
										range.collapse(true);
										editor.selection.setRng(range);
									}
								}
								return false;
							}

							// Handle _ key for subscript (Shift + - hoặc underscore key)
							if ((e.shiftKey && e.keyCode === 189) || e.key === '_') {
								e.preventDefault();
								console.log('Subscript triggered');

								const selectedText = editor.selection.getContent();
								if (selectedText) {
									// Nếu có text được chọn, wrap với sub
									editor.selection.setContent(`<sub>${selectedText}</sub>`);
								} else {
									// Nếu không có text được chọn, chèn empty sub tag và đặt cursor vào
									editor.insertContent('<sub>&nbsp;</sub>');
									// Di chuyển cursor vào trong sub tag
									const range = editor.selection.getRng();
									const subElement = editor.dom.select('sub')[editor.dom.select('sub').length - 1];
									if (subElement) {
										range.selectNodeContents(subElement);
										range.collapse(true);
										editor.selection.setRng(range);
									}
								}
								return false;
							}
						});

						// Replace * với × khi người dùng gõ
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

						// Thêm event listener cho paste để xử lý content được paste
						editor.on('paste', function (e) {
							setTimeout(() => {
								const content = editor.getContent();
								if (content.includes('*')) {
									const newContent = content.replace(/\*/g, '×');
									editor.setContent(newContent);
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
			console.error('TinyMCE not available or element not found');
		}
	};

	// Clean up TinyMCE editors
	const cleanupTinyMCE = (selector) => {
		if (typeof window !== 'undefined' && window.tinymce && window.tinymce.get(selector)) {
			window.tinymce.get(selector).remove();
		}
	};

	// Initialize TinyMCE when editing starts
	useEffect(() => {
		if (editingRow !== null) {
			const analyte = analytes.find((a) => a.id === editingRow);
			const displayStyleArray = initializeDisplayStyle(analyte?.displayStyle);

			const initEditors = () => {
				const defaultElement = document.getElementById(`tinymce-${editingRow}-default`);
				const engElement = document.getElementById(`tinymce-${editingRow}-eng`);

				if (defaultElement && window.tinymce) {
					const defaultValue = getDisplayStyleValue(displayStyleArray, 'default');
					initTinyMCE(`tinymce-${editingRow}-default`, defaultValue, (content) => {
						const currentAnalyte = analytes.find((a) => a.id === editingRow);
						const currentDisplayStyle = initializeDisplayStyle(currentAnalyte?.displayStyle);
						const updatedDisplayStyle = setDisplayStyleValue(currentDisplayStyle, 'default', content);
						handleInputChange(editingRow, 'displayStyle', updatedDisplayStyle);
					});
				}

				if (engElement && window.tinymce) {
					const engValue = getDisplayStyleValue(displayStyleArray, 'eng');
					initTinyMCE(`tinymce-${editingRow}-default`, engValue, (content) => {
						const currentAnalyte = analytes.find((a) => a.id === editingRow);
						const currentDisplayStyle = initializeDisplayStyle(currentAnalyte?.displayStyle);
						const updatedDisplayStyle = setDisplayStyleValue(currentDisplayStyle, 'eng', content);
						handleInputChange(editingRow, 'displayStyle', updatedDisplayStyle);
					});
				}

				if ((!defaultElement || !engElement) && window.tinymce) {
					setTimeout(initEditors, 100);
				}
			};

			// Delay để đảm bảo DOM đã render
			setTimeout(initEditors, 200);

			// Cleanup khi editingRow thay đổi
			return () => {
				if (window.tinymce) {
					if (window.tinymce.get(`tinymce-${editingRow}-default`)) {
						window.tinymce.get(`tinymce-${editingRow}-default`).remove();
					}
					if (window.tinymce.get(`tinymce-${editingRow}-eng`)) {
						window.tinymce.get(`tinymce-${editingRow}-eng`).remove();
					}
				}
			};
		}
	}, [editingRow]);

	// Initialize TinyMCE for new analyte
	useEffect(() => {
		if (isAddingNew) {
			const initEditors = () => {
				const defaultElement = document.getElementById('tinymce-new-default');
				const engElement = document.getElementById('tinymce-new-eng');

				if (defaultElement && window.tinymce) {
					const defaultValue = getDisplayStyleValue(newAnalyte.displayStyle, 'default');
					initTinyMCE('tinymce-new-default', defaultValue, (content) => {
						const updatedDisplayStyle = setDisplayStyleValue(newAnalyte.displayStyle, 'default', content);
						handleNewAnalyteChange('displayStyle', updatedDisplayStyle);
					});
				}

				if (engElement && window.tinymce) {
					const engValue = getDisplayStyleValue(newAnalyte.displayStyle, 'eng');
					initTinyMCE('tinymce-new-eng', engValue, (content) => {
						const updatedDisplayStyle = setDisplayStyleValue(newAnalyte.displayStyle, 'eng', content);
						handleNewAnalyteChange('displayStyle', updatedDisplayStyle);
					});
				}

				if ((!defaultElement || !engElement) && window.tinymce) {
					setTimeout(initEditors, 100);
				}
			};

			setTimeout(initEditors, 200);

			return () => {
				if (window.tinymce) {
					if (window.tinymce.get('tinymce-new-default')) {
						window.tinymce.get('tinymce-new-default').remove();
					}
					if (window.tinymce.get('tinymce-new-eng')) {
						window.tinymce.get('tinymce-new-eng').remove();
					}
				}
			};
		}
	}, [isAddingNew]);

	// Cleanup editors when component unmounts or editing ends
	useEffect(() => {}, []);

	// Handle global mouse events for drag selection
	useEffect(() => {
		const handleGlobalMouseUp = () => {
			handleMouseUp();
		};

		document.addEventListener('mouseup', handleGlobalMouseUp);
		return () => {
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	}, []);

	// Helper functions for displayStyle array management
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

	const fetchAnalytes = async (
		page = 1,
		itemsPerPage = 100,
		searchValue = '',
		filters = {},
		sort = 'parameterName',
		sortDirection = 'ASC',
	) => {
		try {
			setLoading(true);

			// Prepare request body according to the specified format
			const requestBody = {
				itemsPerPage: itemsPerPage,
				page: page,
				columns: [
					'id',
					'parameterName',
					'scientificField',
					'matrix',
					'protocolSource',
					'protocolCode',
					'defaultUnit',
					'displayStyle',
					'fee',
					'accreditation',
					'technicianAlias',
					'parameterId',
				],
				columnSort: sort,
				sortBy: sortDirection,
				searchTerm: searchValue,
				...filters, // Spread any column-specific filters
			};

			const response = await apiPost('https://black.irdop.org/v1/parameter/get', requestBody);

			if (response.data && response.data.result) {
				const data = response.data.result.map((analyte) => ({
					...analyte,
					tat_expected: analyte?.tat_expected?.days
						? `${analyte.tat_expected.days} ${analyte.tat_expected.days > 1 ? 'days' : 'day'}`
						: '',
				}));

				setAnalytes(data);
				setOriginalAnalytes(data);

				// Update pagination info
				if (response.data.pagination) {
					setPagination(response.data.pagination);
				}
			} else {
				// Fallback to old API if new format doesn't work
				const fallbackResponse = await apiGet('https://black.irdop.org/ha8i0uw2/db/get/parameter');
				const data = fallbackResponse.data.map((analyte) => ({
					...analyte,
					tat_expected: analyte?.tat_expected?.days
						? `${analyte.tat_expected.days} ${analyte.tat_expected.days > 1 ? 'days' : 'day'}`
						: '',
				}));
				setAnalytes(data);
				setOriginalAnalytes(data);

				// Set default pagination for fallback
				setPagination({
					currentPage: 1,
					itemsPerPage: data.length,
					totalItems: data.length,
					totalPages: 1,
				});
			}

			// Extract unique lists for dropdowns
			extractUniqueLists(analytes);
		} catch (error) {
			console.error('Error fetching analytes:', error);
			toast.error('Failed to fetch analytes');
		} finally {
			setLoading(false);
		}
	};

	const fetchTechnicians = async () => {
		try {
			const response = await apiGet('https://pink.irdop.org/db/get/techinician');
			if (response.data && Array.isArray(response.data)) {
				setTechniciansList(response.data);
			}
		} catch (error) {
			console.error('Error fetching technicians:', error);
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
		const parameterNames = [...new Set(data.map((item) => item.parameterName || '').filter(Boolean))];
		const protocolCodes = [...new Set(data.map((item) => item.protocolCode || '').filter(Boolean))];

		setUniqueParameterNames(parameterNames);
		setUniqueProtocolCodes(protocolCodes);
	};

	// Add filter helper functions
	const getUniqueFields = () => {
		const currentList = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		return [...new Set(currentList.map((analyte) => analyte.scientificField).filter(Boolean))];
	};

	const getUniqueMatricesFromCurrent = () => {
		const currentList = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		return [...new Set(currentList.map((analyte) => analyte.matrix).filter(Boolean))];
	};

	const getUniqueSourcesFromCurrent = () => {
		const currentList = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		return [...new Set(currentList.map((analyte) => analyte.protocolSource).filter(Boolean))];
	};

	const getUniqueProtocolCodesFromCurrent = () => {
		const currentList = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		return [...new Set(currentList.map((analyte) => analyte.protocolCode).filter(Boolean))];
	};

	const getUniqueUnitsFromCurrent = () => {
		const currentList = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		return [...new Set(currentList.map((analyte) => analyte.defaultUnit).filter(Boolean))];
	};

	// Add scroll to top function
	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	};

	// Add search and filter handlers
	const handleSearch = async (searchValue = searchTerm, page = pagination.currentPage) => {
		await fetchAnalytes(page, pagination.itemsPerPage, searchValue, columnFilters, columnSort, sortBy);
	};

	const handleColumnFilter = async (column, value) => {
		const newFilters = { ...columnFilters };
		if (value) {
			newFilters[column] = value;
		} else {
			delete newFilters[column];
		}
		setColumnFilters(newFilters);
		await fetchAnalytes(
			1, // Reset to first page when filtering
			pagination.itemsPerPage,
			searchTerm,
			newFilters,
			columnSort,
			sortBy,
		);
		scrollToTop(); // Scroll to top when filtering
	};

	const handleSort = async (column) => {
		const newSortDirection = columnSort === column && sortBy === 'ASC' ? 'DESC' : 'ASC';
		setColumnSort(column);
		setSortBy(newSortDirection);
		await fetchAnalytes(
			pagination.currentPage,
			pagination.itemsPerPage,
			searchTerm,
			columnFilters,
			column,
			newSortDirection,
		);
	};

	const handleApiPageChange = async (page) => {
		await fetchAnalytes(page, pagination.itemsPerPage, searchTerm, columnFilters, columnSort, sortBy);
		scrollToTop(); // Scroll to top when changing page
	};

	// Add handler for items per page change
	const handleItemsPerPageChange = async (itemsPerPage) => {
		const newPagination = { ...pagination, itemsPerPage: parseInt(itemsPerPage) };
		setPagination(newPagination);
		await fetchAnalytes(
			1, // Reset to first page
			parseInt(itemsPerPage),
			searchTerm,
			columnFilters,
			columnSort,
			sortBy,
		);
		scrollToTop(); // Scroll to top when changing items per page
	};

	// Remove automatic debounced search - now handled manually with Enter/blur
	// useEffect(() => {
	// 	const delayedSearch = setTimeout(() => {
	// 		if (searchTerm !== undefined && isFetch) { // Only search after initial fetch
	// 			handleSearch(searchTerm, 1);
	// 		}
	// 	}, 500);

	// 	return () => clearTimeout(delayedSearch);
	// }, [searchTerm]);

	// Add filter handlers
	const handleFieldFilter = (field) => {
		setFieldFilter(fieldFilter === field ? '' : field);
		setShowFieldDropdown(false);
	};

	const handleMatrixFilter = (matrix) => {
		setMatrixFilter(matrixFilter === matrix ? '' : matrix);
		setShowMatrixFilterDropdown(false);
	};

	const handleSourceFilter = (source) => {
		setSourceFilter(sourceFilter === source ? '' : source);
		setShowSourceDropdown(false);
	};

	const handleTechnicianFilter = (technician) => {
		const newTechnician = technicianFilter === technician ? '' : technician;
		setTechnicianFilter(newTechnician);
		setShowTechnicianFilterDropdown(false);

		// Update columnFilters for API call
		const newFilters = { ...columnFilters };
		if (newTechnician) {
			newFilters.technicianAlias = newTechnician;
		} else {
			delete newFilters.technicianAlias;
		}
		setColumnFilters(newFilters);

		// Fetch data with new filter
		fetchAnalytes(
			1, // Reset to first page when filtering
			pagination.itemsPerPage,
			searchTerm,
			newFilters,
			columnSort,
			sortBy,
		);
		scrollToTop(); // Scroll to top when filtering
	};

	// Add toggle handlers for header clicks
	const toggleFieldDropdown = () => {
		setShowFieldDropdown(!showFieldDropdown);
		setShowMatrixFilterDropdown(false);
		setShowSourceDropdown(false);
		setShowProtocolCodeDropdown(false);
		setShowUnitDropdown(false);
		setShowTechnicianFilterDropdown(false);
	};

	const toggleMatrixDropdown = () => {
		setShowMatrixFilterDropdown(!showMatrixFilterDropdown);
		setShowFieldDropdown(false);
		setShowSourceDropdown(false);
		setShowProtocolCodeDropdown(false);
		setShowUnitDropdown(false);
		setShowTechnicianFilterDropdown(false);
	};

	const toggleProtocolDropdown = () => {
		setShowProtocolCodeDropdown(!showProtocolCodeDropdown);
		setShowFieldDropdown(false);
		setShowMatrixFilterDropdown(false);
		setShowSourceDropdown(false);
		setShowUnitDropdown(false);
		setShowTechnicianFilterDropdown(false);
	};

	const toggleUnitDropdown = () => {
		setShowUnitDropdown(!showUnitDropdown);
		setShowFieldDropdown(false);
		setShowMatrixFilterDropdown(false);
		setShowSourceDropdown(false);
		setShowProtocolCodeDropdown(false);
		setShowTechnicianFilterDropdown(false);
	};

	const toggleSourceDropdown = () => {
		setShowSourceDropdown(!showSourceDropdown);
		setShowFieldDropdown(false);
		setShowMatrixFilterDropdown(false);
		setShowProtocolCodeDropdown(false);
		setShowUnitDropdown(false);
		setShowTechnicianFilterDropdown(false);
	};

	const toggleTechnicianFilterDropdown = () => {
		setShowTechnicianFilterDropdown(!showTechnicianFilterDropdown);
		setShowFieldDropdown(false);
		setShowMatrixFilterDropdown(false);
		setShowSourceDropdown(false);
		setShowProtocolCodeDropdown(false);
		setShowUnitDropdown(false);
	};

	// Add functions for new column header functionality
	const handleColumnFilterInput = (column, value) => {
		setColumnFilterInputs((prev) => ({
			...prev,
			[column]: value,
		}));
	};

	const handleColumnFilterSubmit = async (column, value) => {
		const newFilters = { ...columnFilters };
		if (value && value.trim()) {
			newFilters[column] = value.trim();
		} else {
			delete newFilters[column];
		}
		setColumnFilters(newFilters);
		setShowColumnFilters((prev) => ({
			...prev,
			[column]: false,
		}));

		await fetchAnalytes(
			1, // Reset to first page when filtering
			pagination.itemsPerPage,
			searchTerm,
			newFilters,
			columnSort,
			sortBy,
		);
		scrollToTop(); // Scroll to top when applying column filter
	};

	const toggleColumnFilter = (column) => {
		setShowColumnFilters((prev) => ({
			...prev,
			[column]: !prev[column],
		}));
	};

	const getSortIcon = (column) => {
		if (columnSort !== column) {
			return <FaSort className="text-gray-400" />;
		}
		return sortBy === 'ASC' ? <FaSortUp className="text-blue-600" /> : <FaSortDown className="text-blue-600" />;
	};

	const getFilterIcon = (column) => {
		const hasFilter = columnFilters[column];
		const isActive = showColumnFilters[column];

		if (hasFilter) {
			return <MdFilterAlt className="text-blue-600" />;
		}
		if (isActive) {
			return <FaFilter className="text-blue-600" />;
		}
		return <FaFilter className="text-gray-400" />;
	};

	// Modified filter functions to show all results when input is empty or short
	const filterParameterNames = (input) => {
		if (!input || input.trim() === '') return uniqueParameterNames;
		if (input.length < 2) return uniqueParameterNames;
		return uniqueParameterNames.filter((name) => name && name.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterMatrices = (input) => {
		if (!input || input.trim() === '') return uniqueMatrices;
		if (input.length < 2) return uniqueMatrices;
		return uniqueMatrices.filter((matrix) => matrix && matrix.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterProtocolCodes = (input) => {
		if (!input || input.trim() === '') return uniqueProtocolCodes;
		if (input.length < 2) return uniqueProtocolCodes;
		return uniqueProtocolCodes.filter((code) => code && code.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterUnits = (input) => {
		if (!input || input.trim() === '') return uniqueUnits;
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
			handleInputChange(editingRow, 'parameterName', name);
		} else if (isAddingNew) {
			handleNewAnalyteChange('parameterName', name);
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
			handleInputChange(editingRow, 'protocolCode', code);
		} else if (isAddingNew) {
			handleNewAnalyteChange('protocolCode', code);
		}
		setShowProtocolCodeDropdown(false);
	};

	const handleUnitSelect = (unit) => {
		if (editingRow !== null) {
			handleInputChange(editingRow, 'defaultUnit', unit);
		} else if (isAddingNew) {
			handleNewAnalyteChange('defaultUnit', unit);
		}
		setShowUnitDropdown(false);
	};

	// Modified input change handlers
	const handleParameterNameInput = (id, value) => {
		setParameterNameInput(value);
		setParameterNamePage(1);
		if (editingRow !== null) {
			handleInputChange(id, 'parameterName', value);
			setEditingParameterName(id);
		} else {
			handleNewAnalyteChange('parameterName', value);
		}
		// Reset page when input changes and always show dropdown
		setParameterNamePage(1);
		setShowParameterNameDropdown(true);
	};

	const handleMatrixInput = (id, value) => {
		setMatrixInput(value);
		setMatrixPage(1);
		if (editingRow !== null) {
			handleInputChange(id, 'matrix', value);
			setEditingMatrix(id);
		} else {
			handleNewAnalyteChange('matrix', value);
		}
		// Reset page when input changes and always show dropdown
		setMatrixPage(1);
		setShowMatrixDropdown(true);
	};

	const handleProtocolCodeInputChange = (id, value) => {
		setProtocolCodeInput(value);
		setProtocolCodePage(1);
		if (editingRow !== null) {
			handleInputChange(id, 'protocolCode', value);
			setEditingProtocolCode(id);
		} else {
			handleNewAnalyteChange('protocolCode', value);
		}
		// Reset page when input changes and always show dropdown
		setProtocolCodePage(1);
		setShowProtocolCodeDropdown(true);
	};

	const handleUnitInput = (id, value) => {
		setUnitInput(value);
		setUnitPage(1);
		if (editingRow !== null) {
			handleInputChange(id, 'defaultUnit', value);
			setEditingUnit(id);
		} else {
			handleNewAnalyteChange('defaultUnit', value);
		}
		const filteredUnits = filterUnits(value);
		setShowUnitDropdown(true); // Always show dropdown when typing
	};

	// Add focus handlers for dropdowns
	const handleParameterNameFocus = (id) => {
		setEditingParameterName(id);
		setShowParameterNameDropdown(true);
		setParameterNamePage(1);
	};

	const handleMatrixFocus = (id) => {
		setEditingMatrix(id);
		setShowMatrixDropdown(true);
		setMatrixPage(1);
	};

	const handleProtocolCodeFocus = (id) => {
		setEditingProtocolCode(id);
		setShowProtocolCodeDropdown(true);
		setProtocolCodePage(1);
	};

	const handleUnitFocus = (id) => {
		setEditingUnit(id);
		setShowUnitDropdown(true);
		setUnitPage(1);
	};

	// Add technician helper functions
	const getTechnicianByAlias = (alias) => {
		return techniciansList.find((tech) => tech.alias === alias);
	};

	const getTechnicianDisplayName = (alias) => {
		const techOptions = getTechnicianOptions();
		const option = techOptions.find((opt) => opt.alias === alias);
		if (option) {
			// Hiển thị K01: identity_name (cho row)
			const realTech = getTechnicianByAlias(alias);
			if (realTech && realTech.identity_name) {
				return `${option.alias}: ${realTech.identity_name}`;
			}
			return `${option.alias}: ${option.title}`;
		}
		return alias || '';
	};

	// Function riêng cho dropdown display
	const getTechnicianDropdownDisplayName = (tech) => {
		return `${tech.alias}: ${tech.title} - ${tech.identity_name || tech.title}`;
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
			const tech = techniciansList.find((t) => t.alias === alias);
			options.push({
				alias: alias,
				identity_name: tech ? tech.identity_name : technicianTitles[alias],
				title: technicianTitles[alias],
				identity_uid: tech ? tech.identity_uid : '',
				email: tech ? tech.email : '',
			});
		}
		return options;
	};

	const handleTechnicianDropdownToggle = (analyteId) => {
		setTechnicianDropdowns((prev) => ({
			...prev,
			[analyteId]: !prev[analyteId],
		}));
	};

	const handleTechnicianSelect = async (analyteId, technician) => {
		try {
			// Update local state immediately
			const updatedAnalytes = analytes.map((analyte) => {
				if (analyte.id === analyteId) {
					return { ...analyte, technicianAlias: technician.alias }; // Store alias instead of identity_uid
				}
				return analyte;
			});
			setAnalytes(updatedAnalytes);

			// Close dropdown
			setTechnicianDropdowns((prev) => ({
				...prev,
				[analyteId]: false,
			}));

			// Update database
			const analyteToUpdate = updatedAnalytes.find((a) => a.id === analyteId);
			const { tat_expected, ...analyteWithoutTat } = analyteToUpdate;
			const finalAnalyte = {
				...analyteWithoutTat,
				modifiedById: currentUser.identity_uid,
			};

			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/update/parameter', {
				parameter: finalAnalyte,
			});

			if (response.status === 200) {
				toast.success('Technician updated successfully');
				setOriginalAnalytes(updatedAnalytes);
			} else {
				toast.error('Failed to update technician');
				setAnalytes(originalAnalytes);
			}
		} catch (error) {
			console.error('Error updating technician:', error);
			toast.error('Failed to update technician');
			setAnalytes(originalAnalytes);
		}
	};

	const fetchProtocols = async (searchTerm) => {
		try {
			if (listProtocol.length === 0) {
				const response = await apiGet('https://black.irdop.org/el9k24zah/db/get/protocol');
				setListProtocol(response.data || []);
			}
			const filteredProtocols = listProtocol.filter(
				(protocol) => protocol && protocol.protocolCode && protocol.protocolCode.includes(searchTerm || ''),
			);
			setProtocols(filteredProtocols || []);
		} catch (error) {
			console.error('Error fetching protocols:', error);
			setProtocols([]);
		}
	};

	const handleEditClick = (id) => {
		if (isAddingNew) {
			handleCancelNewAnalyte();
		}
		setEditingRow(id);
		setSelectedAnalyteId(id);
	};

	const handleSaveClick = async (id) => {
		// Get content from TinyMCE editors before saving
		const defaultEditorId = `tinymce-${id}-default`;
		const engEditorId = `tinymce-${id}-eng`;

		const updatedAnalyte = analytes.find((analyte) => analyte.id === id);
		let currentDisplayStyle = initializeDisplayStyle(updatedAnalyte.displayStyle);

		if (window.tinymce && window.tinymce.get(defaultEditorId)) {
			const defaultContent = window.tinymce.get(defaultEditorId).getContent();
			currentDisplayStyle = setDisplayStyleValue(currentDisplayStyle, 'default', defaultContent);
		}

		if (window.tinymce && window.tinymce.get(engEditorId)) {
			const engContent = window.tinymce.get(engEditorId).getContent();
			currentDisplayStyle = setDisplayStyleValue(currentDisplayStyle, 'eng', engContent);
		}

		// Update the displayStyle with the final array
		handleInputChange(id, 'displayStyle', currentDisplayStyle);

		const { tat_expected, ...analyteWithoutTat } = updatedAnalyte;
		const finalAnalyte = { ...analyteWithoutTat, displayStyle: currentDisplayStyle };

		try {
			finalAnalyte.modifiedById = currentUser.identity_uid;

			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/update/parameter', {
				parameter: finalAnalyte,
			});

			// Cleanup TinyMCE editors
			cleanupTinyMCE(defaultEditorId);
			cleanupTinyMCE(engEditorId);

			setEditingRow(null);
			if (response.status === 200) {
				toast.success('Analyte updated successfully');
				// Fetch fresh data from server to ensure consistency
				await fetchAnalytes(
					pagination.currentPage,
					pagination.itemsPerPage,
					searchTerm,
					columnFilters,
					columnSort,
					sortBy,
				);
			} else {
				toast.error('Analyte update failed');
				// Revert to original data on failure
				setAnalytes(originalAnalytes);
			}
		} catch (error) {
			console.error('Error updating analyte:', error);
			toast.error('Analyte update failed');
			// Revert to original data on error
			setAnalytes(originalAnalytes);
		}
	};

	const handleCancelClick = () => {
		// Cleanup TinyMCE editors
		if (editingRow !== null) {
			cleanupTinyMCE(`tinymce-${editingRow}-default`);
			cleanupTinyMCE(`tinymce-${editingRow}-eng`);
		}
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
		const confirmed = window.confirm(`Bạn chắc chắn muốn xóa chỉ tiêu: ${analyte.parameterName} (ID: ${analyte.id})?`);
		if (confirmed) {
			try {
				const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/delete/parameter', {
					id: analyte.id,
					modifiedById: currentUser.identity_uid,
				});
				if (response.status === 200) {
					toast.success('Analyte deleted successfully');
					// Fetch fresh data from server to ensure consistency
					await fetchAnalytes(
						pagination.currentPage,
						pagination.itemsPerPage,
						searchTerm,
						columnFilters,
						columnSort,
						sortBy,
					);
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
		if (editingRow !== null) {
			handleCancelClick();
		}
		setIsAddingNew(true);
	};

	const handleNewAnalyteChange = (field, value) => {
		setNewAnalyte({ ...newAnalyte, [field]: value });
		if (field === 'protocolCode' && value.length >= 5) {
			fetchProtocols(value);
			setIsProtocolDropdownVisible(true);
		} else {
			setIsProtocolDropdownVisible(false);
		}
	};

	const handleSaveNewAnalyte = async () => {
		// Get content from TinyMCE editors before saving
		let currentDisplayStyle = [...newAnalyte.displayStyle];

		if (window.tinymce && window.tinymce.get('tinymce-new-default')) {
			const defaultContent = window.tinymce.get('tinymce-new-default').getContent();
			currentDisplayStyle = setDisplayStyleValue(currentDisplayStyle, 'default', defaultContent);
		}

		if (window.tinymce && window.tinymce.get('tinymce-new-eng')) {
			const engContent = window.tinymce.get('tinymce-new-eng').getContent();
			currentDisplayStyle = setDisplayStyleValue(currentDisplayStyle, 'eng', engContent);
		}

		const { tat_expected, ...analyteWithoutTat } = newAnalyte;
		const finalAnalyte = { ...analyteWithoutTat, displayStyle: currentDisplayStyle };

		finalAnalyte.createdById = currentUser.identity_uid;
		finalAnalyte.modifiedById = currentUser.identity_uid;

		try {
			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/insert/bulk/parameter', {
				parameters: [finalAnalyte],
			});
			if (response.status === 200) {
				toast.success('New analyte added successfully');

				// Cleanup TinyMCE editors
				cleanupTinyMCE('tinymce-new-default');
				cleanupTinyMCE('tinymce-new-eng');

				setIsAddingNew(false);
				setNewAnalyte({
					parameterName: '',
					scientificField: 'Hóa lý',
					matrix: 'Đất',
					_deprecated_productType: '',
					tat_expected: '1 day',
					defaultUnit: '',
					accreditation: '',
					technicianAlias: 'K01',
					protocolCode: '',
					parameterId: '',
					protocolSource: 'IRDOP',
					displayStyle: [
						{ label: 'default', value: '' },
						{ label: 'eng', value: '' },
					],
					fee: '',
				});

				// Fetch fresh data from server to ensure consistency
				await fetchAnalytes(
					1, // Reset to first page for new items
					pagination.itemsPerPage,
					searchTerm,
					columnFilters,
					columnSort,
					sortBy,
				);
			} else {
				toast.error('Failed to add new analyte');
			}
		} catch (error) {
			console.error('Error adding new analyte:', error);
			toast.error('Failed to add new analyte');
		}
	};

	const handleCancelNewAnalyte = () => {
		// Cleanup TinyMCE editors
		cleanupTinyMCE('tinymce-new-default');
		cleanupTinyMCE('tinymce-new-eng');

		setIsAddingNew(false);
		setNewAnalyte({
			parameterName: '',
			scientificField: 'Hóa lý',
			matrix: 'Đất',
			_deprecated_productType: '',
			tat_expected: '1 day',
			defaultUnit: '',
			accreditation: '',
			technicianAlias: 'K01',
			protocolCode: '',
			parameterId: '',
			protocolSource: 'IRDOP',
			displayStyle: [
				{ label: 'default', value: '' },
				{ label: 'eng', value: '' },
			],
			fee: '',
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
		handleInputChange(id, 'protocolCode', value);
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
				return { ...analyte, protocolId: protocol.id, protocolCode: protocol.protocolCode };
			}
			return analyte;
		});

		setAnalytes(updatedAnalytes);
		setIsProtocolDropdownVisible(false);
	};

	const handleNewProtocolSelect = (protocol) => {
		setNewAnalyte({ ...newAnalyte, protocolCode: protocol.protocolCode, protocolId: protocol.id });
		setIsProtocolDropdownVisible(false);
	};

	const handleProtocolSourceChange = (id, value) => {
		const updatedAnalytes = analytes.map((analyte) => {
			if (analyte.id === id) {
				return { ...analyte, protocolSource: value };
			}
			return analyte;
		});
		setAnalytes(updatedAnalytes);
	};

	const handleNewProtocolSourceChange = (value) => {
		setNewAnalyte({ ...newAnalyte, protocolSource: value });
	};

	const handleProtocolPageChange = (pageNumber) => {
		setProtocolPage(pageNumber);
	};

	const handleTechnicianChange = (id, value) => {
		const updatedAnalytes = analytes.map((analyte) => {
			if (analyte.id === id) {
				return { ...analyte, technicianAlias: value };
			}
			return analyte;
		});
		setAnalytes(updatedAnalytes);
		setTechnicianDropdownVisible(null);
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
			const walkX = (x - startX) * -1;
			const walkY = (y - startY) * -1;
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

	// Row selection handlers
	const handleRowSelection = (rowId, event) => {
		event.stopPropagation();

		const newSelectedRows = new Set(selectedRows);
		if (newSelectedRows.has(rowId)) {
			newSelectedRows.delete(rowId);
		} else {
			newSelectedRows.add(rowId);
		}
		setSelectedRows(newSelectedRows);
	};

	const handleRowMouseDown = (rowId, event) => {
		if (event.ctrlKey || event.metaKey) return; // Skip if modifier keys are pressed

		setIsDragging(true);
		setDragStartRow(rowId);
	};

	const handleRowMouseEnter = (rowId) => {
		if (!isDragging || !dragStartRow) return;

		// Select range from dragStartRow to current row
		const currentAnalytes = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		const startIndex = currentAnalytes.findIndex((item) => item.id === dragStartRow);
		const endIndex = currentAnalytes.findIndex((item) => item.id === rowId);

		if (startIndex === -1 || endIndex === -1) return;

		const minIndex = Math.min(startIndex, endIndex);
		const maxIndex = Math.max(startIndex, endIndex);

		const newSelectedRows = new Set(selectedRows);
		for (let i = minIndex; i <= maxIndex; i++) {
			newSelectedRows.add(currentAnalytes[i].id);
		}
		setSelectedRows(newSelectedRows);
	};

	const handleMouseUp = () => {
		setIsDragging(false);
		setDragStartRow(null);
	};

	const handleSelectAll = () => {
		const currentAnalytes = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		const allIds = new Set(currentAnalytes.map((item) => item.id));
		setSelectedRows(allIds);
	};

	const handleDeselectAll = () => {
		setSelectedRows(new Set());
	};

	const handleBulkUpdateClick = () => {
		setShowBulkUpdate(true);
	};

	const handleBulkUpdateComplete = () => {
		setSelectedRows(new Set());
		// Refresh data
		fetchAnalytes(pagination.currentPage, pagination.itemsPerPage, searchTerm, columnFilters, columnSort, sortBy);
	};

	// Update pagination logic to use API pagination
	const totalPages = pagination.totalPages;
	const currentPage = pagination.currentPage;
	const totalProtocolPages = Math.ceil(protocols.length / protocolsPerPage);
	const paginatedAnalytes = analytes; // Data is already paginated from API
	const paginatedProtocols = protocols.slice((protocolPage - 1) * protocolsPerPage, protocolPage * protocolsPerPage);

	const renderPageNumbers = (totalPages, currentPage, handlePageChangeFunc) => {
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
					onClick={() => handlePageChangeFunc(i)}
				>
					{i}
				</button>,
			);
		}

		return (
			<div className="flex space-x-1">
				{currentPage > 3 && (
					<>
						<button className="px-2 py-1 border rounded" onClick={() => handlePageChangeFunc(1)}>
							First
						</button>
						<span>...</span>
					</>
				)}
				{pageNumbers}
				{currentPage + 2 < totalPages && (
					<>
						<span>...</span>
						<button className="px-2 py-1 border rounded" onClick={() => handlePageChangeFunc(totalPages)}>
							Last
						</button>
					</>
				)}
			</div>
		);
	};

	// Reusable column header component
	const renderColumnHeader = (
		column,
		title,
		className = 'py-2 text-start pl-2',
		headerType = 'default',
		selectOptions = [],
	) => {
		const handleHeaderClick = () => {
			if (headerType === 'select-filter') {
				// For field and source columns - show select filter
				toggleColumnFilter(column);
			} else if (headerType === 'input-filter') {
				// For matrix column - show input filter
				toggleColumnFilter(column);
			} else if (headerType === 'sort-only') {
				// For sortable columns - handle sort
				handleSort(column);
			} else if (headerType === 'no-action') {
				// For price and unit columns - no action
				return;
			}
		};

		// Check if filter button should be shown
		let showFilterButton = !['no-action', 'no-filter'].includes(headerType);

		// For select-filter and input-filter types, only show filter button if there's an active filter
		if (headerType === 'select-filter' || headerType === 'input-filter') {
			const hasActiveFilter = columnFilters[column] && columnFilters[column] !== '';
			showFilterButton = showFilterButton && hasActiveFilter;
		}

		const showSortIcon = headerType === 'sort-only' && columnSort === column;

		return (
			<th className={`${className} relative`}>
				<div className="flex items-center justify-between p-1">
					<span
						className={`font-medium ${headerType !== 'no-action' ? 'cursor-pointer hover:text-blue-600' : ''}`}
						onClick={handleHeaderClick}
					>
						{title}
						{showSortIcon && <span className="ml-1">{getSortIcon(column)}</span>}
					</span>
					<div className="flex items-center gap-1">
						{/* Filter Button */}
						{showFilterButton && (
							<button
								onClick={() => toggleColumnFilter(column)}
								className="p-1 hover:bg-gray-200 rounded transition-colors"
								title="Lọc"
							>
								{getFilterIcon(column)}
							</button>
						)}
					</div>
				</div>

				{/* Filter Input */}
				{showColumnFilters[column] && (
					<div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-10 p-2 column-filter-dropdown">
						{headerType === 'select-filter' ? (
							<select
								value={columnFilterInputs[column] || ''}
								onChange={(e) => {
									handleColumnFilterInput(column, e.target.value);
									handleColumnFilterSubmit(column, e.target.value);
								}}
								className="w-full px-2 py-1 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
								autoFocus
							>
								<option value="">Tất cả</option>
								{selectOptions.map((option, index) => (
									<option key={index} value={option}>
										{option}
									</option>
								))}
							</select>
						) : (
							<input
								type="text"
								placeholder={`Lọc ${title.toLowerCase()}...`}
								value={columnFilterInputs[column] || ''}
								onChange={(e) => handleColumnFilterInput(column, e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleColumnFilterSubmit(column, e.target.value);
									}
									if (e.key === 'Escape') {
										setShowColumnFilters((prev) => ({
											...prev,
											[column]: false,
										}));
									}
								}}
								onBlur={(e) => handleColumnFilterSubmit(column, e.target.value)}
								className="w-full px-2 py-1 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
								autoFocus
							/>
						)}
					</div>
				)}
			</th>
		);
	};

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			<div className="w-full h-full rounded-lg bg-white p-2">
				<div className="flex justify-between items-center mb-4">
					<div className="relative"></div>
					<h2 className="text-4xl text-primary font-semibold py-2">Danh sách chỉ tiêu</h2>
					<div className="flex flex-col items-end gap-2">
						<button
							className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium focus:outline-none focus:border-none"
							onClick={handleAddNewClick}
						>
							Thêm mới
						</button>
						{/* Search Box moved below Thêm mới */}
						<div className="flex gap-2 items-center">
							{/* Technician Filter Dropdown */}
							<div className="relative filter-dropdown">
								<button
									className={`px-3 py-2 border rounded-lg bg-white text-sm font-medium flex items-center gap-2 ${
										technicianFilter ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
									}`}
									onClick={toggleTechnicianFilterDropdown}
								>
									{technicianFilter ? getTechnicianDisplayName(technicianFilter) : 'Lọc theo KTV'}
									<span className="text-xs">▼</span>
								</button>
								{showTechnicianFilterDropdown && (
									<div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg z-50 min-w-64 max-h-60 overflow-y-auto">
										<div
											className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
											onClick={() => handleTechnicianFilter('')}
										>
											Tất cả
										</div>
										{getTechnicianOptions().map((tech, index) => (
											<div
												key={index}
												className={`p-2 hover:bg-gray-100 cursor-pointer text-sm text-left ${
													technicianFilter === tech.alias ? 'bg-blue-50' : ''
												}`}
												onClick={() => handleTechnicianFilter(tech.alias)}
											>
												{getTechnicianDropdownDisplayName(tech)}
											</div>
										))}
									</div>
								)}
							</div>

							{/* Search Input */}
							<div className="relative">
								<input
									type="text"
									placeholder="Tìm kiếm..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											handleSearch(e.target.value, 1);
										}
									}}
									onBlur={(e) => {
										handleSearch(e.target.value, 1);
									}}
									className="w-64 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								{loading && (
									<div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600">
										<span className="text-xs">Đang tìm...</span>
									</div>
								)}
							</div>
						</div>

						{/* Selection and Bulk Update Controls */}
						{selectedRows.size > 0 && (
							<div className="flex gap-2 items-center">
								<span className="text-sm text-gray-600">{selectedRows.size} mục được chọn</span>
								<button
									className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors flex items-center gap-1"
									onClick={() => setShowBulkUpdate(true)}
									disabled={bulkUpdating}
								>
									<FaEdit size={12} />
									Cập nhật hàng loạt
								</button>
								<button
									className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
									onClick={handleSelectAll}
								>
									<FaCheck size={12} />
									Chọn tất cả
								</button>
								<button
									className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors flex items-center gap-1"
									onClick={handleDeselectAll}
								>
									<FaUndo size={12} />
									Hủy chọn
								</button>
							</div>
						)}
					</div>
				</div>

				<div className="rounded-lg border p-0.5 pb-0 relative z-0 overflow-x-auto" onMouseDown={handleTableMouseDown}>
					<table className="min-w-screen-xl bg-white text-sm">
						<thead className="border-b-2">
							<tr>
								{renderColumnHeader('parameterId', 'UID', 'py-2 text-start pl-2 min-w-16 w-16', 'no-filter')}
								{renderColumnHeader(
									'parameterName',
									'Tên chỉ tiêu',
									'py-2 text-start pl-2 min-w-48 w-1/5',
									'sort-only',
								)}
								{renderColumnHeader(
									'scientificField',
									'Lĩnh vực',
									'py-2 text-start pl-2 min-w-24 w-24',
									'select-filter',
									getUniqueFields(),
								)}
								{renderColumnHeader('matrix', 'Nền mẫu', 'py-2 text-start pl-2 min-w-44 w-1/5', 'input-filter')}
								{renderColumnHeader(
									'protocolSource',
									'Nguồn',
									'py-2 text-start pl-2 min-w-24 w-24',
									'select-filter',
									getUniqueSourcesFromCurrent(),
								)}
								{renderColumnHeader('protocolCode', 'Code', 'py-2 text-start pl-2 min-w-44 w-44', 'sort-only')}
								{renderColumnHeader('defaultUnit', 'Đơn vị', 'py-2 text-start pl-2 min-w-20 w-20', 'no-action')}
								{renderColumnHeader(
									'displayStyle',
									'Định dạng hiển thị',
									'py-2 text-start pl-2 min-w-56 w-56',
									'no-action',
								)}
								{renderColumnHeader('fee', 'Giá thành', 'py-2 text-start pl-2 min-w-32 w-32', 'no-action')}
								{renderColumnHeader('accreditation', 'Chứng nhận', 'py-2 text-start pl-2 min-w-28 w-28', 'no-action')}
								{renderColumnHeader('technicianAlias', 'KTV', 'py-2 text-start pl-2 min-w-28 w-28', 'sort-only')}
								{renderColumnHeader('actions', 'Thao tác', 'py-2 text-start pl-2 min-w-24 w-24', 'no-action')}
							</tr>
						</thead>
						<tbody>
							{isAddingNew && (
								<tr className="border-t bg-blue-50">
									<td className="p-1 text-start">
										<p className="font-medium text-primary">{newAnalyte.parameterId}</p>
									</td>
									<td className="p-1 text-start relative">
										<textarea
											id="param-name-new"
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.parameterName}
											onChange={(e) => handleParameterNameInput('new', e.target.value)}
										/>
										{showParameterNameDropdown &&
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: document.getElementById(`param-name-new`)?.offsetWidth + 'px',
														top:
															document.getElementById(`param-name-new`)?.getBoundingClientRect().bottom +
															window.scrollY,
														left:
															document.getElementById(`param-name-new`)?.getBoundingClientRect().left + window.scrollX,
													}}
												>
													{getPaginatedParameterNames(parameterNameInput).map((name, index) => (
														<div
															key={index}
															className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={() => handleParameterNameSelect(name)}
														>
															<p>{name}</p>
														</div>
													))}
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
												</div>,
												document.body,
											)}
									</td>
									<td className="p-1 text-start">
										<select
											className="w-full border p-2 rounded bg-white"
											value={newAnalyte.scientificField || 'Hóa lý'}
											onChange={(e) => handleNewAnalyteChange('scientificField', e.target.value)}
										>
											<option value="Hóa lý">Hóa lý</option>
											<option value="Vi sinh">Vi sinh</option>
										</select>
									</td>
									<td className="p-1 text-start relative">
										<textarea
											id="matrix-new"
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.matrix}
											onChange={(e) => handleMatrixInput('new', e.target.value)}
										/>
										{showMatrixDropdown &&
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: document.getElementById(`matrix-new`)?.offsetWidth + 'px',
														top: document.getElementById(`matrix-new`)?.getBoundingClientRect().bottom + window.scrollY,
														left: document.getElementById(`matrix-new`)?.getBoundingClientRect().left + window.scrollX,
													}}
												>
													{getPaginatedMatrices(matrixInput).map((matrix, index) => (
														<div
															key={index}
															className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={() => handleMatrixSelect(matrix)}
														>
															<p>{matrix}</p>
														</div>
													))}
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
												</div>,
												document.body,
											)}
									</td>
									<td className="p-1 text-start">
										<select
											className="w-full border p-2 px-0.5 rounded bg-white"
											value={newAnalyte.protocolSource}
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
											id="protocol-code-new"
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.protocolCode}
											onChange={(e) => handleProtocolCodeInputChange('new', e.target.value)}
										/>
										{showProtocolCodeDropdown &&
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: document.getElementById(`protocol-code-new`)?.offsetWidth + 'px',
														top:
															document.getElementById(`protocol-code-new`)?.getBoundingClientRect().bottom +
															window.scrollY,
														left:
															document.getElementById(`protocol-code-new`)?.getBoundingClientRect().left +
															window.scrollX,
													}}
												>
													{getPaginatedProtocolCodes(protocolCodeInput).map((code, index) => (
														<div
															key={index}
															className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={() => handleProtocolCodeSelect(code)}
														>
															<p>{code}</p>
														</div>
													))}
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
												</div>,
												document.body,
											)}
										{isProtocolDropdownVisible &&
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: '320px',
														top:
															document.getElementById(`protocol-code-new`)?.getBoundingClientRect().bottom +
															window.scrollY,
														left:
															document.getElementById(`protocol-code-new`)?.getBoundingClientRect().left +
															window.scrollX,
													}}
												>
													{paginatedProtocols.map((protocol, index) => (
														<div
															key={index}
															className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={() => handleNewProtocolSelect(protocol)}
														>
															<p>{protocol.protocol_name}</p>
															<p className="text-sm text-gray-500">{protocol.protocolCode}</p>
														</div>
													))}
													{protocols.filter((protocol) => protocol.protocolCode?.includes(protocolSearch)).length >
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
												</div>,
												document.body,
											)}
									</td>
									<td className="p-1 text-center relative">
										<textarea
											id="unit-new"
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.defaultUnit || ''}
											onChange={(e) => handleUnitInput('new', e.target.value)}
										/>
										{showUnitDropdown &&
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: document.getElementById(`unit-new`)?.offsetWidth + 'px',
														top: document.getElementById(`unit-new`)?.getBoundingClientRect().bottom + window.scrollY,
														left: document.getElementById(`unit-new`)?.getBoundingClientRect().left + window.scrollX,
													}}
												>
													{getPaginatedUnits(unitInput).map((unit, index) => (
														<div
															key={index}
															className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={() => handleUnitSelect(unit)}
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
												</div>,
												document.body,
											)}
									</td>
									<td className="p-1 text-start">
										<div className="w-full bg-white rounded border" style={{ borderRadius: '0.375rem' }}>
											<div className="flex flex-col gap-1 p-1">
												<div className="flex items-center gap-2">
													<div className="text-xs font-medium text-gray-600 min-w-[50px]">Default:</div>
													<div className="h-6 bg-white rounded border flex-1">
														<textarea
															id="tinymce-new-default"
															className="w-full h-full border-0 resize-none text-xs"
															style={{ borderRadius: '0' }}
															value={getDisplayStyleValue(newAnalyte.displayStyle, 'default')}
															onChange={(e) => {
																const updatedDisplayStyle = setDisplayStyleValue(
																	newAnalyte.displayStyle,
																	'default',
																	e.target.value,
																);
																handleNewAnalyteChange('displayStyle', updatedDisplayStyle);
															}}
														/>
													</div>
												</div>
												<div className="flex items-center gap-2">
													<div className="text-xs font-medium text-gray-600 min-w-[50px]">English:</div>
													<div className="h-6 bg-white rounded border flex-1">
														<textarea
															id="tinymce-new-eng"
															className="w-full h-full border-0 resize-none text-xs"
															style={{ borderRadius: '0' }}
															value={getDisplayStyleValue(newAnalyte.displayStyle, 'eng')}
															onChange={(e) => {
																const updatedDisplayStyle = setDisplayStyleValue(
																	newAnalyte.displayStyle,
																	'eng',
																	e.target.value,
																);
																handleNewAnalyteChange('displayStyle', updatedDisplayStyle);
															}}
														/>
													</div>
												</div>
											</div>
										</div>
									</td>
									<td className="p-1 text-start">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.fee || ''}
											onChange={(e) => handleNewAnalyteChange('fee', e.target.value)}
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
									<td className="p-1 text-start relative technician-dropdown">
										<div
											id="technician-new"
											className="w-full border px-2 py-1 rounded bg-white cursor-pointer min-h-[2.5rem] flex items-center"
											onClick={() => handleTechnicianDropdownToggle('new')}
										>
											{getTechnicianDisplayName(newAnalyte.technicianAlias) || 'Chọn kỹ thuật viên'}
										</div>
										{technicianDropdowns['new'] &&
											createPortal(
												<div
													className="technician-portal absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: Math.max(document.getElementById(`technician-new`)?.offsetWidth, 280) + 'px',
														top:
															document.getElementById(`technician-new`)?.getBoundingClientRect().bottom +
															window.scrollY,
														left:
															document.getElementById(`technician-new`)?.getBoundingClientRect().left + window.scrollX,
													}}
												>
													{getTechnicianOptions().map((tech, index) => (
														<div
															key={index}
															className="p-2 flex cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={() => {
																handleNewAnalyteChange('technicianAlias', tech.alias);
																setTechnicianDropdowns((prev) => ({ ...prev, new: false }));
															}}
														>
															<div className="text-sm w-full text-left">{getTechnicianDropdownDisplayName(tech)}</div>
														</div>
													))}
												</div>,
												document.body,
											)}
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
										selectedRows.has(analyte.id) ? 'bg-blue-100 border-blue-300' : ''
									} ${expandedRow === analyte.id ? '' : 'hover:bg-gray-100'} ${
										selectedRows.has(analyte.id) ? 'hover:bg-blue-200' : ''
									} cursor-pointer`}
									onClick={(e) => {
										if (editingRow !== analyte.id) {
											handleRowSelection(analyte.id, e);
										} else {
											handleRowClick(analyte.id);
										}
									}}
									onMouseDown={(e) => {
										if (editingRow !== analyte.id) {
											handleRowMouseDown(analyte.id, e);
										}
									}}
									onMouseEnter={() => {
										if (editingRow !== analyte.id) {
											handleRowMouseEnter(analyte.id);
										}
									}}
								>
									<td className="p-1 text-start">
										<span
											className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
											style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
										>
											{analyte.parameterId}
										</span>
									</td>
									<td className="p-1 text-start relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													id={`param-name-${analyte.id}`}
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.parameterName}
													onChange={(e) => handleParameterNameInput(analyte.id, e.target.value)}
												/>
												{showParameterNameDropdown &&
													editingParameterName === analyte.id &&
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
															style={{
																width: document.getElementById(`param-name-${analyte.id}`)?.offsetWidth + 'px',
																top:
																	document.getElementById(`param-name-${analyte.id}`)?.getBoundingClientRect().bottom +
																	window.scrollY,
																left:
																	document.getElementById(`param-name-${analyte.id}`)?.getBoundingClientRect().left +
																	window.scrollX,
															}}
														>
															{getPaginatedParameterNames(parameterNameInput).map((name, index) => (
																<div
																	key={index}
																	className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																	onClick={() => handleParameterNameSelect(name)}
																>
																	<p>{name}</p>
																</div>
															))}
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
														</div>,
														document.body,
													)}
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.parameterName}
											</span>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<select
												className="w-full border p-2 rounded bg-white"
												value={analyte.scientificField || 'Hóa lý'}
												onChange={(e) => handleInputChange(analyte.id, 'scientificField', e.target.value)}
											>
												<option value="Hóa lý">Hóa lý</option>
												<option value="Vi sinh">Vi sinh</option>
											</select>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.scientificField || 'Hóa lý'}
											</span>
										)}
									</td>
									<td className="p-1 text-start relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													id={`matrix-${analyte.id}`}
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.matrix}
													onChange={(e) => handleMatrixInput(analyte.id, e.target.value)}
												/>
												{showMatrixDropdown &&
													editingMatrix === analyte.id &&
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
															style={{
																width: document.getElementById(`matrix-${analyte.id}`)?.offsetWidth + 'px',
																top:
																	document.getElementById(`matrix-${analyte.id}`)?.getBoundingClientRect().bottom +
																	window.scrollY,
																left:
																	document.getElementById(`matrix-${analyte.id}`)?.getBoundingClientRect().left +
																	window.scrollX,
															}}
														>
															{getPaginatedMatrices(matrixInput).map((matrix, index) => (
																<div
																	key={index}
																	className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																	onClick={() => handleMatrixSelect(matrix)}
																>
																	<p>{matrix}</p>
																</div>
															))}
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
																		disabled={
																			matrixPage >= Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)
																		}
																	>
																		Next
																	</button>
																</div>
															)}
														</div>,
														document.body,
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
												value={analyte.protocolSource || ''}
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
												{analyte.protocolSource || ''}
											</span>
										)}
									</td>
									<td className="p-1 text-start relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													id={`protocol-code-${analyte.id}`}
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.protocolCode}
													onChange={(e) => handleProtocolCodeInputChange(analyte.id, e.target.value)}
												/>
												{showProtocolCodeDropdown &&
													editingProtocolCode === analyte.id &&
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
															style={{
																width: document.getElementById(`protocol-code-${analyte.id}`)?.offsetWidth + 'px',
																top:
																	document.getElementById(`protocol-code-${analyte.id}`)?.getBoundingClientRect()
																		.bottom + window.scrollY,
																left:
																	document.getElementById(`protocol-code-${analyte.id}`)?.getBoundingClientRect().left +
																	window.scrollX,
															}}
														>
															{getPaginatedProtocolCodes(protocolCodeInput).map((code, index) => (
																<div
																	key={index}
																	className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																	onClick={() => handleProtocolCodeSelect(code)}
																>
																	<p>{code}</p>
																</div>
															))}
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
														</div>,
														document.body,
													)}
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.protocolCode}
											</span>
										)}
										{isProtocolDropdownVisible &&
											editingRow === analyte.id &&
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: '320px',
														top:
															document.getElementById(`protocol-code-${analyte.id}`)?.getBoundingClientRect().bottom +
															window.scrollY,
														left:
															document.getElementById(`protocol-code-${analyte.id}`)?.getBoundingClientRect().left +
															window.scrollX,
													}}
												>
													{paginatedProtocols.map((protocol, index) => (
														<div
															key={index}
															className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={() => handleProtocolSelect(analyte.id, protocol)}
														>
															<p>{protocol.protocol_name}</p>
															<p className="text-sm text-gray-500">{protocol.protocolCode}</p>
														</div>
													))}
													{protocols.filter((protocol) => protocol.protocolCode?.includes(protocolSearch)).length >
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
												</div>,
												document.body,
											)}
									</td>
									<td className="p-1 text-center relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													id={`unit-${analyte.id}`}
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.defaultUnit || ''}
													onChange={(e) => handleUnitInput(analyte.id, e.target.value)}
												/>
												{showUnitDropdown &&
													editingUnit === analyte.id &&
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
															style={{
																width: document.getElementById(`unit-${analyte.id}`)?.offsetWidth + 'px',
																top:
																	document.getElementById(`unit-${analyte.id}`)?.getBoundingClientRect().bottom +
																	window.scrollY,
																left:
																	document.getElementById(`unit-${analyte.id}`)?.getBoundingClientRect().left +
																	window.scrollX,
															}}
														>
															{getPaginatedUnits(unitInput).map((unit, index) => (
																<div
																	key={index}
																	className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																	onClick={() => handleUnitSelect(unit)}
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
														</div>,
														document.body,
													)}
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.defaultUnit}
											</span>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<div className="w-full bg-white rounded border" style={{ borderRadius: '0.375rem' }}>
												<div className="flex flex-col gap-1 p-1">
													<div className="flex items-center gap-2">
														<div className="text-xs font-medium text-gray-600 min-w-[50px]">Default:</div>
														<div className="h-6 bg-white rounded border flex-1">
															<textarea
																id={`tinymce-${analyte.id}-default`}
																className="w-full h-full text-xs"
																style={{ borderRadius: '0' }}
																value={getDisplayStyleValue(initializeDisplayStyle(analyte.displayStyle), 'default')}
																onChange={(e) => {
																	const currentDisplayStyle = initializeDisplayStyle(analyte.displayStyle);
																	const updatedDisplayStyle = setDisplayStyleValue(
																		currentDisplayStyle,
																		'default',
																		e.target.value,
																	);
																	handleInputChange(analyte.id, 'displayStyle', updatedDisplayStyle);
																}}
															/>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<div className="text-xs font-medium text-gray-600 min-w-[50px]">English:</div>
														<div className="h-6 bg-white rounded border flex-1">
															<textarea
																id={`tinymce-${analyte.id}-eng`}
																className="w-full h-full text-xs"
																style={{ borderRadius: '0' }}
																value={getDisplayStyleValue(initializeDisplayStyle(analyte.displayStyle), 'eng')}
																onChange={(e) => {
																	const currentDisplayStyle = initializeDisplayStyle(analyte.displayStyle);
																	const updatedDisplayStyle = setDisplayStyleValue(
																		currentDisplayStyle,
																		'eng',
																		e.target.value,
																	);
																	handleInputChange(analyte.id, 'displayStyle', updatedDisplayStyle);
																}}
															/>
														</div>
													</div>
												</div>
											</div>
										) : (
											<div className="flex flex-col gap-1">
												<div className="flex items-center gap-2">
													<div className="text-xs font-medium text-gray-600 min-w-[50px]">Default:</div>
													<div
														className="block overflow-hidden text-ellipsis whitespace-pre-wrap max-h-6 text-xs flex-1"
														style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}
														dangerouslySetInnerHTML={{
															__html:
																getDisplayStyleValue(initializeDisplayStyle(analyte.displayStyle), 'default') || '',
														}}
													/>
												</div>
												<div className="flex items-center gap-2">
													<div className="text-xs font-medium text-gray-600 min-w-[50px]">English:</div>
													<div
														className="block overflow-hidden text-ellipsis whitespace-pre-wrap max-h-6 text-xs flex-1"
														style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}
														dangerouslySetInnerHTML={{
															__html: getDisplayStyleValue(initializeDisplayStyle(analyte.displayStyle), 'eng') || '',
														}}
													/>
												</div>
											</div>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<textarea
												className="w-full h-10 border px-2 py-1 rounded bg-white resize-none"
												rows={2}
												value={analyte.fee || ''}
												onChange={(e) => handleInputChange(analyte.id, 'fee', e.target.value)}
											/>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.fee || ''}
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
									<td className="p-1 text-start relative technician-dropdown">
										<div
											id={`technician-${analyte.id}`}
											className="w-full border px-2 py-1 rounded bg-white cursor-pointer min-h-[2.5rem] flex items-center"
											onClick={(e) => {
												e.stopPropagation();
												handleTechnicianDropdownToggle(analyte.id);
											}}
										>
											{getTechnicianDisplayName(analyte.technicianAlias) || 'Chọn kỹ thuật viên'}
										</div>
										{technicianDropdowns[analyte.id] &&
											createPortal(
												<div
													className="technician-portal absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width:
															Math.max(document.getElementById(`technician-${analyte.id}`)?.offsetWidth, 280) + 'px',
														top:
															document.getElementById(`technician-${analyte.id}`)?.getBoundingClientRect().bottom +
															window.scrollY,
														left:
															document.getElementById(`technician-${analyte.id}`)?.getBoundingClientRect().left +
															window.scrollX,
													}}
												>
													{getTechnicianOptions().map((tech, techIndex) => (
														<div
															key={techIndex}
															className="p-2 flex cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={(e) => {
																e.stopPropagation();
																handleTechnicianSelect(analyte.id, tech);
															}}
														>
															<div className="text-sm w-full text-left">{getTechnicianDropdownDisplayName(tech)}</div>
														</div>
													))}
												</div>,
												document.body,
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

				{/* Pagination Controls at Bottom */}
				<div className="flex justify-between items-center mt-4 p-4 bg-gray-50 rounded-lg">
					{/* Items per page selector */}
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-600">Hiển thị:</span>
						<select
							value={pagination.itemsPerPage}
							onChange={(e) => handleItemsPerPageChange(e.target.value)}
							className="px-3 py-1 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value={10}>10</option>
							<option value={25}>25</option>
							<option value={50}>50</option>
							<option value={100}>100</option>
							<option value={200}>200</option>
						</select>
						<span className="text-sm text-gray-600">/ trang</span>
					</div>

					{/* Page info and navigation */}
					<div className="flex items-center gap-4">
						<div className="text-sm text-gray-600">
							Hiển thị {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} -{' '}
							{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} của{' '}
							{pagination.totalItems} kết quả
						</div>

						{/* Page navigation */}
						<div className="flex items-center gap-2">
							{renderPageNumbers(totalPages, currentPage, handleApiPageChange)}
						</div>
					</div>
				</div>
			</div>

			{/* Bulk Update Modal */}
			<AnalyteBulkUpdate
				isOpen={showBulkUpdate}
				onClose={() => setShowBulkUpdate(false)}
				selectedRows={selectedRows}
				selectedData={analytes.filter((item) => selectedRows.has(item.id))}
				onUpdateComplete={handleBulkUpdateComplete}
				updating={bulkUpdating}
				setUpdating={setBulkUpdating}
			/>
		</div>
	);
};

export default AnalyteInfor;
