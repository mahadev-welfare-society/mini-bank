import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../store/AuthContext";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  FileText,
  Calendar,
  Eye,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

function EditRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchPendingRequests();
    }
  }, [user]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await api.post("/transactions/edit-requests/pending");
      if (response.data.success) {
        setRequests(response.data.data || []);
      } else {
        toast.error("Failed to fetch edit requests");
      }
    } catch (error) {
      console.error("Error fetching edit requests:", error);
      toast.error("Error fetching edit requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setProcessing(requestId);
      const response = await api.post(
        `/transactions/edit-requests/${requestId}/approve`
      );
      if (response.data.success) {
        toast.success("Edit request approved successfully");
        fetchPendingRequests();
        setShowDetailModal(false);
        setSelectedRequest(null);
      } else {
        toast.error(response.data.message || "Failed to approve request");
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error(
        error.response?.data?.message || "Failed to approve edit request"
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessing(requestId);
      const response = await api.post(
        `/transactions/edit-requests/${requestId}/reject`
      );
      if (response.data.success) {
        toast.success("Edit request rejected");
        fetchPendingRequests();
        setShowDetailModal(false);
        setSelectedRequest(null);
      } else {
        toast.error(response.data.message || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error(
        error.response?.data?.message || "Failed to reject edit request"
      );
    } finally {
      setProcessing(null);
    }
  };

  const viewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDifference = (oldAmount, newAmount) => {
    return newAmount - oldAmount;
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500">
            Only administrators can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-4 mb-4">
          <button
            onClick={() => navigate("/transactions")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Transaction Edit Requests
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Review and approve/reject transaction edit requests
            </p>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading edit requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Pending Requests
            </h3>
            <p className="text-gray-500">
              There are no pending transaction edit requests at this time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {requests.map((request) => {
              const difference = calculateDifference(
                request.transaction.amount,
                request.requested_amount
              );
              const isIncrease = difference > 0;

              return (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Transaction #{request.transaction.id}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Requested by {request.requested_by_name} •{" "}
                            {formatDate(request.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">
                            Current Amount
                          </p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatAmount(request.transaction.amount)}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">
                            Requested Amount
                          </p>
                          <p className="text-lg font-semibold text-blue-600">
                            {formatAmount(request.requested_amount)}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">
                            Difference
                          </p>
                          <div className="flex items-center gap-2">
                            {isIncrease ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <p
                              className={`text-lg font-semibold ${
                                isIncrease ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {isIncrease ? "+" : ""}
                              {formatAmount(difference)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {request.reason && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Reason:
                          </p>
                          <p className="text-gray-600 bg-gray-50 rounded-lg p-3">
                            {request.reason}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="h-4 w-4" />
                        <span>
                          Customer: {request.transaction.customer_name}
                        </span>
                        <span className="mx-2">•</span>
                        <span>
                          Account: {request.transaction.account_type_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-6">
                      <button
                        onClick={() => viewDetails(request)}
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processing === request.id}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:bg-green-300"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {processing === request.id
                          ? "Processing..."
                          : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processing === request.id}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:bg-red-300"
                      >
                        <XCircle className="h-4 w-4" />
                        {processing === request.id ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Request Details
                </h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Transaction Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Transaction Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium">
                      #{selectedRequest.transaction.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reference Number:</span>
                    <span className="font-medium font-mono">
                      {selectedRequest.transaction.reference_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction Type:</span>
                    <span className="font-medium capitalize">
                      {selectedRequest.transaction.transaction_type.replace(
                        "_",
                        " "
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {formatDate(selectedRequest.transaction.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Comparison */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Amount Comparison
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500 mb-2">Current Amount</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatAmount(selectedRequest.transaction.amount)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-600 mb-2">
                      Requested Amount
                    </p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatAmount(selectedRequest.requested_amount)}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-4 text-center ${
                      calculateDifference(
                        selectedRequest.transaction.amount,
                        selectedRequest.requested_amount
                      ) > 0
                        ? "bg-green-50"
                        : "bg-red-50"
                    }`}
                  >
                    <p
                      className={`text-sm mb-2 ${
                        calculateDifference(
                          selectedRequest.transaction.amount,
                          selectedRequest.requested_amount
                        ) > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      Difference
                    </p>
                    <p
                      className={`text-xl font-bold ${
                        calculateDifference(
                          selectedRequest.transaction.amount,
                          selectedRequest.requested_amount
                        ) > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {calculateDifference(
                        selectedRequest.transaction.amount,
                        selectedRequest.requested_amount
                      ) > 0
                        ? "+"
                        : ""}
                      {formatAmount(
                        calculateDifference(
                          selectedRequest.transaction.amount,
                          selectedRequest.requested_amount
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Balance Impact */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Balance Impact
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Current Balance Before:
                    </span>
                    <span className="font-medium">
                      {formatAmount(selectedRequest.transaction.balance_before)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Current Balance After:
                    </span>
                    <span className="font-medium">
                      {formatAmount(selectedRequest.transaction.balance_after)}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">
                        New Balance After (if approved):
                      </span>
                      <span className="font-bold text-blue-600">
                        {formatAmount(
                          selectedRequest.transaction.balance_before +
                            selectedRequest.requested_amount *
                              (selectedRequest.transaction.transaction_type ===
                                "deposit" ||
                              selectedRequest.transaction.transaction_type ===
                                "interest" ||
                              selectedRequest.transaction.transaction_type ===
                                "loan_disbursal"
                                ? 1
                                : -1)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              {selectedRequest.reason && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Reason for Edit
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{selectedRequest.reason}</p>
                  </div>
                </div>
              )}

              {/* Request Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Request Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested By:</span>
                    <span className="font-medium">
                      {selectedRequest.requested_by_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Request Date:</span>
                    <span className="font-medium">
                      {formatDate(selectedRequest.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={processing === selectedRequest.id}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:bg-red-300"
                >
                  <XCircle className="h-5 w-5" />
                  {processing === selectedRequest.id
                    ? "Processing..."
                    : "Reject Request"}
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={processing === selectedRequest.id}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:bg-green-300"
                >
                  <CheckCircle className="h-5 w-5" />
                  {processing === selectedRequest.id
                    ? "Processing..."
                    : "Approve & Update Amount"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditRequests;
