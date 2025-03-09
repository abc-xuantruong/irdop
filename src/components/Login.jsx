import * as React from 'react';
const { useContext, useState } = React;
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Cookies from 'js-cookie';
import { GlobalContext } from '../contexts/GlobalContext';
import { use } from 'react';
import { set } from 'date-fns';

const Login = () => {
	const { setCurrentUser, fetchUser } = useContext(GlobalContext);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [count, setCount] = useState(0);

	const navigate = useNavigate();

	const handleLogin = async () => {
		try {
			const response = await axios.post('https://pink.irdop.org/gre134e/auth/login', { email, password });
			if (response.status === 200) {
				toast.success('Đăng nhập thành công!');
				const auth = response.data.session_uid;
				Cookies.set('auth', auth);
				setIsLoading(true);
				document.getElementById('login-container').classList.add('blur');
				setTimeout(() => {
					setIsLoading(false);
					document.getElementById('login-container').classList.remove('blur');
					const newPath = window.location.pathname.replace('/login', '');
					navigate(newPath || '/');
				}, 750);
				setCurrentUser({ identity_name: response.data.identity_name, identity_uid: response.data.identity_uid });
			} else {
			}
		} catch (error) {
			console.error('Error logging in:', error);
			toast.error('Không nhớ thì báo IT dùm, nhập đúng mà vẫn lỗi thì đen thôi!');
		}
	};

	const handleKeyPress = (event) => {
		if (event.key === 'Enter') {
			handleLogin();
		}
	};

	const handleMouseEnter = (event) => {
		setCount((prevCount) => prevCount + 1);
		const multiplier = count >= 15 ? 5 : count >= 10 ? 3 : 1;
		const message = count >= 10 ? 'Xin đấy, nhập đi đừng cố chấp nữa' : 'Đừng cố đăng nhập, đã nhập cái gì đâu!';

		if (email && password) {
			event.target.style.transition = 'none';
			event.target.style.transform = 'none';
			document.getElementById('email').style.borderColor = 'green';
			document.getElementById('password').style.borderColor = 'green';
			event.target.style.transform = 'translate(0, 0)';
			toast.info('Đủ thông tin rồi đấy, bấm đăng nhập thử xem', { autoClose: 1000 });
			return;
		}
		const button = event.target;
		const parent = button.parentElement;
		const parentRect = parent.getBoundingClientRect();
		const buttonRect = button.getBoundingClientRect();

		const maxX = (parentRect.width - buttonRect.width) * multiplier;
		const maxY = (parentRect.height - buttonRect.height) * multiplier;

		let randomX, randomY;
		do {
			randomX = (Math.random() - 0.5) * 2 * maxX;
			randomY = (Math.random() - 0.5) * 2 * maxY;
		} while (Math.abs(randomX - event.clientX) < 50 || Math.abs(randomY - event.clientY) < 50);

		button.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
		button.style.transform = `translate(${randomX}px, ${randomY}px)`;

		toast.info(message, { autoClose: 1000 });
	};

	const handleInputChange = (setter) => (e) => {
		setter(e.target.value);
		const borderColor = e.target.value.trim() !== '' ? 'green' : 'black';
		e.target.style.borderColor = borderColor;

		if (email && password) {
			const button = document.querySelector('button');
			if (button) {
				button.style.transition = 'none';
				button.style.transform = 'translate(0, 0)';
			}
		}
	};

	return (
		<>
			<ToastContainer />
			{isLoading && (
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
					<div className="flex flex-col items-center justify-center min-h-screen">
						<div className="flex space-x-1 pl-5 text-4xl font-bold text-primary">
							<span className="bounce">L</span>
							<span className="bounce">o</span>
							<span className="bounce">a</span>
							<span className="bounce">d</span>
							<span className="bounce">i</span>
							<span className="bounce">n</span>
							<span className="bounce">g</span>
							<span className="bounce">.</span>
							<span className="bounce">.</span>
							<span className="bounce">.</span>
						</div>
					</div>
				</div>
			)}
			<div id="login-container" className="flex items-center justify-center h-full translate-y-1/2">
				<div className="bg-white p-8 rounded shadow-md w-96">
					<h2 className="text-2xl font-bold mb-6 text-center">Đăng nhập</h2>
					<div className="mb-4">
						<label className="block text-gray-700 text-start text-sm font-bold mb-2" htmlFor="email">
							Tài Khoản
						</label>
						<input
							type="email"
							id="email"
							className="w-full px-3 py-2 border rounded bg-white  border-black"
							placeholder="Email"
							value={email}
							onChange={handleInputChange(setEmail)}
							onKeyPress={handleKeyPress}
						/>
					</div>
					<div className="mb-6">
						<label className="block text-gray-700 text-sm font-bold mb-2 text-start" htmlFor="password">
							Mật khẩu
						</label>
						<input
							type="password"
							id="password"
							className="w-full px-3 py-2 border rounded bg-white  border-black"
							placeholder="Password"
							value={password}
							onChange={handleInputChange(setPassword)}
							onKeyPress={handleKeyPress}
						/>
					</div>
					<div className="flex items-center justify-center h-40 w-full relative">
						<button
							className="bg-blue-500 text-white px-4 py-2 rounded font-bold absolute h-fit w-fit"
							onClick={handleLogin}
							onMouseEnter={handleMouseEnter}
						>
							Đăng nhập
						</button>
					</div>
				</div>
			</div>
		</>
	);
};

export default Login;
