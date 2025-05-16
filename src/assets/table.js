const axios = global.get('axios');
const table = global.get('table');

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

// Function to parse HTML content and extract text with formatting info
function parseHtmlUnit(htmlContent) {
	if (!htmlContent) return { text: '', formatting: [] };

	try {
		const $ = cheerio.load(htmlContent);
		let result = { text: '', formatting: [] };

		// Process paragraph content
		$('p').each(function (i, elem) {
			// Clone the element to work with
			const $elem = $(elem).clone();

			// Find and mark subscripts
			$elem.find('sub').each(function (j, sub) {
				const subText = $(sub).text();
				const startPos = result.text.length + $elem.text().indexOf(subText);
				result.formatting.push({
					type: 'sub',
					start: startPos,
					end: startPos + subText.length,
					text: subText,
				});
			});

			// Find and mark superscripts
			$elem.find('sup').each(function (j, sup) {
				const supText = $(sup).text();
				const startPos = result.text.length + $elem.text().indexOf(supText);
				result.formatting.push({
					type: 'sup',
					start: startPos,
					end: startPos + supText.length,
					text: supText,
				});
			});

			// Add the full text
			result.text += $(elem).text() + ' ';
		});

		// If no paragraphs, process the entire content
		if (result.text === '') {
			result.text = $('body').text();

			// Handle direct subscripts and superscripts
			$('sub').each(function (j, sub) {
				const subText = $(sub).text();
				const startPos = result.text.indexOf(subText);
				result.formatting.push({
					type: 'sub',
					start: startPos,
					end: startPos + subText.length,
					text: subText,
				});
			});

			$('sup').each(function (j, sup) {
				const supText = $(sup).text();
				const startPos = result.text.indexOf(supText);
				result.formatting.push({
					type: 'sup',
					start: startPos,
					end: startPos + supText.length,
					text: supText,
				});
			});
		}

		return result.text.trim();
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
			{ width: 260 / 7.776 }, // Cột F
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

		worksheet.getCell('A2').value = 'PHIẾU TIẾP NHẬN MẪU';
		worksheet.mergeCells('A2:G2'); // Merge cell
		worksheet.getCell('A2').alignment = {
			horizontal: 'center',
			vertical: 'middle',
		}; // Alignment

		worksheet.getRow(2).height = 60; // Chiều cao hàng 2 : Title

		// Hàng 3 >>
		worksheet.getCell('A3').value = '1.';
		worksheet.getCell('B3').value = 'Số phiếu yêu cầu đến:';
		worksheet.mergeCells('B3:C3');
		worksheet.getCell('D3').font = { bold: true };
		worksheet.getCell('D3').value = dataReceipt?.request_number || '';
		worksheet.getCell('D3').alignment = {
			horizontal: 'right',
		};
		worksheet.getCell('A3').font = { bold: true };
		worksheet.getCell('B3').font = { bold: true };
		const receipt_date = getDateFormatted(dataReceipt?.created_at).split('-'); // DD,MM,YY
		worksheet.getCell('E3').value =
			'    Ngày ' + receipt_date[0] + ' tháng ' + receipt_date[1] + ' năm ' + receipt_date[2];
		worksheet.mergeCells('E3:G3');

		worksheet.getCell('B4').value = 'Mã tiếp nhận mẫu: ';
		worksheet.mergeCells('C4:D4');
		worksheet.getCell('C4').value = dataReceipt?.receipt_uid || '';
		worksheet.getCell('C4').font = { bold: true };
		worksheet.getCell('C4').alignment = {
			horizontal: 'right',
		};

		worksheet.getCell('E4').value =
			'    Ngày tiếp nhận mẫu: ' + `${receipt_date[0]}/${receipt_date[1]}/${receipt_date[2]}`;
		worksheet.mergeCells('E4:G4');
		worksheet.getRow(4).height = 18.75;

		worksheet.getCell('A6').value = '  1.1 Thông tin khách hàng:';
		worksheet.mergeCells('A6:C6');
		worksheet.getCell('A6').font = { italic: true };

		worksheet.getCell('B7').value = 'Tên cơ sở, người yêu cầu thử nghiệm: ' + (dataReceipt?.client.client_name || '');
		worksheet.mergeCells('B7:G7');

		worksheet.getCell('B8').value = 'Địa chỉ: ' + (dataReceipt?.client.client_address || '');
		worksheet.mergeCells('B8:G8');

		worksheet.getCell('B9').value = 'MST/CCCD: ' + (dataReceipt?.client.legal_id || '');
		worksheet.mergeCells('B9:G9');

		worksheet.getCell('A11').value = '  1.2 Người gửi mẫu: ';
		worksheet.mergeCells('A11:B11');
		worksheet.getCell('C11').value = dataReceipt?.contact?.name || '';
		worksheet.mergeCells('C11:G11');
		worksheet.getCell('A11').font = { italic: true };
		worksheet.getCell('C11').font = { italic: true };

		worksheet.getCell('B12').value = 'SDT: ' + (dataReceipt?.contact?.phone || '');
		worksheet.mergeCells('B12:E12');
		worksheet.getCell('F12').value = 'Email*: ' + (dataReceipt?.contact?.email || '');
		worksheet.mergeCells('F12:G12');
		worksheet.getCell('B13').value = 'CCCD: ';
		worksheet.mergeCells('B13:E13');
		worksheet.getCell('F13').value = 'Ngày gửi mẫu: ';
		worksheet.mergeCells('F13:G13');

		worksheet.getCell('A15').value = '  1.3 Người nhận mẫu: ' + (dataReceipt?.created_by_uid || '');
		worksheet.mergeCells('A15:G15');
		worksheet.getCell('A15').font = { italic: true };

		worksheet.getCell('B16').value = 'Tài liệu kèm theo: ';
		worksheet.mergeCells('B16:G16');

		worksheet.getCell('A18').value = '2.';
		worksheet.getCell('B18').value = 'Ngày hẹn trả kết quả dự kiến:';
		worksheet.mergeCells('B18:D18');
		worksheet.getCell('A18').font = { bold: true };
		worksheet.getCell('B18').font = { bold: true };
		worksheet.getCell('E18').value = getDateFormatted(dataReceipt?.deadline) || '';
		worksheet.mergeCells('E18:G18');

		worksheet.getCell('A20').value = '3.';
		worksheet.getCell('B20').value = 'Thông tin đăng ký thử nghiệm (mẫu):';
		worksheet.mergeCells('B20:G20');
		worksheet.getCell('A20').font = { bold: true };
		worksheet.getCell('B20').font = { bold: true };
		// A7:H7 Title
		const titleCell = ['A22', 'B22', 'C22', 'D22', 'E22', 'F22', 'G22'];
		const titleValue = [
			'TT',
			'Thông tin mẫu',
			'Số lượng mẫu',
			'Mô tả khi nhận',
			'Chỉ tiêu yêu cầu kiểm nghiệm',
			'Phương pháp thử',
			'Ghi chú',
		];
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
		let currentRow = 23;
		if (data.length > 0) {
			data.forEach((sample, index) => {
				worksheet.getCell(`A${currentRow}`).value = index + 1;
				worksheet.getCell(`B${currentRow}`).value = sample?.sample_name || '';
				worksheet.getCell(`C${currentRow}`).value = sample?.sample_volume || '';
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
					worksheet.mergeCells(`B${currentRow}:B${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`C${currentRow}:C${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`D${currentRow}:D${currentRow + testOrders.length - 1}`);
					worksheet.mergeCells(`G${currentRow}:G${currentRow + testOrders.length - 1}`);
				}

				// Lấy các ô merge để căn lề
				const cells = [`A${currentRow}`, `B${currentRow}`, `C${currentRow}`, `D${currentRow}`, `G${currentRow}`];
				cells.forEach((cell) => {
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

				// Tăng currentRow lên số lượng test_orders hoặc ít nhất là 1
				currentRow += testOrders.length || 1;
			});
		}

		// Ghi giá trị 5.
		worksheet.getCell(`A${currentRow + 1}`).value = '4.';
		worksheet.getCell(`B${currentRow + 1}`).value = 'Thông tin liên hệ: ';
		worksheet.mergeCells(`B${currentRow + 1}:G${currentRow + 1}`);
		worksheet.getCell(`A${currentRow + 1}`).font = { bold: true };
		worksheet.getCell(`B${currentRow + 1}`).font = { bold: true };

		worksheet.getCell(`B${currentRow + 2}`).value = 'SDT: 024 355 35 355';
		worksheet.mergeCells(`B${currentRow + 2}:G${currentRow + 2}`);

		worksheet.getCell(`B${currentRow + 3}`).value = 'Email: kiemnghiem@irdop.org';
		worksheet.mergeCells(`B${currentRow + 3}:G${currentRow + 3}`);

		worksheet.getCell(`A${currentRow + 5}`).value = 'Phòng dịch vụ khách hàng';
		worksheet.mergeCells(`A${currentRow + 5}:D${currentRow + 5}`);
		worksheet.getCell(`A${currentRow + 5}`).font = { bold: true };
		worksheet.getCell(`A${currentRow + 5}`).alignment = {
			horizontal: 'center',
		};
		worksheet.getCell(`F${currentRow + 5}`).value = 'Đại diện gửi mẫu';
		worksheet.mergeCells(`F${currentRow + 5}:G${currentRow + 5}`);
		worksheet.getCell(`F${currentRow + 5}`).font = { bold: true };
		worksheet.getCell(`F${currentRow + 5}`).alignment = {
			horizontal: 'center',
		};

		worksheet.getCell(`A${currentRow + 6}`).value = '(Người nhận mẫu ký tên và ghi rõ họ tên)';
		worksheet.mergeCells(`A${currentRow + 6}:D${currentRow + 6}`);
		worksheet.getCell(`A${currentRow + 6}`).alignment = {
			horizontal: 'center',
		};

		worksheet.getCell(`A${currentRow + 11}`).value = dataReceipt?.created_by_uid || '';
		worksheet.mergeCells(`A${currentRow + 11}:D${currentRow + 11}`);
		worksheet.getCell(`A${currentRow + 11}`).alignment = {
			horizontal: 'center',
		};

		worksheet.getCell(`F${currentRow + 11}`).value = '(Theo phiếu yêu cầu đính kèm)';
		worksheet.mergeCells(`F${currentRow + 11}:G${currentRow + 11}`);
		worksheet.getCell(`F${currentRow + 11}`).alignment = {
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
		sheet2.mergeCells('E1:H1');

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
			buffer: imageBuffer,
			extension: 'png',
		});

		sheet2.addImage(imageId2, {
			tl: { col: 2.18, row: 0.283 }, // Vị trí góc trên bên trái (ô C1)
			ext: { width: 229, height: 70 }, // Kích thước hình ảnh
		});

		sheet2.getRow(1).height = 60; // Chiều cao hàng 1

		sheet2.getCell('A2').value = 'BIÊN BẢN BÀN GIAO MẪU THỬ NỘI BỘ';
		sheet2.mergeCells('A2:H2'); // Merge cell
		sheet2.getCell('A2').alignment = {
			wrapText: true,
			horizontal: 'center',
			vertical: 'middle',
		}; // Alignment

		sheet2.getRow(2).height = 60; // Chiều cao hàng 2

		sheet2.getCell('B3').value = 'Thông tin mẫu đến';
		sheet2.getCell('D3').value = dataReceipt?.request_number || '';
		sheet2.mergeCells('D3:E3');
		sheet2.getCell('F3').value = 'Ngày bàn giao mẫu';
		sheet2.getCell('G3').value = getDateFormatted(dataReceipt?.created_at) || '';
		sheet2.mergeCells('G3:H3');
		sheet2.getCell('B4').value = 'Người bàn giao mẫu thử ( thuộc p. Dịch vụ)';
		sheet2.getCell('D4').value = dataReceipt?.created_by_uid || '';
		sheet2.mergeCells('D4:E4');
		sheet2.getCell('F4').value = 'Ngày bàn giao mẫu cho lab';
		sheet2.getCell('G4').value = getDateFormatted(dataReceipt?.created_at) || '';

		sheet2.getCell('A6').value = 'Danh mục bàn giao các mẫu giao: trong bảng sau';
		sheet2.getCell('A6').font = { bold: true };

		// Điều chỉnh kích thước cột
		sheet2.columns = [
			{ width: 40 / 7.776 }, // Cột A - TT
			{ width: 150 / 7.776 }, // Cột B - Mã mẫu
			{ width: 200 / 7.776 }, // Cột C - Tên mẫu
			{ width: 100 / 7.776 }, // Cột D - Số lượng mẫu
			{ width: 100 / 7.776 }, // Cột E - Yêu cầu (additional_request)
			{ width: 260 / 7.776 }, // Cột F - Chỉ tiêu
			{ width: 185 / 7.776 }, // Cột G - Phương pháp thử
			{ width: 100 / 7.776 }, // Cột H - Đơn vị (result_unit)
			{ width: 120 / 7.776 }, // Cột I - Ngày trả kết quả
			{ width: 130 / 7.776 }, // Cột J - Người thực hiện chính
		];

		// A7:J7 Title
		const titleCell2 = ['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7', 'I7', 'J7'];
		const titleValue2 = [
			'TT',
			'Mã mẫu',
			'Tên mẫu',
			'Số lượng mẫu',
			'Yêu cầu',
			'Chỉ tiêu',
			'Phương pháp thử',
			'Đơn vị',
			'Ngày trả kết quả',
			'Người thực hiện chính',
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
				sheet2.getCell(`E${sheer2CurrentRow}`).value = sample?.additional_request || '';

				// Kiểm tra nếu test_orders tồn tại và là một mảng
				const testOrders = sample.analysis ?? [];
				testOrders.forEach((test_order, testIndex) => {
					// Extract parameter name correctly
					const parameterName = extractParameterText(test_order?.parameter_name);
					sheet2.getCell(`F${sheer2CurrentRow + testIndex}`).value = parameterName || '';
					sheet2.getCell(`G${sheer2CurrentRow + testIndex}`).value = test_order?.protocol_code || '';

					// Parse and format HTML unit content
					const unitHtmlContent = test_order?.result_unit || '';
					const parsedUnitText = parseHtmlUnit(unitHtmlContent);
					sheet2.getCell(`H${sheer2CurrentRow + testIndex}`).value = parsedUnitText;

					// Apply special character formatting for sub and superscripts if needed
					// Note: ExcelJS has limited support for formatting parts of text
					// This would require Rich Text functionality which is more complex

					sheet2.getCell(`I${sheer2CurrentRow + testIndex}`).value = getDateFormatted(test_order?.deadline) || '';

					// Use the technician name instead of just the ID
					const technicianName = getTechnicianName(technicians, test_order?.technician_uid);
					sheet2.getCell(`J${sheer2CurrentRow + testIndex}`).value = technicianName || test_order?.technician_uid || '';

					const dataCell = [
						`F${sheer2CurrentRow + testIndex}`,
						`G${sheer2CurrentRow + testIndex}`,
						`H${sheer2CurrentRow + testIndex}`,
						`I${sheer2CurrentRow + testIndex}`,
						`J${sheer2CurrentRow + testIndex}`,
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

				// Gộp các ô nếu có test_orders
				if (testOrders.length > 0) {
					sheet2.mergeCells(`A${sheer2CurrentRow}:A${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`B${sheer2CurrentRow}:B${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`C${sheer2CurrentRow}:C${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`D${sheer2CurrentRow}:D${sheer2CurrentRow + testOrders.length - 1}`);
					sheet2.mergeCells(`E${sheer2CurrentRow}:E${sheer2CurrentRow + testOrders.length - 1}`);
				}

				const cells = [
					`A${sheer2CurrentRow}`,
					`B${sheer2CurrentRow}`,
					`C${sheer2CurrentRow}`,
					`D${sheer2CurrentRow}`,
					`E${sheer2CurrentRow}`,
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

				// Tăng sheer2CurrentRow lên số lượng test_orders hoặc ít nhất là 1
				sheer2CurrentRow += testOrders.length || 1;
			});
		}

		// Ghi giá trị cho ô
		sheet2.getCell(`B${sheer2CurrentRow + 2}`).value = 'Người bàn giao mẫu';
		sheet2.getCell(`B${sheer2CurrentRow + 2}`).alignment = {
			horizontal: 'center',
			vertical: 'middle',
		};
		sheet2.getCell(`B${sheer2CurrentRow + 2}`).font = { bold: true };

		sheet2.getCell(`B${sheer2CurrentRow + 6}`).value = '';
		sheet2.getCell(`B${sheer2CurrentRow + 6}`).alignment = {
			vertical: 'middle',
			horizontal: 'center',
		};
		sheet2.mergeCells(`B${sheer2CurrentRow + 2}:D${sheer2CurrentRow + 2}`);

		sheet2.getCell(`B${sheer2CurrentRow + 6}`).value = dataReceipt?.created_by_uid || '';
		sheet2.mergeCells(`B${sheer2CurrentRow + 6}:D${sheer2CurrentRow + 6}`);

		sheet2.getCell(`F${sheer2CurrentRow + 2}`).value = 'Người nhận bàn giao';
		sheet2.getCell(`F${sheer2CurrentRow + 2}`).alignment = {
			horizontal: 'center',
			vertical: 'middle',
		};
		sheet2.getCell(`F${sheer2CurrentRow + 2}`).font = { bold: true };
		sheet2.mergeCells(`F${sheer2CurrentRow + 2}:H${sheer2CurrentRow + 2}`);

		// Áp dụng font Times New Roman và cỡ chữ 14 cho toàn bộ sheet
		sheet2.eachRow({ includeEmpty: true }, (row) => {
			row.eachCell({ includeEmpty: true }, (cell) => {
				const currentFont = cell.font || {};
				cell.font = {
					...currentFont,
					name: 'Times New Roman',
					size: 14,
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
