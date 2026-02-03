import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../store/AuthContext";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  DollarSign,
  CreditCard,
  PiggyBank,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  User,
  FileText,
  Hash,
  TrendingUp,
  TrendingDown,
  History,
  Edit,
} from "lucide-react";

function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Only manager and staff can create edit requests
  // But they can only edit transactions they created
  const canCreateEditRequest =
    user?.role === "manager" && transaction?.created_by === user?.id;

  // Only admin can directly edit transactions (any transaction)
  const canDirectEdit = user?.role === "admin";

  useEffect(() => {
    fetchTransaction();
    // Only fetch edit history for admins
    if (user?.role === "admin") {
      fetchEditHistory();
    }
  }, [id, user?.role]);

  // Prevent background scrolling when edit modal is open
  useEffect(() => {
    if (showEditModal) {
      // Save current overflow style
      const originalOverflow = document.body.style.overflow;
      // Disable scrolling
      document.body.style.overflow = "hidden";

      // Cleanup: restore scrolling when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showEditModal]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      // Since we don't have a specific transaction detail endpoint,
      // we'll fetch from the transactions list and find the specific one
      const response = await api.post("/transactions/list", {
        limit: 1000, // Get more transactions to find the specific one
      });

      if (response.data.success) {
        const foundTransaction = response.data.data.find(
          (t) => t.id === parseInt(id)
        );
        if (foundTransaction) {
          setTransaction(foundTransaction);
        } else {
          toast.error("Transaction not found");
          navigate("/transactions");
        }
      } else {
        toast.error("Failed to fetch transaction details");
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      toast.error("Error fetching transaction details");
    } finally {
      setLoading(false);
    }
  };

  const fetchEditHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.post(`/transactions/${id}/edit-history`);
      if (response.data.success) {
        setEditHistory(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching edit history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const submitEditRequest = async () => {
    if (!editAmount || !editReason) {
      toast.error("Amount and reason are required");
      return;
    }

    try {
      setSubmitting(true);

      if (canDirectEdit) {
        // Direct edit for admin
        await api.put(`/transactions/${transaction.id}/direct-edit`, {
          amount: parseFloat(editAmount),
          reason: editReason,
        });
        toast.success("Transaction updated successfully");
      } else {
        // Edit request for manager/staff
        await api.post("/transactions/edit-request", {
          transaction_id: transaction.id,
          amount: parseFloat(editAmount),
          reason: editReason,
        });
        toast.success("Edit request submitted");
        navigate(`/transactions?tab=edit-requests`);
      }

      setShowEditModal(false);
      setEditAmount("");
      setEditReason("");
      // Refresh transaction and history
      fetchTransaction();
      fetchEditHistory();
    } catch (error) {
      console.error(error);
      toast.error(
        canDirectEdit
          ? "Failed to update transaction"
          : "Failed to submit edit request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getTransactionIcon = (type) => {
    const iconMap = {
      deposit: PiggyBank,
      withdrawal: DollarSign,
      interest: Building2,
      penalty: AlertCircle,
      loan_disbursal: CreditCard,
      loan_repayment: Clock,
    };
    return iconMap[type] || DollarSign;
  };

  const getTransactionColor = (type) => {
    const colorMap = {
      deposit: "text-green-600 bg-green-100",
      withdrawal: "text-red-600 bg-red-100",
      interest: "text-blue-600 bg-blue-100",
      penalty: "text-orange-600 bg-orange-100",
      loan_disbursal: "text-purple-600 bg-purple-100",
      loan_repayment: "text-indigo-600 bg-indigo-100",
    };
    return colorMap[type] || "text-gray-600 bg-gray-100";
  };

  const getStatusColor = (status) => {
    const colorMap = {
      completed: "text-green-600 bg-green-100",
      pending: "text-yellow-600 bg-yellow-100",
      failed: "text-red-600 bg-red-100",
      cancelled: "text-gray-600 bg-gray-100",
    };
    return colorMap[status] || "text-gray-600 bg-gray-100";
  };

  const formatAmount = (amount, type) => {
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

    if (
      type === "deposit" ||
      type === "interest" ||
      type === "loan_disbursal"
    ) {
      return `+${formatted}`;
    } else {
      return `-${formatted}`;
    }
  };

  const formatDate = (dateString) => {
    const utcDate = new Date(dateString + "Z");
    return new Date(utcDate).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Transaction Not Found
          </h3>
          <p className="text-gray-500 mb-4">
            The transaction you're looking for doesn't exist or has been
            removed.
          </p>
          <button
            onClick={() => navigate("/transactions")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Transactions
          </button>
        </div>
      </div>
    );
  }

  const Icon = getTransactionIcon(transaction.transaction_type);
  const typeColor = getTransactionColor(transaction.transaction_type);
  const statusColor = getStatusColor(transaction.status);

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
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
              Transaction Details
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              View detailed information about this transaction
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Transaction Info */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              {/* Transaction Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center flex-1 min-w-0">
                  <div
                    className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${typeColor}`}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 capitalize truncate">
                      {transaction.transaction_type.replace("_", " ")}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      Reference: {transaction.reference_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <span
                    className={`inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${statusColor}`}
                  >
                    {transaction.status}
                  </span>
                  {(canCreateEditRequest || canDirectEdit) && (
                    <button
                      onClick={() => {
                        setEditAmount(transaction.amount.toString());
                        setShowEditModal(true);
                      }}
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      {canDirectEdit ? "Edit" : "Request Edit"}
                    </button>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="mb-4 sm:mb-6">
                <div className="text-center">
                  <div
                    className={`text-2xl sm:text-3xl lg:text-4xl font-bold break-words ${
                      transaction.transaction_type === "deposit" ||
                      transaction.transaction_type === "interest" ||
                      transaction.transaction_type === "loan_disbursal"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatAmount(
                      transaction.amount,
                      transaction.transaction_type
                    )}
                  </div>
                  <p className="text-gray-500 mt-2 text-sm sm:text-base">
                    Transaction Amount
                  </p>
                </div>
              </div>

              {/* Description */}
              {transaction.description && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Description
                  </h3>
                  <p className="text-sm sm:text-base text-gray-900 bg-gray-50 rounded-lg p-3 break-words">
                    {transaction.description}
                  </p>
                </div>
              )}

              {/* Balance Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Balance Before
                  </h3>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(transaction.balance_before)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Balance After
                  </h3>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(transaction.balance_after)}
                  </p>
                </div>
              </div>

              {/* Mode of payments */}
              {transaction.description && (
                <div className="mb-4 sm:mb-6 mt-3 sm:mt-4">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Mode of Payment
                  </h3>
                  <p className="text-sm sm:text-base text-gray-900 bg-gray-50 rounded-lg p-3 break-words">
                    {transaction.payment_type ? transaction.payment_type.toUpperCase():'CASH'}
                  </p>
                </div>
              )}
            </div>
            {/* Edit History - Below left card (Admin only) */}
            {user?.role === "admin" && editHistory.length > 0 && (
              <div className="mt-4 sm:mt-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <History className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        Edit History
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        {editHistory.length}{" "}
                        {editHistory.length === 1 ? "edit" : "edits"} made to
                        this transaction
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {editHistory.map((edit, index) => (
                      <div key={edit.id} className="relative pl-6 sm:pl-8">
                        {/* Vertical line - connects from current dot to next dot, extends through spacing */}
                        {index < editHistory.length - 1 && (
                          <div className="absolute left-0 top-[14px] bottom-[-1rem] w-0.5 bg-blue-200"></div>
                        )}
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-1.5 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm z-10"></div>

                        <div className="rounded-lg p-3 sm:p-4 border border-gray-200">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                            <div className="flex items-center flex-wrap gap-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  edit.edit_method === "direct"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {edit.edit_method === "direct" ? (
                                  <>
                                    <Edit className="h-3 w-3 mr-1" />
                                    Direct Edit
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approved Request
                                  </>
                                )}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-600">
                                by{" "}
                                <span className="font-medium text-gray-900">
                                  {edit.edited_by || "Admin"}
                                </span>
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(edit.edited_at).toLocaleString(
                                "en-IN",
                                {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }
                              )}
                            </span>
                          </div>

                          {/* Requester info (for approved requests) */}
                          {edit.edit_method === "approved_request" &&
                            edit.requested_by && (
                              <div className="mb-2">
                                <p className="text-xs text-gray-500">
                                  Requested by:{" "}
                                  <span className="font-medium text-gray-700">
                                    {edit.requested_by}
                                  </span>
                                </p>
                              </div>
                            )}

                          {/* Amount Change */}
                          <div className="bg-white rounded-lg p-3 sm:p-4 mb-2 border border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-1">
                                  Previous Amount
                                </p>
                                <p className="text-sm sm:text-base font-semibold text-gray-700">
                                  {new Intl.NumberFormat("en-IN", {
                                    style: "currency",
                                    currency: "INR",
                                  }).format(edit.old_amount)}
                                </p>
                              </div>
                              <div className="flex items-center justify-center sm:justify-start">
                                <div className="px-2 py-1 bg-gray-100 rounded">
                                  <TrendingUp className="h-4 w-4 text-gray-600" />
                                </div>
                              </div>
                              <div className="flex-1 text-right sm:text-left">
                                <p className="text-xs text-gray-500 mb-1">
                                  New Amount
                                </p>
                                <p className="text-sm sm:text-base font-bold text-blue-600">
                                  {new Intl.NumberFormat("en-IN", {
                                    style: "currency",
                                    currency: "INR",
                                  }).format(edit.new_amount)}
                                </p>
                              </div>
                            </div>

                            {/* Difference */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">
                                  Amount Difference
                                </span>
                                <span
                                  className={`text-sm font-semibold ${
                                    edit.new_amount > edit.old_amount
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {edit.new_amount > edit.old_amount ? "+" : ""}
                                  {new Intl.NumberFormat("en-IN", {
                                    style: "currency",
                                    currency: "INR",
                                  }).format(edit.new_amount - edit.old_amount)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Reason */}
                          {edit.reason && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-start gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0">
                                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                                    Reason for Edit
                                  </p>
                                  <div className="bg-gray-50 border border-gray-200 rounded-md p-1.5 sm:p-2">
                                    <p className="text-xs sm:text-sm text-gray-800 break-words leading-relaxed">
                                      {edit.reason}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-4 sm:space-y-6">
            {/* Account Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Account Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">Customer</p>
                    <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                      {transaction.customer_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Account Type
                    </p>
                    <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                      {transaction.account_type_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Hash className="h-4 w-4 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Account Number
                    </p>
                    <p className="font-medium text-sm sm:text-base text-gray-900 font-mono truncate">
                      {transaction.account_number}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Transaction Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Date & Time
                    </p>
                    <p className="font-medium text-xs sm:text-sm text-gray-900 break-words">
                      {formatDate(transaction.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Reference Number
                    </p>
                    <p className="font-medium text-xs sm:text-sm text-gray-900 font-mono break-all">
                      {transaction.reference_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Processed By
                    </p>
                    <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                      {transaction.creator_name}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Impact */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Transaction Impact
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-gray-500">
                    Balance Change
                  </span>
                  <span
                    className={`font-semibold text-xs sm:text-sm break-words text-right ${
                      transaction.balance_after > transaction.balance_before
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.balance_after > transaction.balance_before
                      ? "+"
                      : ""}
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(
                      transaction.balance_after - transaction.balance_before
                    )}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                      New Balance
                    </span>
                    <span className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 break-words text-right">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(transaction.balance_after)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">
              {canDirectEdit ? "Edit Transaction" : "Request Transaction Edit"}
            </h2>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">
                Current Amount
              </label>
              <input
                type="text"
                value={new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(transaction.amount)}
                disabled
                className="w-full border rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-600"
              />
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">
                New Amount
              </label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
                placeholder="Enter new amount"
                step="0.01"
                min="0"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">
                Reason
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
                placeholder="Why do you want to edit this?"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitEditRequest}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300"
              >
                {submitting
                  ? canDirectEdit
                    ? "Updating..."
                    : "Submitting..."
                  : canDirectEdit
                  ? "Update Transaction"
                  : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionDetail;
