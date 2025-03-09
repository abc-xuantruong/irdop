import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../contexts/helperFunctionCallAPI';
import { useSearchParams } from 'react-router-dom';

export default function MultiPageEditor() {
	const [searchParams] = useSearchParams();
	const ppt_uid = 'PPT-0001';
	const sample_uid = searchParams.get('sample_uid');
	const [sampleData, setSampleData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Add new toggle states for VLAS, COMMENT, and REFERENCE
	const [showVlas, setShowVlas] = useState(false);
	const [showComment, setShowComment] = useState(false);
	const [showReference, setShowReference] = useState(false);

	// State for section HTML content
	const [headerHTML, setHeaderHTML] = useState('');
	const [footerHTML, setFooterHTML] = useState('');
	const [customerSectionHTML, setCustomerSectionHTML] = useState('');
	const [sampleInfoSectionHTML, setSampleInfoSectionHTML] = useState('');
	const [analysisSectionHTML, setAnalysisSectionHTML] = useState('');
	const [commentSectionHTML, setCommentSectionHTML] = useState('');
	const [notesSectionHTML, setNotesSectionHTML] = useState('');
	const [signatureSectionHTML, setSignatureSectionHTML] = useState('');
	const [referenceValues, setReferenceValues] = useState([]);

	// Add API fetch for sample data and client data
	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				// Fetch sample data
				const sampleResponse = await fetch(`https://black.irdop.org/to82oe92i/db/get/sample_full/${sample_uid}`);

				if (!sampleResponse.ok) {
					throw new Error(`Sample API request failed with status ${sampleResponse.status}`);
				}

				const sampleResult = await sampleResponse.json();
				setSampleData(sampleResult);
				console.log('Sample data fetched:', sampleResult);

				// Get receipt_id from sample data to fetch client info
				if (sampleResult && sampleResult.receipt_id) {
					try {
						const clientResponse = await fetch(
							`https://black.irdop.org/hli1o7az/db/receipt/get/client/${sampleResult.receipt_id}`,
						);

						if (!clientResponse.ok) {
							throw new Error(`Client API request failed with status ${clientResponse.status}`);
						}

						sampleResult.client = await clientResponse.json();
					} catch (clientErr) {
						console.error('Error fetching client data:', clientErr);
						// Continue with sample data even if client data fails
					}
				}

				// Update the content with the retrieved data
				updateContentWithData(sampleResult);
			} catch (err) {
				console.error('Error fetching data:', err);
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [sample_uid]);

	// Function to update content with sample and client data
	const updateContentWithData = (data) => {
		if (!data) return;

		// Generate the customer section based on client API data
		const updatedCustomerSection = generateCustomerSection(data.client);
		setCustomerSectionHTML(updatedCustomerSection);

		// Generate the sample information section based on API data
		const updatedSampleInfo = generateSampleInfoSection(data);
		setSampleInfoSectionHTML(updatedSampleInfo);

		// Generate the analysis section based on API data
		const updatedAnalysisSection = generateAnalysisSection(data);
		setAnalysisSectionHTML(updatedAnalysisSection);

		// Generate reference values
		if (data.analysis && Array.isArray(data.analysis)) {
			const refs = data.analysis.map((item, index) => `TCCS-${(index + 1).toString().padStart(2, '0')}`);
			setReferenceValues(refs);
		}

		// Generate comment section if needed
		const updatedCommentSection = showComment ? generateCommentSection() : '';
		setCommentSectionHTML(updatedCommentSection);
		const commentSpacing = showComment ? spacing : '';

		// Set notes and signature sections
		setNotesSectionHTML(notesSection);
		setSignatureSectionHTML(signatureSection);

		// Default layout: all sections in sequential order
		const updatedContent = `${updatedCustomerSection}${spacing}${updatedSampleInfo}${spacing}${updatedAnalysisSection}${spacing}${updatedCommentSection}${commentSpacing}${notesSection}${spacing}${signatureSection}`;

		// Update the editor content
		setContent(updatedContent);
		if (editorRef.current) {
			editorRef.current.setContent(updatedContent);
		}

		// Store sections separately for layout adjustments during printing
		setSectionContent({
			customerSection: updatedCustomerSection,
			sampleInfoSection: updatedSampleInfo,
			analysisSection: updatedAnalysisSection,
			commentSection: updatedCommentSection,
			notesSection: notesSection,
			signatureSection: signatureSection,
		});
	};

	// Function to generate customer section from API data
	const generateCustomerSection = (clientData) => {
		// Default values in case client data is not available
		const clientUid = clientData?.client_uid || '';
		const clientName = clientData?.client_name || '';
		const clientAddress = clientData?.client_address || '';

		return `
<div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
    <div style="padding: 3pt 8pt 3pt 8pt; flex-grow: 1; position: relative;">
	    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
			<p style="font-size: 11px; line-height: 1.4; margin:0; text-align: left;">Nơi / người gửi mẫu / Customer information</p>
			<p style="font-size: 11px; line-height: 1.4; margin:0; text-align: right;">${clientUid}</p>
        </div>		
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<p style="font-weight: bold; margin: 0; text-align: left; font-size: 16px; line-height: 1.2;">${clientName}</p>
			<p style="margin: 0; font-size: 12px; text-align: left; line-height: 1.2;">${clientAddress}</p>
		</div>
	</div>
</div>`;
	};

	// Function to generate sample information section from API data
	const generateSampleInfoSection = (data) => {
		// Get the sample_uid from data
		const sampleId = data.sample_uid || sample_uid;

		// Get the sample_information array from data
		const sampleInfo = data.sample_information || [];

		// Map each sample information item to a row in the sample info section
		const infoRows = sampleInfo
			.map((item) => {
				const fieldName = item.fname || '';
				const fieldValue = item.fvalue || '--';

				// Extract field label and English translation (if present)
				const parts = fieldName.split('/');
				const mainLabel = parts[0].trim();
				const engLabel = parts.length > 1 ? `/ ${parts[1].trim()}` : '';

				return `
			<div style="display: flex;">
				<div style="width: 30%; font-size: 12px; line-height: 1.4; text-align: left; padding-right: 10px;">
					<strong>${mainLabel}</strong> ${engLabel}
				</div>
				<div style="width: 70%; font-size: 12px; line-height: 1.4; text-align: left; padding-left: 10px;">
					<p style="margin: 0; ${mainLabel.toLowerCase().includes('tên mẫu') ? 'font-weight: bold;' : ''}">${fieldValue}</p>
				</div>
			</div>`;
			})
			.join('');

		return `
<div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
    <div style="padding: 8pt; padding-top: 3pt; flex-grow: 1; position: relative;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <p style="font-size: 11px; line-height: 1.4; margin: 0; text-align: left;">
                Thông tin mẫu thử / Sample info:
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
		// Get the analysis array from data
		const analysisItems = data.analysis || [];

		// Generate reference values array that matches the length of analysisItems
		const referenceValues = analysisItems.map((item, index) => {
			// You could fetch or derive these values from data if available
			// For now, using a placeholder with item index
			return `TCCS-${(index + 1).toString().padStart(2, '0')}`;
		});

		// Store reference values in state
		setReferenceValues(referenceValues);

		// Add extra table header for reference if needed
		const referenceHeader = showReference
			? `
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: bold; width: 15%; text-align:left; font-size:12px;">
					Tham chiếu <br> <span style="font-size: 12px; color: gray;">/ Standard Ref</span>
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
					const protocol = item.protocol_code || '--';

					// Get reference value from the array for this row
					const referenceValue = referenceValues[index] || '--';

					// Add reference column cell if needed
					const referenceCell = showReference
						? `
					<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">${referenceValue}</td>`
						: '';

					return `
				<tr>
					<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">${index + 1}.</td>
					<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">${parameterName}</td>
					<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">${result}</td>
					<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">${unit}</td>
					<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">${protocol}</td>${referenceCell}
				</tr>`;
				})
				.join('');
		} else {
			// If no analysis items, include a placeholder row
			const referenceCell = showReference
				? `
				<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">--</td>`
				: '';

			analysisRows = `
			<tr>
				<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">1</td>
				<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">--</td>
				<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">--</td>
				<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">--</td>
				<td style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">--</td>${referenceCell}
			</tr>`;
		}

		return `
<div style="margin:0; padding:0;">
    <table style="width: 100%; border-collapse: collapse; text-align: left; margin:0; padding:0; font-size:12px; line-height:1.4;">
        <thead>
            <tr>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: bold; width: 6%; text-align:left; font-size:12px;">
                    STT <br> <span style="font-size: 12px; color: gray;">/ No.</span>
                </th>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: bold; width: ${
									showReference ? '30%' : '37%'
								}; text-align:left; font-size:12px;">
                    Phép thử <br> <span style="font-size: 12px; color: gray;">/ Tests</span>
                </th>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: bold; width: 15%; text-align:left; font-size:12px;">
                    Kết quả <br> <span style="font-size: 12px; color: gray;">/ Test result</span>
                </th>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: bold; width: 15%; text-align:left; font-size:12px;">
                    Đơn vị <br> <span style="font-size: 12px; color: gray;">/ Unit</span>
                </th>
                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: bold; width: ${
									showReference ? '19%' : '27%'
								}; text-align:left; font-size:12px;">
                    Phương pháp <br> <span style="font-size: 12px; color: gray;">/ Protocol</span>
                </th>${referenceHeader}
            </tr>
        </thead>
        <tbody>
            ${analysisRows}
        </tbody>
    </table>
</div>`;
	};

	// Add new function to generate comment section
	const generateCommentSection = () => {
		return `
<div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
    <div style="padding: 3pt 8pt 3pt 8pt; flex-grow: 1; position: relative;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
			<p style="font-weight: bold; margin:0; font-size:12px; line-height:1.2;">
				Nhận xét / Comment:
			</p>
		</div>
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<p class="comment-content print-text-paragraph" 
			   style="font-size:12px; margin:0; padding:0; line-height: 1.4; text-align:left;">
				--
			</p>
		</div>
	</div>
</div>`;
	};

	// Add notes and signature sections as constants with standardized styling
	const notesSection = `
<div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
    <div style="padding: 3pt 8pt 3pt 8pt; flex-grow: 1; position: relative;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
			<p class="note test_note_title" 
			   style="font-weight: bold; margin:0; font-size:12px; line-height:1.2;">
				Ghi chú / Note:
			</p>
		</div>
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<p class="note test_note_detail print-text-paragraph" 
			   style="font-size:12px; margin:0; padding:0; line-height: 1.4; text-align:left;">
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

	const signatureSection = `
	<div style="padding-top: 0; display: flex; ; margin:0;">
		<div style="padding: 3pt 8pt 3pt 8pt; flex-grow: 1; position: relative; display:flex; min-height:2.7cm;">
			<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
				<strong contenteditable="true" 
						class="signature signer_second_title print-text-paragraph"
						style="font-size:12px; line-height:1.4; margin:0;">
					PHÒNG PHÂN TÍCH KIỂM NGHIỆM/<br>KIỂM SOÁT CHẤT LƯỢNG / Laboratory Manager
				</strong>
				<p contenteditable="true" 
				   class="signature signer_second_name print-text-paragraph" 
				   style="font-size:12px; margin:0; line-height:1.4;">
					--
				</p>
			</div>
			<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
				<strong contenteditable="true" 
						class="signature signer_fist_title print-text-paragraph"
						style="font-size:12px; line-height:1.4; margin:0;">
					KT.VIỆN TRƯỞNG<br>PHÓ VIỆN TRƯỞNG / Vice President
				</strong>
				<p contenteditable="true" 
				   class="signature signer_first_name print-text-paragraph" 
				   style="font-size:12px; margin:0; line-height:1.4;">
					--
				</p>
			</div>
		</div>
	</div>`;

	const spacing = `<div style="height: 4mm; margin:0; padding:0;"></div>`;

	// Notification for two-page layout
	const nextPageNotification = `
<div style="padding: 10px 0; text-align: center; font-size: 12px; font-style: italic; color: #666;">
    - Xem kết quả ở trang tiếp theo / See the results on the following page -
</div>`;

	// Update initial content with empty placeholders and comment section if needed
	const initialCommentSection = showComment ? generateCommentSection() : '';
	const initialCommentSpacing = showComment ? spacing : '';

	const initialContent = `${generateCustomerSection()}${spacing}${spacing}${spacing}${initialCommentSection}${initialCommentSpacing}${notesSection}${spacing}${signatureSection}`;

	const [content, setContent] = useState(initialContent);
	const [header, setHeader] = useState(`
<div class=" content_page_header_box" id="thead" style="position:relative; height: fit-content">
    <div class=" " style="position:relative; display:flex;">
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
         style="padding-top:10mm; position:relative;">
        <div style="position:relative; text-align:left;">
            <p contenteditable="true" class=" content-header-title" 
               style="font-weight:700; font-size:24pt; color:#0058A3;">
                PHIẾU KẾT QUẢ THỬ NGHIỆM
            </p>
            <p class=" content-header-title_eng" 
               style="font-weight:700; font-size:21pt; color:#0058A3;">
                / Certificate of Analysis
            </p>
            <div class=" display-flex" 
                 style="display: flex; align-items: center; gap: 2mm; font-size:12px; font-weight:400; margin-top: 0px;">
                <span class=" std_ref-title">Ref:</span>
                <p contenteditable="true" 
                   class="  ref_code" 
                   style="min-width:5pt; margin: 0;">
                    ${ppt_uid || '-- NHÁP / DRAFT --'}
                </p>
                <span class="  published_date" 
                      style="min-width:5pt; margin: 0;">
                    4-3-2025
                </span>
            </div>
        </div>
        <div class=" vlas_icon" 
             style="position:absolute; right:1cm; top:0.5cm; ${showVlas ? '' : 'display:none;'}">
            <img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/VILAS%20997.WIu1HeH5wkOQ5k1olzA3Wg.png" 
                 loading="lazy" 
                 class="" 
                 style="width:5.2cm;">
        </div>
    </div>
</div>
	`);
	const [footer, setFooter] = useState(`
<div style="border-top:1px solid #4CB748; height:50px; display:flex; padding-top:0pt; align-items: center;">
    <div style="flex-grow:1; text-align: left;">
        <p style="color:#0058A3; margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">
            VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN
        </p>
        <p style="margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">
            IRDOP.ORG
        </p>
        <p style="opacity:0.5; margin: 0; padding: 0; line-height: 1; font-size: 11px; height: 14px; display: flex; align-items: center;">
            Form: BM06-QT010-KN / Version: 04 / Effective date: 01/08/2023
        </p>
    </div>
    <div style="font-size: 11px; display: flex; flex-direction: column; justify-content: flex-end; height: 100%;">
        <div style="display: flex; align-items: center; height: 14px;">
            <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1; margin-right:2px;">Trang/Pages:</span>
            <div style="display: flex; align-items: center; height: 14px;">
                <span class="page-number" style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span>
                <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">/</span>
                <span class="page-total" style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span>
            </div>
        </div>
    </div>
</div>

	`);

	// Store section content separately for layout adjustments
	const [sectionContent, setSectionContent] = useState({
		customerSection: generateCustomerSection(),
		sampleInfoSection: '',
		analysisSection: '',
		commentSection: showComment ? generateCommentSection() : '',
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
				src: url('/fonts/Gilroy-Regular.woff2') format('woff2'),
					 url('/fonts/Gilroy-Regular.woff') format('woff');
				font-weight: 400;
				font-style: normal;
				font-display: swap;
			}
			
			@font-face {
				font-family: 'Gilroy';
				src: url('/fonts/Gilroy-Medium.woff2') format('woff2'),
					 url('/fonts/Gilroy-Medium.woff') format('woff');
				font-weight: 500;
				font-style: normal;
				font-display: swap;
			}
			
			@font-face {
				font-family: 'Gilroy';
				src: url('/fonts/Gilroy-Bold.woff2') format('woff2'),
					 url('/fonts/Gilroy-Bold.woff') format('woff');
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
			'/fonts/Gilroy-Regular.woff2',
			'/fonts/Gilroy-Regular.woff',
			'/fonts/Gilroy-Medium.woff2',
			'/fonts/Gilroy-Medium.woff',
			'/fonts/Gilroy-Bold.woff2',
			'/fonts/Gilroy-Bold.woff',
		];

		// Preload fonts
		const fontPromises = fontUrls.map((url) => {
			return new Promise((resolve, reject) => {
				const link = document.createElement('link');
				link.rel = 'preload';
				link.href = url;
				link.as = 'font';
				link.type = url.includes('woff2') ? 'font/woff2' : 'font/woff';
				link.crossOrigin = 'anonymous';
				link.onload = resolve;
				link.onerror = reject;
				document.head.appendChild(link);
			});
		});

		// Wait for fonts to load
		Promise.all(fontPromises)
			.then(() => console.log('All Gilroy fonts loaded successfully'))
			.catch((err) => console.error('Error loading Gilroy fonts:', err));

		return () => {
			document.head.removeChild(fontStyle);
		};
	}, []);

	// Effect to update content when toggle states change
	useEffect(() => {
		if (sampleData) {
			updateContentWithData(sampleData);
		}

		// Update header when VLAS state changes
		const newHeader = header.replace(
			/style="position:absolute; right:1cm; top:0.5cm;[^"]*"/,
			`style="position:absolute; right:1cm; top:0.5cm; ${showVlas ? '' : 'display:none;'}"`,
		);

		setHeader(newHeader);
	}, [showVlas, showComment, showReference, sampleData]);

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
			extended_valid_elements: 'span[style]',
			charmap: [[8727, 'multiplication sign (∗)']],
			content_style: `
				@font-face {
					font-family: 'Gilroy';
					src: url('/fonts/Gilroy-Regular.woff2') format('woff2'),
						 url('/fonts/Gilroy-Regular.woff') format('woff');
					font-weight: 400;
					font-style: normal;
					font-display: swap;
				}
				
				@font-face {
					font-family: 'Gilroy';
					src: url('/fonts/Gilroy-Medium.woff2') format('woff2'),
						 url('/fonts/Gilroy-Medium.woff') format('woff');
					font-weight: 500;
					font-style: normal;
					font-display: swap;
				}
				
				@font-face {
					font-family: 'Gilroy';
					src: url('/fonts/Gilroy-Bold.woff2') format('woff2'),
						 url('/fonts/Gilroy-Bold.woff') format('woff');
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

	const handlePrint = () => {
		let currentContent = content;
		let currentHeader = header;
		let currentFooter = footer;

		// Get content from editors
		if (contentRef.current && window.tinymce) {
			const contentEditor = window.tinymce.get(contentRef.current?.id);
			if (contentEditor) {
				currentContent = contentEditor.getContent();
			}

			const headerElements = document.getElementsByClassName('header-editable');
			if (headerElements.length > 0 && headerElements[0].id) {
				const headerEditor = window.tinymce.get(headerElements[0].id);
				if (headerEditor) {
					let headerContent = headerEditor.getContent();
					const refCodeMatch = headerContent.match(/<p[^>]*class="[^"]*ref_code[^"]*"[^>]*>(.*?)<\/p>/i);
					if (refCodeMatch) {
						headerContent = headerContent.replace(
							refCodeMatch[0],
							refCodeMatch[0].replace(refCodeMatch[1], ppt_uid || '-- NHÁP / DRAFT --'),
						);
					}
					currentHeader = headerContent;
				}
			}

			const footerElements = document.getElementsByClassName('footer-editable');
			if (footerElements.length > 0 && footerElements[0].id) {
				const footerEditor = window.tinymce.get(footerElements[0].id);
				if (footerEditor) currentFooter = footerEditor.getContent();
			}
		}

		// Replace PPT_UID in header
		currentHeader = currentHeader.replace(/-- NHÁP \/ DRAFT --/g, ppt_uid || '-- NHÁP / DRAFT --');

		// Create print window
		const printWindow = window.open('', '_blank', 'width=1000,height=1000,toolbar=no,scrollbars=yes');
		if (!printWindow) {
			alert('Please allow pop-ups to print the document.');
			return;
		}

		// A4 dimensions in mm with spacing adjustments
		const A4 = {
			width: 210,
			height: 297,
			topMargin: 15, // 1.5cm
			bottomMargin: 5, // 0.5cm
			sideMargin: 10, // 1cm
			headerSpacing: 0, // Removed spacing between header and content
			footerSpacing: 0, // Removed spacing between content and footer
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

		console.log('📐 Document dimensions:');
		console.log('- Screen DPI:', dpi);
		console.log('- A4 paper:', `${A4.width}mm × ${A4.height}mm (${mmToPx(A4.width)}px × ${mmToPx(A4.height)}px)`);
		console.log(
			'- Margins:',
			`top: ${A4.topMargin}mm (${mmToPx(A4.topMargin)}px), bottom: ${A4.bottomMargin}mm (${mmToPx(
				A4.bottomMargin,
			)}px), sides: ${A4.sideMargin}mm (${mmToPx(A4.sideMargin)}px)`,
		);

		// Extract current sections from TinyMCE editor content
		const extractCurrentSections = () => {
			// Create a temporary container to parse the current content
			const tempContainer = document.createElement('div');
			tempContainer.innerHTML = currentContent;

			// We'll extract sections based on known patterns and structures
			const extractedSections = {
				customerSection: '',
				sampleInfoSection: '',
				analysisSection: '',
				notesSection: '',
				signatureSection: '',
			};

			// Helper function to find a section by its distinctive features
			const findSection = (container, criteria) => {
				const elements = Array.from(container.children);
				for (let i = 0; i < elements.length; i++) {
					const el = elements[i];

					// Skip spacing divs
					if (el.style && el.style.height === '4mm' && !el.textContent.trim()) {
						continue;
					}

					// Check if this element matches our criteria
					if (criteria(el)) {
						return el.outerHTML;
					}
				}
				return '';
			};

			// Find customer section (first bordered div with "Customer information" text)
			extractedSections.customerSection =
				findSection(
					tempContainer,
					(el) =>
						el.querySelector &&
						el.querySelector('div[style*="border"]') &&
						el.innerHTML.includes('Customer information'),
				) || sectionContent.customerSection;

			// Find sample info section (bordered div with "Sample info" text)
			extractedSections.sampleInfoSection =
				findSection(
					tempContainer,
					(el) => el.querySelector && el.querySelector('div[style*="border"]') && el.innerHTML.includes('Sample info'),
				) || sectionContent.sampleInfoSection;

			// Find analysis section (contains a table with "Tests" header)
			extractedSections.analysisSection =
				findSection(
					tempContainer,
					(el) => el.querySelector && el.querySelector('table') && el.innerHTML.includes('Tests'),
				) || sectionContent.analysisSection;

			// Find notes section (div with "Note:" text)
			extractedSections.notesSection =
				findSection(tempContainer, (el) => el.querySelector && el.innerHTML.includes('Ghi chú / Note:')) ||
				sectionContent.notesSection;

			// Find signature section (div with "Laboratory Manager" text)
			extractedSections.signatureSection =
				findSection(tempContainer, (el) => el.querySelector && el.innerHTML.includes('Laboratory Manager')) ||
				sectionContent.signatureSection;

			// If we couldn't find any sections, fall back to the stored ones
			if (!Object.values(extractedSections).some((s) => s)) {
				console.log('Could not extract sections from editor content, using stored sections');
				return sectionContent;
			}

			return extractedSections;
		};

		// Get sections from the current content in TinyMCE
		const sections = extractCurrentSections();

		// Pagination function with detailed logging and layout adjustment
		const paginateContent = () => {
			// Create temporary measuring elements
			const measureArea = document.createElement('div');
			measureArea.style.position = 'absolute';
			measureArea.style.visibility = 'hidden';
			measureArea.style.width = `${A4.width - 2 * A4.sideMargin}mm`;
			measureArea.style.left = '-9999px';
			document.body.appendChild(measureArea);

			// Measure header height
			measureArea.innerHTML = currentHeader;
			const headerHeightPx = measureArea.offsetHeight;
			const headerHeightMm = pxToMm(headerHeightPx);

			// Measure footer height
			measureArea.innerHTML = currentFooter;
			const footerHeightPx = measureArea.offsetHeight;
			const footerHeightMm = pxToMm(footerHeightPx);

			// Calculate available content height per page, accounting for spacing
			const availableContentHeightMm =
				A4.height -
				A4.topMargin -
				A4.bottomMargin -
				headerHeightMm -
				footerHeightMm -
				A4.headerSpacing -
				A4.footerSpacing;

			const availableContentHeightPx = mmToPx(availableContentHeightMm);

			// First, let's measure all sections individually
			const measureSection = (sectionHtml) => {
				measureArea.innerHTML = sectionHtml;
				return measureArea.offsetHeight;
			};

			const sectionHeights = {
				customerSection: measureSection(sections.customerSection),
				sampleInfoSection: measureSection(sections.sampleInfoSection),
				analysisSection: measureSection(sections.analysisSection),
				notesSection: measureSection(sections.notesSection),
				signatureSection: measureSection(sections.signatureSection),
				spacing: measureSection(spacing),
				nextPageNotification: measureSection(nextPageNotification),
			};

			console.log('📏 Section heights (px):', sectionHeights);

			// Calculate total content height including spacing
			const totalContentHeight =
				sectionHeights.customerSection +
				sectionHeights.spacing +
				sectionHeights.sampleInfoSection +
				sectionHeights.spacing +
				sectionHeights.analysisSection +
				sectionHeights.spacing +
				sectionHeights.notesSection +
				sectionHeights.spacing +
				sectionHeights.signatureSection +
				showComment
					? sectionHeights.spacing + sectionHeights.commentSection
					: 0;

			// Calculate height of only analysis + signature sections (for page 2 in special layout)
			const analysisAndSignatureHeight =
				sectionHeights.analysisSection +
				sectionHeights.spacing +
				sectionHeights.signatureSection +
				(showComment ? sectionHeights.spacing + sectionHeights.commentSection : 0);

			// Calculate height of page 1 in special layout
			const page1SpecialLayoutHeight =
				sectionHeights.customerSection +
				sectionHeights.spacing +
				sectionHeights.sampleInfoSection +
				sectionHeights.spacing +
				sectionHeights.nextPageNotification +
				sectionHeights.spacing +
				sectionHeights.notesSection;

			console.log(`📊 Layout analysis: 
				- Total content height: ${totalContentHeight}px
				- Available height per page: ${availableContentHeightPx}px
				- Analysis + Signature section height: ${analysisAndSignatureHeight}px
				- Special layout page 1 height: ${page1SpecialLayoutHeight}px
			`);

			// Determine if content should use special 2-page layout
			// Criteria:
			// 1. Total content exceeds 1 page
			// 2. Analysis + Signature sections fit within 1 page
			// 3. Page 1 of special layout fits within 1 page
			const totalExceedsOnePage = totalContentHeight > availableContentHeightPx;
			const analysisSignatureFitsOnePage = analysisAndSignatureHeight <= availableContentHeightPx;
			const page1FitsOnePage = page1SpecialLayoutHeight <= availableContentHeightPx;

			const useSpecialLayout = totalExceedsOnePage && analysisSignatureFitsOnePage && page1FitsOnePage;

			console.log(`🧮 Layout decision criteria:
				- Total content exceeds one page: ${totalExceedsOnePage}
				- Analysis + Signature fits on one page: ${analysisSignatureFitsOnePage}
				- Page 1 content fits on one page: ${page1FitsOnePage}
				- FINAL DECISION: Using special 2-page layout: ${useSpecialLayout}
			`);

			// Decide which layout to use based on our analysis
			let contentPages = [];

			if (useSpecialLayout) {
				// Use the custom 2-page layout
				console.log('📄 Using custom 2-page layout with "see next page" notification');

				// Page 1: customerSection + sampleInfoSection + notification + notesSection

				const page1Content = [
					sections.customerSection,
					spacing,
					sections.sampleInfoSection,
					spacing,
					nextPageNotification,
					spacing,
					sections.notesSection,
				].join('');

				// Page 2: analysisSection + signatureSection
				const page2Content = showComment
					? [sections.analysisSection, spacing, sections.signatureSection].join('')
					: [sections.analysisSection, spacing, sections.commentSection, spacing, sections.signatureSection].join('');

				contentPages = [page1Content, page2Content];
			} else {
				// Use standard sequential layout
				console.log('📄 Using standard sequential layout');

				// Create standard content with sequential sections
				const standardContent = showComment
					? [
							sections.customerSection,
							spacing,
							sections.sampleInfoSection,
							spacing,
							sections.analysisSection,
							spacing,
							sections.notesSection,
							spacing,
							sections.signatureSection,
					  ].join('')
					: [
							sections.customerSection,
							spacing,
							sections.sampleInfoSection,
							spacing,
							sections.analysisSection,
							spacing,
							sections.commentSection,
							spacing,
							sections.notesSection,
							spacing,
							sections.signatureSection,
					  ].join('');

				// Parse content into elements for standard pagination
				measureArea.innerHTML = standardContent;
				const contentElements = Array.from(measureArea.childNodes);

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
						contentPages.push(currentPage);
						pageContentHeights.push(currentPageHeightPx);

						// Start new page
						currentPage = [];
						currentPageHeightPx = 0;
					} else {
						// Element doesn't fit on current page - start a new page
						contentPages.push(currentPage);
						pageContentHeights.push(currentPageHeightPx);

						// Start new page with this element
						currentPage = [element.outerHTML || element.textContent];
						currentPageHeightPx = elementHeightPx;
					}
				};

				// Enhanced function to split tables across pages
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
						const minTableHeight = headerHeight + (rows.length > 0 ? 50 : 0); // Minimum height for header + at least one row

						if (currentPageHeightPx + minTableHeight > availableContentHeightPx) {
							// Not enough space for table header + one row, move to next page
							contentPages.push(currentPage);
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

					// Try to fit as many rows as possible in the first part
					let rowsInFirstPart = [];
					let remainingRows = [...rows];

					// Measure each row and see how many fit on the current page
					for (let i = 0; i < rows.length; i++) {
						const row = rows[i];
						const rowHTML = `<table ${tableAttributes}><tbody>${row.outerHTML}</tbody></table>`;
						measureArea.innerHTML = rowHTML;
						const rowHeightPx = measureArea.offsetHeight;

						if (rowHeightPx <= remainingHeightPx) {
							// This row fits
							rowsInFirstPart.push(row);
							remainingHeightPx -= rowHeightPx;
							remainingRows.shift();
						} else {
							// This row doesn't fit
							break;
						}
					}

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
							contentPages.push(currentPage);
							pageContentHeights.push(currentPageHeightPx);

							// Create a new page with continuation table
							let continuationHTML = `<table ${tableAttributes}>`;
							// Optionally include header in continuation tables
							if (hasHeader) continuationHTML += tableHeader;
							continuationHTML += '<tbody>';

							// Process remaining rows (may need further splitting)
							let rowsInCurrentPart = [];
							currentPage = [];
							currentPageHeightPx = 0;

							// Handle case where header might not leave room for even one row
							if (hasHeader) {
								const headerHTML = `<table ${tableAttributes}>${tableHeader}</table>`;
								measureArea.innerHTML = headerHTML;
								const headerHeightPx = measureArea.offsetHeight;
								currentPageHeightPx += headerHeightPx;
							}

							// Try to fit as many remaining rows as possible
							for (let i = 0; i < remainingRows.length; i++) {
								const row = remainingRows[i];
								const rowHTML = `<table ${tableAttributes}><tbody>${row.outerHTML}</tbody></table>`;
								measureArea.innerHTML = rowHTML;
								const rowHeightPx = measureArea.offsetHeight;

								if (currentPageHeightPx + rowHeightPx <= availableContentHeightPx) {
									// This row fits
									rowsInCurrentPart.push(row);
									currentPageHeightPx += rowHeightPx;
									remainingRows.shift();
									i--; // Adjust index since we're removing from array
								} else if (i === 0 && currentPage.length === 0) {
									// Force at least one row even if it overflows
									rowsInCurrentPart.push(row);
									remainingRows.shift();
									break;
								} else {
									// This row doesn't fit, and we already have content
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
								contentPages.push(currentPage);

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
							contentPages.push(currentPage);
							pageContentHeights.push(currentPageHeightPx);
							currentPage = [];
							currentPageHeightPx = 0;
						}

						// Try again with empty page
						splitTableAcrossPages(tableElement);
					}
				};

				// Process all content elements in order
				contentElements.forEach((element) => {
					processElement(element);
				});

				// Add the last page if not empty
				if (currentPage.length > 0) {
					contentPages.push(currentPage);
					pageContentHeights.push(currentPageHeightPx);
				}

				// Verify our actual page count
				console.log(`📄 Standard layout resulted in ${contentPages.length} pages`);
				console.log(`📄 Table breaks count: ${tableBreakCounts}`);

				// Debugging: inspect content pages
				contentPages.forEach((page, index) => {
					console.log(`📄 Page ${index + 1} has ${page.length} elements`);

					// Check if this page contains the analysis section (table)
					const hasTable = page.some((html) => html.includes('<table') && html.includes('Tests'));
					if (hasTable) {
						console.log(`✅ Page ${index + 1} contains analysis table`);
					}
				});
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

		// Get paginated content
		const paginationResult = paginateContent();

		// Prepare custom font support for print window
		const fontFaces = `
			@font-face {
				font-family: 'Gilroy';
				src: url('/fonts/Gilroy-Regular.woff2') format('woff2'),
					 url('/fonts/Gilroy-Regular.woff') format('woff');
				font-weight: 400;
				font-style: normal;
				font-display: swap;
			}
			
			@font-face {
				font-family: 'Gilroy';
				src: url('/fonts/Gilroy-Medium.woff2') format('woff2'),
					 url('/fonts/Gilroy-Medium.woff') format('woff');
				font-weight: 500;
				font-style: normal;
				font-display: swap;
			}
			
			@font-face {
				font-family: 'Gilroy';
				src: url('/fonts/Gilroy-Bold.woff2') format('woff2'),
					 url('/fonts/Gilroy-Bold.woff') format('woff');
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
				<title>Print Document</title>
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
						width: ${A4.width}mm;
						margin: 20px auto;
						box-shadow: 0 0 10px rgba(0,0,0,0.2);
						background-color: white;
						font-family: 'Gilroy', sans-serif !important;
					}
					
					.page {
						position: relative;
						width: ${A4.width - 2 * A4.sideMargin}mm;
						height: ${A4.height - A4.topMargin - A4.bottomMargin}mm;
						margin: 0 ${A4.sideMargin}mm;
						overflow: hidden;
						box-sizing: border-box;
						page-break-after: always;
						background-color: white;
						border-bottom: 1px dashed #ccc;
						font-family: 'Gilroy', sans-serif !important;
					}
					
					.page:last-child {
						page-break-after: auto;
						border-bottom: none;
					}
					
					.header {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						box-sizing: border-box;
						padding-bottom: 0 !important;
						font-family: 'Gilroy', sans-serif !important;
					}
					
					.header > div:last-child {
						padding-bottom: 0 !important;
						margin-bottom: 0 !important;
					}
					
					.content {
						position: absolute;
						top: ${paginationResult.contentTopMm}mm;
						left: 0;
						width: 100%;
						box-sizing: border-box;
						overflow: hidden;
						padding-top: 0 !important;
						padding-bottom: 0 !important;
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
					
					table {
						border-collapse: collapse;
						width: 100%;
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
							width: 100%;
							margin: 0;
							box-shadow: none;
						}
						
						.page {
							margin: 0;
							border-bottom: none;
						}
					}
				</style>
			</head>
			<body>
				<div class="print-container"></div>
				<script>
					// Ensure fonts are loaded before printing
					document.fonts.ready.then(function() {
						console.log('Fonts loaded in print window');
						setTimeout(function() {
							window.print();
						}, 1000);
					});
				</script>
			</body>
			</html>
		`);

		// Build the HTML for all pages
		const printContainer = printWindow.document.querySelector('.print-container');

		// Generate pages with actual content
		paginationResult.pages.forEach((pageContent, index) => {
			const pageNumber = (index + 1).toString().padStart(2, '0');
			const totalPages = paginationResult.pages.length.toString().padStart(2, '0');

			// Replace page numbers in footer
			const pageFooter = currentFooter
				.replace(/class="page-number"[^>]*>00/g, `class="page-number">${pageNumber}`)
				.replace(/class="page-total"[^>]*>00/g, `class="page-total">${totalPages}`);

			const page = document.createElement('div');
			page.className = 'page';

			// For Array type pageContent (from standard layout)
			const pageContentHTML = Array.isArray(pageContent) ? pageContent.join('') : pageContent;

			page.innerHTML = `
				<div class="header">${currentHeader}</div>
				<div class="content">${pageContentHTML}</div>
				<div class="footer">${pageFooter}</div>
			`;

			printContainer.appendChild(page);

			// Log page creation
			console.log(
				`✅ Page ${pageNumber}/${totalPages} created with ${
					paginationResult.is2PageLayout ? 'custom' : 'standard'
				} layout`,
			);
		});

		console.log('🖨️ Print preparation complete with', paginationResult.pages.length, 'pages');
		console.log(
			'🔍 Using layout:',
			paginationResult.is2PageLayout ? 'Custom 2-page layout' : 'Standard sequential layout',
		);

		// Focus the window to bring it to the front
		printWindow.focus();
	};

	// Update the print method to use the prepared content
	useEffect(() => {
		if (contentRef.current && window.getComputedStyle) {
			// Apply initial line heights to the editor for WYSIWYG experience
			const editorStyleElement = document.createElement('style');
			editorStyleElement.textContent = `
				@font-face {
					font-family: 'Gilroy';
					src: url('/fonts/Gilroy-Regular.woff2') format('woff2'),
						 url('/fonts/Gilroy-Regular.woff') format('woff');
					font-weight: 400;
					font-style: normal;
					font-display: swap;
				}
				
				@font-face {
					font-family: 'Gilroy';
					src: url('/fonts/Gilroy-Medium.woff2') format('woff2'),
						 url('/fonts/Gilroy-Medium.woff') format('woff');
					font-weight: 500;
					font-style: normal;
					font-display: swap;
				}
				
				@font-face {
					font-family: 'Gilroy';
					src: url('/fonts/Gilroy-Bold.woff2') format('woff2'),
						 url('/fonts/Gilroy-Bold.woff') format('woff');
					font-weight: 700;
					font-style: normal;
					font-display: swap;
				}
				
				.content-editable p, .content-editable div, .content-editable span,
				.content-editable td, .content-editable th, .content-editable li,
				.header-editable p, .header-editable div, .header-editable span,
				.footer-editable p, .footer-editable div, .footer-editable span {
					line-height: inherit;
					margin-top: 0;
					margin-bottom: 0;
					font-family: 'Gilroy', sans-serif !important;
				}
				
				.content-editable table {
					border-collapse: collapse;
					table-layout: fixed;
					font-family: 'Gilroy', sans-serif !important;
				}
				
				.editable, .header-editable, .content-editable, .footer-editable {
					font-family: 'Gilroy', sans-serif !important;
				}
			`;
			document.head.appendChild(editorStyleElement);

			return () => {
				document.head.removeChild(editorStyleElement);
			};
		}
	}, []);

	return (
		<div className="p-4 bg-gray-100 min-h-screen">
			<div className="mb-4 flex flex-col gap-4 items-end">
				<div className="flex justify-between items-center w-full">
					<select className="px-4 py-1.5  focus:outline-none border-2 border-gray-500 rounded-lg bg-white ">
						<option value="">Phát hành mới</option>
					</select>
					<div>
						{loading && <span className="px-4 py-2 bg-yellow-500 text-white rounded">Đang tải dữ liệu mẫu...</span>}
						{error && <span className="px-4 py-2 bg-red-500 text-white rounded">Lỗi: {error}</span>}
						<button className="px-4 py-1 focus:outline-none border-2 border-gray-500 rounded-lg ml-2 active:bg-blue-700">
							Phát hành mới
						</button>
						<button
							onClick={handlePrint}
							className="px-4 py-1  focus:outline-none border-2 border-gray-500 rounded-lg ml-2 active:bg-blue-700"
						>
							PRINT / PDF
						</button>
					</div>
				</div>
				<div className="flex justify-between items-center w-full">
					<p className="text-gray-500 text-lg">Tùy chọn hiển thị:</p>
					<div>
						<button
							onClick={() => setShowVlas((prev) => !prev)}
							className={`${
								showVlas ? 'bg-sky-500 text-white hover:bg-blue-200' : 'bg-gray-200 text-gray-700 hover:bg-blue-600'
							} px-4 py-1 w-32 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg  `}
						>
							VLAS
						</button>

						<button
							onClick={() => setShowComment((prev) => !prev)}
							className={`${
								showComment ? 'bg-sky-500 text-white hover:bg-blue-200' : 'bg-gray-200 text-gray-700 hover:bg-blue-600'
							} px-4 py-1 w-32 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg  `}
						>
							COMMENT
						</button>

						<button
							onClick={() => setShowReference((prev) => !prev)}
							className={`${
								showReference
									? 'bg-sky-500 text-white hover:bg-blue-200'
									: 'bg-gray-200 text-gray-700 hover:bg-blue-600'
							} px-4 py-1 w-32 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg  `}
						>
							REFERENCE
						</button>
					</div>
				</div>
			</div>
			<div className="flex flex-col gap-4 overflow-x-auto p-4 bg-white shadow-lg rounded-lg">
				<div
					className="w-[210mm] bg-white shadow-md flex flex-col border border-gray-300"
					style={{ fontFamily: 'Gilroy, sans-serif' }}
				>
					<div
						id="header-edit"
						className="header-editable editable text-center font-bold text-lg border-b px-8 pt-8 pb-4"
						style={{ fontFamily: 'Gilroy, sans-serif' }}
						dangerouslySetInnerHTML={{
							__html: header.replace(/-- NHÁP \/ DRAFT --/g, ppt_uid || '-- NHÁP / DRAFT --'),
						}}
					/>
					<div
						id="content-edit"
						ref={contentRef}
						className="content-editable editable border-0 px-8 py-2 text-base my-4"
						style={{ fontFamily: 'Gilroy, sans-serif' }}
						dangerouslySetInnerHTML={{ __html: content }}
					/>
					<div
						id="footer-edit"
						className="footer-editable editable px-8 pb-8 pt-4"
						style={{ fontFamily: 'Gilroy, sans-serif' }}
						dangerouslySetInnerHTML={{ __html: footer }}
					/>
				</div>
			</div>

			<style jsx>{`
				@font-face {
					font-family: 'Gilroy';
					src: url('/fonts/Gilroy-Regular.woff2') format('woff2'), url('/fonts/Gilroy-Regular.woff') format('woff');
					font-weight: 400;
					font-style: normal;
					font-display: swap;
				}

				@font-face {
					font-family: 'Gilroy';
					src: url('/fonts/Gilroy-Medium.woff2') format('woff2'), url('/fonts/Gilroy-Medium.woff') format('woff');
					font-weight: 500;
					font-style: normal;
					font-display: swap;
				}

				@font-face {
					font-family: 'Gilroy';
					src: url('/fonts/Gilroy-Bold.woff2') format('woff2'), url('/fonts/Gilroy-Bold.woff') format('woff');
					font-weight: 700;
					font-style: normal;
					font-display: swap;
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
			`}</style>
		</div>
	);
}
