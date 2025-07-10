const uuidv4 = global.get('uuid').v4;
const table = global.get('table');

function buildHTML(order) {
	// Chuyển đổi đối tượng order thành chuỗi JSON để sử dụng trong JavaScript
	// Điều này đảm bảo xử lý đúng các ký tự đặc biệt và dấu ngoặc kép
	const orderJSON = JSON.stringify(order || {});

	// Tạo một UUID mới cho đơn hàng nếu chưa có
	const currentOrderCode = order ? order.order_code || uuidv4() : uuidv4();

	// Lấy client_uid để hiển thị
	const clientUid = order && order.client ? order.client.client_uid : '';

	return `<!DOCTYPE html>
<html lang="vi">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Phiếu Gửi Mẫu Thử Nghiệm</title>
		<style>
			body {
				background-color: #f3f4f6;
				font-family: Arial, sans-serif;
				margin: 0;
				padding: 5px;
				box-sizing: border-box;
				line-height: 1.4;
			}
			.container {
				background-color: #ffffff;
				padding: 1rem;
				border-radius: 0.5rem;
				box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
				width: 100%;
				max-width: 1000px;
				margin: 0 auto;
				h1 {
					font-size: 1.75rem;
					font-weight: bold;
					text-align: center;
					margin-bottom: 1rem;
					color: #1f2937;
				} /* Card Layout */
				.info-card {
					border: 2px solid #e0e0e0;
					margin: 15px 0;
					padding: 10px;
					background-color: #f9f9f9;
					border-radius: 8px;
					box-sizing: border-box;
				}
				.info-card h3 {
					color: #2563eb;
					margin-top: 0;
					margin-bottom: 15px;
					display: flex;
					align-items: center;
					gap: 8px;
					font-size: 1.1rem;
					font-weight: 600;
				}

				/* Compact Form Groups */
				.form-row {
					display: flex;
					align-items: center;
					margin: 8px 0;
					flex-wrap: wrap;
					gap: 10px;
				}
				.form-row label {
					font-weight: 600;
					color: #374151;
					min-width: 140px;
					font-size: 0.9rem;
				}
				.form-row input,
				.form-row select,
				.form-row textarea {
					flex: 1;
					padding: 8px 12px;
					border: 1px solid #d1d5db;
					border-radius: 4px;
					font-size: 0.9rem;
					min-width: 200px;
					transition: border-color 0.2s, box-shadow 0.2s;
				}

				/* Reset font cho textarea */
				.form-row textarea,
				textarea {
					font-family: Arial, sans-serif;
					font-size: 14px;
					line-height: 1.4;
				}
				.form-row input:focus,
				.form-row select:focus,
				.form-row textarea:focus,
				.info-field-select:focus,
				.additional-info-input:focus,
				.custom-field-name:focus {
					outline: none;
					border-color: #3b82f6;
					box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
				}
				/* Additional info specific styles */
				.info-field-select {
					width: 100px;
					padding: 6px 2px;
					border: 1px solid #d1d5db;
					border-radius: 4px;
					font-weight: 500;
					background-color: white;
					box-sizing: border-box;
				} /* Prevent overlapping */
				.additional-info-item,
				.analysis-item {
					display: flex;
					align-items: center;
					margin-bottom: 10px;
					gap: 5px;
				} /* CSS cho Additional info và Analysis parameters container */
				.additional-analysis-container {
					display: flex;
					flex-direction: row;
					gap: 15px;
					margin: 15px 0;
					box-sizing: border-box;
				}
				.additional-info-box,
				.analysis-parameters-box {
					border: 1px solid #e5e7eb;
					border-radius: 6px;
					padding: 10px;
					background-color: #f9fafb;
					box-sizing: border-box;
				}
				.additional-info-box {
					flex: 0.5;
					min-width: 0;
				}

				.analysis-parameters-box {
					flex: 0.5;
					min-width: 0;
				}

				.field-label-container {
					width: 100px;
					min-width: 100px;
					flex-shrink: 0;
					display: flex;
					align-items: center;
				}
				.additional-info-input,
				.parameter-name-input,
                .parameter-unit-input,
				.parameter-price-input {
					flex: 1;
					min-width: 0;
					padding: 6px 2px;
					border: 1px solid #d1d5db;
					border-radius: 4px;
					box-sizing: border-box;
				}
                .parameter-unit-input {
                    flex: none;
                    width: 60px;
                }
				.parameter-price-input {
					flex: none;
					width: 80px;
					background-color: #f3f4f6;
					cursor: not-allowed;
				}

				.parameter-price-input:read-only {
					background-color: #f3f4f6;
					border-color: #d1d5db;
					cursor: not-allowed;
				}
				.remove-btn {
					min-width: 30px;
					width: 30px;
					flex-shrink: 0;
					background: none;
					border: none;
					color: #dc2626;
					opacity: 0.7;
					cursor: pointer;
					font-size: 16px;
					padding: 4px 8px;
					transition: opacity 0.2s;
					text-align: center;
				}

				.remove-btn:hover {
					opacity: 1;
				}
				.form-row input[type='checkbox'] {
					width: auto;
					min-width: auto;
					margin-right: 8px;
				} /* Two Column Layout */
				.two-column {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 10px;
				} /* Full width address field on desktop */
				.full-width-address,
				.full-width-description {
					grid-column: 1 / -1;
				} /* Custom dropdown styles */
				.copy-dropdown-btn {
					padding: 10px 15px;
					font-size: 1rem;
					border: 1px solid #d1d5db;
					border-radius: 4px;
					background-color: white;
					min-width: 200px;
					cursor: pointer;
					display: flex;
					justify-content: space-between;
					align-items: center;
					transition: border-color 0.2s, box-shadow 0.2s;
				}

				.copy-dropdown-btn:hover {
					border-color: #3b82f6;
					box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
				}

				.dropdown-container {
					position: absolute;
					top: 100%;
					left: 0;
					right: 0;
					background: white;
					border: 1px solid #d1d5db;
					border-radius: 4px;
					box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
					z-index: 1000;
					display: none;
					max-height: 200px;
					overflow-y: auto;
				}
				.dropdown-item {
					padding: 10px 15px;
					cursor: pointer;
					border-bottom: 1px solid #f3f4f6;
					transition: background-color 0.2s;
					text-align: left;
				}

				.dropdown-item:hover {
					background-color: #f3f4f6;
				}

				.dropdown-item:last-child {
					border-bottom: none;
				}
				.dropdown-empty {
					padding: 15px;
					text-align: center;
					color: #6b7280;
					font-style: italic;
				}
				/* Editable field and value container */
				.additional-info-item {
					display: flex;
					align-items: center;
					margin-bottom: 10px;
					gap: 8px;
					border: 1px solid #e5e7eb;
					border-radius: 4px;
					padding: 4px;
					background-color: white;
				}
				.editable-field-input {
					width: 140px;
					padding: 6px 8px;
					box-sizing: border-box;
					border: none;
					border-right: 1px solid #e5e7eb;
					border-radius: 0;
					font-weight: 500;
					background-color: #f9f9f9;
					cursor: text;
					transition: background-color 0.2s;
					flex-shrink: 0;
				}

				.editable-field-input:focus {
					outline: none;
					background-color: white;
					border-right-color: #3b82f6;
				}
				.field-dropdown {
					position: absolute;
					top: 100%;
					left: 0;
					width: 140px;
					background: white;
					border: 1px solid #d1d5db;
					border-radius: 4px;
					box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
					z-index: 1000;
					display: none;
					max-height: 200px;
					overflow-y: auto;
					scrollbar-width: thin;
					scrollbar-color: #cbd5e1 transparent;
				}

				/* Webkit scrollbar styles for Chrome/Safari */
				.field-dropdown::-webkit-scrollbar {
					width: 6px;
				}

				.field-dropdown::-webkit-scrollbar-track {
					background: transparent;
				}

				.field-dropdown::-webkit-scrollbar-thumb {
					background-color: #cbd5e1;
					border-radius: 3px;
				}

				.field-dropdown::-webkit-scrollbar-thumb:hover {
					background-color: #94a3b8;
				}
				.field-dropdown-item {
					padding: 8px 2px;
					cursor: pointer;
					border-bottom: 1px solid #f3f4f6;
					transition: background-color 0.2s;
					font-size: 0.8rem;
				}

				.field-dropdown-item:hover {
					background-color: #f3f4f6;
				}

				.field-dropdown-item:last-child {
					border-bottom: none;
				}

				@media (max-width: 600px) {
					.copy-dropdown-btn {
						min-width: 180px;
						font-size: 0.9rem;
						padding: 8px 12px;
					}

					.dropdown-item {
						padding: 8px 12px;
						font-size: 0.9rem;
					}
				}

				/* Sample Section */
				.sample-section {
					border: 1px solid #e5e7eb;
					border-radius: 6px;
					padding: 0;
					margin: 15px 0;
					background-color: white;
				}
				.sample-header {
					color: #3b82f6;
					padding: 10px 15px;
					border-radius: 6px 6px 0 0;
					font-weight: 600;
					display: flex;
					justify-content: flex-start;
					align-items: center;
					gap: 10px;
				}
				.sample-content {
					padding: 10px;
				}

				/* Sample Table */
				.samples-table {
					width: 100%;
					border-collapse: collapse;
					margin: 10px 0;
					font-size: 0.85rem;
				}
				.samples-table th,
				.samples-table td {
					border: 1px solid #ddd;
					padding: 8px;
					vertical-align: top;
					text-align: left;
				}
				.samples-table th {
					background-color: #f0f0f0;
					font-weight: bold;
					text-align: center;
					font-size: 0.9rem;
				}
				.samples-table tbody tr:nth-child(even) {
					background-color: #f9f9f9;
				}

				/* Sample Info Inputs */
				.sample-info-row {
					display: flex;
					align-items: center;
					margin: 6px 0;
					gap: 8px;
				}
				.sample-info-row label {
					font-weight: 500;
					color: #374151;
					min-width: 120px;
					font-size: 0.85rem;
				}
				.sample-info-row input {
					flex: 1;
					padding: 6px 8px;
					border: 1px solid #d1d5db;
					border-radius: 3px;
					font-size: 0.85rem;
				}

				/* Analysis Parameters */
				.analysis-params {
					display: grid;
					grid-template-columns: 2fr 1fr 1fr auto;
					gap: 8px;
					align-items: center;
					margin: 6px 0;
					padding: 8px;
					border: 1px solid #e5e7eb;
					border-radius: 4px;
					background-color: white;
				}
				.analysis-params input,
				.analysis-params select {
					padding: 6px 8px;
					border: 1px solid #d1d5db;
					border-radius: 3px;
					font-size: 0.85rem;
				}

				/* Buttons */
				.btn {
					padding: 12px 24px;
					border: none;
					border-radius: 6px;
				cursor: pointer;
					font-size: 1rem;
					transition: background-color 0.2s, opacity 0.2s;
					font-weight: 600;
                    margin: 0 5px;
				}
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
				.btn-primary {
					background-color: #3b82f6;
					color: white;
				}
				.btn-primary:hover:not(:disabled) {
					background-color: #2563eb;
				}
				.btn-success {
					background-color: #10b981;
					color: white;
				}
				.btn-success:hover:not(:disabled) {
					background-color: #059669;
				}
				.btn-danger {
					background-color: white;
					color: #f87171;
					border: 2px solid #f87171;
					width: 33px;
					height: 33px;
					padding: 0;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 6px;
					font-size: 1rem;
					font-weight: bold;
				}
				.btn-danger:hover {
					background-color: #f87171;
					color: white;
				}
				.btn-warning {
					background-color: #f59e0b;
					color: white;
				}
				.btn-warning:hover {
					background-color: #d97706;
				}

				/* Loading Animation */
				@keyframes spin {
					0% {
						transform: rotate(0deg);
					}
					100% {
						transform: rotate(360deg);
					}
				}

				/* Messages */
				.error-message,
				.success-message,
                .info-message {
					padding: 12px;
					border-radius: 6px;
					margin: 15px 0;
					text-align: center;
				}
				.error-message {
					background-color: #fee2e2;
					border: 1px solid #fecaca;
					color: #dc2626;
				}
				.success-message {
					background-color: #d1fae5;
					border: 1px solid #a7f3d0;
					color: #065f46;
				}
                .info-message {
                    background-color: #FEF3C7;
                    border: 1px solid #FDE68A;
                    color: #92400E;
                }

				/* Warning Box */
                .warning-box {
                    background-color: #FEF3C7;
                    border: 2px solid #F59E0B;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    text-align: center;
                    color: #92400E;
                    font-weight: 600;
                    display: none;
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

				/* Submit Button Area */
                .submit-area {
                    text-align: center;
                    margin: 20px 0;
                }
				.add-analysis-btn {
					display: inline-block !important;
				}

				.analysis-input-container {
					display: flex !important;
				}
				.parameters-container {
					display: block !important;
				}

				/* Media queries cho responsive design */
				/* Kiểu mặc định cho các elements (chiều rộng desktop) */
				.form-row {
					display: flex;
					align-items: center;
					margin: 8px 0;
					flex-wrap: wrap;
					gap: 10px;
				}

				.sample-info-row {
					display: flex;
					align-items: center;
					margin: 6px 0;
					gap: 8px;
				}

				.two-column {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 8px;
				}

				.additional-info-item,
				.analysis-item {
					display: flex;
					align-items: center;
					margin-bottom: 10px;
					gap: 8px;
				} /* Media query áp dụng khi chiều rộng trình duyệt nhỏ hơn 600px */
				@media (max-width: 599px) {
					.form-row {
						flex-direction: column;
						align-items: flex-start;
						gap: 5px;
					}

					.form-row label {
						min-width: auto;
						width: 100%;
						margin-bottom: 5px;
					}

					.form-row input,
					.form-row select,
					.form-row textarea {
						width: 100%;
						min-width: auto;
						box-sizing: border-box;
					}

					.sample-info-row {
						flex-direction: column;
						align-items: flex-start;
						gap: 5px;
					}

					.sample-info-row label {
						min-width: auto;
						width: 100%;
						margin-bottom: 5px;
					}
					.sample-info-row input,
					.sample-info-row textarea {
						width: 100%;
						box-sizing: border-box;
						font-family: Arial, sans-serif;
						font-size: 14px;
						line-height: 1.4;
					}

					.two-column {
						grid-template-columns: 1fr;
						gap: 10px;
					}

					/* Giữ additional-info-item và analysis-item trên 1 hàng */
					.additional-info-item,
					.analysis-item {
						display: flex;
						align-items: center;
						flex-wrap: nowrap;
						gap: 5px;
					}

					.field-label-container {
						flex-shrink: 0;
						width: auto;
						min-width: 80px;
					}
					.additional-info-input,
					.parameter-name-input,
                    .parameter-unit-input,
					.parameter-price-input {
						flex: 1;
						min-width: 0;
						box-sizing: border-box;
					}

					.remove-btn {
						flex-shrink: 0;
						width: 30px;
						height: 30px;
						min-width: 30px;
					}

					/* Giữ sample-header trên 1 hàng */
					.sample-header {
						display: flex;
						align-items: center;
						flex-wrap: nowrap;
						gap: 8px;
					}

					.sample-header span {
						flex-shrink: 0;
						white-space: nowrap;
						font-size: 0.9rem;
					}

					.sample-header input {
						flex: 1;
						min-width: 0;
						margin: 0;
						box-sizing: border-box;
					}
					.sample-header button {
						flex-shrink: 0;
						width: 33px;
						height: 33px;
					} /* Responsive cho full-width address */
					.full-width-address,
					.full-width-description {
						grid-column: auto;
					}
					margin: 0;
					box-sizing: border-box;
				}

				.sample-header button {
					align-self: flex-end;
				}

				.info-field-select {
					width: 100%;
				}

				.custom-field-container {
					width: 100%;
				}
				.custom-field-name {
					width: 100%;
				} /* Responsive cho phần Additional info và Analysis parameters */
				.additional-analysis-container {
					flex-direction: column;
					gap: 15px;
				}
				.additional-info-box,
				.analysis-parameters-box {
					flex: none;
					width: 100%;
					box-sizing: border-box;
				}
			} /* Media query cho màn hình >= 600px để đảm bảo layout ngang */
			@media (min-width: 600px) {
				.additional-analysis-container {
					display: flex !important;
					flex-direction: row !important;
					gap: 15px !important;
				}

				.additional-info-box {
					flex: 0.5 !important;
					width: auto !important;
				}

				.analysis-parameters-box {
					flex: 0.5 !important;
					width: auto !important;
				}
			}
		</style>
	</head>
	<body>
		<div class="container">
			<h1>Phiếu Gửi Mẫu Thử Nghiệm</h1>

			<div id="loadingIndicator" style="display: none; text-align: center; padding: 2rem">
				<div
					style="
						border: 4px solid #f3f4f6;
						border-top: 4px solid #3b82f6;
						border-radius: 50%;
						width: 40px;
						height: 40px;
						animation: spin 1s linear infinite;
						margin: 0 auto;
					"
				></div>
				<p style="margin-top: 1rem; color: #6b7280">Đang tải thông tin...</p>
			</div>
			<div id="formContent">
                <div id="message-container"></div>
				<div class="info-card">
					<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
						<h3 style="margin: 0;">🏢 Thông tin khách hàng</h3>
						${
							clientUid
								? `<span style="font-size: 0.8rem; color: #6b7280; text-align: right; padding-top: 2px;">UID: ${clientUid}</span>`
								: ''
						}
					</div>
					<div class="two-column">
						<div>
							<div class="form-row">
								<label>Tên cá nhân / tổ chức:</label>
								<input type="text" id="clientName" placeholder="Nhập tên cá nhân / tổ chức" required />
							</div>
							<div class="form-row">
								<label>Mã số thuế / CCCD:</label>
								<input type="text" id="legalId" placeholder="Nhập mã số thuế / CCCD" required />
							</div>
						</div>

						<div>
							<div class="form-row">
								<label>Số điện thoại:</label>
								<input type="tel" id="clientPhone" placeholder="Số điện thoại liên hệ" />
							</div>
							<div class="form-row">
								<label>Email nhận hóa đơn:</label>
								<input type="email" id="invoiceEmail" placeholder="Email nhận hóa đơn" />
							</div>
						</div>
					</div>
					<div class="form-row full-width-address" style="margin-top: 15px">
						<label>Địa chỉ:</label>
						<input type="text" id="clientAddress" placeholder="Nhập địa chỉ" required />
					</div>
					<div style="margin-top: 15px">
						<label style="display: block; font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 0.9rem"
							>Thông tin xuất hóa đơn (nếu khác thông tin trên):</label
						>
						<textarea
							id="invoiceInfo"
							placeholder="Nhập thông tin xuất hóa đơn nếu khác với thông tin khách hàng ở trên"
							rows="3"
							style="
								width: 100%;
								max-width: 100%;
								padding: 8px 12px;
								border: 1px solid #d1d5db;
								border-radius: 4px;
								font-family: Arial, sans-serif;
								font-size: 14px;
								line-height: 1.4;
								transition: border-color 0.2s, box-shadow 0.2s;
								box-sizing: border-box;
								resize: vertical;
							"
						></textarea>
					</div>
				</div>
				<div class="info-card">
					<h3>👤 Thông tin liên hệ</h3>
					<div class="two-column">
						<div>
							<div class="form-row">
								<label>Tên người liên hệ:</label>
								<input type="text" id="contactName" placeholder="Nhập tên người liên hệ" required />
							</div>
							<div class="form-row">
								<label>Số điện thoại:</label>
								<input type="tel" id="contactPhone" placeholder="Nhập số điện thoại" required />
							</div>
							<div class="form-row">
								<label>Email:</label>
								<input type="email" id="contactEmail" placeholder="Nhập địa chỉ email" required />
							</div>
						</div>
						<div>
							<div class="form-row">
								<label>CCCD:</label>
								<input type="text" id="contactId" placeholder="Số CCCD người liên hệ" />
							</div>
							<div class="form-row">
								<label>Ngày cấp:</label>
								<input type="date" id="contactIdDate" />
							</div>
							<div class="form-row">
								<label>Nơi cấp:</label>
								<input type="text" id="contactIdPlace" placeholder="Nơi cấp CCCD" />
							</div>
						</div>
					</div>
				</div>
				<div class="info-card">
					<h3>📫 Nơi nhận kết quả thử nghiệm</h3>
					<div class="two-column">
						<div>
							<div class="form-row">
								<label>Địa chỉ nhận bản cứng:</label>
								<input type="text" id="receiverAddress" placeholder="Địa chỉ nhận bản cứng" required/>
							</div>
							<div class="form-row">
								<label>Người nhận (nếu khác trên):</label>
								<input type="text" id="receiverName" placeholder="Tên người nhận nếu khác người liên hệ" />
							</div>
						</div>
						<div>
							<div class="form-row">
								<label>Email:</label>
								<input type="email" id="receiverEmail" placeholder="Email nhận kết quả" />
							</div>
							<div class="form-row">
								<label>Phương thức khác:</label>
								<input type="text" id="receiverOther" placeholder="Zalo, nhận trực tiếp, ..." />
							</div>
						</div>
					</div>
				</div>
				<div class="info-card">
					<h3>🧪 Thông tin mẫu thử nghiệm</h3>
				</div>
				<div id="samples-container">
					</div>
				<div style="text-align: center; margin: 15px 0">
					<div style="display: inline-flex; align-items: center; gap: 10px">
						<button
							type="button"
							class="btn btn-primary"
                            onclick="addSample()"
							style="padding: 10px 20px; font-size: 1rem"
						>
							+ Thêm mẫu mới
						</button>
						<span style="color: #6b7280">hoặc</span>
						<div style="position: relative">
							<button type="button" id="copyFromSampleBtn" onclick="toggleCopyDropdown()" class="copy-dropdown-btn">
								<span>Sao chép từ mẫu có sẵn</span>
								<span style="margin-left: 10px">▼</span>
							</button>
							<div id="copyFromDropdown" class="dropdown-container">
								</div>
						</div>
					</div>
				</div>
				<div id="warning-container" class="warning-box">
					⚠️ Khi thay đổi thông tin các chỉ tiêu thử nghiệm, giá trị đơn hàng có thể bị ảnh hưởng. Vui lòng liên hệ bộ phận Chăm sóc Khách hàng để xác nhận lại thông tin!
				</div>
				<div class="submit-area">
					<button id="saveBtn" class="btn btn-primary" onclick="saveOrder()">💾 Lưu thông tin</button>
                    <button id="exportBtn" class="btn btn-success" onclick="exportForm()">📄 Xuất phiếu gửi mẫu</button>
				</div>
			</div>
		</div>

		<script>
            // Biến toàn cục cho JavaScript
			var orderData = ${orderJSON};
            var currentOrderCode = "${currentOrderCode}";
			let sampleCount = 0;
            let warningShown = false;

            // --- Hàm trợ giúp ---
			function getUrlParameter(name) {
				name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
				const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
				const results = regex.exec(location.search);
				return results === null ? '' : decodeURIComponent(results[1].replace(/\\+/g, ' '));
			}

			function safeValue(value) {
				if (value === null || value === undefined || value === 'null' || value === 'undefined') {
					return '';
				}
				return String(value);
			}

            function showOneTimeWarning() {
                console.log('showOneTimeWarning called, warningShown:', warningShown);
                if (!warningShown) {
                    alert('⚠️ Khi thay đổi thông tin các chỉ tiêu thử nghiệm, giá trị đơn hàng có thể bị ảnh hưởng. Vui lòng liên hệ bộ phận Chăm sóc Khách hàng để xác nhận lại thông tin!');
                    warningShown = true;
                    console.log('Warning alert displayed, warningShown set to:', warningShown);
                } else {
                    console.log('Warning already shown, skipping');
                }
            }

            // --- Hàm tạo HTML ---
			function createSampleHTML(sampleNumber) {
				return \`
					<div class="sample-header">
						<span>\${sampleNumber}. Tên mẫu:</span>
						<input type="text" class="sample-name" placeholder="Nhập tên mẫu" required style="flex: 1; margin: 0 10px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px;" />
						<button type="button" class="btn btn-danger" onclick="removeSample(this)" title="Xóa mẫu">×</button>
					</div>
                    <div class="sample-content">
						<div class="two-column" style="margin-bottom: 15px;">
							<div class="sample-info-row">
								<label>Nền mẫu:</label>
								<input type="text" class="sample-matrix" placeholder="Nền mẫu" />
							</div>
                            <div class="sample-info-row">
								<label>Số lượng:</label>
								<input type="text" class="sample-volume" placeholder="Số lượng mẫu" />
							</div>
							<div class="sample-info-row full-width-description">
								<label>Mô tả mẫu:</label>
								<textarea class="sample-description" placeholder="Mô tả chi tiết mẫu" rows="2" style="width: 100%; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4;"></textarea>
							</div>
						</div>
                        <div class="additional-analysis-container">
							<div class="additional-info-box">
								<h4 style="margin: 0 0 15px 0; color: #374151; font-size: 0.95rem;">📋 Thông tin thêm</h4>
								<div class="additional-info-container"></div>
								<button type="button" class="btn btn-success" onclick="addAdditionalInfo(this)" style="margin-top: 10px; background-color: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.85rem;">+ Thêm trường</button>
							</div>
							<div class="analysis-parameters-box">
								<h4 style="margin: 0 0 15px 0; color: #374151; font-size: 0.95rem;">🔬 Danh sách chỉ tiêu</h4>
								<div class="analysis-header" style="display: flex; align-items: center; gap: 5px; margin-bottom: 8px; font-size: 0.85rem; color: #6b7280; font-weight: 500;">
									<div style="flex: 1; padding-left: 2px;">Tên chỉ tiêu</div>
                                    <div style="width: 60px; padding-left: 2px;">Đơn vị</div>
									<div style="width: 80px; padding-left: 2px;">Giá</div>
									<div style="width: 30px; text-align: center;">Xóa</div>
								</div>
								<div class="analysis-container"></div>
                                <div style="margin-top: 10px; display: flex; gap: 10px;" class="analysis-input-container">
									<input type="text" class="new-parameter-input" placeholder="Nhập tên chỉ tiêu" style="flex: 1; padding: 6px 2px; border: 1px solid #d1d5db; border-radius: 4px;">
									<button type="button" class="btn btn-success add-analysis-btn" onclick="addAnalysisParameter(this)" style="background-color: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.85rem;">+ Thêm</button>
								</div>
							</div>
						</div>
					</div>
				\`;
			}

            // --- Hàm quản lý Sample ---
			function addSample() {
                console.log('addSample called');
                showOneTimeWarning();
				const container = document.getElementById('samples-container');
				const newSample = document.createElement('div');
				newSample.className = 'sample-section';
				newSample.setAttribute('data-sample-index', sampleCount);

				newSample.innerHTML = createSampleHTML(sampleCount + 1);
				container.appendChild(newSample);
				
                const additionalInfoContainer = newSample.querySelector('.additional-info-container');
				if (additionalInfoContainer) {
					addAdditionalInfoItem(additionalInfoContainer, 'Tên mẫu thử / name.', '', 'sample_test_name', true);
					addAdditionalInfoItem(additionalInfoContainer, 'Số lô / LOT no.', '', 'lot_number');
					addAdditionalInfoItem(additionalInfoContainer, 'Ngày sản xuất / mfg.', '', 'manufacturing_date');
					addAdditionalInfoItem(additionalInfoContainer, 'Hạn sử dụng / exp.', '', 'expiry_date');
					addAdditionalInfoItem(additionalInfoContainer, 'Nơi sản xuất / mfr.', '', 'manufacturer');
				}
                sampleCount++;
				setTimeout(updateCopyFromDropdown, 100);
			}

            function removeSample(button) {
                console.log('removeSample called');
                showOneTimeWarning();
				const sampleSection = button.closest('.sample-section');
				const samplesContainer = document.getElementById('samples-container');

				if (samplesContainer.children.length > 1) {
					sampleSection.remove();
					updateSampleNumbers();
				} else {
					alert('Phải có ít nhất một mẫu!');
				}
			}

            function updateSampleNumbers() {
				const samples = document.querySelectorAll('.sample-section');
				samples.forEach((sample, index) => {
					const header = sample.querySelector('.sample-header span');
					if (header) {
						header.textContent = \`\${index + 1}. Tên mẫu:\`;
					}
					sample.setAttribute('data-sample-index', index);
				});
				sampleCount = samples.length;
				updateCopyFromDropdown();
			}

            function addSampleWithData(sampleData) {
                const container = document.getElementById('samples-container');
				const newSample = document.createElement('div');
				newSample.className = 'sample-section';
				newSample.setAttribute('data-sample-index', sampleCount);

				newSample.innerHTML = createSampleHTML(sampleCount + 1);
				container.appendChild(newSample);

                // Điền dữ liệu mẫu
				newSample.querySelector('.sample-name').value = safeValue(sampleData.sample_name);
				newSample.querySelector('.sample-description').value = safeValue(sampleData.sample_description);
				newSample.querySelector('.sample-matrix').value = safeValue(sampleData.matrix);
				newSample.querySelector('.sample-volume').value = safeValue(sampleData.volume);

                // Điền thông tin thêm
				const additionalInfoContainer = newSample.querySelector('.additional-info-container');
                additionalInfoContainer.innerHTML = ''; // Xóa các trường mặc định
				
                if (sampleData.sample_information && sampleData.sample_information.length > 0) {
                    const hasNameField = sampleData.sample_information.some(info => info.fname === 'Tên mẫu thử / name.');
                    if (!hasNameField) {
                        addAdditionalInfoItem(additionalInfoContainer, 'Tên mẫu thử / name.', safeValue(sampleData.sample_name), 'sample_test_name', true);
                    }
                    sampleData.sample_information.forEach(info => {
                        const isNameField = info.fname === 'Tên mẫu thử / name.';
                        addAdditionalInfoItem(additionalInfoContainer, safeValue(info.fname), safeValue(info.fvalue), safeValue(info.fname), isNameField);
                    });
                } else {
                    addAdditionalInfoItem(additionalInfoContainer, 'Tên mẫu thử / name.', safeValue(sampleData.sample_name), 'sample_test_name', true);
                    addAdditionalInfoItem(additionalInfoContainer, 'Số lô / LOT no.', '', 'lot_number');
                    addAdditionalInfoItem(additionalInfoContainer, 'Ngày sản xuất / mfg.', '', 'manufacturing_date');
                    addAdditionalInfoItem(additionalInfoContainer, 'Hạn sử dụng / exp.', '', 'expiry_date');
                    addAdditionalInfoItem(additionalInfoContainer, 'Nơi sản xuất / mfr.', '', 'manufacturer');
                }

                // Điền chỉ tiêu phân tích
				if (sampleData.analysis && sampleData.analysis.length > 0) {
					const analysisContainer = newSample.querySelector('.analysis-container');
                    analysisContainer.innerHTML = '';
                    sampleData.analysis.forEach(analysis => {
                        addAnalysisRow(analysisContainer, safeValue(analysis.parameter_name), safeValue(analysis.price), safeValue(analysis.result_unit));
                    });
				}
				sampleCount++;
                updateCopyFromDropdown();
			}
            
            // --- Hàm quản lý thông tin thêm & chỉ tiêu ---
            function addAdditionalInfo(button) {
                showOneTimeWarning();
				const container = button.parentElement.querySelector('.additional-info-container');
				addAdditionalInfoItem(container, 'Tên trường mới', '', 'custom', false);
			}

			function addAdditionalInfoItem(container, label, value, field, hidden = false) {
				const commonFields = ['Tên mẫu thử / name.', 'Số lô / LOT no.', 'Ngày sản xuất / mfg.', 'Hạn sử dụng / exp.', 'Nơi sản xuất / mfr.', 'Số công bố / pub. no.', 'Số đăng ký / reg. no.'];
				const infoItem = document.createElement('div');
				infoItem.className = 'additional-info-item';
				if (hidden) {
					infoItem.style.display = 'none';
				}
				infoItem.innerHTML = \`
					<div style="position: relative; display: inline-block;">
						<input type="text" class="editable-field-input" value="\${safeValue(label)}" placeholder="Tên trường" />
						<div class="field-dropdown">
							\${commonFields.map(field => \`<div class="field-dropdown-item" data-value="\${field}">\${field}</div>\`).join('')}
						</div>
					</div>
					<input type="text" class="additional-info-input" data-field="\${safeValue(field) || 'custom'}" value="\${safeValue(value)}" placeholder="Nhập giá trị" style="flex: 1; padding: 6px 8px; border: none; border-radius: 0; background-color: transparent;" />
					<button type="button" class="remove-btn" onclick="removeAdditionalInfo(this)" style="background: none; border: none; color: #ef4444; font-size: 18px; cursor: pointer; padding: 4px; opacity: 0.7;">×</button>
				\`;
				container.appendChild(infoItem);
				setupEditableField(infoItem);
                if (hidden && label === 'Tên mẫu thử / name.') {
                    const sampleSection = container.closest('.sample-section');
                    if (sampleSection) {
                        syncSampleNameWithHiddenField(sampleSection);
                    }
                }
			}

            function removeAdditionalInfo(button) {
                showOneTimeWarning();
				const item = button.closest('.additional-info-item');
                // Không cho xóa trường tên mẫu ẩn
                const isHiddenNameField = item.querySelector('.editable-field-input').value === 'Tên mẫu thử / name.' && item.style.display === 'none';
                if(isHiddenNameField) {
                    alert('Không thể xóa trường thông tin mặc định này.');
                    return;
                }
				item.remove();
				setTimeout(updateCopyFromDropdown, 100);
			}
            
            function addAnalysisParameter(button) {
                console.log('addAnalysisParameter called');
                showOneTimeWarning();
				const sampleSection = button.closest('.sample-section');
				const analysisContainer = sampleSection.querySelector('.analysis-container');
				const parameterInput = sampleSection.querySelector('.new-parameter-input');
				if (parameterInput.value.trim() === '') {
					alert('Vui lòng nhập tên chỉ tiêu!');
					return;
				}
                addAnalysisRow(analysisContainer, parameterInput.value.trim(), '', '');
				parameterInput.value = ''; // Xóa input sau khi thêm
			}

            function addAnalysisRow(container, name, price, unit) {
                const newItem = document.createElement('div');
				newItem.className = 'analysis-item';
				newItem.innerHTML = \`
					<input type="text" class="parameter-name-input" value="\${safeValue(name)}" placeholder="Tên chỉ tiêu" style="flex: 1; padding: 6px 2px; border: 1px solid #d1d5db; border-radius: 4px; min-width: 0;" />
                    <input type="text" class="parameter-unit-input" value="\${safeValue(unit)}" placeholder="Đvị" style="width: 60px; padding: 6px 2px; border: 1px solid #d1d5db; border-radius: 4px;" />
					<input type="text" class="parameter-price-input" value="\${safeValue(price)}" placeholder="Giá" readonly style="width: 80px; padding: 6px 2px; border: 1px solid #d1d5db; border-radius: 4px; background-color: #f3f4f6; cursor: not-allowed;" />
					<button type="button" class="remove-btn" onclick="removeAnalysisRow(this)" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
				\`;
				container.appendChild(newItem);
                setTimeout(updateCopyFromDropdown, 100);
            }

			function removeAnalysisRow(button) {
                console.log('removeAnalysisRow called');
                showOneTimeWarning();
				button.closest('.analysis-item').remove();
				setTimeout(updateCopyFromDropdown, 100);
			}

            // --- Hàm sao chép và dropdown ---
            function toggleCopyDropdown() {
				const dropdown = document.getElementById('copyFromDropdown');
				const button = document.getElementById('copyFromSampleBtn');
				if (dropdown.style.display === 'none' || !dropdown.style.display) {
					dropdown.style.display = 'block';
					button.querySelector('span:last-child').textContent = '▲';
				} else {
					dropdown.style.display = 'none';
					button.querySelector('span:last-child').textContent = '▼';
				}
			}

            function updateCopyFromDropdown() {
                const dropdown = document.getElementById('copyFromDropdown');
                const samples = document.querySelectorAll('.sample-section');
                dropdown.innerHTML = '';
                let validSamples = [];

                samples.forEach((sample, index) => {
                    const sampleName = sample.querySelector('.sample-name').value;
                    const displayName = sampleName && sampleName.trim() ? \`\${index + 1}. \${sampleName.trim()}\` : \`\${index + 1}. Mẫu \${index + 1}\`;
                    validSamples.push({ index: index, displayName: displayName });
                });

                if (validSamples.length > 0) {
                    validSamples.forEach(validSample => {
                        const item = document.createElement('div');
                        item.className = 'dropdown-item';
                        item.textContent = validSample.displayName;
                        item.onclick = () => {
                            copyFromExistingSample(validSample.index);
                            toggleCopyDropdown();
                        };
                        dropdown.appendChild(item);
                    });
                } else {
                    const emptyItem = document.createElement('div');
                    emptyItem.className = 'dropdown-empty';
                    emptyItem.textContent = 'Chưa có mẫu nào để sao chép';
                    dropdown.appendChild(emptyItem);
                }
            }
            
            function copyFromExistingSample(sourceIndex) {
                showOneTimeWarning();
				const samples = document.querySelectorAll('.sample-section');
				const sourceSample = samples[sourceIndex];
				if (!sourceSample) return;

				const sampleData = {
					sample_name: sourceSample.querySelector('.sample-name').value.trim(),
					sample_description: sourceSample.querySelector('.sample-description').value.trim(),
					matrix: sourceSample.querySelector('.sample-matrix').value.trim(),
					volume: sourceSample.querySelector('.sample-volume').value.trim(),
					sample_information: [],
					analysis: [],
				};

				sourceSample.querySelectorAll('.additional-info-item').forEach(item => {
					const fname = item.querySelector('.editable-field-input').value.trim();
					const fvalue = item.querySelector('.additional-info-input').value.trim();
					if (fvalue && fname !== 'Tên mẫu thử / name.') {
						sampleData.sample_information.push({ fname: fname, fvalue: fvalue });
					}
				});

				sourceSample.querySelectorAll('.analysis-item').forEach(item => {
					const parameterName = item.querySelector('.parameter-name-input').value.trim();
                    const unit = item.querySelector('.parameter-unit-input').value.trim();
                    const price = item.querySelector('.parameter-price-input').value.trim();
					if (parameterName) {
						sampleData.analysis.push({ parameter_name: parameterName, price: price, result_unit: unit });
					}
				});
                
                // Tạo mẫu mới với dữ liệu đã sao chép
				addSampleWithData(sampleData);
			}

            // --- Hàm tương tác với trường có thể chỉnh sửa ---
            function setupEditableField(infoItem) {
				const input = infoItem.querySelector('.editable-field-input');
				const dropdown = infoItem.querySelector('.field-dropdown');
				const dropdownItems = dropdown.querySelectorAll('.field-dropdown-item');

				input.addEventListener('click', (e) => {
					e.stopPropagation();
					dropdown.style.display = 'block';
				});

				dropdownItems.forEach(item => {
					item.addEventListener('click', function(e) {
						e.stopPropagation();
						input.value = this.getAttribute('data-value');
						dropdown.style.display = 'none';
						updateCopyFromDropdown();
					});
				});

				input.addEventListener('blur', () => {
					setTimeout(() => { dropdown.style.display = 'none'; }, 200);
				});
			}

            function syncSampleNameWithHiddenField(sampleSection) {
				const sampleNameInput = sampleSection.querySelector('.sample-name');
				const hiddenNameField = Array.from(sampleSection.querySelectorAll('.additional-info-item')).find(item => {
					const editableInput = item.querySelector('.editable-field-input');
					return editableInput && editableInput.value === 'Tên mẫu thử / name.';
				});
				if (sampleNameInput && hiddenNameField) {
					const valueInput = hiddenNameField.querySelector('.additional-info-input');
					if (valueInput) valueInput.value = sampleNameInput.value;
				}
			}

            // --- Hàm điền và thu thập dữ liệu Form ---
			function populateFormWithData() {
                console.log('populateFormWithData called, orderData:', orderData);
                if (!orderData || Object.keys(orderData).length === 0) {
                    console.log('No existing order data - new form');
                    addSample();
                    warningShown = false; // Reset warning for new forms
                    console.log('warningShown reset to false for new form');
                    return;
                }
                console.log('Loading existing order data');
				if (orderData.client) {
					document.getElementById('clientName').value = safeValue(orderData.client.client_name);
					document.getElementById('clientAddress').value = safeValue(orderData.client.client_address);
					document.getElementById('legalId').value = safeValue(orderData.client.legal_id);
					document.getElementById('clientPhone').value = safeValue(orderData.client.client_phone);
					document.getElementById('invoiceEmail').value = safeValue(orderData.client.invoice_email);
                    document.getElementById('invoiceInfo').value = safeValue(orderData.client.invoice_info);
				}
				if (orderData.contact) {
					document.getElementById('contactName').value = safeValue(orderData.contact.name);
					document.getElementById('contactPhone').value = safeValue(orderData.contact.phone);
					document.getElementById('contactEmail').value = safeValue(orderData.contact.email);
					document.getElementById('contactId').value = safeValue(orderData.contact.id || orderData.contact.id_card_number);
					document.getElementById('contactIdDate').value = safeValue(orderData.contact.id_date || orderData.contact.issue_date);
					document.getElementById('contactIdPlace').value = safeValue(orderData.contact.id_place || orderData.contact.issue_place);
				}
				if (orderData.receiver) {
					document.getElementById('receiverAddress').value = safeValue(orderData.receiver.address);
					document.getElementById('receiverName').value = safeValue(orderData.receiver.name);
					document.getElementById('receiverEmail').value = safeValue(orderData.receiver.email);
					document.getElementById('receiverOther').value = safeValue(orderData.receiver.other || orderData.receiver.other_method);
				}
				if (orderData.samples && orderData.samples.length > 0) {
                    document.getElementById('samples-container').innerHTML = '';
                    sampleCount = 0;
					orderData.samples.forEach(sample => {
						addSampleWithData(sample);
					});
				} else {
                    addSample();
                }
                warningShown = false; // Reset warning for all cases - user can still see warning when making changes
                console.log('warningShown set to false for existing data - warning will show on first change');
                updateCopyFromDropdown();
			}

			function collectFormData() {
				const formData = {
                    order_code: currentOrderCode,
					client: {
						client_uid: orderData && orderData.client ? orderData.client.client_uid : '',
						client_name: document.getElementById('clientName').value.trim(),
						client_address: document.getElementById('clientAddress').value.trim(),
						legal_id: document.getElementById('legalId').value.trim(),
						client_phone: document.getElementById('clientPhone').value.trim(),
						invoice_email: document.getElementById('invoiceEmail').value.trim(),
						invoice_info: document.getElementById('invoiceInfo').value.trim(),
					},
					contact: {
						name: document.getElementById('contactName').value.trim(),
						phone: document.getElementById('contactPhone').value.trim(),
						email: document.getElementById('contactEmail').value.trim(),
						id: document.getElementById('contactId').value.trim(),
						id_date: document.getElementById('contactIdDate').value,
						id_place: document.getElementById('contactIdPlace').value.trim(),
					},
					receiver: {
						address: document.getElementById('receiverAddress').value.trim(),
						name: document.getElementById('receiverName').value.trim(),
						email: document.getElementById('receiverEmail').value.trim(),
						other: document.getElementById('receiverOther').value.trim(),
					},
					samples: [],
				};

				document.querySelectorAll('.sample-section').forEach(section => {
					const sampleData = {
						sample_name: section.querySelector('.sample-name').value.trim(),
						sample_description: section.querySelector('.sample-description').value.trim(),
						matrix: section.querySelector('.sample-matrix').value.trim(),
						volume: section.querySelector('.sample-volume').value.trim(),
						sample_information: [],
						analysis: [],
					};

					section.querySelectorAll('.additional-info-item').forEach(item => {
                        const fname = item.querySelector('.editable-field-input').value.trim();
                        const fvalue = item.querySelector('.additional-info-input').value.trim();
                        if (fname && fvalue) {
                             sampleData.sample_information.push({ fname, fvalue });
                        }
					});

					section.querySelectorAll('.analysis-item').forEach(item => {
						const parameterName = item.querySelector('.parameter-name-input').value.trim();
                        const unit = item.querySelector('.parameter-unit-input').value.trim();
						const parameterPrice = item.querySelector('.parameter-price-input').value.trim();
						if (parameterName) {
							sampleData.analysis.push({ parameter_name: parameterName, price: parameterPrice, result_unit: unit });
						}
					});
					formData.samples.push(sampleData);
				});
				return formData;
			}
            
            // --- Hàm gửi Form và hiển thị thông báo ---
            function validateForm(formData) {
				const errors = [];
				if (!formData.client.client_name) errors.push('Tên khách hàng là bắt buộc');
                if (!formData.client.client_address) errors.push('Địa chỉ khách hàng là bắt buộc');
				if (!formData.client.legal_id) errors.push('Mã số thuế/CCCD là bắt buộc');
				if (!formData.contact.name) errors.push('Tên người liên hệ là bắt buộc');
				if (!formData.contact.phone) errors.push('Số điện thoại liên hệ là bắt buộc');
                if (!formData.receiver.address) errors.push('Địa chỉ nhận bản cứng là bắt buộc');
                
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if(formData.contact.email && !emailRegex.test(formData.contact.email)) errors.push('Email liên hệ không hợp lệ');

				if (formData.samples.length === 0) {
					errors.push('Phải có ít nhất một mẫu');
				} else {
					formData.samples.forEach((sample, index) => {
						if (!sample.sample_name) {
							errors.push(\`Mẫu \${index + 1}: Tên mẫu là bắt buộc\`);
						}
					});
				}
				return errors;
			}
            
            function displayMessage(message, type = 'error') {
                const container = document.getElementById('message-container');
                container.innerHTML = ''; // Clear previous messages
                
                const messageDiv = document.createElement('div');
                if (type === 'error') {
                    messageDiv.className = 'error-message';
                    const errorList = document.createElement('ul');
					errorList.style.cssText = 'margin: 0; padding-left: 1.5rem; text-align: left;';
					message.forEach(error => {
						const listItem = document.createElement('li');
						listItem.textContent = error;
						errorList.appendChild(listItem);
					});
                    messageDiv.appendChild(errorList);
                } else {
                    messageDiv.className = type === 'success' ? 'success-message' : 'info-message';
                    messageDiv.textContent = message;
                }
                
                container.appendChild(messageDiv);
                messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
			function saveOrder() {
				const formData = collectFormData();
                const errors = validateForm(formData);
                if (errors.length > 0) {
                    displayMessage(errors, 'error');
                    return;
                }
                
                const saveButton = document.getElementById('saveBtn');
                saveButton.textContent = 'Đang lưu...';
                saveButton.disabled = true;

                fetch("https://black.irdop.org/db/save/order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ order_code: formData.order_code, order: formData })
                })
                .then(res => {
                    if (!res.ok) return res.json().then(err => Promise.reject(err));
                    return res.json();
                })
                .then(resp => {
                    console.log("Lưu đơn hàng thành công:", resp);
                    displayMessage('Lưu thông tin thành công!', 'success');
                })
                .catch(err => {
                    console.error("Lỗi khi lưu thông tin:", err);
                    displayMessage("Có lỗi xảy ra khi lưu: " + (err.message || JSON.stringify(err)), 'error');
                })
                .finally(() => {
                    saveButton.textContent = '💾 Lưu thông tin';
                    saveButton.disabled = false;
                });
			}

            function exportForm() {
                const formData = collectFormData();
                const errors = validateForm(formData);
                if (errors.length > 0) {
                    displayMessage(errors, 'error');
                    return;
                }

                const exportButton = document.getElementById('exportBtn');
                exportButton.textContent = 'Đang lưu...';
                exportButton.disabled = true;

                // Bước 1: Lưu thông tin trước
                fetch("https://black.irdop.org/db/save/order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ order_code: formData.order_code, order: formData })
                })
                .then(res => {
                    if (!res.ok) return res.json().then(err => Promise.reject(err));
                    return res.json();
                })
                .then(saveResp => {
                    console.log("Lưu đơn hàng thành công:", saveResp);
                    
                    // Bước 2: Xuất file sau khi lưu thành công
                    exportButton.textContent = 'Đang xuất...';
                    
                    return fetch("https://black.irdop.org/xlsx/download/request_form", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formData)
                    });
                })
                .then(response => {
                    if (!response.ok) return response.json().then(err => Promise.reject(err));
                    return response.blob();
                })
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "Phieu_gui_mau.xlsx";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    displayMessage('Lưu thông tin và xuất file thành công!', 'success');
                })
                .catch(err => {
                    console.error("Lỗi khi lưu/xuất:", err);
                    displayMessage("Có lỗi xảy ra: " + (err.message || JSON.stringify(err)), 'error');
                })
                .finally(() => {
                    exportButton.textContent = '📄 Xuất phiếu gửi mẫu';
                    exportButton.disabled = false;
                });
            }

            // --- Khởi tạo Form ---
			document.addEventListener('DOMContentLoaded', () => {
                populateFormWithData();
                document.addEventListener('input', (e) => {
                    if (e.target.classList.contains('sample-name')) {
                        const sampleSection = e.target.closest('.sample-section');
                        if (sampleSection) syncSampleNameWithHiddenField(sampleSection);
                        setTimeout(updateCopyFromDropdown, 100);
                    }
                });
                document.addEventListener('click', (event) => {
                    const dropdown = document.getElementById('copyFromDropdown');
                    const button = document.getElementById('copyFromSampleBtn');
                    if (button && dropdown && !button.contains(event.target) && !dropdown.contains(event.target)) {
                        dropdown.style.display = 'none';
                        button.querySelector('span:last-child').textContent = '▼';
                    }

                    document.querySelectorAll('.field-dropdown').forEach(d => {
                        const container = d.closest('div[style*="position: relative"]');
                        if(container && !container.contains(event.target)){
                           d.style.display = 'none';
                        }
                    });
                });
            });

		</script>
	</body>
</html>`;
}

async function getOrderCodeFromDB() {
	try {
		const { orderCode, uri } = msg.req.query;
		const order = await table.Receipt.getOrderByCode(orderCode);

		const now = new Date();

		if (order && order.uri_expired_at && new Date(order.uri_expired_at) > now) {
			msg.payload = buildHTML(order);
		} else if (!orderCode) {
			// Trường hợp tạo mới không có orderCode
			msg.payload = buildHTML(null);
		} else {
			msg.statusCode = 404;
			msg.payload = { error: true, message: 'Order not found or URI has expired' };
		}

		return msg;
	} catch (error) {
		msg.statusCode = 500;
		msg.payload = { error: true, message: 'Internal server error: ' + error.message };
		return msg;
	}
}

return getOrderCodeFromDB();
