import * as React from 'react';
const { useState, useRef, useEffect } = React;
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { toast } from 'react-toastify';
import { apiPost, apiPostFormData } from '../../contexts/helperFunctionCallAPI';
import { useTaskQueue } from '../../contexts/TaskQueueContext';

const ProtocolDetail = ({ protocol, isOpen, onClose, onProtocolUpdate }) => {
	const { addTask, updateTask } = useTaskQueue();
	const [isEditMode, setIsEditMode] = useState(false);
	const [editedProtocol, setEditedProtocol] = useState(protocol);
	const [activeTab, setActiveTab] = useState('detailedProcedure');
	const [showReExtractModal, setShowReExtractModal] = useState(false);
	const [reExtractFile, setReExtractFile] = useState(null);
	const [reExtractInstruction, setReExtractInstruction] = useState('');
	const reExtractFileInputRef = useRef(null);

	// Allowed fields for API calls based on database schema
	const allowedFields = [
		'id',
		'protocolCode',
		'docProtocolCode',
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
	];

	// Helper function to filter object by allowed fields
	const filterProtocolFields = (protocolObj) => {
		const filtered = {};
		allowedFields.forEach((field) => {
			if (protocolObj.hasOwnProperty(field)) {
				filtered[field] = protocolObj[field];
			}
		});
		return filtered;
	};

	// Update editedProtocol when protocol prop changes
	React.useEffect(() => {
		if (protocol) {
			setEditedProtocol(protocol);
		}
	}, [protocol]);

	// Add custom styles for markdown tables
	useEffect(() => {
		const style = document.createElement('style');
		style.textContent = `
			.prose table {
				border-collapse: collapse;
				width: 100%;
				margin: 1em 0;
				border: 1px solid #e5e7eb;
			}
			.prose thead {
				background-color: #f9fafb;
			}
			.prose th {
				padding: 4px;
				text-align: left;
				font-weight: 600;
				border: 1px solid #e5e7eb;
				background-color: #f3f4f6;
			}
			.prose td {
				padding: 4px;
				border: 1px solid #e5e7eb;
			}
			.prose tbody tr:hover {
				background-color: #f9fafb;
			}
			.prose tbody tr:nth-child(even) {
				background-color: #fafafa;
			}
			
			/* Minimal scrollbar styles */
			::-webkit-scrollbar {
				width: 6px;
				height: 6px;
			}
			::-webkit-scrollbar-track {
				background: #f1f1f1;
				border-radius: 3px;
			}
			::-webkit-scrollbar-thumb {
				background: #c1c1c1;
				border-radius: 3px;
			}
			::-webkit-scrollbar-thumb:hover {
				background: #a8a8a8;
			}
			/* Firefox scrollbar */
			* {
				scrollbar-width: thin;
				scrollbar-color: #c1c1c1 #f1f1f1;
			}
		`;
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, []);

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

	const handleFieldChange = (field, value) => {
		setEditedProtocol((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const toggleEditMode = () => {
		if (!isEditMode) {
			setEditedProtocol({ ...protocol });
		}
		setIsEditMode(!isEditMode);
	};

	const handleSaveProtocol = async () => {
		try {
			const filteredProtocol = filterProtocolFields(editedProtocol);
			const response = await apiPost('https://red.irdop.org/v1/protocol/update?action=update', {
				protocol: filteredProtocol,
			});

			console.log('Save response:', response);
			console.log('Save response.data:', response.data);
			console.log('Save response.status:', response.status);

			// Check status 200 or success flags
			if (response.status === 200 || response.status === 201 || response.success || response.data?.success) {
				toast.success('Cập nhật phương pháp thành công', { position: 'top-right', autoClose: 3000 });
				// Update the protocol prop through callback
				if (onProtocolUpdate) {
					await onProtocolUpdate();
				}
				// Exit edit mode
				setIsEditMode(false);
			} else {
				toast.error(response.data?.error || response.message || 'Cập nhật thất bại', { position: 'top-right' });
			}
		} catch (error) {
			console.error('Error updating protocol:', error);
			toast.error('Đã xảy ra lỗi khi cập nhật', { position: 'top-right' });
		}
	};

	const handleViewFile = async (protocolId) => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/protocol/get-url', {
				protocolId,
			});

			if (response.data && response.data.url) {
				window.open(response.data.url, '_blank');
			} else {
				toast.error('Không tìm thấy URL file');
			}
		} catch (error) {
			console.error('Error fetching file URL:', error);
			toast.error('Không thể lấy URL file');
		}
	};

	const openReExtractModal = () => {
		setShowReExtractModal(true);
		setReExtractInstruction(protocol?.instruction || '');
	};

	const closeReExtractModal = () => {
		setShowReExtractModal(false);
		setReExtractFile(null);
		setReExtractInstruction('');
	};

	const handleReExtractFileSelect = (e) => {
		const file = e.target.files?.[0];
		if (file) {
			setReExtractFile(file);
		}
	};

	const handleReExtractFileDrop = (e) => {
		e.preventDefault();
		const file = e.dataTransfer.files?.[0];
		if (file) {
			setReExtractFile(file);
		}
	};

	const handleReExtract = async () => {
		// Create task in queue
		const taskId = addTask(
			'extract',
			protocol.id,
			protocol.protocolName || protocol.protocolCode,
			reExtractFile?.name || 'Existing file',
		);

		// Close modals immediately
		closeReExtractModal();
		onClose();

		// Process in background
		try {
			let fileUrl = protocol.url; // Use existing file URL by default

			// If a new file is provided, upload it first
			if (reExtractFile) {
				const uploadFormData = new FormData();
				uploadFormData.append('files', reExtractFile);

				const uploadResponse = await apiPostFormData('https://red.irdop.org/v1/protocol/upload/file', uploadFormData);

				if (!uploadResponse.data?.success || !uploadResponse.data?.url) {
					throw new Error('Upload file thất bại');
				}

				fileUrl = uploadResponse.data.url;
			}

			// Call extract API with the file URL (new or existing)
			const filteredProtocol = filterProtocolFields({
				...protocol,
				url: fileUrl,
				instruction: reExtractInstruction || protocol.instruction,
			});
			const extractResponse = await apiPost('https://red.irdop.org/v1/protocol/update?action=extract', {
				protocol: filteredProtocol,
			});

			if (extractResponse.data && extractResponse.data.success && extractResponse.data.data) {
				const extractedData = extractResponse.data.data;
				const updatedProtocol = {
					...protocol,
					...extractedData,
					id: protocol.id,
					url: fileUrl,
				};

				updateTask(taskId, {
					status: 'completed',
					data: updatedProtocol,
				});
				toast.success('Trích xuất hoàn tất! Click vào task để xem');

				// Refresh parent list
				if (onProtocolUpdate) {
					onProtocolUpdate();
				}
			} else {
				updateTask(taskId, {
					status: 'failed',
					error: extractResponse.data?.message || 'Trích xuất thất bại',
				});
				toast.error(extractResponse.data?.message || 'Trích xuất thất bại');
			}
		} catch (error) {
			console.error('Error re-extracting protocol:', error);
			updateTask(taskId, {
				status: 'failed',
				error: error.message || 'Đã xảy ra lỗi khi trích xuất',
			});
			toast.error('Đã xảy ra lỗi khi trích xuất');
		}
	};

	const formatFileSize = (bytes) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	};

	if (!isOpen || !protocol) return null;

	return createPortal(
		<>
			{/* Detail Modal */}
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
				<div className="bg-white rounded-lg w-[90vw] h-[95vh] overflow-hidden flex flex-col">
					{/* Modal Header */}
					<div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
						<h2 className="text-xl font-bold text-gray-800 text-left">Chi tiết Phương pháp</h2>
						<div className="flex items-center gap-2">
							{protocol.url && (
								<button
									onClick={() => handleViewFile(protocol.id)}
									className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
								>
									Xem File
								</button>
							)}
							<button
								onClick={openReExtractModal}
								className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
							>
								Trích xuất lại
							</button>
							<button
								onClick={toggleEditMode}
								className={`px-4 py-2 rounded font-medium transition-colors ${
									isEditMode
										? 'bg-gray-500 text-white hover:bg-gray-600'
										: 'bg-yellow-500 text-white hover:bg-yellow-600'
								}`}
							>
								{isEditMode ? 'Hủy' : 'Chỉnh sửa'}
							</button>
							{isEditMode && (
								<button
									onClick={handleSaveProtocol}
									className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 font-medium"
								>
									Lưu
								</button>
							)}
							<button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-2 py-1">
								✕
							</button>
						</div>
					</div>

					{/* Modal Content */}
					<div className="flex-1 overflow-y-auto p-6">
						<div className="space-y-6">
							{/* Document Protocol Code and Reference Document - Same Row */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2 text-left">Viện dẫn liên quan</label>
									{isEditMode ? (
										<textarea
											value={editedProtocol?.refDocument || ''}
											onChange={(e) => handleFieldChange('refDocument', e.target.value)}
											className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white"
											rows={3}
										/>
									) : (
										<div className="bg-gray-50 p-4 rounded-lg text-left">
											{protocol.refDocument ? (
												<div className="prose prose-sm max-w-none">
													<ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
														{renderMarkdown(protocol.refDocument)}
													</ReactMarkdown>
												</div>
											) : (
												<span className="text-gray-500">-</span>
											)}
										</div>
									)}
								</div>
							</div>

							{/* Document Title and Estimated Time - Same Row */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Tiêu đề Tài liệu</label>
									{isEditMode ? (
										<input
											type="text"
											value={editedProtocol?.docTitle || ''}
											onChange={(e) => handleFieldChange('docTitle', e.target.value)}
											className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white"
										/>
									) : (
										<div className="text-sm text-gray-900 bg-gray-50 p-2 rounded text-left">
											{protocol.docTitle || '-'}
										</div>
									)}
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Thời gian Ước tính</label>
									{isEditMode ? (
										<input
											type="text"
											value={editedProtocol?.estimatedTime || ''}
											onChange={(e) => handleFieldChange('estimatedTime', e.target.value)}
											className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white"
											placeholder="Ví dụ: 2 giờ"
										/>
									) : (
										<div className="text-sm text-gray-900 bg-gray-50 p-2 rounded text-left">
											{protocol.estimatedTime || '-'}
										</div>
									)}
								</div>
							</div>

							{/* Protocol Matrices */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2 text-left">Nền mẫu áp dụng</label>
								{isEditMode ? (
									<textarea
										value={
											Array.isArray(editedProtocol?.protocolMatrices)
												? editedProtocol.protocolMatrices.join('\n')
												: editedProtocol?.protocolMatrices || ''
										}
										onChange={(e) =>
											handleFieldChange(
												'protocolMatrices',
												e.target.value.split('\n').filter((item) => item.trim()),
											)
										}
										className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white"
										rows={3}
										placeholder="Nhập mỗi nền mẫu trên một dòng"
									/>
								) : (
									<div className="bg-gray-50 p-4 rounded-lg text-left">
										{Array.isArray(protocol.protocolMatrices) && protocol.protocolMatrices.length > 0 ? (
											<ul className="list-disc list-inside space-y-1">
												{protocol.protocolMatrices.map((matrix, index) => (
													<li key={index} className="text-gray-900">
														{matrix}
													</li>
												))}
											</ul>
										) : (
											<span className="text-gray-500">-</span>
										)}
									</div>
								)}
							</div>

							{/* Purpose */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2 text-left">
									Mục đích và phạm vi áp dụng
								</label>
								{isEditMode ? (
									<textarea
										value={editedProtocol?.purpose || ''}
										onChange={(e) => handleFieldChange('purpose', e.target.value)}
										className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white"
										rows={5}
									/>
								) : (
									<div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto text-left">
										{protocol.purpose ? (
											<div className="prose prose-sm max-w-none">
												<ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
													{renderMarkdown(protocol.purpose)}
												</ReactMarkdown>
											</div>
										) : (
											<span className="text-gray-500">-</span>
										)}
									</div>
								)}
							</div>

							{/* Equipment and Chemicals - Side by Side */}
							<div className="grid grid-cols-2 gap-4">
								{/* Equipment */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2 text-left">Thiết bị, dụng cụ</label>
									{isEditMode ? (
										<textarea
											value={
												Array.isArray(editedProtocol?.equipment)
													? editedProtocol.equipment
															.map((item) => (typeof item === 'object' ? JSON.stringify(item) : item))
															.join('\n')
													: ''
											}
											onChange={(e) => {
												const lines = e.target.value.split('\n').filter((line) => line.trim());
												const parsed = lines.map((line) => {
													try {
														return JSON.parse(line);
													} catch {
														return line;
													}
												});
												handleFieldChange('equipment', parsed);
											}}
											className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white"
											rows={8}
											placeholder="Nhập mỗi thiết bị trên một dòng (JSON hoặc text)"
										/>
									) : (
										<div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto text-left">
											{Array.isArray(protocol.equipment) && protocol.equipment.length > 0 ? (
												<table className="min-w-full text-xs border border-gray-200">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-2 py-1 border-b text-left font-medium">Tên thiết bị</th>
															<th className="px-2 py-1 border-b text-left font-medium">Thông số kỹ thuật</th>
															<th className="px-2 py-1 border-b text-left font-medium">Nhà sản xuất</th>
														</tr>
													</thead>
													<tbody>
														{protocol.equipment.map((item, index) => (
															<tr key={index} className="border-b border-gray-100">
																<td className="px-2 py-1">{item.equipmentName || 'N/A'}</td>
																<td className="px-2 py-1">{item.technicalSpecifications || '-'}</td>
																<td className="px-2 py-1">{item.manufacturer || '-'}</td>
															</tr>
														))}
													</tbody>
												</table>
											) : (
												<span className="text-gray-500">-</span>
											)}
										</div>
									)}
								</div>

								{/* Chemicals */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2 text-left">Hóa chất, thuốc thử</label>
									{isEditMode ? (
										<textarea
											value={
												Array.isArray(editedProtocol?.chemicals)
													? editedProtocol.chemicals
															.map((item) => (typeof item === 'object' ? JSON.stringify(item) : item))
															.join('\n')
													: ''
											}
											onChange={(e) => {
												const lines = e.target.value.split('\n').filter((line) => line.trim());
												const parsed = lines.map((line) => {
													try {
														return JSON.parse(line);
													} catch {
														return line;
													}
												});
												handleFieldChange('chemicals', parsed);
											}}
											className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white"
											rows={8}
											placeholder="Nhập mỗi hóa chất trên một dòng (JSON hoặc text)"
										/>
									) : (
										<div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto text-left">
											{Array.isArray(protocol.chemicals) && protocol.chemicals.length > 0 ? (
												<table className="min-w-full text-xs border border-gray-200">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-2 py-1 border-b text-left font-medium">Tên hóa chất</th>
															<th className="px-2 py-1 border-b text-left font-medium">Số lượng</th>
															<th className="px-2 py-1 border-b text-left font-medium">Độ tinh khiết</th>
														</tr>
													</thead>
													<tbody>
														{protocol.chemicals.map((item, index) => (
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
											) : (
												<span className="text-gray-500">-</span>
											)}
										</div>
									)}
								</div>
							</div>

							{/* Parameters - Standalone Section */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2 text-left">Danh sách chỉ tiêu</label>
								{isEditMode ? (
									<textarea
										value={
											Array.isArray(editedProtocol?.parameters)
												? editedProtocol.parameters
														.map((item) => (typeof item === 'object' ? JSON.stringify(item) : item))
														.join('\n')
												: ''
										}
										onChange={(e) => {
											const lines = e.target.value.split('\n').filter((line) => line.trim());
											const parsed = lines.map((line) => {
												try {
													return JSON.parse(line);
												} catch {
													return line;
												}
											});
											handleFieldChange('parameters', parsed);
										}}
										className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white"
										rows={8}
										placeholder="Nhập mỗi chỉ tiêu trên một dòng (JSON hoặc text)"
									/>
								) : (
									<div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto text-left">
										{Array.isArray(protocol.parameters) && protocol.parameters.length > 0 ? (
											<table className="min-w-full text-xs border border-gray-200">
												<thead className="bg-gray-50">
													<tr>
														<th className="px-2 py-1 border-b text-left font-medium">Tên chỉ tiêu</th>
														<th className="px-2 py-1 border-b text-left font-medium">Nền mẫu</th>
														<th className="px-2 py-1 border-b text-left font-medium">ID</th>
													</tr>
												</thead>
												<tbody>
													{protocol.parameters.map((item, index) => (
														<tr key={index} className="border-b border-gray-100">
															<td className="px-2 py-1">{item.parameterName || 'N/A'}</td>
															<td className="px-2 py-1">{item.matrix || '-'}</td>
															<td className="px-2 py-1">{item.parameterId || '-'}</td>
														</tr>
													))}
												</tbody>
											</table>
										) : (
											<span className="text-gray-500">-</span>
										)}
									</div>
								)}
							</div>

							{/* Tools */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2 text-left">Công cụ</label>
								{isEditMode ? (
									<textarea
										value={
											Array.isArray(editedProtocol?.tools)
												? editedProtocol.tools
														.map((item) => (typeof item === 'object' ? JSON.stringify(item) : item))
														.join('\n')
												: ''
										}
										onChange={(e) => {
											const lines = e.target.value.split('\n').filter((line) => line.trim());
											const parsed = lines.map((line) => {
												try {
													return JSON.parse(line);
												} catch {
													return line;
												}
											});
											handleFieldChange('tools', parsed);
										}}
										className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white"
										rows={4}
										placeholder="Nhập mỗi công cụ trên một dòng (JSON hoặc text)"
									/>
								) : (
									<div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto text-left">
										{Array.isArray(protocol.tools) && protocol.tools.length > 0 ? (
											<table className="min-w-full text-xs border border-gray-200">
												<thead className="bg-gray-50">
													<tr>
														<th className="px-2 py-1 border-b text-left font-medium">Tên dụng cụ</th>
														<th className="px-2 py-1 border-b text-left font-medium">Số lượng</th>
														<th className="px-2 py-1 border-b text-left font-medium">Vật liệu</th>
													</tr>
												</thead>
												<tbody>
													{protocol.tools.map((item, index) => (
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
										) : (
											<span className="text-gray-500">-</span>
										)}
									</div>
								)}
							</div>

							{/* Files - Temporarily hidden */}
							{/* <div>
								<label className="block text-sm font-medium text-gray-700 mb-2 text-left">Files</label>
								<div className="bg-gray-50 p-4 rounded-lg text-left">
									{Array.isArray(protocol.files) && protocol.files.length > 0 ? (
										<ul className="list-disc list-inside space-y-1">
											{protocol.files.map((file, index) => (
												<li key={index} className="text-gray-900">
													{typeof file === 'object' ? (
														<div>
															<strong>{file.name || file.filename || 'N/A'}</strong>
															{file.size && <span> - Kích thước: {formatFileSize(file.size)}</span>}
															{file.url && (
																<a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 ml-2">
																	Xem
																</a>
															)}
														</div>
													) : (
														file
													)}
												</li>
											))}
										</ul>
									) : (
										<span className="text-gray-500">-</span>
									)}
								</div>
							</div> */}

							{/* Tab Navigation */}
							<div>
								<div className="border-b border-gray-200 mb-4">
									<div className="flex gap-2">
										<button
											onClick={() => setActiveTab('detailedProcedure')}
											className={`px-4 py-2 font-medium transition-colors ${
												activeTab === 'detailedProcedure'
													? 'border-b-2 border-blue-500 text-blue-600'
													: 'text-gray-600 hover:text-gray-800'
											}`}
										>
											Chi tiết quy trình thực hiện
										</button>
										<button
											onClick={() => setActiveTab('dataProcessing')}
											className={`px-4 py-2 font-medium transition-colors ${
												activeTab === 'dataProcessing'
													? 'border-b-2 border-blue-500 text-blue-600'
													: 'text-gray-600 hover:text-gray-800'
											}`}
										>
											Xử lý số liệu và báo cáo
										</button>
									</div>
								</div>

								{/* Tab Content */}
								<div className="text-left">
									{activeTab === 'detailedProcedure' && (
										<div>
											{isEditMode ? (
												<textarea
													value={editedProtocol?.detailedProcedure || ''}
													onChange={(e) => handleFieldChange('detailedProcedure', e.target.value)}
													className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-left min-h-[400px] bg-white"
													rows={20}
												/>
											) : (
												<div className="bg-gray-50 p-4 rounded-lg text-left">
													{protocol.detailedProcedure ? (
														<div className="prose prose-sm max-w-none">
															<ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
																{renderMarkdown(protocol.detailedProcedure)}
															</ReactMarkdown>
														</div>
													) : (
														<span className="text-gray-500">-</span>
													)}
												</div>
											)}
										</div>
									)}

									{activeTab === 'dataProcessing' && (
										<div>
											{isEditMode ? (
												<textarea
													value={editedProtocol?.dataProcessing || ''}
													onChange={(e) => handleFieldChange('dataProcessing', e.target.value)}
													className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-left min-h-[400px] bg-white"
													rows={20}
												/>
											) : (
												<div className="bg-gray-50 p-4 rounded-lg text-left">
													{protocol.dataProcessing ? (
														<div className="prose prose-sm max-w-none">
															<ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
																{renderMarkdown(protocol.dataProcessing)}
															</ReactMarkdown>
														</div>
													) : (
														<span className="text-gray-500">-</span>
													)}
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Re-Extract Modal */}
			{showReExtractModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
					<div className="bg-white rounded-lg p-6 w-[700px] max-h-[85vh] overflow-y-auto">
						<h2 className="text-xl font-bold mb-4 text-left">Trích xuất lại Phương pháp</h2>

						{/* Info message */}
						<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
							<p className="text-sm text-blue-800">
								<strong>Lưu ý:</strong> Nếu không chọn file mới, hệ thống sẽ trích xuất lại từ file hiện tại với hướng
								dẫn mới.
							</p>
						</div>

						{/* Drag and Drop Area for Re-extract */}
						<div
							onDragOver={(e) => e.preventDefault()}
							onDrop={handleReExtractFileDrop}
							className="mb-4 p-8 border-2 border-dashed rounded-lg transition-colors border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"
						>
							<input
								ref={reExtractFileInputRef}
								type="file"
								onChange={handleReExtractFileSelect}
								className="hidden"
								accept=".pdf,.doc,.docx,.xls,.xlsx"
							/>
							<div className="text-center">
								<div className="text-4xl mb-2">📄</div>
								{reExtractFile ? (
									<div className="text-gray-800">
										<p className="font-medium">{reExtractFile.name}</p>
										<p className="text-sm text-gray-500 mt-1">{formatFileSize(reExtractFile.size)}</p>
										<button
											onClick={() => setReExtractFile(null)}
											className="text-red-500 hover:text-red-700 text-sm mt-2"
										>
											Xóa file
										</button>
									</div>
								) : (
									<>
										<p className="text-gray-600 mb-2">
											Kéo thả file vào đây hoặc{' '}
											<button
												onClick={() => reExtractFileInputRef.current?.click()}
												className="text-blue-500 hover:text-blue-700 underline"
											>
												chọn file
											</button>
										</p>
										<p className="text-sm text-gray-500">Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX</p>
									</>
								)}
							</div>
						</div>

						{/* Instruction Textarea */}
						<div className="mb-4">
							<label className="block text-sm font-medium text-gray-700 mb-2 text-left">Hướng dẫn trích xuất</label>
							<textarea
								value={reExtractInstruction}
								onChange={(e) => setReExtractInstruction(e.target.value)}
								className="w-full px-3 py-2 bg-white border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
								rows={10}
								placeholder="Nhập hướng dẫn trích xuất..."
							/>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-3 justify-end">
							<button
								onClick={closeReExtractModal}
								className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
							>
								Hủy
							</button>
							<button
								onClick={handleReExtract}
								className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
							>
								Trích xuất
							</button>
						</div>
					</div>
				</div>
			)}
		</>,
		document.body,
	);
};

export default ProtocolDetail;
