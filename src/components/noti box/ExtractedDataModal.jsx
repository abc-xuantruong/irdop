import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const ExtractedDataModal = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [extractedDataList, setExtractedDataList] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [activeTab, setActiveTab] = useState('copyDetail'); // 'fileDetail' or 'copyDetail'
	const [sourceType, setSourceType] = useState('file'); // 'file' or 'protocol'

	useEffect(() => {
		// Listen for file data extracted event
		const handleFileDataExtracted = () => {
			const storedData = localStorage.getItem('extractedFileData');

			if (storedData) {
				try {
					const { data, timestamp } = JSON.parse(storedData);

					// Check if data is fresh (less than 5 seconds old)
					if (Date.now() - timestamp < 5000) {
						setExtractedDataList(data);
						setCurrentIndex(0);
						setActiveTab('copyDetail');
						setSourceType('file');
						setIsOpen(true);
						// Clear localStorage after reading
						localStorage.removeItem('extractedFileData');
					} else {
					}
				} catch (error) {
					console.error('❌ ExtractedDataModal: Error parsing extracted file data:', error);
				}
			} else {
			}
		};

		// Listen for protocol data extracted event
		const handleProtocolDataExtracted = () => {
			const storedData = localStorage.getItem('extractedProtocolData');

			if (storedData) {
				try {
					const { data, timestamp } = JSON.parse(storedData);

					// Check if data is fresh (less than 5 seconds old)
					if (Date.now() - timestamp < 5000) {
						setExtractedDataList(data);
						setCurrentIndex(0);
						setActiveTab('protocol');
						setSourceType('protocol');
						setIsOpen(true);
						// Clear localStorage after reading
						localStorage.removeItem('extractedProtocolData');
					} else {
					}
				} catch (error) {
					console.error('❌ ExtractedDataModal: Error parsing extracted protocol data:', error);
				}
			} else {
			}
		};

		window.addEventListener('fileDataExtracted', handleFileDataExtracted);
		window.addEventListener('protocolDataExtracted', handleProtocolDataExtracted);

		// Check on mount in case there's already data
		handleFileDataExtracted();
		handleProtocolDataExtracted();

		// Cleanup
		return () => {
			window.removeEventListener('fileDataExtracted', handleFileDataExtracted);
			window.removeEventListener('protocolDataExtracted', handleProtocolDataExtracted);
		};
	}, []);

	const handleClose = () => {
		setIsOpen(false);
		setExtractedDataList([]);
		setCurrentIndex(0);
	};

	const handleNext = () => {
		if (currentIndex < extractedDataList.length - 1) {
			setCurrentIndex(currentIndex + 1);
		}
	};

	const handlePrevious = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
		}
	};

	if (!isOpen || extractedDataList.length === 0) {
		return null;
	}

	const currentData = extractedDataList[currentIndex];

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
			<div className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center">
					<div className="text-left">
						<h2 className="text-xl font-bold">Dữ liệu trích xuất</h2>
						<p className="text-sm opacity-90">
							{sourceType === 'file' ? currentData?.fileName : 'Protocol'} ({currentIndex + 1}/
							{extractedDataList.length})
						</p>
					</div>
					<button
						onClick={handleClose}
						className="text-white hover:text-gray-200 text-3xl font-bold leading-none"
						title="Đóng"
					>
						&times;
					</button>
				</div>

				{/* Tabs */}
				{sourceType === 'file' && (
					<div className="border-b border-gray-200 bg-gray-50">
						<div className="flex gap-2 px-6">
							<button
								onClick={() => setActiveTab('fileDetail')}
								className={`px-4 py-3 font-medium transition-colors border-b-2 text-left ${
									activeTab === 'fileDetail'
										? 'border-blue-500 text-blue-600 bg-white'
										: 'border-transparent text-gray-600 hover:text-gray-800'
								}`}
							>
								File Detail
							</button>
							<button
								onClick={() => setActiveTab('copyDetail')}
								className={`px-4 py-3 font-medium transition-colors border-b-2 text-left ${
									activeTab === 'copyDetail'
										? 'border-blue-500 text-blue-600 bg-white'
										: 'border-transparent text-gray-600 hover:text-gray-800'
								}`}
							>
								Copy Detail
							</button>
						</div>
					</div>
				)}

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					{sourceType === 'file' && currentData?.data && currentData.data.length > 0 ? (
						<div className="space-y-6">
							{currentData.data.map((item, idx) => (
								<div key={idx} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
									<h3 className="font-bold text-lg mb-4 text-blue-600 text-left">Document {idx + 1}</h3>

									{/* File Detail Tab */}
									{activeTab === 'fileDetail' && item.fileRecord && (
										<div className="space-y-4">
											<div className="bg-white p-4 rounded border border-gray-200">
												<h4 className="font-semibold mb-3 text-left">File Information</h4>
												<div className="grid grid-cols-2 gap-3 text-sm">
													<div className="text-left">
														<span className="font-medium">File ID:</span>
														<p className="text-gray-700">{item.fileRecord.id || '--'}</p>
													</div>
													<div className="text-left">
														<span className="font-medium">Created At:</span>
														<p className="text-gray-700">
															{item.fileRecord.createdAt
																? new Date(item.fileRecord.createdAt).toLocaleString('vi-VN')
																: '--'}
														</p>
													</div>
													<div className="text-left">
														<span className="font-medium">File Name:</span>
														<p className="text-gray-700">{item.fileRecord.originInfo?.fileName || '--'}</p>
													</div>
													<div className="text-left">
														<span className="font-medium">File Size:</span>
														<p className="text-gray-700">
															{item.fileRecord.originInfo?.fileSize
																? `${(item.fileRecord.originInfo.fileSize / 1024).toFixed(2)} KB`
																: '--'}
														</p>
													</div>
													<div className="text-left">
														<span className="font-medium">MIME Type:</span>
														<p className="text-gray-700">{item.fileRecord.originInfo?.mimeType || '--'}</p>
													</div>
													<div className="text-left">
														<span className="font-medium">Object Status:</span>
														<p className="text-gray-700">{item.fileRecord.objectStatus || '--'}</p>
													</div>
												</div>

												{/* Foreign Keys */}
												{item.fileRecord.foreignKeyUIDs && item.fileRecord.foreignKeyUIDs.length > 0 && (
													<div className="mt-4 text-left">
														<span className="font-medium">Foreign Keys:</span>
														<div className="flex flex-wrap gap-2 mt-2">
															{item.fileRecord.foreignKeyUIDs.map((key, keyIdx) => (
																<span key={keyIdx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
																	{key}
																</span>
															))}
														</div>
													</div>
												)}

												{/* User Tags */}
												{item.fileRecord.userTags && item.fileRecord.userTags.length > 0 && (
													<div className="mt-4 text-left">
														<span className="font-medium">User Tags:</span>
														<div className="flex flex-wrap gap-2 mt-2">
															{item.fileRecord.userTags.map((tag, tagIdx) => (
																<span key={tagIdx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
																	{tag}
																</span>
															))}
														</div>
													</div>
												)}

												{/* System Tags */}
												{item.fileRecord.systemTags && item.fileRecord.systemTags.length > 0 && (
													<div className="mt-4 text-left">
														<span className="font-medium">System Tags:</span>
														<div className="flex flex-wrap gap-2 mt-2">
															{item.fileRecord.systemTags.map((tag, tagIdx) => (
																<span key={tagIdx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
																	{tag}
																</span>
															))}
														</div>
													</div>
												)}
											</div>
										</div>
									)}

									{/* Copy Detail Tab - DocCopy JSON Content */}
									{activeTab === 'copyDetail' && item.docCopy?.jsonContent && (
										<div className="space-y-4">
											<div className="grid grid-cols-2 gap-4 text-left">
												<div>
													<span className="font-semibold">Ref Number:</span>{' '}
													{item.docCopy.jsonContent.refNumber || '--'}
												</div>
												<div>
													<span className="font-semibold">Date:</span> {item.docCopy.jsonContent.date || '--'}
												</div>
											</div>

											{/* Client Info */}
											{item.docCopy.jsonContent.client && (
												<div className="bg-white p-3 rounded border border-gray-200 text-left">
													<h4 className="font-semibold mb-2">Client:</h4>
													<p>{item.docCopy.jsonContent.client.name}</p>
													<p className="text-sm text-gray-600">{item.docCopy.jsonContent.client.address}</p>
												</div>
											)}

											{/* Sample Info */}
											{item.docCopy.jsonContent.sample && (
												<div className="bg-white p-3 rounded border border-gray-200 text-left">
													<h4 className="font-semibold mb-2">Sample Information:</h4>
													{item.docCopy.jsonContent.sample.map((field, fieldIdx) => (
														<div key={fieldIdx} className="flex gap-2 text-sm py-1 text-left">
															<span className="font-medium min-w-[200px]">{field.fName}</span>
															<span>{field.fValue}</span>
														</div>
													))}
												</div>
											)}

											{/* Test Results */}
											{item.docCopy.jsonContent.testResults && (
												<div className="bg-white p-3 rounded border border-gray-200 text-left">
													<h4 className="font-semibold mb-2">Test Results:</h4>
													<div className="overflow-x-auto">
														<table className="w-full text-sm border-collapse">
															<thead className="bg-gray-100">
																<tr>
																	<th className="border border-gray-300 px-2 py-1 text-left">Parameter</th>
																	<th className="border border-gray-300 px-2 py-1 text-left">Protocol</th>
																	<th className="border border-gray-300 px-2 py-1 text-left">Result</th>
																	<th className="border border-gray-300 px-2 py-1 text-left">Unit</th>
																	<th className="border border-gray-300 px-2 py-1 text-left">Accreditation</th>
																</tr>
															</thead>
															<tbody>
																{item.docCopy.jsonContent.testResults.map((result, resultIdx) => (
																	<tr key={resultIdx} className="hover:bg-gray-50">
																		<td className="border border-gray-300 px-2 py-1 text-left">
																			{result.parameterName}
																		</td>
																		<td className="border border-gray-300 px-2 py-1 text-left">
																			{result.protocolCode}
																		</td>
																		<td className="border border-gray-300 px-2 py-1 text-left">{result.resultValue}</td>
																		<td className="border border-gray-300 px-2 py-1 text-left">{result.resultUnit}</td>
																		<td className="border border-gray-300 px-2 py-1 text-left">
																			{result.accreditation}
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>
												</div>
											)}

											{/* Notes */}
											{item.docCopy.jsonContent.notes && (
												<div className="bg-white p-3 rounded border border-gray-200 text-left">
													<h4 className="font-semibold mb-2">Notes:</h4>
													<p className="text-sm whitespace-pre-wrap text-left">{item.docCopy.jsonContent.notes}</p>
												</div>
											)}
										</div>
									)}
								</div>
							))}
						</div>
					) : sourceType === 'protocol' ? (
						<div className="space-y-4">
							<pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
								{JSON.stringify(currentData, null, 2)}
							</pre>
						</div>
					) : (
						<div className="text-center text-gray-500 py-8">Không có dữ liệu để hiển thị</div>
					)}
				</div>

				{/* Footer - Navigation */}
				{extractedDataList.length > 1 && (
					<div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50">
						<button
							onClick={handlePrevious}
							disabled={currentIndex === 0}
							className={`px-4 py-2 rounded-lg font-medium transition ${
								currentIndex === 0
									? 'bg-gray-200 text-gray-400 cursor-not-allowed'
									: 'bg-blue-500 text-white hover:bg-blue-600'
							}`}
						>
							← Previous
						</button>
						<span className="text-sm text-gray-600">
							{currentIndex + 1} / {extractedDataList.length}
						</span>
						<button
							onClick={handleNext}
							disabled={currentIndex === extractedDataList.length - 1}
							className={`px-4 py-2 rounded-lg font-medium transition ${
								currentIndex === extractedDataList.length - 1
									? 'bg-gray-200 text-gray-400 cursor-not-allowed'
									: 'bg-blue-500 text-white hover:bg-blue-600'
							}`}
						>
							Next →
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default ExtractedDataModal;
