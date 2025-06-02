import axios from 'axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';

const getAuthHeader = () => {
	const authToken = Cookies.get('auth');
	const identityUID = Cookies.get('identityUID');
	const identityName = Cookies.get('identityName');
	return authToken
		? {
				Authorization: `Bearer ${authToken}`,
				'identity-uid': identityUID,
				'identity-name': identityName,
		  }
		: {};
};
const headers = {
	'Content-Type': 'application/json',
	...getAuthHeader(),
	'x-fh-app-uid': 'LIMS-IRDOP-PRD',
	'x-fh-access-key': 'lELlAk8o5fmUgvJRYhvf',
};

const redirectToLogin = (message) => {
	Swal.fire({
		icon: 'warning',
		title: 'Thông báo',
		text: message,
		timer: 2000, // Tự đóng sau 1.5 giây
		showConfirmButton: false,
	}).then(() => {
		// window.location.href = `${window.location.href.split('/').slice(0, -1).join('/')}/login`;
	});
};

const forbidden = (message) => {
	Swal.fire({
		icon: 'warning',
		title: 'Thông báo',
		text: message,
		timer: 1500, // Tự đóng sau 1.5 giây
		showConfirmButton: false,
	});
};

export const checkAuth = async () => {
	try {
		const auth = await axios.post('https://pink.irdop.org/ab4dg2/auth/me', {}, { headers: { ...getAuthHeader() } });

		const expiry_date = new Date(auth.data.session_expiry);

		// Kiểm tra session hết hạn
		if (expiry_date < Date.now() || auth.statusCode === 401) {
			redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
			return { status: 401, data: { message: 'Session expired' } };
		}

		return { status: 200, data: { message: 'Session valid' } };
	} catch (error) {
		console.error('Auth check error:', error);
		redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
		return { status: 401, data: { message: 'Session expired' } };
	}
};

export const apiGet = async (url, customHeaders = {}) => {
	try {
		// Kiểm tra authentication trước khi gọi API
		const authCheck = await checkAuth();
		if (authCheck.status !== 200) {
			return authCheck;
		}

		let response = { status: 200 };
		const auth_token = getAuthHeader();
		if (!auth_token) {
			redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
			return { status: 401, data: { message: 'Unauthorized' } };
		}

		response = await axios.get(url, { headers: { ...headers, ...customHeaders } });
		return response;
	} catch (error) {
		console.error('GET request error:', error);
		if (error.response) {
			if (error.response.status === 403) {
				forbidden('Bạn không có quyền truy cập vào chức năng này!');
				return { status: 403, data: { message: error.response.data?.message || 'Forbidden' } };
			} else if (error.response.status === 401) {
				redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
				return { status: 401, data: { message: error.response.data?.message || 'Unauthorized' } };
			} else {
				// Return the error message from the server if available
				return {
					status: error.response.status,
					data: { message: error.response.data?.message || error.message || 'Lỗi không xác định' },
				};
			}
		}
		// Handle network errors or other issues
		return { status: 500, data: { message: error.message || 'Lỗi kết nối đến máy chủ' } };
	}
};

export const apiPost = async (url, body, customHeaders = {}) => {
	try {
		// Kiểm tra authentication trước khi gọi API
		const authCheck = await checkAuth();
		if (authCheck.status !== 200) {
			return authCheck;
		}

		let response = { status: 200 };
		const auth_token = getAuthHeader();

		if (!auth_token) {
			redirectToLogin('Bạn chưa đăng nhập! Chuyển hướng sau 1 giây...');
			return { status: 401, data: { message: 'Unauthorized' } };
		}

		response = await axios.post(url, body, { headers: { ...headers, ...customHeaders } });
		return response;
	} catch (error) {
		console.error('POST request error:', error);
		if (error.response) {
			if (error.response.status === 403) {
				forbidden('Bạn không có quyền truy cập vào chức năng này!');
				return { status: 403, data: { message: error.response.data?.message || 'Forbidden' } };
			} else if (error.response.status === 401) {
				redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
				return { status: 401, data: { message: error.response.data?.message || 'Unauthorized' } };
			} else {
				// Return the error message from the server if available
				return {
					status: error.response.status,
					data: { message: error.response.data?.message || error.message || 'Lỗi không xác định' },
				};
			}
		}
		// Handle network errors or other issues
		return { status: 500, data: { message: error.message || 'Lỗi kết nối đến máy chủ' } };
	}
};

export const apiPut = async (url, body, customHeaders = {}) => {
	try {
		// Kiểm tra authentication trước khi gọi API
		const authCheck = await checkAuth();
		if (authCheck.status !== 200) {
			return authCheck;
		}

		let response = { status: 200 };
		const auth_token = getAuthHeader();

		if (!auth_token) {
			redirectToLogin('Bạn chưa đăng nhập! Chuyển hướng sau 1 giây...');
			return { status: 401, data: { message: 'Unauthorized' } };
		}

		response = await axios.put(url, body, { headers: { ...headers, ...customHeaders } });
		return response;
	} catch (error) {
		console.error('PUT request error:', error);
		if (error.response) {
			if (error.response.status === 403) {
				forbidden('Bạn không có quyền truy cập vào chức năng này!');
				return { status: 403, data: { message: error.response.data?.message || 'Forbidden' } };
			} else if (error.response.status === 401) {
				redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
				return { status: 401, data: { message: error.response.data?.message || 'Unauthorized' } };
			} else {
				return {
					status: error.response.status,
					data: { message: error.response.data?.message || error.message || 'Lỗi không xác định' },
				};
			}
		}
		return { status: 500, data: { message: error.message || 'Lỗi kết nối đến máy chủ' } };
	}
};
