import * as React from 'react';
const { useContext } = React;
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/IRDOP-LOGO_FULL.png';
import { GlobalContext } from '../contexts/GlobalContext';
import { apiGet } from '../contexts/helperFunctionCallAPI';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const Header = () => {
	const { currentUser, setCurrentUser, fetchUser } = useContext(GlobalContext);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const navigate = useNavigate();
	const currentPath = window.location.pathname;

	const dropdownRef = React.useRef(null);
	const dropdownButtonRef = React.useRef(null);

	// Check for auth cookie and fetch user info on mount and when auth cookie changes
	useEffect(() => {
		const authCookie = Cookies.get('auth');
		if (!authCookie) {
			setCurrentUser(null);
		} else if (fetchUser && (!currentUser || !currentUser.identity_name)) {
			// Fetch user information if we have an auth cookie but no user info
			fetchUser();
		}
	}, [navigate, setCurrentUser, fetchUser, currentUser]);

	// Add new useEffect to redirect technicians to /processing when user data is loaded
	useEffect(() => {
		// Only perform redirect if user is logged in and roles are defined
		if (currentUser && currentUser.role) {
			// Check if the user is a technician but not an admin
			if (currentUser?.role?.staff_technician && !currentUser?.role?.staff_admin) {
				// Allow access to /processing and /files, redirect from other pages
				if (
					!currentPath.includes('/processing') &&
					!currentPath.includes('/files') &&
					!currentPath.includes('handover')
				) {
					navigate('/processing');
				}
			}
		}
	}, [currentUser, navigate, currentPath]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			// Only close dropdown if click is outside both the dropdown and the trigger button
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target) &&
				dropdownButtonRef.current &&
				!dropdownButtonRef.current.contains(event.target)
			) {
				setDropdownOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [dropdownRef, dropdownButtonRef]);

	const handleLogout = () => {
		// Perform logout actions without being affected by dropdown closing
		setCurrentUser(null);
		Cookies.remove('auth');
		navigate(`/login`);
		// Close dropdown after the actions
		setDropdownOpen(false);
	};
	// Function to navigate and close dropdown
	const handleNavigate = (path) => {
		// Get identityId from cookies
		const identityId = Cookies.get('identityId') || Cookies.get('identityUID');

		// If navigating to /processing and have identityId, add it as filter
		if (path === '/processing' && identityId) {
			navigate(`${path}?technicianId=%5B"${identityId}"%5D`);
		} else {
			navigate(path);
		}
		setDropdownOpen(false);
	};

	// Function to handle logo click
	const handleLogoClick = () => {
		if (currentPath === '/' || currentPath === '/dashboard') {
			window.location.reload();
		} else {
			navigate('/');
		}
	};

	// Truncate identity name for display if needed
	const displayName = currentUser?.identity_name
		? currentUser.identity_name.length > 60
			? currentUser.identity_name.substring(0, 60) + '...'
			: currentUser.identity_name
		: 'Tài khoản';

	// Helper function to determine if "Tiếp nhận" link should be shown
	const shouldShowReception = () => {
		return !(currentUser?.role?.staff_technician && !currentUser?.role?.staff_admin);
	};

	// Helper function to get link with technicianId filter
	const getLinkWithFilter = (path) => {
		const identityId = Cookies.get('identityId') || Cookies.get('identityUID');
		if (path === '/processing' && identityId) {
			return `${path}?technicianId=%5B"${identityId}"%5D`;
		}
		return path;
	};

	return (
		<div className="w-screen bg-white border-b shadow flex justify-center items-center relative z-50">
			{' '}
			<div className="flex justify-between items-center w-full px-5 ">
				<div className="text-2xl font-bold">
					<img src={logo} alt="Logo" className="h-14 py-2 cursor-pointer " onClick={handleLogoClick} />
				</div>
				{/* Desktop Navigation - Hidden on mobile */}
				<div className="md:flex items-center hidden">
					{currentPath.includes('/intra-h1y25-c1') ? (
						<Link to="/" className="ml-4 text-md text-primary font-medium">
							Tiếp nhận
						</Link>
					) : (
						<>
							<a
								href="https://chat.irdop.org/"
								target="_blank"
								rel="noopener noreferrer"
								className="cursor-pointer md:text-md ml-4 text-md font-medium text-teritary hover:text-primary"
							>
								Chat AI
							</a>
							<Link
								to={getLinkWithFilter('/processing')}
								className={`cursor-pointer md:text-md ml-4 text-md font-medium ${
									currentPath.includes('/processing') ? 'text-primary' : 'text-teritary hover:text-primary'
								}`}
							>
								Lab
							</Link>
							{shouldShowReception() && (
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
							)}{' '}
							<Link
								to="/handover-dashboard"
								className={`cursor-pointer md:text-md ml-4 text-md font-medium ${
									currentPath.includes('/handover-dashboard') ? 'text-primary' : 'text-teritary hover:text-primary'
								}`}
							>
								Bàn giao
							</Link>
							<Link
								to="/progress"
								className={`cursor-pointer md:text-md ml-4 text-md font-medium ${
									currentPath.includes('/progress') ? 'text-primary' : 'text-teritary hover:text-primary'
								}`}
							>
								Tiến trình
							</Link>
							<Link
								to="/library"
								className={`cursor-pointer md:text-md ml-4 text-md font-medium ${
									currentPath.includes('/library') ? 'text-primary' : 'text-teritary hover:text-primary'
								}`}
							>
								Thư viện
							</Link>
							<Link
								to="/files"
								className={`cursor-pointer md:text-md ml-4 text-md font-medium ${
									currentPath.includes('/files') ? 'text-primary' : 'text-teritary hover:text-primary'
								}`}
							>
								Files
							</Link>
						</>
					)}
					<div className="relative flex items-center">
						{currentPath.includes('/login') ? (
							<p className="text-primary  cursor-pointer text-end ml-4 text-lg font-semibold">Tài khoản</p>
						) : (
							<>
								<div className="relative flex items-center">
									{' '}
									<p
										ref={dropdownButtonRef}
										className="text-primary cursor-pointer text-end ml-8 text-md mb-0.5 font-semibold"
										onClick={() => setDropdownOpen(!dropdownOpen)}
									>
										{displayName}
									</p>
								</div>
								{dropdownOpen && (
									<div
										ref={dropdownRef}
										className="absolute right-0 top-full mt-3 w-52 bg-white border rounded shadow-lg z-10"
									>
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
							<div className="relative flex items-center">
								{' '}
								<p
									className="text-primary cursor-pointer text-end text-lg font-semibold"
									onClick={() => setDropdownOpen(!dropdownOpen)}
								>
									{displayName}
								</p>
							</div>
							<div
								className={`fixed top-0 right-0 h-full w-60 bg-white border-l shadow-lg z-50 transition-transform duration-300 ease-in-out transform ${
									dropdownOpen ? 'translate-x-0' : 'translate-x-full'
								}`}
							>
								<div className="flex flex-col w-full h-full">
									<div className="p-2 pl-3 border-b-2 bg-gray-50 flex justify-between items-center">
										<p className="text-base font-medium truncate w-full text-start">{displayName}</p>
										<button
											onClick={() => setDropdownOpen(false)}
											className="text-gray-500 hover:text-gray-700 p-2"
										></button>
									</div>
									<div className="flex flex-col w-full">
										<button
											onClick={() => window.open('https://chat.irdop.org/', '_blank')}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
										>
											Chat AI
										</button>
										<button
											onClick={() => handleNavigate('/processing')}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
										>
											Lab
										</button>
										<button
											onClick={() => handleNavigate('/handover-dashboard')}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
										>
											Bàn giao
										</button>
										<button
											onClick={() => handleNavigate('/progress')}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
										>
											Tiến trình
										</button>
										{shouldShowReception() && (
											<button
												onClick={() => handleNavigate('/dashboard')}
												className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
											>
												Tiếp nhận
											</button>
										)}{' '}
										<button
											onClick={() => handleNavigate('/library')}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
										>
											Thư viện
										</button>
										<button
											onClick={() => handleNavigate('/files')}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 border-b-gray-200 rounded-none hover:rounded-lg"
										>
											Files
										</button>
										<button
											onClick={handleLogout}
											className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 mt-auto"
										>
											Đăng xuất
										</button>
									</div>
								</div>
							</div>{' '}
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
