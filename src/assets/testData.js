const { JSDOM } = require('jsdom');

const getDraftWatermark = () => {
	return `
	<div class="draft-watermark" style="
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		pointer-events: none;
		z-index: 10;
		opacity: 0.15;
		transform: rotate(-45deg);
		font-family: 'Gilroy', sans-serif;
	">
		<div style="
			font-size: 90px;
			font-weight: bold;
			color: #888;
			text-transform: uppercase;
			letter-spacing: 8px;
		">SƠ BỘ-DRAFT</div>
	</div>`;
};

// Helper function to make API calls using axios instead of fetch
const apiGet = async (url) => {
	try {
		const response = await axios.get(url, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		});

		return { status: response.status, data: response.data };
	} catch (error) {
		console.error('API Get Error:', error);
		throw error;
	}
};

// Helper function for POST requests using axios
const apiPost = async (url, data) => {
	try {
		const response = await axios.post(url, data, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		});

		return { status: response.status, data: response.data };
	} catch (error) {
		console.error('API Post Error:', error);
		throw error;
	}
};

export const generateReportToHTML = async (params) => {
	// Create a JSDOM instance for Node.js environment
	const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
	const { window } = dom;
	const { document } = window;

	// Define global document and window for functions that might need them
	global.document = document;
	global.window = window;

	// Extract basic params directly
	const {
		sample_uid,
		ppt_uid,
		showVlas = false,
		showComment = false,
		showReference = false,
		// Optional custom spacing
		spacing = '<div style="height: 4mm; margin:0; padding:0;"></div>',
		nextPageNotification = '<div style="padding: 10px 0; text-align: center; font-size: 12px; font-style: italic; color: #666;">- Xem kết quả ở trang tiếp theo / See the results on the following page -</div>',
		// Extract additional parameters for sections
		header: headerParam,
		footer: footerParam,
		customerSectionHTML: customerSectionParam,
		sampleInfoSectionHTML: sampleInfoParam,
		analysisSectionHTML: analysisParam,
		commentSectionHTML: commentParam,
		notesSectionHTML: notesParam,
		signatureSectionHTML: signatureParam,
		referenceValues: referenceParam = [],
		currentUser = null,
	} = params;

	// Variables to store section content
	let header,
		footer,
		customerSectionHTML,
		sampleInfoSectionHTML,
		analysisSectionHTML,
		commentSectionHTML,
		notesSectionHTML,
		signatureSectionHTML,
		referenceValues = [];

	// Flag to track if the report is a draft
	let isDraftMode = ppt_uid ? ppt_uid.includes('DRAFT') : true;
	let currentVlasState = showVlas;

	// Use provided sections if available, otherwise fetch from API
	if (headerParam && footerParam && customerSectionParam) {
		// If section data is provided via params, use it directly
		header = headerParam;
		footer = footerParam;
		customerSectionHTML = customerSectionParam;
		sampleInfoSectionHTML = sampleInfoParam || '';
		analysisSectionHTML = analysisParam || '';
		commentSectionHTML = commentParam || '';
		notesSectionHTML = notesParam || getDefaultNotesSection();
		signatureSectionHTML = signatureParam || getDefaultSignatureSection();
		referenceValues = referenceParam || [];
	} else {
		// Get data either from report or sample
		try {
			if (ppt_uid) {
				console.log(`Fetching report data for ppt_uid: ${ppt_uid}`);
				// Fetch report data if ppt_uid is provided
				const reportResponse = await apiGet(`https://black.irdop.org/to82oe92i/db/get/report/${ppt_uid}`);

				if (reportResponse.status !== 200) {
					throw new Error(`Report API request failed with status ${reportResponse.status}`);
				}

				const reportData = reportResponse.data;
				console.log('Published report data loaded:', reportData);

				// Update draft mode based on ppt_uid
				isDraftMode = ppt_uid.includes('DRAFT');

				// Update VLAS state from report data
				currentVlasState = reportData.is_vlas || showVlas;

				// Extract section HTML from report data
				header = reportData.header_section || getDefaultHeader(currentVlasState);
				footer = reportData.footer_section || getDefaultFooter();
				customerSectionHTML = reportData.customer_section || getDefaultCustomerSection();
				sampleInfoSectionHTML = reportData.sample_section || '';
				analysisSectionHTML = reportData.analysis_section || '';
				commentSectionHTML = reportData.comment_section || '';
				notesSectionHTML = reportData.note_section || getDefaultNotesSection();
				signatureSectionHTML = reportData.signature_section || getDefaultSignatureSection();

				// Extract reference values if available
				if (reportData.reference && Array.isArray(reportData.reference)) {
					// Convert reference array to reference cell HTML elements
					referenceValues = reportData.reference.map(
						(refValue) =>
							`<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:90px;">${refValue}</span></td>`,
					);
				}
			} else if (sample_uid) {
				console.log(`Fetching sample data for sample_uid: ${sample_uid}`);
				// Fetch sample data if only sample_uid is provided
				const sampleResponse = await apiGet(`https://black.irdop.org/to82oe92i/db/get/sample_full/${sample_uid}`);

				if (sampleResponse.status !== 200) {
					throw new Error(`Sample API request failed with status ${sampleResponse.status}`);
				}

				const sampleData = sampleResponse.data;
				console.log('Sample data fetched:', sampleData);

				// Set draft mode to true when generating from sample data
				isDraftMode = true;

				// Get client data if receipt_id is available
				if (sampleData && sampleData.receipt_id) {
					try {
						const clientResponse = await apiGet(
							`https://black.irdop.org/hli1o7az/db/receipt/get/client/${sampleData.receipt_id}`,
						);

						if (clientResponse.status !== 200) {
							throw new Error(`Client API request failed with status ${clientResponse.status}`);
						}

						sampleData.client = clientResponse.data;
					} catch (clientErr) {
						console.error('Error fetching client data:', clientErr);
						// Continue with sample data even if client data fails
						sampleData.client = {};
					}
				} else {
					sampleData.client = {};
				}

				// Check if any analysis has protocol_source = 'IRDOP VS' and set showVlas to true if found
				if (sampleData.analysis && Array.isArray(sampleData.analysis)) {
					const hasVlasProtocol = sampleData.analysis.some((item) => item.protocol_source === 'IRDOP VS');
					if (hasVlasProtocol) {
						currentVlasState = true;
					}
				}

				// Set default values
				header = getDefaultHeader(currentVlasState);
				footer = getDefaultFooter();
				customerSectionHTML = generateCustomerSection(sampleData.client);
				sampleInfoSectionHTML = generateSampleInfoSection(sampleData);
				analysisSectionHTML = generateAnalysisSection(sampleData, showReference);
				commentSectionHTML = showComment ? generateCommentSection() : '';
				notesSectionHTML = getDefaultNotesSection();
				signatureSectionHTML = getDefaultSignatureSection();

				// Generate reference values if needed
				if (sampleData.analysis && Array.isArray(sampleData.analysis)) {
					referenceValues = sampleData.analysis.map(
						() =>
							`<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:90px;">--</span></td>`,
					);
				}
			} else {
				// If neither ppt_uid nor sample_uid is provided, use default values
				console.log('No ppt_uid or sample_uid provided, using default values');
				isDraftMode = true;
				header = getDefaultHeader(currentVlasState);
				footer = getDefaultFooter();
				customerSectionHTML = getDefaultCustomerSection();
				sampleInfoSectionHTML = '';
				analysisSectionHTML = '';
				commentSectionHTML = showComment ? generateCommentSection() : '';
				notesSectionHTML = getDefaultNotesSection();
				signatureSectionHTML = getDefaultSignatureSection();
			}
		} catch (error) {
			console.error('Error fetching data:', error);
			// Use default values if API calls fail
			isDraftMode = true;
			header = getDefaultHeader(currentVlasState);
			footer = getDefaultFooter();
			customerSectionHTML = getDefaultCustomerSection();
			sampleInfoSectionHTML = '';
			analysisSectionHTML = '';
			commentSectionHTML = showComment ? generateCommentSection() : '';
			notesSectionHTML = getDefaultNotesSection();
			signatureSectionHTML = getDefaultSignatureSection();
		}
	}

	// Similar to Report.jsx, send the sections to createReport API
	try {
		// Extract reference values from HTML for API
		const extractReferenceValues = () => {
			if (!referenceValues || referenceValues.length === 0) return [];

			// Extract the text content from reference cells
			return referenceValues.map((cellHtml) => {
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = cellHtml;
				// Try to find span inside the cell first
				const span = tempDiv.querySelector('span');
				return span ? span.textContent.trim() : tempDiv.textContent.trim();
			});
		};

		// Prepare the request body similar to Report.jsx
		const requestBody = {
			report: {
				sample_uid: sample_uid,
				header_section: header,
				footer_section: footer,
				customer_section: customerSectionHTML,
				analysis_section: analysisSectionHTML,
				sample_section: sampleInfoSectionHTML,
				note_section: notesSectionHTML,
				signature_section: signatureSectionHTML,
				comment_section: commentSectionHTML || '',
				reference: extractReferenceValues(),
				is_vlas: currentVlasState,
				is_comment: showComment,
				is_reference: showReference,
				created_by_uid: currentUser?.identity_uid || 'system',
			},
			type: 'save',
		};

		console.log('Sending section data to createReport API:', requestBody);

		// Send the data to the API
		const createReportResponse = await apiPost('https://black.irdop.org/to82oe92i/db/insert/ppt', requestBody);

		if (createReportResponse.status === 200) {
			console.log('Report created successfully:', createReportResponse.data);
		}
	} catch (error) {
		console.error('Error sending report data to API:', error);
		// Continue with report generation even if API fails
	}

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
		const dpi = div.offsetWidth || 96; // Default to 96 DPI if measurement fails
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

			// Enhanced function to split tables across pages with better width handling
			const splitTableAcrossPages = (tableElement) => {
				tableBreakCounts++;

				// Force table to respect page width
				tableElement.style.width = `${A4.width - 2 * A4.sideMargin}mm`;
				tableElement.style.maxWidth = `${A4.width - 2 * A4.sideMargin}mm`;

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
		const pageHeader = header.replace(/-- SƠ BỘ \/ DRAFT --/g, ppt_uid || '-- SƠ BỘ / DRAFT --');

		// Add draft watermark if in draft mode
		const draftWatermarkHTML = isDraftMode ? getDraftWatermark() : '';

		// Create the page element similar to Report.jsx
		pagesHTML += `
      <div class="page">
	  	${draftWatermarkHTML}
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
    
    /* Improved table styling for better width handling */
    table {
      border-collapse: collapse;
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      font-family: 'Gilroy', sans-serif !important;
      table-layout: fixed; /* Changed from auto to fixed for better width control */
      word-break: break-word; /* Add word-break to handle long text */
      page-break-inside: auto; /* Allow tables to break across pages */
    }
    
    table tr {
      height: auto !important; /* Allow rows to grow with content */
      page-break-inside: avoid; /* Try to avoid breaking rows across pages */
    }
    
    table td, table th {
      padding: 4px 8px !important; /* Changed from 6px to 4px */
      border: 1px solid black;
      vertical-align: middle; /* Better alignment for multi-line content */
      height: auto !important; /* Allow cells to grow with content */
      line-height: 1.2; /* Ensure consistent line height */
      overflow: hidden; /* Prevent content from overflowing cells */
      text-overflow: ellipsis; /* Show ellipsis for overflowing text */
    }
    
    /* Fix paragraph styling in table cells */
    table td span, table th span {
      margin: 0 !important;
      padding: 0 !important;
      line-height: 14.39px !important;
      font-family: 'Gilroy', sans-serif !important;
      font-size: 12px;
      display: block;
      word-break: break-word; /* Better handling of long text */
    }
    
    /* Ensure STT/No. column has consistent width */
    table th:first-child, table td:first-child {
      width: 8mm !important;
      min-width: 8mm !important;
      max-width: 8mm !important;
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
      table td span, table th span {
        margin: 0 !important;
        padding: 0 !important;
        line-height: 14.39px !important;
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
	console.log('🖨️ Report HTML generation complete with', paginationResult.pages.length, 'pages');
	console.log(
		'🔍 Using layout:',
		paginationResult.is2PageLayout ? 'Custom 2-page layout' : 'Standard sequential layout',
	);

	// Clean up global references to prevent memory leaks
	global.document = undefined;
	global.window = undefined;

	// Return the complete HTML
	return completeHTML;
};

// Helper function to get default header
function getDefaultHeader(showVlas) {
	return `
<div class=" content_page_header_box" id="thead" style="position:relative; height: fit-content;">
    <div class=" " style="position:relative; display:flex;  overflow:visible;">
        <div>
            <img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/IRDOP%20LOGO%20with%20Name.w8flZn8NnkuLrYinAamIkw.PAAKeAHDVEm9mFvCFtA46Q.svg" 
                 loading="lazy" 
                 class="OQtYGs6LmEKlbdTnVjZ4oA" 
                 style="width:5cm;">
        </div>
		<div style="text-align:right; flex-grow:1; display: flex; flex-direction: column; align-items: flex-end;">
			<p class="" 
			style="font-weight:700; font-size:18px; color:#0058A3; margin-bottom: 0; line-height: 22px;">
				Viện nghiên cứu và phát triển Sản phẩm thiên nhiên
			</p>
			<p class="" 
			style="font-weight:400; font-size:14px; margin: 0; line-height: 15px;">
				/ Institute for Research and Development of Organic Products
			</p>
			<span class="" 
				style="font-weight:400; font-size:14px; border-bottom:1px solid rgba(128,128,128,0.5); 
						width: fit-content; display: block; margin: 0; line-height: 15px; padding-bottom: 1px;">
				Phòng Phân tích - Kiểm nghiệm / Analysis Control Department
			</span>
		</div>

    </div>
    <div class=" " 
         style="padding-top:6mm; position:relative; ">
        <div style="position:relative; text-align:left;">
            <p contenteditable="true" class=" content-header-title" 
               style="font-weight:700; font-size:24pt; color:#0058A3; height: 28px;">
                PHIẾU KẾT QUẢ THỬ NGHIỆM
            </p>
            <p class=" content-header-title_eng" 
               style="font-weight:700; font-size:21pt; color:#0058A3; height: 28px;">
                / Certificate of Analysis
            </p>
            <div class=" display-flex" 
                 style="display: flex; align-items: center; gap: 2mm; font-size:12px; font-weight:400; margin-top: 10px; height: 20px;">
                <span class=" std_ref-title">Xuất bản / ref.:</span>
                <p contenteditable="true" 
                   class="  ref_code" 
                   style="min-width:5pt; margin: 0; margin-right: 2mm;">
                    SƠ BỘ / DRAFT
                </p>
                <span class="  published_date" 
                      style="min-width:5pt; margin: 0;">
					  Ngày / Date: ${new Date().toLocaleDateString('vi-VN', {
							year: 'numeric',
							month: '2-digit',
							day: '2-digit',
						})}
                </span>
            </div>
        </div>
        <div class=" vlas_icon" 
             style="position:absolute; right:-5mm; top:0.2cm; ${showVlas ? '' : 'display:none;'}">
            <img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/VILAS%20997.WIu1HeH5wkOQ5k1olzA3Wg.png" 
                 loading="lazy" 
                 class="" 
                 style="width:5.2cm;">
        </div>
    </div>
</div>`;
}

// Helper function to get default footer
function getDefaultFooter() {
	return `
<div style="border-top:1px solid #4CB748; height:50px; display:flex; padding-top:0pt; align-items: center;">
    <div style="flex-grow:1; text-align: left;">
        <p style="color:#0058A3; margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">
            VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN
        </p>
        <p style="margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">
            IRDOP.ORG
        </p>
        <p style="color: #444444; margin: 0; padding: 0; line-height: 1; font-size: 11px; height: 14px; display: flex; align-items: center;">
            Form: BM06-QT010-KN / Version: 05 / Effective date: 12/03/2025
        </p>
    </div>
    <div style="font-size: 11px; display: flex; flex-direction: column; justify-content: flex-end; height: 100%;">
        <div style="display: flex; align-items: center; height: 14px;">
            <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1; margin-right:2px;">Trang / Pages:</span>
            <div style="display: flex; align-items: center; height: 14px;">
                <span class="page-number" style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span>
                <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">/</span>
                <span class="page-total" style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span>
            </div>
        </div>
    </div>
</div>`;
}

// Helper function to get default customer section
function getDefaultCustomerSection() {
	return `
<div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
	<div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
		<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: left;">Nơi / người gửi mẫu / Customer information</p>
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: right;"></p>
		</div>		
		<div style="display: flex; flex-direction: column; gap: 2px; height: fit-content;">
			<p style="font-weight: bold; margin: 0; text-align: left; font-size: 16px; line-height: 1.2;"></p>
			<p style="margin: 0; font-size: 12px; text-align: left; line-height: 1.2;">--</p>
		</div>
	</div>
</div>`;
}

// Helper function to generate customer section from client data
function generateCustomerSection(clientData) {
	// Default values in case client data is not available
	const clientUid = clientData?.client_uid || '';
	const clientName = clientData?.client_name || '';
	const clientAddress = clientData?.client_address || '';

	return `
<div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
	<div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
		<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: left;">Nơi / người gửi mẫu / Customer information</p>
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: right;">${clientUid}</p>
		</div>		
		<div style="display: flex; flex-direction: column; gap: 2px; height: fit-content;">
			<p style="font-weight: bold; margin: 0; text-align: left; font-size: 16px; line-height: 1.2;">${clientName}</p>
			<p style="margin: 0; font-size: 12px; text-align: left; line-height: 1.2;">${clientAddress || '--'}</p>
		</div>
	</div>
</div>`;
}

// Helper function to generate sample information section from API data
function generateSampleInfoSection(data) {
	// Get the sample_uid from data
	const sampleId = data.sample_uid || '';

	// Get the sample_information array from data and filter out items with empty fvalue
	const sampleInfo = data.sample_information || [];
	// Map each sample information item to a row in the sample info section
	const infoRows = sampleInfo
		.map((item) => {
			const fieldName = item.fname || '';
			const fieldValue = item.fvalue || '--';

			// Extract field label and English translation (if present)
			const parts = fieldName.split('/');
			const mainLabel = parts[0].trim();
			const engLabel = parts.length > 1 ? ` / ${parts[1].trim()}` : '';

			// Process mainLabel to replace "SX" with "sản xuất" and "HSD" with "Hạn sử dụng"
			let displayMainLabel = mainLabel;
			if (mainLabel.includes('SX')) {
				displayMainLabel = mainLabel.replace('SX', 'sản xuất');
			} else if (mainLabel.includes('HSD')) {
				displayMainLabel = mainLabel.replace('HSD', 'Hạn sử dụng');
			}

			return `
	<div style="display: flex; ${fieldName.includes('Ngày tiếp nhận') && 'margin-top: 8px;'}">
		<div style="width: 30%; font-size: 12px; line-height: 1.2; text-align: left; padding-right: 10px; display: flex; align-items: center;">
			<p style="font-weight:bold; margin-right: 4px;">${displayMainLabel}</p> ${engLabel}:
		</div>
		<div style="width: 70%; font-size: 12px; line-height: 1.2; text-align: left; padding-left: 10px;" >
			<p style="margin: 0; ${mainLabel.toLowerCase().includes('tên mẫu') ? 'font-weight: bold;' : ''}">${fieldValue}</p>
		</div>
	</div>`;
		})
		.join('');

	return `
<div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
    <div style="padding: 5pt 8pt;; flex-grow: 1; position: relative;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <p style="font-size: 11px; line-height: 1.2; margin: 0; text-align: left;">
                Thông tin mẫu thử / Sample information:
            </p>
            <p style="font-size: 11px; line-height: 1.4; margin: 0; text-align: left;">
                ${sampleId}
            </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 2px;">
            ${infoRows}
        </div>
    </div>
</div>`;
}

// Helper function to generate analysis section from API data
function generateAnalysisSection(data, showReference) {
	// Get the analysis array from data
	const analysisItems = data.analysis || [];

	// Define column widths here, at the beginning of the function
	// Adjust span widths based on whether reference column is shown
	const col2Width = showReference ? '170px' : '190px';
	const col3Width = showReference ? '110px' : '110px';
	const col4Width = showReference ? '60px' : '70px';

	// Add extra table header for reference if needed
	const referenceHeader = showReference
		? `
		<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width:10px;">
			<strong>Tham chiếu</strong> <br> <span style="font-size: 12px; color: #444444; width: 90px;">/ Standard Ref</span>
		</th>`
		: '';

	// Map each analysis item to a row in the table
	let analysisRows = '';
	if (analysisItems.length > 0) {
		analysisRows = analysisItems
			.map((item, index) => {
				const parameterName = item.parameter_name || '--';
				const result = item.result_value || '--';
				const unit = item.result_unit || '--';
				const protocol = item?.protocol_source + ' ' + item.protocol_code || '--';

				// Reference cell
				const referenceCell = showReference
					? `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:90px;">--</span></td>`
					: '';

				return `
			<tr style="height:10px;">
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width:fit-content; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:26px;">${
					index + 1
				}.</span></td>
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:${col2Width};">${parameterName}</span></td>
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:${col3Width};">${result}</span></td>
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:${col4Width};">${unit}</span></td>
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block;">${protocol}</span></td>${referenceCell}
			</tr>`;
			})
			.join('');
	} else {
		// If no analysis items, include a placeholder row
		const referenceCell = showReference
			? `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:90px;">--</span></td>`
			: '';

		analysisRows = `
		<tr style="height:auto;">
			<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width:fit-content; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:26px;">1</span></td>
			<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:${col2Width};">--</span></td>
			<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:${col3Width};">--</span></td>
			<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block; width:${col4Width};">--</span></td>
			<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; height:fit-content;"><span style="margin:0; padding:0; line-height:14.39px; display:block;">--</span></td>${referenceCell}
		</tr>`;
	}

	return `
<div style="margin:0; padding:0;">
    <table style="width: 100%; min-width: 100%; border-collapse: collapse; text-align: left; margin:0; padding:0; font-size:12px; line-height:1.4; table-layout: auto;">
        <thead>
            <tr>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: fit-content; text-align:left; font-size:12px; width:10px;">
                    <strong>STT</strong> <br> <span style="font-size: 12px; color: #444444; width:28px">/ No.</span>
                </th>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width:10px;">
                    <strong>Phép thử</strong> <br> <span style="font-size: 12px; color: #444444; width:${col2Width};">/ Tests</span>
                </th>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width:10px;">
                    <strong>Kết quả</strong> <br> <span style="font-size: 12px; color: #444444; width:${col3Width};">/ Test result</span>
                </th>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width:10px;">
                    <strong>Đơn vị </strong><br> <span style="font-size: 12px; color: #444444; width:${col4Width};">/ Unit</span>
                </th>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width:fit-content;">
                    <strong>Phương pháp</strong> <br> <span style="font-size: 12px; color: #444444;">/ Protocol</span>
                </th>${referenceHeader}
            </tr>
        </thead>
        <tbody>
            ${analysisRows}
        </tbody>
    </table>
</div>`;
}

// Helper function to generate comment section
function generateCommentSection() {
	return `
<div style="padding-top: 0; display: flex; flex-direction: column; ; margin:0;">
    <div style="padding: 0pt; flex-grow: 1; position: relative;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
			<p style="margin:0; font-size:12px; line-height:1.2;">
				Nhận xét / Comment:
			</p>
		</div>
		<div style="display: flex; flex-direction: column; gap: 2px; padding-left: 8px;">
			<p class="comment-content print-text-paragraph" 
			   style="font-size:12px; margin:0; padding:0; line-height: 1.2; text-align:left;">
				--
			</p>
		</div>
	</div>
</div>`;
}

// Helper function to get default notes section
function getDefaultNotesSection() {
	return `
<div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
    <div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
			<p class="note test_note_title" 
			   style="font-weight:bold ; margin:0; font-size:11px; line-height:1.0; height: fit-content; ">
				Ghi chú / Note:
			</p>
		</div>
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<p class="note test_note_detail print-text-paragraph" 
			   style="font-size:11px; margin:0; padding:0; line-height: 1.2; text-align:left;">
				KPH: Không phát hiện / Not detected.<br>
				LOD: Giới hạn phát hiện / Limit of detection.<br>
				LOQ: Giới hạn định lượng / Limit of quantification.<br>
				IRDOP: Thử nghiệm thử do IRDOP thực hiện / Protocol conducted by IRDOP.<br>
				VS: Phương pháp được công nhận theo VILAS / VILAS accredited items.<br>
				(EX): Phép thử thực hiện bởi nhà thầu phụ / Tests conducted by subcontractors.<br>
				Thông tin mẫu thử do khách hàng cung cấp / Sample information provided by the customer.<br>
				Kết quả chỉ có giá trị với mẫu thử / The results are only valid for the tested sample(s).
			</p>
		</div>
		
	</div>
</div>`;
}

// Helper function to get default signature section
function getDefaultSignatureSection() {
	return `
<div style="padding-top: 0; display: flex; ; margin:0;">
	<div style="padding: 0pt; flex-grow: 1; position: relative; display:flex; height:2.7cm;">
		<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
			<strong contenteditable="true" 
					class="signature signer_second_title print-text-paragraph"
					style="font-size:12px; line-height:1.2; margin:0;">
				PHÒNG PHÂN TÍCH KIỂM NGHIỆM/<br>KIỂM SOÁT CHẤT LƯỢNG / Laboratory Manager
			</strong>
			<p contenteditable="true" 
			   class="signature signer_second_name print-text-paragraph" 
			   style="font-size:12px; margin:0; line-height:1.4;">
				Trần Thị Oanh
			</p>
		</div>
		<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
			<strong contenteditable="true" 
					class="signature signer_fist_title print-text-paragraph"
					style="font-size:12px; line-height:1.2; margin:0;">
				KT.VIỆN TRƯỞNG<br>PHÓ VIỆN TRƯỞNG / Vice President
			</strong>
			<p contenteditable="true" 
			   class="signature signer_first_name print-text-paragraph" 
			   style="font-size:12px; margin:0; line-height:1.4;">
				Nguyễn Bá Xuân Trường
			</p>
		</div>
	</div>
</div>`;
}
