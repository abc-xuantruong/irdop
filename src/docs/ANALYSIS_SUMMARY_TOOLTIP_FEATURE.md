# Tính năng Tooltip cho Chỉ tiêu (X/Y/Z format)

## Mô tả

Đã thêm tooltip hiển thị thông tin chi tiết khi hover vào cell chỉ tiêu có format X/Y/Z trong Dashboard.

## Các thay đổi

### 1. State mới được thêm vào

```javascript
const [analysisSummaryTooltip, setAnalysisSummaryTooltip] = useState({
	visible: false,
	analyses: [],
	position: { top: 0, left: 0 },
});
```

- `visible`: Trạng thái hiển thị/ẩn tooltip
- `analyses`: Mảng chứa danh sách các phân tích (chỉ tiêu)
- `position`: Vị trí hiển thị tooltip (top, left)

### 2. Handler functions mới

#### handleAnalysisSummaryEnter

```javascript
const handleAnalysisSummaryEnter = (e, sample) => {
	if (sample?.analyses && sample.analyses.length > 0) {
		const element = e.currentTarget;
		const rect = element.getBoundingClientRect();

		setAnalysisSummaryTooltip({
			visible: true,
			analyses: sample.analyses,
			position: {
				top: rect.bottom + window.scrollY + 5,
				left: rect.left + window.scrollX,
			},
		});
	}
};
```

- Được gọi khi mouse hover vào cell chỉ tiêu
- Tính toán vị trí tooltip dựa trên vị trí của element
- Hiển thị tooltip 5px bên dưới element

#### handleAnalysisSummaryLeave

```javascript
const handleAnalysisSummaryLeave = () => {
	setAnalysisSummaryTooltip({
		visible: false,
		analyses: [],
		position: { top: 0, left: 0 },
	});
};
```

- Được gọi khi mouse rời khỏi cell chỉ tiêu
- Ẩn tooltip và reset state

### 3. Cập nhật UI cho cell chỉ tiêu

Thêm event handlers vào div hiển thị X/Y/Z:

```javascript
<div
    className="text-sm"
    onClick={() => handleToggleAnalysisGrid(sample.id)}
    onMouseEnter={(e) => handleAnalysisSummaryEnter(e, sample)}
    onMouseLeave={handleAnalysisSummaryLeave}
>
```

### 4. Tooltip UI Component

Tooltip hiển thị 3 cột thông tin:

- **Tên chỉ tiêu** (parameterName): Tên của phép phân tích
- **Kết quả** (resultValue): Giá trị kết quả (hiển thị tối đa 30 ký tự)
- **Hạn trả** (deadline): Ngày hạn trả kết quả

```javascript
{
	analysisSummaryTooltip.visible && analysisSummaryTooltip.analyses.length > 0 && (
		<div
			className="fixed bg-white border-2 border-green-500 rounded-lg shadow-lg z-[9999] p-3 text-xs"
			style={{
				top: `${analysisSummaryTooltip.position.top}px`,
				left: `${analysisSummaryTooltip.position.left}px`,
				maxWidth: '600px',
			}}
		>
			<p className="font-semibold mb-2 text-sm">Danh sách chỉ tiêu:</p>
			<div className="grid grid-cols-3 gap-2 font-semibold mb-2 pb-2 border-b">
				<div>Tên chỉ tiêu</div>
				<div>Kết quả</div>
				<div>Hạn trả</div>
			</div>
			<div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
				{analysisSummaryTooltip.analyses.map((analysis, idx) => (
					<React.Fragment key={`summary-${idx}`}>
						<div className="truncate" title={analysis.parameterName || '--'}>
							{analysis.parameterName || '--'}
						</div>
						<div className="truncate" title={analysis.resultValue || '--'}>
							{analysis.resultValue && analysis.resultValue !== '<p></p>'
								? analysis.resultValue.replace(/<[^>]*>/g, '').substring(0, 30)
								: '--'}
						</div>
						<div className="truncate" title={analysis.deadline ? formatDate(analysis.deadline) : '--'}>
							{analysis.deadline ? formatDate(analysis.deadline) : '--'}
						</div>
					</React.Fragment>
				))}
			</div>
		</div>
	);
}
```

## Đặc điểm của Tooltip

1. **Vị trí**: Hiển thị ngay bên dưới cell được hover (5px offset)
2. **Styling**:
   - Border màu xanh lá (border-green-500)
   - Nền trắng với shadow
   - z-index cao (9999) để hiển thị trên các element khác
3. **Nội dung**:
   - Header "Danh sách chỉ tiêu"
   - Grid 3 cột với header
   - Scroll nếu danh sách quá dài (max-height: 60)
4. **Tương tác**:
   - Hiển thị khi hover vào cell X/Y/Z
   - Ẩn khi mouse rời khỏi cell
   - Không ảnh hưởng đến chức năng click để expand analysis grid

## Lợi ích

1. **Thông tin nhanh**: Người dùng có thể xem nhanh danh sách chỉ tiêu mà không cần expand
2. **UX tốt hơn**: Tooltip hiển thị mượt mà và không gây cản trở
3. **Dễ dàng so sánh**: Có thể xem thông tin nhiều mẫu bằng cách hover qua từng cell
4. **Tiết kiệm không gian**: Không cần mở rộng grid để xem thông tin cơ bản

## Ngày cập nhật

27/10/2025
