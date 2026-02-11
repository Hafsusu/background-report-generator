import  { useState, useEffect } from "react";
import api from "../api";

const Reports = () => {
  const [orders, setOrders] = useState([]);
  const [reportJobs, setReportJobs] = useState({});
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("CSV");

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/orders/");
      setOrders(res.data);
    } catch (err) {
      setMessage("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchOrders(); 
  }, []);

  const generateReport = async (orderId, format) => {
    try {
      const res = await api.post("/report-jobs/", { 
        order: orderId, 
        format: format 
      });
      
      setReportJobs(prev => ({ 
        ...prev, 
        [orderId]: { 
          ...prev[orderId], 
          [format]: res.data 
        } 
      }));
      
      setMessage(`${format} report generation started for order #${orderId}`);
      pollReportStatus(orderId, res.data.id, format);
    } catch (err) {
      if (err.response?.status === 409) {
        setMessage(err.response.data.message);
      } else {
        setMessage(err.response?.data?.message || "Error generating report");
      }
    }
  };

  const pollReportStatus = (orderId, jobId, format) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/report-jobs/${jobId}/`);
        setReportJobs(prev => ({ 
          ...prev, 
          [orderId]: { 
            ...prev[orderId], 
            [format]: res.data 
          } 
        }));

        if (res.data.status === "COMPLETED" || res.data.status === "FAILED") {
          clearInterval(interval);
          if (res.data.status === "COMPLETED") {
            setMessage(`${format} report for order #${orderId} is ready!`);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(interval);
      }
    }, 2000);
  };

  const downloadReport = async (orderId, format) => {
    const job = reportJobs[orderId]?.[format];
    if (!job || job.status !== "COMPLETED") {
      setMessage("Report is not ready for download");
      return;
    }

    try {
      const response = await api.get(`/report-jobs/${job.id}/download/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', job.file_name || `report_${orderId}.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage(`Downloading ${format} report...`);
    } catch (err) {
      setMessage("Failed to download report");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "PENDING": return "text-yellow-400";
      case "PROCESSING": return "text-blue-400";
      case "COMPLETED": return "text-neonGreen-400";
      case "FAILED": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case "PENDING": return "⏳";
      case "PROCESSING": return "⚙️";
      case "COMPLETED": return "✅";
      case "FAILED": return "❌";
      default: return "📊";
    }
  };

  const getFormatIcon = (format) => {
    switch(format) {
      case "CSV": return "📊";
      case "PDF": return "📄";
      default: return "📋";
    }
  };

  const handleGenerateClick = (orderId) => {
    generateReport(orderId, selectedFormat);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-neonGreen-400 text-3xl font-bold mb-2 flex items-center">
            Generate Reports
          </h2>
          <p className="text-gray-400">Generate CSV or PDF reports for your orders</p>
        </div>

        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Select Report Format</h3>
          <div className="flex flex-wrap gap-4">
            {["CSV", "PDF"].map(format => (
              <button
                key={format}
                className={`px-6 py-3 rounded-lg font-medium flex items-center transition-all ${
                  selectedFormat === format
                    ? 'bg-neonGreen-600 text-white shadow-lg shadow-neonGreen-500/25'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setSelectedFormat(format)}
              >
                <span className="mr-2">{getFormatIcon(format)}</span>
                {format}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-400">
            Selected format: <span className="text-neonGreen-400">{selectedFormat}</span>
          </p>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neonGreen-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center p-12 bg-gray-800/30 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-2">No Orders Found</h3>
              <p className="text-gray-400">Create some orders to generate reports</p>
            </div>
          ) : (
            orders.map(order => {
              const currentReport = reportJobs[order.id]?.[selectedFormat];
              
              return (
                <div 
                  key={order.id} 
                  className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-neonGreen-500/50 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-neonGreen-500 rounded-full mr-2 animate-pulse"></div>
                        <h3 className="text-lg font-semibold text-white">Order #{order.id}</h3>
                      </div>
                      <div className="text-white font-medium mb-1">{order.name}</div>
                      <div className="text-gray-400 text-sm">
                        {order.items?.length || 0} items • Total: ${parseFloat(order.total_value || 0).toFixed(2)} • 
                        Created: {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                      {currentReport?.status && (
                        <div className={`flex items-center ${getStatusColor(currentReport.status)}`}>
                          <span className="mr-2">{getStatusIcon(currentReport.status)}</span>
                          <span className="font-medium">{currentReport.status}</span>
                        </div>
                      )}
                      
                      {currentReport?.status === "COMPLETED" ? (
                        <button
                          className="px-6 py-2 bg-gradient-to-r from-neonGreen-600 to-neonGreen-500 hover:from-neonGreen-500 hover:to-neonGreen-400 text-white rounded-lg font-bold flex items-center transition-all hover:scale-105 active:scale-95"
                          onClick={() => downloadReport(order.id, selectedFormat)}
                        >
                          <span className="mr-2"></span> Download {selectedFormat}
                        </button>
                      ) : (
                        <button
                          className={`px-6 py-2 bg-gradient-to-r from-neonGreen-800 to-neonGreen-600 hover:from-neonGreen-500 hover:to-neonGreen-600 text-white rounded-lg font-bold flex items-center transition-all hover:scale-105 active:scale-95 ${
                            currentReport?.status === "PROCESSING" || currentReport?.status === "PENDING"
                              ? 'opacity-70 cursor-not-allowed'
                              : ''
                          }`}
                          onClick={() => handleGenerateClick(order.id)}
                          disabled={currentReport?.status === "PROCESSING" || currentReport?.status === "PENDING"}
                        >
                          {currentReport?.status === "PROCESSING" ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating...
                            </>
                          ) : currentReport?.status === "PENDING" ? (
                            "Queued"
                          ) : (
                            `Generate ${selectedFormat}`
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
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

export default Reports;