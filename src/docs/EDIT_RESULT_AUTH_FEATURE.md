# Edit Result Authentication Feature

## Overview

This feature adds authentication checks when users try to edit result values or units in the `filterable.jsx` component.

## Implementation Details

### 1. Authentication Flow

#### First-time Edit (No Cookie)

1. User clicks on result/unit cell
2. System checks `editExpiredResultAt` cookie
3. If cookie doesn't exist or is expired → Show **Login Popup**
4. User enters credentials and logs in
5. System sets `editExpiredResultAt` cookie (expires in 10 minutes)
6. User can now edit the cell

#### Subsequent Edits (Cookie Exists)

1. User clicks on result/unit cell
2. System checks `editExpiredResultAt` cookie (valid for 10 minutes)
3. System checks `lastEditResultAt` in localStorage
4. If `lastEditResultAt` exists and is valid (< 2 minutes since last edit) → Allow edit directly
5. If `lastEditResultAt` doesn't exist or expired → Show **Relogin Confirmation**
6. User can choose:
   - **Yes** → Show Login Popup
   - **No** → Cancel edit

#### After Successful Update

- System sets `lastEditResultAt` in localStorage (valid for 2 minutes)
- This allows quick consecutive edits without re-authentication

### 2. Cookie & LocalStorage Values

#### Cookies (set after successful login)

- `editExpiredResultAt`: Timestamp (now + 10 minutes)
  - Controls overall edit permission
  - Requires full re-login when expired
- `auth`: Session UID
- `appUID`: Application UID

#### LocalStorage

- `lastEditResultAt`: Timestamp (now + 2 minutes)
  - Set after each successful update
  - Allows quick edits within 2-minute window
  - Prevents constant re-authentication prompts

### 3. UI Components

#### Login Popup

- Simple form with:
  - Email/Username field
  - Password field
  - Close button (top-right corner)
  - Login button (center bottom)
- Features:
  - Enter key triggers login
  - Auto-focus on email field
  - Loading state during authentication
  - Error handling with SweetAlert2

#### Relogin Confirmation Modal

- Prompt message: "Bạn có muốn đăng nhập lại để nhập kết quả cho phép thử này?"
- Two buttons:
  - **Không** (No) - Cancel edit
  - **Có, đăng nhập** (Yes) - Show login popup

### 4. Code Structure

#### New State Variables

```javascript
const [showLoginPopup, setShowLoginPopup] = useState(false);
const [showReloginConfirm, setShowReloginConfirm] = useState(false);
const [loginEmail, setLoginEmail] = useState('');
const [loginPassword, setLoginPassword] = useState('');
const [isLoggingIn, setIsLoggingIn] = useState(false);
const [pendingEditCell, setPendingEditCell] = useState(null);
```

#### New Functions

- `checkAuthBeforeEdit()` - Validates authentication before allowing edit
- `handleLogin()` - Handles login form submission
- `closeLoginPopup()` - Closes popups and resets state
- `proceedWithEdit()` - Continues with edit after authentication

#### Modified Functions

- `handleCellClick()` - Now async, checks auth before proceeding
- `handleCellBlur()` - Sets `lastEditResultAt` after successful update

### 5. Dependencies Added

```javascript
import Cookies from 'js-cookie';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaTimes } from 'react-icons/fa';
```

### 6. API Endpoint

- Login: `POST https://pink.irdop.org/gre134e/auth/login`
  - Request: `{ email, password }`
  - Response: `{ session_uid, app_uid, identity_name, identity_uid }`

## User Experience

### Scenario 1: First Edit of the Day

1. User clicks result cell
2. Login popup appears immediately
3. User logs in
4. Cell becomes editable
5. User can edit freely for next 2 minutes

### Scenario 2: Quick Consecutive Edits

1. User edits first cell (within 2 minutes of login)
2. User clicks another cell
3. No popup - cell becomes editable immediately
4. After 2 minutes of inactivity, next edit will show confirmation

### Scenario 3: After Cookie Expires (10+ minutes)

1. User clicks result cell
2. Login popup appears immediately (no confirmation)
3. User must log in again to continue

## Security Features

- Session-based authentication with cookies
- Time-limited edit permissions (10 minutes)
- Quick edit window (2 minutes) for UX balance
- Secure password input field
- Proper error handling for failed logins

## Benefits

- ✅ Prevents unauthorized result editing
- ✅ Maintains audit trail of who edited results
- ✅ Balances security with user convenience
- ✅ Graceful handling of expired sessions
- ✅ Clear user feedback and prompts
