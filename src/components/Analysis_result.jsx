import { useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2';

export default function MultiPageEditor() {
	const [searchParams, setSearchParams] = useSearchParams();
	const sample_uid = searchParams.get('sample_uid');
	const [sampleData, setSampleData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const { currentUser, formatDate } = useContext(GlobalContext);

	// Add new state to store related samples from the same receipt
	const [relatedSamples, setRelatedSamples] = useState([]);
	const navigate = useNavigate();

	// State for section HTML content
	const [headerHTML, setHeaderHTML] = useState('');
	const [footerHTML, setFooterHTML] = useState('');
	const [sampleInfoSectionHTML, setSampleInfoSectionHTML] = useState('');
	const [analysisSectionHTML, setAnalysisSectionHTML] = useState('');
	const [notesSectionHTML, setNotesSectionHTML] = useState('');
	const [signatureSectionHTML, setSignatureSectionHTML] = useState('');

	// Add new state variables for notes and requirements
	const [receiptNote, setReceiptNote] = useState('');
	const [additionalRequest, setAdditionalRequest] = useState('');

	// Add new state to store row heights
	const [tableRowHeights, setTableRowHeights] = useState([]);
	// Create ref array for table rows
	const tableRowRefs = useRef([]);

	// Add state to track if we're changing samples
	const [isChangingSample, setIsChangingSample] = useState(false);

	// Add utility function for pixel to millimeter conversion at component level
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

	const pxToMm = (px) => {
		const dpi = getDPI();
		return (px * 25.4) / dpi;
	};

	const mmToPx = (mm) => {
		const dpi = getDPI();
		return (mm * dpi) / 25.4;
	};

	// Fetch the list of published reports for this sample
	useEffect(() => {
		const fetchSampleData = async () => {
			if (!sample_uid) return;

			try {
				setLoading(true);
				// Fetch sample data
				const sampleResponse = await apiGet(`https://black.irdop.org/to82oe92i/db/get/sample_full/${sample_uid}`);
				// Alternative URL: http://127.0.0.1:1880/db/get/sample_full/${sample_uid}

				if (sampleResponse.status !== 200) {
					throw new Error(`Sample API request failed with status ${sampleResponse.status}`);
				}

				const sampleResult = sampleResponse.data;
				setSampleData(sampleResult);

				// Extract receipt note and additional request data
				if (sampleResult.receipt && sampleResult.receipt.note) {
					setReceiptNote(sampleResult.receipt.note);
				}

				if (sampleResult.additional_request) {
					setAdditionalRequest(sampleResult.additional_request);
				}

				// Update the content with the retrieved data
				updateContentWithData(sampleResult);
				setLoading(false);
				return sampleResult;
			} catch (err) {
				setError(err.message);
				setLoading(false);
				return null;
			}
		};

		fetchSampleData();
	}, [sample_uid]);

	// Add this new useEffect to fetch related samples when sample data is loaded
	useEffect(() => {
		const fetchRelatedSamples = async () => {
			if (sample_uid) {
				try {
					const response = await apiGet(`https://black.irdop.org/to82oe92i/db/get/sample_by_sample_uid/${sample_uid}`);
					if (response.status === 200) {
						setRelatedSamples(response.data);
					}
				} catch (err) {}
			}
		};

		fetchRelatedSamples();
	}, [sample_uid]);

	// Add a handler for sample selection
	const handleSampleChange = (e) => {
		const selectedSampleUid = e.target.value;
		setIsChangingSample(true);

		// Navigate to the new sample_uid
		navigate(`/result?sample_uid=${selectedSampleUid}`);
	};

	// Function to update content with sample and client data
	const updateContentWithData = (data) => {
		if (!data) return;

		// Generate the sample information section based on API data - filter for specific fields only
		const updatedSampleInfo = generateSampleInfoSection(data);
		setSampleInfoSectionHTML(updatedSampleInfo);

		// Generate the analysis section based on API data
		const updatedAnalysisSection = generateAnalysisSection(data);
		setAnalysisSectionHTML(updatedAnalysisSection);

		// Set notes and signature sections
		setNotesSectionHTML(notesSection);
		setSignatureSectionHTML(signatureSection);

		// Default layout: all sections in sequential order
		const updatedContent = `${updatedSampleInfo}${spacing}${updatedAnalysisSection}${spacing}${notesSection}${spacing}${signatureSection}`;

		// Update the editor content
		setContent(updatedContent);
		if (editorRef.current) {
			editorRef.current.setContent(updatedContent);
		}

		// Store sections separately for layout adjustments during printing
		setSectionContent({
			sampleInfoSection: updatedSampleInfo,
			analysisSection: updatedAnalysisSection,
			notesSection: notesSection,
			signatureSection: signatureSection,
		});
	};

	// Function to measure row heights using window.getComputedStyle
	const measureTableRowHeights = (shouldLog = false, delayMs = 50) => {
		return new Promise((resolve) => {
			setTimeout(() => {
				// First, query the DOM directly for table rows, like debugTableRows does
				const rows = document.querySelectorAll('.table-row');

				if (rows.length === 0) {
					resolve([]);
					return;
				}

				// Helper function to safely parse numeric style values
				const safeParseFloat = (value) => {
					if (!value) return 0;
					const strValue = String(value || '0');
					const numericPart = strValue.replace(/[^\d.-]/g, '');
					const result = parseFloat(numericPart);
					return isNaN(result) ? 0 : result;
				};

				// Store existing references for later use
				tableRowRefs.current = Array.from(rows);

				// Measure each row's height using computed styles and direct measurements
				const heights = Array.from(rows)
					.map((rowRef, index) => {
						if (!rowRef) {
							return { index, heightPx: 30, heightMm: pxToMm(30) };
						}

						try {
							// Get direct measurements first (most reliable)
							const offsetHeight = rowRef.offsetHeight || 0;
							const clientHeight = rowRef.clientHeight || 0;
							const scrollHeight = rowRef.scrollHeight || 0;
							const boundingClientRect = rowRef.getBoundingClientRect();
							const boundingHeight = boundingClientRect ? boundingClientRect.height : 0;

							// Get the computed style for additional measurements
							const computedStyle = window.getComputedStyle(rowRef);

							// Calculate padding, border, margin heights
							const paddingTop = safeParseFloat(computedStyle.paddingTop);
							const paddingBottom = safeParseFloat(computedStyle.paddingBottom);
							const borderTopWidth = safeParseFloat(computedStyle.borderTopWidth);
							const borderBottomWidth = safeParseFloat(computedStyle.borderBottomWidth);
							const marginTop = safeParseFloat(computedStyle.marginTop);
							const marginBottom = safeParseFloat(computedStyle.marginBottom);

							// Add computation of the height from computed style
							const computedHeight = safeParseFloat(computedStyle.height);

							// Calculate total height based on box-sizing model
							const boxSizing = computedStyle.boxSizing;
							let totalComputedHeight = computedHeight;

							// Adjust calculation based on box-sizing
							if (boxSizing !== 'border-box') {
								// For content-box, add padding and border to total height
								totalComputedHeight += paddingTop + paddingBottom + borderTopWidth + borderBottomWidth;
							}
							// Always add margins to total height
							totalComputedHeight += marginTop + marginBottom;

							// Measure cell heights if available
							let maxCellHeight = 0;
							if (rowRef.cells && rowRef.cells.length > 0) {
								for (let i = 0; i < rowRef.cells.length; i++) {
									const cell = rowRef.cells[i];
									if (cell) {
										const cellHeight = cell.offsetHeight || 0;
										maxCellHeight = Math.max(maxCellHeight, cellHeight);
									}
								}
							}

							// Determine the most reliable height value
							let finalHeight;

							if (offsetHeight > 5) {
								// offset height is usually most reliable
								finalHeight = offsetHeight;
							} else if (boundingHeight > 5) {
								finalHeight = boundingHeight;
							} else if (maxCellHeight > 0) {
								finalHeight = maxCellHeight;
							} else if (totalComputedHeight > 5) {
								// Use computed style height before falling back to scrollHeight
								finalHeight = totalComputedHeight;
							} else if (scrollHeight > 5) {
								finalHeight = scrollHeight;
							} else {
								// Default if we can't get any reliable measurement
								finalHeight = 32; // 30px is a reasonable minimum
							}

							// Convert to mm
							const heightMm = pxToMm ? pxToMm(finalHeight) : finalHeight / 3.78;

							return {
								index,
								heightPx: finalHeight,
								heightMm,
								rowRef,
								offsetHeight,
							};
						} catch (error) {
							return { index, heightPx: 30, heightMm: pxToMm(30) };
						}
					})
					.filter((item) => item.heightPx > 0);

				setTableRowHeights(heights);
				resolve(heights);
			}, delayMs);
		});
	};

	// Function to generate sample information section from API data - simplified version
	const generateSampleInfoSection = (data) => {
		// Get the sample_uid from data
		const sampleId = data.sample_uid || sample_uid;

		// Get the sample_information array from data and filter only the requested fields
		const sampleInfo = data.sample_information || [];
		const filteredInfo = sampleInfo.filter((info) => {
			const fieldName = info.fname || '';
			return fieldName.includes('Tên mẫu thử') || fieldName.includes('Ngày tiếp nhận') || fieldName.includes('Mô tả');
		});

		// Map each filtered sample information item to a row in the sample info section
		const infoRows = filteredInfo
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
				<div style="width: 30%; font-size: 12px; line-height: 1.2; text-align: left; padding-right: 10px; display: flex; align-items: top;">
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
	};

	// Function to generate analysis section from API data
	const generateAnalysisSection = (data) => {
		// Reset table row refs array
		tableRowRefs.current = [];

		// Get the analysis array from data
		const analysisItems = data.analysis || [];

		// Map each analysis item to a row in the table
		let analysisRows = '';
		if (analysisItems.length > 0) {
			analysisRows = analysisItems
				.map((item, index) => {
					const parameterName = item.parameter_name || '--';
					const result = item.result_value || '--';
					const unit = item.result_unit || '--';
					const protocol = item?.protocol_source + ' ' + item.protocol_code || '--';

					// Add unique row ID for measurements and data-row-index attribute
					const rowId = `analysis-row-${index}`;
					return `
				<tr id="${rowId}" class="table-row" data-row-index="${index}">
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${index + 1}.</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${parameterName}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${result}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${unit}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${protocol}</td>
				</tr>`;
				})
				.join('');
		} else {
			// If no analysis items, include a placeholder row with ID
			analysisRows = `
				<tr id="analysis-row-0" class="table-row" data-row-index="0">
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; ">1</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
				</tr>`;
		}

		// Create full table HTML
		const tableHTML = `
<div style="margin:0; padding:0;">
	<table style="width: auto; min-width: 100% ; border-collapse: collapse; text-align: left; margin:0; padding:0; font-size:12px; line-height:1.4;">
		<thead>
			<tr>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 50px; text-align:left; font-size:12px;box-sizing: border-box;">
					<strong>STT</strong> <br> <span style="font-size: 12px; color: #444444;">/ No.</span>
				</th>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500;  text-align:left; font-size:12px; min-width: 20%;box-sizing: border-box;">
					<strong>Phép thử</strong> <br> <span style="font-size: 12px; color: #444444;">/ Tests</span>
				</th>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; min-width:100px; text-align:left; font-size:12px; box-sizing: border-box;">
					<strong>Kết quả</strong> <br> <span style="font-size: 12px; color: #444444;">/ Test result</span>
				</th>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; min-width:90px; text-align:left; font-size:12px;box-sizing: border-box;">
					<strong>Đơn vị </strong><br> <span style="font-size: 12px; color: #444444;">/ Unit</span>
				</th>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; ; text-align:left; font-size:12px;box-sizing: border-box;">
					<strong>Phương pháp</strong> <br> <span style="font-size: 12px; color: #444444;">/ Protocol</span>
				</th>
			</tr>
		</thead>
		<tbody>
			${analysisRows}
		</tbody>
	</table>
</div>`;

		// Schedule measurement after table is rendered
		setTimeout(() => {
			// Attach refs to table rows after rendering
			const tableRows = document.querySelectorAll('.table-row') || [];
			if (tableRows.length > 0) {
				// Create a new array with the right length
				tableRowRefs.current = new Array(tableRows.length);

				// Assign DOM elements to the refs array
				tableRows.forEach((row, i) => {
					tableRowRefs.current[i] = row;
				});

				// Measure heights after refs are attached
				setTimeout(() => measureTableRowHeights(false), 50);
			}
		}, 100);

		return tableHTML;
	};

	// Add notes and signature sections as constants with standardized styling
	const notesSection = `
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
				Kết quả chỉ có giá trị với mẫu thử / The results are only valid for the tested sample(s).
			</p>
		</div>
		
	</div>
</div>`;

	const signatureSection = `
	<div style="padding-top: 0; display: flex; ; margin:0;">
		<div style="padding: 0pt; flex-grow: 1; position: relative; display:flex; height:2.7cm;">
			<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between; width: 50%;">

			</div>
			<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
				<strong contenteditable="true" 
						class="signature signer_fist_title print-text-paragraph"
						style="font-size:12px; line-height:1.2; margin:0;">
					QUẢN LÝ PHÒNG KIỂM NGHIỆM<br>/ Lab manager
				</strong>
				<p contenteditable="true" 
				   class="signature signer_first_name print-text-paragraph" 
				   style="font-size:12px; margin:0; line-height:1.4;">

				   </p>
			</div>
		</div>
	</div>`;

	const spacing = `<div style="height: 4mm; margin:0; padding:0;"></div>`;

	// Update initial content with empty placeholders
	const initialContent = `${spacing}${spacing}${notesSection}${spacing}${signatureSection}`;

	const [content, setContent] = useState(initialContent);
	const [header, setHeader] = useState(`
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
			   style="font-weight:700; font-size:24pt; color:#0058A3; height: 28px; padding-bottom: 2px;">
				XÁC NHẬN KẾT QUẢ KIỂM NGHIỆM
			</p>
			<p class=" content-header-title_eng" 
			   style="font-weight:700; font-size:21pt; color:#0058A3; height: 28px; padding-top: 2px;">
				/ Confirmation of analysis results
			</p>
			<div class=" display-flex" 
				 style="display: flex; align-items: center; gap: 2mm; font-size:12px; font-weight:400; margin-top: 0px;; height: 28px;">
				<span class="  published_date" 
					  style="min-width:5pt; margin: 0;">
					  Ngày / Date: ${formatDate(new Date())}
				</span>
			</div>
		</div>
	</div>
</div>
	`);
	const [footer, setFooter] = useState(`
<div style="border-top: 1px solid #4CB748; height: 50px; display: flex; padding-top: 0pt; align-items: center;">
<div style="flex-grow: 1; text-align: left;">
<p style="color: #0058a3; margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN</p>
<p style="margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">IRDOP.ORG</p>
<p style="opacity: 0.5; margin: 0; padding: 0; line-height: 1; font-size: 11px; height: 14px; display: flex; align-items: center;">Form: CONIFRM RESULT / Effective date: 06/04/2025</p>
</div>
<div style="font-size: 11px; display: flex; flex-direction: column; justify-content: flex-end; height: 100%;">
<div style="display: flex; align-items: center; height: 14px;"><span style="font-size: 11px; margin: 0; padding: 0; line-height: 1; margin-right: 2px;">Trang / Pages:</span>
<div style="display: flex; align-items: center; height: 14px;"><span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span> <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">/</span> <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span></div>
</div>
</div>
</div>

	`);

	// Store section content separately for layout adjustments
	const [sectionContent, setSectionContent] = useState({
		sampleInfoSection: '',
		analysisSection: '',
		notesSection: notesSection,
		signatureSection: signatureSection,
	});

	const editorRef = useRef(null);
	const contentRef = useRef(null);

	// Add font loading effect to ensure Gilroy is available
	useEffect(() => {
		// Create a style element for font-face declarations
		const fontStyle = document.createElement('style');
		fontStyle.textContent = `
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
			
			body, .editable, .header-editable, .content-editable, .footer-editable {
				font-family: 'Gilroy', sans-serif !important;
			}
			`;
		document.head.appendChild(fontStyle);

		// Load the font files programmatically to ensure they're available
		const fontUrls = [
			'/public/fonts/SVN-Gilroy Regular.otf',
			'/public/fonts/SVN-Gilroy SemiBold.otf',
			'/public/fonts/SVN-Gilroy Bold.otf',
		];

		// Preload fonts
		const fontPromises = fontUrls.map((url) => {
			return new Promise((resolve, reject) => {
				const link = document.createElement('link');
				link.rel = 'preload';
				link.href = url;
				link.as = 'font';
				link.type = 'font/otf';
				link.crossOrigin = 'anonymous';
				link.onload = resolve;
				link.onerror = reject;
				document.head.appendChild(link);
			});
		});
		// Wait for fonts to load
		Promise.all(fontPromises)
			.then(() => {})
			.catch((err) => console.error('Error loading Gilroy fonts:', err));

		return () => {
			document.head.removeChild(fontStyle);
		};
	}, []);

	// Modify TinyMCE initialization
	useEffect(() => {
		const script = document.createElement('script');
		script.src = '/tinymce/tinymce.min.js';
		script.onload = () => {
			setTimeout(() => initTinyMCE(), 100);
		};
		document.body.appendChild(script);

		return () => {
			if (window.tinymce) {
				window.tinymce.remove();
			}
		};
	}, []);

	const initTinyMCE = () => {
		if (!window.tinymce) {
			console.error('TinyMCE not loaded');
			return;
		}

		window.tinymce.remove();

		window.tinymce.init({
			selector: '.editable',
			license_key: 'gpl',
			inline: true,
			menubar: false,
			plugins: 'table',
			toolbar: 'undo redo | bold italic | subscript superscript | alignleft aligncenter alignright | table | charmap',
			readonly: false,
			extended_valid_elements: 'span[style]',
			charmap: [[8727, 'multiplication sign (∗)']],
			content_style: `
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
				
				body, *[contenteditable="true"] {
					font-family: 'Gilroy', sans-serif !important;
				}
			`,
			setup: (editor) => {
				if (editor.targetElm && editor.targetElm.classList && editor.targetElm.classList.contains('content-editable')) {
					editorRef.current = editor;

					editor.on('change keyup input', () => {
						setContent(editor.getContent());
					});

					editor.on('blur', () => {
						setContent(editor.getContent());
					});

					// Add padding control on content initialization
					editor.on('init', () => {
						const contentContainer = editor.getBody();
						if (contentContainer) {
							contentContainer.style.paddingTop = '0';
							contentContainer.style.paddingBottom = '0';

							// Apply additional styling to ensure borders display correctly in TinyMCE
							const sampleInfoDivs = contentContainer.querySelectorAll('div[style*="border"]');
							sampleInfoDivs.forEach((div) => {
								const style = div.getAttribute('style');
								if (style) {
									div.setAttribute('style', style + '; border-style: solid !important;');
								}
							});
						}
					});
				}

				if (editor.targetElm && editor.targetElm.classList && editor.targetElm.classList.contains('header-editable')) {
					editor.on('change keyup input blur', () => {
						setHeader(editor.getContent());
					});

					// Control header padding on initialization
					editor.on('init', () => {
						const headerContainer = editor.getBody();
						if (headerContainer && headerContainer.lastElementChild) {
							headerContainer.lastElementChild.style.paddingBottom = '0';
							headerContainer.lastElementChild.style.marginBottom = '0';
						}
						headerContainer.style.paddingBottom = '0';
					});
				}

				if (editor.targetElm && editor.targetElm.classList && editor.targetElm.classList.contains('footer-editable')) {
					editor.on('change keyup input blur', () => {
						setFooter(editor.getContent());
					});

					// Control footer padding on initialization
					editor.on('init', () => {
						const footerContainer = editor.getBody();
						if (footerContainer && footerContainer.firstElementChild) {
							footerContainer.firstElementChild.style.paddingTop = '0';
							footerContainer.firstElementChild.style.marginTop = '0';
						}
						footerContainer.style.paddingTop = '0';
					});
				}
			},
		});
	};

	// Function to handle printing
	const handlePrint = () => {
		let currentContent = content;
		let currentHeader = header;
		let currentFooter = footer;

		// Ensure we have the most current content from TinyMCE
		if (contentRef.current && window.tinymce) {
			const contentEditor = window.tinymce.get(contentRef.current?.id);
			if (contentEditor) {
				currentContent = contentEditor.getContent();
				setContent(currentContent); // Update state with latest content
			}

			const headerElements = document.getElementsByClassName('header-editable');
			if (headerElements.length > 0 && headerElements[0].id) {
				const headerEditor = window.tinymce.get(headerElements[0].id);
				if (headerEditor) {
					currentHeader = headerEditor.getContent();
					setHeader(currentHeader); // Update state with latest header
				}
			}

			const footerElements = document.getElementsByClassName('footer-editable');
			if (footerElements.length > 0 && footerElements[0].id) {
				const footerEditor = window.tinymce.get(footerElements[0].id);
				if (footerEditor) {
					currentFooter = footerEditor.getContent();
					setFooter(currentFooter); // Update state with latest footer
				}
			}
		}

		// Store header and footer in state
		setHeaderHTML(currentHeader || '');
		setFooterHTML(currentFooter || '');

		// Create print window
		const today = new Date();
		const day = String(today.getDate()).padStart(2, '0');
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const year = today.getFullYear();
		const formattedDate = `${day}-${month}-${year}`;

		const documentTitle = `PPT-${sample_uid || ''} ${formattedDate}`;
		const printWindow = window.open('', '_blank', 'width=1100,height=1000,toolbar=no,scrollbars=yes');

		if (!printWindow) {
			alert('Please allow pop-ups to print the document.');
			return;
		}

		// A4 dimensions in mm with spacing adjustments
		const A4 = {
			width: 210,
			height: 297,
			topMargin: 15, // 1.5cm
			bottomMargin: 8, // 0.8cm
			sideMargin: 10, // 1cm
			headerSpacing: 7, // spacing between header and content
			footerSpacing: 2, // spacing between content and footer
		};

		// Create temporary measuring div
		const measuringDiv = document.createElement('div');
		measuringDiv.style.position = 'absolute';
		measuringDiv.style.top = '-9999px';
		measuringDiv.style.left = '-9999px';
		measuringDiv.style.width = `${A4.width - 2 * A4.sideMargin}mm`;
		measuringDiv.style.visibility = 'hidden';
		document.body.appendChild(measuringDiv);

		// Measure header height
		measuringDiv.innerHTML = currentHeader || '';
		const headerHeight = measuringDiv.offsetHeight;

		// Measure footer height
		measuringDiv.innerHTML = currentFooter || '';
		const footerHeight = measuringDiv.offsetHeight;

		// Calculate available content height in pixels
		const availableContentHeight =
			mmToPx(A4.height) -
			mmToPx(A4.topMargin) -
			mmToPx(A4.bottomMargin) -
			headerHeight -
			footerHeight -
			mmToPx(A4.headerSpacing) -
			mmToPx(A4.footerSpacing);

		// Helper function to get element type description
		const getElementTypeDescription = (node) => {
			if (!node || !node.nodeName) return 'Unknown';

			if (node.nodeName === 'DIV') {
				if (node.querySelector('table')) return 'Table Container';
				return 'Div';
			}

			return node.nodeName;
		};

		// Helper function to get element identifier
		const getElementIdentifier = (node) => {
			if (!node) return '';

			// Try to get id, class, or content hint
			const id = node.id ? `#${node.id}` : '';
			const classList = node.classList
				? Array.from(node.classList)
						.map((c) => `.${c}`)
						.join('')
				: '';

			// For text hint, get first few characters
			let textHint = '';
			if (node.innerText) {
				textHint = node.innerText.substring(0, 20).trim();
				if (node.innerText.length > 20) textHint += '...';
			}

			return id || classList || (textHint ? `"${textHint}"` : '');
		};

		// Helper function to filter out text nodes and empty elements
		const isValidNode = (node) => {
			// If it's a text node, check if it contains only whitespace
			if (node.nodeType === 3) {
				return node.textContent.trim().length > 0;
			}

			// Skip empty or undefined elements
			if (!node || !node.nodeName) {
				return false;
			}

			// Skip comment nodes
			if (node.nodeType === 8) {
				return false;
			}

			return true;
		};

		// Function to clean up HTML content and remove undefined values
		const cleanHtmlContent = (htmlContent) => {
			if (!htmlContent) return '';

			// Replace instances of "undefined" text with empty string
			return htmlContent
				.replace(/undefined/g, '')
				.replace(/\bNaN\b/g, '')
				.replace(/<div>\s*<\/div>/g, '');
		};

		// Function to measure an element's height using computed style
		const measureElementHeight = (element, description = '') => {
			if (!element) return { heightPx: 0, heightMm: 0 };

			// Clone the element into our measuring div
			measuringDiv.innerHTML = '';
			const clone = element.cloneNode(true);
			measuringDiv.appendChild(clone);

			// Get computed style
			const computedStyle = window.getComputedStyle(measuringDiv);

			// Calculate padding, border, margin heights
			const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
			const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
			const borderTopWidth = parseFloat(computedStyle.borderTopWidth) || 0;
			const borderBottomWidth = parseFloat(computedStyle.borderBottomWidth) || 0;
			const marginTop = parseFloat(computedStyle.marginTop) || 0;
			const marginBottom = parseFloat(computedStyle.marginBottom) || 0;

			// Direct measurements
			const offsetHeight = measuringDiv.offsetHeight || 0;
			const scrollHeight = measuringDiv.scrollHeight || 0;

			// Get computed height and check if it's reliable
			const computedHeight = parseFloat(computedStyle.height) || 0;

			// Get box sizing
			const boxSizing = computedStyle.boxSizing;

			// Calculate total content height based on box-sizing
			let contentHeight = computedHeight;
			if (boxSizing === 'border-box' && computedHeight > 0) {
				// For border-box, subtract padding and border to get content height
				contentHeight = computedHeight - paddingTop - paddingBottom - borderTopWidth - borderBottomWidth;
			}

			// Calculate total height including margin
			let totalHeight = 0;

			// Use most reliable height measure in this priority:
			// 1. Computed height if it seems valid
			// 2. offsetHeight as a direct measurement
			// 3. scrollHeight as a fallback
			if (computedHeight > 0) {
				// If we have a valid computed height, use it as the base
				if (boxSizing === 'border-box') {
					// computedHeight already includes padding and border
					totalHeight = computedHeight + marginTop + marginBottom;
				} else {
					// Add padding, border to content height for content-box
					totalHeight =
						computedHeight + paddingTop + paddingBottom + borderTopWidth + borderBottomWidth + marginTop + marginBottom;
				}
			} else if (offsetHeight > 0) {
				// offsetHeight includes padding and border but not margin
				totalHeight = offsetHeight + marginTop + marginBottom;
			} else if (scrollHeight > 0) {
				// scrollHeight includes padding but not border or margin
				totalHeight = scrollHeight + borderTopWidth + borderBottomWidth + marginTop + marginBottom;
			} else {
				// Fallback minimum height
				totalHeight = 30;
			}

			// Log height details
			const elementType = getElementTypeDescription(element);
			const identifier = getElementIdentifier(element);

			return {
				heightPx: totalHeight,
				heightMm: pxToMm(totalHeight),
			};
		};

		// Function to measure table rows more accurately
		const measureTableRowHeight = (row) => {
			if (!row) return 0;

			measuringDiv.innerHTML = '';
			const rowClone = row.cloneNode(true);
			const tempTable = document.createElement('table');
			const tempTbody = document.createElement('tbody');

			tempTbody.appendChild(rowClone);
			tempTable.appendChild(tempTbody);
			measuringDiv.appendChild(tempTable);

			// Get computed style for table row
			const computedStyle = window.getComputedStyle(rowClone);
			const computedHeight = parseFloat(computedStyle.height) || 0;

			// Get direct measurements
			const rowOffsetHeight = rowClone.offsetHeight || 0;
			const rowClientHeight = rowClone.clientHeight || 0;
			const rowScrollHeight = rowClone.scrollHeight || 0;

			// Get cell measurements
			let maxCellHeight = 0;
			const cells = rowClone.cells || [];
			for (let i = 0; i < cells.length; i++) {
				const cell = cells[i];
				if (cell) {
					const cellStyle = window.getComputedStyle(cell);
					const cellComputedHeight = parseFloat(cellStyle.height) || 0;
					const cellPaddingTop = parseFloat(cellStyle.paddingTop) || 0;
					const cellPaddingBottom = parseFloat(cellStyle.paddingBottom) || 0;
					const cellBorderTop = parseFloat(cellStyle.borderTopWidth) || 0;
					const cellBorderBottom = parseFloat(cellStyle.borderBottomWidth) || 0;

					// Calculate total cell height based on box model
					let cellTotalHeight = 0;
					if (cellStyle.boxSizing === 'border-box') {
						cellTotalHeight = cellComputedHeight;
					} else {
						cellTotalHeight =
							cellComputedHeight + cellPaddingTop + cellPaddingBottom + cellBorderTop + cellBorderBottom;
					}

					maxCellHeight = Math.max(maxCellHeight, cellTotalHeight, cell.offsetHeight || 0);
				}
			}

			// Get padding, borders, margins
			const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
			const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
			const borderTopWidth = parseFloat(computedStyle.borderTopWidth) || 0;
			const borderBottomWidth = parseFloat(computedStyle.borderBottomWidth) || 0;
			const marginTop = parseFloat(computedStyle.marginTop) || 0;
			const marginBottom = parseFloat(computedStyle.marginBottom) || 0;

			// Calculate total height
			let rowHeight = 0;

			// Use the most reliable height:
			// 1. Max cell height if we have cells
			// 2. computed height if it looks valid
			// 3. offset height as direct measurement
			// 4. scroll height as fallback
			if (maxCellHeight > 0) {
				rowHeight = maxCellHeight;
			} else if (computedHeight > 0) {
				if (computedStyle.boxSizing === 'border-box') {
					rowHeight = computedHeight;
				} else {
					rowHeight = computedHeight + paddingTop + paddingBottom + borderTopWidth + borderBottomWidth;
				}
			} else if (rowOffsetHeight > 0) {
				rowHeight = rowOffsetHeight;
			} else if (rowScrollHeight > 0) {
				rowHeight = rowScrollHeight;
			} else {
				rowHeight = 30; // Fallback minimum
			}

			// Add margins if they're not already included
			rowHeight += marginTop + marginBottom;

			return rowHeight;
		};

		// Function to paginate content with proper table splitting
		const paginateContent = () => {
			const pages = [];
			let currentPageContent = '';
			let currentPageHeight = 0; // Parse the content
			const contentDiv = document.createElement('div');
			contentDiv.innerHTML = cleanHtmlContent(currentContent) || '';

			// Process each child element
			Array.from(contentDiv.childNodes)
				.filter(isValidNode)
				.forEach((node, index) => {
					const nodeType = getElementTypeDescription(node);

					// If this is a table, we need to check if we need to split it
					if (node.nodeName === 'DIV' && node.querySelector('table')) {
						const tableContainer = node;
						const table = tableContainer.querySelector('table');

						// Get table header and rows
						const thead = table.querySelector('thead');
						const tbody = table.querySelector('tbody');
						const tableHeader = thead ? thead.outerHTML : '';
						const rows = tbody ? Array.from(tbody.querySelectorAll('tr')).filter(isValidNode) : [];

						// Measure table header
						measuringDiv.innerHTML = `<table>${tableHeader}</table>`;
						const tableHeaderHeight = measuringDiv.offsetHeight;

						// Measure and log each row height
						const rowHeights = rows.map((row, rowIndex) => {
							const rowHeight = measureTableRowHeight(row);

							// Get computed style for the row
							const rowContent = row.textContent.trim().substring(0, 30);

							return rowHeight;
						});

						// Calculate total table height
						const totalTableHeight = tableHeaderHeight + rowHeights.reduce((sum, height) => sum + height, 0);

						// Clone table attributes for continuation tables
						const tableAttributes = Array.from(table.attributes)
							.map((attr) => `${attr.name}="${attr.value || ''}"`)
							.join(' ');

						// Start a new table for this page
						let currentTableContent = `<table ${tableAttributes}>${tableHeader}<tbody>`;
						let currentTableHeight = tableHeaderHeight;
						let rowsAdded = false;

						// Process each row to see if it fits
						for (let i = 0; i < rows.length; i++) {
							const row = rows[i];
							const rowHeight = rowHeights[i];

							// If adding this row would exceed the page height
							if (currentPageHeight + currentTableHeight + rowHeight > availableContentHeight) {
								// Finish current table if we've added rows
								if (rowsAdded) {
									currentTableContent += '</tbody></table>';
									currentPageContent += currentTableContent;

									// Add current page and start new one
									pages.push(currentPageContent);
									currentPageContent = '';
									currentPageHeight = 0;

									// Start a new table with header on the next page
									currentTableContent = `<table ${tableAttributes}>${tableHeader}<tbody>`;
									currentTableHeight = tableHeaderHeight;
									rowsAdded = false;
								} else if (i === 0) {
									// If the first row doesn't fit with the header but we have no content yet
									if (currentPageHeight === 0) {
										currentTableContent += row.outerHTML;
										currentTableHeight += rowHeight;
										rowsAdded = true;
									} else {
										// Start a new page for the table
										pages.push(currentPageContent);
										currentPageContent = '';
										currentPageHeight = 0;

										// Start a new table on the next page
										currentTableContent = `<table ${tableAttributes}>${tableHeader}<tbody>`;
										currentTableContent += row.outerHTML;
										currentTableHeight = tableHeaderHeight + rowHeight;
										rowsAdded = true;
									}
								}
							} else {
								// This row fits, add it to current table
								currentTableContent += row.outerHTML;
								currentTableHeight += rowHeight;
								rowsAdded = true;
							}
						}

						// Finish the last table
						if (rowsAdded) {
							currentTableContent += '</tbody></table>';

							// Wrap in the same structure as the original table container
							const divAttrs = Array.from(tableContainer.attributes)
								.filter((attr) => attr.name && attr.value !== undefined)
								.map((attr) => `${attr.name}="${attr.value || ''}"`)
								.join(' ');

							const wrappedTable = `<div ${divAttrs}>${currentTableContent}</div>`;
							currentPageContent += wrappedTable;
							currentPageHeight += currentTableHeight;
						}
					} else if (node.nodeType === 1) {
						// Element node
						// For non-table elements, check if they fit on current page
						// Measure using our enhanced function
						const { heightPx } = measureElementHeight(node, `Element ${index + 1}`);

						// If this element would overflow, start a new page
						if (currentPageHeight + heightPx > availableContentHeight && currentPageHeight > 0) {
							pages.push(currentPageContent);
							currentPageContent = node.outerHTML;
							currentPageHeight = heightPx;
						} else {
							// Element fits on current page
							currentPageContent += node.outerHTML;
							currentPageHeight += heightPx;
						}
					}
				});

			// Add the final page if there's content
			if (currentPageContent) {
				pages.push(cleanHtmlContent(currentPageContent));
			}

			// Clean up
			document.body.removeChild(measuringDiv);

			return pages;
		};

		// Get paginated content
		const contentPages = paginateContent();

		// Prepare custom font support for print window
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

		// Write the print document with proper CSS for printing
		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>${documentTitle}</title>
				<meta charset="utf-8">
				<style>
					${fontFaces}
					
					@page {
						size: A4;
						margin: 0; /* Remove default page margins, we'll handle with padding */
					}
					
					html, body {
						margin: 0;
						padding: 0;
						font-family: 'Gilroy', sans-serif !important;
						background-color: #f0f0f0;
					}
					
					a {
						text-decoration: none;
						color: black;
						font-weight: normal;
					}
					
					.print-container {
						width: 794px; /* Exact A4 width at 96 DPI (210mm = 8.27in = 794px) */
						margin: 20px auto;
						background-color: white;
						font-family: 'Gilroy', sans-serif !important;
					}
					
					.page {
						position: relative; 
						width: 100%;
						height: 1122px; /* Exact A4 height at 96 DPI (297mm = 11.69in = 1122px) */
						box-sizing: border-box;
						page-break-after: always;
						background-color: white;
						border-bottom: 1px dashed #ccc;
						font-family: 'Gilroy', sans-serif !important;
						padding: ${A4.topMargin * 3.78}px ${A4.sideMargin * 3.78}px ${A4.bottomMargin * 3.78}px ${A4.sideMargin * 3.78}px;
						overflow: hidden;
					}
					
					table {
						border-collapse: collapse;
						font-family: 'Gilroy', sans-serif !important;
						table-layout: fixed;
						width: 100%;
					}
					
					table tr {
						height: auto !important;
						page-break-inside: avoid;
					}
					
					table td, table th {
						padding: 4px 8px !important;
						border: 1px solid black;
						vertical-align: middle;
						height: auto !important;
						box-sizing: border-box !important;
					}
					
					table td p, table th p {
						margin: 0;
						padding: 0;
						font-family: 'Gilroy', sans-serif !important;
						font-size: 12px;
					}
					
					.header {
						position: absolute;
						top: ${A4.topMargin * 3.78}px;
						left: ${A4.sideMargin * 3.78}px;
						right: ${A4.sideMargin * 3.78}px;
						width: calc(100% - ${2 * A4.sideMargin * 3.78}px);
						box-sizing: border-box;
						padding-bottom: ${A4.headerSpacing * 3.78}px !important;
						font-family: 'Gilroy', sans-serif !important;
						overflow: visible !important;
					}
					
					.content {
						position: absolute;
						top: calc(${A4.topMargin * 3.78}px + ${headerHeight}px + ${A4.headerSpacing * 3.78}px);
						left: ${A4.sideMargin * 3.78}px;
						right: ${A4.sideMargin * 3.78}px;
						width: calc(100% - ${2 * A4.sideMargin * 3.78}px);
						box-sizing: border-box;
						font-family: 'Gilroy', sans-serif !important;
					}
					
					.footer {
						position: absolute;
						bottom: ${A4.bottomMargin * 3.78}px;
						left: ${A4.sideMargin * 3.78}px;
						right: ${A4.sideMargin * 3.78}px;
						width: calc(100% - ${2 * A4.sideMargin * 3.78}px);
						box-sizing: border-box;
						padding-top: 0 !important;
						font-family: 'Gilroy', sans-serif !important;
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
						
						a {
							text-decoration: none !important;
							color: black !important;
							font-weight: normal !important;
						}
						
						.print-container {
							width: 100% !important;
							margin: 0 auto;
							box-shadow: none;
						}
						
						.page {
							width: 100% !important;
							height: 100vh !important;
							margin: 0;
							border-bottom: none;
							padding: ${A4.topMargin * 3.78}px ${A4.sideMargin * 3.78}px ${A4.bottomMargin * 3.78}px ${A4.sideMargin * 3.78}px;
						}
						
						.page:not(:first-child) {
							page-break-before: always;
						}
						
						table { page-break-inside: auto; }
						tr { page-break-inside: avoid; }
					}
				</style>
			</head>
			<body>
				<div class="print-container"></div>
				<script>
					document.fonts.ready.then(function() {
						// Clean any undefined text that might have slipped through
						document.querySelectorAll('*').forEach(function(el) {
							if (el.textContent === 'undefined' || el.innerHTML === 'undefined') {
								el.innerHTML = '';
							}
						});
						
						setTimeout(function() {
							window.print();
						}, 1000);
					});

					// Add event listener to close window after printing
					window.addEventListener('afterprint', function() {
						setTimeout(function() {
							window.close();
						}, 500);
					});
				</script>
			</body>
			</html>
		`);

		// Build the HTML for all pages
		const printContainer = printWindow.document.querySelector('.print-container');

		// Generate pages with content
		contentPages.forEach((pageContent, index) => {
			const pageNumber = (index + 1).toString().padStart(2, '0');
			const totalPages = contentPages.length.toString().padStart(2, '0');

			// Replace page numbers in footer and clean the footer content
			const pageFooter = cleanHtmlContent(currentFooter || '')
				.replace(`>00</span>`, `>${pageNumber}</span>`)
				.replace(`>00</span>`, `>${totalPages}</span>`);

			const page = document.createElement('div');
			page.className = 'page';

			page.innerHTML = `
				<div class="header">${cleanHtmlContent(currentHeader || '')}</div>
				<div class="content">${cleanHtmlContent(pageContent || '')}</div>
				<div class="footer">${pageFooter}</div>
			`;

			printContainer.appendChild(page);
		});

		// Focus the window to bring it to the front
		printWindow.focus();
	};

	return (
		<div className="p-4 bg-gray-100 min-h-screen relative mt-1">
			<div className="flex flex-col w-fit mb-2">
				<h2 className="text-4xl font-medium text-primary text-start">Phiếu kết quả</h2>

				{/* Add the sample selection dropdown */}
				{relatedSamples.length > 0 && (
					<div className="mt-2 flex items-center">
						<span className="text-gray-600 mr-2">Mẫu thử:</span>
						<select
							className="px-3 py-1 focus:outline-none border-2 border-gray-300 rounded-md bg-white"
							value={sample_uid}
							onChange={handleSampleChange}
						>
							{relatedSamples.map((item) => (
								<option key={item.sample_uid} value={item.sample_uid}>
									{item.sample_uid}
								</option>
							))}
						</select>
					</div>
				)}
			</div>
			<div className="mb-4 flex flex-col gap-4 items-end min-w-[800px]">
				<div className="flex justify-between items-center w-full">
					<div>
						{loading && <span className="px-4 py-2 bg-yellow-500 text-white rounded">Đang tải...</span>}
						{error && <span className="px-4 py-2 bg-red-500 text-white rounded">Lỗi: {error}</span>}

						<button
							onClick={handlePrint}
							className="px-4 py-1 focus:outline-none border-2 border-gray-500 rounded-lg ml-2 active:bg-blue-700"
						>
							PRINT / PDF
						</button>
					</div>
				</div>
			</div>

			{/* Note bubbles for receipt note and additional request */}
			{receiptNote && (
				<div className="fixed right-4 text-start top-20 w-56 max-h-60 overflow-y-auto overflow-x-hidden bg-blue-50 rounded-lg border border-blue-200 shadow-md p-3 z-10">
					<div className="font-bold text-gray-700 text-sm mb-2">Ghi chú / Note:</div>
					<div className="text-gray-600 text-sm whitespace-pre-wrap">{receiptNote}</div>

					<div className="absolute -right-2 top-5 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-blue-50"></div>
				</div>
			)}

			{additionalRequest && (
				<div className="fixed right-4 text-start top-96 w-56 max-h-60 overflow-y-auto bg-green-50 rounded-lg border border-green-200 shadow-md p-3 z-10">
					<div className="font-bold text-blue-700 text-sm mb-2">Yêu cầu / Requirements:</div>
					<div className="text-blue-600 text-sm whitespace-pre-wrap">{additionalRequest}</div>

					<div className="absolute -left-2 top-5 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-green-50"></div>
				</div>
			)}

			<div className="flex flex-col gap-4 overflow-x-auto p-4 bg-white shadow-lg rounded-lg">
				<div className="flex justify-center">
					<div
						className="bg-white flex flex-col"
						style={{
							fontFamily: 'Gilroy, sans-serif',
							width: '718px',
							margin: '0 auto',
						}}
					>
						<div
							id="header-edit"
							className="header-editable editable text-center font-bold text-lg border-b px-0 pt-8 pb-4"
							style={{ fontFamily: 'Gilroy, sans-serif', width: '100%' }}
							dangerouslySetInnerHTML={{
								__html: header,
							}}
						/>
						<div
							id="content-edit"
							ref={contentRef}
							className="content-editable editable border-0 px-0 py-2 text-base my-4"
							style={{ fontFamily: 'Gilroy, sans-serif', width: '100%' }}
							dangerouslySetInnerHTML={{ __html: content }}
						/>
						<div
							id="footer-edit"
							className="footer-editable editable px-0 pb-8 pt-4"
							style={{ fontFamily: 'Gilroy, sans-serif', width: '100%' }}
							dangerouslySetInnerHTML={{ __html: footer }}
						/>
					</div>
				</div>
			</div>

			<style jsx>{`
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

				.read-only {
					cursor: default !important;
				}

				@media print {
					body * {
						visibility: hidden;
						font-family: 'Gilroy', sans-serif !important;
					}
					.print-content,
					.print-content * {
						visibility: visible;
						font-family: 'Gilroy', sans-serif !important;
					}
					.print-content {
						position: absolute;
						left: 0;
						top: 0;
						width: 100%;
					}
					.page-break {
						page-break-after: always;
					}
				}

				.colored-toast.swal2-icon-success {
					background-color: #2bae66 !important;
				}
				.colored-toast.swal2-icon-error {
					background-color: #f27474 !important;
				}
				.colored-toast.swal2-icon-warning {
					background-color: #f8bb86 !important;
				}
				.colored-toast.swal2-icon-info {
					background-color: #1976d2 !important;
				}
				.colored-toast.swal2-icon-question {
					background-color: #87adbd !important;
				}
				.colored-toast .swal2-title {
					color: white;
					font-size: 0.85rem !important;
				}
				.colored-toast .swal2-close {
					color: white;
				}
				.colored-toast .swal2-html-container {
					color: white;
				}

				/* Make bubbles responsive in small screens */
				@media (max-width: 1200px) {
					.fixed.left-4,
					.fixed.right-4 {
						position: static !important;
						width: 100% !important;
						max-width: none !important;
						margin-bottom: 10px !important;
					}

					.fixed.left-4 > div:last-child,
					.fixed.right-4 > div:last-child {
						display: none !important;
					}
				}
			`}</style>
		</div>
	);
}
