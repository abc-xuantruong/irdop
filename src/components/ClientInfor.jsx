import React, { useEffect, useState, useContext } from 'react';
import { apiGet, apiPost } from '../contexts/helperFunctionCallAPI';
import Breadcrumb from './Breadcrumb';
import { GlobalContext } from '../contexts/GlobalContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FilterBar from './FilterBar';

const ClientInfor = () => {
	const [clients, setClients] = useState([]);
	const [temporaryClients, setTemporaryClients] = useState([]);
	const [editMode, setEditMode] = useState({});
	const [showContactDetails, setShowContactDetails] = useState({});
	const [newContact, setNewContact] = useState({});
	const [showNewContactFields, setShowNewContactFields] = useState({});
	const [newClient, setNewClient] = useState({ contacts: [] });
	const [showNewClientFields, setShowNewClientFields] = useState(false);
	const [dataview, setDataview] = useState('client');
	const [currentList, setCurrentList] = useState([]); // New state for current list
	const [originalClientData, setOriginalClientData] = useState({}); // Store original data for cancel operation

	useEffect(() => {
		fetchClients();
		fetchTemporaryClients();
	}, []);

	const fetchClients = async () => {
		const url = 'https://black.irdop.org/hli1o7az/db/get/client';
		const response = await apiGet(url);
		setClients(response.data);
		setCurrentList(response.data); // Set current list
	};

	const fetchTemporaryClients = async () => {
		const url = 'https://black.irdop.org/hli1o7az/db/get/temporary_client';
		const response = await apiGet(url);
		setTemporaryClients(response.data);
		setCurrentList(response.data); // Set current list
	};

	const { setCurrentTitlePage, currentUser } = useContext(GlobalContext);
	useEffect(() => {
		setCurrentTitlePage('Khách hàng');
	}, [setCurrentTitlePage]);

	const handleEditClick = async (clientId) => {
		// If already in edit mode for this client, save changes
		if (editMode[clientId]) {
			try {
				const client =
					(clients || []).find((client) => client?.id === clientId) ||
					(temporaryClients || []).find((client) => client?.id === clientId) ||
					{};

				const url =
					dataview === 'client'
						? 'https://black.irdop.org/hli1o7az/db/update/client'
						: 'https://black.irdop.org/hli1o7az/db/update/temporary_client';

				// Add modified_by_uid to the client object and remove null properties
				let clientWithAuth = {
					...client,
					modifiedById: currentUser?.identity_uid,
				};

				// Remove null or undefined properties
				Object.keys(clientWithAuth).forEach((key) => {
					if (clientWithAuth[key] === null || clientWithAuth[key] === undefined) {
						delete clientWithAuth[key];
					}
				});

				// Clean contacts array if it exists
				if (Array.isArray(clientWithAuth.contacts)) {
					clientWithAuth.contacts = clientWithAuth.contacts.map((contact) => {
						const cleanContact = { ...contact };
						Object.keys(cleanContact).forEach((key) => {
							if (cleanContact[key] === null || cleanContact[key] === undefined) {
								delete cleanContact[key];
							}
						});
						return cleanContact;
					});
				}

				const response = await apiPost(url, { client: clientWithAuth });
				if (response.status === 200) {
					toast.success('Cập nhật thành công');

					// Update the state immediately to reflect changes
					if (dataview === 'client') {
						// Update clients state directly instead of fetching again
						setClients((prevClients) => prevClients.map((c) => (c.id === client.id ? client : c)));
					} else {
						// Update temporaryClients state directly
						setTemporaryClients((prevClients) => prevClients.map((c) => (c.id === client.id ? client : c)));
					}

					// Exit edit mode after successful save
					setEditMode((prev) => ({ ...prev, [clientId]: false }));
				} else {
					toast.error('Cập nhật thất bại');
				}
			} catch (error) {
				toast.error('Cập nhật thất bại');
				console.error('There was an error updating the client data!', error);
			}
		} else {
			// When entering edit mode for a client, exit edit mode for all other clients
			// First save any pending changes on other clients

			const editingClientId = Object.keys(editMode).find((id) => editMode[id] === true);
			if (editingClientId) {
				// Cancel edit on the currently editing row
				handleCancelEdit(editingClientId);
			}

			// Entering edit mode, save original data for possible cancellation
			const client =
				(dataview === 'client' ? clients : temporaryClients)?.find((client) => client?.id === clientId) || {};
			setOriginalClientData((prevData) => ({
				...prevData,
				[clientId]: JSON.parse(JSON.stringify(client)),
			}));
			// Set edit mode for this client only
			setEditMode(
				Object.keys(editMode).reduce((acc, id) => {
					acc[id] = id === clientId ? !editMode[clientId] : false;
					return acc;
				}, {}),
			);
			setEditMode((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
		}
	};

	const handleCancelEdit = (clientId) => {
		// Restore original data
		if (dataview === 'client') {
			setClients(clients.map((client) => (client.id === clientId ? originalClientData[clientId] : client)));
		} else {
			setTemporaryClients(
				temporaryClients.map((client) => (client.id === clientId ? originalClientData[clientId] : client)),
			);
		}

		// Exit edit mode
		setEditMode((prev) => ({ ...prev, [clientId]: false }));
		// Also hide any new contact fields
		setShowNewContactFields((prev) => ({ ...prev, [clientId]: false }));
	};

	const handleDeleteClick = (clientId) => {
		if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
			apiPost('https://black.irdop.org/hli1o7az/db/delete/client', {
				id: clientId,
				modifiedById: currentUser?.identity_uid,
			})
				.then((response) => {
					if (response.status === 200) {
						toast.success('Xóa thành công');
						fetchClients();
					} else {
						toast.error('Xóa thất bại');
					}
				})
				.catch((error) => {
					toast.error('Xóa thất bại');
					console.error('There was an error deleting the client data!', error);
				});
		}
	};

	const handleContactClick = (clientId, contactIndex) => {
		setShowContactDetails((prev) => ({
			...prev,
			[clientId]: prev[clientId] === contactIndex ? null : contactIndex,
		}));
	};

	const handleChange = (clientId, field, value) => {
		setClients((prevClients) =>
			(prevClients || []).map((client) => (client?.id === clientId ? { ...client, [field]: value } : client)),
		);
	};

	const handleContactChange = (clientId, contactIndex, field, value) => {
		setClients((prevClients) =>
			(prevClients || []).map((client) =>
				client?.id === clientId
					? {
							...client,
							contacts: (client?.contacts || []).map((contact, index) =>
								index === contactIndex ? { ...contact, [field]: value } : contact,
							),
					  }
					: client,
			),
		);
	};

	const handleNewContactChange = (clientId, field, value) => {
		setNewContact((prev) => ({
			...prev,
			[clientId]: { ...prev[clientId], [field]: value },
		}));
	};

	const handleAddNewContact = (clientId) => {
		const client = (clients || []).find((client) => client?.id === clientId) || {};
		const contacts = client?.contacts || [];

		const newContactData = {
			...(newContact[clientId] || {}), // Add fallback for undefined newContact
			index: contacts.length,
		};

		setClients((prevClients) =>
			(prevClients || []).map((client) =>
				client?.id === clientId
					? {
							...client,
							contacts: [...(client?.contacts || []), newContactData],
					  }
					: client,
			),
		);
		setNewContact((prev) => ({ ...prev, [clientId]: {} }));
		setShowNewContactFields((prev) => ({ ...prev, [clientId]: false }));
	};

	const handleShowNewContactFields = (clientId) => {
		setShowNewContactFields((prev) => ({ ...prev, [clientId]: true }));
	};

	const handleCancelNewContact = (clientId) => {
		setShowNewContactFields((prev) => ({ ...prev, [clientId]: false }));
		setNewContact((prev) => ({ ...prev, [clientId]: {} }));
	};

	const handleDeleteContact = (clientId, contactIndex) => {
		setClients((prevClients) =>
			(prevClients || []).map((client) =>
				client?.id === clientId
					? {
							...client,
							contacts: (client?.contacts || []).filter((_, index) => index !== contactIndex),
					  }
					: client,
			),
		);
	};

	const handleTemporaryClientsClick = () => {
		// Reset all edit states when switching views
		setEditMode({});
		setShowContactDetails({});
		setShowNewContactFields({});

		if (dataview === 'temporary') {
			setCurrentList(clients); // Set current list
		} else {
			setCurrentList(temporaryClients); // Set current list
		}
		setDataview((prev) => (prev === 'client' ? 'temporary' : 'client'));
	};

	const handleNewClientChange = (field, value) => {
		setNewClient((prev) => ({ ...prev, [field]: value }));
	};

	const handleUpdateTemporaryClient = async (client) => {
		if (!client) return; // Guard clause to prevent null access

		const url = 'https://black.irdop.org/hli1o7az/db/update/temporary_client';

		// Create a copy of the client object
		let clientWithAuth = {
			...client,
			modifiedById: currentUser?.identity_uid,
		};

		// Remove null or undefined properties
		Object.keys(clientWithAuth).forEach((key) => {
			if (clientWithAuth[key] === null || clientWithAuth[key] === undefined) {
				delete clientWithAuth[key];
			}
		});

		// Clean contacts array if it exists
		if (Array.isArray(clientWithAuth.contacts)) {
			clientWithAuth.contacts = clientWithAuth.contacts
				.filter((contact) => contact !== null && contact !== undefined)
				.map((contact) => {
					const cleanContact = { ...contact };
					Object.keys(cleanContact).forEach((key) => {
						if (cleanContact[key] === null || cleanContact[key] === undefined) {
							delete cleanContact[key];
						}
					});
					return cleanContact;
				});

			// If contacts array is empty after cleaning, remove it
			if (clientWithAuth.contacts.length === 0) {
				delete clientWithAuth.contacts;
			}
		} else if (!clientWithAuth.contacts) {
			delete clientWithAuth.contacts;
		}

		try {
			const response = await apiPost(url, { client: clientWithAuth });
			if (response.status === 200) {
				toast.success('Cập nhật thành công');
				await fetchTemporaryClients();
			} else {
				toast.error('Có lỗi xảy ra, cập nhật thất bại!');
			}
		} catch (error) {
			toast.error('Có lỗi xảy ra, cập nhật thất bại!');
			console.error('Error updating temporary client:', error);
		}
	};

	const handleAddNewClient = (clientId) => {
		// Base client object from either temporary clients or new client form

		// Create a clean client object with only the necessary properties
		let cleanClient = {
			client_uid: newClient.client_uid || '',
			client_name: newClient.client_name || '',
			client_address: newClient.client_address || '',
			legal_id: newClient.legal_id || '',
			createdById: currentUser?.identity_uid,
			modifiedById: currentUser?.identity_uid,
		};

		// Remove empty string properties
		Object.keys(cleanClient).forEach((key) => {
			if (cleanClient[key] === '') {
				delete cleanClient[key];
			}
		});

		// Handle contacts separately to clean each contact object
		if (Array.isArray(newClient.contacts) && newClient.contacts.length > 0) {
			cleanClient.contacts = newClient.contacts
				.filter((contact) => contact && (contact.name || contact.email || contact.phone))
				.map((contact) => {
					const cleanContact = {
						name: contact.name || '',
						email: contact.email || '',
						phone: contact.phone || '',
						index: contact.index || 0,
					};

					// Remove empty string properties from contact
					Object.keys(cleanContact).forEach((key) => {
						if (cleanContact[key] === '') {
							delete cleanContact[key];
						}
					});

					return cleanContact;
				});

			// If all contacts were filtered out, don't include the contacts property
			if (cleanClient.contacts.length === 0) {
				delete cleanClient.contacts;
			}
		}

		const url = 'https://black.irdop.org/hli1o7az/db/insert/client';

		apiPost(url, { client: cleanClient })
			.then((response) => {
				if (response.status === 200) {
					toast.success('Thêm mới thành công');
					setNewClient({ contacts: [] });
					setShowNewClientFields(false);
					fetchClients();
					fetchTemporaryClients();
				} else {
					toast.error('Thêm mới thất bại');
				}
			})
			.catch((error) => {
				toast.error('Thêm mới thất bại');
				console.error('There was an error adding the client data!', error);
			});
	};

	const handleShowNewClientFields = () => {
		setShowNewClientFields(true);
	};

	const handleCancelNewClient = () => {
		setShowNewClientFields(false);
		setNewClient({ contacts: [] });
	};

	const handleAddNewContactForNewClient = () => {
		const newContactData = {
			...(newContact['new'] || {}), // Add fallback
			index: (newClient?.contacts || []).length, // Add fallback
		};
		setNewClient((prev) => ({
			...prev,
			contacts: [...(prev?.contacts || []), newContactData],
		}));
		setNewContact((prev) => ({ ...prev, new: {} }));
		setShowNewContactFields((prev) => ({ ...prev, new: false }));
	};

	// Function to add new contact to temporary client
	const handleAddContactToTemporaryClient = (clientId) => {
		setShowNewContactFields((prev) => ({ ...prev, [clientId]: true }));

		// Initialize contacts array if it doesn't exist
		setTemporaryClients((prevClients) =>
			prevClients.map((client) => {
				if (client.id === clientId && (!client.contacts || !Array.isArray(client.contacts))) {
					return { ...client, contacts: [] };
				}
				return client;
			}),
		);
	};

	// Add new contact to temporary client
	const handleAddNewContactToTemporary = (clientId) => {
		if (!newContact[clientId]) return;

		const newContactData = {
			...newContact[clientId],
			index: 0,
		};

		setTemporaryClients((prevClients) =>
			prevClients.map((client) => {
				if (client.id === clientId) {
					const updatedContacts = Array.isArray(client.contacts)
						? [...client.contacts, newContactData]
						: [newContactData];
					return { ...client, contacts: updatedContacts };
				}
				return client;
			}),
		);

		setNewContact((prev) => ({ ...prev, [clientId]: {} }));
		setShowNewContactFields((prev) => ({ ...prev, [clientId]: false }));
	};

	return (
		<div className="w-full h-full relative">
			<ToastContainer />

			<div className="rounded-lg w-full p-4 bg-white flex flex-col h-full ">
				<div className="flex justify-between items-center mb-2">
					<h1 className="text-2xl font-bold text-primary text-start">Danh sách khách hàng</h1>
					<div className="flex flex-wrap text-sm">
						<button onClick={handleTemporaryClientsClick} className="p-1 bg-sky-500 text-white rounded mx-1 w-36">
							{dataview === 'temporary' ? 'Danh sách KH' : 'KH chưa thêm'}
						</button>
						<button onClick={handleShowNewClientFields} className="p-1 bg-sky-500 text-white rounded ml-1 w-36">
							Thêm khách hàng
						</button>
					</div>
				</div>
				<FilterBar
					source={currentList || []} // Add fallback for null currentList
					setCurrentList={dataview === 'client' ? setClients : setTemporaryClients}
					typeSearch="client"
				/>
				<div className="overflow-auto mt-1">
					<table className="w-full mt-1">
						<thead>
							<tr>
								<th className="border text-start p-2 w-20 min-w-20">UID</th>
								<th className="border text-start p-2 w-1/5 min-w-48">Tên khách hàng</th>
								<th className="border text-start p-2 w-1/4 min-w-52">Địa chỉ</th>
								<th className="border text-start p-2 w-36 min-w-36">MST/CCCD</th>
								<th className="border text-start p-2 w-[24%] min-w-48">Danh sách liên hệ</th>
								<th className="border text-start p-2 w-20 min-w-20">Thao tác</th>
							</tr>
						</thead>
						<tbody>
							{showNewClientFields && (
								<tr>
									<td className="border text-start p-2">
										<input
											type="text"
											placeholder="UID"
											value={newClient?.client_uid || ''} // Add nullish coalescing
											onChange={(e) => handleNewClientChange('client_uid', e.target.value)}
											className="border p-1 w-full bg-white"
										/>
									</td>
									<td className="border text-start p-2">
										<input
											type="text"
											placeholder="Tên khách hàng"
											value={newClient?.client_name || ''} // Add nullish coalescing
											onChange={(e) => handleNewClientChange('client_name', e.target.value)}
											className="border p-1 w-full bg-white"
										/>
									</td>
									<td className="border text-start p-2">
										<input
											type="text"
											placeholder="Địa chỉ"
											value={newClient?.client_address || ''} // Add nullish coalescing
											onChange={(e) => handleNewClientChange('client_address', e.target.value)}
											className="border p-1 w-full bg-white"
										/>
									</td>
									<td className="border text-start p-2">
										<input
											type="text"
											placeholder="MST/CCCD"
											value={newClient?.legal_id || ''} // Add nullish coalescing
											onChange={(e) => handleNewClientChange('legal_id', e.target.value)}
											className="border p-1 w-full bg-white"
										/>
									</td>
									<td className="border text-start p-2 pb-1">
										{(newClient?.contacts || []).length > 0 && ( // Add fallback and proper check
											<ul>
												{(newClient?.contacts || []).map((contact, index) => (
													<li key={index} className="flex flex-col space-y-2 mb-1">
														<div className="flex justify-between items-center">
															<button className="text-left w-full p-1">{contact?.name || ''}</button>
														</div>
														<input
															type="text"
															value={contact?.email || ''}
															disabled
															className="border p-1 w-full bg-white"
														/>
														<input
															type="text"
															value={contact?.phone || ''}
															disabled
															className="border p-1 w-full bg-white"
														/>
													</li>
												))}
											</ul>
										)}

										{!showNewContactFields['new'] && (
											<button
												onClick={() => handleShowNewContactFields('new')}
												className="p-1 bg-green-500 text-white rounded"
											>
												Thêm liên hệ
											</button>
										)}
										{showNewContactFields['new'] && (
											<div className="flex flex-col space-y-2">
												<input
													type="text"
													placeholder="Tên liên hệ"
													value={newContact['new']?.name || ''}
													onChange={(e) => handleNewContactChange('new', 'name', e.target.value)}
													className="border p-1 w-full bg-white"
												/>
												<input
													type="text"
													placeholder="Email"
													value={newContact['new']?.email || ''}
													onChange={(e) => handleNewContactChange('new', 'email', e.target.value)}
													className="border p-1 w-full bg-white"
												/>
												<input
													type="text"
													placeholder="Số điện thoại"
													value={newContact['new']?.phone || ''}
													onChange={(e) => handleNewContactChange('new', 'phone', e.target.value)}
													className="border p-1 w-full bg-white"
												/>
												<div className="flex justify-between">
													<button
														onClick={() => handleCancelNewContact('new')}
														className="p-1 bg-gray-500 text-white rounded"
													>
														Hủy
													</button>
													<button
														onClick={handleAddNewContactForNewClient}
														className="p-1 bg-green-500 text-white rounded"
													>
														Lưu
													</button>
												</div>
											</div>
										)}
									</td>
									<td className="border text-start p-2">
										<div className="flex justify-center items-center w-24px">
											<button onClick={handleAddNewClient} className="mr-2 p-1 bg-blue-500 text-white rounded">
												Thêm
											</button>
											<button onClick={handleCancelNewClient} className="p-1 bg-gray-500 text-white rounded">
												Hủy
											</button>
										</div>
									</td>
								</tr>
							)}
							{((dataview === 'client' ? clients : temporaryClients) || []).map((client, index) => (
								<tr key={index}>
									<td className="border text-start p-2">
										{editMode[client?.id] === true ? (
											<input
												type="text"
												value={client?.client_uid || ''}
												onChange={(e) => handleChange(client?.id, 'client_uid', e.target.value)}
												className="border p-1 w-full bg-white"
											/>
										) : (
											<span>{client?.client_uid || ''}</span>
										)}
									</td>
									<td className="border text-start p-2">
										{editMode[client?.id] ? (
											<input
												type="text"
												value={client?.client_name || ''}
												onChange={(e) => handleChange(client?.id, 'client_name', e.target.value)}
												className="border p-1 w-full bg-white"
											/>
										) : (
											<span>{client?.client_name || ''}</span>
										)}
									</td>
									<td className="border text-start p-2">
										{editMode[client?.id] ? (
											<input
												type="text"
												value={client?.client_address || ''}
												onChange={(e) => handleChange(client?.id, 'client_address', e.target.value)}
												className="border p-1 w-full bg-white"
											/>
										) : (
											<span>{client?.client_address || ''}</span>
										)}
									</td>
									<td className="border text-start p-2">
										{editMode[client?.id] ? (
											<input
												type="text"
												value={client?.legal_id || ''}
												onChange={(e) => handleChange(client?.id, 'legal_id', e.target.value)}
												className="border p-1 w-full bg-white"
											/>
										) : (
											<span>{client?.legal_id || ''}</span>
										)}
									</td>
									<td className="border text-start p-2 pb-1">
										{client?.contacts && Array.isArray(client?.contacts) && client.contacts.length > 0 ? (
											<ul>
												{client.contacts.map((contact, index) => (
													<li key={index} className="flex flex-col space-y-2 mb-1">
														<div className="flex justify-between items-center">
															<button
																onClick={() => handleContactClick(client?.id, index)}
																className="text-left w-full p-1"
															>
																{contact?.name || ''}
															</button>
															{editMode[client?.id] && (
																<button
																	onClick={() => handleDeleteContact(client?.id, index)}
																	className="p-1 bg-red-500 text-white rounded ml-2"
																>
																	Xóa
																</button>
															)}
														</div>
														{showContactDetails[client?.id] === index && (
															<>
																{editMode[client?.id] ? (
																	<>
																		<input
																			type="text"
																			value={contact?.name || ''}
																			onChange={(e) => handleContactChange(client?.id, index, 'name', e.target.value)}
																			className="border p-1 w-full bg-white"
																		/>
																		<input
																			type="text"
																			value={contact?.email || ''}
																			onChange={(e) => handleContactChange(client?.id, index, 'email', e.target.value)}
																			className="border p-1 w-full bg-white"
																		/>
																		<input
																			type="text"
																			value={contact?.phone || ''}
																			onChange={(e) => handleContactChange(client?.id, index, 'phone', e.target.value)}
																			className="border p-1 w-full bg-white"
																		/>
																	</>
																) : (
																	<>
																		<input
																			type="text"
																			value={contact?.email || ''}
																			disabled
																			className="border p-1 w-full bg-white"
																		/>
																		<input
																			type="text"
																			value={contact?.phone || ''}
																			disabled
																			className="border p-1 w-full bg-white"
																		/>
																	</>
																)}
															</>
														)}
													</li>
												))}
												{editMode[client.id] && !showNewContactFields[client.id] && (
													<li className="flex flex-col space-y-2">
														<button
															onClick={() => handleShowNewContactFields(client.id)}
															className="p-1 bg-green-500 text-white rounded"
														>
															Thêm
														</button>
													</li>
												)}
												{editMode[client.id] && showNewContactFields[client.id] && (
													<li className="flex flex-col space-y-2">
														<input
															type="text"
															placeholder="Tên liên hệ"
															value={newContact[client.id]?.name || ''}
															onChange={(e) => handleNewContactChange(client.id, 'name', e.target.value)}
															className="border p-1 w-full bg-white"
														/>
														<input
															type="text"
															placeholder="Email"
															value={newContact[client.id]?.email || ''}
															onChange={(e) => handleNewContactChange(client.id, 'email', e.target.value)}
															className="border p-1 w-full bg-white"
														/>
														<input
															type="text"
															placeholder="Số điện thoại"
															value={newContact[client.id]?.phone || ''}
															onChange={(e) => handleNewContactChange(client.id, 'phone', e.target.value)}
															className="border p-1 w-full bg-white"
														/>
														<div className="flex justify-between">
															<button
																onClick={() => handleAddNewContact(client.id)}
																className="p-1 bg-green-500 text-white rounded"
															>
																Lưu
															</button>
															<button
																onClick={() => handleCancelNewContact(client.id)}
																className="p-1 bg-gray-500 text-white rounded"
															>
																Hủy
															</button>
														</div>
													</li>
												)}
											</ul>
										) : (
											<div>
												{editMode[client?.id] ? (
													// Display add contact form when in edit mode with no contacts
													showNewContactFields[client?.id] ? (
														<div className="flex flex-col space-y-2">
															<input
																type="text"
																placeholder="Tên liên hệ"
																value={newContact[client.id]?.name || ''}
																onChange={(e) => handleNewContactChange(client.id, 'name', e.target.value)}
																className="border p-1 w-full bg-white"
															/>
															<input
																type="text"
																placeholder="Email"
																value={newContact[client.id]?.email || ''}
																onChange={(e) => handleNewContactChange(client.id, 'email', e.target.value)}
																className="border p-1 w-full bg-white"
															/>
															<input
																type="text"
																placeholder="Số điện thoại"
																value={newContact[client.id]?.phone || ''}
																onChange={(e) => handleNewContactChange(client.id, 'phone', e.target.value)}
																className="border p-1 w-full bg-white"
															/>
															<div className="flex justify-between">
																<button
																	onClick={() =>
																		dataview === 'client'
																			? handleAddNewContact(client.id)
																			: handleAddNewContactToTemporary(client.id)
																	}
																	className="p-1 bg-green-500 text-white rounded mr-2"
																>
																	Lưu
																</button>
																<button
																	onClick={() => handleCancelNewContact(client.id)}
																	className="p-1 bg-gray-500 text-white rounded"
																>
																	Hủy
																</button>
															</div>
														</div>
													) : (
														<button
															onClick={() =>
																dataview === 'client'
																	? handleShowNewContactFields(client.id)
																	: handleAddContactToTemporaryClient(client.id)
															}
															className="p-1 bg-green-500 text-white rounded"
														>
															Thêm liên hệ
														</button>
													)
												) : (
													<span className="text-gray-500 italic">Không có liên hệ</span>
												)}
											</div>
										)}
									</td>
									<td className="border text-start p-2 ">
										<div className="flex justify-center items-center w-24px">
											{dataview === 'temporary' ? (
												<button
													onClick={() => handleUpdateTemporaryClient(client)}
													className=" p-1 bg-cyan-500 text-white rounded w-[90px]"
												>
													Cập nhập
												</button>
											) : (
												<>
													<button
														onClick={() => handleEditClick(client?.id)}
														className="mr-2 p-1 bg-blue-500 text-white rounded"
													>
														{editMode[client?.id] ? 'Lưu' : 'Sửa'}
													</button>
													{editMode[client?.id] ? (
														<button
															onClick={() => handleCancelEdit(client?.id)}
															className="p-1 bg-gray-500 text-white rounded"
														>
															Hủy
														</button>
													) : (
														<button
															onClick={() => handleDeleteClick(client?.id)}
															className="p-1 bg-red-500 text-white rounded"
														>
															Xóa
														</button>
													)}
												</>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default ClientInfor;
