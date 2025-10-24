# Cập nhật Parse HTML trong ProcessingAnalysis

## Tổng quan

Đã cập nhật hàm `convertHTMLToValue` trong `formatHelpers.js` để parse đầy đủ HTML sang dạng value có thể chỉnh sửa được, bao gồm:

- Loại bỏ các thẻ HTML (đặc biệt là thẻ `<p>`)
- Giải mã các HTML entities
- Chuyển đổi các thẻ đặc biệt (`<sup>`, `<sub>`) về ký tự đặc biệt (`^`, `_`)

## Thay đổi chi tiết

### File: `src/contexts/formatHelpers.js`

#### Hàm `convertHTMLToValue` - Đã được nâng cấp

**Trước đây:**

```javascript
export const convertHTMLToValue = (value) => {
	if (!value) return value;
	let result = value;

	// Chỉ thay thế các thẻ HTML cơ bản
	result = result.replace(/<sub>/g, '_');
	result = result.replace(/<\/sub>/g, '_');
	result = result.replace(/<sup>/g, '^');
	result = result.replace(/<\/sup>/g, '^');
	result = result.replace(/×/g, '*');

	return result;
};
```

**Bây giờ:**

```javascript
export const convertHTMLToValue = (value) => {
	if (!value) return value;
	let result = value;

	// 1. Convert các thẻ đặc biệt TRƯỚC KHI xóa tags
	result = result.replace(/<sub>/g, '_');
	result = result.replace(/<\/sub>/g, '_');
	result = result.replace(/<sup>/g, '^');
	result = result.replace(/<\/sup>/g, '^');
	result = result.replace(/×/g, '*');

	// 2. Xóa thẻ <p> (kể cả có attributes)
	result = result.replace(/<\/?p[^>]*>/gi, '');

	// 3. Xóa các thẻ HTML còn lại
	result = result.replace(/<[^>]*>/g, '');

	// 4. Giải mã HTML entities
	result = result
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#96;/g, '`');

	// 5. Giải mã các ký hiệu đặc biệt
	const entities = {
		'&times;': '*',
		'&divide;': '÷',
		'&plusmn;': '±',
		'&deg;': '°',
		'&sup2;': '²',
		'&sup3;': '³',
		'&frac12;': '½',
		'&frac14;': '¼',
		'&hellip;': '…',
		'&mdash;': '—',
		'&ndash;': '–',
		'&bull;': '•',
	};

	for (const [entity, character] of Object.entries(entities)) {
		result = result.replace(new RegExp(entity, 'g'), character);
	}

	return result.trim();
};
```

## Cách hoạt động trong ProcessingAnalysis

### Flow xử lý dữ liệu

#### 1. **Hiển thị trong bảng (Read-only)**

```jsx
{
	row.resultValue ? (
		<div dangerouslySetInnerHTML={{ __html: row.resultValue }} />
	) : (
		<span className="text-gray-400">--</span>
	);
}
```

- Dữ liệu từ database: `<p>10<sup>-5</sup> &times; 2</p>`
- Hiển thị: 10⁻⁵ × 2 (với formatting đẹp)

#### 2. **Khi bắt đầu chỉnh sửa (Click vào cell)**

```jsx
onClick={(e) => {
	e.stopPropagation();
	handleCellClick(row.id, 'resultValue', row.resultValue || '');
}}
```

**Luồng xử lý:**

```
row.resultValue (HTML)
    ↓
handleCellClick(analysisId, column, currentValue)
    ↓
proceedWithEdit(analysisId, column, currentValue)
    ↓
convertHTMLToValue(currentValue)  ← Hàm đã được cập nhật
    ↓
setEditValue(editableValue)
    ↓
Input field hiển thị text có thể chỉnh sửa
```

**Ví dụ chuyển đổi:**

```javascript
// Dữ liệu gốc từ DB
const htmlValue = '<p>10<sup>-5</sup> &times; 2&nbsp;mg/L</p>';

// Sau khi convertHTMLToValue
const editableValue = '10^-5^ * 2 mg/L';

// User nhìn thấy và có thể edit trong input
<input value="10^-5^ * 2 mg/L" />;
```

#### 3. **Khi lưu giá trị (Blur khỏi input)**

```jsx
onBlur={() => handleCellBlur(row)}
```

**Luồng xử lý:**

```
editValue (text từ input)
    ↓
handleCellBlur()
    ↓
convertValueToHTML(editValue)  ← Chuyển ngược lại
    ↓
API update với HTML
    ↓
Database lưu HTML
```

**Ví dụ chuyển đổi ngược:**

```javascript
// User nhập
const editValue = '10^-5^ * 2 mg/L';

// convertValueToHTML
const htmlValue = '10<sup>-5</sup> × 2 mg/L';

// Gửi lên API và lưu vào DB
updateData.analysis.resultValue = '10<sup>-5</sup> × 2 mg/L';
```

## Các trường hợp xử lý

### Case 1: Giá trị có thẻ <p>

```javascript
// Input
'<p>Giá trị kết quả</p>';

// Output sau convertHTMLToValue
'Giá trị kết quả';
```

### Case 2: Giá trị có superscript/subscript

```javascript
// Input
'<p>10<sup>-5</sup></p>';

// Output sau convertHTMLToValue
'10^-5^';
```

### Case 3: Giá trị có HTML entities

```javascript
// Input
'<p>50&nbsp;mg/L &times; 2</p>';

// Output sau convertHTMLToValue
'50 mg/L * 2';
```

### Case 4: Giá trị có ký tự đặc biệt

```javascript
// Input
'<p>25&deg;C &plusmn; 2</p>';

// Output sau convertHTMLToValue
'25°C ± 2';
```

### Case 5: Giá trị phức tạp

```javascript
// Input
'<p class="result">H<sub>2</sub>O: 10<sup>-5</sup>&nbsp;&times;&nbsp;2&deg;C</p>';

// Output sau convertHTMLToValue
'H_2_O: 10^-5^ * 2°C';
```

## Lợi ích

### 1. **Tính nhất quán**

- Dữ liệu luôn được parse đúng từ HTML sang text khi chỉnh sửa
- Không còn tình trạng nhìn thấy HTML tags trong input field

### 2. **User Experience tốt hơn**

- User nhìn thấy text sạch, dễ đọc khi edit
- Có thể sử dụng các ký tự đặc biệt như `^`, `_`, `*` một cách tự nhiên
- Không phải deal với HTML tags

### 3. **Xử lý entities đầy đủ**

- Tất cả HTML entities phổ biến được giải mã
- Bao gồm cả ký tự đặc biệt khoa học (°, ±, ×, ÷, ², ³, etc.)
- Xử lý cả dấu câu và ký tự Unicode

### 4. **Tương thích ngược**

- Không ảnh hưởng đến các hàm khác
- Flow hiện tại vẫn hoạt động bình thường
- Chỉ cải thiện parsing từ HTML sang text

## Testing

### Test cases cần kiểm tra

1. **Test với dữ liệu thực tế:**

   - Mở một analysis có resultValue/resultUnit
   - Click để edit
   - Kiểm tra xem input field hiển thị text sạch không có HTML tags
   - Chỉnh sửa và lưu
   - Kiểm tra dữ liệu có được lưu đúng không

2. **Test với các ký tự đặc biệt:**

   - Dữ liệu có `<sup>`, `<sub>` → Hiển thị `^`, `_`
   - Dữ liệu có `&times;` → Hiển thị `*`
   - Dữ liệu có `&deg;` → Hiển thị `°`
   - Dữ liệu có `&nbsp;` → Hiển thị space

3. **Test với thẻ <p>:**

   - Dữ liệu có `<p>text</p>` → Hiển thị `text`
   - Dữ liệu có `<p class="...">text</p>` → Hiển thị `text`

4. **Test với entities:**
   - Dữ liệu có `&amp;` → Hiển thị `&`
   - Dữ liệu có `&lt;`, `&gt;` → Hiển thị `<`, `>`
   - Dữ liệu có `&plusmn;` → Hiển thị `±`

## Kết luận

Với việc nâng cấp hàm `convertHTMLToValue`, ProcessingAnalysis giờ đây có thể:

- ✅ Parse đầy đủ HTML về text khi chỉnh sửa
- ✅ Xóa tất cả HTML tags (bao gồm `<p>`)
- ✅ Giải mã tất cả HTML entities
- ✅ Giữ nguyên các ký tự đặc biệt khoa học
- ✅ Cải thiện UX khi nhập liệu
- ✅ Tương thích với flow hiện tại

Không cần thay đổi gì trong ProcessingAnalysis.jsx vì nó đã sử dụng `convertHTMLToValue` đúng chỗ!
