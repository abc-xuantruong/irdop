import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
	FaFlask,
	FaClipboardList,
	FaBook,
	FaFolder,
	FaUser,
	FaChevronDown,
	FaEdit,
	FaFileAlt,
	FaVial,
	FaMicroscope,
	FaDatabase,
	FaExchangeAlt,
} from 'react-icons/fa';
import { MdEditDocument } from 'react-icons/md';
import { FaBoxesPacking } from 'react-icons/fa6';
import ProcessingAnalysis from '../components/lab/ProcessingAnalysis';
import ProcessingSampleV2 from '../components/lab/ProcessingSampleV2';
import DocumentEditor from '../components/lab/DocumentEditor';
import ExperimentLog from '../components/lab/ExperimentLog';
import { GlobalContext } from '../contexts/GlobalContext';
import Cookies from 'js-cookie';

const LabDashboardTemporary = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const currentPath = location.pathname;

	// Use GlobalContext instead of local state
	const { currentUser, setCurrentUser, fetchUser } = useContext(GlobalContext);

	// Get current view from query params (default: analysis)
	const searchParams = new URLSearchParams(location.search);
	const currentView = searchParams.get('view') || 'analysis';

	// Local state
	const [userDropdownOpen, setUserDropdownOpen] = useState(false);

	// Tooltip state
	const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

	// Refs
	const dropdownRef = useRef(null);
	const dropdownButtonRef = useRef(null);

	// Check for auth cookie and fetch user info on mount and when auth cookie changes
	useEffect(() => {
		const authCookie = Cookies.get('auth');

		if (!authCookie) {
			setCurrentUser(null);
		} else if (!currentUser || !currentUser.identity_name) {
			// Fetch user information if we have an auth cookie but no user info
			if (fetchUser) {
				fetchUser();
			}
		}
	}, [setCurrentUser, fetchUser, currentUser]);

	// Handle logout
	const handleLogout = () => {
		setCurrentUser(null);
		Cookies.remove('auth');
		navigate('/login');
		setUserDropdownOpen(false);
	};

	// Handle click outside dropdown
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target) &&
				dropdownButtonRef.current &&
				!dropdownButtonRef.current.contains(event.target)
			) {
				setUserDropdownOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Handle tooltip
	const showTooltip = (content, event) => {
		const rect = event.currentTarget.getBoundingClientRect();
		setTooltip({
			show: true,
			content,
			x: rect.right + 10,
			y: rect.top + rect.height / 2,
		});
	};

	const hideTooltip = () => {
		setTooltip({ show: false, content: '', x: 0, y: 0 });
	};

	// Handle view navigation
	const handleViewChange = (view) => {
		// Clear all query params and only set the view
		navigate(`${location.pathname}?view=${view}`);
	};

	// Navigation items
	const navigationItems = [
		{
			action: () => handleViewChange('analysis'),
			icon: FaVial,
			label: 'Lab',
			isActive: currentView === 'analysis',
			isAction: true,
		},
		{
			action: () => handleViewChange('sample'),
			icon: FaBoxesPacking,
			label: 'Mẫu xử lý',
			isActive: currentView === 'sample',
			isAction: true,
		},
		{
			action: () => handleViewChange('editor'),
			icon: MdEditDocument,
			label: 'Soạn thảo',
			isActive: currentView === 'editor',
			isAction: true,
		},
		{
			action: () => handleViewChange('experiment'),
			icon: FaDatabase,
			label: 'Dữ liệu thử nghiệm',
			isActive: currentView === 'experiment',
			isAction: true,
		},
	];

	// Bottom navigation items
	const bottomNavigationItems = [
		{
			to: '/handover-dashboard',
			icon: FaExchangeAlt,
			label: 'Bàn giao',
			isActive: currentPath.includes('/handover-dashboard'),
		},
		{
			to: '/dashboard',
			icon: FaClipboardList,
			label: 'Tiếp nhận',
			isActive: currentPath === '/' || currentPath.includes('/dashboard'),
		},
		{ to: '/library', icon: FaBook, label: 'Thư viện', isActive: currentPath.includes('/library') },
		{ to: '/files', icon: FaFolder, label: 'Files', isActive: currentPath.includes('/files') },
	];

	// Truncate name for display
	const displayName = currentUser?.identity_name
		? currentUser.identity_name.length > 20
			? currentUser.identity_name.substring(0, 20) + '...'
			: currentUser.identity_name
		: 'Tài khoản';

	return (
		<div className="h-screen w-screen bg-gray-100 flex overflow-hidden">
			{/* Sidebar */}
			<div className="w-16 bg-gray-200 flex flex-col h-full">
				{/* Top Section - Logo and Navigation */}
				<div className="flex-1 flex flex-col">
					{/* Logo Section */}
					<div className="p-3 border-b border-gray-200">
						<img
							src="https://irdop.org/wp-content/uploads/2024/07/416333459_918989026598929_7536651727234700897_n-removebg-preview.png"
							alt="Logo"
							className="h-10 w-10 mx-auto object-contain"
						/>
					</div>

					{/* Main Navigation */}
					<div className="p-2 pt-4">
						<nav className="space-y-2">
							{navigationItems.map((item, index) => {
								const IconComponent = item.icon;
								return item.isAction ? (
									<button
										key={index}
										onClick={item.action}
										className={`w-12 h-12 p-1 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
											item.isActive ? 'bg-sky-400 text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
										}`}
										onMouseEnter={(e) => showTooltip(item.label, e)}
										onMouseLeave={hideTooltip}
									>
										<IconComponent className="w-5 h-5" />
									</button>
								) : (
									<Link
										key={item.to}
										to={item.to}
										className={`w-12 h-12 p-1 flex items-center justify-center rounded-lg text-sm font-medium transition-colors relative ${
											item.isActive ? 'bg-sky-400 text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
										}`}
										onMouseEnter={(e) => showTooltip(item.label, e)}
										onMouseLeave={hideTooltip}
									>
										<IconComponent className="w-5 h-5" />
									</Link>
								);
							})}
						</nav>
					</div>
				</div>

				{/* Middle Section - Bottom Navigation */}
				<div className="p-2 border-t border-gray-200">
					{/* Chat AI Button */}
					<button
						onClick={() => window.open('https://chat.irdop.org/', '_blank')}
						className="w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors relative bg-gray-100 text-gray-600 hover:bg-gray-300 hover:text-blue-600 mb-2"
						onMouseEnter={(e) => showTooltip('CHAT', e)}
						onMouseLeave={hideTooltip}
					>
						<span className="text-md font-bold">CHAT</span>
					</button>
					<nav className="space-y-2">
						{bottomNavigationItems.map((item, index) => {
							const IconComponent = item.icon;
							return (
								<Link
									key={item.to}
									to={item.to}
									className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors relative bg-gray-100 ${
										item.isActive ? 'bg-sky-400 text-white' : 'text-gray-600 hover:bg-gray-300 hover:text-blue-600'
									}`}
									onMouseEnter={(e) => showTooltip(item.label, e)}
									onMouseLeave={hideTooltip}
								>
									<IconComponent className="w-5 h-5" />
								</Link>
							);
						})}
					</nav>
				</div>

				{/* Bottom Section - User Info */}
				<div className="p-2 border-t border-gray-200">
					<div className="relative">
						{currentUser ? (
							<>
								<button
									ref={dropdownButtonRef}
									onClick={() => setUserDropdownOpen(!userDropdownOpen)}
									className="w-12 h-12 p-1 bg-blue-200 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors"
									onMouseEnter={(e) => showTooltip(displayName, e)}
									onMouseLeave={hideTooltip}
								>
									<FaUser className="w-5 h-5" />
								</button>

								{/* User Dropdown */}
								{userDropdownOpen && (
									<div
										ref={dropdownRef}
										className="absolute bottom-full left-16 mb-2 w-64 bg-white border rounded-lg shadow-lg z-50"
									>
										{/* User Info */}
										<div className="p-4 border-b">
											<div className="flex items-center space-x-3">
												<div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
													<FaUser className="w-5 h-5" />
												</div>
												<div className="flex-1">
													<p className="text-sm font-medium text-gray-900 truncate">{currentUser.identity_name}</p>
													<p className="text-xs text-gray-500">{currentUser.identity_uid}</p>
												</div>
											</div>

											{/* Role Info */}
											<div className="mt-3 text-xs text-gray-600">
												<div className="flex flex-wrap gap-1">
													{currentUser.role?.staff_admin && (
														<span className="px-2 py-1 bg-red-100 text-red-700 rounded">Admin</span>
													)}
													{currentUser.role?.staff_technician && (
														<span className="px-2 py-1 bg-green-100 text-green-700 rounded">Technician</span>
													)}
													{currentUser.role?.staff_accountant && (
														<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Accountant</span>
													)}
													{currentUser.role?.staff_sampleManager && (
														<span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Sample Manager</span>
													)}
												</div>
											</div>
										</div>

										{/* Logout Button */}
										<div className="p-2">
											<button
												onClick={handleLogout}
												className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
											>
												Đăng xuất
											</button>
										</div>
									</div>
								)}
							</>
						) : (
							<Link
								to="/login"
								className="w-12 h-12 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-300 hover:text-blue-600 transition-colors"
								onMouseEnter={(e) => showTooltip('Đăng nhập', e)}
								onMouseLeave={hideTooltip}
							>
								<FaUser className="w-5 h-5" />
							</Link>
						)}
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 bg-white overflow-y-hidden overflow-x-auto">
				{currentView === 'editor' ? (
					<div className="h-full flex flex-col">
						<div className="flex-1 overflow-hidden p-4">
							<DocumentEditor />
						</div>
					</div>
				) : currentView === 'experiment' ? (
					<div className="h-full flex flex-col">
						<div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
							<ExperimentLog />
						</div>
					</div>
				) : currentView === 'sample' ? (
					<div className="h-full flex flex-col">
						<div className="flex-1 overflow-y-auto scrollbar-hide">
							<ProcessingSampleV2 />
						</div>
					</div>
				) : (
					<ProcessingAnalysis />
				)}
			</div>

			{/* Tooltip */}
			{tooltip.show && (
				<div
					className="fixed bg-gray-900 text-white text-sm px-2 py-1 rounded shadow-lg z-50 pointer-events-none"
					style={{
						left: tooltip.x,
						top: tooltip.y - 12,
						transform: 'translateY(-50%)',
					}}
				>
					{tooltip.content}
					<div
						className="absolute top-1/2 left-0 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"
						style={{
							transform: 'translateY(-50%) translateX(-100%)',
						}}
					></div>
				</div>
			)}
		</div>
	);
};

export default LabDashboardTemporary;
