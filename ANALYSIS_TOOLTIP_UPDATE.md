# Analysis Tooltip Update Documentation

## Overview

This document tracks the implementation of interactive tooltip functionality to replace the expandable analysis grid feature in the Dashboard component.

## Changes Implemented

### 1. Removed Expand Analyses Functionality

- **Removed State**: `expandedAnalysisSampleId` state variable
- **Removed Function**: `handleToggleAnalysisGrid` function
- **Removed UI**: Expand/collapse button and expanded grid display

### 2. Interactive Tooltip Implementation

- **New State**: `analysisSummaryTooltip` object with properties:
  - `isHovering`: Boolean to track mouse hover state
  - `position`: Object with x, y coordinates for tooltip positioning
  - `analyses`: Array of analysis data to display
  - `visible`: Boolean to control tooltip visibility
- **New Refs**: `tooltipRef` and `tooltipTimeoutRef` for interaction management
- **New Handlers**:
  - `handleAnalysisSummaryEnter()`: Shows tooltip with timeout clearing
  - `handleAnalysisSummaryLeave()`: Delays hiding with 200ms timeout
  - `handleTooltipEnterMouse()`: Keeps tooltip visible when hovering tooltip
  - `handleTooltipLeaveMouse()`: Hides tooltip when leaving tooltip area
  - `handleAnalysisNoteClick()`: Opens note modal from tooltip

### 3. Tooltip Design

- **Layout**: 6-column grid layout displaying:
  - Parameter Name
  - Protocol Code
  - Result Value
  - Result Unit
  - Deadline
  - Note (interactive icon)
- **Styling**: Fixed positioning with z-index 9999, max-height 300px, left offset -620px
- **Interaction**: Note icons (📝 for has note, 📋 for no note) with click handlers
- **Positioning**: Tooltip appears to the left of trigger element

### 4. Postal Order Tracking Columns

- **New Columns Added**: 3 additional columns after deadline:
  - Người tạo VĐ (Postal Order Creator)
  - Ngày tạo VĐ (Postal Order Creation Date)
  - Vận đơn (Tracking Numbers)
- **Data Sources**: Uses `_deprecated_postalOrderCreatedBy`, `_deprecated_postalOrderCreatedAt`, `_deprecated_trackingNumber` fields
- **Tracking Links**: Integrated Viettel Post tracking links for non-direct pickup orders (TT prefix excluded)
- **Conditional Display**: Columns are hidden by default and controlled by Postal toggle button

### 5. Postal Toggle Button

- **New State**: `showPostalColumns` boolean state (default: false)
- **UI Location**: Placed beside deadline button in the top button group
- **Functionality**: Toggles visibility of the 3 postal tracking columns
- **Visual Design**: 📦 icon with green background when active, "Postal" text label
- **Conditional Rendering**: Applied to both table headers and body cells for all receipt types

## Technical Details

### State Management

```javascript
const [analysisSummaryTooltip, setAnalysisSummaryTooltip] = useState({
	isHovering: false,
	position: { x: 0, y: 0 },
	analyses: [],
	visible: false,
});

const [showPostalColumns, setShowPostalColumns] = useState(false);
```

### Tooltip Positioning Logic

- Trigger element hover shows tooltip with 200ms delay
- Mouse movement to tooltip clears hide timeout
- Mouse leaving both trigger and tooltip areas triggers hide with 200ms delay
- Fixed positioning ensures consistent placement

### Conditional Column Rendering

```javascript
{
	showPostalColumns && (
		<>
			{/* Postal order creator column */}
			{/* Postal order creation date column */}
			{/* Tracking numbers column with shipment buttons */}
		</>
	);
}
```

### Shipment Button Logic

```javascript
// For receipts with existing tracking numbers
{
	receipt._deprecated_trackingNumber ? (
		<div className="flex flex-col items-start space-y-1">
			{/* Display existing tracking numbers as clickable links */}
			{/* Always show "Add shipment" button at the bottom */}
		</div>
	) : (
		// For receipts without tracking numbers
		<div className="cursor-pointer text-gray-500 hover:text-blue-600 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
			Tạo vận đơn
		</div>
	);
}
```

## Files Modified

- `src/pages/Dashboard.jsx`: Main dashboard component with all tooltip and postal column functionality

## Testing Notes

- Tooltip remains visible when mouse moves from trigger element to tooltip
- All 6 analysis columns display correctly in tooltip
- Note icons are interactive and open note modal
- Postal columns toggle correctly with button
- Tracking links open in new tabs for Viettel Post
- Shipment creation buttons work for both empty and existing tracking number receipts
- ShipmentForm opens in correct mode (new/auto) based on context
- No layout breaks when postal columns are shown/hidden

## Future Enhancements

- Consider adding similar toggle buttons for other optional columns
- Potential optimization for tooltip positioning on smaller screens
- May add keyboard navigation support for accessibility

### 6. Shipment Creation Buttons

- **Interactive Tracking Numbers**: Existing tracking numbers are now clickable links that open the ShipmentForm for editing
- **Create Shipment Button**: Added "Tạo vận đơn" button for receipts without tracking numbers
- **Add Shipment Button**: Added "+ Thêm vận đơn" button for receipts that already have tracking numbers
- **ShipmentForm Integration**: Connected to existing ShipmentForm component with proper state management
- **Mode Support**: Supports both 'new' mode for creating shipments and 'auto' mode for editing existing shipments
