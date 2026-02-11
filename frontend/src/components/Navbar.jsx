import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="bg-gradient-to-r from-gray-900 to-neonGreen-950 p-4 flex flex-col md:flex-row justify-between items-center shadow-lg border-b-2 border-neonGreen-500">
      <div className="flex items-center mb-4 md:mb-0">
        <div className="w-8 h-8 bg-neonGreen-400 rounded-lg mr-3 animate-pulse"></div>
        <h1 className="text-neonGreen-400 text-2xl font-bold tracking-tight">
          Business<span className="text-white">Orders</span>
        </h1>
      </div>
      <div className="flex space-x-2 md:space-x-6">
        <Link 
          className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
            isActive('/orders') 
              ? 'bg-neonGreen-600 text-white shadow-lg shadow-neonGreen-500/25' 
              : 'text-neonGreen-200 hover:text-neonGreen-400 hover:bg-neonGreen-950/50'
          }`}
          to="/orders"
        >
          <span className="flex items-center">
            Orders
          </span>
        </Link>
        <Link 
          className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
            isActive('/reports') 
              ? 'bg-neonGreen-600 text-white shadow-lg shadow-neonGreen-500/25' 
              : 'text-neonGreen-200 hover:text-neonGreen-400 hover:bg-neonGreen-950/50'
          }`}
          to="/reports"
        >
          <span className="flex items-center">
            Reports
          </span>
        </Link>
        <Link 
          className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
            isActive('/view-reports') 
              ? 'bg-neonGreen-600 text-white shadow-lg shadow-neonGreen-500/25' 
              : 'text-neonGreen-200 hover:text-neonGreen-400 hover:bg-neonGreen-950/50'
          }`}
          to="/view-reports"
        >
          <span className="flex items-center">
            View Reports
          </span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;