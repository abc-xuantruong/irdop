import axios from 'axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';

// Hàm để lấy access key tương ứng với app uid
const getAccessKeyByAppUid = (appUid) => {
	const mapping = {
		'LIMS-IRDOP-PRD': import.meta.env.VITE_ACCESS_KEY_PRD,
		'LIMS-IRDOP-DEV': import.meta.env.VITE_ACCESS_KEY_DEV,
	};

	return mapping[appUid] || import.meta.env.VITE_ACCESS_KEY_PRD; // fallback to PRD access key
};

// Hàm để lấy app uid mặc định từ ENV
const getDefaultAppUid = () => {
	const defaultEnv = import.meta.env.VITE_DEFAULT_ENV || 'PRD';
	return defaultEnv === 'DEV' ? import.meta.env.VITE_APP_UID_DEV : import.meta.env.VITE_APP_UID_PRD;
};

const getAuthHeader = () => {
	const authToken = Cookies.get('auth');
	const identityUID = Cookies.get('identityUID');
	const appUID = Cookies.get('appUID') || getDefaultAppUid();
	const accessKey = getAccessKeyByAppUid(appUID);

	// Kiểm tra nếu không có auth token thì return null
	if (!authToken || authToken === 'undefined') {
		return null;
	}

	const headers = {};

	if (authToken && authToken !== 'undefined') {
		headers.Authorization = `Bearer ${authToken}`;
	}
	if (identityUID) {
		headers['identity-uid'] = identityUID;
	}
	headers['x-fh-app-uid'] = appUID;
	headers['x-fh-access-key'] = accessKey;

	return headers;
};

const redirectToLogin = (message) => {
	Swal.fire({
		icon: 'warning',
		title: 'Thông báo',
		text: message,
		timer: 2000,
		showConfirmButton: false,
		allowOutsideClick: false,
		allowEscapeKey: false,
	});

	// Đảm bảo chuyển hướng sau 2 giây
	setTimeout(() => {
		window.location.href = '/login';
	}, 2000);
};

const forbidden = (message) => {
	Swal.fire({
		icon: 'warning',
		title: 'Thông báo',
		text: message,
		timer: 1500,
		showConfirmButton: false,
	});
};

export const checkAuth = async () => {
	try {
		const authHeaders = getAuthHeader();

		// Nếu không có auth headers thì return luôn
		if (!authHeaders) {
			return { status: 401, data: { message: 'No auth token' } };
		}

		const headers = {
			'Content-Type': 'application/json',
			...authHeaders,
		};
		await axios.post('https://pink.irdop.org/ab4dg2/auth/me', {}, { headers });
		return { status: 200, data: { message: 'Session valid' } };
	} catch (error) {
		// Xóa auth cookies khi có lỗi 401
		if (error.response?.status === 401 || error.response?.statusCode === 401) {
			Cookies.remove('auth');
			Cookies.remove('identityUID');
			redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
		}
		return { status: 401, data: { message: 'Session expired' } };
	}
};

// Hàm để check auth khi load trang
export const initialAuthCheck = async () => {
	const authHeaders = getAuthHeader();

	// Nếu không có auth headers thì redirect login
	if (!authHeaders) {
		redirectToLogin('Vui lòng đăng nhập để tiếp tục...');
		return { status: 401, data: { message: 'No auth token' } };
	}

	return await checkAuth(); // Kiểm tra xác thực
};

export const apiGet = async (url, customHeaders = {}) => {
	try {
		const authHeaders = getAuthHeader();

		// Nếu không có auth headers thì return luôn
		if (!authHeaders) {
			redirectToLogin('Vui lòng đăng nhập để tiếp tục...');
			return { status: 401, data: { message: 'No auth token' } };
		}

		const headers = {
			'Content-Type': 'application/json',
			...authHeaders,
			...customHeaders,
		};
		const response = await axios.get(url, { headers });

		return response;
	} catch (error) {
		if (error.response) {
			if (error.response?.status === 403) {
				forbidden('Bạn không có quyền truy cập vào chức năng này!');
				return { status: 403, data: { message: error.response?.data?.message || 'Forbidden' } };
			} else if (error.response?.status === 401) {
				return { status: 401, data: { message: error.response?.data?.message || 'Unauthorized' } };
			}
			return {
				status: error.response?.status,
				data: { message: error.response?.data?.message || 'Lỗi không xác định' },
			};
		}
		return { status: 500, data: { message: error.message || 'Lỗi kết nối đến máy chủ' } };
	}
};

export const apiPost = async (url, body, customHeaders = {}) => {
	try {
		const authHeaders = getAuthHeader();

		// Nếu không có auth headers thì chuyển về login
		if (!authHeaders) {
			redirectToLogin('Vui lòng đăng nhập để tiếp tục...');
			return { status: 401, data: { message: 'No auth token' } };
		}

		const headers = {
			'Content-Type': 'application/json',
			...authHeaders,
			...customHeaders,
		};
		const response = await axios.post(url, body, { headers });
		return response;
	} catch (error) {
		if (error.response) {
			if (error.response?.status === 403) {
				forbidden('Bạn không có quyền truy cập vào chức năng này!');
				return { status: 403, data: { message: error.response?.data?.message || 'Forbidden' } };
			} else if (error.response?.status === 401) {
				return { status: 401, data: { message: error.response?.data?.message || 'Unauthorized' } };
			}
			return {
				status: error.response?.status,
				data: { message: error.response?.data?.message || 'Lỗi không xác định' },
			};
		}
		return { status: 500, data: { message: error.message || 'Lỗi kết nối đến máy chủ' } };
	}
};

export const apiPut = async (url, body, customHeaders = {}) => {
	try {
		const authHeaders = getAuthHeader();

		// Nếu không có auth headers thì hiển thị redirectToLogin
		if (!authHeaders) {
			redirectToLogin('Vui lòng đăng nhập để tiếp tục...');
			return { status: 401, data: { message: 'No auth token' } };
		}

		const headers = {
			'Content-Type': 'application/json',
			...authHeaders,
			...customHeaders,
		};
		const response = await axios.put(url, body, { headers });
		return response;
	} catch (error) {
		if (error.response) {
			if (error.response?.status === 403) {
				forbidden('Bạn không có quyền truy cập vào chức năng này!');
				return { status: 403, data: { message: error.response?.data?.message || 'Forbidden' } };
			} else if (error.response?.status === 401) {
				redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
				return { status: 401, data: { message: error.response?.data?.message || 'Unauthorized' } };
			}
			return {
				status: error.response?.status,
				data: { message: error.response?.data?.message || 'Lỗi không xác định' },
			};
		}
		return { status: 500, data: { message: error.message || 'Lỗi kết nối đến máy chủ' } };
	}
};

export const apiPostBlob = async (url, body, customHeaders = {}) => {
	try {
		const authHeaders = getAuthHeader();

		// Nếu không có auth headers thì chuyển về login
		if (!authHeaders) {
			redirectToLogin('Vui lòng đăng nhập để tiếp tục...');
			return { status: 401, data: { message: 'No auth token' } };
		}

		const headers = {
			'Content-Type': 'application/json',
			...authHeaders,
			...customHeaders,
		};
		const response = await axios.post(url, body, {
			headers,
			responseType: 'blob', // Quan trọng: để nhận binary data
		});
		return response;
	} catch (error) {
		if (error.response) {
			if (error.response?.status === 403) {
				forbidden('Bạn không có quyền truy cập vào chức năng này!');
				return { status: 403, data: { message: error.response?.data?.message || 'Forbidden' } };
			} else if (error.response?.status === 401) {
				return { status: 401, data: { message: error.response?.data?.message || 'Unauthorized' } };
			}
			return {
				status: error.response?.status,
				data: { message: error.response?.data?.message || 'Lỗi không xác định' },
			};
		}
		return { status: 500, data: { message: error.message || 'Lỗi kết nối đến máy chủ' } };
	}
};

export const apiGetBlob = async (url, customHeaders = {}) => {
	try {
		const authHeaders = getAuthHeader();

		// Nếu không có auth headers thì hiển thị redirectToLogin
		if (!authHeaders) {
			redirectToLogin('Vui lòng đăng nhập để tiếp tục...');
			return { status: 401, data: { message: 'No auth token' } };
		}

		const headers = {
			...authHeaders,
			...customHeaders,
		};

		const response = await axios.get(url, {
			headers,
			responseType: 'blob',
		});
		return response;
	} catch (error) {
		if (error.response) {
			if (error.response?.status === 403) {
				forbidden('Bạn không có quyền truy cập vào chức năng này!');
				return { status: 403, data: { message: error.response?.data?.message || 'Forbidden' } };
			} else if (error.response?.status === 401) {
				redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
				return { status: 401, data: { message: error.response?.data?.message || 'Unauthorized' } };
			}
			return {
				status: error.response?.status,
				data: { message: error.response?.data?.message || 'Lỗi không xác định' },
			};
		}
		return { status: 500, data: { message: error.message || 'Lỗi kết nối đến máy chủ' } };
	}
};

// Utility functions để quản lý app uid
export const setAppUid = (appUid) => {
	Cookies.set('appUID', appUid, { expires: 7 }); // Lưu 7 ngày
};

export const getCurrentAppUid = () => {
	return Cookies.get('appUID') || getDefaultAppUid();
};

export const switchToProduction = () => {
	setAppUid(import.meta.env.VITE_APP_UID_PRD);
};

export const switchToDevelopment = () => {
	setAppUid(import.meta.env.VITE_APP_UID_DEV);
};

// Export constants để sử dụng ở các component khác
export const APP_UIDS = {
	PRODUCTION: import.meta.env.VITE_APP_UID_PRD,
	DEVELOPMENT: import.meta.env.VITE_APP_UID_DEV,
};
