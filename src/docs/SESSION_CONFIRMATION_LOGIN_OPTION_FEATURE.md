# Session Confirmation Dialog Enhancement

## Tổng quan

Thêm lựa chọn thứ ba "Đăng nhập lại" vào dialog xác nhận bắt đầu phiên nhập kết quả, cho phép user đổi tài khoản trước khi bắt đầu session.

## Vấn đề cần giải quyết

### Trước đây:

Dialog xác nhận chỉ có 2 lựa chọn:

1. **Hủy bỏ** - Cancel, đóng dialog
2. **Xác nhận** - Confirm, bắt đầu session với tài khoản hiện tại

### Bây giờ:

Dialog có 3 lựa chọn:

1. **Hủy bỏ** - Cancel, đóng dialog
2. **Đăng nhập lại** - Login again, mở login popup để đổi tài khoản
3. **Xác nhận** - Confirm, bắt đầu session với tài khoản hiện tại

## Implementation

### Dialog Structure

```jsx
{
	/* Result Entry Session Confirmation Dialog */
}
{
	showSessionConfirm && (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl p-6 w-96">
				<h2 className="text-xl font-bold mb-4 text-gray-800">Bắt đầu phiên nhập kết quả</h2>
				<p className="text-sm text-gray-600 mb-2">Bạn có muốn bắt đầu phiên nhập kết quả với tài khoản:</p>
				<p className="text-base font-semibold text-blue-600 mb-6">{currentUser?.identity_name || 'Không xác định'}</p>
				<p className="text-xs text-gray-500 mb-4 italic">
					💡 Trong phiên nhập kết quả, các thay đổi sẽ được lưu tạm thời và gửi cùng lúc khi kết thúc phiên.
				</p>
				<div className="flex justify-end space-x-3">
					{/* Button 1: Hủy bỏ */}
					<button
						onClick={() => {
							setShowSessionConfirm(false);
							setPendingEditCell(null);
						}}
						className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
					>
						Hủy bỏ
					</button>

					{/* Button 2: Đăng nhập lại (NEW) */}
					<button
						onClick={() => {
							setShowSessionConfirm(false);
							setShowLoginPopup(true);
							setPendingEditCell(null);
						}}
						className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
					>
						Đăng nhập lại
					</button>

					{/* Button 3: Xác nhận */}
					<button
						onClick={() => {
							setIsResultEntrySession(true);
							setShowSessionConfirm(false);
							toast.success('Đã bắt đầu phiên nhập kết quả');
							// Proceed with the pending edit if exists
							if (pendingEditCell && pendingEditCell.action !== 'startSession') {
								const { analysisId, column, currentValue } = pendingEditCell;
								proceedWithEdit(analysisId, column, currentValue);
							}
							setPendingEditCell(null);
						}}
						className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
					>
						Xác nhận
					</button>
				</div>
			</div>
		</div>
	);
}
```

## User Flow

### Scenario 1: User muốn đổi tài khoản

```
1. User click vào cell result/unit
   ↓
2. Dialog "Bắt đầu phiên nhập kết quả" xuất hiện
   ↓
3. User thấy tên tài khoản hiện tại
   ↓
4. User click "Đăng nhập lại"
   ↓
5. Dialog xác nhận đóng
   ↓
6. Login popup mở ra
   ↓
7. User đăng nhập tài khoản khác
   ↓
8. Sau khi login thành công, session sẽ bắt đầu với tài khoản mới
```

### Scenario 2: User hài lòng với tài khoản hiện tại

```
1. User click vào cell result/unit
   ↓
2. Dialog xuất hiện
   ↓
3. User click "Xác nhận"
   ↓
4. Session bắt đầu ngay lập tức với tài khoản hiện tại
```

### Scenario 3: User hủy bỏ

```
1. User click vào cell result/unit
   ↓
2. Dialog xuất hiện
   ↓
3. User click "Hủy bỏ"
   ↓
4. Dialog đóng, không có gì xảy ra
```

## Button Design

### Visual Hierarchy

| Button            | Color             | Purpose            | Priority |
| ----------------- | ----------------- | ------------------ | -------- |
| **Hủy bỏ**        | Gray border       | Cancel action      | Low      |
| **Đăng nhập lại** | Orange background | Alternative action | Medium   |
| **Xác nhận**      | Blue background   | Primary action     | High     |

### Color Choices

- **Gray (Hủy bỏ)**: `text-gray-600`, `border-gray-300`, `hover:bg-gray-50`

  - Neutral, non-destructive action
  - Consistent with cancel buttons elsewhere

- **Orange (Đăng nhập lại)**: `bg-orange-600`, `hover:bg-orange-700`

  - Warning/attention color
  - Indicates change/switch action
  - Distinct from primary blue

- **Blue (Xác nhận)**: `bg-blue-600`, `hover:bg-blue-700`
  - Primary action color
  - Consistent with confirm buttons elsewhere

### Layout

```jsx
<div className="flex justify-end space-x-3">
	{/* Hủy bỏ */} {/* Đăng nhập lại */} {/* Xác nhận */}
</div>
```

- `justify-end`: Align buttons to the right
- `space-x-3`: 12px gap between buttons
- Order: Cancel → Alternative → Primary (logical flow)

## Logic Implementation

### Button Actions

#### 1. Hủy bỏ (Cancel)

```javascript
onClick={() => {
	setShowSessionConfirm(false);  // Close confirmation dialog
	setPendingEditCell(null);      // Clear pending edit
}}
```

#### 2. Đăng nhập lại (Login Again)

```javascript
onClick={() => {
	setShowSessionConfirm(false);  // Close confirmation dialog
	setShowLoginPopup(true);       // Open login popup
	setPendingEditCell(null);      // Clear pending edit
}}
```

#### 3. Xác nhận (Confirm)

```javascript
onClick={() => {
	setIsResultEntrySession(true);     // Start session
	setShowSessionConfirm(false);      // Close dialog
	toast.success('Đã bắt đầu phiên nhập kết quả');
	// Proceed with pending edit if exists
	if (pendingEditCell && pendingEditCell.action !== 'startSession') {
		const { analysisId, column, currentValue } = pendingEditCell;
		proceedWithEdit(analysisId, column, currentValue);
	}
	setPendingEditCell(null);
}}
```

## Integration with Login Flow

### After Login Success

Khi user đăng nhập thành công từ login popup:

1. **Login popup đóng**
2. **currentUser được cập nhật**
3. **Session tự động bắt đầu** với tài khoản mới
4. **Toast notification**: "Đã bắt đầu phiên nhập kết quả"

### Pending Edit Handling

```javascript
setPendingEditCell(null); // Clear pending edit in all cases
```

**Why clear pending edit?**

- Khi user chọn "Đăng nhập lại", họ muốn bắt đầu fresh với tài khoản mới
- Pending edit sẽ được xử lý sau khi login thành công và session bắt đầu
- Tránh conflict giữa old pending edit và new user

## UX Considerations

### Why Add This Feature?

1. **Flexibility**: User có thể đổi tài khoản mà không cần logout/login thủ công
2. **Convenience**: Không cần rời khỏi workflow để đổi user
3. **Safety**: Xác nhận rõ ràng trước khi bắt đầu session quan trọng

### User Scenarios

#### Scenario A: Wrong User

```
User A đang login → Click vào cell → Thấy tên User A
→ Click "Đăng nhập lại" → Login User B → Session bắt đầu với User B
```

#### Scenario B: Shared Computer

```
Multiple users share computer → User A login → User B muốn edit
→ User B click cell → Thấy tên User A → Click "Đăng nhập lại"
→ Login User B → Continue workflow
```

#### Scenario C: Session Expired

```
Session expired → User click cell → Dialog hiện tên old user
→ Click "Đăng nhập lại" → Re-authenticate → Continue
```

## Testing

### Test Case 1: Normal Confirm Flow

```javascript
// Given
currentUser = {identity_name: "Nguyễn Văn A"}
showSessionConfirm = true

// When
User clicks "Xác nhận"

// Then
✅ Dialog closes
✅ isResultEntrySession = true
✅ Toast: "Đã bắt đầu phiên nhập kết quả"
✅ Pending edit proceeds if exists
```

### Test Case 2: Login Again Flow

```javascript
// Given
currentUser = {identity_name: "Nguyễn Văn A"}
showSessionConfirm = true

// When
User clicks "Đăng nhập lại"

// Then
✅ Dialog closes
✅ showLoginPopup = true
✅ Pending edit cleared
✅ Login popup opens
```

### Test Case 3: Cancel Flow

```javascript
// Given
showSessionConfirm = true
pendingEditCell = {analysisId: 123, column: 'resultValue'}

// When
User clicks "Hủy bỏ"

// Then
✅ Dialog closes
✅ pendingEditCell = null
✅ No session started
✅ No login popup
```

### Test Case 4: Login Success After "Đăng nhập lại"

```javascript
// Given
User clicked "Đăng nhập lại"
Login popup open
User enters credentials for "Nguyễn Văn B"

// When
Login succeeds

// Then
✅ Login popup closes
✅ currentUser = {identity_name: "Nguyễn Văn B"}
✅ isResultEntrySession = true (auto-start)
✅ Toast: "Đã bắt đầu phiên nhập kết quả"
```

## Edge Cases

### 1. Login Fails After "Đăng nhập lại"

```
User clicks "Đăng nhập lại" → Login popup opens → Login fails
→ Login popup stays open → User can retry
→ No session started until login succeeds
```

### 2. Multiple Dialogs

```
User clicks cell → Dialog opens → User clicks "Đăng nhập lại"
→ Dialog closes, login popup opens → User cancels login
→ No session started, user back to normal state
```

### 3. Session Already Active

```
This dialog only appears when starting a new session
If session already active, this dialog won't show
```

### 4. No Current User

```
currentUser = null
Dialog shows: "Không xác định"
User can still choose "Đăng nhập lại" to login
```

## Benefits

### 1. **Improved User Experience**

- ✅ One-click account switching
- ✅ Clear visual options
- ✅ No need to navigate away

### 2. **Better Workflow**

- ✅ Seamless authentication flow
- ✅ Maintains context (stays on same page)
- ✅ Quick recovery from wrong user

### 3. **Enhanced Security**

- ✅ Explicit confirmation before starting session
- ✅ Clear user identity display
- ✅ Easy account switching for shared devices

## Files Modified

- ✅ `src/components/lab/ProcessingAnalysis.jsx`
  - Added "Đăng nhập lại" button to session confirmation dialog
  - Button positioned between "Hủy bỏ" and "Xác nhận"
  - Orange styling to distinguish from primary action

## Dependencies

- `setShowLoginPopup`: State setter for login popup visibility
- `currentUser`: Current user object with `identity_name`
- `toast`: react-toastify for success notifications
- Tailwind CSS: For button styling and colors

## Conclusion

Tính năng này thêm lựa chọn "Đăng nhập lại" vào dialog xác nhận, cho phép user:

- ✅ Đổi tài khoản dễ dàng mà không rời khỏi workflow
- ✅ Xác nhận rõ ràng trước khi bắt đầu session
- ✅ Trải nghiệm liền mạch với login flow hiện có

**Dialog mới:**

```
┌─────────────────────────────────────┐
│ Bắt đầu phiên nhập kết quả          │
│                                     │
│ Bạn có muốn bắt đầu phiên nhập      │
│ kết quả với tài khoản:              │
│                                     │
│ Nguyễn Văn A                        │
│                                     │
│ 💡 Trong phiên nhập kết quả...      │
│                                     │
│ [Hủy bỏ] [Đăng nhập lại] [Xác nhận] │
└─────────────────────────────────────┘
```

**Flow mới:**

```
Click cell → Dialog opens → Click "Đăng nhập lại"
→ Dialog closes → Login popup opens → Login success
→ Session auto-starts with new user ✅
```
