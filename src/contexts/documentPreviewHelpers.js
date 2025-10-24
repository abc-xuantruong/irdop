/**
 * Document Preview Helper Functions
 * Simplified pagination for TinyMCE content
 * A4 at 96 DPI: 1123px height x 794px width
 */

// A4 Configuration at 96 DPI (210mm x 297mm)
const A4_CONFIG = {
	width: 794, // 210mm at 96 DPI
	height: 1123, // 297mm at 96 DPI
	topMargin: 1.5, // cm
	bottomMargin: 1, // cm
	leftMargin: 2, // cm
	rightMargin: 1, // cm
};

// Convert cm to px at 96 DPI (1cm = 37.795px)
const cmToPx = (cm) => cm * 37.795;

// Header and Footer heights (approximate)
const HEADER_HEIGHT = 60; // px (logo 1cm = ~38px + padding + border)
const FOOTER_HEIGHT = 40; // px (1 line of text + border)

/**
 * Generate document fingerprint: DocRMYYMMDD + 4 random lowercase letters
 */
const generateDocumentFingerprint = () => {
	const now = new Date();
	const year = now.getFullYear().toString().slice(-2); // YY
	const month = String(now.getMonth() + 1).padStart(2, '0'); // MM
	const day = String(now.getDate()).padStart(2, '0'); // DD

	// Generate 4 random lowercase letters
	const randomChars = Array.from({ length: 4 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join(
		'',
	);

	return `DocRM${year}${month}${day}${randomChars}`;
};

/**
 * Format current date and time
 */
const formatDateTime = () => {
	const now = new Date();
	const day = String(now.getDate()).padStart(2, '0');
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const year = now.getFullYear();
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');

	return `${day}/${month}/${year} - ${hours}:${minutes}`;
};

/**
 * Measure content elements in hidden DOM using getComputedStyle
 */
export const measureContentInDOM = async (contentHTML) => {
	return new Promise((resolve) => {
		// Create measurement container
		const container = document.createElement('div');
		container.style.cssText = `
			position: absolute;
			left: -9999px;
			top: 0;
			width: ${A4_CONFIG.width - cmToPx(A4_CONFIG.leftMargin + A4_CONFIG.rightMargin)}px;
			visibility: hidden;
			font-family: 'Times New Roman', Times, serif;
			font-size: 12px;
			line-height: 1.5;
			box-sizing: border-box;
		`;
		document.body.appendChild(container);

		// Insert content
		container.innerHTML = contentHTML;

		// Calculate available height (subtract margins, header, and footer)
		const availableHeight =
			A4_CONFIG.height - cmToPx(A4_CONFIG.topMargin) - cmToPx(A4_CONFIG.bottomMargin) - HEADER_HEIGHT - FOOTER_HEIGHT;

		// Get all top-level elements
		const elements = Array.from(container.children);

		// Measure each element using getComputedStyle
		const measurements = elements.map((element) => {
			const computedStyle = window.getComputedStyle(element);

			// Get accurate height including margins
			const marginTop = parseFloat(computedStyle.marginTop) || 0;
			const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
			const height = element.offsetHeight + marginTop + marginBottom;

			const html = element.outerHTML;
			const isTable = element.tagName === 'TABLE' || element.querySelector('table') !== null;

			let tableInfo = null;
			if (isTable) {
				tableInfo = measureTableInfo(element);
			}

			return {
				height,
				html,
				isTable,
				tableInfo,
			};
		});

		// Cleanup
		document.body.removeChild(container);

		resolve({
			A4: A4_CONFIG,
			availableHeight,
			measurements,
		});
	});
};

/**
 * Measure table information for splitting using getComputedStyle
 */
const measureTableInfo = (element) => {
	const table = element.tagName === 'TABLE' ? element : element.querySelector('table');
	if (!table) return null;

	const thead = table.querySelector('thead');
	const tbody = table.querySelector('tbody');
	const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : Array.from(table.querySelectorAll('tr'));

	let headerHeight = 0;
	let headerHTML = '';

	if (thead) {
		const theadStyle = window.getComputedStyle(thead);
		const marginTop = parseFloat(theadStyle.marginTop) || 0;
		const marginBottom = parseFloat(theadStyle.marginBottom) || 0;
		headerHeight = thead.offsetHeight + marginTop + marginBottom;
		headerHTML = thead.outerHTML;
	} else if (rows.length > 0 && rows[0].querySelector('th')) {
		// First row might be header
		const rowStyle = window.getComputedStyle(rows[0]);
		const marginTop = parseFloat(rowStyle.marginTop) || 0;
		const marginBottom = parseFloat(rowStyle.marginBottom) || 0;
		headerHeight = rows[0].offsetHeight + marginTop + marginBottom;
		headerHTML = `<thead>${rows[0].outerHTML}</thead>`;
		rows.shift(); // Remove header row from data rows
	}

	// Measure each row height for pagination calculation only
	const rowHeights = rows.map((row) => {
		const rowStyle = window.getComputedStyle(row);
		const marginTop = parseFloat(rowStyle.marginTop) || 0;
		const marginBottom = parseFloat(rowStyle.marginBottom) || 0;

		// offsetHeight already includes padding and border
		return row.offsetHeight + marginTop + marginBottom;
	});

	const rowsHtml = rows.map((row) => row.outerHTML);

	// Get table styles from original element
	const tableStyles = table.getAttribute('style') || '';

	return {
		headerHeight,
		headerHTML,
		rowHeights,
		rowsHtml,
		tableStyles,
		totalRows: rows.length,
	};
};

/**
 * Check if table contains signature
 */
const tableContainsSignature = (element) => {
	const html = element.html || element.outerHTML || '';
	return html.includes('Chữ ký') || html.includes('signature') || html.includes('ký xác nhận');
};

/**
 * Paginate content from top to bottom
 */
export const paginateContent = (measurements) => {
	const { availableHeight, measurements: elements } = measurements;

	const pages = [];
	let currentPage = {
		pageNumber: 1,
		elements: [],
		currentHeight: 0,
	};

	const SAFETY_MARGIN = 10; // Reduced margin for more efficient space usage
	const safeHeight = availableHeight - SAFETY_MARGIN;

	elements.forEach((element, elementIndex) => {
		// Check if this is a table that might need splitting
		if (element.isTable && element.tableInfo) {
			const tableInfo = element.tableInfo;
			const availableSpace = safeHeight - currentPage.currentHeight;

			// Check if table contains signature - if so, don't split it
			const containsSignature = tableContainsSignature(element);

			// Check if entire table fits in current page
			if (element.height <= availableSpace) {
				currentPage.elements.push(element);
				currentPage.currentHeight += element.height;
			} else if (containsSignature) {
				// Table contains signature and doesn't fit - move entire table to next page
				if (currentPage.elements.length > 0) {
					pages.push(currentPage);
				}
				currentPage = {
					pageNumber: pages.length + 1,
					elements: [element],
					currentHeight: element.height,
				};
			} else {
				// Table needs to be split (normal behavior for non-signature tables)
				// Check if there's enough space for header + first row + small margin (10px)
				const firstRowHeight = tableInfo.rowHeights[0] || 30;
				const minSpaceNeeded = tableInfo.headerHeight + firstRowHeight + 10;

				// If available space is NOT enough for header + first row + 10px,
				// move entire table to next page
				if (availableSpace < minSpaceNeeded) {
					// Not enough space to split meaningfully - move entire table to next page
					if (currentPage.elements.length > 0) {
						pages.push(currentPage);
					}

					// Check if entire table fits in a fresh page
					if (element.height <= safeHeight) {
						// Table fits in one page
						currentPage = {
							pageNumber: pages.length + 1,
							elements: [element],
							currentHeight: element.height,
						};
					} else {
						// Table still needs splitting even on fresh page
						const tableParts = splitTable(tableInfo, safeHeight, safeHeight);

						// Add first part to new page
						currentPage = {
							pageNumber: pages.length + 1,
							elements: [
								{
									...element,
									html: tableParts[0].html,
									height: tableParts[0].height,
								},
							],
							currentHeight: tableParts[0].height,
						};

						// Add remaining parts to subsequent pages
						for (let i = 1; i < tableParts.length; i++) {
							pages.push(currentPage);
							currentPage = {
								pageNumber: pages.length + 1,
								elements: [
									{
										...element,
										html: tableParts[i].html,
										height: tableParts[i].height,
									},
								],
								currentHeight: tableParts[i].height,
							};
						}
					}
				} else {
					// Enough space to split - proceed with normal splitting
					const tableParts = splitTable(tableInfo, availableSpace, safeHeight);

					tableParts.forEach((part, partIndex) => {
						if (partIndex === 0) {
							// First part goes to current page
							currentPage.elements.push({
								...element,
								html: part.html,
								height: part.height,
							});
							currentPage.currentHeight += part.height;
						} else {
							// Start new page for this part
							if (currentPage.elements.length > 0) {
								pages.push(currentPage);
							}
							currentPage = {
								pageNumber: pages.length + 1,
								elements: [
									{
										...element,
										html: part.html,
										height: part.height,
									},
								],
								currentHeight: part.height,
							};
						}
					});
				}
			}
		} else {
			// Non-table element
			if (currentPage.currentHeight + element.height <= safeHeight) {
				// Fits in current page
				currentPage.elements.push(element);
				currentPage.currentHeight += element.height;
			} else {
				// Start new page
				if (currentPage.elements.length > 0) {
					pages.push(currentPage);
				}
				currentPage = {
					pageNumber: pages.length + 1,
					elements: [element],
					currentHeight: element.height,
				};
			}
		}
	});

	// Add last page
	if (currentPage.elements.length > 0) {
		pages.push(currentPage);
	}

	return pages;
};

/**
 * Split table across multiple pages
 */
const splitTable = (tableInfo, firstPageSpace, pageHeight) => {
	const { headerHTML, rowsHtml, rowHeights, headerHeight, tableStyles } = tableInfo;
	const parts = [];

	// Reduce safety margin for more efficient space usage
	const TABLE_SAFETY_MARGIN = 10; // Reduced from 20 to 10
	const safeFirstPageSpace = Math.max(0, firstPageSpace - TABLE_SAFETY_MARGIN);
	const safePageHeight = Math.max(0, pageHeight - TABLE_SAFETY_MARGIN);

	let currentPageRows = [];
	let currentHeight = 0;
	let maxHeight = safeFirstPageSpace;
	let isFirstPart = true;

	rowsHtml.forEach((rowHtml, index) => {
		const rowHeight = rowHeights[index] || 30;
		const neededHeight = (currentPageRows.length === 0 ? headerHeight : 0) + rowHeight;

		// Check if we need to start a new page
		if (currentHeight + neededHeight > maxHeight && currentPageRows.length > 0) {
			// Save current part
			const tableHTML = createTableHTML(headerHTML, currentPageRows.join(''), tableStyles);
			parts.push({
				html: tableHTML,
				height: currentHeight,
			});

			// Start new part
			currentPageRows = [rowHtml];
			currentHeight = headerHeight + rowHeight;
			maxHeight = safePageHeight;
			isFirstPart = false;
		} else {
			// Add row to current page
			if (currentPageRows.length === 0) {
				currentHeight = headerHeight + rowHeight;
			} else {
				currentHeight += rowHeight;
			}
			currentPageRows.push(rowHtml);
		}
	});

	// Add last part
	if (currentPageRows.length > 0) {
		const tableHTML = createTableHTML(headerHTML, currentPageRows.join(''), tableStyles);
		parts.push({
			html: tableHTML,
			height: currentHeight,
		});
	}

	return parts;
};

/**
 * Create table HTML with header and rows
 * Height is automatically calculated from header + rows, no need to set it
 */
const createTableHTML = (headerHTML, rowsHTML, tableStyles) => {
	// Use original table styles if available, otherwise set minimal defaults
	let styles = tableStyles || 'border-collapse: collapse; width: 100%;';

	// Remove any height constraints from table styles to prevent overflow
	styles = styles.replace(/height\s*:\s*[^;]+;?/gi, '');
	styles = styles.replace(/min-height\s*:\s*[^;]+;?/gi, '');
	styles = styles.replace(/max-height\s*:\s*[^;]+;?/gi, '');

	return `
<table style="${styles}">
	${headerHTML}
	<tbody>
		${rowsHTML}
	</tbody>
</table>`;
};

/**
 * Generate preview HTML
 */
export const generatePreviewHTML = (pages, config) => {
	const { A4 } = config;

	// Calculate positions in px
	const topMarginPx = cmToPx(A4.topMargin);
	const bottomMarginPx = cmToPx(A4.bottomMargin);
	const leftMarginPx = cmToPx(A4.leftMargin);
	const rightMarginPx = cmToPx(A4.rightMargin);

	// Content dimensions (subtract header and footer)
	const contentWidth = A4.width - leftMarginPx - rightMarginPx;
	const contentHeight = A4.height - topMarginPx - bottomMarginPx - HEADER_HEIGHT - FOOTER_HEIGHT;

	// Generate document fingerprint and timestamp (once for entire document)
	const docFingerprint = generateDocumentFingerprint();
	const createdAt = formatDateTime();

	const css = `
		@page { size: A4; margin: 0; }
		
		* {
			box-sizing: border-box;
		}
		
		html, body { 
			margin: 0; 
			padding: 0; 
			font-family: 'Times New Roman', Times, serif;
			font-size: 12px;
			line-height: 1.5;
		}
		
		.print-container { 
			width: ${A4.width}px; 
			margin: 20px auto; 
			background-color: #f0f0f0;
			padding: 20px;
		}
		
		.a4-page { 
			position: relative; 
			width: ${A4.width}px; 
			height: ${A4.height}px; 
			box-sizing: border-box; 
			page-break-after: always; 
			background-color: white; 
			padding: ${topMarginPx}px ${rightMarginPx}px ${bottomMarginPx}px ${leftMarginPx}px;
			overflow: hidden; 
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
			margin-bottom: 20px;
		}
		
		.a4-page:last-child {
			page-break-after: auto;
		}
		
		.page-content { 
			width: ${contentWidth}px;
			height: ${contentHeight}px;
			overflow: hidden;
		}
		
		.page-header {
			width: ${contentWidth}px;
			height: ${HEADER_HEIGHT}px;
			border-bottom: 2px solid #333;
			padding-bottom: 5px;
			margin-bottom: 10px;
		}
		
		.page-header table {
			width: 100%;
			border-collapse: collapse;
		}
		
		.page-header td {
			vertical-align: middle;
			padding: 5px;
		}
		
		.page-header .logo-cell {
			width: 40%;
			text-align: left;
		}
		
		.page-header .logo-cell img {
			height: ${cmToPx(1.2)}px;
			width: auto;
		}
		
		.page-header .title-cell {
			width: 60%;
			text-align: left;
			font-size: 16px;
			line-height: 1.4;
		}
		
		.page-header .title-vi {
			color: #005a9c;
			font-weight: bold;
			margin-bottom: 2px;
		}
		
		.page-header .title-en {
			color: #333;
			font-style: italic;
		}
		
		.page-footer {
			width: ${contentWidth}px;
			height: ${FOOTER_HEIGHT}px;
			border-top: 2px solid #333;
			padding-top: 5px;
			margin-top: 10px;
			position: absolute;
			bottom: ${bottomMarginPx}px;
			left: ${leftMarginPx}px;
		}
		
		.footer-info {
			font-size: 13px;
			color: #666;
			line-height: 1.5;
		}
		
		.footer-fingerprint {
			margin-bottom: 3px;
		}
		
		.footer-page-number {
			position: absolute;
			right: 0;
			bottom: 5px;
			font-size: 10px;
			color: #666;
		}
		
		/* Only set essential table properties, let content styles take precedence */
		table { 
			page-break-inside: avoid;
		}
		
		table tr { 
			page-break-inside: avoid; 
		}
		
		/* Don't override table cell styles - they come from TinyMCE content */
		
		p { 
			margin: 2px 0; 
		}
		
		h1, h2, h3, h4, h5, h6 {
			margin-top: 10px;
			margin-bottom: 5px;
		}
		
		@media print { 
			.print-container {
				background-color: white;
				padding: 0;
				margin: 0;
			}
			.a4-page { 
				box-shadow: none;
				margin: 0;
				padding: ${topMarginPx}px ${rightMarginPx}px ${bottomMarginPx}px ${leftMarginPx}px;
			}
			body { 
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
		}
	`;

	let pagesHTML = '';
	const totalPages = pages.length;

	pages.forEach((page, index) => {
		// Generate content for this page
		const pageContent = page.elements.map((el) => el.html).join('\n');

		pagesHTML += `
<div class="a4-page">
	<div class="page-header">
		<table>
			<tr>
				<td class="logo-cell">
					<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-Sqy_SEcWNULoKHEf6kTPhoxbd0NuhB26gg&s" alt="IRDOP Logo" />
				</td>
				<td class="title-cell">
					<div class="title-vi">Viện nghiên cứu và phát triển Sản phẩm thiên nhiên</div>
					<div class="title-en">/ Institute for Research and Development of Organic Products</div>
				</td>
			</tr>
		</table>
	</div>
	<div class="page-content">
		${pageContent}
	</div>
	<div class="page-footer">
		<div class="footer-info">
			<div class="footer-fingerprint">
				<strong>Mã xuất bản tài liệu / Document fingerprint:</strong> ${docFingerprint}
				&nbsp;&nbsp;&nbsp;
				<strong>Ngày tạo / Created at:</strong> ${createdAt}
			</div>
		</div>
		<div class="footer-page-number">
			Trang / Pages ${page.pageNumber} / ${totalPages}
		</div>
	</div>
</div>`;
	});

	return `
<!DOCTYPE html>
<html>
<head>
	<title>Preview - Document</title>
	<meta charset="utf-8">
	<style>${css}</style>
</head>
<body>
	<div class="print-container">
		${pagesHTML}
	</div>
</body>
</html>`;
};

/**
 * Open preview in new window
 */
export const openPreviewWindow = (htmlContent) => {
	const previewWindow = window.open('', '_blank', 'width=900,height=1200,menubar=yes,toolbar=yes');
	if (previewWindow) {
		previewWindow.document.write(htmlContent);
		previewWindow.document.close();
	} else {
		alert('Vui lòng cho phép popup để xem preview');
	}
};

/**
 * Main function to generate and open preview
 */
export const previewDocument = async (contentHTML) => {
	try {
		// Measure content
		const measurements = await measureContentInDOM(contentHTML);

		// Paginate
		const pages = paginateContent(measurements);

		// Generate HTML
		const previewHTML = generatePreviewHTML(pages, measurements);

		// Open preview
		openPreviewWindow(previewHTML);
	} catch (error) {
		console.error('Preview error:', error);
		alert('Có lỗi khi tạo preview: ' + error.message);
	}
};
