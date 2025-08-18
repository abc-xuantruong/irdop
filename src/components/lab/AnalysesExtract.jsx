import React, { useState, useEffect } from 'react';
import { apiPost } from '../../contexts/helperFunctionCallAPI';

const AnalysesExtract = ({ document, showAnalysisExtractInstead = false, editId = null, onClose = null }) => {
	// Show auto-hide message function
	const showAutoHideMessage = (message, type = 'info') => {
		// Remove existing message if any
		const existingMessage = globalThis.document.getElementById('autoHideMessage');
		if (existingMessage) {
			existingMessage.remove();
		}

		// Create message element
		const messageDiv = globalThis.document.createElement('div');
		messageDiv.id = 'autoHideMessage';
		messageDiv.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 12px 20px;
			border-radius: 6px;
			color: white;
			font-weight: 500;
			z-index: 10000;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			opacity: 0;
			transform: translateX(100%);
			transition: all 0.3s ease;
		`;

		// Set background color based on type
		switch (type) {
			case 'success':
				messageDiv.style.background = '#10b981';
				break;
			case 'error':
				messageDiv.style.background = '#ef4444';
				break;
			case 'warning':
				messageDiv.style.background = '#f59e0b';
				break;
			default:
				messageDiv.style.background = '#3b82f6';
		}

		messageDiv.textContent = message;
		globalThis.document.body.appendChild(messageDiv);

		// Animate in
		setTimeout(() => {
			messageDiv.style.opacity = '1';
			messageDiv.style.transform = 'translateX(0)';
		}, 100);

		// Auto hide after 3 seconds
		setTimeout(() => {
			messageDiv.style.opacity = '0';
			messageDiv.style.transform = 'translateX(100%)';
			setTimeout(() => {
				if (messageDiv.parentNode) {
					messageDiv.remove();
				}
			}, 300);
		}, 3000);
	};

	// Show analysis data popup with simplified logic for extracted data comparison
	const showAnalysisDataPopupFromExtract = async (doc) => {
		if (!doc || !doc.metadata || !doc.metadata.extractData || !doc.metadata.extractData.analyses) {
			showAutoHideMessage('Không có dữ liệu chỉ tiêu để hiển thị', 'warning');
			return;
		}

		// 1. Lấy dữ liệu trích xuất
		const extractedAnalyses = doc.metadata.extractData.analyses;
		const analysisIds = extractedAnalyses.map(a => a.id).filter(id => id);

		// 2. Gọi API lấy matchAnalysis
		let matchAnalysis = [];
		try {
			showAutoHideMessage('Đang tải dữ liệu đối chiếu...', 'info');
			const res = await apiPost('https://red.irdop.org/v1/lab/analysis/match/by_id', { ids: analysisIds });
			if (res.status === 200 && res.data) {
				if (Array.isArray(res.data)) {
					matchAnalysis = res.data;
				} else if (res.data.result && Array.isArray(res.data.result)) {
					matchAnalysis = res.data.result;
					console.log('Match analysis loaded:', matchAnalysis);
				}
			}
			showAutoHideMessage('Tải dữ liệu đối chiếu thành công!', 'success');
		} catch (err) {
			console.error('Error loading match analysis:', err);
			showAutoHideMessage('Lỗi khi tải dữ liệu đối chiếu: ' + err.message, 'error');
		}

		// 3. Hàm xác định khác biệt, gán các key ...Diff
		function getAnalysisDifferences(extracted, matched) {
			if (!matched) return extracted;
			const diffObj = { ...extracted };
			
			// Chỉ so sánh parameterName và protocolCode
			const fieldsToCompare = ['parameterName', 'protocolCode'];
			fieldsToCompare.forEach(field => {
				if (extracted[field] !== matched[field]) {
					diffObj[field + 'Diff'] = matched[field];
				}
			});
			
			return diffObj;
		}

		// 4. Gộp dữ liệu trích xuất với các trường ...Diff nếu có
		const mergedAnalyses = extractedAnalyses.map(extract => {
			const matched = matchAnalysis.find(m => m.id === parseInt(extract.id));
			console.log('matched:', matched);
			console.log('extract:', extract);
			return getAnalysisDifferences(extract, matched);
		});

		// 5. State hiển thị khác biệt
		let showDifferences = false;

		// 6. Tạo popup
		const existingPopup = globalThis.document.getElementById('analysisDataPopupOverlay');
		if (existingPopup) existingPopup.remove();

		const overlay = globalThis.document.createElement('div');
		overlay.id = 'analysisDataPopupOverlay';
		overlay.className = 'fixed inset-0 bg-black bg-opacity-80 z-[10000] flex items-center justify-center';

		const popup = globalThis.document.createElement('div');
		popup.className = 'bg-white rounded-lg w-[80vw] h-[90vh] flex flex-col shadow-2xl overflow-hidden';

		// Header
		const header = globalThis.document.createElement('div');
		header.className = 'p-2 border-b border-gray-200 flex justify-between items-center bg-gray-50';

		const title = globalThis.document.createElement('h3');
		title.textContent = 'Nhập kết quả thử nghiệm';
		title.className = 'm-0 text-lg font-semibold text-gray-700';

		const closeBtn = globalThis.document.createElement('button');
		closeBtn.textContent = '✕';
		closeBtn.className =
			'px-3 py-2 bg-red-500 hover:bg-red-600 text-white border-0 rounded-md cursor-pointer font-bold text-base transition-colors duration-200';
		closeBtn.onclick = () => {
			overlay.remove();
			// Remove any remaining popup overlays
			const remainingPopups = globalThis.document.querySelectorAll('#analysisDataPopupOverlay');
			remainingPopups.forEach(popup => popup.remove());
			// Call onClose callback if provided
			if (onClose) onClose();
		};

		// Nút hiển thị khác biệt
		const showDiffBtn = globalThis.document.createElement('button');
		showDiffBtn.textContent = 'Hiển thị dữ liệu khác biệt';
		showDiffBtn.className = 'px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white border-0 rounded-md cursor-pointer font-bold text-xs transition-colors duration-200';

		// CSS cho difference indicators
		const style = globalThis.document.createElement('style');
		style.textContent = `
			.difference-indicator {
				color: #ff6b6b;
				font-weight: bold;
				cursor: pointer;
				margin-right: 6px;
				background-color: #fff3cd;
				border: 1px solid #ffc107;
				padding: 2px 4px;
				border-radius: 3px;
				display: inline-block;
				position: relative;
			}
			
			.difference-indicator:hover {
				background-color: #ffecb3;
				border-color: #ff9800;
			}
			
			.difference-indicator .tooltip {
				visibility: hidden;
				background-color: #fff3cd;
				border: 2px solid #ffc107;
				color: #856404;
				text-align: left;
				border-radius: 6px;
				padding: 8px 12px;
				position: absolute;
				z-index: 10001;
				bottom: 125%;
				left: 50%;
				margin-left: -100px;
				width: 200px;
				box-shadow: 0 4px 8px rgba(0,0,0,0.2);
				font-size: 11px;
				line-height: 1.3;
			}
			
			.difference-indicator .tooltip::after {
				content: "";
				position: absolute;
				top: 100%;
				left: 50%;
				margin-left: -5px;
				border-width: 5px;
				border-style: solid;
				border-color: #ffc107 transparent transparent transparent;
			}
			
			.difference-indicator:hover .tooltip {
				visibility: visible;
			}
			
			.difference-tag {
				background-color: #fff3cd;
				border: 2px solid #ffc107;
				border-radius: 4px;
				padding: 4px 8px;
				margin-top: 4px;
				font-size: 0.75rem;
				color: #856404;
				display: block;
				width: 100%;
				box-sizing: border-box;
				word-wrap: break-word;
				white-space: normal;
				overflow-wrap: break-word;
				hyphens: auto;
			}
		`;
		globalThis.document.head.appendChild(style);

		// Main content
		const mainContent = globalThis.document.createElement('div');
		mainContent.className = 'flex-1 overflow-auto p-4';

		// Hàm render bảng
		function renderTable() {
			mainContent.innerHTML = `
				<div class="overflow-auto">
					<table class="w-full border-collapse border border-gray-300 text-xs">
						<thead>
							<tr class="bg-gray-100">
								<th class="border border-gray-300 p-2">ID</th>
								<th class="border border-gray-300 p-2">Mã mẫu</th>
								<th class="border border-gray-300 p-2">Tên mẫu</th>
								<th class="border border-gray-300 p-2">Chỉ tiêu</th>
								<th class="border border-gray-300 p-2">Mã phương pháp</th>
								<th class="border border-gray-300 p-2">Kết quả</th>
								<th class="border border-gray-300 p-2">Đơn vị</th>
							</tr>
						</thead>
						<tbody>
							${mergedAnalyses.map(a => `
								<tr>
									<td class="border border-gray-300 p-2">${a.id || ''}</td>
									<td class="border border-gray-300 p-2">${a.sampleUID || ''}</td>
									<td class="border border-gray-300 p-2">${a.sampleName || ''}</td>
									<td class="border border-gray-300 p-2">
										${a.parameterNameDiff !== undefined ? (!showDifferences
											? `<div><span class="difference-indicator">⚠️<span class="tooltip">Giá trị trong app: <div style="margin-top:4px; font-weight:bold;">${a.parameterNameDiff || 'Không có'}</div></span></span>${a.parameterName || ''}</div>`
											: `<div style="width: 100%;">${a.parameterName || ''}<div class="difference-tag">Giá trị gốc: ${a.parameterNameDiff || 'Không có'}</div></div>`
										) : `<div>${a.parameterName || ''}</div>`}
									</td>
									<td class="border border-gray-300 p-2">
										${a.protocolCodeDiff !== undefined ? (!showDifferences
											? `<div><span class="difference-indicator">⚠️<span class="tooltip">Giá trị trong app: <div style="margin-top:4px; font-weight:bold;">${a.protocolCodeDiff || 'Không có'}</div></span></span>${a.protocolCode || ''}</div>`
											: `<div style="width: 100%;">${a.protocolCode || ''}<div class="difference-tag">Giá trị gốc: ${a.protocolCodeDiff || 'Không có'}</div></div>`
										) : `<div>${a.protocolCode || ''}</div>`}
									</td>
									<td class="border border-gray-300 p-2">
										<div style="width: 100%;">${a.resultValue || ''}</div>
									</td>
									<td class="border border-gray-300 p-2">
										<div style="width: 100%;">${a.resultUnit || ''}</div>
									</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
				</div>
			`;
		}

		// Sự kiện click nút hiển thị khác biệt
		showDiffBtn.onclick = () => {
			showDifferences = !showDifferences;
			showDiffBtn.textContent = showDifferences ? 'Ẩn dữ liệu khác biệt' : 'Hiển thị dữ liệu khác biệt';
			showDiffBtn.className = showDifferences
				? 'px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white border-0 rounded-md cursor-pointer font-bold text-xs transition-colors duration-200'
				: 'px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white border-0 rounded-md cursor-pointer font-bold text-xs transition-colors duration-200';
			renderTable();
			showAutoHideMessage(showDifferences ? 'Đang hiển thị dữ liệu khác biệt' : 'Đã ẩn dữ liệu khác biệt', 'info');
		};

		// Assemble header
		const headerLeft = globalThis.document.createElement('div');
		headerLeft.className = 'flex items-center gap-3';
		headerLeft.appendChild(title);
		headerLeft.appendChild(showDiffBtn);

		header.appendChild(headerLeft);
		header.appendChild(closeBtn);

		// Footer với nút nhập kết quả và cancel
		const footer = globalThis.document.createElement('div');
		footer.className = 'border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3';

		// Cancel button
		const cancelBtn = globalThis.document.createElement('button');
		cancelBtn.textContent = 'Hủy bỏ';
		cancelBtn.className = 'px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white border-0 rounded-lg cursor-pointer font-semibold text-sm transition-colors duration-200 shadow-sm hover:shadow-md';
		cancelBtn.onclick = () => {
			overlay.remove();
			// Remove any remaining popup overlays
			const remainingPopups = globalThis.document.querySelectorAll('#analysisDataPopupOverlay');
			remainingPopups.forEach(popup => popup.remove());
			// Call onClose callback if provided
			if (onClose) onClose();
		};

		const confirmBtn = globalThis.document.createElement('button');
		confirmBtn.textContent = 'Nhập kết quả';
		confirmBtn.className = 'px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg cursor-pointer font-semibold text-sm transition-colors duration-200 shadow-sm hover:shadow-md';

		// Hàm xử lý xác nhận cập nhật
		confirmBtn.onclick = async () => {
			try {
				// Kiểm tra xem có dữ liệu để cập nhật không
				if (!mergedAnalyses || mergedAnalyses.length === 0) {
					showAutoHideMessage('Không có dữ liệu để cập nhật', 'warning');
					return;
				}

				// Kiểm tra xem có khác biệt về protocolCode không
				const hasProtocolDifference = mergedAnalyses.some(a => a.protocolCodeDiff !== undefined);

				if (hasProtocolDifference) {
					// Hiển thị dialog xác nhận với select option
					const confirmDialog = globalThis.document.createElement('div');
					confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center';
					
					const dialogContent = globalThis.document.createElement('div');
					dialogContent.className = 'bg-yellow-50 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl border-2 border-yellow-200';
					
					dialogContent.innerHTML = `
						<div class="flex items-center mb-4">
							<span class="text-2xl mr-3">⚠️</span>
							<h3 class="text-lg font-semibold text-gray-900">Cảnh báo: Phát hiện khác biệt về phương pháp</h3>
						</div>
						<p class="text-gray-700 mb-4">Một số chỉ tiêu có phương pháp khác với dữ liệu trong app. Bạn muốn áp dụng phương pháp nào?</p>
						
						<div class="mb-6">
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Chọn phương pháp áp dụng:
							</label>
							<select id="methodChoice" class="w-full p-3 bg-white border-2 border-yellow-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-900 font-medium shadow-sm">
								<option value="delivered">Áp dụng phương pháp được bàn giao (mặc định)</option>
								<option value="report">Áp dụng phương pháp trong biên bản</option>
							</select>
						</div>
						
						<div class="flex justify-end gap-3">
							<button id="cancelConfirm" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors">Hủy bỏ</button>
							<button id="proceedConfirm" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">Xác nhận</button>
						</div>
					`;
					
					confirmDialog.appendChild(dialogContent);
					globalThis.document.body.appendChild(confirmDialog);
					
					// Xử lý sự kiện dialog
					const cancelBtn = dialogContent.querySelector('#cancelConfirm');
					const proceedBtn = dialogContent.querySelector('#proceedConfirm');
					const methodSelect = dialogContent.querySelector('#methodChoice');
					
					cancelBtn.onclick = () => {
						confirmDialog.remove();
						// Remove any remaining confirmation dialogs
						const remainingDialogs = globalThis.document.querySelectorAll('.fixed.inset-0.bg-black.bg-opacity-50');
						remainingDialogs.forEach(dialog => dialog.remove());
					};
					
					proceedBtn.onclick = async () => {
						const methodChoice = methodSelect.value;
						confirmDialog.remove();
						await performUpdate(methodChoice);
					};
					
					// Đóng dialog khi click outside
					confirmDialog.addEventListener('click', (e) => {
						if (e.target === confirmDialog) {
							confirmDialog.remove();
							// Remove any remaining confirmation dialogs
							const remainingDialogs = globalThis.document.querySelectorAll('.fixed.inset-0.bg-black.bg-opacity-50');
							remainingDialogs.forEach(dialog => dialog.remove());
						}
					});
				} else {
					// Không có khác biệt về protocol, thực hiện update trực tiếp
					await performUpdate('delivered');
				}
			} catch (error) {
				console.error('Error in confirm update:', error);
				showAutoHideMessage('Lỗi khi xử lý cập nhật: ' + error.message, 'error');
			}
		};

		// Hàm thực hiện cập nhật
		const performUpdate = async (methodChoice) => {
			try {
				showAutoHideMessage('Đang xử lý cập nhật...', 'info');
				
				// Chuẩn bị dữ liệu analyses
				const analysesData = mergedAnalyses.map(a => {
					const baseData = {
						id: parseInt(a.id),
						resultValue: a.resultValue,
						resultUnit: a.resultUnit
					};
					
					// Nếu chọn áp dụng phương pháp trong biên bản
					if (methodChoice === 'report') {
						// Sử dụng protocolCode từ extractData.analyses (giá trị hiện tại trong biên bản)
						baseData.protocolCode = a.protocolCode;
					}
					// Nếu chọn mặc định (delivered) thì không thêm protocolCode
					
					return baseData;
				}).filter(a => a.id); // Chỉ lấy những item có ID

				console.log('Sending update request:', { analyses: analysesData });

				const requestBody = {
					analyses: analysesData
				};

				// Thêm editId vào request body nếu có
				if (editId) {
					requestBody.editId = editId;
				}

				const response = await apiPost('https://red.irdop.org/v1/analysis/update_bulk', requestBody);

				if (response.status === 200) {
					showAutoHideMessage('Cập nhật thành công!', 'success');
					overlay.remove(); // Đóng popup sau khi cập nhật thành công
					// Remove any remaining popup overlays
					const remainingPopups = globalThis.document.querySelectorAll('#analysisDataPopupOverlay');
					remainingPopups.forEach(popup => popup.remove());
					// Call onClose callback if provided
					if (onClose) onClose();

					// Chuyển hướng đến trang processing nếu có sampleUIDs
					if (response.data && response.data.docRecord && response.data.docRecord.metadata && response.data.docRecord.metadata.sampleUIDs) {
						const sampleUIDs = response.data.docRecord.metadata.sampleUIDs;
						if (Array.isArray(sampleUIDs) && sampleUIDs.length > 0) {
							const sampleUIDsString = sampleUIDs.join(',');
							const url = `/processing?view=sample&ps_filter=true&ps_sample_uid=${sampleUIDsString}`;
							window.location.href = url;
						}
					}
				} else {
					showAutoHideMessage('Lỗi khi cập nhật: ' + (response.message || 'Unknown error'), 'error');
				}
			} catch (error) {
				console.error('Error in performUpdate:', error);
				showAutoHideMessage('Lỗi khi cập nhật: ' + error.message, 'error');
			}
		};

		footer.appendChild(cancelBtn);
		footer.appendChild(confirmBtn);

		// Assemble popup
		popup.appendChild(header);
		popup.appendChild(mainContent);
		popup.appendChild(footer);
		overlay.appendChild(popup);
		globalThis.document.body.appendChild(overlay);

		// Render bảng ban đầu
		renderTable();

		// Close on overlay click
		overlay.addEventListener('click', function (e) {
			if (e.target === overlay) {
				overlay.remove();
				// Remove any remaining popup overlays
				const remainingPopups = globalThis.document.querySelectorAll('#analysisDataPopupOverlay');
				remainingPopups.forEach(popup => popup.remove());
				// Call onClose callback if provided
				if (onClose) onClose();
			}
		});

		// Close on Escape key
		const handleEscape = (e) => {
			if (e.key === 'Escape') {
				overlay.remove();
				// Remove any remaining popup overlays
				const remainingPopups = globalThis.document.querySelectorAll('#analysisDataPopupOverlay');
				remainingPopups.forEach(popup => popup.remove());
				globalThis.document.removeEventListener('keydown', handleEscape);
				// Call onClose callback if provided
				if (onClose) onClose();
			}
		};
		globalThis.document.addEventListener('keydown', handleEscape);
	};

	// Render component
	if (!document || !document.metadata || !document.metadata.extractData || !document.metadata.extractData.analyses) {
		return null;
	}

	if (showAnalysisExtractInstead) {
		// Show extracted analyses in popup on component mount
		React.useEffect(() => {
			showAnalysisDataPopupFromExtract(document);
		}, []);
		return null;
	}

	// Return normal component view
	const extractedAnalyses = document.metadata.extractData.analyses;

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-4">
			<div className="flex items-center justify-between mb-4">
				<h4 className="text-lg font-semibold text-gray-900">
					Dữ liệu chỉ tiêu ({extractedAnalyses.length})
				</h4>
				<button
					onClick={() => showAnalysisDataPopupFromExtract(document)}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
				>
					Xem chi tiết
				</button>
			</div>
			
			<div className="overflow-auto max-h-96">
				<table className="w-full border-collapse border border-gray-300 text-xs">
					<thead>
						<tr className="bg-gray-100">
							<th className="border border-gray-300 p-2 text-left">ID</th>
							<th className="border border-gray-300 p-2 text-left">Mã mẫu</th>
							<th className="border border-gray-300 p-2 text-left">Chỉ tiêu</th>
							<th className="border border-gray-300 p-2 text-left">Kết quả</th>
						</tr>
					</thead>
					<tbody>
						{extractedAnalyses.map((analysis, index) => (
							<tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
								<td className="border border-gray-300 p-2">{analysis.id || '--'}</td>
								<td className="border border-gray-300 p-2">{analysis.sampleUID || '--'}</td>
								<td className="border border-gray-300 p-2">{analysis.parameterName || '--'}</td>
								<td className="border border-gray-300 p-2 font-medium">{analysis.resultValue || '--'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default AnalysesExtract;
