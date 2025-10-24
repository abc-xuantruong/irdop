import React, { useContext, useState, useEffect } from 'react';
import { GlobalContext } from '../contexts/GlobalContext';
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MdArrowRight, MdKeyboardArrowDown } from 'react-icons/md';

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
	const [searchParams] = useSearchParams();
	const currentSampleUid =
		searchParams.get('sample_uid') || (sample_uids && sample_uids.length > 0 ? sample_uids[0] : '');
	const [showDropdown, setShowDropdown] = useState(false);
	const isDashboard = location.pathname.includes('dashboard') || location.pathname === '/';
	const isMainDashboard =
		location.pathname === '/' || location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard?');
	const isProgressDashboard = location.pathname.includes('/dashboard/progress');
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
										// Update search term if available
										if (setSearchTerm) {
											setSearchTerm(trimmedValue);
										}
										// Navigate based on current location
										if (isProgressDashboard) {
											navigate(`/dashboard/progress?searchTerm=${encodeURIComponent(trimmedValue)}`);
										} else {
											navigate(`/dashboard?searchTerm=${encodeURIComponent(trimmedValue)}`);
										}
									} else {
										// Clear search parameter
										if (setSearchTerm) {
											setSearchTerm('');
										}
										// Navigate to appropriate page without search parameter
										if (isProgressDashboard) {
											navigate('/dashboard/progress');
										} else {
											navigate('/dashboard');
										}
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
										<div className="relative flex items-center">
											<span
												className="text-blue-500 hover:underline cursor-pointer"
												onMouseEnter={() => setShowDropdown(true)}
												onMouseLeave={() => setShowDropdown(false)}
											>
												{currentSampleUid}
											</span>
											{showDropdown && (
												<div
													className="absolute top-5 -left-1 bg-white border border-gray-300 rounded-md shadow-md z-10"
													onMouseEnter={() => setShowDropdown(true)}
													onMouseLeave={() => setShowDropdown(false)}
												>
													{sample_uids.map((uid, uidIndex) => (
														<div
															key={uidIndex}
															className="p-2 hover:bg-gray-100 cursor-pointer"
															onClick={() => {
																navigate(`/dashboard/sample?receipt_uid=${paths[index - 1].name}&sample_uid=${uid}`);
																setShowDropdown(false);
															}}
														>
															{uid}
														</div>
													))}
												</div>
											)}
											<button
												className="ml-1 p-1 bg-gray-100	"
												onClick={() => {
													const currentIndex = sample_uids.indexOf(currentSampleUid);
													const nextIndex = (currentIndex + 1) % sample_uids.length;
													const nextUid = sample_uids[nextIndex];
													navigate(`/dashboard/sample?receipt_uid=${paths[index - 1].name}&sample_uid=${nextUid}`);
												}}
												title="Next sample"
											>
												<MdKeyboardArrowDown size={16} />
											</button>
										</div>
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
