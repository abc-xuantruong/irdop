import * as React from 'react';
const { useContext, useEffect, useState } = React;
import { useNavigate, useLocation } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import ProtocolInfor from './ProtocolInfor';
import AnalyteInfor from './AnalyteInfor';
import ClientInfor from './ClientInfor';
import AccountInfor from './AccountInfor';
import { FaUserAlt, FaBook, FaFlask, FaClipboard } from 'react-icons/fa';

const Library = () => {
	const { setCurrentTitlePage, currentUser } = useContext(GlobalContext);
	const navigate = useNavigate();
	const location = useLocation();

	// Helper function to check if user is a technician
	const isTechnician = () => {
		return currentUser?.role?.staff_technician === true;
	};

	// Helper function to check if user is a superAdmin
	const isSuperAdmin = () => {
		console.log('currentUser', currentUser);
		return currentUser?.role?.staff_superAdmin === true;
	};

	// Determine active tab based on URL query parameter
	const getActiveTabFromQuery = () => {
		const searchParams = new URLSearchParams(location.search);
		const view = searchParams.get('view');

		// If view is 'account' but user is not superAdmin, default to 'analyte'
		if (view === 'account' && !isSuperAdmin()) {
			return 'analyte';
		}

		return ['protocol', 'client', 'account'].includes(view) ? view : 'analyte'; // Default to 'analyte'
	};

	const [activeTab, setActiveTab] = useState(getActiveTabFromQuery());

	useEffect(() => {
		setCurrentTitlePage('Thư viện');

		// Set default query parameter if none exists
		if (!location.search) {
			navigate('?view=analyte', { replace: true });
		}

		// Redirect if trying to access account page without being superAdmin
		const searchParams = new URLSearchParams(location.search);
		const view = searchParams.get('view');
		if (view === 'account' && !isSuperAdmin()) {
			navigate('?view=analyte', { replace: true });
		}
	}, [setCurrentTitlePage, navigate, location.search]);

	useEffect(() => {
		// Update activeTab when URL query changes
		setActiveTab(getActiveTabFromQuery());
	}, [location.search]);

	const handleTabChange = (tab) => {
		setActiveTab(tab);
		navigate(`?view=${tab}`);
	};

	return (
		<div className="w-full h-full relative">
			<Breadcrumb paths={[]} />

			{/* New NavPill Design */}
			<div className="w-full h-full flex justify-between items-center rounded-lg mb-2">
				<div>
					<button
						className={`w-40 p-1 ml-1 text-sm font-medium active:bg-sky-400 focus:outline-none ${
							activeTab === 'analyte' ? 'bg-teritary' : 'bg-gray-200'
						}`}
						onClick={() => handleTabChange('analyte')}
					>
						Chỉ tiêu
					</button>
					<button
						className={`w-40 p-1 ml-1 text-sm font-medium focus:outline-none active:bg-sky-400 ${
							activeTab === 'protocol' ? 'bg-teritary' : 'bg-gray-200'
						}`}
						onClick={() => handleTabChange('protocol')}
					>
						Phương pháp
					</button>
					{!isTechnician() && (
						<button
							className={`w-40 p-1 ml-1 text-sm font-medium focus:outline-none active:bg-sky-400 ${
								activeTab === 'client' ? 'bg-teritary' : 'bg-gray-200'
							}`}
							onClick={() => handleTabChange('client')}
						>
							Khách hàng
						</button>
					)}
					{isSuperAdmin() && (
						<button
							className={`w-40 p-1 ml-1 text-sm font-medium focus:outline-none active:bg-sky-400 ${
								activeTab === 'account' ? 'bg-teritary' : 'bg-gray-200'
							}`}
							onClick={() => handleTabChange('account')}
						>
							Tài khoản
						</button>
					)}
				</div>
			</div>

			<div className="rounded-lg w-full p-4 bg-white flex flex-col h-full">
				{/* Removed old tab navigation */}

				<div className="flex-1 overflow-auto">
					{activeTab === 'protocol' && <ProtocolInfor />}
					{activeTab === 'analyte' && <AnalyteInfor />}
					{activeTab === 'client' && !isTechnician() && <ClientInfor />}
					{activeTab === 'account' && isSuperAdmin() && <AccountInfor />}
				</div>
			</div>
		</div>
	);
};

export default Library;
