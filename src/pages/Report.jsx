import { useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react';
import {
	measureSectionsInDOM,
	parseContentSections,
	applyClientSidePagination,
	generatePreviewHTML,
	openPreviewWindow,
} from '../contexts/reportPreviewHelpers';
import JsBarcode from 'jsbarcode';

// Barcode component for footer
const BarcodeGenerator = ({ value, width = 1, height = 30, format = 'CODE128' }) => {
	const canvasRef = useRef(null);

	useEffect(() => {
		if (canvasRef.current && value) {
			try {
				JsBarcode(canvasRef.current, value, {
					format: format,
					width: width,
					height: height,
					displayValue: false,
					margin: 2,
					background: 'transparent',
					lineColor: '#000000',
				});
			} catch (error) {
				console.error('Error generating barcode:', error);
			}
		}
	}, [value, width, height, format]);

	return <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />;
};

const ReportEditor = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const sampleId = searchParams.get('sampleId');
	const reportId = searchParams.get('reportId'); // Add reportId query param
	const refNumberFromUrl = searchParams.get('refNumber'); // Get refNumber from URL
	const receiptIdFromUrl = searchParams.get('receiptId'); // Get receiptId from URL
	const modeFromUrl = searchParams.get('mode'); // Get mode from URL (fullReport)
	const [sampleData, setSampleData] = useState(null);
	const [loading, setLoading] = useState(true);
	const { formatDate } = useContext(GlobalContext);

	// Sample selection states
	const [availableSamples, setAvailableSamples] = useState([]);
	const [selectedSampleId, setSelectedSampleId] = useState(sampleId || '');
	const [selectedReport, setSelectedReport] = useState(null);
	const [currentRefNumber, setCurrentRefNumber] = useState(refNumberFromUrl || ''); // Track current refNumber
	const [userClearedReport, setUserClearedReport] = useState(false); // Track if user manually cleared report selection

	// Multi-sample mode states
	const [viewMode, setViewMode] = useState('single'); // 'single' or 'all'
	const [allSamplesData, setAllSamplesData] = useState([]); // Array of sample data with editors
	const [receiptData, setReceiptData] = useState(null); // Full receipt data

	// Toggle states
	const [showVlas, setShowVlas] = useState(false);
	const [showComment, setShowComment] = useState(false);
	const [showReference, setShowReference] = useState(false);
	const [showEnglish, setShowEnglish] = useState(false);
	const [showKN, setShowKN] = useState(false);
	const [showSign, setShowSign] = useState(true);

	// Editor refs for TinyMCE
	const headerEditorRef = useRef(null);
	const contentEditorRef = useRef(null);
	const footerEditorRef = useRef(null);

	// Preview states
	const [showPreview, setShowPreview] = useState(false);
	const [paginatedPages, setPaginatedPages] = useState([]);

	// Fetch full receipt data (for "all samples" mode)
	const fetchReceiptData = async (receiptId) => {
		try {
			setLoading(true);
			const receiptResponse = await apiPost('https://red.irdop.org/v1/receipt/get/full', {
				receiptId: receiptId,
			});

			if (receiptResponse.status !== 200) {
				throw new Error(`Receipt API request failed with status ${receiptResponse.status}`);
			}

			const fullReceiptData = receiptResponse.data;
			setReceiptData(fullReceiptData);

			// Transform all samples data
			const transformedSamples = (fullReceiptData.samples || []).map((sample) => {
				const transformedSample = {
					sampleId: sample.sampleId,
					sampleName: sample.sampleName,
					sample_information: sample.sampleInformation || [],
					receiptId: receiptId,
					reports: sample.reports || [],
					client: {
						clientId: fullReceiptData.client?.clientUID || '',
						clientName: fullReceiptData.client?.clientName || '',
						clientAddress: fullReceiptData.client?.clientAddress || '',
					},
					analysis: (sample.analyses || []).map((analysis) => ({
						id: analysis.id,
						parameter_name: analysis.parameterName,
						matrix: analysis.matrix || sample.matrix || '',
						protocol_code: analysis.protocolCode,
						protocol_source: analysis.protocolSource,
						result_value: analysis.resultValue || '',
						result_unit: analysis.resultUnit || '',
						reference: analysis.reference || '',
						note: analysis.note || '',
						display_style: analysis.displayStyle || [
							{ label: 'default', value: analysis.parameterName },
							{ label: 'eng', value: '' },
						],
						accreditation: (() => {
							if (analysis.accreditation) {
								const acc = analysis.accreditation;
								const parts = [];
								if (acc['107']) parts.push('TĐC');
								if (acc['VILAS997']) parts.push('VS');
								return parts.join(', ');
							}
							return '';
						})(),
					})),
					// Initialize editor refs for this sample
					headerEditorRef: null,
					contentEditorRef: null,
					footerEditorRef: null,
					selectedReportIndex: null,
				};

				// Check for VLAS protocol
				const hasVlasProtocol = transformedSample.analysis.some((item) => item.protocol_source === 'IRDOP VS');
				transformedSample.showVlas = hasVlasProtocol;
				transformedSample.showComment = false;
				transformedSample.showReference = false;
				transformedSample.showEnglish = false;
				transformedSample.showKN = false;
				transformedSample.showSign = true;
				transformedSample.isHidden = false; // Add isHidden property

				// Generate initial header content with correct VLAS display
				transformedSample.headerContent = generateHeaderForSample(hasVlasProtocol);

				return transformedSample;
			});

			setAllSamplesData(transformedSamples);
			setLoading(false);
			return transformedSamples;
		} catch (err) {
			console.error('Error fetching receipt data:', err);
			setLoading(false);
			return [];
		}
	};

	// Fetch sample data from API
	const fetchSampleData = async (targetSampleId) => {
		const sampleIdToFetch = targetSampleId || selectedSampleId || sampleId;
		if (!sampleIdToFetch) return;

		try {
			setLoading(true);
			let receiptId = sampleIdToFetch.split('-')[0].replace('SP', 'TNM');

			let receiptResponse = await apiPost('https://red.irdop.org/v1/receipt/get/full', {
				receiptId: receiptId,
			});

			// If receipt API fails, try to get receiptId from sample API
			if (receiptResponse.status !== 200 || receiptResponse.data == null) {
				console.warn('⚠️ Receipt API failed, trying to get receiptId from sample API');

				const sampleResponse = await apiPost('https://red.irdop.org/v1/sample/get/full', {
					sampleId: sampleIdToFetch,
				});

				if (sampleResponse.status === 200 && sampleResponse.data?.receiptId) {
					receiptId = sampleResponse.data.receiptId;
					console.log('✅ Got receiptId from sample API:', receiptId);

					// Retry receipt API with correct receiptId
					receiptResponse = await apiPost('https://red.irdop.org/v1/receipt/get/full', {
						receiptId: receiptId,
					});

					if (receiptResponse.status !== 200) {
						throw new Error(`Receipt API request failed with status ${receiptResponse.status}`);
					}
				} else {
					throw new Error(`Failed to get receiptId from sample API`);
				}
			}

			const receiptData = receiptResponse.data;
			setReceiptData(receiptData);
			const currentSample = receiptData.samples?.find((s) => s.sampleId === sampleIdToFetch);

			if (!currentSample) {
				throw new Error('Sample not found in receipt data');
			}

			// Transform data structure
			const sampleResult = {
				sampleId: currentSample.sampleId,
				sampleName: currentSample.sampleName,
				sample_information: currentSample.sampleInformation || [],
				receiptId: receiptId,
				reports: currentSample.reports || [], // Add reports array
				client: {
					clientId: receiptData.client?.clientUID || '',
					clientName: receiptData.client?.clientName || '',
					clientAddress: receiptData.client?.clientAddress || '',
				},
				analysis: (currentSample.analyses || []).map((analysis) => ({
					id: analysis.id,
					parameter_name: analysis.parameterName,
					matrix: analysis.matrix || currentSample.matrix || '',
					protocol_code: analysis.protocolCode,
					protocol_source: analysis.protocolSource,
					result_value: analysis.resultValue || '',
					result_unit: analysis.resultUnit || '',
					reference: analysis.reference || '',
					note: analysis.note || '',
					display_style: analysis.displayStyle || [
						{ label: 'default', value: analysis.parameterName },
						{ label: 'eng', value: '' },
					],
					accreditation: (() => {
						if (analysis.accreditation) {
							const acc = analysis.accreditation;
							const parts = [];
							if (acc['107']) parts.push('TĐC');
							if (acc['VILAS997']) parts.push('VS');
							return parts.join(', ');
						}
						return '';
					})(),
				})),
			};

			setSampleData(sampleResult);

			// Check for VLAS protocol
			if (sampleResult.analysis && Array.isArray(sampleResult.analysis)) {
				const hasVlasProtocol = sampleResult.analysis.some((item) => item.protocol_source === 'IRDOP VS');
				if (hasVlasProtocol) {
					setShowVlas(true);
				}
			}

			updateContentWithData(sampleResult);
			setLoading(false);
		} catch (err) {
			console.error('Error fetching sample data:', err);
			setLoading(false);
		}
	};

	// Fetch available samples for receipt
	const fetchAvailableSamples = async (receiptId) => {
		try {
			const response = await apiPost('https://red.irdop.org/v1/option/get/list', {
				listType: 'sampleIdsByReceiptId',
				param: { receiptId },
			});

			if (response.status === 200 && Array.isArray(response.data)) {
				setAvailableSamples(response.data);
			}
		} catch (error) {
			console.error('Error fetching available samples:', error);
		}
	};

	useEffect(() => {
		const loadData = async () => {
			// Check if full report mode
			if (modeFromUrl === 'fullReport' && receiptIdFromUrl) {
				setViewMode('all');
				await fetchReceiptData(receiptIdFromUrl);
				return;
			}

			if (sampleId) {
				setSelectedSampleId(sampleId);
				await fetchSampleData(sampleId);

				// Fetch available samples for this receipt
				const receiptId = sampleId.split('-')[0].replace('SP', 'TNM');
				await fetchAvailableSamples(receiptId);

				// After sample data is loaded, check if we need to load a specific report
				if (refNumberFromUrl) {
					console.log('🔍 Loading report from URL:', refNumberFromUrl);
					await fetchReportData(refNumberFromUrl);
					setCurrentRefNumber(refNumberFromUrl);
				} else if (reportId) {
					console.log('🔍 Loading report from reportId:', reportId);
					await fetchReportData(reportId);
					setCurrentRefNumber(reportId);
				}
			}
		};

		loadData();
	}, [sampleId, reportId, refNumberFromUrl, receiptIdFromUrl, modeFromUrl]);

	// useEffect to load report when sampleData is ready and we have a refNumber/reportId from URL
	useEffect(() => {
		// Don't auto-load if user manually cleared the report selection
		if (userClearedReport) {
			return;
		}

		if (sampleData && sampleData.reports && (refNumberFromUrl || reportId) && !selectedReport) {
			const targetRefNumber = refNumberFromUrl || reportId;

			// Check if this report exists in sampleData.reports
			const matchingReport = sampleData.reports.find((r) => r.refNumber === targetRefNumber);
			if (matchingReport) {
				console.log('🔄 Auto-loading report after sampleData is ready:', targetRefNumber);
				fetchReportData(targetRefNumber);
				setCurrentRefNumber(targetRefNumber);
			}
		}
	}, [sampleData, refNumberFromUrl, reportId, selectedReport, userClearedReport]);

	// Handle sample selection change
	const handleSampleChange = (e) => {
		const newSampleId = e.target.value;
		setSelectedSampleId(newSampleId);
		setSelectedReport(null); // Reset report selection
		setUserClearedReport(false); // Reset flag when changing sample

		// Update URL with new sampleId
		const newUrl = new URL(window.location.href);
		newUrl.searchParams.set('sampleId', newSampleId);
		newUrl.searchParams.delete('refNumber'); // Clear refNumber when changing sample
		newUrl.searchParams.delete('reportId'); // Clear reportId when changing sample
		window.history.pushState({}, '', newUrl);

		// Clear current refNumber
		setCurrentRefNumber('');

		fetchSampleData(newSampleId);
	};

	// Handle report selection change
	const handleReportChange = async (e) => {
		const reportIndex = e.target.value;
		console.log('📝 handleReportChange called with value:', reportIndex);

		// Check if user selected default option (empty string or "")
		if (reportIndex === '' || reportIndex === undefined || reportIndex === null) {
			console.log('🔄 Clearing report selection');
			setSelectedReport(null);
			setUserClearedReport(true); // Mark that user manually cleared selection

			// Remove refNumber from URL
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete('refNumber');
			window.history.pushState({}, '', newUrl);

			// Clear current refNumber state
			setCurrentRefNumber('');
			console.log('✅ Report selection cleared');
			return;
		}

		const parsedIndex = parseInt(reportIndex);
		console.log('📊 Parsed index:', parsedIndex);

		if (sampleData && sampleData.reports && sampleData.reports[parsedIndex]) {
			const report = sampleData.reports[parsedIndex];
			console.log('✅ Setting report:', report.refNumber);
			setSelectedReport(report);
			setUserClearedReport(false); // Reset flag when user selects a report

			// Update URL with refNumber query parameter
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.set('refNumber', report.refNumber);
			window.history.pushState({}, '', newUrl);

			// Update current refNumber state
			setCurrentRefNumber(report.refNumber);

			// Fetch full report data from API
			await fetchReportData(report.refNumber);
		}
	};

	// Fetch report data from API and load into editors
	const fetchReportData = async (refNumber) => {
		try {
			setLoading(true);
			const response = await apiPost('https://red.irdop.org/v1/report/get', {
				reportId: refNumber,
			});

			if (response.status === 200 && response.data) {
				const reportData = response.data;

				// Apply toggle states from report data
				setShowVlas(reportData.isVlas || false);
				setShowComment(reportData.isComment || false);
				setShowReference(reportData.isReference || false);

				// Helper function to ensure section has proper ID
				const ensureSectionId = (html, sectionId) => {
					if (!html) return '';
					// Check if already has the ID
					if (html.includes(`id="${sectionId}"`)) return html;

					// Add ID to the first opening tag
					const firstTagMatch = html.match(/^(\s*<[^>]+)(>)/);
					if (firstTagMatch) {
						return html.replace(firstTagMatch[0], `${firstTagMatch[1]} id="${sectionId}"${firstTagMatch[2]}`);
					}
					return html;
				};

				// Load header section
				if (reportData.headerSection) {
					const headerWithId = ensureSectionId(reportData.headerSection, 'header-section');
					setHeader(headerWithId);
					setTimeout(() => {
						if (headerEditorRef.current) {
							headerEditorRef.current.setContent(headerWithId);
						}
					}, 100);
				}

				// Load footer section
				if (reportData.footerSection) {
					const footerWithId = ensureSectionId(reportData.footerSection, 'footer-section');
					setFooter(footerWithId);
					setTimeout(() => {
						if (footerEditorRef.current) {
							footerEditorRef.current.setContent(footerWithId);
						}
					}, 100);
				}

				// Build content from sections
				const contentParts = [];

				if (reportData.customerSection) {
					contentParts.push(ensureSectionId(reportData.customerSection, 'customer-section'));
					contentParts.push(spacing);
				}

				if (reportData.sampleSection) {
					contentParts.push(ensureSectionId(reportData.sampleSection, 'sample-section'));
					contentParts.push(spacing);
				}

				// Analysis section - should already be a table
				if (reportData.analysisSection) {
					contentParts.push(ensureSectionId(reportData.analysisSection, 'analysis-section'));
					contentParts.push(spacing);
				}

				if (reportData.commentSection && reportData.isComment) {
					contentParts.push(ensureSectionId(reportData.commentSection, 'comment-section'));
					contentParts.push(spacing);
				}

				if (reportData.noteSection) {
					contentParts.push(ensureSectionId(reportData.noteSection, 'notes-section'));
					contentParts.push(spacing);
				}

				if (reportData.signatureSection) {
					contentParts.push(ensureSectionId(reportData.signatureSection, 'signature-section'));
				}

				const fullContent = contentParts.join('');
				setContent(fullContent);
				setTimeout(() => {
					if (contentEditorRef.current) {
						contentEditorRef.current.setContent(fullContent);
					}
				}, 100);

				// Auto-select this report in dropdown if it exists in sampleData.reports
				if (sampleData && sampleData.reports) {
					const matchingReport = sampleData.reports.find((r) => r.refNumber === refNumber);
					if (matchingReport) {
						setSelectedReport(matchingReport);
					}
				}

				console.log('✅ Report data loaded successfully:', refNumber);
			}

			setLoading(false);
		} catch (error) {
			console.error('❌ Error fetching report data:', error);
			setLoading(false);
		}
	};

	// Generate customer section
	const generateCustomerSection = (clientData) => {
		const clientId = clientData?.clientId || '';
		const clientName = clientData?.clientName || '';
		const clientAddress = clientData?.clientAddress || '';

		return `
<div id="customer-section" style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
	<div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
		<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: left;">Nơi / người gửi mẫu / Customer information</p>
			<p style="font-size: 11px; line-height: 1.2; margin:0; text-align: right; color: black; text-decoration: none;">${clientId}</p>
		</div>		
		<div style="display: flex; flex-direction: column; gap: 2px; height: fit-content;">
			<p style="font-weight: 760; margin: 0; text-align: left; font-size: 16px; line-height: 1.2;">${clientName}</p>
			<p style="margin: 0; font-size: 12px; text-align: left; line-height: 1.2;">${clientAddress || '--'}</p>
		</div>
	</div>
</div>`;
	};

	// Generate sample information section
	const generateSampleInfoSection = (data) => {
		const sampleId = data.sampleId || '';
		let sampleInfo = data.sample_information || [];

		if (!Array.isArray(sampleInfo)) {
			try {
				sampleInfo = JSON.parse(sampleInfo);
			} catch (e) {
				sampleInfo = [];
			}
		}

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
			<div style="display: grid; grid-template-columns: 27% 23% 30% 20%; margin-top: 8px;">
				<div style="font-size: 12px; line-height: 1.2; text-align: left;">
					<p style="margin: 0;"><span style="font-weight:bold;">${displayMainLabel}</span>${engLabel}:</p>
				</div>
				<div style="font-size: 12px; line-height: 1.2; text-align: left;">
					<p style="margin: 0;">${fieldValue}</p>
				</div>
				<div style="font-size: 12px; line-height: 1.2; text-align: left;">
					<p style="margin: 0;"><span style="font-weight:bold;">Thời gian lưu mẫu</span> / Storage time:</p>
				</div>
				<div style="font-size: 12px; line-height: 1.2; text-align: left;">
					<p style="margin: 0;">Không có mẫu lưu</p>
				</div>
			</div>`;
				}
				return `
			<div style="display: grid; grid-template-columns: 27% 23% 30% 20%;">
				<div style="font-size: 12px; line-height: 1.2; text-align: left;">
					<p style="margin: 0;"><span style="font-weight:bold;">${displayMainLabel}</span>${engLabel}:</p>
				</div>
				<div style="grid-column: span 3; font-size: 12px; line-height: 1.2; text-align: left;">
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
	};

	// Generate analysis section
	const generateAnalysisSection = (data) => {
		const analysisItems = data.analysis || [];

		const referenceHeader = showReference
			? `
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 15%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Tham chiếu</strong> <br> <span style="font-size: 12px; color: #444444;">/ Standard Ref</span>
			</th>`
			: '';

		let analysisRows = '';
		if (analysisItems.length > 0) {
			analysisRows = analysisItems
				.map((item, index) => {
					let parameterName = item.parameter_name || '--';

					if (item.display_style && Array.isArray(item.display_style)) {
						const defaultItem = item.display_style.find((style) => style.label === 'default');
						if (defaultItem && defaultItem.value && defaultItem.value.trim() !== '') {
							parameterName = defaultItem.value;
						}

						if (showEnglish) {
							const engItem = item.display_style.find((style) => style.label === 'eng');
							if (engItem && engItem.value && engItem.value.trim() !== '') {
								if (parameterName.includes('</p>')) {
									parameterName = parameterName.replace('</p>', '/</p>');
								} else {
									parameterName += '/';
								}
								parameterName += engItem.value;
							}
						}
					}

					const result = item.result_value || '--';
					const unit = item.result_unit || '--';
					const protocol = item.protocol_code || '--';

					const accreditationParts = item.accreditation
						? item.accreditation
								.split(',')
								.map((part) => part.trim())
								.filter((part) => part.length > 0)
						: [];
					const protocolSource = item.protocol_source || '';
					const scope = protocolSource + (accreditationParts.length > 0 ? ' ' + accreditationParts.join(' ') : '');

					let referenceCell = '';
					if (showReference) {
						referenceCell = `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">--</td>`;
					}

					return `
				<tr id="analysis-row-${index}" class="table-row">
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${
						index + 1
					}.</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${parameterName}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${result}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${unit}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${protocol}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${scope}</td>${referenceCell}
				</tr>`;
				})
				.join('');
		}

		const resultHeader = showKN ? 'Kết quả kiểm nghiệm' : 'Kết quả';
		const resultHeaderEng = showKN ? '/ Inspection result' : '/ Test result';

		const knParagraph = showKN
			? `<p style="font-weight: bold; text-align: left; font-size: 12px; margin: 0 0 8px 0; padding: 0;">Kết quả thử nghiệm:</p>`
			: '';

		// Wrap table in div with ID for consistency with other sections
		const tableHTML = `
<table style="width: 100%; border-collapse: collapse; text-align: left; margin:0; padding:0; font-size:12px;">
	<thead>
		<tr>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 45px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>STT</strong> <br> <span style="font-size: 12px; color: #444444;">/ No.</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phép thử</strong> <br> <span style="font-size: 12px; color: #444444;">/ Tests</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>${resultHeader}</strong> <br> <span style="font-size: 12px; color: #444444;">${resultHeaderEng}</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Đơn vị</strong><br> <span style="font-size: 12px; color: #444444;">/ Unit</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phương pháp</strong> <br> <span style="font-size: 12px; color: #444444;">/ Protocol</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phạm vi công nhận</strong> <br> <span style="font-size: 12px; color: #444444;">/ Accreditation scope</span>
			</th>${referenceHeader}
		</tr>
	</thead>
	<tbody>
		${analysisRows}
	</tbody>
</table>`;

		// Wrap table in a div with ID
		if (knParagraph) {
			return (
				knParagraph +
				`
<div id="analysis-section">
${tableHTML}
</div>`
			);
		} else {
			return `
<div id="analysis-section">
${tableHTML}
</div>`;
		}
	};

	// Generate comment section
	const generateCommentSection = () => {
		return `
<div id="comment-section" style="padding-top: 0; display: flex; flex-direction: column; margin:0;">
	<div style="padding: 0pt; flex-grow: 1; position: relative;">
		<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
			<p style="margin:0; font-size:12px; line-height:1.2;">Nhận xét / Comment:</p>
		</div>
		<div style="display: flex; flex-direction: column; gap: 2px; padding-left: 8px;">
			<p style="font-size:12px; margin:0; padding:0; line-height: 1.2; text-align:left;">--</p>
		</div>
	</div>
</div>`;
	};

	// Generate notes section
	const generateNotesSection = () => {
		const sampleInfoText = showKN
			? 'Thông tin mẫu kiểm nghiệm do khách hàng cung cấp / Sample information provided by the customer.'
			: 'Thông tin mẫu thử nghiệm do khách hàng cung cấp / Sample information provided by the customer.';

		return `
<div id="notes-section" style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
	<div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
		<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
			<p style="font-weight:bold; margin:0; font-size:11px; line-height:1.0;">Ghi chú / Note:</p>
		</div>
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<p style="font-size:11px; margin:0; padding:0; line-height: 1.2; text-align:left;">
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

	// Generate signature section
	const generateSignatureSection = () => {
		return `
<div id="signature-section" style="padding: 0 8px; display: flex; flex-direction:column; margin:0;">
	<div style="padding: 0pt; flex-grow: 1; position: relative; display:flex; justify-content:space-between;height:2.7cm;">
		<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between; max-width:fit-content;">
			${
				showSign
					? `<strong style="font-size:12px; line-height:1.2; margin:0;">TRƯỞNG PHÒNG KIỂM NGHIỆM<br>PHÒNG ĐẢM BẢO CHẤT LƯỢNG / Quality Assurance Manager</strong>
			<p style="font-size:12px; margin:0; line-height:1.4;">Trần Thị Lan</p>`
					: ''
			}
		</div>
		<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between; max-width:fit-content;">
			<strong style="font-size:12px; line-height:1.2; margin:0;">KT.VIỆN TRƯỞNG<br>PHÓ VIỆN TRƯỞNG / Vice President</strong>
			<p style="font-size:12px; margin:0; line-height:1.4;">Nguyễn Bá Xuân Trường</p>
		</div>
	</div>
</div>`;
	};

	// Generate header section for a sample with custom showVlas
	const generateHeaderForSample = (sampleShowVlas, refNumber = null, sampleShowKN = false) => {
		const displayVlas = sampleShowVlas ? '' : 'display:none;';
		const refCode = refNumber || 'SƠ BỘ / DRAFT';
		const title = sampleShowKN ? 'PHIẾU KẾT QUẢ KIỂM NGHIỆM' : 'PHIẾU KẾT QUẢ THỬ NGHIỆM';

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
			<p style="font-weight:900; font-size:24pt; color:#0058A3; height: 36px;">${title}</p>
			<p style="font-weight:800; font-size:21pt; color:#0058A3; height: 36px;">/ Certificate of Analysis</p>
			<div style="display: flex; align-items: center; gap: 2mm; font-size:12px; margin-top: 0px; height: 20px;">
				<span>Xuất bản / ref.:</span>
				<p class="ref_code" style="min-width:5pt; margin: 0; margin-right: 2mm;">${refCode}</p>
				<span style="min-width:5pt; margin: 0;">Ngày / Date: ${formatDate(new Date())}</span>
			</div>
		</div>
		<div class="vlas_icon" style="position:absolute; right:0mm; top:0.2cm; ${displayVlas}">
			<img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/VILAS%20997.WIu1HeH5wkOQ5k1olzA3Wg.png" 
				 loading="lazy" style="width:4.16cm;">
		</div>
	</div>
</div>`;
	};

	const spacing = `<div style="height: 4mm; margin:0; padding:0;"></div>`;

	const [content, setContent] = useState('');
	const [header, setHeader] = useState(`
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
				<span style="min-width:5pt; margin: 0;">Ngày / Date: ${formatDate(new Date())}</span>
			</div>
		</div>
		<div class="vlas_icon" style="position:absolute; right:0mm; top:0.2cm; ${showVlas ? '' : 'display:none;'}">
			<img src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/VILAS%20997.WIu1HeH5wkOQ5k1olzA3Wg.png" 
				 loading="lazy" style="width:4.16cm;">
		</div>
	</div>
</div>`);

	const [footer, setFooter] = useState(`
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
	<div style="font-size: 11px; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; height: 100%; gap: 2px;">
		<canvas class="barcode-canvas" data-value="" style="width: 210px; height: 23px; margin-bottom: 2px; margin-top: 4px;"></canvas>
		<div style="display: flex; align-items: center;">
			<span style="margin-right: 2px;">Trang / Pages:</span>
			<span>01 / 01</span>
		</div>
	</div>
</div>`);

	// Update content when sample data or toggles change
	const updateContentWithData = (data) => {
		if (!data) return;

		const customerSection = generateCustomerSection(data.client);
		const sampleInfoSection = generateSampleInfoSection(data);
		const analysisSection = generateAnalysisSection(data);
		const commentSection = showComment ? generateCommentSection() : '';
		const notesSection = generateNotesSection();
		const signatureSection = generateSignatureSection();

		const contentParts = [customerSection, spacing, sampleInfoSection, spacing, analysisSection, spacing];

		if (showComment) {
			contentParts.push(commentSection, spacing);
		}

		contentParts.push(notesSection, spacing, signatureSection);

		const updatedContent = contentParts.join('');
		setContent(updatedContent);

		// Update TinyMCE editor - use setTimeout to ensure editor is ready
		setTimeout(() => {
			if (contentEditorRef.current && typeof contentEditorRef.current.setContent === 'function') {
				contentEditorRef.current.setContent(updatedContent);
			}
		}, 100);
	};

	// Update content when toggle states change
	useEffect(() => {
		if (sampleData) {
			updateContentWithData(sampleData);
		}
	}, [showComment, showSign, showReference, showKN, sampleData]);

	// Update header based on all dependencies
	useEffect(() => {
		console.log('🔄 Header update triggered:', { showVlas, showKN, currentRefNumber });

		// Generate new header HTML with current state
		const newHeaderHTML = generateHeaderForSample(showVlas, currentRefNumber, showKN);

		// Update the header state
		setHeader(newHeaderHTML);

		// Wait for editor to be ready, then update it
		const updateEditor = () => {
			if (!headerEditorRef.current) {
				console.log('⏳ Header editor not ready yet');
				return;
			}

			try {
				if (typeof headerEditorRef.current.setContent === 'function') {
					headerEditorRef.current.setContent(newHeaderHTML);
					console.log('✅ Header editor content updated with VLAS:', showVlas);
				}
			} catch (error) {
				console.error('❌ Error updating header editor:', error);
			}

			// Also update title in the content if showKN changed
			if (headerEditorRef.current && typeof headerEditorRef.current.getBody === 'function') {
				const editorBody = headerEditorRef.current.getBody();
				if (editorBody) {
					const titleElement = editorBody.querySelector('p[style*="font-size:24pt"]');
					if (titleElement) {
						titleElement.textContent = showKN ? 'PHIẾU KẾT QUẢ KIỂM NGHIỆM' : 'PHIẾU KẾT QUẢ THỬ NGHIỆM';
					}
				}
			}
		};

		// Try immediate update
		updateEditor();

		// If editor not ready, try again after a delay
		const timeout = setTimeout(() => {
			updateEditor();
		}, 100);

		return () => clearTimeout(timeout);
	}, [showVlas, showKN, currentRefNumber]);

	// Helper function to add computed widths to table columns
	const normalizeTableWidths = (htmlContent, editorRef) => {
		if (!editorRef || !editorRef.getBody) return htmlContent;

		try {
			const editorBody = editorRef.getBody();
			const parser = new DOMParser();
			const doc = parser.parseFromString(htmlContent, 'text/html');

			// Find all tables in the content
			const tables = doc.querySelectorAll('table');

			tables.forEach((table) => {
				// Find corresponding table in editor
				const tableId = table.id || table.querySelector('[id]')?.closest('table')?.id;
				let editorTable = null;

				if (tableId) {
					editorTable = editorBody.querySelector(`#${tableId} table, table#${tableId}`);
				}

				// If not found by ID, try to find by position/structure
				if (!editorTable) {
					const editorTables = editorBody.querySelectorAll('table');
					// Simple heuristic: match by number of rows/cols
					const contentRows = table.querySelectorAll('tr').length;
					const contentCols = table.querySelector('tr')?.querySelectorAll('th, td').length || 0;

					for (let et of editorTables) {
						const editorRows = et.querySelectorAll('tr').length;
						const editorCols = et.querySelector('tr')?.querySelectorAll('th, td').length || 0;
						if (editorRows === contentRows && editorCols === contentCols) {
							editorTable = et;
							break;
						}
					}
				}

				if (editorTable) {
					// Get computed widths from editor table
					const editorHeaderCells = editorTable.querySelectorAll('thead th');
					const contentHeaderCells = table.querySelectorAll('thead th');

					editorHeaderCells.forEach((editorTh, index) => {
						if (contentHeaderCells[index]) {
							const computedWidth = editorTh.offsetWidth;
							if (computedWidth > 0) {
								// Check if width is already set
								const currentStyle = contentHeaderCells[index].getAttribute('style') || '';
								if (!currentStyle.includes('width:') && !currentStyle.includes('width :')) {
									contentHeaderCells[index].setAttribute(
										'style',
										`${currentStyle}${currentStyle ? ' ' : ''}width: ${computedWidth}px;`,
									);
								}
							}
						}
					});

					// Also set width for body cells in each column
					const contentRows = table.querySelectorAll('tbody tr');
					contentRows.forEach((row, rowIndex) => {
						const cells = row.querySelectorAll('td');
						cells.forEach((cell, colIndex) => {
							if (editorHeaderCells[colIndex]) {
								const computedWidth = editorHeaderCells[colIndex].offsetWidth;
								if (computedWidth > 0) {
									const currentStyle = cell.getAttribute('style') || '';
									if (!currentStyle.includes('width:') && !currentStyle.includes('width :')) {
										cell.setAttribute('style', `${currentStyle}${currentStyle ? ' ' : ''}width: ${computedWidth}px;`);
									}
								}
							}
						});
					});
				}
			});

			return doc.body.innerHTML;
		} catch (error) {
			console.error('Error normalizing table widths:', error);
			return htmlContent;
		}
	};

	// Preview for single sample mode
	const handleSinglePreview = async () => {
		try {
			const headerHTML = headerEditorRef.current?.getContent() || header;
			let contentHTML = contentEditorRef.current?.getContent() || content;
			const footerHTML = footerEditorRef.current?.getContent() || footer;

			// Normalize table widths in content before preview
			contentHTML = normalizeTableWidths(contentHTML, contentEditorRef.current);

			const measurementData = await measureSectionsInDOM(headerHTML, contentHTML, footerHTML);
			const paginatedPages = applyClientSidePagination(headerHTML, contentHTML, footerHTML, measurementData);

			// Get sample ID for filename
			const currentSampleId = sampleData?.sampleId || selectedSampleId || sampleId;

			const finalHTML = generatePreviewHTML(
				paginatedPages,
				measurementData,
				headerHTML,
				footerHTML,
				currentRefNumber,
				currentSampleId,
			);
			openPreviewWindow(finalHTML, currentSampleId);
		} catch (error) {
			console.error('Error generating preview:', error);
			alert('Có lỗi khi tạo preview: ' + error.message);
		}
	};

	// Preview for all samples mode
	const handleAllSamplesPreview = async () => {
		try {
			console.log('🚀 Starting all samples preview...');
			console.log('📊 Total samples:', allSamplesData.length);

			// Wait a bit for editors to be ready
			await new Promise((resolve) => setTimeout(resolve, 500));

			const allSamplesHTML = [];

			// Process each sample individually, skip hidden samples
			for (let i = 0; i < allSamplesData.length; i++) {
				const sample = allSamplesData[i];

				// Skip hidden samples
				if (sample.isHidden) {
					console.log(`⏭️ Skipping hidden sample: ${sample.sampleId}`);
					continue;
				}

				console.log(`\n📝 Processing sample ${i + 1}/${allSamplesData.length}:`, sample.sampleId);

				const headerRef = sample.headerEditorRef;
				const contentRef = sample.contentEditorRef;
				const footerRef = sample.footerEditorRef;

				console.log('🔍 Editor refs status:', {
					headerRef: !!headerRef,
					contentRef: !!contentRef,
					footerRef: !!footerRef,
				});

				// Get content - use stored content if editors not ready, or generate default
				let headerHTML = headerRef?.getContent() || sample.headerContent || header;
				let contentHTML = contentRef?.getContent() || sample.contentContent;
				let footerHTML = footerRef?.getContent() || sample.footerContent || footer;

				// If still no content, generate from sample data
				if (!contentHTML || contentHTML.trim() === '') {
					console.log('⚙️ Generating content from sample data...');
					const contentParts = [
						generateCustomerSection(sample.client),
						spacing,
						generateSampleInfoSection(sample),
						spacing,
						generateAnalysisSection(sample),
						spacing,
						generateNotesSection(),
						spacing,
						generateSignatureSection(),
					];
					contentHTML = contentParts.join('');
				}

				console.log('📄 Content lengths:', {
					header: headerHTML.length,
					content: contentHTML.length,
					footer: footerHTML.length,
				});

				if (!headerHTML || !contentHTML || !footerHTML) {
					console.error('❌ Missing content for sample:', sample.sampleId);
					continue;
				}

				console.log('🔧 Processing pagination for sample:', sample.sampleId);

				// Normalize table widths in content before processing
				contentHTML = normalizeTableWidths(contentHTML, contentRef);

				// Extract refNumber from sample (check selected report or sample.refNumber)
				let sampleRefNumber = null;
				if (sample.selectedReportIndex !== null && sample.reports && sample.reports[sample.selectedReportIndex]) {
					sampleRefNumber = sample.reports[sample.selectedReportIndex].refNumber;
				} else if (sample.refNumber) {
					sampleRefNumber = sample.refNumber;
				}

				try {
					// Process this sample exactly like single mode
					const measurementData = await measureSectionsInDOM(headerHTML, contentHTML, footerHTML);
					console.log('📏 Measurement data:', measurementData);

					const paginatedPages = applyClientSidePagination(headerHTML, contentHTML, footerHTML, measurementData);
					console.log('📄 Paginated pages:', paginatedPages.length);

					if (paginatedPages.length === 0) {
						console.warn('⚠️ No pages generated for sample:', sample.sampleId);
						continue;
					}

					const sampleHTML = generatePreviewHTML(
						paginatedPages,
						measurementData,
						headerHTML,
						footerHTML,
						sampleRefNumber,
					);
					console.log('✅ Generated HTML length:', sampleHTML.length);

					// Extract only the pages (body content) from the generated HTML
					const parser = new DOMParser();
					const doc = parser.parseFromString(sampleHTML, 'text/html');
					const pages = doc.querySelectorAll('.a4-page');

					console.log('📑 Extracted pages:', pages.length);

					if (pages.length === 0) {
						console.warn('⚠️ No .a4-page elements found in HTML for sample:', sample.sampleId);
						// Try to add the whole body as a page
						const bodyContent = doc.body.innerHTML;
						if (bodyContent && bodyContent.trim() !== '') {
							console.log('📦 Using body content as fallback');
							allSamplesHTML.push(`<div class="a4-page">${bodyContent}</div>`);
						}
					} else {
						// Collect all page HTML
						pages.forEach((page, pageIndex) => {
							console.log(`  - Adding page ${pageIndex + 1} from sample ${sample.sampleId}`);
							allSamplesHTML.push(page.outerHTML);
						});
					}
				} catch (sampleError) {
					console.error(`❌ Error processing sample ${sample.sampleId}:`, sampleError);
					continue;
				}
			}

			console.log('\n🎯 Total pages collected:', allSamplesHTML.length);

			if (allSamplesHTML.length === 0) {
				console.error('❌ No pages generated!');
				console.log('Debug info:', {
					samplesCount: allSamplesData.length,
					samples: allSamplesData.map((s) => ({
						id: s.sampleId,
						hasHeaderRef: !!s.headerEditorRef,
						hasContentRef: !!s.contentEditorRef,
						hasFooterRef: !!s.footerEditorRef,
						hasHeaderContent: !!s.headerContent,
						hasContentContent: !!s.contentContent,
						hasFooterContent: !!s.footerContent,
					})),
				});
				alert(
					'Không có trang nào được tạo. Vui lòng:\n1. Kiểm tra console log\n2. Đảm bảo đã chọn báo cáo cho ít nhất một sample\n3. Chờ editors load xong trước khi preview',
				);
				return;
			}

			// Collect all sample IDs for filename (only visible samples)
			const allSampleIds = allSamplesData.filter((sample) => !sample.isHidden).map((sample) => sample.sampleId);

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

			const documentTitle = `Certificate of analysis - ${allSampleIds.join(' ')} - ${dateTimeStr}`;

			// Combine all pages into a single HTML document
			const finalHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${documentTitle}</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
	<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: 'Wix Madefor Display', sans-serif;
			background: #f5f5f5;
			padding: 20px;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 20px;
		}
		.a4-page {
			width: 794px;
			min-height: 1122px;
			background: white;
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
			position: relative;
			page-break-after: always;
			break-after: page;
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
		@media print {
			body {
				background: white;
				padding: 0;
				gap: 0;
			}
			.a4-page {
				box-shadow: none;
				margin: 0;
				page-break-after: always;
				break-after: page;
			}
			.watermark {
				color: rgba(255, 0, 0, 0.15) !important;
			}
		}
		@page {
			size: A4;
			margin: 0;
		}
	</style>
</head>
<body>
	${allSamplesHTML.join('\n')}
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
							width: 2,
							height: 23,
							displayValue: false,
							margin: 0,
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

			console.log('✅ Final HTML generated, opening preview window...');
			openPreviewWindow(finalHTML, allSampleIds);
		} catch (error) {
			console.error('❌ Error generating all samples preview:', error);
			alert('Có lỗi khi tạo preview toàn bộ phiếu: ' + error.message);
		}
	};

	// Main preview handler
	const handlePreview = async () => {
		if (viewMode === 'single') {
			await handleSinglePreview();
		} else {
			await handleAllSamplesPreview();
		}
	};

	// Handle save report(s)
	const handleSave = async () => {
		try {
			if (viewMode === 'single') {
				// Mode one: Save single report
				const headerContent = headerEditorRef.current?.getContent() || '';
				const contentEditorContent = contentEditorRef.current?.getContent() || '';
				const footerContent = footerEditorRef.current?.getContent() || '';

				// Parse content sections
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = contentEditorContent;

				const customerSection = tempDiv.querySelector('#customer-section')?.outerHTML || '';
				const sampleSection = tempDiv.querySelector('#sample-section')?.outerHTML || '';
				const analysisSection = tempDiv.querySelector('#analysis-section')?.outerHTML || '';
				const commentSection = tempDiv.querySelector('#comment-section')?.outerHTML || '';
				const noteSection = tempDiv.querySelector('#notes-section')?.outerHTML || '';
				const signatureSection = tempDiv.querySelector('#signature-section')?.outerHTML || '';

				const body = {
					report: {
						sampleId: sampleData?.sampleId || selectedSampleId || sampleId,
						headerSection: headerContent,
						footerSection: footerContent,
						customerSection: customerSection,
						sampleSection: sampleSection,
						analysisSection: analysisSection,
						commentSection: commentSection,
						noteSection: noteSection,
						signatureSection: signatureSection,
						isVlas: showVlas,
						isComment: showComment,
						isReference: showReference,
					},
					action: 'save',
				};

				console.log('Saving single report:', body);

				const response = await apiPost('https://red.irdop.org/v1/report/publish', body);

				if (response.status === 200 && response.data) {
					const savedReport = response.data;

					// Update URL with refNumber if exists
					if (savedReport.refNumber) {
						const newUrl = new URL(window.location.href);
						newUrl.searchParams.set('refNumber', savedReport.refNumber);
						window.history.pushState({}, '', newUrl);

						// Update currentRefNumber state
						setCurrentRefNumber(savedReport.refNumber);
					}

					// Update sampleData with the new report in the reports array FIRST
					if (sampleData && savedReport.refNumber) {
						const updatedSampleData = { ...sampleData };
						const existingReportIndex = updatedSampleData.reports.findIndex(
							(r) => r.refNumber === savedReport.refNumber,
						);

						const newReport = {
							refNumber: savedReport.refNumber,
							createdAt: savedReport.createdAt || new Date().toISOString(),
							id: savedReport.id,
						};

						if (existingReportIndex >= 0) {
							// Update existing report
							updatedSampleData.reports[existingReportIndex] = newReport;
						} else {
							// Add new report at the beginning
							updatedSampleData.reports.unshift(newReport);
						}

						setSampleData(updatedSampleData);
						setSelectedReport(newReport);
					}

					// Reload report data from API to ensure consistency
					if (savedReport.refNumber) {
						console.log('🔄 Reloading report data after save:', savedReport.refNumber);
						await fetchReportData(savedReport.refNumber);
					}

					alert('Lưu báo cáo thành công!');
				}
			} else {
				// Mode fullReport: Save multiple reports (no need to check selectedReportIndex)
				const reports = [];

				for (let i = 0; i < allSamplesData.length; i++) {
					const sample = allSamplesData[i];

					// Skip hidden samples
					if (sample.isHidden) {
						console.log(`⏭️ Skipping hidden sample in save: ${sample.sampleId}`);
						continue;
					}

					const headerContent = sample.headerEditorRef?.getContent() || '';
					const contentEditorContent = sample.contentEditorRef?.getContent() || '';
					const footerContent = sample.footerEditorRef?.getContent() || '';

					// Parse content sections
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = contentEditorContent;

					const customerSection = tempDiv.querySelector('#customer-section')?.outerHTML || '';
					const sampleSection = tempDiv.querySelector('#sample-section')?.outerHTML || '';
					const analysisSection = tempDiv.querySelector('#analysis-section')?.outerHTML || '';
					const commentSection = tempDiv.querySelector('#comment-section')?.outerHTML || '';
					const noteSection = tempDiv.querySelector('#notes-section')?.outerHTML || '';
					const signatureSection = tempDiv.querySelector('#signature-section')?.outerHTML || '';

					reports.push({
						sampleId: sample.sampleId,
						headerSection: headerContent,
						footerSection: footerContent,
						customerSection: customerSection,
						sampleSection: sampleSection,
						analysisSection: analysisSection,
						commentSection: commentSection,
						noteSection: noteSection,
						signatureSection: signatureSection,
						isVlas: sample.showVlas || false,
						isComment: sample.showComment || false,
						isReference: sample.showReference || false,
					});
				}

				if (reports.length === 0) {
					alert('Không có dữ liệu để lưu!');
					return;
				}

				const body = {
					reports: reports,
					action: 'save',
				};

				console.log('Saving multiple reports:', body);

				const response = await apiPost('https://red.irdop.org/v1/report/publish', body);

				if (response.status === 200 && response.data) {
					const savedReports = Array.isArray(response.data) ? response.data : [response.data];

					console.log('Saved reports from API:', savedReports);

					// Apply saved data to editors in order
					for (let i = 0; i < savedReports.length && i < allSamplesData.length; i++) {
						const savedReport = savedReports[i];
						const sample = allSamplesData[i];

						// Apply header section
						if (savedReport.headerSection && sample.headerEditorRef) {
							sample.headerEditorRef.setContent(savedReport.headerSection);
						}

						// Apply footer section
						if (savedReport.footerSection && sample.footerEditorRef) {
							sample.footerEditorRef.setContent(savedReport.footerSection);
						}

						// Reconstruct content from saved sections with spacing
						const spacing = '<div style="height: 15px;"></div>';
						const contentParts = [];
						if (savedReport.customerSection) contentParts.push(savedReport.customerSection);
						if (savedReport.sampleSection) contentParts.push(savedReport.sampleSection);
						if (savedReport.analysisSection) contentParts.push(savedReport.analysisSection);
						if (savedReport.commentSection) contentParts.push(savedReport.commentSection);
						if (savedReport.noteSection) contentParts.push(savedReport.noteSection);
						if (savedReport.signatureSection) contentParts.push(savedReport.signatureSection);

						const updatedContent = contentParts.join(spacing);
						if (updatedContent && sample.contentEditorRef) {
							sample.contentEditorRef.setContent(updatedContent);
						}

						// Update refNumber and id in sample data
						if (savedReport.refNumber) {
							sample.refNumber = savedReport.refNumber;
						}
						if (savedReport.id) {
							sample.reportId = savedReport.id;
						}

						// Update the reports array
						const reportIndex = sample.reports.findIndex((r) => r.refNumber === savedReport.refNumber);
						if (reportIndex >= 0) {
							sample.reports[reportIndex] = {
								...sample.reports[reportIndex],
								refNumber: savedReport.refNumber,
								createdAt: savedReport.createdAt || sample.reports[reportIndex].createdAt,
								id: savedReport.id,
							};
							// Update selected report index
							sample.selectedReportIndex = reportIndex;
						} else if (savedReport.refNumber) {
							// Add new report
							sample.reports.push({
								refNumber: savedReport.refNumber,
								createdAt: savedReport.createdAt || new Date().toISOString(),
								id: savedReport.id,
							});
							// Select the newly added report
							sample.selectedReportIndex = sample.reports.length - 1;
						}
					}

					// Update state to trigger re-render
					setAllSamplesData([...allSamplesData]);

					alert('Lưu các báo cáo thành công!');
				}
			}
		} catch (error) {
			console.error('Error saving report(s):', error);
			alert('Lỗi khi lưu báo cáo: ' + error.message);
		}
	};

	// Handle publish report(s)
	const handlePublish = async () => {
		try {
			if (viewMode === 'single') {
				// Mode one: Publish single report
				let headerContent = headerEditorRef.current?.getContent() || '';
				const contentEditorContent = contentEditorRef.current?.getContent() || '';
				const footerContent = footerEditorRef.current?.getContent() || '';

				// Reset refNumber to "SƠ BỘ / DRAFT" before publishing
				const headerDoc = new DOMParser().parseFromString(headerContent, 'text/html');
				const refCodeElement = headerDoc.querySelector('.ref_code');
				if (refCodeElement) {
					refCodeElement.textContent = 'SƠ BỘ / DRAFT';
					headerContent = headerDoc.body.innerHTML;
				}

				// Parse content sections
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = contentEditorContent;

				const customerSection = tempDiv.querySelector('#customer-section')?.outerHTML || '';
				const sampleSection = tempDiv.querySelector('#sample-section')?.outerHTML || '';
				const analysisSection = tempDiv.querySelector('#analysis-section')?.outerHTML || '';
				const commentSection = tempDiv.querySelector('#comment-section')?.outerHTML || '';
				const noteSection = tempDiv.querySelector('#notes-section')?.outerHTML || '';
				const signatureSection = tempDiv.querySelector('#signature-section')?.outerHTML || '';

				const body = {
					report: {
						sampleId: sampleData?.sampleId || selectedSampleId || sampleId,
						headerSection: headerContent,
						footerSection: footerContent,
						customerSection: customerSection,
						sampleSection: sampleSection,
						analysisSection: analysisSection,
						commentSection: commentSection,
						noteSection: noteSection,
						signatureSection: signatureSection,
						isVlas: showVlas,
						isComment: showComment,
						isReference: showReference,
					},
					action: 'publish',
				};

				console.log('Publishing single report:', body);

				const response = await apiPost('https://red.irdop.org/v1/report/publish', body);

				if (response.status === 200 && response.data) {
					const savedReport = response.data;

					// Update URL with refNumber if exists
					if (savedReport.refNumber) {
						const newUrl = new URL(window.location.href);
						newUrl.searchParams.set('refNumber', savedReport.refNumber);
						window.history.pushState({}, '', newUrl);

						// Update currentRefNumber state
						setCurrentRefNumber(savedReport.refNumber);
					}

					// Update sampleData with the new report in the reports array FIRST
					if (sampleData && savedReport.refNumber) {
						const updatedSampleData = { ...sampleData };
						const existingReportIndex = updatedSampleData.reports.findIndex(
							(r) => r.refNumber === savedReport.refNumber,
						);

						const newReport = {
							refNumber: savedReport.refNumber,
							createdAt: savedReport.createdAt || new Date().toISOString(),
							id: savedReport.id,
						};

						if (existingReportIndex >= 0) {
							// Update existing report
							updatedSampleData.reports[existingReportIndex] = newReport;
						} else {
							// Add new report at the beginning
							updatedSampleData.reports.unshift(newReport);
						}

						setSampleData(updatedSampleData);
						setSelectedReport(newReport);
					}

					// Reload report data from API to ensure consistency
					if (savedReport.refNumber) {
						console.log('🔄 Reloading report data after publish:', savedReport.refNumber);
						await fetchReportData(savedReport.refNumber);
					}

					alert('Xuất bản báo cáo thành công!');
				}
			} else {
				// Mode fullReport: Publish multiple reports
				const reports = [];

				for (let i = 0; i < allSamplesData.length; i++) {
					const sample = allSamplesData[i];

					// Skip hidden samples
					if (sample.isHidden) {
						console.log(`⏭️ Skipping hidden sample in publish: ${sample.sampleId}`);
						continue;
					}

					let headerContent = sample.headerEditorRef?.getContent() || '';
					const contentEditorContent = sample.contentEditorRef?.getContent() || '';
					const footerContent = sample.footerEditorRef?.getContent() || '';

					// Reset refNumber to "SƠ BỘ / DRAFT" before publishing
					const headerDoc = new DOMParser().parseFromString(headerContent, 'text/html');
					const refCodeElement = headerDoc.querySelector('.ref_code');
					if (refCodeElement) {
						refCodeElement.textContent = 'SƠ BỘ / DRAFT';
						headerContent = headerDoc.body.innerHTML;
					}

					// Parse content sections
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = contentEditorContent;

					const customerSection = tempDiv.querySelector('#customer-section')?.outerHTML || '';
					const sampleSection = tempDiv.querySelector('#sample-section')?.outerHTML || '';
					const analysisSection = tempDiv.querySelector('#analysis-section')?.outerHTML || '';
					const commentSection = tempDiv.querySelector('#comment-section')?.outerHTML || '';
					const noteSection = tempDiv.querySelector('#notes-section')?.outerHTML || '';
					const signatureSection = tempDiv.querySelector('#signature-section')?.outerHTML || '';

					reports.push({
						sampleId: sample.sampleId,
						headerSection: headerContent,
						footerSection: footerContent,
						customerSection: customerSection,
						sampleSection: sampleSection,
						analysisSection: analysisSection,
						commentSection: commentSection,
						noteSection: noteSection,
						signatureSection: signatureSection,
						isVlas: sample.showVlas || false,
						isComment: sample.showComment || false,
						isReference: sample.showReference || false,
					});
				}

				if (reports.length === 0) {
					alert('Không có dữ liệu để xuất bản!');
					return;
				}

				const body = {
					reports: reports,
					action: 'publish',
				};

				console.log('Publishing multiple reports:', body);

				const response = await apiPost('https://red.irdop.org/v1/report/publish', body);

				if (response.status === 200 && response.data) {
					const savedReports = Array.isArray(response.data) ? response.data : [response.data];

					console.log('Published reports from API:', savedReports);

					// Apply saved data to editors in order
					for (let i = 0; i < savedReports.length && i < allSamplesData.length; i++) {
						const savedReport = savedReports[i];
						const sample = allSamplesData[i];

						// Apply header section
						if (savedReport.headerSection && sample.headerEditorRef) {
							sample.headerEditorRef.setContent(savedReport.headerSection);
						}

						// Apply footer section
						if (savedReport.footerSection && sample.footerEditorRef) {
							sample.footerEditorRef.setContent(savedReport.footerSection);
						}

						// Reconstruct content from saved sections with spacing
						const spacing = '<div style="height: 15px;"></div>';
						const contentParts = [];
						if (savedReport.customerSection) contentParts.push(savedReport.customerSection);
						if (savedReport.sampleSection) contentParts.push(savedReport.sampleSection);
						if (savedReport.analysisSection) contentParts.push(savedReport.analysisSection);
						if (savedReport.commentSection) contentParts.push(savedReport.commentSection);
						if (savedReport.noteSection) contentParts.push(savedReport.noteSection);
						if (savedReport.signatureSection) contentParts.push(savedReport.signatureSection);

						const updatedContent = contentParts.join(spacing);
						if (updatedContent && sample.contentEditorRef) {
							sample.contentEditorRef.setContent(updatedContent);
						}

						// Update refNumber and id in sample data
						if (savedReport.refNumber) {
							sample.refNumber = savedReport.refNumber;
						}
						if (savedReport.id) {
							sample.reportId = savedReport.id;
						}

						// Update the reports array
						const reportIndex = sample.reports.findIndex((r) => r.refNumber === savedReport.refNumber);
						if (reportIndex >= 0) {
							sample.reports[reportIndex] = {
								...sample.reports[reportIndex],
								refNumber: savedReport.refNumber,
								createdAt: savedReport.createdAt || sample.reports[reportIndex].createdAt,
								id: savedReport.id,
							};
							// Update selected report index
							sample.selectedReportIndex = reportIndex;
						} else if (savedReport.refNumber) {
							// Add new report
							sample.reports.push({
								refNumber: savedReport.refNumber,
								createdAt: savedReport.createdAt || new Date().toISOString(),
								id: savedReport.id,
							});
							// Select the newly added report
							sample.selectedReportIndex = sample.reports.length - 1;
						}
					}

					// Update state to trigger re-render
					setAllSamplesData([...allSamplesData]);

					alert('Xuất bản các báo cáo thành công!');
				}
			}
		} catch (error) {
			console.error('Error publishing report(s):', error);
			alert('Lỗi khi xuất bản báo cáo: ' + error.message);
		}
	};

	// Handle select latest published report
	const handleSelectLatestPublished = async () => {
		try {
			if (viewMode === 'single') {
				// Mode one: Select latest report if exists
				if (sampleData?.reports && sampleData.reports.length > 0) {
					const latestReport = sampleData.reports[0];

					// Load the latest report
					const response = await apiPost('https://red.irdop.org/v1/report/get', {
						reportId: latestReport.refNumber,
					});

					if (response.status === 200 && response.data) {
						const reportData = response.data;

						// Helper function to ensure section has proper ID
						const ensureSectionId = (html, sectionId) => {
							if (!html) return '';
							if (html.includes(`id="${sectionId}"`)) return html;
							const firstTagMatch = html.match(/^(\s*<[^>]+)(>)/);
							if (firstTagMatch) {
								return html.replace(firstTagMatch[0], `${firstTagMatch[1]} id="${sectionId}"${firstTagMatch[2]}`);
							}
							return html;
						};

						// Update editors with report data
						if (reportData.headerSection) {
							headerEditorRef.current?.setContent(reportData.headerSection);
						}
						if (reportData.footerSection) {
							footerEditorRef.current?.setContent(reportData.footerSection);
						}

						// Reconstruct content with proper section IDs
						const spacing = '<div style="height: 15px;"></div>';
						const contentParts = [];
						if (reportData.customerSection)
							contentParts.push(ensureSectionId(reportData.customerSection, 'customer-section'));
						if (reportData.sampleSection)
							contentParts.push(ensureSectionId(reportData.sampleSection, 'sample-section'));
						if (reportData.analysisSection)
							contentParts.push(ensureSectionId(reportData.analysisSection, 'analysis-section'));
						if (reportData.commentSection)
							contentParts.push(ensureSectionId(reportData.commentSection, 'comment-section'));
						if (reportData.noteSection) contentParts.push(ensureSectionId(reportData.noteSection, 'notes-section'));
						if (reportData.signatureSection)
							contentParts.push(ensureSectionId(reportData.signatureSection, 'signature-section'));

						const updatedContent = contentParts.join(spacing);
						if (updatedContent) {
							contentEditorRef.current?.setContent(updatedContent);
						}

						alert(`Đã chọn báo cáo mới nhất: ${latestReport.refNumber}`);
					}
				} else {
					alert('Không có báo cáo nào được phát hành!');
				}
			} else {
				// Mode fullReport: Select latest report for each sample
				let selectedCount = 0;

				for (let i = 0; i < allSamplesData.length; i++) {
					const sample = allSamplesData[i];

					// Skip hidden samples
					if (sample.isHidden) {
						console.log(`⏭️ Skipping hidden sample in select latest: ${sample.sampleId}`);
						continue;
					}

					if (sample.reports && sample.reports.length > 0) {
						const latestReport = sample.reports[0];

						try {
							// Load the latest report for this sample
							const response = await apiPost('https://red.irdop.org/v1/report/get', {
								reportId: latestReport.refNumber,
							});

							if (response.status === 200 && response.data) {
								const reportData = response.data;

								// Helper function to ensure section has proper ID
								const ensureSectionId = (html, sectionId) => {
									if (!html) return '';
									if (html.includes(`id="${sectionId}"`)) return html;
									const firstTagMatch = html.match(/^(\s*<[^>]+)(>)/);
									if (firstTagMatch) {
										return html.replace(firstTagMatch[0], `${firstTagMatch[1]} id="${sectionId}"${firstTagMatch[2]}`);
									}
									return html;
								};

								// Update sample's editors
								if (reportData.headerSection && sample.headerEditorRef) {
									sample.headerEditorRef.setContent(reportData.headerSection);
								}
								if (reportData.footerSection && sample.footerEditorRef) {
									sample.footerEditorRef.setContent(reportData.footerSection);
								}

								// Reconstruct content with proper section IDs
								const spacing = '<div style="height: 15px;"></div>';
								const contentParts = [];
								if (reportData.customerSection)
									contentParts.push(ensureSectionId(reportData.customerSection, 'customer-section'));
								if (reportData.sampleSection)
									contentParts.push(ensureSectionId(reportData.sampleSection, 'sample-section'));
								if (reportData.analysisSection)
									contentParts.push(ensureSectionId(reportData.analysisSection, 'analysis-section'));
								if (reportData.commentSection)
									contentParts.push(ensureSectionId(reportData.commentSection, 'comment-section'));
								if (reportData.noteSection) contentParts.push(ensureSectionId(reportData.noteSection, 'notes-section'));
								if (reportData.signatureSection)
									contentParts.push(ensureSectionId(reportData.signatureSection, 'signature-section'));

								const updatedContent = contentParts.join(spacing);
								if (updatedContent && sample.contentEditorRef) {
									sample.contentEditorRef.setContent(updatedContent);
								}

								// Update selected report index
								sample.selectedReportIndex = 0;
								selectedCount++;
							}
						} catch (error) {
							console.error(`Error loading latest report for sample ${sample.sampleId}:`, error);
						}
					}
				}

				// Update state to trigger re-render
				setAllSamplesData([...allSamplesData]);

				if (selectedCount > 0) {
					alert(`Đã chọn báo cáo mới nhất cho ${selectedCount} mẫu!`);
				} else {
					alert('Không có mẫu nào có báo cáo được phát hành!');
				}
			}
		} catch (error) {
			console.error('Error selecting latest published reports:', error);
			alert('Lỗi khi chọn báo cáo mới nhất: ' + error.message);
		}
	};

	// Initialize Google Fonts
	useEffect(() => {
		// Add Google Fonts link
		const fontLink1 = document.createElement('link');
		fontLink1.rel = 'preconnect';
		fontLink1.href = 'https://fonts.googleapis.com';
		document.head.appendChild(fontLink1);

		const fontLink2 = document.createElement('link');
		fontLink2.rel = 'preconnect';
		fontLink2.href = 'https://fonts.gstatic.com';
		fontLink2.crossOrigin = 'anonymous';
		document.head.appendChild(fontLink2);

		const fontLink3 = document.createElement('link');
		fontLink3.href = 'https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400..800&display=swap';
		fontLink3.rel = 'stylesheet';
		document.head.appendChild(fontLink3);
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-xl">Đang tải dữ liệu...</div>
			</div>
		);
	}

	// Handle view mode change
	const handleViewModeChange = async (mode) => {
		setViewMode(mode);
		if (mode === 'all') {
			// Fetch all samples data
			const receiptId =
				receiptIdFromUrl ||
				sampleId?.split('-')[0].replace('SP', 'TNM') ||
				selectedSampleId?.split('-')[0].replace('SP', 'TNM');
			if (receiptId) {
				await fetchReceiptData(receiptId);

				// Update URL with receiptId and mode=fullReport
				const newUrl = new URL(window.location.href);
				newUrl.searchParams.set('receiptId', receiptId);
				newUrl.searchParams.set('mode', 'fullReport');
				newUrl.searchParams.delete('sampleId');
				newUrl.searchParams.delete('reportId');
				newUrl.searchParams.delete('refNumber');
				window.history.pushState({}, '', newUrl);
			}
		} else {
			// Switch back to single mode
			const newUrl = new URL(window.location.href);

			// Keep receiptId if it exists
			const receiptId = receiptIdFromUrl || newUrl.searchParams.get('receiptId');

			// Change mode to 'one' instead of deleting
			newUrl.searchParams.set('mode', 'one');

			// Get first sample ID and load its data
			let firstSampleId = null;
			if (receiptData && receiptData.samples && receiptData.samples.length > 0) {
				firstSampleId = receiptData.samples[0].sampleId;
				newUrl.searchParams.set('sampleId', firstSampleId);
			}

			// Keep receiptId in URL
			if (receiptId) {
				newUrl.searchParams.set('receiptId', receiptId);
			}

			window.history.pushState({}, '', newUrl);

			// Load sample data after URL update
			if (firstSampleId) {
				await fetchSampleData(firstSampleId);
			}
		}
	};

	// Handle report selection for a specific sample in "all" mode
	const handleSampleReportChange = async (sampleIndex, reportIndex) => {
		const updatedSamples = [...allSamplesData];
		const sample = updatedSamples[sampleIndex];

		if (reportIndex === '') {
			sample.selectedReportIndex = null;
			setAllSamplesData(updatedSamples);
			return;
		}

		sample.selectedReportIndex = parseInt(reportIndex);
		const report = sample.reports[reportIndex];

		try {
			const response = await apiPost('https://red.irdop.org/v1/report/get', {
				reportId: report.refNumber,
			});

			if (response.status === 200 && response.data) {
				const reportData = response.data;

				// Helper function to ensure section has proper ID
				const ensureSectionId = (html, sectionId) => {
					if (!html) return '';
					if (html.includes(`id="${sectionId}"`)) return html;
					const firstTagMatch = html.match(/^(\s*<[^>]+)(>)/);
					if (firstTagMatch) {
						return html.replace(firstTagMatch[0], `${firstTagMatch[1]} id="${sectionId}"${firstTagMatch[2]}`);
					}
					return html;
				};

				// Update sample with report data
				sample.headerContent = ensureSectionId(reportData.headerSection || '', 'header-section');

				const contentParts = [];
				if (reportData.customerSection)
					contentParts.push(ensureSectionId(reportData.customerSection, 'customer-section'), spacing);
				if (reportData.sampleSection)
					contentParts.push(ensureSectionId(reportData.sampleSection, 'sample-section'), spacing);
				if (reportData.analysisSection)
					contentParts.push(ensureSectionId(reportData.analysisSection, 'analysis-section'), spacing);
				if (reportData.commentSection && reportData.isComment)
					contentParts.push(ensureSectionId(reportData.commentSection, 'comment-section'), spacing);
				if (reportData.noteSection)
					contentParts.push(ensureSectionId(reportData.noteSection, 'notes-section'), spacing);
				if (reportData.signatureSection)
					contentParts.push(ensureSectionId(reportData.signatureSection, 'signature-section'));

				sample.contentContent = contentParts.join('');
				sample.footerContent = ensureSectionId(reportData.footerSection || '', 'footer-section');
				sample.showVlas = reportData.isVlas || false;
				sample.showComment = reportData.isComment || false;
				sample.showReference = reportData.isReference || false;
				sample.currentRefNumber = report.refNumber;

				setAllSamplesData(updatedSamples);

				// Update editors if they exist
				setTimeout(() => {
					if (sample.headerEditorRef && typeof sample.headerEditorRef.setContent === 'function') {
						sample.headerEditorRef.setContent(sample.headerContent);
					}
					if (sample.contentEditorRef && typeof sample.contentEditorRef.setContent === 'function') {
						sample.contentEditorRef.setContent(sample.contentContent);
					}
					if (sample.footerEditorRef && typeof sample.footerEditorRef.setContent === 'function') {
						sample.footerEditorRef.setContent(sample.footerContent);
					}
				}, 100);
			}
		} catch (error) {
			console.error('Error fetching report data:', error);
		}
	};

	// Handle toggle change for a specific sample in "all" mode
	const handleSampleToggleChange = (sampleIndex, toggleName, value) => {
		const updatedSamples = [...allSamplesData];
		updatedSamples[sampleIndex][toggleName] = value;
		setAllSamplesData(updatedSamples);

		// If toggling showVlas or showKN, update the header content immediately
		if (toggleName === 'showVlas' || toggleName === 'showKN') {
			const sample = updatedSamples[sampleIndex];
			const newHeaderContent = generateHeaderForSample(
				toggleName === 'showVlas' ? value : sample.showVlas,
				sample.currentRefNumber,
				toggleName === 'showKN' ? value : sample.showKN,
			);

			// Update stored header content
			updatedSamples[sampleIndex].headerContent = newHeaderContent;

			// Update editor if it exists
			setTimeout(() => {
				if (sample.headerEditorRef && typeof sample.headerEditorRef.setContent === 'function') {
					sample.headerEditorRef.setContent(newHeaderContent);
				}
			}, 50);
		}

		// Regenerate content for this sample with updated toggle
		setTimeout(() => {
			const sample = updatedSamples[sampleIndex];

			// Generate sections based on sample's toggle states
			const customerSection = generateCustomerSection(sample.client);
			const sampleInfoSection = generateSampleInfoSection(sample);

			// Generate analysis section with reference column if showReference is true
			const analysisSection = (() => {
				const analysisItems = sample.analysis || [];
				const referenceHeader = sample.showReference
					? `
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 15%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Tham chiếu</strong> <br> <span style="font-size: 12px; color: #444444;">/ Standard Ref</span>
			</th>`
					: '';

				let analysisRows = '';
				if (analysisItems.length > 0) {
					analysisRows = analysisItems
						.map((item, idx) => {
							let parameterName = item.parameter_name || '--';

							if (item.display_style && Array.isArray(item.display_style)) {
								const defaultItem = item.display_style.find((style) => style.label === 'default');
								if (defaultItem && defaultItem.value && defaultItem.value.trim() !== '') {
									parameterName = defaultItem.value;
								}

								if (sample.showEnglish) {
									const engItem = item.display_style.find((style) => style.label === 'eng');
									if (engItem && engItem.value && engItem.value.trim() !== '') {
										if (parameterName.includes('</p>')) {
											parameterName = parameterName.replace('</p>', '/</p>');
										} else {
											parameterName += '/';
										}
										parameterName += engItem.value;
									}
								}
							}

							const result = item.result_value || '--';
							const unit = item.result_unit || '--';
							const protocol = item.protocol_code || '--';

							const accreditationParts = item.accreditation
								? item.accreditation
										.split(',')
										.map((part) => part.trim())
										.filter((part) => part.length > 0)
								: [];
							const protocolSource = item.protocol_source || '';
							const scope = protocolSource + (accreditationParts.length > 0 ? ' ' + accreditationParts.join(' ') : '');

							let referenceCell = '';
							if (sample.showReference) {
								referenceCell = `<td class="reference-cell" style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">--</td>`;
							}

							return `
				<tr id="analysis-row-${idx}" class="table-row">
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${
						idx + 1
					}.</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${parameterName}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${result}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${unit}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${protocol}</td>
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${scope}</td>${referenceCell}
				</tr>`;
						})
						.join('');
				}

				const resultHeader = sample.showKN ? 'Kết quả kiểm nghiệm' : 'Kết quả';
				const resultHeaderEng = sample.showKN ? '/ Inspection result' : '/ Test result';

				const knParagraph = sample.showKN
					? `<p style="font-weight: bold; text-align: left; font-size: 12px; margin: 0 0 8px 0; padding: 0;">Kết quả thử nghiệm:</p>`
					: '';

				const tableHTML = `
<table style="width: 100%; border-collapse: collapse; text-align: left; margin:0; padding:0; font-size:12px;">
	<thead>
		<tr>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 45px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>STT</strong> <br> <span style="font-size: 12px; color: #444444;">/ No.</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phép thử</strong> <br> <span style="font-size: 12px; color: #444444;">/ Tests</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>${resultHeader}</strong> <br> <span style="font-size: 12px; color: #444444;">${resultHeaderEng}</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Đơn vị</strong><br> <span style="font-size: 12px; color: #444444;">/ Unit</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phương pháp</strong> <br> <span style="font-size: 12px; color: #444444;">/ Protocol</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phạm vi công nhận</strong> <br> <span style="font-size: 12px; color: #444444;">/ Accreditation scope</span>
			</th>${referenceHeader}
		</tr>
	</thead>
	<tbody>
		${analysisRows}
	</tbody>
</table>`;

				if (knParagraph) {
					return (
						knParagraph +
						`
<div id="analysis-section">
${tableHTML}
</div>`
					);
				} else {
					return `
<div id="analysis-section">
${tableHTML}
</div>`;
				}
			})();

			const commentSection = sample.showComment ? generateCommentSection() : '';

			// Generate notes section with showKN support
			const notesSection = (() => {
				const sampleInfoText = sample.showKN
					? 'Thông tin mẫu kiểm nghiệm do khách hàng cung cấp / Sample information provided by the customer.'
					: 'Thông tin mẫu thử nghiệm do khách hàng cung cấp / Sample information provided by the customer.';

				return `
<div id="notes-section" style="padding-top: 0; display: flex; flex-direction: column; border: 1px solid #000000; margin:0;">
	<div style="padding: 5pt 8pt; flex-grow: 1; position: relative;">
		<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
			<p style="font-weight:bold; margin:0; font-size:11px; line-height:1.0;">Ghi chú / Note:</p>
		</div>
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<p style="font-size:11px; margin:0; padding:0; line-height: 1.2; text-align:left;">
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
			})();

			// Generate signature section with showSign support
			const signatureSection = (() => {
				return `
<div id="signature-section" style="padding: 0 8px; display: flex; flex-direction:column; margin:0;">
	<div style="padding: 0pt; flex-grow: 1; position: relative; display:flex; justify-content:space-between;height:2.7cm;">
		<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between; max-width:fit-content;">
			${
				sample.showSign
					? `<strong style="font-size:12px; line-height:1.2; margin:0;">TRƯỞNG PHÒNG KIỂM NGHIỆM<br>PHÒNG ĐẢM BẢO CHẤT LƯỢNG / Quality Assurance Manager</strong>
			<p style="font-size:12px; margin:0; line-height:1.4;">Trần Thị Lan</p>`
					: ''
			}
		</div>
		<div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between; max-width:fit-content;">
			<strong style="font-size:12px; line-height:1.2; margin:0;">KT.VIỆN TRƯỞNG<br>PHÓ VIỆN TRƯỞNG / Vice President</strong>
			<p style="font-size:12px; margin:0; line-height:1.4;">Nguyễn Bá Xuân Trường</p>
		</div>
	</div>
</div>`;
			})();

			const spacing = `<div style="height: 4mm; margin:0; padding:0;"></div>`;
			const contentParts = [customerSection, spacing, sampleInfoSection, spacing, analysisSection, spacing];

			if (sample.showComment) {
				contentParts.push(commentSection, spacing);
			}

			contentParts.push(notesSection, spacing, signatureSection);

			const updatedContent = contentParts.join('');

			// Update editor content
			if (sample.contentEditorRef && typeof sample.contentEditorRef.setContent === 'function') {
				sample.contentEditorRef.setContent(updatedContent);
			}

			// Also update the stored content
			updatedSamples[sampleIndex].contentContent = updatedContent;
			setAllSamplesData([...updatedSamples]);
		}, 100);
	};

	return (
		<div className="flex bg-gray-100 min-h-screen overflow-x-auto">
			{/* Left Panel - Editor(s) */}
			<div className="flex-shrink-0" style={{ width: '794px', fontFamily: "'Wix Madefor Display', sans-serif" }}>
				{viewMode === 'single' ? (
					// Single Sample Editor
					<div className="bg-white shadow-lg" style={{ padding: '37.8px', boxSizing: 'border-box' }}>
						{/* Header Editor */}
						<div style={{ maxWidth: '720px', margin: '0 auto', marginBottom: '20px' }}>
							<TinyMCEEditor
								value={header}
								onEditorChange={(content) => setHeader(content)}
								onInit={(evt, editor) => {
									headerEditorRef.current = editor;
								}}
								init={{
									height: 'auto',
									min_height: 200,
									width: '100%',
									statusbar: false,
									promotion: false,
									menubar: false,
									quickbars_selection_toolbar: false,
									quickbars_insert_toolbar: false,
									contextmenu: false,
									inline_boundaries: false,
									toolbar_mode: 'wrap',
									resize: 'both',
									table_use_colgroups: false,
									table_selection_toolbar: false,
									plugins: [
										'advlist',
										'autolink',
										'lists',
										'link',
										'image',
										'charmap',
										'anchor',
										'searchreplace',
										'visualblocks',
										'code',
										'table',
										'help',
										'wordcount',
										'autoresize',
									],
									toolbar:
										'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight table tabledelete tableprops tablerowprops tablecellprops',
									autoresize_bottom_margin: 10,
									autoresize_overflow_padding: 0,
									content_style: `
									@import url('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800;900&display=swap');
									
									* {
										box-sizing: border-box !important;
									}
									body {
										font-family: 'Wix Madefor Display', sans-serif !important;
										font-size: 12px;
										line-height: 1.5;
										margin: 0;
										background: white;
										padding: 10px;
										width: 100%;
										overflow: hidden !important;
									}
									p {
										margin: 2px 0;
										box-sizing: border-box;
										font-family: 'Wix Madefor Display', sans-serif !important;
									}
									strong, b {
										font-family: 'Wix Madefor Display', sans-serif !important;
										font-weight: 700;
									}
									table {
										border-collapse: collapse;
										border: 1px solid #ccc;
										width: 100%;
										max-width: 100%;
										font-family: 'Wix Madefor Display', sans-serif !important;
									}
									table th, table td {
										border: 1px solid #ccc;
										padding: 8px;
										vertical-align: top;
										font-family: 'Wix Madefor Display', sans-serif !important;
									}
									
									/* Hide scrollbar for Chrome, Safari and Opera */
									::-webkit-scrollbar {
										display: none;
									}
									
									/* Hide scrollbar for IE, Edge and Firefox */
									body {
										-ms-overflow-style: none;  /* IE and Edge */
										scrollbar-width: none;  /* Firefox */
									}
								`,
									setup: function (editor) {
										editor.on('init', function () {
											headerEditorRef.current = editor;
										});

										editor.on('keydown', function (e) {
											if (e.key === '*') {
												e.preventDefault();
												editor.execCommand('mceInsertContent', false, '×');
												return;
											}
											if (e.key === '^') {
												e.preventDefault();
												editor.execCommand('Superscript');
												return;
											}
											if (e.key === '_') {
												e.preventDefault();
												editor.execCommand('Subscript');
												return;
											}
										});
									},
								}}
							/>
						</div>

						{/* Content Editor */}
						<div style={{ maxWidth: '720px', margin: '0 auto', marginBottom: '20px' }}>
							<TinyMCEEditor
								value={content}
								onEditorChange={(content) => setContent(content)}
								onInit={(evt, editor) => {
									contentEditorRef.current = editor;
								}}
								init={{
									height: 'auto',
									min_height: 500,
									width: '100%',
									statusbar: false,
									promotion: false,
									menubar: false,
									quickbars_selection_toolbar: false,
									quickbars_insert_toolbar: false,
									contextmenu: false,
									inline_boundaries: false,
									toolbar_mode: 'wrap',
									resize: 'both',
									table_use_colgroups: false,
									table_selection_toolbar: false,
									plugins: [
										'advlist',
										'autolink',
										'lists',
										'link',
										'image',
										'charmap',
										'preview',
										'anchor',
										'searchreplace',
										'visualblocks',
										'code',
										'fullscreen',
										'insertdatetime',
										'media',
										'table',
										'help',
										'wordcount',
										'emoticons',
										'codesample',
										'pagebreak',
										'nonbreaking',
										'autoresize',
									],
									toolbar:
										'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight checklist numlist bullist indent outdent anchor table tabledelete tableprops tablerowprops tablecellprops tableinsertrowbefore tableinsertrowafter tabledeleterow tableinsertcolbefore tableinsertcolafter tabledeletecol',
									autoresize_bottom_margin: 20,
									autoresize_overflow_padding: 0,
									content_style: `
									@import url('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800&display=swap');
									
									* {
										box-sizing: border-box !important;
									}
									body {
										font-family: 'Wix Madefor Display', sans-serif !important;
										font-size: 12px;
										line-height: 1.5;
										margin: 0;
										background: white;
										padding: 10px;
										width: 100%;
										min-height: 200px;
										overflow: hidden !important;
									}
									p {
										margin: 2px 0;
										box-sizing: border-box;
										font-family: 'Wix Madefor Display', sans-serif !important;
									}
									strong, b {
										font-family: 'Wix Madefor Display', sans-serif !important;
										font-weight: 700;
									}
									table {
										border-collapse: collapse;
										border: 1px solid #ccc;
										box-sizing: border-box;
										width: 100%;
										max-width: 100%;
										font-family: 'Wix Madefor Display', sans-serif !important;
									}
									table th, table td {
										border: 1px solid #ccc;
										padding: 8px;
										vertical-align: top;
										box-sizing: border-box;
										word-break: normal;
										word-wrap: normal;
										white-space: normal;
										font-family: 'Wix Madefor Display', sans-serif !important;
									}
									table th {
										background-color: #f9f9f9;
										font-weight: bold;
										box-sizing: border-box;
									}
									
									/* Hide scrollbar for Chrome, Safari and Opera */
									::-webkit-scrollbar {
										display: none;
									}
									
									/* Hide scrollbar for IE, Edge and Firefox */
									body {
										-ms-overflow-style: none;  /* IE and Edge */
										scrollbar-width: none;  /* Firefox */
									}
								`,
									setup: function (editor) {
										editor.on('init', function () {
											contentEditorRef.current = editor;
										});

										editor.on('keydown', function (e) {
											if (e.key === '*') {
												e.preventDefault();
												editor.execCommand('mceInsertContent', false, '×');
												return;
											}
											if (e.key === '^') {
												e.preventDefault();
												editor.execCommand('Superscript');
												return;
											}
											if (e.key === '_') {
												e.preventDefault();
												editor.execCommand('Subscript');
												return;
											}
										});
									},
								}}
							/>
						</div>

						{/* Footer Editor */}
						<div style={{ maxWidth: '720px', margin: '0 auto' }}>
							<TinyMCEEditor
								value={footer}
								onEditorChange={(content) => setFooter(content)}
								onInit={(evt, editor) => {
									footerEditorRef.current = editor;
								}}
								init={{
									height: 'auto',
									min_height: 150,
									width: '100%',
									statusbar: false,
									promotion: false,
									menubar: false,
									quickbars_selection_toolbar: false,
									quickbars_insert_toolbar: false,
									contextmenu: false,
									inline_boundaries: false,
									toolbar_mode: 'wrap',
									resize: 'both',
									table_use_colgroups: false,
									table_selection_toolbar: false,
									plugins: [
										'advlist',
										'autolink',
										'lists',
										'link',
										'image',
										'charmap',
										'anchor',
										'searchreplace',
										'visualblocks',
										'code',
										'table',
										'help',
										'wordcount',
										'autoresize',
									],
									toolbar:
										'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight table tabledelete tableprops tablerowprops tablecellprops',
									autoresize_bottom_margin: 10,
									autoresize_overflow_padding: 0,
									content_style: `
									@import url('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800&display=swap');
									
									* {
										box-sizing: border-box !important;
									}
									body {
										font-family: 'Wix Madefor Display', sans-serif !important;
										font-size: 12px;
										line-height: 1.5;
										margin: 0;
										background: white;
										padding: 10px;
										width: 100%;
										overflow: hidden !important;
									}
									p {
										margin: 2px 0;
										box-sizing: border-box;
										font-family: 'Wix Madefor Display', sans-serif !important;
									}
									strong, b {
										font-family: 'Wix Madefor Display', sans-serif !important;
										font-weight: 700;
									}
									table {
										border-collapse: collapse;
										border: 1px solid #ccc;
										width: 100%;
										max-width: 100%;
										font-family: 'Wix Madefor Display', sans-serif !important;
									}
									table th, table td {
										border: 1px solid #ccc;
										padding: 8px;
										vertical-align: top;
										font-family: 'Wix Madefor Display', sans-serif !important;
									}
									
									/* Hide scrollbar for Chrome, Safari and Opera */
									::-webkit-scrollbar {
										display: none;
									}
									
									/* Hide scrollbar for IE, Edge and Firefox */
									body {
										-ms-overflow-style: none;  /* IE and Edge */
										scrollbar-width: none;  /* Firefox */
									}
								`,
									setup: function (editor) {
										editor.on('init', function () {
											footerEditorRef.current = editor;
										});

										editor.on('keydown', function (e) {
											if (e.key === '*') {
												e.preventDefault();
												editor.execCommand('mceInsertContent', false, '×');
												return;
											}
											if (e.key === '^') {
												e.preventDefault();
												editor.execCommand('Superscript');
												return;
											}
											if (e.key === '_') {
												e.preventDefault();
												editor.execCommand('Subscript');
												return;
											}
										});
									},
								}}
							/>
						</div>
					</div>
				) : (
					// All Samples Editors
					<div className="space-y-6">
						{allSamplesData.map((sample, index) => {
							if (sample.isHidden) return null;

							return (
								<div
									key={sample.sampleId}
									className="bg-white shadow-lg"
									style={{ padding: '37.8px', boxSizing: 'border-box' }}
								>
									<h3 className="text-lg font-bold mb-4 text-center" style={{ color: '#0058A3' }}>
										{sample.sampleId}
									</h3>

									{/* Header Editor */}
									<div style={{ maxWidth: '720px', margin: '0 auto', marginBottom: '20px' }}>
										<TinyMCEEditor
											value={
												sample.headerContent ||
												generateHeaderForSample(sample.showVlas, sample.currentRefNumber, sample.showKN)
											}
											onEditorChange={(content) => {
												const updated = [...allSamplesData];
												updated[index].headerContent = content;
												setAllSamplesData(updated);
											}}
											onInit={(evt, editor) => {
												console.log(`✅ Header editor initialized for ${sample.sampleId}`);
												allSamplesData[index].headerEditorRef = editor;
											}}
											init={{
												height: 'auto',
												min_height: 200,
												width: '100%',
												statusbar: false,
												promotion: false,
												menubar: false,
												quickbars_selection_toolbar: false,
												quickbars_insert_toolbar: false,
												contextmenu: false,
												inline_boundaries: false,
												toolbar_mode: 'wrap',
												resize: 'both',
												table_use_colgroups: false,
												table_selection_toolbar: false,
												plugins: [
													'advlist',
													'autolink',
													'lists',
													'link',
													'image',
													'charmap',
													'anchor',
													'searchreplace',
													'visualblocks',
													'code',
													'table',
													'help',
													'wordcount',
													'autoresize',
												],
												toolbar:
													'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight table tabledelete tableprops tablerowprops tablecellprops',
												autoresize_bottom_margin: 10,
												autoresize_overflow_padding: 0,
												content_style: `
												@import url('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800;900&display=swap');
												* { box-sizing: border-box !important; }
												body { font-family: 'Wix Madefor Display', sans-serif !important; font-size: 12px; line-height: 1.5; margin: 0; background: white; padding: 10px; width: 100%; overflow: hidden !important; }
												p { margin: 2px 0; box-sizing: border-box; font-family: 'Wix Madefor Display', sans-serif !important; }
												strong, b { font-family: 'Wix Madefor Display', sans-serif !important; font-weight: 700; }
												table { border-collapse: collapse; border: 1px solid #ccc; width: 100%; max-width: 100%; font-family: 'Wix Madefor Display', sans-serif !important; }
												table th, table td { border: 1px solid #ccc; padding: 8px; vertical-align: top; font-family: 'Wix Madefor Display', sans-serif !important; }
												::-webkit-scrollbar { display: none; }
												body { -ms-overflow-style: none; scrollbar-width: none; }
											`,
											}}
										/>
									</div>

									{/* Content Editor */}
									<div style={{ maxWidth: '720px', margin: '0 auto', marginBottom: '20px' }}>
										<TinyMCEEditor
											value={
												sample.contentContent ||
												generateCustomerSection(sample.client) +
													spacing +
													generateSampleInfoSection(sample) +
													spacing +
													generateAnalysisSection(sample) +
													spacing +
													(sample.showComment ? generateCommentSection() + spacing : '') +
													generateNotesSection() +
													spacing +
													generateSignatureSection()
											}
											onEditorChange={(content) => {
												const updated = [...allSamplesData];
												updated[index].contentContent = content;
												setAllSamplesData(updated);
											}}
											onInit={(evt, editor) => {
												console.log(`✅ Content editor initialized for ${sample.sampleId}`);
												allSamplesData[index].contentEditorRef = editor;
											}}
											init={{
												height: 'auto',
												min_height: 500,
												width: '100%',
												statusbar: false,
												promotion: false,
												menubar: false,
												quickbars_selection_toolbar: false,
												quickbars_insert_toolbar: false,
												contextmenu: false,
												inline_boundaries: false,
												toolbar_mode: 'wrap',
												resize: 'both',
												table_use_colgroups: false,
												table_selection_toolbar: false,
												plugins: [
													'advlist',
													'autolink',
													'lists',
													'link',
													'image',
													'charmap',
													'preview',
													'anchor',
													'searchreplace',
													'visualblocks',
													'code',
													'fullscreen',
													'insertdatetime',
													'media',
													'table',
													'help',
													'wordcount',
													'emoticons',
													'codesample',
													'pagebreak',
													'nonbreaking',
													'autoresize',
												],
												toolbar:
													'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight checklist numlist bullist indent outdent anchor table tabledelete tableprops tablerowprops tablecellprops tableinsertrowbefore tableinsertrowafter tabledeleterow tableinsertcolbefore tableinsertcolafter tabledeletecol',
												autoresize_bottom_margin: 20,
												autoresize_overflow_padding: 0,
												content_style: `
												@import url('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800&display=swap');
												* { box-sizing: border-box !important; }
												body { font-family: 'Wix Madefor Display', sans-serif !important; font-size: 12px; line-height: 1.5; margin: 0; background: white; padding: 10px; width: 100%; min-height: 200px; overflow: hidden !important; }
												p { margin: 2px 0; box-sizing: border-box; font-family: 'Wix Madefor Display', sans-serif !important; }
												strong, b { font-family: 'Wix Madefor Display', sans-serif !important; font-weight: 700; }
												table { border-collapse: collapse; border: 1px solid #ccc; box-sizing: border-box; width: 100%; max-width: 100%; font-family: 'Wix Madefor Display', sans-serif !important; }
												table th, table td { border: 1px solid #ccc; padding: 8px; vertical-align: top; box-sizing: border-box; word-break: normal; word-wrap: normal; white-space: normal; font-family: 'Wix Madefor Display', sans-serif !important; }
												table th { background-color: #f9f9f9; font-weight: bold; box-sizing: border-box; }
												::-webkit-scrollbar { display: none; }
												body { -ms-overflow-style: none; scrollbar-width: none; }
											`,
											}}
										/>
									</div>

									{/* Footer Editor */}
									<div style={{ maxWidth: '720px', margin: '0 auto' }}>
										<TinyMCEEditor
											value={sample.footerContent || footer}
											onEditorChange={(content) => {
												const updated = [...allSamplesData];
												updated[index].footerContent = content;
												setAllSamplesData(updated);
											}}
											onInit={(evt, editor) => {
												console.log(`✅ Footer editor initialized for ${sample.sampleId}`);
												allSamplesData[index].footerEditorRef = editor;
											}}
											init={{
												height: 'auto',
												min_height: 150,
												width: '100%',
												statusbar: false,
												promotion: false,
												menubar: false,
												quickbars_selection_toolbar: false,
												quickbars_insert_toolbar: false,
												contextmenu: false,
												inline_boundaries: false,
												toolbar_mode: 'wrap',
												resize: 'both',
												table_use_colgroups: false,
												table_selection_toolbar: false,
												plugins: [
													'advlist',
													'autolink',
													'lists',
													'link',
													'image',
													'charmap',
													'anchor',
													'searchreplace',
													'visualblocks',
													'code',
													'table',
													'help',
													'wordcount',
													'autoresize',
												],
												toolbar:
													'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight table tabledelete tableprops tablerowprops tablecellprops',
												autoresize_bottom_margin: 10,
												autoresize_overflow_padding: 0,
												content_style: `
												@import url('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800&display=swap');
												* { box-sizing: border-box !important; }
												body { font-family: 'Wix Madefor Display', sans-serif !important; font-size: 12px; line-height: 1.5; margin: 0; background: white; padding: 10px; width: 100%; overflow: hidden !important; }
												p { margin: 2px 0; box-sizing: border-box; font-family: 'Wix Madefor Display', sans-serif !important; }
												strong, b { font-family: 'Wix Madefor Display', sans-serif !important; font-weight: 700; }
												table { border-collapse: collapse; border: 1px solid #ccc; width: 100%; max-width: 100%; font-family: 'Wix Madefor Display', sans-serif !important; }
												table th, table td { border: 1px solid #ccc; padding: 8px; vertical-align: top; font-family: 'Wix Madefor Display', sans-serif !important; }
												::-webkit-scrollbar { display: none; }
												body { -ms-overflow-style: none; scrollbar-width: none; }
											`,
											}}
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Right Panel - Controls */}
			<div className="flex-1 bg-white shadow-lg p-6" style={{ maxWidth: '1000px' }}>
				<h2 className="text-2xl font-bold text-primary mb-6">Phiếu phân tích</h2>

				{/* View Mode Selection */}
				<div className="mb-6">
					<label className="text-sm font-semibold mb-2 block">Chế độ xem:</label>
					<div className="flex gap-2">
						<button
							onClick={() => handleViewModeChange('single')}
							className={`px-4 py-2 rounded-lg transition ${
								viewMode === 'single' ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							}`}
						>
							Đơn lẻ
						</button>
						<button
							onClick={() => handleViewModeChange('all')}
							className={`px-4 py-2 rounded-lg transition ${
								viewMode === 'all' ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							}`}
						>
							Toàn bộ phiếu
						</button>
					</div>
				</div>

				{viewMode === 'single' ? (
					<>
						{/* Sample Selection */}
						<div className="mb-6 flex items-center gap-4">
							<label className="text-sm font-semibold whitespace-nowrap">Chọn mẫu:</label>
							<select
								value={selectedSampleId}
								onChange={handleSampleChange}
								className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
							>
								<option value="">-- Chọn mẫu --</option>
								{availableSamples.map((sid) => (
									<option key={sid} value={sid}>
										{sid}
									</option>
								))}
							</select>
						</div>

						{/* Report Selection */}
						{sampleData && sampleData.reports && sampleData.reports.length > 0 && (
							<div className="mb-6 flex items-center gap-4">
								<label className="text-sm font-semibold whitespace-nowrap">Chọn báo cáo:</label>
								<select
									value={
										selectedReport
											? (() => {
													const idx = sampleData.reports.findIndex((r) => r.refNumber === selectedReport.refNumber);
													return idx >= 0 ? idx : '';
											  })()
											: ''
									}
									onChange={handleReportChange}
									className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
								>
									<option value="">-- Chọn báo cáo --</option>
									{sampleData.reports.map((report, index) => (
										<option key={index} value={index}>
											{report.refNumber} - {formatDate(new Date(report.createdAt))}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Display Options */}
						<div className="mb-6">
							<h3 className="text-lg font-semibold mb-3">Tùy chọn hiển thị</h3>
							<div className="grid grid-cols-3 gap-2">
								<button
									onClick={() => setShowVlas(!showVlas)}
									className={`${
										showVlas ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
									} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									VLAS
								</button>

								<button
									onClick={() => setShowComment(!showComment)}
									className={`${
										showComment ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
									} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									Comment
								</button>

								<button
									onClick={() => setShowSign(!showSign)}
									className={`${
										showSign ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
									} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									Sign
								</button>

								<button
									onClick={() => setShowReference(!showReference)}
									className={`${
										showReference ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
									} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									Reference
								</button>

								<button
									onClick={() => setShowEnglish(!showEnglish)}
									className={`${
										showEnglish ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
									} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									English
								</button>

								<button
									onClick={() => setShowKN(!showKN)}
									className={`${
										showKN ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
									} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									KN
								</button>
							</div>
						</div>
					</>
				) : (
					/* All Samples Mode - List all samples with report selection and toggles */
					<div className="mb-6 space-y-3">
						<h3 className="text-lg font-semibold">Danh sách mẫu:</h3>
						{allSamplesData.map((sample, index) => (
							<div
								key={sample.sampleId}
								className={`p-3 rounded-lg space-y-2 transition-colors ${
									sample.isHidden ? 'bg-gray-300' : 'bg-gray-50'
								}`}
							>
								<div className="flex items-center gap-4">
									<label
										className={`text-sm font-semibold whitespace-nowrap min-w-[120px] ${
											sample.isHidden ? 'text-gray-500' : ''
										}`}
									>
										{sample.sampleId}:
									</label>
									<select
										value={sample.selectedReportIndex !== null ? sample.selectedReportIndex : ''}
										onChange={(e) => handleSampleReportChange(index, e.target.value)}
										className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
										disabled={sample.isHidden}
									>
										<option value="">-- Chọn báo cáo --</option>
										{sample.reports.map((report, reportIndex) => (
											<option key={reportIndex} value={reportIndex}>
												{report.refNumber} - {formatDate(new Date(report.createdAt))}
											</option>
										))}
									</select>
								</div>

								{/* Sample-specific toggles - single row */}
								<div className="flex gap-2 pl-[136px] flex-wrap">
									<button
										onClick={() => handleSampleToggleChange(index, 'showVlas', !sample.showVlas)}
										disabled={sample.isHidden}
										className={`${
											sample.showVlas ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
										} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										VLAS
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showComment', !sample.showComment)}
										disabled={sample.isHidden}
										className={`${
											sample.showComment ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
										} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										Comment
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showSign', !sample.showSign)}
										disabled={sample.isHidden}
										className={`${
											sample.showSign ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
										} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										Sign
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showReference', !sample.showReference)}
										disabled={sample.isHidden}
										className={`${
											sample.showReference ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
										} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										Reference
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showEnglish', !sample.showEnglish)}
										disabled={sample.isHidden}
										className={`${
											sample.showEnglish ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
										} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										English
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showKN', !sample.showKN)}
										disabled={sample.isHidden}
										className={`${
											sample.showKN ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'
										} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										KN
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'isHidden', !sample.isHidden)}
										className={`${
											sample.isHidden ? 'bg-red-500 text-white' : 'bg-gray-400 text-white'
										} px-3 py-1 rounded text-xs hover:bg-red-600 transition ml-auto`}
									>
										{sample.isHidden ? 'Hiện' : 'Ẩn'}
									</button>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-2 mb-6">
					<button
						onClick={handleSave}
						className="px-4 py-2 flex-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
					>
						SAVE
					</button>

					<button
						onClick={handlePreview}
						className="px-4 py-2 flex-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
					>
						PREVIEW
					</button>

					<button
						onClick={handlePublish}
						className="px-4 py-2 flex-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
					>
						PUBLISH
					</button>

					<button
						onClick={handleSelectLatestPublished}
						className="px-4 py-2 flex-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm"
					>
						Select Latest Published
					</button>
				</div>

				{/* Receipt Note */}
				{receiptData && receiptData.note && (
					<div className="mt-6">
						<h3 className="font-semibold mb-2 text-lg text-left">Ghi chú tiếp nhận mẫu</h3>
						<div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
							<p className="text-sm whitespace-pre-wrap text-left">{receiptData.note}</p>
						</div>
					</div>
				)}

				{/* Sample Addition Request */}
				{sampleData && sampleData.additionRequest && (
					<div className="mt-6">
						<h3 className="font-semibold mb-2 text-lg text-left">Ghi chú mẫu thử</h3>
						<div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
							<p className="text-sm whitespace-pre-wrap text-left">{sampleData.additionRequest}</p>
						</div>
					</div>
				)}

				{/* Analysis List */}
				{sampleData && sampleData.analysis && sampleData.analysis.length > 0 && (
					<div className="mt-6">
						<h3 className="font-semibold mb-3 text-lg text-left">Danh sách chỉ tiêu</h3>
						<div className="overflow-x-auto">
							<table className="w-full text-sm border-collapse border border-gray-300">
								<thead className="bg-gray-100">
									<tr>
										<th className="border border-gray-300 px-2 py-1 text-left">Tên chỉ tiêu</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Mã phương pháp</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Kết quả</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Đơn vị</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Ghi chú</th>
									</tr>
								</thead>
								<tbody>
									{sampleData.analysis.map((item, index) => (
										<tr key={item.id || index} className="hover:bg-gray-50">
											<td className="border border-gray-300 px-2 py-1 text-left">{item.parameter_name || '--'}</td>
											<td className="border border-gray-300 px-2 py-1 text-left">{item.protocol_code || '--'}</td>
											<td className="border border-gray-300 px-2 py-1 text-left">{item.result_value || '--'}</td>
											<td className="border border-gray-300 px-2 py-1 text-left">{item.result_unit || '--'}</td>
											<td className="border border-gray-300 px-2 py-1 text-left">{item.note || '--'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>

			<style>
				{`
					/* TinyMCE Custom Styles */
					.tox-tinymce {
						border: 2px solid #6b7280 !important;
						border-radius: 4px !important;
						box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
						overflow: hidden !important;
					}

					.tox-toolbar-overlord {
						background: white !important;
						border-bottom: 2px solid #6b7280 !important;
					}

					.tox .tox-toolbar__group:not(:last-of-type) {
						border-right: 2px solid #e5e7eb !important;
					}

					.tox .tox-tbtn {
						margin: 2px !important;
						border-radius: 4px !important;
						transition: all 0.2s ease !important;
					}

					.tox .tox-tbtn:hover {
						background: #e2e8f0 !important;
					}

					.tox .tox-tbtn--enabled {
						background: #cbd5e0 !important;
					}

					/* Hide all quickbars and floating toolbars */
					.tox-pop {
						display: none !important;
					}
					
					.tox-pop__dialog {
						display: none !important;
					}

					.tox .tox-quickbar {
						display: none !important;
					}

					.tox .tox-toolbar-overlord .tox-toolbar--overflow {
						display: none !important;
					}

					.tox-pop .tox-toolbar {
						display: none !important;
					}

					/* Hide table selection toolbar specifically */
					.tox .tox-pop .tox-toolbar {
						display: none !important;
					}

					/* Hide scrollbar for TinyMCE editor area */
					.tox-edit-area__iframe {
						overflow: hidden !important;
					}

					.tox .tox-edit-area {
						overflow: hidden !important;
					}

					/* Hide scrollbar but allow scrolling */
					.tox-edit-area__iframe::-webkit-scrollbar {
						display: none;
					}

					.tox-edit-area__iframe {
						-ms-overflow-style: none;
						scrollbar-width: none;
					}
					
					@media print {
						body * {
							visibility: hidden;
						}
						.print-content,
						.print-content * {
							visibility: visible;
						}
						.print-content {
							position: absolute;
							left: 0;
							top: 0;
							width: 100%;
						}
					}
				`}
			</style>
		</div>
	);
};

export default ReportEditor;
