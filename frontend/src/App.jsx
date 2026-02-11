import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import ViewReports from './pages/ViewReports';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <Navbar />
        <Routes>
          <Route path="/" element={<Orders />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/view-reports" element={<ViewReports />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;