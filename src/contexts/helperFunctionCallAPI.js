import axios from 'axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';

const getAuthHeader = () => {
	const authToken = Cookies.get('auth');
	return authToken ? { Authorization: `Bearer ${authToken}` } : {};
};

const redirectToLogin = (message) => {
	Swal.fire({
		icon: 'warning',
		title: 'Thông báo',
		text: message,
		timer: 1500, // Tự đóng sau 1.5 giây
		showConfirmButton: false,
	}).then(() => {
		window.location.href = `${window.location.origin}/login`;
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

export const apiGet = async (url, headers = {}) => {
	try {
		let response = { status: 200 };
		const auth_token = getAuthHeader();
		if (!auth_token) {
			redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
			return { status: 401, data: { message: 'Unauthorized' } };
		}

		const auth = await axios.post('https://pink.irdop.org/ab4dg2/auth/me', {}, { headers: { ...getAuthHeader() } });
		console.log('Auth:', auth);

		const expiry_date = new Date(auth.data.session_expiry);

		// Kiểm tra session hết hạn
		if (auth.statusCode === 403) {
			forbidden('Bạn không có quyền truy cập vào chức năng này!');
			return { status: 403, data: { message: 'Forbidden' } };
		} else if (expiry_date < Date.now() || auth.statusCode === 401) {
			redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
			return { status: 401, data: { message: 'Session expired' } };
		}

		response = await axios.get(url, { headers: { ...getAuthHeader(), ...headers } });
		return response;
	} catch (error) {
		console.error('GET request error:', error);
		if (error.status === 403) {
			forbidden('Bạn không có quyền truy cập vào chức năng này!');
			return { status: 403, data: { message: 'Forbidden' } };
		} else if (error.status === 401) {
			redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
			return { status: 401, data: { message: 'Unauthorized' } };
		}
	}
};

export const apiPost = async (url, body, headers = {}) => {
	try {
		let response = { status: 200 };
		const auth_token = getAuthHeader();

		if (!auth_token) {
			redirectToLogin('Bạn chưa đăng nhập! Chuyển hướng sau 1 giây...');
			return { status: 401, data: { message: 'Unauthorized' } };
		}

		const auth = await axios.post('https://pink.irdop.org/ab4dg2/auth/me', {}, { headers: { ...getAuthHeader() } });

		const expiry_date = new Date(auth.data.session_expiry);

		// Kiểm tra session hết hạn
		if (expiry_date < Date.now()) {
			redirectToLogin('Phiên đăng nhập đã hết hạn! Chuyển hướng sau 1 giây...');
			return { status: 401, data: { message: 'Session expired' } };
		}

		response = await axios.post(url, body, { headers: { ...getAuthHeader(), ...headers } });
		return response;
	}  catch (error) {
		console.error('GET request error:', error);
		if (error.status === 403) {
			forbidden('Bạn không có quyền truy cập vào chức năng này!');
			return { status: 403, data: { message: 'Forbidden' } };
		} else if (error.status === 401) {
			redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
			return { status: 401, data: { message: 'Unauthorized' } };
		}
	}
};
