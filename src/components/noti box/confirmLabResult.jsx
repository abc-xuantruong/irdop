import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react';
import { previewDocument } from '../../contexts/documentPreviewHelpers';
import { apiPost, apiPostBlob } from '../../contexts/helperFunctionCallAPI';

const ConfirmLabResult = ({
	isOpen,
	onClose,
	onConfirm,
	onCancel,
	analyses = [],
	isLoading = false,
	originalAnalyses = [],
}) => {
	const [experimentLogCode, setExperimentLogCode] = useState('');
	const [hasNoExperimentLog, setHasNoExperimentLog] = useState(true);
	const [experimentStartDate, setExperimentStartDate] = useState('');
	const [experimentEndDate, setExperimentEndDate] = useState('');
	const [editorContent, setEditorContent] = useState('');
	const [isExtracting, setIsExtracting] = useState(false);
	const [showCardScanDialog, setShowCardScanDialog] = useState(false);
	const [cardId, setCardId] = useState('');
	const [isSigningIn, setIsSigningIn] = useState(false);
	const [showExtractDialog, setShowExtractDialog] = useState(false);
	const [isConfirming, setIsConfirming] = useState(false);
	const [hasResultValueChanges, setHasResultValueChanges] = useState(false);
	const editorRef = useRef(null);
	const cardInputRef = useRef(null);

	// Reset all fields when dialog opens
	useEffect(() => {
		if (isOpen) {
			setExperimentLogCode('');
			setHasNoExperimentLog(true);
			setExperimentStartDate('');
			setExperimentEndDate(() => {
				const now = new Date();
				const gmt7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
				const day = String(gmt7.getDate()).padStart(2, '0');
				const month = String(gmt7.getMonth() + 1).padStart(2, '0');
				const year = gmt7.getFullYear();
				return `${day}/${month}/${year}`;
			});
			setEditorContent('');
			setIsExtracting(false);
			setShowCardScanDialog(false);
			setCardId('');
			setIsSigningIn(false);
			setShowExtractDialog(false);
			setIsConfirming(false);
			if (editorRef.current) {
				editorRef.current.setContent('');
			}

			// Check if there are any resultValue changes
			const hasChanges = analyses.some((analysis) => {
				const original = originalAnalyses?.find((orig) => orig.id === analysis.id);
				if (!original) return true; // New analysis, consider as change

				// Strip HTML tags for comparison
				const stripHTML = (str) => (str || '').replace(/<[^>]*>/g, '');
				const currentValue = stripHTML(analysis.resultValue);
				const originalValue = stripHTML(original.resultValue);

				return currentValue !== originalValue;
			});

			setHasResultValueChanges(hasChanges);
		}
	}, [isOpen, analyses, originalAnalyses]);

	const resetFields = () => {
		setExperimentLogCode('');
		setHasNoExperimentLog(true);
		setExperimentStartDate('');
		setExperimentEndDate('');
		setEditorContent('');
		if (editorRef.current) editorRef.current.setContent('');
	};

	const handleExtractContent = async () => {
		try {
			setIsExtracting(true);

			// Prepare testLogIds array from experimentLogCode input
			const testLogIds = hasNoExperimentLog ? [] : experimentLogCode.trim() ? [experimentLogCode.trim()] : [];

			// Prepare request body
			const requestBody = {
				analyses: analyses,
				testLogIds: testLogIds,
				startDate: experimentStartDate || null,
				endDate: experimentEndDate || null,
			};

			// Call API using apiPost helper
			const response = await apiPost('https://red.irdop.org/v1/option/gen/html', requestBody);

			if (response.status !== 200) {
				throw new Error(response.data?.message || `API error: ${response.status}`);
			}

			// Response data is buffer, convert to HTML string
			const htmlContent = response.data || '';

			// Set content to TinyMCE editor
			if (editorRef.current) {
				editorRef.current.setContent(htmlContent);
			}
			setEditorContent(htmlContent);

			toast.success('Trích xuất nội dung thành công!');
		} catch (error) {
			console.error('Error extracting content:', error);
			toast.error('Lỗi khi trích xuất nội dung: ' + error.message);
		} finally {
			setIsExtracting(false);
		}
	};

	const handleOpenCardScan = () => {
		setShowCardScanDialog(true);
		setCardId('');
		// Focus on hidden input after dialog opens
		setTimeout(() => {
			if (cardInputRef.current) {
				cardInputRef.current.focus();
			}
		}, 100);
	};

	const handleCloseCardScan = () => {
		setShowCardScanDialog(false);
		setCardId('');
	};

	const handleCardScan = async (e) => {
		if (e.key === 'Enter' && cardId.trim()) {
			setIsSigningIn(true);

			try {
				// Call API using apiPostBlob helper for binary data
				const response = await apiPostBlob('https://red.irdop.org/v1/option/gen/sign', {
					cardID: cardId.trim(),
				});

				if (response.status !== 200) {
					throw new Error(response.data?.message || `API error: ${response.status}`);
				}

				// Response.data is now a Blob from apiPostBlob
				// Convert buffer to blob and create object URL
				let blob;
				if (response.data instanceof Blob) {
					blob = response.data;
				} else {
					console.error('Unexpected data format:', typeof response.data, response.data);
					throw new Error('Dữ liệu chữ ký phải là Blob: ' + typeof response.data);
				}

				// Create object URL from blob
				const imageUrl = URL.createObjectURL(blob);

				// Load image to get dimensions and resize
				const img = new Image();

				const loadImage = new Promise((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = () => reject(new Error('Failed to load signature image'));
					img.src = imageUrl;
				});

				await loadImage;

				// Create canvas for resizing
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');

				// Calculate new dimensions maintaining aspect ratio
				let width = img.width;
				let height = img.height;
				const maxWidth = 200;
				const maxHeight = 150;

				if (width > maxWidth || height > maxHeight) {
					const widthRatio = maxWidth / width;
					const heightRatio = maxHeight / height;
					const ratio = Math.min(widthRatio, heightRatio);

					width = Math.round(width * ratio);
					height = Math.round(height * ratio);
				}

				// Set canvas size and draw resized image
				canvas.width = width;
				canvas.height = height;
				ctx.drawImage(img, 0, 0, width, height);

				// Convert canvas to data URL
				const resizedImageUrl = canvas.toDataURL('image/png');

				// Insert resized signature at cursor position in TinyMCE
				const signatureContent = `<img src="${resizedImageUrl}" alt="Chữ ký" style="width: ${width}px; height: ${height}px;" />`;

				if (editorRef.current) {
					editorRef.current.insertContent(signatureContent);
				}

				// Clean up object URL
				URL.revokeObjectURL(imageUrl);

				toast.success('Đã chèn chữ ký vào tài liệu!');
				handleCloseCardScan();
			} catch (error) {
				console.error('Error getting signature:', error);
				toast.error('Lỗi khi lấy chữ ký: ' + error.message);
			} finally {
				setIsSigningIn(false);
			}
		}
	};

	const handlePreview = async () => {
		try {
			const content = editorRef.current ? editorRef.current.getContent() : editorContent;
			if (!content || content.trim() === '') {
				toast.warning('Không có nội dung để xem trước');
				return;
			}
			await previewDocument(content);
		} catch (error) {
			console.error('Error opening preview:', error);
			toast.error('Lỗi khi mở xem trước: ' + error.message);
		}
	};

	const handlePrintLabels = () => {
		try {
			// Extract unique sample IDs from analyses
			const allSampleIds = [...new Set(analyses.map((a) => a.sampleId).filter(Boolean))];

			if (allSampleIds.length === 0) {
				toast.warning('Không có mã mẫu để in tem');
				return;
			}

			// Generate HTML for label printing
			const html = generateLabelPrintHTML(allSampleIds);

			// Open new window for printing
			const printWindow = window.open('', '_blank');
			printWindow.document.write(html);
			printWindow.document.close();
		} catch (error) {
			console.error('Error printing labels:', error);
			toast.error('Lỗi khi in tem: ' + error.message);
		}
	};

	const generateLabelPrintHTML = (allSampleIds) => {
		// Generate copyId function
		const generateCopyId = () => {
			const now = new Date();
			const year = now.getFullYear().toString();
			const month = (now.getMonth() + 1).toString().padStart(2, '0');
			const day = now.getDate().toString().padStart(2, '0');
			const random = Array.from({ length: 4 }, () =>
				'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26)),
			).join('');
			return `${year}${month}${day}${random}`;
		};

		// Split sample IDs into groups of 10 (max per label)
		const rows = [];
		for (let i = 0; i < allSampleIds.length; i += 10) {
			const group = allSampleIds.slice(i, i + 10);
			rows.push({
				sampleIds: group,
				copyId: generateCopyId(),
			});
		}

		// Generate SVG rows
		const rowsHTML = rows
			.map((row, rowIndex) => {
				// Left label with sample IDs (rotated 90 degrees to write along 30mm width)
				const sampleLines = ['Mã mẫu', ...row.sampleIds];
				const sampleTspans = sampleLines
					.map((line, index) => `<tspan x="0" dy="${index === 0 ? '0' : '1mm'}">${line}</tspan>`)
					.join('');

				// Right label with copyId
				const copyIdTspans = `<tspan x="2" dy="0">CopyID:</tspan><tspan x="2" dy="1.8mm">${row.copyId}</tspan>`;

				return `
					<div class="row" data-row-index="${rowIndex}" data-sample-ids='${JSON.stringify(
					row.sampleIds,
				)}' data-all-sample-ids='${JSON.stringify(allSampleIds)}'>
						<svg class="label label-sample" width="50mm" height="30mm" viewBox="0 0 50 30" onclick="openEditPopup(${rowIndex})">
							<rect class="label-border" x="0" y="0" width="50" height="30" fill="none" stroke="black" stroke-width="0.1"/>
							<g transform="translate(3, 28) rotate(-90)">
								<text x="0" y="0" font-family="Arial, sans-serif" font-size="1mm" fill="black">
									${sampleTspans}
								</text>
							</g>
						</svg>
						<svg class="label label-copy" width="50mm" height="30mm" viewBox="0 0 50 30">
							<rect class="label-border" x="0" y="0" width="50" height="30" fill="none" stroke="black" stroke-width="0.1"/>
							<text x="2" y="5" font-family="Arial, sans-serif" font-size="1.5mm" fill="black">
								${copyIdTspans}
							</text>
						</svg>
					</div>
				`;
			})
			.join('');

		return `
			<!DOCTYPE html>
			<html lang="vi">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>In Tem Mẫu</title>
				<style>
					body {
						margin: 0;
						padding: 0;
						font-family: Arial, sans-serif;
					}

					.container {
						display: flex;
						flex-direction: column;
						align-items: center;
					}

					.row {
						width: 100mm;
						height: 30mm;
						margin-bottom: 10px;
						box-sizing: border-box;
						display: flex;
						flex-direction: row;
						position: relative;
					}

					svg.label {
						width: 50mm;
						height: 30mm;
						display: inline-block;
						vertical-align: top;
						flex-shrink: 0;
						cursor: pointer;
						transition: opacity 0.2s;
					}

					svg.label:hover {
						opacity: 0.8;
					}

					svg.label-copy {
						cursor: default;
					}

					.mode-double-sample .label-copy {
						display: none;
					}

					.edit-popup {
						position: fixed;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						background-color: rgba(0, 0, 0, 0.6);
						display: none;
						justify-content: center;
						align-items: center;
						z-index: 1000;
					}

					.edit-popup.active {
						display: flex;
					}

					.edit-popup-content {
						background-color: white;
						padding: 2rem;
						border-radius: 0.5rem;
						box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
						max-width: 500px;
						width: 90%;
					}

					.edit-popup h2 {
						margin-top: 0;
						margin-bottom: 1rem;
						color: #1f2937;
						font-size: 1.25rem;
					}

					.sample-checklist {
						max-height: 400px;
						overflow-y: auto;
						margin-bottom: 1rem;
						border: 1px solid #e5e7eb;
						border-radius: 0.25rem;
					}

					.sample-item {
						padding: 0.75rem;
						border-bottom: 1px solid #e5e7eb;
						display: flex;
						align-items: center;
						cursor: pointer;
						transition: background-color 0.2s;
					}

					.sample-item:hover {
						background-color: #f3f4f6;
					}

					.sample-item:last-child {
						border-bottom: none;
					}

					.sample-item input[type="checkbox"] {
						margin-right: 0.75rem;
						width: 18px;
						height: 18px;
						cursor: pointer;
					}

					.sample-item label {
						cursor: pointer;
						flex: 1;
						font-size: 0.95rem;
					}

					.popup-buttons {
						display: flex;
						gap: 0.5rem;
						justify-content: flex-end;
					}

					.popup-buttons button {
						padding: 0.5rem 1.5rem;
						border: none;
						border-radius: 0.25rem;
						cursor: pointer;
						font-size: 0.95rem;
						transition: background-color 0.2s;
					}

					.btn-cancel {
						background-color: #e5e7eb;
						color: #374151;
					}

					.btn-cancel:hover {
						background-color: #d1d5db;
					}

					.btn-confirm {
						background-color: #3b82f6;
						color: white;
					}

					.btn-confirm:hover {
						background-color: #2563eb;
					}

					.mode-toggle {
						margin-left: 1rem;
						background-color: #8b5cf6;
						color: white;
						border: 1px solid #7c3aed;
					}

					.mode-toggle:hover {
						background-color: #7c3aed;
					}

					.no-print {
						margin: 1rem 0;
						padding: 0.5rem;
						background-color: #f0f0f0;
						text-align: start;
					}

					.no-print h1 {
						font-size: 1.5rem;
						color: #4a00e0;
						font-weight: 600;
					}

					.no-print button {
						margin-top: 0.5rem;
						background-color: #e0e0e0;
						color: black;
						border: 1px solid #4a5568;
						padding: 0.25rem 1rem;
						border-radius: 0.25rem;
						cursor: pointer;
					}

					.no-print button:hover {
						border-color: #6b46c1;
					}

					.no-print button:active {
						background-color: #f7fafc;
					}

					.row-controls {
						position: absolute;
						right: -160px;
						top: 50%;
						transform: translateY(-50%);
						display: flex;
						gap: 0.5rem;
					}

					.duplicate-btn, .delete-btn {
						background-color: #3b82f6;
						color: white;
						border: none;
						padding: 0.5rem 0.75rem;
						border-radius: 0.25rem;
						cursor: pointer;
						font-size: 0.875rem;
						white-space: nowrap;
					}

					.duplicate-btn:hover {
						background-color: #2563eb;
					}

					.delete-btn {
						background-color: #ef4444;
					}

					.delete-btn:hover {
						background-color: #dc2626;
					}

					@media print {
						@page {
							size: 100mm 30mm;
							margin: 0;
						}

						html, body {
							height: auto !important;
							margin: 0 !important;
							padding: 0 !important;
							overflow: visible !important;
						}

						body * {
							visibility: hidden;
						}

						.print-content, .print-content * {
							visibility: visible;
							border: none !important;
						}

						.label-border {
							stroke: none !important;
							display: none;
						}

						.row {
							margin-bottom: 0;
							page-break-after: always;
							page-break-inside: avoid;
						}

						.row:last-of-type {
							page-break-after: auto;
						}

						.no-print {
							display: none !important;
						}

						.duplicate-btn {
							display: none !important;
						}

						.delete-btn {
							display: none !important;
						}

						.row-controls {
							display: none !important;
						}

						.edit-popup {
							display: none !important;
						}

						.mode-toggle {
							display: none !important;
						}
					}
				</style>
			</head>
			<body>
				<div class="no-print">
					<h1>IN NHÃN DÁN MẪU</h1>
					<button onclick="window.print()">In tem</button>
					<button class="mode-toggle" onclick="togglePrintMode()">
						<span id="mode-text">Chế độ: 1 Mã mẫu + 1 CopyID</span>
					</button>
					<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #666;">
						Nhấn nút "Nhân bản" để tạo thêm tem | Click vào tem mã mẫu để chỉnh sửa danh sách
					</p>
				</div>
				<div class="print-content" id="labels-container">
					${rowsHTML}
				</div>

				<!-- Edit Popup -->
				<div class="edit-popup no-print" id="edit-popup">
					<div class="edit-popup-content">
						<h2>Chỉnh sửa danh sách mã mẫu</h2>
						<div class="sample-checklist" id="sample-checklist">
							<!-- Checklist will be populated by JavaScript -->
						</div>
						<div class="popup-buttons">
							<button class="btn-cancel" onclick="closeEditPopup()">Hủy</button>
							<button class="btn-confirm" onclick="confirmEdit()">Xác nhận</button>
						</div>
					</div>
				</div>

				<script>
					let currentEditingRow = null;
					let isPrintModeDoubleSample = false;

					function generateRandomString(length) {
						const characters = 'abcdefghijklmnopqrstuvwxyz';
						let result = '';
						for (let i = 0; i < length; i++) {
							result += characters.charAt(Math.floor(Math.random() * characters.length));
						}
						return result;
					}

					function getCurrentDateYYYYMMDD() {
						const now = new Date();
						const year = now.getFullYear().toString();
						const month = (now.getMonth() + 1).toString().padStart(2, '0');
						const day = now.getDate().toString().padStart(2, '0');
						return year + month + day;
					}

					function generateCopyId() {
						const date = getCurrentDateYYYYMMDD();
						const random = generateRandomString(4);
						return date + random;
					}

					function togglePrintMode() {
						isPrintModeDoubleSample = !isPrintModeDoubleSample;
						const container = document.getElementById('labels-container');
						const modeText = document.getElementById('mode-text');
						
						if (isPrintModeDoubleSample) {
							container.classList.add('mode-double-sample');
							modeText.textContent = 'Chế độ: 2 Tem mã mẫu';
							
							// Get all current sample IDs from first row
							const firstRow = container.querySelector('.row');
							if (!firstRow) return;
							
							const allSampleIds = JSON.parse(firstRow.getAttribute('data-all-sample-ids'));
							
							// Check if need to reorganize
							if (allSampleIds.length <= 10) {
								// Simple case: just duplicate the labels
								const rows = container.querySelectorAll('.row');
								rows.forEach((row, rowIndex) => {
									const sampleLabel = row.querySelector('.label-sample');
									if (sampleLabel && !row.querySelector('.label-sample-2')) {
										const clone = sampleLabel.cloneNode(true);
										clone.classList.add('label-sample-2');
										clone.classList.remove('label-sample');
										clone.setAttribute('onclick', 'openEditPopup(' + rowIndex + ')');
										const copyLabel = row.querySelector('.label-copy');
										row.insertBefore(clone, copyLabel);
									}
								});
							} else {
								// Complex case: reorganize into grid (left-right-down)
								container.innerHTML = '';
								
								// Split into groups of 10 for each label position
								const labelsPerPage = 20; // 10 per label x 2 labels
								let rowIndex = 0;
								
								for (let i = 0; i < allSampleIds.length; i += 10) {
									const group1 = allSampleIds.slice(i, i + 10);
									const group2 = allSampleIds.slice(i + 10, i + 20);
									
									if (group1.length > 0) {
										const newRow = createDoubleSampleRow(group1, group2.length > 0 ? group2 : group1, rowIndex, allSampleIds);
										container.appendChild(newRow);
										addRowControls(newRow, rowIndex);
										rowIndex++;
									}
									
									// Skip the group2 in next iteration if we used it
									if (group2.length > 0) {
										i += 10;
									}
								}
							}
						} else {
							// Switch back to single sample + copyId mode
							container.classList.remove('mode-double-sample');
							modeText.textContent = 'Chế độ: 1 Mã mẫu + 1 CopyID';
							
							// Get all sample IDs
							const firstRow = container.querySelector('.row');
							if (!firstRow) return;
							const allSampleIds = JSON.parse(firstRow.getAttribute('data-all-sample-ids'));
							
							// Rebuild rows with original structure
							container.innerHTML = '';
							let rowIndex = 0;
							
							for (let i = 0; i < allSampleIds.length; i += 10) {
								const group = allSampleIds.slice(i, i + 10);
								const newRow = createSingleSampleRow(group, generateCopyId(), rowIndex, allSampleIds);
								container.appendChild(newRow);
								addRowControls(newRow, rowIndex);
								rowIndex++;
							}
						}
					}

					function createSingleSampleRow(sampleIds, copyId, rowIndex, allSampleIds) {
						const rowDiv = document.createElement('div');
						rowDiv.className = 'row';
						rowDiv.setAttribute('data-row-index', rowIndex);
						rowDiv.setAttribute('data-sample-ids', JSON.stringify(sampleIds));
						rowDiv.setAttribute('data-all-sample-ids', JSON.stringify(allSampleIds));
						
						const sampleLines = ['Mã mẫu', ...sampleIds];
						const sampleTspans = sampleLines.map((line, index) =>
							'<tspan x="0" dy="' + (index === 0 ? '0' : '1mm') + '">' + line + '</tspan>'
						).join('');
						
						const copyIdTspans = '<tspan x="2" dy="0">CopyID:</tspan><tspan x="2" dy="1.8mm">' + copyId + '</tspan>';
						
						rowDiv.innerHTML = 
							'<svg class="label label-sample" width="50mm" height="30mm" viewBox="0 0 50 30" onclick="openEditPopup(' + rowIndex + ')">' +
							'<rect class="label-border" x="0" y="0" width="50" height="30" fill="none" stroke="black" stroke-width="0.1"/>' +
							'<g transform="translate(3, 28) rotate(-90)">' +
							'<text x="0" y="0" font-family="Arial, sans-serif" font-size="1mm" fill="black">' +
							sampleTspans +
							'</text>' +
							'</g>' +
							'</svg>' +
							'<svg class="label label-copy" width="50mm" height="30mm" viewBox="0 0 50 30">' +
							'<rect class="label-border" x="0" y="0" width="50" height="30" fill="none" stroke="black" stroke-width="0.1"/>' +
							'<text x="2" y="5" font-family="Arial, sans-serif" font-size="1.5mm" fill="black">' +
							copyIdTspans +
							'</text>' +
							'</svg>';
						
						return rowDiv;
					}

					function createDoubleSampleRow(sampleIds1, sampleIds2, rowIndex, allSampleIds) {
						const rowDiv = document.createElement('div');
						rowDiv.className = 'row';
						rowDiv.setAttribute('data-row-index', rowIndex);
						rowDiv.setAttribute('data-sample-ids', JSON.stringify(sampleIds1));
						rowDiv.setAttribute('data-all-sample-ids', JSON.stringify(allSampleIds));
						
						const sampleLines1 = ['Mã mẫu', ...sampleIds1];
						const sampleTspans1 = sampleLines1.map((line, index) =>
							'<tspan x="0" dy="' + (index === 0 ? '0' : '1mm') + '">' + line + '</tspan>'
						).join('');
						
						const sampleLines2 = ['Mã mẫu', ...sampleIds2];
						const sampleTspans2 = sampleLines2.map((line, index) =>
							'<tspan x="0" dy="' + (index === 0 ? '0' : '1mm') + '">' + line + '</tspan>'
						).join('');
						
						rowDiv.innerHTML = 
							'<svg class="label label-sample" width="50mm" height="30mm" viewBox="0 0 50 30" onclick="openEditPopup(' + rowIndex + ')">' +
							'<rect class="label-border" x="0" y="0" width="50" height="30" fill="none" stroke="black" stroke-width="0.1"/>' +
							'<g transform="translate(3, 28) rotate(-90)">' +
							'<text x="0" y="0" font-family="Arial, sans-serif" font-size="1mm" fill="black">' +
							sampleTspans1 +
							'</text>' +
							'</g>' +
							'</svg>' +
							'<svg class="label label-sample-2" width="50mm" height="30mm" viewBox="0 0 50 30" onclick="openEditPopup(' + rowIndex + ')">' +
							'<rect class="label-border" x="0" y="0" width="50" height="30" fill="none" stroke="black" stroke-width="0.1"/>' +
							'<g transform="translate(3, 28) rotate(-90)">' +
							'<text x="0" y="0" font-family="Arial, sans-serif" font-size="1mm" fill="black">' +
							sampleTspans2 +
							'</text>' +
							'</g>' +
							'</svg>' +
							'<svg class="label label-copy" width="50mm" height="30mm" viewBox="0 0 50 30" style="display: none;">' +
							'<rect class="label-border" x="0" y="0" width="50" height="30" fill="none" stroke="black" stroke-width="0.1"/>' +
							'</svg>';
						
						return rowDiv;
					}

					function openEditPopup(rowIndex) {
						currentEditingRow = rowIndex;
						const row = document.querySelector('[data-row-index="' + rowIndex + '"]');
						if (!row) return;

						// Get all sample IDs from data attribute
						const allSampleIds = JSON.parse(row.getAttribute('data-all-sample-ids'));
						const currentSampleIds = JSON.parse(row.getAttribute('data-sample-ids'));
						
						const checklist = document.getElementById('sample-checklist');
						
						// Build checklist with all samples, check current ones
						checklist.innerHTML = allSampleIds.map((id, index) => {
							const isChecked = currentSampleIds.includes(id);
							return '<div class="sample-item" onclick="toggleCheckbox(' + index + ')">' +
								'<input type="checkbox" id="sample-' + index + '" ' + (isChecked ? 'checked' : '') + ' onchange="event.stopPropagation()">' +
								'<label for="sample-' + index + '">' + id + '</label>' +
								'</div>';
						}).join('');

						document.getElementById('edit-popup').classList.add('active');
					}

					function closeEditPopup() {
						document.getElementById('edit-popup').classList.remove('active');
						currentEditingRow = null;
					}

					function toggleCheckbox(index) {
						const checkbox = document.getElementById('sample-' + index);
						if (checkbox) {
							checkbox.checked = !checkbox.checked;
						}
					}

					function confirmEdit() {
						if (currentEditingRow === null) return;

						const row = document.querySelector('[data-row-index="' + currentEditingRow + '"]');
						if (!row) return;

						// Get selected sample IDs
						const checklist = document.getElementById('sample-checklist');
						const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
						const labels = checklist.querySelectorAll('.sample-item label');
						
						const selectedSamples = [];
						checkboxes.forEach((cb, index) => {
							if (cb.checked) {
								selectedSamples.push(labels[index].textContent);
							}
						});

						if (selectedSamples.length === 0) {
							alert('Vui lòng chọn ít nhất 1 mã mẫu');
							return;
						}

						if (selectedSamples.length > 10) {
							alert('Tối đa 10 mã mẫu trên 1 tem. Vui lòng chọn tối đa 10 mã mẫu.');
							return;
						}

						// Update row data
						row.setAttribute('data-sample-ids', JSON.stringify(selectedSamples));

						// Rebuild the sample label SVG
						updateSampleLabel(row, selectedSamples);

						closeEditPopup();
					}

					function updateSampleLabel(row, selectedSamples) {
						const sampleLines = ['Mã mẫu', ...selectedSamples];
						const sampleTspans = sampleLines.map((line, index) =>
							'<tspan x="0" dy="' + (index === 0 ? '0' : '1mm') + '">' + line + '</tspan>'
						).join('');

						const sampleSvg = row.querySelector('.label-sample');
						if (sampleSvg) {
							sampleSvg.innerHTML = 
								'<rect class="label-border" x="0" y="0" width="50" height="30" fill="none" stroke="black" stroke-width="0.1"/>' +
								'<g transform="translate(3, 28) rotate(-90)">' +
								'<text x="0" y="0" font-family="Arial, sans-serif" font-size="1mm" fill="black">' +
								sampleTspans +
								'</text>' +
								'</g>';
						}

						// Update the second sample label if in double sample mode
						const sampleSvg2 = row.querySelector('.label-sample-2');
						if (sampleSvg2) {
							sampleSvg2.innerHTML = 
								'<rect class="label-border" x="0" y="0" width="50" height="30" fill="none" stroke="black" stroke-width="0.1"/>' +
								'<g transform="translate(3, 28) rotate(-90)">' +
								'<text x="0" y="0" font-family="Arial, sans-serif" font-size="1mm" fill="black">' +
								sampleTspans +
								'</text>' +
								'</g>';
						}
					}

					function duplicateRow(rowIndex) {
						const container = document.getElementById('labels-container');
						const originalRow = container.querySelector('[data-row-index="' + rowIndex + '"]');
						
						if (!originalRow) return;

						// Clone the row
						const newRow = originalRow.cloneNode(true);
						
						// Generate new copyId for the right label
						const newCopyId = generateCopyId();
						
						// Update the right SVG with new copyId
						const rightSvg = newRow.querySelector('.label-copy');
						if (rightSvg) {
							const textElement = rightSvg.querySelector('text');
							if (textElement) {
								const tspans = textElement.querySelectorAll('tspan');
								if (tspans.length >= 2) {
									tspans[1].textContent = newCopyId;
								}
							}
						}
						
						// Update row index
						const newIndex = container.children.length;
						newRow.setAttribute('data-row-index', newIndex);
						
						// Update onclick for sample label
						const sampleLabel = newRow.querySelector('.label-sample');
						if (sampleLabel) {
							sampleLabel.setAttribute('onclick', 'openEditPopup(' + newIndex + ')');
						}
						
						// Update onclick for second sample label if exists
						const sampleLabel2 = newRow.querySelector('.label-sample-2');
						if (sampleLabel2) {
							sampleLabel2.setAttribute('onclick', 'openEditPopup(' + newIndex + ')');
						}
						
						// Remove old controls
						const oldControls = newRow.querySelector('.row-controls');
						if (oldControls) oldControls.remove();
						
						// Insert the new row after the original
						originalRow.parentNode.insertBefore(newRow, originalRow.nextSibling);
						
						// Add controls to new row
						addRowControls(newRow, newIndex);
					}

					function deleteRow(rowIndex) {
						const container = document.getElementById('labels-container');
						const row = container.querySelector('[data-row-index="' + rowIndex + '"]');
						
						if (!row) return;
						
						// Don't allow deleting if it's the last row
						if (container.children.length <= 1) {
							alert('Không thể xóa hàng cuối cùng');
							return;
						}
						
						// Confirm deletion
						if (confirm('Bạn có chắc chắn muốn xóa hàng tem này?')) {
							row.remove();
							
							// Reindex remaining rows
							const rows = container.querySelectorAll('.row');
							rows.forEach((r, index) => {
								r.setAttribute('data-row-index', index);
								
								// Update onclick for labels
								const sampleLabel = r.querySelector('.label-sample');
								if (sampleLabel) {
									sampleLabel.setAttribute('onclick', 'openEditPopup(' + index + ')');
								}
								
								const sampleLabel2 = r.querySelector('.label-sample-2');
								if (sampleLabel2) {
									sampleLabel2.setAttribute('onclick', 'openEditPopup(' + index + ')');
								}
								
								// Update controls
								const controls = r.querySelector('.row-controls');
								if (controls) {
									controls.remove();
								}
								addRowControls(r, index);
							});
						}
					}

					function addRowControls(row, rowIndex) {
						// Remove existing controls if any
						const existingControls = row.querySelector('.row-controls');
						if (existingControls) {
							existingControls.remove();
						}

						// Create controls container
						const controlsDiv = document.createElement('div');
						controlsDiv.className = 'row-controls no-print';
						
						// Create duplicate button
						const duplicateBtn = document.createElement('button');
						duplicateBtn.className = 'duplicate-btn';
						duplicateBtn.textContent = '🔄 Nhân bản';
						duplicateBtn.onclick = function() {
							duplicateRow(rowIndex);
						};
						
						// Create delete button
						const deleteBtn = document.createElement('button');
						deleteBtn.className = 'delete-btn';
						deleteBtn.textContent = '🗑️ Xóa';
						deleteBtn.onclick = function() {
							deleteRow(rowIndex);
						};
						
						controlsDiv.appendChild(duplicateBtn);
						controlsDiv.appendChild(deleteBtn);
						row.appendChild(controlsDiv);
					}

					// Add duplicate buttons to all rows on load
					window.onload = function() {
						const rows = document.querySelectorAll('.row');
						rows.forEach((row, index) => {
							addRowControls(row, index);
						});
					};
				</script>
			</body>
			</html>
		`;
	};

	const handleClose = () => {
		resetFields();
		onClose();
	};

	const handleConfirm = () => {
		if (!hasNoExperimentLog && !experimentLogCode.trim()) {
			toast.error('Vui lòng nhập mã nhật ký thử nghiệm hoặc chọn "Chưa có mã nhật ký"');
			return;
		}
		// Show extraction dialog instead of immediately confirming
		setShowExtractDialog(true);
	};

	const handleConfirmUpdate = async () => {
		setIsConfirming(true);
		const currentContent = editorRef.current ? editorRef.current.getContent() : editorContent;

		await onConfirm({
			experimentLogCode: hasNoExperimentLog ? null : experimentLogCode,
			hasNoExperimentLog,
			experimentStartDate,
			experimentEndDate,
			editorContent: currentContent,
		});

		setIsConfirming(false);
		setShowExtractDialog(false);
		resetFields();
	};

	const handleExtractAndPrint = async () => {
		try {
			setIsConfirming(true);
			const currentContent = editorRef.current ? editorRef.current.getContent() : editorContent;

			// First confirm the update
			await onConfirm({
				experimentLogCode: hasNoExperimentLog ? null : experimentLogCode,
				hasNoExperimentLog,
				experimentStartDate,
				experimentEndDate,
				editorContent: currentContent,
			});

			// Then generate PDF and download
			if (currentContent && currentContent.trim() !== '') {
				const { measureContentInDOM, paginateContent, generatePreviewHTML } = await import(
					'../../contexts/documentPreviewHelpers'
				);

				// Measure content first
				const measurements = await measureContentInDOM(currentContent);

				// Paginate content
				const pages = paginateContent(measurements);

				// Generate preview HTML (paginated)
				const paginatedHTML = generatePreviewHTML(pages, measurements);

				// Call API to generate PDF
				const response = await apiPostBlob('https://red.irdop.org/v1/option/gen/pdf', {
					contentType: 'html',
					param: {
						htmlContent: paginatedHTML,
					},
				});

				if (response.status !== 200) {
					throw new Error(response.data?.message || `API error: ${response.status}`);
				}

				// Response.data is a Blob from apiPostBlob
				let blob;
				if (response.data instanceof Blob) {
					blob = response.data;
				} else {
					console.error('Unexpected data format:', typeof response.data, response.data);
					throw new Error('Dữ liệu PDF phải là Blob: ' + typeof response.data);
				}

				// Create download link for PDF
				const pdfUrl = URL.createObjectURL(blob);
				const downloadLink = document.createElement('a');
				downloadLink.href = pdfUrl;

				// Generate filename with timestamp
				const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
				downloadLink.download = `Bien_ban_ket_qua_${timestamp}.pdf`;

				// Trigger download
				document.body.appendChild(downloadLink);
				downloadLink.click();
				document.body.removeChild(downloadLink);

				// Clean up object URL
				URL.revokeObjectURL(pdfUrl);

				toast.success('Đã tạo và tải xuống file PDF thành công!');
			}

			setIsConfirming(false);
			setShowExtractDialog(false);
			resetFields();
		} catch (error) {
			console.error('Error extracting and generating PDF:', error);
			toast.error('Lỗi khi tạo PDF: ' + error.message);
			setIsConfirming(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-[90vw] h-[95vh] flex flex-col">
				<div className="px-6 py-4 border-b border-gray-200">
					<h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
						<span>📋</span>
						<span>BIÊN BẢN KẾT QUẢ THỬ NGHIỆM</span>
						<span className="text-sm text-gray-500 font-normal">(Khóa sửa)</span>
					</h2>
				</div>
				<div className="flex-1 overflow-hidden px-6 py-4">
					<div className="flex gap-4 h-full">
						<div className="flex-1 flex flex-col overflow-hidden">
							<div className="mb-4 space-y-4 flex-shrink-0">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<div className="flex items-center gap-4 h-[20px]">
											<div className="flex items-center gap-2">
												<input
													type="checkbox"
													id="hasExperimentLog"
													checked={!hasNoExperimentLog}
													onChange={(e) => {
														setHasNoExperimentLog(!e.target.checked);
														if (!e.target.checked) setExperimentLogCode('');
													}}
													className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
												/>
												<label
													htmlFor="hasExperimentLog"
													className="text-sm font-semibold text-gray-700 cursor-pointer"
												>
													Có mã nhật ký
												</label>
											</div>
											<div className="flex items-center gap-2">
												<input
													type="checkbox"
													id="noExperimentLog"
													checked={hasNoExperimentLog}
													onChange={(e) => {
														setHasNoExperimentLog(e.target.checked);
														if (e.target.checked) setExperimentLogCode('');
													}}
													className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
												/>
												<label htmlFor="noExperimentLog" className="text-sm font-semibold text-gray-700 cursor-pointer">
													Chưa có mã nhật ký
												</label>
											</div>
										</div>
										<input
											type="text"
											value={experimentLogCode}
											onChange={(e) => setExperimentLogCode(e.target.value)}
											disabled={hasNoExperimentLog}
											placeholder="Nhập mã nhật ký..."
											className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
												hasNoExperimentLog ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'
											}`}
										/>
									</div>
									<div className="space-y-2">
										<label className="block text-sm font-semibold text-gray-700 h-[20px] leading-[20px]">
											Thời gian thử nghiệm
										</label>
										<div className="grid grid-cols-2 gap-2">
											<input
												type="text"
												value={experimentStartDate}
												onChange={(e) => setExperimentStartDate(e.target.value)}
												placeholder="Ngày bắt đầu (dd/mm/yyyy)"
												className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
											/>
											<input
												type="text"
												value={experimentEndDate}
												onChange={(e) => setExperimentEndDate(e.target.value)}
												placeholder="Ngày kết thúc (dd/mm/yyyy)"
												className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
											/>
										</div>
									</div>
								</div>
							</div>
							<div className="mb-3 flex items-center justify-between bg-blue-50 px-4 py-2 rounded-lg flex-shrink-0">
								<span className="text-sm text-gray-700">
									Có <span className="font-semibold text-blue-600">{analyses.length}</span> thay đổi đang chờ cập nhật
								</span>
							</div>
							<div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
								<div className="h-full overflow-auto">
									<table className="w-full text-sm">
										<thead className="bg-gray-100 sticky top-0">
											<tr>
												<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Mã mẫu</th>
												<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Chỉ tiêu</th>
												<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Nguồn</th>
												<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">
													Phương pháp
												</th>
												<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Kết quả</th>
												<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Đơn vị</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{analyses.map((analysis, index) => (
												<tr key={index} className="hover:bg-gray-50 text-start">
													<td className="px-3 py-2 text-gray-900">{analysis.sampleId || '--'}</td>
													<td className="px-3 py-2 text-gray-900">{analysis.parameterName || '--'}</td>
													<td className="px-3 py-2 text-gray-900">{analysis.protocolSource || '--'}</td>
													<td className="px-3 py-2 text-gray-900">{analysis.protocolCode || '--'}</td>
													<td className="px-3 py-2">
														<div
															className="text-gray-900"
															dangerouslySetInnerHTML={{ __html: analysis.resultValue || '--' }}
														/>
													</td>
													<td className="px-3 py-2">
														<div
															className="text-gray-900"
															dangerouslySetInnerHTML={{ __html: analysis.resultUnit || '--' }}
														/>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
						<div className="flex-1 flex flex-col overflow-hidden border-l pl-4">
							<div className="flex items-center justify-between mb-2 flex-shrink-0">
								<h3 className="text-sm font-semibold text-gray-900">Nội dung biên bản:</h3>
								<div className="flex items-center gap-2">
									<button
										onClick={handlePrintLabels}
										className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
										title="In tem nhãn mẫu"
									>
										<span>🏷️</span>
										<span>In tem mẫu</span>
									</button>
									<button
										onClick={handlePreview}
										className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
										title="Xem trước với phân trang A4"
									>
										<span>👁️</span>
										<span>Preview</span>
									</button>
									<button
										onClick={handleOpenCardScan}
										className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
										title="Ký xác nhận bằng thẻ từ"
									>
										<span>✍️</span>
										<span>Ký xác nhận</span>
									</button>
									<button
										onClick={handleExtractContent}
										disabled={isExtracting || analyses.length === 0}
										className="p-1 py-0.5 text-blue-600 hover:text-blue-800 font-bold italic underline text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
										title="Trích xuất nội dung từ analyses"
									>
										{isExtracting ? (
											<>
												<svg
													className="animate-spin h-3 w-3"
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="4"
													></circle>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
												<span>Đang trích xuất...</span>
											</>
										) : (
											<span>trích xuất nội dung →</span>
										)}
									</button>
								</div>
							</div>
							<div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
								<TinyMCEEditor
									onInit={(evt, editor) => (editorRef.current = editor)}
									value={editorContent}
									onEditorChange={(content) => setEditorContent(content)}
									init={{
										height: '100%',
										width: '100%',
										statusbar: false,
										promotion: false,
										menubar: false,
										toolbar_mode: 'wrap',
										resize: false,
										// Disable table context menu/toolbox
										table_toolbar: '',
										table_appearance_options: false,
										table_advtab: false,
										table_cell_advtab: false,
										table_row_advtab: false,
										plugins: [
											'advlist',
											'autolink',
											'lists',
											'link',
											'charmap',
											'preview',
											'anchor',
											'searchreplace',
											'visualblocks',
											'code',
											'insertdatetime',
											'table',
											'wordcount',
										],
										toolbar:
											'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight numlist bullist indent outdent table',
										content_style: `* { box-sizing: border-box !important; } body { font-family: 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.5; margin: 0; background: white; padding: 10mm; width: 100%; } p { margin: 2px 0; } table { border-collapse: collapse; border: 1px solid #ccc; width: 100%; } table th, table td { border: 1px solid #ccc; padding: 8px; vertical-align: top; } table th { background-color: #f9f9f9; font-weight: bold; }`,
									}}
								/>
							</div>
						</div>
					</div>
				</div>
				<div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
					<div className="flex justify-end space-x-3">
						<button
							onClick={handleClose}
							disabled={isLoading}
							className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Đóng
						</button>
						<button
							onClick={onCancel}
							disabled={isLoading}
							className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Hủy cập nhật
						</button>
						<button
							onClick={handleConfirm}
							disabled={isLoading}
							className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
						>
							{isLoading ? (
								<>
									<svg
										className="animate-spin h-4 w-4 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									<span>Đang xử lý...</span>
								</>
							) : (
								<span>Xác nhận cập nhật</span>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Card Scan Dialog */}
			{showCardScanDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
					<div className="bg-white rounded-lg shadow-2xl p-8 w-[450px] relative">
						<h2 className="text-2xl font-bold mb-6 text-center text-gray-800 flex items-center justify-center gap-2">
							<span className="text-3xl">💳</span>
							<span>Quét thẻ từ</span>
						</h2>

						<div className="mb-6 text-center">
							<p className="text-gray-600 mb-4">Vui lòng quét thẻ từ của bạn để ký xác nhận</p>

							{/* Hidden input for card scanner */}
							<input
								ref={cardInputRef}
								type="text"
								value={cardId}
								onChange={(e) => setCardId(e.target.value)}
								onKeyDown={handleCardScan}
								className="opacity-0 absolute pointer-events-none"
								autoFocus
							/>

							{/* Visual indicator */}
							<div className="relative">
								<div className="w-full h-32 border-4 border-dashed border-blue-400 rounded-lg flex items-center justify-center bg-blue-50 animate-pulse">
									{isSigningIn ? (
										<div className="text-center">
											<svg
												className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-2"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												></circle>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
											<p className="text-blue-600 font-semibold">Đang xử lý...</p>
										</div>
									) : (
										<div className="text-center">
											<svg
												className="w-16 h-16 text-blue-500 mx-auto mb-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
												/>
											</svg>
											<p className="text-blue-600 font-semibold text-lg">Đang chờ quét thẻ...</p>
										</div>
									)}
								</div>
							</div>

							{cardId && !isSigningIn && (
								<div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
									<p className="text-green-700 text-sm font-medium">✓ Đã đọc thẻ: {cardId}</p>
								</div>
							)}
						</div>

						<div className="flex justify-end gap-3">
							<button
								onClick={handleCloseCardScan}
								disabled={isSigningIn}
								className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Hủy
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Extract Report Dialog */}
			{showExtractDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70]">
					<div className="bg-white rounded-lg shadow-2xl p-8 w-[500px]">
						<h2 className="text-2xl font-bold mb-6 text-center text-gray-800 flex items-center justify-center gap-2">
							<span className="text-3xl">📄</span>
							<span>Trích xuất báo cáo</span>
						</h2>

						<div className="mb-6">
							{hasResultValueChanges ? (
								<>
									<div className="mb-4 p-3 bg-orange-50 border border-orange-300 rounded-lg">
										<p className="text-orange-800 font-semibold text-center mb-2">⚠️ Có thay đổi kết quả thử nghiệm</p>
										<p className="text-sm text-orange-700 text-center">
											Vì có thay đổi giá trị kết quả (resultValue), bạn bắt buộc phải trích xuất và tải xuống báo cáo
											PDF.
										</p>
									</div>
									<p className="text-sm text-gray-500 text-center">
										Hệ thống sẽ tạo file PDF đã phân trang và tự động tải xuống
									</p>
								</>
							) : (
								<>
									<p className="text-gray-700 text-center mb-4">
										Bạn có muốn trích xuất báo cáo PDF và tải xuống không?
									</p>
									<p className="text-sm text-gray-500 text-center">
										Nếu chọn "Có", hệ thống sẽ tạo file PDF đã phân trang và tự động tải xuống
									</p>
								</>
							)}
						</div>

						<div className="flex justify-center gap-3">
							<button
								onClick={() => setShowExtractDialog(false)}
								disabled={isConfirming}
								className="px-6 py-2.5 text-sm bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								<span>← Quay lại</span>
							</button>
							{!hasResultValueChanges && (
								<button
									onClick={handleConfirmUpdate}
									disabled={isConfirming}
									className="px-6 py-2.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{isConfirming ? (
										<>
											<svg
												className="animate-spin h-4 w-4"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												></circle>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
											<span>Đang xử lý...</span>
										</>
									) : (
										<span>Không, chỉ cập nhật</span>
									)}
								</button>
							)}
							<button
								onClick={handleExtractAndPrint}
								disabled={isConfirming}
								className="px-6 py-2.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{isConfirming ? (
									<>
										<svg
											className="animate-spin h-4 w-4"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										<span>Đang xử lý...</span>
									</>
								) : (
									<>
										<span>�</span>
										<span>Có, tạo PDF và tải xuống</span>
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ConfirmLabResult;
