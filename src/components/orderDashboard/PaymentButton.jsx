import React, { useState } from "react";
import { FaCalendarAlt, FaSearch, FaTimes } from "react-icons/fa";
import { apiPost } from "../../contexts/helperFunctionCallAPI";
import Swal from "sweetalert2";
import FileColumn from "../file/FileColumn";

const PaymentButton = ({ onPaymentUpdate }) => {
    // Payment modal states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
    const [paymentSearchResults, setPaymentSearchResults] = useState([]);
    const [selectedPaymentOrder, setSelectedPaymentOrder] = useState(null);
    const [editingTransactions, setEditingTransactions] = useState([]);
    const [isSearchingPayment, setIsSearchingPayment] = useState(false);
    const [isSavingPayment, setIsSavingPayment] = useState(false);

    // Calculate total paid from transactions
    const getTotalPaid = (transactions) => {
        if (!transactions || !Array.isArray(transactions)) return 0;
        return transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    };

    // Payment modal functions
    const handleOpenPaymentModal = () => {
        setShowPaymentModal(true);
        setPaymentSearchTerm("");
        setPaymentSearchResults([]);
        setSelectedPaymentOrder(null);
        setEditingTransactions([]);
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setPaymentSearchTerm("");
        setPaymentSearchResults([]);
        setSelectedPaymentOrder(null);
        setEditingTransactions([]);
    };

    // Helper function to format code
    const formatCode = (inputCode) => {
        if (!inputCode) return inputCode;
        let cleanCode = inputCode.replace(/^DH*/i, "");
        if (cleanCode.length < 9) {
            const zerosNeeded = 9 - cleanCode.length;
            const prefix = "DH" + "0".repeat(zerosNeeded - 2);
            return prefix + cleanCode;
        }
        if (!inputCode.toUpperCase().startsWith("DH")) {
            return "DH" + inputCode;
        }
        return inputCode.toUpperCase();
    };

    const handleSearchPaymentOrder = async (e) => {
        e.preventDefault();
        if (!paymentSearchTerm.trim()) return;

        // Auto format search term
        const formattedTerm = formatCode(paymentSearchTerm.trim());
        setPaymentSearchTerm(formattedTerm);

        setIsSearchingPayment(true);
        try {
            const response = await apiPost("https://red.irdop.org/v1/order/get/info", {
                orderId: formattedTerm,
                loadCrm: false,
            });

            if (response.status === 200 && response.data && !response.data.error) {
                // Found exact match -> Auto Select
                handleSelectPaymentOrder(response.data);
            } else {
                setPaymentSearchResults([]);
                Swal.fire("Thông báo", response.data?.message || "Không tìm thấy đơn hàng", "warning");
            }
        } catch (error) {
            console.error("Error searching order:", error);
            Swal.fire("Lỗi", "Lỗi khi tìm kiếm đơn hàng", "error");
            setPaymentSearchResults([]);
        } finally {
            setIsSearchingPayment(false);
        }
    };

    const handleSelectPaymentOrder = (order) => {
        setSelectedPaymentOrder(order);
        setEditingTransactions(order.transactions ? [...order.transactions] : []);
        setPaymentSearchResults([]);
        setPaymentSearchTerm("");
    };

    const handleAddTransaction = () => {
        setEditingTransactions([...editingTransactions, { date: new Date().toISOString().split("T")[0], amount: 0 }]);
    };

    const handleUpdateTransaction = (index, field, value) => {
        const updated = [...editingTransactions];
        updated[index] = { ...updated[index], [field]: value };
        setEditingTransactions(updated);
    };

    const handleDeleteTransaction = (index) => {
        const updated = editingTransactions.filter((_, i) => i !== index);
        setEditingTransactions(updated);
    };

    const handleSavePayment = async () => {
        if (!selectedPaymentOrder) return;

        setIsSavingPayment(true);
        try {
            const orderData = {
                orderId: selectedPaymentOrder.orderId || selectedPaymentOrder.id,
                transactions: editingTransactions,
            };

            const response = await apiPost("https://red.irdop.org/v1/order/update", { order: orderData });

            if (response.status === 200) {
                Swal.fire("Thành công", "Cập nhật thanh toán thành công", "success");
                handleClosePaymentModal();
                // Notify parent to refresh list
                if (onPaymentUpdate) {
                    onPaymentUpdate();
                }
            } else {
                Swal.fire("Lỗi", "Lỗi khi cập nhật thanh toán", "error");
            }
        } catch (error) {
            console.error("Error saving payment:", error);
            Swal.fire("Lỗi", "Lỗi khi lưu thanh toán", "error");
        } finally {
            setIsSavingPayment(false);
        }
    };

    return (
        <>
            {/* Payment Button */}
            <div className="mb-4 flex justify-end">
                <button
                    onClick={handleOpenPaymentModal}
                    className="bg-white hover:bg-gray-50 text-sky-700 border border-blue-700 shadow-sm font-semibold text-sm py-1.5 px-3 rounded-lg transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Nhập thanh toán
                </button>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleClosePaymentModal}></div>
                    <div className="bg-white rounded-lg w-[95vw] max-w-7xl h-[90vh] z-10 relative flex flex-col shadow-xl">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-2xl font-bold text-gray-800">Quản lý thanh toán</h2>
                            <button onClick={handleClosePaymentModal} className="text-gray-500 hover:text-gray-700">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Search Section */}
                            {!selectedPaymentOrder && (
                                <div className="mb-6">
                                    <form onSubmit={handleSearchPaymentOrder} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={paymentSearchTerm}
                                            onChange={(e) => setPaymentSearchTerm(e.target.value)}
                                            placeholder="Nhập mã đơn hàng hoặc tên khách hàng..."
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isSearchingPayment}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                                        >
                                            {isSearchingPayment ? "Đang tìm..." : "Tìm kiếm"}
                                        </button>
                                    </form>

                                    {/* Search Results */}
                                    {paymentSearchResults.length > 0 && (
                                        <div className="mt-4 border rounded-lg overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mã ĐH</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Khách hàng</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">NV Kinh doanh</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tổng tiền</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Đã thanh toán</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {paymentSearchResults.map((order) => (
                                                        <tr key={order.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 text-sm">{order.orderId || order.id}</td>
                                                            <td className="px-4 py-2 text-sm">{order.client?.clientName || "--"}</td>
                                                            <td className="px-4 py-2 text-sm">{order.salePerson || "--"}</td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                                                                    order.totalAmount || 0
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                                                                    getTotalPaid(order.transactions)
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <button
                                                                    onClick={() => handleSelectPaymentOrder(order)}
                                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                                                >
                                                                    Chọn
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Edit Section */}
                            {selectedPaymentOrder && (
                                <div>
                                    {/* Order Info */}
                                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                        <h3 className="font-semibold text-lg mb-2">Thông tin đơn hàng</h3>
                                        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-6 gap-y-4 text-sm text-left items-center">
                                            <span className="text-gray-600">Mã đơn hàng:</span>
                                            <span className="font-medium">{selectedPaymentOrder.orderId || selectedPaymentOrder.id}</span>

                                            <span className="text-gray-600">NV Kinh doanh:</span>
                                            <span className="font-medium">{selectedPaymentOrder.salePerson || "--"}</span>

                                            <div className="col-span-4 border-t border-gray-100 my-1"></div>

                                            <span className="text-gray-600">Tên khách hàng:</span>
                                            <span className="font-medium truncate col-span-3" title={selectedPaymentOrder.client?.clientName}>{selectedPaymentOrder.client?.clientName || "--"}</span>

                                            <span className="text-gray-600">Mã khách hàng:</span>
                                            <span className="font-medium">{selectedPaymentOrder.client?.clientId || selectedPaymentOrder.clientId || "--"}</span>

                                            <span className="text-gray-600">Mã số thuế:</span>
                                            <span className="font-medium">{selectedPaymentOrder.client?.legalId || "--"}</span>

                                            <span className="text-gray-600">Địa chỉ:</span>
                                            <span className="font-medium truncate col-span-3" title={selectedPaymentOrder.client?.clientAddress}>{selectedPaymentOrder.client?.clientAddress || "--"}</span>

                                            <span className="text-gray-600">Số điện thoại:</span>
                                            <span className="font-medium">{selectedPaymentOrder.client?.clientPhone || "--"}</span>

                                            <span className="text-gray-600">Email (Hóa đơn):</span>
                                            <span className="font-medium truncate" title={selectedPaymentOrder.client?.invoiceEmail}>{selectedPaymentOrder.client?.invoiceEmail || "--"}</span>

                                            {selectedPaymentOrder.client?.invoiceInfo && (
                                                <>
                                                    <span className="text-gray-600">TT Hóa đơn (khác):</span>
                                                    <span className="font-medium truncate col-span-3" title={selectedPaymentOrder.client?.invoiceInfo}>{selectedPaymentOrder.client?.invoiceInfo}</span>
                                                </>
                                            )}

                                            <div className="col-span-4 border-t border-gray-100 my-1"></div>

                                            <span className="text-gray-600">Tiền trước thuế:</span>
                                            <span className="font-medium">
                                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                                                    selectedPaymentOrder.totalFeeBeforeTax || 0
                                                )}
                                            </span>

                                            <span className="text-gray-600">Tổng tiền (sau thuế):</span>
                                            <span className="font-bold text-blue-600 text-base">
                                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                                                    selectedPaymentOrder.totalAmount || 0
                                                )}
                                            </span>
                                        </div>

                                        {/* Files Section in Order Info */}
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <span className="font-medium text-gray-700 block mb-2">File đính kèm:</span>
                                            {selectedPaymentOrder.orderId || selectedPaymentOrder.id ? (
                                                <FileColumn
                                                    id={selectedPaymentOrder.orderId || selectedPaymentOrder.id}
                                                    files={selectedPaymentOrder.files}
                                                    showName={true}
                                                    truncateName={false} // Don't truncate in detail view
                                                    enableModalPreview={true}
                                                    allowExtract={false} // Disable extract as requested
                                                    showViewButton={true}
                                                />
                                            ) : (
                                                <span className="text-gray-500 italic">Không có file đính kèm</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Transactions */}
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-semibold text-lg">Giao dịch thanh toán</h3>
                                            <button
                                                onClick={handleAddTransaction}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                                            >
                                                + Thêm giao dịch
                                            </button>
                                        </div>

                                        {editingTransactions.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">Chưa có giao dịch nào</div>
                                        ) : (
                                            <div className="space-y-3">
                                                {editingTransactions.map((transaction, index) => (
                                                    <div key={index} className="flex gap-3 items-center bg-white border rounded-lg p-3">
                                                        <div className="flex-1">
                                                            <label className="block text-xs text-gray-600 mb-1">Ngày</label>
                                                            <input
                                                                type="date"
                                                                value={transaction.date || ""}
                                                                onChange={(e) => handleUpdateTransaction(index, "date", e.target.value)}
                                                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-xs text-gray-600 mb-1">Số tiền</label>
                                                            <input
                                                                type="number"
                                                                value={transaction.amount || 0}
                                                                onChange={(e) => handleUpdateTransaction(index, "amount", Number(e.target.value))}
                                                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteTransaction(index)}
                                                            className="mt-5 text-red-600 hover:text-red-800 p-2"
                                                            title="Xóa"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Total */}
                                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold">Tổng đã thanh toán:</span>
                                                <span className="text-xl font-bold text-blue-600">
                                                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                                                        editingTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {selectedPaymentOrder && (
                            <div className="flex justify-between items-center p-6 border-t bg-gray-50">
                                <button
                                    onClick={() => {
                                        setSelectedPaymentOrder(null);
                                        setEditingTransactions([]);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                                >
                                    ← Quay lại tìm kiếm
                                </button>
                                <button
                                    onClick={handleSavePayment}
                                    disabled={isSavingPayment}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                                >
                                    {isSavingPayment ? "Đang lưu..." : "Lưu thay đổi"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default PaymentButton;
