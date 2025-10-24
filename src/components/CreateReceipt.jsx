import React, { useState, useEffect, useContext, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useNavigate } from 'react-router-dom';
import { RiEdit2Line, RiAddCircleLine } from 'react-icons/ri';
import { GlobalContext } from '../contexts/GlobalContext';
import Swal from 'sweetalert2'; // Replace toast with Swal
import { apiPost, apiGet } from '../contexts/helperFunctionCallAPI';

const CreateReceipt = ({ receipt: initialReceipt = null, setUpdatedReceipt }) => {
	const navigate = useNavigate();
	const { formatDate, currentUser, hasAuthCookies } = useContext(GlobalContext);
	const [isFormVisible, setIsFormVisible] = useState(false);
	const [isDisplayCustomer, setIsDisplayCustomer] = useState(false);
	const [isDisplayContact, setIsDisplayContact] = useState(false);
	const [isNewCustomer, setIsNewCustomer] = useState(false);
	const [isNewContact, setIsNewContact] = useState(false);
	const [customer, setCustomer] = useState({
		search: '',
		client_name: '',
		client_address: '',
		legal_id: '',
		contacts: [],
	});
	const [contact, setContact] = useState({ search: '', name: '', email: '', phone: '' });
	const [receipt, setReceipt] = useState(
		initialReceipt || {
			request_number: '',
			createdById: '',
			receipt_date: null,
			deadline: null,
			contact: { index: -1, name: '', email: '', phone: '' },
			note: '',
			client: null, // Initialize client as null
		},
	);
	const [customerSuggestions, setCustomerSuggestions] = useState([]);
	const [contactSuggestions, setContactSuggestions] = useState([]);
	const [customerPage, setCustomerPage] = useState(0);
	const [contactPage, setContactPage] = useState(0);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [validationErrors, setValidationErrors] = useState({});
	const [clients, setClients] = useState([]);
	const formRef = useRef(null);
	useEffect(() => {
		const fetchClients = async () => {
			try {
				// Check auth cookies before making API call
				if (!hasAuthCookies()) {
					return; // hasAuthCookies will handle redirect
				}

				const response = await apiGet('https://black.irdop.org/hli1o7az/db/get/client');
				if (response && response.data) {
					setClients(response.data);
				}
			} catch (error) {
				console.error('Error fetching clients:', error);
			}
		};
		fetchClients();
	}, []);

	useEffect(() => {
		if (initialReceipt) {
			setReceipt(initialReceipt);
			setCustomer(initialReceipt.client);
			setContact(initialReceipt.contact);
		} else {
			// Set createdById to currentUser when creating a new receipt
			setReceipt((prevReceipt) => ({
				...prevReceipt,
				createdById: currentUser?.identity_uid || '',
			}));
		}
	}, [initialReceipt, currentUser]);

	const handleInputChange = (e, setState) => {
		const { name, value } = e.target;
		setState((prevState) => ({ ...prevState, [name]: value }));
	};

	const handleDateChange = (date, name) => {
		setReceipt((prevState) => ({ ...prevState, [name]: date }));
	};

	const handleCustomerSearch = (e) => {
		const { value } = e.target;
		console.log(value);
		setCustomer((prevState) => ({ ...prevState, search: value }));

		if (value.length > 2) {
			if (isDisplayCustomer === false) {
				setIsDisplayCustomer(true);
			}

			const searchValue = value?.toLowerCase() || '';
			const foundCustomers = clients.filter((client) => {
				return (
					client?.client_uid?.toLowerCase()?.includes(searchValue) ||
					client?.client_name?.toLowerCase()?.includes(searchValue) ||
					client?.legal_id?.toLowerCase()?.includes(searchValue)
				);
			});

			const uniqueCustomers = foundCustomers.filter(
				(customer, index, self) => index === self.findIndex((c) => c.client_uid === customer?.client_uid),
			);
			setCustomerSuggestions(uniqueCustomers);
			setCustomerPage(0);
		} else {
			setIsDisplayCustomer(false);
			setCustomerSuggestions([]);
		}
	};

	const handleCustomerSelect = (customer) => {
		setIsDisplayCustomer(false);
		setCustomer({
			client_uid: customer?.client_uid || '',
			client_name: customer?.client_name || '',
			client_address: customer?.client_address || '',
			legal_id: customer?.legal_id || '',
			contacts: customer?.contacts || [],
		});

		setReceipt((prevState) => ({
			...prevState,
			client_id: customer?.id,
			client: customer,
		}));
		setCustomerSuggestions([]);
	};

	const handleContactModeToggle = (type) => {
		if (isNewCustomer === false) {
			setIsNewContact(type === 'new' ? true : false);
			setContact({ search: '', name: '', email: '', phone: '' });
			setContactSuggestions([]);
			setIsDisplayContact(false);
		}
	};

	const handleContactSearch = (e) => {
		if (isDisplayContact === false) {
			setIsDisplayContact(true);
		}
		const { value } = e.target;
		setContact((prevState) => ({ ...prevState, search: value }));

		const contactsByClientUid = clients.find((client) => client.client_uid === customer?.client_uid)?.contacts;

		if (value.length > 2) {
			const foundContacts = contactsByClientUid.filter(
				(person) =>
					person.name.toLowerCase().includes(value.toLowerCase()) ||
					person.email.toLowerCase().includes(value.toLowerCase()) ||
					person.phone.includes(value),
			);
			setContactSuggestions(foundContacts);
			setContactPage(0);
		} else {
			setContactSuggestions([]);
		}
	};

	const handleContactSelect = (contact, index) => {
		setIsDisplayContact(false);
		setContact({
			index: contact?.index !== undefined ? contact.index : -1,
			name: contact?.name || '',
			email: contact?.email || '',
			phone: contact?.phone || '',
		});
		setReceipt((prevState) => ({
			...prevState,
			contact: {
				...(contact || {}), // Use empty object as fallback
			},
		}));
		setContactSuggestions([]);
	};

	const handleCancel = () => {
		setIsFormVisible(false);
		setCustomer({ search: '', client_name: '', client_address: '', legal_id: '', contacts: [] });
		setContact({ search: '', name: '', email: '', phone: '' });
		setReceipt({
			request_number: '',
			createdById: '',
			created_by_name: '',
			receipt_date: null,
			deadline: null,
			contact: { index: -1, name: '', email: '', phone: '' },
			note: '',
		});
	};

	const handleConfirm = () => {
		setReceipt((prevState) => ({
			...prevState,
			client: {
				...(customer || {}),
			},
			contact: {
				...(contact || {}),
				// Ensure createdById is set to current user
				createdById: currentUser?.identity_uid || prevState.createdById,
			},
		}));

		const errors = {};
		// Only validate receipt date, remove client validation
		if (!receipt.receipt_date) errors.receipt_date = true;

		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			alert('Vui lòng điền đầy đủ thông tin.');
			return;
		}
		setIsFormVisible(false);

		setShowConfirmation(true);
	};

	const handleFinalConfirm = async () => {
		if (customer?.search) {
			receipt.client.client_uid = customer?.search;
			delete receipt.client.search;
		} else {
			receipt.client.client_uid = customer?.client_uid;
		}
		const apiUrl = initialReceipt
			? 'https://black.irdop.org/khsi19me/db/update/receipt'
			: 'https://black.irdop.org/khsi19me/db/insert/receipt';
		try {
			// Check auth cookies before making API call
			if (!hasAuthCookies()) {
				return; // hasAuthCookies will handle redirect
			}

			// Add authentication info based on operation type
			const receiptWithAuth = initialReceipt
				? {
						...receipt,
						modifiedById: currentUser.identity_uid,
				  }
				: {
						...receipt,
						createdById: currentUser.identity_uid,
						created_by_name: currentUser.identity_name,
						modifiedById: currentUser.identity_uid,
				  };

			const newReceipt = await apiPost(apiUrl, { receipt: receiptWithAuth });
			if (initialReceipt && setUpdatedReceipt && newReceipt && newReceipt.status === 200) {
				const fullReceipt = { ...initialReceipt, ...newReceipt.data };
				setUpdatedReceipt(fullReceipt);

				// Show brief notification and navigate after delay
				const successMessage = 'Cập nhật thành công!';
				await showBriefNotification(successMessage);
				navigate(`/dashboard/receipt?receiptId=${newReceipt.data.receipt_uid}`);
			} else if (newReceipt && newReceipt.status === 200) {
				// Show brief notification and navigate after delay
				const successMessage = 'Tiếp nhận mẫu thành công!';
				await showBriefNotification(successMessage);
				navigate(`/dashboard/receipt?receiptId=${newReceipt.data.receipt_uid}`);
			} else {
				Swal.fire({
					icon: 'error',
					title: 'Lỗi',
					text: 'Có lỗi xảy ra, vui lòng thử lại sau!',
				});
			}
		} catch (error) {
			console.error('Error confirming receipt:', error);
			Swal.fire({
				icon: 'error',
				title: 'Lỗi',
				text: 'Có lỗi xảy ra, vui lòng thử lại sau!',
			});
		}
	};

	// New function to show brief notification before navigation
	const showBriefNotification = (message) => {
		return new Promise((resolve) => {
			const Toast = Swal.mixin({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 500, // Show for 0.5 seconds
				timerProgressBar: true,
				didOpen: (toast) => {
					toast.addEventListener('mouseenter', Swal.stopTimer);
					toast.addEventListener('mouseleave', Swal.resumeTimer);
				},
				customClass: {
					popup: 'colored-toast swal2-icon-success',
				},
			});

			Toast.fire({
				icon: 'success',
				title: message,
			}).then(() => {
				resolve();
			});
		});
	};

	const handleCustomerModeToggle = (type) => {
		if (type === 'new') {
			setIsNewCustomer(true);
			handleContactModeToggle('new');
			setCustomer((prevState) => ({
				...prevState,
				client_uid: prevState.search,
			}));
		} else {
			setIsNewCustomer(false);
		}
		setCustomer({
			search: '',
			client_name: '',
			client_address: '',
			legal_id: '',
			contacts: [],
		});
		setCustomerSuggestions([]);
		setIsDisplayCustomer(false);
	};

	const isCustomerInfoComplete =
		customer?.search && customer?.client_name && customer?.client_address && customer?.legal_id;

	const customerSuggestionsToShow = customerSuggestions.slice(customerPage * 5, (customerPage + 1) * 5);
	const contactSuggestionsToShow = contactSuggestions.slice(contactPage * 5, (contactPage + 1) * 5);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (formRef.current && !formRef.current.contains(event.target)) {
				setIsFormVisible(false);
			}
		};

		if (isFormVisible) {
			document.addEventListener('mousedown', handleClickOutside);
		} else {
			document.removeEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isFormVisible]);

	// Add a safe date formatter helper function within the component
	const safeDateFormat = (date) => {
		try {
			if (!date) return '';
			return formatDate(date) || '';
		} catch (error) {
			console.error('Error formatting date:', error);
			return '';
		}
	};

	return (
		<div className="relative p-1 px-2 w-fit">
			<button
				className={` border-gray-300 font-medium py-0 px-2 rounded-lg ${
					initialReceipt ? 'w-20 bg-background text-primary' : 'w-fit bg-background text-primary'
				} `}
				onClick={() => setIsFormVisible(true)}
			>
				{initialReceipt ? (
					<div className="flex items-center justify-between">
						{'Sửa'} <RiEdit2Line size={20} />
					</div>
				) : (
					<div className="flex items-center ">{`Tạo TNM mới `}</div>
				)}
			</button>

			{isFormVisible && (
				<div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
					<div
						ref={formRef}
						className="bg-white py-2 px-1 md:p-6 rounded-lg shadow-lg w-[90%] md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl max-h-4/5 h-4/5 overflow-x-hidden custom-scrollbar overflow-y-auto"
					>
						<h2 className="text-2xl font-bold mb-2 text-primary">
							{initialReceipt ? 'CHỈNH SỬA TIẾP NHẬN MẪU' : 'TIẾP NHẬN MẪU MỚI'}
						</h2>
						<div className="mb-2 ">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="w-full flex flex-col items-start">
									<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
										<label className="block p-1 pb-0 text-start text-sm font-medium">Số yêu cầu đến</label>
										<input
											type="number"
											name="request_number"
											placeholder="Số yêu cầu đến"
											value={receipt.request_number || ''}
											onChange={(e) => handleInputChange(e, setReceipt)}
											className="w-full p-2 outline-none focus:border-primary border border-gray-300 rounded mb-2 placeholder-gray-500 text-black bg-white"
											required
										/>
									</div>
									<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
										<label className="block p-1 pb-0 text-start text-sm font-medium">Ngày nhận mẫu</label>
										<DatePicker
											selected={receipt.receipt_date}
											onChange={(date) => handleDateChange(date, 'receipt_date')}
											dateFormat="dd/MM/yyyy"
											placeholderText="Ngày nhận mẫu"
											className={`w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 p-2  outline-none focus:border-primary border ${
												validationErrors.receipt_date ? 'border-red-500' : 'border-gray-300'
											} rounded  mb-2 placeholder-gray-500 text-black bg-white datepicker-full-width`}
											calendarClassName="text-black"
											required
										/>
									</div>
								</div>
								<div className="w-full flex flex-col items-end">
									<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
										<label className="block p-1 pb-0 text-start text-sm font-medium">Người tiếp nhận</label>
										<input
											type="text"
											name="createdById"
											placeholder="Người tiếp nhận"
											value={currentUser?.identity_name || ''}
											className={`w-full outline-none focus:border-primary p-2 border ${
												validationErrors.createdById ? 'border-red-500' : 'border-gray-300'
											} rounded mb-2 placeholder-gray-500 text-black bg-gray-200`}
											disabled={true}
											required
										/>
									</div>
									<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
										<label className="block p-1 pb-0 text-start text-sm font-medium">Hạn trả kết quả dự kiến</label>
										<DatePicker
											selected={receipt.deadline}
											onChange={(date) => handleDateChange(date, 'deadline')}
											dateFormat="dd/MM/yyyy"
											placeholderText="Hạn trả kết quả dự kiến"
											className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 p-2  outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white datepicker-full-width "
											calendarClassName="text-black"
											required
										/>
									</div>
								</div>
							</div>
							<div className="w-full flex flex-col items-center px-0">
								<div className=" w-80 md:w-full">
									<label className="block p-1 pb-0 text-start text-sm font-medium">Ghi chú</label>
									<textarea
										name="note"
										placeholder="Ghi chú"
										value={receipt.note || ''}
										onChange={(e) => handleInputChange(e, setReceipt)}
										className={`w-full resize-none p-1 outline-none focus:border-primary border border-gray-300 rounded  placeholder-gray-500 text-black bg-white`}
										rows="2"
										required
									/>
								</div>
							</div>
						</div>
						<div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="w-full flex flex-col items-start relative">
								<h3 className="text-xl font-semibold text-center w-full">Khách hàng</h3>
								<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
									<label className="block p-1 pb-0 text-start text-sm font-medium">
										<span
											className={`cursor-pointer ${!isNewCustomer ? 'text-black' : 'text-gray-500'}`}
											onClick={() => handleCustomerModeToggle('find')}
										>
											Tìm kiếm
										</span>
										{' | '}
										<span
											className={`cursor-pointer ${isNewCustomer ? 'text-black' : 'text-gray-500'}`}
											onClick={() => handleCustomerModeToggle('new')}
										>
											Khách hàng mới
										</span>
									</label>
									<input
										type="text"
										name="search"
										placeholder={isNewCustomer ? 'Mã khách hàng' : 'Tìm kiếm khách hàng'}
										value={customer?.search || ''}
										onChange={handleCustomerSearch}
										className="w-full outline-none focus:border-primary p-2 border border-gray-300 rounded mb-2 placeholder-gray-500 text-black bg-white"
										// disabled={isNewCustomer}
									/>
									{!isNewCustomer && isDisplayCustomer && customer?.search.length > 3 && (
										<div className="absolute z-10 border border-gray-300 rounded bg-white h-fit overflow-x-hidden overflow-y-auto w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72">
											{customerSuggestions.length > 0 ? (
												customerSuggestionsToShow.map((suggestion) => (
													<div
														key={suggestion.client_uid}
														className="px-2 py-1 cursor-pointer hover:bg-gray-200 border-t border-b"
														onClick={() => handleCustomerSelect(suggestion)}
													>
														<div className="truncate text-start text-sm text-primary flex">
															<p className="font-bold ">{suggestion.client_uid + ': '}</p>
															<p className="font-medium">{suggestion.client_name}</p>
														</div>
														<div className="truncate text-start text-sm">{suggestion.client_address}</div>
													</div>
												))
											) : (
												<div className="p-2 text-center text-gray-500">Không có kết quả phù hợp</div>
											)}
											{customerSuggestions.length > 0 && (
												<div className="flex justify-between items-center ">
													<button
														className="text-blue-500 w-1/3 p-1"
														onClick={() => setCustomerPage((prev) => Math.max(prev - 1, 0))}
														disabled={customerPage === 0}
													>
														Trước
													</button>
													<div className="text-gray-500 h-fit">
														Page {customerPage + 1}/{Math.ceil(customerSuggestions.length / 5)}
													</div>
													<button
														className="text-blue-500 w-1/3 p-1"
														onClick={() =>
															setCustomerPage((prev) =>
																(customerPage + 1) * 5 < customerSuggestions.length ? prev + 1 : prev,
															)
														}
														disabled={(customerPage + 1) * 5 >= customerSuggestions.length}
													>
														Sau
													</button>
												</div>
											)}
											{customerSuggestions.length === 0 && (
												<div className="flex justify-center p-2">
													<button
														className="text-blue-500"
														onClick={() => {
															setCustomer({
																search: '',
																client_name: '',
																client_address: '',
																legal_id: '',
																contacts: [],
															});
															document.querySelector('input[name="client_name"]').focus();
														}}
													>
														Khách hàng mới
													</button>
												</div>
											)}
										</div>
									)}
								</div>
								<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
									<label className="block p-1 pb-0 text-start text-sm font-medium">Tên khách hàng</label>
									<input
										type="text"
										name="client_name"
										placeholder="Tên khách hàng"
										value={customer?.client_name || ''}
										onChange={(e) => handleInputChange(e, setCustomer)}
										className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 p-2 outline-none focus:border-primary border border-gray-300 rounded mb-2 placeholder-gray-500 text-black bg-white"
										required
									/>
								</div>
								<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
									<label className="block p-1 pb-0 text-start text-sm font-medium">Địa chỉ</label>
									<input
										type="text"
										name="client_address"
										placeholder="Địa chỉ"
										value={customer?.client_address || ''}
										onChange={(e) => handleInputChange(e, setCustomer)}
										className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 p-2 outline-none focus:border-primary border border-gray-300 rounded mb-2 placeholder-gray-500 text-black bg-white"
										required
									/>
								</div>
								<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
									<label className="block p-1 pb-0 text-start text-sm font-medium">MST/CCCD</label>
									<input
										type="text"
										name="legal_id"
										placeholder="MST/CCCD"
										value={customer?.legal_id || ''}
										onChange={(e) => handleInputChange(e, setCustomer)}
										className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 p-2 outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
										required
									/>
								</div>
							</div>
							<div className="w-full flex flex-col items-end relative">
								<h3 className="text-xl font-semibold w-full text-center">Người liên hệ</h3>
								<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
									<label className="block p-1 pb-0 text-start text-sm font-medium">
										<span
											className={`cursor-pointer ${!isNewContact ? 'text-black' : 'text-gray-500'}`}
											onClick={() => handleContactModeToggle('find')}
										>
											Tìm kiếm
										</span>
										{' | '}
										<span
											className={`cursor-pointer ${isNewContact ? 'text-black' : 'text-gray-500'}`}
											onClick={() => handleContactModeToggle('new')}
										>
											Liên hệ mới
										</span>
									</label>
									<input
										type="text"
										name="search"
										placeholder={isNewContact ? 'Liên hệ mới' : 'Tìm kiếm người liên hệ'}
										value={contact?.search || ''}
										onChange={handleContactSearch}
										className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 p-2 outline-none focus:border-primary border border-gray-300 rounded mb-2 placeholder-gray-500 text-black bg-white"
									/>
									{!isNewContact && isDisplayContact && contact.search.length > 2 && (
										<div className="absolute z-10 border border-gray-300 rounded bg-white max-h-72 overflow-y-auto w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72">
											{contactSuggestions.length > 0 ? (
												contactSuggestionsToShow.map((suggestion, index) => (
													<div
														key={suggestion.email}
														className="p-2 cursor-pointer hover:bg-gray-200 border-t border-b"
														onClick={() => handleContactSelect(suggestion, index)}
													>
														<div className="truncate text-start text-sm text-primary font-medium">
															{suggestion.name}
														</div>
														<div className="truncate text-start text-sm">{suggestion.email}</div>
														<div className="truncate text-start text-sm">{suggestion.phone}</div>
													</div>
												))
											) : (
												<div className="p-2 text-center text-gray-500">Không có kết quả phù hợp</div>
											)}
											{contactSuggestions.length === 0 && (
												<div className="flex justify-center p-2">
													<button
														className="text-blue-500"
														onClick={() => {
															setContact({ search: '', name: '', email: '', phone: '' });
															document.querySelector('input[name="name"]').focus();
														}}
													>
														Người liên hệ mới
													</button>
												</div>
											)}
										</div>
									)}
								</div>
								<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
									<label className="block p-1 pb-0 text-start text-sm font-medium">Họ tên</label>
									<input
										type="text"
										name="name"
										placeholder="Họ tên"
										value={contact?.name || ''}
										onChange={(e) => handleInputChange(e, setContact)}
										className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 p-2 outline-none focus:border-primary border border-gray-300 rounded mb-2 placeholder-gray-500 text-black bg-white"
										required
									/>
								</div>
								<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
									<label className="block p-1 pb-0 text-start text-sm font-medium">Email</label>
									<input
										type="email"
										name="email"
										placeholder="Email"
										value={contact?.email || ''}
										onChange={(e) => handleInputChange(e, setContact)}
										className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 p-2 outline-none focus:border-primary border border-gray-300 rounded mb-2 placeholder-gray-500 text-black bg-white"
										required
									/>
								</div>
								<div className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 mx-auto">
									<label className="block p-1 pb-0 text-start text-sm font-medium">Điện thoại</label>
									<input
										type="text"
										name="phone"
										placeholder="Điện thoại"
										value={contact?.phone || ''}
										onChange={(e) => handleInputChange(e, setContact)}
										className="w-80 md:w-48 lg:w-56 xl:w-64 2xl:w-72 p-2 outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
										required
									/>
								</div>
							</div>
						</div>
						<div className="flex justify-end">
							<button className="bg-gray-500 text-white font-bold py-2 px-4 rounded mr-2" onClick={handleCancel}>
								Hủy bỏ
							</button>
							<button className="bg-blue-500 text-white font-bold py-2 px-4 rounded" onClick={handleConfirm}>
								Xác nhận
							</button>
						</div>
					</div>
				</div>
			)}

			{showConfirmation && (
				<div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
					<div className="bg-white py-2 px-1 md:p-6 rounded-lg shadow-lg w-[90%] md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl max-h-4/5 h-4/5 overflow-x-hidden custom-scrollbar overflow-y-auto">
						<h2 className="text-2xl font-bold mb-4 text-primary">Xác nhận thông tin</h2>
						<div className="mb-4 md:px-10">
							<h3 className="text-xl text-start font-semibold mb-2">Thông tin khách hàng</h3>
							<table className="w-full">
								<tbody>
									<tr>
										<td className="w-1/3 min-w-32 p-1 pb-0 text-start text-sm font-medium">Trạng thái</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={receipt?.client_id ? 'Khách hàng đã có trong CSDL' : 'Khách hàng mới'}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="w-1/3 p-1 pb-0 text-start text-sm font-medium">Mã khách hàng</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={customer?.search || customer?.client_uid || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="p-1 pb-0 text-start text-sm font-medium">Tên khách hàng</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={customer?.client_name || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="p-1 pb-0 text-start text-sm font-medium">Địa chỉ</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={customer?.client_address || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="p-1 pb-0 text-start text-sm font-medium">MST/CCCD</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={customer?.legal_id || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div className="mb-4 md:px-10">
							<h3 className="text-xl text-start font-semibold mb-2">Thông tin người liên hệ</h3>
							<table className="w-full">
								<tbody>
									<tr>
										<td className="w-1/3 min-w-32 p-1 pb-0 text-start text-sm font-medium">Trạng thái</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={receipt?.contact?.index >= 0 ? 'Liên hệ đã có trong CSDL' : 'Liên hệ mới'}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="w-1/3 p-1 pb-0 text-start text-sm font-medium">Họ tên</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={contact?.name || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="p-1 pb-0 text-start text-sm font-medium">Email</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={contact?.email || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="p-1 pb-0 text-start text-sm font-medium">Điện thoại</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={contact?.phone || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div className="mb-4 md:px-10">
							<h3 className="text-xl text-start font-semibold mb-2">Thông tin tiếp nhận mẫu</h3>
							<table className="w-full">
								<tbody>
									{receipt?.receipt_uid && (
										<tr>
											<td className="w-1/3 min-w-32 p-1 pb-0 text-start text-sm font-medium">Mã tiếp nhận mẫu</td>
											<td className="p-1 pb-0 text-start text-sm">
												<textarea
													value={receipt.receipt_uid}
													className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
													rows={1}
													readOnly
												/>
											</td>
										</tr>
									)}
									<tr>
										<td className="w-1/3 min-w-32 p-1 pb-0 text-start text-sm font-medium">Số yêu cầu đến</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={receipt?.request_number || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="p-1 pb-0 text-start text-sm font-medium">Người tiếp nhận</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={currentUser?.identity_name || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="p-1 pb-0 text-start text-sm font-medium">Ngày nhận mẫu</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={safeDateFormat(receipt?.receipt_date)}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="p-1 pb-0 text-start text-sm font-medium">Hạn trả dự kiến</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={safeDateFormat(receipt?.deadline)}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={1}
												readOnly
											/>
										</td>
									</tr>
									<tr>
										<td className="p-1 pb-0 text-start align-top text-sm font-medium">Ghi chú</td>
										<td className="p-1 pb-0 text-start text-sm">
											<textarea
												value={receipt?.note || ''}
												className="w-full p-1 resize-none outline-none focus:border-primary border border-gray-300 rounded placeholder-gray-500 text-black bg-white"
												rows={2}
												readOnly
											/>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div className="flex justify-end">
							<button
								className="bg-gray-500 text-white font-bold py-2 px-4 rounded mr-2"
								onClick={() => setShowConfirmation(false)}
							>
								Hủy bỏ
							</button>
							<button
								className="bg-blue-500 text-white font-bold py-2 px-4 rounded"
								onClick={() => {
									handleFinalConfirm();
									setShowConfirmation(false);
								}}
							>
								Xác nhận
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CreateReceipt;
