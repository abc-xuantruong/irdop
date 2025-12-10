import React, { useState } from "react";
import IncomingManager from "../components/labDashboard/Incoming";
import ReceptionManager from "../components/labDashboard/Reception";
import HandoverManager from "../components/labDashboard/Handover";
import TestingParametersManager from "../components/labDashboard/TestingParameters";
import ResultsManager from "../components/labDashboard/Results";
import ShippingManager from "../components/labDashboard/Shipping";

const UserDashboard = () => {
    const [activeTab, setActiveTab] = useState("testingParameters");

    const renderContent = () => {
        switch (activeTab) {
            case "incoming":
                return <IncomingManager />;
            case "reception":
                return <ReceptionManager />;
            case "handover":
                return <HandoverManager />;
            case "testingParameters":
                return <TestingParametersManager />;
            case "results":
                return <ResultsManager />;
            case "shipping":
                return <ShippingManager />;
            default:
                return <div className="p-4">Select a tab</div>;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden w-full">
            {/* Main Tabs */}
            <div className="bg-white border-b px-4 pt-2 shadow-sm z-10">
                <div className="flex space-x-1 overflow-x-auto">
                    {/* Tab Items */}
                    {[
                        { id: "incoming", label: "Mẫu về" },
                        { id: "reception", label: "Tiếp nhận" },
                        { id: "handover", label: "Mẫu bàn giao" },
                        { id: "testingParameters", label: "Chỉ tiêu kiểm nghiệm" },
                        { id: "results", label: "Phiếu kết quả" },
                        { id: "shipping", label: "Gửi vận đơn" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                                activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">{renderContent()}</div>
        </div>
    );
};

export default UserDashboard;
