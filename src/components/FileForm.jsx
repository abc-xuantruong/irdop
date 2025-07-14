import React, { useEffect, useState, useContext } from 'react';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import { FaEye, FaDownload, FaEdit, FaCheck, FaTimes, FaTrash, FaPlus, FaExternalLinkAlt } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { GlobalContext } from '../contexts/GlobalContext';

// Component FilePreview để hiển thị file trong popup
const FilePreview = ({ url, fileName, onClose, isVisible }) => {
	const getFileExtension = (filename) => {
		return filename?.split('.').pop()?.toLowerCase() || '';
	};

	const isImage = (filename) => {
		const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
		return imageExtensions.includes(getFileExtension(filename));
	};

	const isPdf = (filename) => {
		return getFileExtension(filename) === 'pdf';
	};

	const isVideo = (filename) => {
		const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
		return videoExtensions.includes(getFileExtension(filename));
	};

	const isAudio = (filename) => {
		const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
		return audioExtensions.includes(getFileExtension(filename));
	};

	const isText = (filename) => {
		const textExtensions = ['txt', 'csv', 'json', 'xml', 'log'];
		return textExtensions.includes(getFileExtension(filename));
	};

	if (!isVisible || !url) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60]" onClick={onClose}>
			<div
				className="bg-white rounded-lg max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex justify-between items-center p-4 border-b bg-gray-50">
					<h3 className="text-lg font-semibold text-black truncate max-w-[80%]">{fileName}</h3>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-xl font-bold min-w-[24px] h-6 flex items-center justify-center"
					>
						<FaTimes />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center min-h-[400px]">
					{isImage(fileName) && (
						<img
							src={url}
							alt={fileName}
							className="max-w-full max-h-full object-contain"
							style={{ maxHeight: '70vh', maxWidth: '90vw' }}
						/>
					)}

					{isPdf(fileName) && <iframe src={url} className="w-full h-[70vh] border-0" title={fileName} />}

					{isVideo(fileName) && (
						<video controls className="max-w-full max-h-full" style={{ maxHeight: '70vh', maxWidth: '90vw' }}>
							<source src={url} />
							Trình duyệt của bạn không hỗ trợ video.
						</video>
					)}

					{isAudio(fileName) && (
						<div className="p-8 text-center">
							<div className="mb-4">
								<i className="text-6xl text-gray-400">🎵</i>
							</div>
							<audio controls className="w-full max-w-md">
								<source src={url} />
								Trình duyệt của bạn không hỗ trợ audio.
							</audio>
						</div>
					)}

					{isText(fileName) && <iframe src={url} className="w-full h-[70vh] border-0 bg-white" title={fileName} />}

					{!isImage(fileName) && !isPdf(fileName) && !isVideo(fileName) && !isAudio(fileName) && !isText(fileName) && (
						<div className="p-8 text-center">
							<div className="mb-4">
								<i className="text-6xl text-gray-400">📄</i>
							</div>
							<p className="text-gray-600 mb-4">Không thể preview file này trong trình duyệt</p>
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-flex items-center gap-2"
							>
								<FaEye /> Mở trong tab mới
							</a>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t bg-gray-50 flex justify-end">
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2 inline-flex items-center gap-2"
					>
						<FaDownload /> Tải xuống
					</a>
					<button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
						Đóng
					</button>
				</div>
			</div>
		</div>
	);
};

const FileForm = ({ foreignKeyUIDs, localPath, objectPath, isVisible, onClose }) => {
	const { getIdenByUid, currentUser } = useContext(GlobalContext);
	const [fileList, setFileList] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [editingFile, setEditingFile] = useState(null);
	const [editData, setEditData] = useState({});
	const [addingForeignKey, setAddingForeignKey] = useState(null);
	const [newForeignKey, setNewForeignKey] = useState('');
	const [identityNames, setIdentityNames] = useState({});
	const [previewFile, setPreviewFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState('');

	// Function to fetch identity names for files without identityName
	const fetchIdentityNames = async (files) => {
		const filesToFetch = files.filter((file) => !file.identityName && file.identityUID);
		if (filesToFetch.length === 0) return;

		const newIdentityNames = { ...identityNames };

		for (const file of filesToFetch) {
			if (!newIdentityNames[file.identityUID]) {
				try {
					const identityData = await getIdenByUid(file.identityUID);
					if (identityData && identityData.identity_name) {
						newIdentityNames[file.identityUID] = identityData.identity_name;
					}
				} catch (error) {
					console.error('Error fetching identity for UID:', file.identityUID, error);
				}
			}
		}

		setIdentityNames(newIdentityNames);
	};

	// Add a helper function to check if user is an admin
	const isAdmin = () => {
		return currentUser?.role?.staff_admin;
	};

	useEffect(() => {
		if (!isVisible || !foreignKeyUIDs) return;
		setLoading(true);
		apiPost('https://red.irdop.org/v1/file/get_by_key', { foreignKeyUIDs: foreignKeyUIDs })
			.then((res) => {
				if (res.status === 200 && Array.isArray(res.data)) {
					setFileList(res.data);
				} else {
					setFileList([]);
				}
			})
			.catch(() => setFileList([]))
			.finally(() => setLoading(false));
	}, [isVisible, foreignKeyUIDs]);

	// Fetch identity names when fileList changes
	useEffect(() => {
		if (fileList.length > 0) {
			fetchIdentityNames(fileList);
		}
	}, [fileList]);

	const handleFileSelect = (event) => {
		const files = Array.from(event.target.files);
		const fileObjects = files.map((file) => ({
			file,
			fileName: file.name,
			mimeType: file.type,
			fileSize: file.size,
			fileCategory: [],
		}));
		setSelectedFiles(fileObjects);
	};

	const handleCategoryChange = (index, category, checked) => {
		setSelectedFiles((prev) =>
			prev.map((file, i) =>
				i === index
					? {
							...file,
							fileCategory: checked
								? [...file.fileCategory, category]
								: file.fileCategory.filter((cat) => cat !== category),
					  }
					: file,
			),
		);
	};

	const handleUploadConfirm = async () => {
		if (selectedFiles.length === 0) return;

		setUploading(true);
		try {
			for (const fileObj of selectedFiles) {
				// Build upload payload with only defined props
				const uploadPayload = {
					originInfo: {
						fileName: fileObj.fileName,
						mimeType: fileObj.mimeType,
						fileSize: fileObj.fileSize,
					},
					userTags: fileObj.fileCategory,
				};

				// Add optional props only if they exist
				if (localPath) uploadPayload.localPath = localPath;
				if (objectPath) uploadPayload.objectPath = objectPath;
				if (foreignKeyUIDs) uploadPayload.foreignKeyUIDs = foreignKeyUIDs;

				// Get upload URL from API
				const uploadResponse = await apiPost('https://red.irdop.org/v1/file/get/upload_link', uploadPayload);

				if (uploadResponse.status === 200 && uploadResponse.data) {
					// Extract id and url from response: {url, id}
					const { url, id } = uploadResponse.data;

					// Upload file buffer to the returned URL
					const fileUploadResponse = await fetch(url, {
						method: 'PUT',
						body: fileObj.file,
						headers: {
							'Content-Type': fileObj.mimeType,
						},
					});

					// If file upload successful, update object status to OK
					if (fileUploadResponse.status === 200 && id) {
						await apiPost('https://red.irdop.org/v1/file/update/file', {
							id: id,
							updateData: {
								objectStatus: 'OK',
							},
						});
					}
				}
			}

			// Refresh file list after successful upload
			setSelectedFiles([]);
			// Refresh the file list
			const refreshResponse = await apiPost('https://red.irdop.org/v1/file/get_by_key', {
				foreignKeyUIDs: foreignKeyUIDs,
			});
			if (refreshResponse.status === 200 && Array.isArray(refreshResponse.data)) {
				setFileList(refreshResponse.data);
			}
		} catch (error) {
			console.error('Upload failed:', error);
		} finally {
			setUploading(false);
		}
	};

	const categoryOptions = [
		'Ảnh mẫu',
		'Phiếu gửi mẫu',
		'Đơn hàng',
		'Biên bản kiểm nghiệm',
		'Phiếu phân tích',
		'Biên bản bàn giao',
		'Specification / COA',
	];

	const handleFileAction = async (fileRecord, mode) => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: mode,
				fileRecord: fileRecord,
			});

			if (response.status === 200 && response.data) {
				if (mode === 'view') {
					// Hiển thị preview trong popup
					setPreviewFile(fileRecord);
					setPreviewUrl(response.data);
				} else if (mode === 'download') {
					// Download file using blob
					const downloadResponse = await fetch(response.data);
					const blob = await downloadResponse.blob();
					const url = window.URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = fileRecord.originInfo?.fileName || 'download';
					document.body.appendChild(a);
					a.click();
					window.URL.revokeObjectURL(url);
					document.body.removeChild(a);
				}
			}
		} catch (error) {
			console.error(`${mode} failed:`, error);
		}
	};

	const handleClosePreview = () => {
		setPreviewFile(null);
		setPreviewUrl('');
	};

	const handleOpenInPopupWindow = async (fileRecord) => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: 'view',
				fileRecord: fileRecord,
			});

			if (response.status === 200 && response.data) {
				// Tạo cửa sổ popup với kích thước và vị trí tùy chỉnh
				const popupWindow = window.open(
					'',
					`file-preview-${fileRecord.id}`,
					'width=900,height=700,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,status=no',
				);

				if (popupWindow) {
					// Tạo HTML cho cửa sổ popup
					const fileName = fileRecord.originInfo?.fileName || 'Unknown';
					const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

					let contentHTML = '';

					// Xác định loại file và tạo nội dung phù hợp
					if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(fileExtension)) {
						contentHTML = `
							<div style="text-align: center; padding: 20px;">
								<img src="${response.data}" alt="${fileName}" style="max-width: 100%; max-height: 80vh; object-fit: contain;" />
							</div>
						`;
					} else if (fileExtension === 'pdf') {
						contentHTML = `
							<iframe src="${response.data}" style="width: 100%; height: 90vh; border: none;"></iframe>
						`;
					} else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(fileExtension)) {
						contentHTML = `
							<div style="text-align: center; padding: 20px;">
								<video controls style="max-width: 100%; max-height: 80vh;">
									<source src="${response.data}" />
									Trình duyệt của bạn không hỗ trợ video.
								</video>
							</div>
						`;
					} else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(fileExtension)) {
						contentHTML = `
							<div style="text-align: center; padding: 40px;">
								<h2>🎵 Audio File</h2>
								<audio controls style="width: 100%; max-width: 500px;">
									<source src="${response.data}" />
									Trình duyệt của bạn không hỗ trợ audio.
								</audio>
							</div>
						`;
					} else if (['txt', 'csv', 'json', 'xml', 'log'].includes(fileExtension)) {
						contentHTML = `
							<iframe src="${response.data}" style="width: 100%; height: 90vh; border: none;"></iframe>
						`;
					} else {
						contentHTML = `
							<div style="text-align: center; padding: 40px;">
								<h2>📄 File Preview</h2>
								<p>Không thể preview file này trong trình duyệt</p>
								<a href="${response.data}" target="_blank" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
									Mở trong tab mới
								</a>
							</div>
						`;
					}

					// Viết HTML vào cửa sổ popup
					popupWindow.document.write(`
						<!DOCTYPE html>
						<html lang="vi">
						<head>
							<meta charset="UTF-8">
							<meta name="viewport" content="width=device-width, initial-scale=1.0">
							<title>Preview: ${fileName}</title>
							<style>
								body {
									margin: 0;
									padding: 0;
									font-family: Arial, sans-serif;
									background-color: #f5f5f5;
								}
								.header {
									background: #333;
									color: white;
									padding: 10px 20px;
									display: flex;
									justify-content: space-between;
									align-items: center;
									position: sticky;
									top: 0;
									z-index: 1000;
								}
								.header h1 {
									margin: 0;
									font-size: 16px;
									flex: 1;
									overflow: hidden;
									text-overflow: ellipsis;
									white-space: nowrap;
								}
								.header-buttons {
									display: flex;
									gap: 10px;
								}
								.btn {
									background: #007bff;
									color: white;
									border: none;
									padding: 8px 12px;
									border-radius: 4px;
									cursor: pointer;
									text-decoration: none;
									font-size: 12px;
								}
								.btn:hover {
									background: #0056b3;
								}
								.btn-download {
									background: #28a745;
								}
								.btn-download:hover {
									background: #1e7e34;
								}
								.btn-close {
									background: #dc3545;
								}
								.btn-close:hover {
									background: #c82333;
								}
								.content {
									height: calc(100vh - 60px);
									overflow: auto;
								}
							</style>
						</head>
						<body>
							<div class="header">
								<h1>📄 ${fileName}</h1>
								<div class="header-buttons">
									<a href="${response.data}" target="_blank" class="btn btn-download">⬇️ Tải xuống</a>
									<button onclick="window.close()" class="btn btn-close">✕ Đóng</button>
								</div>
							</div>
							<div class="content">
								${contentHTML}
							</div>
						</body>
						</html>
					`);
					popupWindow.document.close();
				} else {
					alert('Không thể mở cửa sổ popup. Vui lòng kiểm tra cài đặt trình duyệt.');
				}
			}
		} catch (error) {
			console.error('Popup window failed:', error);
		}
	};

	const handleAddForeignKey = (fileId) => {
		if (!newForeignKey.trim()) return;

		// Update temporary edit data only
		const updatedForeignKeys = [...(editData.foreignKeyUIDs || []), newForeignKey.trim()];
		setEditData({
			...editData,
			foreignKeyUIDs: updatedForeignKeys,
		});
		setAddingForeignKey(null);
		setNewForeignKey('');
	};

	const handleRemoveForeignKey = (fileId, keyToRemove) => {
		// Update temporary edit data only
		const updatedForeignKeys = (editData.foreignKeyUIDs || []).filter((key) => key !== keyToRemove);
		setEditData({
			...editData,
			foreignKeyUIDs: updatedForeignKeys,
		});
	};

	const handleUpdateFile = async (fileId) => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/update/file', {
				id: fileId,
				updateData: {
					originInfo: editData.originInfo,
					userTags: editData.userTags,
					foreignKeyUIDs: editData.foreignKeyUIDs,
				},
			});

			if (response.status === 200) {
				// Refresh file list after successful update
				const refreshResponse = await apiPost('https://red.irdop.org/v1/file/get_by_key', {
					foreignKeyUIDs: foreignKeyUIDs,
				});
				if (refreshResponse.status === 200 && Array.isArray(refreshResponse.data)) {
					setFileList(refreshResponse.data);
				}
				setEditingFile(null);
				setEditData({});
				setAddingForeignKey(null);
				setNewForeignKey('');
			}
		} catch (error) {
			console.error('Update failed:', error);
		}
	};

	const handleEditStart = (file) => {
		setEditingFile(file.id);
		setEditData({
			originInfo: {
				fileName: file.originInfo?.fileName || '',
				mimeType: file.originInfo?.mimeType || '',
				fileSize: file.originInfo?.fileSize || 0,
			},
			userTags: file.userTags || [],
			foreignKeyUIDs: file.foreignKeyUIDs || [],
		});
	};

	const handleEditCancel = () => {
		setEditingFile(null);
		setEditData({});
		setAddingForeignKey(null);
		setNewForeignKey('');
	};

	const handleDeleteFile = async (file) => {
		try {
			const result = await Swal.fire({
				title: 'Xác nhận xóa file',
				text: `Bạn có chắc chắn muốn xóa file "${file.originInfo?.fileName}"?`,
				icon: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#d33',
				cancelButtonColor: '#3085d6',
				confirmButtonText: 'Xóa',
				cancelButtonText: 'Hủy',
			});

			if (result.isConfirmed) {
				const response = await apiPost('https://red.irdop.org/v1/file/update/file', {
					id: file.id,
					updateData: {
						deletedAt: new Date().toISOString(),
					},
				});

				if (response.status === 200) {
					// Remove file from current list instead of refreshing
					setFileList((prevList) => prevList.filter((f) => f.id !== file.id));

					Swal.fire('Đã xóa!', 'File đã được xóa thành công.', 'success');
				} else {
					Swal.fire('Lỗi!', 'Không thể xóa file.', 'error');
				}
			}
		} catch (error) {
			console.error('Delete failed:', error);
			Swal.fire('Lỗi!', 'Có lỗi xảy ra khi xóa file.', 'error');
		}
	};

	// Filter files based on search term
	const filteredFileList = fileList.filter((file) =>
		file.originInfo?.fileName?.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	// Handle click outside to close
	const handleOverlayClick = (e) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (!isVisible) return null;

	return (
		<div
			className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4"
			onClick={handleOverlayClick}
		>
			<div className="bg-white rounded-lg w-[90vw] h-[90vh] min-w-[400px] p-6 flex flex-col overflow-hidden">
				<h2 className="text-xl font-semibold mb-4">Quản lý File</h2>
				{/* Search bar */}
				<div className="mb-4">
					<input
						type="text"
						placeholder="Tìm kiếm file theo tên..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full border rounded p-2 bg-white"
					/>
				</div>
				{/* File list table */}
				<div className="flex-1 overflow-auto">
					<div className="min-w-[800px]">
						<table className="w-full text-black border">
							<thead>
								<tr>
									<th className="py-2 px-2 border text-left">Tên file</th>
									<th className="py-2 px-2 border text-left w-[250px] max-w-[250px]">Khóa liên kết</th>
									<th className="py-2 px-2 border text-left">Người tạo</th>
									<th className="py-2 px-2 border text-left">Kích thước</th>
									<th className="py-2 px-2 border text-left">Ngày sửa đổi</th>
									<th className="py-2 px-2 border text-left">Danh mục</th>
									<th className="py-2 px-2 border text-left min-w-[180px] w-[180px]">Thao tác</th>
								</tr>
							</thead>
							<tbody>
								{filteredFileList.length > 0 ? (
									filteredFileList.map((file, index) => (
										<tr key={index}>
											<td className="py-2 px-2 border text-left">
												{editingFile === file.id ? (
													<input
														type="text"
														value={editData.originInfo.fileName}
														onChange={(e) =>
															setEditData({
																...editData,
																originInfo: {
																	...editData.originInfo,
																	fileName: e.target.value,
																},
															})
														}
														className="w-full border rounded px-2 py-1 bg-white"
													/>
												) : (
													file.originInfo?.fileName
												)}
											</td>
											<td className="py-2 px-2 border text-left w-[250px] max-w-[250px]">
												{editingFile === file.id ? (
													<div className="space-y-1">
														{/* Display existing foreign keys */}
														<div className="flex flex-wrap gap-1">
															{(editData.foreignKeyUIDs || []).map((key, keyIndex) => (
																<div key={keyIndex} className="relative group">
																	<span className="bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded pr-4 relative">
																		{key}
																		<button
																			onClick={() => handleRemoveForeignKey(file.id, key)}
																			className="absolute top-0 right-0 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs w-3 h-3 flex items-center justify-center"
																			style={{ fontSize: '8px' }}
																		>
																			×
																		</button>
																	</span>
																</div>
															))}
														</div>
														{/* Add new foreign key */}
														{addingForeignKey === file.id ? (
															<div className="flex items-center gap-1 w-full">
																<input
																	type="text"
																	value={newForeignKey}
																	onChange={(e) => setNewForeignKey(e.target.value)}
																	placeholder="Enter UID"
																	className="flex-1 min-w-0 border rounded px-1 py-0.5 text-xs bg-white"
																/>
																<button
																	onClick={() => handleAddForeignKey(file.id)}
																	className="text-green-600 hover:text-green-800 flex-shrink-0 p-1 rounded"
																>
																	<FaCheck size={10} />
																</button>
																<button
																	onClick={() => {
																		setAddingForeignKey(null);
																		setNewForeignKey('');
																	}}
																	className="text-red-600 hover:text-red-800 flex-shrink-0 p-1 rounded"
																>
																	<FaTimes size={10} />
																</button>
															</div>
														) : (
															<button
																onClick={() => setAddingForeignKey(file.id)}
																className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
															>
																<FaPlus size={8} /> Thêm UID
															</button>
														)}
													</div>
												) : (
													<div className="flex flex-wrap gap-1">
														{(file.foreignKeyUIDs || []).length > 0 ? (
															file.foreignKeyUIDs.map((key, keyIndex) => (
																<span
																	key={keyIndex}
																	className="bg-gray-100 text-gray-800 text-xs px-1 py-0.5 rounded truncate"
																>
																	{key}
																</span>
															))
														) : (
															<span className="text-gray-400 text-xs">Không có UID</span>
														)}
													</div>
												)}
											</td>
											<td className="py-2 px-2 border text-left">
												{file.identityName || identityNames[file.identityUID] || '-'}
											</td>
											<td className="py-2 px-2 border text-left">{(file.originInfo?.fileSize / 1024).toFixed(2)} KB</td>
											<td className="py-2 px-2 border text-left">{new Date(file.createdAt).toLocaleDateString()}</td>
											<td className="py-2 px-2 border text-left">
												{editingFile === file.id ? (
													<div className="flex flex-wrap gap-1">
														{categoryOptions.map((category) => (
															<label key={category} className="flex items-center text-xs">
																<input
																	type="checkbox"
																	checked={editData.userTags.includes(category)}
																	onChange={(e) => {
																		if (e.target.checked) {
																			setEditData({ ...editData, userTags: [...editData.userTags, category] });
																		} else {
																			setEditData({
																				...editData,
																				userTags: editData.userTags.filter((tag) => tag !== category),
																			});
																		}
																	}}
																	className="mr-1"
																/>
																{category}
															</label>
														))}
													</div>
												) : (
													file.userTags?.join(', ')
												)}
											</td>
											<td className="py-2 px-2 border text-left min-w-[180px] w-[180px]">
												<div className="flex space-x-1 flex-wrap">
													{editingFile === file.id ? (
														<>
															<button
																className="text-green-500 hover:text-green-700 text-lg px-2 py-1"
																onClick={() => handleUpdateFile(file.id)}
																title="Confirm"
															>
																<FaCheck />
															</button>
															<button
																className="text-gray-500 hover:text-gray-700 text-lg px-2 py-1"
																onClick={handleEditCancel}
																title="Cancel"
															>
																<FaTimes />
															</button>
														</>
													) : (
														<>
															<button
																className="text-blue-500 hover:text-blue-700 text-lg px-1 py-1"
																onClick={() => handleFileAction(file, 'view')}
																title="View trong popup"
															>
																<FaEye />
															</button>
															<button
																className="text-purple-500 hover:text-purple-700 text-lg px-1 py-1"
																onClick={() => handleOpenInPopupWindow(file)}
																title="Mở trong cửa sổ mới"
															>
																<FaExternalLinkAlt />
															</button>
															<button
																className="text-green-500 hover:text-green-700 text-lg px-1 py-1"
																onClick={() => handleFileAction(file, 'download')}
																title="Download"
															>
																<FaDownload />
															</button>
															{isAdmin() && (
																<button
																	className="text-orange-500 hover:text-orange-700 text-lg px-1 py-1"
																	onClick={() => handleEditStart(file)}
																	title="Update"
																>
																	<FaEdit />
																</button>
															)}
															{isAdmin() && (
																<button
																	className="text-red-500 hover:text-red-700 text-lg px-1 py-1"
																	onClick={() => handleDeleteFile(file)}
																	title="Delete"
																>
																	<FaTrash />
																</button>
															)}
														</>
													)}
												</div>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={6} className="text-center py-8 text-gray-400">
											{loading ? 'Đang tải...' : searchTerm ? 'Không tìm thấy file phù hợp' : 'Chưa có dữ liệu'}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Selected files table */}
				{selectedFiles.length > 0 && (
					<div className="mt-4">
						<h3 className="text-lg font-semibold mb-2">File chuẩn bị tải lên:</h3>
						<div className="max-h-60 overflow-y-auto">
							<div className="min-w-[800px]">
								<table className="w-full text-black border">
									<thead>
										<tr>
											<th className="py-2 px-2 border text-left">Tên file</th>
											<th className="py-2 px-2 border text-left">Loại MIME</th>
											<th className="py-2 px-2 border text-left">Kích thước file</th>
											<th className="py-2 px-2 border text-left">Danh mục</th>
										</tr>
									</thead>
									<tbody>
										{selectedFiles.map((file, index) => (
											<tr key={index}>
												<td className="py-2 px-2 border text-left">{file.fileName}</td>
												<td className="py-2 px-2 border text-left">{file.mimeType}</td>
												<td className="py-2 px-2 border text-left">{(file.fileSize / 1024).toFixed(2)} KB</td>
												<td className="py-2 px-2 border text-left">
													<div className="flex flex-wrap gap-1">
														{categoryOptions.map((category) => (
															<label key={category} className="flex items-center text-xs">
																<input
																	type="checkbox"
																	checked={file.fileCategory.includes(category)}
																	onChange={(e) => handleCategoryChange(index, category, e.target.checked)}
																	className="mr-1"
																/>
																{category}
															</label>
														))}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				)}

				{/* Bottom action bar */}
				<div className="flex justify-between items-center mt-6">
					<div className="flex items-center space-x-2">
						<input type="file" multiple onChange={handleFileSelect} style={{ display: 'none' }} id="file-upload" />
						<label htmlFor="file-upload" className="bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer">
							Upload File
						</label>
						{selectedFiles.length > 0 && (
							<button
								className="bg-green-500 text-white px-4 py-2 rounded-lg"
								onClick={handleUploadConfirm}
								disabled={uploading}
							>
								{uploading ? 'Uploading...' : 'Xác nhận'}
							</button>
						)}
					</div>
					<button className="bg-gray-500 text-white px-4 py-2 rounded-lg" onClick={onClose}>
						Đóng
					</button>
				</div>
			</div>

			{/* File Preview Popup */}
			<FilePreview
				url={previewUrl}
				fileName={previewFile?.originInfo?.fileName}
				isVisible={!!previewFile}
				onClose={handleClosePreview}
			/>
		</div>
	);
};

export default FileForm;
