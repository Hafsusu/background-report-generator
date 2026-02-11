import { useState, useEffect } from "react";
import api from "../api";

const ViewReports = () => {
  const [allReports, setAllReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAllReports();
    fetchOrders();
  }, []);

  const fetchAllReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/report-jobs/");
      setAllReports(res.data);
    } catch (err) {
      setMessage("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders/");
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
  };

  const fetchOrderReports = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}/reports/`);
      setAllReports(res.data);
      setSelectedOrder(orderId);
    } catch (err) {
      setMessage("Failed to load order reports");
    }
  };

  const downloadReport = async (reportId, reportFormat) => {
  try {
    const response = await api.get(`/report-jobs/${reportId}/download/`, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    
    let filename = `report_${reportId}`;
    const contentDisposition = response.headers['content-disposition'];
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    } else {
      filename = `report_${reportId}.${reportFormat.toLowerCase()}`;
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    window.URL.revokeObjectURL(url);
    
    setMessage(`Downloading ${reportFormat || 'report'}...`);
    setTimeout(() => setMessage(""), 3000);
  } catch (err) {
    console.error('Download error:', err);
    setMessage("Failed to download report");
  }
};

  const deleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) {
      return;
    }

    try {
      await api.delete(`/report-jobs/${reportId}/`);
      setAllReports(allReports.filter(report => report.id !== reportId));
      setMessage("Report deleted successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to delete report");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "PENDING": return "bg-yellow-500/20 text-yellow-400";
      case "PROCESSING": return "bg-blue-500/20 text-blue-400";
      case "COMPLETED": return "bg-neonGreen-500/20 text-neonGreen-400";
      case "FAILED": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getFormatIcon = (format) => {
    switch(format) {
      case "CSV": return "📊";
      case "PDF": return "📄";
      default: return "📋";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-neonGreen-400 text-3xl font-bold mb-2 flex items-center">
           View Generated Reports
          </h2>
          <p className="text-gray-400">View and download all generated reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm">Total Reports</div>
            <div className="text-2xl font-bold text-white">{allReports.length}</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm">Completed</div>
            <div className="text-2xl font-bold text-neonGreen-400">
              {allReports.filter(r => r.status === "COMPLETED").length}
            </div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm">PDF Reports</div>
            <div className="text-2xl font-bold text-blue-400">
              {allReports.filter(r => r.format === "PDF").length}
            </div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm">CSV Reports</div>
            <div className="text-2xl font-bold text-green-400">
              {allReports.filter(r => r.format === "CSV").length}
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Filter by Order</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedOrder === null
                  ? 'bg-neonGreen-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => {
                setSelectedOrder(null);
                fetchAllReports();
              }}
            >
              All Orders
            </button>
            {orders.map(order => (
              <button
                key={order.id}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedOrder === order.id
                    ? 'bg-neonGreen-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => fetchOrderReports(order.id)}
              >
                {order.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr className="bg-gray-900/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neonGreen-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : allReports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-400">
                        <div className="text-4xl mb-4">📭</div>
                        <p>No reports generated yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allReports.map(report => (
                    <tr key={report.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          Report #{report.id}
                        </div>
                        {report.file_name && (
                          <div className="text-sm text-gray-400 truncate max-w-xs">
                            {report.file_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{report.order_name}</div>
                        <div className="text-xs text-gray-400">ID: {report.order}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getFormatIcon(report.format)}</span>
                          <span className="text-sm text-white">{report.format}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(report.created_at).toLocaleDateString()}
                        <br />
                        {new Date(report.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {report.status === "COMPLETED" && (
                            <button
                              onClick={() => downloadReport(report.id, report.format)}
                              className="px-3 py-1 bg-neonGreen-600 hover:bg-neonGreen-700 text-white rounded text-sm transition-all"
                            >
                              Download
                            </button>
                          )}
                          <button
                            onClick={() => deleteReport(report.id)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {message && (
          <div className="fixed bottom-4 right-4 p-4 bg-gray-800 border border-neonGreen-500 rounded-lg shadow-lg max-w-md animate-slide-up">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-neonGreen-500 rounded-full mr-3 animate-pulse"></div>
              <p className="text-neonGreen-300">{message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewReports;