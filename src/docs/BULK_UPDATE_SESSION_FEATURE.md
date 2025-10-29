# Bulk Update Session Feature

## Tổng quan

Tính năng này tự động bắt đầu session nhập kết quả khi mở modal "Chỉnh sửa hàng loạt" và cập nhật cả dữ liệu session lẫn hiển thị trên bảng khi xác nhận thay đổi.

## Các thay đổi đã thực hiện

### 1. LabBulkUpdate.jsx

#### Thêm props mới:

- `onStartSession`: Callback để bắt đầu session nhập kết quả
- `onUpdateTableData`: Callback để cập nhật dữ liệu hiển thị trên bảng

#### Logic mới:

```javascript
// Khi modal mở:
useEffect(() => {
	if (isOpen) {
		// Tự động bắt đầu session
		if (onStartSession) {
			onStartSession();
		}

		// Load pending changes từ session storage
		const savedChanges = sessionStorage.getItem(BULK_UPDATE_SESSION_KEY);
		if (savedChanges) {
			// ... load saved data
		}
	}
}, [isOpen, onStartSession]);
```

#### Khi xác nhận cập nhật:

```javascript
handleBulkUpdate() {
    // ... prepare bulk changes

    // 1. Cập nhật pendingChanges (session)
    if (onApplyBulkChanges) {
        onApplyBulkChanges(bulkChanges);
    }

    // 2. Cập nhật hiển thị trên bảng
    if (onUpdateTableData) {
        onUpdateTableData(bulkChanges);
    }

    // ... clear and close
}
```

### 2. ProcessingAnalysis.jsx

#### Truyền các callback vào LabBulkUpdate:

```javascript
<LabBulkUpdate
    isOpen={showBulkEdit && selectedAnalysisIds.size > 0}
    onClose={...}
    selectedRows={...}
    selectedData={...}
    technicians={technicians}

    // Callback để bắt đầu session
    onStartSession={() => {
        if (!isResultEntrySession) {
            setIsResultEntrySession(true);
            // Load saved session if available
            const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (savedSession) {
                try {
                    const savedChanges = JSON.parse(savedSession);
                    const changesMap = new Map(Object.entries(savedChanges));
                    setPendingChanges(changesMap);
                } catch (error) {
                    console.error('Error loading session:', error);
                }
            }
        }
    }}

    // Callback để cập nhật pendingChanges (session)
    onApplyBulkChanges={(bulkChanges) => {
        setPendingChanges((prev) => {
            const newChanges = new Map(prev);
            bulkChanges.forEach((change) => {
                newChanges.set(change.id, change);
            });
            return newChanges;
        });
    }}

    // Callback để cập nhật hiển thị trên bảng
    onUpdateTableData={(bulkChanges) => {
        setData((prevData) => {
            const updatedData = prevData.map((row) => {
                const change = bulkChanges.find((c) => c.id === row.id);
                if (change) {
                    return { ...row, ...change };
                }
                return row;
            });
            return updatedData;
        });

        // Close modal và clear selections
        setShowBulkEdit(false);
        setSelectedAnalysisIds(new Set());
        setSelectedRowsData(new Map());
    }}
/>
```

## Flow hoạt động

1. **Người dùng chọn nhiều analysis và click "Chỉnh sửa hàng loạt"**

   - Modal `LabBulkUpdate` mở ra
   - Tự động gọi `onStartSession()` → bắt đầu session nhập kết quả
   - Load các pending changes từ session storage (nếu có)

2. **Người dùng nhập các giá trị mới và click "Áp dụng"**

   - Prepare bulk changes cho tất cả các analysis được chọn
   - Gọi `onApplyBulkChanges(bulkChanges)` → cập nhật `pendingChanges` Map
   - Gọi `onUpdateTableData(bulkChanges)` → cập nhật `data` state để hiển thị ngay trên bảng
   - Clear session storage và đóng modal

3. **Kết thúc session**
   - Người dùng click "Kết thúc phiên nhập"
   - Tất cả `pendingChanges` (bao gồm cả bulk updates) được gửi lên server
   - Session storage được xóa

## Lợi ích

✅ **Tự động bắt đầu session**: Không cần thao tác thêm từ người dùng  
✅ **Hiển thị ngay lập tức**: Thay đổi xuất hiện trên bảng ngay sau khi áp dụng  
✅ **Đồng bộ session**: Các thay đổi được lưu trong `pendingChanges` để gửi API sau  
✅ **UX tốt hơn**: Người dùng thấy feedback ngay lập tức

## Testing

### Test case 1: Bulk update bình thường

1. Chọn nhiều analysis
2. Click "Chỉnh sửa hàng loạt"
3. Kiểm tra: Session tự động bắt đầu (indicator hiển thị)
4. Nhập giá trị mới và click "Áp dụng"
5. Kiểm tra: Giá trị hiển thị ngay trên bảng
6. Click "Kết thúc phiên nhập"
7. Kiểm tra: API được gọi và lưu thành công

### Test case 2: Bulk update với session đã có sẵn

1. Bắt đầu session, chỉnh sửa một số analysis
2. Chọn nhiều analysis khác và mở bulk update
3. Kiểm tra: Session vẫn tiếp tục (không tạo mới)
4. Áp dụng bulk changes
5. Kiểm tra: Cả pending changes cũ và mới đều được giữ lại

### Test case 3: Cancel bulk update

1. Mở bulk update
2. Nhập giá trị nhưng click "Hủy"
3. Kiểm tra: Không có thay đổi nào được áp dụng
4. Session vẫn đang chạy (không bị hủy)

## Notes

- Session storage key: `labBulkUpdate_pendingChanges` (cho modal)
- Session storage key: `processingAnalysis_pendingChanges` (cho main component)
- Bulk changes được merge vào `pendingChanges` Map, không ghi đè
- Table data (`data` state) được cập nhật ngay lập tức để người dùng thấy thay đổi
