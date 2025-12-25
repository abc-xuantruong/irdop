import React, { useState } from "react";
import { FaEye, FaTimes } from "react-icons/fa";
import { apiPost } from "../../contexts/helperFunctionCallAPI";
import FileColumn from "./FileColumn";
import { toast } from "react-toastify";

const ReceiptDetailModal = ({ isOpen, onClose, receipt }) => {
    const [hoveredFileId, setHoveredFileId] = useState(null);

    if (!isOpen || !receipt) return null;

    // Helper to open file
    const handleViewFile = async (fileId) => {
        try {
            const response = await apiPost("https://red.irdop.org/v1/file/get/download_link", {
                expiry: 60 * 10,
                mode: "view",
                fileRecord: { id: fileId },
            });

            if (response.status === 200 && response.data) {
                window.open(response.data, "_blank");
            } else {
                toast.error("Không thể mở file");
            }
        } catch (error) {
            console.error("Error viewing file:", error);
            toast.error("Lỗi khi mở file");
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg w-11/12 max-w-[95vw] h-[90vh] flex flex-col shadow-xl">
                <div className="flex justify-between items-center mb-4 border-b pb-2 shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">
                        Chi tiết phiếu: <span className="text-blue-600">{receipt.receiptId}</span>
                        {receipt.orderId && <span className="text-gray-500 text-sm ml-2">({receipt.orderId})</span>}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-600 transition-colors">
                        <FaTimes size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 rounded border">
                    <table className="min-w-full bg-white text-sm text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="py-3 px-4 border w-36 whitespace-nowrap bg-gray-100">Mã mẫu</th>
                                <th className="py-3 px-4 border w-64 whitespace-nowrap bg-gray-100">File mẫu</th>
                                <th className="py-3 px-4 border w-32 whitespace-nowrap bg-gray-100">Mã chỉ tiêu</th>
                                <th className="py-3 px-4 border min-w-[200px] bg-gray-100">Chỉ tiêu</th>
                                <th className="py-3 px-4 border text-left bg-gray-100">Kết quả</th>
                                <th className="py-3 px-4 border w-24 bg-gray-100">Đơn vị</th>
                                <th className="py-3 px-4 border text-center w-24 bg-gray-100">File TN</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600">
                            {(receipt.samples || []).length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-400">
                                        Không có mẫu nào trong phiếu này
                                    </td>
                                </tr>
                            ) : (
                                (receipt.samples || []).map((sample, sIndex) => {
                                    const analyses = sample.analyses || sample.analysis || [];
                                    const rowSpan = Math.max(analyses.length, 1);

                                    // Render rows for this sample
                                    if (analyses.length === 0) {
                                        return (
                                            <tr key={`${sample.id}-empty`} className="hover:bg-gray-50 border-b">
                                                <td className="py-3 px-4 border align-top font-medium text-gray-800 bg-white">
                                                    {sample.id || sample.sampleId}
                                                    <div className="text-xs text-gray-500 font-normal mt-1 truncate max-w-[200px]" title={sample.sampleName}>
                                                        {sample.sampleName}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 border align-top bg-white">
                                                    <div className="">
                                                        <FileColumn files={sample.files} showName={true} />
                                                    </div>
                                                </td>
                                                <td colSpan="5" className="py-3 px-4 border text-center text-gray-400 italic">
                                                    Chưa có chỉ tiêu
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return analyses.map((item, aIndex) => (
                                        <tr key={`${sample.id}-${item.id || aIndex}`} className="hover:bg-gray-50 border-b last:border-b-0">
                                            {aIndex === 0 && (
                                                <>
                                                    <td className="py-3 px-4 border align-top font-medium text-gray-800 bg-white" rowSpan={rowSpan}>
                                                        {sample.id || sample.sampleId}
                                                        <div className="text-xs text-gray-500 font-normal mt-1 truncate max-w-[200px]" title={sample.sampleName}>
                                                            {sample.sampleName}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 border align-top bg-white" rowSpan={rowSpan}>
                                                        <div className="">
                                                            <FileColumn files={sample.files} showName={true} />
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                            <td className="py-2 px-4 border font-medium text-gray-800">{item.parameterId}</td>
                                            <td className="py-2 px-4 border">{item.parameterName}</td>
                                            <td className="py-2 px-4 border text-left font-medium">
                                                <div dangerouslySetInnerHTML={{ __html: item.resultValue || "<em>Chưa có</em>" }} />
                                            </td>
                                            <td className="py-2 px-4 border">{item.resultUnit}</td>
                                            <td className="py-2 px-4 border text-center">
                                                {item.labTestFileId && (
                                                    <button
                                                        className={`p-2 rounded-full transition-all duration-200 ${hoveredFileId === item.labTestFileId
                                                            ? "bg-purple-600 text-white shadow-lg scale-110 ring-2 ring-purple-200"
                                                            : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                                                            }`}
                                                        title={`File ID: ${item.labTestFileId}`}
                                                        onClick={() => handleViewFile(item.labTestFileId)}
                                                        onMouseEnter={() => setHoveredFileId(item.labTestFileId)}
                                                        onMouseLeave={() => setHoveredFileId(null)}
                                                    >
                                                        <FaEye size={12} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ));
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReceiptDetailModal;
