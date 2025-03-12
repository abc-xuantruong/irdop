import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import FilterBar from './FilterBar';
import Breadcrumb from './Breadcrumb';
import { NavLink } from 'react-router-dom';
import CreateReceipt from './CreateReceipt';
import CreateReceiptFromCRM from './CreateReceiptFromCRM';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaTrashAlt } from 'react-icons/fa'; // Removed unused icons
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Dashboard = () => {
	const { setCurrentTitlePage, status, purposes, formatDate } = useContext(GlobalContext);
	const [currentList, setCurrentList] = useState([]);
	const [originalList, setOriginalList] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [isFilter, setIsFilter] = useState(false); // State to track if filtering is active

	// Remove isEditMode state
	// Add state to track which field is being edited
	const [editingField, setEditingField] = useState({ receiptId: null, sampleId: null, field: null });

	const [showRelativeTime, setShowRelativeTime] = useState(false); // Toggle between date format and relative time
	const receiptsPerPage = 15;
	const samplesPerReceipt = 3;
	const [hoveredReceiptId, setHoveredReceiptId] = useState(null);
	const [hoveredSampleId, setHoveredSampleId] = useState(null);
	let isFetch = false;

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

	useEffect(() => {
		setCurrentTitlePage('Danh sách tiếp nhận mẫu');
	}, [setCurrentTitlePage]);

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

	const [expandedReceipts, setExpandedReceipts] = useState({});

	const handleExpandClick = (receiptId) => {
		setExpandedReceipts((prev) => ({
			...prev,
			[receiptId]: !prev[receiptId],
		}));
	};

	const handleSampleMouseEnter = (receiptId, sampleId) => {
		setHoveredReceiptId(receiptId);
		setHoveredSampleId(sampleId);
	};

	const handleSampleMouseLeave = () => {
		setHoveredReceiptId(null);
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

	// Handle receipt deadline update
	const handleDeadlineChange = async (receiptId, newDeadline) => {
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
				},
			};

			const response = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', payload);

			if (response.status === 200) {
				// Change to a more generic success message
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

	return (
		<div className="flex flex-col justify-between items-center w-full">
			<ToastContainer />
			<Breadcrumb paths={[{ name: 'Danh sách', link: '/' }]} />{' '}
			<div className="flex justify-between items-center w-full px-4 mb-1">
				<div></div>
				<div className="flex space-x-2 items-center">
					<CreateReceiptFromCRM />
					<CreateReceipt />
				</div>
			</div>
			<div className="bg-white rounded-lg w-full pb-4 pt-2">
				<div className=" w-full px-4 flex justify-end">
					<div className="w-fit">
						<FilterBar
							source={originalList} // Pass the original list to FilterBar
							setCurrentList={setCurrentList}
							typeSearch="receipt"
							setIsFilter={setIsFilter} // Pass the setIsFilter function
						/>
					</div>
				</div>

				<div className="overflow-x-auto px-1 py-2">
					<table className="w-full text-black ">
						<thead>
							<tr className="border-b-2">
								<th className="p-1 border-b text-start w-[18%] min-w-40">Mã tiếp nhận mẫu</th>
								<th className="p-1 border-b text-start w-36 min-w-36">Mã mẫu thử</th>
								<th className="p-1 border-b text-start w-[25%] min-w-72">Thông tin mẫu thử</th>
								<th className="p-1 border-b text-start w-[10%] min-w-36">Số lượng</th>
								<th className="p-1 border-b text-start w-[8%] min-w-28">Mục đích</th>
								<th className="p-1 border-b text-start w-[8%] min-w-28">Trạng thái</th>
								<th className="p-1 border-b text-start w-[8%] min-w-28">SL chỉ tiêu</th>
								<th className="p-1 border-b text-start w-[6%] min-w-14">TT</th>
								<th
									className="p-1 border-b text-start w-28 min-w-28 cursor-pointer hover:text-[#103667]"
									onClick={toggleDeadlineFormat}
								>
									Hạn trả
								</th>
							</tr>
						</thead>
						<tbody>
							{paginatedReceipts.map((receipt) => {
								const isExpanded = expandedReceipts[receipt.receipt_uid];
								const samplesToShow = isExpanded ? receipt.samples : receipt.samples.slice(0, samplesPerReceipt);

								return (
									<React.Fragment key={receipt.receipt_uid}>
										{samplesToShow.length === 0 ? (
											<tr
												key={receipt.receipt_uid}
												className={`border-t border-b ${hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''}`}
												onMouseEnter={() => setHoveredReceiptId(receipt.receipt_uid)}
												onMouseLeave={() => setHoveredReceiptId(null)}
											>
												<td className="p-1  text-start align-top ">
													<NavLink
														className="text-primary font-semibold hover:text-[#103667]"
														to={`/dashboard/receipt?receipt_uid=${receipt.receipt_uid}`}
													>
														{receipt.receipt_uid}
													</NavLink>
													<span>
														<p className="line-clamp-2 text-sm font-medium ">{receipt.client.client_name}</p>
													</span>
												</td>
												<td colSpan="6" className="p-1 text-center text-gray-500">
													Chưa có thông tin mẫu thử . . .
												</td>
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
																<span className="font-medium text-green-600">Đã TT</span>
															) : (
																<span className="font-medium text-red-500">Chưa TT</span>
															)}
														</div>
													)}
												</td>
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
														nMouseEnter={() => setHoveredReceiptId(receipt?.receipt_uid)}
														onMouseLeave={() => setHoveredReceiptId(null)}
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
																<span>
																	<p className={`text-sm font-medium`}>{receipt.client.client_name}</p>
																</span>
															</td>
														)}
														<td
															className="p-1 text-start align-top"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															<NavLink
																className="text-primary font-semibold hover:text-[#103667]"
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
														<td className="p-1 text-start cursor-pointer hover:bg-gray-100 align-top">
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
																<div
																	onClick={() => handleFieldClick(receipt.receipt_id, sample.id, 'sample_volume')}
																	className="w-full h-full rounded"
																>
																	{displayValue(sample.sample_volume)}
																</div>
															)}
														</td>
														<td className="p-1 text-start cursor-pointer hover:bg-gray-100 align-top">
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
																<div
																	onClick={() => handleFieldClick(receipt.receipt_id, sample.id, 'purpose')}
																	className="w-full h-full rounded"
																>
																	{displayValue(sample.purpose)}
																</div>
															)}
														</td>
														<td className="p-1 text-start cursor-pointer hover:bg-gray-100 align-top">
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
																<div
																	onClick={() => handleFieldClick(receipt.receipt_id, sample.id, 'status')}
																	className="w-full h-full rounded"
																>
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
														{sampleIndex === 0 && (
															<td
																className={`p-1 text-start cursor-pointer hover:bg-gray-100 align-top ${
																	hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-100' : ''
																}`}
																rowSpan={samplesToShow.length}
																onClick={() => handleFieldClick(receipt.id, null, 'pay_status')}
															>
																{editingField.receiptId === receipt.id &&
																editingField.sampleId === null &&
																editingField.field === 'pay_status' ? (
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
																	<div className="w-full h-full p-1 rounded align-top">
																		{receipt.pay_status === 1 ? (
																			<p className="font-medium text-green-600">Đã TT</p>
																		) : (
																			<p className="font-medium text-red-500">Chưa TT</p>
																		)}
																	</div>
																)}
															</td>
														)}
														{sampleIndex === 0 && (
															<td
																className={`p-1 text-start cursor-pointer hover:bg-gray-100 align-top ${
																	hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-100' : ''
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
																		dateFormat="dd/MM/yyyy"
																		className="p-1 border rounded-md w-full text-sm bg-white datepicker-full-width"
																		calendarClassName="text-black"
																		placeholderText="Chọn hạn trả"
																		autoFocus
																		onBlur={() => setEditingField({ receiptId: null, sampleId: null, field: null })}
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
										{receipt.samples.length > samplesPerReceipt && !isExpanded && (
											<tr key={`${receipt.receipt_uid}-see-more`} className="relative w-full">
												<td
													colSpan="5"
													className="text-center text-sky-400 cursor-pointer absolute w-full bottom-0 text-[11px]  font-semibold pb-0 border-b hover:border-b-2 hover:border-teritary hover:text-primary z-10 h-[13px]"
													onClick={() => handleExpandClick(receipt.receipt_uid)}
												>
													<p>Xem thêm {'<' + (receipt.samples.length - samplesPerReceipt) + '>'}</p>
												</td>
											</tr>
										)}
										{receipt.samples.length > samplesPerReceipt && isExpanded && (
											<tr key={`${receipt.receipt_uid}-collapse`} className="relative w-full">
												<td
													colSpan="5"
													className="text-center text-sky-400 cursor-pointer absolute w-full bottom-0  text-[11px] font-semibold pb-0 border-b hover:border-b-2 hover:border-teritary hover:text-primary z-10 h-[13px]"
													onClick={() => handleExpandClick(receipt.receipt_uid)}
												>
													<p>Thu gọn {'<' + (receipt.samples.length - samplesPerReceipt) + '>'}</p>
												</td>
											</tr>
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
