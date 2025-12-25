import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { User, Package, Scan, X, Save, ArrowLeft, FilterX, Clock, FileText } from "lucide-react";
import HandoverReportModal from "../components/sample/HandoverReportModal";
import TechnicianHandoverTable from "../components/sample/TechnicianHandoverTable";
import { toast } from "react-toastify";
import axios from "axios";
import { apiPost } from "../contexts/helperFunctionCallAPI";
import Cookies from "js-cookie";
import irDopLogo from "../assets/IRDOP-LOGO_FULL.png";

const HandoverSampleDash = () => {
    // State
    const [receiver, setReceiver] = useState(null);
    const [samples, setSamples] = useState([]); // Master list
    const [lastScannedCode, setLastScannedCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [editorContent, setEditorContent] = useState("");
    const [showTechnicianTasks, setShowTechnicianTasks] = useState(false);

    // Tooltip State
    const [activeTooltip, setActiveTooltip] = useState(null); // { data: object, x: number, y: number }

    // Refs
    const receiverRef = useRef(null);
    useEffect(() => {
        receiverRef.current = receiver;
    }, [receiver]);

    const bufferRef = useRef("");
    const timeoutRef = useRef(null);

    // --- Derived State ---
    const displaySamples = React.useMemo(() => {
        if (!receiver) return samples;

        return samples
            .map((sample) => {
                const matchingCriteria = sample.criteria.filter((c) => c.technicianId === receiver.identityId);
                if (matchingCriteria.length === 0) return null;

                return {
                    ...sample,
                    criteria: matchingCriteria,
                };
            })
            .filter(Boolean);
    }, [samples, receiver]);

    // --- Helpers ---
    const formatDate = (date) => {
        const d = new Date(date);
        const pad = (n) => n.toString().padStart(2, "0");
        return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const handleTooltipEnter = (e, handoverData) => {
        if (!handoverData || Object.keys(handoverData).length === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setActiveTooltip({
            data: handoverData,
            x: rect.left - 10,
            y: rect.top,
        });
    };

    const handleTooltipLeave = () => {
        setActiveTooltip(null);
    };

    // --- Process Code ---
    const processCode = async (code) => {
        const cleanCode = code.trim();
        if (!cleanCode) return;

        // 1. Numeric (Technician)
        if (/^\d+$/.test(cleanCode)) {
            try {
                toast.info("Đang nhận diện nhân viên...", { autoClose: 1000 });
                const res = await axios.post("https://pink.irdop.org/v1/iden/get", { rifcCode: cleanCode });
                const data = res.data;

                const roles = data?.roles?.["LIMS-IRDOP-PRD"];
                if (roles && roles.staff && roles.isTechnician) {
                    const newReceiver = {
                        id: data.identityId,
                        name: data.identityName,
                        department: "LIMS Technician",
                        email: data.email,
                        identityId: data.identityId,
                        ...data,
                    };
                    setReceiver(newReceiver);
                    toast.success(`Đã chọn bộ lọc KTV: ${data.identityName}`);
                } else {
                    toast.error("Nhân viên không có quyền Kỹ thuật viên (Staff + Technician).");
                }
            } catch (error) {
                console.error("Lỗi nhận diện:", error);
                toast.error("Lỗi khi tra cứu mã thẻ nhân viên.");
            }
            return;
        }

        // 2. Sample (SP...)
        else if (cleanCode.startsWith("SP")) {
            setLastScannedCode(cleanCode);
            try {
                // toast.info("Đang lấy dữ liệu mẫu...", { autoClose: 1000 });
                const response = await apiPost("https://red.irdop.org/v1/sample/get/full", { sampleId: cleanCode });

                if (response && response.data) {
                    const rawData = response.data;

                    const newSampleData = {
                        uniqueId: Date.now(),
                        sampleId: rawData.sampleId,
                        sampleDescription: rawData.sampleDescription || "Không có mô tả",
                        sampleVolume: rawData.sampleVolume,
                        additionalRequest: rawData.additionalRequest,
                        quantity: "",
                        unit: "mẫu",
                        criteria: rawData.analyses
                            ? rawData.analyses.map((a) => ({
                                id: a.id,
                                parameterId: a.parameterId,
                                parameterName: a.parameterName,
                                protocolCode: a.protocolCode,
                                technicianId: a.technicianId,
                                technicianName: a.technician?.identityName || "---",
                                note: a.note,
                                handover: a.handover || {},
                            }))
                            : [],
                    };

                    setSamples((prev) => {
                        const existingIndex = prev.findIndex((s) => s.sampleId === newSampleData.sampleId);
                        if (existingIndex !== -1) {
                            const updatedSamples = [...prev];
                            updatedSamples[existingIndex] = {
                                ...newSampleData,
                                quantity: prev[existingIndex].quantity,
                                uniqueId: prev[existingIndex].uniqueId,
                            };
                            toast.success(`Đã cập nhật dữ liệu mẫu: ${newSampleData.sampleId}`);
                            return updatedSamples;
                        } else {
                            return [newSampleData, ...prev];
                        }
                    });

                    if (receiverRef.current) {
                        const hasMatching = newSampleData.criteria.some((c) => c.technicianId === receiverRef.current.identityId);
                        if (!hasMatching) {
                            toast.warning(`Mẫu mới không có chỉ tiêu cho KTV ${receiverRef.current.name}, nhưng đã được lưu vào danh sách tổng.`);
                        } else {
                            toast.success(`Đã thêm mẫu: ${newSampleData.sampleId}`);
                        }
                    } else {
                        toast.success(`Đã thêm mẫu: ${newSampleData.sampleId}`);
                    }
                } else {
                    toast.error(`Không tìm thấy dữ liệu cho mã mẫu: ${cleanCode}`);
                }
            } catch (error) {
                console.error("API Sample Fetch Error:", error);
                toast.error(`Lỗi khi lấy dữ liệu mẫu: ${cleanCode}`);
            }
        } else {
            toast.warning(`Mã không hợp lệ (cần bắt đầu bằng SP hoặc số): ${cleanCode}`);
        }
    };

    // --- Barcode Listener ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.length > 1 && e.key !== "Enter") return;

            if (e.key === "Enter") {
                if (bufferRef.current) {
                    processCode(bufferRef.current);
                    bufferRef.current = "";
                }
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
            } else {
                bufferRef.current += e.key;
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    if (bufferRef.current) {
                        processCode(bufferRef.current);
                        bufferRef.current = "";
                    }
                }, 500);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // --- Handlers ---
    const removeSample = (sampleId) => {
        setSamples((prev) => prev.filter((s) => s.sampleId !== sampleId));
    };

    const clearAll = () => {
        if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu mẫu đã quét?")) {
            setReceiver(null);
            setSamples([]);
            setLastScannedCode("");
            toast.info("Đã xóa dữ liệu");
        }
    };

    const removeReceiver = () => {
        setReceiver(null);
        setShowTechnicianTasks(false);
        toast.info("Đã thoát chế độ lọc theo KTV. Hiển thị tất cả mẫu.");
    };

    const removeHandover = async (timeKey, identityId) => {
        if (!window.confirm(`Bạn có chắc muốn xóa lịch sử bàn giao lúc ${timeKey} cho kĩ thuật viên này?`)) return;

        try {
            const updates = [];
            let updateCount = 0;

            const newSamples = samples.map((sample) => {
                let sampleChanged = false;
                const newCriteria = sample.criteria.map((analysis) => {
                    if (analysis.handover && analysis.handover[timeKey] && analysis.handover[timeKey].identityId === identityId) {
                        const newHandover = { ...analysis.handover };
                        delete newHandover[timeKey];

                        updates.push({
                            id: analysis.id,
                            handover: newHandover,
                        });

                        sampleChanged = true;
                        updateCount++;
                        return { ...analysis, handover: newHandover };
                    }
                    return analysis;
                });

                if (sampleChanged) {
                    return { ...sample, criteria: newCriteria };
                }
                return sample;
            });

            if (updates.length === 0) {
                toast.warning("Không tìm thấy dữ liệu bàn giao phù hợp để xóa.");
                return;
            }

            const response = await apiPost("https://red.irdop.org/v1/analysis/update", { analyses: updates });

            if (response && response.status === 200) {
                toast.success(`Đã xóa bàn giao cho ${updateCount} chỉ tiêu.`);
                setSamples(newSamples);
                setActiveTooltip(null);
            } else {
                toast.error("Lỗi khi xóa dữ liệu bàn giao.");
            }
        } catch (error) {
            console.error("Remove Handover Error:", error);
            toast.error("Có lỗi xảy ra khi xóa.");
        }
    };

    const renderHandoverTags = (handoverMap) => {
        if (!handoverMap || Object.keys(handoverMap).length === 0) {
            return <span className="text-gray-300 text-xs">--</span>;
        }
        return (
            <div className="flex flex-wrap gap-1 cursor-help" onMouseEnter={(e) => handleTooltipEnter(e, handoverMap)} onMouseLeave={handleTooltipLeave}>
                {Object.keys(handoverMap).map((key) => (
                    <span key={key} className="group relative px-2 py-1 bg-green-50 text-green-700 text-[10px] rounded border border-green-100 font-mono flex items-center hover:pr-5 transition-all">
                        {key}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeHandover(key, handoverMap[key].identityId);
                            }}
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 p-[1px] rounded-full hover:bg-red-200 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Xóa bàn giao này"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>
        );
    };

    const handleConfirm = async () => {
        if (!receiver || displaySamples.length === 0) return;
        setIsSubmitting(true);

        try {
            const currentTimeKey = formatDate(new Date());
            const updates = [];

            displaySamples.forEach((sample) => {
                const quantityTaken = sample.quantity && sample.quantity.trim() !== "" ? sample.quantity : "1";

                sample.criteria.forEach((analysis) => {
                    const newHandoverEntry = {
                        handoverId: "",
                        identityId: receiver.identityId,
                        identityName: receiver.name,
                        quantityTaken: quantityTaken,
                    };

                    const updatedHandoverMap = {
                        ...analysis.handover,
                        [currentTimeKey]: newHandoverEntry,
                    };

                    updates.push({
                        id: analysis.id,
                        handover: updatedHandoverMap,
                    });
                });
            });

            if (updates.length === 0) {
                toast.warning("Không có chỉ tiêu nào để bàn giao.");
                setIsSubmitting(false);
                return;
            }

            const response = await apiPost("https://red.irdop.org/v1/analysis/update", { analyses: updates });

            if (response && response.status === 200) {
                toast.success(`Đã bàn giao thành công ${updates.length} chỉ tiêu.`);

                setSamples((prev) =>
                    prev.map((s) => {
                        const inDisplay = displaySamples.find((d) => d.sampleId === s.sampleId);
                        if (inDisplay) {
                            const quantityTaken = s.quantity && s.quantity.trim() !== "" ? s.quantity : "1";
                            const newCriteria = s.criteria.map((c) => {
                                if (c.technicianId === receiver.identityId) {
                                    return {
                                        ...c,
                                        handover: {
                                            ...c.handover,
                                            [currentTimeKey]: {
                                                handoverId: "---",
                                                identityId: receiver.identityId,
                                                identityName: receiver.name,
                                                quantityTaken: quantityTaken,
                                            },
                                        },
                                    };
                                }
                                return c;
                            });
                            return { ...s, criteria: newCriteria };
                        }
                        return s;
                    }),
                );
            } else {
                toast.error("Lỗi khi gửi dữ liệu bàn giao.");
            }
        } catch (error) {
            console.error("Handover Submit Error:", error);
            toast.error("Có lỗi xảy ra khi bàn giao.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const generateReport = () => {
        if (displaySamples.length === 0) {
            toast.warning("Chưa có dữ liệu để tạo báo cáo");
            return;
        }

        // Validate: Every row must have a Technician and a Handover record for that Technician
        const unconfirmedSamples = [];
        displaySamples.forEach((sample) => {
            sample.criteria.forEach((crit) => {
                const hasTechnician = !!crit.technicianId;
                const hasHandover = crit.handover && Object.values(crit.handover).some((h) => h.identityId === crit.technicianId);

                if (!hasTechnician || !hasHandover) {
                    unconfirmedSamples.push(sample.sampleId);
                }
            });
        });

        if (unconfirmedSamples.length > 0) {
            const uniqueIds = [...new Set(unconfirmedSamples)].join(", ");
            toast.error(`Vui lòng "Xác nhận lấy mẫu" trước! (Mẫu chưa bàn giao: ${uniqueIds})`);
            return;
        }

        const currentUserName = Cookies.get("identityName") || ".....................";
        const receiverName = receiver ? receiver.name : ".....................";
        const currentTime = new Date().toLocaleString("vi-VN");

        let rowCount = 1;

        let rows = "";
        displaySamples.forEach((sample) => {
            const criteriaCount = sample.criteria.length;
            const rowSpan = criteriaCount > 0 ? criteriaCount : 1;
            const quantity = sample.quantity && sample.quantity.trim() !== "" ? sample.quantity.trim() : "";
            const sampleId = sample.sampleId ? sample.sampleId.trim() : "";
            const description = sample.sampleDescription ? sample.sampleDescription.trim() : "";

            // First Row
            if (criteriaCount > 0) {
                const firstCrit = sample.criteria[0];
                const paramName = firstCrit.parameterName ? firstCrit.parameterName.trim() : "";
                const protoCode = firstCrit.protocolCode ? firstCrit.protocolCode.trim() : "";

                rows += `
                    <tr>
                        <td rowspan="${rowSpan}" style="text-align: left; vertical-align: top;">${rowCount}</td>
                        <td rowspan="${rowSpan}" style="text-align: left; vertical-align: top; font-weight: bold;">${sampleId}</td>
                        <td rowspan="${rowSpan}" style="text-align: left; vertical-align: top;">${description}</td>
                        <td rowspan="${rowSpan}" style="text-align: left; vertical-align: top;">${quantity}</td>
                        <td style="text-align: left; vertical-align: top;">${paramName}</td>
                        <td style="text-align: left; vertical-align: top;">${protoCode}</td>
                        <td rowspan="${rowSpan}" style="text-align: left; vertical-align: top;"></td>
                    </tr>
                `;

                // Subsequent Rows
                for (let i = 1; i < criteriaCount; i++) {
                    const crit = sample.criteria[i];
                    const pName = crit.parameterName ? crit.parameterName.trim() : "";
                    const pCode = crit.protocolCode ? crit.protocolCode.trim() : "";

                    rows += `
                        <tr>
                            <td style="text-align: left; vertical-align: top;">${pName}</td>
                            <td style="text-align: left; vertical-align: top;">${pCode}</td>
                        </tr>
                    `;
                }
            } else {
                // Case where there are no criteria (shouldn't happen with filter filter but possible if master list)
                rows += `
                    <tr>
                        <td style="text-align: left; vertical-align: top;">${rowCount}</td>
                        <td style="text-align: left; vertical-align: top; font-weight: bold;">${sampleId}</td>
                        <td style="text-align: left; vertical-align: top;">${description}</td>
                        <td style="text-align: left; vertical-align: top;">${quantity}</td>
                        <td style="text-align: left; vertical-align: top;">--</td>
                        <td style="text-align: left; vertical-align: top;">--</td>
                        <td style="text-align: left; vertical-align: top;"></td>
                    </tr>
                `;
            }
            rowCount++;
        });

        const content = `
            <div style="font-family: 'Times New Roman', Times, serif; color: #000;">

                <!-- HEADER -->
                <table style="width: 100%; border: none !important; margin-bottom: 20px;">
                    <tr style="border: none !important;">
                        <td style="width: 35%; border: none !important; text-align: center; vertical-align: middle; padding-right: 15px;">
                             <img src="${irDopLogo}" style="width: 200px; max-width: 100%; object-fit: contain;" alt="Logo" />
                        </td>
                        <td style="width: 65%; border: none !important; text-align: left; vertical-align: middle;">
                             <p style="font-weight: bold; font-size: 14px; margin: 0; line-height: 1.4;">VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN</p>
                             <p style="font-weight: bold; font-size: 13px; margin: 0; line-height: 1.4;">176 Phùng Khoang, Phường Đại Mỗ, Thành phố Hà Nội</p>
                             <p style="font-weight: bold; font-size: 13px; margin: 0; line-height: 1.4;">Phòng phân tích - Kiểm nghiệm</p>
                        </td>
                    </tr>
                </table>

                <!-- TITLE -->
                <h2 style="text-align: center; text-transform: uppercase; margin: 10px 0 20px 0; font-weight: bold; font-size: 22px;">
                    BIÊN BẢN BÀN GIAO MẪU THỬ NỘI BỘ
                </h2>

                <!-- INFO -->
                <div style="margin-bottom: 15px; font-size: 14px;">
                     <p><b>Người bàn giao:</b> ${currentUserName}</p>
                     <p><b>Người nhận bàn giao:</b> ${receiverName}</p>
                     <p><b>Thời gian:</b> ${currentTime}</p>
                </div>

                <!-- TABLE -->
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="width: 5%; text-align: left;">STT</th>
                            <th style="width: 10%; text-align: left;">Mẫu thử</th>
                            <th style="width: 20%; text-align: left;">Mô tả</th>
                            <th style="width: 10%; text-align: left;">Lượng mẫu</th>
                            <th style="width: 25%; text-align: left;">Chỉ tiêu</th>
                            <th style="width: 20%; text-align: left;">Phương pháp</th>
                            <th style="width: 10%; text-align: left;">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <!-- SIGNATURE -->
                <div class="signature-block" style="margin-top: 30px;">
                    <table style="width: 100%; border: none !important; height: 150px;">
                        <tr style="border: none !important; vertical-align: top;">
                            <td style="border: none !important; text-align: center; width: 50%; padding-top: 0;">
                                <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between; align-items: center;">
                                    <p style="margin-bottom: 5px;"><b>NGƯỜI GIAO</b></p>
                                    <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 80px;">
                                        <span style="color: #fafafa; font-size: 18px; font-weight: bold;">[SIGNATURE_1]</span>
                                    </div>
                                    <p><b>${currentUserName}</b></p>
                                </div>
                            </td>
                            <td style="border: none !important; text-align: center; width: 50%; padding-top: 0;">
                                <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between; align-items: center;">
                                    <p style="margin-bottom: 5px;"><b>NGƯỜI NHẬN</b></p>
                                    <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 80px;">
                                        <span style="color: #fafafa; font-size: 18px; font-weight: bold;">[SIGNATURE_2]</span>
                                    </div>
                                    <p><b>${receiver ? receiver.name : ""}</b></p>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
        setEditorContent(content);
        setShowEditor(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800 w-full">
            <div className="w-full mx-auto space-y-6 px-4">
                {/* Header */}
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Scan className="w-8 h-8 text-blue-600" />
                            Bàn giao mẫu thử
                        </h1>
                        <p className="text-gray-500 mt-1">Quét thẻ KTV để lọc, hoặc quét mẫu thử (SP...) để nhập dữ liệu.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {lastScannedCode && <span className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-full text-gray-500">Last Scan: {lastScannedCode}</span>}
                        <button
                            onClick={generateReport}
                            disabled={displaySamples.length === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${displaySamples.length > 0 ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            <FileText className="w-5 h-5" />
                            Tạo biên bản
                        </button>
                        <button onClick={clearAll} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors">
                            Làm mới
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Column: Receiver Info */}
                    <div className="lg:col-span-1 h-[calc(100vh-200px)] min-h-[500px]">
                        {showTechnicianTasks && receiver ? (
                            <TechnicianHandoverTable technicianId={receiver.identityId} onClose={() => setShowTechnicianTasks(false)} />
                        ) : (
                            <div
                                className={`h-full p-6 text-center rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${receiver ? "bg-blue-50 border-blue-200 shadow-blue-100" : "bg-white border-dashed border-gray-300"
                                    }`}
                            >
                                {receiver && (
                                    <button
                                        onClick={removeReceiver}
                                        className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full text-gray-500 hover:text-red-500 transition-colors"
                                        title="Bỏ chọn người nhận (Hiển thị tất cả)"
                                    >
                                        <FilterX className="w-5 h-5" />
                                    </button>
                                )}

                                <div className="flex-grow flex flex-col items-center justify-center">
                                    <h2 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                                        <User className="w-5 h-5 text-gray-600" />
                                        {receiver ? "Đang lọc theo KTV" : "Người nhận / Bộ lọc"}
                                    </h2>

                                    {receiver ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
                                            <div className="flex items-center justify-center p-4 bg-white rounded-full w-24 h-24 mx-auto mb-4 shadow-sm text-3xl font-bold text-blue-600 border border-blue-100">
                                                {receiver.name.charAt(0)}
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-xl font-bold text-gray-900">{receiver.name}</h3>
                                                <p className="text-blue-600 font-medium">{receiver.id}</p>
                                                <p className="text-gray-500 text-sm mt-1">{receiver.department}</p>
                                            </div>

                                            <div className="pt-4 border-t border-blue-100 w-full">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Số mẫu liên quan:</span>
                                                    <span className="font-bold text-blue-600 text-lg">
                                                        {displaySamples.length} <span className="text-xs font-normal text-gray-400">/ {samples.length}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setShowTechnicianTasks(true)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 font-medium transition-colors shadow-sm"
                                            >
                                                <Scan className="w-4 h-4" />
                                                Kiểm tra chỉ tiêu bàn giao
                                            </button>

                                            <button
                                                onClick={removeReceiver}
                                                className="mt-2 flex items-center justify-center w-full py-2 bg-transparent border border-dashed border-gray-300 text-gray-500 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                                            >
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Chọn người khác
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-64 flex flex-col items-center justify-center text-center text-gray-400">
                                            <Scan className="w-16 h-16 mb-3 opacity-20" />
                                            <p>Quét thẻ nhân viên để lọc danh sách công việc</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Samples List */}
                    <div className="lg:col-span-3 flex flex-col h-full">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-grow flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Package className="w-5 h-5 text-gray-600" />
                                    Danh sách mẫu hiển thị ({displaySamples.length})
                                </h2>
                                {receiver && <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">Đang lọc: {receiver.name}</span>}
                            </div>

                            <div className="overflow-x-auto flex-grow">
                                {displaySamples.length > 0 ? (
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-xs sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-3 py-3 border-b border-gray-200 bg-gray-50">Mã mẫu</th>
                                                <th className="px-3 py-3 border-b border-gray-200 bg-gray-50">Mô tả</th>
                                                <th className="px-3 py-3 border-b border-gray-200 w-32 text-center bg-gray-50">Lượng mẫu</th>
                                                <th className="px-3 py-3 border-b border-gray-200 bg-gray-50">Yêu cầu</th>
                                                <th className="px-3 py-3 border-b border-gray-200 bg-gray-50">Chỉ tiêu</th>
                                                <th className="px-3 py-3 border-b border-gray-200 bg-gray-50">Phương pháp</th>
                                                <th className="px-3 py-3 border-b border-gray-200 bg-gray-50">Người thực hiện</th>
                                                <th className="px-3 py-3 border-b border-gray-200 bg-gray-50 w-40">Bàn giao</th>
                                                <th className="px-3 py-3 border-b border-gray-200 bg-gray-50">Ghi chú</th>
                                                <th className="px-2 py-3 border-b border-gray-200 w-10 bg-gray-50"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {displaySamples.map((sample) => {
                                                const rowSpan = Math.max(sample.criteria.length, 1);
                                                return (
                                                    <React.Fragment key={sample.uniqueId}>
                                                        {/* First Row of a Sample */}
                                                        <tr className="hover:bg-blue-50/20 transition-colors group">
                                                            {/* Merged Sample ID */}
                                                            <td
                                                                className="px-3 py-3 border-r border-gray-100 font-mono font-bold text-gray-900 align-top bg-white group-hover:bg-blue-50/5"
                                                                rowSpan={rowSpan}
                                                            >
                                                                {sample.sampleId}
                                                            </td>

                                                            {/* Merged Description */}
                                                            <td
                                                                className="px-3 py-3 border-r border-gray-100 text-gray-600 text-xs align-top bg-white max-w-xs group-hover:bg-blue-50/5"
                                                                rowSpan={rowSpan}
                                                            >
                                                                <div className="line-clamp-4" title={sample.sampleDescription}>
                                                                    {sample.sampleDescription}
                                                                </div>
                                                            </td>

                                                            {/* Merged Quantity Cell */}
                                                            <td className="px-2 py-2 border-r border-gray-100 align-top bg-blue-50/10 group-hover:bg-blue-50/20" rowSpan={rowSpan}>
                                                                <div className="flex flex-col items-center gap-1 w-full h-full justify-start">
                                                                    <div className="text-xs text-gray-600 font-medium mb-1 text-center w-full bg-blue-100/50 py-0.5 rounded">
                                                                        {sample.sampleVolume || "---"}
                                                                    </div>
                                                                    <textarea
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 bg-white resize-none text-gray-800"
                                                                        rows={3}
                                                                        value={sample.quantity}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setSamples((prev) => prev.map((s) => (s.uniqueId === sample.uniqueId ? { ...s, quantity: val } : s)));
                                                                        }}
                                                                        placeholder="1"
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* Merged Additional Request */}
                                                            <td className="px-3 py-3 border-r border-gray-100 text-gray-600 text-xs align-top bg-white group-hover:bg-blue-50/5" rowSpan={rowSpan}>
                                                                {sample.additionalRequest || "--"}
                                                            </td>

                                                            {/* Criteria Cells (First Criterion) */}
                                                            {sample.criteria.length > 0 ? (
                                                                <>
                                                                    <td className="px-3 py-3 border-r border-gray-100 text-gray-800 align-top">
                                                                        <span className="font-semibold text-blue-600 mr-1">{sample.criteria[0].parameterId}</span>
                                                                        {sample.criteria[0].parameterName}
                                                                    </td>
                                                                    <td className="px-3 py-3 border-r border-gray-100 text-gray-600 font-mono text-xs align-top">{sample.criteria[0].protocolCode}</td>
                                                                    <td className="px-3 py-3 border-r border-gray-100 text-gray-600 font-mono text-xs align-top">
                                                                        {sample.criteria[0].technicianName}
                                                                    </td>

                                                                    {/* Handover Column with Portal Tooltip Trigger */}
                                                                    <td className="px-3 py-3 border-r border-gray-100 align-top">{renderHandoverTags(sample.criteria[0].handover)}</td>

                                                                    <td className="px-3 py-3 border-r border-gray-100 text-gray-500 text-xs align-top italic">{sample.criteria[0].note || ""}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-3 py-3 border-r border-gray-100 text-gray-400 italic" colSpan={5}>
                                                                        Không có chỉ tiêu nào {receiver ? "cho KTV này" : ""}
                                                                    </td>
                                                                </>
                                                            )}

                                                            {/* Merged Action Cell */}
                                                            <td className="px-2 py-3 text-center align-middle bg-white group-hover:bg-blue-50/5" rowSpan={rowSpan}>
                                                                <button
                                                                    onClick={() => removeSample(sample.sampleId)}
                                                                    className="text-gray-300 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 p-1.5 rounded-full"
                                                                    title="Xóa mẫu này khỏi danh sách"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* Remaining Rows for Criteria */}
                                                        {sample.criteria.slice(1).map((c, idx) => (
                                                            <tr key={`${sample.uniqueId}-c-${idx}`} className="hover:bg-blue-50/20 transition-colors">
                                                                <td className="px-3 py-3 border-r border-gray-100 text-gray-800 align-top">
                                                                    <span className="font-semibold text-blue-600 mr-1">{c.parameterId}</span>
                                                                    {c.parameterName}
                                                                </td>
                                                                <td className="px-3 py-3 border-r border-gray-100 text-gray-600 font-mono text-xs align-top">{c.protocolCode}</td>
                                                                <td className="px-3 py-3 border-r border-gray-100 text-gray-600 font-mono text-xs align-top">{c.technicianName}</td>

                                                                {/* Handover Column with Portal Tooltip Trigger (Subsequent Rows) */}
                                                                <td className="px-3 py-3 border-r border-gray-100 align-top">{renderHandoverTags(c.handover)}</td>

                                                                <td className="px-3 py-3 border-r border-gray-100 text-gray-500 text-xs align-top italic">{c.note || ""}</td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-12">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <Package className="w-10 h-10 text-gray-300" />
                                        </div>
                                        <p className="text-lg text-gray-500 font-medium">Chưa có dữ liệu hiển thị</p>
                                        {receiver ? (
                                            <div className="mt-2">
                                                <p className="text-sm">
                                                    KTV <span className="font-bold text-gray-700">{receiver.name}</span> chưa được gán trong các mẫu đã quét.
                                                </p>
                                                <button onClick={removeReceiver} className="mt-3 text-blue-600 hover:underline text-sm">
                                                    Xem tất cả mẫu
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-sm mt-1">Quét mã SP để thêm mẫu, hoặc mã thẻ KTV để lọc.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <button
                                    onClick={handleConfirm}
                                    disabled={!receiver || displaySamples.length === 0 || isSubmitting}
                                    className={`flex items-center px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 ${receiver && displaySamples.length > 0 && !isSubmitting
                                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200 cursor-pointer"
                                            : "bg-gray-300 cursor-not-allowed shadow-none"
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Clock className="w-5 h-5 mr-2 animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 mr-2" />
                                            Xác nhận lấy mẫu
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Portal Tooltip */}
                {activeTooltip &&
                    createPortal(
                        <div
                            className="fixed z-[9999] bg-white shadow-xl border border-gray-200 rounded-lg p-3 min-w-[400px] animate-in fade-in zoom-in-95 duration-200 pointer-events-none -translate-x-full"
                            style={{ top: activeTooltip.y, left: activeTooltip.x }}
                        >
                            <div className="text-xs font-bold text-gray-700 mb-2 border-b border-gray-100 pb-1">Lịch sử bàn giao</div>
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="text-gray-500 bg-gray-50">
                                        <th className="px-2 py-1">Thời gian</th>
                                        <th className="px-2 py-1">Mã bàn giao</th>
                                        <th className="px-2 py-1">Người nhận</th>
                                        <th className="px-2 py-1 text-right">SL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {Object.entries(activeTooltip.data).map(([time, info]) => (
                                        <tr key={time}>
                                            <td className="px-2 py-1 font-mono">{time}</td>
                                            <td className="px-2 py-1 font-mono text-gray-500">{info.handoverId || "---"}</td>
                                            <td className="px-2 py-1 text-blue-600">{info.identityName}</td>
                                            <td className="px-2 py-1 text-right font-medium">{info.quantityTaken}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>,
                        document.body,
                    )}

                {/* Handover Report Modal */}
                <HandoverReportModal isOpen={showEditor} onClose={() => setShowEditor(false)} initialContent={editorContent} />
            </div>
        </div>
    );
};

export default HandoverSampleDash;
