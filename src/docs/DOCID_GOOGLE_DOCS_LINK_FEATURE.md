# DocId Google Docs Link Feature

## Tổng quan

Tính năng cho phép user click vào **docId** trong cột Doc để tự động mở tài liệu Google Docs tương ứng trong tab mới.

## Vấn đề cần giải quyết

### Trước đây:

- Cột `doc_id` hiển thị icon file (MdAttachFile)
- Click vào icon gọi `handleFileAction` để xem/download file thông qua fileId
- Phù hợp cho local files, không phù hợp cho Google Docs

### Bây giờ:

- Cột `doc_id` hiển thị **giá trị docId** (clickable text)
- Click vào docId gọi API mới để lấy Google Docs URL
- Tự động mở Google Docs trong tab mới

## API Endpoint

### Request

```
POST https://red.irdop.org/v1/option/get/url
```

**Body:**

```json
{
	"urlType": "googleDoc",
	"urlId": "<docId>"
}
```

### Response

```json
{
	"status": 200,
	"data": "https://docs.google.com/document/d/abc123xyz..."
}
```

## Implementation Details

### 1. Hàm xử lý click vào docId

```javascript
// Handle click on docId to open Google Docs
const handleDocIdClick = async (docId) => {
	if (!docId) return;

	try {
		// Call API to get Google Docs URL
		const response = await apiPost('https://red.irdop.org/v1/option/get/url', {
			urlType: 'googleDoc',
			urlId: docId,
		});

		if (response?.status < 300 && response?.data) {
			// Open the URL in a new tab
			window.open(response.data, '_blank', 'noopener,noreferrer');
			toast.success('Đã mở tài liệu Google Docs');
		} else {
			throw new Error('Không thể lấy URL tài liệu');
		}
	} catch (error) {
		toast.error('Lỗi khi mở tài liệu: ' + error.message);
	}
};
```

### 2. UI Render - Cột doc_id

**Trước đây (icon):**

```jsx
) : column === 'doc_id' ? (
	row.doc_id ? (
		<div onClick={(e) => {
			e.stopPropagation();
			handleFileAction({ docId: row.doc_id }, 'view');
		}}>
			<MdAttachFile className="w-5 h-5 text-blue-600" />
		</div>
	) : (
		<span className="text-gray-300">--</span>
	)
) :
```

**Bây giờ (clickable text):**

```jsx
) : column === 'doc_id' ? (
	row.doc_id ? (
		<div
			className="flex items-center justify-center cursor-pointer hover:bg-blue-50 p-1 rounded"
			onClick={(e) => {
				e.stopPropagation();
				handleDocIdClick(row.doc_id);
			}}
			title="Mở tài liệu Google Docs"
		>
			<span className="text-blue-600 font-medium hover:underline">
				{row.doc_id}
			</span>
		</div>
	) : (
		<div className="flex items-center justify-center p-1">
			<span className="text-gray-300">--</span>
		</div>
	)
) :
```

## User Flow

### Kịch bản thành công:

```
1. User nhìn thấy bảng ProcessingAnalysis
   ↓
2. Trong cột "Doc", có giá trị docId hiển thị (VD: "DOC-2024-001")
   ↓
3. User click vào docId (text màu xanh, có gạch chân khi hover)
   ↓
4. System gọi API:
   POST /v1/option/get/url
   Body: {urlType: 'googleDoc', urlId: 'DOC-2024-001'}
   ↓
5. API trả về URL: "https://docs.google.com/document/d/..."
   ↓
6. System mở URL trong tab mới
   ↓
7. Toast notification: "Đã mở tài liệu Google Docs" (green)
   ↓
8. User làm việc với Google Docs trong tab mới
```

### Kịch bản lỗi:

```
1. User click vào docId
   ↓
2. API call fails (network error, invalid docId, etc.)
   ↓
3. Toast notification: "Lỗi khi mở tài liệu: <error message>" (red)
   ↓
4. Tab mới không mở
   ↓
5. User ở lại trang ProcessingAnalysis
```

## UI/UX Changes

### Visual Design

#### Có docId:

```
┌─────────────────────┐
│   DOC-2024-001      │  ← Text màu xanh (#2563eb)
│   (hover: underline)│  ← Hover: gạch chân + background xanh nhạt
│   (cursor: pointer) │  ← Con trỏ thành bàn tay
└─────────────────────┘
```

#### Không có docId:

```
┌─────────────────────┐
│        --           │  ← Text màu xám nhạt
│   (no interaction)  │  ← Không thể click
└─────────────────────┘
```

### Interaction States

1. **Default**: Text màu xanh, font-medium
2. **Hover**: Background xanh nhạt (`hover:bg-blue-50`), text có gạch chân (`hover:underline`)
3. **Click**: Call API ngay lập tức
4. **Loading**: (hiện tại không có spinner, có thể thêm sau)
5. **Success**: Toast green, tab mới mở
6. **Error**: Toast red, không có tab mới

## Technical Features

### 1. Event Handling

```javascript
onClick={(e) => {
	e.stopPropagation(); // Prevent row selection
	handleDocIdClick(row.doc_id);
}}
```

- `e.stopPropagation()`: Ngăn event bubble lên row (tránh select row khi click)

### 2. Security

```javascript
window.open(response.data, '_blank', 'noopener,noreferrer');
```

- `_blank`: Mở tab mới
- `noopener`: Ngăn tab mới truy cập `window.opener` (bảo mật)
- `noreferrer`: Không gửi referrer header (privacy)

### 3. Error Handling

```javascript
try {
	const response = await apiPost(...);
	if (response?.status < 300 && response?.data) {
		// Success path
	} else {
		throw new Error('Không thể lấy URL tài liệu');
	}
} catch (error) {
	toast.error('Lỗi khi mở tài liệu: ' + error.message);
}
```

### 4. Empty State

```javascript
if (!docId) return; // Early return if no docId
```

## Comparison: Old vs New

| Aspect       | Old (handleFileAction)                                | New (handleDocIdClick) |
| ------------ | ----------------------------------------------------- | ---------------------- |
| **UI**       | Icon (MdAttachFile)                                   | Text (docId value)     |
| **API**      | `/v1/document/get_doc` → `/v1/file/get/download_link` | `/v1/option/get/url`   |
| **Purpose**  | Download/preview local file                           | Open Google Docs URL   |
| **Steps**    | 2 API calls (get doc → get link)                      | 1 API call (get URL)   |
| **Mode**     | View or Download                                      | View only (in browser) |
| **Response** | Download link/blob                                    | Google Docs URL        |
| **Action**   | Preview modal or download                             | Open in new tab        |

## Benefits

### 1. **Đơn giản hơn**

- Chỉ 1 API call thay vì 2
- Không cần xử lý blob/download
- Google Docs handle tất cả viewing logic

### 2. **Trực quan hơn**

- Hiển thị giá trị docId thật sự (thay vì chỉ icon)
- User biết chính xác document nào sẽ mở
- Hover effects rõ ràng (underline + background)

### 3. **Tích hợp tốt với Google Workspace**

- Mở trực tiếp Google Docs/Sheets/Slides
- User có full Google Docs features (comments, editing, version history)
- Không cần download/upload

### 4. **Performance**

- Không tải file về local
- Google Docs load trong tab riêng (không block UI)
- Caching và CDN của Google

## Testing

### Test Case 1: Valid docId

```javascript
// Given
row.doc_id = "DOC-2024-001"

// When
User clicks on docId

// Then
✅ API called: POST /v1/option/get/url {urlType: 'googleDoc', urlId: 'DOC-2024-001'}
✅ API returns: {status: 200, data: "https://docs.google.com/..."}
✅ New tab opens with Google Docs URL
✅ Toast shows: "Đã mở tài liệu Google Docs"
```

### Test Case 2: Empty docId

```javascript
// Given
row.doc_id = null or undefined or ""

// When
Cell renders

// Then
✅ Shows "--" in gray color
✅ No click handler attached
✅ No cursor pointer
```

### Test Case 3: API Error

```javascript
// Given
row.doc_id = "DOC-INVALID"
API returns error (404, 500, etc.)

// When
User clicks on docId

// Then
✅ API call fails
✅ Catch block executes
✅ Toast shows: "Lỗi khi mở tài liệu: <error message>"
✅ No tab opens
```

### Test Case 4: Network Error

```javascript
// Given
row.doc_id = "DOC-2024-001"
Network disconnected

// When
User clicks on docId

// Then
✅ API request fails
✅ Catch block executes
✅ Toast shows: "Lỗi khi mở tài liệu: Network Error"
✅ No tab opens
```

### Test Case 5: Invalid Response

```javascript
// Given
row.doc_id = "DOC-2024-001"
API returns: {status: 200, data: null}

// When
User clicks on docId

// Then
✅ Response check fails (no data)
✅ Throws error: "Không thể lấy URL tài liệu"
✅ Toast shows error message
✅ No tab opens
```

## Edge Cases Handled

1. **No docId**: Early return, no API call
2. **Empty string docId**: Early return
3. **API timeout**: Catch block handles
4. **Invalid URL in response**: Browser handles (won't open invalid URL)
5. **Pop-up blocker**: User sees browser notification to allow pop-ups
6. **Multiple clicks**: Each click makes new API call (idempotent)

## Integration with Existing Code

### handleFileAction (still exists)

```javascript
// Used for actual file downloads/previews (if needed elsewhere)
const handleFileAction = async (docRecord, mode) => {
	// ...existing code for file handling
};
```

### handleDocIdClick (new)

```javascript
// Used specifically for Google Docs URL retrieval
const handleDocIdClick = async (docId) => {
	// ...new code for Google Docs
};
```

**No conflicts**: The two functions serve different purposes and can coexist.

## Future Enhancements

### 1. Loading State

```jsx
const [loadingDocId, setLoadingDocId] = useState(null);

// In handleDocIdClick
setLoadingDocId(docId);
try {
	// API call
} finally {
	setLoadingDocId(null);
}

// In render
{loadingDocId === row.doc_id ? (
	<div className="flex items-center justify-center">
		<div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent" />
	</div>
) : (
	// Normal render
)}
```

### 2. Tooltip with Preview

```jsx
<Tooltip content={`Open Google Doc: ${row.doc_id}`}>
	<span className="text-blue-600 font-medium hover:underline">{row.doc_id}</span>
</Tooltip>
```

### 3. Right-click Context Menu

```jsx
onContextMenu={(e) => {
	e.preventDefault();
	showContextMenu(e, [
		{label: 'Open in new tab', action: () => handleDocIdClick(row.doc_id)},
		{label: 'Copy docId', action: () => copyToClipboard(row.doc_id)},
	]);
}}
```

### 4. Copy docId to Clipboard

```jsx
<div className="flex items-center space-x-2">
	<span onClick={() => handleDocIdClick(row.doc_id)}>{row.doc_id}</span>
	<button onClick={() => copyToClipboard(row.doc_id)}>
		<MdContentCopy />
	</button>
</div>
```

## Files Modified

- ✅ `src/components/lab/ProcessingAnalysis.jsx`
  - Added `handleDocIdClick` function (line ~3145)
  - Updated `doc_id` column render logic (line ~3590)

## Dependencies

- `apiPost`: Existing API utility function
- `toast`: react-toastify for notifications
- `window.open`: Browser API for opening new tabs

## Conclusion

Feature này:

- ✅ Thay thế icon file bằng text docId
- ✅ Gọi API mới để lấy Google Docs URL
- ✅ Tự động mở Google Docs trong tab mới
- ✅ Có error handling đầy đủ
- ✅ UI/UX rõ ràng với hover effects
- ✅ Security với noopener/noreferrer flags
- ✅ Toast notifications cho user feedback

**Example thực tế:**

```
User sees: DOC-2024-001 (blue, underlined on hover)
User clicks → API call → Google Docs opens in new tab
Toast: "Đã mở tài liệu Google Docs" ✅
```
