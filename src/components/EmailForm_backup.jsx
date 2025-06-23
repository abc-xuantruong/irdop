import * as React from 'react';
const { useState, useContext, useEffect } = React;
import { GlobalContext } from '../contexts/GlobalContext';
import axios from 'axios';
import Swal from 'sweetalert2';

const EmailForm = ({ receipt, isVisible, onClose }) => {
	const { currentUser } = useContext(GlobalContext);
	const [isSendingEmail, setIsSendingEmail] = useState(false);

	// Email form fields
	const [emailData, setEmailData] = useState({
		from: 'kiemnghiem@irdop.org',
		to: receipt?.contact?.email || '',
		subject: 'Thông báo tiếp nhận mẫu IRDOP',
		content: `Kinh gửi quý khách hàng

Yêu cầu thử nghiệm của bạn đã được tiếp nhận theo các thông tin sau đây:

Khách hàng: ${receipt?.client?.client_name || '[Tên khách hàng]'}
Người liên hệ: ${receipt?.contact?.contact_name || '[Người liên hệ]'}
Nơi trả kết quả: ${receipt?.client?.client_address || '[Địa chỉ]'}

Hoá đơn (nếu có)

Mẫu thử, mô tả, chỉ tiêu, phương pháp

Ngày trả kết quả dự kiến: ${receipt?.deadline ? new Date(receipt.deadline).toLocaleDateString('vi-VN') : '[Ngày dự kiến]'}

Người liên hệ khi cần hỗ trợ: ${receipt?.sale_recorder || currentUser?.fullname || '[Người phụ trách]'}

Thông tin thanh toán:
Viện nghiên cứu và phát triển sản phẩm thiên nhiên
STK: 16356688 tại ngân hàng ACB chi nhánh Hà Nội.

Lưu ý:
- Điều chỉnh trong 48 giờ kể từ khi tiếp nhận. Sau thời gian này sẽ không chấp nhận yêu cầu chỉnh sửa.
- Thanh toán đồng nghĩa với việc đồng ý với điều khoản và điều kiện dịch vụ kiểm nghiệm.
- Thông tin chia sẻ giữa hai bên được bảo mật theo quy tắc bảo mật tại irdop.org/privacy
- Trường hợp khách hàng có nhu cầu sử dụng kết quả cho mục đích hợp quy, pháp chế, vui lòng liên hệ hỗ trợ viên để bổ sung hồ sơ cần thiết.

Trân trọng,
Viện nghiên cứu và phát triển sản phẩm thiên nhiên`,
	});	// Update email content when receipt data changes
	useEffect(() => {
		if (receipt) {
			setEmailData(prev => ({
				...prev,
				to: receipt?.contact?.email || '',
				content: `Kinh gửi quý khách hàng

Yêu cầu thử nghiệm của bạn đã được tiếp nhận theo các thông tin sau đây:

Khách hàng: ${receipt?.client?.client_name || '[Tên khách hàng]'}
Người liên hệ: ${receipt?.contact?.contact_name || '[Người liên hệ]'}
Nơi trả kết quả: ${receipt?.client?.client_address || '[Địa chỉ]'}

Hoá đơn (nếu có)

Mẫu thử, mô tả, chỉ tiêu, phương pháp

Ngày trả kết quả dự kiến: ${receipt?.deadline ? new Date(receipt.deadline).toLocaleDateString('vi-VN') : '[Ngày dự kiến]'}

Người liên hệ khi cần hỗ trợ: ${receipt?.sale_recorder || currentUser?.fullname || '[Người phụ trách]'}

Thông tin thanh toán:
Viện nghiên cứu và phát triển sản phẩm thiên nhiên
STK: 16356688 tại ngân hàng ACB chi nhánh Hà Nội.

Lưu ý:
- Điều chỉnh trong 48 giờ kể từ khi tiếp nhận. Sau thời gian này sẽ không chấp nhận yêu cầu chỉnh sửa.
- Thanh toán đồng nghĩa với việc đồng ý với điều khoản và điều kiện dịch vụ kiểm nghiệm.
- Thông tin chia sẻ giữa hai bên được bảo mật theo quy tắc bảo mật tại irdop.org/privacy
- Trường hợp khách hàng có nhu cầu sử dụng kết quả cho mục đích hợp quy, pháp chế, vui lòng liên hệ hỗ trợ viên để bổ sung hồ sơ cần thiết.

Trân trọng,
Viện nghiên cứu và phát triển sản phẩm thiên nhiên`
			}));
		}
	}, [receipt, currentUser]);

	if (!isVisible) return null;

	const handleEmailDataChange = (field, value) => {
		setEmailData((prev) => ({
			...prev,
			[field]: value,
		}));
	};
	const handleSendEmail = async () => {
		// Validate required fields
		if (!emailData.to.trim()) {
			Swal.fire({
				icon: 'warning',
				title: 'Thiếu thông tin',
				text: 'Vui lòng nhập email người nhận.',
			});
			return;
		}

		if (!emailData.subject.trim()) {
			Swal.fire({
				icon: 'warning',
				title: 'Thiếu thông tin',
				text: 'Vui lòng nhập tiêu đề email.',
			});
			return;
		}

		if (!emailData.content.trim()) {
			Swal.fire({
				icon: 'warning',
				title: 'Thiếu thông tin',
				text: 'Vui lòng nhập nội dung email.',
			});
			return;
		}

		setIsSendingEmail(true);

		try {
			// TODO: Implement actual email sending API call
			console.log('Sending receipt notification email:', emailData);
			
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 1000));

			Swal.fire({
				icon: 'success',
				title: 'Thành công',
				text: 'Email thông báo tiếp nhận đã được gửi thành công!',
			});

			onClose();
		} catch (error) {
			console.error('Error sending email:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: `Không thể gửi email: ${error.message || 'Lỗi không xác định'}`,
			});
		} finally {
			setIsSendingEmail(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
			<div className="bg-white p-6 rounded-lg w-4/5 max-w-4xl max-h-[90vh] overflow-y-auto">
				<h2 className="text-2xl font-semibold mb-4">Gửi Email Kết Quả</h2> {/* Email Form */}
				<div className="mb-6 space-y-4">
					<div className="flex items-center space-x-4">
						<label className="block text-sm font-medium text-gray-700 w-20 text-left">From:</label>
						<input
							type="text"
							value={emailData.from}
							onChange={(e) => handleEmailDataChange('from', e.target.value)}
							className="flex-1 p-2 border rounded-md bg-white"
						/>
					</div>

					<div className="flex items-center space-x-4">
						<label className="block text-sm font-medium text-gray-700 w-20 text-left">To:</label>
						<input
							type="email"
							value={emailData.to}
							onChange={(e) => handleEmailDataChange('to', e.target.value)}
							className="flex-1 p-2 border rounded-md bg-white"
							placeholder="Email người nhận"
						/>
					</div>

					<div className="flex items-center space-x-4">
						<label className="block text-sm font-medium text-gray-700 w-20 text-left">Subject:</label>
						<input
							type="text"
							value={emailData.subject}
							onChange={(e) => handleEmailDataChange('subject', e.target.value)}
							className="flex-1 p-2 border rounded-md bg-white"
						/>
					</div>

					<div className="flex items-start space-x-4">
						<label className="block text-sm font-medium text-gray-700 w-20 text-left mt-2">Nội dung:</label>
						<textarea
							value={emailData.content}
							onChange={(e) => handleEmailDataChange('content', e.target.value)}
							className="flex-1 p-2 border rounded-md resize-none bg-white"
							rows={2}
							placeholder="Nhập nội dung email..."
						/>
					</div>
				</div>
				{/* Sample Reports Table */}
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-3">Chọn Báo Cáo Đính Kèm</h3>{' '}
					<div className="overflow-x-auto">
						<table className="min-w-full border-collapse border border-gray-300">
							<thead>
								<tr className="bg-gray-100">
									<th className="border border-gray-300 px-4 py-2 text-left">
										<input
											type="checkbox"
											className="w-4 h-4"
											checked={selectAllChecked}
											onChange={handleSelectAllToggle}
										/>
									</th>
									<th className="border border-gray-300 px-4 py-2 text-left">Mã mẫu</th>
									<th className="border border-gray-300 px-4 py-2 text-left">Phiếu phân tích</th>
								</tr>
							</thead>{' '}
							<tbody>
								{receipt?.samples.map((sample) => {
									const reports = sample.report || [];
									const draftReports = getDraftReports(reports);
									const newestDraftReport = getNewestDraftReport(reports);
									const selectedReport = selectedReports[sample.id] || {};
									const selectedReportId = selectedReport.ppt_uid || newestDraftReport?.ppt_uid || '';

									return (
										<tr key={sample.id}>
											<td
												className="border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-gray-50"
												onClick={() => handleCheckboxToggle(sample.id)}
											>
												<input
													type="checkbox"
													className="w-4 h-4 pointer-events-none"
													checked={selectedReport.isChecked || false}
													readOnly
												/>
											</td>
											<td className="border border-gray-300 px-4 py-2">{sample.sample_uid}</td>
											<td className="border border-gray-300 px-4 py-2">
												{draftReports.length > 0 ? (
													<div className="flex items-center space-x-2">
														<select
															className="flex-1 p-1 border rounded-md bg-white"
															value={selectedReportId}
															onChange={(e) => handleReportSelection(sample.id, e.target.value)}
														>
															<option value="">-- Chọn phiếu phân tích --</option>
															{draftReports.map((report, index) => (
																<option key={index} value={report.ppt_uid}>
																	{report.ppt_uid}
																</option>
															))}
														</select>
														{selectedReportId && (
															<button
																className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex-shrink-0"
																onClick={() => {
																	const url = `${window.location.origin}/report?sample_uid=${sample.sample_uid}&ppt_uid=${selectedReportId}`;
																	window.open(url, '_blank');
																}}
																title="Mở báo cáo"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	fill="none"
																	viewBox="0 0 24 24"
																	strokeWidth={1.5}
																	stroke="currentColor"
																	className="w-4 h-4"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
																	/>
																</svg>
															</button>
														)}
													</div>
												) : (
													<span className="text-gray-500 italic">Chưa có bản sơ bộ</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
				{/* Action Buttons */}
				<div className="flex justify-between items-center">
					<div className="flex space-x-2">
						<button
							className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
							onClick={handlePreviewReports}
							disabled={isGeneratingPreview}
						>
							{isGeneratingPreview ? (
								<span className="flex items-center">
									<svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Đang xử lý...
								</span>
							) : (
								<span className="flex items-center">
									<FaFilePdf className="mr-2" />
									Xem trước
								</span>
							)}
						</button>

						<button
							className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
							onClick={handleGenerateDraftReports}
							disabled={isGeneratingDraft}
						>
							{isGeneratingDraft ? (
								<span className="flex items-center">
									<svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Đang tạo...
								</span>
							) : (
								<span className="flex items-center">
									<FaFilePdf className="mr-2" />
									Tạo sơ bộ
								</span>
							)}
						</button>

						<button
							className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
							onClick={handleDownloadPDF}
							disabled={isGeneratingPDF}
						>
							{isGeneratingPDF ? (
								<span className="flex items-center">
									<svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Đang tạo PDF...
								</span>
							) : (
								<span className="flex items-center">
									<FaFilePdf className="mr-2" />
									Tải về PDF
								</span>
							)}
						</button>
					</div>

					<div className="flex space-x-2">
						<button className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600" onClick={onClose}>
							Hủy bỏ
						</button>
						<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" onClick={handleSendEmail}>
							Gửi Email
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EmailForm;
