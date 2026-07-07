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
import FileForm from '../components/FileForm';

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
	const [replaceReportRef, setReplaceReportRef] = useState(''); // Track replacement report reference

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
	const [isPublishedReportRef, setIsPublishedReportRef] = useState(false);
	const [searchSampleId, setSearchSampleId] = useState('');

	// Editor refs for TinyMCE
	const headerEditorRef = useRef(null);
	const contentEditorRef = useRef(null);
	const footerEditorRef = useRef(null);

	// Preview states
	const [showPreview, setShowPreview] = useState(false);
	const [paginatedPages, setPaginatedPages] = useState([]);
	const [isFileFormVisible, setIsFileFormVisible] = useState(false);
	const [invoiceFile, setInvoiceFile] = useState(null); // State for invoice file

	// Load invoice file from receipt data
	const loadInvoiceFile = async (receiptDataParam) => {
		try {
			const receiptDataToUse = receiptDataParam || receiptData;
			if (!receiptDataToUse) return;

			const foreignKeys = [receiptDataToUse._deprecated_recordCode, receiptDataToUse.orderId].filter(Boolean);
			if (foreignKeys.length === 0) return;

			const response = await apiPost('https://red.irdop.org/v1/file/get_by_key', {
				foreignKeyUIDs: foreignKeys,
			});

			if (response.status === 200 && Array.isArray(response.data)) {
				// Find file with userTag containing 'Hóa đơn'
				const invoice = response.data.find(
					(file) =>
						file.userTags && Array.isArray(file.userTags) && file.userTags.some((tag) => tag.includes('Hóa đơn')),
				);
				setInvoiceFile(invoice || null);
			}
		} catch (error) {
			console.error('Error loading invoice file:', error);
			setInvoiceFile(null);
		}
	};

	// Handle invoice button click
	const handleInvoiceClick = async () => {
		if (!invoiceFile) return;

		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: 'view',
				fileRecord: invoiceFile,
			});

			if (response.status === 200 && response.data) {
				// Open in new tab
				window.open(response.data, '_blank');
			}
		} catch (error) {
			console.error('Error opening invoice file:', error);
		}
	};

	const handleOpenFile = async (fileId) => {
		if (!fileId) return;
		try {
			const response = await apiPost('https://red.irdop.org/v1/file/get/download_link', {
				expiry: 60 * 10,
				mode: 'view',
				fileRecord: { id: fileId },
			});
			if (response.status === 200 && response.data) {
				window.open(response.data, '_blank');
			}
		} catch (error) {
			console.error('Error opening file:', error);
		}
	};

	// Handle opening all lab test files
	const handleOpenAllLabTestFiles = async () => {
		// Collect all file IDs first
		const allFiles = new Set();
		const samplesSource = receiptData?.samples || (sampleData ? [sampleData] : []);

		if (!samplesSource || samplesSource.length === 0) {
			alert('Không có dữ liệu mẫu!');
			return;
		}

		samplesSource.forEach((sample) => {
			const analyses = sample.analyses || sample.analysis || [];
			analyses.forEach((analysis) => {
				if (analysis.labTestFileId) {
					allFiles.add(analysis.labTestFileId);
				}
			});
		});

		const uniqueFiles = Array.from(allFiles);

		if (uniqueFiles.length === 0) {
			alert('Không tìm thấy tài liệu thử nghiệm nào!');
			return;
		}

		// Open files
		let openedCount = 0;
		for (const fileId of uniqueFiles) {
			await handleOpenFile(fileId);
			openedCount++;
			// Small delay to help with browser handling of multiple tabs
			await new Promise((r) => setTimeout(r, 500));
		}
	};

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
					labTestFileId: sample.labTestFileId,
					client: {
						clientId: fullReceiptData.client?.clientUID || '',
						clientName: fullReceiptData.client?.clientName || '',
						clientAddress: fullReceiptData.client?.clientAddress || '',
					},
					analysis: (sample.analyses || []).map((analysis) => ({
						id: analysis.id,
						labTestFileId: analysis.labTestFileId,
						parameter_name: analysis.parameterName,
						matrix: analysis.matrix || sample.matrix || '',
						protocol_code: analysis.protocolCode,
						protocol_source: analysis.protocolSource,
						result_value: analysis.resultValue || '',
						result_unit: analysis.resultUnit || '',
						reference: analysis.reference || '',
						note: analysis.note || '',
						display_style: analysis.displayStyle || {
							default: analysis.parameterName,
							eng: '',
						},
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
					replaceReportRef: '',
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

			// Load invoice file
			await loadInvoiceFile(fullReceiptData);

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
				const sampleResponse = await apiPost('https://red.irdop.org/v1/sample/get/full', {
					sampleId: sampleIdToFetch,
				});

				if (sampleResponse.status === 200 && sampleResponse.data?.receiptId) {
					receiptId = sampleResponse.data.receiptId;

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
				labTestFileId: currentSample.labTestFileId,
				client: {
					clientId: receiptData.client?.clientUID || '',
					clientName: receiptData.client?.clientName || '',
					clientAddress: receiptData.client?.clientAddress || '',
				},
				analysis: (currentSample.analyses || []).map((analysis) => ({
					id: analysis.id,
					labTestFileId: analysis.labTestFileId,
					parameter_name: analysis.parameterName,
					matrix: analysis.matrix || currentSample.matrix || '',
					protocol_code: analysis.protocolCode,
					protocol_source: analysis.protocolSource,
					result_value: analysis.resultValue || '',
					result_unit: analysis.resultUnit || '',
					reference: analysis.reference || '',
					note: analysis.note || '',
					display_style: analysis.displayStyle || {
						default: analysis.parameterName,
						eng: '',
					},
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

			// Load invoice file
			await loadInvoiceFile(receiptData);

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
					await fetchReportData(refNumberFromUrl);
					setCurrentRefNumber(refNumberFromUrl);
				} else if (reportId) {
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
				fetchReportData(targetRefNumber);
				setCurrentRefNumber(targetRefNumber);
			}
		}
	}, [sampleData, refNumberFromUrl, reportId, selectedReport, userClearedReport]);

	// Handle search and redirect to another sample report
	const handleSearchAndRedirect = async () => {
		if (!searchSampleId || searchSampleId.trim() === '') {
			alert('Vui lòng nhập mã mẫu!');
			return;
		}

		const cleanSampleId = searchSampleId.trim();
		try {
			setLoading(true);
			const response = await apiPost('https://red.irdop.org/v1/sample/get/full', {
				sampleId: cleanSampleId,
			});

			if (response.status === 200 && response.data && response.data.sampleId) {
				// Navigate to the target report page
				window.location.href = `/report?sampleId=${cleanSampleId}`;
			} else {
				alert('Mã mẫu không tồn tại trong hệ thống!');
			}
			setLoading(false);
		} catch (error) {
			console.error('Error finding sample for redirect:', error);
			alert('Có lỗi xảy ra hoặc mã mẫu không tồn tại!');
			setLoading(false);
		}
	};

	// Handle sample selection change
	const handleSampleChange = (e) => {
		const newSampleId = e.target.value;
		setSelectedSampleId(newSampleId);
		setSelectedReport(null); // Reset report selection
		setIsPublishedReportRef(false); // Reset published report flag
		setUserClearedReport(false); // Reset flag when changing sample
		setReplaceReportRef(''); // Reset replacement report selection

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

		// Check if user selected default option (empty string or "")
		if (reportIndex === '' || reportIndex === undefined || reportIndex === null) {
			setSelectedReport(null);
			setIsPublishedReportRef(false); // Reset published report flag
			setUserClearedReport(true); // Mark that user manually cleared selection

			// Remove refNumber from URL
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete('refNumber');
			window.history.pushState({}, '', newUrl);

			// Clear current refNumber state
			setCurrentRefNumber('');
			setReplaceReportRef(''); // Reset replacement report reference
			return;
		}

		const parsedIndex = parseInt(reportIndex);

		if (sampleData && sampleData.reports && sampleData.reports[parsedIndex]) {
			const report = sampleData.reports[parsedIndex];
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

					// Extract replaceReportRef
					try {
						const doc = new DOMParser().parseFromString(headerWithId, 'text/html');
						const replaceElement = doc.querySelector('.replace-report-row');
						const replacedRef = replaceElement ? replaceElement.getAttribute('data-replace-ref') : '';
						setReplaceReportRef(replacedRef || '');
					} catch (e) {
						console.error('Error parsing replaceReportRef from header:', e);
						setReplaceReportRef('');
					}

					setTimeout(() => {
						if (headerEditorRef.current) {
							headerEditorRef.current.setContent(headerWithId);
						}
					}, 100);
				} else {
					setReplaceReportRef('');
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

				setIsPublishedReportRef(true);
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

					// Helper to format text with asterisks
					const formatText = (text) => {
						if (!text) return '';
						let result = '';
						let count = 0;
						for (let i = 0; i < text.length; i++) {
							if (text[i] === '*') {
								count++;
								result += count % 2 !== 0 ? '<em>' : '</em>';
							} else {
								result += text[i];
							}
						}
						return result;
					};

					let defaultText = item.parameter_name || '--';
					let engText = '';

					if (
						item.display_style &&
						typeof item.display_style === 'object' &&
						!Array.isArray(item.display_style)
					) {
						if (item.display_style.default) {
							defaultText = formatText(item.display_style.default);
						} else if (item.parameter_name) {
							defaultText = formatText(item.parameter_name);
						}
						
						if (item.display_style.eng) {
							engText = formatText(item.display_style.eng);
						}
					} else if (item.display_style && Array.isArray(item.display_style)) {
						// Old array format support (optional, or can be removed if strictly not needed)
						const defaultItem = item.display_style.find((style) => style.label === 'default');
						if (defaultItem && defaultItem.value && defaultItem.value.trim() !== '') {
							defaultText = formatText(defaultItem.value);
						} else if (item.parameter_name) {
							defaultText = formatText(item.parameter_name);
						}

						const engItem = item.display_style.find((style) => style.label === 'eng');
						if (engItem && engItem.value && engItem.value.trim() !== '') {
							engText = formatText(engItem.value);
						}
					} else {
						defaultText = formatText(defaultText);
					}

					if (showEnglish && engText) {
						parameterName = `${defaultText}<br>${engText}`;
					} else {
						parameterName = defaultText;
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
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${index + 1}.</td>
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
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 6.5%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>STT</strong> <br> <span style="font-size: 12px; color: #444444;">/ No.</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 23%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phép thử</strong> <br> <span style="font-size: 12px; color: #444444;">/ Tests</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 18%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>${resultHeader}</strong> <br> <span style="font-size: 12px; color: #444444;">${resultHeaderEng}</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 11.5%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Đơn vị</strong><br> <span style="font-size: 12px; color: #444444;">/ Unit</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 23%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phương pháp</strong> <br> <span style="font-size: 12px; color: #444444;">/ Protocol</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 18%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
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
	const generateHeaderForSample = (sampleShowVlas, refNumber = null, sampleShowKN = false, replaceRefNumber = null) => {
		const displayVlas = sampleShowVlas ? '' : 'display:none;';
		const refCode = refNumber || 'SƠ BỘ / DRAFT';
		const title = sampleShowKN ? 'PHIẾU KẾT QUẢ KIỂM NGHIỆM' : 'PHIẾU KẾT QUẢ THỬ NGHIỆM';
		const replaceRow = replaceRefNumber ? `
			<div class="replace-report-row" data-replace-ref="${replaceRefNumber}" style="display: flex; align-items: center; gap: 2mm; font-size:12px; margin-top: 0px; height: 20px;">
				<span>Thay thế cho phiếu có mã xuất bản / Replaced for Ref. No:</span>
				<span style="min-width: 5pt; margin: 0;">${replaceRefNumber}</span>
			</div>` : '';

		return `
<div id="header-section" style="position:relative; height: fit-content;">
	<div style="position:relative; display:flex; overflow:visible;">
		<div>
			<img src="data:image/png;base64,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"  
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
			</div>${replaceRow}
		</div>
		<div class="vlas_icon" style="position:absolute; right:0mm; top:0.2cm; ${displayVlas}">
			<img src="data:image/png;base64,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"
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
			<img src="data:image/png;base64,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"  
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
			<img src="data:image/png;base64,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"		 
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
			if (isPublishedReportRef) {
				return;
			}
			updateContentWithData(sampleData);
		}
	}, [showComment, showSign, showReference, showKN, sampleData, isPublishedReportRef]);

	// Update header based on all dependencies
	useEffect(() => {
		if (isPublishedReportRef) {
			return;
		}
		// Generate new header HTML with current state
		const newHeaderHTML = generateHeaderForSample(showVlas, currentRefNumber, showKN, replaceReportRef);

		// Update the header state
		setHeader(newHeaderHTML);

		// Wait for editor to be ready, then update it
		const updateEditor = () => {
			if (!headerEditorRef.current) {
				return;
			}

			try {
				if (typeof headerEditorRef.current.setContent === 'function') {
					headerEditorRef.current.setContent(newHeaderHTML);
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
	}, [showVlas, showKN, currentRefNumber, replaceReportRef, isPublishedReportRef]);

	// Reset isPublishedReportRef when toggles are manually changed
	useEffect(() => {
		setIsPublishedReportRef(false);
	}, [showComment, showSign, showReference, showKN, showVlas, replaceReportRef]);

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
				// Skip auto-resizing for the analysis table to preserve fixed percentage widths
				if (table.closest('#analysis-section') || table.id === 'analysis-section') {
					return;
				}

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
	const handleSinglePreview = async (isTwoSided = false, isGrayscale = false) => {
		try {
			const headerHTML = headerEditorRef.current?.getContent() || header;
			let contentHTML = contentEditorRef.current?.getContent() || content;
			const footerHTML = footerEditorRef.current?.getContent() || footer;

			// Normalize table widths in content before preview
			contentHTML = normalizeTableWidths(contentHTML, contentEditorRef.current);

			const measurementData = await measureSectionsInDOM(headerHTML, contentHTML, footerHTML);
			let paginatedPages = applyClientSidePagination(headerHTML, contentHTML, footerHTML, measurementData);

			if (isTwoSided) {
				if (!isGrayscale) {
					// COLOR print: insert blank page AFTER EVERY content page so duplex printing
					// always puts content on one side only (front side), back side is blank
					const blankPage = {
						pageNumber: -1, // marker, won't count in totalPages
						sections: [{
							html: '<div class="blank-page-placeholder" style="height: 100%; display: flex; align-items: center; justify-content: center;"></div>',
							height: 0,
							isTable: false,
							tableInfo: null
						}]
					};
					const withBlanks = [];
					paginatedPages.forEach((page) => {
						withBlanks.push(page);
						withBlanks.push(blankPage);
					});
					paginatedPages = withBlanks;
				} else {
					// GRAYSCALE print: only add one blank page at the end if total is odd
					if (paginatedPages.length % 2 !== 0) {
						paginatedPages = [...paginatedPages, {
							pageNumber: paginatedPages.length + 1,
							sections: [{
								html: '<div class="blank-page-placeholder" style="height: 100%; display: flex; align-items: center; justify-content: center;"></div>',
								height: 0,
								isTable: false,
								tableInfo: null
							}]
						}];
					}
				}
			}

			// Get sample ID for filename
			const currentSampleId = sampleData?.sampleId || selectedSampleId || sampleId;

			const finalHTML = generatePreviewHTML(
				paginatedPages,
				measurementData,
				headerHTML,
				footerHTML,
				currentRefNumber,
				currentSampleId,
				isGrayscale,
			);
			openPreviewWindow(finalHTML, currentSampleId);
		} catch (error) {
			console.error('Error generating preview:', error);
			alert('Có lỗi khi tạo preview: ' + error.message);
		}
	};

	// Preview for all samples mode
	const handleAllSamplesPreview = async (isTwoSided = false, isGrayscale = false) => {
		try {
			// Wait a bit for editors to be ready
			await new Promise((resolve) => setTimeout(resolve, 500));

			const allSamplesHTML = [];

			// Process each sample individually, skip hidden samples
			for (let i = 0; i < allSamplesData.length; i++) {
				const sample = allSamplesData[i];

				// Skip hidden samples
				if (sample.isHidden) {
					continue;
				}

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

					const paginatedPages = applyClientSidePagination(headerHTML, contentHTML, footerHTML, measurementData);

					if (paginatedPages.length === 0) {
						continue;
					}

					const sampleHTML = generatePreviewHTML(
						paginatedPages,
						measurementData,
						headerHTML,
						footerHTML,
						sampleRefNumber,
						null,
						isGrayscale,
					);

					// Extract only the pages (body content) from the generated HTML
					const parser = new DOMParser();
					const doc = parser.parseFromString(sampleHTML, 'text/html');
					const pages = doc.querySelectorAll('.a4-page');

					if (pages.length === 0) {
						// Try to add the whole body as a page
						const bodyContent = doc.body.innerHTML;
						if (bodyContent && bodyContent.trim() !== '') {
							allSamplesHTML.push(`<div class="a4-page">${bodyContent}</div>`);
						}
					} else {
						if (isTwoSided && !isGrayscale) {
							// COLOR print: insert blank page after EVERY content page
							// so duplex printing always puts content on front side only
							pages.forEach((page) => {
								allSamplesHTML.push(page.outerHTML);
								allSamplesHTML.push(
									`<div class="a4-page blank-page-placeholder" style="background: white; border: 1px solid #000; display: flex; align-items: center; justify-content: center; height: 1122px; width: 794px;"></div>`
								);
							});
						} else {
							// GRAYSCALE: collect pages as-is, but add ONE blank page at the
							// end of this sample's pages if its count is odd
							pages.forEach((page) => {
								allSamplesHTML.push(page.outerHTML);
							});
							if (isTwoSided && isGrayscale && pages.length % 2 !== 0) {
								allSamplesHTML.push(
									`<div class="a4-page blank-page-placeholder" style="background: white; border: 1px solid #000; display: flex; align-items: center; justify-content: center; height: 1122px; width: 794px;"></div>`
								);
							}
						}
					}
				} catch (sampleError) {
					console.error(`❌ Error processing sample ${sample.sampleId}:`, sampleError);
					continue;
				}
			}

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
				${isGrayscale ? 'filter: grayscale(100%) !important;' : ''}
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

			// Auto open print dialog and close window on complete
			setTimeout(function() {
				window.print();
				window.close();
			}, 500);
		});
	</script>
</body>
</html>`;

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

				const response = await apiPost('https://red.irdop.org/v1/report/publish', body);

				if (response.status === 200 && response.data) {
					const savedReports = Array.isArray(response.data) ? response.data : [response.data];

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

				const response = await apiPost('https://red.irdop.org/v1/report/publish', body);

				if (response.status === 200 && response.data) {
					const savedReports = Array.isArray(response.data) ? response.data : [response.data];

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
			sample.replaceReportRef = ''; // Clear replacement reference
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

				// Extract replaceReportRef
				try {
					const doc = new DOMParser().parseFromString(sample.headerContent, 'text/html');
					const replaceElement = doc.querySelector('.replace-report-row');
					const replacedRef = replaceElement ? replaceElement.getAttribute('data-replace-ref') : '';
					sample.replaceReportRef = replacedRef || '';
				} catch (e) {
					console.error('Error parsing replaceReportRef for sample:', e);
					sample.replaceReportRef = '';
				}

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

	// Handle replace report selection change for a specific sample in "all" mode
	const handleSampleReplaceReportChange = (sampleIndex, replaceRef) => {
		const updatedSamples = [...allSamplesData];
		const sample = updatedSamples[sampleIndex];
		sample.replaceReportRef = replaceRef;

		// Regenerate the header content with the new replaceReportRef
		const newHeaderContent = generateHeaderForSample(
			sample.showVlas,
			sample.currentRefNumber,
			sample.showKN,
			replaceRef
		);

		// Update stored header content
		sample.headerContent = newHeaderContent;
		setAllSamplesData(updatedSamples);

		// Update editor if it exists
		setTimeout(() => {
			if (sample.headerEditorRef && typeof sample.headerEditorRef.setContent === 'function') {
				sample.headerEditorRef.setContent(newHeaderContent);
			}
		}, 50);
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
				sample.replaceReportRef,
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

							// Helper to format text with asterisks
							const formatText = (text) => {
								if (!text) return '';
								let result = '';
								let count = 0;
								for (let i = 0; i < text.length; i++) {
									if (text[i] === '*') {
										count++;
										result += count % 2 !== 0 ? '<em>' : '</em>';
									} else {
										result += text[i];
									}
								}
								return result;
							};

							if (
								item.display_style &&
								typeof item.display_style === 'object' &&
								!Array.isArray(item.display_style) &&
								item.display_style.default
							) {
								const defaultText = formatText(item.display_style.default);

								if (sample.showEnglish && item.display_style.eng) {
									const engText = formatText(item.display_style.eng);
									parameterName = `${defaultText}<br>${engText}`;
								} else {
									parameterName = defaultText;
								}
							} else if (item.display_style && Array.isArray(item.display_style)) {
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
					<td style="border: 1px solid black; padding: 4px 8px; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">${idx + 1}.</td>
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
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 6.5%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>STT</strong> <br> <span style="font-size: 12px; color: #444444;">/ No.</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 23%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phép thử</strong> <br> <span style="font-size: 12px; color: #444444;">/ Tests</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 18%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>${resultHeader}</strong> <br> <span style="font-size: 12px; color: #444444;">${resultHeaderEng}</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 11.5%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Đơn vị</strong><br> <span style="font-size: 12px; color: #444444;">/ Unit</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 23%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
				<strong>Phương pháp</strong> <br> <span style="font-size: 12px; color: #444444;">/ Protocol</span>
			</th>
			<th style="border: 1px solid black; padding: 4px 8px; background-color: #f2f2f2; font-weight: 500; width: 18%; text-align:left; font-size:12px; vertical-align: middle; line-height: 1.2; box-sizing: border-box;">
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
		<div className="flex bg-gray-100 min-h-screen overflow-x-auto w-full">
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
												generateHeaderForSample(sample.showVlas, sample.currentRefNumber, sample.showKN, sample.replaceReportRef)
											}
											onEditorChange={(content) => {
												const updated = [...allSamplesData];
												updated[index].headerContent = content;
												setAllSamplesData(updated);
											}}
											onInit={(evt, editor) => {
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
			<div className="flex-1 bg-white shadow-lg p-6 w-full">
				<h2 className="text-2xl font-bold text-primary mb-6">Phiếu phân tích</h2>

				{/* View Mode Selection */}
				<div className="mb-6 flex justify-between items-center flex-wrap gap-4">
					<div>
						<label className="text-sm font-semibold mb-2 block">Chế độ xem:</label>
						<div className="flex gap-2">
							<button
								onClick={() => handleViewModeChange('single')}
								className={`px-4 py-2 rounded-lg transition ${viewMode === 'single' ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
							>
								Đơn lẻ
							</button>
							<button
								onClick={() => handleViewModeChange('all')}
								className={`px-4 py-2 rounded-lg transition ${viewMode === 'all' ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
							>
								Toàn bộ phiếu
							</button>
							<button
								onClick={() => setIsFileFormVisible(true)}
								className="px-4 py-2 rounded-lg transition bg-gray-200 text-gray-700 hover:bg-gray-300"
							>
								Files
							</button>
							<button
								onClick={handleInvoiceClick}
								disabled={!invoiceFile}
								className={`px-4 py-2 rounded-lg transition ${invoiceFile ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
							>
								Hóa đơn
							</button>
							<button
								onClick={handleOpenAllLabTestFiles}
								className="px-4 py-2 rounded-lg transition bg-orange-500 text-white hover:bg-orange-600"
							>
								Tài liệu thử nghiệm
							</button>
						</div>
					</div>

					<div className="flex flex-col items-end">
						<label className="text-sm font-semibold mb-2 block">Tìm nhanh mã mẫu:</label>
						<div className="flex gap-2">
							<input
								type="text"
								placeholder="Nhập mã mẫu (Ví dụ: SP...)"
								value={searchSampleId}
								onChange={(e) => setSearchSampleId(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleSearchAndRedirect();
									}
								}}
								className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 w-48 text-sm bg-white text-black"
							/>
							<button
								onClick={handleSearchAndRedirect}
								className="px-4 py-2 rounded-lg transition bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
							>
								Chuyển tiếp
							</button>
						</div>
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

						{/* Replacement Report Selection */}
						{sampleData && sampleData.reports && sampleData.reports.length > 0 && (
							<div className="mb-6 flex items-center gap-4">
								<label className="text-sm font-semibold whitespace-nowrap">Thay thế báo cáo:</label>
								<select
									value={replaceReportRef}
									onChange={(e) => setReplaceReportRef(e.target.value)}
									className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
								>
									<option value="">-- Chọn báo cáo thay thế --</option>
									{sampleData.reports
										.filter((report) => !selectedReport || report.refNumber !== selectedReport.refNumber)
										.map((report, index) => (
											<option key={report.refNumber} value={report.refNumber}>
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
									className={`${showVlas ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									VLAS
								</button>

								<button
									onClick={() => setShowComment(!showComment)}
									className={`${showComment ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									Comment
								</button>

								<button
									onClick={() => setShowSign(!showSign)}
									className={`${showSign ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									Sign
								</button>

								<button
									onClick={() => setShowReference(!showReference)}
									className={`${showReference ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									Reference
								</button>

								<button
									onClick={() => setShowEnglish(!showEnglish)}
									className={`${showEnglish ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
								>
									English / Vi
								</button>

								<button
									onClick={() => setShowKN(!showKN)}
									className={`${showKN ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg hover:bg-sky-600 transition`}
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
								className={`p-3 rounded-lg space-y-2 transition-colors ${sample.isHidden ? 'bg-gray-300' : 'bg-gray-50'}`}
							>
								<div className="flex items-center gap-4">
									<label
										className={`text-sm font-semibold whitespace-nowrap min-w-[120px] ${sample.isHidden ? 'text-gray-500' : ''}`}
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

								{!sample.isHidden && sample.reports && sample.reports.length > 0 && (
									<div className="flex items-center gap-4">
										<label
											className="text-sm font-semibold whitespace-nowrap min-w-[120px] text-gray-500"
										>
											Thay thế báo cáo:
										</label>
										<select
											value={sample.replaceReportRef || ''}
											onChange={(e) => handleSampleReplaceReportChange(index, e.target.value)}
											className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
											disabled={sample.isHidden}
										>
											<option value="">-- Chọn báo cáo thay thế --</option>
											{sample.reports
												.filter((report, idx) => sample.selectedReportIndex === null || idx !== sample.selectedReportIndex)
												.map((report, reportIndex) => (
													<option key={report.refNumber} value={report.refNumber}>
														{report.refNumber} - {formatDate(new Date(report.createdAt))}
													</option>
												))}
										</select>
									</div>
								)}

								{/* Sample-specific toggles - single row */}
								<div className="flex gap-2 pl-[136px] flex-wrap">
									<button
										onClick={() => handleSampleToggleChange(index, 'showVlas', !sample.showVlas)}
										disabled={sample.isHidden}
										className={`${sample.showVlas ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										VLAS
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showComment', !sample.showComment)}
										disabled={sample.isHidden}
										className={`${sample.showComment ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										Comment
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showSign', !sample.showSign)}
										disabled={sample.isHidden}
										className={`${sample.showSign ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										Sign
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showReference', !sample.showReference)}
										disabled={sample.isHidden}
										className={`${sample.showReference ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										Reference
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showEnglish', !sample.showEnglish)}
										disabled={sample.isHidden}
										className={`${sample.showEnglish ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										English / Vi
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'showKN', !sample.showKN)}
										disabled={sample.isHidden}
										className={`${sample.showKN ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-700'} px-3 py-1 rounded text-xs hover:bg-sky-600 transition ${
											sample.isHidden ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									>
										KN
									</button>
									<button
										onClick={() => handleSampleToggleChange(index, 'isHidden', !sample.isHidden)}
										className={`${sample.isHidden ? 'bg-red-500 text-white' : 'bg-gray-400 text-white'} px-3 py-1 rounded text-xs hover:bg-red-600 transition ml-auto`}
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
						onClick={() => {
							if (viewMode === 'single') {
								handleSinglePreview(false, false);
							} else {
								handleAllSamplesPreview(false, false);
							}
						}}
						className="px-4 py-2 flex-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
					>
						PREVIEW
					</button>

					<button
						onClick={() => {
							if (viewMode === 'single') {
								handleSinglePreview(true, false);
							} else {
								handleAllSamplesPreview(true, false);
							}
						}}
						className="px-4 py-2 flex-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
					>
						PRINT COLOR
					</button>

					<button
						onClick={() => {
							if (viewMode === 'single') {
								handleSinglePreview(true, true);
							} else {
								handleAllSamplesPreview(true, true);
							}
						}}
						className="px-4 py-2 flex-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
					>
						PRINT GRAYSCALE
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
										<th className="border border-gray-300 px-2 py-1 text-left">File</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Ghi chú</th>
									</tr>
								</thead>
								<tbody>
									{sampleData.analysis.map((item, index) => (
										<tr
											key={item.id || index}
											className={`hover:bg-gray-50 ${!item.labTestFileId ? 'border-2 border-yellow-500' : ''}`}
										>
											<td className="border border-gray-300 px-2 py-1 text-left">{item.parameter_name || '--'}</td>
											<td className="border border-gray-300 px-2 py-1 text-left">{item.protocol_code || '--'}</td>
											<td
												className="border border-gray-300 px-2 py-1 text-left"
												dangerouslySetInnerHTML={{ __html: item.result_value || '--' }}
											/>
											<td
												className="border border-gray-300 px-2 py-1 text-left"
												dangerouslySetInnerHTML={{ __html: item.result_unit || '--' }}
											/>
											<td className="border border-gray-300 px-2 py-1 text-left text-center">
												{item.labTestFileId ? (
													<button
														onClick={() => handleOpenFile(item.labTestFileId)}
														className="text-blue-600 hover:text-blue-800 underline"
													>
														Mở
													</button>
												) : (
													<span className="text-gray-400">Trống</span>
												)}
											</td>
											<td className="border border-gray-300 px-2 py-1 text-left">{item.note || '--'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Combined Analysis List for All Samples Mode */}
				{viewMode === 'all' && allSamplesData.length > 0 && (
					<div className="mt-6">
						<h3 className="font-semibold mb-3 text-lg text-left">Danh sách chỉ tiêu tổng hợp</h3>
						<div className="overflow-x-auto">
							<table className="w-full text-sm border-collapse border border-gray-300">
								<thead className="bg-gray-100">
									<tr>
										<th className="border border-gray-300 px-2 py-1 text-left">Mã mẫu</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Tên chỉ tiêu</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Mã phương pháp</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Kết quả</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Đơn vị</th>
										<th className="border border-gray-300 px-2 py-1 text-left">File</th>
										<th className="border border-gray-300 px-2 py-1 text-left">Ghi chú</th>
									</tr>
								</thead>
								<tbody>
									{allSamplesData.flatMap((sample, sampleIndex) => {
										if (sample.isHidden) return [];
										const analysisCount = sample.analysis ? sample.analysis.length : 0;

										return (sample.analysis || []).map((item, index) => (
											<tr
												key={`${sample.sampleId}-${item.id || index}`}
												className={`hover:bg-gray-50 ${!item.labTestFileId ? 'border-2 border-yellow-500' : ''}`}
											>
												{index === 0 && (
													<td
														className="border border-gray-300 px-2 py-1 text-left align-top font-bold"
														rowSpan={analysisCount}
													>
														{sample.sampleId}
													</td>
												)}
												<td className="border border-gray-300 px-2 py-1 text-left">{item.parameter_name || '--'}</td>
												<td className="border border-gray-300 px-2 py-1 text-left">{item.protocol_code || '--'}</td>
												<td
													className="border border-gray-300 px-2 py-1 text-left"
													dangerouslySetInnerHTML={{ __html: item.result_value || '--' }}
												/>
												<td
													className="border border-gray-300 px-2 py-1 text-left"
													dangerouslySetInnerHTML={{ __html: item.result_unit || '--' }}
												/>
												<td className="border border-gray-300 px-2 py-1 text-left text-center">
													{item.labTestFileId ? (
														<button
															onClick={() => handleOpenFile(item.labTestFileId)}
															className="text-blue-600 hover:text-blue-800 underline"
														>
															Mở
														</button>
													) : (
														<span className="text-gray-400">Trống</span>
													)}
												</td>
												<td className="border border-gray-300 px-2 py-1 text-left">{item.note || '--'}</td>
											</tr>
										));
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>

			{/* FileForm */}
			<FileForm
				foreignKeyUIDs={receiptData ? [receiptData._deprecated_recordCode, receiptData.orderId].filter(Boolean) : []}
				objectPath="activities/LAB"
				isVisible={isFileFormVisible}
				onClose={() => setIsFileFormVisible(false)}
			/>

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
