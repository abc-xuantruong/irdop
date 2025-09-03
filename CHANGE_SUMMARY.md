# Tóm tắt các thay đổi

## Ngày: 3 tháng 9 năm 2025

### Phiên bản V 2.60 (28/8/2025)

#### Cải tiến giao diện và trải nghiệm người dùng

- **Header cố định với dropdown kỹ thuật viên**: Thêm header cố định ở phía trên cùng của trang ProcessingAnalysis, tích hợp dropdown chọn kỹ thuật viên trực tiếp trong breadcrumb, di chuyển sidebar xuống dưới để tối ưu hóa không gian.

- **Cải thiện dropdown kỹ thuật viên**: Tự động điều chỉnh vị trí dropdown để tránh tràn ra ngoài màn hình, thêm validation cho technician_uid trước khi gửi API, cải thiện xử lý lỗi và rollback khi cập nhật thất bại.

#### Tính năng cập nhật hàng loạt (AnalyteBulkUpdate)

- **Tạo component mới: AnalyteBulkUpdate.jsx**: Cho phép cập nhật hàng loạt các chỉ tiêu được chọn, hỗ trợ chỉnh sửa các trường: lĩnh vực, chứng nhận, nguồn, phương pháp, đơn vị, giá, kỹ thuật viên.

- **Tích hợp TinyMCE**: Cho chỉnh sửa định dạng hiển thị.

- **Bảng xem trước thay đổi**: Với highlight các trường sẽ được cập nhật.

- **Tính năng chính**: Validation thông minh chỉ cập nhật các trường có thay đổi thực sự, xem trước tất cả thay đổi trước khi thực hiện, hỗ trợ cập nhật định dạng hiển thị (mặc định và tiếng Anh), thông báo toast khi hoàn thành hoặc gặp lỗi.

#### Cải thiện xử lý dữ liệu và API

- **Nâng cao fetchAnalysisData**: Thêm logging chi tiết cho debug, cải thiện xử lý filter với nhiều loại dữ liệu khác nhau, hỗ trợ filter nâng cao cho deadline, doc_id, result_value, tối ưu hóa debounce để giảm số lượng API calls không cần thiết.

- **Cải thiện fetchParameters**: Lọc parameters theo context hiện tại (sample_uid, parameter_name, etc.), hỗ trợ filter theo nhiều tiêu chí cùng lúc, cải thiện hiệu suất với caching và debounce.

#### Cải thiện validation và xử lý lỗi

- **Validation technician_uid**: Kiểm tra tồn tại của technician_uid trong danh sách kỹ thuật viên, thêm warning logs cho các UID không hợp lệ, rollback state khi API call thất bại.

- **Xử lý lỗi toàn diện**: Thêm try-catch blocks cho tất cả API calls, thông báo lỗi chi tiết cho người dùng, rollback UI state khi cần thiết.

#### Cải thiện hiệu suất

- **Debouncing API calls**: Giảm số lượng API calls không cần thiết, tối ưu hóa thời gian debounce (100ms cho filter, 300ms cho search), sử dụng refs để ngăn chặn multiple concurrent requests.

- **Memory management**: Cleanup TinyMCE editors khi component unmount, tối ưu hóa re-renders với useMemo và useCallback.

#### Cải thiện UI/UX

- **Responsive design**: Dropdown tự động điều chỉnh kích thước theo viewport, grid layout cho technician selection, scrollbars tùy chỉnh với thin design.

- **Visual feedback**: Highlight các trường sẽ thay đổi trong bảng xem trước, loading states và progress indicators, toast notifications cho user feedback.

#### Bug fixes và stability improvements

- **Fix dropdown positioning**: Tính toán vị trí dropdown để tránh overflow, handle click outside để đóng dropdown, prevent memory leaks từ event listeners.

- **Improve data consistency**: Validation dữ liệu trước khi gửi API, consistent error handling patterns, better state management cho complex interactions.

### Phiên bản V2.5 (25/8/2025)

#### Tổ chức lại cấu trúc components

- **Di chuyển components vào folder lab/**: Di chuyển các components liên quan đến lab như Editor.jsx, LabDocument.jsx, ProcessingAnalysis.jsx, ProcessingSample.jsx vào thư mục src/components/lab/ để tổ chức tốt hơn.

- **Thêm các components mới**: lab/AnalysesExtract.jsx, lab/LabBulkUpdate.jsx, lab/DocumentEditor.jsx.

#### Thêm tính năng mới

- **DOCUMENT_PREVIEW_FEATURE.md**: Thêm tài liệu mô tả tính năng preview document.

- **PAGINATION_FIX.md**: Thêm tài liệu về fix pagination.

- **Report.jsx**: Thêm component Report với nhiều cải tiến.

- **EnvironmentSwitcher.jsx**: Thêm component để chuyển đổi môi trường.

#### Cập nhật và cải thiện components hiện có

- **Dashboard.jsx**: Cập nhật với các thay đổi mới.

- **SampleInfor.jsx**: Cải thiện thông tin mẫu.

- **ReceiptInfor.jsx**: Cập nhật thông tin biên nhận.

- **FileInfor.jsx**: Sửa lỗi call API.

#### Xóa các files không sử dụng

- Xóa các files backup và test như DocumentEditor_backup.jsx, public/ProcessingAnalysis.js, test_column_width_buttons.html, etc.

- Di chuyển assets như IRDOP-LOGO.png vào src/assets/.

### Các phiên bản trước

#### V2.30 (1/8/2025)

- Các cải tiến liên quan đến file và xử lý.

#### V2.10 (26/7/2025)

- FileInfo: fix call API.

- Tích hợp Gemini.

#### v2.0 (3/7/2025)

- Tính năng file và Gemini.

- Email functionality.

- Các fixes khác.

---

**Tác động tổng thể:**

- Cải thiện đáng kể trải nghiệm người dùng trong việc quản lý chỉ tiêu và kỹ thuật viên.
- Giảm thời gian xử lý với tính năng cập nhật hàng loạt.
- Tăng độ ổn định và reliability của ứng dụng.
- Cải thiện hiệu suất với optimized API calls và debouncing.
- Tổ chức lại cấu trúc code để dễ bảo trì hơn.
