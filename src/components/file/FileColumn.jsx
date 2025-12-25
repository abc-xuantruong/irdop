import React, { useState, useEffect } from "react";
import { FaFile, FaFilePdf, FaFileImage, FaSpinner, FaEye, FaSearch } from "react-icons/fa";
import Swal from "sweetalert2";
import { apiPost } from "../../contexts/helperFunctionCallAPI";
import { toast } from "react-toastify";

const fileCache = {};
const pendingRequests = {};

const FileColumn = ({
    id,
    files: initialFiles,
    mode = "files",
    showName = false,
    truncateName = false,
    onKeywordsClick,
    bodyKey = "foreignKeyUIDs",
    showViewButton = false,
    enableModalPreview = false,
    allowExtract = false,
    showIcon = true,
}) => {
    const [previewModal, setPreviewModal] = useState({
        isOpen: false,
        fileUrl: null,
        fileType: null,
        fileName: null,
        fileRecord: null,
    });

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialFiles && initialFiles.length > 0) {
            setFiles(initialFiles);
            return;
        }

        if (!id) return;

        const stringId = String(id);

        // Check cache first
        if (fileCache[stringId]) {
            setFiles(fileCache[stringId]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Check if there's already a pending request for this ID
                if (!pendingRequests[stringId]) {
                    pendingRequests[stringId] = apiPost("https://red.irdop.org/v1/file/get_by_key", {
                        [bodyKey]: Array.isArray(id) ? id : [id],
                    })
                        .then((res) => {
                            if (res.status === 200 && Array.isArray(res.data)) {
                                return res.data;
                            }
                            return [];
                        })
                        .catch((err) => {
                            console.error("Error fetching files:", err);
                            return [];
                        });
                }

                const data = await pendingRequests[stringId];
                fileCache[stringId] = data;
                setFiles(data);
            } catch (error) {
                console.error("Error in file fetch effect:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, initialFiles, bodyKey]);

    const handleViewFile = async (file) => {
        try {
            const response = await apiPost("https://red.irdop.org/v1/file/get/download_link", {
                expiry: 60 * 10,
                mode: "view",
                fileRecord: file,
            });

            if (response.status === 200 && response.data) {
                if (enableModalPreview) {
                    const isPdf = file.originInfo?.mimeType?.includes("pdf") || file.originInfo?.fileName?.toLowerCase().endsWith(".pdf");
                    const isImage = file.originInfo?.mimeType?.includes("image") || ["jpg", "jpeg", "png", "gif"].some((ext) => file.originInfo?.fileName?.toLowerCase().endsWith(ext));

                    setPreviewModal({
                        isOpen: true,
                        fileUrl: response.data,
                        fileType: isPdf ? "pdf" : isImage ? "image" : "other",
                        fileName: file.originInfo?.fileName,
                        fileRecord: file,
                    });
                } else {
                    window.open(response.data, "_blank");
                    toast.success("Đã mở file trong tab mới", { autoClose: 1000 });
                }
            } else {
                toast.error("Không thể mở file");
            }
        } catch (error) {
            console.error("Error viewing file:", error);
            toast.error("Lỗi khi mở file");
        }
    };

    const handleExtractData = async (file) => {
        if (!file) return;

        const result = await Swal.fire({
            title: "Xác nhận trích xuất",
            text: `Bạn có chắc chắn muốn trích xuất dữ liệu từ file "${file.originInfo?.fileName}"?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Trích xuất",
            cancelButtonText: "Hủy",
        });

        if (result.isConfirmed) {
            try {
                toast.info("Đang xử lý trích xuất...");
                const response = await apiPost("https://red.irdop.org/v1/file/extract/data", {
                    fileIds: [file.id],
                });

                if (response.status === 200 || response.status === 201) {
                    toast.success("Trích xuất dữ liệu thành công");
                } else {
                    toast.error("Trích xuất dữ liệu thất bại");
                }
            } catch (error) {
                console.error("Extract error:", error);
                toast.error("Lỗi khi trích xuất dữ liệu");
            }
        }
    };

    if (loading) return <FaSpinner className="animate-spin text-gray-400" />;

    if (files.length === 0) return <span className="text-gray-300 text-xs">-</span>;

    const modalContent = previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setPreviewModal({ ...previewModal, isOpen: false })}>
            <div
                className={`bg-white rounded-lg shadow-xl flex flex-col overflow-hidden relative max-h-[90vh] ${previewModal.fileType === "pdf" ? "w-[80%]" : "w-auto max-w-4xl"}`}
                onClick={(e) => e.stopPropagation()}
                style={{ height: previewModal.fileType === "pdf" ? "90vh" : "auto" }}
            >
                <div className="flex justify-between items-center p-3 border-b bg-gray-50 shrink-0">
                    <h3 className="font-medium text-gray-700 truncate max-w-[60%]">{previewModal.fileName}</h3>
                    <div className="flex items-center gap-2">
                        {allowExtract && (
                            <button
                                onClick={() => handleExtractData(previewModal.fileRecord)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1 transition-colors"
                            >
                                <FaSearch size={12} />
                                Soi file (Trích xuất)
                            </button>
                        )}
                        <button onClick={() => setPreviewModal({ ...previewModal, isOpen: false })} className="text-gray-500 hover:text-red-500 transition-colors p-1">
                            ✕
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-gray-100 p-1 overflow-auto flex items-center justify-center relative">
                    {previewModal.fileType === "pdf" ? (
                        <iframe src={previewModal.fileUrl} className="w-full h-full border-none rounded" title="PDF Preview" />
                    ) : previewModal.fileType === "image" ? (
                        <img src={previewModal.fileUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                    ) : (
                        <div className="text-center p-8 text-gray-500">
                            <p className="mb-4">Không thể xem trước file này.</p>
                            <a href={previewModal.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                Mở trong tab mới
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (mode === "keywords") {
        // Gather all foreignKeyUIDs from all files, deduplicate
        const allKeys = new Set();
        files.forEach((f) => {
            if (f.foreignKeyUIDs && Array.isArray(f.foreignKeyUIDs)) {
                f.foreignKeyUIDs.forEach((k) => allKeys.add(k));
            }
        });

        const keysArray = Array.from(allKeys);

        if (keysArray.length === 0) return <span className="text-gray-300 text-xs">-</span>;

        return (
            <div className="flex flex-wrap gap-1">
                {keysArray.map((key, i) => (
                    <span key={i} className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded border border-gray-200">
                        {key}
                    </span>
                ))}
            </div>
        );
    }

    // Default: mode === 'files'
    return (
        <>
            <div className="flex flex-col gap-1">
                {files.map((file) => {
                    const isPdf = file.originInfo?.mimeType?.includes("pdf");
                    const isImage = file.originInfo?.mimeType?.includes("image");

                    return (
                        <div key={file.id} className={`flex items-center gap-1.5 ${truncateName ? "max-w-[350px]" : "w-full"}`}>
                            {showIcon && (
                                <button onClick={() => handleViewFile(file)} className="text-gray-600 hover:text-blue-600 transition-colors flex-shrink-0" title="Xem file">
                                    {isPdf ? <FaFilePdf size={16} /> : isImage ? <FaFileImage size={16} /> : <FaFile size={16} />}
                                </button>
                            )}
                            {showName && (
                                <button
                                    onClick={() => {
                                        // Handle keyword click logic
                                        if (onKeywordsClick && file.foreignKeyUIDs) {
                                            onKeywordsClick(file.foreignKeyUIDs);
                                        } else {
                                            // Default: view file
                                            handleViewFile(file);
                                        }
                                    }}
                                    className={`text-xs text-left ${onKeywordsClick && file.foreignKeyUIDs ? "text-blue-700 hover:underline hover:text-blue-900 cursor-pointer" : "text-gray-700"} ${
                                        truncateName ? "truncate" : ""
                                    }`}
                                    title={onKeywordsClick ? "Click để lọc các mẫu liên quan" : file.originInfo?.fileName}
                                >
                                    {file.originInfo?.fileName || "File"}
                                </button>
                            )}
                            {showViewButton && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewFile(file);
                                    }}
                                    className="ml-auto text-blue-500 hover:text-blue-700 transition-colors p-1"
                                    title="Soi file"
                                >
                                    <FaSearch size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Render modal */}
            {modalContent}
        </>
    );
};

export default FileColumn;
