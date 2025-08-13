# Content Change Detection Enhancement

## Tóm tắt thay đổi

Đã cải thiện component `ProcessingAnalysis.jsx` để tránh gửi API update không cần thiết khi nội dung không thay đổi.

## Các thay đổi chính

### 1. Thêm Helper Functions

#### `normalizeContent(content)`

- Chuẩn hóa nội dung để so sánh
- Loại bỏ thẻ `<p>` và `</p>` ở đầu cuối (từ TinyMCE)
- Thay thế `&nbsp;` thành khoảng trắng thường
- Trim khoảng trắng thừa

#### `hasContentChanged(newContent, currentData, analysisId, column)`

- So sánh nội dung mới với nội dung hiện tại
- Sử dụng `normalizeContent()` để chuẩn hóa trước khi so sánh
- Trả về `true` nếu có thay đổi, `false` nếu không

### 2. Cập nhật các hàm Update

#### `updateAnalysisField()`

- Kiểm tra thay đổi trước khi gửi API
- Bỏ qua API call nếu không có thay đổi
- Vẫn clear editing state

#### `handleSaveContentV3()`

- Kiểm tra thay đổi cho TinyMCE editor
- Hiển thị thông báo "Không có thay đổi" nếu nội dung giống nhau
- Đặc biệt hữu ích cho `result_value` và `result_unit`

#### `handleProtocolSourceChange()`

- Kiểm tra thay đổi cho dropdown selection
- Tránh API call khi chọn lại giá trị hiện tại

#### `handleSaveEdit()`

- Kiểm tra thay đổi cho legacy editing system
- Consistent với các hàm update khác

## Lợi ích

1. **Giảm traffic mạng**: Không gửi API khi không cần thiết
2. **Cải thiện performance**: Ít API calls = ít tải cho server
3. **Trải nghiệm người dùng tốt hơn**:
   - Không loading spinner không cần thiết
   - Thông báo rõ ràng khi không có thay đổi
4. **Xử lý TinyMCE tốt hơn**: Tự động ignore các HTML tags không quan trọng

## Test Cases

Đã tạo file test (`contentComparison.test.js`) để verify:

- Normalization cho TinyMCE content
- So sánh content với `&nbsp;` và plain text
- Xử lý empty content
- Function `hasContentChanged()` hoạt động đúng

## Ví dụ hoạt động

```javascript
// Case 1: Không có thay đổi
Current: "Hello World"
New: "<p>Hello World</p>"
Result: API call bị skip, hiển thị "Không có thay đổi nào để cập nhật"

// Case 2: Có thay đổi
Current: "10.5 mg/L"
New: "<p>11.0 mg/L</p>"
Result: API call được thực hiện bình thường
```

## Logs

Khi content không thay đổi, console sẽ hiển thị:

```
No changes detected for result_value, skipping API call
```
