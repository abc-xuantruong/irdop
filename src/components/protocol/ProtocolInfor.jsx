import * as React from 'react';
const { useContext, useState, useEffect, useRef } = React;
import { GlobalContext } from '../../contexts/GlobalContext';
import { useTaskQueue } from '../../contexts/TaskQueueContext';
import { apiPost, apiPostFormData } from '../../contexts/helperFunctionCallAPI';
import { toast } from 'react-toastify';
import { FaFilter } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import ProtocolDetail from './ProtocolDetail';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const ProtocolInfor = () => {
	const { setCurrentTitlePage, currentUser } = useContext(GlobalContext);
	const { addTask, updateTask } = useTaskQueue();
	const location = useLocation();
	const [protocols, setProtocols] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [uploadLoading, setUploadLoading] = useState(false);
	const [showUploadModal, setShowUploadModal] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [isDragging, setIsDragging] = useState(false);
	const [pagination, setPagination] = useState({
		currentPage: 1,
		itemsPerPage: 20,
		totalItems: 0,
		totalPages: 0,
	});
	const [searchTerm, setSearchTerm] = useState('');
	const [searchInput, setSearchInput] = useState(''); // For input field
	const [columnSort, setColumnSort] = useState('protocolCode');
	const [sortBy, setSortBy] = useState('ASC');
	const [filters, setFilters] = useState({});
	const [filterModal, setFilterModal] = useState({
		visible: false,
		column: '',
		value: '',
	});
	const [selectedProtocol, setSelectedProtocol] = useState(null);
	const [detailModalVisible, setDetailModalVisible] = useState(false);

	const initialLoadRef = useRef(false);
	const fileInputRef = useRef(null);
	const searchDebounceRef = useRef(null);

	// Helper function to ensure content is a string for ReactMarkdown
	const renderMarkdown = (content) => {
		if (typeof content === 'string') {
			return content;
		}
		if (content === null || content === undefined) {
			return '';
		}
		return JSON.stringify(content, null, 2);
	};

	// Handle navigation state from queue clicks
	useEffect(() => {
		if (location.state?.openProtocol && location.state?.protocolData) {
			setSelectedProtocol(location.state.protocolData);
			setDetailModalVisible(true);
			// Clear the navigation state
			window.history.replaceState({}, document.title);
		}
	}, [location.state]);

	// Listen for extracted data from ProcessingQueue
	useEffect(() => {
		const handleProtocolDataExtracted = () => {
			const storedData = localStorage.getItem('extractedProtocolData');
			if (storedData) {
				try {
					const { data, timestamp } = JSON.parse(storedData);
					// Check if data is fresh (less than 5 seconds old)
					if (Date.now() - timestamp < 5000) {
						setSelectedProtocol(data);
						setDetailModalVisible(true);
						// Clear localStorage after reading
						localStorage.removeItem('extractedProtocolData');
					}
				} catch (error) {
					console.error('Error parsing extracted protocol data:', error);
				}
			}
		};

		// Add event listener
		window.addEventListener('protocolDataExtracted', handleProtocolDataExtracted);

		// Check on mount in case there's already data
		handleProtocolDataExtracted();

		// Cleanup
		return () => {
			window.removeEventListener('protocolDataExtracted', handleProtocolDataExtracted);
		};
	}, []);

	useEffect(() => {
		setCurrentTitlePage('Hồ sơ Phương pháp');

		// Add CSS to hide scrollbars
		const style = document.createElement('style');
		style.textContent = `
			.scrollbar-hide {
				-ms-overflow-style: none;
				scrollbar-width: none;
			}
			.scrollbar-hide::-webkit-scrollbar {
				display: none;
			}
			
			/* Hide all scrollbars globally */
			* {
				-ms-overflow-style: none;
				scrollbar-width: none;
			}
			*::-webkit-scrollbar {
				display: none;
			}
		`;
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, [setCurrentTitlePage]);

	// Load data on component mount and when filters/sort change
	useEffect(() => {
		if (currentUser && initialLoadRef.current) {
			fetchProtocols(pagination.currentPage, pagination.itemsPerPage);
		}
	}, [filters, sortBy, columnSort]);

	// Debounce search input
	useEffect(() => {
		// Clear previous timeout
		if (searchDebounceRef.current) {
			clearTimeout(searchDebounceRef.current);
		}

		// Set new timeout
		searchDebounceRef.current = setTimeout(() => {
			setSearchTerm(searchInput.trim());
		}, 500);

		// Cleanup
		return () => {
			if (searchDebounceRef.current) {
				clearTimeout(searchDebounceRef.current);
			}
		};
	}, [searchInput]);

	// Initial load and when search term changes
	useEffect(() => {
		if (currentUser) {
			initialLoadRef.current = true;
			fetchProtocols(1, pagination.itemsPerPage);
			if (pagination.currentPage !== 1) {
				setPagination((prev) => ({ ...prev, currentPage: 1 }));
			}
		}
	}, [searchTerm, currentUser]);

	const fetchProtocols = async (page = 1, itemsPerPage = 20) => {
		setLoading(true);
		setError(null);

		try {
			const requestBody = {
				columns: [
					'id',
					'protocolCode',
					'docTitle',
					'protocolMatrices',
					'purpose',
					'estimatedTime',
					'refDocument',
					'equipment',
					'tools',
					'chemicals',
					'detailedProcedure',
					'dataProcessing',
					'parameters',
					'files',
				],
				filter: filters,
				page,
				itemsPerPage,
				sortBy,
				columnSort,
				...(searchTerm && { searchTerm }),
			};

			const response = await apiPost('https://red.irdop.org/v1/protocol/get/full', requestBody);

			if (response.data) {
				setProtocols(response.data.result || []);
				setPagination(
					response.data.pagination || {
						currentPage: page,
						itemsPerPage,
						totalItems: 0,
						totalPages: 0,
					},
				);
			}
		} catch (err) {
			setError(err.message || 'Failed to fetch protocols');
			console.error('Error fetching protocols:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleUploadFile = async () => {
		if (selectedFiles.length === 0) {
			toast.warning('Vui lòng chọn file để upload');
			return;
		}

		// Close modal immediately
		setShowUploadModal(false);
		const filesToUpload = [...selectedFiles];
		setSelectedFiles([]);

		toast.info(`Đã thêm ${filesToUpload.length} file vào hàng đợi`);

		// Process each file
		for (const file of filesToUpload) {
			const taskId = addTask('upload', null, '', file.name, 'protocol');

			try {
				const formData = new FormData();
				formData.append('files', file);
				const response = await apiPostFormData('https://red.irdop.org/v1/protocol/upload/file', formData);

				if (response.status === 200 || response.status === 201) {
					updateTask(taskId, {
						status: 'completed',
						data: response.data,
					});
					toast.success(`Upload thành công: ${file.name}`);
				} else {
					updateTask(taskId, {
						status: 'failed',
						error: 'Upload thất bại',
					});
					toast.error(`Upload thất bại: ${file.name}`);
				}
			} catch (err) {
				console.error('Error uploading file:', file.name, err);
				updateTask(taskId, {
					status: 'failed',
					error: err.message || 'Lỗi khi upload file',
				});
				toast.error(`Lỗi: ${file.name}`);
			}
		}

		// Refresh protocols list after all uploads
		await fetchProtocols(pagination.currentPage, pagination.itemsPerPage);
	};

	const handleFileSelect = (event) => {
		const files = Array.from(event.target.files);
		if (files.length > 0) {
			setSelectedFiles((prev) => [...prev, ...files]);
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e) => {
		e.preventDefault();
		setIsDragging(false);
		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			setSelectedFiles((prev) => [...prev, ...files]);
		}
	};

	const handleRemoveFile = (index) => {
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const formatFileSize = (bytes) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	};

	// Handle page change
	const handlePageChange = (newPage) => {
		if (newPage >= 1 && newPage <= pagination.totalPages) {
			fetchProtocols(newPage, pagination.itemsPerPage);
		}
	};

	// Handle items per page change
	const handleItemsPerPageChange = (newItemsPerPage) => {
		fetchProtocols(1, newItemsPerPage);
	};

	// Handle sort change
	const handleSort = (column) => {
		const newSortBy = columnSort === column && sortBy === 'ASC' ? 'DESC' : 'ASC';
		setSortBy(newSortBy);
		setColumnSort(column);
	};

	// Handle filter change
	const handleFilterChange = (column, value) => {
		setFilters((prev) => ({
			...prev,
			[column]: value || undefined,
		}));
	};

	// Clear filters
	const clearFilters = () => {
		setFilters({});
	};

	// Get sort icon
	const getSortIcon = (column) => {
		if (columnSort !== column) return '⇅';
		if (sortBy === 'ASC') {
			return '▲';
		} else {
			return '▼';
		}
	};

	// Open filter modal
	const openFilterModal = (column) => {
		setFilterModal({
			visible: true,
			column,
			value: filters[column] || '',
		});
	};

	// Close filter modal
	const closeFilterModal = () => {
		setFilterModal({ visible: false, column: '', value: '' });
	};

	// Apply filter
	const applyFilter = () => {
		handleFilterChange(filterModal.column, filterModal.value);
		closeFilterModal();
	};

	// Clear filter for column
	const clearColumnFilter = () => {
		handleFilterChange(filterModal.column, '');
		closeFilterModal();
	};

	// Handle search
	const handleSearch = () => {
		setSearchTerm(searchInput.trim());
	};

	// Handle clear search
	const handleClearSearch = () => {
		setSearchInput('');
		setSearchTerm('');
	};

	// Handle view file
	const handleViewFile = (protocolId) => {
		// Find the protocol and open its URL
		const protocol = protocols.find((p) => p.id === protocolId);
		if (protocol && protocol.url) {
			window.open(protocol.url, '_blank');
		}
	};

	// Handle row click to open detail modal
	const handleRowClick = (protocol) => {
		setSelectedProtocol(protocol);
		setDetailModalVisible(true);
	};

	// Close detail modal
	const closeDetailModal = () => {
		setDetailModalVisible(false);
		setSelectedProtocol(null);
	};

	// Handle protocol update callback from ProtocolDetail
	const handleProtocolUpdate = async () => {
		await fetchProtocols(pagination.currentPage, pagination.itemsPerPage);
	};

	return (
		<>
			<div className="p-4">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-2xl font-bold mb-4">Hồ sơ Phương pháp</h2>

					{/* Upload button */}
					<div className="mb-4">
						<button
							onClick={() => setShowUploadModal(true)}
							className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
						>
							Upload File PP
						</button>
					</div>
				</div>

				{/* Search */}
				<div className="flex items-center gap-2 mb-4">
					<input
						type="text"
						className="px-3 py-2 border rounded flex-1 bg-white"
						placeholder="Tìm kiếm phương pháp..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								handleSearch();
							}
						}}
					/>
					<button
						onClick={searchInput ? handleClearSearch : handleSearch}
						className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
					>
						{searchInput ? '✕' : 'Search'}
					</button>
				</div>

				{/* Upload Loading Indicator */}
				{uploadLoading && (
					<div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center gap-2">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						<span>Đang upload...</span>
					</div>
				)}

				{/* Loading */}
				{loading && (
					<div className="text-center py-4">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						<p className="mt-2">Loading protocols...</p>
					</div>
				)}

				{/* Error */}
				{error && (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						<strong>Error:</strong> {error}
					</div>
				)}

				{/* Table */}
				{!loading && !error && (
					<div className="overflow-x-auto scrollbar-hide">
						<table className="min-w-full bg-white border border-gray-300">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-2 border-b text-left">
										<div className="flex items-center justify-between">
											<span>Nền mẫu</span>
											<div className="flex items-center gap-1">
												<FaFilter
													className="w-3 h-3 cursor-pointer text-gray-500 hover:text-gray-700"
													onClick={() => openFilterModal('protocolMatrices')}
												/>
												<div className="cursor-pointer" onClick={() => handleSort('protocolMatrices')}>
													{getSortIcon('protocolMatrices')}
												</div>
											</div>
										</div>
									</th>
									<th className="px-4 py-2 border-b text-left">
										<div className="flex items-center justify-between">
											<span>Mục đích</span>
											<div className="flex items-center gap-1">
												<FaFilter
													className="w-3 h-3 cursor-pointer text-gray-500 hover:text-gray-700"
													onClick={() => openFilterModal('purpose')}
												/>
												<div className="cursor-pointer" onClick={() => handleSort('purpose')}>
													{getSortIcon('purpose')}
												</div>
											</div>
										</div>
									</th>
									<th className="px-4 py-2 border-b text-left min-w-[400px]">
										<div className="flex items-center justify-between">
											<span>Thiết bị</span>
											<div className="flex items-center gap-1">
												<FaFilter
													className="w-3 h-3 cursor-pointer text-gray-500 hover:text-gray-700"
													onClick={() => openFilterModal('equipment')}
												/>
												<div className="cursor-pointer" onClick={() => handleSort('equipment')}>
													{getSortIcon('equipment')}
												</div>
											</div>
										</div>
									</th>
									<th className="px-4 py-2 border-b text-left min-w-[400px]">
										<div className="flex items-center justify-between">
											<span>Hóa chất</span>
											<div className="flex items-center gap-1">
												<FaFilter
													className="w-3 h-3 cursor-pointer text-gray-500 hover:text-gray-700"
													onClick={() => openFilterModal('chemicals')}
												/>
												<div className="cursor-pointer" onClick={() => handleSort('chemicals')}>
													{getSortIcon('chemicals')}
												</div>
											</div>
										</div>
									</th>
									<th className="px-4 py-2 border-b text-left min-w-[400px]">
										<div className="flex items-center justify-between">
											<span>Dụng cụ</span>
											<div className="flex items-center gap-1">
												<FaFilter
													className="w-3 h-3 cursor-pointer text-gray-500 hover:text-gray-700"
													onClick={() => openFilterModal('tools')}
												/>
												<div className="cursor-pointer" onClick={() => handleSort('tools')}>
													{getSortIcon('tools')}
												</div>
											</div>
										</div>
									</th>
									<th className="px-4 py-2 border-b text-left">
										<div className="flex items-center justify-between">
											<span>Viện dẫn</span>
											<div className="flex items-center gap-1">
												<FaFilter
													className="w-3 h-3 cursor-pointer text-gray-500 hover:text-gray-700"
													onClick={() => openFilterModal('refDocument')}
												/>
												<div className="cursor-pointer" onClick={() => handleSort('refDocument')}>
													{getSortIcon('refDocument')}
												</div>
											</div>
										</div>
									</th>
									<th className="px-4 py-2 border-b text-left">
										<div className="flex items-center justify-between">
											<span>Chỉ tiêu</span>
											<div className="flex items-center gap-1">
												<FaFilter
													className="w-3 h-3 cursor-pointer text-gray-500 hover:text-gray-700"
													onClick={() => openFilterModal('parameters')}
												/>
												<div className="cursor-pointer" onClick={() => handleSort('parameters')}>
													{getSortIcon('parameters')}
												</div>
											</div>
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								{protocols.map((protocol) => (
									<tr
										key={protocol.id}
										className="hover:bg-gray-50 cursor-pointer"
										onClick={() => handleRowClick(protocol)}
									>
										<td className="px-4 py-2 border-b align-top text-left">
											{Array.isArray(protocol.protocolMatrices) && protocol.protocolMatrices.length > 0 ? (
												<ul className="list-disc list-inside text-xs">
													{protocol.protocolMatrices.slice(0, 3).map((matrix, index) => (
														<li key={index}>{matrix}</li>
													))}
													{protocol.protocolMatrices.length > 3 && (
														<li className="text-gray-500">... và {protocol.protocolMatrices.length - 3} nữa</li>
													)}
												</ul>
											) : (
												'-'
											)}
										</td>
										<td className="px-4 py-2 border-b align-top text-left text-xs">
											{protocol.purpose ? (
												<div className="overflow-auto max-h-40">
													<div className="prose prose-sm max-w-none">
														<ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
															{renderMarkdown(protocol.purpose)}
														</ReactMarkdown>
													</div>
												</div>
											) : (
												'-'
											)}
										</td>
										<td className="px-4 py-2 border-b align-top text-left text-xs">
											{Array.isArray(protocol.equipment) && protocol.equipment.length > 0 ? (
												<div className="max-h-40 overflow-y-auto">
													<table className="min-w-full text-xs border border-gray-200">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-2 py-1 border-b text-left font-medium">Tên thiết bị</th>
																<th className="px-2 py-1 border-b text-left font-medium">Thông số kỹ thuật</th>
																<th className="px-2 py-1 border-b text-left font-medium">Nhà sản xuất</th>
															</tr>
														</thead>
														<tbody>
															{protocol.equipment.slice(0, 2).map((item, index) => (
																<tr key={index} className="border-b border-gray-100">
																	<td className="px-2 py-1">{item.equipmentName || 'N/A'}</td>
																	<td className="px-2 py-1">{item.technicalSpecifications || '-'}</td>
																	<td className="px-2 py-1">{item.manufacturer || '-'}</td>
																</tr>
															))}
														</tbody>
													</table>
													{protocol.equipment.length > 2 && (
														<div className="text-gray-500 text-xs mt-1">
															... và {protocol.equipment.length - 2} thiết bị nữa
														</div>
													)}
												</div>
											) : (
												'-'
											)}
										</td>
										<td className="px-4 py-2 border-b align-top text-left text-xs">
											{Array.isArray(protocol.chemicals) && protocol.chemicals.length > 0 ? (
												<div className="max-h-40 overflow-y-auto">
													<table className="min-w-full text-xs border border-gray-200">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-2 py-1 border-b text-left font-medium">Tên hóa chất</th>
																<th className="px-2 py-1 border-b text-left font-medium">Số lượng</th>
																<th className="px-2 py-1 border-b text-left font-medium">Độ tinh khiết</th>
															</tr>
														</thead>
														<tbody>
															{protocol.chemicals.slice(0, 2).map((item, index) => (
																<tr key={index} className="border-b border-gray-100">
																	<td className="px-2 py-1">{item.chemicalName || 'N/A'}</td>
																	<td className="px-2 py-1">
																		{item.quantity && item.unit ? `${item.quantity} ${item.unit}` : '-'}
																	</td>
																	<td className="px-2 py-1">{item.purity || '-'}</td>
																</tr>
															))}
														</tbody>
													</table>
													{protocol.chemicals.length > 2 && (
														<div className="text-gray-500 text-xs mt-1">
															... và {protocol.chemicals.length - 2} hóa chất nữa
														</div>
													)}
												</div>
											) : (
												'-'
											)}
										</td>
										<td className="px-4 py-2 border-b align-top text-left text-xs">
											{Array.isArray(protocol.tools) && protocol.tools.length > 0 ? (
												<div className="max-h-40 overflow-y-auto">
													<table className="min-w-full text-xs border border-gray-200">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-2 py-1 border-b text-left font-medium">Tên dụng cụ</th>
																<th className="px-2 py-1 border-b text-left font-medium">Số lượng</th>
																<th className="px-2 py-1 border-b text-left font-medium">Vật liệu</th>
															</tr>
														</thead>
														<tbody>
															{protocol.tools.slice(0, 2).map((item, index) => (
																<tr key={index} className="border-b border-gray-100">
																	<td className="px-2 py-1">{item.toolName || 'N/A'}</td>
																	<td className="px-2 py-1">
																		{item.quantity && item.unit ? `${item.quantity} ${item.unit}` : '-'}
																	</td>
																	<td className="px-2 py-1">{item.material || '-'}</td>
																</tr>
															))}
														</tbody>
													</table>
													{protocol.tools.length > 2 && (
														<div className="text-gray-500 text-xs mt-1">
															... và {protocol.tools.length - 2} dụng cụ nữa
														</div>
													)}
												</div>
											) : (
												'-'
											)}
										</td>
										<td className="px-4 py-2 border-b align-top text-left text-xs">
											{protocol.refDocument ? (
												<div className="prose prose-sm max-w-none">
													<ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
														{renderMarkdown(protocol.refDocument)}
													</ReactMarkdown>
												</div>
											) : (
												'-'
											)}
										</td>
										<td className="px-4 py-2 border-b align-top text-left text-xs">
											{Array.isArray(protocol.parameters) && protocol.parameters.length > 0 ? (
												<div className="max-h-40 overflow-y-auto">
													<table className="min-w-full text-xs border border-gray-200">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-2 py-1 border-b text-left font-medium">Tên chỉ tiêu</th>
																<th className="px-2 py-1 border-b text-left font-medium">Nền mẫu</th>
																<th className="px-2 py-1 border-b text-left font-medium">ID</th>
															</tr>
														</thead>
														<tbody>
															{protocol.parameters.slice(0, 3).map((item, index) => (
																<tr key={index} className="border-b border-gray-100">
																	<td className="px-2 py-1">{item.parameterName || 'N/A'}</td>
																	<td className="px-2 py-1">{item.matrix || '-'}</td>
																	<td className="px-2 py-1">{item.parameterId || '-'}</td>
																</tr>
															))}
														</tbody>
													</table>
													{protocol.parameters.length > 3 && (
														<div className="text-gray-500 text-xs mt-1">
															... và {protocol.parameters.length - 3} chỉ tiêu nữa
														</div>
													)}
												</div>
											) : (
												'-'
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>

						{protocols.length === 0 && <div className="text-center py-8 text-gray-500">No protocols found.</div>}
					</div>
				)}

				{/* Pagination */}
				{!loading && (
					<div className="flex justify-between items-center mt-4">
						<div className="flex items-center gap-4">
							<div>
								<label className="block text-sm font-medium mb-1">Items per page</label>
								<select
									value={pagination.itemsPerPage}
									onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
									className="px-3 py-2 border rounded bg-white"
								>
									<option value={10}>10</option>
									<option value={20}>20</option>
									<option value={50}>50</option>
									<option value={100}>100</option>
								</select>
							</div>
							<div className="text-sm text-gray-600">Total: {pagination.totalItems} protocols</div>
						</div>
						{pagination.totalPages > 1 && (
							<div className="pagination flex items-center gap-2">
								<button
									onClick={() => handlePageChange(pagination.currentPage - 1)}
									disabled={pagination.currentPage <= 1}
									className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
								>
									Previous
								</button>

								<div className="flex items-center gap-1">
									{(() => {
										const pages = [];
										const maxVisiblePages = 5;
										const halfVisible = Math.floor(maxVisiblePages / 2);

										let startPage = Math.max(1, pagination.currentPage - halfVisible);
										let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

										if (endPage - startPage < maxVisiblePages - 1) {
											startPage = Math.max(1, endPage - maxVisiblePages + 1);
										}

										if (startPage > 1) {
											pages.push(
												<button
													key={1}
													onClick={() => handlePageChange(1)}
													className="px-3 py-2 border rounded hover:bg-gray-100"
												>
													1
												</button>,
											);
											if (startPage > 2) {
												pages.push(
													<span key="ellipsis-start" className="px-2">
														...
													</span>,
												);
											}
										}

										for (let i = startPage; i <= endPage; i++) {
											pages.push(
												<button
													key={i}
													onClick={() => handlePageChange(i)}
													className={`px-3 py-2 border rounded ${
														i === pagination.currentPage ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
													}`}
												>
													{i}
												</button>,
											);
										}

										if (endPage < pagination.totalPages) {
											if (endPage < pagination.totalPages - 1) {
												pages.push(
													<span key="ellipsis-end" className="px-2">
														...
													</span>,
												);
											}
											pages.push(
												<button
													key={pagination.totalPages}
													onClick={() => handlePageChange(pagination.totalPages)}
													className="px-3 py-2 border rounded hover:bg-gray-100"
												>
													{pagination.totalPages}
												</button>,
											);
										}

										return pages;
									})()}
								</div>

								<button
									onClick={() => handlePageChange(pagination.currentPage + 1)}
									disabled={pagination.currentPage >= pagination.totalPages}
									className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
								>
									Next
								</button>
							</div>
						)}
					</div>
				)}
			</div>
			{/* Filter Modal */}
			{filterModal.visible &&
				createPortal(
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white p-4 rounded shadow-lg w-80">
							<h3 className="text-lg font-semibold mb-4">Filter by {filterModal.column}</h3>
							<input
								type="text"
								className="w-full px-3 py-2 border rounded mb-4 bg-white"
								placeholder={`Filter by ${filterModal.column}`}
								value={filterModal.value}
								onChange={(e) =>
									setFilterModal((prev) => ({
										...prev,
										value: e.target.value,
									}))
								}
							/>
							<div className="flex justify-end gap-2">
								<button
									onClick={closeFilterModal}
									className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
								>
									Hủy
								</button>
								<button
									onClick={clearColumnFilter}
									className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
								>
									Hủy Lọc
								</button>
								<button onClick={applyFilter} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
									Xác nhận
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}

			{/* Protocol Detail Modal */}
			<ProtocolDetail
				protocol={selectedProtocol}
				isOpen={detailModalVisible}
				onClose={closeDetailModal}
				onProtocolUpdate={handleProtocolUpdate}
			/>

			{/* Upload Modal */}
			{showUploadModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
						<h2 className="text-xl font-bold mb-4">Upload File Phương pháp</h2>

						{/* Drag and Drop Area */}
						<div
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							className={`mb-4 p-8 border-2 border-dashed rounded-lg transition-colors ${
								isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
							}`}
						>
							<input
								ref={fileInputRef}
								type="file"
								onChange={handleFileSelect}
								className="hidden"
								accept=".pdf,.doc,.docx,.xls,.xlsx"
								multiple
							/>
							<div className="text-center">
								<div className="text-4xl mb-2">📁</div>
								<p className="text-gray-600 mb-2">
									Kéo thả file vào đây hoặc{' '}
									<button
										onClick={() => fileInputRef.current?.click()}
										className="text-blue-500 hover:text-blue-700 underline"
									>
										chọn file
									</button>
								</p>
								<p className="text-sm text-gray-500">Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX</p>
							</div>
						</div>

						{/* Files Table */}
						{selectedFiles.length > 0 && (
							<div className="mb-4">
								<h3 className="font-semibold mb-2">File đã chọn ({selectedFiles.length})</h3>
								<div className="border rounded overflow-hidden">
									<table className="w-full text-sm">
										<thead className="bg-gray-100">
											<tr>
												<th className="px-3 py-2 text-left">Tên file</th>
												<th className="px-3 py-2 text-left">Loại</th>
												<th className="px-3 py-2 text-left">Kích thước</th>
												<th className="px-3 py-2 text-center w-20">Xóa</th>
											</tr>
										</thead>
										<tbody>
											{selectedFiles.map((file, index) => (
												<tr key={index} className="border-t hover:bg-gray-50">
													<td className="px-3 py-2 truncate max-w-[200px]" title={file.name}>
														{file.name}
													</td>
													<td className="px-3 py-2">{file.type || 'N/A'}</td>
													<td className="px-3 py-2">{formatFileSize(file.size)}</td>
													<td className="px-3 py-2 text-center">
														<button
															onClick={() => handleRemoveFile(index)}
															className="text-red-500 hover:text-red-700 font-bold"
															disabled={uploadLoading}
														>
															✕
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
						<div className="flex gap-3 justify-end">
							<button
								onClick={() => {
									setShowUploadModal(false);
									setSelectedFiles([]);
									setIsDragging(false);
								}}
								disabled={uploadLoading}
								className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
							>
								Hủy
							</button>
							<button
								onClick={handleUploadFile}
								disabled={selectedFiles.length === 0 || uploadLoading}
								className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{uploadLoading ? 'Đang upload...' : `Upload (${selectedFiles.length})`}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default ProtocolInfor;
