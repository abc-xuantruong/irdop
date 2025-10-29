const axios = global.get('axios');
const { chromium } = global.get('playwright');

async function generateMultiSampleReport(sampleUids) {
	let browser;
	let context;
	try {
		if (!sampleUids || !Array.isArray(sampleUids) || sampleUids.length === 0) {
			throw new Error('Invalid input: sampleUids must be a non-empty array');
		}

		node.warn(`Generating report for ${sampleUids.length} samples: ${sampleUids.join(', ')}`);

		// Step 1: Fetch receipt data and generate sections for all samples
		const sectionsDataArray = await generateSectionsForAllSamples(sampleUids);

		// Step 2: Initialize browser for rendering and measuring
		browser = await chromium.connect('ws://playwright:3000');
		context = await browser.newContext({
			viewport: { width: 795, height: 1123 },
		});

		// Step 3: Render and measure sections for each sample
		const allMeasurements = [];
		for (const sectionsData of sectionsDataArray) {
			const measurements = await renderAndMeasureSections(context, sectionsData);
			allMeasurements.push(measurements);
		}

		// Step 4: Apply pagination logic for all samples
		const allPaginatedContent = [];
		for (let i = 0; i < sectionsDataArray.length; i++) {
			const paginatedContent = applyPaginationLogic(sectionsDataArray[i], allMeasurements[i]);
			allPaginatedContent.push(paginatedContent);
		}

		// Step 5: Generate final HTML with all samples
		const finalHTML = generateFinalHTMLForAllSamples(sectionsDataArray, allPaginatedContent, allMeasurements);

		return finalHTML;
	} catch (err) {
		node.warn(`Error generating multi-sample report: ${err.message}`);
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
 * Step 1: Generate sections for all samples
 */
async function generateSectionsForAllSamples(sampleUids) {
	const sectionsDataArray = [];

	// Get receipt data from the first sample
	const firstSampleResponse = await axios.get(`https://black.irdop.org/to82oe92i/db/get/sample_full/${sampleUids[0]}`);
	if (firstSampleResponse.status !== 200) {
		throw new Error(`Failed to fetch first sample: ${firstSampleResponse.status}`);
	}

	const receiptId = firstSampleResponse.data.receipt_id;
	if (!receiptId) {
		throw new Error('Receipt ID not found in sample data');
	}

	// Fetch receipt data
	const receiptResponse = await axios.get(`https://black.irdop.org/hli1o7az/db/receipt/get/client/${receiptId}`);
	if (receiptResponse.status !== 200) {
		throw new Error(`Failed to fetch receipt: ${receiptResponse.status}`);
	}

	const clientData = receiptResponse.data;

	// Process each sample
	for (const sampleUid of sampleUids) {
		const sectionsData = await generateSectionsForSample(sampleUid, clientData);
		sectionsDataArray.push(sectionsData);
	}

	return sectionsDataArray;
}

/**
 * Generate sections for a single sample
 */
async function generateSectionsForSample(sampleUid, clientData) {
	try {
		const sampleResponse = await axios.get(`https://black.irdop.org/to82oe92i/db/get/sample_full/${sampleUid}`);
		if (sampleResponse.status !== 200) {
			throw new Error(`Failed to fetch sample ${sampleUid}: ${sampleResponse.status}`);
		}

		const sampleData = sampleResponse.data;

		// Check for VILAS logo
		const showVlas =
			sampleData.analysis && Array.isArray(sampleData.analysis)
				? sampleData.analysis.some((item) => item.protocol_source && item.protocol_source.includes('VS'))
				: false;

		const sectionsData = {
			sample_uid: sampleUid,
			showVlas,
			headerHTML: generateHeaderHTML(showVlas),
			footerHTML: generateFooterHTML(),
			customerSection: generateCustomerSection(clientData),
			sampleInfoSection: generateSampleInfoSection(sampleData),
			analysisSection: generateAnalysisSection(sampleData),
			commentSection: '',
			notesSection: generateNotesSection(),
			signatureSection: generateSignatureSection(),
			nextPageNotification: `
                <div style="padding: 10px 0; text-align: center; font-size: 12px; font-style: italic; color: #666;">
                    - Xem kết quả ở trang tiếp theo / The results are on the next page -
                </div>`,
			spacing: `<div style="height: 4mm; margin:0; padding:0;"></div>`,
		};

		return sectionsData;
	} catch (err) {
		node.warn(`Error generating sections for sample ${sampleUid}: ${err.message}`);
		throw err;
	}
}

/**
 * Generate header HTML (matching Report.jsx)
 */
function generateHeaderHTML(showVlas = false) {
	const displayVlas = showVlas ? '' : 'display:none;';
	return `
<div id="header-section" style="position:relative; height: fit-content;">
	<div style="position:relative; display:flex; overflow:visible;">
		<div>
			<img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/IRDOP%20LOGO%20with%20Name.w8flZn8NnkuLrYinAamIkw.PAAKeAHDVEm9mFvCFtA46Q.svg" 
				 loading="lazy" style="width:4cm;">
		</div>
		<div style="text-align:right; flex-grow:1; display: flex; flex-direction: column; align-items: flex-end;">
			<p style="font-weight:700; font-size:14.4px; color:#0058A3; margin-bottom: 0; line-height: 17.6px;">
				Viện nghiên cứu và phát triển Sản phẩm thiên nhiên
			</p>
			<p style="font-weight:400; font-size:11.2px; margin: 0; line-height: 12px;">
				/ Institute for Research and Development of Organic Products
			</p>
			<span style="font-weight:400; font-size:11.2px; border-bottom:1px solid rgba(128,128,128,0.5); 
					width: fit-content; display: block; margin: 0; line-height: 12px; padding-bottom: 1px;">
				Phòng Phân tích - Kiểm nghiệm / Analysis and Testing Dept.
			</span>
		</div>
	</div>
	<div style="padding-top:2mm; position:relative;">
		<div style="position:relative; text-align:left;">
			<p style="font-weight:900; font-size:24pt; color:#0058A3; height: 36px;">PHIẾU KẾT QUẢ THỬ NGHIỆM</p>
			<p style="font-weight:800; font-size:21pt; color:#0058A3; height: 36px;">/ Certificate of Analysis</p>
			<div style="display: flex; align-items: center; gap: 2mm; font-size:12px; margin-top: 0px; height: 20px;">
				<span>Xuất bản / ref.:</span>
				<p class="ref_code" style="min-width:5pt; margin: 0; margin-right: 2mm;">SƠ BỘ / DRAFT</p>
				<span style="min-width:5pt; margin: 0;">Ngày / Date: ${new Date().toLocaleDateString('vi-VN')}</span>
			</div>
		</div>
		<div class="vlas_icon" style="position:absolute; right:0mm; top:0.2cm; ${displayVlas}">
			<img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/VILAS%20997.WIu1HeH5wkOQ5k1olzA3Wg.png" 
				 loading="lazy" style="width:4.16cm;">
		</div>
	</div>
</div>`;
}

/**
 * Generate footer HTML (matching Report.jsx)
 */
function generateFooterHTML() {
	return `
<div id="footer-section" style="border-top: 1px solid #4CB748; height: 50px; display: flex; padding-top: 0pt; align-items: center;">
	<div style="flex-grow: 1; text-align: left;">
		<p style="color: #0058a3; margin: 0; padding: 0; line-height: 1; font-size: 12px; font-weight: 600;">
			VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN
		</p>
		<p style="margin: 0; padding: 0; line-height: 1; font-size: 12px;">IRDOP.ORG</p>
		<p style="opacity: 0.5; margin: 0; padding: 0; line-height: 1; font-size: 11px;">
			Form: BM06-QT010-KN / Version: 06 / Effective date: 02/06/2025
		</p>
	</div>
	<div style="font-size: 11px; display: flex; flex-direction: column; justify-content: flex-end; height: 100%;">
		<div style="display: flex; align-items: center;">
			<span style="margin-right: 2px;">Trang / Pages:</span>
			<span>00 / 00</span>
		</div>
	</div>
</div>`;
}

/**
 * Generate customer section (matching Report.jsx)
 */
function generateCustomerSection(clientData) {
	const clientUid = clientData?.client_uid || '';
	const clientName = clientData?.client_name || '';
	const clientAddress = clientData?.client_address || '';
	return `
<div id="customer-section" style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
	<div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
		<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: left;">Nơi / người gửi mẫu / Customer information</p>
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: right; color: black; text-decoration: none;">${clientUid}</p>
		</div>		
		<div style="display: flex; flex-direction: column; gap: 2px; height: fit-content;">
			<p style="font-weight: 760; margin: 0; text-align: left; font-size: 16px; line-height: 1.2;">${clientName}</p>
			<p style="margin: 0; font-size: 12px; text-align: left; line-height: 1.2;">${clientAddress || '--'}</p>
		</div>
	</div>
</div>`;
}

/**
 * Generate sample info section (matching Report.jsx)
 */
function generateSampleInfoSection(sampleData) {
	const sampleId = sampleData.sample_uid || '';
	const sampleInfo = sampleData.sample_information || [];
	const infoRows = sampleInfo
		.map((item) => {
			const fieldName = item.fname || '';
			const fieldValue = item.fvalue || '--';
			const parts = fieldName.split('/');
			const mainLabel = parts[0].trim();
			const engLabel = parts.length > 1 ? ` / ${parts[1].trim()}` : '';

			let displayMainLabel = mainLabel;
			if (mainLabel.includes('SX')) {
				displayMainLabel = mainLabel.replace('SX', 'sản xuất');
			} else if (mainLabel.includes('HSD')) {
				displayMainLabel = mainLabel.replace('HSD', 'Hạn sử dụng');
			}

			if (fieldName.includes('Ngày tiếp nhận')) {
				return `
			<div style="display: flex; margin-top: 8px;">
				<div style="width: 27%; font-size: 12px; line-height: 1.2; text-align: left; padding-right: 10px; display: flex; align-items: top;">
					<p style="font-weight:bold; margin-right: 4px;">${displayMainLabel}</p> ${engLabel}:
				</div>
				<div style="width: 23%; font-size: 12px; line-height: 1.2; text-align: left; padding-left: 10px;">
					<p style="margin: 0;">${fieldValue}</p>
				</div>
				<div style="width: 30%; font-size: 12px; line-height: 1.2; text-align: left; padding-right: 10px; display: flex; align-items: center;">
					<p style="font-weight:bold; margin-right: 4px;">Thời gian lưu mẫu</p> / Storage time:
				</div>
				<div style="width: 19%; font-size: 12px; line-height: 1.2; text-align: left; padding-left: 10px;">
					<p style="margin: 0;">Không có mẫu lưu</p>
				</div>
			</div>`;
			}

			return `
			<div style="display: flex;">
				<div style="width: 27%; font-size: 12px; line-height: 1.2; text-align: left; padding-right: 10px; display: flex; align-items: top;">
					<p style="font-weight:bold; margin-right: 4px;">${displayMainLabel}</p> ${engLabel}:
				</div>
				<div style="width: 73%; font-size: 12px; line-height: 1.2; text-align: left; padding-left: 10px;">
					<p style="margin: 0; ${mainLabel.toLowerCase().includes('tên mẫu') ? 'font-weight: bold;' : ''}">${fieldValue}</p>
				</div>
			</div>`;
		})
		.join('');
	return `
<div id="sample-section" style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
	<div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
		<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
			<p style="font-size: 11px; line-height: 1.2; margin: 0; text-align: left;">
				Thông tin mẫu thử nghiệm / Sample information:
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

/**
 * Generate analysis section
 */
function generateAnalysisSection(sampleData) {
	const analysisItems = sampleData.analysis || [];

	let analysisRows = '';
	if (analysisItems.length > 0) {
		analysisRows = analysisItems
			.map((item, index) => {
				const parameterName = item.parameter_name || '--';
				const result = item.result_value || '--';
				const unit = item.result_unit || '--';
				const protocol = item.protocol_code || '--';

				// Combine protocol_source with accreditation
				const accreditationParts = item.accreditation
					? item.accreditation
							.split(',')
							.map((part) => part.trim())
							.filter((part) => part.length > 0)
					: [];
				const protocolSource = item.protocol_source || '';
				const scope = protocolSource + (accreditationParts.length > 0 ? ' ' + accreditationParts.join(' ') : '');

				const rowId = `analysis-row-${index}`;
				return `
				<tr id="${rowId}" class="table-row" data-row-index="${index}">
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${index + 1}.</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${parameterName}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${result}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${unit}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${protocol}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${scope}</td>
				</tr>`;
			})
			.join('');
	} else {
		analysisRows = `
            <tr id="analysis-row-0" class="table-row" data-row-index="0">
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">1</td>
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
                <td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
            </tr>`;
	}

	return `
    <div style="margin:0; padding:0;">
        <table style="width: auto; min-width: 100%; border-collapse: collapse; text-align: left; margin:0; padding:0; font-size:12px; line-height:1.4;">
            <thead>
                <tr>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 45px; text-align:left; font-size:12px;box-sizing: border-box;">
                        <strong>STT</strong> <br> <span style="font-size: 12px; color: #444444;">/ No.</span>
                    </th>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; min-width: 20%;box-sizing: border-box;">
                        <strong>Phép thử</strong> <br> <span style="font-size: 12px; color: #444444;">/ Tests</span>
                    </th>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; min-width:100px; text-align:left; font-size:12px; box-sizing: border-box;">
                        <strong>Kết quả</strong> <br> <span style="font-size: 12px; color: #444444;">/ Test result</span>
                    </th>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; min-width:90px; text-align:left; font-size:12px;box-sizing: border-box;">
                        <strong>Đơn vị</strong><br> <span style="font-size: 12px; color: #444444;">/ Unit</span>
                    </th>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px;box-sizing: border-box;">
                        <strong>Phương pháp</strong> <br> <span style="font-size: 12px; color: #444444;">/ Protocol</span>
                    </th>
                    <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px;box-sizing: border-box; max-width: 115px;">
                        <strong>Phạm vi công nhận</strong> <br> <span style="font-size: 12px; color: #444444;">/ Accreditation scope</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                ${analysisRows}
            </tbody>
        </table>
    </div>`;
}

/**
 * Generate notes section
 */
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

/**
 * Generate signature section (matching Report.jsx)
 */
function generateSignatureSection() {
	return `
<div id="signature-section" style="padding: 0 8px; display: flex; flex-direction:column; margin:0;">
	<div style="padding: 0pt; flex-grow: 1; position: relative; display:flex; justify-content:space-between;height:2.7cm;">
		<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between; max-width:fit-content;">
		</div>
		<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between; max-width:fit-content;">
			<strong style="font-size:12px; line-height:1.2; margin:0;">KT.VIỆN TRƯỞNG<br>PHÓ VIỆN TRƯỞNG / Vice President</strong>
			<p style="font-size:12px; margin:0; line-height:1.4;">Nguyễn Bá Xuân Trường</p>
		</div>
	</div>
</div>`;
}

/**
 * Step 3: Render and measure sections (copied from convertHTML.js)
 */
async function renderAndMeasureSections(context, sectionsData) {
	const page = await context.newPage();
	page.setDefaultTimeout(180000);

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
		topMargin: 10, // Changed from 15 to match reportPreviewHelpers.js (1cm)
		bottomMargin: 6, // Changed from 8 to match reportPreviewHelpers.js (0.6cm)
		sideMargin: 10,
		headerSpacing: 5,
		footerSpacing: 2,
	};

	const mmToPx = (mm) => mm * 3.78;
	const basePrintCss = getPrintCSSWithFonts(A4, false);

	// Measure header and footer
	const headerFooterMeasurementHTML = `
        <html>
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>${basePrintCss}</style>
        </head>
        <body>
            <div style="width: 794px; position: relative; padding: ${A4.topMargin}mm ${A4.sideMargin}mm;">
                <div class="header" id="header-measure" style="position: static; width: 100%;">${sectionsData.headerHTML}</div>
            </div>
            <div style="width: 794px; position: relative; margin-top: 20px; padding: 0 ${A4.sideMargin}mm;">
                <div class="footer" id="footer-measure" style="position: static; width: 100%;">${sectionsData.footerHTML}</div>
            </div>
        </body>
        </html>
    `;

	await page.setContent(headerFooterMeasurementHTML, { waitUntil: 'networkidle' });
	await page.waitForSelector('#header-measure');
	await page.waitForSelector('#footer-measure');
	await page.evaluate(() => document.fonts.ready);

	const headerFooterMeasurements = await page.evaluate(() => {
		const headerElement = document.querySelector('#header-measure');
		const footerElement = document.querySelector('#footer-measure');
		return {
			headerHeight: headerElement ? headerElement.offsetHeight : 0,
			footerHeight: footerElement ? footerElement.offsetHeight : 0,
		};
	});

	// Calculate positioning
	const marginTopPx = mmToPx(A4.topMargin);
	const marginBottomPx = mmToPx(A4.bottomMargin);
	const headerSpacingPx = 15; // Changed to 15px to match reportPreviewHelpers.js
	const footerSpacingPx = 20; // Changed to 20px to match reportPreviewHelpers.js

	const contentTopPosition = marginTopPx + headerFooterMeasurements.headerHeight + headerSpacingPx;
	const footerStartPosition = 1122 - marginBottomPx - headerFooterMeasurements.footerHeight;
	const contentBottomPosition = footerStartPosition - footerSpacingPx;
	const availableContentHeight = contentBottomPosition - contentTopPosition;

	if (availableContentHeight <= 0) {
		throw new Error(`Invalid content area: available height is ${availableContentHeight}px`);
	}

	// Measure sections
	const sectionsMeasurementHTML = `
        <html>
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>${basePrintCss}</style>
        </head>
        <body>
            <div style="width: 794px; position: relative; padding: ${A4.topMargin}mm ${A4.sideMargin}mm;">
                <div id="customer-section-measure">${sectionsData.customerSection}</div>
            </div>
            <div style="width: 794px; position: relative; padding: 0 ${A4.sideMargin}mm;">
                <div id="sample-section-measure" style="margin-top: 4mm;">${sectionsData.sampleInfoSection}</div>
            </div>
            <div style="width: 794px; position: relative; padding: 0 ${A4.sideMargin}mm;">
                <div id="analysis-section-measure" style="margin-top: 4mm;">${sectionsData.analysisSection}</div>
            </div>
            <div style="width: 794px; position: relative; padding: 0 ${A4.sideMargin}mm;">
                <div id="notes-section-measure" style="margin-top: 4mm;">${sectionsData.notesSection}</div>
            </div>
            <div style="width: 794px; position: relative; padding: 0 ${A4.sideMargin}mm;">
                <div id="signature-section-measure" style="margin-top: 4mm;">${sectionsData.signatureSection}</div>
            </div>
            <div style="width: 794px; position: relative; padding: 0 ${A4.sideMargin}mm;">
                <div id="spacing-measure">${sectionsData.spacing}</div>
            </div>
        </body>
        </html>
    `;

	await page.setContent(sectionsMeasurementHTML, { waitUntil: 'networkidle' });
	await page.waitForSelector('#customer-section-measure');
	await page.evaluate(() => document.fonts.ready);

	const measurements = await page.evaluate(() => {
		const getElementDimensions = (selector) => {
			const element = document.querySelector(selector);
			if (!element) return { height: 0, width: 0, found: false };

			// Use computedStyle for accurate height calculation
			const computedStyle = window.getComputedStyle(element);
			const height = element.offsetHeight;
			const computedHeight = parseFloat(computedStyle.height);

			console.log(`${selector}: ${height}px (computed: ${computedHeight}px)`);

			return {
				height: height,
				width: element.offsetWidth,
				found: true,
			};
		};

		const measureTableInfo = (selector) => {
			const element = document.querySelector(selector);
			if (!element) return null;
			const table = element.querySelector('table');
			if (!table) return null;

			const header = table.querySelector('thead');
			const headerHeight = header ? header.offsetHeight : 0;
			console.log(`${selector} - Table Header: ${headerHeight}px`);

			const rows = Array.from(table.querySelectorAll('tbody tr'));
			const rowHeights = rows.map((row, index) => {
				const height = row.offsetHeight;
				console.log(`${selector} - Row ${index + 1}: ${height}px`);
				return height;
			});
			const rowsHtml = rows.map((row) => row.outerHTML);

			const tableAttributes = Array.from(table.attributes)
				.map((attr) => `${attr.name}="${attr.value}"`)
				.join(' ');

			const avgRowHeight = rows.length > 0 ? rowHeights.reduce((sum, h) => sum + h, 0) / rows.length : 30;
			console.log(`${selector} - Average Row Height: ${avgRowHeight}px`);

			const headerRow = header ? header.querySelector('tr') : null;
			const columnWidths = [];
			if (headerRow) {
				const headerCells = headerRow.querySelectorAll('th');
				headerCells.forEach((cell, index) => {
					const computedStyle = window.getComputedStyle(cell);
					const colWidth = {
						width: cell.style.width || cell.getAttribute('width') || computedStyle.width,
						minWidth: cell.style.minWidth || cell.getAttribute('min-width') || computedStyle.minWidth,
						actualWidth: cell.offsetWidth,
					};
					console.log(`${selector} - Column ${index + 1}: ${colWidth.actualWidth}px`);
					columnWidths.push(colWidth);
				});
			}

			const totalTableHeight = element.offsetHeight;
			console.log(`${selector} - Total Table Height: ${totalTableHeight}px`);

			return {
				headerHeight,
				headerHTML: header ? header.outerHTML : '',
				rowHeights,
				rowsHtml,
				tableAttributes,
				avgRowHeight,
				columnWidths,
				totalTableHeight,
				tableWidth: table.offsetWidth,
			};
		};

		return {
			customerSection: getElementDimensions('#customer-section-measure'),
			sampleInfoSection: getElementDimensions('#sample-section-measure'),
			analysisSection: getElementDimensions('#analysis-section-measure'),
			notesSection: getElementDimensions('#notes-section-measure'),
			signatureSection: getElementDimensions('#signature-section-measure'),
			spacingHeight: getElementDimensions('#spacing-measure').height,
			analysisTableInfo: measureTableInfo('#analysis-section-measure'),
		};
	});

	await page.close();

	// Log measurements with node.warn
	node.warn(`=== Section Height Measurements ===`);
	node.warn(`Header: ${headerFooterMeasurements.headerHeight}px`);
	node.warn(`Footer: ${headerFooterMeasurements.footerHeight}px`);
	node.warn(`Customer Section: ${measurements.customerSection.height}px`);
	node.warn(`Sample Info Section: ${measurements.sampleInfoSection.height}px`);
	node.warn(`Analysis Section: ${measurements.analysisSection.height}px`);
	node.warn(`Notes Section: ${measurements.notesSection.height}px`);
	node.warn(`Signature Section: ${measurements.signatureSection.height}px`);
	node.warn(`Spacing: ${measurements.spacingHeight}px`);
	node.warn(`Available Content Height: ${availableContentHeight}px`);
	node.warn(`Content Top Position: ${contentTopPosition}px`);
	node.warn(`Content Bottom Position: ${contentBottomPosition}px`);
	node.warn(`Footer Start Position: ${footerStartPosition}px`);

	if (measurements.analysisTableInfo) {
		node.warn(`Analysis Table Header: ${measurements.analysisTableInfo.headerHeight}px`);
		node.warn(`Analysis Table Total Height: ${measurements.analysisTableInfo.totalTableHeight}px`);
		node.warn(`Analysis Table Rows: ${measurements.analysisTableInfo.rowHeights.length}`);
		node.warn(`Analysis Table Average Row Height: ${measurements.analysisTableInfo.avgRowHeight.toFixed(2)}px`);
	}
	node.warn(`===================================`);

	return {
		headerHeight: headerFooterMeasurements.headerHeight,
		footerHeight: headerFooterMeasurements.footerHeight,
		customerSectionHeight: measurements.customerSection.height,
		sampleInfoSectionHeight: measurements.sampleInfoSection.height,
		analysisSectionHeight: measurements.analysisSection.height,
		notesSectionHeight: measurements.notesSection.height,
		signatureSectionHeight: measurements.signatureSection.height,
		spacingHeight: 15, // Changed to 15px to match reportPreviewHelpers.js
		notificationHeight: 30,
		availableContentHeight: availableContentHeight,
		contentTopPosition: contentTopPosition,
		contentBottomPosition: contentBottomPosition,
		footerStartPosition: footerStartPosition,
		A4: A4,
		analysisTableInfo: measurements.analysisTableInfo,
		layoutValid: true,
	};
}

/**
 * Step 4: Apply pagination logic (based on reportPreviewHelpers.js)
 */
function applyPaginationLogic(sectionsData, measurements) {
	const { availableContentHeight, spacingHeight } = measurements;
	const SAFETY_MARGIN = 20;
	const safeContentHeight = availableContentHeight - SAFETY_MARGIN;

	// Build section measurements array
	const sectionMeasurements = [];

	// Add customer section
	sectionMeasurements.push({
		html: sectionsData.customerSection,
		height: measurements.customerSectionHeight,
		isTable: false,
		tableInfo: null,
	});

	// Add sample info section
	sectionMeasurements.push({
		html: sectionsData.sampleInfoSection,
		height: measurements.sampleInfoSectionHeight,
		isTable: false,
		tableInfo: null,
	});

	// Add analysis section (with table info)
	sectionMeasurements.push({
		html: sectionsData.analysisSection,
		height: measurements.analysisSectionHeight,
		isTable: true,
		tableInfo: measurements.analysisTableInfo,
	});

	// Add notes section
	sectionMeasurements.push({
		html: sectionsData.notesSection,
		height: measurements.notesSectionHeight,
		isTable: false,
		tableInfo: null,
	});

	// Add signature section
	sectionMeasurements.push({
		html: sectionsData.signatureSection,
		height: measurements.signatureSectionHeight,
		isTable: false,
		tableInfo: null,
	});

	// Calculate total content height
	let totalContentHeight = 0;
	sectionMeasurements.forEach((section) => {
		totalContentHeight += section.height + spacingHeight;
	});

	node.warn(`Total content height: ${totalContentHeight}px, Safe content height: ${safeContentHeight}px`);

	// Check if single page is enough
	if (totalContentHeight <= safeContentHeight) {
		node.warn('Using single page layout');
		return createSinglePageLayout(sectionsData, measurements, sectionMeasurements);
	}

	// Check if content would fit in exactly 2 pages (rough estimate)
	const wouldBeTwoPages = totalContentHeight > safeContentHeight && totalContentHeight <= safeContentHeight * 2;

	// Only check special two-page layout if we're in the "two pages" range
	if (wouldBeTwoPages) {
		const twoPageResult = checkSpecialTwoPageLayout(sectionMeasurements, measurements, safeContentHeight);
		if (twoPageResult.canUse) {
			node.warn('Using special two-page layout');
			return twoPageResult.pages;
		}
	}

	// Complex multi-page layout
	node.warn('Using complex multi-page layout');
	return createComplexMultiPageLayout(sectionsData, measurements, safeContentHeight, sectionMeasurements);
}

/**
 * Create single page layout
 */
function createSinglePageLayout(sectionsData, measurements, sectionMeasurements) {
	return [
		{
			pageNumber: 1,
			sections: sectionMeasurements,
		},
	];
}

/**
 * Check if special two-page layout is possible
 */
function checkSpecialTwoPageLayout(sections, measurements, safeContentHeight) {
	node.warn('=== Checking Two-Page Layout ===');
	node.warn(`Total sections: ${sections.length}`);
	node.warn(`Safe content height: ${safeContentHeight}px`);

	sections.forEach((s, i) => {
		node.warn(`Section ${i}: height=${s.height}px, isTable=${s.isTable}`);
	});

	// Identify sections by their ID attributes
	const customerSectionIndex = sections.findIndex((s) => s.html.includes('id="customer-section"'));
	const sampleInfoIndex = sections.findIndex((s) => s.html.includes('id="sample-section"'));
	const analysisIndex = sections.findIndex((s) => s.html.includes('id="analysis-section"'));
	const notesIndex = sections.findIndex((s) => s.html.includes('id="notes-section"'));
	const signatureIndex = sections.findIndex((s) => s.html.includes('id="signature-section"'));
	const commentIndex = sections.findIndex((s) => s.html.includes('id="comment-section"'));

	node.warn('=== Section Identification (by ID) ===');
	node.warn(
		`Customer: ${customerSectionIndex}, Sample: ${sampleInfoIndex}, Analysis: ${analysisIndex}, Notes: ${notesIndex}, Signature: ${signatureIndex}, Comment: ${commentIndex}`,
	);

	// If we can't identify key sections, can't use special layout
	if (customerSectionIndex === -1 || analysisIndex === -1 || signatureIndex === -1) {
		node.warn('❌ Cannot identify key sections');
		return { canUse: false };
	}

	// Calculate page 2 height: analysisSection + commentSection (if exists) + signatureSection + spacing
	let page2Height = 0;
	const { spacingHeight } = measurements;

	if (analysisIndex >= 0) {
		page2Height += sections[analysisIndex].height + spacingHeight;
		node.warn(`Analysis: ${sections[analysisIndex].height}px`);
	}
	if (commentIndex >= 0) {
		page2Height += sections[commentIndex].height + spacingHeight;
		node.warn(`Comment: ${sections[commentIndex].height}px`);
	}
	if (signatureIndex >= 0) {
		page2Height += sections[signatureIndex].height + spacingHeight;
		node.warn(`Signature: ${sections[signatureIndex].height}px`);
	}

	node.warn(`=== Page 2 Height Calculation ===`);
	node.warn(`Total page 2 height: ${page2Height}px`);
	node.warn(`Page 2 fits? ${page2Height <= safeContentHeight}`);

	// MAIN CONDITION: If page 2 content (analysis + comment + signature) fits in one page
	if (page2Height <= safeContentHeight) {
		// Calculate page 1 height: customer + sample + "see next page" message + notes
		let page1Height = 0;
		const seeNextPageMessageHeight = 30;

		if (customerSectionIndex >= 0) {
			page1Height += sections[customerSectionIndex].height + spacingHeight;
			node.warn(`Customer: ${sections[customerSectionIndex].height}px`);
		}
		if (sampleInfoIndex >= 0) {
			page1Height += sections[sampleInfoIndex].height + spacingHeight;
			node.warn(`Sample Info: ${sections[sampleInfoIndex].height}px`);
		}

		// Add "see next page" message height
		page1Height += seeNextPageMessageHeight + spacingHeight;
		node.warn(`See Next Page Message: ${seeNextPageMessageHeight}px`);

		if (notesIndex >= 0) {
			page1Height += sections[notesIndex].height + spacingHeight;
			node.warn(`Notes: ${sections[notesIndex].height}px`);
		}

		node.warn(`=== Page 1 Height Calculation ===`);
		node.warn(`Total page 1 height: ${page1Height}px`);
		node.warn(`Page 1 fits? ${page1Height <= safeContentHeight}`);

		// Check if page 1 also fits
		if (page1Height <= safeContentHeight) {
			node.warn('✅ Two-page layout possible!');

			const page1Sections = [];
			const page2Sections = [];

			// Add to page 1
			if (customerSectionIndex >= 0) page1Sections.push(sections[customerSectionIndex]);
			if (sampleInfoIndex >= 0) page1Sections.push(sections[sampleInfoIndex]);

			// Add "See results on next page" message
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
			node.warn('❌ Two-page layout not possible: Page 1 content exceeds available height');
		}
	} else {
		node.warn('❌ Two-page layout not possible: Page 2 content exceeds available height');
	}

	return { canUse: false };
}

/**
 * Create complex multi-page layout with table splitting
 */
function createComplexMultiPageLayout(sectionsData, measurements, safeContentHeight, sectionMeasurements) {
	const pages = [];
	let currentPage = {
		pageNumber: 1,
		sections: [],
		currentHeight: 0,
	};

	sectionMeasurements.forEach((section, index) => {
		const sectionWithSpacing = section.height + measurements.spacingHeight;

		// Check if this is a table that needs splitting
		if (section.isTable && section.tableInfo) {
			const tableInfo = section.tableInfo;
			const availableSpace = safeContentHeight - currentPage.currentHeight;

			// Check if entire table fits in current page
			if (sectionWithSpacing <= availableSpace) {
				currentPage.sections.push(section);
				currentPage.currentHeight += sectionWithSpacing;
				node.warn(
					`Table fits in current page ${currentPage.pageNumber}, remaining space: ${
						availableSpace - sectionWithSpacing
					}px`,
				);
			} else {
				// Need to split table
				node.warn(`Table needs splitting. Available space: ${availableSpace}px, Table height: ${sectionWithSpacing}px`);

				// Save current page if it has content
				if (currentPage.sections.length > 0) {
					pages.push(currentPage);
					node.warn(`Saving page ${currentPage.pageNumber} with ${currentPage.sections.length} sections`);
				}

				// Split table across pages
				const tableParts = paginateAnalysisTable(
					tableInfo,
					safeContentHeight,
					currentPage.sections.length === 0 ? safeContentHeight : availableSpace,
				);

				node.warn(`Table split into ${tableParts.length} parts`);

				tableParts.forEach((part, partIndex) => {
					if (partIndex === 0 && currentPage.sections.length === 0) {
						// Add first part to current empty page
						currentPage.sections.push({
							html: part.html,
							height: part.height,
							isTable: true,
							tableInfo: null,
						});
						currentPage.currentHeight = part.height + measurements.spacingHeight;
					} else {
						// Create new page for this part
						currentPage = {
							pageNumber: pages.length + 1,
							sections: [
								{
									html: part.html,
									height: part.height,
									isTable: true,
									tableInfo: null,
								},
							],
							currentHeight: part.height + measurements.spacingHeight,
						};
						pages.push(currentPage);
						node.warn(`Created new page ${currentPage.pageNumber} for table part ${partIndex + 1}`);

						// Reset for next iteration
						currentPage = {
							pageNumber: pages.length + 1,
							sections: [],
							currentHeight: 0,
						};
					}
				});
			}
		} else {
			// Regular section (not a table)
			const availableSpace = safeContentHeight - currentPage.currentHeight;

			if (sectionWithSpacing <= availableSpace) {
				// Fits in current page
				currentPage.sections.push(section);
				currentPage.currentHeight += sectionWithSpacing;
				node.warn(
					`Section ${index} fits in page ${currentPage.pageNumber}, remaining: ${
						availableSpace - sectionWithSpacing
					}px`,
				);
			} else {
				// Move to next page
				if (currentPage.sections.length > 0) {
					pages.push(currentPage);
					node.warn(`Saving page ${currentPage.pageNumber} before moving section to next page`);
				}

				currentPage = {
					pageNumber: pages.length + 1,
					sections: [section],
					currentHeight: sectionWithSpacing,
				};
				node.warn(`Section ${index} moved to new page ${currentPage.pageNumber}`);
			}
		}
	});

	// Add last page if it has content
	if (currentPage.sections.length > 0) {
		pages.push(currentPage);
		node.warn(`Saving final page ${currentPage.pageNumber} with ${currentPage.sections.length} sections`);
	}

	node.warn(`Total pages created: ${pages.length}`);
	return pages;
}

/**
 * Paginate analysis table across multiple pages
 * Returns array of table parts: [{html, height}, ...]
 */
function paginateAnalysisTable(tableInfo, availableContentHeight, firstPageRemainingSpace) {
	const parts = [];

	if (!tableInfo || !tableInfo.rowsHtml || tableInfo.rowsHtml.length === 0) {
		node.warn('No table rows to paginate');
		return parts;
	}

	const { headerHTML, headerHeight, rowsHtml, rowHeights, tableAttributes, columnWidths } = tableInfo;

	const TABLE_SAFETY_MARGIN = 10;
	const safeFirstPageSpace = Math.max(0, firstPageRemainingSpace - TABLE_SAFETY_MARGIN);
	const safePageHeight = Math.max(0, availableContentHeight - TABLE_SAFETY_MARGIN);

	node.warn(
		`Paginating table: ${rowsHtml.length} rows, header: ${headerHeight}px, first page space: ${safeFirstPageSpace}px, page height: ${safePageHeight}px`,
	);

	let currentPageRows = [];
	let currentHeight = 0;
	let maxHeight = safeFirstPageSpace;
	let isFirstPart = true;

	rowsHtml.forEach((rowHtml, index) => {
		const rowHeight = rowHeights[index] || 30;
		const neededHeight = (currentPageRows.length === 0 ? headerHeight : 0) + rowHeight;

		if (currentHeight + neededHeight > maxHeight && currentPageRows.length > 0) {
			// Save current part
			const tableHTML = createTableWithConsistentColumnWidths(
				tableAttributes,
				headerHTML,
				currentPageRows.join(''),
				columnWidths,
			);
			parts.push({
				html: tableHTML,
				height: currentHeight,
			});
			node.warn(`Table part ${parts.length}: ${currentPageRows.length} rows, ${currentHeight}px`);

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
		const tableHTML = createTableWithConsistentColumnWidths(
			tableAttributes,
			headerHTML,
			currentPageRows.join(''),
			columnWidths,
		);
		parts.push({
			html: tableHTML,
			height: currentHeight,
		});
		node.warn(`Table part ${parts.length} (final): ${currentPageRows.length} rows, ${currentHeight}px`);
	}

	node.warn(`Total table parts created: ${parts.length}`);
	return parts;
}

/**
 * Helper function to create table with consistent column widths
 */
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
 * Get CSS with fonts for print (updated to match reportPreviewHelpers.js)
 */
function getPrintCSSWithFonts(A4, includeContentPositioning = true, headerHeight = 160) {
	const mmToPx = (mm) => mm * 3.78;

	const baseCSS = `
        @page { size: A4; margin: 0; }
        
        * {
            font-family: 'Wix Madefor Display', sans-serif !important;
        }
        
        html, body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Wix Madefor Display', sans-serif !important;
            font-weight: 400;
        }
        
        p, td, th, div, span, strong, b { 
            font-family: 'Wix Madefor Display', sans-serif !important;
        }
        
        strong, b { 
            font-family: 'Wix Madefor Display', sans-serif !important; 
            font-weight: 700 !important; 
        }
        
        .print-container { width: 794px; margin: 0px auto; background-color: white; }
        
        .page { 
            position: relative; 
            width: 100%; 
            height: 1122px; 
            box-sizing: border-box; 
            page-break-after: always; 
            background-color: white; 
            padding: 0;
            overflow: hidden; 
            border: 1px solid #000; 
        }
        
        .header { 
            position: absolute; 
            left: ${mmToPx(A4.sideMargin)}px; 
            width: calc(100% - ${2 * mmToPx(A4.sideMargin)}px); 
            box-sizing: border-box; 
            overflow: visible; 
            z-index: 2;
        }
        
        .footer { 
            position: absolute; 
            left: ${mmToPx(A4.sideMargin)}px; 
            width: calc(100% - ${2 * mmToPx(A4.sideMargin)}px); 
            box-sizing: border-box; 
            z-index: 2;
        }
        
        .content { 
            position: absolute; 
            left: ${mmToPx(A4.sideMargin)}px; 
            width: calc(100% - ${2 * mmToPx(A4.sideMargin)}px); 
            box-sizing: border-box; 
            overflow: hidden;
            z-index: 1;
        }
        
        table { 
            border-collapse: collapse; 
            table-layout: fixed; 
            width: 100%; 
            page-break-inside: avoid;
            font-family: 'Wix Madefor Display', sans-serif !important;
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
            font-family: 'Wix Madefor Display', sans-serif !important;
        }
        
        table td p, table th p { 
            margin: 0; 
            padding: 0; 
            line-height: 1.2; 
            font-size: 12px; 
            overflow-wrap: anywhere; 
            font-family: 'Wix Madefor Display', sans-serif !important;
        }
        
        p { 
            margin: 0; 
            overflow-wrap: anywhere; 
            font-family: 'Wix Madefor Display', sans-serif !important;
        }
        
        @media print { 
            .page { border: none; } 
            body { -webkit-print-color-adjust: exact; }
        }
    `;

	if (includeContentPositioning) {
		// Calculate positions matching reportPreviewHelpers.js
		const topMarginPx = mmToPx(A4.topMargin);
		const bottomMarginPx = mmToPx(A4.bottomMargin);
		const headerSpacingPx = 15; // 15px gap after header
		const footerSpacingPx = 20; // 20px gap before footer
		const footerHeight = 50; // Approximate footer height

		const headerTop = topMarginPx;
		const contentTop = headerTop + headerHeight + headerSpacingPx;
		const footerBottom = bottomMarginPx;
		const contentMaxHeight =
			1122 - topMarginPx - bottomMarginPx - headerHeight - footerHeight - headerSpacingPx - footerSpacingPx;

		return (
			baseCSS +
			`
        .header { 
            top: ${headerTop}px;
        }
        .content { 
            top: ${contentTop}px; 
            max-height: ${contentMaxHeight}px;
            height: auto;
        }
        .footer {
            bottom: ${footerBottom}px;
        }
        `
		);
	}

	return baseCSS;
}

/**
 * Step 5: Generate final HTML for all samples
 * Page numbers are reset for each sample (not cumulative across samples)
 */
function generateFinalHTMLForAllSamples(sectionsDataArray, allPaginatedContent, allMeasurements) {
	// Combine all sample pages into one document
	let allPages = '';

	// Get first measurement for CSS generation
	const firstMeasurement = allMeasurements[0];
	const printCSS = getPrintCSSWithFonts(firstMeasurement.A4, true, firstMeasurement.headerHeight);

	// Generate pages for each sample - page numbers reset for each sample
	for (let i = 0; i < sectionsDataArray.length; i++) {
		const sectionsData = sectionsDataArray[i];
		const paginatedContent = allPaginatedContent[i];
		const totalPagesForSample = paginatedContent.length;

		node.warn(`\n=== Sample ${i + 1} (${sectionsData.sample_uid}): ${totalPagesForSample} pages ===`);

		// Generate pages for this sample with page numbers starting from 1
		for (let pageIndex = 0; pageIndex < paginatedContent.length; pageIndex++) {
			const pageData = paginatedContent[pageIndex];
			const pageNumber = pageIndex + 1; // Page number for this sample (starts at 1)
			const pageHTML = generateSinglePage(sectionsData, pageData, pageNumber, totalPagesForSample);
			allPages += pageHTML;
		}
	}

	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Certificate of Analysis - Multi Sample</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>${printCSS}</style>
</head>
<body>
    <div class="print-container">
        ${allPages}
    </div>
</body>
</html>`;
}

/**
 * Generate a single page (matching reportPreviewHelpers.js spacing logic)
 */
function generateSinglePage(sectionsData, pageData, pageNumber, totalPages) {
	// Update footer with page numbers
	const pageStr = pageNumber.toString().padStart(2, '0');
	const totalStr = totalPages.toString().padStart(2, '0');

	// Match the footer pattern from Report.jsx
	const footer = sectionsData.footerHTML.replace(/<span>00 \/ 00<\/span>/, `<span>${pageStr} / ${totalStr}</span>`);

	// Build content from sections with spacing
	// Add spacing AFTER each section except the last one (matching reportPreviewHelpers.js)
	const spacingHTML = `<div style="height: 15px; margin:0; padding:0;"></div>`;
	const content = pageData.sections
		.map((section, index) => {
			// Add spacing after each section except the last one
			if (index < pageData.sections.length - 1) {
				return section.html + spacingHTML;
			}
			return section.html;
		})
		.join('');

	return `
    <div class="page">
        <div class="header">${sectionsData.headerHTML}</div>
        <div class="content">${content}</div>
        <div class="footer">${footer}</div>
    </div>`;
}

const sampleUids = msg.req.body.samples.map((sample) => {
	return sample.id;
});
const result = await generateMultiSampleReport(sampleUids);
msg.payload = result;
return msg;
