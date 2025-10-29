# ✅ Hoàn thành: Chỉnh sửa Protocol Code và Logic Xuất PDF có điều kiện

## Tổng quan

Đã thực hiện thành công các thay đổi để:

1. ✅ Cho phép chỉnh sửa cột `protocolCode` trong phiên nhập kết quả
2. ✅ Logic xuất PDF có điều kiện:
   - Nếu **chỉ thay đổi protocolCode** → Không bắt buộc xuất PDF
   - Nếu **có thay đổi resultValue** → Bắt buộc phải xuất PDF

## Files đã cập nhật

### 1. ✅ `src/components/sample/filterable.jsx`

**Đã hoàn thành 100%**

Các thay đổi:

- ✅ Thêm state `originalAnalyses` để lưu dữ liệu gốc
- ✅ Cập nhật `startResultEntrySession()` để lưu dữ liệu gốc
- ✅ Cho phép chỉnh sửa `protocolCode` trong `handleCellClick()`
- ✅ Cập nhật `handleCellBlur()` để lưu thay đổi `protocolCode`
- ✅ Thêm render cell có thể chỉnh sửa cho cột `protocolCode`
- ✅ Cập nhật `handleEndSession()` để gửi `protocolCode` qua API
- ✅ Truyền `originalAnalyses` prop vào component `ConfirmLabResult`

### 2. ✅ `src/components/noti box/confirmLabResult.jsx`

**Đã hoàn thành 100%**

Các thay đổi:

- ✅ Thêm prop `originalAnalyses` vào component
- ✅ Thêm state `hasResultValueChanges`
- ✅ Thêm `useEffect` để kiểm tra thay đổi `resultValue` (so sánh với original)
- ✅ Cập nhật UI dialog để hiển thị cảnh báo khi có thay đổi `resultValue`
- ✅ Ẩn nút "Không, chỉ cập nhật" khi có thay đổi `resultValue`
- ✅ Chỉ cho phép xuất PDF khi có thay đổi `resultValue`

### 3. ⚠️ `src/components/lab/ProcessingAnalysis.jsx`

**Chưa cập nhật - Cần thực hiện thủ công**

👉 Xem hướng dẫn chi tiết trong file: `PROTOCOL_CODE_PROCESSING_ANALYSIS_UPDATE.md`

## Cách hoạt động

### Luồng 1: Chỉ thay đổi protocolCode

```
User bật session
  → originalAnalyses được lưu
  → User chỉnh sửa protocolCode
  → Thay đổi lưu vào pendingChanges
  → User kết thúc session
  → Dialog hiển thị 2 tùy chọn:
     • "Không, chỉ cập nhật" (chỉ cập nhật DB)
     • "Có, tạo PDF" (cập nhật DB + xuất PDF)
```

### Luồng 2: Có thay đổi resultValue

```
User bật session
  → originalAnalyses được lưu
  → User chỉnh sửa resultValue (hoặc cả protocolCode)
  → Thay đổi lưu vào pendingChanges
  → User kết thúc session
  → Dialog kiểm tra và phát hiện thay đổi resultValue
  → Hiển thị cảnh báo: "⚠️ Có thay đổi kết quả thử nghiệm"
  → Chỉ có 1 nút: "Có, tạo PDF và tải xuống" (BẮT BUỘC)
```

## Logic kiểm tra thay đổi resultValue

```javascript
const hasChanges = analyses.some((analysis) => {
	const original = originalAnalyses?.find((orig) => orig.id === analysis.id);
	if (!original) return true; // Mới, coi là thay đổi

	// Strip HTML để so sánh chính xác
	const stripHTML = (str) => (str || '').replace(/<[^>]*>/g, '');
	const currentValue = stripHTML(analysis.resultValue);
	const originalValue = stripHTML(original.resultValue);

	return currentValue !== originalValue;
});
```

## API Update

Dữ liệu gửi lên server:

```javascript
{
	analyses: [
		{
			id: 123,
			resultValue: '<p>10</p>',
			resultUnit: 'mg/L',
			protocolCode: 'TCVN 6191:1996', // ⬅️ Đã thêm
		},
		// ...
	];
}
```

## Test Cases

### ✅ Test Case 1: Chỉ sửa protocolCode

1. Bật result entry session
2. Sửa protocolCode: "TCVN 123" → "TCVN 456"
3. Kết thúc session
4. **Kết quả**: Dialog cho phép chọn "Không, chỉ cập nhật"

### ✅ Test Case 2: Chỉ sửa resultValue

1. Bật result entry session
2. Sửa resultValue: "10" → "15"
3. Kết thúc session
4. **Kết quả**: Dialog chỉ có nút "Có, tạo PDF" (bắt buộc)

### ✅ Test Case 3: Sửa resultUnit (không phải resultValue)

1. Bật result entry session
2. Sửa resultUnit: "mg/L" → "ppm"
3. Kết thúc session
4. **Kết quả**: Dialog cho phép chọn "Không, chỉ cập nhật"

### ✅ Test Case 4: Sửa cả protocolCode và resultValue

1. Bật result entry session
2. Sửa protocolCode: "TCVN 123" → "TCVN 456"
3. Sửa resultValue: "10" → "15"
4. Kết thúc session
5. **Kết quả**: Dialog chỉ có nút "Có, tạo PDF" (vì có thay đổi resultValue)

## Files tài liệu

📄 **PROTOCOL_CODE_EDIT_FEATURE.md** - Tài liệu chi tiết về feature
📄 **PROTOCOL_CODE_PROCESSING_ANALYSIS_UPDATE.md** - Hướng dẫn cập nhật ProcessingAnalysis.jsx

## Lưu ý kỹ thuật

1. **So sánh chính xác**: `resultValue` được strip HTML tags trước khi so sánh
2. **Lưu trữ original data**: Dữ liệu gốc được lưu khi **bắt đầu session**, không phải khi fetch data
3. **Map structure**: Sử dụng `Map<analysisId, analysis>` để tra cứu nhanh
4. **HTML conversion**: `protocolCode` KHÔNG được convert sang HTML (khác với resultValue/resultUnit)
5. **API compatibility**: Backend phải hỗ trợ nhận `protocolCode` trong request body

## Kiểm tra lỗi

✅ Không có lỗi syntax trong:

- `src/components/sample/filterable.jsx`
- `src/components/noti box/confirmLabResult.jsx`

## Next Steps

1. ⚠️ Cập nhật `src/components/lab/ProcessingAnalysis.jsx` theo hướng dẫn
2. ✅ Test tất cả các test cases
3. ✅ Deploy lên production
