# Refactoring Login Popup - Tách thành Component Riêng

## Tóm tắt

Đã tách element `showLoginPopup` thành một component JSX riêng (`LoginPopup.jsx`) và sử dụng import để gọi trong các component khác.

## Các thay đổi

### 1. File mới được tạo

- **`src/components/lab/LoginPopup.jsx`**: Component độc lập xử lý popup đăng nhập

### 2. Files đã được cập nhật

#### `ProcessingAnalysis.jsx`

- **Import mới**: Thêm `import LoginPopup from './LoginPopup';`
- **State đã xóa**:
  - `loginEmail`
  - `loginPassword`
  - `isLoggingIn`
- **State giữ lại**:
  - `showLoginPopup`
  - `showReloginConfirm`
  - `pendingEditCell`
- **Function đã thay đổi**:
  - Xóa function `handleLogin()` (logic đã chuyển vào component)
  - Thêm function mới `handleLoginSuccess()` - callback khi đăng nhập thành công
  - Đơn giản hóa `closeLoginPopup()`
- **JSX đã thay đổi**:
  - Thay thế toàn bộ JSX của login popup bằng: `<LoginPopup isOpen={showLoginPopup} onClose={closeLoginPopup} onLoginSuccess={handleLoginSuccess} />`

#### `filterable.jsx`

- **Import mới**: Thêm `import LoginPopup from '../lab/LoginPopup';`
- **State đã xóa**:
  - `loginEmail`
  - `loginPassword`
  - `isLoggingIn`
- **State giữ lại**:
  - `showLoginPopup`
  - `showReloginConfirm`
  - `pendingEditCell`
- **Function đã thay đổi**:
  - Xóa function `handleLogin()` (logic đã chuyển vào component)
  - Thêm function mới `handleLoginSuccess()` - callback khi đăng nhập thành công
  - Đơn giản hóa `closeLoginPopup()`
- **JSX đã thay đổi**:
  - Thay thế toàn bộ JSX của login popup bằng: `<LoginPopup isOpen={showLoginPopup} onClose={closeLoginPopup} onLoginSuccess={handleLoginSuccess} />`

## Chi tiết Component LoginPopup

### Props

- `isOpen` (boolean): Trạng thái hiển thị popup
- `onClose` (function): Callback khi đóng popup
- `onLoginSuccess` (function): Callback khi đăng nhập thành công

### Features

- Quản lý state riêng cho email, password, loading
- Xử lý logic đăng nhập API
- Xử lý cookies (auth, appUID, editExpiredResultAt)
- Hiển thị thông báo success/error
- Support Enter key để submit
- Auto reset form khi đóng hoặc thành công

### Dependencies

```javascript
import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import axios from 'axios';
import Swal from 'sweetalert2';
```

## Cách sử dụng

```jsx
import LoginPopup from './LoginPopup'; // hoặc '../lab/LoginPopup'

// Trong component
const [showLoginPopup, setShowLoginPopup] = useState(false);
const [pendingEditCell, setPendingEditCell] = useState(null);

const handleLoginSuccess = () => {
	setShowLoginPopup(false);
	// Xử lý logic sau khi đăng nhập thành công
	if (pendingEditCell) {
		const { analysisId, column, currentValue } = pendingEditCell;
		proceedWithEdit(analysisId, column, currentValue);
		setPendingEditCell(null);
	}
};

const closeLoginPopup = () => {
	setShowLoginPopup(false);
	setPendingEditCell(null);
};

// Trong JSX
<LoginPopup isOpen={showLoginPopup} onClose={closeLoginPopup} onLoginSuccess={handleLoginSuccess} />;
```

## Lợi ích

### 1. Code Reusability

- Component có thể được tái sử dụng ở nhiều nơi
- Đã áp dụng trong `ProcessingAnalysis.jsx` và `filterable.jsx`

### 2. Separation of Concerns

- Logic đăng nhập được tách riêng
- Parent component chỉ cần quan tâm đến khi nào hiển thị và xử lý sau khi đăng nhập

### 3. Maintainability

- Dễ bảo trì và cập nhật logic đăng nhập
- Thay đổi một nơi sẽ áp dụng cho tất cả nơi sử dụng

### 4. Cleaner Code

- Parent component sạch hơn, ít state và logic hơn
- Giảm độ phức tạp của file lớn

### 5. Testing

- Dễ test riêng component LoginPopup
- Mock props để test các scenario khác nhau

## API Endpoint

- **URL**: `https://pink.irdop.org/gre134e/auth/login`
- **Method**: POST
- **Body**:
  ```json
  {
  	"email": "user@example.com",
  	"password": "password123"
  }
  ```
- **Response**: Session UID và App UID để lưu vào cookies

## Cookies được set

- `auth`: Session UID từ response
- `appUID`: App UID từ response
- `editExpiredResultAt`: Timestamp hiện tại + 10 phút (thời gian hết hạn chỉnh sửa)

## Lưu ý

- Component tự động reset form khi đóng
- Component ẩn khi `isOpen = false` (return null)
- Hỗ trợ Enter key để submit form
- Hiển thị loading state khi đang đăng nhập
- Disable nút submit khi chưa điền đủ thông tin

## Testing

Đã kiểm tra không có lỗi compile trong:

- ✅ `ProcessingAnalysis.jsx`
- ✅ `filterable.jsx`
- ✅ `LoginPopup.jsx`
