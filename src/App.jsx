import * as React from 'react';
const { useContext } = React;
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ReceiptInfor from './components/ReceiptInfor';
import SampleInfor from './components/SampleInfor';
import { GlobalContext } from './contexts/GlobalContext';
import Library from './components/Library';
import ProtocolInfor from './components/ProtocolInfor';
import AnalyteInfor from './components/AnalyteInfor';
import Login from './components/Login';
import ClientInfor from './components/ClientInfor';
import Footer from './components/Footer';
import Event from './components/Event';
import ProcessingSample from './components/ProcessingSample';
import Report from './components/Report';
import Result from './components/Analysis_result';

const App = () => {
	return (
		<Router>
			<div className="h-full min-h-lvh min-w-lvw w-lvw flex flex-col items-center relative ">
				<Header />
				<div className="flex justify-center items-center w-full 2xl:max-w-screen-2xl xl:max-w-screen-xl lg:max-w-screen-lg md:max-w-screen-md sm:max-w-screen-sm  max-w-sm mb-60">
					<Routes>
						<Route path="library" element={<Library />} />
						<Route path="library/protocol" element={<ProtocolInfor />} />
						<Route path="library/analyte" element={<AnalyteInfor />} />
						<Route path="/intra-h1y25-c1" element={<Event />} />
						<Route path="/dashboard" element={<Dashboard />} />
						<Route path="/" element={<Dashboard />} />
						<Route path="/report" element={<Report />} />
						<Route path="/result" element={<Result />} />
						<Route path="/processing" element={<ProcessingSample />} />
						<Route path="/dashboard/receipt" element={<ReceiptInfor />} />
						<Route path="/dashboard/sample" element={<SampleInfor />} />
						<Route path="/login" element={<Login />} />
						<Route path="library/client" element={<ClientInfor />} />
					</Routes>
				</div>
				<Footer />
			</div>
		</Router>
	);
};

export default App;
