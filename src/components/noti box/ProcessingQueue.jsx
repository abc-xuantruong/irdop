import * as React from 'react';
import { useTaskQueue } from '../../contexts/TaskQueueContext';
import { toast } from 'react-toastify';

const ProcessingQueue = () => {
	const { taskQueue, queueMinimized, removeTask, clearAllTasks, toggleMinimize } = useTaskQueue();

	const handleTaskClick = (task) => {
		console.log('🖱️ Task clicked:', task);
		console.log('📊 Task status:', task.status);
		console.log('📝 Task type:', task.type);
		console.log('💾 Task data:', task.data);
		console.log('🔍 Source component:', task.sourceComponent);

		if (task.status === 'completed' && task.data && task.type === 'extract') {
			console.log('✅ Task is completed extract with data');

			if (task.sourceComponent === 'file') {
				console.log('📁 Processing file source component');
				// Format data để match với FileInfor expectations
				// FileInfor expects: [{fileName: "...", data: [{fileRecord, docCopy}]}]
				const formattedData = [
					{
						fileName: task.protocolName || task.fileName || 'Unknown',
						data: task.data, // task.data should be [{fileRecord, docCopy}]
					},
				];

				// Lưu vào localStorage để FileInfor component đọc
				const storageData = {
					data: formattedData,
					timestamp: Date.now(),
				};

				localStorage.setItem('extractedFileData', JSON.stringify(storageData));
				console.log('💾 Saved to localStorage extractedFileData:', storageData);

				// Trigger custom event để notify component
				console.log('📢 Dispatching fileDataExtracted event');
				window.dispatchEvent(new CustomEvent('fileDataExtracted'));
				toast.success('Đã mở dữ liệu trích xuất');
			} else {
				console.log('📋 Processing protocol source component');
				// Lưu vào localStorage để ProtocolInfor component đọc
				const storageData = {
					data: task.data,
					timestamp: Date.now(),
				};

				localStorage.setItem('extractedProtocolData', JSON.stringify(storageData));
				console.log('💾 Saved to localStorage extractedProtocolData:', storageData);

				// Trigger custom event để notify component
				console.log('📢 Dispatching protocolDataExtracted event');
				window.dispatchEvent(new CustomEvent('protocolDataExtracted'));
				toast.success('Đã mở dữ liệu trích xuất');
			}
		} else if (task.status === 'failed') {
			console.log('❌ Task failed');
			toast.error(task.error || 'Tác vụ thất bại');
		} else {
			console.log('⚠️ Task not eligible for click action');
			console.log('  - Status:', task.status);
			console.log('  - Type:', task.type);
			console.log('  - Has data:', !!task.data);
		}
	};

	if (taskQueue.length === 0) {
		return null;
	}

	return (
		<>
			{queueMinimized ? (
				<div className="fixed top-2 right-2 z-[100]">
					<button
						onClick={toggleMinimize}
						className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg shadow-2xl hover:shadow-xl transition-all flex items-center gap-2 group"
						title="Mở rộng hàng đợi"
					>
						<div className="flex items-center gap-2">
							{taskQueue.some((t) => t.status === 'processing') && (
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
							)}
							<span className="font-semibold">({taskQueue.length})</span>
						</div>
						<svg
							className="w-4 h-4 transform group-hover:scale-110 transition-transform"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>
			) : (
				<div className="fixed top-2 right-2 z-[100] w-80 max-h-[70vh] overflow-hidden bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
					<div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
						<div className="flex items-center gap-2">
							<span className="font-semibold">Hàng đợi ({taskQueue.length})</span>
						</div>
						<div className="flex items-center gap-2 text-black">
							<button onClick={toggleMinimize} className="hover:text-gray-700 text-lg p-2" title="Thu gọn">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
								</svg>
							</button>
							<button
								onClick={clearAllTasks}
								className="hover:text-red-600 text-xl px-2 pt-0.5 pb-1.5 font-bold"
								title="Xóa tất cả"
							>
								&times;
							</button>
						</div>
					</div>
					<div className="divide-y divide-gray-200 overflow-y-auto flex-1">
						{taskQueue.map((task) => (
							<div
								key={task.id}
								onClick={() => handleTaskClick(task)}
								className={
									'p-4 transition-colors ' +
									(task.status === 'completed' && task.type === 'extract'
										? 'hover:bg-green-50 cursor-pointer'
										: task.status === 'failed'
										? 'hover:bg-red-50 cursor-pointer'
										: 'bg-blue-50')
								}
							>
								<div className="flex items-start gap-3">
									<div className="flex-shrink-0 mt-1">
										{task.status === 'processing' && (
											<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
										)}
										{task.status === 'completed' && (
											<div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
												<span className="text-white text-xs">✓</span>
											</div>
										)}
										{task.status === 'failed' && (
											<div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
												<span className="text-white text-xs">✕</span>
											</div>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2 mb-1">
											<span className="text-xs font-medium text-gray-500 uppercase">
												{task.type === 'extract' ? 'Trích xuất' : 'Upload'}
											</span>
											<button
												onClick={(e) => {
													e.stopPropagation();
													removeTask(task.id);
												}}
												className="text-gray-400 hover:text-gray-600 text-sm"
												title="Xóa"
											></button>
										</div>
										<p
											className="text-sm font-medium text-gray-900 truncate"
											title={task.protocolName || task.fileName}
										>
											{task.protocolName || task.fileName || 'Protocol ' + task.protocolId}
										</p>
										<div className="flex items-center justify-between mt-2">
											<span
												className={
													'text-xs px-2 py-1 rounded-full ' +
													(task.status === 'processing'
														? 'bg-blue-100 text-blue-700'
														: task.status === 'completed'
														? 'bg-green-100 text-green-700'
														: 'bg-red-100 text-red-700')
												}
											>
												{task.status === 'processing'
													? 'Đang xử lý...'
													: task.status === 'completed'
													? 'Hoàn thành'
													: 'Thất bại'}
											</span>
											<span className="text-xs text-gray-500">
												{task.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
											</span>
										</div>
										{task.status === 'completed' && task.type === 'extract' && (
											<p className="text-xs text-green-600 mt-1 italic">Click để xem chi tiết</p>
										)}
										{task.status === 'failed' && task.error && (
											<p className="text-xs text-red-600 mt-1">{task.error}</p>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</>
	);
};

export default ProcessingQueue;
