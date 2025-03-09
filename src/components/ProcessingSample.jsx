import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import FilterBar from './FilterBar';
import TinyMceInput from './Input';
import { toast, ToastContainer } from 'react-toastify';

const ProcessingSample = () => {
	const { setCurrentTitlePage, formatDate, status, currentUser, technicians } = useContext(GlobalContext);
	const [viewMode, setViewMode] = useState('v1');
	const [processingSample, setProcessingSample] = useState(null);
	const [originalProcessingSample, setOriginalProcessingSample] = useState(null); // Add original list
	const [visibleTables, setVisibleTables] = useState({});
	const [selectedAnalysis, setSelectedAnalysis] = useState(null);
	const [editableCell, setEditableCell] = useState({ parameterId: null, row: null, column: null, analysisId: null });
	const [inputValue, setInputValue] = useState('');
	const [isFilter, setIsFilter] = useState(false); // Add state to track if filtering is active
	let isFetch = false;

	const fetchData = async (vm = viewMode) => {
		try {
			if (vm === 'v1') {
				const response = await apiGet('https://black.irdop.org/to82oe92i/db/get/processing_sample/v1');
				// Store original data
				setOriginalProcessingSample(response.data);
				// If no filter is active, update the displayed data as well
				if (!isFilter) {
					setProcessingSample(response.data);
				}
			} else {
				const response = await apiGet('https://black.irdop.org/to82oe92i/db/get/processing_sample/v2');
				// Store original data
				setOriginalProcessingSample(response.data);
				// If no filter is active, update the displayed data as well
				if (!isFilter) {
					setProcessingSample(response.data);
				}
				console.log(response.data);
			}
		} catch (error) {
			console.error('Error fetching processing samples:', error);
		}
	};

	useEffect(() => {
		if (!isFetch) {
			setCurrentTitlePage('Mẫu đang xử lý');
			fetchData(viewMode);
			isFetch = true;
		}
	}, [viewMode]);

	useEffect(() => {
		const interval = setInterval(() => {
			// Always fetch data to update the original list
			fetchData(viewMode);
		}, 60000);

		return () => clearInterval(interval);
	}, [viewMode, isFilter]); // Re-run effect when viewMode or isFilter changes

	const handleViewModeChange = async (mode) => {
		setViewMode(mode);
		await fetchData(mode);
	};

	const toggleTableVisibility = (id) => {
		setVisibleTables((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const handleAnalysisClick = (analysis) => {
		setSelectedAnalysis(analysis);
	};

	const closeForm = () => {
		setSelectedAnalysis(null);
	};

	const saveAnalysis = async () => {
		try {
			await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: {
					...selectedAnalysis,
					modified_by_uid: currentUser.identity_uid,
				},
			});
			console.log('Analysis saved:', selectedAnalysis);
		} catch (error) {
			console.error('Error saving analysis:', error);
		}
		closeForm();
	};

	const handleCellClick = (parameterId, rowIndex, column, analysisId) => {
		setEditableCell({ parameterId, row: rowIndex, column, analysisId });
		const parameter = processingSample.find((p) => p.id === parameterId);
		setInputValue(parameter.analyses.find((a) => a.id === analysisId)[column] || '');
	};

	const handleSaveContent = async (content, column) => {
		const updatedSample = [...processingSample];
		const parameter = updatedSample.find((p) => p.id === editableCell.parameterId);
		const analysisIndex = parameter.analyses.findIndex((a) => a.id === editableCell.analysisId);
		parameter.analyses[analysisIndex][column] = content;
		setProcessingSample(updatedSample);

		try {
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: {
					...parameter.analyses[analysisIndex],
					modified_by_uid: currentUser.identity_uid,
				},
			});
			if (response.status === 200) {
				toast.success('Cập nhật kết quả thành công');
			} else {
				toast.error('Lỗi khi cập nhật kết quả');
			}
		} catch (error) {
			toast.error('Lỗi khi cập nhật kết quả');
		}

		setEditableCell({ parameterId: null, row: null, column: null, analysisId: null });
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			// handleSaveContent(inputValue, editableCell.column);
			e.target.blur(); // Remove focus from the input
		}
	};

	const handleFormCellClick = (field) => {
		setEditableCell({ ...editableCell, column: field });
		setInputValue(selectedAnalysis[field] || '');
	};

	const handleFormSaveContent = (content, field) => {
		setSelectedAnalysis({ ...selectedAnalysis, [field]: content });
		setEditableCell({ ...editableCell, column: null });
	};

	const moveAnalysisButton = async (parameterId, analysisId, targetStatus) => {
		const updatedSample = [...processingSample];
		const parameter = updatedSample.find((p) => p.id == parameterId);
		const analysis = parameter.analyses.find((a) => a.id == analysisId);
		analysis.status = targetStatus;

		const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', {
			sample: {
				id: analysis.sample_id,
				status: targetStatus,
				modified_by_uid: currentUser.identity_uid,
			},
		});
		if (response.status === 200) {
			toast.success(`Cập nhập trạng thái mẫu thành công`);
		} else {
			toast.error(`Cập nhập trạng thái mẫu thất bại`);
		}
		setProcessingSample(updatedSample);
	};

	const handleDragStart = (e, parameterId, analysisId) => {
		e.dataTransfer.setData('parameterId', parameterId);
		e.dataTransfer.setData('analysisId', analysisId);
	};

	const handleDrop = (e, targetStatus) => {
		const parameterId = e.dataTransfer.getData('parameterId');
		const analysisId = e.dataTransfer.getData('analysisId');
		console.log('parameterId:', parameterId);
		console.log('analysisId:', analysisId);
		console.log('targetStatus:', targetStatus);
		moveAnalysisButton(parameterId, analysisId, targetStatus);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleCellClickV2 = (sampleId, analysisId, column, statusSample) => {
		setEditableCell({ sampleId, analysisId, column, statusSample });
		const sample = processingSample[statusSample].find((s) => s.sample_uid === sampleId);
		setInputValue(sample.analyses.find((a) => a.id === analysisId)[column] || '');
	};

	const handleSaveContentV2 = async (content, column) => {
		const updatedSample = { ...processingSample };
		const sample = updatedSample[editableCell.statusSample].find((s) => s.sample_uid === editableCell.sampleId);
		const analysis = sample.analyses.find((a) => a.id === editableCell.analysisId);
		analysis[column] = content;

		try {
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: {
					...analysis,
					modified_by_uid: currentUser.identity_uid,
				},
			});
			if (response.status == 200) toast.success('Cập nhật kết quả thành công');
		} catch (error) {
			toast.error('Lỗi khi cập nhật kết quả');
		}

		setProcessingSample(updatedSample);
		setEditableCell({ sampleId: null, analysisId: null, column: null, statusSample: null });
	};

	const handleKeyDownV2 = (e) => {
		if (e.key === 'Enter') {
			setEditableCell({ sampleId: null, analysisId: null, column: null, statusSample: null });
			// handleSaveContentV2(inputValue, editableCell.column);
		}
	};

	const getTechnicianName = (technician_uid) => {
		if (!technician_uid) return '----';
		const technician = technicians?.find((tech) => tech.identity_uid === technician_uid);
		return technician ? technician.identity_name : '----';
	};

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			<Breadcrumb paths={[{}]} />

			<div className="w-full h-full flex justify-between items-center rounded-lg mb-2">
				<div>
					<h2 className="text-lg font-medium">Chế độ hiển thị</h2>
				</div>
				<div>
					<button
						className={`w-40 p-1 ml-1 text-sm font-medium active:bg-sky-400 focus:outline-none ${
							viewMode === 'v1' ? 'bg-teritary' : 'bg-gray-200'
						}`}
						onClick={() => handleViewModeChange('v1')}
					>
						Chỉ tiêu
					</button>
					<button
						className={`w-40 p-1 ml-1 text-sm font-medium focus:outline-none active:bg-sky-400 ${
							viewMode === 'v2' ? 'bg-teritary' : 'bg-gray-200'
						}`}
						onClick={() => handleViewModeChange('v2')}
					>
						Mẫu thử
					</button>
					<button
						className={`w-40 p-1 ml-1 text-sm font-medium focus:outline-none active:bg-sky-400 ${
							viewMode === 'v3' ? 'bg-teritary' : 'bg-gray-200'
						}`}
						onClick={() => handleViewModeChange('v3')}
					>
						Tiếp nhận
					</button>
				</div>
			</div>
			<div className="w-full h-full flex flex-col justify-center items-center bg-white rounded-lg p-4 shadow">
				<FilterBar
					source={originalProcessingSample} // Pass the original list to FilterBar
					setCurrentList={setProcessingSample}
					typeSearch={`${viewMode === 'v1' ? 'processing_v1' : 'processing_v2'}`}
					setIsFilter={setIsFilter} // Pass the setIsFilter function
				/>
				{selectedAnalysis && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-0"
						onClick={closeForm}
					>
						<div className="bg-white p-4 rounded-lg shadow-lg w-96" onClick={(e) => e.stopPropagation()}>
							<h2 className="text-lg font-medium mb-4">Chi tiết phân tích</h2>
							<div className="mb-2 flex items-center h-10">
								<label className="text-start block text-sm font-medium w-24">Mã mẫu</label>
								<input
									type="text"
									value={selectedAnalysis.sample_uid}
									className="text-start w-full p-2 border rounded-lg bg-white "
									readOnly
								/>
							</div>
							<div className="mb-2 flex items-center">
								<label className="text-start block text-sm font-medium w-24">Kết quả</label>
								<div className="w-full h-10" onClick={() => handleFormCellClick('result_value')}>
									{editableCell.column === 'result_value' ? (
										<TinyMceInput
											value={inputValue}
											onUpdate={(content) => handleFormSaveContent(content, 'result_value')}
											onKey={handleKeyDown}
										/>
									) : (
										<div
											dangerouslySetInnerHTML={{ __html: `${selectedAnalysis.result_value || '--'}` }}
											className="p-2 text-start border rounded-lg bg-white cursor-pointer"
										/>
									)}
								</div>
							</div>
							<div className="mb-2 flex items-center">
								<label className="text-start block text-sm font-medium w-24">Đơn vị</label>
								<div className="w-full h-10" onClick={() => handleFormCellClick('result_unit')}>
									{editableCell.column === 'result_unit' ? (
										<TinyMceInput
											value={inputValue}
											onUpdate={(content) => handleFormSaveContent(content, 'result_unit')}
											onKey={handleKeyDown}
										/>
									) : (
										<div
											dangerouslySetInnerHTML={{ __html: `${selectedAnalysis.result_unit || '--'}` }}
											className="p-2 text-start border rounded-lg bg-white cursor-pointer"
										/>
									)}
								</div>
							</div>
							<div className="mb-2 flex items-center">
								<label className="text-start block text-sm font-medium w-24">LOD/LOQ</label>
								<div className="w-full h-10" onClick={() => handleFormCellClick('lodq')}>
									{editableCell.column === 'lodq' ? (
										<TinyMceInput
											value={inputValue}
											onUpdate={(content) => handleFormSaveContent(content, 'lodq')}
											onKey={handleKeyDown}
										/>
									) : (
										<div
											dangerouslySetInnerHTML={{ __html: `${selectedAnalysis.lodq || '--'}` }}
											className="p-2 text-start border rounded-lg bg-white cursor-pointer"
										/>
									)}
								</div>
							</div>
							<div className="mb-2 flex items-center">
								<label className="text-start block text-sm font-medium w-24">Hạn trả</label>
								<input
									type="text"
									value={selectedAnalysis.deadline ? formatDate(selectedAnalysis.deadline) : ''}
									className="w-full p-2 border rounded-lg bg-white"
									readOnly
								/>
							</div>
							<div className="flex justify-end">
								<button
									className="active:bg-sky-400 border-slate-200 px-2 py-1 w-20 rounded-lg mr-2"
									onClick={closeForm}
								>
									Đóng
								</button>
								<button className="active:bg-sky-400 border-slate-200 px-2 py-1 w-20 rounded-lg" onClick={saveAnalysis}>
									Lưu
								</button>
							</div>
						</div>
					</div>
				)}
				<div className="w-full">
					{viewMode === 'v1' ? (
						<>
							<div>
								{processingSample?.length > 0 &&
									processingSample.map((parameter, rowIndex) => (
										<div key={parameter.id} className="flex flex-col p-0 border rounded-lg mb-4 mt-1">
											<div className="flex">
												<div
													onClick={() => {
														visibleTables[parameter.id] && toggleTableVisibility(parameter.id);
													}}
													className={`text-base border-r-2 max-w-64 md:min-w-64 min-w-40 p-2 pt-0 hover:bg-slate-50 ${
														visibleTables[parameter.id] && ' cursor-pointer'
													}`}
												>
													<p className="text-start font-semibold text-primary text-wrap line-clamp-2">
														{parameter.parameter_name}
													</p>
													<span className="flex line-clamp-1">
														<p className="text-gray-500 font-medium mr-1">
															{parameter?.protocol_source ? `${parameter.protocol_source}:` : ''}
														</p>
														<p className="font-medium">{parameter.protocol_code}</p>
													</span>
													<p className="text-start text-sm font-semibold line-clamp-1">{parameter.matrix}</p>
													<button
														onClick={() => toggleTableVisibility(parameter.id)}
														className={`text-center border-slate-200 w-full border-2 p-1 py-0.5 text-sm font-semibold line-clamp-1 focus:outline-none ${
															visibleTables[parameter.id] && 'hidden'
														}`}
													>
														Danh sách mẫu
													</button>
												</div>
												<div className="flex flex-col w-full rounded-lg p-0.5 ml-0.5 h-fit min-h-20 text-sm overflow-auto">
													<div className="flex min-w-[420px]">
														<div
															className="md:pr-1 w-[140px] min-w-[140px] min-h-full"
															onDrop={(e) => handleDrop(e, 3)}
															onDragOver={handleDragOver}
														>
															<div className="h-fit flex flex-col ">
																{parameter.analyses.map(
																	(analysis) =>
																		analysis.status === 3 && (
																			<button
																				key={analysis.id}
																				className={`bg-slate-50 border-2 hover:bg-teritary p-0.5 rounded-lg font-medium m-0.5 w-[130px] h-12 ${
																					analysis?.result_value
																						? 'border-primary'
																						: new Date(analysis.deadline) < new Date()
																						? 'border-red-500'
																						: 'border-teritary'
																				}`}
																				draggable
																				onDragStart={(e) => handleDragStart(e, parameter.id, analysis.id)}
																				onClick={() => handleAnalysisClick(analysis)}
																			>
																				{analysis.sample_uid} <br />
																				{getTechnicianName(analysis.technician_uid)}
																			</button>
																		),
																)}
															</div>
														</div>

														<div
															className="min-h-full border-x-2 px-1 w-full min-w-[140px] justify-start"
															onDrop={(e) => handleDrop(e, 2)}
															onDragOver={handleDragOver}
														>
															<div className="h-fit flex flex-wrap ">
																{parameter.analyses.map(
																	(analysis) =>
																		analysis.status === 2 && (
																			<button
																				key={analysis.id}
																				className={`bg-slate-50 border-2 hover:bg-teritary p-0.5 rounded-lg font-medium m-0.5 w-[130px] h-12 ${
																					analysis?.result_value
																						? 'border-primary'
																						: new Date(analysis.deadline) < new Date()
																						? 'border-red-500'
																						: 'border-teritary'
																				}`}
																				draggable
																				onDragStart={(e) => handleDragStart(e, parameter.id, analysis.id)}
																				onClick={() => handleAnalysisClick(analysis)}
																			>
																				{analysis.sample_uid} <br />
																				{getTechnicianName(analysis.technician_uid)}
																			</button>
																		),
																)}
															</div>
														</div>

														<div
															className=" pl-1 xl:w-[280px] min-w-[140px] w-[140px] xl:min-w-[280px] min-h-full"
															onDrop={(e) => handleDrop(e, 1)}
															onDragOver={handleDragOver}
														>
															<div className="flex flex-wrap h-fit">
																{parameter.analyses.map(
																	(analysis) =>
																		analysis.status === 1 && (
																			<button
																				key={analysis.id}
																				className={`bg-slate-50 border-2 hover:bg-teritary p-0.5 rounded-lg font-medium m-0.5 w-[130px] h-12 ${
																					analysis?.result_value
																						? 'border-primary'
																						: new Date(analysis.deadline) < new Date()
																						? 'border-red-500'
																						: 'border-teritary'
																				}`}
																				draggable
																				onDragStart={(e) => handleDragStart(e, parameter.id, analysis.id)}
																				onClick={() => handleAnalysisClick(analysis)}
																			>
																				{analysis.sample_uid} <br />
																				{getTechnicianName(analysis.technician_uid)}
																			</button>
																		),
																)}
															</div>
														</div>
													</div>
													{visibleTables[parameter.id] && (
														<table className="w-full border-collapse border border-gray-200 mt-1">
															<thead>
																<tr>
																	<th className="border p-2 min-w-32">Mã mẫu</th>
																	<th className="border p-2 min-w-20">Kết quả</th>
																	<th className="border p-2 min-w-24">Đơn vị</th>
																	<th className="border p-2 min-w-24">LOD/LOQ</th>
																	<th className="border p-2 min-w-28">Hạn trả</th>
																</tr>
															</thead>
															<tbody>
																{parameter.analyses.map((analysis, sampleIndex) => (
																	<tr key={analysis.id}>
																		<td className="border p-2">{analysis.sample_uid}</td>
																		<td
																			className="p-1 pb-0 border relative"
																			onClick={() =>
																				handleCellClick(parameter.id, sampleIndex, 'result_value', analysis.id)
																			}
																		>
																			<div className="hover:border-purple-500 hover:border rounded">
																				{editableCell.parameterId === parameter.id &&
																				editableCell.row === sampleIndex &&
																				editableCell.column === 'result_value' &&
																				editableCell.analysisId === analysis.id ? (
																					<TinyMceInput
																						value={inputValue}
																						onUpdate={(content) => handleSaveContent(content, 'result_value')}
																						onKey={handleKeyDown}
																					/>
																				) : (
																					<div
																						dangerouslySetInnerHTML={{ __html: `${analysis.result_value || '--'}` }}
																						className="p-1"
																					/>
																				)}
																			</div>
																		</td>
																		<td
																			className="p-1 pb-0 border relative"
																			onClick={() =>
																				handleCellClick(parameter.id, sampleIndex, 'result_unit', analysis.id)
																			}
																		>
																			<div className="hover:border-purple-500 hover:border rounded">
																				{editableCell.parameterId === parameter.id &&
																				editableCell.row === sampleIndex &&
																				editableCell.column === 'result_unit' &&
																				editableCell.analysisId === analysis.id ? (
																					<TinyMceInput
																						value={inputValue}
																						onUpdate={(content) => handleSaveContent(content, 'result_unit')}
																						onKey={handleKeyDown}
																					/>
																				) : (
																					<div
																						dangerouslySetInnerHTML={{ __html: `${analysis.result_unit || '--'}` }}
																						className="p-1"
																					/>
																				)}
																			</div>
																		</td>
																		<td
																			className="p-1 pb-0 border relative"
																			onClick={() => handleCellClick(parameter.id, sampleIndex, 'lodq', analysis.id)}
																		>
																			<div className="hover:border-purple-500 hover:border rounded">
																				{editableCell.parameterId === parameter.id &&
																				editableCell.row === sampleIndex &&
																				editableCell.column === 'lodq' &&
																				editableCell.analysisId === analysis.id ? (
																					<TinyMceInput
																						value={inputValue}
																						onUpdate={(content) => handleSaveContent(content, 'lodq')}
																						onKey={handleKeyDown}
																					/>
																				) : (
																					<div
																						dangerouslySetInnerHTML={{ __html: `${analysis.lodq || '--'}` }}
																						className="p-1"
																					/>
																				)}
																			</div>
																		</td>
																		<td className="border p-2">
																			{analysis.deadline ? formatDate(analysis.deadline) : 'N/A'}
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													)}
												</div>
											</div>
										</div>
									))}
							</div>
						</>
					) : (
						viewMode === 'v2' &&
						processingSample?.expired && (
							<div className="w-full min-h-20 flex flex-col justify-between">
								{['expired', 'expiringSoon', 'active'].map((statusDeadline, index) => (
									<div key={statusDeadline} className="w-full mb-4 flex flex-wrap justify-between">
										<h2 className="text-xl font-medium mb-2 w-full text-start text-primary">
											{['Đã quá hạn', 'Sắp hết hạn (dưới 2 ngày)', 'Mẫu thường'][index]}
										</h2>
										{processingSample[statusDeadline].map((sample) => (
											<div
												key={sample.sample_uid}
												className="p-2 border rounded-lg mb-4 flex items-start  lg:w-[49.5%] w-full lg:overflow-hidden overflow-auto"
											>
												<div className="text-start">
													<button className="bg-slate-50 border-2 border-sky-500 p-1 max-h-fit rounded-md min-w-32 text-start">
														{sample.sample_uid}
													</button>
													<p className="text-primary font-medium line-clamp-2">{sample.matrix}</p>
													<p className={`${sample.status === 3 ? 'text-red-500 font-semibold' : ''} `}>
														{status[sample.status]}
													</p>
												</div>
												{Array.isArray(sample.analyses) ? (
													<table className="w-full border-collapse border border-gray-300 ml-1 text-sm min-w-[450px] md:min-w-[340px]">
														<thead>
															<tr className="bg-gray-100">
																<th className="border p-1 text-start w-[84px]">Hạn trả</th>
																<th className="border p-1 text-start">Phép thử</th>
																<th className="border p-1 text-start w-20">Đơn vị</th>
																<th className="border p-1 text-start w-20">Kết quả</th>
															</tr>
														</thead>
														<tbody>
															{sample.analyses.map((item) => (
																<tr key={item.id} className="border">
																	<td className="border p-1 text-start">{formatDate(item.deadline)}</td>
																	<td className="border p-1 text-start">
																		<span>
																			<p className="line-clamp-2">{item.parameter_name}</p>
																			<p className="text-slate-500 hover:text-black hover:font-semibold cursor-pointer">
																				{item.protocol_code}
																			</p>
																		</span>
																	</td>
																	<td
																		className="border p-1 text-start"
																		onClick={() =>
																			handleCellClickV2(sample.sample_uid, item.id, 'result_unit', statusDeadline)
																		}
																	>
																		<div className="hover:border-purple-500 hover:border rounded">
																			{editableCell.sampleId === sample.sample_uid &&
																			editableCell.analysisId === item.id &&
																			editableCell.column === 'result_unit' ? (
																				<TinyMceInput
																					value={inputValue}
																					onUpdate={(content) => handleSaveContentV2(content, 'result_unit')}
																					onKey={handleKeyDownV2}
																				/>
																			) : (
																				<div dangerouslySetInnerHTML={{ __html: `${item.result_unit || '--'}` }} />
																			)}
																		</div>
																	</td>
																	<td
																		className="border p-1 text-start"
																		onClick={() =>
																			handleCellClickV2(sample.sample_uid, item.id, 'result_value', statusDeadline)
																		}
																	>
																		<div className="hover:border-purple-500 hover:border rounded">
																			{editableCell.sampleId === sample.sample_uid &&
																			editableCell.analysisId === item.id &&
																			editableCell.column === 'result_value' ? (
																				<TinyMceInput
																					value={inputValue}
																					onUpdate={(content) => handleSaveContentV2(content, 'result_value')}
																					onKey={handleKeyDownV2}
																				/>
																			) : (
																				<div dangerouslySetInnerHTML={{ __html: `${item.result_value || '--'}` }} />
																			)}
																		</div>
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												) : (
													<></>
												)}
											</div>
										))}
									</div>
								))}
							</div>
						)
					)}
				</div>
			</div>
		</div>
	);
};

export default ProcessingSample;
