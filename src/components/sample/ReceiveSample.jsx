import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, BrowserCodeReader } from '@zxing/browser';
import { apiGet, apiPost } from '../../contexts/helperFunctionCallAPI';

const ReceiveSample = () => {
	// Danh sách và lựa chọn camera
	const [videoDevices, setVideoDevices] = useState([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState('');
	const [scanResult, setScanResult] = useState('');
	const [samples, setSamples] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [expandedSample, setExpandedSample] = useState(null);
	const [isScanning, setIsScanning] = useState(false);
	const [justDetected, setJustDetected] = useState(false);
	const [draggedSample, setDraggedSample] = useState(null);
	const [dragOffset, setDragOffset] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartX, setDragStartX] = useState(0);
	const videoRef = useRef(null);
	const readerRef = useRef(null);

	// Cleanup on unmount: stop video stream instead of reset reader
	useEffect(() => {
		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				const stream = videoRef.current.srcObject;
				stream.getTracks().forEach((track) => track.stop());
				videoRef.current.srcObject = null;
			}
		};
	}, []);
	// Lấy danh sách camera và chọn mặc định
	useEffect(() => {
		BrowserCodeReader.listVideoInputDevices()
			.then((devices) => {
				setVideoDevices(devices);
				// chọn camera sau (back) nếu có
				const backCamera = devices.find((d) => /back|rear|environment/i.test(d.label));
				setSelectedDeviceId((backCamera || devices[0] || {}).deviceId || '');
			})
			.catch(console.error);
	}, []);

	const startScanner = async () => {
		if (!selectedDeviceId) {
			alert('Không có camera để quét');
			return;
		}
		// Hiển thị video trước, sau đó mới khởi chạy decode
		setIsScanning(true);
		setTimeout(async () => {
			try {
				const reader = new BrowserMultiFormatReader();
				readerRef.current = reader;

				let hasDetected = false; // Flag để tránh detect nhiều lần

				reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, async (result, err) => {
					if (result && !hasDetected) {
						hasDetected = true; // Đặt flag để không xử lý lần nữa

						console.log('Barcode quét được:', result.getText());
						setScanResult(result.getText());
						setJustDetected(true);
						setIsScanning(false);

						// Ngay lập tức clear video để không còn frame cũ
						if (videoRef.current && videoRef.current.srcObject) {
							const stream = videoRef.current.srcObject;
							stream.getTracks().forEach((track) => track.stop());
							videoRef.current.srcObject = null;
							// Force clear video display
							videoRef.current.load();
						}

						readerRef.current = null;

						// Gọi API để lấy thông tin sample
						console.log('Trước khi gọi fetchSampleDetail');
						await fetchSampleDetail(result.getText());
						console.log('Sau khi gọi fetchSampleDetail');

						setTimeout(() => setJustDetected(false), 2000);
					} else if (err && !(err instanceof Error) && err.name !== 'NotFoundException') {
						console.error('Scan error:', err);
					}
				});
			} catch (error) {
				console.error('Error starting scanner:', error);
				setIsScanning(false);
				alert('Lỗi khi khởi động scanner: ' + error.message);
			}
		}, 300);
	};

	const fetchSampleDetail = async (sampleId) => {
		try {
			console.log('Đang gọi API với sampleId:', sampleId);
			const response = await apiGet(`https://black.irdop.org/v1/sample/detail/get/${sampleId}`);

			console.log('Dữ liệu trả về từ API:', response);

			// Kiểm tra xem sample đã tồn tại trong danh sách chưa
			const existingSample = samples.find((s) => s.id === response.data.id);
			if (!existingSample) {
				// Thêm sample mới vào đầu danh sách
				setSamples((prevSamples) => [response.data, ...prevSamples]);
				console.log('Đã thêm sample mới vào danh sách');
			} else {
				console.log('Sample đã tồn tại trong danh sách');
			}
		} catch (error) {
			console.error('Lỗi khi lấy thông tin sample:', error);
			alert(`Không thể lấy thông tin sample ${sampleId}: ${error.message}`);
		}
	};

	const handleScanClick = () => {
		if (isScanning) {
			setIsScanning(false);
			// Stop video stream manually
			if (videoRef.current && videoRef.current.srcObject) {
				const stream = videoRef.current.srcObject;
				stream.getTracks().forEach((track) => track.stop());
				videoRef.current.srcObject = null;
			}
			// Clear reader ref
			if (readerRef.current) {
				readerRef.current = null;
			}
		} else {
			setScanResult('');
			setJustDetected(false);
			// Clear video element để tránh hiển thị frame cũ
			if (videoRef.current) {
				videoRef.current.srcObject = null;
			}
			startScanner();
		}
	};

	const toggleSampleExpansion = (sampleId) => {
		setExpandedSample(expandedSample === sampleId ? null : sampleId);
	};

	const handlePrevious = () => {
		if (currentPage > 1) {
			setCurrentPage(currentPage - 1);
		}
	};

	const handleNext = () => {
		setCurrentPage(currentPage + 1);
	};

	const handleBack = () => {
		setCurrentPage(1);
	};

	const handleDragStart = (e, sampleId) => {
		e.preventDefault();
		setDraggedSample(sampleId);
		setIsDragging(true);
		const startX = e.touches ? e.touches[0].clientX : e.clientX;
		setDragStartX(startX);
		setDragOffset(0);
	};

	const handleDragMove = (e, sampleId) => {
		if (draggedSample !== sampleId || !isDragging) return;
		e.preventDefault();
		const currentX = e.touches ? e.touches[0].clientX : e.clientX;
		const offsetX = currentX - dragStartX;
		// Chỉ cho phép kéo sang trái và có độ nhạy cao hơn
		setDragOffset(Math.min(0, offsetX));
	};

	const handleDragEnd = (sampleId) => {
		if (draggedSample === sampleId && dragOffset < -80) {
			// Xóa sample nếu kéo hơn 80px sang trái
			setSamples((prevSamples) => prevSamples.filter((s) => s.id !== sampleId));
		}
		setDraggedSample(null);
		setDragOffset(0);
		setIsDragging(false);
		setDragStartX(0);
	};

	const deleteSample = (sampleId) => {
		setSamples((prevSamples) => prevSamples.filter((s) => s.id !== sampleId));
	};

	return (
		<div className="min-h-screen bg-gray-50 p-2">
			<div className="">
				{/* Chọn thiết bị camera */}
				{videoDevices.length > 0 && (
					<div className="mb-4 flex items-center">
						<label className="mr-2 font-medium text-gray-700">Chọn camera:</label>
						<select
							className="px-2 py-1 border rounded bg-white"
							value={selectedDeviceId}
							onChange={(e) => setSelectedDeviceId(e.target.value)}
						>
							{videoDevices.map((dev) => (
								<option key={dev.deviceId} value={dev.deviceId}>
									{dev.label || dev.deviceId}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Camera Section */}
				<div className="bg-gray-300 rounded-lg h-60 flex items-center justify-center mb-6 p-1 relative overflow-hidden">
					{isScanning ? (
						<video ref={videoRef} className="w-full h-full rounded-lg object-cover" autoPlay playsInline muted />
					) : (
						<div className="text-gray-600 text-center">
							{scanResult ? (
								<div>
									<p className="mb-2 text-green-600 font-semibold">✓ Đã quét thành công!</p>
									<p className="mb-2">Nhấn "Tiếp tục quét" để quét barcode khác</p>
								</div>
							) : (
								<p className="mb-2">Nhấn "Bắt đầu quét" để bắt đầu quét barcode</p>
							)}
							<div className="space-y-2">
								<button
									onClick={handleScanClick}
									className="bg-white px-4 py-2 rounded-full text-gray-600 font-medium shadow-md hover:shadow-lg transition-shadow mr-2"
								>
									{scanResult ? 'Tiếp tục quét' : 'Bắt đầu quét'}
								</button>
							</div>
						</div>
					)}

					{/* Scan overlay */}
					{isScanning && (
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							<div className="w-[90%] h-[80%] border-2 border-red-500 rounded-lg flex flex-col items-center justify-center">
								<div className="text-white text-center text-sm bg-black bg-opacity-50 rounded px-2 py-1 mb-2">
									Đưa barcode vào khung quét
								</div>
								<div className="text-white text-center text-xs bg-black bg-opacity-50 rounded px-2 py-1">
									Sẽ tự động dừng khi phát hiện barcode
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Current Scan Result */}
				<div className="mb-6">
					<h2 className="text-gray-500 font-medium mb-2 text-left">Kết quả quét hiện tại</h2>
					{scanResult ? (
						<div
							className={`bg-white p-2 rounded-lg border-2 transition-all duration-500 ${
								justDetected ? 'border-green-500 bg-green-50 shadow-lg' : 'border-gray-200'
							}`}
						>
							<span className={`text-left block font-semibold ${justDetected ? 'text-green-700' : 'text-gray-800'}`}>
								{justDetected && '✓ '}
								{scanResult}
							</span>
						</div>
					) : (
						<div className="bg-gray-100 p-2 rounded-lg border">
							<span className="text-gray-500 text-left block">Chưa có kết quả quét</span>
						</div>
					)}
				</div>

				{/* Sample Table */}
				<div className=" rounded-lg overflow-hidden mb-6">
					{/* Table Header */}
					<div
						className="grid grid-cols-3 p-2 font-medium text-gray-700 text-sm"
						style={{ gridTemplateColumns: '100px 1fr 60px' }}
					>
						<div className="text-left">Mã mẫu</div>
						<div className="text-left">Tên mẫu</div>
						<div className="text-left">Chỉ tiêu</div>
					</div>

					{/* Table Rows */}
					<div className="">
						{samples.map((sample, index) => (
							<div
								key={sample.id}
								className="mt-2 rounded-md shadow-sm hover:shadow-md transition-all border border-gray-200 relative overflow-hidden"
							>
								{/* Sample Row */}
								<div
									className={`grid grid-cols-3 p-2 cursor-pointer hover:bg-gray-50 text-sm rounded-md select-none ${
										index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
									} ${expandedSample === sample.id ? 'bg-blue-50' : ''} ${
										draggedSample === sample.id ? 'z-10 shadow-lg' : ''
									} ${isDragging && draggedSample === sample.id ? '' : 'transition-all duration-200'}`}
									style={{
										gridTemplateColumns: '100px 1fr 60px',
										transform: draggedSample === sample.id ? `translateX(${dragOffset}px)` : 'translateX(0)',
										opacity: draggedSample === sample.id && dragOffset < -40 ? 0.8 : 1,
										backgroundColor: draggedSample === sample.id && dragOffset < -40 ? '#fef2f2' : '',
									}}
									onClick={(e) => {
										if (!isDragging) toggleSampleExpansion(sample.id);
									}}
									onMouseDown={(e) => handleDragStart(e, sample.id)}
									onMouseMove={(e) => handleDragMove(e, sample.id)}
									onMouseUp={() => handleDragEnd(sample.id)}
									onMouseLeave={() => handleDragEnd(sample.id)}
									onTouchStart={(e) => handleDragStart(e, sample.id)}
									onTouchMove={(e) => handleDragMove(e, sample.id)}
									onTouchEnd={() => handleDragEnd(sample.id)}
								>
									<div className="text-gray-800 text-left">{sample.id}</div>
									<div className="text-gray-800 text-left">{sample.sampleName}</div>
									<div className="text-gray-800 text-left flex items-center">
										{sample.analyses.length}
										<span className="ml-2 text-gray-400">{expandedSample === sample.id ? '▼' : '▶'}</span>
									</div>
								</div>

								{/* Delete indicator */}
								{draggedSample === sample.id && dragOffset < -40 && (
									<div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-500 text-2xl font-bold animate-bounce">
										🗑️
									</div>
								)}

								{/* Drag hint */}
								{draggedSample === sample.id && dragOffset < -20 && dragOffset >= -40 && (
									<div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
										← Kéo để xóa
									</div>
								)}

								{/* Expanded Analyses */}
								{expandedSample === sample.id && (
									<div className="bg-gray-50 px-2 rounded-md">
										{sample.analyses.map((analysis, analysisIndex) => (
											<div
												key={analysis.id}
												className="grid grid-cols-3 p-2 text-sm border-t border-gray-200 last:border-b-0"
												style={{ gridTemplateColumns: '80px 1fr 120px' }}
											>
												<div className="text-gray-700 text-left">{analysis.id}</div>
												<div className="text-gray-700 text-left">{analysis.parameterName}</div>
												<div className="text-gray-700 text-left">{analysis.protocolCode}</div>
											</div>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Fixed Buttons */}
			<div className="fixed z-50 bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
				<button
					onClick={handleBack}
					className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
				>
					&lt;&lt;&lt;
				</button>

				<button
					onClick={handleScanClick}
					className={`px-4 py-2 rounded transition-colors w-40 ${
						isScanning
							? 'bg-orange-500 text-white hover:bg-orange-600'
							: scanResult
							? 'bg-green-500 text-white hover:bg-green-600'
							: 'bg-blue-500 text-white hover:bg-blue-600'
					}`}
				>
					{isScanning ? 'Quét lại' : scanResult ? 'Tiếp tục quét' : 'Bắt đầu quét'}
				</button>

				<button
					onClick={handleNext}
					className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
				>
					&gt;&gt;&gt;
				</button>
			</div>
		</div>
	);
};

export default ReceiveSample;
