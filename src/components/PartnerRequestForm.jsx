import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const PartnerRequestForm = () => {
	const [searchParams] = useSearchParams();
	const [html, setHtml] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const orderCode = searchParams.get('orderCode');
		const uri = searchParams.get('uri');
		if (!orderCode || !uri) {
			setError('Thiếu thông tin orderCode hoặc uri.');
			setLoading(false);
			return;
		}
		const fetchHtml = async () => {
			setLoading(true);
			setError('');
			try {
				const res = await axios.get(`https://black.irdop.org/db/order/get_req_form`, {
					params: { orderCode, uri },
					withCredentials: false,
					headers: {}, // Không gửi header nào
				});
				if (res.status === 200 && typeof res.data === 'string') {
					setHtml(res.data);
				} else {
					setError('Không nhận được dữ liệu hợp lệ từ server.');
				}
			} catch (err) {
				setError('Không thể tải phiếu gửi mẫu.');
			} finally {
				setLoading(false);
			}
		};
		fetchHtml();
	}, [searchParams]);

	if (loading) return <div>Đang tải phiếu gửi mẫu...</div>;
	if (error) return <div className="text-red-500">{error}</div>;
	return (
		<div style={{ minHeight: 400 }}>
			<div dangerouslySetInnerHTML={{ __html: html }} />
		</div>
	);
};

export default PartnerRequestForm;
