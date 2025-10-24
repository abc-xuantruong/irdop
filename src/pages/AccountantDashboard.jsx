import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GlobalContext } from '../contexts/GlobalContext';
import Breadcrumb from '../components/Breadcrumb';
import { FaTimes, FaEdit, FaTrash, FaCopy } from 'react-icons/fa';
import Swal from 'sweetalert2';

const AccountantDashboard = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { setCurrentTitlePage, status, purposes, formatDate, getIdenByUid, identityCache, currentUser, API_URL } =
		useContext(GlobalContext);

	const [currentList, setCurrentList] = useState([]);
	const [originalList, setOriginalList] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [isFilter, setIsFilter] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [hoveredReceiptId, setHoveredReceiptId] = useState(null);
	const [isFetch, setIsFetch] = useState(false);

	// Payment-specific states
	const [paymentStatusFilter, setPaymentStatusFilter] = useState(null);
	const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
	const paymentDropdownRef = useRef(null);
	const [salesRecorderFilter, setSalesRecorderFilter] = useState(null);
	const [showSalesRecorderDropdown, setShowSalesRecorderDropdown] = useState(false);
	const salesRecorderDropdownRef = useRef(null);
	const [recordCodeSort, setRecordCodeSort] = useState(0);
	const [showRecordCodeDropdown, setShowRecordCodeDropdown] = useState(false);
	const recordCodeDropdownRef = useRef(null);

	// Transaction editing states
	const [editingTransaction, setEditingTransaction] = useState({
		receiptId: null,
		transactionIndex: null,
		field: null,
	});
	const [originalValues, setOriginalValues] = useState({});

	const receiptsPerPage = 50;

	// Set page title
	useEffect(() => {
		setCurrentTitlePage('ACCOUNTANT DASHBOARD');
	}, [setCurrentTitlePage]);

	// Fetch receipts data
	const fetchReceipt = async () => {
		setIsFetch(true);
		try {
			const response = await fetch(`${API_URL}/api/receipt`);
			if (response.ok) {
				const data = await response.json();
				setOriginalList(data);
				setCurrentList(data);
			} else {
				console.error('Failed to fetch receipts');
			}
		} catch (error) {
			console.error('Error fetching receipts:', error);
		} finally {
			setIsFetch(false);
		}
	};

	useEffect(() => {
		fetchReceipt();
	}, []);

	// Handle pagination
	const handlePageChange = (pageNumber) => {
		setCurrentPage(pageNumber);
	};

	const paginatedReceipts = currentList.slice((currentPage - 1) * receiptsPerPage, currentPage * receiptsPerPage);

	// Payment status filter handlers
	const handlePaymentFilter = (status) => {
		setPaymentStatusFilter(status);
		setShowPaymentDropdown(false);
		// Apply filter logic here if needed
	};

	const togglePaymentDropdown = () => {
		setShowPaymentDropdown(!showPaymentDropdown);
	};

	// Sales recorder filter handlers
	const handleSalesRecorderFilter = (recorder) => {
		setSalesRecorderFilter(recorder);
		setShowSalesRecorderDropdown(false);
		// Apply filter logic here if needed
	};

	const getUniqueSalesRecorders = () => {
		const recorders = currentList
			.map((receipt) => receipt.sale_recorder)
			.filter((recorder) => recorder && recorder.trim() !== '')
			.filter((value, index, self) => self.indexOf(value) === index);
		return recorders.sort();
	};

	// Record code filter handlers
	const handleRecordCodeFilter = (option) => {
		if (option === 'descending') {
			setRecordCodeSort(1);
		} else if (option === 'empty') {
			setRecordCodeSort(2);
		}
		setShowRecordCodeDropdown(false);
		// Apply sorting logic here if needed
	};

	// Transaction handlers
	const handleTransactionInputChange = (e, receiptId, transactionIndex, field) => {
		const newValue = e.target.value;
		setCurrentList((prevList) =>
			prevList.map((receipt) => {
				if (receipt.id === receiptId) {
					const updatedTransactions = [...receipt.transactions];
					updatedTransactions[transactionIndex] = {
						...updatedTransactions[transactionIndex],
						[field]: newValue,
					};
					return { ...receipt, transactions: updatedTransactions };
				}
				return receipt;
			}),
		);
	};

	const handleTransactionKeyDown = (e, receiptId, transactionIndex, field, value) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleTransactionChange(receiptId, transactionIndex, field, value);
		} else if (e.key === 'Escape') {
			// Reset to original value
			const originalValue = originalValues[`${receiptId}-${transactionIndex}-${field}`];
			if (originalValue !== undefined) {
				setCurrentList((prevList) =>
					prevList.map((receipt) => {
						if (receipt.id === receiptId) {
							const updatedTransactions = [...receipt.transactions];
							updatedTransactions[transactionIndex] = {
								...updatedTransactions[transactionIndex],
								[field]: originalValue,
							};
							return { ...receipt, transactions: updatedTransactions };
						}
						return receipt;
					}),
				);
			}
			setEditingTransaction({ receiptId: null, transactionIndex: null, field: null });
		}
	};

	const handleTransactionChange = async (receiptId, transactionIndex, field, newValue) => {
		try {
			// API call to update transaction
			const response = await fetch(`${API_URL}/api/receipt/${receiptId}/transaction/${transactionIndex}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ [field]: newValue }),
			});

			if (response.ok) {
				// Update successful
				setEditingTransaction({ receiptId: null, transactionIndex: null, field: null });
				// Show success toast
				Swal.fire({
					toast: true,
					position: 'top-end',
					icon: 'success',
					title: 'Cập nhật thành công',
					showConfirmButton: false,
					timer: 2000,
					customClass: {
						popup: 'colored-toast',
					},
				});
			} else {
				throw new Error('Failed to update transaction');
			}
		} catch (error) {
			console.error('Error updating transaction:', error);
			// Show error toast
			Swal.fire({
				toast: true,
				position: 'top-end',
				icon: 'error',
				title: 'Cập nhật thất bại',
				showConfirmButton: false,
				timer: 2000,
				customClass: {
					popup: 'colored-toast',
				},
			});
		}
	};

	// Copy to clipboard handler
	const handleCopyToClipboard = (text) => {
		navigator.clipboard.writeText(text).then(() => {
			Swal.fire({
				toast: true,
				position: 'top-end',
				icon: 'success',
				title: 'Đã sao chép',
				showConfirmButton: false,
				timer: 1500,
				customClass: {
					popup: 'colored-toast',
				},
			});
		});
	};

	// Handle clicking outside dropdowns
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target)) {
				setShowPaymentDropdown(false);
			}
			if (salesRecorderDropdownRef.current && !salesRecorderDropdownRef.current.contains(event.target)) {
				setShowSalesRecorderDropdown(false);
			}
			if (recordCodeDropdownRef.current && !recordCodeDropdownRef.current.contains(event.target)) {
				setShowRecordCodeDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Mouse hover handlers
	const handleReceiptMouseEnter = (receiptId) => {
		setHoveredReceiptId(receiptId);
	};

	const handleReceiptMouseLeave = () => {
		setHoveredReceiptId(null);
	};

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
				.colored-toast .swal2-title {
					color: white;
					font-size: 0.85rem !important;
				}
				.colored-toast .swal2-close {
					color: white;
				}
			`}</style>

			{/* Breadcrumb */}
			<Breadcrumb
				paths={[{}]}
				source={originalList}
				setCurrentList={setCurrentList}
				setIsFilter={setIsFilter}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
			/>

			{/* Main content */}
			<div className="bg-white rounded-lg w-full pb-4 pt-2">
				<div className="overflow-x-auto px-1 py-2">
					<table className="w-full text-black">
						<thead>
							<tr className="border-b-2">
								{/* Receipt code column */}
								<th className="p-1 border-b text-start min-w-[300px]">Mã tiếp nhận mẫu</th>

								{/* HSL column with dropdown */}
								<th
									className={`p-1 border-b text-start w-[6%] min-w-20 cursor-pointer hover:text-[#103667] underline text-blue-700 relative`}
								>
									<div onClick={() => setShowRecordCodeDropdown(!showRecordCodeDropdown)}>
										HSL {recordCodeSort === 1 ? '↓' : recordCodeSort === 2 ? '∅' : ''}
									</div>
									{showRecordCodeDropdown && (
										<div
											ref={recordCodeDropdownRef}
											className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 w-32"
											style={{ top: '100%', right: 0 }}
										>
											<div
												className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
												onClick={(e) => {
													e.stopPropagation();
													handleRecordCodeFilter('descending');
												}}
											>
												Giảm dần
											</div>
											<div
												className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
												onClick={(e) => {
													e.stopPropagation();
													handleRecordCodeFilter('empty');
												}}
											>
												Chưa điền
											</div>
										</div>
									)}
								</th>

								{/* Other payment columns */}
								<th className="p-1 border-b text-start w-[10%] min-w-28">MST/CCCD</th>
								<th className="p-1 border-b text-start w-[10%] min-w-28">Mã đơn hàng</th>

								{/* Payment status column with dropdown */}
								<th className="p-1 border-b text-start w-[10%] min-w-28 cursor-pointer hover:text-[#103667] underline text-blue-700 relative">
									<div onClick={togglePaymentDropdown}>
										{paymentStatusFilter === null
											? 'Giá trị'
											: paymentStatusFilter === 0
											? ' Chưa TT'
											: paymentStatusFilter === 1
											? ' Đã TT'
											: ' Công nợ'}
									</div>
									{showPaymentDropdown && (
										<div
											ref={paymentDropdownRef}
											className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 w-40"
											style={{ top: '100%', left: 0 }}
										>
											<div
												className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
													paymentStatusFilter === 0 ? 'bg-blue-100 text-blue-700 font-medium' : ''
												}`}
												onClick={(e) => {
													e.stopPropagation();
													handlePaymentFilter(0);
												}}
											>
												Chưa thanh toán
											</div>
											<div
												className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
													paymentStatusFilter === 1 ? 'bg-blue-100 text-blue-700 font-medium' : ''
												}`}
												onClick={(e) => {
													e.stopPropagation();
													handlePaymentFilter(1);
												}}
											>
												Đã thanh toán
											</div>
											<div
												className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
													paymentStatusFilter === 2 ? 'bg-blue-100 text-blue-700 font-medium' : ''
												}`}
												onClick={(e) => {
													e.stopPropagation();
													handlePaymentFilter(2);
												}}
											>
												Công nợ
											</div>
										</div>
									)}
								</th>

								{/* Sales recorder column with dropdown */}
								<th className="p-1 border-b text-start w-[15%] min-w-36 cursor-pointer hover:text-[#103667] underline text-blue-700 relative">
									<div onClick={() => setShowSalesRecorderDropdown(!showSalesRecorderDropdown)}>
										{salesRecorderFilter !== null ? salesRecorderFilter : 'Người ghi nhận'}
									</div>
									{showSalesRecorderDropdown && (
										<div
											ref={salesRecorderDropdownRef}
											className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 max-h-80 overflow-y-auto"
											style={{ top: '100%', left: 0, minWidth: '200px' }}
										>
											{getUniqueSalesRecorders().map((recorder, index) => (
												<div
													key={recorder}
													className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
														salesRecorderFilter === recorder ? 'bg-blue-100 text-blue-700 font-medium' : ''
													}`}
													onClick={(e) => {
														e.stopPropagation();
														handleSalesRecorderFilter(recorder);
													}}
												>
													{recorder}
												</div>
											))}
										</div>
									)}
								</th>

								<th className="p-1 border-b text-start w-[18%] min-w-[330px]">Thông tin thanh toán</th>
								<th className="p-1 border-b text-start w-[12%] min-w-32">Số hóa đơn</th>
							</tr>
						</thead>
						<tbody>
							{paginatedReceipts.map((receipt) => (
								<tr
									key={receipt.id}
									className={`border-b hover:bg-gray-50 ${hoveredReceiptId === receipt.id ? 'bg-blue-50' : ''}`}
									onMouseEnter={() => handleReceiptMouseEnter(receipt.id)}
									onMouseLeave={handleReceiptMouseLeave}
								>
									{/* Receipt code */}
									<td className="p-1 border-b text-start">
										<div className="flex items-center space-x-2">
											<span className="font-medium">{receipt.order_code || 'N/A'}</span>
											{receipt.order_code && (
												<button
													onClick={() => handleCopyToClipboard(receipt.order_code)}
													className="text-gray-500 hover:text-blue-600"
													title="Sao chép mã tiếp nhận"
												>
													<FaCopy size={12} />
												</button>
											)}
										</div>
									</td>

									{/* HSL */}
									<td className="p-1 border-b text-start">{receipt.record_code || ''}</td>

									{/* MST/CCCD */}
									<td className="p-1 border-b text-start">{receipt.tax_code || receipt.citizen_id || ''}</td>

									{/* Order code */}
									<td className="p-1 border-b text-start">{receipt.quote_code || ''}</td>

									{/* Payment status */}
									<td className="p-1 border-b text-start">
										<span
											className={`px-2 py-1 rounded text-xs font-medium ${
												receipt.payment_status === 1
													? 'bg-green-100 text-green-800'
													: receipt.payment_status === 2
													? 'bg-yellow-100 text-yellow-800'
													: 'bg-red-100 text-red-800'
											}`}
										>
											{receipt.payment_status === 1
												? 'Đã thanh toán'
												: receipt.payment_status === 2
												? 'Công nợ'
												: 'Chưa thanh toán'}
										</span>
									</td>

									{/* Sales recorder */}
									<td className="p-1 border-b text-start">{receipt.sale_recorder || ''}</td>

									{/* Transaction information */}
									<td className="p-1 border-b text-start">
										{receipt.transactions && receipt.transactions.length > 0 ? (
											<div className="space-y-1">
												{receipt.transactions.map((transaction, index) => (
													<div
														key={`${receipt.id}-transaction-${index}`}
														className="text-xs border rounded p-1 bg-gray-50"
													>
														<div className="flex justify-between items-center">
															<span className="font-medium">{formatDate(transaction.transactionDate)}</span>
															<span
																className={`px-1 py-0.5 rounded text-xs ${
																	transaction.transactionType === 'TK viện'
																		? 'bg-blue-100 text-blue-800'
																		: 'bg-green-100 text-green-800'
																}`}
															>
																{transaction.transactionType}
															</span>
														</div>
														<div className="mt-1">
															{editingTransaction.receiptId === receipt.id &&
															editingTransaction.transactionIndex === index &&
															editingTransaction.field === 'amount' ? (
																<input
																	type="text"
																	value={transaction.amount || ''}
																	onChange={(e) => handleTransactionInputChange(e, receipt.id, index, 'amount')}
																	onKeyDown={(e) =>
																		handleTransactionKeyDown(e, receipt.id, index, 'amount', e.target.value)
																	}
																	onBlur={() =>
																		setEditingTransaction({ receiptId: null, transactionIndex: null, field: null })
																	}
																	className="w-full px-1 py-0.5 border rounded text-xs"
																	autoFocus
																/>
															) : (
																<span
																	className="cursor-pointer hover:bg-yellow-100 px-1 rounded"
																	onClick={() => {
																		setOriginalValues((prev) => ({
																			...prev,
																			[`${receipt.id}-${index}-amount`]: transaction.amount,
																		}));
																		setEditingTransaction({
																			receiptId: receipt.id,
																			transactionIndex: index,
																			field: 'amount',
																		});
																	}}
																>
																	{transaction.amount ? `${transaction.amount.toLocaleString()} VNĐ` : 'Chưa có'}
																</span>
															)}
														</div>
													</div>
												))}
											</div>
										) : (
											<span className="text-gray-500 text-xs">Chưa có giao dịch</span>
										)}
									</td>

									{/* Invoice number */}
									<td className="p-1 border-b text-start">{receipt.invoice_number || ''}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className="flex justify-center mt-4 overflow-x-auto max-w-full">
					<div className="flex">
						{Array.from({ length: Math.ceil(currentList.length / receiptsPerPage) }, (_, index) => (
							<button
								key={index + 1}
								className={`px-4 py-2 mx-1 ${currentPage === index + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
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

export default AccountantDashboard;
