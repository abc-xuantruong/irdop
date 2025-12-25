import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GlobalContext } from "../../contexts/GlobalContext";
import { apiPost } from "../../contexts/helperFunctionCallAPI";
import Swal from "sweetalert2";
import { FaSearch, FaTimes, FaFilter, FaCalendarAlt } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import OrderDetail from "./OrderDetail";
import FileColumn from "../file/FileColumn";
import PaymentButton from "./PaymentButton";

const IncomingOrder = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { formatDate, currentUser } = useContext(GlobalContext);

    // Get today's date at start of day
    const getTodayDate = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    };

    // States
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filter states - Set default date to today
    const [filters, setFilters] = useState({
        salePerson: "",
        clientName: "",
        receiptId: "",
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());

    // Handle payment update from modal
    const handlePaymentUpdate = () => {
        const filterParams = {};
        if (selectedDate) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
            const day = String(selectedDate.getDate()).padStart(2, "0");
            filterParams.createdAt = `${year}-${month}-${day}`;
        }
        fetchOrders(currentPage, searchTerm, filterParams);
    };

    // Fetch orders from API
    const fetchOrders = useCallback(
        async (page = 1, search = "", filterParams = {}) => {
            setLoading(true);
            try {
                const requestBody = {
                    columns: ["*"],
                    itemsPerPage: itemsPerPage,
                    page: page,
                    columnSort: "createdAt",
                    sortBy: "DESC",
                    ...(search && { searchTerm: search }),
                    ...filterParams,
                };

                const response = await apiPost("https://red.irdop.org/v1/order/get/list", requestBody);

                if (response.status === 200) {
                    const data = response.data?.result || [];
                    const pagination = response.data?.pagination || {};

                    setOrders(data);
                    setTotalItems(pagination.totalItems || 0);
                    setTotalPages(pagination.totalPages || 0);
                    setCurrentPage(pagination.currentPage || page);
                } else {
                    showToast("Lỗi khi tải dữ liệu", "error");
                }
            } catch (error) {
                console.error("Error fetching orders:", error);
                showToast("Có lỗi xảy ra khi tải dữ liệu", "error");
            } finally {
                setLoading(false);
            }
        },
        [itemsPerPage],
    );

    // Initial load with today's date filter
    useEffect(() => {
        const today = getTodayDate();
        const filterParams = {
            createdAt: formatDateForAPI(today),
        };
        fetchOrders(1, "", filterParams);
    }, []);

    // Handle search
    const handleSearch = (e) => {
        e.preventDefault();
        fetchOrders(1, searchTerm, {});
    };

    // Handle clear search
    const handleClearSearch = () => {
        const today = getTodayDate();
        setSearchTerm("");
        setFilters({
            salePerson: "",
            clientName: "",
            receiptId: "",
        });
        setSelectedDate(today);

        // Fetch with today's date filter
        const filterParams = {
            createdAt: formatDateForAPI(today),
        };
        fetchOrders(1, "", filterParams);
    };

    // Handle filter apply
    const handleApplyFilters = () => {
        const filterParams = {};

        if (selectedDate) filterParams.createdAt = formatDateForAPI(selectedDate);

        fetchOrders(1, searchTerm, filterParams);
        setShowFilters(false);
    };

    // Format date for API (YYYY-MM-DD)
    const formatDateForAPI = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Handle pagination
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            const filterParams = {};
            if (selectedDate) filterParams.createdAt = formatDateForAPI(selectedDate);

            fetchOrders(newPage, searchTerm, filterParams);
        }
    };

    // Show toast notification
    const showToast = (message, type = "success") => {
        const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
        });

        Toast.fire({
            icon: type,
            title: message,
        });
    };

    // Calculate total analyses for a sample
    const getTotalAnalyses = (samples) => {
        if (!samples || !Array.isArray(samples)) return 0;
        return samples.reduce((total, sample) => {
            return total + (sample.analyses?.length || 0);
        }, 0);
    };

    // Calculate total paid from transactions
    const getTotalPaid = (transactions) => {
        if (!transactions || !Array.isArray(transactions)) return 0;
        return transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    };

    // Get payment status
    const getPaymentStatus = (order) => {
        const totalAmount = order.totalAmount || 0;
        const totalPaid = getTotalPaid(order.transactions);

        if (totalPaid === 0) {
            return { text: "Chưa thanh toán", color: "text-red-600 bg-red-50" };
        } else if (totalPaid !== totalAmount && totalPaid > 0) {
            return { text: "Thanh toán chưa khớp", color: "text-orange-600 bg-orange-50" };
        } else if (totalPaid === totalAmount) {
            return { text: "Đã thanh toán", color: "text-green-600 bg-green-50" };
        }
        return { text: "--", color: "text-gray-600 bg-gray-50" };
    };

    // Modal state for order details
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Handle row click to view order details
    const handleRowClick = (order) => {
        setSelectedOrder(order);
        setShowDetailModal(true);
    };

    // Close modal
    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedOrder(null);
    };

    return (
        <div className="w-full mx-auto p-4">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl text-left font-bold text-sky-800">Đơn hàng đến</h1>

                    {/* Date Filter Indicator */}
                    {selectedDate && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                <FaCalendarAlt className="text-blue-600" />
                                Lọc theo ngày: {formatDate(selectedDate)}
                            </span>
                        </div>
                    )}
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200mb-6">
                    <form onSubmit={handleSearch} className="w-full">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo mã đơn hàng, khách hàng..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
                            />
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            {searchTerm && (
                                <button type="button" onClick={handleClearSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Payment Button */}
            <PaymentButton onPaymentUpdate={handlePaymentUpdate} />

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-lg">Không tìm thấy đơn hàng nào</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn hàng</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số mẫu</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng chỉ tiêu</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã tiếp nhận</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thanh toán</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.map((order, index) => (
                                        <tr key={order.id || index} onClick={() => handleRowClick(order)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                            <td className="px-4 py-3 text-left whitespace-nowrap">
                                                <div className="text-sm font-medium text-blue-600">{order.orderId || order.id || "--"}</div>
                                                <div className="text-xs text-gray-500 mt-1">{order.createdAt ? formatDate(order.createdAt) : "--"}</div>
                                            </td>
                                            <td className="px-4 py-3 text-left whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{order.client?.clientName || "--"}</div>
                                                {order.client?.clientPhone && <div className="text-xs text-gray-500">{order.client.clientPhone}</div>}
                                            </td>

                                            <td className="px-4 py-3 text-left whitespace-nowrap">
                                                <div className="text-sm text-gray-900 text-center">{order.samples?.length || 0}</div>
                                            </td>
                                            <td className="px-4 py-3 text-left whitespace-nowrap">
                                                <div className="text-sm text-gray-900 text-center">{getTotalAnalyses(order.samples)}</div>
                                            </td>

                                            <td className="px-4 py-3 text-left whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{order.receiptId || "--"}</div>
                                            </td>
                                            <td className="px-4 py-3 text-left" onClick={(e) => e.stopPropagation()}>
                                                {(order.orderId || order.id) && (
                                                    <div className="overflow-hidden min-w-[150px]">
                                                        <FileColumn
                                                            id={order.orderId || order.id}
                                                            files={order.files}
                                                            showName={true}
                                                            truncateName={true}
                                                            enableModalPreview={true}
                                                            allowExtract={true}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-left whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {new Intl.NumberFormat("vi-VN", {
                                                        style: "currency",
                                                        currency: "VND",
                                                    }).format(order.totalAmount || order.totalFeeBeforeTax || 0)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-left whitespace-nowrap">
                                                {(() => {
                                                    const status = getPaymentStatus(order);
                                                    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.text}</span>;
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Trước
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sau
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Hiển thị <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> đến{" "}
                                            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> trong tổng số <span className="font-medium">{totalItems}</span> kết
                                            quả
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span className="sr-only">Trước</span>
                                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>

                                            {/* Page numbers */}
                                            {[...Array(totalPages)].map((_, i) => {
                                                const page = i + 1;
                                                // Show first page, last page, current page, and pages around current
                                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => handlePageChange(page)}
                                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                                page === currentPage ? "z-10 bg-blue-50 border-blue-500 text-blue-600" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                                            }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    );
                                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                                    return (
                                                        <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })}

                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span className="sr-only">Sau</span>
                                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <OrderDetail order={selectedOrder} isOpen={showDetailModal} onClose={closeDetailModal} />
        </div>
    );
};

export default IncomingOrder;
