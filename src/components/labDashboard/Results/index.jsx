import React, { useState } from "react";
import UserView from "./UserView";
import AdminView from "./AdminView";

const ResultsManager = () => {
    const [viewMode, setViewMode] = useState("user");

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-end p-2 bg-white border-b border-gray-200">
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
            </div>
            <div className="flex-1 overflow-hidden relative">{viewMode === "user" ? <UserView /> : <AdminView />}</div>
        </div>
    );
};

export default ResultsManager;
