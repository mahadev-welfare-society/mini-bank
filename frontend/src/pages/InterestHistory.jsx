import { useState, useEffect } from "react";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  TrendingUp,
  FileText,
  Calendar,
  Download,
  Eye,
  ChevronDown,
  ArrowUpDown,
  X,
} from "lucide-react";

function InterestHistory() {
  const [accountTypes, setAccountTypes] = useState([]);
  const [selectedAccountTypeId, setSelectedAccountTypeId] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accountTypeInfo, setAccountTypeInfo] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);

  useEffect(() => {
    fetchAccountTypes();
  }, []);

  useEffect(() => {
    if (selectedAccountTypeId) {
      fetchInterestHistory(selectedAccountTypeId);
    } else {
      setHistory([]);
      setAccountTypeInfo(null);
    }
  }, [selectedAccountTypeId]);

  const fetchAccountTypes = async () => {
    try {
      const response = await api.post("/account-types/list");
      if (response.data.success) {
        setAccountTypes(response.data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch account types");
    }
  };

  const fetchInterestHistory = async (accountTypeId) => {
    try {
      setLoading(true);
      const response = await api.post(`/account-types/interest-history/${accountTypeId}`);
      if (response.data.success) {
        setHistory(response.data.data.history || []);
        setAccountTypeInfo({
          name: response.data.data.account_type_name,
          display_name: response.data.data.display_name,
          current_rate: response.data.data.current_interest_rate,
        });
      } else {
        toast.error(response.data.message || "Failed to fetch interest history");
        setHistory([]);
        setAccountTypeInfo(null);
      }
    } catch (error) {
      toast.error("Error fetching interest history");
      setHistory([]);
      setAccountTypeInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (filePath, fileName) => {
    if (!filePath) return;

    try {
      setDocumentLoading(true);
      setSelectedDocument(fileName || "Document");

      // All files are now stored in Cloudinary
      // Check if filePath is a Cloudinary URL (starts with https://)
      if (filePath.startsWith('https://')) {
        // Cloudinary URL - use it directly for preview
        // Ensure it uses /raw/upload/ for PDF viewing (Cloudinary raw files)
        let cloudinaryUrl = filePath;
        if (cloudinaryUrl.includes('/upload/') && !cloudinaryUrl.includes('/raw/upload/')) {
          cloudinaryUrl = cloudinaryUrl.replace('/upload/', '/raw/upload/');
        }
        // Use URL directly for preview (no #toolbar=0 as it might interfere with display)
        setDocumentUrl(cloudinaryUrl);
      } else {
        // Legacy local file path - fetch through API endpoint to get Cloudinary URL
        // Extract file_path from the path
        let file_path = filePath;
        if (filePath.includes('/document/')) {
          file_path = filePath.split('/document/')[1];
        } else if (filePath.startsWith('/api/account-types/document/')) {
          file_path = filePath.replace('/api/account-types/document/', '');
        }
        
        // Fetch Cloudinary URL from backend
        const response = await api.post(
          '/account-types/document',
          { file_path: file_path },
          {
            withCredentials: true,
          }
        );
        
        if (response.data.success && response.data.file_url) {
          // Use the Cloudinary URL directly for preview
          let cloudinaryUrl = response.data.file_url;
          // Ensure it uses /raw/upload/ for PDF viewing
          if (cloudinaryUrl.includes('/upload/') && !cloudinaryUrl.includes('/raw/upload/')) {
            cloudinaryUrl = cloudinaryUrl.replace('/upload/', '/raw/upload/');
          }
          setDocumentUrl(cloudinaryUrl);
        } else {
          throw new Error('Failed to get document URL');
        }
      }
    } catch (error) {
      console.error("Error loading document:", error);
      toast.error("Failed to load document");
      setSelectedDocument(null);
      setDocumentUrl(null);
    } finally {
      setDocumentLoading(false);
    }
  };


  const closeModal = () => {
    if (documentUrl && documentUrl.startsWith('blob:')) {
      // Only revoke blob URLs, not Cloudinary URLs
      window.URL.revokeObjectURL(documentUrl);
    }
    setSelectedDocument(null);
    setDocumentUrl(null);
  };

  const handleDownloadDocument = async (filePath, fileName) => {
    if (!filePath) return;
    
    try {
      let downloadUrl;
      
      // Check if filePath is a Cloudinary URL
      if (filePath.startsWith('https://')) {
        // Use Cloudinary URL directly for download
        downloadUrl = filePath;
      } else {
        // Legacy local file path - get Cloudinary URL from backend
        let file_path = filePath;
        if (filePath.includes('/document/')) {
          file_path = filePath.split('/document/')[1];
        } else if (filePath.startsWith('/api/account-types/document/')) {
          file_path = filePath.replace('/api/account-types/document/', '');
        }
        
        const response = await api.post(
          '/account-types/document',
          { file_path: file_path },
          {
            withCredentials: true,
          }
        );
        
        if (response.data.success && response.data.file_url) {
          downloadUrl = response.data.file_url;
        } else {
          throw new Error('Failed to get document URL');
        }
      }
      
      // Trigger download using the Cloudinary URL
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName || "document.pdf";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      // Backend sends IST time in ISO format with +05:30 offset
      // Parse it and display as IST (Asia/Kolkata)
      const date = new Date(dateString);
      
      // Format as IST time - always show IST regardless of user's timezone
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return dateString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Interest Rate Change History
        </h1>
        <p className="text-gray-600">
          View the history of interest rate changes and associated documents
        </p>
      </div>

      {/* Account Type Selector */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Account Type
        </label>
        <div className="relative">
          <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={selectedAccountTypeId}
            onChange={(e) => setSelectedAccountTypeId(e.target.value)}
            className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white appearance-none"
          >
            <option value="">Choose an account type...</option>
            {accountTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.display_name} ({type.name}) - {type.interest_rate}%
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Account Type Info */}
      {accountTypeInfo && !loading && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {accountTypeInfo.display_name}
              </h2>
              <p className="text-gray-600 text-sm">
                Account Type:{" "}
                <span className="font-semibold">{accountTypeInfo.name}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">
                Current Interest Rate
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {accountTypeInfo.current_rate}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      {!loading && selectedAccountTypeId && history.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No History Found
          </h3>
          <p className="text-gray-500">
            No interest rate changes have been recorded for this account type
            yet.
          </p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Change History ({history.length}{" "}
              {history.length === 1 ? "entry" : "entries"})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {history.map((entry, index) => (
              <div
                key={index}
                className="p-6 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <ArrowUpDown className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500">
                          Rate Change
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold text-red-600">
                          {entry.previous_rate}%
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-lg font-semibold text-green-600">
                          {entry.current_rate}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(entry.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {entry.file_url && (
                      <>
                        <button
                          onClick={() =>
                            handleViewDocument(
                              entry.file_path,
                              entry.file_path?.split("/").pop() ||
                                "document.pdf"
                            )
                          }
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </button>
                        {/* <button
                          onClick={() =>
                            handleDownloadDocument(
                              entry.file_url,
                              entry.file_path?.split("/").pop() || "document.pdf"
                            )
                          }
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                          title="Download Document"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </button> */}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
              onClick={closeModal}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  {selectedDocument}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Document Content */}
              <div className="px-6 py-4 bg-gray-100">
                {documentLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : documentUrl ? (
                  <div className="bg-white rounded-lg shadow-inner overflow-hidden" style={{ height: '600px' }}>
                    {/* Use Google Docs Viewer as proxy for better PDF rendering in iframe */}
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`}
                      className="w-full h-full border-0"
                      title="Document Preview"
                      style={{ minHeight: '600px' }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    <p>Failed to load document</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                {documentUrl && (
                  <button
                    onClick={() => {
                      handleDownloadDocument(documentUrl, selectedDocument);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterestHistory;

