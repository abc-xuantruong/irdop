const axios = global.get('axios');
const { chromium } = global.get('playwright');

/**
 * Main function to generate print page
 */
async function generatePrintPage(sample_uid, ppt_uid, is_save = false, is_publish = false) {
	let browser;
	let context;
	try {
		if (!sample_uid && !ppt_uid) {
			throw new Error('Invalid input: sample_uid and ppt_uid are both missing');
		}

		// Step 1: Generate sections from API response
		const sectionsData = await generateSectionsFromAPI(sample_uid, ppt_uid, is_save, is_publish);

		// Step 2: Initialize browser for rendering and measuring
		browser = await chromium.connect('ws://playwright:3000');

		context = await browser.newContext({
			viewport: { width: 795, height: 1123 },
		});

		// Step 3: Render sections in browser and get computed styles
		const measurementData = await renderAndMeasureSections(context, sectionsData);

		// Step 4: Apply pagination logic
		const paginatedContent = applyPaginationLogic(sectionsData, measurementData);

		// Step 5: Generate final HTML with arranged content (FIXED: Pass measurements)
		const finalHTML = generateFinalHTML(sectionsData, paginatedContent, measurementData);

		return finalHTML;
	} catch (err) {
		node.warn(`Error rendering print page for sample_uid=${sample_uid}, ppt_uid=${ppt_uid}: ${err.message}`);
		throw err;
	} finally {
		if (context) {
			try {
				await context.close();
			} catch (closeErr) {
				node.warn(`Error closing context: ${closeErr.message}`);
			}
		}
		if (browser) {
			try {
				await browser.close();
			} catch (closeErr) {
				node.warn(`Error closing browser: ${closeErr.message}`);
			}
		}
		if (global.gc) {
			global.gc();
		}
	}
}

/**
 * Step 1: Generate sections from API response
 */
async function generateSectionsFromAPI(sample_uid, ppt_uid, is_save, is_publish) {
	let sectionsData = {
		// Metadata
		sample_uid,
		ppt_uid,
		is_save,
		is_publish,
		isDraft: ppt_uid && ppt_uid.includes('DRAFT'),
		showComment: false,
		showVlas: false,
		showReference: false,
		referenceValues: [],
		apiResponsePptUid: null,

		// Generated sections
		headerHTML: '',
		footerHTML: '',
		customerSection: '',
		sampleInfoSection: '',
		analysisSection: '',
		commentSection: '',
		notesSection: '',
		signatureSection: '',

		// Helper sections
		nextPageNotification: `
            <div style="padding: 10px 0; text-align: center; font-size: 12px; font-style: italic; color: #666;">
                - Xem kết quả ở trang tiếp theo / The results are on the next page -
            </div>`,
		spacing: `<div style="height: 4mm; margin:0; padding:0;"></div>`,
	};

	let type = 'view';
	if (is_save) type = 'save';
	else if (is_publish) type = 'publish';

	// Generate sections based on ppt_uid or sample_uid
	if (ppt_uid) {
		await generateSectionsFromReport(sectionsData, ppt_uid);
	} else {
		await generateSectionsFromSample(sectionsData, sample_uid);
	}

	// Handle save/publish logic
	if (is_save || is_publish) {
		await handleSavePublishLogic(sectionsData, type);
	}

	return sectionsData;
}

/**
 * Generate sections from existing report
 */
async function generateSectionsFromReport(sectionsData, ppt_uid) {
	try {
		const reportResponse = await axios.get(`https://black.irdop.org/to82oe92i/db/get/report/${ppt_uid}`);
		if (reportResponse.status !== 200) {
			throw new Error(
				`Failed to fetch report: status=${reportResponse.status}, message=${reportResponse.data?.message || 'Unknown'}`,
			);
		}

		const reportData = reportResponse.data;

		sectionsData.headerHTML = reportData.header_section || '';
		sectionsData.footerHTML = reportData.footer_section || '';
		sectionsData.customerSection = reportData.customer_section || '';
		sectionsData.sampleInfoSection = reportData.sample_section || '';
		sectionsData.analysisSection = reportData.analysis_section || '';
		sectionsData.commentSection = reportData.comment_section || '';
		sectionsData.notesSection = reportData.note_section || '';
		sectionsData.signatureSection = reportData.signature_section || '';
		sectionsData.showComment = reportData.is_comment || false;
		sectionsData.showVlas = reportData.is_vlas || false;
		sectionsData.showReference = reportData.is_reference || false;

		// Process analysis section for fixed width
		if (sectionsData.analysisSection) {
			sectionsData.analysisSection = processAnalysisSection(sectionsData.analysisSection);
		}

		// Process reference values
		if (reportData.reference && Array.isArray(reportData.reference)) {
			sectionsData.referenceValues = reportData.reference.map(
				(refValue) =>
					`<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${refValue}</td>`,
			);
		}

		// Clean up reportData
		Object.keys(reportData).forEach((key) => (reportData[key] = null));
	} catch (err) {
		node.warn(`Error fetching report for ppt_uid=${ppt_uid}: ${err.message}`);
		throw err;
	}
}

/**
 * Generate sections from sample data
 */
async function generateSectionsFromSample(sectionsData, sample_uid) {
	try {
		const sampleResponse = await axios.get(`https://black.irdop.org/to82oe92i/db/get/sample_full/${sample_uid}`);
		if (sampleResponse.status !== 200) {
			throw new Error(
				`Failed to fetch sample: status=${sampleResponse.status}, message=${sampleResponse.data?.message || 'Unknown'}`,
			);
		}

		const sampleData = sampleResponse.data;

		// Check for VLAS
		if (sampleData.analysis && Array.isArray(sampleData.analysis)) {
			sectionsData.showVlas = sampleData.analysis.some((item) => item.protocol_source === 'IRDOP VS');
		}

		// Fetch client data
		try {
			if (sampleData.receipt_id) {
				const clientResponse = await axios.get(
					`https://black.irdop.org/hli1o7az/db/receipt/get/client/${sampleData.receipt_id}`,
				);
				if (clientResponse.status === 200) {
					sampleData.client = clientResponse.data;
				} else {
					node.warn(
						`Failed to fetch client data for receipt_id=${sampleData.receipt_id}: status=${clientResponse.status}`,
					);
				}
			}
		} catch (clientErr) {
			node.warn(`Error fetching client data: ${clientErr.message}`);
		}

		// Generate all sections
		sectionsData.customerSection = generateCustomerSection(sampleData.client);
		sectionsData.sampleInfoSection = generateSampleInfoSection(sampleData);
		sectionsData.analysisSection = generateAnalysisSection(
			sampleData,
			sectionsData.showReference,
			sectionsData.referenceValues,
		);
		sectionsData.commentSection = sectionsData.showComment ? generateCommentSection() : '';
		sectionsData.notesSection = generateNotesSection();
		sectionsData.signatureSection = generateSignatureSection();
		sectionsData.headerHTML = generateHeaderHTML(sectionsData.showVlas, sectionsData.ppt_uid); // FIXED: Pass ppt_uid
		sectionsData.footerHTML = generateFooterHTML();

		// Clean up sampleData
		Object.keys(sampleData).forEach((key) => {
			if (key !== 'client' && key !== 'analysis' && key !== 'sample_information') {
				sampleData[key] = null;
			}
		});
		sampleData.client = sampleData.client || null;
		sampleData.analysis = null;
		sampleData.sample_information = null;
	} catch (err) {
		node.warn(`Error fetching sample for sample_uid=${sample_uid}: ${err.message}`);
		throw err;
	}
}

/**
 * Handle save/publish API calls
 */
async function handleSavePublishLogic(sectionsData, type) {
	try {
		let created_by_uid = 'TranTu02'; // Current user from context

		try {
			const userResponse = await axios.get('https://black.irdop.org/to82oe92i/db/get/current_user');
			if (userResponse.status === 200 && userResponse.data && userResponse.data.identity_uid) {
				created_by_uid = userResponse.data.identity_uid;
			}
		} catch (userError) {
			node.warn(`Could not get current user: ${userError.message}`);
		}

		const extractTextFromHtml = (html) =>
			html
				.replace(/<[^>]*>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		const processedReferenceValues = sectionsData.referenceValues.map((ref) => extractTextFromHtml(ref));

		const requestBody = {
			sample_uid: sectionsData.sample_uid,
			header_section: sectionsData.headerHTML,
			footer_section: sectionsData.footerHTML,
			customer_section: sectionsData.customerSection,
			analysis_section: sectionsData.analysisSection,
			sample_section: sectionsData.sampleInfoSection,
			note_section: sectionsData.notesSection,
			signature_section: sectionsData.signatureSection,
			comment_section: sectionsData.commentSection || '',
			reference: processedReferenceValues,
			is_vlas: sectionsData.showVlas,
			is_comment: sectionsData.showComment,
			is_reference: sectionsData.showReference,
			created_by_uid,
			receipt_note: '',
			additional_request: '',
			is_save: sectionsData.is_save,
			is_publish: sectionsData.is_publish,
		};

		const response = await axios.post('https://black.irdop.org/to82oe92i/db/insert/ppt', {
			report: requestBody,
			type,
		});

		if (response.status === 200 && response.data.ppt_uid) {
			sectionsData.apiResponsePptUid = response.data.ppt_uid;
			sectionsData.ppt_uid = sectionsData.apiResponsePptUid;
			sectionsData.isDraft = sectionsData.ppt_uid.includes('DRAFT');
		}
	} catch (apiError) {
		node.warn(`Error sending ${type} request for ppt_uid=${sectionsData.ppt_uid || 'new'}: ${apiError.message}`);
	}
}

/**
 * Step 2: Render sections in browser and get computed styles
 * FIXED: Updated with Nunito Sans font
 */
async function renderAndMeasureSections(context, sectionsData) {
	const page = await context.newPage();
	page.setDefaultTimeout(180000);

	// Page event listeners
	page.on('console', (logMsg) => {
		if (logMsg.type() === 'error') {
			node.warn(`Page ERROR: ${logMsg.text()}`);
		} else if (logMsg.type() === 'warning') {
			node.warn(`Page WARNING: ${logMsg.text()}`);
		}
	});

	const A4 = {
		width: 210,
		height: 297,
		topMargin: 15,
		bottomMargin: 8,
		sideMargin: 10,
		headerSpacing: 5,
		footerSpacing: 2,
	};

	// Helper function for mm to px conversion
	const mmToPx = (mm) => mm * 3.78;

	// Get base CSS with fonts included
	const basePrintCss = getPrintCSSWithFonts(A4, false);

	// First, measure header and footer independently
	const headerFooterMeasurementHTML = `
        <html>
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap" rel="stylesheet">
            <style>${basePrintCss}</style>
        </head>
        <body>
            <div style="width: 794px; position: relative; padding: ${A4.topMargin}mm ${A4.sideMargin}mm;">
                <div class="header" id="header-measure" style="position: static; width: 100%; border: 2px solid red;">${sectionsData.headerHTML}</div>
            </div>
            <div style="width: 794px; position: relative; margin-top: 20px; padding: 0 ${A4.sideMargin}mm;">
                <div class="footer" id="footer-measure" style="position: static; width: 100%; border: 2px solid blue;">${sectionsData.footerHTML}</div>
            </div>
        </body>
        </html>
    `;

	await page.setContent(headerFooterMeasurementHTML, { waitUntil: 'networkidle' });

	// Wait for fonts to load and elements to be rendered
	await page.waitForSelector('#header-measure');
	await page.waitForSelector('#footer-measure');

	// Wait for fonts to load
	await page.evaluate(() => {
		return document.fonts.ready;
	});

	// Get header and footer heights first
	const headerFooterMeasurements = await page.evaluate(() => {
		const headerElement = document.querySelector('#header-measure');
		const footerElement = document.querySelector('#footer-measure');

		const headerRect = headerElement.getBoundingClientRect();
		const footerRect = footerElement.getBoundingClientRect();

		return {
			headerHeight: headerElement ? headerElement.offsetHeight : 0,
			footerHeight: footerElement ? footerElement.offsetHeight : 0,
			headerRect: {
				width: headerRect.width,
				height: headerRect.height,
				top: headerRect.top,
				left: headerRect.left,
			},
			footerRect: {
				width: footerRect.width,
				height: footerRect.height,
				top: footerRect.top,
				left: footerRect.left,
			},
		};
	});

	// Calculate positioning values
	const marginTopPx = mmToPx(A4.topMargin);
	const marginBottomPx = mmToPx(A4.bottomMargin);
	const headerSpacingPx = mmToPx(A4.headerSpacing);
	const footerSpacingPx = mmToPx(A4.footerSpacing);

	// FIXED: Calculate content area position with proper footer space reservation
	const contentTopPosition = marginTopPx + headerFooterMeasurements.headerHeight + headerSpacingPx;
	const footerStartPosition = 1122 - marginBottomPx - headerFooterMeasurements.footerHeight;
	const contentBottomPosition = footerStartPosition - footerSpacingPx;
	const availableContentHeight = contentBottomPosition - contentTopPosition;

	// Validate content area
	if (availableContentHeight <= 0) {
		throw new Error(`Invalid content area: available height is ${availableContentHeight}px`);
	}

	// Create measurement HTML for all sections with proper positioning and constraints
	const sectionsMeasurementHTML = `
        <html>
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap" rel="stylesheet">
            <style>
                ${basePrintCss}
                .debug-page {
                    width: 794px;
                    height: 1122px;
                    position: relative;
                    margin: 0 auto;
                    background: white;
                    border: 1px solid #ccc;
                }
                .debug-header {
                    position: absolute;
                    top: ${A4.topMargin}mm;
                    left: ${A4.sideMargin}mm;
                    right: ${A4.sideMargin}mm;
                    width: calc(100% - ${2 * A4.sideMargin}mm);
                    background: rgba(255, 0, 0, 0.1);
                    border: 1px solid red;
                }
                .debug-content {
                    position: absolute;
                    top: ${contentTopPosition}px;
                    left: ${A4.sideMargin}mm;
                    right: ${A4.sideMargin}mm;
                    width: calc(100% - ${2 * A4.sideMargin}mm);
                    height: ${availableContentHeight}px;
                    max-height: ${availableContentHeight}px;
                    overflow: hidden;
                    background: rgba(0, 255, 0, 0.1);
                    border: 1px solid green;
                    box-sizing: border-box;
                }
                .debug-footer {
                    position: absolute;
                    top: ${footerStartPosition}px;
                    left: ${A4.sideMargin}mm;
                    right: ${A4.sideMargin}mm;
                    width: calc(100% - ${2 * A4.sideMargin}mm);
                    background: rgba(0, 0, 255, 0.1);
                    border: 1px solid blue;
                }
                .section-wrapper {
                    margin-bottom: 4mm;
                    border: 1px dashed #999;
                    padding: 2px;
                }
            </style>
        </head>
        <body>
            <div class="debug-page">
                <!-- Header positioned -->
                <div class="debug-header">
                    <div id="header-final">${sectionsData.headerHTML}</div>
                </div>
                
                <!-- Content area positioned below header with height constraints -->
                <div class="debug-content">
                    <div class="section-wrapper">
                        <div id="customer-section">${sectionsData.customerSection}</div>
                    </div>
                    <div class="section-wrapper">
                        <div id="sample-info-section">${sectionsData.sampleInfoSection}</div>
                    </div>
                    <div class="section-wrapper">
                        <div id="analysis-section">${sectionsData.analysisSection}</div>
                    </div>
                    ${
											sectionsData.showComment
												? `
                    <div class="section-wrapper">
                        <div id="comment-section">${sectionsData.commentSection}</div>
                    </div>`
												: ''
										}
                    <div class="section-wrapper">
                        <div id="notes-section">${sectionsData.notesSection}</div>
                    </div>
                    <div class="section-wrapper">
                        <div id="signature-section">${sectionsData.signatureSection}</div>
                    </div>
                </div>
                
                <!-- Footer positioned -->
                <div class="debug-footer">
                    <div id="footer-final">${sectionsData.footerHTML}</div>
                </div>
                
                <!-- Measurement elements outside main layout -->
                <div style="position: absolute; top: 2000px; width: calc(100% - ${2 * A4.sideMargin}mm); left: ${
		A4.sideMargin
	}mm;">
                    <div id="spacing-measure">${sectionsData.spacing}</div>
                    <div id="notification-measure">${sectionsData.nextPageNotification}</div>
                </div>
            </div>
        </body>
        </html>
    `;

	await page.setContent(sectionsMeasurementHTML, { waitUntil: 'networkidle' });

	// Wait for all section elements to be rendered and fonts to load
	await page.waitForSelector('#customer-section');
	await page.waitForSelector('#sample-info-section');
	await page.waitForSelector('#analysis-section');

	// Wait for fonts to load
	await page.evaluate(() => {
		return document.fonts.ready;
	});

	// FIXED: Get computed measurements with single object parameter
	const measurements = await page.evaluate(
		(params) => {
			const { expectedContentHeight, contentTop, footerStart } = params;

			const getElementDimensions = (selector, label) => {
				const element = document.querySelector(selector);
				if (!element) return { height: 0, width: 0, top: 0, left: 0, found: false };

				const rect = element.getBoundingClientRect();
				const computed = window.getComputedStyle(element);

				const result = {
					height: element.offsetHeight,
					width: element.offsetWidth,
					top: rect.top,
					left: rect.left,
					found: true,
					computedMarginTop: computed.marginTop,
					computedPaddingTop: computed.paddingTop,
					offsetTop: element.offsetTop,
					scrollTop: element.scrollTop,
				};

				console.log(`${label}: height=${result.height}px, top=${result.top}px, offsetTop=${result.offsetTop}px`);
				return result;
			};

			const measureTableInfo = (selector) => {
				const element = document.querySelector(selector);
				if (!element) return null;

				const table = element.querySelector('table');
				if (!table) return null;

				const header = table.querySelector('thead');
				const headerHeight = header ? header.offsetHeight : 0;

				const rows = Array.from(table.querySelectorAll('tbody tr'));
				const rowHeights = rows.map((row) => row.offsetHeight);
				const rowsHtml = rows.map((row) => row.outerHTML);

				const tableAttributes = Array.from(table.attributes)
					.map((attr) => `${attr.name}="${attr.value}"`)
					.join(' ');

				const avgRowHeight = rows.length > 0 ? rowHeights.reduce((sum, h) => sum + h, 0) / rows.length : 30;

				// Get column widths
				const headerRow = header ? header.querySelector('tr') : null;
				const columnWidths = [];
				if (headerRow) {
					const headerCells = headerRow.querySelectorAll('th');
					headerCells.forEach((cell) => {
						const computedStyle = window.getComputedStyle(cell);
						columnWidths.push({
							width: cell.style.width || cell.getAttribute('width') || computedStyle.width,
							minWidth: cell.style.minWidth || cell.getAttribute('min-width') || computedStyle.minWidth,
							actualWidth: cell.offsetWidth,
						});
					});
				}

				return {
					headerHeight,
					headerHTML: header ? header.outerHTML : '',
					rowHeights,
					rowsHtml,
					tableAttributes,
					avgRowHeight,
					columnWidths,
					totalTableHeight: element.offsetHeight,
					tableWidth: table.offsetWidth,
				};
			};

			// Validate layout positioning
			const contentContainer = document.querySelector('.debug-content');
			const footerContainer = document.querySelector('.debug-footer');

			const contentRect = contentContainer ? contentContainer.getBoundingClientRect() : null;
			const footerRect = footerContainer ? footerContainer.getBoundingClientRect() : null;

			console.log(`=== LAYOUT VALIDATION ===`);
			console.log(`Expected content height: ${expectedContentHeight}px`);
			console.log(`Expected content top: ${contentTop}px`);
			console.log(`Expected footer start: ${footerStart}px`);
			console.log(`Actual content top: ${contentRect ? contentRect.top : 'NOT FOUND'}px`);
			console.log(`Actual footer top: ${footerRect ? footerRect.top : 'NOT FOUND'}px`);
			console.log(
				`Content-Footer gap: ${
					footerRect && contentRect ? footerRect.top - (contentRect.top + contentRect.height) : 'CANNOT CALCULATE'
				}px`,
			);

			return {
				// Layout validation
				contentContainerTop: contentRect ? contentRect.top : 0,
				contentContainerHeight: contentRect ? contentRect.height : 0,
				footerContainerTop: footerRect ? footerRect.top : 0,
				layoutValid: contentRect && footerRect ? contentRect.top + contentRect.height <= footerRect.top : false,

				// Section measurements
				customerSection: getElementDimensions('#customer-section', 'Customer'),
				sampleInfoSection: getElementDimensions('#sample-info-section', 'Sample Info'),
				analysisSection: getElementDimensions('#analysis-section', 'Analysis'),
				commentSection: getElementDimensions('#comment-section', 'Comment'),
				notesSection: getElementDimensions('#notes-section', 'Notes'),
				signatureSection: getElementDimensions('#signature-section', 'Signature'),

				// Helper measurements
				spacingHeight: getElementDimensions('#spacing-measure', 'Spacing').height,
				notificationHeight: getElementDimensions('#notification-measure', 'Notification').height,

				// Table-specific measurements
				analysisTableInfo: measureTableInfo('#analysis-section'),
			};
		},
		{
			expectedContentHeight: availableContentHeight,
			contentTop: contentTopPosition,
			footerStart: footerStartPosition,
		},
	);

	await page.close();

	// FIXED: Validate layout and add comprehensive measurements
	const finalMeasurements = {
		headerHeight: headerFooterMeasurements.headerHeight,
		footerHeight: headerFooterMeasurements.footerHeight,

		customerSectionHeight: measurements.customerSection.height,
		sampleInfoSectionHeight: measurements.sampleInfoSection.height,
		analysisSectionHeight: measurements.analysisSection.height,
		commentSectionHeight: measurements.commentSection.height,
		notesSectionHeight: measurements.notesSection.height,
		signatureSectionHeight: measurements.signatureSection.height,
		spacingHeight: measurements.spacingHeight,
		notificationHeight: measurements.notificationHeight,

		// FIXED: Use properly calculated values
		availableContentHeight: availableContentHeight,
		contentTopPosition: contentTopPosition,
		contentBottomPosition: contentBottomPosition,
		footerStartPosition: footerStartPosition,

		A4: A4,
		analysisTableInfo: measurements.analysisTableInfo,

		// Layout validation
		layoutValid: measurements.layoutValid,
	};

	if (!measurements.layoutValid) {
		node.warn(`WARNING: Layout validation failed - content may overlap with footer!`);
	}

	const totalContentHeight =
		finalMeasurements.customerSectionHeight +
		finalMeasurements.spacingHeight +
		finalMeasurements.sampleInfoSectionHeight +
		finalMeasurements.spacingHeight +
		finalMeasurements.analysisSectionHeight +
		finalMeasurements.spacingHeight +
		(sectionsData.showComment ? finalMeasurements.commentSectionHeight + finalMeasurements.spacingHeight : 0) +
		finalMeasurements.notesSectionHeight +
		finalMeasurements.spacingHeight +
		finalMeasurements.signatureSectionHeight;

	return finalMeasurements;
}

/**
 * Step 3: Apply pagination logic based on measurements
 * FIXED: Improved pagination with better space management
 */
function applyPaginationLogic(sectionsData, measurements) {
	const pages = [];
	const { availableContentHeight } = measurements;

	// Add safety margin to prevent footer overlap
	const SAFETY_MARGIN = 20; // 20px safety margin
	const safeContentHeight = availableContentHeight - SAFETY_MARGIN;

	// Calculate total content height
	let totalContentHeight =
		measurements.customerSectionHeight +
		measurements.spacingHeight +
		measurements.sampleInfoSectionHeight +
		measurements.spacingHeight +
		measurements.analysisSectionHeight +
		measurements.spacingHeight;

	if (sectionsData.showComment) {
		totalContentHeight += measurements.commentSectionHeight + measurements.spacingHeight;
	}

	totalContentHeight +=
		measurements.notesSectionHeight + measurements.spacingHeight + measurements.signatureSectionHeight;

	// Decide pagination strategy
	if (totalContentHeight <= safeContentHeight) {
		// Single page layout
		return createSinglePageLayout(sectionsData, measurements);
	} else {
		// Check for special two-page layout
		const specialLayoutResult = checkSpecialTwoPageLayout(sectionsData, measurements, safeContentHeight);
		if (specialLayoutResult.canUse) {
			return specialLayoutResult.pages;
		} else {
			// Complex multi-page layout
			return createComplexMultiPageLayout(sectionsData, measurements, safeContentHeight);
		}
	}
}

/**
 * Create single page layout
 */
function createSinglePageLayout(sectionsData, measurements) {
	const contentElements = [
		{ type: 'section', content: sectionsData.customerSection },
		{ type: 'spacing', content: sectionsData.spacing },
		{ type: 'section', content: sectionsData.sampleInfoSection },
		{ type: 'spacing', content: sectionsData.spacing },
		{ type: 'section', content: sectionsData.analysisSection },
		{ type: 'spacing', content: sectionsData.spacing },
	];

	if (sectionsData.showComment && sectionsData.commentSection) {
		contentElements.push(
			{ type: 'section', content: sectionsData.commentSection },
			{ type: 'spacing', content: sectionsData.spacing },
		);
	}

	contentElements.push(
		{ type: 'section', content: sectionsData.notesSection },
		{ type: 'spacing', content: sectionsData.spacing },
		{ type: 'section', content: sectionsData.signatureSection },
	);

	return [
		{
			pageNumber: 1,
			elements: contentElements,
			totalHeight:
				measurements.customerSectionHeight +
				measurements.spacingHeight +
				measurements.sampleInfoSectionHeight +
				measurements.spacingHeight +
				measurements.analysisSectionHeight +
				measurements.spacingHeight +
				(sectionsData.showComment ? measurements.commentSectionHeight + measurements.spacingHeight : 0) +
				measurements.notesSectionHeight +
				measurements.spacingHeight +
				measurements.signatureSectionHeight,
		},
	];
}

/**
 * Check if special two-page layout is possible
 * FIXED: Use safe content height
 */
function checkSpecialTwoPageLayout(sectionsData, measurements, safeContentHeight) {
	const page1Height =
		measurements.customerSectionHeight +
		measurements.spacingHeight +
		measurements.sampleInfoSectionHeight +
		measurements.spacingHeight +
		measurements.notificationHeight +
		measurements.spacingHeight +
		measurements.notesSectionHeight;

	const page2Height =
		measurements.analysisSectionHeight +
		measurements.spacingHeight +
		(sectionsData.showComment ? measurements.commentSectionHeight + measurements.spacingHeight : 0) +
		measurements.signatureSectionHeight;

	if (page1Height <= safeContentHeight && page2Height <= safeContentHeight) {
		const page1Elements = [
			{ type: 'section', content: sectionsData.customerSection },
			{ type: 'spacing', content: sectionsData.spacing },
			{ type: 'section', content: sectionsData.sampleInfoSection },
			{ type: 'spacing', content: sectionsData.spacing },
			{ type: 'notification', content: sectionsData.nextPageNotification },
			{ type: 'spacing', content: sectionsData.spacing },
			{ type: 'section', content: sectionsData.notesSection },
		];

		const page2Elements = [
			{ type: 'section', content: sectionsData.analysisSection },
			{ type: 'spacing', content: sectionsData.spacing },
		];

		if (sectionsData.showComment && sectionsData.commentSection) {
			page2Elements.push(
				{ type: 'section', content: sectionsData.commentSection },
				{ type: 'spacing', content: sectionsData.spacing },
			);
		}

		page2Elements.push({ type: 'section', content: sectionsData.signatureSection });

		return {
			canUse: true,
			pages: [
				{ pageNumber: 1, elements: page1Elements, totalHeight: page1Height },
				{ pageNumber: 2, elements: page2Elements, totalHeight: page2Height },
			],
		};
	}

	return { canUse: false };
}

/**
 * Create complex multi-page layout with table splitting
 * FIXED: Improved table pagination with proper height management
 */
function createComplexMultiPageLayout(sectionsData, measurements, safeContentHeight) {
	const pages = [];

	// First page with customer and sample info
	const firstPageElements = [
		{ type: 'section', content: sectionsData.customerSection },
		{ type: 'spacing', content: sectionsData.spacing },
		{ type: 'section', content: sectionsData.sampleInfoSection },
	];

	let firstPageHeight =
		measurements.customerSectionHeight + measurements.spacingHeight + measurements.sampleInfoSectionHeight;

	// Check if we can fit some analysis table rows on first page
	const remainingFirstPageSpace = safeContentHeight - firstPageHeight - measurements.spacingHeight;

	if (measurements.analysisTableInfo && remainingFirstPageSpace >= measurements.analysisTableInfo.headerHeight + 60) {
		// Split table across pages with improved logic
		const tablePaginationResult = paginateAnalysisTable(
			measurements.analysisTableInfo,
			safeContentHeight,
			remainingFirstPageSpace,
		);

		// Add first table part to first page if exists
		if (tablePaginationResult.firstPageTable) {
			firstPageElements.push(
				{ type: 'spacing', content: sectionsData.spacing },
				{ type: 'table', content: tablePaginationResult.firstPageTable },
			);
			firstPageHeight += measurements.spacingHeight + tablePaginationResult.firstPageTableHeight;
		}

		pages.push({ pageNumber: 1, elements: firstPageElements, totalHeight: firstPageHeight });

		// Add remaining table pages
		tablePaginationResult.remainingPages.forEach((tablePage, index) => {
			pages.push({
				pageNumber: pages.length + 1,
				elements: [{ type: 'table', content: tablePage.content }],
				totalHeight: tablePage.height,
			});
		});
	} else {
		// Put entire analysis on separate pages
		pages.push({ pageNumber: 1, elements: firstPageElements, totalHeight: firstPageHeight });

		// Check if analysis fits on single page
		if (measurements.analysisSectionHeight <= safeContentHeight) {
			pages.push({
				pageNumber: 2,
				elements: [{ type: 'section', content: sectionsData.analysisSection }],
				totalHeight: measurements.analysisSectionHeight,
			});
		} else {
			// Split large analysis table
			const tablePaginationResult = paginateAnalysisTable(
				measurements.analysisTableInfo,
				safeContentHeight,
				safeContentHeight,
			);

			tablePaginationResult.remainingPages.forEach((tablePage, index) => {
				pages.push({
					pageNumber: pages.length + 1,
					elements: [{ type: 'table', content: tablePage.content }],
					totalHeight: tablePage.height,
				});
			});
		}
	}

	// Add final elements (comment, notes, signature)
	const finalElements = [];
	let finalHeight = 0;

	if (sectionsData.showComment && sectionsData.commentSection) {
		finalElements.push(
			{ type: 'section', content: sectionsData.commentSection },
			{ type: 'spacing', content: sectionsData.spacing },
		);
		finalHeight += measurements.commentSectionHeight + measurements.spacingHeight;
	}

	finalElements.push(
		{ type: 'section', content: sectionsData.notesSection },
		{ type: 'spacing', content: sectionsData.spacing },
		{ type: 'section', content: sectionsData.signatureSection },
	);
	finalHeight += measurements.notesSectionHeight + measurements.spacingHeight + measurements.signatureSectionHeight;

	// Check if final elements can fit on last page
	const lastPage = pages[pages.length - 1];
	const spaceNeededForFinalElements = measurements.spacingHeight + finalHeight;

	if (lastPage.totalHeight + spaceNeededForFinalElements <= safeContentHeight) {
		// Add to last page
		lastPage.elements.push({ type: 'spacing', content: sectionsData.spacing }, ...finalElements);
		lastPage.totalHeight += spaceNeededForFinalElements;
	} else {
		// Create new page for final elements
		pages.push({
			pageNumber: pages.length + 1,
			elements: finalElements,
			totalHeight: finalHeight,
		});
	}

	return pages;
}

/**
 * Paginate analysis table across multiple pages
 * FIXED: Better height validation and row distribution
 */
function paginateAnalysisTable(tableInfo, availableContentHeight, firstPageRemainingSpace) {
	const result = {
		firstPageTable: null,
		firstPageTableHeight: 0,
		remainingPages: [],
	};

	if (!tableInfo || !tableInfo.rowsHtml || tableInfo.rowsHtml.length === 0) {
		return result;
	}

	const { headerHTML, headerHeight, rowsHtml, rowHeights, tableAttributes, columnWidths } = tableInfo;

	// Add safety margin for table pagination
	const TABLE_SAFETY_MARGIN = 10;
	const safeFirstPageSpace = Math.max(0, firstPageRemainingSpace - TABLE_SAFETY_MARGIN);
	const safePageHeight = Math.max(0, availableContentHeight - TABLE_SAFETY_MARGIN);

	// Check if we can fit rows on first page
	const canFitOnFirstPage = safeFirstPageSpace >= headerHeight + 30; // Header + at least one row

	let currentPageRows = [];
	let currentHeight = 0;
	let maxHeightForCurrentPage = canFitOnFirstPage ? safeFirstPageSpace : safePageHeight;
	let isFirstPage = canFitOnFirstPage;
	let rowsProcessed = 0;

	for (let i = 0; i < rowsHtml.length; i++) {
		const rowHeight = rowHeights[i] || 30;
		const neededHeight = (currentPageRows.length === 0 ? headerHeight : 0) + rowHeight;

		if (currentHeight + neededHeight > maxHeightForCurrentPage) {
			// Current page is full, save it and start new page
			if (currentPageRows.length > 0) {
				const pageTableHTML = createTableWithConsistentColumnWidths(
					tableAttributes,
					headerHTML,
					currentPageRows.join(''),
					columnWidths,
				);

				const actualPageHeight =
					headerHeight + currentPageRows.length * (rowHeights.reduce((sum, h) => sum + h, 0) / rowHeights.length);

				if (isFirstPage) {
					result.firstPageTable = pageTableHTML;
					result.firstPageTableHeight = Math.min(actualPageHeight, safeFirstPageSpace);
					isFirstPage = false;
				} else {
					result.remainingPages.push({
						content: pageTableHTML,
						height: Math.min(actualPageHeight, safePageHeight),
					});
				}

				rowsProcessed += currentPageRows.length;
			}

			// Start new page
			currentPageRows = [rowsHtml[i]];
			currentHeight = headerHeight + rowHeight;
			maxHeightForCurrentPage = safePageHeight;
		} else {
			// Add row to current page
			if (currentPageRows.length === 0) {
				currentHeight = headerHeight + rowHeight;
			} else {
				currentHeight += rowHeight;
			}
			currentPageRows.push(rowsHtml[i]);
		}
	}

	// Handle last page
	if (currentPageRows.length > 0) {
		const pageTableHTML = createTableWithConsistentColumnWidths(
			tableAttributes,
			headerHTML,
			currentPageRows.join(''),
			columnWidths,
		);

		const actualPageHeight =
			headerHeight + currentPageRows.length * (rowHeights.reduce((sum, h) => sum + h, 0) / rowHeights.length);

		if (isFirstPage) {
			result.firstPageTable = pageTableHTML;
			result.firstPageTableHeight = Math.min(actualPageHeight, safeFirstPageSpace);
		} else {
			result.remainingPages.push({
				content: pageTableHTML,
				height: Math.min(actualPageHeight, safePageHeight),
			});
		}

		rowsProcessed += currentPageRows.length;
	}

	return result;
}

/**
 * Step 4: Generate final HTML with arranged content
 * FIXED: Remove blank page generation and properly handle ppt_uid display
 */
function generateFinalHTML(sectionsData, paginatedContent, measurements) {
	// FIXED: Properly handle ppt_uid display in header
	let finalHeaderHTML = sectionsData.headerHTML;

	// Priority: apiResponsePptUid > original ppt_uid > keep original content
	const displayPptUid = sectionsData.apiResponsePptUid || sectionsData.ppt_uid;

	if (displayPptUid) {
		try {
			// Replace the ref_code content with the actual ppt_uid
			finalHeaderHTML = finalHeaderHTML.replace(
				/(<p[^>]*class=["']ref_code["'][^>]*>)([^<]*)(<\/p>)/i,
				`$1${displayPptUid}$3`,
			);
		} catch (err) {
			node.warn(`Error updating header ref code: ${err.message}`);
		}
	} else {
		node.warn(`No ppt_uid to display, keeping original header content`);
	}

	const getDraftWatermark = () =>
		sectionsData.isDraft ? `<div class="draft-watermark"><div>SƠ BỘ-DRAFT</div></div>` : '';

	// FIXED: Use Nunito Sans CSS with actual header height
	const printCSS = getImprovedPrintCSSWithFonts(
		{
			width: 210,
			height: 297,
			topMargin: 15,
			bottomMargin: 8,
			sideMargin: 10,
			headerSpacing: 7,
			footerSpacing: 2,
		},
		true,
		measurements.headerHeight,
	);

	let finalHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Certificate of Analysis</title>
            <meta charset="utf-8">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap" rel="stylesheet">
            <style>${printCSS}</style>
        </head>
        <body>
            <div class="print-container">
    `;

	// Generate pages
	paginatedContent.forEach((pageData, index) => {
		const pageNumber = (index + 1).toString().padStart(2, '0');
		const totalPages = paginatedContent.length.toString().padStart(2, '0');
		const pageFooter = sectionsData.footerHTML
			.replace(/>\d{2}<\/span>/g, `>${pageNumber}</span>`)
			.replace(/>\d{2}<\/span>/g, `>${totalPages}</span>`);

		const pageContent = pageData.elements.map((element) => element.content).join('');

		finalHTML += `
            <div class="page">
                ${getDraftWatermark()}
                <div class="header">${finalHeaderHTML}</div>
                <div class="content">${pageContent}</div>
                <div class="footer">${pageFooter}</div>
            </div>
        `;

		// Clean up page content
		pageData.elements.forEach((element) => (element.content = null));
	});

	// REMOVED: Blank page generation for odd number of pages
	// No longer adding unnecessary blank pages

	finalHTML += `</div></body></html>`;

	if (!finalHTML.includes('<div class="print-container">')) {
		throw new Error('Generated HTML does not contain print-container');
	}

	return finalHTML;
}

/**
 * Helper functions for processing content
 */
function processAnalysisSection(analysisSection) {
	const availableWidthPx = 716;
	analysisSection = analysisSection.replace(
		/<table[^>]*(?:width=['"]([^'"]*)['"]*|style=['"][^'"]*width:\s*([^;'"]*)[^'"]*['"])/gi,
		(match) =>
			match.includes('width=')
				? match.replace(/width=['"]([^'"]*)['"]/gi, `width="${availableWidthPx}px"`)
				: match.replace(/(style=['"])/i, `$1width: ${availableWidthPx}px; `),
	);
	return analysisSection.replace(
		/<table([^>]*)>/gi,
		(match, tableAttrs) => `<table${tableAttrs} style="table-layout: fixed;">`,
	);
}

function createTableWithConsistentColumnWidths(tableAttributes, headerHtml, bodyHtml, columnWidths) {
	if (!columnWidths || columnWidths.length === 0) {
		return `<table ${tableAttributes}>${headerHtml}<tbody>${bodyHtml}</tbody></table>`;
	}
	try {
		let colgroup = '<colgroup>';
		columnWidths.forEach((col) => {
			colgroup += `<col style="${col.width !== 'auto' ? 'width:' + col.width + ';' : ''} ${
				col.minWidth !== 'auto' ? 'min-width:' + col.minWidth + ';' : ''
			}">`;
		});
		colgroup += '</colgroup>';
		return `<table ${tableAttributes}>${colgroup}${headerHtml}<tbody>${bodyHtml}</tbody></table>`;
	} catch (e) {
		return `<table ${tableAttributes}>${headerHtml}<tbody>${bodyHtml}</tbody></table>`;
	}
}

/**
 * Content generation helper functions
 */
function generateHeaderHTML(showVlas = false, pptUid = null) {
	// FIXED: Use actual ppt_uid if provided, otherwise show DRAFT
	const displayRefCode = pptUid || 'SƠ BỘ / DRAFT';

	return `
    <div class="content_page_header_box" id="thead" style="position:relative; height: fit-content;">
        <div style="position:relative; display:flex; overflow:visible;">
            <div>
                <img src="https://irdop.org/wp-content/uploads/2024/07/IRDOP-LOGO-2710-02-2.png" 
                    loading="lazy" 
                    style="width:4.8cm;">
            </div>
            <div style="text-align:right; flex-grow:1; display: flex; flex-direction: column; align-items: flex-end;">
                <p style="font-weight:700; font-size:18px; color:#0058A3; margin-bottom: 0; line-height: 22px;">
                    Viện nghiên cứu và phát triển Sản phẩm thiên nhiên
                </p>
                <p style="font-weight:400; font-size:14px; margin: 0; line-height: 15px;">
                    / Institute for Research and Development of Organic Products
                </p>
                <span style="font-weight:400; font-size:14px; border-bottom:1px solid rgba(128,128,128,0.5); 
                            width: fit-content; display: block; margin: 0; line-height: 15px; padding-bottom: 1px;">
                    Phòng Phân tích - Kiểm nghiệm / Analysis Control Department
                </span>
            </div>
        </div>
        <div style="padding-top:1mm; position:relative;">
            <div style="position:relative; text-align:left;">
                <p contenteditable="true" class="content-header-title" 
                style="font-weight:840; font-size:24pt; color:#0058A3; height: 33px;">
                    PHIẾU KẾT QUẢ THỬ NGHIỆM
                </p>
                <p class="content-header-title_eng" 
                style="font-weight:850; font-size:21pt; color:#0058A3; height: 30px;">
                    / Certificate of Analysis
                </p>
                <div class="display-flex" 
                    style="display: flex; align-items: center; gap: 2mm; font-size:12px; font-weight:400; margin-top: 0px; height: 28px;">
                    <span class="std_ref-title">Xuất bản / ref.:</span>
                    <p contenteditable="true" 
                    class="ref_code" 
                    style="min-width:5pt; margin: 0; margin-right: 2mm;">
                        ${displayRefCode}
                    </p>
                    <span class="published_date" 
                        style="min-width:5pt; margin: 0;">
                        Ngày / Date: ${new Date().toLocaleDateString('vi-VN')}
                    </span>
                </div>
            </div>
            </div>
    </div>`;
}

function generateFooterHTML() {
	return `
    <div style="border-top: 1px solid #4CB748; height: 50px; display: flex; padding-top: 0pt; align-items: center;">
        <div style="flex-grow: 1; text-align: left;">
            <p style="color: #0058a3; margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN</p>
            <p style="margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">IRDOP.ORG</p>
            <p style="opacity: 0.5; margin: 0; padding: 0; line-height: 1; font-size: 11px; height: 14px; display: flex; align-items: center;">Form: BM06-QT010-KN / Version: 05 / Effective date: 12/03/2025</p>
        </div>
        <div style="font-size: 11px; display: flex; flex-direction: column; justify-content: flex-end; height: 100%;">
            <div style="display: flex; align-items: center; height: 14px;"><span style="font-size: 11px; margin: 0; padding: 0; line-height: 1; margin-right: 2px;">Trang / Pages:</span>
                <div style="display: flex; align-items: center; height: 14px;"><span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span> <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">/</span> <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span></div>
            </div>
        </div>
    </div>`;
}

// FIXED: Updated generateCustomerSection with font-weight: 800 for client name
function generateCustomerSection(clientData) {
	const clientUid = clientData?.client_uid || '';
	const clientName = clientData?.client_name || '';
	const clientAddress = clientData?.client_address || '';
	return `
    <div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
        <div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;font-weight:300;">
                <p style="font-size: 11px; line-height: 1.2; margin:0; text-align: left;">Nơi / người gửi mẫu / Customer information</p>
                <p style="font-size: 11px; line-height: 1.2; margin:0; text-align: right; color: black; text-decoration: none;">${clientUid}</p>
            </div>        
            <div style="display: flex; flex-direction: column; gap: 2px; height: fit-content;">
                <p style="font-weight: 760; margin: 0; text-align: left; font-size: 16px; line-height: 1.2;">${
									clientName || '--'
								}</p>
                <p style="margin: 0; font-size: 12px; text-align: left; line-height: 1.2;">${clientAddress || '--'}</p>
            </div>
        </div>
    </div>`;
}

function generateSampleInfoSection(data) {
	const sampleId = data.sample_uid || '';
	const sampleInfo = data.sample_information || [];
	const infoRows = sampleInfo
		.map((item) => {
			const fieldName = item.fname || '';
			const fieldValue = item.fvalue || '--';
			const parts = fieldName.split('/');
			const mainLabel = parts[0].trim();
			const engLabel = parts.length > 1 ? ` / ${parts[1].trim()}` : '';
			let displayMainLabel = mainLabel.replace('SX', 'sản xuất').replace('HSD', 'Hạn sử dụng');
			return `
            <div style="display: flex; ${fieldName.includes('Ngày tiếp nhận') ? 'margin-top: 8px;' : ''}">
                <div style="width: 30%; font-size: 12px; line-height: 1.2; text-align: left; padding-right: 10px; display: flex; align-items: top;">
                    <p style="font-weight:bold; margin-right: 4px;">${displayMainLabel}</p> ${engLabel}:
                </div>
                <div style="width: 70%; font-size: 12px; line-height: 1.2; text-align: left; padding-left: 10px;">
                    <p style="margin: 0; ${
											mainLabel.toLowerCase().includes('tên mẫu') ? 'font-weight: bold;' : ''
										}">${fieldValue}</p>
                </div>
            </div>`;
		})
		.join('');
	return `
    <div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
        <div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-weight:300;">
                <p style="font-size: 11px; line-height: 1.2; margin: 0; text-align: left;">Thông tin mẫu thử / Sample information:</p>
                <p style="font-size: 11px; line-height: 1.4; margin: 0; text-align: left;">${sampleId}</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px;">${infoRows}</div>
        </div>
    </div>`;
}

// FIXED: Updated generateAnalysisSection with new protocol format
function generateAnalysisSection(sampleData, showReference = false, referenceValues = []) {
	const analysisItems = sampleData.analysis || [];
	const referenceHeader = showReference
		? `<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px;box-sizing: border-box;">
            <strong>Tham chiếu</strong> <br> <span style="font-size: 12px; color: #444444;">/ Standard Ref</span>
          </th>`
		: '';

	if (showReference && referenceValues.length < analysisItems.length) {
		const additionalCells = analysisItems.length - referenceValues.length;
		const defaultCells = Array(additionalCells).fill(
			`<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>`,
		);
		referenceValues = [...referenceValues, ...defaultCells];
	}

	const availableWidthPx = 716;

	const columnWidths = showReference
		? [
				{ px: 43, min: '40px' }, // STT
				{ px: 157, min: '140px' }, // Phép thử
				{ px: 115, min: '100px' }, // Kết quả
				{ px: 86, min: '80px' }, // Đơn vị
				{ px: 200, min: '180px' }, // Phương pháp
				{ px: 115, min: '100px' }, // Tham chiếu
		  ]
		: [
				{ px: 50, min: '40px' }, // STT
				{ px: 186, min: '140px' }, // Phép thử
				{ px: 136, min: '100px' }, // Kết quả
				{ px: 100, min: '80px' }, // Đơn vị
				{ px: 244, min: '180px' }, // Phương pháp
		  ];

	let analysisRows = '';
	if (analysisItems.length > 0) {
		analysisRows = analysisItems
			.map((item, index) => {
				const parameterName = item.parameter_name || '--';
				const result = item.result_value || '--';
				const unit = item.result_unit || '--';

				// FIXED: New protocol format with accreditation
				let protocol = '';
				const protocolSource = item.protocol_source || '';
				const accreditation = item.accreditation || '';
				const protocolCode = item.protocol_code || '';

				if (protocolSource) {
					protocol = protocolSource;
					if (accreditation) {
						protocol += ' ' + accreditation;
					}
					if (protocolCode) {
						protocol += '  ' + protocolCode; // Two spaces before protocol code
					}
				} else {
					protocol = '--';
				}

				let referenceCell = '';
				if (showReference) {
					referenceCell =
						index < referenceValues.length
							? referenceValues[index]
							: `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>`;
				}
				const rowId = `analysis-row-${index}`;
				return `
                <tr id="${rowId}" class="table-row" data-row-index="${index}">
                    <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${
											columnWidths[0].px
										}px;">${index + 1}.</td>
                    <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${
											columnWidths[1].px
										}px;">${parameterName}</td>
                    <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${
											columnWidths[2].px
										}px;">${result}</td>
                    <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${
											columnWidths[3].px
										}px;">${unit}</td>
                    <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${
											columnWidths[4].px
										}px;white-space: pre;text-wrap: auto;">${protocol}</td>
                    ${referenceCell ? referenceCell.replace('width:', `width: ${columnWidths[5].px}px;`) : ''}
                </tr>`;
			})
			.join('');
	} else {
		const referenceCell = showReference
			? `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${columnWidths[5].px}px;">--</td>`
			: '';
		analysisRows = `
            <tr id="analysis-row-0" class="table-row" data-row-index="0">
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${columnWidths[0].px}px;">1</td>
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${columnWidths[1].px}px;">--</td>
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${columnWidths[2].px}px;">--</td>
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${columnWidths[3].px}px;">--</td>
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; width: ${columnWidths[4].px}px;">--</td>${referenceCell}
            </tr>`;
	}

	return `
    <div style="margin:0; padding:0;">
        <table style="width: ${availableWidthPx}px; border-collapse: collapse; text-align: left; margin:0; padding:0; font-size:12px; line-height:1.4; table-layout: fixed;">
            <colgroup>
                ${columnWidths.map((col) => `<col style="width: ${col.px}px; min-width: ${col.min};">`).join('')}
            </colgroup>
            <thead>
                <tr>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width: ${
											columnWidths[0].px
										}px;">
                        <strong>STT</strong> <br> <span style="font-size: 12px; color: #444444;">/ No.</span>
                    </th>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width: ${
											columnWidths[1].px
										}px;">
                        <strong>Phép thử</strong> <br> <span style="font-size: 12px; color: #444444;">/ Tests</span>
                    </th>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width: ${
											columnWidths[2].px
										}px;">
                        <strong>Kết quả</strong> <br> <span style="font-size: 12px; color: #444444;">/ Test result</span>
                    </th>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width: ${
											columnWidths[3].px
										}px;">
                        <strong>Đơn vị </strong><br> <span style="font-size: 12px; color: #444444;">/ Unit</span>
                    </th>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; width: ${
											columnWidths[4].px
										}px;">
                        <strong>Phương pháp</strong> <br> <span style="font-size: 12px; color: #444444;">/ Protocol</span>
                    </th>
                    ${referenceHeader ? referenceHeader.replace('width:', `width: ${columnWidths[5].px}px;`) : ''}
                </tr>
            </thead>
            <tbody>
                ${analysisRows}
            </tbody>
        </table>
    </div>`;
}

function generateCommentSection() {
	return `
    <div style="padding-top: 0; display: flex; flex-direction: column; margin:0;">
        <div style="padding: 0pt; flex-grow: 1; position: relative;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <p style="margin:0; font-size:12px; line-height:1.2;">Nhận xét / Comment:</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px; padding-left: 8px;">
                <p style="font-size:12px; margin:0; padding:0; line-height: 1.2; text-align:left;">--</p>
            </div>
        </div>
    </div>`;
}

// FIXED: Updated generateNotesSection with new note content
function generateNotesSection() {
	return `
    <div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
        <div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <p style="font-weight:bold; margin:0; font-size:11px; line-height:1.0;">Ghi chú / Note:</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <p class="note test_note_detail print-text-paragraph" 
                style="font-size:11px; margin:0; padding:0; line-height: 1.2; text-align:left;">
                    KPH: Không phát hiện / Not detected.<br>
                    LOD: Giới hạn phát hiện / Limit of detection.<br>
                    LOQ: Giới hạn định lượng / Limit of quantification.<br>
                    IRDOP: Chỉ tiêu được thực hiện tại IRDOP / Analyses conducted by IRDOP.<br>
                    EX: Chỉ tiêu được thực hiện bởi nhà thầu phụ / Analyses conducted by subcontractors.<br>
                    VS: Chỉ tiêu được công nhận ISO/IEC 17025:2017 / Accredited per ISO/IEC 17025:2017.<br>
                    TĐC: Chỉ tiêu được công nhận đánh giá sự phù hợp theo NĐ 107/2016/NĐ-CP / Accredited per Decree 107/2016/ND-CP.<br>
                    Thông tin mẫu thử do khách hàng cung cấp / Sample information provided by the customer.<br>
                    Kết quả chỉ có giá trị với mẫu thử / The results are only valid for the tested sample(s).
                </p>
            </div>
        </div>
    </div>`;
}

function generateSignatureSection() {
	return `
    <div style="padding-top: 0; display: flex; margin:0;">
        <div style="padding: 0pt; flex-grow: 1; position: relative; display:flex; height:2.7cm;">
            <div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
                <strong style="font-size:12px; line-height:1.2; margin:0;">PHÒNG PHÂN TÍCH KIỂM NGHIỆM/<br>KIỂM SOÁT CHẤT LƯỢNG / Laboratory Manager</strong>
                <p style="font-size:12px; margin:0; line-height:1.4;">Nguyễn Trung Kiên</p>
            </div>
            <div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
                <strong style="font-size:12px; line-height:1.2; margin:0;">KT.VIỆN TRƯỞNG<br>PHÓ VIỆN TRƯỞNG / Vice President</strong>
                <p style="font-size:12px; margin:0; line-height:1.4;">Nguyễn Bá Xuân Trường</p>
            </div>
        </div>
    </div>`;
}

/**
 * FIXED: CSS with Nunito Sans font integration
 */
function getPrintCSSWithFonts(A4, includeContentPositioning = true, headerHeight) {
	const baseCSS = `
        @page { size: A4; margin: 0; }
        
        /* FIXED: Proper font family declarations with Nunito Sans */
        html, body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            font-weight: 400;
            font-optical-sizing: auto;
        }
        
        p, td, th, div, span, strong, b { 
            font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        
        /* Font weight classes for Nunito Sans */
        .nunito-200 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 200; font-style: normal; }
        .nunito-300 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 300; font-style: normal; }
        .nunito-400 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 400; font-style: normal; }
        .nunito-500 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 500; font-style: normal; }
        .nunito-600 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 600; font-style: normal; }
        .nunito-700 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 700; font-style: normal; }
        .nunito-800 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 800; font-style: normal; }
        .nunito-900 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 900; font-style: normal; }
        
        /* FIXED: Ensure bold elements use proper font weight */
        strong, b, [style*="font-weight: 700"], [style*="font-weight: bold"] { 
            font-family: 'Nunito Sans', Arial, sans-serif !important; 
            font-weight: 700 !important; 
        }
        
        /* FIXED: Extra bold elements */
        [style*="font-weight: 800"] { 
            font-family: 'Nunito Sans', Arial, sans-serif !important; 
            font-weight: 800 !important; 
        }
        
        /* FIXED: Ultra bold elements */
        [style*="font-weight: 900"] { 
            font-family: 'Nunito Sans', Arial, sans-serif !important; 
            font-weight: 900 !important; 
        }
        
        /* Normal weight elements */
        p, td, th, div, span { 
            font-weight: 400; 
        }
        
        .print-container { width: 794px; margin: 0px auto; background-color: white; }
        
        .page { 
            position: relative; 
            width: 100%; 
            height: 1122px; 
            box-sizing: border-box; 
            page-break-after: always; 
            background-color: white; 
            padding: ${A4.topMargin}mm ${A4.sideMargin}mm ${A4.bottomMargin}mm ${A4.sideMargin}mm; 
            overflow: hidden; 
            border: 1px solid #000; 
        }
        
        .header { 
            position: absolute; 
            top: ${A4.topMargin}mm; 
            left: ${A4.sideMargin}mm; 
            right: ${A4.sideMargin}mm; 
            width: calc(100% - ${2 * A4.sideMargin}mm); 
            box-sizing: border-box; 
            overflow: visible; 
            z-index: 2;
        }
        
        .footer { 
            position: absolute; 
            bottom: ${A4.bottomMargin}mm; 
            left: ${A4.sideMargin}mm; 
            right: ${A4.sideMargin}mm; 
            width: calc(100% - ${2 * A4.sideMargin}mm); 
            box-sizing: border-box; 
            z-index: 2;
        }
        
        /* FIXED: Improved content positioning with proper constraints */
        .content { 
            position: absolute; 
            left: ${A4.sideMargin}mm; 
            right: ${A4.sideMargin}mm; 
            width: calc(100% - ${2 * A4.sideMargin}mm); 
            box-sizing: border-box; 
            overflow: hidden;
            z-index: 1;
            /* Content height and positioning will be calculated dynamically */
        }
        
        table { 
            border-collapse: collapse; 
            table-layout: fixed; 
            width: 100%; 
            page-break-inside: avoid;
            font-family: 'Nunito Sans', Arial, sans-serif !important;
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
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: 'Nunito Sans', Arial, sans-serif !important;
        }
        
        table td p, table th p { 
            margin: 0; 
            padding: 0; 
            line-height: 1.2; 
            font-size: 12px; 
            overflow-wrap: anywhere; 
            font-family: 'Nunito Sans', Arial, sans-serif !important;
        }
        
        p { 
            margin: 0; 
            overflow-wrap: anywhere; 
            font-family: 'Nunito Sans', Arial, sans-serif !important;
        }
        
        .draft-watermark { 
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
        }
        
        .draft-watermark div { 
            font-size: 90px; 
            font-weight: 700; 
            color: #888; 
            text-transform: uppercase; 
            letter-spacing: 8px; 
            font-family: 'Nunito Sans', Arial, sans-serif !important;
        }
        
        .vlas_icon { 
            overflow: visible !important; 
            z-index: 10; 
        }
        
        @media print { 
            .page { border: none; } 
            body { -webkit-print-color-adjust: exact; }
        }
    `;

	if (includeContentPositioning) {
		const mmToPx = (mm) => mm * 3.78;
		// FIXED: Use actual headerHeight from measurements
		const contentTop = mmToPx(A4.topMargin) + headerHeight + mmToPx(A4.headerSpacing);
		const footerHeight = 50; // Approximate footer height
		const footerTop = 1122 - mmToPx(A4.bottomMargin) - footerHeight;
		const contentMaxHeight = footerTop - mmToPx(A4.footerSpacing) - contentTop;

		return (
			baseCSS +
			`
        .content { 
            top: ${contentTop}px; 
            max-height: ${contentMaxHeight}px;
            height: auto;
        }
        `
		);
	}

	return baseCSS;
}

/**
 * FIXED: Improved CSS with Nunito Sans integration
 */
function getImprovedPrintCSSWithFonts(A4, includeContentPositioning = true, headerHeight = 160) {
	return getPrintCSSWithFonts(A4, includeContentPositioning, headerHeight);
}

/**
 * Helper function to get print CSS (original function for compatibility)
 */
function getPrintCSS(A4, includeContentPositioning = true, headerHeight = 160) {
	return getPrintCSSWithFonts(A4, includeContentPositioning, headerHeight);
}

/**
 * Generate multiple reports and combine them
 */
async function generateMultipleReports(params, is_save = false, is_publish = false) {
	const reportHtmls = [];

	try {
		if (!Array.isArray(params) || params.length === 0) {
			throw new Error('Invalid or empty params');
		}

		for (let i = 0; i < params.length; i++) {
			const { sample_uid, ppt_uid } = params[i];
			if (!sample_uid && !ppt_uid) {
				node.warn(`Skipping invalid report parameters at index ${i}: sample_uid=${sample_uid}, ppt_uid=${ppt_uid}`);
				continue;
			}
			try {
				const reportHtml = await generatePrintPage(sample_uid, ppt_uid, is_save, is_publish);
				if (reportHtml && typeof reportHtml === 'string' && reportHtml.includes('<div class="print-container">')) {
					reportHtmls.push(reportHtml);
				} else {
					node.warn(`Failed to generate report ${i + 1}: no valid HTML payload`);
				}
			} catch (err) {
				node.warn(`Error generating report ${i + 1} for sample_uid=${sample_uid}, ppt_uid=${ppt_uid}: ${err.message}`);
			}
		}

		if (reportHtmls.length === 0) {
			throw new Error('No reports could be generated');
		}

		return combinePagesIntoFirstReport(reportHtmls);
	} catch (error) {
		node.warn(`Error generating multiple reports: ${error.message}`);
		throw error;
	} finally {
		reportHtmls.length = 0;
	}
}

/**
 * Combine multiple report pages into a single document
 */
function combinePagesIntoFirstReport(htmls) {
	if (!htmls || !Array.isArray(htmls) || htmls.length === 0) {
		node.warn('No valid HTML reports provided');
		return '<html><body><h1>No reports to display</h1></body></html>';
	}

	const baseHtml = htmls[0];
	let startHtml = '';
	let endHtml = '';
	let pagesHtml = '';

	try {
		const containerStart = baseHtml.indexOf('<div class="print-container">');
		if (containerStart === -1) {
			throw new Error('Could not find print-container in base HTML');
		}

		const containerEnd = baseHtml.lastIndexOf('</div></body></html>');
		if (containerEnd === -1) {
			throw new Error('Could not find closing tags in base HTML');
		}

		startHtml = baseHtml.slice(0, containerStart + '<div class="print-container">'.length);
		endHtml = baseHtml.slice(containerEnd);

		const allPages = [];

		// Extract pages from each report
		htmls.forEach((html, reportIndex) => {
			let currentPos = 0;
			const pageStartTag = '<div class="page"';
			const pageEndTag = '</div>';
			let pageCount = 0;

			while (currentPos < html.length) {
				const pageStart = html.indexOf(pageStartTag, currentPos);
				if (pageStart === -1) break;

				let openDivCount = 1;
				let endPos = pageStart + pageStartTag.length;

				// Find matching closing div
				while (openDivCount > 0 && endPos < html.length) {
					const nextOpen = html.indexOf('<div', endPos);
					const nextClose = html.indexOf('</div>', endPos);

					if (nextClose === -1) {
						throw new Error(`Unmatched closing div tag in report ${reportIndex + 1}`);
					}

					if (nextOpen !== -1 && nextOpen < nextClose) {
						openDivCount++;
						endPos = nextOpen + 4;
					} else {
						openDivCount--;
						endPos = nextClose + 6;
					}
				}

				if (openDivCount !== 0) {
					node.warn(`Malformed page div in report ${reportIndex + 1} at position ${pageStart}`);
					break;
				}

				const pageContent = html.slice(pageStart, endPos);
				allPages.push(pageContent);
				pageCount++;
				currentPos = endPos;
			}

			if (pageCount === 0) {
				node.warn(`No valid pages found in report ${reportIndex + 1}`);
			}
		});

		// Update page numbers
		pagesHtml = allPages.join('\n');
		const totalPages = allPages.length;

		// Replace page numbers in footer
		let pageCounter = 1;
		pagesHtml = pagesHtml.replace(
			/<span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">(\d{2})<\/span>\s*\/\s*<span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">(\d{2})<\/span>/g,
			(match) => {
				const currentPageNum = pageCounter.toString().padStart(2, '0');
				const totalPagesNum = totalPages.toString().padStart(2, '0');
				pageCounter++;
				return `<span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">${currentPageNum}</span> / <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">${totalPagesNum}</span>`;
			},
		);

		return `${startHtml}\n${pagesHtml}\n${endHtml}`;
	} catch (error) {
		node.warn(`Error combining pages: ${error.message}`);
		return `<html><body><h1>Error combining reports: ${error.message}</h1></body></html>`;
	}
}

// Main execution block
let params = msg.req.body.list_uids || [];
const is_save = msg.req.body.is_save || false;
const is_publish = msg.req.body.is_publish || false;

// let params = [{ sample_uid: 'SPx24431008-01', ppt_uid: '' },{ sample_uid: 'SPx24431008-02', ppt_uid: '' },{ sample_uid: 'SPx24431008-3', ppt_uid: '' }];
// const is_save = false;
// const is_publish = false;

try {
	// Validate and normalize params
	if (!Array.isArray(params)) {
		params = [params];
	}
	if (params.length === 0) {
		throw new Error('No valid parameters provided');
	}

	// Generate reports
	const simpleHTML = await generateMultipleReports(params, is_save, is_publish);
	// 	 const browser = await chromium.connect('ws://playwright:3000');

	//     const page = await browser.newPage();

	//     await page.setContent(simpleHTML, { waitUntil: 'networkidle' });

	//     // Tạo buffer PDF với scale tương đương 96 DPI
	//     const pdfBuffer = await page.pdf({
	//       format: 'A4',
	//       printBackground: true,
	//       margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
	//       scale: 1,
	//     });

	//     await page.close();
	//     await browser.close();

	msg.payload = simpleHTML;
} catch (error) {
	node.warn(`Error in COMPLETE FINAL report generation: ${error.message}`);
	node.warn(`Stack trace: ${error.stack}`);
	msg.payload = `<html><body><h1>Error: ${error.message}</h1><p>Please check the logs for more details.</p></body></html>`;
}

return msg;
