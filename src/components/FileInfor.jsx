import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiPost, apiGet } from '../contexts/helperFunctionCallAPI';
import { toast, ToastContainer } from 'react-toastify';
import {
	FaEye,
	FaDownload,
	FaTrashAlt,
	FaEdit,
	FaPlus,
	FaCheck,
	FaTimes,
	FaFilter,
	FaUndo,
	FaSync,
} from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

const FileInfor = () => {
	const { setCurrentTitlePage, getIdenByUid, currentUser } = useContext(GlobalContext);
	const navigate = useNavigate();
	const location = useLocation();
	const [fileList, setFileList] = useState([]);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [filesPerPage, setFilesPerPage] = useState(20);
	const [totalPages, setTotalPages] = useState(1);
	const [searchTerm, setSearchTerm] = useState('');
	const [isSearchMode, setIsSearchMode] = useState(false);
	const [searchResults, setSearchResults] = useState([]);
	const [isTrashMode, setIsTrashMode] = useState(false);
	const [trashFiles, setTrashFiles] = useState([]);
	const [editingFile, setEditingFile] = useState(null);
	const [editData, setEditData] = useState({});
	const [addingForeignKey, setAddingForeignKey] = useState(null);
	const [newForeignKey, setNewForeignKey] = useState('');
	const [identityNames, setIdentityNames] = useState({});
	const [showFilters, setShowFilters] = useState({
		fileName: false,
		userTags: false,
		identityName: false,
		foreignKeyUIDs: false,
		fileNameInclude: false,
	});
	const [filters, setFilters] = useState({
		fileName: '',
		userTags: [],
		identityName: '',
		foreignKeyUIDs: '',
		fileNameInclude: '',
	});
	const [currentMode, setCurrentMode] = useState('personal');
	const [currentStatus, setCurrentStatus] = useState('');
	const [currentSort, setCurrentSort] = useState({ column: null, direction: null });
	const [showSortMenu, setShowSortMenu] = useState(false);
	const [showUploadModal, setShowUploadModal] = useState(false);
	const [uploadData, setUploadData] = useState({
		files: [],
		userTags: [],
		foreignKeyUIDs: [],
	});
	const [uploading, setUploading] = useState(false);
	const [showSelectColumn, setShowSelectColumn] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState(new Set());
	const [processing, setProcessing] = useState(false);
	const [initialized, setInitialized] = useState(false);

	// Add refs to prevent multiple API calls
	const isLoadingRef = useRef(false);
	const lastFetchParamsRef = useRef(null);

	// Function to fetch identity names for files without identityName
	const fetchIdentityNames = async (files) => {
		const filesToFetch = files.filter((file) => !file.identityName && file.identityUID);
		if (filesToFetch.length === 0) return;

		const newIdentityNames = { ...identityNames };

		for (const file of filesToFetch) {
			if (!newIdentityNames[file.identityUID]) {
				try {
					const identityData = await getIdenByUid(file.identityUID);
					if (identityData && identityData.identity_name) {
						newIdentityNames[file.identityUID] = identityData.identity_name;
					}
				} catch (error) {
					console.error('Error fetching identity for UID:', file.identityUID, error);
				}
			}
		}

		setIdentityNames(newIdentityNames);
	};

	// Add a helper function to check if user is an admin
	const isAdmin = () => {
		return currentUser?.role?.staff_admin;
	};

	// Initialize component
	useEffect(() => {
		setCurrentTitlePage('Danh sách File');

		// Handle URL search parameter on mount
		const urlParams = new URLSearchParams(location.search);
		const searchFromUrl = urlParams.get('searchTerm');

		if (searchFromUrl) {
			setSearchTerm(searchFromUrl);
			setIsSearchMode(true);
		}

		setInitialized(true);
	}, [setCurrentTitlePage]); // Only run once on mount

	// Main effect to handle data fetching - ONLY ONE useEffect for data fetching
	useEffect(() => {
		if (!initialized) return;

		// Create a unique key for current fetch parameters
		const fetchParams = JSON.stringify({
			isTrashMode,
			isSearchMode,
			searchTerm,
			currentMode,
			currentPage,
			filesPerPage,
			currentSort,
			currentStatus,
			fileNameInclude: filters.fileNameInclude,
		});

		// Prevent duplicate calls with same parameters
		if (lastFetchParamsRef.current === fetchParams || isLoadingRef.current) {
			return;
		}

		lastFetchParamsRef.current = fetchParams;
		isLoadingRef.current = true;

		const fetchData = async () => {
			try {
				if (isTrashMode) {
					await fetchTrashFiles();
				} else if (isSearchMode && searchTerm.trim()) {
					await handleSearch(searchTerm, false); // Don't update URL
				} else {
					await fetchFiles();
				}
			} finally {
				isLoadingRef.current = false;
			}
		};

		fetchData();
	}, [
		initialized,
		isTrashMode,
		isSearchMode,
		searchTerm,
		currentMode,
		currentPage,
		filesPerPage,
		currentSort,
		currentStatus,
		filters.fileNameInclude,
	]);

	// Function to fetch trash files
	const fetchTrashFiles = useCallback(async () => {
		setLoading(true);
		try {
			const requestBody = {
				mode: currentMode,
			};

			// Add fileNameInclude filter if selected
			if (filters.fileNameInclude) {
				requestBody.fileNameInclude = filters.fileNameInclude;
			}

			const response = await apiPost('https://red.irdop.org/v1/file/get/trash', requestBody);

			if (response.status === 200 && Array.isArray(response.data.listFiles)) {
				setTrashFiles(response.data.listFiles);
				fetchIdentityNames(response.data.listFiles);
			} else {
				setTrashFiles([]);
			}
		} catch (error) {
			console.error('Error fetching trash files:', error);
			toast.error('Lỗi kết nối khi tải danh sách file chờ xóa');
			setTrashFiles([]);
		} finally {
			setLoading(false);
		}
	}, [currentMode, filters.fileNameInclude]);

	// Function to handle status change
	const handleStatusChange = (newStatus) => {
		setCurrentStatus(newStatus);
		setCurrentPage(1);
		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
	};

	// Function to handle mode toggle
	const handleModeToggle = (mode) => {
		setCurrentMode(mode);
		setCurrentPage(1);
		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
	};

	// Function to handle column header click for sorting
	const handleColumnSort = (column) => {
		let newSort = { column: null, direction: null };

		if (currentSort.column === column) {
			// Same column clicked - cycle through states
			if (currentSort.direction === 'desc') {
				newSort = { column, direction: 'asc' };
			} else if (currentSort.direction === 'asc') {
				newSort = { column: null, direction: null }; // Clear sort
			} else {
				newSort = { column, direction: 'desc' };
			}
		} else {
			// Different column clicked - start with DESC
			newSort = { column, direction: 'desc' };
		}

		setCurrentSort(newSort);
		setCurrentPage(1);
		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
	};

	// Function to get sort indicator for column
	const getSortIndicator = (column) => {
		if (currentSort.column !== column) return '';
		if (currentSort.direction === 'desc') return ' ↓';
		if (currentSort.direction === 'asc') return ' ↑';
		return '';
	};

	// Function to handle sort change
	const handleSortChange = (column, direction) => {
		setCurrentSort({ column, direction });
		setCurrentPage(1);
		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
	};

	// Function to clear trash mode
	const handleClearTrashMode = () => {
		setIsTrashMode(false);
		setCurrentPage(1);
		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
	};

	const handleRestoreFile = async (fileId) => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/update/file', {
				id: fileId,
				updateData: {
					deletedAt: null,
				},
			});
			if (response.status === 200) {
				toast.success('Khôi phục file thành công', { autoClose: 1000 });
				refreshCurrentData();
			} else {
				toast.error('Lỗi khi khôi phục file', { autoClose: 1000 });
			}
		} catch (error) {
			console.error('Error restoring file:', error);
			toast.error('Lỗi khi khôi phục file', { autoClose: 1000 });
		}
	};

	// Function to fetch files by page
	const fetchFiles = useCallback(async () => {
		setLoading(true);
		try {
			const requestBody = {
				mode: currentMode,
				page: currentPage,
				filesPerPage: filesPerPage,
			};

			// Add sort parameters only if sorting is active
			if (currentSort.column && currentSort.direction) {
				requestBody.columnSort = currentSort.column;
				requestBody.sortBy = currentSort.direction;
			}

			// Add status filter if selected
			if (currentStatus) {
				requestBody.status = currentStatus;
			}

			// Add fileNameInclude filter if selected
			if (filters.fileNameInclude) {
				requestBody.fileNameInclude = filters.fileNameInclude;
			}

			const response = await apiPost('https://red.irdop.org/v1/file/get_by_page', requestBody);

			if (response.status === 200 && response.data) {
				setFileList(response.data.listFiles || []);
				setTotalPages(response.data.totalPage || 1);
				fetchIdentityNames(response.data.listFiles || []);
			} else {
				setFileList([]);
				setTotalPages(1);
			}
		} catch (error) {
			console.error('Error fetching files:', error);
			toast.error('Lỗi kết nối khi tải danh sách file');
			setFileList([]);
			setTotalPages(1);
		} finally {
			setLoading(false);
		}
	}, [currentMode, currentPage, filesPerPage, currentSort, currentStatus, filters.fileNameInclude]);

	// Function to handle search
	const handleSearch = useCallback(
		async (term = searchTerm, updateUrl = true) => {
			if (!term.trim()) return;

			setLoading(true);
			try {
				const requestBody = {
					mode: currentMode,
					page: currentPage,
					filesPerPage: filesPerPage,
					searchTerm: term.trim(),
				};

				// Add sort parameters only if sorting is active
				if (currentSort.column && currentSort.direction) {
					requestBody.columnSort = currentSort.column;
					requestBody.sortBy = currentSort.direction;
				}

				// Add status filter if selected
				if (currentStatus) {
					requestBody.status = currentStatus;
				}

				// Add fileNameInclude filter if selected
				if (filters.fileNameInclude) {
					requestBody.fileNameInclude = filters.fileNameInclude;
				}

				const response = await apiPost('https://red.irdop.org/v1/file/get_by_page', requestBody);

				if (response.status === 200 && response.data) {
					const searchData = response.data.listFiles || [];
					setSearchResults(searchData);
					setTotalPages(response.data.totalPage || 1);
					setCurrentPage(1);
					fetchIdentityNames(searchData);

					// Update URL with search term only if requested
					if (updateUrl) {
						const urlParams = new URLSearchParams(location.search);
						urlParams.set('searchTerm', term.trim());
						navigate(`${location.pathname}?${urlParams.toString()}`, { replace: true });
					}
				} else {
					setSearchResults([]);
					setTotalPages(1);
				}
			} catch (error) {
				console.error('Error searching files:', error);
				toast.error('Lỗi kết nối khi tìm kiếm file');
				setSearchResults([]);
				setTotalPages(1);
			} finally {
				setLoading(false);
			}
		},
		[
			searchTerm,
			currentMode,
			currentPage,
			filesPerPage,
			currentSort,
			currentStatus,
			filters.fileNameInclude,
			location.search,
			navigate,
		],
	);

	// Helper function to refresh current data view
	const refreshCurrentData = useCallback(() => {
		// Reset fetch params to force new fetch
		lastFetchParamsRef.current = null;

		// Trigger re-fetch by updating a dependency
		if (isTrashMode) {
			setIsTrashMode(false);
			setTimeout(() => setIsTrashMode(true), 0);
		} else if (isSearchMode && searchTerm.trim()) {
			handleSearch(searchTerm, false);
		} else {
			// Force re-fetch by updating currentPage
			const currentPageTemp = currentPage;
			setCurrentPage(0);
			setTimeout(() => setCurrentPage(currentPageTemp), 0);
		}
	}, [isTrashMode, isSearchMode, searchTerm, currentPage, handleSearch]);

	// Function to clear search - IMPROVED
	const handleClearSearch = () => {
		// Clear search state
		setSearchTerm('');
		setSearchResults([]);
		setIsSearchMode(false);
		setCurrentPage(1);

		// Remove search term from URL
		const urlParams = new URLSearchParams(location.search);
		urlParams.delete('searchTerm');
		const newUrl = urlParams.toString() ? `${location.pathname}?${urlParams.toString()}` : location.pathname;
		navigate(newUrl, { replace: true });

		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
	};

	// Function to handle search input submit
	const handleSearchSubmit = (e) => {
		if (e.key === 'Enter' || e.type === 'click') {
			setIsSearchMode(true);
			setCurrentPage(1);
			// Reset fetch params to allow new fetch
			lastFetchParamsRef.current = null;
		}
	};

	// Function to handle files per page change
	const handleFilesPerPageChange = (newFilesPerPage) => {
		setFilesPerPage(newFilesPerPage);
		setCurrentPage(1);
		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
	};

	// Fetch identity names when fileList, searchResults, or trashFiles changes
	useEffect(() => {
		const files = isTrashMode ? trashFiles : isSearchMode ? searchResults : fileList;
		if (files.length > 0) {
			fetchIdentityNames(files);
		}
	}, [fileList, searchResults, trashFiles, isSearchMode, isTrashMode]);

	// Handle click outside to close filter dropdowns
	useEffect(() => {
		const handleClickOutside = (event) => {
			// Check if click is outside any filter-related elements
			const isClickInsideFilter =
				event.target.closest('.filter-dropdown') ||
				event.target.closest('.filter-button') ||
				event.target.closest('.sort-menu') ||
				event.target.closest('.sort-button') ||
				event.target.closest('th') ||
				event.target.closest('input[type="checkbox"]') ||
				event.target.closest('select') ||
				event.target.closest('input[type="text"]');

			if (!isClickInsideFilter) {
				setShowFilters({
					fileName: false,
					userTags: false,
					identityName: false,
					foreignKeyUIDs: false,
					fileNameInclude: false,
				});
				setShowSortMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const categoryOptions = [
		'Dữ liệu gốc',
		'Biên bản kết quả thử nghiệm',
		'Tài liệu khác',
		'Ảnh mẫu',
		'Phiếu gửi mẫu',
		'Đơn hàng',
		'Phiếu phân tích',
		'Biên bản bàn giao',
		'Specification / COA',
	];

	// Function to handle file actions (view/download)
	const handleFileAction = async (fileRecord, mode) => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: mode,
				fileRecord: fileRecord,
			});

			if (response.status === 200 && response.data) {
				if (mode === 'view') {
					window.open(response.data, '_blank');
					toast.success('Đã mở file trong tab mới', { autoClose: 1000 });
				} else if (mode === 'download') {
					const link = document.createElement('a');
					link.href = response.data;
					link.download = fileRecord.originInfo?.fileName || 'download';
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					toast.success('Tải file thành công', { autoClose: 1000 });
				}
			}
		} catch (error) {
			console.error(`${mode} failed:`, error);
			toast.error(`Lỗi khi ${mode === 'view' ? 'xem' : 'tải'} file`, { autoClose: 1000 });
		}
	};

	// Function to add foreign key
	const handleAddForeignKey = (fileId) => {
		if (!newForeignKey.trim()) return;

		const updatedForeignKeys = [...(editData.foreignKeyUIDs || []), newForeignKey.trim()];
		setEditData({
			...editData,
			foreignKeyUIDs: updatedForeignKeys,
		});
		setAddingForeignKey(null);
		setNewForeignKey('');
	};

	// Function to remove foreign key
	const handleRemoveForeignKey = (fileId, keyToRemove) => {
		const updatedForeignKeys = (editData.foreignKeyUIDs || []).filter((key) => key !== keyToRemove);
		setEditData({
			...editData,
			foreignKeyUIDs: updatedForeignKeys,
		});
	};

	// Function to update file
	const handleUpdateFile = async (fileId) => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/update/file', {
				id: fileId,
				updateData: {
					originInfo: editData.originInfo,
					userTags: editData.userTags,
					foreignKeyUIDs: editData.foreignKeyUIDs,
				},
			});

			if (response.status === 200) {
				toast.success('Cập nhật file thành công', { autoClose: 1000 });
				// Refresh file list based on current mode
				refreshCurrentData();
				setEditingFile(null);
				setEditData({});
				setAddingForeignKey(null);
				setNewForeignKey('');
			}
		} catch (error) {
			console.error('Update failed:', error);
			toast.error('Lỗi khi cập nhật file', { autoClose: 1000 });
		}
	};

	// Function to start editing
	const handleEditStart = (file) => {
		setEditingFile(file.id);
		setEditData({
			originInfo: {
				fileName: file.originInfo?.fileName || '',
				mimeType: file.originInfo?.mimeType || '',
				fileSize: file.originInfo?.fileSize || 0,
			},
			userTags: file.userTags || [],
			foreignKeyUIDs: file.foreignKeyUIDs || [],
		});
	};

	// Function to cancel editing
	const handleEditCancel = () => {
		setEditingFile(null);
		setEditData({});
		setAddingForeignKey(null);
		setNewForeignKey('');
	};

	// Function to delete file
	const handleDeleteFile = async (file) => {
		try {
			const result = await Swal.fire({
				title: 'Xác nhận xóa file',
				text: `Bạn có chắc chắn muốn xóa file "${file.originInfo?.fileName}"?`,
				icon: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#d33',
				cancelButtonColor: '#3085d6',
				confirmButtonText: 'Xóa',
				cancelButtonText: 'Hủy',
			});

			if (result.isConfirmed) {
				const response = await apiPost('https://red.irdop.org/v1/file/update/file', {
					id: file.id,
					updateData: {
						deletedAt: new Date().toISOString(),
					},
				});

				if (response.status === 200) {
					toast.success('Xóa file thành công', { autoClose: 1000 });
					// Refresh file list based on current mode
					refreshCurrentData();
				} else {
					toast.error('Lỗi khi xóa file', { autoClose: 1000 });
				}
			}
		} catch (error) {
			console.error('Delete failed:', error);
			toast.error('Lỗi khi xóa file', { autoClose: 1000 });
		}
	};

	// Function to permanently delete file from trash
	const handleDeleteFilePermanently = async (file) => {
		try {
			const result = await Swal.fire({
				title: 'Xác nhận xóa vĩnh viễn',
				text: `Bạn có chắc chắn muốn xóa vĩnh viễn file "${file.originInfo?.fileName}"? Hành động này không thể hoàn tác!`,
				icon: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#d33',
				cancelButtonColor: '#3085d6',
				confirmButtonText: 'Xóa vĩnh viễn',
				cancelButtonText: 'Hủy',
			});

			if (result.isConfirmed) {
				const response = await apiPost('https://red.irdop.org/v1/file/delete/permanent', {
					id: file.id,
				});

				if (response.status === 200) {
					toast.success('Xóa file vĩnh viễn thành công', { autoClose: 1000 });
					refreshCurrentData();
				} else {
					toast.error('Lỗi khi xóa file vĩnh viễn', { autoClose: 1000 });
				}
			}
		} catch (error) {
			console.error('Permanent delete failed:', error);
			toast.error('Lỗi khi xóa file vĩnh viễn', { autoClose: 1000 });
		}
	};

	// Function to toggle filter visibility
	const toggleFilter = (column) => {
		setShowFilters((prev) => ({
			...prev,
			[column]: !prev[column],
		}));

		// Clear filter when hiding
		if (showFilters[column]) {
			setFilters((prev) => ({
				...prev,
				[column]: column === 'userTags' ? [] : '',
			}));
		}
	};

	// Function to handle filter change
	const handleFilterChange = (column, value) => {
		setFilters((prev) => ({
			...prev,
			[column]: value,
		}));
		setCurrentPage(1); // Reset to first page when filtering
		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
	};

	// Function to handle category filter change
	const handleCategoryFilterChange = (category, isChecked) => {
		setFilters((prev) => ({
			...prev,
			userTags: isChecked ? [...prev.userTags, category] : prev.userTags.filter((tag) => tag !== category),
		}));
		setCurrentPage(1);
		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
	};

	// Filter files based on search term and filters
	const getFilteredFiles = () => {
		const files = isSearchMode ? searchResults : fileList;

		return files.filter((file) => {
			// File name filter
			if (filters.fileName && !file.originInfo?.fileName?.toLowerCase().includes(filters.fileName.toLowerCase())) {
				return false;
			}

			// User tags filter
			if (filters.userTags.length > 0) {
				if (filters.userTags.includes('empty')) {
					// If "empty" is selected, include files with no tags
					if (file.userTags && file.userTags.length > 0) return false;
				} else {
					// Normal tag filtering
					const hasMatchingTag = filters.userTags.some((tag) => file.userTags && file.userTags.includes(tag));
					if (!hasMatchingTag) return false;
				}
			}

			// Identity name filter
			if (filters.identityName) {
				const identityName = file.identityName || identityNames[file.identityUID] || '';
				if (!identityName.toLowerCase().includes(filters.identityName.toLowerCase())) {
					return false;
				}
			}

			// Foreign key UIDs filter
			if (filters.foreignKeyUIDs) {
				if (filters.foreignKeyUIDs === 'empty') {
					// If "empty" is selected, include files with no foreign keys
					if (file.foreignKeyUIDs && file.foreignKeyUIDs.length > 0) return false;
				} else {
					// Normal foreign key filtering
					const foreignKeysString = (file.foreignKeyUIDs || []).join(' ').toLowerCase();
					if (!foreignKeysString.includes(filters.foreignKeyUIDs.toLowerCase())) {
						return false;
					}
				}
			}

			// Name start filter (only for local filtering in search mode)
			if (isSearchMode && filters.fileNameInclude) {
				const fileName = file.originInfo?.fileName || '';
				if (!fileName.startsWith(filters.fileNameInclude)) {
					return false;
				}
			}

			return true;
		});
	};

	// Get paginated files
	const getPaginatedFiles = () => {
		if (isSearchMode) {
			// For search results, handle pagination locally
			const filteredFiles = getFilteredFiles();
			const startIndex = (currentPage - 1) * filesPerPage;
			const endIndex = startIndex + filesPerPage;

			return {
				paginatedFiles: filteredFiles.slice(startIndex, endIndex),
				totalFiles: filteredFiles.length,
				totalPages: Math.ceil(filteredFiles.length / filesPerPage),
			};
		} else {
			// For regular files, use server-side pagination
			const filteredFiles = getFilteredFiles();

			return {
				paginatedFiles: filteredFiles,
				totalFiles: filteredFiles.length,
				totalPages: totalPages,
			};
		}
	};

	// Function to handle page change
	const handlePageChange = (newPage) => {
		setCurrentPage(newPage);
		// Reset fetch params to allow new fetch
		lastFetchParamsRef.current = null;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	// Function to handle file upload
	const handleFileUpload = async () => {
		if (uploadData.files.length === 0) {
			toast.error('Vui lòng chọn file để tải lên');
			return;
		}

		setUploading(true);
		try {
			for (const file of uploadData.files) {
				// Build upload payload
				const uploadPayload = {
					originInfo: {
						fileName: file.name,
						mimeType: file.type,
						fileSize: file.size,
					},
					userTags: uploadData.userTags,
				};

				// Add foreign keys if provided
				if (uploadData.foreignKeyUIDs && uploadData.foreignKeyUIDs.length > 0) {
					uploadPayload.foreignKeyUIDs = uploadData.foreignKeyUIDs;
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
					}
				}
			}

			toast.success('Tải file lên thành công!');
			setShowUploadModal(false);
			setUploadData({
				files: [],
				userTags: [],
				foreignKeyUIDs: [],
			});

			// Refresh file list
			refreshCurrentData();
		} catch (error) {
			console.error('Upload error:', error);
			toast.error('Lỗi kết nối khi tải file lên');
		} finally {
			setUploading(false);
		}
	};

	// Function to handle file selection
	const handleFileSelect = (event) => {
		const selectedFiles = Array.from(event.target.files);
		setUploadData({
			...uploadData,
			files: selectedFiles,
		});
	};

	// Function to handle drag over
	const handleDragOver = (event) => {
		event.preventDefault();
		event.stopPropagation();
	};

	// Function to handle drag enter
	const handleDragEnter = (event) => {
		event.preventDefault();
		event.stopPropagation();
	};

	// Function to handle drag leave
	const handleDragLeave = (event) => {
		event.preventDefault();
		event.stopPropagation();
	};

	// Function to handle drop
	const handleDrop = (event) => {
		event.preventDefault();
		event.stopPropagation();
		const files = Array.from(event.dataTransfer.files);
		setUploadData({
			...uploadData,
			files: [...uploadData.files, ...files],
		});
	};

	// Function to remove file from upload list
	const handleRemoveFile = (indexToRemove) => {
		setUploadData({
			...uploadData,
			files: uploadData.files.filter((_, index) => index !== indexToRemove),
		});
	};

	// Function to handle upload category change
	const handleUploadCategoryChange = (category, isChecked) => {
		setUploadData((prev) => ({
			...prev,
			userTags: isChecked ? [...prev.userTags, category] : prev.userTags.filter((tag) => tag !== category),
		}));
	};

	// Function to handle foreign key input
	const handleForeignKeyInput = (value) => {
		const keys = value
			.split(',')
			.map((key) => key.trim())
			.filter((key) => key);
		setUploadData({
			...uploadData,
			foreignKeyUIDs: keys,
		});
	};

	// Function to close upload modal
	const handleCloseUploadModal = () => {
		setShowUploadModal(false);
		setUploadData({
			files: [],
			userTags: [],
			foreignKeyUIDs: [],
		});
	};

	// Function to toggle select column
	const toggleSelectColumn = () => {
		setShowSelectColumn(!showSelectColumn);
		if (showSelectColumn) {
			setSelectedFiles(new Set());
		}
	};

	// Function to handle individual file selection
	const handleFileSelectCheckbox = (fileId, isChecked) => {
		const newSelectedFiles = new Set(selectedFiles);
		if (isChecked) {
			newSelectedFiles.add(fileId);
		} else {
			newSelectedFiles.delete(fileId);
		}
		setSelectedFiles(newSelectedFiles);
	};

	// Function to handle select all
	const handleSelectAll = () => {
		const currentFiles = isTrashMode ? trashFiles : isSearchMode ? searchResults : fileList;
		const allFileIds = currentFiles.map((file) => file.id);

		if (selectedFiles.size === allFileIds.length) {
			setSelectedFiles(new Set());
		} else {
			setSelectedFiles(new Set(allFileIds));
		}
	};

	// Function to process selected files
	const handleProcessFiles = async () => {
		if (selectedFiles.size === 0) {
			toast.error('Vui lòng chọn file để xử lý');
			return;
		}

		setProcessing(true);
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/process_file', {
				fileIds: Array.from(selectedFiles),
			});

			if (response.status === 200) {
				toast.success(`Đã gửi ${selectedFiles.size} file để xử lý`);
				setSelectedFiles(new Set());

				// Refresh file list
				refreshCurrentData();
			} else {
				toast.error('Lỗi khi xử lý file');
			}
		} catch (error) {
			console.error('Process files error:', error);
			toast.error('Lỗi kết nối khi xử lý file');
		} finally {
			setProcessing(false);
		}
	};

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			{/* Breadcrumb */}
			<Breadcrumb paths={[{}]} />

			{/* File Management Section */}
			<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
				{/* Top Controls Row */}
				<div className="flex flex-col flex-wrap items-center justify-between gap-2 mb-4">
					{/* Left side - Mode and Filter buttons */}
					<div className="flex flex-wrap-reverse items-center w-full justify-start gap-2">
						{/* Main Mode Toggle - Combined button */}
						<button
							onClick={() => {
								if (isTrashMode) {
									handleClearTrashMode();
								} else {
									setIsTrashMode(true);
									setCurrentPage(1);
								}
							}}
							className="px-3 py-1 h-8 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm whitespace-nowrap flex items-center gap-2 max-w-[120px]"
							title={`Hiện tại: ${isTrashMode ? 'File chờ xóa' : 'File hiện có'}. Click để chuyển sang ${
								isTrashMode ? 'File hiện có' : 'File chờ xóa'
							}`}
						>
							<span className={`w-2 h-2 rounded-full ${isTrashMode ? 'bg-red-500' : 'bg-blue-500'}`}></span>
							<span>{isTrashMode ? 'File chờ xóa' : 'File hiện có'}</span>
						</button>

						{/* Filters and Controls */}
						{!isTrashMode && (
							<>
								{/* Status Filter */}
								<div className="flex items-center gap-1 whitespace-nowrap max-w-fit">
									<label className="text-sm text-gray-600 shrink-0">Trạng thái:</label>
									<select
										value={currentStatus}
										onChange={(e) => handleStatusChange(e.target.value)}
										className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm min-w-20"
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

								{/* Name Start Filter */}
								<div className="flex items-center gap-1 whitespace-nowrap max-w-fit">
									<label className="text-sm text-gray-600 shrink-0">Loại file:</label>
									<select
										value={filters.fileNameInclude}
										onChange={(e) => {
											setFilters({ ...filters, fileNameInclude: e.target.value });
											setCurrentPage(1);
											lastFetchParamsRef.current = null;
										}}
										className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm min-w-24"
									>
										<option value="">Tất cả</option>
										<option value="TEST_REQUEST___">Phiếu gửi mẫu</option>
										<option value="COA_REPORT___">Phiếu phân tích</option>
										<option value="LAB_TEST_REPORT___">Biên bản kiểm nghiệm</option>
										<option value="SAMPLE_IMG___">Ảnh mẫu</option>
									</select>
								</div>

								{/* Reload Button */}
								<button
									onClick={() => refreshCurrentData()}
									className="max-w-28 px-3 py-1 h-8 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1 whitespace-nowrap btn-fixed"
									title="Tải lại danh sách"
								>
									<FaSync size={12} />
									Tải lại
								</button>
								{/* Upload File Button */}
								<button
									onClick={() => setShowUploadModal(true)}
									className=" max-w-28 px-3 py-1 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap flex items-center gap-2"
								>
									<FaPlus size={12} />
									Tải lên
								</button>
								{/* Mode Toggle - Combined button */}
								<button
									onClick={() => handleModeToggle(currentMode === 'personal' ? 'all' : 'personal')}
									className="px-3 py-1 h-8 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm whitespace-nowrap flex items-center gap-2 max-w-[100px]"
									title={`Hiện tại: ${currentMode === 'personal' ? 'Cá nhân' : 'Toàn bộ'}. Click để chuyển sang ${
										currentMode === 'personal' ? 'Toàn bộ' : 'Cá nhân'
									}`}
								>
									<span
										className={`w-2 h-2 rounded-full ${currentMode === 'personal' ? 'bg-blue-500' : 'bg-green-500'}`}
									></span>
									<span>{currentMode === 'personal' ? 'Cá nhân' : 'Toàn bộ'}</span>
								</button>

								{/* Action Buttons */}
								<button
									onClick={toggleSelectColumn}
									className={`max-w-24 px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap text-sm flex items-center gap-1 ${
										showSelectColumn
											? 'bg-blue-600 text-white focus:ring-blue-500'
											: 'bg-gray-300 text-gray-700 hover:bg-gray-400 focus:ring-gray-300'
									}`}
								>
									<FaCheck size={12} />
									Chọn file
								</button>

								{showSelectColumn && (
									<button
										onClick={handleProcessFiles}
										disabled={selectedFiles.size === 0 || processing}
										className={`max-w-28 px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap text-sm flex items-center gap-1 ${
											selectedFiles.size > 0 && !processing
												? 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500'
												: 'bg-gray-300 text-gray-500 cursor-not-allowed'
										}`}
									>
										{processing && <FaSync className="animate-spin" size={12} />}
										{!processing && <FaSync size={12} />}
										Xử lý file ({selectedFiles.size})
									</button>
								)}
								<div className="flex items-center gap-1 whitespace-nowrap">
									<label className="text-sm text-gray-600 shrink-0">Số file/trang:</label>
									<select
										value={filesPerPage}
										onChange={(e) => handleFilesPerPageChange(parseInt(e.target.value))}
										className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm w-16"
									>
										<option value={10}>10</option>
										<option value={20}>20</option>
										<option value={50}>50</option>
										<option value={100}>100</option>
									</select>
								</div>
							</>
						)}
					</div>

					{/* Right side - Search and pagination controls */}
					<div className="flex justify-end gap-2 w-full">
						<div className="flex items-center gap-1">
							<input
								type="text"
								placeholder="Tìm kiếm file theo tên..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										setIsSearchMode(true);
										setCurrentPage(1);
										lastFetchParamsRef.current = null;
									}
								}}
								className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[200px] max-w-[320px] w-64"
							/>
							<button
								onClick={() => {
									setIsSearchMode(true);
									setCurrentPage(1);
									lastFetchParamsRef.current = null;
								}}
								className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
							>
								Tìm
							</button>
						</div>
					</div>
				</div>

				{/* Search mode indicator */}
				{isSearchMode && (
					<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
						<div className="flex items-center justify-between">
							<span className="text-sm text-blue-800">📝 Đang hiển thị kết quả tìm kiếm cho: "{searchTerm}"</span>
							<button onClick={handleClearSearch} className="text-sm text-blue-600 hover:text-blue-800 underline">
								Quay về danh sách đầy đủ
							</button>
						</div>
					</div>
				)}

				{/* File listing table */}
				{isTrashMode ? (
					<>
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
							<h3 className="text-lg font-semibold text-red-800 mb-2">File chờ xóa</h3>
							<p className="text-red-600">
								Đây là danh sách các file đã bị xóa. Bạn có thể khôi phục trước khi xóa vĩnh viễn theo định kì.
							</p>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-black border">
								<thead>
									<tr>
										<th className="py-1 px-2 border text-left max-w-[430px]">Tên file</th>
										<th className="py-1 px-2 border text-left w-[250px] max-w-[250px]">Khóa liên kết</th>
										<th className="py-1 px-2 border text-left">Người tạo</th>
										<th className="py-1 px-2 border text-left">Kích thước</th>
										<th className="py-1 px-2 border text-left">Ngày sửa đổi</th>
										<th className="py-1 px-2 border text-left max-w-[350px]">Danh mục</th>
										<th className="py-1 px-2 border text-left min-w-[100px] w-[100px]">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{trashFiles.map((file, index) => (
										<tr key={file.id} className="hover:bg-gray-50">
											<td className="py-1 px-2 border text-left">{file.originInfo?.fileName || '-'}</td>
											<td className="py-1 px-2 border text-left w-[250px] max-w-[250px]">
												<div className="flex flex-wrap gap-1">
													{(file.foreignKeyUIDs || []).length > 0 ? (
														file.foreignKeyUIDs.map((key, keyIndex) => (
															<span
																key={keyIndex}
																className="bg-gray-100 text-gray-800 text-xs px-1 py-0.5 rounded truncate"
															>
																{key}
															</span>
														))
													) : (
														<span className="text-gray-400 text-xs">Không có UID</span>
													)}
												</div>
											</td>
											<td className="py-1 px-2 border text-left">
												{file.identityName || identityNames[file.identityUID] || '-'}
											</td>
											<td className="py-1 px-2 border text-left">
												{file.originInfo?.fileSize ? (file.originInfo.fileSize / 1024).toFixed(2) + ' KB' : '-'}
											</td>
											<td className="py-1 px-2 border text-left">
												{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : '-'}
											</td>
											<td className="py-1 px-2 border text-left">
												<div className="flex flex-wrap gap-1">
													{(file.userTags || []).map((tag, tagIndex) => (
														<span
															key={`user-${tagIndex}`}
															className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full border border-blue-300 max-w-[400px] inline-block overflow-hidden"
															title={`User Tag: ${tag}`}
															style={{
																display: '-webkit-box',
																WebkitLineClamp: 3,
																WebkitBoxOrient: 'vertical',
																lineHeight: '1.2',
																maxHeight: '3.6em',
															}}
														>
															{tag}
														</span>
													))}
													{(!file.userTags || file.userTags.length === 0) && <span className="text-gray-400">-</span>}
												</div>
											</td>
											<td className="py-1 px-2 border text-left min-w-[100px] w-[100px]">
												<div className="flex space-x-1 flex-wrap">
													<button
														className="text-blue-500 hover:text-blue-700 text-lg px-1 py-1"
														onClick={() => handleFileAction(file, 'view')}
														title="Preview"
													>
														<FaEye />
													</button>
													{isAdmin() && (
														<button
															className="text-green-500 hover:text-green-700 text-lg px-1 py-1"
															onClick={() => handleRestoreFile(file.id)}
															title="Restore"
														>
															<FaUndo />
														</button>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							{trashFiles.length === 0 && (
								<div className="text-center py-8 text-gray-400">
									{loading ? 'Đang tải...' : 'Không có file nào trong thùng rác'}
								</div>
							)}
						</div>
					</>
				) : (
					<div className="flex-1 overflow-auto">
						<div className="min-w-[1200px]">
							<table className="w-full text-black border">
								<thead>
									<tr>
										{showSelectColumn && (
											<th className="py-1 px-2 border text-left w-12">
												<input
													type="checkbox"
													checked={
														selectedFiles.size > 0 &&
														selectedFiles.size ===
															(isTrashMode ? trashFiles : isSearchMode ? searchResults : fileList).length
													}
													onChange={handleSelectAll}
													className="cursor-pointer"
												/>
											</th>
										)}
										<th className="py-1 px-2 border text-left max-w-[430px]">
											<div className="flex items-center">
												<button
													onClick={() => handleColumnSort('fileName')}
													className="flex items-center text-left hover:text-blue-600 cursor-pointer font-medium"
												>
													Tên file{getSortIndicator('fileName')}
												</button>
												<button
													onClick={() => toggleFilter('fileName')}
													className="ml-2 text-gray-500 hover:text-gray-700 filter-button"
												>
													<FaFilter size={12} />
												</button>
											</div>
											{showFilters.fileName && (
												<div className="mt-1 filter-dropdown">
													<input
														type="text"
														placeholder="Lọc theo tên file..."
														value={filters.fileName}
														onChange={(e) => handleFilterChange('fileName', e.target.value)}
														className="w-full p-1 text-xs border rounded bg-white"
													/>
												</div>
											)}
										</th>
										<th className="py-1 px-2 border text-left w-[250px] max-w-[250px]">
											<div className="flex items-center">
												Khóa liên kết
												<button
													onClick={() => toggleFilter('foreignKeyUIDs')}
													className="ml-2 text-gray-500 hover:text-gray-700 filter-button"
												>
													<FaFilter size={12} />
												</button>
											</div>
											{showFilters.foreignKeyUIDs && (
												<div className="mt-1 filter-dropdown">
													<select
														value={filters.foreignKeyUIDs}
														onChange={(e) => handleFilterChange('foreignKeyUIDs', e.target.value)}
														className="w-full p-1 text-xs border rounded bg-white"
													>
														<option value="">Tất cả</option>
														<option value="empty">Chưa có khóa</option>
													</select>
													<input
														type="text"
														placeholder="Hoặc nhập UID để tìm..."
														value={filters.foreignKeyUIDs === 'empty' ? '' : filters.foreignKeyUIDs}
														onChange={(e) => handleFilterChange('foreignKeyUIDs', e.target.value)}
														className="w-full p-1 text-xs border rounded bg-white mt-1"
													/>
												</div>
											)}
										</th>
										<th className="py-1 px-2 border text-left">
											<div className="flex items-center">
												Người tạo
												<button
													onClick={() => toggleFilter('identityName')}
													className="ml-2 text-gray-500 hover:text-gray-700 filter-button"
												>
													<FaFilter size={12} />
												</button>
											</div>
											{showFilters.identityName && (
												<div className="mt-1 filter-dropdown">
													<input
														type="text"
														placeholder="Lọc theo người tạo..."
														value={filters.identityName}
														onChange={(e) => handleFilterChange('identityName', e.target.value)}
														className="w-full p-1 text-xs border rounded bg-white"
													/>
												</div>
											)}
										</th>
										<th className="py-1 px-2 border text-left">
											<button
												onClick={() => handleColumnSort('fileSize')}
												className="text-left hover:text-blue-600 cursor-pointer font-medium"
											>
												Kích thước{getSortIndicator('fileSize')}
											</button>
										</th>
										<th className="py-1 px-2 border text-left">
											<button
												onClick={() => handleColumnSort('createdAt')}
												className="text-left hover:text-blue-600 cursor-pointer font-medium"
											>
												Ngày sửa đổi{getSortIndicator('createdAt')}
											</button>
										</th>
										<th className="py-1 px-2 border text-left relative max-w-[350px]">
											<div className="flex items-center">
												Danh mục
												<button
													onClick={() => toggleFilter('userTags')}
													className="ml-2 text-gray-500 hover:text-gray-700 filter-button"
												>
													<FaFilter size={12} />
												</button>
											</div>
											{showFilters.userTags && (
												<div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 shadow-lg max-h-60 overflow-y-auto z-10 filter-dropdown">
													<div className="p-2">
														{categoryOptions.map((category) => (
															<label
																key={category}
																className="flex items-center py-1 px-1 hover:bg-gray-100 cursor-pointer"
															>
																<input
																	type="checkbox"
																	checked={filters.userTags.includes(category)}
																	onChange={(e) => handleCategoryFilterChange(category, e.target.checked)}
																	className="mr-2"
																/>
																<span className="text-sm">{category}</span>
															</label>
														))}
														<label className="flex items-center py-1 px-1 hover:bg-gray-100 cursor-pointer">
															<input
																type="checkbox"
																checked={filters.userTags.includes('empty')}
																onChange={(e) => handleCategoryFilterChange('empty', e.target.checked)}
																className="mr-2"
															/>
															<span className="text-sm">Chưa có danh mục</span>
														</label>
													</div>
												</div>
											)}
										</th>
										<th className="py-1 px-2 border text-left min-w-[140px] w-[140px]">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{(() => {
										const { paginatedFiles, totalFiles, totalPages } = getPaginatedFiles();
										return paginatedFiles.length > 0 ? (
											paginatedFiles.map((file, index) => (
												<tr key={index}>
													{showSelectColumn && (
														<td className="py-1 px-2 border text-left w-12">
															<input
																type="checkbox"
																checked={selectedFiles.has(file.id)}
																onChange={(e) => handleFileSelectCheckbox(file.id, e.target.checked)}
																className="cursor-pointer"
															/>
														</td>
													)}
													<td className="py-1 px-2 border text-left">
														{editingFile === file.id ? (
															<input
																type="text"
																value={editData.originInfo.fileName}
																onChange={(e) =>
																	setEditData({
																		...editData,
																		originInfo: {
																			...editData.originInfo,
																			fileName: e.target.value,
																		},
																	})
																}
																className="w-full border rounded px-2 py-1 bg-white"
															/>
														) : (
															file.originInfo?.fileName
														)}
													</td>
													<td className="py-1 px-2 border text-left w-[250px] max-w-[250px]">
														{editingFile === file.id ? (
															<div className="space-y-1">
																{/* Display existing foreign keys */}
																<div className="flex flex-wrap gap-1">
																	{(editData.foreignKeyUIDs || []).map((key, keyIndex) => (
																		<div key={keyIndex} className="relative group">
																			<span className="bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded pr-4 relative">
																				{key}
																				<button
																					onClick={() => handleRemoveForeignKey(file.id, key)}
																					className="absolute top-0 right-0 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs w-3 h-3 flex items-center justify-center"
																					style={{ fontSize: '8px' }}
																				>
																					×
																				</button>
																			</span>
																		</div>
																	))}
																</div>
																{/* Add new foreign key */}
																{addingForeignKey === file.id ? (
																	<div className="flex items-center gap-1 w-full">
																		<input
																			type="text"
																			value={newForeignKey}
																			onChange={(e) => setNewForeignKey(e.target.value)}
																			placeholder="Enter UID"
																			className="flex-1 min-w-0 border rounded px-1 py-0.5 text-xs bg-white"
																		/>
																		<button
																			onClick={() => handleAddForeignKey(file.id)}
																			className="text-green-600 hover:text-green-800 flex-shrink-0 p-1 rounded"
																		>
																			<FaCheck size={10} />
																		</button>
																		<button
																			onClick={() => {
																				setAddingForeignKey(null);
																				setNewForeignKey('');
																			}}
																			className="text-red-600 hover:text-red-800 flex-shrink-0 p-1 rounded"
																		>
																			<FaTimes size={10} />
																		</button>
																	</div>
																) : (
																	<button
																		onClick={() => setAddingForeignKey(file.id)}
																		className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
																	>
																		<FaPlus size={8} /> Thêm UID
																	</button>
																)}
															</div>
														) : (
															<div className="flex flex-wrap gap-1">
																{(file.foreignKeyUIDs || []).length > 0 ? (
																	file.foreignKeyUIDs.map((key, keyIndex) => (
																		<span
																			key={keyIndex}
																			className="bg-gray-100 text-gray-800 text-xs px-1 py-0.5 rounded truncate"
																		>
																			{key}
																		</span>
																	))
																) : (
																	<span className="text-gray-400 text-xs">Không có UID</span>
																)}
															</div>
														)}
													</td>
													<td className="py-1 px-2 border text-left">
														{file.identityName || identityNames[file.identityUID] || '-'}
													</td>
													<td className="py-1 px-2 border text-left">
														{file.originInfo?.fileSize ? (file.originInfo.fileSize / 1024).toFixed(2) + ' KB' : '-'}
													</td>
													<td className="py-1 px-2 border text-left">
														{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : '-'}
													</td>
													<td className="py-1 px-2 border text-left">
														{editingFile === file.id ? (
															<div className="flex flex-wrap gap-1">
																{categoryOptions.map((category) => (
																	<label key={category} className="flex items-center text-xs">
																		<input
																			type="checkbox"
																			checked={editData.userTags.includes(category)}
																			onChange={(e) => {
																				if (e.target.checked) {
																					setEditData({ ...editData, userTags: [...editData.userTags, category] });
																				} else {
																					setEditData({
																						...editData,
																						userTags: editData.userTags.filter((tag) => tag !== category),
																					});
																				}
																			}}
																			className="mr-1"
																		/>
																		{category}
																	</label>
																))}
															</div>
														) : (
															<div className="flex flex-wrap gap-1">
																{(file.userTags || []).map((tag, tagIndex) => (
																	<span
																		key={`user-${tagIndex}`}
																		className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full border border-blue-300 max-w-[400px] inline-block overflow-hidden"
																		title={`User Tag: ${tag}`}
																		style={{
																			display: '-webkit-box',
																			WebkitLineClamp: 3,
																			WebkitBoxOrient: 'vertical',
																			lineHeight: '1.2',
																			maxHeight: '3.6em',
																		}}
																	>
																		{tag}
																	</span>
																))}
																{(!file.userTags || file.userTags.length === 0) && (
																	<span className="text-gray-400">-</span>
																)}
															</div>
														)}
													</td>
													<td className="py-1 px-2 border text-left min-w-[140px] w-[140px]">
														<div className="flex space-x-1 flex-wrap">
															{editingFile === file.id ? (
																<>
																	<button
																		className="text-green-500 hover:text-green-700 text-lg px-2 py-1"
																		onClick={() => handleUpdateFile(file.id)}
																		title="Confirm"
																	>
																		<FaCheck />
																	</button>
																	<button
																		className="text-gray-500 hover:text-gray-700 text-lg px-2 py-1"
																		onClick={handleEditCancel}
																		title="Cancel"
																	>
																		<FaTimes />
																	</button>
																</>
															) : (
																<>
																	<button
																		className="text-blue-500 hover:text-blue-700 text-lg px-1 py-1"
																		onClick={() => handleFileAction(file, 'view')}
																		title="View"
																	>
																		<FaEye />
																	</button>
																	<button
																		className="text-green-500 hover:text-green-700 text-lg px-1 py-1"
																		onClick={() => handleFileAction(file, 'download')}
																		title="Download"
																	>
																		<FaDownload />
																	</button>
																	{isAdmin() && (
																		<button
																			className="text-orange-500 hover:text-orange-700 text-lg px-1 py-1"
																			onClick={() => handleEditStart(file)}
																			title="Update"
																		>
																			<FaEdit />
																		</button>
																	)}
																	{isAdmin() && (
																		<button
																			className="text-red-500 hover:text-red-700 text-lg px-1 py-1"
																			onClick={() => handleDeleteFile(file)}
																			title="Delete"
																		>
																			<FaTrashAlt />
																		</button>
																	)}
																</>
															)}
														</div>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={showSelectColumn ? 8 : 7} className="text-center py-8 text-gray-400">
													{loading ? 'Đang tải...' : searchTerm ? 'Không tìm thấy file phù hợp' : 'Chưa có dữ liệu'}
												</td>
											</tr>
										);
									})()}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Pagination Controls */}
				{!isTrashMode &&
					(() => {
						const { totalPages } = getPaginatedFiles();
						return (
							totalPages > 1 && (
								<div className="flex justify-center items-center mt-6 gap-2">
									{/* Previous Button */}
									<button
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage === 1}
										className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										‹ Trước
									</button>

									{/* Page Numbers */}
									{(() => {
										const pageNumbers = [];
										const maxVisiblePages = 5;
										let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
										let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

										if (endPage - startPage + 1 < maxVisiblePages) {
											startPage = Math.max(1, endPage - maxVisiblePages + 1);
										}

										for (let i = startPage; i <= endPage; i++) {
											pageNumbers.push(
												<button
													key={i}
													onClick={() => handlePageChange(i)}
													className={`px-3 py-1 border rounded-lg ${
														currentPage === i ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-gray-100'
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
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Sau ›
									</button>
								</div>
							)
						);
					})()}

				{/* File count info */}
				{!isTrashMode &&
					(() => {
						const { totalFiles } = getPaginatedFiles();
						return (
							<div className="flex justify-between items-center mt-4">
								<div className="text-sm text-gray-600">
									{isSearchMode ? (
										<span>
											Kết quả tìm kiếm: {totalFiles} file cho "{searchTerm}" | Trang {currentPage} /{' '}
											{Math.ceil(totalFiles / filesPerPage) || 1}
										</span>
									) : (
										<span>
											Tổng số: {totalFiles} file | Trang {currentPage} / {Math.ceil(totalFiles / filesPerPage) || 1}
										</span>
									)}
								</div>
							</div>
						);
					})()}
			</div>

			{/* Upload Modal */}
			{showUploadModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
					<div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 modal-content">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">Tải file lên</h3>
							<button onClick={handleCloseUploadModal} className="text-gray-500 hover:text-gray-700">
								<FaTimes size={20} />
							</button>
						</div>

						{/* File Selection Area */}
						<div className="mb-4">
							<label className="block text-sm font-medium text-gray-700 mb-2">Chọn file</label>
							<div
								className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
								onDragOver={handleDragOver}
								onDragEnter={handleDragEnter}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								onClick={() => document.getElementById('file-upload-input').click()}
							>
								<input id="file-upload-input" type="file" multiple onChange={handleFileSelect} className="hidden" />
								<FaPlus className="mx-auto text-gray-400 mb-2" size={24} />
								<p className="text-sm text-gray-600">Kéo thả file vào đây hoặc click để chọn</p>
								<p className="text-xs text-gray-500 mt-1">Có thể chọn nhiều file cùng lúc</p>
							</div>

							{/* File Preview List */}
							{uploadData.files.length > 0 && (
								<div className="mt-4 max-h-32 overflow-y-auto">
									<p className="text-sm text-gray-600 mb-2">Đã chọn {uploadData.files.length} file:</p>
									<div className="space-y-2">
										{uploadData.files.map((file, index) => (
											<div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
													<p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
												</div>
												<button
													onClick={() => handleRemoveFile(index)}
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
								{categoryOptions.map((category) => (
									<label key={category} className="flex items-center py-1 px-1 hover:bg-gray-100 cursor-pointer">
										<input
											type="checkbox"
											checked={uploadData.userTags.includes(category)}
											onChange={(e) => handleUploadCategoryChange(category, e.target.checked)}
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
								onChange={(e) => handleForeignKeyInput(e.target.value)}
								className="w-full px-3 py-1 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-end gap-2">
							<button
								onClick={handleCloseUploadModal}
								className="px-4 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
								disabled={uploading}
							>
								Hủy
							</button>
							<button
								onClick={handleFileUpload}
								disabled={uploading || uploadData.files.length === 0}
								className="px-4 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{uploading && <FaSync className="animate-spin" size={12} />}
								{uploading ? 'Đang tải...' : 'Tải lên'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default FileInfor;

/* Additional CSS for better button and filter display */
const additionalStyles = `
	.sort-button {
		min-width: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.sort-menu {
		max-height: 300px;
		overflow-y: auto;
	}
	
	/* Ensure proper spacing for flex-wrap items */
	.flex-wrap > * {
		margin: 1px;
	}
	
	/* Fixed width buttons */
	.btn-fixed {
		width: auto;
		min-width: fit-content;
		padding: 0.5rem 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
	}
	
	/* Search input constraints */
	.search-input {
		min-width: 200px;
		max-width: 320px;
		width: 16rem;
	}
	
	/* Upload modal animations */
	.modal-backdrop {
		backdrop-filter: blur(2px);
	}
	
	.modal-content {
		animation: modalSlideIn 0.3s ease-out;
	}
	
	@keyframes modalSlideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	/* Responsive adjustments */
	@media (max-width: 768px) {
		.flex-wrap {
			flex-direction: column;
			align-items: stretch;
		}
		
		.flex-wrap > * {
			margin: 2px 0;
		}
		
		.search-input {
			min-width: 160px;
			max-width: 100%;
		}
	}
	
	/* Spinner animation */
	.animate-spin {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
`;

// Inject styles
if (typeof document !== 'undefined') {
	const styleSheet = document.createElement('style');
	styleSheet.innerHTML = additionalStyles;
	document.head.appendChild(styleSheet);
}
