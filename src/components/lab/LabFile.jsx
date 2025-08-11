import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { apiGet, apiPost, apiPut, apiGetBlob } from '../../contexts/helperFunctionCallAPI';
import {
	FaSync,
	FaUpload,
	FaSort,
	FaChevronDown,
	FaEye,
	FaDownload,
	FaEdit,
	FaTrash,
	FaFilter,
	FaUser,
	FaUsers,
	FaSearch,
	FaTimes,
	FaCheck,
	FaSpinner,
	FaExclamationTriangle,
	FaCloudUploadAlt,
	FaInfoCircle,
	FaSearchPlus,
	FaSearchMinus,
	FaList,
	FaCopy,
	FaCheckCircle,
} from 'react-icons/fa';

const LabFile = () => {
	// State management
	const [loading, setLoading] = useState(true);
	const [initialized, setInitialized] = useState(false); // Flag to track initialization
	const [allFiles, setAllFiles] = useState([]);
	const [filteredFiles, setFilteredFiles] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [filesPerPage, setFilesPerPage] = useState(20);
	const [totalPages, setTotalPages] = useState(1);
	const [error, setError] = useState(null);

	// Filter states
	const [currentStatus, setCurrentStatus] = useState(null);
	const [currentMode, setCurrentMode] = useState('personal');
	const [currentSystemFilter, setCurrentSystemFilter] = useState(null);
	const [isSearchMode, setIsSearchMode] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	// Sort state
	const [currentSort, setCurrentSort] = useState({ column: 'createdAt', direction: 'desc' });
	const [sortMenuOpen, setSortMenuOpen] = useState(false);

	// Modal states
	const [uploadModalOpen, setUploadModalOpen] = useState(false);
	const [labResultsModalOpen, setLabResultsModalOpen] = useState(false);
	const [fullscreenModalOpen, setFullscreenModalOpen] = useState(false);
	const [previewModalOpen, setPreviewModalOpen] = useState(false);

	// Upload states
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [selectedTag, setSelectedTag] = useState('Dữ liệu gốc');
	const [selectedSystem, setSelectedSystem] = useState('');
	const [sampleCodes, setSampleCodes] = useState('');

	// Lab results states
	const [currentFileId, setCurrentFileId] = useState(null);
	const [labResults, setLabResults] = useState([]);
	const [labResultsLoading, setLabResultsLoading] = useState(false);
	const [labResultsCurrentPage, setLabResultsCurrentPage] = useState(1);
	const [labResultsItemsPerPage] = useState(20);

	// Selection states for fullscreen mode
	const [selectedRows, setSelectedRows] = useState(new Set());
	const [analysisMatchData, setAnalysisMatchData] = useState([]);

	// Preview states
	const [previewUrl, setPreviewUrl] = useState('');
	const [previewZoom, setPreviewZoom] = useState(1);

	// Equipment list
	const [equipmentList, setEquipmentList] = useState([]);
	const [currentUser, setCurrentUser] = useState(null);

	// File drop zone ref
	const fileDropZoneRef = useRef(null);
	const fileInputRef = useRef(null);

	// Category options
	const categoryOptions = [
		'Ảnh mẫu',
		'Phiếu gửi mẫu',
		'Đơn hàng',
		'Biên bản kết quả thử nghiệm',
		'Phiếu phân tích',
		'Biên bản bàn giao',
		'Dữ liệu gốc',
		'Specification / COA',
		'Tài liệu khác',
	];

	// Utility functions
	const isAdmin = () => {
		return currentUser?.role?.staff_admin === true;
	};

	const updateUIForUserRole = () => {
		// This function can be used to update UI based on user role
		// For now, admin status is checked inline where needed
	};

	const formatFileSize = (bytes) => {
		if (!bytes) return '0 KB';
		const kb = bytes / 1024;
		if (kb < 1024) {
			return `${kb.toFixed(2)} KB`;
		}
		const mb = kb / 1024;
		return `${mb.toFixed(2)} MB`;
	};

	const formatDate = (dateString) => {
		if (!dateString) return '-';
		const date = new Date(dateString);
		return date.toLocaleDateString('vi-VN');
	};

	const getProcessingStatusText = (status) => {
		switch (status) {
			case 'PENDING_APPROVAL':
				return 'Chờ duyệt';
			case 'APPROVED':
				return 'Đã duyệt';
			case 'REJECTED':
				return 'Từ chối';
			case 'IDLE':
				return 'Chờ xử lý';
			case 'SCHEDULED':
				return 'Đã đặt lịch';
			case 'ERROR':
				return 'Lỗi';
			default:
				return status || 'Không xác định';
		}
	};

	const getStatusClass = (status) => {
		switch (status) {
			case 'APPROVED':
			case 'COMPLETED':
				return 'bg-green-100 text-green-800';
			case 'PENDING':
			case 'PENDING_APPROVAL':
			case 'IN_PROGRESS':
			case 'DRAFT':
			case 'IDLE':
			case 'SCHEDULED':
				return 'bg-blue-100 text-blue-800';
			case 'REJECTED':
			case 'ERROR':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	// API functions
	const fetchUser = async () => {
		try {
			const response = await apiPost('https://pink.irdop.org/ab4dg2/auth/me');

			if (response.status === 200 && response.data) {
				setCurrentUser(response.data);
			} else {
				console.error('Error fetching user info:', response.data?.message);
				// Set default user if fetch fails
				setCurrentUser({
					identity_name: 'User',
					role: { staff_admin: false },
				});
			}
		} catch (error) {
			console.error('Error fetching user info:', error);
			// Set default user if fetch fails
			setCurrentUser({
				identity_name: 'User',
				role: { staff_admin: false },
			});
		}
	};

	const fetchEquipmentList = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/get/list_enum/equipment');

			if (response.status === 200) {
				const data = response.data;
				setEquipmentList(Array.isArray(data) ? data : []);
			} else {
				console.error('Error fetching equipment list:', response.data?.message);
				setEquipmentList([]);
			}
		} catch (error) {
			console.error('Error fetching equipment list:', error);
			setEquipmentList([]);
		}
	};

	const fetchIdentityNames = async (files) => {
		try {
			const identityUIDs = [
				...new Set(files.filter((file) => file.creatorIdentityUID).map((file) => file.creatorIdentityUID)),
			];

			if (identityUIDs.length === 0) return {};

			const response = await apiPost('https://pink.irdop.org/ab4dg2/identity/get/by_uids', {
				uids: identityUIDs,
			});

			if (response.status === 200 && Array.isArray(response.data)) {
				const identityNames = {};
				response.data.forEach((identity) => {
					if (identity.uid) {
						identityNames[identity.uid] = identity.identity_name || 'Unknown';
					}
				});
				return identityNames;
			}
		} catch (error) {
			console.error('Error fetching identity names:', error);
		}
		return {};
	};

	const loadFiles = async () => {
		try {
			setLoading(true);
			setError(null);

			const requestBody = {
				tag: ['Biên bản kết quả thử nghiệm', 'Dữ liệu gốc'],
				mode: currentMode,
				page: currentPage,
				filesPerPage: filesPerPage,
				columnSort: currentSort.column,
				sortBy: currentSort.direction,
			};

			// Add filters to request body and URL query params
			// Preserve existing query params (especially 'view' from LabDashboard)
			const queryParams = new URLSearchParams(window.location.search);
			queryParams.set('mode', currentMode);
			queryParams.set('page', currentPage.toString());
			queryParams.set('filesPerPage', filesPerPage.toString());
			queryParams.set('sort', `${currentSort.column}-${currentSort.direction}`);

			if (currentStatus) {
				requestBody.status = currentStatus;
				queryParams.set('status', currentStatus);
			} else {
				queryParams.delete('status');
			}

			if (currentSystemFilter) {
				requestBody.systemTags = [currentSystemFilter];
				queryParams.set('system', currentSystemFilter);
			} else {
				queryParams.delete('system');
			}

			// Remove search param if this is not a search operation
			queryParams.delete('search');

			// Update URL with query parameters (without navigation)
			const newUrl = `${window.location.pathname}?${queryParams.toString()}`;
			window.history.replaceState(null, '', newUrl);

			const response = await apiPost('https://red.irdop.org/v1/file/get/by_tag', requestBody);

			if (response.status === 200 && Array.isArray(response.data)) {
				const files = response.data;

				// Fetch identity names for the files
				const identityNames = await fetchIdentityNames(files);

				// Add creator names to files
				const filesWithNames = files.map((file) => ({
					...file,
					creatorName: identityNames[file.creatorIdentityUID] || 'Unknown',
				}));

				setAllFiles(filesWithNames);
				setFilteredFiles(filesWithNames);
				setTotalPages(Math.ceil(filesWithNames.length / filesPerPage));
			} else {
				throw new Error(response.data?.message || 'Không thể tải danh sách file');
			}
		} catch (error) {
			console.error('Load files error:', error);
			setError(error.message || 'Không thể tải danh sách file. Vui lòng thử lại sau.');
			setAllFiles([]);
			setFilteredFiles([]);
		} finally {
			setLoading(false);
		}
	};

	const searchFiles = async (term) => {
		try {
			setLoading(true);
			setError(null);

			const requestBody = {
				tag: ['Biên bản kết quả thử nghiệm', 'Dữ liệu gốc'],
				searchTerm: term,
				mode: currentMode,
				page: currentPage,
				filesPerPage: filesPerPage,
				columnSort: currentSort.column,
				sortBy: currentSort.direction,
			};

			// Add filters to request body and URL query params
			// Preserve existing query params (especially 'view' from LabDashboard)
			const queryParams = new URLSearchParams(window.location.search);
			queryParams.set('mode', currentMode);
			queryParams.set('page', currentPage.toString());
			queryParams.set('filesPerPage', filesPerPage.toString());
			queryParams.set('sort', `${currentSort.column}-${currentSort.direction}`);
			queryParams.set('search', term);

			if (currentStatus) {
				requestBody.status = currentStatus;
				queryParams.set('status', currentStatus);
			} else {
				queryParams.delete('status');
			}

			if (currentSystemFilter) {
				requestBody.systemTags = [currentSystemFilter];
				queryParams.set('system', currentSystemFilter);
			} else {
				queryParams.delete('system');
			}

			// Update URL with query parameters (without navigation)
			const newUrl = `${window.location.pathname}?${queryParams.toString()}`;
			window.history.replaceState(null, '', newUrl);

			const response = await apiPost('https://red.irdop.org/v1/file/get/by_tag', requestBody);

			if (response.status === 200 && Array.isArray(response.data)) {
				const files = response.data;

				// Fetch identity names for the files
				const identityNames = await fetchIdentityNames(files);

				// Add creator names to files
				const filesWithNames = files.map((file) => ({
					...file,
					creatorName: identityNames[file.creatorIdentityUID] || 'Unknown',
				}));

				setAllFiles(filesWithNames);
				setFilteredFiles(filesWithNames);
				setTotalPages(Math.ceil(filesWithNames.length / filesPerPage));
			} else {
				throw new Error(response.data?.message || 'Không thể tìm kiếm file');
			}
		} catch (error) {
			console.error('Search files error:', error);
			setError(error.message || 'Không thể tìm kiếm file. Vui lòng thử lại sau.');
			setAllFiles([]);
			setFilteredFiles([]);
		} finally {
			setLoading(false);
		}
	};

	const loadLabResults = async (fileId) => {
		if (!fileId) return;

		try {
			setLabResultsLoading(true);

			const requestBody = {
				fileId: fileId,
				page: labResultsCurrentPage,
				itemsPerPage: labResultsItemsPerPage,
				columnSort: 'id',
				sortBy: 'asc',
			};

			const response = await apiPost('https://red.irdop.org/v1/lab/temporary_result/get/by_file_id', requestBody);

			if (response.status === 200 && response.data) {
				const results = response.data.result || response.data || [];
				setLabResults(results);
			} else {
				throw new Error(response.data?.message || 'Không thể tải danh sách chỉ tiêu');
			}
		} catch (error) {
			console.error('Load lab results error:', error);
			setError(error.message || 'Không thể tải danh sách chỉ tiêu. Vui lòng thử lại sau.');
		} finally {
			setLabResultsLoading(false);
		}
	};

	// Event handlers
	const handleSearch = () => {
		const term = searchTerm.trim();
		if (term) {
			setIsSearchMode(true);
			setCurrentPage(1);
			searchFiles(term);
		} else {
			clearSearch();
		}
	};

	const clearSearch = () => {
		setSearchTerm('');
		setIsSearchMode(false);
		setCurrentPage(1);

		// Update URL to remove search parameter
		const queryParams = new URLSearchParams(window.location.search);
		queryParams.delete('search');
		const newUrl = `${window.location.pathname}?${queryParams.toString()}`;
		window.history.replaceState(null, '', newUrl);

		loadFiles();
	};

	// Function to load state from URL query parameters
	const loadStateFromURL = () => {
		const urlParams = new URLSearchParams(window.location.search);

		const mode = urlParams.get('mode');
		const page = urlParams.get('page');
		const filesPerPageParam = urlParams.get('filesPerPage');
		const sort = urlParams.get('sort');
		const status = urlParams.get('status');
		const system = urlParams.get('system');
		const search = urlParams.get('search');

		if (mode && (mode === 'personal' || mode === 'all')) {
			setCurrentMode(mode);
		}

		if (page && !isNaN(parseInt(page))) {
			setCurrentPage(parseInt(page));
		}

		if (filesPerPageParam && !isNaN(parseInt(filesPerPageParam))) {
			setFilesPerPage(parseInt(filesPerPageParam));
		}

		if (sort) {
			const [column, direction] = sort.split('-');
			if (column && direction && (direction === 'asc' || direction === 'desc')) {
				setCurrentSort({ column, direction });
			}
		}

		if (status) {
			setCurrentStatus(status);
		}

		if (system) {
			setCurrentSystemFilter(system);
		}

		if (search) {
			setSearchTerm(search);
			setIsSearchMode(true);
		}
	};

	const handleStatusChange = (status) => {
		setCurrentStatus(status || null);
		setCurrentPage(1);
		if (isSearchMode && searchTerm) {
			searchFiles(searchTerm);
		} else {
			loadFiles();
		}
	};

	const handleSystemFilterChange = (system) => {
		setCurrentSystemFilter(system || null);
		setCurrentPage(1);
		if (isSearchMode && searchTerm) {
			searchFiles(searchTerm);
		} else {
			loadFiles();
		}
	};

	const toggleMode = (mode) => {
		setCurrentMode(mode);
		setCurrentPage(1);
		if (isSearchMode && searchTerm) {
			searchFiles(searchTerm);
		} else {
			loadFiles();
		}
	};

	const handleSort = (column, direction) => {
		setCurrentSort({ column, direction });
		setCurrentPage(1);
		setSortMenuOpen(false);
		if (isSearchMode && searchTerm) {
			searchFiles(searchTerm);
		} else {
			loadFiles();
		}
	};

	const handleFileAction = async (fileRecord, mode) => {
		// Check if file has PENDING_APPROVAL status and mode is view
		if (fileRecord.processingStatus === 'PENDING_APPROVAL' && mode === 'view') {
			const url = `/confirm-result?fileId=${fileRecord.id}&fileName=${encodeURIComponent(
				fileRecord.originInfo?.fileName || 'File',
			)}`;
			window.open(url, '_blank');
			return;
		}

		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: mode,
				fileRecord: fileRecord,
			});

			if (response.status === 200 && response.data) {
				const downloadUrl = response.data;
				if (mode === 'view') {
					setPreviewUrl(downloadUrl);
					setPreviewModalOpen(true);
				} else if (mode === 'download') {
					// Use apiGetBlob for download
					const blobResponse = await apiGetBlob(downloadUrl);
					if (blobResponse.status === 200) {
						const blob = blobResponse.data;
						const url = window.URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = fileRecord.originInfo?.fileName || 'download';
						document.body.appendChild(a);
						a.click();
						window.URL.revokeObjectURL(url);
						document.body.removeChild(a);
						toast.success('Tải xuống thành công!');
					} else {
						throw new Error(blobResponse.data?.message || 'Không thể tải xuống file');
					}
				}
			} else {
				throw new Error(response.data?.message || `Không thể ${mode === 'view' ? 'xem' : 'tải xuống'} file`);
			}
		} catch (error) {
			console.error(`${mode} failed:`, error);
			const errorMessage = error.message || `Có lỗi xảy ra khi ${mode === 'view' ? 'xem' : 'tải xuống'} file`;
			setError(errorMessage);
			toast.error(errorMessage);
		}
	};

	const openLabResultsModal = (fileRecord) => {
		setCurrentFileId(fileRecord.id);
		setLabResultsCurrentPage(1);
		setLabResultsModalOpen(true);
		loadLabResults(fileRecord.id);
	};

	const openFullscreenModal = (fileRecord) => {
		setCurrentFileId(fileRecord.id);
		setLabResultsCurrentPage(1);
		setFullscreenModalOpen(true);
		loadLabResults(fileRecord.id);
	};

	// File upload handlers
	const handleFileSelect = (event) => {
		const files = Array.from(event.target.files || event.dataTransfer.files);

		files.forEach((file) => {
			if (!selectedFiles.find((f) => f.name === file.name && f.size === file.size)) {
				setSelectedFiles((prev) => [
					...prev,
					{
						name: file.name,
						size: file.size,
						type: file.type || 'application/octet-stream',
						originalFile: file,
					},
				]);
			}
		});

		if (event.target) {
			event.target.value = '';
		}
	};

	const removeSelectedFile = (index) => {
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const validateSelectedFiles = () => {
		if (selectedTag === 'Dữ liệu gốc') {
			const pdfFiles = selectedFiles.filter(
				(file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
			);
			const nonPdfFiles = selectedFiles.filter(
				(file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'),
			);

			return selectedFiles.length > 0 && pdfFiles.length === nonPdfFiles.length && pdfFiles.length > 0;
		} else {
			return selectedFiles.length > 0;
		}
	};

	const handleUpload = async () => {
		if (selectedFiles.length === 0 || uploading) return;

		// Validate for "Dữ liệu gốc" tag
		if (selectedTag === 'Dữ liệu gốc') {
			if (!selectedSystem) {
				setError('Vui lòng chọn máy');
				return;
			}

			if (!sampleCodes.trim()) {
				setError('Mã mẫu là bắt buộc đối với Dữ liệu gốc');
				return;
			}

			if (!validateSelectedFiles()) {
				setError('Số lượng file PDF phải bằng số lượng file khác');
				return;
			}
		}

		setUploading(true);
		setError(null);

		try {
			const sampleCodeList = sampleCodes
				? sampleCodes
						.split(',')
						.map((code) => code.trim())
						.filter((code) => code)
				: [];

			let successCount = 0;
			let errorCount = 0;

			for (let i = 0; i < selectedFiles.length; i++) {
				const file = selectedFiles[i];

				try {
					const uploadPayload = {
						originInfo: {
							fileName: file.name,
							mimeType: file.type,
							fileSize: file.size,
						},
						objectPath: 'activities/LAB',
						userTags: [selectedTag],
						foreignKeyUIDs: sampleCodeList,
					};

					if (selectedTag === 'Dữ liệu gốc' && selectedSystem) {
						uploadPayload.systemTags = [selectedSystem];
					}

					const uploadResponse = await apiPost('https://red.irdop.org/v1/file/get/upload_link', uploadPayload);

					if (uploadResponse.status === 200 && uploadResponse.data) {
						const { url, id } = uploadResponse.data;

						// Upload file to the signed URL
						const fileUploadResponse = await fetch(url, {
							method: 'PUT',
							body: file.originalFile,
							headers: {
								'Content-Type': file.type,
							},
						});

						if (fileUploadResponse.ok && id) {
							// Update file status
							const updateResponse = await apiPost('https://red.irdop.org/v1/file/update/file', {
								id: id,
								updateData: {
									objectStatus: 'OK',
									processingStatus: 'IDLE',
								},
							});

							if (updateResponse.status === 200) {
								successCount++;
							} else {
								console.error('Failed to update file status:', updateResponse.data?.message);
								errorCount++;
							}
						} else {
							console.error('File upload to signed URL failed');
							errorCount++;
						}
					} else {
						console.error('Failed to get upload link:', uploadResponse.data?.message);
						errorCount++;
					}
				} catch (error) {
					console.error('Upload failed for file:', file.name, error);
					errorCount++;
				}
			}

			if (errorCount === 0) {
				// Success
				toast.success(`Upload thành công ${successCount} file!`);
				setTimeout(() => {
					closeUploadModal();
					loadFiles();
				}, 1000);
			} else {
				toast.error(`Upload hoàn tất: ${successCount} thành công, ${errorCount} lỗi`);
			}
		} catch (error) {
			console.error('Upload process failed:', error);
			toast.error('Upload thất bại. Vui lòng thử lại.');
		} finally {
			setUploading(false);
		}
	};

	const closeUploadModal = () => {
		setUploadModalOpen(false);
		setSelectedFiles([]);
		setSelectedTag('Dữ liệu gốc');
		setSelectedSystem('');
		setSampleCodes('');
		setError(null);
	};

	// Copy to clipboard function
	const copyToClipboard = async (text) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Đã sao chép vào clipboard');
		} catch (error) {
			console.error('Copy failed:', error);
			toast.error('Không thể sao chép');
		}
	};
	const handleDragOver = (e) => {
		e.preventDefault();
		if (fileDropZoneRef.current) {
			fileDropZoneRef.current.classList.add('border-blue-500', 'bg-blue-50');
		}
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		if (fileDropZoneRef.current) {
			fileDropZoneRef.current.classList.remove('border-blue-500', 'bg-blue-50');
		}
	};

	const handleDrop = (e) => {
		e.preventDefault();
		if (fileDropZoneRef.current) {
			fileDropZoneRef.current.classList.remove('border-blue-500', 'bg-blue-50');
		}
		handleFileSelect(e);
	};

	// Initialize data
	useEffect(() => {
		const initializeApp = async () => {
			await fetchUser();
			await fetchEquipmentList();
			loadStateFromURL(); // Load state from URL first
			setInitialized(true); // Mark as initialized after loading URL state
		};

		initializeApp();
	}, []);

	// Load files when state changes - optimized to prevent excessive API calls
	useEffect(() => {
		// Only run if component is initialized to prevent initial unnecessary calls
		if (!initialized) return;

		// Add a small debounce to prevent rapid successive calls
		const timeoutId = setTimeout(() => {
			if (isSearchMode && searchTerm) {
				searchFiles(searchTerm);
			} else if (!isSearchMode) {
				loadFiles();
			}
		}, 100); // 100ms debounce

		return () => clearTimeout(timeoutId);
	}, [
		initialized,
		currentPage,
		filesPerPage,
		currentSort,
		currentStatus,
		currentSystemFilter,
		currentMode,
		isSearchMode,
		searchTerm,
	]);

	const sortOptions = [
		{ key: 'createdAt-desc', label: 'Ngày tạo (Mới nhất)' },
		{ key: 'createdAt-asc', label: 'Ngày tạo (Cũ nhất)' },
		{ key: 'modifiedAt-desc', label: 'Ngày sửa đổi (Mới nhất)' },
		{ key: 'modifiedAt-asc', label: 'Ngày sửa đổi (Cũ nhất)' },
		{ key: 'userTags-asc', label: 'Phân loại (A-Z)' },
		{ key: 'userTags-desc', label: 'Phân loại (Z-A)' },
	];

	const getCurrentSortLabel = () => {
		const key = `${currentSort.column}-${currentSort.direction}`;
		const option = sortOptions.find((opt) => opt.key === key);
		return option?.label || 'Ngày tạo (Mới nhất)';
	};

	return (
		<div className="w-full h-full bg-gray-50">
			{/* Header Controls */}
			<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
				{/* First Row - Main Controls */}
				<div className="flex flex-wrap items-center gap-4 mb-2">
					<div
						className="flex items-center gap-4 overflow-x-auto min-w-0 flex-1"
						style={{
							scrollbarWidth: 'none' /* Firefox */,
							msOverflowStyle: 'none' /* Internet Explorer 10+ */,
						}}
					>
						<style jsx>{`
							.flex.items-center.gap-4.overflow-x-auto.min-w-0.flex-1::-webkit-scrollbar {
								display: none; /* Safari and Chrome */
							}
						`}</style>
						<button
							onClick={() => (isSearchMode && searchTerm ? searchFiles(searchTerm) : loadFiles())}
							className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
							disabled={loading}
						>
							{loading ? <FaSpinner className="animate-spin" /> : <FaSync />}
							<span>Tải lại</span>
						</button>

						<button
							onClick={() => setUploadModalOpen(true)}
							className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
						>
							<FaUpload />
							<span>Upload File</span>
						</button>

						<div className="flex items-center space-x-2 whitespace-nowrap">
							<label className="text-sm font-medium text-gray-700">Trạng thái:</label>
							<select
								value={currentStatus || ''}
								onChange={(e) => handleStatusChange(e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							>
								<option value="">Tất cả</option>
								<option value="IDLE">Chờ xử lý</option>
								<option value="SCHEDULED">Đã đặt lịch</option>
								<option value="ERROR">Lỗi</option>
								<option value="PENDING_APPROVAL">Chờ duyệt</option>
								<option value="REJECTED">Từ chối</option>
								<option value="APPROVED">Đã duyệt</option>
							</select>
						</div>

						<div className="flex items-center space-x-2 whitespace-nowrap">
							<label className="text-sm font-medium text-gray-700">Máy:</label>
							<select
								value={currentSystemFilter || ''}
								onChange={(e) => handleSystemFilterChange(e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							>
								<option value="">Tất cả máy</option>
								{equipmentList.map((equipment) => (
									<option key={equipment} value={equipment}>
										{equipment}
									</option>
								))}
							</select>
						</div>

						{/* Mode Toggle Switch */}
						<div className="flex items-center space-x-2 whitespace-nowrap">
							<label className="text-sm font-medium text-gray-700">Phạm vi:</label>
							<div className="flex bg-gray-100 rounded-lg p-1">
								<button
									onClick={() => toggleMode('personal')}
									className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-1 ${
										currentMode === 'personal'
											? 'bg-blue-600 text-white shadow-sm'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									<FaUser className="w-3 h-3" />
									<span>Cá nhân</span>
								</button>
								<button
									onClick={() => toggleMode('all')}
									className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-1 ${
										currentMode === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
									}`}
								>
									<FaUsers className="w-3 h-3" />
									<span>Toàn bộ</span>
								</button>
							</div>
						</div>

						{/* Sort Dropdown */}
						<div className="relative whitespace-nowrap">
							<button
								onClick={() => setSortMenuOpen(!sortMenuOpen)}
								className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 transition-colors"
							>
								<FaSort />
								<span>Sắp xếp: {getCurrentSortLabel()}</span>
								<FaChevronDown className={`transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
							</button>

							{sortMenuOpen && (
								<div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
									{sortOptions.map((option) => (
										<button
											key={option.key}
											onClick={() => {
												const [column, direction] = option.key.split('-');
												handleSort(column, direction);
											}}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
												option.key === `${currentSort.column}-${currentSort.direction}`
													? 'bg-blue-50 text-blue-600'
													: 'text-gray-700'
											}`}
										>
											{option.label}
											{option.key === `${currentSort.column}-${currentSort.direction}` && (
												<FaCheck className="inline ml-2" />
											)}
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Second Row - Search */}
				<div className="flex items-center justify-end gap-4">
					<div className="flex items-center space-x-2">
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
							placeholder="Tìm kiếm file theo tên..."
							className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[300px]"
						/>
						<button
							onClick={handleSearch}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							<FaSearch />
						</button>
						{isSearchMode && (
							<button
								onClick={clearSearch}
								className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
							>
								<FaTimes />
							</button>
						)}
					</div>
				</div>

				{/* Search Indicator */}
				{isSearchMode && (
					<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
						<span className="text-sm text-blue-700">📝 Đang hiển thị kết quả tìm kiếm cho: "{searchTerm}"</span>
						<button onClick={clearSearch} className="text-sm text-blue-600 hover:text-blue-800 underline">
							Quay về danh sách đầy đủ
						</button>
					</div>
				)}
			</div>

			{/* Error Message */}
			{error && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
					<FaExclamationTriangle />
					<span>{error}</span>
					<button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
						<FaTimes />
					</button>
				</div>
			)}

			{/* File Table */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
				<div className="overflow-x-auto">
					<table className="w-full min-w-[1200px] border-collapse">
						<thead className="bg-blue-600">
							<tr>
								<th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">
									Tên file
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider w-64 border border-gray-400">
									Khóa liên kết
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">
									Trạng thái
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">
									Kích thước
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">
									Ngày sửa đổi
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">
									Người tạo
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">
									Danh mục
								</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider w-40 border border-gray-400">
									Thao tác
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-300">
							{loading ? (
								<tr>
									<td colSpan="8" className="px-3 py-8 text-center border border-gray-300">
										<div className="flex flex-col items-center space-y-4">
											<FaSpinner className="text-4xl text-blue-500 animate-spin" />
											<span className="text-gray-500">Đang tải danh sách file...</span>
										</div>
									</td>
								</tr>
							) : filteredFiles.length === 0 ? (
								<tr>
									<td colSpan="8" className="px-3 py-8 text-center text-gray-500 border border-gray-300">
										{isSearchMode ? `Không tìm thấy file phù hợp với "${searchTerm}"` : 'Không có dữ liệu'}
									</td>
								</tr>
							) : (
								filteredFiles.slice((currentPage - 1) * filesPerPage, currentPage * filesPerPage).map((file) => (
									<tr key={file.id} className="hover:bg-gray-50">
										<td className="px-3 py-2 text-sm text-gray-900 border border-gray-300 text-left">
											{file.originInfo?.fileName || '-'}
										</td>
										<td className="px-3 py-2 text-sm text-gray-900 border border-gray-300 text-left">
											{(file.foreignKeyUIDs || []).length > 0 ? (
												<div className="flex flex-wrap gap-1">
													{file.foreignKeyUIDs.map((key, index) => (
														<span
															key={index}
															className="inline-flex items-center px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors group"
															onClick={() => copyToClipboard(key)}
															title="Click để sao chép"
														>
															{key}
															<FaCopy className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
														</span>
													))}
												</div>
											) : (
												<span className="text-gray-400 text-xs">Không có UID</span>
											)}
										</td>
										<td className="px-3 py-2 border border-gray-300 text-left">
											<span
												className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(
													file.processingStatus,
												)}`}
											>
												{getProcessingStatusText(file.processingStatus)}
											</span>
										</td>
										<td className="px-3 py-2 text-sm text-gray-900 border border-gray-300 text-left">
											{formatFileSize(file.originInfo?.fileSize)}
										</td>
										<td className="px-3 py-2 text-sm text-gray-900 border border-gray-300 text-left">
											{formatDate(file.createdAt)}
										</td>
										<td className="px-3 py-2 text-sm text-gray-900 border border-gray-300 text-left">
											{file.creatorName || 'Unknown'}
										</td>
										<td className="px-3 py-2 text-sm border border-gray-300 text-left">
											<div className="flex flex-wrap gap-1">
												{/* User tags */}
												{(file.userTags || []).map((tag, index) => (
													<span
														key={index}
														className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
														title="User Tag"
													>
														{tag}
													</span>
												))}
												{/* System tags (only show if user tags contain "Dữ liệu gốc") */}
												{(file.userTags || []).includes('Dữ liệu gốc') &&
													(file.systemTags || []).map((tag, index) => (
														<span
															key={`sys-${index}`}
															className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800"
															title="System Tag (Máy)"
														>
															{tag}
														</span>
													))}
												{(file.userTags || []).length === 0 && (file.systemTags || []).length === 0 && '-'}
											</div>
										</td>
										<td className="px-3 py-2 border border-gray-300 text-left">
											<div className="flex space-x-1">
												<button
													onClick={() => handleFileAction(file, 'view')}
													className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
													title="Xem"
												>
													<FaEye />
												</button>
												<button
													onClick={() => handleFileAction(file, 'download')}
													className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
													title="Tải xuống"
												>
													<FaDownload />
												</button>
												<button
													onClick={() => openLabResultsModal(file)}
													className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
													title="Xem chỉ tiêu"
												>
													<FaCloudUploadAlt />
												</button>
												{file.processingStatus === 'PENDING_APPROVAL' && (
													<button
														onClick={() => {
															const url = `/confirm-result?fileId=${file.id}&fileName=${encodeURIComponent(
																file.originInfo?.fileName || 'File',
															)}`;
															window.open(url, '_blank');
														}}
														className="p-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded transition-colors"
														title="Duyệt kết quả"
													>
														<FaCheck />
													</button>
												)}
												{currentUser?.role?.staff_admin && (
													<>
														<button
															className="p-1 text-orange-600 hover:bg-orange-100 rounded transition-colors"
															title="Chỉnh sửa"
														>
															<FaEdit />
														</button>
														<button className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors" title="Xóa">
															<FaTrash />
														</button>
													</>
												)}
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination and Controls */}
				<div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
						{/* Info and files per page control */}
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center space-x-2">
								<label className="text-sm font-medium text-gray-700">Số file/trang:</label>
								<select
									value={filesPerPage}
									onChange={(e) => {
										setFilesPerPage(parseInt(e.target.value));
										setCurrentPage(1);
									}}
									className="px-3 py-1 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									<option value="10">10</option>
									<option value="20">20</option>
									<option value="50">50</option>
									<option value="100">100</option>
								</select>
							</div>
							<div className="text-sm text-gray-500">
								{isSearchMode
									? `Kết quả tìm kiếm: ${filteredFiles.length} file cho "${searchTerm}"`
									: `Tổng số: ${filteredFiles.length} file`}
							</div>
						</div>

						{/* Pagination controls */}
						{totalPages > 1 && (
							<div className="flex items-center space-x-2">
								<span className="text-sm text-gray-500">
									Trang {currentPage} / {totalPages}
								</span>
								<div className="flex space-x-1">
									<button
										onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
										disabled={currentPage === 1}
										className="px-3 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										‹ Trước
									</button>
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										const startPage = Math.max(1, currentPage - 2);
										const page = startPage + i;
										if (page <= totalPages) {
											return (
												<button
													key={page}
													onClick={() => setCurrentPage(page)}
													className={`px-3 py-1 text-sm border rounded ${
														page === currentPage
															? 'bg-blue-600 text-white border-blue-600'
															: 'border-gray-300 bg-white hover:bg-gray-50'
													}`}
												>
													{page}
												</button>
											);
										}
										return null;
									})}
									<button
										onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
										disabled={currentPage === totalPages}
										className="px-3 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Sau ›
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Upload Modal */}
			{uploadModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Biên bản kết quả thử nghiệm</h3>

							{/* Sample Code Input */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Mã mẫu: {selectedTag === 'Dữ liệu gốc' && <span className="text-red-500">*</span>}
								</label>
								<textarea
									value={sampleCodes}
									onChange={(e) => setSampleCodes(e.target.value)}
									className="w-full h-16 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
									placeholder="Nhập các mã mẫu cách nhau bằng dấu phẩy (ví dụ: SP25xXXXX-01, SP25xXXXX-02, ...)"
								/>
							</div>

							{/* Tag and System Selection */}
							<div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Chọn loại tài liệu:</label>
									<div className="space-y-2">
										<label className="flex items-center">
											<input
												type="radio"
												value="Dữ liệu gốc"
												checked={selectedTag === 'Dữ liệu gốc'}
												onChange={(e) => setSelectedTag(e.target.value)}
												className="mr-2"
											/>
											<span>Dữ liệu gốc</span>
										</label>
										<label className="flex items-center">
											<input
												type="radio"
												value="Biên bản kết quả thử nghiệm"
												checked={selectedTag === 'Biên bản kết quả thử nghiệm'}
												onChange={(e) => setSelectedTag(e.target.value)}
												className="mr-2"
											/>
											<span>Biên bản kết quả thử nghiệm</span>
										</label>
									</div>
								</div>

								{selectedTag === 'Dữ liệu gốc' && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Chọn máy: <span className="text-red-500">*</span>
										</label>
										<select
											value={selectedSystem}
											onChange={(e) => setSelectedSystem(e.target.value)}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										>
											<option value="">-- Chọn loại máy --</option>
											{equipmentList.map((equipment) => (
												<option key={equipment} value={equipment}>
													{equipment}
												</option>
											))}
										</select>
									</div>
								)}
							</div>

							{/* File Drop Zone */}
							<div
								ref={fileDropZoneRef}
								className="mb-4 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
								onClick={() => fileInputRef.current?.click()}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							>
								<FaCloudUploadAlt className="text-4xl text-gray-400 mb-2 mx-auto" />
								<div className="text-sm font-medium text-gray-900 mb-1">Kéo thả file vào đây hoặc click để chọn</div>
								<div className="text-sm text-gray-500">Hỗ trợ tất cả các định dạng file</div>
								{selectedTag === 'Dữ liệu gốc' && (
									<div className="text-xs text-yellow-600 mt-2 font-medium">
										⚠️ Dữ liệu gốc: Số lượng file PDF phải bằng số lượng file khác
									</div>
								)}
							</div>

							<input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

							{/* Selected Files */}
							{selectedFiles.length > 0 && (
								<div className="mb-4">
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
										{/* PDF Files */}
										<div>
											<h4 className="font-medium text-red-700 mb-2">
												File PDF -{' '}
												{
													selectedFiles.filter(
														(f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
													).length
												}
											</h4>
											<div className="space-y-2 max-h-32 overflow-y-auto">
												{selectedFiles
													.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
													.map((file, index) => {
														const originalIndex = selectedFiles.findIndex((f) => f === file);
														return (
															<div
																key={originalIndex}
																className="flex items-center justify-between p-2 bg-red-50 rounded"
															>
																<div className="flex-1 min-w-0">
																	<div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
																	<div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
																</div>
																<button
																	onClick={() => removeSelectedFile(originalIndex)}
																	className="ml-2 p-1 text-red-500 hover:bg-red-100 rounded"
																>
																	<FaTimes />
																</button>
															</div>
														);
													})}
											</div>
										</div>

										{/* Other Files */}
										<div>
											<h4 className="font-medium text-blue-700 mb-2">
												File khác (Octet) -{' '}
												{
													selectedFiles.filter(
														(f) => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf'),
													).length
												}
											</h4>
											<div className="space-y-2 max-h-32 overflow-y-auto">
												{selectedFiles
													.filter((f) => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf'))
													.map((file, index) => {
														const originalIndex = selectedFiles.findIndex((f) => f === file);
														return (
															<div
																key={originalIndex}
																className="flex items-center justify-between p-2 bg-blue-50 rounded"
															>
																<div className="flex-1 min-w-0">
																	<div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
																	<div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
																</div>
																<button
																	onClick={() => removeSelectedFile(originalIndex)}
																	className="ml-2 p-1 text-red-500 hover:bg-red-100 rounded"
																>
																	<FaTimes />
																</button>
															</div>
														);
													})}
											</div>
										</div>
									</div>

									{/* Validation Warning */}
									{selectedTag === 'Dữ liệu gốc' && !validateSelectedFiles() && selectedFiles.length > 0 && (
										<div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
											⚠️ Dữ liệu gốc: Số lượng file PDF phải bằng số lượng file khác
										</div>
									)}
								</div>
							)}

							{/* Actions */}
							<div className="flex justify-between items-center">
								<div className="text-sm text-gray-500">
									{selectedFiles.length > 0 && `${selectedFiles.length} file đã chọn`}
								</div>
								<div className="flex space-x-3">
									<button
										onClick={closeUploadModal}
										className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
										disabled={uploading}
									>
										Hủy
									</button>
									<button
										onClick={handleUpload}
										disabled={
											uploading ||
											selectedFiles.length === 0 ||
											(selectedTag === 'Dữ liệu gốc' && !validateSelectedFiles())
										}
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
									>
										{uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
										<span>{uploading ? 'Uploading...' : 'Upload'}</span>
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Lab Results Modal */}
			{labResultsModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
						<div className="p-6 border-b">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-semibold text-gray-900">Danh sách chỉ tiêu</h3>
								<button
									onClick={() => setLabResultsModalOpen(false)}
									className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
								>
									<FaTimes />
								</button>
							</div>
						</div>
						<div className="p-6 max-h-[70vh] overflow-y-auto">
							{labResultsLoading ? (
								<div className="flex justify-center items-center py-12">
									<div className="flex flex-col items-center space-y-4">
										<FaSpinner className="text-4xl text-blue-500 animate-spin" />
										<span className="text-gray-500">Đang tải danh sách chỉ tiêu...</span>
									</div>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã mẫu</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
													Tên chỉ tiêu
												</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
													Mã phương pháp
												</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kết quả</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-200">
											{labResults.length === 0 ? (
												<tr>
													<td colSpan="7" className="px-4 py-8 text-center text-gray-500">
														Không có dữ liệu chỉ tiêu
													</td>
												</tr>
											) : (
												labResults.map((result) => (
													<tr key={result.id} className="hover:bg-gray-50">
														<td className="px-4 py-2 text-sm text-gray-900">{result.id || '-'}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{result.sampleUID || '-'}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{result.parameterName || '-'}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{result.protocolCode || '-'}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{result.resultValue || '-'}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{result.resultUnit || '-'}</td>
														<td className="px-4 py-2">
															<span
																className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(
																	result.status,
																)}`}
															>
																{result.status || 'Không xác định'}
															</span>
														</td>
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>
							)}
							{labResults.length > 0 && (
								<div className="mt-4 text-sm text-gray-500">
									<FaInfoCircle className="inline mr-1" />
									Tổng cộng: {labResults.length} chỉ tiêu
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Preview Modal */}
			{previewModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
					<div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
						<div className="flex items-center justify-between p-4 border-b bg-white">
							<h3 className="text-lg font-semibold">Xem trước file</h3>
							<div className="flex items-center space-x-2">
								<button
									onClick={() => setPreviewZoom(Math.max(0.25, previewZoom - 0.25))}
									className="p-2 text-gray-600 hover:bg-gray-100 rounded"
									title="Thu nhỏ"
								>
									<FaSearchMinus />
								</button>
								<span className="text-sm text-gray-600">{Math.round(previewZoom * 100)}%</span>
								<button
									onClick={() => setPreviewZoom(Math.min(3, previewZoom + 0.25))}
									className="p-2 text-gray-600 hover:bg-gray-100 rounded"
									title="Phóng to"
								>
									<FaSearchPlus />
								</button>
								<button
									onClick={() => setPreviewZoom(1)}
									className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded"
									title="Kích thước gốc"
								>
									Reset
								</button>
								<button
									onClick={() => {
										setPreviewModalOpen(false);
										setPreviewUrl('');
										setPreviewZoom(1);
									}}
									className="p-2 text-gray-400 hover:text-gray-600 rounded"
								>
									<FaTimes />
								</button>
							</div>
						</div>
						<div className="flex-1 overflow-auto" style={{ height: 'calc(90vh - 80px)' }}>
							<iframe
								src={previewUrl}
								className="w-full h-full border-0 origin-top-left transition-transform"
								style={{ transform: `scale(${previewZoom})` }}
								title="File Preview"
							/>
						</div>
					</div>
				</div>
			)}

			{/* Close dropdowns when clicking outside */}
			{sortMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />}
		</div>
	);
};

export default LabFile;
