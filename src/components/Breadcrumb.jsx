import React, { useContext, useState } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const Breadcrumb = ({ paths }) => {
	const { currentTitlePage } = useContext(GlobalContext);
	const [searchTerm, setSearchTerm] = useState('');
	const location = useLocation();
	const navigate = useNavigate();
	const isDashboard = location.pathname.includes('dashboard') || location.pathname === '/';

	// Handle search term change
	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
	};

	// Handle key press in search field
	const handleKeyPress = (e) => {
		if (e.key === 'Enter' && searchTerm.trim()) {
			navigate(`/dashboard?search=${encodeURIComponent(searchTerm)}`);
		}
	};

	return (
		<nav className="flex flex-col w-lvw 2xl:max-w-screen-2xl xl:max-w-screen-xl lg:max-w-screen-lg md:max-w-screen-md sm:max-w-screen-sm max-w-sm mb-4 font-semibold py-4 border-b-2">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold text-primary text-start">{currentTitlePage}</h1>
			</div>
			<div className="md:flex justify-between items-center flexx-wrap ">
				<ul className="flex list-none p-0 text-sm md:text-base ">
					{paths.map((path, index) => (
						<li key={index} className="mr-2">
							{index === paths.length - 1 ? (
								<span className="text-blue-500 hover:underline cursor-pointer">
									<NavLink to={path.link}>{path.name} </NavLink>
								</span>
							) : (
								<NavLink to={path.link} className="text-text-gray cursor-pointer">
									{path.name} /
								</NavLink>
							)}
						</li>
					))}
				</ul>

				{/* Search input - only visible on dashboard/home page */}
				{isDashboard && (
					<div className="md:w-1/3 max-w-md min-w-[250px] w-full">
						<input
							type="text"
							value={searchTerm}
							onChange={handleSearchChange}
							onKeyPress={handleKeyPress}
							className="p-1.5 border text-sm border-gray-400 rounded-lg bg-white w-full"
							placeholder="Tìm kiếm tiếp nhận mẫu..."
						/>
					</div>
				)}
			</div>
		</nav>
	);
};

export default Breadcrumb;
