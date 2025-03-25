import axios from 'axios';
import * as React from 'react';
import { apiGet, apiPost } from './helperFunctionCallAPI';
import Cookies from 'js-cookie';

const { createContext, useState, useEffect } = React;

export const GlobalContext = createContext();


export const GlobalProvider = ({ children }) => {
	const [currentTitlePage, setCurrentTitlePage] = useState('Nhập kết quả');
	const [currentReceipt, setCurrentReceiptState] = useState([]);
	const [currentSample, setCurrentSampleState] = useState(null);
	const [listAnalytes, setListAnalytes] = useState([]);
	const [searchWords, setSearchWords] = useState('');
	const [currentBulkReceipt, setCurrentBulkReceipt] = useState([]);
	const [currentFilter, setCurrentFilter] = useState([]);
	const [currentSort, setCurrentSort] = useState({});
	const [technicians, setTechnicians] = useState([]);
	const [currentKey, setCurrentKey] = useState([]);
	const [clients, setClients] = useState([]);
	const [currentUser, setCurrentUser] = useState(null);
	const status = ['Đang chờ', 'Khẩn', 'Thường', 'Hoàn thành', 'Hủy bỏ'];
	const purposes = ['Chất lượng', 'Dự án', 'Đề tài', 'Công bố', 'Thầu phụ'];

	const normalizeString = (str) => {
		if (!str) return ''; // Xử lý trường hợp str null hoặc undefined

		const map = {
			đ: 'd',
			Đ: 'D',
			ê: 'e',
			Ê: 'E',
			ô: 'o',
			Ô: 'O',
			ơ: 'o',
			Ơ: 'O',
			ă: 'a',
			Ă: 'A',
			â: 'a',
			Â: 'A',
		};

		return str
			.normalize('NFD') // Chuẩn hóa Unicode
			.replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
			.replace(/[đĐêÊôÔơƠăĂâÂ]/g, (char) => map[char] || char) // Thay thế ký tự theo map
			.toLowerCase();
	};

	const searchClients = (query) => {
		const normalizedQuery = normalizeString(query);
		return clients.filter(
			(client) =>
				normalizeString(client.client_uid).includes(normalizedQuery) ||
				normalizeString(client.client_name).includes(normalizedQuery) ||
				normalizeString(client.client_address).includes(normalizedQuery),
		);
	};

	const searchProtocol = (query, listProtocols) => {
		const normalizedQuery = normalizeString(query);

		return listProtocols.filter(
			(protocol) =>
				normalizeString(protocol.protocol_name).includes(normalizedQuery) ||
				normalizeString(protocol.protocol_code).includes(normalizedQuery) ||
				protocol.parameters.some((parameter) => normalizeString(parameter.matrix).includes(normalizedQuery)),
		);
	};

	const searchAnalyte = (query, listAnalytes) => {
		const normalizedQuery = normalizeString(query);
		return listAnalytes.filter(
			(analyte) =>
				normalizeString(analyte.parameter_uid).includes(normalizedQuery) ||
				normalizeString(analyte.parameter_name).includes(normalizedQuery) ||
				normalizeString(analyte.protocol_code).includes(normalizedQuery) ||
				normalizeString(analyte.matrix).includes(normalizedQuery),
		);
	};

	const searchAnalysis = (query, listAnalyses) => {
		const normalizedQuery = normalizeString(query);
		return listAnalyses.filter(
			(analyte) =>
				normalizeString(analyte.parameter_uid).includes(normalizedQuery) ||
				normalizeString(analyte.parameter_name).includes(normalizedQuery) ||
				normalizeString(analyte.protocol_code).includes(normalizedQuery) ||
				normalizeString(analyte.matrix).includes(normalizedQuery),
		);
	};

	const searchClient = (query, listClients) => {
		console.log('Query:', query);
		const normalizedQuery = normalizeString(query);
		console.log('Normalized query:', normalizedQuery);
		return listClients.filter(
			(client) =>
				normalizeString(client.client_name).includes(normalizedQuery) ||
				normalizeString(client.client_address).includes(normalizedQuery) ||
				normalizeString(client.client_legal_id).includes(normalizedQuery) ||
				normalizeString(client.client_uid).includes(normalizedQuery),
		);
	};

	const fetchTechnicians = async () => {
		try {
			const response = await axios.get('https://pink.irdop.org/db/get/techinician');
			setTechnicians(response.data);
			console.log('Technicians:', response.data);
		} catch (error) {
			console.error('Error fetching technicians:', error);
		}
	};

	const fetchUser = async () => {
		try {
			const authToken = Cookies.get('auth');
			const response = await axios.post(
				'https://pink.irdop.org/ab4dg2/auth/me',
				{},
				{
					headers: { Authorization: `Bearer ${authToken}` },
				},
			);
			// const response = await apiPost('https://pink.irdop.org/ab4dg2/auth/me');
			setCurrentUser({ identity_name: response.data.identity_name, identity_uid: response.data.identity_uid });
		} catch (error) {
			console.error('Error fetching user:', error);
		}
	};

	useEffect(() => {
		fetchTechnicians();
		fetchUser();
	}, []);

	const setCurrentReceipt = (receipt_uid) => {
		// Find the receipt with the given receipt_uid
		const receipt = currentBulkReceipt.find((receipt) => receipt.receipt_uid === receipt_uid);
		setCurrentReceiptState(receipt);
		if (receipt && receipt.samples) {
			const analytes = receipt.samples.flatMap((sample) =>
				sample.sample_analytes.map((order) => ({
					...order,
					sample_receipt_id: sample.sample_receipt_id,
					sample_uid: sample.sample_uid,
				})),
			);
			setListAnalytes(analytes);
		} else {
			setListAnalytes([]);
		}
	};

	const setCurrentSample = (sample_uid) => {
		// Find the sample with the given sample_uid
		const sample = currentReceipt.samples.find((sample) => sample.sample_uid === sample_uid);
		setCurrentSampleState(sample);
		if (sample && sample.sample_analytes) {
			setListAnalytes(
				sample.sample_analytes.map((order) => ({
					...order,
					sample_uid: sample.sample_uid,
				})),
			);
		} else {
			setListAnalytes([]);
		}
	};

	const createReceipt = (receipt) => {
		setCurrentBulkReceipt([...currentBulkReceipt, receipt]);
		return receipt;
	};

	const setCurrentReceiptByUid = (receipt_uid) => {
		const receipt = currentBulkReceipt.find((receipt) => receipt.receipt_uid === receipt_uid);
		setCurrentReceiptState(receipt);
	};

	const formatDate = (date) => {
		if (!date) return '';

		try {
			// Handle different date formats
			let dateObj;
			if (typeof date === 'string') {
				// Check if the string is a valid date string
				dateObj = new Date(date);
			} else if (date instanceof Date) {
				dateObj = date;
			} else {
				return '';
			}

			// Check if the date is valid
			if (isNaN(dateObj.getTime())) {
				return '';
			}

			// Format the date as DD/MM/YYYY
			const day = String(dateObj.getDate()).padStart(2, '0');
			const month = String(dateObj.getMonth() + 1).padStart(2, '0');
			const year = dateObj.getFullYear();

			return `${day}-${month}-${year}`;
		} catch (error) {
			console.error('Error formatting date:', error);
			return '';
		}
	};

	const updateAnalysisDeadline = async (analysisId, newDeadline) => {
		try {
			const response = await axios.post('http://127.0.0.1:1880/db/update/analysis', {
				id: analysisId,
				deadline: newDeadline,
			});
			if (response.status === 200) {
				toast.success('Deadline updated successfully!');
			} else {
				toast.error('Failed to update deadline.');
			}
		} catch (error) {
			console.error('Error updating deadline:', error);
			toast.error('An error occurred while updating deadline.');
		}
	};

	// Add identity cache to avoid redundant API calls
	const [identityCache, setIdentityCache] = useState({});

	const getIdenByUid = async (identity_uid) => {
		try {
			// Check if we already have this identity in cache
			if (identityCache[identity_uid]) {
				return identityCache[identity_uid];
			}

			// If not in cache, fetch from API
			const response = await apiPost('https://pink.irdop.org/ab4dg2/get/iden', {
				identity_uid: identity_uid,
			});

			if (response?.status === 200 && response?.data) {
				// Update cache with new identity data
				setIdentityCache((prevCache) => ({
					...prevCache,
					[identity_uid]: response.data,
				}));

				return response.data;
			} else {
				console.error('Failed to fetch identity data');
				return null;
			}
		} catch (error) {
			console.error('Error fetching identity data:', error);
			return null;
		}
	};

	return (
		<GlobalContext.Provider
			value={{
				currentTitlePage,
				setCurrentTitlePage,
				currentReceipt,
				setCurrentReceipt,
				currentSample,
				setCurrentSample,
				listAnalytes,
				setListAnalytes,
				searchWords,
				setSearchWords,
				currentBulkReceipt,
				setCurrentBulkReceipt,
				currentFilter,
				setCurrentFilter,
				currentSort,
				setCurrentSort,
				currentKey,
				setCurrentKey,
				searchClients,
				createReceipt,
				setCurrentReceiptByUid,
				setCurrentReceiptState,
				currentUser,
				setCurrentUser,
				searchProtocol,
				searchAnalyte,
				technicians,
				status,
				purposes,
				formatDate,
				updateAnalysisDeadline,
				searchClient,
				fetchUser,
				getIdenByUid,
				identityCache,
				searchAnalysis,
			}}
		>
			{children}
		</GlobalContext.Provider>
	);
};
