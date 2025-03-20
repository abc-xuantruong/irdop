export const generateReportToHTML = (params) => {
	const {
		// Report sections
		header,
		footer,
		customerSectionHTML,
		sampleInfoSectionHTML,
		analysisSectionHTML,
		commentSectionHTML,
		notesSectionHTML,
		signatureSectionHTML,

		// State parameters
		showVlas,
		showComment,
		showReference,
		pptUid,
		sample_uid,
		referenceValues,

		// Optional custom spacing
		spacing = '<div style="height: 4mm; margin:0; padding:0;"></div>',
		nextPageNotification = '<div style="padding: 10px 0; text-align: center; font-size: 12px; font-style: italic; color: #666;">- Xem kết quả ở trang tiếp theo / See the results on the following page -</div>',
	} = params;

	// Function to format date
	const formatDate = (date) => {
		return date.toLocaleDateString('vi-VN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		});
	};

	// A4 dimensions in mm with spacing adjustments
	const A4 = {
		width: 210,
		height: 297,
		topMargin: 15, // 1.5cm
		bottomMargin: 8, // 0.8cm
		sideMargin: 10, // 1cm
		headerSpacing: 8, // spacing between header and content
		footerSpacing: 3, // spacing between content and footer
	};

	// Get DPI for pixel to mm conversion
	const getDPI = () => {
		const div = document.createElement('div');
		div.style.width = '1in';
		div.style.height = '1in';
		div.style.position = 'absolute';
		div.style.left = '-100%';
		div.style.top = '-100%';
		document.body.appendChild(div);
		const dpi = div.offsetWidth;
		document.body.removeChild(div);
		return dpi;
	};

	const dpi = getDPI();
	const pxToMm = (px) => (px * 25.4) / dpi;
	const mmToPx = (mm) => (mm * dpi) / 25.4;

	// Log dimensions
	console.log('📐 Document dimensions:');
	console.log('- Screen DPI:', dpi);
	console.log('- A4 paper:', `${A4.width}mm × ${A4.height}mm (${mmToPx(A4.width)}px × ${mmToPx(A4.height)}px)`);
	console.log(
		'- Margins:',
		`top: ${A4.topMargin}mm (${mmToPx(A4.topMargin)}px), bottom: ${A4.bottomMargin}mm (${mmToPx(
			A4.bottomMargin,
		)}px), sides: ${A4.sideMargin}mm (${mmToPx(A4.sideMargin)}px)`,
	);

	// Pagination function with detailed logging
	const paginateContent = () => {
		// Create temporary measuring elements
		const measureArea = document.createElement('div');
		measureArea.style.position = 'absolute';
		measureArea.style.visibility = 'hidden';
		measureArea.style.width = `${A4.width - 2 * A4.sideMargin}mm`;
		measureArea.style.left = '-9999px';
		document.body.appendChild(measureArea);

		// Measure header height
		measureArea.innerHTML = header;
		const headerHeightPx = measureArea.offsetHeight;
		const headerHeightMm = pxToMm(headerHeightPx);

		// Measure footer height
		measureArea.innerHTML = footer;
		const footerHeightPx = measureArea.offsetHeight;
		const footerHeightMm = pxToMm(footerHeightPx);

		// Calculate available content height per page
		const availableContentHeightMm =
			A4.height -
			A4.topMargin -
			A4.bottomMargin -
			headerHeightMm -
			footerHeightMm -
			A4.headerSpacing -
			A4.footerSpacing;

		const availableContentHeightPx = mmToPx(availableContentHeightMm);

		// Measure all sections individually
		const measureSection = (sectionHtml) => {
			measureArea.innerHTML = sectionHtml;
			return measureArea.offsetHeight;
		};

		const sectionHeights = {
			customerSection: measureSection(customerSectionHTML),
			sampleInfoSection: measureSection(sampleInfoSectionHTML),
			analysisSection: measureSection(analysisSectionHTML),
			commentSection: showComment ? measureSection(commentSectionHTML || '') : 0,
			notesSection: measureSection(notesSectionHTML),
			signatureSection: measureSection(signatureSectionHTML),
			spacing: measureSection(spacing),
			nextPageNotification: measureSection(nextPageNotification),
		};

		console.log('📏 Section heights (px):', sectionHeights);

		// Calculate total content height
		let totalContentHeight =
			sectionHeights.customerSection +
			sectionHeights.spacing +
			sectionHeights.sampleInfoSection +
			sectionHeights.spacing +
			sectionHeights.analysisSection +
			sectionHeights.spacing +
			sectionHeights.notesSection +
			sectionHeights.spacing +
			sectionHeights.signatureSection;

		// Add comment section height if enabled
		if (showComment && commentSectionHTML) {
			totalContentHeight += sectionHeights.commentSection + sectionHeights.spacing;
		}

		// Calculate heights for special 2-page layout
		let page1SpecialLayoutHeight =
			sectionHeights.customerSection +
			sectionHeights.spacing +
			sectionHeights.sampleInfoSection +
			sectionHeights.spacing +
			sectionHeights.nextPageNotification +
			sectionHeights.spacing +
			sectionHeights.notesSection;

		const page2SpecialLayoutHeight =
			sectionHeights.analysisSection +
			sectionHeights.spacing +
			(showComment ? sectionHeights.commentSection + sectionHeights.spacing : 0) +
			sectionHeights.signatureSection;

		console.log(`📊 Layout analysis: 
      - Total content height: ${totalContentHeight}px
      - Available height per page: ${availableContentHeightPx}px
      - Special layout page 1 height: ${page1SpecialLayoutHeight}px
      - Special layout page 2 height: ${page2SpecialLayoutHeight}px
    `);

		// Determine if content should use special 2-page layout
		const totalExceedsOnePage = totalContentHeight > availableContentHeightPx;
		const page2FitsOnePage = page2SpecialLayoutHeight <= availableContentHeightPx;
		const page1FitsOnePage = page1SpecialLayoutHeight <= availableContentHeightPx;

		const useSpecialLayout = totalExceedsOnePage && page2FitsOnePage && page1FitsOnePage;

		console.log(`🧮 Layout decision criteria:
      - Total content exceeds one page: ${totalExceedsOnePage}
      - Page 2 contents fit on one page: ${page2FitsOnePage}
      - Page 1 content fits on one page: ${page1FitsOnePage}
      - FINAL DECISION: Using special 2-page layout: ${useSpecialLayout}
    `);

		// Generate content pages based on selected layout
		let contentPages = [];

		if (useSpecialLayout) {
			// Use the custom 2-page layout
			console.log('📄 Using custom 2-page layout with "see next page" notification');

			// Page 1: customerSection + sampleInfoSection + notification + notesSection
			const page1Elements = [
				customerSectionHTML,
				spacing,
				sampleInfoSectionHTML,
				spacing,
				nextPageNotification,
				spacing,
				notesSectionHTML,
			];

			const page1Content = page1Elements.join('');

			// Page 2: analysisSection + commentSection (if enabled) + signatureSection
			const page2Elements = [analysisSectionHTML, spacing];

			// Add comment section to page 2 after analysis if enabled
			if (showComment && commentSectionHTML) {
				page2Elements.push(commentSectionHTML);
				page2Elements.push(spacing);
			}

			page2Elements.push(signatureSectionHTML);
			const page2Content = page2Elements.join('');

			contentPages = [page1Content, page2Content];
		} else {
			// Use standard sequential layout
			console.log('📄 Using standard sequential layout');

			// Create standard content with sequential sections
			const contentElements = [];
			contentElements.push(customerSectionHTML);
			contentElements.push(spacing);
			contentElements.push(sampleInfoSectionHTML);
			contentElements.push(spacing);
			contentElements.push(analysisSectionHTML);
			contentElements.push(spacing);

			if (showComment && commentSectionHTML) {
				contentElements.push(commentSectionHTML);
				contentElements.push(spacing);
			}

			contentElements.push(notesSectionHTML);
			contentElements.push(spacing);
			contentElements.push(signatureSectionHTML);

			// Parse content into elements for standard pagination
			measureArea.innerHTML = contentElements.join('');
			const htmlElements = Array.from(measureArea.childNodes);

			// Standard pagination logic
			let currentPage = [];
			let currentPageHeightPx = 0;
			let pageContentHeights = [];
			let tableBreakCounts = 0;

			// Process each element for pagination
			const processElement = (element) => {
				// Skip empty text nodes
				if (element.nodeType === 3 && element.textContent.trim() === '') {
					return;
				}

				// Create a clone to measure
				const clone = element.cloneNode(true);
				measureArea.innerHTML = '';
				measureArea.appendChild(clone);
				const elementHeightPx = measureArea.offsetHeight;
				const elementHeightMm = pxToMm(elementHeightPx);

				// Check if this element is a table
				const isTable = element.tagName === 'TABLE' || (element.querySelector && element.querySelector('table'));

				// Check if this element fits on the current page
				if (currentPageHeightPx + elementHeightPx <= availableContentHeightPx) {
					// Element fits on current page
					currentPage.push(element.outerHTML || element.textContent);
					currentPageHeightPx += elementHeightPx;
				} else if (isTable) {
					// Table doesn't fit - needs to be split across pages
					console.log(
						`📊 Found table that needs splitting: ${elementHeightMm.toFixed(2)}mm (exceeds available space ${pxToMm(
							availableContentHeightPx - currentPageHeightPx,
						).toFixed(2)}mm)`,
					);
					splitTableAcrossPages(element);
				} else if (elementHeightPx > availableContentHeightPx && currentPage.length === 0) {
					// Non-table element larger than a full page and we're at the start of a page
					console.log(`⚠️ Oversized non-table element: ${elementHeightMm.toFixed(2)}mm (exceeds page height)`);
					// Force onto a page
					currentPage.push(element.outerHTML || element.textContent);
					contentPages.push(currentPage.join(''));
					pageContentHeights.push(currentPageHeightPx);

					// Start new page
					currentPage = [];
					currentPageHeightPx = 0;
				} else {
					// Element doesn't fit on current page - start a new page
					contentPages.push(currentPage.join(''));
					pageContentHeights.push(currentPageHeightPx);

					// Start new page with this element
					currentPage = [element.outerHTML || element.textContent];
					currentPageHeightPx = elementHeightPx;
				}
			};

			// Enhanced function to split tables across pages with minimum footer spacing
			const splitTableAcrossPages = (tableElement) => {
				tableBreakCounts++;

				// Extract table structure
				const hasHeader = !!tableElement.querySelector('thead');
				const tableHeader = hasHeader ? tableElement.querySelector('thead').outerHTML : '';
				const rows = Array.from(tableElement.querySelectorAll('tbody tr'));

				// Extract all attributes and styles from the original table
				const tableAttributes = Array.from(tableElement.attributes)
					.map((attr) => `${attr.name}="${attr.value}"`)
					.join(' ');

				// If there's no space left on the current page for even the header + 1 row,
				// we need to start a new page
				if (currentPage.length > 0) {
					const headerHeight = hasHeader ? measureSection(`<table ${tableAttributes}>${tableHeader}</table>`) : 0;
					const minTableHeight = headerHeight + (rows.length > 0 ? 50 : 0); // Min height for header + one row

					if (currentPageHeightPx + minTableHeight > availableContentHeightPx) {
						// Not enough space for table header + one row, move to next page
						contentPages.push(currentPage.join(''));
						pageContentHeights.push(currentPageHeightPx);
						currentPage = [];
						currentPageHeightPx = 0;
					}
				}

				// Create a table structure for the first part (header + rows that fit)
				let firstPartHTML = `<table ${tableAttributes}>`;
				if (hasHeader) firstPartHTML += tableHeader;
				firstPartHTML += '<tbody>';

				// Keep track of remaining height on current page
				let remainingHeightPx = availableContentHeightPx - currentPageHeightPx;

				// Measure header height if header exists
				if (hasHeader) {
					const headerHTML = `<table ${tableAttributes}>${tableHeader}</table>`;
					measureArea.innerHTML = headerHTML;
					const headerHeightPx = measureArea.offsetHeight;
					remainingHeightPx -= headerHeightPx;
				}

				// Improved row height measurement: Create a complete table with all rows
				// to accurately measure each row in context
				const fullTableHTML = `<table ${tableAttributes}>${hasHeader ? tableHeader : ''}<tbody>${rows
					.map((row) => row.outerHTML)
					.join('')}</tbody></table>`;
				measureArea.innerHTML = fullTableHTML;

				// Get all rendered rows to measure actual heights
				const renderedRows = Array.from(measureArea.querySelectorAll('tbody tr'));

				// Log table information
				console.log(`📏 TABLE ROWS HEIGHT MEASUREMENT:`);
				console.log(`- Available space for rows: ${remainingHeightPx}px (${pxToMm(remainingHeightPx).toFixed(2)}mm)`);

				// Measure each row and log its height
				const rowHeights = renderedRows.map((row, index) => {
					// Use getBoundingClientRect for more accurate height measurement
					const rect = row.getBoundingClientRect();
					const originalRowHeightPx = rect.height;
					// Reduce height by a small factor to prevent footer overlap
					const rowHeightPx = originalRowHeightPx * 0.999;
					const rowHeightMm = pxToMm(rowHeightPx);
					const percentOfAvailable = (rowHeightPx / availableContentHeightPx) * 100;

					console.log(
						`- Row ${index + 1}: Original ${originalRowHeightPx.toFixed(1)}px, Adjusted ${rowHeightPx.toFixed(
							1,
						)}px (${rowHeightMm.toFixed(2)}mm) - ${percentOfAvailable.toFixed(1)}% of available space`,
					);

					return rowHeightPx;
				});

				// Reset measurement area
				measureArea.innerHTML = '';

				// Try to fit as many rows as possible in the first part using measured heights
				let rowsInFirstPart = [];
				let remainingRows = [...rows];
				let totalUsedHeight = 0;
				let totalRemainingHeight = remainingHeightPx;

				// Use measured heights to determine how many rows fit
				console.log(`🔍 FITTING ROWS IN FIRST PART:`);
				for (let i = 0; i < rows.length && i < rowHeights.length; i++) {
					const rowHeightPx = rowHeights[i];

					if (rowHeightPx <= totalRemainingHeight) {
						// This row fits
						rowsInFirstPart.push(rows[i]);
						totalRemainingHeight -= rowHeightPx;
						totalUsedHeight += rowHeightPx;
						remainingRows.shift();
						console.log(
							`- Row ${i + 1} fits: ${rowHeightPx.toFixed(1)}px - Remaining space: ${totalRemainingHeight.toFixed(
								1,
							)}px (${pxToMm(totalRemainingHeight).toFixed(2)}mm)`,
						);
					} else {
						// This row doesn't fit
						console.log(
							`- Row ${i + 1} doesn't fit: ${rowHeightPx.toFixed(1)}px > ${totalRemainingHeight.toFixed(
								1,
							)}px remaining`,
						);
						break;
					}
				}
				console.log(`- Total rows that fit: ${rowsInFirstPart.length} of ${rows.length}`);
				console.log(`- Total height used: ${totalUsedHeight.toFixed(1)}px (${pxToMm(totalUsedHeight).toFixed(2)}mm)`);
				console.log(
					`- Remaining height: ${totalRemainingHeight.toFixed(1)}px (${pxToMm(totalRemainingHeight).toFixed(2)}mm)`,
				);

				// Finish the first part of the table
				if (rowsInFirstPart.length > 0) {
					rowsInFirstPart.forEach((row) => {
						firstPartHTML += row.outerHTML;
					});

					firstPartHTML += '</tbody></table>';
					currentPage.push(firstPartHTML);

					// Measure the actual height of the first part
					measureArea.innerHTML = firstPartHTML;
					const firstPartHeightPx = measureArea.offsetHeight;
					currentPageHeightPx += firstPartHeightPx;

					// If there are remaining rows, put them on the next page
					if (remainingRows.length > 0) {
						// End current page
						contentPages.push(currentPage.join(''));
						pageContentHeights.push(currentPageHeightPx);

						// Create a new page with continuation table
						let continuationHTML = `<table ${tableAttributes}>`;
						// Include header in continuation tables
						if (hasHeader) continuationHTML += tableHeader;
						continuationHTML += '<tbody>';

						// Process remaining rows (may need further splitting)
						let rowsInCurrentPart = [];
						currentPage = [];
						currentPageHeightPx = 0;

						// Handle case where header might not leave room for even one row
						let headerHeightPx = 0;
						if (hasHeader) {
							const headerHTML = `<table ${tableAttributes}>${tableHeader}</table>`;
							measureArea.innerHTML = headerHTML;
							headerHeightPx = measureArea.offsetHeight;
							currentPageHeightPx += headerHeightPx;
						}

						// Try to fit as many remaining rows as possible
						for (let i = 0; i < remainingRows.length; i++) {
							const row = remainingRows[i];

							// Get precomputed row height from earlier measurements
							const rowIndex = rows.indexOf(row);
							const originalRowHeightPx =
								rowIndex >= 0 && rowIndex < rowHeights.length ? rowHeights[rowIndex] / 0.999 : 30;
							const rowHeightPx = rowIndex >= 0 && rowIndex < rowHeights.length ? rowHeights[rowIndex] : 30 * 0.999;

							if (currentPageHeightPx + rowHeightPx <= availableContentHeightPx) {
								// This row fits
								rowsInCurrentPart.push(row);
								currentPageHeightPx += rowHeightPx;
								remainingRows.shift();
								i--; // Adjust index since we're removing from array
								console.log(
									`  - Row added: Original height ${originalRowHeightPx.toFixed(1)}px, Used ${rowHeightPx.toFixed(
										1,
									)}px, Remaining space: ${(availableContentHeightPx - currentPageHeightPx).toFixed(1)}px`,
								);
							} else if (i === 0 && currentPage.length === 0) {
								// Force at least one row even if it overflows
								rowsInCurrentPart.push(row);
								remainingRows.shift();
								console.log(
									`  - Force added row: Original height ${originalRowHeightPx.toFixed(1)}px, Used ${rowHeightPx.toFixed(
										1,
									)}px (overflow)`,
								);
								break;
							} else {
								// This row doesn't fit, and we already have content
								console.log(
									`  - Row doesn't fit: Original height ${originalRowHeightPx.toFixed(1)}px, Used ${rowHeightPx.toFixed(
										1,
									)}px, Available space: ${(availableContentHeightPx - currentPageHeightPx).toFixed(1)}px`,
								);
								break;
							}
						}

						// Add rows to continuation table
						rowsInCurrentPart.forEach((row) => {
							continuationHTML += row.outerHTML;
						});
						continuationHTML += '</tbody></table>';

						// Add continuation to current page
						currentPage.push(continuationHTML);

						// If there are still more rows, recursively process them
						if (remainingRows.length > 0) {
							// End current page
							contentPages.push(currentPage.join(''));

							// Build a new table element with remaining rows
							let remainingTableHTML = `<table ${tableAttributes}>`;
							if (hasHeader) remainingTableHTML += tableHeader;
							remainingTableHTML += '<tbody>';
							remainingRows.forEach((row) => {
								remainingTableHTML += row.outerHTML;
							});
							remainingTableHTML += '</tbody></table>';

							// Create a DOM element from the HTML
							const tempDiv = document.createElement('div');
							tempDiv.innerHTML = remainingTableHTML;
							const remainingTableElement = tempDiv.firstChild;

							// Reset for next page
							currentPage = [];
							currentPageHeightPx = 0;

							// Process remaining rows recursively
							splitTableAcrossPages(remainingTableElement);
						}
					}
				} else {
					// Special case: can't fit even one row with header
					// Start a new page and try again
					if (currentPage.length > 0) {
						contentPages.push(currentPage.join(''));
						pageContentHeights.push(currentPageHeightPx);
						currentPage = [];
						currentPageHeightPx = 0;
					}

					// Try again with empty page
					splitTableAcrossPages(tableElement);
				}
			};

			// Process all content elements in order
			htmlElements.forEach((element) => {
				processElement(element);
			});

			// Add the last page if not empty
			if (currentPage.length > 0) {
				contentPages.push(currentPage.join(''));
				pageContentHeights.push(currentPageHeightPx);
			}

			// Log detailed information about each page's content height
			console.log(`📊 PAGE CONTENT HEIGHT ANALYSIS:`);
			pageContentHeights.forEach((height, index) => {
				const heightMm = pxToMm(height);
				const percentUsed = (height / availableContentHeightPx) * 100;
				const remainingPx = availableContentHeightPx - height;
				const remainingMm = pxToMm(remainingPx);

				console.log(`- Page ${index + 1}: Content height = ${height.toFixed(1)}px (${heightMm.toFixed(2)}mm)`);
				console.log(`  • ${percentUsed.toFixed(1)}% of available space used`);
				console.log(`  • Remaining space: ${remainingPx.toFixed(1)}px (${remainingMm.toFixed(2)}mm)`);
			});

			// Verify our actual page count
			console.log(`📄 Standard layout resulted in ${contentPages.length} pages`);
			console.log(`📄 Table breaks count: ${tableBreakCounts}`);
		}

		// Clean up
		document.body.removeChild(measureArea);

		return {
			pages: contentPages,
			headerHeightPx,
			headerHeightMm,
			footerHeightPx,
			footerHeightMm,
			availableContentHeightPx,
			availableContentHeightMm,
			contentTopPx: headerHeightPx + mmToPx(A4.headerSpacing),
			contentTopMm: headerHeightMm + A4.headerSpacing,
			is2PageLayout: useSpecialLayout,
		};
	};

	// Execute pagination
	const paginationResult = paginateContent();

	// Generate a single HTML document with all pages (like in Report.jsx handlePrint)
	// Prepare custom font support
	const fontFaces = `
    @font-face {
      font-family: 'Gilroy';
      src: url('/public/fonts/SVN-Gilroy Regular.otf') format('opentype');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Gilroy';
      src: url('/public/fonts/SVN-Gilroy SemiBold.otf') format('opentype');
      font-weight: 500;
      font-style: normal;
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Gilroy';
      src: url('/public/fonts/SVN-Gilroy Bold.otf') format('opentype');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
  `;

	// Format current date as DD-MM-YYYY for document title
	const today = new Date();
	const day = String(today.getDate()).padStart(2, '0');
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const year = today.getFullYear();
	const formattedDate = `${day}-${month}-${year}`;
	const documentTitle = `PPT-${sample_uid || ''} ${formattedDate}`;

	// Create all page elements HTML
	let pagesHTML = '';
	paginationResult.pages.forEach((pageContent, index) => {
		const pageNumber = (index + 1).toString().padStart(2, '0');
		const totalPages = paginationResult.pages.length.toString().padStart(2, '0');

		// Replace page numbers in footer
		const pageFooter = footer
			.replace(`>00</span>`, `>${pageNumber}</span>`)
			.replace(`>00</span>`, `>${totalPages}</span>`);

		// Replace pptUid in header
		const pageHeader = header.replace(/-- SƠ BỘ \/ DRAFT --/g, pptUid || '-- SƠ BỘ / DRAFT --');

		// Create the page element similar to Report.jsx
		pagesHTML += `
      <div class="page">
        <div class="header">${pageHeader}</div>
        <div class="content">${pageContent}</div>
        <div class="footer">${pageFooter}</div>
      </div>
    `;
	});

	// Create a single complete HTML document with all pages
	const completeHTML = `<!DOCTYPE html>
<html>
<head>
  <title>${documentTitle}</title>
  <meta charset="utf-8">
  <style>
    ${fontFaces}
    
    @page {
      size: A4;
      margin: ${A4.topMargin}mm ${A4.sideMargin}mm ${A4.bottomMargin}mm ${A4.sideMargin}mm;
    }
    
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Gilroy', sans-serif !important;
      background-color: #f0f0f0;
    }
    
    .print-container {
      width: 720px; /* Exact width: 210mm - 2*10mm margins at 96 DPI */
      margin: 20px auto;
      background-color: white;
      font-family: 'Gilroy', sans-serif !important;
      padding: 0 1px; /* Add 1px padding on left and right */
    }
    
    .page {
      position: relative;
      width: 100%;
      height: ${A4.height - A4.topMargin - A4.bottomMargin}mm;
      overflow: hidden;
      box-sizing: border-box;
      page-break-after: always;
      background-color: white;
      border-bottom: 1px dashed #ccc;
      font-family: 'Gilroy', sans-serif !important;
      padding: 0 1px; /* Add 1px padding on left and right */
    }

    /* Allow VLAS icon to overflow the container */
    .vlas_icon {
      overflow: visible !important;
      z-index: 10;
    }
    .vlas_icon img {
      transform: translateX(-5mm);
    }
    
    /* Additional styles for table rows to preserve height */
    table {
      border-collapse: collapse;
      width: 100%;
      font-family: 'Gilroy', sans-serif !important;
      table-layout: fixed; /* Helps with consistent row heights */
      width: auto;
      min-width: 100%;
      max-width: 100%;
    }
    
    table tr {
      height: auto !important; /* Allow rows to grow with content */
      page-break-inside: avoid; /* Try to avoid breaking rows across pages */
    }
    
    table td, table th {
      padding: 6px 8px !important; /* Keep 8px padding for print mode */
      border: 1px solid black;
      vertical-align: middle; /* Better alignment for multi-line content */
      height: auto !important; /* Allow cells to grow with content */
      line-height: 1.2; /* Ensure consistent line height */
    }
    
    /* Fix paragraph styling in table cells */
    table td p, table th p {
      margin: 0;
      padding: 0;
      line-height: 1.2;
      font-family: 'Gilroy', sans-serif !important;
      font-size: 12px;
    }
    
    /* Ensure STT/No. column has consistent width */
    table th:first-child, table td:first-child {
      width: 28px !important;
      min-width: 28px !important;
      max-width: 28px !important;
    }
    
    .header {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      box-sizing: border-box;
      padding-bottom: 0 !important;
      font-family: 'Gilroy', sans-serif !important;
      overflow: visible !important; /* Allow header content to overflow */
    }
    
    .header > div:last-child {
      padding-bottom: 0 !important;
      margin-bottom: 0 !important;
      overflow: visible !important;
    }
    
    .content {
      position: absolute;
      top: ${paginationResult.contentTopMm}mm;
      left: 0;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      padding: 0 1px !important; /* Add 1px padding on left and right */
      font-family: 'Gilroy', sans-serif !important;
    }
    
    .content > * {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      font-family: 'Gilroy', sans-serif !important;
    }
    
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      box-sizing: border-box;
      padding-top: 0 !important;
      font-family: 'Gilroy', sans-serif !important;
    }
    
    .footer > div:first-child {
      padding-top: 0 !important;
      margin-top: 0 !important;
    }
    
    p, div, span, td, th {
      margin-top: 0;
      margin-bottom: 0;
      line-height: inherit;
      font-family: 'Gilroy', sans-serif !important;
    }
    
    img {
      max-width: 100%;
    }
    
    @media print {
      body {
        background-color: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-family: 'Gilroy', sans-serif !important;
      }
      
      .print-container {
        width: 720px !important; /* Force exact width even in print */
        margin: 0 auto;
        box-shadow: none;
        padding: 0 1px !important; /* Ensure padding in print mode */
      }
      
      .page {
        width: 100% !important;
        margin: 0;
        border-bottom: none;
        padding: 0 1px !important; /* Ensure padding in print mode */
      }
      
      /* Critical: ensure overflow is visible in print mode for VLAS icon */
      .vlas_icon, .header, .header > div {
        overflow: visible !important;
      }
      
      /* Preserve table row heights in print mode */
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      
      /* Ensure paragraph styling in table cells is preserved when printing */
      table td p, table th p {
        margin: 0 !important;
        padding: 0 !important;
        line-height: 1.2 !important;
      }

      /* Last page should not have a page break */
      .page:last-child {
        page-break-after: auto;
      }
    }
  </style>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Force 96 DPI rendering -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
</head>
<body>
  <div class="print-container">
    ${pagesHTML}
  </div>
  <script>
    // Ensure fonts are loaded before printing
    document.fonts.ready.then(function() {
      console.log('Fonts loaded in print window');
      setTimeout(function() {
        // Fix for VLAS icon positioning in print view
        const vlasIcons = document.querySelectorAll('.vlas_icon');
        vlasIcons.forEach(icon => {
          icon.style.overflow = 'visible';
          if (icon.querySelector('img')) {
            icon.querySelector('img').style.maxWidth = 'none';
          }
        });
        // Uncomment to automatically print when loaded
        // window.print();
      }, 1000);
    });
  </script>
</body>
</html>`;

	// Log the complete HTML containing all pages
	console.log('-------------------- COMPLETE PRINT-READY HTML --------------------');
	console.log(completeHTML);
	console.log('-------------------- END COMPLETE PRINT-READY HTML --------------------');

	console.log('🖨️ Report HTML generation complete with', paginationResult.pages.length, 'pages');
	console.log(
		'🔍 Using layout:',
		paginationResult.is2PageLayout ? 'Custom 2-page layout' : 'Standard sequential layout',
	);

	// Return both the pagination result and the complete HTML for further use
	return {
		...paginationResult,
		completeHTML,
	};
};
