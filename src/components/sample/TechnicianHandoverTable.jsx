import React, { useState, useEffect } from "react";
import { apiPost } from "../../contexts/helperFunctionCallAPI";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, RefreshCcw } from "lucide-react";
import { toast } from "react-toastify";

const TechnicianHandoverTable = ({ technicianId, onClose }) => {
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAnalyses = async () => {
        if (!technicianId) return;
        setLoading(true);
        try {
            // Using correct API endpoint as requested
            const response = await apiPost("https://red.irdop.org/v1/sample/get/processing", {
                technicianId: [technicianId],
                itemsPerPage: 100,
                page: 1,
                // columns: [...] // Optional, backend might return default columns
            });

            if (response && response.data && response.data.result) {
                let processedSamples = [];
                const rawSamples = response.data.result;

                if (Array.isArray(rawSamples)) {
                    rawSamples.forEach((sample) => {
                        if (sample.analyses) {
                            const pendingAnalyses = sample.analyses.filter((analysis) => analysis.technicianId === technicianId && (!analysis.handover || Object.keys(analysis.handover).length === 0));

                            if (pendingAnalyses.length > 0) {
                                processedSamples.push({
                                    sampleId: sample.sampleId,
                                    sampleName: sample.sampleName,
                                    analyses: pendingAnalyses,
                                });
                            }
                        }
                    });
                }
                setAnalyses(processedSamples);
            }
        } catch (error) {
            console.error("Error fetching technician tasks:", error);
            toast.error("Lỗi khi tải danh sách nhiệm vụ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalyses();
    }, [technicianId]);

    if (!technicianId) return null;

    const totalTasks = analyses.reduce((acc, sample) => acc + sample.analyses.length, 0);

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800">Chỉ tiêu chưa bàn giao</h3>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">{totalTasks}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={fetchAnalyses} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Làm mới">
                        <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Đóng">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-auto p-0">
                <Table>
                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[100px] text-left">Mẫu</TableHead>
                            <TableHead className="text-left">Chỉ tiêu</TableHead>
                            <TableHead className="text-left">Phương pháp</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2 text-gray-500">
                                        <RefreshCcw className="w-4 h-4 animate-spin" />
                                        Đang tải...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : analyses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-gray-500">
                                    Không có chỉ tiêu nào chưa bàn giao
                                </TableCell>
                            </TableRow>
                        ) : (
                            analyses.map((group) =>
                                group.analyses.map((item, index) => (
                                    <TableRow key={`${group.sampleId}-${item.id || index}`} className="hover:bg-blue-50/50">
                                        {index === 0 && (
                                            <TableCell rowSpan={group.analyses.length} className="font-medium font-mono align-top text-left bg-white py-2 border-r">
                                                {group.sampleId}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-left align-top max-w-[150px] truncate py-2" title={item.parameterName}>
                                            {item.parameterName}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-gray-600 text-left align-top max-w-[100px] truncate py-2" title={item.protocolCode}>
                                            {item.protocolCode}
                                        </TableCell>
                                    </TableRow>
                                )),
                            )
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default TechnicianHandoverTable;
