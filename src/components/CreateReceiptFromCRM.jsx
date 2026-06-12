import React, { useState, useContext, useEffect, useRef } from "react";
import { GlobalContext } from "../contexts/GlobalContext";
import { apiGet, apiPost } from "../contexts/helperFunctionCallAPI";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import { MdLibraryAdd } from "react-icons/md";
import { FaTrashAlt } from "react-icons/fa";
import { AiOutlinePlus } from "react-icons/ai";
import FileColumn from "./file/FileColumn";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 h-full overflow-auto">
                    <h3 className="font-bold text-lg mb-2">Đã xảy ra lỗi!</h3>
                    <p className="mb-2">Vui lòng thử lại hoặc liên hệ bộ phận kỹ thuật.</p>
                    <details className="text-xs whitespace-pre-wrap cursor-pointer mb-4">
                        <summary>Chi tiết lỗi</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button onClick={() => this.setState({ hasError: false })} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                        Thử lại
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

const CreateReceiptFromCRM = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [crmData, setCrmData] = useState(null);
    const [error, setError] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [urgentSamples, setUrgentSamples] = useState({});
    const [allUrgent, setAllUrgent] = useState(false);
    const [selectedPurpose, setSelectedPurpose] = useState(""); // Default purpose
    const [deadline, setDeadline] = useState(""); // Add state for deadline

    // Add new states for inline editing
    const [editingField, setEditingField] = useState({
        type: null, // 'client' or 'sample'
        field: null, // field name being edited
        index: null, // index for sample editing
    });
    const [editValue, setEditValue] = useState("");

    // Add state for tracking which analysis cell is being edited
    const [editingAnalysis, setEditingAnalysis] = useState({
        sampleIndex: null,
        analysisIndex: null,
        field: null,
    });
    const [editAnalysisValue, setEditAnalysisValue] = useState("");
    // Add states for sample information editing
    const [editingSampleInfo, setEditingSampleInfo] = useState({
        sampleIndex: null,
        isEditing: false,
    });
    const [customerInfo, setCustomerInfo] = useState({});
    const [newField, setNewField] = useState({ fname: "", fvalue: "" });
    const [defaultSampleInformation, setDefaultSampleInformation] = useState(false);

    // States for direct input editing
    const [clientInfo, setClientInfo] = useState({
        clientName: "",
        clientAddress: "",
        legalId: "",
        clientPhone: "",
        invoiceEmail: "",
        invoiceInfo: "",
    });
    // State for parameter suggestions
    const [suggestions, setSuggestions] = useState({});
    const [loadingSuggestions, setLoadingSuggestions] = useState({});
    const [showSuggestionDropdown, setShowSuggestionDropdown] = useState({ sampleIndex: null, analysisIndex: null });
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const dropdownTriggerRef = useRef(null);
    const [contactInfo, setContactInfo] = useState({
        name: "",
        phone: "",
        email: "",
        id: "",
        id_date: "",
        id_place: "",
    });
    const [receiverInfo, setReceiverInfo] = useState({
        name: "",
        address: "",
        email: "",
        other: "",
    });

    const { formatDate, currentUser, purposes, hasAuthCookies } = useContext(GlobalContext);
    const navigate = useNavigate();
    // Default customer fields - only used when "Đầy đủ thông tin mẫu" is clicked
    const defaultCustomerFields = [
        { fname: "Tên mẫu thử / name.", fvalue: "" },
        { fname: "Số lô / LOT no.", fvalue: "" },
        { fname: "Ngày sản xuất / mfg.", fvalue: "" },
        { fname: "Hạn sử dụng / exp.", fvalue: "" },
        { fname: "Nơi sản xuất / mfr.", fvalue: "" },
    ];

    const defaultReceiptFields = [
        { fname: "Ngày tiếp nhận / receipt date.", fvalue: "" },
        { fname: "Ngày thử nghiệm / test date.", fvalue: "" },
        { fname: "Mô tả / desc.", fvalue: "" },
        { fname: "Mã tiếp nhận / receipt code.", fvalue: "" },
        { fname: "Ngày hoàn thành / deadline.", fvalue: "" },
        { fname: "Nền mẫu / matrix.", fvalue: "" },
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showSuggestionDropdown.sampleIndex !== null && showSuggestionDropdown.analysisIndex !== null) {
                // Check if click is outside the dropdown
                const dropdown = document.querySelector(".fixed.w-64.bg-white.border.rounded.shadow-lg");
                if (dropdown && !dropdown.contains(event.target) && !dropdownTriggerRef.current?.contains(event.target)) {
                    setShowSuggestionDropdown({ sampleIndex: null, analysisIndex: null });
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showSuggestionDropdown]);

    // Add function to handle global matrix change
    const handleGlobalMatrixChange = (value) => {
        if (!crmData) return;

        const updatedSamples = crmData.samples.map((sample) => ({
            ...sample,
            matrix: value,
        }));

        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });
    };

    // Apply matrix to all samples and update analyses
    const applyGlobalMatrix = async (matrix) => {
        if (!crmData || !matrix) return;

        // First update all sample matrices
        const updatedSamples = crmData.samples.map((sample) => ({
            ...sample,
            matrix: matrix,
        }));

        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });
        // Then update analyses for each sample
        for (let index = 0; index < updatedSamples.length; index++) {
            try {
                // Check auth cookies before making API call
                if (!hasAuthCookies()) {
                    return; // hasAuthCookies will handle redirect
                }

                const sample = updatedSamples[index];
                // Create list of analyses with their parameter names and the new matrix
                const analyses = sample.analysis.map((item) => ({
                    parameterId: item.parameterId,
                    analysis: item.parameterName,
                    matrix: matrix,
                }));

                // Send API request to match analyses with matrix
                const response = await apiPost("https://red.irdop.org/v1/analysis/match/parameter", {
                    analyses,
                });

                // Update the sample with the response data
                if (response && response.data) {
                    updatedSamples[index] = {
                        ...updatedSamples[index],
                        analysis: response.data,
                        analyses: response.data,
                    };

                    setCrmData({
                        ...crmData,
                        samples: updatedSamples,
                    });
                }
            } catch (error) {
                console.error("Error updating analyses based on matrix:", error);
            }
        }
    };

    const openModal = () => {
        setIsModalOpen(true);
        setCode("");
        setCrmData(null);
        setError(null);
        setUrgentSamples({});
        setAllUrgent(false);
        setSelectedPurpose(""); // Reset to default purpose
        setDeadline(""); // Reset deadline
        setPartnerLink(""); // Reset partner link
        setLinkError(""); // Reset link error
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };
    // Function to auto-fill code format
    const formatCode = (inputCode) => {
        if (!inputCode) return inputCode;

        // Remove any existing 'DH' prefix and leading zeros for processing
        let cleanCode = inputCode.replace(/^DH*/i, "");

        // If the clean code is less than 9 characters (after removing DH prefix)
        if (cleanCode.length < 9) {
            // Calculate how many zeros we need
            const zerosNeeded = 9 - cleanCode.length;
            const prefix = "DH" + "0".repeat(zerosNeeded - 2);
            return prefix + cleanCode;
        }

        // If already 9 or more characters, just add DH prefix if not present
        if (!inputCode.toUpperCase().startsWith("DH")) {
            return "DH" + inputCode;
        }

        return inputCode.toUpperCase();
    };

    // Handle code input change with auto-formatting
    const handleCodeChange = (e) => {
        const inputValue = e.target.value;
        setCode(inputValue);
    };

    // Handle code input blur to apply formatting
    const handleCodeBlur = (e) => {
        const inputValue = e.target.value;
        if (inputValue.trim()) {
            const formattedCode = formatCode(inputValue);
            setCode(formattedCode);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Reset all states to default values
        setCrmData(null);
        setUrgentSamples({});
        setAllUrgent(false);
        setSelectedPurpose("");
        setDeadline("");
        setCustomerInfo({});
        setDefaultSampleInformation(false);
        setEditingField({ type: null, field: null, index: null });
        setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
        setEditingSampleInfo({ sampleIndex: null, isEditing: false });
        setMatrixInput("");
        setShowMatrixDropdown(false);
        setMatrixPage(1);
        setCurrentEditingMatrixIndex(null);
        setClientInfo({
            clientName: "",
            clientAddress: "",
            legalId: "",
            clientPhone: "",
            invoiceEmail: "",
            invoiceInfo: "",
        });
        setContactInfo({
            name: "",
            phone: "",
            email: "",
            id: "",
            id_date: "",
            id_place: "",
        });
        setReceiverInfo({
            name: "",
            address: "",
            email: "",
            other: "",
        });

        try {
            // Check auth cookies before making API call
            if (!hasAuthCookies()) {
                setIsLoading(false);
                return; // hasAuthCookies will handle redirect
            }

            // Format the code before sending to API
            const formattedCode = formatCode(code);

            // Use the new unified API
            const response = await apiPost("https://red.irdop.org/v1/order/get/info", {
                orderId: formattedCode,
                loadCrm: false,
            });

            // Check if the response contains an error
            if (response && response.data && response.data.error) {
                setError(response.data.message || "Đã xảy ra lỗi khi lấy dữ liệu.");
                setCrmData(null);
            } else if (response && response.data && response.data.samples && Array.isArray(response.data.samples)) {
                // Transform the new API response to match the expected structure
                const transformedData = {
                    orderId: response.data.orderId,
                    quoteId: response.data.quoteId, // If available in response
                    salePerson: response.data.salePerson, // If available in response
                    totalFeeBeforeTax: response.data.totalFeeBeforeTax, // If available in response
                    files: response.data.files || [],
                    totalAmount: response.data.totalAmount || 0,
                    transactions: response.data.transactions || [],
                    client: response.data.client || { clientName: "", clientAddress: "", legalId: "", clientPhone: "", invoiceEmail: "", invoiceInfo: "" },
                    contact: response.data.contactPerson || { name: "", phone: "", email: "", id: "", id_date: "", id_place: "" },
                    receiver: response.data.reportRecipient || { name: "", address: "", email: "", other: "" },
                    samples: response.data.samples.map((sample) => {
                        // Helper function to process analysis array
                        const processAnalysis = (analysisArray) => {
                            return (analysisArray || []).map((analysis) => {
                                let currentParameterName = analysis.parameterName;
                                let currentParameterId = analysis.ParameterId || analysis.parameterId || "";

                                // Handle parameter selection if params exist
                                if (analysis.params) {
                                    if (currentParameterId && analysis.params[currentParameterId]) {
                                        currentParameterName = analysis.params[currentParameterId].parameterName;
                                    } else {
                                        const nonDefaultKeys = Object.keys(analysis.params).filter((k) => k !== "default");
                                        if (nonDefaultKeys.length > 0) {
                                            currentParameterId = nonDefaultKeys[0];
                                            currentParameterName = analysis.params[currentParameterId].parameterName;
                                        } else if (analysis.params.default) {
                                            currentParameterName = analysis.params.default.parameterName;
                                            currentParameterId = "";
                                        }
                                    }
                                }

                                return {
                                    parameterName: currentParameterName,
                                    protocolCode: analysis.protocolCode || "",
                                    parameterId: currentParameterId,
                                    protocolSource: analysis.protocolSource || "IRDOP",
                                    resultUnit: analysis.resultUnit || "",
                                    field: analysis.field || "",
                                    matrix: analysis.matrix || sample.matrix || "",
                                    params: analysis.params || null,
                                    matrix: analysis.matrix || sample.matrix || "",
                                    params: analysis.params || null,
                                    fromParams: !!analysis.params,
                                    displayStyle: analysis.displayStyle || "",
                                };
                            });
                        };

                        const originalAnalyses = processAnalysis(sample.analyses || sample.analysis);
                        const proposalAnalyses = processAnalysis(sample.proposalAnalyses);

                        return {
                            sampleName: sample.sampleName,
                            matrix: sample.matrix || "",
                            sampleInformation: sample.sampleInformation || [],
                            analysis: originalAnalyses, // Default to original
                            originalAnalyses: originalAnalyses,
                            proposalAnalyses: proposalAnalyses,
                            activeAnalysisMode: "default", // 'default' or 'propose'
                        };
                    }),
                };

                setCrmData(transformedData);
                setError(null);

                // Set deadline if it exists in the response
                if (response.data.deadline) {
                    setDeadline(response.data.deadline);
                }

                // Load sample information from API response
                if (response.data.samples) {
                    const loadedCustomerInfo = {};
                    response.data.samples.forEach((sample, index) => {
                        if (sample.sampleInformation && Array.isArray(sample.sampleInformation) && sample.sampleInformation.length > 0) {
                            // Use API data if available
                            loadedCustomerInfo[index] = sample.sampleInformation.map((info) => ({
                                fname: info.fname || "",
                                fvalue: info.fvalue || "",
                            }));
                        }
                    });
                    // Only set customerInfo if there's data
                    if (Object.keys(loadedCustomerInfo).length > 0) {
                        setCustomerInfo(loadedCustomerInfo);
                    }
                }

                // Set defaultSampleInformation based on response
                if (response.data.defaultSampleInformation !== undefined) {
                    setDefaultSampleInformation(response.data.defaultSampleInformation);
                }

                // Initialize urgent samples state
                const initialUrgentState = {};
                transformedData.samples.forEach((_, index) => {
                    initialUrgentState[index] = false;
                });
                setUrgentSamples(initialUrgentState);
            } else {
                // If response structure is unexpected
                setError("Không thể lấy dữ liệu. Vui lòng kiểm tra mã đơn hàng.");
                setCrmData(null);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setError(error.response?.data?.message || "Không thể lấy dữ liệu. Vui lòng kiểm tra mã đơn hàng.");
            setCrmData(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle the "all samples urgent" checkbox
    const handleAllUrgentChange = (e) => {
        const checked = e.target.checked;
        setAllUrgent(checked);

        // Create a new object with all samples set to the checked value
        const newUrgentSamples = {};
        if (crmData && crmData.samples) {
            crmData.samples.forEach((_, index) => {
                newUrgentSamples[index] = checked;
            });
        }
        setUrgentSamples(newUrgentSamples);
    };

    // Handle individual sample urgent checkbox
    const handleUrgentChange = (index, checked) => {
        setUrgentSamples((prev) => ({
            ...prev,
            [index]: checked,
        }));
    };

    // Handle deleting a sample
    const handleDeleteSample = (index) => {
        if (!crmData) return;

        const updatedSamples = [...crmData.samples];
        updatedSamples.splice(index, 1);

        // Update crmData with the modified samples array
        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });

        // Update the urgentSamples state to reflect the deletion
        const newUrgentSamples = {};
        updatedSamples.forEach((_, idx) => {
            // If index is less than deleted index, keep value
            // If index is >= deleted index, take value from original index + 1
            if (idx < index) {
                newUrgentSamples[idx] = urgentSamples[idx];
            } else {
                newUrgentSamples[idx] = urgentSamples[idx + 1] || false;
            }
        });

        setUrgentSamples(newUrgentSamples);
    };

    // Handle deleting an analysis item
    const handleDeleteAnalysis = (sampleIndex, analysisIndex) => {
        if (!crmData) return;

        const updatedSamples = [...crmData.samples];
        const updatedAnalysis = [...updatedSamples[sampleIndex].analysis];

        updatedAnalysis.splice(analysisIndex, 1);

        updatedSamples[sampleIndex] = {
            ...updatedSamples[sampleIndex],
            analysis: updatedAnalysis,
            analyses: updatedAnalysis,
        };

        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });
    };
    const handleCreateReceipt = async () => {
        if (!crmData) return;

        // Check if deadline is selected
        if (!deadline) {
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: "Vui lòng chọn Hạn trả kết quả!",
            });
            return;
        }

        setIsCreating(true); // Add status property to samples based on urgentSamples state and ensure all analysis items have required properties
        const samplesWithStatus = crmData.samples.map((sample, index) => {
            // Make sure each analysis has all required properties
            const updatedAnalyses = sample.analysis.map((item) => ({
                parameterId: item.parameterId || "",
                parameterName: item.parameterName || "",
                protocolSource: item.protocolSource || "",
                protocolCode: item.protocolCode || "",
                matrix: item.matrix || sample.matrix || "",
                field: item.field || "",
                resultUnit: item.resultUnit || "",
                // Keep any other properties that might be present
                ...item,
            }));

            // Prepare sample information by combining custom customer and receipt info
            let sampleInformation = [];

            // Add customer information if exists
            if (customerInfo[index] && customerInfo[index].length > 0) {
                const processedCustomerInfo = customerInfo[index].map((field) => ({
                    fname: field.fname === "Khác" ? field.other || "" : field.fname,
                    fvalue: field.fvalue || "",
                }));
                sampleInformation = [...sampleInformation, ...processedCustomerInfo];
            } else {
                // Default customer information if none provided
                sampleInformation.push({
                    fname: "Tên mẫu thử / name.",
                    fvalue: sample?.sampleName || "",
                });
            }

            // Always add default receipt information
            sampleInformation.push(
                {
                    fname: "Ngày tiếp nhận / receipt date.",
                    fvalue: new Date().toLocaleDateString("vi-VN"),
                },
                { fname: "Ngày thử nghiệm / test date.", fvalue: "" },
                {
                    fname: "Mô tả / desc.",
                    fvalue: sample?.sampleDescription || "",
                },
            );

            return {
                sampleName: sample.sampleName,
                matrix: sample.matrix,
                sampleInformation: sampleInformation,
                status: urgentSamples[index] ? 1 : 0,
                purpose: selectedPurpose, // Add purpose to each sample
                analyses: updatedAnalyses,
            };
        });
        try {
            // Check auth cookies before making API call
            if (!hasAuthCookies()) {
                setIsCreating(false);
                return; // hasAuthCookies will handle redirect
            }
            const payload = {
                client: crmData.client,
                contactPerson: crmData.contact,
                reportRecipient: receiverInfo,
                samples: samplesWithStatus,
                orderId: crmData.orderId,
                quoteId: crmData.quoteId,
                salePerson: crmData.salePerson,
                totalFeeBeforeTax: crmData.totalFeeBeforeTax,
                totalAmount: crmData.totalAmount,
                deadline: deadline, // Add deadline to payload
            };

            const response = await apiPost("https://red.irdop.org/v1/receipt/create/full", payload); // Check if the response contains an error
            if (response && response.data && response.data.error) {
                setError(response.data.message || "Đã xảy ra lỗi khi tạo tiếp nhận mẫu.");
            } else if (response && response.data) {
                // Close modal and show notification before navigation
                closeModal();

                // Reset customer info after successful creation
                setCustomerInfo({});
                setEditingSampleInfo({ sampleIndex: null, isEditing: false });

                // Show brief notification and navigate after delay
                await showBriefNotification("Tạo tiếp nhận mẫu thành công!");
                navigate(`/dashboard/receipt?receiptId=${response.data.receiptId}`);
            }
        } catch (error) {
            console.error("Error creating receipt:", error);
            setError(error.response?.data?.message || "Không thể tạo tiếp nhận mẫu. Vui lòng thử lại sau.");
        } finally {
            setIsCreating(false);
        }
    }; // Function to handle creating and downloading request form with timeout
    const handleCreateRequestForm = async () => {
        if (!crmData) return;

        try {
            setIsCreating(true);

            // Show loading notification
            showBriefNotification("Đang tạo phiếu yêu cầu...", "info");
            // Prepare request data with sample_information included in each sample
            const samplesWithInfo = crmData.samples.map((sample, index) => {
                // Prepare sample information by combining custom customer and receipt info
                let sampleInformation = [];

                // Add customer information if exists
                if (customerInfo[index] && customerInfo[index].length > 0) {
                    const processedCustomerInfo = customerInfo[index].map((field) => ({
                        fname: field.fname === "Khác" ? field.other || "" : field.fname,
                        fvalue: field.fvalue || "",
                    }));
                    sampleInformation = [...sampleInformation, ...processedCustomerInfo];
                } else {
                    // Default customer information if none provided
                    sampleInformation.push({
                        fname: "Tên mẫu thử / name.",
                        fvalue: sample?.sampleName || "",
                    });
                }

                // Always add default receipt information
                sampleInformation.push(
                    {
                        fname: "Ngày tiếp nhận / receipt date.",
                        fvalue: new Date().toLocaleDateString("vi-VN"),
                    },
                    { fname: "Ngày thử nghiệm / test date.", fvalue: "" },
                    {
                        fname: "Mô tả / desc.",
                        fvalue: sample?.sampleDescription || "",
                    },
                );

                return {
                    ...sample,
                    sampleInformation: sampleInformation,
                };
            });
            const requestData = {
                ...crmData,
                samples: samplesWithInfo,
                createdAt: new Date().toISOString(),
                createdById: currentUser.identity_uid,
                ...(deadline && { deadline: deadline }), // Add deadline if selected
            };

            // Create a promise that will be rejected after timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Request timed out after 10 seconds")), 10000);
            });

            // Specify Excel MIME type explicitly
            const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

            // Race between the actual request and the timeout
            const response = await Promise.race([
                fetch("https://red.irdop.org/v1/excel/request_form", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    body: JSON.stringify(requestData),
                }),
                timeoutPromise,
            ]);

            if (response.ok) {
                // Get the blob directly from the response
                const blob = await response.blob();

                // Create a new blob with explicit type to ensure correct handling
                const excelBlob = new Blob([blob], { type: excelMimeType });

                // Create a URL for the blob
                const url = window.URL.createObjectURL(excelBlob);

                // For IE/Edge browsers
                if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                    window.navigator.msSaveOrOpenBlob(excelBlob, `Phieu_Yeu_Cau_${crmData.orderId || "CRM"}.xlsx`);
                } else {
                    // For modern browsers
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute("download", `Phieu_Yeu_Cau_${crmData.orderId || "CRM"}.xlsx`);
                    link.style.display = "none";

                    // Append to body, click and remove
                    document.body.appendChild(link);
                    link.click();

                    // Clean up after a short delay to ensure download starts
                    setTimeout(() => {
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                    }, 200);
                } // Show success message and close modal
                await showBriefNotification("Đã tạo phiếu yêu cầu thành công!");

                // Reset customer info after successful creation
                setCustomerInfo({});
                setEditingSampleInfo({ sampleIndex: null, isEditing: false });

                closeModal();
            } else {
                // Handle HTTP errors
                console.error("Error downloading file:", response.status, response.statusText);
                Swal.fire({
                    icon: "error",
                    title: "Lỗi",
                    text: `Không thể tạo phiếu yêu cầu (${response.status}). Vui lòng thử lại`,
                });
            }
        } catch (error) {
            console.error("Error creating request form:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: error.message === "Request timed out after 10 seconds" ? "Yêu cầu đã quá thời gian chờ. Vui lòng thử lại sau!" : "Không thể tạo phiếu yêu cầu. Vui lòng thử lại sau!",
            });
        } finally {
            setIsCreating(false);
        }
    };

    // New function to show brief notification before navigation
    const showBriefNotification = (message, icon = "success") => {
        return new Promise((resolve) => {
            const Toast = Swal.mixin({
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 500, // Show for 0.5 seconds
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener("mouseenter", Swal.stopTimer);
                    toast.addEventListener("mouseleave", Swal.resumeTimer);
                },
                customClass: {
                    popup: `colored-toast swal2-icon-${icon}`,
                },
            });

            Toast.fire({
                icon: icon,
                title: message,
            }).then(() => {
                resolve();
            });
        });
    };

    // Function to toggle analysis mode
    const toggleAnalysisMode = (sampleIndex) => {
        if (!crmData) return;

        const updatedSamples = [...crmData.samples];
        const sample = updatedSamples[sampleIndex];

        const newMode = sample.activeAnalysisMode === "default" ? "propose" : "default";
        const newAnalysis = newMode === "default" ? sample.originalAnalyses : sample.proposalAnalyses;

        updatedSamples[sampleIndex] = {
            ...sample,
            activeAnalysisMode: newMode,
            analysis: newAnalysis,
        };

        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });
    };

    // Function to fetch parameter suggestions
    const handleFetchSuggestions = async (sampleIndex, analysisIndex, currentParamName, event) => {
        const key = `${sampleIndex}_${analysisIndex}`;

        // If dropdown is already open for this cell, close it
        if (showSuggestionDropdown.sampleIndex === sampleIndex && showSuggestionDropdown.analysisIndex === analysisIndex) {
            setShowSuggestionDropdown({ sampleIndex: null, analysisIndex: null });
            return;
        }

        // Calculate dropdown position relative to viewport
        if (event && event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom,
                left: rect.left,
            });
        }

        // Check for cached results
        if (crmData && crmData.samples && crmData.samples[sampleIndex]) {
            const analysisItem = crmData.samples[sampleIndex].analysis[analysisIndex];
            if (analysisItem.searchCache && analysisItem.searchCache.term === currentParamName) {
                setSuggestions((prev) => ({
                    ...prev,
                    [key]: analysisItem.searchCache.results,
                }));
                setShowSuggestionDropdown({ sampleIndex, analysisIndex });
                return;
            }
        }

        setLoadingSuggestions((prev) => ({ ...prev, [key]: true }));
        setShowSuggestionDropdown({ sampleIndex, analysisIndex });

        try {
            const response = await apiPost("https://red.irdop.org/v1/param/search", {
                paramName: currentParamName,
            });

            if (response && Array.isArray(response.data)) {
                setSuggestions((prev) => ({
                    ...prev,
                    [key]: response.data,
                }));

                // Cache the results in crmData
                if (crmData) {
                    const updatedSamples = [...crmData.samples];
                    updatedSamples[sampleIndex].analysis[analysisIndex] = {
                        ...updatedSamples[sampleIndex].analysis[analysisIndex],
                        searchCache: {
                            term: currentParamName,
                            results: response.data,
                        },
                    };
                    setCrmData({ ...crmData, samples: updatedSamples });
                }
            } else {
                // Handle case where data is not an array (e.g. error object or null)
                setSuggestions((prev) => ({
                    ...prev,
                    [key]: [],
                }));
            }
        } catch (error) {
            console.error("Error fetching suggestions:", error);
            setSuggestions((prev) => ({
                ...prev,
                [key]: [],
            }));
        } finally {
            setLoadingSuggestions((prev) => ({ ...prev, [key]: false }));
        }
    };

    // Function to apply suggestion
    const handleApplySuggestion = (sampleIndex, analysisIndex, suggestion) => {
        if (!crmData) return;

        const updatedSamples = [...crmData.samples];
        const currentAnalysis = updatedSamples[sampleIndex].analysis[analysisIndex];

        // Store original parameterName if not already stored
        const originalParamName = currentAnalysis.originalParameterName || currentAnalysis.parameterName;

        updatedSamples[sampleIndex].analysis[analysisIndex] = {
            ...currentAnalysis,
            parameterId: suggestion.parameterId,
            parameterName: suggestion.parameterName,
            displayStyle: suggestion.displayStyle || "",
            originalParameterName: originalParamName,
        };

        // Also update analyses to keep them in sync
        if (updatedSamples[sampleIndex].analyses) {
            updatedSamples[sampleIndex].analyses = updatedSamples[sampleIndex].analysis;
        }

        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });

        // Close dropdown
        setShowSuggestionDropdown({ sampleIndex: null, analysisIndex: null });
    };

    // Function to reset to original parameter
    const handleResetToOriginal = (sampleIndex, analysisIndex) => {
        if (!crmData) return;

        const updatedSamples = [...crmData.samples];
        const currentAnalysis = updatedSamples[sampleIndex].analysis[analysisIndex];
        const originalName = currentAnalysis.originalParameterName || currentAnalysis.parameterName;

        updatedSamples[sampleIndex].analysis[analysisIndex] = {
            ...currentAnalysis,
            parameterName: originalName,
            parameterId: "",
        };

        // Also update analyses to keep them in sync
        if (updatedSamples[sampleIndex].analyses) {
            updatedSamples[sampleIndex].analyses = updatedSamples[sampleIndex].analysis;
        }

        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });

        // Close dropdown
        setShowSuggestionDropdown({ sampleIndex: null, analysisIndex: null });
    };

    // Function to apply all suggestions
    const handleApplyAllSuggestions = (sampleIndex, analysisIndex, suggestionsList) => {
        if (!crmData || !suggestionsList || suggestionsList.length === 0) return;

        const updatedSamples = [...crmData.samples];
        const currentAnalysis = updatedSamples[sampleIndex].analysis[analysisIndex];

        // Store original parameterName if not already stored
        const originalParamName = currentAnalysis.originalParameterName || currentAnalysis.parameterName;

        // Create new rows for ALL suggestions (including current row)
        const newRows = suggestionsList.map((suggestion) => ({
            ...currentAnalysis,
            parameterId: suggestion.parameterId,
            parameterName: suggestion.parameterName,
            displayStyle: suggestion.displayStyle || "",
            originalParameterName: originalParamName,
        }));

        // Insert new rows after the current index
        updatedSamples[sampleIndex].analysis.splice(analysisIndex + 1, 0, ...newRows);

        // Also update analyses to keep them in sync
        if (updatedSamples[sampleIndex].analyses) {
            updatedSamples[sampleIndex].analyses = updatedSamples[sampleIndex].analysis;
        }

        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });

        // Close dropdown
        setShowSuggestionDropdown({ sampleIndex: null, analysisIndex: null });
    };

    // Function to search all analyses in current sample
    const handleSearchAllInSample = async (sampleIndex) => {
        if (!crmData || !crmData.samples[sampleIndex]) return;

        const sample = crmData.samples[sampleIndex];
        for (let i = 0; i < sample.analysis.length; i++) {
            const analysis = sample.analysis[i];
            const paramName = analysis.originalParameterName || analysis.parameterName;
            await handleFetchSuggestions(sampleIndex, i, paramName);
        }
    };

    // Function to search all analyses in all samples
    const handleSearchAllSamples = async () => {
        if (!crmData) return;

        for (let sampleIdx = 0; sampleIdx < crmData.samples.length; sampleIdx++) {
            const sample = crmData.samples[sampleIdx];
            for (let analysisIdx = 0; analysisIdx < sample.analysis.length; analysisIdx++) {
                const analysis = sample.analysis[analysisIdx];
                const paramName = analysis.originalParameterName || analysis.parameterName;
                await handleFetchSuggestions(sampleIdx, analysisIdx, paramName);
            }
        }
    };

    // Function to select default params for all analysis in a sample
    const handleSelectDefaultParams = (sampleIndex) => {
        if (!crmData) return;

        const updatedSamples = [...crmData.samples];
        const sample = updatedSamples[sampleIndex];

        const updatedAnalysis = sample.analysis.map((item) => {
            if (item.params && item.params.default) {
                return {
                    ...item,
                    parameterId: "", // Reset to default
                    parameterName: item.params.default.parameterName,
                };
            }
            return item;
        });

        updatedSamples[sampleIndex] = {
            ...sample,
            analysis: updatedAnalysis,
        };

        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });
    };

    // Open parameter selection modal
    const handleOpenAddParameter = (sampleIndex) => {
        setCurrentSampleIndex(sampleIndex);
        setIsAddingParameter(true);
        setSelectedParameters([]);
        setSearchTerm("");
        setParameterList([]);
        setCurrentPage(1);
    };

    // Handle search input
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        if (typingTimeout) clearTimeout(typingTimeout);
        if (e.target.value.length > 2) {
            const timeout = setTimeout(() => {
                if (e.target.value.trim() !== "") {
                    searchParameters(e.target.value);
                }
            }, 500);

            setTypingTimeout(timeout);
        }
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter" && searchTerm.length >= 2) {
            if (typingTimeout) clearTimeout(typingTimeout);
            searchParameters(searchTerm);
        }
    };

    // Select a parameter
    const handleParameterSelect = (parameter) => {
        if (!selectedParameters.some((p) => p.id === parameter.id)) {
            setSelectedParameters([
                ...selectedParameters,
                {
                    ...parameter,
                    parameterId: parameter.parameterId || "",
                },
            ]);
        }
        setSearchTerm(""); // Clear the search input
    };

    // Remove a selected parameter
    const handleRemoveParameter = (index) => {
        const updatedParameters = selectedParameters.filter((_, i) => i !== index);
        setSelectedParameters(updatedParameters);
    };

    // Confirm and add parameters to the sample
    const handleConfirmAddParameter = () => {
        if (currentSampleIndex === null || selectedParameters.length === 0) {
            return;
        }

        // Create a copy of the samples array
        const updatedSamples = [...crmData.samples];

        // Add the selected parameters to the current sample's analysis
        updatedSamples[currentSampleIndex] = {
            ...updatedSamples[currentSampleIndex],
            analysis: [
                ...updatedSamples[currentSampleIndex].analysis,
                ...selectedParameters.map((param) => ({
                    parameterId: param.id,
                    parameterName: param.parameterName,
                    parameterId: param.parameterId || "",
                    matrix: param.matrix || updatedSamples[currentSampleIndex].matrix,
                    protocolCode: param.protocolCode,
                    protocolSource: param.protocolSource || "IRDOP",
                    resultUnit: param.resultUnit || "",
                })),
            ],
        };

        // Update the crmData state
        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });

        // Close the modal
        setIsAddingParameter(false);
        setSelectedParameters([]);
    };

    // Cancel adding parameters
    const handleCancelAddParameter = () => {
        setIsAddingParameter(false);
        setSelectedParameters([]);
    };

    // Add this function for rendering the parameter selection modal
    const renderAddParameterModal = () => {
        const paginatedParameters = parameterList.slice((currentPage - 1) * 5, currentPage * 5);

        const handlePageChange = (page) => {
            setCurrentPage(page);
        };

        const renderPageButtons = () => {
            const totalPages = Math.ceil(parameterList.length / 5);
            const pageButtons = [];

            if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) {
                    pageButtons.push(
                        <button key={i} className={`p-2 ${currentPage === i ? "bg-gray-300" : "bg-white"}`} onClick={() => handlePageChange(i)}>
                            {i}
                        </button>,
                    );
                }
            } else {
                if (currentPage > 2) {
                    pageButtons.push(
                        <button key={1} className={`p-2 ${currentPage === 1 ? "bg-gray-300" : "bg-white"}`} onClick={() => handlePageChange(1)}>
                            1
                        </button>,
                    );
                    if (currentPage > 3) {
                        pageButtons.push(<span key="dots1">...</span>);
                    }
                }

                const startPage = Math.max(2, currentPage - 1);
                const endPage = Math.min(totalPages - 1, currentPage + 1);

                for (let i = startPage; i <= endPage; i++) {
                    pageButtons.push(
                        <button key={i} className={`p-2 ${currentPage === i ? "bg-gray-300" : "bg-white"}`} onClick={() => handlePageChange(i)}>
                            {i}
                        </button>,
                    );
                }

                if (currentPage < totalPages - 2) {
                    if (currentPage < totalPages - 3) {
                        pageButtons.push(<span key="dots2">...</span>);
                    }
                    pageButtons.push(
                        <button key={totalPages} className={`p-2 ${currentPage === totalPages ? "bg-gray-300" : "bg-white"}`} onClick={() => handlePageChange(totalPages)}>
                            {totalPages}
                        </button>,
                    );
                }
            }

            return pageButtons;
        };

        return (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50" onClick={() => setIsAddingParameter(false)}>
                <div className="bg-white p-4 rounded-lg w-[90%] md:w-[70%] xl:w-[50%] h-3/5 max-w-[700px] min-h-[400px] max-h-[700px] relative" onClick={(e) => e.stopPropagation()}>
                    <div className="w-full h-full relative flex flex-col justify-between overflow-auto">
                        <div>
                            <h2 className="text-2xl font-semibold mb-4">Thêm chỉ tiêu kiểm nghiệm</h2>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onKeyDown={handleSearchKeyDown}
                                className="w-full p-2 border rounded mb-4 bg-white focus:outline-none focus:border-purple-500"
                                placeholder="Tìm kiếm chỉ tiêu..."
                            />

                            {searchTerm.length > 1 && (
                                <div className="absolute bg-white border rounded w-full max-h-72 overflow-y-auto mb-4 z-10">
                                    <ul>
                                        {paginatedParameters.map((parameter, index) => (
                                            <li key={index} className="p-2 border-b cursor-pointer hover:bg-gray-200" onClick={() => handleParameterSelect(parameter)}>
                                                <div>
                                                    <p className="text-start text-xs font-medium w-full line-clamp-1">Nền mẫu: {parameter.matrix}</p>
                                                    <p className="text-start text-primary font-medium w-full line-clamp-1">{parameter.parameterName}</p>
                                                    <p className="text-start text-text-secondary w-full line-clamp-1">
                                                        {parameter.protocolCode}
                                                        {parameter?.accreditation && <b>{` (${parameter.accreditation})`}</b>}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="flex justify-center mt-2">{renderPageButtons()}</div>
                                </div>
                            )}
                        </div>
                        <div className="mb-4 h-full flex overflow-y-auto text-sm flex-wrap content-start">
                            {selectedParameters.map((parameter, index) => (
                                <div key={index} className="p-1 border rounded mb-2 flex text-start items-center w-fit h-fit mr-1 max-w-68">
                                    <div>
                                        <p className="text-xs font-medium w-full line-clamp-1">Nền mẫu: {parameter.matrix}</p>
                                        <p className="text-primary font-medium w-full line-clamp-1">{parameter.parameterName}</p>
                                        <p className="text-start text-text-secondary w-full line-clamp-1">
                                            {parameter.protocolCode}
                                            {parameter?.accreditation && <b>{` (${parameter.accreditation})`}</b>}
                                        </p>
                                    </div>

                                    <button className="text-red-500 px-2 py-3 ml-1" onClick={() => handleRemoveParameter(index)}>
                                        <FaTrashAlt />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button className="bg-gray-500 text-white p-2 rounded mr-2" onClick={handleCancelAddParameter}>
                                Hủy bỏ
                            </button>
                            <button className="bg-green-500 text-white p-2 rounded" onClick={handleConfirmAddParameter} disabled={selectedParameters.length === 0}>
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Add new functions for inline editing
    const startEditing = (type, field, value, index = null) => {
        setEditingField({ type, field, index });
        setEditValue(value);
    };

    const handleEditChange = (e) => {
        setEditValue(e.target.value);
    };
    const saveEdit = () => {
        if (editingField.type === "client") {
            // Handle contact fields
            if (editingField.field === "contact_name" || editingField.field === "contact_phone" || editingField.field === "contact_email") {
                const contactField = editingField.field.replace("contact_", ""); // Remove 'contact_' prefix
                setCrmData({
                    ...crmData,
                    contact: {
                        ...crmData.contact,
                        [contactField]: editValue,
                    },
                });
            } else {
                // Update client information
                setCrmData({
                    ...crmData,
                    client: {
                        ...crmData.client,
                        [editingField.field]: editValue,
                    },
                });
            }
        } else if (editingField.type === "sample") {
            // Update sample name
            const updatedSamples = [...crmData.samples];
            updatedSamples[editingField.index] = {
                ...updatedSamples[editingField.index],
                sampleName: editValue,
            };
            setCrmData({
                ...crmData,
                samples: updatedSamples,
            });
        }
        // Reset editing state
        setEditingField({ type: null, field: null, index: null });
    };

    const cancelEdit = () => {
        setEditingField({ type: null, field: null, index: null });
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            saveEdit();
        } else if (e.key === "Escape") {
            cancelEdit();
        }
    };

    // Handle the matrix change for a specific sample
    const handleMatrixChange = (index, value) => {
        if (!crmData) return;

        const updatedSamples = [...crmData.samples];
        updatedSamples[index] = {
            ...updatedSamples[index],
            matrix: value,
        };

        setCrmData({
            ...crmData,
            samples: updatedSamples,
        });
    }; // Handle matrix input completion (on Enter key or blur)
    const handleMatrixComplete = async (index, matrixParam) => {
        if (!crmData) return;

        const sample = crmData.samples[index];
        const matrix = matrixParam !== undefined ? matrixParam : sample.matrix;

        if (!matrix) return;
        try {
            // Check auth cookies before making API call
            if (!hasAuthCookies()) {
                return; // hasAuthCookies will handle redirect
            }

            // First ensure the sample matrix is correctly set in state
            const updatedSamples = [...crmData.samples];
            updatedSamples[index] = {
                ...updatedSamples[index],
                matrix: matrix,
            };

            // Update the sample matrix value first before any API call
            setCrmData({
                ...crmData,
                samples: updatedSamples,
            });

            // Also make sure the input field displays the correct value
            const inputField = document.getElementById(`matrix-${index}`);
            if (inputField && inputField.value !== matrix) {
                inputField.value = matrix;
            }

            // Create list of analyses with their parameter names and the new matrix
            const analyses = sample.analysis.map((item) => ({
                analysis: item.parameterName,
                matrix: matrix,
            }));

            // Send API request to match analyses with matrix
            const response = await apiPost("https://red.irdop.org/v1/analysis/match/parameter", {
                analyses,
            });

            // Update the sample with the response data
            if (response && response.data) {
                updatedSamples[index] = {
                    ...updatedSamples[index],
                    matrix: matrix, // Ensure matrix value is preserved
                    analysis: response.data,
                };

                setCrmData({
                    ...crmData,
                    samples: updatedSamples,
                });
            }
        } catch (error) {
            console.error("Error updating analyses based on matrix:", error);
        }
    };
    // Search parameters
    const searchParameters = async (query) => {
        try {
            // Check auth cookies before making API call
            if (!hasAuthCookies()) {
                return; // hasAuthCookies will handle redirect
            }

            const response = await apiPost("https://black.irdop.org/ha8i0uw2/db/search/parameter", {
                query,
                matrix: crmData.samples[currentSampleIndex]?.matrix || "",
            });
            if (response && response.data) {
                setParameterList(response.data);
            }
        } catch (error) {
            console.error("Error searching parameters:", error);
        }
    };

    // Function to start editing analysis cell
    const startEditingAnalysis = (sampleIndex, analysisIndex, field, value) => {
        setEditingAnalysis({ sampleIndex, analysisIndex, field });
        setEditAnalysisValue(value || "");
    };

    // Function to handle analysis edit change
    const handleAnalysisEditChange = (e) => {
        setEditAnalysisValue(e.target.value);
    };
    // Function to save analysis edit
    const saveAnalysisEdit = () => {
        const { sampleIndex, analysisIndex, field } = editingAnalysis;
        if (sampleIndex === null || analysisIndex === null || !field) return;

        // Don't set the value if it's '--'
        if (editAnalysisValue !== "--") {
            const updatedSamples = [...crmData.samples];

            // Handle special case for ex_info fields
            if (field === "ex_name" || field === "send_at") {
                const currentAnalysis = updatedSamples[sampleIndex].analysis[analysisIndex];
                const currentExInfo = currentAnalysis.ex_info || {};

                updatedSamples[sampleIndex].analysis[analysisIndex] = {
                    ...currentAnalysis,
                    ex_info: {
                        ...currentExInfo,
                        [field]: editAnalysisValue,
                    },
                };
            } else {
                // Regular field updates
                updatedSamples[sampleIndex].analysis[analysisIndex] = {
                    ...updatedSamples[sampleIndex].analysis[analysisIndex],
                    [field]: editAnalysisValue,
                };

                // If editing parameterName manually, remove fromParams flag and selectedParamId
                if (field === "parameterName") {
                    delete updatedSamples[sampleIndex].analysis[analysisIndex].fromParams;
                    delete updatedSamples[sampleIndex].analysis[analysisIndex].selectedParamId;
                }
            }

            setCrmData({
                ...crmData,
                samples: updatedSamples,
            });
        }

        // Reset editing state
        setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
    };

    // Function to cancel analysis edit
    const cancelAnalysisEdit = () => {
        setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
    };

    // Function to handle key events for analysis edit
    const handleAnalysisKeyDown = (e) => {
        if (e.key === "Enter") {
            saveAnalysisEdit();
        } else if (e.key === "Escape") {
            cancelAnalysisEdit();
        }
    };

    // Add state for matrix dropdown
    const [uniqueMatrices, setUniqueMatrices] = useState([]);
    const [matrixInput, setMatrixInput] = useState("");
    const [showMatrixDropdown, setShowMatrixDropdown] = useState(false);
    const [matrixPage, setMatrixPage] = useState(1);
    const itemsPerPage = 10;
    const [currentEditingMatrixIndex, setCurrentEditingMatrixIndex] = useState(null);
    const skipBlurRef = useRef(false);
    // Fetch matrices for dropdown
    useEffect(() => {
        const fetchMatrices = async () => {
            try {
                // Check auth cookies before making API call
                if (!hasAuthCookies()) {
                    return; // hasAuthCookies will handle redirect
                }

                // Fetch matrices from API
                const matricesResponse = await apiGet("https://black.irdop.org/get/list_enum/matrix");
                if (matricesResponse && matricesResponse.data && Array.isArray(matricesResponse.data)) {
                    setUniqueMatrices(matricesResponse.data.filter(Boolean));
                }
            } catch (error) {
                console.error("Error fetching matrix list:", error);
            }
        };

        fetchMatrices();
    }, []);

    // Sync crmData to input states
    useEffect(() => {
        if (crmData) {
            setClientInfo({
                clientName: crmData.client?.clientName || "",
                clientAddress: crmData.client?.clientAddress || "",
                legalId: crmData.client?.legalId || "",
                clientPhone: crmData.client?.clientPhone || "",
                invoiceEmail: crmData.client?.invoiceEmail || "",
                invoiceInfo: crmData.client?.invoiceInfo || "",
            });
            setContactInfo({
                name: crmData.contact?.name || "",
                phone: crmData.contact?.phone || "",
                email: crmData.contact?.email || "",
                id: crmData.contact?.id || "",
                id_date: crmData.contact?.id_date || "",
                id_place: crmData.contact?.id_place || "",
            });
            setReceiverInfo({
                name: crmData.receiver?.name || "",
                address: crmData.receiver?.address || "",
                email: crmData.receiver?.email || "",
                other: crmData.receiver?.other || "",
            });
        }
    }, [crmData]);

    // Handle client info input changes
    const handleClientInfoChange = (field, value) => {
        const updatedClientInfo = { ...clientInfo, [field]: value };
        setClientInfo(updatedClientInfo);

        // Update crmData immediately
        setCrmData((prev) => ({
            ...prev,
            client: {
                ...prev.client,
                [field]: value,
            },
        }));
    };

    // Handle contact info input changes
    const handleContactInfoChange = (field, value) => {
        const updatedContactInfo = { ...contactInfo, [field]: value };
        setContactInfo(updatedContactInfo);

        // Update crmData immediately
        setCrmData((prev) => ({
            ...prev,
            contact: {
                ...prev.contact,
                [field]: value,
            },
        }));
    };

    // Handle receiver info input changes
    const handleReceiverInfoChange = (field, value) => {
        const updatedReceiverInfo = { ...receiverInfo, [field]: value };
        setReceiverInfo(updatedReceiverInfo);

        // Update crmData immediately
        setCrmData((prev) => ({
            ...prev,
            receiver: {
                ...prev.receiver,
                [field]: value,
            },
        }));
    };

    // Handle deadline change - convert to GMT+7 at 7 AM
    const handleDeadlineChange = (dateValue) => {
        if (!dateValue) {
            setDeadline("");
            return;
        }

        // Create a date object with the selected date at 7 AM GMT+7
        const selectedDate = new Date(dateValue);
        selectedDate.setHours(7, 0, 0, 0); // Set to 7:00:00 AM

        // Convert to ISO string for GMT+7 timezone
        const vietnamOffset = 7 * 60; // GMT+7 in minutes
        const localOffset = selectedDate.getTimezoneOffset(); // Local timezone offset in minutes
        const totalOffset = vietnamOffset + localOffset; // Total offset to add

        const gmtPlus7Date = new Date(selectedDate.getTime() + totalOffset * 60000);
        const isoString = gmtPlus7Date.toISOString();

        setDeadline(isoString);
    };

    // Filter matrices based on input
    const filterMatrices = (input) => {
        if (!input || input.length < 2) return []; // Only show suggestions with 2+ characters
        return uniqueMatrices.filter((matrix) => matrix && matrix.toLowerCase().includes((input || "").toLowerCase()));
    };

    // Get paginated results for dropdown
    const getPaginatedMatrices = (input) => {
        const filtered = filterMatrices(input);
        return filtered.slice((matrixPage - 1) * itemsPerPage, matrixPage * itemsPerPage);
    };
    // Pagination handler
    const handleMatrixPageChange = (pageNumber) => {
        setMatrixPage(pageNumber);
    };

    // Functions to handle sample information editing
    const handleAddCustomerField = (sampleIndex) => {
        const updatedCustomerInfo = { ...customerInfo };
        if (!updatedCustomerInfo[sampleIndex]) {
            // Initialize with empty array or sample name only
            updatedCustomerInfo[sampleIndex] = [];
        }
        updatedCustomerInfo[sampleIndex] = [...updatedCustomerInfo[sampleIndex], { fname: "", fvalue: "" }];
        setCustomerInfo(updatedCustomerInfo);
    };
    const handleCustomerFieldChange = (sampleIndex, fieldIndex, field, value) => {
        const updatedCustomerInfo = { ...customerInfo };

        // Initialize with empty array if not exists
        if (!updatedCustomerInfo[sampleIndex]) {
            updatedCustomerInfo[sampleIndex] = [];
        }

        if (field === "fname") {
            // For fname, directly set the value
            updatedCustomerInfo[sampleIndex][fieldIndex] = {
                ...updatedCustomerInfo[sampleIndex][fieldIndex],
                fname: value,
            };

            // If user selects 'Khác', prepare for other input
            if (value === "Khác") {
                updatedCustomerInfo[sampleIndex][fieldIndex].other = updatedCustomerInfo[sampleIndex][fieldIndex].other || "";
            } else {
                // Remove 'other' field if it exists when user selects a default field
                delete updatedCustomerInfo[sampleIndex][fieldIndex].other;
            }
        } else if (field === "other") {
            // When user types in the "other" input, only update the 'other' field
            // Keep fname as 'Khác' so the dropdown shows correctly
            updatedCustomerInfo[sampleIndex][fieldIndex] = {
                ...updatedCustomerInfo[sampleIndex][fieldIndex],
                other: value,
            };
        } else {
            updatedCustomerInfo[sampleIndex][fieldIndex] = {
                ...updatedCustomerInfo[sampleIndex][fieldIndex],
                [field]: value,
            };
        }
        setCustomerInfo(updatedCustomerInfo);
    };
    const handleDeleteCustomerField = (sampleIndex, fieldIndex) => {
        const updatedCustomerInfo = { ...customerInfo };
        if (updatedCustomerInfo[sampleIndex]) {
            updatedCustomerInfo[sampleIndex] = updatedCustomerInfo[sampleIndex].filter((_, i) => i !== fieldIndex);
        }
        setCustomerInfo(updatedCustomerInfo);
    }; // Function to toggle sample information mode
    const handleAddSampleInfoToAll = () => {
        if (!crmData || !crmData.samples) return;

        if (!defaultSampleInformation) {
            // Switch to full sample information mode - add default fields
            const updatedCustomerInfo = { ...customerInfo };

            crmData.samples.forEach((sample, index) => {
                // Keep existing fields from API if they exist, otherwise use defaults
                if (!updatedCustomerInfo[index] || updatedCustomerInfo[index].length === 0) {
                    const defaultFields = defaultCustomerFields.map((field) => ({
                        ...field,
                        fvalue: field.fname === "Tên mẫu thử / name." ? sample.sampleName || "" : field.fvalue,
                    }));
                    updatedCustomerInfo[index] = [...defaultFields];
                }
            });
            setCustomerInfo(updatedCustomerInfo);
            setDefaultSampleInformation(true);
            showBriefNotification("Đã bật chế độ thông tin mẫu đầy đủ!", "success");
        } else {
            // Switch back to default mode (clear all sample info)
            setCustomerInfo({});
            setDefaultSampleInformation(false);
            showBriefNotification("Đã tắt chế độ thông tin mẫu đầy đủ!", "success");
        }
    };

    // Function to handle loading from CRM
    const handleLoadFromCRM = async () => {
        if (!code.trim()) {
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: "Vui lòng nhập mã đơn hàng!",
            });
            return;
        }

        setIsLoading(true);
        setError(null);

        // Reset all states to default values
        setCrmData(null);
        setUrgentSamples({});
        setAllUrgent(false);
        setSelectedPurpose("");
        setDeadline("");
        setCustomerInfo({});
        setDefaultSampleInformation(false);
        setEditingField({ type: null, field: null, index: null });
        setEditingAnalysis({ sampleIndex: null, analysisIndex: null, field: null });
        setEditingSampleInfo({ sampleIndex: null, isEditing: false });
        setMatrixInput("");
        setShowMatrixDropdown(false);
        setMatrixPage(1);
        setCurrentEditingMatrixIndex(null);
        setClientInfo({
            clientName: "",
            clientAddress: "",
            legalId: "",
            clientPhone: "",
            invoiceEmail: "",
            invoiceInfo: "",
        });
        setContactInfo({
            name: "",
            phone: "",
            email: "",
            id: "",
            id_date: "",
            id_place: "",
        });
        setReceiverInfo({
            name: "",
            address: "",
            email: "",
            other: "",
        });

        try {
            // Check auth cookies before making API call
            if (!hasAuthCookies()) {
                setIsLoading(false);
                return; // hasAuthCookies will handle redirect
            }

            // Format the code before sending to API
            const formattedCode = formatCode(code);

            // Load data from CRM using the new API
            const response = await apiPost("https://red.irdop.org/v1/order/get/info", {
                orderId: formattedCode,
                loadCrm: true,
            });

            // Check if the response contains an error
            if (response && response.data && response.data.error) {
                setError(response.data.message || "Đã xảy ra lỗi khi lấy dữ liệu từ CRM.");
                setCrmData(null);
            } else if (response && response.data && response.data.samples && Array.isArray(response.data.samples)) {
                // Transform the new API response to match the expected structure
                const transformedData = {
                    orderId: response.data.orderId,
                    quoteId: response.data.quoteId, // If available in response
                    salePerson: response.data.salePerson, // If available in response
                    totalFeeBeforeTax: response.data.totalFeeBeforeTax, // If available in response
                    files: response.data.files || [],
                    totalAmount: response.data.totalAmount || 0,
                    transactions: response.data.transactions || [],
                    client: response.data.client,
                    contact: response.data.contactPerson,
                    receiver: response.data.reportRecipient,
                    samples: response.data.samples.map((sample) => {
                        // Helper function to process analysis array
                        const processAnalysis = (analysisArray) => {
                            return (analysisArray || []).map((analysis) => {
                                let currentParameterName = analysis.parameterName;
                                let currentParameterId = analysis.ParameterId || analysis.parameterId || "";

                                // Handle parameter selection if params exist
                                if (analysis.params) {
                                    if (currentParameterId && analysis.params[currentParameterId]) {
                                        currentParameterName = analysis.params[currentParameterId].parameterName;
                                    } else {
                                        const nonDefaultKeys = Object.keys(analysis.params).filter((k) => k !== "default");
                                        if (nonDefaultKeys.length > 0) {
                                            currentParameterId = nonDefaultKeys[0];
                                            currentParameterName = analysis.params[currentParameterId].parameterName;
                                        } else if (analysis.params.default) {
                                            currentParameterName = analysis.params.default.parameterName;
                                            currentParameterId = "";
                                        }
                                    }
                                }

                                return {
                                    parameterName: currentParameterName,
                                    protocolCode: analysis.protocolCode || "",
                                    parameterId: currentParameterId,
                                    protocolSource: analysis.protocolSource || "IRDOP",
                                    resultUnit: analysis.resultUnit || "",
                                    field: analysis.field || "",
                                    matrix: analysis.matrix || sample.matrix || "",
                                    params: analysis.params || null,
                                    fromParams: !!analysis.params,
                                };
                            });
                        };

                        const originalAnalyses = processAnalysis(sample.analyses || sample.analysis);
                        const proposalAnalyses = processAnalysis(sample.proposalAnalyses);

                        return {
                            sampleName: sample.sampleName,
                            matrix: sample.matrix || "",
                            sampleInformation: sample.sampleInformation || [],
                            analysis: originalAnalyses, // Default to original
                            originalAnalyses: originalAnalyses,
                            proposalAnalyses: proposalAnalyses || [],
                            activeAnalysisMode: "default", // 'default' or 'propose'
                        };
                    }),
                };

                setCrmData(transformedData);
                setError(null);

                // Load sample information from API response
                if (response.data.samples) {
                    const loadedCustomerInfo = {};
                    response.data.samples.forEach((sample, index) => {
                        if (sample.sampleInformation && Array.isArray(sample.sampleInformation) && sample.sampleInformation.length > 0) {
                            // Use API data if available
                            loadedCustomerInfo[index] = sample.sampleInformation.map((info) => ({
                                fname: info.fname || "",
                                fvalue: info.fvalue || "",
                            }));
                        }
                    });
                    // Only set customerInfo if there's data
                    if (Object.keys(loadedCustomerInfo).length > 0) {
                        setCustomerInfo(loadedCustomerInfo);
                    }
                }

                // Set defaultSampleInformation based on response
                if (response.data.defaultSampleInformation !== undefined) {
                    setDefaultSampleInformation(response.data.defaultSampleInformation);
                }

                // Initialize urgent samples state
                const initialUrgentState = {};
                transformedData.samples.forEach((_, index) => {
                    initialUrgentState[index] = false;
                });
                setUrgentSamples(initialUrgentState);

                showBriefNotification("Load từ CRM thành công!", "success");
            } else {
                // If response structure is unexpected
                setError("Không thể lấy dữ liệu từ CRM. Vui lòng kiểm tra mã đơn hàng.");
                setCrmData(null);
            }
        } catch (error) {
            console.error("Error loading CRM data:", error);
            setError(error.response?.data?.message || "Không thể lấy dữ liệu từ CRM. Vui lòng kiểm tra mã đơn hàng.");
            setCrmData(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to handle test save
    const handleTestSave = async () => {
        if (!crmData) {
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: "Không có dữ liệu để lưu!",
            });
            return;
        }

        setIsCreating(true);
        try {
            // Check auth cookies before making API call
            if (!hasAuthCookies()) {
                setIsCreating(false);
                return; // hasAuthCookies will handle redirect
            }

            // Prepare the order data
            const orderData = {
                order_code: crmData.orderId || "",
                quote_code: crmData.quoteId || "",
                sale_recorder: crmData.salePerson || "",
                client: clientInfo,
                contact: contactInfo,
                receiver: receiverInfo,
                total_amount: crmData.totalAmount || crmData.totalFeeBeforeTax || 0,
                samples: crmData.samples.map((sample, index) => {
                    // Include sample_information if it exists for this sample
                    const sampleData = { ...sample };
                    if (customerInfo[index] && customerInfo[index].length > 0) {
                        sampleData.sample_information = customerInfo[index];
                    }
                    return sampleData;
                }),
                ...(deadline && { deadline: deadline }),
                default_information: defaultSampleInformation,
            };

            const response = await apiPost("https://red.irdop.org/v1/order/update", { order: orderData });

            // Check if the response contains an error
            if (response && response.data && response.data.error) {
                setError(response.data.message || "Đã xảy ra lỗi khi lưu dữ liệu.");
            } else if (response && response.data) {
                showBriefNotification("Lưu phiếu thành công!", "success");
            }
        } catch (error) {
            console.error("Error saving test data:", error);
            setError(error.response?.data?.message || "Không thể lưu dữ liệu. Vui lòng thử lại sau.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            <button onClick={openModal} className="border-gray-300 font-medium py-0 px-2 rounded-lg w-fit bg-background text-primary">
                <div>Tạo TNM từ CRM</div>
            </button>{" "}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-50 " onClick={closeModal}></div>
                    <div className="bg-white rounded-lg p-6 w-[90vw] h-[95vh] z-10 relative flex flex-col justify-between">
                        <ErrorBoundary>
                            <div>
                                <h2 className="text-xl font-bold mb-4">Tạo tiếp nhận mẫu từ CRM</h2>
                                <style>{`
                                    .no-scrollbar::-webkit-scrollbar {
                                        display: none;
                                    }
                                    .no-scrollbar {
                                        -ms-overflow-style: none;
                                        scrollbar-width: none;
                                    }
                                `}</style>
                                <form onSubmit={handleSubmit} className="mb-4">
                                    {" "}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={code}
                                            onChange={handleCodeChange}
                                            onBlur={handleCodeBlur}
                                            placeholder="Nhập mã đơn hàng (VD: 2222 sẽ tự động thành DH0002222)"
                                            className="border p-2 rounded flex-grow bg-white"
                                            required
                                        />
                                        <button type="submit" className="bg-primary text-white p-2 rounded hover:bg-blue-700" disabled={isLoading}>
                                            {isLoading ? "Đang tìm..." : "Tìm"}
                                        </button>
                                    </div>
                                </form>{" "}
                                {error && (
                                    <div className="text-red-500 mb-4 p-3 bg-red-50 border border-red-200 rounded">
                                        <p className="font-medium">Lỗi:</p>
                                        <p>{error}</p>
                                    </div>
                                )}
                                {crmData && (
                                    <div className="flex flex-col lg:flex-row gap-4 h-[calc(95vh-200px)] overflow-hidden">
                                        {/* Left Column: Order and Customer Information */}
                                        <div className="lg:w-1/4 space-y-4 overflow-y-auto no-scrollbar">
                                            <div className="border rounded-lg p-4 text-start w-full h-fit">
                                                <h3 className="font-semibold text-lg mb-2">Thông tin đơn hàng</h3>
                                                <p>
                                                    <span className="font-medium text-gray-500">Mã đơn hàng: </span>
                                                    {crmData.orderId || "--"}
                                                </p>
                                                <p>
                                                    <span className="font-medium text-gray-500">Mã báo giá: </span>
                                                    {crmData.quoteId || "--"}
                                                </p>
                                                <p>
                                                    <span className="font-medium text-gray-500">Ghi nhận doanh số: </span>
                                                    {crmData.salePerson || "--"}
                                                </p>

                                                <p>
                                                    <span className="font-medium text-gray-500">Tổng tiền trước thuế: </span>
                                                    {crmData.totalFeeBeforeTax
                                                        ? new Intl.NumberFormat("vi-VN", {
                                                              style: "currency",
                                                              currency: "VND",
                                                          }).format(crmData.totalFeeBeforeTax)
                                                        : "--"}
                                                </p>
                                                <p>
                                                    <span className="font-medium text-gray-500">Tổng tiền sau thuế: </span>
                                                    {crmData.totalAmount
                                                        ? new Intl.NumberFormat("vi-VN", {
                                                              style: "currency",
                                                              currency: "VND",
                                                          }).format(crmData.totalAmount)
                                                        : "--"}
                                                </p>
                                                <p>
                                                    <span className="font-medium text-gray-500">Đã thanh toán: </span>
                                                    <span className="font-bold text-green-600">
                                                        {new Intl.NumberFormat("vi-VN", {
                                                            style: "currency",
                                                            currency: "VND",
                                                        }).format(crmData.transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0)}
                                                    </span>
                                                </p>
                                                {crmData.transactions && crmData.transactions.length > 0 && (
                                                    <div className="mt-2">
                                                        <span className="font-medium text-gray-500 block mb-1">Giao dịch:</span>
                                                        <ul className="text-sm list-disc pl-4 space-y-1">
                                                            {crmData.transactions.map((t, idx) => (
                                                                <li key={idx}>
                                                                    <span className="text-gray-700">{t.date}:</span>{" "}
                                                                    <span className="font-semibold text-green-600">
                                                                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(t.amount)}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {(crmData.files && crmData.files.length > 0) || crmData.orderId ? (
                                                    <div className="mt-3 border-t pt-2">
                                                        <span className="font-medium text-gray-500 block mb-1">File đính kèm:</span>
                                                        <FileColumn id={crmData.orderId} files={crmData.files} showName={true} enableModalPreview={true} allowExtract={true} showViewButton={true} />
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="border rounded-lg p-4 text-start w-full h-fit">
                                                <h3 className="font-semibold text-lg mb-2">Thông tin khách hàng</h3>
                                                <p className="mb-2">
                                                    <span className="font-medium text-gray-500">Mã khách hàng: </span>
                                                    {crmData.client.clientId || "--"}
                                                </p>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">Tên cá nhân / tổ chức</label>
                                                    <textarea
                                                        value={clientInfo.clientName}
                                                        onChange={(e) => handleClientInfoChange("clientName", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập tên cá nhân / tổ chức"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">Địa chỉ</label>
                                                    <textarea
                                                        value={clientInfo.clientAddress}
                                                        onChange={(e) => handleClientInfoChange("clientAddress", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập địa chỉ"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-1">
                                                    <label className="font-medium text-gray-500 block mb-1">Mã số thuế / CCCD</label>
                                                    <textarea
                                                        value={clientInfo.legalId}
                                                        onChange={(e) => handleClientInfoChange("legalId", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập mã số thuế / CCCD"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">Điện thoại</label>
                                                    <textarea
                                                        value={clientInfo.clientPhone}
                                                        onChange={(e) => handleClientInfoChange("clientPhone", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập số điện thoại"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">Email hóa đơn</label>
                                                    <textarea
                                                        value={clientInfo.invoiceEmail}
                                                        onChange={(e) => handleClientInfoChange("invoiceEmail", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập email hóa đơn"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-1">
                                                    <label className="font-medium text-gray-500 block mb-1">TT hóa đơn (khác)</label>
                                                    <textarea
                                                        value={clientInfo.invoiceInfo}
                                                        onChange={(e) => handleClientInfoChange("invoiceInfo", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập thông tin hóa đơn khác"
                                                        rows="3"
                                                    />
                                                </div>
                                            </div>

                                            {/* Contact Information Section */}
                                            <div className="border rounded-lg p-4 text-start w-full h-fit">
                                                <h3 className="font-semibold text-lg mb-2">Thông tin liên hệ</h3>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">Người liên hệ</label>
                                                    <textarea
                                                        value={contactInfo.name}
                                                        onChange={(e) => handleContactInfoChange("name", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập tên người liên hệ"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">Điện thoại</label>
                                                    <textarea
                                                        value={contactInfo.phone}
                                                        onChange={(e) => handleContactInfoChange("phone", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập số điện thoại"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-1">
                                                    <label className="font-medium text-gray-500 block mb-1">Email</label>
                                                    <textarea
                                                        value={contactInfo.email}
                                                        onChange={(e) => handleContactInfoChange("email", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập địa chỉ email"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">CCCD</label>
                                                    <textarea
                                                        value={contactInfo.id}
                                                        onChange={(e) => handleContactInfoChange("id", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập số CCCD"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">Ngày cấp</label>
                                                    <input
                                                        type="date"
                                                        value={contactInfo.id_date}
                                                        onChange={(e) => handleContactInfoChange("id_date", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                <div className="mb-1">
                                                    <label className="font-medium text-gray-500 block mb-1">Nơi cấp</label>
                                                    <textarea
                                                        value={contactInfo.id_place}
                                                        onChange={(e) => handleContactInfoChange("id_place", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập nơi cấp CCCD"
                                                        rows="3"
                                                    />
                                                </div>
                                            </div>

                                            {/* Receiver Information Section */}
                                            <div className="border rounded-lg p-4 text-start w-full h-fit">
                                                <h3 className="font-semibold text-lg mb-2">Thông tin người nhận</h3>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">Tên người nhận</label>
                                                    <textarea
                                                        value={receiverInfo.name}
                                                        onChange={(e) => handleReceiverInfoChange("name", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập tên người nhận (nếu khác với người liên hệ)"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-1">
                                                    <label className="font-medium text-gray-500 block mb-1">Địa chỉ người nhận</label>
                                                    <textarea
                                                        value={receiverInfo.address}
                                                        onChange={(e) => handleReceiverInfoChange("address", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập địa chỉ người nhận (nếu khác với địa chỉ khách hàng)"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="font-medium text-gray-500 block mb-1">Email KQ</label>
                                                    <textarea
                                                        value={receiverInfo.email}
                                                        onChange={(e) => handleReceiverInfoChange("email", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập email nhận kết quả"
                                                        rows="3"
                                                    />
                                                </div>

                                                <div className="mb-1">
                                                    <label className="font-medium text-gray-500 block mb-1">Khác</label>
                                                    <textarea
                                                        value={receiverInfo.other}
                                                        onChange={(e) => handleReceiverInfoChange("other", e.target.value)}
                                                        className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Nhập thông tin khác"
                                                        rows="3"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Sample List */}
                                        <div className="lg:w-3/4 overflow-y-auto no-scrollbar">
                                            <div className="w-full">
                                                {" "}
                                                <div className="flex justify-between items-center mb-2">
                                                    <h3 className="font-semibold text-lg">Danh sách mẫu</h3>{" "}
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={handleAddSampleInfoToAll}
                                                                className={`text-white text-sm rounded-lg px-3 py-1 ${
                                                                    defaultSampleInformation ? "bg-sky-500 hover:bg-sky-600" : "bg-gray-400 hover:bg-gray-500"
                                                                }`}
                                                                title="Bật/tắt thông tin đầy đủ cho tất cả mẫu"
                                                            >
                                                                {defaultSampleInformation ? "Tắt thông tin mẫu" : "Đầy đủ thông tin mẫu"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleLoadFromCRM}
                                                                className="bg-orange-500 text-white text-sm rounded-lg px-3 py-1 hover:bg-orange-600"
                                                                disabled={isLoading}
                                                            >
                                                                Load từ CRM
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <input type="checkbox" id="allUrgent" checked={allUrgent} onChange={handleAllUrgentChange} className="mr-2" />
                                                            <label htmlFor="allUrgent" className="text-sm font-medium">
                                                                Mẫu khẩn
                                                            </label>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <label htmlFor="purpose" className="text-sm font-medium mr-2">
                                                                Mục đích:
                                                            </label>
                                                            <select
                                                                id="purpose"
                                                                value={selectedPurpose}
                                                                onChange={(e) => setSelectedPurpose(e.target.value)}
                                                                className="border rounded p-1 bg-white text-sm py-0.5 border-gray-400 "
                                                            >
                                                                <option value="">--</option>
                                                                {purposes.map((purpose, idx) => (
                                                                    <option key={idx} value={purpose}>
                                                                        {purpose}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>{" "}
                                                </div>{" "}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center">
                                                        <label htmlFor="global-matrix" className="text-sm font-medium mr-2">
                                                            Nền mẫu cho tất cả:
                                                        </label>
                                                        <div className="relative inline-block">
                                                            <input
                                                                type="text"
                                                                id="global-matrix"
                                                                placeholder="Nhập nền mẫu"
                                                                className="border p-1 rounded bg-white w-60"
                                                                onChange={(e) => {
                                                                    const newValue = e.target.value;
                                                                    handleGlobalMatrixChange(newValue);
                                                                    // Show matrix suggestions when typing
                                                                    setMatrixInput(newValue);
                                                                    setMatrixPage(1); // Reset to first page when typing
                                                                    setShowMatrixDropdown(newValue.length >= 2); // Show dropdown once at least 2 chars entered
                                                                    setCurrentEditingMatrixIndex(null); // Not editing a specific sample matrix
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        setShowMatrixDropdown(false);
                                                                        applyGlobalMatrix(e.target.value);
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    setTimeout(() => {
                                                                        setShowMatrixDropdown(false);
                                                                        applyGlobalMatrix(e.target.value);
                                                                    }, 200);
                                                                }}
                                                            />
                                                            {showMatrixDropdown &&
                                                                currentEditingMatrixIndex === null &&
                                                                getPaginatedMatrices(matrixInput).length > 0 &&
                                                                createPortal(
                                                                    <div
                                                                        className="absolute bg-white border rounded shadow-lg z-[9999]"
                                                                        style={{
                                                                            width: "300px",
                                                                            top: document.getElementById("global-matrix").getBoundingClientRect().bottom + window.scrollY,
                                                                            left: document.getElementById("global-matrix").getBoundingClientRect().left + window.scrollX,
                                                                        }}
                                                                    >
                                                                        {getPaginatedMatrices(matrixInput).map((matrix, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
                                                                                onClick={() => {
                                                                                    // First update the matrix input state
                                                                                    setMatrixInput(matrix);

                                                                                    // Update all samples with the new matrix
                                                                                    handleGlobalMatrixChange(matrix);

                                                                                    // Also update the input field directly
                                                                                    const globalMatrixInput = document.getElementById("global-matrix");
                                                                                    if (globalMatrixInput) {
                                                                                        globalMatrixInput.value = matrix;
                                                                                    }

                                                                                    // Apply matrix and update analyses after a small delay to ensure state is updated
                                                                                    setTimeout(() => {
                                                                                        applyGlobalMatrix(matrix);
                                                                                    }, 100);

                                                                                    // Hide dropdown
                                                                                    setShowMatrixDropdown(false);
                                                                                }}
                                                                            >
                                                                                <p>{matrix}</p>
                                                                            </div>
                                                                        ))}
                                                                        {filterMatrices(matrixInput).length > itemsPerPage && (
                                                                            <div className="flex justify-between p-2 bg-gray-100">
                                                                                <button
                                                                                    className="px-2 py-1 border rounded disabled:opacity-50"
                                                                                    onClick={() => handleMatrixPageChange(matrixPage - 1)}
                                                                                    disabled={matrixPage === 1}
                                                                                >
                                                                                    Prev
                                                                                </button>
                                                                                <span>
                                                                                    {matrixPage}/{Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)}
                                                                                </span>
                                                                                <button
                                                                                    className="px-2 py-1 border rounded disabled:opacity-50"
                                                                                    onClick={() => handleMatrixPageChange(matrixPage + 1)}
                                                                                    disabled={matrixPage >= Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)}
                                                                                >
                                                                                    Next
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>,
                                                                    document.body,
                                                                )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center">
                                                        <label htmlFor="deadline" className="text-sm font-medium mr-2">
                                                            Hạn trả kết quả:
                                                        </label>
                                                        <input
                                                            type="date"
                                                            id="deadline"
                                                            value={deadline ? new Date(deadline).toISOString().split("T")[0] : ""}
                                                            onChange={(e) => handleDeadlineChange(e.target.value)}
                                                            className="border p-1 rounded bg-white"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-3 flex justify-end">
                                                    <button
                                                        onClick={handleSearchAllSamples}
                                                        className="border border-orange-500 bg-orange-50 text-orange-700 text-sm rounded-lg py-2 px-4 flex items-center hover:bg-orange-100 font-medium"
                                                        title="Tìm kiếm cho tất cả chỉ tiêu trong tất cả mẫu"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                        Tìm kiếm tất cả mẫu
                                                    </button>
                                                </div>
                                                <div className="overflow-y-auto max-h-fit pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mb-10">
                                                    {crmData.samples.map((sample, index) => (
                                                        <div key={index} className="mb-4 p-2 border rounded w-full">
                                                            <div className="flex justify-between items-center">
                                                                {editingField.type === "sample" && editingField.index === index ? (
                                                                    <div className="flex-1 mr-2">
                                                                        <input
                                                                            type="text"
                                                                            value={editValue}
                                                                            onChange={handleEditChange}
                                                                            onKeyDown={handleKeyDown}
                                                                            onBlur={saveEdit}
                                                                            autoFocus
                                                                            className="w-full border p-1 rounded bg-white font-medium text-lg"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <h2
                                                                        className="font-medium text-start text-lg cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded"
                                                                        onClick={() => startEditing("sample", "sampleName", sample.sampleName, index)}
                                                                        title="Nhấn để chỉnh sửa tên mẫu"
                                                                    >
                                                                        {sample.sampleName}
                                                                    </h2>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDeleteSample(index)}
                                                                    className="text-red-500 hover:border hover:border-red-500 rounded-full w-5 h-5 flex items-center justify-center"
                                                                    title="Xóa mẫu"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                            <div className="mb-2 flex items-center justify-between">
                                                                <div className="relative">
                                                                    <label htmlFor={`matrix-${index}`} className="text-sm font-medium w-20 mr-2">
                                                                        Nền mẫu:
                                                                    </label>
                                                                    <div className="relative inline-block">
                                                                        <input
                                                                            type="text"
                                                                            id={`matrix-${index}`}
                                                                            value={sample.matrix || ""}
                                                                            onChange={(e) => {
                                                                                const newValue = e.target.value;
                                                                                handleMatrixChange(index, newValue);
                                                                                // Show matrix suggestions when typing
                                                                                setMatrixInput(newValue);
                                                                                setMatrixPage(1); // Reset to first page when typing
                                                                                setShowMatrixDropdown(newValue.length >= 2); // Show dropdown once at least 2 chars entered
                                                                                setCurrentEditingMatrixIndex(index); // Track which matrix field is being edited
                                                                            }}
                                                                            onBlur={() => {
                                                                                setTimeout(() => {
                                                                                    if (!showMatrixDropdown && !skipBlurRef.current) {
                                                                                        handleMatrixComplete(index);
                                                                                    }
                                                                                    setShowMatrixDropdown(false);
                                                                                }, 200);
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter") {
                                                                                    setShowMatrixDropdown(false);
                                                                                    handleMatrixComplete(index);
                                                                                }
                                                                            }}
                                                                            className="border p-1 rounded bg-white w-60"
                                                                        />
                                                                        {showMatrixDropdown &&
                                                                            currentEditingMatrixIndex === index &&
                                                                            getPaginatedMatrices(matrixInput).length > 0 &&
                                                                            createPortal(
                                                                                <div
                                                                                    className="absolute bg-white border rounded shadow-lg z-[9999]"
                                                                                    style={{
                                                                                        width: "300px",
                                                                                        top: document.getElementById(`matrix-${index}`).getBoundingClientRect().bottom + window.scrollY,
                                                                                        left: document.getElementById(`matrix-${index}`).getBoundingClientRect().left + window.scrollX,
                                                                                    }}
                                                                                >
                                                                                    {getPaginatedMatrices(matrixInput).map((matrix, matrixIndex) => (
                                                                                        <div
                                                                                            key={matrixIndex}
                                                                                            className="p-1 text-md cursor-pointer hover:bg-gray-200 text-start border-b border-slate-100"
                                                                                            onClick={() => {
                                                                                                // mirror global matrix apply behavior
                                                                                                skipBlurRef.current = true; // prevent blur-based API
                                                                                                setTimeout(() => {
                                                                                                    skipBlurRef.current = false;
                                                                                                }, 300);
                                                                                                setMatrixInput(matrix);
                                                                                                handleMatrixChange(index, matrix);
                                                                                                const inputField = document.getElementById(`matrix-${index}`);
                                                                                                if (inputField) inputField.value = matrix;
                                                                                                setTimeout(() => handleMatrixComplete(index, matrix), 100);
                                                                                                setShowMatrixDropdown(false);
                                                                                                setCurrentEditingMatrixIndex(null);
                                                                                            }}
                                                                                        >
                                                                                            <p>{matrix}</p>
                                                                                        </div>
                                                                                    ))}
                                                                                    {filterMatrices(matrixInput).length > itemsPerPage && (
                                                                                        <div className="flex justify-between p-2 bg-gray-100">
                                                                                            <button
                                                                                                className="px-2 py-1 border rounded disabled:opacity-50"
                                                                                                onClick={() => handleMatrixPageChange(matrixPage - 1)}
                                                                                                disabled={matrixPage === 1}
                                                                                            >
                                                                                                Prev
                                                                                            </button>
                                                                                            <span>
                                                                                                {matrixPage}/{Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)}
                                                                                            </span>
                                                                                            <button
                                                                                                className="px-2 py-1 border rounded disabled:opacity-50"
                                                                                                onClick={() => handleMatrixPageChange(matrixPage + 1)}
                                                                                                disabled={matrixPage >= Math.ceil(filterMatrices(matrixInput).length / itemsPerPage)}
                                                                                            >
                                                                                                Next
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>,
                                                                                document.body,
                                                                            )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center my-1">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`urgent-${index}`}
                                                                        checked={urgentSamples[index] || false}
                                                                        onChange={(e) => handleUrgentChange(index, e.target.checked)}
                                                                        className="mr-2"
                                                                    />
                                                                    <label htmlFor={`urgent-${index}`} className="text-sm font-medium">
                                                                        Mẫu khẩn
                                                                    </label>
                                                                </div>{" "}
                                                            </div>{" "}
                                                            {/* Sample Information Section - Moved above analysis table */}
                                                            {(customerInfo[index]?.length > 0 || !defaultSampleInformation) && (
                                                                <div className="mb-4 border-t pt-4">
                                                                    <div className="border py-2 mt-2 rounded-lg">
                                                                        {/* Customer Information Section */}
                                                                        <div className="w-full">
                                                                            <div className="flex justify-between items-center px-4 mb-2">
                                                                                <h5 className="font-medium text-sm">Thông tin khách hàng cung cấp</h5>
                                                                                <button
                                                                                    className="bg-white text-sky-500 rounded-full p-1"
                                                                                    onClick={() => handleAddCustomerField(index)}
                                                                                    title="Thêm thông tin khách hàng"
                                                                                >
                                                                                    <AiOutlinePlus size={16} />
                                                                                </button>
                                                                            </div>
                                                                            <div className="w-full overflow-hidden hover:overflow-auto mb-1">
                                                                                <div className="flex flex-wrap">
                                                                                    {(
                                                                                        customerInfo[index] ||
                                                                                        (!defaultSampleInformation
                                                                                            ? defaultCustomerFields.map((field) => ({
                                                                                                  ...field,
                                                                                                  fvalue: field.fname === "Tên mẫu thử / name." ? sample.sampleName || "" : field.fvalue,
                                                                                              }))
                                                                                            : [])
                                                                                    ).map((field, fieldIndex) => {
                                                                                        // Check if this is a default field or a custom field
                                                                                        const isDefaultField = defaultCustomerFields.some((item) => item.fname === field?.fname);
                                                                                        const isKhacWithOther = field.fname === "Khác" && field?.other;

                                                                                        return (
                                                                                            <div key={fieldIndex} className="mb-1 w-full px-2">
                                                                                                <table className="w-full">
                                                                                                    <tbody>
                                                                                                        <tr>
                                                                                                            <td className="w-1/3 text-start p-1 font-medium min-w-32 flex justify-between items-center">
                                                                                                                {isDefaultField || isKhacWithOther ? (
                                                                                                                    <>
                                                                                                                        <select
                                                                                                                            value={isDefaultField ? field.fname : isKhacWithOther ? "Khác" : ""}
                                                                                                                            onChange={(e) =>
                                                                                                                                handleCustomerFieldChange(index, fieldIndex, "fname", e.target.value)
                                                                                                                            }
                                                                                                                            className={`p-1 ${
                                                                                                                                isKhacWithOther ? "w-1/2 mr-1" : "w-full"
                                                                                                                            } border min-w-16 rounded-md bg-white text-xs`}
                                                                                                                        >
                                                                                                                            <option value="">Chọn thông tin</option>
                                                                                                                            {defaultCustomerFields.map((selectField) => (
                                                                                                                                <option key={selectField.fname} value={selectField.fname}>
                                                                                                                                    {selectField.fname}
                                                                                                                                </option>
                                                                                                                            ))}
                                                                                                                            <option value="Khác">Khác</option>
                                                                                                                        </select>
                                                                                                                        {isKhacWithOther && (
                                                                                                                            <input
                                                                                                                                type="text"
                                                                                                                                value={field?.other || ""}
                                                                                                                                onChange={(e) =>
                                                                                                                                    handleCustomerFieldChange(
                                                                                                                                        index,
                                                                                                                                        fieldIndex,
                                                                                                                                        "other",
                                                                                                                                        e.target.value,
                                                                                                                                    )
                                                                                                                                }
                                                                                                                                className="p-1 w-full border rounded-md bg-white text-xs"
                                                                                                                                placeholder="Nhập tên khác"
                                                                                                                            />
                                                                                                                        )}
                                                                                                                    </>
                                                                                                                ) : (
                                                                                                                    <div className="flex items-center w-full">
                                                                                                                        <input
                                                                                                                            type="text"
                                                                                                                            value={field?.fname || ""}
                                                                                                                            onChange={(e) =>
                                                                                                                                handleCustomerFieldChange(index, fieldIndex, "fname", e.target.value)
                                                                                                                            }
                                                                                                                            className="p-1 flex-1 border rounded-md bg-white text-xs mr-1"
                                                                                                                            placeholder="Tên trường tùy chỉnh"
                                                                                                                        />
                                                                                                                        <button
                                                                                                                            onClick={() => {
                                                                                                                                // Convert custom field to dropdown mode
                                                                                                                                const updatedCustomerInfo = { ...customerInfo };
                                                                                                                                if (!updatedCustomerInfo[index]) {
                                                                                                                                    updatedCustomerInfo[index] = [];
                                                                                                                                }
                                                                                                                                updatedCustomerInfo[index][fieldIndex] = {
                                                                                                                                    ...updatedCustomerInfo[index][fieldIndex],
                                                                                                                                    fname: "Khác",
                                                                                                                                    other: field?.fname || "",
                                                                                                                                };
                                                                                                                                setCustomerInfo(updatedCustomerInfo);
                                                                                                                            }}
                                                                                                                            className="p-1 border rounded-md bg-blue-50 hover:bg-blue-100 text-xs whitespace-nowrap"
                                                                                                                            title="Chuyển sang dropdown"
                                                                                                                        >
                                                                                                                            ⇄
                                                                                                                        </button>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </td>
                                                                                                            <td className="w-full text-start p-1">
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={field?.fvalue || ""}
                                                                                                                    onChange={(e) =>
                                                                                                                        handleCustomerFieldChange(index, fieldIndex, "fvalue", e.target.value)
                                                                                                                    }
                                                                                                                    className="p-1 w-full border rounded-md bg-white text-xs"
                                                                                                                />
                                                                                                            </td>
                                                                                                            <td>
                                                                                                                <button
                                                                                                                    className="text-red-200 hover:text-red-500 bg-white text-sm rounded-lg py-0 px-1 focus:outline-none"
                                                                                                                    onClick={() => handleDeleteCustomerField(index, fieldIndex)}
                                                                                                                >
                                                                                                                    ✕
                                                                                                                </button>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    </tbody>
                                                                                                </table>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full">
                                                                    <thead>
                                                                        <tr className="border-b-2 text-gray-500">
                                                                            <th className="p-1 text-start">Gợi ý</th>
                                                                            <th className="p-1 text-start">Chỉ tiêu</th>
                                                                            <th className="p-1 text-start">Nguồn</th>
                                                                            <th className="p-1 text-start">Mã Phương pháp</th>
                                                                            <th className="p-1 text-start">KNV</th>
                                                                            <th className="p-1 text-start">Họ tên</th>
                                                                            <th className="p-1 text-start w-10">Xóa</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {sample.analysis.map((item, idx) => (
                                                                            <tr key={idx} className="border-b">
                                                                                <td className="p-1 text-start w-24 relative">
                                                                                    <div
                                                                                        ref={dropdownTriggerRef}
                                                                                        className="w-full border p-0.5 rounded bg-white text-xs min-h-[20px] cursor-pointer flex items-center justify-between"
                                                                                        onClick={(e) => {
                                                                                            const originalName = item.originalParameterName || item.parameterName;
                                                                                            handleFetchSuggestions(index, idx, originalName, e);
                                                                                        }}
                                                                                    >
                                                                                        <span className="truncate">{item.parameterId || "Gợi ý..."}</span>
                                                                                        <span className="text-gray-400">▼</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-1 text-start">
                                                                                    {editingAnalysis.sampleIndex === index &&
                                                                                    editingAnalysis.analysisIndex === idx &&
                                                                                    editingAnalysis.field === "parameterName" ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editAnalysisValue}
                                                                                            onChange={handleAnalysisEditChange}
                                                                                            onKeyDown={handleAnalysisKeyDown}
                                                                                            onBlur={saveAnalysisEdit}
                                                                                            autoFocus
                                                                                            className="w-full border p-1 rounded bg-white"
                                                                                        />
                                                                                    ) : (
                                                                                        <span
                                                                                            className={`cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full ${
                                                                                                item.fromParams ? "text-blue-600 font-medium" : "text-gray-700"
                                                                                            }`}
                                                                                            onClick={() => startEditingAnalysis(index, idx, "parameterName", item.parameterName)}
                                                                                            title="Nhấn để chỉnh sửa"
                                                                                        >
                                                                                            {item.parameterName || "--"}
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-1 text-start w-28">
                                                                                    {editingAnalysis.sampleIndex === index &&
                                                                                    editingAnalysis.analysisIndex === idx &&
                                                                                    editingAnalysis.field === "protocolSource" ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editAnalysisValue}
                                                                                            onChange={handleAnalysisEditChange}
                                                                                            onKeyDown={handleAnalysisKeyDown}
                                                                                            onBlur={saveAnalysisEdit}
                                                                                            autoFocus
                                                                                            className="w-full border p-1 rounded bg-white"
                                                                                        />
                                                                                    ) : (
                                                                                        <span
                                                                                            className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full"
                                                                                            onClick={() => startEditingAnalysis(index, idx, "protocolSource", item.protocolSource)}
                                                                                            title="Nhấn để chỉnh sửa"
                                                                                        >
                                                                                            {item.protocolSource || "IRDOP"}
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-1 text-start">
                                                                                    {editingAnalysis.sampleIndex === index &&
                                                                                    editingAnalysis.analysisIndex === idx &&
                                                                                    editingAnalysis.field === "protocolCode" ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editAnalysisValue}
                                                                                            onChange={handleAnalysisEditChange}
                                                                                            onKeyDown={handleAnalysisKeyDown}
                                                                                            onBlur={saveAnalysisEdit}
                                                                                            autoFocus
                                                                                            className="w-full border p-1 rounded bg-white"
                                                                                        />
                                                                                    ) : (
                                                                                        <span
                                                                                            className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full"
                                                                                            onClick={() => startEditingAnalysis(index, idx, "protocolCode", item.protocolCode)}
                                                                                            title="Nhấn để chỉnh sửa"
                                                                                        >
                                                                                            {item.protocolCode || "--"}
                                                                                        </span>
                                                                                    )}
                                                                                    {/* Add the EX info fields if protocolSource is EX */}
                                                                                    {item.protocolSource === "EX" && (
                                                                                        <>
                                                                                            <div className="mt-1">
                                                                                                {editingAnalysis.sampleIndex === index &&
                                                                                                editingAnalysis.analysisIndex === idx &&
                                                                                                editingAnalysis.field === "ex_name" ? (
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={editAnalysisValue}
                                                                                                        onChange={handleAnalysisEditChange}
                                                                                                        onKeyDown={handleAnalysisKeyDown}
                                                                                                        onBlur={saveAnalysisEdit}
                                                                                                        autoFocus
                                                                                                        className="w-full border p-1 rounded bg-white"
                                                                                                        placeholder="Tên thầu phụ"
                                                                                                    />
                                                                                                ) : (
                                                                                                    <span
                                                                                                        className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full text-sm"
                                                                                                        onClick={() => startEditingAnalysis(index, idx, "ex_name", item.ex_info?.ex_name)}
                                                                                                        title="Nhấn để chỉnh sửa tên thầu phụ"
                                                                                                    >
                                                                                                        {item.ex_info?.ex_name || "Thầu phụ..."}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="mt-1">
                                                                                                {editingAnalysis.sampleIndex === index &&
                                                                                                editingAnalysis.analysisIndex === idx &&
                                                                                                editingAnalysis.field === "send_at" ? (
                                                                                                    <input
                                                                                                        type="date"
                                                                                                        value={editAnalysisValue ? new Date(editAnalysisValue).toISOString().split("T")[0] : ""}
                                                                                                        onChange={handleAnalysisEditChange}
                                                                                                        onKeyDown={handleAnalysisKeyDown}
                                                                                                        onBlur={saveAnalysisEdit}
                                                                                                        autoFocus
                                                                                                        className="w-full border p-1 rounded bg-white"
                                                                                                    />
                                                                                                ) : (
                                                                                                    <span
                                                                                                        className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full text-sm"
                                                                                                        onClick={() => startEditingAnalysis(index, idx, "send_at", item.ex_info?.send_at)}
                                                                                                        title="Nhấn để chọn ngày gửi mẫu"
                                                                                                    >
                                                                                                        {item.ex_info?.send_at
                                                                                                            ? new Date(item.ex_info.send_at).toLocaleDateString("vi-VN")
                                                                                                            : "Ngày gửi mẫu..."}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-1 text-start w-24">
                                                                                    {editingAnalysis.sampleIndex === index &&
                                                                                    editingAnalysis.analysisIndex === idx &&
                                                                                    editingAnalysis.field === "technicianAlias" ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editAnalysisValue}
                                                                                            onChange={handleAnalysisEditChange}
                                                                                            onKeyDown={handleAnalysisKeyDown}
                                                                                            onBlur={saveAnalysisEdit}
                                                                                            autoFocus
                                                                                            className="w-full border p-1 rounded bg-white"
                                                                                            placeholder="KNV"
                                                                                        />
                                                                                    ) : (
                                                                                        <span
                                                                                            className="cursor-pointer hover:bg-gray-100 py-1 px-2 -ml-2 rounded block w-full"
                                                                                            onClick={() => startEditingAnalysis(index, idx, "technicianAlias", item.technicianAlias)}
                                                                                            title="Nhấn để chỉnh sửa KNV"
                                                                                        >
                                                                                            {item.technicianAlias || "--"}
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-1 text-start">
                                                                                    <span className="py-1 px-2">{item.technician?.identityName || "--"}</span>
                                                                                </td>
                                                                                <td className="p-1 text-center">
                                                                                    <button
                                                                                        onClick={() => handleDeleteAnalysis(index, idx)}
                                                                                        className="text-red-500 hover:border hover:border-red-500 rounded-full w-5 h-5 flex items-center justify-center mx-auto"
                                                                                        title="Xóa chỉ tiêu"
                                                                                    >
                                                                                        ✕
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>{" "}
                                                            </div>
                                                            <div className="mt-2 flex justify-between gap-2">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleSearchAllInSample(index)}
                                                                        className="border border-green-500 text-green-600 text-sm rounded-lg p-1 flex items-center hover:bg-green-50"
                                                                        title="Tìm kiếm cho tất cả chỉ tiêu trong mẫu này"
                                                                    >
                                                                        Tìm mẫu này
                                                                    </button>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => toggleAnalysisMode(index)}
                                                                        className={`border text-sm rounded-lg p-1 flex items-center ${
                                                                            sample.activeAnalysisMode === "propose"
                                                                                ? "bg-purple-100 border-purple-500 text-purple-700"
                                                                                : "border-gray-400 text-gray-600 hover:bg-gray-100"
                                                                        }`}
                                                                        title={sample.activeAnalysisMode === "default" ? "Chuyển sang đề xuất" : "Chuyển về mặc định"}
                                                                    >
                                                                        {sample.activeAnalysisMode === "default" ? "Đề xuất" : "Mặc định"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>{" "}
                            {/* Close button (X) at top right */}
                            <button
                                onClick={closeModal}
                                className="absolute top-2 right-2 w-8 h-8 border border-red-500 rounded-lg  flex items-center justify-center bg-white text-red-500 hover:bg-gray-100 hover:border-red-700 "
                                title="Đóng"
                                disabled={isCreating}
                            >
                                ✕
                            </button>{" "}
                            {/* Action buttons at bottom */}
                            <div className="flex justify-between mt-4 gap-3 absolute bottom-6 left-6 right-6">
                                {crmData && (
                                    <>
                                        {" "}
                                        {/* Left side buttons */}
                                        <div className="flex gap-3 items-center">
                                            <button
                                                onClick={handleTestSave}
                                                disabled={isCreating}
                                                className="bg-gray-500 border border-gray-500 text-white font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-gray-600 hover:border-gray-600 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed"
                                            >
                                                Lưu phiếu
                                            </button>
                                        </div>
                                        {/* Right side buttons */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleCreateRequestForm}
                                                disabled={isCreating}
                                                className="bg-primary text-white font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                            >
                                                Tạo phiếu gửi mẫu
                                            </button>
                                            <button
                                                onClick={handleCreateReceipt}
                                                disabled={isCreating}
                                                className="bg-primary text-white font-semibold rounded-md py-2 px-4 cursor-pointer hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                            >
                                                {isCreating ? "Đang tạo..." : "Tạo tiếp nhận mẫu"}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </ErrorBoundary>
                    </div>
                </div>
            )}
            {/* Suggestion dropdown using createPortal */}
            {showSuggestionDropdown.sampleIndex !== null &&
                showSuggestionDropdown.analysisIndex !== null &&
                createPortal(
                    <div
                        className="fixed w-64 bg-white border rounded shadow-lg z-[9999] max-h-60 overflow-y-auto"
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {(() => {
                            const sIdx = showSuggestionDropdown.sampleIndex;
                            const aIdx = showSuggestionDropdown.analysisIndex;
                            const key = `${sIdx}_${aIdx}`;
                            const currentItem = crmData?.samples?.[sIdx]?.analysis?.[aIdx];

                            if (!currentItem) return null;

                            return loadingSuggestions[key] ? (
                                <div className="p-2 text-center text-gray-500 text-xs">Đang tải...</div>
                            ) : (
                                <>
                                    <div className="p-2 hover:bg-gray-100 cursor-pointer border-b text-xs" onClick={() => handleResetToOriginal(sIdx, aIdx)}>
                                        <span className="font-semibold">Nguyên bản:</span> {currentItem.originalParameterName || currentItem.parameterName}
                                    </div>
                                    {Array.isArray(suggestions[key]) && suggestions[key].length > 0 && (
                                        <div
                                            className="p-2 hover:bg-blue-50 cursor-pointer border-b text-xs font-bold text-blue-600"
                                            onClick={() => handleApplyAllSuggestions(sIdx, aIdx, suggestions[key])}
                                        >
                                            Chọn tất cả ({suggestions[key].length})
                                        </div>
                                    )}
                                    {Array.isArray(suggestions[key]) &&
                                        suggestions[key].map((suggestion, idx) => (
                                            <div key={idx} className="p-2 hover:bg-gray-100 cursor-pointer border-b text-xs" onClick={() => handleApplySuggestion(sIdx, aIdx, suggestion)}>
                                                <div className="font-medium text-primary">
                                                    {suggestion.parameterId} - {suggestion.parameterName}
                                                </div>
                                            </div>
                                        ))}
                                    {(!Array.isArray(suggestions[key]) || suggestions[key].length === 0) && <div className="p-2 text-center text-gray-500 text-xs">Không có gợi ý</div>}
                                </>
                            );
                        })()}
                    </div>,
                    document.body,
                )}
        </>
    );
};

export default CreateReceiptFromCRM;
