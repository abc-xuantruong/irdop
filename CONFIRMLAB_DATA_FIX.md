# ⚠️ VẤN ĐỀ: DỮ LIỆU THIẾU THÔNG TIN TRONG CONFIRMLAB RESULT

## 🔍 Vấn đề

Khi bulk update, dữ liệu đưa vào form `ConfirmLabResult` chỉ có các field được bulk update (như `resultValue`, `resultUnit`), **mất hết các thông tin khác** như:

-   `sampleId`
-   `parameterName`
-   `matrix`
-   `deadline`
-   v.v.

## 🎯 Nguyên nhân

### Trong `ProcessingAnalysis.jsx` (dòng 4575):

```javascript
<ConfirmLabResult
    analyses={Array.from(pendingChanges.values())} // ❌ CHỈ CÓ PARTIAL DATA
    originalAnalyses={Array.from(originalAnalyses.values())}
/>
```

### Cấu trúc `pendingChanges`:

Khi bulk update, `pendingChanges` Map chỉ chứa:

```javascript
{
  id: 123,
  resultValue: "10",
  resultUnit: "mg/L",
  // ❌ THIẾU: sampleId, parameterName, matrix, deadline, etc.
}
```

### Tại sao thiếu?

Trong `onApplyBulkChanges` callback (ProcessingAnalysis.jsx):

```javascript
onApplyBulkChanges={(bulkChanges) => {
    setPendingChanges((prev) => {
        const newChanges = new Map(prev);
        bulkChanges.forEach((change) => {
            newChanges.set(change.id, change);  // ❌ CHỈ LƯU PARTIAL DATA
        });
        return newChanges;
    });
}}
```

`bulkChanges` từ `LabBulkUpdate` chỉ chứa các field đã thay đổi:

```javascript
// LabBulkUpdate.jsx - handleBulkUpdate()
const changeData = {
    id: analysisId,
    // Chỉ chứa các field có thay đổi
};

Object.keys(bulkEditValues).forEach((field) => {
    const newValue = bulkEditValues[field];
    if (normalizedNewValue !== normalizedCurrentValue) {
        changeData[field] = newValue; // ✅ CHỈ LƯU FIELD THAY ĐỔI
    }
});
```

## 🔧 Giải pháp

### **Giải pháp 1: Merge với originalAnalyses khi truyền vào ConfirmLabResult** ✅ ĐÃ ÁP DỤNG

```javascript
<ConfirmLabResult
    analyses={Array.from(pendingChanges.values()).map((change) => {
        // ✅ MERGE với original data để có đầy đủ thông tin
        const original = originalAnalyses.get(change.id) || {};
        return { ...original, ...change };
    })}
    originalAnalyses={Array.from(originalAnalyses.values())}
/>
```

**Ưu điểm:**

-   ✅ Đơn giản, chỉ sửa 1 chỗ
-   ✅ Không ảnh hưởng logic khác
-   ✅ `pendingChanges` vẫn chỉ chứa changes (tiết kiệm memory)

**Nhược điểm:**

-   ⚠️ Phải merge mỗi lần render ConfirmLabResult

---

### **Giải pháp 2: Lưu full data vào pendingChanges** (Không khuyến nghị)

```javascript
onApplyBulkChanges={(bulkChanges) => {
    setPendingChanges((prev) => {
        const newChanges = new Map(prev);
        bulkChanges.forEach((change) => {
            // ✅ Merge với data hiện tại để có đầy đủ thông tin
            const currentRow = data.find(row => row.id === change.id);
            const fullData = { ...currentRow, ...change };
            newChanges.set(change.id, fullData);
        });
        return newChanges;
    });
}}
```

**Ưu điểm:**

-   ✅ `pendingChanges` có đầy đủ thông tin
-   ✅ Không cần merge khi truyền vào ConfirmLabResult

**Nhược điểm:**

-   ❌ Tốn memory (lưu toàn bộ analysis object)
-   ❌ Phải đồng bộ với `data` state
-   ❌ Phức tạp hơn

---

## ✅ Giải pháp đã áp dụng

Đã sửa file `ProcessingAnalysis.jsx` dòng 4575:

```javascript
// ❌ TRƯỚC ĐÂY:
analyses={Array.from(pendingChanges.values())}

// ✅ SAU KHI SỬA:
analyses={Array.from(pendingChanges.values()).map((change) => {
    // Merge pending changes with original analysis data
    const original = originalAnalyses.get(change.id) || {};
    return { ...original, ...change };
})}
```

## 🧪 Cách test

1. Chọn nhiều analyses
2. Click "Sửa hàng loạt"
3. Nhập giá trị mới (ví dụ: resultValue = "100")
4. Click "Áp dụng"
5. Click "Kết thúc nhập"
6. **Kiểm tra form ConfirmLabResult:**
    - ✅ Phải hiển thị đầy đủ: sampleId, parameterName, matrix, deadline
    - ✅ Phải hiển thị resultValue, resultUnit mới
    - ✅ API `gen/html` phải nhận đầy đủ thông tin

## 📊 So sánh trước/sau

### ❌ Trước khi sửa:

```javascript
// analyses truyền vào ConfirmLabResult
[
    {
        id: 123,
        resultValue: "10",
        resultUnit: "mg/L",
        // ❌ THIẾU: sampleId, parameterName, matrix, etc.
    },
];

// API gen/html nhận được:
{
    analyses: [
        {
            id: 123,
            resultValue: "10",
            resultUnit: "mg/L",
            // ❌ THIẾU thông tin → API lỗi hoặc generate sai
        },
    ];
}
```

### ✅ Sau khi sửa:

```javascript
// analyses truyền vào ConfirmLabResult
[
    {
        id: 123,
        sampleId: "M001",
        parameterName: "pH",
        matrix: "Nước",
        deadline: "2025-12-10",
        resultValue: "10", // ✅ Từ bulk update
        resultUnit: "mg/L", // ✅ Từ bulk update
        // ... tất cả fields khác
    },
];

// API gen/html nhận được đầy đủ thông tin ✅
```

## 📝 Ghi chú

-   `originalAnalyses` được lưu khi start session (trong `startResultEntrySession`)
-   `pendingChanges` chỉ chứa changes để tiết kiệm memory
-   Merge xảy ra khi render ConfirmLabResult (không ảnh hưởng performance)
-   Logic này cũng áp dụng cho inline edit (không chỉ bulk update)

## 🔄 Luồng hoạt động đầy đủ

```
1. User chọn analyses → selectedAnalysisIds, selectedRowsData

2. User click "Sửa hàng loạt" → LabBulkUpdate mở

3. User nhập giá trị mới → bulkEditValues

4. User click "Áp dụng" → handleBulkUpdate()
   ↓
   bulkChanges = [{ id, resultValue, resultUnit, ... }]
   ↓
   onApplyBulkChanges(bulkChanges)
   ↓
   pendingChanges.set(id, change)  // Chỉ lưu changes
   ↓
   onUpdateTableData(bulkChanges)
   ↓
   UI table cập nhật ngay lập tức

5. User click "Kết thúc nhập" → ConfirmLabResult mở
   ↓
   analyses = pendingChanges.map(change => {
       return { ...originalAnalyses.get(change.id), ...change }
   })
   ↓
   ✅ Có đầy đủ thông tin!
   ↓
   API gen/html nhận đầy đủ data
   ↓
   Generate HTML thành công ✅
```

## ⚠️ Lưu ý quan trọng

1. **`originalAnalyses` phải được lưu khi start session**

    - Nếu không có `originalAnalyses`, merge sẽ thất bại
    - Kiểm tra `startResultEntrySession()` có lưu đúng không

2. **Inline edit cũng cần merge tương tự**

    - Nếu user edit từng cell, `pendingChanges` cũng chỉ có partial data
    - Cần áp dụng logic merge tương tự

3. **Session storage**
    - Nếu reload trang, `originalAnalyses` sẽ mất
    - Cần lưu vào sessionStorage nếu muốn persist
