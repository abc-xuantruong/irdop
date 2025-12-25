import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GlobalContext } from '../contexts/GlobalContext';
import { NavLink } from 'react-router-dom';
import { FaFileAlt, FaExternalLinkAlt, FaCalendarDay, FaTimes, FaSearch } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import ShipmentForm from '../components/ShipmentForm';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createPortal } from 'react-dom';

const ProgressDashboard = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { setCurrentTitlePage, showToast, formatDate } = useContext(GlobalContext);

	// Basic states
	const [currentList, setCurrentList] = useState([]);
	const [originalList, setOriginalList] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [totalItems, setTotalItems] = useState(0);
	const [receiptsPerPage, setReceiptsPerPage] = useState(20);
	const [isFilter, setIsFilter] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [hoveredReceiptId, setHoveredReceiptId] = useState(null);
	const [hoveredSampleId, setHoveredSampleId] = useState(null);

	// Add state for shipment form
	const [showShipmentForm, setShowShipmentForm] = useState(false);
	const [selectedReceipt, setSelectedReceipt] = useState(null);

	// Date filter states
	const [showDateRangePicker, setShowDateRangePicker] = useState(false);
	const [dateRange, setDateRange] = useState([new Date(), new Date()]);
	const [startDate, endDate] = dateRange;
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);
	const datePickerRef = useRef(null);
	const [filterInfo, setFilterInfo] = useState({
		isFilterActive: false,
		count: 0,
		startDate: null,
		endDate: null,
	});

	// Add new state to track today's deadline filter
	const [showTodayDeadlines, setShowTodayDeadlines] = useState(false);

	// Add new state to track overdue filter
	const [showOverdueFilter, setShowOverdueFilter] = useState(false);

	// Add new state to track tracking number filter
	const [showTrackingNumberFilter, setShowTrackingNumberFilter] = useState(false);

	// Search input state
	const [tempSearchValue, setTempSearchValue] = useState('');

	// Set page title
	useEffect(() => {
		setCurrentTitlePage('TIẾN ĐỘ MẪU');
	}, [setCurrentTitlePage]);

	// Fetch receipts function
	const fetchReceipt = async (
		page = 1,
		limit = receiptsPerPage,
		searchTermParam = null,
		trackingFilterParam = null,
	) => {
		try {
			const payload = {
				page: page,
				itemsPerPage: limit,
				status: [1, 2, 3, 4, 5],
				columns: [
					// Receipt columns
					'id',
					'receiptId',
					'status',
					'orderId',
					'deadline',
					'_deprecated_trackingNumber',
					'_deprecated_originalTrackingNumber',
					'client',
					'reportRecipient',
					'contactPerson',
					'sampleId',
					'analyses',
					'reports',
					'resultValue',
					'technicianId',
				],
			};

			// Use parameter if provided, otherwise use state
			const effectiveSearchTerm = searchTermParam !== null ? searchTermParam : searchTerm;
			const effectiveTrackingFilter = trackingFilterParam !== null ? trackingFilterParam : showTrackingNumberFilter;

			// Add searchTerm to payload if it exists
			if (effectiveSearchTerm && effectiveSearchTerm.trim()) {
				payload.searchTerm = effectiveSearchTerm.trim();
			}

			// Add tracking number filter if active
			if (effectiveTrackingFilter) {
				payload._deprecated_trackingNumber = [''];
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', payload);

			if (response.status === 200) {
				// Handle the new API response structure with pagination
				const receipts = response.data?.result || [];
				const pagination = response.data?.pagination || {};


				// Update pagination state
				setTotalItems(pagination.totalItems || 0);
				setTotalPages(pagination.totalPages || 0);
				setCurrentPage(pagination.currentPage || page);

				setCurrentList(receipts);
				setOriginalList(receipts);
			} else {
				throw new Error('Failed to fetch receipts');
			}
		} catch (error) {
			console.error('Error fetching receipts:', error);
			showToast('Lỗi khi tải dữ liệu', 'error');
		}
	};

	// Sync temp search value with search term
	useEffect(() => {
		setTempSearchValue(searchTerm || '');
	}, [searchTerm]);

	// Main useEffect to handle all query params changes and call appropriate APIs
	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const overdueParam = queryParams.get('overdue');
		const deadlineStartParam = queryParams.get('deadlineStart');
		const deadlineEndParam = queryParams.get('deadlineEnd');
		const searchTermParam = queryParams.get('searchTerm');
		const pageParam = queryParams.get('page');
		const itemsPerPageParam = queryParams.get('itemsPerPage');
		const trackingNumberFilterParam = queryParams.get('noTrackingNumber');

		// Extract values from URL params
		const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;
		const itemsPerPage = itemsPerPageParam ? parseInt(itemsPerPageParam, 10) : receiptsPerPage;
		const trackingFilterValue = trackingNumberFilterParam === 'true';

		// Update all states first before making API calls
		setCurrentPage(pageNumber);

		if (itemsPerPageParam) {
			setReceiptsPerPage(itemsPerPage);
		}

		if (searchTermParam) {
			setSearchTerm(searchTermParam);
		} else if (!searchTermParam && searchTerm) {
			setSearchTerm('');
		}

		setShowTrackingNumberFilter(trackingFilterValue);

		// Now make API calls based on the filter type, passing URL params directly
		if (deadlineStartParam && deadlineEndParam) {
			const startDate = new Date(deadlineStartParam);
			const endDate = new Date(deadlineEndParam);
			setDateRange([startDate, endDate]);
			setShowTodayDeadlines(true);
			setShowOverdueFilter(false);
			fetchReceiptsByDeadlineWithPage(
				startDate,
				endDate,
				pageNumber,
				itemsPerPage,
				searchTermParam || '',
				trackingFilterValue,
			);
		} else if (overdueParam === 'true') {
			setShowOverdueFilter(true);
			setShowTodayDeadlines(false);
			fetchOverdueReceiptsWithPage(pageNumber, itemsPerPage, searchTermParam || '', trackingFilterValue);
		} else {
			// Normal mode or search mode
			setShowOverdueFilter(false);
			setShowTodayDeadlines(false);
			fetchReceipt(pageNumber, itemsPerPage, searchTermParam || '', trackingFilterValue);
		}
	}, [location.search]);

	// Handle pagination
	const handlePageChange = (pageNumber) => {
		if (pageNumber >= 1 && pageNumber <= totalPages) {
			const queryParams = new URLSearchParams(location.search);
			queryParams.set('page', pageNumber.toString());
			navigate(`${location.pathname}?${queryParams.toString()}`);
		}
	};

	// Handle items per page change
	const handleItemsPerPageChange = (newItemsPerPage) => {
		setReceiptsPerPage(newItemsPerPage);
		const queryParams = new URLSearchParams(location.search);
		queryParams.set('itemsPerPage', newItemsPerPage.toString());
		queryParams.delete('page'); // Reset to page 1
		navigate(`${location.pathname}?${queryParams.toString()}`);
	};

	// Handle clear search
	const handleClearSearch = () => {
		setSearchTerm('');
		setTempSearchValue('');
		navigate(location.pathname);
	};

	// Handle search input
	const handleSearchKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			const trimmedValue = e.target.value.trim();
			if (trimmedValue) {
				setSearchTerm(trimmedValue);
				const queryParams = new URLSearchParams(location.search);
				queryParams.set('searchTerm', trimmedValue);
				queryParams.delete('page');
				queryParams.delete('overdue');
				queryParams.delete('deadlineStart');
				queryParams.delete('deadlineEnd');
				navigate(`${location.pathname}?${queryParams.toString()}`);
			} else {
				handleClearSearch();
			}
		}
	};

	// Deadline filter functions
	const fetchReceiptsByDeadlineWithPage = async (
		start,
		end,
		page,
		limit = receiptsPerPage,
		searchTermParam = null,
		trackingFilterParam = null,
	) => {
		try {
			const payload = {
				page: page,
				itemsPerPage: limit,
				status: ['2', '3', '4', '5'],
				deadlineStart: start.toISOString(),
				deadlineEnd: end.toISOString(),
				columns: [
					'id',
					'receiptId',
					'status',
					'orderId',
					'deadline',
					'_deprecated_trackingNumber',
					'_deprecated_originalTrackingNumber',
					'client',
					'reportRecipient',
					'sampleId',
					'analyses',
					'reports',
					'resultValue',
					'technicianId',
				],
			};

			// Use parameter if provided, otherwise use state
			const effectiveSearchTerm = searchTermParam !== null ? searchTermParam : searchTerm;
			const effectiveTrackingFilter = trackingFilterParam !== null ? trackingFilterParam : showTrackingNumberFilter;

			// Add searchTerm to payload if it exists
			if (effectiveSearchTerm && effectiveSearchTerm.trim()) {
				payload.searchTerm = effectiveSearchTerm.trim();
			}

			// Add tracking number filter if active
			if (effectiveTrackingFilter) {
				payload._deprecated_trackingNumber = [''];
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', payload);

			if (response.status === 200) {
				const receipts = response.data?.result || [];
				const pagination = response.data?.pagination || {};

				setTotalItems(pagination.totalItems || 0);
				setTotalPages(pagination.totalPages || 0);
				setCurrentPage(pagination.currentPage || page);

				setCurrentList(receipts);
				setOriginalList(receipts);

				setFilterInfo({
					isFilterActive: true,
					count: receipts.length,
					startDate: start,
					endDate: end,
					totalItems: pagination.totalItems || 0,
				});
			} else {
				throw new Error('Failed to fetch receipts');
			}
		} catch (error) {
			console.error('Error fetching receipts by deadline:', error);
			showToast('Lỗi khi tải dữ liệu', 'error');
		}
	};

	const fetchOverdueReceiptsWithPage = async (
		page,
		limit = receiptsPerPage,
		searchTermParam = null,
		trackingFilterParam = null,
	) => {
		try {
			const today = new Date();
			const payload = {
				page: page,
				itemsPerPage: limit,
				status: ['2', '3', '4', '5'],
				deadlineEndAt: today.toISOString(),
				columns: [
					'id',
					'receiptId',
					'status',
					'orderId',
					'deadline',
					'_deprecated_trackingNumber',
					'_deprecated_originalTrackingNumber',
					'client',
					'reportRecipient',
					'sampleId',
					'analyses',
					'reports',
					'resultValue',
					'technicianId',
				],
			};

			// Use parameter if provided, otherwise use state
			const effectiveSearchTerm = searchTermParam !== null ? searchTermParam : searchTerm;
			const effectiveTrackingFilter = trackingFilterParam !== null ? trackingFilterParam : showTrackingNumberFilter;

			// Add searchTerm to payload if it exists
			if (effectiveSearchTerm && effectiveSearchTerm.trim()) {
				payload.searchTerm = effectiveSearchTerm.trim();
			}

			// Add tracking number filter if active
			if (effectiveTrackingFilter) {
				payload._deprecated_trackingNumber = [''];
			}

			const response = await apiPost('https://red.irdop.org/v1/receipt/get/recent', payload);

			if (response.status === 200) {
				const receipts = response.data?.result || [];
				const pagination = response.data?.pagination || {};

				setTotalItems(pagination.totalItems || 0);
				setTotalPages(pagination.totalPages || 0);
				setCurrentPage(pagination.currentPage || page);

				setCurrentList(receipts);
				setOriginalList(receipts);
			} else {
				throw new Error('Failed to fetch overdue receipts');
			}
		} catch (error) {
			console.error('Error fetching overdue receipts:', error);
			showToast('Lỗi khi tải dữ liệu', 'error');
		}
	};

	const filterTodayDeadlines = (e) => {
		if (showTodayDeadlines && !e.target.closest('.datepicker-container')) {
			handleResetDateFilter();
			return;
		}

		if (!showTodayDeadlines) {
			setShowTodayDeadlines(true);
			setIsCalendarOpen(true);
			setShowOverdueFilter(false);
			setSearchTerm('');
		}
	};

	const handleDateRangeChange = (update) => {
		setDateRange(update);

		if (update[0] && update[1]) {
			setIsCalendarOpen(false);

			const queryParams = new URLSearchParams(location.search);
			queryParams.set('deadlineStart', update[0].toISOString());
			queryParams.set('deadlineEnd', update[1].toISOString());
			queryParams.delete('page');
			queryParams.delete('overdue');
			queryParams.delete('searchTerm');
			// Keep itemsPerPage if it exists
			// queryParams already has itemsPerPage from location.search if it was set

			navigate(`${location.pathname}?${queryParams.toString()}`);
		}
	};

	const handleResetDateFilter = () => {
		setShowTodayDeadlines(false);
		setShowDateRangePicker(false);
		setIsCalendarOpen(false);

		const today = new Date();
		setDateRange([today, today]);

		setFilterInfo({
			isFilterActive: false,
			count: 0,
			startDate: null,
			endDate: null,
		});

		const queryParams = new URLSearchParams(location.search);
		queryParams.delete('deadlineStart');
		queryParams.delete('deadlineEnd');
		queryParams.delete('page');
		navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
	};

	const toggleOverdueFilter = () => {
		const queryParams = new URLSearchParams(location.search);

		if (showOverdueFilter) {
			queryParams.delete('overdue');
			queryParams.delete('page');
			setShowOverdueFilter(false);
		} else {
			queryParams.set('overdue', 'true');
			queryParams.delete('page');
			queryParams.delete('deadlineStart');
			queryParams.delete('deadlineEnd');
			queryParams.delete('searchTerm');
			setShowOverdueFilter(true);
			setShowTodayDeadlines(false);
			setSearchTerm('');
		}

		navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
	};

	// Toggle tracking number filter
	const toggleTrackingNumberFilter = () => {
		const queryParams = new URLSearchParams(location.search);

		if (showTrackingNumberFilter) {
			queryParams.delete('noTrackingNumber');
			queryParams.delete('page');
			setShowTrackingNumberFilter(false);
		} else {
			queryParams.set('noTrackingNumber', 'true');
			queryParams.delete('page');
			setShowTrackingNumberFilter(true);
		}

		navigate(queryParams.toString() ? `${location.pathname}?${queryParams.toString()}` : location.pathname);
	};

	// Mouse hover handlers
	const handleReceiptMouseEnter = (receiptId) => {
		setHoveredReceiptId(receiptId);
	};

	const handleReceiptMouseLeave = () => {
		setHoveredReceiptId(null);
	};

	const handleSampleMouseEnter = (receiptId, sampleId) => {
		setHoveredReceiptId(receiptId);
		setHoveredSampleId(sampleId);
	};

	// Get samples to show for each receipt
	const getSamplesToShow = (receipt) => {
		return receipt.samples || [];
	};

	// Since we're using server-side pagination, we don't need to slice the data
	const paginatedReceipts = currentList;

	return (
		<div className="flex flex-col justify-between items-center w-full">
			{/* Toast styling */}
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
					background-color: #1976d2 !important;
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
				.colored-toast.swal2-icon-info .swal2-icon.swal2-info {
					border-color: white;
					color: white;
				}
			`}</style>

			{/* Header with title and search */}
			<div className="flex flex-col w-full mb-4 font-semibold py-4 border-b-2">
				<div className="flex flex-wrap items-center justify-between gap-4 mb-2">
					<h1 className="text-2xl md:text-3xl font-bold text-primary text-start">TIẾN ĐỘ MẪU</h1>

					{/* Search bar */}
					<div className="flex items-center gap-2">
						<div className="relative w-full md:w-full md:max-w-[400px] xl:max-w-xl">
							<input
								type="text"
								value={tempSearchValue}
								onChange={(e) => setTempSearchValue(e.target.value)}
								onKeyDown={handleSearchKeyDown}
								placeholder="Tìm kiếm..."
								className="w-full p-2 pl-10 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
						</div>
					</div>
				</div>

				{/* Filter buttons */}
				<div className="flex items-center justify-between flex-wrap gap-2 mt-2">
					{/* Left side - Navigation button */}
					<div className="flex items-center gap-2">
						<button
							className="p-2 rounded-lg border border-gray-300 flex items-center justify-center focus:outline-none gap-2 py-1 text-black hover:bg-gray-100"
							onClick={() => navigate(`/dashboard${location.search}`)}
							title="Chuyển sang trang Tiến trình"
						>
							<span className="font-normal">← Tiến trình</span>
						</button>
					</div>

					{/* Right side - Filter buttons */}
					<div className="flex items-center space-x-2 flex-wrap gap-2">
						{/* Deadline filter button */}
						<button
							className={`p-2 rounded-lg border-gray-400 flex items-center justify-center focus:outline-none gap-2 py-1 ${
								showTodayDeadlines ? 'text-white bg-blue-600' : 'text-black border border-gray-300'
							}`}
							onClick={(e) => filterTodayDeadlines(e)}
							title={
								showTodayDeadlines
									? 'Click outside the date picker to cancel'
									: 'Chọn khoảng thời gian để lọc theo deadline'
							}
						>
							<FaCalendarDay size={18} />
							<span className="font-normal">Deadline</span>
							{showTodayDeadlines && (
								<div
									className="relative z-1000 text-black datepicker-container flex"
									onClick={(e) => e.stopPropagation()}
								>
									<DatePicker
										ref={datePickerRef}
										selected={startDate}
										onChange={handleDateRangeChange}
										startDate={startDate}
										endDate={endDate}
										selectsRange
										dateFormat="dd/MM/yyyy"
										placeholderText="Chọn khoảng thời gian"
										className="p-2 py-0 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-52 cursor-pointer"
										open={isCalendarOpen}
										onInputClick={() => setIsCalendarOpen(true)}
										onClickOutside={() => {
											setIsCalendarOpen(false);
										}}
										shouldCloseOnSelect={false}
										popperContainer={({ children }) => createPortal(children, document.body)}
										popperProps={{
											positionFixed: true,
										}}
										popperModifiers={{
											preventOverflow: {
												enabled: true,
												boundariesElement: 'viewport',
											},
											flip: {
												enabled: true,
											},
											offset: {
												enabled: true,
												offset: '0, 5',
											},
										}}
									/>
									<button
										className="ml-1 p-1 rounded bg-gray-200 hover:bg-gray-300 focus:outline-none"
										onClick={(e) => {
											e.stopPropagation();
											handleResetDateFilter();
										}}
										title="Đóng bộ lọc deadline"
									>
										<FaTimes size={14} />
									</button>
								</div>
							)}
						</button>

						{/* Overdue filter button */}
						<button
							className={`p-2 rounded-lg border-gray-400 flex items-center justify-center focus:outline-none gap-2 py-1 ${
								showOverdueFilter ? 'text-white bg-blue-600' : 'text-black border border-gray-300'
							}`}
							onClick={toggleOverdueFilter}
							title={showOverdueFilter ? 'Hiển thị danh sách bình thường' : 'Hiển thị danh sách quá hạn'}
						>
							<FaCalendarDay size={18} />
							<span className="font-normal">Overdue</span>
						</button>
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="bg-white rounded-lg w-full pb-4 pt-2">
				{/* Search results info */}
				<div className="px-4 mb-2 text-left">
					{location.search.includes('searchTerm=') && searchTerm && (
						<div className="text-sm text-gray-500">
							Tìm thấy <span className="font-medium">{totalItems}</span> tiếp nhận có từ khoá{' '}
							<span className="font-medium">{searchTerm}</span>
							<button
								onClick={handleClearSearch}
								className="ml-2 text-blue-600 px-2 py-0.5 bg-background border-2 border-gray-400 rounded"
							>
								Hủy
							</button>
						</div>
					)}

					{/* Deadline filter info */}
					{filterInfo.isFilterActive &&
						filterInfo.startDate &&
						filterInfo.endDate &&
						!location.search.includes('searchTerm=') && (
							<div className="text-sm text-gray-500 mt-1">
								Hiển thị <span className="font-medium">{currentList.length}</span> trong số{' '}
								<span className="font-medium">{filterInfo.totalItems || totalItems}</span> tiếp nhận có hạn trả kết quả
								từ <span className="font-medium">{formatDate(filterInfo.startDate)}</span> đến{' '}
								<span className="font-medium">{formatDate(filterInfo.endDate)}</span>
								{totalPages > 1 && (
									<span>
										{' '}
										- Trang {currentPage}/{totalPages}
									</span>
								)}
								<button
									onClick={handleResetDateFilter}
									className="ml-2 text-blue-600 px-2 py-0.5 bg-background border-2 border-gray-400 rounded"
								>
									Hủy
								</button>
							</div>
						)}

					{/* Overdue filter info */}
					{showOverdueFilter && !location.search.includes('searchTerm=') && (
						<div className="text-sm text-gray-500 mt-1">
							Hiển thị <span className="font-medium">{currentList.length}</span> trong số{' '}
							<span className="font-medium">{totalItems}</span> tiếp nhận đã quá hạn
							{totalPages > 1 && (
								<span>
									{' '}
									- Trang {currentPage}/{totalPages}
								</span>
							)}
							<button
								onClick={toggleOverdueFilter}
								className="ml-2 text-blue-600 px-2 py-0.5 bg-background border-2 border-gray-400 rounded"
							>
								Hủy
							</button>
						</div>
					)}
				</div>

				{/* Table */}
				<div className="overflow-x-auto px-1 py-2">
					<table className="w-full text-black">
						<thead>
							<tr className="border-b-2">
								<th className="p-1 border-b text-start min-w-[200px]">Mã tiếp nhận mẫu</th>
								<th className="p-1 border-b text-start min-w-[120px]">Hạn trả KQ</th>
								<th className="p-1 border-b text-start min-w-[200px]">Khách hàng</th>
								<th className="p-1 border-b text-start min-w-[250px]">Địa chỉ nhận</th>
								<th
									className={`p-1 border-b text-start min-w-[120px] cursor-pointer hover:bg-gray-100 ${
										showTrackingNumberFilter ? 'bg-blue-50' : ''
									}`}
									onClick={toggleTrackingNumberFilter}
									title={showTrackingNumberFilter ? 'Click để bỏ lọc vận đơn trống' : 'Click để lọc vận đơn trống'}
								>
									Vận đơn {showTrackingNumberFilter && <span className="text-blue-600">⦿</span>}
								</th>
								<th className="p-1 border-b text-start min-w-[150px]">Mã mẫu</th>
								<th className="p-1 border-b text-start min-w-[100px]">Chỉ tiêu</th>
								<th className="p-1 border-b text-start min-w-[150px]">Mã PPT</th>
							</tr>
						</thead>
						<tbody>
							{paginatedReceipts.map((receipt) => {
								const samplesToShow = getSamplesToShow(receipt);

								return (
									<React.Fragment key={`fragment-${receipt.receiptId || receipt.id}`}>
										{samplesToShow.length === 0 ? (
											<tr
												key={`row-${receipt.receiptId || receipt.id}`}
												className={`border-t border-b ${hoveredReceiptId === receipt.receiptId ? 'bg-gray-50' : ''}`}
												onMouseEnter={() => handleReceiptMouseEnter(receipt.receiptId)}
												onMouseLeave={handleReceiptMouseLeave}
											>
												{/* Receipt code with order ID */}
												<td className="p-1 text-start align-top">
													<div className="flex flex-col">
														<NavLink
															className="text-primary font-semibold hover:text-[#103667]"
															to={`/dashboard/receipt?receiptId=${receipt.receiptId || receipt.id}`}
														>
															{receipt.receiptId || receipt.id}
														</NavLink>
														<p className="text-sm text-gray-700 mt-1">Đơn hàng: {receipt.orderId}</p>
													</div>
												</td>

												{/* Deadline */}
												<td className="p-1 text-start align-top">
													<p className="text-sm">{receipt.deadline ? formatDate(receipt.deadline) : '--'}</p>
												</td>

												{/* Client information */}
												<td className="p-1 text-start align-top">
													<div className="flex flex-col">
														<p className="text-sm font-medium">{receipt.client?.clientName}</p>
														<p className="text-xs text-gray-600 mt-1">{receipt.client?.legalId}</p>
													</div>
												</td>

												{/* Report recipient address */}
												<td className="p-1 text-start align-top">
													<div className="flex flex-col">
														<p className="text-sm">Địa chỉ: {receipt.reportRecipient?.address}</p>
														<p className="text-xs text-gray-600 mt-1">Email: {receipt.reportRecipient?.email}</p>
													</div>
												</td>

												{/* Tracking number */}
												<td className="p-1 text-start align-top">
													{receipt._deprecated_trackingNumber ? (
														<div className="flex flex-col items-start space-y-1">
															{/* Display existing tracking numbers */}
															{receipt._deprecated_trackingNumber.split(',').map((trackingNum, index) => {
																const trimmedNum = trackingNum.trim();
																if (!trimmedNum) return null;

																// Check if this is a direct pickup tracking number (starts with TT)
																const isDirectPickup = trimmedNum.startsWith('TT');

																return (
																	<div key={index} className="flex items-center space-x-2">
																		<span
																			className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
																			onClick={() => {
																				setSelectedReceipt({
																					...receipt,
																					_deprecated_trackingNumber: trimmedNum,
																					_deprecated_originalTrackingNumber: receipt._deprecated_trackingNumber,
																					mode: 'auto',
																				});
																				setShowShipmentForm(true);
																			}}
																		>
																			{trimmedNum}
																		</span>
																		{!isDirectPickup && (
																			<a
																				href={`https://viettelpost.vn/thong-tin-don-hang?peopleTracking=sender&orderNumber=${trimmedNum}&orderType=1`}
																				target="_blank"
																				rel="noopener noreferrer"
																				className="text-green-600 hover:text-green-800 flex items-center text-xs"
																				onClick={(e) => e.stopPropagation()}
																				title="Theo dõi đơn hàng trên Viettel Post"
																			>
																				<FaExternalLinkAlt size={10} className="mr-1" /> Track
																			</a>
																		)}
																	</div>
																);
															})}
															{/* Always show "Add shipment" button at the bottom */}
															<div
																className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs border border-blue-300 rounded px-2 py-1 hover:bg-blue-50"
																onClick={() => {
																	setSelectedReceipt({ ...receipt, mode: 'new' });
																	setShowShipmentForm(true);
																}}
															>
																+ Thêm vận đơn
															</div>
														</div>
													) : (
														<div
															className="cursor-pointer text-gray-500 hover:text-blue-600 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
															onClick={() => {
																setSelectedReceipt({ ...receipt, mode: 'new' });
																setShowShipmentForm(true);
															}}
														>
															Tạo vận đơn
														</div>
													)}
												</td>

												{/* Empty sample columns */}
												<td className="p-1 text-start text-gray-500">--</td>
												<td className="p-1 text-start text-gray-500">--</td>
												<td className="p-1 text-start text-gray-500">--</td>
											</tr>
										) : (
											samplesToShow.map((sample, sampleIndex) => {
												// Calculate tests count
												const totalTests = sample?.analyses?.length || 0;
												const completedTests =
													sample?.analyses?.filter(
														(analysis) => analysis?.resultValue !== null && analysis?.resultValue !== '<p></p>',
													)?.length || 0;
												const assignedTests =
													sample?.analyses?.filter(
														(analysis) => analysis?.technicianId !== null && analysis?.technicianId !== '',
													)?.length || 0;

												// Get reports for this sample
												const reports = sample.report || [];

												return (
													<tr
														key={`${receipt?.receiptId || 'unknown'}-${sample?.sampleId || 'unknown'}-${sampleIndex}`}
														className={`${sampleIndex === 0 ? 'border-t' : ''} 
																${sampleIndex === samplesToShow.length - 1 ? 'border-b' : ''} 
																${hoveredSampleId === sample?.sampleId ? 'bg-gray-100' : hoveredReceiptId === receipt?.receiptId ? 'bg-gray-50' : ''}`}
														onMouseEnter={() => handleSampleMouseEnter(receipt?.receiptId, sample?.sampleId)}
														onMouseLeave={() => {
															setHoveredSampleId(null);
															setHoveredReceiptId(null);
														}}
													>
														{/* Common columns for the first sample in receipt */}
														{sampleIndex === 0 && (
															<>
																{/* Receipt code with order ID */}
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt?.receiptId ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																>
																	<div className="flex flex-col">
																		<NavLink
																			className="text-primary font-semibold hover:text-[#103667]"
																			to={`/dashboard/receipt?receiptId=${receipt.receiptId || receipt.id}`}
																		>
																			{receipt.receiptId || receipt.id}
																		</NavLink>
																		<p className="text-sm text-gray-700 mt-1">Đơn hàng: {receipt.orderId}</p>
																	</div>
																</td>

																{/* Deadline */}
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt.receiptId ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																>
																	<p className="text-sm">{receipt.deadline ? formatDate(receipt.deadline) : '--'}</p>
																</td>

																{/* Client information */}
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt.receiptId ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																>
																	<div className="flex flex-col">
																		<p className="text-sm font-medium">{receipt.client?.clientName}</p>
																		<p className="text-xs text-gray-600 mt-1">{receipt.client?.legalId}</p>
																	</div>
																</td>

																{/* Report recipient address */}
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt.receiptId ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																>
																	<div className="flex flex-col">
																		<p className="text-sm">Địa chỉ: {receipt.reportRecipient?.address || '--'}</p>
																		<p className="text-xs text-gray-600 mt-1">
																			Email: {receipt.reportRecipient?.email}
																		</p>
																	</div>
																</td>

																{/* Tracking number */}
																<td
																	className={`p-1 text-start align-top ${
																		hoveredReceiptId === receipt.receiptId ? 'bg-gray-50' : ''
																	}`}
																	rowSpan={samplesToShow.length}
																>
																	{receipt._deprecated_trackingNumber ? (
																		<div className="flex flex-col items-start space-y-1">
																			{/* Display existing tracking numbers */}
																			{receipt._deprecated_trackingNumber.split(',').map((trackingNum, index) => {
																				const trimmedNum = trackingNum.trim();
																				if (!trimmedNum) return null;

																				// Check if this is a direct pickup tracking number (starts with TT)
																				const isDirectPickup = trimmedNum.startsWith('TT');

																				return (
																					<div key={index} className="flex items-center space-x-2">
																						<span
																							className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
																							onClick={() => {
																								setSelectedReceipt({
																									...receipt,
																									_deprecated_trackingNumber: trimmedNum,
																									_deprecated_originalTrackingNumber:
																										receipt._deprecated_trackingNumber,
																									mode: 'auto',
																								});
																								setShowShipmentForm(true);
																							}}
																						>
																							{trimmedNum}
																						</span>
																						{!isDirectPickup && (
																							<a
																								href={`https://viettelpost.vn/thong-tin-don-hang?peopleTracking=sender&orderNumber=${trimmedNum}&orderType=1`}
																								target="_blank"
																								rel="noopener noreferrer"
																								className="text-green-600 hover:text-green-800 flex items-center text-xs"
																								onClick={(e) => e.stopPropagation()}
																								title="Theo dõi đơn hàng trên Viettel Post"
																							>
																								<FaExternalLinkAlt size={10} className="mr-1" /> Track
																							</a>
																						)}
																					</div>
																				);
																			})}
																			{/* Always show "Add shipment" button at the bottom */}
																			<div
																				className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs border border-blue-300 rounded px-2 py-1 hover:bg-blue-50"
																				onClick={() => {
																					setSelectedReceipt({ ...receipt, mode: 'new' });
																					setShowShipmentForm(true);
																				}}
																			>
																				+ Thêm vận đơn
																			</div>
																		</div>
																	) : (
																		<div
																			className="cursor-pointer text-gray-500 hover:text-blue-600 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
																			onClick={() => {
																				setSelectedReceipt({ ...receipt, mode: 'new' });
																				setShowShipmentForm(true);
																			}}
																		>
																			Tạo vận đơn
																		</div>
																	)}
																</td>
															</>
														)}

														{/* Sample-specific columns */}
														{/* Sample ID */}
														<td className="p-1 text-start align-top">
															<div className="text-sm">
																{sample.sampleId ? (
																	<NavLink
																		to={`/dashboard/sample?receiptId=${receipt.receiptId}&sampleId=${sample.sampleId}`}
																		className="text-primary hover:text-[#103667] font-medium"
																	>
																		{sample.sampleId}
																	</NavLink>
																) : (
																	'--'
																)}
															</div>
														</td>

														{/* Tests count (Chỉ tiêu) */}
														<td className="p-1 text-start align-top">
															<div className="text-sm">
																{totalTests > 0 ? (
																	<span
																		className={`font-medium ${
																			completedTests === totalTests
																				? 'text-green-800'
																				: completedTests > 0
																				? 'text-yellow-600'
																				: 'text-gray-600'
																		}`}
																	>
																		{completedTests}/{assignedTests}/{totalTests}
																	</span>
																) : (
																	<span className="text-gray-500">0/0/0</span>
																)}
															</div>
														</td>

														{/* PPT Report (refNumber) */}
														<td className="p-1 text-start align-top">
															<div className="text-sm">
																{reports && reports.length > 0 && reports[0].refNumber ? (
																	<button
																		onClick={() => {
																			const url = `/report?sampleId=${sample.sampleId}&ppt_uid=${
																				reports[0].ppt_uid || ''
																			}`;
																			window.open(url, '_blank');
																		}}
																		className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none p-0"
																		title="Click để mở báo cáo trong tab mới"
																	>
																		{reports[0].refNumber}
																	</button>
																) : (
																	'--'
																)}
															</div>
														</td>
													</tr>
												);
											})
										)}
									</React.Fragment>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className="flex justify-between items-center mt-4">
					<div className="flex items-center gap-4">
						<div>
							<label className="block text-sm font-medium mb-1">Items per page</label>
							<select
								value={receiptsPerPage}
								onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
								className="px-3 py-2 border rounded bg-white"
							>
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
						</div>
						<div className="text-sm text-gray-600">Total: {totalItems} receipts</div>
					</div>
					{totalPages > 1 && (
						<div className="pagination flex items-center gap-2">
							<button
								onClick={() => handlePageChange(currentPage - 1)}
								disabled={currentPage <= 1}
								className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
							>
								Previous
							</button>

							<div className="flex items-center gap-1">
								{(() => {
									const pages = [];
									const totalPagesNum = totalPages;
									const current = currentPage;

									if (totalPagesNum <= 7) {
										// If total pages <= 7, show all pages
										for (let i = 1; i <= totalPagesNum; i++) {
											pages.push(i);
										}
									} else {
										// Always show first page
										pages.push(1);

										// Determine the range around current page
										let startRange, endRange;

										if (current <= 3) {
											// Current page is near the beginning
											startRange = 2;
											endRange = 5;
										} else if (current >= totalPagesNum - 2) {
											// Current page is near the end
											startRange = totalPagesNum - 4;
											endRange = totalPagesNum - 1;
										} else {
											// Current page is in the middle
											startRange = current - 1;
											endRange = current + 1;
										}

										// Add ellipsis after first page if needed
										if (startRange > 2) {
											pages.push('...');
										}

										// Add pages in the range (ensure no duplicates with first/last page)
										for (let i = startRange; i <= endRange; i++) {
											if (i > 1 && i < totalPagesNum) {
												pages.push(i);
											}
										}

										// Add ellipsis before last page if needed
										if (endRange < totalPagesNum - 1) {
											pages.push('...');
										}

										// Always show last page
										pages.push(totalPagesNum);
									}

									return pages.map((page, index) => {
										if (page === '...') {
											return (
												<span key={`ellipsis-${index}`} className="px-2 text-gray-400">
													...
												</span>
											);
										}
										return (
											<button
												key={`page-${page}`}
												onClick={() => handlePageChange(page)}
												className={`px-3 py-2 border rounded hover:bg-gray-100 ${
													page === current ? 'bg-blue-500 text-white' : ''
												}`}
											>
												{page}
											</button>
										);
									});
								})()}
							</div>

							<button
								onClick={() => handlePageChange(currentPage + 1)}
								disabled={currentPage >= totalPages}
								className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
							>
								Next
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Shipment Form Modal */}
			{showShipmentForm && selectedReceipt && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
					<ShipmentForm
						key={selectedReceipt._deprecated_trackingNumber || `new-${selectedReceipt.receiptId}`}
						receipt={selectedReceipt}
						onClose={() => {
							setShowShipmentForm(false);
							setSelectedReceipt(null);
						}}
						onOrderUpdate={(updatedReceipt) => {
							// Update the receipt in the current list
							setCurrentList((prevList) =>
								prevList.map((r) => (r.id === updatedReceipt.id ? { ...r, ...updatedReceipt } : r)),
							);
							setShowShipmentForm(false);
							setSelectedReceipt(null);
							// Refresh the data to get latest tracking numbers
							fetchReceipt(currentPage, receiptsPerPage);
						}}
						mode={selectedReceipt.mode || 'auto'}
					/>
				</div>
			)}
		</div>
	);
};

export default ProgressDashboard;
