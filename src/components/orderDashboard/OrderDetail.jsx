import React, { useState, useContext, useEffect } from "react";
import { GlobalContext } from "../../contexts/GlobalContext";
import { apiPost } from "../../contexts/helperFunctionCallAPI";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FaTimes, FaSave, FaEdit, FaSync } from "react-icons/fa";
import { AiOutlineClose, AiOutlinePlus } from "react-icons/ai";

const OrderDetail = ({ order, isOpen, onClose }) => {
    const navigate = useNavigate();
    const { formatDate, currentUser, purposes } = useContext(GlobalContext);

    // States
    const [orderData, setOrderData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [urgentSamples, setUrgentSamples] = useState({});
    const [allUrgent, setAllUrgent] = useState(false);
    const [selectedPurpose, setSelectedPurpose] = useState("");
    const [deadline, setDeadline] = useState("");
    const [globalMatrix, setGlobalMatrix] = useState("");

    // Editing states
    const [editingField, setEditingField] = useState({ type: null, field: null, index: null });
    const [editValue, setEditValue] = useState("");
    const [editingAnalysis, setEditingAnalysis] = useState({ sampleIndex: null, analysisIndex: null, field: null });
    const [editAnalysisValue, setEditAnalysisValue] = useState("");

    // Client info states
    const [clientInfo, setClientInfo] = useState({
        clientName: "",
        clientAddress: "",
        legalId: "",
        clientPhone: "",
        invoiceEmail: "",
        invoiceInfo: "",
    });

    const [contactInfo, setContactInfo] = useState({
        name: "",
        phone: "",
        email: "",
        id: "",
    });

    const [receiverInfo, setReceiverInfo] = useState({
        email: "",
        address: "",
    });

    // Sample Information state
    const [sampleInfo, setSampleInfo] = useState({});

    // Initialize data when order changes
    useEffect(() => {
        if (order && isOpen) {
            const transformedData = {
                orderId: order.id,
                quotationId: order.quotationId || "",
                client: order.client || {},
                contactPerson: order.contactPerson || {},
                reportRecipient: order.reportRecipient || {},
                samples: (order.samples || []).map((sample) => ({
                    ...sample,
                    analysis: sample.analyses || [],
                })),
                salePerson: order.salePerson || "",
                totalFeeBeforeTax: order.totalFeeBeforeTax || 0,
                deadline: order.deadline || "",
            };

            setOrderData(transformedData);
            setDeadline(order.deadline || "");

            setClientInfo({
                clientName: order.client?.clientName || "",
                clientAddress: order.client?.clientAddress || "",
                legalId: order.client?.legalId || "",
                clientPhone: order.client?.clientPhone || "",
                invoiceEmail: order.client?.invoiceEmail || "",
                invoiceInfo: order.client?.invoiceInfo || "",
            });

            setContactInfo({
                name: order.contactPerson?.name || "",
                phone: order.contactPerson?.phone || "",
                email: order.contactPerson?.email || "",
                id: order.contactPerson?.legalId || "",
            });

            setReceiverInfo({
                email: order.reportRecipient?.email || "",
                address: order.reportRecipient?.address || "",
            });

            const initialUrgentState = {};
            (order.samples || []).forEach((_, index) => {
                initialUrgentState[index] = false;
            });
            setUrgentSamples(initialUrgentState);

            // Initialize sampleInformation
            const initialSampleInfo = {};
            (order.samples || []).forEach((sample, index) => {
                if (sample.sampleInformation && sample.sampleInformation.length > 0) {
                    initialSampleInfo[index] = sample.sampleInformation;
                } else {
                    initialSampleInfo[index] = [];
                }
            });
            setSampleInfo(initialSampleInfo);
        }
    }, [order, isOpen]);

    // Handle global matrix change and match
    const handleGlobalMatrixApply = async () => {
        if (!orderData || !globalMatrix) return;

        const updatedSamples = [...orderData.samples];

        for (let index = 0; index < updatedSamples.length; index++) {
            try {
                const sample = updatedSamples[index];
                updatedSamples[index].matrix = globalMatrix;

                const analyses = sample.analysis.map((item) => ({
                    analysis: item.parameterName,
                    matrix: globalMatrix,
                }));

                const response = await apiPost("https://red.irdop.org/v1/analysis/match/parameter", {
                    analyses,
                });

                if (response && response.data) {
                    updatedSamples[index].analysis = response.data;
                    updatedSamples[index].analyses = response.data;
                }
            } catch (error) {
                console.error("Error matching analyses:", error);
            }
        }

        setOrderData({
            ...orderData,
            samples: updatedSamples,
        });

        Swal.fire({
            icon: "success",
            title: "Thành công",
            text: `Đã áp dụng nền mẫu "${globalMatrix}" cho tất cả mẫu`,
            timer: 2000,
        });
    };

    // Handle single sample matrix match
    const handleSingleSampleMatch = async (sampleIndex) => {
        if (!orderData || !orderData.samples[sampleIndex]) return;

        const sample = orderData.samples[sampleIndex];
        if (!sample.matrix) {
            Swal.fire({
                icon: "warning",
                title: "Cảnh báo",
                text: "Vui lòng nhập nền mẫu trước!",
            });
            return;
        }

        try {
            const analyses = sample.analysis.map((item) => ({
                analysis: item.parameterName,
                matrix: sample.matrix,
            }));

            const response = await apiPost("https://red.irdop.org/v1/analysis/match/parameter", {
                analyses,
            });

            if (response && response.data) {
                const updatedSamples = [...orderData.samples];
                updatedSamples[sampleIndex].analysis = response.data;
                updatedSamples[sampleIndex].analyses = response.data;

                setOrderData({
                    ...orderData,
                    samples: updatedSamples,
                });

                Swal.fire({
                    icon: "success",
                    title: "Thành công",
                    text: `Đã khớp chỉ tiêu cho mẫu ${sampleIndex + 1}`,
                    timer: 1500,
                });
            }
        } catch (error) {
            console.error("Error matching sample analyses:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: "Không thể khớp chỉ tiêu. Vui lòng thử lại.",
            });
        }
    };

    // Start editing field
    const startEditing = (type, field, index = null) => {
        setEditingField({ type, field, index });

        if (type === "client") {
            setEditValue(clientInfo[field] || "");
        } else if (type === "contact") {
            setEditValue(contactInfo[field] || "");
        } else if (type === "receiver") {
            setEditValue(receiverInfo[field] || "");
        } else if (type === "sample" && index !== null) {
            setEditValue(orderData.samples[index][field] || "");
        }
    };

    // Save field edit
    const saveEdit = () => {
        const { type, field, index } = editingField;

        if (type === "client") {
            setClientInfo({ ...clientInfo, [field]: editValue });
            setOrderData({
                ...orderData,
                client: { ...orderData.client, [field]: editValue },
            });
        } else if (type === "contact") {
            setContactInfo({ ...contactInfo, [field]: editValue });
            setOrderData({
                ...orderData,
                contactPerson: { ...orderData.contactPerson, [field]: editValue },
            });
        } else if (type === "receiver") {
            setReceiverInfo({ ...receiverInfo, [field]: editValue });
            setOrderData({
                ...orderData,
                reportRecipient: { ...orderData.reportRecipient, [field]: editValue },
            });
        } else if (type === "sample" && index !== null) {
            const updatedSamples = [...orderData.samples];
            updatedSamples[index] = { ...updatedSamples[index], [field]: editValue };
            setOrderData({ ...orderData, samples: updatedSamples });
        }

        setEditingField({ type: null, field: null, index: null });
    };

    // Cancel edit
    const cancelEdit = () => {
        setEditingField({ type: null, field: null, index: null });
    };

    // Start editing analysis
    const startEditingAnalysis = (sampleIndex, analysisIndex, field, value) => {
        setEditingAnalysis({ sampleIndex, analysisIndex, field });
        setEditAnalysisValue(value || "");
    };

    // Save analysis edit
    const saveAnalysisEdit = () => {
        const { sampleIndex, analysisIndex, field } = editingAnalysis;
        if (sampleIndex === null || analysisIndex === null || !field) return;

        const updatedSamples = [...orderData.samples];
        updatedSamples[sampleIndex].analysis[analysisIndex] = {
            ...updatedSamples[sampleIndex].analysis[analysisIndex],
            [field]: editAnalysisValue,
        };

        // Also update analyses to keep them in sync
        if (updatedSamples[sampleIndex].analyses) {
            updatedSamples[sampleIndex].analyses = updatedSamples[sampleIndex].analysis;
        }

        setOrderData({ ...orderData, samples: updatedSamples });
        setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
    };

    // Cancel analysis edit
    const cancelAnalysisEdit = () => {
        setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
    };

    // Handle add sample information field
    const handleAddSampleInfoField = (sampleIndex) => {
        const updatedSampleInfo = { ...sampleInfo };
        if (!updatedSampleInfo[sampleIndex]) {
            updatedSampleInfo[sampleIndex] = [];
        }
        updatedSampleInfo[sampleIndex] = [...updatedSampleInfo[sampleIndex], { fname: "", fvalue: "" }];
        setSampleInfo(updatedSampleInfo);

        // Update orderData
        const updatedSamples = [...orderData.samples];
        updatedSamples[sampleIndex].sampleInformation = updatedSampleInfo[sampleIndex];
        setOrderData({ ...orderData, samples: updatedSamples });
    };

    // Handle sample information field change
    const handleSampleInfoFieldChange = (sampleIndex, fieldIndex, field, value) => {
        const updatedSampleInfo = { ...sampleInfo };

        if (!updatedSampleInfo[sampleIndex]) {
            updatedSampleInfo[sampleIndex] = [];
        }

        updatedSampleInfo[sampleIndex][fieldIndex] = {
            ...updatedSampleInfo[sampleIndex][fieldIndex],
            [field]: value,
        };

        setSampleInfo(updatedSampleInfo);

        // Update orderData
        const updatedSamples = [...orderData.samples];
        updatedSamples[sampleIndex].sampleInformation = updatedSampleInfo[sampleIndex];
        setOrderData({ ...orderData, samples: updatedSamples });
    };

    // Handle delete sample information field
    const handleDeleteSampleInfoField = (sampleIndex, fieldIndex) => {
        const updatedSampleInfo = { ...sampleInfo };
        if (updatedSampleInfo[sampleIndex]) {
            updatedSampleInfo[sampleIndex] = updatedSampleInfo[sampleIndex].filter((_, i) => i !== fieldIndex);
        }
        setSampleInfo(updatedSampleInfo);

        // Update orderData
        const updatedSamples = [...orderData.samples];
        updatedSamples[sampleIndex].sampleInformation = updatedSampleInfo[sampleIndex];
        setOrderData({ ...orderData, samples: updatedSamples });
    };

    // Handle delete sample
    const handleDeleteSample = (index) => {
        if (!orderData) return;

        const updatedSamples = [...orderData.samples];
        updatedSamples.splice(index, 1);

        setOrderData({ ...orderData, samples: updatedSamples });

        const newUrgentSamples = {};
        updatedSamples.forEach((_, idx) => {
            if (idx < index) {
                newUrgentSamples[idx] = urgentSamples[idx];
            } else {
                newUrgentSamples[idx] = urgentSamples[idx + 1] || false;
            }
        });
        setUrgentSamples(newUrgentSamples);
    };

    // Handle delete analysis
    const handleDeleteAnalysis = (sampleIndex, analysisIndex) => {
        if (!orderData) return;

        const updatedSamples = [...orderData.samples];
        const updatedAnalysis = [...updatedSamples[sampleIndex].analysis];

        updatedAnalysis.splice(analysisIndex, 1);

        updatedSamples[sampleIndex] = {
            ...updatedSamples[sampleIndex],
            analysis: updatedAnalysis,
            analyses: updatedAnalysis,
        };

        setOrderData({ ...orderData, samples: updatedSamples });
    };

    // Handle save order (API 1)
    const handleSaveOrder = async () => {
        if (!orderData) return;

        setIsSaving(true);

        try {
            const payload = {
                orderId: orderData.orderId,
                client: {
                    clientName: clientInfo.clientName,
                    clientAddress: clientInfo.clientAddress,
                    legalId: clientInfo.legalId,
                    clientPhone: clientInfo.clientPhone,
                    invoiceEmail: clientInfo.invoiceEmail,
                    invoiceInfo: clientInfo.invoiceInfo,
                },
                contactPerson: {
                    name: contactInfo.name,
                    phone: contactInfo.phone,
                    email: contactInfo.email,
                    legalId: contactInfo.id,
                },
                reportRecipient: {
                    email: receiverInfo.email,
                    address: receiverInfo.address,
                },
                samples: orderData.samples,
            };

            // TODO: Replace with actual API endpoint
            const response = await apiPost("https://red.irdop.org/v1/order/update", payload);

            if (response && response.data && response.data.error) {
                Swal.fire({
                    icon: "error",
                    title: "Lỗi",
                    text: response.data.message || "Đã xảy ra lỗi khi lưu đơn hàng.",
                });
            } else {
                Swal.fire({
                    icon: "success",
                    title: "Thành công",
                    text: "Lưu đơn hàng thành công!",
                    timer: 1500,
                });
            }
        } catch (error) {
            console.error("Error saving order:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: error.response?.data?.message || "Không thể lưu đơn hàng. Vui lòng thử lại sau.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handle create receipt (API 2)
    const handleCreateReceipt = async () => {
        if (!orderData) return;

        if (!deadline) {
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: "Vui lòng chọn Hạn trả kết quả!",
            });
            return;
        }

        setIsCreating(true);

        const samplesWithStatus = orderData.samples.map((sample, index) => {
            const updatedAnalyses = sample.analysis.map((item) => ({
                parameterId: item.parameterId || "",
                parameterName: item.parameterName || "",
                protocolSource: item.protocolSource || "",
                protocolCode: item.protocolCode || "",
                matrix: item.matrix || sample.matrix || "",
                field: item.field || "",
                resultUnit: item.resultUnit || "",
            }));

            let sampleInformation = [];

            // Use sampleInfo state instead of sample.sampleInformation
            if (sampleInfo[index] && sampleInfo[index].length > 0) {
                sampleInformation = [...sampleInfo[index]];
            } else {
                sampleInformation.push({
                    fname: "Tên mẫu thử / name.",
                    fvalue: sample.sampleName || "",
                });
            }

            // Add receipt date, test date, description
            sampleInformation.push(
                {
                    fname: "Ngày tiếp nhận / receipt date.",
                    fvalue: new Date().toLocaleDateString("vi-VN"),
                },
                { fname: "Ngày thử nghiệm / test date.", fvalue: "" },
                {
                    fname: "Mô tả / desc.",
                    fvalue: sample.sampleDescription || "",
                },
            );

            return {
                sampleName: sample.sampleName,
                matrix: sample.matrix,
                sampleInformation: sampleInformation,
                status: urgentSamples[index] ? 1 : 0,
                purpose: selectedPurpose,
                analyses: updatedAnalyses,
            };
        });

        try {
            const payload = {
                client: {
                    clientName: clientInfo.clientName,
                    clientAddress: clientInfo.clientAddress,
                    legalId: clientInfo.legalId,
                    clientPhone: clientInfo.clientPhone,
                    invoiceEmail: clientInfo.invoiceEmail,
                    invoiceInfo: clientInfo.invoiceInfo,
                },
                contactPerson: {
                    name: contactInfo.name,
                    phone: contactInfo.phone,
                    email: contactInfo.email,
                    legalId: contactInfo.id,
                },
                reportRecipient: {
                    email: receiverInfo.email,
                    address: receiverInfo.address,
                },
                samples: samplesWithStatus,
                orderId: orderData.orderId,
                salePerson: orderData.salePerson,
                totalFeeBeforeTax: orderData.totalFeeBeforeTax,
                deadline: deadline,
            };

            const response = await apiPost("https://red.irdop.org/v1/receipt/create/full", payload);

            if (response && response.data && response.data.error) {
                Swal.fire({
                    icon: "error",
                    title: "Lỗi",
                    text: response.data.message || "Đã xảy ra lỗi khi tạo tiếp nhận mẫu.",
                });
            } else if (response && response.data) {
                onClose();

                Swal.fire({
                    icon: "success",
                    title: "Thành công",
                    text: "Tạo tiếp nhận mẫu thành công!",
                    timer: 1500,
                }).then(() => {
                    navigate(`/dashboard/receipt?receiptId=${response.data.receiptId}`);
                });
            }
        } catch (error) {
            console.error("Error creating receipt:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: error.response?.data?.message || "Không thể tạo tiếp nhận mẫu. Vui lòng thử lại sau.",
            });
        } finally {
            setIsCreating(false);
        }
    };

    // Handle all urgent checkbox
    const handleAllUrgentChange = (e) => {
        const checked = e.target.checked;
        setAllUrgent(checked);

        const newUrgentSamples = {};
        if (orderData && orderData.samples) {
            orderData.samples.forEach((_, index) => {
                newUrgentSamples[index] = checked;
            });
        }
        setUrgentSamples(newUrgentSamples);
    };

    // Handle individual urgent checkbox
    const handleUrgentChange = (index, checked) => {
        setUrgentSamples((prev) => ({
            ...prev,
            [index]: checked,
        }));
    };

    // Render editable field
    const renderEditableField = (type, field, label, index = null) => {
        const isEditing = editingField.type === type && editingField.field === field && editingField.index === index;
        let value = "";

        if (type === "client") value = clientInfo[field] || "";
        else if (type === "contact") value = contactInfo[field] || "";
        else if (type === "receiver") value = receiverInfo[field] || "";
        else if (type === "sample" && index !== null) value = orderData?.samples[index]?.[field] || "";

        if (isEditing) {
            return (
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
                        autoFocus
                    />
                    <button onClick={saveEdit} className="text-green-600 hover:text-green-700">
                        <FaSave size={16} />
                    </button>
                    <button onClick={cancelEdit} className="text-red-600 hover:text-red-700">
                        <FaTimes size={16} />
                    </button>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-between group">
                <div className="flex-1 text-left">
                    <span className="text-sm text-gray-600">{label}:</span> <span className="font-medium text-gray-900">{value || "--"}</span>
                </div>
                <button onClick={() => startEditing(type, field, index)} className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 transition-opacity">
                    <FaEdit size={14} />
                </button>
            </div>
        );
    };

    if (!isOpen || !orderData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-2 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Chi tiết đơn hàng</h2>
                        <p className="text-sm text-gray-600 mt-1">Mã đơn hàng: {orderData.orderId}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <FaTimes size={24} />
                    </button>
                </div>

                {/* Body - 2 Column Layout */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Left Column - Order Info (with hidden scrollbar) */}
                    <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-6 space-y-6" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                        <style>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>

                        {/* Order Information */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 text-left">Thông tin đơn hàng</h3>
                            <div className="space-y-2 text-left">
                                <div>
                                    <span className="text-sm text-gray-600">Mã đơn hàng:</span> <span className="font-medium text-gray-900">{orderData.orderId || "--"}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Mã báo giá:</span> <span className="font-medium text-gray-900">{orderData.quotationId || "--"}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Ghi nhận doanh số:</span> <span className="font-medium text-gray-900">{orderData.salePerson || "--"}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Tổng tiền:</span>{" "}
                                    <span className="font-medium text-gray-900">
                                        {orderData.totalFeeBeforeTax
                                            ? new Intl.NumberFormat("vi-VN", {
                                                  style: "currency",
                                                  currency: "VND",
                                              }).format(orderData.totalFeeBeforeTax)
                                            : "--"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Client Information */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 text-left">Thông tin khách hàng</h3>
                            <div className="space-y-2">
                                {renderEditableField("client", "clientName", "Tên KH")}
                                {renderEditableField("client", "clientPhone", "SĐT")}
                                {renderEditableField("client", "invoiceEmail", "Email")}
                                {renderEditableField("client", "legalId", "MST")}
                                {renderEditableField("client", "clientAddress", "Địa chỉ")}
                            </div>
                        </div>

                        {/* Contact Person */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 text-left">Người liên hệ</h3>
                            <div className="space-y-2">
                                {renderEditableField("contact", "name", "Họ tên")}
                                {renderEditableField("contact", "phone", "SĐT")}
                                {renderEditableField("contact", "email", "Email")}
                                {renderEditableField("contact", "id", "CMND/CCCD")}
                            </div>
                        </div>

                        {/* Report Recipient */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 text-left">Người nhận kết quả</h3>
                            <div className="space-y-2">
                                {renderEditableField("receiver", "email", "Email")}
                                {renderEditableField("receiver", "address", "Địa chỉ")}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Samples */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Top Controls - Single Row */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 160px 1fr" }}>
                                {/* Global Matrix */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Nền mẫu toàn bộ</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={globalMatrix}
                                            onChange={(e) => setGlobalMatrix(e.target.value)}
                                            placeholder="Nhập nền mẫu..."
                                            className="w-full px-2 py-1 pr-10 h-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
                                        />
                                        <button
                                            onClick={handleGlobalMatrixApply}
                                            disabled={!globalMatrix}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                                            title="Áp dụng & Khớp"
                                        >
                                            <FaSync size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Deadline */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                        Hạn trả kết quả <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="px-2 py-1 border h-9 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
                                    />
                                </div>

                                {/* Purpose */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Mục đích</label>
                                    <select
                                        value={selectedPurpose}
                                        onChange={(e) => setSelectedPurpose(e.target.value)}
                                        className="w-full px-2 py-1 border h-9 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
                                    >
                                        <option value="">-- Chọn mục đích --</option>
                                        {purposes &&
                                            purposes.map((purpose, index) => (
                                                <option key={index} value={purpose}>
                                                    {purpose}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* All Urgent Checkbox */}
                        <div className="flex items-center gap-2 bg-red-50 rounded-lg p-3 mb-6">
                            <input type="checkbox" id="allUrgent" checked={allUrgent} onChange={handleAllUrgentChange} className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                            <label htmlFor="allUrgent" className="text-sm font-medium text-red-700">
                                Đánh dấu tất cả mẫu là khẩn cấp
                            </label>
                        </div>

                        {/* Samples List */}
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-left">Danh sách mẫu ({orderData.samples?.length || 0})</h3>
                        <div className="space-y-4">
                            {orderData.samples && orderData.samples.length > 0 ? (
                                orderData.samples.map((sample, sampleIndex) => (
                                    <div key={sampleIndex} className="border border-gray-200 rounded-lg p-4 bg-white">
                                        {/* Sample Header */}
                                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
                                            <div className="flex-1">
                                                <div className="group">{renderEditableField("sample", "sampleName", `Mẫu ${sampleIndex + 1}`, sampleIndex)}</div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="flex-1 group">{renderEditableField("sample", "matrix", "Nền mẫu", sampleIndex)}</div>
                                                    <button
                                                        onClick={() => handleSingleSampleMatch(sampleIndex)}
                                                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                                                        title="Khớp chỉ tiêu"
                                                    >
                                                        Khớp chỉ tiêu
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`urgent-${sampleIndex}`}
                                                        checked={urgentSamples[sampleIndex] || false}
                                                        onChange={(e) => handleUrgentChange(sampleIndex, e.target.checked)}
                                                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                                    />
                                                    <label htmlFor={`urgent-${sampleIndex}`} className="text-sm font-medium text-red-600">
                                                        Khẩn cấp
                                                    </label>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteSample(sampleIndex)} className="text-red-500 hover:text-red-700 transition-colors" title="Xóa mẫu">
                                                <AiOutlineClose size={20} />
                                            </button>
                                        </div>

                                        {/* Sample Information - Editable */}
                                        <div className="mb-3 pb-3 border-b border-gray-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-gray-700 text-left">Thông tin mẫu:</h4>
                                                <button
                                                    onClick={() => handleAddSampleInfoField(sampleIndex)}
                                                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
                                                    title="Thêm trường thông tin"
                                                >
                                                    <AiOutlinePlus size={12} />
                                                    Thêm
                                                </button>
                                            </div>

                                            {sampleInfo[sampleIndex] && sampleInfo[sampleIndex].length > 0 ? (
                                                <div className="space-y-2">
                                                    {sampleInfo[sampleIndex].map((info, infoIndex) => (
                                                        <div key={infoIndex} className="grid grid-cols-12 gap-2 items-center">
                                                            {/* Field Name Input */}
                                                            <div className="col-span-5">
                                                                <input
                                                                    type="text"
                                                                    value={info.fname || ""}
                                                                    onChange={(e) => handleSampleInfoFieldChange(sampleIndex, infoIndex, "fname", e.target.value)}
                                                                    placeholder="Tên trường..."
                                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-left"
                                                                />
                                                            </div>

                                                            {/* Field Value Input */}
                                                            <div className="col-span-6">
                                                                <input
                                                                    type="text"
                                                                    value={info.fvalue || ""}
                                                                    onChange={(e) => handleSampleInfoFieldChange(sampleIndex, infoIndex, "fvalue", e.target.value)}
                                                                    placeholder="Giá trị..."
                                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-left"
                                                                />
                                                            </div>

                                                            {/* Delete Button */}
                                                            <div className="col-span-1 flex justify-center">
                                                                <button
                                                                    onClick={() => handleDeleteSampleInfoField(sampleIndex, infoIndex)}
                                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                                    title="Xóa trường"
                                                                >
                                                                    <AiOutlineClose size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500 italic text-left">Chưa có thông tin mẫu. Click "Thêm" để thêm trường mới.</p>
                                            )}
                                        </div>

                                        {/* Analyses Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">STT</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã CT</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên chỉ tiêu</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nền mẫu</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nguồn</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phương pháp</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Người TH</th>
                                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Xóa</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {sample.analysis && sample.analysis.length > 0 ? (
                                                        sample.analysis.map((analysis, analysisIndex) => (
                                                            <tr key={analysisIndex} className="hover:bg-gray-50">
                                                                <td className="px-3 py-2 text-gray-900 text-left">{analysisIndex + 1}</td>
                                                                <td className="px-3 py-2 text-gray-600 font-mono text-xs text-left">{analysis.parameterId || "--"}</td>
                                                                <td className="px-3 py-2 text-left">
                                                                    {editingAnalysis.sampleIndex === sampleIndex &&
                                                                    editingAnalysis.analysisIndex === analysisIndex &&
                                                                    editingAnalysis.field === "parameterName" ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editAnalysisValue}
                                                                                onChange={(e) => setEditAnalysisValue(e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter") saveAnalysisEdit();
                                                                                    if (e.key === "Escape") cancelAnalysisEdit();
                                                                                }}
                                                                                className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm bg-white text-left"
                                                                                autoFocus
                                                                            />
                                                                            <button onClick={saveAnalysisEdit} className="text-green-600">
                                                                                <FaSave size={14} />
                                                                            </button>
                                                                            <button onClick={cancelAnalysisEdit} className="text-red-600">
                                                                                <FaTimes size={14} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            className="group flex items-center justify-between cursor-pointer"
                                                                            onClick={() => startEditingAnalysis(sampleIndex, analysisIndex, "parameterName", analysis.parameterName)}
                                                                        >
                                                                            <span className="text-gray-900">{analysis.parameterName || "--"}</span>
                                                                            <FaEdit size={12} className="opacity-0 group-hover:opacity-100 text-blue-600" />
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                <td className="px-3 py-2 text-left">
                                                                    {editingAnalysis.sampleIndex === sampleIndex &&
                                                                    editingAnalysis.analysisIndex === analysisIndex &&
                                                                    editingAnalysis.field === "matrix" ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editAnalysisValue}
                                                                                onChange={(e) => setEditAnalysisValue(e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter") saveAnalysisEdit();
                                                                                    if (e.key === "Escape") cancelAnalysisEdit();
                                                                                }}
                                                                                className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm bg-white text-left"
                                                                                autoFocus
                                                                            />
                                                                            <button onClick={saveAnalysisEdit} className="text-green-600">
                                                                                <FaSave size={14} />
                                                                            </button>
                                                                            <button onClick={cancelAnalysisEdit} className="text-red-600">
                                                                                <FaTimes size={14} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            className="group flex items-center justify-between cursor-pointer"
                                                                            onClick={() => startEditingAnalysis(sampleIndex, analysisIndex, "matrix", analysis.matrix || sample.matrix)}
                                                                        >
                                                                            <span className="text-gray-900">{analysis.matrix || sample.matrix || "--"}</span>
                                                                            <FaEdit size={12} className="opacity-0 group-hover:opacity-100 text-blue-600" />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-gray-600 text-xs text-left">{analysis.protocolSource || "--"}</td>
                                                                <td className="px-3 py-2 text-gray-600 text-xs text-left">{analysis.protocolCode || "--"}</td>
                                                                <td className="px-3 py-2 text-gray-600 text-xs text-left">{analysis.technicianAlias || "--"}</td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <button
                                                                        onClick={() => handleDeleteAnalysis(sampleIndex, analysisIndex)}
                                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                                        title="Xóa chỉ tiêu"
                                                                    >
                                                                        <AiOutlineClose size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="8" className="px-3 py-4 text-center text-gray-500">
                                                                Không có chỉ tiêu nào
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-8">Không có mẫu nào</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer - 2 Separate Buttons */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    <button onClick={onClose} disabled={isSaving || isCreating} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors">
                        Đóng
                    </button>
                    <button
                        onClick={handleSaveOrder}
                        disabled={isSaving || isCreating}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <FaSave />
                                Lưu đơn
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleCreateReceipt}
                        disabled={isSaving || isCreating || !deadline}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <FaSave />
                                Tạo tiếp nhận mẫu
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;
