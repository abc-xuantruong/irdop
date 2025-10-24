import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiPost } from '../contexts/helperFunctionCallAPI';

const LabResultReport = () => {
	const [searchParams] = useSearchParams();
	const receiptId = searchParams.get('receiptId');
	const [receipt, setReceipt] = useState(null);
	const [loading, setLoading] = useState(true);
	const [selectValue, setSelectValue] = useState('IRDOP'); // 'IRDOP' or 'ALL'
	const contentRef = useRef(null);

	// A4 Configuration at 96 DPI
	const A4_CONFIG = {
		width: 794, // 210mm at 96 DPI (3.78px/mm)
		height: 1122, // 297mm at 96 DPI
		topMargin: 37.8, // 1cm = 37.8px at 96 DPI
		bottomMargin: 37.8, // 1cm
		leftMargin: 75.6, // 2cm
		rightMargin: 37.8, // 1cm
	};

	useEffect(() => {
		const fetchReceipt = async () => {
			try {
				const response = await apiPost('https://red.irdop.org/v1/receipt/get/full', {
					receiptId: receiptId,
				});
				if (response.status === 200) {
					setReceipt(response.data);
				}
			} catch (error) {
				console.error('Error fetching receipt:', error);
			} finally {
				setLoading(false);
			}
		};

		if (receiptId) {
			fetchReceipt();
		}
	}, [receiptId]);

	const measureElement = (element) => {
		const computedStyle = window.getComputedStyle(element);
		const marginTop = parseFloat(computedStyle.marginTop) || 0;
		const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
		return {
			height: element.offsetHeight + marginTop + marginBottom,
			element: element.cloneNode(true),
		};
	};

	const splitTableRows = (table, availableHeight) => {
		const thead = table.querySelector('thead');
		const tbody = table.querySelector('tbody');
		const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

		if (!thead || rows.length === 0) {
			return [table.cloneNode(true)];
		}

		const headerHeight = thead.offsetHeight;
		const parts = [];
		let currentRows = [];
		let currentHeight = 0;

		rows.forEach((row) => {
			const rowHeight = row.offsetHeight;
			const neededHeight = (currentRows.length === 0 ? headerHeight : 0) + rowHeight;

			if (currentHeight + neededHeight > availableHeight && currentRows.length > 0) {
				// Create table part with current rows
				const tablePart = document.createElement('table');
				tablePart.className = table.className;
				tablePart.style.cssText = table.style.cssText;
				tablePart.appendChild(thead.cloneNode(true));
				const tbodyPart = document.createElement('tbody');
				currentRows.forEach((r) => tbodyPart.appendChild(r.cloneNode(true)));
				tablePart.appendChild(tbodyPart);
				parts.push(tablePart);

				// Start new part
				currentRows = [row];
				currentHeight = headerHeight + rowHeight;
			} else {
				if (currentRows.length === 0) {
					currentHeight = headerHeight + rowHeight;
				} else {
					currentHeight += rowHeight;
				}
				currentRows.push(row);
			}
		});

		// Add last part
		if (currentRows.length > 0) {
			const tablePart = document.createElement('table');
			tablePart.className = table.className;
			tablePart.style.cssText = table.style.cssText;
			tablePart.appendChild(thead.cloneNode(true));
			const tbodyPart = document.createElement('tbody');
			currentRows.forEach((r) => tbodyPart.appendChild(r.cloneNode(true)));
			tablePart.appendChild(tbodyPart);
			parts.push(tablePart);
		}

		return parts;
	};

	const paginateContent = () => {
		if (!contentRef.current) return [];

		const contentDiv = contentRef.current;
		const children = Array.from(contentDiv.children);

		// Calculate available content height per page
		const availableHeight = A4_CONFIG.height - A4_CONFIG.topMargin - A4_CONFIG.bottomMargin;

		const pages = [];
		let currentPage = [];
		let currentPageHeight = 0;

		children.forEach((child) => {
			const isTable = child.querySelector('table') !== null;
			const measurement = measureElement(child);

			if (isTable) {
				const table = child.querySelector('table');
				const tableHeight = measurement.height;

				// Check if table fits in current page
				if (currentPageHeight + tableHeight <= availableHeight) {
					currentPage.push(measurement.element);
					currentPageHeight += tableHeight;
				} else {
					// Split table across pages
					const availableSpace = availableHeight - currentPageHeight;
					const tableParts = splitTableRows(table, availableSpace);

					tableParts.forEach((tablePart, index) => {
						const wrapper = document.createElement('div');
						wrapper.className = child.className;
						wrapper.style.cssText = child.style.cssText;
						wrapper.appendChild(tablePart);

						const partHeight = tablePart.offsetHeight || 0;

						if (index === 0 && availableSpace > 100) {
							// First part goes to current page
							currentPage.push(wrapper);
							currentPageHeight += partHeight;
						} else {
							// Start new page
							if (currentPage.length > 0) {
								pages.push(currentPage);
							}
							currentPage = [wrapper];
							currentPageHeight = partHeight;
						}
					});
				}
			} else {
				// Non-table element
				if (currentPageHeight + measurement.height <= availableHeight) {
					currentPage.push(measurement.element);
					currentPageHeight += measurement.height;
				} else {
					// Start new page
					if (currentPage.length > 0) {
						pages.push(currentPage);
					}
					currentPage = [measurement.element];
					currentPageHeight = measurement.height;
				}
			}
		});

		// Add last page
		if (currentPage.length > 0) {
			pages.push(currentPage);
		}

		return pages;
	};

	const generatePreviewHTML = (pages) => {
		const css = `
			@page { size: A4; margin: 0; }
			
			* {
				font-family: Arial, sans-serif !important;
				box-sizing: border-box;
			}
			
			html, body { 
				margin: 0; 
				padding: 0; 
			}
			
			.print-container { 
				width: ${A4_CONFIG.width}px; 
				margin: 0 auto; 
				background-color: white; 
			}
			
			.a4-page { 
				position: relative; 
				width: ${A4_CONFIG.width}px; 
				height: ${A4_CONFIG.height}px; 
				padding: ${A4_CONFIG.topMargin}px ${A4_CONFIG.rightMargin}px ${A4_CONFIG.bottomMargin}px ${A4_CONFIG.leftMargin}px;
				box-sizing: border-box; 
				page-break-after: always; 
				background-color: white; 
				border: 1px solid #ccc;
				overflow: hidden;
			}
			
			table { 
				border-collapse: collapse; 
				width: 100%;
				margin: 8px 0;
			}
			
			table td, table th { 
				padding: 4px 8px; 
				border: 1px solid #999; 
			}
			
			table th {
				background-color: #f3f4f6;
			}
			
			.mb-4 {
				margin-bottom: 16px;
			}
			
			.mb-6 {
				margin-bottom: 24px;
			}
			
			.mt-2 {
				margin-top: 8px;
			}
			
			.mt-8 {
				margin-top: 32px;
			}
			
			.text-center {
				text-align: center;
			}
			
			.font-bold {
				font-weight: bold;
			}
			
			.text-lg {
				font-size: 18px;
			}
			
			.text-xl {
				font-size: 20px;
			}
			
			@media print { 
				.a4-page { border: none; } 
				body { -webkit-print-color-adjust: exact; }
			}
		`;

		let pagesHTML = '';
		pages.forEach((page, index) => {
			const pageContent = page.map((el) => el.outerHTML).join('');
			pagesHTML += `
				<div class="a4-page">
					${pageContent}
				</div>
			`;
		});

		return `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Preview - Biên Bản Thử Nghiệm</title>
				<meta charset="utf-8">
				<style>${css}</style>
			</head>
			<body>
				<div class="print-container">
					${pagesHTML}
				</div>
			</body>
			</html>
		`;
	};

	const handlePreview = () => {
		try {
			const pages = paginateContent();
			const htmlContent = generatePreviewHTML(pages);

			const previewWindow = window.open('', '_blank', 'width=900,height=1200');
			if (previewWindow) {
				previewWindow.document.write(htmlContent);
				previewWindow.document.close();
			} else {
				alert('Vui lòng cho phép popup để xem preview');
			}
		} catch (error) {
			console.error('Error generating preview:', error);
			alert('Có lỗi xảy ra khi tạo preview');
		}
	};

	const handleSelectChange = (e) => {
		setSelectValue(e.target.value);
	};

	if (loading) {
		return <div className="flex justify-center items-center h-screen">Loading...</div>;
	}

	if (!receipt) {
		return <div className="flex justify-center items-center h-screen">Receipt not found</div>;
	}

	// Filter analyses based on select value
	const filteredAnalyses = receipt.samples.flatMap((sample) =>
		sample.analyses.filter(
			(analysis) => selectValue === 'ALL' || (analysis.protocolSource && analysis.protocolSource.includes('IRDOP')),
		),
	);

	// Get unique docIds for the report
	const uniqueDocIds = [...new Set(filteredAnalyses.map((analysis) => analysis.docId).filter(Boolean))].join(', ');

	return (
		<div className="p-4">
			<div className="mb-4 flex gap-4">
				<button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" onClick={handlePreview}>
					Preview
				</button>
				<select value={selectValue} onChange={handleSelectChange} className="border border-gray-300 px-3 py-2 rounded">
					<option value="IRDOP">IRDOP</option>
					<option value="ALL">ALL</option>
				</select>
			</div>

			<div
				ref={contentRef}
				className="bg-white border border-gray-300"
				style={{
					width: '794px',
					margin: '37.8px 37.8px 37.8px 75.6px', // 1cm top, 1cm right, 1cm bottom, 2cm left
					padding: '20px',
					fontFamily: 'Arial, sans-serif',
					fontSize: '14px',
					lineHeight: '1.5',
				}}
			>
				<div className="text-center mb-6">
					<div className="font-bold text-lg mb-2">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
					<div className="font-bold">Độc lập – Tự do – Hạnh phúc</div>
				</div>

				<div className="text-center font-bold text-xl mb-6">BIÊN BẢN THỬ NGHIỆM</div>

				<div className="mb-4">
					<strong>Mã biên bản:</strong> {receipt.receiptId}
				</div>

				<div className="mb-4">
					<strong>1. Nơi thực hiện thử nghiệm:</strong>
					<br />
					- Trung tâm / phòng thí nghiệm: VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN
					<br />- Địa chỉ: 12 Phùng Khoang 2, P. Đại Mỗ, TP. Hà Nội, Việt Nam
				</div>

				<div className="mb-4">
					<strong>2. Mẫu thử nghiệm:</strong>
					<br />
					Các mẫu thử nghiệm có trong danh sách sau:
					<table className="w-full border-collapse border border-gray-400 mt-2">
						<thead>
							<tr className="bg-gray-100">
								<th className="border border-gray-400 px-2 py-1 text-center">TT</th>
								<th className="border border-gray-400 px-2 py-1 text-center">Mã mẫu</th>
								<th className="border border-gray-400 px-2 py-1 text-center">Tên mẫu</th>
								<th className="border border-gray-400 px-2 py-1 text-center">Số lượng phép thử</th>
							</tr>
						</thead>
						<tbody>
							{receipt.samples.map((sample, index) => {
								const sampleAnalyses = sample.analyses.filter(
									(analysis) =>
										selectValue === 'ALL' || (analysis.protocolSource && analysis.protocolSource.includes('IRDOP')),
								);
								return (
									<tr key={sample.sampleId}>
										<td className="border border-gray-400 px-2 py-1 text-center">{index + 1}</td>
										<td className="border border-gray-400 px-2 py-1">{sample.sampleId}</td>
										<td className="border border-gray-400 px-2 py-1">{sample.sampleName}</td>
										<td className="border border-gray-400 px-2 py-1 text-center">{sampleAnalyses.length}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				<div className="mb-4">
					<strong>3. Quá trình thử nghiệm:</strong>
					<br />
					- Điều kiện thực hiện thử nghiệm: điều kiện bình thường.
					<br />- Các thiết bị, dụng cụ, hóa chất, tài liệu áp dụng và quy trình thực hiện được ghi trong nhật ký thử
					nghiệm có mã: {uniqueDocIds}
					<br />- Thời gian thực hiện thử nghiệm:
				</div>

				<div className="mb-4">
					<strong>4. Kết quả thử nghiệm:</strong>
					<br />
					Kết quả thực hiện thử nghiệm trong danh sách sau:
					<table className="w-full border-collapse border border-gray-400 mt-2">
						<thead>
							<tr className="bg-gray-100">
								<th className="border border-gray-400 px-2 py-1 text-center">TT</th>
								<th className="border border-gray-400 px-2 py-1 text-center">Mã mẫu</th>
								<th className="border border-gray-400 px-2 py-1 text-center">Phép thử</th>
								<th className="border border-gray-400 px-2 py-1 text-center">Phương pháp thử</th>
								<th className="border border-gray-400 px-2 py-1 text-center">Kết quả</th>
								<th className="border border-gray-400 px-2 py-1 text-center">Đơn vị</th>
								<th className="border border-gray-400 px-2 py-1 text-center">Mã nhật ký</th>
							</tr>
						</thead>
						<tbody>
							{filteredAnalyses.map((analysis, index) => (
								<tr key={analysis.id}>
									<td className="border border-gray-400 px-2 py-1 text-center">{index + 1}</td>
									<td className="border border-gray-400 px-2 py-1">
										{receipt.samples.find((s) => s.sampleId === analysis.sampleId)?.sampleId}
									</td>
									<td className="border border-gray-400 px-2 py-1">{analysis.parameterName}</td>
									<td className="border border-gray-400 px-2 py-1">{analysis.protocolCode}</td>
									<td className="border border-gray-400 px-2 py-1">{analysis.resultValue || ''}</td>
									<td className="border border-gray-400 px-2 py-1">{analysis.resultUnit || ''}</td>
									<td className="border border-gray-400 px-2 py-1">{analysis.docId || ''}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="mt-8 flex justify-between">
					<div>
						<strong>Ngày lập biên bản:</strong> {new Date().toLocaleDateString('vi-VN')}
					</div>
				</div>

				<div className="mt-8 flex justify-between">
					<div className="text-center">
						<strong>Người lập biên bản</strong>
						<br />
						(Ký ghi rõ họ tên)
					</div>
					<div className="text-center">
						<strong>Người xác nhận</strong>
						<br />
						(Ký ghi rõ họ tên)
					</div>
				</div>
			</div>
		</div>
	);
};

export default LabResultReport;
