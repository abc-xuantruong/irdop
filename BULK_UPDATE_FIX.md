# ✅ SỬA LỖI: UI KHÔNG CẬP NHẬT SAU KHI BULK UPDATE

## 🔍 Vấn đề

Khi áp dụng bulk update trong ProcessingAnalysis, UI không hiển thị các giá trị mới đã cập nhật vào các hàng đã chọn.

## 🎯 Nguyên nhân

Component `LabBulkUpdate` thiếu callback `onUpdateTableData` để thông báo cho component cha cập nhật UI ngay lập tức.

## 🔧 Giải pháp đã áp dụng

### 1. **LabBulkUpdate.jsx** - Thêm prop và gọi callback

#### Thêm prop `onUpdateTableData`:

```javascript
const LabBulkUpdate = ({
    isOpen,
    onClose,
    selectedRows,
    selectedData,
    technicians,
    onApplyBulkChanges,
    onUpdateTableData,  // ✅ THÊM MỚI
    onStartSession,
}) => {
```

#### Gọi callback trong `handleBulkUpdate`:

```javascript
const handleBulkUpdate = () => {
    // ... prepare bulkChanges ...

    // Apply to session (pending changes)
    if (onApplyBulkChanges) {
        onApplyBulkChanges(bulkChanges);
    }

    // ✅ CẬP NHẬT UI NGAY LẬP TỨC
    if (onUpdateTableData) {
        onUpdateTableData(bulkChanges);
    }

    // Clear and close
    sessionStorage.removeItem(BULK_UPDATE_SESSION_KEY);
    setBulkEditValues({});
    onClose();
};
```

### 2. **ProcessingAnalysis.jsx** - Callback đã có sẵn

Component này đã có callback `onUpdateTableData` từ trước:

```javascript
<LabBulkUpdate
    // ... other props ...
    onUpdateTableData={(bulkChanges) => {
        // Update table display data immediately
        setData((prevData) => {
            const updatedData = prevData.map((row) => {
                const change = bulkChanges.find((c) => c.id === row.id);
                if (change) {
                    return { ...row, ...change }; // Merge changes
                }
                return row;
            });
            return updatedData;
        });

        // Close modal and clear selections
        setShowBulkEdit(false);
        setSelectedAnalysisIds(new Set());
        setSelectedRowsData(new Map());
    }}
/>
```

### 3. **ProcessingSampleV2.jsx** - Thêm callback tương thích

```javascript
<LabBulkUpdate
    // ... other props ...
    onUpdateTableData={(bulkChanges) => {
        // FilterableSample handles its own data updates
        // This callback is for compatibility
    }}
/>
```

## 📊 Luồng hoạt động

```
User clicks "Áp dụng" in LabBulkUpdate
    ↓
handleBulkUpdate() được gọi
    ↓
Prepare bulkChanges array:
[
  { id: 123, resultValue: "10", resultUnit: "mg/L" },
  { id: 124, resultValue: "20", resultUnit: "mg/L" },
  ...
]
    ↓
onApplyBulkChanges(bulkChanges)
    → Lưu vào pendingChanges Map (session)
    ↓
onUpdateTableData(bulkChanges)  ✅ MỚI
    → Cập nhật UI table ngay lập tức
    → setData() merge changes vào data hiện tại
    ↓
Modal đóng, selections cleared
    ↓
User thấy UI đã cập nhật! ✨
```

## 🧪 Cách test

1. Mở ProcessingAnalysis
2. Chọn nhiều hàng (analyses)
3. Click "Sửa hàng loạt"
4. Nhập giá trị mới (ví dụ: resultValue = "100", resultUnit = "mg/L")
5. Click "Áp dụng"
6. **Kiểm tra**: UI table phải hiển thị giá trị mới ngay lập tức
7. Các hàng đã chọn phải có màu highlight (pending changes)
8. Click "Kết thúc nhập" để lưu vào database

## ✅ Kết quả mong đợi

-   ✅ UI cập nhật ngay lập tức sau khi bulk update
-   ✅ Giá trị mới hiển thị trong table
-   ✅ Pending changes được lưu vào session
-   ✅ Modal đóng và selections cleared
-   ✅ Không cần refresh trang

## 🔄 So sánh trước/sau

### ❌ Trước khi sửa:

```
Bulk Update → onApplyBulkChanges → pendingChanges updated
                                  → UI KHÔNG thay đổi ❌
                                  → User phải refresh
```

### ✅ Sau khi sửa:

```
Bulk Update → onApplyBulkChanges → pendingChanges updated
           → onUpdateTableData   → UI cập nhật ngay ✅
                                  → User thấy kết quả
```

## 📝 Ghi chú

-   `bulkChanges` chỉ chứa các field đã thay đổi thực sự
-   Merge logic `{ ...row, ...change }` giữ nguyên các field không thay đổi
-   Session storage vẫn hoạt động bình thường
-   Không ảnh hưởng đến logic end session / save to API
