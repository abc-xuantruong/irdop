import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import FilterBar from './FilterBar';
import Breadcrumb from './Breadcrumb';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import CreateReceipt from './CreateReceipt';
import CreateReceiptFromCRM from './CreateReceiptFromCRM';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaTrashAlt, FaMoneyBillWave } from 'react-icons/fa'; // Added FaMoneyBillWave icon
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Dashboard = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { setCurrentTitlePage, status, purposes, formatDate, getIdenByUid, identityCache, currentUser } =
		useContext(GlobalContext);
	const [currentList, setCurrentList] = useState([]);
	const [originalList, setOriginalList] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [isFilter, setIsFilter] = useState(false); // State to track if filtering is active
	const [searchTerm, setSearchTerm] = useState('');

	// Remove isEditMode state
	// Add state to track which field is being edited
	const [editingField, setEditingField] = useState({ receiptId: null, sampleId: null, field: null });

	// Add state for user information
	const [userInfo, setUserInfo] = useState({});

	const [showRelativeTime, setShowRelativeTime] = useState(false); // Toggle between date format and relative time
	const receiptsPerPage = 15;
	const [hoveredReceiptId, setHoveredReceiptId] = useState(null);
	const [hoveredSampleId, setHoveredSampleId] = useState(null);
	let isFetch = false;

	// Date input state
	const [dateInputValues, setDateInputValues] = useState({});
	const [isDatePickerFocused, setIsDatePickerFocused] = useState(false);
	const [tempDateValues, setTempDateValues] = useState({});

	// Add these new state variables at the beginning of the component where other states are defined
	const [confirmPaymentChange, setConfirmPaymentChange] = useState(false);
	const [selectedReceiptId, setSelectedReceiptId] = useState(null);

	// Add new state to track payment column visibility (default is hidden)
	const [showPaymentColumn, setShowPaymentColumn] = useState(false);

	// Function to format date strings entered manually
	const formatDateString = (dateStr) => {
		// Remove any existing separators to normalize
		const normalized = dateStr.replace(/[^0-9]/g, '');

		if (normalized.length === 8) {
			// Format as DD/MM/YYYY if 8 digits
			return `${normalized.substring(0, 2)}/${normalized.substring(2, 4)}/${normalized.substring(4)}`;
		} else if (dateStr.length === 10) {
			// Replace the 3rd and 6th characters with "/" for 10-char strings
			return `${dateStr.substring(0, 2)}/${dateStr.substring(3, 5)}/${dateStr.substring(6)}`;
		}

		// Return original if it doesn't match our patterns
		return dateStr;
	};

	// Function to convert DD/MM/YYYY string to Date object
	const parseDateString = (dateStr) => {
		if (!dateStr) return null;

		// Handle formatted date strings
		const parts = dateStr.split('/');
		if (parts.length === 3) {
			const day = parseInt(parts[0], 10);
			const month = parseInt(parts[1], 10) - 1; // Month is 0-based in JS Date
			const year = parseInt(parts[2], 10);

			if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
				return new Date(year, month, day);
			}
		}

		// Fallback to standard parsing
		const parsedDate = new Date(dateStr);
		return isNaN(parsedDate.getTime()) ? null : parsedDate;
	};

	// Handle raw date input change
	const handleDateInputChange = (receiptId, e) => {
		setDateInputValues({
			...dateInputValues,
			[receiptId]: e.target.value,
		});
	};

	// Handle date picker focus
	const handleDatePickerFocus = (receiptId, currentDate) => {
		setIsDatePickerFocused(true);
		setTempDateValues({
			...tempDateValues,
			[receiptId]: currentDate,
		});
	};

	// Handle date picker blur - only update if value has changed
	const handleDatePickerBlur = (receiptId, currentDate) => {
		if (isDatePickerFocused) {
			// Compare with original value and update if different
			if (currentDate !== tempDateValues[receiptId]) {
				handleDeadlineChangeAPI(receiptId, currentDate);
			}
			setIsDatePickerFocused(false);
		}
	};

	// Handle temporary date change without API call
	const handleTempDateChange = (receiptId, date) => {
		// Just update the component state without API call
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					return { ...receipt, deadline: date };
				}
				return receipt;
			});
		});
	};

	// Handle deadline key down for date validation and submission
	const handleDeadlineKeyDown = (e, receiptId) => {
		if (e.key === 'Enter') {
			e.preventDefault();

			// Check if there's a manual input
			if (dateInputValues[receiptId]) {
				const formattedDate = formatDateString(dateInputValues[receiptId]);
				const parsedDate = parseDateString(formattedDate);

				if (parsedDate) {
					handleDeadlineChangeAPI(receiptId, parsedDate);
				} else {
					toast.error('Định dạng ngày không hợp lệ. Sử dụng định dạng DD/MM/YYYY hoặc DDMMYYYY');

					// Restore original value
					if (tempDateValues[receiptId]) {
						handleTempDateChange(receiptId, tempDateValues[receiptId]);
					}
				}
			} else {
				// If using the date picker directly
				const receipt = currentList.find((r) => r.id === receiptId);
				if (receipt && receipt.deadline) {
					handleDeadlineChangeAPI(receiptId, receipt.deadline);
				}
			}

			// Reset state and remove focus
			setDateInputValues({
				...dateInputValues,
				[receiptId]: undefined,
			});
			setEditingField({ receiptId: null, sampleId: null, field: null });
			if (document.activeElement) {
				document.activeElement.blur();
			}
		} else if (e.key === 'Escape') {
			// Revert to original value
			if (tempDateValues[receiptId]) {
				handleTempDateChange(receiptId, tempDateValues[receiptId]);
			}

			setDateInputValues({
				...dateInputValues,
				[receiptId]: undefined,
			});
			setEditingField({ receiptId: null, sampleId: null, field: null });
			if (document.activeElement) {
				document.activeElement.blur();
			}
		}
	};

	// Split date handling into two functions:
	// 1. UI update function
	const handleDeadlineChange = (receiptId, date) => {
		handleTempDateChange(receiptId, date);
	};

	// 2. API update function - only called on explicit confirmation
	const handleDeadlineChangeAPI = async (receiptId, newDeadline) => {
		try {
			// If we have a date, adjust it for GMT+7 timezone
			let formattedDate = null;
			if (newDeadline) {
				// Add 7 hours to account for GMT+7
				const adjustedDate = new Date(newDeadline);
				adjustedDate.setHours(adjustedDate.getHours() + 7);
				formattedDate = adjustedDate.toISOString().split('T')[0];
			}

			const payload = {
				receipt: {
					id: receiptId,
					deadline: formattedDate,
					modified_by_uid: currentUser?.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				toast.success(`Cập nhật thông tin thành công!`, { autoClose: 1000 });
				fetchReceipt(); // Fetch new data to update the list
			} else {
				toast.error(`Lỗi khi cập nhật hạn trả`);
			}
		} catch (error) {
			console.error('Error updating receipt deadline:', error);
			toast.error('Có lỗi xảy ra khi cập nhật hạn trả');
		} finally {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	// Function to fetch user identity information
	const fetchUserIdentity = async (uid) => {
		if (identityCache[uid]) {
			setUserInfo((prev) => ({ ...prev, [uid]: identityCache[uid] }));
			return;
		}

		try {
			const userData = await getIdenByUid(uid);
			if (userData) {
				setUserInfo((prev) => ({ ...prev, [uid]: userData }));
			}
		} catch (error) {
			console.error(`Error fetching user info for ${uid}:`, error);
		}
	};

	// Function to get user name from identity
	const getUserName = (uid) => {
		if (!uid) return '';
		if (userInfo[uid]?.identity_name) {
			return userInfo[uid].identity_name;
		}
		if (uid === currentUser?.identity_uid) {
			return currentUser.identity_name;
		}
		return uid; // Fallback to UID if name not found
	};

	// Helper function to check if value is empty or invalid
	const displayValue = (value) => {
		if (value === null || value === undefined || value === '') {
			return <span className="text-start block">--</span>;
		}
		return value;
	};

	// Format deadline as relative time
	const formatDeadlineAsRelative = (deadline) => {
		if (!deadline) return <span className="text-start block">--</span>;

		const deadlineDate = new Date(deadline);
		const today = new Date();

		// Reset time part for date comparison
		const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
		const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

		// Calculate difference in days
		const diffTime = deadlineDay - todayDay;
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return <span className="font-bold text-orange-400">Hôm nay</span>;
		} else if (diffDays > 0) {
			// For future dates, just show days without hours
			return <span className="text-green-600">{diffDays} ngày</span>;
		} else {
			return <span className="font-bold text-red-500">Quá {Math.abs(diffDays)} ngày</span>;
		}
	};

	// New function to check if a date is today or past due
	const isDeadlineToday = (deadline) => {
		if (!deadline) return false;

		const deadlineDate = new Date(deadline);
		const today = new Date();

		// Reset time part for comparison
		const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
		const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

		return deadlineDay <= todayDay;
	};

	// Format the date with appropriate styling
	const formatDeadlineWithStyle = (deadline) => {
		if (!deadline) return <span className="text-start block">--</span>;

		if (isDeadlineToday(deadline)) {
			return <span className="font-bold text-red-500">{formatDate(deadline)}</span>;
		}

		return formatDate(deadline);
	};

	// Toggle between date format and relative time
	const toggleDeadlineFormat = () => {
		setShowRelativeTime(!showRelativeTime);
	};

	// Toggle payment column visibility
	const togglePaymentColumn = () => {
		setShowPaymentColumn(!showPaymentColumn);
	};

	useEffect(() => {
		setCurrentTitlePage('Danh sách tiếp nhận mẫu');
	}, [setCurrentTitlePage]);

	// Parse URL search parameters when component mounts
	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const searchQuery = queryParams.get('search');

		if (searchQuery) {
			setSearchTerm(searchQuery);
			setIsFilter(true);

			// Fetch search results
			const fetchSearchResults = async () => {
				try {
					const response = await apiPost('https://black.irdop.org/khsi19me/db/search/receipt', {
						query: searchQuery,
					});
					setCurrentList(response.data);
				} catch (error) {
					console.error('Error searching receipts:', error);
					toast.error('Có lỗi xảy ra khi tìm kiếm');
				}
			};

			fetchSearchResults();
		} else {
			// Still fetch normal data if no search query
			if (!isFetch) {
				fetchReceipt();
				isFetch = true;
			}
		}
	}, [location.search]);

	const fetchReceipt = async () => {
		try {
			const response = await apiGet('https://black.irdop.org/khsi19me/db/get/recent_receipt');
			// Store the original fetched data
			setOriginalList(response.data);
			// If there's no active filter, update the current list as well
			if (!isFilter) {
				setCurrentList(response.data);
			}
			console.log('Data fetched:', response.data);

			// Fetch user information for all receipts
			response.data.forEach((receipt) => {
				if (receipt.created_by_uid) {
					fetchUserIdentity(receipt.created_by_uid);
				}
			});
		} catch (error) {
			console.error('Error fetching receipts:', error);
		}
	};

	useEffect(() => {
		if (!isFetch) {
			fetchReceipt();
			isFetch = true;
		}
	}, []);

	useEffect(() => {
		const intervalId = setInterval(() => {
			// Always fetch data to update originalList
			// The currentList will only be updated if no filter is active
			fetchReceipt();
		}, 60000); // Fetch every 60 seconds

		return () => clearInterval(intervalId); // Cleanup interval on component unmount or when isFilter changes
	}, [isFilter]); // Re-run effect when isFilter changes

	const handlePageChange = (pageNumber) => {
		setCurrentPage(pageNumber);
	};

	const paginatedReceipts = currentList.slice((currentPage - 1) * receiptsPerPage, currentPage * receiptsPerPage);

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

	const handleSampleMouseLeave = () => {
		setHoveredSampleId(null);
	};

	// Handle clicking on a field to make it editable - this should be specific to a row
	const handleFieldClick = (receiptId, sampleId, field) => {
		setEditingField({ receiptId, sampleId, field });
	};

	// Update this function to properly handle input changes
	const handleInputChange = (e, receiptId, sampleId, field) => {
		const { value } = e.target;

		// Update the sample directly in the current list to reflect changes immediately
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.receipt_id === receiptId) {
					return {
						...receipt,
						samples: receipt.samples.map((sample) => {
							if (sample.id === sampleId) {
								return { ...sample, [field]: value };
							}
							return sample;
						}),
					};
				}
				return receipt;
			});
		});
	};

	// Handle sample field updates (status, sample_volume, purpose)
	const handleSampleChange = async (receiptId, sampleId, field, newValue) => {
		try {
			const payload = {
				sample: {
					receipt_id: receiptId,
					id: sampleId,
					[field]: newValue,
				},
			};

			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', payload);

			if (response.status === 200) {
				// Change to a more generic success message
				toast.success(`Cập nhật thông tin thành công!`, { autoClose: 1000 });
			} else {
				toast.error(`Lỗi khi cập nhật thông tin mẫu`);
			}
			fetchReceipt(); // Fetch new data to update the list
		} catch (error) {
			console.error('Error updating sample information:', error);
			toast.error('Có lỗi xảy ra khi cập nhật thông tin mẫu');
		} finally {
			// Clear the editing state
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	// Handle key down event for inputs
	const handleInputKeyDown = (e, receiptId, sampleId, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault(); // Prevent form submission
			handleSampleChange(receiptId, sampleId, field, value);
		}
	};

	// Handle select change - immediately update API
	const handleSelectChange = (e, receiptId, sampleId, field) => {
		const newValue = e.target.value;
		handleSampleChange(receiptId, sampleId, field, newValue);
	};

	// Handle payment status update
	const handlePaymentStatusChange = async (receiptId, newStatus) => {
		try {
			const payload = {
				receipt: {
					id: receiptId,
					pay_status: newStatus,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				toast.success(`Cập nhật trạng thái thanh toán thành công!`, { autoClose: 1000 });
				fetchReceipt(); // Fetch new data to update the list
			} else {
				toast.error(`Lỗi khi cập nhật trạng thái thanh toán`);
			}
		} catch (error) {
			console.error('Error updating payment status:', error);
			toast.error('Có lỗi xảy ra khi cập nhật trạng thái thanh toán');
		} finally {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	// Add this function to handle input changes for order code, quote code, and sales recorder
	const handleReceiptInputChange = (e, receiptId, field) => {
		const { value } = e.target;

		// Update the receipt directly in the current list to reflect changes immediately
		setCurrentList((prevList) => {
			return prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					return { ...receipt, [field]: value };
				}
				return receipt;
			});
		});
	};

	// Add this function to handle receipt field updates
	const handleReceiptChange = async (receiptId, field, newValue) => {
		try {
			const payload = {
				receipt: {
					id: receiptId,
					[field]: newValue,
					modified_by_uid: currentUser?.identity_uid,
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				toast.success(`Cập nhật thông tin thành công!`, { autoClose: 1000 });
				fetchReceipt(); // Fetch new data to update the list
			} else {
				toast.error(`Lỗi khi cập nhật thông tin`);
			}
		} catch (error) {
			console.error('Error updating receipt information:', error);
			toast.error('Có lỗi xảy ra khi cập nhật thông tin');
		} finally {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	// Add this function to handle key down event for receipt inputs
	const handleReceiptInputKeyDown = (e, receiptId, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleReceiptChange(receiptId, field, value);
		} else if (e.key === 'Escape') {
			setEditingField({ receiptId: null, sampleId: null, field: null });
		}
	};

	// Add this function to handle payment confirmation
	const handlePaymentConfirmation = (receiptId) => {
		const receipt = currentList.find((r) => r.id === receiptId);
		if (!receipt) return;

		const newStatus = receipt.pay_status === 1 ? 0 : 1;
		const confirmMessage = newStatus === 1 ? 'Xác nhận đã thanh toán?' : 'Xác nhận chuyển sang chưa thanh toán?';

		if (window.confirm(confirmMessage)) {
			handlePaymentStatusChange(receiptId, newStatus);
		}
	};

	// Calculate what elements to hide based on the current URL
	const hideElements = () => {
		// If we're on the dashboard page and searching for receipts, hide the search in FilterBar
		if (location.pathname.includes('dashboard') || location.pathname === '/') {
			return ['search'];
		}
		return [];
	};

	return (
		<div className="flex flex-col justify-between items-center w-full">
			<ToastContainer />
			<Breadcrumb paths={[{ name: 'Danh sách', link: '/' }]} />{' '}
			<div className="justify-between items-center w-full mb-1 hidden md:flex">
				<div>
					{searchTerm && (
						<div className="text-sm text-gray-600">
							Kết quả tìm kiếm cho: <span className="font-medium">{searchTerm}</span>
							<button
								onClick={() => {
									setSearchTerm('');
									setIsFilter(false);
									navigate('/dashboard');
									fetchReceipt();
								}}
								className="ml-2 text-blue-600 px-2 py-1 bg-background border-2 border-gray-400"
							>
								Hủy
							</button>
						</div>
					)}
				</div>
				<div className="flex space-x-2 items-center">
					<CreateReceiptFromCRM />
					<CreateReceipt />
				</div>
			</div>
			<div className="bg-white rounded-lg w-full pb-4 pt-2">
				<div className="w-full px-4 flex justify-end">
					{/* Add payment toggle button */}
					<button
						className={`p-2 rounded-lg border-gray-400 mr-2 flex items-center justify-center focus:outline-none ${
							showPaymentColumn ? 'text-white bg-blue-600' : 'text-black'
						}`}
						onClick={togglePaymentColumn}
						title={showPaymentColumn ? 'Ẩn cột ghi nhận doanh số' : 'Hiển thị cột ghi nhận doanh số'}
					>
						<FaMoneyBillWave />
					</button>

					<div className="w-fit">
						<FilterBar
							source={originalList} // Pass the original list to FilterBar
							setCurrentList={setCurrentList}
							typeSearch="receipt"
							setIsFilter={setIsFilter} // Pass the setIsFilter function
							hide={hideElements()} // Conditionally hide search
						/>
					</div>
				</div>

				<div className="overflow-x-auto px-1 py-2">
					<table className="w-full text-black ">
						<thead>
							<tr className="border-b-2">
								<th className="p-1 border-b text-start  min-w-40">Mã tiếp nhận mẫu</th>
								<th className="p-1 border-b text-start w-36 min-w-36">Mã mẫu thử</th>
								<th className="p-1 border-b text-start w-[25%] min-w-72">Thông tin mẫu thử</th>
								<th className="p-1 border-b text-start w-[10%] min-w-28">Số lượng</th>
								<th className="p-1 border-b text-start w-[6%] min-w-24">Mục đích</th>
								<th className="p-1 border-b text-start w-[6%] min-w-24">Trạng thái</th>
								<th className="p-1 border-b text-start w-[6%] min-w-24">SL chỉ tiêu</th>
								{showPaymentColumn && (
									<th className="p-1 border-b text-start w-[12%] min-w-[150px]">Ghi nhận doanh số</th>
								)}
								<th
									className="p-1 border-b text-start max-w-28 min-w-28 cursor-pointer hover:text-[#103667]"
									onClick={toggleDeadlineFormat}
								>
									Hạn trả
								</th>
							</tr>
						</thead>
						<tbody>
							{paginatedReceipts.map((receipt) => {
								const samplesToShow = receipt.samples;

								return (
									<React.Fragment key={receipt.receipt_uid}>
										{samplesToShow.length === 0 ? (
											<tr
												key={receipt.receipt_uid}
												className={`border-t border-b ${hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''}`}
												onMouseEnter={() => handleReceiptMouseEnter(receipt.receipt_uid)}
												onMouseLeave={handleReceiptMouseLeave}
											>
												<td className="p-1  text-start align-top ">
													<NavLink
														className="text-primary font-semibold hover:text-[#103667]"
														to={`/dashboard/receipt?receipt_uid=${receipt.receipt_uid}`}
													>
														{receipt.receipt_uid}
													</NavLink>
													<div className="flex flex-col">
														<p className="text-sm">{receipt.client.client_name}</p>
														<p className="text-xs text-gray-500">
															{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
															{getUserName(receipt.created_by_uid)}
														</p>
													</div>
												</td>
												<td colSpan="6" className="p-1 text-center text-gray-500">
													Chưa có thông tin mẫu thử . . .
												</td>
												{showPaymentColumn && (
													<td
														className="p-1 text-start cursor-pointer hover:bg-gray-100"
														onClick={() => handleFieldClick(receipt.id, null, 'pay_status')}
													>
														{editingField.receiptId === receipt.id && editingField.field === 'pay_status' ? (
															<select
																value={receipt.pay_status || 0}
																onChange={(e) => handlePaymentStatusChange(receipt.id, e.target.value)}
																onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																className="p-1 border rounded-md w-full text-sm bg-white"
																autoFocus
															>
																<option value="1">Đã thanh toán</option>
																<option value="0">Chưa thanh toán</option>
															</select>
														) : (
															<div className="w-full h-full p-1 rounded">
																{receipt.pay_status === 1 ? (
																	<span className="font-medium text-green-600">100%</span>
																) : (
																	<span className="font-medium text-red-500">0%</span>
																)}
															</div>
														)}
													</td>
												)}
												<td className="p-1 text-start">
													{receipt?.deadline ? (
														isDeadlineToday(receipt.deadline) ? (
															<span className="font-bold text-red-500">{formatDate(receipt.deadline)}</span>
														) : (
															formatDate(receipt.deadline)
														)
													) : (
														<span className="text-start block">--</span>
													)}
												</td>
											</tr>
										) : (
											samplesToShow.map((sample, sampleIndex) => {
												// Add null check for sample.analysis
												const totalTests = sample?.analysis?.length || 0;
												const completedTests =
													sample?.analysis?.filter((order) => order?.result_value !== '')?.length || 0;
												const pendingTests = totalTests - completedTests;

												return (
													<tr
														key={`${receipt?.receipt_uid || 'unknown'}-${sample?.sample_uid || 'unknown'}`}
														className={` ${sampleIndex === 0 ? 'border-t' : ''} ${
															sampleIndex === samplesToShow.length - 1 ? 'border-b' : ''
														} ${
															hoveredSampleId === sample?.sample_uid
																? 'bg-gray-100'
																: hoveredReceiptId === receipt?.receipt_uid
																? 'bg-gray-50'
																: ''
														}`}
														onMouseEnter={() => handleSampleMouseEnter(receipt?.receipt_uid, sample?.sample_uid)}
														onMouseLeave={() => {
															setHoveredSampleId(null);
															setHoveredReceiptId(null);
														}}
													>
														{sampleIndex === 0 && (
															<td
																className={`p-1   text-start align-top ${
																	hoveredReceiptId === receipt?.receipt_uid ? 'bg-gray-50' : ''
																}`}
																rowSpan={samplesToShow.length}
															>
																<NavLink
																	className="font-semibold text-primary hover:text-[#103667]"
																	to={`/dashboard/receipt?receipt_uid=${receipt.receipt_uid}`}
																>
																	{receipt.receipt_uid}
																</NavLink>
																<div className="flex flex-col">
																	<p className="text-sm">{receipt.client.client_name}</p>
																	<p className="text-xs text-gray-500">
																		{receipt.receipt_date && formatDate(receipt.receipt_date)}{' '}
																		{getUserName(receipt.created_by_uid)}
																	</p>
																</div>
															</td>
														)}
														<td
															className="p-1 text-start align-top"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															<NavLink
																className="text-primary font-normal hover:text-[#103667]"
																to={`/dashboard/sample?receipt_uid=${receipt.receipt_uid}&sample_uid=${sample.sample_uid}`}
															>
																{sample.sample_uid}
															</NavLink>
														</td>
														<td
															className="p-1 text-start align-top line-clamp-2"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															{displayValue(sample.sample_name)}
														</td>
														<td
															className="p-1 text-start cursor-text align-top"
															onClick={() => handleFieldClick(receipt.receipt_id, sample.id, 'sample_volume')}
														>
															{editingField.receiptId === receipt.receipt_id &&
															editingField.sampleId === sample.id &&
															editingField.field === 'sample_volume' ? (
																<input
																	type="text"
																	value={sample.sample_volume || ''}
																	onChange={(e) => handleInputChange(e, receipt.receipt_id, sample.id, 'sample_volume')}
																	onKeyDown={(e) =>
																		handleInputKeyDown(
																			e,
																			receipt.receipt_id,
																			sample.id,
																			'sample_volume',
																			e.target.value,
																		)
																	}
																	onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																	className="p-1 border rounded-md w-full text-sm bg-white"
																	autoFocus
																/>
															) : (
																<div className="w-full h-full rounded">{displayValue(sample.sample_volume)}</div>
															)}
														</td>
														<td
															className="p-1 text-start cursor-pointer align-top"
															onClick={() => handleFieldClick(receipt.receipt_id, sample.id, 'purpose')}
														>
															{editingField.receiptId === receipt.receipt_id &&
															editingField.sampleId === sample.id &&
															editingField.field === 'purpose' ? (
																<select
																	value={sample.purpose || ''}
																	onChange={(e) => handleSelectChange(e, receipt.receipt_id, sample.id, 'purpose')}
																	onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																	className="p-1 border rounded-md w-full text-sm bg-white"
																	autoFocus
																>
																	<option value="">--</option>
																	{purposes.map((purpose, index) => (
																		<option key={index} value={purpose}>
																			{purpose}
																		</option>
																	))}
																</select>
															) : (
																<div className="w-full h-full rounded">{displayValue(sample.purpose)}</div>
															)}
														</td>
														<td
															className="p-1 text-start cursor-pointer align-top"
															onClick={() => handleFieldClick(receipt.receipt_id, sample.id, 'status')}
														>
															{editingField.receiptId === receipt.receipt_id &&
															editingField.sampleId === sample.id &&
															editingField.field === 'status' ? (
																<select
																	value={sample.status}
																	onChange={(e) => handleSelectChange(e, receipt.receipt_id, sample.id, 'status')}
																	onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																	className="p-1 border rounded-md w-full text-sm bg-white"
																	autoFocus
																>
																	{status.map((statusName, index) => (
																		<option key={index} value={index}>
																			{statusName}
																		</option>
																	))}
																</select>
															) : (
																<div className="w-full h-full rounded">
																	{status[sample.status] ? (
																		status[sample.status]
																	) : (
																		<span className="text-start block">--</span>
																	)}
																</div>
															)}
														</td>
														<td
															className="p-1 text-start align-top"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															{completedTests} / {pendingTests} / {totalTests}
														</td>
														{/* Only render payment column if showPaymentColumn is true */}
														{sampleIndex === 0 && showPaymentColumn && (
															<td
																className={`p-1 text-start align-top ${
																	hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																}`}
																rowSpan={samplesToShow.length}
															>
																{/* Order Code */}
																{editingField.receiptId === receipt.id &&
																editingField.sampleId === null &&
																editingField.field === 'order_code' ? (
																	<input
																		type="text"
																		value={receipt.order_code || ''}
																		onChange={(e) => handleReceiptInputChange(e, receipt.id, 'order_code')}
																		onKeyDown={(e) =>
																			handleReceiptInputKeyDown(e, receipt.id, 'order_code', e.target.value)
																		}
																		onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																		className="p-1 border rounded-md w-full text-sm bg-white mb-1"
																		autoFocus
																	/>
																) : (
																	<p
																		className="cursor-pointer hover:bg-gray-100 p-1 rounded mb-1"
																		onClick={() => handleFieldClick(receipt.id, null, 'order_code')}
																	>
																		{receipt.order_code || '--'}
																	</p>
																)}

																{/* Quote Code */}
																{editingField.receiptId === receipt.id &&
																editingField.sampleId === null &&
																editingField.field === 'quote_code' ? (
																	<input
																		type="text"
																		value={receipt.quote_code || ''}
																		onChange={(e) => handleReceiptInputChange(e, receipt.id, 'quote_code')}
																		onKeyDown={(e) =>
																			handleReceiptInputKeyDown(e, receipt.id, 'quote_code', e.target.value)
																		}
																		onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																		className="p-1 border rounded-md w-full text-sm bg-white mb-1"
																		autoFocus
																	/>
																) : (
																	<p
																		className="cursor-pointer hover:bg-gray-100 p-1 rounded mb-1"
																		onClick={() => handleFieldClick(receipt.id, null, 'quote_code')}
																	>
																		{receipt.quote_code || '--'}
																	</p>
																)}

																{/* Sale Recorder */}
																{editingField.receiptId === receipt.id &&
																editingField.sampleId === null &&
																editingField.field === 'sale_recorder' ? (
																	<input
																		type="text"
																		value={receipt.sale_recorder || ''}
																		onChange={(e) => handleReceiptInputChange(e, receipt.id, 'sale_recorder')}
																		onKeyDown={(e) =>
																			handleReceiptInputKeyDown(e, receipt.id, 'sale_recorder', e.target.value)
																		}
																		onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
																		className="p-1 border rounded-md w-full text-sm bg-white mb-1"
																		autoFocus
																	/>
																) : (
																	<p
																		className="cursor-pointer hover:bg-gray-100 p-1 rounded mb-1"
																		onClick={() => handleFieldClick(receipt.id, null, 'sale_recorder')}
																	>
																		{receipt.sale_recorder || '--'}
																	</p>
																)}

																{/* Total Amount */}
																<p
																	className={`cursor-pointer hover:bg-gray-100 p-1 rounded font-medium ${
																		receipt.pay_status === 1 ? 'text-green-600' : 'text-gray-500'
																	}`}
																	onClick={() => handlePaymentConfirmation(receipt.id)}
																>
																	{receipt.total_amount ? `${receipt.total_amount.toLocaleString()} ₫` : '--'}
																</p>
															</td>
														)}
														{sampleIndex === 0 && (
															<td
																className={`p-1 text-start cursor-pointer align-top ${
																	hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																}`}
																rowSpan={samplesToShow.length}
																onClick={() => handleFieldClick(receipt.id, null, 'deadline')}
															>
																{editingField.receiptId === receipt.id &&
																editingField.sampleId === null &&
																editingField.field === 'deadline' ? (
																	<DatePicker
																		selected={receipt.deadline ? new Date(receipt.deadline) : null}
																		onChange={(date) => handleDeadlineChange(receipt.id, date)}
																		onBlur={() => handleDatePickerBlur(receipt.id, receipt.deadline)}
																		onFocus={() => handleDatePickerFocus(receipt.id, receipt.deadline)}
																		onChangeRaw={(e) => handleDateInputChange(receipt.id, e)}
																		onKeyDown={(e) => handleDeadlineKeyDown(e, receipt.id)}
																		dateFormat="dd/MM/yyyy"
																		className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
																		calendarClassName="text-black"
																		placeholderText="Chọn hạn trả"
																		autoFocus
																	/>
																) : (
																	<div className="w-full h-full p-1 rounded">
																		{showRelativeTime
																			? formatDeadlineAsRelative(receipt.deadline)
																			: isDeadlineToday(receipt.deadline)
																			? formatDeadlineWithStyle(receipt.deadline)
																			: formatDate(receipt.deadline) || <span className="text-start block">--</span>}
																	</div>
																)}
															</td>
														)}
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

				<div
					className="flex justify-center mt-4 overflow-x-auto max-w-full"
					style={{ scrollbarWidth: 'thin', scrollbarColor: '#cccccc transparent' }}
				>
					<div className="flex">
						{Array.from({ length: Math.ceil(currentList.length / receiptsPerPage) }, (_, index) => (
							<button
								key={index + 1}
								className={`px-4 py-2 mx-1 ${currentPage === index + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'} `}
								onClick={() => handlePageChange(index + 1)}
							>
								{index + 1}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
