# Chức năng chỉnh sửa Protocol Code và Logic xuất PDF

## Tổng quan

Feature này cho phép chỉnh sửa cả `protocolCode` trong phiên nhập kết quả, và điều chỉnh logic xuất PDF:

- Nếu chỉ thay đổi `protocolCode` → KHÔNG bắt buộc xuất PDF
- Nếu có thay đổi `resultValue` → BẮT BUỘC phải xuất PDF

## Các thay đổi đã thực hiện

### 1. FilterableSample Component (`src/components/sample/filterable.jsx`)

#### a. Thêm state lưu trữ dữ liệu gốc (đã thực hiện)

```javascript
// Store original analyses before editing for comparison
const [originalAnalyses, setOriginalAnalyses] = useState(new Map());
```

#### b. Cho phép chỉnh sửa protocolCode (đã thực hiện)

- Cập nhật `handleCellClick` để bao gồm `protocolCode`
- Cập nhật `handleCellBlur` để xử lý lưu `protocolCode`
- Thêm render cell có thể chỉnh sửa cho cột `protocolCode`

#### c. Cập nhật API để gửi protocolCode (đã thực hiện)

```javascript
const analyses = Array.from(pendingChanges.values()).map((change) => ({
	id: change.id,
	resultValue: change.resultValue,
	resultUnit: change.resultUnit,
	protocolCode: change.protocolCode, // Đã thêm
}));
```

#### d. Lưu dữ liệu gốc khi bắt đầu session (đã thực hiện)

```javascript
const startResultEntrySession = async () => {
	// Store original analyses data before starting session
	const originalData = new Map();
	processingSample.forEach((group) => {
		group.analyses.forEach((analysis) => {
			originalData.set(analysis.id, { ...analysis });
		});
	});
	setOriginalAnalyses(originalData);

	setIsResultEntrySession(true);
	toast.success('Đã bắt đầu phiên nhập kết quả');
};
```

#### ⚠️ e. **CẦN THỰC HIỆN THỦ CÔNG**: Truyền originalAnalyses vào ConfirmLabResult

**Vị trí**: Dòng 3134 trong file `filterable.jsx`

**Hiện tại:**

```jsx
<ConfirmLabResult
	isOpen={showEndSessionDialog}
	onClose={() => setShowEndSessionDialog(false)}
	onConfirm={async (experimentData) => {
		await handleEndSessionWithExperiment(experimentData);
	}}
	onCancel={handleCancelAllChanges}
	analyses={Array.from(pendingChanges.values())}
	isLoading={isSessionUpdating}
/>
```

**Cần sửa thành:**

```jsx
<ConfirmLabResult
	isOpen={showEndSessionDialog}
	onClose={() => setShowEndSessionDialog(false)}
	onConfirm={async (experimentData) => {
		await handleEndSessionWithExperiment(experimentData);
	}}
	onCancel={handleCancelAllChanges}
	analyses={Array.from(pendingChanges.values())}
	originalAnalyses={Array.from(originalAnalyses.values())} // ⬅️ THÊM DÒNG NÀY
	isLoading={isSessionUpdating}
/>
```

### 2. ConfirmLabResult Component (`src/components/noti box/confirmLabResult.jsx`)

#### a. Thêm props và state (đã thực hiện)

```javascript
const ConfirmLabResult = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  analyses = [],
  isLoading = false,
  originalAnalyses = []  // ⬅️ Đã thêm prop mới
}) => {
  // ...
  const [hasResultValueChanges, setHasResultValueChanges] = useState(false);  // ⬅️ Đã thêm state
```

#### b. Kiểm tra thay đổi resultValue (đã thực hiện)

```javascript
useEffect(() => {
	if (isOpen) {
		// ... các code reset khác

		// Check if there are any resultValue changes
		const hasChanges = analyses.some((analysis) => {
			const original = originalAnalyses?.find((orig) => orig.id === analysis.id);
			if (!original) return true; // New analysis, consider as change

			// Strip HTML tags for comparison
			const stripHTML = (str) => (str || '').replace(/<[^>]*>/g, '');
			const currentValue = stripHTML(analysis.resultValue);
			const originalValue = stripHTML(original.resultValue);

			return currentValue !== originalValue;
		});

		setHasResultValueChanges(hasChanges);
	}
}, [isOpen, analyses, originalAnalyses]);
```

#### c. Cập nhật UI dialog (đã thực hiện)

- Hiển thị thông báo cảnh báo khi có thay đổi `resultValue`
- Ẩn nút "Không, chỉ cập nhật" khi có thay đổi `resultValue`
- Chỉ hiển thị nút "Có, tạo PDF và tải xuống" khi có thay đổi `resultValue`

## Cách hoạt động

### Trường hợp 1: Chỉ thay đổi protocolCode

1. User chỉnh sửa protocolCode
2. Khi kết thúc session, dialog hiển thị với 2 tùy chọn:
   - "Không, chỉ cập nhật" → Chỉ cập nhật database, không xuất PDF
   - "Có, tạo PDF và tải xuống" → Cập nhật database VÀ xuất PDF

### Trường hợp 2: Có thay đổi resultValue

1. User chỉnh sửa resultValue (hoặc cả resultValue + protocolCode)
2. Khi kết thúc session, dialog hiển thị:
   - Thông báo cảnh báo: "⚠️ Có thay đổi kết quả thử nghiệm"
   - Chỉ có duy nhất 1 nút: "Có, tạo PDF và tải xuống"
   - User BẮT BUỘC phải xuất PDF

## Testing

### Test Case 1: Chỉ sửa protocolCode

1. Bật result entry session
2. Chỉ sửa protocolCode của một vài analyses
3. Kết thúc session
4. ✅ Dialog cho phép chọn "Không, chỉ cập nhật"

### Test Case 2: Sửa resultValue

1. Bật result entry session
2. Sửa resultValue của một vài analyses
3. Kết thúc session
4. ✅ Dialog chỉ hiển thị nút xuất PDF (bắt buộc)

### Test Case 3: Sửa cả protocolCode và resultValue

1. Bật result entry session
2. Sửa cả protocolCode và resultValue
3. Kết thúc session
4. ✅ Dialog chỉ hiển thị nút xuất PDF (vì có thay đổi resultValue)

## Lưu ý kỹ thuật

- `originalAnalyses` được lưu khi bắt đầu session trong `startResultEntrySession()`
- So sánh `resultValue` sau khi đã strip HTML tags để chính xác
- `protocolCode` được gửi cùng với `resultValue` và `resultUnit` trong API update
