import React, { useState, useContext } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import { useNavigate } from 'react-router-dom';

const CreateReceiptFromCRM = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [code, setCode] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [crmData, setCrmData] = useState(null);
	const [error, setError] = useState(null);
	const [isCreating, setIsCreating] = useState(false);
	const [urgentSamples, setUrgentSamples] = useState({});
	const [allUrgent, setAllUrgent] = useState(false);
	const [selectedPurpose, setSelectedPurpose] = useState(''); // Default purpose
	const { formatDate, currentUser, purposes } = useContext(GlobalContext);
	const navigate = useNavigate();

	const openModal = () => {
		setIsModalOpen(true);
		setCode('');
		setCrmData(null);
		setError(null);
		setUrgentSamples({});
		setAllUrgent(false);
		setSelectedPurpose(''); // Reset to default purpose
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			const response = await apiPost('https://black.irdop.org/crm/generate_receipt', { code });

			// Check if the response contains an error
			if (response.data && response.data.error) {
				setError(response.data.message || 'Đã xảy ra lỗi khi lấy dữ liệu từ CRM.');
				setCrmData(null);
			} else {
				setCrmData(response.data);
				setError(null);

				// Initialize urgent samples state
				const initialUrgentState = {};
				response.data.samples.forEach((_, index) => {
					initialUrgentState[index] = false;
				});
				setUrgentSamples(initialUrgentState);
			}
		} catch (error) {
			console.error('Error fetching CRM data:', error);
			setError(error.response?.data?.message || 'Không thể lấy dữ liệu từ CRM. Vui lòng kiểm tra mã đơn hàng.');
			setCrmData(null);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle the "all samples urgent" checkbox
	const handleAllUrgentChange = (e) => {
		const checked = e.target.checked;
		setAllUrgent(checked);

		// Create a new object with all samples set to the checked value
		const newUrgentSamples = {};
		if (crmData && crmData.samples) {
			crmData.samples.forEach((_, index) => {
				newUrgentSamples[index] = checked;
			});
		}
		setUrgentSamples(newUrgentSamples);
	};

	// Handle individual sample urgent checkbox
	const handleUrgentChange = (index, checked) => {
		setUrgentSamples((prev) => ({
			...prev,
			[index]: checked,
		}));
	};

	const handleCreateReceipt = async () => {
		if (!crmData) return;

		setIsCreating(true);

		// Add status property to samples based on urgentSamples state
		const samplesWithStatus = crmData.samples.map((sample, index) => ({
			...sample,
			sample_information: [
				{ fname: 'Tên mẫu thử / name.', fvalue: sample?.sample_name || '' },
				{ fname: 'Số lô / LOT no.', fvalue: '' },
				{ fname: 'Ngày sản xuất / mfg.', fvalue: '' },
				{ fname: 'Hạn sử dụng / exp.', fvalue: '' },
				{ fname: 'Nơi sản xuất / mfr.', fvalue: '' },
				{
					fname: 'Ngày tiếp nhận / receipt date.',
					fvalue: new Date().toLocaleDateString('vi-VN'),
				},
				{ fname: 'Mô tả / desc.', fvalue: sample?.sample_description || '' },
			],
			status: urgentSamples[index] ? 1 : 0,
			purpose: selectedPurpose, // Add purpose to each sample
		}));

		try {
			const response = await apiPost('https://black.irdop.org/crm/create_receipt', {
				client: crmData.client,
				samples: samplesWithStatus,
				created_by_uid: currentUser.identity_uid,
				modified_by_uid: currentUser.identity_uid,
				order_code: crmData.order_code,
				quote_code: crmData.quote_code,
				sale_recorder: crmData.sale_recorder,
				total_amount: crmData.total_amount,
			});

			// Check if the response contains an error
			if (response.data && response.data.error) {
				setError(response.data.message || 'Đã xảy ra lỗi khi tạo tiếp nhận mẫu.');
			} else {
				// Close modal and navigate to the receipt page
				closeModal();
				navigate(`/dashboard/receipt?receipt_uid=${response.data.receipt_uid}`);
			}
		} catch (error) {
			console.error('Error creating receipt:', error);
			setError(error.response?.data?.message || 'Không thể tạo tiếp nhận mẫu. Vui lòng thử lại sau.');
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<>
			<button
				onClick={openModal}
				className="border-gray-300 font-medium py-0 px-2 rounded-lg w-fit bg-background text-primary"
			>
				<div>Tạo TNM từ CRM</div>
			</button>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
					<div className="absolute inset-0 bg-black bg-opacity-50 " onClick={closeModal}></div>
					<div className="bg-white rounded-lg p-6 max-w-3xl w-full z-10 max-h-[90vh] min-h-72 relative flex flex-col justify-between">
						<div>
							<h2 className="text-xl font-bold mb-4">Tạo tiếp nhận mẫu từ CRM</h2>

							<form onSubmit={handleSubmit} className="mb-4">
								<div className="flex items-center gap-2">
									<input
										type="text"
										value={code}
										onChange={(e) => setCode(e.target.value)}
										placeholder="Nhập mã đơn hàng"
										className="border p-2 rounded flex-grow bg-white"
										required
									/>
									<button
										type="submit"
										className="bg-primary text-white p-2 rounded hover:bg-blue-700"
										disabled={isLoading}
									>
										{isLoading ? 'Đang tìm...' : 'Tìm'}
									</button>
								</div>
							</form>

							{error && (
								<div className="text-red-500 mb-4 p-3 bg-red-50 border border-red-200 rounded">
									<p className="font-medium">Lỗi:</p>
									<p>{error}</p>
								</div>
							)}

							{crmData && (
								<div className="overflow-y-auto pr-1 max-h-[50vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
									<div className="border rounded-lg p-2 mb-2 text-start w-full">
										<h3 className="font-semibold text-lg">Thông tin đơn hàng</h3>
										<p>
											<span className="font-medium">Mã đơn hàng: </span>
											{crmData.order_code || 'N/A'}
										</p>
										<p>
											<span className="font-medium">Mã báo giá: </span>
											{crmData.quote_code || 'N/A'}
										</p>
										<p>
											<span className="font-medium">Ghi nhận doanh số: </span>
											{crmData.sale_recorder || 'N/A'}
										</p>
										<p>
											<span className="font-medium">Tổng tiền: </span>
											{crmData.total_amount
												? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
														crmData.total_amount,
												  )
												: 'N/A'}
										</p>
									</div>

									<div className="border rounded-lg p-2 mb-2 text-start w-full">
										<h3 className="font-semibold text-lg">Thông tin khách hàng</h3>
										<p>
											<span className="font-medium">Tên: </span>
											{crmData.client.client_name}
										</p>
										<p>
											<span className="font-medium">Địa chỉ: </span>
											{crmData.client.client_address}
										</p>
										<p>
											<span className="font-medium">MST: </span>
											{crmData.client.legal_id}
										</p>
									</div>

									<div className="mb-4 w-full">
										<div className="flex justify-between items-center mb-2">
											<h3 className="font-semibold text-lg">Danh sách mẫu</h3>
											<div className="flex items-center gap-4">
												<div className="flex items-center">
													<input
														type="checkbox"
														id="allUrgent"
														checked={allUrgent}
														onChange={handleAllUrgentChange}
														className="mr-2"
													/>
													<label htmlFor="allUrgent" className="text-sm font-medium">
														Mẫu khẩn
													</label>
												</div>
												<div className="flex items-center">
													<label htmlFor="purpose" className="text-sm font-medium mr-2">
														Mục đích:
													</label>
													<select
														id="purpose"
														value={selectedPurpose}
														onChange={(e) => setSelectedPurpose(e.target.value)}
														className="border rounded p-1 bg-white text-sm py-0.5 border-gray-400 "
													>
														<option value="">--</option>
														{purposes.map((purpose, idx) => (
															<option key={idx} value={purpose}>
																{purpose}
															</option>
														))}
													</select>
												</div>
											</div>
										</div>
										{crmData.samples.map((sample, index) => (
											<div key={index} className="mb-4 p-2 border rounded w-full">
												<div className="flex justify-between items-center">
													<h2 className="font-medium text-start text-lg">{sample.sample_name}</h2>
													<div className="flex items-center">
														<input
															type="checkbox"
															id={`urgent-${index}`}
															checked={urgentSamples[index] || false}
															onChange={(e) => handleUrgentChange(index, e.target.checked)}
															className="mr-2"
														/>
														<label htmlFor={`urgent-${index}`} className="text-sm font-medium">
															Mẫu khẩn
														</label>
													</div>
												</div>
												<div className="overflow-x-auto">
													<table className="w-full mt-2">
														<thead>
															<tr className="border-b-2">
																<th className="p-1 text-start">Mã</th>
																<th className="p-1 text-start">Chỉ tiêu</th>
																<th className="p-1 text-start">Nền mẫu</th>
															</tr>
														</thead>
														<tbody>
															{sample.analysis.map((item, idx) => (
																<tr key={idx} className="border-b">
																	<td className="p-1 text-start">{item.parameter_uid}</td>
																	<td className="p-1 text-start">{item.parameter_name}</td>
																	<td className="p-1 text-start">{item.matrix}</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											</div>
										))}
									</div>

									<div className="flex justify-end w-full">
										<button
											onClick={handleCreateReceipt}
											disabled={isCreating}
											className="bg-primary text-white font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
										>
											{isCreating ? 'Đang tạo...' : 'Tạo tiếp nhận mẫu'}
										</button>
									</div>
								</div>
							)}
						</div>

						<div className="flex justify-end mt-4">
							<button
								onClick={closeModal}
								className="bg-gray-300 text-gray-700 font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-gray-400"
								disabled={isCreating}
							>
								Đóng
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default CreateReceiptFromCRM;
