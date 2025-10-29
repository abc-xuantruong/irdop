import React, { useEffect, useState, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../contexts/GlobalContext'; // Add import for GlobalContext
import JsBarcode from 'jsbarcode';

const PrintSampleTag = () => {
	const [searchParams] = useSearchParams();
	const receiptId = searchParams.get('receiptId');
	const sampleId = searchParams.get('sampleId'); // Get sampleId from query params
	const [receiptData, setReceiptData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const { status } = useContext(GlobalContext);

	useEffect(() => {
		const fetchReceiptData = async () => {
			if (!receiptId) {
				setError('No receiptId provided');
				setLoading(false);
				return;
			}

			try {
				const response = await apiPost('https://red.irdop.org/v1/receipt/get/full', {
					receiptId: receiptId,
				});
				if (response.status === 200) {
					// Extract only the data we need with new camelCase structure
					const { receiptId, _deprecated_recordCode, receiptDate, samples } = response.data;

					// Filter samples if sampleId is provided and process analyses
					let simplifiedSamples = samples.map((sample) => {
						const analyses = sample.analyses || [];

						// Get unique technicians (null/"" count as one group)
						const technicianGroups = [];
						const seenTechnicians = new Set();
						let hasEmptyTechnician = false;

						analyses.forEach((analysis) => {
							const techId = analysis.technician?.identityId;
							const techName = analysis.technician?.identityName;

							if (!techId || techId === '') {
								hasEmptyTechnician = true;
							} else if (!seenTechnicians.has(techId)) {
								seenTechnicians.add(techId);
								technicianGroups.push({
									identityId: techId,
									identityName: techName || '',
								});
							}
						});

						// Add empty technician group if exists
						if (hasEmptyTechnician) {
							technicianGroups.push({
								identityId: null,
								identityName: '',
							});
						}

						return {
							sampleId: sample.sampleId || sample.sample_id,
							status: sample.status,
							technicianGroups: technicianGroups,
						};
					});

					// If sampleId is provided, filter to show only that specific sample
					if (sampleId) {
						simplifiedSamples = simplifiedSamples.filter(
							(sample) => (sample.sampleId || sample.sample_id) === sampleId,
						);
						if (simplifiedSamples.length === 0) {
							setError(`Sample with ID ${sampleId} not found in this receipt`);
						}
					}

					setReceiptData({
						receiptId: receiptId,
						recordCode: _deprecated_recordCode,
						createdAt: receiptDate,
						samples: simplifiedSamples,
					});
				} else {
					setError(`Error fetching data: ${response.status}`);
				}
			} catch (err) {
				setError(`Error: ${err.message}`);
			} finally {
				setLoading(false);
			}
		};

		fetchReceiptData();
	}, [receiptId, sampleId]); // Add sampleId to dependency array

	// Format date to dd-mm-yyyy
	const formatDate = (dateString) => {
		if (!dateString) return '';

		const date = new Date(dateString);
		if (isNaN(date.getTime())) return dateString;

		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();

		return `${day}${month}${year}`;
	};

	// Add an event listener for afterprint event to close the window
	useEffect(() => {
		const handleAfterPrint = () => {
			window.close();
		};

		window.addEventListener('afterprint', handleAfterPrint);

		return () => {
			window.removeEventListener('afterprint', handleAfterPrint);
		};
	}, []);

	// Remove the auto-print useEffect
	useEffect(() => {
		if (receiptData && !loading) {
			// Auto-print functionality removed
		}
	}, [receiptData, loading]);

	if (loading) {
		return <div className="flex justify-center items-center h-screen">Loading...</div>;
	}

	if (error) {
		return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
	}

	// Barcode component with multiple format options
	const BarcodeGenerator = ({ value, width = 1, height = 40, format = 'CODE128' }) => {
		const canvasRef = useRef(null);

		useEffect(() => {
			if (canvasRef.current && value) {
				try {
					// Different barcode formats for different needs:
					// CODE39: Best spacing, good for 1x2 ratio, supports alphanumeric
					// CODE128: More compact, better data density
					// ITF: Numbers only, very compact
					const formatOptions = {
						CODE39: {
							format: 'CODE39',
							width: width,
							height: height,
							displayValue: false,
							margin: 3, // Good spacing to prevent sticking
							background: 'transparent',
							lineColor: '#000000',
						},
						CODE128: {
							format: 'CODE128',
							width: width,
							height: height,
							displayValue: false,
							margin: 2,
							background: 'transparent',
							lineColor: '#000000',
						},
						ITF: {
							format: 'ITF',
							width: width,
							height: height,
							displayValue: false,
							margin: 2,
							background: 'transparent',
							lineColor: '#000000',
						},
					};

					JsBarcode(canvasRef.current, value, formatOptions[format] || formatOptions.CODE39);
				} catch (error) {
					// Fallback to CODE128 if selected format fails
					try {
						JsBarcode(canvasRef.current, value, {
							format: 'CODE128',
							width: width,
							height: height,
							displayValue: false,
							margin: 2,
							background: 'transparent',
							lineColor: '#000000',
						});
					} catch (fallbackError) {
						console.error('Error generating barcode:', fallbackError);
					}
				}
			}
		}, [value, width, height, format]);

		return <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />;
	};

	// Single tag component for each sample
	const SampleTag = ({ sample, isPrintView = false, technicianName = null }) => {
		const isTechnicianTag = technicianName !== null;
		const barcodeHeight = isTechnicianTag ? 39 : 40;
		const sampleIdFontSize = isTechnicianTag ? 'text-lg' : 'text-xl';
		const techNameFontSize = 'text-lg';

		return (
			<div
				className={`p-2 py-1 w-[50mm] h-[30mm] flex overflow-hidden text-sm ${
					!isPrintView ? 'border-gray-300 border rounded-sm' : ''
				}`}
			>
				<div className="flex-1 flex flex-col justify-start font-semibold">
					<div className="flex w-full justify-between items-end">
						<div className="text-left">
							<div className={`flex justify-start mb-0 ${isTechnicianTag ? techNameFontSize : 'text-3xl'}`}>
								{technicianName ? (
									<span className="leading-tight" style={{ maxWidth: '45mm', wordBreak: 'break-word' }}>
										{technicianName}
									</span>
								) : (
									<span>{receiptData.recordCode || '--'}</span>
								)}
							</div>
						</div>
						{sample.status === 1 && (
							<div className="flex justify-between text-xl">
								<span>K</span>
							</div>
						)}
						{!technicianName && (
							<div className="flex justify-between mb-1 text-base">
								<span>{formatDate(receiptData.createdAt || receiptData.receiptDate)}</span>
							</div>
						)}
					</div>
					<div className="flex items-center justify-center">
						<BarcodeGenerator value={sample.sampleId} width={1} height={barcodeHeight} />
					</div>
					<div className={`flex justify-center mb-0.5 ${sampleIdFontSize}`}>
						<p style={{ letterSpacing: '0.1em', lineHeight: '20px' }}>{sample.sampleId}</p>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="print-container">
			{/* Print-specific styles */}
			<style>
				{`
                @media print {
                    @page {
                        size: 100mm 30mm;
                        margin: 0;
                    }
                    
                    html, body {
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    .print-content, .print-content * {
                        visibility: visible;
                        border: none !important;
                    }
                    
                    .print-content .flex-1 {
                        border: none !important;
                    }
                    
                    .print-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        padding: 0;
                        margin: 0;
                    }
                    
                    .tag-pair {
                        display: flex;
                        flex-direction: row;
                        width: 100mm;
                        height: 30mm;
                        page-break-after: always;
                        page-break-inside: avoid;
                        margin: 0;
                        padding: 0;
                    }
                    
                    .tag-pair:last-of-type {
                        page-break-after: auto;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                }
                
                /* Non-print styles */
                .tag-pair {
                    display: flex;
                    flex-direction: row;
                    margin-bottom: 10px;
                }
                `}
			</style>

			{/* Only visible on screen, not when printing */}
			<div className="no-print mb-4 mt-1 p-2 bg-gray-100 text-start">
				<h1 className="text-2xl text-primary font-semibold ">IN NHÃN DÁN MẪU</h1>
				<button
					onClick={() => {
						window.print();
					}}
					className="mt-2 bg-gray-200 text-black border-gray-700 hover:border-purple-700 active:bg-gray-100 px-4 py-1 rounded"
				>
					Print Tags
				</button>
			</div>

			{/* The actual content to be printed */}
			<div className="print-content h-fit">
				{receiptData.samples &&
					(() => {
						// Collect all tags from all samples into one flat array
						const allTags = [];

						receiptData.samples.forEach((sample, sampleIndex) => {
							// First tag: default with recordCode and date
							allTags.push({
								key: `${sampleIndex}-default`,
								technicianName: null,
								sample: sample,
							});

							// Additional tags for each technician group
							sample.technicianGroups?.forEach((tech, techIndex) => {
								allTags.push({
									key: `${sampleIndex}-tech-${techIndex}`,
									technicianName: tech.identityName || '',
									sample: sample,
								});
							});
						});

						// Group all tags into pairs (2 per row) across all samples
						const pairedTags = [];
						for (let i = 0; i < allTags.length; i += 2) {
							pairedTags.push({
								key: `pair-${i}`,
								tags: allTags.slice(i, i + 2),
							});
						}

						return pairedTags.map((pair) => (
							<div key={pair.key} className="tag-pair">
								{pair.tags.map((tag) => (
									<SampleTag key={tag.key} sample={tag.sample} technicianName={tag.technicianName} />
								))}
							</div>
						));
					})()}
			</div>
		</div>
	);
};

export default PrintSampleTag;
