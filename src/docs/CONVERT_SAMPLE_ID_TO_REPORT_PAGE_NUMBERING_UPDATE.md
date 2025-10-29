# ConvertSampleIdToReport.js - Page Numbering & Layout Updates

## Overview

Updated `convertSampleIdToReport.js` to match `reportPreviewHelpers.js` for consistent page numbering, spacing, and layout configuration.

## Changes Made

### 1. Page Numbering Reset Per Sample ✅

**Before:** Page numbers were cumulative across all samples (Sample 1: pages 1-3, Sample 2: pages 4-6, etc.)

**After:** Page numbers reset for each sample (Sample 1: pages 1-3, Sample 2: pages 1-3, etc.)

```javascript
// Before
let totalPageCount = 0;
for (const paginatedContent of allPaginatedContent) {
	totalPageCount += paginatedContent.length;
}
let currentPageNumber = 1;
for (let i = 0; i < sectionsDataArray.length; i++) {
	for (const pageData of paginatedContent) {
		const pageHTML = generateSinglePage(sectionsData, pageData, currentPageNumber, totalPageCount);
		currentPageNumber++;
	}
}

// After
for (let i = 0; i < sectionsDataArray.length; i++) {
	const sectionsData = sectionsDataArray[i];
	const paginatedContent = allPaginatedContent[i];
	const totalPagesForSample = paginatedContent.length;

	for (let pageIndex = 0; pageIndex < paginatedContent.length; pageIndex++) {
		const pageData = paginatedContent[pageIndex];
		const pageNumber = pageIndex + 1; // Starts at 1 for each sample
		const pageHTML = generateSinglePage(sectionsData, pageData, pageNumber, totalPagesForSample);
	}
}
```

### 2. Spacing Logic Update ✅

**Change:** Section spacing now added AFTER each section (except last), not BEFORE

```javascript
// Before (spacing BEFORE)
const content = pageData.sections
	.map((section, index) => {
		const spacing = index > 0 ? spacingHTML : '';
		return spacing + section.html;
	})
	.join('');

// After (spacing AFTER - matches reportPreviewHelpers.js)
const content = pageData.sections
	.map((section, index) => {
		if (index < pageData.sections.length - 1) {
			return section.html + spacingHTML;
		}
		return section.html;
	})
	.join('');
```

### 3. A4 Margin Configuration ✅

**Updated to match reportPreviewHelpers.js:**

```javascript
// Before
const A4 = {
	topMargin: 15, // 1.5cm
	bottomMargin: 8, // 0.8cm
	sideMargin: 10,
	headerSpacing: 5,
	footerSpacing: 2,
};

// After (matching reportPreviewHelpers.js)
const A4 = {
	topMargin: 10, // 1cm
	bottomMargin: 6, // 0.6cm
	sideMargin: 10,
	headerSpacing: 5,
	footerSpacing: 2,
};
```

### 4. Spacing Height Standardization ✅

**Changed from 4mm to 15px to match reportPreviewHelpers.js:**

```javascript
// Before
spacingHeight: measurements.spacingHeight,  // Calculated from DOM
const spacingHTML = `<div style="height: 4mm; margin:0; padding:0;"></div>`;

// After (fixed 15px)
spacingHeight: 15,  // Fixed 15px spacing
const spacingHTML = `<div style="height: 15px; margin:0; padding:0;"></div>`;
```

### 5. Header/Footer Spacing in Pixels ✅

**Changed from mm to px calculations:**

```javascript
// Before
const headerSpacingPx = mmToPx(A4.headerSpacing); // ~19px
const footerSpacingPx = mmToPx(A4.footerSpacing); // ~7.56px

// After (matching reportPreviewHelpers.js)
const headerSpacingPx = 15; // 15px gap after header
const footerSpacingPx = 20; // 20px gap before footer
```

### 6. CSS Improvements ✅

**Added universal font-family selector and improved positioning:**

```css
/* Added */
* {
    font-family: 'Wix Madefor Display', sans-serif !important;
}

/* Updated .page padding */
.page {
    padding: 0;  /* Changed from using A4 margin mm values */
}

/* Improved positioning calculations */
.header {
    top: ${headerTop}px;  /* Explicitly calculated */
}
.content {
    top: ${contentTop}px;
    max-height: ${contentMaxHeight}px;
}
.footer {
    bottom: ${footerBottom}px;  /* Explicitly calculated */
}
```

## Impact Summary

### For Users

- **Page Numbers:** Each sample now has independent page numbering (e.g., "01 / 02" instead of "01 / 06")
- **Consistent Layout:** Spacing and margins now match the client-side preview exactly
- **Better Print Quality:** More accurate content positioning and spacing

### For Developers

- **Code Consistency:** Server-side (convertSampleIdToReport.js) now mirrors client-side (reportPreviewHelpers.js)
- **Easier Maintenance:** Changes to layout logic can be applied consistently to both files
- **Better Debugging:** Logs show per-sample page counts: `"Sample 1 (IRDOP-001): 2 pages"`

## Testing Recommendations

1. **Single-Sample, Single-Page Report**

   - Verify page shows "01 / 01"
   - Check spacing between sections (should be 15px)

2. **Single-Sample, Multi-Page Report**

   - Verify pages show "01 / 03", "02 / 03", "03 / 03"
   - Check two-page special layout is applied when appropriate

3. **Multi-Sample Report**

   - Sample 1: "01 / 02", "02 / 02"
   - Sample 2: "01 / 01" (resets!)
   - Sample 3: "01 / 03", "02 / 03", "03 / 03"

4. **Margin & Spacing Verification**
   - Top margin: 10mm (37.8px)
   - Bottom margin: 6mm (22.68px)
   - Header spacing: 15px
   - Footer spacing: 20px
   - Section spacing: 15px

## Log Output Example

```
=== Sample 1 (IRDOP-001): 2 pages ===
=== Sample 2 (IRDOP-002): 1 pages ===
=== Sample 3 (IRDOP-003): 3 pages ===
```

## Files Modified

- `c:\Users\quang\Desktop\desktop\Back\irdop\src\contexts\convertSampleIdToReport.js`

## Related Documentation

- `PAGINATION_LOGIC_UPDATE.md` - Original pagination implementation
- `CONVERT_SAMPLE_ID_TO_REPORT_FIXES.md` - HTML section fixes
- `reportPreviewHelpers.js` - Client-side reference implementation
