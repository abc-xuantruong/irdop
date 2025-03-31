import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import FilterBar from './FilterBar';
import TinyMceInput from './Input';
import { toast, ToastContainer } from 'react-toastify';
import { MdOutlineViewList, MdViewModule } from 'react-icons/md';
import { FaCheck, FaSave, FaUndo } from 'react-icons/fa';

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
	const [selectedForReview, setSelectedForReview] = useState([]);
	const [reviewAllChecked, setReviewAllChecked] = useState(false);
	const [showReviewSaveButton, setShowReviewSaveButton] = useState(false);
	const [isReviewConfirmVisible, setIsReviewConfirmVisible] = useState(false);
	const [samplesWithPendingReviews, setSamplesWithPendingReviews] = useState({});
	const navigate = useNavigate();
	const location = useLocation();
	let isFetch = false;

	const fetchData = async (vm = viewMode) => {
		try {
			if (vm === 'v1') {
				const response = await apiGet('https://black.irdop.org/to82oe92i/db/get/processing_sample/v1');
				// Ensure data is an array before setting state
				const data = Array.isArray(response?.data) ? response.data : [];
				// Store original data
				setOriginalProcessingSample(data);
				// If no filter is active, update the displayed data as well
				if (!isFilter) {
					setProcessingSample(data);
				}
			} else {
				const response = await apiGet('https://black.irdop.org/to82oe92i/db/get/processing_sample/v2');
				// Ensure data is an array before setting state
				const data = Array.isArray(response?.data) ? response.data : [];
				// Store original data
				setOriginalProcessingSample(data);
				// If no filter is active, update the displayed data as well
				if (!isFilter) {
					setProcessingSample(data);
				}
			}
		} catch (error) {
			console.error('Error fetching processing samples:', error);
			// Set empty arrays on error to avoid undefined
			setOriginalProcessingSample([]);
			if (!isFilter) {
				setProcessingSample([]);
			}
		}
	};

	useEffect(() => {
		if (!isFetch) {
			setCurrentTitlePage('Mẫu đang xử lý');

			// Get view mode from URL query parameter
			const queryParams = new URLSearchParams(location.search);
			const modeFromQuery = queryParams.get('mode');

			// Set view mode based on query parameter or default to 'v1'
			const initialViewMode = modeFromQuery === 'v1' || modeFromQuery === 'v2' ? modeFromQuery : 'v1';
			setViewMode(initialViewMode);

			fetchData(initialViewMode);
			isFetch = true;
		}
	}, [location.search]);

	useEffect(() => {
		const interval = setInterval(() => {
			// Always fetch data to update the original list
			fetchData(viewMode);
		}, 60000);

		return () => clearInterval(interval);
	}, [viewMode, isFilter]); // Re-run effect when viewMode or isFilter changes

	const handleViewModeChange = async (mode) => {
		setViewMode(mode);
		// Update URL with the new view mode
		navigate(`?mode=${mode}`, { replace: true });
		await fetchData(mode);
	};

	const toggleTableVisibility = (id) => {
		setVisibleTables((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const handleAnalysisClick = (analysis, parameterName) => {
		setSelectedAnalysis({ ...analysis, parameterName });
	};

	const closeForm = () => {
		setSelectedAnalysis(null);
	};

	const saveAnalysis = async () => {
		try {
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: {
					...selectedAnalysis,
					modified_by_uid: currentUser.identity_uid,
				},
			});

			if (response.status === 200) {
				// Update the displayed data
				const updatedSample = [...processingSample];
				const parameter = updatedSample.find((p) => p.analyses.some((a) => a.id === selectedAnalysis.id));
				if (parameter) {
					const analysisIndex = parameter.analyses.findIndex((a) => a.id === selectedAnalysis.id);
					parameter.analyses[analysisIndex] = selectedAnalysis;
					setProcessingSample(updatedSample);
				}
				toast.success('Cập nhật thành công');
			} else {
				toast.error('Lỗi khi cập nhật kết quả');
			}
		} catch (error) {
			console.error('Error saving analysis:', error);
			toast.error('Lỗi khi cập nhật kết quả');
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
		// Ensure we have valid data before proceeding
		if (!Array.isArray(processingSample)) {
			toast.error('Dữ liệu không hợp lệ');
			return;
		}

		const updatedSample = [...processingSample];
		const parameter = updatedSample.find((p) => p?.id == parameterId);

		if (!parameter || !Array.isArray(parameter.analyses)) {
			toast.error('Không tìm thấy thông tin chỉ tiêu');
			return;
		}

		const analysis = parameter.analyses.find((a) => a?.id == analysisId);

		if (!analysis) {
			toast.error('Không tìm thấy thông tin phân tích');
			return;
		}

		const sampleUid = analysis.sample_uid;

		// Update status for all analyses with the same sample_uid across all parameters
		updatedSample.forEach((param) => {
			if (param?.analyses && Array.isArray(param.analyses)) {
				param.analyses.forEach((a) => {
					if (a && a.sample_uid === sampleUid) {
						a.status = targetStatus;
					}
				});
			}
		});

		try {
			const response = await apiPost('https://black.irdop.org/to82oe92i/db/update/sample', {
				sample: {
					id: analysis.sample_id,
					status: targetStatus,
					modified_by_uid: currentUser?.identity_uid || '',
				},
			});
			if (response?.status === 200) {
				toast.success(`Cập nhập trạng thái mẫu thành công`);
				setProcessingSample(updatedSample);
			} else {
				toast.error(`Cập nhập trạng thái mẫu thất bại`);
			}
		} catch (error) {
			console.error('Error updating sample status:', error);
			toast.error(`Cập nhập trạng thái mẫu thất bại: ${error.message || 'Lỗi kết nối'}`);
		}
	};

	const handleDragStart = (e, parameterId, analysisId) => {
		e.dataTransfer.setData('parameterId', parameterId);
		e.dataTransfer.setData('analysisId', analysisId);
	};

	const handleDrop = (e, targetStatus) => {
		const parameterId = e.dataTransfer.getData('parameterId');
		const analysisId = e.dataTransfer.getData('analysisId');
		moveAnalysisButton(parameterId, analysisId, targetStatus);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleCellClickV2 = (sampleId, analysisId, column) => {
		setEditableCell({ sampleId, analysisId, column });

		// Find the sample and analysis in the flattened structure
		const sample = processingSample.find((s) => s.sample_uid === sampleId);
		const analysis = sample?.analysis?.find((a) => a.id === analysisId);

		setInputValue(analysis?.[column] || '');
	};

	const handleSaveContentV2 = async (content, column) => {
		if (!processingSample || !Array.isArray(processingSample) || !editableCell) {
			toast.error('Dữ liệu không hợp lệ');
			return;
		}

		const updatedSamples = [...processingSample];
		const sampleIndex = updatedSamples.findIndex((s) => s?.sample_uid === editableCell.sampleId);

		if (
			sampleIndex === -1 ||
			!updatedSamples[sampleIndex]?.analysis ||
			!Array.isArray(updatedSamples[sampleIndex].analysis)
		) {
			toast.error('Không tìm thấy mẫu');
			return;
		}

		const analysisIndex = updatedSamples[sampleIndex].analysis.findIndex((a) => a?.id === editableCell.analysisId);

		if (analysisIndex === -1) {
			toast.error('Không tìm thấy phân tích');
			return;
		}

		updatedSamples[sampleIndex].analysis[analysisIndex][column] = content;

		try {
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/update/analysis', {
				analysis: {
					...updatedSamples[sampleIndex].analysis[analysisIndex],
					modified_by_uid: currentUser?.identity_uid || '',
				},
			});
			if (response?.status == 200) toast.success('Cập nhật kết quả thành công');
			setProcessingSample(updatedSamples);
		} catch (error) {
			toast.error(`Lỗi khi cập nhật kết quả: ${error.message || 'Lỗi kết nối'}`);
		}

		setEditableCell({ sampleId: null, analysisId: null, column: null });
	};

	const handleKeyDownV2 = (e) => {
		if (e.key === 'Enter') {
			setEditableCell({ sampleId: null, analysisId: null, column: null });
			// handleSaveContentV2(inputValue, editableCell.column);
		}
	};

	const getTechnicianName = (technician_uid) => {
		if (!technician_uid) return '----';
		const technician = technicians?.find((tech) => tech.identity_uid === technician_uid);
		return technician ? technician.identity_name : '----';
	};

	// Function to categorize samples based on deadline
	const categorizeSamples = (samples) => {
		if (!samples || !Array.isArray(samples)) return { expired: [], expiringSoon: [], active: [] };

		const currentDate = new Date();
		const twoDaysFromNow = new Date();
		twoDaysFromNow.setDate(currentDate.getDate() + 2);

		const categorized = { expired: [], expiringSoon: [], active: [] };

		samples.forEach((sample) => {
			// Find the earliest deadline among all analyses
			const deadlines = sample.analysis?.map((a) => new Date(a.deadline)) || [];
			// If no deadlines or invalid dates, default to active
			if (deadlines.length === 0) {
				categorized.active.push(sample);
				return;
			}

			const earliestDeadline = new Date(Math.min(...deadlines.filter((d) => !isNaN(d.getTime()))));

			if (earliestDeadline < currentDate) {
				categorized.expired.push({ ...sample, analyses: sample.analysis });
			} else if (earliestDeadline <= twoDaysFromNow) {
				categorized.expiringSoon.push({ ...sample, analyses: sample.analysis });
			} else {
				categorized.active.push({ ...sample, analyses: sample.analysis });
			}
		});

		return categorized;
	};

	useEffect(() => {
		// Update samples with pending reviews based on selectedForReview
		const pendingSamples = {};

		selectedForReview.forEach((id) => {
			// Find which sample this analysis belongs to
			processingSample?.forEach((sample) => {
				if (sample?.analysis && Array.isArray(sample.analysis)) {
					sample.analysis.forEach((analysis) => {
						if (Math.abs(id) === analysis.id) {
							pendingSamples[sample.sample_uid] = true;
						}
					});
				}
			});
		});

		setSamplesWithPendingReviews(pendingSamples);
	}, [selectedForReview, processingSample]);

	// Toggle review checkbox for a single analysis
	const handleReviewSelect = (analysisId, isChecked, sampleUid) => {
		// Get the item to check if it's already reviewed
		const allAnalyses = [];
		processingSample.forEach((sample) => {
			if (sample?.analysis && Array.isArray(sample.analysis)) {
				allAnalyses.push(...sample.analysis);
			}
		});

		const analysis = allAnalyses.find((a) => a.id === analysisId);

		// If already reviewed, handle differently
		if (analysis?.reviewed_by) {
			// Add to selectedForReview with negative ID to mark for unreview
			setSelectedForReview((prev) => {
				// If already in the list for unreview, remove it
				if (prev.includes(-analysisId)) {
					return prev.filter((id) => id !== -analysisId);
				}
				// Otherwise add it as negative to mark for unreview
				return [...prev, -analysisId];
			});
		} else {
			setSelectedForReview((prev) => {
				if (isChecked) {
					return [...prev, analysisId];
				} else {
					return prev.filter((id) => id !== analysisId);
				}
			});
		}
	};

	// Toggle all review checkboxes for a specific sample
	const handleReviewSelectAll = (sampleUid) => {
		if (viewMode === 'v2' && Array.isArray(processingSample)) {
			const sample = processingSample.find((s) => s.sample_uid === sampleUid);

			if (!sample || !sample.analysis || !Array.isArray(sample.analysis)) {
				return;
			}

			const analysisIds = sample.analysis.map((a) => a.id);
			const selectedIds = selectedForReview.filter(
				(id) =>
					// Only consider positive IDs
					id > 0 &&
					// Only include IDs that belong to this sample
					analysisIds.includes(id),
			);

			// Check if all analyses in this sample are already selected
			const allSelected = selectedIds.length === analysisIds.length;

			if (allSelected) {
				// If all are selected, remove them all
				setSelectedForReview((prev) => prev.filter((id) => !analysisIds.includes(Math.abs(id))));
			} else {
				// Otherwise, add all analyses from this sample (removing any negative selections)
				const newSelectedForReview = [...selectedForReview.filter((id) => !analysisIds.includes(Math.abs(id)))];
				analysisIds.forEach((id) => {
					const analysis = sample.analysis.find((a) => a.id === id);
					// Only add if not already reviewed
					if (!analysis.reviewed_by) {
						newSelectedForReview.push(id);
					}
				});
				setSelectedForReview(newSelectedForReview);
			}
		}
	};

	// Check if all analyses in a sample are selected
	const areAllAnalysesSelectedInSample = (sampleUid) => {
		const sample = processingSample?.find((s) => s.sample_uid === sampleUid);

		if (!sample || !sample.analysis || !Array.isArray(sample.analysis)) {
			return false;
		}

		const nonReviewedAnalyses = sample.analysis.filter((a) => !a.reviewed_by);
		const selectedIds = selectedForReview.filter((id) => id > 0);

		// If all non-reviewed analyses are selected
		return nonReviewedAnalyses.every((a) => selectedIds.includes(a.id));
	};

	// Show confirmation dialog for review for a specific sample
	const handleReviewSave = (sampleUid) => {
		setIsReviewConfirmVisible(true);
	};

	// Cancel review confirmation
	const handleReviewCancel = () => {
		setIsReviewConfirmVisible(false);
	};

	// Confirm and submit review
	const handleReviewConfirm = async () => {
		try {
			// Get all analyses from all samples
			const allAnalyses = [];
			processingSample.forEach((sample) => {
				if (sample?.analysis && Array.isArray(sample.analysis)) {
					allAnalyses.push(...sample.analysis);
				}
			});

			// Separate positive IDs (to review) and negative IDs (to unreview)
			const toReview = selectedForReview.filter((id) => id > 0);
			const toUnreview = selectedForReview.filter((id) => id < 0).map((id) => -id); // Convert back to positive

			// Create a combined array for batch processing
			const analysesToConfirm = [
				// Items to review (with reviewer ID)
				...toReview.map((id) => ({
					id,
					reviewed_by: currentUser?.identity_uid || '',
				})),
				// Items to unreview (with empty reviewer)
				...toUnreview.map((id) => ({
					id,
					reviewed_by: '', // Empty string to clear reviewer
				})),
			];

			// Make a single API call with the combined array
			const response = await apiPost('https://black.irdop.org/trelw82ki/db/confirm/analysis', analysesToConfirm);

			if (response?.status === 200) {
				// Update the UI
				const updatedSamples = processingSample.map((sample) => {
					if (sample?.analysis && Array.isArray(sample.analysis)) {
						const updatedAnalysis = sample.analysis.map((analysis) => {
							if (toReview.includes(analysis.id)) {
								return {
									...analysis,
									reviewed_by: currentUser?.identity_uid || '',
								};
							}
							if (toUnreview.includes(analysis.id)) {
								return {
									...analysis,
									reviewed_by: '', // Clear reviewed_by
								};
							}
							return analysis;
						});
						return {
							...sample,
							analysis: updatedAnalysis,
						};
					}
					return sample;
				});

				setProcessingSample(updatedSamples);

				// Show result message
				const reviewCount = toReview.length;
				const unreviewCount = toUnreview.length;

				if (reviewCount > 0 && unreviewCount > 0) {
					toast.success(`Đã duyệt ${reviewCount} chỉ tiêu và hủy duyệt ${unreviewCount} chỉ tiêu thành công`);
				} else if (reviewCount > 0) {
					toast.success(`Đã duyệt thành công ${reviewCount} chỉ tiêu`);
				} else {
					toast.success(`Đã hủy duyệt thành công ${unreviewCount} chỉ tiêu`);
				}
			} else {
				toast.error(`Có lỗi xảy ra khi xử lý yêu cầu: ${response?.data?.message || 'Lỗi không xác định'}`);
			}

			// Reset state
			setSelectedForReview([]);
			setReviewAllChecked(false);
			setShowReviewSaveButton(false);
		} catch (error) {
			console.error('Error reviewing analyses:', error);
			toast.error(`Đã xảy ra lỗi khi cập nhật chỉ tiêu: ${error.message || 'Lỗi không xác định'}`);
		}

		setIsReviewConfirmVisible(false);
	};

	// Add a function to handle resetting review changes for a specific sample
	const handleResetReviewChanges = (sampleUid) => {
		// Find the sample
		const sample = processingSample.find((s) => s.sample_uid === sampleUid);

		if (!sample || !sample.analysis || !Array.isArray(sample.analysis)) {
			return;
		}

		// Get all analysis IDs for this sample
		const analysisIds = sample.analysis.map((a) => a.id);

		// Remove all selections (both positive and negative) for this sample
		setSelectedForReview((prev) => prev.filter((id) => !analysisIds.includes(Math.abs(id))));

		// Show toast to confirm
		toast.info('Đã hủy các thay đổi đang chờ xác nhận');
	};

	// Add a function to handle navigation to sample in v2 mode
	const navigateToSampleInV2 = (sampleUid) => {
		window.open(`/processing?mode=v2&search=${sampleUid}`, '_blank');
	};

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			<Breadcrumb paths={[{}]} />

			<div className="w-full h-full flex justify-between items-center rounded-lg mb-2">
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
					{/* <button
						className={`w-40 p-1 ml-1 text-sm font-medium focus:outline-none active:bg-sky-400 ${
							viewMode === 'v3' ? 'bg-teritary' : 'bg-gray-200'
						}`}
						onClick={() => handleViewModeChange('v3')}
					>
						Tiếp nhận
					</button> */}
				</div>
			</div>
			<div className="w-full h-full flex flex-col justify-center items-center bg-white rounded-lg p-4 shadow">
				{/* Add legend for color coding - only visible in v1 mode */}
				{viewMode === 'v1' && (
					<div className="w-full flex items-center gap-4 mb-1 mt-1 text-sm">
						<span className="flex items-center">
							<div className="w-4 h-4 border-2 border-green-500 rounded mr-1"></div>
							<span>Đã có kết quả</span>
						</span>
						<span className="flex items-center">
							<div className="w-4 h-4 border-2 border-red-500 rounded mr-1"></div>
							<span>Hôm nay / quá hạn</span>
						</span>
						<span className="flex items-center">
							<div className="w-4 h-4 border-2 border-gray-500 rounded mr-1"></div>
							<span>Chưa có kết quả</span>
						</span>
					</div>
				)}
				{selectedAnalysis && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-10"
						onClick={closeForm}
					>
						<div className="bg-white p-4 rounded-lg shadow-lg w-96" onClick={(e) => e.stopPropagation()}>
							<h2 className="text-lg font-medium mb-4">Kết quả {selectedAnalysis.parameterName || ''}</h2>
							<div className="mb-2 flex items-center h-10">
								<label className="text-start block text-sm font-medium w-24">Mã mẫu</label>
								<div className="w-full relative">
									<input
										type="text"
										value={selectedAnalysis.sample_uid}
										className="text-start w-full p-2 border rounded-lg bg-white text-primary cursor-pointer hover:underline"
										readOnly
										onClick={(e) => {
											e.stopPropagation();
											navigateToSampleInV2(selectedAnalysis.sample_uid);
										}}
									/>
								</div>
							</div>
							<div className="mb-2 flex items-center ">
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
							<div className="mb-2 flex items-center z-10">
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
							<div className="flex items-center justify-end mb-2 ">
								<div className="max-w-96">
									<FilterBar
										source={originalProcessingSample || []} // Ensure source is always an array
										setCurrentList={setProcessingSample}
										typeSearch={'processing_v1'}
										setIsFilter={setIsFilter} // Pass the setIsFilter function
									/>
								</div>
							</div>
							<div>
								{Array.isArray(processingSample) && processingSample.length > 0 ? (
									processingSample.map((parameter, rowIndex) => (
										<div key={parameter?.id || rowIndex} className="flex flex-col p-0 border rounded-lg mb-4 mt-1">
											<div className="flex">
												<div
													onClick={() => {
														visibleTables[parameter?.id] && toggleTableVisibility(parameter?.id);
													}}
													className={`text-base border-r-2 max-w-64 md:min-w-64 min-w-40 p-2  hover:bg-slate-50 ${
														visibleTables[parameter?.id] && ' cursor-pointer'
													} relative `}
												>
													<p className="text-start font-semibold text-primary text-wrap line-clamp-2">
														{parameter?.parameter_name || 'Không có tên'}
													</p>
													<span className="flex line-clamp-1">
														<p className="text-gray-500 font-medium mr-1 min-w-20 text-start">
															{parameter?.protocol_source ? `${parameter.protocol_source}:` : ''}
														</p>
														<p className="font-medium text-start">{parameter?.protocol_code || ''}</p>
													</span>
													<p className="text-start text-sm font-semibold line-clamp-1">{parameter?.matrix || ''}</p>

													<button
														onClick={(e) => {
															e.stopPropagation();
															toggleTableVisibility(parameter.id);
														}}
														className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-200 focus:outline-none "
													>
														{visibleTables[parameter.id] ? (
															<MdViewModule size={22} className="text-primary" />
														) : (
															<MdOutlineViewList size={22} className="text-primary" />
														)}
													</button>
												</div>
												<div className="flex flex-col w-full rounded-lg p-0.5 ml-0.5 min-h-max text-sm overflow-auto">
													<div className="flex min-w-[420px] h-full">
														{!visibleTables[parameter.id] && (
															<>
																<div
																	className="md:pr-1 w-[140px] min-w-[140px] min-h-max flex flex-col border-r border-gray-200"
																	onDrop={(e) => handleDrop(e, 3)}
																	onDragOver={handleDragOver}
																>
																	<div className="font-medium text-center p-1 border-b border-gray-200 ">Mẫu khẩn</div>
																	<div className="h-fit flex flex-col mt-1">
																		{!visibleTables[parameter?.id] &&
																			parameter?.analyses &&
																			Array.isArray(parameter.analyses) &&
																			parameter.analyses.map(
																				(analysis) =>
																					analysis?.status === 1 && (
																						<button
																							key={analysis?.id || `status3-${Math.random()}`}
																							className={`bg-slate-50 border-2 hover:bg-teritary p-0.5 rounded-lg font-medium m-0.5 w-[130px] h-12 ${
																								analysis?.result_value
																									? 'border-green-500'
																									: analysis?.deadline && new Date(analysis.deadline) < new Date()
																									? 'border-red-500'
																									: 'border-gray-500'
																							}`}
																							draggable
																							onDragStart={(e) => handleDragStart(e, parameter?.id, analysis?.id)}
																							onClick={() => handleAnalysisClick(analysis, parameter?.parameter_name)}
																						>
																							<span className="cursor-pointer text-primary">
																								{analysis?.sample_uid || 'N/A'}
																							</span>
																							<br />
																							{getTechnicianName(analysis?.technician_uid)}
																						</button>
																					),
																			)}
																	</div>
																</div>

																<div
																	className="min-h-full border-r border-gray-200 px-1 w-full min-w-[280px] justify-start flex flex-col h-max-content"
																	onDrop={(e) => handleDrop(e, 2)}
																	onDragOver={handleDragOver}
																>
																	<div className="font-medium text-center p-1 border-b border-gray-200 ">
																		Mẫu thường
																	</div>
																	<div className="min-h-max flex flex-wrap mt-1">
																		{!visibleTables[parameter.id] &&
																			parameter.analyses &&
																			Array.isArray(parameter.analyses) &&
																			parameter.analyses.map(
																				(analysis) =>
																					analysis.status === 2 && (
																						<button
																							key={analysis.id}
																							className={`bg-slate-50 border-2 hover:bg-teritary p-0.5 rounded-lg font-medium m-0.5 w-[130px] h-12 ${
																								analysis?.result_value
																									? 'border-green-500'
																									: new Date(analysis.deadline) < new Date()
																									? 'border-red-500'
																									: 'border-gray-500'
																							}`}
																							draggable
																							onDragStart={(e) => handleDragStart(e, parameter.id, analysis.id)}
																							onClick={() => handleAnalysisClick(analysis, parameter.parameter_name)}
																						>
																							<span className="cursor-pointer text-primary">{analysis.sample_uid}</span>
																							<br />
																							{getTechnicianName(analysis.technician_uid)}
																						</button>
																					),
																			)}
																	</div>
																</div>

																<div
																	className="pl-1 xl:w-[280px] min-w-[140px] w-[140px] xl:min-w-[280px] min-h-full flex flex-col h-max-content"
																	onDrop={(e) => handleDrop(e, 1)}
																	onDragOver={handleDragOver}
																>
																	<div className="font-medium text-center p-1 border-b border-gray-200 ">Mẫu chờ</div>
																	<div className="flex flex-wrap h-fit items-start mt-1">
																		{!visibleTables[parameter.id] &&
																			parameter.analyses &&
																			Array.isArray(parameter.analyses) &&
																			parameter.analyses.map(
																				(analysis) =>
																					analysis.status === 0 && (
																						<button
																							key={analysis.id}
																							className={`bg-slate-50 border-2 hover:bg-teritary p-0.5 rounded-lg font-medium m-0.5 w-[130px] h-12 ${
																								analysis?.result_value
																									? 'border-green-500'
																									: new Date(analysis.deadline) < new Date()
																									? 'border-red-500'
																									: 'border-gray-500'
																							}`}
																							draggable
																							onDragStart={(e) => handleDragStart(e, parameter.id, analysis.id)}
																							onClick={() => handleAnalysisClick(analysis, parameter.parameter_name)}
																						>
																							<span className="cursor-pointer text-primary">{analysis.sample_uid}</span>
																							<br />
																							{getTechnicianName(analysis.technician_uid)}
																						</button>
																					),
																			)}
																	</div>
																</div>
															</>
														)}
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
																	{parameter.analyses &&
																		Array.isArray(parameter.analyses) && // Add this check
																		parameter.analyses.map((analysis, sampleIndex) => (
																			<tr key={analysis.id}>
																				<td className="border p-2">
																					<span
																						className="cursor-pointer text-primary hover:underline"
																						onClick={() => navigateToSampleInV2(analysis.sample_uid)}
																					>
																						{analysis.sample_uid}
																					</span>
																				</td>
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
																					onClick={() =>
																						handleCellClick(parameter.id, sampleIndex, 'lodq', analysis.id)
																					}
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
										</div>
									))
								) : (
									<div className="w-full text-center py-4 text-gray-500">Không có dữ liệu mẫu đang xử lý</div>
								)}
							</div>
						</>
					) : (
						viewMode === 'v2' && (
							<>
								<FilterBar
									source={originalProcessingSample || []} // Ensure source is always an array
									setCurrentList={setProcessingSample}
									typeSearch={'processing_v2'}
									setIsFilter={setIsFilter} // Pass the setIsFilter function
								/>
								<div className="w-full min-h-20 flex flex-col mt-1">
									<div className="w-full mb-4 flex flex-wrap justify-between">
										{Array.isArray(processingSample) && processingSample.length > 0 ? (
											processingSample.map((sample) => (
												<div
													key={sample?.sample_uid || `sample-${Math.random()}`}
													className="p-2 border rounded-lg mb-4 flex items-start lg:w-[49.5%] w-full lg:overflow-hidden overflow-auto"
												>
													<div className="text-start">
														<button className="bg-slate-50 border-2 border-sky-500 p-1 px-0.5 max-h-fit rounded-md min-w-32 text-start">
															{sample?.sample_uid || 'N/A'}
														</button>
														<p className="text-primary font-medium line-clamp-2">{sample?.matrix || ''}</p>
														<p className={`${sample?.status === 1 ? 'text-red-500 font-semibold' : ''} `}>
															{status[sample?.status] || 'Không xác định'}
														</p>
													</div>
													{sample?.analysis && Array.isArray(sample.analysis) && sample.analysis.length > 0 ? (
														<table className="w-full border-collapse border border-gray-300 ml-1 text-sm min-w-[450px] md:min-w-[340px]">
															<thead>
																<tr className="bg-gray-100">
																	<th className="border p-1 text-start w-[88px]">Hạn trả</th>
																	<th className="border p-1 text-start">Phép thử</th>
																	<th className="border p-1 text-start w-20">Đơn vị</th>
																	<th className="border p-1 text-start w-24">Kết quả</th>
																	<th className="border p-1 text-start w-24 relative">
																		{samplesWithPendingReviews[sample.sample_uid] ? (
																			<div className="flex justify-center items-center">
																				<button
																					className="mx-1 text-gray-600 hover:text-gray-800 p-1.5"
																					onClick={() => handleResetReviewChanges(sample.sample_uid)}
																					title="Hủy thay đổi"
																				>
																					<FaUndo size={12} />
																				</button>
																				<button
																					className="mx-1 text-green-600 hover:text-green-800 p-1.5"
																					onClick={() => handleReviewSave(sample.sample_uid)}
																					title="Duyệt các mục đã chọn"
																				>
																					<FaSave size={12} />
																				</button>
																			</div>
																		) : (
																			<div className="items-center flex">
																				Duyệt
																				<input
																					type="checkbox"
																					className="w-4 h-4 ml-1"
																					checked={areAllAnalysesSelectedInSample(sample.sample_uid)}
																					onChange={() => handleReviewSelectAll(sample.sample_uid)}
																				/>
																			</div>
																		)}
																	</th>
																</tr>
															</thead>
															<tbody>
																{sample.analysis.map((item) => {
																	// Check if deadline has passed
																	const isDeadlinePassed = item?.deadline
																		? new Date(item.deadline) <= new Date()
																		: false;

																	return (
																		<tr key={item?.id || `analysis-${Math.random()}`} className="border">
																			<td
																				className={`border p-1 text-start ${
																					isDeadlinePassed ? 'text-red-600 font-bold' : ''
																				}`}
																			>
																				{item?.deadline ? formatDate(item.deadline) : 'N/A'}
																			</td>
																			<td className="border p-1 text-start">
																				<span>
																					<p className="line-clamp-2">{item?.parameter_name || ''}</p>
																					<p className="text-slate-500 hover:text-black hover:font-semibold cursor-pointer">
																						{item?.protocol_code || ''}
																					</p>
																				</span>
																			</td>
																			<td
																				className="border p-1 text-start"
																				onClick={() => handleCellClickV2(sample.sample_uid, item.id, 'result_unit')}
																			>
																				<div className="border border-white hover:border-purple-500 rounded p-1">
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
																				onClick={() => handleCellClickV2(sample.sample_uid, item.id, 'result_value')}
																			>
																				<div className="border border-white hover:border-purple-500 rounded p-1">
																					{editableCell.sampleId === sample.sample_uid &&
																					editableCell.analysisId === item.id &&
																					editableCell.column === 'result_value' ? (
																						<TinyMceInput
																							value={inputValue}
																							onUpdate={(content) => handleSaveContentV2(content, 'result_value')}
																							onKey={handleKeyDownV2}
																						/>
																					) : (
																						<div
																							dangerouslySetInnerHTML={{ __html: `${item.result_value || '--'}` }}
																							className="line-clamp-5 overflow-hidden"
																						/>
																					)}
																				</div>
																			</td>
																			<td className="border p-1 text-center">
																				<input
																					type="checkbox"
																					className="w-6 h-6"
																					checked={
																						selectedForReview.includes(item.id) ||
																						(item.reviewed_by && !selectedForReview.includes(-item.id)) ||
																						false
																					}
																					onChange={(e) =>
																						handleReviewSelect(item.id, e.target.checked, sample.sample_uid)
																					}
																				/>
																				{item.reviewed_by && !selectedForReview.includes(-item.id) && (
																					<span className="ml-1 text-green-600" title="Đã được duyệt">
																						<FaCheck size={12} />
																					</span>
																				)}
																			</td>
																		</tr>
																	);
																})}
															</tbody>
														</table>
													) : (
														<div className="ml-2 text-gray-500">Không có dữ liệu phân tích</div>
													)}
												</div>
											))
										) : (
											<div className="w-full text-center py-4 text-gray-500">Không có dữ liệu mẫu đang xử lý</div>
										)}
									</div>
								</div>
							</>
						)
					)}
				</div>
			</div>
			{/* Confirmation Dialog for Review */}
			{isReviewConfirmVisible && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
					<div className="bg-white p-4 rounded-lg shadow-lg w-96" onClick={(e) => e.stopPropagation()}>
						<h2 className="text-lg font-medium mb-4">Xác nhận thay đổi trạng thái duyệt</h2>
						<p>
							{selectedForReview.filter((id) => id > 0).length > 0 &&
								`Bạn sẽ duyệt ${selectedForReview.filter((id) => id > 0).length} chỉ tiêu. `}
							{selectedForReview.filter((id) => id < 0).length > 0 &&
								`Bạn sẽ hủy duyệt ${selectedForReview.filter((id) => id < 0).length} chỉ tiêu. `}
						</p>
						<div className="flex justify-end mt-4">
							<button className="bg-gray-500 text-white px-2 py-1 w-20 rounded-lg mr-2" onClick={handleReviewCancel}>
								Hủy
							</button>
							<button className="bg-green-500 text-white px-2 py-1 w-20 rounded-lg" onClick={handleReviewConfirm}>
								Xác nhận
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProcessingSample;
