import React, { useContext, useEffect } from 'react';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import TinyMceInput from './Input';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Event = () => {
	const { setCurrentTitlePage, currentUser } = useContext(GlobalContext);
	const [sample, setSample] = React.useState(1);
	const [listParameters, setListParameters] = React.useState([]);
	const [editableCell, setEditableCell] = React.useState({ row: null, column: null });
	const [inputValue, setInputValue] = React.useState('');

	useEffect(() => {
		const fetchParameters = async () => {
			const sampleId = sample;
			const defaultParameters = [
				{
					identity_uid: currentUser?.identity_uid,
					sample_id: sampleId,
					event_uid: 'IRDOP-INTRA-H1Y25-C1',
					parameterId: 1,
					sample_name: sample,
					sample_matrix: 'Thực phẩm (thịt)',
					parameter_name: 'Tổng số vi sinh vật hiếu khí',
					protocol_name: '',
					result_value1: '',
					result_value2: '',
					result_unit: '',
					lodq: '',
				},
				{
					identity_uid: currentUser?.identity_uid,
					sample_id: sampleId,
					event_uid: 'IRDOP-INTRA-H1Y25-C1',
					parameterId: 2,
					sample_name: sample,
					sample_matrix: 'Thực phẩm (thịt)',
					parameter_name: 'Định lượng E.coli',
					protocol_name: '',
					result_value1: '',
					result_value2: '',
					result_unit: '',
					lodq: '',
				},
				{
					identity_uid: currentUser?.identity_uid,
					sample_id: sampleId,
					event_uid: 'IRDOP-INTRA-H1Y25-C1',
					parameterId: 3,
					sample_name: sample,
					sample_matrix: 'Thực phẩm (thịt)',
					parameter_name: 'Định lượng Coliforms',
					protocol_name: '',
					result_value1: '',
					result_value2: '',
					result_unit: '',
					lodq: '',
				},
			];

			const response = await apiPost('https://black.irdop.org/eventc1/db/get/event/', {
				identity_uid: currentUser?.identity_uid,
				event_uid: 'IRDOP-INTRA-H1Y25-C1',
			});

			const fetchedParameters = response.data;

			const updatedParameters = defaultParameters.map((defaultParam) => {
				const matchingParam = fetchedParameters.find(
					(param) =>
						param.identity_uid === defaultParam.identity_uid &&
						param.sample_id === defaultParam.sample_id &&
						param.event_uid === defaultParam.event_uid &&
						param.parameterId === defaultParam.parameterId,
				);
				return matchingParam || defaultParam;
			});

			setListParameters(updatedParameters);
		};

		if (currentUser) {
			fetchParameters();
		}
	}, [sample, currentUser]);

	useEffect(() => {
		setCurrentTitlePage(currentUser?.identity_name);
	}, [currentUser]);

	const handleCellClick = (row, column) => {
		setEditableCell({ row, column });
		setInputValue(listParameters[row][column]);
	};

	const handleSaveContent = async (content, column) => {
		const newListParameters = [...listParameters];
		newListParameters[editableCell.row][column] = content;
		setListParameters(newListParameters);

		const updatedParameter = newListParameters[editableCell.row];
		const response = await apiPost('https://black.irdop.org/eventc1/db/insert/event', { parameter: updatedParameter });
		if (response?.status === 200) {
			toast.success(`Nhập kết quả thành công.`);
		} else {
			toast.error('Lỗi khi nhập kết quả');
		}

		setEditableCell({ row: null, column: null });
	};

	const handleKeyDown = (e, content) => {
		if (e.key === 'Enter') {
			const newListParameters = [...listParameters];
			newListParameters[editableCell.row][editableCell.column] = content;
			setListParameters(newListParameters);
			setEditableCell({ row: null, column: null });
		} else {
			setInputValue(content);
		}
	};

	const handleInputChange = (e, rowIndex, column) => {
		const newListParameters = [...listParameters];
		newListParameters[rowIndex][column] = e.target.value;
		setListParameters(newListParameters);
	};

	const handleInputBlur = (rowIndex, column) => {
		handleSaveContent(listParameters[rowIndex][column]);
		setEditableCell({ row: null, column: null });
	};

	const handleKeyDownForInput = (e, rowIndex, column) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSaveContent(listParameters[rowIndex][column]);
			setEditableCell({ row: null, column: null });
		}
	};

	return (
		<div className="w-full h-full relative">
			<ToastContainer />
			<Breadcrumb paths={[{ name: 'Trang chủ' }]} />
			<div className="w-full h-full flex flex-col justify-center items-center bg-white rounded-lg p-4 shadow">
				<div className="flex justify-between items-center w-full text-primary font-medium mb-2">
					<p className="text-2xl font-semibold text-wrap w-full text-start">Các chương trình tham gia</p>
				</div>
				<div className="w-full border-2 px-4 py-2 rounded-lg">
					<span className="flex min-w-[300px] py-1">
						<p className="text-xl text-start w-48">Tên chương trình:</p>
						<b className="text-xl text-start">Vi sinh trong thực phẩm 02/2025</b>
					</span>
					<span className="flex min-w-[300px] py-1">
						<p className="text-xl text-start w-48">Mã chương trình:</p>
						<b className="text-xl text-start">IRDOP-INTRA-H1Y25-C1</b>
					</span>
					<span className="flex min-w-[300px] py-1">
						<p className="text-xl text-start w-48">Thời gian: </p>
						<p className="text-xl text-start">20/02/2025 - 28/02/2025</p>
					</span>
					<span className="flex min-w-[300px] py-1">
						<p className="text-xl text-start w-48">Nền mẫu: </p>
						<p className="text-xl text-start">Thực phẩm (thịt)</p>
					</span>
					<span className="flex min-w-[300px] py-1">
						<p className="text-xl text-start w-48">Phương pháp: </p>
						<p className="text-xl text-start">Phòng thử nghiệm tự lựa chọn phương pháp phù hợp</p>
					</span>
					<span className="flex min-w-[300px] py-1 items-center mb-2">
						<p className="text-xl text-start w-48">Nhập kết quả: </p>
						<div className="flex justify-between items-center">
							<button
								className={`w-48 py-1 border-2  rounded-lg focus:outline-none mr-2 ${
									sample === 1 ? 'bg-cyan-500' : 'bg-white border-slate-200'
								}`}
								onClick={() => setSample(1)}
							>
								Mẫu thử 1
							</button>
							<button
								className={`w-48 py-1 border-2 rounded-lg focus:outline-none ${
									sample === 2 ? 'bg-cyan-500 ' : 'bg-white border-slate-200'
								}`}
								onClick={() => setSample(2)}
							>
								Mẫu thử 2
							</button>
						</div>
					</span>

					<div className="flex  items-center w-full overflow-auto">
						<table className="w-full min-w-[1000px] border-2 ">
							<thead>
								<tr>
									<th className="border-2 p-2 text-start w-[20%]">Chỉ tiêu</th>
									<th className="border-2 p-2 text-start w-[20%]">Phương pháp</th>
									<th className="border-2 p-2 text-start w-[15%]">Kết quả lần 1</th>
									<th className="border-2 p-2 text-start w-[15%]">Kết quả lần 2</th>
									<th className="border-2 p-2 text-start w-[15%]">Đơn vị</th>
									<th className="border-2 p-2 text-start w-[15%]">Lod/Loq</th>
								</tr>
							</thead>
							<tbody>
								{listParameters.map((parameter, rowIndex) => (
									<tr key={rowIndex}>
										<td className="border p-2 text-start ">{parameter.parameter_name}</td>
										<td className="border p-2 text-start " onClick={() => handleCellClick(rowIndex, 'protocol_name')}>
											{editableCell.row === rowIndex && editableCell.column === 'protocol_name' ? (
												<input
													type="text"
													className="bg-white w-full p-1 h-[34px]"
													value={parameter.protocol_name}
													onChange={(e) => handleInputChange(e, rowIndex, 'protocol_name')}
													onBlur={() => handleInputBlur(rowIndex, 'protocol_name')}
													onKeyDown={(e) => handleKeyDownForInput(e, rowIndex, 'protocol_name')}
													autoFocus
												/>
											) : (
												<p
													className={` border-white border hover:border-purple-500 rounded p-1 h-[34px] ${
														parameter?.protocol_name ? '' : 'text-center'
													}`}
												>
													{parameter?.protocol_name || '--'}
												</p>
											)}
										</td>
										<td
											className="p-1 pb-0 border relative "
											onClick={() => handleCellClick(rowIndex, 'result_value1')}
										>
											<div className="hover:border-purple-500 hover:border rounded ">
												{editableCell.row === rowIndex && editableCell.column === 'result_value1' ? (
													<TinyMceInput
														value={inputValue}
														onUpdate={(content) => handleSaveContent(content, 'result_value1')}
														onKey={handleKeyDown}
													/>
												) : (
													<div
														dangerouslySetInnerHTML={{ __html: `${parameter?.result_value1 || '--'}` }}
														className="p-1"
													/>
												)}
											</div>
										</td>
										<td
											className="p-1 pb-0 border relative "
											onClick={() => handleCellClick(rowIndex, 'result_value2')}
										>
											<div className="hover:border-purple-500 hover:border rounded ">
												{editableCell.row === rowIndex && editableCell.column === 'result_value2' ? (
													<TinyMceInput
														value={inputValue}
														onUpdate={(content) => handleSaveContent(content, 'result_value2')}
														onKey={handleKeyDown}
													/>
												) : (
													<div
														dangerouslySetInnerHTML={{ __html: `${parameter?.result_value2 || '--'}` }}
														className="p-1"
													/>
												)}
											</div>
										</td>
										<td className="p-1 pb-0 border relative" onClick={() => handleCellClick(rowIndex, 'result_unit')}>
											<div className="hover:border-purple-500 hover:border rounded ">
												{editableCell.row === rowIndex && editableCell.column === 'result_unit' ? (
													<TinyMceInput
														value={inputValue}
														onUpdate={(content) => handleSaveContent(content, 'result_unit')}
														onKey={handleKeyDown}
													/>
												) : (
													<div
														dangerouslySetInnerHTML={{ __html: `${parameter?.result_unit || '--'}` }}
														className="p-1"
													/>
												)}
											</div>
										</td>
										<td className="p-1 pb-0 border relative" onClick={() => handleCellClick(rowIndex, 'lodq')}>
											<div className="hover:border-purple-500 hover:border rounded ">
												{editableCell.row === rowIndex && editableCell.column === 'lodq' ? (
													<TinyMceInput
														value={inputValue}
														onUpdate={(content) => handleSaveContent(content, 'lodq')}
														onKey={handleKeyDown}
													/>
												) : (
													<div dangerouslySetInnerHTML={{ __html: `${parameter?.lodq || '--'}` }} className="p-1" />
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<span className="flex w-full py-2 justify-end">
						<p className="text-base text-start w-40">Tiêu chí đánh giá: </p>
						<p className="text-base font-medium text-start">Độ tái lặp, độ lệch chuẩn</p>
					</span>
				</div>
			</div>
		</div>
	);
};

export default Event;
