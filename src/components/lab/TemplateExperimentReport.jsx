import React, { useState, useRef, useEffect } from 'react';
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react';
import {
	FaFileAlt,
	FaEdit,
	FaEye,
	FaTimes,
	FaSave,
	FaEraser,
	FaSquare,
	FaCheckCircle,
	FaExclamationTriangle,
	FaInfoCircle,
	FaTimesCircle,
	FaArrowLeft,
	FaTable,
	FaChevronLeft,
	FaChevronRight,
	FaSearch,
} from 'react-icons/fa';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ id, children, index, startEditColumn, removeColumn }) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<tr
			ref={setNodeRef}
			style={style}
			className={`${index < 3 ? 'bg-blue-50' : 'hover:bg-gray-50'} ${isDragging ? 'shadow-lg' : ''}`}
		>
			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
				{index >= 3 && (
					<div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mr-2 inline-block">
						⋮⋮
					</div>
				)}
				{index + 1}
			</td>
			<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{children.columnName}</td>
			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
				{children.objectKey || <span className="text-gray-400">(trống)</span>}
			</td>
			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{children.width}%</td>
			<td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
				<div className="flex gap-2">
					{index >= 3 && (
						<>
							<button
								onClick={() => startEditColumn(index)}
								className="text-blue-600 hover:text-blue-900 p-1 transition-colors"
								title="Chỉnh sửa cột"
							>
								<FaEdit className="w-4 h-4" />
							</button>
							<button
								onClick={() => removeColumn(index)}
								className="text-red-600 hover:text-red-900 p-1 transition-colors"
								title="Xóa cột"
							>
								<FaTimes className="w-4 h-4" />
							</button>
						</>
					)}
					{index < 3 && <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">Mặc định</span>}
				</div>
			</td>
		</tr>
	);
};

const TemplateExperimentReport = ({
	templateId = null,
	action = 'create',
	parameters = [],
	onClose = null,
	...otherProps
}) => {
	const [selectedTemplate, setSelectedTemplate] = useState(null);
	const [previewContent, setPreviewContent] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Toast notification state
	const [toasts, setToasts] = useState([]);

	// Parameters management state
	const [templateParameters, setTemplateParameters] = useState(parameters || []);
	const [newParameter, setNewParameter] = useState({ parameterName: '', protocolCode: '' });

	// Autocomplete state for parameters
	const [parameterAutocomplete, setParameterAutocomplete] = useState({
		isOpen: false,
		loading: false,
		results: [],
		pagination: null,
		searchTerm: '',
		currentPage: 1,
		focusedInput: null, // 'parameterName' or 'protocolCode'
	});
	const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0, width: 0 });
	const parameterNameInputRef = useRef(null);
	const protocolCodeInputRef = useRef(null);

	// Columns management state
	const [templateColumns, setTemplateColumns] = useState([
		{ objectKey: 'auto', columnName: 'TT', width: 4 },
		{ objectKey: 'sampleId', columnName: 'Mã mẫu thử', width: 10 },
		{ objectKey: 'id', columnName: 'Mã phép thử', width: 10 },
	]);
	const [newColumn, setNewColumn] = useState({ objectKey: '', columnName: '' });
	const [editingColumnIndex, setEditingColumnIndex] = useState(null);

	// Column resize state
	const [resizingIndex, setResizingIndex] = useState(null);
	const initialX = useRef(0);
	const initialWidths = useRef([]);

	// Template creation/editing state
	const [showTemplateEditor, setShowTemplateEditor] = useState(false);
	const [editingTemplate, setEditingTemplate] = useState(null);
	const [templateForm, setTemplateForm] = useState({
		name: '',
		description: '',
		classifierCode: 'NHAT_KY_THU_NGHIEM', // Default for experiment log
		headerData: {
			title: '',
			code: '',
			publishNo: '',
			publishDate: '',
		},
		content: '',
		columns: [],
		customRows: [],
		parameters: [],
	});

	// Editor ref for template content
	const templateEditorRef = useRef(null);

	// Custom rows state
	const [hasCustomRows, setHasCustomRows] = useState(false);
	const [customRowsContent, setCustomRowsContent] = useState('');
	const customRowsEditorRef = useRef(null);

	// Icon picker state
	const [showIconPicker, setShowIconPicker] = useState(false);

	// Dnd sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// Handle drag end for column reordering
	const handleDragEnd = (event) => {
		const { active, over } = event;

		if (active.id !== over.id) {
			const oldIndex = templateColumns.findIndex((col, index) => `${col.objectKey}_${index}` === active.id);
			const newIndex = templateColumns.findIndex((col, index) => `${col.objectKey}_${index}` === over.id);

			// Only allow reordering custom columns (index >= 3)
			if (oldIndex >= 3 && newIndex >= 3) {
				const reorderedColumns = arrayMove(templateColumns, oldIndex, newIndex);
				setTemplateColumns(reorderedColumns);
			}
		}
	};

	// Determine final action based on props
	const finalAction = React.useMemo(() => {
		// If editing template exists, force edit action
		if (editingTemplate) {
			return 'edit';
		}
		// If no templateId provided, force create action
		if (!templateId && (action === 'view' || action === 'edit')) {
			return 'create';
		}
		return action;
	}, [templateId, action, editingTemplate]);

	// API helper functions (from DocumentEditor.jsx)
	const getCookie = (name) => {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(';').shift();
		return '';
	};

	const apiPost = async (url, body) => {
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${getCookie('auth')}`,
					'x-fh-app-uid': 'LIMS-IRDOP-PRD',
					'x-fh-access-key': 'lELlAk8o5fmUgvJRYhvf',
				},
				body: JSON.stringify(body),
			});

			const contentType = response.headers.get('content-type');
			let data;

			if (contentType && contentType.includes('application/json')) {
				data = await response.json();
			} else {
				data = await response.text();
			}

			return {
				status: response.status,
				data: data,
			};
		} catch (error) {
			console.error('API Error:', error);
			throw error;
		}
	};

	// Toast notification function
	const showToast = (message, type = 'info', duration = 3000) => {
		const id = Date.now() + Math.random();
		const toast = {
			id,
			message,
			type, // 'success', 'error', 'warning', 'info'
			duration,
		};

		setToasts((prev) => [...prev, toast]);

		// Auto remove toast after duration
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, duration);
	};

	// Parameters management functions
	const addParameter = () => {
		if (newParameter.parameterName.trim() && newParameter.protocolCode.trim()) {
			setTemplateParameters([...templateParameters, { ...newParameter }]);
			setNewParameter({ parameterName: '', protocolCode: '' });
			closeParameterAutocomplete();
		}
	};

	// Search parameters API
	const searchParameters = async (searchTerm, page = 1) => {
		if (!searchTerm.trim()) {
			setParameterAutocomplete((prev) => ({ ...prev, isOpen: false }));
			return;
		}

		try {
			setParameterAutocomplete((prev) => ({ ...prev, loading: true }));

			const response = await apiPost('https://black.irdop.org/v1/parameter/get', {
				searchTerm: searchTerm,
				itemsPerPage: 20,
				page: page,
			});

			console.log('Parameter search response:', response); // Debug log

			if (response.status === 200 && response.data) {
				const results = response.data.result || [];
				console.log('Parameter search results:', results); // Debug log

				setParameterAutocomplete((prev) => ({
					...prev,
					loading: false,
					results: results,
					pagination: response.data.pagination,
					currentPage: page,
					isOpen: results.length > 0, // Only show dropdown if there are results
				}));
			} else {
				console.log('Parameter search failed:', response); // Debug log
				setParameterAutocomplete((prev) => ({
					...prev,
					loading: false,
					results: [],
					pagination: null,
					isOpen: false,
				}));
			}
		} catch (error) {
			console.error('Error searching parameters:', error);
			setParameterAutocomplete((prev) => ({
				...prev,
				loading: false,
				results: [],
				pagination: null,
				isOpen: false,
			}));
		}
	};

	// Handle parameter input changes and search
	const handleParameterInputChange = (field, value) => {
		setNewParameter((prev) => ({ ...prev, [field]: value }));

		if (value.trim().length >= 2) {
			setParameterAutocomplete((prev) => ({
				...prev,
				searchTerm: value,
				focusedInput: field,
				isOpen: true,
				currentPage: 1,
			}));

			// Position the dropdown with better calculation
			const inputRef = field === 'parameterName' ? parameterNameInputRef : protocolCodeInputRef;
			if (inputRef.current) {
				const rect = inputRef.current.getBoundingClientRect();
				const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
				const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

				setAutocompletePosition({
					top: rect.bottom + scrollTop + 2, // Add small offset
					left: rect.left + scrollLeft,
					width: rect.width,
				});
			}

			searchParameters(value, 1);
		} else {
			closeParameterAutocomplete();
		}
	};

	// Handle parameter input key events
	const handleParameterInputKeyDown = (field, e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			const value = e.target.value.trim();
			if (value.length >= 2) {
				handleParameterInputChange(field, value);
			}
		} else if (e.key === 'Escape') {
			closeParameterAutocomplete();
		} else if (e.key === 'ArrowDown' && parameterAutocomplete.results.length > 0) {
			// Allow navigation with arrow keys
			e.preventDefault();
			const firstResult = document.querySelector('[data-parameter-result="0"]');
			if (firstResult) {
				firstResult.focus();
			}
		}
	};

	// Select parameter from autocomplete
	const selectParameter = (parameter) => {
		setNewParameter({
			parameterName: parameter.parameterName,
			protocolCode: parameter.protocolCode,
		});
		closeParameterAutocomplete();

		// Focus the add button or next input
		setTimeout(() => {
			const addButton = document.querySelector('[data-add-parameter-button]');
			if (addButton) {
				addButton.focus();
			}
		}, 100);
	};

	// Close autocomplete
	const closeParameterAutocomplete = () => {
		setParameterAutocomplete((prev) => ({
			...prev,
			isOpen: false,
			loading: false,
			results: [],
			pagination: null,
			searchTerm: '',
			focusedInput: null,
		}));
		setAutocompletePosition({ top: 0, left: 0, width: 0 });
	};

	// Handle pagination in autocomplete
	const handleAutocompletePage = (page) => {
		if (parameterAutocomplete.searchTerm) {
			searchParameters(parameterAutocomplete.searchTerm, page);
		}
	};

	// Close autocomplete when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (parameterAutocomplete.isOpen) {
				const isClickInsideAutocomplete = event.target.closest('[data-parameter-autocomplete]');
				const isClickInsideInput =
					event.target === parameterNameInputRef.current || event.target === protocolCodeInputRef.current;

				if (!isClickInsideAutocomplete && !isClickInsideInput) {
					closeParameterAutocomplete();
				}
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [parameterAutocomplete.isOpen]);

	const removeParameter = (index) => {
		const newParameters = templateParameters.filter((_, i) => i !== index);
		setTemplateParameters(newParameters);
	};

	const updateParameter = (index, field, value) => {
		const newParameters = [...templateParameters];
		newParameters[index] = { ...newParameters[index], [field]: value };
		setTemplateParameters(newParameters);
	};

	// Columns management functions
	const recalculateColumnWidths = (columns) => {
		if (columns.length <= 3) return columns;

		// Reserve space for default columns (4% + 9% + 8% = 21%)
		const availableWidth = 100 - 21; // 79% available for custom columns
		const customColumnsCount = columns.length - 3;

		// Calculate width per custom column (round to nearest integer)
		const widthPerColumn = Math.round(availableWidth / customColumnsCount);

		// Update width for all custom columns
		const updatedColumns = [...columns];
		for (let i = 3; i < updatedColumns.length; i++) {
			updatedColumns[i] = { ...updatedColumns[i], width: widthPerColumn };
		}

		return updatedColumns;
	};

	const addColumn = () => {
		if (newColumn.columnName.trim()) {
			// Allow empty objectKey, auto-calculate width for custom columns
			const newColumns = [...templateColumns, { ...newColumn }];
			const updatedColumns = recalculateColumnWidths(newColumns);

			setTemplateColumns(updatedColumns);
			setNewColumn({ objectKey: '', columnName: '' });
		}
	};

	const removeColumn = (index) => {
		// Don't allow removing the first 3 default columns
		if (index >= 3) {
			const newColumns = templateColumns.filter((_, i) => i !== index);
			const updatedColumns = recalculateColumnWidths(newColumns);

			setTemplateColumns(updatedColumns);
		}
	};

	// Column resize functions
	const startResize = (e, columnIndex) => {
		// Don't allow resizing the first 3 default columns
		if (columnIndex < 3) return;

		e.preventDefault();
		setResizingIndex(columnIndex);
		initialX.current = e.clientX;
		initialWidths.current = templateColumns.map((col) => col.width);
	};

	const handleResize = (e) => {
		if (resizingIndex === null) return;

		const deltaX = e.clientX - initialX.current;
		const containerWidth = 800; // Approximate container width in pixels
		const deltaPercent = (deltaX / containerWidth) * 100;

		const newColumns = [...templateColumns];
		const currentWidth = initialWidths.current[resizingIndex] + deltaPercent;
		const nextWidth = initialWidths.current[resizingIndex + 1] - deltaPercent;

		// Ensure minimum width of 5% for both columns
		if (currentWidth > 5 && nextWidth > 5 && currentWidth < 50 && nextWidth < 50) {
			newColumns[resizingIndex].width = Math.round(currentWidth);
			newColumns[resizingIndex + 1].width = Math.round(nextWidth);
			setTemplateColumns(newColumns);
		}
	};

	const stopResize = () => {
		setResizingIndex(null);
	};

	// Cleanup event listeners on unmount
	useEffect(() => {
		if (resizingIndex !== null) {
			document.addEventListener('mousemove', handleResize);
			document.addEventListener('mouseup', stopResize);
		}

		return () => {
			document.removeEventListener('mousemove', handleResize);
			document.removeEventListener('mouseup', stopResize);
		};
	}, [resizingIndex]);

	const startEditColumn = (index) => {
		// Don't allow editing the first 3 default columns
		if (index >= 3) {
			setEditingColumnIndex(index);
			setNewColumn({ ...templateColumns[index] });
		}
	};

	const saveEditColumn = () => {
		if (editingColumnIndex !== null && newColumn.columnName.trim()) {
			const newColumns = [...templateColumns];
			newColumns[editingColumnIndex] = { ...newColumn };
			setTemplateColumns(newColumns);
			setEditingColumnIndex(null);
			setNewColumn({ objectKey: '', columnName: '' });
		}
	};

	const cancelEditColumn = () => {
		setEditingColumnIndex(null);
		setNewColumn({ objectKey: '', columnName: '' });
	};

	// Generate custom rows table based on current column configuration
	const generateCustomRowsTable = () => {
		// Create the basic table structure for custom rows (only tbody with empty td cells)
		let tableHTML = `
			<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
				<tbody>
					<tr>
						${templateColumns.map((col) => `<td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>`).join('')}
					</tr>
				</tbody>
			</table>
		`;

		return tableHTML;
	};

	// Insert sample result table into editor
	const insertSampleResultTable = () => {
		if (!templateEditorRef.current) return;

		// Create the basic table structure
		let tableHTML = `
			<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
				<thead>
					<tr style="background-color: #f5f5f5;">
						${templateColumns
							.map(
								(col) =>
									`<th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: ${col.width}%; font-weight: bold;">${col.columnName}</th>`,
							)
							.join('')}
					</tr>
				</thead>
				<tbody>
					<tr>
						${templateColumns
							.map(
								(col, index) =>
									`<td style="border: 1px solid #ddd; padding: 8px;">${
										col.objectKey === 'auto' ? (index === 0 ? '1' : col.objectKey) : col.objectKey || col.columnName
									}</td>`,
							)
							.join('')}
					</tr>`;

		// Add custom rows if they exist
		if (hasCustomRows && customRowsContent) {
			try {
				// Extract table rows from custom rows content using regex
				const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
				const customRows = customRowsContent.match(rowRegex);

				if (customRows && customRows.length > 0) {
					customRows.forEach((row) => {
						// Clean up the row content - keep as-is, don't modify cell count
						let cleanedRow = row
							.replace(/<thead[^>]*>[\s\S]*?<\/thead>/gi, '')
							.replace(/<tbody[^>]*>/gi, '')
							.replace(/<\/tbody>/gi, '');

						// Insert each row exactly as it is (preserve colspan and cell structure)
						tableHTML += cleanedRow;
					});
				}
			} catch (error) {
				console.error('Error processing custom rows:', error);
				showToast('Lỗi khi xử lý hàng tùy chỉnh', 'error');
			}
		}

		tableHTML += `
				</tbody>
			</table>
		`;

		templateEditorRef.current.insertContent(tableHTML);
		showToast('Đã chèn mẫu kết quả vào nội dung', 'success');
	};

	// Load template by ID
	const loadTemplateById = async (templateId) => {
		try {
			setIsLoading(true);
			const response = await apiPost('https://black.irdop.org/v2/lab/test_report/get_template', {
				id: templateId,
				searchTerm: '',
				page: 1,
			});

			if (response.status === 200 && response.data) {
				const template = response.data.data || response.data;
				if (template.error) {
					throw new Error(template.error);
				}

				if (template) {
					// Process author information
					const authorInfo = template.authorName || template.author || 'Hệ thống';
					const createdDate = template.createdAt ? new Date(template.createdAt).toLocaleDateString('vi-VN') : 'N/A';
					const modifiedDate = template.modifiedAt ? new Date(template.modifiedAt).toLocaleDateString('vi-VN') : 'N/A';

					setSelectedTemplate({
						id: template.id,
						templateName: template.templateName,
						templateDescription: template.templateDescription || 'Chưa có mô tả',
						author: authorInfo,
						authorName: authorInfo,
						createdDate: createdDate,
						modifiedDate: modifiedDate,
						createdAt: template.createdAt,
						modifiedAt: template.modifiedAt,
						modifiedBy: template.modifiedBy,
						header: template.header || {},
						content: template.content || '',
						columns: template.columns || [],
						customRows: template.customRows || '',
						classifierCode: template.classifierCode || 'NHAT_KY_THU_NGHIEM',
						parameters: template.parameters || [],
						fileId: template.fileId,
						footer: template.footer || '',
					});

					// Set parameters for editing
					if (template.parameters && Array.isArray(template.parameters)) {
						setTemplateParameters(template.parameters);
					}

					// Set columns for editing - use the columns directly from API response
					if (template.columns && Array.isArray(template.columns)) {
						// Ensure all columns have the required properties
						const processedColumns = template.columns.map((col) => ({
							objectKey: col.objectKey || '',
							columnName: col.columnName || '',
							width: typeof col.width === 'number' ? col.width : parseFloat(col.width) || 10,
						}));
						setTemplateColumns(processedColumns);
					} else {
						// Use default columns if no columns in template
						setTemplateColumns([
							{ objectKey: 'auto', columnName: 'TT', width: 4 },
							{ objectKey: 'sampleId', columnName: 'Mã mẫu thử', width: 10 },
							{ objectKey: 'id', columnName: 'Mã phép thử', width: 10 },
						]);
					}

					// Set custom rows if available
					if (template.customRows) {
						setHasCustomRows(true);
						setCustomRowsContent(template.customRows);
					} else {
						setHasCustomRows(false);
						setCustomRowsContent('');
					}

					// Update templateForm for edit mode
					setTemplateForm({
						name: template.templateName || template.name || '',
						description: template.templateDescription || template.description || '',
						classifierCode: template.classifierCode || 'NHAT_KY_THU_NGHIEM',
						headerData: {
							title: template.header?.title || template.templateName || template.name || '',
							code: template.header?.code || '',
							publishNo: template.header?.publishNo || '',
							publishDate: template.header?.publishDate || '',
						},
						content: template.content || '',
					});

					return template;
				}
			}
		} catch (error) {
			console.error('Error loading template:', error);
			showToast('Lỗi khi tải mẫu: ' + error.message, 'error');
		} finally {
			setIsLoading(false);
		}
		return null;
	};

	// Initialize component based on action
	useEffect(() => {
		if (finalAction === 'view' || finalAction === 'edit') {
			if (templateId) {
				loadTemplateById(templateId);
			}
		} else if (finalAction === 'create') {
			// Initialize for create mode
			const firstParam = templateParameters[0] || { parameterName: '', protocolCode: '' };

			setTemplateForm({
				name: firstParam.parameterName ? `Nhật ký thử nghiệm ${firstParam.parameterName}` : 'Nhật ký thử nghiệm mới',
				description: `Nhật ký thử nghiệm cho các tham số: ${templateParameters.map((p) => p.parameterName).join(', ')}`,
				classifierCode: 'NHAT_KY_THU_NGHIEM',
				headerData: {
					title: `NHẬT KÝ THỬ NGHIỆM ${firstParam.parameterName || ''}`.toUpperCase(),
					code: firstParam.protocolCode || '',
					publishNo: '01',
					publishDate: new Date().toLocaleDateString('vi-VN'),
				},
				content: `
					<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.5;">
						<div style="text-align: center; margin-bottom: 30px;">
							<h3 style="margin: 10px 0; color: #1e40af; text-transform: uppercase;">NHẬT KÝ THỬ NGHIỆM</h3>
							${templateParameters
								.map(
									(param) =>
										`<p style="margin: 5px 0;"><strong>${param.parameterName}:</strong> ${param.protocolCode}</p>`,
								)
								.join('')}
						</div>

						<div style="margin-bottom: 20px;">
							<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">I. THÔNG TIN CHUNG</h4>
							<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;">
								<tr>
									<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Ngày thực hiện:</td>
									<td style="border: 1px solid #ccc; padding: 8px;">[Ngày thực hiện]</td>
									<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Người thực hiện:</td>
									<td style="border: 1px solid #ccc; padding: 8px;">[Tên người thực hiện]</td>
								</tr>
								<tr>
									<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Điều kiện môi trường:</td>
									<td style="border: 1px solid #ccc; padding: 8px;" colspan="3">[Nhiệt độ, độ ẩm, áp suất...]</td>
								</tr>
							</table>
						</div>

						<div style="margin-bottom: 20px;">
							<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">II. QUY TRÌNH THỰC HIỆN</h4>
							<ol style="padding-left: 20px;">
								<li style="margin: 8px 0;">Chuẩn bị mẫu và thiết bị</li>
								<li style="margin: 8px 0;">Tiến hành phân tích theo quy trình</li>
								<li style="margin: 8px 0;">Ghi nhận kết quả</li>
								<li style="margin: 8px 0;">Đánh giá và kết luận</li>
							</ol>
						</div>

						<div style="margin-bottom: 20px;">
							<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">III. KẾT QUẢ THỰC HIỆN</h4>
							<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;">
								<thead>
									<tr style="background: #f9f9f9;">
										<th style="border: 1px solid #ccc; padding: 8px;">STT</th>
										<th style="border: 1px solid #ccc; padding: 8px;">Mẫu</th>
										<th style="border: 1px solid #ccc; padding: 8px;">Kết quả</th>
										<th style="border: 1px solid #ccc; padding: 8px;">Ghi chú</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">1</td>
										<td style="border: 1px solid #ccc; padding: 8px;">[Mã mẫu]</td>
										<td style="border: 1px solid #ccc; padding: 8px;">[Kết quả]</td>
										<td style="border: 1px solid #ccc; padding: 8px;">[Ghi chú]</td>
									</tr>
								</tbody>
							</table>
						</div>

						<div style="margin-top: 30px;">
							<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">IV. KẾT LUẬN</h4>
							<p>[Ghi nhận kết luận về quá trình thực hiện]</p>
						</div>
					</div>
				`,
			});
			setShowTemplateEditor(true);
		}
	}, [finalAction, templateId]);

	// Handle template preview for view mode
	useEffect(() => {
		if (selectedTemplate && finalAction === 'view') {
			const headerInfo = selectedTemplate.header || {};
			const headerTitle =
				headerInfo.title || selectedTemplate.templateName || selectedTemplate.name || 'Không có tiêu đề';
			const headerCode = headerInfo.code || '';
			const publishNo = headerInfo.publishNo || '';
			const publishDate = headerInfo.publishDate || '';
			const templateContent = selectedTemplate.content || '<p>Không có nội dung</p>';

			const templatePreviewContent = `
				<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.5;">
					<!-- HEADER SECTION -->
					<div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 15px;">
						<h3 style="margin: 10px 0; color: #1e40af; text-transform: uppercase;">${headerTitle}</h3>
						${headerCode ? `<p style="margin: 5px 0;"><strong>Mã hiệu:</strong> ${headerCode}</p>` : ''}
						${publishNo ? `<p style="margin: 5px 0;"><strong>Lần phát hành:</strong> ${publishNo}</p>` : ''}
						${publishDate ? `<p style="margin: 5px 0;"><strong>Ngày phát hành:</strong> ${publishDate}</p>` : ''}
						
					</div>
					
					<!-- CONTENT SECTION -->
					<div style="margin-bottom: 30px;">
						<div style="border: 1px solid #ddd; border-radius: 4px; padding: 15px; background: white; min-height: 200px; text-align: initial;">
							${templateContent}
						</div>
					</div>
					
					<!-- BASIC INFO SECTION -->
					<div style="margin-top: 30px;">
						<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">THÔNG TIN CƠ BẢN</h4>
						<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc; margin-top: 10px; text-align: left;">
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold; width: 25%;">Mã mẫu:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${selectedTemplate.id}</td>
							</tr>
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Tên mẫu:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${selectedTemplate.templateName || selectedTemplate.name}</td>
							</tr>
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Mô tả:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${
									selectedTemplate.templateDescription || selectedTemplate.description || 'Chưa có mô tả'
								}</td>
							</tr>
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Loại biên bản:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${
									selectedTemplate.classifierCode === 'NHAT_KY_THU_NGHIEM'
										? 'NHẬT KÝ THỬ NGHIỆM'
										: selectedTemplate.classifierCode === 'BIEN_BAN_THU_NGHIEM'
										? 'BIÊN BẢN THỬ NGHIỆM'
										: selectedTemplate.classifierCode === 'TAI_LIEU_KHAC'
										? 'TÀI LIỆU KHÁC'
										: selectedTemplate.classifierCode || 'NHẬT KÝ THỬ NGHIỆM'
								}</td>
							</tr>
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Người tạo:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${
									selectedTemplate.author || selectedTemplate.authorName || 'Hệ thống'
								}</td>
							</tr>
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Ngày tạo:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${
									selectedTemplate.createdDate ||
									(selectedTemplate.createdAt
										? new Date(selectedTemplate.createdAt).toLocaleDateString('vi-VN')
										: 'N/A')
								}</td>
							</tr>
							${
								selectedTemplate.modifiedBy
									? `
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Người sửa đổi:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${selectedTemplate.modifiedBy}</td>
							</tr>
							`
									: ''
							}
							${
								selectedTemplate.modifiedDate
									? `
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Ngày sửa đổi:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${selectedTemplate.modifiedDate}</td>
							</tr>
							`
									: ''
							}
							${
								selectedTemplate.modifiedBy
									? `
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Người sửa đổi:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${selectedTemplate.modifiedBy}</td>
							</tr>
							`
									: ''
							}
							${
								selectedTemplate.modifiedDate
									? `
							<tr>
								<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Ngày sửa đổi:</td>
								<td style="border: 1px solid #ccc; padding: 8px;">${selectedTemplate.modifiedDate}</td>
							</tr>
							`
									: ''
							}
						</table>
					</div>
				</div>
			`;
			setPreviewContent(templatePreviewContent);
		}
	}, [selectedTemplate, finalAction]);

	// Handle edit mode
	const handleEditMode = () => {
		if (selectedTemplate && selectedTemplate.id) {
			setEditingTemplate(selectedTemplate);
			// Set parameters for editing
			if (selectedTemplate.parameters && Array.isArray(selectedTemplate.parameters)) {
				setTemplateParameters(selectedTemplate.parameters);
			}
			// Set columns for editing
			if (selectedTemplate.columns && Array.isArray(selectedTemplate.columns)) {
				// Keep default columns and add custom columns
				const defaultColumns = [
					{ objectKey: 'auto', columnName: 'TT', width: 4 },
					{ objectKey: 'sampleId', columnName: 'Mã mẫu thử', width: 10 },
					{ objectKey: 'id', columnName: 'Mã phép thử', width: 10 },
				];
				const customColumns = selectedTemplate.columns
					.filter((col) => col.objectKey !== 'auto' && col.objectKey !== 'sampleId' && col.objectKey !== 'id')
					.map((col) => ({
						...col,
						width: typeof col.width === 'string' ? parseFloat(col.width) : col.width,
					}));
				setTemplateColumns([...defaultColumns, ...customColumns]);
			} else {
				// Use default columns if no columns in template
				setTemplateColumns([
					{ objectKey: 'sampleId', columnName: 'Mã mẫu thử', width: 12 },
					{ objectKey: 'id', columnName: 'Mã phép thử', width: 12 },
				]);
			}

			// Set custom rows
			if (selectedTemplate.customRows) {
				setHasCustomRows(true);
				setCustomRowsContent(selectedTemplate.customRows);
				setTimeout(() => {
					if (customRowsEditorRef.current) {
						customRowsEditorRef.current.setContent(selectedTemplate.customRows);
					}
				}, 100);
			} else {
				setHasCustomRows(false);
				setCustomRowsContent('');
			}

			setTemplateForm({
				name: selectedTemplate.templateName || selectedTemplate.name,
				description: selectedTemplate.templateDescription || selectedTemplate.description,
				classifierCode: selectedTemplate.classifierCode || 'NHAT_KY_THU_NGHIEM',
				headerData: {
					title: selectedTemplate.header?.title || selectedTemplate.templateName || selectedTemplate.name,
					code: selectedTemplate.header?.code || '',
					publishNo: selectedTemplate.header?.publishNo || '',
					publishDate: selectedTemplate.header?.publishDate || '',
				},
				content: selectedTemplate.content || '',
			});
			setShowTemplateEditor(true);
		}
	};

	// Template API functions (from DocumentEditor.jsx)
	const createTemplate = async (templateData) => {
		try {
			const requestBody = {
				templateName: templateData.name,
				templateDescription: templateData.description,
				classifierCode: templateData.classifierCode,
				columns: templateColumns, // Use current template columns instead of hardcoded
				customRows: hasCustomRows && customRowsContent ? customRowsContent : '',
				header: templateData.headerData,
				content: templateData.content,
				footer: '',
				parameters: templateParameters,
			};

			const response = await apiPost('https://black.irdop.org/v1/lab/test_report/create_template', requestBody);

			if (response.status < 300 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}
				return result;
			} else {
				throw new Error('Lỗi API: ' + (response.data?.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Error creating template:', error);
			throw error;
		}
	};

	const updateTemplate = async (templateData) => {
		try {
			const requestBody = {
				id: templateData.id || templateId,
				templateName: templateData.templateName,
				templateDescription: templateData.templateDescription,
				classifierCode: templateData.classifierCode,
				columns: templateColumns, // Use current template columns instead of hardcoded
				customRows: hasCustomRows && customRowsContent ? customRowsContent : '',
				header: templateData.headerData,
				content: templateData.content,
				footer: '',
				parameters: templateParameters,
			};

			requestBody.columns = requestBody.columns.map((col) => {
				if (col.objectKey === 'id') {
					col.width = 9;
				}
				return col;
			});

			const response = await apiPost('https://black.irdop.org/v1/lab/test_report/update_template', requestBody);

			if (response.status === 200 && response.data) {
				const result = response.data;
				if (result.error) {
					throw new Error(result.error);
				}
				return result;
			} else {
				throw new Error('Lỗi API: ' + (response.data?.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Error updating template:', error);
			throw error;
		}
	};

	// Handle form changes
	const handleTemplateFormChange = (field, value) => {
		if (field.startsWith('headerData.')) {
			const headerField = field.replace('headerData.', '');
			setTemplateForm((prev) => ({
				...prev,
				headerData: {
					...prev.headerData,
					[headerField]: value,
				},
			}));
		} else {
			setTemplateForm((prev) => ({
				...prev,
				[field]: value,
			}));
		}
	};

	// Handle save template
	const handleSaveTemplate = async () => {
		// Get content from TinyMCE editor if available
		if (templateEditorRef.current) {
			templateForm.content = templateEditorRef.current.getContent();
		}

		if (templateId) {
			templateForm.id = templateId;
		}

		// Get custom rows content if available
		if (hasCustomRows && customRowsEditorRef.current) {
			setCustomRowsContent(customRowsEditorRef.current.getContent());
		} else {
			setCustomRowsContent('');
		}

		// Update templateForm with current columns and parameters
		templateForm.columns = templateColumns;
		templateForm.parameters = templateParameters;

		if (!templateForm.name.trim()) {
			showToast('Vui lòng nhập tên mẫu biên bản', 'warning');
			return;
		}

		console.log('Saving template:', templateForm);

		try {
			setIsLoading(true);

			if (templateId) {
				// Update existing template
				await updateTemplate(templateForm);
				showToast('Cập nhật mẫu thành công!', 'success');
			} else {
				// Create new template
				const result = await createTemplate(templateForm);
				showToast('Tạo mẫu thành công!', 'success');

				// Load the created template for editing
				if (result.id) {
					const createdTemplate = await loadTemplateById(result.id);
					if (createdTemplate) {
						// Set to edit mode instead of view mode
						setEditingTemplate(createdTemplate);
						setShowTemplateEditor(true);
					}
				}
			}
		} catch (error) {
			console.error('Error saving template:', error);
			showToast('Có lỗi xảy ra khi lưu mẫu: ' + error.message, 'error');
		} finally {
			setIsLoading(false);
		}
	};

	// Helper function to apply format logic to HTML content (from DocumentEditor.jsx)
	const applyFormatToHTML = (htmlContent) => {
		const tempContainer = document.createElement('div');
		tempContainer.innerHTML = htmlContent;

		// Remove data-mce-style from ALL elements first
		const allElements = tempContainer.querySelectorAll('*');
		allElements.forEach((element) => {
			element.removeAttribute('data-mce-style');
		});

		// Process p tags - remove style but keep padding
		const pTags = tempContainer.querySelectorAll('p');
		pTags.forEach((p) => {
			const currentStyle = p.getAttribute('style') || '';
			const extractStyleProperty = (styleString, property) => {
				if (!styleString) return null;
				const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
				const match = styleString.match(regex);
				return match ? match[1].trim() : null;
			};

			const padding = extractStyleProperty(currentStyle, 'padding');
			const paddingTop = extractStyleProperty(currentStyle, 'padding-top');
			const paddingBottom = extractStyleProperty(currentStyle, 'padding-bottom');
			const paddingLeft = extractStyleProperty(currentStyle, 'padding-left');
			const paddingRight = extractStyleProperty(currentStyle, 'padding-right');

			p.removeAttribute('style');
			p.removeAttribute('class');

			const styleString = [];
			if (padding) styleString.push(`padding: ${padding}`);
			else {
				if (paddingTop) styleString.push(`padding-top: ${paddingTop}`);
				if (paddingBottom) styleString.push(`padding-bottom: ${paddingBottom}`);
				if (paddingLeft) styleString.push(`padding-left: ${paddingLeft}`);
				if (paddingRight) styleString.push(`padding-right: ${paddingRight}`);
			}

			if (styleString.length > 0) {
				p.setAttribute('style', styleString.join('; ') + '; font-size: 12px; text-align: left');
			} else {
				p.setAttribute('style', 'font-size: 12px; text-align: left');
			}
		});

		// Process table elements
		const tdTags = tempContainer.querySelectorAll('td, th');
		tdTags.forEach((td) => {
			td.removeAttribute('style');
			td.removeAttribute('class');
			td.removeAttribute('width');
			td.setAttribute('style', 'border: 1px solid #000; padding: 0px 6px; text-align: left; font-size: 12px');
		});

		const tableTags = tempContainer.querySelectorAll('table');
		tableTags.forEach((table) => {
			table.removeAttribute('style');
			table.removeAttribute('class');
			table.removeAttribute('border');
			table.removeAttribute('cellpadding');
			table.removeAttribute('cellspacing');
			table.removeAttribute('width');
			table.setAttribute('style', 'width: 100%; border-collapse: collapse;');
		});

		return tempContainer.innerHTML;
	};

	// Format function for template editor
	const formatTemplateContent = () => {
		if (!templateEditorRef.current) {
			showToast('Editor chưa được khởi tạo', 'warning');
			return;
		}

		try {
			const content = templateEditorRef.current.getContent();
			if (!content) {
				showToast('Không có nội dung để định dạng', 'warning');
				return;
			}

			const cleanedContent = applyFormatToHTML(content);
			templateEditorRef.current.setContent(cleanedContent);
			setTemplateForm((prev) => ({
				...prev,
				content: cleanedContent,
			}));

			showToast('Đã định dạng lại nội dung thành công!', 'success');
		} catch (error) {
			console.error('Error in formatTemplateContent:', error);
			showToast('Lỗi khi định dạng: ' + error.message, 'error');
		}
	};

	// Insert signature box function
	const insertSignatureBox = () => {
		if (templateEditorRef.current) {
			const editor = templateEditorRef.current;

			const signatureHTML = `
				<div style="width: 100%; display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; font-size: 11px; font-family: 'Times New Roman', serif; height: 3cm; border: none;">
					<div style="flex: 1; text-align: center; font-weight: bold; height: 3cm; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding-top: 8px; margin-right: 10px;">
						Ngày kiểm tra:<br>
						NGƯỜI KIỂM TRA
					</div>
					<div style="flex: 1; text-align: center; font-weight: bold; height: 3cm; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding-top: 8px; margin-left: 10px;">
						Ngày thực hiện:<br>
						NGƯỜI THỰC HIỆN
					</div>
				</div>
			`;

			editor.insertContent(signatureHTML);
		}
	};

	// Icon list for picker
	const iconList = [
		{
			name: 'Checkbox trống',
			html: '☐',
			unicode: '&#9744;',
		},
		{
			name: 'Checkbox có tick',
			html: '☑',
			unicode: '&#9745;',
		},
		{
			name: 'Dấu tick',
			html: '✓',
			unicode: '&#10003;',
		},
		{
			name: 'Phân số (a/b)',
			html: '<span style="display: inline-block; text-align: center; vertical-align: middle; font-family: \'Times New Roman\', serif;"><span style="display: block; border-bottom: 1px solid black; font-size: 0.8em; line-height: 1; padding-bottom: 1px;">a</span><span style="display: block; font-size: 0.8em; line-height: 1; padding-top: 1px;">b</span></span>',
			unicode: null,
		},
	];

	const insertIconIntoEditor = (icon) => {
		if (templateEditorRef.current && templateEditorRef.current.initialized) {
			templateEditorRef.current.insertContent(icon.html);
			showToast(`Đã chèn ${icon.name} vào editor!`, 'success');
			setShowIconPicker(false);
		} else {
			showToast('Editor chưa sẵn sàng', 'warning');
		}
	};

	// Handle close
	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			// Navigate back or close window
			window.close();
		}
	};

	// Render different modes
	const renderContent = () => {
		if (finalAction === 'view' && selectedTemplate) {
			return (
				<div className="bg-white rounded-xl shadow-sm border h-full flex flex-col min-h-0">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
						<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
							<FaEye className="text-blue-600" />
							Xem Mẫu Nhật Ký Thử Nghiệm
						</h3>
						<div className="flex gap-3">
							<button
								onClick={handleEditMode}
								className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
							>
								<FaEdit className="w-4 h-4" />
								Chỉnh sửa
							</button>
							{onClose && (
								<button
									onClick={handleClose}
									className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
								>
									<FaArrowLeft className="w-4 h-4" />
									Đóng
								</button>
							)}
						</div>
					</div>

					{/* Content */}
					<div className="flex-1 p-4 overflow-auto min-h-0">
						{/* Template Information Panel */}
						<div className="mb-4 bg-gray-50 rounded-lg p-4">
							<h4 className="text-md font-semibold text-gray-900 mb-3">Thông tin mẫu</h4>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="font-medium text-gray-700">Tên mẫu:</span>
									<span className="ml-2 text-gray-900">{selectedTemplate.templateName || selectedTemplate.name}</span>
								</div>
								<div>
									<span className="font-medium text-gray-700">Loại biên bản:</span>
									<span className="ml-2 text-gray-900">{selectedTemplate.classifierCode}</span>
								</div>
								{selectedTemplate.authorName && (
									<div>
										<span className="font-medium text-gray-700">Người tạo:</span>
										<span className="ml-2 text-gray-900">{selectedTemplate.authorName}</span>
									</div>
								)}
								{selectedTemplate.createdAt && (
									<div>
										<span className="font-medium text-gray-700">Ngày tạo:</span>
										<span className="ml-2 text-gray-900">
											{new Date(selectedTemplate.createdAt).toLocaleDateString('vi-VN', {
												year: 'numeric',
												month: '2-digit',
												day: '2-digit',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</span>
									</div>
								)}

								{selectedTemplate.modifiedBy && (
									<div>
										<span className="font-medium text-gray-700">Người chỉnh sửa:</span>
										<span className="ml-2 text-gray-900">{selectedTemplate.modifiedBy}</span>
									</div>
								)}

								{selectedTemplate.modifiedAt && (
									<div>
										<span className="font-medium text-gray-700">Ngày chỉnh sửa:</span>
										<span className="ml-2 text-gray-900">
											{new Date(selectedTemplate.modifiedAt).toLocaleDateString('vi-VN', {
												year: 'numeric',
												month: '2-digit',
												day: '2-digit',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</span>
									</div>
								)}
								{selectedTemplate.templateDescription && (
									<div className="col-span-2">
										<span className="font-medium text-gray-700">Mô tả:</span>
										<span className="ml-2 text-gray-900">{selectedTemplate.templateDescription}</span>
									</div>
								)}
							</div>

							{/* Parameters Section in View Mode */}
							{templateParameters && templateParameters.length > 0 && (
								<div className="mt-4">
									<h5 className="text-sm font-semibold text-gray-900 mb-2">Phép thử áp dụng:</h5>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{templateParameters.map((param, index) => (
											<div key={index} className="bg-white p-3 border border-gray-200 rounded-lg">
												<div className="text-sm font-medium text-gray-900">{param.parameterName}</div>
												<div className="text-xs text-gray-500">{param.protocolCode}</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Columns Section in View Mode */}
							{templateColumns && templateColumns.length > 0 && (
								<div className="mt-4">
									<h5 className="text-sm font-semibold text-gray-900 mb-2">Cấu hình cột dữ liệu:</h5>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{templateColumns.map((col, index) => (
											<div key={index} className="bg-white p-3 border border-gray-200 rounded-lg">
												<div className="text-sm font-medium text-gray-900">{col.columnName}</div>
												<div className="text-xs text-gray-500">
													Key: {col.objectKey || '(trống)'} | Width: {col.width}%
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Custom Rows Section in View Mode */}
							{selectedTemplate.customRows && (
								<div className="mt-4">
									<h5 className="text-sm font-semibold text-gray-900 mb-2">Hàng tùy chọn:</h5>
									<div className="bg-white p-3 border border-gray-200 rounded-lg">
										<div className="text-sm text-gray-900">
											<div dangerouslySetInnerHTML={{ __html: selectedTemplate.customRows }} />
										</div>
									</div>
								</div>
							)}
						</div>

						<div className="bg-gray-50 rounded-lg p-4 h-full">
							<div className="bg-white rounded-lg shadow-sm h-full overflow-auto">
								<div dangerouslySetInnerHTML={{ __html: previewContent }} />
							</div>
						</div>
					</div>
				</div>
			);
		}

		if (finalAction === 'edit' || finalAction === 'create' || showTemplateEditor) {
			return (
				<div className="rounded-xl shadow-sm border h-full flex flex-col min-h-0">
					{/* Header */}
					<div className="bg-blue-600 text-white p-4 py-1 flex-shrink-0">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-bold flex items-center gap-2">
								{finalAction === 'edit' ? 'Chỉnh sửa mẫu nhật ký' : 'Biên tập mẫu nhật ký mới'}
							</h2>
							{onClose && (
								<button onClick={handleClose} className="transition-colors text-red-300 hover:text-red-500 p-2">
									<FaTimes className="w-6 h-6" />
								</button>
							)}
						</div>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-hidden">
						<div className="p-3 h-full">
							<div className="flex gap-2 h-full">
								{/* Left Column - Form Fields */}
								<div className="flex-shrink-0 overflow-y-auto" style={{ width: 'max(25%, 330px)' }}>
									{/* Basic Information */}

									{/* Template Information */}
									<div className="mb-6">
										<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">
											1. Thông tin mẫu
										</h3>
										<div className="space-y-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
													Tên mẫu <span className="text-red-500">*</span>
												</label>
												<input
													type="text"
													value={templateForm.name}
													onChange={(e) => handleTemplateFormChange('name', e.target.value)}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
													placeholder="Nhập tên mẫu nhật ký"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Mô tả</label>
												<textarea
													value={templateForm.description}
													onChange={(e) => handleTemplateFormChange('description', e.target.value)}
													rows={3}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
													placeholder="Nhập mô tả cho mẫu nhật ký"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
													Loại biên bản <span className="text-red-500">*</span>
												</label>
												<select
													value={templateForm.classifierCode}
													onChange={(e) => handleTemplateFormChange('classifierCode', e.target.value)}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
												>
													<option value="NHAT_KY_THU_NGHIEM">NHẬT KÝ THỬ NGHIỆM</option>
													<option value="BIEN_BAN_THU_NGHIEM">BIÊN BẢN THỬ NGHIỆM</option>
													<option value="TAI_LIEU_KHAC">TÀI LIỆU KHÁC</option>
												</select>
											</div>
										</div>
									</div>

									{/* Header Information */}
									<div className="mb-6">
										<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">
											2. Thông tin tiêu đề
										</h3>
										<div className="space-y-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
													Tiêu đề tài liệu
												</label>
												<textarea
													value={templateForm.headerData.title}
													onChange={(e) => handleTemplateFormChange('headerData.title', e.target.value)}
													rows={2}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
													placeholder="Nhập tiêu đề tài liệu"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Mã hiệu</label>
												<input
													type="text"
													value={templateForm.headerData.code}
													onChange={(e) => handleTemplateFormChange('headerData.code', e.target.value)}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
													placeholder="Nhập mã hiệu tài liệu"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Lần phát hành</label>
												<input
													type="text"
													value={templateForm.headerData.publishNo}
													onChange={(e) => handleTemplateFormChange('headerData.publishNo', e.target.value)}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
													placeholder="Nhập lần phát hành"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Ngày phát hành</label>
												<input
													type="text"
													value={templateForm.headerData.publishDate}
													onChange={(e) => handleTemplateFormChange('headerData.publishDate', e.target.value)}
													className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
												/>
											</div>
										</div>
									</div>

									{/* Parameters Section */}
									<div className="mb-6">
										<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">
											3. Phép thử áp dụng
										</h3>
										<div className="space-y-4">
											{/* Parameters List */}
											<div className="space-y-2 max-h-40 overflow-y-auto">
												{templateParameters.map((param, index) => (
													<div
														key={index}
														className="items-center justify-between bg-white p-3 border border-gray-200 rounded-lg flex"
													>
														<div className="text-sm font-medium text-gray-900 ">{param.parameterName}</div>
														<div className="text-xs text-gray-500">{param.protocolCode}</div>
														<button
															onClick={() => removeParameter(index)}
															className="text-red-500 hover:text-red-700 p-1 transition-colors grid  w-10"
															title="Xóa tham số"
														>
															<FaTimes className="w-4 h-4" />
														</button>
													</div>
												))}
												{templateParameters.length === 0 && (
													<div className="text-center text-gray-500 text-sm py-4 ">Chưa có tham số nào được thêm</div>
												)}
											</div>

											{/* Add Parameter Form */}
											<div className="bg-gray-50 p-4 rounded-lg">
												<div className="grid grid-cols-3 gap-3 mb-3">
													<div className="relative">
														<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Chỉ tiêu</label>
														<input
															ref={parameterNameInputRef}
															type="text"
															value={newParameter.parameterName}
															onChange={(e) => handleParameterInputChange('parameterName', e.target.value)}
															onKeyDown={(e) => handleParameterInputKeyDown('parameterName', e)}
															className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
															placeholder="Tên phép thử (Enter để tìm)"
														/>
													</div>
													<div className="relative">
														<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
															Phương pháp
														</label>
														<input
															ref={protocolCodeInputRef}
															type="text"
															value={newParameter.protocolCode}
															onChange={(e) => handleParameterInputChange('protocolCode', e.target.value)}
															onKeyDown={(e) => handleParameterInputKeyDown('protocolCode', e)}
															className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
															placeholder="Mã phương pháp (Enter để tìm)"
														/>
													</div>
													<div className="flex items-end">
														<div className="flex-1">
															<button
																data-add-parameter-button
																onClick={addParameter}
																disabled={!newParameter.parameterName.trim() || !newParameter.protocolCode.trim()}
																className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm h-fit"
															>
																Thêm chỉ tiêu
															</button>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>

									{/* Columns Section */}
									<div className="mb-6">
										<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">
											4. Cấu hình cột dữ liệu
										</h3>
										<div className="space-y-4">
											{/* Columns List */}
											<div className="border border-gray-300 rounded-lg overflow-x-auto">
												<table className="w-full min-w-[800px]">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
																STT
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
																Tên cột
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
																Object Key
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
																Độ rộng
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
																Thao tác
															</th>
														</tr>
													</thead>
													<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
														<SortableContext
															items={templateColumns.map((col, index) => `${col.objectKey}_${index}`)}
															strategy={verticalListSortingStrategy}
														>
															<tbody className="bg-white divide-y divide-gray-200">
																{templateColumns.map((col, index) => (
																	<SortableItem
																		key={`${col.objectKey}_${index}`}
																		id={`${col.objectKey}_${index}`}
																		index={index}
																		startEditColumn={startEditColumn}
																		removeColumn={removeColumn}
																	>
																		{col}
																	</SortableItem>
																))}
															</tbody>
														</SortableContext>
													</DndContext>
												</table>
											</div>

											{/* Add/Edit Column Form */}
											<div className="bg-gray-50 p-4 rounded-lg">
												<div className="grid grid-cols-3 gap-3 mb-3">
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Object Key</label>
														<select
															value={newColumn.objectKey}
															onChange={(e) => {
																const selectedValue = e.target.value;
																const objectKeyLabels = {
																	'': 'Trống',
																	sampleId: 'Mã mẫu',
																	id: 'Mã chỉ tiêu',
																	parameterName: 'Tên chỉ tiêu',
																	protocolCode: 'Phương pháp thử',
																	resultValue: 'Kết quả',
																	resultUnit: 'Đơn vị',
																};
																setNewColumn((prev) => ({
																	...prev,
																	objectKey: selectedValue,
																	columnName: selectedValue
																		? objectKeyLabels[selectedValue] || selectedValue
																		: prev.columnName,
																}));
															}}
															className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
														>
															<option value="">Trống</option>
															<option value="sampleId">Mã mẫu</option>
															<option value="id">Mã chỉ tiêu</option>
															<option value="parameterName">Tên chỉ tiêu</option>
															<option value="protocolCode">Phương pháp thử</option>
															<option value="resultValue">Kết quả</option>
															<option value="resultUnit">Đơn vị</option>
														</select>
													</div>
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Tên cột</label>
														<input
															type="text"
															value={newColumn.columnName}
															onChange={(e) => setNewColumn((prev) => ({ ...prev, columnName: e.target.value }))}
															className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
															placeholder="Tên hiển thị"
														/>
													</div>
													<div className="flex items-end">
														{editingColumnIndex !== null ? (
															<div className="flex gap-2 w-full">
																<button
																	onClick={saveEditColumn}
																	disabled={!newColumn.columnName.trim()}
																	className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
																>
																	Lưu
																</button>
																<button
																	onClick={cancelEditColumn}
																	className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
																>
																	Hủy
																</button>
															</div>
														) : (
															<button
																onClick={addColumn}
																disabled={!newColumn.columnName.trim()}
																className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
															>
																Thêm cột
															</button>
														)}
													</div>
												</div>
											</div>
										</div>

										{/* Column Preview */}
										<div className="mt-4">
											<h4 className="text-sm font-semibold text-gray-900 mb-2">Xem trước cột:</h4>
											<div className="border border-gray-300 rounded-lg overflow-x-auto">
												<div className="flex bg-gray-100 border-b border-gray-300 min-w-[800px]">
													{templateColumns.map((col, index) => (
														<div
															key={index}
															className={`relative flex items-center justify-center px-2 py-3 text-xs font-medium text-gray-700 border-r border-gray-300 last:border-r-0 ${
																index < 3 ? 'bg-blue-50' : 'bg-white'
															}`}
															style={{ width: `${col.width}%`, minWidth: '60px' }}
														>
															<span className="truncate" title={`${col.columnName} (${col.width}%)`}>
																{col.columnName} ({col.width}%)
															</span>
															{index >= 3 && (
																<div
																	className="absolute right-0 top-0 bottom-0 w-1 bg-gray-400 cursor-col-resize hover:bg-blue-500 transition-colors"
																	onMouseDown={(e) => startResize(e, index)}
																	title="Kéo để thay đổi độ rộng"
																/>
															)}
														</div>
													))}
												</div>
												<div className="flex bg-white min-w-[800px]">
													{templateColumns.map((col, index) => (
														<div
															key={index}
															className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200 last:border-r-0 text-center"
															style={{ width: `${col.width}%`, minWidth: '60px' }}
														>
															{col.objectKey === 'auto' ? '1, 2, 3...' : col.objectKey || col.columnName}
														</div>
													))}
												</div>
											</div>
											<div className="mt-2 text-xs text-gray-500">
												<span className="inline-block w-3 h-3 bg-blue-50 border border-gray-300 mr-1"></span>
												Cột mặc định (không thể chỉnh sửa)
												<span className="inline-block w-3 h-3 bg-white border border-gray-300 ml-4 mr-1"></span>
												Cột tùy chỉnh (có thể chỉnh sửa)
											</div>
										</div>
									</div>
								</div>

								{/* Right Column - Editor */}
								<div className="flex-1 flex flex-col overflow-y-auto">
									{/* Custom Rows Section */}
									<div className="mb-6">
										<div className="flex items-center justify-between border-b pb-2 mb-4">
											<h3 className="text-lg font-semibold text-gray-900 text-left">6. Hàng tùy chọn</h3>
											{/* Enable Custom Rows Checkbox */}
											<div className="flex items-center">
												<input
													type="checkbox"
													id="hasCustomRows"
													checked={hasCustomRows}
													onChange={(e) => {
														setHasCustomRows(e.target.checked);
														if (e.target.checked) {
															// Auto-generate table when enabled
															setTimeout(() => {
																if (customRowsEditorRef.current) {
																	const tableHTML = generateCustomRowsTable();
																	customRowsEditorRef.current.setContent(tableHTML);
																	setCustomRowsContent(tableHTML);
																}
															}, 100);
														} else {
															setCustomRowsContent('');
															if (customRowsEditorRef.current) {
																customRowsEditorRef.current.setContent('');
															}
														}
													}}
													className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
												/>
												<label htmlFor="hasCustomRows" className="ml-2 block text-sm text-gray-900">
													Bật hàng tùy chọn
												</label>
											</div>
										</div>
										<div className="space-y-4">
											{/* Custom Rows Editor */}
											{hasCustomRows && (
												<div className="border border-gray-300 rounded-lg overflow-hidden">
													<TinyMCEEditor
														ref={customRowsEditorRef}
														value={customRowsContent}
														onEditorChange={(content) => setCustomRowsContent(content)}
														onInit={(evt, editor) => {
															customRowsEditorRef.current = editor;
															editor.initialized = true;
															// Set initial content if available
															if (customRowsContent) {
																editor.setContent(customRowsContent);
															}
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
															table_use_colgroups: false,
															table_selection_toolbar: false,
															toolbar:
																'table tabledelete tableprops tablerowprops tablecellprops tableinsertrowbefore tableinsertrowafter tabledeleterow tableinsertcolbefore tableinsertcolafter tabledeletecol',
															resize: 'both',
															plugins: ['table', 'autoresize'],
															autoresize_bottom_margin: 20,
															content_style: `
																	* {
																		box-sizing: border-box !important;
																	}
																	body {
																		font-family: 'Times New Roman', Times, serif;
																		font-size: 12px;
																		line-height: 1.5;
																		margin: 0;
																		background: white;
																		box-sizing: border-box;
                                                                        padding: 3mm 10mm !important;
																		width: 100%;
																		min-height: 100px;
																	}
																	p {
    																	margin: 2px 0;
    																	box-sizing: border-box;
																	}
																	table {
    																	border-collapse: collapse;
    																	border: 1px solid #ccc;
    																	box-sizing: border-box;
    																	width: 100%;
    																	max-width: 100%;
																	}
																	table th, table td {
    																	border: 1px solid #ccc;
    																	padding: 6px;
    																	vertical-align: top;
    																	box-sizing: border-box;
    																	word-break: normal;
    																	word-wrap: normal;
    																	white-space: normal;
																	}
																	table th {
    																	background-color: #f9f9f9;
    																	font-weight: bold;
    																	box-sizing: border-box;
																	}
																`,
															setup: function (editor) {
																editor.on('init', function () {
																	if (customRowsEditorRef.current) {
																		customRowsEditorRef.current.initialized = true;
																	}
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
											)}
										</div>
									</div>

									<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">7. Nội dung mẫu</h3>
									<div className="flex-1 overflow-auto" style={{ height: '1000px' }}>
										<TinyMCEEditor
											ref={templateEditorRef}
											value={templateForm.content}
											onEditorChange={(content) => handleTemplateFormChange('content', content)}
											onInit={(evt, editor) => {
												templateEditorRef.current = editor;
												editor.initialized = true;
											}}
											init={{
												height: 1000,
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
												],
												toolbar:
													'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight checklist numlist bullist indent outdent anchor table tabledelete tableprops tablerowprops tablecellprops tableinsertrowbefore tableinsertrowafter tabledeleterow tableinsertcolbefore tableinsertcolafter tabledeletecol',
												content_style: `
													* {
													box-sizing: border-box !important;
													}
													body {
													font-family: 'Times New Roman', Times, serif;
													font-size: 12px;
													line-height: 1.5;
													margin: 0;
													background: white;
													box-sizing: border-box;
													padding: 10mm;
													padding-top: 2mm;
													width: 100%;
													min-height: 200px;
													}
													p {
													margin: 2px 0;
													box-sizing: border-box;
													}
													table {
													border-collapse: collapse;
													border: 1px solid #ccc;
													box-sizing: border-box;
													width: 100%;
													max-width: 100%;
													}
													table th, table td {
													border: 1px solid #ccc;
													padding: 8px;
													vertical-align: top;
													box-sizing: border-box;
													word-break: normal;
													word-wrap: normal;
													white-space: normal;
													}
													table th {
													background-color: #f9f9f9;
													font-weight: bold;
													box-sizing: border-box;
													}
												`,
												setup: function (editor) {
													editor.on('init', function () {
														if (templateEditorRef.current) {
															templateEditorRef.current.initialized = true;
														}
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
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="bg-gray-50 px-6 py-2 border-t flex justify-end gap-3 flex-shrink-0">
						{onClose && (
							<button
								onClick={handleClose}
								className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								Hủy
							</button>
						)}
						<button
							onClick={() => setShowIconPicker(true)}
							className="px-4 py-2 text-purple-700 bg-purple-50 border border-purple-300 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2"
							title="Chèn biểu tượng đặc biệt"
						>
							<FaSquare className="w-4 h-4" />
							Chèn Icon
						</button>
						<button
							onClick={insertSignatureBox}
							className="px-4 py-2 text-teal-700 bg-teal-50 border border-teal-300 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-2"
							title="Chèn khung ký tên"
						>
							<FaEdit className="w-4 h-4" />
							Insert Sign
						</button>
						<button
							onClick={insertSampleResultTable}
							className="px-4 py-2 text-indigo-700 bg-indigo-50 border border-indigo-300 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
							title="Chèn mẫu kết quả với các cột đã cấu hình"
						>
							<FaTable className="w-4 h-4" />
							Chèn mẫu kết quả
						</button>
						<button
							onClick={formatTemplateContent}
							className="px-4 py-2 text-orange-700 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-2"
							title="Định dạng lại nội dung với font-size 12px"
						>
							<FaEraser className="w-4 h-4" />
							Format
						</button>
						<button
							onClick={handleSaveTemplate}
							disabled={isLoading}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<FaSave className="w-4 h-4" />
							{isLoading ? 'Đang lưu...' : finalAction === 'edit' ? 'Cập nhật' : 'Tạo mẫu'}
						</button>
					</div>
				</div>
			);
		}

		// Loading or error state
		return (
			<div className="bg-white rounded-xl shadow-sm border h-full flex flex-col min-h-0">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
					<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
						<FaExclamationTriangle className="text-red-600" />
						Lỗi tải dữ liệu
					</h3>
					{onClose && (
						<button
							onClick={handleClose}
							className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
						>
							<FaArrowLeft className="w-4 h-4" />
							Đóng
						</button>
					)}
				</div>

				{/* Content */}
				<div className="flex-1 flex items-center justify-center p-4">
					<div className="text-center">
						{isLoading ? (
							<>
								<div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
								<p className="text-gray-600">Đang tải...</p>
							</>
						) : (
							<>
								<FaFileAlt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
								<p className="text-gray-600">Không thể tải dữ liệu</p>
								<p className="text-sm text-gray-500 mt-2">Vui lòng thử lại hoặc liên hệ quản trị viên</p>
							</>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="w-full h-full bg-gray-100">
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

					/* Toast Animation Styles */
					@keyframes fade-in {
						from { opacity: 0; }
						to { opacity: 1; }
					}

					@keyframes slide-in-from-right-5 {
						from { transform: translateX(20px); }
						to { transform: translateX(0); }
					}

					.animate-in {
						animation: fade-in 0.3s ease-out, slide-in-from-right-5 0.3s ease-out;
					}

					/* Drag and Drop Styles */
					.cursor-grab {
						cursor: grab;
					}

					.cursor-grab:active {
						cursor: grabbing;
					}

					/* Sortable item styles */
					.sortable-ghost {
						opacity: 0.4;
					}

					.sortable-chosen {
						opacity: 1;
					}

					.sortable-drag {
						transform: rotate(5deg);
					}
				`}
			</style>

			{renderContent()}

			{/* Icon Picker Modal */}
			{showIconPicker && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
						{/* Header */}
						<div className="bg-purple-600 text-white p-4">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-bold">Chèn biểu tượng đặc biệt</h2>
								<button
									onClick={() => setShowIconPicker(false)}
									className="text-white hover:text-red-300 transition-colors"
								>
									<FaTimes className="w-6 h-6" />
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="p-3 overflow-y-auto max-h-[60vh]">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{iconList.map((icon, index) => (
									<div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
										<div className="flex items-center justify-between mb-3">
											<span className="font-medium text-gray-900">{icon.name}</span>
											<div className="text-2xl" dangerouslySetInnerHTML={{ __html: icon.html }} />
										</div>
										<div className="flex gap-2">
											<button
												onClick={() => insertIconIntoEditor(icon)}
												className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
											>
												Chèn vào Editor
											</button>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
							<button
								onClick={() => setShowIconPicker(false)}
								className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								Đóng
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Parameter Autocomplete Dropdown */}
			{parameterAutocomplete.isOpen && (
				<div
					data-parameter-autocomplete
					className="fixed z-[99999] bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-hidden"
					style={{
						top: `${autocompletePosition.top}px`,
						left: `${autocompletePosition.left}px`,
						width: `${Math.max(autocompletePosition.width * 2, 400)}px`,
						maxWidth: '600px',
					}}
				>
					{/* Loading State */}
					{parameterAutocomplete.loading && (
						<div className="p-4 text-center">
							<div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
							<div className="text-sm text-gray-600">Đang tìm kiếm...</div>
						</div>
					)}

					{/* Results */}
					{!parameterAutocomplete.loading && parameterAutocomplete.results.length > 0 && (
						<>
							{/* Header */}
							<div className="bg-gray-50 p-3 border-b border-gray-200">
								<div className="flex items-center justify-between">
									<div className="text-sm font-medium text-gray-700">
										Kết quả tìm kiếm: "{parameterAutocomplete.searchTerm}"
									</div>
									<div className="text-xs text-gray-500">
										{parameterAutocomplete.pagination?.totalItems || 0} kết quả
									</div>
								</div>
							</div>

							{/* Results List */}
							<div className="max-h-60 overflow-y-auto">
								{parameterAutocomplete.results.map((param, index) => (
									<div
										key={param.id || index}
										data-parameter-result={index}
										onClick={() => selectParameter(param)}
										className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors focus:bg-blue-50 focus:outline-none"
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												selectParameter(param);
											} else if (e.key === 'ArrowDown') {
												e.preventDefault();
												const nextResult = document.querySelector(`[data-parameter-result="${index + 1}"]`);
												if (nextResult) {
													nextResult.focus();
												}
											} else if (e.key === 'ArrowUp') {
												e.preventDefault();
												if (index === 0) {
													// Focus back to input
													const inputRef =
														parameterAutocomplete.focusedInput === 'parameterName'
															? parameterNameInputRef
															: protocolCodeInputRef;
													if (inputRef.current) {
														inputRef.current.focus();
													}
												} else {
													const prevResult = document.querySelector(`[data-parameter-result="${index - 1}"]`);
													if (prevResult) {
														prevResult.focus();
													}
												}
											} else if (e.key === 'Escape') {
												closeParameterAutocomplete();
											}
										}}
									>
										<div className="flex flex-col gap-1">
											<div className="flex items-center justify-between">
												<div className="font-medium text-gray-900 text-sm">{param.parameterName}</div>
												<div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
													{param.id || param.parameterId}
												</div>
											</div>
											<div className="flex items-center justify-between text-xs text-gray-600">
												<div className="flex items-center gap-2">
													<span className="bg-gray-100 px-2 py-1 rounded">{param.protocolCode}</span>
													{param.scientificField && <span className="text-gray-500">{param.scientificField}</span>}
												</div>
												{param.matrix && <span className="text-gray-400">{param.matrix}</span>}
											</div>
											{param.protocolSource && (
												<div className="text-xs text-gray-500">Nguồn: {param.protocolSource}</div>
											)}
										</div>
									</div>
								))}
							</div>

							{/* Pagination */}
							{parameterAutocomplete.pagination && parameterAutocomplete.pagination.totalPages > 1 && (
								<div className="bg-gray-50 p-3 border-t border-gray-200">
									<div className="flex items-center justify-between">
										<div className="text-xs text-gray-600">
											Trang {parameterAutocomplete.pagination.currentPage} /{' '}
											{parameterAutocomplete.pagination.totalPages}
										</div>
										<div className="flex gap-1">
											<button
												onClick={() => handleAutocompletePage(parameterAutocomplete.currentPage - 1)}
												disabled={parameterAutocomplete.currentPage <= 1}
												className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed"
												title="Trang trước"
											>
												<FaChevronLeft className="w-3 h-3" />
											</button>
											<span className="px-2 py-1 text-xs text-gray-600">{parameterAutocomplete.currentPage}</span>
											<button
												onClick={() => handleAutocompletePage(parameterAutocomplete.currentPage + 1)}
												disabled={parameterAutocomplete.currentPage >= parameterAutocomplete.pagination.totalPages}
												className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed"
												title="Trang sau"
											>
												<FaChevronRight className="w-3 h-3" />
											</button>
										</div>
									</div>
								</div>
							)}
						</>
					)}

					{/* No Results */}
					{!parameterAutocomplete.loading &&
						parameterAutocomplete.results.length === 0 &&
						parameterAutocomplete.searchTerm && (
							<div className="p-4 text-center text-gray-500">
								<FaSearch className="w-8 h-8 mx-auto mb-2 text-gray-300" />
								<div className="text-sm">Không tìm thấy kết quả cho "{parameterAutocomplete.searchTerm}"</div>
								<div className="text-xs text-gray-400 mt-1">Thử nhập từ khóa khác</div>
							</div>
						)}
				</div>
			)}

			{/* Toast Notifications */}
			<div className="fixed top-4 right-4 z-[9999] space-y-2">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={`
							flex items-center gap-3 p-4 rounded-lg shadow-lg border-l-4 min-w-[300px] max-w-[400px] bg-white
							animate-in
							${toast.type === 'success' ? 'border-green-500' : ''}
							${toast.type === 'error' ? 'border-red-500' : ''}
							${toast.type === 'warning' ? 'border-yellow-500' : ''}
							${toast.type === 'info' ? 'border-blue-500' : ''}
						`}
						style={{
							backgroundColor:
								toast.type === 'success'
									? '#f0fdf4'
									: toast.type === 'error'
									? '#fef2f2'
									: toast.type === 'warning'
									? '#fffbeb'
									: toast.type === 'info'
									? '#eff6ff'
									: '#ffffff',
						}}
					>
						{/* Icon */}
						<div className="flex-shrink-0">
							{toast.type === 'success' && <FaCheckCircle className="w-5 h-5 text-green-600" />}
							{toast.type === 'error' && <FaTimesCircle className="w-5 h-5 text-red-600" />}
							{toast.type === 'warning' && <FaExclamationTriangle className="w-5 h-5 text-yellow-600" />}
							{toast.type === 'info' && <FaInfoCircle className="w-5 h-5 text-blue-600" />}
						</div>

						{/* Message */}
						<div
							className={`
							flex-1 text-sm font-medium
							${toast.type === 'success' ? 'text-green-800' : ''}
							${toast.type === 'error' ? 'text-red-800' : ''}
							${toast.type === 'warning' ? 'text-yellow-800' : ''}
							${toast.type === 'info' ? 'text-blue-800' : ''}
						`}
						>
							{toast.message}
						</div>

						{/* Close button */}
						<button
							onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
							className={`
								flex-shrink-0 p-1 rounded hover:bg-opacity-20 transition-colors
								${toast.type === 'success' ? 'hover:bg-green-600 text-green-600' : ''}
								${toast.type === 'error' ? 'hover:bg-red-600 text-red-600' : ''}
								${toast.type === 'warning' ? 'hover:bg-yellow-600 text-yellow-600' : ''}
								${toast.type === 'info' ? 'hover:bg-blue-600 text-blue-600' : ''}
							`}
						>
							<FaTimes className="w-4 h-4" />
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

export default TemplateExperimentReport;
