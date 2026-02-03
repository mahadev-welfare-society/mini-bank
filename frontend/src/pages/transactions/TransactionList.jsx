import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { api } from "../../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PiggyBank,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";

function TransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "transactions";
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(tab || "transactions"); // "transactions" or "edit-requests"
  const [filters, setFilters] = useState({
    type: "",
    startDate: "",
    endDate: "",
    accountId: "",
    customerId: "",
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    limit: 10,
    has_next: false,
    has_prev: false,
  });
  const [showFilters, setShowFilters] = useState(false); // Start collapsed by default
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Edit Requests state - must be declared before any conditional returns
  const [editRequests, setEditRequests] = useState([]);
  const [editRequestsLoading, setEditRequestsLoading] = useState(false);
  const [editRequestFilter, setEditRequestFilter] = useState("all");

  const { canCreate } = usePermissions();
  const canCreateTransaction =
    user?.role === "admin" ||
    (user?.role === "manager" && canCreate("transactions"));

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchCustomers();
  }, [pagination.current_page, filters]);

  useEffect(() => {
    // When customer filter changes, reset account filter if the selected account doesn't belong to the customer
    if (filters.customerId && filters.accountId) {
      const account = accounts.find(
        (a) => a.id.toString() === filters.accountId
      );
      if (account && account.customer_id?.toString() !== filters.customerId) {
        setFilters((prev) => ({ ...prev, accountId: "" }));
      }
    }
  }, [filters.customerId, accounts]);

  const fetchMyEditRequests = async () => {
    try {
      setEditRequestsLoading(true);
      const response = await api.post(
        "/transactions/edit-requests/my-requests"
      );
      if (response.data.success) {
        setEditRequests(response.data.data || []);
      } else {
        toast.error("Failed to fetch edit requests");
      }
    } catch (error) {
      console.error("Error fetching edit requests:", error);
      toast.error("Error fetching edit requests");
    } finally {
      setEditRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "edit-requests" && user?.role === "manager") {
      fetchMyEditRequests();
    }
  }, [activeTab, user]);

  // Filter edit requests based on selected filter
  const filteredEditRequests =
    editRequestFilter === "all"
      ? editRequests
      : editRequests.filter((req) => req.status === editRequestFilter);

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      // Build request body for POST
      const requestBody = {
        page: pagination.current_page,
        limit: pagination.limit,
      };

      // Add filters
      if (filters.type) requestBody.type = filters.type;
      if (filters.startDate) requestBody.start_date = filters.startDate;
      if (filters.endDate) requestBody.end_date = filters.endDate;
      if (filters.accountId) requestBody.account_id = filters.accountId;
      if (filters.customerId) requestBody.customer_id = filters.customerId;
      if (searchTerm) requestBody.search = searchTerm;

      const response = await api.post("/transactions/list", requestBody);
      if (response.data.success) {
        setTransactions(response.data.data || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        toast.error(response.data.message || "Failed to fetch transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error(
        error.response?.data?.message || "Error fetching transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await api.post("/accounts/list", {});
      if (response.data.success) {
        setAccounts(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.post("/customers/list", {
        page: 1,
        limit: 1000,
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (response.data.success) {
        setCustomers(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    fetchTransactions();
  };

  // Quick date range presets
  const setQuickDateRange = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date();
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (preset) {
      case "today":
        startDate = new Date(today);
        break;
      case "week":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "3months":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case "6months":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 6);
        break;
      case "year":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        return;
    }

    setFilters((prev) => ({
      ...prev,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilters({
      type: "",
      startDate: "",
      endDate: "",
      accountId: "",
      customerId: "",
    });
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, current_page: newPage }));
  };

  const getTransactionIcon = (type) => {
    const iconMap = {
      deposit: PiggyBank,
      withdrawal: TrendingDown,
      interest: TrendingUp,
      penalty: AlertCircle,
      loan_disbursal: Building2,
      loan_repayment: CreditCard,
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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
              {activeTab === "edit-requests"
                ? "Transaction Edit Requests"
                : "Transaction Management"}
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              {activeTab === "edit-requests"
                ? "View and track your transaction edit requests"
                : "View and manage all banking transactions"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={fetchTransactions}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3 w-full sm:w-auto">
              {canCreateTransaction && (
                <button
                  onClick={() => navigate("/transactions/new")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm sm:text-base rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Transaction</span>
                </button>
              )}
              {user?.role === "admin" && (
                <button
                  onClick={() => navigate("/transactions/edit-requests")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm sm:text-base rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  <FileText className="h-4 w-4" />
                  <span>View Edit Requests</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs for Manager */}
        {user?.role === "manager" && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab("transactions");
                  navigate("/transactions");
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "transactions"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => {
                  setActiveTab("edit-requests");
                  navigate("/transactions");
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "edit-requests"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Transaction Edit Requests
                {editRequests.filter((r) => r.status === "pending").length >
                  0 && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    {editRequests.filter((r) => r.status === "pending").length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        )}

        {/* Edit Requests Tab Content */}
        {activeTab === "edit-requests" && user?.role === "manager" ? (
          <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-2 sm:p-4">
              <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto scrollbar-hide -mx-2 sm:mx-0 px-2 sm:px-0">
                {[
                  { key: "all", label: "All" },
                  { key: "pending", label: "Pending" },
                  { key: "approved", label: "Approved" },
                  { key: "rejected", label: "Rejected" },
                ].map((tab) => {
                  const count = editRequests.filter((r) =>
                    tab.key === "all" ? true : r.status === tab.key
                  ).length;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setEditRequestFilter(tab.key)}
                      className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 font-medium text-[10px] sm:text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                        editRequestFilter === tab.key
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-gray-100 rounded-full text-[10px] sm:text-xs">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Edit Requests List */}
            {editRequestsLoading ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading edit requests...</p>
              </div>
            ) : filteredEditRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {editRequests.length === 0
                    ? "No Edit Requests"
                    : `No ${
                        editRequestFilter.charAt(0).toUpperCase() +
                        editRequestFilter.slice(1)
                      } Requests`}
                </h3>
                <p className="text-gray-500">
                  {editRequests.length === 0
                    ? "You haven't created any edit requests yet."
                    : `You don't have any ${editRequestFilter} edit requests at the moment.`}
                </p>
                {editRequests.length > 0 && editRequestFilter !== "all" && (
                  <button
                    onClick={() => setEditRequestFilter("all")}
                    className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View All Requests
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredEditRequests.map((request) => {
                  const difference =
                    request.requested_amount - request.transaction.amount;
                  const isIncrease = difference > 0;
                  const getStatusBadge = (status) => {
                    const statusConfig = {
                      pending: {
                        label: "Pending",
                        color:
                          "bg-yellow-100 text-yellow-800 border-yellow-200",
                        icon: Clock,
                      },
                      approved: {
                        label: "Approved",
                        color: "bg-green-100 text-green-800 border-green-200",
                        icon: CheckCircle,
                      },
                      rejected: {
                        label: "Rejected",
                        color: "bg-red-100 text-red-800 border-red-200",
                        icon: XCircle,
                      },
                    };
                    const config = statusConfig[status] || statusConfig.pending;
                    const IconComponent = config.icon;
                    return (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
                      >
                        <IconComponent className="h-3 w-3 mr-1" />
                        {config.label}
                      </span>
                    );
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
                  return (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {getStatusBadge(request.status)}
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                Transaction #{request.transaction.id}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {formatDate(request.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex md:grid md:grid-cols-3 gap-3 mb-3 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                            <div className="min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">
                                  Current Amount
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatAmount(request.transaction.amount)}
                                </p>
                              </div>
                            </div>
                            <div className="min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">
                                  Requested Amount
                                </p>
                                <p className="text-sm font-semibold text-blue-600">
                                  {formatAmount(request.requested_amount)}
                                </p>
                              </div>
                            </div>
                            <div className="min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">
                                  Difference
                                </p>
                                <div className="flex items-center gap-2">
                                  {isIncrease ? (
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 text-red-600" />
                                  )}
                                  <p
                                    className={`text-sm font-semibold ${
                                      isIncrease
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {isIncrease ? "+" : ""}
                                    {formatAmount(difference)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          {request.reason && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">
                                Reason:
                              </p>
                              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                                {request.reason}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <CreditCard className="h-3 w-3" />
                            <span>
                              Customer: {request.transaction.customer_name}
                            </span>
                            <span className="mx-2">•</span>
                            <span>
                              Account: {request.transaction.account_type_name}
                            </span>
                          </div>
                          {request.status !== "pending" &&
                            request.approved_by_name && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-600">
                                  {request.status === "approved"
                                    ? "Approved"
                                    : "Rejected"}{" "}
                                  by{" "}
                                  <span className="font-semibold text-gray-900">
                                    {request.approved_by_name}
                                  </span>
                                  {request.updated_at && (
                                    <span className="ml-2">
                                      on {formatDate(request.updated_at)}
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 mt-2 sm:mt-0 sm:ml-4">
                          <button
                            onClick={() =>
                              navigate(
                                `/transactions/${request.transaction.id}`
                              )
                            }
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Transaction
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* Transactions Tab Content */}
        {activeTab === "transactions" && (
          <div>
            {/* Search and Filters */}
            <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Search Bar */}
              <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Search */}
                  <div className="flex-1 min-w-0">
                    <div className="relative w-full">
                      <Search className="absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={handleSearch}
                      className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-white text-[10px] sm:text-xs md:text-sm bg-blue-600 rounded-md hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                    >
                      Search
                    </button>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-sm border rounded-md transition-colors whitespace-nowrap ${
                        showFilters
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden sm:inline">Filters</span>
                    </button>
                    {(searchTerm || Object.values(filters).some((f) => f)) && (
                      <button
                        onClick={handleClearFilters}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">Clear</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="p-2 sm:p-4 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200">
                  <div className="space-y-2 sm:space-y-3 min-w-0">
                    {/* Quick Date Range Presets */}
                    <div>
                      <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1 sm:mb-1.5">
                        <Calendar className="inline h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                        Quick Date Range
                      </label>
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        <button
                          onClick={() => setQuickDateRange("today")}
                          className="px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => setQuickDateRange("week")}
                          className="px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                        >
                          7 Days
                        </button>
                        <button
                          onClick={() => setQuickDateRange("month")}
                          className="px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                        >
                          1 Month
                        </button>
                        <button
                          onClick={() => setQuickDateRange("3months")}
                          className="px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                        >
                          3 Months
                        </button>
                        <button
                          onClick={() => setQuickDateRange("6months")}
                          className="px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                        >
                          6 Months
                        </button>
                        <button
                          onClick={() => setQuickDateRange("year")}
                          className="px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                        >
                          1 Year
                        </button>
                      </div>
                    </div>

                    {/* Custom Date Range */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5 sm:mb-1">
                          From Date
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                startDate: e.target.value,
                              }))
                            }
                            max={
                              filters.endDate ||
                              new Date().toISOString().split("T")[0]
                            }
                            className="w-full pl-7 sm:pl-8 pr-2 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5 sm:mb-1">
                          To Date
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                endDate: e.target.value,
                              }))
                            }
                            min={filters.startDate}
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full pl-7 sm:pl-8 pr-2 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Customer, Transaction Type and Account */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5 sm:mb-1">
                          Customer
                        </label>
                        <select
                          value={filters.customerId}
                          onChange={(e) => {
                            const newFilters = {
                              ...filters,
                              customerId: e.target.value,
                            };
                            // Clear account filter if customer changes
                            if (e.target.value) {
                              newFilters.accountId = "";
                            }
                            setFilters(newFilters);
                          }}
                          className="w-full px-2 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                        >
                          <option value="">All Customers</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} ({customer.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5 sm:mb-1">
                          Account
                        </label>
                        <select
                          value={filters.accountId}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              accountId: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                          disabled={
                            !!filters.customerId &&
                            !accounts.filter(
                              (a) =>
                                a.customer_id?.toString() === filters.customerId
                            ).length
                          }
                        >
                          <option value="">All Accounts</option>
                          {filters.customerId
                            ? accounts
                                .filter(
                                  (a) =>
                                    a.customer_id?.toString() ===
                                    filters.customerId
                                )
                                .map((account) => (
                                  <option key={account.id} value={account.id}>
                                    {account.account_type_name} -{" "}
                                    {account.account_number || account.id}
                                  </option>
                                ))
                            : accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.customer_name} -{" "}
                                  {account.account_type_name}
                                </option>
                              ))}
                        </select>
                        {filters.customerId &&
                          accounts.filter(
                            (a) =>
                              a.customer_id?.toString() === filters.customerId
                          ).length === 0 && (
                            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500">
                              No accounts found for this customer
                            </p>
                          )}
                      </div>

                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5 sm:mb-1">
                          Transaction Type
                        </label>
                        <select
                          value={filters.type}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              type: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                        >
                          <option value="">All Types</option>
                          <option value="deposit">Deposit</option>
                          <option value="withdrawal">Withdrawal</option>
                          <option value="interest">Interest</option>
                          <option value="penalty">Penalty</option>
                          <option value="loan_disbursal">Loan Disbursal</option>
                          <option value="loan_repayment">Loan Repayment</option>
                        </select>
                      </div>
                    </div>

                    {/* Active Filters Display */}
                    {(filters.startDate ||
                      filters.endDate ||
                      filters.type ||
                      filters.accountId ||
                      filters.customerId ||
                      searchTerm) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-2 sm:p-2.5">
                        <p className="text-[10px] sm:text-xs font-semibold text-blue-900 mb-1 sm:mb-1.5">
                          Active Filters:
                        </p>
                        <div className="flex flex-wrap gap-1 sm:gap-1.5">
                          {filters.startDate && filters.endDate && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] sm:text-xs font-medium">
                              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                              <span className="truncate max-w-[120px] sm:max-w-none">
                                {new Date(filters.startDate).toLocaleDateString(
                                  "en-IN",
                                  { month: "short", day: "numeric" }
                                )}{" "}
                                -{" "}
                                {new Date(filters.endDate).toLocaleDateString(
                                  "en-IN",
                                  { month: "short", day: "numeric" }
                                )}
                              </span>
                              <button
                                onClick={() =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    startDate: "",
                                    endDate: "",
                                  }))
                                }
                                className="ml-0.5 sm:ml-1 hover:text-blue-900 flex-shrink-0"
                              >
                                <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </button>
                            </span>
                          )}
                          {filters.customerId && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-indigo-100 text-indigo-800 rounded-full text-[10px] sm:text-xs font-medium">
                              <span className="hidden sm:inline">
                                Customer:{" "}
                              </span>
                              <span className="truncate max-w-[100px] sm:max-w-none">
                                {customers.find(
                                  (c) => c.id.toString() === filters.customerId
                                )?.name || filters.customerId}
                              </span>
                              <button
                                onClick={() =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    customerId: "",
                                    accountId: "",
                                  }))
                                }
                                className="ml-0.5 sm:ml-1 hover:text-indigo-900 flex-shrink-0"
                              >
                                <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </button>
                            </span>
                          )}
                          {filters.type && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-green-100 text-green-800 rounded-full text-[10px] sm:text-xs font-medium">
                              <span className="hidden sm:inline">Type: </span>
                              <span className="capitalize">{filters.type}</span>
                              <button
                                onClick={() =>
                                  setFilters((prev) => ({ ...prev, type: "" }))
                                }
                                className="ml-0.5 sm:ml-1 hover:text-green-900 flex-shrink-0"
                              >
                                <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </button>
                            </span>
                          )}
                          {filters.accountId && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-purple-100 text-purple-800 rounded-full text-[10px] sm:text-xs font-medium">
                              <span className="hidden sm:inline">
                                Account:{" "}
                              </span>
                              <span className="truncate max-w-[100px] sm:max-w-none">
                                {accounts.find(
                                  (a) => a.id.toString() === filters.accountId
                                )?.account_type_name || filters.accountId}
                              </span>
                              <button
                                onClick={() =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    accountId: "",
                                  }))
                                }
                                className="ml-0.5 sm:ml-1 hover:text-purple-900 flex-shrink-0"
                              >
                                <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </button>
                            </span>
                          )}
                          {searchTerm && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                              Search: {searchTerm}
                              <button
                                onClick={() => setSearchTerm("")}
                                className="ml-1 hover:text-orange-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab Content */}
        {activeTab === "transactions" && (
          <div>
            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Transactions Found
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm || Object.values(filters).some((f) => f)
                      ? "Try adjusting your search criteria"
                      : "No transactions have been recorded yet"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Transaction
                              </th>
                              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Account
                              </th>
                              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Balance
                              </th>
                              {/* <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th> */}
                              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment Type
                              </th>
                              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map((transaction) => {
                              const Icon = getTransactionIcon(
                                transaction.transaction_type
                              );
                              const typeColor = getTransactionColor(
                                transaction.transaction_type
                              );
                              const statusColor = getStatusColor(
                                transaction.status
                              );

                              return (
                                <tr
                                  key={transaction.id}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-4 xl:px-6 py-4">
                                    <div className="flex items-center min-w-0">
                                      <div
                                        className={`p-2 rounded-full flex-shrink-0 ${typeColor}`}
                                      >
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <div className="ml-3 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 capitalize truncate">
                                          {transaction.transaction_type.replace(
                                            "_",
                                            " "
                                          )}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-500 truncate">
                                          {transaction.reference_number}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 xl:px-6 py-4">
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {transaction.customer_name}
                                      </div>
                                      <div className="text-xs sm:text-sm text-gray-500 truncate">
                                        {transaction.account_type_name} -{" "}
                                        {transaction.account_number}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 xl:px-6 py-4">
                                    <div
                                      className={`text-sm font-semibold whitespace-nowrap ${
                                        transaction.transaction_type ===
                                          "deposit" ||
                                        transaction.transaction_type ===
                                          "interest" ||
                                        transaction.transaction_type ===
                                          "loan_disbursal"
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {formatAmount(
                                        transaction.amount,
                                        transaction.transaction_type
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 xl:px-6 py-4">
                                    <div className="text-sm text-gray-900 whitespace-nowrap">
                                      {new Intl.NumberFormat("en-IN", {
                                        style: "currency",
                                        currency: "INR",
                                      }).format(transaction.balance_after)}
                                    </div>
                                  </td>
                                  {/* <td className="px-4 xl:px-6 py-4">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColor}`}
                                    >
                                      {transaction.status}
                                    </span>
                                  </td> */}
                                  <td className="px-4 xl:px-6 py-4">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColor}`}
                                    >
                                      {transaction.payment_type
                                        ? transaction.payment_type.toUpperCase()
                                        : "CASH"}
                                    </span>
                                  </td>
                                  <td className="px-4 xl:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                    {formatDate(transaction.created_at)}
                                  </td>
                                  <td className="px-4 xl:px-6 py-4 text-sm font-medium">
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/transactions/${transaction.id}`
                                        )
                                      }
                                      className="text-blue-600 hover:text-blue-900 transition-colors"
                                      aria-label="View transaction"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden">
                    {transactions.map((transaction) => {
                      const Icon = getTransactionIcon(
                        transaction.transaction_type
                      );
                      const typeColor = getTransactionColor(
                        transaction.transaction_type
                      );
                      const statusColor = getStatusColor(transaction.status);

                      return (
                        <div
                          key={transaction.id}
                          className="p-3 sm:p-4 border-b border-gray-200 last:border-b-0"
                        >
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex items-center min-w-0 flex-1">
                              <div
                                className={`p-2 rounded-full flex-shrink-0 ${typeColor}`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 capitalize truncate">
                                  {transaction.transaction_type.replace(
                                    "_",
                                    " "
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {transaction.reference_number}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`text-sm font-semibold whitespace-nowrap flex-shrink-0 ${
                                transaction.transaction_type === "deposit" ||
                                transaction.transaction_type === "interest" ||
                                transaction.transaction_type ===
                                  "loan_disbursal"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatAmount(
                                transaction.amount,
                                transaction.transaction_type
                              )}
                            </div>
                          </div>

                          <div className="ml-11 sm:ml-14 space-y-1.5">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium truncate block">
                                {transaction.customer_name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {transaction.account_type_name} -{" "}
                                {transaction.account_number}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Balance:{" "}
                              <span className="font-medium">
                                {new Intl.NumberFormat("en-IN", {
                                  style: "currency",
                                  currency: "INR",
                                }).format(transaction.balance_after)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColor}`}
                              >
                                {transaction.status}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatDate(transaction.created_at)}
                                </span>
                                <button
                                  onClick={() =>
                                    navigate(`/transactions/${transaction.id}`)
                                  }
                                  className="text-blue-600 hover:text-blue-900 transition-colors p-1"
                                  aria-label="View transaction"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {activeTab === "transactions" && pagination.total_pages > 1 && (
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
              Showing{" "}
              <span className="font-medium">
                {(pagination.current_page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(
                  pagination.current_page * pagination.limit,
                  pagination.total_count
                )}
              </span>{" "}
              of <span className="font-medium">{pagination.total_count}</span>{" "}
              results
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={!pagination.has_prev}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.total_pages) },
                  (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                          page === pagination.current_page
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={!pagination.has_next}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionList;
