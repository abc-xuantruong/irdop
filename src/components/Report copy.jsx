import { useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import Swal from 'sweetalert2'; // Add SweetAlert2 import

export default function MultiPageEditor() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [pptUid, setPptUid] = useState('');
	const sample_uid = searchParams.get('sample_uid');
	const selected_ppt_uid = searchParams.get('ppt_uid');
	const [sampleData, setSampleData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pptList, setPptList] = useState([]);
	const { currentUser, formatDate } = useContext(GlobalContext);

	// Add state to track if we're in read-only mode (when a ppt_uid is in the URL)
	const [isReadOnly, setIsReadOnly] = useState(false);

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

	// Add new state variables for notes and requirements
	const [receiptNote, setReceiptNote] = useState('');
	const [additionalRequest, setAdditionalRequest] = useState('');

	// Add new state to store row heights
	const [tableRowHeights, setTableRowHeights] = useState([]);
	// Create ref array for table rows
	const tableRowRefs = useRef([]);

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

	// Set read-only mode whenever selected_ppt_uid changes
	useEffect(() => {
		// Allow editing if it's a DRAFT
		const isDraft = selected_ppt_uid && selected_ppt_uid.includes('DRAFT');
		// setIsReadOnly(!!selected_ppt_uid && !isDraft);
		if (!selected_ppt_uid) {
			setPptUid('');
		}
	}, [selected_ppt_uid]);

	// Fetch the list of published reports for this sample
	useEffect(() => {
		const fetchPptList = async () => {
			if (sample_uid) {
				try {
					const response = await apiGet(`https://black.irdop.org/to82oe92i/db/sample/get/ppt_uid/${sample_uid}`);

					if (response.status !== 200) {
						throw new Error(`PPT list API request failed with status ${response.status}`);
					}

					console.log('PPT list fetched:', response.data);
					setPptList(response.data); // Now data structure is [{ppt_uid, publish_date},...]

					// Check if a specific ppt_uid was requested in URL
					if (selected_ppt_uid) {
						setPptUid(selected_ppt_uid);
						await loadPublishedReport(selected_ppt_uid);
					}
				} catch (err) {
					console.error('Error fetching PPT list:', err);
					// Continue with sample data even if PPT list fails
				}
			}
		};

		fetchPptList();
	}, [sample_uid, selected_ppt_uid]);

	// Function to load a published report
	const loadPublishedReport = async (reportId) => {
		setLoading(true);
		try {
			const response = await apiGet(`https://black.irdop.org/to82oe92i/db/get/report/${reportId}`);

			if (response.status !== 200) {
				throw new Error(`Report API request failed with status ${response.status}`);
			}

			const reportData = response.data;
			console.log('Published report data loaded:', reportData);

			// Update all relevant states with the fetched report data
			setPptUid(reportData.ppt_uid || '');
			setShowVlas(reportData.is_vlas || false);
			setShowComment(reportData.is_comment || false);
			setShowReference(reportData.is_reference || false);

			// Process the header content to replace the draft text with actual ppt_uid
			let processedHeader = reportData.header_section || header;
			if (reportData.ppt_uid && !reportData.ppt_uid.includes('DRAFT')) {
				// Replace any draft text variations with the actual ppt_uid
				processedHeader = processedHeader
					.replace(
						/<p[^>]*class="[^"]*ref_code[^"]*"[^>]*>.*?<\/p>/i,
						`<p class="ref_code" style="min-width:5pt; margin: 0; margin-right: 2mm;">${reportData.ppt_uid}</p>`,
					)
					.replace(/SƠ BỘ \/ DRAFT/g, reportData.ppt_uid)
					.replace(/-- SƠ BỘ \/ DRAFT --/g, reportData.ppt_uid);
			}

			// Update HTML content with processed header
			setHeaderHTML(processedHeader);
			setFooterHTML(reportData.footer_section || footer);
			setCustomerSectionHTML(reportData.customer_section || '');
			setSampleInfoSectionHTML(reportData.sample_section || '');
			setAnalysisSectionHTML(reportData.analysis_section || '');
			setCommentSectionHTML(reportData.comment_section || '');
			setNotesSectionHTML(reportData.note_section || '');
			setSignatureSectionHTML(reportData.signature_section || '');

			// Update reference values if available
			if (reportData.reference && Array.isArray(reportData.reference)) {
				// Convert reference array to reference cell HTML elements
				const refCells = reportData.reference.map(
					(refValue) =>
						`<td class="reference-cell" style="border: 1px solid black; padding: 6px 8px; text-align:left; font-size:12px;">${refValue}</td>`,
				);
				setReferenceValues(refCells);
			}

			// Extract receipt note and additional request if available in report data
			if (reportData.receipt_note) {
				setReceiptNote(reportData.receipt_note);
			}

			if (reportData.additional_request) {
				setAdditionalRequest(reportData.additional_request);
			}

			// Update the editor content
			const combinedContent = generateCombinedContent(
				reportData.customer_section || '',
				reportData.sample_section || '',
				reportData.analysis_section || '',
				reportData.comment_section || '',
				reportData.note_section || '',
				reportData.signature_section || '',
			);

			setContent(combinedContent);

			if (editorRef.current && window.tinymce) {
				const editor = window.tinymce.get(editorRef.current.id);
				if (editor) {
					editor.setContent(combinedContent);
				}
			}

			// Update header in TinyMCE if loaded
			if (window.tinymce) {
				const headerElements = document.getElementsByClassName('header-editable');
				if (headerElements.length > 0 && headerElements[0].id) {
					const headerEditor = window.tinymce.get(headerElements[0].id);
					if (headerEditor) {
						headerEditor.setContent(processedHeader);
					}
				}
			}

			// Update footer in TinyMCE if loaded
			setFooter(reportData.footer_section || footer);

			// After loading the report, update the read-only state
			// Allow editing if it's a DRAFT
			const isDraft = reportData.ppt_uid && reportData.ppt_uid.includes('DRAFT');
			// setIsReadOnly(!isDraft);
		} catch (err) {
			console.error('Error loading published report:', err);
			setError(`Failed to load published report: ${err.message}`);
			// Add notification for error
			showNotification(`Tải phiếu không thành công: ${err.message}`, 'error');
		} finally {
			setLoading(false);
		}
	};

	// Helper function to generate combined content
	const generateCombinedContent = (
		customerSection,
		sampleInfoSection,
		analysisSection,
		commentSection,
		notesSection,
		signatureSection,
	) => {
		const commentContent = showComment ? commentSection : '';
		const commentSpacing = showComment ? spacing : '';

		return `${customerSection}${spacing}${sampleInfoSection}${spacing}${analysisSection}${spacing}${commentContent}${commentSpacing}${notesSection}${spacing}${signatureSection}`;
	};

	// Handle selection change
	const handleReportSelectionChange = (e) => {
		const selectedValue = e.target.value;

		if (selectedValue === '') {
			// "Phát hành mới" option selected - reset to default
			setPptUid('');

			// Update the URL by removing ppt_uid parameter
			setSearchParams((params) => {
				params.delete('ppt_uid');
				return params;
			});

			// Set editor to editable mode
			setIsReadOnly(false);

			// If we have sample data, reload it to reset the form to default
			if (sampleData) {
				setShowVlas(false);
				setShowComment(false);
				setShowReference(false);
				updateContentWithData(sampleData);
			} else {
				// If no sample data available yet, fetch it
				fetchSampleData();
			}
		} else {
			// A published report was selected
			setPptUid(selectedValue);

			// Update the URL with the selected ppt_uid
			setSearchParams((params) => {
				params.set('ppt_uid', selectedValue);
				return params;
			});

			// Load the selected report data and set editor to read-only mode
			// (unless it's a draft, which is handled in loadPublishedReport)
			loadPublishedReport(selectedValue);
		}
	};

	// Separate function to fetch sample data
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
			console.log('Sample data fetched:', sampleResult);

			// Check if any analysis has protocol_source = 'IRDOP VS' and set showVlas to true if found
			if (sampleResult.analysis && Array.isArray(sampleResult.analysis)) {
				const hasVlasProtocol = sampleResult.analysis.some((item) => item.protocol_source === 'IRDOP VS');
				if (hasVlasProtocol) {
					setShowVlas(true);
				}
			}

			// Extract receipt note and additional request data
			if (sampleResult.receipt && sampleResult.receipt.note) {
				setReceiptNote(sampleResult.receipt.note);
			}

			if (sampleResult.additional_request) {
				setAdditionalRequest(sampleResult.additional_request);
			}

			// Get receipt_id from sample data to fetch client info
			if (sampleResult && sampleResult.receipt_id) {
				try {
					const clientResponse = await apiGet(
						`https://black.irdop.org/hli1o7az/db/receipt/get/client/${sampleResult.receipt_id}`,
					);
					// Alternative URL: http://127.0.0.1:1880/db/get/client/${sampleResult.receipt_id}

					if (clientResponse.status !== 200) {
						throw new Error(`Client API request failed with status ${clientResponse.status}`);
					}

					sampleResult.client = clientResponse.data;
				} catch (clientErr) {
					console.error('Error fetching client data:', clientErr);
					// Continue with sample data even if client data fails
				}
			}

			// Update the content with the retrieved data
			updateContentWithData(sampleResult);
			setLoading(false);
			return sampleResult;
		} catch (err) {
			console.error('Error fetching data:', err);
			setError(err.message);
			setLoading(false);
			return null;
		}
	};

	// Add API fetch for sample data and client data
	useEffect(() => {
		if (!selected_ppt_uid) {
			fetchSampleData();
		}
	}, [sample_uid, selected_ppt_uid]);

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
			const refs = data.analysis.map((item) => `--`);
			setReferenceValues(refs);
		}

		// Generate comment section if needed
		const updatedCommentSection = showComment ? generateCommentSection() : '';
		setCommentSectionHTML(updatedCommentSection);
		const commentSpacing = showComment ? spacing : '';

		// Set notes and signature sections
		setNotesSectionHTML(notesSection);
		setSignatureSectionHTML(signatureSection);

		// Default layout: all sections in sequential order with comment placed after analysis
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

	// Function to update content when toggle states change
	useEffect(() => {
		if (sampleData) {
			updateContentWithData(sampleData);
		}

		// Update header when VLAS state changes
		const updateVlasVisibility = () => {
			// Create a temporary container to avoid direct string manipulation
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = header;

			// Find the VLAS icon element
			const vlasIcon = tempDiv.querySelector('.vlas_icon');

			if (vlasIcon) {
				// Update the style directly on the DOM element
				if (showVlas) {
					vlasIcon.style.display = ''; // Show the element
				} else {
					vlasIcon.style.display = 'none'; // Hide the element
				}

				// Update the header state with the modified HTML
				setHeader(tempDiv.innerHTML);

				// If we're in the editor, also update the TinyMCE content
				if (window.tinymce) {
					const headerElements = document.getElementsByClassName('header-editable');
					if (headerElements.length > 0 && headerElements[0].id) {
						const headerEditor = window.tinymce.get(headerElements[0].id);
						if (headerEditor) {
							headerEditor.setContent(tempDiv.innerHTML);
						}
					}
				}
			}
		};

		// Call the function to update VLAS visibility
		updateVlasVisibility();

		// If we're toggling the reference column off, save the current reference values
		if (!showReference && contentRef.current) {
			// Extract reference values from the current analysis table
			const extractCurrentReferences = () => {
				// Try to get content from TinyMCE editor first for most current data
				let currentHtmlContent = '';
				if (contentRef.current && window.tinymce) {
					const contentEditor = window.tinymce.get(contentRef.current?.id);
					if (contentEditor) {
						currentHtmlContent = contentEditor.getContent();
					}
				}

				// If we couldn't get editor content, fall back to state
				if (!currentHtmlContent) {
					currentHtmlContent = analysisSectionHTML || content;
				}

				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = currentHtmlContent;

				// Find all reference cells in the current editor content
				const referenceCells = tempDiv.querySelectorAll('.reference-cell');

				if (referenceCells.length > 0) {
					const refs = Array.from(referenceCells).map((cell) => cell.outerHTML);
					console.log('Current reference values extracted:', refs);
					setReferenceValues(refs);
					return refs;
				}
				return [];
			};

			extractCurrentReferences();
		}
	}, [showVlas, showComment, showReference, sampleData]);

	// Function to generate customer section from API data
	const generateCustomerSection = (clientData) => {
		// Default values in case client data is not available
		const clientUid = clientData?.client_uid || '';
		const clientName = clientData?.client_name || '';
		const clientAddress = clientData?.client_address || '';

		return `
<div style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
	<div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
		<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: left;">Nơi / người gửi mẫu / Customer information</p>
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: right; color: black; text-decoration: none;">${clientUid}</p>
		</div>		
		<div style="display: flex; flex-direction: column; gap: 2px; height: fit-content;">
			<p style="font-weight: bold; margin: 0; text-align: left; font-size: 16px; line-height: 1.2;">${clientName}</p>
			<p style="margin: 0; font-size: 12px; text-align: left; line-height: 1.2;">${clientAddress || '--'}</p>
		</div>
	</div>
</div>`;
	};

	// Function to generate sample information section from API data
	const generateSampleInfoSection = (data) => {
		// Get the sample_uid from data
		const sampleId = data.sample_uid || sample_uid;

		// Get the sample_information array from data and filter out items with empty fvalue
		const sampleInfo = data.sample_information;
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
	};

	// Function to measure row heights using window.getComputedStyle
	const measureTableRowHeights = (shouldLog = false) => {
		// Make sure we have table row refs
		if (tableRowRefs.current && tableRowRefs.current.length > 0) {
			if (shouldLog) console.log('📏 MEASURING TABLE ROWS (total rows: ' + tableRowRefs.current.length + ')');

			// Helper function to safely parse numeric style values
			const safeParseFloat = (value) => {
				if (!value) return 0;
				const strValue = String(value || '0');
				const numericPart = strValue.replace(/[^\d.-]/g, '');
				const result = parseFloat(numericPart);
				return isNaN(result) ? 0 : result;
			};

			// Measure each row's height using computed styles
			const heights = tableRowRefs.current
				.map((rowRef, index) => {
					if (!rowRef) {
						return { index, heightPx: 30, heightMm: pxToMm(30) };
					}

					try {
						// Get the computed style for the row
						const computedStyle = window.getComputedStyle(rowRef);

						// Get direct measurements first (most reliable)
						const offsetHeight = rowRef.offsetHeight || 0;
						const clientHeight = rowRef.clientHeight || 0;
						const scrollHeight = rowRef.scrollHeight || 0;
						const boundingClientRect = rowRef.getBoundingClientRect();
						const boundingHeight = boundingClientRect ? boundingClientRect.height : 0;

						// Get the base height from the computed style (content height)
						const contentHeight = safeParseFloat(computedStyle.height);

						// Calculate padding and border heights
						const paddingTop = safeParseFloat(computedStyle.paddingTop);
						const paddingBottom = safeParseFloat(computedStyle.paddingBottom);
						const borderTopWidth = safeParseFloat(computedStyle.borderTopWidth);
						const borderBottomWidth = safeParseFloat(computedStyle.borderBottomWidth);
						const marginTop = safeParseFloat(computedStyle.marginTop);
						const marginBottom = safeParseFloat(computedStyle.marginBottom);

						// Calculate total height including padding and borders
						const totalHeight =
							contentHeight +
							paddingTop +
							paddingBottom +
							borderTopWidth +
							borderBottomWidth +
							marginTop +
							marginBottom;

						// Use box-sizing to adjust the calculation if needed
						const boxSizing = computedStyle.boxSizing;

						// Determine the most reliable height value
						let finalHeight;

						if (offsetHeight > 0) {
							// offset height is usually most reliable
							finalHeight = offsetHeight;
						} else if (boundingHeight > 0) {
							finalHeight = boundingHeight;
						} else if (totalHeight > 0) {
							finalHeight = totalHeight;
						} else if (contentHeight > 0) {
							finalHeight = contentHeight;
						} else {
							// Default if we can't get any reliable measurement
							finalHeight = 30; // 30px is a reasonable minimum
						}

						// Convert to mm
						const heightMm = pxToMm ? pxToMm(finalHeight) : finalHeight / 3.78;

						// Only log detailed information if shouldLog is true (during print)
						if (shouldLog) {
							console.log(`📊 Row #${index + 1} measurements:`, {
								offsetHeight: offsetHeight + 'px',
								clientHeight: clientHeight + 'px',
								scrollHeight: scrollHeight + 'px',
								boundingHeight: boundingHeight + 'px',
								computedHeight: contentHeight + 'px',
								totalCalculated: totalHeight.toFixed(2) + 'px',
								finalHeight: finalHeight.toFixed(2) + 'px',
								heightInMm: heightMm.toFixed(2) + 'mm',
								cellCount: rowRef.cells ? rowRef.cells.length : 'N/A',
								boxSizing,
								computedStyle: {
									paddingTop: paddingTop + 'px',
									paddingBottom: paddingBottom + 'px',
									borderTopWidth: borderTopWidth + 'px',
									borderBottomWidth: borderBottomWidth + 'px',
									marginTop: marginTop + 'px',
									marginBottom: marginBottom + 'px',
								},
							});
						}

						return {
							index,
							heightPx: finalHeight,
							heightMm,
							rowRef,
							offsetHeight,
							computedStyle: {
								paddingTop,
								paddingBottom,
								borderTopWidth,
								borderBottomWidth,
								boxSizing,
							},
						};
					} catch (error) {
						if (shouldLog) console.warn(`Error measuring row #${index + 1}:`, error);
						return { index, heightPx: 30, heightMm: pxToMm(30) };
					}
				})
				.filter((item) => item.heightPx > 0);

			// Only log summary information if shouldLog is true (during print)
			if (shouldLog) {
				console.log('📏 SUMMARY: Measured row heights with computed styles:', heights);

				// Calculate average height for debugging
				if (heights.length > 0) {
					const avgHeight = heights.reduce((sum, h) => sum + h.heightPx, 0) / heights.length;
					console.log(`📊 Average row height: ${avgHeight.toFixed(1)}px (${pxToMm(avgHeight).toFixed(2)}mm)`);
				}
			}

			setTableRowHeights(heights);
			return heights;
		} else {
			if (shouldLog) console.log('⚠️ No table rows found to measure');
		}
		return [];
	};

	// Function to generate analysis section from API data
	const generateAnalysisSection = (data) => {
		// Reset table row refs array
		tableRowRefs.current = [];

		// Get the analysis array from data
		const analysisItems = data.analysis || [];

		// Get current reference values from editor if available
		const getCurrentReferenceValues = () => {
			if (contentRef.current && window.tinymce) {
				const contentEditor = window.tinymce.get(contentRef.current?.id);
				if (contentEditor) {
					const currentContent = contentEditor.getContent();
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = currentContent;

					const referenceCells = tempDiv.querySelectorAll('.reference-cell');
					if (referenceCells.length > 0) {
						return Array.from(referenceCells).map((cell) => cell.outerHTML);
					}
				}
			}
			return null;
		};

		// Handle reference values based on showReference state
		let refsArray = [];

		if (showReference) {
			// When reference column is visible (or switching from hidden to visible)
			// First check if we have current values in the editor
			const currentRefs = getCurrentReferenceValues();

			if (currentRefs && currentRefs.length > 0) {
				// Use existing reference values from editor
				refsArray = currentRefs;
			} else if (referenceValues && referenceValues.length > 0) {
				// Fall back to stored reference values
				refsArray = referenceValues;
			} else {
				// Create default reference cells for each analysis item
				refsArray = analysisItems.map(
					() =>
						`<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>`,
				);
			}

			// Ensure we have enough reference cells for all rows
			if (refsArray.length < analysisItems.length) {
				// Add default cells for any new rows
				const additionalCells = analysisItems.length - refsArray.length;
				const defaultCells = Array(additionalCells).fill(
					`<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>`,
				);
				refsArray = [...refsArray, ...defaultCells];
			}

			// Store the updated reference values
			setReferenceValues(refsArray);
		} else {
			// When reference column is hidden (or switching from visible to hidden)
			// We need to extract and store current reference values before removing the column
			const currentRefs = getCurrentReferenceValues();
			if (currentRefs && currentRefs.length > 0) {
				refsArray = currentRefs;
				setReferenceValues(currentRefs);
			} else if (referenceValues && referenceValues.length > 0) {
				refsArray = referenceValues;
			}
		}

		// Add extra table header for reference if needed
		const referenceHeader = showReference
			? `
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 15%; text-align:left; font-size:12px;box-sizing: border-box;">
				<strong>Tham chiếu</strong> <br> <span style="font-size: 12px; color: #444444  ;">/ Standard Ref</span>
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

					// Reference cell handling with improved logic
					let referenceCell = '';
					if (showReference) {
						// When showing reference column
						if (index < refsArray.length && refsArray[index]) {
							// Use existing reference cell if available
							if (refsArray[index].includes('class="reference-cell"')) {
								referenceCell = refsArray[index].replace(/padding: 6px 8px/g, 'padding: 4px 8px');
							} else {
								// Create a properly formatted cell from stored value
								referenceCell = `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${refsArray[
									index
								].replace(/<\/?td[^>]*>/g, '')}</td>`;
							}
						} else {
							// Create default cell if no stored value exists
							referenceCell = `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>`;
						}
					}

					// Add data-row-index attribute for easier ref assignment
					return `
				<tr class="table-row" data-row-index="${index}">
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${index + 1}.</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${parameterName}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${result}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${unit}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${protocol}</td>${referenceCell}
				</tr>`;
				})
				.join('');
		} else {
			// If no analysis items, include a placeholder row
			const referenceCell = showReference
				? `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>`
				: '';

			analysisRows = `
			<tr class="table-row" data-row-index="0">
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; ">1</td>
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
				<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>${referenceCell}
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
				</th>${referenceHeader}
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
			const tableRows = document.querySelectorAll('.table-row');
			if (tableRows.length > 0) {
				console.log(`📋 Found ${tableRows.length} table rows to measure`);

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

	// Add new function to debug table rows in DOM with optional logging
	const debugTableRows = (shouldLog = false) => {
		const rows = document.querySelectorAll('.table-row');
		if (shouldLog) console.log(`🔍 DOM CHECK: Found ${rows.length} rows with .table-row class`);

		rows.forEach((row, index) => {
			const height = row.offsetHeight;
			const cells = row.cells ? row.cells.length : 'unknown';
			if (shouldLog) console.log(`Row #${index + 1}: height=${height}px, cells=${cells}, id=${row.id || 'none'}`);
		});

		// Also check our current refs
		if (shouldLog) console.log(`🔗 Current tableRowRefs length: ${tableRowRefs.current.length}`);
	};

	// Add new function to generate comment section
	const generateCommentSection = () => {
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
				Thông tin mẫu thử do khách hàng cung cấp / Sample information provided by the customer.<br>
				Kết quả chỉ có giá trị với mẫu thử / The results are only valid for the tested sample(s).
			</p>
		</div>
		
	</div>
</div>`;

	const signatureSection = `
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
				 style="display: flex; align-items: center; gap: 2mm; font-size:12px; font-weight:400; margin-top: 0px;; height: 28px;">
				<span class=" std_ref-title">Xuất bản / ref.:</span>
				<p contenteditable="true" 
				   class="  ref_code" 
				   style="min-width:5pt; margin: 0; margin-right: 2mm;">
					SƠ BỘ / DRAFT
				</p>
				<span class="  published_date" 
					  style="min-width:5pt; margin: 0;">
					  Ngày / Date: ${formatDate(new Date())}
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
</div>
	`);
	const [footer, setFooter] = useState(`
<div style="border-top:1px solid #4CB748; height:50px; display:flex; padding-top:0pt; align-items: center;">
   <div style="flex-grow: 1; text-align: left; display: flex; align-items: center;"><img style="width: 38px; height: 38px; margin-right: 8px;" src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&amp;data=https://irdop.org" alt="QR Code">
	<div>
		<p style="color: #0058a3; margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN</p>
		<p style="margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center;">IRDOP.ORG</p>
		<p style="color: #444444; margin: 0; padding: 0; line-height: 1; font-size: 11px; height: 14px; display: flex; align-items: center;">Form: BM06-QT010-KN / Version: 05 / Effective date: 12/03/2025</p>
	</div>
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
			.then(() => console.log('All Gilroy fonts loaded successfully'))
			.catch((err) => console.error('Error loading Gilroy fonts:', err));

		return () => {
			document.head.removeChild(fontStyle);
		};
	}, []);

	// Modify TinyMCE initialization to respect read-only mode
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
	}, [isReadOnly]); // Re-initialize TinyMCE when isReadOnly changes

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
			toolbar: isReadOnly
				? false
				: 'undo redo | bold italic | subscript superscript | alignleft aligncenter alignright | table | charmap',
			readonly: isReadOnly,
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
				
				${isReadOnly ? '.editable { cursor: default !important; }' : ''}
			`,
			setup: (editor) => {
				if (editor.targetElm && editor.targetElm.classList && editor.targetElm.classList.contains('content-editable')) {
					editorRef.current = editor;

					// Only add change listeners if not in read-only mode
					if (!isReadOnly) {
						editor.on('change keyup input', () => {
							setContent(editor.getContent());
						});

						editor.on('blur', () => {
							setContent(editor.getContent());
						});
					}

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

							// Add read-only styling if needed
							if (isReadOnly) {
								contentContainer.style.userSelect = 'text';
								contentContainer.style.WebkitUserSelect = 'text';
								contentContainer.style.pointerEvents = 'none';
							}
						}
					});
				}

				if (editor.targetElm && editor.targetElm.classList && editor.targetElm.classList.contains('header-editable')) {
					// Only add change listeners if not in read-only mode
					if (!isReadOnly) {
						editor.on('change keyup input blur', () => {
							setHeader(editor.getContent());
						});
					}

					// Control header padding on initialization
					editor.on('init', () => {
						const headerContainer = editor.getBody();
						if (headerContainer && headerContainer.lastElementChild) {
							headerContainer.lastElementChild.style.paddingBottom = '0';
							headerContainer.lastElementChild.style.marginBottom = '0';
						}
						headerContainer.style.paddingBottom = '0';

						// Add read-only styling if needed
						if (isReadOnly) {
							headerContainer.style.userSelect = 'text';
							headerContainer.style.WebkitUserSelect = 'text';
							headerContainer.style.pointerEvents = 'none';
						}
					});
				}

				if (editor.targetElm && editor.targetElm.classList && editor.targetElm.classList.contains('footer-editable')) {
					// Only add change listeners if not in read-only mode
					if (!isReadOnly) {
						editor.on('change keyup input blur', () => {
							setFooter(editor.getContent());
						});
					}

					// Control footer padding on initialization
					editor.on('init', () => {
						const footerContainer = editor.getBody();
						if (footerContainer && footerContainer.firstElementChild) {
							footerContainer.firstElementChild.style.paddingTop = '0';
							footerContainer.firstElementChild.style.marginTop = '0';
						}
						footerContainer.style.paddingTop = '0';

						// Add read-only styling if needed
						if (isReadOnly) {
							footerContainer.style.userSelect = 'text';
							footerContainer.style.WebkitUserSelect = 'text';
							footerContainer.style.pointerEvents = 'none';
						}
					});
				}
			},
		});
	};

	// Add this function to extract table cell dimensions from the editor
	const extractTableDimensions = (shouldLog = false) => {
		if (!contentRef.current || !window.tinymce) return null;

		const contentEditor = window.tinymce.get(contentRef.current?.id);
		if (!contentEditor) return null;

		const editorBody = contentEditor.getBody();
		const tables = editorBody.querySelectorAll('table');

		if (!tables.length) {
			if (shouldLog) console.log('📊 No tables found in editor to extract dimensions');
			return null;
		}

		// Get the analysis table (first table)
		const analysisTable = tables[0];

		// Extract header dimensions
		const headerRow = analysisTable.querySelector('thead tr');
		if (!headerRow) return null;

		// Helper function to calculate adjusted width by subtracting 17px
		const getAdjustedWidth = (originalWidth) => {
			// Extract numeric part if it's a string with units
			if (typeof originalWidth === 'string' && originalWidth.includes('px')) {
				const numericPart = parseFloat(originalWidth);
				if (!isNaN(numericPart)) {
					return `${Math.max(0, numericPart - 17)}px`;
				}
			}

			// Use calc for other cases (like percentages)
			return `calc(${originalWidth} - 17px)`;
		};

		const headerCells = headerRow.querySelectorAll('th');
		const headerDimensions = Array.from(headerCells).map((th, index) => {
			const computedStyle = window.getComputedStyle(th);
			// Apply the width - 17px formula for header cells
			const adjustedWidth = getAdjustedWidth(computedStyle.width);

			const dimensions = {
				index,
				type: 'th',
				text: th.textContent.trim(),
				width: adjustedWidth, // Use adjusted width
				originalWidth: computedStyle.width, // Store original for reference
				minWidth: computedStyle.minWidth,
				height: computedStyle.height,
				padding: {
					top: computedStyle.paddingTop,
					right: computedStyle.paddingRight,
					bottom: computedStyle.paddingBottom,
					left: computedStyle.paddingLeft,
				},
				border: {
					top: computedStyle.borderTopWidth,
					right: computedStyle.borderRightWidth,
					bottom: computedStyle.borderBottomWidth,
					left: computedStyle.borderLeftWidth,
				},
			};

			if (shouldLog) {
				console.log(`📏 Header cell #${index + 1} "${th.textContent.trim()}" dimensions:`, {
					width: adjustedWidth, // Use adjusted width in logs
					originalWidth: computedStyle.width,
					height: computedStyle.height,
					minWidth: computedStyle.minWidth,
					padding: `${computedStyle.paddingTop} ${computedStyle.paddingRight} ${computedStyle.paddingBottom} ${computedStyle.paddingLeft}`,
					border: `${computedStyle.borderTopWidth} ${computedStyle.borderRightWidth} ${computedStyle.borderBottomWidth} ${computedStyle.borderLeftWidth}`,
					boxSizing: computedStyle.boxSizing,
					display: computedStyle.display,
				});
			}

			return dimensions;
		});

		// Extract data row dimensions - also apply the same width adjustment
		const rows = analysisTable.querySelectorAll('tbody tr');
		const rowDimensions = Array.from(rows).map((tr, rowIndex) => {
			const computedTrStyle = window.getComputedStyle(tr);
			const cells = tr.querySelectorAll('td');

			const cellDimensions = Array.from(cells).map((td, cellIndex) => {
				const computedStyle = window.getComputedStyle(td);
				// Apply the same width adjustment to body cells
				const adjustedWidth = getAdjustedWidth(computedStyle.width);

				return {
					rowIndex,
					cellIndex,
					type: 'td',
					width: adjustedWidth, // Use adjusted width
					originalWidth: computedStyle.width, // Store original for reference
					height: computedStyle.height,
					padding: {
						top: computedStyle.paddingTop,
						right: computedStyle.paddingRight,
						bottom: computedStyle.paddingBottom,
						left: computedStyle.paddingLeft,
					},
					border: {
						top: computedStyle.borderTopWidth,
						right: computedStyle.borderRightWidth,
						bottom: computedStyle.borderBottomWidth,
						left: computedStyle.borderLeftWidth,
					},
					content: td.textContent.trim(),
				};
			});

			return {
				rowIndex,
				rowHeight: computedTrStyle.height,
				cellDimensions,
				computedStyle: {
					height: computedTrStyle.height,
					boxSizing: computedTrStyle.boxSizing,
					display: computedTrStyle.display,
				},
			};
		});

		if (shouldLog) {
			console.log('📏 Extracted header dimensions:', headerDimensions);
			console.log('📏 Extracted row dimensions:', rowDimensions);
			console.log('📏 Extracted row dimensions:', rowDimensions);
		}

		return {
			headerDimensions,
			rowDimensions,
		};
	};

	const handlePrint = () => {
		let currentContent = content;
		let currentHeader = header;
		let currentFooter = footer;

		// First, ensure we have the most current content from TinyMCE
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
					let headerContent = headerEditor.getContent();
					const refCodeMatch = headerContent.match(/<p[^>]*class="[^"]*ref_code[^"]*"[^>]*>(.*?)<\/p>/i);
					if (refCodeMatch) {
						headerContent = headerContent.replace(
							refCodeMatch[0],
							refCodeMatch[0].replace(refCodeMatch[1], pptUid || '-- SƠ BỘ / DRAFT --'),
						);
					}
					currentHeader = headerContent;
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

		// Perform detailed table measurements right before printing
		console.log('🖨️ PRINT BUTTON CLICKED - STARTING PRE-PRINT MEASUREMENTS');
		performDetailedTableMeasurements();

		// Replace pptUid in header
		currentHeader = currentHeader.replace(/-- SƠ BỘ \/ DRAFT --/g, pptUid || '-- SƠ BỘ / DRAFT --');
		setHeaderHTML(currentHeader); // Store header in headerHTML state

		// Extract and store all current sections with their latest HTML values
		const extractedSections = extractCurrentSections(currentContent);

		// Update all section state variables with current values from editor
		setCustomerSectionHTML(extractedSections.customerSection);
		setSampleInfoSectionHTML(extractedSections.sampleInfoSection);
		setAnalysisSectionHTML(extractedSections.analysisSection);
		setCommentSectionHTML(extractedSections.commentSection || '');
		setNotesSectionHTML(extractedSections.notesSection);
		setSignatureSectionHTML(extractedSections.signatureSection);
		setFooterHTML(currentFooter);

		// Before printing, extract current reference cells from the editor content
		// to ensure we capture any changes made in the editor
		const extractCurrentReferenceValues = () => {
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = extractedSections.analysisSection;

			const referenceCells = tempDiv.querySelectorAll('.reference-cell');
			if (referenceCells.length > 0) {
				const refs = Array.from(referenceCells).map((cell) => cell.outerHTML);
				console.log('Extracted reference cells before printing:', refs);
				setReferenceValues(refs);
				return refs;
			}
			return [];
		};

		const currentRefs = extractCurrentReferenceValues();

		// Update sectionContent state to reflect current editor content
		setSectionContent({
			customerSection: extractedSections.customerSection,
			sampleInfoSection: extractedSections.sampleInfoSection,
			analysisSection: extractedSections.analysisSection,
			commentSection: extractedSections.commentSection || '',
			notesSection: extractedSections.notesSection,
			signatureSection: extractedSections.signatureSection,
		});

		// Create print window with custom title for PDF filename
		// Format current date as DD-MM-YYYY
		const today = new Date();
		const day = String(today.getDate()).padStart(2, '0');
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const year = today.getFullYear();
		const formattedDate = `${day}-${month}-${year}`;

		// Create window title with format: PPT-${sample_uid} DD-MM-YYYY
		const documentTitle = `PPT-${sample_uid} ${formattedDate}`;

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
			headerSpacing: 8, // spacing between header and content
			footerSpacing: 3, // removed spacing between content and footer
		};

		console.log('📐 Document dimensions:');
		console.log('- Screen DPI:', getDPI());
		console.log('- A4 paper:', `${A4.width}mm × ${A4.height}mm (${mmToPx(A4.width)}px × ${mmToPx(A4.height)}px)`);
		console.log(
			'- Margins:',
			`top: ${A4.topMargin}mm (${mmToPx(A4.topMargin)}px), bottom: ${A4.bottomMargin}mm (${mmToPx(
				A4.bottomMargin,
			)}px), sides: ${A4.sideMargin}mm (${mmToPx(A4.sideMargin)}px)`,
		);

		// Extract current sections from TinyMCE editor content
		function extractCurrentSections(currentContent) {
			// Create a temporary container to parse the current content
			const tempContainer = document.createElement('div');
			tempContainer.innerHTML = currentContent;

			// We'll extract sections based on known patterns and structures
			const extractedSections = {
				customerSection: '',
				sampleInfoSection: '',
				analysisSection: '',
				commentSection: '',
				notesSection: '',
				signatureSection: '',
			};

			// Find customer section (div containing "Customer information" text)
			const customerSectionDiv = Array.from(tempContainer.querySelectorAll('div')).find(
				(div) => div.innerHTML && div.innerHTML.includes('Customer information'),
			);

			// Look for the parent container of the customer section (typically a top-level div)
			if (customerSectionDiv) {
				// Find the closest parent that wraps the entire customer section
				let customerParent = customerSectionDiv;
				while (
					customerParent.parentElement &&
					customerParent.parentElement !== tempContainer &&
					!customerParent.style.border
				) {
					customerParent = customerParent.parentElement;
				}

				extractedSections.customerSection = customerParent.outerHTML;
			} else {
				extractedSections.customerSection = customerSectionHTML || sectionContent.customerSection;
			}

			// Find sample info section (div containing "Sample information" text)
			const sampleInfoDiv = Array.from(tempContainer.querySelectorAll('div')).find(
				(div) => div.innerHTML && div.innerHTML.includes('Sample information'),
			);

			// Look for the parent container of the sample info section
			if (sampleInfoDiv) {
				// Find the closest parent that wraps the entire sample info section
				let sampleParent = sampleInfoDiv;
				while (
					sampleParent.parentElement &&
					sampleParent.parentElement !== tempContainer &&
					!sampleParent.style.border
				) {
					sampleParent = sampleParent.parentElement;
					// If we reach a major section break, stop climbing
					if (sampleParent === tempContainer) break;
				}

				extractedSections.sampleInfoSection = sampleParent.outerHTML;
			} else {
				extractedSections.sampleInfoSection = sampleInfoSectionHTML || sectionContent.sampleInfoSection;
			}

			// Find analysis section (contains a table with "Tests" header)
			const analysisTable = tempContainer.querySelector('table');
			if (analysisTable && analysisTable.innerHTML.includes('Tests')) {
				// Find the parent container of the analysis section
				let analysisParent = analysisTable;
				while (analysisParent.parentElement && analysisParent.parentElement !== tempContainer) {
					analysisParent = analysisParent.parentElement;
					// If we reach a major section break, stop climbing
					if (analysisParent === tempContainer) break;
				}

				extractedSections.analysisSection = analysisParent.outerHTML;
			} else {
				extractedSections.analysisSection = analysisSectionHTML || sectionContent.analysisSection;
			}

			// Find comment section (div with "Comment:" text)
			const commentDiv = Array.from(tempContainer.querySelectorAll('div')).find(
				(div) => div.innerHTML && div.innerHTML.includes('Nhận xét / Comment:'),
			);

			if (commentDiv) {
				// Find the parent container of the comment section
				let commentParent = commentDiv;
				while (commentParent.parentElement && commentParent.parentElement !== tempContainer) {
					commentParent = commentParent.parentElement;
					// If we reach a major section break, stop climbing
					if (commentParent === tempContainer) break;
				}

				extractedSections.commentSection = commentParent.outerHTML;
			} else {
				extractedSections.commentSection = showComment ? commentSectionHTML || sectionContent.commentSection : '';
			}

			// Find notes section (div with "Note:" text)
			const notesDiv = Array.from(tempContainer.querySelectorAll('div')).find(
				(div) => div.innerHTML && div.innerHTML.includes('Ghi chú / Note:'),
			);

			if (notesDiv) {
				// Find the parent container of the notes section
				let notesParent = notesDiv;
				while (notesParent.parentElement && notesParent.parentElement !== tempContainer) {
					notesParent = notesParent.parentElement;
					// If we reach a major section break, stop climbing
					if (notesParent === tempContainer) break;
				}

				extractedSections.notesSection = notesParent.outerHTML;
			} else {
				extractedSections.notesSection = notesSectionHTML || sectionContent.notesSection;
			}

			// Find signature section (div with "Laboratory Manager" text)
			const signatureDiv = Array.from(tempContainer.querySelectorAll('div')).find(
				(div) => div.innerHTML && div.innerHTML.includes('Laboratory Manager'),
			);

			if (signatureDiv) {
				// Find the parent container of the signature section
				let signatureParent = signatureDiv;
				while (signatureParent.parentElement && signatureParent.parentElement !== tempContainer) {
					signatureParent = signatureParent.parentElement;
					// If we reach a major section break, stop climbing
					if (signatureParent === tempContainer) break;
				}

				extractedSections.signatureSection = signatureParent.outerHTML;
			} else {
				extractedSections.signatureSection = signatureSectionHTML || sectionContent.signatureSection;
			}

			return extractedSections;
		}

		// Pagination function with detailed logging and layout adjustment
		const paginateContent = () => {
			// Create temporary measuring elements
			const measureArea = document.createElement('div');
			measureArea.style.position = 'absolute';
			measureArea.style.visibility = 'hidden';
			measureArea.style.width = `${A4.width - 2 * A4.sideMargin}mm`; // Standard width without extra for VLAS
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

			// Define minimum spacing between content and footer (4mm)
			const minSpacingFromFooterMm = 0;
			const minSpacingFromFooterPx = mmToPx(minSpacingFromFooterMm);

			// Calculate available content height per page, accounting for spacing
			const availableContentHeightMm =
				A4.height -
				A4.topMargin -
				A4.bottomMargin -
				headerHeightMm -
				footerHeightMm -
				A4.headerSpacing -
				A4.footerSpacing -
				minSpacingFromFooterMm; // Account for minimum space above footer

			const availableContentHeightPx = mmToPx(availableContentHeightMm);

			// First, let's measure all sections individually
			const measureSection = (sectionHtml) => {
				measureArea.innerHTML = sectionHtml;
				return measureArea.offsetHeight;
			};

			const sectionHeights = {
				customerSection: measureSection(extractedSections.customerSection),
				sampleInfoSection: measureSection(extractedSections.sampleInfoSection),
				analysisSection: measureSection(extractedSections.analysisSection),
				commentSection: showComment ? measureSection(extractedSections.commentSection || '') : 0,
				notesSection: measureSection(extractedSections.notesSection),
				signatureSection: measureSection(extractedSections.signatureSection),
				spacing: measureSection(spacing),
				nextPageNotification: measureSection(nextPageNotification),
			};

			console.log('📏 Section heights (px):', sectionHeights);

			// Calculate total content height including spacing and optional comment section
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

			// Add comment section height if it's enabled
			if (showComment && extractedSections.commentSection) {
				totalContentHeight += sectionHeights.commentSection + sectionHeights.spacing;
			}

			// Calculate height of page 1 in special layout
			let page1SpecialLayoutHeight =
				sectionHeights.customerSection +
				sectionHeights.spacing +
				sectionHeights.sampleInfoSection +
				sectionHeights.spacing +
				sectionHeights.nextPageNotification +
				sectionHeights.spacing +
				sectionHeights.notesSection;

			// Calculate height of page 2 in special layout
			// Include comment section on page 2 with analysis section
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
			// Criteria:
			// 1. Total content exceeds 1 page
			// 2. Page 2 of special layout fits within 1 page
			// 3. Page 1 of special layout fits within 1 page
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

			// Decide which layout to use based on our analysis
			let contentPages = [];

			if (useSpecialLayout) {
				// Use the custom 2-page layout
				console.log('📄 Using custom 2-page layout with "see next page" notification');

				// Page 1: customerSection + sampleInfoSection + notification + notesSection
				const page1Elements = [
					extractedSections.customerSection,
					spacing,
					extractedSections.sampleInfoSection,
					spacing,
					nextPageNotification,
					spacing,
					extractedSections.notesSection,
				];

				const page1Content = page1Elements.join('');

				// Page 2: analysisSection + commentSection (if enabled) + signatureSection
				const page2Elements = [extractedSections.analysisSection, spacing];

				// Add comment section to page 2 after analysis section if enabled
				if (showComment && extractedSections.commentSection) {
					page2Elements.push(extractedSections.commentSection);
					page2Elements.push(spacing);
				}

				page2Elements.push(extractedSections.signatureSection);
				const page2Content = page2Elements.join('');

				contentPages = [page1Content, page2Content];
			} else {
				// Use standard sequential layout
				console.log('📄 Using standard sequential layout');

				// Create standard content with sequential sections
				const contentElements = [];
				contentElements.push(extractedSections.customerSection);
				contentElements.push(spacing);
				contentElements.push(extractedSections.sampleInfoSection);
				contentElements.push(spacing);
				contentElements.push(extractedSections.analysisSection);
				contentElements.push(spacing);

				if (showComment && extractedSections.commentSection) {
					contentElements.push(extractedSections.commentSection);
					contentElements.push(spacing);
				}

				contentElements.push(extractedSections.notesSection);
				contentElements.push(spacing);
				contentElements.push(extractedSections.signatureSection);

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
					// Ensure we maintain minimum spacing from footer
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
				const splitTableAcrossPages = (tableElement, recursionDepth = 0) => {
					// Add recursion depth counter to prevent stack overflow
					if (recursionDepth > 10) {
						console.warn('⚠️ Maximum recursion depth reached in table pagination - stopping to prevent stack overflow');
						currentPage.push(`<div style="color: red; padding: 5px;">Table pagination limit reached</div>`);
						return;
					}

					tableBreakCounts++;

					// Extract table structure
					const hasHeader = !!tableElement.querySelector('thead');
					const tableHeader = hasHeader ? tableElement.querySelector('thead').outerHTML : '';
					const rows = Array.from(tableElement.querySelectorAll('tbody tr'));

					// Exit early if no rows to process
					if (!rows.length) {
						console.log('No rows to process in table');
						currentPage.push(`<table ${tableAttributes}>${hasHeader ? tableHeader : ''}<tbody></tbody></table>`);
						return;
					}

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

					// Get the computed style heights directly from the source rows
					// Use a more efficient logging approach to avoid excessive console operations
					if (recursionDepth === 0) {
						console.log(
							`📏 EXTRACTING ROW HEIGHTS: ${rows.length} rows, ${remainingHeightPx.toFixed(1)}px available space`,
						);
					}

					// Extract actual computed heights from each row - use a more efficient approach
					const rowHeights = [];
					const rowHeightData = [];

					// Build a single string for the table header instead of multiple console.log calls
					let heightTableHeader = '';
					if (recursionDepth === 0) {
						heightTableHeader =
							'Row # | Computed | Offset | Height(mm) | % Available\n' +
							'------ | -------- | ------ | ---------- | -----------';
					}

					// Create a helper function to safely parse numeric values from computed styles
					const safeParseFloat = (value) => {
						if (!value) return 0;
						// First, ensure we're working with a string
						const strValue = String(value || '0');
						// Extract just the numeric part (remove 'px', '%', etc.)
						const numericPart = strValue.replace(/[^\d.-]/g, '');
						const result = parseFloat(numericPart);
						return isNaN(result) ? 0 : result;
					};

					// Function to get a reliable height measurement for a row
					const getReliableRowHeight = (row) => {
						try {
							// 1. Try direct DOM properties first (most reliable)
							const offsetHeight = row.offsetHeight || 0;
							const clientHeight = row.clientHeight || 0;
							const scrollHeight = row.scrollHeight || 0;

							// Get height from bounding client rect as another option
							const boundingHeight = row.getBoundingClientRect ? row.getBoundingClientRect().height : 0;

							// 2. Try computed style
							let computedHeight = 0;
							let totalCalculatedHeight = 0;

							// Get styles if possible
							try {
								const computedStyle = window.getComputedStyle(row);
								if (computedStyle) {
									// Extract values carefully
									computedHeight = safeParseFloat(computedStyle.height);

									// Calculate total height including padding, borders, and margins
									const paddingTop = safeParseFloat(computedStyle.paddingTop);
									const paddingBottom = safeParseFloat(computedStyle.paddingBottom);
									const borderTopWidth = safeParseFloat(computedStyle.borderTopWidth);
									const borderBottomWidth = safeParseFloat(computedStyle.borderBottomWidth);
									const marginTop = safeParseFloat(computedStyle.marginTop);
									const marginBottom = safeParseFloat(computedStyle.marginBottom);

									const boxSizing = computedStyle.boxSizing;

									// Adjust calculation based on box-sizing
									if (boxSizing === 'border-box') {
										// Content height already includes padding and border
										totalCalculatedHeight = computedHeight + marginTop + marginBottom;
									} else {
										// Content-box - need to add padding and borders
										totalCalculatedHeight =
											computedHeight +
											paddingTop +
											paddingBottom +
											borderTopWidth +
											borderBottomWidth +
											marginTop +
											marginBottom;
									}
								}
							} catch (styleError) {
								console.warn('Error accessing computed style:', styleError);
							}

							// 3. Determine the best value to use
							// Default to a minimum reasonable value for a table row if all else fails
							const DEFAULT_ROW_HEIGHT = 30; // 30px is a reasonable minimum height for a table row

							// Choose the most reliable value, in order of reliability
							let finalHeight;

							if (offsetHeight > 0) {
								// offsetHeight is usually the most reliable
								finalHeight = offsetHeight;
							} else if (boundingHeight > 0) {
								// boundingClientRect height is next most reliable
								finalHeight = boundingHeight;
							} else if (totalCalculatedHeight > 0) {
								// Use our calculated height if available
								finalHeight = totalCalculatedHeight;
							} else if (computedHeight > 0) {
								// Use just the computed height if that's all we have
								finalHeight = computedHeight;
							} else if (clientHeight > 0) {
								// clientHeight as a fallback
								finalHeight = clientHeight;
							} else if (scrollHeight > 0) {
								// scrollHeight as a last resort
								finalHeight = scrollHeight;
							} else {
								// Default height if all else fails
								finalHeight = DEFAULT_ROW_HEIGHT;
							}

							// Apply a small safety factor to prevent perfect edge cases causing overflows
							const safetyFactor = 1.02; // Add 2% to height to account for any rendering issues
							return finalHeight * safetyFactor;
						} catch (error) {
							console.warn('Error measuring row height:', error);
							return 30; // Default height of 30px
						}
					};

					// Process all rows to measure their heights
					rows.forEach((row, index) => {
						// Get a reliable height measurement for this row
						const rowHeightPx = getReliableRowHeight(row);

						// Convert to mm for logging
						const heightMm = pxToMm ? pxToMm(rowHeightPx) : rowHeightPx / 3.78;

						// Calculate percentage of available space
						const percentOfAvailable = (rowHeightPx / availableContentHeightPx) * 100;

						// Store the height
						rowHeights.push(rowHeightPx);

						// Only log detailed info for first 10 rows to avoid console spam
						if (recursionDepth === 0 && index < 10) {
							// Get offset height for comparison
							const offsetHeight = row.offsetHeight || 0;

							rowHeightData.push(
								`${(index + 1).toString().padStart(5)} | ` +
									`${rowHeightPx.toFixed(1).padStart(8)} | ` +
									`${offsetHeight.toFixed(1).padStart(6)} | ` +
									`${heightMm.toFixed(2).padStart(10)} | ` +
									`${percentOfAvailable.toFixed(1).padStart(9)}%`,
							);
						}
					});

					// Log the height data table only on the first recursion level
					if (recursionDepth === 0 && rowHeightData.length > 0) {
						console.log(heightTableHeader);
						console.log(rowHeightData.join('\n'));

						// Log a summary of the measurements
						console.log(`📏 ROW HEIGHT SUMMARY:`);
						console.log(
							`- Average row height: ${(rowHeights.reduce((sum, h) => sum + h, 0) / rowHeights.length).toFixed(1)}px`,
						);
						console.log(
							`- Min height: ${Math.min(...rowHeights).toFixed(1)}px, Max height: ${Math.max(...rowHeights).toFixed(
								1,
							)}px`,
						);
					}

					// Try to fit as many rows as possible in the first part using measured heights
					let rowsInFirstPart = [];
					let remainingRows = [...rows];
					let totalUsedHeight = 0;
					let totalRemainingHeight = remainingHeightPx;

					let lastFittedRow = -1;

					// Use computed heights to determine how many rows fit
					if (recursionDepth === 0) {
						console.log(`🔍 FITTING ROWS ON PAGE ${contentPages.length + 1}`);
					}

					for (let i = 0; i < rows.length; i++) {
						const rowHeightPx = rowHeights[i];

						if (rowHeightPx <= totalRemainingHeight) {
							// This row fits
							rowsInFirstPart.push(rows[i]);
							totalRemainingHeight -= rowHeightPx;
							totalUsedHeight += rowHeightPx;
							lastFittedRow = i;
						} else {
							// This row doesn't fit - stop processing
							break;
						}
					}

					// Remove the rows that fit from the remaining rows
					if (lastFittedRow >= 0) {
						remainingRows = rows.slice(lastFittedRow + 1);
					}

					// Log a summary of what fits on this page (only on first recursion level)
					if (recursionDepth === 0) {
						console.log(`- ${rowsInFirstPart.length} of ${rows.length} rows fit on page ${contentPages.length + 1}`);
						console.log(
							`- Height used: ${totalUsedHeight.toFixed(1)}px, Remaining: ${totalRemainingHeight.toFixed(1)}px`,
						);
					}

					// Continue with the rest of the function as before...
					// ...existing code...
					// Finish the first part of the table
					if (rowsInFirstPart.length > 0) {
						rowsInFirstPart.forEach((row) => {
							// Preserve original row height in output
							const rowIndex = rows.indexOf(row);
							const rowHeight = rowHeights[rowIndex];
							const heightAttr = `data-original-height="${rowHeight}"`;

							// Add original height as data attribute for debugging
							const rowHtml = row.outerHTML.replace('<tr', `<tr ${heightAttr}`);
							firstPartHTML += rowHtml;
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

							// Try to fit as many remaining rows as possible using computed heights
							if (recursionDepth === 0) {
								console.log(`🔍 CONTINUATION TABLE ON PAGE ${contentPages.length + 1}`);
							}

							lastFittedRow = -1;
							for (let i = 0; i < remainingRows.length; i++) {
								const row = remainingRows[i];
								const rowIndex = rows.indexOf(row);
								const rowHeightPx = rowHeights[rowIndex] || 30;

								if (currentPageHeightPx + rowHeightPx <= availableContentHeightPx) {
									// This row fits on continuation page
									rowsInCurrentPart.push(row);
									currentPageHeightPx += rowHeightPx;
									lastFittedRow = i;
								} else if (i === 0) {
									// Force at least one row even if it overflows
									rowsInCurrentPart.push(row);
									lastFittedRow = 0;
									break;
								} else {
									// This row doesn't fit, and we already have content - stop processing
									break;
								}
							}

							// Remove the rows that fit from remaining rows
							if (lastFittedRow >= 0) {
								remainingRows = remainingRows.slice(lastFittedRow + 1);
							}

							// Add rows to continuation table with original height attributes
							rowsInCurrentPart.forEach((row) => {
								const rowIndex = rows.indexOf(row);
								const rowHeight = rowHeights[rowIndex] || 30;
								const heightAttr = `data-original-height="${rowHeight}"`;

								// Add original height as data attribute
								const rowHtml = row.outerHTML.replace('<tr', `<tr ${heightAttr}`);
								continuationHTML += rowHtml;
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
									const rowIndex = rows.indexOf(row);
									const rowHeight = rowHeights[rowIndex] || 30;
									const heightAttr = `data-original-height="${rowHeight}"`;

									// Add original height as data attribute
									const rowHtml = row.outerHTML.replace('<tr', `<tr ${heightAttr}`);
									remainingTableHTML += rowHtml;
								});
								remainingTableHTML += '</tbody></table>';

								// Create a DOM element from the HTML
								const tempDiv = document.createElement('div');
								tempDiv.innerHTML = remainingTableHTML;
								const remainingTableElement = tempDiv.firstChild;

								// Reset for next page
								currentPage = [];
								currentPageHeightPx = 0;

								// Process remaining rows recursively - increment recursion depth
								splitTableAcrossPages(remainingTableElement, recursionDepth + 1);
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

						// Try again with empty page - increment recursion depth
						splitTableAcrossPages(tableElement, recursionDepth + 1);
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

		// Get paginated content
		const paginationResult = paginateContent();

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
							margin: ${A4.topMargin}mm ${A4.sideMargin}mm ${A4.bottomMargin}mm ${A4.sideMargin}mm;
						}
						
						html, body {
							margin: 0;
							padding: 0;
							font-family: 'Gilroy', sans-serif !important;
							background-color: #f0f0f0;
						}
						
						/* Style for anchor tags in printing - no underline, black text, not bold */
						a {
							text-decoration: none;
							color: black;
							font-weight: normal;
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
							font-family: 'Gilroy', sans-serif !important;
							table-layout: fixed; /* Helps with consistent row heights */
							min-width: 100%;
	
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
							box-sizing: border-box !important; /* Ensure padding is included in height */
						}
						
						/* Fix paragraph styling in table cells */
						table td p, table th p {
							margin: 0;
							padding: 0;
							line-height: 1.2;
							font-family: 'Gilroy', sans-serif !important;
							font-size: 12px;
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
							
							/* Ensure anchor styling is maintained in print */
							a {
								text-decoration: none !important;
								color: black !important;
								font-weight: normal !important;
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
							
							/* Critical: ensure box-sizing is consistent in print mode */
							table, table td, table th {
								box-sizing: border-box !important;
							}
							
							/* Adjust column widths for print view to account for padding+border */
							@media print {
								table td, table th {
									box-sizing: border-box !important;
									padding: 4px 8px !important;
									border-width: 1px !important;
								}
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
								// Fix for VLAS icon positioning in print view
								const vlasIcons = document.querySelectorAll('.vlas_icon');
								vlasIcons.forEach(icon => {
									icon.style.overflow = 'visible';
									if (icon.querySelector('img')) {
										icon.querySelector('img').style.maxWidth = 'none';
									}
								});
								// window.print();
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
				.replace(`>00</span>`, `>${pageNumber}</span>`)
				.replace(`>00</span>`, `>${totalPages}</span>`);

			const page = document.createElement('div');
			page.className = 'page';

			// Ensure pageContent is a string regardless of whether it's an array or already a string
			const pageContentHTML =
				typeof pageContent === 'string'
					? pageContent
					: Array.isArray(pageContent)
					? pageContent.join('')
					: String(pageContent);

			// Measure the actual content height for this page
			const tempMeasureDiv = document.createElement('div');
			tempMeasureDiv.style.position = 'absolute';
			tempMeasureDiv.style.visibility = 'hidden';
			tempMeasureDiv.style.width = `${A4.width - 2 * A4.sideMargin}mm`;
			tempMeasureDiv.innerHTML = pageContentHTML;
			document.body.appendChild(tempMeasureDiv);

			const actualContentHeight = tempMeasureDiv.offsetHeight;
			const actualContentHeightMm = pxToMm(actualContentHeight);
			const percentOfAvailable = (actualContentHeight / paginationResult.availableContentHeightPx) * 100;
			const remainingSpace = paginationResult.availableContentHeightPx - actualContentHeight;
			const remainingSpaceMm = pxToMm(remainingSpace);

			console.log(`📃 Final Page ${pageNumber}/${totalPages} content measurements:`);
			console.log(`- Content height: ${actualContentHeight.toFixed(1)}px (${actualContentHeightMm.toFixed(2)}mm)`);
			console.log(`- ${percentOfAvailable.toFixed(1)}% of available space used`);
			console.log(`- Remaining space: ${remainingSpace.toFixed(1)}px (${remainingSpaceMm.toFixed(2)}mm)`);

			document.body.removeChild(tempMeasureDiv);

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

	// Function to handle publishing a new report
	const handlePublishNewReport = () => {
		const isRepublishing = pptList.length > 0;
		const confirmMessage = isRepublishing
			? 'Bạn có chắc chắn muốn phát hành phiếu phân tích này? Phiếu phân tích cũ sẽ vẫn được lưu trữ trong hệ thống.'
			: 'Bạn có chắc chắn muốn phát hành phiếu phân tích này?';

		// Replace window.confirm with SweetAlert2
		Swal.fire({
			title: 'Xác nhận',
			text: confirmMessage,
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Xác nhận',
			cancelButtonText: 'Hủy',
		}).then((result) => {
			if (result.isConfirmed) {
				publishReport('publish');
			}
		});
	};

	// Add handler for the SAVE button
	const handleSaveReport = () => {
		Swal.fire({
			title: 'Xác nhận',
			text: 'Bạn có chắc chắn muốn lưu phiếu phân tích này?',
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Xác nhận',
			cancelButtonText: 'Hủy',
		}).then((result) => {
			if (result.isConfirmed) {
				publishReport('save');
			}
		});
	};

	// Rename the original function to publishReport and add type parameter
	const publishReport = async (type) => {
		try {
			setLoading(true);

			// Get the most current content from TinyMCE editors
			let currentHeader = header;
			let currentFooter = footer;
			let currentContent = content;

			if (contentRef.current && window.tinymce) {
				const contentEditor = window.tinymce.get(contentRef.current?.id);
				if (contentEditor) {
					currentContent = contentEditor.getContent();
				}

				const headerElements = document.getElementsByClassName('header-editable');
				if (headerElements.length > 0 && headerElements[0].id) {
					const headerEditor = window.tinymce.get(headerElements[0].id);
					if (headerEditor) {
						currentHeader = headerEditor.getContent();
					}
				}

				const footerElements = document.getElementsByClassName('footer-editable');
				if (footerElements.length > 0 && footerElements[0].id) {
					const footerEditor = window.tinymce.get(footerElements[0].id);
					if (footerEditor) {
						currentFooter = footerEditor.getContent();
					}
				}
			}

			// Extract all sections from the current editor content
			const extractedSections = extractCurrentSections(currentContent);

			// Get current reference values from the editor
			const getCurrentReferenceValues = () => {
				if (contentRef.current && window.tinymce) {
					const contentEditor = window.tinymce.get(contentRef.current?.id);
					if (contentEditor) {
						const currentContent = contentEditor.getContent();
						const tempDiv = document.createElement('div');
						tempDiv.innerHTML = currentContent;

						const referenceCells = tempDiv.querySelectorAll('.reference-cell');
						if (referenceCells.length > 0) {
							return Array.from(referenceCells).map((cell) => cell.innerHTML.trim());
						}
					}
				}
				return referenceValues.map((cellHtml) => {
					// Extract inner HTML from the cell HTML
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = cellHtml;
					return tempDiv.textContent.trim();
				});
			};

			// Prepare the request body
			const requestBody = {
				sample_uid: sample_uid,
				header_section: currentHeader,
				footer_section: currentFooter,
				customer_section: extractedSections.customerSection,
				analysis_section: extractedSections.analysisSection,
				sample_section: extractedSections.sampleInfoSection,
				note_section: extractedSections.notesSection,
				signature_section: extractedSections.signatureSection,
				comment_section: extractedSections.commentSection || '',
				reference: getCurrentReferenceValues(),
				is_vlas: showVlas,
				is_comment: showComment,
				is_reference: showReference,
				created_by_uid: currentUser.identity_uid,
				receipt_note: receiptNote,
				additional_request: additionalRequest,
			};

			console.log(`${type === 'publish' ? 'Publishing' : 'Saving'} report with data:`, requestBody);

			// Send the data to the API with the type parameter
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/insert/ppt', {
				report: requestBody,
				type: type, // Add the type param (publish/save)
			});

			if (response.status !== 200) {
				throw new Error(`API request failed with status ${response.status}`);
			}

			const result = response.data;
			console.log(`${type === 'publish' ? 'Published' : 'Saved'} successfully:`, result);

			// If we get a ppt_uid back from the API, update our state and URL
			if (result && result.ppt_uid) {
				const newPptUid = result.ppt_uid;
				setPptUid(newPptUid);

				// Add the new ppt_uid to the pptList if it's not already there
				setPptList((prevList) => {
					// Check if the item with this ppt_uid already exists
					const exists = prevList.some((item) => item.ppt_uid === newPptUid);
					if (!exists) {
						const newItem = {
							ppt_uid: newPptUid,
							publish_date: new Date().toISOString(),
						};
						return [...prevList, newItem];
					}
					return prevList;
				});

				// Update the URL with the new ppt_uid
				setSearchParams((params) => {
					params.set('ppt_uid', newPptUid);
					return params;
				});

				// Show success notification
				showNotification(`${type === 'publish' ? 'Phát hành' : 'Lưu'} phiếu phân tích thành công!`, 'success');

				// Set isReadOnly based on whether this is a draft
				const isDraft = newPptUid.includes('DRAFT');
				// setIsReadOnly(!isDraft);
			} else {
				// Show error notification
				showNotification(
					`${type === 'publish' ? 'Phát hành' : 'Lưu'} không thành công, không nhận được mã phiếu`,
					'error',
				);
			}
		} catch (err) {
			console.error(`Error ${type === 'publish' ? 'publishing' : 'saving'} report:`, err);
			// Replace alert with SweetAlert2
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: `${type === 'publish' ? 'Phát hành' : 'Lưu'} không thành công: ${err.message}`,
			});
		} finally {
			setLoading(false);
		}
	};

	// Add helper function to extract all current sections from editor content
	function extractCurrentSections(currentContent) {
		// Create a temporary container to parse the current content
		const tempContainer = document.createElement('div');
		tempContainer.innerHTML = currentContent;

		// We'll extract sections based on known patterns and structures
		const extractedSections = {
			customerSection: '',
			sampleInfoSection: '',
			analysisSection: '',
			commentSection: '',
			notesSection: '',
			signatureSection: '',
		};

		// Find customer section (div containing "Customer information" text)
		const customerSectionDiv = Array.from(tempContainer.querySelectorAll('div')).find(
			(div) => div.innerHTML && div.innerHTML.includes('Customer information'),
		);

		// Look for the parent container of the customer section (typically a top-level div)
		if (customerSectionDiv) {
			// Find the closest parent that wraps the entire customer section
			let customerParent = customerSectionDiv;
			while (
				customerParent.parentElement &&
				customerParent.parentElement !== tempContainer &&
				!customerParent.style.border
			) {
				customerParent = customerParent.parentElement;
			}

			extractedSections.customerSection = customerParent.outerHTML;
		} else {
			extractedSections.customerSection = customerSectionHTML || sectionContent.customerSection;
		}

		// Find sample info section (div containing "Sample information" text)
		const sampleInfoDiv = Array.from(tempContainer.querySelectorAll('div')).find(
			(div) => div.innerHTML && div.innerHTML.includes('Sample information'),
		);

		// Look for the parent container of the sample info section
		if (sampleInfoDiv) {
			// Find the closest parent that wraps the entire sample info section
			let sampleParent = sampleInfoDiv;
			while (sampleParent.parentElement && sampleParent.parentElement !== tempContainer && !sampleParent.style.border) {
				sampleParent = sampleParent.parentElement;
				// If we reach a major section break, stop climbing
				if (sampleParent === tempContainer) break;
			}

			extractedSections.sampleInfoSection = sampleParent.outerHTML;
		} else {
			extractedSections.sampleInfoSection = sampleInfoSectionHTML || sectionContent.sampleInfoSection;
		}

		// Find analysis section (contains a table with "Tests" header)
		const analysisTable = tempContainer.querySelector('table');
		if (analysisTable && analysisTable.innerHTML.includes('Tests')) {
			// Find the parent container of the analysis section
			let analysisParent = analysisTable;
			while (analysisParent.parentElement && analysisParent.parentElement !== tempContainer) {
				analysisParent = analysisParent.parentElement;
				// If we reach a major section break, stop climbing
				if (analysisParent === tempContainer) break;
			}

			extractedSections.analysisSection = analysisParent.outerHTML;
		} else {
			extractedSections.analysisSection = analysisSectionHTML || sectionContent.analysisSection;
		}

		// Find comment section (div with "Comment:" text)
		const commentDiv = Array.from(tempContainer.querySelectorAll('div')).find(
			(div) => div.innerHTML && div.innerHTML.includes('Nhận xét / Comment:'),
		);

		if (commentDiv) {
			// Find the parent container of the comment section
			let commentParent = commentDiv;
			while (commentParent.parentElement && commentParent.parentElement !== tempContainer) {
				commentParent = commentParent.parentElement;
				// If we reach a major section break, stop climbing
				if (commentParent === tempContainer) break;
			}

			extractedSections.commentSection = commentParent.outerHTML;
		} else {
			extractedSections.commentSection = showComment ? commentSectionHTML || sectionContent.commentSection : '';
		}

		// Find notes section (div with "Note:" text)
		const notesDiv = Array.from(tempContainer.querySelectorAll('div')).find(
			(div) => div.innerHTML && div.innerHTML.includes('Ghi chú / Note:'),
		);

		if (notesDiv) {
			// Find the parent container of the notes section
			let notesParent = notesDiv;
			while (notesParent.parentElement && notesParent.parentElement !== tempContainer) {
				notesParent = notesParent.parentElement;
				// If we reach a major section break, stop climbing
				if (notesParent === tempContainer) break;
			}

			extractedSections.notesSection = notesParent.outerHTML;
		} else {
			extractedSections.notesSection = notesSectionHTML || sectionContent.notesSection;
		}

		// Find signature section (div with "Laboratory Manager" text)
		const signatureDiv = Array.from(tempContainer.querySelectorAll('div')).find(
			(div) => div.innerHTML && div.innerHTML.includes('Laboratory Manager'),
		);

		if (signatureDiv) {
			// Find the parent container of the signature section
			let signatureParent = signatureDiv;
			while (signatureParent.parentElement && signatureParent.parentElement !== tempContainer) {
				signatureParent = signatureParent.parentElement;
				// If we reach a major section break, stop climbing
				if (signatureParent === tempContainer) break;
			}

			extractedSections.signatureSection = signatureParent.outerHTML;
		} else {
			extractedSections.signatureSection = signatureSectionHTML || sectionContent.signatureSection;
		}

		return extractedSections;
	}

	// Update the print method to use the prepared content
	useEffect(() => {
		if (contentRef.current && window.getComputedStyle) {
			// Apply initial line heights to the editor for WYSIWYG experience
			const editorStyleElement = document.createElement('style');
			editorStyleElement.textContent = `
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
				
				.content-editable p, .content-editable div, .content-editable span,
					.content-editable td, .content-editable th, .content-editable li,
				.header-editable p, .header-editable div, .header-editable span,
				.footer-editable p, .footer-editable div, .footer-editable span {
					line-height: inherit;
					margin-top: 0;
					margin-bottom: 0;
					font-family: 'Gilroy', sans-serif !important;
				}
				
				/* Table styling in editor */
				.content-editable table {
					border-collapse: collapse;
					table-layout: fixed;
					font-family: 'Gilroy', sans-serif !important;
				}
				
				/* Table cell paragraph styling in editor */
				.content-editable table td p, .content-editable table th p {
					margin: 0 !important;
					padding: 0 !important;
					line-height: 1.2 !important;
					font-size: 12px;
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

	// Add a reference to track previous showReference state
	const ref = useRef(showReference);

	// Effect to update content when toggle states change
	useEffect(() => {
		// Capture current reference values when toggling reference column
		const handleReferenceToggle = (prevShowRef, newShowRef) => {
			// When turning reference column off, save current values
			if (prevShowRef && !newShowRef) {
				if (contentRef.current && window.tinymce) {
					const contentEditor = window.tinymce.get(contentRef.current?.id);
					if (contentEditor) {
						const currentContent = contentEditor.getContent();
						const tempDiv = document.createElement('div');
						tempDiv.innerHTML = currentContent;

						const referenceCells = tempDiv.querySelectorAll('.reference-cell');
						if (referenceCells.length > 0) {
							const extractedRefs = Array.from(referenceCells).map((cell) => cell.outerHTML);
							console.log(`Reference column turned OFF: Saved ${extractedRefs.length} reference values`, extractedRefs);
							setReferenceValues(extractedRefs);
						}
					}
				}
			}

			// When turning reference column on, use stored values or initialize new ones
			if (!prevShowRef && newShowRef) {
				console.log(`Reference column turned ON: Using ${referenceValues.length} stored reference values`);
			}
		};

		// Track reference toggle
		if (sampleData) {
			// Call handleReferenceToggle before updating the content to ensure we capture current state
			handleReferenceToggle(ref.current, showReference);
			// Update the content with new state
			updateContentWithData(sampleData);
		}

		// Store current reference state for comparison on next render
		ref.current = showReference;

		// Update header when VLAS state changes
		const updateVlasVisibility = () => {
			// Create a temporary container to avoid direct string manipulation
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = header;

			// Find the VLAS icon element
			const vlasIcon = tempDiv.querySelector('.vlas_icon');

			if (vlasIcon) {
				// Update the style directly on the DOM element
				if (showVlas) {
					vlasIcon.style.display = ''; // Show the element
				} else {
					vlasIcon.style.display = 'none'; // Hide the element
				}

				// Update the header state with the modified HTML
				setHeader(tempDiv.innerHTML);

				// If we're in the editor, also update the TinyMCE content
				if (window.tinymce) {
					const headerElements = document.getElementsByClassName('header-editable');
					if (headerElements.length > 0 && headerElements[0].id) {
						const headerEditor = window.tinymce.get(headerElements[0].id);
						if (headerEditor) {
							headerEditor.setContent(tempDiv.innerHTML);
						}
					}
				}
			}
		};

		// Call the function to update VLAS visibility
		updateVlasVisibility();
	}, [showVlas, showComment, showReference, sampleData]);

	// Custom function to show notifications with SweetAlert instead of alert
	const showNotification = (message, type = 'success') => {
		const Toast = Swal.mixin({
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 3000,
			timerProgressBar: true,
			didOpen: (toast) => {
				toast.addEventListener('mouseenter', Swal.stopTimer);
				toast.addEventListener('mouseleave', Swal.resumeTimer);
			},
			customClass: {
				popup: `colored-toast swal2-icon-${type}`,
			},
		});

		Toast.fire({
			icon: type,
			title: message,
		});
	};

	// Function to format date string for display
	const formatPublishDate = (dateString) => {
		if (!dateString) return '';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('vi-VN', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch (error) {
			console.error('Error formatting date:', error);
			return dateString;
		}
	};

	// Add a new detailed table measurement function for print time
	const performDetailedTableMeasurements = () => {
		console.log('🔍 PERFORMING DETAILED TABLE MEASUREMENTS FOR PRINT');

		// First debug the table rows in the DOM
		debugTableRows(true);

		// Measure table row heights with detailed logging
		measureTableRowHeights(true);

		// Extract table dimensions with detailed logging
		extractTableDimensions(true);

		// Additional table header measurement - detailed logging of thead element
		if (contentRef.current && window.tinymce) {
			const contentEditor = window.tinymce.get(contentRef.current?.id);
			if (contentEditor) {
				const tableHeader = contentEditor.getBody().querySelector('table thead');
				if (tableHeader) {
					const headerComputedStyle = window.getComputedStyle(tableHeader);
					console.log('📏 TABLE HEADER <thead> MEASUREMENTS:', {
						element: 'thead',
						height: headerComputedStyle.height,
						padding: {
							top: headerComputedStyle.paddingTop,
							right: headerComputedStyle.paddingRight,
							bottom: headerComputedStyle.paddingBottom,
							left: headerComputedStyle.paddingLeft,
						},
						border: {
							top: headerComputedStyle.borderTopWidth,
							right: headerComputedStyle.borderRightWidth,
							bottom: headerComputedStyle.borderBottomWidth,
							left: headerComputedStyle.borderLeftWidth,
						},
						boxSizing: headerComputedStyle.boxSizing,
						display: headerComputedStyle.display,
					});

					// Also measure the tr within thead
					const headerRow = tableHeader.querySelector('tr');
					if (headerRow) {
						const headerRowStyle = window.getComputedStyle(headerRow);
						console.log('📏 TABLE HEADER ROW <thead tr> MEASUREMENTS:', {
							element: 'thead > tr',
							height: headerRowStyle.height,
							padding: {
								top: headerRowStyle.paddingTop,
								right: headerRowStyle.paddingRight,
								bottom: headerRowStyle.paddingBottom,
								left: headerRowStyle.paddingLeft,
							},
							border: {
								top: headerRowStyle.borderTopWidth,
								right: headerRowStyle.borderRightWidth,
								bottom: headerRowStyle.borderBottomWidth,
								left: headerRowStyle.borderLeftWidth,
							},
							boxSizing: headerRowStyle.boxSizing,
							display: headerRowStyle.display,
						});
					}
				}
			}
		}

		// Log the final data
		console.log('📊 DETAILED MEASUREMENTS COMPLETE - READY FOR PRINT');
	};

	return (
		<div className="p-4 bg-gray-100 min-h-screen relative mt-1">
			<div className="mb-4 flex flex-col gap-4 items-end min-w-[800px]">
				<div className="flex justify-between items-center w-full">
					<select
						className="px-4 py-1.5 focus:outline-none border-2 border-gray-500 rounded-lg bg-white w-96"
						value={pptUid}
						onChange={handleReportSelectionChange}
					>
						<option value="">Phát hành mới</option>
						{pptList &&
							pptList.map((item, index) => (
								<option key={index} value={item.ppt_uid} className="flex justify-between">
									{item.ppt_uid} - {formatPublishDate(item.publish_date)}
								</option>
							))}
					</select>
					<div>
						{loading && <span className="px-4 py-2 bg-yellow-500 text-white rounded">Đang tải dữ liệu mẫu...</span>}
						{error && <span className="px-4 py-2 bg-red-500 text-white rounded">Lỗi: {error}</span>}

						<button
							onClick={handleSaveReport}
							className={`px-4 py-1 focus:outline-none border-2 border-gray-500 rounded-lg ml-2 active:bg-blue-700 ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
							}`}
							disabled={isReadOnly}
						>
							SAVE
						</button>

						<button
							onClick={handlePublishNewReport}
							className={`px-4 py-1 focus:outline-none border-2 border-gray-500 rounded-lg ml-2 active:bg-blue-700 ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
							}`}
							disabled={isReadOnly}
						>
							PUBLISH
						</button>

						<button
							onClick={handlePrint}
							className="px-4 py-1 focus:outline-none border-2 border-gray-500 rounded-lg ml-2 active:bg-blue-700"
						>
							PRINT / PDF
						</button>
					</div>
				</div>
				<div className="flex justify-between items-center w-full">
					<p className="text-gray-500 text-lg">Tùy chọn hiển thị:</p>
					<div>
						<button
							onClick={() => !isReadOnly && setShowVlas((prev) => !prev)}
							className={`${
								showVlas ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
							} px-4 py-1 w-32 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
							}`}
							disabled={isReadOnly}
						>
							VLAS
						</button>

						<button
							onClick={() => !isReadOnly && setShowComment((prev) => !prev)}
							className={`${
								showComment ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
							} px-4 py-1 w-32 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
							}`}
							disabled={isReadOnly}
						>
							COMMENT
						</button>

						<button
							onClick={() => {
								if (!isReadOnly) {
									// Store previous reference state before changing it
									const prevShowRef = showReference;
									setShowReference(!prevShowRef);
								}
							}}
							className={`${
								showReference ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
							} px-4 py-1 w-32 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
							}`}
							disabled={isReadOnly}
						>
							REFERENCE
						</button>
						{/* Simple arrow using a div instead of pseudo-element */}
						<div className="absolute -left-2 top-5 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-green-50"></div>
					</div>
				</div>
			</div>

			{/* </div>
			</div>
ft chat bubble for Ghi chú/Note */}
			{receiptNote && (
				<div className="fixed right-4 text-start top-20 w-56 max-h-60 overflow-y-auto overflow-x-hidden bg-blue-50 rounded-lg border border-blue-200 shadow-md p-3 z-10">
					<div className="font-bold text-gray-700 text-sm mb-2">Ghi chú / Note:</div>
					<div className="text-gray-600 text-sm whitespace-pre-wrap">{receiptNote}</div>
					{/* Simple arrow using a div instead of pseudo-element */}
					<div className="absolute -right-2 top-5 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-blue-50"></div>
				</div>
			)}

			{/* Right chat bubble for Yêu cầu/Requirements */}
			{additionalRequest && (
				<div className="fixed right-4 text-start top-96 w-56 max-h-60 overflow-y-auto bg-green-50 rounded-lg border border-green-200 shadow-md p-3 z-10">
					<div className="font-bold text-blue-700 text-sm mb-2">Yêu cầu / Requirements:</div>
					<div className="text-blue-600 text-sm whitespace-pre-wrap">{additionalRequest}</div>
					{/* Simple arrow using a div instead of pseudo-element */}
					<div className="absolute -left-2 top-5 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-green-50"></div>
				</div>
			)}

			<div className="flex flex-col gap-4 overflow-x-auto p-4 bg-white shadow-lg rounded-lg">
				<div className="flex justify-center">
					{/* Main editor content */}
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
							className={`header-editable editable text-center font-bold text-lg border-b px-0 pt-8 pb-4 ${
								isReadOnly ? 'read-only' : ''
							}`}
							style={{ fontFamily: 'Gilroy, sans-serif', width: '100%' }}
							dangerouslySetInnerHTML={{
								__html: header.replace(/SƠ BỘ \/ DRAFT/g, pptUid || 'SƠ BỘ / DRAFT'),
							}}
						/>
						<div
							id="content-edit"
							ref={contentRef}
							className={`content-editable editable border-0 px-0 py-2 text-base my-4 ${isReadOnly ? 'read-only' : ''}`}
							style={{ fontFamily: 'Gilroy, sans-serif', width: '100%' }}
							dangerouslySetInnerHTML={{ __html: content }}
						/>
						<div
							id="footer-edit"
							className={`footer-editable editable px-0 pb-8 pt-4 ${isReadOnly ? 'read-only' : ''}`}
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
