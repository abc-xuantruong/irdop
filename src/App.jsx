import * as React from 'react';
const { useContext } = React;
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Header from './sections/Header';
import Dashboard from './pages/Dashboard';
import ReceiptInfor from './pages/ReceiptInfor';
import SampleInfor from './pages/SampleInfor';
import Library from './pages/Library';
import ProtocolInfor from './components/ProtocolInfor';
import AnalyteInfor from './components/AnalyteInfor';
import Login from './pages/Login';
import { GlobalContext } from './contexts/GlobalContext';
import ClientInfor from './components/ClientInfor';
import Footer from './sections/Footer';
import Event from './components/Event';
import LabDashboard from './pages/LabDashboard';
import LabDashboardTemporary from './pages/LabDashboardTemporary';
import Report from './pages/Report';
import Result from './components/Analysis_result';
import PrintSampleTag from './components/PrintSampleTag';
import FileInfor from './pages/FileInfor';
import Editor from './components/lab/Editor';
import ExperimentLog from './components/lab/ExperimentLog';
import AuthGuard from './components/AuthGuard';

const App = () => {
	return (
		<Router>
			<AuthGuard>
				<Routes>
					{/* Fullscreen route without header/footer */}
					<Route path="/lab" element={<LabDashboard />} />
					<Route path="/processing" element={<LabDashboardTemporary />} />
					<Route path="/editor" element={<Editor />} />

					{/* Regular routes with header/footer */}
					<Route
						path="*"
						element={
							<div className="h-full min-h-lvh min-w-lvw w-lvw flex flex-col items-center relative">
								<Header />
								<div className="flex justify-center items-center w-full px-5 mb-60">
									<Routes>
										<Route path="library" element={<Library />} />
										<Route path="library/protocol" element={<ProtocolInfor />} />
										<Route path="library/analyte" element={<AnalyteInfor />} />
										<Route path="/intra-h1y25-c1" element={<Event />} />
										<Route path="/dashboard" element={<Dashboard />} />
										<Route path="/" element={<Dashboard />} />
										<Route path="/report" element={<Report />} />
										<Route path="/result" element={<Result />} />
										<Route path="/dashboard/receipt" element={<ReceiptInfor />} />
										<Route path="/dashboard/receipt/print_sp" element={<PrintSampleTag />} />
										<Route path="/dashboard/sample" element={<SampleInfor />} />
										<Route path="/login" element={<Login />} />
										<Route path="library/client" element={<ClientInfor />} />
										<Route path="/files" element={<FileInfor />} />
										<Route path="/experiment-log" element={<ExperimentLog />} />
									</Routes>
								</div>
								<Footer />
							</div>
						}
					/>
				</Routes>
			</AuthGuard>
		</Router>
	);
};

export default App;
