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
import { FaEdit, FaCheck } from 'react-icons/fa'; // Add this import for icons

const Dashboard = () => {
	const { setCurrentTitlePage, status, formatDate } = useContext(GlobalContext);
	const [currentList, setCurrentList] = useState([]);
	const [originalList, setOriginalList] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [isFilter, setIsFilter] = useState(false); // State to track if filtering is active
	const [isEditMode, setIsEditMode] = useState(false); // State to track edit mode
	const receiptsPerPage = 15;
	const samplesPerReceipt = 3;
	const [hoveredReceiptId, setHoveredReceiptId] = useState(null);
	const [hoveredSampleId, setHoveredSampleId] = useState(null);
	let isFetch = false;

	// Helper function to check if value is empty or invalid
	const displayValue = (value) => {
		if (value === null || value === undefined || value === '') {
			return <span className="text-start block">----</span>;
		}
		return value;
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

	// Toggle edit mode
	const toggleEditMode = () => {
		setIsEditMode(!isEditMode);
	};

	// Handle status change
	const handleStatusChange = async (receiptId, sampleId, newStatus) => {
		try {
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', {
				sample: {
					receipt_id: receiptId,
					id: sampleId,
					status: newStatus,
				},
			});

			if (response.status === 200) {
				toast.success(`Đã cập nhật trạng thái mẫu ${response.data.sample_uid} thành công!`);
				fetchReceipt(); // Fetch new data to update the list
				// // Update status in the current list
				// const updatedList = currentList.map((receipt) => {
				// 	if (receipt.id === receiptId) {
				// 		return {
				// 			...receipt,
				// 			samples: receipt.samples.map((sample) => {
				// 				if (sample.id === sampleId) {
				// 					return { ...sample, status: response.data.status };
				// 				}
				// 				return sample;
				// 			}),
				// 		};
				// 	}
				// 	return receipt;
				// });
				// console.log('Updated list:', updatedList);

				// setCurrentList(updatedList);

				// // Also update in the original list
				// const updatedOriginalList = originalList.map((receipt) => {
				// 	if (receipt.id === receiptId) {
				// 		return {
				// 			...receipt,
				// 			samples: receipt.samples.map((sample) => {
				// 				if (sample.id === sampleId) {
				// 					return { ...sample, status: response.data.status };
				// 				}
				// 				return sample;
				// 			}),
				// 		};
				// 	}
				// 	return receipt;
				// });

				// setOriginalList(updatedOriginalList);
			} else {
				toast.error(`Lỗi khi cập nhật trạng thái mẫu `);
			}
		} catch (error) {
			console.error('Error updating sample status:', error);
			toast.error('Có lỗi xảy ra khi cập nhật trạng thái mẫu');
		}
	};

	return (
		<div className="flex flex-col justify-between items-center w-full">
			<ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
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
					<button
						className={`w-[34px] h-[34px] p-2 rounded-lg transition-colors duration-200 border border-gray-400 mr-2 focus:outline-none ${
							isEditMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-black '
						}`}
						onClick={toggleEditMode}
					>
						{isEditMode ? <FaCheck /> : <FaEdit />}
					</button>
					<div className="w-fit">
						<FilterBar
							source={originalList} // Pass the original list to FilterBar
							setCurrentList={setCurrentList}
							typeSearch="receipt"
							setIsFilter={setIsFilter} // Pass the setIsFilter function
						/>
					</div>
				</div>

				<div className="overflow-x-auto px-1">
					<table className="w-full text-black ">
						<thead>
							<tr className="border-b-2">
								<th className="p-1 border-b text-start w-[18%] min-w-40">Mã tiếp nhận mẫu</th>
								<th className="p-1 border-b text-start w-40 min-w-40">Mã mẫu thử</th>
								<th className="p-1 border-b text-start w-[25%] min-w-72">Thông tin mẫu thử</th>
								<th className="p-1 border-b text-start w-[10%] min-w-36">Số lượng</th>
								<th className="p-1 border-b text-start w-[10%] min-w-36">Mục đích</th>
								<th className="p-1 border-b text-start w-[10%] min-w-36">Trạng thái</th>
								<th className="p-1 border-b text-start w-1/12 min-w-32">SL chỉ tiêu</th>
								<th className="p-1 border-b text-start w-24 min-w-24">Hạn trả</th>
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
												<td className="p-1 text-start">
													{formatDate(receipt.deadline) || <span className="text-start block">----</span>}
												</td>
											</tr>
										) : (
											samplesToShow.map((sample, sampleIndex) => {
												const totalTests = sample.analysis.length;
												const completedTests = sample.analysis.filter((order) => order.result_value !== '').length;
												const pendingTests = totalTests - completedTests;

												return (
													<tr
														key={`${receipt.receipt_uid}-${sample.sample_uid}`}
														className={` ${sampleIndex === 0 ? 'border-t' : ''} ${
															sampleIndex === samplesToShow.length - 1 ? 'border-b' : ''
														} ${
															hoveredSampleId === sample.sample_uid
																? 'bg-gray-100'
																: hoveredReceiptId === receipt.receipt_uid
																? 'bg-gray-50'
																: ''
														}`}
														onMouseEnter={() => setHoveredReceiptId(receipt.receipt_uid)}
														onMouseLeave={() => setHoveredReceiptId(null)}
													>
														{sampleIndex === 0 && (
															<td
																className={`p-1   text-start align-top ${
																	hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
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
																	<p className="line-clamp-2 text-sm font-medium ">{receipt.client.client_name}</p>
																</span>
															</td>
														)}
														<td
															className="p-1 text-[#027b7f] font-medium text-start s hover:text-[#00676b]"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															<NavLink
																to={`/dashboard/sample?receipt_uid=${receipt.receipt_uid}&sample_uid=${sample.sample_uid}`}
															>
																{sample.sample_uid}
															</NavLink>
														</td>
														<td
															className="p-1 text-start"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															{displayValue(sample.sample_name)}
														</td>
														<td
															className="p-1 text-start"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															{displayValue(sample.sample_volume)}
														</td>
														<td
															className="p-1 text-start"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															{displayValue(sample.purpose)}
														</td>
														<td
															className="p-1 text-start"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															{isEditMode ? (
																<select
																	value={sample.status}
																	onChange={(e) => handleStatusChange(receipt.receipt_id, sample.id, e.target.value)}
																	className="p-1 border rounded-md w-full text-sm bg-white"
																>
																	{status.map((statusName, index) => (
																		<option key={index} value={index}>
																			{statusName}
																		</option>
																	))}
																</select>
															) : status[sample.status] ? (
																status[sample.status]
															) : (
																<span className="text-start block">----</span>
															)}
														</td>
														<td
															className="p-1 text-start"
															onMouseEnter={() => handleSampleMouseEnter(receipt.receipt_uid, sample.sample_uid)}
															onMouseLeave={handleSampleMouseLeave}
														>
															{completedTests} / {pendingTests} / {totalTests}
														</td>
														{sampleIndex === 0 && (
															<td
																className={`p-1 text-start ${
																	hoveredReceiptId === receipt.receipt_uid ? 'bg-gray-50' : ''
																}`}
																rowSpan={samplesToShow.length}
															>
																{formatDate(receipt.deadline) || <span className="text-start block">----</span>}
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
													className="text-center text-teritary cursor-pointer absolute w-full bottom-0 text-sm font-semibold pb-0 border-b hover:border-b-2 hover:border-teritary hover:text-primary z-10"
													onClick={() => handleExpandClick(receipt.receipt_uid)}
												>
													<sub>Xem thêm ({receipt.samples.length - samplesPerReceipt})</sub>
												</td>
											</tr>
										)}
										{receipt.samples.length > samplesPerReceipt && isExpanded && (
											<tr key={`${receipt.receipt_uid}-collapse`} className="relative w-full">
												<td
													colSpan="5"
													className="text-center text-teritary cursor-pointer absolute w-full bottom-0 text-sm font-semibold pb-0 border-b hover:border-b-2 hover:border-teritary hover:text-primary z-10"
													onClick={() => handleExpandClick(receipt.receipt_uid)}
												>
													<sub>Thu gọn ({receipt.samples.length - samplesPerReceipt})</sub>
												</td>
											</tr>
										)}
									</React.Fragment>
								);
							})}
						</tbody>
					</table>
				</div>

				<div className="flex justify-center mt-4">
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
	);
};

export default Dashboard;
