// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate, useLocation } from 'react-router-dom';
// import {
// 	FaFlask,
// 	FaFileAlt,
// 	FaEdit,
// 	FaHistory,
// 	FaEllipsisH,
// 	FaChevronDown,
// 	FaChartBar,
// 	FaSearch,
// 	FaEye,
// 	FaClipboardList,
// 	FaCheckCircle,
// 	FaClock,
// 	FaTimes,
// 	FaExpand,
// 	FaSort,
// 	FaSortUp,
// 	FaSortDown,
// 	FaUsers,
// 	FaCog,
// 	FaExclamationTriangle,
// 	FaVial,
// 	FaMicroscope,
// 	FaQuestion,
// 	FaBars,
// 	FaQrcode,
// 	FaBoxOpen,
// 	FaCalendarAlt,
// 	FaArrowLeft,
// 	FaUser,
// } from 'react-icons/fa';
// import { apiPost } from '../contexts/helperFunctionCallAPI';
// import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
// import { Bar } from 'react-chartjs-2';
// // import ProcessingSample from '../components/lab/ProcessingSample';
// import ProcessingAnalysis from '../components/lab/ProcessingAnalysis';
// import DocumentEditor from '../components/lab/DocumentEditor';
// import LabFile from '../components/lab/LabFile';

// // Import logo images
// import logoCollapsed from '../assets/IRDOP-LOGO.png';
// import logoExpanded from '../assets/IRDOP-LOGO_FULL.png';

// // Register Chart.js components
// ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// const LabDashboard = () => {
// 	const navigate = useNavigate();
// 	const location = useLocation();

// 	// Initialize activeView from URL params immediately
// 	const getInitialView = () => {
// 		const searchParams = new URLSearchParams(location.search);
// 		const viewParam = searchParams.get('view');
// 		const validViews = ['overview', 'analysis', 'samples', 'document', 'editor'];

// 		if (viewParam && validViews.includes(viewParam)) {
// 			return viewParam;
// 		} else if (viewParam === 'file') {
// 			// Handle legacy 'file' URLs by returning 'document'
// 			return 'document';
// 		}
// 		return 'overview'; // default view - Tổng quan is active by default
// 	};

// 	// Initialize popup states from URL params
// 	const getInitialPopupStates = () => {
// 		const searchParams = new URLSearchParams(location.search);
// 		return {
// 			showSamplePopup: searchParams.get('popup') === 'sample',
// 			showAnalysisPopup: searchParams.get('popup') === 'analysis',
// 			showQRScanner: searchParams.get('popup') === 'qr-scanner',
// 			showHandoverForm: searchParams.get('popup') === 'handover-form',
// 			scannedSampleUID: searchParams.get('sample_uid') || '',
// 		};
// 	};

// 	// Tooltip state for sidebar
// 	const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

// 	// Show tooltip function
// 	const showTooltip = (content, event) => {
// 		const rect = event.currentTarget.getBoundingClientRect();
// 		setTooltip({
// 			show: true,
// 			content,
// 			x: rect.right + 10,
// 			y: rect.top + rect.height / 2,
// 		});
// 	};

// 	// Hide tooltip function
// 	const hideTooltip = () => {
// 		setTooltip({ show: false, content: '', x: 0, y: 0 });
// 	};

// 	const [timeFilter, setTimeFilter] = useState('Week');
// 	const [sortBy, setSortBy] = useState('Date');
// 	const [dropdownOpen, setDropdownOpen] = useState(false);
// 	const [activeView, setActiveView] = useState(getInitialView()); // Initialize from URL

// 	// Initialize popup states from URL
// 	const initialPopupStates = getInitialPopupStates();

// 	// Popup states
// 	const [showSamplePopup, setShowSamplePopup] = useState(initialPopupStates.showSamplePopup);
// 	const [showAnalysisPopup, setShowAnalysisPopup] = useState(initialPopupStates.showAnalysisPopup);
// 	const [showQRScanner, setShowQRScanner] = useState(initialPopupStates.showQRScanner);

// 	// QR Scanner and handover form states
// 	const [scannedSampleUID, setScannedSampleUID] = useState(initialPopupStates.scannedSampleUID);
// 	const [handoverVolume, setHandoverVolume] = useState('');
// 	const [showHandoverForm, setShowHandoverForm] = useState(initialPopupStates.showHandoverForm);
// 	const [handoverSubmitting, setHandoverSubmitting] = useState(false);

// 	// Check if any popup is open
// 	const isAnyPopupOpen = showSamplePopup || showAnalysisPopup || showQRScanner || showHandoverForm;

// 	// Hide tooltip when sidebar state changes (expand/collapse)
// 	useEffect(() => {
// 		hideTooltip();
// 	}, [isAnyPopupOpen]); // Analysis data states - using mock data only
// 	const [analysisLoading, setAnalysisLoading] = useState(false);
// 	const [analysisWidgetData] = useState({
// 		analysis: {
// 			total: 1247,
// 			chemPhys: 834,
// 			biology: 289,
// 			unknown: 124,
// 			overdue: 67,
// 			today: 156,
// 		},
// 		sample: {
// 			total: 456,
// 			fast: 23,
// 			normal: 433,
// 		},
// 		ex: {
// 			analysis: 89,
// 			sample: 34,
// 		},
// 		myWork: {
// 			handoverSample: 78,
// 			handoverToday: 12,
// 			testsAssigned: 234,
// 			testToCompleteToday: 45,
// 			overdueTest: 18,
// 		},
// 	});

// 	// Mock data for handover samples table
// 	const [handoverSamples] = useState([
// 		{
// 			id: 1,
// 			sample_uid: 'S240808-001',
// 			matrix: 'Nước',
// 			handover_info: [
// 				{
// 					handover_at: '2025-08-08T08:30:00Z',
// 					handover_by_uid: 'USER001',
// 					handover_by_name: 'Nguyễn Văn An',
// 					volume: '500ml',
// 				},
// 			],
// 		},
// 		{
// 			id: 2,
// 			sample_uid: 'S240808-002',
// 			matrix: 'Nước thải',
// 			handover_info: [
// 				{
// 					handover_at: '2025-08-08T09:15:00Z',
// 					handover_by_uid: 'USER002',
// 					handover_by_name: 'Trần Thị Bích',
// 					volume: '1L',
// 				},
// 			],
// 		},
// 		{
// 			id: 3,
// 			sample_uid: 'S240808-003',
// 			matrix: 'Đất',
// 			handover_info: [
// 				{
// 					handover_at: '2025-08-08T10:00:00Z',
// 					handover_by_uid: 'USER003',
// 					handover_by_name: 'Lê Minh Cường',
// 					volume: '200g',
// 				},
// 			],
// 		},
// 		{
// 			id: 4,
// 			sample_uid: 'S240808-004',
// 			matrix: 'Không khí',
// 			handover_info: [
// 				{
// 					handover_at: '2025-08-08T10:30:00Z',
// 					handover_by_uid: 'USER004',
// 					handover_by_name: 'Phạm Thị Dung',
// 					volume: '1 túi',
// 				},
// 			],
// 		},
// 		{
// 			id: 5,
// 			sample_uid: 'S240808-005',
// 			matrix: 'Nước',
// 			handover_info: [
// 				{
// 					handover_at: '2025-08-08T11:00:00Z',
// 					handover_by_uid: 'USER005',
// 					handover_by_name: 'Hoàng Văn Em',
// 					volume: '750ml',
// 				},
// 			],
// 		},
// 	]);

// 	// Sample handover statistics
// 	const [handoverStats] = useState({
// 		todayHandover: 15,
// 		totalPendingHandover: 28,
// 	});

// 	// Mock data for today's tasks table
// 	const [todayTasks] = useState([
// 		{
// 			id: 1,
// 			sample_uid: 'S240801-001',
// 			matrix: 'Nước',
// 			parameter_name: 'pH',
// 			protocol_source: 'TCVN 6492:2011',
// 			protocol_code: 'TCVN6492',
// 			result_value: '<span style="color: blue;">7.8</span>',
// 			result_unit: 'pH',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechA',
// 		},
// 		{
// 			id: 2,
// 			sample_uid: 'S240801-002',
// 			matrix: 'Nước',
// 			parameter_name: 'Độ đục',
// 			protocol_source: 'TCVN 6184:2008',
// 			protocol_code: 'TCVN6184',
// 			result_value: '<strong>12.5</strong>',
// 			result_unit: 'NTU',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechB',
// 		},
// 		{
// 			id: 3,
// 			sample_uid: 'S240801-003',
// 			matrix: 'Nước thải',
// 			parameter_name: 'COD',
// 			protocol_source: 'TCVN 6491:2013',
// 			protocol_code: 'TCVN6491',
// 			result_value: '<em>--</em>',
// 			result_unit: 'mg/L',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechC',
// 		},
// 		{
// 			id: 4,
// 			sample_uid: 'S240801-004',
// 			matrix: 'Nước thải',
// 			parameter_name: 'BOD5',
// 			protocol_source: 'TCVN 6001-1:2008',
// 			protocol_code: 'TCVN6001',
// 			result_value: '<span style="color: red;">--</span>',
// 			result_unit: 'mg/L',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechD',
// 		},
// 		{
// 			id: 5,
// 			sample_uid: 'S240801-005',
// 			matrix: 'Nước thải',
// 			parameter_name: 'TSS',
// 			protocol_source: 'SMEWW 2540D:2017',
// 			protocol_code: 'SMEWW2540D',
// 			result_value: '<u>45.2</u>',
// 			result_unit: 'mg/L',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechE',
// 		},
// 		{
// 			id: 6,
// 			sample_uid: 'S240801-006',
// 			matrix: 'Nước',
// 			parameter_name: 'Coliform',
// 			protocol_source: 'TCVN 6187-2:2009',
// 			protocol_code: 'TCVN6187-2',
// 			result_value: '--',
// 			result_unit: 'CFU/100mL',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechF',
// 		},
// 		{
// 			id: 7,
// 			sample_uid: 'S240801-007',
// 			matrix: 'Nước',
// 			parameter_name: 'E.coli',
// 			protocol_source: 'TCVN 6187-2:2009',
// 			protocol_code: 'TCVN6187-2',
// 			result_value: '--',
// 			result_unit: '<sup>CFU</sup>/100mL',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechG',
// 		},
// 		{
// 			id: 8,
// 			sample_uid: 'S240801-008',
// 			matrix: 'Đất',
// 			parameter_name: 'Pb',
// 			protocol_source: 'EPA 3051A:2007',
// 			protocol_code: 'EPA3051A',
// 			result_value: '--',
// 			result_unit: 'mg/kg',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechH',
// 		},
// 		{
// 			id: 9,
// 			sample_uid: 'S240801-009',
// 			matrix: 'Đất',
// 			parameter_name: 'Cd',
// 			protocol_source: 'EPA 3051A:2007',
// 			protocol_code: 'EPA3051A',
// 			result_value: '--',
// 			result_unit: 'mg/kg',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechI',
// 		},
// 		{
// 			id: 10,
// 			sample_uid: 'S240801-010',
// 			matrix: 'Đất',
// 			parameter_name: 'As',
// 			protocol_source: 'EPA 3051A:2007',
// 			protocol_code: 'EPA3051A',
// 			result_value: '--',
// 			result_unit: 'mg/kg',
// 			deadline: '2025-08-08',
// 			technician_uid: 'TechJ',
// 		},
// 	]);

// 	const [dashboardData, setDashboardData] = useState({
// 		overview: {
// 			sample: 0,
// 			analysis: 0,
// 		},
// 		sample: {
// 			fast: 0,
// 			normal: 0,
// 			pending: 0,
// 		},
// 		analysis: {
// 			today: 0,
// 			overdue: 0,
// 			week: 0,
// 		},
// 		today: {
// 			handover: {
// 				sample: 0,
// 				analysis: 0,
// 			},
// 			done: {
// 				sample: 0,
// 				analysis: 0,
// 			},
// 		},
// 		chart: {},
// 	});
// 	const [loading, setLoading] = useState(true);

// 	const currentPath = window.location.pathname;

// 	// Mock user data - you can replace this with actual user context
// 	const currentUser = {
// 		identity_name: 'Identity Name',
// 		identity_uid: 'USER001',
// 		role: {
// 			staff_admin: true,
// 			staff_technician: false,
// 			technician_alias: ['TechA', 'TechB'],
// 		},
// 	};

// 	const handleLogout = () => {
// 		// Add logout logic here
// 		console.log('Logout');
// 		setDropdownOpen(false);
// 	};

// 	const displayName = currentUser?.identity_name
// 		? currentUser.identity_name.length > 60
// 			? currentUser.identity_name.substring(0, 60) + '...'
// 			: currentUser.identity_name
// 		: 'Tài khoản';

// 	// Handle view change with URL parameters
// 	const handleViewChange = (view) => {
// 		// Close any open popups when changing views
// 		setShowSamplePopup(false);
// 		setShowAnalysisPopup(false);
// 		setShowQRScanner(false);
// 		setShowHandoverForm(false);
// 		setScannedSampleUID('');
// 		setHandoverVolume('');

// 		setActiveView(view);
// 		// Clear all params and only set the view param
// 		const searchParams = new URLSearchParams();
// 		searchParams.set('view', view);
// 		navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
// 	};

// 	// Handle navigation to lab dashboard from breadcrumb
// 	const handleNavigateToLab = (targetView = 'samples') => {
// 		// Close any open popups
// 		setShowSamplePopup(false);
// 		setShowAnalysisPopup(false);
// 		setShowQRScanner(false);
// 		setShowHandoverForm(false);
// 		setScannedSampleUID('');
// 		setHandoverVolume('');

// 		// Navigate to the specified view
// 		setActiveView(targetView);
// 		const searchParams = new URLSearchParams();
// 		searchParams.set('view', targetView);
// 		navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
// 	};

// 	// Update URL with popup params
// 	const updateURLWithPopup = (popupType, additionalParams = {}) => {
// 		const searchParams = new URLSearchParams(location.search);
// 		if (popupType) {
// 			searchParams.set('popup', popupType);
// 		} else {
// 			searchParams.delete('popup');
// 		}

// 		// Add additional params
// 		Object.entries(additionalParams).forEach(([key, value]) => {
// 			if (value) {
// 				searchParams.set(key, value);
// 			} else {
// 				searchParams.delete(key);
// 			}
// 		});

// 		navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
// 	}; // Popup control functions with URL update
// 	const openSamplePopup = () => {
// 		setShowSamplePopup(true);
// 		updateURLWithPopup('sample');
// 	};

// 	const closeSamplePopup = () => {
// 		setShowSamplePopup(false);
// 		// Clear all params except view
// 		const searchParams = new URLSearchParams(location.search);
// 		const currentView = searchParams.get('view');
// 		const newSearchParams = new URLSearchParams();
// 		if (currentView) {
// 			newSearchParams.set('view', currentView);
// 		}
// 		navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
// 	};

// 	const openAnalysisPopup = () => {
// 		setShowAnalysisPopup(true);
// 		updateURLWithPopup('analysis');
// 	};

// 	const closeAnalysisPopup = () => {
// 		setShowAnalysisPopup(false);
// 		// Clear all params except view
// 		const searchParams = new URLSearchParams(location.search);
// 		const currentView = searchParams.get('view');
// 		const newSearchParams = new URLSearchParams();
// 		if (currentView) {
// 			newSearchParams.set('view', currentView);
// 		}
// 		navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
// 	};

// 	// Open ProcessingSample popup with specific query parameters
// 	const openProcessingSampleWithParams = (params = {}) => {
// 		setShowSamplePopup(true);

// 		const searchParams = new URLSearchParams(location.search);
// 		searchParams.set('popup', 'sample');

// 		// Map parameters to ProcessingSample format with ps_ prefix
// 		const paramMapping = {
// 			status: 'ps_status', // For urgent samples
// 			protocol_source: 'ps_protocol_source',
// 			handover_by: 'ps_handover_by', // For handover information
// 			handover_date: 'ps_handover_date', // For handover date filtering
// 			matrix: 'ps_matrix',
// 			parameter_name: 'ps_parameter_name',
// 			sample_uid: 'ps_sample_uid',
// 			technician_uid: 'ps_technician_uid',
// 			deadline: 'ps_deadline',
// 		};

// 		// If any parameters are provided, enable filter mode
// 		if (Object.keys(params).length > 0) {
// 			searchParams.set('ps_filter', 'true');
// 		}

// 		Object.entries(params).forEach(([key, value]) => {
// 			if (value !== undefined && value !== null) {
// 				const psKey = paramMapping[key] || `ps_${key}`;

// 				if (key === 'status') {
// 					// Handle status mapping
// 					if (value === 'fast' || value === 1) {
// 						searchParams.set('ps_status', '1');
// 					}
// 				} else if (Array.isArray(value)) {
// 					// For array values, join with comma
// 					searchParams.set(psKey, value.join(','));
// 				} else {
// 					// For parameters that should be arrays in ProcessingSample, convert single values to comma format
// 					if (['protocol_source', 'matrix', 'parameter_name', 'sample_uid', 'technician_uid'].includes(key)) {
// 						searchParams.set(psKey, String(value));
// 					} else {
// 						// For single values that remain single (like deadline)
// 						searchParams.set(psKey, String(value));
// 					}
// 				}
// 			}
// 		});

// 		navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
// 	};

// 	// Open ProcessingAnalysis popup with specific query parameters
// 	const openProcessingAnalysisWithParams = (params = {}) => {
// 		setShowAnalysisPopup(true);

// 		const searchParams = new URLSearchParams(location.search);
// 		searchParams.set('popup', 'analysis');

// 		Object.entries(params).forEach(([key, value]) => {
// 			if (value !== undefined && value !== null) {
// 				if (Array.isArray(value)) {
// 					searchParams.set(key, JSON.stringify(value));
// 				} else {
// 					searchParams.set(key, value);
// 				}
// 			}
// 		});
// 		navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
// 	};

// 	const openQRScanner = () => {
// 		setShowQRScanner(true);
// 		updateURLWithPopup('qr-scanner');
// 	};

// 	const closeQRScanner = () => {
// 		setShowQRScanner(false);
// 		// Clear all params except view
// 		const searchParams = new URLSearchParams(location.search);
// 		const currentView = searchParams.get('view');
// 		const newSearchParams = new URLSearchParams();
// 		if (currentView) {
// 			newSearchParams.set('view', currentView);
// 		}
// 		navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
// 	};

// 	const openHandoverForm = (sampleUID) => {
// 		setScannedSampleUID(sampleUID);
// 		setShowHandoverForm(true);
// 		updateURLWithPopup('handover-form', { sample_uid: sampleUID });
// 	};

// 	const closeHandoverForm = () => {
// 		setScannedSampleUID('');
// 		setHandoverVolume('');
// 		setShowHandoverForm(false);
// 		// Clear all params except view
// 		const searchParams = new URLSearchParams(location.search);
// 		const currentView = searchParams.get('view');
// 		const newSearchParams = new URLSearchParams();
// 		if (currentView) {
// 			newSearchParams.set('view', currentView);
// 		}
// 		navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
// 	};

// 	// Sync URL with activeView and handle URL changes
// 	useEffect(() => {
// 		const searchParams = new URLSearchParams(location.search);
// 		const viewParam = searchParams.get('view');
// 		const validViews = ['overview', 'analysis', 'samples', 'document', 'editor'];

// 		if (viewParam && validViews.includes(viewParam)) {
// 			// URL has valid view param, update state if different
// 			if (activeView !== viewParam) {
// 				setActiveView(viewParam);
// 			}
// 		} else if (viewParam === 'file') {
// 			// Handle legacy 'file' URLs by redirecting to 'document'
// 			const newSearchParams = new URLSearchParams();
// 			newSearchParams.set('view', 'document');
// 			navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
// 			setActiveView('document');
// 		} else if (viewParam && !validViews.includes(viewParam)) {
// 			// If invalid view param, redirect to overview
// 			const newSearchParams = new URLSearchParams();
// 			newSearchParams.set('view', 'overview');
// 			navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
// 			setActiveView('overview');
// 		} else if (!viewParam) {
// 			// If no view param, set URL to current activeView or default to overview
// 			const currentView = activeView || 'overview';
// 			const newSearchParams = new URLSearchParams();
// 			newSearchParams.set('view', currentView);
// 			navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
// 		}
// 	}, [location.search, location.pathname, navigate]); // Remove activeView from dependencies

// 	// Handle initial URL setup on component mount
// 	useEffect(() => {
// 		const searchParams = new URLSearchParams(window.location.search);
// 		const viewParam = searchParams.get('view');

// 		// If no view param on initial load, add it to URL
// 		if (!viewParam) {
// 			const initialView = activeView || 'overview';
// 			const newSearchParams = new URLSearchParams();
// 			newSearchParams.set('view', initialView);
// 			navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
// 		}
// 	}, []); // Only run on mount

// 	// Fetch dashboard data (temporarily using mock data only)
// 	const fetchDashboardData = async () => {
// 		try {
// 			setLoading(true);

// 			// Temporarily skip API call and use mock data directly
// 			console.log('Using mock data for dashboard (API temporarily disabled)');

// 			// Simulate a short loading delay for better UX
// 			await new Promise((resolve) => setTimeout(resolve, 500));

// 			// Set mock data directly
// 			setDashboardData({
// 				overview: {
// 					sample: 156,
// 					analysis: 890,
// 				},
// 				sample: {
// 					fast: 12,
// 					normal: 45,
// 					pending: 8,
// 				},
// 				analysis: {
// 					today: 67,
// 					overdue: 23,
// 					week: 145,
// 				},
// 				today: {
// 					handover: {
// 						sample: 24,
// 						analysis: 180,
// 					},
// 					done: {
// 						sample: 18,
// 						analysis: 126,
// 					},
// 				},
// 				chart: {
// 					Monday: { normal: 41, fast: 5, analysis: 221 },
// 					Tuesday: { normal: 22, fast: 0, analysis: 124 },
// 					Wednesday: { normal: 25, fast: 2, analysis: 198 },
// 					Thursday: { normal: 28, fast: 7, analysis: 156 },
// 					Friday: { normal: 31, fast: 1, analysis: 178 },
// 					Saturday: { normal: 17, fast: 0, analysis: 122 },
// 					Sunday: { normal: 12, fast: 1, analysis: 67 },
// 				},
// 			});
// 		} catch (error) {
// 			console.error('Error in mock data setup:', error);
// 		} finally {
// 			setLoading(false);
// 		}
// 	};

// 	useEffect(() => {
// 		fetchDashboardData();
// 	}, []);

// 	// Generate recent activities from real data
// 	const getRecentActivities = () => {
// 		const activities = [];

// 		// Safety check for data availability
// 		if (loading || !dashboardData) return [];

// 		// Since recentSamples and recentReports are not in the new data structure,
// 		// we'll create mock activities based on available data
// 		if (dashboardData.sample) {
// 			activities.push({
// 				id: 'sample-activity-1',
// 				title: `${dashboardData.sample.fast} mẫu khẩn đang xử lý`,
// 				date: new Date().toLocaleDateString('vi-VN', {
// 					day: '2-digit',
// 					month: 'short',
// 					year: 'numeric',
// 					hour: '2-digit',
// 					minute: '2-digit',
// 				}),
// 				status: 'Đang xử lý',
// 				icon: <FaFlask className="w-6 h-6" />,
// 			});
// 		}

// 		if (dashboardData.analysis) {
// 			activities.push({
// 				id: 'analysis-activity-1',
// 				title: `${dashboardData.analysis.today} chỉ tiêu hôm nay`,
// 				date: new Date().toLocaleDateString('vi-VN', {
// 					day: '2-digit',
// 					month: 'short',
// 					year: 'numeric',
// 					hour: '2-digit',
// 					minute: '2-digit',
// 				}),
// 				status: 'Cần xử lý',
// 				icon: <FaClipboardList className="w-6 h-6" />,
// 			});
// 		}

// 		if (dashboardData.today && dashboardData.today.done) {
// 			activities.push({
// 				id: 'completed-activity-1',
// 				title: `${dashboardData.today.done.sample + dashboardData.today.done.analysis} kết quả hoàn thành`,
// 				date: new Date().toLocaleDateString('vi-VN', {
// 					day: '2-digit',
// 					month: 'short',
// 					year: 'numeric',
// 					hour: '2-digit',
// 					minute: '2-digit',
// 				}),
// 				status: 'Hoàn thành',
// 				icon: <FaCheckCircle className="w-6 h-6" />,
// 			});
// 		}

// 		// Return top 5 activities
// 		return activities.slice(0, 5);
// 	};

// 	const recentActivities = getRecentActivities();

// 	// Handle QR scan simulation (this would be replaced with actual QR scanning)
// 	const handleQRScan = (sampleUID) => {
// 		closeQRScanner();
// 		openHandoverForm(sampleUID);
// 	};

// 	// Simulate QR scan for demo
// 	const simulateQRScan = () => {
// 		const mockSampleUID = 'S240808-' + String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
// 		handleQRScan(mockSampleUID);
// 	};

// 	// Handle handover form submission
// 	const handleHandoverSubmit = async () => {
// 		if (!handoverVolume.trim()) {
// 			alert('Vui lòng nhập số lượng mẫu');
// 			return;
// 		}

// 		setHandoverSubmitting(true);

// 		try {
// 			// Prepare request body
// 			const requestBody = {
// 				sample_uid: scannedSampleUID,
// 				handover_info: {
// 					handover_at: new Date().toISOString(),
// 					handover_by_uid: 'current_user_uid', // This should be from actual auth
// 					handover_by_name: currentUser.identity_name,
// 					volume: handoverVolume,
// 				},
// 			};

// 			// Mock API call (replace with actual API later)
// 			console.log('Handover API Request:', requestBody);

// 			// Simulate API delay
// 			await new Promise((resolve) => setTimeout(resolve, 1000));

// 			// Mock successful response
// 			alert('Bàn giao mẫu thành công!');

// 			// Reset form and close
// 			closeHandoverForm();
// 		} catch (error) {
// 			console.error('Handover error:', error);
// 			alert('Có lỗi xảy ra khi bàn giao mẫu');
// 		} finally {
// 			setHandoverSubmitting(false);
// 		}
// 	};

// 	// Chart.js configuration for dual Y-axis bar chart
// 	const getChartJSData = () => {
// 		if (loading || !dashboardData.chart) return null;

// 		const chartEntries = Object.entries(dashboardData.chart);
// 		const dayMapping = {
// 			Monday: 'T2',
// 			Tuesday: 'T3',
// 			Wednesday: 'T4',
// 			Thursday: 'T5',
// 			Friday: 'T6',
// 			Saturday: 'T7',
// 			Sunday: 'CN',
// 		};

// 		const labels = chartEntries.map(([day]) => dayMapping[day] || day);
// 		const normalData = chartEntries.map(([, data]) => data.normal);
// 		const fastData = chartEntries.map(([, data]) => data.fast);
// 		const analysisData = chartEntries.map(([, data]) => data.analysis);

// 		return {
// 			labels,
// 			datasets: [
// 				{
// 					label: 'Bình thường',
// 					data: normalData,
// 					backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
// 					borderColor: 'rgb(59, 130, 246)',
// 					borderWidth: 1,
// 					yAxisID: 'y',
// 					stack: 'samples',
// 				},
// 				{
// 					label: 'Khẩn',
// 					data: fastData,
// 					backgroundColor: 'rgba(239, 68, 68, 0.8)', // red-500
// 					borderColor: 'rgb(239, 68, 68)',
// 					borderWidth: 1,
// 					yAxisID: 'y',
// 					stack: 'samples',
// 				},
// 				{
// 					label: 'Chỉ tiêu',
// 					data: analysisData,
// 					backgroundColor: 'rgba(34, 197, 94, 0.8)', // green-500
// 					borderColor: 'rgb(34, 197, 94)',
// 					borderWidth: 1,
// 					yAxisID: 'y1',
// 					stack: 'analysis',
// 				},
// 			],
// 		};
// 	};

// 	const getChartOptions = () => {
// 		if (loading || !dashboardData.chart) return {};

// 		const chartEntries = Object.entries(dashboardData.chart);
// 		const normalData = chartEntries.map(([, data]) => data.normal);
// 		const fastData = chartEntries.map(([, data]) => data.fast);
// 		const analysisData = chartEntries.map(([, data]) => data.analysis);

// 		// Calculate max values for Y-axis scaling
// 		const maxSampleRaw = Math.max(...normalData.map((n, i) => n + fastData[i])) || 1;
// 		const maxAnalysisRaw = Math.max(...analysisData) || 1;

// 		// Round max values (10 for samples, 50 for analysis)
// 		const maxSampleRounded = Math.ceil(maxSampleRaw / 10) * 10;
// 		const maxAnalysisRounded = Math.ceil(maxAnalysisRaw / 50) * 50;

// 		return {
// 			responsive: true,
// 			maintainAspectRatio: false,
// 			interaction: {
// 				mode: 'index',
// 				intersect: false,
// 			},
// 			plugins: {
// 				legend: {
// 					display: false, // We'll use custom legend
// 				},
// 				tooltip: {
// 					backgroundColor: 'rgba(0, 0, 0, 0.8)',
// 					titleColor: 'white',
// 					bodyColor: 'white',
// 					borderColor: 'rgba(255, 255, 255, 0.1)',
// 					borderWidth: 1,
// 					cornerRadius: 8,
// 					displayColors: true,
// 					callbacks: {
// 						title: function (context) {
// 							return `Ngày ${context[0].label}`;
// 						},
// 						label: function (context) {
// 							const label = context.dataset.label || '';
// 							const value = context.parsed.y;
// 							return `${label}: ${value}`;
// 						},
// 					},
// 				},
// 			},
// 			scales: {
// 				x: {
// 					grid: {
// 						display: false,
// 					},
// 					border: {
// 						color: 'rgb(156, 163, 175)', // gray-400
// 						width: 1,
// 					},
// 					ticks: {
// 						color: 'rgb(75, 85, 99)', // gray-600
// 						font: {
// 							weight: 'bold',
// 							size: 11,
// 						},
// 					},
// 				},
// 				y: {
// 					type: 'linear',
// 					display: true,
// 					position: 'left',
// 					min: 0,
// 					max: maxSampleRounded,
// 					grid: {
// 						display: false,
// 					},
// 					border: {
// 						color: 'rgb(156, 163, 175)', // gray-400
// 						width: 1,
// 					},
// 					ticks: {
// 						color: 'rgb(75, 85, 99)', // gray-600
// 						font: {
// 							weight: 'bold',
// 							size: 11,
// 						},
// 						stepSize: Math.floor(maxSampleRounded / 2),
// 						callback: function (value) {
// 							return value;
// 						},
// 					},
// 				},
// 				y1: {
// 					type: 'linear',
// 					display: true,
// 					position: 'right',
// 					min: 0,
// 					max: maxAnalysisRounded,
// 					grid: {
// 						display: false,
// 					},
// 					border: {
// 						color: 'rgb(156, 163, 175)', // gray-400
// 						width: 1,
// 					},
// 					ticks: {
// 						color: 'rgb(34, 197, 94)', // green-500
// 						font: {
// 							weight: 'bold',
// 							size: 11,
// 						},
// 						stepSize: Math.floor(maxAnalysisRounded / 2),
// 						callback: function (value) {
// 							return value;
// 						},
// 					},
// 				},
// 			},
// 		};
// 	};

// 	// New task data structure
// 	const sampleTasks = [
// 		{ label: 'Khẩn', count: dashboardData.sample.fast, color: 'bg-red-100 text-red-600' },
// 		{ label: 'Thường', count: dashboardData.sample.normal, color: 'bg-blue-100 text-blue-600' },
// 		{ label: 'Chờ', count: dashboardData.sample.pending, color: 'bg-yellow-100 text-yellow-600' },
// 	];

// 	const analysisTasks = [
// 		{ label: 'Hôm nay', count: dashboardData.analysis.today, color: 'bg-green-100 text-green-600' },
// 		{ label: 'Quá hạn', count: dashboardData.analysis.overdue, color: 'bg-red-100 text-red-600' },
// 		{ label: '7 ngày tới', count: dashboardData.analysis.week, color: 'bg-blue-100 text-blue-600' },
// 	];

// 	// Remove old static data as we now use dynamic data

// 	return (
// 		<div className="h-screen w-screen bg-gray-100 flex overflow-hidden">
// 			{/* Sidebar */}
// 			<div
// 				className={`${isAnyPopupOpen ? 'w-16' : 'w-64'} bg-gray-100 flex flex-col h-full transition-all duration-300`}
// 			>
// 				{/* Top Section - Logo and Navigation */}
// 				<div className="flex-1 flex flex-col">
// 					{/* Logo Section */}
// 					<div className="p-4 border-b border-gray-200">
// 						<div className="h-8 flex justify-center items-center">
// 							<img
// 								// src={isAnyPopupOpen ? logoCollapsed : logoExpanded}
// 								src={logoCollapsed} // Use the collapsed logo for both states
// 								alt="IRDOP Logo"
// 								className={`object-contain transition-all duration-300 ${isAnyPopupOpen ? 'h-8 w-8' : 'h-8'}`}
// 								loading="eager"
// 							/>
// 						</div>
// 					</div>

// 					{isAnyPopupOpen ? (
// 						/* Collapsed Sidebar - Icons Only */
// 						<div className="p-2 pt-4">
// 							<nav className="space-y-2">
// 								{/* Lab Dashboard Icons */}
// 								<button
// 									onClick={() => handleViewChange('overview')}
// 									className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
// 										activeView === 'overview'
// 											? 'bg-blue-600 text-white'
// 											: 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
// 									}`}
// 									onMouseEnter={(e) => showTooltip('Tổng quan', e)}
// 									onMouseLeave={hideTooltip}
// 								>
// 									<FaChartBar className="w-5 h-5" />
// 								</button>
// 								<button
// 									onClick={() => handleViewChange('analysis')}
// 									className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
// 										activeView === 'analysis'
// 											? 'bg-blue-600 text-white'
// 											: 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
// 									}`}
// 									onMouseEnter={(e) => showTooltip('Chỉ tiêu', e)}
// 									onMouseLeave={hideTooltip}
// 								>
// 									<FaFlask className="w-5 h-5" />
// 								</button>
// 								<button
// 									onClick={() => handleViewChange('samples')}
// 									className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
// 										activeView === 'samples'
// 											? 'bg-blue-600 text-white'
// 											: 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
// 									}`}
// 									onMouseEnter={(e) => showTooltip('Mẫu thử', e)}
// 									onMouseLeave={hideTooltip}
// 								>
// 									<FaBoxOpen className="w-5 h-5" />
// 								</button>
// 								<button
// 									onClick={() => handleViewChange('document')}
// 									className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
// 										activeView === 'document'
// 											? 'bg-blue-600 text-white'
// 											: 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
// 									}`}
// 									onMouseEnter={(e) => showTooltip('Tài liệu - Biên bản', e)}
// 									onMouseLeave={hideTooltip}
// 								>
// 									<FaFileAlt className="w-5 h-5" />
// 								</button>
// 								<button
// 									onClick={() => handleViewChange('editor')}
// 									className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
// 										activeView === 'editor'
// 											? 'bg-blue-600 text-white'
// 											: 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
// 									}`}
// 									onMouseEnter={(e) => showTooltip('Soạn thảo', e)}
// 									onMouseLeave={hideTooltip}
// 								>
// 									<FaEdit className="w-5 h-5" />
// 								</button>
// 								<button
// 									className="w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-blue-600 transition-colors"
// 									onMouseEnter={(e) => showTooltip('Nhật ký', e)}
// 									onMouseLeave={hideTooltip}
// 								>
// 									<FaHistory className="w-5 h-5" />
// 								</button>

// 								{/* Divider */}
// 								<div className="border-t border-gray-300 my-2"></div>

// 								{/* Main Navigation Icons */}
// 								<Link
// 									to="/dashboard"
// 									className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
// 										currentPath === '/' || currentPath.includes('/dashboard')
// 											? 'bg-blue-600 text-white'
// 											: 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
// 									}`}
// 									onMouseEnter={(e) => showTooltip('Tiếp nhận', e)}
// 									onMouseLeave={hideTooltip}
// 								>
// 									<FaClipboardList className="w-5 h-5" />
// 								</Link>
// 								<Link
// 									to="/library"
// 									className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
// 										currentPath.includes('/library')
// 											? 'bg-blue-600 text-white'
// 											: 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
// 									}`}
// 									onMouseEnter={(e) => showTooltip('Thư viện', e)}
// 									onMouseLeave={hideTooltip}
// 								>
// 									<FaFileAlt className="w-5 h-5" />
// 								</Link>
// 								<Link
// 									to="/files"
// 									className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
// 										currentPath.includes('/files')
// 											? 'bg-blue-600 text-white'
// 											: 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
// 									}`}
// 									onMouseEnter={(e) => showTooltip('Files', e)}
// 									onMouseLeave={hideTooltip}
// 								>
// 									<FaFileAlt className="w-5 h-5" />
// 								</Link>
// 							</nav>
// 						</div>
// 					) : (
// 						/* Full Sidebar */
// 						<>
// 							{/* Lab Dashboard Tabs - Moved to top */}
// 							<div className="px-4 pt-4">
// 								<div className="mb-3">
// 									<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lab Dashboard</h3>
// 								</div>
// 								<nav className="space-y-1">
// 									<button
// 										onClick={() => handleViewChange('overview')}
// 										className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
// 											activeView === 'overview'
// 												? 'bg-blue-600 text-white'
// 												: 'text-gray-700 hover:bg-white hover:text-gray-900'
// 										}`}
// 									>
// 										<FaChartBar className="w-4 h-4" />
// 										<span>Tổng quan</span>
// 									</button>
// 									<button
// 										onClick={() => handleViewChange('analysis')}
// 										className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
// 											activeView === 'analysis'
// 												? 'bg-blue-600 text-white'
// 												: 'text-gray-700 hover:bg-white hover:text-gray-900'
// 										}`}
// 									>
// 										<FaFlask className="w-4 h-4" />
// 										<span>Chỉ tiêu</span>
// 									</button>
// 									<button
// 										onClick={() => handleViewChange('samples')}
// 										className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
// 											activeView === 'samples'
// 												? 'bg-blue-600 text-white'
// 												: 'text-gray-700 hover:bg-white hover:text-gray-900'
// 										}`}
// 									>
// 										<FaBoxOpen className="w-4 h-4" />
// 										<span>Mẫu thử</span>
// 									</button>
// 									<button
// 										onClick={() => handleViewChange('document')}
// 										className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
// 											activeView === 'document'
// 												? 'bg-blue-600 text-white'
// 												: 'text-gray-700 hover:bg-white hover:text-gray-900'
// 										}`}
// 									>
// 										<FaFileAlt className="w-4 h-4" />
// 										<span>Tài liệu - Biên bản</span>
// 									</button>
// 									<button
// 										onClick={() => handleViewChange('editor')}
// 										className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
// 											activeView === 'editor'
// 												? 'bg-blue-600 text-white'
// 												: 'text-gray-700 hover:bg-white hover:text-gray-900'
// 										}`}
// 									>
// 										<FaEdit className="w-4 h-4" />
// 										<span>Soạn thảo</span>
// 									</button>
// 									<button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-white hover:text-gray-900 transition-colors">
// 										<FaHistory className="w-4 h-4" />
// 										<span>Nhật ký</span>
// 									</button>
// 								</nav>
// 							</div>

// 							{/* Main Navigation - Moved below Lab Dashboard */}
// 							<div className="p-4">
// 								<div className="mb-3">
// 									<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Điều hướng</h3>
// 								</div>
// 								<nav className="space-y-1">
// 									<Link
// 										to="/dashboard"
// 										className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
// 											currentPath === '/' || currentPath.includes('/dashboard')
// 												? 'bg-blue-600 text-white'
// 												: 'text-gray-700 hover:bg-white hover:text-gray-900'
// 										}`}
// 									>
// 										<FaClipboardList className="w-4 h-4" />
// 										<span>Tiếp nhận</span>
// 									</Link>
// 									<Link
// 										to="/library"
// 										className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
// 											currentPath.includes('/library')
// 												? 'bg-blue-600 text-white'
// 												: 'text-gray-700 hover:bg-white hover:text-gray-900'
// 										}`}
// 									>
// 										<FaFileAlt className="w-4 h-4" />
// 										<span>Thư viện</span>
// 									</Link>
// 									<Link
// 										to="/files"
// 										className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
// 											currentPath.includes('/files')
// 												? 'bg-blue-600 text-white'
// 												: 'text-gray-700 hover:bg-white hover:text-gray-900'
// 										}`}
// 									>
// 										<FaFileAlt className="w-4 h-4" />
// 										<span>Files</span>
// 									</Link>
// 								</nav>
// 							</div>
// 						</>
// 					)}
// 				</div>

// 				{/* Bottom Section - Account/Identity */}
// 				<div className="p-2 border-t border-gray-200">
// 					<div className="relative">
// 						{isAnyPopupOpen ? (
// 							/* Collapsed User Icon */
// 							<button
// 								onClick={() => setDropdownOpen(!dropdownOpen)}
// 								className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors"
// 								onMouseEnter={(e) => showTooltip(displayName, e)}
// 								onMouseLeave={hideTooltip}
// 							>
// 								<FaUser className="w-5 h-5" />
// 							</button>
// 						) : (
// 							/* Full User Info */
// 							<button
// 								onClick={() => setDropdownOpen(!dropdownOpen)}
// 								className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
// 							>
// 								<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
// 									<span className="text-blue-600 font-semibold text-sm">
// 										{currentUser?.identity_name?.charAt(0) || 'T'}
// 									</span>
// 								</div>
// 								<div className="flex-1 text-left">
// 									<p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
// 									<p className="text-xs text-gray-500">Nhân viên lab</p>
// 								</div>
// 								<FaChevronDown className="w-4 h-4 text-gray-400" />
// 							</button>
// 						)}

// 						{dropdownOpen && (
// 							<div
// 								className={`absolute ${
// 									isAnyPopupOpen ? 'bottom-full left-16 mb-2 w-64' : 'bottom-full left-0 right-0 mb-2'
// 								} bg-white border rounded-lg shadow-lg z-50`}
// 							>
// 								<div className="p-3 border-b">
// 									<p className="text-sm font-medium text-gray-900">{displayName}</p>
// 									<p className="text-xs text-gray-500">{currentUser?.identity_uid}</p>
// 								</div>
// 								<button
// 									onClick={handleLogout}
// 									className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
// 								>
// 									Đăng xuất
// 								</button>
// 							</div>
// 						)}
// 					</div>
// 				</div>
// 			</div>

// 			{/* Main Content Area - White Box */}
// 			<div className="flex-1 bg-white overflow-y-hidden overflow-x-auto">
// 				{/* Show Popups in this area instead of full screen */}
// 				{showSamplePopup || showAnalysisPopup || showQRScanner || showHandoverForm ? (
// 					<div className="w-full h-full">
// 						{/* Popup Content - No header */}
// 						<div className="h-full overflow-auto">
// 							{showSamplePopup && <ProcessingSample onNavigateToLab={handleNavigateToLab} />}
// 							{showAnalysisPopup && <ProcessingAnalysis onNavigateToLab={handleNavigateToLab} />}
// 							{showQRScanner && (
// 								<div className="p-6 text-center h-full flex flex-col justify-center">
// 									<div className="w-32 h-32 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
// 										<FaQrcode className="w-16 h-16 text-gray-400" />
// 									</div>
// 									<h3 className="text-lg font-semibold text-gray-900 mb-2">Sẵn sàng quét mã QR</h3>
// 									<p className="text-sm text-gray-600 mb-4">
// 										Đưa camera về phía mã QR trên mẫu thử để xác nhận thông tin bàn giao
// 									</p>
// 									<button
// 										onClick={simulateQRScan}
// 										className="w-full max-w-md mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4"
// 									>
// 										Mô phỏng quét QR (Demo)
// 									</button>
// 									<div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg max-w-md mx-auto">
// 										<strong>Lưu ý:</strong> Chức năng quét QR thực tế sẽ được tích hợp camera sau
// 									</div>
// 								</div>
// 							)}
// 							{showHandoverForm && (
// 								<div className="h-full flex flex-col">
// 									<div className="flex-1 flex items-center justify-center">
// 										<div className="w-full max-w-md mx-auto p-6 space-y-4">
// 											<div>
// 												<label className="block text-sm font-medium text-gray-700 mb-2">Mã mẫu thử</label>
// 												<input
// 													type="text"
// 													value={scannedSampleUID}
// 													readOnly
// 													className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
// 												/>
// 											</div>
// 											<div>
// 												<label className="block text-sm font-medium text-gray-700 mb-2">Ngày nhận bàn giao</label>
// 												<input
// 													type="text"
// 													value={new Date().toLocaleString('vi-VN', {
// 														day: '2-digit',
// 														month: '2-digit',
// 														year: 'numeric',
// 														hour: '2-digit',
// 														minute: '2-digit',
// 													})}
// 													readOnly
// 													className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
// 												/>
// 											</div>
// 											<div>
// 												<label className="block text-sm font-medium text-gray-700 mb-2">Người nhận bàn giao</label>
// 												<input
// 													type="text"
// 													value={currentUser.identity_name}
// 													readOnly
// 													className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
// 												/>
// 											</div>
// 											<div>
// 												<label className="block text-sm font-medium text-gray-700 mb-2">
// 													Số lượng <span className="text-red-500">*</span>
// 												</label>
// 												<input
// 													type="text"
// 													value={handoverVolume}
// 													onChange={(e) => setHandoverVolume(e.target.value)}
// 													placeholder="Ví dụ: 500ml, 1L, 200g..."
// 													disabled={handoverSubmitting}
// 													className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
// 												/>
// 												<p className="text-xs text-gray-500 mt-1">Nhập số lượng mẫu được bàn giao</p>
// 											</div>
// 										</div>
// 									</div>
// 									<div className="p-4 border-t bg-gray-50">
// 										<div className="max-w-md mx-auto flex space-x-3">
// 											<button
// 												onClick={() => closeHandoverForm()}
// 												disabled={handoverSubmitting}
// 												className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
// 											>
// 												Hủy
// 											</button>
// 											<button
// 												onClick={handleHandoverSubmit}
// 												disabled={handoverSubmitting || !handoverVolume.trim()}
// 												className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
// 											>
// 												{handoverSubmitting && (
// 													<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
// 												)}
// 												<span>{handoverSubmitting ? 'Đang xử lý...' : 'Xác nhận bàn giao'}</span>
// 											</button>
// 										</div>
// 									</div>
// 								</div>
// 							)}
// 						</div>
// 					</div>
// 				) : (
// 					/* Main Content - Scrollable */
// 					<div className="w-full h-full space-y-6 overflow-y-auto scrollbar-hide px-6 py-6">
// 						{/* Render content based on active view */}
// 						{activeView === 'overview' && (
// 							<>
// 								{/* Dashboard Header */}
// 								<div className="flex items-center justify-between">
// 									<h2 className="text-2xl font-semibold text-gray-900">Tổng quan phòng lab</h2>
// 								</div>

// 								{/* Top Cards */}
// 								<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
// 									{/* Lab Info Card */}
// 									<div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
// 										<div className="flex items-center justify-between mb-4">
// 											<div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
// 												<FaFlask className="w-4 h-4 text-white" />
// 											</div>
// 											<div className="text-xs opacity-80">LAB-IRDOP</div>
// 										</div>
// 										{loading ? (
// 											<div className="space-y-3">
// 												<div className="animate-pulse">
// 													<div className="h-4 bg-white bg-opacity-20 rounded mb-2"></div>
// 													<div className="h-6 bg-white bg-opacity-30 rounded"></div>
// 												</div>
// 											</div>
// 										) : (
// 											<div className="space-y-3">
// 												<div className="flex justify-between items-center">
// 													<span className="text-sm opacity-90">Mẫu thử</span>
// 													<span className="text-xl font-bold">{dashboardData.overview.sample}</span>
// 												</div>
// 												<div className="flex justify-between items-center">
// 													<span className="text-sm opacity-90">Chỉ tiêu</span>
// 													<span className="text-xl font-bold">{dashboardData.overview.analysis}</span>
// 												</div>
// 												<div className="flex justify-between items-center">
// 													<span className="text-sm opacity-90">Info</span>
// 													<span className="text-xl font-bold">count</span>
// 												</div>
// 											</div>
// 										)}
// 									</div>

// 									{/* Upcoming Tasks */}
// 									<div className="lg:col-span-2 space-y-4">
// 										<h3 className="text-lg font-semibold text-gray-900 text-start">Công việc chờ xử lý</h3>
// 										{loading ? (
// 											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
// 												{[1, 2].map((item) => (
// 													<div key={item} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
// 														<div className="h-4 bg-gray-200 rounded mb-4"></div>
// 														<div className="space-y-3">
// 															{[1, 2, 3].map((subItem) => (
// 																<div key={subItem} className="flex justify-between items-center">
// 																	<div className="h-3 bg-gray-200 rounded w-16"></div>
// 																	<div className="h-6 bg-gray-200 rounded w-8"></div>
// 																</div>
// 															))}
// 														</div>
// 													</div>
// 												))}
// 											</div>
// 										) : (
// 											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
// 												{/* Thông tin mẫu */}
// 												<div
// 													className="bg-white rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-200"
// 													onClick={() => openSamplePopup()}
// 												>
// 													<div className="flex items-center space-x-3 mb-4">
// 														<div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
// 															<FaFlask className="w-6 h-6" />
// 														</div>
// 														<div>
// 															<div className="font-medium text-gray-900">Thông tin mẫu</div>
// 															<div className="text-sm text-gray-500">Trạng thái xử lý</div>
// 														</div>
// 													</div>
// 													<div className="space-y-3">
// 														{sampleTasks.map((task, index) => (
// 															<div key={index} className="flex justify-between items-center">
// 																<div className="flex items-center space-x-2">
// 																	<div className={`w-3 h-3 rounded-full ${task.color.split(' ')[0]}`}></div>
// 																	<span className="text-sm text-gray-600">{task.label}</span>
// 																</div>
// 																<span className="font-semibold text-gray-900">{task.count}</span>
// 															</div>
// 														))}
// 													</div>
// 												</div>

// 												{/* Chỉ tiêu */}
// 												<div
// 													className="bg-white rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-green-200"
// 													onClick={() => openAnalysisPopup()}
// 												>
// 													<div className="flex items-center space-x-3 mb-4">
// 														<div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
// 															<FaClipboardList className="w-6 h-6" />
// 														</div>
// 														<div>
// 															<div className="font-medium text-gray-900">Chỉ tiêu</div>
// 															<div className="text-sm text-gray-500">Tiến độ xử lý</div>
// 														</div>
// 													</div>
// 													<div className="space-y-3">
// 														{analysisTasks.map((task, index) => (
// 															<div key={index} className="flex justify-between items-center">
// 																<div className="flex items-center space-x-2">
// 																	<div className={`w-3 h-3 rounded-full ${task.color.split(' ')[0]}`}></div>
// 																	<span className="text-sm text-gray-600">{task.label}</span>
// 																</div>
// 																<span className="font-semibold text-gray-900">{task.count}</span>
// 															</div>
// 														))}
// 													</div>
// 												</div>
// 											</div>
// 										)}
// 									</div>
// 								</div>

// 								{/* Chart and Stats Section */}
// 								<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
// 									{/* Activity Chart */}
// 									<div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
// 										<div className="flex items-center justify-between mb-6">
// 											<div>
// 												<div className="text-sm text-gray-500">Hoạt động 7 ngày</div>
// 												<div className="text-3xl font-semibold text-gray-900">
// 													{loading ? (
// 														<div className="animate-pulse">
// 															<div className="h-8 bg-gray-200 rounded w-16"></div>
// 														</div>
// 													) : (
// 														dashboardData.today.done.sample + dashboardData.today.done.analysis
// 													)}
// 												</div>
// 											</div>
// 											<div className="flex items-center space-x-4">
// 												<div className="flex items-center space-x-2">
// 													<div className="w-3 h-3 bg-blue-600 rounded"></div>
// 													<span className="text-xs text-gray-600 font-medium">Bình thường</span>
// 												</div>
// 												<div className="flex items-center space-x-2">
// 													<div className="w-3 h-3 bg-red-600 rounded"></div>
// 													<span className="text-xs text-gray-600 font-medium">Khẩn</span>
// 												</div>
// 												<div className="flex items-center space-x-2">
// 													<div className="w-3 h-3 bg-green-600 rounded"></div>
// 													<span className="text-xs text-gray-600 font-medium">Chỉ tiêu</span>
// 												</div>
// 												<button
// 													className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
// 													onClick={() => setTimeFilter(timeFilter === 'Week' ? 'Month' : 'Week')}
// 												>
// 													{timeFilter === 'Week' ? 'Tuần' : 'Tháng'}
// 												</button>
// 											</div>
// 										</div>

// 										{/* Dual Column Chart */}
// 										<div className="h-64 relative">
// 											{loading ? (
// 												<div className="w-full h-full animate-pulse bg-gray-200 rounded"></div>
// 											) : (
// 												<Bar data={getChartJSData()} options={getChartOptions()} />
// 											)}
// 										</div>
// 									</div>

// 									{/* Summary Stats */}
// 									<div className="bg-white rounded-xl p-6 shadow-sm">
// 										<div className="flex items-center justify-between mb-4">
// 											<h3 className="text-lg font-semibold text-gray-900">Thống kê tổng</h3>
// 											<button className="text-blue-600 text-sm">Xem tất cả</button>
// 										</div>
// 										{loading ? (
// 											<div className="space-y-4">
// 												<div className="animate-pulse">
// 													<div className="bg-gray-200 rounded-lg p-4">
// 														<div className="h-6 bg-gray-300 rounded mb-2"></div>
// 														<div className="h-4 bg-gray-300 rounded"></div>
// 													</div>
// 												</div>
// 											</div>
// 										) : (
// 											<div className="space-y-4">
// 												<div className="bg-gray-50 rounded-lg p-4">
// 													<div className="text-2xl font-semibold text-gray-900">
// 														{dashboardData.today.handover.sample} <span className="text-sm text-gray-500">mẫu </span>
// 														{dashboardData.today.handover.analysis}{' '}
// 														<span className="text-sm text-gray-500">chỉ tiêu</span>
// 													</div>
// 													<div className="text-sm text-gray-500 mt-1">Tổng bàn giao hôm nay</div>
// 												</div>
// 												<div className="bg-blue-50 rounded-lg p-4">
// 													<div className="text-2xl font-semibold text-blue-900">
// 														{dashboardData.today.done.sample} <span className="text-sm text-blue-500">mẫu</span>
// 													</div>
// 													<div className="text-sm text-blue-500 mt-1">Hoàn thành hôm nay</div>
// 												</div>
// 												<div className="bg-green-50 rounded-lg p-4">
// 													<div className="text-2xl font-semibold text-green-900">
// 														{dashboardData.today.done.analysis} <span className="text-sm text-green-500">chỉ tiêu</span>
// 													</div>
// 													<div className="text-sm text-green-500 mt-1">Hoàn thành hôm nay</div>
// 												</div>
// 											</div>
// 										)}
// 									</div>
// 								</div>

// 								{/* Recent Activities */}
// 								<div className="bg-white rounded-xl p-6 shadow-sm">
// 									<div className="flex items-center justify-between mb-4">
// 										<h3 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h3>
// 										<div className="flex items-center space-x-2">
// 											<span className="text-sm text-gray-500">Sắp xếp theo</span>
// 											<button
// 												className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center space-x-1"
// 												onClick={() => setSortBy(sortBy === 'Date' ? 'Status' : 'Date')}
// 											>
// 												<span>{sortBy === 'Date' ? 'Ngày' : 'Trạng thái'}</span>
// 												<FaChevronDown className="w-4 h-4" />
// 											</button>
// 										</div>
// 									</div>
// 								</div>
// 							</>
// 						)}

// 						{/* Analysis View */}
// 						{activeView === 'analysis' && (
// 							<>
// 								{/* Analysis Header */}
// 								<div className="flex items-center justify-between">
// 									<h2 className="text-2xl font-semibold text-gray-900">Chỉ tiêu đang xử lý</h2>
// 								</div>

// 								{/* Analysis Widget Grid - 3 columns layout */}
// 								<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
// 									{/* Column 1: Analysis Overview Card with subcategories */}
// 									<div className="space-y-4">
// 										{/* Main Analysis Card with integrated subcategories - match height of other columns */}
// 										<div
// 											className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white h-full cursor-pointer hover:shadow-lg transition-shadow duration-200"
// 											onClick={() => openProcessingAnalysisWithParams()}
// 										>
// 											<div className="flex items-center justify-between mb-4">
// 												<div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
// 													<FaFlask className="w-4 h-4 text-white" />
// 												</div>
// 												<div className="text-xs opacity-80">CHỈ TIÊU</div>
// 											</div>
// 											<div className="space-y-3">
// 												<div className="flex justify-between items-center">
// 													<span className="text-sm opacity-90">Tổng số</span>
// 													<span className="text-xl font-bold">{analysisWidgetData.analysis.total}</span>
// 												</div>
// 												<div
// 													className="flex justify-between items-center cursor-pointer hover:bg-white hover:bg-opacity-10 rounded transition-all duration-200"
// 													onClick={(e) => {
// 														e.stopPropagation();
// 														openProcessingSampleWithParams({ deadline: 'today' });
// 													}}
// 												>
// 													<span className="text-sm opacity-90 underline">Hôm nay</span>
// 													<span className="text-xl font-bold">{analysisWidgetData.analysis.today}</span>
// 												</div>
// 												<div
// 													className="flex justify-between items-center cursor-pointer hover:bg-white hover:bg-opacity-10 rounded transition-all duration-200"
// 													onClick={(e) => {
// 														e.stopPropagation();
// 														openProcessingSampleWithParams({ deadline: 'overdue' });
// 													}}
// 												>
// 													<span className="text-sm opacity-90 underline">Quá hạn</span>
// 													<span className="text-xl font-bold">{analysisWidgetData.analysis.overdue}</span>
// 												</div>

// 												{/* Divider */}
// 												<div className="border-t border-white border-opacity-20 my-4"></div>

// 												{/* Analysis Categories integrated */}
// 												<div className="flex justify-between items-center">
// 													<div className="flex items-center space-x-2">
// 														<FaVial className="w-3 h-3 text-white opacity-80" />
// 														<span className="text-sm opacity-90">Hóa - Lý</span>
// 													</div>
// 													<span className="text-lg font-bold">{analysisWidgetData.analysis.chemPhys}</span>
// 												</div>
// 												<div className="flex justify-between items-center">
// 													<div className="flex items-center space-x-2">
// 														<FaMicroscope className="w-3 h-3 text-white opacity-80" />
// 														<span className="text-sm opacity-90">Vi sinh</span>
// 													</div>
// 													<span className="text-lg font-bold">{analysisWidgetData.analysis.biology}</span>
// 												</div>
// 												<div className="flex justify-between items-center">
// 													<div className="flex items-center space-x-2">
// 														<FaQuestion className="w-3 h-3 text-white opacity-80" />
// 														<span className="text-sm opacity-90">Chưa phân loại</span>
// 													</div>
// 													<span className="text-lg font-bold">{analysisWidgetData.analysis.unknown}</span>
// 												</div>
// 											</div>
// 										</div>
// 									</div>

// 									{/* Column 2: Sample and External Lab */}
// 									<div className="space-y-4">
// 										{/* Sample Overview Card - white background */}
// 										<div
// 											className="bg-white rounded-xl p-6 shadow-sm border cursor-pointer hover:shadow-lg transition-shadow duration-200"
// 											onClick={() => openProcessingSampleWithParams()}
// 										>
// 											<div className="flex items-center space-x-3 mb-4">
// 												<div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
// 													<FaVial className="w-5 h-5" />
// 												</div>
// 												<div>
// 													<div className="text-start font-medium text-gray-900">Mẫu thử</div>
// 													<div className="text-sm text-gray-500">Trạng thái xử lý</div>
// 												</div>
// 											</div>
// 											<div className="space-y-3">
// 												<div
// 													className="flex justify-between items-center cursor-pointer hover:bg-blue-50 rounded transition-all duration-200"
// 													onClick={(e) => {
// 														e.stopPropagation();
// 														openProcessingSampleWithParams({ status: 'fast' });
// 													}}
// 												>
// 													<span className="text-sm text-blue-600 font-semibold underline">Khẩn</span>
// 													<span className="text-xl font-bold text-gray-900">{analysisWidgetData.sample.fast}</span>
// 												</div>
// 												<div
// 													className="flex justify-between items-center cursor-pointer hover:bg-blue-50 rounded transition-all duration-200"
// 													onClick={(e) => {
// 														e.stopPropagation();
// 														openProcessingSampleWithParams({ status: 'normal' });
// 													}}
// 												>
// 													<span className="text-sm text-blue-600 font-semibold underline">Bình thường</span>
// 													<span className="text-xl font-bold text-gray-900">{analysisWidgetData.sample.normal}</span>
// 												</div>
// 											</div>
// 										</div>

// 										{/* External Lab Card - white background */}
// 										<div
// 											className="bg-white rounded-xl p-6 shadow-sm border cursor-pointer hover:shadow-lg transition-shadow duration-200"
// 											onClick={() => openProcessingSampleWithParams({ protocol_source: ['EX'] })}
// 										>
// 											<div className="flex items-center space-x-3 mb-4">
// 												<div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
// 													<FaCog className="w-5 h-5" />
// 												</div>
// 												<div>
// 													<div className="text-start font-medium text-gray-900">Thầu phụ</div>
// 													<div className="text-sm text-gray-500">Mẫu gửi thầu phụ</div>
// 												</div>
// 											</div>
// 											<div className="space-y-3">
// 												<div className="flex justify-between items-center">
// 													<span className="text-sm text-gray-600">Chỉ tiêu</span>
// 													<span className="text-xl font-bold text-gray-900">{analysisWidgetData.ex.analysis}</span>
// 												</div>
// 												<div className="flex justify-between items-center">
// 													<span className="text-sm text-gray-600">Mẫu thử</span>
// 													<span className="text-xl font-bold text-gray-900">{analysisWidgetData.ex.sample}</span>
// 												</div>
// 											</div>
// 										</div>
// 									</div>

// 									{/* Column 3: My Work Cards - split into two */}
// 									<div className="space-y-4">
// 										{/* Handover Work Card */}
// 										<div
// 											className="bg-white rounded-xl p-6 shadow-sm border cursor-pointer hover:shadow-lg transition-shadow duration-200"
// 											onClick={() => openProcessingSampleWithParams({ handover_by: currentUser.identity_uid })}
// 										>
// 											<div className="flex items-center space-x-3 mb-4">
// 												<div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
// 													<FaUsers className="w-5 h-5" />
// 												</div>
// 												<div>
// 													<div className="text-start font-medium text-gray-900">Bàn giao</div>
// 													<div className="text-sm text-gray-500">Mẫu giao nhận</div>
// 												</div>
// 											</div>
// 											<div className="space-y-3">
// 												<div className="flex justify-between items-center">
// 													<span className="text-sm text-gray-600">Giao mẫu</span>
// 													<span className="text-xl font-bold text-gray-900">
// 														{analysisWidgetData.myWork.handoverSample}
// 													</span>
// 												</div>
// 												<div
// 													className="flex justify-between items-center cursor-pointer hover:bg-blue-50 rounded transition-all duration-200"
// 													onClick={(e) => {
// 														e.stopPropagation();
// 														openProcessingSampleWithParams({
// 															handover_by: currentUser.identity_uid,
// 															handover_date: 'today',
// 														});
// 													}}
// 												>
// 													<span className="text-sm text-blue-600 font-semibold underline">Giao hôm nay</span>
// 													<span className="text-xl font-bold text-gray-900">
// 														{analysisWidgetData.myWork.handoverToday}
// 													</span>
// 												</div>
// 											</div>
// 										</div>

// 										{/* Task Work Card */}
// 										<div
// 											className="bg-white rounded-xl p-6 shadow-sm border cursor-pointer hover:shadow-lg transition-shadow duration-200"
// 											onClick={() =>
// 												openProcessingAnalysisWithParams({ technician_uid: currentUser.role.technician_alias })
// 											}
// 										>
// 											<div className="flex items-center space-x-3 mb-4">
// 												<div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
// 													<FaClipboardList className="w-5 h-5" />
// 												</div>
// 												<div>
// 													<div className="text-start font-medium text-gray-900">Cá nhân</div>
// 													<div className="text-sm text-gray-500">Được phân công</div>
// 												</div>
// 											</div>
// 											<div className="space-y-3">
// 												<div className="flex justify-between items-center">
// 													<span className="text-sm text-gray-600">Phép thử được giao</span>
// 													<span className="text-xl font-bold text-gray-900">
// 														{analysisWidgetData.myWork.testsAssigned}
// 													</span>
// 												</div>
// 												<div
// 													className="flex justify-between items-center cursor-pointer hover:bg-blue-50 rounded transition-all duration-200"
// 													onClick={(e) => {
// 														e.stopPropagation();
// 														openProcessingSampleWithParams({
// 															technician_uid: [currentUser.identity_uid],
// 															deadline: 'today',
// 														});
// 													}}
// 												>
// 													<span className="text-sm text-blue-600 font-semibold underline">Hôm nay</span>
// 													<span className="text-xl font-bold text-gray-900">
// 														{analysisWidgetData.myWork.testToCompleteToday}
// 													</span>
// 												</div>
// 											</div>
// 										</div>
// 									</div>
// 								</div>

// 								{/* Today's Tasks Table */}
// 								<div className="bg-white rounded-xl shadow-sm">
// 									{/* Table Header */}
// 									<div className="p-6 border-b border-gray-200 bg-blue-50 rounded-t-xl flex items-center space-x-3">
// 										<FaClock className="w-5 h-5 text-blue-600" />
// 										<div>
// 											<h3 className="text-lg font-semibold text-blue-800">Chỉ cần hoàn thành trong hôm nay</h3>
// 											<p className="text-start text-sm text-blue-600">{todayTasks.length} chỉ tiêu cần hoàn thành</p>
// 										</div>
// 									</div>

// 									{/* Table Content */}
// 									<div className="overflow-x-auto">
// 										<table className="w-full table-auto">
// 											<thead className="bg-blue-100">
// 												<tr>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider border-b">
// 														Mã mẫu
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider border-b">
// 														Nền mẫu
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider border-b">
// 														Chỉ tiêu
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider border-b">
// 														Nguồn
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider border-b">
// 														Phương pháp
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider border-b">
// 														Kết quả
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider border-b">
// 														Đơn vị
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider border-b">
// 														Hạn hoàn thành
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider border-b">
// 														Phân công
// 													</th>
// 												</tr>
// 											</thead>
// 											<tbody className="bg-white divide-y divide-blue-100">
// 												{todayTasks.map((task, index) => (
// 													<tr key={task.id} className="hover:bg-blue-50 transition-colors duration-150">
// 														<td className="px-6 py-4 text-left text-sm font-medium text-blue-600">{task.sample_uid}</td>
// 														<td className="px-6 py-4 text-left text-sm text-gray-600">{task.matrix}</td>
// 														<td className="px-6 py-4 text-left text-sm text-gray-900">{task.parameter_name}</td>
// 														<td className="px-6 py-4 text-left text-sm text-gray-600">{task.protocol_source}</td>
// 														<td className="px-6 py-4 text-left text-sm text-gray-600">{task.protocol_code}</td>
// 														<td className="px-6 py-4 text-left text-sm text-gray-600">
// 															<div dangerouslySetInnerHTML={{ __html: task.result_value }} />
// 														</td>
// 														<td className="px-6 py-4 text-left text-sm text-gray-600">
// 															<div dangerouslySetInnerHTML={{ __html: task.result_unit }} />
// 														</td>
// 														<td className="px-6 py-4 text-left text-sm text-blue-600 font-medium">
// 															{new Date(task.deadline).toLocaleDateString('vi-VN')}
// 														</td>
// 														<td className="px-6 py-4 text-left text-sm text-gray-600">{task.technician_uid}</td>
// 													</tr>
// 												))}
// 											</tbody>
// 										</table>
// 									</div>

// 									{/* Table Footer */}
// 									<div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
// 										<div className="flex items-center justify-between text-sm text-gray-600">
// 											<span>Hiển thị {todayTasks.length} chỉ tiêu</span>
// 										</div>
// 									</div>
// 								</div>
// 							</>
// 						)}

// 						{/* Samples View */}
// 						{activeView === 'samples' && (
// 							<>
// 								{/* Samples Header */}
// 								<div className="flex items-center justify-between">
// 									<h2 className="text-2xl font-semibold text-gray-900">Mẫu thử bàn giao</h2>
// 									<button
// 										onClick={() => openQRScanner()}
// 										className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
// 									>
// 										<FaQrcode className="w-4 h-4" />
// 										<span>Quét QR</span>
// 									</button>
// 								</div>

// 								{/* Handover Statistics Cards */}
// 								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
// 									<div className="bg-white rounded-xl p-4 shadow-sm border">
// 										<div className="flex items-center space-x-3">
// 											<div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
// 												<FaCalendarAlt className="w-5 h-5" />
// 											</div>
// 											<div>
// 												<div className="text-2xl font-bold text-gray-900">{handoverStats.todayHandover}</div>
// 												<div className="text-sm text-gray-500">Mẫu nhận bàn giao hôm nay</div>
// 											</div>
// 										</div>
// 									</div>

// 									<div className="bg-white rounded-xl p-4 shadow-sm border">
// 										<div className="flex items-center space-x-3">
// 											<div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
// 												<FaBoxOpen className="w-5 h-5" />
// 											</div>
// 											<div>
// 												<div className="text-2xl font-bold text-gray-900">{handoverStats.totalPendingHandover}</div>
// 												<div className="text-sm text-gray-500">Tổng mẫu đang nhận bàn giao</div>
// 											</div>
// 										</div>
// 									</div>
// 								</div>

// 								{/* Handover Samples Table */}
// 								<div className="bg-white rounded-xl shadow-sm">
// 									{/* Table Header */}
// 									<div className="p-6 border-b border-gray-200 bg-green-50 rounded-t-xl flex items-center space-x-3">
// 										<FaBoxOpen className="w-5 h-5 text-green-600" />
// 										<div>
// 											<h3 className="text-lg font-semibold text-green-800">Danh sách mẫu bàn giao</h3>
// 											<p className="text-start text-sm text-green-600">{handoverSamples.length} mẫu đã bàn giao</p>
// 										</div>
// 									</div>

// 									{/* Table Content */}
// 									<div className="overflow-x-auto">
// 										<table className="w-full table-auto">
// 											<thead className="bg-green-100">
// 												<tr>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider border-b">
// 														Mã mẫu
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider border-b">
// 														Nền mẫu
// 													</th>
// 													<th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider border-b">
// 														Người nhận bàn giao
// 													</th>
// 												</tr>
// 											</thead>
// 											<tbody className="bg-white divide-y divide-green-100">
// 												{handoverSamples.map((sample) => (
// 													<tr key={sample.id} className="hover:bg-green-50 transition-colors duration-150">
// 														<td className="px-6 py-4 text-left text-sm font-medium text-green-600">
// 															{sample.sample_uid}
// 														</td>
// 														<td className="px-6 py-4 text-left text-sm text-gray-600">{sample.matrix}</td>
// 														<td className="px-6 py-4 text-left text-sm text-gray-900">
// 															{sample.handover_info.map((info, index) => (
// 																<p key={index} className="mb-2 last:mb-0">
// 																	- <span className="font-semibold">{info.handover_by_name}</span> nhận bàn giao
// 																	{info.volume && info.volume !== '' && (
// 																		<span className="font-semibold"> {info.volume} mẫu</span>
// 																	)}{' '}
// 																	vào lúc{' '}
// 																	<span className="font-semibold">
// 																		{new Date(new Date(info.handover_at).getTime() + 7 * 60 * 60 * 1000).toLocaleString(
// 																			'vi-VN',
// 																			{
// 																				day: '2-digit',
// 																				month: '2-digit',
// 																				year: 'numeric',
// 																				hour: '2-digit',
// 																				minute: '2-digit',
// 																			},
// 																		)}
// 																	</span>
// 																</p>
// 															))}
// 														</td>
// 													</tr>
// 												))}
// 											</tbody>
// 										</table>
// 									</div>

// 									{/* Table Footer */}
// 									<div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
// 										<div className="flex items-center justify-between text-sm text-gray-600">
// 											<span>Hiển thị {handoverSamples.length} mẫu</span>
// 											<div className="text-xs text-gray-500">
// 												Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}
// 											</div>
// 										</div>
// 									</div>
// 								</div>
// 							</>
// 						)}

// 						{/* Document Editor View */}
// 						{activeView === 'editor' && (
// 							<>
// 								{/* Editor Content */}
// 								<div className="h-full">
// 									<DocumentEditor />
// 								</div>
// 							</>
// 						)}

// 						{/* Lab File View */}
// 						{activeView === 'document' && (
// 							<>
// 								{/* File Header */}
// 								<div className="flex items-center justify-between">
// 									<h2 className="text-2xl font-semibold text-gray-900">Quản lý file phòng lab</h2>
// 								</div>

// 								{/* File Content */}
// 								<div className="min-h-screen">
// 									<LabFile />
// 								</div>
// 							</>
// 						)}
// 					</div>
// 				)}
// 			</div>

// 			{/* Click outside to close dropdown */}
// 			{dropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>}

// 			{/* Tooltip */}
// 			{tooltip.show && (
// 				<div
// 					className="fixed bg-gray-900 text-white text-sm px-2 py-1 rounded shadow-lg z-50 pointer-events-none"
// 					style={{
// 						left: tooltip.x,
// 						top: tooltip.y - 12,
// 						transform: 'translateY(-50%)',
// 					}}
// 				>
// 					{tooltip.content}
// 					<div
// 						className="absolute top-1/2 left-0 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"
// 						style={{
// 							transform: 'translateY(-50%) translateX(-100%)',
// 						}}
// 					></div>
// 				</div>
// 			)}

// 			{/* Add custom scrollbar styles */}
// 			<style jsx global>{`
// 				.scrollbar-hide {
// 					-ms-overflow-style: none;
// 					scrollbar-width: none;
// 				}
// 				.scrollbar-hide::-webkit-scrollbar {
// 					display: none;
// 				}
// 			`}</style>
// 		</div>
// 	);
// };

// export default LabDashboard;
