import React, { useState, useRef, useEffect } from 'react';
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react';
import {
	FaFileAlt,
	FaEdit,
	FaEye,
	FaPlus,
	FaUser,
	FaCalendarAlt,
	FaClock,
	FaSearch,
	FaFilter,
	FaChevronDown,
	FaTimes,
	FaSave,
	FaEraser,
} from 'react-icons/fa';

const DocumentEditor = () => {
	const [selectedDocument, setSelectedDocument] = useState(null);
	const [previewContent, setPreviewContent] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [templateSearchTerm, setTemplateSearchTerm] = useState('');

	// Template creation/editing popup state
	const [showTemplatePopup, setShowTemplatePopup] = useState(false);
	const [editingTemplate, setEditingTemplate] = useState(null);
	const [templateForm, setTemplateForm] = useState({
		name: '',
		description: '',
		headerData: {
			title: '',
			code: '',
			publishNo: '',
			publishDate: '',
		},
		content: '',
	});

	// Pagination state
	const [recentDocumentsPage, setRecentDocumentsPage] = useState(1);
	const [templatesPage, setTemplatesPage] = useState(1);

	// Editor ref for template content
	const templateEditorRef = useRef(null);

	// Helper function to extract specific CSS property from style string
	const extractStyleProperty = (styleString, property) => {
		if (!styleString) return null;

		const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
		const match = styleString.match(regex);
		return match ? match[1].trim() : null;
	};

	// Helper function to apply format logic to HTML content with 16px font size
	const applyFormatToHTML = (htmlContent) => {
		const tempContainer = document.createElement('div');
		tempContainer.innerHTML = htmlContent;

		// Process p tags - remove style but keep padding
		const pTags = tempContainer.querySelectorAll('p');
		pTags.forEach((p) => {
			const currentStyle = p.getAttribute('style') || '';
			const padding = extractStyleProperty(currentStyle, 'padding');
			const paddingTop = extractStyleProperty(currentStyle, 'padding-top');
			const paddingBottom = extractStyleProperty(currentStyle, 'padding-bottom');
			const paddingLeft = extractStyleProperty(currentStyle, 'padding-left');
			const paddingRight = extractStyleProperty(currentStyle, 'padding-right');

			p.removeAttribute('style');
			p.removeAttribute('class');
			p.removeAttribute('data-mce-style');

			const styleString = [];
			if (padding) styleString.push(`padding: ${padding}`);
			else {
				if (paddingTop) styleString.push(`padding-top: ${paddingTop}`);
				if (paddingBottom) styleString.push(`padding-bottom: ${paddingBottom}`);
				if (paddingLeft) styleString.push(`padding-left: ${paddingLeft}`);
				if (paddingRight) styleString.push(`padding-right: ${paddingRight}`);
			}

			if (styleString.length > 0) {
				p.setAttribute('style', styleString.join('; ') + '; font-size: 16px');
			} else {
				p.setAttribute('style', 'font-size: 16px');
			}
		});

		// Process td/th tags - remove style but keep padding and set default border
		const tdTags = tempContainer.querySelectorAll('td, th');
		tdTags.forEach((td) => {
			const currentStyle = td.getAttribute('style') || '';
			const padding = extractStyleProperty(currentStyle, 'padding');
			const paddingTop = extractStyleProperty(currentStyle, 'padding-top');
			const paddingBottom = extractStyleProperty(currentStyle, 'padding-bottom');
			const paddingLeft = extractStyleProperty(currentStyle, 'padding-left');
			const paddingRight = extractStyleProperty(currentStyle, 'padding-right');

			td.removeAttribute('style');
			td.removeAttribute('class');
			td.removeAttribute('width');
			td.removeAttribute('data-mce-style');

			const styleString = ['border: 1px solid #000', 'font-size: 16px'];
			if (padding) styleString.push(`padding: ${padding}`);
			else {
				if (paddingTop) styleString.push(`padding-top: ${paddingTop}`);
				if (paddingBottom) styleString.push(`padding-bottom: ${paddingBottom}`);
				if (paddingLeft) styleString.push(`padding-left: ${paddingLeft}`);
				if (paddingRight) styleString.push(`padding-right: ${paddingRight}`);
			}

			td.setAttribute('style', styleString.join('; '));
		});

		// Process tr tags - remove all styling
		const trTags = tempContainer.querySelectorAll('tr');
		trTags.forEach((tr) => {
			tr.removeAttribute('style');
			tr.removeAttribute('class');
			tr.removeAttribute('data-mce-style');
		});

		// Process table tags - set standard styling
		const tableTags = tempContainer.querySelectorAll('table');
		tableTags.forEach((table) => {
			table.removeAttribute('class');
			table.removeAttribute('data-mce-style');
			table.removeAttribute('border');
			table.removeAttribute('cellpadding');
			table.removeAttribute('cellspacing');
			table.removeAttribute('width');

			table.setAttribute('style', 'width: 100%; max-width: 100%; border-collapse: collapse;');
		});

		// Set font-size 16px for all elements except headings
		const allTags = tempContainer.querySelectorAll('*:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)');
		allTags.forEach((element) => {
			const currentStyle = element.getAttribute('style') || '';
			const styleWithFontSize = currentStyle + (currentStyle ? '; ' : '') + 'font-size: 16px';
			element.setAttribute('style', styleWithFontSize);
		});

		return tempContainer.innerHTML;
	};

	// Format function for template editor
	const formatTemplateContent = () => {
		if (!templateEditorRef.current) {
			alert('Editor chưa được khởi tạo');
			return;
		}

		try {
			const content = templateEditorRef.current.getContent();
			if (!content) {
				alert('Không có nội dung để định dạng');
				return;
			}

			const cleanedContent = applyFormatToHTML(content);
			templateEditorRef.current.setContent(cleanedContent);
			setTemplateForm((prev) => ({
				...prev,
				content: cleanedContent,
			}));

			alert('Đã định dạng lại nội dung thành công!');
		} catch (error) {
			console.error('Error in formatTemplateContent:', error);
			alert('Lỗi khi định dạng: ' + error.message);
		}
	};

	// Mock data - Hoạt động gần đây with pagination structure
	const recentDocumentsData = {
		result: [
			{
				id: 'DOC-001',
				title: 'Biên bản kiểm nghiệm mẫu nước',
				templateCode: 'TPL-WATER-01',
				lastModified: '2024-12-20',
				author: 'Nguyễn Văn A',
				status: 'draft',
			},
			{
				id: 'DOC-002',
				title: 'Báo cáo phân tích chất lượng đất',
				templateCode: 'TPL-SOIL-02',
				lastModified: '2024-12-19',
				author: 'Trần Thị B',
				status: 'published',
			},
			{
				id: 'DOC-003',
				title: 'Kết quả kiểm tra vi sinh vật',
				templateCode: 'TPL-MICRO-01',
				lastModified: '2024-12-18',
				author: 'Lê Văn C',
				status: 'review',
			},
			{
				id: 'DOC-004',
				title: 'Báo cáo thử nghiệm hóa chất',
				templateCode: 'TPL-CHEM-03',
				lastModified: '2024-12-17',
				author: 'Phạm Thị D',
				status: 'draft',
			},
			{
				id: 'DOC-006',
				title: 'Biên bản thử nghiệm độ bền vật liệu',
				templateCode: 'TPL-MATERIAL-01',
				lastModified: '2024-12-21',
				author: 'Ngô Thị F',
				status: 'draft',
			},
		],
		pagination: {
			currentPage: recentDocumentsPage,
			itemsPerPage: 10,
			totalItems: 25,
			totalPages: 3,
		},
	};

	// Mock data - Mẫu tài liệu with pagination structure
	const documentTemplatesData = {
		result: [
			{
				id: 'TPL-WATER-01',
				name: 'Mẫu biên bản kiểm nghiệm nước',
				title: 'Biên bản kiểm nghiệm chất lượng nước',
				description: 'Mẫu chuẩn cho việc lập biên bản kiểm nghiệm các thông số chất lượng nước',
				author: 'Ban Kỹ thuật',
				createdDate: '2024-01-15',
				category: 'water',
			},
			{
				id: 'TPL-SOIL-02',
				name: 'Mẫu báo cáo phân tích đất',
				title: 'Báo cáo phân tích chất lượng đất',
				description: 'Mẫu dành cho việc báo cáo kết quả phân tích các thông số đất',
				author: 'Phòng Đất học',
				createdDate: '2024-02-20',
				category: 'soil',
			},
			{
				id: 'TPL-MICRO-01',
				name: 'Mẫu kiểm tra vi sinh',
				title: 'Kết quả kiểm tra vi sinh vật',
				description: 'Mẫu báo cáo cho các xét nghiệm vi sinh vật trong mẫu thử',
				author: 'Phòng Vi sinh',
				createdDate: '2024-01-30',
				category: 'microbiology',
			},
			{
				id: 'TPL-CHEM-03',
				name: 'Mẫu thử nghiệm hóa chất',
				title: 'Báo cáo thử nghiệm hóa chất',
				description: 'Mẫu chuẩn cho việc thử nghiệm và báo cáo kết quả hóa chất',
				author: 'Phòng Hóa học',
				createdDate: '2024-03-10',
				category: 'chemistry',
			},
			{
				id: 'TPL-EQUIP-01',
				name: 'Mẫu kiểm định thiết bị',
				title: 'Biên bản kiểm định thiết bị',
				description: 'Mẫu cho việc lập biên bản kiểm định và hiệu chuẩn thiết bị',
				author: 'Phòng Thiết bị',
				createdDate: '2024-02-05',
				category: 'equipment',
			},
			{
				id: 'TPL-MATERIAL-01',
				name: 'Mẫu thử nghiệm vật liệu',
				title: 'Biên bản thử nghiệm vật liệu xây dựng',
				description: 'Mẫu chuẩn cho việc thử nghiệm độ bền và chất lượng vật liệu xây dựng',
				author: 'Phòng Vật liệu',
				createdDate: '2024-03-20',
				category: 'material',
			},
		],
		pagination: {
			currentPage: templatesPage,
			itemsPerPage: 10,
			totalItems: 18,
			totalPages: 2,
		},
	};

	// Mock HTML content for preview
	const mockPreviewContent = `
		<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.6;">
			<div style="text-align: center; margin-bottom: 30px;">
				<h2 style="margin: 0; color: #2563eb;">VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN</h2>
				<h3 style="margin: 10px 0; color: #1e40af;">BIÊN BẢN KIỂM NGHIỆM CHẤT LƯỢNG NƯỚC</h3>
				<p style="margin: 5px 0;"><strong>Số:</strong> 001/2024/IRDOP</p>
				<p style="margin: 5px 0;"><strong>Ngày:</strong> 20/12/2024</p>
			</div>
			
			<div style="margin-bottom: 20px;">
				<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">I. THÔNG TIN MẪU THỬ</h4>
				<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;">
					<tr>
						<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Mã mẫu:</td>
						<td style="border: 1px solid #ccc; padding: 8px;">W-2024-001</td>
						<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Ngày lấy mẫu:</td>
						<td style="border: 1px solid #ccc; padding: 8px;">15/12/2024</td>
					</tr>
					<tr>
						<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Tên mẫu:</td>
						<td style="border: 1px solid #ccc; padding: 8px;" colspan="3">Nước sinh hoạt - Khu vực A</td>
					</tr>
				</table>
			</div>
			
			<div style="margin-bottom: 20px;">
				<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">II. KỂT QUẢ KIỂM NGHIỆM</h4>
				<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;">
					<thead>
						<tr style="background: #f9f9f9;">
							<th style="border: 1px solid #ccc; padding: 8px;">STT</th>
							<th style="border: 1px solid #ccc; padding: 8px;">Chỉ tiêu</th>
							<th style="border: 1px solid #ccc; padding: 8px;">Đơn vị</th>
							<th style="border: 1px solid #ccc; padding: 8px;">Kết quả</th>
							<th style="border: 1px solid #ccc; padding: 8px;">Giới hạn cho phép</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">1</td>
							<td style="border: 1px solid #ccc; padding: 8px;">pH</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">-</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">7.2</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">6.0 - 8.5</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">2</td>
							<td style="border: 1px solid #ccc; padding: 8px;">Độ đục</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">NTU</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">0.8</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">≤ 4</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">3</td>
							<td style="border: 1px solid #ccc; padding: 8px;">Coliform</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">MPN/100ml</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">&lt; 3</td>
							<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">≤ 3</td>
						</tr>
					</tbody>
				</table>
			</div>
			
			<div style="margin-top: 30px;">
				<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">III. KẾT LUẬN</h4>
				<p>Mẫu nước kiểm nghiệm đạt tiêu chuẩn chất lượng nước sinh hoạt theo QCVN 01:2009/BYT.</p>
			</div>
			
			<div style="margin-top: 40px; display: flex; justify-content: space-between;">
				<div style="text-align: center;">
					<p style="margin: 0; font-weight: bold;">NGƯỜI LẬP</p>
					<p style="margin: 20px 0 0 0;">[Ký tên]</p>
				</div>
				<div style="text-align: center;">
					<p style="margin: 0; font-weight: bold;">TRƯỞNG PHÒNG</p>
					<p style="margin: 20px 0 0 0;">[Ký tên]</p>
				</div>
			</div>
		</div>
	`;

	const handleNewDocument = () => {
		// Navigate to editor for new document
		console.log('Creating new document...');
		// Here you would navigate to the editor component
	};

	const handleContinueEdit = () => {
		if (selectedDocument) {
			console.log('Continue editing document:', selectedDocument.id);
			// Here you would navigate to the editor with the selected document
		} else {
			alert('Vui lòng chọn một tài liệu để chỉnh sửa');
		}
	};

	const handleDocumentClick = (doc) => {
		setSelectedDocument(doc);
		setPreviewContent(mockPreviewContent);
	};

	const handleTemplateClick = (template) => {
		console.log('Template selected:', template);
		// Set preview content for template
		const templatePreviewContent = `
			<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.6;">
				<div style="text-align: center; margin-bottom: 30px;">
					<h2 style="margin: 0; color: #2563eb;">VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN</h2>
					<h3 style="margin: 10px 0; color: #1e40af;">${template.title.toUpperCase()}</h3>
					<p style="margin: 5px 0;"><strong>Mẫu số:</strong> ${template.id}</p>
					<p style="margin: 5px 0;"><strong>Ngày tạo:</strong> ${template.createdDate}</p>
				</div>
				
				<div style="margin-bottom: 20px;">
					<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">I. THÔNG TIN CHUNG</h4>
					<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;">
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Tên mẫu:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${template.name}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Mô tả:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${template.description}</td>
						</tr>
						<tr>
							<td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9; font-weight: bold;">Người tạo:</td>
							<td style="border: 1px solid #ccc; padding: 8px;">${template.author}</td>
						</tr>
					</table>
				</div>
				
				<div style="margin-bottom: 20px;">
					<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">II. NỘI DUNG MẪU</h4>
					<div style="border: 1px solid #ccc; padding: 15px; background: #f9f9f9;">
						<p style="margin: 10px 0; font-style: italic; color: #666;">Đây là mẫu tài liệu chuẩn được tạo sẵn để sử dụng cho các báo cáo và biên bản.</p>
						<p style="margin: 10px 0;">Nội dung chính sẽ được điền vào khi sử dụng mẫu này để tạo tài liệu mới.</p>
						<p style="margin: 10px 0;"><strong>Danh mục:</strong> ${getCategoryName(template.category)}</p>
					</div>
				</div>
				
				<div style="margin-top: 30px;">
					<h4 style="color: #1e40af; border-bottom: 1px solid #ccc; padding-bottom: 5px;">III. HƯỚNG DẪN SỬ DỤNG</h4>
					<ol style="padding-left: 20px;">
						<li style="margin: 8px 0;">Click vào nút "Soạn thảo mới" để tạo tài liệu từ mẫu này</li>
						<li style="margin: 8px 0;">Điền các thông tin cụ thể vào các trường tương ứng</li>
						<li style="margin: 8px 0;">Lưu tài liệu sau khi hoàn thành</li>
					</ol>
				</div>
				
				<div style="margin-top: 40px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px;">
					<p style="margin: 0; color: #666; font-size: 12px;">Mẫu tài liệu chuẩn - ${template.id}</p>
					<p style="margin: 5px 0; color: #666; font-size: 12px;">Tạo ngày: ${template.createdDate}</p>
				</div>
			</div>
		`;
		setPreviewContent(templatePreviewContent);
		setSelectedDocument(null); // Clear selected document when template is selected
	};

	const getCategoryName = (category) => {
		const categoryMap = {
			water: 'Nước',
			soil: 'Đất',
			microbiology: 'Vi sinh',
			chemistry: 'Hóa chất',
			equipment: 'Thiết bị',
			material: 'Vật liệu',
		};
		return categoryMap[category] || 'Khác';
	};

	const handleCreateNewTemplate = () => {
		console.log('Creating new template...');
		// Reset form for new template
		setEditingTemplate(null);
		setTemplateForm({
			name: '',
			description: '',
			headerData: {
				title: '',
				code: '',
				publishNo: '',
				publishDate: '',
			},
			content: '',
		});
		setShowTemplatePopup(true);
	};

	const handleEditTemplate = (template) => {
		// Set form data for editing
		setEditingTemplate(template);
		setTemplateForm({
			name: template.name,
			description: template.description,
			headerData: {
				title: template.title,
				code: template.id,
				publishNo: '',
				publishDate: template.createdDate,
			},
			content: `<div style="font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.6;">
				<p>Nội dung mẫu tài liệu sẽ được viết tại đây...</p>
				<p>Đây là nội dung demo cho mẫu: ${template.name}</p>
			</div>`,
		});
		setShowTemplatePopup(true);
	};

	const handleCloseTemplatePopup = () => {
		setShowTemplatePopup(false);
		setEditingTemplate(null);
		setTemplateForm({
			name: '',
			description: '',
			headerData: {
				title: '',
				code: '',
				publishNo: '',
				publishDate: '',
			},
			content: '',
		});
	};

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

	const handleSaveTemplate = () => {
		// Get content from TinyMCE editor if available
		if (templateEditorRef.current) {
			templateForm.content = templateEditorRef.current.getContent();
		}

		console.log('Saving template:', templateForm);

		// Here you would call API to save/update template
		if (editingTemplate) {
			console.log('Updating template:', editingTemplate.id);
			// Update existing template
		} else {
			console.log('Creating new template');
			// Create new template
		}

		// Close popup after saving
		handleCloseTemplatePopup();

		// Show success message
		alert(editingTemplate ? 'Mẫu tài liệu đã được cập nhật!' : 'Mẫu tài liệu đã được tạo thành công!');
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'published':
				return 'bg-green-100 text-green-800';
			case 'draft':
				return 'bg-yellow-100 text-yellow-800';
			case 'review':
				return 'bg-blue-100 text-blue-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const getStatusText = (status) => {
		switch (status) {
			case 'published':
				return 'Đã xuất bản';
			case 'draft':
				return 'Bản nháp';
			case 'review':
				return 'Đang duyệt';
			default:
				return 'Không rõ';
		}
	};

	// Page change handlers
	const handleRecentDocumentsPageChange = (newPage) => {
		setRecentDocumentsPage(newPage);
		// In a real app, this would trigger an API call to fetch the new page
		console.log(`Changing recent documents page to: ${newPage}`);
	};

	const handleTemplatesPageChange = (newPage) => {
		setTemplatesPage(newPage);
		// In a real app, this would trigger an API call to fetch the new page
		console.log(`Changing templates page to: ${newPage}`);
	};

	const filteredDocuments = recentDocumentsData.result.filter((doc) =>
		doc.title.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const filteredTemplates = documentTemplatesData.result.filter((template) => {
		const matchesSearch =
			template.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
			template.title.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
			template.description.toLowerCase().includes(templateSearchTerm.toLowerCase());

		return matchesSearch;
	});

	return (
		<>
			<style>
				{`
					/* Modern TinyMCE Custom Styles */
					.tox-tinymce {
						border: 2px solid #6b7280 !important;
						border-radius: 4px !important;
						box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
						overflow: hidden !important;
					}

					.tox-toolbar-overlord {
						background: white !important;
						border-bottom: 2px solid #6b7280 !important;
						border-radius: 0 !important;
						padding: 8px !important;
					}

					.tox .tox-toolbar__group:not(:last-of-type) {
						border-right: 2px solid #e5e7eb !important;
					}

					/* Reset TinyMCE buttons to default styling - don't apply custom styles */
					.tox .tox-tbtn {
						margin: 2px !important;
						border-radius: 4px !important;
						transition: all 0.2s ease !important;
						background: transparent !important;
						border: none !important;
						font-weight: normal !important;
						color: #222f3e !important;
						box-shadow: none !important;
						padding: 4px 8px !important;
					}

					.tox .tox-tbtn:hover {
						background: #e2e8f0 !important;
						border: none !important;
						box-shadow: none !important;
					}

					.tox .tox-tbtn--enabled,
					.tox .tox-tbtn[aria-pressed="true"] {
						background: #cbd5e0 !important;
						border: none !important;
						color: #222f3e !important;
						box-shadow: none !important;
					}

					.tox-edit-area {
						border: none !important;
					}

					.tox-edit-area iframe {
						border-radius: 0 0 6px 6px !important;
					}

					/* Fix bottom border issue */
					.tox-statusbar {
						display: none !important;
					}

					/* Custom Scrollbar */
					::-webkit-scrollbar {
						width: 12px;
						height: 12px;
					}

					::-webkit-scrollbar-track {
						background: #f3f4f6;
						border-radius: 6px;
					}

					::-webkit-scrollbar-thumb {
						background: #9ca3af;
						border-radius: 6px;
						border: 2px solid transparent;
						background-clip: content-box;
					}

					::-webkit-scrollbar-thumb:hover {
						background: #6b7280;
						background-clip: content-box;
					}

					/* Fix container overlapping */
					.document-editor-container {
						box-sizing: border-box;
					}

					.document-editor-container * {
						box-sizing: border-box;
					}

					/* Ensure proper flex behavior */
					.document-editor-sidebar {
						flex-shrink: 0;
						overflow: hidden;
					}

					.document-editor-main {
						min-width: 0;
						overflow: hidden;
					}
				`}
			</style>
			<div
				className="w-full flex gap-6 document-editor-container"
				style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
			>
				<style jsx>{`
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
				`}</style>

				{/* Cột 1: Hoạt động gần đây và Mẫu tài liệu */}
				<div className="w-1/3 flex flex-col gap-4 h-full min-w-[400px] document-editor-sidebar">
					{/* Hoạt động gần đây */}
					<div className="bg-white rounded-xl shadow-sm border p-6 flex-1 flex flex-col min-h-0">
						<div className="flex items-center justify-between mb-4 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaClock className="text-blue-600" />
								Hoạt động gần đây
							</h3>
						</div>
						<div className="mb-4 flex-shrink-0">
							<div className="relative">
								<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Tìm tài liệu..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
								/>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
							<div className="space-y-3">
								{filteredDocuments.map((doc) => (
									<div
										key={doc.id}
										onClick={() => handleDocumentClick(doc)}
										className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-blue-300 ${
											selectedDocument?.id === doc.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
										}`}
									>
										<div className="flex items-start justify-between mb-2">
											<div className="flex items-center gap-2">
												<FaFileAlt className="text-gray-500 flex-shrink-0" />
												<span className="font-medium text-gray-900 text-sm leading-tight">{doc.title}</span>
											</div>
											<span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
												{getStatusText(doc.status)}
											</span>
										</div>
										<div className="text-xs text-gray-500 space-y-1">
											<div className="flex items-center gap-4">
												<span className="font-mono">Mã: {doc.id}</span>
												<span>Mẫu: {doc.templateCode}</span>
											</div>
											<div className="flex items-center gap-4">
												<span className="flex items-center gap-1">
													<FaCalendarAlt className="w-3 h-3" />
													{doc.lastModified}
												</span>
												<span className="flex items-center gap-1">
													<FaUser className="w-3 h-3" />
													{doc.author}
												</span>
											</div>
										</div>
									</div>
								))}

								{/* Pagination for Recent Documents */}
								<div className="flex items-center justify-center pt-4">
									<div className="flex items-center gap-2">
										<button
											onClick={() => handleRecentDocumentsPageChange(recentDocumentsData.pagination.currentPage - 1)}
											disabled={recentDocumentsData.pagination.currentPage === 1}
											className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Trước
										</button>
										{Array.from({ length: recentDocumentsData.pagination.totalPages }, (_, i) => i + 1).map((page) => (
											<button
												key={page}
												onClick={() => handleRecentDocumentsPageChange(page)}
												className={`px-3 py-1 text-sm border rounded ${
													page === recentDocumentsData.pagination.currentPage
														? 'bg-blue-500 text-white border-blue-500'
														: 'border-gray-300 hover:bg-gray-50'
												}`}
											>
												{page}
											</button>
										))}
										<button
											onClick={() => handleRecentDocumentsPageChange(recentDocumentsData.pagination.currentPage + 1)}
											disabled={
												recentDocumentsData.pagination.currentPage === recentDocumentsData.pagination.totalPages
											}
											className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Sau
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Mẫu tài liệu */}
					<div className="bg-white rounded-xl shadow-sm border p-6 flex-1 flex flex-col min-h-0">
						<div className="flex items-center justify-between mb-4 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaEdit className="text-green-600" />
								Mẫu tài liệu
							</h3>
							<button
								onClick={handleCreateNewTemplate}
								className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
							>
								<FaPlus className="w-3 h-3" />
								Tạo mẫu mới
							</button>
						</div>
						<div className="mb-4 flex-shrink-0">
							<div className="relative">
								<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Tìm mẫu tài liệu..."
									value={templateSearchTerm}
									onChange={(e) => setTemplateSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
								/>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
							<div className="space-y-3">
								{filteredTemplates.map((template) => (
									<div
										key={template.id}
										onClick={() => handleTemplateClick(template)}
										className="p-4 border border-gray-200 rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-green-300 group"
									>
										<div className="flex items-start justify-between mb-2">
											<h4 className="font-medium text-gray-900 text-sm leading-tight text-left">{template.name}</h4>
											<div className="flex items-center gap-2">
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleEditTemplate(template);
													}}
													className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
													title="Chỉnh sửa mẫu"
												>
													<FaEdit className="w-4 h-4" />
												</button>
												<FaEye className="text-green-500 flex-shrink-0" />
											</div>
										</div>
										<div className="text-xs text-gray-500 space-y-1 text-left">
											<div>Mã: {template.id}</div>
											<div>Tiêu đề: {template.title}</div>
											<div>Mô tả: {template.description}</div>
											<div className="flex items-center gap-4 pt-1">
												<span className="flex items-center gap-1">
													<FaUser className="w-3 h-3" />
													{template.author}
												</span>
												<span className="flex items-center gap-1">
													<FaCalendarAlt className="w-3 h-3" />
													{template.createdDate}
												</span>
											</div>
										</div>
									</div>
								))}

								{/* Pagination for Templates */}
								<div className="flex items-center justify-center pt-4">
									<div className="flex items-center gap-2">
										<button
											onClick={() => handleTemplatesPageChange(documentTemplatesData.pagination.currentPage - 1)}
											disabled={documentTemplatesData.pagination.currentPage === 1}
											className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Trước
										</button>
										{Array.from({ length: documentTemplatesData.pagination.totalPages }, (_, i) => i + 1).map(
											(page) => (
												<button
													key={page}
													onClick={() => handleTemplatesPageChange(page)}
													className={`px-3 py-1 text-sm border rounded ${
														page === documentTemplatesData.pagination.currentPage
															? 'bg-blue-500 text-white border-blue-500'
															: 'border-gray-300 hover:bg-gray-50'
													}`}
												>
													{page}
												</button>
											),
										)}
										<button
											onClick={() => handleTemplatesPageChange(documentTemplatesData.pagination.currentPage + 1)}
											disabled={
												documentTemplatesData.pagination.currentPage === documentTemplatesData.pagination.totalPages
											}
											className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Sau
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Cột 2: Xem trước và các nút hành động */}
				<div className="flex-1 flex flex-col h-full min-h-0 document-editor-main" style={{ minWidth: '500px' }}>
					<div className="bg-white rounded-xl shadow-sm border h-full flex flex-col min-h-0">
						{/* Header với tiêu đề và nút */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
							<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
								<FaEye className="text-purple-600" />
								Xem trước
							</h3>
							<div className="flex gap-3">
								<button
									onClick={handleContinueEdit}
									disabled={!selectedDocument}
									className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
										selectedDocument
											? 'bg-blue-600 text-white hover:bg-blue-700'
											: 'bg-gray-300 text-gray-500 cursor-not-allowed'
									}`}
								>
									<FaEdit className="w-4 h-4" />
									Tiếp tục
								</button>
								<button
									onClick={handleNewDocument}
									className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
								>
									<FaPlus className="w-4 h-4" />
									Soạn thảo mới
								</button>
							</div>
						</div>

						{/* Nội dung xem trước */}
						<div className="flex-1 p-4 overflow-auto custom-scrollbar min-h-0">
							{selectedDocument || previewContent ? (
								<div className="bg-gray-50 rounded-lg p-4 h-full">
									<div className="bg-white rounded-lg shadow-sm h-full overflow-auto custom-scrollbar">
										<div dangerouslySetInnerHTML={{ __html: previewContent }} />
									</div>
								</div>
							) : (
								<div className="flex items-center justify-center h-full text-gray-500">
									<div className="text-center">
										<FaFileAlt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
										<p className="text-lg font-medium mb-2">Chưa chọn tài liệu hoặc mẫu</p>
										<p className="text-sm">Vui lòng chọn một tài liệu hoặc mẫu từ danh sách bên trái để xem trước</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Template Creation/Edit Popup */}
			{showTemplatePopup && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
					<div className="bg-white rounded-xl shadow-2xl min-w-5xl w-[70vw] max-h-[90vh] overflow-hidden my-auto">
						{/* Header */}
						<div className="bg-blue-600 text-white p-4">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-bold flex items-center gap-2">
									{editingTemplate ? 'Chỉnh sửa mẫu tài liệu' : 'Tạo mẫu tài liệu mới'}
								</h2>
								<button onClick={handleCloseTemplatePopup} className="transition-colors text-red-500">
									<FaTimes className="w-6 h-6" />
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-hidden">
							<div className="p-6 h-full">
								<div className="flex gap-6 h-full">
									{/* Left Column - Form Fields */}
									<div className="flex-shrink-0 overflow-y-auto" style={{ width: 'max(25%, 300px)' }}>
										{/* Mục 1: Thông tin mẫu biên bản */}
										<div className="mb-6">
											<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">
												1. Thông tin mẫu biên bản
											</h3>
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
														Tên mẫu biên bản <span className="text-red-500">*</span>
													</label>
													<input
														type="text"
														value={templateForm.name}
														onChange={(e) => handleTemplateFormChange('name', e.target.value)}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
														placeholder="Nhập tên mẫu biên bản"
													/>
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">Mô tả</label>
													<textarea
														value={templateForm.description}
														onChange={(e) => handleTemplateFormChange('description', e.target.value)}
														rows={3}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
														placeholder="Nhập mô tả cho mẫu biên bản"
													/>
												</div>
											</div>
										</div>

										{/* Mục 2: Thông tin tiêu đề */}
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
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
														Lần phát hành
													</label>
													<input
														type="text"
														value={templateForm.headerData.publishNo}
														onChange={(e) => handleTemplateFormChange('headerData.publishNo', e.target.value)}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
														placeholder="Nhập lần phát hành"
													/>
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1 text-left">
														Ngày phát hành
													</label>
													<input
														type="date"
														value={templateForm.headerData.publishDate}
														onChange={(e) => handleTemplateFormChange('headerData.publishDate', e.target.value)}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
													/>
												</div>
											</div>
										</div>
									</div>

									{/* Right Column - Editor */}
									<div className="flex-1 flex flex-col">
										<h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 text-left">
											3. Nội dung mẫu
										</h3>
										<div
											className="flex-1 overflow-hidden"
											style={{
												minHeight: '400px',
												display: 'flex',
												flexDirection: 'column',
												borderRadius: '4px',
											}}
										>
											<TinyMCEEditor
												ref={templateEditorRef}
												value={templateForm.content}
												onEditorChange={(content) => handleTemplateFormChange('content', content)}
												onInit={(evt, editor) => {
													templateEditorRef.current = editor;
													editor.initialized = true;
												}}
												init={{
													height: '100%',
													min_height: 400,
													max_height: 600,
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
													autoresize_max_height: 600,
													autoresize_min_height: 400,
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
														'quickbars',
													],
													toolbar:
														'blocks fontfamily fontsize bold italic underline strikethrough subscript superscript forecolor align lineheight checklist numlist bullist indent outdent anchor table tabledelete tableprops tablerowprops tablecellprops tableinsertrowbefore tableinsertrowafter tabledeleterow tableinsertcolbefore tableinsertcolafter tabledeletecol',
													content_style: `
												* {
												box-sizing: border-box !important;
												}
												body { 
												font-family: 'Times New Roman', Times, serif; 
												font-size: 16px; 
												line-height: 1.6;
												margin: 0;
												background: white;
												box-sizing: border-box;
												padding: 10mm;
												padding-top: 2mm;
												width: 100%;
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
												}
												table th {
												background-color: #f9f9f9;
												font-weight: bold;
												box-sizing: border-box;
												}
											`,
													table_default_attributes: {
														border: '1',
														cellpadding: '8',
														cellspacing: '0',
													},
													table_default_styles: {
														'border-collapse': 'collapse',
														border: '1px solid #ccc',
													},
													table_cell_default_styles: {
														border: '1px solid #ccc',
														padding: '8px',
														'vertical-align': 'top',
													},
													table_header_default_styles: {
														'background-color': '#f9f9f9',
														'font-weight': 'bold',
														border: '1px solid #ccc',
														padding: '8px',
													},
													table_resize_bars: true,
													table_grid: true,
													table_tab_navigation: true,
													table_class_list: [
														{ title: 'Không border', value: 'no-border' },
														{ title: 'Border mỏng', value: 'thin-border' },
														{ title: 'Border đậm', value: 'border-strong' },
														{ title: 'Bảng dữ liệu', value: 'data-table' },
													],
													table_cell_class_list: [
														{ title: 'Căn trái', value: 'text-left' },
														{ title: 'Căn giữa', value: 'text-center' },
														{ title: 'Căn phải', value: 'text-right' },
													],
													table_row_class_list: [
														{ title: 'Hàng header', value: 'header-row' },
														{ title: 'Hàng chẵn', value: 'even-row' },
														{ title: 'Hàng lẻ', value: 'odd-row' },
													],
													setup: function (editor) {
														editor.on('init', function () {
															// Mark editor as initialized
															if (templateEditorRef.current) {
																templateEditorRef.current.initialized = true;
															}
														});
													},
												}}
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Footer */}
							<div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
								<button
									onClick={handleCloseTemplatePopup}
									className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Hủy
								</button>
								<button
									onClick={formatTemplateContent}
									className="px-4 py-2 text-orange-700 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-2"
									title="Định dạng lại nội dung với font-size 16px"
								>
									<FaEraser className="w-4 h-4" />
									Format
								</button>
								<button
									onClick={handleSaveTemplate}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
								>
									<FaSave className="w-4 h-4" />
									{editingTemplate ? 'Cập nhật' : 'Tạo mẫu'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default DocumentEditor;
