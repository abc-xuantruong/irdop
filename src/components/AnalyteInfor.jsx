import * as React from 'react';
const { useContext, useState, useEffect, useRef } = React;
import { createPortal } from 'react-dom';
import FilterBar from './FilterBar';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
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
		field: 'Hóa lý',
		matrix: '',
		product_type: '',
		tat_expected: '1 day',
		default_unit: '',
		accreditation: '',
		technician_uid: '',
		protocol_code: '',
		parameter_uid: '',
		protocol_source: 'IRDOP',
		display_style: '',
		price: 0,
	});
	const [protocolSearch, setProtocolSearch] = useState('');

	const [isProtocolDropdownVisible, setIsProtocolDropdownVisible] = useState(false);
	const [originalAnalytes, setOriginalAnalytes] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
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
	const [showFieldDropdown, setShowFieldDropdown] = useState(false);
	const [showMatrixFilterDropdown, setShowMatrixFilterDropdown] = useState(false);
	const [showSourceDropdown, setShowSourceDropdown] = useState(false);
	const [filteredAnalytes, setFilteredAnalytes] = useState([]);

	// Add technician states
	const [techniciansList, setTechniciansList] = useState([]);
	const [technicianDropdowns, setTechnicianDropdowns] = useState({});

	// TinyMCE refs for managing editors
	const editorRefs = useRef({});
	const newAnalyteEditorRef = useRef(null);

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
			}
			// Close technician dropdowns when clicking outside
			if (!event.target.closest('.technician-dropdown') && !event.target.closest('.technician-portal')) {
				setTechnicianDropdowns({});
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
			fetchAnalytes();
			fetchMatricesList();
			fetchProtocolSourcesList();
			fetchUnitsList();
			fetchTechnicians();
		}
	}, [technicians]);

	// Add effect to apply filters
	useEffect(() => {
		let filtered = analytes;

		if (fieldFilter) {
			filtered = filtered.filter((analyte) => analyte.field === fieldFilter);
		}

		if (matrixFilter) {
			filtered = filtered.filter((analyte) => analyte.matrix === matrixFilter);
		}

		if (sourceFilter) {
			filtered = filtered.filter((analyte) => analyte.protocol_source === sourceFilter);
		}

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

		window.tinymce.init({
			selector: `#${selector}`,
			plugins: '', // Không sử dụng plugins
			toolbar: false, // Ẩn hoàn toàn toolbar
			menubar: false,
			height: '100%',
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
					font-size: 14px;
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
						allElements.forEach(el => {
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
		}).then((editors) => {
			console.log('TinyMCE initialized successfully for:', selector, editors);
		}).catch((error) => {
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
			const selector = `tinymce-${editingRow}`;
			const analyte = analytes.find((a) => a.id === editingRow);

			const initEditor = () => {
				// Kiểm tra xem element có tồn tại không
				const element = document.getElementById(selector);
				if (element && window.tinymce) {
					initTinyMCE(selector, analyte?.display_style || '', (content) => {
						handleInputChange(editingRow, 'display_style', content);
					});
				} else {
					// Retry sau một thời gian ngắn nếu element chưa có
					setTimeout(initEditor, 100);
				}
			};

			// Delay để đảm bảo DOM đã render
			setTimeout(initEditor, 200);

			// Cleanup khi editingRow thay đổi
			return () => {
				if (window.tinymce && window.tinymce.get(selector)) {
					window.tinymce.get(selector).remove();
				}
			};
		}
	}, [editingRow]);

	// Initialize TinyMCE for new analyte
	useEffect(() => {
		if (isAddingNew) {
			const initEditor = () => {
				const element = document.getElementById('tinymce-new');
				if (element && window.tinymce) {
					initTinyMCE('tinymce-new', newAnalyte.display_style || '', (content) => {
						handleNewAnalyteChange('display_style', content);
					});
				} else {
					setTimeout(initEditor, 100);
				}
			};

			setTimeout(initEditor, 200);

			return () => {
				if (window.tinymce && window.tinymce.get('tinymce-new')) {
					window.tinymce.get('tinymce-new').remove();
				}
			};
		}
	}, [isAddingNew]);

	// Cleanup editors when component unmounts or editing ends
	useEffect(() => {
		return () => {
			// Cleanup all editors on unmount
			Object.keys(editorRefs.current).forEach((selector) => {
				cleanupTinyMCE(selector);
			});
			if (newAnalyteEditorRef.current) {
				cleanupTinyMCE('tinymce-new');
			}
		};
	}, []);

	const fetchAnalytes = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/ha8i0uw2/db/get/parameter');
			const data = response.data.map((analyte) => ({
				...analyte,
				tat_expected: analyte?.tat_expected?.days
					? `${analyte.tat_expected.days} ${analyte.tat_expected.days > 1 ? 'days' : 'day'}`
					: '',
			}));
			setAnalytes(data);
			setOriginalAnalytes(data);

			// Extract unique lists
			extractUniqueLists(data);
		} catch (error) {
			console.error('Error fetching analytes:', error);
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
		const parameterNames = [...new Set(data.map((item) => item.parameter_name || '').filter(Boolean))];
		const protocolCodes = [...new Set(data.map((item) => item.protocol_code || '').filter(Boolean))];

		setUniqueParameterNames(parameterNames);
		setUniqueProtocolCodes(protocolCodes);
	};

	// Add filter helper functions
	const getUniqueFields = () => {
		const currentList = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		return [...new Set(currentList.map((analyte) => analyte.field).filter(Boolean))];
	};

	const getUniqueMatricesFromCurrent = () => {
		const currentList = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		return [...new Set(currentList.map((analyte) => analyte.matrix).filter(Boolean))];
	};

	const getUniqueSourcesFromCurrent = () => {
		const currentList = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
		return [...new Set(currentList.map((analyte) => analyte.protocol_source).filter(Boolean))];
	};

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

	// Add toggle handlers for header clicks
	const toggleFieldDropdown = () => {
		if (fieldFilter) {
			setFieldFilter('');
			return;
		}
		setShowFieldDropdown(!showFieldDropdown);
	};

	const toggleMatrixDropdown = () => {
		if (matrixFilter) {
			setMatrixFilter('');
			return;
		}
		setShowMatrixFilterDropdown(!showMatrixFilterDropdown);
	};

	const toggleSourceDropdown = () => {
		if (sourceFilter) {
			setSourceFilter('');
			return;
		}
		setShowSourceDropdown(!showSourceDropdown);
	};

	// Modified filter functions with minimum character requirement
	const filterParameterNames = (input) => {
		if (!input || input.length < 2) return [];
		return uniqueParameterNames.filter((name) => name && name.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterMatrices = (input) => {
		if (!input || input.length < 2) return [];
		return uniqueMatrices.filter((matrix) => matrix && matrix.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterProtocolCodes = (input) => {
		if (!input || input.length < 2) return [];
		return uniqueProtocolCodes.filter((code) => code && code.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterUnits = (input) => {
		if (!input || input.trim() === '') return [];
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
			handleInputChange(editingRow, 'parameter_name', name);
		} else if (isAddingNew) {
			handleNewAnalyteChange('parameter_name', name);
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
			handleInputChange(editingRow, 'protocol_code', code);
		} else if (isAddingNew) {
			handleNewAnalyteChange('protocol_code', code);
		}
		setShowProtocolCodeDropdown(false);
	};

	const handleUnitSelect = (unit) => {
		if (editingRow !== null) {
			handleInputChange(editingRow, 'default_unit', unit);
		} else if (isAddingNew) {
			handleNewAnalyteChange('default_unit', unit);
		}
		setShowUnitDropdown(false);
	};

	// Modified input change handlers
	const handleParameterNameInput = (id, value) => {
		setParameterNameInput(value);
		setParameterNamePage(1);
		if (editingRow !== null) {
			handleInputChange(id, 'parameter_name', value);
			setEditingParameterName(id);
		} else {
			handleNewAnalyteChange('parameter_name', value);
		}
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
		setShowMatrixDropdown(true);
	};

	const handleProtocolCodeInputChange = (id, value) => {
		setProtocolCodeInput(value);
		setProtocolCodePage(1);
		if (editingRow !== null) {
			handleInputChange(id, 'protocol_code', value);
			setEditingProtocolCode(id);
		} else {
			handleNewAnalyteChange('protocol_code', value);
		}
		setShowProtocolCodeDropdown(true);
	};

	const handleUnitInput = (id, value) => {
		setUnitInput(value);
		setUnitPage(1);
		if (editingRow !== null) {
			handleInputChange(id, 'default_unit', value);
			setEditingUnit(id);
		} else {
			handleNewAnalyteChange('default_unit', value);
		}
		const filteredUnits = filterUnits(value);
		setShowUnitDropdown(filteredUnits.length > 0);
	};

	// Add technician helper functions
	const getTechnicianByAlias = (alias) => {
		return techniciansList.find((tech) => tech.alias === alias);
	};

	const getTechnicianDisplayName = (alias) => {
		const tech = getTechnicianByAlias(alias);
		return tech ? `${tech.alias}: ${tech.identity_name}` : '';
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
					return { ...analyte, technician_uid: technician.alias }; // Store alias instead of identity_uid
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
				modified_by_uid: currentUser.identity_uid,
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
				(protocol) => protocol && protocol.protocol_code && protocol.protocol_code.includes(searchTerm || ''),
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
		// Get content from TinyMCE editor before saving
		const editorId = `tinymce-${id}`;
		if (window.tinymce && window.tinymce.get(editorId)) {
			const editorContent = window.tinymce.get(editorId).getContent();
			handleInputChange(id, 'display_style', editorContent);
		}

		const updatedAnalyte = analytes.find((analyte) => analyte.id === id);
		const { tat_expected, ...analyteWithoutTat } = updatedAnalyte;
		const finalAnalyte = analyteWithoutTat;

		try {
			finalAnalyte.modified_by_uid = currentUser.identity_uid;

			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/update/parameter', {
				parameter: finalAnalyte,
			});

			// Cleanup TinyMCE editor
			cleanupTinyMCE(editorId);

			setEditingRow(null);
			if (response.status === 200) {
				toast.success('Analyte updated successfully');
				setOriginalAnalytes(analytes);
				extractUniqueLists(analytes);
				setCurrentPage(1);
			} else {
				toast.error('Analyte update failed');
			}
		} catch (error) {
			console.error('Error updating analyte:', error);
			toast.error('Analyte update failed');
		}
	};

	const handleCancelClick = () => {
		// Cleanup TinyMCE editor
		if (editingRow !== null) {
			cleanupTinyMCE(`tinymce-${editingRow}`);
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
		const confirmed = window.confirm(`Bạn chắc chắn muốn xóa chỉ tiêu: ${analyte.parameter_name} (ID: ${analyte.id})?`);
		if (confirmed) {
			try {
				const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/delete/parameter', {
					id: analyte.id,
					modified_by_uid: currentUser.identity_uid,
				});
				if (response.status === 200) {
					toast.success('Analyte deleted successfully');
					const updatedAnalytes = analytes.filter((analyte) => analyte.id !== id);
					setAnalytes(updatedAnalytes);
					setOriginalAnalytes(updatedAnalytes);
					extractUniqueLists(updatedAnalytes);
					setCurrentPage(1);
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
		if (field === 'protocol_code' && value.length >= 5) {
			fetchProtocols(value);
			setIsProtocolDropdownVisible(true);
		} else {
			setIsProtocolDropdownVisible(false);
		}
	};

	const handleSaveNewAnalyte = async () => {
		// Get content from TinyMCE editor before saving
		if (window.tinymce && window.tinymce.get('tinymce-new')) {
			const editorContent = window.tinymce.get('tinymce-new').getContent();
			setNewAnalyte((prev) => ({ ...prev, display_style: editorContent }));
		}

		const { tat_expected, ...analyteWithoutTat } = newAnalyte;
		const finalAnalyte = analyteWithoutTat;

		finalAnalyte.created_by_uid = currentUser.identity_uid;
		finalAnalyte.modified_by_uid = currentUser.identity_uid;

		try {
			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/insert/bulk/parameter', {
				parameters: [finalAnalyte],
			});
			if (response.status === 200) {
				toast.success('New analyte added successfully');
				const newAnalyteWithId = { ...finalAnalyte, id: response.data?.insertedIds?.[0] || Date.now() };
				const updatedAnalytes = [...analytes, newAnalyteWithId];
				setAnalytes(updatedAnalytes);
				setOriginalAnalytes(updatedAnalytes);

				// Cleanup TinyMCE editor
				cleanupTinyMCE('tinymce-new');

				setIsAddingNew(false);
				setNewAnalyte({
					parameter_name: '',
					field: 'Hóa lý',
					matrix: 'Đất',
					product_type: '',
					tat_expected: '1 day',
					default_unit: '',
					accreditation: '',
					technician_uid: techniciansList[0]?.alias || '',
					protocol_code: '',
					parameter_uid: '',
					protocol_source: 'IRDOP',
					display_style: '',
					price: '',
				});
				extractUniqueLists(updatedAnalytes);
				setCurrentPage(1);
			} else {
				toast.error('Failed to add new analyte');
			}
		} catch (error) {
			console.error('Error adding new analyte:', error);
			toast.error('Failed to add new analyte');
		}
	};

	const handleCancelNewAnalyte = () => {
		// Cleanup TinyMCE editor
		cleanupTinyMCE('tinymce-new');

		setIsAddingNew(false);
		setNewAnalyte({
			parameter_name: '',
			field: 'Hóa lý',
			matrix: 'Đất',
			product_type: '',
			tat_expected: '1 day',
			default_unit: '',
			accreditation: '',
			technician_uid: techniciansList[0]?.alias || '',
			protocol_code: '',
			parameter_uid: '',
			protocol_source: 'IRDOP',
			display_style: '',
			price: '',
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

	const totalPages = Math.ceil((filteredAnalytes.length > 0 ? filteredAnalytes : analytes).length / analytesPerPage);
	const totalProtocolPages = Math.ceil(protocols.length / protocolsPerPage);
	const currentAnalytes = filteredAnalytes.length > 0 ? filteredAnalytes : analytes;
	const paginatedAnalytes = currentAnalytes.slice((currentPage - 1) * analytesPerPage, currentPage * analytesPerPage);
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
								<th className="py-2 text-start pl-2 min-w-32 w-32 relative filter-dropdown">
									<div
										className="cursor-pointer flex items-center justify-between p-1 rounded text-blue-600 underline"
										onClick={toggleFieldDropdown}
									>
										<span>Lĩnh vực</span>
										{fieldFilter && <span className="text-xs bg-blue-500 text-white px-1 rounded">✓</span>}
									</div>
									{showFieldDropdown && (
										<div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-10">
											<div
												className="p-2 cursor-pointer hover:bg-gray-200 text-start border-b"
												onClick={() => handleFieldFilter('')}
											>
												<span className="text-gray-500">Tất cả</span>
											</div>
											{getUniqueFields().map((field, index) => (
												<div
													key={index}
													className={`p-2 cursor-pointer hover:bg-gray-200 text-start border-b ${
														fieldFilter === field ? 'bg-blue-100' : ''
													}`}
													onClick={() => handleFieldFilter(field)}
												>
													{field}
												</div>
											))}
										</div>
									)}
								</th>
								<th className="py-2 text-start pl-2 min-w-44 w-1/5 relative filter-dropdown">
									<div
										className="cursor-pointer flex items-center justify-between p-1 rounded text-blue-600 underline"
										onClick={toggleMatrixDropdown}
									>
										<span>Nền mẫu</span>
										{matrixFilter && <span className="text-xs bg-blue-500 text-white px-1 rounded">✓</span>}
									</div>
									{showMatrixFilterDropdown && (
										<div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
											<div
												className="p-2 cursor-pointer hover:bg-gray-200 text-start border-b"
												onClick={() => handleMatrixFilter('')}
											>
												<span className="text-gray-500">Tất cả</span>
											</div>
											{getUniqueMatricesFromCurrent().map((matrix, index) => (
												<div
													key={index}
													className={`p-2 cursor-pointer hover:bg-gray-200 text-start border-b ${
														matrixFilter === matrix ? 'bg-blue-100' : ''
													}`}
													onClick={() => handleMatrixFilter(matrix)}
												>
													{matrix}
												</div>
											))}
										</div>
									)}
								</th>
								<th className="py-2 text-start pl-2 min-w-24 w-24 relative filter-dropdown">
									<div
										className="cursor-pointer flex items-center justify-between p-1 rounded text-blue-600 underline"
										onClick={toggleSourceDropdown}
									>
										<span>Nguồn</span>
										{sourceFilter && <span className="text-xs bg-blue-500 text-white px-1 rounded">✓</span>}
									</div>
									{showSourceDropdown && (
										<div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-10">
											<div
												className="p-2 cursor-pointer hover:bg-gray-200 text-start border-b"
												onClick={() => handleSourceFilter('')}
											>
												<span className="text-gray-500">Tất cả</span>
											</div>
											{getUniqueSourcesFromCurrent().map((source, index) => (
												<div
													key={index}
													className={`p-2 cursor-pointer hover:bg-gray-200 text-start border-b ${
														sourceFilter === source ? 'bg-blue-100' : ''
													}`}
													onClick={() => handleSourceFilter(source)}
												>
													{source}
												</div>
											))}
										</div>
									)}
								</th>
								<th className="py-2 text-start pl-2 min-w-44 w-44">Code</th>
								<th className="py-2 text-start pl-2 min-w-20 w-20">Đơn vị</th>
								<th className="py-2 text-start pl-2 min-w-48 w-48">Định dạng hiển thị</th>
								<th className="py-2 text-start pl-2 min-w-32 w-32">Giá thành</th>
								<th className="py-2 text-start pl-2 min-w-28 w-28">Chứng nhận</th>
								<th className="py-2 text-start pl-2 min-w-28 w-28">Kỹ thuật viên</th>
								<th className="py-2 text-start pl-2 min-w-[70px] w-[70px]">Thao tác</th>
							</tr>
						</thead>
						<tbody>
							{isAddingNew && (
								<tr className="border-t bg-blue-50">
									<td className="p-1 text-start">
										<p className="font-medium text-primary">{newAnalyte.parameter_uid}</p>
									</td>
									<td className="p-1 text-start relative">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.parameter_name}
											onChange={(e) => handleParameterNameInput('new', e.target.value)}
										/>
										{showParameterNameDropdown && 
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: document.getElementById(`param-name-new`)?.offsetWidth + 'px',
														top: document.getElementById(`param-name-new`)?.getBoundingClientRect().bottom + window.scrollY,
														left: document.getElementById(`param-name-new`)?.getBoundingClientRect().left + window.scrollX,
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
												document.body
											)
										}
									</td>
									<td className="p-1 text-start">
										<select
											className="w-full border p-2 rounded bg-white"
											value={newAnalyte.field || 'Hóa lý'}
											onChange={(e) => handleNewAnalyteChange('field', e.target.value)}
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
												document.body
											)
										}
									</td>
									<td className="p-1 text-start">
										<select
											className="w-full border p-2 px-0.5 rounded bg-white"
											value={newAnalyte.protocol_source}
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
											value={newAnalyte.protocol_code}
											onChange={(e) => handleProtocolCodeInputChange('new', e.target.value)}
										/>
										{showProtocolCodeDropdown && 
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: document.getElementById(`protocol-code-new`)?.offsetWidth + 'px',
														top: document.getElementById(`protocol-code-new`)?.getBoundingClientRect().bottom + window.scrollY,
														left: document.getElementById(`protocol-code-new`)?.getBoundingClientRect().left + window.scrollX,
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
												document.body
											)
										}
										{isProtocolDropdownVisible && 
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: '320px',
														top: document.getElementById(`protocol-code-new`)?.getBoundingClientRect().bottom + window.scrollY,
														left: document.getElementById(`protocol-code-new`)?.getBoundingClientRect().left + window.scrollX,
													}}
												>
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
												</div>,
												document.body
											)
										}
									</td>
									<td className="p-1 text-center relative">
										<textarea
											id="unit-new"
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.default_unit || ''}
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
												document.body
											)
										}
									</td>
									<td className="p-1 text-start">
										<div className="w-full h-12 bg-white rounded border" style={{ borderRadius: '0.375rem' }}>
											<textarea
												id={`tinymce-${'new'}`}
												className="w-full h-full border-0 resize-none"
												style={{ borderRadius: '0' }}
												value={''}
												onChange={(e) => handleInputChange(analyte.id, 'display_style', e.target.value)}
											/>
										</div>
									</td>
									<td className="p-1 text-start">
										<textarea
											className="w-full border px-2 py-1 rounded bg-white resize-none"
											rows={2}
											value={newAnalyte.price || ''}
											onChange={(e) => handleNewAnalyteChange('price', e.target.value)}
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
											{getTechnicianDisplayName(newAnalyte.technician_uid) || 'Chọn kỹ thuật viên'}
										</div>
										{technicianDropdowns['new'] && 
											createPortal(
												<div
													className="technician-portal absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: Math.max(document.getElementById(`technician-new`)?.offsetWidth, 280) + 'px',
														top: document.getElementById(`technician-new`)?.getBoundingClientRect().bottom + window.scrollY,
														left: document.getElementById(`technician-new`)?.getBoundingClientRect().left + window.scrollX,
													}}
												>
													{techniciansList.map((tech, index) => (
														<div
															key={index}
															className="p-2 flex cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={() => {
																handleNewAnalyteChange('technician_uid', tech.alias);
																setTechnicianDropdowns((prev) => ({ ...prev, new: false }));
															}}
														>
															<div className="text-sm font-bold">{tech.alias}:</div>
															<div className="text-sm">{tech.identity_name}</div>
														</div>
													))}
												</div>,
												document.body
											)
										}
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
									<td className="p-1 text-start relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													id={`param-name-${analyte.id}`}
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.parameter_name}
													onChange={(e) => handleParameterNameInput(analyte.id, e.target.value)}
												/>
												{showParameterNameDropdown && editingParameterName === analyte.id && 
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
															style={{
																width: document.getElementById(`param-name-${analyte.id}`)?.offsetWidth + 'px',
																top: document.getElementById(`param-name-${analyte.id}`)?.getBoundingClientRect().bottom + window.scrollY,
																left: document.getElementById(`param-name-${analyte.id}`)?.getBoundingClientRect().left + window.scrollX,
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
														document.body
													)
												}
											</>
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
											<select
												className="w-full border p-2 rounded bg-white"
												value={analyte.field || 'Hóa lý'}
												onChange={(e) => handleInputChange(analyte.id, 'field', e.target.value)}
											>
												<option value="Hóa lý">Hóa lý</option>
												<option value="Vi sinh">Vi sinh</option>
											</select>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.field || 'Hóa lý'}
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
												{showMatrixDropdown && editingMatrix === analyte.id && 
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
															style={{
																width: document.getElementById(`matrix-${analyte.id}`)?.offsetWidth + 'px',
																top: document.getElementById(`matrix-${analyte.id}`)?.getBoundingClientRect().bottom + window.scrollY,
																left: document.getElementById(`matrix-${analyte.id}`)?.getBoundingClientRect().left + window.scrollX,
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
														document.body
													)
												}
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
												value={analyte.protocol_source || ''}
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
												{analyte.protocol_source || ''}
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
													value={analyte.protocol_code}
													onChange={(e) => handleProtocolCodeInputChange(analyte.id, e.target.value)}
												/>
												{showProtocolCodeDropdown && editingProtocolCode === analyte.id && 
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
															style={{
																width: document.getElementById(`protocol-code-${analyte.id}`)?.offsetWidth + 'px',
																top: document.getElementById(`protocol-code-${analyte.id}`)?.getBoundingClientRect().bottom + window.scrollY,
																left: document.getElementById(`protocol-code-${analyte.id}`)?.getBoundingClientRect().left + window.scrollX,
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
														document.body
													)
												}
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.protocol_code}
											</span>
										)}
										{isProtocolDropdownVisible && editingRow === analyte.id && 
											createPortal(
												<div
													className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: '320px',
														top: document.getElementById(`protocol-code-${analyte.id}`)?.getBoundingClientRect().bottom + window.scrollY,
														left: document.getElementById(`protocol-code-${analyte.id}`)?.getBoundingClientRect().left + window.scrollX,
													}}
												>
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
												</div>,
												document.body
											)
										}
									</td>
									<td className="p-1 text-center relative">
										{editingRow === analyte.id ? (
											<>
												<textarea
													id={`unit-${analyte.id}`}
													className="w-full border px-2 py-1 rounded bg-white resize-none"
													rows={2}
													value={analyte.default_unit || ''}
													onChange={(e) => handleUnitInput(analyte.id, e.target.value)}
												/>
												{showUnitDropdown && editingUnit === analyte.id && 
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
															style={{
																width: document.getElementById(`unit-${analyte.id}`)?.offsetWidth + 'px',
																top: document.getElementById(`unit-${analyte.id}`)?.getBoundingClientRect().bottom + window.scrollY,
																left: document.getElementById(`unit-${analyte.id}`)?.getBoundingClientRect().left + window.scrollX,
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
														document.body
													)
												}
											</>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.default_unit}
											</span>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<div className="w-full h-12 bg-white rounded border" style={{ borderRadius: '0.375rem' }}>
												<textarea
													id={`tinymce-${analyte.id}`}
													className="w-full h-full"
													style={{ borderRadius: '0' }}
													value={newAnalyte.display_style || ''}
													onChange={(e) => handleNewAnalyteChange('display_style', e.target.value)}
												/>
											</div>
										) : (
											<div
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap max-h-16"
												style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
												dangerouslySetInnerHTML={{ __html: analyte.display_style || '' }}
											/>
										)}
									</td>
									<td className="p-1 text-start">
										{editingRow === analyte.id ? (
											<textarea
												className="w-full h-10 border px-2 py-1 rounded bg-white resize-none"
												rows={2}
												value={analyte.price || ''}
												onChange={(e) => handleInputChange(analyte.id, 'price', e.target.value)}
											/>
										) : (
											<span
												className="block overflow-hidden text-ellipsis whitespace-pre-wrap"
												style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
											>
												{analyte.price || ''}
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
											{getTechnicianDisplayName(analyte.technician_uid) || 'Chọn kỹ thuật viên'}
										</div>
										{technicianDropdowns[analyte.id] && 
											createPortal(
												<div
													className="technician-portal absolute bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
													style={{
														width: Math.max(document.getElementById(`technician-${analyte.id}`)?.offsetWidth, 280) + 'px',
														top: document.getElementById(`technician-${analyte.id}`)?.getBoundingClientRect().bottom + window.scrollY,
														left: document.getElementById(`technician-${analyte.id}`)?.getBoundingClientRect().left + window.scrollX,
													}}
												>
													{techniciansList.map((tech, techIndex) => (
														<div
															key={techIndex}
															className="p-2 flex cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
															onClick={(e) => {
																e.stopPropagation();
																handleTechnicianSelect(analyte.id, tech);
															}}
														>
															<div className="text-sm font-bold">{tech.alias}:</div>
															<div className="text-sm">{tech.identity_name}</div>
														</div>
													))}
												</div>,
												document.body
											)
										}
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
				<div className="flex justify-center mt-4">{renderPageNumbers(totalPages, currentPage, handlePageChange)}</div>
			</div>
		</div>
	);
};

export default AnalyteInfor;