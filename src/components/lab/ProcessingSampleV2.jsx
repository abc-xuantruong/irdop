import React, { useState, useContext, useEffect, useRef } from 'react';
import { GlobalContext } from '../../contexts/GlobalContext';
import FilterableSample from '../sample/filterable.jsx';
import LabBulkUpdate from './LabBulkUpdate';

/**
 * ProcessingSampleV2 - Sử dụng FilterableSample component
 * Ví dụ cách tái cấu trúc ProcessingSample.jsx với FilterableSample
 */

const ProcessingSampleV2 = ({ onNavigateToLab, filter = {} }) => {
	// Get technicians from GlobalContext
	const { technicians } = useContext(GlobalContext);

	// Ref to track initial filter
	const initialFilterRef = useRef(filter);
	const filterableRef = useRef(null);

	// Selection states - FilterableSample will handle the rest
	const [selectedAnalyses, setSelectedAnalyses] = useState([]);

	// Bulk edit state
	const [showBulkEdit, setShowBulkEdit] = useState(false);

	// Filter state
	const [currentFilter, setCurrentFilter] = useState(filter);

	// Filter active states
	const [isUrgentFilterActive, setIsUrgentFilterActive] = useState(false);

	// Session state - track from FilterableSample
	const [isResultEntrySession, setIsResultEntrySession] = useState(false);
	const [pendingChangesCount, setPendingChangesCount] = useState(0);

	// Update filter when prop changes (but avoid infinite loops)
	useEffect(() => {
		if (JSON.stringify(filter) !== JSON.stringify(initialFilterRef.current)) {
			setCurrentFilter(filter);
			setIsUrgentFilterActive(filter.status === 1);
			initialFilterRef.current = filter;
		}
	}, [filter]);

	// Event handlers
	const handleSelectionChange = (selectionData) => {
		setSelectedAnalyses(selectionData.analyses || []);
	};

	const handleDoubleClick = (data) => {
		// Handle double click on analysis
		console.log('Double clicked analysis:', data.analysis);
	};

	const handleUrgentFilter = () => {
		if (isUrgentFilterActive) {
			// Bỏ filter urgent
			setCurrentFilter({});
			setIsUrgentFilterActive(false);
		} else {
			// Áp dụng filter urgent
			setCurrentFilter({ status: 1 });
			setIsUrgentFilterActive(true);
		}
	};

	const handleCancelSelection = () => {
		setSelectedAnalyses([]);
		// FilterableSample will handle its own state clearing via onCancelSelection prop
	};

	const handleBulkEditClick = () => {
		setShowBulkEdit(true);
	};

	const handleBulkEditComplete = () => {
		setShowBulkEdit(false);
		setSelectedAnalyses([]);
		// Refresh data if needed
	};

	// Session handlers
	const handleSessionStateChange = (sessionData) => {
		setIsResultEntrySession(sessionData.isActive);
		setPendingChangesCount(sessionData.pendingCount || 0);
	};

	const handleStartSession = () => {
		// Trigger session start in FilterableSample
		if (filterableRef.current && filterableRef.current.startSession) {
			filterableRef.current.startSession();
		}
	};

	const handleEndSession = () => {
		// Trigger session end in FilterableSample
		if (filterableRef.current && filterableRef.current.endSession) {
			filterableRef.current.endSession();
		}
	};

	return (
		<div className="w-full h-full relative bg-gray-50">
			{/* Breadcrumb và Filter buttons */}
			<div className="bg-white p-4 text-sm z-10 border-b border-gray-200">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2 font-bold text-sm text-gray-500 cursor-pointer">
						<span className="hover:underline" onClick={() => onNavigateToLab?.('samples')}>
							PHÒNG THỬ NGHIỆM
						</span>
						<span>/</span>
						<span className="text-gray-900 font-bold hover:underline">DANH SÁCH PHÉP THỬ</span>
					</div>

					{/* Filter buttons */}
					<div className="flex items-center space-x-2">
						{selectedAnalyses.length > 0 && (
							<>
								<button
									className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
									onClick={handleCancelSelection}
								>
									Hủy chọn ({selectedAnalyses.length})
								</button>
								<button
									className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
									onClick={handleBulkEditClick}
								>
									Sửa hàng loạt
								</button>
							</>
						)}

						{/* Session-based result entry buttons */}
						{isResultEntrySession ? (
							<>
								<button
									className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
									onClick={handleEndSession}
								>
									<span className="mr-2">📝</span>
									Kết thúc nhập ({pendingChangesCount})
								</button>
							</>
						) : (
							<button
								className="px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
								onClick={handleStartSession}
							>
								Bắt đầu nhập kết quả
							</button>
						)}

						<button
							onClick={handleUrgentFilter}
							className={`px-3 py-1.5 text-sm rounded transition-colors ${
								isUrgentFilterActive
									? 'bg-red-600 text-white border border-red-600 hover:bg-red-700'
									: 'border border-red-600 text-red-600 hover:bg-red-50'
							}`}
						>
							Mẫu khẩn
						</button>
						<button className="px-3 py-1.5 text-sm border border-green-600 text-green-600 rounded hover:bg-green-50">
							Đủ kết quả
						</button>
					</div>
				</div>
			</div>

			{/* Main Table */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden mx-4 mb-4">
				<FilterableSample
					ref={filterableRef}
					filter={currentFilter}
					selected={selectedAnalyses}
					onSelect={handleSelectionChange}
					onDoubleClick={handleDoubleClick}
					onCancelSelection={handleCancelSelection}
					onSessionStateChange={handleSessionStateChange}
				/>
			</div>

			{/* Bulk Update Component */}
			<LabBulkUpdate
				isOpen={showBulkEdit && selectedAnalyses.length > 0}
				onClose={() => {
					setShowBulkEdit(false);
					setSelectedAnalyses([]);
				}}
				selectedRows={selectedAnalyses.map((item) => item.id)}
				selectedData={selectedAnalyses}
				technicians={technicians || []}
				onApplyBulkChanges={(bulkChanges) => {
					// Apply bulk changes via FilterableSample ref
					if (filterableRef.current && filterableRef.current.applyBulkChanges) {
						filterableRef.current.applyBulkChanges(bulkChanges);
					}

					// Close bulk edit modal and clear selections
					setShowBulkEdit(false);
					setSelectedAnalyses([]);
				}}
				onStartSession={() => {
					// Start session if not already active
					if (!isResultEntrySession) {
						handleStartSession();
					}
				}}
			/>
		</div>
	);
};

export default ProcessingSampleV2;
