import React, { useEffect, useState } from 'react';
import { apiPost } from '../contexts/helperFunctionCallAPI';

const FileForm = ({ foreginKey, isVisible, onClose }) => {
	const [fileList, setFileList] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		if (!isVisible || !foreginKey) return;
		setLoading(true);
		apiPost('https://red.irdop.org/v1/file/get_by_key', { foreginKey })
			.then((res) => {
				if (res.status === 200 && Array.isArray(res.data)) {
					setFileList(res.data);
				} else {
					setFileList([]);
				}
			})
			.catch(() => setFileList([]))
			.finally(() => setLoading(false));
	}, [isVisible, foreginKey]);

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
				// Generate object name (could be a UUID or timestamp-based)
				const objectName = `${Date.now()}_${fileObj.fileName}`;

				// Get upload URL from API
				const uploadResponse = await apiPost('https://red.irdop.org/v1/file/upload_link', {
					fileRecord: {
						originInfo: {
							fileName: fileObj.fileName,
							mimeType: fileObj.mimeType,
							fileSize: fileObj.fileSize,
						},
						objectName,
						userTags: fileObj.fileCategory,
						foreignKeyUIDs: foreginKey,
					},
				});

				if (uploadResponse.status === 200 && uploadResponse.data?.url) {
					// Upload file buffer to the returned URL
					await fetch(uploadResponse.data.url, {
						method: 'PUT',
						body: fileObj.file,
						headers: {
							'Content-Type': fileObj.mimeType,
						},
					});
				}
			}

			// Refresh file list after successful upload
			setSelectedFiles([]);
			// Refresh the file list
			const refreshResponse = await apiPost('https://red.irdop.org/v1/file/get_by_key', { foreginKey });
			if (refreshResponse.status === 200 && Array.isArray(refreshResponse.data)) {
				setFileList(refreshResponse.data);
			}
		} catch (error) {
			console.error('Upload failed:', error);
		} finally {
			setUploading(false);
		}
	};

	const categoryOptions = ['Sample Img', 'Request Form', 'Order Form', 'LAB Report', 'Certificate Of Analysis'];

	// Filter files based on search term
	const filteredFileList = fileList.filter((file) => file.fileName?.toLowerCase().includes(searchTerm.toLowerCase()));

	// Handle click outside to close
	const handleOverlayClick = (e) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (!isVisible) return null;

	return (
		<div
			className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50"
			onClick={handleOverlayClick}
		>
			<div className="bg-white rounded-lg w-full max-w-4xl p-6 flex flex-col min-h-[600px]">
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
				<div className="flex-1 overflow-y-auto">
					<table className="min-w-full text-black border">
						<thead>
							<tr>
								<th className="py-2 px-2 border">File name</th>
								<th className="py-2 px-2 border">Type</th>
								<th className="py-2 px-2 border">Size</th>
								<th className="py-2 px-2 border">Date Modified</th>
								<th className="py-2 px-2 border">Category</th>
								<th className="py-2 px-2 border">Action</th>
							</tr>
						</thead>
						<tbody>
							{filteredFileList.length > 0 ? (
								filteredFileList.map((file, index) => (
									<tr key={index}>
										<td className="py-2 px-2 border">{file.fileName}</td>
										<td className="py-2 px-2 border">{file.mimeType}</td>
										<td className="py-2 px-2 border">{file.fileSize}</td>
										<td className="py-2 px-2 border">{file.dateModified}</td>
										<td className="py-2 px-2 border">{file.category}</td>
										<td className="py-2 px-2 border">
											<button className="text-blue-500 hover:text-blue-700">Download</button>
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

				{/* Selected files table */}
				{selectedFiles.length > 0 && (
					<div className="mt-4">
						<h3 className="text-lg font-semibold mb-2">Files to upload:</h3>
						<div className="max-h-60 overflow-y-auto">
							<table className="min-w-full text-black border">
								<thead>
									<tr>
										<th className="py-2 px-2 border">File Name</th>
										<th className="py-2 px-2 border">MIME Type</th>
										<th className="py-2 px-2 border">File Size</th>
										<th className="py-2 px-2 border">Category</th>
									</tr>
								</thead>
								<tbody>
									{selectedFiles.map((file, index) => (
										<tr key={index}>
											<td className="py-2 px-2 border">{file.fileName}</td>
											<td className="py-2 px-2 border">{file.mimeType}</td>
											<td className="py-2 px-2 border">{(file.fileSize / 1024).toFixed(2)} KB</td>
											<td className="py-2 px-2 border">
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
		</div>
	);
};

export default FileForm;
