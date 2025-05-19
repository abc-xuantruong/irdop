const table = global.get('table');
const axios = global.get('axios');

function getDateFormatted(timestamp) {
	const today = timestamp ? new Date(timestamp) : new Date();
	const day = String(today.getDate()).padStart(2, '0');
	const month = String(today.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
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

// New function to fetch technician data
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

// New function to get technician name by identity_uid
function getTechnicianName(technicians, identity_uid) {
	if (!identity_uid) return '';

	const technician = technicians.find((tech) => tech.identity_uid === identity_uid);
	return technician ? technician.identity_name : '';
}

// Function to parse HTML content and extract text with specific formatting
function parseHtmlUnit(htmlContent) {
	if (!htmlContent) return '';

	try {
		// Load HTML content with cheerio
		const $ = cheerio.load(htmlContent);

		// First decode all HTML entities by getting the text
		let text = $('body').text();

		// Replace paragraph tags (remove them)
		let result = htmlContent.replace(/<\/?p>/g, '');

		// Replace subscript tags with underscore
		result = result.replace(/<sub>/g, '_');
		result = result.replace(/<\/sub>/g, ' ');

		// Replace superscript tags with caret
		result = result.replace(/<sup>/g, '^');
		result = result.replace(/<\/sup>/g, ' ');

		// Remove any other HTML tags that might be present
		result = result.replace(/<[^>]*>/g, '');

		// Decode any remaining HTML entities
		const decodedResult = $('<div>').html(result).text();

		return decodedResult.trim();
	} catch (error) {
		console.error('Error parsing HTML:', error);
		return htmlContent; // Return original content if parsing fails
	}
}

// Helper function to extract text content from parameter object if needed
function extractParameterText(parameterData) {
	if (!parameterData) return '';

	// Check if parameter is an object with text property
	if (typeof parameterData === 'object' && parameterData.text !== undefined) {
		return parameterData.text || '';
	}

	// Otherwise return the parameter as is
	return parameterData;
}

async function createAndWriteExcel() {
	/**
	 * Tạo file Excel, ghi dữ liệu và chèn hình ảnh vào một ô.
	 *
	 * @param {string} fileName - Tên file Excel sẽ được tạo (bao gồm đuôi .xlsx).
	 * @param {Array<Array>} data - Dữ liệu cần ghi vào file Excel, mỗi phần tử là một hàng.
	 * @param {string} imagePath - Đường dẫn đến hình ảnh cần chèn.
	 */
	try {
		// Fetch technician data first
		const technicians = await fetchTechnicians();

		// Tạo một workbook mới
		const workbook = new ExcelJS.Workbook();
		// Sheet 1: Tiếp nhận mẫu
		const worksheet = workbook.addWorksheet('Tiếp nhận mẫu');

		// Set page setup for worksheet (portrait mode)
		worksheet.pageSetup = {
			paperSize: 9, // 9 is the code for A4 paper
			orientation: 'portrait',
			fitToPage: true,
			fitToWidth: 1, // Fit to 1 page wide
			fitToHeight: 0, // Auto height
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

		// Điều chỉnh kích thước cột
		worksheet.columns = [
			{ width: 40 / 7.776 }, // Cột A
			{ width: 160 / 7.776 }, // Cột B
			{ width: 90 / 7.776 }, // Cột C
			{ width: 150 / 7.776 }, // Cột D
			{ width: 240 / 7.776 }, // Cột E
			{ width: 220 / 7.776 }, // Cột F
			{ width: 105 / 7.776 }, // Cột G
		];

		// // Dữ liệu ghi vào sheet
		const uid = msg.req.params.receipt_uid;
		const dataReceipt = await table.Receipt.getReceiptFull({ receipt_uid: uid });
		dataReceipt.created_by_uid = await getIdentityName(dataReceipt.created_by_uid);
		const data = dataReceipt?.samples;

		// Hàng 1 : HEADER
		worksheet.mergeCells('B1:C1');
		worksheet.mergeCells('E1:G1');

		worksheet.getCell('E1').alignment = {
			horizontal: 'center',
			vertical: 'middle',
		};
		worksheet.getCell('E1').value = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc`;

		// Tải hình ảnh từ URL dưới dạng buffer
		const imageUrl = 'https://irdop.org/wp-content/uploads/2024/07/IRDOP-LOGO-2710-02-2.png';
		const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
		const imageBuffer = Buffer.from(response.data, 'binary');

		// Chèn hình ảnh vào ô C1
		const imageId = workbook.addImage({
			buffer: imageBuffer,
			extension: 'png',
		});

		worksheet.addImage(imageId, {
			tl: { col: 1, row: 0 }, // Vị trí góc trên bên trái (ô B1)
			ext: { width: 196, height: 60 }, // Kích thước hình ảnh
		});

		worksheet.getRow(1).height = 45; // Chiều cao hàng 1

		worksheet.getCell('A2').value = 'PHIẾU GỬI MẪU THỬ NGHIỆM';
		worksheet.mergeCells('A2:G2'); // Merge cell
		worksheet.getCell('A2').alignment = {
			horizontal: 'center',
			vertical: 'middle',
		}; // Alignment

		worksheet.getRow(2).height = 60; // Chiều cao hàng 2 : Title

		// Hàng 3 >>
		worksheet.getCell('A3').value = '1.';
		worksheet.getCell('B3').value = 'Căn cứ đơn hàng số:';
		worksheet.mergeCells('B3:C3');
		worksheet.getCell('D3').font = { bold: true };
		worksheet.getCell('D3').value = dataReceipt?.order_code || '';
		worksheet.getCell('D3').alignment = {
			horizontal: 'right',
		};
		worksheet.getCell('A3').font = { bold: true };
		worksheet.getCell('B3').font = { bold: true };
		const receipt_date = getDateFormatted(dataReceipt?.created_at).split('-'); // DD,MM,YY
		worksheet.getCell('E3').value =
			'    Ngày ' + receipt_date[0] + ' tháng ' + receipt_date[1] + ' năm ' + receipt_date[2];
		worksheet.mergeCells('E3:G3');

		worksheet.getCell('B4').value = 'Mã tiếp nhận: ';
		worksheet.mergeCells('C4:D4');
		worksheet.getCell('C4').value = dataReceipt?.receipt_uid || '';
		worksheet.getCell('C4').font = { bold: true };
		worksheet.getCell('C4').alignment = {
			horizontal: 'right',
		};

		// worksheet.getCell('E4').value =
		// 	'    Ngày tiếp nhận mẫu: ' + `${receipt_date[0]}/${receipt_date[1]}/${receipt_date[2]}`;
		// worksheet.mergeCells('E4:G4');
		worksheet.getRow(4).height = 18.75;

		worksheet.getCell('A6').value = '  1.1 Thông tin khách hàng:';
		worksheet.mergeCells('A6:C6');
		worksheet.getCell('A6').font = { italic: true };

		worksheet.getCell('B7').value = 'Tên khách hàng: ' + (dataReceipt?.client.client_name || '');
		worksheet.mergeCells('B7:G7');

		worksheet.getCell('B8').value = 'Địa chỉ: ' + (dataReceipt?.client.client_address || '');
		worksheet.mergeCells('B8:G8');

		worksheet.getCell('B9').value = 'MST/CCCD: ' + (dataReceipt?.client.legal_id || '');
		worksheet.mergeCells('B9:G9');

		worksheet.getCell('B10').value = 'Thông tin xuất hóa đơn (nếu khác thông tin trên): ';
		worksheet.mergeCells('B10:D10');

		worksheet.getCell('B11').value = 'SDT: ' + (dataReceipt?.contact?.phone || '');
		worksheet.mergeCells('B11:D11');
		worksheet.getCell('F11').value = 'Email*: ' + (dataReceipt?.contact?.email || '');
		worksheet.mergeCells('E11:G11');

		worksheet.getCell('A13').value = '  1.2 Người gửi mẫu: ';
		worksheet.mergeCells('A13:B13');
		worksheet.getCell('C13').value = dataReceipt?.contact?.name || '';
		worksheet.mergeCells('C13:G13');
		worksheet.getCell('A13').font = { italic: true };
		worksheet.getCell('C13').font = { italic: true };

		worksheet.getCell('B14').value = 'CCCD: ';
		worksheet.mergeCells('B14:E14');
		worksheet.getCell('F14').value = 'Ngày gửi mẫu: ';
		worksheet.mergeCells('F14:G14');

		worksheet.getCell('A16').value = '  1.3 Người nhận mẫu: ' + (dataReceipt?.created_by_uid || '');
		worksheet.mergeCells('A16:G16');
		worksheet.getCell('A16').font = { italic: true };

		worksheet.getCell('B17').value = 'Tài liệu kèm theo: ';
		worksheet.mergeCells('B17:G17');

		worksheet.getCell('A20').value = '2.';
		worksheet.getCell('B20').value = 'Ngày trả kết quả (dự kiến):';
		worksheet.mergeCells('B20:D20');

		worksheet.getCell('A20').font = { bold: true };
		worksheet.getCell('B20').font = { bold: true };
		worksheet.mergeCells('E20:G20');

		worksheet.getCell('B21').value = 'Nơi nhân kết quả (Địa chỉ/ Email):';
		worksheet.mergeCells('B21:G21');

		worksheet.getCell('B22').value = 'Số bản kết quả:';
		worksheet.mergeCells('B22:C22');
		worksheet.getCell('D22').value = '1';
		worksheet.getCell('E22').value = 'Mục đích (nếu nhiều hơn 1 bản):';
		worksheet.mergeCells('E22:G22');

		worksheet.getCell('B24').value = 'Thông tin đăng ký thử nghiệm (mẫu):';
		worksheet.getCell('A24').value = '3.';
		worksheet.mergeCells('B24:G24');
		worksheet.getCell('A24').font = { bold: true };
		worksheet.getCell('B24').font = { bold: true };
		// A7:H7 Title
		const titleCell = ['A26', 'B26', 'D26', 'E26', 'F26', 'G26'];
		worksheet.mergeCells('B26:C26');
		const titleValue = [
			'TT',
			'Thông tin mẫu(*) \n(Tên mẫu, số lô, nơi sx...)',
			'Mô tả mẫu(*)',
			'Chỉ tiêu yêu cầu kiểm nghiệm',
			'Phương pháp thử',
			'Ghi chú',
		];
		worksheet.getRow(26).height = 40;
		titleCell.forEach((cell, index) => {
			worksheet.getCell(cell).value = titleValue[index];
			worksheet.getCell(cell).font = { italic: true };
			worksheet.getCell(cell).alignment = {
				horizontal: 'center',
				vertical: 'middle',
			};
			worksheet.getCell(cell).border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' },
			};
		});

		// Ghi dữ liệu vào sheet
		let currentRow = 27;
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

				// Kiểm tra nếu test_orders tồn tại và là một mảng
				const testOrders = sample.analysis ?? [];
				testOrders.forEach((test_order, testIndex) => {
					// Extract parameter name correctly
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

				// Gộp các ô nếu có test_orders
				if (testOrders.length > 0) {
					worksheet.mergeCells(`A${currentRow}:A${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`B${currentRow}:C${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`D${currentRow}:D${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`G${currentRow}:G${currentRow + testOrders.length - 1}`);
				}

				// Lấy các ô merge để căn lề
				const cells = [`A${currentRow}`, `B${currentRow}`, `D${currentRow}`, `G${currentRow}`];
				cells.forEach((cell) => {
					worksheet.getCell(cell).alignment = {
						horizontal: 'left',
						vertical: 'middle',
					};
					worksheet.getCell(cell).border = {
						top: { style: 'thin' },
						left: { style: 'thin' },
						bottom: { style: 'thin' },
						right: { style: 'thin' },
					};
				});

				// Tăng currentRow lên số lượng test_orders hoặc ít nhất là 1
				currentRow += testOrders.length || 1;
			});
		}
		worksheet.getCell(`B${currentRow + 1}`).value =
			'Ghi chú:\n\t(*)	: Mẫu gửi bắt buộc phải có tên mẫu, mô tả mẫu. Thông tin tên mẫu, Ngày sản xuất, Hạn sử dụng, Số lô phải khớp giữa phiếu yêu cầu kiểm nghiệm và mẫu thực tế.\n\t(**)	: Phương pháp thử sẽ do IRDOP lựa chọn khi không cung cấp';
		worksheet.mergeCells(`B${currentRow + 1}:G${currentRow + 1}`);
		worksheet.getCell(`B${currentRow + 1}`).font = { italic: true };
		worksheet.getRow(currentRow + 1).height = 77;

		currentRow += 2;
		worksheet.mergeCells(`B${currentRow + 1}:G${currentRow + 1}`);
		worksheet.getCell(`B${currentRow + 1}`).value =
			'Chúng tôi yêu cầu thử nghiệm với hiện trạng mẫu do chúng tôi mang đến và sẽ thanh toán đầy đủ chi phí thử nghiệm cho bên Viện nghiên cứu và phát triển sản phẩm thiên nhiên (IRDOP) trước khi thử nghiệm bắt đầu. Nếu không có yêu cầu cụ thể, chúng tôi đồng ý với phương pháp tiến hành thử nghiệm của viện IRDOP.';
		worksheet.getCell(`B${currentRow + 1}`).alignment = { wrapText: true, vertical: 'top' }; // Wrap text và căn trên
		worksheet.getRow(currentRow + 1).height = 60;
		currentRow += 1;

		// Ghi giá trị 5.
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
		worksheet.getCell(`B${currentRow + 7}`).alignment = {
			horizontal: 'center',
		};

		worksheet.getCell(`B${currentRow + 8}`).value = 'Ký, ghi rõ họ tên';
		worksheet.mergeCells(`B${currentRow + 8}:C${currentRow + 8}`);
		worksheet.getCell(`B${currentRow + 8}`).alignment = {
			horizontal: 'center',
		};

		worksheet.getCell(`F${currentRow + 7}`).value = 'Khách hàng';
		worksheet.mergeCells(`F${currentRow + 7}:G${currentRow + 7}`);
		worksheet.getCell(`F${currentRow + 7}`).font = { bold: true };
		worksheet.getCell(`F${currentRow + 7}`).alignment = {
			horizontal: 'center',
		};

		worksheet.getCell(`F${currentRow + 8}`).value = 'Ký, đóng dấu, ghi rõ họ tên';
		worksheet.mergeCells(`F${currentRow + 8}:G${currentRow + 8}`);
		worksheet.getCell(`F${currentRow + 8}`).alignment = {
			horizontal: 'center',
		};

		// Áp dụng font Times New Roman và cỡ chữ 14 cho toàn bộ sheet
		worksheet.eachRow({ includeEmpty: true }, (row) => {
			row.eachCell({ includeEmpty: true }, (cell) => {
				const currentFont = cell.font || {};
				cell.font = {
					...currentFont,
					name: 'Times New Roman',
					size: 14,
				};
				const currentAlignment = cell.alignment || {};
				cell.alignment = {
					...currentAlignment,
					wrapText: true,
					vertical: 'middle',
				};
			});
		});
		worksheet.getCell('E1').font = { bold: true, name: 'Times New Roman', size: 16 }; // Font chữ
		worksheet.getCell('A2').font = { bold: true, name: 'Times New Roman', size: 20 }; // Font chữ

		// Biên bản bàn giao
		const sheet2 = workbook.addWorksheet('Biên bản bàn giao mẫu');

		// Set page setup for sheet2 (landscape mode)
		sheet2.pageSetup = {
			paperSize: 9, // 9 is the code for A4 paper
			orientation: 'landscape',
			fitToPage: true,
			fitToWidth: 1, // Fit to 1 page wide
			fitToHeight: 0, // Auto height
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

		// Hàng 1 title
		sheet2.getCell('E1').value = `VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN
	176 Phùng Khoang, Trung Văn, Nam Từ Liêm, Hà Nội
	Phòng phân tích - Kiểm nghiệm`;

		// Merge cells C1:D1 and E1:H1 instead of D1:G1
		sheet2.mergeCells('C1:D1');
		sheet2.mergeCells('E1:L1');

		sheet2.getCell('E1').alignment = {
			wrapText: true,
			horizontal: 'center',
			vertical: 'middle',
		};
		sheet2.getCell('E1').font = { bold: true };

		// Apply black borders to both merged cell ranges
		['C1', 'E1'].forEach((cell) => {
			sheet2.getCell(cell).border = {
				top: { style: 'thick', color: { argb: '000000' } },
				left: { style: 'thick', color: { argb: '000000' } },
				bottom: { style: 'thick', color: { argb: '000000' } },
				right: { style: 'thick', color: { argb: '000000' } },
			};
		});

		// Tải hình ảnh từ URL dưới dạng buffer
		const imageUrl2 = 'https://irdop.org/wp-content/uploads/2024/07/IRDOP-LOGO-2710-02-2.png';
		const response2 = await axios.get(imageUrl2, { responseType: 'arraybuffer' });
		const imageBuffer2 = Buffer.from(response2.data, 'binary');

		// Chèn hình ảnh vào ô C1
		const imageId2 = workbook.addImage({
			buffer: imageBuffer2,
			extension: 'png',
		});

		sheet2.addImage(imageId2, {
			tl: { col: 2.18, row: 0.2 }, // Vị trí góc trên bên trái (ô C1)
			ext: { width: 200, height: 60 }, // Kích thước hình ảnh
		});

		sheet2.getRow(1).height = 52; // Chiều cao hàng 1

		sheet2.getCell('A2').value = 'BIÊN BẢN BÀN GIAO MẪU THỬ NỘI BỘ';
		sheet2.mergeCells('A2:L2'); // Merge cell
		sheet2.getCell('A2').alignment = {
			wrapText: true,
			horizontal: 'center',
			vertical: 'middle',
		}; // Alignment

		sheet2.getRow(2).height = 60; // Chiều cao hàng 2

		sheet2.getCell('B3').value = 'Thông tin mẫu đến';
		sheet2.getCell('D3').value = dataReceipt?.request_number || '';
		sheet2.mergeCells('D3:F3');
		sheet2.getCell('K3').value = 'Ngày bàn hành BM:';
		sheet2.getCell('N3').value = getDateFormatted() || '';
		sheet2.mergeCells('K3:M3');
		sheet2.getCell('B4').value = 'Nhân viên kinh doanh:';
		sheet2.mergeCells('B4:C4');
		sheet2.getCell('D4').value = dataReceipt?.sale_recorder || '';
		sheet2.mergeCells('D4:F4');
		sheet2.getCell('K4').value = 'Người bàn giao:';
		sheet2.mergeCells('K4:N4');

		sheet2.getCell('A6').value = 'Danh mục bàn giao các mẫu giao: trong bảng sau';
		sheet2.getCell('A6').font = { bold: true };

		// Điều chỉnh kích thước cột
		sheet2.columns = [
			{ width: 40 / 7.776 }, // Cột A - TT
			{ width: 110 / 7.776 }, // Cột B - Mã mẫu
			{ width: 130 / 7.776 }, // Cột C - Tên mẫu
			{ width: 120 / 7.776 }, // Cột D - Số lượng mẫu ban đầu
			{ width: 200 / 7.776 }, // Cột E - Chỉ tiêu
			{ width: 165 / 7.776 }, // Cột F - Phương pháp thử
			{ width: 90 / 7.776 }, // Cột G - Hạn trả
			{ width: 80 / 7.776 }, // Cột H - Đơn vị
			{ width: 130 / 7.776 }, // Cột I - Người thử nghiệm
			{ width: 90 / 7.776 }, // Cột J - Ngày bàn giao
			{ width: 155 / 7.776 }, // Cột K - Phòng - Người nhận mẫu
			{ width: 110 / 7.776 }, // Cột L - Số Lượng
			{ width: 110 / 7.776 }, // Cột M - Ghi chú
			{ width: 130 / 7.776 }, // Cột N - Người KIỂM TRA
		];

		// A7:M7 Title
		const titleCell2 = ['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7', 'I7', 'J7', 'K7', 'L7','M7','N7'];
		const titleValue2 = [
			'TT',
			'Mã mẫu',
			'Tên mẫu',
			'Số lượng mẫu ban đầu',
			'Chỉ tiêu',
			'Phương pháp thử',
			'Hạn trả',
			'Đơn vị',
			'Người thử nghiệm',
			'Ngày bàn giao',
			'Phòng - Người nhận mẫu',
			'Số Lượng',
			'Ghi chú',
			'Người kiểm tra',
		];
		titleCell2.forEach((cell, index) => {
			sheet2.getCell(cell).value = titleValue2[index];
			sheet2.getCell(cell).font = { bold: true };
			sheet2.getCell(cell).alignment = {
				wrapText: true,
				horizontal: 'center',
				vertical: 'middle',
			};
			sheet2.getCell(cell).border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' },
			};
		});

		// Ghi dữ liệu vào sheet
		let sheer2CurrentRow = 8;
		if (data.length > 0) {
			data.forEach((sample, index) => {
				sheet2.getCell(`A${sheer2CurrentRow}`).value = index + 1;
				sheet2.getCell(`B${sheer2CurrentRow}`).value = sample?.sample_uid || '';
				sheet2.getCell(`C${sheer2CurrentRow}`).value = sample?.sample_name || '';
				sheet2.getCell(`D${sheer2CurrentRow}`).value = sample?.sample_volume || '';

				// Kiểm tra nếu test_orders tồn tại và là một mảng
				const testOrders = sample.analysis ?? [];
				if (testOrders.length > 0) {
					sheet2.getCell(`M${sheer2CurrentRow}`).value = sample?.additional_request || '';
				} else {
					sheet2.getCell(`M${sheer2CurrentRow}`).value = sample?.additional_request || '';
				}

				testOrders.forEach((test_order, testIndex) => {
					// Extract parameter name correctly
					const parameterName = extractParameterText(test_order?.parameter_name);
					sheet2.getCell(`E${sheer2CurrentRow + testIndex}`).value = parameterName || '';
					sheet2.getCell(`F${sheer2CurrentRow + testIndex}`).value = test_order?.protocol_code || '';
					sheet2.getCell(`G${sheer2CurrentRow + testIndex}`).value = getDateFormatted(test_order?.deadline);

					// Parse and format HTML unit content
					const unitHtmlContent = test_order?.result_unit || '';
					const parsedUnitText = parseHtmlUnit(unitHtmlContent);
					sheet2.getCell(`H${sheer2CurrentRow + testIndex}`).value = parsedUnitText;

					// Use the technician name instead of just the ID
					const technicianName = getTechnicianName(technicians, test_order?.technician_uid);
					sheet2.getCell(`I${sheer2CurrentRow + testIndex}`).value = technicianName || test_order?.technician_uid || '';
					
					sheet2.getCell(`N${sheer2CurrentRow + testIndex}`).value =  '';

					const dataCell = [
						`E${sheer2CurrentRow + testIndex}`,
						`F${sheer2CurrentRow + testIndex}`,
						`G${sheer2CurrentRow + testIndex}`,
						`H${sheer2CurrentRow + testIndex}`,
						`I${sheer2CurrentRow + testIndex}`,
						`N${sheer2CurrentRow + testIndex}`,
					];
					dataCell.forEach((cell) => {
						sheet2.getCell(cell).alignment = {
							wrapText: true,
							vertical: 'middle',
						};
						sheet2.getCell(cell).border = {
							top: { style: 'thin' },
							left: { style: 'thin' },
							bottom: { style: 'thin' },
							right: { style: 'thin' },
						};
					});
				});

				// Gộp các ô cho các cột TT, Mã mẫu, Tên mẫu, Số lượng mẫu ban đầu nếu có test_orders
					sheet2.mergeCells(`A${sheer2CurrentRow}:A${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`B${sheer2CurrentRow}:B${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`C${sheer2CurrentRow}:C${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`D${sheer2CurrentRow}:D${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`J${sheer2CurrentRow}:J${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`K${sheer2CurrentRow}:K${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`L${sheer2CurrentRow}:L${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`M${sheer2CurrentRow}:M${sheer2CurrentRow + testOrders.length - 1}`);

				const cells = [
					`A${sheer2CurrentRow}`,
					`B${sheer2CurrentRow}`,
					`C${sheer2CurrentRow}`,
					`D${sheer2CurrentRow}`,
					`J${sheer2CurrentRow}`,
					`K${sheer2CurrentRow}`,
					`L${sheer2CurrentRow}`,
					`M${sheer2CurrentRow}`,
				];
				cells.forEach((cell) => {
					sheet2.getCell(cell).alignment = {
						wrapText: true,
						horizontal: 'center',
						vertical: 'middle',
					};
					sheet2.getCell(cell).border = {
						top: { style: 'thin' },
						left: { style: 'thin' },
						bottom: { style: 'thin' },
						right: { style: 'thin' },
					};
				});

				// Tăng sheer2CurrentRow dựa trên số lượng test_orders, tối thiểu là 1
				sheer2CurrentRow += testOrders.length > 0 ? testOrders.length : 1;
			});
		}

				
		sheet2.getCell(`B${sheer2CurrentRow + 3}`).value = 'Nguời nhận biên bản';
		sheet2.mergeCells(`B${sheer2CurrentRow + 3}:D${sheer2CurrentRow + 3}`);
		sheet2.getCell(`B${sheer2CurrentRow + 3}`).alignment = {
			horizontal: 'center',
		};

		// Áp dụng font Times New Roman và cỡ chữ 14 cho toàn bộ sheet
		sheet2.eachRow({ includeEmpty: true }, (row) => {
			row.eachCell({ includeEmpty: true }, (cell) => {
				const currentFont = cell.font || {};
				cell.font = {
					...currentFont,
					name: 'Times New Roman',
					size: 12,
				};
			});
		});
		sheet2.getCell('A2').font = { bold: true, name: 'Times New Roman', size: 20 }; // Font chữ

		// Tạo buffer chứa tệp Excel
		const excelBuffer = await workbook.xlsx.writeBuffer();

		// Đặt header và payload
		msg.headers = {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${dataReceipt?.receipt_uid}.xlsx"`,
		};

		msg.payload = excelBuffer; // Gửi buffer thay vì stream

		node.warn(`Export excel: ${dataReceipt?.receipt_uid}.xlsx`);

		return msg;
	} catch (error) {
		console.error('Error generating Excel file:', error);
	}
}

try {
	msg = await createAndWriteExcel();
	return msg;
} catch (error) {
	node.warn(error);
}
