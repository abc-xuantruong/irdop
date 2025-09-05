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

	// Add new state to store related samples from the same receipt
	const [relatedSamples, setRelatedSamples] = useState([]);
	const navigate = useNavigate();

	// Add state to track if we're in read-only mode (when a ppt_uid is in the URL)
	const [isReadOnly, setIsReadOnly] = useState(false);

	// Add new toggle states for VLAS, COMMENT, REFERENCE, ENGLISH, REPLACE, SIGN, and KN
	const [showVlas, setShowVlas] = useState(false);
	const [showComment, setShowComment] = useState(false);
	const [showReference, setShowReference] = useState(false);
	const [showEnglish, setShowEnglish] = useState(false);
	const [showReplace, setShowReplace] = useState(false);
	const [showSign, setShowSign] = useState(false);
	const [showKN, setShowKN] = useState(false);

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
					setLoading(true);
					const response = await apiGet(`https://black.irdop.org/to82oe92i/db/sample/get/ppt_uid/${sample_uid}`);

					if (response.status !== 200) {
						throw new Error(`PPT list API request failed with status ${response.status}`);
					}

					const pptData = response.data || [];
					console.log(pptData);
					setPptList(pptData);

					// If there are reports available
					if (pptData.length > 0) {
						if (isChangingSample) {
							// When changing samples, automatically select the most recent report
							// Sort by publish_date to find the most recent
							const sortedPpts = [...pptData].sort((a, b) => {
								return new Date(b.publish_date) - new Date(a.publish_date);
							});

							if (sortedPpts.length > 0) {
								const mostRecentPptUid = sortedPpts[0].ppt_uid;
								setPptUid(mostRecentPptUid);

								// Update URL with the most recent ppt_uid
								setSearchParams((params) => {
									params.set('ppt_uid', mostRecentPptUid);
									return params;
								});

								// Load the most recent published report
								await loadPublishedReport(mostRecentPptUid);
								setIsChangingSample(false);
							}
						}
						// If a specific ppt_uid was requested in URL
						else if (selected_ppt_uid) {
							setPptUid(selected_ppt_uid);
							await loadPublishedReport(selected_ppt_uid);
						}
					} else {
						// If no reports exist for this sample
						if (isChangingSample) {
							// Reset to default state when changing to a sample with no reports
							setPptUid('');
							setSearchParams((params) => {
								params.delete('ppt_uid');
								return params;
							});

							// Load the sample data for a new report
							await fetchSampleData();
							setIsChangingSample(false);
						} else if (!selected_ppt_uid) {
							// If no ppt_uid was specified and not changing samples, load sample data
							await fetchSampleData();
						}
					}

					setLoading(false);
				} catch (err) {
					console.error('Error fetching PPT list:', err);
					setLoading(false);

					// Even if fetching PPT list fails, reset changing sample flag
					if (isChangingSample) {
						setIsChangingSample(false);

						// Try to load the sample data as fallback
						fetchSampleData();
					}
				}
			}
		};

		fetchPptList();
	}, [sample_uid]); // This effect now depends on sample_uid changes

	// Function to load a published report
	const loadPublishedReport = async (reportId) => {
		setLoading(true);
		try {
			const response = await apiGet(`https://black.irdop.org/to82oe92i/db/get/report/${reportId}`);

			if (response.status !== 200) {
				throw new Error(`Report API request failed with status ${response.status}`);
			}

			const reportData = response.data; // Update all relevant states with the fetched report data
			setPptUid(reportData.ppt_uid || '');
			setShowVlas(reportData.is_vlas || false);
			const hasCommentFromAPI = reportData.is_comment || false;
			setShowComment(hasCommentFromAPI);
			setShowReference(reportData.is_reference || false);
			setShowReplace(reportData.is_replace || false);
			setShowSign(reportData.is_sign || false);

			// Process the header content to replace the draft text with actual ppt_uid
			let processedHeader = reportData.header_section || header;

			// Make sure to preserve the original processedHeader from API without replacing the date
			if (reportData.ppt_uid && !reportData.ppt_uid.includes('DRAFT')) {
				// Replace any draft text variations with the actual ppt_uid
				processedHeader = processedHeader
					.replace(
						/<p[^>]*class="[^"]*ref_code[^>]*>.*?<\/p>/i,
						`<p class="ref_code" style="min-width:5pt; margin: 0; margin-right: 2mm;">${reportData.ppt_uid}</p>`,
					)
					.replace(/SƠ BỘ \/ DRAFT/g, reportData.ppt_uid)
					.replace(/-- SƠ BỘ \/ DRAFT --/g, reportData.ppt_uid);
			}

			// Update HTML content with processed header
			setHeaderHTML(processedHeader);
			setHeader(processedHeader); // Also update the header state to ensure it's consistently used
			setFooterHTML(reportData.footer_section || footer);
			setFooter(reportData.footer_section || footer); // Also update footer state
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
						`<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${refValue}</td>`,
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

			// If we don't have receipt note or additional request in the report data,
			// fetch sample data to get these notes
			if ((!reportData.receipt_note || !reportData.additional_request) && sample_uid) {
				try {
					// Fetch sample data to get receipt note and additional request
					const sampleResponse = await apiGet(`https://black.irdop.org/to82oe92i/db/get/sample_full/${sample_uid}`);

					if (sampleResponse.status === 200) {
						const sampleData = sampleResponse.data;

						// Set receipt note if not already set from report data
						if (!reportData.receipt_note && sampleData.receipt && sampleData.receipt.note) {
							setReceiptNote(sampleData.receipt.note);
						}

						// Set additional request if not already set from report data
						if (!reportData.additional_request && sampleData.additional_request) {
							setAdditionalRequest(sampleData.additional_request);
						}
					}
				} catch (err) {
					console.error('Error fetching sample data for notes:', err);
					// Continue with report data even if this fails
				}
			} // Update the editor content using the helper function
			const combinedContent = generateCombinedContent(
				reportData.customer_section || '',
				reportData.sample_section || '',
				reportData.analysis_section || '',
				reportData.comment_section || '',
				reportData.note_section || '',
				reportData.signature_section || '',
			);

			setContent(combinedContent);

			if (contentRef.current && window.tinymce) {
				const editor = window.tinymce.get(contentRef.current.id);
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
			setError(`Failed to load published report: ${err.message}`);
			// Add notification for error
			showNotification(`Tải phiếu không thành công: ${err.message}`, 'error');
		} finally {
			setLoading(false);
		}
	}; // Helper function to generate combined content
	const generateCombinedContent = (
		customerSection,
		sampleInfoSection,
		analysisSection,
		commentSection,
		notesSection,
		signatureSection,
	) => {
		// Only include comment section if showComment is true AND commentSection has content
		const commentContent = showComment && commentSection ? commentSection : '';
		const commentSpacing = commentContent ? spacing : '';

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

			// Reset the header to initial state with current date
			const initialHeaderWithCurrentDate = `
<div class=" content_page_header_box" id="thead" style="position:relative; height: fit-content;">
	<div class=" " style="position:relative; display:flex;  overflow:visible;">
		<div>
			<img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/IRDOP%20LOGO%20with%20Name.w8flZn8NnkuLrYinAamIkw.PAAKeAHDVEm9mFvCFtA46Q.svg" 
				 loading="lazy" 
				 class="OQtYGs6LmEKlbdTnVjZ4oA" 
				 style="width:4cm;">
		</div>
		<div style="text-align:right; flex-grow:1; display: flex; flex-direction: column; align-items: flex-end;">
			<p class="" 
			style="font-weight:700; font-size:14.4px; color:#0058A3; margin-bottom: 0; line-height: 17.6px; letter-spacing: 0.04em; word-spacing: 0.04em;">
				Viện nghiên cứu và phát triển Sản phẩm thiên nhiên
			</p>
			<p class="" 
			style="font-weight:400; font-size:11.2px; margin: 0; line-height: 12px; letter-spacing: 0.04em; word-spacing: 0.04em;">
				/ Institute for Research and Development of Organic Products
			</p>
			<span class="" 
				style="font-weight:400; font-size:11.2px; border-bottom:1px solid rgba(128,128,128,0.5); 
						width: fit-content; display: block; margin: 0; line-height: 12px; padding-bottom: 1px; letter-spacing: 0.04em; word-spacing: 0.04em;">
				Phòng Phân tích - Kiểm nghiệm / Analysis and Testing Dept.
			</span>
		</div>

	</div>
	<div class=" " 
		 style="padding-top:5mm; position:relative; ">
		<div style="position:relative; text-align:left;">
			<p contenteditable="true" class=" content-header-title" 
			   style="font-weight:840; font-size:24pt; color:#0058A3; height: 32px; letter-spacing: 0.03em; word-spacing: 0.03em;">
				PHIẾU KẾT QUẢ THỬ NGHIỆM
			</p>
			<p class=" content-header-title_eng" 
			   style="font-weight:820; font-size:21pt; color:#0058A3; height: 32px; letter-spacing: 0.03em; word-spacing: 0.03em;">
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
			 style="position:absolute; right:0mm; top:0.2cm; ${showVlas ? '' : 'display:none;'}">
			<img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/VILAS%20997.WIu1HeH5wkOQ5k1olzA3Wg.png" 
				 loading="lazy" 
				 class="" 
				 style="width:4.16cm;">
		</div>
	</div>
</div>
			`;

			// Update header states
			setHeader(initialHeaderWithCurrentDate);
			setHeaderHTML(initialHeaderWithCurrentDate);

			// Update TinyMCE editor with new header after a small delay
			setTimeout(() => {
				if (window.tinymce) {
					const headerElements = document.getElementsByClassName('header-editable');
					if (headerElements.length > 0 && headerElements[0].id) {
						const headerEditor = window.tinymce.get(headerElements[0].id);
						if (headerEditor) {
							headerEditor.setContent(initialHeaderWithCurrentDate);
						}
					}
				}
			}, 100);

			// If we have sample data, reload it to reset the form to default
			if (sampleData) {
				setShowVlas(false);
				setShowComment(false);
				setShowReference(false);
				setShowReplace(false);
				setShowSign(false);
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

	// Function to update header date to current date
	const updateHeaderDateToCurrent = () => {
		// Create a temporary container to parse the header HTML
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = header;

		// Find the date element in the header
		const dateSpan = tempDiv.querySelector('.published_date');
		if (dateSpan) {
			// Update the date to the current date
			dateSpan.innerHTML = `Ngày / Date: ${formatDate(new Date())}`;

			// Update the header state with the new HTML
			const updatedHeader = tempDiv.innerHTML;
			setHeader(updatedHeader);
			setHeaderHTML(updatedHeader);

			// Update TinyMCE editor if available
			setTimeout(() => {
				if (window.tinymce) {
					const headerElements = document.getElementsByClassName('header-editable');
					if (headerElements.length > 0 && headerElements[0].id) {
						const headerEditor = window.tinymce.get(headerElements[0].id);
						if (headerEditor) {
							headerEditor.setContent(updatedHeader);
						}
					}
				}
			}, 100); // Add small delay to ensure TinyMCE is ready
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
					// Continue with sample data even if client data fails
				}
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

	// Add API fetch for sample data and client data
	useEffect(() => {
		if (!selected_ppt_uid) {
			fetchSampleData();
		}
	}, [sample_uid, selected_ppt_uid]);

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

		// Navigate to the new sample_uid - we'll load the most recent ppt_uid in the effect
		navigate(`/report?sample_uid=${selectedSampleUid}`);
	};

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
		} // Generate comment section based on showComment state
		// If showComment is false, we want to remove any existing comment section
		const updatedCommentSection = showComment ? commentSectionHTML || generateCommentSection() : '';
		setCommentSectionHTML(updatedCommentSection);

		// Set notes and signature sections
		setNotesSectionHTML(generateNotesSection());
		setSignatureSectionHTML(generateSignatureSection());

		// Use the generateCombinedContent helper function to ensure consistent content generation
		const updatedContent = generateCombinedContent(
			updatedCustomerSection,
			updatedSampleInfo,
			updatedAnalysisSection,
			updatedCommentSection,
			generateNotesSection(),
			generateSignatureSection(),
		); // Update the editor content
		setContent(updatedContent);
		if (contentRef.current && window.tinymce) {
			const editor = window.tinymce.get(contentRef.current.id);
			if (editor) {
				editor.setContent(updatedContent);
			}
		}

		// Store sections separately for layout adjustments during printing
		setSectionContent({
			customerSection: updatedCustomerSection,
			sampleInfoSection: updatedSampleInfo,
			analysisSection: updatedAnalysisSection,
			commentSection: updatedCommentSection,
			notesSection: generateNotesSection(),
			signatureSection: generateSignatureSection(),
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

				// Find all reference cells in the current editor content - add null check
				const referenceCells = tempDiv?.querySelectorAll?.('.reference-cell') || [];

				if (referenceCells.length > 0) {
					const refs = Array.from(referenceCells).map((cell) => cell.outerHTML);
					setReferenceValues(refs);
					return refs;
				}
				return [];
			};

			extractCurrentReferences();
		}
	}, [showVlas, showComment, showReference, showEnglish, showReplace, showSign, sampleData]);

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
			<p style="font-weight: 760; margin: 0; text-align: left; font-size: 16px; line-height: 1.2;">${clientName}</p>
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

				// Check if this is "Ngày tiếp nhận" field to add storage time info
				if (fieldName.includes('Ngày tiếp nhận')) {
					return `
			<div style="display: flex; margin-top: 8px;">
				<div style="width: 27%; font-size: 12px; line-height: 1.2; text-align: left; padding-right: 10px; display: flex; align-items: top;">
					<p style="font-weight:bold; margin-right: 4px;">${displayMainLabel}</p> ${engLabel}:
				</div>
				<div style="width: 23%; font-size: 12px; line-height: 1.2; text-align: left; padding-left: 10px;" >
					<p style="margin: 0;">${fieldValue}</p>
				</div>
				<div style="width: 28%; font-size: 12px; line-height: 1.2; text-align: left; padding-right: 10px; display: flex; align-items: top;">
					<p style="font-weight:bold; margin-right: 4px;">Thời gian lưu mẫu</p> / Storage time:
				</div>
				<div style="width: 19%; font-size: 12px; line-height: 1.2; text-align: left; padding-left: 10px;" >
					<p style="margin: 0;">Không có mẫu lưu</p>
				</div>
			</div>`;
				}

				return `
			<div style="display: flex;">
				<div style="width: 27%; font-size: 12px; line-height: 1.2; text-align: left; padding-right: 10px; display: flex; align-items: top;">
					<p style="font-weight:bold; margin-right: 4px;">${displayMainLabel}</p> ${engLabel}:
				</div>
				<div style="width: 73%; font-size: 12px; line-height: 1.2; text-align: left; padding-left: 10px;" >
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
							return {
								index,
								heightPx: 30,
								heightMm: pxToMm(30),
							};
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
							return {
								index,
								heightPx: 30,
								heightMm: pxToMm(30),
							};
						}
					})
					.filter((item) => item.heightPx > 0);

				setTableRowHeights(heights);
				resolve(heights);
			}, delayMs);
		});
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
					const editorBody = contentEditor.getBody();
					if (editorBody) {
						const referenceCells = editorBody.querySelectorAll('.reference-cell') || [];
						if (referenceCells.length > 0) {
							return Array.from(referenceCells).map((cell) => cell.outerHTML);
						}
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
					// Handle parameter name with display_style logic
					let parameterName = item.parameter_name || '--';

					// Check if display_style exists and is an array
					if (item.display_style && Array.isArray(item.display_style)) {
						// Find the default value
						const defaultItem = item.display_style.find((style) => style.label === 'default');
						if (defaultItem && defaultItem.value && defaultItem.value.trim() !== '') {
							// Keep HTML tags for display_style values (don't remove them)
							parameterName = defaultItem.value;
						}

						// Add English translation if showEnglish is true and eng value exists
						if (showEnglish) {
							const engItem = item.display_style.find((style) => style.label === 'eng');
							if (engItem && engItem.value && engItem.value.trim() !== '') {
								// Insert "/" before the closing tag of the first element
								if (parameterName.includes('</p>')) {
									parameterName = parameterName.replace('</p>', '/</p>');
								} else if (parameterName.includes('>')) {
									// If it's not a <p> tag, add / at the end of the content
									const lastTagIndex = parameterName.lastIndexOf('>');
									if (lastTagIndex !== -1) {
										parameterName =
											parameterName.substring(0, lastTagIndex) + '/' + parameterName.substring(lastTagIndex);
									} else {
										parameterName += '/';
									}
								} else {
									parameterName += '/';
								}
								// Add newline and English value
								parameterName += engItem.value;
							}
						}
					} else {
						// If no display_style, use parameter_name and add eng if available
						if (showEnglish && item.display_style && Array.isArray(item.display_style)) {
							const engItem = item.display_style.find((style) => style.label === 'eng');
							if (engItem && engItem.value && engItem.value.trim() !== '') {
								const engValue = engItem.value;
								parameterName += ` / \n${engValue}`;
							}
						}
					}

					const result = item.result_value || '--';
					const unit = item.result_unit || '--';
					const protocol = item.protocol_code || '--';

					// Split accreditation by comma, trim whitespace, and combine with protocol_source
					const accreditationParts = item.accreditation
						? item.accreditation
								.split(',')
								.map((part) => part.trim())
								.filter((part) => part.length > 0)
						: [];
					const protocolSource = item.protocol_source || '';
					const scope = protocolSource + (accreditationParts.length > 0 ? ' ' + accreditationParts.join(' ') : '');

					// Reference cell handling with improved logic
					let referenceCell = '';
					if (showReference) {
						// When showing reference column
						if (index < refsArray.length && refsArray[index]) {
							// Use existing reference cell if available
							if (refsArray[index].includes('class="reference-cell"')) {
								referenceCell = refsArray[index].replace(/padding: 4px 8px/g, 'padding: 4px 8px');
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
					} // Add unique row ID for measurements and data-row-index attribute
					const rowId = `analysis-row-${index}`;
					return `
				<tr id="${rowId}" class="table-row" data-row-index="${index}">
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${index + 1}.</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; white-space: pre-line;">${parameterName}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${result}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${unit}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${protocol}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">${scope}</td>${referenceCell}
				</tr>`;
				})
				.join('');
		} else {
			// If no analysis items, include a placeholder row with ID
			const referenceCell = showReference
				? `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>`
				: '';

			analysisRows = `
				<tr id="analysis-row-0" class="table-row" data-row-index="0">
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; ">1</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px;">--</td>${referenceCell}
				</tr>`;
		}

		// Dynamic result column header based on showKN state
		const resultHeader = showKN ? 'Kết quả kiểm nghiệm' : 'Kết quả';
		const resultHeaderEng = showKN ? '/ Inspection result' : '/ Test result';

		// Add paragraph above table when showKN is true
		const knParagraph = showKN
			? `
			<p style="font-weight: bold; text-align: left; font-size: 12px; margin: 0 0 8px 0; padding: 0;">
				Kết quả thử nghiệm:
			</p>
		`
			: '';

		// Create full table HTML
		const tableHTML = `
<div style="margin:0; padding:0;">
	${knParagraph}
	<table style="width: auto; min-width: 100% ; border-collapse: collapse; text-align: left; margin:0; padding:0; font-size:12px; line-height:1.4;">
		<thead>
			<tr>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 45px; text-align:left; font-size:12px;box-sizing: border-box;">
					<strong>STT</strong> <br> <span style="font-size: 12px; color: #444444;">/ No.</span>
				</th>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500;  text-align:left; font-size:12px; min-width: 20%;box-sizing: border-box;">
					<strong>Phép thử</strong> <br> <span style="font-size: 12px; color: #444444;">/ Tests</span>
				</th>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; min-width:100px; text-align:left; font-size:12px; box-sizing: border-box;">
					<strong>${resultHeader}</strong> <br> <span style="font-size: 12px; color: #444444;">${resultHeaderEng}</span>
				</th>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; min-width:60px; text-align:left; font-size:12px;box-sizing: border-box;">
					<strong>Đơn vị </strong><br> <span style="font-size: 12px; color: #444444;">/ Unit</span>
				</th>                <th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; min-width: 17%; text-align:left; font-size:12px;box-sizing: border-box;">
					<strong>Phương pháp</strong> <br> <span style="font-size: 12px; color: #444444;">/ Protocol</span>
				</th>
				<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; ; text-align:left; font-size:12px;box-sizing: border-box; max-width: 120px; ">
					<strong>Phạm vi công nhận</strong> <br> <span style="font-size: 12px; color: #444444;">/ Accreditation scope</span>
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

	// Add new function to debug table rows in DOM with optional logging
	const debugTableRows = (shouldLog = false) => {
		const rows = document.querySelectorAll('.table-row') || [];

		Array.from(rows).forEach((row, index) => {
			if (!row) return;
			const height = row.offsetHeight || 0;
			const cells = row.cells ? row.cells.length : 'unknown';
		});

		// Also check our current refs
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

	// Add notes and signature sections as functions with standardized styling
	const generateNotesSection = () => {
		const sampleInfoText = showKN
			? 'Thông tin mẫu kiểm nghiệm do khách hàng cung cấp / Sample information provided by the customer.'
			: 'Thông tin mẫu thử nghiệm do khách hàng cung cấp / Sample information provided by the customer.';

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
				IRDOP: Chỉ tiêu được thực hiện tại IRDOP / Parameters conducted by IRDOP.<br>
				EX: Chỉ tiêu được thực hiện bởi nhà thầu phụ / Parameters conducted by subcontractors.<br>
				VS: Chỉ tiêu được công nhận ISO/IEC 17025:2017 / Accredited per ISO/IEC 17025:2017.<br>
				TĐC: Chỉ tiêu được công nhận đánh giá sự phù hợp theo NĐ 107/2016/NĐ-CP / Accredited per Decree 107/2016/ND-CP.<br>
				${sampleInfoText}<br>
				Kết quả chỉ có giá trị với mẫu thử / The results are only valid for the tested sample(s).
			</p>
		</div>
		
	</div>
</div>`;
	};

	// Add new function to generate signature section
	const generateSignatureSection = () => {
		return `
   <div style="padding-top: 0; display: flex;flex-direction:column; margin:0;">
   		${showReplace ? '<p style="text-align: left; font-weight: bold; font-size:12px; margin-bottom: 4px;">--</p>' : ''}

        <div style="padding: 0pt; flex-grow: 1; position: relative; display:flex; height:2.7cm;">
            <div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
                ${
									!showSign
										? `
                <strong style="font-size:12px; line-height:1.2; margin:0;">TRƯỞNG PHÒNG KIỂM NGHIỆM<br>PHÒNG ĐẢM BẢO CHẤT LƯỢNG / Quality Assurance Manager</strong>
                <p style="font-size:12px; margin:0; line-height:1.4;">Nguyễn Công Phúc</p>
                `
										: '<!-- Phần bên trái để trống -->'
								}
            </div>
            <div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
                <strong style="font-size:12px; line-height:1.2; margin:0;">KT.VIỆN TRƯỞNG<br>PHÓ VIỆN TRƯỞNG / Vice President</strong>
                <p style="font-size:12px; margin:0; line-height:1.4;">Nguyễn Bá Xuân Trường</p>
            </div>
        </div>
    </div>`;
	};

	const signatureSection = generateSignatureSection();

	const spacing = `<div style="height: 4mm; margin:0; padding:0;"></div>`;

	// Notification for two-page layout
	const nextPageNotification = `
<div style="padding: 10px 0; text-align: center; font-size: 12px; font-style: italic; color: #666;">
	- Xem kết quả ở trang tiếp theo / See the results on the following page -
</div>`;

	// Update initial content with empty placeholders and comment section if needed
	const initialCommentSection = showComment ? generateCommentSection() : '';
	const initialCommentSpacing = showComment ? spacing : '';

	const initialContent = `${generateCustomerSection()}${spacing}${spacing}${spacing}${initialCommentSection}${initialCommentSpacing}${generateNotesSection()}${spacing}${generateSignatureSection()}`;

	const [content, setContent] = useState(initialContent);
	const [header, setHeader] = useState(`
<div class=" content_page_header_box" id="thead" style="position:relative; height: fit-content; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
	<div class=" " style="position:relative; display:flex;  overflow:visible;">
		<div>
			<img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/IRDOP%20LOGO%20with%20Name.w8flZn8NnkuLrYinAamIkw.PAAKeAHDVEm9mFvCFtA46Q.svg" 
				 loading="lazy" 
				 class="OQtYGs6LmEKlbdTnVjZ4oA" 
				 style="width:4cm;">
		</div>
		<div style="text-align:right; flex-grow:1; display: flex; flex-direction: column; align-items: flex-end;">
			<p class="inter-700" 
			style="font-family: 'Inter', Arial, sans-serif; font-weight: 700; font-size:14.4px; color:#0058A3; margin-bottom: 0; line-height: 17.6px; letter-spacing: 0.04em; word-spacing: 0.04em;">
				Viện nghiên cứu và phát triển Sản phẩm thiên nhiên
			</p>
			<p class="inter-400" 
			style="font-family: 'Inter', Arial, sans-serif; font-weight: 400; font-size:11.2px; margin: 0; line-height: 12px; letter-spacing: 0.04em; word-spacing: 0.04em;">
				/ Institute for Research and Development of Organic Products
			</p>
			<span class="inter-400" 
				style="font-family: 'Inter', Arial, sans-serif; font-weight: 400; font-size:11.2px; border-bottom:1px solid rgba(128,128,128,0.5); 
						width: fit-content; display: block; margin: 0; line-height: 12px; padding-bottom: 1px; letter-spacing: 0.04em; word-spacing: 0.04em;">
				Phòng Phân tích - Kiểm nghiệm / Analysis and Testing Dept.
			</span>
		</div>

	</div>
	<div class=" " 
		 style="padding-top:5mm; position:relative; ">
		<div style="position:relative; text-align:left;">
			<p contenteditable="true" class="inter-840 content-header-title" 
			   style="font-family: 'Inter', Arial, sans-serif; font-weight: 840; font-size:24pt; color:#0058A3; height: 32px; letter-spacing: 0.03em; word-spacing: 0.03em;">
				PHIẾU KẾT QUẢ THỬ NGHIỆM
			</p>
			<p class="inter-820 content-header-title_eng" 
			   style="font-family: 'Inter', Arial, sans-serif; font-weight: 820; font-size:21pt; color:#0058A3; height: 32px; letter-spacing: 0.03em; word-spacing: 0.03em;">
				/ Certificate of Analysis
			</p>
			<div class="inter-400 display-flex" 
				 style="display: flex; align-items: center; gap: 2mm; font-size:12px; font-family: 'Inter', Arial, sans-serif; font-weight: 400; margin-top: 0px;; height: 28px;">
				<span class="inter-400 std_ref-title">Xuất bản / ref.:</span>
				<p contenteditable="true" 
				   class="inter-400 ref_code" 
				   style="min-width:5pt; margin: 0; margin-right: 2mm; font-family: 'Inter', Arial, sans-serif; font-weight: 400;">
					SƠ BỘ / DRAFT
				</p>
				<span class="inter-400 published_date" 
					  style="min-width:5pt; margin: 0; font-family: 'Inter', Arial, sans-serif; font-weight: 400;">
					  Ngày / Date: ${formatDate(new Date())}
				</span>
			</div>
		</div>
		<div class=" vlas_icon" 
			 style="position:absolute; right:0mm; top:0.2cm; ${showVlas ? '' : 'display:none;'}">
			<img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/VILAS%20997.WIu1HeH5wkOQ5k1olzA3Wg.png" 
				 loading="lazy" 
				 class="" 
				 style="width:4.16cm;">
		</div>
	</div>
</div>
	`);
	const [footer, setFooter] = useState(`
<div style="border-top: 1px solid #4CB748; height: 50px; display: flex; padding-top: 0pt; align-items: center; font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<div style="flex-grow: 1; text-align: left;">
<p class="nunito-600" style="color: #0058a3; margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center; font-family: 'Nunito Sans', Arial, sans-serif; font-weight: 600;">VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN</p>
<p class="nunito-400" style="margin: 0; padding: 0; line-height: 1; font-size: 12px; height: 15px; display: flex; align-items: center; font-family: 'Nunito Sans', Arial, sans-serif; font-weight: 400;">IRDOP.ORG</p>
<p class="nunito-400" style="opacity: 0.5; margin: 0; padding: 0; line-height: 1; font-size: 11px; height: 14px; display: flex; align-items: center; font-family: 'Nunito Sans', Arial, sans-serif; font-weight: 400;">Form: BM06-QT010-KN / Version: 06 / Effective date: 02/06/2025</p>
</div>
<div class="nunito-400" style="font-size: 11px; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; font-family: 'Nunito Sans', Arial, sans-serif; font-weight: 400;">
<div style="display: flex; align-items: center; height: 14px;"><span style="font-size: 11px; margin: 0; padding: 0; line-height: 1; margin-right: 2px;">Trang / Pages:</span>
<div style="display: flex; align-items: center; height: 14px;"><span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span> <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">/</span> <span style="font-size: 11px; margin: 0; padding: 0; line-height: 1;">00</span></div>
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
		notesSection: generateNotesSection(),
		signatureSection: generateSignatureSection(),
	});

	const editorRef = useRef(null);
	const contentRef = useRef(null);

	// Add font loading effect to ensure Inter and Nunito Sans are available
	useEffect(() => {
		// Create a style element for font-face declarations and Google Fonts link
		const fontStyle = document.createElement('style');
		fontStyle.textContent = `
			/* Inter Google Fonts */
			@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
			
			/* Nunito Sans Google Fonts */
			@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap');
			
			/* Font weight classes for Inter */
			.inter-200 { font-family: "Inter", Arial, sans-serif; font-weight: 200; font-style: normal; }
			.inter-300 { font-family: "Inter", Arial, sans-serif; font-weight: 300; font-style: normal; }
			.inter-400 { font-family: "Inter", Arial, sans-serif; font-weight: 400; font-style: normal; }
			.inter-500 { font-family: "Inter", Arial, sans-serif; font-weight: 500; font-style: normal; }
			.inter-600 { font-family: "Inter", Arial, sans-serif; font-weight: 600; font-style: normal; }
			.inter-700 { font-family: "Inter", Arial, sans-serif; font-weight: 700; font-style: normal; }
			.inter-760 { font-family: "Inter", Arial, sans-serif; font-weight: 760; font-style: normal; }
			.inter-800 { font-family: "Inter", Arial, sans-serif; font-weight: 800; font-style: normal; }
			.inter-820 { font-family: "Inter", Arial, sans-serif; font-weight: 820; font-style: normal; }
			.inter-840 { font-family: "Inter", Arial, sans-serif; font-weight: 840; font-style: normal; }
			.inter-900 { font-family: "Inter", Arial, sans-serif; font-weight: 900; font-style: normal; }
			
			/* Font weight classes for Nunito Sans */
			.nunito-200 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 200; font-style: normal; }
			.nunito-300 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 300; font-style: normal; }
			.nunito-400 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 400; font-style: normal; }
			.nunito-500 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 500; font-style: normal; }
			.nunito-600 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 600; font-style: normal; }
			.nunito-700 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 700; font-style: normal; }
			.nunito-800 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 800; font-style: normal; }
			.nunito-900 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 900; font-style: normal; }
			
			/* Default font for content and footer editors */
			body, .editable, .content-editable, .footer-editable {
				font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
			}
			
			/* Override for header editor to use Inter */
			.header-editable {
				font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
			}
			`;
		document.head.appendChild(fontStyle);

		// Add Google Fonts preconnect links for better performance
		const preconnectLinks = [
			{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
			{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
		];

		const linkElements = [];
		preconnectLinks.forEach((linkConfig) => {
			const link = document.createElement('link');
			Object.keys(linkConfig).forEach((key) => {
				if (key === 'crossOrigin') {
					link.crossOrigin = linkConfig[key];
				} else {
					link[key] = linkConfig[key];
				}
			});
			document.head.appendChild(link);
			linkElements.push(link);
		});

		// Wait for font to load
		document.fonts.ready
			.then(() => {
				console.log('Inter and Nunito Sans fonts loaded successfully');
			})
			.catch((err) => {
				console.error('Error loading Inter or Nunito Sans fonts:', err);
			});

		return () => {
			document.head.removeChild(fontStyle);
			linkElements.forEach((link) => {
				if (document.head.contains(link)) {
					document.head.removeChild(link);
				}
			});
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
				/* Inter Google Fonts */
				@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
				
				/* Nunito Sans Google Fonts */
				@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap');
				
				/* Font weight classes for Inter */
				.inter-200 { font-family: "Inter", Arial, sans-serif; font-weight: 200; font-style: normal; }
				.inter-300 { font-family: "Inter", Arial, sans-serif; font-weight: 300; font-style: normal; }
				.inter-400 { font-family: "Inter", Arial, sans-serif; font-weight: 400; font-style: normal; }
				.inter-500 { font-family: "Inter", Arial, sans-serif; font-weight: 500; font-style: normal; }
				.inter-600 { font-family: "Inter", Arial, sans-serif; font-weight: 600; font-style: normal; }
				.inter-700 { font-family: "Inter", Arial, sans-serif; font-weight: 700; font-style: normal; }
				.inter-760 { font-family: "Inter", Arial, sans-serif; font-weight: 760; font-style: normal; }
				.inter-800 { font-family: "Inter", Arial, sans-serif; font-weight: 800; font-style: normal; }
				.inter-820 { font-family: "Inter", Arial, sans-serif; font-weight: 820; font-style: normal; }
				.inter-840 { font-family: "Inter", Arial, sans-serif; font-weight: 840; font-style: normal; }
				.inter-900 { font-family: "Inter", Arial, sans-serif; font-weight: 900; font-style: normal; }
				
				/* Font weight classes for Nunito Sans */
				.nunito-200 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 200; font-style: normal; }
				.nunito-300 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 300; font-style: normal; }
				.nunito-400 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 400; font-style: normal; }
				.nunito-500 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 500; font-style: normal; }
				.nunito-600 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 600; font-style: normal; }
				.nunito-700 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 700; font-style: normal; }
				.nunito-800 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 800; font-style: normal; }
				.nunito-900 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 900; font-style: normal; }
				
				/* Default font for content and footer editors */
				body, *[contenteditable="true"] {
					font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
				}
				
				/* Override for header editor to use Inter */
				.header-editable *[contenteditable="true"] {
					font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
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
		if (!editorBody) return null;

		const tables = editorBody.querySelectorAll('table') || [];

		if (!tables.length) {
			return null;
		}

		// Get the analysis table (first table)
		const analysisTable = tables[0];
		if (!analysisTable) return null;

		// Extract header dimensions - add null checks
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

		const headerCells = headerRow.querySelectorAll('th') || [];
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

			return dimensions;
		});

		// Extract data row dimensions - also apply the same width adjustment - add null checks
		const rows = analysisTable.querySelectorAll('tbody tr') || [];
		const rowDimensions = Array.from(rows).map((tr, rowIndex) => {
			if (!tr) return { rowIndex, rowHeight: '0px', cellDimensions: [] };

			const computedTrStyle = window.getComputedStyle(tr);
			const cells = tr.querySelectorAll('td') || [];

			const cellDimensions = Array.from(cells).map((td, cellIndex) => {
				if (!td) return { rowIndex, cellIndex, width: '0px', height: '0px' };

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

		return {
			headerDimensions,
			rowDimensions,
		};
	};

	// Enhance the handlePrint function to add more detailed logging
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

				// Extract table header widths from the editor - NEW CODE
				const tableHeaderWidths = extractTableHeaderWidths(contentEditor.getBody());

				// Replace the table in currentContent with an updated one that has explicit column widths
				if (tableHeaderWidths && tableHeaderWidths.length > 0) {
					currentContent = applyTableHeaderWidths(currentContent, tableHeaderWidths);
				}
			}

			const headerElements = document.getElementsByClassName('header-editable');
			if (headerElements.length > 0 && headerElements[0].id) {
				const headerEditor = window.tinymce.get(headerElements[0].id);
				if (headerEditor) {
					let headerContent = headerEditor.getContent();
					const refCodeMatch = headerContent.match(/<p[^>]*class="[^"]*ref_code[^>]*>(.*?)<\/p>/i);
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
			headerSpacing: 7, // spacing between header and content
			footerSpacing: 2, // removed spacing between content and footer
		};

		// Extract current sections from TinyMCE editor content
		function extractCurrentSections(currentContent) {
			if (!currentContent) {
				return {
					customerSection: customerSectionHTML || sectionContent.customerSection || '',
					sampleInfoSection: sampleInfoSectionHTML || sectionContent.sampleInfoSection || '',
					analysisSection: analysisSectionHTML || sectionContent.analysisSection || '',
					commentSection: showComment ? commentSectionHTML || sectionContent.commentSection || '' : '',
					notesSection: notesSectionHTML || sectionContent.notesSection || '',
					signatureSection: signatureSectionHTML || sectionContent.signatureSection || '',
				};
			}

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

			// Safe query selector helper for arrays
			const safeQueryAll = (element, selector) => {
				try {
					return element?.querySelectorAll?.(selector) || [];
				} catch (error) {
					return [];
				}
			};

			// Safe find helper for arrays
			const safeFind = (array, predicate) => {
				try {
					return array?.find?.(predicate);
				} catch (error) {
					return null;
				}
			};

			// Find customer section with safe queries
			const divElements = Array.from(safeQueryAll(tempContainer, 'div'));
			const customerSectionDiv = safeFind(
				divElements,
				(div) => div?.innerHTML && div.innerHTML.includes('Customer information'),
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
				extractedSections.customerSection = customerSectionHTML || sectionContent.customerSection || '';
			}

			// Find sample info section with safe queries
			const sampleInfoDiv = safeFind(
				divElements,
				(div) => div?.innerHTML && div.innerHTML.includes('Sample information'),
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
				extractedSections.sampleInfoSection = sampleInfoSectionHTML || sectionContent.sampleInfoSection || '';
			}

			// Find analysis section with safe query - protection against null
			const analysisTable = tempContainer?.querySelector?.('table');
			if (analysisTable && analysisTable.innerHTML && analysisTable.innerHTML.includes('Tests')) {
				// Find the parent container of the analysis section
				let analysisParent = analysisTable;
				while (analysisParent.parentElement && analysisParent.parentElement !== tempContainer) {
					analysisParent = analysisParent.parentElement;
					// If we reach a major section break, stop climbing
					if (analysisParent === tempContainer) break;
				}

				extractedSections.analysisSection = analysisParent.outerHTML;
			} else {
				extractedSections.analysisSection = analysisSectionHTML || sectionContent.analysisSection || '';
			}

			// Find comment section with safe queries
			const commentDiv = safeFind(
				divElements,
				(div) => div?.innerHTML && div.innerHTML.includes('Nhận xét / Comment:'),
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

			// Find notes section with safe queries
			const notesDiv = safeFind(divElements, (div) => div?.innerHTML && div.innerHTML.includes('Ghi chú / Note:'));

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
				extractedSections.notesSection = notesSectionHTML || sectionContent.notesSection || '';
			}

			// Find signature section with safe queries
			const signatureDiv = safeFind(
				divElements,
				(div) => div?.innerHTML && div.innerHTML.includes('Laboratory Manager'),
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
				extractedSections.signatureSection = signatureSectionHTML || sectionContent.signatureSection || '';
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

			// CORRECTED: Proper content height calculation formula for ALL pages
			// A4 height - top margin - bottom margin - header height - footer height - header spacing - footer spacing
			const availableContentHeightMm =
				A4.height - A4.topMargin - A4.bottomMargin - headerHeightMm - footerHeightMm - A4.footerSpacing;

			const availableContentHeightPx = mmToPx(availableContentHeightMm);

			// First, let's measure all sections individually
			const measureSection = (sectionHtml, sectionName) => {
				measureArea.innerHTML = sectionHtml;
				const heightPx = measureArea.offsetHeight;
				const heightMm = pxToMm(heightPx);
				return heightPx;
			};

			const sectionHeights = {
				customerSection: measureSection(extractedSections.customerSection, 'CUSTOMER SECTION'),
				sampleInfoSection: measureSection(extractedSections.sampleInfoSection, 'SAMPLE INFO SECTION'),
				analysisSection: measureSection(extractedSections.analysisSection, 'ANALYSIS TABLE'),
				commentSection: showComment ? measureSection(extractedSections.commentSection || '', 'COMMENT SECTION') : 0,
				notesSection: measureSection(extractedSections.notesSection, 'NOTES SECTION'),
				signatureSection: measureSection(extractedSections.signatureSection, 'SIGNATURE SECTION'),
				spacing: measureSection(spacing, 'SPACING'),
				nextPageNotification: measureSection(nextPageNotification, 'PAGE BREAK NOTIFICATION'),
			};
			console.groupEnd();

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

			// Log heights for special layout
			console.group('🧩 SPECIAL LAYOUT PAGE HEIGHTS');

			console.groupEnd();

			// Determine if content should use special 2-page layout
			// Criteria:
			// 1. Total content exceeds 1 page
			// 2. Page 2 of special layout fits within 1 page
			// 3. Page 1 of special layout fits within 1 page
			const totalExceedsOnePage = totalContentHeight > availableContentHeightPx;
			const page2FitsOnePage = page2SpecialLayoutHeight <= availableContentHeightPx;
			const page1FitsOnePage = page1SpecialLayoutHeight <= availableContentHeightPx;

			const useSpecialLayout = totalExceedsOnePage && page2FitsOnePage && page1FitsOnePage;

			// Decide which layout to use based on our analysis
			let contentPages = [];

			if (useSpecialLayout) {
				// Use the custom 2-page layout
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
						splitTableAcrossPages(element);
					} else if (elementHeightPx > availableContentHeightPx && currentPage.length === 0) {
						// Non-table element larger than a full page and we're at the start of a page
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
						currentPage.push(`<div style="color: red; padding: 5px;">Table pagination limit reached</div>`);
						return;
					}

					tableBreakCounts++;

					// Extract table structure
					const hasHeader = !!tableElement.querySelector('thead');
					const tableHeader = hasHeader ? tableElement.querySelector('thead').outerHTML : '';
					const rows = Array.from(tableElement.querySelectorAll('tbody tr')) || [];

					// Exit early if no rows to process
					if (!rows.length) {
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

					// *** NEW IMPROVED ROW HEIGHT MEASUREMENT ***
					// Use the same approach as in ROW LOOKUP BY ID section for consistency
					const rowHeights = [];
					const rowsByIdMap = new Map(); // Map to store rows by their ID for quick lookup

					// First, build a map of all rows by their IDs for faster lookups
					rows.forEach((row, index) => {
						// Get the row ID (should be analysis-row-X)
						const rowId = row.id || `analysis-row-${index}`;
						rowsByIdMap.set(rowId, row);

						// Look up the row by ID in the DOM as well (which may be more accurate)
						const domRow = document.getElementById(rowId);
						if (domRow) {
							// Use the DOM row instead if available (more accurate measurement)
							rowsByIdMap.set(rowId, domRow);
						}
					});

					// Now get heights using the same approach as in performDetailedTableMeasurements
					rows.forEach((row, index) => {
						const rowId = row.id || `analysis-row-${index}`;

						// Get the potentially more accurate row from our map
						const measurableRow = rowsByIdMap.get(rowId) || row;

						// Get the height using offsetHeight (same as in ROW LOOKUP BY ID section)
						const offsetHeight = measurableRow.offsetHeight || 0;
						const boundingHeight = measurableRow.getBoundingClientRect().height || 0;

						// Choose the most accurate measurement, preferring offsetHeight if available
						let bestHeight = offsetHeight > 0 ? offsetHeight : boundingHeight;

						// If we still don't have a reliable height, use the computed style approach
						if (bestHeight < 5) {
							const computedStyle = window.getComputedStyle(measurableRow);
							const computedHeight = parseFloat(computedStyle.height) || 0;
							bestHeight = computedHeight > 0 ? computedHeight : 32; // Default to 32px if still no height
						}

						// Add a small safety factor to prevent edge cases
						const finalHeight = bestHeight * 1.0;

						rowHeights.push(finalHeight);
					});

					// Try to fit as many rows as possible using our measured heights
					let rowsInFirstPart = [];
					let remainingRows = [...rows];
					let totalUsedHeight = 0;
					let totalRemainingHeight = remainingHeightPx;
					let lastFittedRow = -1;

					// Use consistent height measurements to determine how many rows fit
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

				// Verify our actual page count
			}

			// Clean up
			document.body.removeChild(measureArea);

			contentPages.forEach((pageContent, index) => {
				// Measure the actual content height for this page
				const tempMeasureDiv = document.createElement('div');
				tempMeasureDiv.style.position = 'absolute';
				tempMeasureDiv.style.visibility = 'hidden';
				tempMeasureDiv.style.width = `${A4.width - 2 * A4.sideMargin}mm`;
				tempMeasureDiv.innerHTML = pageContent;
				document.body.appendChild(tempMeasureDiv);

				const actualContentHeight = tempMeasureDiv.offsetHeight;
				const actualContentHeightMm = pxToMm(actualContentHeight);
				const percentOfAvailable = (actualContentHeight / availableContentHeightPx) * 100;
				const remainingSpace = availableContentHeightPx - actualContentHeight;
				const remainingSpaceMm = availableContentHeightMm - actualContentHeightMm;

				document.body.removeChild(tempMeasureDiv);

				// If this is a specific page we want to analyze in more detail
				if (typeof pageContent === 'string') {
					// Create a temporary div to parse sections
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = pageContent;

					// Check if this page contains specific sections and measure them
					console.group('SECTIONS ON THIS PAGE:');

					// Helper function to check if section is on this page
					const hasSection = (sectionHtml) => {
						return pageContent.includes(sectionHtml.substring(0, 100));
					};

					if (hasSection(extractedSections.customerSection)) {
						console.log(
							`- Customer section: ${sectionHeights.customerSection.toFixed(1)}px (${pxToMm(
								sectionHeights.customerSection,
							).toFixed(2)}mm)`,
						);
					}

					if (hasSection(extractedSections.sampleInfoSection)) {
						console.log(
							`- Sample info section: ${sectionHeights.sampleInfoSection.toFixed(1)}px (${pxToMm(
								sectionHeights.sampleInfoSection,
							).toFixed(2)}mm)`,
						);
					}

					// Check if analysis table is on this page and count visible rows
					if (hasSection(extractedSections.analysisSection)) {
						// Check if we have a complete or partial analysis table
						const tableRows = tempDiv.querySelectorAll('table tbody tr');
						console.log(
							`- Analysis table: ${sectionHeights.analysisSection.toFixed(1)}px (${pxToMm(
								sectionHeights.analysisSection,
							).toFixed(2)}mm), ${tableRows.length} rows visible`,
						);
					}

					if (showComment && hasSection(extractedSections.commentSection)) {
						console.log(
							`- Comment section: ${sectionHeights.commentSection.toFixed(1)}px (${pxToMm(
								sectionHeights.commentSection,
							).toFixed(2)}mm)`,
						);
					}

					if (hasSection(extractedSections.notesSection)) {
						console.log(
							`- Notes section: ${sectionHeights.notesSection.toFixed(1)}px (${pxToMm(
								sectionHeights.notesSection,
							).toFixed(2)}mm)`,
						);
					}

					if (hasSection(extractedSections.signatureSection)) {
						console.log(
							`- Signature section: ${sectionHeights.signatureSection.toFixed(1)}px (${pxToMm(
								sectionHeights.signatureSection,
							).toFixed(2)}mm)`,
						);
					}

					console.groupEnd(); // SECTIONS ON THIS PAGE
				}

				console.groupEnd(); // PAGE X
			});
			console.groupEnd(); // PAGE DETAILS

			console.groupEnd(); // DETAILED PAGE SECTION HEIGHTS

			return {
				pages: contentPages,
				headerHeightPx,
				headerHeightMm,
				footerHeightPx,
				footerHeightMm,
				availableContentHeightPx, // This value is now correctly calculated
				availableContentHeightMm, // This value is now correctly calculated
				contentTopPx: headerHeightPx + mmToPx(A4.headerSpacing),
				contentTopMm: headerHeightMm + A4.headerSpacing,
				is2PageLayout: useSpecialLayout,
			};
		};

		// Get paginated content
		const paginationResult = paginateContent();

		// Prepare custom font support for print window with Inter and Nunito Sans
		const fontFaces = `
			/* Inter Google Fonts */
			@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
			
			/* Nunito Sans Google Fonts */
			@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap');
			
			/* Font weight classes for Inter */
			.inter-200 { font-family: "Inter", Arial, sans-serif; font-weight: 200; font-style: normal; }
			.inter-300 { font-family: "Inter", Arial, sans-serif; font-weight: 300; font-style: normal; }
			.inter-400 { font-family: "Inter", Arial, sans-serif; font-weight: 400; font-style: normal; }
			.inter-500 { font-family: "Inter", Arial, sans-serif; font-weight: 500; font-style: normal; }
			.inter-600 { font-family: "Inter", Arial, sans-serif; font-weight: 600; font-style: normal; }
			.inter-700 { font-family: "Inter", Arial, sans-serif; font-weight: 700; font-style: normal; }
			.inter-760 { font-family: "Inter", Arial, sans-serif; font-weight: 760; font-style: normal; }
			.inter-800 { font-family: "Inter", Arial, sans-serif; font-weight: 800; font-style: normal; }
			.inter-820 { font-family: "Inter", Arial, sans-serif; font-weight: 820; font-style: normal; }
			.inter-840 { font-family: "Inter", Arial, sans-serif; font-weight: 840; font-style: normal; }
			.inter-900 { font-family: "Inter", Arial, sans-serif; font-weight: 900; font-style: normal; }
			
			/* Font weight classes for Nunito Sans */
			.nunito-200 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 200; font-style: normal; }
			.nunito-300 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 300; font-style: normal; }
			.nunito-400 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 400; font-style: normal; }
			.nunito-500 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 500; font-style: normal; }
			.nunito-600 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 600; font-style: normal; }
			.nunito-700 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 700; font-style: normal; }
			.nunito-800 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 800; font-style: normal; }
			.nunito-900 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 900; font-style: normal; }
		`;

		// Write the print document with proper CSS for printing
		printWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>${documentTitle}</title>
					<meta charset="utf-8">
					<link rel="preconnect" href="https://fonts.googleapis.com">
					<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
					<style>
						${fontFaces}
						
						@page {
							size: A4;
							margin: 0; /* Remove default page margins, we'll handle with padding */
						}
						
						html, body {
							margin: 0;
							padding: 0;
							font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
							background-color: #f0f0f0;
						}
						
						/* Style for anchor tags in printing - no underline, black text, not bold */
						a {
							text-decoration: none;
							color: black;
							font-weight: normal;
						}
						
						.print-container {
							width: 794px; /* Exact A4 width at 96 DPI (210mm = 8.27in = 794px) */
							margin: 20px auto;
							background-color: white;
							font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
						}
						
						.page {
							position: relative; /* Important for absolute positioning of header/footer */
							width: 100%;
							height: 1122px; /* Exact A4 height at 96 DPI (297mm = 11.69in = 1122px) */
							box-sizing: border-box;
							page-break-after: always;
							background-color: white;
							border-bottom: 1px dashed #ccc;
							font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
							/* Apply margins as padding */
							padding: ${A4.topMargin * 3.78}px ${A4.sideMargin * 3.78}px ${A4.bottomMargin * 3.78}px ${A4.sideMargin * 3.78}px;
							overflow: hidden;
						}
				
						/* Allow VLAS icon to overflow the container */
						.vlas_icon {
							overflow: visible !important;
							z-index: 10;
						}

						
						/* Additional styles for table rows to preserve height */
						table {
							border-collapse: collapse;
							font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
							table-layout: fixed; /* Helps with consistent row heights */
							width: 100%;
						}
						
						table tr {
							height: auto !important; /* Allow rows to grow with content */
							page-break-inside: avoid; /* Try to avoid breaking rows across pages */
						}
						
						/* Standardized font sizes for all table elements */
						table td, table th {
							padding: 4px 8px !important; /* Keep 8px padding for print mode */
							border: 1px solid black;
							vertical-align: middle; /* Better alignment for multi-line content */
							height: auto !important; /* Allow cells to grow with content */
							line-height: 1.2 !important; /* Ensure consistent line height */
							box-sizing: border-box !important; /* Ensure padding is included in height */
							font-size: 12px !important; /* Standard font size for all table cells */
						}
						
						/* Fix paragraph styling in table cells */
						table td p, table th p {
							margin: 0 !important;
							padding: 0 !important;
							line-height: 1.2 !important;
							font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
							font-size: 12px !important;
						}
						
						/* Standardized typography for header/footer sections */
						.header {
							position: absolute;
							top: ${A4.topMargin * 3.78}px;
							left: ${A4.sideMargin * 3.78}px;
							right: ${A4.sideMargin * 3.78}px;
							width: calc(100% - ${2 * A4.sideMargin * 3.78}px);
							box-sizing: border-box;
							padding-bottom: ${A4.headerSpacing * 3.78}px !important;
							font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
							overflow: visible !important; /* Allow header content to overflow */
						}
						
						/* Font sizes for header elements */
						.header .content-header-title {
							font-size: 24pt !important;
							font-weight: 840 !important;
						}
						
						.header .content-header-title_eng {
							font-size: 21pt !important;
							font-weight: 820 !important;
						}
						
						.header .std_ref-title, 
						.header .ref_code, 
						.header .published_date {
							font-size: 12px !important;
						}
						
						.header > div:last-child {
							padding-bottom: 0 !important;
							margin-bottom: 0 !important;
							overflow: visible !important;
						}
						
						/* Content area positioned with space for header and footer */
						.content {
							position: absolute;
							top: calc(${A4.topMargin * 3.78}px + ${paginationResult.headerHeightPx}px + ${A4.headerSpacing * 3.78}px);
							left: ${A4.sideMargin * 3.78}px;
							right: ${A4.sideMargin * 3.78}px;
							width: calc(100% - ${2 * A4.sideMargin * 3.78}px);
							box-sizing: border-box;
							overflow: visible;
							font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
							/* Height is automatically calculated based on content */
						}
						
						/* Font sizes for different sections */
						.content > div {
							padding-top: 0 !important;
							padding-bottom: 0 !important;
							margin-top: 0 !important;
							margin-bottom: 0 !important;
							font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
						}
						
						/* Customer section typography */
						.content [class*="Customer information"] p {
							font-size: 11px !important;
							line-height: 1.2 !important;
						}
						
						.content [class*="Customer information"] p:first-of-type {
							font-size: 16px !important;
							font-weight: bold !important;
						}
						
						.content [class*="Customer information"] p:last-of-type {
							font-size: 12px !important;
						}
						
						/* Sample information section */
						.content [class*="Sample information"] p {
							font-size: 12px !important;
							line-height: 1.2 !important;
						}
						
						.content [class*="Sample information"] div > div:first-child p {
							font-size: 11px !important;
						}
						
						/* Comment section */
						.comment-content {
							font-size: 12px !important;
							line-height: 1.2 !important;
						}
						
						/* Notes section */
						.test_note_title {
							font-size: 11px !important;
							font-weight: bold !important;
							line-height: 1.0 !important;
						}
						
						.test_note_detail {
							font-size: 11px !important;
							line-height: 1.2 !important;
						}
						
						/* Signature section */
						.signature.signer_second_title,
						.signature.signer_fist_title {
							font-size: 12px !important;
							line-height: 1.2 !important;
							font-weight: bold !important;
						}
						
						.signature.signer_second_name,
						.signature.signer_first_name {
							font-size: 12px !important;
							line-height: 1.4 !important;
						}
						
						/* Fixed positioning for footer - always at bottom of page */
						.footer {
							position: absolute;
							bottom: ${A4.bottomMargin * 3.78}px;
							left: ${A4.sideMargin * 3.78}px;
							right: ${A4.sideMargin * 3.78}px;
							width: calc(100% - ${2 * A4.sideMargin * 3.78}px);
							box-sizing: border-box;
							padding-top: 0 !important;
							font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
						}
						
						/* Footer typography */
						.footer p {
							font-size: 12px !important;
							line-height: 1 !important;
						}
						
						.footer p:last-of-type {
							font-size: 11px !important;
							opacity: 0.5;
						}
						
						.footer > div:first-child {
							padding-top: 0 !important;
							margin-top: 0 !important;
						}
						
						.footer div > div span {
							font-size: 11px !important;
						}
						
						p, div, span, td, th {
							margin-top: 0;
							margin-bottom: 0;
							line-height: inherit;
							font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
						}
						
						img {
							max-width: 100%;
						}
						
						@media print {
							body {
								background-color: white;
								-webkit-print-color-adjust: exact;
								print-color-adjust: exact;
								font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
							}
							
							/* Ensure anchor styling is maintained in print */
							a {
								text-decoration: none !important;
								color: black !important;
								font-weight: normal !important;
							}
							
							.print-container {
								width: 794px !important; /* Force exact width even in print */
								margin: 0 auto;
								box-shadow: none;
							}
							
							.page {
								width: 100% !important;
								height: 1122px !important; /* Force exact A4 height in print */
								margin: 0;
								border-bottom: none;
								/* Keep padding in print mode to maintain margins */
								padding: ${A4.topMargin * 3.78}px ${A4.sideMargin * 3.78}px ${A4.bottomMargin * 3.78}px ${A4.sideMargin * 3.78}px;
							}
							
							/* Critical: ensure overflow is visible in print mode for VLAS icon */
							.vlas_icon, .header, .header > div {
								overflow: visible !important;
							}
							
							/* Preserve header/footer positioning in print mode */
							.header {
								position: absolute !important;
								top: ${A4.topMargin * 3.78}px !important;
							}
							
							.footer {
								position: absolute !important;
								bottom: ${A4.bottomMargin * 3.78}px !important;
							}
							
							/* Preserve table row heights in print mode */
							table { page-break-inside: auto; }
							tr { page-break-inside: avoid; }
							
							/* Ensure paragraph styling in table cells is preserved when printing */
							table td p, table th p {
								margin: 0 !important;
								padding: 0 !important;
								line-height: 1.2 !important;
								font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
								font-size: 12px !important;
							}
							
							/* Ensure all text in tables has consistent size */
							table td, table th {
								font-size: 12px !important;
								line-height: 1.2 !important;
							}
							
							/* Critical: ensure box-sizing is consistent in print mode */
							table, table td, table th {
								box-sizing: border-box !important;
							}
							
							/* Adjust column widths for print view to account for padding+border */
							table td, table th {
								box-sizing: border-box !important;
								padding: 4px 8px !important;
								border-width: 1px !important;
							}
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
					// window.addEventListener('afterprint', function() {
					// 	setTimeout(function() {
					// 		window.close();
					// 	}, 500);
					// });
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

			document.body.removeChild(tempMeasureDiv);

			// Check if ppt_uid contains DRAFT to add watermark
			const isDraft = pptUid && pptUid.includes('DRAFT');
			const watermark = isDraft ? getDraftWatermark() : '';

			page.innerHTML = `
				${watermark}
				<div class="header">${currentHeader}</div>
				<div class="content">${pageContentHTML}</div>
				<div class="footer">${pageFooter}</div>
			`;

			printContainer.appendChild(page);
		});

		// Focus the window to bring it to the front
		printWindow.focus();
	};

	// New function to extract table header widths from the editor DOM
	const extractTableHeaderWidths = (editorBody) => {
		if (!editorBody) return null;

		// Find the first table in the editor
		const table = editorBody.querySelector('table');
		if (!table) return null;

		// Find all th elements in the table header
		const headerCells = table.querySelectorAll('thead th');
		if (!headerCells.length) return null;

		// Extract the computed width of each header cell
		const widths = Array.from(headerCells).map((th, index) => {
			const computedStyle = window.getComputedStyle(th);
			const width = computedStyle.width;
			const content = th.textContent.trim();

			console.log(`Column ${index + 1} "${content}" width: ${width}`);

			// Return width value and index
			return {
				index,
				width,
				minWidth: computedStyle.minWidth || '',
				text: content,
			};
		});

		return widths;
	};

	// New function to apply extracted header widths to table HTML
	const applyTableHeaderWidths = (htmlContent, headerWidths) => {
		if (!headerWidths || !headerWidths.length) return htmlContent;

		// Create a DOM parser to modify the HTML
		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlContent, 'text/html');

		// Find the table in the parsed HTML
		const table = doc.querySelector('table');
		if (!table) return htmlContent;

		// Find all th elements in the table header
		const headerCells = table.querySelectorAll('thead th');
		if (!headerCells.length) return htmlContent;

		// Apply the extracted widths to the corresponding th elements
		headerCells.forEach((th, index) => {
			if (index < headerWidths.length) {
				const width = headerWidths[index].width;
				const currentStyle = th.getAttribute('style') || '';

				// Update the style attribute to include the extracted width
				const updatedStyle = currentStyle.includes('width:')
					? currentStyle.replace(/width:[^;]+;/, `width:${width};`)
					: `${currentStyle}; width:${width};`;

				th.setAttribute('style', updatedStyle);

				// Also set width attribute for better compatibility
				th.setAttribute('width', width);

				// Optionally add a data attribute for debugging
				th.setAttribute('data-original-width', width);
			}
		});

		// Apply the same widths to the table cells in each row for consistency
		const rows = table.querySelectorAll('tbody tr');
		rows.forEach((row) => {
			const cells = row.querySelectorAll('td');
			cells.forEach((cell, cellIndex) => {
				if (cellIndex < headerWidths.length) {
					const width = headerWidths[cellIndex].width;
					const currentStyle = cell.getAttribute('style') || '';

					// Update the style attribute to include the extracted width
					const updatedStyle = currentStyle.includes('width:')
						? currentStyle.replace(/width:[^;]+;/, `width:${width};`)
						: `${currentStyle}; width:${width};`;

					cell.setAttribute('style', updatedStyle);
				}
			});
		});

		// Convert the modified DOM back to HTML string
		return doc.body.innerHTML;
	};

	// Add a new detailed table measurement function for print time
	// const performDetailedTableMeasurements = () => {
	// 	// First debug the table rows in the DOM
	// 	debugTableRows(true);

	// 	// Measure table row heights with detailed logging
	// 	measureTableRowHeights(true);

	// 	// Extract table dimensions with detailed logging
	// 	extractTableDimensions(true);

	// 	// Additional table header measurement - detailed logging of thead element
	// 	if (contentRef.current && window.tinymce) {
	// 		const contentEditor = window.tinymce.get(contentRef.current?.id);
	// 		if (contentEditor && contentEditor.getBody()) {
	// 			const tableHeader = contentEditor.getBody().querySelector('table thead');
	// 			if (tableHeader) {
	// 				const headerComputedStyle = window.getComputedStyle(tableHeader);

	// 				// Also measure the tr within thead - add null check
	// 				const headerRow = tableHeader.querySelector('tr');
	// 				if (headerRow) {
	// 					const headerRowStyle = window.getComputedStyle(headerRow);
	// 				}
	// 			}
	// 		}
	// 	}
	// };

	// Enhanced performDetailedTableMeasurements function to log computed style objects
	const performDetailedTableMeasurements = () => {
		// Get all table rows
		const rows = document.querySelectorAll('.table-row');
		if (rows.length === 0) {
			console.log('No table rows found for measurement');
			return;
		}

		console.log(`Found ${rows.length} table rows for measurement`);

		// Helper function to convert CSSStyleDeclaration to a plain object
		const computedStyleToObject = (computedStyle) => {
			const result = {};
			for (let i = 0; i < computedStyle.length; i++) {
				const prop = computedStyle[i];
				result[prop] = computedStyle.getPropertyValue(prop);
			}
			return result;
		};

		// Calculate available space for analysis table
		const A4 = {
			width: 210,
			height: 297,
			topMargin: 15,
			bottomMargin: 8,
			sideMargin: 10,
			headerSpacing: 7,
			footerSpacing: 2,
		};

		// Calculate and log available height for the table
		const headerHeight = document.getElementById('header-edit')?.offsetHeight || 0;
		const footerHeight = document.getElementById('footer-edit')?.offsetHeight || 0;
		const headerHeightMm = pxToMm(headerHeight);
		const footerHeightMm = pxToMm(footerHeight);

		const availableHeightMm =
			A4.height -
			A4.topMargin -
			A4.bottomMargin -
			headerHeightMm -
			footerHeightMm -
			A4.headerSpacing -
			A4.footerSpacing;
		const availableHeightPx = mmToPx(availableHeightMm);
		// Get accurate table header height
		const tableHeader = document.querySelector('.content-editable table thead');
		const tableHeaderHeight = tableHeader ? tableHeader.getBoundingClientRect().height : 0;
		console.log(`Table header height: ${tableHeaderHeight.toFixed(1)}px (${pxToMm(tableHeaderHeight).toFixed(2)}mm)`);

		// Calculate remaining height for rows (now with availableHeightPx properly defined)
		let remainingHeight = availableHeightPx - tableHeaderHeight;
		console.log(`Remaining height for rows: ${remainingHeight.toFixed(1)}px (${pxToMm(remainingHeight).toFixed(2)}mm)`);

		// Log all rows with comprehensive style information
		Array.from(rows).forEach((row, index) => {
			const rowId = row.id || `row-${index}`;

			// Get and log the complete computed style object
			const computedStyle = window.getComputedStyle(row);
			const styleObject = computedStyleToObject(computedStyle);

			// Cell analysis - find the tallest cell
			if (row.cells && row.cells.length > 0) {
				let maxCellHeight = 0;
				let tallestCellIndex = 0;
				let tallestCellStyle = null;

				Array.from(row.cells).forEach((cell, cellIndex) => {
					const cellComputedStyle = window.getComputedStyle(cell);
					const cellHeight = cell.getBoundingClientRect().height;

					if (cellHeight > maxCellHeight) {
						maxCellHeight = cellHeight;
						tallestCellIndex = cellIndex;
						tallestCellStyle = computedStyleToObject(cellComputedStyle);
					}
				});
			}

			// Calculate and log remaining space
			const rowHeight = row.getBoundingClientRect().height;
			remainingHeight -= rowHeight;
		});

		// Also verify we can access rows by ID
		for (let i = 0; i < rows.length; i++) {
			const rowId = `analysis-row-${i}`;
			const rowById = document.getElementById(rowId);
		}
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

						const referenceCells = tempDiv.querySelectorAll('.reference-cell') || [];
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
				is_replace: showReplace,
				is_sign: showSign,
				created_by_uid: currentUser.identity_uid,
				receipt_note: receiptNote,
				additional_request: additionalRequest,
			};

			// Send the data to the API with the type parameter
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/insert/ppt', {
				report: requestBody,
				type: type, // Add the type param (publish/save)
			});

			if (response.status !== 200) {
				throw new Error(`API request failed with status ${response.status}`);
			}

			const result = response.data;

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
		if (!currentContent) {
			return {
				customerSection: customerSectionHTML || sectionContent.customerSection || '',
				sampleInfoSection: sampleInfoSectionHTML || sectionContent.sampleInfoSection || '',
				analysisSection: analysisSectionHTML || sectionContent.analysisSection || '',
				commentSection: showComment ? commentSectionHTML || sectionContent.commentSection || '' : '',
				notesSection: notesSectionHTML || sectionContent.notesSection || '',
				signatureSection: signatureSectionHTML || sectionContent.signatureSection || '',
			};
		}

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

		// Safe query selector helper for arrays
		const safeQueryAll = (element, selector) => {
			try {
				return element?.querySelectorAll?.(selector) || [];
			} catch (error) {
				return [];
			}
		};

		// Safe find helper for arrays
		const safeFind = (array, predicate) => {
			try {
				return array?.find?.(predicate);
			} catch (error) {
				return null;
			}
		};

		// Find customer section with safe queries
		const divElements = Array.from(safeQueryAll(tempContainer, 'div'));
		const customerSectionDiv = safeFind(
			divElements,
			(div) => div?.innerHTML && div.innerHTML.includes('Customer information'),
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
			extractedSections.customerSection = customerSectionHTML || sectionContent.customerSection || '';
		}

		// Find sample info section with safe queries
		const sampleInfoDiv = safeFind(
			divElements,
			(div) => div?.innerHTML && div.innerHTML.includes('Sample information'),
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
			extractedSections.sampleInfoSection = sampleInfoSectionHTML || sectionContent.sampleInfoSection || '';
		}

		// Find analysis section with safe query - protection against null
		const analysisTable = tempContainer?.querySelector?.('table');
		if (analysisTable && analysisTable.innerHTML && analysisTable.innerHTML.includes('Tests')) {
			// Find the parent container of the analysis section
			let analysisParent = analysisTable;
			while (analysisParent.parentElement && analysisParent.parentElement !== tempContainer) {
				analysisParent = analysisParent.parentElement;
				// If we reach a major section break, stop climbing
				if (analysisParent === tempContainer) break;
			}

			extractedSections.analysisSection = analysisParent.outerHTML;
		} else {
			extractedSections.analysisSection = analysisSectionHTML || sectionContent.analysisSection || '';
		}

		// Find comment section with safe queries
		const commentDiv = safeFind(divElements, (div) => div?.innerHTML && div.innerHTML.includes('Nhận xét / Comment:'));

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

		// Find notes section with safe queries
		const notesDiv = safeFind(divElements, (div) => div?.innerHTML && div.innerHTML.includes('Ghi chú / Note:'));

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
			extractedSections.notesSection = notesSectionHTML || sectionContent.notesSection || '';
		}

		// Find signature section with safe queries
		const signatureDiv = safeFind(divElements, (div) => div?.innerHTML && div.innerHTML.includes('Laboratory Manager'));

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
			extractedSections.signatureSection = signatureSectionHTML || sectionContent.signatureSection || '';
		}

		return extractedSections;
	}

	// Update the print method to use the prepared content
	useEffect(() => {
		if (contentRef.current && window.getComputedStyle) {
			// Apply initial line heights to the editor for WYSIWYG experience
			const editorStyleElement = document.createElement('style');
			editorStyleElement.textContent = `
				/* Nunito Sans Google Fonts */
				@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap');
				
				/* Font weight classes for Nunito Sans */
				.nunito-200 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 200; font-style: normal; }
				.nunito-300 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 300; font-style: normal; }
				.nunito-400 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 400; font-style: normal; }
				.nunito-500 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 500; font-style: normal; }
				.nunito-600 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 600; font-style: normal; }
				.nunito-700 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 700; font-style: normal; }
				.nunito-760 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 760; font-style: normal; }
				.nunito-800 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 800; font-style: normal; }
				.nunito-820 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 820; font-style: normal; }
				.nunito-840 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 840; font-style: normal; }
				.nunito-900 { font-family: "Nunito Sans", Arial, sans-serif; font-weight: 900; font-style: normal; }
				
				p {
					overflow-wrap: break-word !important;
					word-wrap: break-word !important;
				}
				
				.content-editable p, .content-editable div, .content-editable span,
					.content-editable td, .content-editable th, .content-editable li,
				.header-editable p, .header-editable div, .header-editable span,
				.footer-editable p, .footer-editable div, .footer-editable span {
					line-height: inherit;
					margin-top: 0;
					margin-bottom: 0;
					font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
					overflow-wrap: break-word !important;
					word-wrap: break-word !important;
				}
				
				/* Table styling in editor */
				.content-editable table {
					border-collapse: collapse;
					table-layout: fixed;
					font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
				}
				
				/* Table cell paragraph styling in editor */
				.content-editable table td p, .content-editable table th p {
					margin: 0 !important;
					padding: 0 !important;
					line-height: 1.2 !important;
					font-size: 12px;
					overflow-wrap: break-word !important;
					word-wrap: break-word !important;
				}

				.editable, .header-editable, .content-editable, .footer-editable {
					font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
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

						const referenceCells = tempDiv.querySelectorAll('.reference-cell') || [];
						if (referenceCells.length > 0) {
							const extractedRefs = Array.from(referenceCells).map((cell) => cell.outerHTML);
							setReferenceValues(extractedRefs);
						}
					}
				}
			}

			// When turning reference column on, use stored values or initialize new ones
			if (!prevShowRef && newShowRef) {
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

		// Update header when VLAS and KN state changes
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
			}

			// Find and update the main title based on showKN state
			const titleElement = tempDiv.querySelector('.content-header-title');
			if (titleElement) {
				titleElement.textContent = showKN ? 'PHIẾU KẾT QUẢ KIỂM NGHIỆM' : 'PHIẾU KẾT QUẢ THỬ NGHIỆM';
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
		};

		// Call the function to update VLAS visibility
		updateVlasVisibility();
	}, [showVlas, showComment, showReference, showKN, sampleData]);

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
			return dateString;
		}
	};

	// Add function to generate draft watermark
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
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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

	return (
		<div className="p-4 bg-gray-100 min-h-screen relative mt-1">
			<div className="flex flex-col w-fit mb-2">
				<h2 className="text-4xl font-medium text-primary text-start">Phiếu phân tích</h2>

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
						{loading && <span className="px-4 py-2 bg-yellow-500 text-white rounded">Đang tải...</span>}
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
							} px-3 py-1 w-24 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
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
							} px-3 py-1 w-24 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
							}`}
							disabled={isReadOnly}
						>
							CMT
						</button>

						<button
							onClick={() => !isReadOnly && setShowSign((prev) => !prev)}
							className={`${
								showSign ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
							} px-3 py-1 w-24 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
							}`}
							disabled={isReadOnly}
						>
							SIGN
						</button>

						<button
							onClick={() => {
								if (!isReadOnly) {
									const prevShowRef = showReference;
									setShowReference(!prevShowRef);
								}
							}}
							className={`${
								showReference ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
							} px-3 py-1 w-24 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
							}`}
							disabled={isReadOnly}
						>
							REF
						</button>

						<button
							onClick={() => !isReadOnly && setShowEnglish((prev) => !prev)}
							className={`${
								showEnglish ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
							} px-3 py-1 w-24 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
							}`}
							disabled={isReadOnly}
						>
							ENG
						</button>

						<button
							onClick={() => !isReadOnly && setShowKN((prev) => !prev)}
							className={`${
								showKN ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
							} px-3 py-1 w-24 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
							}`}
							disabled={isReadOnly}
						>
							KN
						</button>

						<button
							onClick={() => !isReadOnly && setShowReplace((prev) => !prev)}
							className={`${
								showReplace ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
							} px-3 py-1 w-24 ml-2 focus:outline-none border-2 border-gray-500 rounded-lg ${
								isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
							}`}
							disabled={isReadOnly}
						>
							REPLACE
						</button>

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
							fontFamily:
								"'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
							width: '718px',
							margin: '0 auto',
						}}
					>
						<div
							id="header-edit"
							className={`header-editable editable text-center font-bold text-lg border-b px-0 pt-8 pb-4 ${
								isReadOnly ? 'read-only' : ''
							}`}
							style={{
								fontFamily:
									"'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
								width: '100%',
							}}
							dangerouslySetInnerHTML={{
								__html: header.replace(/SƠ BỘ \/ DRAFT/g, pptUid || 'SƠ BỘ / DRAFT'),
							}}
						/>
						<div
							id="content-edit"
							ref={contentRef}
							className={`content-editable editable border-0 px-0 py-2 text-base my-4 ${isReadOnly ? 'read-only' : ''}`}
							style={{
								fontFamily:
									"'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
								width: '100%',
							}}
							dangerouslySetInnerHTML={{ __html: content }}
						/>
						<div
							id="footer-edit"
							className={`footer-editable editable px-0 pb-8 pt-4 ${isReadOnly ? 'read-only' : ''}`}
							style={{
								fontFamily:
									"'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
								width: '100%',
							}}
							dangerouslySetInnerHTML={{ __html: footer }}
						/>
					</div>
				</div>
			</div>

			<style jsx>{`
				/* Inter Google Fonts */
				@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

				/* Font weight classes for Inter */
				.inter-200 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 200;
					font-style: normal;
				}
				.inter-300 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 300;
					font-style: normal;
				}
				.inter-400 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 400;
					font-style: normal;
				}
				.inter-500 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 500;
					font-style: normal;
				}
				.inter-600 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 600;
					font-style: normal;
				}
				.inter-700 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 700;
					font-style: normal;
				}
				.inter-760 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 760;
					font-style: normal;
				}
				.inter-800 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 800;
					font-style: normal;
				}
				.inter-820 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 820;
					font-style: normal;
				}
				.inter-840 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 840;
					font-style: normal;
				}
				.inter-900 {
					font-family: 'Inter', Arial, sans-serif;
					font-weight: 900;
					font-style: normal;
				}

				.read-only {
					cursor: default !important;
				}

				@media print {
					body * {
						visibility: hidden;
						font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
					}
					.print-content,
					.print-content * {
						visibility: visible;
						font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
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
