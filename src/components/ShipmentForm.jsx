import React, { useState, useContext, useEffect, useCallback } from 'react';
import { apiPost, apiGet } from '../contexts/helperFunctionCallAPI';
import { GlobalContext } from '../contexts/GlobalContext';
import { FaBox, FaUser, FaTruck } from 'react-icons/fa';

const ShipmentForm = ({ receipt, onClose, onOrderUpdate, mode = 'auto' }) => {
	console.log('Receipt data:', receipt);
	console.log('Mode:', mode);
	const { currentUser } = useContext(GlobalContext);

	// Initialize form data based on mode
	const getInitialFormData = useCallback(() => {
		let clientAddress = '';
		// Apply receiver/client priority logic for both modes
		// Address: reportRecipient.address first, then client.clientAddress
		if (receipt?.reportRecipient?.address && receipt?.reportRecipient?.address.trim !== '') {
			clientAddress = receipt?.reportRecipient?.address || receipt?.client?.clientAddress || '';
		} else {
			clientAddress = receipt?.client?.clientAddress || '';
		}

		let clientContactName = '';
		// Contact name: reportRecipient.name first, then contactPerson.name
		if (receipt?.reportRecipient?.name && receipt?.reportRecipient?.name.trim() !== '') {
			clientContactName = receipt?.reportRecipient?.name || '';
		} else {
			clientContactName = receipt?.contactPerson?.name || receipt?.client?.clientName || '';
		}

		let clientContactPhone = '';
		// Phone: if reportRecipient.name exists, leave blank; otherwise use contactPerson.phone
		if (receipt?.reportRecipient?.phone && receipt?.reportRecipient?.phone.trim() !== '') {
			clientContactPhone = receipt?.reportRecipient?.phone || '';
		} else {
			clientContactPhone = receipt?.contactPerson?.phone || receipt?.client?.clientPhone || '';
		}

		if (mode === 'new') {
			// For new shipments, use receiver/client data but blank product name
			return {
				clientAddress,
				clientContactName,
				clientContactPhone,
				clientContactEmail: receipt?.contactPerson?.email || '',
				notes: '',
				// Thông tin người gửi mặc định
				senderName: 'VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN',
				senderAddress: '12 Phùng Khoang 2',
				senderPhone: '0868872578',
				senderEmail: 'kiemnghiem@irdop.org',
				// Thông tin hàng hóa mặc định - completely blank for new shipments
				productName: '',
				productQuantity: 1,
				productWeight: 100,
				productType: 'HH',
			};
		} else {
			// For auto mode, use existing receipt data with priority logic
			return {
				clientAddress,
				clientContactName,
				clientContactPhone,
				clientContactEmail: receipt?.contactPerson?.email || '',
				notes: '',
				// Thông tin người gửi mặc định
				senderName: 'VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN',
				senderAddress: '12 Phùng Khoang 2',
				senderPhone: '0868872578',
				senderEmail: 'kiemnghiem@irdop.org',
				// Thông tin hàng hóa - format mới: <số lượng sampleId> x PPT tiếp nhận <receiptId> Bao gồm các mã: \n <Danh sách sampleId xuống dòng> \n <clientName>
				productName: `${receipt?.samples?.length || 0} x PPT tiếp nhận ${receipt?.receiptId || ''} Bao gồm các mã:${
					receipt?.samples?.length ? `\n${receipt?.samples.map((s) => s.sampleId).join('\n')}` : ''
				}${receipt?.client?.clientName ? `\n${receipt?.client?.clientName}` : ''}`,
				productQuantity: 1,
				productWeight: 100,
				productType: 'HH',
			};
		}
	}, [
		mode,
		receipt?.reportRecipient?.address,
		receipt?.reportRecipient?.name,
		receipt?.client?.clientAddress,
		receipt?.contactPerson?.name,
		receipt?.contactPerson?.phone,
		receipt?.contactPerson?.email,
		receipt?.samples,
		receipt?.receiptId,
		receipt?.client?.clientName,
	]);

	const [formData, setFormData] = useState(() => getInitialFormData());

	// Reinitialize form data when receipt or mode changes
	useEffect(() => {
		setFormData(getInitialFormData());
	}, [getInitialFormData]);
	const [addressMessage, setAddressMessage] = useState('');
	const [isCheckingAddress, setIsCheckingAddress] = useState(false);
	const [addressError, setAddressError] = useState(false);
	const [addressData, setAddressData] = useState({
		address: '',
		province_id: '',
		district_id: '',
		wards_id: '',
	});
	const [serviceType, setServiceType] = useState('VTK');
	// Thông tin địa chỉ người gửi mặc định
	const [senderAddressData, setSenderAddressData] = useState({
		address: '12 Phùng Khoang 2',
		province_id: '1',
		district_id: '25',
		wards_id: '497',
	}); // State to store province names
	const [provinceNames, setProvinceNames] = useState({});
	// State to store district names
	const [districtNames, setDistrictNames] = useState({});
	// State to store wards names
	const [wardsNames, setWardsNames] = useState({});

	// State for province, district, ward lists
	const [provinces, setProvinces] = useState([]);
	const [districts, setDistricts] = useState([]);
	const [wards, setWards] = useState([]);

	// Selected values for receiver address
	const [selectedProvince, setSelectedProvince] = useState('');
	const [selectedDistrict, setSelectedDistrict] = useState('');
	const [selectedWard, setSelectedWard] = useState('');

	// Function to fetch all provinces
	const fetchProvinces = async () => {
		try {
			const response = await fetch('https://partner.viettelpost.vn/v2/categories/listProvinceById?provinceId=-1');
			const data = await response.json();

			if (data.status === 200 && data.data) {
				setProvinces(data.data);
			}
		} catch (error) {
			console.error('Error fetching provinces:', error);
		}
	};

	// Function to fetch districts by province ID
	const fetchDistricts = async (provinceId) => {
		if (!provinceId) {
			setDistricts([]);
			return;
		}

		try {
			const response = await fetch(
				`https://partner.viettelpost.vn/v2/categories/listDistrict?provinceId=${provinceId}`,
			);
			const data = await response.json();

			if (data.status === 200 && data.data) {
				setDistricts(data.data);
			}
		} catch (error) {
			console.error('Error fetching districts:', error);
		}
	};

	// Function to fetch wards by district ID
	const fetchWards = async (districtId) => {
		if (!districtId) {
			setWards([]);
			return;
		}

		try {
			const response = await fetch(`https://partner.viettelpost.vn/v2/categories/listWards?districtId=${districtId}`);
			const data = await response.json();

			if (data.status === 200 && data.data) {
				setWards(data.data);
			}
		} catch (error) {
			console.error('Error fetching wards:', error);
		}
	};

	// Handle province selection
	const handleProvinceChange = (e) => {
		const provinceId = e.target.value;
		setSelectedProvince(provinceId);
		setSelectedDistrict('');
		setSelectedWard('');
		setDistricts([]);
		setWards([]);

		// Update addressData
		setAddressData((prev) => ({
			...prev,
			province_id: provinceId,
			district_id: '',
			wards_id: '',
		}));

		if (provinceId) {
			fetchDistricts(provinceId);
		}
	};

	// Handle district selection
	const handleDistrictChange = (e) => {
		const districtId = e.target.value;
		setSelectedDistrict(districtId);
		setSelectedWard('');
		setWards([]);

		// Update addressData
		setAddressData((prev) => ({
			...prev,
			district_id: districtId,
			wards_id: '',
		}));

		if (districtId) {
			fetchWards(districtId);
		}
	};

	// Handle ward selection
	const handleWardChange = (e) => {
		const wardId = e.target.value;
		setSelectedWard(wardId);

		// Update addressData
		setAddressData((prev) => ({
			...prev,
			wards_id: wardId,
		}));
	};

	// Function to fetch province name by ID
	const fetchProvinceName = async (provinceId) => {
		if (!provinceId || provinceNames[provinceId]) return;

		try {
			const response = await fetch(
				`https://partner.viettelpost.vn/v2/categories/listProvinceById?provinceId=${provinceId}`,
			);
			const data = await response.json();

			if (data.status === 200 && data.data && data.data.length > 0) {
				setProvinceNames((prev) => ({
					...prev,
					[provinceId]: data.data[0].PROVINCE_NAME,
				}));
			}
		} catch (error) {
			console.error('Error fetching province name:', error);
		}
	};

	// Function to fetch district name by ID
	const fetchDistrictName = async (provinceId, districtId) => {
		if (!provinceId || !districtId || districtNames[districtId]) return;

		try {
			const response = await fetch(
				`https://partner.viettelpost.vn/v2/categories/listDistrict?provinceId=${provinceId}`,
			);
			const data = await response.json();

			if (data.status === 200 && data.data && data.data.length > 0) {
				const district = data.data.find((d) => d.DISTRICT_ID.toString() === districtId.toString());
				if (district) {
					setDistrictNames((prev) => ({
						...prev,
						[districtId]: district.DISTRICT_NAME,
					}));
				}
			}
		} catch (error) {
			console.error('Error fetching district name:', error);
		}
	};

	// Function to fetch wards name by ID
	const fetchWardsName = async (districtId, wardsId) => {
		if (!districtId || !wardsId || wardsNames[wardsId]) return;

		try {
			const response = await fetch(`https://partner.viettelpost.vn/v2/categories/listWards?districtId=${districtId}`);
			const data = await response.json();

			if (data.status === 200 && data.data && data.data.length > 0) {
				const wards = data.data.find((w) => w.WARDS_ID.toString() === wardsId.toString());
				if (wards) {
					setWardsNames((prev) => ({
						...prev,
						[wardsId]: wards.WARDS_NAME,
					}));
				}
			}
		} catch (error) {
			console.error('Error fetching wards name:', error);
		}
	}; // Fetch provinces when component mounts
	useEffect(() => {
		fetchProvinces();
	}, []);

	// Sync selected values with addressData when it changes (from address check)
	useEffect(() => {
		if (addressData.province_id && addressData.province_id !== selectedProvince) {
			setSelectedProvince(addressData.province_id);
			fetchDistricts(addressData.province_id);
		}
		if (addressData.district_id && addressData.district_id !== selectedDistrict) {
			setSelectedDistrict(addressData.district_id);
			fetchWards(addressData.district_id);
		}
		if (addressData.wards_id && addressData.wards_id !== selectedWard) {
			setSelectedWard(addressData.wards_id);
		}
	}, [addressData.province_id, addressData.district_id, addressData.wards_id]);

	// Fetch province and district names when component mounts or IDs change
	useEffect(() => {
		if (senderAddressData.province_id) {
			fetchProvinceName(senderAddressData.province_id);
		}
		if (senderAddressData.province_id && senderAddressData.district_id) {
			fetchDistrictName(senderAddressData.province_id, senderAddressData.district_id);
		}
		if (senderAddressData.district_id && senderAddressData.wards_id) {
			fetchWardsName(senderAddressData.district_id, senderAddressData.wards_id);
		}
		if (addressData.province_id) {
			fetchProvinceName(addressData.province_id);
		}
		if (addressData.province_id && addressData.district_id) {
			fetchDistrictName(addressData.province_id, addressData.district_id);
		}
		if (addressData.district_id && addressData.wards_id) {
			fetchWardsName(addressData.district_id, addressData.wards_id);
		}
	}, [
		senderAddressData.province_id,
		senderAddressData.district_id,
		senderAddressData.wards_id,
		addressData.province_id,
		addressData.district_id,
		addressData.wards_id,
	]);
	// Function to format the full address from components
	const getFormattedFullAddress = () => {
		if (!addressData.address) return '';

		const parts = [
			addressData.address,
			wards.find((w) => w.WARDS_ID == addressData.wards_id)?.WARDS_NAME || wardsNames[addressData.wards_id],
			districts.find((d) => d.DISTRICT_ID == addressData.district_id)?.DISTRICT_NAME ||
				districtNames[addressData.district_id],
			provinces.find((p) => p.PROVINCE_ID == addressData.province_id)?.PROVINCE_NAME ||
				provinceNames[addressData.province_id],
		];

		// Filter out empty parts and join with commas
		return parts.filter((part) => part).join(', ');
	};

	// Function to display province with name
	const displayProvinceWithName = (provinceId) => {
		if (!provinceId) return '';
		const provinceName = provinceNames[provinceId];
		return provinceName ? (
			<span
				dangerouslySetInnerHTML={{
					__html: `<b>${provinceId}:</b> ${provinceName}`,
				}}
			/>
		) : (
			provinceId
		);
	};

	// Function to display district with name
	const displayDistrictWithName = (districtId) => {
		if (!districtId) return '';
		const districtName = districtNames[districtId];
		return districtName ? (
			<span
				dangerouslySetInnerHTML={{
					__html: `<b>${districtId}:</b> ${districtName}`,
				}}
			/>
		) : (
			districtId
		);
	};

	// Function to display wards with name
	const displayWardsWithName = (wardsId) => {
		if (!wardsId) return '';
		const wardsName = wardsNames[wardsId];
		return wardsName ? (
			<span
				dangerouslySetInnerHTML={{
					__html: `<b>${wardsId}:</b> ${wardsName}`,
				}}
			/>
		) : (
			wardsId
		);
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	}; // Tính toán các từ khóa liên quan
	const getRelatedKeywords = () => {
		const sampleUIDs = receipt?.samples?.map((sample) => sample.sampleId) || [];
		const receiptUID = receipt?.receiptId ? [receipt.receiptId] : [];

		return {
			sampleUIDs,
			receiptUID,
		};
	};

	const { sampleUIDs, receiptUID } = getRelatedKeywords();

	// State để quản lý các UID bị loại bỏ
	const [removedUIDs, setRemovedUIDs] = useState(new Set());

	// Handle remove UID
	const handleRemoveUID = (uid) => {
		setRemovedUIDs((prev) => new Set([...prev, uid]));
	};

	// Handle restore UID
	const handleRestoreUID = (uid) => {
		setRemovedUIDs((prev) => {
			const newSet = new Set(prev);
			newSet.delete(uid);
			return newSet;
		});
	};
	// Tính toán lại foreignkeyUIDS với các UID không bị loại bỏ
	const getCurrentForeignkeyUIDS = () => {
		const allUIDs = [...sampleUIDs, ...receiptUID];
		return allUIDs.filter((uid) => !removedUIDs.has(uid));
	}; // Cập nhật tên hàng hóa với danh sách UIDs
	useEffect(() => {
		const foreignKeyUIDs = getCurrentForeignkeyUIDS();
		const sampleList = sampleUIDs.filter((uid) => !removedUIDs.has(uid));

		if (foreignKeyUIDs.length > 0) {
			// Format mới: <số lượng sampleId> x PPT tiếp nhận <receiptId> Bao gồm các mã: \n <Danh sách sampleId xuống dòng> \n <clientName>
			const receiptId = receiptUID.length > 0 && !removedUIDs.has(receiptUID[0]) ? receiptUID[0] : '';
			const sampleListFormatted = sampleList.length > 0 ? sampleList.join('\n') : '';
			const clientName = receipt?.client?.clientName || '';

			let productNameFormat = `${sampleList.length || 0} x PPT tiếp nhận ${receiptId} Bao gồm các mã:`;
			if (sampleListFormatted) {
				productNameFormat += `\n${sampleListFormatted}`;
			}
			if (clientName) {
				productNameFormat += `\n${clientName}`;
			}

			setFormData((prev) => ({
				...prev,
				productName: productNameFormat,
			}));
		}
	}, []);
	const checkAddress = async () => {
		if (!formData.clientAddress.trim()) {
			setAddressMessage('Vui lòng nhập địa chỉ');
			setAddressError(true);
			return;
		}

		setIsCheckingAddress(true);
		setAddressMessage('');
		setAddressError(false);
		try {
			const response = await apiPost('https://red.irdop.org/v1/postal/map/check_address', {
				address: formData.clientAddress,
			});

			if (response.data && response.data.data) {
				// Always use the returned data, even if there's an error
				const newAddressData = {
					address: response.data.data.address || '',
					province_id: response.data.data.province_id || '',
					district_id: response.data.data.district_id || '',
					wards_id: response.data.data.wards_id || '',
				};
				setAddressData(newAddressData);

				// Fetch names for the available IDs
				if (newAddressData.province_id) {
					fetchProvinceName(newAddressData.province_id);
				}
				if (newAddressData.province_id && newAddressData.district_id) {
					fetchDistrictName(newAddressData.province_id, newAddressData.district_id);
				}
				if (newAddressData.district_id && newAddressData.wards_id) {
					fetchWardsName(newAddressData.district_id, newAddressData.wards_id);
				} // Show appropriate message and set error state based on API response
				setAddressError(response.data.error || false);
				if (response.data.error) {
					setAddressMessage('Cảnh báo: ' + (response.data.message || 'Địa chỉ không hoàn chỉnh'));
				} else {
					setAddressMessage(response.data.message || 'Đã kiểm tra địa chỉ');
				}

				// Auto-set service type based on province_id
				if (newAddressData.province_id === '1') {
					setServiceType('VCN');
				} else {
					setServiceType('VTK');
				}
			} else if (response.data && response.data.error) {
				setAddressError(true);
				setAddressMessage('Lỗi: ' + (response.data.message || 'Không thể kiểm tra địa chỉ'));
			} else {
				setAddressError(true);
				setAddressMessage('Lỗi: Không thể kiểm tra địa chỉ');
			}
		} catch (error) {
			setAddressError(true);
			setAddressMessage('Lỗi khi kiểm tra địa chỉ');
		} finally {
			setIsCheckingAddress(false);
		}
	};
	// Xử lý gửi đơn hàng
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [orderData, setOrderData] = useState(null);
	const [hasExistingOrder, setHasExistingOrder] = useState(false); // Load existing order data if tracking number exists
	useEffect(() => {
		// Only load existing order if mode is 'auto' and we have a single tracking number
		if (mode === 'auto' && receipt?._deprecated_trackingNumber && !receipt?._deprecated_trackingNumber.includes(',')) {
			// Skip API call for direct pickup tracking numbers (starting with TT)
			if (receipt._deprecated_trackingNumber.startsWith('TT')) {
				setHasExistingOrder(true); // Set as existing to show direct pickup status
			} else {
				loadExistingOrder(receipt._deprecated_trackingNumber);
			}
		} else if (
			mode === 'new' ||
			(receipt?._deprecated_trackingNumber && receipt?._deprecated_trackingNumber.includes(','))
		) {
			// For 'new' mode or multiple tracking numbers, don't load existing order data
			// Just show the form for creating a new shipment
			setHasExistingOrder(false);
		}
	}, [receipt?._deprecated_trackingNumber, mode]);
	const loadExistingOrder = async (trackingNumber) => {
		try {
			// Only load for the first tracking number if there are multiple
			const firstTrackingNumber = trackingNumber.split(',')[0].trim();

			const response = await apiGet(`https://red.irdop.org/v1/postal/vietel/get_order/${firstTrackingNumber}`);
			if (response.success || response.data) {
				const orderInfo = response.data || response;
				setOrderData(orderInfo);
				setHasExistingOrder(true);

				// Load data into form if available
				if (orderInfo.sender) {
					setFormData((prev) => ({
						...prev,
						senderName: orderInfo.sender.name || prev.senderName,
						senderAddress: orderInfo.sender.address || prev.senderAddress,
						senderPhone: orderInfo.sender.phone || prev.senderPhone,
						senderEmail: orderInfo.sender.email || prev.senderEmail,
					}));
				}

				if (orderInfo.reportRecipient) {
					setFormData((prev) => ({
						...prev,
						clientContactName: orderInfo.reportRecipient.name || prev.clientContactName,
						clientAddress: orderInfo.reportRecipient.address || prev.clientAddress,
						clientContactPhone: orderInfo.reportRecipient.phone || prev.clientContactPhone,
						clientContactEmail: orderInfo.reportRecipient.email || prev.clientContactEmail,
					}));

					// Set address data for reportRecipient
					setAddressData({
						address: orderInfo.reportRecipient.address || '',
						province_id: orderInfo.reportRecipient.provinceId || '',
						district_id: orderInfo.reportRecipient.districtId || '',
						wards_id: orderInfo.reportRecipient.wardsId || '',
					});
				}

				if (orderInfo.product) {
					setFormData((prev) => ({
						...prev,
						productName: orderInfo.product.name || prev.productName,
						productQuantity: orderInfo.product.quantity || prev.productQuantity,
						productWeight: orderInfo.product.weight || prev.productWeight,
						productType: orderInfo.product.type || prev.productType,
					}));
				}
				if (orderInfo.order) {
					setFormData((prev) => ({
						...prev,
						notes: orderInfo.order.note || prev.notes,
					}));

					// Set service type from existing order
					if (orderInfo.order.service) {
						setServiceType(orderInfo.order.service);
					}
				}
			}
		} catch (error) {
			console.error('Error loading existing order:', error);
		}
	}; // Handle cancel order
	const handleCancelOrder = async () => {
		// Get the current tracking number being viewed and the original full tracking number
		const currentTrackingNumber = receipt?._deprecated_trackingNumber;
		const originalTrackingNumber = receipt?._deprecated_originalTrackingNumber || receipt?._deprecated_trackingNumber;

		if (!currentTrackingNumber) return;

		if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
			try {
				setIsSubmitting(true);

				// Cancel order via API
				const response = await apiPost('https://red.irdop.org/v1/postal/status/cancel', {
					trackingNumber: currentTrackingNumber,
				});

				if (response.success || response.data) {
					// Handle tracking number removal
					if (originalTrackingNumber && originalTrackingNumber.includes(',')) {
						// Multiple tracking numbers - remove only the cancelled one
						const trackingNumbers = originalTrackingNumber
							.split(',')
							.map((num) => num.trim())
							.filter((num) => num !== '');
						const remainingNumbers = trackingNumbers.filter((num) => num !== currentTrackingNumber);

						// Only update if there are remaining tracking numbers
						if (remainingNumbers.length >= 1) {
							const updatedTrackingNumber = remainingNumbers.join(',');

							const payload = {
								receipt: {
									id: receipt.id,
									receiptId: receipt.receiptId,
									_deprecated_trackingNumber: updatedTrackingNumber,
								},
							};
							await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

							// Call onOrderUpdate to refresh dashboard data
							if (onOrderUpdate) {
								const updatedReceipt = {
									...receipt,
									_deprecated_trackingNumber: updatedTrackingNumber,
								};
								onOrderUpdate(updatedReceipt);
							}
						} else {
							// If no tracking numbers remain, clear all tracking info
							const payload = {
								receipt: {
									id: receipt.id,
									receiptId: receipt.receiptId,
									_deprecated_postalOrderCreatedAt: null,
									_deprecated_postalOrderCreatedById: null,
									_deprecated_trackingNumber: '',
								},
							};
							await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

							// Call onOrderUpdate to refresh dashboard data
							if (onOrderUpdate) {
								const updatedReceipt = {
									...receipt,
									_deprecated_postalOrderCreatedAt: null,
									_deprecated_postalOrderCreatedById: null,
									_deprecated_trackingNumber: '',
								};
								onOrderUpdate(updatedReceipt);
							}
						}
					} else {
						// Single tracking number - clear all tracking info
						const payload = {
							receipt: {
								id: receipt.id,
								receiptId: receipt.receiptId,
								_deprecated_postalOrderCreatedAt: null,
								_deprecated_postalOrderCreatedById: null,
								_deprecated_trackingNumber: '',
							},
						};
						await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

						// Call onOrderUpdate to refresh dashboard data
						if (onOrderUpdate) {
							const updatedReceipt = {
								...receipt,
								_deprecated_postalOrderCreatedAt: null,
								_deprecated_postalOrderCreatedById: null,
								_deprecated_trackingNumber: '',
							};
							onOrderUpdate(updatedReceipt);
						}
					}

					alert('Đã hủy đơn hàng thành công!');
					onClose && onClose();
				} else {
					alert('Có lỗi xảy ra khi hủy đơn hàng');
				}
			} catch (error) {
				console.error('Error canceling order:', error);
				alert('Có lỗi xảy ra khi hủy đơn hàng: ' + (error.message || 'Lỗi không xác định'));
			} finally {
				setIsSubmitting(false);
			}
		}
	};

	const handleSubmitOrder = async () => {
		try {
			setIsSubmitting(true);

			// Validation
			if (!formData.senderName.trim()) {
				alert('Vui lòng nhập tên người gửi');
				return;
			}
			if (!formData.senderAddress.trim()) {
				alert('Vui lòng nhập địa chỉ người gửi');
				return;
			}
			if (!formData.senderPhone.trim()) {
				alert('Vui lòng nhập số điện thoại người gửi');
				return;
			}
			if (!formData.senderEmail.trim()) {
				alert('Vui lòng nhập email người gửi');
				return;
			}
			if (!formData.clientContactName.trim()) {
				alert('Vui lòng nhập tên người nhận');
				return;
			}
			if (!formData.clientAddress.trim()) {
				alert('Vui lòng nhập địa chỉ người nhận');
				return;
			}
			if (!formData.clientContactPhone.trim()) {
				alert('Vui lòng nhập số điện thoại người nhận');
				return;
			}
			if (!addressData.address) {
				alert('Vui lòng kiểm tra địa chỉ người nhận để có địa chỉ chuẩn hóa');
				return;
			}
			if (!formData.productName.trim()) {
				alert('Vui lòng nhập tên hàng hóa');
				return;
			} // Tạo body request theo validation
			const requestBody = {
				sender: {
					name: formData.senderName,
					address: senderAddressData.address || formData.senderAddress,
					phone: formData.senderPhone,
					email: formData.senderEmail,
					wards_id: senderAddressData.wards_id,
					district_id: senderAddressData.district_id,
					province_id: senderAddressData.province_id,
				},
				receiver: {
					name: formData.clientContactName,
					address: addressData.address || formData.clientAddress,
					phone: formData.clientContactPhone,
					email: formData.clientContactEmail || '',
					...(addressData.wards_id && { wards_id: addressData.wards_id }),
					...(addressData.district_id && { district_id: addressData.district_id }),
					...(addressData.province_id && { province_id: addressData.province_id }),
				},
				product: {
					name: formData.productName,
					description: formData.productName, // Sử dụng productName làm description
					quantity: formData.productQuantity || 1,
					weight: formData.productWeight || 100,
					type: formData.productType || 'HH',
				},
				order: {
					payment: 3, // COD
					service: serviceType, // Use dynamic service type
					serviceAddress: '',
					voucher: '',
					note: formData.notes || 'Gửi phiếu phân tích',
				},
				foreignKeyUIDs: getCurrentForeignkeyUIDS(),
			};
			console.log('Sending order:', requestBody);

			const response = await apiPost('https://red.irdop.org/v1/postal/vietel/new-order', requestBody);

			// Check for successful response (status 200-299) and valid data
			if (response.status && response.status >= 200 && response.status < 300 && (response.success || response.data)) {
				// Lấy trackingNumber từ response
				const trackingNumber = response.data?.trackingNumber || response.trackingNumber;

				if (trackingNumber && receipt?.id && receipt?.receiptId) {
					// Update receipt với tracking number theo format handlePptSendChangeAPI
					try {
						// Add 7 hours to account for GMT+7
						const adjustedDate = new Date();
						adjustedDate.setHours(adjustedDate.getHours() + 7);
						const formattedDate = adjustedDate.toISOString();
						// Append new tracking number to existing ones (if any)
						let updatedTrackingNumber = trackingNumber;
						if (receipt._deprecated_trackingNumber && receipt._deprecated_trackingNumber.trim() !== '') {
							// Split existing tracking numbers, clean them, and add the new one
							const existingNumbers = receipt._deprecated_trackingNumber
								.split(',')
								.map((num) => num.trim())
								.filter((num) => num !== '');
							existingNumbers.push(trackingNumber);
							updatedTrackingNumber = existingNumbers.join(',');
						}

						const payload = {
							receipt: {
								id: receipt.id,
								receiptId: receipt.receiptId,
								_deprecated_postalOrderCreatedAt: formattedDate,
								_deprecated_postalOrderCreatedById: currentUser?.identityId,
								_deprecated_trackingNumber: updatedTrackingNumber,
							},
						};

						const updateResponse = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);
						if (updateResponse.status === 200) {
							console.log('Receipt updated successfully with tracking number:', trackingNumber); // Call onOrderUpdate to refresh dashboard data
							if (onOrderUpdate) {
								const updatedReceipt = {
									...receipt,
									_deprecated_postalOrderCreatedAt: formattedDate,
									_deprecated_postalOrderCreatedById: currentUser?.identityId,
									_deprecated_trackingNumber: updatedTrackingNumber,
								};
								onOrderUpdate(updatedReceipt);
							}
						} else {
							console.error('Error updating receipt:', updateResponse.data?.message);
						}
					} catch (updateError) {
						console.error('Error updating receipt:', updateError);
						// Vẫn hiển thị thành công vì đơn hàng đã được tạo
					}
				}

				alert(`Tạo đơn hàng thành công! ${trackingNumber ? `Mã vận đơn: ${trackingNumber}` : ''}`);
				onClose && onClose();
			} else {
				// Handle error cases including status 500
				const errorMessage = response.data?.message || response.message || 'Lỗi không xác định';
				const statusCode = response.status ? `(${response.status})` : '';
				alert(`Có lỗi xảy ra khi tạo đơn hàng ${statusCode}: ${errorMessage}`);
			}
		} catch (error) {
			console.error('Error submitting order:', error);
			alert('Có lỗi xảy ra khi tạo đơn hàng: ' + (error.message || 'Lỗi không xác định'));
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle direct customer pickup
	const handleDirectPickup = async () => {
		if (!receipt?.id || !receipt?.receiptId) {
			alert('Không có thông tin phiếu tiếp nhận để cập nhật');
			return;
		}

		try {
			setIsSubmitting(true);

			// Generate tracking number in format 'TT' + 'DDMMYYYY'
			const now = new Date();
			const day = String(now.getDate()).padStart(2, '0');
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const year = String(now.getFullYear());
			const trackingNumber = `TT${day}${month}${year}`;

			// Add 7 hours to account for GMT+7
			const adjustedDate = new Date();
			adjustedDate.setHours(adjustedDate.getHours() + 7);
			const formattedDate = adjustedDate.toISOString();

			// Append new tracking number to existing ones (if any)
			let updatedTrackingNumber = trackingNumber;
			if (receipt._deprecated_trackingNumber && receipt._deprecated_trackingNumber.trim() !== '') {
				// Split existing tracking numbers, clean them, and add the new one
				const existingNumbers = receipt._deprecated_trackingNumber
					.split(',')
					.map((num) => num.trim())
					.filter((num) => num !== '');
				existingNumbers.push(trackingNumber);
				updatedTrackingNumber = existingNumbers.join(',');
			}

			const payload = {
				receipt: {
					id: receipt.id,
					receiptId: receipt.receiptId,
					_deprecated_postalOrderCreatedAt: formattedDate,
					_deprecated_postalOrderCreatedById: currentUser?.identityId,
					_deprecated_trackingNumber: updatedTrackingNumber,
				},
			};

			const updateResponse = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

			if (updateResponse.status === 200) {
				console.log('Receipt updated successfully with direct pickup tracking number:', trackingNumber);

				// Call onOrderUpdate to refresh dashboard data
				if (onOrderUpdate) {
					const updatedReceipt = {
						...receipt,
						_deprecated_postalOrderCreatedAt: formattedDate,
						_deprecated_postalOrderCreatedById: currentUser?.identityId,
						_deprecated_trackingNumber: updatedTrackingNumber,
					};
					onOrderUpdate(updatedReceipt);
				}

				alert(`Đã cập nhật thành công! Mã theo dõi: ${trackingNumber}`);
				onClose && onClose();
			} else {
				console.error('Error updating receipt:', updateResponse.data?.message);
				alert('Có lỗi xảy ra khi cập nhật phiếu tiếp nhận');
			}
		} catch (error) {
			console.error('Error updating receipt for direct pickup:', error);
			alert('Có lỗi xảy ra khi cập nhật: ' + (error.message || 'Lỗi không xác định'));
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle removing direct pickup status
	const handleRemoveDirectPickup = async () => {
		if (!receipt?.id || !receipt?.receiptId || !receipt?._deprecated_trackingNumber) {
			alert('Không có thông tin phiếu tiếp nhận để cập nhật');
			return;
		}

		if (window.confirm('Bạn có chắc chắn muốn bỏ trạng thái nhận trực tiếp?')) {
			try {
				setIsSubmitting(true);

				// Get the current tracking number being viewed
				const currentTrackingNumber = receipt._deprecated_trackingNumber;
				const originalTrackingNumber = receipt._deprecated_originalTrackingNumber || receipt._deprecated_trackingNumber;

				// Remove the current tracking number from the list
				if (originalTrackingNumber && originalTrackingNumber.includes(',')) {
					// Multiple tracking numbers - remove only the current one
					const trackingNumbers = originalTrackingNumber
						.split(',')
						.map((num) => num.trim())
						.filter((num) => num !== '');
					const remainingNumbers = trackingNumbers.filter((num) => num !== currentTrackingNumber);

					if (remainingNumbers.length >= 1) {
						// Still have other tracking numbers
						const updatedTrackingNumber = remainingNumbers.join(',');

						const payload = {
							receipt: {
								id: receipt.id,
								receiptId: receipt.receiptId,
								_deprecated_trackingNumber: updatedTrackingNumber,
							},
						};
						await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

						// Call onOrderUpdate to refresh dashboard data
						if (onOrderUpdate) {
							const updatedReceipt = {
								...receipt,
								_deprecated_trackingNumber: updatedTrackingNumber,
							};
							onOrderUpdate(updatedReceipt);
						}
					} else {
						// No tracking numbers remain, clear all tracking info
						const payload = {
							receipt: {
								id: receipt.id,
								receiptId: receipt.receiptId,
								_deprecated_postalOrderCreatedAt: null,
								_deprecated_postalOrderCreatedById: null,
								_deprecated_trackingNumber: '',
							},
						};
						await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

						// Call onOrderUpdate to refresh dashboard data
						if (onOrderUpdate) {
							const updatedReceipt = {
								...receipt,
								_deprecated_postalOrderCreatedAt: null,
								_deprecated_postalOrderCreatedById: null,
								_deprecated_trackingNumber: '',
							};
							onOrderUpdate(updatedReceipt);
						}
					}
				} else {
					// Single tracking number - clear all tracking info
					const payload = {
						receipt: {
							id: receipt.id,
							receiptId: receipt.receiptId,
							_deprecated_postalOrderCreatedAt: null,
							_deprecated_postalOrderCreatedById: null,
							_deprecated_trackingNumber: '',
						},
					};
					await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

					// Call onOrderUpdate to refresh dashboard data
					if (onOrderUpdate) {
						const updatedReceipt = {
							...receipt,
							_deprecated_postalOrderCreatedAt: null,
							_deprecated_postalOrderCreatedById: null,
							_deprecated_trackingNumber: '',
						};
						onOrderUpdate(updatedReceipt);
					}
				}

				alert('Đã bỏ trạng thái nhận trực tiếp thành công!');
				onClose && onClose();
			} catch (error) {
				console.error('Error removing direct pickup status:', error);
				alert('Có lỗi xảy ra khi bỏ trạng thái: ' + (error.message || 'Lỗi không xác định'));
			} finally {
				setIsSubmitting(false);
			}
		}
	};

	// State for adding existing tracking number
	const [showAddTracking, setShowAddTracking] = useState(false);
	const [newTrackingNumber, setNewTrackingNumber] = useState('');

	// Handle adding existing tracking number
	const handleAddExistingTracking = async () => {
		if (!newTrackingNumber.trim()) {
			alert('Vui lòng nhập mã vận đơn');
			return;
		}

		if (!receipt?.id || !receipt?.receiptId) {
			alert('Không có thông tin phiếu tiếp nhận để cập nhật');
			return;
		}

		try {
			setIsSubmitting(true);

			// Add 7 hours to account for GMT+7
			const adjustedDate = new Date();
			adjustedDate.setHours(adjustedDate.getHours() + 7);
			const formattedDate = adjustedDate.toISOString();

			// Append new tracking number to existing ones (if any)
			let updatedTrackingNumber = newTrackingNumber.trim();
			if (receipt._deprecated_trackingNumber && receipt._deprecated_trackingNumber.trim() !== '') {
				// Split existing tracking numbers, clean them, and add the new one
				const existingNumbers = receipt._deprecated_trackingNumber
					.split(',')
					.map((num) => num.trim())
					.filter((num) => num !== '');

				// Check if tracking number already exists
				if (existingNumbers.includes(newTrackingNumber.trim())) {
					alert('Mã vận đơn này đã tồn tại');
					return;
				}

				existingNumbers.push(newTrackingNumber.trim());
				updatedTrackingNumber = existingNumbers.join(',');
			}

			const payload = {
				receipt: {
					id: receipt.id,
					receiptId: receipt.receiptId,
					_deprecated_postalOrderCreatedAt: formattedDate,
					_deprecated_postalOrderCreatedById: currentUser?.identityId,
					_deprecated_trackingNumber: updatedTrackingNumber,
				},
			};

			const updateResponse = await apiPost('https://red.irdop.org/v1/receipt/edit', payload);

			if (updateResponse.status === 200) {
				console.log('Receipt updated successfully with existing tracking number:', newTrackingNumber.trim());

				// Call onOrderUpdate to refresh dashboard data
				if (onOrderUpdate) {
					const updatedReceipt = {
						...receipt,
						_deprecated_postalOrderCreatedAt: formattedDate,
						_deprecated_postalOrderCreatedById: currentUser?.identityId,
						_deprecated_trackingNumber: updatedTrackingNumber,
					};
					onOrderUpdate(updatedReceipt);
				}

				alert(`Đã thêm mã vận đơn thành công: ${newTrackingNumber.trim()}`);
				setShowAddTracking(false);
				setNewTrackingNumber('');
				onClose && onClose();
			} else {
				console.error('Error updating receipt:', updateResponse.data?.message);
				alert('Có lỗi xảy ra khi cập nhật phiếu tiếp nhận');
			}
		} catch (error) {
			console.error('Error adding existing tracking number:', error);
			alert('Có lỗi xảy ra khi thêm mã vận đơn: ' + (error.message || 'Lỗi không xác định'));
		} finally {
			setIsSubmitting(false);
		}
	};

	// Check if this is a direct pickup tracking number - but only for existing tracking, not new shipments
	const isDirectPickup =
		mode !== 'new' &&
		receipt?._deprecated_trackingNumber &&
		receipt._deprecated_trackingNumber.split(',').some((tn) => tn.trim().startsWith('TT'));

	return (
		<div
			className={`shipment-form p-2 bg-gray-50 rounded-lg mx-auto relative mt-16 max-h-[90vh] overflow-auto ${
				isDirectPickup ? 'max-w-4xl' : 'max-w-7xl'
			}`}
		>
			{/* Header with title */}
			<div className="mb-6 text-center">
				<h2 className={`font-bold text-gray-800 ${isDirectPickup ? 'text-3xl' : 'text-2xl'}`}>
					{isDirectPickup ? 'Lấy trực tiếp' : 'Thông tin gửi hàng'}
				</h2>
				{isDirectPickup && (
					<p className="text-lg text-green-600 mt-2">Mã tracking: {receipt._deprecated_trackingNumber}</p>
				)}
			</div>{' '}
			{/* Grid layout for sender and receiver info */}
			{!isDirectPickup && (
				<>
					<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
						{' '}
						{/* Thông tin hàng hóa */}
						<div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
							<div className="flex items-center mb-4 p-2 bg-gray-100 text-gray-800 -mx-2 -mt-2">
								<FaBox className="mr-3 text-xl" />
								<h4 className="text-xl font-semibold">Hàng hóa</h4>
							</div>
							<div className="grid grid-cols-4 gap-2 items-center">
								{/* Từ khóa liên quan */}
								<div className="text-sm font-medium text-gray-700 text-left flex items-start h-fit pt-2">
									Từ khóa liên quan:
								</div>
								<div className="col-span-3">
									{/* Combined UIDs (sample + receipt) */}
									{(sampleUIDs.length > 0 || receiptUID.length > 0) && (
										<div className="mb-2">
											<div className="flex flex-wrap gap-2">
												{/* Sample UIDs */}
												{sampleUIDs.map((uid, index) => (
													<div
														key={`sample-${index}`}
														className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${
															removedUIDs.has(uid)
																? 'bg-gray-100 text-gray-400 border-gray-300'
																: 'bg-blue-100 text-blue-800 border-blue-300'
														}`}
													>
														<span>{uid}</span>
														<button
															type="button"
															onClick={() => (removedUIDs.has(uid) ? handleRestoreUID(uid) : handleRemoveUID(uid))}
															className={`ml-1 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center hover:bg-opacity-80 ${
																removedUIDs.has(uid)
																	? 'text-gray-500 hover:text-gray-700'
																	: 'text-red-600 hover:text-red-800'
															}`}
															title={removedUIDs.has(uid) ? 'Khôi phục' : 'Xóa'}
														>
															{removedUIDs.has(uid) ? '↶' : '×'}
														</button>
													</div>
												))}

												{/* Receipt UID */}
												{receiptUID.map((uid, index) => (
													<div
														key={`receipt-${index}`}
														className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${
															removedUIDs.has(uid)
																? 'bg-gray-100 text-gray-400 border-gray-300'
																: 'bg-green-100 text-green-800 border-green-300'
														}`}
													>
														<span>{uid}</span>
														<button
															type="button"
															onClick={() => (removedUIDs.has(uid) ? handleRestoreUID(uid) : handleRemoveUID(uid))}
															className={`ml-1 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center hover:bg-opacity-80 ${
																removedUIDs.has(uid)
																	? 'text-gray-500 hover:text-gray-700'
																	: 'text-red-600 hover:text-red-800'
															}`}
															title={removedUIDs.has(uid) ? 'Khôi phục' : 'Xóa'}
														>
															{removedUIDs.has(uid) ? '↶' : '×'}
														</button>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Hiển thị thông báo nếu không có UID nào */}
									{sampleUIDs.length === 0 && receiptUID.length === 0 && (
										<div className="text-gray-500 text-xs italic">Không có từ khóa liên quan</div>
									)}
								</div>

								{/* Product name field spanning all 4 columns */}
								<label
									htmlFor="productName"
									className="text-sm font-medium text-gray-700 text-left flex items-center h-fit"
								>
									Tên hàng hóa:
								</label>
								<textarea
									id="productName"
									name="productName"
									value={formData.productName}
									onChange={handleInputChange}
									rows="3"
									className="col-span-3 p-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
								/>

								{/* Số lượng và Trọng lượng trên cùng 1 hàng */}
								<label
									htmlFor="productQuantity"
									className="text-sm font-medium text-gray-700 text-left flex items-center h-fit"
								>
									Số lượng:
								</label>
								<input
									type="number"
									id="productQuantity"
									name="productQuantity"
									value={formData.productQuantity}
									onChange={handleInputChange}
									className="col-span-1 p-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>

								<label
									htmlFor="productWeight"
									className="text-sm font-medium text-gray-700 text-left flex items-center h-fit"
								>
									Trọng lượng (gram):
								</label>
								<input
									type="number"
									id="productWeight"
									name="productWeight"
									value={formData.productWeight}
									onChange={handleInputChange}
									className="col-span-1 p-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>

								{/* Hidden product type - not visible but still used for API */}
								<input type="hidden" id="productType" name="productType" value={formData.productType || 'HH'} />
							</div>
						</div>{' '}
						{/* Thông tin người nhận */}
						<div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
							<div className="flex items-center mb-4 p-2 bg-gray-100 text-gray-800 -mx-2 -mt-2">
								<FaUser className="mr-3 text-xl" />
								<h4 className="text-xl font-semibold">Người nhận</h4>
							</div>
							<div className="grid grid-cols-4 gap-2 items-center">
								{/* Họ tên người nhận */}
								<label
									htmlFor="clientContactName"
									className="text-sm font-medium text-gray-700 text-left flex items-center h-fit"
								>
									Họ tên người nhận:
								</label>
								<input
									type="text"
									id="clientContactName"
									name="clientContactName"
									value={formData.clientContactName}
									onChange={handleInputChange}
									className="col-span-3 p-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
								/>
								{/* Số điện thoại */}
								<label
									htmlFor="clientContactPhone"
									className="text-sm font-medium text-gray-700 text-left flex items-center h-fit"
								>
									Số điện thoại:
								</label>
								<input
									type="text"
									id="clientContactPhone"
									name="clientContactPhone"
									value={formData.clientContactPhone}
									onChange={handleInputChange}
									className="col-span-3 p-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
								/>
								{/* Email */}
								<label
									htmlFor="clientContactEmail"
									className="text-sm font-medium text-gray-700 text-left flex items-center h-fit"
								>
									Email:
								</label>
								<input
									type="email"
									id="clientContactEmail"
									name="clientContactEmail"
									value={formData.clientContactEmail}
									onChange={handleInputChange}
									className="col-span-3 p-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
								/>
								{/* Địa chỉ nhận */}
								<label
									htmlFor="clientAddress"
									className="text-sm font-medium text-gray-700 text-left flex items-center h-fit"
								>
									Địa chỉ nhận:
								</label>
								<input
									type="text"
									id="clientAddress"
									name="clientAddress"
									value={formData.clientAddress}
									onChange={handleInputChange}
									className="col-span-3 p-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
								/>
								{/* Nút kiểm tra địa chỉ và thông báo trên cùng 1 hàng */}
								<button
									type="button"
									onClick={checkAddress}
									disabled={isCheckingAddress}
									className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm h-fit outline-none"
								>
									{isCheckingAddress ? 'Đang kiểm tra...' : 'Kiểm tra địa chỉ'}
								</button>{' '}
								<div className="col-span-3">
									{addressMessage && (
										<div className={`p-1.5 text-sm text-left ${addressError ? 'text-red-700' : 'text-green-700'}`}>
											{addressMessage}
										</div>
									)}
								</div>{' '}
								{/* 4 ô address fields - 2 hàng x 2 cột */}
								<input
									type="text"
									value={addressData.address}
									onChange={(e) => setAddressData((prev) => ({ ...prev, address: e.target.value }))}
									placeholder="Địa chỉ chuẩn hóa (bắt buộc)"
									className="col-span-2 p-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
									required
								/>
								<select
									value={selectedProvince}
									onChange={handleProvinceChange}
									className="col-span-2 p-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
								>
									<option value="">Chọn tỉnh/thành phố</option>
									{provinces.map((province) => (
										<option key={province.PROVINCE_ID} value={province.PROVINCE_ID}>
											{province.PROVINCE_NAME}
										</option>
									))}
								</select>
								<select
									value={selectedDistrict}
									onChange={handleDistrictChange}
									disabled={!selectedProvince}
									className="col-span-2 p-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left disabled:bg-gray-100 disabled:cursor-not-allowed"
								>
									<option value="">Chọn quận/huyện</option>
									{districts.map((district) => (
										<option key={district.DISTRICT_ID} value={district.DISTRICT_ID}>
											{district.DISTRICT_NAME}
										</option>
									))}
								</select>
								<select
									value={selectedWard}
									onChange={handleWardChange}
									disabled={!selectedDistrict}
									className="col-span-2 p-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left disabled:bg-gray-100 disabled:cursor-not-allowed"
								>
									<option value="">Chọn phường/xã</option>
									{wards.map((ward) => (
										<option key={ward.WARDS_ID} value={ward.WARDS_ID}>
											{ward.WARDS_NAME}
										</option>
									))}
								</select>
								{/* Combined full address row (spans all 4 columns) */}
								<div className="col-span-4 p-1.5 text-gray-700 text-left">
									{addressData.address ? (
										<i className="text-gray-600">{getFormattedFullAddress() || 'Chưa có địa chỉ chuẩn hóa'}</i>
									) : (
										<i className="text-amber-500">Chú ý: địa chỉ phải được ngăn cách bởi dấu phẩy ( , ).</i>
									)}
								</div>
							</div>
						</div>
					</div>
					{/* Thông tin người gửi - full width */}
					<div className="mt-4 p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
						{' '}
						<div className="flex items-center mb-4 p-2 bg-gray-100 text-gray-800 -mx-2 -mt-2">
							<FaTruck className="mr-3 text-xl" />
							<h4 className="text-xl font-semibold">Thông tin gửi</h4>
						</div>
						<div className="space-y-4">
							{/* Hiển thị thông tin người gửi dạng text */}
							<div className="form-group">
								<div className="text-sm text-gray-700 mb-2 text-left font-semibold">
									Đơn vị gửi: <span className="font-normal">VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN</span>
								</div>
								<div className="text-sm text-gray-700 mb-2 text-left font-semibold">
									Địa chỉ:{' '}
									<span className="font-normal">
										{`${senderAddressData.address}, 
								${wardsNames[senderAddressData.wards_id] || ''}, 
								${districtNames[senderAddressData.district_id] || ''}, 
								${provinceNames[senderAddressData.province_id] || ''}`}
									</span>
								</div>{' '}
								<div className="text-sm text-gray-700 mb-2 text-left font-semibold">
									Số điện thoại: <span className="font-normal">{formData.senderPhone}</span> - Email:{' '}
									<span className="font-normal">{formData.senderEmail}</span>
								</div>
								<div className="text-sm text-gray-700 mb-2 text-left font-semibold">
									Hình thức vận chuyển:{' '}
									<select
										value={serviceType}
										onChange={(e) => setServiceType(e.target.value)}
										className="ml-2 p-1 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									>
										<option value="VTK">VTK - Vận chuyển tiết kiệm</option>
										<option value="VCN">VCN - Vận chuyển nhanh</option>
									</select>
								</div>
							</div>

							{/* Giữ lại các input ẩn để lưu giá trị mặc định */}
							<input type="hidden" id="senderName" name="senderName" value={formData.senderName} />
							<input type="hidden" id="senderAddress" name="senderAddress" value={formData.senderAddress} />
							<input type="hidden" id="senderPhone" name="senderPhone" value={formData.senderPhone} />
							<input type="hidden" id="senderEmail" name="senderEmail" value={formData.senderEmail} />

							{/* Phần ghi chú chuyển vào đây */}
							<div className="form-group mt-4">
								<label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2 text-left">
									Ghi chú:
								</label>
								<textarea
									id="notes"
									name="notes"
									value={formData.notes}
									onChange={handleInputChange}
									rows="2"
									className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="Nhập ghi chú thêm..."
								/>
							</div>
						</div>
					</div>
				</>
			)}
			{/* Direct pickup status message */}
			{isDirectPickup && (
				<div className="mt-6 text-center">
					<div className="text-green-600 font-semibold text-lg">✓ Khách hàng đã nhận trực tiếp</div>
				</div>
			)}
			{/* Add existing tracking number section */}
			{!isDirectPickup && !hasExistingOrder && showAddTracking && (
				<div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h5 className="font-medium text-gray-700">Thêm mã vận đơn hiện có</h5>
							<button
								type="button"
								onClick={() => {
									setShowAddTracking(false);
									setNewTrackingNumber('');
								}}
								className="text-gray-500 hover:text-gray-700"
							>
								✕
							</button>
						</div>
						<div className="flex gap-3">
							<input
								type="text"
								value={newTrackingNumber}
								onChange={(e) => setNewTrackingNumber(e.target.value)}
								placeholder="Nhập mã vận đơn hiện có..."
								className="flex-1 p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
								onKeyPress={(e) => {
									if (e.key === 'Enter') {
										handleAddExistingTracking();
									}
								}}
							/>
							<button
								type="button"
								onClick={handleAddExistingTracking}
								disabled={isSubmitting || !newTrackingNumber.trim()}
								className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isSubmitting ? 'Đang thêm...' : 'Xác nhận'}
							</button>
						</div>
					</div>
				</div>
			)}
			{/* Action buttons */}
			<div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
				<div className="flex space-x-3">
					{isDirectPickup ? (
						<button
							type="button"
							onClick={handleRemoveDirectPickup}
							disabled={isSubmitting}
							className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isSubmitting ? 'Đang xử lý...' : 'Bỏ trạng thái'}
						</button>
					) : hasExistingOrder ? (
						<button
							type="button"
							onClick={handleCancelOrder}
							disabled={isSubmitting}
							className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isSubmitting ? 'Đang hủy...' : 'Hủy đơn hàng'}
						</button>
					) : (
						<>
							<button
								type="button"
								onClick={handleDirectPickup}
								disabled={isSubmitting}
								className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isSubmitting ? 'Đang xử lý...' : 'Khách nhận trực tiếp'}
							</button>
							<button
								type="button"
								onClick={() => setShowAddTracking(true)}
								disabled={isSubmitting || showAddTracking}
								className="px-6 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								Gửi cùng vận đơn khác
							</button>
						</>
					)}
				</div>
				<div className="flex space-x-3">
					<button
						type="button"
						onClick={onClose}
						className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						Đóng
					</button>
					{!hasExistingOrder && !isDirectPickup && (
						<button
							type="button"
							onClick={handleSubmitOrder}
							disabled={isSubmitting}
							className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isSubmitting ? 'Đang gửi...' : 'Tạo vận đơn'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default ShipmentForm;
