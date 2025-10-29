# Cập nhật Tooltip Chỉ Tiêu - Analysis Tooltip Update

## Mô tả / Description
Đã bỏ phần expand analyses và thay thế bằng tooltip tương tác đầy đủ các cột.

## Thay đổi / Changes

### 1. Bỏ chức năng expand analyses
- Xóa state `expandedAnalysisSampleId`
- Xóa function `handleToggleAnalysisGrid`
- Xóa logic expand/collapse trong bảng
- Xóa tooltip lịch sử phân tích cũ

### 2. Tooltip mới - Interactive và đầy đủ thông tin

#### State mới
```javascript
const [analysisSummaryTooltip, setAnalysisSummaryTooltip] = useState({
    visible: false,
    analyses: [],
    position: { top: 0, left: 0 },
    isHovering: false, // Track nếu chuột đang ở trên tooltip
});
const tooltipRef = useRef(null);
const tooltipTimeoutRef = useRef(null);
```

#### Tính năng tooltip
- **Hiển thị đầy đủ 6 cột:**
  1. Tên chỉ tiêu
  2. Mã phương pháp
  3. Kết quả
  4. Đơn vị
  5. Hạn trả
  6. Kỹ thuật viên

- **Tooltip có thể tương tác:**
  - Di chuột từ cell sang tooltip không bị mất
  - Có delay 200ms trước khi ẩn
  - Track hover state để giữ tooltip hiển thị
  - `pointerEvents: 'auto'` để cho phép tương tác

- **Vị trí và kích thước:**
  - Width: 600px (tăng từ 400px)
  - Position: Bên trái cell với gap 620px
  - Max-height: 400px với scroll nếu cần
  - Fixed positioning với z-index cao (9999)

#### Functions mới
```javascript
handleAnalysisSummaryEnter() // Show tooltip với clear timeout
handleAnalysisSummaryLeave() // Delay hide với 200ms timeout
handleTooltipEnterMouse()    // Keep tooltip visible khi hover
handleTooltipLeaveMouse()    // Hide tooltip khi leave
```

### 3. UI Updates

#### Table Header
- Xóa dynamic width dựa trên `expandedAnalysisSampleId`
- Fixed width: `w-[6%] min-w-24`

#### Table Body - Cột Chỉ tiêu
- Chỉ hiển thị format X/Y/Z (completedTests/assignedTests/totalTests)
- Hover để show tooltip
- Không còn click để expand
- Giữ màu sắc indicator (green/yellow/gray)

## Lợi ích / Benefits

1. **UX tốt hơn:** Tooltip interactive, không bị mất khi di chuột
2. **Thông tin đầy đủ:** Hiển thị tất cả 6 cột quan trọng
3. **Giao diện gọn gàng:** Không còn phần expand làm thay đổi layout
4. **Dễ sử dụng:** Chỉ cần hover để xem, không cần click

## File thay đổi / Files Modified
- `src/pages/Dashboard.jsx`

## Ngày cập nhật / Date
2025-10-29
