import React, { useState } from "react";
import { FaEye, FaTimes } from "react-icons/fa";
import { apiPost } from "../../contexts/helperFunctionCallAPI";
import FileColumn from "./FileColumn";
import { toast } from "react-toastify";

const AnalysisExtractModal = ({ isOpen, onClose, analyses, sampleName, sampleId, files }) => {
    const [hoveredFileId, setHoveredFileId] = useState(null);

    if (!isOpen) return null;

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
            <div className="bg-white p-6 rounded-lg w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">
                        Chi tiết chỉ tiêu - Mẫu: <span className="text-blue-600">{sampleName}</span> ({sampleId})
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-600 transition-colors">
                        <FaTimes size={24} />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-sm font-semibold text-blue-800 mb-2">File Sau Tiếp Nhận:</div>
                    <FileColumn files={files} showName={true} />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white text-sm text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0">
                            <tr>

                                <th className="py-3 px-4 border">Mã chỉ tiêu</th>
                                <th className="py-3 px-4 border">Tên chỉ tiêu</th>
                                <th className="py-3 px-4 border">Phương pháp (Protocol)</th>
                                <th className="py-3 px-4 border text-right">Kết quả</th>
                                <th className="py-3 px-4 border w-24">Đơn vị</th>
                                <th className="py-3 px-4 border text-center w-24">File TN</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600">
                            {analyses.map((item, index) => (
                                <tr key={item.id || index} className="hover:bg-gray-50 border-b last:border-b-0">

                                    <td className="py-2 px-4 border font-medium text-gray-800">{item.parameterId}</td>
                                    <td className="py-2 px-4 border">{item.parameterName}</td>
                                    <td className="py-2 px-4 border">{item.protocolCode}</td>
                                    <td className="py-2 px-4 border text-right font-medium">
                                        {/* Render HTML content safely since resultValue can contain HTML */}
                                        <div dangerouslySetInnerHTML={{ __html: item.resultValue || "<em>Chưa có</em>" }} />
                                    </td>
                                    <td className="py-2 px-4 border">{item.resultUnit}</td>
                                    <td className="py-2 px-4 border text-center">
                                        {item.labTestFileId && (
                                            <button
                                                className={`p-2 rounded-full transition-all duration-200 ${hoveredFileId === item.labTestFileId
                                                    ? "bg-yellow-400 text-white shadow-lg scale-110 ring-2 ring-yellow-200"
                                                    : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                                                    }`}
                                                title={`File ID: ${item.labTestFileId}`}
                                                onClick={() => handleViewFile(item.labTestFileId)}
                                                onMouseEnter={() => setHoveredFileId(item.labTestFileId)}
                                                onMouseLeave={() => setHoveredFileId(null)}
                                            >
                                                <FaEye />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {analyses.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-400">
                                        Không có dữ liệu chỉ tiêu
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalysisExtractModal;
