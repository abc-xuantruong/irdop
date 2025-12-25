import React, { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { X, Printer } from "lucide-react";

const HandoverReportModal = ({ isOpen, onClose, initialContent }) => {
    const editorRef = useRef(null);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">Biên bản bàn giao</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => editorRef.current && editorRef.current.execCommand("mcePrint")}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-medium text-sm"
                            title="In / Xuất PDF"
                        >
                            <Printer className="w-4 h-4" />
                            In / Xuất PDF
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow bg-gray-100 overflow-hidden p-4 flex justify-center">
                    <Editor
                        title="Handover Editor"
                        tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
                        onInit={(evt, editor) => (editorRef.current = editor)}
                        initialValue={initialContent}
                        init={{
                            height: "100%",
                            width: "100%",
                            menubar: false,
                            statusbar: false,
                            plugins: "table lists code print",
                            toolbar: "table | bold italic | alignleft aligncenter alignright | code print",
                            content_style: `
                                /* 1. Reset để ép sát dòng */
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                
                                body { 
                                    width: 794px; /* A4 width */
                                    margin: 20px auto !important; 
                                    padding: 10mm 15mm !important; 
                                    background-color: white; 
                                    font-family: "Times New Roman", Times, serif; 
                                    font-size: 13px;
                                    line-height: 1.3;
                                    min-height: 1123px; /* A4 height approx */
                                }

                                /* 2. Ép khoảng cách giữa các đoạn văn sát nhau (~3px) */
                                p { margin-bottom: 3px !important; }

                                /* 3. Cấu hình Bảng để ngắt chính xác theo hàng */
                                table { 
                                    width: 100% !important; 
                                    border-collapse: collapse; 
                                    page-break-inside: auto !important; 
                                    margin-bottom: 10px;
                                }

                                th, td { 
                                    border: 1px solid black !important; 
                                    padding: 3px !important; 
                                    word-break: break-word;
                                    vertical-align: top;
                                }

                                tr { 
                                    page-break-inside: avoid !important; 
                                    page-break-after: auto !important; 
                                }

                                thead { 
                                    display: table-header-group !important; 
                                }

                                /* 4. Background mô phỏng giấy for the editor view */
                                html { background-color: #f0f0f0; display: flex; justify-content: center; }
                                
                                /* Remove shadow and margins for print */
                                @media print {
                                    body { margin: 0 !important; box-shadow: none !important; width: 100% !important; padding: 0 !important; }
                                    html { background: none; display: block; }
                                }
                            `,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default HandoverReportModal;
