# Session Update with URL Array Response Feature

## Tổng quan

Cập nhật tính năng **Result Entry Session** để xử lý response trả về dạng **mảng URLs Google Docs**, hiển thị loading spinner trong lúc chờ API, và tự động mở từng URL trong tab mới.

## Vấn đề cần giải quyết

### Response Format

API `/v1/analysis/update` có thể trả về:

**Format 1: Standard Success**

```json
{
	"status": 200,
	"data": null
}
```

**Format 2: Array of Google Docs URLs** (NEW)

```json
{
	"status": 200,
	"data": [
		"https://docs.google.com/document/d/174BqSQ_Go_z3Z1aub9fnXg-Er6ButeVSykD6epiAsrg/edit",
		"https://docs.google.com/spreadsheets/d/abc123/edit",
		"https://docs.google.com/document/d/xyz789/edit"
	]
}
```

### Requirements

1. ✅ Hiển thị **loading spinner xoay tròn** khi đang gọi API update
2. ✅ Phát hiện response có dạng **array of URLs** không
3. ✅ Mở từng URL trong **tab mới** với delay 100ms
4. ✅ Disable nút trong lúc đang update
5. ✅ Toast thông báo số tài liệu đã mở

## Implementation

### 1. State Management

```javascript
// New state for session update loading
const [isSessionUpdating, setIsSessionUpdating] = useState(false);
```

**Location**: Thêm vào line ~640, sau `showSessionConfirm`

### 2. Updated `endResultEntrySession` Function

```javascript
const endResultEntrySession = async () => {
	if (pendingChanges.size === 0) {
		toast.info('Không có thay đổi nào để lưu');
		setIsResultEntrySession(false);
		return;
	}

	// 🔄 Show loading state
	setIsSessionUpdating(true);

	try {
		// Prepare analyses array
		const analyses = Array.from(pendingChanges.values()).map((change) => ({
			id: change.id,
			resultValue: change.resultValue,
			resultUnit: change.resultUnit,
		}));

		// Send batch update API
		const response = await apiPost('https://red.irdop.org/v1/analysis/update', {
			analyses: analyses,
		});

		if (response?.status < 300) {
			const responseData = response?.data;

			// 🔍 Check if response data is an array of URLs
			if (Array.isArray(responseData) && responseData.length > 0) {
				const isUrlArray = responseData.every(
					(item) => typeof item === 'string' && (item.includes('http://') || item.includes('https://')),
				);

				if (isUrlArray) {
					// 🌐 Open each URL in a new tab with staggered timing
					responseData.forEach((url, index) => {
						setTimeout(() => {
							window.open(url, '_blank', 'noopener,noreferrer');
						}, index * 100); // 100ms delay between each tab
					});

					toast.success(`Đã cập nhật ${analyses.length} kết quả và mở ${responseData.length} tài liệu`);
				} else {
					toast.success(`Đã cập nhật ${analyses.length} kết quả thành công`);
				}
			} else {
				toast.success(`Đã cập nhật ${analyses.length} kết quả thành công`);
			}

			// Set lastEditResultAt in localStorage
			const now = new Date().getTime();
			const lastEditAt = now + 2 * 60 * 1000; // 2 minutes
			localStorage.setItem('lastEditResultAt', lastEditAt.toString());

			// Clear pending changes
			setPendingChanges(new Map());

			// End session
			setIsResultEntrySession(false);

			// Refresh data
			fetchAnalysisData(true);
		} else {
			toast.error('Lỗi khi cập nhật kết quả');
		}
	} catch (error) {
		console.error('Error batch updating analyses:', error);
		toast.error('Lỗi khi cập nhật: ' + error.message);
	} finally {
		// ✅ Hide loading state
		setIsSessionUpdating(false);
	}
};
```

### 3. Updated Button UI with Loading Spinner

```jsx
{
	/* Result Entry Session Button */
}
<button
	onClick={handleResultEntryToggle}
	disabled={isSessionUpdating}
	className={`px-3 py-2 border-2 rounded-md text-sm font-bold transition-colors shadow-sm flex items-center gap-2 ${
		isResultEntrySession
			? 'bg-green-600 text-white border-green-600 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed'
			: 'bg-white border-purple-600 text-purple-600 hover:bg-purple-50 disabled:opacity-70 disabled:cursor-not-allowed'
	}`}
>
	{isSessionUpdating ? (
		<>
			{/* 🔄 Loading Spinner */}
			<svg
				className="animate-spin h-4 w-4 text-white"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
				<path
					className="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span>Đang xử lý...</span>
		</>
	) : isResultEntrySession ? (
		<span>Kết thúc nhập ({pendingChanges.size})</span>
	) : (
		<span>Bắt đầu nhập KQ</span>
	)}
</button>;
```

## User Flow

### Scenario 1: Standard Success (No URLs)

```
1. User clicks "Kết thúc nhập (5)"
   ↓
2. Button shows spinner: "🔄 Đang xử lý..."
   Button disabled (opacity 70%, cursor not-allowed)
   ↓
3. API POST /v1/analysis/update
   Body: {analyses: [{id, resultValue, resultUnit}, ...]}
   ↓
4. Response: {status: 200, data: null}
   ↓
5. No URLs detected
   ↓
6. Toast: "Đã cập nhật 5 kết quả thành công"
   ↓
7. Session ends, spinner hides
   ↓
8. Data refresh
```

### Scenario 2: Array of URLs Response (NEW)

```
1. User clicks "Kết thúc nhập (3)"
   ↓
2. Button shows spinner: "🔄 Đang xử lý..."
   Button disabled
   ↓
3. API POST /v1/analysis/update
   Body: {analyses: [3 items]}
   ↓
4. Response: {
     status: 200,
     data: [
       "https://docs.google.com/document/d/abc/edit",
       "https://docs.google.com/document/d/xyz/edit"
     ]
   }
   ↓
5. Detect array of URLs
   ↓
6. Open tabs:
   - Tab 1 opens immediately (0ms)
   - Tab 2 opens after 100ms
   ↓
7. Toast: "Đã cập nhật 3 kết quả và mở 2 tài liệu"
   ↓
8. Session ends, spinner hides
   ↓
9. Data refresh
   ↓
10. User sees 2 Google Docs tabs opened
```

### Scenario 3: Error During Update

```
1. User clicks "Kết thúc nhập (5)"
   ↓
2. Button shows spinner: "🔄 Đang xử lý..."
   ↓
3. API call fails (network error, 500, etc.)
   ↓
4. Catch block executes
   ↓
5. Toast: "Lỗi khi cập nhật: <error message>" (red)
   ↓
6. Spinner hides (finally block)
   ↓
7. Session still active (pendingChanges not cleared)
   ↓
8. User can retry
```

## URL Detection Logic

### Validation Steps

```javascript
// Step 1: Check if data is array
Array.isArray(responseData);

// Step 2: Check if array is not empty
responseData.length > 0;

// Step 3: Check if all elements are URL strings
responseData.every((item) => typeof item === 'string' && (item.includes('http://') || item.includes('https://')));
```

### Examples

#### ✅ Valid URL Array

```javascript
['https://docs.google.com/document/d/abc/edit', 'http://example.com/doc'];
// → Opens 2 tabs
```

#### ❌ Invalid: Not all URLs

```javascript
['https://docs.google.com/document/d/abc/edit', 'not-a-url', 123];
// → Normal success message (no tabs open)
```

#### ❌ Invalid: Empty Array

```javascript
[];
// → Normal success message
```

#### ❌ Invalid: Not Array

```javascript
'https://docs.google.com/document/d/abc/edit';
// → Normal success message
```

## UI States

### Button States

| State              | Visual                                       | Behavior                  |
| ------------------ | -------------------------------------------- | ------------------------- |
| **Not in session** | Purple border, white bg<br>"Bắt đầu nhập KQ" | Clickable → Start session |
| **In session**     | Green bg, white text<br>"Kết thúc nhập (N)"  | Clickable → End session   |
| **Updating**       | Green bg, 70% opacity<br>"🔄 Đang xử lý..."  | Disabled, not clickable   |

### Loading Spinner

```
🔄 ← Rotating spinner (Tailwind animate-spin)
Color: White
Size: 4x4 (16px)
Animation: Continuous rotation
Position: Left of "Đang xử lý..." text
```

**SVG Code:**

```jsx
<svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
	<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
	<path
		className="opacity-75"
		fill="currentColor"
		d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
	></path>
</svg>
```

## Toast Notifications

### Success Messages

**Standard (No URLs):**

```
✅ "Đã cập nhật 5 kết quả thành công"
```

**With URLs:**

```
✅ "Đã cập nhật 3 kết quả và mở 2 tài liệu"
```

**No Pending Changes:**

```
ℹ️ "Không có thay đổi nào để lưu"
```

### Error Messages

**API Error:**

```
❌ "Lỗi khi cập nhật kết quả"
```

**Network Error:**

```
❌ "Lỗi khi cập nhật: Network Error"
```

## Technical Details

### 1. Loading State Management

```javascript
// Before API call
setIsSessionUpdating(true);

try {
	// API call
} catch (error) {
	// Error handling
} finally {
	// Always reset loading state
	setIsSessionUpdating(false);
}
```

**Why `finally` block?**

- Ensures loading state is reset even if error occurs
- Prevents stuck loading spinner

### 2. Staggered Tab Opening

```javascript
responseData.forEach((url, index) => {
	setTimeout(() => {
		window.open(url, '_blank', 'noopener,noreferrer');
	}, index * 100); // 0ms, 100ms, 200ms, ...
});
```

**Why delay?**

- Prevents browser pop-up blocker
- 100ms is fast enough to feel instant
- Large enough to avoid blocking

### 3. Security Flags

```javascript
window.open(url, '_blank', 'noopener,noreferrer');
```

- `_blank`: Open in new tab
- `noopener`: Prevent reverse tabnabbing
- `noreferrer`: Privacy (don't send referrer)

### 4. Button Disabled During Update

```jsx
disabled = { isSessionUpdating };
className = '... disabled:opacity-70 disabled:cursor-not-allowed';
```

**Benefits:**

- Prevents double submission
- Visual feedback (70% opacity)
- Cursor changes to not-allowed
- onClick won't fire

## Testing

### Test Case 1: Standard Success (No URLs)

```javascript
// Given
pendingChanges.size = 5
API returns: {status: 200, data: null}

// When
User clicks "Kết thúc nhập (5)"

// Then
✅ Spinner shows immediately
✅ Button disabled
✅ API called with 5 analyses
✅ Toast: "Đã cập nhật 5 kết quả thành công"
✅ No tabs open
✅ Session ends
✅ Spinner hides
✅ Data refreshes
```

### Test Case 2: Array of 3 URLs

```javascript
// Given
pendingChanges.size = 3
API returns: {
	status: 200,
	data: [
		"https://docs.google.com/document/d/1/edit",
		"https://docs.google.com/document/d/2/edit",
		"https://docs.google.com/document/d/3/edit"
	]
}

// When
User clicks "Kết thúc nhập (3)"

// Then
✅ Spinner shows
✅ Button disabled
✅ API called
✅ 3 tabs open (0ms, 100ms, 200ms)
✅ Toast: "Đã cập nhật 3 kết quả và mở 3 tài liệu"
✅ Session ends
✅ Spinner hides
```

### Test Case 3: Empty Pending Changes

```javascript
// Given
pendingChanges.size = 0

// When
User clicks "Kết thúc nhập (0)"

// Then
✅ No spinner (early return)
✅ Toast: "Không có thay đổi nào để lưu"
✅ Session ends immediately
✅ No API call
```

### Test Case 4: API Error

```javascript
// Given
pendingChanges.size = 5
API returns: {status: 500, message: "Server error"}

// When
User clicks "Kết thúc nhập (5)"

// Then
✅ Spinner shows
✅ API called
✅ Error caught
✅ Toast: "Lỗi khi cập nhật kết quả" (red)
✅ Spinner hides (finally block)
✅ Session still active (pendingChanges not cleared)
✅ User can retry
```

### Test Case 5: Mixed Array (Not All URLs)

```javascript
// Given
API returns: {
	status: 200,
	data: ["https://docs.google.com/doc/1", "not-url", 123]
}

// When
Update completes

// Then
✅ isUrlArray = false (validation fails)
✅ Toast: "Đã cập nhật X kết quả thành công"
✅ No tabs open
✅ Normal flow
```

### Test Case 6: Single URL String (Not Array)

```javascript
// Given
API returns: {
	status: 200,
	data: "https://docs.google.com/document/d/abc/edit"
}

// When
Update completes

// Then
✅ Array.isArray(data) = false
✅ Toast: "Đã cập nhật X kết quả thành công"
✅ No tabs open
✅ Normal flow
```

## Edge Cases Handled

1. **Empty pending changes**: Early return, no API call
2. **API timeout**: Spinner shows until timeout, then error
3. **Network failure**: Catch block handles, spinner hides in finally
4. **Non-array response**: Falls through to normal success
5. **Empty array response**: Falls through to normal success
6. **Mixed array (URLs + non-URLs)**: Validation fails, normal success
7. **Pop-up blocker**: Staggered timing helps, user sees browser notification
8. **Multiple rapid clicks**: Button disabled during update
9. **Very large URL array (10+)**: Works, may trigger pop-up blocker after ~5 tabs

## Performance Considerations

### API Call

```javascript
// Single bulk API call (efficient)
POST / v1 / analysis / update;
Body: {
	analyses: [
		{ id: 1, resultValue: '...', resultUnit: '...' },
		{ id: 2, resultValue: '...', resultUnit: '...' },
		// ... all pending changes
	];
}

// Better than N individual API calls
```

### Tab Opening

```javascript
// Staggered opening prevents blocking
forEach((url, index) => {
	setTimeout(() => window.open(url), index * 100);
});

// Total time for 5 URLs: 400ms (acceptable)
// Total time for 10 URLs: 900ms (still fast)
```

### Loading State

```javascript
// Single state variable (minimal overhead)
const [isSessionUpdating, setIsSessionUpdating] = useState(false);

// Only updated 2 times per update cycle:
// 1. Before API call: true
// 2. After completion: false
```

## Benefits

### 1. **Better UX**

- ✅ Clear visual feedback (spinner)
- ✅ Button disabled prevents double submission
- ✅ Loading text "Đang xử lý..." explains what's happening

### 2. **Automatic Document Opening**

- ✅ No manual copy/paste of URLs
- ✅ All documents open immediately after update
- ✅ Ready to review/edit in Google Docs

### 3. **Flexible Response Handling**

- ✅ Works with or without URLs in response
- ✅ Backward compatible (standard success still works)
- ✅ Validates URL array properly

### 4. **Error Resilience**

- ✅ Finally block ensures spinner always hides
- ✅ Session persists on error (can retry)
- ✅ Clear error messages

## Future Enhancements

### 1. Progress Percentage

```jsx
{
	isSessionUpdating && <div className="text-xs text-gray-500">Đang xử lý: {progress}%</div>;
}
```

### 2. Cancel Button

```jsx
{
	isSessionUpdating && <button onClick={handleCancelUpdate}>Hủy bỏ</button>;
}
```

### 3. Retry on Failure

```jsx
{
	updateFailed && <button onClick={handleRetry}>Thử lại</button>;
}
```

### 4. Tab Open Confirmation

```jsx
if (responseData.length > 5) {
	const confirm = window.confirm(`Mở ${responseData.length} tabs?`);
	if (!confirm) return;
}
```

## Files Modified

- ✅ `src/components/lab/ProcessingAnalysis.jsx`
  - Added `isSessionUpdating` state (line ~640)
  - Updated `endResultEntrySession` function (line ~1809)
  - Updated Result Entry button with spinner (line ~3313)

## Dependencies

- `useState`: React hook for loading state
- `apiPost`: Existing API utility
- `toast`: react-toastify for notifications
- `window.open`: Browser API for tabs
- Tailwind CSS: `animate-spin` for spinner animation

## Conclusion

Feature này cải thiện UX của Result Entry Session bằng cách:

- ✅ Hiển thị **loading spinner xoay tròn** trong lúc chờ API
- ✅ Tự động phát hiện và mở **mảng Google Docs URLs**
- ✅ **Disable button** để tránh double submission
- ✅ **Staggered tab opening** để tránh pop-up blocker
- ✅ **Toast notifications** rõ ràng cho từng trường hợp
- ✅ **Error handling** đầy đủ với finally block

**Example thực tế:**

```
User clicks "Kết thúc nhập (3)"
↓
Button: "🔄 Đang xử lý..." (disabled, spinning)
↓
API returns: ["url1", "url2", "url3"]
↓
3 tabs open automatically (0ms, 100ms, 200ms)
↓
Toast: "Đã cập nhật 3 kết quả và mở 3 tài liệu" ✅
↓
Spinner hides, session ends, data refreshes
```
