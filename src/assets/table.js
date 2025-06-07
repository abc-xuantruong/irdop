const table = global.get('table');
const axios = global.get('axios');

function getDateFormatted(timestamp) {
	const today = timestamp ? new Date(timestamp) : new Date();
	const day = String(today.getDate()).padStart(2, '0');
	const month = String(today.getMonth() + 1).padStart(2, '0'); // Months start at 0
	const year = today.getFullYear();
	return `${day}-${month}-${year}`;
}

async function getIdentityName(identity_uid) {
	node.warn(identity_uid);
	if (!identity_uid) return '';

	try {
		const response = await axios.post('https://pink.irdop.org/ab4dg2/get/iden', {
			identity_uid: identity_uid,
		});

		if (response && response.data && response.data.identity_name) {
			return response.data.identity_name;
		} else {
			return identity_uid || '';
		}
	} catch (error) {
		node.warn(`Error fetching identity for ${identity_uid}: ${error.message}`);
		return identity_uid || '';
	}
}

async function fetchTechnicians() {
	try {
		const response = await axios.get('https://pink.irdop.org/db/get/techinician');
		if (response && response.data) {
			return response.data;
		}
		return [];
	} catch (error) {
		node.warn(`Error fetching technicians: ${error.message}`);
		return [];
	}
}

function extractParameterText(parameterData) {
	if (!parameterData) return '';

	if (typeof parameterData === 'object' && parameterData.text !== undefined) {
		return parameterData.text || '';
	}

	return parameterData;
}

async function createAndWriteExcel() {
	try {
		const technicians = await fetchTechnicians();
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet('Tiếp nhận mẫu');

		worksheet.pageSetup = {
			paperSize: 9,
			orientation: 'portrait',
			fitToPage: true,
			fitToWidth: 1,
			fitToHeight: 0,
			horizontalCentered: true,
			margins: {
				left: 0.5,
				right: 0.5,
				top: 0.25,
				bottom: 0.5,
				header: 0.3,
				footer: 0.3,
			},
		};

		worksheet.columns = [
			{ width: 40 / 7.776 },
			{ width: 180 / 7.776 },
			{ width: 100 / 7.776 },
			{ width: 170 / 7.776 },
			{ width: 230 / 7.776 },
			{ width: 180 / 7.776 },
			{ width: 105 / 7.776 },
		];
		// Use msg.req.body instead of fetching from table
		const dataReceipt = msg.req.body;
		node.warn(dataReceipt);
		dataReceipt.created_by_uid = await getIdentityName(dataReceipt.created_by_uid);
		const data = dataReceipt?.samples || [];

		// Row 1: Order Code
		for (let col = 1; col <= 7; col++) {
			const cell = worksheet.getCell(1, col);
			cell.border = {
				...cell.border,
				bottom: { style: 'thick' },
			};
		}
		worksheet.getCell('B1').value = (dataReceipt?.order_code || '').toUpperCase();
		worksheet.mergeCells('B1:G1');
		worksheet.getCell('B1').alignment = { horizontal: 'right', vertical: 'middle' }; // Row 2: HEADER Line 1
		worksheet.mergeCells('B2:G2');
		worksheet.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
		worksheet.getCell('B2').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';

		// Row 3: HEADER Line 2 (with underline)
		worksheet.mergeCells('B3:G3');
		worksheet.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };
		worksheet.getCell('B3').value = 'Độc lập - Tự do - Hạnh phúc';
		worksheet.getCell('B3').font = { underline: true };

		// Row 4: Date (moved up and left aligned with italic)
		const today = new Date();
		const day = today.getDate();
		const month = today.getMonth() + 1;
		const year = today.getFullYear();

		worksheet.getCell('A4').value = `..,Ngày ${day} tháng ${month} năm ${year}`;
		worksheet.mergeCells('A4:G4');
		worksheet.getCell('A4').alignment = { horizontal: 'right', vertical: 'middle' };
		worksheet.getCell('A4').font = { italic: true };

		// const imageUrl = 'https://irdop.org/wp-content/uploads/2024/07/IRDOP-LOGO-2710-02-2.png';
		// const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
		// const imageBuffer = Buffer.from(response.data, 'binary');

		// const imageId = workbook.addImage({
		//     buffer: imageBuffer,
		//     extension: 'png',
		// });

		// worksheet.addImage(imageId, {
		//     tl: { col: 1, row: 0 },
		//     ext: { width: 196, height: 60 },		// });		worksheet.getRow(2).height = 45;
		// Row 5: Title (moved down by one row)
		worksheet.getCell('A5').value = 'PHIẾU GỬI MẪU THỬ NGHIỆM';
		worksheet.mergeCells('A5:G5');
		worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
		worksheet.getRow(5).height = 60;
		// Row 6: Section 1
		worksheet.getCell('A6').value = '1.';
		worksheet.getCell('B6').value = 'Thông tin:';
		worksheet.mergeCells('B6:C6');
		worksheet.getCell('A6').font = { bold: true };
		worksheet.getCell('B6').font = { bold: true }; // Row 7: Customer information section
		worksheet.getCell('A7').value = '  1.1 Thông tin khách hàng:';
		worksheet.mergeCells('A7:C7');
		worksheet.getCell('A7').font = { italic: true };

		worksheet.getCell('B8').value = 'Tên khách hàng: ' + (dataReceipt?.client?.client_name || '');
		worksheet.mergeCells('B8:G8');

		worksheet.getCell('B9').value = 'Địa chỉ: ' + (dataReceipt?.client?.client_address || '');
		worksheet.mergeCells('B9:G9');

		worksheet.getCell('B10').value = 'MST/CCCD: ' + (dataReceipt?.client?.legal_id || '');
		worksheet.mergeCells('B10:G10');

		worksheet.getCell('B11').value = 'Thông tin xuất hóa đơn (nếu khác thông tin trên): ';
		worksheet.mergeCells('B11:D11');

		worksheet.getCell('B12').value = 'Số điện thoại: ....' + (dataReceipt?.contact?.phone || '');
		worksheet.mergeCells('B12:D12');
		worksheet.getCell('E12').value = 'Email*: ....' + (dataReceipt?.contact?.email || '');
		worksheet.mergeCells('E12:G12');
		// Row 14: Sender information section
		worksheet.getCell('A14').value = '  1.2 Người gửi mẫu: ';
		worksheet.mergeCells('A14:B14');
		worksheet.getCell('C14').value = dataReceipt?.contact?.name || '';
		worksheet.mergeCells('C14:D14');
		worksheet.getCell('A14').font = { italic: true };
		worksheet.getCell('C14').font = { italic: true }; // Row 15: CCCD field
		worksheet.getCell('B15').value = 'CCCD: ';
		worksheet.mergeCells('C15:G15');

		// Row 16: Ngày cấp field
		worksheet.getCell('B16').value = 'Ngày cấp: ';
		worksheet.mergeCells('C16:G16');

		// Row 17: Nơi cấp field
		worksheet.getCell('B17').value = 'Nơi cấp: ';
		worksheet.mergeCells('C17:G17');
		// Row 14: Ngày gửi mẫu field (moved to row 14)
		worksheet.getCell('E14').value = 'Ngày gửi mẫu: ';
		worksheet.mergeCells('F14:G14');

		worksheet.getCell('A19').value = '2.';
		worksheet.getCell('B19').value = 'Ngày trả kết quả (dự kiến):';
		worksheet.mergeCells('B19:D19');
		worksheet.getCell('A19').font = { bold: true };
		worksheet.getCell('B19').font = { bold: true };
		worksheet.mergeCells('E19:G19');

		worksheet.getCell('B20').value = 'Nơi nhận phiếu kết quả thử nghiệm:';
		worksheet.mergeCells('B20:G20');

		worksheet.getCell('B21').value = 'Bản cứng (Địa chỉ):';
		worksheet.mergeCells('D21:G21');

		worksheet.getCell('B22').value = 'Bản mềm (Email):';
		worksheet.mergeCells('D22:G22');
		worksheet.getCell('B23').value = 'Khác:';
		worksheet.mergeCells('D23:G23');

		worksheet.getCell('B25').value = 'Thông tin đăng ký thử nghiệm (mẫu):';
		worksheet.getCell('A25').value = '3.';
		worksheet.mergeCells('B25:G25');
		worksheet.getCell('A25').font = { bold: true };
		worksheet.getCell('B25').font = { bold: true };

		const titleCell = ['A27', 'B27', 'D27', 'E27', 'F27', 'G27'];
		worksheet.mergeCells('B27:C27');
		const titleValue = [
			'TT',
			'Thông tin mẫu(*) \n(Tên mẫu, số lô, nơi sx...)',
			'Mô tả mẫu(*)',
			'Chỉ tiêu yêu cầu kiểm nghiệm',
			'Phương pháp thử',
			'Ghi chú',
		];
		worksheet.getRow(27).height = 40;
		titleCell.forEach((cell, index) => {
			worksheet.getCell(cell).value = titleValue[index];
			worksheet.getCell(cell).font = { italic: true };
			worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
			worksheet.getCell(cell).border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' },
			};
		});

		let currentRow = 28;
		if (data.length > 0) {
			data.forEach((sample, index) => {
				worksheet.getCell(`A${currentRow}`).value = index + 1;
				worksheet.getCell(`B${currentRow}`).value = `Tên mẫu:${sample?.sample_name || ''}\nSố lô: ${
					sample?.sample_information?.filter((infor) => infor.fname === 'Số lô / LOT no.')[0]?.fvalue || ''
				}\nNgày SX:${
					sample?.sample_information?.filter((infor) => infor.fname === 'Ngày sản xuất / mfg.')[0]?.fvalue || ''
				}\nHạn SD: ${
					sample?.sample_information?.filter((infor) => infor.fname === 'Hạn sử dụng / exp.')[0]?.fvalue || ''
				}\nNơi SX: ${
					sample?.sample_information?.filter((infor) => infor.fname === 'Nơi sản xuất / mfr.')[0]?.fvalue || ''
				}`;
				worksheet.getCell(`D${currentRow}`).value = sample?.sample_description || '';

				const testOrders = sample.analysis ?? [];
				testOrders.forEach((test_order, testIndex) => {
					const parameterName = extractParameterText(test_order?.parameter_name);
					worksheet.getCell(`E${currentRow + testIndex}`).value = parameterName || '';
					worksheet.getCell(`F${currentRow + testIndex}`).value = test_order?.protocol_code || '';
					const dataCell = [`E${currentRow + testIndex}`, `F${currentRow + testIndex}`];
					dataCell.forEach((cell) => {
						worksheet.getCell(cell).border = {
							top: { style: 'thin' },
							left: { style: 'thin' },
							bottom: { style: 'thin' },
							right: { style: 'thin' },
						};
					});
				});

				if (testOrders.length > 0) {
					worksheet.mergeCells(`A${currentRow}:A${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`B${currentRow}:C${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`D${currentRow}:D${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`G${currentRow}:G${currentRow + testOrders.length - 1}`);
				}

				const cells = [`A${currentRow}`, `B${currentRow}`, `D${currentRow}`, `G${currentRow}`];
				cells.forEach((cell) => {
					worksheet.getCell(cell).alignment = { horizontal: 'left', vertical: 'middle' };
					worksheet.getCell(cell).border = {
						top: { style: 'thin' },
						left: { style: 'thin' },
						bottom: { style: 'thin' },
						right: { style: 'thin' },
					};
				});

				currentRow += testOrders.length || 1;
			});
		}

		worksheet.getCell(`B${currentRow + 1}`).value =
			'Ghi chú:\n\t(*)	: Mẫu gửi bắt buộc phải có tên mẫu, mô tả mẫu. Thông tin tên mẫu, Ngày sản xuất, Hạn sử dụng, Số lô phải khớp giữa phiếu yêu cầu kiểm nghiệm và mẫu thực tế. Trường hợp không khớp mẫu nhận sẽ hoàn lại hàng, chi phí vận chuyển khách hàng chịu\n\t(**)	: Chỉ chọn một hình thức trả kết quả, trường hợp thêm hình thức sẽ chịu thêm chi phí.';
		worksheet.mergeCells(`B${currentRow + 1}:G${currentRow + 1}`);
		worksheet.getCell(`B${currentRow + 1}`).font = { italic: true };
		worksheet.getRow(currentRow + 1).height = 95;

		currentRow += 2;
		worksheet.mergeCells(`B${currentRow + 1}:G${currentRow + 1}`);
		worksheet.getCell(`B${currentRow + 1}`).value =
			'Chúng tôi hiểu rằng các kết quả thử nghiệm và phiếu kết quả do phòng thử nghiệm cung cấp dựa trên mẫu gửi chỉ được sử dụng cho các mục đích hợp pháp, phù hợp với quy định pháp luật hiện hành, và phòng thử nghiệm không chịu trách nhiệm đối với bất kỳ việc sử dụng kết quả thử nghiệm ngoài mục đích đã thỏa thuận hoặc các chỉ tiêu không thuộc phạm vi công nhận (trừ trường hợp do lỗi của phòng thử nghiệm) và sẽ không có khiếu nại.';
		worksheet.getCell(`B${currentRow + 1}`).alignment = { wrapText: true, vertical: 'top' };
		worksheet.getRow(currentRow + 1).height = 77;

		currentRow += 1;
		worksheet.getCell(`A${currentRow + 1}`).value = '4.';
		worksheet.getCell(`B${currentRow + 1}`).value = 'Thông tin liên hệ: ';
		worksheet.mergeCells(`B${currentRow + 1}:G${currentRow + 1}`);
		worksheet.getCell(`A${currentRow + 1}`).font = { bold: true };
		worksheet.getCell(`B${currentRow + 1}`).font = { bold: true };

		worksheet.getCell(`B${currentRow + 2}`).value = 'Viện nghiên cứu và phát triển sản phẩm thiên nhiên IRDOP';
		worksheet.mergeCells(`B${currentRow + 2}:G${currentRow + 2}`);

		worksheet.getCell(`B${currentRow + 3}`).value =
			'Địa chỉ: 12 Phùng Khoang 2 - Phường Trung Văn - Quận Nam Từ Liêm - TP. Hà Nội';
		worksheet.mergeCells(`B${currentRow + 3}:G${currentRow + 3}`);

		worksheet.getCell(`B${currentRow + 4}`).value = 'SDT: 024 355 35 355';
		worksheet.mergeCells(`B${currentRow + 4}:G${currentRow + 4}`);

		worksheet.getCell(`B${currentRow + 5}`).value = 'Email: kiemnghiem@irdop.org';
		worksheet.mergeCells(`B${currentRow + 5}:G${currentRow + 5}`);

		worksheet.getCell(`B${currentRow + 7}`).value = 'Người tiếp nhận';
		worksheet.mergeCells(`B${currentRow + 7}:C${currentRow + 7}`);
		worksheet.getCell(`B${currentRow + 7}`).font = { bold: true };
		worksheet.getCell(`B${currentRow + 7}`).alignment = { horizontal: 'center' };

		worksheet.getCell(`B${currentRow + 8}`).value = 'Ký, ghi rõ họ tên';
		worksheet.mergeCells(`B${currentRow + 8}:C${currentRow + 8}`);
		worksheet.getCell(`B${currentRow + 8}`).alignment = { horizontal: 'center' };

		worksheet.getCell(`F${currentRow + 7}`).value = 'Khách hàng';
		worksheet.mergeCells(`F${currentRow + 7}:G${currentRow + 7}`);
		worksheet.getCell(`F${currentRow + 7}`).font = { bold: true };
		worksheet.getCell(`F${currentRow + 7}`).alignment = { horizontal: 'center' };
		worksheet.getCell(`F${currentRow + 8}`).value = 'Ký, đóng dấu, ghi rõ họ tên';
		worksheet.mergeCells(`F${currentRow + 8}:G${currentRow + 8}`);
		worksheet.getCell(`F${currentRow + 8}`).alignment = { horizontal: 'center' };
		worksheet.eachRow({ includeEmpty: true }, (row) => {
			row.eachCell({ includeEmpty: true }, (cell) => {
				const currentFont = cell.font || {};
				cell.font = { ...currentFont, name: 'Times New Roman', size: 14 };
				const currentAlignment = cell.alignment || {};
				cell.alignment = { ...currentAlignment, wrapText: true, vertical: 'middle' };
			});
		});
		worksheet.getCell('E1').font = { bold: true, name: 'Times New Roman', size: 16 };
		// Title: Make larger and bold
		worksheet.getCell('A5').font = { bold: true, name: 'Times New Roman', size: 22 };
		// Date: Ensure it's italic but not bold
		worksheet.getCell('A4').font = { italic: true, name: 'Times New Roman', size: 14 };

		// Note: File writing logic is assumed to be handled elsewhere as it was not included in the original code
		// Tạo buffer chứa tệp Excel
		const excelBuffer = await workbook.xlsx.writeBuffer();

		// Đặt header và payload
		msg.headers = {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${dataReceipt?.request_code}.xlsx"`,
		};

		msg.payload = excelBuffer; // Gửi buffer thay vì stream

		node.warn(`Export excel: ${dataReceipt?.receipt_uid}.xlsx`);

		return msg;
	} catch (error) {
		node.warn(`Error creating Excel file: ${error.message}`);
		throw error;
	}
}

try {
	msg = await createAndWriteExcel();
	return msg;
} catch (error) {
	node.warn(error);
}
