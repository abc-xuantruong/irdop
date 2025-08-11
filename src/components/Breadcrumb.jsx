import React, { useContext, useState, useEffect } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MdArrowRight } from 'react-icons/md';

import FilterBar from './FilterBar';

const Breadcrumb = ({
	paths,
	source,
	setCurrentList,
	setIsFilter,
	sample_uids,
	searchTerm,
	setSearchTerm,
	showSearch = false,
}) => {
	const { currentTitlePage } = useContext(GlobalContext);
	const [tempSearchValue, setTempSearchValue] = useState('');
	const location = useLocation();
	const navigate = useNavigate();
	const isDashboard = location.pathname.includes('dashboard') || location.pathname === '/';
	const isMainDashboard =
		location.pathname === '/' || location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard?');
	const shouldShowSearch = showSearch || isMainDashboard;

	// Sync tempSearchValue with searchTerm when searchTerm changes from outside
	useEffect(() => {
		setTempSearchValue(searchTerm || '');
	}, [searchTerm]);

	return (
		<nav className="flex flex-col w-full mb-4 font-semibold py-4 border-b-2">
			<div className="flex flex-wrap items-center justify-between gap-4 mb-2">
				<h1 className="text-2xl md:text-3xl font-bold text-primary text-start">{currentTitlePage}</h1>{' '}
				{/* Search input - visible on dashboard or when showSearch is true */}
				{shouldShowSearch && (
					<div className="w-full md:w-full md:max-w-[400px] xl:max-w-xl bg-none">
						<input
							type="text"
							value={tempSearchValue}
							onChange={(e) => setTempSearchValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									// Trigger search when Enter is pressed
									const trimmedValue = e.target.value.trim();
									if (trimmedValue) {
										// If we're on dashboard and have setSearchTerm, update the search term
										if (isMainDashboard && setSearchTerm) {
											setSearchTerm(trimmedValue);
										}
										// Always navigate to dashboard with search parameter
										navigate(`/dashboard?search=${encodeURIComponent(trimmedValue)}`);
									} else {
										// Clear search parameter
										if (isMainDashboard && setSearchTerm) {
											setSearchTerm('');
										}
										// Go to dashboard without search parameter
										navigate('/dashboard');
									}
								}
							}}
							placeholder="Tìm kiếm..."
							className="w-full p-1.5 border border-gray-300 rounded-md bg-white"
						/>
					</div>
				)}
			</div>
			{paths && paths.length > 0 && paths.some((path) => path && path.name) && (
				<div className="md:flex items-start flex-wrap justify-between">
					<div className="flex list-none p-0 text-sm md:text-base mt-2 ">
						{paths.map((path, index) => (
							<div key={index} className="mr-1 flex items-center">
								{index === paths.length - 1 ? (
									sample_uids && sample_uids.length > 0 ? (
										<select
											className=" bg-transparent text-gray-700 rounded-md p-1 px-0"
											onChange={(e) => navigate(e.target.value)}
											value={location.pathname + location.search}
										>
											{sample_uids.map((uid, uidIndex) => (
												<option
													key={uidIndex}
													value={`/dashboard/sample?receipt_uid=${paths[index - 1].name}&sample_uid=${uid}`}
													className="text-gray-700 cursor-pointer"
												>
													{uid}
												</option>
											))}
										</select>
									) : (
										<span className="text-blue-500 hover:underline cursor-pointer align-middle text-center">
											<NavLink to={path.link}>{path.name} </NavLink>
										</span>
									)
								) : (
									<>
										<NavLink to={path.link} className="text-gray-700 cursor-pointer mr-2">
											{path.name}
										</NavLink>
										<MdArrowRight size={16} className="text-gray-700" />
									</>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</nav>
	);
};

export default Breadcrumb;
