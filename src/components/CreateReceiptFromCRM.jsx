import React, { useState, useContext } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiPost } from '../contexts/helperFunctionCallAPI';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // Add Swal import
import { MdLibraryAdd } from 'react-icons/md'; // Add this import
import { FaTrashAlt } from 'react-icons/fa'; // Add this import

const CreateReceiptFromCRM = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [code, setCode] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [crmData, setCrmData] = useState(null);
	const [error, setError] = useState(null);
	const [isCreating, setIsCreating] = useState(false);
	const [urgentSamples, setUrgentSamples] = useState({});
	const [allUrgent, setAllUrgent] = useState(false);
	const [selectedPurpose, setSelectedPurpose] = useState(''); // Default purpose
	// Add new states for parameter selection
	const [isAddingParameter, setIsAddingParameter] = useState(false);
	const [currentSampleIndex, setCurrentSampleIndex] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [parameterList, setParameterList] = useState([]);
	const [selectedParameters, setSelectedParameters] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [typingTimeout, setTypingTimeout] = useState(null);

	// Add new states for inline editing
	const [editingField, setEditingField] = useState({
		type: null, // 'client' or 'sample'
		field: null, // field name being edited
		index: null, // index for sample editing
	});
	const [editValue, setEditValue] = useState('');

	const { formatDate, currentUser, purposes } = useContext(GlobalContext);
	const navigate = useNavigate();

	const openModal = () => {
		setIsModalOpen(true);
		setCode('');
		setCrmData(null);
		setError(null);
		setUrgentSamples({});
		setAllUrgent(false);
		setSelectedPurpose(''); // Reset to default purpose
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			const response = await apiPost('https://black.irdop.org/crm/generate_receipt', { code });

			// Check if the response contains an error
			if (response.data && response.data.error) {
				setError(response.data.message || 'Đã xảy ra lỗi khi lấy dữ liệu từ CRM.');
				setCrmData(null);
			} else {
				setCrmData(response.data);
				setError(null);

				// Initialize urgent samples state
				const initialUrgentState = {};
				response.data.samples.forEach((_, index) => {
					initialUrgentState[index] = false;
				});
				setUrgentSamples(initialUrgentState);
			}
		} catch (error) {
			console.error('Error fetching CRM data:', error);
			setError(error.response?.data?.message || 'Không thể lấy dữ liệu từ CRM. Vui lòng kiểm tra mã đơn hàng.');
			setCrmData(null);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle the "all samples urgent" checkbox
	const handleAllUrgentChange = (e) => {
		const checked = e.target.checked;
		setAllUrgent(checked);

		// Create a new object with all samples set to the checked value
		const newUrgentSamples = {};
		if (crmData && crmData.samples) {
			crmData.samples.forEach((_, index) => {
				newUrgentSamples[index] = checked;
			});
		}
		setUrgentSamples(newUrgentSamples);
	};

	// Handle individual sample urgent checkbox
	const handleUrgentChange = (index, checked) => {
		setUrgentSamples((prev) => ({
			...prev,
			[index]: checked,
		}));
	};

	// Handle deleting a sample
	const handleDeleteSample = (index) => {
		if (!crmData) return;

		const updatedSamples = [...crmData.samples];
		updatedSamples.splice(index, 1);

		// Update crmData with the modified samples array
		setCrmData({
			...crmData,
			samples: updatedSamples,
		});

		// Update the urgentSamples state to reflect the deletion
		const newUrgentSamples = {};
		updatedSamples.forEach((_, idx) => {
			// If index is less than deleted index, keep value
			// If index is >= deleted index, take value from original index + 1
			if (idx < index) {
				newUrgentSamples[idx] = urgentSamples[idx];
			} else {
				newUrgentSamples[idx] = urgentSamples[idx + 1] || false;
			}
		});

		setUrgentSamples(newUrgentSamples);
	};

	// Handle deleting an analysis item
	const handleDeleteAnalysis = (sampleIndex, analysisIndex) => {
		if (!crmData) return;

		const updatedSamples = [...crmData.samples];
		const updatedAnalysis = [...updatedSamples[sampleIndex].analysis];

		updatedAnalysis.splice(analysisIndex, 1);

		updatedSamples[sampleIndex] = {
			...updatedSamples[sampleIndex],
			analysis: updatedAnalysis,
		};

		setCrmData({
			...crmData,
			samples: updatedSamples,
		});
	};

	const handleCreateReceipt = async () => {
		if (!crmData) return;

		setIsCreating(true);

		// Add status property to samples based on urgentSamples state
		const samplesWithStatus = crmData.samples.map((sample, index) => ({
			...sample,
			sample_information: [
				{
					fname: 'Tên mẫu thử / name.',
					fvalue: sample?.sample_name || '',
				},
				// { fname: 'Số lô / LOT no.', fvalue: '' },
				// { fname: 'Ngày sản xuất / mfg.', fvalue: '' },
				// { fname: 'Hạn sử dụng / exp.', fvalue: '' },
				// { fname: 'Nơi sản xuất / mfr.', fvalue: '' },
				{
					fname: 'Ngày tiếp nhận / receipt date.',
					fvalue: new Date().toLocaleDateString('vi-VN'),
				},
				{
					fname: 'Mô tả / desc.',
					fvalue: sample?.sample_description || '',
				},
			],
			status: urgentSamples[index] ? 1 : 0,
			purpose: selectedPurpose, // Add purpose to each sample
		}));

		try {
			const response = await apiPost('https://black.irdop.org/crm/create_receipt', {
				client: crmData.client,
				samples: samplesWithStatus,
				created_by_uid: currentUser.identity_uid,
				created_by_name: currentUser.identity_name,
				modified_by_uid: currentUser.identity_uid,
				order_code: crmData.order_code,
				quote_code: crmData.quote_code,
				sale_recorder: crmData.sale_recorder,
				total_amount: crmData.total_amount,
				discount_summary: crmData.discount_summary,
			});

			// Check if the response contains an error
			if (response.data && response.data.error) {
				setError(response.data.message || 'Đã xảy ra lỗi khi tạo tiếp nhận mẫu.');
			} else {
				// Close modal and show notification before navigation
				closeModal();

				// Show brief notification and navigate after delay
				await showBriefNotification('Tạo tiếp nhận mẫu thành công!');
				navigate(`/dashboard/receipt?receipt_uid=${response.data.receipt_uid}`);
			}
		} catch (error) {
			console.error('Error creating receipt:', error);
			setError(error.response?.data?.message || 'Không thể tạo tiếp nhận mẫu. Vui lòng thử lại sau.');
		} finally {
			setIsCreating(false);
		}
	};

	// New function to show brief notification before navigation
	const showBriefNotification = (message) => {
		return new Promise((resolve) => {
			const Toast = Swal.mixin({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 500, // Show for 0.5 seconds
				timerProgressBar: true,
				didOpen: (toast) => {
					toast.addEventListener('mouseenter', Swal.stopTimer);
					toast.addEventListener('mouseleave', Swal.resumeTimer);
				},
				customClass: {
					popup: 'colored-toast swal2-icon-success',
				},
			});

			Toast.fire({
				icon: 'success',
				title: message,
			}).then(() => {
				resolve();
			});
		});
	};

	// Open parameter selection modal
	const handleOpenAddParameter = (sampleIndex) => {
		setCurrentSampleIndex(sampleIndex);
		setIsAddingParameter(true);
		setSelectedParameters([]);
		setSearchTerm('');
		setParameterList([]);
		setCurrentPage(1);
	};

	// Handle search input
	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
		if (typingTimeout) clearTimeout(typingTimeout);
		if (e.target.value.length > 2) {
			const timeout = setTimeout(() => {
				if (e.target.value.trim() !== '') {
					searchParameters(e.target.value);
				}
			}, 500);

			setTypingTimeout(timeout);
		}
	};

	// Search parameters
	const searchParameters = async (query) => {
		try {
			const response = await apiPost('https://black.irdop.org/ha8i0uw2/db/search/parameter', {
				query,
				matrix: crmData.samples[currentSampleIndex]?.matrix || '',
			});
			setParameterList(response.data);
		} catch (error) {
			console.error('Error searching parameters:', error);
		}
	};

	const handleSearchKeyDown = (e) => {
		if (e.key === 'Enter' && searchTerm.length >= 2) {
			if (typingTimeout) clearTimeout(typingTimeout);
			searchParameters(searchTerm);
		}
	};

	// Select a parameter
	const handleParameterSelect = (parameter) => {
		if (!selectedParameters.some((p) => p.id === parameter.id)) {
			setSelectedParameters([
				...selectedParameters,
				{
					...parameter,
					parameter_uid: parameter.parameter_uid || '',
				},
			]);
		}
		setSearchTerm(''); // Clear the search input
	};

	// Remove a selected parameter
	const handleRemoveParameter = (index) => {
		const updatedParameters = selectedParameters.filter((_, i) => i !== index);
		setSelectedParameters(updatedParameters);
	};

	// Confirm and add parameters to the sample
	const handleConfirmAddParameter = () => {
		if (currentSampleIndex === null || selectedParameters.length === 0) {
			return;
		}

		// Create a copy of the samples array
		const updatedSamples = [...crmData.samples];

		// Add the selected parameters to the current sample's analysis
		updatedSamples[currentSampleIndex] = {
			...updatedSamples[currentSampleIndex],
			analysis: [
				...updatedSamples[currentSampleIndex].analysis,
				...selectedParameters.map((param) => ({
					parameter_id: param.id,
					parameter_name: param.parameter_name,
					parameter_uid: param.parameter_uid || '',
					matrix: param.matrix || updatedSamples[currentSampleIndex].matrix,
					protocol_code: param.protocol_code,
					protocol_source: param.protocol_source || 'IRDOP',
				})),
			],
		};

		// Update the crmData state
		setCrmData({
			...crmData,
			samples: updatedSamples,
		});

		// Close the modal
		setIsAddingParameter(false);
		setSelectedParameters([]);
	};

	// Cancel adding parameters
	const handleCancelAddParameter = () => {
		setIsAddingParameter(false);
		setSelectedParameters([]);
	};

	// Add this function for rendering the parameter selection modal
	const renderAddParameterModal = () => {
		const paginatedParameters = parameterList.slice((currentPage - 1) * 5, currentPage * 5);

		const handlePageChange = (page) => {
			setCurrentPage(page);
		};

		const renderPageButtons = () => {
			const totalPages = Math.ceil(parameterList.length / 5);
			const pageButtons = [];

			if (totalPages <= 5) {
				for (let i = 1; i <= totalPages; i++) {
					pageButtons.push(
						<button
							key={i}
							className={`p-2 ${currentPage === i ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(i)}
						>
							{i}
						</button>,
					);
				}
			} else {
				if (currentPage > 2) {
					pageButtons.push(
						<button
							key={1}
							className={`p-2 ${currentPage === 1 ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(1)}
						>
							1
						</button>,
					);
					if (currentPage > 3) {
						pageButtons.push(<span key="dots1">...</span>);
					}
				}

				const startPage = Math.max(2, currentPage - 1);
				const endPage = Math.min(totalPages - 1, currentPage + 1);

				for (let i = startPage; i <= endPage; i++) {
					pageButtons.push(
						<button
							key={i}
							className={`p-2 ${currentPage === i ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(i)}
						>
							{i}
						</button>,
					);
				}

				if (currentPage < totalPages - 2) {
					if (currentPage < totalPages - 3) {
						pageButtons.push(<span key="dots2">...</span>);
					}
					pageButtons.push(
						<button
							key={totalPages}
							className={`p-2 ${currentPage === totalPages ? 'bg-gray-300' : 'bg-white'}`}
							onClick={() => handlePageChange(totalPages)}
						>
							{totalPages}
						</button>,
					);
				}
			}

			return pageButtons;
		};

		return (
			<div
				className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50"
				onClick={() => setIsAddingParameter(false)}
			>
				<div
					className="bg-white p-4 rounded-lg w-[90%] md:w-[70%] xl:w-[50%] h-3/5 max-w-[700px] min-h-[400px] max-h-[700px] relative"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="w-full h-full relative flex flex-col justify-between overflow-auto">
						<div>
							<h2 className="text-2xl font-semibold mb-4">Thêm chỉ tiêu kiểm nghiệm</h2>
							<input
								type="text"
								value={searchTerm}
								onChange={handleSearchChange}
								onKeyDown={handleSearchKeyDown}
								className="w-full p-2 border rounded mb-4 bg-white focus:outline-none focus:border-purple-500"
								placeholder="Tìm kiếm chỉ tiêu..."
							/>

							{searchTerm.length > 1 && (
								<div className="absolute bg-white border rounded w-full max-h-72 overflow-y-auto mb-4 z-10">
									<ul>
										{paginatedParameters.map((parameter, index) => (
											<li
												key={index}
												className="p-2 border-b cursor-pointer hover:bg-gray-200"
												onClick={() => handleParameterSelect(parameter)}
											>
												<div>
													<p className="text-start text-xs font-medium w-full line-clamp-1">
														Nền mẫu: {parameter.matrix}
													</p>
													<p className="text-start text-primary font-medium w-full line-clamp-1">
														{parameter.parameter_name}
													</p>
													<p className="text-start text-text-secondary w-full line-clamp-1">
														{parameter.protocol_code}
														{parameter?.accreditation && <b>{` (${parameter.accreditation})`}</b>}
													</p>
												</div>
											</li>
										))}
									</ul>
									<div className="flex justify-center mt-2">{renderPageButtons()}</div>
								</div>
							)}
						</div>
						<div className="mb-4 h-full flex overflow-y-auto text-sm flex-wrap content-start">
							{selectedParameters.map((parameter, index) => (
								<div
									key={index}
									className="p-1 border rounded mb-2 flex text-start items-center w-fit h-fit mr-1 max-w-68"
								>
									<div>
										<p className="text-xs font-medium w-full line-clamp-1">Nền mẫu: {parameter.matrix}</p>
										<p className="text-primary font-medium w-full line-clamp-1">{parameter.parameter_name}</p>
										<p className="text-start text-text-secondary w-full line-clamp-1">
											{parameter.protocol_code}
											{parameter?.accreditation && <b>{` (${parameter.accreditation})`}</b>}
										</p>
									</div>

									<button className="text-red-500 px-2 py-3 ml-1" onClick={() => handleRemoveParameter(index)}>
										<FaTrashAlt />
									</button>
								</div>
							))}
						</div>
						<div className="flex justify-end">
							<button className="bg-gray-500 text-white p-2 rounded mr-2" onClick={handleCancelAddParameter}>
								Hủy bỏ
							</button>
							<button
								className="bg-green-500 text-white p-2 rounded"
								onClick={handleConfirmAddParameter}
								disabled={selectedParameters.length === 0}
							>
								Xác nhận
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	};

	// Add new functions for inline editing
	const startEditing = (type, field, value, index = null) => {
		setEditingField({ type, field, index });
		setEditValue(value);
	};

	const handleEditChange = (e) => {
		setEditValue(e.target.value);
	};

	const saveEdit = () => {
		if (editingField.type === 'client') {
			// Update client information
			setCrmData({
				...crmData,
				client: {
					...crmData.client,
					[editingField.field]: editValue,
				},
			});
		} else if (editingField.type === 'sample') {
			// Update sample name
			const updatedSamples = [...crmData.samples];
			updatedSamples[editingField.index] = {
				...updatedSamples[editingField.index],
				sample_name: editValue,
			};
			setCrmData({
				...crmData,
				samples: updatedSamples,
			});
		}
		// Reset editing state
		setEditingField({ type: null, field: null, index: null });
	};

	const cancelEdit = () => {
		setEditingField({ type: null, field: null, index: null });
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			saveEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	};

	// Handle the matrix change for a specific sample
	const handleMatrixChange = (index, value) => {
		if (!crmData) return;

		const updatedSamples = [...crmData.samples];
		updatedSamples[index] = {
			...updatedSamples[index],
			matrix: value,
		};

		setCrmData({
			...crmData,
			samples: updatedSamples,
		});
	};

	return (
		<>
			<button
				onClick={openModal}
				className="border-gray-300 font-medium py-0 px-2 rounded-lg w-fit bg-background text-primary"
			>
				<div>Tạo TNM từ CRM</div>
			</button>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
					<div className="absolute inset-0 bg-black bg-opacity-50 " onClick={closeModal}></div>
					<div className="bg-white rounded-lg p-6 max-w-7xl w-11/12 z-10 max-h-[90vh] min-h-72 relative flex flex-col justify-between">
						<div>
							<h2 className="text-xl font-bold mb-4">Tạo tiếp nhận mẫu từ CRM</h2>

							<form onSubmit={handleSubmit} className="mb-4">
								<div className="flex items-center gap-2">
									<input
										type="text"
										value={code}
										onChange={(e) => setCode(e.target.value)}
										placeholder="Nhập mã đơn hàng"
										className="border p-2 rounded flex-grow bg-white"
										required
									/>
									<button
										type="submit"
										className="bg-primary text-white p-2 rounded hover:bg-blue-700"
										disabled={isLoading}
									>
										{isLoading ? 'Đang tìm...' : 'Tìm'}
									</button>
								</div>
							</form>

							{error && (
								<div className="text-red-500 mb-4 p-3 bg-red-50 border border-red-200 rounded">
									<p className="font-medium">Lỗi:</p>
									<p>{error}</p>
								</div>
							)}

							{crmData && (
								<div className="flex flex-col lg:flex-row gap-4">
									{/* Left Column: Order and Customer Information */}
									<div className="lg:w-1/3 space-y-4">
										<div className="border rounded-lg p-4 text-start w-full h-fit">
											<h3 className="font-semibold text-lg mb-2">Thông tin đơn hàng</h3>
											<p>
												<span className="font-medium text-gray-500">Mã đơn hàng: </span>
												{crmData.order_code || '--'}
											</p>
											<p>
												<span className="font-medium text-gray-500">Mã báo giá: </span>
												{crmData.quote_code || '--'}
											</p>
											<p>
												<span className="font-medium text-gray-500">Ghi nhận doanh số: </span>
												{crmData.sale_recorder || '--'}
											</p>
											<p>
												<span className="font-medium text-gray-500">Chiết khấu: </span>
												{crmData.discount_summary
													? new Intl.NumberFormat('vi-VN', {
															style: 'currency',
															currency: 'VND',
													  }).format(crmData.discount_summary)
													: '--'}{' '}
											</p>
											<p>
												<span className="font-medium text-gray-500">Tổng tiền: </span>
												{crmData.total_amount
													? new Intl.NumberFormat('vi-VN', {
															style: 'currency',
															currency: 'VND',
													  }).format(crmData.total_amount)
													: '--'}
											</p>
										</div>

										<div className="border rounded-lg p-4 text-start w-full h-fit">
											<h3 className="font-semibold text-lg mb-2">Thông tin khách hàng</h3>
											<p className="mb-2">
												<span className="font-medium text-gray-500">Mã khách hàng: </span>
												{crmData.client.client_uid || '--'}
											</p>

											<div className="mb-2">
												<p className="font-medium text-gray-500">Tên cá nhân / tổ chức</p>
												{editingField.type === 'client' && editingField.field === 'client_name' ? (
													<input
														type="text"
														value={editValue}
														onChange={handleEditChange}
														onKeyDown={handleKeyDown}
														onBlur={saveEdit}
														autoFocus
														className="w-full border p-1 rounded bg-white"
													/>
												) : (
													<p
														className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded"
														onClick={() => startEditing('client', 'client_name', crmData.client.client_name)}
														title="Nhấn để chỉnh sửa"
													>
														{crmData.client.client_name}
													</p>
												)}
											</div>

											<div className="mb-2">
												<p className="font-medium text-gray-500">Địa chỉ</p>
												{editingField.type === 'client' && editingField.field === 'client_address' ? (
													<input
														type="text"
														value={editValue}
														onChange={handleEditChange}
														onKeyDown={handleKeyDown}
														onBlur={saveEdit}
														autoFocus
														className="w-full border p-1 rounded bg-white"
													/>
												) : (
													<p
														className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded"
														onClick={() => startEditing('client', 'client_address', crmData.client.client_address)}
														title="Nhấn để chỉnh sửa"
													>
														{crmData.client.client_address}
													</p>
												)}
											</div>

											<div className="mb-1">
												<p className="font-medium text-gray-500">Mã số thuế / CCCD:</p>
												{editingField.type === 'client' && editingField.field === 'legal_id' ? (
													<input
														type="text"
														value={editValue}
														onChange={handleEditChange}
														onKeyDown={handleKeyDown}
														onBlur={saveEdit}
														autoFocus
														className="w-full border p-1 rounded bg-white"
													/>
												) : (
													<p
														className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded"
														onClick={() => startEditing('client', 'legal_id', crmData.client.legal_id)}
														title="Nhấn để chỉnh sửa"
													>
														{crmData.client.legal_id || '--'}
													</p>
												)}
											</div>
										</div>
									</div>

									{/* Right Column: Sample List */}
									<div className="lg:w-2/3">
										<div className="w-full">
											<div className="flex justify-between items-center mb-2">
												<h3 className="font-semibold text-lg">Danh sách mẫu</h3>
												<div className="flex items-center gap-4">
													<div className="flex items-center">
														<input
															type="checkbox"
															id="allUrgent"
															checked={allUrgent}
															onChange={handleAllUrgentChange}
															className="mr-2"
														/>
														<label htmlFor="allUrgent" className="text-sm font-medium">
															Mẫu khẩn
														</label>
													</div>
													<div className="flex items-center">
														<label htmlFor="purpose" className="text-sm font-medium mr-2">
															Mục đích:
														</label>
														<select
															id="purpose"
															value={selectedPurpose}
															onChange={(e) => setSelectedPurpose(e.target.value)}
															className="border rounded p-1 bg-white text-sm py-0.5 border-gray-400 "
														>
															<option value="">--</option>
															{purposes.map((purpose, idx) => (
																<option key={idx} value={purpose}>
																	{purpose}
																</option>
															))}
														</select>
													</div>
												</div>
											</div>
											<div className="overflow-y-auto max-h-[50vh] pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
												{crmData.samples.map((sample, index) => (
													<div key={index} className="mb-4 p-2 border rounded w-full">
														<div className="flex justify-between items-center">
															{editingField.type === 'sample' && editingField.index === index ? (
																<div className="flex-1 mr-2">
																	<input
																		type="text"
																		value={editValue}
																		onChange={handleEditChange}
																		onKeyDown={handleKeyDown}
																		onBlur={saveEdit}
																		autoFocus
																		className="w-full border p-1 rounded bg-white font-medium text-lg"
																	/>
																</div>
															) : (
																<h2
																	className="font-medium text-start text-lg cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded"
																	onClick={() => startEditing('sample', 'sample_name', sample.sample_name, index)}
																	title="Nhấn để chỉnh sửa tên mẫu"
																>
																	{sample.sample_name}
																</h2>
															)}
															<button
																onClick={() => handleDeleteSample(index)}
																className="text-red-500 hover:border hover:border-red-500 rounded-full w-5 h-5 flex items-center justify-center"
																title="Xóa mẫu"
															>
																✕
															</button>
														</div>

														<div className="mb-2">
															<label htmlFor={`matrix-${index}`} className="text-sm font-medium">
																Nền mẫu:
															</label>
															<input
																type="text"
																id={`matrix-${index}`}
																value={sample.matrix || ''}
																onChange={(e) => handleMatrixChange(index, e.target.value)}
																className="border p-1 rounded w-full bg-white"
															/>
														</div>

														<div className="flex items-center my-1">
															<input
																type="checkbox"
																id={`urgent-${index}`}
																checked={urgentSamples[index] || false}
																onChange={(e) => handleUrgentChange(index, e.target.checked)}
																className="mr-2"
															/>
															<label htmlFor={`urgent-${index}`} className="text-sm font-medium">
																Mẫu khẩn
															</label>
														</div>

														<div className="overflow-x-auto">
															<table className="w-full">
																<thead>
																	<tr className="border-b-2 text-gray-500">
																		<th className="p-1 text-start">Mã</th>
																		<th className="p-1 text-start">Chỉ tiêu</th>
																		<th className="p-1 text-start">Nền mẫu</th>
																		<th className="p-1 text-start w-10">Xóa</th>
																	</tr>
																</thead>
																<tbody>
																	{sample.analysis.map((item, idx) => (
																		<tr key={idx} className="border-b">
																			<td className="p-1 text-start">{item.parameter_uid}</td>
																			<td className="p-1 text-start">{item.parameter_name}</td>
																			<td className="p-1 text-start">{item.matrix}</td>
																			<td className="p-1 text-center">
																				<button
																					onClick={() => handleDeleteAnalysis(index, idx)}
																					className="text-red-500 hover:border hover:border-red-500 rounded-full w-5 h-5 flex items-center justify-center mx-auto"
																					title="Xóa chỉ tiêu"
																				>
																					✕
																				</button>
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>

														<div className="mt-3 flex justify-end">
															<button
																onClick={() => handleOpenAddParameter(index)}
																className="border border-primary text-primary text-sm rounded-lg p-1 flex items-center"
																title="Thêm chỉ tiêu"
															>
																<MdLibraryAdd size={16} className="mr-1" /> Thêm chỉ tiêu
															</button>
														</div>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							)}

							{crmData && (
								<div className="flex justify-end w-full mt-4">
									<button
										onClick={handleCreateReceipt}
										disabled={isCreating}
										className="bg-primary text-white font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
									>
										{isCreating ? 'Đang tạo...' : 'Tạo tiếp nhận mẫu'}
									</button>
								</div>
							)}
						</div>

						<div className="flex justify-end mt-4">
							<button
								onClick={closeModal}
								className="bg-gray-300 text-gray-700 font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-gray-400"
								disabled={isCreating}
							>
								Đóng
							</button>
						</div>
					</div>
				</div>
			)}
			{/* Add the parameter selection modal */}
			{isAddingParameter && currentSampleIndex !== null && renderAddParameterModal()}
		</>
	);
};

export default CreateReceiptFromCRM;
