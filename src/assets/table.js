const table = global.get('table');
const axios = global.get('axios');
// const ExcelJS = global.get('ExcelJS');

function getDateFormatted(timestamp) {
	if (!timestamp) return '';
	const today = new Date(timestamp);
	// Kiểm tra nếu ngày không hợp lệ
	if (isNaN(today.getTime())) {
		return '';
	}
	const day = String(today.getDate()).padStart(2, '0');
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const year = today.getFullYear();
	return `${day}-${month}-${year}`;
}

async function getIdentityName(identity_uid) {
	// Giữ nguyên
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
	// Giữ nguyên
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

function findInfoValue(sampleInfo, fieldName) {
	if (!Array.isArray(sampleInfo)) return '';
	const info = sampleInfo.find((item) => item.fname === fieldName);
	return info ? info.fvalue : '';
}

async function createAndWriteExcel() {
	try {
		const technicians = await fetchTechnicians();
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet('Tiếp nhận mẫu');

		// --- CÀI ĐẶT TRANG VÀ CỘT (GIỮ NGUYÊN) ---
		worksheet.pageSetup = {
			paperSize: 9,
			orientation: 'portrait',
			fitToPage: true,
			fitToWidth: 1,
			fitToHeight: 0,
			horizontalCentered: true,
			margins: { left: 0.5, right: 0.5, top: 0.25, bottom: 0.5, header: 0.3, footer: 0.3 },
		};
		worksheet.columns = [
			{ width: 40 / 7.776 },
			{ width: 180 / 7.776 },
			{ width: 110 / 7.776 },
			{ width: 170 / 7.776 },
			{ width: 240 / 7.776 },
			{ width: 180 / 7.776 },
			{ width: 95 / 7.776 },
		];
		for (let row = 1; row <= 100; row++) {
			for (let col = 1; col <= 7; col++) {
				worksheet.getCell(row, col).numFmt = '@';
			}
		}

		// --- ÁNH XẠ DỮ LIỆU ---
		const dataRequest = msg.req.body;
		const samples = dataRequest?.samples || [];

		// --- HEADER VÀ THÔNG TIN CHUNG (GIỮ NGUYÊN) ---
		for (let col = 1; col <= 7; col++)
			worksheet.getCell(1, col).border = { ...worksheet.getCell(1, col).border, bottom: { style: 'thick' } };
		worksheet.getCell('B1').value = (dataRequest?.order_code || '').toUpperCase();
		worksheet.mergeCells('B1:G1');
		worksheet.getCell('B1').alignment = { horizontal: 'right', vertical: 'middle' };
		worksheet.getCell('B1').font = { bold: true, name: 'Times New Roman', size: 16 };
		worksheet.mergeCells('B2:G2');
		worksheet.getCell('B2').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
		worksheet.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
		worksheet.mergeCells('B3:G3');
		worksheet.getCell('B3').value = 'Độc lập - Tự do - Hạnh phúc';
		worksheet.getCell('B3').font = { underline: true };
		worksheet.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };
		const today = new Date();
		worksheet.getCell('A4').value = `..,Ngày ${today.getDate()} tháng ${
			today.getMonth() + 1
		} năm ${today.getFullYear()}`;
		worksheet.mergeCells('A4:G4');
		worksheet.getCell('A4').alignment = { horizontal: 'right', vertical: 'middle' };
		worksheet.getCell('A4').font = { italic: true };
		worksheet.getCell('A5').value = 'PHIẾU GỬI MẪU THỬ NGHIỆM';
		worksheet.mergeCells('A5:G5');
		worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
		worksheet.getRow(5).height = 60;
		worksheet.getCell('A5').font = { bold: true, name: 'Times New Roman', size: 22 };

		// --- SECTION 1: THÔNG TIN KHÁCH HÀNG & LIÊN HỆ (CẬP NHẬT) ---
		worksheet.getCell('A6').value = '1.';
		worksheet.getCell('B6').value = 'Thông tin:';
		worksheet.mergeCells('B6:C6');
		worksheet.getCell('A6').font = { bold: true };
		worksheet.getCell('B6').font = { bold: true };
		worksheet.getCell('A7').value = '  1.1 Thông tin khách hàng:';
		worksheet.mergeCells('A7:C7');
		worksheet.getCell('A7').font = { italic: true };
		worksheet.getCell('B8').value = 'Tên khách hàng: ' + (dataRequest?.client?.client_name || '');
		worksheet.mergeCells('B8:G8');
		worksheet.getCell('B9').value = 'Địa chỉ: ' + (dataRequest?.client?.client_address || '');
		worksheet.mergeCells('B9:G9');
		worksheet.getRow(9).height = 40;

		worksheet.getCell('B10').value = 'MST/CCCD: ' + (dataRequest?.client?.legal_id || '');
		worksheet.mergeCells('B10:G10');
		worksheet.getCell('B11').value =
			'Thông tin xuất hóa đơn (nếu khác thông tin trên): ' + (dataRequest?.client?.invoice_info || '');
		worksheet.mergeCells('B11:G11');
		worksheet.getCell('B12').value = 'Số điện thoại (KH): ' + (dataRequest?.client?.client_phone || '');
		worksheet.mergeCells('B12:D12');
		worksheet.getCell('E12').value = 'Email HĐ: ' + (dataRequest?.client?.invoice_email || '');
		worksheet.mergeCells('E12:G12');

		// ---- CẬP NHẬT MỤC 1.2 ----
		worksheet.getCell('A14').value = '  1.2 Thông tin người đến (nếu khác thông tin trên):';
		worksheet.mergeCells('A14:G14');
		worksheet.getCell('A14').font = { italic: true };

		// Tên người liên hệ
		worksheet.getCell('B15').value = 'Tên người liên hệ:';
		worksheet.getCell('C15').value = dataRequest?.contact?.name || '';
		worksheet.mergeCells('C15:D15');

		// CCCD
		worksheet.getCell('E15').value = 'CCCD:';
		worksheet.getCell('F15').value = dataRequest?.contact?.id || '';
		worksheet.mergeCells('F15:G15');

		// Điện thoại
		worksheet.getCell('B16').value = 'Điện thoại:';
		worksheet.getCell('C16').value = dataRequest?.contact?.phone || '';
		worksheet.mergeCells('C16:D16');

		// Email
		worksheet.getCell('E16').value = 'Email:';
		worksheet.getCell('F16').value = dataRequest?.contact?.email || '';
		worksheet.mergeCells('F16:G16');

		// --- SECTION 2: THÔNG TIN TRẢ KẾT QUẢ (CẬP NHẬT) ---
		worksheet.getCell('A18').value = '2.';
		worksheet.getCell('B18').value = 'Nơi nhận kết quả:';
		worksheet.mergeCells('B18:G18');
		worksheet.getCell('A18').font = { bold: true };
		worksheet.getCell('B18').font = { bold: true };

		// Bản cứng
		worksheet.getCell('B19').value = 'Bản cứng:';
		worksheet.getCell('C19').value = 'Địa chỉ:';
		worksheet.getCell('D19').value = dataRequest?.receiver?.address || '';
		worksheet.mergeCells('D19:G19');

		// Điện thoại và Email
		worksheet.getCell('C20').value = 'Điện thoại:';
		worksheet.getCell('D20').value = dataRequest?.receiver?.phone || '';
		worksheet.mergeCells('D20:E20');
		worksheet.getCell('F20').value = 'Email:';
		worksheet.getCell('G20').value = dataRequest?.receiver?.email || '';

		// Bản mềm
		worksheet.getCell('B21').value = 'Bản mềm (Email):';
		worksheet.getCell('C21').value = dataRequest?.receiver?.email || '';
		worksheet.mergeCells('C21:G21');

		// --- SECTION 3: THÔNG TIN MẪU (CẬP NHẬT CỘT MÔ TẢ) ---
		worksheet.getCell('A23').value = '3.';
		worksheet.getCell('B23').value = 'Thông tin đăng ký thử nghiệm (mẫu):';
		worksheet.mergeCells('B23:G23');
		worksheet.getCell('A23').font = { bold: true };
		worksheet.getCell('B23').font = { bold: true };

		// Tiêu đề bảng - điều chỉnh theo hình
		worksheet.getCell('A25').value = 'TT';
		worksheet.getCell('B25').value = 'Thông tin mẫu(*)\n(Tên mẫu, số lô, nơi sx...)';
		worksheet.mergeCells('B25:C25');
		worksheet.getCell('D25').value = 'Mô tả mẫu(*)';
		worksheet.getCell('E25').value = 'Chỉ tiêu yêu cầu kiểm nghiệm';
		worksheet.getCell('F25').value = 'Phương pháp thử';
		worksheet.getCell('G25').value = 'Ghi chú';

		worksheet.getRow(25).height = 40;
		const headerCells = ['A25', 'B25', 'D25', 'E25', 'F25', 'G25'];
		headerCells.forEach((cell) => {
			worksheet.getCell(cell).font = { italic: true, bold: true };
			worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
			worksheet.getCell(cell).border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' },
			};
		});

		// Vòng lặp xử lý dữ liệu mẫu
		let currentRow = 26;
		if (samples.length > 0) {
			samples.forEach((sample, index) => {
				const sampleInfoText = `Tên mẫu: ${sample?.sample_name || ''}\nSố lô: ${findInfoValue(
					sample.sample_information,
					'Số lô / LOT no.',
				)}\nNgày SX: ${findInfoValue(sample.sample_information, 'Ngày sản xuất / mfg.')}\nHạn SD: ${findInfoValue(
					sample.sample_information,
					'Hạn sử dụng / exp.',
				)}\nNơi SX: ${findInfoValue(sample.sample_information, 'Nơi sản xuất / mfr.')}`;
				const otherInfo = sample.sample_information
					.filter(
						(info) =>
							![
								'Tên mẫu thử / name.',
								'Số lô / LOT no.',
								'Ngày sản xuất / mfg.',
								'Hạn sử dụng / exp.',
								'Nơi sản xuất / mfr.',
								'Ngày tiếp nhận / receipt date.',
								'Ngày thử nghiệm / test date.',
								'Mô tả / desc.',
							].includes(info.fname),
					)
					.map((info) => `${info.fname}: ${info.fvalue}`)
					.join('\n');

				worksheet.getCell(`A${currentRow}`).value = index + 1;
				worksheet.getCell(`B${currentRow}`).value = sampleInfoText + (otherInfo ? '\n' + otherInfo : '');

				// ---- CẬP NHẬT CỘT MÔ TẢ ----
				worksheet.getCell(`D${currentRow}`).value = `Nền mẫu: ${sample?.matrix || ''}\nMô tả: ${
					sample?.sample_description || ''
				}`;

				const testOrders = sample.analysis ?? [];
				if (testOrders.length > 0) {
					testOrders.forEach((test_order, testIndex) => {
						worksheet.getCell(`E${currentRow + testIndex}`).value = test_order?.parameter_name || '';
						worksheet.getCell(`F${currentRow + testIndex}`).value = test_order?.protocol_code || '';
						const dataCell = [`E${currentRow + testIndex}`, `F${currentRow + testIndex}`, `G${currentRow + testIndex}`];
						dataCell.forEach((cell) => {
							worksheet.getCell(cell).border = {
								top: { style: 'thin' },
								left: { style: 'thin' },
								bottom: { style: 'thin' },
								right: { style: 'thin' },
							};
						});
					});
					worksheet.mergeCells(`A${currentRow}:A${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`B${currentRow}:C${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`D${currentRow}:D${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`G${currentRow}:G${currentRow + testOrders.length - 1}`);
				} else {
					['E', 'F', 'G'].forEach((col) => {
						worksheet.getCell(`${col}${currentRow}`).border = {
							top: { style: 'thin' },
							left: { style: 'thin' },
							bottom: { style: 'thin' },
							right: { style: 'thin' },
						};
					});
				}

				const cells = [`A${currentRow}`, `B${currentRow}`, `D${currentRow}`, `G${currentRow}`];
				cells.forEach((cell) => {
					worksheet.getCell(cell).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
					worksheet.getCell(cell).border = {
						top: { style: 'thin' },
						left: { style: 'thin' },
						bottom: { style: 'thin' },
						right: { style: 'thin' },
					};
				});

				const numLinesInInfo = (worksheet.getCell(`B${currentRow}`).value.toString().match(/\n/g) || []).length + 1;
				const numLinesInDesc = (worksheet.getCell(`D${currentRow}`).value.toString().match(/\n/g) || []).length + 1;
				const numLines = Math.max(numLinesInInfo, numLinesInDesc, testOrders.length || 1);
				worksheet.getRow(currentRow).height = numLines * 15;

				currentRow += testOrders.length || 1;
			});
		}

		// --- FOOTER VÀ CÁC THÔNG TIN CỐ ĐỊNH (GIỮ NGUYÊN) ---
		worksheet.getCell(`B${currentRow + 1}`).value = `Ghi chú:
            Mẫu gửi bắt buộc phải có tên mẫu, mô tả mẫu.
            Thông tin mẫu trên phiếu gửi mẫu phải khớp với thông tin thực tế trên mẫu
            Khách hàng đồng ý với phương pháp thử do IRDOP tự lựa chọn nếu không có yêu cầu cụ thể.`;
		worksheet.mergeCells(`B${currentRow + 1}:G${currentRow + 1}`);
		worksheet.getCell(`B${currentRow + 1}`).font = { italic: true };
		worksheet.getRow(currentRow + 1).height = 80;
		worksheet.getCell(`B${currentRow + 1}`).alignment = { wrapText: true, vertical: 'top' };

		currentRow += 2;
		worksheet.mergeCells(`B${currentRow + 1}:G${currentRow + 1}`);
		worksheet.getCell(`B${currentRow + 1}`).value =
			'Khách hàng hiểu rằng các kết quả thử nghiệm và phiếu kết quả do phòng thử nghiệm cung cấp dựa trên mẫu gửi chỉ được sử dụng cho các mục đích hợp pháp, phù hợp với quy định pháp luật hiện hành, và phòng thử nghiệm không chịu trách nhiệm đối với bất kỳ việc sử dụng kết quả thử nghiệm ngoài mục đích đã thỏa thuận hoặc các chỉ tiêu không thuộc phạm vi công nhận (trừ trường hợp do lỗi của phòng thử nghiệm) và sẽ không có khiếu nại.';
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
				cell.alignment = { wrapText: true, vertical: 'middle', ...currentAlignment };
			});
		});

		// --- GỬI FILE EXCEL ---
		const excelBuffer = await workbook.xlsx.writeBuffer();
		msg.headers = {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${dataRequest?.order_code || 'Phieu_gui_mau'}.xlsx"`,
		};
		msg.payload = excelBuffer;
		node.warn(`Export excel: ${dataRequest?.order_code}.xlsx`);
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
