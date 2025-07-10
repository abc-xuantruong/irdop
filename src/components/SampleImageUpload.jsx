import React, { useState, useEffect } from 'react';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import { FaUpload, FaCamera, FaImage } from 'react-icons/fa';

const SampleImageUpload = ({ receiptID, receiptUid, onUploadSuccess }) => {
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	// Detect if user is on mobile device
	useEffect(() => {
		const checkMobile = () => {
			const userAgent = navigator.userAgent || navigator.vendor || window.opera;
			return /android|iPad|iPhone|iPod|blackberry|iemobile|opera mini/i.test(userAgent) || window.innerWidth <= 768;
		};
		setIsMobile(checkMobile());
	}, []);

	const handleFileSelect = (event) => {
		const file = event.target.files[0];
		if (file && file.type.startsWith('image/')) {
			setSelectedFile(file);

			// Tạo preview URL
			const reader = new FileReader();
			reader.onload = (e) => {
				setPreviewUrl(e.target.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleConfirm = async () => {
		if (!selectedFile) return;

		setIsUploading(true);
		try {
			// 1. Build upload payload
			const uploadPayload = {
				originInfo: {
					fileName: selectedFile.name,
					mimeType: selectedFile.type,
					fileSize: selectedFile.size,
				},
				userTags: ['Ảnh mẫu'],
				objectPath: 'activities/LAB',
				foreignKeyUIDs: [receiptUid],
			};

			// 2. Get upload URL from API (tương tự FileForm.jsx)
			const uploadResponse = await apiPost('https://red.irdop.org/v1/file/get/upload_link', uploadPayload);

			if (uploadResponse.status === 200 && uploadResponse.data) {
				// Extract id and url from response: {url, id}
				const { url, id } = uploadResponse.data;

				// 3. Upload file buffer to the returned URL
				const fileUploadResponse = await fetch(url, {
					method: 'PUT',
					body: selectedFile,
					headers: {
						'Content-Type': selectedFile.type,
					},
				});

				// 4. If file upload successful, update object status to OK
				if (fileUploadResponse.status === 200 && id) {
					await apiPost('https://red.irdop.org/v1/file/update/file', {
						id: id,
						updateData: {
							objectStatus: 'OK',
						},
					}); // 5. Update Receipt với sample_img_uid
					const receiptUpdateResponse = await apiPost('https://black.irdop.org/khsi19me/db/update/receipt', {
						receipt: {
							id: receiptID,
							receipt_uid: receiptUid,
							sample_img_uid: id,
						},
					});

					// Gọi callback khi upload thành công
					if (onUploadSuccess) {
						onUploadSuccess(id);
					}

					// Reset state
					setSelectedFile(null);
					setPreviewUrl(null);
				} else {
					throw new Error('File upload failed');
				}
			} else {
				throw new Error('Get upload link failed');
			}
		} catch (error) {
			console.error('Error uploading sample image:', error);
			alert('Có lỗi xảy ra khi upload ảnh mẫu');
		} finally {
			setIsUploading(false);
		}
	};

	const handleCancel = () => {
		setSelectedFile(null);
		setPreviewUrl(null);
	};

	if (previewUrl) {
		return (
			<div className="sample-image-upload">
				<div className="preview-container inline-block border border-gray-300 rounded-lg overflow-hidden">
					<img src={previewUrl} alt="Preview" className="block max-w-xs max-h-48 object-contain" />
				</div>
				<div className="action-buttons mt-3 flex gap-2">
					<button
						onClick={handleConfirm}
						disabled={isUploading}
						className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
					>
						{isUploading ? 'Đang upload...' : 'Xác nhận'}
					</button>
					<button
						onClick={handleCancel}
						disabled={isUploading}
						className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
					>
						Hủy bỏ
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="sample-image-upload">
			{isMobile ? (
				// Mobile interface with camera and gallery options
				<div className="flex gap-2">
					{/* Camera capture input */}
					<div>
						<input
							type="file"
							accept="image/*"
							capture="environment"
							onChange={handleFileSelect}
							className="hidden"
							id="sample-image-camera"
						/>
						<label
							htmlFor="sample-image-camera"
							className="mb-1 font-medium text-sm text-left flex items-center gap-1 cursor-pointer hover:text-blue-800 text-blue-600 mt-2 border border-slate-600 border-dashed px-1 py-2 rounded"
							title="Chụp ảnh"
						>
							<FaCamera size={12} /> Chụp ảnh
						</label>
					</div>

					{/* Gallery selection input */}
					<div>
						<input
							type="file"
							accept="image/*"
							onChange={handleFileSelect}
							className="hidden"
							id="sample-image-gallery"
						/>
						<label
							htmlFor="sample-image-gallery"
							className="mb-1 font-medium text-sm text-left flex items-center gap-1 cursor-pointer hover:text-green-800 text-green-600 mt-2 border border-slate-600 border-dashed px-1 py-2 rounded"
							title="Chọn từ thư viện"
						>
							<FaImage size={12} /> Thư viện
						</label>
					</div>
				</div>
			) : (
				// Desktop interface
				<div>
					<input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="sample-image-input" />
					<label
						htmlFor="sample-image-input"
						className="mb-1 font-medium text-sm text-left flex items-center gap-1 cursor-pointer hover:text-blue-800 text-blue-600 mt-2 border border-slate-600 border-dashed px-1 py-2 w-28 rounded"
						title="Tải lên ảnh mẫu"
					>
						Tải ảnh mẫu <FaUpload size={12} />
					</label>
				</div>
			)}
		</div>
	);
};

export default SampleImageUpload;
