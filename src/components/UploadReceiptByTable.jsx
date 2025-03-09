import React, { useState } from 'react';
import axios from 'axios';

const UploadReceiptByTable = () => {
	const [file, setFile] = useState(null);

	const handleFileChange = (event) => {
		setFile(event.target.files[0]);
	};

	const handleSubmit = async () => {
		if (!file) {
			alert('Please select a file first!');
			return;
		}

		const formData = new FormData();
		formData.append('file', file);

		try {
			const response = await axios.post('http://127.0.0.1:1880/read_excel', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
				onUploadProgress: (progressEvent) => {
					console.log('Upload Progress: ' + Math.round((progressEvent.loaded / progressEvent.total) * 100) + '%');
				},
			});
			console.log('File uploaded successfully:', response.data);
		} catch (error) {
			console.error('Error uploading file:', error);
		}
	};

	return (
		<div
			style="padding-top: 2.5mm; display: flex; flex-direction: column;"
			data-mce-style="padding-top: 2.5mm; display: flex; flex-direction: column;"
		>
			<div
				style="border: 1px solid black; padding: 6pt; padding-top: 3pt; flex-grow: 1; position: relative;"
				data-mce-style="border: 1px solid black; padding: 6pt; padding-top: 3pt; flex-grow: 1; position: relative;"
			>
				<div
					style="display: flex; justify-content: space-between;"
					data-mce-style="display: flex; justify-content: space-between;"
				>
					<p style="font-size: 75%; font-weight: bold;" data-mce-style="font-size: 75%; font-weight: bold;">
						Thông tin mẫu thử / Sample info:
					</p>
					<p
						style="font-size: 75%; min-width: 20%; text-align: right;"
						data-mce-style="font-size: 75%; min-width: 20%; text-align: right;"
					>
						SPx25130303-01
					</p>
				</div>
				<div style="display: flex;" data-mce-style="display: flex;">
					<div style="width: 50%; text-align: left;" data-mce-style="width: 50%; text-align: left;">
						<strong>Tên mẫu thử</strong> / Sample name
					</div>
					<div style="width: 50%;" data-mce-style="width: 50%;">
						<p style="font-weight: 600; text-align: left;" data-mce-style="font-weight: 600; text-align: left;">
							030325-A005160
						</p>
					</div>
				</div>
				<div style="display: flex;" data-mce-style="display: flex;">
					<div style="width: 50%; text-align: left;" data-mce-style="width: 50%; text-align: left;">
						<strong>Số lô</strong> / LOT No.
					</div>
					<div style="width: 50%;" data-mce-style="width: 50%;">
						<p>--</p>
					</div>
				</div>
				<div style="display: flex;" data-mce-style="display: flex;">
					<div style="width: 50%; text-align: left;" data-mce-style="width: 50%; text-align: left;">
						<strong>Ngày Sản xuất</strong> / MFG.:
					</div>
					<div style="width: 50%;" data-mce-style="width: 50%;">
						<p>--</p>
					</div>
				</div>
				<div style="display: flex;" data-mce-style="display: flex;">
					<div style="width: 50%; text-align: left;" data-mce-style="width: 50%; text-align: left;">
						<strong>Hạn Sử dụng</strong> / EXP.:
					</div>
					<div style="width: 50%;" data-mce-style="width: 50%;">
						<p>--</p>
					</div>
				</div>
				<div style="display: flex;" data-mce-style="display: flex;">
					<div style="width: 50%; text-align: left;" data-mce-style="width: 50%; text-align: left;">
						<strong>Nơi Sản xuất</strong> / MFR.:
					</div>
					<div style="width: 50%;" data-mce-style="width: 50%;">
						<p>--</p>
					</div>
				</div>
				<div
					style="border-top: 1px solid #e7eaf3; padding-bottom: 1pt; margin-top: 2pt;"
					data-mce-style="border-top: 1px solid #e7eaf3; padding-bottom: 1pt; margin-top: 2pt;"
				></div>
				<div style="display: flex;" data-mce-style="display: flex;">
					<div style="width: 50%; text-align: left;" data-mce-style="width: 50%; text-align: left;">
						<strong>Mô tả mẫu</strong> / Sample desc.:
					</div>
					<div style="width: 50%;" data-mce-style="width: 50%;">
						<p style="text-align: left;" data-mce-style="text-align: left;">
							Mẫu thạch dừa đựng trong hũ, có nhãn đầy đủ thông tin
						</p>
					</div>
				</div>
				<div style="display: flex;" data-mce-style="display: flex;">
					<div style="width: 50%; text-align: left;" data-mce-style="width: 50%; text-align: left;">
						<strong>Ngày tiếp nhận</strong> / Receipt date:
					</div>
					<div style="width: 50%;" data-mce-style="width: 50%;">
						<p style="text-align: left;" data-mce-style="text-align: left;">
							3-3-2025
						</p>
					</div>
				</div>
				<div
					style="position: absolute; top: 5px; right: 5px; display: flex; gap: 0.5rem;"
					data-mce-style="position: absolute; top: 5px; right: 5px; display: flex; gap: 0.5rem;"
				></div>
			</div>
		</div>
	);
};

export default UploadReceiptByTable;
