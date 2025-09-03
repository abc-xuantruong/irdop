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

	// Debounce timeout for search
	const [searchTimeout, setSearchTimeout] = useState(null);

	// API constants - sử dụng classifierCode cho nhật ký thí nghiệm
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

	// Load documents from API - chỉ load nhật ký thí nghiệm
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
					classifierCode: ['NHAT_KY_THU_NGHIEM'], // Chỉ lấy nhật ký thí nghiệm
				};
			} else {
				apiEndpoint = DRAFT_DOCS_API_ENDPOINT;
				requestBody = {
					searchTerm: searchTermToUse,
					page: page,
					mode: finalMode,
					status: 'submitted',
					classifierCode: ['NHAT_KY_THU_NGHIEM'], // Chỉ lấy nhật ký thí nghiệm
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
					title: doc.metadata?.header?.title || doc.metadata?.templateName || 'Nhật ký thí nghiệm không có tên',
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

	// ExtractedDataView Component
	const ExtractedDataView = ({ document }) => {
		const [analyses, setAnalyses] = useState([]);
		const [isEditing, setIsEditing] = useState(false);
		const [isSaving, setIsSaving] = useState(false);
		const [editableCell, setEditableCell] = useState({ analysisId: null, column: null });
		const [inputValue, setInputValue] = useState('');

		// Initialize analyses from document metadata
		useEffect(() => {
			if (document && document.metadata) {
				const extractData = document.metadata.extractData || document.metadata;
				const initialAnalyses = extractData.analyses || [];
				setAnalyses(
					initialAnalyses.map((analysis, index) => ({
						id: index,
						testId: analysis.testId || '',
						sampleId: analysis.sampleId || '',
						testName: analysis.testName || '',
						testProtocolCode: analysis.testProtocolCode || '',
						testResult: analysis.testResult || '',
						testUnit: analysis.testUnit || '',
					})),
				);
			}
		}, [document]);

		if (!document || !document.metadata) {
			return (
				<div className="text-center text-gray-500 p-8">
					<p>Không có dữ liệu để hiển thị</p>
				</div>
			);
		}

		// Handle cell value change
		const handleCellChange = (rowIndex, field, value) => {
			const newAnalyses = [...analyses];
			newAnalyses[rowIndex] = {
				...newAnalyses[rowIndex],
				[field]: value,
			};
			setAnalyses(newAnalyses);
		};

		// Handle cell click with auto-save for previous cell
		const handleCellClickWithAutoSave = async (analysisId, column, currentValue) => {
			if (editableCell.analysisId && (editableCell.analysisId !== analysisId || editableCell.column !== column)) {
				try {
					// Auto-save previous cell if TinyMCE is active
					const activeEditor = window.tinymce?.activeEditor;
					if (activeEditor && editableCell.column === 'testResult') {
						const prevContent = activeEditor.getContent();
						handleCellChange(editableCell.analysisId, editableCell.column, prevContent);
					}
				} catch (e) {
					console.warn('Auto-save previous cell failed:', e);
				}
			}

			// Open new cell
			setEditableCell({ analysisId, column });
			setInputValue(currentValue || '');

			// Focus the new editor after a short delay
			setTimeout(() => {
				if (column === 'testResult') {
					const editor = document.querySelector(`[data-edit-id="${analysisId}-${column}"] .mce-content-body`);
					if (editor) editor.focus();
				} else {
					const input = document.querySelector(`input[data-field="${analysisId}-${column}"]`);
					if (input) input.focus();
				}
			}, 100);
		};

		// Handle save content for TinyMCE
		const handleSaveContent = (content, column, analysisId) => {
			handleCellChange(analysisId, column, content);
			// Close editing state for this specific cell
			setEditableCell((prev) => {
				if (prev.analysisId === analysisId && prev.column === column) {
					return { analysisId: null, column: null };
				}
				return prev;
			});
		};

		// Handle key down in TinyMCE
		const handleKeyDown = (e, content, column, analysisId) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				handleSaveContent(content, column, analysisId);
			} else if (e.key === 'Escape') {
				setEditableCell({ analysisId: null, column: null });
			}
		};

		// Add new row
		const addNewRow = () => {
			const newRow = {
				id: analyses.length,
				testId: '',
				sampleId: '',
				testName: '',
				testProtocolCode: '',
				testResult: '',
				testUnit: '',
			};
			setAnalyses([...analyses, newRow]);
		};

		// Remove row
		const removeRow = (rowIndex) => {
			if (analyses.length > 0) {
				const newAnalyses = analyses.filter((_, index) => index !== rowIndex);
				setAnalyses(newAnalyses);
			}
		};

		// Save changes to metadata
		const saveChanges = async () => {
			setIsSaving(true);
			try {
				// Auto-save current editing cell before saving
				if (editableCell.analysisId && editableCell.column === 'testResult') {
					const activeEditor = window.tinymce?.activeEditor;
					if (activeEditor) {
						const content = activeEditor.getContent();
						handleCellChange(editableCell.analysisId, editableCell.column, content);
					}
				}

				// Prepare the updated metadata
				const updatedMetadata = {
					...document.metadata,
					extractData: {
						...document.metadata.extractData,
						analyses: analyses.map((analysis) => ({
							testId: analysis.testId,
							sampleId: analysis.sampleId,
							testName: analysis.testName,
							testProtocolCode: analysis.testProtocolCode,
							testResult: analysis.testResult,
							testUnit: analysis.testUnit,
						})),
					},
				};

				// Call API to update document metadata
				const response = await apiPostLocal('https://red.irdop.org/v1/editor/lab_result_report/update_metadata', {
					documentId: document.id,
					metadata: updatedMetadata,
				});

				if (response.status === 200) {
					showAutoHideMessage('Đã lưu thay đổi thành công!', 'success');
					setIsEditing(false);
					setEditableCell({ analysisId: null, column: null });
					// Update the document in parent component if needed
					if (selectedDocumentForPreview) {
						setSelectedDocumentForPreview({
							...selectedDocumentForPreview,
							metadata: updatedMetadata,
						});
					}
				} else {
					throw new Error('Không thể lưu thay đổi');
				}
			} catch (error) {
				console.error('Error saving changes:', error);
				showAutoHideMessage('Lỗi khi lưu thay đổi: ' + error.message, 'error');
			} finally {
				setIsSaving(false);
			}
		};

		// Cancel editing
		const cancelEditing = () => {
			// Reset to original data
			const extractData = document.metadata.extractData || document.metadata;
			const originalAnalyses = extractData.analyses || [];
			setAnalyses(
				originalAnalyses.map((analysis, index) => ({
					id: index,
					testId: analysis.testId || '',
					sampleId: analysis.sampleId || '',
					testName: analysis.testName || '',
					testProtocolCode: analysis.testProtocolCode || '',
					testResult: analysis.testResult || '',
					testUnit: analysis.testUnit || '',
				})),
			);
			setIsEditing(false);
			setEditableCell({ analysisId: null, column: null });
		};

		// Restore row to original values
		const restoreRow = (index) => {
			// For now, we'll just reset to empty values
			// In a real application, you would store original values to restore
			const newAnalyses = [...analyses];
			newAnalyses[index] = {
				...newAnalyses[index],
				sampleId: '',
				testName: '',
				testProtocolCode: '',
				testResult: '',
				testUnit: '',
			};
			setAnalyses(newAnalyses);
		};

		// Render editable cell
		const renderEditableCell = (value, rowIndex, field, className = '') => {
			if (isEditing) {
				// Special handling for testResult field with TinyMCE
				if (field === 'testResult') {
					const isActive = editableCell.analysisId === rowIndex && editableCell.column === field;

					if (isActive) {
						return (
							<div className="table-cell-editor min-h-[40px]" data-edit-id={`${rowIndex}-${field}`}>
								<TinyMceInput
									value={value || ''}
									onUpdate={(content) => handleSaveContent(content, field, rowIndex)}
									onKey={(e, content) => handleKeyDown(e, content, field, rowIndex)}
								/>
							</div>
						);
					} else {
						return (
							<div
								className={`min-h-[40px] cursor-pointer hover:bg-blue-50 p-2 rounded border border-transparent hover:border-blue-300 ${className}`}
								onClick={() => handleCellClickWithAutoSave(rowIndex, field, value)}
								dangerouslySetInnerHTML={{
									__html: value || '<span class="text-gray-400 italic">Click để chỉnh sửa...</span>',
								}}
							/>
						);
					}
				}

				// Regular input for other fields
				return (
					<input
						type="text"
						value={value}
						onChange={(e) => handleCellChange(rowIndex, field, e.target.value)}
						data-field={`${rowIndex}-${field}`}
						className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white ${className}`}
					/>
				);
			}

			// Display mode - render HTML for testResult, plain text for others
			if (field === 'testResult') {
				return <div className={`min-h-[20px] ${className}`} dangerouslySetInnerHTML={{ __html: value || '--' }} />;
			}

			return <span className={className}>{value || '--'}</span>;
		};

		return (
			<div className="space-y-4">
				{/* Header with document info and controls */}
				<div className="border-b border-gray-200 pb-4">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-xl font-bold text-gray-900">{document.title}</h3>
						<div className="flex items-center gap-2">
							{!isEditing ? (
								<button
									onClick={() => setIsEditing(true)}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
								>
									✏️ Chỉnh sửa
								</button>
							) : (
								<>
									<button
										onClick={saveChanges}
										disabled={isSaving}
										className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
									>
										{isSaving ? '💾 Đang lưu...' : '💾 Lưu'}
									</button>
									<button
										onClick={cancelEditing}
										disabled={isSaving}
										className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
									>
										❌ Hủy
									</button>
								</>
							)}
						</div>
					</div>
					<div className="flex items-center gap-4 text-sm text-gray-600">
						<span>ID: {document.id}</span>
						<span>Người tạo: {getIdentityName(document)}</span>
						<span>Cập nhật: {document.lastModified}</span>
					</div>
				</div>

				{/* Analyses Table */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
							📊 Phân tích & Kết quả ({analyses.length})
						</h4>
						{isEditing && (
							<button
								onClick={addNewRow}
								className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
							>
								➕ Thêm hàng
							</button>
						)}
					</div>

					<div className="overflow-x-auto">
						<table className="w-full border-collapse border border-gray-300">
							<thead>
								<tr className="bg-gray-50">
									<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[50px]">
										STT
									</th>
									<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[100px]">
										Mã chỉ tiêu
									</th>
									<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[100px]">
										Mã mẫu
									</th>
									<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[150px]">
										Tên chỉ tiêu
									</th>
									<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[120px]">
										Phương pháp
									</th>
									<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[100px]">
										Kết quả
									</th>
									<th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[80px]">
										Đơn vị
									</th>
									{isEditing && (
										<th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 min-w-[80px]">
											Thao tác
										</th>
									)}
								</tr>
							</thead>
							<tbody>
								{analyses.length === 0 ? (
									<tr>
										<td
											colSpan={isEditing ? 8 : 7}
											className="border border-gray-300 px-3 py-8 text-center text-gray-500"
										>
											Không có dữ liệu phân tích
											{isEditing && (
												<div className="mt-2">
													<button
														onClick={addNewRow}
														className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
													>
														➕ Thêm hàng đầu tiên
													</button>
												</div>
											)}
										</td>
									</tr>
								) : (
									analyses.map((analysis, index) => (
										<tr key={analysis.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
											<td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
											<td className="border border-gray-300 px-3 py-2">
												{isEditing ? (
													<span className="font-medium text-red-600 bg-gray-100 px-2 py-1 rounded">
														{analysis.testId || '--'}
													</span>
												) : (
													<span className="font-medium text-red-600">{analysis.testId || '--'}</span>
												)}
											</td>
											<td className="border border-gray-300 px-3 py-2">
												{renderEditableCell(analysis.sampleId, index, 'sampleId', 'font-medium text-blue-600')}
											</td>
											<td className="border border-gray-300 px-3 py-2">
												{renderEditableCell(analysis.testName, index, 'testName')}
											</td>
											<td className="border border-gray-300 px-3 py-2">
												{renderEditableCell(analysis.testProtocolCode, index, 'testProtocolCode')}
											</td>
											<td className="border border-gray-300 px-3 py-2 align-top">
												{renderEditableCell(analysis.testResult, index, 'testResult', 'font-medium')}
											</td>
											<td className="border border-gray-300 px-3 py-2">
												{renderEditableCell(analysis.testUnit, index, 'testUnit')}
											</td>
											{isEditing && (
												<td className="border border-gray-300 px-3 py-2 text-center">
													<div className="flex justify-center space-x-1">
														<button
															onClick={() => restoreRow(index)}
															className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
															title="Khôi phục giá trị gốc"
														>
															<FaUndo size={14} />
														</button>
														<button
															onClick={() => removeRow(index)}
															className="p-1 text-red-600 hover:text-red-800 transition-colors"
															title="Xóa hàng"
														>
															<FaTrash size={14} />
														</button>
													</div>
												</td>
											)}
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{isEditing && analyses.length > 0 && (
						<div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
							<p>
								<strong>Hướng dẫn:</strong>
							</p>
							<ul className="list-disc list-inside mt-1 space-y-1">
								<li>Click vào ô để chỉnh sửa giá trị</li>
								<li>Sử dụng nút "➕ Thêm hàng" để thêm dòng mới</li>
								<li>Sử dụng nút "🗑️" để xóa dòng</li>
								<li>Nhấn "💾 Lưu" để lưu tất cả thay đổi vào metadata</li>
								<li>Nhấn "❌ Hủy" để bỏ qua các thay đổi</li>
							</ul>
						</div>
					)}
				</div>
			</div>
		);
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
					
					/* TinyMCE in table cells */
					.mce-content-body {
						min-height: 30px !important;
						padding: 4px !important;
						margin: 0 !important;
						font-size: 14px !important;
						line-height: 1.4 !important;
					}
					
					.mce-edit-focus {
						outline: 2px solid #3b82f6 !important;
						outline-offset: -2px !important;
						border-radius: 4px !important;
					}
					
					/* Ensure TinyMCE doesn't overflow table cells */
					.table-cell-editor {
						position: relative;
						z-index: 1;
					}
					
					.table-cell-editor .mce-tinymce {
						border: 1px solid #d1d5db !important;
						border-radius: 4px !important;
					}
				`}
			</style>

			<div className="w-full flex gap-6" style={{ height: 'calc(100vh - 140px)', minHeight: '600px' }}>
				{/* Cột trái: Danh sách nhật ký thí nghiệm (Sidebar) */}
				<div className="w-1/3 flex flex-col gap-4 h-full min-w-[400px]">
					<div className="bg-white rounded-xl shadow-sm border p-6 flex-1 flex flex-col min-h-0">
						<div className="flex items-center justify-between mb-4 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaClock className="text-blue-600" />
								{documentStatus === 'draft' ? 'Nhật ký chờ duyệt' : 'Nhật ký đã phát hành'}
								{isLoading && (
									<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
								)}
							</h3>

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

						<div className="flex-shrink-0">
							<div className="relative mb-3">
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

							{/* Pagination */}
							{pagination.totalPages > 1 && (
								<div className="flex items-center justify-center pb-2">
									<div className="flex items-center gap-1 flex-wrap justify-center">
										<button
											onClick={() => handlePageChange(pagination.currentPage - 1)}
											disabled={pagination.currentPage === 1}
											className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Trước
										</button>
										{getSmartPaginationNumbers(pagination.currentPage, pagination.totalPages).map((page, index) => (
											<span key={index}>
												{page === '...' ? (
													<span className="px-2 py-1 text-xs text-gray-500">...</span>
												) : (
													<button
														onClick={() => handlePageChange(page)}
														className={`px-2 py-1 text-xs border rounded ${
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
											className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Sau
										</button>
									</div>
								</div>
							)}
						</div>

						<div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
							{isLoading ? (
								<div className="flex justify-center items-center h-32">
									<div className="text-gray-500">Đang tải...</div>
								</div>
							) : documents.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-32 text-gray-500">
									<FaFileAlt className="w-8 h-8 mb-2 text-gray-300" />
									<div className="text-sm">
										{documentStatus === 'published'
											? mode === 'personal'
												? 'Không có nhật ký đã phát hành cá nhân nào'
												: 'Không có nhật ký đã phát hành nào'
											: mode === 'personal'
											? 'Không có nhật ký chờ duyệt cá nhân nào'
											: 'Không có nhật ký chờ duyệt nào'}
									</div>
									<div className="text-xs mt-1">Nhấn Enter để tìm kiếm với từ khóa mới</div>
								</div>
							) : (
								<div className="space-y-3">
									{documents.map((doc) => (
										<div
											key={doc.id}
											onClick={() => handleDocumentClick(doc)}
											className={`p-4 pb-3 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-green-300 ${
												selectedDocument?.id === doc.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
											}`}
										>
											<div className="relative">
												{/* Header info section */}
												<div className="flex items-center justify-between text-xs text-start mb-2">
													<div className="text-gray-600 px-2 py-1 rounded">Mã: {doc.id}</div>
													<div className="text-gray-500">{getIdentityName(doc)}</div>
													<div className="text-gray-500">{doc.lastModified}</div>
												</div>
												{/* Title Section */}
												<div className="flex items-center gap-2 mb-2">
													<FaFileAlt className="text-gray-500 flex-shrink-0" />
													<span className="font-medium text-gray-900 text-sm leading-tight text-start">
														{doc.metadata?.header?.title || doc.title}
													</span>
												</div>
												{/* Sample UIDs Section */}
												{doc.metadata?.sampleUIDs && doc.metadata.sampleUIDs.length > 0 && (
													<div className="mb-0">
														<div className="flex flex-wrap gap-1">
															{doc.metadata.sampleUIDs.slice(0, 5).map((uid, index) => (
																<span
																	key={index}
																	className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
																>
																	{uid}
																</span>
															))}
															{doc.metadata.sampleUIDs.length > 5 && (
																<span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
																	+{doc.metadata.sampleUIDs.length - 5}
																</span>
															)}
														</div>
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Cột phải: Dữ liệu trích xuất */}
				<div className="flex-1 flex flex-col h-full min-h-0" style={{ minWidth: '500px' }}>
					<div className="bg-white rounded-xl shadow-sm border h-full flex flex-col min-h-0">
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaDatabase className="text-purple-600" />
								Dữ liệu trích xuất
							</h3>
						</div>

						{/* Nội dung dữ liệu trích xuất */}
						<div className="flex-1 p-4 overflow-auto custom-scrollbar min-h-0">
							{selectedDocumentForPreview ? (
								<div className="bg-gray-50 rounded-lg p-4 h-full">
									<div className="bg-white rounded-lg shadow-sm h-full overflow-auto custom-scrollbar">
										<div
											className="w-full h-full p-4 bg-white overflow-auto custom-scrollbar text-start"
											style={{
												fontFamily: "'Arial', sans-serif",
												fontSize: '14px',
												lineHeight: '1.5',
											}}
										>
											{/* Hiển thị dữ liệu trích xuất */}
											<ExtractedDataView document={selectedDocumentForPreview} />
										</div>
									</div>
								</div>
							) : (
								<div className="flex items-center justify-center h-full text-gray-500">
									<div className="text-center">
										<FaDatabase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
										<p className="text-lg font-medium mb-2">Chưa chọn tài liệu</p>
										<p className="text-sm">
											Vui lòng chọn một tài liệu từ danh sách bên trái để xem dữ liệu trích xuất
										</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default ExperimentLog;
