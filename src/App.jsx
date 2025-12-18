import * as React from "react";
const { useContext } = React;
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import Header from "./sections/Header";
import Dashboard from "./pages/Dashboard";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReceiptInfor from "./pages/ReceiptInfor";
import SampleInfor from "./pages/SampleInfor";
import Library from "./pages/Library";
import Login from "./pages/Login";
import { GlobalContext } from "./contexts/GlobalContext";
import { TaskQueueProvider } from "./contexts/TaskQueueContext";
import ClientInfor from "./components/ClientInfor";
import Footer from "./sections/Footer";
import Event from "./components/Event";
// import LabDashboard from './pages/LabDashboard';
import LabDashboardTemporary from "./pages/LabDashboardTemporary";
import ReportEditor from "./pages/Report";
import Result from "./components/Analysis_result";
import PrintSampleTag from "./components/PrintSampleTag";
import FileInfor from "./pages/FileInfor";
import Editor from "./components/lab/Editor";
import AuthGuard from "./components/AuthGuard";
import ProcessingQueue from "./components/noti box/ProcessingQueue";
import ExtractedDataModal from "./components/noti box/ExtractedDataModal";
import AccountantDashboard from "./pages/AccountantDashboard";
import ProcessingSampleV2 from "./components/lab/ProcessingSampleV2";
import HandoverSampleDash from "./pages/HandoverSampleDash";
import LabResultReport from "./components/LabResultReport";
import ProgressDashboard from "./pages/ProgressDashboard";
import UserDashboard from "./pages/UserDashboard";
import IncomingOrder from "./components/orderDashboard/IncomingOrder";

const App = () => {
    return (
        <TaskQueueProvider>
            <ToastContainer position="top-right" autoClose={3000} />
            <Router>
                <AuthGuard>
                    <ProcessingQueue />
                    <ExtractedDataModal />
                    <Routes>
                        {/* Fullscreen route without header/footer */}
                        {/* <Route path="/lab" element={<LabDashboard />} /> */}
                        <Route path="/processing" element={<LabDashboardTemporary />} />
                        <Route path="/editor" element={<Editor />} />

                        {/* Regular routes with header/footer */}
                        <Route
                            path="*"
                            element={
                                <div className="h-full min-h-lvh min-w-lvw w-lvw flex flex-col items-center relative">
                                    <Header />
                                    <div className="flex justify-center items-center w-full px-2 mb-60">
                                        <Routes>
                                            <Route path="library" element={<Library />} />
                                            <Route path="/intra-h1y25-c1" element={<Event />} />
                                            <Route path="/dashboard" element={<Dashboard />} />
                                            <Route path="/" element={<Dashboard />} />
                                            <Route path="/accountant" element={<AccountantDashboard />} />
                                            <Route path="/report" element={<ReportEditor />} />
                                            <Route path="/result" element={<Result />} />
                                            <Route path="/dashboard/receipt" element={<ReceiptInfor />} />
                                            <Route path="/dashboard/receipt/report" element={<LabResultReport />} />
                                            <Route path="/dashboard/receipt/print_sp" element={<PrintSampleTag />} />
                                            <Route path="/dashboard/sample" element={<SampleInfor />} />
                                            <Route path="/login" element={<Login />} />
                                            <Route path="library/client" element={<ClientInfor />} />
                                            <Route path="/files" element={<FileInfor />} />
                                            <Route path="/filterable" element={<ProcessingSampleV2 />} />
                                            <Route path="/handover-dashboard" element={<HandoverSampleDash />} />

                                            <Route path="/progress" element={<ProgressDashboard />} />
                                            <Route path="/user-dashboard" element={<UserDashboard />} />
                                            <Route path="/incoming-orders" element={<IncomingOrder />} />
                                        </Routes>
                                    </div>
                                    <Footer />
                                </div>
                            }
                        />
                    </Routes>
                </AuthGuard>
            </Router>
        </TaskQueueProvider>
    );
};

export default App;
