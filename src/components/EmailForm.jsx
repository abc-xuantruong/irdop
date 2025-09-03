import * as React from 'react';
const { useState, useEffect, useRef } = React;
import Swal from 'sweetalert2';
import { apiPost } from '../contexts/helperFunctionCallAPI';

const EmailForm = ({
	from,
	to,
	subject,
	body,
	attachments,
	foreignKeyUIDs,
	isVisible,
	onClose,
	onSubmit,
	emailIndex,
	totalEmails,
	title = 'Thông Báo Tiếp Nhận ',
}) => {
	const [isSendingEmail, setIsSendingEmail] = useState(false);
	const contentEditableRef = useRef(null);

	// File selection states
	const [showFileModal, setShowFileModal] = useState(false);
	const [fileList, setFileList] = useState([]);
	const [selectedFileIds, setSelectedFileIds] = useState([]);
	const [loadingFiles, setLoadingFiles] = useState(false);

	// Attachment files info
	const [attachmentFiles, setAttachmentFiles] = useState([]);
	const [loadingAttachments, setLoadingAttachments] = useState(false);

	// Helper function to strip HTML tags for validation
	const stripHtmlTags = (html) => {
		const temp = document.createElement('div');
		temp.innerHTML = html;
		return temp.textContent || temp.innerText || '';
	};

	// Email form fields - use props values
	const [emailData, setEmailData] = useState({
		from: from || '',
		to: to || '',
		subject: subject || '',
		body: body || '',
		attachments: attachments || [],
	});

	// Update email data when props change
	useEffect(() => {
		setEmailData({
			from: from || '',
			to: to || '',
			subject: subject || '',
			body: body || '',
			attachments: attachments || [],
		});

		// Load attachment files info when attachments change
		if (attachments && attachments.length > 0) {
			loadAttachmentFiles(attachments);
		} else {
			setAttachmentFiles([]);
		}
	}, [from, to, subject, body, attachments]);

	// Update contenteditable div when emailData.body changes
	useEffect(() => {
		if (contentEditableRef.current && contentEditableRef.current.innerHTML !== emailData.body) {
			contentEditableRef.current.innerHTML = emailData.body;
		}
	}, [emailData.body]);

	// Load files when opening file modal
	const loadFiles = async () => {
		if (!foreignKeyUIDs) {
			return;
		}

		setLoadingFiles(true);
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get_by_key', {
				foreignKeyUIDs: foreignKeyUIDs,
			});

			if (response.status === 200 && Array.isArray(response.data)) {
				setFileList(response.data);
			} else {
				setFileList([]);
			}
		} catch (error) {
			console.error('Error loading files:', error);
			setFileList([]);
		} finally {
			setLoadingFiles(false);
		}
	};

	// Load attachment files info
	const loadAttachmentFiles = async (attachmentIds) => {
		if (!attachmentIds || attachmentIds.length === 0) {
			setAttachmentFiles([]);
			return;
		}

		setLoadingAttachments(true);
		try {
			const fileResults = [];

			// Gọi API từng file một
			for (const attachmentId of attachmentIds) {
				try {
					const response = await apiPost('https://red.irdop.org/v1/file/get/file', {
						id: attachmentId,
					});

					if (response.status === 200 && response.data) {
						fileResults.push(response.data);
					}
				} catch (fileError) {
					console.error(`Error loading file ${attachmentId}:`, fileError);
					// Continue với file tiếp theo nếu có lỗi
				}
			}

			setAttachmentFiles(fileResults);
		} catch (error) {
			console.error('Error loading attachment files:', error);
			setAttachmentFiles([]);
		} finally {
			setLoadingAttachments(false);
		}
	};

	// Handle file selection
	const handleFileSelect = (fileId, isSelected) => {
		if (isSelected) {
			setSelectedFileIds((prev) => [...prev, fileId]);
		} else {
			setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));
		}
	};

	// Add selected files to attachments
	const handleConfirmFileSelection = () => {
		// Add only file IDs to attachments array
		setEmailData((prev) => ({
			...prev,
			attachments: [...prev.attachments, ...selectedFileIds],
		}));

		setShowFileModal(false);
		setSelectedFileIds([]);
	};

	// Remove attachment by ID
	const handleRemoveAttachment = (fileId) => {
		setEmailData((prev) => ({
			...prev,
			attachments: prev.attachments.filter((id) => id !== fileId),
		}));
	};

	// Get file name by ID from attachmentFiles or fileList
	const getFileNameById = (fileId) => {
		// First check in attachmentFiles
		let file = attachmentFiles.find((f) => f.id === fileId);
		if (!file) {
			// Fallback to fileList
			file = fileList.find((f) => f.id === fileId);
		}
		return file?.originInfo?.fileName || 'Unknown File';
	};

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
		if (!email || email.length > 254 || email.length < 3) {
			return false;
		}

		const atCount = (email.match(/@/g) || []).length;
		if (atCount !== 1) {
			return false;
		}

		const atIndex = email.indexOf('@');
		if (atIndex === 0 || atIndex === email.length - 1) {
			return false;
		}

		const localPart = email.substring(0, atIndex);
		const domainPart = email.substring(atIndex + 1);

		if (!isValidLocalPart(localPart)) {
			return false;
		}

		if (!isValidDomainPart(domainPart)) {
			return false;
		}

		return true;
	};

	const isValidLocalPart = (localPart) => {
		if (!localPart || localPart.length > 64) {
			return false;
		}

		if (localPart.startsWith('.') || localPart.endsWith('.')) {
			return false;
		}

		if (localPart.includes('..')) {
			return false;
		}

		const localPartRegex = /^[a-zA-Z0-9._-]+$/;
		return localPartRegex.test(localPart);
	};

	const isValidDomainPart = (domainPart) => {
		if (!domainPart || domainPart.length > 253) {
			return false;
		}

		if (!domainPart.includes('.')) {
			return false;
		}

		if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
			return false;
		}

		if (domainPart.includes('..')) {
			return false;
		}

		if (domainPart.startsWith('-') || domainPart.endsWith('-')) {
			return false;
		}

		const domainParts = domainPart.split('.');

		for (const part of domainParts) {
			if (!part || part.length > 63) {
				return false;
			}

			if (part.startsWith('-') || part.endsWith('-')) {
				return false;
			}

			const domainPartRegex = /^[a-zA-Z0-9-]+$/;
			if (!domainPartRegex.test(part)) {
				return false;
			}
		}

		const tld = domainParts[domainParts.length - 1];
		if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
			return false;
		}
		return true;
	};

	const handleSendEmail = async () => {
		if (!emailData.to.trim()) {
			Swal.fire({
				icon: 'warning',
				title: 'Thiếu thông tin',
				text: 'Vui lòng nhập email người nhận.',
			});
			return;
		}

		const emailArray = emailData.to
			.split(/[;,]/)
			.map((email) => email.trim())
			.filter((email) => email.length > 0);

		const invalidEmails = emailArray.filter((email) => !isValidEmail(email));

		if (invalidEmails.length > 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Email không hợp lệ',
				text: `Các email sau có định dạng không đúng: ${invalidEmails.join(', ')}`,
			});
			return;
		}

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
				to: emailArray,
				subject: emailData.subject,
				body: emailData.body,
				attachments: emailData.attachments,
				isHtml: true,
			};

			if (onSubmit) {
				await onSubmit(requestBody);
			}
		} catch (error) {
			console.error('Error in handleSendEmail:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: `Có lỗi xảy ra: ${error.message || 'Lỗi không xác định'}`,
			});
		} finally {
			setIsSendingEmail(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
			<div className="bg-white p-6 rounded-lg w-4/5 max-w-4xl max-h-[90vh] overflow-y-auto">
				<h2 className="text-2xl font-semibold mb-4">
					{totalEmails && totalEmails > 1
						? `Gửi Email ${title} (${emailIndex + 1}/${totalEmails})`
						: `Gửi Email ${title}`}
				</h2>

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
						placeholder="Email người nhận"
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

					<label className="text-sm font-medium text-gray-700 pt-2 text-left">Đính kèm:</label>
					<div className="space-y-2">
						{loadingAttachments ? (
							<div className="text-sm text-gray-500">Đang tải thông tin file đính kèm...</div>
						) : emailData.attachments.length > 0 ? (
							<div className="space-y-1">
								{emailData.attachments.map((fileId, index) => (
									<div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
										<span className="text-sm">{getFileNameById(fileId)}</span>
										<button
											onClick={() => handleRemoveAttachment(fileId)}
											className="text-red-600 hover:text-red-800 text-sm"
										>
											Xóa
										</button>
									</div>
								))}
							</div>
						) : null}
						<button
							onClick={(e) => {
								if (!foreignKeyUIDs) {
									return;
								}

								setShowFileModal(true);
								loadFiles();
							}}
							className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm cursor-pointer"
							disabled={!foreignKeyUIDs}
							type="button"
						>
							Chọn file đính kèm
						</button>
					</div>
				</div>

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
										d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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

			{/* File Selection Modal */}
			{showFileModal && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-60">
					<div className="bg-white p-6 rounded-lg w-4/5 max-w-4xl max-h-[80vh] overflow-y-auto">
						<h3 className="text-xl font-semibold mb-4">Chọn file đính kèm</h3>

						{loadingFiles ? (
							<div className="text-center py-4">Đang tải danh sách file...</div>
						) : (
							<>
								{fileList.length > 0 ? (
									<div className="space-y-2 max-h-96 overflow-y-auto">
										{fileList.map((file) => {
											const isAlreadyAttached = emailData.attachments.includes(file.id);
											const isSelected = selectedFileIds.includes(file.id);

											return (
												<div
													key={file.id}
													className={`flex items-center space-x-3 p-2 border rounded cursor-pointer hover:bg-gray-50 ${
														isAlreadyAttached ? 'bg-gray-100 opacity-50' : ''
													} ${isSelected ? 'border-blue-500 bg-blue-50' : ''}`}
													onClick={() => {
														if (!isAlreadyAttached) {
															handleFileSelect(file.id, !isSelected);
														}
													}}
												>
													<input
														type="checkbox"
														checked={isSelected}
														onChange={(e) => handleFileSelect(file.id, e.target.checked)}
														disabled={isAlreadyAttached}
														className="w-4 h-4"
														onClick={(e) => e.stopPropagation()}
													/>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-4 min-w-0 text-start">
															<div className="min-w-[300px] flex-1">
																<span className="font-medium text-sm truncate block">
																	{file.originInfo?.fileName || 'Unknown File'}
																</span>
															</div>
															<div className="min-w-[100px] flex-shrink-0">
																<span className="text-sm text-gray-600 whitespace-nowrap">
																	{(file.originInfo?.fileSize / 1024).toFixed(2)} KB
																</span>
															</div>
															<div className="min-w-[120px] flex-shrink-0">
																<span className="text-sm text-gray-600 whitespace-nowrap">
																	{new Date(file.createdAt).toLocaleDateString()}
																</span>
															</div>
															{isAlreadyAttached && (
																<div className="flex-shrink-0">
																	<span className="text-blue-600 font-medium text-sm whitespace-nowrap">
																		• Đã đính kèm
																	</span>
																</div>
															)}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<div className="text-center py-4 text-gray-500">Không có file nào</div>
								)}

								<div className="flex justify-end space-x-2 mt-4">
									<button
										onClick={() => {
											setShowFileModal(false);
											setSelectedFileIds([]);
										}}
										className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
									>
										Hủy
									</button>
									<button
										onClick={handleConfirmFileSelection}
										disabled={selectedFileIds.length === 0}
										className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
									>
										Xác nhận ({selectedFileIds.length} file)
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default EmailForm;
