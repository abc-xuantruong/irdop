import React, { useState, useEffect } from 'react';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import TemplateExperimentReport from '../lab/TemplateExperimentReport';

const ParameterInformation = ({ parameterName, protocolCode, matrix, onTemplateCreate, onTemplateEdit }) => {
	const [parameterInfo, setParameterInfo] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState('related');
	const [showTemplateModal, setShowTemplateModal] = useState(false);
	const [templateModalProps, setTemplateModalProps] = useState({});

	useEffect(() => {
		const fetchParameterInfo = async () => {
			if (!parameterName || !protocolCode) {
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const reqBody = {
					protocolCode,
					parameterName,
					...(matrix && { matrix }), // Chỉ thêm matrix nếu có giá trị
				};

				const response = await apiPost('https://black.irdop.org/v1/parameter/infomation/get', reqBody);

				if (response && response.data) {
					setParameterInfo(response.data);
				}
			} catch (err) {
				console.error('Error fetching parameter information:', err);
				setError('Không thể tải thông tin parameter. Vui lòng thử lại.');
			} finally {
				setLoading(false);
			}
		};

		fetchParameterInfo();
	}, [parameterName, protocolCode, matrix]);

	// Handle template create
	const handleTemplateCreate = (parameterName, protocolCode) => {
		const parameters = parameterName && protocolCode ? [{ parameterName, protocolCode }] : [];
		setTemplateModalProps({
			templateId: null,
			action: 'create',
			parameters: parameters,
		});
		setShowTemplateModal(true);
	};

	// Handle template edit
	const handleTemplateEdit = (templateId) => {
		setTemplateModalProps({
			templateId,
			action: 'edit',
		});
		setShowTemplateModal(true);
	};

	// Close template modal
	const handleCloseTemplateModal = () => {
		setShowTemplateModal(false);
		setTemplateModalProps({});
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center p-4">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<span className="ml-2 text-gray-600">Đang tải thông tin parameter...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-4">
				<div className="flex items-center">
					<div className="text-red-600">
						<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<p className="ml-2 text-red-700">{error}</p>
				</div>
			</div>
		);
	}

	if (!parameterInfo) {
		return <div className="text-gray-500 p-4">Không có dữ liệu parameter để hiển thị.</div>;
	}

	const { parameters, templates, performedAnalyses, performedCount } = parameterInfo;

	const formatDate = (dateString) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	};

	const tabs = [
		{ id: 'related', label: 'Phép thử liên quan', count: parameters?.length || 0 },
		{ id: 'recent', label: 'Thực hiện gần đây', count: performedCount || 0 },
		{ id: 'logs', label: 'Nhật ký thử nghiệm', count: templates?.length || 0 },
	];

	return (
		<>
			<div className="h-full flex flex-col min-w-[1200px]">
				{/* Sticky Header - Thông tin Parameter */}
				{/* Tab Navigation */}
				<div className="bg-white border-b border-gray-200 z-10">
					<div className="flex gap-1">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex-1 px-6 py-3 text-sm font-medium transition-colors relative ${
									activeTab === tab.id
										? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
										: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
								}`}
							>
								{tab.label}
								<span
									className={`ml-2 px-2 py-1 text-xs rounded-full ${
										activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
									}`}
								>
									{tab.count}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Tab Content */}
				<div className="flex-1 overflow-auto p-6">
					{/* Tab 1: Phép thử liên quan */}
					{activeTab === 'related' && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Danh sách phép thử liên quan</h3>
							<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
								<table className="w-full">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Tên chỉ tiêu
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Mã phương pháp
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Nền mẫu
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Nguồn phương pháp
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Kỹ thuật viên
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{parameters && parameters.length > 0 ? (
											parameters.map((param, index) => (
												<tr key={index} className="hover:bg-gray-50">
													<td className="px-4 py-3 text-left text-sm text-gray-900">{param.parameterName || '--'}</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">{param.protocolCode || '--'}</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">{param.matrix || '--'}</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">{param.protocolSource || '--'}</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">{param.technicianAlias || '--'}</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan="5" className="px-4 py-8 text-center text-gray-500">
													Không có dữ liệu phép thử liên quan
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Tab 2: Thực hiện gần đây */}
					{activeTab === 'recent' && (
						<div className="space-y-4">
							<div className="flex justify-between items-center ">
								<h3 className="text-lg font-semibold text-gray-900">Danh sách thực hiện gần đây</h3>
								{performedCount && <span className="text-sm text-gray-600">Tổng số: {performedCount}</span>}
							</div>
							<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
								<table className="w-full">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Mã mẫu
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Mã chỉ tiêu
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Ngày tạo
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Tên chỉ tiêu
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Nền mẫu
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Nguồn
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Phương pháp thử
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Kết quả
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Đơn vị
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Hạn trả
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Doc
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{performedAnalyses && performedAnalyses.length > 0 ? (
											performedAnalyses.map((analysis, index) => (
												<tr key={index} className="hover:bg-gray-50">
													<td className="px-4 py-3 text-left text-sm text-gray-900">{analysis.sampleId || '--'}</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">{analysis.id || '--'}</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">
														{analysis.createdAt ? formatDate(analysis.createdAt) : '--'}
													</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">
														{analysis.parameterName || '--'}
													</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">{analysis.matrix || '--'}</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">
														{analysis.protocolSource || '--'}
													</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">{analysis.protocolCode || '--'}</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">
														{analysis.resultValue ? (
															<div dangerouslySetInnerHTML={{ __html: analysis.resultValue }} />
														) : (
															'--'
														)}
													</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">
														{analysis.resultUnit ? (
															<div dangerouslySetInnerHTML={{ __html: analysis.resultUnit }} />
														) : (
															'--'
														)}
													</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">
														{analysis.deadline ? formatDate(analysis.deadline) : '--'}
													</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">{analysis.docId || '--'}</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan="11" className="px-4 py-8 text-center text-gray-500">
													Không có dữ liệu thực hiện gần đây
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Tab 3: Nhật ký thử nghiệm */}
					{activeTab === 'logs' && (
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<h3 className="text-lg font-semibold text-gray-900">Danh sách nhật ký thử nghiệm</h3>
								{templates && templates.length > 0 && (
									<span className="text-sm text-gray-600">Số mẫu nhật ký liên quan: {templates.length}</span>
								)}
							</div>
							<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
								{templates && templates.length > 0 ? (
									<table className="w-full">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Template ID
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Tên template
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Mô tả
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Hành động
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{templates.map((template, index) => (
												<tr key={index} className="hover:bg-gray-50">
													<td className="px-4 py-3 text-left text-sm text-gray-900">{template.id || '--'}</td>
													<td className="px-4 py-3 text-left text-sm font-medium text-blue-900">
														{template.templateName || '--'}
													</td>
													<td className="px-4 py-3 text-left text-sm text-gray-900">
														{template.templateDescription || '--'}
													</td>
													<td className="px-4 py-3 text-left text-sm">
														<button
															className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
															onClick={() => handleTemplateEdit(template.id)}
															title="Sửa template"
														>
															Sửa
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								) : (
									<div className="p-8 text-center">
										<p className="text-gray-500 mb-4">Chưa có mẫu nhật ký thử nghiệm</p>
										<button
											className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
											onClick={() => handleTemplateCreate(parameterName, protocolCode)}
										>
											Tạo mẫu nhật ký thử nghiệm
										</button>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Template Modal with higher z-index */}
			{showTemplateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
					<div className="w-[98vw] h-[98vh] overflow-y-auto bg-white rounded-lg shadow-lg relative">
						<TemplateExperimentReport {...templateModalProps} onClose={handleCloseTemplateModal} />
					</div>
				</div>
			)}
		</>
	);
};

export default ParameterInformation;
