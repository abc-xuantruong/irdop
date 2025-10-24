# Doc Column Icon Display Update

## Tổng quan

Cập nhật cột `Doc` (doc_id) để hiển thị **icon đính kèm (attachment)** thay vì text docId, với tooltip hiển thị giá trị docId khi hover, và giữ chức năng click để mở Google Docs URL.

## Vấn đề cần giải quyết

### Trước đây:

- Cột `doc_id` hiển thị **text docId** (VD: "DOC-2024-001")
- Text có màu xanh, underline khi hover
- Click vào text để mở Google Docs
- Tooltip: `title="Mở tài liệu Google Docs"` (built-in)

### Bây giờ:

- Cột `doc_id` hiển thị **icon attachment** (MdAttachFile)
- Icon màu xanh, hover có background xanh nhạt
- **Custom tooltip hiển thị docId** bên trái icon
- Click vào icon để mở Google Docs

## Implementation

### Updated Column Render

```jsx
) : column === 'doc_id' ? (
	row.doc_id ? (
		<div
			className="flex items-center justify-center cursor-pointer hover:bg-blue-50 p-1 rounded"
			onClick={(e) => {
				e.stopPropagation();
				handleDocIdClick(row.doc_id);
			}}
			onMouseEnter={(e) => showTooltip(e, row.doc_id)}  // 🆕 Show tooltip with docId
			onMouseLeave={hideTooltip}                        // 🆕 Hide tooltip
		>
			<MdAttachFile className="w-5 h-5 text-blue-600" /> // 🆕 Icon instead of text
		</div>
	) : (
		<div className="flex items-center justify-center p-1">
			<span className="text-gray-300">--</span>
		</div>
	)
) : column === 'technicianId' ? (
```

### Changes Made

1. **Removed `title` attribute**

   ```jsx
   // OLD
   title = 'Mở tài liệu Google Docs';

   // NEW
   // No title attribute (using custom tooltip)
   ```

2. **Added custom tooltip handlers**

   ```jsx
   onMouseEnter={(e) => showTooltip(e, row.doc_id)}
   onMouseLeave={hideTooltip}
   ```

3. **Replaced text with icon**

   ```jsx
   // OLD
   <span className="text-blue-600 font-medium hover:underline">
       {row.doc_id}
   </span>

   // NEW
   <MdAttachFile className="w-5 h-5 text-blue-600" />
   ```

## Visual Design

### Icon Display

**With docId:**

```
┌─────┐
│  📎 │ ← MdAttachFile icon (blue)
└─────┘
```

**Without docId:**

```
┌─────┐
│  -- │ ← Gray text
└─────┘
```

### Hover State

```
┌─────────────────────┐
│  📎  ← Icon          │
│  ↑                  │
│  Background: blue-50│
└─────────────────────┘
       ↑
    Tooltip appears on left:
    ┌─────────────┐
    │ DOC-2024-001│
    └─────────────┘
```

### Icon Styling

```jsx
<MdAttachFile className="w-5 h-5 text-blue-600" />
```

- **Size**: `w-5 h-5` = 20px × 20px
- **Color**: `text-blue-600` = #2563eb
- **Icon**: Paperclip/attachment icon from Material Design

### Container Styling

```jsx
className = 'flex items-center justify-center cursor-pointer hover:bg-blue-50 p-1 rounded';
```

- **Layout**: `flex items-center justify-center` - Center icon
- **Interaction**: `cursor-pointer` - Hand cursor on hover
- **Hover**: `hover:bg-blue-50` - Light blue background
- **Spacing**: `p-1` - 4px padding
- **Shape**: `rounded` - Rounded corners

## Tooltip Implementation

### Using Existing Tooltip System

The component uses the existing `showTooltip` and `hideTooltip` functions:

```javascript
const showTooltip = (event, content) => {
	const rect = event.target.getBoundingClientRect();
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

	// Check if there's enough space above the element
	const spaceAbove = rect.top;
	const tooltipHeight = 40;
	const shouldShowBelow = spaceAbove < tooltipHeight + 20;

	setTooltip({
		visible: true,
		content, // 🔹 docId value
		x: rect.left + scrollLeft + rect.width / 2, // Center horizontally
		y: shouldShowBelow
			? rect.bottom + scrollTop + 10 // Show below
			: rect.top + scrollTop - 10, // Show above
		position: shouldShowBelow ? 'below' : 'above',
	});
};
```

### Tooltip Content

```jsx
onMouseEnter={(e) => showTooltip(e, row.doc_id)}
```

**Content**: Giá trị `row.doc_id` (VD: "DOC-2024-001")

**Position**:

- Automatically positioned based on available space
- Above icon if space available (default)
- Below icon if not enough space above
- Horizontally centered on icon

## User Experience

### Before (Text Display)

```
User sees: DOC-2024-001 (blue text)
User hovers: Text underlines, tooltip shows "Mở tài liệu Google Docs"
User clicks: Opens Google Docs in new tab
```

### After (Icon Display)

```
User sees: 📎 (blue attachment icon)
User hovers: Background turns light blue, tooltip shows "DOC-2024-001"
User clicks: Opens Google Docs in new tab
```

## Functionality Preserved

### Click Behavior (Unchanged)

```jsx
onClick={(e) => {
	e.stopPropagation();
	handleDocIdClick(row.doc_id);
}}
```

**Flow:**

1. User clicks icon
2. Event doesn't propagate to row (prevents row selection)
3. `handleDocIdClick` is called with `row.doc_id`
4. API call: `POST /v1/option/get/url`
5. Response: Google Docs URL
6. Opens URL in new tab
7. Toast: "Đã mở tài liệu Google Docs"

### Empty State (Unchanged)

```jsx
row.doc_id ? (
	// Show icon
) : (
	<div className="flex items-center justify-center p-1">
		<span className="text-gray-300">--</span>
	</div>
)
```

## Benefits

### 1. **Cleaner UI**

- ✅ Icon takes less space than text
- ✅ Consistent visual language (icon = attachment)
- ✅ Table looks less cluttered

### 2. **Better Visual Hierarchy**

- ✅ Icon stands out more than text
- ✅ Easy to scan for documents at a glance
- ✅ Color-coded (blue = clickable action)

### 3. **Improved UX**

- ✅ Tooltip shows actual docId when needed
- ✅ Icon is universally recognized (attachment)
- ✅ Hover feedback with background color
- ✅ Same click behavior (no learning curve)

### 4. **Consistent with Design Patterns**

- ✅ Many apps use icon for attachments (Gmail, Outlook, etc.)
- ✅ Tooltip for details on hover (standard pattern)
- ✅ Click to open (standard interaction)

## Comparison: Before vs After

| Aspect            | Before (Text)             | After (Icon)       |
| ----------------- | ------------------------- | ------------------ |
| **Display**       | "DOC-2024-001"            | 📎 icon            |
| **Width**         | ~100-120px                | 20px               |
| **Hover Effect**  | Text underline            | Background blue-50 |
| **Tooltip**       | "Mở tài liệu Google Docs" | "DOC-2024-001"     |
| **Click**         | Open Google Docs          | Open Google Docs   |
| **Visual Weight** | High                      | Low                |
| **Scannability**  | Medium                    | High               |

## Testing

### Test Case 1: Normal Display

```javascript
// Given
row.doc_id = "DOC-2024-001"

// When
Cell renders

// Then
✅ Icon MdAttachFile displayed
✅ Icon is blue (text-blue-600)
✅ Icon size is 20px × 20px
✅ Cell has pointer cursor
```

### Test Case 2: Hover Behavior

```javascript
// Given
Icon displayed
User hovers over icon

// When
Mouse enters

// Then
✅ Background changes to blue-50
✅ Tooltip appears with "DOC-2024-001"
✅ Tooltip positioned to left/above icon
✅ Icon remains visible
```

### Test Case 3: Hover Exit

```javascript
// Given
User hovering on icon

// When
Mouse leaves

// Then
✅ Background returns to normal
✅ Tooltip disappears
✅ Icon remains blue
```

### Test Case 4: Click to Open

```javascript
// Given
Icon displayed
row.doc_id = "DOC-2024-001"

// When
User clicks icon

// Then
✅ handleDocIdClick called with "DOC-2024-001"
✅ API call: POST /v1/option/get/url
✅ Response: Google Docs URL
✅ URL opens in new tab
✅ Toast: "Đã mở tài liệu Google Docs"
```

### Test Case 5: Empty docId

```javascript
// Given
row.doc_id = null or undefined

// When
Cell renders

// Then
✅ Shows "--" in gray
✅ No icon displayed
✅ No hover effects
✅ Not clickable
```

### Test Case 6: Tooltip Positioning

```javascript
// Scenario A: Icon near top of page
// Then: Tooltip shows BELOW icon

// Scenario B: Icon in middle/bottom of page
// Then: Tooltip shows ABOVE icon

// Both cases: Horizontally centered on icon
```

## Edge Cases

### 1. Long docId Values

```javascript
// docId = "VERY-LONG-DOC-ID-2024-001-EXTENDED"
// Tooltip may be wider than icon
// Solution: Tooltip auto-sizes to content
```

### 2. Multiple Icons in View

```javascript
// Multiple rows with docId
// Each has independent tooltip
// Only one tooltip visible at a time (on hover)
```

### 3. Quick Mouse Movement

```javascript
// User moves mouse quickly across icons
// Tooltip appears/disappears rapidly
// No performance issues (React handles efficiently)
```

### 4. Mobile/Touch Devices

```javascript
// Touch on icon: Opens Google Docs (no tooltip)
// Long press: May show tooltip (browser dependent)
// Click behavior works on all devices
```

## Icon Import

Already imported in the component:

```javascript
import { MdAttachFile } from 'react-icons/md';
```

**Icon Details:**

- Package: `react-icons`
- Library: Material Design Icons
- Name: `MdAttachFile`
- Type: Paperclip/attachment icon

## Files Modified

- ✅ `src/components/lab/ProcessingAnalysis.jsx`
  - Updated `doc_id` column render (line ~3677)
  - Replaced text with `MdAttachFile` icon
  - Added `onMouseEnter` and `onMouseLeave` handlers
  - Removed `title` attribute
  - Kept `onClick` handler (unchanged)

## Dependencies

- `MdAttachFile`: React icon component (already imported)
- `showTooltip`: Existing tooltip function
- `hideTooltip`: Existing tooltip function
- `handleDocIdClick`: Existing click handler

## Conclusion

Cập nhật này cải thiện UI/UX của cột Doc bằng cách:

- ✅ Thay thế **text docId** bằng **icon attachment** (cleaner)
- ✅ **Custom tooltip** hiển thị docId khi hover
- ✅ **Giữ nguyên** chức năng click để mở Google Docs
- ✅ **Visual consistency** với các ứng dụng khác
- ✅ **Better scannability** - dễ nhìn thấy documents

**Example:**

```
Old: DOC-2024-001 (text, takes ~100px)
New: 📎 (icon, takes 20px) + Tooltip on hover: "DOC-2024-001"
```

**Interaction:**

```
Hover → Tooltip: "DOC-2024-001"
Click → Opens Google Docs in new tab ✅
```
