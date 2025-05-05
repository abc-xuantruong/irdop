import React, { useState, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; // Import createPortal
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import TinyMceInput from './Input';
import { toast, ToastContainer } from 'react-toastify';
import { GrDocumentText, GrPrint } from 'react-icons/gr';
import {
	FaCheck,
	FaSave,
	FaUndo,
	FaStickyNote,
	FaCopy,
	FaEdit,
	FaCalendarDay,
	FaTimes,
	FaUpload,
} from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ProcessingSample = () => {
	const { setCurrentTitlePage, status, currentUser, technicians, formatDate } = useContext(GlobalContext);
	const [processingSample, setProcessingSample] = useState(null); // Raw data from API
	const [filteredProcessingSample, setFilteredProcessingSample] = useState(null); // Filtered data based on search
	const [selectedCheckboxesV3, setSelectedCheckboxesV3] = useState([]); // State for viewMode v3 checkboxes
	const [selectedCheckboxesByReceipt, setSelectedCheckboxesByReceipt] = useState({}); // Track checkboxes by receipt ID
	const [bulkEditCell, setBulkEditCell] = useState({ column: null, receiptId: null }); // Track which bulk edit cell is being edited
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const [dropdownPosition, setDropdownPosition] = useState({
		top: 0,
		left: 0,
	});
	const [showFileUploadModal, setShowFileUploadModal] = useState(false);
	const [files, setFiles] = useState([]);
	const [showFileAssociationForm, setShowFileAssociationForm] = useState(false);
	const [fileAssociations, setFileAssociations] = useState([]);
	const [associationSearchResults, setAssociationSearchResults] = useState({});
	const fileInputRef = useRef(null);
	const [displayCount, setDisplayCount] = useState(20); // Number of receipts to display
	const [showAllReceipts, setShowAllReceipts] = useState(false); // Whether to show all receipts

	// Add the missing handleBulkEditCellClick function
	const handleBulkEditCellClick = (column, receiptId) => {
		setBulkEditCell({ column, receiptId });
	};

	const [searchTerm, setSearchTerm] = useState('');
	const [sampleSearchTerm, setSampleSearchTerm] = useState('');
	const [parameterSearchTerm, setParameterSearchTerm] = useState('');
	const [editingNote, setEditingNote] = useState(null);
	const [noteInput, setNoteInput] = useState('');
	const [bulkEditValues, setBulkEditValues] = useState({}); // Add state to track bulk edit values
	const [showBulkEditForm, setShowBulkEditForm] = useState(null); // Add state to track which receipt's bulk edit form is visible
	const [showGlobalBulkEditForm, setShowGlobalBulkEditForm] = useState(false); // Add state for global bulk edit form
	const [filterUrgent, setFilterUrgent] = useState(false); // Add state for urgent filter
	const [filterNoResults, setFilterNoResults] = useState(false); // Add state for no results filter
	const [filterOverdue, setFilterOverdue] = useState(false); // Add state for overdue filter
	const [editableCell, setEditableCell] = useState({ analysisId: null, column: null }); // Track editable cell for v3
	const [inputValue, setInputValue] = useState('');
	const location = useLocation();
	const navigate = useNavigate(); // Add navigate hook for URL manipulation
	let isFetch = false;

	const [showTodayDeadlines, setShowTodayDeadlines] = useState(false);
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);
	const [dateRange, setDateRange] = useState([new Date(), new Date()]);
	const [startDate, endDate] = dateRange;
	const datePickerRef = useRef(null);
	const [showDateRangePicker, setShowDateRangePicker] = useState(false);

	const [filterInfo, setFilterInfo] = useState({
		isFilterActive: false,
		count: 0,
		startDate: null,
		endDate: null,
	});

	// Add viewMode v3 functionality
	// Update the fetchReceiptData to properly update filteredProcessingSample
	const fetchReceiptData = async () => {
		try {
			// Get query parameters from URL
			const queryParams = new URLSearchParams(location.search);
			let apiUrl = 'https://black.irdop.org/to82oe92i/db/get/processing_sample/v3';

			// If deadline_start and deadline_end parameters exist, use the filter API
			if (queryParams.has('deadline_start') && queryParams.has('deadline_end')) {
				apiUrl = 'https://black.irdop.org/to82oe92i/db/filter/analysis/deadline/processing_sample/v3';

				// Update filter info with the dates from URL
				const startDate = new Date(queryParams.get('deadline_start'));
				const endDate = new Date(queryParams.get('deadline_end'));
				setFilterInfo({
					isFilterActive: true,
					count: 0, // Will be updated when data is received
					startDate,
					endDate,
				});

				// Set date range for display in the UI
				setDateRange([startDate, endDate]);
				setShowTodayDeadlines(true);

				console.log(`Fetching data from: ${apiUrl}`);
				const response = await apiPost(apiUrl, {
					start_date: queryParams.get('deadline_start'),
					end_date: queryParams.get('deadline_end'),
				});
				const data = Array.isArray(response?.data) ? response.data : [];
				console.log(`Received ${data.length} items from API`);

				// Update the main data source
				setProcessingSample(data);
			}
			// If the urgent parameter exists, use urgent API
			else if (queryParams.has('urgent')) {
				apiUrl = 'https://black.irdop.org/to82oe92i/db/filter/fast/processing_sample/v3';
				setFilterUrgent(true);
				setFilterNoResults(false);
				setFilterOverdue(false); // Reset overdue filter state
				console.log(`Fetching data from: ${apiUrl}`);
				const response = await apiGet(apiUrl);
				const data = Array.isArray(response?.data) ? response.data : [];
				console.log(`Received ${data.length} items from API`);

				// Update the main data source
				setProcessingSample(data);
				setFilterOverdue(false); // Reset overdue filter state
			}
			// If the no_results parameter exists, use no results API
			else if (queryParams.has('no_results')) {
				apiUrl = 'https://black.irdop.org/to82oe92i/db/filter/result/processing_sample/v3';
				setFilterNoResults(true);
				setFilterUrgent(false);
				setFilterOverdue(false); // Reset overdue filter state
				console.log(`Fetching data from: ${apiUrl}`);
				const response = await apiGet(apiUrl);
				const data = Array.isArray(response?.data) ? response.data : [];
				console.log(`Received ${data.length} items from API`);

				// Update the main data source
				setProcessingSample(data);
			}
			// If the overdue parameter exists, use overdue API
			else if (queryParams.has('overdue')) {
				apiUrl = 'https://black.irdop.org/to82oe92i/db/filter/overdue/processing_sample/v3';
				setFilterOverdue(true);
				setFilterUrgent(false);
				setFilterNoResults(false);
				console.log(`Fetching data from: ${apiUrl}`);
				const response = await apiGet(apiUrl);
				const data = Array.isArray(response?.data) ? response.data : [];
				console.log(`Received ${data.length} items from API`);

				// Update the main data source
				setProcessingSample(data);
			} else {
				// Default API call without filters
				setFilterUrgent(false);
				setFilterNoResults(false);
				setFilterOverdue(false); // Reset overdue filter state
				console.log(`Fetching data from: ${apiUrl}`);
				const response = await apiGet(apiUrl);
				const data = Array.isArray(response?.data) ? response.data : [];
				console.log(`Received ${data.length} items from API`);

				// Update the main data source
				setProcessingSample(data);
			}
		} catch (error) {
			console.error('Error fetching receipt data:', error);
			setProcessingSample([]);
			setFilteredProcessingSample([]);
		}
	};

	// Update filtered data to remove pagination
	const setFilteredBySearch = () => {
		if (!processingSample) return [];

		return processingSample
			.filter((receipt) => {
				const matchesReceiptUid =
					searchTerm.trim() === '' || receipt.receipt_uid?.toLowerCase().includes(searchTerm.toLowerCase());

				if (!matchesReceiptUid) return false;

				const sampleTerms = parseSearchTerms(sampleSearchTerm);
				const parameterTerms = parseSearchTerms(parameterSearchTerm);

				const filteredSamples = receipt.samples?.filter((sample) => {
					const matchesSampleUid =
						sampleTerms.length === 0 || sampleTerms.some((term) => sample.sample_uid?.toLowerCase().includes(term));

					const filteredAnalyses = sample.analysis?.filter((analysis) => {
						return (
							parameterTerms.length === 0 ||
							parameterTerms.some((term) => analysis.parameter_name?.toLowerCase().includes(term))
						);
					});

					return matchesSampleUid && filteredAnalyses?.length > 0;
				});

				return filteredSamples?.length > 0;
			})
			.map((receipt) => {
				const sampleTerms = parseSearchTerms(sampleSearchTerm);
				const parameterTerms = parseSearchTerms(parameterSearchTerm);

				const filteredSamples = receipt.samples
					?.map((sample) => {
						const filteredAnalyses = sample.analysis?.filter((analysis) => {
							return (
								parameterTerms.length === 0 ||
								parameterTerms.some((term) => analysis.parameter_name?.toLowerCase().includes(term))
							);
						});

						return {
							...sample,
							analysis: filteredAnalyses,
						};
					})
					.filter((sample) => {
						const matchesSampleUid =
							sampleTerms.length === 0 || sampleTerms.some((term) => sample.sample_uid?.toLowerCase().includes(term));
						return matchesSampleUid && sample.analysis?.length > 0;
					});

				return {
					...receipt,
					samples: filteredSamples,
				};
			});
	};

	// Apply filters whenever search terms change
	useEffect(() => {
		if (processingSample) {
			const filteredData = setFilteredBySearch();
			setFilteredProcessingSample(filteredData);
		}
	}, [searchTerm, sampleSearchTerm, parameterSearchTerm, processingSample]);

	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
	};

	const handleSampleSearchChange = (e) => {
		setSampleSearchTerm(e.target.value);
	};

	const handleParameterSearchChange = (e) => {
		setParameterSearchTerm(e.target.value);
	};

	useEffect(() => {
		// Update the title
		setCurrentTitlePage('Mẫu đang xử lý');

		// Fetch data based on current URL
		fetchReceiptData();

		// Set isFetch to true so we don't fetch again unnecessarily
		isFetch = true;

		// Log URL changes for debugging
		console.log(`URL search params changed: ${location.search}`);
	}, [location.search]); // This will run whenever the URL query parameters change

	// Update the interval for periodic refresh
	useEffect(() => {
		const interval = setInterval(() => {
			fetchReceiptData();
		}, 60000);

		return () => clearInterval(interval);
	}, []);

	const parseSearchTerms = (searchString) => {
		return searchString
			.split(',')
			.map((term) => term.trim().toLowerCase())
			.filter((term) => term.length > 0);
	};

	const handleEditNote = (receipt) => {
		setEditingNote(receipt.id);
		setNoteInput(receipt.note || '');
	};

	const handleSaveContentV3 = async (content, column, analysisId) => {
		if (!editableCell.analysisId || editableCell.column !== column) {
			return; // Prevent duplicate API calls
		}

		try {
			const body = {
				analysis: {
					id: analysisId,
					[column]: content,
				},
			};

			if (column === 'result_value') {
				body.analysis.submit_result_by = currentUser.identity_name;
			}

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', body);

			if (response?.status === 200) {
				toast.success('Cập nhật thành công');

				// Update both raw and filtered data simultaneously
				const updateBothDatasets = (prevData) => {
					if (!prevData) return prevData;

					return prevData.map((receipt) => {
						return {
							...receipt,
							samples: receipt.samples?.map((sample) => {
								return {
									...sample,
									analysis: sample.analysis?.map((analysis) => {
										if (analysis.id === analysisId) {
											return { ...analysis, [column]: content };
										}
										return analysis;
									}),
								};
							}),
						};
					});
				};

				// Update both states in parallel
				setProcessingSample(updateBothDatasets);
				setFilteredProcessingSample(updateBothDatasets);
			} else {
				toast.error('Cập nhật thất bại');
			}
		} catch (error) {
			console.error('Error updating analysis:', error);
			toast.error('Lỗi khi cập nhật');
		} finally {
			setEditableCell({ analysisId: null, column: null }); // Reset editable cell to prevent duplicate calls
		}
	};

	const handleCellClickV3 = (analysisId, column, currentValue) => {
		setEditableCell({ analysisId, column });
		setInputValue(currentValue || '');
	};

	const handleKeyDownV3 = (e) => {
		if (e.key === 'Enter') {
			setEditableCell({ analysisId: null, column: null });
		}
	};

	const handleProtocolCodeChange = (analysisId, value) => {
		setInputValue(value); // Update the input value state
		setEditableCell({ analysisId, column: 'protocol_code' }); // Set the editable cell for protocol_code
	};

	const handleProtocolCodeKeyDown = (e, analysisId, value) => {
		if (e.key === 'Enter') {
			e.target.blur(); // Trigger blur event on Enter key
		}
	};

	const handleProtocolCodeBlur = (analysisId, value) => {
		if (value.trim() !== '') {
			handleSaveContentV3(value, 'protocol_code', analysisId); // Trigger API update on blur
		}
	};

	const handleProtocolSourceChange = async (analysisId, value) => {
		try {
			// Update both raw and filtered data simultaneously
			const updateBothDatasets = (prevData) => {
				if (!prevData) return prevData;

				return prevData.map((receipt) => {
					return {
						...receipt,
						samples: receipt.samples?.map((sample) => {
							return {
								...sample,
								analysis: sample.analysis?.map((analysis) => {
									if (analysis.id === analysisId) {
										return { ...analysis, protocol_source: value };
									}
									return analysis;
								}),
							};
						}),
					};
				});
			};

			// Update both states in parallel
			setProcessingSample(updateBothDatasets);
			setFilteredProcessingSample(updateBothDatasets);

			// Trigger API update
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: {
					id: analysisId,
					protocol_source: value,
				},
			});

			if (response?.status !== 200) {
				throw new Error('Failed to update protocol source');
			}
			toast.success('Cập nhật thành công');
		} catch (error) {
			console.error('Error updating protocol source:', error);
			toast.error('Lỗi khi cập nhật');
		}
	};

	// New checkbox handling functions

	// Handle individual analysis checkbox change
	const handleAnalysisCheckboxChange = (e, receiptId, analysisId) => {
		const isChecked = e.target.checked;

		// Update the selected checkboxes for v3 view
		setSelectedCheckboxesV3((prev) => {
			if (isChecked) {
				return [...prev, analysisId];
			} else {
				return prev.filter((id) => id !== analysisId);
			}
		});

		// Update the selected checkboxes by receipt
		setSelectedCheckboxesByReceipt((prev) => {
			const current = { ...prev };

			if (!current[receiptId]) {
				current[receiptId] = [];
			}

			if (isChecked) {
				current[receiptId] = [...current[receiptId], analysisId];
			} else {
				current[receiptId] = current[receiptId].filter((id) => id !== analysisId);
			}

			// Clean up empty arrays
			if (current[receiptId].length === 0) {
				delete current[receiptId];
			}

			return current;
		});
	};

	// Handle sample checkboxes - select/deselect all analyses in a sample
	const handleSampleCheckboxChange = (e, receiptId, sampleId, sampleAnalyses) => {
		const isChecked = e.target.checked;
		const analysisIds = sampleAnalyses.map((analysis) => analysis.id);

		// Update checkboxes in the DOM
		document.querySelectorAll(`input.row-checkbox[data-sample-id="${sampleId}"]`).forEach((checkbox) => {
			checkbox.checked = isChecked;
		});

		// Update the selected checkboxes for v3 view
		setSelectedCheckboxesV3((prev) => {
			let updated = [...prev];

			if (isChecked) {
				// Add all analysis IDs from this sample that aren't already selected
				analysisIds.forEach((id) => {
					if (!updated.includes(id)) {
						updated.push(id);
					}
				});
			} else {
				// Remove all analysis IDs from this sample
				updated = updated.filter((id) => !analysisIds.includes(id));
			}

			return updated;
		});

		// Update the selected checkboxes by receipt
		setSelectedCheckboxesByReceipt((prev) => {
			const current = { ...prev };

			if (!current[receiptId]) {
				current[receiptId] = [];
			}

			if (isChecked) {
				// Add all analysis IDs that aren't already selected
				analysisIds.forEach((id) => {
					if (!current[receiptId].includes(id)) {
						current[receiptId].push(id);
					}
				});
			} else {
				// Remove all analysis IDs from this sample
				current[receiptId] = current[receiptId].filter((id) => !analysisIds.includes(id));
			}

			// Clean up empty arrays
			if (current[receiptId].length === 0) {
				delete current[receiptId];
			}

			return current;
		});
	};

	// Handle receipt checkboxes - select/deselect all analyses in a receipt
	const handleReceiptCheckboxChange = (e, receipt) => {
		const isChecked = e.target.checked;

		// Get all analysis IDs from this receipt
		const analysisIds = [];
		receipt.samples?.forEach((sample) => {
			sample.analysis?.forEach((analysis) => {
				analysisIds.push(analysis.id);
			});
		});

		// Update checkboxes in the DOM
		document.querySelectorAll(`input.row-checkbox[data-receipt-id="${receipt.id}"]`).forEach((checkbox) => {
			checkbox.checked = isChecked;
		});

		// Update sample-level checkboxes in the DOM
		document.querySelectorAll(`input.sample-checkbox[data-receipt-id="${receipt.id}"]`).forEach((checkbox) => {
			checkbox.checked = isChecked;
		});

		// Update the selected checkboxes for v3 view
		setSelectedCheckboxesV3((prev) => {
			let updated = [...prev];

			if (isChecked) {
				// Add all analysis IDs from this receipt that aren't already selected
				analysisIds.forEach((id) => {
					if (!updated.includes(id)) {
						updated.push(id);
					}
				});
			} else {
				// Remove all analysis IDs from this receipt
				updated = updated.filter((id) => !analysisIds.includes(id));
			}

			return updated;
		});

		// Update the selected checkboxes by receipt
		setSelectedCheckboxesByReceipt((prev) => {
			const current = { ...prev };

			if (isChecked) {
				current[receipt.id] = [...analysisIds];
			} else {
				delete current[receipt.id];
			}

			return current;
		});
	};

	// Function to check if a sample has all its analyses selected
	const isSampleFullySelected = (sampleId, sampleAnalyses) => {
		const analysisIds = sampleAnalyses.map((analysis) => analysis.id);
		return analysisIds.every((id) => selectedCheckboxesV3.includes(id));
	};

	// Function to check if a receipt has all its analyses selected
	const isReceiptFullySelected = (receipt) => {
		let allAnalysisIds = [];
		receipt.samples?.forEach((sample) => {
			sample.analysis?.forEach((analysis) => {
				allAnalysisIds.push(analysis.id);
			});
		});

		return allAnalysisIds.every((id) => selectedCheckboxesV3.includes(id));
	};

	// Add a function to handle bulk edit value changes
	const handleBulkEditChange = (field, value) => {
		setBulkEditValues((prev) => ({ ...prev, [field]: value }));
	};

	// Add a function to handle bulk update submission
	const handleBulkUpdate = async (selectedRows) => {
		try {
			const updatePromises = selectedRows.map((rowId) => {
				const body = {
					analysis: {
						id: rowId,
						...bulkEditValues,
					},
				};
				return apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', body);
			});

			await Promise.all(updatePromises);
			toast.success('Cập nhật hàng loạt thành công');

			// Update both raw and filtered data simultaneously
			const updateBothDatasets = (prevData) => {
				if (!prevData) return prevData;

				return prevData.map((receipt) => {
					return {
						...receipt,
						samples: receipt.samples?.map((sample) => {
							return {
								...sample,
								analysis: sample.analysis?.map((analysis) => {
									if (selectedRows.includes(analysis.id)) {
										return { ...analysis, ...bulkEditValues };
									}
									return analysis;
								}),
							};
						}),
					};
				});
			};

			// Update both states in parallel
			setProcessingSample(updateBothDatasets);
			setFilteredProcessingSample(updateBothDatasets);

			// Clear all checkboxes after update
			document.querySelectorAll('.row-checkbox').forEach((checkbox) => {
				checkbox.checked = false;
			});

			// Clear selectedCheckboxesV3 and selectedCheckboxesByReceipt
			setSelectedCheckboxesV3([]);
			setSelectedCheckboxesByReceipt({});

			// Reset bulk edit values
			setBulkEditValues({});
			setBulkEditCell({ column: null, receiptId: null });
		} catch (error) {
			console.error('Error during bulk update:', error);
			toast.error('Lỗi khi cập nhật hàng loạt');
		}
	};

	// Add function to toggle technician dropdown
	const toggleTechnicianDropdown = (index, event) => {
		const buttonRect = event.target.getBoundingClientRect();

		setDropdownPosition({
			top: buttonRect.bottom + window.scrollY + 5,
			left: buttonRect.left + window.scrollX,
		});

		setTechnicianDropdownVisible(technicianDropdownVisible === index ? null : index);
	};

	// Add function to handle technician selection
	const handleTechnicianChange = async (analysisId, technicianUid) => {
		try {
			// Update both raw and filtered data simultaneously
			const updateBothDatasets = (prevData) => {
				if (!prevData) return prevData;

				return prevData.map((receipt) => {
					return {
						...receipt,
						samples: receipt.samples?.map((sample) => {
							return {
								...sample,
								analysis: sample.analysis?.map((analysis) => {
									if (analysis.id === analysisId) {
										return { ...analysis, technician_uid: technicianUid };
									}
									return analysis;
								}),
							};
						}),
					};
				});
			};

			// Update both states in parallel
			setProcessingSample(updateBothDatasets);
			setFilteredProcessingSample(updateBothDatasets);

			// Send update to the server
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: {
					id: analysisId,
					technician_uid: technicianUid,
					modified_by_uid: currentUser.identity_uid,
				},
			});

			if (response?.status === 200) {
				toast.success('Cập nhật người thực hiện thành công');
			} else {
				throw new Error('Failed to update technician');
			}
		} catch (error) {
			console.error('Error updating technician:', error);
			toast.error('Lỗi khi cập nhật người thực hiện');
		} finally {
			// Close the dropdown
			setTechnicianDropdownVisible(null);
		}
	};

	// Get technician name
	const getTechnicianName = (technician_uid) => {
		if (!technician_uid) return '--';
		const technician = technicians?.find((tech) => tech.identity_uid === technician_uid);
		return technician ? technician.identity_name : '--';
	};

	// Modified functions to toggle filters with URL query parameters without extra API calls
	const toggleUrgentFilter = () => {
		// Get current URL search params
		const searchParams = new URLSearchParams(location.search);

		// Check if urgent filter is already active in the URL
		const hasUrgentParam = searchParams.has('urgent');

		// Clear all existing filters first
		searchParams.delete('deadline_start');
		searchParams.delete('deadline_end');
		searchParams.delete('no_results');
		searchParams.delete('urgent');
		searchParams.delete('overdue');

		// Reset filter info
		setFilterInfo({
			isFilterActive: false,
			count: 0,
			startDate: null,
			endDate: null,
		});

		// Reset UI state for datepicker
		setShowTodayDeadlines(false);

		if (!hasUrgentParam) {
			// Add the parameter if it doesn't exist
			searchParams.set('urgent', 'true');
			toast.info('Đã bật bộ lọc mẫu khẩn');
		} else {
			// If already active, just removed it (handled above)
			toast.info('Đã tắt bộ lọc mẫu khẩn');
		}

		// Update the URL without reloading the page
		navigate({
			pathname: location.pathname,
			search: searchParams.toString(),
		});
		// The fetchReceiptData will be called by the useEffect that watches location.search
	};

	const toggleNoResultsFilter = () => {
		// Get current URL search params
		const searchParams = new URLSearchParams(location.search);

		// Check if no_results filter is already active in the URL
		const hasNoResultsParam = searchParams.has('no_results');

		// Clear all existing filters first
		searchParams.delete('deadline_start');
		searchParams.delete('deadline_end');
		searchParams.delete('no_results');
		searchParams.delete('urgent');
		searchParams.delete('overdue');

		// Reset filter info
		setFilterInfo({
			isFilterActive: false,
			count: 0,
			startDate: null,
			endDate: null,
		});

		// Reset UI state for datepicker
		setShowTodayDeadlines(false);

		if (!hasNoResultsParam) {
			// Add the parameter if it doesn't exist
			searchParams.set('no_results', 'true');
			toast.info('Đã bật bộ lọc chưa có kết quả');
		} else {
			// If already active, just removed it (handled above)
			toast.info('Đã tắt bộ lọc chưa có kết quả');
		}

		// Update the URL without reloading the page
		navigate({
			pathname: location.pathname,
			search: searchParams.toString(),
		});
		// The fetchReceiptData will be called by the useEffect that watches location.search
	};

	const toggleBulkEditForm = (receiptId) => {
		setShowBulkEditForm(receiptId);
	};

	const closeBulkEditForm = () => {
		setShowBulkEditForm(null);
		setBulkEditValues({});
		setBulkEditCell({ column: null, receiptId: null });
	};

	// Handle reference field changes and updates
	const handleReferenceKeyDown = (e, analysisId, value) => {
		if (e.key === 'Enter') {
			e.target.blur();
		}
	};

	const handleReferenceBlur = (analysisId, value) => {
		handleSaveContentV3(value, 'reference', analysisId);
	};

	// Modify the input handler for reference fields to update both datasets
	const handleReferenceChange = (analysisId, value) => {
		// Update both raw and filtered data simultaneously for immediate UI feedback
		const updateBothDatasets = (prevData) => {
			if (!prevData) return prevData;

			return prevData.map((receipt) => {
				return {
					...receipt,
					samples: receipt.samples?.map((sample) => {
						return {
							...sample,
							analysis: sample.analysis?.map((analysis) => {
								if (analysis.id === analysisId) {
									return { ...analysis, reference: value };
								}
								return analysis;
							}),
						};
					}),
				};
			});
		};

		// Update both states in parallel for immediate UI feedback
		setProcessingSample(updateBothDatasets);
		setFilteredProcessingSample(updateBothDatasets);
	};

	// Add these functions for deadline filtering
	const filterTodayDeadlines = (e) => {
		// If deadline filter is already active and the click didn't come from inside the datepicker container
		if (showTodayDeadlines && !e.target.closest('.datepicker-container')) {
			// Turn off deadline filter
			setShowTodayDeadlines(false);
			setIsCalendarOpen(false);

			// Clear deadline filters from URL
			const searchParams = new URLSearchParams(location.search);
			searchParams.delete('deadline_start');
			searchParams.delete('deadline_end');

			// Update URL without reloading the page
			navigate(
				{
					pathname: location.pathname,
					search: searchParams.toString(),
				},
				{ replace: true },
			);

			// Reset filter info
			setFilterInfo({
				isFilterActive: false,
				count: 0,
				startDate: null,
				endDate: null,
			});

			toast.info('Đã tắt bộ lọc ngày trả kết quả');

			return;
		}

		// When clicking the deadline button and not already showing the date picker
		if (!showTodayDeadlines) {
			// Reset date range to today's date for both start and end
			const today = new Date();
			setDateRange([today, today]);

			// Show the date picker
			setShowTodayDeadlines(true);
			setIsCalendarOpen(true);
		}
	};

	const handleDateRangeChange = (update) => {
		setDateRange(update);

		// Only close calendar and send API request when both dates are selected
		if (update[0] && update[1]) {
			// Give a longer delay to allow the UI to update before sending API request
			setTimeout(() => {
				// Close the calendar after a sufficient delay to ensure the selection is registered
				setIsCalendarOpen(false);

				// Send API request with selected date range
				fetchReceiptsByDeadline(update[0], update[1]);
			}, 300); // Increased timeout for better UI experience
		}
	};

	const isToday = (date) => {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	};

	// Function to fetch receipts by deadline date range
	const fetchReceiptsByDeadline = async (start, end) => {
		try {
			const formattedStartDate = start ? formatDateForAPI(start) : null;
			const formattedEndDate = end ? formatDateForAPI(end) : null;

			if (!formattedStartDate || !formattedEndDate) {
				toast.error('Vui lòng chọn khoảng thời gian');
				return;
			}

			// Clear all existing filters first
			const searchParams = new URLSearchParams(location.search);
			searchParams.delete('deadline_start');
			searchParams.delete('deadline_end');
			searchParams.delete('no_results');
			searchParams.delete('urgent');
			searchParams.delete('overdue');

			// Then set the new deadline parameters
			searchParams.set('deadline_start', formattedStartDate);
			searchParams.set('deadline_end', formattedEndDate);

			// Update the URL in the browser without causing a page reload
			navigate(
				{
					pathname: location.pathname,
					search: searchParams.toString(),
				},
				{ replace: true },
			); // Use replace to avoid adding to history stack

			// The URL change will trigger the useEffect and fetchReceiptData will be called

			// Store filter information
			setFilterInfo({
				isFilterActive: true,
				count: 0, // Will be updated when data is received
				startDate: start,
				endDate: end,
			});

			// Show toast notification
			const startDateStr = formatDateLocalSimple(start);
			const endDateStr = formatDateLocalSimple(end);
			toast.info(`Đã bật bộ lọc ngày trả kết quả: ${startDateStr} - ${endDateStr}`);

			// Note: We don't need to make a direct API call here since the URL change
			// will trigger fetchReceiptData which will use the correct endpoint
		} catch (error) {
			console.error('Error setting up deadline filter:', error);
			toast.error('Có lỗi xảy ra khi lọc dữ liệu theo hạn trả');
		}
	};

	// Function to format date for API
	const formatDateForAPI = (date) => {
		if (!date) return null;
		const d = new Date(date);
		// Add 7 hours to account for timezone if needed
		// d.setHours(d.getHours() + 7);
		return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD
	};

	// Add function to format date in simple DD/MM/YYYY format for display
	const formatDateLocalSimple = (date) => {
		if (!date) return '';
		const d = new Date(date);
		const day = d.getDate().toString().padStart(2, '0');
		const month = (d.getMonth() + 1).toString().padStart(2, '0');
		const year = d.getFullYear();
		return `${day}/${month}/${year}`;
	};

	// Function to reset the date filter
	const handleResetDateFilter = () => {
		// Reset filter info
		setFilterInfo({
			isFilterActive: false,
			count: 0,
			startDate: null,
			endDate: null,
		});

		// Close the calendar if open
		setIsCalendarOpen(false);
		setShowTodayDeadlines(false);

		// Clear deadline filters from URL
		const searchParams = new URLSearchParams(location.search);
		searchParams.delete('deadline_start');
		searchParams.delete('deadline_end');

		// Update URL without reloading the page
		navigate(
			{
				pathname: location.pathname,
				search: searchParams.toString(),
			},
			{ replace: true },
		);

		// Show toast notification
		toast.info('Đã tắt bộ lọc ngày trả kết quả');

		// Fetch fresh data
		fetchReceiptData();
	};

	// Function to handle file drop
	const handleFileDrop = (e) => {
		e.preventDefault();
		const droppedFiles = Array.from(e.dataTransfer.files);
		setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
	};

	// Function to handle file selection via file input
	const handleFileChange = (e) => {
		const selectedFiles = Array.from(e.target.files);
		setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
	};

	// Function to delete a file from the list
	const handleFileDelete = (fileName) => {
		setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
	};

	// Function to cancel upload
	const handleCancelUpload = () => {
		setFiles([]);
		setShowFileUploadModal(false);
	};

	// Function to confirm upload and show association form
	const handleConfirmUpload = () => {
		if (files.length === 0) {
			toast.error('Không có file nào được chọn');
			return;
		}

		// Initialize file associations
		const initialAssociations = files.map((file) => ({
			fileName: file.name,
			file: file,
			receiptCode: '',
			sampleCode: '',
			parameterName: '',
			searchResults: {},
			selectedSamples: [],
			selectedParameters: [],
		}));

		setFileAssociations(initialAssociations);
		setShowFileAssociationForm(true);
		setShowFileUploadModal(false);
	};

	// Function to handle input change in association form
	const handleAssociationInputChange = (index, field, value) => {
		setFileAssociations((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], [field]: value };
			return updated;
		});
	};

	// Function to search for receipt, sample and parameters
	const handleSearchForAssociations = async (index) => {
		const { receiptCode, sampleCode, parameterName } = fileAssociations[index];

		if (!receiptCode && !sampleCode && !parameterName) {
			toast.error('Vui lòng nhập ít nhất một trường tìm kiếm');
			return;
		}

		try {
			// Parse search terms using the same function as the main search
			const receiptTerms = parseSearchTerms(receiptCode);
			const sampleTerms = parseSearchTerms(sampleCode);
			const parameterTerms = parseSearchTerms(parameterName);

			// Filter using the same logic as the main search
			const results = filteredProcessingSample
				.filter((receipt) => {
					const matchesReceiptUid =
						receiptTerms.length === 0 || receiptTerms.some((term) => receipt.receipt_uid?.toLowerCase().includes(term));

					if (!matchesReceiptUid) return false;

					const filteredSamples = receipt.samples?.filter((sample) => {
						const matchesSampleUid =
							sampleTerms.length === 0 || sampleTerms.some((term) => sample.sample_uid?.toLowerCase().includes(term));

						const filteredAnalyses = sample.analysis?.filter((analysis) => {
							return (
								parameterTerms.length === 0 ||
								parameterTerms.some((term) => analysis.parameter_name?.toLowerCase().includes(term))
							);
						});

						return matchesSampleUid && filteredAnalyses?.length > 0;
					});

					return filteredSamples?.length > 0;
				})
				.map((receipt) => {
					const filteredSamples = receipt.samples
						?.map((sample) => {
							const filteredAnalyses = sample.analysis?.filter((analysis) => {
								return (
									parameterTerms.length === 0 ||
									parameterTerms.some((term) => analysis.parameter_name?.toLowerCase().includes(term))
								);
							});

							return {
								...sample,
								analysis: filteredAnalyses,
							};
						})
						.filter((sample) => {
							const matchesSampleUid =
								sampleTerms.length === 0 || sampleTerms.some((term) => sample.sample_uid?.toLowerCase().includes(term));
							return matchesSampleUid && sample.analysis?.length > 0;
						});

					return {
						...receipt,
						samples: filteredSamples,
					};
				});

			// Update search results for this file
			setAssociationSearchResults((prev) => ({
				...prev,
				[index]: results,
			}));

			if (results.length === 0) {
				toast.info('Không tìm thấy kết quả phù hợp');
			} else {
				toast.success(`Đã tìm thấy ${results.length} kết quả phù hợp`);
			}
		} catch (error) {
			console.error('Error searching for associations:', error);
			toast.error('Lỗi khi tìm kiếm');
		}
	};

	// Function to handle selection of samples and parameters
	const handleSelectSample = (fileIndex, receiptId, sampleId, analysisIds) => {
		setFileAssociations((prev) => {
			const updated = [...prev];

			// Add or update the selection
			const existingSelectionIndex = updated[fileIndex].selectedSamples.findIndex(
				(selection) => selection.receiptId === receiptId && selection.sampleId === sampleId,
			);

			if (existingSelectionIndex >= 0) {
				// Update existing selection
				updated[fileIndex].selectedSamples[existingSelectionIndex].analysisIds = analysisIds;
			} else {
				// Add new selection
				updated[fileIndex].selectedSamples.push({
					receiptId,
					sampleId,
					analysisIds,
				});
			}

			return updated;
		});
	};

	// Function to complete association and upload files
	const handleCompleteAssociation = () => {
		// Here you would implement the actual file upload with associations
		toast.success(`${files.length} biên bản đã được tải lên và liên kết thành công`);

		// Reset all states
		setFiles([]);
		setFileAssociations([]);
		setAssociationSearchResults({});
		setShowFileAssociationForm(false);
	};

	// Function to cancel association
	const handleCancelAssociation = () => {
		setFileAssociations([]);
		setShowFileAssociationForm(false);
	};

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			<Breadcrumb paths={[{}]} />

			<div className="w-full h-full flex justify-between items-center rounded-lg mb-2">
				<div>
					<button className="w-40 p-1 ml-1 text-sm font-medium focus:outline-none active:bg-sky-400 bg-teritary">
						Bàn giao
					</button>
				</div>
			</div>

			<div className="w-full h-full flex flex-col justify-center items-center bg-white rounded-lg p-4 shadow">
				<div className="w-full flex flex-col mb-4 gap-2">
					<div className="flex flex-wrap justify-between items-center gap-2">
						<input
							type="text"
							placeholder="Tìm kiếm theo mã TNM..."
							value={searchTerm}
							onChange={handleSearchChange}
							className="p-1 border rounded-lg w-[30%] bg-white"
						/>
						<input
							type="text"
							placeholder="Tìm kiếm theo mã mẫu..."
							value={sampleSearchTerm}
							onChange={handleSampleSearchChange}
							className="p-1 border rounded-lg w-[30%] bg-white"
						/>
						<input
							type="text"
							placeholder="Tìm kiếm theo chỉ tiêu..."
							value={parameterSearchTerm}
							onChange={handleParameterSearchChange}
							className="p-1 border rounded-lg w-[30%] bg-white"
						/>
					</div>

					<div className="flex flex-wrap justify-between items-center gap-2 mt-2">
						{/* Add filter buttons */}
						<div className="flex flex-wrap gap-2">
							{/* Add global bulk edit button */}

							<button
								className={`px-3 py-1 text-sm rounded-lg border ${
									new URLSearchParams(location.search).has('urgent')
										? 'bg-teritary border-primary'
										: 'bg-gray-100 border-gray-300'
								}`}
								onClick={toggleUrgentFilter}
								title="Hiển thị mẫu khẩn"
							>
								Mẫu khẩn
							</button>
							<button
								className={`px-3 py-1 text-sm rounded-lg border ${
									new URLSearchParams(location.search).has('no_results')
										? 'bg-teritary border-primary'
										: 'bg-gray-100 border-gray-300'
								}`}
								onClick={toggleNoResultsFilter}
								title="Hiển thị chỉ tiêu chưa có kết quả"
							>
								Chưa có KQ
							</button>
							<button
								className={`px-3 py-1 text-sm rounded-lg border ${
									filterOverdue ? 'bg-teritary border-primary' : 'bg-gray-100 border-gray-300'
								}`}
								onClick={() => {
									// Get current URL search params
									const searchParams = new URLSearchParams(location.search);

									// Clear all existing filters first
									searchParams.delete('deadline_start');
									searchParams.delete('deadline_end');
									searchParams.delete('no_results');
									searchParams.delete('urgent');
									searchParams.delete('overdue');

									// Reset filter info
									setFilterInfo({
										isFilterActive: false,
										count: 0,
										startDate: null,
										endDate: null,
									});

									// Reset UI state for datepicker
									setShowTodayDeadlines(false);

									if (!filterOverdue) {
										// Add the parameter if it doesn't exist
										searchParams.set('overdue', 'true');
										setFilterOverdue(true);
										toast.info('Đã bật bộ lọc mẫu quá hạn');
									} else {
										// If already active, turn it off
										setFilterOverdue(false);
										toast.info('Đã tắt bộ lọc mẫu quá hạn');
									}

									// Update the URL without reloading the page
									navigate({
										pathname: location.pathname,
										search: searchParams.toString(),
									});
								}}
								title="Hiển thị mẫu quá hạn"
							>
								Quá hạn
							</button>

							{/* Add deadline filter button */}
							<div className="relative">
								<button
									className={`p-2 rounded-lg bg-gray-100 border-gray-300 flex items-center justify-center focus:outline-none gap-2 py-1 ${
										showTodayDeadlines ? 'bg-teritary border-primary' : 'text-black'
									}`}
									onClick={filterTodayDeadlines}
									title="Lọc theo hạn trả"
								>
									Ngày trả KQ
									{showTodayDeadlines && (
										<div
											className="relative z-1000 text-black datepicker-container flex"
											onClick={(e) => e.stopPropagation()}
										>
											<DatePicker
												ref={datePickerRef}
												selected={startDate}
												onChange={handleDateRangeChange}
												startDate={startDate}
												endDate={endDate}
												selectsRange
												dateFormat="dd/MM/yyyy"
												placeholderText="Chọn khoảng thời gian"
												className="p-2 py-0 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-52 cursor-pointer"
												open={isCalendarOpen}
												onInputClick={() => setIsCalendarOpen(true)}
												onClickOutside={() => {
													// Only close if both dates are selected or clicked outside the calendar
													if (startDate && endDate) {
														setIsCalendarOpen(false);
													}
												}}
												// Remove the onBlur handler that causes premature closing
												shouldCloseOnSelect={false} // Don't close automatically on selection
												dayClassName={(date) => (isToday(date) ? 'bg-blue-100 font-bold rounded-full' : undefined)}
											/>
											<button
												className="ml-1 p-0.5 rounded bg-gray-200 hover:bg-gray-300 focus:outline-none"
												onClick={(e) => {
													e.stopPropagation();
													// Close the deadline filter
													setShowTodayDeadlines(false);
													setShowDateRangePicker(false);
													setIsCalendarOpen(false);

													// Clear deadline filters from URL
													const searchParams = new URLSearchParams(location.search);
													searchParams.delete('deadline_start');
													searchParams.delete('deadline_end');

													// Update URL without reloading the page
													navigate(
														{
															pathname: location.pathname,
															search: searchParams.toString(),
														},
														{ replace: true },
													);

													// Reset filter info
													setFilterInfo({
														isFilterActive: false,
														count: 0,
														startDate: null,
														endDate: null,
													});

													// Show toast notification
													toast.info('Đã tắt bộ lọc ngày trả kết quả');
												}}
												title="Đóng bộ lọc deadline"
											>
												<FaTimes size={14} />
											</button>
										</div>
									)}
								</button>
							</div>
							{/* Add file upload button */}
							<button
								className={`px-3 py-1 text-sm rounded-lg border flex items-center gap-1 bg-gray-100 border-gray-300 hover:bg-gray-200`}
								onClick={(e) => {
									setShowFileUploadModal(true);
									// Store button position for positioning the modal
									const buttonRect = e.target.getBoundingClientRect();
									setDropdownPosition({
										top: buttonRect.bottom + window.scrollY,
										left: buttonRect.left + window.scrollX,
									});
								}}
								title="Tải lên biên bản"
							>
								<FaUpload size={12} />
								Tải lên
							</button>
						</div>
						<button
							className={`px-3 py-1 text-sm rounded-lg border flex items-center gap-1 ${
								selectedCheckboxesV3.length > 0
									? 'bg-teritary border-primary cursor-pointer'
									: 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
							}`}
							onClick={() => {
								if (selectedCheckboxesV3.length > 0) {
									setShowGlobalBulkEditForm(true);
								}
							}}
							disabled={selectedCheckboxesV3.length === 0}
							title={
								selectedCheckboxesV3.length > 0
									? `Chỉnh sửa hàng loạt ${selectedCheckboxesV3.length} chỉ tiêu đã chọn`
									: 'Chọn ít nhất một chỉ tiêu để chỉnh sửa hàng loạt'
							}
						>
							<FaEdit size={12} /> Sửa ({selectedCheckboxesV3.length})
						</button>
					</div>
				</div>

				{/* File Upload Modal */}
				{showFileUploadModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowFileUploadModal(false)}>
						<div
							className="w-96 border-dashed border-2 border-gray-400 rounded-lg p-4 bg-white absolute z-10"
							style={{
								top: `${dropdownPosition.top}px`,
								left: `${dropdownPosition.left}px`,
							}}
							onClick={(e) => e.stopPropagation()}
							onDrop={handleFileDrop}
							onDragOver={(e) => e.preventDefault()}
						>
							<input
								type="file"
								multiple
								className="hidden"
								id="fileInput"
								ref={fileInputRef}
								onChange={handleFileChange}
							/>
							<label htmlFor="fileInput" className="cursor-pointer text-blue-500">
								Kéo thả biên bản vào đây hoặc nhấn để chọn file <br></br>
								<p className="text-sm text-red-500">(* .docx, .doc, .xlsx, .pdf)</p>
							</label>
							<div className="mt-4">
								{files.map((file) => (
									<div key={file.name} className="flex justify-between items-center border pl-2 w-full rounded-lg">
										{/* Thêm lớp `break-words` hoặc `break-all` để nội dung xuống dòng */}
										<span className="w-72 break-words text-start">{file.name}</span>

										<button className="text-red-500 py-2 px-4" onClick={() => handleFileDelete(file.name)}>
											X
										</button>
									</div>
								))}
							</div>
							<div className="flex justify-end mt-8">
								<button
									className="bg-gray-500 text-white font-bold py-2 px-4 rounded mr-2"
									onClick={handleCancelUpload}
								>
									Hủy bỏ
								</button>
								<button className="bg-blue-500 text-white font-bold py-2 px-4 rounded" onClick={handleConfirmUpload}>
									Xác nhận
								</button>
							</div>
						</div>
					</div>
				)}

				{/* File Association Form */}
				{showFileAssociationForm && (
					<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
						<div className="bg-white p-6 rounded-lg shadow-lg w-5/6 max-h-[80vh] overflow-auto">
							<h2 className="text-xl font-bold mb-4 text-left">Liên kết biên bản với mẫu và chỉ tiêu</h2>
							{fileAssociations.map((association, index) => (
								<div key={index} className="mb-6 border-b pb-4">
									<div className="flex flex-row gap-4">
										{/* Left column - file name and search fields */}
										<div className="w-1/3 pr-4 flex flex-col gap-3">
											<h3 className="text-lg font-semibold mb-2 text-blue-600 break-words text-left">
												{association.fileName}
											</h3>

											<div className="flex flex-col gap-2">
												<input
													type="text"
													placeholder="Mã TNM"
													value={association.receiptCode}
													onChange={(e) => handleAssociationInputChange(index, 'receiptCode', e.target.value)}
													className="p-2 border rounded-lg bg-white w-full text-left"
												/>

												<input
													type="text"
													placeholder="Mã mẫu"
													value={association.sampleCode}
													onChange={(e) => handleAssociationInputChange(index, 'sampleCode', e.target.value)}
													className="p-2 border rounded-lg bg-white w-full text-left"
												/>

												<input
													type="text"
													placeholder="Tên chỉ tiêu"
													value={association.parameterName}
													onChange={(e) => handleAssociationInputChange(index, 'parameterName', e.target.value)}
													className="p-2 border rounded-lg bg-white w-full text-left"
												/>

												<button
													className="bg-blue-500 text-white font-bold py-2 px-4 rounded w-full text-left"
													onClick={() => handleSearchForAssociations(index)}
												>
													Tìm kiếm
												</button>
											</div>
										</div>

										{/* Right column - search results */}
										<div className="w-2/3 border-l pl-4 min-h-[200px]">
											{associationSearchResults[index] && associationSearchResults[index].length > 0 ? (
												<div className="max-h-[300px] overflow-auto border rounded-lg p-2">
													{associationSearchResults[index].map((receipt) => (
														<div key={receipt.id} className="mb-4">
															<div className="flex items-center bg-gray-100 p-1">
																<input
																	type="checkbox"
																	className="mr-2"
																	onChange={(e) => {
																		const isChecked = e.target.checked;

																		// Create array to hold all analysis IDs from this receipt
																		const allReceiptAnalysisIds = [];
																		const updatedSelections = [...association.selectedSamples];

																		receipt.samples.forEach((sample) => {
																			const analysisIds = sample.analysis.map((analysis) => analysis.id);
																			allReceiptAnalysisIds.push(...analysisIds);

																			// Find existing selection for this sample
																			const existingSelectionIndex = updatedSelections.findIndex(
																				(selection) =>
																					selection.receiptId === receipt.id && selection.sampleId === sample.id,
																			);

																			if (isChecked) {
																				if (existingSelectionIndex >= 0) {
																					updatedSelections[existingSelectionIndex].analysisIds = analysisIds;
																				} else {
																					updatedSelections.push({
																						receiptId: receipt.id,
																						sampleId: sample.id,
																						analysisIds: analysisIds,
																					});
																				}
																			} else {
																				if (existingSelectionIndex >= 0) {
																					updatedSelections.splice(existingSelectionIndex, 1);
																				}
																			}
																		});

																		// Update all samples for this receipt at once
																		setFileAssociations((prev) => {
																			const updated = [...prev];
																			updated[index].selectedSamples = updatedSelections;
																			return updated;
																		});
																	}}
																	// Check if all analyses in this receipt are selected
																	checked={receipt.samples.every((sample) =>
																		sample.analysis.every((analysis) =>
																			association.selectedSamples.some(
																				(selection) =>
																					selection.receiptId === receipt.id &&
																					selection.sampleId === sample.id &&
																					selection.analysisIds.includes(analysis.id),
																			),
																		),
																	)}
																/>
																<h4 className="font-semibold text-left">{receipt.receipt_uid}</h4>
															</div>
															{receipt.samples.map((sample) => (
																<div key={sample.id} className="ml-4 mb-2 border-l-2 border-blue-200 pl-2">
																	<div className="flex items-center">
																		<input
																			type="checkbox"
																			className="mr-2"
																			onChange={(e) => {
																				const isChecked = e.target.checked;
																				const analysisIds = sample.analysis.map((analysis) => analysis.id);

																				setFileAssociations((prev) => {
																					const updated = [...prev];

																					// Find existing selection
																					const existingSelectionIndex = updated[index].selectedSamples.findIndex(
																						(selection) =>
																							selection.receiptId === receipt.id && selection.sampleId === sample.id,
																					);

																					if (isChecked) {
																						if (existingSelectionIndex >= 0) {
																							updated[index].selectedSamples[existingSelectionIndex].analysisIds =
																								analysisIds;
																						} else {
																							updated[index].selectedSamples.push({
																								receiptId: receipt.id,
																								sampleId: sample.id,
																								analysisIds: analysisIds,
																							});
																						}
																					} else {
																						if (existingSelectionIndex >= 0) {
																							updated[index].selectedSamples.splice(existingSelectionIndex, 1);
																						}
																					}

																					return updated;
																				});
																			}}
																			// Check if all analyses in this sample are selected
																			checked={sample.analysis.every((analysis) =>
																				association.selectedSamples.some(
																					(selection) =>
																						selection.receiptId === receipt.id &&
																						selection.sampleId === sample.id &&
																						selection.analysisIds.includes(analysis.id),
																				),
																			)}
																		/>
																		<h5 className="font-semibold text-left">{sample.sample_uid}</h5>
																	</div>
																	{sample.analysis.map((analysis) => (
																		<div
																			key={analysis.id}
																			className="ml-4 flex items-center py-1 border-b border-gray-100"
																		>
																			<input
																				type="checkbox"
																				className="mr-2"
																				checked={association.selectedSamples.some(
																					(selection) =>
																						selection.receiptId === receipt.id &&
																						selection.sampleId === sample.id &&
																						selection.analysisIds.includes(analysis.id),
																				)}
																				onChange={(e) => {
																					const isChecked = e.target.checked;
																					const currentSelection = association.selectedSamples.find(
																						(selection) =>
																							selection.receiptId === receipt.id && selection.sampleId === sample.id,
																					);

																					const analysisIds = isChecked
																						? [...(currentSelection?.analysisIds || []), analysis.id]
																						: (currentSelection?.analysisIds || []).filter((id) => id !== analysis.id);

																					handleSelectSample(index, receipt.id, sample.id, analysisIds);
																				}}
																			/>
																			<span className="text-left">{analysis.parameter_name}</span>
																		</div>
																	))}
																</div>
															))}
														</div>
													))}
												</div>
											) : (
												<div className="flex items-center justify-center h-[200px] text-gray-500 italic border rounded-lg text-left">
													Chưa có kết quả tìm kiếm
												</div>
											)}
										</div>
									</div>
								</div>
							))}
							<div className="flex justify-end mt-4">
								<button
									className="bg-gray-500 text-white font-bold py-2 px-4 rounded mr-2 text-left"
									onClick={handleCancelAssociation}
								>
									Hủy bỏ
								</button>
								<button
									className="bg-blue-500 text-white font-bold py-2 px-4 rounded text-left"
									onClick={handleCompleteAssociation}
								>
									Hoàn tất
								</button>
							</div>
						</div>
					</div>
				)}

				<div className="w-full">
					<div className="w-full min-h-20 flex flex-col mt-1 ">
						{Array.isArray(filteredProcessingSample) && filteredProcessingSample.length > 0 ? (
							filteredProcessingSample
								.slice(0, showAllReceipts ? filteredProcessingSample.length : displayCount)
								.map((receipt) => (
									<div key={receipt.id} className="p-2 border rounded-lg mb-4 text-left overflow-auto relative">
										<div className="text-start mb-2 flex justify-between items-center">
											<div>
												<p className="text-primary font-semibold">{receipt.receipt_uid || 'N/A'}</p>
												{editingNote === receipt.id ? (
													<div className="flex items-center gap-2">
														<textarea
															value={noteInput}
															onChange={(e) => setNoteInput(e.target.value)}
															className="p-2 border rounded-lg w-full bg-white"
															rows={3}
														/>
														<div className="flex flex-col gap-2">
															<button
																onClick={() => handleSaveNote(receipt)}
																className="bg-blue-500 text-white px-2 py-1 rounded-lg w-24"
															>
																Xác nhận
															</button>
															<button
																onClick={() => setEditingNote(null)}
																className="bg-gray-500 text-white px-2 py-1 rounded-lg w-24"
															>
																Hủy bỏ
															</button>
														</div>
													</div>
												) : (
													<p
														className="text-gray-600 italic cursor-pointer hover:underline w-fit"
														onClick={() => handleEditNote(receipt)}
													>
														Ghi chú: {receipt.note || 'Không có ghi chú'}
													</p>
												)}
											</div>

											<div className="flex items-center gap-3">
												{/* Select all checkbox - with new handlers */}
												<div className="flex items-center">
													<span className="text-sm min-w-20">Chọn tất cả</span>
													<input
														type="checkbox"
														className="w-5 h-5 receipt-checkbox"
														title="Chọn tất cả các mẫu hiển thị trong đơn này"
														checked={isReceiptFullySelected(receipt)}
														onChange={(e) => handleReceiptCheckboxChange(e, receipt)}
													/>
												</div>

												{/* Bulk edit button */}
												{selectedCheckboxesByReceipt[receipt.id] &&
													selectedCheckboxesByReceipt[receipt.id].length > 0 && (
														<button
															className="border-2 border-gray-600  p-1 rounded-lg hover:bg-blue-300 flex items-center h-10"
															onClick={() => toggleBulkEditForm(receipt.id)}
														>
															<FaEdit className="mr-2" /> Chỉnh sửa hàng loạt
														</button>
													)}
											</div>
										</div>

										{/* Bulk Edit Form */}
										{showBulkEditForm === receipt.id && (
											<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
												<div className="bg-white p-6 rounded-lg shadow-lg min-w-[400px] w-5/6">
													<h2 className="text-xl font-bold mb-4 flex justify-between items-center">
														<span>Chỉnh sửa hàng loạt</span>
														<span className="text-sm font-normal text-gray-600">
															({selectedCheckboxesByReceipt[receipt.id]?.length || 0} chỉ tiêu được chọn)
														</span>
													</h2>

													{/* Form with labels on top */}
													<div className="grid grid-cols-3 gap-4 mb-6">
														{/* Combined Protocol source and code fields */}
														<div className="flex flex-col">
															<label className="mb-1 font-medium text-sm">Phương pháp thử</label>
															<div className="flex gap-1">
																<select
																	className="p-2 border rounded-lg bg-white w-1/3"
																	value={bulkEditValues.protocol_source || ''}
																	onChange={(e) => handleBulkEditChange('protocol_source', e.target.value)}
																>
																	<option value="">--</option>
																	<option value="IRDOP">IRDOP</option>
																	<option value="IRDOP VS">IRDOP VS</option>
																	<option value="EX">EX</option>
																</select>
																<input
																	type="text"
																	className="p-2 border rounded-lg bg-white w-2/3"
																	placeholder="Nhập mã phương pháp"
																	value={bulkEditValues.protocol_code || ''}
																	onChange={(e) => handleBulkEditChange('protocol_code', e.target.value)}
																/>
															</div>
														</div>

														{/* Reference field */}
														<div className="flex flex-col">
															<label className="mb-1 font-medium text-sm">Tham chiếu</label>
															<input
																type="text"
																className="p-2 border rounded-lg bg-white"
																placeholder="Nhập tham chiếu"
																value={bulkEditValues.reference || ''}
																onChange={(e) => handleBulkEditChange('reference', e.target.value)}
															/>
														</div>

														{/* Deadline field */}
														<div className="flex flex-col">
															<label className="mb-1 font-medium text-sm">Hạn trả</label>
															<input
																type="datetime-local"
																className="p-2 border rounded-lg bg-white"
																value={bulkEditValues.deadline || ''}
																onChange={(e) => handleBulkEditChange('deadline', e.target.value)}
															/>
														</div>

														{/* Result value field */}
														<div className="flex flex-col">
															<label className="mb-1 font-medium text-sm">Kết quả</label>
															<div
																className="h-10 flex items-center  border rounded-lg bg-white hover:border-purple-500 cursor-text"
																onClick={() => handleBulkEditCellClick('result_value', receipt.id)}
																onBlur={() => setBulkEditCell({ column: null, receiptId: null })}
															>
																{bulkEditCell.column === 'result_value' && bulkEditCell.receiptId === receipt.id ? (
																	<TinyMceInput
																		value={bulkEditValues.result_value || ''}
																		onUpdate={(content) => handleBulkEditChange('result_value', content)}
																	/>
																) : (
																	<div
																		dangerouslySetInnerHTML={{
																			__html: bulkEditValues.result_value || 'Nhấp để chỉnh sửa...',
																		}}
																		className="overflow-hidden text-ellipsis whitespace-nowrap px-2"
																	/>
																)}
															</div>
														</div>

														{/* Result unit field */}
														<div className="flex flex-col">
															<label className="mb-1 font-medium text-sm">Đơn vị</label>
															<div
																className="h-10 flex items-center border rounded-lg bg-white hover:border-purple-500 cursor-text"
																onClick={() => handleBulkEditCellClick('result_unit', receipt.id)}
																onBlur={() => setBulkEditCell({ column: null, receiptId: null })}
															>
																{bulkEditCell.column === 'result_unit' && bulkEditCell.receiptId === receipt.id ? (
																	<TinyMceInput
																		value={bulkEditValues.result_unit || ''}
																		onUpdate={(content) => handleBulkEditChange('result_unit', content)}
																		onBlur={() => setBulkEditCell({ column: null, receiptId: null })}
																	/>
																) : (
																	<div
																		dangerouslySetInnerHTML={{
																			__html: bulkEditValues.result_unit || 'Nhấp để chỉnh sửa...',
																		}}
																		className="overflow-hidden text-ellipsis whitespace-nowrap px-2"
																	/>
																)}
															</div>
														</div>

														{/* Technician field */}
														<div className="flex flex-col">
															<label className="mb-1 font-medium text-sm">Người thực hiện</label>
															<select
																className="p-2 border rounded-lg bg-white"
																value={bulkEditValues.technician_uid || ''}
																onChange={(e) => handleBulkEditChange('technician_uid', e.target.value)}
															>
																<option value="">-- Không thay đổi --</option>
																{technicians.map((tech) => (
																	<option key={tech.identity_uid} value={tech.identity_uid}>
																		{tech.identity_name}
																	</option>
																))}
															</select>
														</div>
													</div>

													{/* Table of selected analyses with preview */}
													<div className="mb-6 max-h-[300px] overflow-auto">
														<h3 className="text-md font-semibold mb-2">Xem trước thay đổi</h3>
														<table className="w-full border-collapse border border-gray-300">
															<thead className="bg-gray-100">
																<tr>
																	<th className="border p-1 text-start w-32 min-w-32">Mã mẫu</th>
																	<th className="border p-1 text-start w-1/5 min-w-40">Chỉ tiêu</th>
																	<th className="border p-1 text-start w-1/5 min-w-40">Phương pháp</th>
																	<th className="border p-1 text-start min-w-32">Kết quả</th>
																	<th className="border p-1 text-start min-w-28">Đơn vị</th>
																	<th className="border p-1 text-start w-24 min-w-24">Hạn trả</th>
																	<th className="border p-1 text-start w-32 min-w-32">KTV</th>
																	<th className="border p-1 text-start w-32 min-w-32">Tham chiếu</th>
																</tr>
															</thead>
															<tbody>
																{selectedCheckboxesByReceipt[receipt.id]?.map((analysisId) => {
																	// Find the analysis in the receipt data
																	let foundAnalysis = null;
																	let foundSample = null;

																	// Search through all samples to find the analysis
																	receipt.samples?.forEach((sample) => {
																		const analysis = sample.analysis?.find((a) => a.id === analysisId);
																		if (analysis) {
																			foundAnalysis = analysis;
																			foundSample = sample;
																		}
																	});

																	return foundAnalysis ? (
																		<tr key={analysisId} className="hover:bg-gray-50">
																			<td className="border p-1 text-start">{foundSample?.sample_uid}</td>
																			<td className="border p-1 text-start">{foundAnalysis.parameter_name}</td>
																			<td className="border p-1 text-start">
																				<span className="preview-protocol-source">
																					{bulkEditValues.protocol_source || foundAnalysis.protocol_source || '--'}
																				</span>
																				&nbsp;
																				<span className="preview-protocol-code">
																					{bulkEditValues.protocol_code || foundAnalysis.protocol_code || '--'}
																				</span>
																			</td>
																			<td className="border p-1 text-start">
																				<div
																					className="preview-result-value"
																					dangerouslySetInnerHTML={{
																						__html: bulkEditValues.result_value || foundAnalysis.result_value || '--',
																					}}
																				/>
																			</td>
																			<td className="border p-1 text-start">
																				<div
																					className="preview-result-unit"
																					dangerouslySetInnerHTML={{
																						__html: bulkEditValues.result_unit || foundAnalysis.result_unit || '--',
																					}}
																				/>
																			</td>
																			<td className="border p-1 text-start preview-deadline">
																				{bulkEditValues.deadline
																					? formatDate(bulkEditValues.deadline)
																					: foundAnalysis.deadline
																					? formatDate(foundAnalysis.deadline)
																					: '--'}
																			</td>
																			<td className="border p-1 text-start preview-technician">
																				{bulkEditValues.technician_uid
																					? getTechnicianName(bulkEditValues.technician_uid)
																					: getTechnicianName(foundAnalysis.technician_uid)}
																			</td>
																			<td className="border p-1 text-start preview-reference">
																				{bulkEditValues.reference || foundAnalysis.reference || '--'}
																			</td>
																		</tr>
																	) : null;
																})}
															</tbody>
														</table>
													</div>

													<div className="flex justify-end gap-3">
														<button
															className="px-2 py-1 border-2 border-gray-600 text-gray-600 rounded hover:bg-gray-400 w-fit"
															onClick={closeBulkEditForm}
														>
															Hủy bỏ
														</button>
														<button
															className="px-2 py-1 border-2 border-gray-600  rounded hover:bg-blue-600 flex items-center w-fit "
															onClick={() => {
																handleBulkUpdate(selectedCheckboxesByReceipt[receipt.id]);
																closeBulkEditForm();
															}}
														>
															Xác nhận
														</button>
													</div>
												</div>
											</div>
										)}

										{/* Organize by samples */}
										{receipt.samples && receipt.samples.length > 0 ? (
											receipt.samples.map((sample) => (
												<div key={sample.id} className="mb-4 border-l-2 border-teritary px-1 overflow-auto">
													<div className="  mb-2 flex justify-between items-center">
														<div className="flex flex-col gap-2">
															<div className="min-w-40">
																<span className="font-semibold">Mã mẫu:</span> {sample.sample_uid}
															</div>
															<div className="min-w-40">
																<span className="font-semibold">Tên mẫu:</span> {sample.sample_name || 'N/A'}
															</div>
															<div className="min-w-40">
																<span className="font-semibold">Nền mẫu:</span> {sample.matrix || 'N/A'}
															</div>

															{sample.additional_request && (
																<div className="mt-1 mb-2">
																	<span className="font-semibold">Yêu cầu khách hàng:</span> {sample.additional_request}
																</div>
															)}
														</div>
														{/* Add PKQ button in the opposite corner */}
														<button
															className="text-primary border-gray-300 bg-background text-sm rounded-lg p-1 w-fit self-end active:bg-sky-100 focus:outline-none"
															onClick={() => window.open(`/result?sample_uid=${sample?.sample_uid}`, '_blank')}
														>
															<div className="flex items-center justify-between">
																{'PKQ'} <GrDocumentText size={15} className="ml-1.5" />
															</div>
														</button>
													</div>

													{/* Analysis table for this sample */}
													{sample.analysis && sample.analysis.length > 0 ? (
														<table className="w-full border-collapse border border-gray-300">
															<thead>
																<tr className="bg-gray-100">
																	<th className="border p-1 text-start min-w-60 w-1/4">Chỉ tiêu</th>
																	<th className="border p-1 text-start min-w-60 w-1/4">Phương pháp</th>
																	<th className="border p-1 text-start min-w-40">Kết quả</th>
																	<th className="border p-1 text-start min-w-32">Đơn vị</th>
																	<th className="border p-1 text-start w-28 min-w-28">Hạn trả</th>
																	<th className="border p-1 text-start w-36 min-w-40">Người thực hiện</th>
																	<th className="border p-1 text-start min-w-32 w-36">Tham chiếu</th>
																	<th className="border p-1 text-center w-12 min-w-12">
																		<input
																			type="checkbox"
																			className="w-4 h-4 sample-checkbox"
																			data-receipt-id={receipt.id}
																			data-sample-id={sample.id}
																			checked={isSampleFullySelected(sample.id, sample.analysis)}
																			onChange={(e) =>
																				handleSampleCheckboxChange(e, receipt.id, sample.id, sample.analysis)
																			}
																		/>
																	</th>
																</tr>
															</thead>
															<tbody>
																{sample.analysis.map((item) => (
																	<tr
																		key={item.id}
																		className={`${
																			selectedCheckboxesV3.includes(item.id) ? 'bg-gray-100' : ''
																		} hover:bg-gray-50`}
																	>
																		<td className="border p-1 text-start">{item.parameter_name || 'N/A'}</td>
																		<td className="border p-1 text-start ">
																			<div className="flex items-center gap-0.5">
																				<select
																					className="min-w-24 max-w-fit p-1 py-0.5 max-h-fit font-semibold text-slate-500 bg-white border border-white hover:border-purple-500 rounded text-sm focus:outline-none text-left"
																					onChange={(e) => handleProtocolSourceChange(item.id, e.target.value)}
																					value={item.protocol_source || ''}
																				>
																					<option value="IRDOP">IRDOP</option>
																					<option value="IRDOP VS">IRDOP VS</option>
																					<option value="EX">EX</option>
																				</select>
																				<input
																					type="text"
																					className="w-full bg-white border border-white hover:border-purple-500 rounded  p-1 py-0 text-left"
																					placeholder="Mã phương pháp"
																					value={
																						editableCell.analysisId === item.id &&
																						editableCell.column === 'protocol_code'
																							? inputValue
																							: item.protocol_code || ''
																					}
																					onChange={(e) => handleProtocolCodeChange(item.id, e.target.value)}
																					onBlur={(e) => handleProtocolCodeBlur(item.id, e.target.value)}
																					onKeyDown={(e) => handleProtocolCodeKeyDown(e, item.id, e.target.value)}
																				/>
																			</div>
																		</td>
																		<td
																			className="border p-1 text-start"
																			onClick={() => handleCellClickV3(item.id, 'result_value', item.result_value)}
																		>
																			<div className="hover:border-purple-500 border rounded border-white cursor-pointer">
																				{editableCell.analysisId === item.id &&
																				editableCell.column === 'result_value' ? (
																					<TinyMceInput
																						value={inputValue}
																						onUpdate={(content) =>
																							handleSaveContentV3(content, 'result_value', item.id)
																						}
																						onKey={handleKeyDownV3}
																					/>
																				) : (
																					<div dangerouslySetInnerHTML={{ __html: `${item.result_value || '--'}` }} />
																				)}
																			</div>
																		</td>
																		<td
																			className="border p-1 text-start"
																			onClick={() => handleCellClickV3(item.id, 'result_unit', item.result_unit)}
																		>
																			<div className="hover:border-purple-500 border rounded border-white cursor-pointer">
																				{editableCell.analysisId === item.id &&
																				editableCell.column === 'result_unit' ? (
																					<TinyMceInput
																						value={inputValue}
																						onUpdate={(content) => handleSaveContentV3(content, 'result_unit', item.id)}
																						onKey={handleKeyDownV3}
																					/>
																				) : (
																					<div dangerouslySetInnerHTML={{ __html: `${item.result_unit || '--'}` }} />
																				)}
																			</div>
																		</td>
																		<td className="border p-1 text-start">
																			{item.deadline ? formatDate(item.deadline) : 'N/A'}
																		</td>
																		<td className="border p-1 text-start">
																			<div className="relative">
																				<button
																					className="font-normal text-start p-1 py-0 w-full dropdown-button rounded"
																					onClick={(e) => toggleTechnicianDropdown(item.id, e)}
																				>
																					{getTechnicianName(item.technician_uid)}
																				</button>
																				{technicianDropdownVisible === item.id &&
																					createPortal(
																						<ul
																							className="fixed bg-white border rounded shadow-lg z-[99]"
																							style={{
																								top: dropdownPosition.top + 'px',
																								left: dropdownPosition.left + 'px',
																								position: 'absolute',
																								maxHeight: '200px',
																								overflowY: 'auto',
																								minWidth: '200px',
																							}}
																						>
																							{technicians.map((identity) => (
																								<li
																									key={identity.identity_uid}
																									className="p-1 cursor-pointer hover:bg-gray-200 dropdown-item"
																									onClick={() => handleTechnicianChange(item.id, identity.identity_uid)}
																								>
																									<p className="font-bold text-primary text-sm">
																										{identity.alias || ''}
																									</p>
																									<p>{identity.identity_name || ''}</p>
																								</li>
																							))}
																						</ul>,
																						document.body,
																					)}
																			</div>
																		</td>
																		<td className="border p-1 text-start">
																			<input
																				type="text"
																				className=" bg-white w-full border hover:border-purple-500 rounded p-1 py-0 text-left"
																				value={item.reference || ''}
																				onChange={(e) => handleReferenceChange(item.id, e.target.value)}
																				onKeyDown={(e) => handleReferenceKeyDown(e, item.id, e.target.value)}
																				onBlur={(e) => handleReferenceBlur(e, item.id, e.target.value)}
																			/>
																		</td>
																		<td className="border p-1 text-center">
																			<input
																				type="checkbox"
																				className="w-4 h-4 row-checkbox"
																				data-receipt-id={receipt.id}
																				data-analysis-id={item.id}
																				data-sample-id={sample.id}
																				checked={selectedCheckboxesV3.includes(item.id)}
																				onChange={(e) => handleAnalysisCheckboxChange(e, receipt.id, item.id)}
																			/>
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													) : (
														<p className="text-gray-500">Không có dữ liệu phân tích cho mẫu này</p>
													)}
												</div>
											))
										) : (
											<p className="text-gray-500">Không có dữ liệu mẫu</p>
										)}
									</div>
								))
						) : (
							<div className="w-full text-center py-4 text-gray-500">Không có dữ liệu tiếp nhận mẫu</div>
						)}
						{/* Add "Xem thêm" button */}
						{!showAllReceipts &&
							Array.isArray(filteredProcessingSample) &&
							filteredProcessingSample.length > displayCount && (
								<div className="w-full text-center py-4">
									<button
										className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
										onClick={() => setShowAllReceipts(true)}
									>
										Xem thêm
									</button>
								</div>
							)}
					</div>
				</div>
			</div>

			{/* Global Bulk Edit Modal */}
			{showGlobalBulkEditForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
					<div className="bg-white p-6 rounded-lg shadow-lg min-w-[400px] w-5/6">
						<h2 className="text-xl font-bold mb-4 flex justify-between items-center">
							<span>Chỉnh sửa hàng loạt</span>
							<span className="text-sm font-normal text-gray-600">
								({selectedCheckboxesV3.length} chỉ tiêu được chọn)
							</span>
						</h2>

						{/* Form with labels on top */}
						<div className="grid grid-cols-3 gap-4 mb-6">
							{/* Combined Protocol source and code fields */}
							<div className="flex flex-col">
								<label className="mb-1 font-medium text-sm">Phương pháp thử</label>
								<div className="flex gap-1">
									<select
										className="p-2 border rounded-lg bg-white w-1/3"
										value={bulkEditValues.protocol_source || ''}
										onChange={(e) => handleBulkEditChange('protocol_source', e.target.value)}
									>
										<option value="">--</option>
										<option value="IRDOP">IRDOP</option>
										<option value="IRDOP VS">IRDOP VS</option>
										<option value="EX">EX</option>
									</select>
									<input
										type="text"
										className="p-2 border rounded-lg bg-white w-2/3"
										placeholder="Nhập mã phương pháp"
										value={bulkEditValues.protocol_code || ''}
										onChange={(e) => handleBulkEditChange('protocol_code', e.target.value)}
									/>
								</div>
							</div>

							{/* Reference field */}
							<div className="flex flex-col">
								<label className="mb-1 font-medium text-sm">Tham chiếu</label>
								<input
									type="text"
									className="p-2 border rounded-lg bg-white"
									placeholder="Nhập tham chiếu"
									value={bulkEditValues.reference || ''}
									onChange={(e) => handleBulkEditChange('reference', e.target.value)}
								/>
							</div>

							{/* Deadline field */}
							<div className="flex flex-col">
								<label className="mb-1 font-medium text-sm">Hạn trả</label>
								<input
									type="datetime-local"
									className="p-2 border rounded-lg bg-white"
									value={bulkEditValues.deadline || ''}
									onChange={(e) => handleBulkEditChange('deadline', e.target.value)}
								/>
							</div>

							{/* Result value field */}
							<div className="flex flex-col">
								<label className="mb-1 font-medium text-sm">Kết quả</label>
								<div
									className="h-10 flex items-center border rounded-lg bg-white hover:border-purple-500 cursor-text"
									onClick={() => handleBulkEditCellClick('result_value', 'global')}
									onBlur={() => setBulkEditCell({ column: null, receiptId: null })}
								>
									{bulkEditCell.column === 'result_value' && bulkEditCell.receiptId === 'global' ? (
										<TinyMceInput
											value={bulkEditValues.result_value || ''}
											onUpdate={(content) => handleBulkEditChange('result_value', content)}
										/>
									) : (
										<div
											dangerouslySetInnerHTML={{
												__html: bulkEditValues.result_value || 'Nhấp để chỉnh sửa...',
											}}
											className="overflow-hidden text-ellipsis whitespace-nowrap px-2"
										/>
									)}
								</div>
							</div>

							{/* Result unit field */}
							<div className="flex flex-col">
								<label className="mb-1 font-medium text-sm">Đơn vị</label>
								<div
									className="h-10 flex items-center border rounded-lg bg-white hover:border-purple-500 cursor-text"
									onClick={() => handleBulkEditCellClick('result_unit', 'global')}
									onBlur={() => setBulkEditCell({ column: null, receiptId: null })}
								>
									{bulkEditCell.column === 'result_unit' && bulkEditCell.receiptId === 'global' ? (
										<TinyMceInput
											value={bulkEditValues.result_unit || ''}
											onUpdate={(content) => handleBulkEditChange('result_unit', content)}
											onBlur={() => setBulkEditCell({ column: null, receiptId: null })}
										/>
									) : (
										<div
											dangerouslySetInnerHTML={{
												__html: bulkEditValues.result_unit || 'Nhấp để chỉnh sửa...',
											}}
											className="overflow-hidden text-ellipsis whitespace-nowrap px-2"
										/>
									)}
								</div>
							</div>

							{/* Technician field */}
							<div className="flex flex-col">
								<label className="mb-1 font-medium text-sm">Người thực hiện</label>
								<select
									className="p-2 border rounded-lg bg-white"
									value={bulkEditValues.technician_uid || ''}
									onChange={(e) => handleBulkEditChange('technician_uid', e.target.value)}
								>
									<option value="">-- Không thay đổi --</option>
									{technicians.map((tech) => (
										<option key={tech.identity_uid} value={tech.identity_uid}>
											{tech.identity_name}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Show count of selected items from each receipt */}
						<div className="mb-6">
							<h3 className="text-md font-semibold mb-2">Tổng quan các mục đã chọn</h3>
							<div className="max-h-[300px] overflow-auto border rounded p-3">
								{Object.keys(selectedCheckboxesByReceipt).length > 0 ? (
									<div className="grid grid-cols-3 gap-3">
										{Object.entries(selectedCheckboxesByReceipt).map(([receiptId, analysisIds]) => {
											// Find receipt from data
											const receipt = filteredProcessingSample?.find((r) => r.id === parseInt(receiptId));
											return (
												<div key={receiptId} className="border rounded p-2 bg-gray-50">
													<div className="font-medium">{receipt?.receipt_uid || `Phiếu ${receiptId}`}</div>
													<div>{analysisIds.length} chỉ tiêu được chọn</div>
												</div>
											);
										})}
									</div>
								) : (
									<div className="text-gray-500 italic">Không có chỉ tiêu nào được chọn</div>
								)}
							</div>
						</div>

						{/* Preview table showing all selected analyses */}
						<div className="mb-6 max-h-[300px] overflow-auto">
							<h3 className="text-md font-semibold mb-2">Xem trước thay đổi</h3>
							<table className="w-full border-collapse border border-gray-300">
								<thead className="bg-gray-100">
									<tr>
										<th className="border p-1 text-start w-32 min-w-32">Mã TNM</th>
										<th className="border p-1 text-start w-32 min-w-32">Mã mẫu</th>
										<th className="border p-1 text-start w-1/5 min-w-40">Chỉ tiêu</th>
										<th className="border p-1 text-start w-1/5 min-w-40">Phương pháp</th>
										<th className="border p-1 text-start min-w-32">Kết quả</th>
										<th className="border p-1 text-start min-w-28">Đơn vị</th>
										<th className="border p-1 text-start w-24 min-w-24">Hạn trả</th>
										<th className="border p-1 text-start w-32 min-w-32">KTV</th>
										<th className="border p-1 text-start w-32 min-w-32">Tham chiếu</th>
									</tr>
								</thead>
								<tbody>
									{selectedCheckboxesV3.map((analysisId) => {
										// Find the analysis, sample, and receipt in the data
										let foundAnalysis = null;
										let foundSample = null;
										let foundReceipt = null;

										// Search through all receipts and samples
										filteredProcessingSample?.forEach((receipt) => {
											receipt.samples?.forEach((sample) => {
												const analysis = sample.analysis?.find((a) => a.id === analysisId);
												if (analysis) {
													foundAnalysis = analysis;
													foundSample = sample;
													foundReceipt = receipt;
												}
											});
										});

										return foundAnalysis ? (
											<tr key={analysisId} className="hover:bg-gray-50">
												<td className="border p-1 text-start">{foundReceipt?.receipt_uid}</td>
												<td className="border p-1 text-start">{foundSample?.sample_uid}</td>
												<td className="border p-1 text-start">{foundAnalysis.parameter_name}</td>
												<td className="border p-1 text-start">
													<span className="preview-protocol-source">
														{bulkEditValues.protocol_source || foundAnalysis.protocol_source || '--'}
													</span>
													&nbsp;
													<span className="preview-protocol-code">
														{bulkEditValues.protocol_code || foundAnalysis.protocol_code || '--'}
													</span>
												</td>
												<td className="border p-1 text-start">
													<div
														className="preview-result-value"
														dangerouslySetInnerHTML={{
															__html: bulkEditValues.result_value || foundAnalysis.result_value || '--',
														}}
													/>
												</td>
												<td className="border p-1 text-start">
													<div
														className="preview-result-unit"
														dangerouslySetInnerHTML={{
															__html: bulkEditValues.result_unit || foundAnalysis.result_unit || '--',
														}}
													/>
												</td>
												<td className="border p-1 text-start preview-deadline">
													{bulkEditValues.deadline
														? formatDate(bulkEditValues.deadline)
														: foundAnalysis.deadline
														? formatDate(foundAnalysis.deadline)
														: '--'}
												</td>
												<td className="border p-1 text-start preview-technician">
													{bulkEditValues.technician_uid
														? getTechnicianName(bulkEditValues.technician_uid)
														: getTechnicianName(foundAnalysis.technician_uid)}
												</td>
												<td className="border p-1 text-start preview-reference">
													{bulkEditValues.reference || foundAnalysis.reference || '--'}
												</td>
											</tr>
										) : null;
									})}
								</tbody>
							</table>
						</div>

						<div className="flex justify-end gap-3">
							<button
								className="px-4 py-2 border-2 border-gray-600 text-gray-600 rounded hover:bg-gray-400"
								onClick={() => {
									setShowGlobalBulkEditForm(false);
									setBulkEditValues({});
									setBulkEditCell({ column: null, receiptId: null });
								}}
							>
								Hủy bỏ
							</button>
							<button
								className="px-4 py-2 border-2 border-blue-600 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
								onClick={() => {
									handleBulkUpdate(selectedCheckboxesV3);
									setShowGlobalBulkEditForm(false);
								}}
							>
								<FaSave className="mr-2" /> Xác nhận cập nhật
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProcessingSample;
