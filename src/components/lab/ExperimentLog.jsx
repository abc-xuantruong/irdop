import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import { FaFileAlt, FaEye, FaSearch, FaSync, FaClock, FaPrint, FaDatabase, FaUndo, FaTrash } from 'react-icons/fa';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../../contexts/GlobalContext';
import TinyMceInput from '../Input';

const ExperimentLog = () => {
	const { currentUser, getIdenByUid } = useContext(GlobalContext);

	// Utility functions
	const isAdmin = () => {
		return currentUser?.role?.staff_admin === true;
	};

	// Helper function to get identity name from document
	const getIdentityName = (doc) => {
		const possibleUIDs = [
			doc.metadata?.submittedByUID,
			doc.metadata?.identityUID,
			doc.metadata?.authorUID,
			doc.metadata?.createdByUID,
			doc.metadata?.modifiedByUID,
			doc.identityUID,
			doc.authorUID,
			doc.createdByUID,
			doc.modifiedByUID,
		];

		for (const uid of possibleUIDs) {
			if (uid && identityNames[uid]) {
				return identityNames[uid];
			}
		}

		const firstUID = possibleUIDs.find((uid) => uid);
		return firstUID || 'N/A';
	};

	// Fetch identity name by UID
	const fetchIdentityName = async (identityUID) => {
		if (!identityUID || identityNames[identityUID]) {
			return identityNames[identityUID] || identityUID;
		}

		try {
			console.log('Calling getIdenByUid for:', identityUID);
			const identity = await getIdenByUid(identityUID);
			console.log('getIdenByUid response:', identity);
			if (identity && identity.identity_name) {
				setIdentityNames((prev) => ({
					...prev,
					[identityUID]: identity.identity_name,
				}));
				console.log('Successfully cached identity name:', identity.identity_name);
				return identity.identity_name;
			}
		} catch (error) {
			console.error('Error fetching identity:', error);
		}

		return identityUID;
	};

	// States
	const [selectedDocumentForPreview, setSelectedDocumentForPreview] = useState(null);
	const [selectedDocument, setSelectedDocument] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [lastSearchTerm, setLastSearchTerm] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [mode, setMode] = useState('all');
	const [identityNames, setIdentityNames] = useState({});
	const [documents, setDocuments] = useState([]);
	const [documentStatus, setDocumentStatus] = useState('draft');
	const [isDraft, setIsDraft] = useState(true);
	const [pagination, setPagination] = useState({
		currentPage: 1,
		itemsPerPage: 10,
		totalItems: 0,
		totalPages: 1,
	});
	const [showDetailModal, setShowDetailModal] = useState(false);
	const [selectedDetailDocument, setSelectedDetailDocument] = useState(null);

	// Debounce timeout for search
	const [searchTimeout, setSearchTimeout] = useState(null);

	// API constants - sử dụng classifierCode cho nhật ký Thử nghiệm
	const DRAFT_DOCS_API_ENDPOINT = 'https://red.irdop.org/v1/editor/lab_result_report/get_editor';
	const PUBLISHED_DOCS_API_ENDPOINT = 'https://red.irdop.org/v1/document/get_doc';

	// Show auto-hide message function
	const showAutoHideMessage = (message, type = 'info') => {
		const existingMessage = document.getElementById('autoHideMessage');
		if (existingMessage) {
			existingMessage.remove();
		}

		const messageDiv = document.createElement('div');
		messageDiv.id = 'autoHideMessage';
		messageDiv.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 12px 20px;
			border-radius: 6px;
			color: white;
			font-weight: 500;
			z-index: 10000;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			opacity: 0;
			transform: translateX(100%);
			transition: all 0.3s ease;
		`;

		switch (type) {
			case 'success':
				messageDiv.style.background = '#10b981';
				break;
			case 'error':
				messageDiv.style.background = '#ef4444';
				break;
			case 'warning':
				messageDiv.style.background = '#f59e0b';
				break;
			default:
				messageDiv.style.background = '#3b82f6';
		}

		messageDiv.textContent = message;
		document.body.appendChild(messageDiv);

		setTimeout(() => {
			messageDiv.style.opacity = '1';
			messageDiv.style.transform = 'translateX(0)';
		}, 100);

		setTimeout(() => {
			messageDiv.style.opacity = '0';
			messageDiv.style.transform = 'translateX(100%)';
			setTimeout(() => {
				if (messageDiv.parentNode) {
					messageDiv.remove();
				}
			}, 300);
		}, 3000);
	};

	// API helper functions
	const apiPostLocal = async (url, body) => {
		try {
			const response = await apiPost(url, body);
			return {
				status: response.status,
				data: response.data,
			};
		} catch (error) {
			console.error('API Error:', error);
			throw error;
		}
	};

	// Format datetime to GMT+7
	const formatDateTimeGMT7 = (dateString) => {
		if (!dateString) return 'N/A';

		try {
			const date = new Date(dateString);
			const utc = date.getTime() + date.getTimezoneOffset() * 60000;
			const gmt7 = new Date(utc + 7 * 3600000);

			const hours = gmt7.getHours().toString().padStart(2, '0');
			const minutes = gmt7.getMinutes().toString().padStart(2, '0');
			const day = gmt7.getDate().toString().padStart(2, '0');
			const month = (gmt7.getMonth() + 1).toString().padStart(2, '0');
			const year = gmt7.getFullYear();

			return `${hours}:${minutes} ${day}/${month}/${year}`;
		} catch (error) {
			console.error('Error formatting date:', error);
			return 'N/A';
		}
	};

	// Load documents from API - chỉ load nhật ký Thử nghiệm
	const loadDocuments = async (searchTermToUse = '', page = 1, currentMode = mode, status = documentStatus) => {
		try {
			setIsLoading(true);

			console.log('📚 Loading experiment logs:', {
				searchTermToUse,
				page,
				currentMode,
				status,
			});

			const finalMode = isAdmin() ? currentMode : 'personal';

			let apiEndpoint, requestBody;

			if (status === 'published') {
				apiEndpoint = PUBLISHED_DOCS_API_ENDPOINT;
				requestBody = {
					searchTerm: searchTermToUse,
					page: page,
					mode: finalMode,
					sended: status,
					classifierCode: ['NHAT_KY_THU_NGHIEM'], // Chỉ lấy nhật ký Thử nghiệm
				};
			} else {
				apiEndpoint = DRAFT_DOCS_API_ENDPOINT;
				requestBody = {
					searchTerm: searchTermToUse,
					page: page,
					mode: finalMode,
					status: 'submitted',
					classifierCode: ['NHAT_KY_THU_NGHIEM'], // Chỉ lấy nhật ký Thử nghiệm
				};
			}

			const response = await apiPostLocal(apiEndpoint, requestBody);

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}

				const transformedDocuments = (result.result || []).map((doc) => ({
					id: doc.id,
					title: doc.metadata?.header?.title || doc.metadata?.templateName || 'Nhật ký Thử nghiệm không có tên',
					templateCode: doc.metadata?.templateId || 'N/A',
					lastModified: formatDateTimeGMT7(doc.modifiedAt),
					author: doc.metadata?.modifiedBy || doc.metadata?.authorName || 'N/A',
					status: status,
					createdAt: doc.createdAt,
					modifiedAt: doc.modifiedAt,
					authorName: doc.metadata?.authorName,
					modifiedBy: doc.metadata?.modifiedBy,
					metadata: doc.metadata || {},
					fileId: doc.fileId,
					originalData: doc,
				}));

				setDocuments(transformedDocuments);
				setLastSearchTerm(searchTermToUse);

				if (selectedDocument) {
					const foundDoc = transformedDocuments.find((doc) => doc.id === selectedDocument.id);
					if (foundDoc) {
						setSelectedDocument(foundDoc);
					} else {
						setSelectedDocument(null);
					}
				}

				if (selectedDocumentForPreview) {
					const foundPreviewDoc = transformedDocuments.find((doc) => doc.id === selectedDocumentForPreview.id);
					if (foundPreviewDoc) {
						const hasMetadataChanges =
							JSON.stringify(foundPreviewDoc.metadata) !== JSON.stringify(selectedDocumentForPreview.metadata) ||
							foundPreviewDoc.fileId !== selectedDocumentForPreview.fileId;
						if (hasMetadataChanges) {
							console.log('📝 Updating selectedDocumentForPreview due to metadata changes');
							setSelectedDocumentForPreview(foundPreviewDoc);
						}
					}
				}

				const uniqueUIDs = [
					...new Set(
						transformedDocuments
							.flatMap((doc) => [
								doc.metadata?.submittedByUID,
								doc.metadata?.identityUID,
								doc.metadata?.authorUID,
								doc.metadata?.createdByUID,
								doc.metadata?.modifiedByUID,
								doc.identityUID,
								doc.authorUID,
								doc.createdByUID,
								doc.modifiedByUID,
							])
							.filter((uid) => uid && !identityNames[uid]),
					),
				];

				if (uniqueUIDs.length > 0) {
					uniqueUIDs.forEach(async (uid) => {
						await fetchIdentityName(uid);
					});
				}

				setPagination({
					currentPage: page,
					itemsPerPage: result.pagination?.itemsPerPage || 10,
					totalItems: result.pagination?.totalItems || transformedDocuments.length,
					totalPages: result.pagination?.totalPages || Math.ceil(transformedDocuments.length / 10),
				});
			}
		} catch (error) {
			console.error('Error loading documents:', error);
			setDocuments([]);
		} finally {
			setIsLoading(false);
		}
	};

	// Load data on component mount
	useEffect(() => {
		const initialMode = isAdmin() ? mode : 'personal';
		if (initialMode !== mode) {
			setMode(initialMode);
		}

		loadDocuments('', 1, initialMode, documentStatus);
		console.log('Component mounted, loading documents with mode:', initialMode);

		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		};
	}, [currentUser]);

	useEffect(() => {
		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		};
	}, [searchTimeout]);

	// Keep isDraft in sync with documentStatus
	useEffect(() => {
		setIsDraft(documentStatus === 'draft');
	}, [documentStatus]);

	// Refresh data
	const refreshData = async () => {
		setIsLoading(true);
		try {
			await loadDocuments(lastSearchTerm, pagination.currentPage, mode, documentStatus);
		} catch (error) {
			console.error('Error refreshing data:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle document status change
	const handleDocumentStatusChange = async (newStatus) => {
		if (newStatus === documentStatus) return;

		setDocumentStatus(newStatus);
		setPagination((prev) => ({ ...prev, currentPage: 1 }));
		await loadDocuments(lastSearchTerm, 1, mode, newStatus);
	};

	// Handle toggle switch change
	const handleToggleChange = () => {
		const newIsDraft = !isDraft;
		setIsDraft(newIsDraft);
		const newStatus = newIsDraft ? 'draft' : 'published';
		handleDocumentStatusChange(newStatus);
	};

	// Handle mode change
	const handleModeChange = async (newMode) => {
		if (!isAdmin()) {
			return;
		}

		if (newMode === mode) return;

		setMode(newMode);
		setPagination((prev) => ({ ...prev, currentPage: 1 }));
		await loadDocuments(lastSearchTerm, 1, newMode, documentStatus);
	};

	// Handle search input changes
	const handleSearchInputChange = (value) => {
		setSearchTerm(value);

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		const timeout = setTimeout(() => {
			console.log('Search term stabilized:', value);
		}, 300);

		setSearchTimeout(timeout);
	};

	// Execute search
	const executeSearch = async () => {
		if (searchTerm !== lastSearchTerm) {
			console.log('🚀 Performing search with term:', searchTerm);
			await loadDocuments(searchTerm, 1, mode, documentStatus);
		}
	};

	// Search on Enter key
	const handleSearchKeyPress = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			executeSearch();
		}
	};

	// Handle document click for preview
	const handleDocumentClick = async (doc) => {
		console.log('🖱️ Document clicked:', doc.id);

		if (selectedDocument?.id !== doc?.id) {
			setSelectedDocument(doc);
		}

		if (selectedDocumentForPreview?.id !== doc?.id) {
			setSelectedDocumentForPreview(doc);
		}
	};

	// Handle document click for detail modal
	const handleDocumentClickForDetail = async (doc) => {
		console.log('🖱️ Document clicked for detail:', doc.id);
		setSelectedDetailDocument(doc);
		setShowDetailModal(true);
	};

	// ExtractedDataView Component - No longer used, replaced with modal
	const ExtractedDataView = ({ document }) => {
		return null;
	};

	// Generate smart pagination numbers
	const getSmartPaginationNumbers = (currentPage, totalPages) => {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const pages = [];
		pages.push(1);

		if (currentPage > 4) {
			pages.push('...');
		}

		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);

		for (let i = start; i <= end; i++) {
			if (!pages.includes(i)) {
				pages.push(i);
			}
		}

		if (currentPage < totalPages - 3) {
			pages.push('...');
		}

		if (!pages.includes(totalPages) && totalPages > 1) {
			pages.push(totalPages);
		}

		return pages;
	};

	// Page change handler
	const handlePageChange = async (newPage) => {
		setPagination((prev) => ({ ...prev, currentPage: newPage }));
		await loadDocuments(lastSearchTerm, newPage, mode, documentStatus);
	};

	// Detail Modal Component
	const DetailModal = ({ document, isOpen, onClose }) => {
		const [isEditing, setIsEditing] = useState(false);
		const [editedAnalyses, setEditedAnalyses] = useState([]);

		// Initialize edited analyses when document changes
		useEffect(() => {
			if (document?.metadata?.analyses) {
				setEditedAnalyses(JSON.parse(JSON.stringify(document.metadata.analyses)));
			}
		}, [document]);

		const handleEditToggle = () => {
			if (isEditing) {
				// Cancel editing - reset to original data
				setEditedAnalyses(JSON.parse(JSON.stringify(document.metadata.analyses || [])));
			}
			setIsEditing(!isEditing);
		};

		const handleSaveChanges = () => {
			// Here you would typically save the changes to the backend
			showAutoHideMessage('Đã lưu thay đổi thành công!', 'success');
			setIsEditing(false);
		};

		const handleAnalysisChange = (index, field, value) => {
			const updatedAnalyses = [...editedAnalyses];
			updatedAnalyses[index] = { ...updatedAnalyses[index], [field]: value };
			setEditedAnalyses(updatedAnalyses);
		};

		if (!isOpen || !document) return null;

		const analyses = isEditing ? editedAnalyses : document.metadata?.analyses || [];
		const samples = document.metadata?.samples || [];
		const sampleUIDs = samples.map((s) => s.sampleId);

		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
				<div className="bg-white rounded-lg shadow-xl max-w-full w-full mx-2 max-h-[95vh] overflow-hidden">
					<div className="flex items-center justify-between px-6 py-2 border-b">
						<h2 className="text-xl font-bold text-gray-900 text-left">
							{document.metadata?.header?.title || document.title} - Chi tiết nhật ký thử nghiệm
						</h2>
						<div className="flex items-center gap-2">
							{isEditing ? (
								<>
									<button
										onClick={handleSaveChanges}
										className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors"
									>
										Lưu
									</button>
									<button
										onClick={handleEditToggle}
										className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium transition-colors"
									>
										Hủy
									</button>
								</>
							) : (
								<button
									onClick={handleEditToggle}
									className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors"
								>
									Sửa
								</button>
							)}
							<button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl py-1 px-4">
								×
							</button>
						</div>
					</div>
					<div className="p-6 overflow-y-auto max-h-[calc(95vh-60px)]">
						<div className="mb-6">
							<h3 className="font-semibold text-gray-900 mb-4 text-left">Thông tin cơ bản</h3>
							<div className="grid grid-cols-3 gap-6 text-left">
								<div className="space-y-3 text-sm">
									<p>
										<strong>Mã:</strong> {document.id}
									</p>
									<p>
										<strong>Người tạo:</strong> {getIdentityName(document)}
									</p>
								</div>
								<div className="space-y-3 text-sm">
									<p>
										<strong>Cập nhật:</strong> {document.lastModified}
									</p>
									<p>
										<strong>Trạng thái:</strong> {document.status === 'draft' ? 'Chờ duyệt' : 'Đã phát hành'}
									</p>
								</div>
								<div className="space-y-3 text-sm">
									<p>
										<strong>Số lượng mẫu:</strong> {samples.length}
									</p>
									<p>
										<strong>Số lượng phân tích:</strong> {analyses.length}
									</p>
								</div>
							</div>
						</div>

						<div className="mb-6">
							<h3 className="font-semibold text-gray-900 mb-4 text-left">Danh sách Sample UIDs</h3>
							<div className="flex flex-wrap gap-2 justify-start">
								{sampleUIDs.map((uid, index) => (
									<span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm text-left">
										{uid}
									</span>
								))}
							</div>
						</div>

						<div>
							<div className="flex items-center justify-between mb-4">
								<h3 className="font-semibold text-gray-900 text-left">Danh sách phân tích</h3>
								{isEditing && (
									<span className="text-sm text-blue-600 font-medium">
										Đang chỉnh sửa - Nhấp vào các ô để sửa giá trị
									</span>
								)}
							</div>
							<div className="overflow-x-auto">
								<table className="w-full border-collapse border border-gray-300 text-left">
									<thead>
										<tr className="bg-gray-50">
											<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">STT</th>
											<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Mã mẫu</th>
											<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
												Mã chỉ tiêu
											</th>
											<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
												Tên chỉ tiêu
											</th>
											<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
												Kết quả
											</th>
											<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Đơn vị</th>
											<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
												Phương pháp
											</th>
										</tr>
									</thead>
									<tbody>
										{analyses.length === 0 ? (
											<tr>
												<td colSpan="7" className="border border-gray-300 px-3 py-4 text-left text-gray-500">
													Không có dữ liệu phân tích
												</td>
											</tr>
										) : (
											analyses.map((analysis, index) => (
												<tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
													<td className="border border-gray-300 px-3 py-2 text-left">{index + 1}</td>
													<td className="border border-gray-300 px-3 py-2 font-medium text-blue-600 text-left">
														{isEditing ? (
															<input
																type="text"
																value={analysis.sampleId || ''}
																onChange={(e) => handleAnalysisChange(index, 'sampleId', e.target.value)}
																className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
																placeholder="Nhập mã mẫu..."
															/>
														) : (
															analysis.sampleId || '--'
														)}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-left">{analysis.testId || '--'}</td>
													<td className="border border-gray-300 px-3 py-2 text-left">
														{isEditing ? (
															<input
																type="text"
																value={analysis.testName || ''}
																onChange={(e) => handleAnalysisChange(index, 'testName', e.target.value)}
																className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
																placeholder="Nhập tên chỉ tiêu..."
															/>
														) : (
															analysis.testName || '--'
														)}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-left">
														{isEditing ? (
															<input
																type="text"
																value={analysis.testResult || ''}
																onChange={(e) => handleAnalysisChange(index, 'testResult', e.target.value)}
																className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
																placeholder="Nhập kết quả..."
															/>
														) : (
															<span dangerouslySetInnerHTML={{ __html: analysis.testResult || '--' }} />
														)}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-left">
														{isEditing ? (
															<input
																type="text"
																value={analysis.testUnit || ''}
																onChange={(e) => handleAnalysisChange(index, 'testUnit', e.target.value)}
																className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
																placeholder="Nhập đơn vị..."
															/>
														) : (
															analysis.testUnit || '--'
														)}
													</td>
													<td className="border border-gray-300 px-3 py-2 text-left">
														{isEditing ? (
															<input
																type="text"
																value={analysis.testProtocolCode || ''}
																onChange={(e) => handleAnalysisChange(index, 'testProtocolCode', e.target.value)}
																className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
																placeholder="Nhập phương pháp..."
															/>
														) : (
															analysis.testProtocolCode || '--'
														)}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	};

	return (
		<>
			<style>
				{`
					/* Custom Scrollbar */
					.custom-scrollbar::-webkit-scrollbar {
						width: 6px;
					}
					.custom-scrollbar::-webkit-scrollbar-track {
						background: #f1f5f9;
						border-radius: 6px;
					}
					.custom-scrollbar::-webkit-scrollbar-thumb {
						background: #cbd5e1;
						border-radius: 6px;
					}
					.custom-scrollbar::-webkit-scrollbar-thumb:hover {
						background: #94a3b8;
					}
				`}
			</style>

			{/* Detail Modal */}
			<DetailModal
				document={selectedDetailDocument}
				isOpen={showDetailModal}
				onClose={() => setShowDetailModal(false)}
			/>

			<div className="w-full flex flex-col">
				{/* Header */}
				<div className="rounded-xl shadow-sm border p-6 mb-4 flex-shrink-0">
					<div className="flex items-center justify-between">
						<h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
							<FaClock className="text-blue-600" />
							Nhật ký Thử nghiệm
							{isLoading && (
								<div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
							)}
						</h2>

						{/* Document Status Toggle */}
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={isDraft}
								onChange={handleToggleChange}
								className="sr-only"
								disabled={isLoading}
							/>
							<div className="w-40 h-8 bg-gray-200 rounded-full transition-all duration-300 ease-in-out relative border border-gray-300 overflow-hidden">
								<div
									className={`absolute top-0 h-full w-1/2 bg-blue-500 rounded-full transition-all duration-300 ease-in-out
										${isDraft ? 'left-0' : 'left-1/2'}`}
								></div>
								<div className="absolute left-0 w-1/2 h-full flex items-center justify-center">
									<span
										className={`text-xs font-medium transition-all duration-300 ease-in-out
											${isDraft ? 'text-white' : 'text-gray-600'}`}
									>
										PENDING
									</span>
								</div>
								<div className="absolute right-0 w-1/2 h-full flex items-center justify-center">
									<span
										className={`text-xs font-medium transition-all duration-300 ease-in-out
											${!isDraft ? 'text-white' : 'text-gray-600'}`}
									>
										PUBLISHED
									</span>
								</div>
							</div>
						</label>
					</div>

					{/* Search and Pagination */}
					<div className="mt-4 flex items-center justify-between">
						{/* Pagination - Bên trái */}
						{pagination.totalPages > 1 && (
							<div className="flex items-center gap-1">
								<button
									onClick={() => handlePageChange(pagination.currentPage - 1)}
									disabled={pagination.currentPage === 1}
									className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Trước
								</button>
								{getSmartPaginationNumbers(pagination.currentPage, pagination.totalPages).map((page, index) => (
									<span key={index}>
										{page === '...' ? (
											<span className="px-2 py-1 text-sm text-gray-500">...</span>
										) : (
											<button
												onClick={() => handlePageChange(page)}
												className={`px-3 py-1 text-sm border rounded ${
													page === pagination.currentPage
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-gray-300 hover:bg-gray-50'
												}`}
											>
												{page}
											</button>
										)}
									</span>
								))}
								<button
									onClick={() => handlePageChange(pagination.currentPage + 1)}
									disabled={pagination.currentPage === pagination.totalPages}
									className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Sau
								</button>
							</div>
						)}

						{/* Search - Bên phải */}
						<div className="relative max-w-md">
							<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
							<input
								type="text"
								placeholder="Tìm nhật ký... (Nhấn Enter để tìm kiếm)"
								value={searchTerm}
								onChange={(e) => handleSearchInputChange(e.target.value)}
								onKeyPress={handleSearchKeyPress}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
							/>
						</div>
					</div>
				</div>

				{/* Grid Layout */}
				<div className="flex-1 overflow-auto custom-scrollbar">
					{isLoading ? (
						<div className="flex justify-center items-center h-64">
							<div className="text-gray-500">Đang tải...</div>
						</div>
					) : documents.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-64 text-gray-500">
							<FaFileAlt className="w-12 h-12 mb-4 text-gray-300" />
							<div className="text-lg font-medium mb-2">
								{documentStatus === 'published'
									? mode === 'personal'
										? 'Không có nhật ký đã phát hành cá nhân nào'
										: 'Không có nhật ký đã phát hành nào'
									: mode === 'personal'
									? 'Không có nhật ký chờ duyệt cá nhân nào'
									: 'Không có nhật ký chờ duyệt nào'}
							</div>
							<div className="text-sm">Nhấn Enter để tìm kiếm với từ khóa mới</div>
						</div>
					) : (
						<div className="grid grid-cols-5 gap-4 p-4">
							{/* Header Row */}
							<div className="col-span-5 grid grid-cols-5 gap-4 mb-4">
								<div className="p-3 text-left font-semibold text-gray-700">Mã & Thời gian</div>
								<div className="p-3 text-left font-semibold text-gray-700">Tiêu đề</div>
								<div className="p-3 text-left font-semibold text-gray-700">Số lượng Sample</div>
								<div className="p-3 text-left font-semibold text-gray-700">Số lượng Analyses</div>
								<div className="p-3 text-left font-semibold text-gray-700">Sample UIDs</div>
							</div>

							{/* Data Rows */}
							{documents.map((doc) => {
								const analyses = doc.metadata?.analyses || [];
								const samples = doc.metadata?.samples || [];
								const sampleUIDs = samples.map((s) => s.sampleId);

								return (
									<div
										key={doc.id}
										className="col-span-5 grid grid-cols-5 gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
										onClick={() => handleDocumentClickForDetail(doc)}
									>
										{/* Column 1: Mã & Thời gian */}
										<div className="flex flex-col items-start justify-start text-left">
											<div className="font-semibold text-blue-600 text-sm mb-1">{doc.id}</div>
											<div className="text-xs text-gray-500">{doc.lastModified}</div>
										</div>

										{/* Column 2: Tiêu đề */}
										<div className="flex items-start justify-start text-left">
											<span className="font-medium text-gray-900 text-sm leading-tight">
												{doc.metadata?.header?.title || doc.title}
											</span>
										</div>

										{/* Column 3: Số lượng Samples */}
										<div className="flex items-start justify-start text-left">
											<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
												{samples.length}
											</span>
										</div>

										{/* Column 4: Số lượng Analyses */}
										<div className="flex items-start justify-start text-left">
											<span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
												{analyses.length}
											</span>
										</div>

										{/* Column 5: Sample UIDs (tối đa 5) */}
										<div className="flex flex-wrap gap-1 justify-start items-start text-left">
											{sampleUIDs.slice(0, 5).map((uid, index) => (
												<span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
													{uid}
												</span>
											))}
											{sampleUIDs.length > 5 && (
												<span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs">
													+{sampleUIDs.length - 5}
												</span>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default ExperimentLog;
