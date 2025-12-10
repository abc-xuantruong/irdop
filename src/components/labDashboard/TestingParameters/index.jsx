import React, { useState } from "react";
import UserView from "./UserView";
import AdminView from "./AdminView";

const TestingParametersManager = () => {
    const [viewMode, setViewMode] = useState("user");
    const [isFullScreen, setIsFullScreen] = useState(false);

    return (
        <div className={`h-full flex flex-col ${isFullScreen ? "fixed inset-0 z-[100] bg-white" : ""}`}>
            <div className="flex justify-between items-center p-2 bg-white border-b border-gray-200">
                {/* Left: User/Admin Toggle */}
                <div className="bg-gray-100 p-1 rounded-lg flex text-sm">
                    <button
                        className={`px-3 py-1 rounded-md transition-all ${viewMode === "user" ? "bg-white shadow text-blue-600 font-bold" : "text-gray-500 hover:text-gray-700"}`}
                        onClick={() => setViewMode("user")}
                    >
                        Cá nhân (User)
                    </button>
                    <button
                        className={`px-3 py-1 rounded-md transition-all ${viewMode === "admin" ? "bg-white shadow text-blue-600 font-bold" : "text-gray-500 hover:text-gray-700"}`}
                        onClick={() => setViewMode("admin")}
                    >
                        Quản trị (Admin)
                    </button>
                </div>

                {/* Right: Maximize/Minimize */}
                <button className="p-2 text-gray-500 hover:text-blue-600 transition-colors" onClick={() => setIsFullScreen(!isFullScreen)} title={isFullScreen ? "Thu nhỏ" : "Phóng to"}>
                    {isFullScreen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    )}
                </button>
            </div>
            <div className="flex-1 overflow-hidden relative">{viewMode === "user" ? <UserView /> : <AdminView />}</div>
        </div>
    );
};

export default TestingParametersManager;
