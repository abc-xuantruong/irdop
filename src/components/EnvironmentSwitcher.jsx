import * as React from 'react';
import { getCurrentAppUid, switchToProduction, switchToDevelopment, APP_UIDS } from '../contexts/helperFunctionCallAPI';

const { useState, useEffect } = React;

const EnvironmentSwitcher = () => {
	const [currentEnv, setCurrentEnv] = useState('');

	useEffect(() => {
		const appUid = getCurrentAppUid();
		if (appUid === APP_UIDS.PRODUCTION) {
			setCurrentEnv('PRODUCTION');
		} else if (appUid === APP_UIDS.DEVELOPMENT) {
			setCurrentEnv('DEVELOPMENT');
		}
	}, []);

	const handleSwitchToProd = () => {
		switchToProduction();
		setCurrentEnv('PRODUCTION');
		window.location.reload(); // Reload để áp dụng thay đổi
	};

	const handleSwitchToDev = () => {
		switchToDevelopment();
		setCurrentEnv('DEVELOPMENT');
		window.location.reload(); // Reload để áp dụng thay đổi
	};

	return (
		<div className="bg-white border rounded-lg p-4 shadow-sm">
			<h3 className="text-lg font-semibold mb-3">Environment Switcher</h3>
			<div className="mb-3">
				<span className="text-sm text-gray-600">Current Environment: </span>
				<span className={`font-medium ${currentEnv === 'PRODUCTION' ? 'text-green-600' : 'text-blue-600'}`}>
					{currentEnv}
				</span>
			</div>
			<div className="flex gap-2">
				<button
					onClick={handleSwitchToProd}
					disabled={currentEnv === 'PRODUCTION'}
					className={`px-4 py-2 rounded text-sm font-medium ${
						currentEnv === 'PRODUCTION'
							? 'bg-gray-200 text-gray-500 cursor-not-allowed'
							: 'bg-green-600 text-white hover:bg-green-700'
					}`}
				>
					Switch to Production
				</button>
				<button
					onClick={handleSwitchToDev}
					disabled={currentEnv === 'DEVELOPMENT'}
					className={`px-4 py-2 rounded text-sm font-medium ${
						currentEnv === 'DEVELOPMENT'
							? 'bg-gray-200 text-gray-500 cursor-not-allowed'
							: 'bg-blue-600 text-white hover:bg-blue-700'
					}`}
				>
					Switch to Development
				</button>
			</div>
			<div className="mt-3 text-xs text-gray-500">
				<p>App UID: {getCurrentAppUid()}</p>
			</div>
		</div>
	);
};

export default EnvironmentSwitcher;
