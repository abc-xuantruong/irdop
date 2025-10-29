# Thêm chức năng Preview Document cho ProcessingSample và ProcessingAnalysis

## Mô tả
Khi có `doc_id`, click vào icon document ở cột Doc sẽ gửi API request đến `https://red.irdop.org/v1/document/preview_doc` với body `{id}`. Dữ liệu trả về là HTML string và sẽ được hiển thị trong một popup modal.

## Thay đổi cho ProcessingSample.jsx

### 1. Thêm state cho document preview
```jsx
// Document preview states
const [documentPreview, setDocumentPreview] = useState({
    visible: false,
    content: '',
    loading: false,
    docId: null,
});
```

### 2. Thêm CSS styles cho modal
- Modal overlay với backdrop
- Modal content với header và body
- Loading spinner animation
- Responsive design (95vw x 95vh, max 1200x800px)
- Close button với hover effects

### 3. Thêm functions để handle document preview
```jsx
const handleDocumentPreview = async (docId) => {
    // Call API và hiển thị trong modal
};

const closeDocumentPreview = () => {
    // Đóng modal
};
```

### 4. Cập nhật icon document để có thể click
```jsx
<button
    onClick={() => handleDocumentPreview(item.doc_id)}
    className="cursor-pointer transition-all duration-200 hover:scale-110"
    title={`Xem tài liệu: ${item.doc_id}`}
>
    {/* SVG icon */}
</button>
```

### 5. Thêm modal component vào render
```jsx
{documentPreview.visible && (
    <div className="document-preview-modal">
        <div className="document-preview-content">
            <div className="document-preview-header">
                <h3>Xem tài liệu {documentPreview.docId}</h3>
                <button onClick={closeDocumentPreview}>✕ Đóng</button>
            </div>
            <div className="document-preview-body">
                {documentPreview.loading ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        Đang tải tài liệu...
                    </div>
                ) : (
                    <iframe
                        className="document-preview-iframe"
                        srcDoc={documentPreview.content}
                        title="Document Preview"
                        sandbox="allow-same-origin allow-scripts"
                    />
                )}
            </div>
        </div>
    </div>
)}
```

## Thay đổi cho ProcessingAnalysis.jsx

### 1. Thêm state tương tự ProcessingSample
```jsx
// Document preview states
const [documentPreview, setDocumentPreview] = useState({
    visible: false,
    content: '',
    loading: false,
    docId: null,
});
```

### 2. Thêm CSS styles cho modal
- Tạo biến `documentPreviewStyles` riêng biệt
- Inject styles vào document head khi component mount

### 3. Thêm functions để handle document preview
```jsx
const handleDocumentPreview = async (docId) => {
    // Tương tự ProcessingSample
};

const closeDocumentPreview = () => {
    // Tương tự ProcessingSample
};
```

### 4. Cập nhật function `openDocument` 
```jsx
const openDocument = async (docId) => {
    if (docId && docId.includes('edit')) {
        // Mở editor trong tab mới (giữ nguyên)
        const editorUrl = `../EditorTemplate.html?docId=${docId}`;
        window.open(editorUrl, '_blank');
    } else if (docId) {
        // Sử dụng modal preview cho tất cả document types
        handleDocumentPreview(docId);
    }
};
```

### 5. Inject CSS styles vào head
```jsx
useEffect(() => {
    // Inject custom scrollbar styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = customScrollbarStyle;
    document.head.appendChild(styleSheet);

    // Inject document preview modal styles
    const documentStyleSheet = document.createElement('style');
    documentStyleSheet.textContent = documentPreviewStyles;
    document.head.appendChild(documentStyleSheet);

    return () => {
        // Cleanup
        if (document.head.contains(styleSheet)) {
            document.head.removeChild(styleSheet);
        }
        if (document.head.contains(documentStyleSheet)) {
            document.head.removeChild(documentStyleSheet);
        }
    };
}, []);
```

### 6. Thêm modal component vào render (tương tự ProcessingSample)

## API Integration

### Endpoint
```
POST https://red.irdop.org/v1/document/preview_doc
```

### Request Body
```json
{
    "id": "document_id"
}
```

### Response
- **Success**: HTML string content
- **Error**: Error message

## Features

### ✅ Hoàn thành
- 🔸 Modal popup hiển thị document HTML
- 🔸 Loading spinner khi đang tải
- 🔸 Error handling và notification
- 🔸 Responsive design
- 🔸 Click outside để đóng modal
- 🔸 Escape key để đóng modal  
- 🔸 Hover effects cho icon document
- 🔸 Security: iframe với sandbox restrictions
- 🔸 Cleanup CSS styles khi component unmount

### 🎨 UI/UX Improvements
- 🔸 Icon document có hover animation (scale + color change)
- 🔸 Modal với blur backdrop
- 🔸 Gradient header
- 🔸 Loading spinner với animation
- 🔸 Tooltip hiển thị doc_id khi hover

### 🔒 Security
- 🔸 iframe với `sandbox="allow-same-origin allow-scripts"`
- 🔸 Prevent XSS với controlled iframe content
- 🔸 Click outside to close modal

## Test
- Server đang chạy tại: http://localhost:5174/
- Test với documents có `doc_id` trong cả ProcessingSample và ProcessingAnalysis
- Kiểm tra API call đến `https://red.irdop.org/v1/document/preview_doc`
- Verify HTML content hiển thị đúng trong iframe
