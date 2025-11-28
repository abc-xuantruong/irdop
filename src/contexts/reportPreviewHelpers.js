/**
 * Report Preview Helper Functions
 * Contains all logic for measuring, paginating, and generating preview HTML for reports
 */

// A4 Configuration (210mm x 297mm at 3.78px/mm = 794px x 1122px)
const A4_CONFIG = {
	width: 794,
	height: 1122,
	topMargin: 10, // mm - 1cm
	bottomMargin: 6, // mm - 0.6cm
	leftMargin: 10, // mm - 1cm
	rightMargin: 10, // mm - 1cm
	headerSpacing: 15, // px
	footerSpacing: 20, // px
};

const mmToPx = (mm) => mm * 3.78;

/**
 * Measure sections using hidden DOM elements
 */
export const measureSectionsInDOM = async (headerHTML, contentHTML, footerHTML) => {
	return new Promise((resolve) => {
		const container = document.createElement('div');
		container.style.cssText = `
			position: absolute;
			left: -9999px;
			top: 0;
			width: ${A4_CONFIG.width}px;
			visibility: hidden;
			font-family: 'Wix Madefor Display', sans-serif;
		`;
		document.body.appendChild(container);

		// Measure header
		const headerDiv = document.createElement('div');
		headerDiv.innerHTML = headerHTML;
		headerDiv.style.cssText = `
			width: ${A4_CONFIG.width - mmToPx(A4_CONFIG.leftMargin + A4_CONFIG.rightMargin)}px;
			box-sizing: border-box;
		`;
		container.appendChild(headerDiv);
		const headerHeight = headerDiv.offsetHeight;

		// Measure footer
		const footerDiv = document.createElement('div');
		footerDiv.innerHTML = footerHTML;
		footerDiv.style.cssText = `
			width: ${A4_CONFIG.width - mmToPx(A4_CONFIG.leftMargin + A4_CONFIG.rightMargin)}px;
			box-sizing: border-box;
		`;
		container.appendChild(footerDiv);
		const footerHeight = footerDiv.offsetHeight;

		// Calculate available content height
		const availableContentHeight =
			A4_CONFIG.height -
			mmToPx(A4_CONFIG.topMargin) -
			mmToPx(A4_CONFIG.bottomMargin) -
			headerHeight -
			A4_CONFIG.headerSpacing -
			footerHeight -
			A4_CONFIG.footerSpacing;

		// Measure content sections
		const contentDiv = document.createElement('div');
		contentDiv.innerHTML = contentHTML;
		contentDiv.style.cssText = `
		width: ${A4_CONFIG.width - mmToPx(A4_CONFIG.leftMargin + A4_CONFIG.rightMargin)}px;
		box-sizing: border-box;
	`;
		container.appendChild(contentDiv);

		const sections = Array.from(contentDiv.children);

		// Helper function to check if element is a spacing div
		const isSpacingDiv = (element) => {
			if (element.tagName !== 'DIV') return false;
			const style = element.getAttribute('style') || '';
			const innerHTML = element.innerHTML.trim();

			// Check if it's an empty div with only height style (spacing div)
			const hasOnlyHeightStyle =
				/^[\s]*height:\s*(4mm|15px|1[0-9]px)[\s;]*(margin:\s*0[\s;]*)?(padding:\s*0[\s;]*)?[\s]*$/i.test(style);
			const isEmptyOrNbsp = innerHTML === '' || innerHTML === '&nbsp;';

			return hasOnlyHeightStyle && isEmptyOrNbsp;
		};

		// Filter out spacing divs
		const contentSections = sections.filter((section) => !isSpacingDiv(section));

		const sectionMeasurements = contentSections.map((section) => {
			const height = section.offsetHeight;
			const html = section.outerHTML;
			const isTable = section.querySelector('table') !== null;

			let tableInfo = null;
			if (isTable) {
				tableInfo = measureTableInfo(section);
			}

			return {
				height,
				html,
				isTable,
				tableInfo,
			};
		}); // Cleanup
		document.body.removeChild(container);

		resolve({
			A4: A4_CONFIG,
			headerHeight,
			footerHeight,
			availableContentHeight,
			sectionMeasurements,
			spacingHeight: 15, // spacing between sections
		});
	});
};

/**
 * Parse content HTML into sections
 */
export const parseContentSections = (contentHTML) => {
	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = contentHTML;
	return Array.from(tempDiv.children);
};

/**
 * Measure table information (header, rows, etc.)
 */
export const measureTableInfo = (tableContainer) => {
	const table = tableContainer.querySelector('table');
	if (!table) return null;

	const thead = table.querySelector('thead');
	const tbody = table.querySelector('tbody');
	const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

	let headerHeight = 0;
	let headerHTML = '';

	if (thead) {
		headerHeight = thead.offsetHeight;
		headerHTML = thead.outerHTML;
	}

	const rowHeights = rows.map((row) => row.offsetHeight);
	const rowsHtml = rows.map((row) => row.outerHTML);

	// Measure column widths
	const firstRow = rows[0];
	const columnWidths = firstRow ? Array.from(firstRow.querySelectorAll('td')).map((td) => td.offsetWidth) : [];

	return {
		headerHeight,
		headerHTML,
		rowHeights,
		rowsHtml,
		columnWidths,
		totalRows: rows.length,
	};
};

/**
 * Apply client-side pagination logic
 */
export const applyClientSidePagination = (headerHTML, contentHTML, footerHTML, measurements) => {
	const { availableContentHeight, sectionMeasurements, spacingHeight } = measurements;

	const SAFETY_MARGIN = 20;
	const safeContentHeight = availableContentHeight - SAFETY_MARGIN;

	// Calculate total content height
	let totalContentHeight = 0;
	sectionMeasurements.forEach((section) => {
		totalContentHeight += section.height + spacingHeight;
	});

	console.log('Total content height:', totalContentHeight, 'Safe content height:', safeContentHeight);

	// Check if single page is enough
	if (totalContentHeight <= safeContentHeight) {
		console.log('Using single page layout');
		return createSinglePage(sectionMeasurements, measurements);
	}

	// Check if content would fit in exactly 2 pages (rough estimate)
	const wouldBeTwoPages = totalContentHeight > safeContentHeight && totalContentHeight <= safeContentHeight * 2;

	// Only check special two-page layout if we're in the "two pages" range
	if (wouldBeTwoPages) {
		const twoPageResult = checkSpecialTwoPageLayout(sectionMeasurements, measurements, safeContentHeight);
		if (twoPageResult.canUse) {
			console.log('Using special two-page layout');
			return twoPageResult.pages;
		}
	}

	// Complex multi-page layout
	console.log('Using multi-page layout');
	return createMultiPageLayout(sectionMeasurements, measurements, safeContentHeight);
};

/**
 * Create single page layout
 */
const createSinglePage = (sections, measurements) => {
	return [
		{
			pageNumber: 1,
			sections: sections,
		},
	];
};

/**
 * Check if special two-page layout is possible
 */
const checkSpecialTwoPageLayout = (sections, measurements, safeContentHeight) => {
	console.log('=== Checking Two-Page Layout ===');
	console.log('Total sections:', sections.length);
	console.log('Safe content height:', safeContentHeight);

	sections.forEach((s, i) => {
		console.log(`Section ${i}: height=${s.height}, isTable=${s.isTable}`);
	});

	// Identify sections by their ID attributes
	const customerSectionIndex = sections.findIndex((s) => s.html.includes('id="customer-section"'));
	const sampleInfoIndex = sections.findIndex((s) => s.html.includes('id="sample-section"'));
	const analysisIndex = sections.findIndex((s) => s.html.includes('id="analysis-section"'));
	const notesIndex = sections.findIndex((s) => s.html.includes('id="notes-section"'));
	const signatureIndex = sections.findIndex((s) => s.html.includes('id="signature-section"'));
	const commentIndex = sections.findIndex((s) => s.html.includes('id="comment-section"'));

	console.log('\n=== Section Identification (by ID) ===');
	console.log('Section indices:', {
		customerSectionIndex,
		sampleInfoIndex,
		analysisIndex,
		notesIndex,
		signatureIndex,
		commentIndex,
	});

	// If we can't identify key sections, can't use special layout
	if (customerSectionIndex === -1 || analysisIndex === -1 || signatureIndex === -1) {
		console.log('❌ Cannot identify key sections');
		return { canUse: false };
	}

	// Calculate page 2 height: analysisSection + commentSection (if exists) + signatureSection + spacing
	let page2Height = 0;
	const page2Components = [];
	const { spacingHeight } = measurements;

	if (analysisIndex >= 0) {
		page2Height += sections[analysisIndex].height + spacingHeight;
		page2Components.push(`Analysis: ${sections[analysisIndex].height}px`);
	}
	if (commentIndex >= 0) {
		page2Height += sections[commentIndex].height + spacingHeight;
		page2Components.push(`Comment: ${sections[commentIndex].height}px`);
	}
	if (signatureIndex >= 0) {
		page2Height += sections[signatureIndex].height + spacingHeight;
		page2Components.push(`Signature: ${sections[signatureIndex].height}px`);
	}

	console.log('\n=== Page 2 Height Calculation ===');
	page2Components.forEach((comp) => console.log(comp));
	console.log('Total page 2 height:', page2Height);
	console.log('Safe content height:', safeContentHeight);
	console.log('Page 2 fits?', page2Height <= safeContentHeight);

	// MAIN CONDITION: If page 2 content (analysis + comment + signature) fits in one page
	if (page2Height <= safeContentHeight) {
		// Calculate page 1 height: customer + sample + "see next page" message + notes
		let page1Height = 0;
		const page1Components = [];
		const seeNextPageMessageHeight = 30; // Height of the "see next page" message

		if (customerSectionIndex >= 0) {
			page1Height += sections[customerSectionIndex].height + spacingHeight;
			page1Components.push(`Customer: ${sections[customerSectionIndex].height}px`);
		}
		if (sampleInfoIndex >= 0) {
			page1Height += sections[sampleInfoIndex].height + spacingHeight;
			page1Components.push(`Sample Info: ${sections[sampleInfoIndex].height}px`);
		}

		// Add "see next page" message height
		page1Height += seeNextPageMessageHeight + spacingHeight;
		page1Components.push(`See Next Page Message: ${seeNextPageMessageHeight}px`);

		if (notesIndex >= 0) {
			page1Height += sections[notesIndex].height + spacingHeight;
			page1Components.push(`Notes: ${sections[notesIndex].height}px`);
		}

		console.log('\n=== Page 1 Height Calculation ===');
		page1Components.forEach((comp) => console.log(comp));
		console.log('Total page 1 height:', page1Height);
		console.log('Page 1 fits?', page1Height <= safeContentHeight);

		// Check if page 1 also fits
		if (page1Height <= safeContentHeight) {
			console.log('\n✅ Two-page layout possible!');

			const page1Sections = [];
			const page2Sections = [];

			// Add to page 1
			if (customerSectionIndex >= 0) page1Sections.push(sections[customerSectionIndex]);
			if (sampleInfoIndex >= 0) page1Sections.push(sections[sampleInfoIndex]);

			// Add "See results on next page" message between sample and notes
			const seeNextPageMessage = {
				html: `<div style="text-align: center; padding: 8px 0; margin: 0;"><p style="margin: 0; font-size: 12px; font-style: italic; color: #666;">- Xem kết quả ở trang tiếp theo / See the results on the following page -</p></div>`,
				height: 30,
				isTable: false,
				tableInfo: null,
			};
			page1Sections.push(seeNextPageMessage);

			if (notesIndex >= 0) page1Sections.push(sections[notesIndex]);

			// Add to page 2
			if (analysisIndex >= 0) page2Sections.push(sections[analysisIndex]);
			if (commentIndex >= 0) page2Sections.push(sections[commentIndex]);
			if (signatureIndex >= 0) page2Sections.push(sections[signatureIndex]);

			return {
				canUse: true,
				pages: [
					{ pageNumber: 1, sections: page1Sections },
					{ pageNumber: 2, sections: page2Sections },
				],
			};
		} else {
			console.log('\n❌ Two-page layout not possible: Page 1 content exceeds available height');
		}
	} else {
		console.log('\n❌ Two-page layout not possible: Page 2 content exceeds available height');
	}

	return { canUse: false };
};

/**
 * Create multi-page layout with table splitting
 */
const createMultiPageLayout = (sections, measurements, safeContentHeight) => {
	const pages = [];
	let currentPage = {
		pageNumber: 1,
		sections: [],
		currentHeight: 0,
	};

	sections.forEach((section, index) => {
		const sectionWithSpacing = section.height + measurements.spacingHeight;

		// Check if this is a table that needs splitting
		if (section.isTable && section.tableInfo) {
			const tableInfo = section.tableInfo;
			const availableSpace = safeContentHeight - currentPage.currentHeight;

			// Check if entire table fits in current page
			if (sectionWithSpacing <= availableSpace) {
				currentPage.sections.push(section);
				currentPage.currentHeight += sectionWithSpacing;
			} else {
				// Table needs to be split
				const tableParts = splitTableAcrossPages(tableInfo, availableSpace, safeContentHeight);

				tableParts.forEach((part, partIndex) => {
					if (partIndex === 0 && availableSpace > tableInfo.headerHeight + 50) {
						// First part goes to current page
						currentPage.sections.push({ ...section, html: part.html, height: part.height });
						currentPage.currentHeight += part.height + measurements.spacingHeight;
					} else {
						// Start new page for remaining parts
						if (currentPage.sections.length > 0) {
							pages.push(currentPage);
						}
						currentPage = {
							pageNumber: pages.length + 1,
							sections: [{ ...section, html: part.html, height: part.height }],
							currentHeight: part.height + measurements.spacingHeight,
						};
					}
				});
			}
		} else {
			// Non-table section
			if (currentPage.currentHeight + sectionWithSpacing <= safeContentHeight) {
				currentPage.sections.push(section);
				currentPage.currentHeight += sectionWithSpacing;
			} else {
				// Start new page
				if (currentPage.sections.length > 0) {
					pages.push(currentPage);
				}
				currentPage = {
					pageNumber: pages.length + 1,
					sections: [section],
					currentHeight: sectionWithSpacing,
				};
			}
		}
	});

	// Add last page
	if (currentPage.sections.length > 0) {
		pages.push(currentPage);
	}

	return pages;
};

/**
 * Split table across multiple pages
 */
const splitTableAcrossPages = (tableInfo, firstPageSpace, pageHeight) => {
	const { headerHTML, rowsHtml, rowHeights, headerHeight, columnWidths } = tableInfo;
	const parts = [];

	const TABLE_SAFETY_MARGIN = 10;
	const safeFirstPageSpace = Math.max(0, firstPageSpace - TABLE_SAFETY_MARGIN);
	const safePageHeight = Math.max(0, pageHeight - TABLE_SAFETY_MARGIN);

	let currentPageRows = [];
	let currentHeight = 0;
	let maxHeight = safeFirstPageSpace;
	let isFirstPart = true;

	rowsHtml.forEach((rowHtml, index) => {
		const rowHeight = rowHeights[index] || 30;
		const neededHeight = (currentPageRows.length === 0 ? headerHeight : 0) + rowHeight;

		if (currentHeight + neededHeight > maxHeight && currentPageRows.length > 0) {
			// Save current part
			const tableHTML = createTableHTML(headerHTML, currentPageRows.join(''));
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
		const tableHTML = createTableHTML(headerHTML, currentPageRows.join(''));
		parts.push({
			html: tableHTML,
			height: currentHeight,
		});
	}

	return parts;
};

/**
 * Create table HTML with header and rows
 */
const createTableHTML = (headerHTML, rowsHTML) => {
	return `
<table style="width: 100%; border-collapse: collapse; text-align: left; margin:0; padding:0; font-size:12px;">
	${headerHTML}
	<tbody>
		${rowsHTML}
	</tbody>
</table>`;
};

/**
 * Generate preview HTML
 */
export const generatePreviewHTML = (
	pages,
	measurements,
	headerHTML,
	footerHTML,
	refNumber = null,
	sampleIds = null,
) => {
	const { A4, headerHeight, footerHeight } = measurements;

	// Check if watermark should be shown
	const shouldShowWatermark =
		!refNumber || refNumber === '' || refNumber.includes('DRAFT') || refNumber.includes('SƠ BỘ');

	// Calculate positions in px
	const topMarginPx = mmToPx(A4.topMargin);
	const bottomMarginPx = mmToPx(A4.bottomMargin);
	const leftMarginPx = mmToPx(A4.leftMargin);
	const rightMarginPx = mmToPx(A4.rightMargin);

	// Header position
	const headerTop = topMarginPx;

	// Content position (below header with spacing)
	const contentTop = headerTop + headerHeight + 15; // 15px gap

	// Footer position (at bottom with bottom margin)
	const footerBottom = bottomMarginPx;

	// Content max height (between header and footer)
	const contentMaxHeight = A4.height - topMarginPx - bottomMarginPx - headerHeight - footerHeight - 15 - 20; // gaps

	// Content width
	const contentWidth = A4.width - leftMarginPx - rightMarginPx;

	console.log('Layout calculations:', {
		headerTop,
		contentTop,
		contentMaxHeight,
		footerBottom,
		contentWidth,
	});

	const css = `
		@page { size: A4; margin: 0; }
		
		* {
			font-family: 'Wix Madefor Display', sans-serif !important;
		}
		
		html, body { 
			margin: 0; 
			padding: 0; 
			font-family: 'Wix Madefor Display', sans-serif !important;
		}
		
		.print-container { 
			width: 794px; 
			margin: 0px auto; 
			background-color: white; 
			font-family: 'Wix Madefor Display', sans-serif !important;
		}
		
		.a4-page { 
			position: relative; 
			width: 794px; 
			height: 1122px; 
			box-sizing: border-box; 
			page-break-after: always; 
			background-color: white; 
			padding: 0; 
			overflow: hidden; 
			border: 1px solid #000; 
			font-family: 'Wix Madefor Display', sans-serif !important;
		}
		
		.watermark {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%) rotate(-45deg);
			font-size: 80px;
			font-weight: bold;
			color: rgba(255, 0, 0, 0.15);
			white-space: nowrap;
			pointer-events: none;
			z-index: 999;
			user-select: none;
			text-align: center;
		}
		
		.header { 
			position: absolute;
			top: ${headerTop}px;
			left: ${leftMarginPx}px;
			width: ${contentWidth}px;
			box-sizing: border-box;
			z-index: 2;
		}
		
		.footer { 
			position: absolute;
			bottom: ${footerBottom}px;
			left: ${leftMarginPx}px;
			width: ${contentWidth}px;
			box-sizing: border-box;
			z-index: 2;
		}
		
		.content { 
			position: absolute;
			top: ${contentTop}px;
			left: ${leftMarginPx}px;
			width: ${contentWidth}px;
			max-height: ${contentMaxHeight}px;
			box-sizing: border-box;
			overflow: hidden;
			z-index: 1;
		}
		
		table { 
			border-collapse: collapse; 
			table-layout: fixed; 
			width: 100%; 
			page-break-inside: avoid;
		}
		
		table tr { 
			height: auto; 
			page-break-inside: avoid; 
		}
		
		table td, table th { 
			padding: 4px 8px; 
			border: 1px solid black; 
			vertical-align: middle; 
			line-height: 1.2; 
			box-sizing: border-box; 
		}
		
		p { 
			margin: 0; 
			overflow-wrap: anywhere; 
		}
		
		@media print { 
			.a4-page { border: none; } 
			body { -webkit-print-color-adjust: exact; }
			.watermark { color: rgba(255, 0, 0, 0.15) !important; }
		}
	`;

	let pagesHTML = '';
	const totalPages = pages.length;
	const spacing = `<div style="height: ${measurements.spacingHeight}px;"></div>`;

	pages.forEach((page, index) => {
		const pageNumber = (index + 1).toString().padStart(2, '0');
		const totalPagesStr = totalPages.toString().padStart(2, '0');

		console.log('Processing page:', { index, pageNumber, totalPagesStr, totalPages });

		// Update footer with correct page numbers - replace entire div containing page numbers
		let pageFooter = footerHTML;
		console.log('Original footer HTML (first 800 chars):', footerHTML.substring(0, 800));

		// Replace entire div containing "Trang / Pages:" and the page numbers
		// This handles TinyMCE's formatting where numbers are split into separate spans
		const pageContainerPattern = /<div[^>]*>\s*<span[^>]*>Trang \/ Pages:<\/span>[\s\S]*?<\/div>\s*<\/div>/;
		const match = footerHTML.match(pageContainerPattern);
		console.log('Page container match found:', !!match);

		if (match) {
			// Replace with clean HTML structure - page numbers below barcode, aligned right
			const replacement = `<div style="display: flex; align-items: center; justify-content: flex-end;">
			<span style="margin-right: 2px;">Trang / Pages:</span>
			<span>${pageNumber} / ${totalPagesStr}</span>
		</div>
	</div>`;
			pageFooter = footerHTML.replace(pageContainerPattern, replacement);
			console.log('✅ Page numbers replaced successfully');
		} else {
			console.warn('Page container pattern not found! Trying simpler pattern...');
			// Try simpler pattern - just replace the numbers
			const simplePattern = /<span[^>]*>0?\d+<\/span>\s*<span[^>]*>\/<\/span>\s*<span[^>]*>0?\d+<\/span>/;
			if (footerHTML.match(simplePattern)) {
				pageFooter = footerHTML.replace(
					simplePattern,
					`<span>${pageNumber}</span> <span>/</span> <span>${totalPagesStr}</span>`,
				);
				console.log('✅ Used simple pattern for page numbers');
			} else {
				console.error('Could not find any page number pattern!');
			}
		}

		// Extract refNumber from header's ref_code element
		const parser = new DOMParser();
		const headerDoc = parser.parseFromString(headerHTML, 'text/html');
		const refCodeElement = headerDoc.querySelector('.ref_code');
		const extractedRefNumber = refCodeElement ? refCodeElement.textContent.trim() : '';

		// Replace content inside <p class="ref_code"> with actual refNumber
		if (extractedRefNumber && refCodeElement) {
			refCodeElement.textContent = extractedRefNumber;
			headerHTML = headerDoc.body.innerHTML;
		}

		// Add barcode canvas before the page numbers div
		const footerDoc = parser.parseFromString(pageFooter, 'text/html');

		// Find the parent container that has flex-direction: column
		const containerDiv = footerDoc.querySelector('div[style*="flex-direction: column"]');

		if (containerDiv) {
			// Check if canvas already exists
			let canvasDiv = containerDiv.querySelector('div.barcode-container');

			if (!canvasDiv) {
				// Create new div for barcode
				canvasDiv = footerDoc.createElement('div');
				canvasDiv.className = 'barcode-container';
				canvasDiv.style.cssText = 'display: flex; align-items: center; justify-content: flex-end; margin-bottom: 2px;';

				// Create canvas element
				const canvas = footerDoc.createElement('canvas');
				canvas.className = 'barcode-canvas';
				canvas.style.cssText = 'max-width: 150px; height: auto;';

				// Add canvas to div
				canvasDiv.appendChild(canvas);

				// Insert barcode div before the page numbers div (first child)
				containerDiv.insertBefore(canvasDiv, containerDiv.firstChild);
			}

			// Update canvas data-value
			const canvas = canvasDiv.querySelector('canvas');
			if (canvas) {
				if (
					extractedRefNumber &&
					extractedRefNumber !== '' &&
					!extractedRefNumber.includes('DRAFT') &&
					!extractedRefNumber.includes('SƠ BỘ')
				) {
					canvas.setAttribute('data-value', extractedRefNumber);
				} else {
					canvas.setAttribute('data-value', '');
				}
			}

			// Get the updated HTML
			pageFooter = footerDoc.body.innerHTML;
		} else {
			console.error('❌ Could not find container div in footer!');
			console.log('Footer HTML for debug:', pageFooter.substring(0, 1000));
		}

		// Generate content for this page - add spacing between sections but NOT after the last one
		const pageContent = page.sections
			.map((section, sectionIndex) => {
				if (sectionIndex < page.sections.length - 1) {
					return section.html + spacing;
				}
				return section.html;
			})
			.join('');

		// Add watermark if needed
		const watermarkHTML = shouldShowWatermark ? '<div class="watermark">DRAFT - SƠ BỘ</div>' : '';

		pagesHTML += `
<div class="a4-page" style="position: relative; width: 794px; height: 1122px; box-sizing: border-box; page-break-after: always; background-color: white; padding: 0; overflow: hidden; border: 1px solid #000;">
	${watermarkHTML}
	<div class="header" style="position: absolute; top: ${headerTop}px; left: ${leftMarginPx}px; width: ${contentWidth}px; box-sizing: border-box; z-index: 2;">
		${headerHTML}
	</div>
	<div class="content" style="position: absolute; top: ${contentTop}px; left: ${leftMarginPx}px; width: ${contentWidth}px; max-height: ${contentMaxHeight}px; box-sizing: border-box; overflow: hidden; z-index: 1;">
		${pageContent}
	</div>
	<div class="footer" style="position: absolute; bottom: ${footerBottom}px; left: ${leftMarginPx}px; width: ${contentWidth}px; box-sizing: border-box; z-index: 2;">
		${pageFooter}
	</div>
</div>`;
	});

	// Format title for PDF filename
	let documentTitle = 'Preview - Certificate of Analysis';
	if (sampleIds) {
		// Format current datetime as DDMMYY HHMM in GMT+7
		const now = new Date();
		const gmt7Offset = 7 * 60; // GMT+7 in minutes
		const localOffset = now.getTimezoneOffset(); // Local timezone offset in minutes
		const gmt7Date = new Date(now.getTime() + (gmt7Offset + localOffset) * 60 * 1000);

		const day = String(gmt7Date.getDate()).padStart(2, '0');
		const month = String(gmt7Date.getMonth() + 1).padStart(2, '0');
		const year = String(gmt7Date.getFullYear()).slice(-2);
		const hours = String(gmt7Date.getHours()).padStart(2, '0');
		const minutes = String(gmt7Date.getMinutes()).padStart(2, '0');
		const dateTimeStr = `${day}${month}${year} ${hours}${minutes}`;

		// Format sample IDs
		let sampleIdStr = '';
		if (Array.isArray(sampleIds)) {
			sampleIdStr = sampleIds.join(' ');
		} else {
			sampleIdStr = sampleIds;
		}

		// Set title as filename
		documentTitle = `Certificate of analysis - ${sampleIdStr} - ${dateTimeStr}`;
	}

	return `
<!DOCTYPE html>
<html>
<head>
	<title>${documentTitle}</title>
	<meta charset="utf-8">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
	<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
	<style>${css}</style>
</head>
<body>
	<div class="print-container">
		${pagesHTML}
	</div>
	<script>
		// Render all barcodes after page loads
		window.addEventListener('load', function() {
			const barcodeCanvases = document.querySelectorAll('.barcode-canvas');
			
			barcodeCanvases.forEach((canvas) => {
				const value = canvas.getAttribute('data-value');
				
				if (value && value.trim() !== '') {
					try {
						JsBarcode(canvas, value, {
							format: 'CODE128',
							width: 1,
							height: 40,
							displayValue: false,
							margin: 1,
							background: 'transparent',
							lineColor: '#2a2a2a',
						});
					} catch (error) {
						console.error('Error generating barcode:', error);
					}
				}
			});
		});
	</script>
</body>
</html>`;
};

/**
 * Open preview in new window
 */
export const openPreviewWindow = (htmlContent, sampleIds = null) => {
	const previewWindow = window.open('', '_blank', 'width=900,height=1200');
	if (previewWindow) {
		previewWindow.document.write(htmlContent);
		previewWindow.document.close();

		// Set document title for PDF filename
		if (sampleIds) {
			// Format current datetime as DDMMYY HHMM in GMT+7
			const now = new Date();
			const gmt7Offset = 7 * 60; // GMT+7 in minutes
			const localOffset = now.getTimezoneOffset(); // Local timezone offset in minutes
			const gmt7Date = new Date(now.getTime() + (gmt7Offset + localOffset) * 60 * 1000);

			const day = String(gmt7Date.getDate()).padStart(2, '0');
			const month = String(gmt7Date.getMonth() + 1).padStart(2, '0');
			const year = String(gmt7Date.getFullYear()).slice(-2);
			const hours = String(gmt7Date.getHours()).padStart(2, '0');
			const minutes = String(gmt7Date.getMinutes()).padStart(2, '0');
			const dateTimeStr = `${day}${month}${year} ${hours}${minutes}`;

			// Format sample IDs
			let sampleIdStr = '';
			if (Array.isArray(sampleIds)) {
				sampleIdStr = sampleIds.join(' ');
			} else {
				sampleIdStr = sampleIds;
			}

			// Set title as filename
			const filename = `Certificate of analysis - ${sampleIdStr} - ${dateTimeStr}`;
			previewWindow.document.title = filename;
		}
	} else {
		alert('Vui lòng cho phép popup để xem preview');
	}
};
