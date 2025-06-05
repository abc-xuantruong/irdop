import React, { useState, useContext, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiPost, apiGet } from '../contexts/helperFunctionCallAPI';
import axios from 'axios';
import TinyMceInput from './Input';
import { toast, ToastContainer } from 'react-toastify';
import { FaUpload, FaEye, FaDownload, FaEdit, FaCheck, FaSave, FaTrashAlt } from 'react-icons/fa';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

const ProcessingSampleMachine = () => {
	const { setCurrentTitlePage, technicians, formatDate } = useContext(GlobalContext);
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const location = useLocation();
	// Function to get view mode from URL query parameter
	const getViewModeFromURL = () => {
		const viewParam = searchParams.get('view');
		if (viewParam === 'analysis') return 'indicators';
		if (viewParam === 'protocol') return 'methods';
		if (viewParam === 'file') return 'files';
		return 'indicators'; // Default to indicators view
	};

	// Function to get search query from URL parameter
	const getSearchQueryFromURL = () => {
		return searchParams.get('search') || '';
	};

	// View mode state
	const [viewMode, setViewMode] = useState(getViewModeFromURL()); // 'indicators', 'methods', 'files'
	// File upload related states
	const [showFileUploadModal, setShowFileUploadModal] = useState(false);
	const [showSendFileForm, setShowSendFileForm] = useState(false); // New state for Send File form
	const [files, setFiles] = useState([]);
	const [uploadedFiles, setUploadedFiles] = useState([]);
	const [bulkDescription, setBulkDescription] = useState('');
	// Removed bulkSampleTest state since we're auto-generating foreignKeys
	const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
	const [selectedMachine, setSelectedMachine] = useState('');
	const [existingFiles, setExistingFiles] = useState([]);
	const [groupedFiles, setGroupedFiles] = useState({});
	const [uploadType, setUploadType] = useState(''); // Track which upload type was selected
	const fileInputRef = useRef(null);
	// AAS processing data states
	const [aasData, setAasData] = useState([]);
	const [filteredAasData, setFilteredAasData] = useState([]);
	const [editableCell, setEditableCell] = useState({ analysisId: null, column: null });
	const [inputValue, setInputValue] = useState('');
	// Search state variables similar to ProcessingSampleV3
	const [searchTerm, setSearchTerm] = useState('');
	const [sampleSearchTerm, setSampleSearchTerm] = useState('');
	const [parameterSearchTerm, setParameterSearchTerm] = useState('');
	const [showCategoryDropdown, setShowCategoryDropdown] = useState(false); // Add state for category dropdown visibility
	const [selectedHeaderCategories, setSelectedHeaderCategories] = useState([]); // Add state for header category selection

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [showAllReceipts, setShowAllReceipts] = useState(false);
	const receiptsPerPage = 30;

	// Protocol/Methods related states
	const [protocols, setProtocols] = useState([]);
	const [editingProtocol, setEditingProtocol] = useState(null);
	const [protocolInputValue, setProtocolInputValue] = useState('');
	const [editingProtocolCell, setEditingProtocolCell] = useState({ protocolId: null, column: null });
	const [isAddingNewProtocol, setIsAddingNewProtocol] = useState(false);
	const [newProtocol, setNewProtocol] = useState({
		protocol_name: '',
		protocol_code: '',
		protocol_description: '',
		protocol_source: 'IRDOP',
		equipment: [],
	});
	const [sourceOptions] = useState(['IRDOP', 'IRDOP VS', 'EX']);
	const [equipmentOptions, setEquipmentOptions] = useState([]);
	// File-related states for files view
	const [selectedSource, setSelectedSource] = useState('irdop');
	const [fileSearchQuery, setFileSearchQuery] = useState(getSearchQueryFromURL());
	const [currentFilePage, setCurrentFilePage] = useState(1);
	const [filesPerPage] = useState(30);
	const [fileFilters, setFileFilters] = useState({
		fileName: '',
		description: '',
		categories: [],
		uploadedByUID: '',
		createdByUID: '',
	});
	const [showFileFilters, setShowFileFilters] = useState({
		fileName: false,
		description: false,
		categories: false,
		uploadedByUID: false,
		createdByUID: false,
	});
	// Bulk update related states
	const [selectedCheckboxesV3, setSelectedCheckboxesV3] = useState([]); // Selected analysis IDs
	const [selectedCheckboxesByReceipt, setSelectedCheckboxesByReceipt] = useState({}); // Track checkboxes by receipt ID
	const [bulkEditValues, setBulkEditValues] = useState({}); // Bulk edit form values
	const [bulkEditCell, setBulkEditCell] = useState({ column: null, receiptId: null }); // Track which bulk edit cell is being edited
	const [showGlobalBulkEditForm, setShowGlobalBulkEditForm] = useState(false); // Global bulk edit form visibility	// Effect to update viewMode when URL changes
	React.useEffect(() => {
		const newViewMode = getViewModeFromURL();
		if (newViewMode !== viewMode) {
			setViewMode(newViewMode);
		}

		// Update file search query from URL when view changes to files
		if (newViewMode === 'files') {
			const newSearchQuery = getSearchQueryFromURL();
			setFileSearchQuery(newSearchQuery);
		}
	}, [searchParams]);

	React.useEffect(() => {
		setCurrentTitlePage('Máy AAS');

		if (viewMode === 'files') {
			fetchExistingFiles(fileSearchQuery, selectedSource);
		} else {
			fetchExistingFiles();
		}

		if (viewMode === 'indicators') {
			fetchAasData();
		} else if (viewMode === 'methods') {
			fetchProtocols();
			fetchEquipmentOptions();
		}
	}, [setCurrentTitlePage, viewMode]);
	// Function to fetch AAS data for indicators view
	const fetchAasData = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/to82oe92i/db/get/processing_sample/aas');
			if (response.status === 200) {
				const data = Array.isArray(response?.data) ? response.data : [];
				setAasData(data);
				// Don't set filteredAasData here, let the useEffect handle it
			} else {
				console.error('Failed to fetch AAS data:', response.data?.message || 'Unknown error');
				toast.error(`Lỗi khi tải dữ liệu AAS: ${response.data?.message || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error fetching AAS data:', error);
			toast.error('Lỗi kết nối khi tải dữ liệu AAS');
		}
	};

	// Bulk update handler functions
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

	// Handle bulk edit value changes
	const handleBulkEditChange = (field, value) => {
		setBulkEditValues((prev) => ({ ...prev, [field]: value }));
	};

	const handleKeyDownV3 = (e) => {
		if (e.key === 'Enter') {
			setEditableCell({ analysisId: null, column: null });
		}
	};

	// Handle bulk edit cell click for TinyMCE
	const handleBulkEditCellClick = (column, receiptId) => {
		setBulkEditCell({ column, receiptId });
	};
	// Handle bulk update submission
	const handleBulkUpdate = async (selectedRows) => {
		try {
			const updatePromises = selectedCheckboxesV3.map((rowId) => {
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

			// Update the local AAS data to reflect changes
			const updateBothDatasets = (prevData) => {
				return prevData.map((receipt) => {
					return {
						...receipt,
						samples: receipt.samples?.map((sample) => {
							return {
								...sample,
								analysis: sample.analysis?.map((analysis) => {
									if (selectedCheckboxesV3.includes(analysis.id)) {
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
			setAasData(updateBothDatasets);
			setFilteredAasData(updateBothDatasets);

			// Clear all checkboxes after update
			document.querySelectorAll('.row-checkbox').forEach((checkbox) => {
				checkbox.checked = false;
			});

			// Clear selectedCheckboxesV3 and selectedCheckboxesByReceipt
			setSelectedCheckboxesV3([]);
			setSelectedCheckboxesByReceipt({});

			// Reset bulk edit values and close modal
			setBulkEditValues({});
			setBulkEditCell({ column: null, receiptId: null });
			setShowGlobalBulkEditForm(false);
			setUploadedFiles([]); // Clear uploaded files after successful update
		} catch (error) {
			console.error('Error during bulk update:', error);
			toast.error('Lỗi khi cập nhật hàng loạt');
		}
	}; // Function to fetch existing files from API
	const fetchExistingFiles = async (query = '', source = '') => {
		try {
			const searchSource = source || selectedSource;
			const payload = { source: searchSource };

			// Add query parameter if provided
			if (query && query.trim() !== '') {
				payload.query = query.trim();
			}

			const response = await apiPost('https://red.irdop.org/v1/file/get_list', payload);
			if (response.status === 200) {
				const data = response.data;
				setExistingFiles(data);

				// Group files by fileGroupUID
				const grouped = data.reduce((acc, file) => {
					const groupId = file.fileGroupUID || 'no-group';
					if (!acc[groupId]) {
						acc[groupId] = [];
					}
					acc[groupId].push(file);
					return acc;
				}, {});

				setGroupedFiles(grouped);
			} else {
				console.error('Failed to fetch files:', response.data?.message || 'Unknown error');
				toast.error(`Lỗi khi tải danh sách file: ${response.data?.message || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error fetching files:', error);
			toast.error('Lỗi kết nối khi tải danh sách file');
		}
	}; // Function to handle drag and drop
	const handleFileDrop = (e) => {
		e.preventDefault();
		e.stopPropagation();
		const droppedFiles = Array.from(e.dataTransfer.files);
		setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
	};

	// Function to handle file selection via file input
	const handleFileChange = (e) => {
		const selectedFiles = Array.from(e.target.files);
		setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
	};
	// Function to handle drag and drop in Send File form
	const handleSendFileFileDrop = async (e, uploadTypeParam) => {
		e.preventDefault();
		e.stopPropagation();
		const droppedFiles = Array.from(e.dataTransfer.files);
		await handleSendFileUpload(droppedFiles, uploadTypeParam);
	};

	// Function to handle file selection in Send File form
	const handleSendFileChange = async (e, uploadTypeParam) => {
		const selectedFiles = Array.from(e.target.files);
		await handleSendFileUpload(selectedFiles, uploadTypeParam);
	};

	// Function to handle file upload in Send File form
	const handleSendFileUpload = async (filesToUpload, uploadTypeParam) => {
		if (filesToUpload.length === 0) {
			toast.error('Không có file nào được chọn');
			return;
		}

		try {
			const uploadResults = []; // Store results for each file

			// Process each file
			for (const file of filesToUpload) {
				// First get the upload link using apiPost
				const linkResponse = await apiPost('https://red.irdop.org/v1/file/uplink/lab/activities');

				if (linkResponse.status !== 200) {
					throw new Error(`Failed to get upload link: ${linkResponse.data?.message || 'Unknown error'}`);
				}

				const uploadInfo = linkResponse.data;
				console.log('Received upload info:', uploadInfo);

				if (!uploadInfo || !uploadInfo.url) {
					throw new Error('Không nhận được URL upload từ API');
				}

				// Convert file to buffer for upload
				const fileBuffer = await file.arrayBuffer();

				// Upload using axios.put with only fileBuffer and Content-Type header
				const uploadResponse = await axios.put(uploadInfo.url, fileBuffer, {
					headers: {
						'Content-Type': file.type || 'application/octet-stream',
					},
				});

				if (uploadResponse.status !== 200) {
					throw new Error(`Failed to upload file: ${uploadResponse.data?.message || 'Unknown error'}`);
				}

				// Automatically assign category based on uploadType
				let categoryArray = [];
				if (uploadTypeParam === 'RawDataPreparedReport') {
					categoryArray = ['RawData', 'PreparedReport'];
				} else if (uploadTypeParam) {
					categoryArray = [uploadTypeParam];
				} else if (selectedMachine) {
					// Fallback to RawData if no uploadType is set
					categoryArray = ['RawData'];
				}

				uploadResults.push({
					fileInfo: {
						fileName: file.name,
						fileSize: file.size,
						fileType: file.type,
					},
					...linkResponse.data, // Spread all key-value pairs from linkResponse.data
					fileCategory: categoryArray, // Categories based on upload type
					uploadDescription: bulkDescription || '', // Use bulk description if available
					createdbyUID: selectedMachine || '', // Machine selection
				});

				toast.success(`Đã tải lên thành công: ${file.name}`);
			}

			// Store uploaded files with their upload info - append to existing files
			setUploadedFiles((prevFiles) => [...prevFiles, ...uploadResults]);
		} catch (error) {
			console.error('Error uploading files:', error);
			toast.error(`Lỗi khi tải lên: ${error.message}`);
		}
	};
	// Function to delete a file from the upload list
	const handleUploadFileDelete = (fileName) => {
		setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
	};

	// Function to cancel upload
	const handleCancelUpload = () => {
		setFiles([]);
		setShowFileUploadModal(false);
		setUploadType(''); // Reset upload type when cancelling
	};

	// Function to confirm upload
	const handleConfirmUpload = async () => {
		if (files.length === 0) {
			toast.error('Không có file nào được chọn');
			return;
		}

		try {
			const uploadResults = []; // Store results for each file

			// Process each file
			for (const file of files) {
				// First get the upload link using apiPost
				const linkResponse = await apiPost('https://red.irdop.org/v1/file/uplink/lab/activities');

				if (linkResponse.status !== 200) {
					throw new Error(`Failed to get upload link: ${linkResponse.data?.message || 'Unknown error'}`);
				}

				const uploadInfo = linkResponse.data;
				console.log('Received upload info:', uploadInfo);

				if (!uploadInfo || !uploadInfo.url) {
					throw new Error('Không nhận được URL upload từ API');
				}

				// Convert file to buffer for upload
				const fileBuffer = await file.arrayBuffer();

				// Upload using axios.put with only fileBuffer and Content-Type header
				const uploadResponse = await axios.put(uploadInfo.url, fileBuffer, {
					headers: {
						'Content-Type': file.type || 'application/octet-stream',
					},
				});

				if (uploadResponse.status !== 200) {
					throw new Error(`Failed to upload file: ${uploadResponse.data?.message || 'Unknown error'}`);
				}

				// Automatically assign category based on uploadType
				let categoryArray = [];
				if (uploadType) {
					categoryArray = [uploadType];
				} else if (selectedMachine) {
					// Fallback to RawData if no uploadType is set
					categoryArray = ['RawData'];
				}
				uploadResults.push({
					fileInfo: {
						fileName: file.name,
						fileSize: file.size,
						fileType: file.type,
					},
					...linkResponse.data, // Spread all key-value pairs from linkResponse.data
					fileCategory: categoryArray, // Categories based on upload type
					uploadDescription: bulkDescription || '', // Use bulk description if available
					createdbyUID: selectedMachine || '', // Machine selection
				});

				toast.success(`Đã tải lên thành công: ${file.name}`);
			}

			// Store uploaded files with their upload info - append to existing files
			setUploadedFiles((prevFiles) => [...prevFiles, ...uploadResults]);

			// Clear the files list and close the modal
			setFiles([]);
			setShowFileUploadModal(false);
			setUploadType(''); // Reset upload type after successful upload
		} catch (error) {
			console.error('Error uploading files:', error);
			toast.error(`Lỗi khi tải lên: ${error.message}`);
		}
	}; // Function to handle uploaded file edits
	const handleUploadedFileEdit = (index, field, value) => {
		setUploadedFiles((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], [field]: value };

			// Log the edited object
			console.log('Uploaded file edited:', updated[index]);
			return updated;
		});
	};

	// Function to handle uploaded file delete
	const handleUploadedFileDelete = (index) => {
		setUploadedFiles((prev) => {
			const updated = [...prev];
			const deletedFile = updated[index];
			console.log('Uploaded file deleted:', deletedFile);
			updated.splice(index, 1);
			return updated;
		});
	};
	// Function to handle bulk description update
	const handleBulkDescriptionChange = (value) => {
		setBulkDescription(value);
		// Update all uploaded files with the new description
		setUploadedFiles((prev) => {
			const updated = prev.map((fileInfo) => ({
				...fileInfo,
				uploadDescription: value,
			}));
			return updated;
		});
	};
	// No longer needed since we're auto-generating foreignKeys	// Function to handle checkbox-based category selection
	const handleCategoryCheckboxChange = (fileIndex, category, isChecked) => {
		setUploadedFiles((prev) => {
			const updated = [...prev];
			const currentCategories = updated[fileIndex].fileCategory || [];

			if (isChecked) {
				// Add category if not already present
				if (!currentCategories.includes(category)) {
					updated[fileIndex] = {
						...updated[fileIndex],
						fileCategory: [...currentCategories, category],
					};
				}
			} else {
				// Remove category
				updated[fileIndex] = {
					...updated[fileIndex],
					fileCategory: currentCategories.filter((cat) => cat !== category),
				};
			}

			// Log the edited object
			console.log('Uploaded file edited:', updated[fileIndex]);
			return updated;
		});
	};

	// Function to toggle category dropdown
	const toggleCategoryDropdown = () => {
		setShowCategoryDropdown(!showCategoryDropdown);
	};

	// Function to handle header category selection (bulk select all files)
	const handleHeaderCategoryChange = (category, isChecked) => {
		const categoryValue = category.replace(/\s+/g, '');

		if (isChecked) {
			setSelectedHeaderCategories((prev) => [...prev, category]);
			// Apply to all uploaded files
			setUploadedFiles((prev) => {
				return prev.map((fileInfo) => {
					const currentCategories = fileInfo.fileCategory || [];
					if (!currentCategories.includes(categoryValue)) {
						return {
							...fileInfo,
							fileCategory: [...currentCategories, categoryValue],
						};
					}
					return fileInfo;
				});
			});
		} else {
			setSelectedHeaderCategories((prev) => prev.filter((cat) => cat !== category));
			// Remove from all uploaded files
			setUploadedFiles((prev) => {
				return prev.map((fileInfo) => {
					const currentCategories = fileInfo.fileCategory || [];
					return {
						...fileInfo,
						fileCategory: currentCategories.filter((cat) => cat !== categoryValue),
					};
				});
			});
		}
	};
	// Function to handle final confirmation with foreign keys
	const handleFinalConfirmation = async () => {
		if (uploadedFiles.length === 0) {
			toast.error('Không có file nào để xác nhận');
			return;
		}

		try {
			for (const uploadedFile of uploadedFiles) {
				// Generate foreign keys automatically from selected analyses
				const foreignKeys = [];

				// Extract sample and receipt UIDs from selected analyses
				if (selectedCheckboxesV3.length > 0) {
					// Create a map to track unique sample/receipt combinations
					const uniqueIdentifiers = new Set();

					filteredAasData?.forEach((receipt) => {
						receipt.samples?.forEach((sample) => {
							sample.analysis?.forEach((analysis) => {
								if (selectedCheckboxesV3.includes(analysis.id)) {
									// Add sample_uid to the foreign keys if not already added
									if (!uniqueIdentifiers.has(sample.sample_uid)) {
										uniqueIdentifiers.add(sample.sample_uid);
										foreignKeys.push(sample.sample_uid);
									}
								}
							});
						});
					});
				}

				const fileWithForeignKeys = {
					...uploadedFile,
					foreignKeys: foreignKeys, // Auto-generated foreign keys from selected analyses
				};

				// Send to upload complete API
				const s3Response = await apiPost('https://red.irdop.org/v1/file/uplink/upload_complete', fileWithForeignKeys);

				if (s3Response.status !== 200) {
					console.warn(`Failed to send upload complete for file: ${uploadedFile.fileInfo.fileName}`);
				}
			}

			toast.success(`Đã xác nhận ${uploadedFiles.length} file thành công`);
			setUploadedFiles([]);
		} catch (error) {
			console.error('Error confirming uploads:', error);
			toast.error(`Lỗi khi xác nhận: ${error.message}`);
		}
	}; // Function to handle machine selection change
	const handleMachineSelectionChange = (machineValue) => {
		setSelectedMachine(machineValue);

		// Only update machine type, don't change file categories
		if (uploadedFiles.length > 0) {
			setUploadedFiles((prev) => {
				return prev.map((fileInfo) => ({
					...fileInfo,
					createdbyUID: machineValue,
				}));
			});
		}
	};
	// Functions for AAS data handling
	const handleCellClick = (analysisId, column, currentValue) => {
		setEditableCell({ analysisId, column });
		setInputValue(currentValue || '');
	};

	const handleInputChange = (e) => {
		setInputValue(e.target.value);
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			handleSaveContent();
		} else if (e.key === 'Escape') {
			setEditableCell({ analysisId: null, column: null });
			setInputValue('');
		}
	};
	const handleSaveContent = async () => {
		if (!editableCell.analysisId || !editableCell.column) return;

		try {
			const payload = {
				id: editableCell.analysisId,
				[editableCell.column]: inputValue,
			};

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', { analysis: payload });

			if (response.status === 200) {
				// Update the local data
				setAasData((prev) =>
					prev.map((receipt) => ({
						...receipt,
						samples: receipt.samples?.map((sample) => ({
							...sample,
							analysis: sample.analysis?.map((analysis) =>
								analysis.id === editableCell.analysisId ? { ...analysis, [editableCell.column]: inputValue } : analysis,
							),
						})),
					})),
				);

				setFilteredAasData((prev) =>
					prev.map((receipt) => ({
						...receipt,
						samples: receipt.samples?.map((sample) => ({
							...sample,
							analysis: sample.analysis?.map((analysis) =>
								analysis.id === editableCell.analysisId ? { ...analysis, [editableCell.column]: inputValue } : analysis,
							),
						})),
					})),
				);

				toast.success('Cập nhật thành công');
			} else {
				toast.error('Lỗi khi cập nhật');
			}
		} catch (error) {
			console.error('Error updating analysis:', error);
			toast.error('Lỗi khi cập nhật');
		}
		setEditableCell({ analysisId: null, column: null });
		setInputValue('');
	};

	// TinyMCE handlers for result fields
	const handleCellClickV3 = (analysisId, column, currentValue) => {
		setEditableCell({ analysisId, column });
		setInputValue(currentValue || '');
	};

	const handleSaveContentV3 = async (content, column, analysisId) => {
		try {
			const payload = {
				id: analysisId,
				[column]: content,
			};

			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', { analysis: payload });

			if (response.status === 200) {
				// Update the local data
				setAasData((prev) =>
					prev.map((receipt) => ({
						...receipt,
						samples: receipt.samples?.map((sample) => ({
							...sample,
							analysis: sample.analysis?.map((analysis) =>
								analysis.id === analysisId ? { ...analysis, [column]: content } : analysis,
							),
						})),
					})),
				);

				setFilteredAasData((prev) =>
					prev.map((receipt) => ({
						...receipt,
						samples: receipt.samples?.map((sample) => ({
							...sample,
							analysis: sample.analysis?.map((analysis) =>
								analysis.id === analysisId ? { ...analysis, [column]: content } : analysis,
							),
						})),
					})),
				);

				toast.success('Cập nhật thành công');
			} else {
				toast.error('Lỗi khi cập nhật');
			}
		} catch (error) {
			console.error('Error updating analysis:', error);
			toast.error('Lỗi khi cập nhật');
		}

		setEditableCell({ analysisId: null, column: null });
		setInputValue('');
	};

	const getTechnicianName = (technician_uid) => {
		const technician = technicians.find((tech) => tech.identity_uid === technician_uid);
		return technician ? technician.identity_name : '';
	};

	// Protocol/Methods related functions
	const fetchProtocols = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/el9k24zah/db/get/protocol');
			if (response.status === 200) {
				const data = response.data.map((protocol) => {
					// Process equipment if it exists
					let equipment = [];
					if (protocol.equipment) {
						try {
							if (typeof protocol.equipment === 'string') {
								const parsedEquipment = JSON.parse(protocol.equipment);
								if (Array.isArray(parsedEquipment)) {
									equipment = parsedEquipment.map((eq) => {
										if (typeof eq === 'object' && eq.name) {
											return eq.name;
										}
										return eq;
									});
								}
							} else if (Array.isArray(protocol.equipment)) {
								equipment = protocol.equipment.map((eq) => {
									if (typeof eq === 'object' && eq.name) {
										return eq.name;
									}
									return eq;
								});
							}
						} catch (e) {
							console.error('Error parsing equipment:', e);
						}
					}
					return {
						...protocol,
						protocol_source: protocol.protocol_source || '',
						equipment: equipment || [],
					};
				});
				setProtocols(data);
			} else {
				console.error('Failed to fetch protocols:', response.data?.message || 'Unknown error');
				toast.error(`Lỗi khi tải danh sách phương pháp: ${response.data?.message || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error fetching protocols:', error);
			setProtocols([]);
		}
	};

	const fetchEquipmentOptions = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/get/list_enum/equipment');
			if (response.data && Array.isArray(response.data)) {
				setEquipmentOptions(['--Chọn--', ...response.data]);
			}
		} catch (error) {
			console.error('Error fetching equipment options:', error);
		}
	};

	const handleProtocolCellClick = (protocolId, column) => {
		setEditingProtocolCell({ protocolId, column });
		const protocol = protocols.find((p) => p.id === protocolId);
		if (protocol && protocol[column] !== undefined) {
			setProtocolInputValue(protocol[column].toString());
		} else {
			setProtocolInputValue('');
		}
	};

	const handleProtocolInputChange = (value) => {
		setProtocolInputValue(value);
	};

	const handleProtocolKeyDown = (e, protocolId, column) => {
		if (e.key === 'Enter') {
			handleSaveProtocolContent(protocolId, column);
		} else if (e.key === 'Escape') {
			setEditingProtocolCell({ protocolId: null, column: null });
			setProtocolInputValue('');
		}
	};

	const handleSaveProtocolContent = async (protocolId, column) => {
		try {
			const updatedProtocols = protocols.map((protocol) => {
				if (protocol.id === protocolId) {
					return { ...protocol, [column]: protocolInputValue };
				}
				return protocol;
			});
			setProtocols(updatedProtocols);

			// Save to API
			const protocol = updatedProtocols.find((p) => p.id === protocolId);
			const updateData = {
				id: protocol.id,
				[column]: protocolInputValue,
			};

			const response = await apiPost('https://black.irdop.org/el9k24zah/db/update/protocol', {
				protocol: updateData,
			});

			if (response.status === 200) {
				toast.success('Cập nhật phương pháp thành công');
			} else {
				toast.error('Cập nhật phương pháp thất bại');
			}

			setEditingProtocolCell({ protocolId: null, column: null });
			setProtocolInputValue('');
		} catch (error) {
			console.error('Error saving protocol content:', error);
			toast.error('Có lỗi khi cập nhật phương pháp');
		}
	};

	const handleAddNewProtocol = async () => {
		if (!newProtocol.protocol_name || !newProtocol.protocol_code) {
			toast.error('Các trường Tên phương pháp và Mã phương pháp là bắt buộc');
			return;
		}

		try {
			const response = await apiPost('https://black.irdop.org/el9k24zah/db/insert/protocol', {
				protocol: newProtocol,
			});

			if (response.status === 200) {
				toast.success('Thêm phương pháp mới thành công');
				setProtocols([...protocols, { ...newProtocol, id: response.data.id }]);
				setNewProtocol({
					protocol_name: '',
					protocol_code: '',
					protocol_description: '',
					protocol_source: 'IRDOP',
					equipment: [],
				});
				setIsAddingNewProtocol(false);
			} else {
				toast.error('Thêm phương pháp thất bại');
			}
		} catch (error) {
			console.error('Error adding new protocol:', error);
			toast.error('Có lỗi khi thêm phương pháp mới');
		}
	};

	const handleDeleteProtocol = async (protocolId) => {
		if (window.confirm('Bạn có chắc chắn muốn xóa phương pháp này?')) {
			try {
				const response = await apiPost('https://black.irdop.org/el9k24zah/db/delete/protocol', {
					id: protocolId,
				});

				if (response.status === 200) {
					toast.success('Xóa phương pháp thành công');
					setProtocols(protocols.filter((p) => p.id !== protocolId));
				} else {
					toast.error('Xóa phương pháp thất bại');
				}
			} catch (error) {
				console.error('Error deleting protocol:', error);
				toast.error('Có lỗi khi xóa phương pháp');
			}
		}
	};
	// Search handler functions similar to ProcessingSampleV3
	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
	};

	const handleSampleSearchChange = (e) => {
		setSampleSearchTerm(e.target.value);
	};

	const handleParameterSearchChange = (e) => {
		setParameterSearchTerm(e.target.value);
	};

	const parseSearchTerms = (searchString) => {
		return searchString
			.split(',')
			.map((term) => term.trim().toLowerCase())
			.filter((term) => term.length > 0);
	};

	// Filter function for AAS data based on search terms
	const applySearchFilters = () => {
		if (!aasData) return [];

		return aasData
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

	// Apply search filters whenever search terms change
	React.useEffect(() => {
		if (aasData) {
			const filtered = applySearchFilters();
			setFilteredAasData(filtered);
		}
	}, [searchTerm, sampleSearchTerm, parameterSearchTerm, aasData]);

	// File handling functions for files view
	const handleSourceChange = (e) => {
		const newSource = e.target.value;
		setSelectedSource(newSource);
		// Fetch files with new source
		fetchExistingFiles(fileSearchQuery, newSource);
	};
	const handleFileSearchChange = (e) => {
		setFileSearchQuery(e.target.value);
	};

	const handleFileSearchSubmit = (e) => {
		if (e.key === 'Enter') {
			// Update URL with search parameter
			const newParams = new URLSearchParams(searchParams);
			if (fileSearchQuery.trim()) {
				newParams.set('search', fileSearchQuery.trim());
			} else {
				newParams.delete('search');
			}
			setSearchParams(newParams);

			// Fetch files with search query
			fetchExistingFiles(fileSearchQuery, selectedSource);
		}
	};

	// Function to get paginated files
	const getPaginatedFiles = () => {
		const allFiles = [];

		// Flatten all files with their group information
		Object.entries(groupedFiles).forEach(([groupId, files]) => {
			files.forEach((file) => {
				allFiles.push({
					...file,
					groupId: groupId,
				});
			});
		});

		// Apply filters
		const filteredFiles = allFiles.filter((file) => {
			const fileNameMatch =
				fileFilters.fileName === '' ||
				(file.fileInfo?.fileName || '').toLowerCase().includes(fileFilters.fileName.toLowerCase());

			const descriptionMatch =
				fileFilters.description === '' ||
				(file.uploadDescription || '').toLowerCase().includes(fileFilters.description.toLowerCase());

			const categoryMatch =
				fileFilters.categories.length === 0 ||
				(Array.isArray(file.fileCategory)
					? file.fileCategory.some((cat) => fileFilters.categories.includes(cat))
					: fileFilters.categories.includes(file.fileCategory));

			const uploadedByUIDMatch =
				fileFilters.uploadedByUID === '' ||
				(file.uploadedByName || '').toLowerCase().includes(fileFilters.uploadedByUID.toLowerCase());

			const createdByUIDMatch =
				fileFilters.createdByUID === '' ||
				(file.createdByUID || '').toLowerCase().includes(fileFilters.createdByUID.toLowerCase());

			return fileNameMatch && descriptionMatch && categoryMatch && uploadedByUIDMatch && createdByUIDMatch;
		});

		// Calculate pagination based on filtered files
		const startIndex = (currentFilePage - 1) * filesPerPage;
		const endIndex = startIndex + filesPerPage;
		const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

		// Group the paginated files back by groupId
		const groupedPaginatedFiles = {};
		paginatedFiles.forEach((file) => {
			const groupId = file.groupId;
			if (!groupedPaginatedFiles[groupId]) {
				groupedPaginatedFiles[groupId] = [];
			}
			groupedPaginatedFiles[groupId].push(file);
		});

		return {
			groupedFiles: groupedPaginatedFiles,
			totalFiles: filteredFiles.length,
			totalPages: Math.ceil(filteredFiles.length / filesPerPage),
		};
	};

	// Function to handle file filter change
	const handleFileFilterChange = (column, value) => {
		setFileFilters((prev) => ({
			...prev,
			[column]: value,
		}));
		setCurrentFilePage(1); // Reset to first page when filtering
	};

	// Function to toggle file filter input visibility
	const toggleFileFilter = (column) => {
		setShowFileFilters((prev) => ({
			...prev,
			[column]: !prev[column],
		}));

		// Clear filter when hiding
		if (showFileFilters[column]) {
			if (column === 'categories') {
				setFileFilters((prev) => ({ ...prev, categories: [] }));
			} else {
				handleFileFilterChange(column, '');
			}
		}
	};

	// Function to handle file page change
	const handleFilePageChange = (newPage) => {
		setCurrentFilePage(newPage);
		// Scroll to top of the page
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	// Function to get unique categories from all files
	const getUniqueFileCategories = () => {
		const categories = new Set();
		Object.values(groupedFiles).forEach((files) => {
			files.forEach((file) => {
				if (Array.isArray(file.fileCategory)) {
					file.fileCategory.forEach((cat) => categories.add(cat));
				} else if (file.fileCategory) {
					categories.add(file.fileCategory);
				}
			});
		});
		return Array.from(categories).sort();
	};

	// Function to handle category filter change
	const handleFileCategoryFilterChange = (category, isChecked) => {
		setFileFilters((prev) => {
			const newCategories = isChecked
				? [...prev.categories, category]
				: prev.categories.filter((cat) => cat !== category);
			return {
				...prev,
				categories: newCategories,
			};
		});
		setCurrentFilePage(1);
	};

	// Function to get category display name
	const getFileCategoryDisplayName = (category) => {
		switch (category) {
			case 'RawData':
				return 'Raw Data';
			case 'PreparedReport':
				return 'Prepare Report';
			case 'Calculation':
				return 'Calculation';
			default:
				return category;
		}
	};

	// Function to get identity UID from cookies
	const getIdentityUID = () => {
		const cookies = document.cookie.split(';');
		for (let cookie of cookies) {
			const [name, value] = cookie.trim().split('=');
			if (name === 'identityUID') {
				return value;
			}
		}
		return null;
	};

	// Function to handle file view - redirect to file without auto-close
	const handleFileView = async (file) => {
		try {
			if (!file.objectName) {
				toast.error('Không tìm thấy thông tin file để xem', {
					autoClose: 1000,
				});
				return;
			}

			// Get the download URL from the API
			const linkResponse = await apiPost('https://red.irdop.org/v1/file/downlink', {
				objectName: file.objectName,
			});

			if (linkResponse.status !== 200) {
				console.error('Failed to get view link:', linkResponse.data?.message || 'Unknown error');
				toast.error(`Lỗi khi lấy link xem: ${linkResponse.data?.message || 'Unknown error'}`, {
					autoClose: 1000,
				});
				return;
			}

			// Open the file URL in a new tab
			window.open(linkResponse.data.url, '_blank');

			toast.success('Đã mở file trong tab mới', {
				autoClose: 1000,
			});
		} catch (error) {
			console.error('Error viewing file:', error);
			toast.error('Lỗi kết nối khi xem file', {
				autoClose: 1000,
			});
		}
	};

	// Function to handle file download
	const handleFileDownload = async (file) => {
		try {
			if (!file.objectName) {
				toast.error('Không tìm thấy thông tin file để tải xuống', {
					autoClose: 1000,
				});
				return;
			}

			// First get the download URL from the API
			const linkResponse = await apiPost('https://red.irdop.org/v1/file/downlink', {
				objectName: file.objectName,
			});

			if (linkResponse.status !== 200) {
				console.error('Failed to get download link:', linkResponse.data?.message || 'Unknown error');
				toast.error(`Lỗi khi lấy link tải: ${linkResponse.data?.message || 'Unknown error'}`, {
					autoClose: 1000,
				});
				return;
			}

			// Using fetch function with correct headers and responseType
			const response = await fetch(linkResponse.data.url, {
				method: 'GET',
				headers: {},
			});

			if (response.ok) {
				// Get the blob directly from the response
				const blob = await response.blob();

				// Create a new blob with explicit type to ensure correct handling
				const fileBlob = new Blob([blob], { type: file.fileInfo?.fileType || 'application/octet-stream' });

				// Create a URL for the blob
				const url = window.URL.createObjectURL(fileBlob);

				// For IE/Edge browsers
				if (window.navigator && window.navigator.msSaveOrOpenBlob) {
					window.navigator.msSaveOrOpenBlob(fileBlob, file.fileInfo?.fileName || 'downloaded-file');
				} else {
					// For modern browsers
					const link = document.createElement('a');
					link.href = url;
					link.setAttribute('download', file.fileInfo?.fileName || 'downloaded-file');
					link.style.display = 'none';

					// Append to body, click and remove
					document.body.appendChild(link);
					link.click();

					// Clean up after a short delay to ensure download starts
					setTimeout(() => {
						document.body.removeChild(link);
						window.URL.revokeObjectURL(url);
					}, 200);
				}

				toast.success('Tải file thành công', {
					autoClose: 1000,
				});
			} else {
				console.error('Failed to download file:', response.statusText);
				toast.error(`Lỗi khi tải file: ${response.statusText}`, {
					autoClose: 1000,
				});
			}
		} catch (error) {
			console.error('Error downloading file:', error);
			toast.error('Lỗi kết nối khi tải file', {
				autoClose: 1000,
			});
		}
	};
	// Function to handle file delete
	const handleFileDelete = async (file) => {
		try {
			if (!file.objectName) {
				toast.error('Không tìm thấy thông tin file để xóa', {
					autoClose: 1000,
				});
				return;
			}

			// Confirm before deleting
			if (!window.confirm('Bạn có chắc chắn muốn xóa file này?')) {
				return;
			}

			const response = await apiPost('https://red.irdop.org/v1/file/update', {
				objectName: file.objectName,
				deleteAt: Date.now(),
			});

			if (response.status === 200) {
				toast.success('Xóa file thành công', {
					autoClose: 1000,
				});

				// Refresh the file list
				fetchExistingFiles(fileSearchQuery, selectedSource);
			} else {
				console.error('Failed to delete file:', response.data?.message || 'Unknown error');
				toast.error(`Lỗi khi xóa file: ${response.data?.message || 'Unknown error'}`, {
					autoClose: 1000,
				});
			}
		} catch (error) {
			console.error('Error deleting file:', error);
			toast.error('Lỗi kết nối khi xóa file', {
				autoClose: 1000,
			});
		}
	};

	// Function to handle receipt UID click - open new tab with file view
	const handleReceiptUidClick = (receiptUid) => {
		if (!receiptUid) return;

		// Remove first 3 characters from receipt_uid
		const searchQuery = receiptUid.substring(3);

		// Create new URL with file view and search parameter
		const newUrl = `${window.location.origin}${window.location.pathname}?view=file&search=${encodeURIComponent(
			searchQuery,
		)}`;

		// Open in new tab
		window.open(newUrl, '_blank');
	};

	// Function to handle sample UID click - open new tab with file view
	const handleSampleUidClick = (sampleUid) => {
		if (!sampleUid) return;

		// Remove first 2 characters from sample_uid
		const searchQuery = sampleUid.substring(2);

		// Create new URL with file view and search parameter
		const newUrl = `${window.location.origin}${window.location.pathname}?view=file&search=${encodeURIComponent(
			searchQuery,
		)}`;

		// Open in new tab
		window.open(newUrl, '_blank');
	};
	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			{/* Breadcrumb */}
			<Breadcrumb paths={[{}]} />
			{/* View Mode Selector */}
			<div className="flex gap-2 mb-2">
				<button
					onClick={() => setSearchParams({ view: 'analysis' })}
					className={`px-4 py-1 rounded-lg transition-colors ${
						viewMode === 'indicators' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
					}`}
				>
					Chỉ tiêu
				</button>
				<button
					onClick={() => setSearchParams({ view: 'protocol' })}
					className={`px-4 py-1 rounded-lg transition-colors ${
						viewMode === 'methods' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
					}`}
				>
					Phương pháp
				</button>
				<button
					onClick={() => setSearchParams({ view: 'file' })}
					className={`px-4 py-1 rounded-lg transition-colors ${
						viewMode === 'files' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
					}`}
				>
					Files
				</button>
			</div>{' '}
			{/* Conditional Content Rendering */}
			{viewMode === 'indicators' && (
				<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
					<h2 className="text-xl font-semibold mb-4">Danh sách chỉ tiêu AAS</h2> {/* Search inputs */}
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
						</div>{' '}
						{/* Action buttons */}
						<div className="flex justify-end items-center gap-2">
							{selectedCheckboxesV3.length > 0 && (
								<button
									className="bg-purple-500 text-white px-2 py-1 rounded text-sm hover:bg-purple-600"
									onClick={() => setShowGlobalBulkEditForm(true)}
								>
									Sửa ({selectedCheckboxesV3.length})
								</button>
							)}{' '}
							<button
								className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600 flex items-center gap-2"
								onClick={() => setShowSendFileForm(true)}
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Send File
							</button>
						</div>
					</div>{' '}
					{Array.isArray(filteredAasData) && filteredAasData.length > 0 ? (
						<div className="space-y-6">
							{/* Display receipts with pagination */}
							{(showAllReceipts ? filteredAasData : filteredAasData.slice(0, receiptsPerPage)).map((receipt) => (
								<div key={receipt.id} className="p-2 border rounded-lg mb-4 text-left overflow-auto relative">
									{' '}
									{/* Receipt header with checkbox moved to right */}{' '}
									<div className="text-start mb-2 flex justify-between items-center">
										<div className="flex items-center">
											<p
												className="text-primary font-semibold text-lg cursor-pointer hover:text-blue-600 hover:underline"
												onClick={() => handleReceiptUidClick(receipt.receipt_uid)}
												title="Click để xem files liên quan"
											>
												{receipt.receipt_uid || 'N/A'}
											</p>
										</div>
										<div className="flex items-center gap-3">
											<input
												type="checkbox"
												className="w-4 h-4 receipt-checkbox"
												data-receipt-id={receipt.id}
												onChange={(e) => handleReceiptCheckboxChange(e, receipt)}
											/>
										</div>
									</div>
									{/* Samples and Analysis */}
									{receipt.samples && receipt.samples.length > 0 && (
										<div className="space-y-2	">
											{receipt.samples.map((sample) => (
												<div key={sample.id} className="border-l-4 border-blue-300 pl-4">
													{' '}
													<div className="mb-2 flex items-center justify-between">
														<div className="flex items-center flex-wrap">
															<span
																className="font-semibold text-blue-700 cursor-pointer hover:text-blue-600 hover:underline"
																onClick={() => handleSampleUidClick(sample.sample_uid)}
																title="Click để xem files liên quan"
															>
																{sample.sample_uid}
															</span>
															<span className="ml-2 text-gray-600">{sample.sample_name}</span>
															{sample.matrix && (
																<span className="ml-2 text-gray-500">
																	(<strong>Nền mẫu:</strong> {sample.matrix})
																</span>
															)}
															{sample.additional_request && (
																<div className="text-sm text-gray-600 mt-1 ml-2">
																	<strong>Yêu cầu:</strong> {sample.additional_request}
																</div>
															)}
														</div>
													</div>{' '}
													{sample.analysis && sample.analysis.length > 0 && (
														<div className="overflow-x-auto">
															{' '}
															<table className="w-full border-collapse border border-gray-300 text-sm">
																<thead className="bg-gray-100">
																	<tr>
																		<th className="border p-2 text-start w-32">Chỉ tiêu</th>
																		<th className="border p-2 text-start w-40">Phương pháp</th>
																		<th className="border p-2 text-start w-40">Kết quả</th>
																		<th className="border p-2 text-start w-24">Đơn vị</th>
																		<th className="border p-2 text-start w-32">Hạn trả</th>
																		<th className="border p-2 text-start w-32">KTV</th>
																		<th className="border p-2 text-start w-32">Tham chiếu</th>
																		<th className="border p-2 text-start w-8">
																			<input
																				type="checkbox"
																				className="w-4 h-4"
																				onChange={(e) =>
																					handleSampleCheckboxChange(e, receipt.id, sample.id, sample.analysis)
																				}
																				checked={isSampleFullySelected(sample.id, sample.analysis)}
																			/>
																		</th>
																	</tr>
																</thead>{' '}
																<tbody>
																	{' '}
																	{sample.analysis.map((analysis) => (
																		<tr key={analysis.id} className="hover:bg-gray-50">
																			<td className="border p-2 text-start">{analysis.parameter_name || '--'}</td>{' '}
																			<td className="border p-1 text-start">
																				<div className="flex items-center gap-0.5">
																					<span className="min-w-24 max-w-fit p-1 py-0.5 max-h-fit font-semibold bg-gray-100 border border-gray-200 rounded text-sm text-left">
																						{analysis.protocol_source || 'IRDOP'}
																					</span>
																					<span className="w-full bg-gray-100 border border-gray-200 rounded p-1 py-0 text-left">
																						{analysis.protocol_code || '--'}
																					</span>
																				</div>
																			</td>
																			<td
																				className="border p-1 text-start"
																				onClick={() =>
																					handleCellClickV3(analysis.id, 'result_value', analysis.result_value)
																				}
																			>
																				<div className="hover:border-purple-500 border rounded border-white cursor-pointer">
																					{editableCell.analysisId === analysis.id &&
																					editableCell.column === 'result_value' ? (
																						<TinyMceInput
																							value={inputValue}
																							onUpdate={(content) =>
																								handleSaveContentV3(content, 'result_value', analysis.id)
																							}
																							onKey={handleKeyDownV3}
																						/>
																					) : (
																						<div dangerouslySetInnerHTML={{ __html: analysis.result_value || '--' }} />
																					)}
																				</div>
																			</td>
																			<td
																				className="border p-1 text-start"
																				onClick={() =>
																					handleCellClickV3(analysis.id, 'result_unit', analysis.result_unit)
																				}
																			>
																				<div className="hover:border-purple-500 border rounded border-white cursor-pointer">
																					{editableCell.analysisId === analysis.id &&
																					editableCell.column === 'result_unit' ? (
																						<TinyMceInput
																							value={inputValue}
																							onUpdate={(content) =>
																								handleSaveContentV3(content, 'result_unit', analysis.id)
																							}
																							onKey={handleKeyDownV3}
																						/>
																					) : (
																						<div dangerouslySetInnerHTML={{ __html: analysis.result_unit || '--' }} />
																					)}
																				</div>
																			</td>
																			<td className="border p-2 text-start">{formatDate(analysis.deadline)}</td>
																			<td className="border p-2 text-start">
																				{getTechnicianName(analysis.technician_uid)}
																			</td>
																			<td
																				className="border p-2 text-start cursor-pointer hover:bg-blue-50"
																				onClick={() => handleCellClick(analysis.id, 'reference', analysis.reference)}
																			>
																				{editableCell.analysisId === analysis.id &&
																				editableCell.column === 'reference' ? (
																					<input
																						type="text"
																						value={inputValue}
																						onChange={handleInputChange}
																						onKeyDown={handleKeyDown}
																						onBlur={handleSaveContent}
																						className="w-full p-1 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
																						autoFocus
																					/>
																				) : (
																					analysis.reference || '--'
																				)}
																			</td>
																			<td className="border p-2 text-center">
																				<input
																					type="checkbox"
																					className="w-4 h-4 row-checkbox"
																					data-analysis-id={analysis.id}
																					data-sample-id={sample.id}
																					data-receipt-id={receipt.id}
																					onChange={(e) => handleAnalysisCheckboxChange(e, analysis.id, receipt.id)}
																				/>
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							))}

							{/* Show More Button */}
							{!showAllReceipts && filteredAasData.length > receiptsPerPage && (
								<div className="text-center mt-6">
									<button
										onClick={() => setShowAllReceipts(true)}
										className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
									>
										Xem thêm ({filteredAasData.length - receiptsPerPage} phiếu TNM)
									</button>
								</div>
							)}

							{/* Show Less Button */}
							{showAllReceipts && filteredAasData.length > receiptsPerPage && (
								<div className="text-center mt-6">
									<button
										onClick={() => setShowAllReceipts(false)}
										className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
									>
										Thu gọn
									</button>
								</div>
							)}
						</div>
					) : (
						<div className="text-center py-8 text-gray-500">Không có dữ liệu chỉ tiêu AAS</div>
					)}{' '}
				</div>
			)}{' '}
			{/* Global Bulk Edit Modal */}
			{showGlobalBulkEditForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
					<div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden mx-4">
						<div className="p-4 border-b flex justify-between items-center">
							<h2 className="text-xl font-bold">
								Chỉnh sửa hàng loạt toàn cục ({selectedCheckboxesV3.length} chỉ tiêu)
							</h2>
							<button
								className="text-gray-500 hover:text-gray-700 text-2xl"
								onClick={() => setShowGlobalBulkEditForm(false)}
							>
								×
							</button>
						</div>

						<div className="p-4 overflow-y-auto max-h-[70vh]">
							{/* Global Bulk Edit Form */}
							<div className="mb-2 bg-gray-50 p-2 rounded-lg">
								<div className="grid grid-cols-3 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Kết quả</label>
										<div
											className="h-10 border rounded p-2 bg-white cursor-pointer hover:border-purple-500"
											onClick={() => handleBulkEditCellClick('result_value', 'global')}
										>
											{bulkEditCell.receiptId === 'global' && bulkEditCell.column === 'result_value' ? (
												<TinyMceInput
													value={bulkEditValues.result_value || ''}
													onUpdate={(content) => handleBulkEditChange('result_value', content)}
													onKey={() => {}}
												/>
											) : (
												<div
													dangerouslySetInnerHTML={{
														__html: bulkEditValues.result_value || 'Nhấn để chỉnh sửa...',
													}}
												/>
											)}
										</div>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
										<div
											className="h-10 border rounded p-2 bg-white cursor-pointer hover:border-purple-500"
											onClick={() => handleBulkEditCellClick('result_unit', 'global')}
										>
											{bulkEditCell.receiptId === 'global' && bulkEditCell.column === 'result_unit' ? (
												<TinyMceInput
													value={bulkEditValues.result_unit || ''}
													onUpdate={(content) => handleBulkEditChange('result_unit', content)}
													onKey={() => {}}
												/>
											) : (
												<div
													dangerouslySetInnerHTML={{
														__html: bulkEditValues.result_unit || 'Nhấn để chỉnh sửa...',
													}}
												/>
											)}
										</div>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Tham chiếu</label>
										<input
											type="text"
											className="w-full border rounded p-2 bg-white"
											placeholder="Nhập tham chiếu..."
											value={bulkEditValues.reference || ''}
											onChange={(e) => handleBulkEditChange('reference', e.target.value)}
										/>
									</div>
								</div>
							</div>

							{/* Selected Items Preview grouped by receipt */}
							<div className="mb-4">
								<h3 className="text-lg font-semibold mb-3">Danh sách chỉ tiêu được chọn</h3>
								<div className="overflow-x-auto max-h-60">
									<table className="w-full border-collapse border border-gray-300 text-sm">
										<thead className="bg-gray-100">
											<tr>
												<th className="border p-1 text-start w-24">Phiếu TNM</th>
												<th className="border p-1 text-start w-32">Mã mẫu</th>
												<th className="border p-1 text-start w-40">Chỉ tiêu</th>
												<th className="border p-1 text-start w-40">Kết quả hiện tại</th>
												<th className="border p-1 text-start w-24">Đơn vị hiện tại</th>
												<th className="border p-1 text-start w-32">Tham chiếu hiện tại</th>
											</tr>
										</thead>
										<tbody>
											{selectedCheckboxesV3.map((analysisId) => {
												// Find the analysis, sample, and receipt in the data
												let foundAnalysis = null;
												let foundSample = null;
												let foundReceipt = null;

												filteredAasData?.forEach((receipt) => {
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
															<div
																dangerouslySetInnerHTML={{
																	__html: foundAnalysis.result_value || '--',
																}}
															/>
														</td>
														<td className="border p-1 text-start">
															<div
																dangerouslySetInnerHTML={{
																	__html: foundAnalysis.result_unit || '--',
																}}
															/>
														</td>
														<td className="border p-1 text-start">{foundAnalysis.reference || '--'}</td>
													</tr>
												) : null;
											})}
										</tbody>
									</table>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex justify-end gap-2 pt-4 border-t">
								<button
									className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
									onClick={() => setShowGlobalBulkEditForm(false)}
								>
									Hủy
								</button>
								<button
									className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
									onClick={() => handleBulkUpdate('global')}
								>
									Cập nhật ({selectedCheckboxesV3.length} chỉ tiêu)
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			{viewMode === 'methods' && (
				<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
					<h2 className="text-xl font-semibold">Tính năng phát triển sau</h2>
				</div>
			)}{' '}
			{viewMode === 'files' && (
				<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold">Danh sách file hiện có</h2>
						<div className="flex items-center gap-4">
							<select
								value={selectedSource}
								onChange={handleSourceChange}
								className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
							>
								<option value="irdop">Tất cả file</option>
								<option value="activities/lab">LAB</option>
								<option value="SOP/protocol">Phương pháp</option>
							</select>
							<input
								type="text"
								placeholder="Tìm kiếm file..."
								value={fileSearchQuery}
								onChange={handleFileSearchChange}
								onKeyPress={handleFileSearchSubmit}
								className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
							/>
						</div>
					</div>
					{Object.keys(groupedFiles).length > 0 ? (
						<>
							{(() => {
								const { groupedFiles: paginatedGroupedFiles, totalFiles, totalPages } = getPaginatedFiles();

								return (
									<>
										{/* File count and pagination info */}
										<div className="flex justify-between items-center mb-4">
											<div className="text-sm text-gray-600">
												Tổng số: {totalFiles} file | Trang {currentFilePage} / {totalPages}
											</div>
										</div>

										{/* Files Table */}
										<div className="overflow-auto">
											<table className="w-full border-collapse border border-gray-300 bg-white">
												<thead className="bg-gray-100">
													<tr>
														<th className="border p-2 text-start min-w-48">
															<div className="flex items-center">
																Tên file
																<button
																	onClick={() => toggleFileFilter('fileName')}
																	className="ml-2 text-gray-500 hover:text-gray-700 p-1.5"
																>
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		className={`h-4 w-4 transition-transform ${
																			showFileFilters.fileName ? 'rotate-180' : ''
																		}`}
																		viewBox="0 0 20 20"
																		fill="currentColor"
																	>
																		<path
																			fillRule="evenodd"
																			d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
																			clipRule="evenodd"
																		/>
																	</svg>
																</button>
															</div>
															{showFileFilters.fileName && (
																<div className="mt-1">
																	<input
																		type="text"
																		placeholder="Tìm kiếm tên file..."
																		value={fileFilters.fileName}
																		onChange={(e) => handleFileFilterChange('fileName', e.target.value)}
																		className="w-full p-1 text-xs border rounded bg-white"
																	/>
																</div>
															)}
														</th>
														<th className="border p-2 text-start w-1/4 min-w-60">
															<div className="flex items-center">
																Mô tả
																<button
																	onClick={() => toggleFileFilter('description')}
																	className="ml-2 text-gray-500 hover:text-gray-700 p-1.5"
																>
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		className={`h-4 w-4 transition-transform ${
																			showFileFilters.description ? 'rotate-180' : ''
																		}`}
																		viewBox="0 0 20 20"
																		fill="currentColor"
																	>
																		<path
																			fillRule="evenodd"
																			d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
																			clipRule="evenodd"
																		/>
																	</svg>
																</button>
															</div>
															{showFileFilters.description && (
																<div className="mt-1">
																	<input
																		type="text"
																		placeholder="Tìm kiếm mô tả..."
																		value={fileFilters.description}
																		onChange={(e) => handleFileFilterChange('description', e.target.value)}
																		className="w-full p-1 text-xs border rounded bg-white"
																	/>
																</div>
															)}
														</th>
														<th className="border p-2 text-start w-40 min-w-40 relative">
															<div className="flex items-center">
																Danh mục
																<button
																	onClick={() => toggleFileFilter('categories')}
																	className="ml-2 text-gray-500 hover:text-gray-700 p-1.5"
																>
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		className={`h-4 w-4 transition-transform ${
																			showFileFilters.categories ? 'rotate-180' : ''
																		}`}
																		viewBox="0 0 20 20"
																		fill="currentColor"
																	>
																		<path
																			fillRule="evenodd"
																			d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
																			clipRule="evenodd"
																		/>
																	</svg>
																</button>
															</div>
															{showFileFilters.categories && (
																<div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-300 rounded mt-1 shadow-lg max-h-60 overflow-y-auto">
																	<div className="p-2">
																		{getUniqueFileCategories().map((category) => (
																			<label
																				key={category}
																				className="flex items-center py-1 px-1 font-normal hover:bg-gray-100 cursor-pointer"
																			>
																				<input
																					type="checkbox"
																					checked={fileFilters.categories.includes(category)}
																					onChange={(e) => handleFileCategoryFilterChange(category, e.target.checked)}
																					className="mr-2"
																					onClick={(e) => e.stopPropagation()}
																				/>
																				<span className="text-sm">{getFileCategoryDisplayName(category)}</span>
																			</label>
																		))}
																		{getUniqueFileCategories().length === 0 && (
																			<div className="text-sm text-gray-500 p-2">Không có danh mục nào</div>
																		)}
																	</div>
																</div>
															)}
														</th>
														<th className="border p-2 text-start w-36 min-w-36">Upload bởi</th>
														<th className="border p-2 text-start w-32 min-w-32">Tạo bởi</th>
														<th className="border p-2 text-center w-24 min-w-24">Actions</th>
													</tr>
												</thead>
												<tbody>
													{Object.entries(paginatedGroupedFiles).map(([groupId, files]) =>
														files.map((file, index) => (
															<tr key={`${groupId}-${index}`} className="hover:bg-gray-50">
																<td className="border p-2 text-start break-words">
																	{file.fileInfo?.fileName || 'N/A'}
																</td>
																<td className="border p-2 text-start">
																	<div className="text-xs">{file.uploadDescription || 'N/A'}</div>
																</td>
																<td className="border p-2 text-start">
																	<div className="text-xs">
																		{Array.isArray(file.fileCategory)
																			? file.fileCategory
																					.map((cat) =>
																						cat === 'RawData'
																							? 'Raw Data'
																							: cat === 'PreparedReport'
																							? 'Prepare Report'
																							: cat === 'Calculation'
																							? 'Calculation'
																							: cat,
																					)
																					.join(', ')
																			: file.fileCategory || 'N/A'}
																	</div>
																</td>
																<td className="border p-2 text-start">
																	<div className="text-xs">{file.uploadedByName || ''}</div>
																</td>
																<td className="border p-2 text-start">
																	<div className="text-xs">{file.createdByUID || 'N/A'}</div>
																</td>
																<td className="border p-2 text-center">
																	<div className="flex justify-center gap-1">
																		<button
																			className="text-blue-500 hover:text-blue-700 cursor-pointer p-1"
																			title="Xem"
																			onClick={() => handleFileView(file)}
																		>
																			<FaEye size={14} />
																		</button>
																		<button
																			className="text-green-500 hover:text-green-700 cursor-pointer p-1"
																			title="Tải xuống"
																			onClick={() => handleFileDownload(file)}
																		>
																			<FaDownload size={14} />
																		</button>
																		{file.uploadedByUID === getIdentityUID() && (
																			<button
																				className="text-red-500 hover:text-red-700 cursor-pointer p-1"
																				title="Xóa"
																				onClick={() => handleFileDelete(file)}
																			>
																				<FaTrashAlt size={14} />
																			</button>
																		)}
																	</div>
																</td>
															</tr>
														)),
													)}
												</tbody>
											</table>
										</div>

										{/* Pagination Controls */}
										{totalPages > 1 && (
											<div className="flex justify-center items-center mt-6 gap-2">
												{/* Previous Button */}
												<button
													onClick={() => handleFilePageChange(currentFilePage - 1)}
													disabled={currentFilePage === 1}
													className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													‹ Trước
												</button>

												{/* Page Numbers */}
												{(() => {
													const pageNumbers = [];
													const maxVisiblePages = 5;
													let startPage = Math.max(1, currentFilePage - Math.floor(maxVisiblePages / 2));
													let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

													if (endPage - startPage + 1 < maxVisiblePages) {
														startPage = Math.max(1, endPage - maxVisiblePages + 1);
													}

													for (let i = startPage; i <= endPage; i++) {
														pageNumbers.push(
															<button
																key={i}
																onClick={() => handleFilePageChange(i)}
																className={`px-3 py-1 border rounded-lg ${
																	currentFilePage === i ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-gray-100'
																}`}
															>
																{i}
															</button>,
														);
													}
													return pageNumbers;
												})()}

												{/* Next Button */}
												<button
													onClick={() => handleFilePageChange(currentFilePage + 1)}
													disabled={currentFilePage === totalPages}
													className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													Sau ›
												</button>
											</div>
										)}
									</>
								);
							})()}
						</>
					) : (
						<div className="text-center py-8 text-gray-500">Không có file nào</div>
					)}
				</div>
			)}{' '}
			{/* Send File Form Modal */}
			{showSendFileForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
					<div className="bg-white p-6 rounded-lg shadow-lg min-w-[400px] w-5/6">
						<h2 className="text-xl font-bold mb-2 flex justify-between items-center">
							<span>Send File</span>
							<span className="text-sm font-normal text-gray-600">
								({selectedCheckboxesV3.length} chỉ tiêu được chọn)
							</span>
						</h2>{' '}
						{/* Machine Selection */}
						<div className="mb-4">
							<h3 className="text-md font-semibold mb-2 text-left">Thông tin tải lên</h3>
							<div className="flex items-center gap-2 mb-4">
								<label htmlFor="machineSelect" className="text-sm font-medium text-gray-700">
									Máy phân tích:
								</label>
								<select
									id="machineSelect"
									value={selectedMachine}
									onChange={(e) => handleMachineSelectionChange(e.target.value)}
									className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="">-- Chọn máy --</option>
									<option value="AAS01">AAS01</option>
									<option value="AAS02">AAS02</option>
								</select>
							</div>{' '}
							{/* Drop Zones */}
							<div className="grid grid-cols-3 gap-4">
								{' '}
								{/* Raw Data Drop Zone */}{' '}
								<div
									className="border-2 border-dashed border-green-400 rounded-lg p-4 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
									onClick={async () => {
										const input = document.createElement('input');
										input.type = 'file';
										input.multiple = true;
										input.onchange = (e) => handleSendFileChange(e, 'RawData');
										input.click();
									}}
									onDrop={(e) => handleSendFileFileDrop(e, 'RawData')}
									onDragOver={(e) => e.preventDefault()}
								>
									<div className="text-center">
										<FaUpload className="mx-auto mb-2 text-2xl text-green-500" />
										<p className="font-medium text-green-800">File gốc từ máy</p>
										<p className="text-xs text-gray-600 mt-1">Kéo thả file vào đây hoặc nhấn để chọn</p>
									</div>
								</div>
								{/* Raw Data + Prepare Report Drop Zone */}{' '}
								<div
									className="border-2 border-dashed border-blue-400 rounded-lg p-4 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
									onClick={async () => {
										const input = document.createElement('input');
										input.type = 'file';
										input.multiple = true;
										input.onchange = (e) => handleSendFileChange(e, 'PrepareReport');
										input.click();
									}}
									onDrop={(e) => handleSendFileFileDrop(e, 'PrepareReport')}
									onDragOver={(e) => e.preventDefault()}
								>
									<div className="text-center">
										<FaUpload className="mx-auto mb-2 text-2xl text-blue-500" />
										<p className="font-medium text-blue-800">File báo cáo dạng PDF</p>
										<p className="text-xs text-gray-600 mt-1">Kéo thả file vào đây hoặc nhấn để chọn</p>
									</div>
								</div>
								{/* Custom Drop Zone (no auto-fill) */}{' '}
								<div
									className="border-2 border-dashed border-purple-400 rounded-lg p-4 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
									onClick={async () => {
										const input = document.createElement('input');
										input.type = 'file';
										input.multiple = true;
										input.onchange = (e) => handleSendFileChange(e, '');
										input.click();
									}}
									onDrop={(e) => handleSendFileFileDrop(e, '')}
									onDragOver={(e) => e.preventDefault()}
								>
									<div className="text-center">
										<FaUpload className="mx-auto mb-2 text-2xl text-purple-500" />
										<p className="font-medium text-purple-800">Tùy chỉnh</p>
										<p className="text-xs text-gray-600 mt-1">Kéo thả file vào đây hoặc nhấn để chọn</p>
									</div>{' '}
								</div>
							</div>{' '}
							<input
								type="file"
								multiple
								className="hidden"
								id="fileInput"
								onChange={handleFileChange}
								ref={fileInputRef}
							/>
							{/* Bulk Description Input */}
							<div className="my-1 flex gap-1">
								<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
									Mô tả chung cho tất cả file:
								</label>
								<input
									type="text"
									value={bulkDescription}
									onChange={(e) => handleBulkDescriptionChange(e.target.value)}
									className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Nhập mô tả sẽ áp dụng cho tất cả file..."
								/>
							</div>
						</div>
						{/* Selected Items Preview */}
						<div className="mb-4">
							<h3 className="text-md font-semibold mb-2">Danh sách chỉ tiêu được chọn</h3>
							<div className="overflow-x-auto max-h-60">
								{selectedCheckboxesV3.length > 0 ? (
									<table className="w-full border-collapse border border-gray-300 text-sm">
										<thead className="bg-gray-100">
											<tr>
												<th className="border p-1 text-start w-24">Phiếu TNM</th>
												<th className="border p-1 text-start w-32">Mã mẫu</th>
												<th className="border p-1 text-start w-40">Chỉ tiêu</th>
												<th className="border p-1 text-start w-40">Kết quả hiện tại</th>
												<th className="border p-1 text-start w-24">Đơn vị hiện tại</th>
												<th className="border p-1 text-start w-32">Tham chiếu hiện tại</th>
											</tr>
										</thead>
										<tbody>
											{selectedCheckboxesV3.map((analysisId) => {
												// Find the analysis, sample, and receipt in the data
												let foundAnalysis = null;
												let foundSample = null;
												let foundReceipt = null;

												filteredAasData?.forEach((receipt) => {
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
															<div
																dangerouslySetInnerHTML={{
																	__html: foundAnalysis.result_value || '--',
																}}
															/>
														</td>
														<td className="border p-1 text-start">
															<div
																dangerouslySetInnerHTML={{
																	__html: foundAnalysis.result_unit || '--',
																}}
															/>
														</td>
														<td className="border p-1 text-start">{foundAnalysis.reference || '--'}</td>
													</tr>
												) : null;
											})}
										</tbody>
									</table>
								) : (
									<div className="text-center py-4 text-gray-500">Chưa có chỉ tiêu nào được chọn</div>
								)}
							</div>
						</div>{' '}
						{/* Uploaded Files Table */}
						{uploadedFiles.length > 0 && (
							<div className="mb-6">
								<h3 className="text-md font-semibold mb-2">Danh sách file đã tải lên</h3>
								<div className="max-h-[240px] overflow-auto">
									<table className="w-full border-collapse border border-gray-300">
										<thead className="bg-gray-100">
											<tr>
												<th className="border p-1 text-center w-16">STT</th>
												<th className="border p-1 text-start">Tên file</th>
												<th className="border p-1 text-start">File UID</th>
												<th className="border p-1 text-start w-32 relative">
													<div
														className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 p-1 rounded category-dropdown-container"
														onClick={toggleCategoryDropdown}
													>
														<span>Danh mục</span>
														<svg
															className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
														</svg>
													</div>
													{showCategoryDropdown && (
														<div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[160px] category-dropdown-container">
															<div className="p-2">
																{['Raw Data', 'Prepare Report', 'Calculation'].map((category) => (
																	<label key={category} className="flex items-center gap-1 text-xs">
																		<input
																			type="checkbox"
																			checked={selectedHeaderCategories.includes(category)}
																			onChange={(e) => handleHeaderCategoryChange(category, e.target.checked)}
																			className="w-3 h-3"
																		/>
																		<span>{category}</span>
																	</label>
																))}
																{getUniqueFileCategories().length === 0 && (
																	<div className="text-sm text-gray-500 p-2">Không có danh mục nào</div>
																)}
															</div>
														</div>
													)}
												</th>
												<th className="border p-1 text-start w-32">Loại máy</th>
												<th className="border p-1 text-start">Mô tả</th>
												<th className="border p-1 text-center w-16">Xóa</th>
											</tr>
										</thead>
										<tbody>
											{uploadedFiles.map((fileInfo, index) => (
												<tr key={index} className="hover:bg-gray-50">
													<td className="border p-2 text-center">{index + 1}</td>
													<td className="border p-2 text-start break-words">{fileInfo.fileInfo.fileName}</td>
													<td className="border p-2 text-start font-mono text-sm">
														{fileInfo.fileUID || fileInfo.key || 'N/A'}
													</td>
													<td className="border p-1">
														<div className="flex flex-col gap-1 min-w-32">
															{['Raw Data', 'Prepare Report', 'Calculation'].map((category) => {
																const categoryValue = category.replace(/\s+/g, '');
																return (
																	<label key={category} className="flex items-center gap-1 text-xs">
																		<input
																			type="checkbox"
																			checked={(fileInfo.fileCategory || []).includes(categoryValue)}
																			onChange={(e) =>
																				handleCategoryCheckboxChange(index, categoryValue, e.target.checked)
																			}
																			className="w-3 h-3"
																		/>
																		<span>{category}</span>
																	</label>
																);
															})}
														</div>
													</td>
													<td className="border p-1">
														<select
															value={fileInfo.createdbyUID || ''}
															onChange={(e) => handleUploadedFileEdit(index, 'createdbyUID', e.target.value)}
															className="w-full p-1 text-xs border rounded bg-white"
														>
															<option value="">-- Chọn loại máy --</option>
															<option value="AAS01">AAS01</option>
															<option value="AAS02">AAS02</option>
														</select>
													</td>{' '}
													<td className="border p-1">
														<input
															type="text"
															value={fileInfo.uploadDescription || ''}
															onChange={(e) => handleUploadedFileEdit(index, 'uploadDescription', e.target.value)}
															className="w-full p-1 text-xs border rounded bg-white"
															placeholder="Nhập mô tả..."
														/>
													</td>
													<td className="border p-2 text-center">
														<button
															onClick={() => handleUploadedFileDelete(index)}
															className="text-red-500 hover:text-red-700 p-1"
															title="Xóa file"
														>
															<FaTrashAlt size={14} />
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
						{/* Action Buttons */}
						<div className="flex justify-end gap-3">
							<button
								className="px-4 py-2 border-2 border-gray-600 text-gray-600 rounded hover:bg-gray-400"
								onClick={() => {
									setShowSendFileForm(false);
									setBulkEditValues({});
									setBulkEditCell({ column: null, receiptId: null });
								}}
							>
								Hủy bỏ
							</button>{' '}
							<button
								className="px-4 py-2 border-2 border-blue-600 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
								onClick={() => {
									handleFinalConfirmation();
									setShowSendFileForm(false);
								}}
							>
								<FaSave className="mr-2" /> Xác nhận ({uploadedFiles.length} files)
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProcessingSampleMachine;
