import React, { useEffect, useState, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { apiPost } from "../contexts/helperFunctionCallAPI";
import { GlobalContext } from "../contexts/GlobalContext"; // Add import for GlobalContext
import JsBarcode from "jsbarcode";

const PrintSampleTag = () => {
    const [searchParams] = useSearchParams();
    const receiptId = searchParams.get("receiptId");
    const sampleId = searchParams.get("sampleId"); // Get sampleId from query params
    const [receiptData, setReceiptData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { status } = useContext(GlobalContext);

    const [sampleQuantities, setSampleQuantities] = useState({});
    const [printData, setPrintData] = useState([]);
    const [printPortalNode, setPrintPortalNode] = useState(null);

    useEffect(() => {
        const node = document.createElement("div");
        node.id = "print-portal";
        document.body.appendChild(node);
        setPrintPortalNode(node);
        return () => {
            if (document.body.contains(node)) {
                document.body.removeChild(node);
            }
        };
    }, []);

    // Format date to dd-mm-yyyy
    const formatDate = (dateString) => {
        if (!dateString) return "";

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();

        return `${day}${month}${year}`;
    };

    useEffect(() => {
        const fetchReceiptData = async () => {
            if (!receiptId) {
                setError("No receiptId provided");
                setLoading(false);
                return;
            }

            try {
                const response = await apiPost("https://red.irdop.org/v1/receipt/get/full", {
                    receiptId: receiptId,
                });
                if (response.status === 200) {
                    // Extract only the data we need with new camelCase structure
                    const { receiptId, _deprecated_recordCode, receiptDate, samples } = response.data;

                    // Filter samples if sampleId is provided
                    let simplifiedSamples = samples.map((sample) => {
                        // COMMENTED OUT: Technician-related logic (may be used later)
                        // const analyses = sample.analyses || [];

                        // // Get unique technicians (null/"" count as one group)
                        // const technicianGroups = [];
                        // const seenTechnicians = new Set();
                        // let hasEmptyTechnician = false;

                        // analyses.forEach((analysis) => {
                        //     const techId = analysis.technician?.identityId;
                        //     const techName = analysis.technician?.identityName;

                        //     if (!techId || techId === "") {
                        //         hasEmptyTechnician = true;
                        //     } else if (!seenTechnicians.has(techId)) {
                        //         seenTechnicians.add(techId);
                        //         technicianGroups.push({
                        //             identityId: techId,
                        //             identityName: techName || "",
                        //         });
                        //     }
                        // });

                        // // Add empty technician group if exists
                        // if (hasEmptyTechnician) {
                        //     technicianGroups.push({
                        //         identityId: null,
                        //         identityName: "",
                        //     });
                        // }

                        return {
                            sampleId: sample.sampleId || sample.sample_id,
                            status: sample.status,
                            // technicianGroups: technicianGroups,
                        };
                    });

                    // If sampleId is provided, filter to show only that specific sample
                    if (sampleId) {
                        simplifiedSamples = simplifiedSamples.filter((sample) => (sample.sampleId || sample.sample_id) === sampleId);
                        if (simplifiedSamples.length === 0) {
                            setError(`Sample with ID ${sampleId} not found in this receipt`);
                        }
                    }

                    setReceiptData({
                        receiptId: receiptId,
                        recordCode: _deprecated_recordCode,
                        createdAt: receiptDate,
                        samples: simplifiedSamples,
                    });
                } else {
                    setError(`Error fetching data: ${response.status}`);
                }
            } catch (err) {
                setError(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchReceiptData();
    }, [receiptId, sampleId]); // Add sampleId to dependency array

    // Remove the auto-print useEffect
    useEffect(() => {
        if (receiptData && !loading) {
            // Auto-print functionality removed
        }
    }, [receiptData, loading]);

    useEffect(() => {
        if (receiptData?.samples) {
            const initialQuantities = {};
            receiptData.samples.forEach((sample) => {
                const id = sample.sampleId || sample.sample_id;
                initialQuantities[id] = 2;
            });
            setSampleQuantities(initialQuantities);
        }
    }, [receiptData]);

    // Update printData whenever sampleQuantities or receiptData changes
    // Actually, user requested a "Refresh" button.
    // But for better UX, we can initialize it once, and then let the button do the work.
    // However, to ensure the initial view is correct, we should generate it initially.
    useEffect(() => {
        if (receiptData?.samples && Object.keys(sampleQuantities).length > 0 && printData.length === 0) {
            handleRefresh();
        }
    }, [sampleQuantities, receiptData]);

    const handleQuantityChange = (sampleId, value) => {
        setSampleQuantities((prev) => ({
            ...prev,
            [sampleId]: parseInt(value) || 0,
        }));
    };

    const handleRefresh = () => {
        if (!receiptData?.samples) return;

        const allTags = [];
        receiptData.samples.forEach((sample) => {
            const id = sample.sampleId || sample.sample_id;
            const qty = sampleQuantities[id] !== undefined ? sampleQuantities[id] : 2;

            for (let i = 0; i < qty; i++) {
                allTags.push({
                    sample: sample,
                    key: `${id}-${i}`,
                });
            }
        });

        // Chunk into pairs of 2
        const chunks = [];
        for (let i = 0; i < allTags.length; i += 2) {
            chunks.push(allTags.slice(i, i + 2));
        }
        setPrintData(chunks);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
    }

    // Barcode component with multiple format options
    const BarcodeGenerator = ({ value, width = 1, height = 40, format = "CODE128" }) => {
        const barcodeRef = useRef(null);

        useEffect(() => {
            if (barcodeRef.current && value) {
                try {
                    // Different barcode formats for different needs:
                    // CODE39: Best spacing, good for 1x2 ratio, supports alphanumeric
                    // CODE128: More compact, better data density
                    // ITF: Numbers only, very compact
                    const formatOptions = {
                        CODE39: {
                            format: "CODE39",
                            width: width,
                            height: height,
                            displayValue: false,
                            margin: 0, // Zero margin here, controlled by CSS
                            background: "transparent",
                            lineColor: "#000000",
                        },
                        CODE128: {
                            format: "CODE128",
                            width: width,
                            height: height,
                            displayValue: false,
                            margin: 0,
                            background: "transparent",
                            lineColor: "#000000",
                        },
                        ITF: {
                            format: "ITF",
                            width: width,
                            height: height,
                            displayValue: false,
                            margin: 0,
                            background: "transparent",
                            lineColor: "#000000",
                        },
                    };

                    JsBarcode(barcodeRef.current, value, formatOptions[format] || formatOptions.CODE39);
                } catch (error) {
                    // Fallback to CODE128 if selected format fails
                    try {
                        JsBarcode(barcodeRef.current, value, {
                            format: "CODE128",
                            width: width,
                            height: height,
                            displayValue: false,
                            margin: 0,
                            background: "transparent",
                            lineColor: "#000000",
                        });
                    } catch (fallbackError) {
                        console.error("Error generating barcode:", fallbackError);
                    }
                }
            }
        }, [value, width, height, format]);

        return <svg ref={barcodeRef} style={{ maxWidth: "100%", height: "auto", display: "block" }} />;
    };

    // Single tag component for each sample
    const SampleTag = ({ sample, isPrintView = false, technicianName = null }) => {
        const isTechnicianTag = technicianName !== null;
        const barcodeHeight = isTechnicianTag ? 39 : 40;
        const sampleIdFontSize = isTechnicianTag ? "text-lg" : "text-xl";
        const techNameFontSize = "text-lg";

        return (
            <div className={`w-[50mm] h-[30mm] flex overflow-hidden text-sm ${!isPrintView ? "border-gray-300 border rounded-sm" : ""}`} style={{ padding: "2mm" }}>
                <div className="flex-1 flex flex-col justify-start font-semibold">
                    <div className="flex w-full justify-between items-end">
                        <div className="text-left">
                            <div className={`flex justify-start mb-0 ${isTechnicianTag ? techNameFontSize : "text-3xl"}`}>
                                {technicianName ? (
                                    <span className="leading-tight" style={{ maxWidth: "45mm", wordBreak: "break-word" }}>
                                        {technicianName}
                                    </span>
                                ) : (
                                    <span>{receiptData.recordCode || "--"}</span>
                                )}
                            </div>
                        </div>
                        {sample.status === 1 && (
                            <div className="flex justify-between text-xl">
                                <span>K</span>
                            </div>
                        )}
                        {!technicianName && (
                            <div className="flex justify-between mb-1 text-base">
                                <span>{formatDate(receiptData.createdAt || receiptData.receiptDate)}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-center w-full">
                        <BarcodeGenerator value={sample.sampleId} width={1} height={barcodeHeight} />
                    </div>
                    <div className={`flex justify-center mb-0.5 ${sampleIdFontSize}`}>
                        <p style={{ letterSpacing: "0.1em", lineHeight: "20px" }}>{sample.sampleId}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="flex h-screen bg-gray-50 w-full screen-only">
                {/* Left Side: Print Preview */}
                <div className="w-2/3 h-full flex flex-col border-r border-gray-300">
                    <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">Khu vực in tem (Preview)</h2>
                        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                />
                            </svg>
                            Print
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 bg-gray-100 flex flex-col items-start overflow-x-auto">
                        <div className="print-content">
                            {printData.map((pair, index) => (
                                <div key={`pair-${index}`} className="tag-pair shadow-sm">
                                    {pair.map((tagItem) => (
                                        <SampleTag key={tagItem.key} sample={tagItem.sample} technicianName={null} />
                                    ))}
                                </div>
                            ))}
                            {printData.length === 0 && <div className="text-gray-500 mt-10">Không có tem nào để in.</div>}
                        </div>
                    </div>
                </div>

                {/* Right Side: Configuration */}
                <div className="w-1/3 h-full flex flex-col bg-white">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">Thiết lập số lượng</h2>
                        <button onClick={handleRefresh} className="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            Refresh
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 ">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                            <thead className="">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-black uppercase tracking-wider">
                                        Mã mẫu
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-black uppercase tracking-wider">
                                        Số lượng
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {receiptData?.samples?.map((sample) => {
                                    const id = sample.sampleId || sample.sample_id;
                                    return (
                                        <tr key={id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-left">{id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={sampleQuantities[id] !== undefined ? sampleQuantities[id] : 2}
                                                    onChange={(e) => handleQuantityChange(id, e.target.value)}
                                                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {printPortalNode &&
                createPortal(
                    <div className="print-only">
                        <style>
                            {`
                            @media print {
                                @page {
                                    size: 100mm 30mm;
                                    margin: 0;
                                }
                                
                                html, body {
                                    height: auto !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    overflow: visible !important;
                                }
                                
                                /* Hide everything in body except the print portal */
                                body > *:not(#print-portal) {
                                    display: none !important;
                                }
                                
                                #print-portal {
                                    display: block !important;
                                    position: absolute;
                                    left: 0;
                                    top: 0;
                                    width: 100%;
                                }
                                
                                .tag-pair {
                                    display: flex;
                                    flex-direction: row;
                                    width: 100mm;
                                    height: 30mm;
                                    page-break-after: always;
                                    page-break-inside: avoid;
                                    margin: 0;
                                    padding: 0;
                                }
                                
                                .tag-pair:last-of-type {
                                    page-break-after: auto;
                                }
                            }
                            
                            @media screen {
                                #print-portal {
                                    display: none;
                                }
                                
                                .tag-pair {
                                    display: flex;
                                    flex-direction: row;
                                    margin-bottom: 10px;
                                    background: white;
                                }
                            }
                            `}
                        </style>
                        {printData.map((pair, index) => (
                            <div key={`pair-${index}`} className="tag-pair">
                                {pair.map((tagItem) => (
                                    <SampleTag key={tagItem.key} sample={tagItem.sample} technicianName={null} isPrintView={true} />
                                ))}
                            </div>
                        ))}
                    </div>,
                    printPortalNode,
                )}
        </>
    );
};

export default PrintSampleTag;
