import React, { useContext, useState } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import FilterBar from './FilterBar';

const Breadcrumb = ({ paths, source, setCurrentList, setIsFilter }) => {
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
					<div className="w-full md:w-fit">
						<FilterBar
							source={source} // Pass the original list to FilterBar
							setCurrentList={setCurrentList}
							typeSearch="receipt"
							setIsFilter={setIsFilter} // Pass the setIsFilter function
							hide={['sort', 'filter']} // Conditionally hide search
						/>
					</div>
				)}
			</div>
		</nav>
	);
};

export default Breadcrumb;
