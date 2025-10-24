# Tự động lọc theo người đăng nhập

## Tổng quan

Đã thêm chức năng tự động lọc dữ liệu theo người thực hiện (technicianId) sau khi đăng nhập thành công. Hệ thống sẽ:

1. Lưu `identityId` vào cookies khi đăng nhập
2. Tự động thêm filter `technicianId` với giá trị là `identityId` của người đăng nhập
3. Cập nhật hiển thị thông tin user ở sidebar

## Các thay đổi

### 1. LoginPopup.jsx

#### Lưu identityUID vào cookies

**Trong `handleCardLogin()` - Đăng nhập bằng thẻ từ:**

```javascript
const auth = response.data?.session_uid;
const appUID = response.data?.app_uid;
const identityUID = response.data?.identity_uid;

// Set cookies
Cookies.set('auth', auth);
Cookies.set('appUID', appUID);
Cookies.set('identityId', identityUID); // ✅ NEW
```

**Trong `handleLogin()` - Đăng nhập bằng email/password:**

```javascript
const auth = response.data?.session_uid;
const appUID = response.data?.app_uid;
const identityUID = response.data?.identity_uid;

// Set cookies
Cookies.set('auth', auth);
Cookies.set('appUID', appUID);
Cookies.set('identityId', identityUID); // ✅ NEW
```

### 2. ProcessingAnalysis.jsx

#### Tự động thêm filter sau khi login

**Function `handleLoginSuccess()` - Đã cập nhật:**

```javascript
const handleLoginSuccess = () => {
	setShowLoginPopup(false);
	setShowReloginConfirm(false);

	// Get identityId from cookie
	const identityId = Cookies.get('identityId');

	// Auto-add technician filter after login
	if (identityId) {
		const queryParams = new URLSearchParams(location.search);

		// Add or update technicianId filter
		const existingTechnicianIds = queryParams.get('technicianId');
		let technicianIds = [];

		if (existingTechnicianIds) {
			try {
				technicianIds = JSON.parse(existingTechnicianIds);
				if (!Array.isArray(technicianIds)) {
					technicianIds = [existingTechnicianIds];
				}
			} catch {
				technicianIds = [existingTechnicianIds];
			}
		}

		// Add identityId if not already in the list
		if (!technicianIds.includes(identityId)) {
			technicianIds = [identityId]; // Replace with logged-in user
			queryParams.set('technicianId', JSON.stringify(technicianIds));

			// Navigate to update URL with new filter
			navigate(`${location.pathname}?${queryParams.toString()}`, { replace: true });
		}
	}

	// Proceed with the pending edit
	if (pendingEditCell) {
		const { analysisId, column, currentValue } = pendingEditCell;
		proceedWithEdit(analysisId, column, currentValue);
		setPendingEditCell(null);
	}
};
```

**Logic hoạt động:**

1. Đọc `identityId` từ cookies
2. Parse `technicianId` hiện tại từ URL (nếu có)
3. Thay thế filter bằng `identityId` của người vừa đăng nhập
4. Cập nhật URL với filter mới
5. Component tự động reload data với filter mới

### 3. LabDashboardTemporary.jsx

#### Cập nhật hiển thị user info

**useEffect đã cập nhật để theo dõi `identityId` cookie:**

```javascript
useEffect(() => {
	const authCookie = Cookies.get('auth');
	const identityId = Cookies.get('identityId');

	if (!authCookie) {
		setCurrentUser(null);
	} else if (fetchUser && (!currentUser || !currentUser.identity_name)) {
		// Fetch user information if we have an auth cookie but no user info
		fetchUser();
	} else if (identityId && currentUser && currentUser.identity_uid !== identityId) {
		// ✅ NEW: If identityId cookie exists and is different from current user, fetch new user info
		fetchUser();
	}
}, [setCurrentUser, fetchUser, currentUser]);
```

**Logic hoạt động:**

- Khi `identityId` cookie thay đổi và khác với `currentUser.identity_uid`
- Tự động gọi `fetchUser()` để cập nhật thông tin user mới
- Sidebar sẽ hiển thị tên và thông tin của user vừa đăng nhập

## Cookies được quản lý

| Cookie Name           | Description            | Source                      |
| --------------------- | ---------------------- | --------------------------- |
| `auth`                | Session UID            | API response                |
| `appUID`              | Application UID        | API response                |
| `identityId`          | User Identity UID      | API response (identity_uid) |
| `editExpiredResultAt` | Edit permission expiry | Generated (now + 10 mins)   |

## Flow hoạt động

### Scenario 1: Đăng nhập bằng thẻ từ

```
1. User quét thẻ từ (10 ký tự)
   ↓
2. LoginPopup.handleCardLogin()
   ↓
3. API call: POST /auth/login { code: "1234567890" }
   ↓
4. Response: { session_uid, app_uid, identity_uid }
   ↓
5. Set cookies: auth, appUID, identityId
   ↓
6. ProcessingAnalysis.handleLoginSuccess()
   ↓
7. Read identityId from cookie
   ↓
8. Update URL: ?technicianId=["user-identity-uid"]
   ↓
9. ProcessingAnalysis reloads with filter
   ↓
10. LabDashboard detects identityId change
   ↓
11. Fetch and display user info in sidebar
```

### Scenario 2: Đăng nhập bằng email/password

```
1. User nhập email + password
   ↓
2. LoginPopup.handleLogin()
   ↓
3. API call: POST /auth/login { email, password }
   ↓
4. Response: { session_uid, app_uid, identity_uid }
   ↓
5. Set cookies: auth, appUID, identityId
   ↓
6. ProcessingAnalysis.handleLoginSuccess()
   ↓
7. Read identityId from cookie
   ↓
8. Update URL: ?technicianId=["user-identity-uid"]
   ↓
9. ProcessingAnalysis reloads with filter
   ↓
10. LabDashboard detects identityId change
   ↓
11. Fetch and display user info in sidebar
```

## URL Parameters

### Before Login

```
/lab-dashboard?view=analysis
```

### After Login (auto-added filter)

```
/lab-dashboard?view=analysis&technicianId=["abc-def-ghi"]
```

### Filter Format

- **Key**: `technicianId`
- **Value**: JSON array of identity UIDs
- **Example**: `["user-id-1"]` hoặc `["user-id-1", "user-id-2"]`

## API Response Structure

### Login API Response

```json
{
	"statusCode": 200,
	"message": "Success",
	"data": {
		"session_uid": "session-xxx-yyy-zzz",
		"app_uid": "app-xxx-yyy-zzz",
		"identity_uid": "user-abc-def-ghi",
		"identity_name": "Nguyễn Văn A",
		"email": "user@example.com"
	}
}
```

## Benefits

### 1. User Experience

- ✅ Tự động lọc dữ liệu của người đăng nhập
- ✅ Không cần thao tác thủ công
- ✅ Hiển thị ngay thông tin user sau khi login
- ✅ Seamless transition

### 2. Workflow Optimization

- ✅ Giảm số bước thao tác
- ✅ Focus vào công việc của chính mình
- ✅ Tăng hiệu quả làm việc

### 3. Data Privacy

- ✅ Mỗi user chỉ thấy data của mình theo mặc định
- ✅ Có thể bỏ filter nếu muốn xem tất cả
- ✅ Phù hợp với quy trình lab

## Testing

### Test Case 1: Login mới

**Given**: User chưa đăng nhập
**When**: User đăng nhập bằng thẻ từ hoặc email
**Then**:

- ✅ Cookie `identityId` được set
- ✅ URL có parameter `technicianId`
- ✅ Data được filter theo user
- ✅ Sidebar hiển thị tên user

### Test Case 2: Login lại với user khác

**Given**: Đã có user A đăng nhập
**When**: User B đăng nhập (thẻ từ/email)
**Then**:

- ✅ Cookie `identityId` được update
- ✅ URL parameter được update
- ✅ Data được filter theo user B
- ✅ Sidebar hiển thị tên user B

### Test Case 3: Pending edit after login

**Given**: User đang edit một cell, phiên hết hạn
**When**: User login lại
**Then**:

- ✅ Filter được apply
- ✅ Edit cell được resume
- ✅ User info được update

### Test Case 4: Bỏ filter thủ công

**Given**: User đã login, filter đang active
**When**: User click "Xóa bộ lọc"
**Then**:

- ✅ URL parameter bị xóa
- ✅ Hiển thị tất cả data
- ✅ User vẫn được logged in

## Edge Cases

### 1. API không trả về identity_uid

**Handling**:

- Cookie `identityId` không được set
- Không apply filter tự động
- User có thể làm việc bình thường

### 2. Cookie bị xóa/expire

**Handling**:

- `currentUser` được set null
- Redirect về login page
- Flow hoạt động bình thường sau khi login lại

### 3. URL đã có filter technicianId

**Handling**:

- Filter hiện tại bị thay thế bằng identityId mới
- Đảm bảo luôn filter theo user vừa login

## Future Enhancements

### 1. Remember filter preference

- Lưu preference "tự động filter" vào localStorage
- User có thể tắt auto-filter nếu muốn

### 2. Multi-user filter

- Cho phép thêm nhiều user vào filter
- Không thay thế hoàn toàn filter hiện tại

### 3. Filter history

- Lưu lịch sử các filter đã apply
- Quick access để chuyển đổi giữa các filter

### 4. Team view

- Filter theo team/phòng ban
- Aggregate view cho manager

## Troubleshooting

### Issue 1: Filter không được apply

**Check**:

1. Cookie `identityId` có tồn tại?
2. `handleLoginSuccess()` có được gọi?
3. URL có được update?

### Issue 2: User info không cập nhật

**Check**:

1. Cookie `identityId` có thay đổi?
2. `fetchUser()` có được gọi?
3. API có trả về data?

### Issue 3: URL bị loop update

**Check**:

1. `navigate()` có dùng `replace: true`?
2. useEffect dependencies có đúng không?

## Related Files

- ✅ `src/components/lab/LoginPopup.jsx`
- ✅ `src/components/lab/ProcessingAnalysis.jsx`
- ✅ `src/pages/LabDashboardTemporary.jsx`
- 📄 `src/contexts/GlobalContext.jsx` (existing)

---

**Version**: 1.0.0  
**Date**: October 14, 2025  
**Status**: ✅ Completed & Tested
