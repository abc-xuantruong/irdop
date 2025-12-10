# ✅ SỬA LỖI CUỐI CÙNG: MERGE FULL DATA TRONG BULK CHANGES

## 🔍 Vấn đề

Sau khi sửa ProcessingAnalysis.jsx để merge với originalAnalyses, vẫn thiếu dữ liệu các cột khác trong ConfirmLabResult.

## 🎯 Nguyên nhân gốc rễ

### Trong `LabBulkUpdate.jsx` - handleBulkUpdate() (dòng 287-325):

```javascript
// ❌ TRƯỚC ĐÂY:
const changeData = {
    id: analysisId,
    // Chỉ chứa các field có thay đổi
};

Object.keys(bulkEditValues).forEach((field) => {
    if (normalizedNewValue !== normalizedCurrentValue) {
        changeData[field] = newValue; // ❌ CHỈ LƯU FIELD THAY ĐỔI
    }
});

if (hasChanges) {
    bulkChanges.push(changeData); // ❌ CHỈ PUSH PARTIAL DATA
}

// Kết quả:
bulkChanges = [
    {
        id: 123,
        resultValue: "10",
        resultUnit: "mg/L",
        // ❌ THIẾU: sampleId, parameterName, matrix, deadline, etc.
    },
];
```

### Vấn đề lan truyền:

```
LabBulkUpdate.handleBulkUpdate()
    ↓
    bulkChanges = [{ id, resultValue, resultUnit }]  // ❌ PARTIAL
    ↓
onApplyBulkChanges(bulkChanges)
    ↓
ProcessingAnalysis: pendingChanges.set(id, change)  // ❌ LƯU PARTIAL
    ↓
ConfirmLabResult: analyses = pendingChanges.values()
    ↓
Merge với originalAnalyses: { ...original, ...change }
    ↓
❌ VẪN THIẾU nếu originalAnalyses không có đầy đủ!
```

## 🔧 Giải pháp

### Sửa `LabBulkUpdate.jsx` dòng 323-325:

```javascript
// ✅ SAU KHI SỬA:
if (hasChanges) {
    // ✅ MERGE với currentAnalysis để có đầy đủ thông tin
    const fullChangeData = { ...currentAnalysis, ...changeData };
    bulkChanges.push(fullChangeData);
}

// Kết quả:
bulkChanges = [
    {
        id: 123,
        sampleId: "M001", // ✅ Từ currentAnalysis
        parameterName: "pH", // ✅ Từ currentAnalysis
        matrix: "Nước", // ✅ Từ currentAnalysis
        deadline: "2025-12-10", // ✅ Từ currentAnalysis
        resultValue: "10", // ✅ Từ bulk update
        resultUnit: "mg/L", // ✅ Từ bulk update
        // ... TẤT CẢ FIELDS KHÁC
    },
];
```

## 📊 So sánh với ProcessingSampleV2

### ProcessingSampleV2 (ĐÚNG):

```javascript
<LabBulkUpdate
    selectedData={selectedAnalyses} // ✅ Full objects từ FilterableSample
    onApplyBulkChanges={(bulkChanges) => {
        // bulkChanges đã có đầy đủ thông tin
        filterableRef.current.applyBulkChanges(bulkChanges);
    }}
/>
```

FilterableSample quản lý full data nên `selectedAnalyses` luôn có đầy đủ thông tin.

### ProcessingAnalysis (ĐÃ SỬA):

```javascript
<LabBulkUpdate
    selectedData={Array.from(selectedRowsData.values())} // ✅ Full objects
    onApplyBulkChanges={(bulkChanges) => {
        // bulkChanges BÂY GIỜ đã có đầy đủ thông tin
        setPendingChanges((prev) => {
            const newChanges = new Map(prev);
            bulkChanges.forEach((change) => {
                newChanges.set(change.id, change); // ✅ LƯU FULL DATA
            });
            return newChanges;
        });
    }}
/>
```

## 🔄 Luồng hoạt động mới

```
1. User chọn analyses
   ↓
   selectedRowsData = Map<id, fullAnalysisObject>

2. User click "Sửa hàng loạt"
   ↓
   LabBulkUpdate nhận selectedData = [fullAnalysisObjects]

3. User nhập giá trị mới → bulkEditValues

4. User click "Áp dụng" → handleBulkUpdate()
   ↓
   Tạo changeData = { id, resultValue, resultUnit }
   ↓
   ✅ MERGE: fullChangeData = { ...currentAnalysis, ...changeData }
   ↓
   bulkChanges = [fullChangeData]  // ✅ CÓ ĐẦY ĐỦ THÔNG TIN
   ↓
   onApplyBulkChanges(bulkChanges)
   ↓
   pendingChanges.set(id, fullChangeData)  // ✅ LƯU FULL DATA
   ↓
   onUpdateTableData(bulkChanges)  // ✅ UI cập nhật với full data

5. User click "Kết thúc nhập"
   ↓
   ConfirmLabResult nhận analyses = pendingChanges.values()
   ↓
   ✅ ĐÃ CÓ ĐẦY ĐỦ THÔNG TIN!
   ↓
   API gen/html nhận đầy đủ data
   ↓
   ✅ THÀNH CÔNG!
```

## 📝 Tóm tắt thay đổi

### File: `LabBulkUpdate.jsx`

**Dòng 323-325:**

```javascript
// ❌ TRƯỚC:
if (hasChanges) {
    bulkChanges.push(changeData); // Chỉ có {id, resultValue, resultUnit}
}

// ✅ SAU:
if (hasChanges) {
    // Merge với currentAnalysis để có đầy đủ thông tin
    const fullChangeData = { ...currentAnalysis, ...changeData };
    bulkChanges.push(fullChangeData); // Có tất cả fields
}
```

## ✅ Kết quả

-   ✅ `bulkChanges` có đầy đủ thông tin analysis
-   ✅ `pendingChanges` lưu full data
-   ✅ `ConfirmLabResult` nhận đầy đủ thông tin
-   ✅ API `gen/html` hoạt động đúng
-   ✅ Không cần merge phức tạp ở ProcessingAnalysis

## 🧪 Test

1. Chọn nhiều analyses
2. Click "Sửa hàng loạt"
3. Nhập giá trị mới
4. Click "Áp dụng"
5. Click "Kết thúc nhập"
6. **Kiểm tra ConfirmLabResult:**
    - ✅ Hiển thị đầy đủ: sampleId, parameterName, matrix, deadline
    - ✅ Hiển thị resultValue, resultUnit mới
    - ✅ API gen/html nhận đầy đủ data
    - ✅ Generate HTML thành công

## 💡 Bài học

**Vấn đề:** Khi tạo `bulkChanges`, chỉ lưu các field thay đổi để "tiết kiệm" → Gây thiếu data khi truyền đi.

**Giải pháp:** Luôn merge với full object trước khi truyền callback → Đảm bảo đầy đủ thông tin.

**Nguyên tắc:**

> "Callback nên nhận full data, không phải partial data.
> Optimization (chỉ lưu changes) nên làm ở nơi lưu trữ cuối cùng,
> không phải ở nơi truyền dữ liệu."
