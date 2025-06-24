import * as React from 'react';
const { useState, useContext, useEffect, useRef } = React;
import { GlobalContext } from '../contexts/GlobalContext';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2';

const EmailForm = ({ receipt, isVisible, onClose, onStatusUpdate }) => {
	const { currentUser } = useContext(GlobalContext);
	const [isSendingEmail, setIsSendingEmail] = useState(false);
	const contentEditableRef = useRef(null);

	// Helper function to strip HTML tags for validation
	const stripHtmlTags = (html) => {
		const temp = document.createElement('div');
		temp.innerHTML = html;
		return temp.textContent || temp.innerText || '';
	};
	// Helper function to generate HTML sample information as table
	const generateSampleInfoHTML = (samples) => {
		if (!samples || samples.length === 0) return '';

		let tableRows = '';
		samples.forEach((sample, index) => {
			const sampleNumber = index + 1; // Generate sample information display with sample number included
			let sampleInfoDisplay = `<strong>Mẫu ${sampleNumber} - Mã mẫu:</strong> <span contenteditable="true" class="editable-field">${
				sample.sample_uid || ''
			}</span>`;

			// Add sample_information fields
			if (sample.sample_information && sample.sample_information.length > 0) {
				const allowedFields = [
					'Tên mẫu thử / name.',
					'Số lô / LOT no.',
					'Ngày sản xuất / mfg.',
					'Hạn sử dụng / exp.',
					'Nơi sản xuất / mfr.',
				];

				const filteredInfo = sample.sample_information.filter((info) => allowedFields.includes(info.fname));
				if (filteredInfo.length > 0) {
					sampleInfoDisplay +=
						'<br>' +
						filteredInfo
							.map(
								(info) =>
									`<strong>${info.fname}:</strong> <span contenteditable="true" class="editable-field">${
										info.fvalue || ''
									}</span>`,
							)
							.join('<br>');
				}
			} // Add description and requirements under sample info
			sampleInfoDisplay += `<br><strong>Trạng thái:</strong> <span contenteditable="true" class="editable-field">${
				sample.sample_description || ''
			}</span>`;

			// Only add requirements if not empty
			if (sample.additional_request && sample.additional_request.trim() !== '') {
				sampleInfoDisplay += `<br><strong>Yêu cầu:</strong> <span contenteditable="true" class="editable-field">${sample.additional_request}</span>`;
			}

			// Get analysis data
			const analysisData = sample.analysis || [];
			const rowSpan = Math.max(1, analysisData.length);

			// Generate analysis rows
			if (analysisData.length > 0) {
				analysisData.forEach((analysis, analysisIndex) => {
					const parameter = analysis.parameter_name || '';
					const method = analysis.protocol_code || '';
					if (analysisIndex === 0) {
						// First analysis row - include all sample info
						tableRows += `
						<tr style="border-bottom: 1px solid #ddd;">
							<td rowspan="${rowSpan}" style="border: 1px solid #ddd; padding: 8px; vertical-align: top; word-wrap: break-word; word-break: break-word;">${sampleInfoDisplay}</td>
							<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top; word-wrap: break-word; word-break: break-word;">
								<span contenteditable="true" class="editable-field">${parameter}</span>
							</td>
							<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top; word-wrap: break-word; word-break: break-word;">
								<span contenteditable="true" class="editable-field">${method}</span>
							</td>
						</tr>`;
					} else {
						// Additional analysis rows - only parameter and method
						tableRows += `
						<tr style="border-bottom: 1px solid #ddd;">
							<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top; word-wrap: break-word; word-break: break-word;">
								<span contenteditable="true" class="editable-field">${parameter}</span>
							</td>
							<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top; word-wrap: break-word; word-break: break-word;">
								<span contenteditable="true" class="editable-field">${method}</span>
							</td>
						</tr>`;
					}
				});
			} else {
				// No analysis data - single row with sample info only
				tableRows += `
				<tr style="border-bottom: 1px solid #ddd;">
					<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top; word-wrap: break-word; word-break: break-word;">${sampleInfoDisplay}</td>
					<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top; text-align: center; color: #888; word-wrap: break-word; word-break: break-word;">-</td>
					<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top; text-align: center; color: #888; word-wrap: break-word; word-break: break-word;">-</td>
				</tr>`;
			}
		});
		return `
		<table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; table-layout: fixed;">
			<thead>
				<tr style="background-color: #f0f0f0;">
					<th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; width: 50%;">Thông tin mẫu thử</th>
					<th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; width: 25%;">Chỉ tiêu</th>
					<th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; width: 25%;">Phương pháp</th>
				</tr>
			</thead>
			<tbody>
				${tableRows}
			</tbody>
		</table>`;
	}; // Helper function to generate HTML email body
	const generateEmailContent = (receiptData) => {
		const clientInfo = receiptData?.client || {};
		const sampleInfo = generateSampleInfoHTML(receiptData?.samples);
		return `<div style="font-family: Arial, sans-serif; line-height: 1.3; color: #333; text-align: left; max-width: 650px; margin: 0 auto;">
<style>
.editable-field {
	display: inline-block !important;
	outline: none !important;
	border: 1px solid transparent !important;
	padding: 2px 4px !important;
	border-radius: 3px !important;
	margin: 0 1px !important;
	min-width: 60px !important;
	background-color: transparent !important;
}
.editable-field:hover {
	border: 1px solid #ccc !important;
	background-color: #f9f9f9 !important;
}
.editable-field:focus {
	border: 1px solid #3b82f6 !important;
	background-color: #ffffff !important;
	box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
}
table {
	border-collapse: collapse !important;
	width: 100% !important;
	margin: 10px 0 !important;
	font-size: 13px !important;
}
table th, table td {
	border: 1px solid #ddd !important;
	padding: 6px !important;
	vertical-align: top !important;
	text-align: left !important;
}
table th {
	background-color: #f0f0f0 !important;
	font-weight: bold !important;
	text-align: center !important;
	padding: 8px !important;
}
table tbody tr:nth-child(even) {
	background-color: #f9f9f9;
}
table tbody tr:hover {
	background-color: #f5f5f5;
}
</style>

<p style="text-align: left; margin: 8px 0;">Kính gửi Quý khách hàng,</p>
<p style="text-align: left; margin: 8px 0;">Yêu cầu thử nghiệm của Quý khách đã được tiếp nhận theo các thông tin chi tiết như sau:</p>

<div style="border: 2px solid #e0e0e0; margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-radius: 8px; text-align: left; width: 100%; max-width: 650px; box-sizing: border-box;">
<h3 style="color: #2563eb; margin-top: 0; margin-bottom: 10px; text-align: left;">📋 THÔNG TIN KHÁCH HÀNG</h3>
<p style="text-align: left; margin: 4px 0;"><strong>• Tên công ty/cá nhân:</strong> <span contenteditable="true" class="editable-field">${
			clientInfo.client_name || ''
		}</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>• Địa chỉ:</strong> <span contenteditable="true" class="editable-field">${
			clientInfo.client_address || ''
		}</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>• Mã số thuế / CCCD:</strong> <span contenteditable="true" class="editable-field">${
			clientInfo.legal_id || ''
		}</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>• Người liên hệ:</strong> <span contenteditable="true" class="editable-field">${
			receiptData?.contact?.name || ''
		}</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>• Nơi nhận kết quả:</strong> <span contenteditable="true" class="editable-field">${
			clientInfo.client_address || ''
		}</span></p>
</div>

<div style="border: 2px solid #e0e0e0; margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-radius: 8px; text-align: left; width: 100%; max-width: 650px; box-sizing: border-box;">
<h3 style="color: #2563eb; margin-top: 0; margin-bottom: 10px; text-align: left;">📅 THÔNG TIN THỰC HIỆN</h3>
<p style="text-align: left; margin: 4px 0;"><strong>• Ngày trả kết quả dự kiến:</strong> <span contenteditable="true" class="editable-field">${
			receiptData?.deadline ? new Date(receiptData.deadline).toLocaleDateString('vi-VN') : ''
		}</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>• Nơi trả kết quả:</strong> <span contenteditable="true" class="editable-field">${
			clientInfo.client_address || ''
		}</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>• Người liên hệ hỗ trợ:</strong> <span contenteditable="true" class="editable-field">${
			receiptData?.sale_recorder || currentUser?.fullname || ''
		}</span></p>
</div>

<div style="border: 2px solid #e0e0e0; margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-radius: 8px; text-align: left; width: 100%; max-width: 650px; box-sizing: border-box;">
<h3 style="color: #2563eb; margin-top: 0; margin-bottom: 10px; text-align: left;">🧪 THÔNG TIN MẪU THỬ VÀ PHÂN TÍCH</h3>
<div style="text-align: left; width: 100%; overflow-x: auto;">${sampleInfo}</div>
</div>

<div style="border: 2px solid #e0e0e0; margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-radius: 8px; text-align: left; width: 100%; max-width: 650px; box-sizing: border-box;">
<h3 style="color: #2563eb; margin-top: 0; margin-bottom: 10px; text-align: left;">💳 THÔNG TIN THANH TOÁN</h3>
<p style="text-align: left; margin: 4px 0;"><strong>Thụ hưởng:</strong> <span contenteditable="true" class="editable-field">Viện nghiên cứu và phát triển sản phẩm thiên nhiên</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>Số tài khoản:</strong> <span contenteditable="true" class="editable-field">16356688</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>Ngân hàng:</strong> <span contenteditable="true" class="editable-field">ACB Chi nhánh Hà Nội</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>Nội dung thanh toán:</strong> Tên công ty/cá nhân thanh toán phí kiểm nghiệm cho đơn hàng DHXXXXXXX</p>
</div>

<div style="border: 2px solid #e0e0e0; margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-radius: 8px; text-align: left; width: 100%; max-width: 650px; box-sizing: border-box;">
<h3 style="color: #2563eb; margin-top: 0; margin-bottom: 10px; text-align: left;">⚠️ LƯU Ý</h3>
<p style="text-align: left; margin: 4px 0;"><strong>•</strong> Yêu cầu chỉnh sửa phải được gửi trong vòng 48 giờ kể từ thời điểm phòng thí nghiệm tiếp nhận mẫu thử. Sau khoảng thời gian này, mọi yêu cầu chỉnh sửa sẽ không được chấp nhận.</p>
<p style="text-align: left; margin: 4px 0;"><strong>•</strong> Việc hoàn tất thanh toán đồng nghĩa với việc quý khách chấp thuận các điều khoản và điều kiện dịch vụ kiểm nghiệm, được nêu chi tiết tại: <span contenteditable="true" class="editable-field">www.irdop.org/termsconditions</span></p>
<p style="text-align: left; margin: 4px 0;"><strong>•</strong> Phương pháp thử nghiệm, nếu không được chỉ định rõ ràng, sẽ do phòng thí nghiệm quyết định dựa trên đặc tính của mẫu thử được gửi.</p>
<p style="text-align: left; margin: 4px 0;"><strong>•</strong> Trường hợp quý khách cần sử dụng kết quả kiểm nghiệm cho mục đích hợp quy hoặc pháp chế, vui lòng liên hệ nhân viên hỗ trợ để được hướng dẫn bổ sung các tài liệu cần thiết.</p>
</div>

<div style="margin-top: 30px; text-align: center; border-top: 2px solid #e0e0e0; padding-top: 15px;">
<p><strong>Trân trọng cảm ơn,</strong></p>
<p><strong>Viện nghiên cứu và phát triển sản phẩm thiên nhiên</strong></p>
<p>🌐 Website: <span contenteditable="true" class="editable-field">www.irdop.org</span></p>
<p>📧 Email: <span contenteditable="true" class="editable-field">kiemnghiem@irdop.org</span></p>
</div>
</div>`;
	};
	// Helper function to generate subject line
	const generateSubject = (receiptData) => {
		const sampleCount = receiptData?.samples?.length || 0;
		const receiptUid = receiptData?.receipt_uid || '';
		const orderCode = receiptData?.order_code || '';

		return `Thông báo tiếp nhận ${sampleCount} mẫu theo mã ${receiptUid} của đơn hàng ${orderCode}`;
	}; // Email form fields
	const [emailData, setEmailData] = useState({
		from: 'kiemnghiem@irdop.org',
		to: receipt?.contact?.email ? `trungkien912@gmail.com; ${receipt.contact.email}` : 'trungkien912@gmail.com',
		subject: generateSubject(receipt),
		body: generateEmailContent(receipt),
	});

	// Update email body when receipt data changes
	useEffect(() => {
		if (receipt) {
			const contactEmail = receipt?.contact?.email || '';
			const defaultTo = contactEmail ? `trungkien912@gmail.com; ${contactEmail}` : 'trungkien912@gmail.com';
			setEmailData((prev) => ({
				...prev,
				to: defaultTo,
				subject: generateSubject(receipt),
				body: generateEmailContent(receipt),
			}));
		}
	}, [receipt, currentUser]);

	// Update contenteditable div when emailData.body changes
	useEffect(() => {
		if (contentEditableRef.current && contentEditableRef.current.innerHTML !== emailData.body) {
			contentEditableRef.current.innerHTML = emailData.body;
		}
	}, [emailData.body]);

	if (!isVisible) return null;

	const handleEmailDataChange = (field, value) => {
		setEmailData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	// Handle content change for contenteditable div
	const handleContentChange = () => {
		if (contentEditableRef.current) {
			const newContent = contentEditableRef.current.innerHTML;
			setEmailData((prev) => ({
				...prev,
				body: newContent,
			}));
		}
	};

	// Helper function to validate email format
	const isValidEmail = (email) => {
		// Kiểm tra độ dài email (không quá 254 ký tự)
		if (!email || email.length > 254 || email.length < 3) {
			return false;
		}

		// Kiểm tra sự tồn tại của ký tự '@' (phải có chính xác 1 ký tự '@')
		const atCount = (email.match(/@/g) || []).length;
		if (atCount !== 1) {
			return false;
		}

		const atIndex = email.indexOf('@');

		// Kiểm tra vị trí của ký tự '@' (không được ở đầu hoặc cuối)
		if (atIndex === 0 || atIndex === email.length - 1) {
			return false;
		}

		// Tách phần tên người dùng và tên miền
		const localPart = email.substring(0, atIndex);
		const domainPart = email.substring(atIndex + 1);

		// Kiểm tra phần tên người dùng (trước '@')
		if (!isValidLocalPart(localPart)) {
			return false;
		}

		// Kiểm tra phần tên miền (sau '@')
		if (!isValidDomainPart(domainPart)) {
			return false;
		}

		return true;
	};

	// Kiểm tra phần tên người dùng (trước '@')
	const isValidLocalPart = (localPart) => {
		// Không được rỗng và không quá 64 ký tự
		if (!localPart || localPart.length > 64) {
			return false;
		}

		// Không được bắt đầu hoặc kết thúc bằng dấu chấm
		if (localPart.startsWith('.') || localPart.endsWith('.')) {
			return false;
		}

		// Không được có hai dấu chấm liên tiếp
		if (localPart.includes('..')) {
			return false;
		}

		// Kiểm tra ký tự hợp lệ: chữ cái, số, dấu chấm, gạch ngang, gạch dưới
		const localPartRegex = /^[a-zA-Z0-9._-]+$/;
		return localPartRegex.test(localPart);
	};

	// Kiểm tra phần tên miền (sau '@')
	const isValidDomainPart = (domainPart) => {
		// Không được rỗng và không quá 253 ký tự
		if (!domainPart || domainPart.length > 253) {
			return false;
		}

		// Phải chứa ít nhất một dấu chấm
		if (!domainPart.includes('.')) {
			return false;
		}

		// Không được bắt đầu hoặc kết thúc bằng dấu chấm
		if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
			return false;
		}

		// Không được có hai dấu chấm liên tiếp
		if (domainPart.includes('..')) {
			return false;
		}

		// Không được bắt đầu hoặc kết thúc bằng dấu gạch ngang
		if (domainPart.startsWith('-') || domainPart.endsWith('-')) {
			return false;
		}

		// Tách thành các phần được phân cách bởi dấu chấm
		const domainParts = domainPart.split('.');

		// Mỗi phần không được rỗng và phải hợp lệ
		for (const part of domainParts) {
			if (!part || part.length > 63) {
				return false;
			}

			// Không được bắt đầu hoặc kết thúc bằng dấu gạch ngang
			if (part.startsWith('-') || part.endsWith('-')) {
				return false;
			}

			// Chỉ được chứa chữ cái, số và dấu gạch ngang
			const domainPartRegex = /^[a-zA-Z0-9-]+$/;
			if (!domainPartRegex.test(part)) {
				return false;
			}
		}

		// Phần cuối cùng (TLD) phải có ít nhất 2 ký tự và chỉ chứa chữ cái
		const tld = domainParts[domainParts.length - 1];
		if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
			return false;
		}
		return true;
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

		// Parse and validate email addresses
		const emailArray = emailData.to
			.split(/[;,]/) // Split by semicolon or comma
			.map((email) => email.trim()) // Trim whitespace
			.filter((email) => email.length > 0); // Remove empty strings

		// Validate each email format
		const invalidEmails = emailArray.filter((email) => !isValidEmail(email));

		if (invalidEmails.length > 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Email không hợp lệ',
				text: `Các email sau có định dạng không đúng: ${invalidEmails.join(', ')}`,
			});
			return;
		}

		// Check if there's at least one email other than trungkien912@gmail.com
		const otherEmails = emailArray.filter((email) => email !== 'trungkien912@gmail.com');
		if (otherEmails.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Thiếu email người nhận',
				text: 'Phải có ít nhất một email người nhận khác ngoài trungkien912@gmail.com',
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
		if (!stripHtmlTags(emailData.body).trim()) {
			Swal.fire({
				icon: 'warning',
				title: 'Thiếu thông tin',
				text: 'Vui lòng nhập nội dung email.',
			});
			return;
		}

		setIsSendingEmail(true);
		try {
			const requestBody = {
				from: emailData.from,
				to: emailArray, // Use the validated email array
				subject: emailData.subject,
				body: emailData.body,
				isHtml: true, // Indicate that the body contains HTML
			};

			console.log('Sending receipt notification email:', requestBody);

			const response = await apiPost('https://red.irdop.org/v1/mail/send/receipt', requestBody);
			if (response.status === 200) {
				// Update receipt status to "Đã tiếp nhận" after successful email sending
				try {
					const updatePayload = {
						receipt: {
							id: receipt.id,
							receipt_uid: receipt.receipt_uid,
							status: 'Đã tiếp nhận',
							modified_by_uid: currentUser.identity_uid,
						},
					};

					const updateResponse = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', updatePayload);
					if (updateResponse.status === 200) {
						console.log('Receipt status updated successfully to "Đã tiếp nhận"');
						// Update the parent component's state
						if (onStatusUpdate) {
							onStatusUpdate('Đã tiếp nhận');
						}
					} else {
						console.warn('Failed to update receipt status:', updateResponse.data?.message);
					}
				} catch (updateError) {
					console.error('Error updating receipt status:', updateError);
					// Don't show error to user as the email was sent successfully
				}

				Swal.fire({
					icon: 'success',
					title: 'Thành công',
					text: 'Email thông báo tiếp nhận đã được gửi thành công!',
				});
				onClose();
			} else {
				throw new Error(response.data?.message || 'Không thể gửi email');
			}
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
				<h2 className="text-2xl font-semibold mb-4">Gửi Email Thông Báo Tiếp Nhận</h2> {/* Email Form */}
				<div className="mb-6 grid grid-cols-[120px_1fr] gap-4 items-start">
					<label className="text-sm font-medium text-gray-700 pt-2 text-left">From:</label>
					<input
						type="text"
						value={emailData.from}
						onChange={(e) => handleEmailDataChange('from', e.target.value)}
						className="p-2 border rounded-md bg-white"
						readOnly
					/>

					<label className="text-sm font-medium text-gray-700 pt-2 text-left">To:</label>
					<input
						type="text"
						value={emailData.to}
						onChange={(e) => handleEmailDataChange('to', e.target.value)}
						className="p-2 border rounded-md bg-white"
						placeholder="Email người nhận (mặc định: trungkien912@gmail.com; phải có ít nhất 1 email khác)"
					/>

					<label className="text-sm font-medium text-gray-700 pt-2 text-left">Subject:</label>
					<input
						type="text"
						value={emailData.subject}
						onChange={(e) => handleEmailDataChange('subject', e.target.value)}
						className="p-2 border rounded-md bg-white"
					/>

					<label className="text-sm font-medium text-gray-700 pt-2 text-left">Nội dung:</label>
					<div
						ref={contentEditableRef}
						className="p-3 border rounded-md bg-white overflow-y-auto"
						contentEditable
						dangerouslySetInnerHTML={{ __html: emailData.body }}
						onBlur={handleContentChange}
						suppressContentEditableWarning={true}
						style={{
							outline: 'none',
							fontSize: '14px',
							lineHeight: '1.5',
							width: '100%',
							height: '400px',
							maxHeight: '400px',
							minHeight: '400px',
						}}
					/>
				</div>
				{/* Action Buttons */}
				<div className="flex justify-end space-x-2">
					<button
						className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
						onClick={onClose}
						disabled={isSendingEmail}
					>
						Hủy bỏ
					</button>
					<button
						className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
						onClick={handleSendEmail}
						disabled={isSendingEmail}
					>
						{isSendingEmail ? (
							<span className="flex items-center">
								<svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Đang gửi...
							</span>
						) : (
							'Gửi Email'
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default EmailForm;
