import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaPlus, FaSync } from 'react-icons/fa';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../../contexts/GlobalContext';
import { Editor } from 'draft-js';
import TinyMceInput from '../Input';

// Custom CSS styles for TinyMCE editing
const customEditingStyles = `
/* Enhanced editing styles */
.editable-cell {
	transition: all 0.2s ease-in-out;
}

.editable-cell:hover {
	background-color: #f0f8ff !important;
	border-color: #7c3aed !important;
	box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.2);
}

.editing-active {
	background-color: #ffffff !important;
	border-color: #7c3aed !important;
	box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3);
}

.result-cell-placeholder {
	color: #9ca3af;
	font-style: italic;
}

.save-indicator {
	animation: pulse 1s infinite;
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

/* Styles for disabled rows in FilterableTable */
.custom-filterable-table tr[data-displayed="true"] {
	background-color: #f3f4f6 !important;
	opacity: 0.6;
	pointer-events: none;
	cursor: not-allowed !important;
}

.custom-filterable-table tr[data-displayed="true"]:hover {
	background-color: #f3f4f6 !important;
}

.custom-filterable-table tr[data-displayed="true"] td {
	color: #9ca3af !important;
}

/* Override row selection for disabled rows */
.custom-filterable-table tr[data-displayed="true"].row-selected {
	background-color: #f3f4f6 !important;
	border-color: #d1d5db !important;
}
`;

const ExperimentDetail = ({ docCopy, processingAnalyses, isOpen, onClose }) => {
	const { currentUser, getIdenByUid, technicians } = useContext(GlobalContext);

	// Utility functions
	const isAdmin = () => {
		return currentUser?.role?.staff_admin === true;
	};

	// Helper function to get identity name from document
	const getIdentityName = (doc) => {
		const possibleUIDs = [
			doc.metadata?.submittedByUID,
			doc.metadata?.identityUID,
			doc.metadata?.authorUID,
			doc.metadata?.createdByUID,
			doc.metadata?.modifiedByUID,
			doc.identityUID,
			doc.authorUID,
			doc.createdByUID,
			doc.modifiedByUID,
		];

		for (const uid of possibleUIDs) {
			if (uid && identityNames[uid]) {
				return identityNames[uid];
			}
		}

		const firstUID = possibleUIDs.find((uid) => uid);
		return firstUID || 'N/A';
	};

	// Fetch identity name by UID
	const fetchIdentityName = async (identityUID) => {
		if (!identityUID || identityNames[identityUID]) {
			return identityNames[identityUID] || identityUID;
		}

		try {
			const identity = await getIdenByUid(identityUID);
			if (identity && identity.identity_name) {
				setIdentityNames((prev) => ({
					...prev,
					[identityUID]: identity.identity_name,
				}));
				return identity.identity_name;
			}
		} catch (error) {
			console.error('Error fetching identity:', error);
		}

		return identityUID;
	};

	// States
	const [identityNames, setIdentityNames] = useState({});
	const [isEditing, setIsEditing] = useState(false);
	const [editedAnalyses, setEditedAnalyses] = useState([]);
	const [testIdWarningConfirmed, setTestIdWarningConfirmed] = useState(false);
	const [showTestIdWarning, setShowTestIdWarning] = useState(false);
	const [previewUrl, setPreviewUrl] = useState('');
	const [isPreviewLoading, setIsPreviewLoading] = useState(false);
	const [isMatchingData, setIsMatchingData] = useState(false);
	const [matchedDocument, setMatchedDocument] = useState(null);
	const [isComparingData, setIsComparingData] = useState(false);
	const [comparedAnalyses, setComparedAnalyses] = useState([]);
	const [isSaving, setIsSaving] = useState(false);
	const [isUpdatingResults, setIsUpdatingResults] = useState(false);
	const [showDifferencesModal, setShowDifferencesModal] = useState(false);
	const [differencesToUpdate, setDifferencesToUpdate] = useState([]);
	const [showColumnSelectionModal, setShowColumnSelectionModal] = useState(false);
	const [hasAutoCompared, setHasAutoCompared] = useState(false);
	const [selectedColumns, setSelectedColumns] = useState({
		result_value: true, // Luôn phải có
		result_unit: false,
		parameter_name: false,
		protocol_code: false,
	});

	// States for create new experiment log
	const [showPreview, setShowPreview] = useState(false);
	const [editableData, setEditableData] = useState({
		header: { title: '' },
		samples: [],
		analyses: [],
		fileId: null, // Add fileId field
	});
	const [selectedColumnsCreate, setSelectedColumnsCreate] = useState(new Set());
	const [showColumnSelectionCreate, setShowColumnSelectionCreate] = useState(false);
	const [createdDoc, setCreatedDoc] = useState(null); // Store created document after report creation
	const [isCreateMode, setIsCreateMode] = useState(!docCopy); // Track if we're in create mode

	// States for file upload in create mode
	const [showUploadModalCreate, setShowUploadModalCreate] = useState(false);
	const [uploadDataCreate, setUploadDataCreate] = useState({
		files: [],
		userTags: [],
		foreignKeyUIDs: [],
	});
	const [uploadingCreate, setUploadingCreate] = useState(false);
	const [uploadedFileInfo, setUploadedFileInfo] = useState(null); // Store uploaded file info
	const [previewUrlCreate, setPreviewUrlCreate] = useState(''); // Preview URL for create mode
	const [isPreviewLoadingCreate, setIsPreviewLoadingCreate] = useState(false); // Loading state for preview
	const [isCreatingReport, setIsCreatingReport] = useState(false); // Loading state for creating report

	// States for sample ID autocomplete
	const [sampleSearchResults, setSampleSearchResults] = useState([]);
	const [showSampleDropdown, setShowSampleDropdown] = useState(false);
	const [activeSampleInputIndex, setActiveSampleInputIndex] = useState(null);
	const [isSearchingSample, setIsSearchingSample] = useState(false);
	const [currentSamplePage, setCurrentSamplePage] = useState(1);
	const [sampleItemsPerPage, setSampleItemsPerPage] = useState(10);
	const [totalSamplePages, setTotalSamplePages] = useState(1);
	const [totalSampleItems, setTotalSampleItems] = useState(0);
	const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

	// States for TinyMCE editing (similar to ProcessingAnalysis)
	const [editableCell, setEditableCell] = useState({ analysisIndex: null, column: null });
	const [inputValue, setInputValue] = useState('');
	const [updating, setUpdating] = useState(false);

	// State to store current document copy (to handle refresh)
	const [currentDocCopy, setCurrentDocCopy] = useState(docCopy);

	// State to store converted analyses from processingAnalyses
	const [convertedAnalyses, setConvertedAnalyses] = useState([]);

	// State for attachment data
	const [attachmentData, setAttachmentData] = useState({});
	const [loadingAttachments, setLoadingAttachments] = useState(false);
	const [showFilePreview, setShowFilePreview] = useState(false);
	const [filePreviewUrl, setFilePreviewUrl] = useState('');
	const [isLoadingFilePreview, setIsLoadingFilePreview] = useState(false);

	// States for FilterableTable
	const [tableData, setTableData] = useState([]);
	const [tableSelectedRows, setTableSelectedRows] = useState(new Set());
	const [tableFilters, setTableFilters] = useState({});
	const [tableSortConfig, setTableSortConfig] = useState({ column: null, direction: null });
	const [tableLoading, setTableLoading] = useState(false);

	// Pagination states for FilterableTable
	const [tableCurrentPage, setTableCurrentPage] = useState(1);
	const [tableTotalPages, setTableTotalPages] = useState(1);
	const [tableTotalItems, setTableTotalItems] = useState(0);
	const [tableItemsPerPage, setTableItemsPerPage] = useState(20);
	const [displayedAnalysisIds, setDisplayedAnalysisIds] = useState(new Set());

	// Function to reset all state when closing modal
	const resetAllStates = () => {
		setIsEditing(false);
		setEditedAnalyses([]);
		setTestIdWarningConfirmed(false);
		setShowTestIdWarning(false);
		setPreviewUrl('');
		setIsPreviewLoading(false);
		setIsMatchingData(false);
		setMatchedDocument(null);
		setIsComparingData(false);
		setComparedAnalyses([]);
		setIsSaving(false);
		setIsUpdatingResults(false);
		setShowDifferencesModal(false);
		setDifferencesToUpdate([]);
		setShowColumnSelectionModal(false);
		setHasAutoCompared(false);
		setSelectedColumns({ result_value: true, result_unit: false, parameter_name: false, protocol_code: false });
		setShowPreview(false);
		setShowFilePreview(false);
		setFilePreviewUrl('');
		setIsLoadingFilePreview(false);
		setEditableData({ header: { title: '' }, samples: [], analyses: [], fileId: null });
		setSelectedColumnsCreate(new Set());
		setShowColumnSelectionCreate(false);
		setCreatedDoc(null); // Always reset createdDoc
		setShowUploadModalCreate(false);
		setUploadDataCreate({ files: [], userTags: [], foreignKeyUIDs: [] });
		setUploadingCreate(false);
		setUploadedFileInfo(null);
		setPreviewUrlCreate('');
		setIsPreviewLoadingCreate(false);
		setIsCreatingReport(false);
		setSampleSearchResults([]);
		setShowSampleDropdown(false);
		setActiveSampleInputIndex(null);
		setIsSearchingSample(false);
		setCurrentSamplePage(1);
		setSampleItemsPerPage(10);
		setTotalSamplePages(1);
		setTotalSampleItems(0);
		setDropdownPosition({ top: 0, left: 0 });
		// Reset TinyMCE editing states
		setEditableCell({ analysisIndex: null, column: null });
		setInputValue('');
		setUpdating(false);
		// Reset converted analyses from processingAnalyses
		setConvertedAnalyses([]);
		// Reset attachment data
		setAttachmentData({});
		setLoadingAttachments(false);
		// Reset FilterableTable states
		setTableData([]);
		setTableSelectedRows(new Set());
		setTableFilters({});
		setTableSortConfig({ column: null, direction: null });
		setTableLoading(false);
		setDisplayedAnalysisIds(new Set());
	};

	// Function to close file preview popup
	const handleCloseFilePreview = () => {
		setShowFilePreview(false);
		setFilePreviewUrl('');
		setIsLoadingFilePreview(false);
	};

	// Combined close handler to clear all state then call onClose
	const handleCloseModal = () => {
		// Force reset isCreateMode and currentDocCopy to ensure fresh state
		setIsCreateMode(!docCopy);
		setCurrentDocCopy(docCopy);

		// Reset all states completely
		resetAllStates();

		// Call parent onClose
		onClose();
	};
	// Reset all state when modal opens
	useEffect(() => {
		if (isOpen) {
			// Force clear createdDoc first when opening
			setCreatedDoc(null);

			// Reset all other states
			resetAllStates();

			// Set correct create mode based on docCopy prop
			setIsCreateMode(!docCopy);
			setCurrentDocCopy(docCopy);
		}
	}, [isOpen]);

	// Additional cleanup when docCopy changes
	useEffect(() => {
		if (isOpen && !docCopy) {
			setCreatedDoc(null);
			setIsCreateMode(true);
		} else if (isOpen && docCopy) {
			setIsCreateMode(false);
		}
	}, [isOpen, docCopy]);

	// Inject custom CSS styles for TinyMCE editing
	useEffect(() => {
		const styleSheet = document.createElement('style');
		styleSheet.textContent = customEditingStyles;
		document.head.appendChild(styleSheet);

		return () => {
			// Clean up styles when component unmounts
			if (document.head.contains(styleSheet)) {
				document.head.removeChild(styleSheet);
			}
		};
	}, []);
	// Safe cloning function for analysis data
	const safeCloneAnalyses = (analyses) => {
		if (!analyses || !Array.isArray(analyses)) return [];

		try {
			return analyses.map((analysis, index) => {
				// Only extract safe primitive values, ignore any complex objects
				const safeAnalysis = {
					sampleId: typeof analysis.sampleId === 'string' ? analysis.sampleId : String(analysis.sampleId || ''),
					testId: typeof analysis.testId === 'string' ? analysis.testId : String(analysis.testId || ''),
					testName: typeof analysis.testName === 'string' ? analysis.testName : String(analysis.testName || ''),
					testResult: typeof analysis.testResult === 'string' ? analysis.testResult : String(analysis.testResult || ''),
					testUnit: typeof analysis.testUnit === 'string' ? analysis.testUnit : String(analysis.testUnit || ''),
					testProtocolCode:
						typeof analysis.testProtocolCode === 'string'
							? analysis.testProtocolCode
							: String(analysis.testProtocolCode || ''),
				};

				// Only include difference indicators if they are safe strings
				if (analysis.sampleIdDiff !== undefined && typeof analysis.sampleIdDiff === 'string') {
					safeAnalysis.sampleIdDiff = analysis.sampleIdDiff;
				}
				if (analysis.testNameDiff !== undefined && typeof analysis.testNameDiff === 'string') {
					safeAnalysis.testNameDiff = analysis.testNameDiff;
				}
				if (analysis.testResultDiff !== undefined && typeof analysis.testResultDiff === 'string') {
					safeAnalysis.testResultDiff = analysis.testResultDiff;
				}
				if (analysis.testUnitDiff !== undefined && typeof analysis.testUnitDiff === 'string') {
					safeAnalysis.testUnitDiff = analysis.testUnitDiff;
				}
				if (analysis.testProtocolCodeDiff !== undefined && typeof analysis.testProtocolCodeDiff === 'string') {
					safeAnalysis.testProtocolCodeDiff = analysis.testProtocolCodeDiff;
				}

				// Validate the result is serializable
				try {
					JSON.stringify(safeAnalysis);
					return safeAnalysis;
				} catch (e) {
					console.error(`Safe analysis ${index} still has issues:`, e);
					// Return completely bare minimum
					return {
						sampleId: String(analysis.sampleId || ''),
						testId: String(analysis.testId || ''),
						testName: String(analysis.testName || ''),
						testResult: String(analysis.testResult || ''),
						testUnit: String(analysis.testUnit || ''),
						testProtocolCode: String(analysis.testProtocolCode || ''),
					};
				}
			});
		} catch (error) {
			console.error('Error in safeCloneAnalyses:', error);
			// Return a completely safe fallback
			return analyses.map((analysis, index) => {
				return {
					sampleId: analysis && analysis.sampleId ? String(analysis.sampleId) : '',
					testId: analysis && analysis.testId ? String(analysis.testId) : '',
					testName: analysis && analysis.testName ? String(analysis.testName) : '',
					testResult: analysis && analysis.testResult ? String(analysis.testResult) : '',
					testUnit: analysis && analysis.testUnit ? String(analysis.testUnit) : '',
					testProtocolCode: analysis && analysis.testProtocolCode ? String(analysis.testProtocolCode) : '',
				};
			});
		}
	};

	// Function to convert HTML to plain text for tooltip display
	const htmlToText = (html) => {
		if (!html) return 'Không có';
		// Create a temporary div to parse HTML
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = html;
		return tempDiv.textContent || tempDiv.innerText || 'Không có';
	};

	// Deep clean function to remove all circular references and DOM elements
	const deepCleanObject = (obj, seen = new WeakSet()) => {
		if (obj === null || typeof obj !== 'object') {
			return obj;
		}

		// Check for circular references
		if (seen.has(obj)) {
			return null;
		}

		// Check for DOM elements and React elements
		if (
			obj.nodeType ||
			obj.constructor?.name?.includes('HTML') ||
			obj.constructor?.name?.includes('DOM') ||
			obj.__reactFiber$ ||
			obj._reactInternalFiber ||
			obj.stateNode ||
			obj._owner ||
			obj.props ||
			(obj.constructor && obj.constructor.name === 'HTMLButtonElement') ||
			(obj.constructor && obj.constructor.name === 'FiberNode')
		) {
			return null;
		}

		seen.add(obj);

		if (Array.isArray(obj)) {
			const cleanedArray = [];
			for (let i = 0; i < obj.length; i++) {
				const cleaned = deepCleanObject(obj[i], seen);
				if (cleaned !== null) {
					cleanedArray.push(cleaned);
				}
			}
			seen.delete(obj);
			return cleanedArray;
		}

		// For regular objects
		const cleaned = {};
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				// Skip known problematic properties
				if (
					key.startsWith('__react') ||
					key.startsWith('_react') ||
					key === 'stateNode' ||
					key === '_owner' ||
					key === 'props' ||
					key === 'nodeType' ||
					key === 'domElement' ||
					key === 'reactComponent'
				) {
					continue;
				}

				const cleanedValue = deepCleanObject(obj[key], seen);
				if (cleanedValue !== null) {
					cleaned[key] = cleanedValue;
				}
			}
		}

		seen.delete(obj);
		return cleaned;
	};

	// Function to sanitize analysis data to prevent DOM elements from being stored
	const sanitizeAnalysisData = (analysis) => {
		if (!analysis) return analysis;

		// If it's a primitive value (string, number, boolean), it's safe
		if (typeof analysis !== 'object') return analysis;

		return deepCleanObject(analysis);
	};

	// Initialize edited analyses when document changes or convertedAnalyses updates
	useEffect(() => {
		const sourceAnalyses = currentDocCopy?.metadata?.qualifiedAnalyses || currentDocCopy?.jsonContent?.analyses || [];

		if (sourceAnalyses.length > 0) {
			setEditedAnalyses(safeCloneAnalyses(sourceAnalyses));
			// Fetch attachments for the analyses
			fetchAttachmentsForAnalyses(sourceAnalyses);
		} else if (convertedAnalyses.length > 0 && !currentDocCopy) {
			// Use convertedAnalyses when no docCopy but have processingAnalyses
			setEditedAnalyses(safeCloneAnalyses(convertedAnalyses));
			// Fetch attachments for the converted analyses
			fetchAttachmentsForAnalyses(convertedAnalyses);
		} else {
			setEditedAnalyses([]);
			setAttachmentData({});
		}
		// Reset matched document when document changes
		setMatchedDocument(null);
		setComparedAnalyses([]);
	}, [currentDocCopy, convertedAnalyses]);

	// Convert processingAnalyses to docAnalyses when docCopy is null but processingAnalyses is provided
	useEffect(() => {
		if (!docCopy && processingAnalyses && Array.isArray(processingAnalyses) && processingAnalyses.length > 0) {
			try {
				const convertedDocAnalyses = processingAnalyses.map((blackAnalysis, index) => {
					const docAnalysis = blackAnalysisToDocAnalysis(blackAnalysis);
					return docAnalysis;
				});

				setConvertedAnalyses(convertedDocAnalyses);
			} catch (error) {
				console.error('Error converting processingAnalyses:', error);
				setConvertedAnalyses([]);
			}
		} else {
			setConvertedAnalyses([]);
		}
	}, [docCopy, processingAnalyses]);

	// Update editableData.analyses when convertedAnalyses changes (for create mode)
	useEffect(() => {
		if (convertedAnalyses.length > 0 && !docCopy) {
			setEditableData((prev) => ({
				...prev,
				analyses: convertedAnalyses.map((analysis) => ({
					sampleId: analysis.sampleId || '',
					testId: analysis.testId || analysis.id || '',
					name: analysis.testName || '',
					result: analysis.testResult || '',
					unit: analysis.testUnit || '',
					method: analysis.testProtocolCode || '',
				})),
			}));
		}
	}, [convertedAnalyses, docCopy]);

	// Update currentDocCopy when docCopy prop changes
	useEffect(() => {
		setCurrentDocCopy(docCopy);
	}, [docCopy]);

	// Update create mode when docCopy changes
	useEffect(() => {
		if (currentDocCopy !== undefined) {
			// Only run when currentDocCopy is initialized
			setIsCreateMode(!currentDocCopy);
		}
	}, [currentDocCopy]);

	// Reset states when currentDocCopy changes
	useEffect(() => {
		if (currentDocCopy !== undefined) {
			// Only run when currentDocCopy is initialized
			setMatchedDocument(null);
			setComparedAnalyses([]);
		}
	}, [currentDocCopy]);

	// Initialize isCreateMode after currentDocCopy is set
	useEffect(() => {
		if (currentDocCopy !== undefined) {
			// Only run when currentDocCopy is initialized
			setIsCreateMode(!currentDocCopy);
		}
	}, [currentDocCopy]);

	// Auto compare data when component mounts with docCopy
	useEffect(() => {
		if (currentDocCopy && !isCreateMode && comparedAnalyses.length === 0 && !isComparingData) {
			handleCompareData();
		}
	}, [currentDocCopy, isCreateMode]);

	const handleEditToggle = () => {
		// Prevent editing if document is approved
		if (currentDoc?.metadata?.status === 'approved') {
			showAutoHideMessage('Không thể chỉnh sửa tài liệu đã được duyệt', 'warning');
			return;
		}

		if (isEditing) {
			// Cancel editing - reset to original data
			const sourceAnalyses = currentDocCopy?.metadata?.qualifiedAnalyses || currentDocCopy?.jsonContent?.analyses || [];
			setEditedAnalyses(safeCloneAnalyses(sourceAnalyses));
			setTestIdWarningConfirmed(false);
			setShowTestIdWarning(false);
		} else {
			// Enter editing mode - ensure editedAnalyses is initialized
			const sourceAnalyses = currentDocCopy?.metadata?.qualifiedAnalyses || currentDocCopy?.jsonContent?.analyses || [];
			if (editedAnalyses.length === 0 && sourceAnalyses.length > 0) {
				setEditedAnalyses(safeCloneAnalyses(sourceAnalyses));
			}
		}
		setIsEditing(!isEditing);
	};

	const handleSaveChanges = async (status = null) => {
		// Prevent saving if document is approved
		if (currentDoc?.metadata?.status === 'approved') {
			showAutoHideMessage('Không thể lưu thay đổi cho tài liệu đã được duyệt', 'error');
			return;
		}

		if (!currentDocCopy || !editedAnalyses) {
			showAutoHideMessage('Không có dữ liệu để lưu', 'warning');
			return;
		}

		setIsSaving(true);
		try {
			// Clean the analyses data to ensure no DOM elements or circular references
			let cleanedAnalyses = safeCloneAnalyses(editedAnalyses);

			// Additional safety: recreate analyses from scratch to ensure no contamination
			cleanedAnalyses = editedAnalyses.map((analysis, index) => {
				return {
					sampleId: analysis && analysis.sampleId ? String(analysis.sampleId) : '',
					testId: analysis && analysis.testId ? String(analysis.testId) : '',
					testName: analysis && analysis.testName ? String(analysis.testName) : '',
					testResult: analysis && analysis.testResult ? String(analysis.testResult) : '',
					testUnit: analysis && analysis.testUnit ? String(analysis.testUnit) : '',
					testProtocolCode: analysis && analysis.testProtocolCode ? String(analysis.testProtocolCode) : '',
				};
			});

			// Validate cleaned data is serializable
			try {
				JSON.stringify(cleanedAnalyses);
			} catch (serializationError) {
				console.error('❌ Cleaned analyses still has serialization issues:', serializationError);
				throw new Error('Data serialization failed');
			}

			// Recreate metadata completely from scratch with only safe primitive values
			const cleanedMetadata = {
				// Only include essential metadata fields with safe values
				qualifiedAnalyses: cleanedAnalyses,
				...(status && { status: String(status) }),
				// Add other essential fields if they exist and are safe
				...(currentDocCopy.metadata?.submittedByUID && {
					submittedByUID: String(currentDocCopy.metadata.submittedByUID),
				}),
				...(currentDocCopy.metadata?.identityUID && { identityUID: String(currentDocCopy.metadata.identityUID) }),
				...(currentDocCopy.metadata?.samples &&
					Array.isArray(currentDocCopy.metadata.samples) && {
						samples: currentDocCopy.metadata.samples.map((sample) => ({
							sampleId: String(sample?.sampleId || ''),
							...(sample?.name && { name: String(sample.name) }),
						})),
					}),
			};

			// Prepare the request body with completely cleaned data - created from scratch
			const requestBody = {
				doc: {
					id: String(currentDocCopy.id),
					metadata: cleanedMetadata,
				},
			};

			// Final check: ensure the entire request body is serializable
			try {
				JSON.stringify(requestBody);
			} catch (finalError) {
				console.error('❌ Request body still has circular references after complete recreation:', finalError);
				throw new Error('Không thể tạo request body an toàn. Vui lòng refresh trang và thử lại.');
			}

			// Call the API
			const response = await apiPost('https://red.irdop.org/v1/doc/update', requestBody);

			if (response.status === 200) {
				// Update the document with new data from response
				if (response.data && response.data.docs) {
					// Update the local document data
					const updatedDoc = response.data.docs;

					// Update the selectedDetailDocument to reflect changes
					const newDocument = {
						...currentDocCopy,
						metadata: {
							...currentDocCopy.metadata,
							qualifiedAnalyses: editedAnalyses,
						},
					};

					// Trigger a refresh of the documents list
					refreshData();

					showAutoHideMessage('Đã lưu thay đổi thành công!', 'success');
				} else {
					showAutoHideMessage('Đã lưu thành công!', 'success');
				}

				// Load lại dữ liệu từ server sau khi lưu thành công
				await refreshDocCopy(currentDocCopy.id);
			} else {
				throw new Error(response.data?.message || 'Lỗi khi lưu dữ liệu');
			}
		} catch (error) {
			console.error('Error saving changes:', error);
			showAutoHideMessage('Lỗi khi lưu: ' + (error.message || 'Unknown error'), 'error');
			return; // Don't exit editing mode if save failed
		} finally {
			setIsSaving(false);
		}

		// Only exit editing mode if save was successful
		setIsEditing(false);
		setTestIdWarningConfirmed(false);
		setShowTestIdWarning(false);
	};

	const handleAddAnalysis = () => {
		const newAnalysis = {
			sampleId: '',
			testId: '',
			testName: '',
			testResult: '',
			testUnit: '',
			testProtocolCode: '',
		};
		setEditedAnalyses([...editedAnalyses, newAnalysis]);
	};

	const handleRemoveAnalysis = (index) => {
		const updatedAnalyses = editedAnalyses.filter((_, i) => i !== index);
		setEditedAnalyses(updatedAnalyses);
	};

	const handleAnalysisChange = (index, field, value) => {
		// Sanitize the value to ensure no DOM elements are stored
		const sanitizedValue = sanitizeAnalysisData(value);
		if (sanitizedValue === null) {
			console.error('Attempted to store invalid data in analysis, ignoring');
			return;
		}

		const updatedAnalyses = [...editedAnalyses];
		updatedAnalyses[index] = { ...updatedAnalyses[index], [field]: sanitizedValue };
		setEditedAnalyses(updatedAnalyses);
	};

	const handleTestIdChange = (index, value) => {
		if (!testIdWarningConfirmed && value.trim() !== '') {
			setShowTestIdWarning(true);
			return;
		}
		handleAnalysisChange(index, 'testId', value);
	};

	const confirmTestIdWarning = () => {
		setTestIdWarningConfirmed(true);
		setShowTestIdWarning(false);
	};

	// Handle file preview in modal
	const handleFilePreviewInModal = async () => {
		if (!currentDocCopy.fileId) return;

		setIsPreviewLoading(true);
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: 'view',
				fileRecord: { id: currentDocCopy.fileId },
			});

			if (response.status === 200 && response.data) {
				setPreviewUrl(response.data);
			}
		} catch (error) {
			console.error('Preview failed:', error);
		} finally {
			setIsPreviewLoading(false);
		}
	};

	// Function to fetch attachments for analyses
	const fetchAttachmentsForAnalyses = async (analyses) => {
		if (!analyses || analyses.length === 0) return;

		setLoadingAttachments(true);
		try {
			const testIds = analyses.map((analysis) => analysis.testId || analysis.id).filter((id) => id);
			if (testIds.length === 0) return;

			const response = await apiPost('https://red.irdop.org/v1/file/get_by_key', {
				foreignKeyUIDs: testIds,
			});

			if (response.status === 200 && response.data && Array.isArray(response.data)) {
				const attachmentsByTestId = {};
				response.data.forEach((attachment) => {
					if (attachment.foreignKeyUIDs && Array.isArray(attachment.foreignKeyUIDs)) {
						attachment.foreignKeyUIDs.forEach((testId) => {
							if (!attachmentsByTestId[testId]) {
								attachmentsByTestId[testId] = [];
							}
							attachmentsByTestId[testId].push(attachment);
						});
					}
				});
				setAttachmentData(attachmentsByTestId);
			}
		} catch (error) {
			console.error('Error fetching attachments:', error);
			setAttachmentData({});
		} finally {
			setLoadingAttachments(false);
		}
	};

	// Function to handle attachment preview
	const handleAttachmentPreview = async (fileId, fileName) => {
		try {
			setIsLoadingFilePreview(true);
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: 'view',
				fileRecord: { id: fileId },
			});

			if (response.status === 200 && response.data) {
				// Show in popup modal instead of new tab
				setFilePreviewUrl(response.data);
				setShowFilePreview(true);
			} else {
				showAutoHideMessage('Không thể tải file preview', 'error');
			}
		} catch (error) {
			console.error('Preview failed:', error);
			showAutoHideMessage('Lỗi khi tải file preview', 'error');
		} finally {
			setIsLoadingFilePreview(false);
		}
	};

	// Close preview in modal
	const handleClosePreviewInModal = () => {
		setPreviewUrl('');
	};

	// TinyMCE editing functions (adapted from ProcessingAnalysis)
	const handleCellClick = (analysisIndex, column, currentValue) => {
		if (!isEditing) return;

		setEditableCell({ analysisIndex, column });
		setInputValue(currentValue || '');
	};

	const handleSaveContentCreate = async (content, column, analysisIndex) => {
		if (!isCreateMode) return;

		try {
			setUpdating(true);

			// Sanitize the content to ensure no DOM elements are stored
			const sanitizedContent = sanitizeAnalysisData(content);
			if (sanitizedContent === null) {
				console.error('Attempted to save invalid content, ignoring');
				return;
			}

			// Update the editableData analyses array
			const newEditableData = { ...editableData };
			if (newEditableData.analyses[analysisIndex]) {
				newEditableData.analyses[analysisIndex][column] = sanitizedContent;
				setEditableData(newEditableData);
			}

			// Reset editing state
			setEditableCell({ analysisIndex: null, column: null });
			setInputValue('');
		} catch (error) {
			console.error('Error saving content:', error);
		} finally {
			setUpdating(false);
		}
	};

	const handleKeyDownCreate = (e) => {
		if (e.key === 'Escape') {
			setEditableCell({ analysisIndex: null, column: null });
			setInputValue('');
		}
	};

	// Open editor with auto-save previous cell for create mode
	const openEditorWithAutoSaveCreate = async (analysisIndex, column, currentValue) => {
		if (!isCreateMode) return;

		// Auto-save previous cell if it was being edited
		if (editableCell.analysisIndex !== null && editableCell.column !== null) {
			const prevContent = inputValue;
			if (editableCell.analysisIndex !== analysisIndex || editableCell.column !== column) {
				await handleSaveContentCreate(prevContent, editableCell.column, editableCell.analysisIndex);
			}
		}

		// Open new editor
		setEditableCell({ analysisIndex, column });
		setInputValue(currentValue || '');
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Escape') {
			setEditableCell({ analysisIndex: null, column: null });
			setInputValue('');
		}
	};

	// Open editor with auto-save previous cell
	const openEditorWithAutoSave = async (analysisIndex, column, currentValue) => {
		if (!isEditing) return;

		// Auto-save previous cell if it was being edited
		if (editableCell.analysisIndex !== null && editableCell.column !== null) {
			const prevContent = inputValue;
			if (editableCell.analysisIndex !== analysisIndex || editableCell.column !== column) {
				await handleSaveContent(prevContent, editableCell.column, editableCell.analysisIndex);
			}
		}

		// Open new editor
		setEditableCell({ analysisIndex, column });
		setInputValue(currentValue || '');
	};

	// Handle data matching
	const handleMatchData = async () => {
		if (!currentDocCopy) return;

		setIsMatchingData(true);
		try {
			const response = await apiPost('https://red.irdop.org/v1/doc/match/analysis', {
				doc: currentDocCopy.originalData || currentDocCopy,
			});

			if (response.status === 200 && response.data && response.data.doc) {
				setMatchedDocument(response.data.doc);
				showAutoHideMessage('Khớp dữ liệu thành công!', 'success');
			} else {
				showAutoHideMessage('Không thể khớp dữ liệu', 'error');
			}
		} catch (error) {
			console.error('Match data failed:', error);
			showAutoHideMessage('Lỗi khi khớp dữ liệu: ' + (error.message || 'Unknown error'), 'error');
		} finally {
			setIsMatchingData(false);
		}
	};

	// Function to convert from doc analysis naming (camelCase) to black analysis naming (snake_case)
	const docAnalysisToBlackAnalysis = (docAnalysis) => {
		return {
			id: docAnalysis.testId || docAnalysis.id,
			_deprecated_sampleUid: docAnalysis.sampleId,
			parameter_name: docAnalysis.testName,
			result_value: docAnalysis.testResult,
			result_unit: docAnalysis.testUnit,
			protocol_code: docAnalysis.testProtocolCode,
		};
	};

	// Function to convert from black analysis naming (snake_case) to doc analysis naming (camelCase)
	const blackAnalysisToDocAnalysis = (blackAnalysis) => {
		const result = {
			id: blackAnalysis.id,
			testId: blackAnalysis.id,
			sampleId: blackAnalysis._deprecated_sampleUid,
			testName: blackAnalysis.parameter_name,
			testResult: blackAnalysis.result_value,
			testUnit: blackAnalysis.result_unit,
			testProtocolCode: blackAnalysis.protocol_code,
		};
		return result;
	};

	// Function to determine differences between analyses
	const getAnalysisDifferences = (extracted, matched) => {
		if (!matched) return extracted;
		const diffObj = { ...extracted };

		// So sánh các field: parameterName, protocolCode, sampleUID
		const fieldsToCompare = ['testName', 'testProtocolCode', 'sampleId'];
		fieldsToCompare.forEach((field) => {
			const extractedValue = extracted[field] || '';
			const matchedValue = matched[field] || '';
			if (extractedValue !== matchedValue) {
				diffObj[field + 'Diff'] = matched[field];
			}
		});

		// So sánh resultValue - hiển thị difference nếu khác nhau
		const extractedResult = extracted.testResult || '';
		const matchedResult = matched.testResult || '';
		if (extractedResult !== matchedResult) {
			diffObj.testResultDiff = matched.testResult;
		}

		// So sánh resultUnit - hiển thị difference nếu khác nhau
		const extractedUnit = extracted.testUnit || '';
		const matchedUnit = matched.testUnit || '';
		if (extractedUnit !== matchedUnit) {
			diffObj.testUnitDiff = matched.testUnit;
		}

		return diffObj;
	};

	// Handle data comparison
	const handleCompareData = async () => {
		if (!currentDocCopy) return;

		setIsComparingData(true);
		try {
			// Get current analyses from document
			const currentAnalyses = currentDocCopy.metadata?.qualifiedAnalyses || currentDocCopy.jsonContent?.analyses || [];
			if (currentAnalyses.length === 0) {
				showAutoHideMessage('Không có dữ liệu phân tích để đối chiếu', 'warning');
				setIsComparingData(false);
				return;
			}

			// Extract analysis IDs for API call
			const analysisIds = currentAnalyses
				.map((a) => a.id || a.testId)
				.filter((id) => id)
				.map((id) => id);

			if (analysisIds.length === 0) {
				showAutoHideMessage('Không tìm thấy ID hợp lệ để đối chiếu', 'warning');
				setIsComparingData(false);
				return;
			}

			// Call API to get matched analysis data
			const response = await apiPost('https://black.irdop.org/v1/analysis/get_bulk', {
				listIds: analysisIds,
			});

			let matchAnalysis = [];
			if (response.status === 200 && response.data) {
				if (Array.isArray(response.data)) {
					matchAnalysis = response.data.map(blackAnalysisToDocAnalysis);
				} else if (response.data.result && Array.isArray(response.data.result)) {
					matchAnalysis = response.data.result.map(blackAnalysisToDocAnalysis);
				}
			}

			// Merge current analyses with matched data using differences function
			const mergedAnalyses = currentAnalyses.map((analysis) => {
				const matched = matchAnalysis.find((m) => m.id === analysis.id || m.id === analysis.testId);
				return getAnalysisDifferences(analysis, matched);
			});

			setComparedAnalyses(mergedAnalyses);
			showAutoHideMessage('Đối chiếu dữ liệu thành công!', 'success');
		} catch (error) {
			console.error('Compare data failed:', error);
			showAutoHideMessage('Lỗi khi đối chiếu dữ liệu: ' + (error.message || 'Unknown error'), 'error');
		} finally {
			setIsComparingData(false);
		}
	};

	// Handle update results
	const handleUpdateResults = async () => {
		// Prevent updating if document is approved
		if (currentDoc?.metadata?.status === 'approved') {
			showAutoHideMessage('Không thể cập nhật kết quả cho tài liệu đã được duyệt', 'warning');
			return;
		}

		// Get current analyses based on current state
		const displayDocument = matchedDocument || currentDoc;
		const analyses = isEditing
			? editedAnalyses
			: comparedAnalyses.length > 0
			? comparedAnalyses
			: displayDocument.metadata?.qualifiedAnalyses || displayDocument.jsonContent?.analyses || [];
		const currentAnalyses = isEditing ? editedAnalyses : analyses;
		// Check if all analyses have id
		const analysesWithoutId = currentAnalyses.filter((analysis) => !analysis.testId || analysis.testId === '');
		if (analysesWithoutId.length > 0) {
			showAutoHideMessage(
				`Có ${analysesWithoutId.length} phân tích chưa có ID. Vui lòng bổ sung ID trước khi cập nhật kết quả.`,
				'error',
			);
			return;
		}

		// Show column selection modal first
		setShowColumnSelectionModal(true);
	};

	// Process update with selected columns
	const processUpdateWithSelectedColumns = async () => {
		const currentAnalyses = editedAnalyses;

		setIsUpdatingResults(true);
		setShowColumnSelectionModal(false);
		try {
			// Extract analysis IDs for comparison API call
			const analysisIds = currentAnalyses.map((a) => a.testId).map((id) => id);
			if (analysisIds.length === 0) {
				showAutoHideMessage('Không tìm thấy ID hợp lệ để so sánh', 'warning');
				setIsUpdatingResults(false);
				return;
			}

			// Call API to get current data from database for comparison
			const response = await apiPost('https://black.irdop.org/v1/analysis/get_bulk', {
				listIds: analysisIds,
			});

			let matchAnalysis = [];
			if (response.status === 200 && response.data) {
				if (Array.isArray(response.data)) {
					matchAnalysis = response.data.map(blackAnalysisToDocAnalysis);
				} else if (response.data.result && Array.isArray(response.data.result)) {
					matchAnalysis = response.data.result.map(blackAnalysisToDocAnalysis);
				}
			}

			// Compare and find differences based on selected columns
			const comparisons = currentAnalyses.map((current) => {
				const matched = matchAnalysis.find((m) => m.testId === current.testId);
				if (!matched) return { ...current, hasChanges: false };

				let hasChanges = false;

				// Check only selected columns
				if (selectedColumns.result_value && current.testResult !== matched.testResult) {
					hasChanges = true;
				}
				if (selectedColumns.result_unit && current.testUnit !== matched.testUnit) {
					hasChanges = true;
				}
				if (selectedColumns.parameter_name && current.testName !== matched.testName) {
					hasChanges = true;
				}
				if (selectedColumns.protocol_code && current.testProtocolCode !== matched.testProtocolCode) {
					hasChanges = true;
				}

				return {
					...current,
					hasChanges,
					originalData: matched,
				};
			});

			const changedAnalyses = comparisons.filter((a) => a.hasChanges);

			if (changedAnalyses.length === 0) {
				showAutoHideMessage('Không có thay đổi nào để cập nhật', 'info');
				setIsUpdatingResults(false);
				return;
			}

			// Show differences modal for confirmation
			setDifferencesToUpdate(changedAnalyses);
			setShowDifferencesModal(true);
		} catch (error) {
			console.error('Error checking for differences:', error);
			showAutoHideMessage('Lỗi khi kiểm tra sự khác biệt: ' + (error.message || 'Unknown error'), 'error');
		} finally {
			setIsUpdatingResults(false);
		}
	};

	// Confirm and send bulk update
	const confirmBulkUpdate = async () => {
		try {
			setIsUpdatingResults(true);
			const analysesToUpdate = differencesToUpdate.map((analysis) => {
				const updateObj = {
					id: analysis.testId, // Always include id
					doc_id: currentDoc.id,
				};

				// Only include selected columns
				if (selectedColumns.result_value) {
					updateObj.result_value = analysis.testResult;
				}
				if (selectedColumns.result_unit) {
					updateObj.result_unit = analysis.testUnit;
				}
				if (selectedColumns.parameter_name) {
					updateObj.parameter_name = analysis.testName;
				}
				if (selectedColumns.protocol_code) {
					updateObj.protocol_code = analysis.testProtocolCode;
				}

				return updateObj;
			});
			const response = await apiPost('https://black.irdop.org/v1/db/update/bulk/analyses', {
				analyses: analysesToUpdate,
			});

			if (response.status === 200) {
				showAutoHideMessage(`Đã cập nhật ${analysesToUpdate.length} kết quả thành công!`, 'success');

				// Update document status to 'approved' using handleSaveChanges
				await handleSaveChanges('approved');

				setShowDifferencesModal(false);
				setDifferencesToUpdate([]);
			} else {
				throw new Error(response.data?.message || 'Lỗi khi cập nhật kết quả');
			}
		} catch (error) {
			console.error('Error updating results:', error);
			showAutoHideMessage('Lỗi khi cập nhật kết quả: ' + (error.message || 'Unknown error'), 'error');
		} finally {
			setIsUpdatingResults(false);
		}
	};

	// Show auto-hide message function
	const showAutoHideMessage = (message, type = 'info') => {
		if (typeof document === 'undefined' || !document) return;

		const existingMessage = document.getElementById('autoHideMessage');
		if (existingMessage) {
			existingMessage.remove();
		}

		const messageDiv = document.createElement('div');
		messageDiv.id = 'autoHideMessage';
		messageDiv.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 12px 20px;
			border-radius: 6px;
			color: white;
			font-weight: 500;
			z-index: 10000;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			opacity: 0;
			transform: translateX(100%);
			transition: all 0.3s ease;
		`;

		switch (type) {
			case 'success':
				messageDiv.style.background = '#10b981';
				break;
			case 'error':
				messageDiv.style.background = '#ef4444';
				break;
			case 'warning':
				messageDiv.style.background = '#f59e0b';
				break;
			default:
				messageDiv.style.background = '#3b82f6';
		}

		messageDiv.textContent = message;
		document.body.appendChild(messageDiv);

		setTimeout(() => {
			messageDiv.style.opacity = '1';
			messageDiv.style.transform = 'translateX(0)';
		}, 100);

		setTimeout(() => {
			messageDiv.style.opacity = '0';
			messageDiv.style.transform = 'translateX(100%)';
			setTimeout(() => {
				if (messageDiv.parentNode) {
					messageDiv.remove();
				}
			}, 300);
		}, 1800);
	};

	// Refresh data function (passed from parent)
	const refreshData = () => {
		// This will be passed from parent component
		if (window.refreshExperimentLogData) {
			window.refreshExperimentLogData();
		}
	};

	// Functions for create new experiment log
	const handleEditToggleCreate = () => {
		setIsEditing(!isEditing);
	};

	const handlePreviewCreate = () => {
		setShowPreview(!showPreview);
	};

	const handleUploadFileCreate = () => {
		setShowUploadModalCreate(true);
	};

	// File upload handlers for create mode
	const handleFileUploadCreate = async () => {
		if (uploadDataCreate.files.length === 0) {
			showAutoHideMessage('Vui lòng chọn file để tải lên', 'error');
			return;
		}

		setUploadingCreate(true);
		try {
			for (const file of uploadDataCreate.files) {
				// Build upload payload
				const uploadPayload = {
					originInfo: {
						fileName: file.name,
						mimeType: file.type,
						fileSize: file.size,
					},
					userTags: uploadDataCreate.userTags,
				};

				// Add foreign keys if provided
				if (uploadDataCreate.foreignKeyUIDs && uploadDataCreate.foreignKeyUIDs.length > 0) {
					uploadPayload.foreignKeyUIDs = uploadDataCreate.foreignKeyUIDs;
				}

				// Get upload URL from API
				const uploadResponse = await apiPost('https://red.irdop.org/v1/file/get/upload_link', uploadPayload);

				if (uploadResponse.status === 200 && uploadResponse.data) {
					// Extract id and url from response
					const { url, id } = uploadResponse.data;

					// Upload file to the returned URL
					const fileUploadResponse = await fetch(url, {
						method: 'PUT',
						body: file,
						headers: {
							'Content-Type': file.type,
						},
					});

					// If file upload successful, update object status to OK
					if (fileUploadResponse.status === 200 && id) {
						await apiPost('https://red.irdop.org/v1/file/update/file', {
							id: id,
							updateData: {
								objectStatus: 'OK',
							},
						});

						// Set fileId in editableData
						setEditableData((prev) => ({ ...prev, fileId: id }));

						// Store uploaded file info for display
						setUploadedFileInfo({
							id: id,
							fileName: file.name,
							fileSize: file.size,
							mimeType: file.type,
							uploadedAt: new Date().toISOString(),
						});
					}
				}
			}

			showAutoHideMessage('Tải file lên thành công!', 'success');
			setShowUploadModalCreate(false);
			setUploadDataCreate({
				files: [],
				userTags: [],
				foreignKeyUIDs: [],
			});
		} catch (error) {
			console.error('Upload error:', error);
			showAutoHideMessage('Lỗi kết nối khi tải file lên', 'error');
		} finally {
			setUploadingCreate(false);
		}
	};

	const handleFileSelectCreate = (event) => {
		const selectedFiles = Array.from(event.target.files);
		setUploadDataCreate({
			...uploadDataCreate,
			files: selectedFiles,
		});
	};

	const handleDragOverCreate = (event) => {
		event.preventDefault();
		event.stopPropagation();
	};

	const handleDropCreate = (event) => {
		event.preventDefault();
		event.stopPropagation();
		const files = Array.from(event.dataTransfer.files);
		setUploadDataCreate({
			...uploadDataCreate,
			files: [...uploadDataCreate.files, ...files],
		});
	};

	const handleRemoveFileCreate = (indexToRemove) => {
		setUploadDataCreate({
			...uploadDataCreate,
			files: uploadDataCreate.files.filter((_, index) => index !== indexToRemove),
		});
	};

	const handleUploadCategoryChangeCreate = (category, isChecked) => {
		setUploadDataCreate((prev) => ({
			...prev,
			userTags: isChecked ? [...prev.userTags, category] : prev.userTags.filter((tag) => tag !== category),
		}));
	};

	const handleForeignKeyInputCreate = (value) => {
		const keys = value
			.split(',')
			.map((key) => key.trim())
			.filter((key) => key);
		setUploadDataCreate({
			...uploadDataCreate,
			foreignKeyUIDs: keys,
		});
	};

	const handleCloseUploadModalCreate = () => {
		setShowUploadModalCreate(false);
		setUploadDataCreate({
			files: [],
			userTags: [],
			foreignKeyUIDs: [],
		});
		setUploadedFileInfo(null); // Reset uploaded file info
		setPreviewUrlCreate(''); // Reset preview URL
	};

	// Handle file preview in create mode
	const handleFilePreviewCreate = async () => {
		if (!editableData.fileId) return;

		setIsPreviewLoadingCreate(true);
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: 'view',
				fileRecord: { id: editableData.fileId },
			});

			if (response.status === 200 && response.data) {
				setPreviewUrlCreate(response.data);
			}
		} catch (error) {
			console.error('Preview failed:', error);
			showAutoHideMessage('Lỗi khi tải file preview', 'error');
		} finally {
			setIsPreviewLoadingCreate(false);
		}
	};

	// Close preview in create mode
	const handleClosePreviewCreate = () => {
		setPreviewUrlCreate('');
	};

	const handleUpdateResultsCreate = () => {
		setShowColumnSelectionCreate(true);
	};

	const handleCompareDataCreate = () => {
		// Handle data comparison logic
	};

	const handleSaveCreate = async () => {
		try {
			// Prepare the request body for creating new data
			const requestBody = {
				title: editableData.header.title,
				analyses: editableData.analyses,
				fileId: editableData.fileId || null,
			};

			// Call the API to create new lab result data
			const response = await apiPost('https://red.irdop.org/v1/lab/result/new_data', requestBody);

			if (response.status === 200) {
				showAutoHideMessage('Đã lưu dữ liệu thành công!', 'success');
			} else {
				throw new Error(response.data?.message || 'Lỗi khi lưu dữ liệu');
			}
		} catch (error) {
			console.error('Error saving create data:', error);
			showAutoHideMessage('Lỗi khi lưu: ' + (error.message || 'Unknown error'), 'error');
		}
	};

	const handleSaveAfterCreation = async () => {
		try {
			// Prepare analyses data for bulk update
			const analysesToUpdate = editableData.analyses.map((analysis) => ({
				id: analysis.testId,
				_deprecated_sampleUid: analysis.sampleId,
				parameter_name: analysis.name,
				result_value: analysis.result,
				result_unit: analysis.unit,
				protocol_code: analysis.method,
			}));

			// Call bulk update API
			const response = await apiPost('https://black.irdop.org/v1/db/update/bulk/analyses', {
				analyses: analysesToUpdate,
			});

			if (response.status === 200) {
				showAutoHideMessage('Đã cập nhật kết quả thành công!', 'success');
			} else {
				throw new Error(response.data?.message || 'Lỗi khi cập nhật kết quả');
			}
		} catch (error) {
			console.error('Error updating analyses:', error);
			showAutoHideMessage('Lỗi khi cập nhật: ' + (error.message || 'Unknown error'), 'error');
		}
	};

	// Hàm refresh để load lại dữ liệu từ server
	const refreshDocCopy = async (docId) => {
		if (!docId) return;

		try {
			// Gọi API để fetch lại dữ liệu docCopy mới nhất từ server
			// Dựa trên các endpoint khác trong mã, tôi dùng '/v1/doc/get' để lấy docCopy theo ID
			const response = await apiPost('https://red.irdop.org/v1/document/get_doc', { docId: docId });

			if (response.status === 200 && response.data) {
				// Cập nhật state với dữ liệu mới từ server
				const refreshedDoc = response.data;

				if (isCreateMode) {
					setCreatedDoc(refreshedDoc);
					// Đảm bảo ở chế độ detail
					setIsCreateMode(false);
				}

				// Cập nhật currentDocCopy với dữ liệu mới
				setCurrentDocCopy(refreshedDoc);

				// Cập nhật cả matchedDocument để đảm bảo hiển thị dữ liệu mới
				if (matchedDocument) {
					setMatchedDocument(refreshedDoc);
				}

				// Nếu có document được tạo, cập nhật nó
				if (createdDoc) {
					setCreatedDoc(refreshedDoc);
				}

				// Cập nhật editedAnalyses với dữ liệu mới từ server
				const sourceAnalyses = refreshedDoc?.metadata?.qualifiedAnalyses || refreshedDoc?.jsonContent?.analyses || [];
				if (sourceAnalyses.length > 0) {
					setEditedAnalyses(safeCloneAnalyses(sourceAnalyses));
				}

				// Reset các state liên quan để đảm bảo re-render
				setEditableData({
					header: { title: '' },
					samples: [],
					analyses: [],
					fileId: null,
				});

				// Reset editing states
				setEditableCell({ analysisIndex: null, column: null });
				setInputValue('');

				// Reset compared analyses để force refresh hiển thị
				setComparedAnalyses([]);

				// Hiển thị thông báo thành công
				showAutoHideMessage('Đã load lại dữ liệu biên bản thành công!', 'success');
			} else {
				throw new Error('Không thể load lại dữ liệu từ server');
			}
		} catch (error) {
			console.error('❌ Error refreshing docCopy:', error);
			showAutoHideMessage('Lỗi khi load lại dữ liệu: ' + (error.message || 'Unknown error'), 'error');
		}
	};

	const handleSubmitReport = async () => {
		setIsCreatingReport(true);
		try {
			// Prepare the request body with correct analyses format
			const requestBody = {
				title: editableData.header.title,
				analyses: editableData.analyses.map((analysis) => ({
					sampleId: analysis.sampleId,
					testId: analysis.testId,
					testName: analysis.name,
					testUnit: analysis.unit,
					testResult: analysis.result,
					testProtocolCode: analysis.method,
				})),
				fileId: editableData.fileId || null,
			};

			// Call the API
			const response = await apiPost('https://red.irdop.org/v1/analysis/report/create_doc', requestBody);

			if (response.status === 200) {
				showAutoHideMessage('Đã tạo biên bản thành công!', 'success');

				// Load lại toàn bộ dữ liệu từ server để chuyển sang chế độ detail
				if (response.data && response.data.doc) {
					await refreshDocCopy(response.data.doc.id);
				} else {
					throw new Error('Không thể lấy ID của biên bản vừa tạo');
				}
			} else {
				throw new Error(response.data?.message || 'Lỗi khi tạo biên bản');
			}
		} catch (error) {
			console.error('Error submitting report:', error);
			showAutoHideMessage('Lỗi khi tạo biên bản: ' + (error.message || 'Unknown error'), 'error');
		} finally {
			setIsCreatingReport(false);
		}
	};

	const handleAnalysisChangeCreate = (index, field, value) => {
		const updatedAnalyses = [...editableData.analyses];
		updatedAnalyses[index] = { ...updatedAnalyses[index], [field]: value };
		setEditableData((prev) => ({ ...prev, analyses: updatedAnalyses }));
	};

	const handleAddAnalysisCreate = () => {
		const newAnalysis = {
			sampleId: '',
			testId: '',
			name: '',
			result: '',
			unit: '',
			method: '',
		};
		setEditableData((prev) => ({
			...prev,
			analyses: [...prev.analyses, newAnalysis],
		}));
	};

	const handleRemoveAnalysisCreate = (index) => {
		const updatedAnalyses = editableData.analyses.filter((_, i) => i !== index);
		setEditableData((prev) => ({ ...prev, analyses: updatedAnalyses }));
	};

	// Debounce function for sample search
	const debounce = (func, delay) => {
		let timeoutId;
		return (...args) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(null, args), delay);
		};
	};

	// Search sample ID function
	const searchSampleId = async (sampleId, index, page = 1) => {
		if (sampleId.length < 4) {
			setSampleSearchResults([]);
			setShowSampleDropdown(false);
			setCurrentSamplePage(1);
			setTotalSamplePages(1);
			setTotalSampleItems(0);
			return;
		}

		setIsSearchingSample(true);
		try {
			// Collect sampleIds and parameters from current analyses
			const sampleIds = editableData.analyses
				.map((analysis) => analysis.sampleId || analysis.sampleId)
				.filter((id) => id && id.trim() !== '')
				.filter((id, idx, arr) => arr.indexOf(id) === idx); // Remove duplicates

			const parameters = editableData.analyses
				.map((analysis) => analysis.method || analysis.testProtocolCode)
				.filter((param) => param && param.trim() !== '')
				.filter((param, idx, arr) => arr.indexOf(param) === idx); // Remove duplicates

			const response = await apiPost('https://black.irdop.org/v1/analysis/search_by_sample', {
				sampleId: sampleId,
				itemsPerPage: sampleItemsPerPage,
				page: page,
				sampleIds: sampleIds,
				parameters: parameters,
			});

			if (response.status === 200 && response.data) {
				const results = response.data.result || [];
				const pagination = response.data.pagination || {};

				setSampleSearchResults(results);
				setShowSampleDropdown(results.length > 0);
				setActiveSampleInputIndex(index);
				setCurrentSamplePage(pagination.currentPage || page);
				setTotalSamplePages(pagination.totalPages || 1);
				setTotalSampleItems(pagination.totalItems || results.length);
			} else {
				setSampleSearchResults([]);
				setShowSampleDropdown(false);
				setCurrentSamplePage(1);
				setTotalSamplePages(1);
				setTotalSampleItems(0);
			}
		} catch (error) {
			console.error('Error searching sample:', error);
			setSampleSearchResults([]);
			setShowSampleDropdown(false);
			setCurrentSamplePage(1);
			setTotalSamplePages(1);
			setTotalSampleItems(0);
		} finally {
			setIsSearchingSample(false);
		}
	};

	// Debounced search function
	const debouncedSearchSampleId = debounce((sampleId, index, page = 1) => {
		searchSampleId(sampleId, index, page);
	}, 300);

	// Handle sample ID change with autocomplete
	const handleSampleIdChangeCreate = (index, value) => {
		handleAnalysisChangeCreate(index, 'sampleId', value);
		if (value.length >= 4) {
			setCurrentSamplePage(1); // Reset to first page when searching new term
			debouncedSearchSampleId(value, index, 1);
		} else {
			setSampleSearchResults([]);
			setShowSampleDropdown(false);
			setCurrentSamplePage(1);
			setTotalSamplePages(1);
			setTotalSampleItems(0);
		}
	};

	// Handle selecting sample from dropdown
	const handleSelectSample = (index, selectedSample) => {
		const updatedAnalyses = [...editableData.analyses];
		updatedAnalyses[index] = {
			...updatedAnalyses[index],
			sampleId: selectedSample.sampleId,
			testId: selectedSample.id,
			name: selectedSample.parameterName,
			method: selectedSample.protocolCode,
		};
		setEditableData((prev) => ({ ...prev, analyses: updatedAnalyses }));
		setShowSampleDropdown(false);
		setSampleSearchResults([]);
		setActiveSampleInputIndex(null);
		setCurrentSamplePage(1);
		setTotalSamplePages(1);
		setTotalSampleItems(0);
	};

	// Handle sample ID change in detail edit mode with autocomplete
	const handleSampleIdChangeDetail = (index, value) => {
		handleAnalysisChange(index, 'sampleId', value);
		if (value.length >= 4) {
			setCurrentSamplePage(1);
			debouncedSearchSampleId(value, index, 1);
		} else {
			setSampleSearchResults([]);
			setShowSampleDropdown(false);
			setCurrentSamplePage(1);
			setTotalSamplePages(1);
			setTotalSampleItems(0);
		}
	};

	// Handle selecting sample in detail edit mode
	const handleSelectSampleDetail = (index, selectedSample) => {
		const updated = [...editedAnalyses];
		updated[index] = {
			...updated[index],
			sampleId: selectedSample.sampleId,
			testId: selectedSample.id,
			testName: selectedSample.parameterName,
			testProtocolCode: selectedSample.protocolCode,
		};
		setEditedAnalyses(updated);
		setShowSampleDropdown(false);
		setSampleSearchResults([]);
		setActiveSampleInputIndex(null);
		setCurrentSamplePage(1);
		setTotalSamplePages(1);
		setTotalSampleItems(0);
	};

	// Handle page change for sample search
	const handleSamplePageChange = (newPage) => {
		if (newPage >= 1 && newPage <= totalSamplePages && activeSampleInputIndex !== null) {
			const currentSampleId = editableData.analyses[activeSampleInputIndex]?.sampleId || '';
			if (currentSampleId.length >= 4) {
				setCurrentSamplePage(newPage);
				searchSampleId(currentSampleId, activeSampleInputIndex, newPage);
			}
		}
	};

	// Handle clicking outside to close dropdown
	const handleClickOutside = (e) => {
		if (!e || !e.target) return;
		if (
			!e.target.closest('.sample-dropdown-container') &&
			!e.target.closest('.sample-detail-dropdown') &&
			!e.target.closest('.sample-dropdown-portal')
		) {
			setShowSampleDropdown(false);
			setSampleSearchResults([]);
			setActiveSampleInputIndex(null);
			setCurrentSamplePage(1);
			setTotalSamplePages(1);
			setTotalSampleItems(0);
		}
	};

	// Update dropdown position
	const updateDropdownPosition = () => {
		if (typeof document !== 'undefined' && document && activeSampleInputIndex !== null) {
			// Find the specific input using data-index attribute
			const activeInput = document.querySelector(
				`.sample-dropdown-container[data-index="${activeSampleInputIndex}"] input, .sample-detail-dropdown[data-index="${activeSampleInputIndex}"] input`,
			);
			if (activeInput) {
				const rect = activeInput.getBoundingClientRect();
				setDropdownPosition({
					top: rect.bottom + window.scrollY,
					left: rect.left + window.scrollX,
					width: rect.width,
				});
			}
		}
	};

	// Update dropdown position when it becomes visible
	useEffect(() => {
		if (showSampleDropdown) {
			updateDropdownPosition();
		}
	}, [showSampleDropdown]);

	// Update dropdown position on window resize and scroll
	useEffect(() => {
		if (typeof window !== 'undefined' && showSampleDropdown) {
			const handleResize = () => updateDropdownPosition();
			const handleScroll = () => updateDropdownPosition();

			window.addEventListener('resize', handleResize);
			window.addEventListener('scroll', handleScroll, true);

			return () => {
				window.removeEventListener('resize', handleResize);
				window.removeEventListener('scroll', handleScroll, true);
			};
		}
	}, [showSampleDropdown]);

	// Add click outside listener for dropdown
	useEffect(() => {
		if (typeof document !== 'undefined') {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showSampleDropdown]);

	// Auto-fetch identity name when document changes
	useEffect(() => {
		const doc = createdDoc || currentDocCopy;
		if (doc && doc.identityUID) {
			fetchIdentityName(doc.identityUID);
		}
	}, [createdDoc?.identityUID, currentDocCopy?.identityUID]);

	// Function to update displayed analysis IDs from current analyses
	const updateDisplayedAnalysisIds = () => {
		const analyses = isEditing
			? editedAnalyses
			: comparedAnalyses.length > 0
			? comparedAnalyses
			: convertedAnalyses.length > 0 && !currentDocCopy
			? convertedAnalyses
			: currentDocCopy?.metadata?.qualifiedAnalyses || currentDocCopy?.jsonContent?.analyses || [];

		const ids = new Set();
		analyses.forEach((analysis) => {
			// Use multiple possible ID combinations to match
			const sampleId = analysis.sampleId || analysis.sample_id;
			const testId = analysis.testId || analysis.test_id || analysis.parameter_code;

			if (testId && sampleId) {
				ids.add(`${sampleId}-${testId}`);
			}
			// Also add with original analysis ID if available
			if (analysis.id) {
				ids.add(String(analysis.id));
			}
		});
		setDisplayedAnalysisIds(ids);
	};

	// Function to load all available analyses for the table
	const loadTableData = async () => {
		setTableLoading(true);
		try {
			// Call the same API as ProcessingSample.jsx to get all processing data
			const requestBody = {
				itemsPerPage: tableItemsPerPage,
				page: tableCurrentPage,
				columnSort: '_deprecated_sampleUid',
				sortBy: 'ASC',
			};

			const response = await apiPost('https://black.irdop.org/v1/sample/processing/list', requestBody);

			if (response?.status < 300 && response?.data?.result) {
				const processingSampleData = response.data.result;
				const formattedData = [];

				console.log('API Response:', {
					totalReceipts: processingSampleData.length,
					pagination: response.data.pagination,
					firstReceipt: processingSampleData[0],
				});

				// Transform the nested structure from ProcessingSample API
				processingSampleData.forEach((receipt) => {
					receipt.samples?.forEach((sample) => {
						sample.analysis?.forEach((analysis) => {
							// Check if this analysis is displayed above using multiple matching criteria
							const isDisplayed =
								displayedAnalysisIds.has(String(analysis.id)) ||
								displayedAnalysisIds.has(`${sample._deprecated_sampleUid}-${analysis.parameter_code}`) ||
								displayedAnalysisIds.has(`${sample._deprecated_sampleUid}-${analysis.id}`);

							formattedData.push({
								id: analysis.id,
								// Sample information (for grouping in column 1)
								_deprecated_sampleUid: sample._deprecated_sampleUid || '--',
								sample_name: sample.sample_name || '--',
								matrix: sample.matrix || '--',
								sample_description: sample.sample_description || '--',
								sample_status: sample.status || 0,
								// Analysis information
								parameter_name: analysis.parameter_name || '--',
								parameter_code: analysis.parameter_code || '--',
								protocol_source: analysis.protocol_source || '--',
								protocol_code: analysis.protocol_code || '--',
								result_value: analysis.result_value || '--',
								result_unit: analysis.result_unit || '--',
								deadline: analysis.deadline || '--',
								technicianId: analysis.technician_uid || '--',
								// Additional fields for reference
								receiptUid: receipt.receipt_uid || '--',
								receiptId: receipt.id,
								createdAt: analysis.created_at || sample.handover_info?.handover_date || '--',
								handover_info: sample.handover_info || [],
								// Mark if this analysis is already displayed in the main table
								isDisplayed: isDisplayed,
							});
						});
					});
				});

				console.log('Formatted Data:', {
					totalAnalysis: formattedData.length,
					sampleUids: [...new Set(formattedData.map((item) => item._deprecated_sampleUid))],
					firstFewItems: formattedData.slice(0, 3),
				});

				setTableData(formattedData);

				// Update pagination info from API response
				if (response.data.pagination) {
					setTableTotalItems(response.data.pagination.totalItems || formattedData.length);
					setTableTotalPages(
						response.data.pagination.totalPages || Math.ceil(formattedData.length / tableItemsPerPage),
					);
				} else {
					// If no pagination info from API, calculate locally
					setTableTotalItems(formattedData.length);
					setTableTotalPages(Math.ceil(formattedData.length / tableItemsPerPage));
				}
			} else {
				setTableData([]);
				setTableTotalItems(0);
				setTableTotalPages(1);
			}
		} catch (error) {
			console.error('Error loading table data from processing API:', error);
			setTableData([]);
		} finally {
			setTableLoading(false);
		}
	};

	// Update displayed analysis IDs when analyses change
	useEffect(() => {
		updateDisplayedAnalysisIds();
	}, [editedAnalyses, comparedAnalyses, convertedAnalyses, currentDocCopy, isEditing]);

	// Load table data when displayedAnalysisIds changes or component mounts
	useEffect(() => {
		loadTableData();
	}, [displayedAnalysisIds]);

	// Initial load of table data when component mounts
	useEffect(() => {
		loadTableData();
	}, []);

	// Reload data when pagination changes
	useEffect(() => {
		loadTableData();
	}, [tableCurrentPage, tableItemsPerPage]);

	// Pagination handlers
	const handleTablePageChange = (newPage) => {
		setTableCurrentPage(newPage);
	};

	const handleTableItemsPerPageChange = (newItemsPerPage) => {
		setTableItemsPerPage(newItemsPerPage);
		setTableCurrentPage(1); // Reset to first page when changing items per page
	};

	// Handle double-click on table row
	const handleTableRowDoubleClick = (rowId, rowData, event) => {
		// TODO: Add specific double-click behavior (edit, view details, etc.)
	};

	// Check if this is create mode (no document provided)
	// const isCreateMode = !docCopy; // Removed to use state instead

	// Return null if modal is not open
	if (!isOpen) {
		return null;
	}

	if (isCreateMode) {
		// Create new experiment log mode - always in editing mode
		const isEditingCreate = true;
		return (
			<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
				<div
					className="relative m-auto mt-2 p-5 border shadow-lg rounded-md bg-white"
					style={{ width: '98vw', height: '98vh', overflow: 'auto' }}
				>
					{/* Header */}
					<div className="flex justify-between items-center mb-4 border-b pb-3">
						<div className="flex-1">
							<h3 className="text-lg font-semibold">
								{createdDoc
									? `${createdDoc.jsonContent?.header?.title || createdDoc.title || 'Chi tiết biên bản đã tạo'}`
									: 'Thêm dữ liệu thử nghiệm mới'}
							</h3>
						</div>
						<div className="flex gap-2">
							{previewUrlCreate && (
								<button
									onClick={handleClosePreviewCreate}
									className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
								>
									Đóng Preview
								</button>
							)}
							<button
								onClick={handleCloseModal}
								className="text-red-600 hover:text-gray-700 text-2xl font-bold px-4 py-0.5"
							>
								×
							</button>
						</div>
					</div>

					{/* Content */}
					<div className={`space-y-4 ${previewUrlCreate ? 'flex gap-4' : ''}`}>
						{/* Main Content */}
						<div className={`${previewUrlCreate ? 'w-1/2' : 'w-full'}`}>
							{/* Title */}
							<div>
								<label className="block text-sm font-medium text-gray-700 text-left mb-1">Tiêu đề:</label>
								<input
									type="text"
									value={editableData.header.title}
									onChange={(e) =>
										setEditableData((prev) => ({
											...prev,
											header: { ...prev.header, title: e.target.value },
										}))
									}
									className="w-full p-2 border border-gray-300 rounded-md bg-white"
									placeholder="Nhập tiêu đề nhật ký thử nghiệm"
									disabled={!!createdDoc} // Disable when document is created
								/>
							</div>

							{/* Display uploaded file info below title */}
							{uploadedFileInfo && (
								<div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-md">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="text-sm text-green-700 font-medium">File đã tải lên:</span>
											<span className="text-sm text-green-800">{uploadedFileInfo.fileName}</span>
											<span className="text-xs text-green-600">
												({(uploadedFileInfo.fileSize / 1024).toFixed(2)} KB)
											</span>
										</div>
										<button
											onClick={handleFilePreviewCreate}
											disabled={isPreviewLoadingCreate}
											className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
										>
											{isPreviewLoadingCreate && <FaSync className="animate-spin" size={10} />}
											{isPreviewLoadingCreate ? 'Đang tải...' : 'Preview'}
										</button>
									</div>
								</div>
							)}

							{/* Document Info (when created) */}
							{createdDoc && (
								<div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
									<h4 className="font-semibold text-green-800 mb-2">✓ Biên bản đã được tạo thành công!</h4>
									<div className="grid grid-cols-2 gap-4 text-sm text-green-700">
										<div>
											<strong>ID:</strong> {createdDoc.id}
										</div>
										<div>
											<strong>Trạng thái:</strong> {createdDoc.status === 'pending' ? 'Nháp' : 'Đã duyệt'}
										</div>
										<div>
											<strong>Ngày tạo:</strong> {createdDoc.lastModified || 'N/A'}
										</div>
										<div>
											<strong>Số phép thử:</strong>{' '}
											{createdDoc.metadata?.qualifiedAnalyses?.length || createdDoc.jsonContent?.analyses?.length || 0}
										</div>
									</div>
								</div>
							)}

							{/* Analyses Section */}
							<div className="mt-6">
								<div className="flex justify-between items-center mb-2">
									<h4 className="font-semibold">Danh sách phép thử ({editableData.analyses.length})</h4>
									<div className="flex gap-2">
										{!createdDoc && (
											<button
												onClick={handleUploadFileCreate}
												className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
											>
												Upload File
											</button>
										)}
									</div>
								</div>

								{/* Always show editing table in create mode */}
								{!createdDoc && (
									<div className="border rounded-md p-4 bg-gray-50">
										<p className="text-sm text-gray-600 mb-2">Chế độ chỉnh sửa danh sách phép thử</p>

										{/* Table Header */}
										<div className="overflow-x-auto">
											<table className="min-w-full border-collapse border border-gray-300">
												<thead>
													<tr className="bg-gray-100">
														<th className="border border-gray-300 px-4 py-2 text-left">STT</th>
														<th className="border border-gray-300 px-4 py-2 text-left">Mã mẫu</th>
														<th className="border border-gray-300 px-4 py-2 text-left">Mã chỉ tiêu</th>
														<th className="border border-gray-300 px-4 py-2 text-left">Tên chỉ tiêu</th>
														<th className="border border-gray-300 px-4 py-2 text-left">Kết quả</th>
														<th className="border border-gray-300 px-4 py-2 text-left">Đơn vị</th>
														<th className="border border-gray-300 px-4 py-2 text-left">Phương pháp</th>
														<th
															className="border border-gray-300 px-4 py-2 text-left cursor-pointer hover:bg-gray-200"
															onClick={() => fetchAttachmentsForAnalyses(editableData.analyses)}
															title="Click để tải lại đính kèm"
														>
															Đính kèm
														</th>
														<th className="border border-gray-300 px-4 py-2 text-left">Thao tác</th>
													</tr>
												</thead>
												<tbody>
													{editableData.analyses.map((analysis, index) => (
														<tr key={index}>
															<td className="border border-gray-300 px-4 py-2">{index + 1}</td>
															<td className="border border-gray-300 px-4 py-2">
																<div className="relative sample-dropdown-container" data-index={index}>
																	<input
																		type="text"
																		value={analysis.sampleId || ''}
																		onChange={(e) => handleSampleIdChangeCreate(index, e.target.value)}
																		className="w-full p-1 border border-gray-200 rounded bg-white"
																		placeholder="Nhập mã mẫu..."
																	/>
																	{isSearchingSample && activeSampleInputIndex === index && (
																		<div className="absolute right-2 top-1/2 transform -translate-y-1/2">
																			<div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
																		</div>
																	)}
																	{showSampleDropdown &&
																		activeSampleInputIndex === index &&
																		sampleSearchResults.length > 0 &&
																		createPortal(
																			<div
																				className="sample-dropdown-portal absolute bg-white border border-gray-300 rounded shadow-lg z-[9999] max-h-[650px] overflow-hidden"
																				style={{
																					width: '600px',
																					top: `${dropdownPosition.top}px`,
																					left: `${dropdownPosition.left}px`,
																					position: 'absolute',
																				}}
																			>
																				{/* Results list */}
																				<div className="max-h-48 overflow-y-auto">
																					{sampleSearchResults.map((sample, sampleIndex) => (
																						<div
																							key={sampleIndex}
																							className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-left"
																							onClick={() => handleSelectSample(index, sample)}
																						>
																							<span className="font-semibold text-blue-600">{sample.sampleId}</span>
																							<span className="font-semibold text-black">: {sample.parameterName}</span>
																							<span className="text-gray-500"> - {sample.protocolCode}</span>
																						</div>
																					))}
																				</div>

																				{/* Pagination controls */}
																				{totalSamplePages > 1 && (
																					<div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
																						<div className="flex items-center justify-between text-xs text-gray-600">
																							<div>
																								Trang {currentSamplePage} / {totalSamplePages} ({totalSampleItems} kết
																								quả)
																							</div>
																							<div className="flex items-center gap-1">
																								<button
																									onClick={() => handleSamplePageChange(currentSamplePage - 1)}
																									disabled={currentSamplePage <= 1}
																									className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
																								>
																									‹
																								</button>

																								{/* Page numbers */}
																								{Array.from({ length: Math.min(5, totalSamplePages) }, (_, i) => {
																									let pageNum;
																									if (totalSamplePages <= 5) {
																										pageNum = i + 1;
																									} else if (currentSamplePage <= 3) {
																										pageNum = i + 1;
																									} else if (currentSamplePage >= totalSamplePages - 2) {
																										pageNum = totalSamplePages - 4 + i;
																									} else {
																										pageNum = currentSamplePage - 2 + i;
																									}

																									return (
																										<button
																											key={pageNum}
																											onClick={() => handleSamplePageChange(pageNum)}
																											className={`px-2 py-1 text-xs rounded ${
																												pageNum === currentSamplePage
																													? 'bg-blue-500 text-white'
																													: 'bg-gray-200 hover:bg-gray-300'
																											}`}
																										>
																											{pageNum}
																										</button>
																									);
																								})}

																								<button
																									onClick={() => handleSamplePageChange(currentSamplePage + 1)}
																									disabled={currentSamplePage >= totalSamplePages}
																									className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
																								>
																									›
																								</button>
																							</div>
																						</div>
																					</div>
																				)}
																			</div>,
																			document.body,
																		)}
																</div>
															</td>
															<td className="border border-gray-300 px-4 py-2">
																<input
																	type="text"
																	value={analysis.testId || ''}
																	onChange={(e) => handleAnalysisChangeCreate(index, 'testId', e.target.value)}
																	className="w-full p-1 border border-gray-200 rounded bg-white"
																/>
															</td>
															<td className="border border-gray-300 px-4 py-2">
																<input
																	type="text"
																	value={analysis.name || ''}
																	onChange={(e) => handleAnalysisChangeCreate(index, 'name', e.target.value)}
																	className="w-full p-1 border border-gray-200 rounded bg-white"
																/>
															</td>
															<td className="border border-gray-300 px-4 py-2">
																<div className="w-full h-full min-h-[30px]" onClick={(e) => e.stopPropagation()}>
																	<div
																		className={`editable-cell border rounded transition-all duration-200 cursor-pointer h-full ${
																			editableCell.analysisIndex === index && editableCell.column === 'result'
																				? 'editing-active border-purple-500'
																				: 'border-transparent hover:border-purple-300'
																		}`}
																	>
																		{editableCell.analysisIndex === index && editableCell.column === 'result' ? (
																			<div className="relative" data-edit-id={`${index}-result`}>
																				<TinyMceInput
																					value={inputValue}
																					onUpdate={(content) => handleSaveContentCreate(content, 'result', index)}
																					onKey={handleKeyDownCreate}
																					placeholder="Nhập kết quả..."
																				/>
																				{updating && (
																					<div className="absolute top-1 right-1 text-purple-600 save-indicator">
																						<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
																							<path
																								fillRule="evenodd"
																								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																								clipRule="evenodd"
																							/>
																						</svg>
																					</div>
																				)}
																			</div>
																		) : (
																			<div
																				className="w-full h-full p-1 text-xs text-black text-left cursor-pointer hover:bg-blue-50 rounded min-h-[30px] flex items-center group"
																				onClick={(e) => {
																					e.stopPropagation();
																					openEditorWithAutoSaveCreate(index, 'result', analysis.result);
																				}}
																			>
																				{analysis.result ? (
																					<div dangerouslySetInnerHTML={{ __html: analysis.result }} />
																				) : (
																					<span className="result-cell-placeholder group-hover:text-gray-600 text-gray-400 italic">
																						Nhấp để nhập kết quả...
																					</span>
																				)}
																				<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
																					<svg
																						className="w-3 h-3 text-purple-500"
																						fill="none"
																						stroke="currentColor"
																						viewBox="0 0 24 24"
																					>
																						<path
																							strokeLinecap="round"
																							strokeLinejoin="round"
																							strokeWidth="2"
																							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
																						/>
																					</svg>
																				</div>
																			</div>
																		)}
																	</div>
																</div>
															</td>
															<td className="border border-gray-300 px-4 py-2">
																<div className="w-full h-full min-h-[30px]" onClick={(e) => e.stopPropagation()}>
																	<div
																		className={`editable-cell border rounded transition-all duration-200 cursor-pointer h-full ${
																			editableCell.analysisIndex === index && editableCell.column === 'unit'
																				? 'editing-active border-purple-500'
																				: 'border-transparent hover:border-purple-300'
																		}`}
																	>
																		{editableCell.analysisIndex === index && editableCell.column === 'unit' ? (
																			<div className="relative" data-edit-id={`${index}-unit`}>
																				<TinyMceInput
																					value={inputValue}
																					onUpdate={(content) => handleSaveContentCreate(content, 'unit', index)}
																					onKey={handleKeyDownCreate}
																					placeholder="Nhập đơn vị..."
																				/>
																				{updating && (
																					<div className="absolute top-1 right-1 text-purple-600 save-indicator">
																						<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
																							<path
																								fillRule="evenodd"
																								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																								clipRule="evenodd"
																							/>
																						</svg>
																					</div>
																				)}
																			</div>
																		) : (
																			<div
																				className="w-full h-full p-1 text-xs text-black text-left cursor-pointer hover:bg-blue-50 rounded min-h-[30px] flex items-center group"
																				onClick={(e) => {
																					e.stopPropagation();
																					openEditorWithAutoSaveCreate(index, 'unit', analysis.unit);
																				}}
																			>
																				{analysis.unit ? (
																					<div dangerouslySetInnerHTML={{ __html: analysis.unit }} />
																				) : (
																					<span className="result-cell-placeholder group-hover:text-gray-600 text-gray-400 italic">
																						Nhấp để nhập đơn vị...
																					</span>
																				)}
																				<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
																					<svg
																						className="w-3 h-3 text-purple-500"
																						fill="none"
																						stroke="currentColor"
																						viewBox="0 0 24 24"
																					>
																						<path
																							strokeLinecap="round"
																							strokeLinejoin="round"
																							strokeWidth="2"
																							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
																						/>
																					</svg>
																				</div>
																			</div>
																		)}
																	</div>
																</div>
															</td>
															<td className="border border-gray-300 px-4 py-2">
																<input
																	type="text"
																	value={analysis.method || ''}
																	onChange={(e) => handleAnalysisChangeCreate(index, 'method', e.target.value)}
																	className="w-full p-1 border border-gray-200 rounded bg-white"
																/>
															</td>
															<td className="border border-gray-300 px-4 py-2">
																{loadingAttachments[analysis.testId] ? (
																	<div className="text-xs text-gray-500">Đang tải...</div>
																) : (
																	<div className="text-xs">
																		{attachmentData[analysis.testId]?.map((file, fileIndex) => (
																			<div key={fileIndex} className="flex items-center gap-1">
																				<span
																					className={`text-blue-600 underline cursor-pointer hover:text-blue-800 ${
																						isLoadingFilePreview ? 'pointer-events-none opacity-50' : ''
																					}`}
																					onClick={() => handleAttachmentPreview(file.id)}
																				>
																					{new Date(file.createdAt).toLocaleDateString('vi-VN')}
																				</span>
																				{isLoadingFilePreview && (
																					<div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
																				)}
																			</div>
																		)) || <span className="text-gray-400">Không có</span>}
																	</div>
																)}
															</td>
															<td className="border border-gray-300 px-4 py-2">
																<button
																	onClick={() => handleRemoveAnalysisCreate(index)}
																	className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
																>
																	Xóa
																</button>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>

										<button
											onClick={handleAddAnalysisCreate}
											disabled={!!createdDoc}
											className={`mt-3 px-3 py-1 rounded text-sm ${
												createdDoc
													? 'bg-gray-300 text-gray-500 cursor-not-allowed'
													: 'bg-green-500 text-white hover:bg-green-600'
											}`}
										>
											Thêm phép thử
										</button>
									</div>
								)}

								{/* Show created document info when document is created */}
								{createdDoc && (
									<div className="border rounded-md p-4">
										{(createdDoc.metadata?.qualifiedAnalyses || createdDoc.jsonContent?.analyses || []).length > 0 ? (
											<div className="overflow-x-auto">
												<table className="min-w-full border-collapse border border-gray-300">
													<thead>
														<tr className="bg-gray-100">
															<th className="border border-gray-300 px-4 py-2 text-left">STT</th>
															<th className="border border-gray-300 px-4 py-2 text-left">Mã mẫu</th>
															<th className="border border-gray-300 px-4 py-2 text-left">Mã chỉ tiêu</th>
															<th className="border border-gray-300 px-4 py-2 text-left">Tên chỉ tiêu</th>
															<th className="border border-gray-300 px-4 py-2 text-left">Kết quả</th>
															<th className="border border-gray-300 px-4 py-2 text-left">Đơn vị</th>
															<th className="border border-gray-300 px-4 py-2 text-left">Phương pháp</th>
														</tr>
													</thead>
													<tbody>
														{(createdDoc.metadata?.qualifiedAnalyses || createdDoc.jsonContent?.analyses || []).map(
															(analysis, index) => (
																<tr key={index}>
																	<td className="border border-gray-300 px-4 py-2">{index + 1}</td>
																	<td className="border border-gray-300 px-4 py-2">{analysis.sampleId || '-'}</td>
																	<td className="border border-gray-300 px-4 py-2">
																		{analysis.testId || analysis.id || '-'}
																	</td>
																	<td className="border border-gray-300 px-4 py-2">
																		{analysis.testName || analysis.parameterName || '-'}
																	</td>
																	<td className="border border-gray-300 px-4 py-2">
																		{analysis.testResult || analysis.resultValue || '-'}
																	</td>
																	<td className="border border-gray-300 px-4 py-2">
																		{analysis.testUnit || analysis.resultUnit || '-'}
																	</td>
																	<td className="border border-gray-300 px-4 py-2">
																		{analysis.testProtocolCode || analysis.protocolCode || '-'}
																	</td>
																</tr>
															),
														)}
													</tbody>
												</table>
											</div>
										) : (
											<p className="text-gray-500 text-center">Chưa có phép thử nào</p>
										)}
									</div>
								)}
							</div>

							{/* Preview Section */}
							{showPreview && (
								<div>
									<h4 className="font-semibold mb-2">Xem trước</h4>
									<div className="border rounded-md p-4 bg-gray-50 max-h-60 overflow-y-auto">
										<pre className="text-sm">
											{(() => {
												try {
													return JSON.stringify(editableData, null, 2);
												} catch (error) {
													return `Unable to display preview: ${error.message}`;
												}
											})()}
										</pre>
									</div>
								</div>
							)}
						</div>

						{/* File Preview Area */}
						{previewUrlCreate && (
							<div className="w-1/2 border-l border-gray-300 pl-4">
								<div className="h-full">
									<h4 className="font-semibold mb-2">File Preview</h4>
									<div className="border rounded-md h-full">
										<iframe
											src={previewUrlCreate}
											className="w-full h-full rounded-md"
											title="File Preview"
											style={{ minHeight: '600px' }}
										/>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex justify-end mt-6 pt-4 pb-20 border-t">
						<div className="flex gap-2">
							{!createdDoc && (
								<button
									onClick={handleSubmitReport}
									disabled={isCreatingReport}
									className={`px-4 py-2 rounded hover:bg-orange-600 transition-colors flex items-center gap-2 ${
										isCreatingReport ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-orange-500 text-white'
									}`}
								>
									{isCreatingReport && <FaSync className="animate-spin" size={14} />}
									{isCreatingReport ? 'Đang tạo...' : 'Tạo biên bản'}
								</button>
							)}
						</div>
					</div>

					{/* Column Selection Modal */}
					{showColumnSelectionCreate && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
							<div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
								<h4 className="font-semibold mb-4">Chọn cột để cập nhật</h4>
								<div className="space-y-2">
									{['result', 'unit', 'method', 'status'].map((column) => (
										<label key={column} className="flex items-center">
											<input
												type="checkbox"
												checked={selectedColumnsCreate.has(column)}
												onChange={(e) => {
													const newSelected = new Set(selectedColumnsCreate);
													if (e.target.checked) {
														newSelected.add(column);
													} else {
														newSelected.delete(column);
													}
													setSelectedColumnsCreate(newSelected);
												}}
												className="mr-2"
											/>
											<span className="capitalize">{column}</span>
										</label>
									))}
								</div>
								<div className="flex justify-end gap-2 mt-4">
									<button onClick={() => setShowColumnSelectionCreate(false)} className="px-3 py-1 bg-gray-300 rounded">
										Hủy
									</button>
									<button
										onClick={() => {
											setShowColumnSelectionCreate(false);
										}}
										className="px-3 py-1 bg-blue-500 text-white rounded"
									>
										Xác nhận
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Upload Modal for Create Mode */}
					{showUploadModalCreate && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
							<div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 modal-content">
								<div className="flex justify-between items-center mb-4">
									<h3 className="text-lg font-semibold">Tải file lên</h3>
									<button onClick={handleCloseUploadModalCreate} className="text-gray-500 hover:text-gray-700">
										<FaTimes size={20} />
									</button>
								</div>

								{/* File Selection Area */}
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-2">Chọn file</label>
									<div
										className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
										onDragOver={handleDragOverCreate}
										onDragEnter={handleDragOverCreate}
										onDragLeave={handleDragOverCreate}
										onDrop={handleDropCreate}
										onClick={() => document.getElementById('file-upload-input-create').click()}
									>
										<input
											id="file-upload-input-create"
											type="file"
											multiple
											onChange={handleFileSelectCreate}
											className="hidden"
										/>
										<FaPlus className="mx-auto text-gray-400 mb-2" size={24} />
										<p className="text-sm text-gray-600">Kéo thả file vào đây hoặc click để chọn</p>
										<p className="text-xs text-gray-500 mt-1">Có thể chọn nhiều file cùng lúc</p>
									</div>

									{/* File Preview List */}
									{uploadDataCreate.files.length > 0 && (
										<div className="mt-4 max-h-32 overflow-y-auto">
											<p className="text-sm text-gray-600 mb-2">Đã chọn {uploadDataCreate.files.length} file:</p>
											<div className="space-y-2">
												{uploadDataCreate.files.map((file, index) => (
													<div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
															<p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
														</div>
														<button
															onClick={() => handleRemoveFileCreate(index)}
															className="text-red-500 hover:text-red-700 p-1"
															title="Xóa file"
														>
															<FaTimes size={14} />
														</button>
													</div>
												))}
											</div>
										</div>
									)}
								</div>

								{/* Category Selection */}
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
									<div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
										{[
											'Dữ liệu gốc',
											'Biên bản kết quả thử nghiệm',
											'Tài liệu khác',
											'Ảnh mẫu',
											'Phiếu gửi mẫu',
											'Đơn hàng',
											'Phiếu phân tích',
											'Biên bản bàn giao',
											'Specification / COA',
										].map((category) => (
											<label key={category} className="flex items-center py-1 px-1 hover:bg-gray-100 cursor-pointer">
												<input
													type="checkbox"
													checked={uploadDataCreate.userTags.includes(category)}
													onChange={(e) => handleUploadCategoryChangeCreate(category, e.target.checked)}
													className="mr-2"
												/>
												<span className="text-sm">{category}</span>
											</label>
										))}
									</div>
								</div>

								{/* Foreign Keys Input */}
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Khóa liên kết (phân cách bằng dấu phẩy)
									</label>
									<input
										type="text"
										placeholder="Nhập UID, phân cách bằng dấu phẩy..."
										value={uploadDataCreate.foreignKeyUIDs.join(', ')}
										onChange={(e) => handleForeignKeyInputCreate(e.target.value)}
										className="w-full px-3 py-1 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								{/* Action Buttons */}
								<div className="flex justify-end gap-2">
									<button
										onClick={handleCloseUploadModalCreate}
										className="px-4 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
									>
										Hủy
									</button>
									<button
										onClick={handleFileUploadCreate}
										disabled={uploadingCreate || uploadDataCreate.files.length === 0}
										className="px-4 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
									>
										{uploadingCreate && <FaSync className="animate-spin" size={12} />}
										{uploadingCreate ? 'Đang tải...' : 'Tải lên'}
									</button>
								</div>
							</div>
						</div>
					)}

					{/* FilterableTable cho Create Mode */}
					{/* <div className="mt-6 border-t-2 border-gray-200 pt-6">
						{tableData.length > 0 ? (
							<FilterableTable
								data={tableData}
								columns={[
									'sample_uid',
									'parameter_name',
									'protocol_source',
									'protocol_code',
									'result_value',
									'result_unit',
									'deadline',
									'technician_uid',
								]}
								columnConfig={{
									sample_uid: { displayName: 'Mẫu thử', width: '180px' },
									parameter_name: { displayName: 'Chỉ tiêu', width: '200px' },
									protocol_source: { displayName: 'Nguồn', width: '120px' },
									protocol_code: { displayName: 'Phương pháp', width: '160px' },
									result_value: { displayName: 'Kết quả', width: '140px' },
									result_unit: { displayName: 'Đơn vị', width: '100px' },
									deadline: { displayName: 'Hạn trả', width: '100px' },
									technician_uid: { displayName: 'Người thực hiện', width: '150px' },
								}}
								selectedRows={tableSelectedRows}
								loading={tableLoading}
								height="400px"
								filters={tableFilters}
								onFiltersChange={setTableFilters}
								sortConfig={tableSortConfig}
								onSortChange={setTableSortConfig}
								// Pagination props
								enablePagination={true}
								serverSidePagination={true}
								currentPage={tableCurrentPage}
								totalPages={tableTotalPages}
								totalItems={tableTotalItems}
								itemsPerPage={tableItemsPerPage}
								onPageChange={handleTablePageChange}
								onItemsPerPageChange={handleTableItemsPerPageChange}
								// Row interaction props
								onRowDoubleClick={handleTableRowDoubleClick}
								// Grouping props
								enableGrouping={true}
								groupBy="sample_uid"
								renderCustomCell={(row, column) => {
									// Mark displayed analyses as disabled
									const isRowDisplayed = row.isDisplayed;

									if (column === 'sample_uid') {
										return (
											<div className={`text-sm ${isRowDisplayed ? 'text-gray-400' : ''}`}>
												<div className={`font-semibold ${isRowDisplayed ? 'text-gray-400' : 'text-blue-800'}`}>
													{row.sample_uid}
												</div>
												<div className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}>
													{row.sample_name || 'N/A'}
												</div>
												<div className={`text-xs ${isRowDisplayed ? 'text-gray-400' : 'text-gray-600'}`}>
													<span className="font-medium">Nền mẫu:</span> {row.matrix || 'N/A'}
												</div>
												{row.sample_description && (
													<div className={`text-xs ${isRowDisplayed ? 'text-gray-400' : 'text-gray-600'}`}>
														<span className="font-medium">Mô tả:</span> {row.sample_description}
													</div>
												)}
												{row.handover_info && row.handover_info.length > 0 && (
													<div
														className={`text-xs mt-2 border-t border-gray-200 pt-2 ${
															isRowDisplayed ? 'text-gray-400' : 'text-gray-600'
														}`}
													>
														<div className="font-medium mb-1">Bàn giao:</div>
														{row.handover_info.slice(0, 2).map((info, index) => (
															<p key={index} className="mb-1 last:mb-0">
																- <span className="font-semibold">{info.handover_by_name}</span> nhận bàn giao
																{info.volume && info.volume !== '' && (
																	<span className="font-semibold"> {info.volume} mẫu</span>
																)}{' '}
																vào lúc{' '}
																<span className="font-semibold">
																	{new Date(new Date(info.handover_at).getTime() + 7 * 60 * 60 * 1000).toLocaleString(
																		'vi-VN',
																		{
																			day: '2-digit',
																			month: '2-digit',
																			year: 'numeric',
																			hour: '2-digit',
																			minute: '2-digit',
																		},
																	)}
																</span>
															</p>
														))}
													</div>
												)}
											</div>
										);
									}

									if (column === 'deadline') {
										const deadlineDate = row[column];
										if (!deadlineDate)
											return <span className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}>--</span>;

										const deadline = new Date(deadlineDate);
										const today = new Date();
										deadline.setHours(0, 0, 0, 0);
										today.setHours(0, 0, 0, 0);

										let colorClass = isRowDisplayed ? 'text-gray-400' : 'text-gray-700';
										if (!isRowDisplayed) {
											if (deadline < today) {
												colorClass = 'text-red-600 font-semibold'; // Overdue
											} else if (deadline.getTime() === today.getTime()) {
												colorClass = 'text-yellow-600 font-semibold'; // Today
											}
										}

										return <span className={colorClass}>{deadline.toLocaleDateString('vi-VN')}</span>;
									}

									if (column === 'result_value') {
										return (
											<div
												className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}
												dangerouslySetInnerHTML={{ __html: row[column] || '--' }}
											/>
										);
									}

									if (column === 'technician_uid') {
										// Get technician name from context
										const technicianName = row.technician_uid
											? technicians?.find((tech) => tech.identity_uid === row.technician_uid)?.identity_name ||
											  row.technician_uid
											: '--';
										return <span className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}>{technicianName}</span>;
									}

									return (
										<span className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}>{row[column] || '--'}</span>
									);
								}}
								// Custom row props to handle disabled state
								customRowProps={(row) => ({
									'data-displayed': row.isDisplayed,
									style: row.isDisplayed
										? {
												backgroundColor: '#f3f4f6',
												opacity: 0.6,
												pointerEvents: 'none',
												cursor: 'not-allowed',
										  }
										: {},
								})}
								// Override row selection to prevent selecting displayed rows
								onRowSelect={(selectedRows, rowsData) => {
									// Filter out displayed rows from selection
									const filteredRows = new Set();
									const filteredData = new Map();

									selectedRows.forEach((rowId) => {
										const rowData = tableData.find((row) => String(row.id) === rowId);
										if (rowData && !rowData.isDisplayed) {
											filteredRows.add(rowId);
											filteredData.set(rowId, rowData);
										}
									});

									setTableSelectedRows(filteredRows);
								}}
								className={`custom-filterable-table ${
									tableData.some((row) => row.isDisplayed) ? 'has-disabled-rows' : ''
								}`}
							/>
						) : (
							<div className="p-4 text-center text-gray-500">
								{tableLoading ? (
									<p>Đang tải dữ liệu từ API...</p>
								) : (
									<>
										<p>Không có dữ liệu phân tích từ API</p>
										<p className="text-sm mt-1">API: v1/sample/processing/list</p>
									</>
								)}
							</div>
						)}
					</div> */}
				</div>
			</div>
		);
	}

	// Use created document if available, otherwise use the original docCopy
	const currentDoc = createdDoc || currentDocCopy;

	// Use matched document data if available, otherwise use current document
	const displayDocument = matchedDocument || currentDoc;
	const analyses = isEditing
		? editedAnalyses
		: comparedAnalyses.length > 0
		? comparedAnalyses
		: convertedAnalyses.length > 0 && !currentDoc
		? convertedAnalyses
		: displayDocument.metadata?.qualifiedAnalyses || displayDocument.jsonContent?.analyses || [];
	const samples = displayDocument.jsonContent?.samples || displayDocument.metadata?.samples || [];
	const sampleUIDs = samples.map((s) => s.sampleId);

	return (
		<>
			<style>
				{`
					/* Difference indicators styles */
					.difference-indicator {
						color: #ff6b6b;
						font-weight: bold;
						cursor: pointer;
						margin-right: 6px;
						background-color: #fff3cd;
						border: 1px solid #ffc107;
						padding: 2px 4px;
						border-radius: 3px;
						display: inline-block;
						position: relative;
					}
					
					.difference-indicator:hover {
						background-color: #ffecb3;
						border-color: #ff9800;
					}
					
					.difference-indicator .tooltip {
						visibility: hidden;
						background-color: #fff3cd;
						border: 2px solid #ffc107;
						color: #856404;
						text-align: left;
						border-radius: 6px;
						padding: 8px 12px;
						position: absolute;
						z-index: 10001;
						bottom: 125%;
						left: 50%;
						margin-left: -100px;
						width: 200px;
						box-shadow: 0 4px 8px rgba(0,0,0,0.2);
						font-size: 11px;
						line-height: 1.3;
					}
					
					.difference-indicator .tooltip::after {
						content: "";
						position: absolute;
						top: 100%;
						left: 50%;
						margin-left: -5px;
						border-width: 5px;
						border-style: solid;
						border-color: #ffc107 transparent transparent transparent;
					}
					
					.difference-indicator:hover .tooltip {
						visibility: visible;
					}
					
					.difference-tag {
						background-color: #fff3cd;
						border: 2px solid #ffc107;
						border-radius: 4px;
						padding: 4px 8px;
						margin-top: 4px;
						font-size: 0.75rem;
						color: #856404;
						display: block;
						width: 100%;
						box-sizing: border-box;
						word-wrap: break-word;
						white-space: normal;
						overflow-wrap: break-word;
						hyphens: auto;
					}
				`}
			</style>

			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
				<div className="bg-white rounded-lg shadow-xl w-[98vw] h-[98vh] overflow-hidden relative">
					{/* Fixed Action Buttons */}
					{isEditing && (
						<div className="fixed right-8 top-36 transform -translate-y-1/2 z-[60] flex flex-col gap-3">
							<button
								onClick={handleSaveChanges}
								disabled={isSaving || currentDoc?.metadata?.status === 'approved'}
								className={`w-14 h-14 rounded-full transition-colors shadow-lg flex items-center justify-center text-lg font-bold ${
									isSaving || currentDoc?.metadata?.status === 'approved'
										? 'bg-gray-400 text-white cursor-not-allowed'
										: 'bg-green-500 text-white hover:bg-green-600'
								}`}
								title={
									currentDoc?.metadata?.status === 'approved'
										? 'Không thể lưu thay đổi cho tài liệu đã duyệt'
										: isSaving
										? 'Đang lưu...'
										: 'Lưu thay đổi'
								}
							>
								{isSaving ? (
									<div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
								) : (
									'✓'
								)}
							</button>
							<button
								onClick={handleEditToggle}
								disabled={isSaving}
								className="w-14 h-14 bg-white text-gray-400 rounded-full hover:bg-gray-600 transition-colors shadow-lg flex items-center justify-center text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
								title="Hủy thay đổi"
							>
								✕
							</button>
						</div>
					)}

					<div className="flex items-center justify-between px-6 py-2 border-b">
						<h2 className="text-xl font-bold text-gray-900 text-left">
							{currentDoc.jsonContent?.header?.title || currentDoc.title} - Chi tiết dữ liệu thử nghiệm
						</h2>
						<div className="flex items-center gap-2">
							{currentDoc?.metadata?.status === 'approved' && (
								<div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">✓ Đã duyệt</div>
							)}
							{currentDocCopy.fileId && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										if (previewUrl) {
											handleClosePreviewInModal();
										} else {
											handleFilePreviewInModal();
										}
									}}
									className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
										previewUrl
											? 'bg-red-500 text-white hover:bg-red-600'
											: 'bg-purple-500 text-white hover:bg-purple-600'
									}`}
								>
									{previewUrl ? 'Đóng Preview' : 'Preview File'}
								</button>
							)}
							<button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 text-2xl py-1 px-4">
								×
							</button>
						</div>
					</div>
					<div className="flex h-[calc(95vh-60px)]">
						{/* Left side - Experiment details */}
						<div
							className={`${previewUrl ? 'w-1/2' : 'w-full'} border-r ${
								previewUrl ? 'border-gray-300' : ''
							} overflow-auto`}
						>
							{/* Test ID Warning Modal */}
							{showTestIdWarning && (
								<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
									<div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
										<h3 className="text-lg font-semibold text-gray-900 mb-4">Cảnh báo</h3>
										<p className="text-gray-700 mb-6">
											Bạn có chắc chắn muốn sửa Mã chỉ tiêu? Hành động này có thể ảnh hưởng đến dữ liệu phân tích.
										</p>
										<div className="flex gap-3 justify-end">
											<button
												onClick={() => setShowTestIdWarning(false)}
												className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
											>
												Hủy
											</button>
											<button
												onClick={confirmTestIdWarning}
												className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
											>
												Xác nhận
											</button>
										</div>
									</div>
								</div>
							)}

							<div className="p-6 pb-20">
								<div className="mb-6">
									<h3 className="font-semibold text-gray-900 mb-4 text-left">Thông tin cơ bản</h3>
									<div className="grid grid-cols-3 gap-6 text-left">
										<div className="space-y-3 text-sm">
											<p>
												<strong>Mã:</strong> {currentDoc.id}
											</p>
											<p>
												<strong>Người tạo:</strong> {getIdentityName(currentDoc)}
											</p>
										</div>
										<div className="space-y-3 text-sm">
											<p>
												<strong>Cập nhật:</strong> {currentDoc.lastModified}
											</p>
											<p>
												<strong>Trạng thái:</strong> {currentDoc.status === 'pending' ? 'Nháp' : 'Đã duyệt'}
												{currentDoc?.metadata?.status === 'approved' && (
													<span className="ml-2 text-xs text-green-600 font-medium">(Không thể chỉnh sửa)</span>
												)}
											</p>
										</div>
										<div className="space-y-3 text-sm">
											<p>
												<strong>Số lượng mẫu:</strong> {samples.length}
											</p>
											<p>
												<strong>Số lượng phân tích:</strong> {analyses.length}
											</p>
										</div>
									</div>
								</div>

								<div className="mb-6">
									<h3 className="font-semibold text-gray-900 mb-4 text-left">Danh sách mã mẫu</h3>
									<div className="flex flex-wrap gap-2 justify-start">
										{sampleUIDs.map((uid, index) => (
											<span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm text-left">
												{uid}
											</span>
										))}
									</div>
								</div>

								<div className="mb-4">
									<div className="flex items-center justify-between">
										<h3 className="font-semibold text-gray-900 text-left">Danh sách phép thử</h3>
										{!isEditing && (
											<div className="flex items-center gap-2">
												{/* <button
													onClick={handleMatchData}
													disabled={isMatchingData}
													className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
														isMatchingData
															? 'bg-gray-400 text-white cursor-not-allowed'
															: 'bg-orange-500 text-white hover:bg-orange-600'
													}`}
												>
													{isMatchingData && (
														<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
													)}
													{isMatchingData ? 'Đang khớp...' : 'Khớp dữ liệu'}
												</button> */}
												{comparedAnalyses.length === 0 && (
													<button
														onClick={handleCompareData}
														disabled={isComparingData || currentDoc?.metadata?.status === 'approved'}
														className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
															isComparingData || currentDoc?.metadata?.status === 'approved'
																? 'bg-gray-400 text-white cursor-not-allowed'
																: 'bg-yellow-500 text-white hover:bg-yellow-600'
														}`}
													>
														{isComparingData && (
															<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
														)}
														{isComparingData ? 'Đang đối chiếu...' : 'Đối chiếu dữ liệu'}
													</button>
												)}
												<button
													onClick={handleEditToggle}
													disabled={currentDoc?.metadata?.status === 'approved'}
													className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
														currentDoc?.metadata?.status === 'approved'
															? 'bg-gray-400 text-gray-500 cursor-not-allowed'
															: 'bg-blue-500 text-white hover:bg-blue-600'
													}`}
												>
													Sửa
												</button>
											</div>
										)}
									</div>
									{isEditing && (
										<span className="text-sm text-blue-600 font-medium">
											Đang chỉnh sửa - Nhấp vào các ô để sửa giá trị
										</span>
									)}
									{matchedDocument && !isEditing && (
										<span className="text-sm text-green-600 font-medium block mt-1">
											Dữ liệu đã được khớp - Hiển thị kết quả cập nhật
										</span>
									)}
									{comparedAnalyses.length > 0 && !isEditing && (
										<span className="text-sm text-yellow-600 font-medium block mt-1">
											Dữ liệu đã được đối chiếu - Hiển thị kết quả so sánh
										</span>
									)}
								</div>

								{/* Table with full height */}
								<div className="h-full">
									<table className="w-full border-collapse border border-gray-300 text-left h-full">
										<thead className="bg-gray-50">
											<tr>
												<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">STT</th>
												<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
													Mã mẫu
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
													Mã chỉ tiêu
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
													Tên chỉ tiêu
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
													Kết quả
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
													Đơn vị
												</th>
												<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
													Phương pháp
												</th>
												<th
													className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
													onClick={() => fetchAttachmentsForAnalyses(analyses)}
													title="Click để tải lại đính kèm"
												>
													Đính kèm
												</th>
												{isEditing && (
													<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
														Thao tác
													</th>
												)}
											</tr>
										</thead>
										<tbody>
											{analyses.length === 0 ? (
												<tr>
													<td
														colSpan={isEditing ? '9' : '8'}
														className="border border-gray-300 px-3 py-4 text-left text-gray-500"
													>
														Không có dữ liệu phân tích
													</td>
												</tr>
											) : (
												analyses.map((analysis, index) => (
													<tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
														<td className="border border-gray-300 px-3 py-2 text-left">{index + 1}</td>
														<td
															className="border border-gray-300 px-3 py-2 font-medium text-blue-600 text-left relative sample-detail-dropdown"
															data-index={index}
														>
															{isEditing ? (
																<>
																	<input
																		type="text"
																		value={analysis.sampleId || ''}
																		onChange={(e) => handleSampleIdChangeDetail(index, e.target.value)}
																		className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
																		placeholder="Nhập mã mẫu..."
																	/>
																	{isSearchingSample && activeSampleInputIndex === index && (
																		<div className="absolute right-2 top-1/2 transform -translate-y-1/2">
																			<div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
																		</div>
																	)}
																	{showSampleDropdown &&
																		activeSampleInputIndex === index &&
																		sampleSearchResults.length > 0 &&
																		createPortal(
																			<div
																				className="sample-dropdown-portal absolute bg-white border border-gray-300 rounded shadow-lg z-[9999] max-h-[650px] overflow-hidden"
																				style={{
																					width: '600px',
																					top: `${dropdownPosition.top}px`,
																					left: `${dropdownPosition.left}px`,
																					position: 'absolute',
																				}}
																			>
																				{sampleSearchResults.map((sample, idx) => (
																					<div
																						key={idx}
																						className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-left"
																						onClick={() => handleSelectSampleDetail(index, sample)}
																					>
																						<span className="font-semibold text-blue-600">{sample.sampleId}</span>
																						<span className="font-medium text-black">: {sample.parameterName}</span>
																						<span className="text-gray-500"> - {sample.protocolCode}</span>
																					</div>
																				))}
																			</div>,
																			document.body,
																		)}
																</>
															) : (
																<div>
																	{analysis.sampleIdDiff !== undefined ? (
																		<>
																			<span className="difference-indicator">
																				⚠️
																				<span className="tooltip">
																					Giá trị hiện tại:{' '}
																					<div style={{ marginTop: '4px', fontWeight: 'bold' }}>
																						{htmlToText(analysis.sampleIdDiff) || 'Không có'}
																					</div>
																				</span>
																			</span>
																			{analysis.sampleId || '--'}
																		</>
																	) : (
																		analysis.sampleId || '--'
																	)}
																</div>
															)}
														</td>
														<td className="border border-gray-300 px-3 py-2 text-left">
															{isEditing ? (
																<input
																	type="text"
																	value={analysis.testId || ''}
																	onChange={(e) => handleTestIdChange(index, e.target.value)}
																	className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
																	placeholder="Nhập mã chỉ tiêu..."
																/>
															) : (
																analysis.testId || '--'
															)}
														</td>
														<td className="border border-gray-300 px-3 py-2 text-left">
															{isEditing ? (
																<input
																	type="text"
																	value={analysis.testName || ''}
																	onChange={(e) => handleAnalysisChange(index, 'testName', e.target.value)}
																	className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
																	placeholder="Nhập tên chỉ tiêu..."
																/>
															) : (
																<div>
																	{analysis.testNameDiff !== undefined ? (
																		<>
																			<span className="difference-indicator">
																				⚠️
																				<span className="tooltip">
																					Giá trị hiện tại:{' '}
																					<div style={{ marginTop: '4px', fontWeight: 'bold' }}>
																						{htmlToText(analysis.testNameDiff) || 'Không có'}
																					</div>
																				</span>
																			</span>
																			{analysis.testName || '--'}
																		</>
																	) : (
																		analysis.testName || '--'
																	)}
																</div>
															)}
														</td>
														<td className="border border-gray-300 px-3 py-2 text-left">
															{isEditing ? (
																<div className="w-full h-full min-h-[30px]" onClick={(e) => e.stopPropagation()}>
																	<div
																		className={`editable-cell border rounded transition-all duration-200 cursor-pointer h-full ${
																			editableCell.analysisIndex === index && editableCell.column === 'testResult'
																				? 'editing-active border-purple-500'
																				: 'border-transparent hover:border-purple-300'
																		}`}
																	>
																		{editableCell.analysisIndex === index && editableCell.column === 'testResult' ? (
																			<div className="relative" data-edit-id={`${index}-testResult`}>
																				<TinyMceInput
																					value={inputValue}
																					onUpdate={(content) => handleSaveContent(content, 'testResult', index)}
																					onKey={handleKeyDown}
																					placeholder="Nhập kết quả..."
																				/>
																				{updating && (
																					<div className="absolute top-1 right-1 text-purple-600 save-indicator">
																						<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
																							<path
																								fillRule="evenodd"
																								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																								clipRule="evenodd"
																							/>
																						</svg>
																					</div>
																				)}
																			</div>
																		) : (
																			<div
																				className="w-full h-full p-1 text-xs text-black text-left cursor-pointer hover:bg-blue-50 rounded min-h-[30px] flex items-center group"
																				onClick={(e) => {
																					e.stopPropagation();
																					openEditorWithAutoSave(index, 'testResult', analysis.testResult);
																				}}
																			>
																				{analysis.testResult ? (
																					<div dangerouslySetInnerHTML={{ __html: analysis.testResult }} />
																				) : (
																					<span className="result-cell-placeholder group-hover:text-gray-600 text-gray-400 italic">
																						Nhấp để nhập kết quả...
																					</span>
																				)}
																				<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
																					<svg
																						className="w-3 h-3 text-purple-500"
																						fill="none"
																						stroke="currentColor"
																						viewBox="0 0 24 24"
																					>
																						<path
																							strokeLinecap="round"
																							strokeLinejoin="round"
																							strokeWidth="2"
																							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
																						/>
																					</svg>
																				</div>
																			</div>
																		)}
																	</div>
																</div>
															) : (
																<div>
																	{analysis.testResultDiff !== undefined ? (
																		<>
																			<span className="difference-indicator">
																				⚠️
																				<span className="tooltip">
																					Giá trị hiện tại:{' '}
																					<div style={{ marginTop: '4px', fontWeight: 'bold' }}>
																						{htmlToText(analysis.testResultDiff) || 'Không có'}
																					</div>
																				</span>
																			</span>
																			<span dangerouslySetInnerHTML={{ __html: analysis.testResult || '--' }} />
																		</>
																	) : (
																		<span dangerouslySetInnerHTML={{ __html: analysis.testResult || '--' }} />
																	)}
																</div>
															)}
														</td>
														<td className="border border-gray-300 px-3 py-2 text-left">
															{isEditing ? (
																<div className="w-full h-full min-h-[30px]" onClick={(e) => e.stopPropagation()}>
																	<div
																		className={`editable-cell border rounded transition-all duration-200 cursor-pointer h-full ${
																			editableCell.analysisIndex === index && editableCell.column === 'testUnit'
																				? 'editing-active border-purple-500'
																				: 'border-transparent hover:border-purple-300'
																		}`}
																	>
																		{editableCell.analysisIndex === index && editableCell.column === 'testUnit' ? (
																			<div className="relative" data-edit-id={`${index}-testUnit`}>
																				<TinyMceInput
																					value={inputValue}
																					onUpdate={(content) => handleSaveContent(content, 'testUnit', index)}
																					onKey={handleKeyDown}
																					placeholder="Nhập đơn vị..."
																				/>
																				{updating && (
																					<div className="absolute top-1 right-1 text-purple-600 save-indicator">
																						<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
																							<path
																								fillRule="evenodd"
																								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																								clipRule="evenodd"
																							/>
																						</svg>
																					</div>
																				)}
																			</div>
																		) : (
																			<div
																				className="w-full h-full p-1 text-xs text-black text-left cursor-pointer hover:bg-blue-50 rounded min-h-[30px] flex items-center group"
																				onClick={(e) => {
																					e.stopPropagation();
																					openEditorWithAutoSave(index, 'testUnit', analysis.testUnit);
																				}}
																			>
																				{analysis.testUnit ? (
																					<div dangerouslySetInnerHTML={{ __html: analysis.testUnit }} />
																				) : (
																					<span className="result-cell-placeholder group-hover:text-gray-600 text-gray-400 italic">
																						Nhấp để nhập đơn vị...
																					</span>
																				)}
																				<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
																					<svg
																						className="w-3 h-3 text-purple-500"
																						fill="none"
																						stroke="currentColor"
																						viewBox="0 0 24 24"
																					>
																						<path
																							strokeLinecap="round"
																							strokeLinejoin="round"
																							strokeWidth="2"
																							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
																						/>
																					</svg>
																				</div>
																			</div>
																		)}
																	</div>
																</div>
															) : (
																<div>
																	{analysis.testUnitDiff !== undefined ? (
																		<>
																			<span className="difference-indicator">
																				⚠️
																				<span className="tooltip">
																					Giá trị hiện tại:{' '}
																					<div style={{ marginTop: '4px', fontWeight: 'bold' }}>
																						{htmlToText(analysis.testUnitDiff) || 'Không có'}
																					</div>
																				</span>
																			</span>
																			<span dangerouslySetInnerHTML={{ __html: analysis.testUnit || '--' }} />
																		</>
																	) : (
																		<span dangerouslySetInnerHTML={{ __html: analysis.testUnit || '--' }} />
																	)}
																</div>
															)}
														</td>
														<td className="border border-gray-300 px-3 py-2 text-left">
															{isEditing ? (
																<input
																	type="text"
																	value={analysis.testProtocolCode || ''}
																	onChange={(e) => handleAnalysisChange(index, 'testProtocolCode', e.target.value)}
																	className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
																	placeholder="Nhập phương pháp..."
																/>
															) : (
																<div>
																	{analysis.testProtocolCodeDiff !== undefined ? (
																		<>
																			<span className="difference-indicator">
																				⚠️
																				<span className="tooltip">
																					Giá trị hiện tại:{' '}
																					<div style={{ marginTop: '4px', fontWeight: 'bold' }}>
																						{htmlToText(analysis.testProtocolCodeDiff) || 'Không có'}
																					</div>
																				</span>
																			</span>
																			{analysis.testProtocolCode || '--'}
																		</>
																	) : (
																		analysis.testProtocolCode || '--'
																	)}
																</div>
															)}
														</td>
														{/* Attachment column */}
														<td className="border border-gray-300 px-3 py-2 text-left">
															{loadingAttachments ? (
																<div className="flex items-center justify-center">
																	<div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
																</div>
															) : (
																<div className="space-y-1">
																	{attachmentData[analysis.testId || analysis.id] &&
																	attachmentData[analysis.testId || analysis.id].length > 0 ? (
																		attachmentData[analysis.testId || analysis.id].map((attachment, attIndex) => (
																			<div key={attIndex} className="flex items-center gap-1">
																				<button
																					onClick={() =>
																						handleAttachmentPreview(attachment.id, `attachment-${attachment.id}`)
																					}
																					className={`text-blue-600 hover:text-blue-800 underline text-sm block text-left ${
																						isLoadingFilePreview ? 'pointer-events-none opacity-50' : ''
																					}`}
																					title={`Click để xem file đính kèm (${new Date(
																						attachment.createdAt,
																					).toLocaleDateString('vi-VN')})`}
																				>
																					{new Date(attachment.createdAt).toLocaleDateString('vi-VN')}
																				</button>
																				{isLoadingFilePreview && (
																					<div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
																				)}
																			</div>
																		))
																	) : (
																		<span className="text-gray-400 text-sm">--</span>
																	)}
																</div>
															)}
														</td>
														{isEditing && (
															<td className="border border-gray-300 px-3 py-2 text-left">
																<button
																	onClick={() => handleRemoveAnalysis(index)}
																	className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
																>
																	Xóa
																</button>
															</td>
														)}
													</tr>
												))
											)}
											{/* Add new row button at the end when editing */}
											{isEditing && (
												<tr>
													<td colSpan={9} className="border border-gray-300 px-3 py-4 text-center">
														<button
															onClick={handleAddAnalysis}
															className="px-4 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
														>
															+ Thêm hàng mới
														</button>
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>

								{/* Action Buttons at Bottom */}
								<div className="mt-4 pb-6 flex justify-end gap-3">
									{analyses.length > 0 && !isEditing && (
										<button
											onClick={handleUpdateResults}
											disabled={isUpdatingResults || currentDoc?.metadata?.status === 'approved'}
											className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
												isUpdatingResults || currentDoc?.metadata?.status === 'approved'
													? 'bg-gray-400 text-white cursor-not-allowed'
													: 'bg-purple-500 text-white hover:bg-purple-600'
											}`}
										>
											{isUpdatingResults && (
												<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
											)}
											{isUpdatingResults ? 'Đang cập nhật...' : 'Cập nhật kết quả'}
										</button>
									)}
								</div>

								{/* FilterableTable cho normal mode */}
								<div className="mt-6 border-t-2 border-gray-200 pt-6">
									{/* Debug information */}
									<div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
										<p>
											<strong>Debug Info:</strong>
										</p>
										<p>API Source: v1/sample/processing/list</p>
										<p>tableData: {tableData.length} items</p>
										<p>displayedAnalysisIds: {displayedAnalysisIds.size} items</p>
										<p>tableLoading: {tableLoading ? 'true' : 'false'}</p>
									</div>
									{tableData.length > 0 ? (
										<>
											<div className="mb-4 flex justify-between items-start">
												<div>
													<h3 className="font-semibold text-gray-900 text-left mb-2">
														Tất cả dữ liệu phân tích ({tableData.length} mục)
													</h3>
													<p className="text-sm text-gray-600 text-left">
														Các hàng màu xám đậm đã được hiển thị ở bảng trên và không thể chọn
													</p>
													{tableSelectedRows.size > 0 && (
														<p className="text-sm text-blue-600 text-left mt-1">
															Đã chọn: {tableSelectedRows.size} hàng
														</p>
													)}
													{tableData.length > 0 && (
														<p className="text-xs text-gray-500 text-left mt-1">
															Đã hiển thị: {tableData.filter((row) => row.isDisplayed).length} | Có thể chọn:{' '}
															{tableData.filter((row) => !row.isDisplayed).length}
														</p>
													)}
												</div>
												<button
													onClick={() => {
														updateDisplayedAnalysisIds();
														loadTableData();
													}}
													className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-1"
													title="Làm mới dữ liệu"
												>
													<FaSync className="w-3 h-3" />
													Làm mới
												</button>
											</div>
											<FilterableTable
												data={tableData}
												columns={[
													'sample_uid',
													'parameter_name',
													'protocol_source',
													'protocol_code',
													'result_value',
													'result_unit',
													'deadline',
													'technicianId',
												]}
												columnConfig={{
													_deprecated_sampleUid: { displayName: 'Mẫu thử', width: '180px' },
													parameter_name: { displayName: 'Chỉ tiêu', width: '200px' },
													protocol_source: { displayName: 'Nguồn', width: '120px' },
													protocol_code: { displayName: 'Phương pháp', width: '160px' },
													result_value: { displayName: 'Kết quả', width: '140px' },
													result_unit: { displayName: 'Đơn vị', width: '100px' },
													deadline: { displayName: 'Hạn trả', width: '100px' },
													technicianId: { displayName: 'Người thực hiện', width: '150px' },
												}}
												selectedRows={tableSelectedRows}
												loading={tableLoading}
												height="400px"
												filters={tableFilters}
												onFiltersChange={setTableFilters}
												sortConfig={tableSortConfig}
												onSortChange={setTableSortConfig}
												// Pagination props
												enablePagination={true}
												serverSidePagination={true}
												currentPage={tableCurrentPage}
												totalPages={tableTotalPages}
												totalItems={tableTotalItems}
												itemsPerPage={tableItemsPerPage}
												onPageChange={handleTablePageChange}
												onItemsPerPageChange={handleTableItemsPerPageChange}
												// Row interaction props
												onRowDoubleClick={handleTableRowDoubleClick}
												// Grouping props
												enableGrouping={true}
												groupBy="_deprecated_sampleUid"
												renderCustomCell={(row, column) => {
													// Mark displayed analyses as disabled
													const isRowDisplayed = row.isDisplayed;

													if (column === '_deprecated_sampleUid') {
														return (
															<div className={`text-sm ${isRowDisplayed ? 'text-gray-400' : ''}`}>
																<div className={`font-semibold ${isRowDisplayed ? 'text-gray-400' : 'text-blue-800'}`}>
																	{row._deprecated_sampleUid}
																</div>
																<div className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}>
																	{row.sample_name || 'N/A'}
																</div>
																<div className={`text-xs ${isRowDisplayed ? 'text-gray-400' : 'text-gray-600'}`}>
																	<span className="font-medium">Nền mẫu:</span> {row.matrix || 'N/A'}
																</div>
																{row.sample_description && (
																	<div className={`text-xs ${isRowDisplayed ? 'text-gray-400' : 'text-gray-600'}`}>
																		<span className="font-medium">Mô tả:</span> {row.sample_description}
																	</div>
																)}
																{row.handover_info && row.handover_info.length > 0 && (
																	<div
																		className={`text-xs mt-2 border-t border-gray-200 pt-2 ${
																			isRowDisplayed ? 'text-gray-400' : 'text-gray-600'
																		}`}
																	>
																		<div className="font-medium mb-1">Bàn giao:</div>
																		{row.handover_info.slice(0, 2).map((info, index) => (
																			<p key={index} className="mb-1 last:mb-0">
																				- <span className="font-semibold">{info.handover_by_name}</span> nhận bàn giao
																				{info.volume && info.volume !== '' && (
																					<span className="font-semibold"> {info.volume} mẫu</span>
																				)}{' '}
																				vào lúc{' '}
																				<span className="font-semibold">
																					{new Date(
																						new Date(info.handover_at).getTime() + 7 * 60 * 60 * 1000,
																					).toLocaleString('vi-VN', {
																						day: '2-digit',
																						month: '2-digit',
																						year: 'numeric',
																						hour: '2-digit',
																						minute: '2-digit',
																					})}
																				</span>
																			</p>
																		))}
																	</div>
																)}
															</div>
														);
													}

													if (column === 'deadline') {
														const deadlineDate = row[column];
														if (!deadlineDate)
															return <span className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}>--</span>;

														const deadline = new Date(deadlineDate);
														const today = new Date();
														deadline.setHours(0, 0, 0, 0);
														today.setHours(0, 0, 0, 0);

														let colorClass = isRowDisplayed ? 'text-gray-400' : 'text-gray-700';
														if (!isRowDisplayed) {
															if (deadline < today) {
																colorClass = 'text-red-600 font-semibold'; // Overdue
															} else if (deadline.getTime() === today.getTime()) {
																colorClass = 'text-yellow-600 font-semibold'; // Today
															}
														}

														return <span className={colorClass}>{deadline.toLocaleDateString('vi-VN')}</span>;
													}

													if (column === 'result_value') {
														return (
															<div
																className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}
																dangerouslySetInnerHTML={{ __html: row[column] || '--' }}
															/>
														);
													}

													if (column === 'technicianId') {
														// Get technician name from context
														const technicianName = row.technicianId
															? technicians?.find((tech) => tech.identity_uid === row.technicianId)?.identity_name ||
															  row.technicianId
															: '--';
														return (
															<span className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}>
																{technicianName}
															</span>
														);
													}
													return (
														<span className={isRowDisplayed ? 'text-gray-400' : 'text-gray-700'}>
															{row[column] || '--'}
														</span>
													);
												}}
												// Custom row props to handle disabled state
												customRowProps={(row) => ({
													'data-displayed': row.isDisplayed,
													style: row.isDisplayed
														? {
																backgroundColor: '#f3f4f6',
																opacity: 0.6,
																pointerEvents: 'none',
																cursor: 'not-allowed',
														  }
														: {},
												})}
												// Override row selection to prevent selecting displayed rows
												onRowSelect={(selectedRows, rowsData) => {
													// Filter out displayed rows from selection
													const filteredRows = new Set();
													const filteredData = new Map();

													selectedRows.forEach((rowId) => {
														const rowData = tableData.find((row) => String(row.id) === rowId);
														if (rowData && !rowData.isDisplayed) {
															filteredRows.add(rowId);
															filteredData.set(rowId, rowData);
														}
													});

													setTableSelectedRows(filteredRows);
												}}
												className={`custom-filterable-table ${
													tableData.some((row) => row.isDisplayed) ? 'has-disabled-rows' : ''
												}`}
											/>
										</>
									) : (
										<div className="p-4 text-center text-gray-500">
											{tableLoading ? (
												<p>Đang tải dữ liệu từ API...</p>
											) : (
												<>
													<p>Không có dữ liệu phân tích từ API</p>
													<p className="text-sm mt-1">API: v1/sample/processing/list</p>
												</>
											)}
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Right side - File Preview */}
						{previewUrl && (
							<div className="w-1/2 flex flex-col">
								<div className="flex-1 overflow-hidden">
									<iframe src={previewUrl} className="w-full h-full border-0" title="File Preview" />
								</div>
							</div>
						)}
					</div>

					{/* Column Selection Modal */}
					{showColumnSelectionModal && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
							<div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
								<h3 className="text-xl font-semibold text-gray-900 mb-4">Chọn các cột cập nhật</h3>
								<p className="text-gray-700 mb-4">Chọn các cột bạn muốn cập nhật vào cơ sở dữ liệu:</p>

								<div className="space-y-3 mb-6">
									<label className="flex items-center">
										<input
											type="checkbox"
											checked={selectedColumns.result_value}
											disabled={true} // Luôn phải có
											className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<span className="text-gray-900 font-medium">
											Kết quả <span className="text-red-500">*</span>
										</span>
									</label>

									<label className="flex items-center">
										<input
											type="checkbox"
											checked={selectedColumns.result_unit}
											onChange={(e) =>
												setSelectedColumns((prev) => ({
													...prev,
													result_unit: e.target.checked,
												}))
											}
											className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<span className="text-gray-900">Đơn vị</span>
									</label>

									<label className="flex items-center">
										<input
											type="checkbox"
											checked={selectedColumns.parameter_name}
											onChange={(e) =>
												setSelectedColumns((prev) => ({
													...prev,
													parameter_name: e.target.checked,
												}))
											}
											className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<span className="text-gray-900">Tên chỉ tiêu</span>
									</label>

									<label className="flex items-center">
										<input
											type="checkbox"
											checked={selectedColumns.protocol_code}
											onChange={(e) =>
												setSelectedColumns((prev) => ({
													...prev,
													protocol_code: e.target.checked,
												}))
											}
											className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<span className="text-gray-900">Phương pháp</span>
									</label>
								</div>

								<div className="flex gap-3 justify-end">
									<button
										onClick={() => {
											setShowColumnSelectionModal(false);
											setIsUpdatingResults(false);
										}}
										disabled={isUpdatingResults}
										className={`px-4 py-2 rounded hover:bg-gray-600 transition-colors ${
											isUpdatingResults ? 'bg-gray-400 text-gray-500 cursor-not-allowed' : 'bg-gray-500 text-white'
										}`}
									>
										Hủy
									</button>
									<button
										onClick={processUpdateWithSelectedColumns}
										className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
									>
										Tiếp tục
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Differences Confirmation Modal */}
					{showDifferencesModal && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
							<div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
								<h3 className="text-xl font-semibold text-gray-900 mb-4">Xác nhận cập nhật kết quả</h3>
								<p className="text-gray-700 mb-4">
									Phát hiện {differencesToUpdate.length} phân tích có thay đổi. Vui lòng xem lại trước khi cập nhật:
								</p>

								<div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
									<table className="w-full border-collapse text-sm">
										<thead className="bg-gray-50 sticky top-0">
											<tr>
												<th className="border border-gray-300 px-3 py-2 text-left">ID</th>
												{selectedColumns.result_value && (
													<th className="border border-gray-300 px-3 py-2 text-left">Kết quả</th>
												)}
												{selectedColumns.result_unit && (
													<th className="border border-gray-300 px-3 py-2 text-left">Đơn vị</th>
												)}
												{selectedColumns.parameter_name && (
													<th className="border border-gray-300 px-3 py-2 text-left">Tên chỉ tiêu</th>
												)}
												{selectedColumns.protocol_code && (
													<th className="border border-gray-300 px-3 py-2 text-left">Phương pháp</th>
												)}
											</tr>
										</thead>
										<tbody>
											{differencesToUpdate.map((analysis, index) => (
												<tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
													<td className="border border-gray-300 px-3 py-2">{analysis.testId}</td>
													{selectedColumns.result_value && (
														<td className="border border-gray-300 px-3 py-2">
															{analysis.testResult !== analysis.originalData?.testResult ? (
																<div>
																	<div className="line-through text-red-500">
																		{analysis.originalData?.testResult || '--'}
																	</div>
																	<div className="text-green-600 font-medium">{analysis.testResult || '--'}</div>
																</div>
															) : (
																analysis.testResult || '--'
															)}
														</td>
													)}
													{selectedColumns.result_unit && (
														<td className="border border-gray-300 px-3 py-2">
															{analysis.testUnit !== analysis.originalData?.testUnit ? (
																<div>
																	<div className="line-through text-red-500">
																		{analysis.originalData?.testUnit || '--'}
																	</div>
																	<div className="text-green-600 font-medium">{analysis.testUnit || '--'}</div>
																</div>
															) : (
																analysis.testUnit || '--'
															)}
														</td>
													)}
													{selectedColumns.parameter_name && (
														<td className="border border-gray-300 px-3 py-2">
															{analysis.testName !== analysis.originalData?.testName ? (
																<div>
																	<div className="line-through text-red-500">
																		{analysis.originalData?.testName || '--'}
																	</div>
																	<div className="text-green-600 font-medium">{analysis.testName || '--'}</div>
																</div>
															) : (
																analysis.testName || '--'
															)}
														</td>
													)}
													{selectedColumns.protocol_code && (
														<td className="border border-gray-300 px-3 py-2">
															{analysis.testProtocolCode !== analysis.originalData?.testProtocolCode ? (
																<div>
																	<div className="line-through text-red-500">
																		{analysis.originalData?.testProtocolCode || '--'}
																	</div>
																	<div className="text-green-600 font-medium">{analysis.testProtocolCode || '--'}</div>
																</div>
															) : (
																analysis.testProtocolCode || '--'
															)}
														</td>
													)}
												</tr>
											))}
										</tbody>
									</table>
								</div>

								<div className="flex gap-3 justify-end mt-6">
									<button
										onClick={() => {
											setShowDifferencesModal(false);
											setDifferencesToUpdate([]);
											setIsUpdatingResults(false);
										}}
										disabled={isUpdatingResults}
										className={`px-4 py-2 rounded hover:bg-gray-600 transition-colors ${
											isUpdatingResults ? 'bg-gray-400 text-gray-500 cursor-not-allowed' : 'bg-gray-500 text-white'
										}`}
									>
										Hủy
									</button>
									<button
										onClick={confirmBulkUpdate}
										disabled={isUpdatingResults}
										className={`px-4 py-2 rounded transition-colors flex items-center gap-2 ${
											isUpdatingResults
												? 'bg-gray-400 text-white cursor-not-allowed'
												: 'bg-purple-500 text-white hover:bg-purple-600'
										}`}
									>
										{isUpdatingResults && (
											<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										)}
										{isUpdatingResults ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}
									</button>
								</div>
							</div>
						</div>
					)}

					{/* File Preview Popup Modal */}
					{showFilePreview && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
							<div className="bg-white rounded-lg p-4 w-[90vw] h-[90vh] max-w-7xl max-h-[90vh] flex flex-col">
								{/* Header */}
								<div className="flex justify-between items-center mb-4 border-b pb-2">
									<h3 className="text-lg font-semibold">Xem trước file</h3>
									<button
										onClick={handleCloseFilePreview}
										className="p-2 hover:bg-gray-100 rounded-full transition-colors"
									>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>

								{/* Loading state */}
								{isLoadingFilePreview && (
									<div className="flex-1 flex items-center justify-center">
										<div className="flex flex-col items-center gap-2">
											<div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
											<span className="text-gray-600">Đang tải file...</span>
										</div>
									</div>
								)}

								{/* File content */}
								{!isLoadingFilePreview && filePreviewUrl && (
									<div className="flex-1 overflow-hidden">
										<iframe
											src={filePreviewUrl}
											className="w-full h-full border-0"
											title="File Preview"
											onLoad={() => setIsLoadingFilePreview(false)}
										/>
									</div>
								)}

								{/* Error state */}
								{!isLoadingFilePreview && !filePreviewUrl && (
									<div className="flex-1 flex items-center justify-center">
										<div className="text-center">
											<svg
												className="w-16 h-16 text-gray-400 mx-auto mb-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
											<p className="text-gray-600">Không thể tải file preview</p>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default ExperimentDetail;
