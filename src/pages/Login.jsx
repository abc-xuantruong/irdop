import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';
import axios from 'axios';

const Login = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');
		try {
			const response = await axios.post('https://pink.irdop.org/gre134e/auth/login', {
				email,
				password,
			});

			// Check if status code is >= 300, show error message
			if (response.statusCode && response.statusCode >= 300) {
				const errorMessage = response.message || 'Login failed. Please try again.';
				Swal.fire({
					icon: 'error',
					title: 'Login Failed',
					text: errorMessage,
				});
				setError(errorMessage);
				setIsLoading(false);
				return;
			}

			const auth = response.data?.session_uid;
			const appUID = response.data?.app_uid;
			const identityName = response.data?.identity_name;
			const identityUID = response.data?.identity_uid;

			Cookies.set('auth', auth);
			Cookies.set('appUID', appUID);
			Cookies.set('identityUID', identityUID);
			Cookies.set('identityName', identityName);

			// Show success message with SweetAlert2
			Swal.fire({
				icon: 'success',
				title: 'Login Successful',
				text: 'You have been successfully logged in!',
				timer: 1500,
				showConfirmButton: false,
			}).then(() => {
				navigate('/');
			});
		} catch (err) {
			// Show error message with SweetAlert2
			const errorMessage = err.message || 'Login failed. Please check your credentials.';
			Swal.fire({
				icon: 'error',
				title: 'Login Failed',
				text: errorMessage,
			});
			setError(errorMessage);
			console.error('Login error:', err);
		} finally {
			setIsLoading(false);
		}
	};
	return (
		<div className="fixed inset-0 flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full mx-4">
				<div className="bg-white p-10 rounded-lg shadow-xl min-h-[500px] flex flex-col justify-center">
					<h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Login</h2>
					{error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 text-start">
								Email
							</label>
							<input
								type="text"
								id="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter your email or identity UID"
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
								required
							/>
						</div>
						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 text-start">
								Password
							</label>
							<input
								type="password"
								id="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter your password"
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
								required
							/>
						</div>
						<button
							type="submit"
							className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
							disabled={isLoading}
						>
							{isLoading ? 'Logging in...' : 'Login'}{' '}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default Login;
