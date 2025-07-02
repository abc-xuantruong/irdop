import React, { useState, useContext, useEffect } from 'react';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiPost, apiGet } from '../contexts/helperFunctionCallAPI';
import { toast, ToastContainer } from 'react-toastify';
import { FaEye, FaDownload, FaTrashAlt, FaEdit, FaPlus, FaCheck, FaTimes, FaFilter, FaUndo } from 'react-icons/fa';
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
	});
	const [filters, setFilters] = useState({
		fileName: '',
		userTags: [],
		identityName: '',
		foreignKeyUIDs: '',
	});

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

	// Set the title page and fetch files
	useEffect(() => {
		setCurrentTitlePage('Danh sách File');

		// Check URL parameters for search term
		const urlParams = new URLSearchParams(location.search);
		const searchFromUrl = urlParams.get('searchTerm');

		if (searchFromUrl) {
			setSearchTerm(searchFromUrl);
			handleSearch(searchFromUrl);
		} else {
			fetchFiles();
		}
	}, [setCurrentTitlePage]);

	// Function to fetch trash files
	const fetchTrashFiles = async () => {
		setLoading(true);
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/trash');

			if (response.status === 200 && Array.isArray(response.data.listFiles)) {
				setTrashFiles(response.data.listFiles);
				setIsTrashMode(true);
				setIsSearchMode(false);
				fetchIdentityNames(response.data.listFiles);
			} else {
				setTrashFiles([]);
				setIsTrashMode(true);
			}
		} catch (error) {
			console.error('Error fetching trash files:', error);
			toast.error('Lỗi kết nối khi tải danh sách file chờ xóa');
			setTrashFiles([]);
			setIsTrashMode(true);
		} finally {
			setLoading(false);
		}
	};

	// Function to clear trash mode
	const handleClearTrashMode = () => {
		setIsTrashMode(false);
		setCurrentPage(1);
		fetchFiles(1);
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
				fetchTrashFiles();
			} else {
				toast.error('Lỗi khi khôi phục file', { autoClose: 1000 });
			}
		} catch (error) {
			console.error('Error restoring file:', error);
			toast.error('Lỗi khi khôi phục file', { autoClose: 1000 });
		}
	};

	// Function to fetch files by page
	const fetchFiles = async (page = currentPage, itemsPerPage = filesPerPage) => {
		setLoading(true);
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get_by_page', {
				page: page,
				filesPerPage: itemsPerPage,
			});

			if (response.status === 200 && response.data) {
				setFileList(response.data.listFiles || []);
				setTotalPages(response.data.totalPage || 1);
				setIsSearchMode(false);
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
	};

	// Function to handle search
	const handleSearch = async (term = searchTerm) => {
		if (!term.trim()) return;

		setLoading(true);
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/search', {
				searchTerm: term.trim(),
			});

			if (response.status === 200 && response.data) {
				// Handle both possible response formats
				const searchData = Array.isArray(response.data) ? response.data : response.data.listFiles || [];
				setSearchResults(searchData);
				setIsSearchMode(true);
				setCurrentPage(1);
				fetchIdentityNames(searchData);

				// Update URL with search term
				const urlParams = new URLSearchParams(location.search);
				urlParams.set('searchTerm', term.trim());
				navigate(`${location.pathname}?${urlParams.toString()}`, { replace: true });
			} else {
				setSearchResults([]);
				setIsSearchMode(true);
			}
		} catch (error) {
			console.error('Error searching files:', error);
			toast.error('Lỗi kết nối khi tìm kiếm file');
			setSearchResults([]);
			setIsSearchMode(true);
		} finally {
			setLoading(false);
		}
	};

	// Function to clear search
	const handleClearSearch = () => {
		setSearchTerm('');
		setSearchResults([]);
		setIsSearchMode(false);
		setCurrentPage(1);

		// Remove search term from URL
		const urlParams = new URLSearchParams(location.search);
		urlParams.delete('searchTerm');
		const newUrl = urlParams.toString() ? `${location.pathname}?${urlParams.toString()}` : location.pathname;
		navigate(newUrl, { replace: true });

		// Fetch regular files
		fetchFiles(1, filesPerPage);
	};

	// Function to handle search input submit
	const handleSearchSubmit = (e) => {
		if (e.key === 'Enter' || e.type === 'click') {
			handleSearch();
		}
	};

	// Function to handle files per page change
	const handleFilesPerPageChange = (newFilesPerPage) => {
		setFilesPerPage(newFilesPerPage);
		setCurrentPage(1);
		if (!isSearchMode && !isTrashMode) {
			fetchFiles(1, newFilesPerPage);
		}
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
				});
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const categoryOptions = [
		'Ảnh mẫu',
		'Phiếu gửi mẫu',
		'Đơn hàng',
		'Biên bản kiểm nghiệm',
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
				if (isTrashMode) {
					fetchTrashFiles();
				} else if (isSearchMode) {
					handleSearch();
				} else {
					fetchFiles();
				}
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
					if (isTrashMode) {
						fetchTrashFiles();
					} else if (isSearchMode) {
						handleSearch();
					} else {
						fetchFiles();
					}
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
					fetchTrashFiles();
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
	};

	// Function to handle category filter change
	const handleCategoryFilterChange = (category, isChecked) => {
		setFilters((prev) => ({
			...prev,
			userTags: isChecked ? [...prev.userTags, category] : prev.userTags.filter((tag) => tag !== category),
		}));
		setCurrentPage(1);
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

		if (!isSearchMode) {
			// For regular mode, fetch new page from server
			fetchFiles(newPage, filesPerPage);
		}

		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			{/* Breadcrumb */}
			<Breadcrumb paths={[{}]} />

			{/* File Management Section */}
			<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
				<div className="flex justify-between items-center mb-4">
					<div className="flex items-center gap-4">
						<button
							onClick={() => {
								if (isTrashMode) {
									handleClearTrashMode();
								}
							}}
							className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
								!isTrashMode
									? 'bg-blue-600 text-white focus:ring-blue-500'
									: 'bg-gray-300 text-gray-700 hover:bg-gray-400 focus:ring-gray-300'
							}`}
						>
							File hiện có
						</button>
						<button
							onClick={() => {
								if (!isTrashMode) {
									setIsTrashMode(true);
									fetchTrashFiles();
								}
							}}
							className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
								isTrashMode
									? 'bg-blue-600 text-white focus:ring-blue-500'
									: 'bg-gray-300 text-gray-700 hover:bg-gray-400 focus:ring-gray-300'
							}`}
						>
							File chờ xóa
						</button>
					</div>
					{/* Search bar and controls */}
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<label className="text-sm text-gray-600">Số file/trang:</label>
							<select
								value={filesPerPage}
								onChange={(e) => handleFilesPerPageChange(parseInt(e.target.value))}
								className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
							>
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
						</div>
						<div className="flex items-center gap-2">
							<input
								type="text"
								placeholder="Tìm kiếm file theo tên..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								onKeyPress={handleSearchSubmit}
								className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
							/>
							<button
								onClick={handleSearchSubmit}
								className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							>
								Tìm kiếm
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
										<th className="py-2 px-2 border text-left">Tên file</th>
										<th className="py-2 px-2 border text-left w-[250px] max-w-[250px]">Khóa liên kết</th>
										<th className="py-2 px-2 border text-left">Người tạo</th>
										<th className="py-2 px-2 border text-left">Kích thước</th>
										<th className="py-2 px-2 border text-left">Ngày sửa đổi</th>
										<th className="py-2 px-2 border text-left">Danh mục</th>
										<th className="py-2 px-2 border text-left min-w-[100px] w-[100px]">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{trashFiles.map((file, index) => (
										<tr key={file.id} className="hover:bg-gray-50">
											<td className="py-2 px-2 border text-left">{file.originInfo?.fileName || '-'}</td>
											<td className="py-2 px-2 border text-left w-[250px] max-w-[250px]">
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
											<td className="py-2 px-2 border text-left">
												{file.identityName || identityNames[file.identityUID] || '-'}
											</td>
											<td className="py-2 px-2 border text-left">
												{file.originInfo?.fileSize ? (file.originInfo.fileSize / 1024).toFixed(2) + ' KB' : '-'}
											</td>
											<td className="py-2 px-2 border text-left">
												{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : '-'}
											</td>
											<td className="py-2 px-2 border text-left">{file.userTags?.join(', ') || '-'}</td>
											<td className="py-2 px-2 border text-left min-w-[100px] w-[100px]">
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
								<tr>
									<td colSpan={7} className="text-center py-8 text-gray-400">
										{loading ? 'Đang tải...' : 'Không có file nào trong thùng rác'}
									</td>
								</tr>
							)}
						</div>
					</>
				) : (
					<div className="flex-1 overflow-auto">
						<div className="min-w-[1200px]">
							<table className="w-full text-black border">
								<thead>
									<tr>
										<th className="py-2 px-2 border text-left">
											<div className="flex items-center">
												Tên file
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
										<th className="py-2 px-2 border text-left w-[250px] max-w-[250px]">
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
										<th className="py-2 px-2 border text-left">
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
										<th className="py-2 px-2 border text-left">Kích thước</th>
										<th className="py-2 px-2 border text-left">Ngày sửa đổi</th>
										<th className="py-2 px-2 border text-left relative">
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
										<th className="py-2 px-2 border text-left min-w-[140px] w-[140px]">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{(() => {
										const { paginatedFiles, totalFiles, totalPages } = getPaginatedFiles();
										return paginatedFiles.length > 0 ? (
											paginatedFiles.map((file, index) => (
												<tr key={index}>
													<td className="py-2 px-2 border text-left">
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
													<td className="py-2 px-2 border text-left w-[250px] max-w-[250px]">
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
													<td className="py-2 px-2 border text-left">
														{file.identityName || identityNames[file.identityUID] || '-'}
													</td>
													<td className="py-2 px-2 border text-left">
														{file.originInfo?.fileSize ? (file.originInfo.fileSize / 1024).toFixed(2) + ' KB' : '-'}
													</td>
													<td className="py-2 px-2 border text-left">
														{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : '-'}
													</td>
													<td className="py-2 px-2 border text-left">
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
															file.userTags?.join(', ') || '-'
														)}
													</td>
													<td className="py-2 px-2 border text-left min-w-[140px] w-[140px]">
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
												<td colSpan={7} className="text-center py-8 text-gray-400">
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
		</div>
	);
};

export default FileInfor;
