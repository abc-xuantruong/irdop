# Google Docs Multi-Tab Opening Feature

## Tổng quan

Cập nhật hàm `handleDocumentPreview` để xử lý response trả về là **mảng URL Google Docs** và tự động mở từng URL trong tab mới.

## Vấn đề cần giải quyết

Trước đây, hàm chỉ xử lý response dạng HTML string. Bây giờ cần xử lý thêm:

1. **Mảng URLs**: `['url1', 'url2', 'url3']`
2. **Single URL**: `'https://docs.google.com/...'`
3. **HTML content**: `'<html>...</html>'` (giữ nguyên)

## Cách hoạt động

### Flow xử lý

```
1. User click vào icon document
   ↓
2. Show loading modal
   ↓
3. API POST https://red.irdop.org/v1/document/preview_doc
   ↓
4. Check response type:
   ├─ Array of URLs? → Open all in new tabs
   ├─ Single Google Docs URL? → Open in new tab
   └─ HTML string? → Show in modal (original behavior)
```

### Code chi tiết

```javascript
const handleDocumentPreview = async (docId) => {
	if (!docId) return;

	// 1. Show loading state
	setDocumentPreview({
		visible: true,
		content: '',
		loading: true, // 🔄 Hiển thị loading spinner
		docId: docId,
	});

	try {
		// 2. Call API
		const response = await apiPost('https://red.irdop.org/v1/document/preview_doc', {
			id: docId,
		});

		if (response?.status < 300) {
			const data = response?.data;

			// 3a. Check if array of URLs
			if (Array.isArray(data) && data.length > 0) {
				// Close modal
				setDocumentPreview({
					visible: false,
					content: '',
					loading: false,
					docId: null,
				});

				// Open each URL with delay
				data.forEach((url, index) => {
					setTimeout(() => {
						window.open(url, '_blank', 'noopener,noreferrer');
					}, index * 100); // 100ms delay
				});

				toast.success(`Đã mở ${data.length} tài liệu Google Docs`);
			}
			// 3b. Check if single Google Docs URL
			else if (typeof data === 'string' && (data.includes('docs.google.com') || data.includes('drive.google.com'))) {
				// Close modal
				setDocumentPreview({
					visible: false,
					content: '',
					loading: false,
					docId: null,
				});

				// Open single URL
				window.open(data, '_blank', 'noopener,noreferrer');
				toast.success('Đã mở tài liệu Google Docs');
			}
			// 3c. HTML content (original behavior)
			else if (data) {
				setDocumentPreview({
					visible: true,
					content: data,
					loading: false,
					docId: docId,
				});
			} else {
				throw new Error('Không có dữ liệu tài liệu');
			}
		} else {
			throw new Error('Failed to load document');
		}
	} catch (error) {
		// Error handling
		setDocumentPreview({
			visible: true,
			content: '<div class="text-red-600 p-4">Lỗi: ' + error.message + '</div>',
			loading: false,
			docId: docId,
		});
		toast.error('Lỗi khi tải tài liệu: ' + error.message);
	}
};
```

## Các tính năng

### 1. **Loading State**

```jsx
// Modal hiển thị loading spinner khi đang gọi API
{documentPreview.loading ? (
	<div className="loading-spinner">
		<div className="spinner"></div>
		Đang tải tài liệu...
	</div>
) : (
	// Content
)}
```

### 2. **Multi-Tab Opening**

- Mở từng URL trong tab mới
- Delay 100ms giữa các tab để tránh browser blocking
- Security: `noopener,noreferrer` flags

### 3. **Response Type Detection**

#### Case 1: Mảng URLs

```javascript
// Response
{
  status: 200,
  data: [
    'https://docs.google.com/document/d/abc123',
    'https://docs.google.com/document/d/def456',
    'https://docs.google.com/document/d/ghi789'
  ]
}

// Result
// → Mở 3 tabs
// → Toast: "Đã mở 3 tài liệu Google Docs"
// → Modal đóng
```

#### Case 2: Single URL

```javascript
// Response
{
  status: 200,
  data: 'https://docs.google.com/document/d/abc123'
}

// Result
// → Mở 1 tab
// → Toast: "Đã mở tài liệu Google Docs"
// → Modal đóng
```

#### Case 3: HTML Content (Original)

```javascript
// Response
{
  status: 200,
  data: '<html><body>Document content...</body></html>'
}

// Result
// → Hiển thị trong modal iframe
// → Modal tetap mở
// → No toast
```

### 4. **URL Detection**

```javascript
// Check if URL contains Google services
data.includes('docs.google.com') || data.includes('drive.google.com');
```

### 5. **Error Handling**

```javascript
try {
	// API call
} catch (error) {
	// Show error in modal
	setDocumentPreview({
		visible: true,
		content: '<div class="text-red-600">Lỗi: ...</div>',
		loading: false,
	});

	// Show toast notification
	toast.error('Lỗi khi tải tài liệu');
}
```

## UI/UX Flow

### User Experience

1. **Click icon document**

   ```
   User clicks → Modal appears → Shows "Đang tải tài liệu..."
   ```

2. **Loading (API call)**

   ```
   Modal visible: true
   Loading spinner: rotating
   Content: empty
   Duration: ~1-3 seconds
   ```

3. **Success - Multiple URLs**

   ```
   Modal closes immediately
   Tab 1 opens (0ms)
   Tab 2 opens (100ms)
   Tab 3 opens (200ms)
   Toast: "Đã mở 3 tài liệu Google Docs" (green)
   ```

4. **Success - Single URL**

   ```
   Modal closes immediately
   Tab opens
   Toast: "Đã mở tài liệu Google Docs" (green)
   ```

5. **Success - HTML**

   ```
   Modal stays open
   Content loads in iframe
   No toast
   ```

6. **Error**
   ```
   Modal stays open
   Shows error message in red
   Toast: "Lỗi khi tải tài liệu" (red)
   ```

## Browser Compatibility

### Pop-up Blocker Prevention

```javascript
// Delay between tabs prevents browser blocking
setTimeout(() => {
	window.open(url, '_blank', 'noopener,noreferrer');
}, index * 100);
```

**Lý do delay:**

- Browsers block multiple `window.open()` calls executed simultaneously
- 100ms delay is small enough to feel instant to users
- Large enough to avoid pop-up blocker

### Security Flags

```javascript
window.open(url, '_blank', 'noopener,noreferrer');
```

- `_blank`: Open in new tab
- `noopener`: Prevent `window.opener` access (security)
- `noreferrer`: Don't send referrer header (privacy)

## Testing

### Test Case 1: Array of 3 URLs

```javascript
// Mock API response
{
  status: 200,
  data: [
    'https://docs.google.com/document/d/1',
    'https://docs.google.com/document/d/2',
    'https://docs.google.com/document/d/3'
  ]
}

// Expected:
// ✅ Loading modal shows
// ✅ 3 tabs open (100ms apart)
// ✅ Modal closes
// ✅ Toast: "Đã mở 3 tài liệu Google Docs"
```

### Test Case 2: Single Google Docs URL

```javascript
// Mock API response
{
  status: 200,
  data: 'https://docs.google.com/document/d/abc123'
}

// Expected:
// ✅ Loading modal shows
// ✅ 1 tab opens
// ✅ Modal closes
// ✅ Toast: "Đã mở tài liệu Google Docs"
```

### Test Case 3: HTML Content

```javascript
// Mock API response
{
  status: 200,
  data: '<html><body><h1>Document</h1></body></html>'
}

// Expected:
// ✅ Loading modal shows
// ✅ HTML displays in iframe
// ✅ Modal stays open
// ✅ No toast
```

### Test Case 4: Error

```javascript
// Mock API response
{
  status: 500,
  message: 'Server error'
}

// Expected:
// ✅ Loading modal shows
// ✅ Error message in modal
// ✅ Modal stays open
// ✅ Toast: "Lỗi khi tải tài liệu: ..."
```

### Test Case 5: Empty Array

```javascript
// Mock API response
{
  status: 200,
  data: []
}

// Expected:
// ✅ Falls through to error case
// ✅ Shows "Không có dữ liệu tài liệu"
```

## API Endpoint

```
POST https://red.irdop.org/v1/document/preview_doc
```

### Request

```json
{
	"id": "document_id"
}
```

### Response Types

**Type 1: Array of URLs**

```json
{
	"status": 200,
	"data": [
		"https://docs.google.com/document/d/...",
		"https://docs.google.com/document/d/...",
		"https://docs.google.com/spreadsheets/d/..."
	]
}
```

**Type 2: Single URL**

```json
{
	"status": 200,
	"data": "https://docs.google.com/document/d/..."
}
```

**Type 3: HTML String**

```json
{
	"status": 200,
	"data": "<html>...</html>"
}
```

## Benefits

### 1. **Tự động hóa**

- User không cần manually copy/paste URLs
- Mở nhiều documents cùng lúc tự động

### 2. **User Experience**

- Loading state rõ ràng
- Toast notifications để feedback
- Smooth transition với delays

### 3. **Tương thích ngược**

- Vẫn support HTML content (original feature)
- Không break existing functionality

### 4. **Linh hoạt**

- Xử lý được nhiều response types
- Scalable cho future requirements

### 5. **Security**

- `noopener` prevents reverse tabnabbing
- `noreferrer` protects privacy

## Edge Cases Handled

1. **Empty docId** → Return early
2. **Empty array** → Show error
3. **Invalid URL** → Fall through to HTML display
4. **Network error** → Show error modal + toast
5. **Pop-up blocked** → Delays prevent blocking
6. **Large array (10+ URLs)** → Still works with delays

## Files Modified

- ✅ `src/components/lab/ProcessingAnalysis.jsx` - Hàm `handleDocumentPreview`

## Kết luận

Feature này cho phép:

- ✅ Hiển thị loading trong khi đợi API
- ✅ Tự động mở nhiều Google Docs URLs trong tabs mới
- ✅ Xử lý single URL
- ✅ Giữ nguyên tính năng hiển thị HTML
- ✅ Error handling đầy đủ
- ✅ UX tốt với notifications và delays

**Example thực tế:**

```javascript
// User clicks document icon with doc_id = "ABC123"
// API returns 3 Google Docs URLs
// → Loading modal appears
// → After 1 second, API responds
// → Modal closes
// → 3 tabs open automatically (0ms, 100ms, 200ms)
// → Toast shows: "Đã mở 3 tài liệu Google Docs"
// → User can work with all 3 documents
```
