import axios from 'axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';

const getAuthHeader = () => {
	const authToken = Cookies.get('auth');
	const identityUID = Cookies.get('identityUID');

	console.log('Retrieved cookies:', { authToken, identityUID });

	const headers = {};

	if (authToken && authToken !== 'undefined') {
		headers.Authorization = `Bearer ${authToken}`;
	}
	if (identityUID) {
		headers['identity-uid'] = identityUID;
	}

	return headers;
};

const redirectToLogin = (message) => {
	Swal.fire({
		icon: 'warning',
		title: 'Thông báo',
		text: message,
		timer: 2000,
		showConfirmButton: false,
	}).then(() => {
		window.location.href = '/login';
	});
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

		const headers = {
			'Content-Type': 'application/json',
			...authHeaders,
			'x-fh-app-uid': 'LIMS-IRDOP-PRD',
			'x-fh-access-key': 'lELlAk8o5fmUgvJRYhvf',
		};

		await axios.post('https://pink.irdop.org/ab4dg2/auth/me', {}, { headers });
		return { status: 200, data: { message: 'Session valid' } };
	} catch (error) {
		console.error('Auth check error:', error.message);
		redirectToLogin('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại...');
		return { status: 401, data: { message: 'Session expired' } };
	}
};

export const apiGet = async (url, customHeaders = {}) => {
	try {
		const authHeaders = getAuthHeader();

		// Chỉ gửi API khi có Authorization header
		if (!authHeaders.Authorization) {
			console.log('No Authorization header found, returning null');
			return null;
		}

		await checkAuth(); // Kiểm tra xác thực trước khi gửi yêu cầu

		const headers = {
			'Content-Type': 'application/json',
			...authHeaders,
			'x-fh-app-uid': 'LIMS-IRDOP-PRD',
			'x-fh-access-key': 'lELlAk8o5fmUgvJRYhvf',
			...customHeaders,
		};

		const response = await axios.get(url, { headers });
		
		console.log('GET request successful:', response.data);
		return response;
	} catch (error) {
		console.error('GET request error:', error.message, { url, response: error.response?.data });
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

export const apiPost = async (url, body, customHeaders = {}) => {
	try {
		const authHeaders = getAuthHeader();

		// Chỉ gửi API khi có Authorization header
		if (!authHeaders.Authorization) {
			console.log('No Authorization header found, returning null');
			return null;
		}

		await checkAuth(); // Kiểm tra xác thực trước khi gửi yêu cầu

		const headers = {
			'Content-Type': 'application/json',
			...authHeaders,
			'x-fh-app-uid': 'LIMS-IRDOP-PRD',
			'x-fh-access-key': 'lELlAk8o5fmUgvJRYhvf',
			...customHeaders,
		};

		const response = await axios.post(url, body, { headers });

		return response;
	} catch (error) {
		console.error(error);
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

export const apiPut = async (url, body, customHeaders = {}) => {
	try {
		const authHeaders = getAuthHeader();

		// Chỉ gửi API khi có Authorization header
		if (!authHeaders.Authorization) {
			console.log('No Authorization header found, returning null');
			return null;
		}

		const headers = {
			'Content-Type': 'application/json',
			...authHeaders,
			'x-fh-app-uid': 'LIMS-IRDOP-PRD',
			'x-fh-access-key': 'lELlAk8o5fmUgvJRYhvf',
			...customHeaders,
		};

		const response = await axios.put(url, body, { headers });
		return response;
	} catch (error) {
		console.error('PUT request error:', error.message, { url, response: error.response?.data });
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

export const apiGetBlob = async (url, customHeaders = {}) => {
	try {
		const authHeaders = getAuthHeader();

		// Chỉ gửi API khi có Authorization header
		if (!authHeaders.Authorization) {
			console.log('No Authorization header found, returning null');
			return null;
		}

		const headers = {
			...authHeaders,
			'x-fh-app-uid': 'LIMS-IRDOP-PRD',
			'x-fh-access-key': 'lELlAk8o5fmUgvJRYhvf',
			...customHeaders,
		};

		const response = await axios.get(url, {
			headers,
			responseType: 'blob',
		});
		return response;
	} catch (error) {
		console.error('GET blob request error:', error.message, { url, response: error.response?.data });
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
