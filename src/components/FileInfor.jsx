import React, { useState, useContext, useEffect } from 'react';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import { toast, ToastContainer } from 'react-toastify';
import { FaEye, FaDownload, FaTrashAlt } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';

const FileInfor = () => {
	const { setCurrentTitlePage } = useContext(GlobalContext);
	const navigate = useNavigate();
	const location = useLocation();
	const [existingFiles, setExistingFiles] = useState([]);
	const [groupedFiles, setGroupedFiles] = useState({});
	const [currentPage, setCurrentPage] = useState(1);
	const [filesPerPage] = useState(30);
	const [selectedSource, setSelectedSource] = useState('irdop'); // Default source
	const [filters, setFilters] = useState({
		fileName: '',
		description: '',
		categories: [],
		uploadedByUID: '',
		createdByUID: '',
	});
	const [showFilters, setShowFilters] = useState({
		fileName: false,
		description: false,
		categories: false,
		uploadedByUID: false,
		createdByUID: false,
	});
	const [searchQuery, setSearchQuery] = useState('');

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
	// Set the title page and handle URL parameters
	useEffect(() => {
		setCurrentTitlePage('Danh sách File');

		// Get query and source from URL if exists
		const urlParams = new URLSearchParams(location.search);
		const queryFromUrl = urlParams.get('query') || '';
		const sourceFromUrl = urlParams.get('source') || 'irdop';

		setSearchQuery(queryFromUrl);
		setSelectedSource(sourceFromUrl);

		// Fetch files with query and source from URL
		fetchExistingFiles(queryFromUrl, sourceFromUrl);
	}, [setCurrentTitlePage, location.search]);
	// Function to fetch existing files from API
	const fetchExistingFiles = async (query = '', source = 'irdop') => {
		try {
			const requestBody = { source };
			if (query) {
				requestBody.query = query;
			}
			const response = await apiPost('https://red.irdop.org/v1/file/get_list', requestBody);
			console.log('Response from API:', response);
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
	};

	// Function to handle search input change (only update input value)
	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value);
	};
	// Function to handle Enter key press
	const handleSearchSubmit = (e) => {
		if (e.key === 'Enter') {
			const query = searchQuery.trim();

			// Update URL with query parameter
			const urlParams = new URLSearchParams(location.search);
			if (query) {
				urlParams.set('query', query);
			} else {
				urlParams.delete('query');
			}

			// Navigate with new URL parameters
			navigate(`${location.pathname}?${urlParams.toString()}`, { replace: true });

			// Fetch files with query
			fetchExistingFiles(query, selectedSource);
		}
	};

	// Function to handle source change
	const handleSourceChange = (e) => {
		const newSource = e.target.value;
		setSelectedSource(newSource);

		// Update URL with source parameter
		const urlParams = new URLSearchParams(location.search);
		urlParams.set('source', newSource);

		// Navigate with new URL parameters
		navigate(`${location.pathname}?${urlParams.toString()}`, { replace: true });

		// Fetch files with new source
		fetchExistingFiles(searchQuery, newSource);
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
				filters.fileName === '' ||
				(file.fileInfo?.fileName || '').toLowerCase().includes(filters.fileName.toLowerCase());

			const descriptionMatch =
				filters.description === '' ||
				(file.uploadDescription || '').toLowerCase().includes(filters.description.toLowerCase());

			const categoryMatch =
				filters.categories.length === 0 ||
				(Array.isArray(file.fileCategory)
					? file.fileCategory.some((cat) => filters.categories.includes(cat))
					: filters.categories.includes(file.fileCategory));

			const uploadedByUIDMatch =
				filters.uploadedByUID === '' ||
				(file.uploadedByName || '').toLowerCase().includes(filters.uploadedByUID.toLowerCase());

			const createdByUIDMatch =
				filters.createdByUID === '' ||
				(file.createdByUID || '').toLowerCase().includes(filters.createdByUID.toLowerCase());

			return fileNameMatch && descriptionMatch && categoryMatch && uploadedByUIDMatch && createdByUIDMatch;
		});

		// Calculate pagination based on filtered files
		const startIndex = (currentPage - 1) * filesPerPage;
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

	// Function to handle filter change
	const handleFilterChange = (column, value) => {
		setFilters((prev) => ({
			...prev,
			[column]: value,
		}));
		setCurrentPage(1); // Reset to first page when filtering
	};

	// Function to toggle filter input visibility
	const toggleFilter = (column) => {
		setShowFilters((prev) => ({
			...prev,
			[column]: !prev[column],
		}));

		// Clear filter when hiding
		if (showFilters[column]) {
			if (column === 'categories') {
				setFilters((prev) => ({ ...prev, categories: [] }));
			} else {
				handleFilterChange(column, '');
			}
		}
	};

	// Function to handle page change
	const handlePageChange = (newPage) => {
		setCurrentPage(newPage);
		// Scroll to top of the page
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	// Function to get unique categories from all files
	const getUniqueCategories = () => {
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
	const handleCategoryFilterChange = (category, isChecked) => {
		setFilters((prev) => {
			const newCategories = isChecked
				? [...prev.categories, category]
				: prev.categories.filter((cat) => cat !== category);
			return {
				...prev,
				categories: newCategories,
			};
		});
		setCurrentPage(1);
	};

	// Function to get category display name
	const getCategoryDisplayName = (category) => {
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

	// Function to handle file view - redirect to file without auto-close
	const handleView = async (file) => {
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
	const handleDownload = async (file) => {
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
	const handleDelete = async (file) => {
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
				fetchExistingFiles(searchQuery);
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

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			{/* Breadcrumb */}
			<Breadcrumb paths={[{}]} />

			{/* Existing Files Section */}
			<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
				{' '}
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
							value={searchQuery}
							onChange={handleSearchChange}
							onKeyPress={handleSearchSubmit}
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
											Tổng số: {totalFiles} file | Trang {currentPage} / {totalPages}
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
																onClick={() => toggleFilter('fileName')}
																className="ml-2 text-gray-500 hover:text-gray-700 p-1.5"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	className={`h-4 w-4 transition-transform ${showFilters.fileName ? 'rotate-180' : ''}`}
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
														{showFilters.fileName && (
															<div className="mt-1">
																<input
																	type="text"
																	placeholder="Tìm kiếm tên file..."
																	value={filters.fileName}
																	onChange={(e) => handleFilterChange('fileName', e.target.value)}
																	className="w-full p-1 text-xs border rounded bg-white"
																/>
															</div>
														)}
													</th>
													<th className="border p-2 text-start w-1/4 min-w-60">
														<div className="flex items-center">
															Mô tả
															<button
																onClick={() => toggleFilter('description')}
																className="ml-2 text-gray-500 hover:text-gray-700 p-1.5"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	className={`h-4 w-4 transition-transform ${
																		showFilters.description ? 'rotate-180' : ''
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
														{showFilters.description && (
															<div className="mt-1">
																<input
																	type="text"
																	placeholder="Tìm kiếm mô tả..."
																	value={filters.description}
																	onChange={(e) => handleFilterChange('description', e.target.value)}
																	className="w-full p-1 text-xs border rounded bg-white"
																/>
															</div>
														)}
													</th>
													<th className="border p-2 text-start w-40 min-w-40 relative">
														<div className="flex items-center">
															Danh mục
															<button
																onClick={() => toggleFilter('categories')}
																className="ml-2 text-gray-500 hover:text-gray-700 p-1.5"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	className={`h-4 w-4 transition-transform ${
																		showFilters.categories ? 'rotate-180' : ''
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
														{showFilters.categories && (
															<div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-300 rounded mt-1 shadow-lg max-h-60 overflow-y-auto">
																<div className="p-2">
																	{getUniqueCategories().map((category) => (
																		<label
																			key={category}
																			className="flex items-center py-1 px-1 font-normal hover:bg-gray-100 cursor-pointer"
																		>
																			<input
																				type="checkbox"
																				checked={filters.categories.includes(category)}
																				onChange={(e) => handleCategoryFilterChange(category, e.target.checked)}
																				className="mr-2"
																				onClick={(e) => e.stopPropagation()}
																			/>
																			<span className="text-sm">{getCategoryDisplayName(category)}</span>
																		</label>
																	))}
																	{getUniqueCategories().length === 0 && (
																		<div className="text-sm text-gray-500 p-2">Không có danh mục nào</div>
																	)}
																</div>
															</div>
														)}
													</th>
													<th className="border p-2 text-start w-36 min-w-36">
														<div className="flex items-center">
															Upload bởi
															<button
																onClick={() => toggleFilter('uploadedByUID')}
																className="ml-2 text-gray-500 hover:text-gray-700 p-1.5"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	className={`h-4 w-4 transition-transform ${
																		showFilters.uploadedByUID ? 'rotate-180' : ''
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
														{showFilters.uploadedByUID && (
															<div className="mt-1">
																<input
																	type="text"
																	placeholder="Tìm kiếm upload bởi..."
																	value={filters.uploadedByUID}
																	onChange={(e) => handleFilterChange('uploadedByUID', e.target.value)}
																	className="w-full p-1 text-xs border rounded bg-white"
																/>
															</div>
														)}
													</th>
													<th className="border p-2 text-start w-32 min-w-32">
														<div className="flex items-center">
															Tạo bởi
															<button
																onClick={() => toggleFilter('createdByUID')}
																className="ml-2 text-gray-500 hover:text-gray-700 p-1.5"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	className={`h-4 w-4 transition-transform ${
																		showFilters.createdByUID ? 'rotate-180' : ''
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
														{showFilters.createdByUID && (
															<div className="mt-1">
																<input
																	type="text"
																	placeholder="Tìm kiếm tạo bởi..."
																	value={filters.createdByUID}
																	onChange={(e) => handleFilterChange('createdByUID', e.target.value)}
																	className="w-full p-1 text-xs border rounded bg-white"
																/>
															</div>
														)}
													</th>
													<th className="border p-2 text-center w-24 min-w-24">Actions</th>
												</tr>
											</thead>
											<tbody>
												{Object.entries(paginatedGroupedFiles).map(([groupId, files]) =>
													files.map((file, index) => (
														<tr key={`${groupId}-${index}`} className="hover:bg-gray-50">
															<td className="border p-2 text-start break-words">{file.fileInfo?.fileName || 'N/A'}</td>
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
																		onClick={() => handleView(file)}
																	>
																		<FaEye size={14} />
																	</button>
																	<button
																		className="text-green-500 hover:text-green-700 cursor-pointer p-1"
																		title="Tải xuống"
																		onClick={() => handleDownload(file)}
																	>
																		<FaDownload size={14} />
																	</button>{' '}
																	{file.uploadedByUID === getIdentityUID() && (
																		<button
																			className="text-red-500 hover:text-red-700 cursor-pointer p-1"
																			title="Xóa"
																			onClick={() => handleDelete(file)}
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
									)}
								</>
							);
						})()}
					</>
				) : (
					<div className="text-center py-8 text-gray-500">Không có file nào</div>
				)}
			</div>
		</div>
	);
};

export default FileInfor;
