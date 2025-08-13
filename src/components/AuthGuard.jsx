import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { initialAuthCheck } from '../contexts/helperFunctionCallAPI';

const { useEffect } = React;

const AuthGuard = ({ children }) => {
	const location = useLocation();

	useEffect(() => {
		// Chỉ check auth khi không phải trang login
		if (location.pathname !== '/login') {
			initialAuthCheck();
		}
	}, [location.pathname]);

	return children;
};

export default AuthGuard;
