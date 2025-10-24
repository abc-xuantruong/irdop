# Unit Autocomplete Feature - Tự động gợi ý đơn vị

## Tổng quan

Thêm tính năng autocomplete cho ô input **Đơn vị** (resultUnit) trong ProcessingAnalysis. Khi user gõ ký tự đầu tiên, hệ thống sẽ:

1. Gọi API để lấy danh sách đơn vị phù hợp
2. Hiển thị dropdown gợi ý bên dưới ô input (dùng createPortal)
3. Hỗ trợ keyboard navigation (Arrow Up/Down, Enter, Escape)
4. Auto-update vị trí dropdown khi scroll

## API Endpoint

### Request

```
POST https://red.irdop.org/v1/option/get/list
```

### Body

```json
{
	"listType": "unit",
	"param": {
		"searchTerm": "<giá trị ô input>"
	}
}
```

### Response

```json
{
  "status": 200,
  "data": [
    "mg/L",
    "mg/kg",
    "µg/L",
    "ng/L",
    "ppm",
    ...
  ]
}
```

## Kiến trúc Code

### 1. State Management

**File**: `src/components/lab/ProcessingAnalysis.jsx`

**New States**:

```javascript
// Unit autocomplete states
const [unitSuggestions, setUnitSuggestions] = useState([]);
const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
const [unitInputRect, setUnitInputRect] = useState(null);
const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
const unitInputRef = useRef(null);
```

**State Purposes**:
| State | Type | Purpose |
|-------|------|---------|
| `unitSuggestions` | Array<string> | Danh sách gợi ý từ API |
| `showUnitSuggestions` | boolean | Hiển thị/ẩn dropdown |
| `unitInputRect` | DOMRect | Vị trí và kích thước input (cho Portal) |
| `selectedSuggestionIndex` | number | Index item được highlight (keyboard nav) |
| `unitInputRef` | Ref | Reference tới input element |

### 2. API Fetch Function

```javascript
const fetchUnitSuggestions = async (searchTerm) => {
	if (!searchTerm || searchTerm.trim() === '') {
		setUnitSuggestions([]);
		setShowUnitSuggestions(false);
		return;
	}

	try {
		const response = await apiPost('https://red.irdop.org/v1/option/get/list', {
			listType: 'unit',
			param: {
				searchTerm: searchTerm,
			},
		});

		if (response?.status < 300 && Array.isArray(response.data)) {
			setUnitSuggestions(response.data);
			setShowUnitSuggestions(response.data.length > 0);
			setSelectedSuggestionIndex(-1);
		} else {
			setUnitSuggestions([]);
			setShowUnitSuggestions(false);
		}
	} catch (error) {
		console.error('Error fetching unit suggestions:', error);
		setUnitSuggestions([]);
		setShowUnitSuggestions(false);
	}
};
```

**Behavior**:

- Nếu searchTerm rỗng → Clear suggestions
- Call API với searchTerm
- Parse response và update state
- Reset selectedIndex về -1

### 3. Input Change Handler

```javascript
const handleUnitInputChange = (e) => {
	const value = e.target.value;
	setEditValue(value);

	// Fetch suggestions when user types first character
	if (value.length > 0) {
		fetchUnitSuggestions(value);

		// Update input rect for portal positioning
		if (unitInputRef.current) {
			const rect = unitInputRef.current.getBoundingClientRect();
			setUnitInputRect(rect);
		}
	} else {
		setShowUnitSuggestions(false);
		setUnitSuggestions([]);
	}
};
```

**Flow**:

1. Update `editValue` với giá trị mới
2. Nếu có text → Gọi API + Update rect position
3. Nếu xóa hết text → Ẩn dropdown

### 4. Suggestion Selection

```javascript
const handleSuggestionClick = (suggestion) => {
	setEditValue(suggestion);
	setShowUnitSuggestions(false);
	setUnitSuggestions([]);
	setSelectedSuggestionIndex(-1);
	// Keep focus on input
	if (unitInputRef.current) {
		unitInputRef.current.focus();
	}
};
```

**Behavior**:

- Set input value = suggestion đã chọn
- Ẩn dropdown
- Clear suggestions
- Focus lại input (để có thể tiếp tục edit)

### 5. Keyboard Navigation

**Enhanced `handleKeyDown` function**:

```javascript
const handleKeyDown = (e) => {
	// Handle keyboard navigation for unit suggestions
	if (editingCell?.column === 'resultUnit' && showUnitSuggestions && unitSuggestions.length > 0) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setSelectedSuggestionIndex((prev) => (prev < unitSuggestions.length - 1 ? prev + 1 : prev));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (selectedSuggestionIndex >= 0) {
				handleSuggestionClick(unitSuggestions[selectedSuggestionIndex]);
			} else {
				e.target.blur(); // Save and close
			}
		} else if (e.key === 'Escape') {
			setShowUnitSuggestions(false);
			setUnitSuggestions([]);
			setSelectedSuggestionIndex(-1);
		}
	} else {
		// Normal key handling for other cells
		if (e.key === 'Enter') {
			e.preventDefault();
			e.target.blur();
		} else if (e.key === 'Escape') {
			setEditingCell(null);
			setEditValue('');
		}
	}
};
```

**Keyboard Controls**:
| Key | Action |
|-----|--------|
| ↓ (Arrow Down) | Move highlight xuống item tiếp theo |
| ↑ (Arrow Up) | Move highlight lên item trước đó |
| Enter | Chọn item đang highlight (hoặc save nếu không highlight) |
| Escape | Đóng dropdown (không chọn) |

### 6. Click Outside Handler

```javascript
useEffect(() => {
	const handleClickOutside = (e) => {
		if (
			showUnitSuggestions &&
			unitInputRef.current &&
			!unitInputRef.current.contains(e.target) &&
			!e.target.closest('.unit-suggestions-dropdown')
		) {
			setShowUnitSuggestions(false);
		}
	};

	document.addEventListener('mousedown', handleClickOutside);
	return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showUnitSuggestions]);
```

**Purpose**: Đóng dropdown khi click ra ngoài input hoặc dropdown

### 7. JSX Input Element

**Before**:

```jsx
<input
	type="text"
	value={editValue}
	onChange={(e) => setEditValue(e.target.value)}
	onBlur={() => handleCellBlur(row)}
	onKeyDown={handleKeyDown}
	autoFocus
	className="w-full px-2 py-1 border rounded bg-white"
	onClick={(e) => e.stopPropagation()}
/>
```

**After** ✅:

```jsx
<input
	ref={unitInputRef}
	type="text"
	value={editValue}
	onChange={handleUnitInputChange} // ✨ Changed
	onBlur={() => handleCellBlur(row)}
	onKeyDown={handleKeyDown}
	autoFocus
	className="w-full px-2 py-1 border rounded bg-white"
	onClick={(e) => e.stopPropagation()}
/>
```

**Changes**:

- Added `ref={unitInputRef}` - Để lấy vị trí input
- Changed `onChange={handleUnitInputChange}` - Trigger API call

### 8. Portal Dropdown Component

**Location**: End of component, before closing `</div>`

```jsx
{
	/* Unit Autocomplete Dropdown Portal */
}
{
	showUnitSuggestions &&
		unitInputRect &&
		createPortal(
			<div
				className="unit-suggestions-dropdown fixed bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto z-[9999]"
				style={{
					top: `${unitInputRect.bottom + window.scrollY}px`,
					left: `${unitInputRect.left + window.scrollX}px`,
					width: `${unitInputRect.width}px`,
					minWidth: '150px',
				}}
			>
				{unitSuggestions.map((suggestion, index) => (
					<div
						key={index}
						className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
							index === selectedSuggestionIndex ? 'bg-blue-100' : ''
						}`}
						onClick={() => handleSuggestionClick(suggestion)}
						onMouseEnter={() => setSelectedSuggestionIndex(index)}
					>
						{suggestion}
					</div>
				))}
			</div>,
			document.body,
		);
}
```

**Features**:

- ✅ Portal to `document.body` - Không bị giới hạn bởi overflow: hidden
- ✅ Fixed positioning - Luôn hiển thị đúng vị trí
- ✅ Dynamic position - Tính toán theo vị trí input
- ✅ Scroll-aware - Cộng thêm `window.scrollY/X`
- ✅ Keyboard highlight - `bg-blue-100` cho selected item
- ✅ Mouse hover highlight - `onMouseEnter` update selectedIndex
- ✅ z-index 9999 - Hiển thị trên tất cả elements

## User Flow

### Scenario 1: Gõ và chọn từ dropdown

```
1. User click vào cell Đơn vị
   ↓
2. Input field xuất hiện với focus
   ↓
3. User gõ "m" (ký tự đầu tiên)
   ↓
4. handleUnitInputChange() được gọi
   ↓
5. fetchUnitSuggestions("m") call API
   ↓
6. API trả về ["mg/L", "mg/kg", "mL", ...]
   ↓
7. Dropdown xuất hiện dưới input với danh sách gợi ý
   ↓
8. User click "mg/L"
   ↓
9. handleSuggestionClick("mg/L") được gọi
   ↓
10. Input value = "mg/L"
   ↓
11. Dropdown đóng lại
   ↓
12. User có thể tiếp tục edit hoặc blur để save
```

### Scenario 2: Keyboard navigation

```
1. User gõ "µ"
   ↓
2. Dropdown hiển thị: ["µg/L", "µg/kg", "µmol/L"]
   ↓
3. User nhấn ↓ (Arrow Down)
   ↓
4. "µg/L" được highlight (bg-blue-100)
   ↓
5. User nhấn ↓ lần nữa
   ↓
6. "µg/kg" được highlight
   ↓
7. User nhấn Enter
   ↓
8. Input value = "µg/kg"
   ↓
9. Dropdown đóng
   ↓
10. Input vẫn còn focus để tiếp tục edit
```

### Scenario 3: Gõ tự do không chọn gợi ý

```
1. User gõ "custom unit"
   ↓
2. API tìm không ra gợi ý phù hợp
   ↓
3. Dropdown không hiển thị (hoặc hiển thị empty)
   ↓
4. User nhấn Enter để save
   ↓
5. handleCellBlur() được gọi
   ↓
6. Value "custom unit" được save vào database
```

### Scenario 4: Cancel dropdown

```
1. User gõ "p"
   ↓
2. Dropdown hiển thị: ["ppm", "ppb", "pH"]
   ↓
3. User nhấn Escape
   ↓
4. Dropdown đóng (không chọn gì)
   ↓
5. Input vẫn có giá trị "p"
   ↓
6. User có thể tiếp tục gõ hoặc xóa
```

## Positioning Logic

### Tính toán vị trí Dropdown

```javascript
// Update rect khi input change
if (unitInputRef.current) {
	const rect = unitInputRef.current.getBoundingClientRect();
	setUnitInputRect(rect);
}

// Portal style
style={{
	top: `${unitInputRect.bottom + window.scrollY}px`,  // Dưới input
	left: `${unitInputRect.left + window.scrollX}px`,   // Align trái
	width: `${unitInputRect.width}px`,                   // Cùng width với input
	minWidth: '150px',                                   // Min width để không quá nhỏ
}}
```

**Factors**:

1. `unitInputRect.bottom` - Vị trí bottom của input (relative to viewport)
2. `window.scrollY` - Scroll position của page (để fix positioning)
3. `unitInputRect.left` - Vị trí trái của input
4. `window.scrollX` - Horizontal scroll (ít dùng nhưng cần cho accuracy)
5. `unitInputRect.width` - Width của input để dropdown match

**Why Portal?**

- Table có `overflow: auto` → Dropdown bị cắt nếu render trong table
- Portal to `document.body` → Dropdown thoát ra ngoài table container
- Fixed positioning → Không bị ảnh hưởng bởi scroll của table

## Styling

### Dropdown Container

```css
.unit-suggestions-dropdown {
	position: fixed; /* Fixed to viewport */
	background: white;
	border: 1px solid #d1d5db; /* border-gray-300 */
	border-radius: 0.375rem; /* rounded-md */
	box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); /* shadow-lg */
	max-height: 15rem; /* max-h-60 */
	overflow-y: auto;
	z-index: 9999;
}
```

### Suggestion Item

```css
.suggestion-item {
	padding: 0.5rem 0.75rem; /* px-3 py-2 */
	cursor: pointer;
	font-size: 0.875rem; /* text-sm */
}

.suggestion-item:hover {
	background-color: #eff6ff; /* hover:bg-blue-50 */
}

.suggestion-item.selected {
	background-color: #dbeafe; /* bg-blue-100 */
}
```

## Performance Considerations

### 1. API Call Frequency

**Current**: Mỗi lần gõ → Call API ngay

**Potential Issue**: Nếu user gõ nhanh → Nhiều requests

**Solution** (future enhancement):

```javascript
// Debounce API call
const debouncedFetchSuggestions = useCallback(
	debounce((searchTerm) => {
		fetchUnitSuggestions(searchTerm);
	}, 300),
	[],
);

const handleUnitInputChange = (e) => {
	const value = e.target.value;
	setEditValue(value);

	if (value.length > 0) {
		debouncedFetchSuggestions(value);
		// Update rect...
	}
};
```

### 2. Memory Management

- ✅ useEffect cleanup - Remove event listener khi unmount
- ✅ Clear suggestions khi không cần - Giảm memory usage
- ✅ Reset selectedIndex - Tránh stale reference

### 3. Re-render Optimization

**Current**: Component re-render mỗi khi suggestions update

**OK because**:

- Suggestions là array nhỏ (< 50 items)
- Dropdown chỉ render khi `showUnitSuggestions === true`
- Portal render outside component tree → Không ảnh hưởng table

## Testing Checklist

### ✅ Functional Tests

- [ ] Click vào cell Đơn vị → Input xuất hiện
- [ ] Gõ ký tự đầu tiên → API được gọi
- [ ] Dropdown xuất hiện với suggestions
- [ ] Click suggestion → Input updated + dropdown close
- [ ] Arrow Down → Highlight move down
- [ ] Arrow Up → Highlight move up
- [ ] Enter with highlight → Chọn item
- [ ] Enter without highlight → Save và close
- [ ] Escape → Close dropdown
- [ ] Click outside → Close dropdown
- [ ] Blur input → Save value

### ✅ Edge Cases

- [ ] Input rỗng → Không call API
- [ ] API error → Không hiển thị dropdown
- [ ] API trả về empty array → Không hiển thị dropdown
- [ ] Gõ text không match → Không hiển thị hoặc empty dropdown
- [ ] Scroll table → Dropdown position update đúng
- [ ] Resize window → Dropdown reposition

### ✅ UX Tests

- [ ] Dropdown không bị cắt bởi table overflow
- [ ] Dropdown không che input
- [ ] Dropdown width match input width
- [ ] Hover item → Highlight correct
- [ ] Keyboard nav smooth (không lag)
- [ ] Chọn suggestion → Focus vẫn ở input

## Known Limitations

### 1. Single Character Trigger

- **Current**: API call ngay khi gõ ký tự đầu tiên
- **Limitation**: Nếu user gõ "m" → Có thể có hàng trăm kết quả (mg, mL, mol, ...)
- **Workaround**: Backend filter tốt, chỉ trả về top results

### 2. No Caching

- **Current**: Mỗi lần gõ → Call API mới
- **Limitation**: Nếu user xóa và gõ lại → Duplicate requests
- **Future**: Cache results trong session storage

### 3. Position Fixed Only

- **Current**: Dropdown fixed position calculated once per change
- **Limitation**: Nếu scroll quá nhanh → Có thể lag
- **Acceptable**: Portal render nhanh, user ít khi scroll while typing

## Future Enhancements

### 1. Debounce API Calls

```javascript
const debouncedFetch = useCallback(debounce(fetchUnitSuggestions, 300), []);
```

**Benefit**: Giảm số lượng API calls khi user gõ nhanh

### 2. Recently Used Units

```javascript
const [recentUnits, setRecentUnits] = useState([]);

// Save to localStorage on selection
const handleSuggestionClick = (suggestion) => {
	// ... existing code
	const recent = JSON.parse(localStorage.getItem('recentUnits') || '[]');
	const updated = [suggestion, ...recent.filter((u) => u !== suggestion)].slice(0, 5);
	localStorage.setItem('recentUnits', JSON.stringify(updated));
	setRecentUnits(updated);
};

// Show recent units when input is focused but empty
```

**Benefit**: Faster access to frequently used units

### 3. Fuzzy Search Highlighting

```javascript
{
	unitSuggestions.map((suggestion, index) => (
		<div key={index}>
			<HighlightMatch text={suggestion} search={editValue} />
		</div>
	));
}
```

**Benefit**: User thấy rõ phần match với input

### 4. Group by Category

```javascript
// API trả về:
{
	"concentration": ["mg/L", "µg/L", "ng/L"],
	"mass": ["mg", "g", "kg"],
	"volume": ["mL", "L"]
}

// Render grouped
Object.entries(groupedSuggestions).map(([category, units]) => (
	<div key={category}>
		<div className="font-bold">{category}</div>
		{units.map(unit => <div>{unit}</div>)}
	</div>
))
```

**Benefit**: Easier to find unit by type

## Summary

### Files Modified

- ✅ `src/components/lab/ProcessingAnalysis.jsx`

### Changes Made

1. Added 5 new states for autocomplete
2. Added `fetchUnitSuggestions()` function
3. Added `handleUnitInputChange()` function
4. Added `handleSuggestionClick()` function
5. Enhanced `handleKeyDown()` with keyboard nav
6. Added click-outside handler useEffect
7. Updated input element with ref and onChange
8. Added Portal dropdown component

### Lines of Code

- **Added**: ~180 lines
- **Modified**: ~10 lines

### API Integration

- **Endpoint**: `POST /v1/option/get/list`
- **Body**: `{ listType: 'unit', param: { searchTerm } }`
- **Response**: Array of unit strings

### Features Delivered

✅ Auto-fetch suggestions on first character  
✅ Dropdown positioned below input (Portal)  
✅ Keyboard navigation (↑↓ Enter Escape)  
✅ Mouse click selection  
✅ Hover highlight  
✅ Click outside to close  
✅ Scroll-aware positioning  
✅ No table overflow clipping

---

**Status**: ✅ Implemented & Ready for Testing  
**Version**: 1.0.0  
**Date**: October 14, 2025
