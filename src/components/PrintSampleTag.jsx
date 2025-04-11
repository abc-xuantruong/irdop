import React, { useEffect, useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet } from '../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../contexts/GlobalContext'; // Add import for GlobalContext
import logoSvg from '../assets/IRDOP-LOGO-FULL_.svg';

const PrintSampleTag = () => {
	const [searchParams] = useSearchParams();
	const receipt_uid = searchParams.get('receipt_uid');
	const sample_uid = searchParams.get('sample_uid'); // Get sample_uid from query params
	const [receiptData, setReceiptData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const { status } = useContext(GlobalContext);

	useEffect(() => {
		const fetchReceiptData = async () => {
			if (!receipt_uid) {
				setError('No receipt_uid provided');
				setLoading(false);
				return;
			}

			try {
				const response = await apiGet(`https://black.irdop.org/khsi19me/db/get/receipt_full/${receipt_uid}`);
				if (response.status === 200) {
					// Extract only the data we need
					const { receipt_uid, record_code, created_at, samples } = response.data;

					// Filter samples if sample_uid is provided
					let simplifiedSamples = samples.map((sample) => ({
						sample_uid: sample.sample_uid,
						status: sample.status,
					}));

					// If sample_uid is provided, filter to show only that specific sample
					if (sample_uid) {
						simplifiedSamples = simplifiedSamples.filter((sample) => sample.sample_uid === sample_uid);
						if (simplifiedSamples.length === 0) {
							setError(`Sample with ID ${sample_uid} not found in this receipt`);
						}
					}

					setReceiptData({
						receipt_uid,
						record_code,
						created_at,
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
	}, [receipt_uid, sample_uid]); // Add sample_uid to dependency array

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

	// Single tag component for each sample
	const SampleTag = ({ sample, isPrintView = false }) => (
		<div
			className={`p-2 py-1 w-[50mm] h-[30mm] flex overflow-hidden text-sm ${
				!isPrintView ? 'border-gray-300 border rounded-sm' : ''
			}`}
		>
			<div className="flex-1 flex flex-col justify-between font-semibold ">
				<div className="flex w-full justify-between">
					<div>
						<div className="flex justify-between mb-0  text-3xl">
							<span>{receiptData.record_code || '--'}</span>
						</div>
						<div className="flex justify-between mb-1 text-base">
							<span>{formatDate(receiptData.created_at)}</span>
						</div>
					</div>

					{sample.status === 1 && (
						<div className="flex justify-between text-6xl">
							<span>K</span>
						</div>
					)}
					<div className="flex items-center justify-center ml-0.5">
						<img src={logoSvg} alt="IRDOP Logo" className="h-11 object-contain" />
					</div>
				</div>

				<div className="flex justify-between mb-0.5 text-xl">
					<span>{sample.sample_uid}</span>
				</div>
			</div>
		</div>
	);

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
					receiptData.samples.map((sample, index) => (
						<div key={`${index}-container`} className="tag-pair">
							{/* Two identical tags side by side */}
							<SampleTag sample={sample} />
							<SampleTag sample={sample} />
						</div>
					))}
			</div>
		</div>
	);
};

export default PrintSampleTag;
