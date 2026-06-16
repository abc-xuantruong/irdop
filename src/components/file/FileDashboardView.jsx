import React, { useState, useRef } from "react";
import FileColumn from "./FileColumn";
import AnalysisExtractModal from "./AnalysisExtractModal";
import ReceiptDetailModal from "./ReceiptDetailModal";
import { FaList, FaClipboardList, FaFileAlt } from "react-icons/fa";

const FileDashboardView = ({ receipts, loading, onFilterByFile, onReceiptClick, onSampleClick }) => {
    const statusMap = ["Đang chờ", "Khẩn", "Đang thực hiện", "Đủ kết quả", "Khiếu nại", "Hoàn thành", "Hủy bỏ"];
    const [modalData, setModalData] = useState({
        isOpen: false,
        analyses: [],
        sampleName: "",
        sampleId: "",
    });

    const [receiptModal, setReceiptModal] = useState({
        isOpen: false,
        receipt: null,
    });

    // Drag to scroll logic
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // scroll-fast
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleOpenExtract = (sample) => {
        setModalData({
            isOpen: true,
            analyses: sample.analyses || sample.analysis || [],
            sampleName: sample.sampleName || sample.sample_name || "",
            sampleId: sample.id || sample.sampleId || "",
            files: sample.files || [],
        });
    };

    const handleCloseModal = () => {
        setModalData((prev) => ({ ...prev, isOpen: false }));
    };

    const handleOpenReceipt = (receipt) => {
        setReceiptModal({ isOpen: true, receipt });
    };

    const handleCloseReceipt = () => {
        setReceiptModal({ isOpen: false, receipt: null });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
    }

    if (!receipts || receipts.length === 0) {
        return <div className="p-8 text-center text-gray-500">Không có dữ liệu hiển thị</div>;
    }

    return (
        <div
            ref={scrollRef}
            className={`overflow-x-auto bg-white rounded-md shadow border ${isDragging ? "cursor-grabbing select-none" : ""}`}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
        >
            <table className="w-full text-sm text-left border-collapse text-gray-800">
                <thead className="bg-gray-100 font-semibold text-gray-700 sticky top-0 z-10">
                    <tr>
                        <th className="p-3 border w-32 whitespace-nowrap">Mã tiếp nhận</th>
                        <th className="p-3 border w-48 whitespace-nowrap">File TN</th>

                        <th className="p-3 border whitespace-nowrap min-w-[300px] resize-x overflow-hidden">Mẫu thử</th>
                        <th className="p-3 border w-64 whitespace-nowrap">File STN</th>
                        <th className="p-3 border w-64 whitespace-nowrap">File Kết quả</th>
                        <th className="p-3 border w-36 text-center whitespace-nowrap">Chỉ tiêu</th>
                    </tr>
                </thead>
                <tbody>
                    {receipts.map((receipt, rIndex) => {
                        const samples = receipt.samples || [];
                        const rowSpan = samples.length || 1;

                        // ID for receipt files: use orderId if available, else receiptId or custom logic
                        const orderId = receipt.orderId;

                        if (samples.length === 0) {
                            // Handle case with no samples (rare but possible)
                            return (
                                <tr key={receipt.id || rIndex} className="border-b hover:bg-gray-50">
                                    <td className="p-3 border align-top">
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-blue-700">{receipt.receiptId}</div>
                                            <button
                                                onClick={() => handleOpenReceipt(receipt)}
                                                className="p-1.5 text-gray-500 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
                                                title="Xem chi tiết phiếu"
                                            >
                                                <FaFileAlt size={14} />
                                            </button>
                                        </div>
                                        {receipt.orderId && <div className="text-gray-500 text-xs mt-1">{receipt.orderId}</div>}
                                    </td>
                                    <td className="p-3 border align-top">
                                        <FileColumn files={receipt.files} showName={true} showIcon={false} />
                                    </td>
                                    <td colSpan="4" className="p-3 border text-center text-gray-400">
                                        Không có mẫu
                                    </td>
                                </tr>
                            );
                        }

                        return samples.map((sample, sIndex) => {
                            // Calculate stats
                            const analyses = sample.analyses || sample.analysis || [];
                            const totalTests = analyses.length;
                            // Completed: has resultValue
                            const reviewedTests = analyses.filter((a) => a.resultValue && a.resultValue !== "" && a.resultValue !== "<p></p>").length;
                            // Uploaded: has labTestFileId
                            const uploadedTests = analyses.filter((a) => a.labTestFileId).length;

                            // Filter files
                            let resultFiles = [];
                            let stnFiles = [];
                            if (sample.files && Array.isArray(sample.files)) {
                                resultFiles = sample.files.filter((f) => f.userTags && f.userTags.includes("Phiếu kết quả thử nghiệm"));
                                stnFiles = sample.files.filter((f) => !f.userTags || !f.userTags.includes("Phiếu kết quả thử nghiệm"));
                            }

                            return (
                                <tr key={`${receipt.id}-${sample.id || sIndex}`} className="border-b hover:bg-gray-50">
                                    {sIndex === 0 && (
                                        <>
                                            <td className="p-3 border align-top bg-white" rowSpan={rowSpan}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="font-bold text-blue-700 hover:underline cursor-pointer"
                                                        title="Mã tiếp nhận"
                                                        onClick={() => onReceiptClick && onReceiptClick(receipt.receiptId)}
                                                    >
                                                        {receipt.receiptId}
                                                    </div>
                                                    <button
                                                        onClick={() => handleOpenReceipt(receipt)}
                                                        className="p-1.5 text-gray-500 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
                                                        title="Xem chi tiết phiếu"
                                                    >
                                                        <FaFileAlt size={14} />
                                                    </button>
                                                </div>
                                                {receipt.orderId && (
                                                    <div className="text-gray-500 text-xs mt-1" title="Mã đơn hàng">
                                                        {receipt.orderId}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 border align-top bg-white" rowSpan={rowSpan}>
                                                <FileColumn files={receipt.files} showName={true} showIcon={false} />
                                            </td>
                                        </>
                                    )}

                                    <td className="p-3 border align-top">
                                        {(sample.sampleId || sample.sample_id) && (
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <div
                                                    className="font-bold text-blue-600 hover:underline cursor-pointer text-xs"
                                                    onClick={() => onSampleClick && onSampleClick(sample.sampleId || sample.sample_id)}
                                                    title="Mã mẫu"
                                                >
                                                    {sample.sampleId || sample.sample_id}
                                                </div>
                                                {sample.status !== undefined && sample.status !== null && (
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">{statusMap[sample.status] || "--"}</span>
                                                )}
                                                {sample.emailsReceived && sample.emailsReceived.length > 0 && (
                                                    <div className="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]" title={sample.emailsReceived.join(", ")}>
                                                        {sample.emailsReceived.join(", ")}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="truncate max-w-[500px]" title={sample.sampleName || sample.sample_name}>
                                            {sample.sampleName || sample.sample_name}
                                        </div>
                                    </td>
                                    <td className="p-3 border align-top">
                                        <div className="max-h-16 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                                            <FileColumn files={stnFiles} showName={true} truncateName={true} />
                                        </div>
                                    </td>
                                    <td className="p-3 border align-top">
                                        <div className="max-h-16 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                                            <FileColumn files={resultFiles} showName={true} truncateName={true} />
                                        </div>
                                    </td>
                                    <td className="p-3 border align-top text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <span
                                                className={`font-semibold ${uploadedTests === totalTests && totalTests > 0 ? "text-green-600" : "text-gray-700"}`}
                                                title={`Hoàn thành: ${reviewedTests} / Upload: ${uploadedTests} / Tổng: ${totalTests} `}
                                            >
                                                {uploadedTests} / {reviewedTests} / {totalTests}
                                            </span>
                                            <button
                                                onClick={() => handleOpenExtract(sample)}
                                                className="p-1.5 text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-all shadow-sm"
                                                title="Chi tiết chỉ tiêu"
                                            >
                                                <FaClipboardList size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        });
                    })}
                </tbody>
            </table>

            <AnalysisExtractModal
                isOpen={modalData.isOpen}
                onClose={handleCloseModal}
                analyses={modalData.analyses}
                sampleName={modalData.sampleName}
                sampleId={modalData.sampleId}
                files={modalData.files}
            />

            <ReceiptDetailModal isOpen={receiptModal.isOpen} onClose={handleCloseReceipt} receipt={receiptModal.receipt} />
        </div>
    );
};

export default FileDashboardView;
