import React, { useState, useEffect, useRef } from 'react';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import { FaUpload, FaCamera, FaImage, FaChevronDown } from 'react-icons/fa';

const SampleImageUpload = ({ receiptID, receiptUid, onUploadSuccess }) => {
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [showOptions, setShowOptions] = useState(false);
	const [isCameraOpen, setIsCameraOpen] = useState(false);
	const [stream, setStream] = useState(null);
	const [capturedPhoto, setCapturedPhoto] = useState(null);
	const [availableCameras, setAvailableCameras] = useState([]);
	const [selectedCamera, setSelectedCamera] = useState('');
	const [showCameraSelector, setShowCameraSelector] = useState(false);
	const [useIPWebcam, setUseIPWebcam] = useState(false);
	const [ipWebcamUrl, setIpWebcamUrl] = useState('192.168.1.186:8080');
	const [ipCapturedImage, setIpCapturedImage] = useState('');
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const dropdownRef = useRef(null);

	// Detect if user is on mobile device
	useEffect(() => {
		const checkMobile = () => {
			const userAgent = navigator.userAgent || navigator.vendor || window.opera;
			return /android|iPad|iPhone|iPod|blackberry|iemobile|opera mini/i.test(userAgent) || window.innerWidth <= 768;
		};
		setIsMobile(checkMobile());
	}, []);

	// Get available cameras
	useEffect(() => {
		const getCameras = async () => {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const videoDevices = devices.filter((device) => device.kind === 'videoinput');
				setAvailableCameras(videoDevices);
				// Set first camera as default
				if (videoDevices.length > 0) {
					setSelectedCamera(videoDevices[0].deviceId);
				}
			} catch (error) {
				console.error('Error getting cameras:', error);
			}
		};

		getCameras();
	}, []);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowOptions(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Cleanup camera stream when component unmounts
	useEffect(() => {
		return () => {
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
			}
		};
	}, [stream]);

	const handleFileSelect = (event) => {
		const file = event.target.files[0];
		if (file && file.type.startsWith('image/')) {
			setSelectedFile(file);
			setShowOptions(false); // Close dropdown after selection

			// Tạo preview URL
			const reader = new FileReader();
			reader.onload = (e) => {
				setPreviewUrl(e.target.result);
			};
			reader.readAsDataURL(file);
		}
	};

	// Open camera function
	const openCamera = async (deviceId = selectedCamera) => {
		setUseIPWebcam(false); // Ensure IP webcam mode is off
		try {
			const constraints = {
				video: {
					width: { ideal: 3840, min: 1920 }, // Request 4K resolution (3840x2160)
					height: { ideal: 2160, min: 1080 },
					facingMode: isMobile ? 'environment' : undefined,
					deviceId: deviceId ? { exact: deviceId } : undefined,
					focusMode: 'continuous',
				},
			};

			const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
			setStream(mediaStream);
			setIsCameraOpen(true);
			setShowOptions(false); // Close dropdown
			setShowCameraSelector(false); // Close camera selector

			// Wait for video element to be ready
			setTimeout(() => {
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;
				}
			}, 100);
		} catch (error) {
			console.error('Error accessing camera:', error);
			alert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera.');
		}
	};

	// Open IP Webcam function
	const openIPWebcam = () => {
		setUseIPWebcam(true);
		setIsCameraOpen(true);
		setShowOptions(false); // Close dropdown
		setShowCameraSelector(false); // Close camera selector
		// Clear any existing streams
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			setStream(null);
		}
	};

	// Close camera function
	const closeCamera = () => {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}
		setStream(null);
		setIsCameraOpen(false);
		setCapturedPhoto(null);
		setShowCameraSelector(false);
		setUseIPWebcam(false);
		setIpCapturedImage('');
	};

	// Capture photo function
	const capturePhoto = () => {
		if (useIPWebcam) {
			// Capture from IP Webcam
			captureFromIPWebcam();
		} else if (videoRef.current && canvasRef.current) {
			// Capture from local camera
			const canvas = canvasRef.current;
			const video = videoRef.current;
			const context = canvas.getContext('2d');

			// Set canvas size to video's actual dimensions for higher quality (up to 2K)
			canvas.width = video.videoWidth || 2560;
			canvas.height = video.videoHeight || 1440;

			// Draw image with high quality
			context.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Convert canvas to blob with highest quality
			canvas.toBlob(
				(blob) => {
					if (blob) {
						// Create a file-like object from blob
						const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
						setSelectedFile(file);

						// Create preview URL from canvas with highest quality
						const dataUrl = canvas.toDataURL('image/jpeg', 0.98); // Maximum quality 98%
						setCapturedPhoto(dataUrl);
						setPreviewUrl(dataUrl);
					}
				},
				'image/jpeg',
				0.98,
			); // Maximum quality 98%
		}
	};

	// Capture from IP Webcam function
	const captureFromIPWebcam = async () => {
		try {
			const url = `http://${ipWebcamUrl}/shot.jpg`;
			const timestamp = new Date().getTime();
			const imageUrl = `${url}?${timestamp}`; // Add timestamp to avoid cache

			// Fetch the image as blob
			const response = await fetch(imageUrl);
			if (response.ok) {
				const blob = await response.blob();
				const file = new File([blob], 'ip-webcam-capture.jpg', { type: 'image/jpeg' });
				setSelectedFile(file);

				// Create preview URL
				const reader = new FileReader();
				reader.onload = (e) => {
					const dataUrl = e.target.result;
					setIpCapturedImage(dataUrl);
					setCapturedPhoto(dataUrl);
					setPreviewUrl(dataUrl);
				};
				reader.readAsDataURL(blob);
			} else {
				throw new Error('Failed to capture image from IP Webcam');
			}
		} catch (error) {
			console.error('Error capturing from IP Webcam:', error);
			alert('Không thể chụp ảnh từ IP Webcam. Vui lòng kiểm tra kết nối.');
		}
	};

	// Retake photo function
	const retakePhoto = () => {
		setCapturedPhoto(null);
		setPreviewUrl(null);
		setSelectedFile(null);
		setIpCapturedImage('');
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
					});

					// 5. Update Receipt với deprecated_sampleImageId
					const receiptUpdateResponse = await apiPost('https://red.irdop.org/v1/receipt/edit', {
						receipt: {
							id: receiptID,
							receipt_uid: receiptUid,
							deprecated_sampleImageId: id,
						},
					});

					// Gọi callback khi upload thành công
					if (onUploadSuccess) {
						onUploadSuccess(id);
					}

					// Reset state
					setSelectedFile(null);
					setPreviewUrl(null);
					setCapturedPhoto(null);
					closeCamera();
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
		setCapturedPhoto(null);
		setShowCameraSelector(false);
		setIpCapturedImage('');
		closeCamera();
	};

	if (previewUrl && !isCameraOpen) {
		return (
			<div className="sample-image-upload">
				<div className="preview-container inline-block border border-gray-300 rounded-lg overflow-hidden">
					<img src={previewUrl} alt="Preview" className="block max-w-xs max-h-48 object-contain" />
				</div>
				<div className="action-buttons mt-3 flex gap-2">
					{capturedPhoto && !isUploading && (
						<button
							onClick={retakePhoto}
							className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm font-medium"
						>
							Chụp lại
						</button>
					)}
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

	// Camera interface
	if (isCameraOpen) {
		return (
			<>
				{/* Overlay background */}
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="sample-image-upload bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
						{/* Header */}
						<div className="p-4 border-b border-gray-200 flex justify-between items-center">
							<h3 className="text-lg font-semibold text-gray-900">Chụp ảnh mẫu</h3>
							<button onClick={closeCamera} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
								×
							</button>
						</div>

						{/* Camera selector for desktop */}
						{!isMobile && !useIPWebcam && availableCameras.length > 1 && (
							<div className="camera-selector p-4 border-b border-gray-200">
								<label className="block text-sm font-medium text-gray-700 mb-2">Chọn camera:</label>
								<select
									value={selectedCamera}
									onChange={(e) => {
										setSelectedCamera(e.target.value);
										// Switch camera immediately
										if (stream) {
											stream.getTracks().forEach((track) => track.stop());
										}
										openCamera(e.target.value);
									}}
									className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
								>
									{availableCameras.map((camera, index) => (
										<option key={camera.deviceId} value={camera.deviceId}>
											{camera.label || `Camera ${index + 1}`}
										</option>
									))}
								</select>
							</div>
						)}

						{/* IP Webcam URL input */}
						{useIPWebcam && (
							<div className="ip-webcam-config p-4 border-b border-gray-200">
								<label className="block text-sm font-medium text-gray-700 mb-2">IP Webcam URL:</label>
								<input
									type="text"
									value={ipWebcamUrl}
									onChange={(e) => setIpWebcamUrl(e.target.value)}
									placeholder="192.168.1.186:8080"
									className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p className="text-xs text-gray-500 mt-1">Định dạng: địa_chỉ_ip:cổng (ví dụ: 192.168.1.186:8080)</p>
							</div>
						)}

						{/* Camera container */}
						<div className="p-4">
							{/* Show preview if photo is captured */}
							{capturedPhoto ? (
								<div className="captured-photo-container">
									<div className="preview-container inline-block border border-gray-300 rounded-lg overflow-hidden mb-4">
										<img
											src={capturedPhoto}
											alt="Captured photo"
											className="block w-full max-h-[60vh] object-contain"
										/>
									</div>
									<div className="action-buttons flex gap-3 justify-center">
										<button
											onClick={retakePhoto}
											className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
										>
											Chụp lại
										</button>
										<button
											onClick={handleConfirm}
											disabled={isUploading}
											className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
										>
											{isUploading ? 'Đang upload...' : 'Xác nhận'}
										</button>
										<button
											onClick={handleCancel}
											disabled={isUploading}
											className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
										>
											Hủy bỏ
										</button>
									</div>
								</div>
							) : (
								/* Live camera view */
								<div className="camera-container bg-black rounded-lg overflow-hidden">
									{useIPWebcam ? (
										/* IP Webcam live stream */
										<div className="ip-webcam-container">
											<h4 className="text-white text-center p-2 bg-gray-700">Live Camera Stream - IP Webcam</h4>
											<img
												src={`http://${ipWebcamUrl}/video`}
												alt="Live IP Webcam Stream"
												className="w-full h-auto"
												style={{ maxHeight: '60vh' }}
												onError={() =>
													alert('Không thể kết nối đến IP Webcam. Vui lòng kiểm tra địa chỉ IP và kết nối mạng.')
												}
											/>
										</div>
									) : (
										/* Local camera stream */
										<video
											ref={videoRef}
											autoPlay
											playsInline
											className="w-full h-auto"
											style={{ maxHeight: '65vh' }}
										/>
									)}
									<canvas ref={canvasRef} className="hidden" />
									<div className="camera-controls p-4 bg-gray-800 flex justify-center gap-3">
										<button
											onClick={capturePhoto}
											className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-sm font-medium flex items-center gap-2"
										>
											<FaCamera size={16} />
											Chụp ảnh
										</button>
										<button
											onClick={closeCamera}
											className="px-6 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 text-sm font-medium"
										>
											Đóng camera
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</>
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

					{/* IP Webcam option */}
					<div>
						<button
							onClick={openIPWebcam}
							className="mb-1 font-medium text-sm text-left flex items-center gap-1 cursor-pointer hover:text-purple-800 text-purple-600 mt-2 border border-slate-600 border-dashed px-1 py-2 rounded"
							title="IP Webcam"
						>
							<FaCamera size={12} /> IP Webcam
						</button>
					</div>
				</div>
			) : (
				// Desktop interface with dropdown
				<div className="relative" ref={dropdownRef}>
					<button
						onClick={() => setShowOptions(!showOptions)}
						className="mb-1 font-medium text-sm text-left flex items-center gap-1 cursor-pointer hover:text-blue-800 text-blue-600 mt-2 border border-slate-600 border-dashed px-2 py-2 w-32 rounded justify-between"
						title="Tải lên ảnh mẫu"
					>
						Tải ảnh mẫu
						<FaChevronDown size={10} className={`transition-transform ${showOptions ? 'rotate-180' : ''}`} />
					</button>

					{showOptions && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[140px]">
							{/* Camera option with sub-menu for multiple cameras */}
							{availableCameras.length > 1 ? (
								<div className="relative">
									<button
										onClick={() => setShowCameraSelector(!showCameraSelector)}
										className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 justify-between text-blue-600"
									>
										<div className="flex items-center gap-2">
											<FaCamera size={12} />
											Chụp từ camera
										</div>
										<FaChevronDown
											size={8}
											className={`transition-transform ${showCameraSelector ? 'rotate-180' : ''}`}
										/>
									</button>

									{showCameraSelector && (
										<div className="absolute left-full top-0 ml-1 bg-white border border-gray-300 rounded-lg shadow-lg min-w-[180px]">
											{availableCameras.map((camera, index) => (
												<button
													key={camera.deviceId}
													onClick={() => {
														setSelectedCamera(camera.deviceId);
														openCamera(camera.deviceId);
													}}
													className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-blue-600"
												>
													{camera.label || `Camera ${index + 1}`}
												</button>
											))}
										</div>
									)}
								</div>
							) : (
								<button
									onClick={() => openCamera()}
									className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-blue-600"
								>
									<FaCamera size={12} />
									Chụp từ camera
								</button>
							)}

							<hr className="border-gray-200" />
							{/* IP Webcam option */}
							<button
								onClick={openIPWebcam}
								className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-purple-600"
							>
								<FaCamera size={12} />
								IP Webcam
							</button>

							<hr className="border-gray-200" />
							<label
								htmlFor="sample-image-input"
								className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer text-green-600"
							>
								<FaImage size={12} />
								Chọn từ thư mục
							</label>
						</div>
					)}

					{/* Hidden file input */}
					<input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="sample-image-input" />
				</div>
			)}
		</div>
	);
};

export default SampleImageUpload;
