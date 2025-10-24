# End Session Confirmation Dialog Feature

## Tổng quan

Tạo dialog xác nhận khi kết thúc phiên nhập kết quả, hiển thị danh sách các thay đổi đang chờ với 3 tùy chọn: Đóng, Hủy cập nhật, và Xác nhận cập nhật.

## Vấn đề cần giải quyết

### Trước đây:

- Click "Kết thúc nhập" → Gửi API ngay lập tức
- Không có cơ hội xem lại danh sách thay đổi
- Không có tùy chọn hủy bỏ hoặc đóng để tiếp tục

### Bây giờ:

- Click "Kết thúc nhập" → Show dialog với danh sách thay đổi
- User có thể xem lại tất cả thay đổi trước khi commit
- 3 tùy chọn: **Đóng** (tiếp tục session), **Hủy cập nhật** (discard changes), **Xác nhận cập nhật** (commit changes)

## Implementation

### 1. New States

```javascript
const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
// Dialog for confirming end session

const [showCancelConfirm, setShowCancelConfirm] = useState(false);
// Dialog for confirming cancel changes
```

### 2. Updated `handleResultEntryToggle`

```javascript
const handleResultEntryToggle = async () => {
	if (isResultEntrySession) {
		// End session - show confirmation dialog with pending changes
		setShowEndSessionDialog(true); // 🆕 Show dialog instead of direct API call
	} else {
		// Start session - check authentication first
		await startResultEntrySession();
	}
};
```

### 3. New Function: `handleCancelAllChanges`

```javascript
const handleCancelAllChanges = () => {
	// Clear all pending changes
	setPendingChanges(new Map());

	// End session
	setIsResultEntrySession(false);

	// Close dialogs
	setShowEndSessionDialog(false);
	setShowCancelConfirm(false);

	toast.info('Đã hủy tất cả thay đổi');
};
```

### 4. End Session Dialog Component

```jsx
{
	/* End Session Confirmation Dialog - Show pending changes */
}
{
	showEndSessionDialog && (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl p-6 w-[600px] max-h-[80vh] flex flex-col">
				{/* Header */}
				<h2 className="text-xl font-bold mb-4 text-gray-800">Xác nhận cập nhật</h2>
				<p className="text-sm text-gray-600 mb-4">Bạn có {pendingChanges.size} thay đổi đang chờ cập nhật:</p>

				{/* Scrollable table of pending changes */}
				<div className="flex-1 overflow-y-auto border border-gray-300 rounded-md mb-4 max-h-[400px]">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 sticky top-0">
							<tr>
								<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Sample ID</th>
								<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Phép thử</th>
								<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Kết quả</th>
								<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b">Đơn vị</th>
							</tr>
						</thead>
						<tbody>
							{Array.from(pendingChanges.values()).map((change) => {
								const analysis = getAnalysisDataById(change.id);
								return (
									<tr key={change.id} className="border-b hover:bg-gray-50">
										<td className="px-3 py-2">{analysis?.sampleId || '--'}</td>
										<td className="px-3 py-2">{analysis?.parameterName || '--'}</td>
										<td className="px-3 py-2">
											<div dangerouslySetInnerHTML={{ __html: change.resultValue || '--' }} />
										</td>
										<td className="px-3 py-2">
											<div dangerouslySetInnerHTML={{ __html: change.resultUnit || '--' }} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Action buttons */}
				<div className="flex justify-end space-x-3">
					{/* Button 1: Đóng */}
					<button
						onClick={() => setShowEndSessionDialog(false)}
						className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
					>
						Đóng
					</button>

					{/* Button 2: Hủy cập nhật */}
					<button
						onClick={() => setShowCancelConfirm(true)}
						className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
					>
						Hủy cập nhật
					</button>

					{/* Button 3: Xác nhận cập nhật */}
					<button
						onClick={async () => {
							setShowEndSessionDialog(false);
							await endResultEntrySession();
						}}
						disabled={isSessionUpdating}
						className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{isSessionUpdating ? (
							<>
								<svg className="animate-spin h-4 w-4 text-white">{/* Spinner SVG */}</svg>
								<span>Đang xử lý...</span>
							</>
						) : (
							<span>Xác nhận cập nhật</span>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
```

### 5. Cancel Confirmation Dialog

```jsx
{
	/* Cancel Confirmation Dialog */
}
{
	showCancelConfirm && (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
			<div className="bg-white rounded-lg shadow-xl p-6 w-96">
				<h2 className="text-xl font-bold mb-4 text-red-600">Xác nhận hủy</h2>
				<p className="text-sm text-gray-700 mb-2">Bạn có chắc chắn muốn hủy tất cả {pendingChanges.size} thay đổi?</p>
				<p className="text-sm text-red-600 font-semibold mb-6">⚠️ Kết quả sẽ không được lưu!</p>
				<div className="flex justify-end space-x-3">
					<button
						onClick={() => setShowCancelConfirm(false)}
						className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
					>
						Quay lại
					</button>
					<button
						onClick={handleCancelAllChanges}
						className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
					>
						Xác nhận hủy
					</button>
				</div>
			</div>
		</div>
	);
}
```

## User Flows

### Flow 1: Xác nhận cập nhật (Commit Changes)

```
1. User đang trong session, có 5 thay đổi
   ↓
2. User click "Kết thúc nhập (5)"
   ↓
3. Dialog "Xác nhận cập nhật" xuất hiện
   ├─ Hiển thị bảng 5 thay đổi (scrollable)
   └─ 3 nút: Đóng | Hủy cập nhật | Xác nhận cập nhật
   ↓
4. User xem lại danh sách
   ↓
5. User click "Xác nhận cập nhật"
   ↓
6. Dialog đóng
   ↓
7. Button shows spinner "Đang xử lý..."
   ↓
8. API call: POST /v1/analysis/update
   ↓
9. Success: Toast "Đã cập nhật 5 kết quả thành công"
   ↓
10. Session ends, data refresh
```

### Flow 2: Hủy cập nhật (Discard Changes)

```
1. User đang trong session, có 3 thay đổi
   ↓
2. User click "Kết thúc nhập (3)"
   ↓
3. Dialog "Xác nhận cập nhật" xuất hiện
   ↓
4. User click "Hủy cập nhật"
   ↓
5. Dialog "Xác nhận hủy" xuất hiện (z-index 60)
   ├─ "Bạn có chắc chắn muốn hủy tất cả 3 thay đổi?"
   └─ "⚠️ Kết quả sẽ không được lưu!"
   ↓
6. User click "Xác nhận hủy"
   ↓
7. pendingChanges cleared (empty Map)
   ↓
8. Session ends
   ↓
9. All dialogs close
   ↓
10. Toast: "Đã hủy tất cả thay đổi"
```

### Flow 3: Đóng (Continue Session)

```
1. User đang trong session, có 2 thay đổi
   ↓
2. User click "Kết thúc nhập (2)"
   ↓
3. Dialog "Xác nhận cập nhật" xuất hiện
   ↓
4. User xem lại, nhận ra còn thiếu
   ↓
5. User click "Đóng"
   ↓
6. Dialog đóng
   ↓
7. Session vẫn tiếp tục
   ↓
8. User có thể tiếp tục edit thêm
```

### Flow 4: Cancel trong Cancel Confirmation

```
1. User click "Kết thúc nhập"
   ↓
2. Dialog "Xác nhận cập nhật" xuất hiện
   ↓
3. User click "Hủy cập nhật"
   ↓
4. Dialog "Xác nhận hủy" xuất hiện
   ↓
5. User đổi ý, click "Quay lại"
   ↓
6. Dialog "Xác nhận hủy" đóng
   ↓
7. Back to Dialog "Xác nhận cập nhật"
   ↓
8. User có thể chọn lại
```

## UI Design

### Dialog Dimensions

**Main Dialog (End Session):**

```css
width: 600px
max-height: 80vh
padding: 24px (p-6)
```

**Cancel Dialog:**

```css
width: 384px (w-96)
padding: 24px (p-6)
z-index: 60 (higher than main dialog)
```

### Table Design

```jsx
{
	/* Sticky header */
}
<thead className="bg-gray-50 sticky top-0">{/* Always visible when scrolling */}</thead>;

{
	/* Scrollable body */
}
<div className="overflow-y-auto max-h-[400px]">
	<tbody>{/* Can scroll if > 400px */}</tbody>
</div>;
```

**Features:**

- ✅ Sticky header (stays visible when scrolling)
- ✅ Max height 400px (scrollbar appears if needed)
- ✅ Hover effect on rows (`hover:bg-gray-50`)
- ✅ HTML rendering for result/unit (dangerouslySetInnerHTML)

### Button Colors

| Button                | Color           | Purpose                        |
| --------------------- | --------------- | ------------------------------ |
| **Đóng**              | Gray border     | Close dialog, continue session |
| **Hủy cập nhật**      | Red background  | Discard changes (warning)      |
| **Xác nhận cập nhật** | Blue background | Commit changes (primary)       |

### Z-index Layers

```
Base page: z-0
End Session Dialog: z-50
Cancel Confirmation Dialog: z-60 (on top of main dialog)
```

## Data Display

### Pending Changes Table

**Columns:**

1. **Sample ID**: `analysis?.sampleId`
2. **Phép thử** (Parameter): `analysis?.parameterName`
3. **Kết quả** (Result): `change.resultValue` (HTML rendered)
4. **Đơn vị** (Unit): `change.resultUnit` (HTML rendered)

**Data Source:**

```javascript
Array.from(pendingChanges.values()).map((change) => {
	const analysis = getAnalysisDataById(change.id);
	// Display analysis info + change values
});
```

**Helper Function:**

```javascript
const getAnalysisDataById = (analysisId) => {
	return data.find((item) => item.id === analysisId) || null;
};
```

### HTML Rendering

```jsx
<td className="px-3 py-2">
	<div dangerouslySetInnerHTML={{ __html: change.resultValue || '--' }} />
</td>
```

**Why dangerouslySetInnerHTML?**

- Result values may contain HTML (e.g., `<sup>2</sup>`, `<sub>3</sub>`)
- Need to display formatted text (superscript, subscript, special chars)
- Consistent with table cell rendering

## Loading State Integration

### Button Disabled During API Call

```jsx
disabled = { isSessionUpdating };
className = '... disabled:opacity-70 disabled:cursor-not-allowed';
```

### Spinner Display

```jsx
{
	isSessionUpdating ? (
		<>
			<svg className="animate-spin h-4 w-4 text-white">{/* Spinner SVG */}</svg>
			<span>Đang xử lý...</span>
		</>
	) : (
		<span>Xác nhận cập nhật</span>
	);
}
```

**When spinner shows:**

- User clicks "Xác nhận cập nhật"
- Dialog closes immediately
- Button in header shows "Đang xử lý..."
- API call in progress
- After success/error, spinner hides

## Testing

### Test Case 1: Normal Commit Flow

```javascript
// Given
pendingChanges.size = 5
isResultEntrySession = true

// When
User clicks "Kết thúc nhập (5)"

// Then
✅ showEndSessionDialog = true
✅ Dialog shows with 5 rows in table
✅ User clicks "Xác nhận cập nhật"
✅ API called, toast success
✅ Session ends, data refreshes
```

### Test Case 2: Discard Changes Flow

```javascript
// Given
pendingChanges.size = 3

// When
User clicks "Kết thúc nhập (3)"
→ User clicks "Hủy cập nhật"
→ User clicks "Xác nhận hủy"

// Then
✅ showCancelConfirm = true
✅ Both dialogs close
✅ pendingChanges cleared (size = 0)
✅ isResultEntrySession = false
✅ Toast: "Đã hủy tất cả thay đổi"
```

### Test Case 3: Continue Session

```javascript
// Given
pendingChanges.size = 2

// When
User clicks "Kết thúc nhập (2)"
→ User clicks "Đóng"

// Then
✅ showEndSessionDialog = false
✅ isResultEntrySession = true (still active)
✅ pendingChanges unchanged (still 2 items)
✅ User can continue editing
```

### Test Case 4: Cancel Confirmation Abort

```javascript
// Given
User in cancel confirmation dialog

// When
User clicks "Quay lại"

// Then
✅ showCancelConfirm = false
✅ Back to main dialog (showEndSessionDialog = true)
✅ Changes not discarded
```

### Test Case 5: Large List Scrolling

```javascript
// Given
pendingChanges.size = 20 (more than fits in 400px)

// When
Dialog opens

// Then
✅ Table has vertical scrollbar
✅ Header stays sticky at top
✅ Can scroll through all 20 rows
✅ No horizontal scroll
```

### Test Case 6: HTML Rendering in Table

```javascript
// Given
change.resultValue = "10<sup>2</sup>"
change.resultUnit = "mg/m<sup>3</sup>"

// When
Table renders

// Then
✅ Shows: 10² (superscript)
✅ Shows: mg/m³ (superscript)
✅ HTML properly rendered
```

## Edge Cases

### 1. Empty Pending Changes

```javascript
if (pendingChanges.size === 0) {
	toast.info('Không có thay đổi nào để lưu');
	setIsResultEntrySession(false);
	return;
}
```

**Handled in `endResultEntrySession`** - Dialog won't show if no changes

### 2. Analysis Not Found

```javascript
const analysis = getAnalysisDataById(change.id);
// If null, shows '--' for all fields
```

### 3. Multiple Dialog Layers

```
z-50: Main dialog
z-60: Cancel confirmation (higher priority)
Both can be visible simultaneously
```

### 4. Rapid Button Clicks

```javascript
disabled = { isSessionUpdating };
```

Button disabled during API call prevents double submission

### 5. Dialog Open During Data Refresh

```
User commits changes → Dialog closes → Data refresh
If user opens dialog again, shows fresh data
```

## Benefits

### 1. **Review Before Commit**

- ✅ User can see all pending changes before finalizing
- ✅ Catch mistakes before they're saved
- ✅ Clear visibility of what will be updated

### 2. **Flexible Options**

- ✅ **Đóng**: Continue editing (non-destructive)
- ✅ **Hủy**: Discard all changes (with confirmation)
- ✅ **Xác nhận**: Commit changes (with loading state)

### 3. **Safety with Confirmation**

- ✅ Two-step process for destructive action (Hủy)
- ✅ Clear warning message: "⚠️ Kết quả sẽ không được lưu!"
- ✅ Easy to abort cancel operation

### 4. **Better UX**

- ✅ Scrollable table for large datasets
- ✅ Sticky header for easy reference
- ✅ Loading spinner for API feedback
- ✅ Color-coded buttons (gray/red/blue)

### 5. **Organized Workflow**

- ✅ Separates review step from commit step
- ✅ Reduces accidental data loss
- ✅ Professional confirmation flow

## Files Modified

- ✅ `src/components/lab/ProcessingAnalysis.jsx`
  - Added states: `showEndSessionDialog`, `showCancelConfirm`
  - Updated `handleResultEntryToggle` to show dialog
  - Added `handleCancelAllChanges` function
  - Created End Session Dialog component
  - Created Cancel Confirmation Dialog component

## Dependencies

- `useState`: React hook for dialog visibility states
- `getAnalysisDataById`: Helper to get analysis info by ID
- `endResultEntrySession`: Existing function to commit changes
- `toast`: react-toastify for notifications
- Tailwind CSS: For styling and layout

## Conclusion

Tính năng này cải thiện workflow kết thúc phiên nhập kết quả bằng cách:

- ✅ Hiển thị **dialog xác nhận** với danh sách thay đổi
- ✅ **Bảng scrollable** cho dễ xem với nhiều thay đổi
- ✅ **3 lựa chọn rõ ràng**: Đóng, Hủy, Xác nhận
- ✅ **Confirmation dialog** cho hành động hủy (destructive)
- ✅ **Loading state** khi đang cập nhật
- ✅ **Sticky table header** để dễ theo dõi

**Example thực tế:**

```
User has 10 pending changes
↓
Click "Kết thúc nhập (10)"
↓
Dialog shows:
┌─────────────────────────────────────┐
│ Xác nhận cập nhật                   │
│                                     │
│ Bạn có 10 thay đổi đang chờ cập nhật│
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Sample │ Phép thử │ KQ │ Đơn vị │ │
│ │────────┼──────────┼────┼────────│ │ ← Sticky
│ │ S001   │ pH       │ 7.2│ --     │ │
│ │ S002   │ COD      │ 150│ mg/L   │ │
│ │ ...scroll...                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│       [Đóng] [Hủy] [Xác nhận]      │
└─────────────────────────────────────┘
```
