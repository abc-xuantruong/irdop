import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaSort, FaSortUp, FaSortDown, FaFilter } from "react-icons/fa";
import { apiPost } from "../../contexts/helperFunctionCallAPI";

const ParameterList = () => {
    const [parameters, setParameters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState({});
    const [sortBy, setSortBy] = useState("ASC");
    const [columnSort, setColumnSort] = useState("createdAt");
    const [filterModal, setFilterModal] = useState({
        visible: false,
        column: "",
        value: "",
    });
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch parameters from API
    const fetchParameters = async (page = 1, itemsPerPage = 20) => {
        setLoading(true);
        setError(null);

        try {
            const requestBody = {
                columns: ["parameterId", "parameterName", "accreditation", "protocolCode", "technicianAlias", "matrix", "protocolSource", "displayStyle"],
                filter: filters,
                page,
                itemsPerPage,
                sortBy,
                columnSort,
                ...(searchTerm && { searchTerm }),
            };

            const response = await apiPost("https://red.irdop.org/v1/parameter/get", requestBody);

            if (response.data) {
                setParameters(response.data.result || []);
                setPagination(
                    response.data.pagination || {
                        currentPage: page,
                        itemsPerPage,
                        totalItems: 0,
                        totalPages: 0,
                    },
                );
            }
        } catch (err) {
            setError(err.message || "Failed to fetch parameters");
            console.error("Error fetching parameters:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load data on component mount and when filters change
    useEffect(() => {
        fetchParameters(pagination.currentPage, pagination.itemsPerPage);
    }, [filters, sortBy, columnSort]);

    // Reset page when search term changes
    useEffect(() => {
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, [searchTerm]);

    // Fetch when search term changes
    useEffect(() => {
        fetchParameters(1, pagination.itemsPerPage);
    }, [searchTerm]);

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchParameters(newPage, pagination.itemsPerPage);
        }
    };

    // Handle items per page change
    const handleItemsPerPageChange = (newItemsPerPage) => {
        fetchParameters(1, newItemsPerPage);
    };

    // Handle sort change
    const handleSort = (column) => {
        const newSortBy = columnSort === column && sortBy === "ASC" ? "DESC" : "ASC";
        setSortBy(newSortBy);
        setColumnSort(column);
    };

    // Handle filter change
    const handleFilterChange = (column, value) => {
        setFilters((prev) => ({
            ...prev,
            [column]: value || undefined,
        }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({});
    };

    // Get sort icon
    const getSortIcon = (column) => {
        if (columnSort !== column) return <FaSort className="text-gray-400 w-3 h-3" />;
        if (sortBy === "ASC") {
            return <FaSortUp className="text-blue-600 w-3 h-3" />;
        } else {
            return <FaSortDown className="text-blue-600 w-3 h-3" />;
        }
    };

    // Open filter modal
    const openFilterModal = (column) => {
        setFilterModal({
            visible: true,
            column,
            value: filters[column] || "",
        });
    };

    // Close filter modal
    const closeFilterModal = () => {
        setFilterModal({ visible: false, column: "", value: "" });
    };

    // Apply filter
    const applyFilter = () => {
        handleFilterChange(filterModal.column, filterModal.value);
        closeFilterModal();
    };

    // Clear filter for column
    const clearColumnFilter = () => {
        handleFilterChange(filterModal.column, "");
        closeFilterModal();
    };

    // Handle search
    const handleSearch = () => {
        setSearchTerm(searchTerm.trim());
    };

    // Handle clear search
    const handleClearSearch = () => {
        setSearchTerm("");
    };

    return (
        <>
            <div className="parameter-list-container p-4">
                <h2 className="text-2xl font-bold mb-4">Parameter List</h2>

                {/* Search */}
                <div className="flex items-center gap-2 mb-4">
                    <input
                        type="text"
                        className="px-3 py-2 border rounded flex-1"
                        placeholder="Search parameters..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                    />
                    <button onClick={searchTerm ? handleClearSearch : handleSearch} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        {searchTerm ? "✕" : "Search"}
                    </button>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2">Loading parameters...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Table */}
                {!loading && !error && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    {[
                                        {
                                            id: "parameterId",
                                            label: "Mã chỉ tiêu",
                                        },
                                        {
                                            id: "parameterName",
                                            label: "Tên chỉ tiêu",
                                        },
                                        {
                                            id: "accreditation",
                                            label: "Công nhận",
                                        },
                                        {
                                            id: "protocolCode",
                                            label: "Phương pháp",
                                        },
                                        {
                                            id: "technicianAlias",
                                            label: "KNV",
                                        },
                                        { id: "matrix", label: "Nền mẫu" },
                                        {
                                            id: "protocolSource",
                                            label: "Nguồn phương pháp",
                                        },
                                        {
                                            id: "displayStyle",
                                            label: "Định dạng hiển thị",
                                        },
                                    ].map((col) => (
                                        <th key={col.id} className="px-4 py-2 border-b text-left">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>{col.label}</span>
                                                <div className="flex items-center gap-1">
                                                    <FaFilter className="w-3 h-3 cursor-pointer text-gray-500 hover:text-gray-700" onClick={() => openFilterModal(col.id)} />
                                                    <div className="cursor-pointer" onClick={() => handleSort(col.id)}>
                                                        {getSortIcon(col.id)}
                                                    </div>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {parameters.map((parameter) => (
                                    <tr key={parameter.parameterId} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 border-b align-top text-left">{parameter.parameterId || "--"}</td>
                                        <td className="px-4 py-2 border-b align-top text-left">{parameter.parameterName || "--"}</td>
                                        <td className="px-4 py-2 border-b align-top text-left">
                                            {(() => {
                                                const acc = parameter.accreditation;
                                                if (!acc || typeof acc !== "object") return "--";
                                                const items = [];
                                                if (acc.TDC) items.push("TDC");
                                                if (acc.VILAS) items.push("VILAS");
                                                return items.length > 0 ? items.join(", ") : "--";
                                            })()}
                                        </td>
                                        <td className="px-4 py-2 border-b align-top text-left">{parameter.protocolCode || "--"}</td>
                                        <td className="px-4 py-2 border-b align-top text-left">{parameter.technicianAlias || "--"}</td>
                                        <td className="px-4 py-2 border-b align-top text-left">{parameter.matrix || "--"}</td>
                                        <td className="px-4 py-2 border-b align-top text-left">{parameter.protocolSource || "--"}</td>
                                        <td className="px-4 py-2 border-b align-top text-left">
                                            {(() => {
                                                const style = parameter.displayStyle;
                                                if (!style || typeof style !== "object") return "--";
                                                return (
                                                    <div className="flex flex-col items-end">
                                                        <span>{style.default || "--"}</span>
                                                        {style.eng && <span className="text-xs text-gray-500 italic">{style.eng}</span>}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* No data message */}
                        {parameters.length === 0 && <div className="text-center py-8 text-gray-500">No parameters found.</div>}
                    </div>
                )}

                {/* Controls and Pagination */}
                {!loading && (
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Items per page</label>
                                <select value={pagination.itemsPerPage} onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))} className="px-3 py-2 border rounded">
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                            <div className="text-sm text-gray-600">Total: {pagination.totalItems} parameters</div>
                        </div>
                        {pagination.totalPages > 1 && (
                            <div className="pagination flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                                    disabled={pagination.currentPage <= 1}
                                    className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-1">
                                    {(() => {
                                        const pages = [];
                                        const totalPages = pagination.totalPages;
                                        const current = pagination.currentPage;

                                        if (totalPages <= 5) {
                                            for (let i = 1; i <= totalPages; i++) {
                                                pages.push(i);
                                            }
                                        } else {
                                            pages.push(1);
                                            if (current > 3) pages.push("...");
                                            const start = Math.max(2, current - 1);
                                            const end = Math.min(totalPages - 1, current + 1);
                                            for (let i = start; i <= end; i++) {
                                                if (i !== 1 && i !== totalPages) pages.push(i);
                                            }
                                            if (current < totalPages - 2) pages.push("...");
                                            if (totalPages > 1) pages.push(totalPages);
                                        }

                                        return pages.map((page, index) => {
                                            if (page === "...") {
                                                return (
                                                    <span key={index} className="px-2">
                                                        ...
                                                    </span>
                                                );
                                            }
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => handlePageChange(page)}
                                                    className={`px-3 py-2 border rounded hover:bg-gray-100 ${page === current ? "bg-blue-500 text-white" : ""}`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>

                                <button
                                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                                    disabled={pagination.currentPage >= pagination.totalPages}
                                    className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {filterModal.visible &&
                createPortal(
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-4 rounded shadow-lg w-80">
                            <h3 className="text-lg font-semibold mb-4">Filter by {filterModal.column}</h3>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded mb-4"
                                placeholder={`Filter by ${filterModal.column}`}
                                value={filterModal.value}
                                onChange={(e) =>
                                    setFilterModal((prev) => ({
                                        ...prev,
                                        value: e.target.value,
                                    }))
                                }
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={closeFilterModal} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                                    Hủy
                                </button>
                                <button onClick={clearColumnFilter} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                                    Hủy Lọc
                                </button>
                                <button onClick={applyFilter} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};

export default ParameterList;
