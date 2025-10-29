# Cập nhật ProcessingAnalysis.jsx

Component `ProcessingAnalysis.jsx` cũng cần cập nhật tương tự như `FilterableSample.jsx` để hỗ trợ chỉnh sửa `protocolCode` và logic xuất PDF có điều kiện.

## Các bước cần thực hiện

### 1. Thêm state lưu trữ dữ liệu gốc

Tìm phần khai báo state (khoảng dòng 560-690) và thêm:

```javascript
// Store original analyses before editing for comparison
const [originalAnalyses, setOriginalAnalyses] = useState(new Map());
```

### 2. Cập nhật startResultEntrySession

Tìm function `startResultEntrySession` (khoảng dòng 1895) và cập nhật:

**Trước:**

```javascript
const startResultEntrySession = async () => {
	setIsResultEntrySession(true);
	toast.success('Đã bắt đầu phiên nhập kết quả');
};
```

**Sau:**

```javascript
const startResultEntrySession = async () => {
	// Store original analyses data before starting session
	const originalData = new Map();
	data.forEach((analysis) => {
		originalData.set(analysis.id, { ...analysis });
	});
	setOriginalAnalyses(originalData);

	setIsResultEntrySession(true);
	toast.success('Đã bắt đầu phiên nhập kết quả');
};
```

### 3. Cho phép chỉnh sửa protocolCode

#### a. Tìm phần handleCellClick (khoảng dòng 2205-2220)

**Cập nhật điều kiện:**

```javascript
// Trước:
if (column === 'resultValue' || column === 'resultUnit') {

// Sau:
if (column === 'resultValue' || column === 'resultUnit' || column === 'protocolCode') {
```

#### b. Tìm phần handleCellBlur/save changes (nơi lưu pendingChanges)

**Cập nhật để bao gồm protocolCode:**

```javascript
// Trước:
if (isResultEntrySession && (column === 'resultValue' || column === 'resultUnit')) {

// Sau:
if (isResultEntrySession && (column === 'resultValue' || column === 'resultUnit' || column === 'protocolCode')) {
```

**Thêm xử lý cho protocolCode:**

```javascript
if (column === 'resultValue') {
	existingChanges.resultValue = convertedValue;
} else if (column === 'resultUnit') {
	existingChanges.resultUnit = convertedValue;
} else if (column === 'protocolCode') {
	existingChanges.protocolCode = editValue; // No HTML conversion for protocolCode
}
```

**Cập nhật display:**

```javascript
setData((prevData) =>
	prevData.map((analysis) =>
		analysis.id === analysisId
			? { ...analysis, [column]: column === 'protocolCode' ? editValue : convertedValue }
			: analysis,
	),
);
```

#### c. Thêm render cell cho protocolCode

Tìm phần render bảng (phần hiển thị `protocolCode`), cập nhật từ readonly sang editable:

**Trước:**

```jsx
<td className="border border-gray-300 px-3 py-2 text-left">
	<span className="text-sm">{item.protocolCode || '--'}</span>
</td>
```

**Sau:**

```jsx
<td
	className="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-blue-50"
	onClick={(e) => {
		e.stopPropagation();
		handleCellClick(item.id, 'protocolCode', item.protocolCode);
	}}
>
	{editingCell?.analysisId === item.id && editingCell?.column === 'protocolCode' ? (
		<input
			type="text"
			value={editValue}
			onChange={(e) => setEditValue(e.target.value)}
			onBlur={handleCellBlur}
			onKeyDown={handleKeyDown}
			onClick={(e) => e.stopPropagation()}
			onMouseDown={(e) => e.stopPropagation()}
			className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
			autoFocus
		/>
	) : (
		<span className="text-sm">{item.protocolCode || '--'}</span>
	)}
</td>
```

### 4. Cập nhật API để gửi protocolCode

Tìm function `endResultEntrySession` hoặc nơi gửi API update (khoảng dòng 1900-2000):

**Trước:**

```javascript
const analyses = Array.from(pendingChanges.values()).map((change) => ({
	id: change.id,
	resultValue: change.resultValue,
	resultUnit: change.resultUnit,
}));
```

**Sau:**

```javascript
const analyses = Array.from(pendingChanges.values()).map((change) => ({
	id: change.id,
	resultValue: change.resultValue,
	resultUnit: change.resultUnit,
	protocolCode: change.protocolCode, // ⬅️ Thêm dòng này
}));
```

### 5. Truyền originalAnalyses vào ConfirmLabResult

Tìm component `<ConfirmLabResult` (khoảng dòng 4412):

**Trước:**

```jsx
<ConfirmLabResult
	isOpen={showEndSessionDialog}
	onClose={() => setShowEndSessionDialog(false)}
	onConfirm={async (experimentData) => {
		setShowEndSessionDialog(false);
		await endResultEntrySession();
	}}
	onCancel={() => setShowCancelConfirm(true)}
	analyses={Array.from(pendingChanges.values())}
	isLoading={isSessionUpdating}
/>
```

**Sau:**

```jsx
<ConfirmLabResult
	isOpen={showEndSessionDialog}
	onClose={() => setShowEndSessionDialog(false)}
	onConfirm={async (experimentData) => {
		setShowEndSessionDialog(false);
		await endResultEntrySession();
	}}
	onCancel={() => setShowCancelConfirm(true)}
	analyses={Array.from(pendingChanges.values())}
	originalAnalyses={Array.from(originalAnalyses.values())} // ⬅️ Thêm dòng này
	isLoading={isSessionUpdating}
/>
```

## Kiểm tra sau khi cập nhật

1. Mở file và kiểm tra không có lỗi syntax
2. Test các trường hợp:
   - Chỉ sửa protocolCode → Có thể chọn không xuất PDF
   - Sửa resultValue → Bắt buộc xuất PDF
   - Sửa cả protocolCode và resultValue → Bắt buộc xuất PDF
