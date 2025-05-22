import axios from 'axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';

const getAuthHeader = () => {
	const authToken = Cookies.get('auth');
	return authToken ? { Authorization: `Bearer ${authToken}` } : {};
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
		window.location.href = `${window.location.href.split('/').slice(0, -1).join('/')}/login`;
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

export const checkAuth = async () => {};

export const apiGet = async (url, customHeaders = {}) => {
	try {
		let response = { status: 200 };
		const auth_token = getAuthHeader();
		if (!auth_token) {
			redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
			return { status: 401, data: { message: 'Unauthorized' } };
		}

		const auth = await axios.post('https://pink.irdop.org/ab4dg2/auth/me', {}, { headers });

		const expiry_date = new Date(auth.data.session_expiry);

		// Kiểm tra session hết hạn
		if (auth.statusCode === 403) {
			forbidden('Bạn không có quyền truy cập vào chức năng này!');
			return { status: 403, data: { message: 'Forbidden' } };
		} else if (expiry_date < Date.now() || auth.statusCode === 401) {
			redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
			return { status: 401, data: { message: 'Session expired' } };
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
		let response = { status: 200 };
		const auth_token = getAuthHeader();

		if (!auth_token) {
			redirectToLogin('Bạn chưa đăng nhập! Chuyển hướng sau 1 giây...');
			return { status: 401, data: { message: 'Unauthorized' } };
		}

		const auth = await axios.post('https://pink.irdop.org/ab4dg2/auth/me', {}, { headers });

		const expiry_date = new Date(auth.data.session_expiry);

		// Kiểm tra session hết hạn
		if (expiry_date < Date.now()) {
			redirectToLogin('Phiên đăng nhập đã hết hạn! Chuyển hướng sau 1 giây...');
			return { status: 401, data: { message: 'Session expired' } };
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
