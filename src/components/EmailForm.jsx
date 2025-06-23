import * as React from "react";
const { useState, useContext, useEffect } = React;
import { GlobalContext } from "../contexts/GlobalContext";
import { apiPost } from "../contexts/helperFunctionCallAPI";
import Swal from "sweetalert2";

const EmailForm = ({ receipt, isVisible, onClose }) => {
    const { currentUser } = useContext(GlobalContext);
    const [isSendingEmail, setIsSendingEmail] = useState(false); // Helper function to generate sample information text
    const generateSampleInfo = (samples) => {
        if (!samples || samples.length === 0) return "";

        return samples
            .map((sample, index) => {
                const sampleNumber = index + 1;
                // Generate sample information from sample_information array (only specific fields)
                let sampleInfoLines = "";
                if (
                    sample.sample_information &&
                    sample.sample_information.length > 0
                ) {
                    const allowedFields = [
                        "Tên mẫu thử / name.",
                        "Số lô / LOT no.",
                        "Ngày sản xuất / mfg.",
                        "Hạn sử dụng / exp.",
                        "Nơi sản xuất / mfr.",
                    ];

                    const filteredInfo = sample.sample_information.filter(
                        (info) => allowedFields.includes(info.fname),
                    );

                    if (filteredInfo.length > 0) {
                        sampleInfoLines = filteredInfo
                            .map(
                                (info) =>
                                    `   ${info.fname}: ${info.fvalue || ""}`,
                            )
                            .join("\n");
                    }
                } // Generate parameter-method pairs
                let parameterMethodPairs = "";
                if (sample.analysis && sample.analysis.length > 0) {
                    const pairs = sample.analysis
                        .map((analysis) => {
                            const parameter = analysis.parameter_name || "";
                            const method = analysis.protocol_code || "";
                            return parameter
                                ? `      ${parameter} - ${method}`
                                : "";
                        })
                        .filter((pair) => pair !== "");

                    if (pairs.length > 0) {
                        parameterMethodPairs = `   Chỉ tiêu - phương pháp:\n${pairs.join(
                            "\n",
                        )}`;
                    }
                }

                let result = `${sampleNumber}. Mẫu thử: ${
                    sample.sample_uid || ""
                }`;

                if (sampleInfoLines) {
                    result += `\n${sampleInfoLines}`;
                }

                result += `\n   Mô tả: ${sample.sample_description || ""}
   Nền mẫu: ${sample.matrix || ""}
   Số lượng: ${sample.sample_volume || ""}
   Mục đích: ${sample.purpose || ""}
   Yêu cầu: ${sample.additional_request || ""}`;

                if (parameterMethodPairs) {
                    result += `\n${parameterMethodPairs}`;
                }

                return result;
            })
            .join("\n\n");
    }; // Helper function to generate email body
    const generateEmailContent = (receiptData) => {
        const clientInfo = receiptData?.client || {};
        const sampleInfo = generateSampleInfo(receiptData?.samples);
        return `Kính gửi Quý khách hàng,

Yêu cầu thử nghiệm của Quý khách đã được tiếp nhận theo các thông tin chi tiết như sau:

═══════════════════════════════════════════════════════════
📋 THÔNG TIN KHÁCH HÀNG
═══════════════════════════════════════════════════════════
• Tên công ty/cá nhân: ${clientInfo.client_name || ""}
• Địa chỉ: ${clientInfo.client_address || ""}
• Mã số thuế / CCCD: ${clientInfo.legal_id || ""}

═══════════════════════════════════════════════════════════
📅 THÔNG TIN THỰC HIỆN
═══════════════════════════════════════════════════════════
• Ngày trả kết quả dự kiến: ${
            receiptData?.deadline
                ? new Date(receiptData.deadline).toLocaleDateString("vi-VN")
                : ""
        }
• Nơi trả kết quả: ${clientInfo.client_address || ""}
• Người liên hệ hỗ trợ: ${
            receiptData?.sale_recorder || currentUser?.fullname || ""
        }

═══════════════════════════════════════════════════════════
🧪 THÔNG TIN MẪU THỬ VÀ PHÂN TÍCH
═══════════════════════════════════════════════════════════
${sampleInfo}

═══════════════════════════════════════════════════════════
💳 THÔNG TIN THANH TOÁN
═══════════════════════════════════════════════════════════
Thụ hưởng: Viện nghiên cứu và phát triển sản phẩm thiên nhiên
Số tài khoản: 16356688
Ngân hàng: ACB Chi nhánh Hà Nội

═══════════════════════════════════════════════════════════
⚠️ LƯU Ý
═══════════════════════════════════════════════════════════
• Yêu cầu chỉnh sửa phải được gửi trong vòng 48 giờ kể từ thời điểm phòng thí nghiệm tiếp nhận mẫu thử. Sau khoảng thời gian này, mọi yêu cầu chỉnh sửa sẽ không được chấp nhận.

• Việc hoàn tất thanh toán đồng nghĩa với việc quý khách chấp thuận các điều khoản và điều kiện dịch vụ kiểm nghiệm, được nêu chi tiết tại: www.irdop.org/termsconditions.

• Phương pháp thử nghiệm, nếu không được chỉ định rõ ràng, sẽ do phòng thí nghiệm quyết định dựa trên đặc tính của mẫu thử được gửi.

• Trường hợp quý khách cần sử dụng kết quả kiểm nghiệm cho mục đích hợp quy hoặc pháp chế, vui lòng liên hệ nhân viên hỗ trợ để được hướng dẫn bổ sung các tài liệu cần thiết.

═══════════════════════════════════════════════════════════

Trân trọng cảm ơn,
Viện nghiên cứu và phát triển sản phẩm thiên nhiên
🌐 Website: www.irdop.org
📧 Email: kiemnghiem@irdop.org`;
    };
    // Helper function to generate subject line
    const generateSubject = (receiptData) => {
        const sampleCount = receiptData?.samples?.length || 0;
        const receiptUid = receiptData?.receipt_uid || "";
        const orderCode = receiptData?.order_code || "";

        return `Thông báo tiếp nhận ${sampleCount} mẫu theo mã ${receiptUid} của đơn hàng ${orderCode}`;
    };

    // Email form fields
    const [emailData, setEmailData] = useState({
        from: "kiemnghiem@irdop.org",
        to: receipt?.contact?.email || "",
        subject: generateSubject(receipt),
        body: generateEmailContent(receipt),
    }); // Update email body when receipt data changes
    useEffect(() => {
        if (receipt) {
            setEmailData((prev) => ({
                ...prev,
                to: receipt?.contact?.email || "",
                subject: generateSubject(receipt),
                body: generateEmailContent(receipt),
            }));
        }
    }, [receipt, currentUser]);

    if (!isVisible) return null;

    const handleEmailDataChange = (field, value) => {
        setEmailData((prev) => ({
            ...prev,
            [field]: value,
        }));
    }; // Helper function to validate email format
    const isValidEmail = (email) => {
        // Kiểm tra độ dài email (không quá 254 ký tự)
        if (!email || email.length > 254 || email.length < 3) {
            return false;
        }

        // Kiểm tra sự tồn tại của ký tự '@' (phải có chính xác 1 ký tự '@')
        const atCount = (email.match(/@/g) || []).length;
        if (atCount !== 1) {
            return false;
        }

        const atIndex = email.indexOf("@");

        // Kiểm tra vị trí của ký tự '@' (không được ở đầu hoặc cuối)
        if (atIndex === 0 || atIndex === email.length - 1) {
            return false;
        }

        // Tách phần tên người dùng và tên miền
        const localPart = email.substring(0, atIndex);
        const domainPart = email.substring(atIndex + 1);

        // Kiểm tra phần tên người dùng (trước '@')
        if (!isValidLocalPart(localPart)) {
            return false;
        }

        // Kiểm tra phần tên miền (sau '@')
        if (!isValidDomainPart(domainPart)) {
            return false;
        }

        return true;
    };

    // Kiểm tra phần tên người dùng (trước '@')
    const isValidLocalPart = (localPart) => {
        // Không được rỗng và không quá 64 ký tự
        if (!localPart || localPart.length > 64) {
            return false;
        }

        // Không được bắt đầu hoặc kết thúc bằng dấu chấm
        if (localPart.startsWith(".") || localPart.endsWith(".")) {
            return false;
        }

        // Không được có hai dấu chấm liên tiếp
        if (localPart.includes("..")) {
            return false;
        }

        // Kiểm tra ký tự hợp lệ: chữ cái, số, dấu chấm, gạch ngang, gạch dưới
        const localPartRegex = /^[a-zA-Z0-9._-]+$/;
        return localPartRegex.test(localPart);
    };

    // Kiểm tra phần tên miền (sau '@')
    const isValidDomainPart = (domainPart) => {
        // Không được rỗng và không quá 253 ký tự
        if (!domainPart || domainPart.length > 253) {
            return false;
        }

        // Phải chứa ít nhất một dấu chấm
        if (!domainPart.includes(".")) {
            return false;
        }

        // Không được bắt đầu hoặc kết thúc bằng dấu chấm
        if (domainPart.startsWith(".") || domainPart.endsWith(".")) {
            return false;
        }

        // Không được có hai dấu chấm liên tiếp
        if (domainPart.includes("..")) {
            return false;
        }

        // Không được bắt đầu hoặc kết thúc bằng dấu gạch ngang
        if (domainPart.startsWith("-") || domainPart.endsWith("-")) {
            return false;
        }

        // Tách thành các phần được phân cách bởi dấu chấm
        const domainParts = domainPart.split(".");

        // Mỗi phần không được rỗng và phải hợp lệ
        for (const part of domainParts) {
            if (!part || part.length > 63) {
                return false;
            }

            // Không được bắt đầu hoặc kết thúc bằng dấu gạch ngang
            if (part.startsWith("-") || part.endsWith("-")) {
                return false;
            }

            // Chỉ được chứa chữ cái, số và dấu gạch ngang
            const domainPartRegex = /^[a-zA-Z0-9-]+$/;
            if (!domainPartRegex.test(part)) {
                return false;
            }
        }

        // Phần cuối cùng (TLD) phải có ít nhất 2 ký tự và chỉ chứa chữ cái
        const tld = domainParts[domainParts.length - 1];
        if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
            return false;
        }

        return true;
    };

    const handleSendEmail = async () => {
        // Validate required fields
        if (!emailData.to.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Thiếu thông tin",
                text: "Vui lòng nhập email người nhận.",
            });
            return;
        }

        // Parse and validate email addresses
        const emailArray = emailData.to
            .split(/[;,]/) // Split by semicolon or comma
            .map((email) => email.trim()) // Trim whitespace
            .filter((email) => email.length > 0); // Remove empty strings

        // Validate each email format
        const invalidEmails = emailArray.filter(
            (email) => !isValidEmail(email),
        );

        if (invalidEmails.length > 0) {
            Swal.fire({
                icon: "warning",
                title: "Email không hợp lệ",
                text: `Các email sau có định dạng không đúng: ${invalidEmails.join(
                    ", ",
                )}`,
            });
            return;
        }

        if (!emailData.subject.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Thiếu thông tin",
                text: "Vui lòng nhập tiêu đề email.",
            });
            return;
        }

        if (!emailData.body.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Thiếu thông tin",
                text: "Vui lòng nhập nội dung email.",
            });
            return;
        }

        setIsSendingEmail(true);
        try {
            const requestBody = {
                from: emailData.from,
                to: emailArray, // Use the validated email array
                subject: emailData.subject,
                body: emailData.body,
            };

            console.log("Sending receipt notification email:", requestBody);

            const response = await apiPost(
                "https://red.irdop.org/v1/mail/send/receipt",
                requestBody,
            );

            if (response.status === 200) {
                Swal.fire({
                    icon: "success",
                    title: "Thành công",
                    text: "Email thông báo tiếp nhận đã được gửi thành công!",
                });
                onClose();
            } else {
                throw new Error(
                    response.data?.message || "Không thể gửi email",
                );
            }
        } catch (error) {
            console.error("Error sending email:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: `Không thể gửi email: ${
                    error.message || "Lỗi không xác định"
                }`,
            });
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg w-4/5 max-w-4xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-4">
                    Gửi Email Thông Báo Tiếp Nhận
                </h2>

                {/* Email Form */}
                <div className="mb-6 space-y-4">
                    <div className="flex items-center space-x-4">
                        <label className="block text-sm font-medium text-gray-700 w-20 text-left">
                            From:
                        </label>
                        <input
                            type="text"
                            value={emailData.from}
                            onChange={(e) =>
                                handleEmailDataChange("from", e.target.value)
                            }
                            className="flex-1 p-2 border rounded-md bg-white"
                            readOnly
                        />
                    </div>{" "}
                    <div className="flex items-center space-x-4">
                        <label className="block text-sm font-medium text-gray-700 w-20 text-left">
                            To:
                        </label>
                        <input
                            type="text"
                            value={emailData.to}
                            onChange={(e) =>
                                handleEmailDataChange("to", e.target.value)
                            }
                            className="flex-1 p-2 border rounded-md bg-white"
                            placeholder="Email người nhận (nhiều email cách nhau bằng ; hoặc ,)"
                        />
                    </div>
                    <div className="flex items-center space-x-4">
                        <label className="block text-sm font-medium text-gray-700 w-20 text-left">
                            Subject:
                        </label>
                        <input
                            type="text"
                            value={emailData.subject}
                            onChange={(e) =>
                                handleEmailDataChange("subject", e.target.value)
                            }
                            className="flex-1 p-2 border rounded-md bg-white"
                        />
                    </div>
                    <div className="flex items-start space-x-4">
                        <label className="block text-sm font-medium text-gray-700 w-20 text-left mt-2">
                            Nội dung:
                        </label>
                        <textarea
                            value={emailData.body}
                            onChange={(e) =>
                                handleEmailDataChange("body", e.target.value)
                            }
                            className="flex-1 p-2 border rounded-md resize-none bg-white"
                            rows={20}
                            placeholder="Nhập nội dung email..."
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2">
                    <button
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                        onClick={onClose}
                        disabled={isSendingEmail}
                    >
                        Hủy bỏ
                    </button>
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        onClick={handleSendEmail}
                        disabled={isSendingEmail}
                    >
                        {isSendingEmail ? (
                            <span className="flex items-center">
                                <svg
                                    className="animate-spin h-4 w-4 mr-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Đang gửi...
                            </span>
                        ) : (
                            "Gửi Email"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailForm;
