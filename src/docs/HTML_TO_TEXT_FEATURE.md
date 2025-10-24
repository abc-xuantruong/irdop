# HTML to Text Conversion Feature

## Overview

Added a comprehensive `htmlToText` function to `formatHelpers.js` that converts HTML content to plain text by removing HTML tags and decoding entities.

## Implementation

### Location

**File**: `src/contexts/formatHelpers.js`

### New Function: `htmlToText(html)`

#### Purpose

Converts HTML strings to plain text by:

1. Removing `<p>` tags specifically (including attributes like `<p class="...">`)
2. Removing all other HTML tags
3. Decoding common HTML entities
4. Decoding Vietnamese characters
5. Decoding special symbols and punctuation

#### Function Signature

```javascript
export const htmlToText = html;
```

#### Parameters

- `html` (string): The HTML string to convert

#### Returns

- (string): Plain text without HTML tags and with decoded entities

#### Features

##### 1. HTML Tag Removal

- **Priority removal**: `<p>` and `</p>` tags (including with attributes)
- **General removal**: All remaining HTML tags using regex `/<[^>]*>/g`

##### 2. Common HTML Entities

Decodes standard entities:

- `&nbsp;` → space
- `&lt;` → `<`
- `&gt;` → `>`
- `&amp;` → `&`
- `&quot;` → `"`
- `&#39;` → `'`
- `&#96;` → `` ` ``

##### 3. Vietnamese Characters

Supports full Vietnamese alphabet with diacritics:

**Uppercase**:

- À, Á, Â, Ã (A variants)
- È, É, Ê (E variants)
- Ì, Í (I variants)
- Ò, Ó, Ô, Õ (O variants)
- Ù, Ú (U variants)
- Ý (Y variant)

**Lowercase**:

- à, á, â, ã (a variants)
- è, é, ê (e variants)
- ì, í (i variants)
- ò, ó, ô, õ (o variants)
- ù, ú (u variants)
- ý, ỳ, ỹ, ÿ (y variants)

##### 4. Special Symbols

Mathematical and typographical symbols:

- `×` (multiplication)
- `÷` (division)
- `±` (plus-minus)
- `°` (degree)
- `²`, `³` (superscripts)
- `½`, `¼` (fractions)
- `…` (ellipsis)
- `—` (em dash)
- `–` (en dash)
- `•` (bullet)

##### 5. Copyright & Trademark

- `©` (copyright)
- `®` (registered)
- `™` (trademark)

##### 6. Quotation Marks

Various quotation styles:

- `«`, `»` (guillemets)
- `"`, `"` (double quotes)
- `'`, `'` (single quotes - Unicode U+2018, U+2019)
- `„` (low double quote)
- `‹`, `›` (single guillemets)

## Usage Examples

### Example 1: Basic HTML

```javascript
import { htmlToText } from './contexts/formatHelpers';

const html = '<p>Hello &amp; World</p>';
const text = htmlToText(html);
// Result: "Hello & World"
```

### Example 2: Vietnamese Content

```javascript
const html = '<p>Nhiệt độ: &Aacute;p suất cao</p>';
const text = htmlToText(html);
// Result: "Nhiệt độ: Áp suất cao"
```

### Example 3: Scientific Notation

```javascript
const html = '<p>10<sup>-5</sup> &times; 2 &deg;C</p>';
const text = htmlToText(html);
// Result: "10-5 × 2 °C"
```

### Example 4: Complex HTML with Attributes

```javascript
const html = '<p class="result" style="color: red;">Kết quả: 99&deg;C</p>';
const text = htmlToText(html);
// Result: "Kết quả: 99°C"
```

### Example 5: Multiple Entities

```javascript
const html = '<p>&ldquo;Giá trị&rdquo; = 50&plusmn;2 mg/L</p>';
const text = htmlToText(html);
// Result: ""Giá trị" = 50±2 mg/L"
```

## Integration with Existing Functions

The new `htmlToText` function complements the existing conversion functions:

### Existing Functions

1. **`convertValueToHTML(value)`**

   - Converts special characters to HTML
   - `*` → `×`
   - `^text^` → `<sup>text</sup>`
   - `_text_` → `<sub>text</sub>`

2. **`convertHTMLToValue(value)`**
   - Converts HTML back to special characters for editing
   - `×` → `*`
   - `<sup>` → `^`, `</sup>` → `^`
   - `<sub>` → `_`, `</sub>` → `_`

### Conversion Flow

```
User Input → convertValueToHTML → Database (HTML)
Database (HTML) → convertHTMLToValue → User Edit
Database (HTML) → htmlToText → Plain Text Display
```

## Technical Details

### Implementation Strategy

1. **Order matters**: Process `<p>` tags first to avoid conflicts
2. **Case-insensitive**: Uses `gi` flag for p tag removal
3. **Entity replacement**: Uses efficient object lookup and iteration
4. **Unicode handling**: Uses Unicode escape sequences for problematic characters
5. **Empty check**: Returns empty string for null/undefined input

### Performance Considerations

- Regex operations are optimized for common patterns
- Entity map lookup is O(1) for each entity
- Single pass through the text after tag removal

### Browser Compatibility

- Works in all modern browsers
- Uses standard JavaScript string methods
- No external dependencies required
- Compatible with ES6+

## Use Cases

1. **Data Export**: Converting database HTML to plain text for Excel/CSV
2. **Search Indexing**: Creating searchable text from HTML content
3. **Display**: Showing clean text in tooltips or notifications
4. **Comparison**: Comparing values without HTML formatting
5. **Reports**: Generating plain text reports from HTML data
6. **API Responses**: Cleaning data for external APIs that don't accept HTML

## Testing Recommendations

Test with various inputs:

1. Empty strings and null values
2. Plain text without HTML
3. HTML with nested tags
4. Multiple consecutive entities
5. Mixed content (text + entities + tags)
6. Vietnamese text with various diacritics
7. Scientific notation and formulas
8. Quotation marks and special punctuation
9. HTML with attributes in tags
10. Malformed HTML

## Future Enhancements

Potential additions:

1. Support for more Unicode entities
2. Preserve line breaks (`<br>` → `\n`)
3. Handle tables and lists with formatting
4. Configurable entity preservation
5. Custom entity map extensions
6. HTML entity name support (beyond numbered entities)

## Related Files

- `src/contexts/formatHelpers.js` - Main implementation
- `src/contexts/GlobalContext.jsx` - Global state management
- `src/components/lab/ProcessingAnalysis.jsx` - Uses conversion functions

## Summary

The `htmlToText` function provides a robust solution for converting HTML content to clean plain text with comprehensive support for:

- HTML tag removal (with special handling for `<p>` tags)
- Common HTML entities
- Vietnamese characters
- Mathematical symbols
- Quotation marks and punctuation
- Copyright and trademark symbols

This enhancement improves data handling, display, and export capabilities throughout the application.
