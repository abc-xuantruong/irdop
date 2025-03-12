import * as React from 'react';
const { useContext } = React;
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/IRDOP-LOGO .png';
import { GlobalContext } from '../contexts/GlobalContext';
import { useState } from 'react';
import Cookies from 'js-cookie';

const Header = () => {
	const { currentUser, setCurrentUser, fetchUser } = useContext(GlobalContext);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const navigate = useNavigate();
	const currentPath = window.location.pathname;

	const dropdownRef = React.useRef(null);

	React.useEffect(() => {
		if (!Cookies.get('auth')) {
			setCurrentUser(null);
			navigate(`/login`);
		}
	}, []);

	React.useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setDropdownOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [dropdownRef]);

	const handleLogout = () => {
		setDropdownOpen(false);
		setCurrentUser(null);
		Cookies.remove('auth');
		navigate(`/login`);
	};

	// Function to navigate and close dropdown
	const handleNavigate = (path) => {
		navigate(path);
		setDropdownOpen(false);
	};

	// Truncate identity name for display if needed
	const displayName = currentUser?.identity_name
		? currentUser.identity_name.length > 60
			? currentUser.identity_name.substring(0, 60) + '...'
			: currentUser.identity_name
		: 'Tài khoản';

	return (
		<div className="w-screen bg-white border-b shadow flex justify-center items-center ">
			<div className="flex justify-between items-center w-full 2xl:max-w-screen-2xl xl:max-w-screen-xl lg:max-w-screen-lg md:max-w-screen-md sm:max-w-screen-sm  max-w-sm ">
				<div className="text-2xl font-bold">
					<img src={logo} alt="Logo" className="h-14 py-2 cursor-pointer " onClick={() => navigate('/')} />
				</div>
				{/* Desktop Navigation - Hidden on mobile */}
				<div className="md:flex items-center hidden">
					{currentPath.includes('/intra-h1y25-c1') ? (
						<Link to="/" className="ml-4 text-md text-primary font-medium">
							Tiếp nhận
						</Link>
					) : (
						<>
							<Link
								to="/processing"
								className={`cursor-pointer md:text-md ml-4 text-md font-medium ${
									currentPath.includes('/processing') ? 'text-primary' : 'text-teritary hover:text-primary'
								}`}
							>
								Lab
							</Link>

							<Link
								to="/dashboard"
								className={`cursor-pointer md:text-md ml-4 text-md font-medium ${
									currentPath === '/' || currentPath.includes('/dashboard')
										? 'text-primary'
										: 'text-teritary hover:text-primary'
								}`}
							>
								Tiếp nhận
							</Link>

							<Link
								to="/library"
								className={`cursor-pointer md:text-md ml-4 text-md font-medium ${
									currentPath.includes('/library') ? 'text-primary' : 'text-teritary hover:text-primary'
								}`}
							>
								Thư viện
							</Link>
						</>
					)}
					<div className="relative flex items-center " ref={dropdownRef}>
						{currentPath.includes('/login') ? (
							<p className="text-primary  cursor-pointer text-end ml-4 text-lg font-semibold">Tài khoản</p>
						) : (
							<>
								<p
									className="text-primary cursor-pointer text-end ml-8 text-xl mb-0.5 font-semibold"
									onClick={() => setDropdownOpen(!dropdownOpen)}
								>
									{displayName}
								</p>
								{dropdownOpen && (
									<div className="absolute right-0 top-full mt-3 w-52 bg-white border rounded shadow-lg z-10">
										<p
											className="p-1 border-b text-base font-medium text-start"
											onClick={() => setDropdownOpen(!dropdownOpen)}
										>
											{displayName}
										</p>
										<button
											onClick={handleLogout}
											className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 h-full text-center"
										>
											Đăng xuất
										</button>
									</div>
								)}
							</>
						)}
					</div>
				</div>

				{/* Mobile Navigation - Only show user name with fly-in dropdown */}
				<div className="md:hidden relative flex items-center justify-end" ref={dropdownRef}>
					{currentPath.includes('/login') ? (
						<p className="text-primary cursor-pointer text-end text-lg font-semibold">Tài khoản</p>
					) : (
						<>
							<p
								className="text-primary cursor-pointer text-end text-lg font-semibold"
								onClick={() => setDropdownOpen(!dropdownOpen)}
							>
								{displayName}
							</p>
							<div
								className={`fixed top-0 right-0 h-full w-60 bg-white border-l shadow-lg z-50 transition-transform duration-300 ease-in-out transform ${
									dropdownOpen ? 'translate-x-0' : 'translate-x-full'
								}`}
							>
								<div className="flex flex-col w-full h-full">
									<div className="p-2 pl-3 border-b-2 bg-gray-50 flex justify-between items-center">
										<p className="text-base font-medium truncate w-full text-start">{displayName}</p>
										<button onClick={() => setDropdownOpen(false)} className="text-gray-500 hover:text-gray-700 p-2">
											✕
										</button>
									</div>
									<div className="flex flex-col w-full">
										<button
											onClick={() => handleNavigate('/processing')}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
										>
											Lab
										</button>
										<button
											onClick={() => handleNavigate('/dashboard')}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
										>
											Tiếp nhận
										</button>
										<button
											onClick={() => handleNavigate('/library')}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
										>
											Thư viện
										</button>
										<button
											onClick={handleLogout}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 mt-auto"
										>
											Đăng xuất
										</button>
									</div>
								</div>
							</div>
							{/* Semi-transparent overlay when menu is open */}
							{dropdownOpen && (
								<div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setDropdownOpen(false)}></div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default Header;
