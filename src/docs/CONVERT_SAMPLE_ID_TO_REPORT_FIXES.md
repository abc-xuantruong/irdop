# Fixes for convertSampleIdToReport.js

## Ngày cập nhật: 29/10/2025

## Tóm tắt các thay đổi

Đã đồng bộ hóa hoàn toàn HTML generation và pagination logic trong `convertSampleIdToReport.js` với `Report.jsx` và `reportPreviewHelpers.js`.

## 1. Header Section - generateHeaderHTML()

### Thay đổi chính:

- **Logo URL**: Đổi từ `https://irdop.org/wp-content/uploads/2024/07/IRDOP-LOGO-2710-02-2.png` sang URL từ Bildr
- **Logo width**: Đổi từ `4.8cm` sang `4cm`
- **Font sizes**: Đồng bộ với Report.jsx
  - Tiêu đề chính: `14.4px` (không thay đổi font-size gốc 18px thành 14.4px)
  - Sub-text: `11.2px` (không thay đổi font-size gốc 14px thành 11.2px)
- **Line heights**: Khớp chính xác `17.6px`, `12px`
- **Height**: Title heights `36px` (thay vì `33px`, `30px`)
- **VLAS icon width**: `4.16cm` (thay vì `4.6cm`)
- **VLAS display logic**: Dùng `${displayVlas}` thay vì conditional `${showVlas ? '' : 'display:none;'}`

### Before:

```javascript
<img src="https://irdop.org/wp-content/uploads/2024/07/IRDOP-LOGO-2710-02-2.png"
    style="width:4.8cm;">
```

### After:

```javascript
<img src="https://documents-sea.bildr.com/.../IRDOP%20LOGO%20with%20Name...svg"
    style="width:4cm;">
```

## 2. Footer Section - generateFooterHTML()

### Thay đổi chính:

- Đơn giản hóa HTML structure
- Loại bỏ inline heights (`height: 15px`, `height: 14px`)
- Đơn giản hóa page number format: `<span>00 / 00</span>` thay vì 3 span riêng biệt
- Thêm `font-weight: 600` cho tên công ty

### Before:

```javascript
<div style="display: flex; align-items: center; height: 14px;">
	<span>00</span> <span>/</span> <span>00</span>
</div>
```

### After:

```javascript
<div style="display: flex; align-items: center;">
	<span style="margin-right: 2px;">Trang / Pages:</span>
	<span>00 / 00</span>
</div>
```

## 3. Customer Section - generateCustomerSection()

### Thay đổi chính:

- Loại bỏ `font-weight:300` từ header row
- Giữ structure đơn giản hơn
- Client name không có fallback `'--'`, hiển thị trực tiếp value

### Before:

```javascript
<div style="display: flex; justify-content: space-between; margin-bottom: 2px;font-weight:300;">
```

### After:

```javascript
<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
```

## 4. Sample Information Section - generateSampleInfoSection()

### Thay đổi chính quan trọng:

#### A. Layout widths cho các field thông thường:

- Field label: `27%` (thay vì `30%`)
- Field value: `73%` (thay vì `70%`)

#### B. Layout đặc biệt cho "Ngày tiếp nhận":

Khi field là "Ngày tiếp nhận", layout chia 4 cột:

- Label "Ngày tiếp nhận": `27%`
- Value ngày tiếp nhận: `23%`
- Label "Thời gian lưu mẫu": `30%`
- Value storage time: `19%`

```javascript
if (fieldName.includes('Ngày tiếp nhận')) {
	return `
    <div style="display: flex; margin-top: 8px;">
        <div style="width: 27%; ...">Ngày tiếp nhận / Date received:</div>
        <div style="width: 23%; ...">${fieldValue}</div>
        <div style="width: 30%; ...">Thời gian lưu mẫu / Storage time:</div>
        <div style="width: 19%; ...">Không có mẫu lưu</div>
    </div>`;
}
```

#### C. ID attribute:

- Đổi từ `id="sample-section"` (giữ nguyên - đã đúng từ đầu)
- Tiêu đề: "Thông tin mẫu thử nghiệm / Sample information:" (thay vì "Thông tin mẫu thử")

#### D. Label processing:

```javascript
let displayMainLabel = mainLabel;
if (mainLabel.includes('SX')) {
	displayMainLabel = mainLabel.replace('SX', 'sản xuất');
} else if (mainLabel.includes('HSD')) {
	displayMainLabel = mainLabel.replace('HSD', 'Hạn sử dụng');
}
```

## 5. Signature Section - generateSignatureSection()

### Thay đổi lớn:

#### Before (không match Report.jsx):

```javascript
<div style="width: 50%; text-align: center;">
    <p>Người phê duyệt / Approved by</p>
    <div style="height: 80px;"><!-- Signature space --></div>
    <p>TS. Trần Công Chiến</p>
    <p>Giám đốc / Director</p>
</div>
```

#### After (match Report.jsx):

```javascript
<div id="signature-section" style="padding: 0 8px; display: flex; flex-direction:column; margin:0;">
    <div style="padding: 0pt; flex-grow: 1; position: relative; display:flex; justify-content:space-between;height:2.7cm;">
        <div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between; max-width:fit-content;">
        </div>
        <div style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:space-between; max-width:fit-content;">
            <strong style="font-size:12px; line-height:1.2; margin:0;">KT.VIỆN TRƯỞNG<br>PHÓ VIỆN TRƯỞNG / Vice President</strong>
            <p style="font-size:12px; margin:0; line-height:1.4;">Nguyễn Bá Xuân Trường</p>
        </div>
    </div>
</div>
```

**Lưu ý**: Signature section chỉ hiển thị 1 người ký (PHÓ VIỆN TRƯỞNG), không còn "Người phê duyệt"

## 6. Measurement HTML - renderAndMeasureSections()

### Vấn đề quan trọng đã fix:

Trước đây, measurement HTML sử dụng wrapper IDs khác với IDs trong actual section HTML:

#### Before (Sai):

```javascript
<div id="customer-section">${sectionsData.customerSection}</div>
<div id="sample-info-section">${sectionsData.sampleInfoSection}</div>
```

Nhưng `sectionsData.sampleInfoSection` đã có `id="sample-section"` bên trong, gây conflict.

#### After (Đúng):

```javascript
<div id="customer-section-measure">${sectionsData.customerSection}</div>
<div id="sample-section-measure">${sectionsData.sampleInfoSection}</div>
<div id="analysis-section-measure">${sectionsData.analysisSection}</div>
<div id="notes-section-measure">${sectionsData.notesSection}</div>
<div id="signature-section-measure">${sectionsData.signatureSection}</div>
```

Và update selectors:

```javascript
return {
	customerSection: getElementDimensions('#customer-section-measure'),
	sampleInfoSection: getElementDimensions('#sample-section-measure'),
	analysisSection: getElementDimensions('#analysis-section-measure'),
	notesSection: getElementDimensions('#notes-section-measure'),
	signatureSection: getElementDimensions('#signature-section-measure'),
	// ...
};
```

## 7. Two-Page Special Layout Fix

### Vấn đề:

Layout 2 trang đặc biệt không được áp dụng vì:

1. ID không khớp (đã fix ở trên)
2. Logic tìm kiếm section không đúng

### Fix trong checkSpecialTwoPageLayout():

```javascript
// Before
const sampleInfoIndex = sections.findIndex(
	(s) => s.html.includes('id="sample-info-section"') || s.html.includes('id="sample-section"'),
);

// After
const sampleInfoIndex = sections.findIndex((s) => s.html.includes('id="sample-section"'));
```

### Điều kiện để áp dụng two-page layout:

1. **Page 2** phải chứa: `Analysis + Signature` (hoặc `Analysis + Comment + Signature`)
2. **Page 2** phải fit trong `safeContentHeight`
3. **Page 1** phải chứa: `Customer + Sample + "See next page message" + Notes`
4. **Page 1** phải fit trong `safeContentHeight`

### Message "See next page":

```javascript
const seeNextPageMessage = {
	html: `<div style="text-align: center; padding: 8px 0; margin: 0;">
        <p style="margin: 0; font-size: 12px; font-style: italic; color: #666;">
            - Xem kết quả ở trang tiếp theo / See the results on the following page -
        </p>
    </div>`,
	height: 30,
	isTable: false,
	tableInfo: null,
};
```

## 8. Footer Page Number Update Fix

### Before:

```javascript
const footer = sectionsData.footerHTML.replace(
	/<span[^>]*>00<\/span>\s*<span[^>]*>\/<\/span>\s*<span[^>]*>00<\/span>/,
	`<span>${pageStr}</span><span>/</span><span>${totalStr}</span>`,
);
```

### After (match footer format):

```javascript
const footer = sectionsData.footerHTML.replace(/<span>00 \/ 00<\/span>/, `<span>${pageStr} / ${totalStr}</span>`);
```

## Kết quả

### ✅ Đã fix:

1. ✅ Header section HTML match với Report.jsx (logo, sizes, fonts)
2. ✅ Footer section HTML match với Report.jsx (structure, page numbers)
3. ✅ Customer section HTML match với Report.jsx
4. ✅ Sample section HTML match với Report.jsx (widths, special layout cho "Ngày tiếp nhận")
5. ✅ Signature section HTML match với Report.jsx (chỉ PHÓ VIỆN TRƯỞNG)
6. ✅ Measurement IDs không conflict với section IDs
7. ✅ Two-page special layout có thể được áp dụng khi đủ điều kiện
8. ✅ Page number replacement logic match với footer format

### 📊 Logs để debug:

```
=== Section Height Measurements ===
Header: XXpx
Footer: XXpx
Customer Section: XXpx
Sample Info Section: XXpx
Analysis Section: XXpx
...
Total content height: XXpx, Safe content height: XXpx
=== Checking Two-Page Layout ===
...
✅ Two-page layout possible! (hoặc ❌ với lý do)
```

## Testing Checklist

- [ ] Test với 1 sample đơn giản (single page)
- [ ] Test với sample vừa phải (2 pages với special layout)
- [ ] Test với sample có analysis table lớn (multi-page với table splitting)
- [ ] Verify header logo và sizes
- [ ] Verify sample section layout (27%/73% và special layout cho Ngày tiếp nhận)
- [ ] Verify signature section (chỉ PHÓ VIỆN TRƯỞNG)
- [ ] Verify page numbers in footer (format: "01 / 02")
- [ ] Check logs cho two-page layout detection
- [ ] Verify "See next page" message xuất hiện đúng chỗ
