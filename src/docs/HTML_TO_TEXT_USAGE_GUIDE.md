# Quick Usage Guide - htmlToText Function

## Import

```javascript
import { htmlToText } from './contexts/formatHelpers';
```

## Basic Usage

### Simple HTML Conversion

```javascript
const html = '<p>Hello World</p>';
const text = htmlToText(html);
// Output: "Hello World"
```

### With HTML Entities

```javascript
const html = '<p>Price: $50 &amp; up</p>';
const text = htmlToText(html);
// Output: "Price: $50 & up"
```

### With Vietnamese Characters

```javascript
const html = '<p>Kết quả th&iacute; nghiệm</p>';
const text = htmlToText(html);
// Output: "Kết quả thí nghiệm"
```

### With Scientific Notation

```javascript
const html = '<p>Nồng độ: 10<sup>-5</sup> mg/L</p>';
const text = htmlToText(html);
// Output: "Nồng độ: 10-5 mg/L"
```

### With Temperature

```javascript
const html = '<p>Nhiệt độ: 25&deg;C</p>';
const text = htmlToText(html);
// Output: "Nhiệt độ: 25°C"
```

### With Complex Formatting

```javascript
const html = '<p class="result" style="color: red;">Giá trị: 99&plusmn;2&deg;C</p>';
const text = htmlToText(html);
// Output: "Giá trị: 99±2°C"
```

## Common Use Cases

### 1. Displaying Results in Notifications

```javascript
import { htmlToText } from './contexts/formatHelpers';
import { toast } from 'react-toastify';

const resultValue = '<p>10<sup>-5</sup> &times; 2</p>';
const plainText = htmlToText(resultValue);
toast.success(`Kết quả: ${plainText}`);
// Shows: "Kết quả: 10-5 × 2"
```

### 2. Exporting to CSV/Excel

```javascript
import { htmlToText } from './contexts/formatHelpers';

const data = [
	{ parameter: 'pH', result: '<p>7.5 &plusmn; 0.2</p>' },
	{ parameter: 'Temp', result: '<p>25&deg;C</p>' },
];

const csvData = data.map((row) => ({
	parameter: row.parameter,
	result: htmlToText(row.result),
}));
// CSV will show clean text without HTML
```

### 3. Search and Filter

```javascript
import { htmlToText } from './contexts/formatHelpers';

const analyses = [
	{ id: 1, resultValue: '<p>10<sup>-5</sup></p>' },
	{ id: 2, resultValue: '<p>99&deg;C</p>' },
];

const searchTerm = '10-5';
const filtered = analyses.filter((analysis) => htmlToText(analysis.resultValue).includes(searchTerm));
```

### 4. Copy to Clipboard

```javascript
import { htmlToText } from './contexts/formatHelpers';

const copyToClipboard = (htmlValue) => {
	const plainText = htmlToText(htmlValue);
	navigator.clipboard.writeText(plainText);
	toast.success('Đã sao chép vào clipboard');
};

// Usage in component
<button onClick={() => copyToClipboard(row.resultValue)}>Copy</button>;
```

### 5. Tooltip Display

```javascript
import { htmlToText } from './contexts/formatHelpers';

const showTooltip = (event, htmlContent) => {
	const plainText = htmlToText(htmlContent);
	setTooltip({
		visible: true,
		content: plainText,
		x: event.clientX,
		y: event.clientY,
	});
};
```

## Integration with Existing Functions

### Complete Conversion Flow

```javascript
import { convertValueToHTML, convertHTMLToValue, htmlToText } from './contexts/formatHelpers';

// User types: "10^-5^ * 2"
const userInput = '10^-5^ * 2';

// Convert to HTML for storage
const htmlForDB = convertValueToHTML(userInput);
// Result: "10<sup>-5</sup> × 2"

// Convert HTML back for editing
const editableValue = convertHTMLToValue(htmlForDB);
// Result: "10^-5^ * 2"

// Convert HTML to plain text for display/export
const plainText = htmlToText(htmlForDB);
// Result: "10-5 × 2"
```

## Edge Cases Handled

### Empty or Null Values

```javascript
htmlToText(null); // Returns: ''
htmlToText(undefined); // Returns: ''
htmlToText(''); // Returns: ''
```

### Plain Text (No HTML)

```javascript
htmlToText('Just plain text'); // Returns: 'Just plain text'
```

### Multiple Entities

```javascript
const html = '&lt;tag&gt; &amp; &quot;text&quot;';
const text = htmlToText(html);
// Output: '<tag> & "text"'
```

### Nested Tags

```javascript
const html = '<p><strong>Bold <em>italic</em></strong></p>';
const text = htmlToText(html);
// Output: 'Bold italic'
```

## Tips

1. **Always import from formatHelpers**: Don't recreate the function elsewhere
2. **Use for display/export only**: Don't use for editing (use `convertHTMLToValue` instead)
3. **Handle null values**: Function returns empty string for null/undefined
4. **Performance**: Function is optimized but avoid calling in tight loops
5. **Encoding**: Handles most common entities, custom entities may need extension

## Common Patterns

### In React Components

```javascript
import { htmlToText } from '../../contexts/formatHelpers';

const AnalysisRow = ({ analysis }) => {
	const displayValue = htmlToText(analysis.resultValue);

	return (
		<td title={displayValue}>
			{/* Show HTML for rich display */}
			<div dangerouslySetInnerHTML={{ __html: analysis.resultValue }} />
		</td>
	);
};
```

### In API Responses

```javascript
import { htmlToText } from './contexts/formatHelpers';

const prepareExportData = (analyses) => {
	return analyses.map((analysis) => ({
		...analysis,
		resultValue: htmlToText(analysis.resultValue),
		resultUnit: htmlToText(analysis.resultUnit),
	}));
};
```

## Summary

The `htmlToText` function is your go-to solution for:

- ✅ Cleaning HTML for plain text display
- ✅ Preparing data for export (CSV, Excel, PDF)
- ✅ Search and filtering operations
- ✅ Clipboard operations
- ✅ Notifications and tooltips
- ✅ API responses that require plain text

Remember: Use `convertHTMLToValue` for editing, use `htmlToText` for display and export!
