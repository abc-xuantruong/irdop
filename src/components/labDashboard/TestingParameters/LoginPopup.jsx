import React, { useState, useContext } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import axios from "axios";
import Swal from "sweetalert2";
import { GlobalContext } from "../../../contexts/GlobalContext";

/**
 * LoginPopup - Component hiển thị popup đăng nhập để xác thực trước khi chỉnh sửa
 * @param {boolean} isOpen - Trạng thái hiển thị popup
 * @param {function} onClose - Callback khi đóng popup
 * @param {function} onLoginSuccess - Callback khi đăng nhập thành công
 */
const LoginPopup = ({ isOpen, onClose, onLoginSuccess }) => {
    const { setCurrentUser } = useContext(GlobalContext);

    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Card scanner states
    const [cardBuffer, setCardBuffer] = useState("");
    const [cardInputTimer, setCardInputTimer] = useState(null);

    // Handle card scanner login
    const handleCardLogin = async (cardCode) => {
        if (cardCode.length !== 10) return;

        setIsLoggingIn(true);

        try {
            const response = await axios.post("https://pink.irdop.org/gre134e/auth/login", {
                code: cardCode,
            });

            // Check if status code is >= 300, show error message
            if (response.statusCode && response.statusCode >= 300) {
                const errorMessage = response.message || "Đăng nhập thất bại. Vui lòng thử lại.";
                Swal.fire({
                    icon: "error",
                    title: "Đăng nhập thất bại",
                    text: errorMessage,
                });
                setIsLoggingIn(false);
                setCardBuffer("");
                return;
            }

            const auth = response.data?.session_uid;
            const appUID = response.data?.app_uid;
            const identityUID = response.data?.identity_uid;
            const identityName = response.data?.identity_name;
            const email = response.data?.email;
            const role = response.data?.role;

            // Set cookies
            Cookies.set("auth", auth);
            Cookies.set("appUID", appUID);
            Cookies.set("identityId", identityUID);

            // Set editExpiredResultAt to now + 10 minutes
            const now = new Date().getTime();
            const expiredAt = now + 10 * 60 * 1000; // 10 minutes
            Cookies.set("editExpiredResultAt", expiredAt.toString());

            // Update currentUser in GlobalContext
            setCurrentUser({
                identity_uid: identityUID,
                identity_name: identityName,
                email: email,
                role: role || {},
            });

            toast.success("Đăng nhập thành công bằng thẻ từ");

            // Reset form
            setLoginEmail("");
            setLoginPassword("");
            setCardBuffer("");
            setIsLoggingIn(false);

            // Call success callback
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } catch (error) {
            console.error("Card login error:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: error.message || "Đã xảy ra lỗi khi đăng nhập bằng thẻ từ.",
            });
            setIsLoggingIn(false);
            setCardBuffer("");
        }
    };

    // Handle email input with card scanner detection
    const handleEmailChange = (e) => {
        const newValue = e.target.value;
        const currentLength = loginEmail.length;
        const newLength = newValue.length;

        // Detect if this is rapid input (card scanner)
        if (newLength > currentLength) {
            const addedChars = newValue.substring(currentLength);
            const updatedBuffer = cardBuffer + addedChars;

            setCardBuffer(updatedBuffer);

            // Clear existing timer
            if (cardInputTimer) {
                clearTimeout(cardInputTimer);
            }

            // Check if we have 10 characters
            if (updatedBuffer.length === 10) {
                // Clear the timer and attempt card login
                if (cardInputTimer) {
                    clearTimeout(cardInputTimer);
                }
                setCardInputTimer(null);

                // Clear the email field and login via card
                setLoginEmail("");
                handleCardLogin(updatedBuffer);
                return;
            } else if (updatedBuffer.length < 10) {
                // Set timer to reset buffer after 500ms
                const timer = setTimeout(() => {
                    // If we didn't get 10 chars in 500ms, treat as normal input
                    setCardBuffer("");
                    setCardInputTimer(null);
                }, 500);

                setCardInputTimer(timer);
            } else if (updatedBuffer.length > 10) {
                // More than 10 chars, reset and treat as normal input
                setCardBuffer("");
                if (cardInputTimer) {
                    clearTimeout(cardInputTimer);
                    setCardInputTimer(null);
                }
            }
        } else {
            // User is deleting or replacing, reset card buffer
            setCardBuffer("");
            if (cardInputTimer) {
                clearTimeout(cardInputTimer);
                setCardInputTimer(null);
            }
        }

        // Update email normally
        setLoginEmail(newValue);
    };

    // Handle login form submission
    const handleLogin = async () => {
        // Skip validation if currently processing card login
        if (isLoggingIn) {
            return;
        }

        // Only validate if user is trying to login with email/password
        if (!loginEmail || !loginPassword) {
            toast.error("Vui lòng nhập đầy đủ tài khoản và mật khẩu");
            return;
        }

        setIsLoggingIn(true);

        try {
            const response = await axios.post("https://pink.irdop.org/gre134e/auth/login", {
                email: loginEmail,
                password: loginPassword,
            });

            // Check if status code is >= 300, show error message
            if (response.statusCode && response.statusCode >= 300) {
                const errorMessage = response.message || "Đăng nhập thất bại. Vui lòng thử lại.";
                Swal.fire({
                    icon: "error",
                    title: "Đăng nhập thất bại",
                    text: errorMessage,
                });
                setIsLoggingIn(false);
                return;
            }

            const auth = response.data?.session_uid;
            const appUID = response.data?.app_uid;
            const identityUID = response.data?.identity_uid;
            const identityName = response.data?.identity_name;
            const email = response.data?.email;
            const role = response.data?.role;

            // Set cookies
            Cookies.set("auth", auth);
            Cookies.set("appUID", appUID);
            Cookies.set("identityId", identityUID);

            // Set editExpiredResultAt to now + 10 minutes
            const now = new Date().getTime();
            const expiredAt = now + 10 * 60 * 1000; // 10 minutes
            Cookies.set("editExpiredResultAt", expiredAt.toString());

            // Update currentUser in GlobalContext
            setCurrentUser({
                identity_uid: identityUID,
                identity_name: identityName,
                email: email,
                role: role || {},
            });

            toast.success("Đăng nhập thành công");

            // Reset form
            setLoginEmail("");
            setLoginPassword("");
            setIsLoggingIn(false);

            // Call success callback
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } catch (error) {
            console.error("Login error:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: error.message || "Đã xảy ra lỗi khi đăng nhập.",
            });
            setIsLoggingIn(false);
        }
    };

    // Handle close and reset form
    const handleClose = () => {
        setLoginEmail("");
        setLoginPassword("");
        setIsLoggingIn(false);
        setCardBuffer("");
        if (cardInputTimer) {
            clearTimeout(cardInputTimer);
            setCardInputTimer(null);
        }
        if (onClose) {
            onClose();
        }
    };

    // Handle Enter key press
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !isLoggingIn) {
            // Only trigger login if both fields have values (email/password login)
            if (loginEmail && loginPassword) {
                handleLogin();
            }
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96 relative">
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <FaTimes size={20} />
                </button>
                <h2 className="text-xl font-bold mb-4 text-gray-800">Đăng nhập để chỉnh sửa</h2>
                <p className="text-sm text-gray-600 mb-4">Vui lòng đăng nhập để tiếp tục chỉnh sửa kết quả</p>
                <p className="text-xs text-blue-600 mb-4 italic">💡 Bạn có thể quét thẻ từ để đăng nhập nhanh</p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={loginEmail}
                            onChange={handleEmailChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                            placeholder="Nhập email hoặc quét thẻ từ"
                            onKeyDown={handleKeyDown}
                            autoComplete="off"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                        <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                            placeholder="Nhập mật khẩu"
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <button
                        onClick={handleLogin}
                        disabled={isLoggingIn || !loginEmail || !loginPassword}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPopup;
