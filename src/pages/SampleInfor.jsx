import * as React from 'react';
import { AiOutlinePlus } from 'react-icons/ai';
const { useContext, useState, useEffect, useRef } = React;
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { GlobalContext } from '../contexts/GlobalContext';
import Breadcrumb from '../components/Breadcrumb';
import TinyMceInput from '../components/Input';
import { GrDocumentText, GrPrint } from 'react-icons/gr';
import { MdLibraryAdd, MdChevronLeft, MdChevronRight, MdCalendarMonth } from 'react-icons/md';
import Swal from 'sweetalert2';

import {
	FaTrashAlt,
	FaCopy,
	FaUserCog,
	FaSave,
	FaTimes,
	FaRegTimesCircle,
	FaDatabase,
	FaStar,
	FaRegCopy,
	FaCheck,
	FaSync,
	FaLayerGroup,
} from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
// Replace axios import with our helper functions
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import { convertValueToHTML, convertHTMLToValue } from '../contexts/formatHelpers';

// Import @dnd-kit components
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ id, children }) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<tr ref={setNodeRef} style={style} className="cursor-move">
			{children}
			<td className="p-1  text-center">
				<div
					{...attributes}
					{...listeners}
					className="h-5 box-border cursor-move inline-block p-1 hover:bg-gray-100 rounded"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
					</svg>
				</div>
			</td>
		</tr>
	);
};

const SampleInfor = () => {
	// Timezone adjustment functions for GMT+7 (Vietnam timezone)
	const adjustTimezoneForDisplay = (dateValue) => {
		if (!dateValue) return null;

		const date = new Date(dateValue);
		if (isNaN(date.getTime())) return dateValue;

		// Add 7 hours to convert from UTC to Vietnam time for display
		date.setHours(date.getHours() + 7);
		return date.toISOString();
	};

	const adjustDateForApiSubmission = (dateValue) => {
		if (!dateValue) return null;

		const date = new Date(dateValue);
		if (isNaN(date.getTime())) return dateValue;

		// Convert to GMT+7 by setting the time to 7 AM of the selected date
		date.setHours(7, 0, 0, 0);

		// Convert to ISO string for GMT+7 timezone
		const vietnamOffset = 7 * 60; // GMT+7 in minutes
		const localOffset = date.getTimezoneOffset(); // Local timezone offset in minutes
		const totalOffset = vietnamOffset + localOffset; // Total offset to add

		const gmtPlus7Date = new Date(date.getTime() + totalOffset * 60000);
		return gmtPlus7Date.toISOString();
	};

	const [searchParams] = useSearchParams();
	const receiptId = searchParams.get('receiptId');
	const sampleId = searchParams.get('sampleId');

	// Debug URL parameters
	console.log('URL Parameters:', { receiptId, sampleId });
	console.log('Full search params:', searchParams.toString());

	const { setCurrentTitlePage, formatDate, status, purposes, currentUser, getIdenByUid } = useContext(GlobalContext);

	// Get effective receiptId - priority: URL param, fallback: sample.receiptId
	const getEffectiveReceiptId = () => receiptId || sample?.receiptId || null;
	const [technicians, setTechnicians] = useState([]);
	const [currentSample, setCurrentSample] = useState(null);
	const [sample, setSample] = useState(null);
	const [listAnalytes, setListAnalytes] = useState([]);
	const [editingField, setEditingField] = useState(null);
	const [inputValue, setInputValue] = useState('');
	const [isEditorVisible, setIsEditorVisible] = useState(false);
	const [listSampleByReceipt, setListSampleByReceipt] = useState([]);
	// Replace single newReport with separate states for customer and receipt info
	const [customerInfo, setCustomerInfo] = useState([]);
	const [receiptInfo, setReceiptInfo] = useState([]);
	const [newField, setNewField] = useState({ fname: '', fvalue: '' });
	const [isAddingParameter, setIsAddingParameter] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [parameterList, setParameterList] = useState([]);
	const [selectedParameters, setSelectedParameters] = useState([]);
	// Add state for sample analyses
	const [sampleAnalyses, setSampleAnalyses] = useState([]);
	const [isLoadingSampleAnalyses, setIsLoadingSampleAnalyses] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	// Add state for parameter pagination
	const [parameterPagination, setParameterPagination] = useState({
		currentPage: 1,
		itemsPerPage: 20,
		totalItems: 0,
		totalPages: 1,
	});
	const [isLoadingParameters, setIsLoadingParameters] = useState(false);
	const [technicianDropdownVisible, setTechnicianDropdownVisible] = useState(null);
	const [dropdownPosition, setDropdownPosition] = useState({
		top: 0,
		left: 0,
	});
	const [deadlineDropdownVisible, setDeadlineDropdownVisible] = useState(null);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [isReportChanged, setIsReportChanged] = useState(false); // Track if report has changed
	const [typingTimeout, setTypingTimeout] = useState(null);
	const [receiptFull, setReceiptFull] = useState({}); // Legacy state - still used in some parts but not for breadcrumb
	const [isDropdownVisible, setIsDropdownVisible] = useState(false);
	const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
	const [deleteItemId, setDeleteItemId] = useState(null);
	const [deleteType, setDeleteType] = useState(''); // Add state to track delete type
	const [selectedAnalytes, setSelectedAnalytes] = useState([]); // Add state to track selected analytes
	const [selectAll, setSelectAll] = useState(false); // Add state for select all checkbox
	const [isTransferMultipleVisible, setIsTransferMultipleVisible] = useState(false);
	const [selectedTechnician, setSelectedTechnician] = useState(null);
	const [hoveredGroup, setHoveredGroup] = useState(null);
	const [dropdownRect, setDropdownRect] = useState(null);
	const [hoveredIndividualGroup, setHoveredIndividualGroup] = useState(null);
	const [individualDropdownRect, setIndividualDropdownRect] = useState(null);
	const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
	const [isAddingNewParameter, setIsAddingNewParameter] = useState(false);
	const [newParameter, setNewParameter] = useState({
		parameterName: '',
		parameterId: '',
		matrix: '',
		protocolCode: '',
		protocolSource: 'IRDOP',
		resultValue: '',
		resultUnit: '',
		deadline: adjustDateForApiSubmission(new Date()),
		technicianId: '',
		sampleId: 0,
		scientificField: '',
		displayStyle: [
			{
				label: 'default',
				value: '',
			},
			{
				label: 'eng',
				value: '',
			},
		],
	});
	const [editingParameterField, setEditingParameterField] = useState(null); // Add state to track which parameter field is being edited
	const [editingMatrixField, setEditingMatrixField] = useState(null); // Add state to track which matrix field is being edited
	const [editingProtocolField, setEditingProtocolField] = useState(null); // Add state to track which protocol field is being edited
	const [sampleDropdownVisible, setSampleDropdownVisible] = useState(false);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [isBulkDeadlineVisible, setIsBulkDeadlineVisible] = useState(false);
	const [bulkDeadlineDate, setBulkDeadlineDate] = useState(new Date());

	// Add state for drag and drop functionality
	const [customerInfoOrder, setCustomerInfoOrder] = useState([]);
	const [receiptInfoOrder, setReceiptInfoOrder] = useState([]);

	// Initialize sensors for drag and drop
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// Add new state variables for unique lists and dropdowns
	const [uniqueParameterNames, setUniqueParameterNames] = useState([]);
	const [uniqueMatrices, setUniqueMatrices] = useState([]);
	const [uniqueUnits, setUniqueUnits] = useState([]);
	const [matrixInput, setMatrixInput] = useState('');
	const [unitInput, setUnitInput] = useState('');
	const [showMatrixDropdown, setShowMatrixDropdown] = useState(false);
	const [showUnitDropdown, setShowUnitDropdown] = useState(false);
	// Add state variables for pagination in dropdowns
	const [parameterNamePage, setParameterNamePage] = useState(1);
	const [matrixPage, setMatrixPage] = useState(1);
	const [unitPage, setUnitPage] = useState(1);
	const itemsPerPage = 6; // 6 items per page for all dropdowns
	// Add state for scientific fields
	const [scientificFields, setScientificFields] = useState([]);
	// Add state to store original values for comparison
	const [originalValues, setOriginalValues] = useState({});
	// Add state to store original sample values
	const [originalSampleValues, setOriginalSampleValues] = useState({});

	let isFetch = false;
	const [copied, setCopied] = useState(false);

	function CopyButton({ textToCopy }) {
		// Accept text as a prop

		const copyToClipboard = (text) => {
			navigator.clipboard.writeText(text); // Use the parameter 'text'
			setCopied(true);
			showToast(`Đã copy mã mẫu`);
		};

		return (
			<div>
				<FaRegCopy
					className="absolute right-2 top-0 translate-y-3 cursor-pointer text-gray-500"
					size={16}
					onClick={() => copyToClipboard(textToCopy)} // Pass the text to copy
					title={copied ? 'Copied!' : 'Copy to Clipboard'}
				/>
			</div>
		);
	}

	// Add function to handle accreditation toggle
	const handleAccreditationToggle = async (analysisId) => {
		try {
			// Find the analysis
			const analysis = listAnalytes.find((item) => item.id === analysisId);
			if (!analysis) return;

			// Determine new accreditation value
			const newAccreditation = !analysis.accreditation || analysis.accreditation.trim() === '' ? '107' : '';

			// Update UI immediately
			const updatedAnalytes = listAnalytes.map((item) => {
				if (item.id === analysisId) {
					return { ...item, accreditation: newAccreditation };
				}
				return item;
			});
			setListAnalytes(updatedAnalytes);

			// Create minimal update object
			const updateData = {
				id: analysis.id,
				sampleId: analysis.sampleId,
				receiptId: analysis.receiptId,
				accreditation: newAccreditation,
				modifiedByUid: currentUser.identityUid,
			};

			// Send the update to the server
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast(newAccreditation ? 'Đã thêm chứng nhận' : 'Đã bỏ chứng nhận');
			} else {
				// Revert UI on error
				setListAnalytes(listAnalytes);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật chứng nhận',
				});
			}
		} catch (error) {
			console.error('Error updating accreditation:', error);
			// Revert UI on error
			setListAnalytes(listAnalytes);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật chứng nhận',
			});
		}
	};
	// Add function to handle saving individual field changes
	const handleSaveField = async (field, value) => {
		try {
			// Create a copy of the sample with just the updated field
			const updatedSample = {
				...sample,
				[field]: value,
				modifiedByUid: currentUser.identityUid,
			};

			// Update corresponding values in sampleInformation arrays if needed
			if (field === 'sampleName') {
				// Update the "Tên mẫu thử / name." field in customerInfo
				const updatedCustomerInfo = customerInfo.map((item) => {
					if (item.fname.includes('Tên mẫu thử') || item.fname.includes('name')) {
						return { ...item, fvalue: value };
					}
					return item;
				});
				updatedSample.sampleInformation = [...updatedCustomerInfo, ...receiptInfo];
				setCustomerInfo(updatedCustomerInfo);
			}
			if (field === 'sampleDescription') {
				// Update the "Mô tả / desc." field in receiptInfo
				const updatedReceiptInfo = receiptInfo.map((item) => {
					if (item.fname.includes('Mô tả') || item.fname.includes('desc')) {
						return { ...item, fvalue: value };
					}
					return item;
				});
				updatedSample.sampleInformation = [...customerInfo, ...updatedReceiptInfo];
				setReceiptInfo(updatedReceiptInfo);
			}
			if (field === 'matrix') {
				// Update the "Nền mẫu / matrix." field in receiptInfo only locally
				const updatedReceiptInfo = receiptInfo.map((item) => {
					if (item.fname.includes('Nền mẫu') || item.fname.includes('matrix')) {
						return { ...item, fvalue: value };
					}
					return item;
				});
				setReceiptInfo(updatedReceiptInfo);
				// Don't include sampleInformation in matrix updates
			} // Send the update to the server using the required structure
			const response = await apiPost('https://red.irdop.org/v1/sample/edit', {
				sample: {
					id: sample.id,
					sampleId: sample.sampleId,
					[field]: value,
					modifiedByUid: currentUser.identity_uid,
					...(field === 'sampleName' && { sampleInformation: updatedSample.sampleInformation }),
					...(field === 'sampleDescription' && { sampleInformation: updatedSample.sampleInformation }),
				},
			});

			if (response.status === 200) {
				showToast(`${field} updated successfully!`);
				// Update local state
				setSample((prev) => ({ ...prev, [field]: value }));
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || `Failed to update ${field}.`,
				});
			}
		} catch (error) {
			console.error(`Error updating ${field}:`, error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || `An error occurred while updating ${field}.`,
			});
		}
	};

	// New handler for field keydown events
	const handleFieldKeyDown = (e, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			// Just blur the field - the blur handler will save the data
			e.target.blur();
		}
	};
	// Update the function to properly update all analyses matrices
	const updateAllAnalysesMatrices = async (newMatrixValue) => {
		try {
			// Update all analyses with the new matrix value
			const updatedAnalyses = [];

			for (const analysis of listAnalytes) {
				// Create minimal update object with only required fields
				const updateData = {
					id: analysis.id,
					sampleId: analysis.sampleId,
					receiptId: analysis.receiptId,
					matrix: newMatrixValue,
					modifiedByUid: currentUser.identityUid,
				};

				updatedAnalyses.push(updateData);
			}

			// Update UI first
			const newAnalytesList = listAnalytes.map((analyte) => ({
				...analyte,
				matrix: newMatrixValue,
			}));
			setListAnalytes(newAnalytesList);

			// Send bulk update instead of individual updates
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analyses: updatedAnalyses, // Send as bulk update
			});

			if (response.status === 200) {
				showToast(`Đã cập nhật nền mẫu cho ${updatedAnalyses.length} chỉ tiêu`);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: `Lỗi khi cập nhật nền mẫu: ${response.data?.message || 'Unknown error'}`,
				});
			}
		} catch (error) {
			console.error('Error updating analyses matrices:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật nền mẫu cho chỉ tiêu.',
			});
		}
	}; // Modified to update all analyses matrices when sample matrix changes
	const handleFieldBlur = (field, value, originalValue) => {
		// Check if value has actually changed
		if (value === originalValue) {
			// No change, just return without API call
			return;
		}

		// If matrix field is changing, update all analyses too
		if (field === 'matrix') {
			updateAllAnalysesMatrices(value);
		}

		// Save if value has changed
		handleSaveField(field, value);
	};

	// Add handler for field column editing
	const handleFieldColumnChange = async (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, scientificField: newValue };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
		try {
			// Cột 7: scientificField - Chỉ gửi id và scientificField
			const updateData = {
				id: index,
				scientificField: newValue,
			};

			// Send the update to the server
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Đã cập nhật lĩnh vực thành công!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật lĩnh vực',
				});
			}
		} catch (error) {
			console.error('Error updating field:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật lĩnh vực',
			});
		}
	};

	// Modified status change handler
	const handleStatusChange = (statusIndex) => {
		handleSaveField('status', statusIndex);
	};

	// Modified purpose change handler
	const handlePurposeChange = (e) => {
		handleSaveField('purpose', e.target.value);
	};

	// Function to open PPT in new window
	const openPPTWindow = () => {
		// Don't allow technicians to open PPT window
		if (isTechnician()) {
			showToast('Bạn không có quyền tạo phiếu kết quả', 'error');
			return;
		}

		if (sample?.report?.length > 0) {
			// Lấy object có publish_date lớn nhất
			const latestReport = sample.report.reduce((prev, current) =>
				new Date(prev.publish_date) > new Date(current.publish_date) ? prev : current,
			);
			// Mở trang với ppt_uid từ report
			window.open(`${window.location.origin}/report?sampleId=${sampleId}&ppt_uid=${latestReport.ppt_uid}`, '_blank');
		} else {
			// Nếu không có report, mở trang mặc định
			window.open(`${window.location.origin}/report?sampleId=${sampleId}`, '_blank');
		}
	};

	// Add function to fetch technicians
	const fetchTechnicians = async () => {
		try {
			const response = await apiGet('https://pink.irdop.org/v1/iden/get/techinicians');
			if (response.data && Array.isArray(response.data)) {
				setTechnicians(response.data);
			}
		} catch (error) {
			console.error('Error fetching technicians:', error);
		}
	};

	// Helper function to find technician group by alias
	const findTechnicianGroupByAlias = (technicianAlias) => {
		if (!technicianAlias || !technicians || !Array.isArray(technicians)) {
			console.log('Missing technicianAlias or technicians data:', { technicianAlias, technicians });
			return null;
		}

		// First try to find by group alias
		let group = technicians.find((group) => group.alias === technicianAlias);

		if (!group) {
			// Then try to find by individual technician alias within groups
			group = technicians.find(
				(group) =>
					group.technicians &&
					Array.isArray(group.technicians) &&
					group.technicians.some((tech) => tech.technicianAlias === technicianAlias),
			);
		}

		console.log('Found technician group for alias', technicianAlias, ':', group);
		return group;
	};

	const fetchSampleIdsByReceiptId = async () => {
		// Priority: use receiptId from URL query, fallback to sample.receiptId
		const receiptId2 = receiptId || sample?.receiptId;

		if (!receiptId2) {
			console.log('No receiptId available (neither from URL nor sample), skipping fetch');
			return;
		}

		try {
			const response = await apiPost('https://red.irdop.org/v1/option/get/list', {
				listType: 'sampleIdsByReceiptId',
				param: { receiptId: receiptId2 },
			});

			if (response.data && Array.isArray(response.data)) {
				// The response is an array of sampleIds
				setListSampleByReceipt(response.data);
			}
		} catch (error) {
			console.error('Error fetching sample IDs by receipt ID:', error);
		}
	};

	// Add custom toast notification function
	const showToast = (message, type = 'success') => {
		const Toast = Swal.mixin({
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 2000,
			timerProgressBar: true,
			didOpen: (toast) => {
				toast.addEventListener('mouseenter', Swal.stopTimer);
				toast.addEventListener('mouseleave', Swal.resumeTimer);
			},
			width: 'auto',
			padding: '0.5em',
			customClass: {
				popup: 'colored-toast',
			},
		});

		Toast.fire({
			icon: type,
			title: message,
		});
	};

	const handleSearchChange = (e) => {
		const value = e.target.value;
		setSearchTerm(value);
		if (typingTimeout) clearTimeout(typingTimeout);

		if (value.length > 4) {
			// Kiểm tra nếu giá trị tìm kiếm có dạng SPXXxXXXX-YY thì gọi API lấy analyses từ sample
			const sampleUidPattern = /^SP\d{2}[a-zA-Z]\d{4}-\d{2}$/;
			if (sampleUidPattern.test(value.trim())) {
				// Clear existing sample analyses
				setSampleAnalyses([]);
				setIsLoadingSampleAnalyses(true);

				const timeout = setTimeout(async () => {
					try {
						const response = await apiPost('https://red.irdop.org/v1/sample/get/full', {
							sampleId: value.trim(),
						});

						if (response.status === 200 && response.data?.analyses) {
							// Add tempId to distinguish from regular parameters
							const analysesWithTempId = response.data.analyses.map((analysis, index) => ({
								...analysis,
								tempId: `sample_${value.trim()}_${index}`,
								// Map snake_case to camelCase
								createdAt: analysis.createdAt || analysis.created_at,
								createdById: analysis.createdById || analysis.created_by_uid,
								modifiedAt: analysis.modifiedAt || analysis.modified_at,
								modifiedById: analysis.modifiedById || analysis.modified_by_uid,
								receiptId: analysis.receiptId || analysis.receipt_id,
								sampleId: analysis.sampleId || analysis.sample_id,
								protocolId: analysis.protocolId || analysis.protocol_id,
								parameterId: analysis.parameterId || analysis.parameter_id,
								technicianId: analysis.technicianId || analysis.technician_uid,
								parameterName: analysis.parameterName || analysis.parameter_name,
								protocolSource: analysis.protocolSource || analysis.protocol_source,
								protocolCode: analysis.protocolCode || analysis.protocol_code,
								resultUnit: analysis.resultUnit || analysis.result_unit,
								resultValue: analysis.resultValue || analysis.result_value,
								_deprecated_productType: analysis._deprecated_productType || analysis.product_type,
								_deprecated_parameterUid: analysis._deprecated_parameterUid || analysis.parameter_uid,
								reviewedById: analysis.reviewedById || analysis.reviewed_by,
								submitLastResultAt: analysis.submitLastResultAt || analysis.submit_result_at,
								submitLastResultById: analysis.submitLastResultById || analysis.submit_result_by,
								resultReference: analysis.resultReference || analysis.reference,
								scientificField: analysis.scientificField || analysis.field,
								exInfo: analysis.exInfo || analysis.ex_info,
								_deprecated_sampleUid: analysis._deprecated_sampleUid || analysis.sample_uid,
								_deprecated_receiptUid: analysis._deprecated_receiptUid || analysis.receipt_uid,
								docId: analysis.docId || analysis.doc_id,
								displayStyle: analysis.displayStyle || analysis.display_style,
								matrix: analysis.matrix,
								accreditation: analysis.accreditation,
							}));

							setSampleAnalyses(analysesWithTempId);
							console.log('Loaded analyses from sample:', analysesWithTempId);
						} else {
							setSampleAnalyses([]);
							console.warn('No analyses found for sample:', value.trim());
						}
					} catch (error) {
						console.error('Error fetching sample analyses:', error);
						setSampleAnalyses([]);
					} finally {
						setIsLoadingSampleAnalyses(false);
					}
				}, 500);

				setTypingTimeout(timeout);
			} else {
				// Clear sample analyses when not a sampleId
				setSampleAnalyses([]);
				setIsLoadingSampleAnalyses(false);

				const timeout = setTimeout(() => {
					if (value.trim() !== '') {
						setCurrentPage(1); // Reset to first page when new search
						setParameterPagination((prev) => ({ ...prev, currentPage: 1 }));
						searchParameters(value, 1); // Always start from page 1 for new search
					}
				}, 500);

				setTypingTimeout(timeout);
			}
		} else {
			// Clear sample analyses when input is too short
			setSampleAnalyses([]);
			setIsLoadingSampleAnalyses(false);
		}
	};

	const handleSearchKeyDown = (e) => {
		if (e.key === 'Enter' && searchTerm.length >= 2) {
			// Kiểm tra nếu giá trị tìm kiếm có dạng SPXXxXXXX-YY
			const sampleUidPattern = /^SP\d{2}[a-zA-Z]\d{4}-\d{2}$/;
			if (sampleUidPattern.test(searchTerm.trim())) {
				// Gọi API get/sample_full/{giá trị tìm kiếm} và tự động thêm tất cả analysis
				fetchSampleFullAndAddAll(searchTerm.trim());
			} else {
				// Tìm kiếm parameter thông thường với API mới
				if (typingTimeout) clearTimeout(typingTimeout);
				setCurrentPage(1);
				setParameterPagination((prev) => ({ ...prev, currentPage: 1 }));
				searchParameters(searchTerm, 1);
			}
		}
	};

	const searchParameters = async (query, page = 1) => {
		try {
			setIsLoadingParameters(true);
			const response = await apiPost('https://red.irdop.org/v1/parameter/get', {
				columns: [
					'id',
					'parameterName',
					'matrix',
					'scientificField',
					'displayStyle',
					'fee',
					'accreditation',
					'protocolSource',
					'protocolCode',
					'technicianAlias',
				],
				page: page,
				itemsPerPage: 20,
				sortBy: 'ASC',
				columnSort: 'createdAt',
				searchTerm: query,
			});

			if (response.status === 200) {
				console.log('Parameter search response:', response.data);
				setParameterList(response.data.result || []);
				setParameterPagination(
					response.data.pagination || {
						currentPage: 1,
						itemsPerPage: 20,
						totalItems: 0,
						totalPages: 1,
					},
				);
			} else {
				console.error('Error in parameter search:', response);
				setParameterList([]);
			}
		} catch (error) {
			console.error('Error searching parameters:', error);
			setParameterList([]);
		} finally {
			setIsLoadingParameters(false);
		}
	};

	const fetchSampleFullAndAddAll = async (sampleUid) => {
		try {
			const response = await apiGet(`https://black.irdop.org/to82oe92i/db/get/sample_full/${sampleUid}`);
			if (response.data && response.data.analysis) {
				// Tạo danh sách analysis để thêm trực tiếp
				const analyses = response.data.analysis.map((analysis) => {
					// Tạo object mới không có resultValue và reviewedBy
					const { resultValue, reviewedBy, result_value, reviewed_by, ...cleanAnalysis } = analysis;
					return {
						...cleanAnalysis,
						tempId: Math.random().toString(36).substr(2, 9),
						// Map snake_case to camelCase
						createdAt: cleanAnalysis.createdAt || cleanAnalysis.created_at,
						createdById: cleanAnalysis.createdById || cleanAnalysis.created_by_uid,
						modifiedAt: cleanAnalysis.modifiedAt || cleanAnalysis.modified_at,
						modifiedById: cleanAnalysis.modifiedById || cleanAnalysis.modified_by_uid,
						receiptId: cleanAnalysis.receiptId || cleanAnalysis.receipt_id,
						sampleId: cleanAnalysis.sampleId || cleanAnalysis.sample_id,
						protocolId: cleanAnalysis.protocolId || cleanAnalysis.protocol_id,
						parameterId: cleanAnalysis.parameterId || cleanAnalysis.parameter_id,
						technicianId: cleanAnalysis.technicianId || cleanAnalysis.technician_uid,
						parameterName: cleanAnalysis.parameterName || cleanAnalysis.parameter_name,
						protocolSource: cleanAnalysis.protocolSource || cleanAnalysis.protocol_source,
						protocolCode: cleanAnalysis.protocolCode || cleanAnalysis.protocol_code,
						resultUnit: cleanAnalysis.resultUnit || cleanAnalysis.result_unit,
						_deprecated_productType: cleanAnalysis._deprecated_productType || cleanAnalysis.product_type,
						_deprecated_parameterUid: cleanAnalysis._deprecated_parameterUid || cleanAnalysis.parameter_uid,
						submitLastResultAt: cleanAnalysis.submitLastResultAt || cleanAnalysis.submit_result_at,
						submitLastResultById: cleanAnalysis.submitLastResultById || cleanAnalysis.submit_result_by,
						resultReference: cleanAnalysis.resultReference || cleanAnalysis.reference,
						scientificField: cleanAnalysis.scientificField || cleanAnalysis.field,
						exInfo: cleanAnalysis.exInfo || cleanAnalysis.ex_info,
						_deprecated_sampleUid: cleanAnalysis._deprecated_sampleUid || cleanAnalysis.sample_uid,
						_deprecated_receiptUid: cleanAnalysis._deprecated_receiptUid || cleanAnalysis.receipt_uid,
						docId: cleanAnalysis.docId || cleanAnalysis.doc_id,
						displayStyle: cleanAnalysis.displayStyle ||
							cleanAnalysis.display_style || [
								{
									label: 'default',
									value: '',
								},
								{
									label: 'eng',
									value: '',
								},
							],
					};
				});

				// Tự động thêm tất cả analysis vào selectedParameters
				setSelectedParameters([...selectedParameters, ...analyses]);
				showToast(`Đã thêm ${analyses.length} chỉ tiêu từ mẫu ${sampleUid}`);
				setSearchTerm(''); // Clear the search input field
			} else {
				showToast('Không tìm thấy mẫu với mã này', 'warning');
			}
		} catch (error) {
			console.error('Error fetching sample full:', error);
			showToast('Có lỗi xảy ra khi tìm kiếm mẫu', 'error');
		}
	};

	const handleParameterSelect = (parameter) => {
		// Kiểm tra nếu parameter có tempId (tức là từ sample)
		if (parameter.tempId) {
			// Xử lý parameter từ sample
			if (!selectedParameters.some((p) => p.tempId === parameter.tempId)) {
				setSelectedParameters([
					...selectedParameters,
					{
						...parameter,
						parameterId: parameter.parameterId || parameter.parameter_id || parameter.id,
						_deprecated_parameterUid: parameter._deprecated_parameterUid || parameter.parameter_uid || '',
						displayStyle: parameter.displayStyle ||
							parameter.display_style || [
								{
									label: 'default',
									value: '',
								},
								{
									label: 'eng',
									value: '',
								},
							],
					},
				]);
			}
		} else {
			// Xử lý parameter thông thường từ API mới
			if (!selectedParameters.some((p) => p.id === parameter.id)) {
				setSelectedParameters([
					...selectedParameters,
					{
						...parameter,
						parameterId: parameter.id, // Map id to parameterId
						_deprecated_parameterUid: parameter._deprecated_parameterUid || parameter.parameter_uid || '',
						displayStyle: parameter.displayStyle ||
							parameter.display_style || [
								{
									label: 'default',
									value: '',
								},
								{
									label: 'eng',
									value: '',
								},
							],
					},
				]);
			}
		}
		setSearchTerm(''); // Clear the search input field
		setParameterList([]); // Clear parameter list to hide dropdown
		setParameterPagination({
			// Reset pagination
			currentPage: 1,
			itemsPerPage: 20,
			totalItems: 0,
			totalPages: 1,
		});
	};

	const handleRemoveParameter = (index) => {
		const updatedParameters = selectedParameters.filter((_, i) => i !== index);
		setSelectedParameters(updatedParameters);
	};
	const handleConfirmAddParameter = async () => {
		try {
			if (selectedParameters.length === 0) {
				showToast('Không có chỉ tiêu nào được chọn', 'warning');
				return;
			}

			const parameters = selectedParameters.map((parameter) => {
				const analysisData = {
					receiptId: currentSample.receiptId,
					sampleId: currentSample.id,
					parameterId: parameter.parameterId || 0,
					parameterName: parameter.parameterName,
					_deprecated_parameterUid: parameter._deprecated_parameterUid || parameter.parameterUid || '', // Use deprecated field name
					matrix: parameter.matrix || '', // Include matrix from sample analyses
					scientificField: parameter.scientificField || '', // Include scientificField from sample analyses
					displayStyle: parameter.displayStyle || [
						{
							label: 'default',
							value: '',
						},
						{
							label: 'eng',
							value: '',
						},
					],
					accrenditation: parameter.accrenditation,
					protocolId: parameter.protocolId,
					technicianId: parameter.technicianId || parameter.technicianUid,
					deadline: parameter.deadline
						? adjustDateForApiSubmission(new Date(parameter.deadline))
						: adjustDateForApiSubmission(
								new Date(Date.now() + (parameter?.tatExpected?.days * 24 * 60 * 60 * 1000 || 0)),
						  ),
					protocolCode: parameter.protocolCode,
					resultUnit: parameter.defaultUnit || parameter.resultUnit,
					protocolSource: parameter.protocolSource,
					createdById: currentUser.identity_uid,
					modifiedById: currentUser.identity_uid,
				};

				// Only add resultValue if it exists and is not empty
				if (parameter.resultValue && parameter.resultValue !== '') {
					analysisData.resultValue = parameter.resultValue;
				}

				return analysisData;
			});

			// Use the new analysis/create API endpoint
			const response = await apiPost('https://red.irdop.org/v1/analysis/create', {
				analyses: parameters, // For multiple analyses
			});

			if (response.status === 200) {
				showToast(`${response.data.length} chỉ tiêu được thêm thành công!`);
				setIsAddingParameter(false);
				setSelectedParameters([]);
				setSampleAnalyses([]);
				setSearchTerm('');
				setIsLoadingSampleAnalyses(false);
				setParameterList([]);
				setIsLoadingParameters(false);
				setCurrentPage(1);
				setParameterPagination({
					currentPage: 1,
					itemsPerPage: 20,
					totalItems: 0,
					totalPages: 1,
				});

				// Update listAnalytes with the new analyses from the API response
				setListAnalytes([...listAnalytes, ...response.data]);

				// Also update currentSample to maintain consistency
				setCurrentSample({
					...currentSample,
					analysis: [...currentSample.analysis, ...response.data],
				});
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to add parameters.',
				});
			}
		} catch (error) {
			console.error('Error adding parameters:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while adding parameters.',
			});
		}
	};

	const handleCancelAddParameter = () => {
		setIsAddingParameter(false);
		setSelectedParameters([]);
		setSampleAnalyses([]);
		setSearchTerm('');
		setIsLoadingSampleAnalyses(false);
		setParameterList([]);
		setIsLoadingParameters(false);
		setCurrentPage(1);
		setParameterPagination({
			currentPage: 1,
			itemsPerPage: 20,
			totalItems: 0,
			totalPages: 1,
		});
	};

	const handleAddNewParameter = () => {
		setIsAddingParameter(false);
		setIsAddingNewParameter(true);
		// Set the sample_id from the current sample and ensure displayStyle is initialized
		setNewParameter({
			...newParameter,
			sample_id: currentSample?.id,
			matrix: currentSample?.matrix || '',
			displayStyle: [
				{
					label: 'default',
					value: '',
				},
				{
					label: 'eng',
					value: '',
				},
			],
		});
		// Scroll to the top of the table
		window.scrollTo({
			top: document.querySelector('.analytes-table').offsetTop - 100,
			behavior: 'smooth',
		});
	};

	const handleCancelNewParameter = () => {
		setIsAddingNewParameter(false);
	};
	// These functions have been removed as they were related to updateParameterMode	// Helper function for updating analysis
	const updateAnalysis = async (analysis) => {
		try {
			// Determine which fields need to be updated
			const changedFields = {};

			// Identify which fields need to be updated
			if (analysis.parameterName !== undefined) changedFields.parameterName = analysis.parameterName;
			if (analysis.resultValue !== undefined && analysis.resultValue !== '')
				changedFields.resultValue = convertValueToHTML(analysis.resultValue);
			if (analysis.matrix !== undefined) changedFields.matrix = analysis.matrix;
			if (analysis.resultUnit !== undefined) changedFields.resultUnit = convertValueToHTML(analysis.resultUnit);
			if (analysis.protocolCode !== undefined) changedFields.protocolCode = analysis.protocolCode;
			if (analysis.protocolSource !== undefined) changedFields.protocolSource = analysis.protocolSource;
			if (analysis.deadline !== undefined) changedFields.deadline = analysis.deadline;
			if (analysis.field !== undefined) changedFields.field = analysis.field;

			// Create minimal update object
			const updateData = {
				id: analysis.id,
				sampleId: analysis.sampleId,
				receiptId: analysis.receiptId,
				modifiedByUid: currentUser.identity_uid,
				...changedFields,
				displayStyle: analysis.displayStyle || [
					{
						label: 'default',
						value: '',
					},
					{
						label: 'eng',
						value: '',
					},
				],
			};

			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Chỉ tiêu đã được cập nhật!');
				// Return the analysis data from the response instead of the original analysis
				return response.data || analysis;
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật chỉ tiêu.',
				});
			}
			return analysis;
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật.',
			});
			return analysis;
		}
	};
	const onUpdateAnalysis = async (analysis) => {
		try {
			// Determine which field is being updated
			const fieldBeingUpdated = {};

			// Check each field that might have been updated
			if (analysis.parameterName !== undefined) fieldBeingUpdated.parameterName = analysis.parameterName;
			if (analysis.resultValue !== undefined && analysis.resultValue !== '')
				fieldBeingUpdated.resultValue = convertValueToHTML(analysis.resultValue);
			if (analysis.resultUnit !== undefined) fieldBeingUpdated.resultUnit = convertValueToHTML(analysis.resultUnit);
			if (analysis.protocolCode !== undefined) fieldBeingUpdated.protocolCode = analysis.protocolCode;
			if (analysis.protocolSource !== undefined) fieldBeingUpdated.protocolSource = analysis.protocolSource;
			if (analysis.technicianId !== undefined) fieldBeingUpdated.technicianId = analysis.technicianId;
			if (analysis.deadline !== undefined) fieldBeingUpdated.deadline = analysis.deadline;

			// Create minimal update object
			const updateData = {
				id: analysis.id,
				sampleId: analysis.sample_id,
				receiptId: analysis.receiptId,
				modifiedByUid: currentUser.identity_uid,
				...fieldBeingUpdated,
				displayStyle: analysis.displayStyle || [
					{
						label: 'default',
						value: '',
					},
					{
						label: 'eng',
						value: '',
					},
				],
			};

			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Chỉ tiêu đã được cập nhật!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Lỗi khi cập nhật chỉ tiêu.',
				});
			}
			return analysis;
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật chỉ tiêu.',
			});
			return analysis;
		}
	};

	const handleSaveNewParameter = async () => {
		try {
			// Make sure required fields are filled
			if (!newParameter.parameterName) {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: 'Tên chỉ tiêu không được để trống',
				});
				return;
			} // We don't update the parameter library anymore
			var parameterId = 0; // Now create the analysis with the parameterId (exclude resultValue)
			const { resultValue, ...newParameterWithoutResult } = newParameter;
			const analysisToAdd = {
				...newParameterWithoutResult,
				parameterId: parameterId,
				receiptId: currentSample.receipt_id,
				sampleId: currentSample.id,
				createdByUid: currentUser.identity_uid,
				modifiedByUid: currentUser.identity_uid,
			};

			// Use the new analysis/create API endpoint for single analysis
			const response = await apiPost('https://red.irdop.org/v1/analysis/create', {
				analysis: analysisToAdd, // For single analysis
			});

			if (response.status === 200) {
				showToast('Chỉ tiêu đã được thêm thành công!');
				// Add the new parameter to the list
				setListAnalytes([response.data, ...listAnalytes]);
				setIsAddingNewParameter(false);
				// Reset the new parameter object
				setNewParameter({
					parameterName: '',
					parameterUid: '',
					matrix: currentSample?.matrix || '',
					protocolCode: '',
					protocolSource: 'IRDOP',
					resultValue: '',
					resultUnit: '',
					deadline: adjustDateForApiSubmission(new Date()),
					technicianUid: '',
					sampleId: currentSample?.id || 0,
					displayStyle: [
						{
							label: 'default',
							value: '',
						},
						{
							label: 'eng',
							value: '',
						},
					],
				});
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Không thể thêm chỉ tiêu.',
				});
			}
		} catch (error) {
			console.error('Error adding new parameter:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi thêm chỉ tiêu.',
			});
		}
	};

	const handleNewParameterChange = (field, value) => {
		setNewParameter({
			...newParameter,
			[field]: value,
		});
	};

	// Function to handle displayStyle changes for new parameter
	const handleNewParameterDisplayStyleChange = (label, value) => {
		const updatedDisplayStyle = newParameter.displayStyle.map((item) =>
			item.label === label ? { ...item, value } : item,
		);
		setNewParameter({
			...newParameter,
			displayStyle: updatedDisplayStyle,
		});
	};

	const renderNewParameter = () => {
		// Use API data directly, no need for client-side slicing
		const paginatedParameters = parameterList;

		const handlePageChange = (page) => {
			setCurrentPage(page);
			// Trigger new API call with updated page
			if (searchTerm && searchTerm.trim() !== '') {
				searchParameters(searchTerm, page);
			}
		};

		const renderPageButtons = () => {
			const { totalPages, currentPage } = parameterPagination;
			const pageButtons = [];

			if (totalPages <= 5) {
				for (let i = 1; i <= totalPages; i++) {
					pageButtons.push(
						<button
							key={i}
							className={`p-2 ${currentPage === i ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(i)}
						>
							{i}
						</button>,
					);
				}
			} else {
				if (currentPage > 2) {
					pageButtons.push(
						<button
							key={1}
							className={`p-2 ${currentPage === 1 ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(1)}
						>
							1
						</button>,
					);
					if (currentPage > 3) {
						pageButtons.push(<span key="dots1">...</span>);
					}
				}

				const startPage = Math.max(2, currentPage - 1);
				const endPage = Math.min(totalPages - 1, currentPage + 1);

				for (let i = startPage; i <= endPage; i++) {
					pageButtons.push(
						<button
							key={i}
							className={`p-2 ${currentPage === i ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(i)}
						>
							{i}
						</button>,
					);
				}

				if (currentPage < totalPages - 2) {
					if (currentPage < totalPages - 3) {
						pageButtons.push(<span key="dots2">...</span>);
					}
					pageButtons.push(
						<button
							key={totalPages}
							className={`p-2 ${currentPage === totalPages ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(totalPages)}
						>
							{totalPages}
						</button>,
					);
				}
			}

			return pageButtons;
		};

		return (
			<div
				className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50"
				onClick={() => setIsAddingParameter(false)} // Close when clicking the overlay
			>
				<div
					className="bg-white p-4 rounded-lg w-[90%] md:w-[70%] xl:w-[50%] h-3/5 max-w-[700px] min-h-[400px] max-h-[700px] relative"
					onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it
				>
					{/* Rest of the modal content stays the same */}
					<div className="w-full h-full relative flex flex-col justify-between overflow-auto">
						<div>
							<h2 className="text-2xl font-semibold mb-4">Thêm chỉ tiêu kiểm nghiệm</h2>
							<input
								type="text"
								value={searchTerm}
								onChange={handleSearchChange}
								onKeyDown={handleSearchKeyDown}
								className="w-full p-2 border rounded mb-4 bg-white focus:outline-none focus:border-purple-500"
								placeholder="Tìm kiếm chỉ tiêu hoặc nhập Sample ID (SPxxAxxxx-xx) để lấy từ mẫu khác..."
							/>

							{/* Show dropdown only for regular parameter search, not for sample analyses */}
							{searchTerm.length > 1 && sampleAnalyses.length === 0 && !isLoadingSampleAnalyses && (
								<div className="absolute bg-white border rounded w-full max-h-72 overflow-y-auto mb-4 z-10">
									{/* Show loading indicator */}
									{isLoadingParameters && (
										<div className="p-4 text-center text-gray-500">
											<div className="flex items-center justify-center">
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
												Đang tìm kiếm chỉ tiêu...
											</div>
										</div>
									)}

									{/* Show regular parameters only when not loading */}
									{!isLoadingParameters && paginatedParameters.length > 0 && (
										<div>
											<div className="p-2 bg-gray-50 border-b font-medium text-gray-600 flex justify-between items-center">
												<span>Kết quả tìm kiếm ({parameterPagination.totalItems} chỉ tiêu)</span>
												<span className="text-sm">
													Trang {parameterPagination.currentPage}/{parameterPagination.totalPages}
												</span>
											</div>
											<ul>
												{paginatedParameters.map((parameter, index) => (
													<li
														key={parameter.id || index}
														className="p-2 border-b cursor-pointer hover:bg-gray-200"
														onClick={() => handleParameterSelect(parameter)}
													>
														<div>
															<p className="text-start text-xs font-medium w-full line-clamp-1">
																Nền mẫu: {parameter.matrix}
															</p>
															<p className="text-start text-primary font-medium w-full line-clamp-1">
																{parameter.parameterName}
															</p>
															<p className="text-start text-text-secondary w-full line-clamp-1">
																{parameter.protocolCode}
																{parameter.accreditation && (
																	<b className="text-green-600">{` (${parameter.accreditation['107'] ? '107' : ''}  ${
																		parameter.accreditation['VILAS997'] ? 'VILAS 997' : ''
																	} )`}</b>
																)}
															</p>
															{parameter.scientificField && (
																<p className="text-start text-xs text-blue-600 w-full line-clamp-1">
																	Lĩnh vực: {parameter.scientificField}
																</p>
															)}
														</div>
													</li>
												))}
											</ul>
											{parameterPagination.totalPages > 1 && (
												<div className="flex justify-center mt-2 p-2 border-t bg-gray-50">{renderPageButtons()}</div>
											)}
										</div>
									)}

									{/* Show no results message when not loading and no results */}
									{!isLoadingParameters && paginatedParameters.length === 0 && (
										<div className="p-4 text-center text-gray-500">
											Không tìm thấy chỉ tiêu nào với từ khóa "{searchTerm}"
										</div>
									)}
								</div>
							)}
						</div>

						{/* Show sample analyses in a separate box below input */}
						{(isLoadingSampleAnalyses || sampleAnalyses.length > 0) && (
							<div className="mb-4 border rounded bg-gray-50 max-h-60 overflow-y-auto">
								{isLoadingSampleAnalyses && (
									<div className="p-4 text-center text-gray-500">
										<div className="flex items-center justify-center">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
											Đang tải dữ liệu từ mẫu {searchTerm}...
										</div>
									</div>
								)}

								{sampleAnalyses.length > 0 && (
									<div>
										<div className="p-2 bg-blue-100 border-b font-medium text-blue-800 sticky top-0 flex justify-between items-center">
											<span>
												Chỉ tiêu từ mẫu {searchTerm} ({sampleAnalyses.length} chỉ tiêu)
											</span>
											<button
												onClick={() => {
													// Add all sample analyses to selectedParameters
													const newAnalyses = sampleAnalyses.filter(
														(analysis) =>
															!selectedParameters.some(
																(selected) =>
																	selected.tempId === analysis.tempId ||
																	(selected.parameterName === analysis.parameterName &&
																		selected.matrix === analysis.matrix),
															),
													);
													setSelectedParameters([...selectedParameters, ...newAnalyses]);
													showToast(`Đã thêm ${newAnalyses.length} chỉ tiêu từ mẫu`);
												}}
												className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
											>
												Chọn tất cả
											</button>
										</div>
										<div className="grid grid-cols-1 gap-1 p-2">
											{sampleAnalyses.map((analysis, index) => {
												const isAlreadySelected = selectedParameters.some(
													(selected) =>
														selected.tempId === analysis.tempId ||
														(selected.parameterName === analysis.parameterName && selected.matrix === analysis.matrix),
												);

												return (
													<div
														key={analysis.tempId || analysis.id || index}
														className={`p-2 border border-gray-200 rounded cursor-pointer transition-colors ${
															isAlreadySelected ? 'bg-green-50 border-green-300 opacity-75' : 'hover:bg-blue-50'
														}`}
														onClick={() => !isAlreadySelected && handleParameterSelect(analysis)}
													>
														<div className="flex justify-between items-start">
															<div className="flex-1">
																<p className="text-start text-xs font-medium w-full line-clamp-1 text-gray-600">
																	Nền mẫu: {analysis.matrix}
																</p>
																<p className="text-start text-primary font-medium w-full line-clamp-1">
																	{analysis.parameterName}
																</p>
																<p className="text-start text-text-secondary w-full line-clamp-1 text-sm">
																	{analysis.protocolCode}
																	{analysis.accreditation && (
																		<b className="text-green-600">{` (${analysis.accreditation['107'] ? '107' : ''}  ${
																			analysis.accreditation['VILAS997'] ? 'VILAS 997' : ''
																		} )`}</b>
																	)}
																</p>
																{analysis.scientificField && (
																	<p className="text-start text-xs text-blue-600 w-full line-clamp-1">
																		Lĩnh vực: {analysis.scientificField}
																	</p>
																)}
															</div>
															{isAlreadySelected && (
																<div className="flex-shrink-0 ml-2">
																	<span className="bg-green-500 text-white text-xs px-2 py-1 rounded">✓ Đã chọn</span>
																</div>
															)}
														</div>
													</div>
												);
											})}
										</div>
									</div>
								)}
							</div>
						)}

						<div className="mb-4 h-full flex overflow-y-auto text-sm flex-wrap content-start">
							{selectedParameters.map((parameter, index) => (
								<div
									key={parameter.tempId || parameter.id || index}
									className="p-1 border rounded mb-2 flex text-start items-center w-fit h-fit mr-1 max-w-68"
								>
									<div>
										<p className="text-xs font-medium w-full line-clamp-1">Nền mẫu: {parameter.matrix}</p>
										<p className="text-primary font-medium w-full line-clamp-1">{parameter.parameterName}</p>
										<p className="text-start text-text-secondary w-full line-clamp-1">
											{parameter.protocolCode}
											{parameter?.accreditation && (
												<b>{` (${parameter.accreditation['107'] ? '107' : ''}  ${
													parameter.accreditation['VILAS997'] ? 'VILAS 997' : ''
												} )`}</b>
											)}
											{parameter.tempId && <span className="text-blue-600 font-medium"> - Từ mẫu khác</span>}
										</p>
									</div>

									<button className="text-red-500 px-2 py-3 ml-1" onClick={() => handleRemoveParameter(index)}>
										<FaTrashAlt />
									</button>
								</div>
							))}
						</div>
						<div className="flex justify-between items-center">
							<div className="flex">
								<button className="bg-white border-gray-300 p-2 rounded" onClick={handleAddNewParameter}>
									Thêm chỉ tiêu mới
								</button>
							</div>

							<div className="flex justify-end">
								<button className="bg-gray-500 text-white p-2 rounded mr-2" onClick={handleCancelAddParameter}>
									Hủy bỏ
								</button>
								<button className="bg-green-500 text-white p-2 rounded" onClick={handleConfirmAddParameter}>
									Xác nhận
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	};

	let defaultCustomerFields = [
		{
			fname: 'Tên mẫu thử / name.',
			fvalue: currentSample?.sampleName || '',
		},
		{ fname: 'Số lô / LOT no.', fvalue: '' },
		{ fname: 'Hạn sử dụng / exp.', fvalue: '' },
		{ fname: 'Ngày sản xuất / mfg.', fvalue: '' },
		{ fname: 'Nơi sản xuất / mfr.', favlue: '' },
	];
	let defaultReceiptFields = [
		{
			fname: 'Ngày tiếp nhận / receipt date.',
			fvalue: formatDate(receiptFull?.receipt_date) || '',
		},
		{ fname: 'Ngày thử nghiệm / test date.', fvalue: '' },
		{
			fname: 'Mô tả / desc.',
			fvalue: currentSample?.sampleDescription || '',
		},
		{ fname: 'Mã tiếp nhận / receipt code.', fvalue: receiptId || '' },
		{
			fname: 'Ngày hoàn thành / deadline.',
			fvalue: formatDate(receiptFull?.deadline) || '',
		},
		{ fname: 'Nền mẫu / matrix.', fvalue: currentSample?.matrix || '' },
	];

	const navigate = useNavigate();
	let key;

	useEffect(() => {
		fetchTechnicians();
		setCurrentTitlePage('Mẫu kiểm nghiệm');

		// Fetch lists for dropdowns
		if (!isFetch) {
			isFetch = true;
			fetchDropdownLists();
		}
	}, []);

	// Add function to fetch dropdown lists
	const fetchDropdownLists = async () => {
		try {
			// Fetch matrices from API
			const matricesResponse = await apiGet('https://black.irdop.org/get/list_enum/matrix');
			if (matricesResponse.data && Array.isArray(matricesResponse.data)) {
				setUniqueMatrices(matricesResponse.data.filter(Boolean));
			}

			// Fetch units from API
			const unitsResponse = await apiGet('https://black.irdop.org/get/list_enum/unit');
			if (unitsResponse.data && Array.isArray(unitsResponse.data)) {
				setUniqueUnits(unitsResponse.data.filter(Boolean));
			}

			// Fetch scientific fields from new API
			const scientificFieldsResponse = await apiPost('https://red.irdop.org/v1/option/get/list', {
				listType: 'scientificFields',
			});
			console.log('Scientific fields response:', scientificFieldsResponse);
			if (scientificFieldsResponse.data && Array.isArray(scientificFieldsResponse.data)) {
				setScientificFields(scientificFieldsResponse.data.filter(Boolean));
			}

			// Fetch parameter names from available analyses
			const parametersResponse = await apiGet('https://black.irdop.org/ha8i0uw2/db/get/parameter');
			if (parametersResponse.data && Array.isArray(parametersResponse.data)) {
				const parameterNames = [
					...new Set(
						parametersResponse.data.map((item) => item.parameterName || item.parameter_name || '').filter(Boolean),
					),
				];

				setUniqueParameterNames(parameterNames);
			}
		} catch (error) {
			console.error('Error fetching dropdown lists:', error);
		}
	};

	// Filter functions with minimum character requirements
	const filterParameterNames = (input) => {
		if (!input || input.length < 2) return []; // Only show suggestions with 2+ characters
		return uniqueParameterNames.filter((name) => name && name.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterMatrices = (input) => {
		if (!input || input.length < 2) return []; // Only show suggestions with 2+ characters
		return uniqueMatrices.filter((matrix) => matrix && matrix.toLowerCase().includes((input || '').toLowerCase()));
	};

	const filterUnits = (input) => {
		if (!input || input.trim() === '') return []; // Only show suggestions if at least one character is typed
		return uniqueUnits.filter((unit) => unit && unit.toLowerCase().includes((input || '').toLowerCase()));
	};

	const getPaginatedMatrices = (input) => {
		const filtered = filterMatrices(input);
		return filtered.slice((matrixPage - 1) * itemsPerPage, matrixPage * itemsPerPage);
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

	const handleUnitPageChange = (pageNumber) => {
		setUnitPage(pageNumber);
	};

	useEffect(() => {
		const fetchSample = async () => {
			try {
				console.log('Fetching sample with sampleId:', sampleId);
				const response = await apiPost('https://red.irdop.org/v1/sample/get/full', {
					sampleId: sampleId,
				});

				console.log('Sample API response:', response);

				// Process data with new camelCase structure
				if (response.data && response.data.analyses) {
					for (const analysis of response.data.analyses) {
						// Adjust deadline for display (GMT+7) if exists
						if (analysis.deadline) {
							analysis.deadline = adjustTimezoneForDisplay(analysis.deadline);
						}
					}
				}

				// Debug: Log the API response to see what fields are actually returned
				console.log('API Response data:', response.data);

				// Map camelCase response to component state
				const mappedSample = {
					id: response.data.id,
					sampleId: response.data.sampleId || response.data.sampleId,
					sampleName: response.data.sampleName || response.data.sampleName,
					sampleDescription: response.data.sampleDescription || response.data.sample_description,
					matrix: response.data.matrix,
					sampleInformation: response.data.sampleInformation || response.data.sample_information,
					sampleVolume: response.data.sampleVolume || response.data.sample_volume,
					additionalRequest: response.data.additionalRequest || response.data.additionalRequest,
					status: response.data.status,
					purpose: response.data.purpose,
					analysis: response.data.analyses || [],
				};

				console.log('Mapped Sample:', mappedSample);

				setSample(mappedSample);
				setCurrentSample(mappedSample);
				setListAnalytes(mappedSample.analysis);

				// Store original sample values for comparison
				setOriginalSampleValues({
					sampleName: mappedSample.sampleName || '',
					sampleDescription: mappedSample.sampleDescription || '',
					matrix: mappedSample.matrix || '',
					sampleVolume: mappedSample.sampleVolume || '',
					purpose: mappedSample.purpose || '',
					additionalRequest: mappedSample.additionalRequest || '',
				});

				// Split sampleInformation into customer and receipt info
				if (mappedSample.sampleInformation && mappedSample.sampleInformation.length > 0) {
					const sampleInfo = mappedSample.sampleInformation || [];

					// Find the index of the first object that contains 'Ngày tiếp nhận' or 'receipt date' in fname
					const receiptStartIndex = sampleInfo.findIndex(
						(item) => item.fname.includes('Ngày tiếp nhận') || item.fname.includes('receipt date'),
					);

					let customerInfoItems = [];
					let receiptInfoItems = [];

					if (receiptStartIndex !== -1) {
						// Split the array at the found index
						customerInfoItems = sampleInfo.slice(0, receiptStartIndex);
						receiptInfoItems = sampleInfo.slice(receiptStartIndex);
					} else {
						// If no receipt marker found, all items go to customer info
						customerInfoItems = sampleInfo;
						receiptInfoItems = [];
					}

					setCustomerInfo(customerInfoItems);
					setReceiptInfo(receiptInfoItems);

					// Initialize drag and drop order
					setCustomerInfoOrder(customerInfoItems.map((_, index) => `customer-${index}`));
					setReceiptInfoOrder(receiptInfoItems.map((_, index) => `receipt-${index}`));
				} else {
					// Initialize with empty arrays if no information is available
					setCustomerInfo([]);
					setReceiptInfo([]);
				}
			} catch (error) {
				console.error('Error fetching sample:', error);
			}
		};
		if (sampleId) {
			console.log('sampleId exists, calling fetchSample');
			fetchSample();
		} else {
			console.log('No sampleId provided in URL');
		}
	}, [sampleId]);

	// Fetch sample IDs for breadcrumb - priority: receiptId from URL, fallback: sample.receiptId
	useEffect(() => {
		if (receiptId || sample?.receiptId) {
			fetchSampleIdsByReceiptId();
		}
	}, [receiptId, sample?.receiptId]);

	const handleSampleSelect = (sampleUid) => {
		const effectiveReceiptId = getEffectiveReceiptId();
		navigate(`/dashboard/sample?receiptId=${effectiveReceiptId}&sampleId=${sampleUid}`);
	};
	const handleResultValueClick = (order) => {
		if (!order) return;
		const fieldKey = `result_value-${order.id}`;
		setEditingField(fieldKey);
		// Convert HTML to plain text for editing
		const rawValue = order.resultValue ? String(order.resultValue) : '';
		const originalValue = convertHTMLToValue(rawValue);
		console.log('handleResultValueClick:', { rawValue, originalValue });
		setInputValue(originalValue);
		// Store original value for comparison
		setOriginalValues((prev) => ({
			...prev,
			[fieldKey]: originalValue,
		}));
		setIsEditorVisible(true);
	};

	const handleResultUnitClick = (order) => {
		const fieldKey = `result_unit-${order.id}`;
		setEditingField(fieldKey);
		// Convert HTML to plain text for editing
		const rawValue = order.resultUnit ? String(order.resultUnit) : '';
		const originalValue = convertHTMLToValue(rawValue);
		console.log('handleResultUnitClick:', { rawValue, originalValue });
		setInputValue(originalValue);
		// Store original value for comparison
		setOriginalValues((prev) => ({
			...prev,
			[fieldKey]: originalValue,
		}));
		setIsEditorVisible(true);
	};
	const handleSaveContent = async (newValue) => {
		const currentField = editingField;
		const fieldParts = currentField.split('-');
		const fieldType = fieldParts[0];
		const analysisId = fieldParts[1]; // Keep as string to handle both numeric and text IDs

		console.log('handleSaveContent called:', { currentField, fieldType, analysisId, newValue });

		// Get original value for comparison
		const originalValue = originalValues[currentField] || '';

		// Check if value has changed
		if (newValue === originalValue) {
			console.log('Value unchanged, skipping API call:', { newValue, originalValue });
			// No change, just close editor without API call
			setIsEditorVisible(false);
			setEditingField(null);
			// Clear the original value
			setOriginalValues((prev) => {
				const newValues = { ...prev };
				delete newValues[currentField];
				return newValues;
			});
			return;
		}

		setInputValue(newValue);
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id == analysisId) {
				// Use loose equality to handle both string and number comparisons
				if (fieldType === 'result_value') {
					return { ...item, resultValue: newValue };
				} else if (fieldType === 'result_unit') {
					return { ...item, resultUnit: newValue };
				} else if (fieldType === 'technicianUid') {
					return { ...item, technicianId: newValue };
				}
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
		setIsEditorVisible(false);
		setEditingField(null);

		try {
			const analysis = updatedAnalytes.find((item) => item.id == analysisId); // Use loose equality

			// Chỉ gửi id và field tương ứng
			const updateData = {
				id: analysis.id,
			};

			// Add only the field being updated
			if (fieldType === 'result_value') {
				// Cột 4: resultValue
				// Convert special characters to HTML format
				const convertedValue = newValue ? convertValueToHTML(newValue) : '';
				updateData.resultValue = convertedValue;
				console.log('Updating resultValue:', { newValue, convertedValue, updateData });
				// Add submission information when updating result value
				if (newValue !== '') {
					updateData.submitResultBy = currentUser?.identity_name;
					updateData.submitResultAt = adjustDateForApiSubmission(new Date());
				}
			} else if (fieldType === 'result_unit') {
				// Cột 5: resultUnit
				// Convert special characters to HTML format (allow empty values)
				const convertedValue = newValue ? convertValueToHTML(newValue) : '';
				updateData.resultUnit = convertedValue;
				console.log('Updating resultUnit:', { newValue, convertedValue, updateData });
			} else if (fieldType === 'technicianId') {
				// Cột 8: technicianId
				updateData.technicianId = newValue;
			}

			console.log('Sending API request with payload:', { analysis: updateData });
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				console.log('API response success:', response.data);
				// Show more specific toast message based on what was updated
				if (fieldType === 'result_value') {
					showToast(`Đã cập nhật kết quả thành công!`);
				} else if (fieldType === 'result_unit') {
					showToast(`Đã cập nhật đơn vị thành công!`);
				} else {
					showToast(`Đã cập nhật thông tin thành công!`);
				}
			}
		} catch (error) {
			console.error('Error updating analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating analysis.',
			});
		}

		// Clear the original value after processing
		setOriginalValues((prev) => {
			const newValues = { ...prev };
			delete newValues[currentField];
			return newValues;
		});
	};

	const handleKeyDown = async (e, newValue) => {
		key = e.key;
		if (key === 'Enter') {
			e.preventDefault();
			// Call handleSaveContent directly instead of just closing the editor
			handleSaveContent(newValue);
		}
	};

	const handleInputChange = (field, value) => {
		setSample({ ...sample, [field]: value });

		// Update corresponding values in sampleInformation arrays
		if (field === 'sampleName') {
			// Update the "Tên mẫu thử / name." field in customerInfo
			const updatedCustomerInfo = customerInfo.map((item) => {
				if (item.fname.includes('Tên mẫu thử') || item.fname.includes('name')) {
					return { ...item, fvalue: value };
				}
				return item;
			});
			setCustomerInfo(updatedCustomerInfo);
			setIsReportChanged(true);
		}

		if (field === 'sampleDescription') {
			// Update the "Mô tả / desc." field in receiptInfo
			const updatedReceiptInfo = receiptInfo.map((item) => {
				if (item.fname.includes('Mô tả') || item.fname.includes('desc')) {
					return { ...item, fvalue: value };
				}
				return item;
			});
			setReceiptInfo(updatedReceiptInfo);
			setIsReportChanged(true);
		}

		if (field === 'matrix') {
			// Update the "Nền mẫu / matrix." field in receiptInfo
			const updatedReceiptInfo = receiptInfo.map((item) => {
				if (item.fname.includes('Nền mẫu') || item.fname.includes('matrix')) {
					return { ...item, fvalue: value };
				}
				return item;
			});
			setReceiptInfo(updatedReceiptInfo);
			setIsReportChanged(true);
		}
	};

	const handleAddCustomerField = () => {
		setCustomerInfo([...customerInfo, { ...newField }]);
		setCustomerInfoOrder([...customerInfoOrder, `customer-${customerInfo.length}`]);
		setNewField({ fname: '', fvalue: '' });
		setIsReportChanged(true); // Mark report as changed
	};

	const handleAddReceiptField = () => {
		// If there are no receipt fields yet, add one with the receipt date as the default
		if (receiptInfo.length === 0) {
			setReceiptInfo([
				{
					fname: 'Ngày tiếp nhận / receipt date.',
					fvalue: formatDate(receiptFull?.receipt_date) || '',
				},
			]);
			setReceiptInfoOrder([`receipt-0`]);
		} else {
			// Otherwise, add an empty field
			setReceiptInfo([...receiptInfo, { ...newField }]);
			setReceiptInfoOrder([...receiptInfoOrder, `receipt-${receiptInfo.length}`]);
		}
		setNewField({ fname: '', fvalue: '' });
		setIsReportChanged(true); // Mark report as changed
	};
	const handleCustomerFieldChange = (index, field, value) => {
		const updatedCustomerInfo = [...customerInfo];
		if (field === 'fname') {
			const selectedField = defaultCustomerFields.find((item) => item.fname === value);
			if (selectedField) {
				updatedCustomerInfo[index]['fvalue'] = selectedField.fvalue;
			} else if (value === 'Khác') {
				updatedCustomerInfo[index]['fvalue'] = '';
			}
		}
		if (field === 'other') {
			updatedCustomerInfo[index]['other'] = value;
		}
		updatedCustomerInfo[index][field] = value;
		setCustomerInfo(updatedCustomerInfo);
		setIsReportChanged(true); // Mark report as changed

		// We don't update sampleName when changing sampleInformation fields
	};
	const handleReceiptFieldChange = (index, field, value) => {
		const updatedReceiptInfo = [...receiptInfo];
		if (field === 'fname') {
			const selectedField = defaultReceiptFields.find((item) => item.fname === value);
			if (selectedField) {
				updatedReceiptInfo[index]['fvalue'] = selectedField.fvalue;
			} else if (value === 'Khác') {
				updatedReceiptInfo[index]['fvalue'] = '';
			}
		}
		if (field === 'other') {
			updatedReceiptInfo[index]['other'] = value;
		}
		updatedReceiptInfo[index][field] = value;
		setReceiptInfo(updatedReceiptInfo);
		setIsReportChanged(true); // Mark report as changed

		// We don't update sampleDescription or matrix when changing sampleInformation fields
	};

	const handleDeleteCustomerField = (index) => {
		const updatedCustomerInfo = customerInfo.filter((_, i) => i !== index);
		setCustomerInfo(updatedCustomerInfo);
		// Update order array
		const updatedOrder = customerInfoOrder.filter((_, i) => i !== index).map((id, i) => `customer-${i}`);
		setCustomerInfoOrder(updatedOrder);
		setIsReportChanged(true); // Mark report as changed
	};

	const handleDeleteReceiptField = (index) => {
		const updatedReceiptInfo = receiptInfo.filter((_, i) => i !== index);
		setReceiptInfo(updatedReceiptInfo);
		// Update order array
		const updatedOrder = receiptInfoOrder.filter((_, i) => i !== index).map((id, i) => `receipt-${i}`);
		setReceiptInfoOrder(updatedOrder);
		setIsReportChanged(true); // Mark report as changed
	};

	const handleSaveNewReport = async () => {
		if (!isReportChanged) return; // Do nothing if no changes

		// Validate that the first receipt info item contains 'Ngày tiếp nhận' or 'Receipt date'
		if (receiptInfo.length > 0) {
			const firstReceiptField = receiptInfo[0];
			if (!firstReceiptField.fname.includes('Ngày tiếp nhận') && !firstReceiptField.fname.includes('receipt date')) {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: 'Thông tin đầu tiên trong "Thông tin tiếp nhận" phải là ngày tiếp nhận',
				});
				return;
			}
		}

		// Process customer info fields
		const updatedCustomerInfo = customerInfo.map((field) => {
			if (field.fname === 'Khác') {
				return { fname: field.other, fvalue: field.fvalue };
			}
			return field;
		});

		// Process receipt info fields
		const updatedReceiptInfo = receiptInfo.map((field) => {
			if (field.fname === 'Khác') {
				return { fname: field.other, fvalue: field.fvalue };
			}
			return field;
		});

		// Combine both arrays into a single sampleInformation array
		const combinedInfo = [...updatedCustomerInfo, ...updatedReceiptInfo];
		try {
			// Only update the sampleInformation without changing sampleName and sampleDescription
			const response = await apiPost('https://red.irdop.org/v1/sample/edit', {
				sample: {
					id: sample.id,
					sampleId: sample.sampleId,
					sampleInformation: combinedInfo,
					modifiedByUid: currentUser.identityUid,
				},
			});
			if (response.status === 200) {
				showToast('Report updated successfully!');
				setIsReportChanged(false); // Reset change tracker
				fetchSampleIdsByReceiptId(); // Fetch updated data
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to update report.',
				});
			}
		} catch (error) {
			console.error('Error updating report:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating report.',
			});
		}
	};
	const handleCopySampleInfo = async (sampleUid) => {
		try {
			// Call fetchSampleFull to get complete sample information
			const response = await apiPost('https://red.irdop.org/v1/sample/get/full', {
				sampleId: sampleUid,
			});

			console.log('Copy sample response status:', response.status); // Debug log
			console.log('Copy sample response:', response); // Debug log

			// Check response status first
			if (response.status !== 200) {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: `API trả về lỗi ${response.status} cho mẫu ${sampleUid}`,
				});
				setSampleDropdownVisible(false);
				return;
			}

			if (response.data) {
				console.log('Sample data found:', response.data); // Debug log

				// Check if sampleInformation exists and has content
				const sampleInfo = response.data.sampleInformation || [];

				console.log('Sample information found:', sampleInfo); // Debug log

				// Even if sampleInformation is empty, we can still proceed
				if (sampleInfo.length === 0) {
					showToast(`Mẫu ${sampleUid} không có thông tin in phiếu để sao chép`);
					setSampleDropdownVisible(false);
					return;
				}

				// Find the index of the first object that contains 'Ngày tiếp nhận' or 'receipt date' in fname
				const receiptStartIndex = sampleInfo.findIndex(
					(item) => item.fname && (item.fname.includes('Ngày tiếp nhận') || item.fname.includes('receipt date')),
				);

				let customerInfoItems = [];
				let receiptInfoItems = [];

				if (receiptStartIndex !== -1) {
					// Split the array at the found index
					customerInfoItems = sampleInfo.slice(0, receiptStartIndex);
					receiptInfoItems = sampleInfo.slice(receiptStartIndex);
				} else {
					// If no receipt marker found, all items go to customer info
					customerInfoItems = sampleInfo;
					receiptInfoItems = [];
				}

				// Set the customer and receipt info
				setCustomerInfo(customerInfoItems);
				setReceiptInfo(receiptInfoItems);

				// Mark as changed to enable the save button
				setIsReportChanged(true);

				showToast(`Đã sao chép thông tin từ mẫu ${sampleUid}`);
			} else {
				console.error('No data returned from API for sample:', sampleUid);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: `Không tìm thấy dữ liệu mẫu ${sampleUid}`,
				});
			}
		} catch (error) {
			console.error('Error fetching sample information:', error);

			// Check if it's a 404 or sample not found error
			if (error.response && error.response.status === 404) {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: `Không tìm thấy mẫu ${sampleUid} trong hệ thống`,
				});
			} else if (error.message.includes('404') || error.message.includes('not found')) {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: `Không tìm thấy mẫu ${sampleUid} trong hệ thống`,
				});
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: `Lỗi khi lấy thông tin từ mẫu ${sampleUid}: ${error.message}`,
				});
			}
		}

		// Close the dropdown
		setSampleDropdownVisible(false);
	};

	// Function to handle drag end for customer info
	const handleCustomerInfoDragEnd = (event) => {
		const { active, over } = event;

		if (active.id !== over.id) {
			setCustomerInfo((items) => {
				const oldIndex = customerInfoOrder.indexOf(active.id);
				const newIndex = customerInfoOrder.indexOf(over.id);

				const reorderedItems = arrayMove(items, oldIndex, newIndex);

				// Update order array to match new positions
				const updatedOrder = reorderedItems.map((_, index) => `customer-${index}`);
				setCustomerInfoOrder(updatedOrder);

				return reorderedItems;
			});
			setIsReportChanged(true);
		}
	};

	// Function to handle drag end for receipt info
	const handleReceiptInfoDragEnd = (event) => {
		const { active, over } = event;

		if (active.id !== over.id) {
			setReceiptInfo((items) => {
				const oldIndex = receiptInfoOrder.indexOf(active.id);
				const newIndex = receiptInfoOrder.indexOf(over.id);

				const reorderedItems = arrayMove(items, oldIndex, newIndex);

				// Update order array to match new positions
				const updatedOrder = reorderedItems.map((_, index) => `receipt-${index}`);
				setReceiptInfoOrder(updatedOrder);

				return reorderedItems;
			});
			setIsReportChanged(true);
		}
	};

	// Add a helper function to check if user is a technician
	const isTechnician = () => {
		// Admin users bypass technician restrictions
		return currentUser?.role?.staff_technician && !currentUser?.role?.staff_admin;
	};

	// Add a helper function to check if user is an admin
	const isAdmin = () => {
		return currentUser?.role?.staff_admin;
	};

	const renderNewReport = () => {
		return (
			<div className="border py-2 mt-1 rounded-lg">
				{/* Container for both sections with flex row on md+ screens */}
				<div className="flex flex-col md:flex-row md:overflow-auto">
					{/* Customer Information Section */}
					<div className="w-full border-b md:border-b-0 md:border-r pb-2 ">
						<div className="flex justify-between items-center px-4 mb-2">
							<h3 className="font-medium text-lg">Thông tin khách hàng cung cấp</h3>
							<button
								className="bg-white text-sky-500 rounded-full p-1"
								onClick={handleAddCustomerField}
								title="Thêm thông tin khách hàng"
							>
								<AiOutlinePlus size={18} />
							</button>
						</div>
						<div className="w-full overflow-hidden hover:overflow-auto md:pb-2 lg:pb-0 pb-0 hover:pb-0 mb-1">
							{customerInfo?.length > 0 && (
								<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCustomerInfoDragEnd}>
									<table className="w-full table-fixed border-collapse">
										<thead>
											<tr>
												<th className="text-left p-2 border-b w-[200px]"></th>
												<th className="text-left p-2 border-b w-full"></th>
												<th className="p-2 border-b w-10"></th>
												<th className="p-2 border-b w-10"></th>
											</tr>
										</thead>
										<SortableContext items={customerInfoOrder} strategy={verticalListSortingStrategy}>
											<tbody>
												{customerInfoOrder.map((id, orderIndex) => {
													const field = customerInfo[orderIndex];
													return (
														<SortableItem key={id} id={id}>
															<td className="p-1 ">
																<div className="flex justify-between items-center">
																	<select
																		value={field?.fname || ''}
																		onChange={(e) => handleCustomerFieldChange(orderIndex, 'fname', e.target.value)}
																		className={`p-1 ${
																			field.fname === 'Khác' ? 'w-1/3 mr-1' : 'w-full'
																		} border min-w-16 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
																	>
																		<option value={field.fname}>{field.fname || 'Chọn thông tin'}</option>
																		{defaultCustomerFields.map((selectField) => (
																			<option key={selectField.fname} value={selectField.fname}>
																				{selectField.fname}
																			</option>
																		))}
																		<option value="Khác">Khác</option>
																	</select>
																	{field.fname === 'Khác' && (
																		<input
																			type="text"
																			value={field?.other || ''}
																			onChange={(e) => handleCustomerFieldChange(orderIndex, 'other', e.target.value)}
																			className="p-1 w-2/3 border rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
																			placeholder="Nhập tên khác"
																		/>
																	)}
																</div>
															</td>
															<td className="p-1 ">
																<input
																	type="text"
																	value={field?.fvalue || ''}
																	onChange={(e) => handleCustomerFieldChange(orderIndex, 'fvalue', e.target.value)}
																	className="p-1 w-full border rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
																/>
															</td>
															<td className="p-1  text-center">
																<button
																	className="text-red-200 hover:text-red-500 bg-white text-lg rounded-lg py-0 px-1 focus:outline-none"
																	onClick={() => handleDeleteCustomerField(orderIndex)}
																>
																	✕
																</button>
															</td>
														</SortableItem>
													);
												})}
											</tbody>
										</SortableContext>
									</table>
								</DndContext>
							)}
							{customerInfo?.length === 0 && (
								<div className="text-center text-gray-500 italic py-2">
									Chưa có thông tin khách hàng. Nhấn nút + để thêm thông tin.
								</div>
							)}
						</div>
					</div>

					{/* Receipt Information Section */}
					<div className="w-full pt-2 md:pt-0">
						<div className="flex justify-between items-center px-4 mb-2">
							<h3 className="font-medium text-lg">Thông tin tiếp nhận</h3>
							<button
								className="bg-white text-sky-500 rounded-full p-1"
								onClick={handleAddReceiptField}
								title="Thêm thông tin tiếp nhận"
							>
								<AiOutlinePlus size={18} />
							</button>
						</div>
						<div className="w-full overflow-hidden hover:overflow-auto md:pb-2 lg:pb-0 pb-0 hover:pb-0 mb-1">
							{receiptInfo?.length > 0 && (
								<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReceiptInfoDragEnd}>
									<table className="w-full table-fixed border-collapse">
										<thead>
											<tr>
												<th className="text-left p-2 border-b w-[200px]"></th>
												<th className="text-left p-2 border-b w-full"></th>
												<th className="p-2 border-b w-10"></th>
												<th className="p-2 border-b w-10"></th>
											</tr>
										</thead>
										<SortableContext items={receiptInfoOrder} strategy={verticalListSortingStrategy}>
											<tbody>
												{receiptInfoOrder.map((id, orderIndex) => {
													const field = receiptInfo[orderIndex];
													return (
														<SortableItem key={id} id={id}>
															<td className="p-1  w-[200px]">
																<div className="flex justify-between items-center">
																	<select
																		value={field?.fname || ''}
																		onChange={(e) => handleReceiptFieldChange(orderIndex, 'fname', e.target.value)}
																		className={`p-1 ${
																			field.fname === 'Khác' ? 'w-1/3 mr-1' : 'w-full'
																		} border min-w-16 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
																	>
																		<option value={field.fname}>{field.fname || 'Chọn thông tin'}</option>
																		{defaultReceiptFields.map((selectField) => (
																			<option key={selectField.fname} value={selectField.fname}>
																				{selectField.fname}
																			</option>
																		))}
																		<option value="Khác">Khác</option>
																	</select>
																	{field.fname === 'Khác' && (
																		<input
																			type="text"
																			value={field?.other || ''}
																			onChange={(e) => handleReceiptFieldChange(orderIndex, 'other', e.target.value)}
																			className="p-1 w-2/3 border rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
																			placeholder="Nhập tên khác"
																		/>
																	)}
																</div>
															</td>
															<td className="p-1 ">
																<input
																	type="text"
																	value={field?.fvalue || ''}
																	onChange={(e) => handleReceiptFieldChange(orderIndex, 'fvalue', e.target.value)}
																	className="p-1 w-full border rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
																/>
															</td>
															<td className="p-1  text-center w-8">
																<button
																	className="text-red-200 hover:text-red-500 bg-white text-lg rounded-lg py-0 px-1 focus:outline-none"
																	onClick={() => handleDeleteReceiptField(orderIndex)}
																>
																	✕
																</button>
															</td>
														</SortableItem>
													);
												})}
											</tbody>
										</SortableContext>
									</table>
								</DndContext>
							)}
							{receiptInfo?.length === 0 && (
								<div className="text-center text-gray-500 italic py-2">
									Chưa có thông tin tiếp nhận. Nhấn nút + để thêm thông tin.
								</div>
							)}
						</div>
					</div>
				</div>

				{isReportChanged && (
					<div className="flex justify-between px-4 mt-4 pt-2 border-t">
						<button
							className="bg-gray-500 text-white text-sm rounded-lg p-1 active:bg-gray-600 focus:outline-none w-40"
							onClick={() => {
								setIsReportChanged(false); // Reset change tracker
								// Reset to original values from current sample
								if (currentSample && currentSample.sampleInformation) {
									const sampleInfo = currentSample.sampleInformation || [];

									// Find the index of the first object that contains 'Ngày tiếp nhận' or 'receipt date' in fname
									const receiptStartIndex = sampleInfo.findIndex(
										(item) => item.fname.includes('Ngày tiếp nhận') || item.fname.includes('receipt date'),
									);

									let customerInfoItems = [];
									let receiptInfoItems = [];

									if (receiptStartIndex !== -1) {
										// Split the array at the found index
										customerInfoItems = sampleInfo.slice(0, receiptStartIndex);
										receiptInfoItems = sampleInfo.slice(receiptStartIndex);
									} else {
										// If no receipt marker found, all items go to customer info
										customerInfoItems = sampleInfo;
										receiptInfoItems = [];
									}

									setCustomerInfo(customerInfoItems);
									setReceiptInfo(receiptInfoItems);

									// Reset order
									setCustomerInfoOrder(customerInfoItems.map((_, index) => `customer-${index}`));
									setReceiptInfoOrder(receiptInfoItems.map((_, index) => `receipt-${index}`));
								}
							}}
						>
							Hủy bỏ
						</button>
						<button
							className={`text-white text-sm rounded-lg p-1 focus:outline-none w-40 ${
								isReportChanged ? 'bg-green-500 cursor-pointer' : 'bg-gray-500 cursor-default'
							}`}
							onClick={handleSaveNewReport}
						>
							Lưu
						</button>
					</div>
				)}
			</div>
		);
	};

	const technician = (param) => {
		// Sử dụng technician.identityName từ dữ liệu mới, fallback về technicianId nếu không có
		return param?.technician?.identityName || param?.technicianId || '';
	};

	const handleTechnicianClick = (order) => {
		if (!order) return;
		setEditingField(`technicianId-${order.id}`);
		setInputValue(order.technicianId || '');
		setIsEditorVisible(true);
	};

	const toggleTechnicianDropdown = (index, event) => {
		const buttonRect = event.target.getBoundingClientRect(); // Lấy vị trí button trên màn hình
		// Tính toán vị trí để dropdown không bị tràn ra ngoài màn hình
		const viewportWidth = window.innerWidth;
		const dropdownWidth = Math.min(600, viewportWidth - 40); // Chiều rộng thực tế của dropdown
		let leftPosition = buttonRect.left + window.scrollX;

		// Nếu dropdown sẽ tràn ra ngoài màn hình bên phải, đặt nó bên trái
		if (leftPosition + dropdownWidth > viewportWidth - 20) {
			leftPosition = viewportWidth - dropdownWidth - 20; // Để lại 20px margin
		}

		// Đảm bảo dropdown không bị tràn ra ngoài màn hình bên trái
		if (leftPosition < 20) {
			leftPosition = 20;
		}

		setDropdownPosition({
			top: buttonRect.bottom + window.scrollY + 4, // Display below the button with 4px gap
			left: leftPosition, // Vị trí đã được điều chỉnh
		});

		setTechnicianDropdownVisible(technicianDropdownVisible === index ? null : index);
		setDeadlineDropdownVisible(null); // Close deadline dropdown if open
	};

	const handleTechnicianChange = async (index, identity_uid) => {
		// Validate the technicianId before proceeding
		let selectedTechnician = null;
		let selectedGroup = null;

		for (const group of technicians) {
			if (group.technicians && Array.isArray(group.technicians)) {
				const tech = group.technicians.find((t) => t.technicianId === identity_uid);
				if (tech) {
					selectedTechnician = tech;
					selectedGroup = group;
					break;
				}
			}
		}

		if (!selectedTechnician || !selectedGroup) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Không tìm thấy thông tin kỹ thuật viên được chọn',
			});
			return;
		}

		// Store original state for rollback if needed
		const originalAnalytes = [...listAnalytes];

		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id == index) {
				// Use loose equality to handle both string and number comparisons
				// Update with new camelCase fields
				return {
					...item,
					technicianId: identity_uid,
					technician: {
						identityId: identity_uid,
						identityName: selectedTechnician.identityName,
					},
					technicianAlias: selectedGroup.alias,
				};
			}
			return item;
		});

		// Update the state immediately for better UX
		setListAnalytes(updatedAnalytes);

		// Close the dropdown
		setTechnicianDropdownVisible(null);

		// Find the updated analysis item
		const analysis = updatedAnalytes.find((item) => item.id == index); // Use loose equality

		// Prepare additional data
		const technicianIds = selectedGroup.technicians.map((tech) => tech.technicianId);
		const technicianAlias = selectedGroup.alias;

		try {
			// Cột 8: technicianId - Chỉ gửi id và các field liên quan đến technician
			const updateData = {
				id: analysis.id,
				technicianId: identity_uid,
				technician: {
					identityId: identity_uid,
					identityName: selectedTechnician.identityName,
				},
				technicianAlias: technicianAlias, // Add group alias
				identityIds: technicianIds, // Add list of all technician IDs in the group
			};

			// Send the update to the server
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast(`Đã gán ${selectedTechnician.identityName} (${selectedTechnician.technicianAlias}) thực hiện`);
			} else {
				// Rollback the state on error
				setListAnalytes(originalAnalytes);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật người thực hiện',
				});
			}
		} catch (error) {
			console.error('Error updating technician:', error);
			// Rollback the state on error
			setListAnalytes(originalAnalytes);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật người thực hiện',
			});
		}
	};

	const handleDateInputChange = (id, e) => {
		const value = e.target.value;
		if (value) {
			const parts = value.split('/');
			if (parts.length === 3) {
				const day = parseInt(parts[0], 10);
				const month = parseInt(parts[1], 10) - 1;
				const year = parseInt(parts[2], 10);
				if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
					const date = new Date(year, month, day);
					if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
						setSelectedDate(date);
					}
				}
			}
		}
	};

	const handleDeadlineFocus = (id, deadline) => {
		if (deadline) {
			setSelectedDate(new Date(deadline));
		} else {
			setSelectedDate(new Date());
		}
	};

	const handleDeadlineKeyDown = (e, id) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveDeadlineToAPI(id, selectedDate);
		}
	};

	// Update the toggle function to properly position the dropdown
	const toggleDeadlineDropdown = (index, event) => {
		const buttonRect = event.target.getBoundingClientRect();

		setDropdownPosition({
			top: buttonRect.bottom + window.scrollY + 5,
			left: buttonRect.left + window.scrollX,
		});

		setDeadlineDropdownVisible(deadlineDropdownVisible === index ? null : index);
		setTechnicianDropdownVisible(null); // Close technician dropdown if open

		// Set the selected date to the current deadline of the analyte
		const analyte = listAnalytes.find((item) => item.id === index);
		if (analyte && analyte.deadline) {
			setSelectedDate(new Date(analyte.deadline));
		} else {
			setSelectedDate(new Date());
		}
	};

	// Update handleDeadlineChange to only update UI without API call
	const handleDeadlineChange = (index, date) => {
		// Update the selected date
		setSelectedDate(date);

		// Update UI only - we'll make the API call separately
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, deadline: adjustDateForApiSubmission(date) };
			}
			return item;
		});

		// Update the state
		setListAnalytes(updatedAnalytes);
	};
	// New function to send API update for deadline
	const saveDeadlineToAPI = async (index, date) => {
		try {
			// Close the dropdown
			setDeadlineDropdownVisible(null);

			// Convert date to GMT+7 ISO string for API
			const newDeadline = adjustDateForApiSubmission(date);

			// Find the analysis item
			const analysis = listAnalytes.find((item) => item.id === index);

			// Cột 6: deadline - Chỉ gửi id và deadline
			const updateData = {
				id: analysis.id,
				deadline: newDeadline,
			};

			// Send the update to the server
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Đã cập nhật hạn trả thành công!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật hạn trả',
				});
			}
		} catch (error) {
			console.error('Error updating deadline:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật hạn trả',
			});
		}
	};

	// Update the date selection handler to trigger API update
	const handleDateSelect = (index, date) => {
		handleDeadlineChange(index, date);
		saveDeadlineToAPI(index, date);
	};

	// Add a handler for when the input loses focus
	const handleDeadlineBlur = (id) => {
		saveDeadlineToAPI(id, selectedDate);
	};

	// Modified handleClickOutside function to use requestAnimationFrame for delayed closing
	const handleClickOutside = (event) => {
		// Skip if clicking on a dropdown element or selection element
		if (
			event.target.closest('.dropdown-button') ||
			event.target.closest('.dropdown-item') ||
			event.target.closest('.react-datepicker') ||
			event.target.closest('.technician-dropdown')
		) {
			return;
		}

		// Use requestAnimationFrame to delay closing the dropdown
		// This ensures onChange events complete before the dropdown closes
		requestAnimationFrame(() => {
			setTechnicianDropdownVisible(null);
			setDeadlineDropdownVisible(null);
		});
	};

	const handleClickOutsideParameterForm = (event) => {
		if (!event.target.closest('.parameter-form')) {
			setIsAddingParameter(false);
		}
	};

	useEffect(() => {
		if (isAddingParameter) {
			// We don't need this document-level event listener anymore
			// document.addEventListener('mousedown', handleClickOutsideParameterForm);
		} else {
			// document.removeEventListener('mousedown', handleClickOutsideParameterForm);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutsideParameterForm);
		};
	}, [isAddingParameter]);

	useEffect(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Add click outside handler for sample dropdown
	const handleClickOutsideSampleDropdown = (event) => {
		if (!event.target.closest('.sample-dropdown-container') && !event.target.closest('.copy-button')) {
			setSampleDropdownVisible(false);
		}
	};

	useEffect(() => {
		if (sampleDropdownVisible) {
			document.addEventListener('mousedown', handleClickOutsideSampleDropdown);
		} else {
			document.removeEventListener('mousedown', handleClickOutsideSampleDropdown);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutsideSampleDropdown);
		};
	}, [sampleDropdownVisible]);
	// Handler for selecting an item from the dropdown - no longer used for parameter name
	const handleParameterNameSelect = (name) => {
		if (editingParameterField !== null) {
			handleParameterNameChange(editingParameterField, name);
		}
	};

	const handleMatrixSelect = (matrix) => {
		if (editingMatrixField !== null) {
			handleMatrixChange(editingMatrixField, matrix);
		}
		setShowMatrixDropdown(false);
	};

	const handleUnitSelect = (unit) => {
		if (editingField && editingField.startsWith('resultUnit')) {
			setInputValue(unit);
			handleSaveContent(unit);
		}
		setShowUnitDropdown(false);
	};
	const handleParameterNameClick = (id) => {
		setEditingParameterField(id);
		// Store original value when starting to edit
		const analysis = listAnalytes.find((item) => item.id === id);
		const originalKey = `parameterName_${id}`;
		setOriginalValues((prev) => ({
			...prev,
			[originalKey]: analysis?.parameterName || '',
		}));
	};
	const handleMatrixClick = (id) => {
		setEditingMatrixField(id);
		// Store original value when starting to edit
		const analysis = listAnalytes.find((item) => item.id === id);
		const originalKey = `matrix_${id}`;
		setOriginalValues((prev) => ({
			...prev,
			[originalKey]: analysis?.matrix || '',
		}));
	};
	const handleParameterNameChange = (index, newValue) => {
		// Remove dropdown functionality
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, parameterName: newValue, parameterId: 0 };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};

	const handleMatrixChange = (index, newValue) => {
		setMatrixInput(newValue);
		setMatrixPage(1); // Reset to first page when typing
		setShowMatrixDropdown(newValue.length >= 2); // Show dropdown once at least 2 chars entered

		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, matrix: newValue };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};
	const handleMatrixBlur = async (index) => {
		setEditingMatrixField(null);
		const analysis = listAnalytes.find((item) => item.id === index);

		// Check if value has changed by comparing with original value
		const originalKey = `matrix_${index}`;
		const originalValue = originalValues[originalKey];

		if (analysis.matrix === originalValue) {
			// No change, don't call API
			return;
		}

		try {
			// Cột 2: matrix - Chỉ gửi id và matrix
			const updateData = {
				id: analysis.id,
				matrix: analysis.matrix,
			};

			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Đã cập nhật nền mẫu thành công!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật nền mẫu',
				});
			}
		} catch (error) {
			console.error('Error updating matrix:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật nền mẫu',
			});
		}

		// Clear the original value
		setOriginalValues((prev) => {
			const newValues = { ...prev };
			delete newValues[originalKey];
			return newValues;
		});
	};
	const handleParameterBlur = async (index) => {
		setEditingParameterField(null);
		const analysis = listAnalytes.find((item) => item.id === index);

		// Check if value has changed by comparing with original value
		const originalKey = `parameterName_${index}`;
		const originalValue = originalValues[originalKey];

		if (analysis.parameterName === originalValue) {
			// No change, don't call API
			return;
		}

		try {
			// Cột 1: parameterName - Chỉ gửi id và parameterName
			const updateData = {
				id: analysis.id,
				parameterName: analysis.parameterName,
			};

			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Đã cập nhật tên chỉ tiêu thành công!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật tên chỉ tiêu',
				});
			}
		} catch (error) {
			console.error('Error updating parameter name:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật tên chỉ tiêu',
			});
		}

		// Clear the original value
		setOriginalValues((prev) => {
			const newValues = { ...prev };
			delete newValues[originalKey];
			return newValues;
		});
	};

	const handleMatrixKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			// Just blur the element to trigger the blur handler
			e.target.blur();
		}
	};

	const handleParameterKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			// Just blur the element to trigger the blur handler
			e.target.blur();
		}
	};
	const handleProtocolClick = (id) => {
		setEditingProtocolField(id);
		// Store original value when starting to edit
		const analysis = listAnalytes.find((item) => item.id === id);
		const originalKey = `protocolCode_${id}`;
		setOriginalValues((prev) => ({
			...prev,
			[originalKey]: analysis?.protocolCode || '',
		}));
	};

	const handleProtocolChange = (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, protocolCode: newValue };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};
	const handleProtocolBlur = async (index) => {
		setEditingProtocolField(null);
		const analysis = listAnalytes.find((item) => item.id === index);

		// Check if value has changed by comparing with original value
		const originalKey = `protocolCode_${index}`;
		const originalValue = originalValues[originalKey];

		if (analysis.protocolCode === originalValue) {
			// No change, don't call API
			return;
		}

		try {
			// Cột 3: protocolCode - Chỉ gửi id và protocolCode
			const updateData = {
				id: analysis.id,
				protocolCode: analysis.protocolCode || '',
			};

			// Send the update directly to the analysis API
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Đã cập nhật phương pháp thành công!');
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật phương pháp',
				});
			}
		} catch (error) {
			console.error('Error updating protocol code:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật phương pháp',
			});
		}

		// Clear the original value
		setOriginalValues((prev) => {
			const newValues = { ...prev };
			delete newValues[originalKey];
			return newValues;
		});
	};

	const handleProtocolKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			// Just blur the element to trigger the blur handler
			e.target.blur();
		}
	};
	const handleProtocolSourceChange = async (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				return { ...item, protocolSource: newValue };
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
		try {
			const analysis = updatedAnalytes.find((item) => item.id === index);

			// Cột 3: protocolSource - Chỉ gửi id và protocolSource
			const updateData = {
				id: analysis.id,
				protocolSource: newValue,
			};

			// Send the update to the server
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status !== 200) {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật nguồn phương pháp',
				});
			}
		} catch (error) {
			console.error('Error updating protocol source:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating protocol source.',
			});
		}
	};
	// Add handlers for external lab info
	const [editingExNameField, setEditingExNameField] = useState(null);
	const [editingExDateField, setEditingExDateField] = useState(null);
	const [exDateSelected, setExDateSelected] = useState(new Date());
	const [exOriginalValues, setExOriginalValues] = useState({});

	// Note modal states
	const [showNoteModal, setShowNoteModal] = useState(false);
	const [selectedAnalysisForNote, setSelectedAnalysisForNote] = useState(null);
	const [newNoteText, setNewNoteText] = useState('');
	const [isUpdatingNote, setIsUpdatingNote] = useState(false);

	// Tooltip state
	const [tooltip, setTooltip] = useState({
		visible: false,
		content: '',
		x: 0,
		y: 0,
		position: 'above',
	});

	const handleExNameClick = (id) => {
		setEditingExNameField(id);
		const analysis = listAnalytes.find((item) => item.id === id);
		const originalKey = `ex_name_${id}`;
		setExOriginalValues((prev) => ({
			...prev,
			[originalKey]: analysis?.ex_info?.ex_name || '',
		}));
	};

	const handleExNameChange = (index, newValue) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				const exInfo = item.ex_info || {};
				return {
					...item,
					ex_info: {
						...exInfo,
						ex_name: newValue,
					},
				};
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
	};

	const handleExNameBlur = async (index) => {
		setEditingExNameField(null);
		const analysis = listAnalytes.find((item) => item.id === index);
		await updateExInfo(analysis);
	};

	const handleExNameKeyDown = async (e, index) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			e.target.blur();
		}
	};

	const handleExDateClick = (id, existingDate) => {
		setEditingExDateField(id);
		if (existingDate) {
			setExDateSelected(new Date(existingDate));
		} else {
			setExDateSelected(new Date());
		}
	};

	const handleExDateSelect = (index, date) => {
		const updatedAnalytes = listAnalytes.map((item) => {
			if (item.id === index) {
				const exInfo = item.ex_info || {};
				return {
					...item,
					ex_info: {
						...exInfo,
						send_at: adjustDateForApiSubmission(date),
					},
				};
			}
			return item;
		});
		setListAnalytes(updatedAnalytes);
		setExDateSelected(date);
		updateExInfo(updatedAnalytes.find((item) => item.id === index));
		setEditingExDateField(null);
	};

	const handleExDateBlur = async (index) => {
		const analysis = listAnalytes.find((item) => item.id === index);
		await updateExInfo(analysis);
		setEditingExDateField(null);
	};
	const updateExInfo = async (analysis) => {
		try {
			const exInfo = analysis.ex_info || { ex_name: '', send_at: null };

			// Create minimal update object with only required fields
			const updateData = {
				id: analysis.id,
				sampleId: analysis.sampleId,
				receiptId: analysis.receiptId,
				exInfo: exInfo,
				modifiedByUid: currentUser.identityUid,
				displayStyle: analysis.displayStyle || [
					{
						label: 'default',
						value: '',
					},
					{
						label: 'eng',
						value: '',
					},
				],
			};

			// Send the update to the server
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: updateData,
			});

			if (response.status === 200) {
				showToast('Đã cập nhật thông tin thầu phụ thành công!');
			}
		} catch (error) {
			console.error('Error updating external lab info:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin thầu phụ',
			});
		}
	};

	// Tooltip functions
	const showTooltip = (event, content, customPosition = null) => {
		const rect = event.target.getBoundingClientRect();
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

		let x, y, position;

		if (customPosition === 'left') {
			// Position tooltip completely to the left of the element
			x = rect.left + scrollLeft - 10; // 10px padding from element
			y = rect.top + scrollTop + rect.height / 2;
			position = 'left';
		} else if (customPosition === 'right') {
			// Position tooltip completely to the right of the element
			x = rect.right + scrollLeft + 10; // 10px padding from element
			y = rect.top + scrollTop + rect.height / 2;
			position = 'right';
		} else {
			// Default behavior: above or below (center aligned)
			const spaceAbove = rect.top;
			const tooltipHeight = 40; // Approximate tooltip height
			const shouldShowBelow = spaceAbove < tooltipHeight + 20; // 20px buffer

			x = rect.left + scrollLeft + rect.width / 2;
			y = shouldShowBelow
				? rect.bottom + scrollTop + 10 // Show below
				: rect.top + scrollTop - 10; // Show above
			position = shouldShowBelow ? 'below' : 'above';
		}

		setTooltip({
			visible: true,
			content,
			x,
			y,
			position,
		});
	};

	const hideTooltip = () => {
		setTooltip({
			visible: false,
			content: '',
			x: 0,
			y: 0,
			position: 'above',
		});
	};

	// Handle note icon click
	const handleNoteClick = (analysis, e) => {
		e.stopPropagation();
		setSelectedAnalysisForNote(analysis);
		setNewNoteText('');
		setShowNoteModal(true);
	};

	// Handle note update
	const handleUpdateNote = async () => {
		if (!selectedAnalysisForNote || !newNoteText.trim()) {
			showToast('Vui lòng nhập nội dung ghi chú', 'warning');
			return;
		}

		setIsUpdatingNote(true);
		try {
			const currentNote = selectedAnalysisForNote.note || '';
			const userName = currentUser?.identity_name || 'Unknown User';
			const timestamp = new Date().toLocaleString('vi-VN');
			const newNote = currentNote
				? `${currentNote}\n[${timestamp}] ${userName}: ${newNoteText.trim()}`
				: `[${timestamp}] ${userName}: ${newNoteText.trim()}`;

			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analysis: {
					id: selectedAnalysisForNote.id,
					note: newNote,
				},
			});

			if (response?.status < 300) {
				showToast('Cập nhật ghi chú thành công!');

				// Update local data
				const updatedAnalytes = listAnalytes.map((item) =>
					item.id === selectedAnalysisForNote.id ? { ...item, note: newNote } : item,
				);
				setListAnalytes(updatedAnalytes);

				// Close modal
				setShowNoteModal(false);
				setSelectedAnalysisForNote(null);
				setNewNoteText('');
			} else {
				showToast('Lỗi khi cập nhật ghi chú', 'error');
			}
		} catch (error) {
			console.error('Error updating note:', error);
			showToast('Lỗi khi cập nhật ghi chú: ' + error.message, 'error');
		} finally {
			setIsUpdatingNote(false);
		}
	};

	const handleDeleteConfirm = (id) => {
		setDeleteItemId(id);
		setIsDeleteConfirmVisible(true);
		setDeleteType('analysis');
	};

	const handleDeleteCancel = () => {
		setIsDeleteConfirmVisible(false);
		setDeleteItemId(null);
	};

	const handleDeleteSampleConfirmAction = async () => {
		try {
			// Use the correct API endpoint and body format
			const response = await apiPost('https://red.irdop.org/v1/sample/delete', {
				sampleId: deleteItemId,
			});

			if (response.status === 200) {
				showToast('Sample deleted successfully!');
				navigate(`/dashboard/receipt?receiptId=${receiptId}`);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to delete sample.',
				});
			}
		} catch (error) {
			console.error('Error deleting sample:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while deleting sample.',
			});
		} finally {
			setIsDeleteConfirmVisible(false);
			setDeleteItemId(null);
		}
	};

	const handleDeleteAnalysisConfirmAction = async () => {
		try {
			// Use the correct API endpoint and body format
			const response = await apiPost('https://red.irdop.org/v1/analysis/delete', {
				analysisId: deleteItemId,
			});

			if (response.status === 200) {
				showToast('Analysis deleted successfully!');
				setListAnalytes(listAnalytes.filter((analyte) => analyte.id !== deleteItemId));
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to delete analysis.',
				});
			}
		} catch (error) {
			console.error('Error deleting analysis:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while deleting analysis.',
			});
		} finally {
			setIsDeleteConfirmVisible(false);
			setDeleteItemId(null);
		}
	};

	const renderDeleteConfirm = (message, onConfirm) => (
		<div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
			<div className="bg-white p-4 rounded-lg w-[400px] h-[200px] relative flex flex-col justify-between">
				<h2 className="text-2xl font-semibold mb-4">Xác nhận xóa</h2>
				<p>{message}</p>
				<div className="flex justify-end mt-4">
					<button className="bg-gray-500 text-white p-2 rounded mr-2 w-1/4" onClick={handleDeleteCancel}>
						Hủy bỏ
					</button>
					<button className="bg-red-500 text-white p-2 rounded w-1/4" onClick={onConfirm}>
						Xóa
					</button>
				</div>
			</div>
		</div>
	);

	const handleDeleteSample = () => {
		setDeleteItemId(currentSample.id);
		setIsDeleteConfirmVisible(true);
		setDeleteType('sample');
	};

	// Add handler for checkbox selection
	const handleAnalyteSelect = (id) => {
		if (selectedAnalytes.includes(id)) {
			setSelectedAnalytes(selectedAnalytes.filter((item) => item !== id));
		} else {
			setSelectedAnalytes([...selectedAnalytes, id]);
		}
	};

	// Add handler for select all checkbox
	const handleSelectAll = () => {
		if (selectAll) {
			setSelectedAnalytes([]);
		} else {
			setSelectedAnalytes(listAnalytes.map((analyte) => analyte.id));
		}
		setSelectAll(!selectAll);
	};

	// Modify delete handler to handle multiple selections
	const handleDeleteSelected = () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Please select at least one item to delete',
			});
			return;
		}
		setIsDeleteConfirmVisible(true);
		setDeleteType('multiple');
	};

	const handleDeleteMultipleConfirmAction = async () => {
		try {
			// Get the array of selected analysis IDs
			const analysisIds = selectedAnalytes;

			// Use the correct API endpoint with analysisIds array
			const response = await apiPost('https://red.irdop.org/v1/analysis/delete', {
				analysisIds: analysisIds,
			});

			if (response.status === 200) {
				// Update the UI by removing deleted items
				setListAnalytes(listAnalytes.filter((analyte) => !selectedAnalytes.includes(analyte.id)));
				setSelectedAnalytes([]);
				setSelectAll(false);
				showToast(`${selectedAnalytes.length} analyses deleted successfully!`);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Failed to delete analyses.',
				});
			}
		} catch (error) {
			console.error('Error deleting analyses:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while deleting analyses.',
			});
		} finally {
			setIsDeleteConfirmVisible(false);
		}
	};

	const handleBulkTransfer = () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Please select at least one item to transfer',
			});
			return;
		}
		setIsTransferMultipleVisible(true);
	};

	const handleBulkTransferConfirm = async () => {
		if (!selectedTechnician) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Please select a technician',
			});
			return;
		}

		// Find the selected technician and group
		let selectedGroup = null;
		for (const group of technicians) {
			if (group.technicians && Array.isArray(group.technicians)) {
				const tech = group.technicians.find((t) => t.technicianId === selectedTechnician);
				if (tech) {
					selectedGroup = group;
					break;
				}
			}
		}

		if (!selectedGroup) {
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Không tìm thấy thông tin nhóm kỹ thuật viên',
			});
			return;
		}

		try {
			// Get the selected analytes
			const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));

			// Prepare additional data
			const technicianIds = selectedGroup.technicians.map((tech) => tech.technicianId);
			const technicianAlias = selectedGroup.alias;

			// Create array of update objects for bulk update
			const updateDataArray = selectedItems.map((analyte) => ({
				id: analyte.id,
				sampleId: analyte.sampleId,
				receiptId: analyte.receiptId,
				technicianId: selectedTechnician,
				technicianIds: technicianIds, // Add list of all technician IDs in the group
				technicianAlias: technicianAlias, // Add group alias
				modifiedByUid: currentUser.identityUid,
				displayStyle: analyte.displayStyle || [
					{
						label: 'default',
						value: '',
					},
					{
						label: 'eng',
						value: '',
					},
				],
			}));

			// Make a single API call with the analyses array
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analyses: updateDataArray,
			});

			if (response.status === 200) {
				// Update the UI
				const newAnalytesList = listAnalytes.map((analyte) => {
					if (selectedAnalytes.includes(analyte.id)) {
						// Find technician info for updating UI
						const selectedTech = selectedGroup.technicians.find((t) => t.technicianId === selectedTechnician);
						return {
							...analyte,
							technicianId: selectedTechnician,
							technician: {
								identityId: selectedTechnician,
								identityName: selectedTech?.identityName || '',
							},
							technicianAlias: selectedGroup.alias,
						};
					}
					return analyte;
				});
				setListAnalytes(newAnalytesList);

				// Find technician name from new structure
				let technicianName = '';
				for (const group of technicians) {
					if (group.technicians && Array.isArray(group.technicians)) {
						const tech = group.technicians.find((t) => t.technicianId === selectedTechnician);
						if (tech) {
							technicianName = tech.identityName;
							break;
						}
					}
				}
				showToast(`Successfully transferred ${selectedAnalytes.length} analyses to ${technicianName}`);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi bàn giao chỉ tiêu',
				});
			}

			setIsTransferMultipleVisible(false);
			setSelectedTechnician(null);
		} catch (error) {
			console.error('Error transferring analyses:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while transferring analyses',
			});
		}
	};

	const renderBulkTransferForm = () => (
		<div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
			<div className="bg-white p-4 rounded-lg w-[800px] max-w-[90vw] max-h-[90vh] relative flex flex-col justify-between">
				<h2 className="text-2xl font-semibold mb-4">Bàn giao {selectedAnalytes.length} chỉ tiêu</h2>
				<div className="overflow-auto mb-4 flex-1">
					<p className="font-medium mb-2">Chọn người thực hiện:</p>
					<div className="grid grid-cols-4 gap-3">
						{technicians.map((group) => {
							const primaryTechnician = group.technicians?.[0];
							if (!primaryTechnician) return null;

							return (
								<div
									key={group.alias}
									className={`relative p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration-200 text-center ${
										selectedTechnician === primaryTechnician.technicianId
											? 'border-primary bg-blue-50'
											: 'border-gray-300'
									}`}
									onClick={() => setSelectedTechnician(primaryTechnician.technicianId)}
									onMouseEnter={(e) => {
										if (group.technicians && group.technicians.length > 1) {
											const rect = e.currentTarget.getBoundingClientRect();
											setDropdownRect({
												top: rect.top,
												left: rect.left,
												width: rect.width,
												height: rect.height,
											});
											setHoveredGroup(group.alias);
										}
									}}
								>
									<p className="font-bold text-primary text-sm mb-1">
										{group.alias}: {group.groupName}
									</p>
									<p className="text-xs text-gray-600 leading-tight">{primaryTechnician.identityName}</p>
								</div>
							);
						})}
					</div>

					{/* Portal for hover dropdown */}
					{hoveredGroup &&
						dropdownRect &&
						createPortal(
							<div
								className="fixed z-[9999]"
								style={{
									top: `${dropdownRect.top}px`,
									left: `${dropdownRect.left - 200}px`,
									width: '200px',
									height: `${dropdownRect.height}px`,
								}}
								onMouseLeave={() => {
									setHoveredGroup(null);
									setDropdownRect(null);
								}}
							>
								{/* Bridge area - invisible but hoverable to prevent gap issues */}
								<div className="absolute right-0 top-0 w-12 h-full bg-transparent"></div>

								{/* Actual dropdown */}
								<div className="absolute left-0 top-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-48">
									<p className="text-xs font-medium text-gray-500 mb-2">Tất cả thành viên:</p>
									{technicians
										.find((g) => g.alias === hoveredGroup)
										?.technicians?.map((tech) => (
											<div
												key={tech.technicianId}
												className="p-2 hover:bg-gray-100 rounded cursor-pointer text-left"
												onClick={(e) => {
													e.stopPropagation();
													setSelectedTechnician(tech.technicianId);
													setHoveredGroup(null);
													setDropdownRect(null);
												}}
											>
												<p className="text-sm font-medium">{tech.identityName}</p>
												<p className="text-xs text-gray-500">{tech.technicianAlias}</p>
											</div>
										))}
								</div>
							</div>,
							document.body,
						)}
				</div>
				<div className="flex justify-end">
					<button
						className="bg-gray-500 text-white p-2 rounded mr-2"
						onClick={() => setIsTransferMultipleVisible(false)}
					>
						Hủy bỏ
					</button>
					<button
						className={`${selectedTechnician ? 'bg-green-500' : 'bg-gray-400'} text-white p-2 rounded`}
						onClick={handleBulkTransferConfirm}
						disabled={!selectedTechnician}
					>
						Xác nhận
					</button>
				</div>
			</div>
		</div>
	);
	// Add a new function to handle the review action
	const handleReviewAnalyses = async () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn ít nhất một chỉ tiêu để duyệt',
			});
			return;
		}

		try {
			// Create array of objects with id and reviewedBy fields (toggle logic)
			const analysesToConfirm = selectedAnalytes.map((id) => {
				const analysis = listAnalytes.find((item) => item.id === id);
				// If already reviewed, set to empty string, otherwise set to current user
				const reviewedBy = analysis?.reviewed_by && analysis.reviewed_by.trim() !== '' ? '' : currentUser.identity_uid;

				return {
					id,
					reviewedBy,
				};
			});

			// Make a single API call with the array
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/confirm/analysis', analysesToConfirm);

			if (response.status === 200) {
				// Update the UI
				const currentUserName = await getIdenByUid(currentUser.identity_uid);
				const newAnalytesList = listAnalytes.map((analyte) => {
					if (selectedAnalytes.includes(analyte.id)) {
						const analysisToConfirm = analysesToConfirm.find((item) => item.id === analyte.id);
						const newReviewedBy = analysisToConfirm.reviewedBy;

						return {
							...analyte,
							reviewedBy: newReviewedBy,
							reviewerName: newReviewedBy ? (currentUserName ? currentUserName.identity_name : 'Unknown') : null,
						};
					}
					return analyte;
				});
				setListAnalytes(newAnalytesList);

				// Count how many were reviewed vs unreviewed
				const reviewedCount = analysesToConfirm.filter((item) => item.reviewedBy !== '').length;
				const unreviewedCount = analysesToConfirm.length - reviewedCount;

				if (reviewedCount > 0 && unreviewedCount > 0) {
					showToast(`Đã duyệt ${reviewedCount} và bỏ duyệt ${unreviewedCount} chỉ tiêu`, 'success');
				} else if (reviewedCount > 0) {
					showToast(`Đã duyệt thành công ${reviewedCount} chỉ tiêu`, 'success');
				} else {
					showToast(`Đã bỏ duyệt ${unreviewedCount} chỉ tiêu`, 'success');
				}

				// Clear selection after successful review
				setSelectedAnalytes([]);
				setSelectAll(false);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi duyệt chỉ tiêu',
				});
			}
		} catch (error) {
			console.error('Error reviewing analyses:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi duyệt chỉ tiêu',
			});
		}
	};
	// Add function to handle bulk deadline updates
	const handleBulkDeadlineUpdate = async () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn ít nhất một chỉ tiêu để cập nhật hạn trả',
			});
			return;
		}

		setIsBulkDeadlineVisible(true);
	};

	// Add function to handle bulk field updates
	const handleBulkFieldUpdate = async () => {
		if (selectedAnalytes.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Cảnh báo',
				text: 'Vui lòng chọn ít nhất một chỉ tiêu để cập nhật lĩnh vực',
			});
			return;
		}

		// Create inputOptions dynamically from scientificFields
		const inputOptions = scientificFields.reduce((acc, field) => {
			acc[field] = field;
			return acc;
		}, {});

		// Prompt for the field value
		const { value: field } = await Swal.fire({
			title: 'Chọn lĩnh vực',
			input: 'select',
			inputOptions: inputOptions,
			inputPlaceholder: 'Chọn lĩnh vực',
			showCancelButton: true,
			cancelButtonText: 'Hủy bỏ',
			confirmButtonText: 'Cập nhật',
			inputValidator: (value) => {
				if (!value) {
					return 'Bạn cần chọn một lĩnh vực!';
				}
			},
		});

		if (field) {
			try {
				// Get the selected analytes
				const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));

				// Create array of update objects for bulk update
				const updateDataArray = selectedItems.map((analyte) => ({
					id: analyte.id,
					sampleId: analyte.sampleId,
					receiptId: analyte.receiptId,
					scientificField: field,
					modifiedByUid: currentUser.identityUid,
					displayStyle: analyte.displayStyle || [
						{
							label: 'default',
							value: '',
						},
						{
							label: 'eng',
							value: '',
						},
					],
				}));

				// Make a single API call with the analyses array
				const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
					analyses: updateDataArray,
				});

				if (response.status === 200) {
					// Update the UI
					const newAnalytesList = listAnalytes.map((analyte) => {
						if (selectedAnalytes.includes(analyte.id)) {
							return { ...analyte, scientificField: field };
						}
						return analyte;
					});
					setListAnalytes(newAnalytesList);

					showToast(`Đã cập nhật lĩnh vực "${field}" cho ${selectedAnalytes.length} chỉ tiêu`);
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: response.data?.message || 'Có lỗi xảy ra khi cập nhật lĩnh vực',
					});
				}
			} catch (error) {
				console.error('Error updating fields:', error);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: error.message || 'Đã xảy ra lỗi khi cập nhật lĩnh vực',
				});
			}
		}
	};

	// Function to apply the new deadline to all selected analyses
	const handleConfirmBulkDeadline = async () => {
		try {
			// Get the selected analytes
			const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));
			const newDeadline = adjustDateForApiSubmission(bulkDeadlineDate);

			// Create array of update objects for bulk update
			const updateDataArray = selectedItems.map((analyte) => ({
				id: analyte.id,
				sampleId: analyte.sampleId,
				receiptId: analyte.receiptId,
				deadline: newDeadline,
				modifiedByUid: currentUser.identityUid,
				displayStyle: analyte.displayStyle || [
					{
						label: 'default',
						value: '',
					},
					{
						label: 'eng',
						value: '',
					},
				],
			}));

			// Make a single API call with the analyses array
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analyses: updateDataArray,
			});

			if (response.status === 200) {
				// Update the UI
				const newAnalytesList = listAnalytes.map((analyte) => {
					if (selectedAnalytes.includes(analyte.id)) {
						return { ...analyte, deadline: newDeadline };
					}
					return analyte;
				});
				setListAnalytes(newAnalytesList);

				showToast(`Đã cập nhật hạn trả cho ${selectedAnalytes.length} chỉ tiêu thành ${formatDate(bulkDeadlineDate)}`);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật hạn trả',
				});
			}

			setIsBulkDeadlineVisible(false);
		} catch (error) {
			console.error('Error updating deadlines:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'An error occurred while updating deadlines',
			});
		}
	};

	// Add the bulk deadline picker modal
	const renderBulkDeadlinePicker = () => (
		<div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
			<div className="bg-white p-4 rounded-lg w-[320px] relative">
				<h2 className="text-xl font-semibold mb-4">Cập nhật hạn trả cho {selectedAnalytes.length} chỉ tiêu</h2>
				<div className="mb-4 flex justify-center">
					<DatePicker selected={bulkDeadlineDate} onChange={(date) => setBulkDeadlineDate(date)} inline />
				</div>
				<div className="flex justify-end">
					<button className="bg-gray-500 text-white p-2 rounded mr-2" onClick={() => setIsBulkDeadlineVisible(false)}>
						Hủy bỏ
					</button>
					<button className="bg-green-500 text-white p-2 rounded" onClick={handleConfirmBulkDeadline}>
						Xác nhận
					</button>
				</div>
			</div>
		</div>
	);

	// Modify the DatePicker styling to ensure it appears above all content
	useEffect(() => {
		// Add a global style to ensure DatePicker appears above all elements
		const style = document.createElement('style');
		style.innerHTML = `
		.react-datepicker-popper {
			z-index: 99999 !important;
		}
		.react-datepicker-wrapper {
			width: 100%;
		}
		.react-datepicker__input-container {
			width: 100%;
		}
		/* Custom Tooltip Styles */
		.custom-tooltip {
			position: absolute;
			background: rgba(0, 0, 0, 0.9);
			color: white;
			padding: 10px 14px;
			border-radius: 6px;
			font-size: 13px;
			font-weight: 500;
			white-space: pre-wrap;
			pointer-events: none;
			z-index: 10000;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			opacity: 0;
			transition: opacity 0.2s ease-in-out;
			max-width: 350px;
			min-width: 200px;
			word-wrap: break-word;
		}
		.custom-tooltip.visible {
			opacity: 1;
		}
		.custom-tooltip.left {
			transform: translateX(-100%) translateY(-50%);
		}
		.custom-tooltip.right {
			transform: translateX(0) translateY(-50%);
		}
		.custom-tooltip.above {
			transform: translateX(-50%) translateY(-100%);
		}
		.custom-tooltip.below {
			transform: translateX(-50%) translateY(0);
		}
		`;
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, []);
	// Add these functions before the return statement
	const handleSyncData = async () => {
		try {
			if (selectedAnalytes.length === 0) {
				Swal.fire({
					icon: 'warning',
					title: 'Cảnh báo',
					text: 'Vui lòng chọn ít nhất một chỉ tiêu để đồng bộ',
				});
				return;
			}

			// Get the selected analytes
			const selectedItems = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));

			// Check if any item is missing matrix
			const missingMatrixItems = selectedItems.filter((item) => !item.matrix || item.matrix.trim() === '');
			if (missingMatrixItems.length > 0) {
				const result = await Swal.fire({
					icon: 'warning',
					title: 'Cảnh báo',
					text: `Có ${missingMatrixItems.length} chỉ tiêu thiếu thông tin nền mẫu. Vui lòng bổ sung thông tin nền mẫu trước khi đối soát.`,
					showCancelButton: true,
					confirmButtonText: 'Tiếp tục đối soát',
					cancelButtonText: 'Hủy bỏ',
				});

				if (!result.isConfirmed) {
					return;
				}
			}

			// Call match API to get updated parameter information
			const matchData = selectedItems.map((item) => ({
				parameterName: item.parameterName || item.parameter_name,
				matrix: item.matrix || sample?.matrix || '',
			}));

			const matchResponse = await apiPost('https://red.irdop.org/v1/analysis/match/parameter', {
				analyses: matchData,
			});

			if (matchResponse.status === 200) {
				// Create array of update objects for bulk update using matched data
				const updateDataArray = selectedItems.map((analyte) => {
					// Find the corresponding matched data
					const matchedData = matchResponse.data.find((item) => {
						const apiParamName = (item.parameterName || '').toLowerCase().trim();
						const analyteParamName = (analyte.parameterName || analyte.parameter_name || '').toLowerCase().trim();
						const apiMatrix = (item.matrix || '').toLowerCase().trim();
						const analyteMatrix = (analyte.matrix || sample?.matrix || '').toLowerCase().trim();
						return apiParamName === analyteParamName && (apiMatrix === analyteMatrix || (!apiMatrix && !analyteMatrix));
					});

					// Create update object with matched data or original data
					return {
						id: analyte.id,
						sampleId: analyte.sampleId,
						receiptId: analyte.receiptId,
						parameterName: matchedData?.parameterName || analyte.parameterName,
						parameterId: matchedData?.parameterId || analyte.parameterId,
						parameterUid: matchedData?.parameterUid || analyte.parameterUid || analyte.parameter_uid || '',
						protocolCode: matchedData?.protocolCode || analyte.protocolCode,
						protocolSource: matchedData?.protocolSource || analyte.protocolSource,
						matrix: matchedData?.matrix || analyte.matrix,
						scientificField: matchedData?.scientificField || analyte.scientificField,
						technicianAlias: matchedData?.technicianAlias || analyte.technicianAlias,
						modifiedByUid: currentUser.identityUid,
						displayStyle: analyte.displayStyle || [
							{
								label: 'default',
								value: '',
							},
							{
								label: 'eng',
								value: '',
							},
						],
					};
				});

				// Make bulk update API call
				const updateResponse = await apiPost('https://red.irdop.org/v1/analysis/update', {
					analyses: updateDataArray,
				});

				if (updateResponse.status === 200) {
					// Update the UI
					const newAnalytesList = listAnalytes.map((analyte) => {
						if (selectedAnalytes.includes(analyte.id)) {
							const updateData = updateDataArray.find((item) => item.id === analyte.id);
							return {
								...analyte,
								...updateData,
							};
						}
						return analyte;
					});
					setListAnalytes(newAnalytesList);

					showToast(`Đã đồng bộ dữ liệu cho ${selectedAnalytes.length} chỉ tiêu`);
				} else {
					Swal.fire({
						icon: 'error',
						title: 'Lỗi',
						text: updateResponse.data?.message || 'Có lỗi xảy ra khi cập nhật dữ liệu',
					});
				}
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: matchResponse.data?.message || 'Có lỗi xảy ra khi đối soát thông số',
				});
			}
		} catch (error) {
			console.error('Error syncing data:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi đồng bộ dữ liệu',
			});
		}
	};

	const handleUpdateDatabase = async () => {
		try {
			// Use selected analyses if any are selected, otherwise find analyses that need database updates
			let analysesToUpdate;

			if (selectedAnalytes.length > 0) {
				// Use selected analyses for update
				analysesToUpdate = listAnalytes.filter((analyte) => selectedAnalytes.includes(analyte.id));
			} else {
				// Find analyses that need database updates (missing parameterUid but have other required fields)
				analysesToUpdate = listAnalytes.filter(
					(analysis) =>
						((!analysis.parameterUid && !analysis.parameterUid) ||
							analysis.parameterUid === '' ||
							analysis.parameterUid === '') &&
						analysis.matrix &&
						((analysis.protocolSource !== 'EX' && analysis.protocolCode) ||
							(analysis.protocolSource !== 'EX' && analysis.protocolCode) ||
							analysis.protocolSource === 'EX' ||
							analysis.protocolSource === 'EX') &&
						(analysis.protocolSource || analysis.protocolSource) &&
						analysis.field,
				);
			}

			if (analysesToUpdate.length === 0) {
				showToast('Không có chỉ tiêu nào cần cập nhật CSDL', 'info');
				return;
			}

			// Show confirmation dialog
			const confirmResult = await Swal.fire({
				title: 'Cập nhật CSDL',
				text: `Có ${analysesToUpdate.length} chỉ tiêu cần cập nhật vào CSDL. Bạn có muốn tiếp tục?`,
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: 'Có',
				cancelButtonText: 'Không',
			});

			if (!confirmResult.isConfirmed) return;

			// Create array of update objects for bulk update
			const updateDataArray = analysesToUpdate.map((analyte) => ({
				id: analyte.id,
				sampleId: analyte.sampleId,
				receiptId: analyte.receiptId,
				parameterName: analyte.parameter_name || analyte.parameterName,
				parameterUid: analyte.parameter_uid || analyte.parameterUid || '',
				parameterId: analyte.parameterId,
				protocolCode: analyte.protocol_code || analyte.protocolCode,
				protocolSource: analyte.protocol_source || analyte.protocolSource,
				matrix: analyte.matrix || sample?.matrix || '',
				scientificField: analyte.field || analyte.scientificField,
				modifiedByUid: currentUser.identityUid,
				displayStyle: analyte.displayStyle || [
					{
						label: 'default',
						value: '',
					},
					{
						label: 'eng',
						value: '',
					},
				],
			}));

			// Make a single API call with the analyses array
			const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
				analyses: updateDataArray,
			});

			if (response.status === 200) {
				// Update the UI
				const newAnalytesList = listAnalytes.map((analyte) => {
					const updateData = updateDataArray.find((item) => item.id === analyte.id);
					if (updateData) {
						return {
							...analyte,
							...updateData,
						};
					}
					return analyte;
				});
				setListAnalytes(newAnalytesList);

				showToast(`Đã cập nhật CSDL cho ${analysesToUpdate.length} chỉ tiêu`);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: response.data?.message || 'Có lỗi xảy ra khi cập nhật CSDL',
				});
			}
		} catch (error) {
			console.error('Error updating database:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: error.message || 'Đã xảy ra lỗi khi cập nhật CSDL',
			});
		}
	};

	if (!sample) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
					<p className="mt-4 text-gray-600">Đang tải thông tin mẫu...</p>
					{!sampleId && (
						<p className="mt-2 text-red-500">Không tìm thấy sampleId trong URL. Vui lòng kiểm tra đường dẫn.</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="w-full relative">
			{/* Add CSS for custom toast */}
			<style jsx>{`
				.colored-toast.swal2-icon-success {
					background-color: #2bae66 !important;
				}
				.colored-toast.swal2-icon-error {
					background-color: #f27474 !important;
				}
				.colored-toast.swal2-icon-warning {
					background-color: #f8bb86 !important;
				}
				.colored-toast.swal2-icon-info {
					background-color: #3fc3ee !important;
				}
				.colored-toast.swal2-icon-question {
					background-color: #87adbd !important;
				}
				.colored-toast .swal2-title {
					color: white;
					font-size: 0.85rem !important;
				}
				.colored-toast .swal2-close {
					color: white;
				}
				.colored-toast .swal2-html-container {
					color: white;
				}

				.editable-field {
					transition: all 0.2s;
				}

				.editable-field:hover {
					border-color: #6366f1 !important;
					box-shadow: 0 0 0 1px #6366f1;
				}
			`}</style>{' '}
			<Breadcrumb
				paths={[
					{ name: 'Danh sách', link: '/' },
					{
						name: `${getEffectiveReceiptId()}`,
						link: `/dashboard/receipt?receiptId=${getEffectiveReceiptId()}`,
					},
					{
						name: `${sample.sampleId}`,
						link: `/dashboard/sample?receiptId=${getEffectiveReceiptId()}&sampleId=${sample.sampleId}`,
					},
				]}
				sampleIds={listSampleByReceipt} // Now it's directly an array of sampleId strings
				showSearch={true}
			/>
			<div className="flex justify-end mb-1">
				<button
					className="text-primary border-gray-300 bg-background text-sm rounded-lg p-1 w-fit self-start active:bg-sky-100 focus:outline-none mr-2"
					onClick={openPPTWindow}
				>
					<div className="flex items-center justify-between">
						{'PPT'} <GrDocumentText size={15} className="ml-1.5" />
					</div>
				</button>
				<button
					className="text-primary border-gray-300 bg-background text-sm rounded-lg p-1 w-fit self-start active:bg-red-100 focus:outline-none "
					onClick={handleDeleteSample}
				>
					<div className="flex items-center justify-between text-red-500 font-semibold">
						{'Xóa'} <FaTrashAlt size={15} className="ml-1.5" />
					</div>
				</button>
			</div>
			<div className="rounded-lg max-w-full p-4 bg-white">
				<div className="flex justify-start">
					{/* {listSampleByReceipt && listSampleByReceipt.length > 0 && (
						<>
							<button
								className="text-primary border-gray-300 rounded-lg px-2 py-0.5 mr-2"
								onClick={() => navigate(`/dashboard/receipt?receiptId=${receiptId}`)}
							>
								{receiptId}
							</button>
							<select
								className="bg-sky-400 hover:border-purple-500 hover:cursor-pointer border rounded-lg p-1 w-fit self-start focus:outline-none"
								onChange={(e) => handleSampleSelect(e.target.value)}
								defaultValue={sample.sampleId}
							>
								{listSampleByReceipt.map((sample) => (
									<option className="bg-white" key={sample.sampleId} value={sample.sampleId}>
										{sample.sampleId}
									</option>
								))}
							</select>
						</>
					)} */}
				</div>
				<div className="hover:overflow-auto overflow-hidden lg:pb-0 md:pb-2 hover:pb-0 flex flex-wrap border rounded-lg mt-2">
					<div className="flex md:flex-row flex-col md:justify-between items-center justify-center w-full">
						<div className="w-full p-2 md:pr-4">
							<table className="w-full border-none">
								<tbody>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium md:min-w-32 min-w-24 text-gray-500">Mã mẫu:</td>
										<td className="w-full text-start p-1 md:min-w-80 min-m-w-40 relative">
											<input
												type="text"
												value={sample?.sampleId || ''}
												className="w-full bg-white border rounded p-1"
												disabled
											/>
											<CopyButton
												textToCopy={sample?.sampleId || ''}
												className="absolute right-2 top-1/2 transform -translate-y-1/2"
											/>
										</td>
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium  text-gray-500">Tên mẫu:</td>
										<td className="w-full text-start p-1">
											<input
												type="text"
												value={sample?.sampleName || ''}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={(e) =>
													setSample({
														...sample,
														sampleName: e.target.value,
													})
												}
												onKeyDown={(e) => handleFieldKeyDown(e, 'sampleName', e.target.value)}
												onBlur={(e) => handleFieldBlur('sampleName', e.target.value, originalSampleValues.sampleName)}
											/>
										</td>
									</tr>{' '}
									<tr>
										<td className="w-1/5 text-start p-1 font-medium  text-gray-500">
											<span>Nền mẫu:</span>
										</td>
										<td className="w-full text-start p-1 relative">
											{' '}
											<input
												type="text"
												id="sample-matrix-input"
												value={sample?.matrix || ''}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={(e) => {
													const newValue = e.target.value;
													setSample({
														...sample,
														matrix: newValue,
													});
													// Show matrix suggestions when typing
													setMatrixInput(newValue);
													setMatrixPage(1); // Reset to first page when typing
													setShowMatrixDropdown(newValue.length >= 2); // Show dropdown once at least 2 chars entered
												}}
												onKeyDown={(e) => handleFieldKeyDown(e, 'matrix', e.target.value)}
												onBlur={(e) => {
													setTimeout(() => {
														setShowMatrixDropdown(false);
														handleFieldBlur('matrix', e.target.value, originalSampleValues.matrix);
													}, 200);
												}}
											/>
											{showMatrixDropdown &&
												getPaginatedMatrices(matrixInput).length > 0 &&
												createPortal(
													<div
														className="absolute bg-white border rounded shadow-lg z-50"
														style={{
															width: document.getElementById('sample-matrix-input').offsetWidth + 'px',
															top:
																document.getElementById('sample-matrix-input').getBoundingClientRect().bottom +
																window.scrollY,
															left:
																document.getElementById('sample-matrix-input').getBoundingClientRect().left +
																window.scrollX,
														}}
													>
														{getPaginatedMatrices(matrixInput).map((matrix, index) => (
															<div
																key={index}
																className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																onClick={() => {
																	setSample({
																		...sample,
																		matrix: matrix,
																	});
																	handleFieldBlur('matrix', matrix, originalSampleValues.matrix);
																	setShowMatrixDropdown(false);
																}}
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
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium align-top text-gray-500">
											<span className="">Mô tả:</span>
										</td>
										<td className="w-full text-start p-1 flex">
											<textarea
												value={sample?.sampleDescription || ''}
												className="w-full resize-none bg-white border rounded p-1 overflow-hidden hover:overflow-y-auto editable-field"
												rows={2}
												onChange={(e) =>
													setSample({
														...sample,
														sampleDescription: e.target.value,
													})
												}
												onKeyDown={(e) => handleFieldKeyDown(e, 'sampleDescription', e.target.value)}
												onBlur={(e) =>
													handleFieldBlur('sampleDescription', e.target.value, originalSampleValues.sampleDescription)
												}
											/>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div className="w-full p-2 md:pl-4">
							<table className="w-full border-none">
								<tbody>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium md:min-w-32 min-w-24  text-gray-500">Số lượng:</td>
										<td className="w-full text-start p-1 md:min-w-80 min-w-40">
											<input
												type="text"
												value={sample?.sampleVolume || ''}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={(e) =>
													setSample({
														...sample,
														sampleVolume: e.target.value,
													})
												}
												onKeyDown={(e) => handleFieldKeyDown(e, 'sampleVolume', e.target.value)}
												onBlur={(e) =>
													handleFieldBlur('sampleVolume', e.target.value, originalSampleValues.sampleVolume)
												}
											/>
										</td>
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium  text-gray-500">Mục đích:</td>
										<td className="w-full text-start p-1">
											<select
												value={sample?.purpose || ''}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={handlePurposeChange}
											>
												<option value="">-- Mục đích kiểm nghiệm --</option>
												{purposes.map((item, index) => (
													<option key={index} value={item}>
														{item}
													</option>
												))}
											</select>
										</td>
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium align-top text-gray-500">
											<span>Trạng thái:</span>
										</td>
										<td className="w-full text-start p-1 md:max-w-80 max-w-60">
											<select
												value={sample?.status || 0}
												className="w-full bg-white border rounded p-1 editable-field"
												onChange={(e) => handleStatusChange(parseInt(e.target.value))}
											>
												{status.map((stat, index) => (
													<option key={index} value={index}>
														{stat}
													</option>
												))}
											</select>
										</td>
									</tr>
									<tr>
										<td className="w-1/5 text-start p-1 font-medium align-top text-gray-500">
											<span className="">Yêu cầu:</span>
										</td>
										<td className="w-full text-start p-1 flex">
											<textarea
												value={sample?.additionalRequest || ''}
												className="w-full resize-none bg-white border rounded p-1 overflow-hidden hover:overflow-y-auto editable-field h-full"
												rows={2}
												onChange={(e) =>
													setSample({
														...sample,
														additionalRequest: e.target.value,
													})
												}
												onKeyDown={(e) => handleFieldKeyDown(e, 'additionalRequest', e.target.value)}
												onBlur={(e) =>
													handleFieldBlur('additionalRequest', e.target.value, originalSampleValues.additionalRequest)
												}
											/>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
				{/* Remove the edit buttons since we now have inline editing */}
				<div className="mt-2 flex flex-col">
					{!isTechnician() && (
						<div className="flex justify-between items-center">
							<h3 className="font-medium text-lg">Thông tin in phiếu</h3>
							<div className="relative sample-dropdown-container">
								<button
									className="bg-white text-sky-500 border-gray-300 text-sm rounded-lg p-1 active:bg-teritary focus:outline-none ml-2 w-fit copy-button"
									onClick={() => setSampleDropdownVisible(!sampleDropdownVisible)}
								>
									<FaCopy size={20} />
								</button>
								{sampleDropdownVisible && (
									<div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-10 min-w-40 sample-dropdown-container">
										<div className="p-2 bg-gray-100 font-medium">Chọn mẫu để sao chép thông tin:</div>
										<ul>
											{listSampleByReceipt.map((sampleId) => (
												<li
													key={sampleId}
													className={`p-2 cursor-pointer hover:bg-gray-100 ${
														sampleId === sampleId ? 'bg-gray-200' : ''
													}`}
													onClick={() => handleCopySampleInfo(sampleId)}
												>
													{sampleId}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						</div>
					)}
					{!isTechnician() && renderNewReport()}
				</div>
			</div>
			<div className="bg-white rounded-lg w-full mt-4 p-4 pt-2 border overflow-auto ">
				<div className="mb-1 flex justify-end">
					<div className="w-fit flex items-center flex-wrap py-1 mr-0.5">
						<div className="flex -translate-y-0 md:translate-y-0 md:pt-0 w-full justify-end">
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									selectedAnalytes.length > 0 ? 'bg-green-500' : 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={selectedAnalytes.length > 0 ? handleSyncData : undefined}
								title="Đồng bộ dữ liệu"
							>
								<FaSync className="mr-1" />
								{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
							</button>{' '}
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									// ĐIỀU KIỆN ACTIVE MỚI
									(selectedAnalytes.length > 0 &&
										listAnalytes
											.filter((a) => selectedAnalytes.includes(a.id))
											.every(
												(a) =>
													(!a.parameter_uid || a.parameter_uid === '') &&
													a.parameter_name &&
													a.matrix &&
													((a.protocol_source !== 'EX' && a.protocol_code) || a.protocol_source === 'EX') &&
													a.protocol_source &&
													a.field,
											)) ||
									(selectedAnalytes.length === 0 &&
										listAnalytes.some(
											(a) =>
												(!a.parameter_uid || a.parameter_uid === '') &&
												a.parameter_name &&
												a.matrix &&
												((a.protocol_source !== 'EX' && a.protocol_code) || a.protocol_source === 'EX') &&
												a.protocol_source &&
												a.field,
										))
										? 'bg-blue-500'
										: 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={
									(selectedAnalytes.length > 0 &&
										listAnalytes
											.filter((a) => selectedAnalytes.includes(a.id))
											.every(
												(a) =>
													(!a.parameter_uid || a.parameter_uid === '') &&
													a.parameter_name &&
													a.matrix &&
													((a.protocol_source !== 'EX' && a.protocol_code) || a.protocol_source === 'EX') &&
													a.protocol_source &&
													a.field,
											)) ||
									(selectedAnalytes.length === 0 &&
										listAnalytes.some(
											(a) =>
												(!a.parameter_uid || a.parameter_uid === '') &&
												a.parameter_name &&
												a.matrix &&
												((a.protocol_source !== 'EX' && a.protocol_code) || a.protocol_source === 'EX') &&
												a.protocol_source &&
												a.field,
										))
										? handleUpdateDatabase
										: undefined
								}
								title="Cập nhật CSDL"
							>
								<FaDatabase className="mr-1" />
								{selectedAnalytes.length > 0
									? selectedAnalytes.length
									: listAnalytes.filter(
											(a) =>
												(!a.parameter_uid || a.parameter_uid === '') &&
												a.parameter_name &&
												a.matrix &&
												((a.protocol_source !== 'EX' && a.protocol_code) || a.protocol_source === 'EX') &&
												a.protocol_source &&
												a.field,
									  ).length || '0'}
							</button>
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									selectedAnalytes.length > 0 ? 'bg-red-500' : 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={selectedAnalytes.length > 0 ? handleDeleteSelected : undefined}
							>
								<FaTrashAlt className="mr-1" />
								{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
							</button>
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									selectedAnalytes.length > 0 ? 'bg-blue-500' : 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={selectedAnalytes.length > 0 ? handleBulkTransfer : undefined}
							>
								<FaUserCog className="mr-1" />
								{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
							</button>
							{/* Add the bulk deadline update button */}{' '}
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									selectedAnalytes.length > 0 ? 'bg-orange-500' : 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={selectedAnalytes.length > 0 ? handleBulkDeadlineUpdate : undefined}
								title="Cập nhật hạn trả"
							>
								<MdCalendarMonth className="mr-1" size={16} />
								{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
							</button>{' '}
							{/* Add button to update field in bulk with a different icon */}
							<button
								className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
									selectedAnalytes.length > 0 ? 'bg-purple-500' : 'bg-gray-300 cursor-not-allowed'
								} mr-2`}
								onClick={selectedAnalytes.length > 0 ? handleBulkFieldUpdate : undefined}
								title="Cập nhật lĩnh vực"
							>
								<FaLayerGroup className="mr-1" size={14} />
								{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
							</button>
							{/* Modify the review button to check for admin role */}
							{isAdmin() && (
								<button
									className={`text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center ${
										selectedAnalytes.length > 0 ? 'bg-green-500' : 'bg-gray-300 cursor-not-allowed'
									} mr-2`}
									onClick={selectedAnalytes.length > 0 ? handleReviewAnalyses : undefined}
									title="Duyệt kết quả"
								>
									<FaCheck className="mr-1" />
									{selectedAnalytes.length > 0 ? selectedAnalytes.length : '0'}
								</button>
							)}
							{/* If not admin, show disabled review button with tooltip */}
							{!isAdmin() && (
								<button
									className="text-white text-sm rounded-lg px-2 py-1 flex-shrink-0 flex items-center bg-gray-300 cursor-not-allowed mr-2"
									title="Chỉ admin mới có quyền duyệt kết quả"
								>
									<FaCheck className="mr-1" />0
								</button>
							)}{' '}
							<button
								className="bg-white text-sky-500 border-gray-400 text-sm rounded-lg p-1 active:bg-teritary focus:outline-none flex-shrink-0"
								onClick={() => {
									setIsAddingParameter(true);
								}}
							>
								<MdLibraryAdd size={24} />
							</button>
						</div>
					</div>
					{isAddingParameter && renderNewParameter()}
				</div>

				<div className="hover:overflow-auto overflow-hidden xl:pb-0 md:pb-2 hover:pb-0 pb-2 border-x xl:border-x-0">
					<table className="text-black w-full border-2 analytes-table">
						<thead>
							<tr className="border-y-2">
								<th className="p-2 border-x w-[24%] min-w-60 text-left">Chỉ tiêu</th>
								<th className="p-2 border-x w-32 min-w-32 text-left">Nền mẫu</th>
								<th className="p-2 border-x w-[25%] min-w-44 text-left">Phương pháp</th>
								<th className="p-2 border-x w-[12%] min-w-28 text-left">Kết quả</th>
								<th className="p-2 border-x w-1/12 min-w-24 text-left">Đơn vị</th>
								<th className="p-2 border-x w-1/12 min-w-28 text-left">Hạn trả</th>
								<th className="p-2 border-x w-[5%] min-w-24 text-left ">Lĩnh vực</th>
								<th className="p-2 border-x w-[10%] min-w-32 text-left">Thực hiện</th>
								<th className="p-2 border-x w-[15%] min-w-40 text-left">Ghi chú</th>
								<th className="py-2 border-x w-10 min-w-10 cursor-pointer" onClick={handleSelectAll}>
									<input
										type="checkbox"
										checked={selectAll}
										onChange={handleSelectAll}
										className="w-4 h-4 pointer-events-none"
									/>
								</th>
							</tr>
						</thead>
						<tbody>
							{isAddingNewParameter && (
								<tr className="border bg-blue-50">
									<td className="p-1 border relative">
										<input
											type="text"
											className="w-full bg-white border rounded p-1 text-left"
											placeholder="Tên chỉ tiêu"
											value={newParameter.parameterName || ''}
											onChange={(e) => handleNewParameterChange('parameterName', e.target.value)}
										/>
									</td>
									<td className="p-1 border relative">
										<input
											type="text"
											className="w-full bg-white border rounded p-1 text-left"
											placeholder="Nền mẫu"
											value={newParameter.matrix || ''}
											onChange={(e) => handleNewParameterChange('matrix', e.target.value)}
										/>
									</td>
									<td className="p-1 border relative">
										<div className="flex items-center gap-0.5">
											<select
												className="min-w-24 max-w-fit p-1 py-[5px] max-h-fit font-semibold text-slate-500 bg-white border rounded text-sm focus:outline-none text-left"
												onChange={(e) => handleNewParameterChange('protocolSource', e.target.value)}
												value={newParameter.protocolSource || '--'}
											>
												<option value={'IRDOP'}>{'IRDOP'}</option>
												<option value={'IRDOP VS'}>{'IRDOP VS'}</option>
												<option value={'EX'}>{'EX'}</option>
											</select>
											<input
												type="text"
												className="w-full bg-white border rounded p-1 text-left"
												placeholder="Mã phương pháp"
												value={newParameter.protocolCode || ''}
												onChange={(e) => handleNewParameterChange('protocolCode', e.target.value)}
											/>
										</div>
									</td>
									<td className="p-1 border relative">
										{/* Kết quả - không nhập */}
										<div className="p-1 text-gray-400 italic text-center">--</div>
									</td>
									<td className="p-1 border relative">
										{/* Đơn vị - không nhập */}
										<div className="p-1 text-gray-400 italic text-center">--</div>
									</td>
									<td className="p-1 border relative">
										{/* Hạn trả - không nhập */}
										<div className="p-1 text-gray-400 italic text-center">--</div>
									</td>{' '}
									<td className="p-1 border relative">
										<select
											className="w-full bg-white border rounded p-1 text-left"
											value={newParameter.scientificField || ''}
											onChange={(e) => handleNewParameterChange('scientificField', e.target.value)}
										>
											<option value="">-- Chọn --</option>
											{scientificFields.map((field) => (
												<option key={field} value={field}>
													{field}
												</option>
											))}
										</select>
									</td>
									<td className="p-1 border relative">
										<div className="p-1 text-gray-400 italic text-center">Chưa xác định</div>
									</td>
									<td className="p-1 border relative">
										{/* Ghi chú - không nhập */}
										<div className="p-1 text-gray-400 italic text-center">--</div>
									</td>
									<td className="pt-[5px] pb-0 border align-top text-center">
										<div className="flex flex-col gap-0.5 items-center">
											<button
												onClick={handleSaveNewParameter}
												className="border-2 rounded-md p-0.5 text-xs w-fit text-primary"
												title="Lưu chỉ tiêu"
											>
												<FaSave size={15} />
											</button>
											<button
												onClick={handleCancelNewParameter}
												className="border-2 rounded-md p-0.5 text-xs w-fit text-gray-500"
												title="Hủy"
											>
												<FaTimes size={15} />
											</button>
										</div>
									</td>
								</tr>
							)}
							{listAnalytes?.map((order) => (
								<tr key={order.id} className="border">
									{' '}
									<td className="p-1 border relative align-top">
										<div className="relative w-full">
											{order.accreditation && (
												<div
													className="absolute right-0.5 top-0.5 z-10 bg-cyan-600 text-white text-xs px-1 rounded cursor-default"
													title="Accreditation"
												>
													{order.accreditation}
												</div>
											)}
											{editingParameterField === order.id ? (
												<>
													<input
														type="text"
														id={`parameter-name-${order.id}`}
														className="w-full bg-white border rounded py-0 px-1 text-left"
														placeholder="Tên chỉ tiêu"
														value={order.parameterName || ''}
														onChange={(e) => handleParameterNameChange(order.id, e.target.value)}
														onBlur={() => handleParameterBlur(order.id)}
														onKeyDown={(e) => handleParameterKeyDown(e, order.id)}
														autoFocus
													/>
												</>
											) : (
												<div
													className={`py-0 px-1 cursor-pointer hover:border-indigo-500 border 
													${!order.parameterName || order.parameterName.trim() === '' ? 'border-yellow-400' : 'border-white'} 
													rounded overflow-y-auto 
													${order.parameterName && order.parameterName.trim() !== '' ? 'text-left' : 'center'}
													`}
													onClick={() => handleParameterNameClick(order.id)}
												>
													<span>
														{order.parameterName && order.parameterName.trim() !== '' ? order.parameterName : '--'}
													</span>
												</div>
											)}
											{order.reviewed_by && (
												<div className="absolute right-1 top-1" title="Đã được kiểm tra">
													<FaStar className="text-yellow-400" size={14} />
												</div>
											)}
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top">
										<div
											className={`py-0 px-1 text-left border rounded overflow-y-auto
											${!order.matrix || order.matrix.trim() === '' ? 'border-yellow-400' : 'border-white'}
										`}
										>
											<span>{order.matrix && order.matrix.trim() !== '' ? order.matrix : '--'}</span>
											{/* Show warning if no matrix available */}
											{(!order.matrix || order.matrix.trim() === '') && (
												<span className="text-red-500 text-xs ml-1" title="Thiếu thông tin nền mẫu">
													⚠
												</span>
											)}
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top">
										<div className="flex flex-col">
											<div className="flex items-center gap-0.5">
												{' '}
												<select
													className={`w-fit min-w-24 cursor-pointer p-1 py-[5px] font-semibold text-slate-500 bg-white border rounded text-sm hover:border-indigo-500 hover:border focus:outline-none text-left ${
														!order.protocolSource || order.protocolSource.trim() === '' ? 'border-yellow-400' : ''
													}`}
													onChange={(e) => handleProtocolSourceChange(order.id, e.target.value)}
													value={order.protocolSource || '--'}
												>
													<option value={''}>{'--'}</option>
													<option value={'IRDOP'}>{'IRDOP'}</option>
													<option value={'IRDOP VS'}>{'IRDOP VS'}</option>
													<option value={'EX'}>{'EX'}</option>
												</select>{' '}
												{editingProtocolField === order.id ? (
													<input
														type="text"
														className="w-full bg-white border rounded py-0 px-1 text-left"
														placeholder="Mã phương pháp"
														value={order.protocolCode || ''}
														onChange={(e) => handleProtocolChange(order.id, e.target.value)}
														onBlur={() => handleProtocolBlur(order.id)}
														onKeyDown={(e) => handleProtocolKeyDown(e, order.id)}
														autoFocus
													/>
												) : (
													<div
														className={`w-full py-0 px-1 cursor-pointer hover:border-indigo-500 border rounded overflow-y-auto 
														${!order.protocolCode || order.protocolCode.trim() === '' ? 'border-yellow-400' : ''}
														${order.protocolCode && order.protocolCode.trim() !== '' ? 'text-left' : 'center'}
													`}
														onClick={() => handleProtocolClick(order.id)}
													>
														<span>
															{order.protocolCode && order.protocolCode.trim() !== '' ? order.protocolCode : '--'}
														</span>
													</div>
												)}
											</div>

											{order.protocolSource === 'EX' && (
												<>
													<div className="mt-1">
														{editingExNameField === order.id ? (
															<input
																type="text"
																className="w-full bg-white border rounded p-1 text-left"
																placeholder="Tên thầu phụ"
																value={order.ex_info?.ex_name || ''}
																onChange={(e) => handleExNameChange(order.id, e.target.value)}
																onBlur={() => handleExNameBlur(order.id)}
																onKeyDown={(e) => handleExNameKeyDown(e, order.id)}
																autoFocus
															/>
														) : (
															<div
																className="w-full p-1 cursor-pointer hover:border-indigo-500 border rounded text-left text-sm"
																onClick={() => handleExNameClick(order.id)}
															>
																{order.ex_info?.ex_name ? order.ex_info.ex_name : 'Thầu phụ...'}
															</div>
														)}
													</div>
													<div className="mt-1">
														{editingExDateField === order.id ? (
															<DatePicker
																selected={exDateSelected}
																onChange={(date) => handleExDateSelect(order.id, date)}
																dateFormat="dd/MM/yyyy"
																className="p-1 border rounded-md w-full text-sm bg-white"
																placeholderText="Ngày gửi mẫu"
																autoFocus
																shouldCloseOnSelect={true}
															/>
														) : (
															<div
																className="w-full p-1 cursor-pointer hover:border-indigo-500 border rounded text-left text-sm"
																onClick={() => handleExDateClick(order.id, order.ex_info?.send_at)}
															>
																{order.ex_info?.send_at ? formatDate(order.ex_info.send_at) : 'Ngày gửi mẫu...'}
															</div>
														)}
													</div>
												</>
											)}
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top" onClick={() => handleResultValueClick(order)}>
										<div className="hover:border-purple-500 hover:border rounded text-center">
											{editingField === `result_value-${order.id}` && isEditorVisible ? (
												order && (
													<TinyMceInput value={inputValue || ''} onUpdate={handleSaveContent} onKey={handleKeyDown} />
												)
											) : (
												<div
													dangerouslySetInnerHTML={{
														__html: order?.resultValue ? order.resultValue : '--',
													}}
													className="p-1"
												/>
											)}
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top">
										{editingField === `result_unit-${order.id}` ? (
											<>
												{order && (
													<input
														type="text"
														id={`result-unit-${order.id}`}
														className="w-full bg-white border rounded py-0 px-1 text-left"
														placeholder="Đơn vị"
														value={inputValue || ''}
														onChange={(e) => {
															const newValue = e.target.value;
															setInputValue(newValue);
															setUnitInput(newValue);
															setUnitPage(1);
															setShowUnitDropdown(newValue.length >= 1); // Show dropdown with at least 1 character for units
														}}
														onBlur={() => {
															// Use a global variable to store the timeout, so we can clear it if needed
															window.unitBlurTimeout = setTimeout(() => {
																setShowUnitDropdown(false);
																// Only save if we haven't already saved from dropdown selection
																if (!window.unitSavedFromDropdown) {
																	handleSaveContent(inputValue);
																}
																window.unitSavedFromDropdown = false;
															}, 200);
														}}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																handleSaveContent(inputValue);
															}
														}}
														autoFocus
													/>
												)}
												{showUnitDropdown &&
													getPaginatedUnits(unitInput).length > 0 &&
													order &&
													createPortal(
														<div
															className="absolute bg-white border rounded shadow-lg z-[9999]"
															style={{
																width: document.getElementById(`result-unit-${order.id}`)?.offsetWidth + 'px',
																top:
																	document.getElementById(`result-unit-${order.id}`)?.getBoundingClientRect().bottom +
																	window.scrollY,
																left:
																	document.getElementById(`result-unit-${order.id}`)?.getBoundingClientRect().left +
																	window.scrollX,
															}}
														>
															{getPaginatedUnits(unitInput).map((unit, index) => (
																<div
																	key={index}
																	className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
																	onClick={() => {
																		// Stop the blur timeout to prevent double API calls
																		clearTimeout(window.unitBlurTimeout);
																		setInputValue(unit);
																		handleSaveContent(unit);
																		setShowUnitDropdown(false);
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
											<div
												className="hover:border-purple-500 hover:border rounded"
												onClick={() => handleResultUnitClick(order)}
											>
												<div
													dangerouslySetInnerHTML={{
														__html: order?.resultUnit ? order.resultUnit : '--',
													}}
													className="py-0 px-1 cursor-pointer"
												/>
											</div>
										)}
									</td>{' '}
									<td className="p-1 border relative align-top">
										<div className="relative">
											{deadlineDropdownVisible === order.id ? (
												<div className="relative">
													<DatePicker
														selected={selectedDate}
														onChange={(date) => handleDateSelect(order.id, date)}
														onFocus={() => handleDeadlineFocus(order.id, order.deadline)}
														onChangeRaw={(e) => handleDateInputChange(order.id, e)}
														onBlur={() => handleDeadlineBlur(order.id)}
														onKeyDown={(e) => handleDeadlineKeyDown(e, order.id)}
														dateFormat="dd/MM/yyyy"
														className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
														calendarClassName="text-black"
														placeholderText="Chọn hạn trả"
														autoFocus
														shouldCloseOnSelect={true}
														popperContainer={({ children }) => createPortal(children, document.body)}
														popperProps={{
															positionFixed: true,
														}}
														popperModifiers={{
															preventOverflow: {
																enabled: true,
																escapeWithReference: true,
																boundariesElement: 'viewport',
															},
															hide: {
																enabled: false,
															},
															zIndex: {
																enabled: true,
																value: 99999,
															},
														}}
													/>
												</div>
											) : (
												<button
													className={`w-full dropdown-button font-normal ${
														deadlineDropdownVisible === order.id && 'border border-slate-200'
													} p-1 rounded bg-white text-left h-fit`}
													onClick={(event) => toggleDeadlineDropdown(order.id, event)}
												>
													{formatDate(order.deadline) || 'Chọn hạn trả'}
												</button>
											)}
										</div>
									</td>{' '}
									<td className="p-1 border relative align-top">
										<select
											className={`w-full bg-white border rounded p-1 text-left ${
												!order.scientificField || order.scientificField.trim() === '' ? 'border-yellow-400' : ''
											}`}
											value={order.scientificField || ''}
											onChange={(e) => handleFieldColumnChange(order.id, e.target.value)}
										>
											<option value="">-- Chọn --</option>
											{scientificFields.map((field) => (
												<option key={field} value={field}>
													{field}
												</option>
											))}
										</select>
									</td>{' '}
									<td className="p-1 border relative align-top">
										<div className="relative">
											<button
												className={`w-full dropdown-button font-normal ${
													technicianDropdownVisible === order.id && 'border border-slate-200'
												} p-1 rounded bg-white text-left h-fit`}
												onClick={(event) => toggleTechnicianDropdown(order.id, event)}
												title={
													order.technician?.identityName
														? `Người thực hiện: ${order.technician.identityName}`
														: 'Chọn người thực hiện'
												}
											>
												{order.technician?.identityName || 'Chọn KTV'}
											</button>
										</div>

										{technicianDropdownVisible === order.id &&
											createPortal(
												<div
													className="fixed bg-white border rounded shadow-lg z-[99] p-4 technician-dropdown"
													style={{
														top: dropdownPosition.top + 'px',
														left: dropdownPosition.left + 'px',
														position: 'absolute',
														minWidth: '400px',
														maxWidth: Math.min(600, window.innerWidth - 40) + 'px',
														width: 'max-content',
													}}
												>
													<div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
														{technicians.map((group) => {
															const primaryTechnician = group.technicians?.[0];
															if (!primaryTechnician) return null;

															return (
																<div
																	key={group.alias}
																	className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 hover:border-primary transition-all duration-200 min-w-[100px] text-center"
																	onClick={() => handleTechnicianChange(order.id, primaryTechnician.technicianId)}
																	onMouseEnter={(e) => {
																		if (group.technicians && group.technicians.length > 1) {
																			const rect = e.currentTarget.getBoundingClientRect();
																			setIndividualDropdownRect({
																				top: rect.top,
																				left: rect.left,
																				width: rect.width,
																				height: rect.height,
																			});
																			setHoveredIndividualGroup(group.alias);
																			setCurrentAnalysisId(order.id);
																		}
																	}}
																>
																	<p className="font-bold text-primary text-sm mb-1">
																		{group.alias}: {group.groupName}
																	</p>
																	<p className="text-xs text-gray-600 leading-tight">
																		{primaryTechnician.identityName}
																	</p>
																</div>
															);
														})}
													</div>
												</div>,
												document.body,
											)}
									</td>
									<td className="p-1 border relative align-top">
										<div
											className="flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
											onClick={(e) => handleNoteClick(order, e)}
											onMouseEnter={(e) => {
												if (order.note) {
													showTooltip(e, order.note, 'left');
												}
											}}
											onMouseLeave={hideTooltip}
											title={order.note ? 'Click để xem/thêm ghi chú' : 'Click để thêm ghi chú'}
										>
											{order.note ? (
												<span className="text-2xl">📝</span>
											) : (
												<span className="text-2xl text-gray-400">📋</span>
											)}
										</div>
									</td>
									<td
										className="pt-[5px] pb-0 border align-top text-center cursor-pointer"
										onClick={() => handleAnalyteSelect(order.id)}
									>
										<input
											type="checkbox"
											checked={selectedAnalytes.includes(order.id)}
											onChange={() => handleAnalyteSelect(order.id)}
											className="w-4 h-4 mt-2 pointer-events-none"
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
			{/* Portal for individual technician hover dropdown */}
			{hoveredIndividualGroup &&
				individualDropdownRect &&
				currentAnalysisId &&
				createPortal(
					<div
						className="fixed z-[9999]"
						style={{
							top: `${individualDropdownRect.top}px`,
							left: `${individualDropdownRect.left - 200}px`,
							width: '200px',
							height: `${individualDropdownRect.height}px`,
						}}
						onMouseLeave={() => {
							setHoveredIndividualGroup(null);
							setIndividualDropdownRect(null);
							setCurrentAnalysisId(null);
						}}
					>
						{/* Bridge area - invisible but hoverable to prevent gap issues */}
						<div className="absolute right-0 top-0 w-12 h-full bg-transparent"></div>

						{/* Actual dropdown */}
						<div className="absolute left-0 top-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-48">
							<p className="text-xs font-medium text-gray-500 mb-2">Tất cả thành viên:</p>
							{technicians
								.find((g) => g.alias === hoveredIndividualGroup)
								?.technicians?.map((tech) => (
									<div
										key={tech.technicianId}
										className="p-2 hover:bg-gray-100 rounded cursor-pointer text-left"
										onClick={(e) => {
											e.stopPropagation();
											handleTechnicianChange(currentAnalysisId, tech.technicianId);
											setHoveredIndividualGroup(null);
											setIndividualDropdownRect(null);
											setCurrentAnalysisId(null);
										}}
									>
										<p className="text-sm font-medium">{tech.identityName}</p>
										<p className="text-xs text-gray-500">{tech.technicianAlias}</p>
									</div>
								))}
						</div>
					</div>,
					document.body,
				)}
			{isTransferMultipleVisible && renderBulkTransferForm()}
			{isDeleteConfirmVisible &&
				renderDeleteConfirm(
					deleteType === 'sample'
						? 'Bạn có chắc chắn muốn xóa mẫu này?'
						: deleteType === 'multiple'
						? `Bạn có chắc chắn muốn xóa ${selectedAnalytes.length} chỉ tiêu đã chọn?`
						: 'Bạn có chắc chắn muốn xóa chỉ tiêu này?',
					deleteType === 'sample'
						? handleDeleteSampleConfirmAction
						: deleteType === 'multiple'
						? handleDeleteMultipleConfirmAction
						: handleDeleteAnalysisConfirmAction,
				)}
			{isBulkDeadlineVisible && renderBulkDeadlinePicker()}
			{/* Tooltip Portal */}
			{tooltip.visible &&
				createPortal(
					<div
						className={`custom-tooltip ${tooltip.visible ? 'visible' : ''} ${tooltip.position}`}
						style={{
							left: `${tooltip.x}px`,
							top: `${tooltip.y}px`,
							whiteSpace: 'pre-wrap',
						}}
					>
						{tooltip.content}
					</div>,
					document.body,
				)}
			{/* Modal Ghi chú */}
			{showNoteModal && selectedAnalysisForNote && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
						<div className="px-6 py-4 border-b border-gray-200">
							<h3 className="text-lg font-semibold text-blue-600">Ghi chú</h3>
							<p className="text-sm text-gray-600 mt-1">
								Mẫu: {selectedAnalysisForNote.sampleId} - Chỉ tiêu: {selectedAnalysisForNote.parameterName}
							</p>
						</div>

						<div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
							{/* Ghi chú cũ - chỉ xem */}
							{selectedAnalysisForNote.note && (
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú hiện tại:</label>
									<div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">
										{selectedAnalysisForNote.note}
									</div>
								</div>
							)}

							{/* Thêm ghi chú mới */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{selectedAnalysisForNote.note ? 'Thêm ghi chú mới:' : 'Ghi chú:'}
								</label>
								<textarea
									value={newNoteText}
									onChange={(e) => setNewNoteText(e.target.value)}
									placeholder="Nhập nội dung ghi chú..."
									className="w-full bg-white border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									rows={4}
								/>
							</div>
						</div>

						<div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
							<button
								onClick={() => {
									setShowNoteModal(false);
									setSelectedAnalysisForNote(null);
									setNewNoteText('');
								}}
								className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
								disabled={isUpdatingNote}
							>
								Hủy
							</button>
							<button
								onClick={handleUpdateNote}
								disabled={isUpdatingNote || !newNoteText.trim()}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
							>
								{isUpdatingNote ? (
									<>
										<span className="mr-2">Đang cập nhật...</span>
										<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
												fill="none"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
									</>
								) : (
									'Cập nhật'
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default SampleInfor;
