import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { apiGet, apiPost, apiPut, apiGetBlob } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2';
import TemplateExperimentReport from '../components/lab/TemplateExperimentReport';
import ParameterInformation from '../components/sample/ParameterInformation';
import { MdEditDocument } from 'react-icons/md';
import { GlobalContext } from '../contexts/GlobalContext';

const HandoverSampleDash = () => {
	const { currentUser, getIdenByUid } = useContext(GlobalContext);
	const [startDateTime, setStartDateTime] = useState('');
	const [endDateTime, setEndDateTime] = useState('');
	const [view, setView] = useState('sample'); // 'sample', 'analysis', or 'parameter'
	const [columns, setColumns] = useState([
		'sampleId',
		'handoverAt',
		'sampleName',
		'sampleDescription',
		'sampleVolume',
		'id',
		'parameterName',
		'matrix',
		'protocolCode',
		'technicianId',
		'docId',
		'deadline',
		'templates',
	]);
	const [columnSort, setColumnSort] = useState('handoverAt');
	const [sortBy, setSortBy] = useState('ASC');
	const [itemsPerPage, setItemsPerPage] = useState(30);
	const [page, setPage] = useState(1);
	const [data, setData] = useState(null);
	const [analysisData, setAnalysisData] = useState(null);
	const [parameterData, setParameterData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [expandedSamples, setExpandedSamples] = useState(new Set());
	const [expandedParameters, setExpandedParameters] = useState(new Set());
	const [selectedAnalyses, setSelectedAnalyses] = useState(new Set());
	const [identityNames, setIdentityNames] = useState({});
	const [showOnlyWithTemplates, setShowOnlyWithTemplates] = useState(false);

	// Search state
	const [searchTerm, setSearchTerm] = useState('');
	const [technicians, setTechnicians] = useState([]);
	const [selectedTechnicians, setSelectedTechnicians] = useState([]);
	const [showTechnicianFilter, setShowTechnicianFilter] = useState(false);
	const [loadingTechnicians, setLoadingTechnicians] = useState(false);
	const [showTemplateModal, setShowTemplateModal] = useState(false);
	const [templateModalProps, setTemplateModalProps] = useState({
		templateId: null,
		action: 'create',
	});
	const [showActionDropdown, setShowActionDropdown] = useState(false);
	const [showParameterInfoModal, setShowParameterInfoModal] = useState(false);
	const [parameterInfoProps, setParameterInfoProps] = useState({
		parameterName: '',
		protocolCode: '',
		matrix: '',
	});

	// Handle template view
	const handleTemplateView = (templateId) => {
		setTemplateModalProps({
			templateId,
			action: 'view',
		});
		setShowTemplateModal(true);
	};

	// Handle template edit
	const handleTemplateEdit = (templateId) => {
		setTemplateModalProps({
			templateId,
			action: 'edit',
		});
		setShowTemplateModal(true);
	};

	// Handle template create
	const handleTemplateCreate = (parameterName, protocolCode) => {
		const parameters = parameterName && protocolCode ? [{ parameterName, protocolCode }] : [];

		setTemplateModalProps({
			templateId: null,
			action: 'create',
			parameters: parameters,
		});
		setShowTemplateModal(true);
	};

	// Helper function to get identity name from technicianId
	const getIdentityName = (technicianId) => {
		if (!technicianId || identityNames[technicianId]) {
			return identityNames[technicianId] || technicianId || 'N/A';
		}
		return technicianId || 'N/A';
	};

	// Fetch identity name by UID
	const fetchIdentityName = async (technicianId) => {
		if (!technicianId || identityNames[technicianId]) {
			return identityNames[technicianId] || technicianId;
		}

		try {
			const identity = await getIdenByUid(technicianId);
			if (identity && identity.identity_name) {
				setIdentityNames((prev) => ({
					...prev,
					[technicianId]: identity.identity_name,
				}));
				return identity.identity_name;
			}
		} catch (error) {
			console.error('Error fetching identity:', error);
		}

		return technicianId;
	};

	// Helper function to get cookie value
	const getCookieValue = (name) => {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(';').shift();
		return null;
	};

	// Fetch technician list from API
	const fetchTechnicians = async () => {
		setLoadingTechnicians(true);
		try {
			const response = await apiGet('https://pink.irdop.org/db/get/techinician');
			const technicianList = response.data || response; // Adjust based on actual response structure
			if (response && Array.isArray(technicianList)) {
				// Filter unique identityUID and sort: non-EX names first, then EX names
				const uniqueTechnicians = technicianList.reduce((acc, technician) => {
					const existing = acc.find((t) => t.identity_uid === technician.identity_uid);
					if (!existing) {
						acc.push(technician);
					}
					return acc;
				}, []);

				// Sort: identityName without "EX" first, then with "EX"
				const sortedTechnicians = uniqueTechnicians.sort((a, b) => {
					const aHasEX = (a.identity_name || '').toUpperCase().includes('EX');
					const bHasEX = (b.identity_name || '').toUpperCase().includes('EX');

					if (aHasEX && !bHasEX) return 1; // a has EX, b doesn't -> a goes after
					if (!aHasEX && bHasEX) return -1; // a doesn't have EX, b does -> a goes before
					return 0; // both have or don't have EX -> maintain order
				});

				setTechnicians(sortedTechnicians);

				// Check if current user's identityUID matches any technician
				const currentIdentityUID = getCookieValue('identityUID');
				if (currentIdentityUID) {
					const matchingTechnician = sortedTechnicians.find((tech) => tech.identity_uid === currentIdentityUID);
					if (matchingTechnician) {
						// Auto-select the matching technician
						setSelectedTechnicians([matchingTechnician.identity_uid]);
					}
				}
			} else {
				console.error('Invalid technician data format');
				setTechnicians([]);
			}
		} catch (error) {
			console.error('Error fetching technicians:', error);
			setTechnicians([]);
		} finally {
			setLoadingTechnicians(false);
		}
	};

	// Handle technician selection
	const handleTechnicianSelection = (technicianId, isSelected) => {
		if (isSelected) {
			setSelectedTechnicians((prev) => [...prev, technicianId]);
		} else {
			setSelectedTechnicians((prev) => prev.filter((id) => id !== technicianId));
		}
	};

	// Handle technician filter confirmation
	const handleTechnicianFilterConfirm = () => {
		setShowTechnicianFilter(false);
		// Data will be refetched automatically due to useEffect dependency
	};

	// Handle technician filter reset
	const handleTechnicianFilterReset = () => {
		setSelectedTechnicians([]);
		setShowTechnicianFilter(false);
	};

	// Handle search input
	const handleSearchKeyPress = (e) => {
		if (e.key === 'Enter') {
			setPage(1); // Reset to first page when searching
			if (startDateTime && endDateTime) {
				if (view === 'sample') {
					fetchData();
				} else if (view === 'analysis') {
					fetchAnalysisData();
				}
			}
		}
	};

	// Handle search input change
	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
		// Don't call API here, wait for Enter key press
	};

	// Set default dates and times on mount
	useEffect(() => {
		const now = new Date();
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();

		let startDateTimeStr, endDateTimeStr;

		// Check if current time is before 12:30 AM
		const isBefore1030AM = currentHour < 12 || (currentHour === 12 && currentMinute < 30);

		if (isBefore1030AM) {
			// From 4:00 PM yesterday to 10:30 AM today
			const yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = yesterday.toISOString().split('T')[0];
			const todayStr = now.toISOString().split('T')[0];

			startDateTimeStr = `${yesterdayStr}T16:00`;
			endDateTimeStr = `${todayStr}T10:30`;
		} else {
			// From 10:30 AM to 4:00 PM today
			const todayStr = now.toISOString().split('T')[0];
			startDateTimeStr = `${todayStr}T10:30`;
			endDateTimeStr = `${todayStr}T16:00`;
		}

		setStartDateTime(startDateTimeStr);
		setEndDateTime(endDateTimeStr);

		// Set view from query params
		const urlParams = new URLSearchParams(window.location.search);
		const viewParam = urlParams.get('view');
		if (viewParam && ['sample', 'analysis', 'parameter'].includes(viewParam)) {
			setView(viewParam);
		}

		// Fetch technicians list
		fetchTechnicians();
	}, []);

	// Update itemsPerPage based on view
	useEffect(() => {
		setItemsPerPage(view === 'sample' ? 30 : 100);
		setPage(1); // Reset to first page when switching views
	}, [view]);

	// Auto fetch data on component mount and when dependencies change
	useEffect(() => {
		if (view === 'parameter') {
			// Fetch parameter data immediately when switching to parameter view
			fetchParameterData();
		} else if (startDateTime && endDateTime) {
			if (view === 'sample') {
				fetchData();
			} else if (view === 'analysis') {
				fetchAnalysisData();
			}
		}
	}, [startDateTime, endDateTime, columnSort, sortBy, itemsPerPage, page, view, selectedTechnicians]);

	// Fetch identity names when data changes
	useEffect(() => {
		const fetchAllIdentityNames = async () => {
			const technicianIds = new Set();

			// Collect technicianIds from sample data
			if (data && data.result) {
				data.result.forEach((sample) => {
					if (sample.analyses) {
						sample.analyses.forEach((analysis) => {
							if (analysis.technicianId && analysis.technicianId.trim() !== '') {
								technicianIds.add(analysis.technicianId);
							}
						});
					}
				});
			}

			// Collect technicianIds from analysis data
			if (analysisData && analysisData.result) {
				analysisData.result.forEach((parameter) => {
					if (parameter.analyses) {
						parameter.analyses.forEach((analysis) => {
							if (analysis.technicianId && analysis.technicianId.trim() !== '') {
								technicianIds.add(analysis.technicianId);
							}
						});
					}
				});
			}

			// Fetch identity names for all collected technicianIds
			const fetchPromises = Array.from(technicianIds).map(async (technicianId) => {
				if (!identityNames[technicianId]) {
					await fetchIdentityName(technicianId);
				}
			});

			await Promise.all(fetchPromises);
		};

		if ((data || analysisData) && !loading) {
			fetchAllIdentityNames();
		}
	}, [data, analysisData, loading]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showActionDropdown && !event.target.closest('.fixed.top-4.right-4')) {
				setShowActionDropdown(false);
			}
			if (
				showTechnicianFilter &&
				!event.target.closest('.technician-dropdown-container') &&
				!event.target.closest('.technician-filter-button')
			) {
				setShowTechnicianFilter(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showActionDropdown, showTechnicianFilter]);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			// Convert datetime-local to date and time
			const startDate = startDateTime.split('T')[0];
			const startTime = startDateTime.split('T')[1];
			const endDate = endDateTime.split('T')[0];
			const endTime = endDateTime.split('T')[1];

			const requestBody = {
				startDate: `${startDate} ${startTime}`,
				endDate: `${endDate} ${endTime}`,
				columns,
				columnSort,
				sortBy,
				itemsPerPage,
				page,
				...(selectedTechnicians.length > 0 && { technicianId: selectedTechnicians }),
				...(searchTerm && { searchTerm }),
			};
			const response = await apiPost('https://black.irdop.org/v1/sample/handover_at/get', requestBody);
			if (response.status === 200) {
				setData(response.data);
			} else {
				const errorMessage = response.data.message || 'Failed to fetch data';
				setError(errorMessage);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: errorMessage,
				});
			}
		} catch (err) {
			const errorMessage = 'An error occurred while fetching data';
			setError(errorMessage);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: errorMessage,
			});
		} finally {
			setLoading(false);
		}
	};

	const fetchAnalysisData = async () => {
		setLoading(true);
		setError(null);
		try {
			// Convert datetime-local to date and time
			const startDate = startDateTime.split('T')[0];
			const startTime = startDateTime.split('T')[1];
			const endDate = endDateTime.split('T')[0];
			const endTime = endDateTime.split('T')[1];

			const requestBody = {
				startDate: `${startDate} ${startTime}`,
				endDate: `${endDate} ${endTime}`,
				columns: [
					'id',
					'parameterName',
					'protocolCode',
					'technicianId',
					'docId',
					'matrix',
					'sampleId',
					'deadline',
					'templates',
				],
				columnSort,
				sortBy,
				itemsPerPage,
				page,
				...(selectedTechnicians.length > 0 && { technicianId: selectedTechnicians }),
				...(searchTerm && { searchTerm }),
			};
			const response = await apiPost('https://black.irdop.org/v1/parameter/handover_at/get', requestBody);
			if (response.status === 200) {
				setAnalysisData(response.data);
			} else {
				const errorMessage = response.data.message || 'Failed to fetch analysis data';
				setError(errorMessage);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: errorMessage,
				});
			}
		} catch (err) {
			const errorMessage = 'An error occurred while fetching analysis data';
			setError(errorMessage);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: errorMessage,
			});
		} finally {
			setLoading(false);
		}
	};

	// Fetch parameter data
	const fetchParameterData = async () => {
		setLoading(true);
		setError(null);
		try {
			const requestBody = {};
			const response = await apiPost('https://black.irdop.org/v1/parameter/frequently/get', requestBody);
			if (response.status === 200) {
				setParameterData(response.data);
			} else {
				const errorMessage = response.data.message || 'Failed to fetch parameter data';
				setError(errorMessage);
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: errorMessage,
				});
			}
		} catch (err) {
			const errorMessage = 'An error occurred while fetching parameter data';
			setError(errorMessage);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: errorMessage,
			});
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		fetchData();
	};

	const handlePageChange = (newPage) => {
		setPage(newPage);
		// Optionally fetch data immediately on page change
		// fetchData();
	};

	// Handle view change and update query params
	const handleViewChange = (newView) => {
		setView(newView);
		const url = new URL(window.location);
		url.searchParams.set('view', newView);
		window.history.pushState({}, '', url);

		// Fetch data based on view
		if (newView === 'parameter') {
			fetchParameterData();
		} else if (startDateTime && endDateTime) {
			if (newView === 'sample') {
				fetchData();
			} else if (newView === 'analysis') {
				fetchAnalysisData();
			}
		}
	};

	// Format date to HH:MM DD/MM/YYYY (GMT+7)
	const formatDate = (dateString) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		// Don't add extra hours since the date is already in the correct timezone

		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();

		return `${hours}:${minutes} ${day}/${month}/${year}`;
	};

	// Format date to DD/MM/YYYY only
	const formatDateOnly = (dateString) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	};

	// Toggle sample expansion
	const toggleSampleExpansion = (sampleId) => {
		const newExpanded = new Set(expandedSamples);
		if (newExpanded.has(sampleId)) {
			newExpanded.delete(sampleId);
		} else {
			newExpanded.add(sampleId);
		}
		setExpandedSamples(newExpanded);
	};

	// Toggle parameter expansion
	const toggleParameterExpansion = (parameterKey) => {
		const newExpanded = new Set(expandedParameters);
		if (newExpanded.has(parameterKey)) {
			newExpanded.delete(parameterKey);
		} else {
			newExpanded.add(parameterKey);
		}
		setExpandedParameters(newExpanded);
	};

	// Handle analysis selection
	const toggleAnalysisSelection = (analysisId) => {
		// Find the analysis and check if its parameter has templates
		let hasTemplates = false;
		analysisData.result.forEach((parameter) => {
			parameter.analyses.forEach((analysis) => {
				if (analysis.id === analysisId) {
					hasTemplates = parameter.templates && parameter.templates.length > 0;
				}
			});
		});

		if (!hasTemplates) {
			alert('Chỉ được chọn những phép thử đã có mẫu nhật ký');
			return;
		}

		const newSelected = new Set(selectedAnalyses);
		if (newSelected.has(analysisId)) {
			newSelected.delete(analysisId);
		} else {
			newSelected.add(analysisId);
		}
		setSelectedAnalyses(newSelected);
	};

	// Handle select all/deselect all for a parameter group
	const toggleSelectAllInParameter = (analyses, parameter) => {
		// Only allow selection if parameter has templates
		if (!parameter.templates || parameter.templates.length === 0) {
			alert('Chỉ được chọn những phép thử đã có mẫu nhật ký');
			return;
		}

		const analysisIds = analyses.map((analysis) => analysis.id).filter((id) => id);
		const allSelected = analysisIds.every((id) => selectedAnalyses.has(id));
		const newSelected = new Set(selectedAnalyses);

		if (allSelected) {
			// Deselect all in this group
			analysisIds.forEach((id) => newSelected.delete(id));
		} else {
			// Select all in this group
			analysisIds.forEach((id) => newSelected.add(id));
		}
		setSelectedAnalyses(newSelected);
	};

	// Handle close template modal
	const handleCloseTemplateModal = () => {
		setShowTemplateModal(false);
		setTemplateModalProps({
			templateId: null,
			action: 'create',
			parameters: [],
		});

		// Refresh data after template operations
		if (view === 'analysis') {
			fetchAnalysisData();
		} else {
			fetchData();
		}
	};

	// Handle parameter info modal
	const handleParameterInfoClick = (parameterName, protocolCode, matrix) => {
		setParameterInfoProps({
			parameterName,
			protocolCode,
			matrix,
		});
		setShowParameterInfoModal(true);
	};

	const handleCloseParameterInfoModal = () => {
		setShowParameterInfoModal(false);
		setParameterInfoProps({
			parameterName: '',
			protocolCode: '',
			matrix: '',
		});
	};

	// Handle action dropdown
	const handleActionClick = () => {
		setShowActionDropdown(!showActionDropdown);
	}; // Handle create log from selected analyses
	const handleCreateExperimentLog = () => {
		if (selectedAnalyses.size === 0) {
			alert('Vui lòng chọn ít nhất một phép thử để tạo nhật ký');
			return;
		}

		// Get selected analysis details and group by templateId
		const templateGroups = {};
		analysisData.result.forEach((parameter) => {
			parameter.analyses.forEach((analysis) => {
				if (selectedAnalyses.has(analysis.id)) {
					// Get all templates for this parameter
					if (parameter.templates && parameter.templates.length > 0) {
						parameter.templates.forEach((template) => {
							if (!templateGroups[template.id]) {
								templateGroups[template.id] = [];
							}
							templateGroups[template.id].push(analysis.id);
						});
					}
				}
			});
		});

		// Open a tab for each templateId with its associated analysisIds with delay
		const templateIds = Object.keys(templateGroups);
		templateIds.forEach((templateId, index) => {
			const analysisIds = templateGroups[templateId].join(',');
			const url = `/editor?templateId=${templateId}&classifierCode=NHAT_KY_THU_NGHIEM&analysisIds=${analysisIds}`;

			// Add 0.4 second delay between each tab opening
			setTimeout(() => {
				window.open(url, '_blank');
			}, index * 400);
		});
	};

	// Format time to AM/PM format
	const formatTimeToAMPM = (timeString) => {
		if (!timeString) return '';
		const [hours, minutes] = timeString.split(':');
		const hour = parseInt(hours, 10);
		const ampm = hour >= 12 ? 'PM' : 'AM';
		const displayHour = hour % 12 || 12;
		return `${displayHour}:${minutes} ${ampm}`;
	};

	// Pagination component for reuse
	const PaginationControls = ({ showDateFilter = true }) => {
		const currentData = view === 'sample' ? data : analysisData;
		const currentItemsPerPage = currentData?.pagination?.itemsPerPage || itemsPerPage;

		return (
			<div className="flex justify-between items-center mb-4">
				<div className="flex items-center gap-4">
					<div>
						<label className="text-sm font-medium mr-2">Số dòng hiển thị:</label>
						<select
							value={currentItemsPerPage}
							onChange={(e) => setItemsPerPage(Number(e.target.value))}
							className="border border-gray-300 rounded-md p-1 bg-white"
						>
							{view === 'sample' ? (
								<>
									<option value={30}>30</option>
									<option value={50}>50</option>
									<option value={100}>100</option>
								</>
							) : (
								<>
									<option value={100}>100</option>
									<option value={200}>200</option>
									<option value={500}>500</option>
								</>
							)}
						</select>
					</div>
					{currentData && (
						<span className="text-sm text-gray-600">
							Hiển thị 1-{Math.min(currentItemsPerPage, currentData.pagination.totalItems)} /{' '}
							{currentData.pagination.totalItems} mục
						</span>
					)}
				</div>

				<div className="flex items-center gap-4">
					{/* Date filters - only show if showDateFilter is true */}
					{showDateFilter && (
						<div className="flex items-center gap-1">
							<div className="flex flex-col items-center gap-1">
								<input
									type="datetime-local"
									value={startDateTime}
									onChange={(e) => setStartDateTime(e.target.value)}
									className="border border-gray-300 rounded-md px-1 py-1 text-xs bg-white w-32"
								/>
							</div>
							<span className="text-xs">-</span>
							<div className="flex flex-col items-center gap-1">
								<input
									type="datetime-local"
									value={endDateTime}
									onChange={(e) => setEndDateTime(e.target.value)}
									className="border border-gray-300 rounded-md px-1 py-1 text-xs bg-white w-32"
								/>
							</div>
						</div>
					)}

					{currentData && (
						<>
							<span className="text-sm text-gray-600">
								Trang {currentData.pagination.currentPage} / {currentData.pagination.totalPages}
							</span>
							<div className="flex gap-2">
								<button
									onClick={() => handlePageChange(page - 1)}
									disabled={page <= 1}
									className="bg-gray-300 text-gray-700 px-3 py-1 rounded-md disabled:opacity-50 text-sm"
								>
									← Trước
								</button>
								<button
									onClick={() => handlePageChange(page + 1)}
									disabled={page >= currentData.pagination.totalPages}
									className="bg-blue-500 text-white px-3 py-1 rounded-md disabled:opacity-50 text-sm"
								>
									Tiếp →
								</button>
							</div>
						</>
					)}
				</div>

				{/* Fixed Action Button with Dropdown */}
				{view === 'analysis' && analysisData && (
					<div className="fixed top-4 right-4 z-50">
						<div className="relative">
							<button
								onClick={handleActionClick}
								className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-xl font-bold transition-colors duration-200"
							>
								+
							</button>

							{/* Dropdown Menu */}
							{showActionDropdown && (
								<div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
									<div className="py-1">
										<button
											onClick={() => {
												handleTemplateCreate('', '');
												setShowActionDropdown(false);
											}}
											className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
										>
											<svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
											</svg>
											Tạo mẫu nhật ký mới
										</button>

										{selectedAnalyses.length > 0 && (
											<button
												onClick={() => {
													setSelectedAnalyses([]);
													setShowActionDropdown(false);
												}}
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
											>
												<svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
												</svg>
												Hủy chọn
											</button>
										)}

										<button
											onClick={() => {
												handleCreateExperimentLog();
												setShowActionDropdown(false);
											}}
											className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
										>
											<svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
											Tạo nhật ký thử nghiệm
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		);
	};
	return (
		<div className="w-full p-4 overflow-auto">
			<div className="flex justify-between items-center mb-6 min-w-[1100px]">
				<div className="flex items-center gap-3">
					<h1 className="text-3xl font-bold text-primary">Mẫu thử và phép thử bàn giao</h1>
					{loading && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>}
				</div>

				{/* Search Bar */}
				<div className="relative flex items-center">
					<input
						type="text"
						value={searchTerm}
						onChange={handleSearchChange}
						onKeyPress={handleSearchKeyPress}
						placeholder="Tìm kiếm..."
						className="px-3 py-2 h-8 box-border bg-white text-sm border border-gray-300 border-r-0 rounded-md rounded-e-none outline-none focus:outline-none w-64"
					/>
					<button
						onClick={() => {
							if (searchTerm) {
								setSearchTerm('');
								setPage(1);
							}
						}}
						className="h-8 box-border text-gray-400 hover:text-gray-600 transition-colors rounded-s-none border border-gray-300 focus:outline-none"
						title={searchTerm ? 'Xóa tìm kiếm' : 'Tìm kiếm'}
					>
						{searchTerm ? (
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						) : (
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						)}
					</button>
					{/* Search Results Info */}
					{searchTerm &&
						((view === 'sample' && data) ||
							(view === 'analysis' && analysisData) ||
							(view === 'parameter' && parameterData)) && (
							<div className="absolute -bottom-5 left-3 text-sm text-gray-600 ">
								Đang hiển thị{' '}
								{view === 'sample'
									? data.pagination.totalItems
									: view === 'analysis'
									? analysisData.pagination.totalItems
									: parameterData && parameterData.pagination
									? parameterData.pagination.totalItems
									: 0}{' '}
								kết quả.
							</div>
						)}
				</div>
			</div>

			{/* Control Bar */}
			<div className="flex justify-between items-center mb-4">
				{/* Left side - View buttons */}
				<div className="flex items-center gap-2">
					<button
						onClick={() => handleViewChange('sample')}
						className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
							view === 'sample' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}
					>
						Mẫu thử
					</button>
					<button
						onClick={() => handleViewChange('analysis')}
						className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
							view === 'analysis' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}
					>
						Phép thử
					</button>
					<button
						onClick={() => handleViewChange('parameter')}
						className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
							view === 'parameter' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}
					>
						Chỉ tiêu thường xuyên
					</button>
				</div>

				{/* Right side - Date/Time picker and Technician Filter */}
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<div className="flex flex-col items-center gap-1">
							<input
								type="datetime-local"
								value={startDateTime}
								onChange={(e) => setStartDateTime(e.target.value)}
								className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white w-40"
							/>
						</div>
						<span className="text-sm">-</span>
						<div className="flex flex-col items-center gap-1">
							<input
								type="datetime-local"
								value={endDateTime}
								onChange={(e) => setEndDateTime(e.target.value)}
								className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white w-40"
							/>
						</div>
					</div>

					{/* Technician Filter Button */}
					<div className="relative">
						<button
							onClick={() => setShowTechnicianFilter(!showTechnicianFilter)}
							className={`technician-filter-button px-3 py-1 rounded-md text-xs font-medium transition-colors ${
								selectedTechnicians.length > 0
									? 'bg-blue-500 text-white hover:bg-blue-600'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							}`}
							title={
								selectedTechnicians.length > 0
									? `Đã chọn ${selectedTechnicians.length} KNV`
									: 'Lọc theo Kiểm nghiệm viên'
							}
						>
							Kiểm nghiệm viên {selectedTechnicians.length > 0 && `(${selectedTechnicians.length})`}
						</button>

						{/* Technician Filter Dropdown */}
						{showTechnicianFilter && (
							<div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto technician-dropdown-container">
								<div className="p-3">
									<div className="flex justify-between items-center mb-2">
										<h4 className="text-sm font-medium text-gray-900">Chọn Kiểm nghiệm viên</h4>
										{selectedTechnicians.length > 0 && (
											<button onClick={handleTechnicianFilterReset} className="text-xs text-red-600 hover:text-red-800">
												Xóa tất cả
											</button>
										)}
									</div>

									{loadingTechnicians ? (
										<div className="text-center py-4 text-sm text-gray-500">Đang tải...</div>
									) : technicians.length > 0 ? (
										<div className="space-y-1 max-h-64 overflow-y-auto">
											{technicians.map((technician) => (
												<label
													key={technician.identity_uid}
													className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
													onClick={(e) => {
														e.stopPropagation();
														const checkbox = e.currentTarget.querySelector('input[type="checkbox"]');
														if (checkbox && e.target !== checkbox) {
															checkbox.click();
														}
													}}
												>
													<input
														type="checkbox"
														checked={selectedTechnicians.includes(technician.identity_uid)}
														onChange={(e) => {
															e.stopPropagation();
															handleTechnicianSelection(technician.identity_uid, e.target.checked);
														}}
														className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
													/>
													<div className="flex-1 min-w-0">
														<div className="text-sm font-medium text-gray-900 break-words text-left">
															{technician.identity_name || '--'}
														</div>
														<div className="text-xs text-gray-500 break-words text-left">
															{technician.email || '--'}
														</div>
													</div>
												</label>
											))}
										</div>
									) : (
										<div className="text-center py-4 text-sm text-gray-500">Không có dữ liệu</div>
									)}

									<div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-200">
										<button
											onClick={() => setShowTechnicianFilter(false)}
											className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
										>
											Hủy
										</button>
										<button
											onClick={handleTechnicianFilterConfirm}
											className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
										>
											Xác nhận ({selectedTechnicians.length})
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{error && <p className="text-red-500">{error}</p>}

			{/* Show content based on view */}
			{view === 'analysis' && analysisData && (
				<div className="space-y-4 min-w-[1300px]">
					{/* Header Row for Analysis */}
					<div className="border-b-2 border-gray-300 pb-3 mb-4 px-4 text-left w-full">
						<div className="flex">
							{/* Left side - 1/3 width */}
							<div className="w-1/3 pr-4">
								<div className="text-sm font-semibold text-gray-800">Phép thử</div>
							</div>

							{/* Right side - 2/3 width */}
							<div className="w-2/3 flex items-center justify-between text-left">
								<div className="flex items-center flex-1">
									<div className="px-3 box-border text-sm font-semibold text-gray-800 min-w-[230px] max-w-[230px]">
										Người thực hiện
									</div>
									<div className="px-3 box-border text-sm font-semibold text-gray-800 min-w-[180px] max-w-[180px]">
										Mã chỉ tiêu
									</div>
									<div className="px-3 box-border text-sm font-semibold text-gray-800 min-w-[120px] max-w-[120px]">
										Mã mẫu thử
									</div>
									<div className="px-3 box-border text-sm font-semibold text-gray-800 min-w-[120px] w-full">
										Nền mẫu
									</div>
									<div className="px-3 box-border text-sm font-semibold text-gray-800 min-w-[120px] max-w-[120px]">
										Hạn trả
									</div>
									<div className="px-3 box-border flex items-center min-w-[60px] max-w-[60px]">
										<label className="flex items-center space-x-2 cursor-pointer">
											<input
												type="checkbox"
												checked={showOnlyWithTemplates}
												onChange={(e) => {
													setShowOnlyWithTemplates(e.target.checked);
												}}
												className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
											/>
										</label>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Analysis Cards Layout */}
					{analysisData.result
						.filter((parameter) => {
							// If showOnlyWithTemplates is true, only show parameters with templates
							if (showOnlyWithTemplates) {
								return parameter.templates && Array.isArray(parameter.templates) && parameter.templates.length > 0;
							}
							return true;
						})
						.map((parameter, index) => {
							const parameterKey = `${parameter.parameterName || ''}_${parameter.protocolCode || ''}`;

							return (
								<div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
									<div className="p-4 flex">
										{/* Left side - 1/3 width */}
										<div className="w-1/3 pr-4">
											<div className="text-left">
												<div
													className="text-sm font-medium text-blue-600 mb-2 cursor-pointer hover:text-blue-800 transition-colors"
													onClick={() =>
														handleParameterInfoClick(parameter.parameterName, parameter.protocolCode, parameter.matrix)
													}
												>
													{parameter.parameterName || '--'}
												</div>
												<div className="text-sm text-gray-700 mb-2">{parameter.protocolCode || '--'}</div>
												<div className="space-y-1 ">
													{parameter.templates && parameter.templates.length > 0 ? (
														parameter.templates.map((template, templateIndex) => (
															<div
																key={templateIndex}
																className="flex items-center justify-between bg-green-50 rounded px-2 py-1 border border-green-200 text-left"
															>
																<span
																	className="text-xs text-green-800 cursor-pointer hover:underline truncate flex-1"
																	onClick={(e) => {
																		e.stopPropagation();
																		handleTemplateView(template.id);
																	}}
																	title={template.templateDescription || template.templateName}
																>
																	{template.templateName || `Template ${template.templateId}`}
																</span>
																<div className="flex items-center gap-1 ml-2">
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			handleTemplateEdit(template.id);
																		}}
																		className="px-1 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
																		title="Chỉnh sửa template"
																	>
																		Sửa
																	</button>
																	{templateIndex === 0 && (
																		<button
																			onClick={() => toggleSelectAllInParameter(parameter.analyses, parameter)}
																			className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded whitespace-nowrap"
																			title="Chọn/bỏ chọn tất cả phép thử"
																		>
																			{parameter.analyses.filter((a) => a.id).every((a) => selectedAnalyses.has(a.id))
																				? 'Bỏ chọn'
																				: 'Chọn tất cả'}
																		</button>
																	)}
																</div>
															</div>
														))
													) : (
														<div className="text-xs text-yellow-600 bg-yellow-50 rounded px-2 py-1 border border-yellow-200 text-left">
															Chưa có mẫu nhật ký
														</div>
													)}
												</div>
											</div>
										</div>

										{/* Right side - 2/3 width */}
										<div className="w-2/3">
											{parameter.analyses && parameter.analyses.length > 0 ? (
												<div className="overflow-x-auto">
													<table className="w-full">
														<tbody>
															{(() => {
																// Group analyses by technicianId for merging cells
																const groupedAnalyses = [];
																let currentGroup = null;

																parameter.analyses.forEach((analysis, index) => {
																	const techId = analysis.technicianId || '--';
																	if (!currentGroup || currentGroup.technicianId !== techId) {
																		if (currentGroup) {
																			groupedAnalyses.push(currentGroup);
																		}
																		currentGroup = {
																			technicianId: techId,
																			analyses: [analysis],
																			startIndex: index,
																		};
																	} else {
																		currentGroup.analyses.push(analysis);
																	}
																});
																if (currentGroup) {
																	groupedAnalyses.push(currentGroup);
																}

																return groupedAnalyses.map((group, groupIndex) =>
																	group.analyses.map((analysis, analysisIndex) => (
																		<tr
																			key={`${group.startIndex}-${analysisIndex}`}
																			className="border-t border-b border-gray-200"
																		>
																			{/* TechnicianId - merged cell */}
																			{analysisIndex === 0 && (
																				<td
																					className="py-2 px-3 text-sm text-gray-700 text-left min-w-[230px] max-w-[230px] break-words box-border"
																					rowSpan={group.analyses.length}
																				>
																					{getIdentityName(group.technicianId)}
																				</td>
																			)}
																			<td className="py-2 px-3 text-sm font-medium text-gray-700 text-left min-w-[180px] max-w-[180px] break-words box-border">
																				{analysis.id || '--'}
																			</td>
																			<td className="py-2 px-3 text-sm text-gray-700 text-left min-w-[120px] max-w-[120px] break-words box-border">
																				{analysis.sampleId || '--'}
																			</td>
																			<td className="py-2 px-3 text-sm text-gray-700 text-left w-full min-w-[120px] break-words box-border">
																				{analysis.matrix || '--'}
																			</td>
																			<td className="py-2 px-3 text-sm text-gray-700 text-left min-w-[120px] max-w-[120px] break-words box-border">
																				{analysis.deadline ? formatDateOnly(analysis.deadline) : '--'}
																			</td>
																			<td className="py-2 px-3 text-center min-w-[60px] max-w-[60px] break-words box-border">
																				{analysis.id && (
																					<input
																						type="checkbox"
																						checked={selectedAnalyses.has(analysis.id)}
																						onChange={() => toggleAnalysisSelection(analysis.id)}
																						disabled={!parameter.templates || parameter.templates.length === 0}
																						className={`w-4 h-4 rounded ${
																							!parameter.templates || parameter.templates.length === 0
																								? 'opacity-50 cursor-not-allowed'
																								: 'text-blue-600 focus:ring-blue-500'
																						}`}
																					/>
																				)}
																			</td>
																		</tr>
																	)),
																);
															})()}
														</tbody>
													</table>
												</div>
											) : (
												<div className="text-left py-4 text-sm text-gray-500">Không có phép thử nào</div>
											)}
										</div>
									</div>
								</div>
							);
						})}

					{/* Bottom Pagination. Controls for Analysis */}
					<div className="mt-6">
						<PaginationControls showDateFilter={false} />
					</div>
				</div>
			)}

			{view === 'analysis' && !analysisData && !loading && (
				<div className="text-center py-8">
					<p className="text-gray-500">Chọn ngày để xem danh sách phép thử</p>
				</div>
			)}

			{view === 'sample' && data && (
				<div className="space-y-4 min-w-[1100px]">
					{/* Header Row */}
					<div className="border-b-2 border-gray-300 pb-3 mb-4 px-4">
						<div className="flex items-center justify-between">
							<div
								className="flex-1 grid grid-cols-7 gap-4 items-center text-left"
								style={{ gridTemplateColumns: '120px 120px 200px 1fr 80px 100px 120px' }}
							>
								<div className="text-sm font-semibold text-gray-800 min-w-[120px] max-w-[120px] box-border">Mã mẫu</div>
								<div className="text-sm font-semibold text-gray-800 min-w-[120px] max-w-[120px] box-border">
									Thời gian bàn giao
								</div>
								<div className="text-sm font-semibold text-gray-800 min-w-[200px] max-w-[200px] box-border">
									Tên mẫu
								</div>
								<div className="text-sm font-semibold text-gray-800 flex-1 box-border">Mô tả mẫu</div>
								<div className="text-sm font-semibold text-gray-800 min-w-[80px] max-w-[80px] box-border">
									Số phép thử
								</div>
								<div className="text-sm font-semibold text-gray-800 min-w-[100px] max-w-[100px] box-border">Số KNV</div>
								<div className="text-sm font-semibold text-gray-800 min-w-[120px] max-w-[120px] box-border">
									Đã in nhật ký
								</div>
							</div>
							<div className="w-5 ml-4">--</div>
						</div>
					</div>

					{/* Sample Cards Layout */}
					{data.result.map((sample) => {
						const isExpanded = expandedSamples.has(sample.id);

						// Calculate technician count (unique technicianId)
						const uniqueTechnicians = new Set();
						if (sample.analyses) {
							sample.analyses.forEach((analysis) => {
								if (analysis.technicianId && analysis.technicianId.trim() !== '') {
									uniqueTechnicians.add(analysis.technicianId);
								}
							});
						}
						const technicianCount = uniqueTechnicians.size;

						// Calculate completed logs count (docId not null/empty)
						let completedLogsCount = 0;
						if (sample.analyses) {
							completedLogsCount = sample.analyses.filter(
								(analysis) => analysis.docId && analysis.docId.trim() !== '',
							).length;
						}

						return (
							<div key={sample.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
								{/* Sample Header */}
								<div
									className="cursor-pointer hover:bg-gray-50 transition-colors p-4 border-b border-gray-100"
									onClick={() => toggleSampleExpansion(sample.id)}
								>
									<div className="flex items-center justify-between">
										<div
											className="flex-1 grid grid-cols-7 gap-4 items-center text-left"
											style={{ gridTemplateColumns: '120px 120px 200px 1fr 80px 100px 120px' }}
										>
											<div className="text-sm font-medium text-blue-600 min-w-[120px] max-w-[120px] box-border">
												{sample.sampleId || '--'}
											</div>
											<div className="text-sm text-gray-700 min-w-[120px] max-w-[120px] box-border">
												{formatDate(sample.handoverAt) || '--'}
											</div>
											<div className="text-sm text-gray-900 min-w-[200px] max-w-[200px] box-border">
												{sample.sampleName || '--'}
											</div>
											<div className="text-sm text-gray-700 flex-1 box-border">{sample.sampleDescription || '--'}</div>
											<div className="text-sm text-gray-700 min-w-[80px] max-w-[80px] box-border">
												{sample.analyses?.length || 0} phép thử
											</div>
											<div className="text-sm text-gray-700 min-w-[100px] max-w-[100px] box-border">
												{technicianCount} KNV
											</div>
											<div className="text-sm text-gray-700 min-w-[120px] max-w-[120px] box-border">
												{completedLogsCount} Đã in nhật ký
											</div>
										</div>

										{/* Expand/Collapse Icon */}
										<svg
											className={`w-5 h-5 transition-transform text-gray-400 ml-4 ${isExpanded ? 'rotate-180' : ''}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</div>
								</div>

								{/* Sample Analyses - Expanded */}
								{isExpanded && (
									<div className="bg-gray-50 p-4">
										{sample.analyses && sample.analyses.length > 0 ? (
											<div className="overflow-x-auto">
												<table className="w-full">
													<tbody>
														{(() => {
															// Group analyses by technicianId for merging cells
															const groupedAnalyses = [];
															let currentGroup = null;

															sample.analyses.forEach((analysis, index) => {
																const techId = analysis.technicianId || '--';
																if (!currentGroup || currentGroup.technicianId !== techId) {
																	if (currentGroup) {
																		groupedAnalyses.push(currentGroup);
																	}
																	currentGroup = {
																		technicianId: techId,
																		analyses: [analysis],
																		startIndex: index,
																	};
																} else {
																	currentGroup.analyses.push(analysis);
																}
															});
															if (currentGroup) {
																groupedAnalyses.push(currentGroup);
															}

															return groupedAnalyses.map((group, groupIndex) =>
																group.analyses.map((analysis, analysisIndex) => (
																	<tr
																		key={`${group.startIndex}-${analysisIndex}`}
																		className="border-t border-b border-gray-200 hover:bg-gray-50"
																	>
																		{/* TechnicianId - merged cell */}
																		{analysisIndex === 0 && (
																			<td
																				className="py-2 px-3 text-sm text-gray-700 text-left min-w-[230px] max-w-[230px] break-words box-border"
																				rowSpan={group.analyses.length}
																			>
																				{getIdentityName(group.technicianId)}
																			</td>
																		)}
																		<td className="py-2 px-3 text-sm font-medium text-gray-700 text-left min-w-[180px] max-w-[180px] break-words hover:bg-gray-50 box-border">
																			{analysis.id || '--'}
																		</td>
																		<td className="py-2 px-3 text-sm text-gray-700 text-left break-words hover:bg-gray-50 box-border">
																			{analysis.parameterName || '--'}
																		</td>
																		<td className="py-2 px-3 text-sm text-gray-700 text-left break-words hover:bg-gray-50 box-border">
																			{analysis.protocolCode || '--'}
																		</td>
																		<td className="py-2 px-3 text-sm text-gray-700 text-left break-words hover:bg-gray-50 box-border">
																			{analysis.deadline ? formatDateOnly(analysis.deadline) : '--'}
																		</td>
																		<td className="py-2 px-3 text-sm text-gray-700 text-left break-words hover:bg-gray-50 box-border">
																			{analysis.docId || '--'}
																		</td>
																	</tr>
																)),
															);
														})()}
													</tbody>
												</table>
											</div>
										) : (
											<div className="text-left py-4 text-sm text-gray-500">Không có phép thử nào</div>
										)}
									</div>
								)}
							</div>
						);
					})}

					{/* Bottom Pagination Controls */}
					<div className="mt-6">
						<PaginationControls showDateFilter={false} />
					</div>
				</div>
			)}

			{/* Parameter View */}
			{view === 'parameter' && parameterData && (
				<div className="overflow-x-auto">
					<div className="min-w-[800px]">
						<table className="w-full table-auto border-collapse border border-gray-300">
							<thead>
								<tr className="bg-gray-100">
									<th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-800">
										Tên chỉ tiêu
									</th>
									<th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-800">
										Phương pháp thử
									</th>
									<th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-800">
										Số lượng
									</th>
									<th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-800">
										Mẫu nhật ký thử nghiệm
									</th>
								</tr>
							</thead>
							<tbody>
								{parameterData.result && Array.isArray(parameterData.result) ? (
									parameterData.result.map((parameter, index) => (
										<tr key={index} className="hover:bg-gray-50">
											<td
												className="border border-gray-300 px-4 py-2 text-sm text-left text-blue-600 font-semibold cursor-pointer hover:text-blue-800"
												onClick={() => handleParameterInfoClick(parameter.parameterName, parameter.protocolCode)}
											>
												{parameter.parameterName}
											</td>
											<td
												className="border border-gray-300 px-4 py-2 text-sm text-left cursor-pointer"
												onClick={() => handleParameterInfoClick(parameter.parameterName, parameter.protocolCode)}
											>
												{parameter.protocolCode}
											</td>
											<td
												className="border border-gray-300 px-4 py-2 text-sm text-left cursor-pointer"
												onClick={() => handleParameterInfoClick(parameter.parameterName, parameter.protocolCode)}
											>
												{parameter.quantity}
											</td>
											<td className="border border-gray-300 px-4 py-2 text-sm text-left">
												{parameter.templates && Array.isArray(parameter.templates) && parameter.templates.length > 0 ? (
													<div className="space-y-1 text-left">
														{parameter.templates.map((template, templateIndex) => (
															<div key={templateIndex} className="flex items-center justify-between text-left">
																<span
																	className="text-blue-600 cursor-pointer hover:text-blue-800 text-left flex-1"
																	onClick={() =>
																		handleParameterInfoClick(parameter.parameterName, parameter.protocolCode)
																	}
																	title={template.templateDescription}
																>
																	{template.templateName}
																</span>
																<button
																	className="ml-2 px-1 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
																	onClick={() => handleTemplateEdit(template.id)}
																	title="Sửa template"
																>
																	Sửa
																</button>
															</div>
														))}
													</div>
												) : (
													<div className="text-left">
														<button
															className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
															onClick={() => handleTemplateCreate(parameter.parameterName, parameter.protocolCode)}
														>
															Tạo mới
														</button>
													</div>
												)}
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan="4" className="border border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
											Không có dữ liệu
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Parameter View - No Data */}
			{view === 'parameter' && !parameterData && !loading && (
				<div className="text-center py-8">
					<p className="text-gray-500">Không có dữ liệu chỉ tiêu thường xuyên</p>
				</div>
			)}

			{/* Template Modal */}
			{showTemplateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="w-[98vw] h-[98vh] overflow-y-auto bg-white rounded-lg shadow-lg relative">
						<TemplateExperimentReport {...templateModalProps} onClose={handleCloseTemplateModal} />
					</div>
				</div>
			)}

			{/* Parameter Information Modal */}
			{showParameterInfoModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="w-[90vw] h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg relative">
						<div className="p-4 border-b border-gray-200 flex justify-between items-center">
							<h2 className="text-lg font-semibold text-gray-900">
								Thông tin phép thử: {parameterInfoProps.parameterName}
							</h2>
							<button
								onClick={handleCloseParameterInfoModal}
								className="text-gray-400 hover:text-gray-600 transition-colors"
							>
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						<div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
							<ParameterInformation
								{...parameterInfoProps}
								onTemplateCreate={handleTemplateCreate}
								onTemplateEdit={handleTemplateEdit}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default HandoverSampleDash;
